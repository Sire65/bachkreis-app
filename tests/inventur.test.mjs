// 📦 0.63.0 Inventur per Regal-Schild und 🎼 Register nach Zweck
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.11" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("📦 Lagerorte und Inventur: Leitung legt an und ordnet zu, Schüler dürfen es nicht und sehen es nicht", async () => {
  const lo = (await sp("p-leitung", "lagerorte", { id: "lo-test", name: "Regal Z · Fach 9", raum: "Test" })).gespeichert?.[0];
  assert.ok(lo);
  const i = d.inventar[0];
  const g = (await sp("p-leitung", "inventar", { ...i, lagerort_id: "lo-test", inventur_am: "2026-11-11" })).gespeichert?.[0];
  assert.equal(g.lagerort_id, "lo-test");
  const inv = (await sp("p-leitung", "inventuren", { id: "ivt-test", titel: "Inventur Test", beginn: new Date().toISOString(), ergebnis: { ["inventar:" + i.id]: { s: "da" } } })).gespeichert?.[0];
  assert.equal(inv.ergebnis["inventar:" + i.id].s, "da");
  const k = d.personen.find((p) => p.typ === "schueler" && codes[p.id]).id;
  assert.ok((await sp(k, "lagerorte", { id: "lo-x", name: "x" })).konflikte?.length, "Schüler legen keine Lagerorte an");
  const daten = (await rufe({ aktion: "laden" }, await login(k))).json.daten;
  assert.ok(!(daten.lagerorte || []).length && !(daten.inventuren || []).length, "Schüler sehen keine Lagerorte/Inventuren");
});
test("📦 Seite, Schild-QR, Bericht und keine Aufkleber auf Instrumenten", () => {
  const s = lies("js/app/inventur.js");
  for (const w of ["VIEWS.inventur", "BKL1:", "ivSchilder", "ivBericht", "ivAbschliessen", "vermisst", "qrLeserStart", "verliehen"]) assert.ok(s.includes(w), w);
  assert.match(lies("js/kern/schema.js"), /k: "lagerort_id"/);
});
test("🎼 Register nach Zweck: Leitung mit Abschnitten, Entdecken, Rückfall nach Bachkreis, höchstens 25 Kacheln je Register", async () => {
  const st = lies("js/app/start.js");
  assert.match(st, /\["leitung", "Leitung"\], \["entdecken", "Entdecken"\]/);
  assert.match(st, /LEITUNG_ABSCHNITTE = \[\["planen"/);
  assert.match(st, /reg === "bachkreis" && !leitungRegister\(\) \? \[\.\.\.KACHELN\.bachkreis, \.\.\.KACHELN\.leitung\]/);
  for (const reg of ["bachkreis", "leitung", "entdecken", "meins", "technik"]) {
    const i = st.indexOf(`\n  ${reg}: [`), j = st.indexOf("\n  ],", i), n = (st.slice(i, j).match(/\{ id: "/g) || []).length;
    assert.ok(n > 0 && n <= 25, `${reg}: ${n} Kacheln`);
  }
  assert.ok(!/id: "schilder"[^\n]*istEltern/.test(st), "Schilder-Druckerei nicht mehr für Eltern");
});
