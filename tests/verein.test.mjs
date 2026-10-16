// 🎻 Vereinsalltag (0.21.0): Registerproben & Registerführer, Eltern ab 18, Kontaktpflege durch Eltern, Reise-Anmeldung, Programm,
// Schuljahreswechsel nach Regeln, Auskunft über alle Tabellen, Löschfristen, Ehemalige im Chat.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { kontext, filtern } from "../supabase/functions/_shared/regeln.js";
import { chatPartnerErlaubt, pwAppPerson, elternZugriff } from "../js/kern/schema.js";
import { eingeladen, schuljahrVorschlaege, personenDaten, loeschKandidaten } from "../js/kern/logik.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "6.6.6.6" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const mem = (d) => ({ liste: (t, f) => (d[t] || []).filter(f || (() => true)), hole: (t, id) => (d[t] || []).find((z) => z.id === id), konfig: () => d.__konfig || {} });

before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("🎼 Registerprobe: nur das angehakte Register ist eingeladen", () => {
  const D = mem(d), z = d.gruppe_zuordnung.find((x) => x.gruppe_id === "g-a" && x.art === "stamm" && !x.bis);
  const reg = d.person_instrument.find((x) => x.person_id === z.person_id)?.register_id;
  const t = { id: "t", beginn: new Date(Date.now() + 86400000).toISOString(), gruppen: ["g-a"], register: [reg] };
  assert.equal(eingeladen(D, t, z.person_id), true);
  assert.equal(eingeladen(D, { ...t, register: ["r-gibtsnicht"] }, z.person_id), false);
});

test("🎼 Registerführer sieht Zu-/Absagen seines Registers – aber keine Gründe", async () => {
  const rf = d.personen.find((p) => (p.rollen || []).includes("registerfuehrer") && codes[p.id]);
  assert.ok(rf, "Demo hat einen Registerführer");
  const reg = new Set(d.person_instrument.filter((x) => x.person_id === rf.id).map((x) => x.register_id));
  const leute = new Set(d.person_instrument.filter((x) => reg.has(x.register_id)).map((x) => x.person_id));
  const A = (await laden(rf.id)).antworten;
  assert.ok(A.some((a) => a.person_id !== rf.id), "sieht andere aus dem Register");
  assert.ok(A.every((a) => leute.has(a.person_id)), "nur das eigene Register");
  assert.ok(A.filter((a) => a.person_id !== rf.id).every((a) => !("notiz" in a)), "keine Absagegründe");
});

test("👪 Eltern: Kontaktdaten des Kindes selbst ändern (nur Kontaktfelder); ab 18 nur mit Erlaubnis", async () => {
  const e = dp.eltern, kid = d.eltern_kind.find((x) => x.eltern_id === e).kind_id, p = d.personen.find((x) => x.id === kid);
  const r = await speichern(e, "personen", { ...p, mobil: "0170 1234567", vorname: "Gehackt", geburtsdatum: "1990-01-01" });
  assert.equal(r.gespeichert.length, 1, JSON.stringify(r));
  assert.equal(r.gespeichert[0].mobil, "0170 1234567");
  assert.equal(r.gespeichert[0].vorname, p.vorname, "Name bleibt");
  assert.equal(String(r.gespeichert[0].geburtsdatum).slice(0, 10), String(p.geburtsdatum).slice(0, 10), "Geburtsdatum bleibt");
  const gross = { id: "k18", typ: "schueler", geburtsdatum: "2000-01-01" }, ek = { eltern_id: "e", kind_id: "k18" };
  assert.equal(elternZugriff(ek, gross), false);
  assert.equal(elternZugriff({ ...ek, zugriff_ab_18: true }, gross), true);
  assert.equal(elternZugriff(ek, { typ: "schueler", geburtsdatum: new Date().toISOString().slice(0, 10) }), true);
  const ctx = kontext({ id: "e", typ: "eltern", rollen: [] }, { personen: [gross], eltern_kind: [ek] });
  assert.equal(ctx.kinder.size, 0, "volljährig ohne Erlaubnis → keine Elternrechte");
});

test("🧳 Reise-Anmeldung: Eltern melden an, Betrag vom Projekt, Warteliste wenn voll, nach Anmeldeschluss nicht mehr", async () => {
  const pr = d.projekte.find((x) => x.anmeldung);
  const e = d.eltern_kind.find((x) => d.gruppe_zuordnung.some((z) => z.person_id === x.kind_id && z.gruppe_id === "g-a") && !d.reise_anmeldungen.some((a) => a.person_id === x.kind_id) && codes[x.eltern_id]);
  const r = await speichern(e.eltern_id, "reise_anmeldungen", { id: "ra-t1", projekt_id: pr.id, person_id: e.kind_id, status: "angemeldet", betrag: 0, bezahlt: true });
  assert.equal(r.gespeichert.length, 1, JSON.stringify(r));
  assert.equal(Number(r.gespeichert[0].betrag), Number(pr.kosten), "Betrag vom Projekt");
  assert.equal(r.gespeichert[0].bezahlt, false, "„bezahlt“ setzt nur die Kasse");
  const fremd = d.personen.find((p) => p.typ === "schueler" && !d.eltern_kind.some((x) => x.eltern_id === e.eltern_id && x.kind_id === p.id));
  assert.equal((await speichern(e.eltern_id, "reise_anmeldungen", { id: "ra-t2", projekt_id: pr.id, person_id: fremd.id, status: "angemeldet" })).konflikte[0].grund, "NICHT_MEINE_PERSON");
  const ctx = kontext(d.personen.find((p) => p.id === e.eltern_id), { ...d, projekte: [{ ...pr, plaetze: 1 }], reise_anmeldungen: [{ projekt_id: pr.id, status: "angemeldet", person_id: "x" }] });
  const { schreibPruefung } = await import("../supabase/functions/_shared/regeln.js");
  assert.equal(schreibPruefung("reise_anmeldungen", { id: "n", projekt_id: pr.id, person_id: e.kind_id, status: "angemeldet" }, null, ctx).zeile.status, "warteliste");
  const ctx2 = kontext(d.personen.find((p) => p.id === e.eltern_id), { ...d, projekte: [{ ...pr, anmeldeschluss: "2020-01-01" }] });
  assert.equal(schreibPruefung("reise_anmeldungen", { id: "n", projekt_id: pr.id, person_id: e.kind_id, status: "angemeldet" }, null, ctx2).grund, "ANMELDESCHLUSS");
});

test("🎼 Programm sehen alle; Transportliste nur intern", async () => {
  const S = await laden(dp.schueler);
  assert.ok(S.programm.length >= 5, "Schüler sieht das Programm");
  assert.ok(S.projekte.every((p) => !("transport_inventar" in p)), "Transportliste nicht für Schüler");
});

test("🎓 Schuljahreswechsel nach Regeln der Gruppen", () => {
  const D = mem(erzeugeDemodaten(new Date()));
  const v = schuljahrVorschlaege(D, { abschluss: 12 });
  const b8 = v.find((x) => x.g === "g-b" && x.jg === 9), c6 = v.find((x) => x.g === "g-c" && x.jg === 7), a12 = v.find((x) => x.jg === 13);
  if (b8) assert.equal(b8.ziel, "g-a");
  if (c6) assert.equal(c6.ziel, "g-b");
  assert.ok(a12, "Abschlussjahrgang vorhanden");
  assert.equal(a12.ziel, "g-d");
  assert.ok(a12.hinweise.some((h) => /Eltern/.test(h)));
  assert.ok(v.some((x) => x.ziel && x.ziel !== x.g), "es gibt Wechsel");
});

test("🔐 Auskunft über alle Tabellen · 🧹 Löschfristen · 🎓 Ehemalige im Chat", () => {
  const dd = erzeugeDemodaten(new Date()), D = mem(dd);
  const kid = dd.gesundheit[0].person_id, aus = personenDaten(D, [kid]);
  for (const t of ["personen", "gesundheit", "gruppe_zuordnung"]) assert.ok(aus[t]?.length, t);
  assert.ok(!aus.zugaenge && !aus.aenderungen, "keine Codes/Protokolle");
  const k = loeschKandidaten(D, { monate: 24 });
  assert.equal(k.personen.length, 1, "der vor über 2 Jahren Ausgetretene");
  assert.ok(k.gesundheit.length >= 1, "abgelaufene Gesundheitsangabe");
  const e1 = { id: "a", typ: "ehemalig" }, e2 = { id: "b", typ: "ehemalig" };
  assert.equal(pwAppPerson(e2), true);
  assert.equal(chatPartnerErlaubt(e1, e2), true);
  assert.equal(chatPartnerErlaubt(e1, { id: "s", typ: "schueler" }), false, "Ehemalige nicht privat mit Kindern");
});

test("Server-Kontext lädt alles, was die Regeln brauchen: Textfassung 2 und Begleiter-Zugriff über die echte API", async () => {
  const g = d.genehmigungen.find((x) => x.vorlage_id === "gv-2" && x.status === "ausstehend");
  const e = d.eltern_kind.find((x) => x.kind_id === g.kind_id).eltern_id;
  const r = await speichern(e, "genehmigungen", { ...g, status: "erteilt", vorlage_version: 1 });
  assert.equal(r.gespeichert[0].vorlage_version, 2, "Fassung 2 vom Server");
  const heute = new Date().toISOString().slice(0, 10), kid = d.gesundheit[0].person_id;
  const gr = d.gruppe_zuordnung.find((z) => z.person_id === kid).gruppe_id;
  const begl = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && !d.eltern_kind.some((x) => x.eltern_id === p.id && x.kind_id === kid));
  await db.q(`update bk_projekte set begleiter = $1, von = $2, bis = $2 where id = 'pr-freizeit'`, [[begl.id], heute]);
  await db.q(`update bk_termine set gruppen = $1 where projekt_id = 'pr-freizeit'`, [[gr]]);
  assert.ok((await laden(begl.id)).gesundheit.some((x) => x.person_id === kid), "Begleiter sieht während der Fahrt");
});
