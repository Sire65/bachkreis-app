// 📞🪑🛟 0.50.0 Anrufe, Runder Tisch, Fernhilfe: der Server vermittelt nur – und schützt die Kinder
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { anrufErlaubt, erwachsen } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, pg, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.7" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, `Anmeldung ${pid}`); return (tok[pid] = r.json.token); }
const speichern = async (pid, zeilen) => (await rufe({ aktion: "speichern", tab: "anrufe", zeilen }, await login(pid))).json;
const aktion = async (pid, body) => rufe(body, await login(pid));
const ANGEBOT = { type: "offer", sdp: "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n" };
before(async () => { ({ db, pg, d, codes } = await demoDatenbank()); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("📞 Kinderschutz: Kind ruft nur die eigenen Eltern an – nicht die Lehrkraft", async () => {
  const kind = d.personen.find((p) => p.id === S), lk = d.personen.find((p) => p.id === "p-lk1");
  assert.equal(erwachsen(kind), false); assert.equal(anrufErlaubt(kind, lk), false); assert.equal(anrufErlaubt(kind, lk, { verwandt: true }), true);
  assert.equal((await speichern(S, [{ id: "an-k1", art: "audio", an: ["p-lk1"], angebot: ANGEBOT }])).konflikte[0].grund, "ANRUF_NICHT_ERLAUBT");
  assert.equal((await speichern("p-lk1", [{ id: "an-k2", art: "video", an: [S], angebot: ANGEBOT }])).konflikte[0].grund, "ANRUF_NICHT_ERLAUBT");
  const ek = d.eltern_kind.find((x) => codes[x.kind_id] && codes[x.eltern_id] && !erwachsen(d.personen.find((p) => p.id === x.kind_id))); assert.ok(ek, "Familie mit Zugang");
  assert.equal((await speichern(ek.kind_id, [{ id: "an-k4", art: "audio", an: [E === ek.eltern_id ? "p-lk1" : E], angebot: ANGEBOT }])).konflikte[0].grund, "ANRUF_NICHT_ERLAUBT", "fremde Eltern auch nicht");
  const r = await speichern(ek.kind_id, [{ id: "an-k3", art: "audio", an: [ek.eltern_id], angebot: ANGEBOT }]);
  assert.equal(r.gespeichert?.[0]?.status, "klingelt", JSON.stringify(r.konflikte));
});

test("📞 Ablauf: klingelt → Antwort nur vom Angerufenen; Fremde sehen nichts", async () => {
  const z = (await speichern("p-lk1", [{ id: "an-1x", art: "video", an: ["p-leitung"], angebot: { ...ANGEBOT, boese: 1 }, status: "angenommen" }])).gespeichert[0];
  assert.equal(z.status, "klingelt"); assert.deepEqual(Object.keys(z.angebot).sort(), ["sdp", "type"]); assert.equal(z.von, "p-lk1");
  assert.equal((await speichern("p-fv1", [{ ...z, status: "beendet" }])).konflikte[0].grund, "NUR_BETEILIGTE");
  assert.equal((await aktion("p-fv1", { aktion: "anruf_lage", id: "an-1x" })).status, 404);
  const a = (await speichern("p-leitung", [{ ...z, status: "angenommen", antwort: { type: "answer", sdp: "v=0" } }])).gespeichert[0];
  assert.equal(a.status, "angenommen"); assert.equal(a.antwort.type, "answer");
  const lage = await aktion("p-lk1", { aktion: "anruf_lage", id: "an-1x" });
  assert.equal(lage.json.anruf.antwort.type, "answer");
  assert.equal((await speichern("p-lk1", [{ id: "an-2x", art: "audio", an: ["p-leitung", "p-fv1"], angebot: ANGEBOT }])).konflikte[0].grund, "GENAU_EINE_PERSON");
});

test("🪑 Runder Tisch nur für Erwachsene; tisch_lage zeigt Anwesende mit Namen", async () => {
  assert.equal((await speichern(S, [{ id: "td-k", art: "tisch_da", raum_id: "bachkreis" }])).konflikte[0].grund, "NUR_ERWACHSENE");
  assert.equal((await aktion(S, { aktion: "tisch_lage", raum: "bachkreis" })).status, 403);
  const da = (await speichern("p-leitung", [{ id: "td-1", art: "tisch_da", raum_id: "bachkreis", status: "klingelt" }])).gespeichert[0];
  assert.equal(da.status, "angenommen"); assert.deepEqual(da.an, []);
  const l = (await aktion("p-fv1", { aktion: "tisch_lage", raum: "bachkreis" })).json;
  assert.ok(l.zeilen.some((x) => x.id === "td-1")); assert.ok(l.namen["p-leitung"]);
  assert.equal((await speichern("p-fv1", [{ id: "ti-k", art: "tisch", raum_id: "bachkreis", an: [S], angebot: ANGEBOT }])).konflikte[0].grund, "ANRUF_NICHT_ERLAUBT");
  assert.equal((await speichern("p-fv1", [{ id: "ti-1", art: "tisch", raum_id: "bachkreis", an: ["p-leitung"], angebot: ANGEBOT }])).gespeichert[0].status, "klingelt");
  const weg = (await speichern("p-leitung", [{ ...da, status: "beendet" }])).gespeichert[0];
  assert.equal(weg.status, "beendet"); assert.ok(weg.ende);
});

test("🛟 Fernhilfe nur unter Erwachsenen und nur mit Leitung/Admin; Admin kann Module abschalten", async () => {
  const lk = d.personen.find((p) => p.id === "p-lk1"), fv = d.personen.find((p) => p.id === "p-fv1"), le = d.personen.find((p) => p.id === "p-leitung");
  assert.equal(anrufErlaubt(lk, le, { art: "fernhilfe" }), true);
  assert.equal(anrufErlaubt(fv, lk, { art: "fernhilfe" }), false, "zwei ohne Leitung/Admin");
  assert.equal((await speichern("p-lk1", [{ id: "fh-1", art: "fernhilfe", an: ["p-leitung"], angebot: ANGEBOT }])).gespeichert[0].status, "klingelt");
  await pg.query(`insert into bk_konfig (schluessel, wert) values ('module_aus', '["anrufe"]'::jsonb) on conflict (schluessel) do update set wert = excluded.wert`);
  assert.equal((await speichern("p-lk1", [{ id: "an-aus", art: "audio", an: ["p-leitung"], angebot: ANGEBOT }])).konflikte[0].grund, "MODUL_AUS");
  assert.equal((await speichern("p-lk1", [{ id: "fh-2", art: "fernhilfe", an: ["p-leitung"], angebot: ANGEBOT }])).gespeichert?.[0]?.status, "klingelt", "Fernhilfe bleibt an");
  await pg.query(`delete from bk_konfig where schluessel = 'module_aus'`);
});
