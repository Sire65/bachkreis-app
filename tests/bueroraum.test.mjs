// 🏢 0.37.0 Büro-Raum wie die Club App: Jalousie-Schrift, Schreibtisch einrichten, Rechner, Regal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lamellenBuchstaben, LAMELLEN, plaetzeRechnen, einrichtungPruefen, rechne, PLAETZE, EXTRA, FEIN_MAX } from "../js/kern/buerotisch.js";

test("Jalousie: „Bachkreis Bergkamen“ mittig, ein Buchstabe je Lamelle", () => {
  const l = lamellenBuchstaben();
  assert.equal(l.length, LAMELLEN);
  assert.equal(l.join(""), "BachkreisBergkamen");
  const erste = l.findIndex(Boolean), letzte = LAMELLEN - 1 - [...l].reverse().findIndex(Boolean);
  assert.ok(Math.abs(erste - (LAMELLEN - 1 - letzte)) <= 1, "mittig");
});

test("Schreibtisch: Plätze verteilen – Wunsch, sonst Grundplatz, sonst Zusatzreihe; nie doppelt", () => {
  const frei = [...PLAETZE, ...EXTRA];
  assert.deepEqual(plaetzeRechnen(["lampe", "monitor"], frei, {}), { lampe: "lampe", monitor: "monitor" });
  const t = plaetzeRechnen(["lampe", "monitor"], frei, { lampe: "monitor" });
  assert.equal(t.lampe, "monitor"); assert.notEqual(t.monitor, "monitor");
  const k = plaetzeRechnen(["lampe", "uhr", "metronom"], frei, {});
  assert.equal(k.uhr, "x1"); assert.equal(k.metronom, "x2");
  const alle = plaetzeRechnen([...PLAETZE, "a", "b", "c", "d", "e"], frei, {});
  assert.equal(new Set(Object.values(alle)).size, Object.values(alle).length);
});

test("Einrichtung aus dem Speicher wird geprüft (Unbekanntes fliegt raus, Versatz begrenzt)", () => {
  const e = einrichtungPruefen({ plaetze: { lampe: "x1", boese: "<script>", "A B": "lampe" }, versatz: { lampe: [999, -3], monitor: [0, 0] }, dinge: ["uhr", "uhr", "rakete", "metronom"] }, ["uhr", "metronom"]);
  assert.deepEqual(e.plaetze, { lampe: "x1" });
  assert.deepEqual(e.versatz, { lampe: [FEIN_MAX, -3] });
  assert.deepEqual(e.dinge, ["uhr", "metronom"]);
  assert.deepEqual(einrichtungPruefen(null), { plaetze: {}, versatz: {}, dinge: [] });
});

test("Rechner: Punkt vor Strich, Komma, Minus, Fehler", () => {
  assert.equal(rechne("2+3×4"), 14);
  assert.equal(rechne("10−4−3"), 3);
  assert.equal(rechne("7÷2"), 3.5);
  assert.equal(rechne("1,5×2"), 3);
  assert.equal(rechne("-5+3"), -2);
  assert.equal(rechne("5×-2"), -10);
  assert.equal(rechne("0,1+0,2"), 0.3);
  assert.equal(rechne("7÷0"), null);
  assert.equal(rechne("2+"), null);
  assert.equal(rechne("alert(1)"), null);
});

test("Büro-Raum: Regal mit Bachkreis-Logo, Schloss, Einrichten, Pause – alle Aktionen vorhanden", () => {
  const s = readFileSync(new URL("../js/app/bueroraum.js", import.meta.url), "utf8");
  for (const a of ["buSchrank", "buSchloss", "buLampe", "buLampeModus", "buEingang", "buDrucker", "buHandy", "buTelefon", "buFueller", "buTastatur", "buRechner", "buPause", "bueStart", "bueKatalog", "bueFertig", "bueFein"]) assert.ok(s.includes(`AKTIONEN.${a} =`), a);
  assert.ok(s.includes('src="icons/logo.png"') && s.includes("seit 1969"));
  for (const d of [...s.matchAll(/data-a="([a-zA-Z]+)"/g)].map((m) => m[1])) assert.ok(s.includes(`AKTIONEN.${d} =`) || ["oeffne", "chatMit"].includes(d), `Aktion ${d}`);
});
