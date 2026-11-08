// 📷 0.40.0 Fotoalbum: Rechte, Foto-Einwilligung beim Markieren, Papierkorb, Datei-Zugriff, Aufräumen lässt Fotos/Dokumente in Ruhe.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { nachrichtenAufraeumen } from "../supabase/functions/_shared/nachrichten.js";
import { ABLAGE_DATENBANK } from "../supabase/functions/_shared/ablage.js";
import { einwilligung } from "../js/kern/logik.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.6" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const hoch = async (pid, mime = "image/png") => (await rufe({ aktion: "datei_hochladen", name: "bild.png", mime, daten: PNG }, await login(pid))).json;
let nr = 0;
const foto = (album, datei, mehr = {}) => ({ id: `ft-${++nr}`, album_id: album, datei: "datei:" + datei, ...mehr });
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });
const mdb = () => ({ liste: (t, f = () => true) => (d[t] || []).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) });

test("Alben: anlegen nur das Team; Team-Alben sehen Eltern und Kinder nicht", async () => {
  assert.equal((await speichern(E, "fotoalben", [{ id: "fa-x", titel: "Meins" }])).konflikte[0].grund, "NUR_TEAM");
  assert.equal((await speichern("p-lk1", "fotoalben", [{ id: "fa-t", titel: "Konzert", sichtbar: "alle" }])).gespeichert[0].von, "p-lk1");
  await speichern("p-leitung", "fotoalben", [{ id: "fa-team", titel: "Intern", sichtbar: "verwaltung" }]);
  assert.ok(!(await laden(E)).fotoalben.some((a) => a.id === "fa-team")); assert.ok((await laden(E)).fotoalben.some((a) => a.id === "fa-t"));
});

test("Fotos: hochladen nur Erwachsene, nur eigene Bild-Dateien, nur in sichtbare Alben", async () => {
  const b = await hoch(E); assert.ok(b.ok, JSON.stringify(b));
  assert.equal((await speichern(S, "fotos", [foto("fa-t", (await hoch(S)).id)])).konflikte[0].grund, "NUR_ERWACHSENE");
  assert.equal((await speichern(E, "fotos", [foto("fa-team", b.id)])).konflikte[0].grund, "ALBUM_NICHT_SICHTBAR");
  const fremd = await hoch("p-lk1");
  assert.equal((await speichern(E, "fotos", [foto("fa-t", fremd.id)])).konflikte[0].grund, "DATEI_UNGUELTIG");
  const g = (await speichern(E, "fotos", [foto("fa-t", b.id, { titel: "Toll" })])).gespeichert[0];
  assert.equal(g.von, E);
  assert.equal((await rufe({ aktion: "datei_holen", id: b.id }, await login(S))).status, 200, "Kinder sehen Fotos aus Alben für alle");
});

test("🔐 Markieren nur mit Foto-Einwilligung „intern“", async () => {
  const kinder = d.personen.filter((p) => p.typ === "schueler");
  const ja = kinder.find((k) => einwilligung(mdb(), k.id, "foto_intern") === "ja"), nein = kinder.find((k) => einwilligung(mdb(), k.id, "foto_intern") !== "ja");
  const b = await hoch("p-lk1");
  assert.equal((await speichern("p-lk1", "fotos", [foto("fa-t", b.id, { personen: [nein.id] })])).konflikte[0].grund, "EINWILLIGUNG_FEHLT");
  if (ja) assert.deepEqual((await speichern("p-lk1", "fotos", [foto("fa-t", b.id, { personen: [ja.id] })])).gespeichert[0].personen, [ja.id]);
});

test("🗑️ Papierkorb: andere sehen es nicht mehr; endgültig erst aus dem Papierkorb; Datei-Zugriff und Aufräumen", async () => {
  const b = await hoch("p-lk1"), f = (await speichern("p-lk1", "fotos", [foto("fa-t", b.id)])).gespeichert[0];
  assert.equal((await speichern("p-lk1", "fotos", [{ ...f, geloescht_am: new Date().toISOString() }])).konflikte[0].grund, "ERST_PAPIERKORB");
  const pk = (await speichern("p-lk1", "fotos", [{ ...f, papierkorb_am: new Date().toISOString() }])).gespeichert[0];
  assert.ok(!(await laden(E)).fotos.some((x) => x.id === f.id), "Eltern sehen es nicht mehr");
  assert.ok((await laden("p-lk1")).fotos.some((x) => x.id === f.id), "die Hochladende sieht es im Papierkorb");
  // Aufräumen: Datei eines Fotos (und eines Dokuments) bleibt, auch wenn sie älter als 1 Tag ist
  await db.q(`update bk_dateien set erstellt_am = now() - interval '3 days'`);
  await nachrichtenAufraeumen(db, ABLAGE_DATENBANK);
  assert.equal((await rufe({ aktion: "datei_holen", id: b.id }, await login("p-lk1"))).status, 200, "Foto-Datei nicht weggeräumt");
  await speichern("p-lk1", "fotos", [{ ...pk, geloescht_am: new Date().toISOString() }]);
  await nachrichtenAufraeumen(db, ABLAGE_DATENBANK);
  assert.equal((await rufe({ aktion: "datei_holen", id: b.id }, await login("p-lk1"))).status, 404, "nach endgültigem Löschen aufgeräumt");
});
