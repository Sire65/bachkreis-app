// 🎻 Übe-Tagebuch und 📆 Kalender-Abo: wer sieht welche Übe-Einträge, was darf man eintragen, liefert der Abo-Link nur die eigenen Termine?
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten, kalenderFeed } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

const GEHEIM = "test-geheimnis-fuer-kalender";
let db, d, codes, dp;
const dienste = { kalenderGeheimnis: GEHEIM, basisUrl: "https://beispiel.supabase.co/functions/v1/bk-api" };
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.9" }, dienste);
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;

before(async () => {
  ({ db, d, codes } = await demoDatenbank({ jetzt: new Date(), geaendert: "2026-10-01T00:00:00Z" }));
  dp = { ...d.__konfig.demo_personen };
  dp.eltern = d.eltern_kind.find((e) => e.kind_id === dp.schueler).eltern_id; // Eltern genau dieses Kindes
});

test("Übe-Tagebuch: Schüler sieht seine Einträge, Eltern die des Kindes, Leitung nur geteilte, andere Schüler nichts", async () => {
  const anzahl = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.uebungen?.length ?? 0;
  const eigen = d.uebungen.length;
  assert.ok(eigen > 5);
  assert.equal(await anzahl(dp.schueler), eigen);
  assert.equal(await anzahl(dp.eltern), eigen);
  assert.equal(await anzahl("p-leitung"), eigen, "geteilte Einträge sieht die Leitung");
  const anderer = d.personen.find((p) => p.typ === "schueler" && p.id !== dp.schueler);
  assert.equal(await anzahl(anderer.id), 0, "fremde Schüler sehen nichts");
  assert.equal(await anzahl(dp.vorstand), 0, "Vorstand sieht keine Übe-Einträge");
});

test("Übe-Tagebuch: eintragen nur für sich/eigene Kinder, mit gültigen Werten", async () => {
  const t = await login(dp.schueler);
  const heute = new Date().toISOString().slice(0, 10);
  const ok = await rufe({ aktion: "speichern", tab: "uebungen", zeilen: [{ id: "ue-neu", person_id: dp.schueler, datum: heute, minuten: 20, inhalt: ["stueck", "quatsch"], gefuehl: 4, notiz: "x".repeat(900) }] }, t);
  assert.equal(ok.json.gespeichert.length, 1, JSON.stringify(ok.json));
  assert.deepEqual(ok.json.gespeichert[0].inhalt, ["stueck"], "unbekannte Inhalte fallen weg");
  assert.equal(ok.json.gespeichert[0].notiz.length, 500);
  const fremd = d.personen.find((p) => p.typ === "schueler" && p.id !== dp.schueler);
  const r = await rufe({ aktion: "speichern", tab: "uebungen", zeilen: [{ id: "ue-x", person_id: fremd.id, datum: heute, minuten: 20 }] }, t);
  assert.equal(r.json.konflikte[0].grund, "NICHT_MEINE_PERSON");
  const zuViel = await rufe({ aktion: "speichern", tab: "uebungen", zeilen: [{ id: "ue-y", person_id: dp.schueler, datum: heute, minuten: 5000 }] }, t);
  assert.equal(zuViel.json.konflikte[0].grund, "MINUTEN_UNGUELTIG");
  const eltern = await rufe({ aktion: "speichern", tab: "uebungen", zeilen: [{ id: "ue-e", person_id: dp.schueler, datum: heute, minuten: 15 }] }, await login(dp.eltern));
  assert.equal(eltern.json.gespeichert.length, 1, "Eltern dürfen fürs Kind eintragen");
});

test("Übezeiten werden bereinigt gespeichert (nur eigene Person)", async () => {
  const t = await login(dp.schueler);
  const p = d.personen.find((x) => x.id === dp.schueler);
  const r = await rufe({ aktion: "speichern", tab: "personen", zeilen: [{ ...p, uebe_plan: { an: true, tage: [1, 9, 3, 3], zeit: "25:99", dauer: 9999, ziel: 200 }, kalender_alarm: 60 }] }, t);
  const z = r.json.gespeichert[0];
  assert.deepEqual(z.uebe_plan, { an: true, tage: [1, 3], zeit: "17:00", dauer: 30, ziel: 200, alarm: 10 });
  assert.equal(z.kalender_alarm, 60);
});

test("📆 Kalender-Abo: Link nur mit Anmeldung, Feed nur mit richtigem Schlüssel, neuer Link macht den alten ungültig", async () => {
  const t = await login(dp.schueler);
  assert.equal((await rufe({ aktion: "kalender_link" })).status, 401);
  const l1 = await rufe({ aktion: "kalender_link" }, t);
  assert.equal(l1.status, 200);
  assert.match(l1.json.webcal, /^webcal:\/\/beispiel\.supabase\.co\/functions\/v1\/bk-api\?kalender=/);
  const token = decodeURIComponent(l1.json.url.split("kalender=")[1]);
  const f = await kalenderFeed(db, token, GEHEIM);
  assert.equal(f.status, 200);
  assert.match(f.text, /BEGIN:VCALENDAR/); assert.match(f.text, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE/, "Übezeiten als Serie");
  assert.ok((f.text.match(/BEGIN:VEVENT/g) || []).length > 2, "Termine enthalten");
  assert.equal((await kalenderFeed(db, token.slice(0, -2) + "xx", GEHEIM)).status, 404, "falscher Schlüssel");
  assert.equal((await kalenderFeed(db, token, "anderes-geheimnis")).status, 404);
  const l2 = await rufe({ aktion: "kalender_link", neu: true }, t);
  assert.notEqual(l2.json.url, l1.json.url);
  assert.equal((await kalenderFeed(db, token, GEHEIM)).status, 404, "alter Link gilt nicht mehr");
  assert.equal((await kalenderFeed(db, decodeURIComponent(l2.json.url.split("kalender=")[1]), GEHEIM)).status, 200);
  assert.equal((await verarbeiten(db, { aktion: "kalender_link" }, { token: t }, {})).status, 503, "ohne Geheimnis: nicht eingerichtet");
});

test("📆 Kalender-Abo der Eltern: Termine des Kindes mit Vornamen davor", async () => {
  const l = await rufe({ aktion: "kalender_link" }, await login(dp.eltern));
  const f = await kalenderFeed(db, decodeURIComponent(l.json.url.split("kalender=")[1]), GEHEIM);
  const kind = d.personen.find((p) => p.id === dp.schueler).vorname;
  assert.match(f.text, new RegExp(`SUMMARY:${kind}: `));
});
