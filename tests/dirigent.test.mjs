// 🪄 0.72.0 Dirigent wie echt: Schlagfiguren je Takt, jeder Schlag auf seinem Schlagpunkt, Ellenbogen nie über dem Kopf, Tempo aus Aufnahmen
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCHLAGFIGUR, handPosition, armPfad, tempoSchaetzen } from "../js/kern/dirigat.js";

test("🪄 Schlagfiguren: 2er ab–auf, 3er ab–außen–auf, 4er ab–innen–außen–auf; jeder Schlag trifft genau seinen Schlagpunkt", () => {
  for (const [t, f] of Object.entries(SCHLAGFIGUR)) {
    assert.equal(f.length, Number(t));
    for (let s = 0; s < f.length; s++) {
      assert.deepEqual(handPosition(Number(t), s, 0).map((v) => +v.toFixed(3)), f[s], `Takt ${t}, Schlag ${s + 1} beginnt am Schlagpunkt`);
      assert.deepEqual(handPosition(Number(t), s, 1).map((v) => +v.toFixed(3)), f[(s + 1) % f.length], "… und endet am nächsten");
      assert.ok(handPosition(Number(t), s, 0.5)[1] < Math.max(f[s][1], f[(s + 1) % f.length][1]), "dazwischen federt die Hand nach oben");
    }
    assert.ok(f[0][1] === Math.max(...f.map((p) => p[1])), "die Eins ist der tiefste Schlag");
  }
  const v = SCHLAGFIGUR[4]; assert.ok(v[1][0] < v[0][0] && v[2][0] > v[0][0] && v[3][1] < v[0][1], "4er: innen, außen, oben");
});

test("💪 Arme mit Ellenbogen: Ellenbogen nie über dem Kopf, Arm erreicht die Hand", () => {
  for (const t of [2, 3, 4]) for (let s = 0; s < t; s++) for (const u of [0, 0.25, 0.5, 0.75]) for (const seite of [1, -1]) {
    const [x, y] = handPosition(t, s, u), h = [seite * x, y], d = armPfad(seite, h).match(/-?[\d.]+/g).map(Number);
    assert.ok(d[3] > -27, `Ellenbogen unter dem Kopf (${d[3]})`);
    assert.ok(Math.abs(d[4] - h[0]) < 0.01 && Math.abs(d[5] - h[1]) < 0.01, "Hand am Ende des Arms");
  }
});

test("🎧 Tempo aus der Aufnahme: regelmäßige Einsätze → Schlagdauer erkannt", () => {
  for (const ms of [450, 500, 640, 800]) {
    const f = new Float32Array(600), n = 600; for (let i = 0; i < n; i++) f[i] = i % (ms / 10) === 0 ? 1 : Math.random() * 0.05;
    const g = tempoSchaetzen(f, n - 1);
    assert.ok(Math.abs(g - ms) <= 20, `${ms} ms erkannt als ${g}`);
  }
  const b = readFileSync(new URL("../js/app/buehne.js", import.meta.url), "utf8");
  assert.match(b, /takt\(s, st\.takt, 60000 \/ \(st\.tempo \* B\.tempo\)\)/, "Melodien: Schlagdauer genau aus dem Tempo");
  assert.match(b, /takt: 2 \}/, "Badinerie im 2er-Takt");
});

test("👉 0.73.0 Einsätze: Richtung je Gruppe, Hand zeigt hin, Körper dreht sich, Geste kommt und geht", async () => {
  const { einsatzRichtung, einsatzStaerke, mitEinsatz } = await import("../js/kern/dirigat.js");
  const v1 = einsatzRichtung("v1"), vc = einsatzRichtung("vc"), hr = einsatzRichtung("hr");
  assert.ok(v1.r < -0.4 && v1.hoch === 0, "1. Violinen: links vorne"); assert.ok(vc.r > 0.4, "Celli: rechts"); assert.ok(hr.hoch > 0.9, "Hörner: ganz hinten");
  assert.equal(einsatzRichtung("xyz"), null);
  assert.equal(einsatzStaerke(0), 0); assert.equal(einsatzStaerke(0.5), 1); assert.equal(einsatzStaerke(1), 0);
  const ruhe = { r: [10, -15], l: [-10, -15] };
  const a = mitEinsatz(ruhe.r, ruhe.l, v1, 1); assert.ok(a.l[0] < -12 && a.dreh < 0 && a.kopf < 0, "links: Hand, Körper und Kopf nach links");
  const b = mitEinsatz(ruhe.r, ruhe.l, vc, 1); assert.ok(b.dreh > 0 && b.r[0] > ruhe.r[0], "rechts: Schlagfigur und Körper nach rechts");
  const c = mitEinsatz(ruhe.r, ruhe.l, hr, 1); assert.ok(c.l[1] < -24, "hinten: Hand höher");
  assert.deepEqual(mitEinsatz(ruhe.r, ruhe.l, v1, 0), { ...ruhe, dreh: 0, kopf: 0 }, "ohne Einsatz: normale Schlagfigur");
  const src = readFileSync(new URL("../js/app/buehne.js", import.meta.url), "utf8");
  assert.match(src, /einsatzPruefen\(sek\)/, "jede einsetzende Gruppe wird geprüft (Melodien und Aufnahmen)");
});
