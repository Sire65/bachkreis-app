// 🛡️ 0.69.0 Schutz & Einwilligungen je Kind: Eltern wählen (alles zuerst aus), Schutzsperre nur Leitung, Server setzt Sichtbarkeit und Kinder-Chat durch
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { elternVon, einwilligung } from "../js/kern/logik.js";
import { chatPartnerErlaubt, KS_STANDARD, kinderChatOffen, ksVon } from "../js/kern/schema.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.14" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lade = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const mini = () => ({ liste: (t, f = () => true) => (d[t] || []).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) });
let A, B, elternA, fremd;
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  const m = mini(), mitCode = (p) => codes[p.id] && elternVon(m, p.id).some((e) => codes[e]);
  const kids = d.personen.filter((p) => p.typ === "schueler" && p.status !== "ausgetreten" && mitCode(p) && d.kinderschutz.find((k) => k.kind_id === p.id && k.kinder_chat === "ja" && !k.schutz_aktiv && k.sichtbar === "voll"));
  [A, B] = kids.filter((k) => !elternVon(m, k.id).some((e) => elternVon(m, kids[0].id).includes(e)) || k === kids[0]).slice(0, 2);
  elternA = elternVon(m, A.id).find((e) => codes[e]);
  fremd = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && !elternVon(m, A.id).includes(p.id)).id;
});

test("🛡️ Voreinstellung: alles aus – ohne Wahl kein Kinder-Chat, nur Vorname, kein Online-Status", () => {
  assert.deepEqual([KS_STANDARD.kinder_chat, KS_STANDARD.sichtbar, KS_STANDARD.online_sichtbar, KS_STANDARD.foto_name], ["nein", "vorname", false, false]);
  assert.equal(kinderChatOffen(ksVon({}, "x")), false);
  const k = (id) => ({ id, typ: "schueler", status: "aktiv" });
  assert.equal(chatPartnerErlaubt(k("a"), k("b"), { kinderChat: (p) => p.id === "a" }), false, "beide müssen Ja sagen");
  assert.equal(chatPartnerErlaubt(k("a"), k("b"), { kinderChat: () => true }), true);
});

test("👪 Eltern wählen für das eigene Kind – Fremde nicht; Sperre setzt nur die Leitung; Bestätigung vom Server", async () => {
  const z = { id: A.id, kind_id: A.id, kinder_chat: "ja", sichtbar: "vorname", online_sichtbar: true, schutz_wunsch: true, schutz_aktiv: true, bestaetigt_von: "p-leitung", abholer: [{ name: "Oma Ingrid", beziehung: "Großmutter", telefon: "0170 1" }, { name: "" }] };
  assert.equal((await sp(fremd, "kinderschutz", z)).konflikte?.[0]?.grund, "NICHT_MEIN_KIND");
  const r = (await sp(elternA, "kinderschutz", z)).gespeichert?.[0];
  assert.equal(r.sichtbar, "vorname"); assert.equal(r.schutz_aktiv, false, "Eltern setzen keine Sperre"); assert.equal(r.bestaetigt_von, elternA); assert.equal(r.abholer.length, 1);
  assert.equal(r.schutz_geprueft_am, null, "neue Bitte → Leitung prüft");
  const l = (await sp("p-leitung", "kinderschutz", { ...r, schutz_aktiv: true })).gespeichert?.[0];
  assert.equal(l.schutz_aktiv, true); assert.equal(l.schutz_von, "p-leitung"); assert.ok(l.schutz_geprueft_am); assert.equal(l.bestaetigt_von, elternA, "Leitung bestätigt nicht im Namen der Eltern");
});

test("👀 Andere sehen ein Kind mit Schutzsperre nicht; „nur Vorname“ kürzt den Nachnamen; Lehrkraft sieht alle; Abholliste nicht für Fremde", async () => {
  const B2 = await lade(B.id);
  assert.ok(!B2.personen.some((p) => p.id === A.id), "gesperrtes Kind unsichtbar für andere Kinder");
  assert.ok(!(B2.kinderschutz || []).some((k) => k.kind_id === A.id), "Einstellungen fremder Kinder nicht sichtbar");
  await sp("p-leitung", "kinderschutz", { id: A.id, kind_id: A.id, schutz_aktiv: false });
  const nachher = (await lade(B.id)).personen.find((p) => p.id === A.id);
  assert.equal(nachher.nachname, A.nachname.slice(0, 1) + ".", "nur Vorname"); assert.equal(nachher.avatar ?? null, null);
  const lk = d.personen.find((p) => (p.rollen || []).includes("lehrkraft") && codes[p.id]).id;
  const L = await lade(lk);
  assert.equal(L.personen.find((p) => p.id === A.id).nachname, A.nachname); assert.equal(L.kinderschutz.find((k) => k.kind_id === A.id).abholer[0].name, "Oma Ingrid");
});

test("💬 Privater Chat zwischen zwei Kindern nur, wenn beide Familien Ja sagen", async () => {
  await sp(elternA, "kinderschutz", { id: A.id, kind_id: A.id, kinder_chat: "nein" });
  const u = { id: "u-ks-1", art: "einzel", titel: "", mitglieder: [B.id, A.id] };
  assert.ok((await sp(B.id, "unterhaltungen", u)).konflikte?.length, "A sagt Nein → kein Chat");
  await sp(elternA, "kinderschutz", { id: A.id, kind_id: A.id, kinder_chat: "ja" });
  assert.ok((await sp(B.id, "unterhaltungen", { ...u, id: "u-ks-2" })).gespeichert?.length, "beide Ja → Chat geht");
});

test("📷 Eltern geben Foto-Einwilligungen selbst; Schutzsperre heißt immer „nein“", async () => {
  const v = d.genehmigung_vorlagen.find((x) => x.zweck === "foto_website");
  const r = (await sp(elternA, "genehmigungen", { id: "g-ks-1", vorlage_id: v.id, kind_id: A.id, status: "erteilt" })).gespeichert?.[0];
  assert.equal(r.status, "erteilt"); assert.equal(r.beantwortet_von, elternA);
  assert.equal((await sp(fremd, "genehmigungen", { id: "g-ks-2", vorlage_id: v.id, kind_id: A.id, status: "erteilt" })).konflikte?.[0]?.grund, "NICHT_MEIN_KIND");
  const andere = d.genehmigung_vorlagen.find((x) => x.zweck === "reise" || x.zweck === "teilnahme");
  if (andere) assert.equal((await sp(elternA, "genehmigungen", { id: "g-ks-3", vorlage_id: andere.id, kind_id: A.id, status: "erteilt" })).konflikte?.[0]?.grund, "NUR_ANFRAGE_DER_LEITUNG");
  const m = { liste: (t, f = () => true) => (t === "kinderschutz" ? [{ kind_id: "k", id: "k", schutz_aktiv: true }] : t === "genehmigung_vorlagen" ? [{ id: "v", zweck: "foto_intern" }] : t === "genehmigungen" ? [{ kind_id: "k", vorlage_id: "v", status: "erteilt", beantwortet_am: "2026-01-01" }] : []).filter(f),
    hole: (t, id) => (t === "kinderschutz" && id === "k" ? { schutz_aktiv: true } : t === "personen" ? { id, typ: "schueler" } : null) };
  assert.equal(einwilligung(m, "k", "foto_intern"), "nein");
});

test("🧭 Eingebaut: Assistent nach der Zustimmung, Meins-Kachel, Bitte erledigen, Schutz & Fotos, Abholliste, Migration", () => {
  const k = lies("js/app/kinderschutz.js");
  for (const w of ["schutzPruefen", "ksFertig", "ksAbholerNeu", "schutz_wunsch", "bk-schutz-fertig", "genehmigungen"]) assert.ok(k.includes(w), w);
  assert.match(lies("js/app/main.js"), /teilLaden\("kinderschutz\.js"\)/);
  assert.match(lies("js/app/start.js"), /id: "kinderschutz".*v: "kinderschutz"/);
  assert.match(lies("js/app/elternstart.js"), /fürs neue Schuljahr bestätigen/);
  const s = lies("js/app/schutz.js"); for (const w of ["ksSperre", "ksGeprueft", "Darf abholen", "🛡️ Schutz & Fotos"]) assert.ok(s.includes(w), w);
  assert.match(lies("supabase/migrations/20261128000000_bk_kinderschutz.sql"), /grant select, insert, update, delete on bk_kinderschutz to service_role/);
});
