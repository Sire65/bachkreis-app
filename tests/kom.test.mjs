// BK Communicator: Router, Zustellung, Anbieterwechsel, Wiederholung, Rückfall, Bremse, Zero-Cost, Not-Aus, Ruhezeit,
// Doppelte, Eskalation, Quittungen und die bk-api-Aktionen – gegen PostgreSQL (PGlite) mit allen Migrationen.
// Anbieter sind Attrappen (kein Netz); die echten Adapter stehen in supabase/functions/_shared/kom/kanaele-deno.js.
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { demoDatenbank } from "./demo-db.mjs";
import { erzeugeKomStandardSql } from "../tools/schema-sql.mjs";
import { annehmen, zustellen, wartung, quittung, ruhezeitEnde, backoff, PROTOKOLL_ADAPTER } from "../supabase/functions/_shared/kom/kern.js";
import { verarbeiten } from "../supabase/functions/_shared/api.js";

let db, d, codes, kind, eltern;
const UMG = { appUrl: "https://bachkreis.example/app/", quittungUrl: "https://kom.example/bk-kom", vapidPublic: "BPUB" };
const auftraege = async (korr) => db.q(`select * from bk_versand where korrelation = $1 order by zeit, kanal`, [korr]);
const ereignisse = async (art) => db.q(`select * from bk_kom_ereignisse where art = $1`, [art]);
const abo = (person, n = 1) => db.q(`insert into bk_push_abos (person_id, endpoint, schluessel) values ($1, $2, '{"p256dh":"x","auth":"y"}')`, [person, `https://push.example/${person}/${n}`]);
const faellig = () => db.q(`update bk_versand set naechster_versuch = now() - interval '1 second' where status in ('wartend', 'erneut')`);

function attrappen(opt = {}) {
  const log = [];
  const mk = (art) => ({
    bereit: () => opt[art]?.bereit !== false,
    async senden(x) {
      log.push({ art, an: x.person.id, kanal: x.auftrag.kanal, push: x.nachricht.push, betreff: x.nachricht.betreff, text: x.nachricht.text });
      const f = opt[art]?.antwort;
      return typeof f === "function" ? f(x) : f || { ok: true, id: `${art}-${log.length}`, abos_ok: (x.abos || []).map((a) => a.endpoint) };
    },
  });
  return { log, adapter: { webpush: mk("webpush"), brevo: mk("brevo"), smtp: mk("smtp"), protokoll: PROTOKOLL_ADAPTER } };
}

before(async () => {
  ({ db, d, codes } = await demoDatenbank({ jetzt: new Date("2026-10-15T10:00:00") }));
  const r = await db.q(`select e.kind_id, e.eltern_id from bk_eltern_kind e join bk_personen p on p.id = e.kind_id where p.typ = 'schueler' and p.geburtsdatum > now() - interval '15 years' and e.geloescht_am is null order by e.kind_id limit 1`);
  kind = r[0].kind_id;
  eltern = (await db.q(`select eltern_id from bk_eltern_kind where kind_id = $1 and geloescht_am is null`, [kind])).map((x) => x.eltern_id);
  assert.ok(eltern.length >= 1);
});
// Jeder Test beginnt mit der Standard-Konfiguration, ohne Aufträge, Abos und Ruhezeit
beforeEach(async () => {
  for (const t of ["versand", "kom_ereignisse", "kom_zustand", "kom_routen", "kom_regeln", "kom_eskalationen", "kom_anbieter", "kom_vorlagen", "kom_programme", "kom_einstellungen"]) await db.q(`delete from bk_${t}`);
  await db.q(`delete from bk_push_abos`);
  for (const z of erzeugeKomStandardSql().split("\n").filter((x) => x.startsWith("insert"))) await db.q(z);
  await db.q(`update bk_kom_einstellungen set ruhe_von = null, ruhe_bis = null, absender_email = 'bachkreis@beispiel.invalid'`);
});

test("Router: Minderjährige → Eltern zusätzlich; Genehmigung → statt des Kindes die Eltern", async () => {
  const r = await annehmen(db, { ereignis: "rundschreiben", an: [kind], betreff: "Probe", text: "Hallo", korrelation: "k1" });
  const a = await auftraege("k1");
  assert.ok(r.ok);
  assert.deepEqual([...new Set(a.map((x) => x.an_id))].sort(), [kind, ...eltern].sort());
  assert.ok(a.every((x) => x.programm === "leitung" && x.ereignis === "rundschreiben"));
  assert.ok(a.some((x) => x.kanal === "app" && x.status === "zugestellt"), "In-App sofort zugestellt");
  await annehmen(db, { ereignis: "genehmigung", an: [kind], betreff: "Fahrt", text: "Bitte zustimmen", korrelation: "k2" });
  const g = await auftraege("k2");
  assert.ok(!g.some((x) => x.an_id === kind), "Kind selbst bekommt keine Genehmigungsanfrage");
  assert.ok(g.every((x) => eltern.includes(x.an_id)));
});

test("Router: Vorlieben, Erreichbarkeit, Rückfall-Kette und Idempotenz", async () => {
  await abo("p-lk1");
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk1", "p-lk2"], betreff: "Neu", text: "x", korrelation: "k3" });
  const a = await auftraege("k3");
  const lk1 = a.find((x) => x.an_id === "p-lk1"), lk2 = a.find((x) => x.an_id === "p-lk2");
  assert.equal(lk1.kanal, "push"); assert.deepEqual(lk1.meta.weitere, ["mail", "app"]);
  assert.equal(lk2.kanal, "mail", "ohne Push-Abo direkt E-Mail"); assert.deepEqual(lk2.meta.weitere, ["app"]);
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk1", "p-lk2"], betreff: "Neu", text: "x", korrelation: "k3" });
  assert.equal((await auftraege("k3")).length, 2, "derselbe Vorgang erzeugt keine Doppel-Aufträge");
  await db.q(`update bk_personen set benachrichtigung = '{"termin_neu": []}'::jsonb where id = 'p-lk2'`);
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk2"], betreff: "Neu2", text: "y", korrelation: "k4" });
  assert.equal((await auftraege("k4"))[0].fehler_code, "VORLIEBE");
  await annehmen(db, { ereignis: "sos", an: ["p-lk2"], betreff: "Notfall", text: "z", korrelation: "k5" });
  assert.ok((await auftraege("k5")).some((x) => x.kanal === "mail" && x.prioritaet === "kritisch"), "Notfall übergeht Vorlieben");
  await db.q(`update bk_personen set benachrichtigung = null where id = 'p-lk2'`);
});

test("Zustellung: Push über Web-Push mit Vorlage, Quittungs-Token und Anbieter-Zustand ok", async () => {
  await abo("p-lk1");
  const { log, adapter } = attrappen();
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk1"], betreff: "Konzertprobe", text: "Samstag 10 Uhr", korrelation: "k6" });
  const b = await zustellen(db, adapter, UMG);
  assert.equal(b.gesendet, 1);
  assert.equal(log[0].art, "webpush"); assert.equal(log[0].push.titel, "📅 Konzertprobe");
  assert.ok(log[0].push.t && log[0].push.q === UMG.quittungUrl);
  const [a] = await auftraege("k6");
  assert.equal(a.status, "gesendet"); assert.equal(a.anbieter_id, "ka-webpush"); assert.ok(a.quittung_hash);
  assert.equal((await db.q(`select status from bk_kom_zustand where anbieter_id = 'ka-webpush'`))[0].status, "ok");
  // Quittung vom Service Worker: falsches Token → 403, richtiges → angezeigt → geöffnet (nie zurück)
  assert.equal((await quittung(db, { id: a.id, t: "falsch", art: "angezeigt" })).status, 403);
  assert.equal((await quittung(db, { id: a.id, t: log[0].push.t, art: "geoeffnet" })).status, 200);
  await quittung(db, { id: a.id, t: log[0].push.t, art: "angezeigt" });
  assert.equal((await auftraege("k6"))[0].status, "geoeffnet");
});

test("E-Mail: Anbieterwechsel Brevo → SMTP bei Störung, Brevo nach 3 Fehlern „ausgefallen“", async () => {
  const { log, adapter } = attrappen({ brevo: { antwort: { ok: false, code: "BREVO_502", text: "Bad Gateway" } } });
  for (const k of ["k7a", "k7b", "k7c"]) await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk2"], kanaele: ["mail"], betreff: k, text: "x", korrelation: k });
  await zustellen(db, adapter, UMG);
  assert.deepEqual(log.map((x) => x.art), ["brevo", "smtp", "brevo", "smtp", "brevo", "smtp"]);
  assert.ok((await auftraege("k7a")).every((x) => x.status === "gesendet" && x.anbieter_id === "ka-smtp"));
  assert.equal((await db.q(`select status from bk_kom_zustand where anbieter_id = 'ka-brevo'`))[0].status, "ausgefallen");
  assert.ok((await ereignisse("wechsel")).length >= 3);
  log.length = 0;
  await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk3"], kanaele: ["mail"], betreff: "danach", text: "x", korrelation: "k7d" });
  await zustellen(db, adapter, UMG);
  assert.equal(log[0].art, "smtp", "ausgefallener Anbieter kommt erst nach den gesunden dran");
});

test("Empfänger-Fehler: Push-Abo abgelaufen → kein Wiederholen, Abo aus, Rückfall auf E-Mail", async () => {
  await abo("p-lk1");
  const { log, adapter } = attrappen({ webpush: { antwort: (x) => ({ ok: false, empfaenger: true, code: "PUSH_ABO_WEG", abos_weg: x.abos.map((a) => a.endpoint) }) } });
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk1"], betreff: "T", text: "x", korrelation: "k8" });
  await zustellen(db, adapter, UMG);
  let a = await auftraege("k8");
  assert.equal(a.find((x) => x.kanal === "push").status, "fehler");
  assert.equal((await db.q(`select aktiv from bk_push_abos where person_id = 'p-lk1'`))[0].aktiv, false);
  assert.ok(a.some((x) => x.kanal === "mail" && x.status === "wartend"), "Rückfall-Auftrag E-Mail");
  await zustellen(db, adapter, UMG);
  a = await auftraege("k8");
  assert.equal(a.find((x) => x.kanal === "mail").status, "gesendet");
  assert.equal(log.at(-1).art, "brevo");
  assert.notEqual((await db.q(`select status from bk_kom_zustand where anbieter_id = 'ka-webpush'`))[0].status, "gestoert", "Empfängerfehler schaden dem Anbieter nicht");
});

test("Wiederholung mit Backoff, nach max. Versuchen „aufgegeben“ und Rückfall auf In-App", async () => {
  await db.q(`update bk_kom_einstellungen set max_versuche = 2, basis_sekunden = 30`);
  const kaputt = { antwort: { ok: false, code: "NETZ", text: "Zeitüberschreitung" } };
  const { adapter } = attrappen({ brevo: kaputt, smtp: kaputt });
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk2"], betreff: "T", text: "x", korrelation: "k9" });
  await zustellen(db, adapter, UMG);
  let [m] = await auftraege("k9");
  assert.equal(m.status, "erneut"); assert.equal(m.versuche, 1);
  const warte = (new Date(m.naechster_versuch) - Date.now()) / 1000;
  assert.ok(warte > 20 && warte <= 31, "1. Wiederholung nach ~30 s: " + warte);
  assert.equal((await zustellen(db, adapter, UMG)).bearbeitet, 0, "vor Ablauf nicht erneut");
  await faellig(); await zustellen(db, adapter, UMG);
  const a = await auftraege("k9");
  assert.equal(a.find((x) => x.kanal === "mail").status, "tot");
  assert.equal(a.find((x) => x.kanal === "app")?.status, "zugestellt", "wenigstens in der App");
  assert.equal(backoff(1, { basis_sekunden: 30, max_sekunden: 3600 }), 30);
  assert.equal(backoff(4, { basis_sekunden: 30, max_sekunden: 3600 }), 240);
  assert.equal(backoff(20, { basis_sekunden: 30, max_sekunden: 3600 }), 3600);
});

test("Zero-Cost-Sperre, nicht eingerichtete Anbieter und Bremse", async () => {
  await db.q(`update bk_kom_anbieter set kostenlos = false where id = 'ka-brevo'`);
  const { log, adapter } = attrappen({ smtp: { bereit: false } });
  await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk2"], kanaele: ["mail"], betreff: "T", text: "x", korrelation: "k10" });
  await zustellen(db, adapter, UMG);
  const [a] = await auftraege("k10");
  assert.equal(a.status, "fehler"); assert.equal(a.fehler_code, "KEIN_ANBIETER");
  assert.match(a.fehler_text, /kostenpflichtig gesperrt/);
  assert.equal(log.length, 0, "kostenpflichtiger Anbieter wird nie benutzt");
  assert.equal((await db.q(`select status from bk_kom_zustand where anbieter_id = 'ka-smtp'`))[0].status, "nicht_eingerichtet");
  // Bremse: höchstens 1 je Minute
  await db.q(`update bk_kom_anbieter set kostenlos = true, bremse_minute = 1 where id = 'ka-brevo'`);
  await db.q(`update bk_kom_anbieter set aktiv = false where id = 'ka-smtp'`);
  const b = attrappen();
  await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk2", "p-lk3"], kanaele: ["mail"], betreff: "B", text: "x", korrelation: "k11" });
  await zustellen(db, b.adapter, UMG);
  const st = (await auftraege("k11")).map((x) => x.status).sort();
  assert.deepEqual(st, ["erneut", "gesendet"]);
  assert.equal((await ereignisse("gebremst")).length, 1);
});

test("Not-Aus: nur Notfälle (kritisch) gehen raus; Programm aus → abgelehnt", async () => {
  await db.q(`update bk_kom_einstellungen set versand_aktiv = false`);
  const { log, adapter } = attrappen();
  await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk2"], kanaele: ["mail"], betreff: "normal", text: "x", korrelation: "k12" });
  await annehmen(db, { ereignis: "sos", an: ["p-lk3"], betreff: "Notfall", text: "x", korrelation: "k13" });
  await zustellen(db, adapter, UMG);
  assert.deepEqual(log.map((x) => x.betreff), ["🆘 NOTFALL: Notfall"]);
  assert.equal((await auftraege("k12"))[0].status, "wartend");
  await db.q(`update bk_kom_programme set aktiv = false where schluessel = 'leitung'`);
  const r = await annehmen(db, { ereignis: "rundschreiben", an: ["p-lk2"], betreff: "x", text: "x" });
  assert.equal(r.ok, false); assert.equal(r.fehler, "PROGRAMM_AUS");
});

test("Ruhezeit verschiebt (außer Notfall); doppelte Erinnerungen werden unterdrückt", async () => {
  await db.q(`update bk_kom_einstellungen set ruhe_von = '00:00', ruhe_bis = '23:59'`);
  await abo("p-lk1");
  await annehmen(db, { ereignis: "termin_neu", an: ["p-lk1"], betreff: "nachts", text: "x", korrelation: "k14" });
  await annehmen(db, { ereignis: "sos", an: ["p-lk1"], betreff: "nachts SOS", text: "x", korrelation: "k15" });
  const [n] = await auftraege("k14");
  assert.ok(new Date(n.naechster_versuch) > new Date(), "verschoben bis Ruhezeit-Ende");
  assert.ok((await auftraege("k15")).every((x) => !x.naechster_versuch));
  assert.ok(ruhezeitEnde({ ruhe_von: "00:00", ruhe_bis: "23:59" }));
  assert.equal(ruhezeitEnde({ ruhe_von: null, ruhe_bis: null }), null);
  await db.q(`update bk_kom_einstellungen set ruhe_von = null, ruhe_bis = null`);
  await annehmen(db, { ereignis: "erinnerung", an: ["p-lk1"], betreff: "Morgen Probe", text: "x", korrelation: "k16" });
  await annehmen(db, { ereignis: "erinnerung", an: ["p-lk1"], betreff: "Morgen Probe", text: "x", korrelation: "k17" });
  assert.equal((await auftraege("k17"))[0].fehler_code, "DOPPELT");
});

test("Eskalation: SOS unbestätigt → E-Mail an Empfänger + Leitung; Bestätigung stoppt alles Offene", async () => {
  await db.q(`update bk_kom_eskalationen set warte_sekunden = 0`);
  await abo("p-lk1");
  const { log, adapter } = attrappen();
  await annehmen(db, { ereignis: "sos", an: ["p-lk1"], kanaele: ["push"], betreff: "Unfall", text: "Bitte melden", korrelation: "k18" });
  await zustellen(db, adapter, UMG);
  const bericht = await wartung(db, adapter, UMG);
  assert.ok(bericht.eskaliert >= 3, JSON.stringify(bericht));
  const esk = await db.q(`select * from bk_versand where korrelation like 'k18:esk:%'`);
  assert.ok(esk.some((x) => x.an_id === "p-lk1" && x.kanal === "mail"), "E-Mail an den Empfänger");
  assert.ok(esk.some((x) => x.an_id === "p-leitung" && x.betreff.startsWith("Eskalation")), "Leitung informiert");
  assert.ok(log.some((x) => x.art === "brevo" && x.an === "p-leitung"));
  const vorher = esk.length;
  await wartung(db, adapter, UMG);
  assert.equal((await db.q(`select count(*)::int as n from bk_versand where korrelation like 'k18:esk:%'`))[0].n, vorher, "jede Eskalation nur einmal");
  // Bestätigung (Klick auf die Notfall-Benachrichtigung)
  await annehmen(db, { ereignis: "sos", an: ["p-lk1"], betreff: "Zweiter", text: "x", korrelation: "k19" });
  await zustellen(db, adapter, UMG);
  const p = log.filter((x) => x.art === "webpush" && x.push?.tag === "k19").at(-1).push;
  const [a] = (await auftraege("k19")).filter((x) => x.kanal === "push");
  await quittung(db, { id: a.id, t: p.t, art: "quittiert" });
  const k19 = await auftraege("k19");
  assert.ok(k19.filter((x) => x.kanal !== "push").every((x) => ["quittiert", "unterdrueckt"].includes(x.status)), JSON.stringify(k19.map((x) => [x.kanal, x.status])));
  await wartung(db, adapter, UMG);
  assert.equal((await db.q(`select count(*)::int as n from bk_versand where korrelation like 'k19:esk:%'`))[0].n, 0, "bestätigt → keine Eskalation");
});

test("bk-api: Push-Abo, Versand-Rechte, Test an mich, Wartung nur Leitung, Datenschutz der Aufträge", async () => {
  const { log, adapter } = attrappen();
  const dienste = { adapter, umgebung: UMG };
  const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.9" }, dienste);
  const tok = async (id) => (await rufe({ aktion: "anmelden", code: codes[id] })).json.token;
  const s = await tok(d.__konfig.demo_personen.schueler), l = await tok("p-leitung");
  assert.equal((await rufe({ aktion: "push_schluessel" }, s)).json.schluessel, "BPUB");
  assert.equal((await rufe({ aktion: "push_abo", abo: { endpoint: "http://unsicher", keys: { p256dh: "a", auth: "b" } } }, s)).status, 400);
  assert.equal((await rufe({ aktion: "push_abo", abo: { endpoint: "https://push.example/s1", keys: { p256dh: "a", auth: "b" } } }, s)).status, 200);
  assert.equal((await rufe({ aktion: "push_status" }, s)).json.geraete, 1);
  // Schüler: Rundschreiben verboten, Instrumenten-Meldung nur an Verwalter
  assert.equal((await rufe({ aktion: "versenden", ereignis: "rundschreiben", an: ["p-lk1"], text: "x" }, s)).status, 403);
  const im = await rufe({ aktion: "versenden", ereignis: "instrument", an: ["p-lk3", kind], betreff: "Saite gerissen", text: "x", korrelation: "k20" }, s);
  assert.equal(im.status, 200);
  assert.deepEqual([...new Set((await auftraege("k20")).map((x) => x.an_id))], ["p-lk3"]);
  // Test an mich: Push aufs eigene Gerät, sofort zugestellt
  const t = await rufe({ aktion: "kom_test", kanaele: ["push"] }, s);
  assert.equal(t.json.zustellung.gesendet, 1);
  assert.equal(log.at(-1).push.titel, "🧪 Test vom Bachkreis");
  assert.equal((await rufe({ aktion: "kom_wartung" }, s)).status, 403);
  assert.equal((await rufe({ aktion: "kom_wartung" }, l)).status, 200);
  // Sichtbarkeit: Leitung sieht Aufträge (ohne Quittungs-Hash), Schüler sieht nichts davon
  const ll = await rufe({ aktion: "laden" }, l);
  assert.ok(ll.json.daten.versand.length > 0 && ll.json.daten.versand.every((x) => !("quittung_hash" in x)));
  assert.ok(ll.json.daten.kom_regeln.length > 0);
  const sl = await rufe({ aktion: "laden" }, s);
  for (const tab of ["versand", "kom_ereignisse", "kom_anbieter", "kom_einstellungen"]) assert.equal(sl.json.daten[tab].length, 0, tab);
  // Server-Tabellen sind nicht beschreibbar – auch nicht für die Leitung
  const w = await rufe({ aktion: "speichern", tab: "kom_zustand", zeilen: [{ id: "kz-brevo", status: "ok" }] }, l);
  assert.equal(w.json.konflikte[0].grund, "NUR_SERVER");
  const ok = await rufe({ aktion: "speichern", tab: "kom_einstellungen", zeilen: [{ id: "global", versand_aktiv: false }] }, l);
  assert.equal(ok.status, 200, "Leitung schaltet den Versand ab");
});
