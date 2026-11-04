// 📣 0.30.0 Startnachricht der Leitung: Empfänger-Regel, nur Leitung schreibt, Antworten nur im eigenen Namen, Server setzt Zeit/„später“.
// Dazu: ausdrückliche Rechte für service_role in jeder Migration (wie KC-SUPABASE-GRANTS) und die Uhr-/Bedien-Bausteine.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { snFuerMich, snAntwortId } from "../js/kern/schema.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "7.7.7.8" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("Empfänger-Regel: alle · Orchester (auch Eltern der Kinder) · Personen · abgelaufen · nicht an sich selbst", () => {
  const g = new Set(["g-a"]);
  assert.equal(snFuerMich({ an: "alle", von: "x" }, "p1", g), true);
  assert.equal(snFuerMich({ an: "alle", von: "p1" }, "p1", g), false, "nicht an den Absender");
  assert.equal(snFuerMich({ an: "gruppen", gruppen: ["g-a"], von: "x" }, "p1", g), true);
  assert.equal(snFuerMich({ an: "gruppen", gruppen: ["g-b"], von: "x" }, "p1", g), false);
  assert.equal(snFuerMich({ an: "personen", personen: ["p1"], von: "x" }, "p1", g), true);
  assert.equal(snFuerMich({ an: "alle", von: "x", bis: "2020-01-01" }, "p1", g, "2026-11-04"), false, "abgelaufen");
  assert.equal(snFuerMich({ an: "alle", von: "x", geloescht_am: "2026-01-01" }, "p1", g), false);
});

test("📣 Nur die Leitung schreibt; Absender und Zeit setzt der Server; Eltern/Schüler dürfen nicht", async () => {
  let r = await speichern(dp.leitung, "startnachrichten", { id: "sn-1", text: "  Bitte Gesicht aussuchen 🙂 ", von: dp.eltern, an: "personen", personen: [dp.eltern, dp.schueler], wahl: true, ziel: "gesicht", zeit: "2000-01-01T00:00:00Z" });
  const z = r.gespeichert[0];
  assert.equal(z.von, dp.leitung, "Absender = wer schreibt"); assert.equal(z.text, "Bitte Gesicht aussuchen 🙂");
  assert.ok(z.zeit > "2020", "Zeit vom Server");
  assert.equal((await speichern(dp.leitung, "startnachrichten", { id: "sn-x", text: "x", an: "gruppen", gruppen: [] })).konflikte[0].grund, "EMPFAENGER_FEHLT");
  assert.equal((await speichern(dp.leitung, "startnachrichten", { id: "sn-y", text: "x".repeat(1001) })).konflikte[0].grund, "TEXT_UNGUELTIG");
  assert.equal((await speichern(dp.eltern, "startnachrichten", { id: "sn-e", text: "Hallo alle", an: "alle" })).konflikte?.length, 1, "Eltern schreiben keine Startnachricht");
  assert.equal((await speichern(dp.leitung, "startnachrichten", { id: "sn-z", text: "Link", ziel: "https://böse.example" })).gespeichert[0].ziel, null, "nur feste Ziele");
});

test("✅ Antworten: nur Empfänger, nur im eigenen Namen, „später“ = 24 Std.; Absender sieht die Antworten, andere nicht", async () => {
  const id = snAntwortId("sn-1", dp.eltern);
  let r = await speichern(dp.eltern, "startnachricht_antworten", { id, nachricht_id: "sn-1", person_id: dp.eltern, antwort: "spaeter", am: "2000-01-01T00:00:00Z" });
  const a = r.gespeichert[0];
  assert.equal(a.antwort, "spaeter"); assert.ok(Date.parse(a.spaeter_bis) - Date.parse(a.am) >= 23 * 3600000, "später ≈ 24 Std.");
  r = await speichern(dp.eltern, "startnachricht_antworten", { id, nachricht_id: "sn-1", person_id: dp.eltern, antwort: "ja", rueckfrage: "Wo finde ich das?" });
  assert.equal(r.gespeichert[0].antwort, "ja"); assert.equal(r.gespeichert[0].spaeter_bis, null); assert.equal(r.gespeichert[0].rueckfrage, "Wo finde ich das?");
  assert.equal((await speichern(dp.eltern, "startnachricht_antworten", { id: snAntwortId("sn-1", dp.schueler), nachricht_id: "sn-1", person_id: dp.schueler, antwort: "nein" })).konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await speichern(dp.eltern, "startnachricht_antworten", { id: "frei", nachricht_id: "sn-1", person_id: dp.eltern, antwort: "ja" })).konflikte[0].grund, "ID_UNGUELTIG");
  assert.equal((await speichern(dp.eltern, "startnachricht_antworten", { id, nachricht_id: "sn-1", person_id: dp.eltern, antwort: "vielleicht" })).konflikte[0].grund, "ANTWORT_UNGUELTIG");
  const fremd = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && p.id !== dp.eltern && !d.startnachrichten.some((n) => (n.personen || []).includes(p.id)));
  assert.equal((await speichern(fremd.id, "startnachricht_antworten", { id: snAntwortId("sn-1", fremd.id), nachricht_id: "sn-1", person_id: fremd.id, antwort: "ja" })).konflikte[0].grund, "NACHRICHT_NICHT_FUER_MICH");
  const E = await laden(dp.eltern), F = await laden(fremd.id), L = await laden(dp.leitung);
  assert.ok(E.startnachrichten.some((z) => z.id === "sn-1")); assert.ok(!(F.startnachrichten || []).some((z) => z.id === "sn-1"), "nicht an mich → unsichtbar");
  assert.ok(L.startnachricht_antworten.some((x) => x.id === id), "Leitung sieht die Antwort");
  assert.equal((F.startnachricht_antworten || []).length, 0);
});

test("🔐 Jede Migration gibt neue Tabellen ausdrücklich nur service_role frei (KC-SUPABASE-GRANTS)", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql"))) {
    const sql = readFileSync(new URL(f, dir), "utf8");
    for (const [, t] of sql.matchAll(/alter table (bk_\w+) enable row level security;/g)) {
      assert.ok(sql.includes(`grant select, insert, update, delete on ${t} to service_role;`), `${f}: grant für ${t} fehlt`);
      assert.ok(sql.includes(`revoke all on ${t} from public, anon, authenticated;`), `${f}: revoke für ${t} fehlt`);
    }
  }
});
