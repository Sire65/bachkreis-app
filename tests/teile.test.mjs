// 📦 0.55.0 Programmteile bei Bedarf laden: Karte aktuell, main.js lädt die Teile nicht beim Start, niemand importiert sie fest
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { karteBauen, NACHLADBAR } from "../tools/teile-karte.mjs";

const lies = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("📦 Karte ist aktuell (sonst: node tools/teile-karte.mjs)", () => assert.equal(lies("js/app/teile-karte.js"), karteBauen()));
test("📦 Nachladbare Teile werden weder beim Start noch von anderen Teilen fest importiert", () => {
  const main = lies("js/app/main.js");
  const alle = [...readdirSync(new URL("../js/app", import.meta.url)).map((f) => `js/app/${f}`), ...readdirSync(new URL("../js/kern", import.meta.url)).map((f) => `js/kern/${f}`)].filter((f) => f.endsWith(".js"));
  for (const d of NACHLADBAR) {
    assert.ok(!main.includes(`"./${d}"`), `main.js lädt ${d} beim Start`);
    for (const f of alle) if (!f.endsWith(d)) assert.ok(!new RegExp(`import [^;]*from "\\./${d.replace(".", "\\.")}"`).test(lies(f)), `${f} importiert ${d} fest`);
    assert.ok(lies("sw.js").includes(`"js/app/${d}"`), `${d} fehlt im Service Worker (offline)`);
  }
});
test("📦 Ansichten und Aktionen der Teile sind in der Karte", async () => {
  const { TEILE_KARTE } = await import("../js/app/teile-karte.js");
  for (const v of ["instrumente", "orchester", "noten", "fotoalbum", "meinedaten", "schilder", "spiele"]) assert.ok(TEILE_KARTE.views[v], v);
  assert.equal(TEILE_KARTE.aktionen.meinGesicht, "orchester.js");
});
