// Versand über den BK Communicator (Nachbau des KC Communicators, siehe docs/KOMMUNIKATION.md).
//  - Echtbetrieb: der Server (bk-api → supabase/functions/_shared/kom/kern.js) prüft Rechte, wählt Regel, Vorlage,
//    Empfänger (auch Eltern Minderjähriger), Kanäle und Anbieter, stellt zu, wiederholt, eskaliert.
//  - Vorführversion: dieselben Regeln aus den Tabellen kom_* werden hier im Browser angewendet und die Aufträge als
//    „simuliert“ in bk_versand eingetragen – die Konsole der PC-Verwaltung zeigt also echte Regel-Ergebnisse.
//  - WhatsApp: nur Übergabe (wa.me / Teilen) – ohne kostenpflichtige API.
import { liste, hole, speichere, speichereViele, konfig, istEchtbetrieb, serverAktion, neueId } from "./daten.js";
import { waLink } from "./logik.js";
import { KOM_EREIGNISSE, KOM_STATUS } from "./schema.js";

export const KANAELE = { push: "🔔 Push", mail: "✉️ E-Mail", whatsapp: "🟢 WhatsApp", app: "💬 In der App" };
export const EREIGNISSE = Object.fromEntries(Object.entries(KOM_EREIGNISSE).filter(([k]) => !["test", "standard"].includes(k)));
export const STATUS = KOM_STATUS;

// Kanalwahl einer Person je Ereignis (Meins › Benachrichtigungen). Ohne eigene Wahl gilt die Regel des Communicators.
export function regelVon(ereignis) {
  const r = liste("kom_regeln", (x) => x.aktiv !== false);
  return r.find((x) => x.ereignis === ereignis) || r.find((x) => x.ereignis === "standard") || null;
}
export function wahlVon(person, ereignis) {
  return person?.benachrichtigung?.[ereignis] || regelVon(ereignis)?.kanaele || ["push", "app"];
}

// Sendet an eine Liste von Personen. Rückgabe: Zusammenfassung je Kanal.
export async function senden({ an, betreff, text, ereignis = "rundschreiben", kanaele = null, unterhaltung_id = null, prioritaet = undefined, zettel_id = undefined, wichtig = undefined, nachricht_id = undefined, korrelation: korr = undefined }) {
  const korrelation = korr || (nachricht_id ? `nachricht:${nachricht_id}` : neueId());
  if (istEchtbetrieb()) {
    const r = await serverAktion("versenden", { an: [...new Set(an)], betreff, text, ereignis, kanaele, unterhaltung_id, korrelation, prioritaet, zettel_id, wichtig, nachricht_id });
    lokalerPush(an, betreff, text);
    const k = r?.kanaele || {};
    return { push: k.push || 0, mail: k.mail || 0, app: k.app || 0, fehler: r?.ok === false ? 1 : 0, unterdrueckt: r?.unterdrueckt || 0, vorgemerkt: r?.auftraege || 0 };
  }
  const summe = { push: 0, mail: 0, app: 0, fehler: 0, unterdrueckt: 0 };
  const zeilen = demoRouter({ an, betreff, text, ereignis, kanaele, korrelation, prioritaet });
  for (const z of zeilen) if (z.status === "unterdrueckt") summe.unterdrueckt++; else summe[z.kanal]++;
  if (zeilen.length) await speichereViele("versand", zeilen);
  if (zeilen.length) await speichereViele("kom_ereignisse", zeilen.filter((z) => z.status !== "unterdrueckt").map((z) => ({ zeit: z.zeit, auftrag_id: z.id, art: z.status === "zugestellt" ? "zugestellt" : "simuliert", kanal: z.kanal, anbieter_id: z.anbieter_id, text: "Vorführversion – nichts verschickt" })));
  lokalerPush(an, betreff, text);
  return summe;
}

// Vereinfachter Router der Vorführversion (gleiche Regeln wie der Server, ohne Zustellung)
function demoRouter({ an, betreff, text, ereignis, kanaele, korrelation, prioritaet }) {
  const regel = regelVon(ereignis) || { kanaele: ["push", "app"], modus: "rueckfall", eltern: "auch", prioritaet: "normal" };
  const programm = hole("kom_programme", regel.programm_id);
  if (programm && programm.aktiv === false) return [];
  const prio = prioritaet || regel.prioritaet || "normal";
  const regelK = (regel.kanaele || []).filter((k) => ["push", "mail", "app"].includes(k));
  const wunsch = (kanaele || []).filter((k) => ["push", "mail", "app"].includes(k));
  const basisK = wunsch.length ? [...regelK.filter((k) => wunsch.includes(k)), ...wunsch.filter((k) => !regelK.includes(k))] : regelK;
  const route = (k) => liste("kom_routen", (r) => r.kanal === k && r.aktiv !== false).sort((a, b) => (a.rang || 99) - (b.rang || 99))[0]?.anbieter_id || null;
  const eltern = (kid) => liste("eltern_kind", (e) => e.kind_id === kid).map((e) => e.eltern_id);
  const ziel = [];
  for (const id of new Set(an)) {
    const p = hole("personen", id); if (!p) continue;
    const mj = p.typ === "schueler";
    if (mj && regel.eltern === "statt" && eltern(id).length) { ziel.push(...eltern(id)); continue; }
    ziel.push(id);
    if (mj && regel.eltern === "auch") ziel.push(...eltern(id));
  }
  const jetzt = new Date().toISOString();
  const out = [];
  for (const id of new Set(ziel)) {
    const p = hole("personen", id); if (!p) continue;
    const pref = p.benachrichtigung?.[ereignis];
    const kp = prio === "kritisch" || !Array.isArray(pref) ? basisK : basisK.filter((k) => pref.includes(k));
    const verf = kp.filter((k) => k !== "mail" || p.email);
    const basis = { zeit: jetzt, an_id: id, betreff, info: text, ereignis, programm: programm?.schluessel || null, prioritaet: prio, korrelation, versuche: 0 };
    if (!verf.length) { out.push({ ...basis, id: neueId(), kanal: kp[0] || "app", status: "unterdrueckt", fehler_code: kp.length ? "KEIN_KANAL" : "VORLIEBE" }); continue; }
    for (const k of regel.modus === "alle" ? verf : [verf[0]]) {
      out.push({ ...basis, id: neueId(), kanal: k, status: k === "app" ? "zugestellt" : "simuliert", anbieter_id: k === "app" ? null : route(k), gesendet_am: k === "app" ? null : jetzt });
    }
  }
  return out;
}

// Test an mich – im Echtbetrieb echter Versand über den Communicator
export async function testAnMich(ich, kanaele = ["push", "mail"]) {
  if (istEchtbetrieb()) {
    const r = await serverAktion("kom_test", { kanaele });
    lokalerPush([ich.id], "Test vom Bachkreis", "Test aus der App");
    return { echt: true, auftraege: r?.auftraege || 0, gesendet: r?.zustellung?.gesendet || 0, fehler: r?.zustellung?.fehler || 0, unterdrueckt: r?.unterdrueckt || 0 };
  }
  const s = await senden({ an: [ich.id], betreff: "Test vom Bachkreis", text: "Wenn du das liest, funktionieren Benachrichtigungen. 🎻", ereignis: "test", kanaele });
  return { echt: false, auftraege: s.push + s.mail + s.app, gesendet: 0, fehler: s.fehler, unterdrueckt: s.unterdrueckt };
}

// WhatsApp-Übergabe: an eine Nummer (wa.me) oder ohne Nummer (Auswahl in WhatsApp / Teilen-Menü). Wird protokolliert.
export async function whatsapp(text, { nummer = "", anId = null, betreff = "WhatsApp" } = {}) {
  if (!istEchtbetrieb()) await speichere("versand", { zeit: new Date().toISOString(), kanal: "whatsapp", an_id: anId, betreff, status: "uebergeben", ereignis: "whatsapp" });
  if (!nummer && navigator.share) {
    try { await navigator.share({ text }); return; } catch { /* abgebrochen → wa.me */ }
  }
  window.open(waLink(text, nummer), "_blank", "noopener");
}

// ---------- Web-Push-Abo dieses Geräts (Echtbetrieb) ----------
const b64zuBytes = (b) => { const s = atob((b + "=".repeat((4 - (b.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
export async function pushAbonnieren() {
  if (!istEchtbetrieb()) return { ok: false, grund: "DEMO" };
  if (!("serviceWorker" in navigator) || !("PushManager" in globalThis)) return { ok: false, grund: "NICHT_UNTERSTUETZT" };
  if (globalThis.Notification?.permission !== "granted") return { ok: false, grund: "NICHT_ERLAUBT" };
  const k = await serverAktion("push_schluessel", {});
  if (!k?.schluessel) return { ok: false, grund: "SERVER_OHNE_PUSH" };
  const reg = await navigator.serviceWorker.ready;
  let abo = await reg.pushManager.getSubscription();
  const passt = abo && abo.options?.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(abo.options.applicationServerKey))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") === k.schluessel;
  if (abo && !passt) { await abo.unsubscribe().catch(() => {}); abo = null; }
  abo ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64zuBytes(k.schluessel) });
  const r = await serverAktion("push_abo", { abo: abo.toJSON(), geraet: (navigator.userAgentData?.platform || navigator.platform || "") + " · " + (navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] || "") });
  return { ok: !!r?.ok, grund: r?.fehler || null };
}

// Echte lokale Benachrichtigung NUR auf diesem Gerät, wenn die angemeldete Person Empfänger ist (Demo von „Push“).
let ichId = null;
export const setzeEmpfaengerGeraet = (id) => { ichId = id; };
async function lokalerPush(an, titel, text) {
  if (istEchtbetrieb()) return; // im Echtbetrieb kommt der echte Push vom Server
  if (!ichId || !an.includes(ichId)) return;
  if (!("Notification" in globalThis) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opt = { body: String(text || "").slice(0, 180), icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "bk-" + Date.now() };
    if (reg) await reg.showNotification(titel || konfig().name || "Bachkreis", opt); else new Notification(titel, opt);
  } catch (e) { console.warn("Benachrichtigung nicht möglich", e); }
}

export function versandStatistik() {
  const v = liste("versand");
  const heute = new Date().toISOString().slice(0, 10);
  const tag = Date.now() - 86400000;
  const v24 = v.filter((x) => new Date(x.zeit).getTime() > tag);
  return {
    gesamt: v.length, heute: v.filter((x) => (x.zeit || "").startsWith(heute)).length,
    fehler: v24.filter((x) => ["fehler", "tot"].includes(x.status)).length, offen: v.filter((x) => ["wartend", "erneut", "in_arbeit"].includes(x.status)).length,
    letzte: v.slice(-1)[0] || null,
  };
}

// Ampel des Communicators (grün nur, wenn gemessen und gut – grau = unbekannt, nie „ok“)
export function communicatorZustand() {
  if (!istEchtbetrieb()) return { farbe: "grau", text: `Vorführversion – ${versandStatistik().gesamt} Aufträge simuliert`, anbieter: [] };
  const e = hole("kom_einstellungen", "global");
  const routen = liste("kom_routen", (r) => r.aktiv !== false);
  const anbieter = [...new Set(routen.map((r) => r.anbieter_id))].map((id) => {
    const a = hole("kom_anbieter", id); const z = liste("kom_zustand", (x) => x.anbieter_id === id)[0];
    return { id, name: a?.name || id, kanal: a?.kanal, aktiv: a?.aktiv !== false, status: z?.status || "unbekannt", z };
  }).filter((a) => a.aktiv);
  const st = versandStatistik();
  const kanalOk = (k) => anbieter.some((a) => a.kanal === k && a.status === "ok");
  const kanalTot = (k) => anbieter.filter((a) => a.kanal === k).every((a) => ["ausgefallen", "nicht_eingerichtet"].includes(a.status));
  let farbe = "grau", text = "noch nichts gemessen";
  if (e && e.versand_aktiv === false) { farbe = "rot"; text = "Versand AUSGESCHALTET (Not-Aus) – nur Notfälle"; }
  else if (kanalTot("push") && kanalTot("mail")) { farbe = "rot"; text = "kein Push- und kein Mail-Anbieter erreichbar"; }
  else if (anbieter.some((a) => ["ausgefallen", "gestoert", "nicht_eingerichtet"].includes(a.status)) || st.fehler) { farbe = "gelb"; text = `${anbieter.filter((a) => a.status !== "ok").map((a) => `${a.name}: ${KOM_ZUSTAND[a.status] || a.status}`).join(" · ")}${st.fehler ? ` · ${st.fehler} Fehler (24 Std.)` : ""}`; }
  else if (kanalOk("push") || kanalOk("mail")) { farbe = "gruen"; text = `${st.heute} Aufträge heute · ${st.offen} offen`; }
  return { farbe, text, anbieter };
}
export const KOM_ZUSTAND = { ok: "ok", gestoert: "gestört", ausgefallen: "ausgefallen", nicht_eingerichtet: "nicht eingerichtet", unbekannt: "unbekannt" };
export const adapterInfo = () => liste("kom_anbieter", (a) => a.aktiv !== false).map((a) => ({ k: a.id, name: a.name }));
