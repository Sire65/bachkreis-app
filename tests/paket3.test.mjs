// 🛍️📖🎲🎭 0.47.0 Paket 3: Börse, Jahrbuch, Musik-Spiele, Stimmen-Effekte
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { schuljahrVon, boerseDarf } from "../js/kern/schema.js";
import { wavAus, STIMMEN, TEMPO } from "../js/kern/stimme.js";
import { noteVon } from "../js/app/spiele.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.7" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("🛍️ Börse: nur Erwachsene, eigene Anzeige ändern, Helfer nur sich selbst, Plätze begrenzt", async () => {
  assert.ok(!(await laden(S)).boerse?.length, "Kinder sehen die Börse nicht");
  assert.equal((await speichern(S, "boerse", [{ id: "bo-k", art: "biete", titel: "Geige" }])).konflikte[0].grund, "NUR_ERWACHSENE");
  const b = (await speichern(E, "boerse", [{ id: "bo-t", art: "helfer", kategorie: "kuchen", titel: "Kuchen", helfer_anzahl: 1, von: "p-leitung", status: "erledigt", helfer: ["p-lk1"] }])).gespeichert[0];
  assert.equal(b.von, E); assert.equal(b.status, "offen"); assert.deepEqual(b.helfer, []);
  const fremd = (await laden("p-lk1")).boerse.find((x) => x.id === "bo-t");
  assert.equal((await speichern("p-lk1", "boerse", [{ ...fremd, titel: "gekapert" }])).konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await speichern("p-lk1", "boerse", [{ ...fremd, helfer: ["p-lk1", "p-lk2"] }])).konflikte[0].grund, "NUR_EIGENE", "nicht andere eintragen");
  assert.deepEqual((await speichern("p-lk1", "boerse", [{ ...fremd, helfer: ["p-lk1"] }])).gespeichert[0].helfer, ["p-lk1"]);
  const voll = (await laden("p-lk2")).boerse.find((x) => x.id === "bo-t");
  assert.equal((await speichern("p-lk2", "boerse", [{ ...voll, helfer: ["p-lk1", "p-lk2"] }])).konflikte[0].grund, "VOLL");
  assert.ok(boerseDarf({ typ: "eltern" }) && !boerseDarf({ typ: "schueler", geburtsdatum: "2014-01-01" }));
});

test("📖 Jahrbuch: jede/r schreibt Momente, sichtbar für andere erst nach Freigabe der Leitung", async () => {
  const sj = schuljahrVon(new Date("2026-11-08"));
  assert.equal(sj, "2026/27"); assert.equal(schuljahrVon(new Date("2027-03-01")), "2026/27"); assert.equal(schuljahrVon(new Date("2027-08-02")), "2027/28");
  const m = (await speichern(S, "jahrbuch_momente", [{ id: "jm-t", schuljahr: sj, text: "Mein Solo!", freigegeben: true }])).gespeichert[0];
  assert.equal(m.freigegeben, false, "Kinder können sich nicht selbst freigeben");
  assert.ok(!(await laden(E)).jahrbuch_momente.some((x) => x.id === "jm-t"), "andere sehen ihn noch nicht");
  const l = (await laden("p-leitung")).jahrbuch_momente.find((x) => x.id === "jm-t");
  assert.equal((await speichern("p-leitung", "jahrbuch_momente", [{ ...l, freigegeben: true }])).gespeichert[0].freigegeben, true);
  assert.ok((await laden(E)).jahrbuch_momente.some((x) => x.id === "jm-t"));
  const frei = (await laden(S)).jahrbuch_momente.find((x) => x.id === "jm-t");
  assert.equal((await speichern(S, "jahrbuch_momente", [{ ...frei, text: "geändert" }])).konflikte[0].grund, "SCHON_FREIGEGEBEN");
});

test("🎵 Noten-Raten: Violinschlüssel C4…A5, Bassschlüssel E2…C4, deutsche Namen mit H", () => {
  assert.deepEqual(noteVon("violin", 0), { name: "C", midi: 60 });
  assert.deepEqual(noteVon("violin", 2), { name: "E", midi: 64 });
  assert.deepEqual(noteVon("violin", 6), { name: "H", midi: 71 });
  assert.deepEqual(noteVon("violin", 12), { name: "A", midi: 81 });
  assert.deepEqual(noteVon("bass", 2), { name: "G", midi: 43 });
  assert.deepEqual(noteVon("bass", 12), { name: "C", midi: 60 });
});

test("🎭 Stimmen-Effekte: 14 Stimmen, WAV-Kopf korrekt, Lautstärke begrenzt", async () => {
  assert.equal(STIMMEN.length, 14); assert.ok(TEMPO.maus > 1 && TEMPO.riese < 1);
  const w = wavAus(new Float32Array([0, 2, -2, 0.5]), 16000), b = new DataView(await w.arrayBuffer());
  assert.equal(w.type, "audio/wav"); assert.equal(b.getUint32(24, true), 16000); assert.equal(b.getUint32(40, true), 8);
  assert.ok(Math.abs(b.getInt16(46, true)) <= 0x7fff && b.getInt16(46, true) > 30000, "auf 98 % normalisiert");
});

test("Paket 3 ist eingebaut (Kacheln, Migration, Chat-Aufnahme)", () => {
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const st = lies("js/app/start.js"); for (const k of ['id: "boerse"', 'id: "jahrbuch"', 'id: "spiele"']) assert.ok(st.includes(k), k);
  assert.ok(lies("js/app/nachrichten.js").includes("stimmeAnwenden(r.blob, art)"));
  assert.ok(lies("supabase/migrations/20261115000000_bk_boerse_jahrbuch.sql").includes("grant select, insert, update, delete on bk_boerse to service_role"));
});
