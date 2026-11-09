// 🎟️ 0.56.0 Konzertkarten: Reservierung ohne Konto nur mit Karten-Link, kein Überbuchen, Grenze je Anschluss, Storno mit Nr.,
// Besucherdaten nur für Leitung/Vorstand (ohne IP-Hash), Abendkasse abhaken; 📊 Jahresbericht eingebaut
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, T;
const tok = {};
const rufe = (body, token, ip = "9.9.9.7") => verarbeiten(db, body, { token, ip });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, `Anmeldung ${pid}`); return (tok[pid] = r.json.token); }
const karten = (unter, rest = {}, ip) => rufe({ aktion: "karten", k: T.karten_token, unter, ...rest }, undefined, ip);
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten.kartenreservierungen || [];
const lies = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  T = d.termine.find((t) => t.karten_aktiv);
  await db.q(`update bk_termine set karten_plaetze = 20, karten_je = 6, beginn = now() + interval '10 days' where id = $1`, [T.id]);
});

test("🎟️ Info nur mit gültigem Link – ohne Namen anderer Besucher", async () => {
  assert.equal((await rufe({ aktion: "karten", k: "falsch-falsch-falsch", unter: "info" })).status, 404);
  assert.equal((await rufe({ aktion: "karten", k: "x", unter: "info" })).status, 404);
  const r = await karten("info");
  assert.equal(r.status, 200); assert.equal(r.json.konzert.titel, T.titel);
  const belegt = d.kartenreservierungen.filter((x) => x.status !== "storniert").reduce((s, x) => s + x.anzahl, 0);
  assert.equal(r.json.konzert.frei, 20 - belegt);
  assert.ok(!JSON.stringify(r.json).includes("Familie Brandt"), "keine Besuchernamen");
});

test("🎟️ Reservieren, nicht überbuchen, Höchstzahl je Reservierung, Grenze je Anschluss, Storno", async () => {
  assert.equal((await karten("reservieren", { name: "A", anzahl: 1 })).json.fehler, "NAME_FEHLT");
  assert.equal((await karten("reservieren", { name: "Anna Test", anzahl: 7 })).json.fehler, "ANZAHL_UNGUELTIG");
  assert.equal((await karten("reservieren", { name: "Anna Test", email: "kaputt", anzahl: 1 })).json.fehler, "EMAIL_UNGUELTIG");
  const frei = (await karten("info")).json.konzert.frei;
  const r = await karten("reservieren", { name: "Anna Test", email: "anna@example.org", anzahl: 2 }, "1.1.1.1");
  assert.equal(r.status, 200); assert.match(r.json.code, /^[A-Z2-9]{6}$/); assert.equal(r.json.konzert.frei, frei - 2);
  const zuViel = await karten("reservieren", { name: "Bernd Test", anzahl: Math.min(6, frei - 1) }, "1.1.1.2");
  assert.equal(zuViel.status, 409); assert.equal(zuViel.json.fehler, "AUSVERKAUFT");
  await db.q(`update bk_termine set karten_plaetze = 100 where id = $1`, [T.id]);
  for (let i = 0; i < 5; i++) assert.equal((await karten("reservieren", { name: "Viel Test " + i, anzahl: 1 }, "2.2.2.2")).status, 200);
  assert.equal((await karten("reservieren", { name: "Viel Test 5", anzahl: 1 }, "2.2.2.2")).status, 429, "höchstens 5 je Anschluss und Stunde");
  assert.equal((await karten("stornieren", { code: "ZZZZZZ" })).status, 404);
  const st = await karten("stornieren", { code: r.json.code.toLowerCase() });
  assert.equal(st.status, 200); assert.equal(st.json.konzert.frei, (await karten("info")).json.konzert.frei);
  assert.equal((await karten("stornieren", { code: r.json.code })).status, 404, "nur einmal");
});

test("👀 Leitung sieht die Liste (ohne IP-Hash) und hakt ab – andere sehen nichts", async () => {
  const l = await laden("p-leitung");
  const anna = l.find((x) => x.name === "Anna Test");
  assert.ok(anna); assert.ok(!("ip_hash" in anna)); assert.equal(anna.status, "storniert");
  const schueler = d.personen.find((p) => p.typ === "schueler" && codes[p.id]);
  assert.equal((await laden(schueler.id)).length, 0);
  const offen = l.find((x) => x.status === "reserviert");
  const sp = async (pid, z) => (await rufe({ aktion: "speichern", tab: "kartenreservierungen", zeilen: [z] }, await login(pid))).json;
  assert.equal((await sp(schueler.id, { ...offen, status: "abgeholt" })).konflikte[0].grund, "NUR_LEITUNG_VORSTAND");
  const g = (await sp("p-leitung", { ...offen, status: "abgeholt", code: "HACK00", ip_hash: "x" })).gespeichert[0];
  assert.equal(g.status, "abgeholt"); assert.equal(g.code, offen.code, "Nr. bleibt");
  const hand = (await sp("p-leitung", { id: "kr-hand", termin_id: T.id, name: "Kasse Müller", anzahl: 3, code: "SELBST" })).gespeichert[0];
  assert.equal(hand.quelle, "kasse"); assert.equal(hand.code, null);
});

test("🗑️ Besucherdaten 30 Tage nach dem Konzert gelöscht; Seite, Link und Jahresbericht eingebaut", async () => {
  assert.match(lies("supabase/functions/_shared/kom/kern.js"), /delete from bk_kartenreservierungen[^;]*interval '30 days'/);
  assert.ok(lies("karten.html").includes('src="js/karten.js'));
  assert.ok(lies(".github/workflows/pages.yml").includes("karten.html"));
  const jb = lies("js/app/jahresbericht.js");
  for (const w of ["VIEWS.jahresbericht", "AKTIONEN.jbPdf", "Schuljahr", "spenden"]) assert.ok(jb.includes(w), w);
  assert.ok(!/nachrichten/.test(jb.replace(/^\/\/.*$/gm, "")), "Jahresbericht zählt keine Chats");
});
