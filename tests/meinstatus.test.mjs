// 🟢 0.58.0 Mein Status: nur für sich und die eigenen Kinder, eine Zeile je Person, Kinder-Status nicht für alle, nach „bis“ wieder verfügbar
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { statusWirksam, statusId, istMinderjaehrig } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, E, K, fremd;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.9" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const sp = async (pid, z) => (await rufe({ aktion: "speichern", tab: "personenstatus", zeilen: [z] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.personenstatus || [];
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const ek = d.eltern_kind.find((x) => codes[x.kind_id] && codes[x.eltern_id] && istMinderjaehrig(d.personen.find((p) => p.id === x.kind_id)));
  E = ek.eltern_id; K = ek.kind_id;
  fremd = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && p.id !== K && !d.eltern_kind.some((x) => x.kind_id === p.id && x.eltern_id === E)).id;
});

test("🟢 Eltern setzen Status für sich und ihr Kind – nicht für Fremde; id und gesetzt_von vom Server", async () => {
  const r = (await sp(E, { id: "egal", person_id: K, status: "krank", bis: "2099-01-31", hinweis: "Fieber", gesetzt_von: "p-leitung" })).gespeichert[0];
  assert.equal(r.id, statusId(K)); assert.equal(r.gesetzt_von, E); assert.equal(r.bis, "2099-01-31");
  assert.equal((await sp(E, { person_id: fremd, status: "krank" })).konflikte[0].grund, "NUR_EIGENER_STATUS");
  assert.equal((await sp(E, { person_id: E, status: "quatsch" })).konflikte[0].grund, "STATUS_UNGUELTIG");
  const v = (await sp(E, { id: statusId(K), person_id: K, status: "verfuegbar", bis: "2099-01-31", hinweis: "x" })).gespeichert[0];
  assert.equal(v.bis, null); assert.equal(v.hinweis, null, "verfügbar ohne bis/Hinweis");
});
test("👀 Kinder-Status sehen Eltern und Leitung, andere Kinder nicht; Erwachsene sehen alle", async () => {
  await sp(E, { person_id: K, status: "krank" }); await sp(E, { person_id: E, status: "urlaub" });
  assert.ok((await laden("p-leitung")).some((x) => x.person_id === K));
  const f = await laden(fremd);
  assert.ok(!f.some((x) => x.person_id === K), "fremdes Kind sieht den Status nicht"); assert.ok(f.some((x) => x.person_id === E), "Erwachsene: alle");
});
test("📅 Nach dem „bis“-Tag gilt wieder verfügbar; Kopf, Kachel, Gesichter eingebaut", () => {
  assert.equal(statusWirksam({ status: "krank", bis: "2026-11-09" }, "2026-11-10"), null);
  assert.ok(statusWirksam({ status: "krank", bis: "2026-11-10" }, "2026-11-10"));
  assert.equal(statusWirksam({ status: "verfuegbar" }), null);
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  assert.match(lies("js/app/kopf.js"), /data-a="statusOeffnen"/); assert.match(lies("js/app/gesichter.js"), /st-zeichen/);
  assert.match(lies("js/app/meinstatus.js"), /notiz: "krank"/);
});
