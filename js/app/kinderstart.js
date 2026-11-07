// 🧒 Kinder-Ansicht (0.32.0, Konzept docs/KONZEPT-ANSICHTEN.md 2): klar, groß, feste Reihenfolge – nächste Probe mit Zusage,
// meine Übe-Aufgaben, wichtige Zettel, 8 Kacheln. Kein Register, keine Verwaltung. Ab Klasse 9 (Konfiguration ansicht_kind_ab_klasse)
// darf man unten „🔧 Mehr anzeigen“ wählen. Rechte ändern sich nicht – alles andere bleibt über Suche/Links erreichbar.
import { S, VIEWS, db, kopf, einst, einstSetzen, zeige, istSchueler } from "./zustand.js";
import { esc, AKTIONEN, datum, uhr, toast } from "../kern/ui.js";
import { liste, hole, konfig } from "../kern/daten.js";
import { termineFuer, antwortVon, teilnahmeVon, aufgabeGiltFuer, uebeStand, tagIso } from "../kern/logik.js";
import { pwWichtigFuerMich } from "./pinnwand.js";
import { kindFortschritt } from "./quiz.js";

export const KIND_AB_KLASSE_STANDARD = 9;
export const kindGross = (p = S.ich) => Number(p?.jahrgang) >= (Number(konfig().ansicht_kind_ab_klasse) || KIND_AB_KLASSE_STANDARD);
// Kinder-Ansicht für alle Schülerinnen und Schüler; Ältere können auf „Mehr“ umschalten
export const kindAnsicht = () => istSchueler() && !(kindGross() && einst().kindMehr === true);

export const KIND_KACHELN = [
  ["meinetermine", "📅", "Termine", "termine", { filter: "meine" }],
  ["kindueben", "🎻", "Üben", "buehne", { modus: "ueben" }],
  ["meinenoten", "🎼", "Noten", "meinenoten"],
  ["quiz", "🧠", "Quiz", "quiz"],
  ["instrumentenkunde", "🎺", "Instrumente", "instrumentenkunde"],
  ["orchester", "🎭", "Orchester", "orchester"],
  ["nachrichten", "💬", "Nachrichten", "nachrichten"],
  ["ich", "🙂", "Ich", null],
];
const naechsterTermin = (pid) => termineFuer(db, pid).find((t) => t.status !== "abgesagt" && new Date(t.ende || t.beginn) >= new Date());
function wannText(t) {
  const tage = Math.round((new Date(t.beginn).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return `${tage === 0 ? "Heute" : tage === 1 ? "Morgen" : datum(t.beginn)}, ${uhr(t.beginn)} Uhr`;
}
function terminKarte(pid) {
  const t = naechsterTermin(pid);
  if (!t) return `<div class="karte kind-karte"><h3>📅 Nächste Probe</h3><p>Gerade steht nichts an. 🎶</p></div>`;
  const a = antwortVon(db, t.id, pid), info = teilnahmeVon(db, t) === "info", pr = t.projekt_id ? hole("projekte", t.projekt_id) : null;
  const mit = ["🎻 Instrument", "🎼 Noten", "✏️ Bleistift"].concat(pr?.kleiderordnung ? [`👔 ${pr.kleiderordnung}`] : []);
  const knopf = (w, txt) => `<button type="button" class="knopf${a?.antwort === w ? " haupt" : ""}" data-a="antworten" data-x="${esc(t.id)}|${esc(pid)}|${w}" aria-pressed="${a?.antwort === w}">${txt}</button>`;
  return `<div class="karte kind-karte"><h3>📅 Nächster Termin</h3>
    <button type="button" class="kind-termin" data-a="oeffne" data-x="termin|${esc(t.id)}"><b>${esc(t.titel)}</b><span>${esc(wannText(t))}${t.ort ? ` · 📍 ${esc(t.ort)}` : ""}</span></button>
    <p class="kind-mit">🎒 Mitbringen: ${mit.map(esc).join(" · ")}</p>
    ${info ? "" : `<div class="kind-antwort">${knopf("ja", "✅ Ich komme")}${knopf("nein", "❌ Kann nicht")}</div>${a ? `<p class="hinweis">Deine Antwort: ${{ ja: "✅ Ich komme", nein: "❌ Kann nicht", vielleicht: "🤔 Weiß noch nicht" }[a.antwort] || ""} – du kannst sie ändern.</p>` : ""}`}</div>`;
}
function uebeKarte(pid) {
  const heute = tagIso(new Date());
  const auf = liste("uebeaufgaben", (x) => aufgabeGiltFuer(db, x, pid) && (!x.bis || x.bis >= heute)).sort((x, y) => String(x.bis || "9").localeCompare(String(y.bis || "9"))).slice(0, 4);
  const f = kindFortschritt(pid);
  const kopf = `<h3>🎯 Meine Übe-Aufgaben <span class="kind-sterne">⭐ ${f.sterne || 0}${f.serie ? ` · 🔥 ${f.serie}` : ""}</span></h3>`;
  if (!auf.length) return `<div class="karte kind-karte">${kopf}<p>Gerade keine Aufgabe – üb, was dir Spaß macht! 🎻</p><button type="button" class="knopf haupt breit" data-a="kindUeben">🎻 Jetzt üben</button></div>`;
  return `<div class="karte kind-karte">${kopf}<ul class="kind-aufgaben">${auf.map((x) => { const st = uebeStand(db, x).find((s) => s.pid === pid) || {};
    return `<li class="${st.ziel ? "fertig" : ""}"><span>${st.ziel ? "✅" : "▸"}</span><b>${esc(x.titel)}</b><small>${st.ziel ? "geschafft!" : st.anzahl ? `${st.anzahl}× geübt` : "noch offen"}${x.bis ? ` · bis ${esc(x.bis.split("-").reverse().slice(0, 2).join("."))}.` : ""}</small></li>`; }).join("")}</ul>
    <button type="button" class="knopf haupt breit" data-a="kindUeben">🎻 Jetzt üben</button></div>`;
}
function zettelKarte() {
  const l = pwWichtigFuerMich().slice(0, 2); if (!l.length) return "";
  return `<div class="karte kind-karte kind-zettel"><h3>📌 Wichtig</h3>${l.map((z) => `<p>${esc(z.text)}</p>`).join("")}<button type="button" class="knopf klein" data-a="kachel" data-x="pinnwand">📌 Ansehen und abhaken</button></div>`;
}
export function kinderStartHtml() {
  const pid = S.ich.id;
  return `<section id="v-start" class="ansicht-kind"><div id="kopfPlatz"></div><div id="updateHinweis"></div>
    ${terminKarte(pid)}${uebeKarte(pid)}${zettelKarte()}
    <div class="raster kind-raster" id="raster">${KIND_KACHELN.map(([id, sym, t]) => `<button type="button" class="kachel kind-kachel" data-a="kindKachel" data-x="${id}" data-id="${id}"><div class="sym" aria-hidden="true">${sym}</div><b>${esc(t)}</b></button>`).join("")}</div>
    ${kindGross() ? `<button type="button" class="knopf breit ansicht-knopf" data-a="kindMehr" data-x="1">🔧 Mehr anzeigen (alle Bereiche)</button>` : ""}
    <button type="button" class="knopf breit kind-sos" data-a="kachel" data-x="sos">🆘 SOS – Notfall</button></section>`;
}
AKTIONEN.kindKachel = (id) => {
  const k = KIND_KACHELN.find((x) => x[0] === id); if (!k) return;
  if (id === "ich") return zeige("kindich");
  zeige(k[3], k[4] || {});
};
AKTIONEN.kindUeben = () => zeige("buehne", { modus: "ueben" });
AKTIONEN.kindMehr = (x) => { einstSetzen("kindMehr", !!x); zeige("start", {}, { ersetzen: true }); toast(x ? "🔧 Alle Bereiche – zurück geht's unten mit „🧒 Einfache Kinder-Ansicht“" : "🧒 Kinder-Ansicht"); };
// 🙂 „Ich“: Mein Gesicht, Leihinstrument, Schrift, Farben, SOS – alles Persönliche an einem Ort
VIEWS.kindich = {
  render() {
    const f = kindFortschritt();
    const z = (a, x, sym, t, u) => `<button type="button" class="ifz" data-a="${a}" data-x="${x}"><span>${sym}</span><span class="ifzt"><b>${t}</b><br><small>${u}</small></span><span>›</span></button>`;
    return kopf(`🙂 ${esc(S.ich.vorname || "Ich")}`) + `<div class="karte quiz-stand"><div><b>⭐ ${f.sterne || 0}</b><small>Sterne</small></div><div><b>🔥 ${f.serie}</b><small>Übe-Serie</small></div><div><b>🏅 ${f.abzeichen.length}</b><small>Abzeichen</small></div></div>
      <div class="ifzliste kind-ich">${z("meinGesicht", "", "🙂", "Mein Gesicht", "Frisur, Brille, Farben fürs Orchester")}${z("kachel", "meininstrument", "🎻", "Mein Leihinstrument", "Rückgabe · Schaden melden")}
      ${z("kachel", "quiz", "🏅", "Meine Abzeichen", "Sterne und Abzeichen ansehen")}${z("kachel", "ueben", "📒", "Übe-Tagebuch", "Was ich geübt habe")}
      ${z("kachel", "einstellungen", "⚙️", "Einstellungen", "Schrift, Farben, Töne")}${z("kachel", "sos", "🆘", "SOS – Notfall", "Notruf und wichtige Nummern")}</div>`;
  },
};
