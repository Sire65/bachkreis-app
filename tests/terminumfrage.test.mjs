// 🗳️ 0.39.0 Terminumfrage (wie KC Terminumfrage): anlegen nur Planer, abstimmen nur wer gemeint ist, fremde Antworten nur für Ersteller/Leitung.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { tuAuszaehlen, tuFuerMich } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.7" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });
const morgen = (n, h = 19) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(h, 0, 0, 0); return x.toISOString(); };

test("Anlegen: nur Leitung/Lehrkräfte/Vorstand/Terminplaner, mindestens 2 Vorschläge", async () => {
  const u = { id: "tu-t1", titel: "Probenwochenende", an: "mitglieder", gruppen: ["g-a"], optionen: [{ id: "a", beginn: morgen(20) }, { id: "b", beginn: morgen(27) }] };
  assert.equal((await speichern(S, "terminumfragen", [u])).konflikte[0].grund, "NUR_PLANER");
  assert.equal((await speichern("p-leitung", "terminumfragen", [{ ...u, optionen: [u.optionen[0]] }])).konflikte[0].grund, "MINDESTENS_ZWEI_TERMINE");
  const r = (await speichern("p-leitung", "terminumfragen", [{ ...u, von: S, status: "entschieden" }])).konflikte;
  assert.equal(r[0].grund, "TERMIN_NICHT_GEWAEHLT");
  const z = (await speichern("p-leitung", "terminumfragen", [u])).gespeichert[0];
  assert.equal(z.von, "p-leitung"); assert.equal(z.status, "offen");
});

test("Abstimmen: Eltern bei Eltern-Umfragen, nur eigene Antwort, fremde Antworten sieht nur Ersteller/Leitung", async () => {
  const tu1 = d.terminumfragen.find((u) => u.id === "tu-1"); // Eltern B-Orchester
  const elternB = d.eltern_kind.filter((e) => d.gruppe_zuordnung.some((z) => z.gruppe_id === "g-b" && z.person_id === e.kind_id)).map((e) => e.eltern_id)[0];
  const a = { id: `tua-tu-1-${elternB}`, umfrage_id: "tu-1", person_id: elternB, stimmen: { o1: "ja", o2: "nein", o9: "ja", o3: "egal" } };
  const g = (await speichern(elternB, "terminumfrage_antworten", [a])).gespeichert[0];
  assert.deepEqual(g.stimmen, { o1: "ja", o2: "nein" }, "nur gültige Optionen und Stimmen");
  assert.equal((await speichern(elternB, "terminumfrage_antworten", [{ ...a, id: "tua-tu-1-p-x", person_id: "p-x" }])).konflikte[0].grund, "NUR_EIGENE");
  // Lehrkraft ist keine Mutter → Eltern-Umfrage nicht für sie
  assert.equal((await speichern("p-lk2", "terminumfrage_antworten", [{ id: "tua-tu-1-p-lk2", umfrage_id: "tu-1", person_id: "p-lk2", stimmen: { o1: "ja" } }])).konflikte[0].grund, "UMFRAGE_NICHT_FUER_MICH");
  const andere = (await laden(elternB)).terminumfrage_antworten || [];
  assert.ok(andere.every((x) => x.person_id === elternB), "Eltern sehen nur die eigene Antwort");
  assert.ok(((await laden("p-leitung")).terminumfrage_antworten || []).length >= 2, "Leitung sieht alle");
  assert.ok(tu1);
});

test("Team-Umfrage: nur Leitung/Lehrkräfte/Vorstand sehen sie; nach Entscheidung keine Antworten mehr", async () => {
  assert.ok(!((await laden(E)).terminumfragen || []).some((u) => u.id === "tu-2"), "Eltern sehen die Team-Umfrage nicht");
  assert.ok(((await laden("p-lk2")).terminumfragen || []).some((u) => u.id === "tu-2"));
  const u = (await laden("p-leitung")).terminumfragen.find((x) => x.id === "tu-2");
  assert.equal((await speichern("p-lk2", "terminumfragen", [{ ...u, status: "entschieden", gewaehlt: "o1" }])).konflikte[0].grund, "NUR_EIGENE");
  await speichern("p-leitung", "terminumfragen", [{ ...u, status: "entschieden", gewaehlt: "o1" }]);
  assert.equal((await speichern("p-lk2", "terminumfrage_antworten", [{ id: "tua-tu-2-p-lk2", umfrage_id: "tu-2", person_id: "p-lk2", stimmen: { o1: "ja" } }])).konflikte[0].grund, "UMFRAGE_BEENDET");
});

test("Auszählung und Zielgruppe", () => {
  const u = { optionen: [{ id: "a" }, { id: "b" }] };
  const z = tuAuszaehlen(u, [{ stimmen: { a: "ja", b: "vielleicht" } }, { stimmen: { a: "nein", b: "ja" } }, { stimmen: { a: "ja", b: "ja" } }]);
  assert.equal(z.beste, "b"); assert.equal(z.optionen[0].ja, 2);
  assert.equal(tuAuszaehlen(u, []).beste, null);
  assert.equal(tuFuerMich({ an: "eltern", gruppen: ["g"] }, { gruppen: new Set(["g"]), kinder: new Set() }), false);
  assert.equal(tuFuerMich({ an: "mitglieder", fuer_alle: true }, { eigeneGruppen: new Set(["x"]) }), true);
});
