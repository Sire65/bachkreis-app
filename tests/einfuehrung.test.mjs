// 🎓 0.65.0 Einführung beim ersten Start · ✉️ Elternbrief · 🔑 eigener Zugang für Kinder nur mit Ja der Eltern
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { einwilligung, elternVon } from "../js/kern/logik.js";
import { GENEHMIGUNG_ZWECKE } from "../js/kern/schema.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.12" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const mini = () => ({ liste: (t, f = () => true) => (d[t] || []).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) });
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("🔑 Zweck „eigener_zugang“: Vorlage da, Demo hat Ja, Nein und offen; einwilligung() liest es", () => {
  assert.ok(GENEHMIGUNG_ZWECKE.eigener_zugang);
  assert.ok(d.genehmigung_vorlagen.some((v) => v.zweck === "eigener_zugang"));
  const m = mini(), werte = new Set(d.genehmigungen.filter((g) => g.vorlage_id === "gv-zugang").map((g) => einwilligung(m, g.kind_id, "eigener_zugang")));
  for (const w of ["ja", "nein", "offen"]) assert.ok(werte.has(w), w);
});

test("🔑 Eltern geben das Ja nur für das eigene Kind – nicht für fremde", async () => {
  const g = d.genehmigungen.find((x) => x.vorlage_id === "gv-zugang" && x.status === "ausstehend");
  const m = mini(), eltern = elternVon(m, g.kind_id)[0];
  assert.ok(eltern, "Kind hat Eltern");
  const fremd = d.personen.find((p) => p.typ === "eltern" && !elternVon(m, g.kind_id).includes(p.id) && codes[p.id]);
  const r1 = await rufe({ aktion: "speichern", tab: "genehmigungen", zeilen: [{ ...g, status: "erteilt" }] }, await login(fremd.id));
  assert.ok(!r1.json.gespeichert?.length, "fremde Eltern dürfen nicht");
  const r2 = await rufe({ aktion: "speichern", tab: "genehmigungen", zeilen: [{ ...g, status: "erteilt" }] }, await login(eltern));
  assert.equal(r2.json.gespeichert?.[0]?.status, "erteilt");
});

test("🎓 Einführung: Touren je Rolle, nur im Echtbetrieb automatisch, aus Hilfe & Tipps startbar, nachgeladen", () => {
  const e = lies("js/app/einfuehrung.js");
  for (const w of ["eltern:", "kinder:", "alle:", "efSpaeter", "efLos", "efWeiter", "efFertig", "installieren", "pushErlauben", "HILFE_STUFEN", "istEchtbetrieb()"]) assert.ok(e.includes(w), w);
  assert.match(lies("js/app/main.js"), /teilLaden\("einfuehrung\.js"\)/);
  assert.match(lies("js/app/hilfezentrum.js"), /data-a="einfuehrungStarten"/);
  assert.match(lies("js/app/datenschutz.js"), /bk-zugestimmt/);
  assert.match(lies("sw.js"), /js\/app\/einfuehrung\.js/);
});

test("✉️ Elternbrief, Eltern-Ja-Spalte, neue Codes für nie Angemeldete, Erinnerung", () => {
  const v = lies("js/verwaltung/main.js");
  for (const w of ["AKTIONEN.zugBriefe", "elternbrief", "Rückgabe-Abschnitt", "Datenschutz kurz", "AKTIONEN.zugNieNeu", "<th>Eltern-Ja</th>", 'einwilligung(db, kid, "eigener_zugang")']) assert.ok(v.includes(w), w);
  assert.match(v, /typ === "schueler" \? alle\.filter\(\(p\) => \["ja", "frei"\]\.includes\(elternJa\(p\.id\)\)\)/, "Kinder-Zugänge nur mit Ja");
  const z = lies("js/app/zugang.js");
  for (const w of ["fehlenHtml", "zgErinnern", 'kanaele: ["mail"]', "zgFehlenDrucken"]) assert.ok(z.includes(w), w);
  assert.match(lies("supabase/migrations/20261126000000_bk_eigener_zugang.sql"), /'eigener_zugang'/);
});
