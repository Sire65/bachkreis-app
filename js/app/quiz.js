// 🧠 Quiz (0.32.0, Konzept docs/KONZEPT-ANSICHTEN.md 2.2): kurze Runden mit 5 Fragen – Instrumente, Noten lesen, Rhythmus, Hören,
// Musik-Wörter, Unser Bachkreis. ⭐ Sterne und 🏅 Abzeichen gehören dem Kind (nur auf diesem Gerät) – keine Ranglisten.
import { S, VIEWS, zeichne, kopf } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste } from "../kern/daten.js";
import { tagIso } from "../kern/logik.js";
import { QUIZ_BEREICHE, quizRunde, sterneFuer, ABZEICHEN, uebeSerie } from "../kern/quiz.js";
import { LEHRE, lehreKlang } from "./instrumentenkunde.js";

const Q = { bereich: null, schwer: null, runde: [], i: 0, richtig: 0, antwort: null, neueAbz: [] };
const schluessel = () => "bk_quiz_" + (S.ich?.id || "x");
export function quizStand() { try { return JSON.parse(localStorage.getItem(schluessel()) || "{}"); } catch { return {}; } }
const merken = (s) => { try { localStorage.setItem(schluessel(), JSON.stringify(s)); } catch {} };
// Übe-Serie und Proben-Zusagen kommen aus den Daten, die ohnehin da sind
export function kindFortschritt(pid = S.ich?.id) {
  const s = quizStand(), heute = tagIso(new Date());
  const tage = [...liste("uebungen", (u) => u.person_id === pid).map((u) => u.datum), ...liste("uebe_ergebnisse", (e) => e.person_id === pid).map((e) => e.datum)];
  const zusagen = liste("antworten", (a) => a.person_id === pid && a.antwort === "ja").length;
  const voll = { ...s, serie: uebeSerie(tage, heute), zusagen };
  return { ...voll, abzeichen: ABZEICHEN.filter((a) => a.pruef(voll)).map((a) => a.id) };
}
const standardSchwer = () => Number(S.ich?.jahrgang) >= 7;

VIEWS.quiz = {
  render() {
    if (Q.runde.length && Q.i < Q.runde.length) return frageHtml();
    if (Q.runde.length) return endeHtml();
    const f = kindFortschritt(), schwer = Q.schwer ?? standardSchwer();
    const bereich = (k, sym, t) => `<button type="button" class="quiz-bereich" data-a="quizStart" data-x="${k}"><span aria-hidden="true">${sym}</span><b>${esc(t)}</b></button>`;
    return kopf("🧠 Quiz") + `<div class="karte quiz-stand"><div><b>⭐ ${f.sterne || 0}</b><small>Sterne</small></div><div><b>🔥 ${f.serie}</b><small>Tage Übe-Serie</small></div><div><b>🏅 ${f.abzeichen.length}</b><small>Abzeichen</small></div></div>
      <div class="wahlen">${[[false, "🙂 Leicht"], [true, "💪 Schwer"]].map(([w, t]) => `<button type="button" class="chip-wahl${schwer === w ? " an" : ""}" data-a="quizSchwer" data-x="${w ? 1 : ""}" aria-pressed="${schwer === w}">${t}</button>`).join("")}</div>
      <div class="quiz-bereiche">${bereich("mix", "🎲", "Bunt gemischt")}${Object.entries(QUIZ_BEREICHE).map(([k, b]) => bereich(k, b.sym, b.t)).join("")}</div>
      <h3>🏅 Meine Abzeichen</h3><div class="abzeichen">${ABZEICHEN.map((a) => { const hat = f.abzeichen.includes(a.id); return `<div class="abz${hat ? " hat" : ""}" title="${esc(a.x)}"><span aria-hidden="true">${a.sym}</span><b>${esc(a.t)}</b><small>${hat ? "geschafft!" : esc(a.x)}</small></div>`; }).join("")}</div>
      <p class="hinweis">Deine Sterne und Abzeichen gehören dir – es gibt keine Rangliste.</p>`;
  },
};
function frageHtml() {
  const f = Q.runde[Q.i], b = QUIZ_BEREICHE[f.bereich], beantw = Q.antwort !== null;
  return kopf(`🧠 Frage ${Q.i + 1} von ${Q.runde.length}`) + `<div class="quiz-fortschritt" aria-hidden="true">${Q.runde.map((_, i) => `<i class="${i < Q.i ? "fertig" : i === Q.i ? "jetzt" : ""}"></i>`).join("")}</div>
    <div class="karte quiz-frage"><small>${b.sym} ${esc(b.t)}</small><h2>${esc(f.frage)}</h2>
      ${f.noteSvg || ""}${f.zeichen ? `<div class="quiz-zeichen" aria-hidden="true">${f.zeichen}</div>` : ""}${f.bild ? `<div class="quiz-zeichen" aria-hidden="true">${f.bild}</div><p class="hinweis">${esc(f.name || "")}</p>` : ""}
      ${f.ton || f.klang ? `<button type="button" class="knopf haupt" data-a="quizHoeren">🔊 Anhören</button>` : ""}
      <div class="quiz-optionen">${f.optionen.map((o, i) => `<button type="button" class="quiz-opt${beantw ? (i === f.richtig ? " richtig" : i === Q.antwort ? " falsch" : "") : ""}" data-a="quizAntwort" data-x="${i}" ${beantw ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      ${beantw ? `<p class="quiz-erkl" role="status">${Q.antwort === f.richtig ? "✅ Richtig!" : "❌ Nicht ganz."} ${esc(f.erklaerung || "")}</p><button type="button" class="knopf haupt breit" data-a="quizWeiter">${Q.i + 1 < Q.runde.length ? "Weiter ›" : "Fertig 🎉"}</button>` : ""}</div>`;
}
function endeHtml() {
  const st = sterneFuer(Q.richtig, Q.runde.length);
  return kopf("🧠 Geschafft!") + `<div class="karte quiz-ende"><div class="quiz-sterne" aria-label="${st} von 3 Sternen">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</div>
    <h2>${Q.richtig} von ${Q.runde.length} richtig</h2><p>${st === 3 ? "Super – alles richtig! 🎉" : st === 2 ? "Klasse gemacht! 👏" : st === 1 ? "Gut! Mit Üben wird's noch besser. 💪" : "Probier's gleich nochmal – du schaffst das! 🙂"}</p>
    ${Q.neueAbz.length ? `<div class="abzeichen">${Q.neueAbz.map((a) => `<div class="abz hat neu"><span aria-hidden="true">${a.sym}</span><b>Neues Abzeichen: ${esc(a.t)}</b></div>`).join("")}</div>` : ""}
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="quizStart" data-x="${esc(Q.bereich)}">🔁 Nochmal</button><button type="button" class="knopf" data-a="quizZurueck">🧠 Anderes Quiz</button></div></div>`;
}
let AUD = null;
function toeneSpielen(folge) {
  try {
    AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); AUD.resume?.(); let t = AUD.currentTime + 0.05;
    for (const [m, d] of folge) { for (const n of Array.isArray(m) ? m : [m]) { const o = AUD.createOscillator(), g = AUD.createGain(); o.type = "triangle"; o.frequency.value = 440 * 2 ** ((n - 69) / 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.6); o.connect(g).connect(AUD.destination); o.start(t); o.stop(t + d * 0.6 + 0.05); }
      t += d * 0.6; }
  } catch { toast("🔇 Dieses Gerät kann hier keinen Ton abspielen."); }
}
AKTIONEN.quizSchwer = (x) => { Q.schwer = !!x; zeichne(); };
AKTIONEN.quizStart = (bereich) => {
  Q.bereich = bereich || "mix";
  Q.runde = quizRunde({ bereich: Q.bereich, schwer: Q.schwer ?? standardSchwer(), lehre: LEHRE, chronik: liste("chronik") });
  Q.i = 0; Q.richtig = 0; Q.antwort = null; Q.neueAbz = [];
  if (!Q.runde.length) { toast("Für dieses Quiz gibt es gerade keine Fragen."); Q.runde = []; }
  zeichne(); scrollTo(0, 0);
  const f = Q.runde[0]; if (f?.ton) setTimeout(() => toeneSpielen(f.ton), 400);
};
AKTIONEN.quizHoeren = () => { const f = Q.runde[Q.i]; if (f?.ton) toeneSpielen(f.ton); else if (f?.klang) lehreKlang(f.klang); };
AKTIONEN.quizAntwort = (x) => {
  if (Q.antwort !== null) return; Q.antwort = Number(x);
  if (Q.antwort === Q.runde[Q.i].richtig) { Q.richtig++; try { navigator.vibrate?.(30); } catch {} }
  zeichne();
};
AKTIONEN.quizWeiter = () => {
  Q.i++; Q.antwort = null;
  if (Q.i >= Q.runde.length) { // Runde fertig: Sterne und „gute Runden“ je Bereich merken, neue Abzeichen zeigen
    const vorher = new Set(kindFortschritt().abzeichen), s = quizStand(), st = sterneFuer(Q.richtig, Q.runde.length);
    s.sterne = (s.sterne || 0) + st; s.runden = (s.runden || 0) + 1; s.gut = s.gut || {};
    if (Q.richtig >= Q.runde.length - 1) for (const b of new Set(Q.runde.map((f) => f.bereich))) if (Q.bereich !== "mix" || Q.runde.filter((f) => f.bereich === b).length >= 2) s.gut[b] = (s.gut[b] || 0) + 1;
    merken(s);
    Q.neueAbz = ABZEICHEN.filter((a) => kindFortschritt().abzeichen.includes(a.id) && !vorher.has(a.id));
  }
  zeichne(); scrollTo(0, 0);
  const f = Q.runde[Q.i]; if (f?.ton) setTimeout(() => toeneSpielen(f.ton), 400);
};
AKTIONEN.quizZurueck = () => { Q.runde = []; Q.i = 0; zeichne(); };
document.addEventListener("bk-ansicht", () => { if (S.view !== "quiz") { Q.runde = []; Q.i = 0; Q.antwort = null; } });
