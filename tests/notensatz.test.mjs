// 🎼 Demo-Probenoten: jede Stimme passt in den Takt, liegt im Umfang des Instruments und ist richtig transponiert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STUECKE } from "../js/kern/musik.js";
import { stimmeErzeugen, notenSvg, instrumentVon, INSTRUMENTE, buchstabieren, transVz, takteBauen } from "../js/kern/notensatz.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";

const summe = (l) => l.reduce((a, n) => a + n.dauer, 0);

test("Registernamen werden dem richtigen Instrument zugeordnet", () => {
  const erwartet = { "Violine 1": "v1", "Violine 2": "v2", Viola: "va", Violoncello: "vc", Kontrabass: "kb", Flöte: "fl", Oboe: "ob", Klarinette: "kl", Fagott: "fg", Horn: "hr",
    Trompete: "tr", Posaune: "pos", Tuba: "tb", Schlagwerk: "sw", "Harfe / Klavier": "hk", Partitur: "partitur", "Violoncello Solo": "vc" };
  for (const [n, k] of Object.entries(erwartet)) assert.equal(instrumentVon(n), k, n);
});

test("Jede Stimme jedes Stücks: gleiche Länge wie die Melodie, im Umfang des Instruments, ganze Takte", () => {
  for (const s of STUECKE) for (const [key, inst] of Object.entries(INSTRUMENTE)) {
    const st = stimmeErzeugen(s.id, inst.name);
    assert.equal(st.key, key);
    const laenge = summe(st.zeilen[0].noten);
    assert.ok(laenge > 0 && laenge % s.takt === 0, `${s.id}/${key}: ${laenge}`);
    for (const z of st.zeilen) {
      assert.equal(summe(z.noten), laenge, `${s.id}/${key}: Zeilen gleich lang`);
      if (inst.umfang && st.zeilen.length === 1) for (const n of z.noten) if (n.ton != null) assert.ok(n.ton >= inst.umfang[0] && n.ton <= inst.umfang[1], `${s.id}/${key}: ${n.ton} außerhalb`);
      assert.ok(z.noten.some((n) => n.ton != null), `${s.id}/${key}: keine Töne`);
    }
    const svg = notenSvg(st, { takteJeZeile: 3 });
    assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+ [\d.]+"/);
    assert.ok(!/NaN|undefined/.test(svg), `${s.id}/${key}: kaputte Koordinaten`);
  }
});

test("Transponierende Instrumente: Klarinette/Trompete in B einen Ganzton, Horn in F eine Quinte höher notiert", () => {
  assert.equal(transVz(2, 2), 4, "D-Dur → E-Dur");
  assert.equal(transVz(1, 7), 2, "G-Dur → D-Dur");
  assert.equal(transVz(0, 12), 0, "Kontrabass: Oktave ändert die Tonart nicht");
  assert.equal(transVz(-1, 2), 1, "F-Dur → G-Dur");
  const kl = stimmeErzeugen("kanon", "Klarinette"), v = stimmeErzeugen("kanon", "Violine 1");
  assert.equal(kl.zeilen[0].trans, 2);
  assert.deepEqual(kl.zeilen[0].noten.map((n) => n.ton), v.zeilen[0].noten.map((n) => n.ton), "gleiche klingende Melodie");
});

test("Rechtschreibung: Fis in D-Dur ohne Vorzeichen-Wechsel, F in G-Dur als Auflösung, Cis-Moll-Töne als Kreuz", () => {
  assert.deepEqual(buchstabieren(66, 2), { dn: 31, a: 1 }); // Fis4
  assert.deepEqual(buchstabieren(65, 1), { dn: 31, a: 0 }); // F4 (Auflösung)
  assert.deepEqual(buchstabieren(61, 0), { dn: 28, a: 1 }); // Cis4
  assert.deepEqual(buchstabieren(70, -1), { dn: 34, a: -1 }); // B4 (Be)
});

test("Takte: lange Noten werden über den Taktstrich gebunden, leere Takte als Ganztaktpause", () => {
  const t = takteBauen([{ ton: 60, dauer: 3 }, { ton: 62, dauer: 3 }, { ton: null, dauer: 2 }, { ton: null, dauer: 4 }], 4);
  assert.equal(t.length, 3);
  assert.deepEqual(t[0].map((e) => [e.dauer, e.binde]), [[3, false], [1, true]]);
  assert.deepEqual(t[1].map((e) => [e.dauer, e.idx]), [[2, -1], [2, 2]]);
  assert.equal(t[2][0].ganz, true);
});

test("Demodaten: Demo-Probenoten nur für gemeinfreie/eigene Stücke, alle Stimmen lassen sich setzen", () => {
  const d = erzeugeDemodaten(new Date("2026-10-16T10:00:00"));
  const demo = d.stimmen.filter((s) => s.datei.startsWith("demo:"));
  assert.ok(demo.length > 40, `nur ${demo.length}`);
  for (const s of demo) {
    const w = d.werke.find((x) => x.id === s.werk_id);
    assert.notEqual(w.rechte, "lizenziert", w.titel);
    assert.ok(stimmeErzeugen(s.datei.slice(5), s.bezeichnung), s.bezeichnung);
  }
  assert.ok(!d.stimmen.some((s) => s.werk_id === "w-4" && s.datei), "lizenziertes Medley ohne Noten");
});
