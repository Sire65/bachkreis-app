// 🛡️ Kinder- und Datenschutz (0.20.0): Chat mit Kindern, Freigabegrenze, Need-to-know, interne Vermerke, Gesundheit, Einwilligungen, Anwesenheit.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { kontext, filtern } from "../supabase/functions/_shared/regeln.js";
import { chatPartnerErlaubt, istMinderjaehrig, chatMitgliederMitKopie } from "../js/kern/schema.js";
import { einwilligung, fotoErlaubnis, fehlzeiten } from "../js/kern/logik.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp, kind, elternVonKind;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.7" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;

before(async () => {
  ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() }));
  dp = { ...d.__konfig.demo_personen };
  kind = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && d.eltern_kind.some((e) => e.kind_id === p.id) && p.id !== dp.schueler);
  elternVonKind = d.eltern_kind.filter((e) => e.kind_id === kind.id).map((e) => e.eltern_id);
});

test("Chat-Regel: Kinder privat nur mit Leitung/Lehrkräften, eigenen Eltern und (abschaltbar) anderen Kindern", () => {
  const s = { id: "s", typ: "schueler" }, s2 = { id: "s2", typ: "schueler" }, lk = { id: "l", typ: "lehrkraft" }, fv = { id: "f", typ: "foerderverein", rollen: ["vorstand"] };
  const nw = { id: "n", typ: "eltern", rollen: ["notenwart"] }, el = { id: "e", typ: "eltern" };
  assert.equal(chatPartnerErlaubt(lk, s), true);
  assert.equal(chatPartnerErlaubt(fv, s), false, "Vorstand nicht mit fremden Kindern");
  assert.equal(chatPartnerErlaubt(nw, s), false, "Notenwart (Elternteil) nicht mit fremden Kindern");
  assert.equal(chatPartnerErlaubt(s, nw), false);
  assert.equal(chatPartnerErlaubt(nw, s, { verwandt: true }), true, "eigenes Kind");
  assert.equal(chatPartnerErlaubt(nw, el), true, "Erwachsene untereinander (Verwalter)");
  assert.equal(chatPartnerErlaubt(s, s2, { schuelerUntereinander: false }), false);
  assert.equal(istMinderjaehrig({ typ: "schueler", geburtsdatum: "2000-01-01" }), false);
  assert.equal(istMinderjaehrig({ typ: "schueler" }), true, "ohne Geburtsdatum: minderjährig");
  const m = chatMitgliederMitKopie(lk, ["s"], { person: () => s, elternVon: () => ["e1", "e2"] });
  assert.deepEqual(m.mitglieder, ["l", "s", "e1", "e2"]);
  assert.deepEqual(chatMitgliederMitKopie(lk, ["s"], { person: () => s, elternVon: () => ["e1"], kopie: false }).kopie, []);
});

test("Server: Lehrkraft schreibt einem Kind → Runde mit den Eltern; Vorstand darf es gar nicht", async () => {
  const r = await speichern(dp.lehrkraft, "unterhaltungen", { id: "u-test-1", art: "einzel", titel: "", mitglieder: [dp.lehrkraft, kind.id] });
  assert.equal(r.gespeichert.length, 1, JSON.stringify(r));
  const u = r.gespeichert[0];
  assert.equal(u.art, "runde");
  for (const e of elternVonKind) assert.ok(u.mitglieder.includes(e), "Eltern in Kopie");
  assert.match(u.titel, /mit Eltern/);
  const v = await speichern(dp.vorstand, "unterhaltungen", { id: "u-test-2", art: "einzel", mitglieder: [dp.vorstand, kind.id] });
  assert.equal(v.konflikte[0].grund, "PARTNER_NICHT_ERLAUBT");
});

test("Server: Freigabe über der Grenze nur durch den Förderverein-Vorstand", async () => {
  const rep = d.reparaturen.find((x) => x.status === "angebot") || d.reparaturen[0];
  const teuer = { ...rep, status: "freigegeben", kosten: 9999 };
  assert.equal((await speichern("p-lk3", "reparaturen", teuer)).konflikte[0].grund, "FREIGABE_UEBER_GRENZE", "Instrumentenwart");
  assert.equal((await speichern(dp.leitung, "reparaturen", teuer)).konflikte[0].grund, "FREIGABE_UEBER_GRENZE", "Leitung über Grenze");
  const ok = await speichern(dp.vorstand, "reparaturen", teuer);
  assert.equal(ok.gespeichert[0].freigegeben_von, dp.vorstand);
});

test("Need-to-know & Vermerke: Vorstand sieht von Kindern kein Geburtsdatum/keine Adresse; Schüler keine internen Bemerkungen", async () => {
  const D = await laden(dp.vorstand);
  const k = D.personen.find((p) => p.id === kind.id);
  assert.ok(k && k.vorname, "Name ja");
  for (const f of ["geburtsdatum", "strasse", "ort", "notfall_info", "mobil"]) assert.equal(k[f], undefined, f);
  assert.ok(!(D.antworten || []).length, "keine Zu-/Absagen (Absagegründe)");
  const S = await laden(dp.schueler);
  assert.ok(S.gruppe_zuordnung.length && S.gruppe_zuordnung.every((z) => !("grund" in z)), "Grund des Gruppenwechsels fehlt");
  assert.ok(S.projekte.every((p) => !("checkliste" in p)), "Projekt-Checkliste fehlt");
  const L = await laden(dp.leitung);
  assert.ok(L.personen.find((p) => p.id === kind.id).geburtsdatum, "Leitung sieht alles");
});

test("🩺 Gesundheit: Eltern pflegen ihr Kind, andere sehen nichts; Begleiter nur während der Fahrt", async () => {
  const e = elternVonKind[0];
  const r = await speichern(e, "gesundheit", { id: "gs-test", person_id: kind.id, allergien: "Erdnüsse", geprueft_am: "2000-01-01", loeschen_am: "2099-01-01" });
  assert.equal(r.gespeichert.length, 1, JSON.stringify(r));
  assert.equal(r.gespeichert[0].geprueft_am.slice?.(0, 10) ?? r.gespeichert[0].geprueft_am, new Date().toISOString().slice(0, 10), "Server setzt das Bestätigungsdatum");
  const fremd = d.personen.find((p) => p.typ === "schueler" && !d.eltern_kind.some((x) => x.eltern_id === e && x.kind_id === p.id));
  assert.equal((await speichern(e, "gesundheit", { id: "gs-x", person_id: fremd.id })).konflikte[0].grund, "NICHT_MEINE_PERSON");
  assert.ok((await laden(e)).gesundheit.every((g) => d.eltern_kind.some((x) => x.eltern_id === e && x.kind_id === g.person_id)));
  assert.equal((await laden(dp.vorstand)).gesundheit?.length ?? 0, 0, "Vorstand sieht keine Gesundheitsangaben");
  // Begleiter-Regel: während der Fahrt ja, sonst nein
  const begleiter = { id: "p-begl", typ: "eltern", rollen: [] };
  const pr = { id: "pr-x", von: new Date().toISOString().slice(0, 10), bis: new Date().toISOString().slice(0, 10), begleiter: ["p-begl"] };
  const t = { id: "t-x", projekt_id: "pr-x", gruppen: [d.gruppe_zuordnung.find((z) => z.person_id === kind.id).gruppe_id] };
  const alle = { ...d, projekte: [pr], termine: [t] };
  const g = [{ id: "g1", person_id: kind.id, allergien: "x" }];
  assert.equal(filtern("gesundheit", g, kontext(begleiter, alle)).length, 1, "während der Fahrt");
  assert.equal(filtern("gesundheit", g, kontext(begleiter, { ...alle, projekte: [{ ...pr, von: "2020-01-01", bis: "2020-01-03" }] })).length, 0, "lange vorbei");
});

test("📷 Einwilligung je Zweck: erteilt/abgelaufen/abgelehnt; Textfassung setzt der Server", async () => {
  const db2 = { liste: (t, f) => (({ genehmigung_vorlagen: [{ id: "v", zweck: "foto_presse", gueltig_monate: 12 }], genehmigungen: G })[t] || []).filter(f || (() => true)), hole: () => ({ foto_ok: true }) };
  let G = [{ kind_id: "k", vorlage_id: "v", status: "erteilt", beantwortet_am: new Date().toISOString() }];
  assert.equal(einwilligung(db2, "k", "foto_presse"), "ja");
  G = [{ kind_id: "k", vorlage_id: "v", status: "erteilt", beantwortet_am: "2020-01-01T00:00:00Z" }];
  assert.equal(einwilligung(db2, "k", "foto_presse"), "offen", "abgelaufen");
  G = [{ kind_id: "k", vorlage_id: "v", status: "widerrufen", beantwortet_am: new Date().toISOString() }];
  assert.equal(einwilligung(db2, "k", "foto_presse"), "nein");
  assert.equal(einwilligung(db2, "k", "foto_intern"), "ja", "ohne Vorlage: altes Feld foto_ok");
  assert.deepEqual(Object.keys(fotoErlaubnis(db2, "k")), ["foto_intern", "foto_website", "foto_presse", "foto_social"]);
  const offen = d.genehmigungen.find((g) => g.status === "ausstehend" && elternVonKind.includes(d.eltern_kind.find((e) => e.kind_id === g.kind_id)?.eltern_id) && g.kind_id === kind.id)
    || d.genehmigungen.find((g) => g.status === "ausstehend");
  const e = d.eltern_kind.find((x) => x.kind_id === offen.kind_id).eltern_id;
  const r = await speichern(e, "genehmigungen", { ...offen, status: "erteilt", vorlage_version: 99 });
  assert.equal(r.gespeichert[0].vorlage_version, d.genehmigung_vorlagen.find((v) => v.id === offen.vorlage_id).fassung, "Fassung vom Server");
});

test("📋 Fehlzeiten: da, verspätet, entschuldigt, unentschuldigt und Quote", () => {
  const T = [{ id: "t1", beginn: "2026-01-10T17:00:00Z", gruppen: ["g"] }, { id: "t2", beginn: "2026-01-17T17:00:00Z", gruppen: ["g"] }, { id: "t3", beginn: "2026-01-24T17:00:00Z", gruppen: ["g"], status: "abgesagt" }];
  const A = [{ termin_id: "t1", person_id: "a", anwesend: "ja" }, { termin_id: "t2", person_id: "a", anwesend: "spaet" }, { termin_id: "t1", person_id: "b", anwesend: "entschuldigt" }, { termin_id: "t2", person_id: "b", anwesend: "nein" }, { termin_id: "t3", person_id: "b", anwesend: "nein" }];
  const db3 = { liste: (t, f) => ({ termine: T, antworten: A })[t].filter(f || (() => true)) };
  const l = fehlzeiten(db3, { von: new Date("2026-01-01"), bis: new Date("2026-02-01") });
  const b = l.find((z) => z.person_id === "b"), a = l.find((z) => z.person_id === "a");
  assert.deepEqual([a.ja, a.spaet, a.quote], [1, 1, 100]);
  assert.deepEqual([b.entschuldigt, b.nein, b.erfasst, b.quote], [1, 1, 2, 0], "abgesagter Termin zählt nicht");
  assert.equal(l[0].person_id, "b", "Auffällige zuerst");
});
