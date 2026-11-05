// 🧠 0.32.0 Quiz und 🧒 Kinder-Fortschritt: Fragen gültig, Runde vollständig, Sterne, Übe-Serie, Abzeichen ohne Rangliste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quizRunde, QUIZ_BEREICHE, QUIZ_RUNDE, sterneFuer, uebeSerie, ABZEICHEN, noteSvg, NOTEN_SCHWER } from "../js/kern/quiz.js";

let s = 1; const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const LEHRE = [["Violine", "streicher"], ["Cello", "streicher"], ["Querflöte", "holz"], ["Trompete", "blech"], ["Pauke", "schlag"]].map(([name, familie], i) => ({ id: "l" + i, name, familie, sym: "🎻", kurz: `Kurz ${name}`, stimmung: "G – D – A – E", klang: "x" }));
const CHRONIK = [{ jahr: 1969, titel: "Gründung" }, { jahr: 1990, titel: "Reise" }, { jahr: 2019, titel: "Jubiläum 50" }];

test("jede Frage hat genau eine richtige Antwort unter den Optionen – in allen Bereichen, leicht und schwer", () => {
  for (const b of ["mix", ...Object.keys(QUIZ_BEREICHE)]) for (const schwer of [false, true]) for (let n = 0; n < 15; n++) {
    const r = quizRunde({ bereich: b, schwer, rng, lehre: LEHRE, chronik: CHRONIK });
    assert.ok(b === "bachkreis" ? r.length >= 3 : r.length === QUIZ_RUNDE, `${b}: volle Runde (Chronik mit nur 3 Einträgen: 3 Fragen)`);
    for (const f of r) {
      assert.ok(f.richtig >= 0 && f.richtig < f.optionen.length, `${b}: richtige Antwort vorhanden`);
      assert.equal(new Set(f.optionen).size, f.optionen.length, `${b}: keine doppelten Antworten – ${f.frage}`);
      assert.ok(f.optionen.length >= 2 && f.optionen.length <= 4);
    }
  }
});
test("ohne Instrumente/Chronik fallen diese Bereiche im Mix weg", () => {
  const r = quizRunde({ bereich: "mix", rng });
  assert.ok(r.every((f) => !["instrumente", "bachkreis"].includes(f.bereich)));
});
test("Notenbild für jede Stufe, Hilfslinien unter/über dem System", () => {
  for (const [, st] of NOTEN_SCHWER) assert.match(noteSvg(st), /<ellipse/);
  assert.equal((noteSvg(-2).match(/x1="86"/g) || []).length, 1, "c1 hat eine Hilfslinie");
  assert.equal((noteSvg(10).match(/x1="86"/g) || []).length, 1, "a2 hat eine Hilfslinie");
});
test("Sterne, Übe-Serie, Abzeichen", () => {
  assert.deepEqual([5, 4, 3, 2].map((n) => sterneFuer(n)), [3, 2, 1, 0]);
  assert.equal(uebeSerie(["2026-11-03", "2026-11-04", "2026-11-05"], "2026-11-05"), 3);
  assert.equal(uebeSerie(["2026-11-03", "2026-11-04"], "2026-11-05"), 2, "gestern zählt noch");
  assert.equal(uebeSerie(["2026-11-01"], "2026-11-05"), 0);
  const hat = (st) => ABZEICHEN.filter((a) => a.pruef(st)).map((a) => a.id);
  assert.deepEqual(hat({ gut: { noten: 3 }, sterne: 30, serie: 3, zusagen: 10 }).sort(), ["noten", "proben10", "serie3", "sterne25"]);
  assert.deepEqual(hat({}), []);
});
