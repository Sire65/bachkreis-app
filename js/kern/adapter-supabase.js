// Adapter „supabase“ – Echtbetrieb über die Edge Function bk-api des Bachkreis-Supabase-Projekts.
// Funktionsweise (die App merkt davon nichts, sie arbeitet weiter synchron mit liste()/hole()):
//  - Das Gerät hält eine Kopie NUR der Daten, die der Server dieser Person zeigt (IndexedDB „bachkreis-server“).
//  - Abgleich: beim Start und alle 30 s „laden seit <Zeitpunkt>“ – nur Änderungen kommen über die Leitung.
//  - Änderungen landen sofort lokal UND im Ausgang (auch offline); der Ausgang wird an den Server geschickt.
//  - Lehnt der Server etwas ab (Rechte, Versionskonflikt), wird die Zeile durch den Serverstand ersetzt und gemeldet.
// Keine Service-Role im Browser (AGENTS.md Regel 15): nur der persönliche Sitzungs-Token (x-bk-token).
import { TABELLEN_NAMEN } from "./schema.js";
import { idbOeffnen, idbLesen, idbSchreiben, idbLeeren } from "./speicher-idb.js";

const ABGLEICH_MS = 30000;
const TOKEN_KEY = (art) => (art === "verwaltung" ? "bk_token_verwaltung" : "bk_token");

export class AnmeldungNoetig extends Error { constructor() { super("Anmeldung nötig"); this.code = "ANMELDUNG"; } }

export function erzeugeSupabaseAdapter({ url = "", quelle = "app" } = {}) {
  const daten = {};
  let db = null, token = null, seit = null, ich = null, konfigWerte = {};
  let ausgang = [];
  let letzterAbgleich = null, online = navigator.onLine !== false, laeuft = false, timer = null;
  const zuhoerer = new Set(), meldungen = new Set();
  const melden = (tabs) => { for (const f of zuhoerer) { try { f(tabs); } catch (e) { console.error(e); } } };
  const hinweis = (t) => { for (const f of meldungen) f(t); };
  const tokenLesen = () => { try { return localStorage.getItem(TOKEN_KEY(quelle)); } catch { return null; } };

  async function api(aktion, nutzlast = {}) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "x-bk-token": token } : {}) }, body: JSON.stringify({ aktion, quelle, ...nutzlast }) });
    const j = await r.json().catch(() => ({ ok: false, fehler: "ANTWORT_UNLESBAR" }));
    if (r.status === 401 && aktion !== "anmelden") {
      try { localStorage.removeItem(TOKEN_KEY(quelle)); } catch {}
      token = null; throw new AnmeldungNoetig();
    }
    return { status: r.status, ...j };
  }
  async function sichern(tabs) {
    if (!db) return;
    for (const t of tabs) await idbSchreiben(db, t, daten[t] || []);
    await idbSchreiben(db, "__meta", { seit, ich, konfig: konfigWerte });
    await idbSchreiben(db, "__ausgang", ausgang);
  }
  function einspielen(tab, zeilen, komplett) {
    if (komplett) { daten[tab] = zeilen; return; }
    const liste = daten[tab] || (daten[tab] = []);
    const idx = new Map(liste.map((z, i) => [z.id, i]));
    for (const z of zeilen) { const i = idx.get(z.id); if (i === undefined) { idx.set(z.id, liste.length); liste.push(z); } else liste[i] = z; }
  }

  async function ausgangSenden() {
    if (!ausgang.length || !token) return;
    const jetzt = ausgang; ausgang = [];
    const jeTab = {};
    for (const e of jetzt) (jeTab[e.tab] ||= []).push(e.zeile);
    const geaendert = new Set();
    for (const [tab, zeilen] of Object.entries(jeTab)) {
      let r;
      try { r = await api("speichern", { tab, zeilen }); }
      catch (e) { if (e.code === "ANMELDUNG") throw e; ausgang.push(...zeilen.map((zeile) => ({ tab, zeile }))); online = false; continue; }
      online = true;
      if (r.status >= 500) { ausgang.push(...zeilen.map((zeile) => ({ tab, zeile }))); continue; }
      einspielen(tab, r.gespeichert || [], false);
      for (const k of r.konflikte || []) {
        if (k.zeile) einspielen(tab, [k.zeile], false);
        else daten[tab] = (daten[tab] || []).filter((z) => z.id !== k.id);
        hinweis(k.grund === "VERSION" ? "Jemand anderes hat das gerade geändert – der neueste Stand wird angezeigt." : `Änderung nicht erlaubt (${k.grund}).`);
      }
      geaendert.add(tab);
    }
    await sichern([...geaendert]);
    if (geaendert.size) melden([...geaendert]);
  }
  async function abgleichen() {
    if (laeuft || !token) return;
    laeuft = true;
    try {
      await ausgangSenden();
      const r = await api("laden", { seit });
      if (!r.ok) throw new Error(r.fehler || "Laden fehlgeschlagen");
      const tabs = Object.keys(r.daten || {});
      for (const t of tabs) einspielen(t, r.daten[t], r.komplett);
      konfigWerte = r.konfig || konfigWerte; ich = r.ich || ich; seit = r.jetzt;
      letzterAbgleich = new Date().toISOString(); online = true;
      await sichern(tabs);
      if (tabs.length || r.komplett) melden([...tabs, "__konfig"]);
    } catch (e) {
      if (e.code === "ANMELDUNG") { hinweis("Bitte neu anmelden."); throw e; }
      online = false;
    } finally { laeuft = false; }
  }

  return {
    art: "supabase",
    beschreibung: "Bachkreis-Server (Supabase)",
    async starten() {
      if (!url) throw new Error("Server-Adresse fehlt (js/kern/umgebung.js)");
      token = tokenLesen();
      try { db = await idbOeffnen("bachkreis-server-" + quelle, 1); } catch { db = null; }
      if (db) {
        for (const t of TABELLEN_NAMEN) daten[t] = (await idbLesen(db, t)) || [];
        const meta = (await idbLesen(db, "__meta")) || {};
        seit = meta.seit || null; ich = meta.ich || null; konfigWerte = meta.konfig || {};
        ausgang = (await idbLesen(db, "__ausgang")) || [];
      }
      if (!token) throw new AnmeldungNoetig();
      // Einmal am Tag komplett neu laden (falls sich Sichtbarkeiten geändert haben)
      if (seit && Date.now() - new Date(seit).getTime() > 86400000) seit = null;
      try { await abgleichen(); } catch (e) { if (e.code === "ANMELDUNG") throw e; }
      if (!ich) throw new Error(online ? "Keine Daten erhalten" : "Keine Verbindung zum Server und noch keine Daten auf diesem Gerät");
      timer = setInterval(() => { if (!document.hidden) abgleichen().catch(() => {}); }, ABGLEICH_MS);
      addEventListener("online", () => abgleichen().catch(() => {}));
      document.addEventListener("visibilitychange", () => { if (!document.hidden) abgleichen().catch(() => {}); });
      return { speicher: "server" };
    },
    info() {
      const stand = letzterAbgleich ? new Date(letzterAbgleich).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–";
      return { art: "supabase", server: true, online, ich, speicher: "Server + Kopie auf dem Gerät", letzterAbgleich, ausgang: ausgang.length,
        hinweis: online ? `Server verbunden · Stand ${stand}` : `OFFLINE – Daten von ${stand}${ausgang.length ? ` · ${ausgang.length} Änderung(en) warten` : ""}` };
    },
    alle(tab) { return daten[tab] || (daten[tab] = []); },
    async schreiben(tab, zeilen) { daten[tab] = zeilen; if (db) await idbSchreiben(db, tab, zeilen); },
    // Von daten.js für jede geänderte Zeile aufgerufen (mit basis_version = Stand vor der Änderung)
    async vormerken(tab, zeilen) {
      if (tab === "aenderungen" || tab === "versand") return;
      for (const zeile of zeilen) ausgang.push({ tab, zeile });
      if (db) await idbSchreiben(db, "__ausgang", ausgang);
      clearTimeout(this._t); this._t = setTimeout(() => ausgangSenden().catch(() => {}), 400);
    },
    async konfigSetzen(k, v) {
      const r = await api("konfig_setzen", { schluessel: k, wert: v });
      if (!r.ok) throw new Error("Einstellung nicht gespeichert: " + (r.fehler || ""));
      konfigWerte = { ...konfigWerte, [k]: v }; await sichern([]); melden(["__konfig"]);
    },
    konfig() { return konfigWerte; },
    geaendert(tabs) { melden(tabs); },
    abonnieren(f) { zuhoerer.add(f); return () => zuhoerer.delete(f); },
    beiHinweis(f) { meldungen.add(f); },
    async zuruecksetzen() { throw new Error("Im Echtbetrieb nicht möglich"); },
    async aktion(name, nutzlast) { return api(name, nutzlast); },
    abgleichen,
    async anmelden(code, verwaltung = false) {
      const r = await api("anmelden", { code, verwaltung });
      if (!r.ok) return r;
      token = r.token; try { localStorage.setItem(TOKEN_KEY(quelle), token); } catch {}
      if (db) await idbLeeren(db);
      return r;
    },
    async abmelden() {
      try { await api("abmelden"); } catch {}
      try { localStorage.removeItem(TOKEN_KEY(quelle)); } catch {}
      clearInterval(timer); if (db) await idbLeeren(db);
    },
  };
}
