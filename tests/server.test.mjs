// Server-Tests: Edge-Function-Logik (bk-api) gegen eine echte PostgreSQL-Datenbank (PGlite) mit beiden Migrationen
// und allen Demodaten. Prüft Anmeldung, Sichtbarkeit je Rolle (Datenschutz!), Schreibrechte, Versionskonflikte, Abgleich.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten, sha256 } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let pg, db, d, codes;
const rufe = (body, token, ip = "1.2.3.4") => verarbeiten(db, body, { token, ip });
async function login(personId) {
  const r = await rufe({ aktion: "anmelden", code: codes[personId] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json.token;
}

before(async () => {
  ({ pg, db, d, codes } = await demoDatenbank({ jetzt: new Date("2026-10-15T10:00:00"), geaendert: "2026-10-01T00:00:00Z" }));
});

test("Anmeldung: falscher Code → 401, richtiger Code → Sitzung; ohne Sitzung kein Zugriff", async () => {
  assert.equal((await rufe({ aktion: "anmelden", code: "FALSCH99" })).status, 401);
  assert.equal((await rufe({ aktion: "laden" }, "kein-token")).status, 401);
  const t = await login("p-leitung");
  assert.ok(t.length > 30);
  const ve = await rufe({ aktion: "anmelden", code: codes[d.__konfig.demo_personen.eltern], verwaltung: true });
  assert.equal(ve.status, 403, "Eltern dürfen nicht in die Verwaltung");
});

test("Leitung sieht alles – aber nie Zugangscodes oder Code-Hashes", async () => {
  const r = await rufe({ aktion: "laden" }, await login("p-leitung"));
  assert.equal(r.status, 200);
  assert.equal(r.json.daten.personen.length, d.personen.length);
  assert.ok(r.json.daten.zugaenge.length > 0);
  for (const z of r.json.daten.zugaenge) { assert.equal(z.code, null); assert.equal(z.code_hash, undefined); }
  assert.ok(r.json.daten.personen.some((p) => p.notfall_info), "Leitung sieht Gesundheitsangaben");
  assert.equal(r.json.konfig.name, "Bachkreis Bergkamen");
});

test("Eltern sehen nur ihre Kinder: Antworten, Genehmigungen, Kontaktdaten", async () => {
  const eltern = d.__konfig.demo_personen.eltern;
  const kinder = d.eltern_kind.filter((e) => e.eltern_id === eltern).map((e) => e.kind_id);
  const r = await rufe({ aktion: "laden" }, await login(eltern));
  const D = r.json.daten;
  assert.ok(D.antworten.length > 0 && D.antworten.every((a) => kinder.includes(a.person_id)));
  assert.ok(D.genehmigungen.length > 0 && D.genehmigungen.every((g) => kinder.includes(g.kind_id)));
  for (const t of ["zugaenge", "spenden", "einkaeufe", "versand", "aenderungen"]) assert.equal((D[t] || []).length, 0, t);
  const fremd = D.personen.filter((p) => p.typ === "schueler" && !kinder.includes(p.id));
  assert.ok(fremd.every((p) => p.mobil === undefined && p.strasse === undefined && p.email === undefined && p.notfall_info === undefined), "fremde Kinder nur mit Namen");
  assert.ok(!D.personen.some((p) => ["spender", "partner", "dienstleister"].includes(p.typ)));
  const eigenesKind = D.personen.find((p) => p.id === kinder[0]);
  assert.ok(eigenesKind.strasse, "eigenes Kind mit Anschrift");
});

test("Schüler: nur Termine der eigenen Gruppen, nur eigene Antworten, Gruppenchat sichtbar", async () => {
  const s = d.__konfig.demo_personen.schueler;
  const gruppen = d.gruppe_zuordnung.filter((z) => z.person_id === s).map((z) => z.gruppe_id);
  const r = await rufe({ aktion: "laden" }, await login(s));
  const D = r.json.daten;
  assert.ok(D.termine.length > 0 && D.termine.every((t) => t.fuer_alle || t.gruppen.some((g) => gruppen.includes(g))));
  assert.ok(D.termine.some((t) => t.fuer_alle), "Termine für alle sind dabei");
  assert.ok(D.antworten.every((a) => a.person_id === s));
  assert.ok(D.unterhaltungen.some((u) => u.id === "u-a"));
  assert.ok(!D.unterhaltungen.some((u) => u.id === "u-fv"), "Vorstands-Chat unsichtbar");
  assert.ok(!D.unterhaltungen.some((u) => u.id === "u-eb"), "Eltern-Verteiler unsichtbar für Schüler");
});

test("Vorstand sieht keine Gesundheitsangaben, Lehrkraft schon", async () => {
  const v = await rufe({ aktion: "laden" }, await login("p-fv2"));
  assert.ok(v.json.daten.spenden.length > 0);
  assert.ok(!v.json.daten.personen.some((p) => p.notfall_info));
  const l = await rufe({ aktion: "laden" }, await login("p-lk1"));
  assert.ok(l.json.daten.personen.some((p) => p.notfall_info));
});

test("Schreiben: Eltern sagen für eigenes Kind zu – nicht für fremde; Genehmigung nur für eigene Kinder", async () => {
  const eltern = d.__konfig.demo_personen.eltern;
  const kind = d.eltern_kind.find((e) => e.eltern_id === eltern).kind_id;
  const t = await login(eltern);
  const termin = (await rufe({ aktion: "laden" }, t)).json.daten.termine[0];
  const ok = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "neu-1", termin_id: termin.id, person_id: kind, antwort: "ja", notiz: "" }] }, t);
  assert.equal(ok.json.ok, true, JSON.stringify(ok.json));
  assert.equal(ok.json.gespeichert[0].von_person_id, eltern, "Server setzt, wer geantwortet hat");
  const fremdesKind = d.personen.find((p) => p.typ === "schueler" && !d.eltern_kind.some((e) => e.eltern_id === eltern && e.kind_id === p.id)).id;
  const nein = await rufe({ aktion: "speichern", tab: "antworten", zeilen: [{ id: "neu-2", termin_id: termin.id, person_id: fremdesKind, antwort: "nein" }] }, t);
  assert.equal(nein.json.konflikte[0].grund, "NICHT_MEINE_PERSON");
  const g = d.genehmigungen.find((x) => x.kind_id === kind && x.status === "ausstehend");
  const ge = await rufe({ aktion: "speichern", tab: "genehmigungen", zeilen: [{ ...g, status: "erteilt", basis_version: 1 }] }, t);
  assert.equal(ge.json.ok, true, JSON.stringify(ge.json));
  assert.equal(ge.json.gespeichert[0].beantwortet_von, eltern);
  const schueler = await login(d.__konfig.demo_personen.schueler);
  const g2 = d.genehmigungen.find((x) => x.kind_id === d.__konfig.demo_personen.schueler) || g;
  const sv = await rufe({ aktion: "speichern", tab: "genehmigungen", zeilen: [{ ...g2, status: "erteilt" }] }, schueler);
  assert.equal(sv.json.ok, false, "Schüler kann keine Elterngenehmigung erteilen");
});

test("Schüler darf keine Termine anlegen und keine Stammdaten ändern", async () => {
  const t = await login(d.__konfig.demo_personen.schueler);
  const r = await rufe({ aktion: "speichern", tab: "termine", zeilen: [{ titel: "Party", art_id: "ta-sonst", beginn: "2026-11-01T18:00:00Z", gruppen: ["g-a"] }] }, t);
  assert.equal(r.json.konflikte[0].grund, "KEIN_SCHREIBRECHT");
  const p = await rufe({ aktion: "speichern", tab: "personen", zeilen: [{ ...d.personen.find((x) => x.id === d.__konfig.demo_personen.schueler), nachname: "Hacker", benachrichtigung: { sos: ["push"] } }] }, t);
  assert.equal(p.json.ok, true);
  assert.notEqual(p.json.gespeichert[0].nachname, "Hacker", "nur Benachrichtigungs-Einstellung wird übernommen");
  assert.deepEqual(p.json.gespeichert[0].benachrichtigung, { sos: ["push"] });
});

test("Versionskonflikt: gleichzeitige Änderung wird erkannt, nicht überschrieben", async () => {
  const t = await login("p-leitung");
  const termin = d.termine[3];
  const a = await rufe({ aktion: "speichern", tab: "termine", zeilen: [{ ...termin, ort: "Aula", basis_version: 1 }] }, t);
  assert.equal(a.json.ok, true);
  assert.equal(a.json.gespeichert[0].version, 2, "Trigger erhöht die Version");
  const b = await rufe({ aktion: "speichern", tab: "termine", zeilen: [{ ...termin, ort: "Turnhalle", basis_version: 1 }] }, t);
  assert.equal(b.json.konflikte[0].grund, "VERSION");
  assert.equal(b.json.konflikte[0].zeile.ort, "Aula");
});

test("Zugang: neuer Code wird nur als Hash gespeichert und funktioniert sofort", async () => {
  const t = await login("p-leitung");
  const z = d.zugaenge.find((x) => x.person_id === "p-lk2");
  const r = await rufe({ aktion: "speichern", tab: "zugaenge", zeilen: [{ ...z, code: "NEUCODE7" }] }, t);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.gespeichert[0].code, null);
  const roh = (await db.q(`select code, code_hash from bk_zugaenge where id = $1`, [z.id]))[0];
  assert.equal(roh.code, null); assert.equal(roh.code_hash, await sha256("NEUCODE7"));
  assert.equal((await rufe({ aktion: "anmelden", code: "neucode7" })).status, 200, "Groß-/Kleinschreibung egal");
  assert.equal((await rufe({ aktion: "anmelden", code: codes["p-lk2"] })).status, 401, "alter Code gesperrt");
});

test("Abgleich: Laden „seit“ liefert nur Änderungen (inkl. Löschungen)", async () => {
  const t = await login("p-leitung");
  const voll = await rufe({ aktion: "laden" }, t);
  const pw = d.pinnwand[0];
  await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [{ ...pw, geloescht_am: new Date().toISOString() }] }, t);
  const delta = await rufe({ aktion: "laden", seit: voll.json.jetzt }, t);
  assert.equal(delta.json.komplett, false);
  assert.ok(delta.json.daten.pinnwand.some((z) => z.id === pw.id && z.geloescht_am));
  assert.ok(!delta.json.daten.register && !delta.json.daten.inventar, "unveränderte Tabellen fehlen im Delta");
});

test("Chat: Schüler schreibt in Gruppenchat, markiert fremde Nachricht gelesen ohne sie zu ändern", async () => {
  const s = d.__konfig.demo_personen.schueler;
  const t = await login(s);
  const n = await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ id: "n-neu", unterhaltung_id: "u-a", von: s, text: "Hallo!" }] }, t);
  assert.equal(n.json.ok, true, JSON.stringify(n.json));
  const fremd = d.nachrichten.find((x) => x.unterhaltung_id === "u-a" && x.von !== s);
  const g = await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ ...fremd, text: "verändert", gelesen_von: [...fremd.gelesen_von, s] }] }, t);
  assert.equal(g.json.gespeichert[0].text, fremd.text);
  assert.ok(g.json.gespeichert[0].gelesen_von.includes(s));
  const v = await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ id: "n-x", unterhaltung_id: "u-fv", von: s, text: "rein" }] }, t);
  assert.equal(v.json.konflikte[0].grund, "UNTERHALTUNG_NICHT_SICHTBAR");
});

test("Zu viele Fehlversuche von einer IP → gesperrt (429)", async () => {
  for (let i = 0; i < 20; i++) await rufe({ aktion: "anmelden", code: "XXXXXX" + i }, null, "9.9.9.9");
  assert.equal((await rufe({ aktion: "anmelden", code: codes["p-leitung"] }, null, "9.9.9.9")).status, 429);
  assert.equal((await rufe({ aktion: "anmelden", code: codes["p-leitung"] }, null, "8.8.8.8")).status, 200);
});

test("Versand vormerken: Eltern dürfen nicht an beliebige Personen senden", async () => {
  const e = await login(d.__konfig.demo_personen.eltern);
  assert.equal((await rufe({ aktion: "versenden", ereignis: "rundschreiben", an: ["p-leitung"], text: "x" }, e)).status, 403);
  const l = await rufe({ aktion: "versenden", ereignis: "rundschreiben", an: ["p-lk1", "p-lk2"], kanaele: ["push", "mail"], betreff: "Test", text: "Hallo" }, await login("p-leitung"));
  assert.equal(l.json.vorgemerkt, 2); // Lehrkräfte ohne Push-Abo: E-Mail (Push nicht erreichbar)
});

test("Privatsphäre: Freigaben setzt nur die Person selbst; andere sehen nur Freigegebenes; andere Geräte abmelden", async () => {
  const sId = d.__konfig.demo_personen.schueler;
  const t1 = await login(sId), t2 = await login(sId);
  const ich = (await rufe({ aktion: "laden" }, t1)).json.daten.personen.find((p) => p.id === sId);
  const r = await rufe({ aktion: "speichern", tab: "personen", zeilen: [{ ...ich, freigaben: { mobil: true, geburtstag: true, adresse: false, boese: true }, rollen: ["admin"], basis_version: ich.version }] }, t1);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const roh = (await db.q(`select freigaben, rollen from bk_personen where id = $1`, [sId]))[0];
  assert.deepEqual(roh.freigaben, { geburtstag: true, mobil: true, email: false, adresse: false });
  assert.ok(!(roh.rollen || []).includes("admin"), "Rollen kann man sich nicht selbst geben");
  const e = await login(d.__konfig.demo_personen.eltern);
  const fremd = (await rufe({ aktion: "laden" }, e)).json.daten.personen.find((p) => p.id === sId);
  if (fremd) { assert.equal(fremd.strasse, undefined); assert.ok("mobil" in fremd); assert.equal(fremd.geburtsdatum, undefined); }
  const ab = await rufe({ aktion: "abmelden_andere" }, t1);
  assert.ok(ab.json.anzahl >= 1);
  assert.equal((await rufe({ aktion: "laden" }, t2)).status, 401, "anderes Gerät ist abgemeldet");
  assert.equal((await rufe({ aktion: "laden" }, t1)).status, 200, "dieses Gerät bleibt angemeldet");
});

test("Pinnwand wie KC: privat bleibt privat (auch vor der Leitung), Farben 1–4, höchstens 4 Zettel, 200 Zeichen", async () => {
  const s = d.__konfig.demo_personen.schueler, anderer = d.pinnwand.find((z) => z.id === "pw-5").von;
  const leitung = await login("p-leitung"), schueler = await login(s), zweiter = await login(anderer);
  const ids = async (t) => (await rufe({ aktion: "laden" }, t)).json.daten.pinnwand.map((z) => z.id);
  assert.ok((await ids(schueler)).includes("pw-6"), "Empfänger sieht den privaten Zettel");
  assert.ok(!(await ids(zweiter)).includes("pw-6"), "andere Schüler nicht");
  assert.ok(!(await ids(leitung)).includes("pw-6"), "auch die Leitung nicht");
  assert.ok(!(await ids(schueler)).includes("pw-4"), "„nur für mich“ sieht nur der Verfasser");
  // anheften: Farbe vergibt der Server, die fünfte geht nicht
  const neu = (i, mehr = {}) => ({ id: `pw-t${i}`, text: `Zettel ${i}`, von: s, fuer: "alle", farbe: 4, ...mehr });
  for (let i = 1; i <= 4; i++) {
    const r = await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [neu(i)] }, schueler);
    assert.equal(r.json.ok, true, JSON.stringify(r.json)); assert.equal(r.json.gespeichert[0].farbe, i); assert.ok(r.json.gespeichert[0].anzahl > 10);
  }
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [neu(5)] }, schueler)).json.konflikte[0].grund, "PINNWAND_VOLL");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [neu(6, { von: anderer, text: "x".repeat(201) })] }, zweiter)).json.konflikte[0].grund, "TEXT_ZU_LANG");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [neu(7, { von: anderer, fuer: "personen", personen: [d.__konfig.demo_personen.eltern] })] }, zweiter)).json.konflikte[0].grund, "EMPFAENGER_FEHLT", "fremde Eltern sind für Schüler nicht wählbar");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [neu(8, { von: s })] }, zweiter)).json.konflikte[0].grund, "NUR_EIGENE_ZETTEL");
  // fremden Zettel ändern geht nicht; abnehmen: Verfasser oder Leitung
  const pw5 = (await rufe({ aktion: "laden" }, leitung)).json.daten.pinnwand.find((z) => z.id === "pw-5");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [{ ...pw5, text: "gehackt" }] }, schueler)).json.konflikte[0].grund, "NUR_EIGENE_ZETTEL");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [{ ...pw5, geloescht_am: new Date().toISOString() }] }, schueler)).json.ok, false);
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand", zeilen: [{ ...pw5, geloescht_am: new Date().toISOString() }] }, leitung)).json.ok, true, "Leitung darf sichtbare Zettel abnehmen");
});

test("Pinnwand: gesehen/erledigt nur für sich selbst; der Verfasser sieht, wer gelesen hat; Bescheid nur einmal und nur vom Verfasser", async () => {
  const s = d.__konfig.demo_personen.schueler, anderer = d.pinnwand.find((z) => z.id === "pw-5").von;
  const leitung = await login("p-leitung"), schueler = await login(s), zweiter = await login(anderer);
  const g = { id: `pw-2:${s}`, zettel_id: "pw-2", person_id: s, gesehen_am: "2000-01-01T00:00:00Z", erledigt_am: "2000-01-01T00:00:00Z" };
  const r = await rufe({ aktion: "speichern", tab: "pinnwand_gelesen", zeilen: [g] }, schueler);
  assert.equal(r.json.ok, true, JSON.stringify(r.json)); assert.notEqual(r.json.gespeichert[0].gesehen_am, g.gesehen_am, "Zeit setzt der Server");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand_gelesen", zeilen: [{ ...g, id: `pw-2:${anderer}`, person_id: anderer }] }, schueler)).json.konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await rufe({ aktion: "speichern", tab: "pinnwand_gelesen", zeilen: [{ ...g, id: `pw-4:${s}`, zettel_id: "pw-4" }] }, schueler)).json.konflikte[0].grund, "ZETTEL_NICHT_SICHTBAR");
  const fremd = (await rufe({ aktion: "laden" }, zweiter)).json.daten.pinnwand_gelesen;
  assert.ok(fremd.every((x) => x.person_id === anderer), "Schüler sehen nur ihr eigenes „gelesen“");
  const autor = (await rufe({ aktion: "laden" }, leitung)).json.daten.pinnwand_gelesen;
  assert.ok(autor.some((x) => x.zettel_id === "pw-2" && x.person_id === s && x.erledigt_am), "Verfasser sieht, wer erledigt hat");
  // Bescheid über den Communicator
  assert.equal((await rufe({ aktion: "versenden", ereignis: "pinnwand", zettel_id: "pw-2", text: "x" }, schueler)).status, 403, "nur der Verfasser");
  const b1 = await rufe({ aktion: "versenden", ereignis: "pinnwand", zettel_id: "pw-6", betreff: "📌 Post-it", text: "x" }, await login("p-lk1"));
  assert.equal(b1.json.ok, true); assert.ok(b1.json.auftraege >= 1);
  const b2 = await rufe({ aktion: "versenden", ereignis: "pinnwand", zettel_id: "pw-6", betreff: "📌 Post-it", text: "x" }, await login("p-lk1"));
  assert.equal(b2.json.schon, true, "je Zettel nur einmal");
  const an = (await db.q(`select distinct an_id from bk_versand where korrelation = 'pinnwand:pw-6'`)).map((x) => x.an_id);
  assert.deepEqual(an, [s], "nur der Empfänger des privaten Zettels (Eltern nicht – Regel eltern: nein)");
});
