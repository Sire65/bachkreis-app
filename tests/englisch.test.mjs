// 🌐 0.56.0 English: Wörterbuch übersetzt Bedienelemente mit Symbolen davor/dahinter, lässt Unbekanntes und Inhalte in Ruhe
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EN, uebersetzeText } from "../js/kern/englisch.js";

test("🌐 Kacheln, Knöpfe und Fußleiste werden übersetzt – Symbole bleiben, Unbekanntes bleibt", () => {
  assert.equal(uebersetzeText("Termine"), "Events");
  assert.equal(uebersetzeText("🖨️ Drucken / PDF"), "🖨️ Print / PDF");
  assert.equal(uebersetzeText("  Weiter ›"), "  Next ›");
  assert.equal(uebersetzeText("💬 Nachricht schreiben"), "💬 Write a message");
  assert.equal(uebersetzeText("Herbstkonzert in der Aula"), "Herbstkonzert in der Aula", "Inhalte bleiben");
  assert.equal(uebersetzeText(""), "");
});
test("🌐 Alle Kachel-Titel haben eine Übersetzung; kein Ziel ist wieder ein deutscher Schlüssel (keine Schleife)", () => {
  const titel = [...readFileSync(new URL("../js/app/start.js", import.meta.url), "utf8").matchAll(/\bt: "([^"]+)"/g)].map((m) => m[1]).filter((t) => /\p{L}/u.test(t));
  const fehlt = titel.filter((t) => !EN[t]); assert.deepEqual(fehlt, []);
  for (const [de, en] of Object.entries(EN)) if (en !== de && EN[en] && EN[en] !== en) assert.fail(`${de} → ${en} → ${EN[en]}`);
  const z = readFileSync(new URL("../js/app/zustand.js", import.meta.url), "utf8");
  assert.ok(z.includes('import("../kern/englisch.js")'), "nur bei Bedarf geladen");
});
