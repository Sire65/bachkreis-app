// 🧠 Quiz-Fragen (0.32.0, Konzept docs/KONZEPT-ANSICHTEN.md 2.2): reine Logik ohne Oberfläche – läuft im Browser und in den Tests.
// Jede Frage: { bereich, frage, optionen[], richtig (Index), noteSvg?, klang?, ton?, erklaerung }. Zufall über rng (0…1) – testbar.
// Alles kommt aus der App selbst (Instrumentenkunde, Chronik) – kein fremder Dienst, kostenlos.

export const QUIZ_BEREICHE = {
  instrumente: { sym: "🎺", t: "Instrumente" },
  noten: { sym: "🎼", t: "Noten lesen" },
  rhythmus: { sym: "🥁", t: "Rhythmus" },
  hoeren: { sym: "👂", t: "Hören" },
  woerter: { sym: "📖", t: "Musik-Wörter" },
  bachkreis: { sym: "🎻", t: "Unser Bachkreis" },
};
export const QUIZ_RUNDE = 5;
const FAMILIEN = { streicher: "Streicher", holz: "Holzbläser", blech: "Blechbläser", schlag: "Schlagwerk", tasten: "Tasteninstrumente" };

const mischen = (l, rng) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const zieh = (l, rng) => l[Math.floor(rng() * l.length)];
// Frage mit richtiger Antwort + falschen (ohne Doppelte), gemischt
function frage(bereich, text, richtigText, falsche, rng, extra = {}) {
  const opt = mischen([richtigText, ...mischen([...new Set(falsche.filter((f) => f !== richtigText))], rng).slice(0, 3)], rng);
  return { bereich, frage: text, optionen: opt, richtig: opt.indexOf(richtigText), ...extra };
}

// ---------- 🎼 Noten lesen: eine Note im Violinschlüssel ----------
// Stufen ab e1 (unterste Linie) = 0 … f2 (oberste Linie) = 8; dazu c1/d1 (Hilfslinie) und g2/a2
export const NOTEN_LEICHT = [["c", -2], ["d", -1], ["e", 0], ["f", 1], ["g", 2], ["a", 3], ["h", 4], ["c", 5]];
export const NOTEN_SCHWER = [...NOTEN_LEICHT, ["d", 6], ["e", 7], ["f", 8], ["g", 9], ["a", 10]];
export function noteSvg(stufe) {
  const y0 = 70, d = 6, y = y0 - stufe * d; // Abstand Linie–Zwischenraum = 6
  const linien = [0, 2, 4, 6, 8].map((s) => `<line x1="8" x2="152" y1="${y0 - s * d}" y2="${y0 - s * d}" stroke="currentColor" stroke-width="1.2"/>`).join("");
  const hilf = []; for (let s = -2; s >= stufe; s -= 2) hilf.push(s); for (let s = 10; s <= stufe; s += 2) hilf.push(s);
  return `<svg viewBox="0 0 160 100" class="quiz-note" role="img" aria-label="Note im Violinschlüssel">${linien}<text x="10" y="${y0 + 8}" font-size="58" fill="currentColor">𝄞</text>
    ${hilf.map((s) => `<line x1="86" x2="114" y1="${y0 - s * d}" y2="${y0 - s * d}" stroke="currentColor" stroke-width="1.2"/>`).join("")}
    <ellipse cx="100" cy="${y}" rx="7.5" ry="5.5" transform="rotate(-20 100 ${y})" fill="currentColor"/><line x1="${stufe >= 4 ? 93 : 107}" x2="${stufe >= 4 ? 93 : 107}" y1="${y}" y2="${stufe >= 4 ? y + 34 : y - 34}" stroke="currentColor" stroke-width="1.6"/></svg>`;
}
function notenFrage(rng, schwer) {
  const [name, stufe] = zieh(schwer ? NOTEN_SCHWER : NOTEN_LEICHT, rng);
  const alle = ["c", "d", "e", "f", "g", "a", "h"];
  return frage("noten", "Wie heißt diese Note?", name, alle, rng, { noteSvg: noteSvg(stufe), erklaerung: `Das ist ein ${name}. Tipp: Die unterste Linie ist das e, die zweite Linie das g.` });
}

// ---------- 🥁 Rhythmus ----------
const WERTE = [["𝅝", "ganze Note", "4"], ["𝅗𝅥", "halbe Note", "2"], ["♩", "Viertelnote", "1"], ["♪", "Achtelnote", "½"]];
function rhythmusFrage(rng, schwer) {
  const art = Math.floor(rng() * (schwer ? 3 : 2));
  if (art === 0) { const [s, n, w] = zieh(WERTE, rng); return frage("rhythmus", `Wie viele Schläge dauert eine ${n} (${s}) im 4/4-Takt?`, w, WERTE.map((x) => x[2]), rng, { erklaerung: `Eine ${n} dauert ${w} Schlag${w === "1" ? "" : "e"}.` }); }
  if (art === 1) { const [s, n] = zieh(WERTE, rng); return frage("rhythmus", `Wie heißt dieses Zeichen: ${s}`, n, WERTE.map((x) => x[1]), rng, { zeichen: s, erklaerung: `${s} ist eine ${n}.` }); }
  const z = zieh([["2 Viertel", "1 Halbe"], ["2 Achtel", "1 Viertel"], ["4 Viertel", "1 Ganze"], ["2 Halbe", "1 Ganze"]], rng);
  return frage("rhythmus", `Wie viel ist ${z[0]} zusammen?`, z[1], ["1 Halbe", "1 Viertel", "1 Ganze", "1 Achtel"], rng, { erklaerung: `${z[0]} = ${z[1]}.` });
}

// ---------- 👂 Hören: höher/tiefer, Dur/Moll ----------
function hoerFrage(rng, schwer) {
  if (!schwer || rng() < 0.5) {
    const a = 60 + Math.floor(rng() * 12), schritt = (schwer ? 1 : 3) + Math.floor(rng() * 4), hoeher = rng() < 0.5, b = hoeher ? a + schritt : a - schritt;
    return { bereich: "hoeren", frage: "Ist der zweite Ton höher oder tiefer?", optionen: ["⬆️ höher", "⬇️ tiefer"], richtig: hoeher ? 0 : 1, ton: [[a, 1], [b, 1.2]], erklaerung: hoeher ? "Der zweite Ton war höher." : "Der zweite Ton war tiefer." };
  }
  const g = 55 + Math.floor(rng() * 10), dur = rng() < 0.5;
  return { bereich: "hoeren", frage: "Klingt der Akkord fröhlich (Dur) oder traurig (Moll)?", optionen: ["😊 Dur", "😢 Moll"], richtig: dur ? 0 : 1,
    ton: [[g, 0.5], [g + (dur ? 4 : 3), 0.5], [g + 7, 0.5], [[g, g + (dur ? 4 : 3), g + 7], 1.6]], erklaerung: dur ? "Dur – große Terz unten." : "Moll – kleine Terz unten." };
}

// ---------- 📖 Musik-Wörter ----------
export const WOERTER = [["p", "leise (piano)"], ["f", "laut (forte)"], ["pp", "sehr leise"], ["ff", "sehr laut"], ["mf", "mittellaut"], ["crescendo", "lauter werden"], ["decrescendo", "leiser werden"],
  ["Allegro", "schnell, fröhlich"], ["Adagio", "langsam"], ["Andante", "gehend, ruhig"], ["Presto", "sehr schnell"], ["Fermate 𝄐", "Ton länger aushalten"], ["pizzicato", "Saite zupfen"],
  ["arco", "mit dem Bogen streichen"], ["Wiederholungszeichen 𝄇", "noch einmal spielen"], ["Tutti", "alle spielen"], ["Solo", "einer spielt allein"], ["Dirigent", "leitet das Orchester"], ["Partitur", "alle Stimmen zusammen"], ["Takt", "Abschnitt mit gleich vielen Schlägen"]];
function wortFrage(rng) { const [w, b] = zieh(WOERTER, rng); return frage("woerter", `Was bedeutet „${w}“?`, b, WOERTER.map((x) => x[1]), rng, { erklaerung: `„${w}“ bedeutet: ${b}.` }); }

// ---------- 🎺 Instrumente (aus der Instrumentenkunde) ----------
function instrumentFrage(rng, lehre, schwer) {
  const l = zieh(lehre, rng), art = Math.floor(rng() * (schwer ? 4 : 3));
  if (art === 0) return frage("instrumente", "Zu welcher Familie gehört dieses Instrument?", FAMILIEN[l.familie], Object.values(FAMILIEN), rng, { bild: l.sym, name: l.name, erklaerung: `${l.name}: ${FAMILIEN[l.familie]}.` });
  if (art === 1 && l.klang) return frage("instrumente", "Welches Instrument hörst du?", l.name, lehre.filter((x) => x.familie !== l.familie || rng() < 0.3).map((x) => x.name), rng, { klang: l.id, erklaerung: `Das war ${l.name}.` });
  if (art === 3 && l.stimmung) return frage("instrumente", `Welches Instrument ist so gestimmt: ${l.stimmung}?`, l.name, lehre.map((x) => x.name), rng, { erklaerung: `${l.name}: ${l.stimmung}.` });
  return frage("instrumente", `Welches Instrument ist das? „${l.kurz}“`, l.name, lehre.filter((x) => x.id !== l.id).map((x) => x.name), rng, { erklaerung: l.wussten || l.kurz });
}

// ---------- 🎻 Unser Bachkreis (aus der Chronik) ----------
function bachkreisFrage(rng, chronik) {
  const l = chronik.filter((c) => c.jahr && c.titel); if (l.length < 2) return null;
  const c = zieh(l, rng), jahre = [...new Set(l.map((x) => String(x.jahr)))];
  const falsche = [...jahre, String(c.jahr - 3), String(c.jahr + 4), String(c.jahr - 10)];
  return frage("bachkreis", `In welchem Jahr: „${c.titel}“?`, String(c.jahr), falsche, rng, { erklaerung: `${c.jahr}: ${c.titel}${c.ort ? ` (${c.ort})` : ""}.` });
}

// Eine Runde mit QUIZ_RUNDE Fragen; bereich = Schlüssel oder "mix"
export function quizRunde({ bereich = "mix", schwer = false, rng = Math.random, lehre = [], chronik = [] } = {}) {
  const bereiche = bereich === "mix" ? Object.keys(QUIZ_BEREICHE).filter((b) => b !== "bachkreis" || chronik.length >= 2).filter((b) => b !== "instrumente" || lehre.length >= 4) : [bereich];
  const runde = [], gesehen = new Set();
  for (let v = 0; runde.length < QUIZ_RUNDE && v < 60; v++) {
    const b = bereiche[Math.floor(rng() * bereiche.length)];
    const f = b === "noten" ? notenFrage(rng, schwer) : b === "rhythmus" ? rhythmusFrage(rng, schwer) : b === "hoeren" ? hoerFrage(rng, schwer) : b === "woerter" ? wortFrage(rng)
      : b === "instrumente" ? (lehre.length >= 4 ? instrumentFrage(rng, lehre, schwer) : null) : bachkreisFrage(rng, chronik);
    if (!f || f.richtig < 0 || f.optionen.length < 2) continue;
    const k = f.frage + "|" + f.optionen[f.richtig] + "|" + (f.noteSvg || "") + JSON.stringify(f.ton || "");
    if (gesehen.has(k)) continue; gesehen.add(k); runde.push(f);
  }
  return runde;
}

// ---------- ⭐ Sterne, 🔥 Serie, 🏅 Abzeichen (nur eigener Fortschritt – keine Ranglisten) ----------
export const sterneFuer = (richtig, von = QUIZ_RUNDE) => (richtig >= von ? 3 : richtig >= von - 1 ? 2 : richtig >= Math.ceil(von / 2) ? 1 : 0);
export const ABZEICHEN = [
  { id: "noten", sym: "🎼", t: "Noten-Leser", x: "3 Noten-Runden mit mindestens 4 richtig", pruef: (s) => (s.gut?.noten || 0) >= 3 },
  { id: "rhythmus", sym: "🥁", t: "Rhythmus-Ass", x: "3 Rhythmus-Runden mit mindestens 4 richtig", pruef: (s) => (s.gut?.rhythmus || 0) >= 3 },
  { id: "instrumente", sym: "🎺", t: "Instrumenten-Kenner", x: "3 Instrumenten-Runden mit mindestens 4 richtig", pruef: (s) => (s.gut?.instrumente || 0) >= 3 },
  { id: "ohr", sym: "👂", t: "Gutes Ohr", x: "3 Hör-Runden mit mindestens 4 richtig", pruef: (s) => (s.gut?.hoeren || 0) >= 3 },
  { id: "woerter", sym: "📖", t: "Musik-Profi", x: "3 Wörter-Runden mit mindestens 4 richtig", pruef: (s) => (s.gut?.woerter || 0) >= 3 },
  { id: "sterne25", sym: "⭐", t: "Sternensammler", x: "25 Sterne gesammelt", pruef: (s) => (s.sterne || 0) >= 25 },
  { id: "serie3", sym: "🔥", t: "Dranbleiber", x: "3 Tage hintereinander geübt", pruef: (s) => (s.serie || 0) >= 3 },
  { id: "proben10", sym: "🎻", t: "Immer dabei", x: "10 Proben zugesagt", pruef: (s) => (s.zusagen || 0) >= 10 },
];
// Übe-Serie: wie viele Tage hintereinander (bis heute oder gestern) wurde geübt? tage = Liste „YYYY-MM-DD“
export function uebeSerie(tage, heute) {
  const s = new Set(tage), tag = (d) => d.toISOString().slice(0, 10), d = new Date(heute + "T12:00:00Z");
  if (!s.has(tag(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0; while (s.has(tag(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
