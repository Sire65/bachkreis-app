// 🗺️ 0.36.0 Auftrittsorte (Wunsch Frau Jacka): Ortsverzeichnis, Website-Übernahme, Karte, Server speichert Stadt/Land ohne Jahr.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ORTE, LAENDER, CHRONIK_WEBSITE, stadtFinden, ortVon, orteSammeln, koordinatenLesen, projektion, websiteFehlend, flagge } from "../js/kern/orte.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

test("Ortsverzeichnis: jede Stadt hat ein bekanntes Land und gültige Koordinaten", () => {
  for (const [s, [l, b, g]] of Object.entries(ORTE)) {
    assert.ok(LAENDER[l], `${s}: Land ${l}`); assert.ok(b >= -60 && b <= 85 && g >= -180 && g <= 180, `${s}: auf der Karte`);
  }
  assert.equal(flagge("DE"), "🇩🇪"); assert.equal(flagge(""), "🌍");
});

test("Stadt im Freitext finden – nur ganze Wörter, andere Schreibweisen", () => {
  assert.equal(stadtFinden("Olympiahalle München"), "München");
  assert.equal(stadtFinden("Linz (Kulturhauptstadt 2009)"), "Linz");
  assert.equal(stadtFinden("beijing"), "Peking");
  assert.equal(stadtFinden("Hammerstein"), null, "Hamm nicht in Hammerstein");
  assert.equal(stadtFinden(""), null);
  assert.deepEqual(koordinatenLesen("51,62; 7,64"), [51.62, 7.64]);
  assert.equal(koordinatenLesen("200, 7"), null);
  assert.deepEqual(ortVon({ stadt: "Irgendwo", koordinaten: "10, 20", land: "DE" }), { stadt: "Irgendwo", land: "DE", breite: 10, laenge: 20 });
  assert.equal(ortVon({ stadt: "Irgendwo" }), null, "unbekannt = nicht auf der Karte (nie geraten)");
  assert.equal(ortVon({ ort: "Hannover" }).land, "DE", "ältere Einträge mit Ort im Freitext");
});

test("Website-Orte: feste ids, keine Doppel, Übernahme nur Fehlendes; Demo enthält sie", () => {
  const ids = CHRONIK_WEBSITE.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CHRONIK_WEBSITE.length >= 40 && CHRONIK_WEBSITE.every((c) => ortVon(c)));
  assert.equal(websiteFehlend(CHRONIK_WEBSITE.slice(0, 5)).length, CHRONIK_WEBSITE.length - 5);
  const d = erzeugeDemodaten(new Date()), s = orteSammeln(d.chronik);
  assert.equal(websiteFehlend(d.chronik).length, 0);
  assert.ok(s.laender.length >= 19 && s.kontinente.length >= 4, `${s.laender.length} Länder, ${s.kontinente.join(", ")}`);
  assert.ok(s.orte.find((o) => o.stadt === "München").jahre.includes(1985));
});

test("Projektion passt zur Weltkarte (Natural Earth, gemeinfrei)", () => {
  const k = JSON.parse(readFileSync(new URL("../bilder/weltkarte.json", import.meta.url)));
  assert.equal(k.w, 360 * k.k); assert.ok(k.pfad.startsWith("M") && k.pfad.length > 50000 && /Natural Earth/.test(k.quelle));
  assert.deepEqual(projektion(85, -180, k.k, k.nord), [0, 0]);
  const [x, y] = projektion(51.62, 7.64, k.k, k.nord); assert.ok(x > 740 && x < 760 && y > 130 && y < 140);
});

test("Server: Chronik-Eintrag ohne Jahr mit Stadt/Land speichern (Leitung)", async () => {
  const { db, d, codes } = await demoDatenbank({ jetzt: new Date() }), dp = d.__konfig.demo_personen;
  const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.8" }, {});
  const t = (await rufe({ aktion: "anmelden", code: codes[dp.leitung] })).json.token;
  const r = (await rufe({ aktion: "speichern", tab: "chronik", zeilen: [{ id: "ch-neu-ort", titel: "Konzert", stadt: "Unna", land: "DE", koordinaten: null }] }, t)).json;
  assert.equal(r.gespeichert?.[0]?.stadt, "Unna", JSON.stringify(r.konflikte));
  assert.equal(r.gespeichert[0].jahr, null);
});

test("Veröffentlichung: der Ordner bilder/ kommt mit auf die Internetseite (sonst fehlt die Weltkarte)", () => {
  const y = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(y, /WEB="[^"]*\bbilder\b/);
});
