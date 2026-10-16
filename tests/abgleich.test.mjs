// 🏫 0.27.0 Abgleich mit der Internetseite: Gastfamilien, Gäste, Anfragen, Chronik, Dokumente, Partner, Repertoire.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { repertoire, anfrageZuTermin } from "../js/kern/logik.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.7" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("🏠 Gastfamilie: Eltern bieten nur im eigenen Namen an, „bestätigt“ setzt die Leitung, Schüler dürfen nicht", async () => {
  const andere = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && !d.gastgeber.some((g) => g.person_id === p.id));
  let r = await speichern(andere.id, "gastgeber", { id: "gg-neu", projekt_id: "pr-fruehling", person_id: andere.id, plaetze: 2, status: "bestaetigt", notiz: "von mir" });
  assert.equal(r.gespeichert[0].status, "angeboten", "nicht selbst bestätigen");
  assert.equal((await db.q(`select notiz from bk_gastgeber where id = 'gg-neu'`))[0].notiz, null, "interne Notiz nicht setzbar");
  assert.equal((await speichern(andere.id, "gastgeber", { id: "gg-x", projekt_id: "pr-fruehling", person_id: dp.eltern, plaetze: 1 })).konflikte[0].grund, "NUR_EIGENES_ANGEBOT");
  assert.equal((await speichern(andere.id, "gastgeber", { id: "gg-y", projekt_id: "pr-herbst", person_id: andere.id, plaetze: 1 })).konflikte[0].grund, "KEIN_AUSTAUSCH");
  assert.equal((await speichern(andere.id, "gastgeber", { id: "gg-z", projekt_id: "pr-fruehling", person_id: andere.id, plaetze: 9 })).konflikte[0].grund, "PLAETZE_UNGUELTIG");
  assert.equal((await speichern(dp.schueler, "gastgeber", { id: "gg-s", projekt_id: "pr-fruehling", person_id: dp.schueler, plaetze: 1 })).konflikte[0].grund, "NUR_ERWACHSENE");
  // bestätigtes Angebot bleibt bestätigt, Familie kann absagen
  const best = d.gastgeber.find((g) => g.status === "bestaetigt");
  r = await speichern(best.person_id, "gastgeber", { ...best, plaetze: 3 });
  assert.equal(r.gespeichert[0].status, "bestaetigt");
  r = await speichern(best.person_id, "gastgeber", { ...r.gespeichert[0], status: "abgesagt" });
  assert.equal(r.gespeichert[0].status, "abgesagt");
});

test("🧳 Gäste: Gastfamilie sieht nur die eigenen Gäste (ohne interne Notiz), andere Eltern keine", async () => {
  const gg = d.gastgeber.find((g) => g.id === "gg-2");
  await db.q(`update bk_gaeste set notiz = 'intern' where gastgeber_id = 'gg-2'`);
  const E = await laden(gg.person_id);
  assert.ok(E.gaeste.length >= 1 && E.gaeste.every((g) => g.gastgeber_id === "gg-2"));
  assert.ok(E.gaeste.every((g) => !("notiz" in g) || g.notiz == null), "interne Notiz bleibt intern");
  const fremd = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && !d.gastgeber.some((g) => g.person_id === p.id));
  assert.equal((await laden(fremd.id)).gaeste.length, 0);
  assert.equal((await laden(dp.schueler)).gaeste.length, 0);
});

test("📨 Anfragen nur für Leitung/Lehrkräfte/Vorstand · 📜 Chronik für alle · 🤝 Partner nicht für Eltern", async () => {
  const S = await laden(dp.schueler), E = await laden(dp.eltern), L = await laden(dp.leitung), V = await laden(dp.vorstand);
  assert.equal((S.anfragen || []).length, 0); assert.equal((E.anfragen || []).length, 0);
  assert.ok(L.anfragen.length >= 3 && V.anfragen.length >= 3);
  assert.ok(S.chronik.length >= 9 && E.chronik.some((c) => c.jahr === 1969));
  assert.equal((E.partner || []).length, 0); assert.ok(L.partner.length >= 4);
  assert.equal((await speichern(dp.eltern, "anfragen", { id: "an-x", anlass: "x", veranstalter: "y" })).konflikte?.length, 1, "Eltern legen keine Anfragen an");
});

test("📂 Dokumente: Sichtbarkeit alle / Eltern / Verwaltung", async () => {
  const S = await laden(dp.schueler), E = await laden(dp.eltern), L = await laden(dp.leitung);
  const ids = (x) => x.dokumente.map((y) => y.id).sort();
  assert.ok(ids(S).includes("dok-1") && !ids(S).includes("dok-4") && !ids(S).includes("dok-5"));
  assert.ok(ids(E).includes("dok-4") && !ids(E).includes("dok-5"));
  assert.ok(ids(L).includes("dok-5"));
});

test("🎼 Repertoire aus Programmen und Chronik · Anfrage → Termin", () => {
  const dd = erzeugeDemodaten(new Date()), m = { liste: (t, f = () => true) => (dd[t] || []).filter(f), hole: (t, id) => (dd[t] || []).find((x) => x.id === id) };
  dd.chronik.push({ id: "ch-t", jahr: 2001, titel: "Test", programm: "W. A. Mozart – Eine kleine Nachtmusik\nEigenes Stück" });
  const r = repertoire(m);
  assert.ok(r.length >= 8);
  assert.ok(r.some((e) => e.anzeige.includes("Herbstwind")), "eigene Komposition aus dem Programm");
  assert.ok(r.some((e) => e.anzeige === "Eigenes Stück" && e.auftritte[0].jahr === 2001));
  const t = anfrageZuTermin({ anlass: "Fest", veranstalter: "Stadt", datum: "2026-12-01T17:00:00.000Z", dauer_min: 30, gruppen: ["g-a"] }, "ta-konzert");
  assert.equal(t.ende, "2026-12-01T17:30:00.000Z"); assert.deepEqual(t.gruppen, ["g-a"]); assert.equal(t.teilnahme, "pflicht");
});
