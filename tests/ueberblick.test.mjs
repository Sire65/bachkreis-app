// 🗺️ 0.45.0 Paket 1: Feiertage je Bundesland, Warte-Bilder, Übersicht, Einstieg, Kartei
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feiertage, feiertageNRW, BUNDESLAENDER } from "../js/kern/logik.js";
import { WARTE_BILDER, WARTE_WAHL } from "../js/kern/warten.js";

test("🗺️ Feiertage je Bundesland: NRW wie bisher, SN Buß- und Bettag, BY Heilige Drei Könige, mehrere Länder zusammen", () => {
  const nw = feiertageNRW(2026);
  assert.equal(nw["2026-11-01"], "Allerheiligen"); assert.equal(nw["2026-06-04"], "Fronleichnam"); assert.equal(Object.keys(nw).length, 11);
  const sn = feiertage(2026, ["SN"]);
  assert.equal(sn["2026-11-18"], "Buß- und Bettag"); assert.equal(sn["2026-10-31"], "Reformationstag"); assert.ok(!sn["2026-11-01"]);
  assert.equal(feiertage(2027, ["SN"])["2027-11-17"], "Buß- und Bettag");
  const by = feiertage(2026, ["BY", "NW"]);
  assert.equal(by["2026-01-06"], "Heilige Drei Könige"); assert.equal(by["2026-11-01"], "Allerheiligen");
  assert.equal(Object.keys(BUNDESLAENDER).length, 16);
});

test("⏳ Warte-Bilder: Logo + Musik-Motive, Auswahl mit Abwechselnd/Täglich", () => {
  for (const k of ["logo", "geige", "metronom", "noten", "taktstock", "trommel"]) assert.ok(WARTE_BILDER[k]?.html().includes("warte-"), k);
  assert.deepEqual(WARTE_WAHL.slice(-2).map(([k]) => k), ["wechsel", "taeglich"]);
});

test("🗺️ Übersicht, 🙋 Einstieg, 🗂️ Kartei und ✨ Blinken sind eingebaut", () => {
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const u = lies("js/app/ueberblick.js"), e = lies("js/app/einstellungen.js"), st = lies("js/app/start.js");
  assert.ok(u.includes("VIEWS.ueberblick") && u.includes("einstiegPruefen") && u.includes('"viel"') && u.includes('"keine"'));
  assert.ok(lies("js/app/hilfezentrum.js").includes('data-x="ueberblick"') && st.includes("Alles auf einen Blick"), "0.63.0: Übersicht über „Hilfe & Tipps“ erreichbar");
  assert.ok(e.includes("einstiegPruefen(n)") && e.includes("karteiReiter") && e.includes('"zahlBlinken"') && e.includes("landWahl"));
  assert.ok(lies("sw.js").includes('"js/app/ueberblick.js"'));
});
