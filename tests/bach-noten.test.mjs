// 🎼 0.79.5 Freie Noten zu den Bach-Aufnahmen: Dateien vorhanden (PDF), Quelle und Lizenz genannt, veröffentlicht; eigene Noten über BWV
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BACH_NOTEN, bwvPasst } from "../js/kern/bachnoten.js";
const src = fs.readFileSync("js/app/buehne.js", "utf8"), BACH_AUFNAHMEN = [...src.matchAll(/\{ id: "(\w+)", bwv: "(\d+)"/g)].map((m) => ({ id: m[1], bwv: m[2] }));

test("jede freie Notendatei existiert, ist ein PDF und steht mit Lizenz in QUELLEN.md", () => {
  const q = fs.readFileSync("noten/bach/QUELLEN.md", "utf8");
  for (const [id, n] of Object.entries(BACH_NOTEN)) {
    assert.ok(BACH_AUFNAHMEN.some((x) => x.id === id), id);
    assert.match(n.quelle, /Mutopia Project · CC BY-SA \d\.\d/, "Namensnennung + Lizenz in der App");
    for (const [, d] of n.teile) {
      const b = fs.readFileSync("noten/bach/" + d);
      assert.equal(b.subarray(0, 5).toString(), "%PDF-", d); assert.ok(b.length < 600_000, d + " klein genug");
      assert.ok(q.includes(d), `${d} in QUELLEN.md`);
    }
  }
  assert.match(fs.readFileSync(".github/workflows/pages.yml", "utf8"), /WEB="[^"]*\bnoten\b/, "Ordner wird veröffentlicht (sonst 404 wie bei der Badinerie)");
});
test("eigene Noten aus dem Notenarchiv werden über die BWV-Nummer gefunden – genau", () => {
  assert.ok(bwvPasst("BWV 1068", "1068")); assert.ok(bwvPasst("bwv1068", "1068")); assert.ok(bwvPasst("BWV 1068, Nr. 2", "1068"));
  assert.ok(!bwvPasst("BWV 10680", "1068")); assert.ok(!bwvPasst("BWV 147", "14")); assert.ok(!bwvPasst("", "147"));
  assert.equal(BACH_AUFNAHMEN.length, 5, "jedes Bach-Stück hat seine BWV-Nummer");
});
