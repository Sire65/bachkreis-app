// 🧪 0.35.0 Vorführdaten nach einem Update ergänzen: Neues kommt dazu, Eingetragenes bleibt, Gelöschtes kommt nicht zurück.
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoErgaenzen } from "../js/kern/adapter-lokal.js";

const frisch = () => ({ dokumente: [{ id: "d1", titel: "alt" }, { id: "bu-v1", titel: "Vorlage" }], termine: [{ id: "t1" }, { id: "t2" }], startnachrichten: [{ id: "sn-demo" }], __konfig: { name: "Bachkreis", ansicht_kind_ab_klasse: 9 } });

test("altes Gerät ohne Merkliste: fehlende Beispiel-Zeilen und Einstellungen kommen dazu, Vorhandenes bleibt unverändert", () => {
  const daten = { dokumente: [{ id: "d1", titel: "von mir geändert" }], termine: [{ id: "t1" }], startnachrichten: [], __konfig: { name: "Mein Name" } };
  const r = demoErgaenzen(daten, frisch(), null);
  assert.deepEqual(daten.dokumente.map((d) => d.id), ["d1", "bu-v1"]);
  assert.equal(daten.dokumente[0].titel, "von mir geändert", "Eingetragenes bleibt");
  assert.deepEqual(daten.startnachrichten.map((d) => d.id), ["sn-demo"]);
  assert.equal(daten.__konfig.name, "Mein Name"); assert.equal(daten.__konfig.ansicht_kind_ab_klasse, 9);
  assert.ok(r.geaendert.includes("dokumente") && r.geaendert.includes("__konfig"));
  assert.ok(daten.termine.some((t) => t.id === "t2"), "beim ersten Mal kommt auch t2 dazu (war nie bekannt)");
});
test("Gelöschtes kommt beim nächsten Update nicht zurück", () => {
  const daten = { dokumente: [{ id: "d1" }], termine: [{ id: "t1" }], startnachrichten: [], __konfig: {} };
  const r1 = demoErgaenzen(daten, frisch(), null);
  daten.dokumente = daten.dokumente.filter((d) => d.id !== "bu-v1"); // Nutzer löscht die Vorlage ganz
  const r2 = demoErgaenzen(daten, frisch(), r1.bekannt);
  assert.ok(!daten.dokumente.some((d) => d.id === "bu-v1")); assert.ok(!r2.geaendert.includes("dokumente"));
});
test("wirklich neue Beispiele einer späteren Version kommen dazu", () => {
  const daten = { dokumente: [{ id: "d1" }, { id: "bu-v1" }], termine: [{ id: "t1" }, { id: "t2" }], startnachrichten: [{ id: "sn-demo" }], __konfig: { name: "x", ansicht_kind_ab_klasse: 9 } };
  const r1 = demoErgaenzen(daten, frisch(), null);
  const spaeter = frisch(); spaeter.dokumente.push({ id: "bu-v9", titel: "neue Vorlage" });
  const r2 = demoErgaenzen(daten, spaeter, r1.bekannt);
  assert.deepEqual(r2.geaendert, ["dokumente"]); assert.ok(daten.dokumente.some((d) => d.id === "bu-v9"));
});
