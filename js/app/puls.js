// 🎚️ Datenverkehr-Säulen im Kopf (0.75.0, wie KC-CLUB-PULS 2.964.0 – Wunsch Hansi „LED-Ausschlag für Admin“): zwei senkrechte LED-Säulen
// neben den Status-LEDs – L = Lesen, S = Schreiben, je 8 Stufen (5 grün, 2 gelb, 1 rot), logarithmisch; die Spitze der letzten Messungen
// leuchtet nach. Nur für Admin, abschaltbar (⚙️ „🎚️ Datenverkehr-Anzeige im Kopf“). Alle 4 s, nur solange die Startseite sichtbar ist.
// Der Server liefert nur Zählerstände (Aktion betrieb_puls), die App rechnet „je Sekunde“. Nicht messbar (Vorführversion, keine Statistik):
// alle Stufen grau – nie „in Ordnung“ (Entwicklervertrag Regel 11).
import { S, einst, hatRolle } from "./zustand.js";
import { AKTIONEN, blatt } from "../kern/ui.js";
import { istEchtbetrieb, serverAktionStill } from "../kern/daten.js";

export const PULS_SEG = 8, PULS_MAX = { lesen: 40, schreiben: 6 }; // je Sekunde für Vollausschlag
const P = { alt: null, wert: null, timer: null, fehler: 0, verlauf: [], messbar: null };
export const pulsAn = () => hatRolle("admin") && einst().puls !== false;
export const pulsStufe = (v, max) => (v > 0 ? Math.max(1, Math.min(PULS_SEG, Math.round((PULS_SEG * Math.log10(1 + v)) / Math.log10(1 + max)))) : 0);
// aus zwei Zählerständen „je Sekunde“ (Zähler können beim Neustart der Datenbank zurückspringen → nie negativ)
export function pulsRechnen(alt, neu) {
  if (!alt || !neu || !(neu.t > alt.t) || neu.lesen == null || alt.lesen == null) return null;
  const sek = (neu.t - alt.t) / 1000;
  return { lesen: Math.max(0, neu.lesen - alt.lesen) / sek, schreiben: Math.max(0, neu.schreiben - alt.schreiben) / sek, online: neu.online, t: neu.t };
}
const saeule = (k) => `<span class="pu-saeule" data-k="${k}">${Array.from({ length: PULS_SEG }, (_, i) => `<i class="pu-seg ${i >= PULS_SEG - 1 ? "rot" : i >= PULS_SEG - 3 ? "gelb" : "gruen"}"></i>`).join("")}</span>`;
export const pulsHtml = () => `<button type="button" class="puls" id="pulsAnzeige" data-a="pulsBlatt" hidden title="Datenverkehr: L = Lesen, S = Schreiben" aria-label="Datenverkehr-Anzeige">${saeule("L")}${saeule("S")}</button>`;
function setzen(el, v, max, k) {
  if (!el) return; const n = v == null ? 0 : pulsStufe(v, max), spitze = Math.max(0, ...P.verlauf.slice(-3).map((x) => pulsStufe(x[k], max)));
  el.classList.toggle("grau", P.messbar === false || !istEchtbetrieb());
  el.querySelectorAll(".pu-seg").forEach((s, i) => { s.classList.toggle("an", i < n); s.classList.toggle("spitze", i === spitze - 1 && i >= n); });
}
function zeigen() {
  const w = P.wert;
  for (const wo of ["#pulsAnzeige", "#pulsGross"]) { const el = document.querySelector(wo); if (!el) continue;
    setzen(el.querySelector('[data-k="L"]'), w?.lesen, PULS_MAX.lesen, "lesen"); setzen(el.querySelector('[data-k="S"]'), w?.schreiben, PULS_MAX.schreiben, "schreiben"); }
  const t = document.getElementById("pulsTexte");
  if (t) t.innerHTML = !istEchtbetrieb() ? "⚪ Vorführversion – hier gibt es keinen Server zum Messen." : P.messbar === false ? "⚪ nicht messbar (Statistik der Datenbank nicht lesbar)"
    : w ? `📥 Lesen <b>${w.lesen.toFixed(1)}</b>/s · 📤 Schreiben <b>${w.schreiben.toFixed(1)}</b>/s · 👥 <b>${w.online ?? "–"}</b> in der App` : "⏳ Erste Messung kommt in ein paar Sekunden …";
  const k = document.getElementById("pulsKurve"); if (k) k.innerHTML = kurve();
}
function kurve() {
  const v = P.verlauf; if (v.length < 2) return "";
  const pkt = (k, max) => v.map((x, i) => `${((i / (v.length - 1)) * 300).toFixed(1)},${(66 - (pulsStufe(x[k], max) / PULS_SEG) * 62).toFixed(1)}`).join(" ");
  return `<svg class="pu-kurve" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="#39d353" stroke-width="2" points="${pkt("lesen", PULS_MAX.lesen)}"/><polyline fill="none" stroke="#f5a623" stroke-width="2" points="${pkt("schreiben", PULS_MAX.schreiben)}"/></svg>`;
}
async function holen() {
  clearTimeout(P.timer); P.timer = null; if (!pulsAn()) return;
  if (istEchtbetrieb() && !document.hidden && S.view === "start") {
    try {
      const r = await serverAktionStill("betrieb_puls", {});
      if (r?.ok) { P.messbar = r.lesen != null; const w = pulsRechnen(P.alt, r); if (w) { P.wert = w; P.verlauf.push(w); if (P.verlauf.length > 150) P.verlauf.shift(); } P.alt = r; P.fehler = 0; zeigen(); }
      else P.fehler++;
    } catch { P.fehler++; }
  }
  P.timer = setTimeout(holen, 4000 * Math.min(6, 1 + P.fehler)); // Fehler → seltener fragen
}
// nach jedem Zeichnen des Kopfes aufrufen: blendet ein/aus und startet die Messung (einmal)
export function pulsStarten() {
  const el = document.getElementById("pulsAnzeige"); if (!el) return;
  const an = pulsAn(); el.hidden = !an; zeigen();
  if (an && !P.timer) holen(); else if (!an) { clearTimeout(P.timer); P.timer = null; }
}
AKTIONEN.pulsBlatt = () => {
  blatt("🎚️ Datenverkehr der App", `<p class="hinweis">Wie am Mischpult: grün normal, gelb viel los, rot sehr viel. Gemessen wird nur der Bachkreis (Lese- und Schreibzugriffe der Datenbank je Sekunde) – keine Inhalte, keine Namen. Grau = nicht gemessen.</p>
    <div class="pu-gross" id="pulsGross"><figure>${saeule("L")}<figcaption>📥 Lesen</figcaption></figure><figure>${saeule("S")}<figcaption>📤 Schreiben</figcaption></figure></div>
    <p id="pulsTexte" style="text-align:center"></p><div id="pulsKurve"></div>
    <p class="hinweis">Verlauf: <span style="color:#39d353">■</span> Lesen · <span style="color:#f5a623">■</span> Schreiben – nur solange die Startseite offen war. Abschalten: ⚙️ Einstellungen → Admin → „🎚️ Datenverkehr-Anzeige im Kopf“.</p>
    <button type="button" class="knopf breit" data-a="blattZu">Schließen</button>`);
  zeigen();
};
export const PULS_INTERN = P; // für Tests
