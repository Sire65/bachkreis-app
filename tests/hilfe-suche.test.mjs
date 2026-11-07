// ❓🔍 0.39.0 Hilfe-Zentrum und Lupe (wie KC-CLUB-HILFEZENTRUM / KC-CLUB-SUCHE-UNSCHARF)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { HILFE, HILFE_THEMEN, hilfeGliederung, hilfeNeu, hilfeFuer } from "../js/kern/hilfe.js";
import { suchen, trefferWert, abstand, norm } from "../js/kern/suche.js";

const code = readdirSync(new URL("../js/app/", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => readFileSync(new URL(`../js/app/${f}`, import.meta.url), "utf8")).join("\n");

test("Hilfen: eindeutig, gültige Themen, „Zeig mir wo“ führt zu einer echten Ansicht oder Aktion", () => {
  assert.equal(new Set(HILFE.map((e) => e.id)).size, HILFE.length);
  for (const e of HILFE) {
    assert.ok(HILFE_THEMEN.some((t) => t.id === e.thema), e.id);
    if (e.ziel?.v) assert.ok(code.includes(`VIEWS.${e.ziel.v} =`), `Ansicht ${e.ziel.v} (${e.id})`);
    if (e.ziel?.a) assert.ok(code.includes(`AKTIONEN.${e.ziel.a} =`), `Aktion ${e.ziel.a} (${e.id})`);
  }
  const { themen, nr } = hilfeGliederung(HILFE);
  assert.equal(themen[0].id, "start"); assert.equal(nr.installieren, "1.1");
  assert.ok(hilfeNeu({ neu: "0.39.0" }, "0.38.0") && !hilfeNeu({ neu: "0.39.0" }, "0.39.0") && hilfeNeu({ neu: "0.10.0" }, "0.9.0"));
  assert.ok(hilfeFuer(() => false).every((e) => !e.fuer), "Rollen-Hilfen nur für die Rolle");
});

test("Suche: unscharf, Wortanfang, Umlaute, alle Wörter müssen passen", () => {
  assert.equal(norm("Größe Übung"), "grosse ubung");
  assert.equal(abstand("wilfried", "willfried"), 1);
  const E = [{ t: "Willfried Wördemann" }, { t: "Brandenburgisches Konzert" }, { t: "Probe A-Orchester" }, { t: "Probe B-Orchester" }];
  assert.deepEqual(suchen("Würdemann", E).map((e) => e.t), ["Willfried Wördemann"]);
  assert.deepEqual(suchen("Brand", E).map((e) => e.t), ["Brandenburgisches Konzert"]);
  assert.deepEqual(suchen("probe b", E).map((e) => e.t)[0], "Probe B-Orchester");
  assert.equal(suchen("x", E).length, 0, "zu kurz");
  assert.equal(trefferWert("zzzz", "Probe"), 0);
  assert.ok(suchen("stumm", HILFE.map((e) => ({ ...e, u: e.text }))).some((e) => e.id === "stumm"));
});
