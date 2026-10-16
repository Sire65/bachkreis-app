// 📡 Verbindungs-Symbol: Netzart und Qualität (unbekannt nie als gut)
import test from "node:test";
import assert from "node:assert/strict";
import { netzArt, netzQualitaet, VERALTET_MS } from "../js/kern/netz.js";

const n = (o = {}) => ({ zeiten: [], letzteOk: 0, letzterFehler: 0, fehlerText: "", ...o });
test("Netzart: erkannt schlägt Wahl, sonst Wahl, sonst unbekannt", () => {
  assert.deepEqual(netzArt("mobil", { type: "wifi" }), { art: "wlan", quelle: "erkannt" });
  assert.deepEqual(netzArt("mobil", { type: "cellular" }), { art: "mobil", quelle: "erkannt" });
  assert.deepEqual(netzArt("wlan", undefined), { art: "wlan", quelle: "gewaehlt" });
  assert.deepEqual(netzArt(null, { type: "unknown" }), { art: null, quelle: "" });
});
test("Qualität: offline, Fehler, unbekannt, Stufen", () => {
  const jetzt = 1e12;
  assert.equal(netzQualitaet({ online: false, n: n(), jetzt }).stufe, 0);
  assert.equal(netzQualitaet({ online: true, n: n({ letzterFehler: jetzt - 1000, letzteOk: jetzt - 5000 }), jetzt }).stufe, 0);
  const u = netzQualitaet({ online: true, c: undefined, n: n(), jetzt });
  assert.equal(u.stufe, null); assert.equal(u.farbe, "grau");
  assert.equal(netzQualitaet({ online: true, n: n({ zeiten: [200, 300], letzteOk: jetzt - 1000 }), jetzt }).stufe, 4);
  assert.equal(netzQualitaet({ online: true, n: n({ zeiten: [900], letzteOk: jetzt - 1000 }), jetzt }).stufe, 3);
  assert.equal(netzQualitaet({ online: true, n: n({ zeiten: [2000], letzteOk: jetzt - 1000 }), jetzt }).stufe, 2);
  assert.equal(netzQualitaet({ online: true, n: n({ zeiten: [4000], letzteOk: jetzt - 1000 }), jetzt }).stufe, 1);
  // alte Messung zählt nicht – dann Schätzung des Handys oder unbekannt
  assert.equal(netzQualitaet({ online: true, c: undefined, n: n({ zeiten: [100], letzteOk: jetzt - VERALTET_MS - 1 }), jetzt }).stufe, null);
  const s = netzQualitaet({ online: true, c: { rtt: 150 }, n: n(), jetzt });
  assert.equal(s.stufe, 4); assert.match(s.text, /Schätzung/);
});
