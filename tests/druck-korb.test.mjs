// 🖨️📥📲 0.53.0 PDF selbst gebaut, Eingangskorb (privat, nur eigene Dateien), Teilen-Ziel
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pdfAusJpegs, umbrueche } from "../js/kern/pdf.js";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

test("📄 PDF: gültiger Aufbau – Kopf, Seiten, Querverweise stimmen auf das Byte", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
  const pdf = pdfAusJpegs([{ daten: jpeg, w: 10, h: 14 }, { daten: jpeg, w: 10, h: 14 }], { titel: "Test (ä)" });
  const t = new TextDecoder("latin1").decode(pdf);
  assert.ok(t.startsWith("%PDF-1.4")); assert.ok(t.trimEnd().endsWith("%%EOF"));
  assert.match(t, /\/Type \/Pages \/Count 2/); assert.equal((t.match(/\/Subtype \/Image/g) || []).length, 2);
  const xref = Number(/startxref\n(\d+)/.exec(t)[1]); assert.ok(t.slice(xref).startsWith("xref"));
  const eintraege = t.slice(xref).split("\n").slice(3).filter((z) => / 00000 n $/.test(z)).map((z) => Number(z.slice(0, 10)));
  eintraege.forEach((o, i) => assert.ok(t.slice(o).startsWith(`${i + 1} 0 obj`), `Objekt ${i + 1} an ${o}`));
  assert.match(t, /\/Title \(Test \?\)/, "Titel ohne Sonderzeichen");
});
test("📄 Seitenwechsel nur an Blockgrenzen, zu hohe Blöcke werden notfalls geteilt", () => {
  assert.deepEqual(umbrueche(2500, 1000, [300, 700, 950, 1200, 1900, 2300]), [0, 950, 1900]);
  assert.deepEqual(umbrueche(2500, 1000, []), [0, 1000, 2000]);
  assert.deepEqual(umbrueche(800, 1000, [100]), [0]);
});

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.4" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const speichern = async (pid, zeilen) => (await rufe({ aktion: "speichern", tab: "eingangskorb", zeilen }, await login(pid))).json;
const hoch = async (pid, name = "a.pdf") => (await rufe({ aktion: "datei_hochladen", name, mime: "application/pdf", art: "datei", daten: Buffer.from("%PDF-1.4 test").toString("base64") }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank());
  const ek = d.eltern_kind.find((x) => codes[x.kind_id] && codes[x.eltern_id]); S = ek.kind_id; E = ek.eltern_id; });

test("📥 Eingangskorb: in den eigenen Korb ja, fremde nur Leitung/Lehrkraft/Vorstand; nur eigene Dateien; privat", async () => {
  const f = await hoch(E); assert.ok(f.ok, JSON.stringify(f));
  const r = (await speichern(E, [{ id: "ek-t1", person_id: E, titel: "Rechnung", datei: "datei:" + f.id, name: "a.pdf", quelle: "teilen" }])).gespeichert?.[0];
  assert.equal(r?.mime, "application/pdf"); assert.equal(r.von, E);
  assert.equal((await speichern(E, [{ id: "ek-t2", person_id: "p-lk1", titel: "x", text: "hallo" }])).konflikte[0].grund, "NICHT_IN_FREMDEN_KORB");
  assert.ok((await speichern(E, [{ id: "ek-t3", person_id: S, titel: "fürs Kind", text: "Notiz" }])).gespeichert?.[0], "Eltern dürfen in den Korb des eigenen Kindes");
  const fremd = await hoch("p-lk1", "b.pdf");
  assert.equal((await speichern(E, [{ id: "ek-t4", person_id: E, titel: "geklaut", datei: "datei:" + fremd.id }])).konflikte[0].grund, "NUR_EIGENE_DATEI");
  assert.equal((await rufe({ aktion: "datei_holen", id: fremd.id }, await login(E))).status, 403, "fremde Datei bleibt zu");
  const l = await speichern("p-leitung", [{ id: "ek-t5", person_id: E, titel: "Elternbrief", text: "Bitte lesen", quelle: "leitung" }]);
  assert.equal(l.gespeichert?.[0]?.quelle, "leitung");
  const sicht = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.eingangskorb.map((x) => x.id);
  assert.ok((await sicht(E)).includes("ek-t1") && (await sicht(E)).includes("ek-t5"));
  assert.ok(!(await sicht("p-lk1")).includes("ek-t1"), "privat – auch Lehrkraft/Leitung sehen fremde Körbe nicht");
  assert.ok((await sicht("p-leitung")).includes("ek-t5"), "wer hineinlegt, sieht es");
  // Datei aus dem Korb: der Empfänger darf sie holen
  const fl = await hoch("p-leitung", "brief.pdf");
  await speichern("p-leitung", [{ id: "ek-t6", person_id: E, titel: "Brief", datei: "datei:" + fl.id, quelle: "leitung" }]);
  assert.equal((await rufe({ aktion: "datei_holen", id: fl.id }, await login(E))).status, 200);
  const g = (await speichern(E, [{ id: "ek-t5", gelesen_am: "x", titel: "geändert" }])).gespeichert[0];
  assert.ok(g.gelesen_am && g.titel === "Elternbrief", "Empfänger markiert nur gelesen");
});

test("📲 Teilen-Ziel: Manifest, Service Worker, Druckstellen nutzen die Vorschau", () => {
  const m = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(m.share_target.method, "POST"); assert.equal(m.share_target.params.files[0].name, "dateien");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /req\.method === "POST".*\/teilen/); assert.match(sw, /teilen=1/);
  const lies = (f) => readFileSync(new URL(`../js/app/${f}`, import.meta.url), "utf8");
  assert.doesNotMatch(lies("termine.js"), /window\.print\(\)/); assert.doesNotMatch(lies("buero.js"), /window\.open\(""/);
  for (const f of ["notenblatt.js", "notfallpass.js", "leihvertrag.js", "schilder.js", "buero.js"]) assert.match(lies(f), /druckvorschau\.js/, f);
});

test("🎨 Corporate Design: Farben, Kopf und Fuß (links Dokument · Mitte Seite x/y · rechts Name) sind festgelegt", () => {
  const dv = readFileSync(new URL("../js/app/druckvorschau.js", import.meta.url), "utf8"), cd = readFileSync(new URL("../docs/CORPORATE_DESIGN.md", import.meta.url), "utf8");
  for (const f of ["#f2b705", "#1a1500", "#8a6400"]) { assert.ok(dv.includes(f), f); assert.ok(cd.includes(f), f); }
  assert.match(dv, /Seite \$\{i \+ 1\}\/\$\{n\}/, "Seite 1/2"); assert.match(dv, /icons\/logo\.png/);
  assert.match(dv, /kuerzen\(g, DV\.titel/, "links das Dokument"); assert.match(dv, /B - CD\.rand - g\.measureText\(r\)/, "rechts der Name");
  assert.match(dv, /dv-druckseite/, "Drucken nutzt die gesetzten Seiten");
});
