// 🖨️ Druckvorschau (0.53.0, wie KC „Druckvorschau“) im 🎨 Bachkreis-Corporate-Design (0.54.0, docs/CORPORATE_DESIGN.md):
// Die App SETZT die Seiten selbst (A4, Ränder 15 mm) – jede Seite mit Kopf (Logo · Bachkreis Bergkamen · Untertitel · Datum, Goldlinie) und
// Fuß (links das Dokument · Mitte „Seite 1/2“ · rechts Bachkreis Bergkamen). Dieselben Seiten zeigt die Vorschau, druckt 🖨️ Drucken und enthält
// das 📄 PDF (selbst gebaut, kein fremder Dienst). Seitenwechsel nur zwischen Zeilen/Blöcken, nie direkt nach einer Überschrift.
// Weitere Knöpfe: 💬 In einen Chat · 📥 In meinen Eingangskorb · 📤 In den Eingangskorb anderer (Leitung).
import { S, VIEWS, zeige, zeichne, name, hatRolle } from "./zustand.js"; // eslint-disable-line no-unused-vars
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { hochladen } from "../kern/dateien.js";
import { pdfAusJpegs, umbrueche } from "../kern/pdf.js";
import { laden as html2canvasLaden } from "./bildschirmfoto.js";
import { EK_VERTEILER } from "../kern/schema.js";

// 🎨 Corporate Design (Maße in px bei 96 dpi; 1 mm ≈ 3,78 px)
export const CD = { gold: "#f2b705", dunkel: "#1a1500", golddunkel: "#8a6400", grau: "#555555", schrift: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  rand: 57, kopf: 100, fuss: 66, logo: 42 };
const DV = { titel: "", html: "", format: "hoch", datei: null, name: "", seiten: null, laeuft: null };
const BREITE = { hoch: 794, quer: 1123 }, HOEHE = { hoch: 1123, quer: 794 }; // A4
const SKALA = 2; // ~190 dpi – scharf genug für Druck und PDF
const heute = () => new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateiName = (t) => `${String(t || "Bachkreis").replace(/[^\wäöüÄÖÜß -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Bachkreis"}.pdf`;
export const darfVerteilen = () => hatRolle(...EK_VERTEILER);
const marke = () => { const k = konfig(); return { name: k.name || "Bachkreis Bergkamen", unter: k.untertitel || "Jugendsinfonieorchester" }; };

// Vorschau öffnen – die Seiten werden sofort gesetzt
export function druckVorschau({ titel = "Bachkreis", html = "", format = "hoch" } = {}) {
  Object.assign(DV, { titel, html, format: format === "quer" ? "quer" : "hoch", datei: null, name: dateiName(titel), seiten: null, laeuft: null });
  document.getElementById("dvFenster")?.remove();
  const f = document.createElement("div"); f.id = "dvFenster"; f.className = "dv-fenster"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", `Druckvorschau: ${titel}`);
  f.innerHTML = `<div class="dv-leiste" role="toolbar" aria-label="Druckvorschau"><button type="button" class="knopf" data-a="dvZu" aria-label="Vorschau schließen">✕</button>
      <button type="button" class="knopf haupt" data-a="dvDrucken">🖨️ Drucken</button><button type="button" class="knopf" data-a="dvPdf">📄 PDF</button>
      <button type="button" class="knopf" data-a="dvChat">💬 In Chat</button><button type="button" class="knopf" data-a="dvKorb">📥 Eingangskorb</button>
      ${darfVerteilen() ? '<button type="button" class="knopf" data-a="dvVerteilen">📤 An Mitglieder</button>' : ""}</div>
    <div class="dv-flaeche" id="dvSeiten" aria-live="polite" tabindex="0" aria-label="Seiten"><p class="dv-setzen">📐 Seiten werden gesetzt …</p></div>`;
  document.body.appendChild(f); document.body.classList.add("dv-offen");
  f.querySelector('[data-a="dvDrucken"]')?.focus();
  seitenSetzen().then((l) => {
    const box = document.getElementById("dvSeiten"); if (!box || DV.seiten !== l) return;
    box.innerHTML = l.map((s, i) => `<img class="dv-seite dv-${DV.format}" src="${s.url}" alt="${esc(DV.titel)} – Seite ${i + 1} von ${l.length}">`).join("");
  }).catch((e) => { const box = document.getElementById("dvSeiten"); if (box) box.innerHTML = `<p class="dv-setzen">⚠️ Setzen ging nicht: ${esc(e.message || "")}</p>`; });
}
AKTIONEN.dvZu = () => { document.getElementById("dvFenster")?.remove(); document.getElementById("dvDruck")?.remove(); document.body.classList.remove("dv-offen"); };

// ---------- 📐 Seiten setzen (einmal je Vorschau; Vorschau, Druck und PDF nutzen dieselben Seiten) ----------
const bildLaden = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
function kuerzen(g, t, max) { if (g.measureText(t).width <= max) return t; while (t.length > 3 && g.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; }
export function seitenSetzen() {
  if (DV.laeuft) return DV.laeuft;
  return (DV.laeuft = (async () => {
    await html2canvasLaden();
    const B = BREITE[DV.format], H = HOEHE[DV.format], satzBreite = B - 2 * CD.rand, platz = H - CD.kopf - CD.fuss - 8;
    const box = document.createElement("div"); box.className = "dv-mess";
    box.innerHTML = `<div class="dv-satz" style="width:${satzBreite}px">${DV.html}</div>`; document.body.appendChild(box);
    const satz = box.firstElementChild;
    try {
      await Promise.all([...satz.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }))));
      const oben = satz.getBoundingClientRect().top, unten = (e) => Math.round(e.getBoundingClientRect().bottom - oben);
      const grenzen = [...satz.querySelectorAll("p, li, tr, h1, h2, h3, h4, section, table, img, figure, .lv-zeile, .lv-unterschrift, .karte, div")].map(unten);
      const nachUeberschrift = new Set([...satz.querySelectorAll("h1, h2, h3, h4, legend, thead")].map(unten)); // nie direkt nach einer Überschrift umbrechen
      const gesamt = Math.max(1, satz.offsetHeight), starts = umbrueche(gesamt, platz, grenzen.filter((g) => !nachUeberschrift.has(g))), enden = [...starts.slice(1), gesamt];
      const bild = await globalThis.html2canvas(satz, { scale: SKALA, backgroundColor: "#ffffff", logging: false, useCORS: true });
      const logo = await bildLaden("icons/logo.png"), m = marke(), n = starts.length, seiten = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElement("canvas"); c.width = B * SKALA; c.height = H * SKALA;
        const g = c.getContext("2d"); g.scale(SKALA, SKALA); g.fillStyle = "#fff"; g.fillRect(0, 0, B, H);
        // Kopf: Logo · Name · Untertitel · Datum · Goldlinie
        const ky = 34; if (logo) g.drawImage(logo, CD.rand, ky - CD.logo / 2 - 4, CD.logo, CD.logo);
        g.textBaseline = "alphabetic"; g.fillStyle = CD.dunkel; g.font = `700 16px ${CD.schrift}`; g.fillText(m.name, CD.rand + CD.logo + 12, ky - 2);
        g.fillStyle = CD.golddunkel; g.font = `500 11px ${CD.schrift}`; g.fillText(m.unter, CD.rand + CD.logo + 12, ky + 14);
        g.fillStyle = CD.grau; g.font = `400 11px ${CD.schrift}`; const d = heute(); g.fillText(d, B - CD.rand - g.measureText(d).width, ky + 14);
        g.fillStyle = CD.gold; g.fillRect(CD.rand, ky + 26, B - 2 * CD.rand, 2.2);
        // Inhalt
        const h = enden[i] - starts[i];
        g.drawImage(bild, 0, starts[i] * SKALA, satzBreite * SKALA, h * SKALA, CD.rand, CD.kopf, satzBreite, h);
        // Fuß: Goldlinie · links Dokument · Mitte „Seite 1/2“ · rechts Name
        const fy = H - CD.fuss + 22; g.fillStyle = CD.gold; g.fillRect(CD.rand, fy - 16, B - 2 * CD.rand, 1);
        const drittel = (B - 2 * CD.rand) / 3;
        g.font = `400 10.5px ${CD.schrift}`; g.fillStyle = CD.grau; g.fillText(kuerzen(g, DV.titel, drittel - 8), CD.rand, fy);
        g.font = `700 10.5px ${CD.schrift}`; g.fillStyle = CD.dunkel; const sz = `Seite ${i + 1}/${n}`; g.fillText(sz, (B - g.measureText(sz).width) / 2, fy);
        g.font = `600 10.5px ${CD.schrift}`; g.fillStyle = CD.golddunkel; const r = kuerzen(g, m.name, drittel - 8); g.fillText(r, B - CD.rand - g.measureText(r).width, fy);
        const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.88));
        seiten.push({ blob, url: URL.createObjectURL(blob), w: c.width, h: c.height });
      }
      DV.seiten = seiten; return seiten;
    } finally { box.remove(); }
  })());
}
// 🖨️ Drucken: genau die gesetzten Seiten, randlos je A4-Blatt
AKTIONEN.dvDrucken = async () => {
  const l = await seitenSetzen().catch(() => null); if (!l) return toast("⚠️ Drucken ging nicht");
  const st = document.getElementById("dvSeite") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "dvSeite" }));
  st.textContent = `@page { size: A4 ${DV.format === "quer" ? "landscape" : "portrait"}; margin: 0; }`;
  let d = document.getElementById("dvDruck"); if (!d) { d = document.createElement("div"); d.id = "dvDruck"; document.body.appendChild(d); }
  d.innerHTML = l.map((s) => `<img src="${s.url}" alt="" class="dv-druckseite dv-${DV.format}">`).join("");
  await Promise.all([...d.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }))));
  document.body.classList.add("dv-druck"); setTimeout(() => { try { print(); } catch {} document.body.classList.remove("dv-druck"); }, 60);
};
// 📄 PDF aus denselben Seiten
export async function pdfBauen() {
  if (DV.datei) return DV.datei;
  const l = await seitenSetzen(), seiten = [];
  for (const s of l) seiten.push({ daten: new Uint8Array(await s.blob.arrayBuffer()), w: s.w, h: s.h });
  DV.datei = new File([pdfAusJpegs(seiten, { format: DV.format, titel: DV.titel })], DV.name, { type: "application/pdf" });
  return DV.datei;
}
async function mitPdf(f) { try { toast("📄 PDF wird gebaut …", 1500); return await f(await pdfBauen()); } catch (e) { toast("⚠️ " + (e.message || "PDF ging nicht"), 4000); } }
AKTIONEN.dvPdf = () => mitPdf(async (datei) => {
  if (navigator.canShare?.({ files: [datei] })) { try { await navigator.share({ files: [datei], title: DV.titel }); return; } catch (e) { if (e?.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(datei); a.download = datei.name; a.hidden = true; a.textContent = datei.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast("💾 PDF gespeichert");
});
const anlage = async (datei) => { const a = await hochladen(datei, { name: datei.name, art: "datei" }); return { id: a.id, name: a.name, mime: a.mime, groesse: a.groesse, art: "datei" }; };
// 💬 In einen Chat (auch fürs Teilen-Ziel genutzt)
export async function chatWahl(aktion, x = "") {
  const [{ meineUnterhaltungen }, { chatTitel }] = await Promise.all([import("./start.js"), import("./nachrichten.js")]); // erst beim Gebrauch (kein Kreis-Import)
  const l = meineUnterhaltungen().slice(0, 40);
  blatt("💬 In welchen Chat?", `<ul class="liste">${l.map((u) => `<li><button type="button" class="knopf breit links" data-a="${aktion}" data-x="${esc(u.id)}${x ? "|" + esc(x) : ""}">${esc(chatTitel(u))}</button></li>`).join("") || "<li>Noch kein Chat.</li>"}</ul>`);
}
AKTIONEN.dvChat = () => chatWahl("dvChatSenden");
AKTIONEN.dvChatSenden = (uid) => mitPdf(async (datei) => {
  blattZu(); const a = await anlage(datei), n = await import("./nachrichten.js");
  await n.nachrichtDirekt(uid, "", { anlagen: [a] }); AKTIONEN.dvZu(); toast("💬 Im Chat gesendet"); zeige("unterhaltung", { id: uid });
});
// 📥 In den eigenen Eingangskorb
export async function inKorb(datei, { titel = datei?.name, quelle = "druck", fuer = [S.ich?.id], text = "" } = {}) {
  const a = datei ? await anlage(datei) : null;
  for (const pid of fuer) await speichere("eingangskorb", { person_id: pid, titel: String(titel || "Ohne Titel").slice(0, 120), text: String(text || "").slice(0, 4000), datei: a ? "datei:" + a.id : null, name: a?.name || null, mime: a?.mime || null, groesse: a?.groesse || null, quelle, von: S.ich.id });
}
AKTIONEN.dvKorb = () => mitPdf(async (datei) => { await inKorb(datei, { titel: DV.titel }); toast("📥 Liegt in deinem Eingangskorb"); });
// 📤 Leitung: in den Eingangskorb ausgewählter Mitglieder
AKTIONEN.dvVerteilen = () => {
  const l = liste("personen", (p) => p.status === "aktiv" && p.id !== S.ich?.id).sort((a, b) => name(a).localeCompare(name(b)));
  blatt("📤 In den Eingangskorb von …", `<p class="hinweis">Das PDF landet im 📥 Eingangskorb der Ausgewählten (bei Kindern zusätzlich bei den Eltern sichtbar).</p>
    <div class="feld"><label for="dvSuche">Suchen</label><input id="dvSuche" type="search" autocomplete="off"></div><ul class="liste dv-wahl">${l.map((p) => `<li data-n="${esc(name(p).toLowerCase())}"><label class="pf-wunsch"><input type="checkbox" name="dvAn" value="${esc(p.id)}"> ${esc(name(p))}</label></li>`).join("")}</ul>
    <button type="button" class="knopf haupt breit" data-a="dvVerteilenLos">📤 Senden</button>`);
  const s = document.getElementById("dvSuche"); s?.addEventListener("input", () => { const q = s.value.trim().toLowerCase(); document.querySelectorAll(".dv-wahl li").forEach((li) => { li.hidden = q && !li.dataset.n.includes(q); }); });
};
AKTIONEN.dvVerteilenLos = () => mitPdf(async (datei) => {
  const an = [...document.querySelectorAll('input[name="dvAn"]:checked')].map((e) => e.value); if (!an.length) return toast("Bitte mindestens eine Person wählen");
  await inKorb(datei, { titel: DV.titel, fuer: an, quelle: "leitung" }); blattZu(); toast(`📤 In ${an.length} Eingangskörbe gelegt`);
});

// ---------- allgemeiner Knopf „🖨️ Drucken“: die aktuelle Ansicht als Vorschau ----------
export function ansichtDrucken(wurzel = document.getElementById("inhalt"), titel) {
  if (!wurzel) return;
  const k = wurzel.cloneNode(true);
  k.querySelectorAll(".kopf2, .knopfreihe, button, .knopf, input[type=file], select, .dv-nicht, .np-knoepfe, .eingabe, script").forEach((e) => e.remove());
  druckVorschau({ titel: titel || wurzel.querySelector("h2")?.textContent?.trim() || "Bachkreis", html: k.innerHTML });
}
AKTIONEN.drucken = () => ansichtDrucken();
