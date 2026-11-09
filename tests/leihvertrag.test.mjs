// 📝 0.52.0 Leihvertrag-Formular: anlegen nur Instrumentenverwaltung, jede/r unterschreibt nur den eigenen Platz, Unterschriebenes bleibt
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { istMinderjaehrig, LV_KLAUSEL } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, K, E, inv;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.5" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, `Anmeldung ${pid}`); return (tok[pid] = r.json.token); }
const speichern = async (pid, zeilen) => (await rufe({ aktion: "speichern", tab: "leihvertraege", zeilen }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.leihvertraege || [];
const BILD = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const u = (name, extra = {}) => ({ name, bild: BILD, ...extra });
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const ek = d.eltern_kind.find((x) => codes[x.kind_id] && codes[x.eltern_id] && istMinderjaehrig(d.personen.find((p) => p.id === x.kind_id)) && d.personen.find((p) => p.id === x.kind_id).typ === "schueler");
  K = ek.kind_id; E = ek.eltern_id; inv = d.inventar.find((i) => i.status === "verfuegbar").id;
});

test("📝 anlegen nur Leitung/Vorstand/Instrumentenwart; Kind und Eltern sehen ihn, andere nicht", async () => {
  assert.equal((await speichern("p-lk1", [{ id: "lv-t1", person_id: K, von: "2026-11-10", inventar_ids: [inv] }])).konflikte[0].grund, "NUR_VERWALTUNG");
  const v = (await speichern("p-leitung", [{ id: "lv-t1", nr: "LV-2026-T1", person_id: K, eltern_id: E, von: "2026-11-10", inventar_ids: [inv, inv], zubehoer: ["koffer", "unsinn"], kaution: 50, klausel: LV_KLAUSEL, status: "wartet" }])).gespeichert?.[0];
  assert.ok(v); assert.deepEqual(v.inventar_ids, [inv]); assert.deepEqual(v.zubehoer, ["koffer"]); assert.equal(v.status, "wartet");
  assert.ok((await laden(K)).some((x) => x.id === "lv-t1")); assert.ok((await laden(E)).some((x) => x.id === "lv-t1"));
  assert.ok(!(await laden("p-lk1")).some((x) => x.id === "lv-t1"), "Lehrkraft sieht fremde Verträge nicht");
});

test("✍️ jede/r nur die eigene Unterschrift; Name/Zeit vom Server; nichts sonst ändern", async () => {
  let v = (await laden(K)).find((x) => x.id === "lv-t1");
  assert.equal((await speichern(K, [{ ...v, unterschriften: { eltern: u("Ich bin Mama") } }])).konflikte[0].grund, "NICHT_DEINE_UNTERSCHRIFT");
  assert.equal((await speichern(K, [{ ...v, unterschriften: { mitglied: { name: "X", bild: "javascript:alert(1)" } } }])).konflikte[0].grund, "UNTERSCHRIFT_UNGUELTIG");
  const r = (await speichern(K, [{ ...v, kaution: 0, unterschriften: { mitglied: u("Kind", { zeit: "2000-01-01" }) } }])).gespeichert[0];
  assert.equal(r.kaution, 50, "Kind ändert die Kaution nicht"); assert.equal(r.unterschriften.mitglied.von, K); assert.notEqual(r.unterschriften.mitglied.zeit, "2000-01-01"); assert.equal(r.status, "wartet");
  // die Unterschrift lässt sich nicht überschreiben
  const r2 = (await speichern(K, [{ ...r, unterschriften: { mitglied: u("Fälschung") } }])).gespeichert[0];
  assert.equal(r2.unterschriften.mitglied.name, "Kind");
  v = (await laden(E)).find((x) => x.id === "lv-t1");
  assert.equal((await speichern(E, [{ ...v, unterschriften: { ...v.unterschriften, eltern: u("Elternteil") } }])).gespeichert[0].status, "wartet", "Bachkreis fehlt noch");
  v = (await laden("p-leitung")).find((x) => x.id === "lv-t1");
  const fertig = (await speichern("p-leitung", [{ ...v, unterschriften: { ...v.unterschriften, bachkreis: u("Leitung") } }])).gespeichert[0];
  assert.equal(fertig.status, "unterschrieben");
  assert.equal((await speichern("p-leitung", [{ ...fertig, kaution: 10 }])).konflikte[0].grund, "SCHON_UNTERSCHRIEBEN", "Unterschriebenes ändert niemand");
  assert.equal((await speichern("p-leitung", [{ ...fertig, status: "beendet" }])).gespeichert[0].status, "beendet");
});

test("👤 Volljährige brauchen keine Eltern-Unterschrift; Verwaltung lässt vor Ort unterschreiben (vermerkt)", async () => {
  const erw = d.personen.find((p) => p.typ === "lehrkraft" && codes[p.id] && p.id !== "p-leitung");
  const v = (await speichern("p-leitung", [{ id: "lv-t2", person_id: erw.id, von: "2026-11-10", inventar_ids: [inv], status: "wartet",
    unterschriften: { mitglied: u(erw.vorname, { vor_ort: true }), bachkreis: u("Leitung") } }])).gespeichert[0];
  assert.equal(v.status, "unterschrieben"); assert.equal(v.unterschriften.mitglied.vor_ort, true); assert.equal(v.unterschriften.mitglied.von, "p-leitung");
  assert.equal((await speichern(erw.id, [{ ...v, kaution: 1 }])).konflikte[0].grund, "NICHT_MEHR_OFFEN", "nach dem Unterschreiben nichts mehr");
  const andere = d.personen.find((p) => p.typ === "lehrkraft" && codes[p.id] && p.id !== erw.id && p.id !== "p-leitung");
  if (andere) assert.equal((await speichern(andere.id, [{ ...v, unterschriften: { bachkreis: u("Lehrkraft") } }])).konflikte[0].grund, "NUR_VERWALTUNG");
});
