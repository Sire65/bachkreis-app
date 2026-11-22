// 🎙️ 0.79.0 Vorspiele: senden an Lehrkraft/Register/Orchester/Auswahl, nur gewählte Empfänger hören, Einwilligung, Aufbewahrung, Antworten
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { nachrichtenAufraeumen } from "../supabase/functions/_shared/nachrichten.js";
import { demoDatenbank } from "./demo-db.mjs";
import { TABELLEN, vorspielTage, VORSPIEL_TAGE } from "../js/kern/schema.js";
import { einwilligung } from "../js/kern/logik.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.31" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lade = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const hoch = async (pid) => (await rufe({ aktion: "datei_hochladen", name: "vorspiel.webm", mime: "audio/webm", art: "sprache", daten: Buffer.from("OggS-test-audio").toString("base64") }, await login(pid))).json;
const holen = async (pid, id) => (await rufe({ aktion: "datei_holen", id }, await login(pid))).status;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const mini = () => ({ liste: (t, f = () => true) => (d[t] || []).filter((z) => !z.geloescht_am).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) || null });
let kind, ohne, kollege, fremd, elternKind;

before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const reg = (pid) => d.person_instrument.find((x) => x.person_id === pid && !x.geloescht_am)?.register_id;
  const grp = (pid) => new Set(d.gruppe_zuordnung.filter((z) => z.person_id === pid && !z.geloescht_am).map((z) => z.gruppe_id));
  const kinder = d.personen.filter((p) => p.typ === "schueler" && p.status === "aktiv" && codes[p.id]);
  kind = kinder.find((p) => einwilligung(mini(), p.id, "uebeaufnahmen") === "ja" && reg(p.id))?.id;
  ohne = kinder.find((p) => einwilligung(mini(), p.id, "uebeaufnahmen") !== "ja")?.id;
  kollege = kinder.find((p) => p.id !== kind && reg(p.id) === reg(kind))?.id;
  fremd = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && ![...grp(p.id)].some((g) => grp(kind).has(g)) && !d.eltern_kind.some((e) => e.eltern_id === p.id && e.kind_id === kind))?.id;
  elternKind = d.eltern_kind.find((e) => e.kind_id === kind && codes[e.eltern_id])?.eltern_id;
  assert.ok(kind && ohne && kollege && fremd, "Testpersonen gefunden");
});

test("🎙️ Tabellen privat, Migration mit Rechten (KC-SUPABASE-GRANTS)", () => {
  assert.deepEqual(TABELLEN.vorspiele.lesen, []); assert.deepEqual(TABELLEN.vorspiel_antworten.lesen, []);
  const m = lies("supabase/migrations/20261205000000_bk_vorspiele.sql");
  for (const t of ["bk_vorspiele", "bk_vorspiel_antworten"]) {
    assert.match(m, new RegExp(`alter table ${t} enable row level security`)); assert.match(m, new RegExp(`revoke all on ${t} from public, anon, authenticated`));
    assert.match(m, new RegExp(`grant select, insert, update, delete on ${t} to service_role`));
  }
  assert.equal(vorspielTage({}), VORSPIEL_TAGE); assert.equal(vorspielTage({ vorspiel_tage: 14 }), 14); assert.equal(vorspielTage({ vorspiel_tage: 9999 }), VORSPIEL_TAGE);
});

test("📨 Kind sendet an Lehrkraft + Register-Kollegen; Fremde werden aus der Liste entfernt; nur eigene Aufnahme", async () => {
  const f = await hoch(kind); assert.ok(f.id, JSON.stringify(f));
  const r = await sp(kind, "vorspiele", { id: "t-vs1", von: kind, stueck: "Menuett", aufnahme: "datei:" + f.id, dauer_sek: 60, an_art: "auswahl", an: ["p-leitung", kollege, fremd] });
  const z = r.gespeichert?.[0]; assert.ok(z, JSON.stringify(r.konflikte));
  assert.deepEqual(z.an.sort(), ["p-leitung", kollege].sort(), "fremde Eltern sind keine erlaubten Empfänger");
  assert.ok(z.loeschen_am > new Date().toISOString().slice(0, 10));
  const fremdDatei = await hoch("p-leitung");
  assert.equal((await sp(kind, "vorspiele", { id: "t-vs2", von: kind, aufnahme: "datei:" + fremdDatei.id, an: ["p-leitung"] })).konflikte?.[0]?.grund, "NUR_EIGENE_DATEI");
  assert.equal((await sp(kind, "vorspiele", { id: "t-vs3", von: kind, aufnahme: "datei:" + f.id, an: [fremd] })).konflikte?.[0]?.grund, "KEINE_EMPFAENGER");
  assert.equal((await sp(kind, "vorspiele", { id: "t-vs4", von: kollege, aufnahme: "datei:" + f.id, an: ["p-leitung"] })).konflikte?.[0]?.grund, "NICHT_MEINE_PERSON");
  assert.equal((await sp(kind, "vorspiele", { ...z, stueck: "anders" })).konflikte?.[0]?.grund, "NICHT_AENDERBAR");
});

test("🔒 Nur Kind, Eltern und gewählte Empfänger sehen und hören das Vorspiel – auch die Leitung nicht, wenn nicht gewählt", async () => {
  const f = await hoch(kind);
  assert.ok((await sp(kind, "vorspiele", { id: "t-vs5", von: kind, aufnahme: "datei:" + f.id, an_art: "register", an: [kollege] })).gespeichert?.[0]);
  assert.ok((await lade(kollege)).vorspiele.some((v) => v.id === "t-vs5"), "Empfänger sieht es");
  assert.equal(await holen(kollege, f.id), 200, "Empfänger hört es");
  assert.ok(!(await lade("p-leitung")).vorspiele.some((v) => v.id === "t-vs5"), "Leitung nicht gewählt → sieht es nicht");
  assert.equal(await holen("p-leitung", f.id), 403);
  assert.ok(!(await lade(fremd)).vorspiele.some((v) => v.id === "t-vs5")); assert.equal(await holen(fremd, f.id), 403);
  if (elternKind) assert.ok((await lade(elternKind)).vorspiele.some((v) => v.id === "t-vs5"), "Eltern sehen die Vorspiele ihres Kindes");
});

test("🛡️ Ohne Einwilligung „Übe-Aufnahmen“ kann ein Kind nicht senden", async () => {
  const f = await hoch(ohne);
  assert.equal((await sp(ohne, "vorspiele", { id: "t-vs6", von: ohne, aufnahme: "datei:" + f.id, an: ["p-leitung"] })).konflikte?.[0]?.grund, "KEINE_EINWILLIGUNG_AUFNAHME");
});

test("💬 Empfänger antworten (gehört, Tipp, Sprachantwort); Antworten sieht das Kind, nicht die anderen Empfänger", async () => {
  const f = await hoch(kind);
  assert.ok((await sp(kind, "vorspiele", { id: "t-vs7", von: kind, aufnahme: "datei:" + f.id, an_art: "auswahl", an: ["p-leitung", kollege] })).gespeichert?.[0]);
  assert.equal((await sp("p-leitung", "vorspiel_antworten", { id: "t-va1", vorspiel_id: "t-vs7", art: "gehoert", von: kind })).gespeichert?.[0]?.von, "p-leitung", "von setzt der Server");
  assert.ok((await sp("p-leitung", "vorspiel_antworten", { id: "t-va2", vorspiel_id: "t-vs7", art: "tipp", text: "👍 Super!" })).gespeichert?.[0]);
  const s = await hoch("p-leitung");
  assert.ok((await sp("p-leitung", "vorspiel_antworten", { id: "t-va3", vorspiel_id: "t-vs7", art: "sprache", aufnahme: "datei:" + s.id })).gespeichert?.[0]);
  assert.equal((await sp(fremd, "vorspiel_antworten", { id: "t-va4", vorspiel_id: "t-vs7", art: "tipp", text: "x" })).konflikte?.[0]?.grund, "VORSPIEL_FEHLT");
  const k = await lade(kind); assert.equal(k.vorspiel_antworten.filter((a) => a.vorspiel_id === "t-vs7").length, 3);
  assert.equal(await holen(kind, s.id), 200, "Kind hört die Sprachantwort");
  assert.equal((await lade(kollege)).vorspiel_antworten.filter((a) => a.vorspiel_id === "t-vs7").length, 0, "andere Empfänger sehen die Antworten der Lehrkraft nicht");
});

test("🗑️ Kind zieht zurück; nach Ablauf der Aufbewahrung wird gelöscht (samt Antworten und Datei)", async () => {
  const f = await hoch(kind);
  const z = (await sp(kind, "vorspiele", { id: "t-vs8", von: kind, aufnahme: "datei:" + f.id, an: ["p-leitung"] })).gespeichert[0];
  assert.ok((await sp(kind, "vorspiele", { ...z, geloescht_am: new Date().toISOString() })).gespeichert?.[0]?.geloescht_am);
  await db.q(`update bk_vorspiele set loeschen_am = current_date - 1 where id = 't-vs7'`);
  await nachrichtenAufraeumen(db, { loeschen: async () => {}, lesen: async () => null });
  assert.ok((await db.q(`select geloescht_am from bk_vorspiele where id = 't-vs7'`))[0].geloescht_am, "abgelaufen → gelöscht");
  assert.ok((await db.q(`select count(*)::int as n from bk_vorspiel_antworten where vorspiel_id = 't-vs7' and geloescht_am is null`))[0].n === 0, "Antworten mit");
});

test("🔴 Live-Vorspiel: Anruf im Musik-Modus (Mikrofon ohne Sprachfilter); Aufnahme ebenso; Kachel und Hilfe vorhanden", () => {
  const anruf = lies("js/app/anruf.js"), vs = lies("js/app/vorspiel.js"), sp = lies("js/app/sprache.js");
  assert.match(anruf, /musik \? \{ echoCancellation: false, noiseSuppression: false, autoGainControl: false \}/);
  assert.match(vs, /anrufen\(pid, "audio", \{ musik: true \}\)/); assert.match(vs, /aufnahme\(\{ maxSek: VORSPIEL_MAX_SEK, musik: true/);
  assert.match(sp, /audioBitsPerSecond: musik \? 64000 : 32000/);
  assert.match(lies("js/app/start.js"), /id: "vorspiel", sym: "🎙️"/); assert.match(lies("js/kern/hilfe.js"), /h\("vorspiel-live"/);
});

test("0.79.6 Kinder und Eltern finden Vorspiel und Bühne auf ihrer eigenen Startseite", () => {
  const k = lies("js/app/kinderstart.js"), e = lies("js/app/elternstart.js");
  assert.match(k, /\["vorspiel", "🎙️", "Vorspiel", "vorspiel"\]/); assert.match(k, /\["buehne", "🎭", "Bühne", "buehne"/);
  assert.match(k, /data-a="kindKachel" data-x="vorspiel">🎙️ Vorspielen/, "Knopf bei den Übe-Aufgaben");
  assert.match(e, /\["vorspiel", "🎙️", "Vorspiel"\], \["buehne", "🎭", "Bühne"\]/);
  assert.equal((k.match(/^ {2}\["\w+", "[^"]+", "[^"]+"/gm) || []).length % 2, 0, "gerade Zahl Kacheln (Zweier-Raster ohne Lücke)");
});

test("📅 0.79.7 Live-Vorspiel verabreden: anfragen, nur wer am Zug ist antwortet, Gegenvorschlag, annehmen, absagen", async () => {
  const in2 = (t, h) => new Date(Date.now() + t * 86400000 + h * 3600000).toISOString();
  const z1 = in2(3, 0), z2 = in2(4, 0), z3 = in2(5, 1);
  const r = await sp(kind, "vorspiel_termine", { id: "t-vt1", kind, lehrkraft: "p-leitung", zeiten: [z1, z2], dauer_min: 15, notiz: "Menuett", status: "angenommen", am_zug: "kind" });
  const a = r.gespeichert?.[0]; assert.ok(a, JSON.stringify(r.konflikte));
  assert.equal(a.status, "offen", "Status setzt der Server"); assert.equal(a.am_zug, "lehrkraft"); assert.equal(a.angefragt_von, kind);
  assert.equal((await sp(kind, "vorspiel_termine", { id: "t-vt0", kind, lehrkraft: fremd, zeiten: [z1] })).konflikte?.[0]?.grund, "KEINE_LEHRKRAFT");
  assert.equal((await sp(kind, "vorspiel_termine", { id: "t-vt9", kind, lehrkraft: "p-leitung", zeiten: [new Date(Date.now() - 3600000).toISOString()] })).konflikte?.[0]?.grund, "ZEIT_VORBEI");
  // das Kind ist nicht am Zug
  assert.equal((await sp(kind, "vorspiel_termine", { ...a, status: "angenommen", termin: z1 })).konflikte?.[0]?.grund, "NICHT_AM_ZUG");
  // Lehrkraft schlägt eine andere Zeit vor → Kind ist dran
  const g = (await sp("p-leitung", "vorspiel_termine", { ...a, zeiten: [z3], verlauf: [...a.verlauf, { wer: "p-leitung", was: "gegenvorschlag", text: "Freitag?" }] })).gespeichert?.[0];
  assert.equal(g.am_zug, "kind"); assert.deepEqual(g.zeiten, [new Date(z3).toISOString()]); assert.equal(g.verlauf.at(-1).wer, "p-leitung"); assert.equal(g.verlauf.at(-1).text, "Freitag?");
  assert.equal((await sp(kind, "vorspiel_termine", { ...g, status: "angenommen", termin: z1 })).konflikte?.[0]?.grund, "ZEIT_NICHT_VORGESCHLAGEN", "nur vorgeschlagene Zeiten");
  assert.equal((await sp(kind, "vorspiel_termine", { ...g, lehrkraft: fremd })).konflikte?.[0]?.grund, "PERSONEN_FEST");
  const ok = (await sp(kind, "vorspiel_termine", { ...g, status: "angenommen", termin: z3 })).gespeichert?.[0];
  assert.equal(ok.status, "angenommen"); assert.equal(Date.parse(ok.termin), Date.parse(z3));
  // sehen: Kind, Eltern, Lehrkraft – sonst niemand
  assert.ok((await lade("p-leitung")).vorspiel_termine.some((x) => x.id === "t-vt1"));
  assert.ok(!(await lade(fremd)).vorspiel_termine.some((x) => x.id === "t-vt1"));
  assert.ok(!(await lade(kollege)).vorspiel_termine.some((x) => x.id === "t-vt1"));
  if (elternKind) assert.ok((await lade(elternKind)).vorspiel_termine.some((x) => x.id === "t-vt1"));
  assert.equal((await sp(fremd, "vorspiel_termine", { ...ok, status: "abgesagt" })).konflikte?.[0]?.grund, "NICHT_BETEILIGT");
  assert.equal((await sp("p-leitung", "vorspiel_termine", { ...ok, status: "abgesagt" })).gespeichert?.[0]?.status, "abgesagt", "beide Seiten können absagen");
});
test("📅 Lehrkraft lädt ein Kind ein (dann ist das Kind am Zug); Kind lehnt ab", async () => {
  const z = new Date(Date.now() + 3 * 86400000).toISOString();
  const a = (await sp("p-leitung", "vorspiel_termine", { id: "t-vt2", kind, lehrkraft: "p-leitung", zeiten: [z], dauer_min: 20 })).gespeichert?.[0];
  assert.equal(a.am_zug, "kind");
  assert.equal((await sp("p-leitung", "vorspiel_termine", { ...a, status: "abgelehnt" })).konflikte?.[0]?.grund, "NICHT_AM_ZUG");
  assert.equal((await sp(kind, "vorspiel_termine", { ...a, status: "abgelehnt" })).gespeichert?.[0]?.status, "abgelehnt");
  assert.equal((await sp(fremd, "vorspiel_termine", { id: "t-vt3", kind, lehrkraft: "p-leitung", zeiten: [z] })).konflikte?.[0]?.grund, "NICHT_MEINE_PERSON");
});
