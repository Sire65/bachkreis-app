// 🎓 Einführung beim ersten Start (0.65.0, Konzept „Wie alle die App bekommen“ – Wunsch Hansi): nach der Zustimmung eine kurze Tour
// je Rolle (Eltern · Kinder · Leitung/alle anderen). Das echte Element wird hell hervorgehoben, ein Satz erklärt es; Schritte, deren
// Element gerade fehlt, werden übersprungen. Zum Schluss: App installieren, Mitteilungen erlauben, „Wie viel Hilfe?“.
// Automatisch nur im Echtbetrieb und nur einmal je Gerät („Später“ fragt beim nächsten Start wieder); jederzeit unter ❓ Hilfe & Tipps.
import { S, einst, einstSetzen, zeige, istEltern, istSchueler, vorname } from "./zustand.js";
import { esc, AKTIONEN } from "../kern/ui.js";
import { istEchtbetrieb } from "../kern/daten.js";
import { kindAnsicht } from "./kinderstart.js";
import { HILFE_STUFEN } from "./ueberblick.js";

export const EINFUEHRUNG_FASSUNG = 1; // erhöhen, wenn sich die Tour wesentlich ändert – dann zeigt sie sich allen noch einmal
const TOUR = {
  eltern: [
    [".eltern-todo", "✅ Bitte erledigen", "Hier steht, was gerade auf Sie wartet – Zusagen, Genehmigungen, Leihverträge. Antippen und erledigen."],
    [".eltern-kinder", "👧 Für welches Kind?", "Mehrere Kinder im Bachkreis? Hier umschalten – oder alle zusammen sehen."],
    ['.eltern-raster [data-id="meinetermine"]', "📅 Termine", "Für Ihr Kind zu- oder absagen – ein Tipp genügt."],
    ['.eltern-raster [data-id="meinstatus"]', "🤒 Krank / Status", "Ihr Kind ist krank? Status setzen – die App fragt, ob sie die Termine bis dahin gleich absagen soll."],
    ['.eltern-raster [data-id="meinegenehmigungen"]', "✍️ Genehmigungen", "Fotos, Fahrten, eigener App-Zugang: hier zustimmen oder ablehnen – jederzeit widerrufbar."],
    ['#fuss [data-x="nachrichten"]', "💬 Nachrichten", "Nachrichten von Leitung und Lehrkräften. Die Zahl zeigt, was neu ist."],
    [".ausweis-knopf", "🪪 Ihr Ausweis", "Ihr persönlicher QR-Code – zum Vorzeigen, z. B. beim Abholen nach der Fahrt."],
  ],
  kinder: [
    ['.kind-raster [data-id="meinetermine"]', "📅 Termine", "Hier siehst du deine Proben und Konzerte. Daumen hoch = ich komme!"],
    ['.kind-raster [data-id="kindueben"]', "🎻 Üben", "Trag ein, wie lange du geübt hast – und hol dir Sterne."],
    ['.kind-raster [data-id="quiz"]', "🧠 Quiz", "Rätsel rund um Instrumente und Noten – zum Mitspielen."],
    [".kind-sos", "🆘 SOS", "Wenn etwas nicht stimmt oder du Hilfe brauchst: hier ist schnell jemand für dich da."],
  ],
  alle: [
    ["#kopfPfeil", "⌃ Der Kopf", "Mit diesem Knopf fährst du den Kopf in Stufen ein – lange drücken klappt ihn ganz auf. Oben rechts: 📶 Verbindung und die Flagge für English."],
    ["#statusChip", "🟢 Mein Status", "Verfügbar, Urlaub, krank – mit „bis“ und Hinweis. Die anderen sehen es am Gesicht."],
    ["#register", "🗂️ Die Register", "Bachkreis = Alltag · Leitung = deine Aufgaben · Entdecken = Spiele & Erinnerungen · Meins · Technik. Wischen wechselt das Register."],
    ['#fuss [data-x="termine"]', "📅 Termine", "Proben und Konzerte – zu- oder absagen mit einem Tipp."],
    ['#fuss [data-x="nachrichten"]', "💬 Nachrichten", "Chats, Gruppen und Rundschreiben. Die Zahl zeigt, was neu ist."],
    [".ausweis-knopf", "🪪 Dein Ausweis", "Dein persönlicher QR-Code – zum Vorzeigen bei Konzert, Fahrt oder Instrumenten-Ausgabe."],
    ['#hilfeKnoepfe [data-x="hilfe"]', "❓ Hilfe", "Unten rechts: 🔍 die ganze App durchsuchen und ❓ Hilfe & Tipps. Dort startest du diese Einführung auch noch einmal."],
  ],
};
const E = { schritte: [], i: 0 };
const sichtbar = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
function rolle() { return kindAnsicht() || (istSchueler() && document.querySelector(".kind-raster")) ? "kinder" : istEltern() && document.querySelector(".eltern-raster") ? "eltern" : "alle"; }

// automatisch beim Start (Echtbetrieb, noch nicht gesehen) – nur, wenn kein anderes Fenster offen ist
export function einfuehrungPruefen() {
  if (!S.ich || !istEchtbetrieb() || (einst().einfuehrung || 0) >= EINFUEHRUNG_FASSUNG) return false;
  if (document.getElementById("zsFenster") || document.getElementById("efFenster") || document.getElementById("blattHg")) return false;
  begruessen(); return true;
}
function fenster(html, art = "mitte") {
  let f = document.getElementById("efFenster");
  if (!f) { f = document.createElement("div"); f.id = "efFenster"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-labelledby", "efTitel"); document.body.appendChild(f); }
  f.className = "ef-fenster ef-" + art; f.innerHTML = html;
  setTimeout(() => f.querySelector(".ef-blase .knopf.haupt")?.focus(), 30);
  return f;
}
function schliessen() { document.getElementById("efFenster")?.remove(); }
function begruessen() {
  fenster(`<div class="ef-dunkel"></div><div class="ef-blase"><h2 id="efTitel">👋 Willkommen, ${esc(vorname(S.ich.id) || S.ich.vorname || "")}!</h2>
    <p>Schön, dass ${istEltern() ? "Sie" : "du"} dabei ${istEltern() ? "sind" : "bist"}. Darf ich ${istEltern() ? "Ihnen" : "dir"} die App in <b>1 Minute</b> zeigen?</p>
    <div class="ef-knoepfe"><button type="button" class="knopf" data-a="efSpaeter">Später</button><button type="button" class="knopf haupt" data-a="efLos">▶ Los geht's</button></div></div>`);
}
AKTIONEN.einfuehrungStarten = () => { if (S.view !== "start") zeige("start"); setTimeout(begruessen, 400); };
AKTIONEN.efSpaeter = () => { schliessen(); }; // nichts merken – beim nächsten Start fragt sie wieder
AKTIONEN.efLos = () => {
  if (S.view !== "start") zeige("start");
  E.schritte = TOUR[rolle()].filter(([sel]) => sichtbar(document.querySelector(sel))); E.i = 0;
  schritt();
};
function schritt() {
  const s = E.schritte[E.i]; if (!s) return ende();
  const [sel, titel, text] = s, el = document.querySelector(sel);
  if (!sichtbar(el)) { E.i++; return schritt(); }
  el.scrollIntoView({ block: "center", behavior: "instant" });
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect(), pad = 6, oben = r.top > window.innerHeight * 0.55;
    const punkte = E.schritte.map((_, i) => `<i class="${i <= E.i ? "an" : ""}"></i>`).join("");
    const f = fenster(`<div class="ef-spot" style="top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px"></div>
      <div class="ef-blase" style="${oben ? `bottom:${window.innerHeight - r.top + 14}px` : `top:${r.bottom + 14}px`}"><h2 id="efTitel">${titel}</h2><p>${text}</p>
      <div class="ef-punkte" aria-label="Schritt ${E.i + 1} von ${E.schritte.length}">${punkte}</div>
      <div class="ef-knoepfe"><button type="button" class="knopf" data-a="efEnde">Überspringen</button><button type="button" class="knopf haupt" data-a="efWeiter">${E.i + 1 < E.schritte.length ? "Weiter ›" : "Fertig ›"}</button></div></div>`, "schritt");
    f.dataset.schritt = String(E.i);
  });
}
AKTIONEN.efWeiter = () => { E.i++; schritt(); };
AKTIONEN.efEnde = () => ende();
function ende() {
  const installiert = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const push = "Notification" in globalThis && Notification.permission === "granted";
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  const st = einst().hilfeStufe || "etwas";
  fenster(`<div class="ef-dunkel"></div><div class="ef-blase"><h2 id="efTitel">✅ Fertig – noch zwei Dinge</h2>
    <ul class="ef-liste">
      <li>${installiert ? "✅ Die App liegt auf dem Startbildschirm." : `📲 <b>Auf den Startbildschirm legen</b> – startet schneller. ${ios ? "Im Safari unten auf <b>Teilen ⬆️</b> tippen, dann „<b>Zum Home-Bildschirm</b>“." : '<button type="button" class="knopf klein" data-a="installieren">📲 Jetzt installieren</button>'}`}</li>
      <li>${push ? "✅ Mitteilungen sind erlaubt." : `🔔 <b>Mitteilungen erlauben</b> – für neue Nachrichten und Absagen. ${ios && !installiert ? "Auf dem iPhone geht das erst, wenn die App auf dem Startbildschirm liegt." : '<button type="button" class="knopf klein" data-a="pushErlauben">🔔 Erlauben</button>'}`}</li>
    </ul>
    <p><b>Wie viel Hilfe möchte${istEltern() ? "n Sie" : "st du"}?</b></p>
    <div class="ef-stufen" role="radiogroup">${HILFE_STUFEN.map(([k, t]) => `<button type="button" role="radio" aria-checked="${k === st}" class="knopf${k === st ? " haupt" : ""}" data-a="efStufe" data-x="${k}">${esc(t)}</button>`).join("")}</div>
    <div class="ef-knoepfe"><button type="button" class="knopf haupt breit" data-a="efFertig">🎻 Loslegen</button></div>
    <p class="hinweis">Diese Einführung gibt es jederzeit wieder unter ❓ Hilfe &amp; Tipps.</p></div>`, "ende");
}
AKTIONEN.efStufe = (k) => { einstSetzen("hilfeStufe", k); document.querySelectorAll('#efFenster [data-a="efStufe"]').forEach((b) => { const an = b.dataset.x === k; b.classList.toggle("haupt", an); b.setAttribute("aria-checked", String(an)); }); };
AKTIONEN.efFertig = () => { if (!einst().hilfeStufe) einstSetzen("hilfeStufe", "etwas"); einstSetzen("einfuehrung", EINFUEHRUNG_FASSUNG); schliessen(); };
addEventListener("resize", () => { if (document.querySelector("#efFenster.ef-schritt")) schritt(); });
