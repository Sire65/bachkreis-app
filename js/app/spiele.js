// 🎲 Musik-Spiele (0.47.0, wie KC „Spiele – Club Edition“, hier für Musiker): 🧠 Quiz (gibt es schon), 🃏 Instrumenten-Memory,
// 🎵 Noten-Raten (Violin- und Bassschlüssel, deutsche Namen mit H) – Rekorde nur auf diesem Gerät, nichts geht an den Server.
import { VIEWS, zeige, zeichne, kopf } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";

const lies = () => { try { return JSON.parse(localStorage.getItem("bk_spiele") || "{}"); } catch { return {}; } };
const merke = (k, v) => { const r = lies(); r[k] = v; try { localStorage.setItem("bk_spiele", JSON.stringify(r)); } catch {} };
let ac = null;
export function ton(midi, dauer = 0.35, art = "triangle") {
  try { ac ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = art; o.frequency.value = 440 * 2 ** ((midi - 69) / 12); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dauer + 0.05); } catch {}
}

// ---------- Übersicht ----------
VIEWS.spiele = {
  render() {
    const r = lies();
    const k = (a, sym, t, u, rek) => `<button type="button" class="sp-kachel" data-a="${a}"><span aria-hidden="true">${sym}</span><b>${t}</b><small>${u}</small>${rek ? `<em>🏆 ${esc(rek)}</em>` : ""}</button>`;
    return kopf("🎲 Musik-Spiele") + `<div class="sp-raster">${k("spQuiz", "🧠", "Musik-Quiz", "Fragen rund um Musik & Bachkreis", "")}
      ${k("spMemory", "🃏", "Instrumenten-Memory", "Finde die Paare", r.memory ? `${r.memory} Züge` : "")}
      ${k("spNoten", "🎵", "Noten-Raten", "Wie heißt die Note?", r.noten ? `${r.noten} / 10` : "")}</div>
      <p class="hinweis">Rekorde bleiben auf diesem Gerät. Mehr zum Hören und Mitspielen: 🎻 Übe-Bühne (Ohr-Spiele, Rhythmus, Stimmgerät).</p>`;
  },
};
AKTIONEN.spQuiz = () => zeige("quiz");
AKTIONEN.spMemory = () => { memoryNeu(); zeige("memory"); };
AKTIONEN.spNoten = () => { notenNeu(); zeige("notenraten"); };

// ---------- 🃏 Instrumenten-Memory ----------
const PAARE = [["🎻", "Geige", 67], ["🎺", "Trompete", 70], ["🎷", "Saxofon", 62], ["🥁", "Trommel", 45], ["🪈", "Flöte", 79], ["🎹", "Klavier", 60], ["🎸", "Gitarre", 52], ["🪗", "Akkordeon", 57]];
const M = { karten: [], offen: [], gefunden: new Set(), zuege: 0, sperre: false };
function memoryNeu() {
  M.karten = [...PAARE, ...PAARE].map((p, i) => ({ i, p })).sort(() => Math.random() - 0.5); M.offen = []; M.gefunden = new Set(); M.zuege = 0; M.sperre = false;
}
VIEWS.memory = {
  render() {
    if (!M.karten.length) memoryNeu();
    const fertig = M.gefunden.size === PAARE.length, rek = lies().memory;
    return kopf("🃏 Instrumenten-Memory", '<button type="button" class="knopf klein" data-a="spMemoryNeu">↺ Neu</button>')
      + `<p class="hinweis" aria-live="polite">${fertig ? `🎉 Geschafft in ${M.zuege} Zügen!${rek === M.zuege ? " 🏆 Neuer Rekord!" : rek ? ` Rekord: ${rek}` : ""}` : `Züge: ${M.zuege} · gefunden: ${M.gefunden.size} von ${PAARE.length}`}</p>
      <div class="mem-raster">${M.karten.map((k, n) => { const auf = M.offen.includes(n) || M.gefunden.has(k.p[1]);
        return `<button type="button" class="mem-karte${auf ? " auf" : ""}${M.gefunden.has(k.p[1]) ? " weg" : ""}" data-a="memKarte" data-x="${n}" aria-label="${auf ? esc(k.p[1]) : "verdeckte Karte"}" ${M.gefunden.has(k.p[1]) ? "disabled" : ""}><span class="mem-vorn" aria-hidden="true">${k.p[0]}<small>${esc(k.p[1])}</small></span><span class="mem-hinten" aria-hidden="true">🎼</span></button>`; }).join("")}</div>`;
  },
};
AKTIONEN.spMemoryNeu = () => { memoryNeu(); zeichne(); };
AKTIONEN.memKarte = (n) => {
  n = Number(n); if (M.sperre || M.offen.includes(n)) return;
  M.offen.push(n); ton(M.karten[n].p[2], 0.25);
  if (M.offen.length === 2) {
    M.zuege++; const [a, b] = M.offen.map((x) => M.karten[x].p[1]);
    if (a === b) { M.gefunden.add(a); M.offen = []; setTimeout(() => { ton(M.karten[n].p[2] + 7, 0.3); }, 200);
      if (M.gefunden.size === PAARE.length) { const r = lies().memory; if (!r || M.zuege < r) merke("memory", M.zuege); } }
    else { M.sperre = true; setTimeout(() => { M.offen = []; M.sperre = false; zeichne(); }, 900); }
  }
  zeichne();
};

// ---------- 🎵 Noten-Raten ----------
const NAMEN = ["C", "D", "E", "F", "G", "A", "H"];
const DUR = [0, 2, 4, 5, 7, 9, 11];
export const SCHLUESSEL = { violin: { t: "🎼 Violinschlüssel", start: 0, oktave: 4 }, bass: { t: "𝄢 Bassschlüssel", start: 2, oktave: 2 } }; // Stufe 0 = C4 bzw. E2, untere Linie = Stufe 2
export function noteVon(schl, stufe) {
  const c = SCHLUESSEL[schl], idx = c.start + stufe, n = idx % 7, okt = c.oktave + Math.floor(idx / 7);
  return { name: NAMEN[n], midi: 12 * (okt + 1) + DUR[n] };
}
const N = { schl: "violin", stufe: 4, runde: 0, punkte: 0, antwort: null };
function notenNeu(schl = N.schl) { N.schl = schl; N.runde = 0; N.punkte = 0; neueNote(); }
function neueNote() { let s; do s = Math.floor(Math.random() * 13); while (s === N.stufe); N.stufe = s; N.antwort = null; }
export function notenSvg(schl, stufe) {
  const L = 10, unten = 90, y = (s) => unten - (s - 2) * (L / 2), linien = [0, 1, 2, 3, 4].map((i) => unten - i * L);
  const hilf = []; if (stufe <= 0) hilf.push(y(0)); if (stufe >= 12) hilf.push(y(12));
  return `<svg class="nr-system" viewBox="0 0 200 120" role="img" aria-label="Note im ${SCHLUESSEL[schl].t}">${linien.map((ly) => `<line x1="10" x2="190" y1="${ly}" y2="${ly}"/>`).join("")}
    <text x="14" y="${schl === "violin" ? 96 : 76}" class="nr-schl">${schl === "violin" ? "𝄞" : "𝄢"}</text>${hilf.map((hy) => `<line x1="100" x2="136" y1="${hy}" y2="${hy}"/>`).join("")}
    <ellipse cx="118" cy="${y(stufe)}" rx="7" ry="5.2" transform="rotate(-20 118 ${y(stufe)})" class="nr-kopf"/><line x1="${stufe >= 6 ? 111.5 : 124.5}" x2="${stufe >= 6 ? 111.5 : 124.5}" y1="${y(stufe)}" y2="${stufe >= 6 ? y(stufe) + 32 : y(stufe) - 32}" class="nr-hals"/></svg>`;
}
VIEWS.notenraten = {
  render() {
    const fertig = N.runde >= 10, n = noteVon(N.schl, N.stufe), rek = lies().noten;
    return kopf("🎵 Noten-Raten") + `<div class="umschalter" role="group" aria-label="Schlüssel">${Object.entries(SCHLUESSEL).map(([k, v]) => `<button type="button" class="${N.schl === k ? "an" : ""}" aria-pressed="${N.schl === k}" data-a="nrSchl" data-x="${k}">${v.t}</button>`).join("")}</div>
      ${fertig ? `<div class="karte nr-ende"><h3>🎉 ${N.punkte} von 10 richtig!</h3><p>${N.punkte === 10 ? "Perfekt – du kannst Noten lesen wie ein Profi!" : N.punkte >= 7 ? "Super gemacht!" : "Übung macht den Meister – gleich nochmal?"}${rek ? ` 🏆 Rekord: ${rek} / 10` : ""}</p><button type="button" class="knopf haupt breit" data-a="nrNeu">↺ Nochmal</button></div>`
        : `<p class="hinweis" aria-live="polite">Runde ${N.runde + 1} von 10 · ${N.punkte} richtig${N.antwort ? ` · ${N.antwort === n.name ? "✅ Richtig!" : `❌ Das war ein ${n.name}`}` : ""}</p>
      <div class="nr-blatt">${notenSvg(N.schl, N.stufe)}<button type="button" class="knopf klein" data-a="nrHoeren" aria-label="Note anhören">🔊</button></div>
      <div class="nr-tasten" role="group" aria-label="Wie heißt die Note?">${NAMEN.map((x) => `<button type="button" class="nr-taste${N.antwort && x === n.name ? " richtig" : N.antwort === x ? " falsch" : ""}" data-a="nrRaten" data-x="${x}" ${N.antwort ? "disabled" : ""}>${x}</button>`).join("")}</div>
      ${N.antwort ? '<button type="button" class="knopf haupt breit" data-a="nrWeiter">Weiter ›</button>' : ""}`}
      <p class="hinweis">Tipp: Im Deutschen heißt die Note zwischen A und C „H“.</p>`;
  },
};
AKTIONEN.nrSchl = (k) => { notenNeu(k); zeichne(); };
AKTIONEN.nrNeu = () => { notenNeu(); zeichne(); };
AKTIONEN.nrHoeren = () => ton(noteVon(N.schl, N.stufe).midi, 0.8);
AKTIONEN.nrRaten = (x) => {
  if (N.antwort) return; const n = noteVon(N.schl, N.stufe); N.antwort = x;
  if (x === n.name) { N.punkte++; ton(n.midi, 0.5); } else toast(`❌ Das war ein ${n.name}`, 1500);
  zeichne();
};
AKTIONEN.nrWeiter = () => {
  N.runde++; if (N.runde >= 10) { const r = lies().noten || 0; if (N.punkte > r) merke("noten", N.punkte); } else neueNote();
  zeichne();
};
