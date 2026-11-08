// 🪪📍📸 0.46.0 Paket 2: Notfallpass, Standorte, Bildschirmfoto an Rückmeldungen
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { entfernungKm, kmText, routeLink, karteLink } from "../js/app/standorte.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.6" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("📍 Entfernung (Luftlinie) und Links: Bergkamen–Dortmund ≈ 20 km, ohne Position null", () => {
  const km = entfernungKm({ lat: 51.616, lon: 7.637 }, { lat: 51.514, lon: 7.468 });
  assert.ok(km > 15 && km < 20, String(km));
  assert.equal(entfernungKm({ lat: 51 }, { lat: 52, lon: 7 }), null);
  assert.equal(kmText(0.43), "430 m"); assert.equal(kmText(3.26), "3,3 km"); assert.equal(kmText(23.4), "23 km");
  assert.match(routeLink({ name: "PZ", lat: 51.6, lon: 7.6 }), /destination=51\.6%2C7\.6/);
  assert.match(karteLink({ name: "PZ", adresse: "Rathausplatz 1" }), /search\?query=Rathausplatz/);
});

test("📍 Standorte pflegt die Leitung (konfig standorte), Lehrkraft und Kinder nicht", async () => {
  assert.equal((await rufe({ aktion: "konfig_setzen", schluessel: "standorte", wert: [{ name: "PZ" }] }, await login("p-leitung"))).status, 200);
  assert.equal((await rufe({ aktion: "konfig_setzen", schluessel: "standorte", wert: [] }, await login(S))).status, 403);
});

test("📸 Rückmeldung mit Bildschirmfoto: nur datei:… wird übernommen, Leitung sieht das Bild", async () => {
  const r = (await speichern(E, "rueckmeldungen", [{ id: "rm-bf", art: "problem", text: "Knopf geht nicht", bild: "datei:abc-123" }])).gespeichert[0];
  assert.equal(r.bild, "datei:abc-123");
  const r2 = (await speichern(E, "rueckmeldungen", [{ id: "rm-bf2", art: "problem", text: "x", bild: "javascript:alert(1)" }])).gespeichert[0];
  assert.equal(r2.bild, null);
  assert.equal((await laden("p-leitung")).rueckmeldungen.find((x) => x.id === "rm-bf").bild, "datei:abc-123");
});

test("🪪 Notfallpass, 📍 Standorte, 📸 Bildschirmfoto sind eingebaut (SOS, Meins, Termin, Rückmeldung)", () => {
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  assert.ok(lies("js/app/kommunikation.js").includes("sosPassHtml()"));
  const st = lies("js/app/start.js"); for (const k of ['id: "notfallpass"', 'id: "standorte"', 'id: "bildschirmfoto"']) assert.ok(st.includes(k), k);
  assert.ok(lies("js/app/termine.js").includes('data-a="soAnfahrt"'));
  assert.ok(lies("js/app/rueckmeldung.js").includes("rmBildMachen"));
  assert.ok(lies("supabase/functions/_shared/nachrichten.js").includes("bk_rueckmeldungen x where x.bild"), "Bild wird nicht als verwaist gelöscht");
  for (const f of ["notfallpass", "standorte", "bildschirmfoto"]) assert.ok(lies("sw.js").includes(`"js/app/${f}.js"`), f);
  assert.ok(lies("lib/html2canvas/LICENSE").includes("MIT"));
});
