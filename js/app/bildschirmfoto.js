// 📸 Bildschirmfoto mit Markierung (0.46.0, wie KC-CLUB-BILDSCHIRMFOTO / -MELDUNG / -FARBEN): erst 📸 antippen, dann in Ruhe dahin gehen,
// wo man fotografieren will, dann den roten Auslöser drücken. Die App bildet den sichtbaren Bereich ab (Auslöser und Meldungen nicht mit drauf),
// danach mit dem Finger einkreisen (6 Stiftfarben, ↩️ Rückgängig). Weiter: 🆘 an die Leitung (Rückmeldung mit Bild) oder 💾 aufs Handy.
// Nichts wird automatisch gesendet oder gespeichert. Grenzen der Web-App: nur die Bachkreis-App selbst, keine fremden Apps.
// Bibliothek: html2canvas 1.4.1 (MIT, lib/html2canvas) – wird erst beim ersten Foto geladen.
import { S } from "./zustand.js";
import { AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { hochladen } from "../kern/dateien.js";

export const STIFTE = [["#e53935", "Rot"], ["#fdd835", "Gelb"], ["#43a047", "Grün"], ["#1e88e5", "Blau"], ["#111111", "Schwarz"], ["#ffffff", "Weiß"]];
const F = { canvas: null, striche: [], farbe: (() => { try { return localStorage.getItem("bk_bf_farbe") || STIFTE[0][0]; } catch { return STIFTE[0][0]; } })(), ansicht: null, weiter: null };
let ladend = null;
const laden = () => (globalThis.html2canvas ? Promise.resolve() : (ladend ||= new Promise((ok, nein) => { const s = document.createElement("script"); s.src = "lib/html2canvas/html2canvas.min.js"; s.onload = ok; s.onerror = () => { ladend = null; nein(new Error("Foto-Baustein nicht geladen – Internet prüfen")); }; document.head.appendChild(s); })));

// weiter: optionaler Rückweg (z. B. Rückmeldung) – bekommt die fertige Datei
export function fotoAusloeser(weiter = null) {
  F.weiter = weiter; blattZu();
  if (document.getElementById("bfAusloeser")) return;
  const b = document.createElement("button"); b.type = "button"; b.id = "bfAusloeser"; b.className = "bf-ausloeser"; b.setAttribute("aria-label", "Bildschirmfoto aufnehmen"); b.innerHTML = "📸<small>Foto</small>";
  const x = document.createElement("button"); x.type = "button"; x.className = "bf-ausloeser-weg"; x.setAttribute("aria-label", "Bildschirmfoto abbrechen"); x.textContent = "✕";
  const w = document.createElement("div"); w.id = "bfAusloeserRahmen"; w.className = "bf-rahmen"; w.append(b, x); document.body.appendChild(w);
  // verschiebbar (falls er etwas verdeckt)
  let zieh = null, bewegt = false;
  b.addEventListener("pointerdown", (e) => { zieh = { x: e.clientX, y: e.clientY, l: w.offsetLeft, t: w.offsetTop }; bewegt = false; b.setPointerCapture(e.pointerId); });
  b.addEventListener("pointermove", (e) => { if (!zieh) return; const dx = e.clientX - zieh.x, dy = e.clientY - zieh.y; if (Math.abs(dx) + Math.abs(dy) > 8) bewegt = true; if (bewegt) { w.style.left = `${Math.max(4, Math.min(innerWidth - 80, zieh.l + dx))}px`; w.style.top = `${Math.max(4, Math.min(innerHeight - 80, zieh.t + dy))}px`; w.style.right = "auto"; w.style.bottom = "auto"; } });
  b.addEventListener("pointerup", () => { const war = bewegt; zieh = null; if (!war) aufnehmen(); });
  x.addEventListener("click", () => { w.remove(); toast("📸 abgebrochen"); });
  toast("📸 Geh in Ruhe dahin, wo du fotografieren willst – dann den roten Auslöser antippen.", 5000);
}
AKTIONEN.bildschirmfoto = () => fotoAusloeser();

// nicht mit aufs Foto: Auslöser, Meldungen, Warte-Anzeige und alles, was gerade unsichtbar ist (z. B. Texte nur für Bildschirmleser)
function unsichtbar(el) {
  if (["bfAusloeserRahmen", "toast", "warten"].includes(el.id) || el.classList?.contains("versteckt") || el.classList?.contains("sr-only")) return true;
  if (el.nodeType !== 1) return false;
  if (["OPTION", "NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName)) return true; // sonst malt html2canvas sie oben links hin
  const st = getComputedStyle(el); return st.visibility === "hidden" || st.opacity === "0" || (st.position === "absolute" && st.clip === "rect(0px, 0px, 0px, 0px)") || (parseFloat(st.width) <= 1 && parseFloat(st.height) <= 1 && st.overflow === "hidden");
}
async function aufnehmen() {
  const rahmen = document.getElementById("bfAusloeserRahmen");
  try {
    await laden();
    F.ansicht = S.view;
    const c = await globalThis.html2canvas(document.body, { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, windowWidth: innerWidth, windowHeight: innerHeight, scale: Math.min(2, devicePixelRatio || 1), useCORS: true, logging: false,
      backgroundColor: getComputedStyle(document.body).backgroundColor, ignoreElements: unsichtbar });
    rahmen?.remove(); document.getElementById("toast")?.classList.add("versteckt"); // Meldung weg, damit sie nicht über dem Foto liegt
    const blitz = document.createElement("div"); blitz.className = "bf-blitz"; document.body.appendChild(blitz); setTimeout(() => blitz.remove(), 450);
    F.canvas = c; F.striche = []; editor();
  } catch (e) { toast("⚠️ " + (e.message || "Foto ging nicht")); }
}

function editor() {
  blatt("📸 Bildschirmfoto", `<p class="hinweis">Mit dem Finger einkreisen, was gemeint ist.</p><div class="bf-flaeche"><canvas id="bfMal" aria-label="Bildschirmfoto zum Einzeichnen"></canvas></div>
    <div class="bf-stifte" role="group" aria-label="Stiftfarbe">${STIFTE.map(([f, t]) => `<button type="button" class="bf-stift${F.farbe === f ? " an" : ""}" style="--f:${f}" data-a="bfFarbe" data-x="${f}" aria-label="Stift ${t}" aria-pressed="${F.farbe === f}"></button>`).join("")}</div>
    <div class="knopfreihe"><button type="button" class="knopf klein" data-a="bfZurueck">↩️ Rückgängig</button><button type="button" class="knopf klein" data-a="bfAllesWeg">🧽 Alles weg</button><button type="button" class="knopf klein" data-a="bfNeu">📸 Neues Foto</button></div>
    <div class="knopfspalte">${F.weiter ? '<button type="button" class="knopf haupt" data-a="bfFertig">✅ Übernehmen</button>' : '<button type="button" class="knopf haupt" data-a="bfMelden">🆘 An die Leitung schicken (mit Bild)</button>'}<button type="button" class="knopf" data-a="bfSpeichern">💾 Aufs Handy</button></div>`);
  const m = document.getElementById("bfMal"); m.width = F.canvas.width; m.height = F.canvas.height;
  zeichnen(m);
  let strich = null;
  const punkt = (e) => { const r = m.getBoundingClientRect(); return [(e.clientX - r.left) * (m.width / r.width), (e.clientY - r.top) * (m.height / r.height)]; };
  m.addEventListener("pointerdown", (e) => { e.preventDefault(); m.setPointerCapture(e.pointerId); strich = { f: F.farbe, p: [punkt(e)] }; F.striche.push(strich); });
  m.addEventListener("pointermove", (e) => { if (!strich) return; strich.p.push(punkt(e)); zeichnen(m); });
  m.addEventListener("pointerup", () => { strich = null; });
}
function zeichnen(m) {
  const g = m.getContext("2d"); g.drawImage(F.canvas, 0, 0);
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = Math.max(4, m.width / 110);
  for (const s of F.striche) { g.strokeStyle = s.f; g.beginPath(); s.p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (s.p.length === 1) g.lineTo(s.p[0][0] + 0.1, s.p[0][1]); g.stroke(); }
}
const fertigesBild = () => new Promise((ok) => { const m = document.getElementById("bfMal"); m.toBlob((b) => ok(new File([b], `bildschirmfoto-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.jpg`, { type: "image/jpeg" })), "image/jpeg", 0.85); });
AKTIONEN.bfFarbe = (f) => { F.farbe = f; try { localStorage.setItem("bk_bf_farbe", f); } catch {} document.querySelectorAll(".bf-stift").forEach((b) => { const an = b.dataset.x === f; b.classList.toggle("an", an); b.setAttribute("aria-pressed", String(an)); }); };
AKTIONEN.bfZurueck = () => { F.striche.pop(); const m = document.getElementById("bfMal"); if (m) zeichnen(m); };
AKTIONEN.bfAllesWeg = () => { F.striche = []; const m = document.getElementById("bfMal"); if (m) zeichnen(m); };
AKTIONEN.bfNeu = () => fotoAusloeser(F.weiter);
AKTIONEN.bfSpeichern = async () => {
  const f = await fertigesBild();
  if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: "Bildschirmfoto Bachkreis-App" }); return; } catch {} }
  const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("💾 Gespeichert");
};
// hochladen und in die Rückmeldung (🆘 Problem) übernehmen
async function hochladenFuerMeldung() {
  const f = await fertigesBild(); toast("⏳ Bild wird hochgeladen …");
  const r = await hochladen(f, { name: f.name }); return "datei:" + r.id;
}
AKTIONEN.bfMelden = async () => {
  try { const bild = await hochladenFuerMeldung(); blattZu(); AKTIONEN.rmNeu("problem", null, null, { bild, ansicht: F.ansicht }); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.bfFertig = async () => {
  try { const bild = await hochladenFuerMeldung(); const w = F.weiter; F.weiter = null; blattZu(); w?.(bild, F.ansicht); } catch (e) { toast("⚠️ " + e.message); }
};
