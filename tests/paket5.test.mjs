// ✨ 0.49.0 Paket 5 Feinschliff: Nutzung für alle, Sitzung (Anwesenheit/vertagt/Aufgaben), Protokoll-Prüfung, Aussetzer, Uhr-X
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { nutzungAuswerten } from "../js/kern/logik.js";
import { aufgabenAusText, protokollText } from "../js/app/sitzung.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.9" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); E = d.__konfig.demo_personen.eltern; });

test("📈 Nutzung: Farbfeld, Spitze, Vergleich ↑↓, „machen mit“ erst ab 3 – nur Summen", () => {
  const jetzt = new Date("2026-11-09T12:00:00Z"), z = (tage, h) => new Date(jetzt.getTime() - tage * 86400000 + h * 3600000).toISOString();
  const aenderungen = [...[1, 1, 1, 2].map((t, i) => ({ zeit: z(t, 6), tabelle: "termine", wer: `p${i}` })), { zeit: z(40, 0), tabelle: "termine", wer: "x" }];
  const r = nutzungAuswerten({ aenderungen, nachrichten: [{ zeit: z(1, 0) }], versand: [{ zeit: z(1, 0), kanal: "push" }, { zeit: z(1, 0), kanal: "app" }] }, 30, jetzt);
  assert.equal(r.aktionen.n, 4); assert.equal(r.aktionen.trend, "hoch"); assert.equal(r.mitglieder.n, 4);
  assert.equal(r.benachrichtigungen.n, 1, "In-App zählt nicht als Benachrichtigung");
  assert.ok(r.spitze); assert.equal(r.feld.length, 7); assert.equal(r.feld[0].length, 24);
  assert.equal(nutzungAuswerten({ aenderungen: aenderungen.slice(0, 2) }, 30, jetzt).mitglieder.n, null, "unter 3 Personen keine Zahl");
  assert.ok(!JSON.stringify(r).includes("p0"), "keine Personen im Ergebnis");
});

test("📈 Server: nutzung_lage für alle Angemeldeten, ohne Namen", async () => {
  const r = await rufe({ aktion: "nutzung_lage", tage: 90 }, await login(E));
  assert.equal(r.status, 200); assert.equal(r.json.tage, 90); assert.ok(Array.isArray(r.json.feld));
  assert.ok(!JSON.stringify(r.json).includes("Jacka"), "keine Namen");
});

test("🎬 Sitzung: Anwesenheit nur gültige Werte, vertagt und Vorschlag-Bezug bleiben erhalten", async () => {
  const s = (await laden("p-fv1")).versammlungen.find((x) => x.id === "si-1");
  const neu = (await speichern("p-fv1", "versammlungen", [{ ...s, anwesenheit: { "p-fv1": "da", "p-fv2": "entschuldigt", "p-x": "boese", "<b>": "da" }, tagesordnung: [{ titel: "Kasse", vertagt: true, vs_id: "vs-1" }] }])).gespeichert[0];
  assert.deepEqual(neu.anwesenheit, { "p-fv1": "da", "p-fv2": "entschuldigt" });
  assert.equal(neu.tagesordnung[0].vertagt, true); assert.equal(neu.tagesordnung[0].vs_id, "vs-1");
});

test("🗒️ Protokolltext: Anwesend, vertagt, Aufgaben aus dem letzten Protokoll", () => {
  const vorher = aufgabenAusText("…\nAufgaben (wer · was · bis wann):\n- Karin: Kuchen bestellen\n- \n\nProtokoll erstellt am …");
  assert.deepEqual(vorher, ["Karin: Kuchen bestellen"]);
  const t = protokollText({ titel: "Vorstand", art: "vorstand", beginn: "2026-12-10T18:30:00Z", tagesordnung: [{ titel: "Cello", vertagt: true }] }, new Date("2026-12-11"), vorher);
  assert.match(t, /☐ offen – Karin: Kuchen bestellen/); assert.match(t, /TOP 1: Cello – ⏭️ vertagt/);
});

test("🔎 Prüfung, ⚡ Aussetzer, ✕ Uhr sind eingebaut", () => {
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const a = lies("js/kern/adapter-supabase.js");
  assert.match(a, /const NUR_LESEN = \/\^\(laden\|/); assert.ok(!/NUR_LESEN = [^\n]*speichern/.test(a), "Speichern nie doppelt");
  assert.ok(lies("js/app/buero.js").includes("pruefungHtml(d)") && lies("js/app/buero.js").includes("protokollVeroeffentlichen"));
  assert.ok(lies("js/app/stundenuhren.js").includes('className = "su-x"') && lies("js/app/stundenuhren.js").includes("uhrGanzAus"));
  for (const f of ["nutzung", "pruefung"]) assert.ok(lies("sw.js").includes(`"js/app/${f}.js"`), f);
});
