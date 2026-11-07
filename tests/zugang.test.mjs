// 🔑 0.31.0 Zugang & Organisation: Umfrage mit freier Antwort, „Zugang im Blick“ nur für die Leitung, 📲 Gerät-Art beim Online-Melden.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token, ip = "7.7.7.9") => verarbeiten(db, body, { token, ip }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("✏️ Umfrage mit freier Antwort: nur die eigene, gekürzt; ohne „frei“ nicht möglich", async () => {
  const L = await login(dp.leitung), u = d.unterhaltungen.find((x) => x.art === "einzel" && (x.mitglieder || []).includes(dp.leitung));
  assert.ok(u, "Einzelchat der Leitung");
  const anderer = u.mitglieder.find((m) => m !== dp.leitung);
  const n = { id: "na-uf", unterhaltung_id: u.id, von: dp.leitung, text: "", zeit: new Date().toISOString(), umfrage: { frage: "Wann proben?", optionen: ["Mo", "Di"], frei: true } };
  let r = (await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [n] }, L)).json;
  assert.equal(r.gespeichert[0].umfrage.frei, true);
  const A = await login(anderer);
  r = (await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ ...r.gespeichert[0], umfrage_frei: { [anderer]: "  Mittwoch geht auch " + "x".repeat(200), [dp.leitung]: "gefälscht" } }] }, A)).json;
  const f = r.gespeichert[0].umfrage_frei;
  assert.ok(f[anderer].startsWith("Mittwoch geht auch") && [...f[anderer]].length === 120, "gekürzt auf 120");
  assert.equal(f[dp.leitung], undefined, "fremde Antwort nicht setzbar");
  const ohne = (await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ ...n, id: "na-uf2", umfrage: { frage: "X?", optionen: ["a", "b"] } }] }, L)).json.gespeichert[0];
  r = (await rufe({ aktion: "speichern", tab: "nachrichten", zeilen: [{ ...ohne, umfrage_frei: { [anderer]: "frei" } }] }, A)).json;
  assert.deepEqual(r.gespeichert[0].umfrage_frei || {}, {}, "ohne frei keine eigene Antwort");
});

test("🛡️ Zugang im Blick: nur Leitung; zählt Fehlversuche, zeigt Gerät-Art – ohne IP", async () => {
  for (let i = 0; i < 3; i++) await rufe({ aktion: "anmelden", code: "FALSCH99" }, null, "9.9.9.9");
  const S = await login(dp.schueler);
  await rufe({ aktion: "online", modus: "installiert" }, S);
  await rufe({ aktion: "online", modus: "hack" }, await login(dp.eltern));
  assert.equal((await rufe({ aktion: "zugang_lage" }, S)).status, 403);
  const r = (await rufe({ aktion: "zugang_lage" }, await login(dp.leitung))).json;
  assert.ok(r.ok && r.fehl24 >= 3 && r.tage.length >= 1);
  assert.equal(r.geraete.find((g) => g.person_id === dp.schueler)?.modus, "installiert");
  assert.equal(r.geraete.find((g) => g.person_id === dp.eltern)?.modus ?? null, null, "unbekannte Art wird nicht gespeichert");
  assert.ok(!JSON.stringify(r).includes("9.9.9.9") && !JSON.stringify(r).includes("ip_hash"), "keine Adresse");
});

test("💤 Wach-Aufruf ohne Anmeldung: nur „ok“, keine Daten", async () => {
  const r = await rufe({ aktion: "wach" });
  assert.equal(r.status, 200); assert.deepEqual(r.json, { ok: true });
});
test("💾 Speicher-Lage: nur Leitung; Datenbankgröße, Dateien, größte Tabellen, Grenzen des Gratis-Tarifs", async () => {
  assert.equal((await rufe({ aktion: "speicher_lage" }, await login(dp.eltern))).status, 403);
  const r = (await rufe({ aktion: "speicher_lage" }, await login(dp.leitung))).json;
  assert.ok(r.ok && r.dbBytes > 0 && Array.isArray(r.dateien) && r.tabellen.length > 0);
  assert.deepEqual(r.grenzen, { db_mb: 500, dateien_mb: 1024 });
  assert.ok(r.tabellen.every((t) => t.tabelle.startsWith("bk_")));
});
test("🧹 Wartung räumt das Änderungsprotokoll nach 12 Monaten auf (neuere Einträge bleiben)", async () => {
  const { wartung } = await import("../supabase/functions/_shared/kom/kern.js");
  await db.q(`insert into bk_aenderungen (id, zeit, tabelle, zeile_id, aktion) values ('ae-alt', now() - interval '13 months', 'termine', 't1', 'geaendert'), ('ae-neu', now() - interval '2 months', 'termine', 't1', 'geaendert')`);
  await wartung(db, {}, {});
  const ids = (await db.q(`select id from bk_aenderungen where id in ('ae-alt', 'ae-neu')`)).map((x) => x.id);
  assert.deepEqual(ids, ["ae-neu"]);
});
