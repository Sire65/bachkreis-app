// 🆘 Rückmeldungen · 💶 Erstattungen · 🐞🍀 Überraschungen (0.42.0)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { erBetrag } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.4" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("🆘 Rückmeldung: jede/r meldet, nur Leitung sieht fremde und antwortet; nach Antwort nicht mehr ändern", async () => {
  const r = (await speichern(S, "rueckmeldungen", [{ id: "rm-t", art: "problem", text: "Knopf geht nicht", von: "p-leitung", status: "erledigt", antwort: "gefälscht" }])).gespeichert[0];
  assert.equal(r.von, S); assert.equal(r.status, "neu"); assert.equal(r.antwort, null);
  assert.ok(!(await laden(E)).rueckmeldungen.some((x) => x.id === "rm-t"), "Eltern sehen fremde Meldungen nicht");
  assert.ok(!(await laden("p-lk1")).rueckmeldungen.some((x) => x.id === "rm-t"), "Lehrkraft auch nicht");
  const L = (await laden("p-leitung")).rueckmeldungen.find((x) => x.id === "rm-t");
  const a = (await speichern("p-leitung", "rueckmeldungen", [{ ...L, status: "erledigt", antwort: "Behoben!" }])).gespeichert[0];
  assert.equal(a.status, "erledigt"); assert.ok(a.beantwortet_am);
  const meine = (await laden(S)).rueckmeldungen.find((x) => x.id === "rm-t");
  assert.equal(meine.antwort, "Behoben!");
  assert.equal((await speichern(S, "rueckmeldungen", [{ ...meine, text: "doch anders" }])).konflikte[0].grund, "SCHON_BEANTWORTET");
});

test("💶 Erstattung: Betrag rechnet der Server, Auslage braucht eigenen Beleg, Kinder nicht, Status nur Kasse", async () => {
  assert.equal((await speichern(S, "erstattungen", [{ id: "er-s", art: "fahrt", datum: "2026-11-01", zweck: "x", km: 10 }])).konflikte[0].grund, "NUR_ERWACHSENE");
  const f = (await speichern(E, "erstattungen", [{ id: "er-f", art: "fahrt", datum: "2026-11-01", zweck: "Instrumente gefahren", km: 37, betrag: 999, status: "ausgezahlt" }])).gespeichert[0];
  assert.equal(Number(f.betrag), 11.1, "37 km × 0,30 €"); assert.equal(f.status, "eingereicht");
  assert.equal((await speichern(E, "erstattungen", [{ id: "er-a", art: "auslage", datum: "2026-11-01", zweck: "Saiten", betrag: 20 }])).konflikte[0].grund, "BELEG_FEHLT");
  const fremd = (await rufe({ aktion: "datei_hochladen", name: "b.png", mime: "image/png", daten: PNG }, await login("p-lk1"))).json;
  assert.equal((await speichern(E, "erstattungen", [{ id: "er-a", art: "auslage", datum: "2026-11-01", zweck: "Saiten", betrag: 20, beleg: "datei:" + fremd.id }])).konflikte[0].grund, "BELEG_UNGUELTIG");
  const eigen = (await rufe({ aktion: "datei_hochladen", name: "b.png", mime: "image/png", daten: PNG }, await login(E))).json;
  const a = (await speichern(E, "erstattungen", [{ id: "er-a", art: "auslage", datum: "2026-11-01", zweck: "Saiten", betrag: 20.456, beleg: "datei:" + eigen.id }])).gespeichert[0];
  assert.equal(Number(a.betrag), 20.46);
  assert.ok(!(await laden("p-lk1")).erstattungen.some((x) => x.von === E), "Lehrkraft sieht fremde Erstattungen nicht");
  assert.equal((await rufe({ aktion: "datei_holen", id: eigen.id }, await login("p-fv1"))).status, 200, "Kasse sieht den Beleg");
  assert.equal((await rufe({ aktion: "datei_holen", id: eigen.id }, await login("p-lk1"))).status, 403, "andere nicht");
  const k = (await laden("p-fv1")).erstattungen.find((x) => x.id === "er-a");
  const g = (await speichern("p-fv1", "erstattungen", [{ ...k, status: "genehmigt", notiz_kasse: "ok", betrag: 500 }])).gespeichert[0];
  assert.equal(g.status, "genehmigt"); assert.equal(Number(g.betrag), 20.46, "Kasse ändert den Betrag nicht");
  const m = (await laden(E)).erstattungen.find((x) => x.id === "er-a");
  assert.equal((await speichern(E, "erstattungen", [{ ...m, zweck: "anders" }])).konflikte[0].grund, "SCHON_BEARBEITET");
  assert.equal(erBetrag({ art: "fahrt", km: 10 }, 0.35), 3.5);
});

test("🐞🍀 nur eine Überraschung je Start: Käfer vor Klee vor Fee, abschaltbar", async () => {
  const { ueberraschung, SPRUECHE_KAEFER, SPRUECHE_KLEE } = await import("../js/kern/glueck.js");
  assert.equal(ueberraschung(100, {}), "kaefer"); assert.equal(ueberraschung(75, {}), "klee"); assert.equal(ueberraschung(40, {}), "fee"); assert.equal(ueberraschung(7, {}), null);
  assert.equal(ueberraschung(50, { kaefer: false }), "klee"); assert.equal(ueberraschung(100, { kaefer: false, klee: false }), "fee");
  assert.equal(SPRUECHE_KAEFER.length, 8); assert.equal(SPRUECHE_KLEE.length, 15);
});
