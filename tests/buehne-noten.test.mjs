// 🎼 0.79.3 Bühne: Schalter „Orchester | Noten“ – Noten des laufenden Stücks mit mitlaufendem Zeiger
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STUECKE } from "../js/kern/musik.js";
import { stimmeErzeugen, notenSvg, zeigerX, taktUndPos } from "../js/kern/notensatz.js";

test("jedes Melodie-Stück hat Noten mit einem Feld je Takt und einem Zeiger", () => {
  for (const s of STUECKE) {
    for (const stimme of ["Violine", "Partitur"]) {
      const svg = notenSvg(stimmeErzeugen(s.id, stimme), { zeiger: true });
      const takte = [...svg.matchAll(/class="nb-takt" data-takt="(\d+)" data-xs="([^"]+)"/g)];
      assert.ok(takte.length >= 4, `${s.id} ${stimme}: Takte`);
      assert.deepEqual(takte.map((m) => Number(m[1])), takte.map((_, i) => i), "Takte lückenlos von 0 an");
      assert.match(svg, /class="nb-zeiger"/);
      for (const [, , xs] of takte) { const l = xs.split(" ").map((p) => p.split(":").map(Number)); assert.equal(l.at(-1)[0], s.takt, "letzter Eintrag = Taktende"); assert.ok(l.every((p, i) => !i || p[1] >= l[i - 1][1]), "x steigt"); }
    }
    assert.doesNotMatch(notenSvg(stimmeErzeugen(s.id, "Violine")), /nb-takt/, "ohne zeiger: unverändert (Notenarchiv, Übe-Bühne)");
  }
});
test("Zeiger: Takt und Stelle aus den gespielten Schlägen, Strich zwischen den Noten", () => {
  assert.deepEqual(taktUndPos(7.5, 3), { takt: 2, pos: 1.5 });
  const xs = [[0, 100], [1, 140], [2, 180], [3, 220]];
  assert.equal(zeigerX(xs, 0), 100); assert.equal(zeigerX(xs, 1.5), 160); assert.equal(zeigerX(xs, 3), 220); assert.equal(zeigerX(xs, 9), 220);
});
test("Wiedergabe meldet Start und Tempo; Bühne hat den Schalter, Bach ehrlich ohne mitlaufende Noten", () => {
  assert.match(fs.readFileSync("js/kern/musik.js", "utf8"), /dauer: ende - t0, t0, sb/);
  const b = fs.readFileSync("js/app/buehne.js", "utf8");
  assert.match(b, /data-a="bwAnsicht"/); assert.match(b, /\["orchester", "🎻 Orchester"\], \["noten", "🎼 Noten"\]/);
  assert.match(b, /keine mitlaufenden Noten/); assert.match(b, /zeigerStarten\(\);/); assert.match(b, /function buehneZeigen/);
});
test("0.79.4 Schalter auch auf der Bühne hinter dem Startbild und bei Aufnahmen – direkt unter der Bühne", () => {
  const b = fs.readFileSync("js/app/buehne.js", "utf8");
  assert.match(b, /const ansicht = !\["melodien", "bach", "aufnahmen"\]\.includes\(B\.modus\) \? "" :/, "nicht mehr nur ohne „kompakt“");
  assert.match(b, /\$\{ansicht\}\$\{umschalter\(\)\}/, "unter der Bühne, über den Reitern");
});
