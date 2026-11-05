// 🏢 0.33.0 Büro: Büro-Dokumente sehen nur Leitung/Lehrkräfte bzw. (Ordner Finanzen) Vorstand – auch nicht Instrumenten-/Notenwart, Eltern oder Schüler.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { bueroDarf } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.10" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, zeile) => (await rufe({ aktion: "speichern", tab: "dokumente", zeilen: [zeile] }, await login(pid))).json;
const ids = async (pid) => ((await rufe({ aktion: "laden" }, await login(pid))).json.daten.dokumente || []).map((x) => x.id);
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("Regel: Büro-Sichtbarkeit je Rolle", () => {
  assert.equal(bueroDarf("leitung", ["lehrkraft"]), true); assert.equal(bueroDarf("leitung", ["vorstand"]), false); assert.equal(bueroDarf("leitung", ["instrumentenwart"]), false);
  assert.equal(bueroDarf("vorstand", ["vorstand"]), true); assert.equal(bueroDarf("vorstand", ["lehrkraft"]), false); assert.equal(bueroDarf("alle", []), true);
});
test("🏢 Leitung legt ab und sieht alles; Vorstand nur Finanzen; Wart, Eltern, Schüler nichts", async () => {
  assert.equal((await speichern(dp.leitung, { id: "bu-t1", titel: "Protokoll Test", ordner: "protokolle", sichtbar: "leitung", inhalt: "intern" })).gespeichert?.length, 1);
  const L = await ids(dp.leitung), V = await ids(dp.vorstand), E = await ids(dp.eltern), S = await ids(dp.schueler);
  assert.ok(L.includes("bu-t1") && L.includes("bu-f1") && L.includes("bu-v1"));
  assert.ok(V.includes("bu-f1") && !V.includes("bu-t1") && !V.includes("bu-v1"), "Vorstand: nur Finanzen");
  assert.ok(![...E, ...S].some((x) => x.startsWith("bu-")), "Eltern/Schüler sehen keine Büro-Dokumente");
  const wart = d.personen.find((p) => (p.rollen || []).includes("instrumentenwart") && !(p.rollen || []).some((r) => ["admin", "leitung", "lehrkraft"].includes(r)) && codes[p.id]);
  if (wart) assert.ok(!(await ids(wart.id)).some((x) => x === "bu-t1" || x === "bu-v1"), "Instrumentenwart sieht keine Leitungs-Ordner");
});
test("🔐 Vorstand darf kein Leitungs-Dokument anlegen oder ändern", async () => {
  assert.equal((await speichern(dp.vorstand, { id: "bu-x", titel: "x", ordner: "protokolle", sichtbar: "leitung" })).konflikte[0].grund, "BUERO_NICHT_ERLAUBT");
  assert.equal((await speichern(dp.vorstand, { ...d.dokumente.find((x) => x.id === "bu-v1"), titel: "geändert", sichtbar: "vorstand" })).konflikte?.length, 1, "fremdes Leitungs-Dokument nicht umwidmen");
  assert.equal((await speichern(dp.vorstand, { id: "bu-f2", titel: "Kassenbericht", ordner: "finanzen", sichtbar: "vorstand" })).gespeichert?.length, 1);
});
