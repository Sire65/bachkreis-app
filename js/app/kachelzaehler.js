// 🧭 Kachel-Nutzung zählen (0.76.0, Auswertungen – Bewertung „welche Kacheln werden überhaupt benutzt? Grundlage, um gezielt auszudünnen“):
// jedes Antippen einer Kachel (Startseite, Eltern-, Kinder-Start, Weitere Technik) zählt +1 je Tag – nur Kachel und Tag, nie die Person.
// Gesammelt auf dem Gerät und höchstens alle 10 Minuten (und beim Verlassen) in einem Rutsch an den Server (Aktion kachel_nutzung).
// Vorführversion: bleibt auf dem Gerät (Auswertung zeigt dann „nur dieses Gerät“).
import { istEchtbetrieb, serverAktionStill } from "../kern/daten.js";

const SCHL = "bk_kachel_zaehler", OFFEN = "bk_kachel_offen", TAKT = 600000;
const lese = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
const schreibe = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function kachelZaehlen(id) {
  if (!/^[a-z0-9_-]{1,40}$/.test(String(id || ""))) return;
  const t = heute();
  for (const k of [SCHL, OFFEN]) { const z = lese(k); (z[t] ||= {}); z[t][id] = (z[t][id] || 0) + 1; for (const alt of Object.keys(z).sort().slice(0, -90)) delete z[alt]; schreibe(k, z); }
}
// Zählung dieses Geräts der letzten n Tage (für die Vorführversion)
export function geraetZaehlung(tage = 30) {
  const z = lese(SCHL), grenze = new Date(Date.now() - tage * 86400000).toISOString().slice(0, 10), out = {};
  for (const [t, je] of Object.entries(z)) if (t >= grenze) for (const [k, n] of Object.entries(je)) out[k] = (out[k] || 0) + n;
  return out;
}
let letzt = 0;
export async function kachelSenden(sofort = false) {
  if (!istEchtbetrieb() || (!sofort && Date.now() - letzt < TAKT)) return;
  const offen = lese(OFFEN); if (!Object.keys(offen).length) return;
  letzt = Date.now();
  try {
    const r = await serverAktionStill("kachel_nutzung", { tage: offen });
    if (r?.ok) { const jetzt = lese(OFFEN); for (const [t, je] of Object.entries(offen)) for (const [k, n] of Object.entries(je)) { if (!jetzt[t]?.[k]) continue; jetzt[t][k] -= n; if (jetzt[t][k] <= 0) delete jetzt[t][k]; if (!Object.keys(jetzt[t]).length) delete jetzt[t]; } schreibe(OFFEN, jetzt); } // nur das Gesendete abziehen
  } catch {}
}
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => { const k = e.target.closest?.(".kachel[data-id], .kind-kachel[data-x]"); if (k) { kachelZaehlen(k.dataset.id || k.dataset.x); kachelSenden(); } }, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) kachelSenden(true); });
}
