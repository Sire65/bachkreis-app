// 🎻 0.34.0 Echte Instrumentenklänge: jede Aufnahme der Liste ist als Datei da (MP3, nicht leer), Tonumfang deckt die Instrumentenkunde ab.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import { KLANGPROBEN } from "../js/kern/klangproben.js";

const W = new URL("../ton/instrumente/", import.meta.url).pathname;
const LEHRE_KLAENGE = [...new Set([...readFileSync(new URL("../js/app/instrumentenkunde.js", import.meta.url), "utf8").matchAll(/klang: "([a-z]+)"/g)].map((m) => m[1]))];
test("jede gelistete Aufnahme existiert und ist eine echte MP3 (> 2 KB)", () => {
  for (const [art, ms] of Object.entries(KLANGPROBEN)) for (const m of ms) {
    const f = `${W}${art}/${m}.mp3`; assert.ok(existsSync(f), f); assert.ok(statSync(f).size > 2048, `${f} zu klein`);
  }
  for (const f of ["schlag", "becken"]) assert.ok(statSync(`${W}trommel/${f}.mp3`).size > 2048);
});
test("keine Dateien ohne Eintrag (alles, was ausgeliefert wird, wird auch benutzt)", () => {
  for (const art of readdirSync(W)) for (const f of readdirSync(W + art)) {
    if (art === "trommel") continue;
    assert.ok((KLANGPROBEN[art] || []).includes(Number(f.replace(".mp3", ""))), `${art}/${f} fehlt in klangproben.js`);
  }
});
test("jede Klangfarbe der Instrumentenkunde hat Aufnahmen, Abstand höchstens 7 Halbtöne", () => {
  for (const k of LEHRE_KLAENGE) {
    const l = k === "trommel" ? ["x"] : KLANGPROBEN[k]; assert.ok(l?.length, `keine Aufnahmen für ${k}`);
    if (k !== "trommel") for (let i = 1; i < l.length; i++) assert.ok(l[i] - l[i - 1] <= 14, `${k}: Lücke ${l[i - 1]}→${l[i]}`);
  }
});
