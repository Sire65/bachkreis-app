// ↔️ 0.70.0 Gegenvorschlag bei Vorschlägen (wie Club App 2.956.0, KC-CLUB-GEGENVORSCHLAG)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { vsGruppe } from "../js/kern/schema.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.16" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const stimme = async (pid, vid) => (await db.q(`select wahl from bk_vorschlag_stimmen where person_id = $1 and vorschlag_id = $2`, [pid, vid]))[0]?.wahl ?? null;
let A, el1, el2;
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const eltern = d.personen.filter((p) => p.typ === "eltern" && codes[p.id]);
  [el1, el2] = [eltern[0].id, eltern[1].id];
  A = (await sp(el1, "vorschlaege", { id: "vs-gv-a", titel: "Sommerfest im Park", art: "vorschlag", an: "alle" })).gespeichert[0];
});

test("↔️ Gegenvorschlag: jede/r darf, gleiche Zielgruppe, höchstens 3 je Thema, nicht zu Abstimmungen oder Erledigtem", async () => {
  const B = (await sp(el2, "vorschlaege", { id: "vs-gv-b", titel: "Sommerfest im Probenraum", art: "vorschlag", an: "team", gegen_zu: A.id })).gespeichert?.[0];
  assert.equal(B.gegen_zu, A.id); assert.equal(B.an, "alle", "gleiche Zielgruppe wie A");
  const C = (await sp("p-leitung", "vorschlaege", { id: "vs-gv-c", titel: "Kein Sommerfest", art: "vorschlag", gegen_zu: B.id })).gespeichert?.[0];
  assert.equal(C.gegen_zu, A.id, "zeigt immer auf den ersten");
  assert.equal((await sp(el1, "vorschlaege", { id: "vs-gv-d", titel: "Noch einer", art: "vorschlag", gegen_zu: A.id })).konflikte?.[0]?.grund, "HOECHSTENS_DREI");
  const ab = (await sp("p-leitung", "vorschlaege", { id: "vs-gv-ab", titel: "Abstimmung", art: "abstimmung", an: "alle" })).gespeichert[0];
  assert.equal((await sp(el1, "vorschlaege", { id: "vs-gv-e", titel: "Gegen Abstimmung", art: "vorschlag", gegen_zu: ab.id })).konflikte?.[0]?.grund, "GEGENVORSCHLAG_NICHT_MOEGLICH");
  const rows = (await db.q(`select to_jsonb(v) as z from bk_vorschlaege v where id like 'vs-gv-%'`)).map((r) => r.z);
  assert.deepEqual(vsGruppe(rows, rows.find((r) => r.id === "vs-gv-c")).map((v) => v.id), ["vs-gv-a", "vs-gv-b", "vs-gv-c"]);
});

test("👍 Jede Person unterstützt einen Vorschlag der Gruppe – die Stimme wandert", async () => {
  await sp(el2, "vorschlag_stimmen", { id: "st-gv-1", vorschlag_id: "vs-gv-a", wahl: "dafuer" });
  assert.equal(await stimme(el2, "vs-gv-a"), "dafuer");
  await sp(el2, "vorschlag_stimmen", { id: "st-gv-2", vorschlag_id: "vs-gv-b", wahl: "dafuer" });
  assert.equal(await stimme(el2, "vs-gv-b"), "dafuer"); assert.equal(await stimme(el2, "vs-gv-a"), null, "bei A weggenommen");
  await sp(el1, "vorschlag_stimmen", { id: "st-gv-3", vorschlag_id: "vs-gv-c", wahl: "dafuer" });
  assert.equal(await stimme(el2, "vs-gv-b"), "dafuer", "andere Personen unberührt");
});

test("↔️ eingebaut: Gruppenkarte „A … oder B …“, Welcher ist dir lieber?, Abstimmung daraus, Bescheid an die Leitung, Migration", () => {
  const s = readFileSync(new URL("../js/app/vorschlaege.js", import.meta.url), "utf8");
  for (const w of ["gruppenKarte", "Welcher ist dir lieber?", "Du bist für", "vsGegen", "vsGruppeAbstimmen", "vsGruppeAbschliessen", "Gegenvorschlag zu:", "↔️ Gegenvorschlag:"]) assert.ok(s.includes(w), w);
  assert.match(readFileSync(new URL("../supabase/migrations/20261130000000_bk_gegenvorschlag.sql", import.meta.url), "utf8"), /add column if not exists gegen_zu text/);
});
