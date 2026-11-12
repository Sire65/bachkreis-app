// 📖 PDF in der App ansehen (0.40.0, wie KC-CLUB-DOKUMENTE / KC-CLUB-DOK-SCHONEND): pdf.js (Mozilla, Apache-2.0) liegt in lib/pdfjs und wird erst beim
// ersten PDF geladen – nichts kommt von fremden Servern. Seiten werden nur gezeichnet, wenn sie in die Nähe des Bildschirms kommen (lange Partituren schonen
// den Speicher). Neu für den Bachkreis: 🎼 Pult-Modus – eine Seite (quer: zwei) bildschirmfüllend, blättern mit Tippen links/rechts, Wischen oder
// Blätter-Pedal (Bluetooth-Pedale senden Pfeil-/Bildtasten). Klappt die Anzeige nicht (alter Browser), bleibt „⬇️ Herunterladen / öffnen“.
import { S, VIEWS, zeige, kopf } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { dateiUrl, pdfAnzeigerSetzen } from "../kern/dateien.js";

const BIB = "lib/pdfjs/pdf.min.js?v=4.10.38", WORKER = "lib/pdfjs/pdf.worker.min.js?v=4.10.38", LANG = 30;
let laden = null;
function pdfjs() {
  if (!laden) laden = import(new URL(BIB, location.href).href).then((m) => { m.GlobalWorkerOptions.workerSrc = new URL(WORKER, location.href).href; return m; }).catch((e) => { laden = null; throw e; });
  return laden;
}
const P = { titel: "", url: "", lauf: 0, pdf: null, seiten: 0, bilder: [], beob: null, fehler: "", pult: false, seite: 1, name: "" };
export async function pdfZeigen({ id = null, url = null, titel = "PDF", name = "" } = {}) {
  try { P.url = id ? await dateiUrl(id) : new URL(url, location.href).href; } catch (e) { return toast("⚠️ " + e.message); }
  Object.assign(P, { titel, name: name || `${titel}.pdf`, fehler: "", pult: false, seite: 1 });
  zeige("pdf", { t: Date.now() });
}
pdfAnzeigerSetzen((d) => pdfZeigen(d));
AKTIONEN.pdfUrl = (x) => { const [url, ...t] = String(x).split("|"); pdfZeigen({ url, titel: t.join("|") || "PDF" }); };

VIEWS.pdf = {
  render() {
    return kopf(`📖 ${esc(P.titel)}`, `<button type="button" class="knopf klein" data-a="pdfPult" aria-label="Pult-Modus: Seite für Seite, wie auf dem Notenpult">🎼 Pult</button><button type="button" class="knopf klein" data-a="pdfLaden" aria-label="Herunterladen oder teilen">⬇️</button>`)
      + `<p class="hinweis" id="pdfStand" aria-live="polite">${P.fehler ? esc(P.fehler) : "Wird geladen …"}</p><div class="pdf-seiten" id="pdfSeiten"></div>`;
  },
  nach() { seitenAufbauen(); },
};
async function seitenAufbauen() {
  const lauf = ++P.lauf; P.beob?.disconnect(); try { await P.pdf?.destroy(); } catch {} P.pdf = null;
  const box = document.getElementById("pdfSeiten"), stand = document.getElementById("pdfStand"); if (!box) return;
  try {
    const m = await pdfjs(), pdf = await m.getDocument({ url: P.url, isEvalSupported: false }).promise;
    if (lauf !== P.lauf) return pdf.destroy();
    const s1 = (await pdf.getPage(1)).getViewport({ scale: 1 });
    Object.assign(P, { pdf, seiten: pdf.numPages, bilder: new Array(pdf.numPages).fill(null), verhaeltnis: s1.width / s1.height });
    for (let n = 1; n <= pdf.numPages; n++) { const img = new Image(); img.alt = `Seite ${n} von ${pdf.numPages}`; img.className = "pdf-seite"; img.dataset.n = n; img.style.aspectRatio = `${s1.width} / ${s1.height}`; box.appendChild(img); }
    P.beob = new IntersectionObserver((l) => { for (const e of l) if (e.isIntersecting) seiteZeichnen(lauf, +e.target.dataset.n).then((u) => { if (u) e.target.src = u; }); }, { rootMargin: pdf.numPages > LANG ? "600px 0px" : "1500px 0px" });
    box.querySelectorAll(".pdf-seite").forEach((i) => P.beob.observe(i));
    if (stand) stand.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? "Seite" : "Seiten"} · 🎼 Pult: Seite für Seite blättern (auch mit Blätter-Pedal)`;
  } catch (e) {
    console.warn("PDF", e); P.fehler = "Die Anzeige klappt auf diesem Gerät nicht – „⬇️“ öffnet das PDF stattdessen.";
    if (stand) stand.textContent = P.fehler;
  }
}
const zeichnet = new Map();
function seiteZeichnen(lauf, n, breiteFaktor = 1) {
  if (P.bilder[n - 1]) return Promise.resolve(P.bilder[n - 1]);
  if (zeichnet.has(n)) return zeichnet.get(n);
  const p = (async () => {
    const seite = await P.pdf.getPage(n), v1 = seite.getViewport({ scale: 1 });
    const breite = Math.min(1600, Math.round((document.getElementById("pdfSeiten")?.clientWidth || innerWidth) * Math.min(P.seiten > LANG ? 1.5 : 2, devicePixelRatio || 1) * breiteFaktor));
    const v = seite.getViewport({ scale: breite / v1.width }), c = document.createElement("canvas"); c.width = Math.round(v.width); c.height = Math.round(v.height);
    const cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height);
    await seite.render({ canvasContext: cx, viewport: v }).promise;
    if (lauf !== P.lauf) return null;
    const b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88)); c.width = c.height = 0;
    const u = URL.createObjectURL(b); P.bilder[n - 1] = u; return u;
  })().finally(() => zeichnet.delete(n));
  zeichnet.set(n, p); return p;
}
AKTIONEN.pdfLaden = async () => {
  try {
    const blob = await (await fetch(P.url)).blob(), datei = new File([blob], P.name.endsWith(".pdf") ? P.name : P.name + ".pdf", { type: "application/pdf" });
    if (navigator.canShare?.({ files: [datei] })) { try { await navigator.share({ files: [datei], title: P.titel }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = datei.name; document.body.appendChild(a); a.click(); a.remove();
  } catch { window.open(P.url, "_blank", "noopener"); }
};

// ---------- 🎼 Pult-Modus ----------
const quer = () => innerWidth > innerHeight && innerWidth >= 900 && P.seiten > 1;
AKTIONEN.pdfPult = () => { if (!P.pdf) return toast("Einen Moment – das PDF lädt noch."); P.pult = true; pultZeigen(); };
async function pultZeigen() {
  let o = document.getElementById("pdfPult");
  if (!o) {
    o = document.createElement("div"); o.id = "pdfPult"; o.className = "pdf-pult"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Pult-Modus");
    o.innerHTML = `<div class="pdf-pult-bilder" id="pdfPultBilder"></div><button type="button" class="pdf-pult-zone links" aria-label="Seite zurück"></button><button type="button" class="pdf-pult-zone rechts" aria-label="Seite weiter"></button>
      <div class="pdf-pult-leiste"><button type="button" data-p="zu" aria-label="Pult-Modus beenden">✕</button><span id="pdfPultSeite" aria-live="polite"></span><button type="button" data-p="-1" aria-label="Seite zurück">‹</button><button type="button" data-p="1" aria-label="Seite weiter">›</button></div>`;
    o.querySelector(".links").onclick = () => blaettern(-1); o.querySelector(".rechts").onclick = () => blaettern(1);
    o.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => (b.dataset.p === "zu" ? pultZu() : blaettern(+b.dataset.p))));
    let x0 = null; o.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    o.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) blaettern(dx < 0 ? 1 : -1); });
    document.body.appendChild(o); document.addEventListener("keydown", taste);
    try { await o.requestFullscreen?.(); } catch {}
    try { P.wach = await navigator.wakeLock?.request("screen"); } catch {} // Bildschirm bleibt an, solange das Pult offen ist
  }
  const n = P.seite, zwei = quer(), box = document.getElementById("pdfPultBilder");
  const seiten = zwei ? [n, n + 1].filter((x) => x <= P.seiten) : [n];
  box.className = `pdf-pult-bilder${zwei ? " zwei" : ""}`;
  box.innerHTML = seiten.map((x) => `<img alt="Seite ${x} von ${P.seiten}" data-n="${x}">`).join("");
  for (const x of seiten) seiteZeichnen(P.lauf, x).then((u) => { const i = box.querySelector(`[data-n="${x}"]`); if (i && u) i.src = u; });
  document.getElementById("pdfPultSeite").textContent = `${seiten.join("–")} / ${P.seiten}`;
  // nächste Seite schon vorbereiten
  for (const x of [n + seiten.length, n + seiten.length + 1]) if (x <= P.seiten) seiteZeichnen(P.lauf, x);
}
function blaettern(r) {
  const schritt = quer() ? 2 : 1, neu = Math.max(1, Math.min(P.seiten, P.seite + r * schritt));
  if (neu === P.seite) { navigator.vibrate?.(20); return; }
  P.seite = neu; pultZeigen();
}
function taste(e) {
  if (!document.getElementById("pdfPult")) return;
  if (["ArrowRight", "PageDown", " ", "ArrowDown", "Enter"].includes(e.key)) { e.preventDefault(); blaettern(1); }
  else if (["ArrowLeft", "PageUp", "ArrowUp", "Backspace"].includes(e.key)) { e.preventDefault(); blaettern(-1); }
  else if (e.key === "Escape") pultZu();
}
function pultZu() {
  document.getElementById("pdfPult")?.remove(); document.removeEventListener("keydown", taste); P.pult = false;
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  try { P.wach?.release(); } catch {} P.wach = null;
}
document.addEventListener("bk-ansicht", () => { if (S.view !== "pdf") pultZu(); });
