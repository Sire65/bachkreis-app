// 📦 Programmteile bei Bedarf laden (0.55.0, wie KC-CLUB-TEILE): selten gebrauchte Teile (Karte: teile-karte.js, erzeugt von
// tools/teile-karte.mjs) werden erst beim ersten Öffnen einer ihrer Ansichten oder beim ersten Tippen auf eine ihrer Aktionen geladen.
// Offline geht es trotzdem: der Service Worker hat alle Teile im Speicher.
import { TEILE_KARTE } from "./teile-karte.js";
const geladen = new Map();
export const teilFuerAnsicht = (v) => TEILE_KARTE.views[v] || null;
export const teilFuerAktion = (a) => TEILE_KARTE.aktionen[a] || null;
export function teilLaden(datei) {
  if (!geladen.has(datei)) geladen.set(datei, import(`./${datei}`).catch((e) => { geladen.delete(datei); throw e; }));
  return geladen.get(datei);
}
// Aktion ausführen – lädt ihren Teil, falls nötig
export async function aktionNachladen(name) { const d = teilFuerAktion(name); if (!d) return false; await teilLaden(d); return true; }
