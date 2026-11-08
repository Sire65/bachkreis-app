// 💡🗳️ 0.41.0 Vorschläge & Abstimmungen · 🎄 Adventskalender · 🗒️ Protokoll-Aufgaben
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { vsAuszaehlen, vsZielgruppe } from "../js/kern/schema.js";
import { TUEREN, LIEDER, ANORDNUNG, adventSichtbar, tuerOffenBar, heutigesTuerchen, melodie } from "../js/kern/advent.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.5" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("Anlegen: Vorschlag jede/r (an alle/Team), Abstimmung nur Leitung/Lehrkräfte/Vorstand", async () => {
  assert.equal((await speichern(S, "vorschlaege", [{ id: "vs-k", titel: "Pizza nach der Probe", art: "vorschlag", an: "alle" }])).gespeichert[0].von, S);
  assert.equal((await speichern(S, "vorschlaege", [{ id: "vs-k2", titel: "x", art: "vorschlag", an: "eltern" }])).konflikte[0].grund, "AN_UNGUELTIG");
  assert.equal((await speichern(E, "vorschlaege", [{ id: "vs-e", titel: "x", art: "abstimmung", an: "alle" }])).konflikte[0].grund, "NUR_LEITUNG_VORSTAND");
  assert.equal((await speichern("p-leitung", "vorschlaege", [{ id: "vs-l", titel: "x", art: "abstimmung", an: "alle", optionen: [{ id: "a", t: "nur eine" }] }])).konflikte[0].grund, "MINDESTENS_ZWEI_ANTWORTEN");
});

test("Abstimmen: nur Zielgruppe, eine Stimme je Person, gültige Wahl, nach Ende gesperrt", async () => {
  const eltern = d.eltern_kind[0].eltern_id;
  assert.equal((await speichern(S, "vorschlag_stimmen", [{ id: "x1", vorschlag_id: "vs-2", wahl: "harz" }])).konflikte[0].grund, "NICHT_FUER_MICH", "Kind stimmt bei Eltern-Abstimmung nicht mit");
  const aktuell = async () => (await laden(eltern)).vorschlag_stimmen.find((s) => s.vorschlag_id === "vs-2" && s.person_id === eltern);
  let meine = await aktuell();
  if (!meine) meine = (await speichern(eltern, "vorschlag_stimmen", [{ id: "neu-1", vorschlag_id: "vs-2", wahl: "harz" }])).gespeichert[0];
  assert.equal((await speichern(eltern, "vorschlag_stimmen", [{ ...meine, wahl: "mond" }])).konflikte[0].grund, "WAHL_UNGUELTIG");
  const r = await speichern(eltern, "vorschlag_stimmen", [{ ...(await aktuell()), wahl: "nordsee" }]);
  assert.equal(r.gespeichert[0].wahl, "nordsee", "Stimme ändern geht"); assert.equal(r.gespeichert[0].person_id, eltern);
  assert.equal((await speichern(eltern, "vorschlag_stimmen", [{ id: "zweite", vorschlag_id: "vs-2", wahl: "harz" }])).konflikte[0].grund, "SCHON_ABGESTIMMT");
  const v = (await laden("p-leitung")).vorschlaege.find((x) => x.id === "vs-2");
  assert.equal((await speichern("p-leitung", "vorschlaege", [{ ...v, optionen: [{ id: "harz", t: "Harz" }, { id: "alpen", t: "Alpen" }] }])).konflikte[0].grund, "ANTWORTEN_GESPERRT", "nach der ersten Stimme bleiben die Antworten");
  await speichern("p-leitung", "vorschlaege", [{ ...v, status: "beendet", ergebnis: "Harz" }]);
  assert.equal((await speichern(eltern, "vorschlag_stimmen", [{ ...(await aktuell()), wahl: "harz" }])).konflikte[0].grund, "ABSTIMMUNG_BEENDET");
});

test("🔒 Geheim: niemand sieht, wer wie gestimmt hat – auch die Leitung nicht; Vorstands-Abstimmung nur für Vorstand/Leitung", async () => {
  const L = await laden("p-leitung");
  const geheim = L.vorschlag_stimmen.filter((s) => s.vorschlag_id === "vs-3");
  assert.ok(geheim.length >= 2 && geheim.every((s) => s.person_id === null || s.person_id === "p-leitung"), "Leitung sieht keine Namen");
  assert.equal(vsAuszaehlen(L.vorschlaege.find((v) => v.id === "vs-3"), geheim).stimmen, geheim.filter((s) => s.wahl).length, "zählen geht trotzdem");
  assert.ok(!(await laden(E)).vorschlaege.some((v) => v.id === "vs-3"), "Eltern sehen die Vorstands-Abstimmung nicht");
  assert.ok(!(await laden("p-lk1")).vorschlaege.some((v) => v.id === "vs-3"), "Lehrkraft auch nicht");
  const fv = (await laden("p-fv2")).vorschlag_stimmen.find((s) => s.vorschlag_id === "vs-3" && s.person_id === "p-fv2");
  assert.ok(fv, "die eigene Stimme sieht man");
});

test("Zielgruppe und Auszählung", () => {
  assert.equal(vsZielgruppe({ an: "eltern" }, { typ: "schueler" }), false);
  assert.equal(vsZielgruppe({ an: "vorstand" }, { rollen: ["vorstand"] }), true);
  const z = vsAuszaehlen({ art: "abstimmung" }, [{ wahl: "ja" }, { wahl: "ja" }, { wahl: "nein" }, { wahl: null }]);
  assert.deepEqual(z.optionen.map((o) => o.zahl), [2, 1, 0]); assert.equal(z.stimmen, 3);
});

test("🎄 Adventskalender: 24 Türchen, Überraschung bis 30.11., nachholen ja, vorgreifen nein, Melodien lesbar", () => {
  assert.deepEqual(Object.keys(TUEREN).map(Number).sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual([...ANORDNUNG].sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i + 1));
  const nov = new Date(2026, 10, 30, 12), d3 = new Date(2026, 11, 3, 12), jan = new Date(2027, 0, 5, 12), feb = new Date(2027, 1, 1, 12);
  assert.equal(adventSichtbar(nov), false); assert.equal(adventSichtbar(nov, true), true, "Leitung: Vorschau");
  assert.equal(adventSichtbar(d3), true); assert.equal(adventSichtbar(jan), true); assert.equal(adventSichtbar(feb), false);
  assert.equal(tuerOffenBar(2, d3), true); assert.equal(tuerOffenBar(4, d3), false); assert.equal(tuerOffenBar(24, nov, true), true);
  assert.equal(heutigesTuerchen(d3), 3); assert.equal(heutigesTuerchen(nov), null);
  for (const [k, l] of Object.entries(LIEDER)) { const m = melodie(l.noten); assert.ok(m.length >= 8 && m.every(([n, t]) => n >= 55 && n <= 80 && t > 0), k); }
  for (const t of Object.values(TUEREN)) if (t.lied) assert.ok(LIEDER[t.lied], t.titel);
});
