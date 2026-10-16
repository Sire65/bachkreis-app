// Fußleiste wie in der KC Club App (nav.fuss-leiste): immer unten sichtbar – Start, Termine, Nachrichten (mit Zähler),
// Orchester bzw. „Meine Kinder“ (Eltern) und Mehr (Einstellungen). 🏠 Start führt immer zur Startseite zurück
// (aus dem Admin-Register und von der Bühne auf das erste Register / die Vorderseite – wie KC-CLUB-START-HEIM).
import { S, zeige, istEltern } from "./zustand.js";
import { AKTIONEN, esc } from "../kern/ui.js";
import { ungelesen } from "./start.js";
import { kopfVorne } from "./buehne.js";
import { onlineZahl } from "./online.js";

const KNOEPFE = () => [
  ["start", "🏠", "Start"],
  ["termine", "📅", "Termine"],
  ["nachrichten", "💬", "Nachrichten"],
  istEltern() ? ["kinder", "👪", "Kinder"] : ["orchester", "👥", "Orchester"],
  ["einstellungen", "⚙️", "Mehr"],
];
// Unterseiten gehören zum passenden Knopf
const ZU = { chat: "nachrichten", unterhaltung: "nachrichten", rundschreiben: "nachrichten", termin: "termine", terminneu: "termine", kalender: "termine" };

export function fussZeichnen() {
  let f = document.getElementById("fuss");
  if (!S.ich) { f?.remove(); document.body.classList.remove("mit-fuss"); return; }
  if (!f) { f = document.createElement("nav"); f.className = "fuss-leiste"; f.id = "fuss"; f.setAttribute("aria-label", "Hauptnavigation"); document.body.appendChild(f); }
  document.body.classList.add("mit-fuss");
  const aktiv = ZU[S.view] || S.view, n = (() => { try { return ungelesen(); } catch { return 0; } })(), on = onlineZahl(); // 🟢 kleine grüne Zahl: so viele gerade online
  f.innerHTML = KNOEPFE().map(([v, sym, t]) => `<button type="button" data-a="fuss" data-x="${v}" class="${v === aktiv ? "an" : ""}" ${v === aktiv ? 'aria-current="page"' : ""}><span>${sym}</span>${esc(t)}${v === "nachrichten" && n ? `<i class="zaehler">${n > 99 ? "99+" : n}</i>` : ""}${["orchester", "kinder"].includes(v) && on ? `<i class="on-zahl" title="${on} gerade online">${on}</i>` : ""}</button>`).join("");
}
AKTIONEN.fuss = (v) => {
  if (v === "start") {
    const schonStart = S.view === "start";
    S.verlauf = [];
    if (!schonStart || S.register === "admin") { S.register = schonStart ? "bachkreis" : S.register === "admin" ? "bachkreis" : S.register; zeige("start", {}, { ersetzen: true }); }
    else if (S.register !== "bachkreis") { document.querySelector('#register button[data-x="bachkreis"]')?.click(); }
    // Bühne hinter dem Eselsohr: zurück auf die Vorderseite
    kopfVorne();
    try { scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    return;
  }
  zeige(v);
};
document.addEventListener("bk-ansicht", () => setTimeout(fussZeichnen, 0));
document.addEventListener("bk-online", () => fussZeichnen());
