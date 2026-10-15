// Daten-Fassade: App und Verwaltung sprechen NUR hiermit. Welcher Adapter dahinter steckt (lokal-demo / supabase),
// entscheidet die Registry – austauschbar ohne Änderung an Oberfläche oder Fachlogik (AGENTS.md Regel 4 und 18).
import { erzeugeLokalAdapter } from "./adapter-lokal.js";
import { erzeugeSupabaseAdapter } from "./adapter-supabase.js";
import { TABELLEN } from "./schema.js";
import { UMGEBUNG } from "./umgebung.js";
import { mitWarten } from "./warten.js";

export const ADAPTER = {
  "lokal-demo": { name: "Vorführversion (Demodaten im Browser)", erzeugen: () => erzeugeLokalAdapter() },
  supabase: { name: "Bachkreis-Server (Supabase)", erzeugen: (quelle) => erzeugeSupabaseAdapter({ url: UMGEBUNG.apiUrl, quelle }) },
};

let A = null;
let wer = "System";
let quelle = "app";
const MAX_PROTOKOLL = 3000;

export const neueId = () =>
  (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

// Startet die Datenquelle der Installation (js/kern/umgebung.js). Im Echtbetrieb wird NIE still auf Demodaten
// umgeschaltet: Fehler (z. B. „Anmeldung nötig“) gehen an die Oberfläche, die dann die Anmeldung zeigt.
export async function datenStarten(opts = {}) {
  quelle = opts.quelle || "app";
  let art = UMGEBUNG.datenquelle || "lokal-demo";
  try { art = localStorage.getItem("bk_datenquelle") || art; } catch {} // nur für Entwicklung/Test
  if (!ADAPTER[art]) art = "lokal-demo";
  A = ADAPTER[art].erzeugen(quelle);
  await A.starten();
  return A.info();
}
export const datenArt = () => A?.art || UMGEBUNG.datenquelle;
export const istEchtbetrieb = () => datenArt() === "supabase";
export const anmelden = (code, verwaltung = false) => mitWarten(() => A.anmelden(code, verwaltung), "Anmelden …", true);
export const abmelden = () => A.abmelden?.();
export const serverAktion = (aktion, nutzlast) => mitWarten(() => A.aktion?.(aktion, nutzlast), /speichern|setzen|aendern/.test(aktion) ? "Wird gespeichert …" : "Einen Moment …");
export const beiHinweis = (f) => A?.beiHinweis?.(f);
export const jetztAbgleichen = () => mitWarten(() => A?.abgleichen?.(), "Wird abgeglichen …");

export const datenInfo = () => A?.info() || { art: "unbekannt", server: false };
export const setzeWer = (name) => { wer = name || "System"; };

const sichtbar = (z) => !z.geloescht_am;
export function liste(tab, filter) {
  const z = A.alle(tab).filter(sichtbar);
  return filter ? z.filter(filter) : z;
}
export function listeMitGeloeschten(tab) { return A.alle(tab); }
export function hole(tab, id) { return id ? A.alle(tab).find((z) => z.id === id && sichtbar(z)) || null : null; }

function protokoll(tab, id, aktion) {
  if (tab === "aenderungen" || A.info().server) return null; // im Echtbetrieb protokolliert der Server
  const p = A.alle("aenderungen");
  p.push({ id: neueId(), zeit: new Date().toISOString(), tabelle: tab, zeile_id: id, aktion, wer, quelle });
  if (p.length > MAX_PROTOKOLL) p.splice(0, p.length - MAX_PROTOKOLL);
  return A.schreiben("aenderungen", p);
}

// Speichern mit Abgleich-Feldern: version (+1), geaendert_am, geaendert_von – dieselben Spalten wie in Supabase.
export async function speichere(tab, obj, opts = {}) {
  if (!TABELLEN[tab]) throw new Error("Unbekannte Tabelle " + tab);
  const zeilen = A.alle(tab).slice();
  const jetzt = new Date().toISOString();
  let z;
  const i = obj.id ? zeilen.findIndex((x) => x.id === obj.id) : -1;
  const basis = i >= 0 ? zeilen[i].version ?? null : null;
  if (i >= 0) {
    z = { ...zeilen[i], ...obj, version: (zeilen[i].version || 0) + 1, geaendert_am: jetzt, geaendert_von: wer };
    zeilen[i] = z;
  } else {
    z = { ...obj, id: obj.id || neueId(), version: 1, erstellt_am: jetzt, geaendert_am: jetzt, geaendert_von: wer };
    zeilen.push(z);
  }
  await A.schreiben(tab, zeilen);
  await A.vormerken?.(tab, [{ ...z, basis_version: basis }]);
  await protokoll(tab, z.id, i >= 0 ? "geaendert" : "neu");
  if (!opts.still) A.geaendert([tab, "aenderungen"]);
  return z;
}

// Sammel-Speichern: alle Zeilen in einem Durchgang (eine Schreib-Operation je Tabelle statt je Zeile).
export async function speichereViele(tab, objs) {
  if (!TABELLEN[tab]) throw new Error("Unbekannte Tabelle " + tab);
  const zeilen = A.alle(tab).slice();
  const index = new Map(zeilen.map((z, i) => [z.id, i]));
  const jetzt = new Date().toISOString();
  const out = [], prot = [], vorgemerkt = [];
  for (const obj of objs) {
    const i = obj.id ? index.get(obj.id) : undefined;
    const basis = i !== undefined ? zeilen[i].version ?? null : null;
    let z;
    if (i !== undefined) { z = { ...zeilen[i], ...obj, version: (zeilen[i].version || 0) + 1, geaendert_am: jetzt, geaendert_von: wer }; zeilen[i] = z; }
    else { z = { ...obj, id: obj.id || neueId(), version: 1, erstellt_am: jetzt, geaendert_am: jetzt, geaendert_von: wer }; index.set(z.id, zeilen.length); zeilen.push(z); }
    out.push(z); vorgemerkt.push({ ...z, basis_version: basis });
    if (tab !== "aenderungen" && !A.info().server) prot.push({ id: neueId(), zeit: jetzt, tabelle: tab, zeile_id: z.id, aktion: i !== undefined ? "geaendert" : "neu", wer, quelle });
  }
  await A.schreiben(tab, zeilen);
  await A.vormerken?.(tab, vorgemerkt);
  if (prot.length) {
    const p = A.alle("aenderungen").concat(prot);
    await A.schreiben("aenderungen", p.length > MAX_PROTOKOLL ? p.slice(-MAX_PROTOKOLL) : p);
  }
  A.geaendert([tab, "aenderungen"]);
  return out;
}

// Löschen = weich (geloescht_am), damit der Abgleich die Löschung an andere Geräte/Neon-Spiegel weitergeben kann.
export async function loesche(tab, id) {
  const zeilen = A.alle(tab).slice();
  const i = zeilen.findIndex((x) => x.id === id);
  if (i < 0) return;
  const basis = zeilen[i].version ?? null;
  zeilen[i] = { ...zeilen[i], geloescht_am: new Date().toISOString(), geaendert_von: wer, version: (zeilen[i].version || 0) + 1 };
  await A.schreiben(tab, zeilen);
  await A.vormerken?.(tab, [{ ...zeilen[i], basis_version: basis }]);
  await protokoll(tab, id, "geloescht");
  A.geaendert([tab, "aenderungen"]);
}

export const konfig = () => A.konfig();
export const konfigSetzen = (k, v) => A.konfigSetzen(k, v);
export const abonnieren = (f) => A.abonnieren(f);
export const zuruecksetzen = () => A.zuruecksetzen();
