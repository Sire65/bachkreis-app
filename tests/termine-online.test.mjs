// 📅 Termine für alle, Teilnahme (erforderlich/erwünscht/Info), eigene Termine · 🟢 Wer ist online · 👋 Anklopfen
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.7" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
before(async () => {
  ({ db, d, codes } = await demoDatenbank({ jetzt: new Date(), geaendert: "2026-10-01T00:00:00Z" }));
  dp = { ...d.__konfig.demo_personen };
  dp.eltern = d.eltern_kind.find((e) => e.kind_id === dp.schueler).eltern_id;
});
const heute = () => new Date().toISOString().slice(0, 10);

test("🌍 Termine für alle: Schüler, Eltern und Ehemalige sehen sie", async () => {
  const alle = d.termine.filter((t) => t.fuer_alle).map((t) => t.id);
  assert.ok(alle.length >= 2);
  const ehem = d.gruppe_zuordnung.filter((z) => z.gruppe_id === "g-d").map((z) => z.person_id).find((p) => d.zugaenge.some((z) => z.person_id === p && z.aktiv) && d.personen.find((x) => x.id === p)?.status !== "ausgetreten");
  assert.ok(ehem, "Ehemalige mit Zugang");
  for (const pid of [dp.schueler, dp.eltern, ehem]) {
    const D = (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
    for (const id of alle) assert.ok(D.termine.some((t) => t.id === id), `${pid} sieht ${id}`);
  }
});

test("❗ Absage bei erforderlicher Teilnahme braucht einen Grund · ℹ️ Info-Termine ohne Antwort", async () => {
  const t = await login(dp.schueler);
  const D = (await rufe({ aktion: "laden" }, t)).json.daten;
  const pflicht = D.termine.find((x) => x.teilnahme === "pflicht" && new Date(x.beginn) > new Date());
  const info = D.termine.find((x) => x.teilnahme === "info");
  let r = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "a-test-1", termin_id: pflicht.id, person_id: dp.schueler, antwort: "nein", notiz: "" }] }, t);
  assert.equal(r.json.konflikte[0].grund, "GRUND_FEHLT");
  r = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "a-test-1", termin_id: pflicht.id, person_id: dp.schueler, antwort: "nein", notiz: "krank" }] }, t);
  assert.equal(r.json.gespeichert.length, 1);
  r = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "a-test-2", termin_id: info.id, person_id: dp.schueler, antwort: "ja" }] }, t);
  assert.equal(r.json.konflikte[0].grund, "NUR_INFO");
  r = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "a-test-3", termin_id: pflicht.id, person_id: dp.schueler, antwort: "vielleicht", nachfragen_am: heute() }] }, t);
  assert.equal(r.json.gespeichert[0].nachfragen_am?.slice?.(0, 10) ?? r.json.gespeichert[0].nachfragen_am, heute());
});

test("🙋 Eigene Termine: privat (nur ich und meine Eltern), nur für mich bzw. meine Kinder", async () => {
  const anzahl = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.eigene_termine?.length ?? 0;
  const n = d.eigene_termine.length;
  assert.equal(await anzahl(dp.schueler), n);
  assert.equal(await anzahl(dp.eltern), n);
  assert.equal(await anzahl("p-leitung"), 0, "auch die Leitung sieht private Termine nicht");
  const t = await login(dp.schueler), b = new Date(Date.now() + 86400000).toISOString();
  const ok = await rufe({ aktion: "speichern", tab: "eigene_termine", zeilen: [{ id: "et-neu", person_id: dp.schueler, art: "ueben", titel: "Üben", beginn: b, erinnerung: 999 }] }, t);
  assert.equal(ok.json.gespeichert[0].erinnerung, 0, "unbekannte Erinnerung → keine");
  const fremd = d.personen.find((p) => p.typ === "schueler" && p.id !== dp.schueler).id;
  const nein = await rufe({ aktion: "speichern", tab: "eigene_termine", zeilen: [{ id: "et-x", person_id: fremd, titel: "x", beginn: b }] }, t);
  assert.equal(nein.json.konflikte[0].grund, "NICHT_MEINE_PERSON");
});

test("🟢 Online & 👋 Anklopfen: nur freigegebene Kreise, nur erlaubte Chat-Partner, Antwort nur vom Empfänger", async () => {
  const tl = await login("p-leitung"), ts = await login(dp.schueler);
  // Standard: nur Leitung & Lehrkräfte – Schüler bekommen die Funktion nicht
  assert.equal((await rufe({ aktion: "online" }, ts)).json.erlaubt, false);
  let l = await rufe({ aktion: "online" }, tl);
  assert.equal(l.json.erlaubt, true);
  assert.ok(!l.json.liste.some((p) => p.id === dp.schueler), "Schüler erscheint nicht, solange Schüler nicht freigegeben sind");
  // Leitung gibt Schüler frei
  await rufe({ aktion: "konfig_setzen", schluessel: "online_fuer", wert: ["leitung", "schueler"] }, tl);
  assert.equal((await rufe({ aktion: "online" }, ts)).json.erlaubt, true);
  l = await rufe({ aktion: "online" }, tl);
  assert.ok(l.json.liste.some((p) => p.id === dp.schueler));
  const k = await rufe({ aktion: "anklopfen", an: dp.schueler }, tl);
  assert.equal(k.status, 200, JSON.stringify(k.json));
  assert.equal((await rufe({ aktion: "anklopfen", an: dp.schueler }, tl)).status, 429, "nicht zweimal in einer Minute");
  const D = (await rufe({ aktion: "laden" }, ts)).json.daten;
  const kz = D.klopfen.find((x) => x.id === k.json.id);
  assert.ok(kz, "Empfänger sieht das Anklopfen");
  assert.equal((await rufe({ aktion: "speichern", tab: "klopfen", zeilen: [{ ...kz, antwort: "ja" }] }, tl)).json.konflikte[0].grund, "NICHT_AN_MICH");
  assert.equal((await rufe({ aktion: "speichern", tab: "klopfen", zeilen: [{ ...kz, antwort: "spaeter" }] }, ts)).json.gespeichert[0].antwort, "spaeter");
  assert.equal((await rufe({ aktion: "speichern", tab: "klopfen", zeilen: [{ id: "kl-neu", von: dp.schueler, an: "p-leitung", zeit: new Date().toISOString() }] }, ts)).json.konflikte[0].grund, "NUR_UEBER_ANKLOPFEN");
  // Mich nicht als online zeigen
  await rufe({ aktion: "online", sichtbar: false }, ts);
  assert.ok(!(await rufe({ aktion: "online" }, tl)).json.liste.some((p) => p.id === dp.schueler));
  // fremde Schüler sieht ein Schüler nur, wenn Schüler untereinander schreiben dürfen
  await rufe({ aktion: "konfig_setzen", schluessel: "chat_schueler_untereinander", wert: false }, tl);
  const anderer = d.personen.find((p) => p.typ === "schueler" && p.id !== dp.schueler && codes[p.id]);
  await rufe({ aktion: "online" }, await login(anderer.id));
  await rufe({ aktion: "online", sichtbar: true }, ts);
  assert.ok(!(await rufe({ aktion: "online" }, ts)).json.liste.some((p) => p.id === anderer.id), "Kinderschutz");
});
