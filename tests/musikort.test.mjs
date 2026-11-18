// 🎵 0.78.0 Speicherort der Musik: nur eigener Ordner oder https – nie javascript:, data:, http: oder „..“
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { musikBasisPruefen, musikAdresse, MUSIK_STANDARD } from "../js/kern/musikort.js";
import { ADMIN_KONFIG } from "../js/kern/schema.js";

test("Standard und erlaubte Adressen", () => {
  assert.equal(musikAdresse("air.mp3"), MUSIK_STANDARD + "air.mp3");
  assert.equal(musikAdresse("air.mp3", ""), "audio/bach/air.mp3");
  assert.equal(musikAdresse("air.mp3", "https://noten.example.org/musik"), "https://noten.example.org/musik/air.mp3");
  assert.equal(musikBasisPruefen("musik/bach").wert, "musik/bach/");
});
test("gefährliche oder kaputte Adressen werden abgelehnt (dann Standard)", () => {
  for (const s of ["javascript:alert(1)", "http://unsicher.example.org/", "data:audio/mp3;base64,AA", "../geheim/", "https://", "//fremd.example.org/", "a b/"]) {
    assert.equal(musikBasisPruefen(s).ok, false, s);
    assert.equal(musikAdresse("x.mp3", s), MUSIK_STANDARD + "x.mp3", s);
  }
});
test("nur Admin darf den Speicherort ändern; Bühne nutzt ihn; Offline-Liste kennt die Datei", () => {
  assert.ok(ADMIN_KONFIG.includes("musik_basis"));
  assert.match(fs.readFileSync("js/app/buehne.js", "utf8"), /musikAdresse\(/);
  assert.match(fs.readFileSync("sw.js", "utf8"), /js\/kern\/musikort\.js/);
});
