// 🚪 0.66.0 Kündigung in vier Varianten: alles · als Ehemalige/r bleiben · Teilbereiche · pausieren
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { wartung } from "../supabase/functions/_shared/kom/kern.js";
import { demoDatenbank } from "./demo-db.mjs";
import { kuendigungFolgen, kuendigungVorschau, einwilligung, elternVon } from "../js/kern/logik.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";

let db, d, codes, BILD;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.13" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const sp = async (pid, z) => (await rufe({ aktion: "speichern", tab: "kuendigungen", zeilen: [z] }, await login(pid))).json;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const heute = () => new Date().toISOString().slice(0, 10);
const zeile = async (tab, id) => (await db.q(`select to_jsonb(t) as z from bk_${tab} t where id = $1`, [id]))[0]?.z;
const mini = (dd) => ({ liste: (t, f = () => true) => (dd[t] || []).filter(f), hole: (t, id) => (dd[t] || []).find((x) => x.id === id) });
let kind, eltern, fremd;
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  BILD = d.kuendigungen.find((k) => k.unterschrift).unterschrift.bild;
  const m = mini(d);
  kind = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && elternVon(m, p.id).some((e) => codes[e]) && !d.kuendigungen.some((k) => k.person_id === p.id) && d.gesundheit.some((g) => g.person_id === p.id)
    && d.personen.find((x) => x.id === p.id).geburtsdatum > "2010-01-01");
  eltern = elternVon(m, kind.id).find((e) => codes[e]);
  fremd = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && !elternVon(m, kind.id).includes(p.id)).id;
});

test("🚪 Einreichen: Eltern für das eigene Kind mit Unterschrift – nicht fremde, nicht das Kind selbst, nicht ohne Unterschrift", async () => {
  const k = { id: "kt-1", person_id: kind.id, art: "alles", zum: heute(), bereiche: [], unterschrift: { name: "Mama", bild: BILD } };
  assert.equal((await sp(fremd, k)).konflikte?.[0]?.grund, "NICHT_DEINE_KUENDIGUNG");
  assert.equal((await sp(kind.id, k)).konflikte?.[0]?.grund, "NUR_ELTERN");
  assert.equal((await sp(eltern, { ...k, unterschrift: null })).konflikte?.[0]?.grund, "UNTERSCHRIFT_FEHLT");
  assert.equal((await sp(eltern, { ...k, zum: "2020-01-01" })).konflikte?.[0]?.grund, "DATUM_UNGUELTIG");
  const z = (await sp(eltern, { ...k, status: "vollzogen", eingereicht_von: "p-leitung" })).gespeichert?.[0];
  assert.equal(z.status, "eingegangen", "Status setzt der Server"); assert.equal(z.eingereicht_von, eltern); assert.match(z.az, /^K-\d{4}-/); assert.equal(z.weg, "app");
});

test("👀 Sichtbar für Person, Eltern und Leitung – nicht für Fremde; Notiz nur für Leitung", async () => {
  const r = await rufe({ aktion: "speichern", tab: "kuendigungen", zeilen: [{ ...(await zeile("kuendigungen", "kt-1")), notiz: "intern" }] }, await login("p-leitung"));
  assert.ok(r.json.gespeichert?.length);
  const lade = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.kuendigungen || [];
  assert.ok((await lade(eltern)).some((k) => k.id === "kt-1" && k.notiz === undefined));
  assert.ok((await lade(kind.id)).some((k) => k.id === "kt-1"));
  assert.ok(!(await lade(fremd)).some((k) => k.id === "kt-1"));
  assert.equal((await lade("p-leitung")).find((k) => k.id === "kt-1").notiz, "intern");
});

test("✅ Nur die Leitung bestätigt (Name/Zeit vom Server); Zurücknehmen bis zum Datum, danach abgeschlossen", async () => {
  const k = await zeile("kuendigungen", "kt-1");
  assert.equal((await sp(eltern, { ...k, status: "bestaetigt" })).konflikte?.[0]?.grund, "NUR_LEITUNG");
  const b = (await sp("p-leitung", { ...k, status: "bestaetigt", offen: "Geige BK-001", bestaetigt_von: eltern })).gespeichert[0];
  assert.equal(b.status, "bestaetigt"); assert.equal(b.bestaetigt_von, "p-leitung"); assert.ok(b.bestaetigt_am);
  // zweite Kündigung: Eltern nehmen zurück, danach geht nichts mehr
  const z = (await sp(eltern, { id: "kt-2", person_id: kind.id, art: "teil", bereiche: ["mitteilungen"], zum: heute(), unterschrift: { name: "Mama", bild: BILD } })).gespeichert[0];
  assert.equal((await sp(eltern, { ...z, status: "zurueckgenommen" })).gespeichert[0].status, "zurueckgenommen");
  assert.equal((await sp("p-leitung", { ...z, status: "bestaetigt" })).konflikte?.[0]?.grund, "ABGESCHLOSSEN");
});

test("🏁 Jetzt wirksam (nur Leitung): ausgetreten, Zugang gesperrt, Anmeldung geht nicht mehr, Gesundheit gelöscht", async () => {
  assert.equal((await rufe({ aktion: "kuendigung_vollziehen", id: "kt-1" }, await login(eltern))).status, 403);
  const r = await rufe({ aktion: "kuendigung_vollziehen", id: "kt-1" }, await login("p-leitung"));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const p = await zeile("personen", kind.id);
  assert.equal(p.status, "ausgetreten"); assert.equal(p.ausgetreten_am, heute());
  assert.equal((await zeile("kuendigungen", "kt-1")).status, "vollzogen");
  assert.ok((await db.q(`select aktiv from bk_zugaenge where person_id = $1`, [kind.id])).every((z) => !z.aktiv));
  assert.ok((await db.q(`select geloescht_am, allergien from bk_gesundheit where person_id = $1`, [kind.id])).every((g) => g.geloescht_am && g.allergien == null));
  assert.equal((await rufe({ aktion: "anmelden", code: codes[kind.id] })).status, 401);
  assert.equal((await rufe({ aktion: "kuendigung_vollziehen", id: "kt-1" }, await login("p-leitung"))).status, 409, "nur einmal");
});

test("💤 Wartung: bestätigte Pause wird am Datum wirksam, nach dem Ende wieder aktiv; 🎓 Ehemalige verlassen die Gruppen", async () => {
  const k2 = d.kuendigungen.find((k) => k.id === "kue-2"); // bestätigte Pause in der Zukunft
  await db.q(`update bk_kuendigungen set zum = current_date where id = 'kue-2'`);
  let w = await wartung(db, {}, {});
  assert.ok(w.kuendigungen.vollzogen >= 1, JSON.stringify(w.kuendigungen));
  let p = await zeile("personen", k2.person_id);
  assert.equal(p.status, "pausiert"); assert.equal(p.pause_bis, k2.bis);
  await db.q(`update bk_personen set pause_bis = current_date - 1 where id = $1`, [k2.person_id]);
  await db.q(`update bk_kuendigungen set bis = current_date - 1 where id = 'kue-2'`);
  w = await wartung(db, {}, {});
  p = await zeile("personen", k2.person_id);
  assert.equal(p.status, "aktiv"); assert.equal(p.pause_bis, null); assert.equal((await zeile("kuendigungen", "kue-2")).status, "beendet");
  // Ehemalige: über die Leitung erfasst (Papier), bestätigt, Wartung
  const s = d.personen.find((x) => x.typ === "schueler" && x.status === "aktiv" && d.gruppe_zuordnung.some((g) => g.person_id === x.id) && x.id !== kind.id && x.id !== k2.person_id && !d.kuendigungen.some((k) => k.person_id === x.id));
  const e = (await sp("p-leitung", { id: "kt-3", person_id: s.id, art: "ehemalig", zum: heute(), weg: "papier" })).gespeichert[0];
  assert.equal(e.weg, "papier"); assert.equal(e.unterschrift, null);
  await sp("p-leitung", { ...e, status: "bestaetigt" });
  await wartung(db, {}, {});
  assert.equal((await zeile("personen", s.id)).typ, "ehemalig");
  const offen = await db.q(`select z.id from bk_gruppe_zuordnung z join bk_gruppen g on g.id = z.gruppe_id where z.person_id = $1 and z.geloescht_am is null and (z.bis is null or z.bis > current_date) and g.ehemalige is not true`, [s.id]);
  assert.equal(offen.length, 0, "keine aktive Orchester-Gruppe mehr");
});

test("🧩 Teilbereiche: Fotos widerrufen → Einwilligung „nein“; Mitteilungen → nur noch in der App; Vorschau nennt Löschfristen", () => {
  const dd = erzeugeDemodaten(new Date()), m = mini(dd);
  const p = dd.personen.find((x) => x.typ === "schueler");
  const f = kuendigungFolgen(m, { id: "x", person_id: p.id, art: "teil", bereiche: ["fotos", "mitteilungen"], zum: heute(), status: "bestaetigt" }, new Date());
  for (const z of f) { const l = dd[z.tab] || (dd[z.tab] = []); const i = l.findIndex((x) => x.id === z.zeile.id); if (i >= 0) l[i] = z.zeile; else l.push(z.zeile); }
  assert.equal(einwilligung(m, p.id, "foto_intern"), "nein");
  assert.deepEqual(m.hole("personen", p.id).benachrichtigung, { "*": ["app"] });
  const v = kuendigungVorschau(m, { person_id: p.id, art: "alles", zum: "2027-07-31", bereiche: ["foerderverein"] }, { monate: 24 });
  assert.ok(v.zeilen.some(([, , w]) => /31\.07\.2029/.test(w)) && v.zeilen.some(([, was]) => /Förderverein/.test(was)));
});

test("🧭 Eingebaut: Kachel Meins und Leitung, nachladbarer Teil, Schreiben im Kopfbogen, Migration mit Rechten", () => {
  const st = lies("js/app/start.js");
  assert.match(st, /id: "mitgliedschaft".*v: "kuendigung"/); assert.match(st, /id: "kuendigungen".*abs: "mitglieder"/);
  const k = lies("js/app/kuendigung.js");
  for (const w of ["VIEWS.kuendigung ", "VIEWS.kuendigungen", "kuAbsenden", "kuBestaetigenLos", "kuVollziehen", "kuErfassen", "briefHtml", "inKorb", "dv-brief", "archivHtml", "kuVerlaengern"]) assert.ok(k.includes(w), w);
  assert.match(lies("tools/teile-karte.mjs"), /"kuendigung\.js"/); assert.match(lies("sw.js"), /js\/app\/kuendigung\.js/);
  const sql = lies("supabase/migrations/20261127000000_bk_kuendigungen.sql");
  assert.match(sql, /grant select, insert, update, delete on bk_kuendigungen to service_role/); assert.match(sql, /add column if not exists pause_bis/);
});
