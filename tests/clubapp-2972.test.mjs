// 🆕 0.75.0 Neues aus der Club App 2.958–2.972: 💬 vorhandene Runde (KC-CLUB-CHAT-VORHANDEN), 📱 liest lieber WhatsApp (KC-CLUB-WA-LIEBER),
// 🖨️ nie eine fast leere letzte Seite (KC-CLUB-DRUCK-FUSS-NIE-ALLEIN), 💐 Gute-Besserung-Karte (KC-CLUB-GENESUNGSKARTE)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { umbrueche } from "../js/kern/pdf.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.16" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lade = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("📱 liest lieber WhatsApp: nur Erwachsene setzen es selbst; andere sehen es nur mit sichtbarer Nummer", async () => {
  const ich = (await lade("p-leitung")).personen.find((p) => p.id === "p-leitung");
  const r = (await sp("p-leitung", "personen", { ...ich, whatsapp_lieber: true })).gespeichert?.[0];
  assert.equal(r.whatsapp_lieber, true);
  const nurEltern = (p) => p.typ === "eltern" && codes[p.id] && (p.rollen || []).every((r) => r === "eltern");
  const eltern = d.personen.find(nurEltern).id;
  const sicht = (await lade(eltern)).personen.find((p) => p.id === "p-leitung");
  assert.equal(sicht.whatsapp_lieber, true, "Leitung: Nummer ist für Eltern sichtbar (Ansprechpartner)"); assert.ok(sicht.mobil);
  const kind = d.personen.find((p) => p.typ === "schueler" && p.status === "aktiv" && codes[p.id] && !(p.jahrgang >= 12));
  const k = (await lade(kind.id)).personen.find((p) => p.id === kind.id);
  const kr = (await sp(kind.id, "personen", { ...k, whatsapp_lieber: true })).gespeichert?.[0];
  assert.notEqual(kr?.whatsapp_lieber, true, "Kinder können es nicht einschalten (Kinderschutz)");
  const kinder = (e) => new Set(d.eltern_kind.filter((x) => x.eltern_id === e).map((x) => x.kind_id));
  const ohneNr = d.personen.find((p) => nurEltern(p) && p.id !== eltern && ![...kinder(p.id)].some((k) => kinder(eltern).has(k))); // andere Familie
  const o = (await lade(ohneNr.id)).personen.find((p) => p.id === ohneNr.id);
  await sp(ohneNr.id, "personen", { ...o, whatsapp_lieber: true, freigaben: { mobil: false } });
  const fremd = (await lade(eltern)).personen.find((p) => p.id === ohneNr.id);
  assert.ok(!fremd || fremd.whatsapp_lieber !== true, "ohne freigegebene Nummer bleibt es unsichtbar");
  assert.match(lies("supabase/migrations/20261202000000_bk_whatsapp_lieber.sql"), /add column if not exists whatsapp_lieber boolean/);
});

test("📱 Senden: WhatsApp öffnet sich im Einzelchat nur unter Erwachsenen, nur Text, abschaltbar je Gerät", () => {
  const n = lies("js/app/nachrichten.js");
  assert.match(n, /export const waLieberAn = \(p, n\) => !!\(p\?\.whatsapp_lieber && p\.mobil && erwachsen\(p\) && erwachsen\(S\.ich\) && einst\(\)\.waAuto !== false && !n\.anlagen\?\.length && !n\.geheim && !n\.express\)/);
  assert.match(n, /chatPartnerVon\(u\)\), waLieber = !!partner && waLieberAn\(partner, n\)/, "nur im Einzelchat (chatPartnerVon nur bei „einzel“)");
  const e = lies("js/app/einstellungen.js"); assert.match(e, /Ich lese lieber WhatsApp/); assert.match(e, /"waAuto"/);
});

test("💬 vorhandene Runde mit genau diesen Personen wird angeboten (nicht geheim, nicht Orchester-Chats)", () => {
  const n = lies("js/app/nachrichten.js");
  assert.match(n, /u\.art === "runde" && !u\.geloescht_am && !u\.geheim && gleicheMitglieder\(u, mitglieder\)/);
  assert.match(n, /Ja, dort schreiben/); assert.match(n, /data-a="chatNeuWeiter" data-x="neu"/);
});

test("🖨️ nie eine fast leere letzte Seite: die vorletzte Seite schneidet früher, wenn eine Blockgrenze passt", () => {
  assert.deepEqual(umbrueche(2500, 1000, [300, 700, 950, 1200, 1900, 2300]), [0, 950, 1900], "normaler Fall unverändert");
  assert.deepEqual(umbrueche(2050, 1000, [300, 600, 700, 900, 980, 1500, 1700, 1900, 1980]), [0, 980, 1900], "statt 70 px Rest jetzt 150 px");
  assert.deepEqual(umbrueche(1040, 1000, [200, 500, 800, 990]), [0, 800]);
  const r = umbrueche(1040, 1000, []); assert.deepEqual(r, [0, 1000], "ohne Grenze geht es nicht anders");
});

test("💐 Gute-Besserung-Karte: 4 Motive, eigener Text bis 120, kein Grund, nur wer schreiben darf, Bild in den Chat", () => {
  const g = lies("js/app/genesung.js");
  for (const m of ["strauss", "geige", "teddy", "sonne"]) assert.match(g, new RegExp(`${m}: \\[`));
  assert.match(g, /maxlength="120"/); assert.match(g, /if \(!darfChatten\(pid\)\) return toast/);
  assert.match(g, /einzelchatMit\(G\.pid\)/, "Kinder: Eltern lesen mit (wie jeder Chat)");
  assert.doesNotMatch(g, /statusText|personenstatus|gesundheit/, "kein Grund auf der Karte (liest keine Status- oder Gesundheitsdaten)");
  assert.match(lies("js/app/orchester.js"), /data-a="gkOeffnen"/);
  assert.match(lies("tools/teile-karte.mjs"), /"genesung\.js"/); assert.match(lies("sw.js"), /js\/app\/genesung\.js/);
});
