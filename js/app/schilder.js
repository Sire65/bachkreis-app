// 🪧 Schilder-Druckerei (0.48.0, wie KC „Schilder-Druckerei“ / KC-CLUB-SCHILDER-CD, -DRUCKPAKET): Vorlage wählen, Text eintragen, Vorschau, drucken.
// Wegweiser mit Pfeil, Reserviert/Platzkarte, Registerschild, Türschild „Probe – bitte leise“, Garderobe, Kuchenbuffet mit Preisen,
// Pult-Namenskarten (2 je Seite) – im Bachkreis-Design (Schwarz-Gold mit Logo) oder hell zum Tinte-Sparen. Nichts wird gespeichert außer der letzten Eingabe auf dem Gerät.
import { VIEWS, zeichne, kopf, istVerwalter } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";

export const VORLAGEN = {
  wegweiser: { t: "➡️ Wegweiser", felder: [["zeile1", "Text", "Zum Konzert"], ["zeile2", "Unterzeile", "Pädagogisches Zentrum"]], pfeil: true },
  reserviert: { t: "🪑 Reserviert", felder: [["zeile1", "Text", "Reserviert"], ["zeile2", "für", "Familie Hoffmann"]] },
  register: { t: "🎻 Registerschild", felder: [["zeile1", "Register", "1. Violinen"], ["zeile2", "Unterzeile", "A-Orchester"]] },
  tuer: { t: "🚪 Türschild", felder: [["zeile1", "Text", "Probe – bitte leise!"], ["zeile2", "Unterzeile", "Bachkreis Bergkamen · bis 19:45 Uhr"]] },
  garderobe: { t: "🧥 Garderobe / Instrumente", felder: [["zeile1", "Text", "Instrumentenablage"], ["zeile2", "Unterzeile", "Koffer bitte hier abstellen"]] },
  buffet: { t: "🍰 Kuchenbuffet", felder: [["zeile1", "Überschrift", "Kuchenbuffet"], ["preise", "Preise (eine Zeile je Posten: Name = Preis)", "Kuchen = 1,50 €\nKaffee = 1,50 €\nKaltgetränke = 1,00 €"], ["zeile2", "Unterzeile", "Der Erlös geht an den Förderverein – danke!"]] },
  pult: { t: "🎼 Pult-Namenskarten", felder: [["zeile1", "Name links", "Hanna"], ["zeile2", "Name rechts", "Luisa"], ["zeile3", "Instrument / Pult", "Violine 2 · Pult 3"]] },
};
export const FORMATE = { quer: "A4 quer", hoch: "A4 hoch", a5: "A5 (2 je Seite)" };
const lies = () => { try { return JSON.parse(localStorage.getItem("bk_schild") || "{}"); } catch { return {}; } };
const SCH = { vorlage: "wegweiser", format: "quer", stil: "gold", pfeil: "rechts", werte: {}, ...lies() };
const merke = () => { try { localStorage.setItem("bk_schild", JSON.stringify(SCH)); } catch {} };
const wert = (k) => SCH.werte?.[SCH.vorlage]?.[k] ?? VORLAGEN[SCH.vorlage].felder.find(([x]) => x === k)?.[2] ?? "";
const PFEILE = { rechts: "➜", links: "⬅", hoch: "⬆", runter: "⬇", "rechts-hoch": "↗", "links-hoch": "↖" };

export function schildHtml(v = SCH.vorlage, w = wert) {
  const vor = VORLAGEN[v];
  const logo = '<img class="sd-logo" src="icons/logo.png" alt="">';
  if (v === "pult") return `<div class="sd-pult">${["zeile1", "zeile2"].map((k) => `<div class="sd-pultkarte"><div class="sd-knick">✂ hier knicken</div><div class="sd-pult-innen">${logo}<b>${esc(w(k))}</b><small>${esc(w("zeile3"))}</small></div></div>`).join("")}</div>`;
  const preise = v === "buffet" ? `<table class="sd-preise">${String(w("preise")).split("\n").map((z) => z.split("=")).filter((x) => x[0]?.trim()).map(([n, p]) => `<tr><td>${esc(n.trim())}</td><td>${esc((p || "").trim())}</td></tr>`).join("")}</table>` : "";
  return `<div class="sd-schild">${logo}${vor.pfeil ? `<div class="sd-pfeil" aria-hidden="true">${PFEILE[SCH.pfeil] || "➜"}</div>` : ""}<div class="sd-zeile1">${esc(w("zeile1"))}</div>${preise}<div class="sd-zeile2">${esc(w("zeile2"))}</div><div class="sd-fuss">Bachkreis Bergkamen · seit 1969</div></div>`;
}
VIEWS.schilder = {
  render() {
    const vor = VORLAGEN[SCH.vorlage];
    return kopf("🪧 Schilder-Druckerei", '<button type="button" class="knopf haupt klein" data-a="sdDrucken">🖨️ Drucken</button>')
      + `<p class="hinweis">Vorlage wählen, Text eintragen, drucken – für Konzerte, Proben und Fahrten.</p>
      <div class="wahlen" role="group" aria-label="Vorlage">${Object.entries(VORLAGEN).map(([k, x]) => `<button type="button" class="chip-wahl${SCH.vorlage === k ? " an" : ""}" aria-pressed="${SCH.vorlage === k}" data-a="sdVorlage" data-x="${k}">${x.t}</button>`).join("")}</div>
      <div class="karte sd-form">${vor.felder.map(([k, t]) => `<div class="feld"><label for="sd_${k}">${esc(t)}</label>${k === "preise" ? `<textarea id="sd_${k}" rows="4" data-sd="${k}">${esc(wert(k))}</textarea>` : `<input id="sd_${k}" maxlength="60" value="${esc(wert(k))}" data-sd="${k}">`}</div>`).join("")}
        ${vor.pfeil ? `<div class="feld"><span class="feld-titel">Pfeil</span><div class="wahlen" role="group" aria-label="Pfeilrichtung">${Object.entries(PFEILE).map(([k, s]) => `<button type="button" class="chip-wahl${SCH.pfeil === k ? " an" : ""}" aria-pressed="${SCH.pfeil === k}" aria-label="Pfeil ${k}" data-a="sdPfeil" data-x="${k}">${s}</button>`).join("")}</div></div>` : ""}
        <div class="feld"><span class="feld-titel">Format</span><div class="wahlen" role="group" aria-label="Format">${Object.entries(FORMATE).map(([k, t]) => `<button type="button" class="chip-wahl${SCH.format === k ? " an" : ""}" aria-pressed="${SCH.format === k}" data-a="sdFormat" data-x="${k}">${t}</button>`).join("")}</div></div>
        <div class="feld"><span class="feld-titel">Design</span><div class="wahlen" role="group" aria-label="Design">${[["gold", "🖤 Schwarz-Gold"], ["hell", "🤍 Hell (spart Tinte)"]].map(([k, t]) => `<button type="button" class="chip-wahl${SCH.stil === k ? " an" : ""}" aria-pressed="${SCH.stil === k}" data-a="sdStil" data-x="${k}">${t}</button>`).join("")}</div></div></div>
      <h3>👁️ Vorschau</h3><div class="sd-vorschau sd-${SCH.format} sd-${SCH.stil}" id="sdBlatt">${schildHtml()}${SCH.format === "a5" && SCH.vorlage !== "pult" ? schildHtml() : ""}</div>
      ${istVerwalter() ? '<p class="hinweis">Tipp: Wegweiser und Türschilder in Klarsichthüllen – dann halten sie auch draußen.</p>' : ""}`;
  },
  nach(w) {
    for (const f of w.querySelectorAll("[data-sd]")) f.addEventListener("input", () => {
      ((SCH.werte ||= {})[SCH.vorlage] ||= {})[f.dataset.sd] = f.value; merke();
      const b = document.getElementById("sdBlatt"); if (b) b.innerHTML = schildHtml() + (SCH.format === "a5" && SCH.vorlage !== "pult" ? schildHtml() : "");
    });
  },
};
AKTIONEN.sdVorlage = (k) => { SCH.vorlage = k; if (k === "pult") SCH.format = "quer"; merke(); zeichne(); };
AKTIONEN.sdFormat = (k) => { SCH.format = k; merke(); zeichne(); };
AKTIONEN.sdStil = (k) => { SCH.stil = k; merke(); zeichne(); };
AKTIONEN.sdPfeil = (k) => { SCH.pfeil = k; merke(); zeichne(); };
AKTIONEN.sdDrucken = () => {
  const st = document.createElement("style"); st.id = "sdSeite"; st.textContent = `@page { size: A4 ${SCH.format === "quer" ? "landscape" : "portrait"}; margin: 8mm; }`;
  document.getElementById("sdSeite")?.remove(); document.head.appendChild(st);
  document.body.classList.add("sd-druck"); setTimeout(() => { print(); document.body.classList.remove("sd-druck"); toast("🖨️ Tipp: Im Druckfenster „Hintergrundgrafiken“ einschalten"); }, 60);
};
