// 0.70.0 Neues aus der Club App: 👀/🙈 ein Knopf für ausgeblendete Kacheln (2.953.0) · 🎨 Bildschirmfoto mit modernen Farben (2.952.0) ·
// ✏️ Änderung erbitten (2.957.0)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { elternVon } from "../js/kern/logik.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.15" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const sp = async (pid, z) => (await rufe({ aktion: "speichern", tab: "personen", zeilen: [z] }, await login(pid))).json;
const zeile = async (id) => (await db.q(`select to_jsonb(t) as z from bk_personen t where id = $1`, [id]))[0]?.z;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("✏️ Änderung erbitten: nur die Leitung setzt die Bitte; das Mitglied (bzw. die Eltern) kann sie nur erledigen", async () => {
  const m = { liste: (t, f = () => true) => (d[t] || []).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) };
  const kind = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && elternVon(m, p.id).some((e) => codes[e]));
  const eltern = elternVon(m, kind.id).find((e) => codes[e]);
  const bitte = { arten: ["mobil", "anschrift"], text: "Nummer geht nicht", von: "p-leitung", am: new Date().toISOString() };
  // selbst setzen geht nicht
  await sp(eltern, { ...(await zeile(eltern)), aenderung_bitte: bitte });
  assert.equal((await zeile(eltern)).aenderung_bitte, null);
  // Leitung setzt für Eltern und Kind
  assert.ok((await sp("p-leitung", { ...(await zeile(eltern)), aenderung_bitte: bitte })).gespeichert?.length);
  await sp("p-leitung", { ...(await zeile(kind.id)), aenderung_bitte: bitte });
  assert.deepEqual((await zeile(eltern)).aenderung_bitte.arten, ["mobil", "anschrift"]);
  // ändern (andere Arten) geht für das Mitglied nicht – nur löschen
  await sp(eltern, { ...(await zeile(eltern)), aenderung_bitte: { ...bitte, arten: ["name"] } });
  assert.deepEqual((await zeile(eltern)).aenderung_bitte.arten, ["mobil", "anschrift"]);
  await sp(eltern, { ...(await zeile(eltern)), aenderung_bitte: null });
  assert.equal((await zeile(eltern)).aenderung_bitte, null);
  // Eltern erledigen die Bitte für ihr Kind
  await sp(eltern, { id: kind.id, aenderung_bitte: null });
  assert.equal((await zeile(kind.id)).aenderung_bitte, null);
});

test("✏️ eingebaut: Hinweis beim Start (einmal am Tag, Sofort/Später/Nichts geändert), PC-Knopf, Migration", () => {
  const m = lies("js/app/meins.js");
  for (const w of ["aenderungBittePruefen", "aeBitteJetzt", "aeBitteSpaeter", "aeBitteNichts", "aeBitteTag", "Hat sich nichts geändert"]) assert.ok(m.includes(w), w);
  assert.match(lies("js/app/main.js"), /aenderungBittePruefen/);
  const v = lies("js/verwaltung/main.js"); for (const w of ["vwAeSenden", "vwAeZurueck", "Änderung erbitten"]) assert.ok(v.includes(w), w);
  assert.match(lies("supabase/migrations/20261129000000_bk_aenderung_bitte.sql"), /add column if not exists aenderung_bitte jsonb/);
});

test("👀/🙈 ein Umschalt-Knopf neben „Erweiterte Ansicht“ – nur mit ausgeblendeten Kacheln, nicht einfach/anordnen, Platzprüfung", () => {
  const s = lies("js/app/start.js");
  for (const w of ['id="kaKopfKnoepfe"', "kaKopfHtml", "kaKopfPasst", "kk-eng", "Ausgeblendete wieder verbergen", "Nur ausgeblendete zeigen"]) assert.ok(s.includes(w), w);
  assert.match(s, /if \(einst\(\)\.einfach \|\| ANO\.an\) return "";/);
});

test("🎨 Bildschirmfoto, PDF und Fernhilfe rechnen moderne Farben (color/oklab/oklch …) vor html2canvas in rgba um", () => {
  const b = lies("js/app/bildschirmfoto.js");
  assert.match(b, /oklab\|oklch\|lab\|lch\|hwb/); assert.match(b, /onclone: farbenGlaetten/);
  assert.match(lies("js/app/druckvorschau.js"), /onclone: farbenGlaetten/); assert.match(lies("js/app/fernhilfe.js"), /onclone: farbenGlaetten/);
});
