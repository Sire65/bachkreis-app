// Adapter „lokal-demo“: Daten liegen im Browser (IndexedDB, Rückfall: Arbeitsspeicher).
// App (index.html) und PC-Verwaltung (verwaltung.html) teilen sich dieselbe Datenbank; Änderungen werden über
// BroadcastChannel sofort an andere offene Fenster gemeldet – so lässt sich der spätere Abgleich über Supabase vorführen.
import { TABELLEN_NAMEN } from "./schema.js";
import { erzeugeDemodaten } from "./demodaten.js";
import { idbOeffnen, idbLesen, idbSchreiben, idbLeeren } from "./speicher-idb.js";
import { APP_VERSION } from "./version.js";

const DB_NAME = "bachkreis-demo";
const DB_VERSION = 1;
const KANAL = "bk-daten";

// 🧪 0.35.0: Nach einem Update ergänzt die Vorführversion neue Beispieldaten (z. B. Büro-Vorlagen), ohne etwas Eingetragenes zu löschen
// oder Gelöschtes zurückzuholen: neu ist nur, wessen ID dieser Browser noch nie gesehen hat. Fehlende Einstellungen kommen dazu.
// bekannt = { tab: [ids] } aus __meta; beim ersten Mal gelten alle vorhandenen IDs als bekannt.
export function demoErgaenzen(daten, frisch, bekannt = null) {
  const neuBekannt = {}, geaendert = [];
  for (const t of TABELLEN_NAMEN) {
    const lokal = daten[t] || [], ids = new Set(lokal.map((z) => z.id)), alt = new Set(bekannt?.[t] || (bekannt ? [] : [...ids]));
    const dazu = (frisch[t] || []).filter((z) => z.id != null && !ids.has(z.id) && !alt.has(z.id));
    if (dazu.length) { daten[t] = [...lokal, ...dazu]; geaendert.push(t); }
    neuBekannt[t] = [...new Set([...alt, ...ids, ...(frisch[t] || []).map((z) => z.id)])];
  }
  const k = daten.__konfig || {}, fehlt = Object.keys(frisch.__konfig || {}).filter((x) => !(x in k));
  if (fehlt.length) { daten.__konfig = { ...Object.fromEntries(fehlt.map((x) => [x, frisch.__konfig[x]])), ...k }; geaendert.push("__konfig"); }
  return { geaendert, bekannt: neuBekannt };
}

export function erzeugeLokalAdapter() {
  let db = null;
  let speicher = "arbeitsspeicher";
  const daten = {};
  const zuhoerer = new Set();
  let kanal = null;

  async function persist(tab) {
    if (db) await idbSchreiben(db, tab, daten[tab]);
  }
  function melden(tabs, extern) {
    for (const f of zuhoerer) { try { f(tabs); } catch (e) { console.error(e); } }
    if (!extern && kanal) kanal.postMessage({ tabs });
  }
  async function seed() {
    const d = erzeugeDemodaten();
    for (const t of TABELLEN_NAMEN) daten[t] = d[t] || [];
    daten.__konfig = d.__konfig || {};
    if (db) {
      for (const t of TABELLEN_NAMEN) await idbSchreiben(db, t, daten[t]);
      await idbSchreiben(db, "__konfig", daten.__konfig);
      await idbSchreiben(db, "__meta", { erzeugt: new Date().toISOString(), schema: DB_VERSION, demoStand: APP_VERSION, bekannt: Object.fromEntries(TABELLEN_NAMEN.map((t) => [t, daten[t].map((z) => z.id)])) });
    }
  }
  async function ergaenzen(meta) {
    const r = demoErgaenzen(daten, erzeugeDemodaten(), meta.bekannt || null);
    for (const t of r.geaendert) await idbSchreiben(db, t, daten[t]);
    await idbSchreiben(db, "__meta", { ...meta, demoStand: APP_VERSION, bekannt: r.bekannt, ergaenzt: new Date().toISOString() });
    if (r.geaendert.length) console.info("🧪 Vorführdaten ergänzt:", r.geaendert.join(", "));
  }

  return {
    art: "lokal-demo",
    beschreibung: "Vorführversion – Demodaten nur in diesem Browser",
    async starten() {
      try { db = await idbOeffnen(DB_NAME, DB_VERSION); speicher = "indexeddb"; } catch { db = null; }
      const meta = db ? await idbLesen(db, "__meta") : null;
      if (!meta) await seed();
      else {
        for (const t of TABELLEN_NAMEN) daten[t] = (await idbLesen(db, t)) || [];
        daten.__konfig = (await idbLesen(db, "__konfig")) || {};
        if (meta.demoStand !== APP_VERSION) try { await ergaenzen(meta); } catch (e) { console.warn("Vorführdaten ergänzen", e); } // nie den Start blockieren
      }
      if ("BroadcastChannel" in globalThis) {
        kanal = new BroadcastChannel(KANAL);
        kanal.onmessage = async (ev) => {
          const tabs = ev.data?.tabs || [];
          if (db) for (const t of tabs) daten[t] = t === "__konfig" ? ((await idbLesen(db, t)) || {}) : ((await idbLesen(db, t)) || []);
          melden(tabs, true);
        };
      }
      return { speicher };
    },
    info() {
      return { art: "lokal-demo", speicher, server: false, hinweis: "Keine Server-Verbindung – Demodaten" };
    },
    alle(tab) { return daten[tab] || []; },
    async schreiben(tab, zeilen) {
      daten[tab] = zeilen;
      await persist(tab);
    },
    async konfigSetzen(k, v) {
      daten.__konfig = { ...(daten.__konfig || {}), [k]: v };
      if (db) await idbSchreiben(db, "__konfig", daten.__konfig);
      melden(["__konfig"]);
    },
    konfig() { return daten.__konfig || {}; },
    geaendert(tabs) { melden(tabs); },
    abonnieren(f) { zuhoerer.add(f); return () => zuhoerer.delete(f); },
    async zuruecksetzen() {
      if (db) await idbLeeren(db);
      await seed();
      melden([...TABELLEN_NAMEN, "__konfig"]);
    },
  };
}
