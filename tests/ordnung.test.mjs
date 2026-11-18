// 🧹 0.78.0 Aufgeräumte Anordnung: Regeln geladen und offline verfügbar; Kernregeln vorhanden
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css = fs.readFileSync("css/ordnung.css", "utf8");
test("ordnung.css wird zuletzt geladen und ist im Offline-Speicher", () => {
  const html = fs.readFileSync("index.html", "utf8"), links = [...html.matchAll(/href="(css\/[^"?]+)/g)].map((m) => m[1]);
  assert.equal(links.at(-1), "css/ordnung.css");
  assert.match(fs.readFileSync("sw.js", "utf8"), /"css\/ordnung\.css"/);
});
test("Kopf bricht um statt den Titel abzuschneiden; Knöpfe fingergerecht; Hinweise umbrechen", () => {
  assert.match(css, /\.kopf2 \{ flex-wrap: wrap/);
  assert.match(css, /\.knopf \{ min-height: 42px/);
  assert.match(css, /min-height: 36px/);
  assert.match(css, /p\.badge, div\.badge \{ display: block; white-space: normal/);
});
