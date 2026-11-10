// 🪪 0.61.0 Mein Ausweis: QR mit Prüfcode (HMAC), nur gültig mit passendem Code; prüfen dürfen nur Leitung/Lehrkraft/Vorstand
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, K;
const dienste = { kalenderGeheimnis: "geheim-test-123" };
const rufe = (body, token, di = dienste) => verarbeiten(db, body, { token, ip: "9.9.9.10" }, di);
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
before(async () => { ({ db, d, codes } = await demoDatenbank()); K = d.personen.find((p) => p.typ === "schueler" && codes[p.id]).id; });

test("🪪 Ausweis: Inhalt mit Prüfcode, ohne Geheimnis nicht eingerichtet", async () => {
  const r = await rufe({ aktion: "mein_ausweis" }, await login(K));
  assert.equal(r.status, 200); assert.match(r.json.inhalt, new RegExp(`^BK1:${K}:[A-Z0-9]{10}$`)); assert.match(r.json.nummer, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await rufe({ aktion: "mein_ausweis" }, await login(K), {})).json.fehler, "AUSWEIS_NICHT_EINGERICHTET");
});
test("🔍 Prüfen: echt → Name, gefälscht → ungültig; nur Leitung/Lehrkraft/Vorstand", async () => {
  const echt = (await rufe({ aktion: "mein_ausweis" }, await login(K))).json.inhalt;
  const ok = await rufe({ aktion: "ausweis_pruefen", inhalt: echt }, await login("p-leitung"));
  assert.equal(ok.json.gueltig, true); assert.equal(ok.json.person.id, K); assert.ok(!("geburtsdatum" in ok.json.person));
  const falsch = echt.replace(/:[A-Z0-9]{10}$/, ":AAAAAAAAAA");
  assert.equal((await rufe({ aktion: "ausweis_pruefen", inhalt: falsch }, await login("p-leitung"))).json.gueltig, false);
  const andere = echt.replace(`:${K}:`, ":p-leitung:");
  assert.equal((await rufe({ aktion: "ausweis_pruefen", inhalt: andere }, await login("p-leitung"))).json.gueltig, false, "Code passt nur zur eigenen Person");
  assert.equal((await rufe({ aktion: "ausweis_pruefen", inhalt: echt }, await login(K))).status, 403);
});
test("⚡ Zeile über den Kacheln wie in der Club App", () => {
  const s = readFileSync(new URL("../js/app/start.js", import.meta.url), "utf8");
  assert.match(s, /data-a="schnellstartOben"[^>]*>Schnellzugriff</); assert.match(s, /&gt; Einfache Ansicht &lt;/); assert.match(s, /&lt; Erweiterte Ansicht &gt;/);
  assert.match(s, /data-a="ausweisZeigen"/);
});
test("🔍 0.62.0 Ausweis prüfen: Kamera-Seite für Leitung/Lehrkraft/Vorstand, jsQR als Ersatz, Kachel und Eltern-Zeile", () => {
  const a = readFileSync(new URL("../js/app/ausweis.js", import.meta.url), "utf8"), s = readFileSync(new URL("../js/app/start.js", import.meta.url), "utf8");
  assert.match(a, /VIEWS\.ausweispruefen/); assert.match(a, /lib\/jsqr\/jsQR\.js/); assert.match(a, /getSupportedFormats/);
  assert.match(s, /id: "ausweispruefen"[^\n]*hatRolle\("admin", "leitung", "lehrkraft", "vorstand"\)/);
  assert.ok(readFileSync(new URL("../lib/jsqr/LICENSE", import.meta.url), "utf8").includes("Apache License"));
  assert.match(readFileSync(new URL("../js/app/elternstart.js", import.meta.url), "utf8"), /data-a="ausweisZeigen"/);
});
