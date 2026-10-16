// Nachrichten wie KC (BK-NACHRICHTEN, 0.8.0): Regeln auf dem Server gegen PostgreSQL/PGlite – private Chats, Kinderschutz,
// ❗/🏎️ mit Express-Grenze, Bearbeiten-Frist, Zurückziehen, Reaktionen, ✓✓-Status je Empfänger, ⏰ geplante Nachrichten,
// Bescheid über den BK Communicator (je Nachricht einmal, Ereignis nach Wichtigkeit) und „angekommen“ per Push-Quittung.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { nachrichtenFreigeben } from "../supabase/functions/_shared/nachrichten.js";
import { quittierenPerson } from "../supabase/functions/_shared/kom/kern.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.9" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
let nr = 0;
const nachricht = (von, uid, mehr = {}) => ({ id: `t-n${++nr}`, unterhaltung_id: uid, von, text: `Test ${nr}`, ...mehr });

before(async () => {
  ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" }));
  S = d.__konfig.demo_personen.schueler; E = d.__konfig.demo_personen.eltern;
});

test("Private Chats: Einzelchat Schüler ↔ Lehrkraft sieht auch die Leitung nicht; Gruppen-Chats schon", async () => {
  const leitung = await laden("p-leitung"), lk1 = await laden("p-lk1"), schueler = await laden(S);
  assert.ok(!leitung.unterhaltungen.some((u) => u.id === "u-e2"), "Leitung sieht den privaten Chat nicht");
  assert.ok(!leitung.nachrichten.some((n) => n.unterhaltung_id === "u-e2"));
  assert.ok(lk1.unterhaltungen.some((u) => u.id === "u-e2") && schueler.nachrichten.some((n) => n.unterhaltung_id === "u-e2"));
  assert.ok(leitung.unterhaltungen.some((u) => u.id === "u-a"), "Gruppenchat sieht die Leitung weiter");
});

test("Kinderschutz: wer mit wem einen eigenen Chat anfangen darf", async () => {
  const fremdesKind = d.personen.find((p) => p.typ === "schueler" && !d.eltern_kind.some((e) => e.eltern_id === E && e.kind_id === p.id)).id;
  const andereEltern = d.personen.find((p) => p.typ === "eltern" && p.id !== E && !d.eltern_kind.some((e) => e.eltern_id === p.id && d.eltern_kind.some((x) => x.eltern_id === E && x.kind_id === e.kind_id))).id;
  const neu = (mit, art = "einzel") => ({ id: `t-u-${mit}-${art}`, titel: "x", art, mitglieder: [mit] });
  assert.equal((await speichern(S, "unterhaltungen", [neu("p-lk1")])).ok, true, "Schüler → Lehrkraft");
  assert.equal((await speichern(S, "unterhaltungen", [neu(andereEltern)])).konflikte[0].grund, "PARTNER_NICHT_ERLAUBT", "Schüler → fremde Eltern nicht");
  assert.equal((await speichern(E, "unterhaltungen", [neu(fremdesKind)])).konflikte[0].grund, "PARTNER_NICHT_ERLAUBT", "Eltern → fremdes Kind nicht");
  assert.equal((await speichern(E, "unterhaltungen", [neu("p-leitung")])).ok, true, "Eltern → Leitung");
  assert.equal((await speichern(S, "unterhaltungen", [{ ...neu("p-lk1"), id: "t-u-zwei", mitglieder: ["p-lk1", "p-lk2"] }])).konflikte[0].grund, "EINZEL_NUR_ZWEI");
  const r = await speichern(S, "unterhaltungen", [{ ...neu("p-lk1", "runde"), titel: "Fahrgemeinschaft", mitglieder: ["p-lk1", "p-lk2"] }]);
  assert.equal(r.gespeichert[0].mitglieder[0], S, "Ersteller ist immer dabei");
});

test("Senden: Rundschreiben nur Leitung, Text-Grenze, ❗ wichtig, ↩️ Antwort – Zeit und Absender setzt der Server", async () => {
  assert.equal((await speichern(S, "nachrichten", [nachricht(S, "u-eb")])).konflikte?.[0]?.grund ?? "NICHT_SICHTBAR", "UNTERHALTUNG_NICHT_SICHTBAR");
  assert.equal((await speichern(S, "nachrichten", [nachricht(S, "u-e2", { text: "x".repeat(4001) })])).konflikte[0].grund, "TEXT_ZU_LANG");
  assert.equal((await speichern(S, "nachrichten", [nachricht("p-lk1", "u-e2")])).konflikte[0].grund, "ABSENDER_FALSCH");
  const r = await speichern(S, "nachrichten", [nachricht(S, "u-e2", { wichtig: true, antwort_auf: "n-x", zeit: "2000-01-01T00:00:00Z", rueckmeldung: true })]);
  const z = r.gespeichert[0];
  assert.equal(z.wichtig, true); assert.equal(z.antwort_auf, "n-x"); assert.equal(z.rueckmeldung, false, "Rückmeldung erbitten nur Verwalter");
  assert.ok(Date.parse(z.zeit) > Date.now() - 60000, "Zeit vom Server");
});

test("🏎️ Express: höchstens 5 am Tag – die Leitung unbegrenzt; nicht zusammen mit ⏰", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await speichern(S, "nachrichten", [nachricht(S, "u-e2", { express: true })])).ok, true);
  assert.equal((await speichern(S, "nachrichten", [nachricht(S, "u-e2", { express: true })])).konflikte[0].grund, "EXPRESS_GRENZE");
  for (let i = 0; i < 6; i++) assert.equal((await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1", { express: true })])).ok, true);
  const morgen = new Date(Date.now() + 86400000).toISOString();
  assert.equal((await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1", { express: true, geplant_um: morgen })])).konflikte[0].grund, "EXPRESS_NICHT_GEPLANT");
});

test("Bearbeiten (nur Absender, in der Frist), Reaktionen (nur eigene), Zurückziehen (Absender oder Leitung)", async () => {
  const n = (await speichern("p-lk1", "nachrichten", [nachricht("p-lk1", "u-e2")])).gespeichert[0];
  const b = (await speichern("p-lk1", "nachrichten", [{ ...n, text: "Geändert" }])).gespeichert[0];
  assert.equal(b.text, "Geändert"); assert.ok(b.bearbeitet_am);
  const fremd = (await speichern(S, "nachrichten", [{ ...b, text: "gehackt", reaktionen: { [S]: "👍", "p-lk1": "💩" } }])).gespeichert[0];
  assert.equal(fremd.text, "Geändert", "fremder Text bleibt"); assert.deepEqual(fremd.reaktionen, { [S]: "👍" }, "nur die eigene Reaktion");
  const weg = (await speichern(S, "nachrichten", [{ ...fremd, reaktionen: { [S]: null } }])).gespeichert[0];
  assert.deepEqual(weg.reaktionen, {}, "Reaktion entfernt");
  assert.equal((await speichern(S, "nachrichten", [{ ...weg, zurueckgezogen_am: new Date().toISOString() }])).konflikte[0].grund, "NUR_EIGENE");
  await db.q(`update bk_nachrichten set zeit = now() - interval '20 minutes' where id = $1`, [n.id]);
  const alt = (await laden("p-lk1")).nachrichten.find((x) => x.id === n.id);
  assert.equal((await speichern("p-lk1", "nachrichten", [{ ...alt, text: "zu spät" }])).konflikte[0].grund, "BEARBEITEN_ZU_SPAET");
  const z = (await speichern("p-lk1", "nachrichten", [{ ...alt, zurueckgezogen_am: new Date().toISOString() }])).gespeichert[0];
  assert.equal(z.text, ""); assert.ok(z.zurueckgezogen_am);
});

test("✓✓-Status: jede Person nur für sich, Zeiten vom Server; der Absender sieht ihn, Dritte nicht", async () => {
  const n = (await speichern("p-lk1", "nachrichten", [nachricht("p-lk1", "u-e2")])).gespeichert[0];
  const st = { id: `${n.id}:${S}`, nachricht_id: n.id, person_id: S, zugestellt_am: "2000-01-01T00:00:00Z", gelesen_am: "2000-01-01T00:00:00Z" };
  const r = await speichern(S, "nachricht_status", [st]);
  assert.equal(r.ok, true); assert.ok(Date.parse(r.gespeichert[0].gelesen_am) > Date.now() - 60000); assert.equal(r.gespeichert[0].autor_id, "p-lk1");
  assert.equal((await speichern(S, "nachricht_status", [{ ...st, id: `${n.id}:p-lk2`, person_id: "p-lk2" }])).konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await speichern("p-lk1", "nachricht_status", [{ ...st, id: `${n.id}:p-lk1`, person_id: "p-lk1" }])).konflikte[0].grund, "NACHRICHT_NICHT_SICHTBAR", "eigene Nachricht braucht keinen Status");
  assert.ok((await laden("p-lk1")).nachricht_status.some((x) => x.id === st.id), "Absender sieht „gelesen“");
  assert.ok(!(await laden("p-leitung")).nachricht_status.some((x) => x.id === st.id), "Dritte nicht");
});

test("⏰ Geplant: bis zur Sendezeit nur für den Absender; Freigabe sendet, wiederholt und gibt Bescheid", async () => {
  const um = new Date(Date.now() + 3600000).toISOString();
  const g = (await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1", { geplant_um: um, wiederholung: "woechentlich", text: "Wochengruß" })])).gespeichert[0];
  assert.equal(Date.parse(g.geplant_um), Date.parse(um));
  assert.ok(!(await laden("p-lk2")).nachrichten.some((x) => x.id === g.id), "Empfänger sieht sie noch nicht");
  assert.equal((await speichern("p-lk2", "nachricht_status", [{ id: `${g.id}:p-lk2`, nachricht_id: g.id, person_id: "p-lk2", gelesen_am: um }])).konflikte[0].grund, "NACHRICHT_NICHT_SICHTBAR");
  await db.q(`update bk_nachrichten set geplant_um = now() - interval '1 minute' where id = $1`, [g.id]);
  const f = await nachrichtenFreigeben(db);
  assert.ok(f.gesendet >= 1);
  assert.ok((await laden("p-lk2")).nachrichten.some((x) => x.id === g.id), "jetzt sichtbar");
  const weiter = await db.q(`select geplant_um from bk_nachrichten where text = 'Wochengruß' and geplant_frei is null`);
  assert.equal(weiter.length, 1, "nächste Woche ist schon eingeplant");
  assert.ok(Date.parse(weiter[0].geplant_um) - Date.now() > 6 * 86400000);
  const v = await db.q(`select ereignis, an_id from bk_versand where korrelation = $1`, [`nachricht:${g.id}`]);
  assert.ok(v.some((x) => x.an_id === "p-lk2" && x.ereignis === "nachricht"), "Bescheid an die Empfängerin");
  assert.equal((await nachrichtenFreigeben(db)).gesendet, 0, "kein zweites Mal");
});

test("Bescheid über den BK Communicator: nur der Absender, je Nachricht einmal, 🏎️ → Ereignis „express“ (auch nachts); Push-Quittung → ✓✓ angekommen", async () => {
  const n = (await speichern("p-leitung", "nachrichten", [nachricht("p-leitung", "u-e1", { text: "Eilt!", express: true })])).gespeichert[0];
  assert.equal((await rufe({ aktion: "versenden", nachricht_id: n.id }, await login("p-lk2"))).status, 403, "nur der Absender");
  const r = await rufe({ aktion: "versenden", nachricht_id: n.id }, await login("p-leitung"));
  assert.equal(r.json.ok, true); assert.ok(r.json.auftraege >= 1);
  assert.equal((await rufe({ aktion: "versenden", nachricht_id: n.id }, await login("p-leitung"))).json.schon, true);
  const v = await db.q(`select distinct ereignis, an_id from bk_versand where korrelation = $1`, [`nachricht:${n.id}`]);
  assert.deepEqual([...new Set(v.map((x) => x.ereignis))], ["express"]); assert.deepEqual([...new Set(v.map((x) => x.an_id))], ["p-lk2"]);
  assert.ok(await quittierenPerson(db, `nachricht:${n.id}`, "p-lk2"));
  const st = await db.q(`select zugestellt_am, autor_id from bk_nachricht_status where id = $1`, [`${n.id}:p-lk2`]);
  assert.ok(st[0]?.zugestellt_am, "angekommen über die Push-Quittung"); assert.equal(st[0].autor_id, "p-leitung");
  const z = await rufe({ aktion: "nachricht_zustellung", id: n.id }, await login("p-leitung"));
  assert.ok(z.json.wege.length >= 1 && z.json.wege[0].name, "Absender sieht die Zustellwege");
  assert.equal((await rufe({ aktion: "nachricht_zustellung", id: n.id }, await login("p-lk2"))).status, 403);
});
