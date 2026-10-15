// Vertragstests (statisch, ohne Browser): Versionsvertrag, Service-Worker-Dateiliste, keine Secrets,
// jede Aktion/Ansicht existiert, Supabase-Migration passt zum Schema. Vorbild: tests/app-vertrag.test.mjs der KC Club App.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { APP_VERSION, APP_STUFE } from "../js/kern/version.js";
import { erzeugeSql, erzeugeNachtragSql, NACHTRAEGE } from "../tools/schema-sql.mjs";
import { serverSchema } from "../tools/server-kopie.mjs";
import { UMGEBUNG } from "../js/kern/umgebung.js";

const W = path.resolve(import.meta.dirname, "..");
const lies = (p) => fs.readFileSync(path.join(W, p), "utf8");
const alle = (dir, endung) => fs.readdirSync(path.join(W, dir), { recursive: true }).filter((f) => f.endsWith(endung)).map((f) => path.join(dir, f).replace(/\\/g, "/"));
const jsDateien = [...alle("js", ".js")];

test("Versionsvertrag: version.js, version.json, sw.js, HTML ?v= und package.json stimmen überein", () => {
  const vj = JSON.parse(lies("version.json"));
  assert.equal(vj.version, APP_VERSION);
  assert.equal(vj.stufe, APP_STUFE);
  assert.match(lies("sw.js"), new RegExp(`const VERSION = "${APP_VERSION.replace(/\./g, "\\.")}"`));
  assert.equal(JSON.parse(lies("package.json")).version, APP_VERSION);
  for (const h of ["index.html", "verwaltung.html"]) {
    const vs = [...lies(h).matchAll(/\?v=([\w.-]+)/g)].map((m) => m[1]);
    assert.ok(vs.length > 0, h);
    for (const v of vs) assert.equal(v, APP_VERSION, `${h} enthält ?v=${v}`);
  }
  assert.ok(["DEV", "RC", "FINAL"].includes(APP_STUFE));
});

test("Service Worker cached ALLE Dateien der App (atomares Update)", () => {
  const sw = lies("sw.js");
  const liste = JSON.parse("[" + sw.match(/const DATEIEN = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, "") + "]");
  const noetig = [...jsDateien, ...alle("css", ".css"), "index.html", "verwaltung.html", "manifest.webmanifest", "lib/qrcode/qrcode.js", ...alle("icons", "")];
  for (const d of noetig) assert.ok(liste.includes(d), `sw.js DATEIEN fehlt: ${d}`);
  for (const d of liste) if (d !== "./") assert.ok(fs.existsSync(path.join(W, d)), `sw.js nennt fehlende Datei: ${d}`);
});

test("Keine Secrets im Browsercode", () => {
  const muster = [/service_role/i, /eyJhbGciOi[\w-]{20,}/, /xkeysib-[\w-]{20,}/, /sk_(live|test)_[\w]{10,}/, /SUPABASE_SERVICE/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
  for (const d of [...jsDateien, "index.html", "verwaltung.html", "sw.js"]) {
    const t = lies(d);
    for (const m of muster) assert.ok(!m.test(t), `${d} enthält verdächtiges Geheimnis (${m})`);
  }
});

test("Jede Aktion (data-a/data-c) ist registriert und jede Ansicht (zeige/oeffne) existiert", () => {
  const code = jsDateien.map(lies).join("\n").replace(/^\s*\/\/.*$/gm, ""); // Kommentarzeilen ignorieren
  const definiert = new Set([...code.matchAll(/AKTIONEN\.(\w+)\s*=/g)].map((m) => m[1]).concat(["blattZu"]));
  const benutzt = new Set([...code.matchAll(/data-[ac]="(\w+)"/g)].map((m) => m[1]));
  for (const k of code.matchAll(/aktion: "(\w+)"/g)) benutzt.add(k[1]);
  const fehlt = [...benutzt].filter((a) => !definiert.has(a));
  assert.deepEqual(fehlt, [], "nicht registrierte Aktionen");
  const views = new Set([...code.matchAll(/VIEWS\.(\w+)\s*=/g)].map((m) => m[1]));
  const ziele = new Set([...code.matchAll(/zeige\("(\w+)"/g), ...code.matchAll(/data-x="(\w+)\|/g), ...code.matchAll(/\bv: "(\w+)"/g), ...code.matchAll(/view: "(\w+)"/g)].map((m) => m[1]));
  const ohne = [...ziele].filter((v) => !views.has(v));
  assert.deepEqual(ohne, [], "Ansichten ohne VIEWS-Eintrag");
});

test("Supabase-Migration ist aus dem aktuellen Schema erzeugt (npm run schema)", () => {
  assert.equal(lies("supabase/migrations/20261015000000_bk_grundschema.sql"), erzeugeSql());
  for (const datei of Object.keys(NACHTRAEGE)) assert.equal(lies("supabase/migrations/" + datei), erzeugeNachtragSql(datei), datei);
});

test("Keine Inline-Event-Handler (CSP script-src 'self')", () => {
  for (const d of [...jsDateien, "index.html", "verwaltung.html"]) assert.ok(!/\son(click|change|input|load|submit)=/.test(lies(d)), `${d} enthält Inline-Handler`);
});

test("Keine externen Skripte/Dienste im Browsercode (Zero-Cost, Datenschutz)", () => {
  for (const d of ["index.html", "verwaltung.html"]) assert.ok(!/<script[^>]+src="https?:/.test(lies(d)), d);
});

test("Server-Kopie der Tabellen-Registry ist aktuell (npm run schema)", () => {
  assert.equal(lies("supabase/functions/_shared/schema.js"), serverSchema());
});

test("Repository steht auf Vorführversion – Echtbetrieb nur über die Veröffentlichung (Variablen)", () => {
  assert.equal(UMGEBUNG.datenquelle, "lokal-demo");
  assert.equal(UMGEBUNG.apiUrl, "");
});

test("Server-Code ohne Geheimnisse und ohne Service-Role im Browser-Adapter", () => {
  for (const d of ["supabase/functions/_shared/api.js", "supabase/functions/_shared/regeln.js", "supabase/functions/bk-api/index.ts", "js/kern/adapter-supabase.js"]) {
    const t = lies(d);
    assert.ok(!/eyJhbGciOi[\w-]{20,}|service_role|sk_live/i.test(t), d);
  }
});
