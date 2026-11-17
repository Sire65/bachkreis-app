// 🧊 0.75.0 Hänger-Messung mit Ursache + 📖 Fehlerkatalog (wie KC-CLUB-HAENGER-URSACHE/-FEHLERKATALOG) · 🎚️ Datenverkehr-Säulen (wie KC-CLUB-PULS)
// – beides für den Admin (Wunsch Hansi „Hänger-Messung und LED-Ausschlag kann rein für Admin“)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { FEHLER_KATALOG, haengerUrsache, istHaenger, katalogZaehlen, katalogVonId } from "../js/kern/haenger.js";
import { pulsStufe, pulsRechnen, PULS_SEG } from "../js/app/puls.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.17" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("🧊 Ursache: App hat gerechnet · Gerät ausgelastet · Speicher voll · Hintergrund · nicht messbar", () => {
  const von = 1000, bis = 9000, luecke = 7000;
  assert.equal(haengerUrsache({ lang: [{ von: 1500, ms: 5000 }], von, bis, luecke, messbar: true }).ursache, "haenger_app");
  assert.equal(haengerUrsache({ lang: [{ von: 1500, ms: 500 }], von, bis, luecke, messbar: true }).ursache, "haenger_geraet");
  assert.equal(haengerUrsache({ von, bis, luecke, messbar: true, speicherAnteil: 0.9 }).ursache, "haenger_speicher");
  assert.equal(haengerUrsache({ von, bis, luecke, messbar: true, fokus: false }).ursache, "haenger_hintergrund");
  assert.equal(haengerUrsache({ von, bis, luecke, messbar: false }).ursache, "haenger");
  assert.equal(haengerUrsache({ lang: [{ von: 0, ms: 20000 }], von, bis, luecke, messbar: true }).appMs, 8000, "nur der Teil in der Lücke zählt");
  assert.ok(istHaenger({ luecke: 6000, sichtbar: true, sichtbarSeitMs: 9000 }));
  assert.ok(!istHaenger({ luecke: 4000, sichtbar: true, sichtbarSeitMs: 9000 }), "unter 5 s kein Hänger");
  assert.ok(!istHaenger({ luecke: 90000, sichtbar: true, sichtbarSeitMs: 999999 }), "über 60 s = Pause (iPad friert ein)");
  assert.ok(!istHaenger({ luecke: 6000, sichtbar: false, sichtbarSeitMs: 9000 }), "unsichtbar kein Hänger");
  const ids = Object.values(FEHLER_KATALOG).map((k) => k.id); assert.deepEqual(ids, ["BK-F-100", "BK-F-101", "BK-F-102", "BK-F-103", "BK-F-104"]);
  assert.equal(FEHLER_KATALOG.haenger_hintergrund.loesung, null, "Hintergrund ist kein Fehler"); assert.equal(katalogVonId("BK-F-102"), "haenger_geraet");
});

test("📖 Fehlerkatalog zählt je Fehler-ID wie oft und bei wie vielen Personen (im Zeitraum)", () => {
  const z = katalogZaehlen([{ fehler_id: "BK-F-102", anzahl: 3, person_id: "a", zuletzt: "2026-11-10" }, { fehler_id: "BK-F-102", anzahl: 1, person_id: "b", zuletzt: "2026-11-15" },
    { fehler_id: "BK-F-101", anzahl: 1, person_id: "a", zuletzt: "2026-11-16" }, { fehler_id: "BK-F-101", anzahl: 9, person_id: "a", zuletzt: "2026-01-01" }, { text: "ohne ID" }], { seit: "2026-11-01" });
  assert.deepEqual(z, [{ id: "BK-F-102", mal: 4, personen: 2 }, { id: "BK-F-101", mal: 1, personen: 1 }]);
});

test("🩺 Server: Hänger-Bericht mit Fehler-ID und nur Zahlen als Messwerte; Admin zählt eigene hoch und hakt ab", async () => {
  const kind = d.personen.find((p) => p.typ === "schueler" && p.status === "aktiv" && codes[p.id]).id;
  const r = (await sp(kind, "fehlerberichte", { id: "t-fb1", text: "🖥️ App reagierte 12 s nicht – Gerät war ausgelastet (BK-F-102)", fehler_id: "BK-F-102", messung: { ms: 12000, app_ms: 300, kerne: 4, messbar: true, text: "geheim", sekunden: 12 } })).gespeichert?.[0];
  assert.ok(r, "jedes Gerät darf melden");
  const z = (await db.q(`select fehler_id, messung from bk_fehlerberichte where id = 't-fb1'`))[0];
  assert.equal(z.fehler_id, "BK-F-102"); assert.deepEqual(z.messung, { ms: 12000, app_ms: 300, kerne: 4, sekunden: 12, messbar: true }, "nur Zahlen – Text fällt weg");
  await sp(kind, "fehlerberichte", { id: "t-fb2", text: "x", fehler_id: "DROP TABLE" });
  assert.equal((await db.q(`select fehler_id from bk_fehlerberichte where id = 't-fb2'`))[0].fehler_id, null, "nur echte Katalog-IDs");
  const a1 = (await sp("p-entwickler", "fehlerberichte", { id: "t-fb3", text: "🧊 …", fehler_id: "BK-F-100" })).gespeichert[0];
  const a2 = (await sp("p-entwickler", "fehlerberichte", { ...a1, anzahl: 1 })).gespeichert[0]; assert.equal(a2.anzahl, 2, "Admin: eigener Bericht zählt hoch");
  const a3 = (await sp("p-entwickler", "fehlerberichte", { ...a2, erledigt: true })).gespeichert[0]; assert.equal(a3.erledigt, true); assert.equal(a3.anzahl, 2);
  assert.match(lies("supabase/migrations/20261203000000_bk_haenger_puls.sql"), /add column if not exists fehler_id text;[\s\S]*messung jsonb/);
});

test("🎚️ Puls: nur Admin; Zählerstände ohne Inhalte; je Sekunde, logarithmisch, nie negativ; grau wenn nicht messbar", async () => {
  const eltern = d.personen.find((p) => p.typ === "eltern" && codes[p.id] && (p.rollen || []).every((r) => r === "eltern")).id;
  assert.equal((await rufe({ aktion: "betrieb_puls" }, await login(eltern))).status, 403);
  const r = await rufe({ aktion: "betrieb_puls" }, await login("p-entwickler"));
  assert.equal(r.status, 200); assert.deepEqual(Object.keys(r.json).sort(), ["lesen", "ok", "online", "schreiben", "t"]);
  assert.ok(r.json.lesen === null || Number.isFinite(r.json.lesen));
  assert.deepEqual(pulsRechnen({ t: 0, lesen: 100, schreiben: 10, online: 2 }, { t: 4000, lesen: 140, schreiben: 6, online: 3 }), { lesen: 10, schreiben: 0, online: 3, t: 4000 });
  assert.equal(pulsRechnen({ t: 0, lesen: null }, { t: 4000, lesen: null }), null, "nicht messbar → kein Wert");
  assert.equal(pulsStufe(0, 40), 0); assert.equal(pulsStufe(40, 40), PULS_SEG); assert.equal(pulsStufe(1000, 40), PULS_SEG); assert.ok(pulsStufe(2, 40) >= 2 && pulsStufe(2, 40) <= 3, "logarithmisch: wenig sieht man schon");
  const p = lies("js/app/puls.js"); assert.match(p, /hatRolle\("admin"\) && einst\(\)\.puls !== false/); assert.match(p, /S\.view === "start"/); assert.match(p, /classList\.toggle\("grau"/);
  assert.match(lies("js/app/kopf.js"), /\$\{pulsHtml\(\)\}/); assert.match(lies("js/app/einstellungen.js"), /Datenverkehr-Anzeige im Kopf/);
  assert.match(lies("js/app/main.js"), /haengerWaechter\(/); assert.match(lies("js/app/adminbereich.js"), /istAdmin\(\) && sekunden > 10/, "Fenster nur für Admin");
});
