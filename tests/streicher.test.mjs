// 🎻 0.79.0 Bogenstriche: Wechsel Ab/Auf, Länge nach Tondauer, Arm behält seine Länge, Bogen gleitet entlang seiner Achse
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STRICH, strichNeu, bogenStand, handBei, ellbogen, armD, bogenTransform } from "../js/kern/streicher.js";

test("jeder Ton ein Strich – Richtung wechselt, kurze Töne wenig Bogen, lange den ganzen", () => {
  const a = strichNeu(null, 900, 0); assert.equal(a.nach, 1);
  const b = strichNeu(a, 300, 1000); assert.ok(b.nach < 0 && b.nach > -0.5, "kurzer Ton: wenig Bogen, andere Richtung");
  assert.equal(strichNeu(b, 300, 1050), b, "läuft der Strich noch, kein Zittern");
  assert.equal(bogenStand(a, 0), 0); assert.equal(bogenStand(a, 900), 1); assert.ok(bogenStand(a, 450) > 0.4 && bogenStand(a, 450) < 0.6);
});
test("Arm: Ober- und Unterarm behalten ihre Länge, Schulter bleibt fest", () => {
  for (const [art, d] of Object.entries(STRICH)) for (const p of [-1, -0.5, 0, 0.5, 1]) {
    const h = handBei(d, p), e = ellbogen(d, h);
    assert.ok(Math.abs(Math.hypot(e[0] - d.schulter[0], e[1] - d.schulter[1]) - d.oa) < 0.01, `${art} Oberarm`);
    assert.ok(Math.hypot(h[0] - e[0], h[1] - e[1]) <= d.ua + 0.3, `${art} Unterarm ${p}`);
    assert.match(armD(d, h), /^M5\.6 -16\.6 L/);
  }
});
test("Bogen gleitet entlang seiner Achse (Kontakt zu den Saiten bleibt), in der Pause abgesenkt", () => {
  const d = STRICH.geige, [ax, ay] = d.achse, h = handBei(d, 1), dx = h[0] - d.hand[0], dy = h[1] - d.hand[1];
  assert.ok(Math.abs(dx * ay - dy * ax) < 1e-9, "Verschiebung parallel zur Bogenachse");
  assert.match(bogenTransform(d, 0, 1), /rotate\(14\.00/);
});
test("Bühne nutzt die Striche; Musiker wiegen versetzt und nicken im Takt", () => {
  const b = fs.readFileSync("js/app/buehne.js", "utf8"), css = fs.readFileSync("css/buehne.css", "utf8");
  assert.match(b, /strichStarten\(el, dauer \* 1000\)/); assert.match(b, /--schlag/); assert.match(b, /--v:/);
  assert.match(css, /var\(--schlag/); assert.match(css, /bwVibrato/); assert.match(css, /bwSchalltrichter/);
  assert.match(fs.readFileSync("sw.js", "utf8"), /js\/kern\/streicher\.js/);
});
test("Solist auf der Übe-Bühne: Textersatz passt zur Klasse der Figur (sonst fehlt der eigene Avatar)", () => {
  const b = fs.readFileSync("js/app/buehne.js", "utf8"), klasse = 'class="mus sek-${sek} inst-${inst}"';
  assert.ok(b.includes(`<g ${klasse}`), "Figur-Klasse"); assert.ok(b.includes(`.replace(\`${klasse}\``), "Solist-Ersatz nutzt dieselbe Klasse");
});
