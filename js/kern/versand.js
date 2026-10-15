// Versand-Dienst mit austauschbaren Kanal-Adaptern (AGENTS.md Regel 18) – entspricht dem portablen Kern des
// KC Communicators (Push, Mail, Vorlagen, Quittungen). In der Vorführversion werden Push und Mail SIMULIERT und
// im Versandprotokoll vermerkt; die WhatsApp-Übergabe funktioniert echt (wa.me / Teilen), ohne kostenpflichtige API.
import { liste, hole, speichere, speichereViele, konfig } from "./daten.js";
import { waLink } from "./logik.js";

export const KANAELE = { push: "🔔 Push", mail: "✉️ E-Mail", whatsapp: "🟢 WhatsApp", app: "💬 In der App" };
export const EREIGNISSE = {
  termin_neu: "Neuer Termin", termin_geaendert: "Termin geändert/abgesagt", erinnerung: "Erinnerung vor Terminen", nachfassen: "Nachfassen bei fehlender Antwort",
  nachricht: "Neue Nachricht", rundschreiben: "Rundschreiben", genehmigung: "Genehmigung angefragt", instrument: "Leihinstrument (Rückgabe, Schaden)", sos: "SOS / Notfall",
};
const STANDARD_WAHL = { sos: ["push", "app"], rundschreiben: ["push", "mail", "app"], genehmigung: ["push", "mail", "app"] };
export function wahlVon(person, ereignis) {
  return person?.benachrichtigung?.[ereignis] || STANDARD_WAHL[ereignis] || ["push", "app"];
}

const ADAPTER = {
  push: { name: "Web-Push (VAPID)", async senden(p, n) { return { status: "simuliert", info: "Vorführversion: kein Push-Server" }; } },
  mail: { name: "E-Mail (Brevo)", async senden(p, n) { return p.email ? { status: "simuliert", info: "Vorführversion: keine Mail" } : { status: "fehler", info: "keine E-Mail-Adresse" }; } },
  app: { name: "In der App", async senden() { return { status: "gesendet" }; } },
};

// Sendet an eine Liste von Personen. Rückgabe: Zusammenfassung je Kanal.
export async function senden({ an, betreff, text, ereignis = "rundschreiben", kanaele = null }) {
  const zeilen = [];
  const summe = { push: 0, mail: 0, app: 0, fehler: 0 };
  for (const id of new Set(an)) {
    const p = hole("personen", id);
    if (!p) continue;
    const wahl = (kanaele || wahlVon(p, ereignis)).filter((k) => ADAPTER[k]);
    for (const k of wahl) {
      const r = await ADAPTER[k].senden(p, { betreff, text });
      zeilen.push({ zeit: new Date().toISOString(), kanal: k, an_id: id, betreff, status: r.status, ereignis, info: r.info || "" });
      if (r.status === "fehler") summe.fehler++; else summe[k]++;
    }
  }
  if (zeilen.length) await speichereViele("versand", zeilen);
  lokalerPush(an, betreff, text);
  return summe;
}

// WhatsApp-Übergabe: an eine Nummer (wa.me) oder ohne Nummer (Auswahl in WhatsApp / Teilen-Menü). Wird protokolliert.
export async function whatsapp(text, { nummer = "", anId = null, betreff = "WhatsApp" } = {}) {
  await speichere("versand", { zeit: new Date().toISOString(), kanal: "whatsapp", an_id: anId, betreff, status: "uebergeben", ereignis: "whatsapp" });
  if (!nummer && navigator.share) {
    try { await navigator.share({ text }); return; } catch { /* abgebrochen → wa.me */ }
  }
  window.open(waLink(text, nummer), "_blank", "noopener");
}

// Echte lokale Benachrichtigung NUR auf diesem Gerät, wenn die angemeldete Person Empfänger ist (Demo von „Push“).
let ichId = null;
export const setzeEmpfaengerGeraet = (id) => { ichId = id; };
async function lokalerPush(an, titel, text) {
  if (!ichId || !an.includes(ichId)) return;
  if (!("Notification" in globalThis) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opt = { body: text.slice(0, 180), icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "bk-" + Date.now() };
    if (reg) await reg.showNotification(titel || konfig().name || "Bachkreis", opt); else new Notification(titel, opt);
  } catch (e) { console.warn("Benachrichtigung nicht möglich", e); }
}

export function versandStatistik() {
  const v = liste("versand");
  const heute = new Date().toISOString().slice(0, 10);
  return { gesamt: v.length, heute: v.filter((x) => (x.zeit || "").startsWith(heute)).length, fehler: v.filter((x) => x.status === "fehler").length, letzte: v.slice(-1)[0] || null };
}
export const adapterInfo = () => Object.entries(ADAPTER).map(([k, a]) => ({ k, name: a.name }));
