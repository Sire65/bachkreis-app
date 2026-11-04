// 💬 0.29.0 Nachrichtentext wie KC 2.858: Formatieren, Farben, Link-Prüfer, Zu-/Absage erkennen, Termin in der Nachricht.
import { test } from "node:test";
import assert from "node:assert/strict";
import { textHtml, klartext, linkGruende, erkennen, terminErkennen } from "../js/kern/chattext.js";
import { nachrichtKurz } from "../js/kern/logik.js";

test("Formatierung: fett, kursiv, durchgestrichen, Farbe – und HTML bleibt sicher", () => {
  assert.equal(textHtml("bitte *pünktlich* sein"), "bitte <b>pünktlich</b> sein");
  assert.match(textHtml("_leise_ und ~laut~"), /<i>leise<\/i> und <s>laut<\/s>/);
  assert.match(textHtml("[rot]Achtung[/rot]"), /<span class="nf nf-rot">Achtung<\/span>/);
  assert.match(textHtml("[grün]ok[/grün]"), /nf-gruen/);
  assert.doesNotMatch(textHtml("<script>alert(1)</script>"), /<script>/);
  assert.equal(textHtml("a*b*c"), "a*b*c", "nur am Wortrand");
  assert.equal(klartext("*Probe* [blau]heute[/blau]"), "Probe heute");
});
test("Links: Karte mit Adresse, ⚠️ bei verdächtigen Links, Unterstriche in Links bleiben heil", () => {
  assert.match(textHtml("https://sire65.github.io/bachkreis-app/"), /link-karte[^>]*>🔗 sire65\.github\.io/);
  assert.match(textHtml("http://bit.ly/abc"), /link-warn/);
  assert.ok(linkGruende("https://paypa1-login.example/anmelden").length > 0);
  assert.ok(linkGruende("https://bachkreis-noten.xyz/login").some((g) => g.includes("bachkreis")));
  assert.deepEqual(linkGruende("https://www.youtube.com/watch?v=1"), []);
  assert.match(textHtml("https://example.org/a_b_c"), /href="https:\/\/example\.org\/a_b_c"/);
  assert.match(textHtml("Hallo @Anna"), /<span class="erw">@Anna<\/span>/);
});
test("Erkennen: krank zählt als Absage, „komme nicht“ ist keine Zusage", () => {
  assert.deepEqual(erkennen("Lena ist krank und kommt heute nicht").sort(), ["absage", "krank"]);
  assert.deepEqual(erkennen("Ich komme nicht zur Probe"), ["absage"]);
  assert.deepEqual(erkennen("Wir kommen gern!"), ["zusage"]);
  assert.deepEqual(erkennen("Danke für die Noten"), []);
});
test("Termin in der Nachricht: Datum, Wochentag, Uhrzeit", () => {
  const a = terminErkennen("Treffen am 12.12. um 18 Uhr", "2026-11-04");
  assert.equal(a.datum, "2026-12-12"); assert.equal(a.zeit, "18:00");
  const b = terminErkennen("morgen 17:30 Generalprobe", "2026-11-04");
  assert.equal(b.datum, "2026-11-05"); assert.equal(b.zeit, "17:30");
  assert.equal(terminErkennen("Freitag Probe", "2026-11-04").datum, "2026-11-06");
  assert.equal(terminErkennen("Danke!", "2026-11-04"), null);
});
test("Vorschau ohne Formatzeichen", () => {
  assert.equal(nachrichtKurz({ text: "*Wichtig:* [rot]heute[/rot] Probe" }).includes("*"), false);
});
