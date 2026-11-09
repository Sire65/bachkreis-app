// 🖨️ Druckvorschau (0.53.0, wie KC „Druckvorschau“): jede Druckstelle der App zeigt erst ein A4-Blatt mit Bachkreis-Kopf und -Fuß.
// Knöpfe: 🖨️ Drucken · 📄 PDF teilen/speichern (echtes A4-PDF, das die App selbst baut – Seitenwechsel nur zwischen Zeilen, ab Seite 2 mit Kopf,
// „Seite x von y“) · 💬 In einen Chat · 📥 In meinen Eingangskorb · 📤 In den Eingangskorb anderer (Leitung). Nichts geht an fremde Dienste.
import { S, VIEWS, zeige, zeichne, name, hatRolle } from "./zustand.js"; // eslint-disable-line no-unused-vars
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { hochladen } from "../kern/dateien.js";
import { pdfAusJpegs, umbrueche } from "../kern/pdf.js";
import { laden as html2canvasLaden } from "./bildschirmfoto.js";
import { EK_VERTEILER } from "../kern/schema.js";

const DV = { titel: "", html: "", format: "hoch", datei: null, name: "" };
const BREITE = { hoch: 794, quer: 1123 }, HOEHE = { hoch: 1123, quer: 794 }; // A4 bei 96 dpi
const heute = () => new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateiName = (t) => `${String(t || "Bachkreis").replace(/[^\wäöüÄÖÜß -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Bachkreis"}.pdf`;
export const darfVerteilen = () => hatRolle(...EK_VERTEILER);

function papierHtml() {
  const k = konfig();
  return `<div class="dv-papier dv-${DV.format}" style="width:${BREITE[DV.format]}px">
    <header class="dv-kopf"><img src="icons/logo.png" alt="" width="48" height="48"><div><b>${esc(k.name || "Bachkreis Bergkamen")}</b><small>${esc(k.untertitel || "Jugendsinfonieorchester")}</small></div><div class="dv-kopf-r"><b>${esc(DV.titel)}</b><small>${esc(heute())}</small></div></header>
    <div class="dv-inhalt">${DV.html}</div>
    <footer class="dv-fuss">${esc(k.name || "Bachkreis Bergkamen")}${k.webseite ? ` · ${esc(String(k.webseite).replace(/^https?:\/\//, "").replace(/\/$/, ""))}` : ""}</footer></div>`;
}
// Vorschau öffnen
export function druckVorschau({ titel = "Bachkreis", html = "", format = "hoch" } = {}) {
  Object.assign(DV, { titel, html, format: format === "quer" ? "quer" : "hoch", datei: null, name: dateiName(titel) });
  document.getElementById("dvFenster")?.remove();
  const f = document.createElement("div"); f.id = "dvFenster"; f.className = "dv-fenster"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", `Druckvorschau: ${titel}`);
  f.innerHTML = `<div class="dv-leiste" role="toolbar" aria-label="Druckvorschau"><button type="button" class="knopf" data-a="dvZu" aria-label="Vorschau schließen">✕</button>
      <button type="button" class="knopf haupt" data-a="dvDrucken">🖨️ Drucken</button><button type="button" class="knopf" data-a="dvPdf">📄 PDF</button>
      <button type="button" class="knopf" data-a="dvChat">💬 In Chat</button><button type="button" class="knopf" data-a="dvKorb">📥 Eingangskorb</button>
      ${darfVerteilen() ? '<button type="button" class="knopf" data-a="dvVerteilen">📤 An Mitglieder</button>' : ""}</div>
    <div class="dv-flaeche"><div class="dv-huelle"><div class="dv-massstab">${papierHtml()}</div></div></div>`;
  document.body.appendChild(f); document.body.classList.add("dv-offen");
  einpassen(); f.querySelector('[data-a="dvDrucken"]')?.focus();
}
function einpassen() {
  const fl = document.querySelector("#dvFenster .dv-flaeche"), h = fl?.querySelector(".dv-huelle"), m = fl?.querySelector(".dv-massstab"), p = m?.firstElementChild; if (!fl || !p) return;
  const s = Math.min(1, (fl.clientWidth - 16) / p.offsetWidth);
  m.style.transform = `scale(${s})`; m.style.width = `${p.offsetWidth}px`;
  h.style.width = `${p.offsetWidth * s}px`; h.style.height = `${p.offsetHeight * s}px`; // Hülle so groß wie das verkleinerte Blatt – nichts ragt über die Knöpfe
}
if (typeof window !== "undefined") addEventListener("resize", () => { if (document.getElementById("dvFenster")) einpassen(); });
AKTIONEN.dvZu = () => { document.getElementById("dvFenster")?.remove(); document.body.classList.remove("dv-offen"); };
AKTIONEN.dvDrucken = () => {
  const st = document.getElementById("dvSeite") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "dvSeite" }));
  st.textContent = `@page { size: A4 ${DV.format === "quer" ? "landscape" : "portrait"}; margin: 12mm; }`;
  document.body.classList.add("dv-druck"); setTimeout(() => { try { print(); } catch {} document.body.classList.remove("dv-druck"); }, 60);
};

// ---------- 📄 PDF bauen ----------
export async function pdfBauen() {
  if (DV.datei) return DV.datei;
  await html2canvasLaden();
  const B = BREITE[DV.format], H = HOEHE[DV.format], RAND_O = 34, RAND_U = 40, platz = H - RAND_O - RAND_U, SKALA = 2;
  const box = document.createElement("div"); box.className = "dv-mess"; box.innerHTML = papierHtml(); document.body.appendChild(box);
  const p = box.firstElementChild;
  try {
    await Promise.all([...p.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }))));
    const oben = p.getBoundingClientRect().top;
    const grenzen = [...p.querySelectorAll("p, li, tr, h1, h2, h3, h4, header, footer, section, table, img, figure, .lv-zeile, .lv-unterschrift, .dv-block, .karte, div")].map((e) => Math.round(e.getBoundingClientRect().bottom - oben));
    const nachUeberschrift = new Set([...p.querySelectorAll("h1, h2, h3, h4, legend, thead")].map((e) => Math.round(e.getBoundingClientRect().bottom - oben))); // nie direkt nach einer Überschrift umbrechen
    const gesamt = p.offsetHeight, starts = umbrueche(gesamt, platz, grenzen.filter((g) => !nachUeberschrift.has(g))), enden = [...starts.slice(1), gesamt];
    const bild = await globalThis.html2canvas(p, { scale: SKALA, backgroundColor: "#ffffff", logging: false, useCORS: true, windowWidth: B });
    const seiten = [];
    for (let i = 0; i < starts.length; i++) {
      const c = document.createElement("canvas"); c.width = B * SKALA; c.height = H * SKALA;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      const hoehe = enden[i] - starts[i];
      g.drawImage(bild, 0, starts[i] * SKALA, B * SKALA, hoehe * SKALA, 0, RAND_O * SKALA, B * SKALA, hoehe * SKALA);
      g.fillStyle = "#555"; g.font = `${11 * SKALA}px sans-serif`;
      if (i > 0) { g.fillText(`${konfig().name || "Bachkreis Bergkamen"} · ${DV.titel}`, 40 * SKALA, 22 * SKALA); g.fillRect(40 * SKALA, 27 * SKALA, (B - 80) * SKALA, 1); }
      const s = `Seite ${i + 1} von ${starts.length}`; g.fillText(s, (B - 40) * SKALA - g.measureText(s).width, (H - 16) * SKALA);
      const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86));
      seiten.push({ daten: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height });
    }
    const pdf = pdfAusJpegs(seiten, { format: DV.format, titel: DV.titel });
    DV.datei = new File([pdf], DV.name, { type: "application/pdf" });
    return DV.datei;
  } finally { box.remove(); }
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
