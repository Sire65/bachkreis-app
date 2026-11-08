// 🛡️ 0.43.0 Rollen Entwickler/Admin · App-weite Schalter nur Admin · Wartungsmodus · Admin-Lage · Fehlerberichte privat
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { einstStufe, rollenMit } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.5" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("🧑‍💻 Stufen fürs Zahnrad: Entwickler > Admin > Leitung > Eltern > Kinder; Entwickler hat Admin-Rechte", () => {
  assert.deepEqual(rollenMit(["entwickler"]), ["entwickler", "admin"]);
  assert.equal(einstStufe({ typ: "unterstuetzer" }, ["entwickler"]), "entwickler");
  assert.equal(einstStufe({ typ: "leitung" }, ["leitung", "admin"]), "admin");
  assert.equal(einstStufe({ typ: "lehrkraft" }, ["lehrkraft"]), "leitung");
  assert.equal(einstStufe({ typ: "eltern" }, []), "eltern");
  assert.equal(einstStufe({ typ: "schueler" }, []), "kinder");
});

test("👑 Admin ernennen und entziehen darf nur der Entwickler; den Entwickler kann niemand austragen", async () => {
  const lk = (await laden("p-leitung")).personen.find((p) => p.id === "p-lk2");
  assert.equal((await speichern("p-leitung", "personen", [{ ...lk, rollen: [...lk.rollen, "admin"] }])).konflikte[0].grund, "NUR_ENTWICKLER", "Admin (Leitung) ernennt keine Admins");
  const g = (await speichern("p-entwickler", "personen", [{ ...lk, rollen: [...lk.rollen, "admin"] }])).gespeichert[0];
  assert.ok(g.rollen.includes("admin"));
  const neu = (await laden("p-leitung")).personen.find((p) => p.id === "p-lk2");
  assert.equal((await speichern("p-leitung", "personen", [{ ...neu, rollen: ["lehrkraft"] }])).konflikte[0].grund, "NUR_ENTWICKLER", "Admin entzieht keine Admin-Rolle");
  const ent = (await laden("p-leitung")).personen.find((p) => p.id === "p-entwickler");
  assert.equal((await speichern("p-leitung", "personen", [{ ...ent, rollen: [] }])).konflikte[0].grund, "NUR_ENTWICKLER");
  assert.equal((await speichern("p-leitung", "personen", [{ ...ent, status: "ausgetreten" }])).konflikte[0].grund, "ENTWICKLER_GESCHUETZT");
  const r = (await speichern(S, "personen", [{ ...(await laden(S)).personen.find((p) => p.id === S), rollen: ["entwickler"] }]));
  assert.ok(!(r.gespeichert?.[0]?.rollen || []).includes("entwickler"), "Kinder machen sich nicht zum Entwickler");
  await speichern("p-entwickler", "personen", [{ ...(await laden("p-entwickler")).personen.find((p) => p.id === "p-lk2"), rollen: ["lehrkraft"] }]);
});

test("🛠️ App-weite Schalter nur Admin/Entwickler; Lehrkraft bekommt 403", async () => {
  assert.equal((await rufe({ aktion: "konfig_setzen", schluessel: "express_max_tag", wert: 3 }, await login("p-lk1"))).status, 403);
  assert.equal((await rufe({ aktion: "konfig_setzen", schluessel: "express_max_tag", wert: 3 }, await login("p-entwickler"))).status, 200);
  assert.equal((await rufe({ aktion: "konfig_setzen", schluessel: "express_max_tag", wert: null }, await login("p-leitung"))).status, 200);
});

test("🚧 Wartungsmodus: nur Admin speichert, alle anderen bekommen WARTUNG; Fehlerberichte gehen trotzdem", async () => {
  await rufe({ aktion: "konfig_setzen", schluessel: "wartung", wert: true }, await login("p-entwickler"));
  const r = await rufe({ aktion: "speichern", tab: "rueckmeldungen", zeilen: [{ id: "rm-w", art: "idee", text: "x" }] }, await login(E));
  assert.equal(r.status, 503); assert.equal(r.json.fehler, "WARTUNG");
  assert.equal((await speichern(E, "fehlerberichte", [{ id: "fb-w", text: "Fehler im Wartungsmodus", ansicht: "start", app_version: "0.43.0" }])).gespeichert.length, 1);
  assert.equal((await speichern("p-leitung", "rueckmeldungen", [{ id: "rm-w2", art: "idee", text: "Admin darf" }])).gespeichert.length, 1);
  await rufe({ aktion: "konfig_setzen", schluessel: "wartung", wert: false }, await login("p-entwickler"));
  assert.equal((await rufe({ aktion: "speichern", tab: "rueckmeldungen", zeilen: [{ id: "rm-w3", art: "idee", text: "wieder offen" }] }, await login(E))).status, 200);
});

test("🩺 Fehlerberichte: nur Admin liest, man ändert nur eigene, Person kommt vom Server", async () => {
  assert.equal((await speichern(S, "fehlerberichte", [{ id: "fb-s", text: "TypeError: x", person_id: "p-leitung", erledigt: true }])).gespeichert.length, 1);
  const f = (await laden("p-entwickler")).fehlerberichte.find((x) => x.id === "fb-s");
  assert.equal(f.person_id, S); assert.equal(f.erledigt, false);
  assert.ok(!(await laden(S)).fehlerberichte?.length, "Kinder lesen keine Fehlerberichte");
  assert.ok(!(await laden("p-lk1")).fehlerberichte?.length, "Lehrkraft auch nicht");
  assert.equal((await speichern(E, "fehlerberichte", [{ id: "fb-s", text: "überschrieben" }])).konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await speichern("p-leitung", "fehlerberichte", [{ ...f, erledigt: true }])).gespeichert[0].erledigt, true);
});

test("🛡️ Admin-Lage: nur Admin/Entwickler, nur Zahlen; Abfragetexte nur für den Entwickler", async () => {
  assert.equal((await rufe({ aktion: "admin_lage" }, await login("p-lk1"))).status, 403);
  const a = (await rufe({ aktion: "admin_lage" }, await login("p-leitung"))).json;
  assert.ok(a.ok); assert.equal(a.entwickler, false);
  assert.ok(a.datenbank?.bytes > 0, "Datenbank-Größe gemessen");
  assert.ok(Array.isArray(a.tabellen) && a.tabellen.length);
  assert.ok(a.fehler && typeof a.fehler.offen === "number");
  assert.ok((a.abfragen || []).every((x) => x.q === null));
  const e = (await rufe({ aktion: "admin_lage" }, await login("p-entwickler"))).json;
  assert.equal(e.entwickler, true);
  assert.ok(!JSON.stringify(e).includes("Knopf geht nicht"), "keine Inhalte");
});
