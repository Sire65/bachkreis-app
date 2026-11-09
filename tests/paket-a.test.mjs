// 📨👤👥🔒🙋💼 0.51.0 Paket A: Kontakt teilen, Konferenz, Geheim schreiben, Gäste am Runden Tisch, Anklopfen „sprechen“
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { erwachsen } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";
import { webcrypto } from "node:crypto";

let db, pg, d, codes, S;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.6" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, `Anmeldung ${pid}`); return (tok[pid] = r.json.token); }
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const ANGEBOT = { type: "offer", sdp: "v=0\r\n" };
const G = { iv: "AAAAAAAAAAAAAAAA", ct: "c2VocmdlaGVpbQ==" };
before(async () => { ({ db, pg, d, codes } = await demoDatenbank()); ({ schueler: S } = d.__konfig.demo_personen); });
const einzel = async (a, b, id) => (await speichern(a, "unterhaltungen", [{ id, art: "einzel", titel: "", mitglieder: [a, b] }])).gespeichert?.[0];
const nachricht = (uid, von, extra) => ({ id: "n-" + Math.random().toString(36).slice(2), unterhaltung_id: uid, von, text: "", ...extra });

test("👤 Kontakt teilen: Erwachsene ja – Kontakte von Kindern nie", async () => {
  const u = await einzel("p-lk1", "p-leitung", "u-pa-1"); assert.ok(u, "Einzelchat");
  const ok = await speichern("p-lk1", "nachrichten", [nachricht(u.id, "p-lk1", { kontakt: "p-fv1" })]);
  assert.equal(ok.gespeichert?.[0]?.kontakt, "p-fv1", JSON.stringify(ok.konflikte));
  assert.equal((await speichern("p-lk1", "nachrichten", [nachricht(u.id, "p-lk1", { kontakt: S })])).konflikte[0].grund, "KONTAKT_NICHT_ERLAUBT");
});

test("👥 Konferenz-Einladung: nur Erwachsene, nur gültiger Raum", async () => {
  const g = d.unterhaltungen.find((x) => x.art === "gruppe");
  const ok = await speichern("p-leitung", "nachrichten", [nachricht(g.id, "p-leitung", { text: "👥 Konferenz", konferenz: "k-abcdef123456" })]);
  assert.equal(ok.gespeichert?.[0]?.konferenz, "k-abcdef123456", JSON.stringify(ok.konflikte));
  assert.equal((await speichern("p-leitung", "nachrichten", [nachricht(g.id, "p-leitung", { text: "x", konferenz: "bachkreis; drop" })])).konflikte[0].grund, "RAUM_FEHLT");
});

test("🔒 Geheim: nur Einzelchat unter Erwachsenen; Server speichert nur Zeichensalat; nicht änderbar; Modul abschaltbar", async () => {
  const u = (await laden("p-lk1")).unterhaltungen.find((x) => x.id === "u-pa-1");
  const r = await speichern("p-lk1", "nachrichten", [nachricht(u.id, "p-lk1", { text: "Mein Geheimnis", geheim: G })]);
  const n = r.gespeichert?.[0]; assert.ok(n, JSON.stringify(r.konflikte));
  assert.equal(n.text, "🔒 Geheime Nachricht", "Klartext nie auf dem Server"); assert.equal(n.geheim.ct, G.ct);
  assert.equal((await speichern("p-lk1", "nachrichten", [{ ...n, text: "anders" }])).konflikte[0].grund, "GEHEIM_NICHT_AENDERBAR");
  // Kind: Lehrkraft ↔ Kind ist eine Runde mit Eltern → nie geheim
  const kc = (await speichern("p-lk1", "unterhaltungen", [{ id: "u-pa-k", art: "einzel", titel: "", mitglieder: ["p-lk1", S] }])).gespeichert?.[0];
  if (kc) assert.equal((await speichern("p-lk1", "nachrichten", [nachricht(kc.id, "p-lk1", { geheim: G })])).konflikte[0].grund, "GEHEIM_NUR_ERWACHSENE_EINZEL");
  const grp = d.unterhaltungen.find((x) => x.art === "gruppe");
  assert.equal((await speichern("p-leitung", "nachrichten", [nachricht(grp.id, "p-leitung", { geheim: G })])).konflikte[0].grund, "GEHEIM_NUR_ERWACHSENE_EINZEL");
  assert.equal((await speichern("p-lk1", "nachrichten", [nachricht(u.id, "p-lk1", { geheim: { iv: "<script>", ct: "x" } })])).konflikte[0].grund, "GEHEIM_UNGUELTIG");
  await pg.query(`insert into bk_konfig (schluessel, wert) values ('module_aus', '["geheim"]'::jsonb) on conflict (schluessel) do update set wert = excluded.wert`);
  assert.equal((await speichern("p-lk1", "nachrichten", [nachricht(u.id, "p-lk1", { geheim: G })])).konflikte[0].grund, "MODUL_AUS");
  await pg.query(`delete from bk_konfig where schluessel = 'module_aus'`);
});

test("🔑 Öffentliche Schlüssel: jede/r nur den eigenen, nie den privaten Teil; alle dürfen sie sehen", async () => {
  const k = await webcrypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const priv = await webcrypto.subtle.exportKey("jwk", k.privateKey), pub = await webcrypto.subtle.exportKey("jwk", k.publicKey);
  assert.equal((await speichern("p-lk1", "geheimschluessel", [{ id: "p-lk1", person_id: "p-lk1", pub: priv }])).konflikte[0].grund, "SCHLUESSEL_UNGUELTIG", "privater Teil wird abgelehnt");
  assert.equal((await speichern("p-lk1", "geheimschluessel", [{ id: "p-leitung", person_id: "p-leitung", pub }])).konflikte[0].grund, "NUR_EIGENER_SCHLUESSEL");
  const ok = (await speichern("p-lk1", "geheimschluessel", [{ id: "p-lk1", person_id: "p-lk1", pub: { ...pub, d: undefined }, fingerabdruck: "AB12" }])).gespeichert?.[0];
  assert.ok(ok && !ok.pub.d);
  assert.ok((await laden(S)).geheimschluessel.some((x) => x.person_id === "p-lk1"), "öffentlich");
});

test("🙋 Gast am Runden Tisch: Link nur Leitung/Admin/Vorstand, Hash nie sichtbar, Gast nur an seinem Tisch, zurückziehen sperrt", async () => {
  assert.equal((await rufe({ aktion: "tisch_gast", raum: "bachkreis", name: "Frau Weber" }, await login("p-lk1"))).status, 403);
  const r = await rufe({ aktion: "tisch_gast", raum: "bachkreis", name: "Frau Weber", stunden: 24 }, await login("p-leitung"));
  assert.equal(r.status, 200); const token = r.json.token, gid = r.json.gast.id;
  const meine = (await laden("p-leitung")).tischgaeste.find((x) => x.id === gid);
  assert.ok(meine && !("token_hash" in meine), "Hash bleibt auf dem Server");
  assert.ok(!(await laden("p-lk1")).tischgaeste.some((x) => x.id === gid), "Lehrkraft sieht die Einladung nicht");
  assert.equal((await rufe({ aktion: "gast_tisch", token: token + "x", unter: "lage" })).status, 403);
  const lage = await rufe({ aktion: "gast_tisch", token, unter: "lage" });
  assert.equal(lage.status, 200); assert.equal(lage.json.raum, "bachkreis"); const ich = lage.json.ich;
  // Leitung sitzt schon am Tisch, Gast kommt dazu und ruft an
  await speichern("p-leitung", "anrufe", [{ id: "td-pa-l", art: "tisch_da", raum_id: "bachkreis" }]);
  const da = await rufe({ aktion: "gast_tisch", token, unter: "speichern", zeile: { id: "td-pa-gast", art: "tisch_da" } });
  assert.equal(da.json.zeile.gast, ich); assert.equal(da.json.zeile.von, null);
  assert.equal((await rufe({ aktion: "gast_tisch", token, unter: "speichern", zeile: { id: "ti-pa-x", art: "tisch", an: ["p-fv1"], angebot: ANGEBOT } })).status, 403, "nur an Anwesende");
  const of = await rufe({ aktion: "gast_tisch", token, unter: "speichern", zeile: { id: "ti-pa-1", art: "tisch", an: ["p-leitung"], angebot: ANGEBOT } });
  assert.equal(of.json.zeile.status, "klingelt");
  const tl = (await rufe({ aktion: "tisch_lage", raum: "bachkreis" }, await login("p-leitung"))).json;
  assert.ok(tl.zeilen.some((x) => x.id === "ti-pa-1")); assert.match(tl.namen[ich], /Frau Weber \(Gast\)/);
  const an = (await speichern("p-leitung", "anrufe", [{ id: "ti-pa-1", status: "angenommen", antwort: { type: "answer", sdp: "v=0" } }])).gespeichert?.[0];
  assert.equal(an?.antwort?.type, "answer");
  // Mitglied bietet dem Gast eine Verbindung an (Gast war früher da)
  assert.equal((await speichern("p-fv1", "anrufe", [{ id: "ti-pa-2", art: "tisch", raum_id: "bachkreis", an: [ich], angebot: ANGEBOT }])).gespeichert?.[0]?.status, "klingelt");
  assert.equal((await speichern("p-fv1", "anrufe", [{ id: "ti-pa-3", art: "tisch", raum_id: "anderer", an: [ich], angebot: ANGEBOT }])).konflikte[0].grund, "ANRUF_NICHT_ERLAUBT", "nur an seinem Tisch");
  const g = (await laden("p-leitung")).tischgaeste.find((x) => x.id === gid);
  await speichern("p-leitung", "tischgaeste", [{ ...g, geloescht_am: new Date().toISOString() }]);
  assert.equal((await rufe({ aktion: "gast_tisch", token, unter: "lage" })).status, 403, "zurückgezogen");
});

test("👋 Anklopfen „sprechen“ wird gemerkt · 📨 Sende-Schlange und 🐌 Laden-Hinweis sind eingebaut", async () => {
  assert.equal(erwachsen(d.personen.find((p) => p.id === "p-leitung")), true);
  const ad = readFileSync(new URL("../js/kern/adapter-supabase.js", import.meta.url), "utf8"), w = readFileSync(new URL("../js/kern/warten.js", import.meta.url), "utf8");
  assert.match(ad, /wartend\(tab\)/); assert.match(w, /Nicht mehr warten/);
  const n = readFileSync(new URL("../js/app/nachrichten.js", import.meta.url), "utf8");
  assert.match(n, /schlangeHtml\(u\)/); assert.match(n, /geheimVerpacken/); assert.match(n, /kontaktHtml\(n\)/);
  assert.match(readFileSync(new URL("../supabase/functions/_shared/api.js", import.meta.url), "utf8"), /body\.art === "sprechen"/);
});
