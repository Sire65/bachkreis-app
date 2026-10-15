// Fachlogik-Tests mit den (deterministischen) Demodaten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import * as L from "../js/kern/logik.js";
import { TABELLEN, TABELLEN_NAMEN } from "../js/kern/schema.js";

const HEUTE = new Date("2026-10-15T10:00:00");
function neueDb() {
  const d = erzeugeDemodaten(HEUTE);
  return { d, liste: (t, f) => (d[t] || []).filter((z) => !z.geloescht_am).filter(f || (() => true)), hole: (t, id) => (d[t] || []).find((z) => z.id === id) || null, konfig: () => d.__konfig };
}

test("Demodaten: jede Tabelle der Registry ist befüllt und Pflichtfelder sind gesetzt", () => {
  const { d } = neueDb();
  for (const t of TABELLEN_NAMEN) {
    assert.ok(Array.isArray(d[t]), t);
    for (const z of d[t]) for (const f of TABELLEN[t].felder.filter((f) => f.pflicht)) assert.ok(z[f.k] != null && z[f.k] !== "", `${t}.${f.k} fehlt in ${z.id}`);
  }
  assert.ok(d.personen.filter((p) => p.typ === "schueler").length >= 90);
});

test("Ampel: grün/gelb/grau/rot – grau (unbekannt) ist nie grün", () => {
  assert.equal(L.ampel({ soll: 3, ja: 3, vielleicht: 0, offen: 0 }), "gruen");
  assert.equal(L.ampel({ soll: 3, ja: 2, vielleicht: 1, offen: 0 }), "gelb");
  assert.equal(L.ampel({ soll: 3, ja: 1, vielleicht: 0, offen: 5 }), "grau");
  assert.equal(L.ampel({ soll: 3, ja: 1, vielleicht: 0, offen: 1 }), "rot");
  assert.equal(L.gesamtAmpel([{ ampel: "gruen" }, { ampel: "grau" }]), "grau");
  assert.equal(L.gesamtAmpel([{ ampel: "gruen" }, { ampel: "neutral" }]), "gruen");
});

test("Temporäre Zuordnung mit Projekt gilt nur für Termine dieses Projekts", () => {
  const db = neueDb();
  const tz = db.d.gruppe_zuordnung.find((z) => z.art === "temporaer" && z.projekt_id);
  assert.ok(tz, "Demodaten enthalten eine temporäre Aushilfe");
  const tag = new Date(tz.bis + "T12:00");
  assert.ok(L.wirksameGruppen(db, tz.person_id, tag, tz.projekt_id).includes(tz.gruppe_id));
  assert.ok(!L.wirksameGruppen(db, tz.person_id, tag, null).includes(tz.gruppe_id));
  const gp = db.d.termine.find((t) => t.projekt_id === tz.projekt_id && t.gruppen.includes(tz.gruppe_id) && t.beginn.slice(0, 10) >= tz.von && t.beginn.slice(0, 10) <= tz.bis);
  if (gp) assert.ok(L.eingeladen(db, gp, tz.person_id));
});

test("Genereller Wechsel beendet die alte Stammgruppe am Vortag (Historie bleibt)", () => {
  const db = neueDb();
  const z = db.d.gruppe_zuordnung.find((x) => x.art === "stamm" && x.gruppe_id === "g-b");
  const plan = L.generellerWechselPlan(db, z.person_id, "g-a", "2026-11-01");
  assert.equal(plan.beenden.length, 1);
  assert.equal(plan.beenden[0].bis, "2026-10-31");
  assert.deepEqual({ g: plan.neu.gruppe_id, von: plan.neu.von, art: plan.neu.art }, { g: "g-a", von: "2026-11-01", art: "stamm" });
});

test("Mehrfach-Instrumentalisten zählen nur einmal – im Register des gewählten Instruments", () => {
  const db = neueDb();
  const t = db.d.termine.find((x) => x.titel === "Herbstkonzert");
  const ids = L.eingeladene(db, t);
  const summe = L.besetzung(db, t).reduce((s, z) => s + z.ja + z.vielleicht + z.nein + z.offen, 0);
  assert.equal(summe, ids.filter((p) => L.registerVon(db, p)).length);
  const z = L.antwortZaehler(db, t);
  assert.equal(z.ja + z.vielleicht + z.nein + z.offen, z.gesamt);
});

test("Verteiler: Eltern B-Orchester = Eltern aller B-Mitglieder", () => {
  const db = neueDb();
  const kids = L.gruppenMitglieder(db, "g-b", HEUTE);
  const eltern = L.verteilerAufloesen(db, "eltern:g-b", HEUTE);
  for (const k of kids) for (const e of L.elternVon(db, k)) assert.ok(eltern.includes(e));
  assert.ok(eltern.every((e) => db.hole("personen", e).typ === "eltern"));
});

test("Genehmigung: ausstehend nach Frist = überfällig, nie erteilt", () => {
  assert.equal(L.genehmigungStatus({ status: "ausstehend", frist: "2026-10-01" }, HEUTE), "ueberfaellig");
  assert.equal(L.genehmigungStatus({ status: "ausstehend", frist: "2026-10-30" }, HEUTE), "ausstehend");
  assert.equal(L.genehmigungStatus({ status: "erteilt", frist: "2026-10-01" }, HEUTE), "erteilt");
});

test("Cockpit liefert Einträge in allen vier Bereichen, sortiert nach Dringlichkeit", () => {
  const db = neueDb();
  const c = L.cockpit(db, "p-leitung", HEUTE);
  for (const b of ["heute", "ich", "andere", "bald"]) assert.ok(c.some((x) => x.bereich === b), b);
  for (let i = 1; i < c.length; i++) assert.ok(c[i - 1].dring >= c[i].dring);
});

test("CSV: Hin und zurück, mit Semikolon, Anführungszeichen und Zeilenumbruch", () => {
  const z = [{ a: 'x;"y"', b: "Zeile1\nZeile2" }, { a: "ä", b: "" }];
  assert.deepEqual(L.csvEin(L.csvAus(z, ["a", "b"])), z);
  assert.deepEqual(L.csvEin("name,ort\nMax,Bergkamen\n"), [{ name: "Max", ort: "Bergkamen" }]);
});

test("ICS und WhatsApp-Link", () => {
  const ics = L.ics([{ id: "t1", titel: "Probe; A", beginn: "2026-10-20T16:00:00.000Z", ende: "2026-10-20T17:45:00.000Z", ort: "PZ", beschreibung: "" }]);
  assert.ok(ics.includes("BEGIN:VEVENT") && ics.includes("SUMMARY:Probe\\; A") && ics.trim().endsWith("END:VCALENDAR"), ics);
  assert.equal(L.waLink("Hallo", "0151 123"), "https://wa.me/49151123?text=Hallo");
});
