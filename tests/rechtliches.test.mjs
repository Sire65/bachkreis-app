// ⚖️ 0.55.0 Rechtliches: Zustimmung nur im eigenen Namen (für sich und eigene Kinder), unveränderlich; Nachweis nur Leitung/Vorstand; Texte und Vorstandsunterlagen vorhanden
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { DS_VERSION } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, E, K, fremd;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.6" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, `Anmeldung ${pid}`); return (tok[pid] = r.json.token); }
const speichern = async (pid, zeilen) => (await rufe({ aktion: "speichern", tab: "zustimmungen", zeilen }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.zustimmungen || [];
const lies = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const ek = d.eltern_kind.find((x) => codes[x.kind_id] && codes[x.eltern_id]);
  E = ek.eltern_id; K = ek.kind_id;
  fremd = d.personen.find((p) => p.typ === "schueler" && p.id !== K && !d.eltern_kind.some((x) => x.eltern_id === E && x.kind_id === p.id)).id;
});

test("⚖️ Zustimmung für sich und die eigenen Kinder – Zeit/Fassung vom Server, nie für Fremde, nie ändern", async () => {
  const r = await speichern(E, [{ id: "zs-t1", fuer_id: K, art: "datenschutz", fassung: "1999", zeit: "2000-01-01", person_id: "p-leitung" }]);
  const z = r.gespeichert?.[0]; assert.ok(z, JSON.stringify(r));
  assert.equal(z.person_id, E); assert.equal(z.fassung, DS_VERSION); assert.notEqual(z.zeit, "2000-01-01");
  assert.equal((await speichern(E, [{ id: "zs-t2", fuer_id: fremd, art: "datenschutz" }])).konflikte[0].grund, "NUR_EIGENE_KINDER");
  assert.equal((await speichern(E, [{ id: "zs-t3", art: "unsinn" }])).konflikte[0].grund, "ART_UNGUELTIG");
  assert.equal((await speichern(E, [{ ...z, art: "regeln" }])).konflikte[0].grund, "UNVERAENDERLICH");
});

test("👁️ Nachweis: Leitung sieht alle, Fremde nicht; Eltern sehen die eigenen Kinder", async () => {
  assert.ok((await laden("p-leitung")).some((x) => x.id === "zs-t1"));
  assert.ok((await laden(E)).some((x) => x.id === "zs-t1"));
  const anderer = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && p.id !== K && p.id !== E && !d.eltern_kind.some((x) => x.kind_id === p.id && x.eltern_id === E));
  if (anderer) assert.ok(!(await laden(anderer.id)).some((x) => x.id === "zs-t1"), "fremde Zustimmungen bleiben privat");
});

test("📄 Datenschutzerklärung, Regeln und Vorstandsunterlagen sind da", () => {
  const ds = lies("js/app/datenschutz.js").toLowerCase();
  for (const w of ["verantwortlich", "supabase", "löschung", "auskunft", "widerruf", "beschwerde"]) assert.ok(ds.includes(w), `Datenschutztext: ${w}`);
  for (const f of ["README", "VERARBEITUNGSVERZEICHNIS", "DSFA-KURZ", "AUFTRAGSVERARBEITUNG", "LOESCHKONZEPT"]) assert.ok(lies(`docs/rechtliches/${f}.md`).length > 400, f);
  assert.ok(lies("docs/GERAETETEST.md").includes("iPhone"));
});
