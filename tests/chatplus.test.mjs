// 💬 0.38.0 Nachrichten wie KC 2.882: Weiterleiten, Zurückholen, Anheften, @Erwähnungen, 🔕 stumm, 📦/⭐ und 🔖 – Regeln auf dem Server.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { erwaehnteIn } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.8" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
let nr = 0;
const nachricht = (von, uid, mehr = {}) => ({ id: `cp-n${++nr}`, unterhaltung_id: uid, von, text: `Test ${nr}`, ...mehr });
const lkN = () => d.nachrichten.find((n) => n.unterhaltung_id === "u-lk").id;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); S = d.__konfig.demo_personen.schueler; });

test("↪️ Weiterleiten: Vermerk setzt der Server, nur sichtbare Quellen", async () => {
  const r = await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-lk", { text: "Probe verlegt", weiter_von: "n-4", weitergeleitet_von: "Gefälscht" })]);
  const q = d.nachrichten.find((n) => n.id === "n-4"), p = d.personen.find((x) => x.id === q.von);
  assert.equal(r.gespeichert[0].weitergeleitet_von, `${p.vorname} ${p.nachname}`, "Name der Quelle, nicht der vom Gerät");
  // Schüler kennt den Leitungs-Chat u-fv nicht → kann daraus nichts weiterleiten
  const fv = d.nachrichten.find((n) => n.unterhaltung_id === "u-fv");
  if (fv) assert.equal((await speichern(S, "nachrichten", [nachricht(S, "u-e2", { weiter_von: fv.id })])).konflikte[0].grund, "QUELLE_NICHT_SICHTBAR");
});

test("↩️ Zurückholen: nur eigene, nur solange niemand gelesen hat", async () => {
  const n = (await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1")])).gespeichert[0];
  assert.equal((await speichern("p-lk2", "nachrichten", [{ ...n, zurueckholen: true }])).konflikte[0].grund, "NUR_EIGENE");
  assert.ok((await speichern("p-leitung", "nachrichten", [{ ...n, zurueckholen: true }])).gespeichert[0].geloescht_am, "weg bei allen");
  const m = (await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1")])).gespeichert[0];
  await speichern("p-lk2", "nachricht_status", [{ id: `${m.id}:p-lk2`, nachricht_id: m.id, person_id: "p-lk2", gelesen_am: new Date().toISOString() }]);
  assert.equal((await speichern("p-leitung", "nachrichten", [{ ...m, zurueckholen: true }])).konflikte[0].grund, "SCHON_GELESEN");
});

test("📌 Anheften: im Einzelchat alle Beteiligten (höchstens 3), in Gruppen nur die Leitung", async () => {
  const ue = (await laden(S)).unterhaltungen.find((x) => x.id === "u-e2");
  const r = await speichern(S, "unterhaltungen", [{ ...ue, angeheftet: ["n-1", "n-2", "n-3", "n-1", "x"], titel: "Umbenannt" }]);
  assert.deepEqual(r.gespeichert[0].angeheftet, ["n-1", "n-2", "n-3"]);
  assert.notEqual(r.gespeichert[0].titel, "Umbenannt", "nur das Anheften ändert sich");
  const us = (await laden(S)).unterhaltungen.find((x) => x.id === "u-a");
  assert.equal((await speichern(S, "unterhaltungen", [{ ...us, angeheftet: [] }])).konflikte[0].grund, "NUR_LEITUNG");
});

test("🔕 📦 ⭐ Chat-Einstellungen und 🔖 Merkliste sind privat – auch für die Leitung", async () => {
  assert.equal((await speichern("p-lk1", "chat_einstellungen", [{ id: "ce-u-lk-p-lk1", unterhaltung_id: "u-lk", person_id: "p-lk1", stumm_bis: "2999-12-31T00:00:00.000Z", favorit: true }])).gespeichert[0].favorit, true);
  assert.equal((await speichern("p-lk1", "chat_einstellungen", [{ id: "ce-u-lk-p-lk2", unterhaltung_id: "u-lk", person_id: "p-lk2" }])).konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await speichern("p-lk1", "chat_merker", [{ id: `cm-${lkN()}-p-lk1`, nachricht_id: lkN(), person_id: "p-lk1", aktiv: true }])).gespeichert[0].aktiv, true);
  const L = await laden("p-leitung");
  assert.ok(!(L.chat_einstellungen || []).some((z) => z.person_id !== "p-leitung") && !(L.chat_merker || []).some((z) => z.person_id !== "p-leitung"), "Leitung sieht fremde nicht");
});

test("🔕 Stumm: kein Bescheid – außer ❗ wichtig oder @erwähnt", async () => {
  // p-lk1 hat u-lk oben auf „immer stumm“ gestellt
  const an = async (mehr) => { const n = (await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-lk", mehr)])).gespeichert[0];
    await rufe({ aktion: "versenden", nachricht_id: n.id }, await login("p-leitung")); return (await db.q(`select distinct an_id from bk_versand where korrelation = $1`, [`nachricht:${n.id}`])).map((x) => x.an_id); };
  const normal = await an({});
  assert.ok(!normal.includes("p-lk1") && normal.includes("p-lk2"));
  assert.ok((await an({ text: "@Lehrkraft bitte", erwaehnt: ["p-lk1"] })).includes("p-lk1"), "erwähnt kommt durch");
  assert.ok((await an({ wichtig: true })).includes("p-lk1"), "wichtig kommt durch");
});

test("@Erwähnungen erkennen", () => {
  const P = [{ id: "a", vorname: "Anna", nachname: "Schmidt" }, { id: "b", vorname: "Ben", nachname: "Müller" }, { id: "c", vorname: "Anna", nachname: "Roth" }];
  assert.deepEqual(erwaehnteIn("Hallo @Anna Schmidt und @ben!", P), ["a", "b"]);
  assert.deepEqual(erwaehnteIn("@Anna allein ist mehrdeutig, mail a@Ben.de", P), []);
});
