// 🗺️ Alles auf einen Blick (0.45.0, wie KC „Club-App auf einen Blick“ / „Erste Schritte“): jeder Bereich der App, nach Registern geordnet,
// nur was die eigene Rolle sieht – auch ausgeblendete Kacheln (mit Hinweis). Dazu 🙋 Einstieg (wie KC-CLUB-EINSTIEG): einmal fragen, wie viel Hilfe
// jemand möchte – „Viel Hilfe“ zeigt Tipps und diese Übersicht, „Ein bisschen“ = Standard, „Ich komme klar“ schaltet die Tipps aus. Änderbar in ⚙️ › Ansagen & Tipps.
import { S, VIEWS, zeige, zeichne, kopf, einst, einstSetzen, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { klappe, klappenAlleKnopf } from "../kern/klappen.js";
import { REGISTER_ALLE, kachelnAlle } from "./start.js";

const U = { q: "" };
const wert = (x) => (typeof x === "function" ? x() : x);
VIEWS.ueberblick = {
  render() {
    const q = U.q.trim().toLowerCase(), aus = new Set(einst().kachelnAus || []);
    const regs = REGISTER_ALLE.filter(([r]) => r !== "admin" || hatRolle("admin"));
    const teile = regs.map(([r, n], i) => {
      const l = kachelnAlle(r).filter((k) => !q || `${wert(k.t)} ${wert(k.u) || ""}`.toLowerCase().includes(q));
      if (!l.length) return "";
      const inhalt = `<div class="ub-raster">${l.map((k) => `<button type="button" class="ub-kachel${aus.has(k.id) ? " aus" : ""}" data-a="kachel" data-x="${esc(k.id)}"><span class="ub-sym" aria-hidden="true">${k.sym}</span><span class="ub-text"><b>${esc(wert(k.t))}</b><small>${esc(wert(k.u) || "")}${aus.has(k.id) ? " · auf der Startseite ausgeblendet" : ""}</small></span></button>`).join("")}</div>`;
      return klappe(`ub_${r}`, `${{ bachkreis: "🎼", meins: "🙋", technik: "🛠️", admin: "🛡️" }[r] || "📁"} ${esc(n)}`, inhalt, { offen: i === 0 || !!q, zahl: l.length, ohneUnten: l.length < 8 });
    }).join("");
    return kopf("🗺️ Alles auf einen Blick") + `<p class="hinweis">Jeder Bereich der App – so, wie er auf der Startseite in den Registern steht. Antippen öffnet ihn.</p>
      <input class="einst-suche" type="search" id="ubSuche" placeholder="🔍 Bereich suchen …" value="${esc(U.q)}" aria-label="Bereich suchen">${klappenAlleKnopf("inhalt")}
      ${teile || '<div class="leer">Nichts gefunden.</div>'}
      <div class="knopfreihe"><button type="button" class="knopf" data-a="kachel" data-x="hilfe">❓ Hilfe & Tipps</button><button type="button" class="knopf" data-a="kachel" data-x="einstellungen">⚙️ Einstellungen</button><button type="button" class="knopf" data-a="einstiegFragen">🙋 Wie viel Hilfe?</button></div>`;
  },
  nach(w) { w.querySelector("#ubSuche")?.addEventListener("input", (e) => { U.q = e.target.value; const pos = e.target.selectionStart; zeichne(); const f = document.getElementById("ubSuche"); f?.focus(); try { f?.setSelectionRange(pos, pos); } catch {} }); },
};

// ---------- 🙋 Einstieg: wie viel Hilfe? ----------
export const HILFE_STUFEN = [["viel", "🙋 Viel Hilfe, bitte", "Jeden Tag ein Tipp, die Übersicht „Alles auf einen Blick“ und nach jedem Update, was neu ist"],
  ["etwas", "👌 Ein bisschen Hilfe", "Ab und zu ein Tipp und nach Updates kurz, was neu ist"], ["keine", "😎 Danke, ich komme klar", "Keine Tipps – Hilfe gibt es jederzeit über ❓"]];
export function einstiegFragen() {
  blatt("👋 Willkommen in der Bachkreis-App!", `<p>Wie viel Hilfe möchtest du am Anfang? Du kannst das später unter ⚙️ › Ansagen & Tipps ändern.</p>
    <div class="knopfspalte ub-hilfe">${HILFE_STUFEN.map(([k, t, u]) => `<button type="button" class="knopf${(einst().hilfeStufe || "etwas") === k ? " haupt" : ""}" data-a="hilfeStufe" data-x="${k}"><b>${t}</b><small>${esc(u)}</small></button>`).join("")}</div>`);
}
AKTIONEN.einstiegFragen = einstiegFragen;
export function hilfeStufeSetzen(k, still = false) {
  einstSetzen("hilfeStufe", k);
  einstSetzen("tippDesTages", k !== "keine");
  einstSetzen("wasNeu", k !== "keine");
  if (!still) toast(k === "viel" ? "🙋 Gern! Hier siehst du alles auf einen Blick." : k === "keine" ? "😎 Alles klar – Hilfe gibt es jederzeit über ❓" : "👌 Prima – ab und zu ein Tipp");
}
AKTIONEN.hilfeStufe = (k) => { const ausFenster = !!document.getElementById("blattHg"); hilfeStufeSetzen(k); blattZu(); if (ausFenster && k === "viel") zeige("ueberblick"); else if (S.view === "einstellungen") zeige("einstellungen", {}, { ersetzen: true }); };
// beim Start: einmal fragen (ab dem 2. Öffnen, damit der erste Start ruhig bleibt) – liefert true, wenn gefragt wurde
export function einstiegPruefen(start) {
  if (einst().hilfeStufe || start < 2) return false;
  setTimeout(einstiegFragen, 1800); return true;
}
