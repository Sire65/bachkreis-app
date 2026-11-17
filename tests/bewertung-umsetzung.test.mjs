// 🧭 0.76.0 Umsetzung der Bewertung vom 17.11. (Punkte 2–5): Technik ausgedünnt + Pilot-Grundausstattung, einheitliche Rückfrage-Fenster,
// Auswertungen mit Verläufen, Kachel-Nutzung anonym (Server ohne Person). Die Hilfe prüft tests/hilfe-aktuell.test.mjs.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { mitgliederVerlauf, zuAbgaenge, probenbesuchMonate, probenbesuchRegister, besetzungRegister, leihVerlauf, kachelAuswertung, csv, monate } from "../js/kern/auswertung.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.18" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const mini = () => ({ liste: (t, f = () => true) => (d[t] || []).filter((z) => !z.geloescht_am).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) || null });
before(async () => { ({ db, d, codes } = await demoDatenbank()); });

test("🧰 Technik: direkt nur Update, Installieren, Kalender, Datenschutz, Hilfe – Rest unter „Weitere Technik“ (nichts entfernt)", () => {
  const s = lies("js/app/start.js"), t = s.slice(s.indexOf("  technik: ["), s.indexOf("\n  ],", s.indexOf("  technik: [")));
  const ids = [...t.matchAll(/\{ id: "(\w+)"/g)].map((m) => m[1]), mehr = [...t.matchAll(/\{ id: "(\w+)"[^\n]*mehr: true/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((x) => !mehr.includes(x)), ["update", "installieren", "kalender", "datenschutz", "hilfe", "demo"]);
  assert.ok(mehr.length >= 10, "Selteneres unter „Weitere Technik“"); assert.match(s, /VIEWS\.technikMehr = \{/); assert.match(s, /\[\.\.\.Object\.values\(KACHELN\)\.flat\(\), MEHR_KACHEL\]/, "Lupe/Kachel-Aktion findet alles");
  assert.match(lies("tests/e2e/rundgang.mjs"), /technikmehr/, "Rundgang prüft auch die Kacheln unter „Weitere Technik“");
});
test("🎯 Pilot-Grundausstattung: vier Module aus, umkehrbar, mit Rückfrage", () => {
  const a = lies("js/app/adminbereich.js");
  assert.match(a, /export const PILOT_AUS = \["anrufe", "tisch", "fernhilfe", "geheim"\]/); assert.match(a, /Alle Module wieder an/); assert.match(a, /AKTIONEN\.adPilot = async/);
});
test("❓ keine grauen Browser-Fenster mehr: kein confirm()/prompt() im Programm; frage()/eingabe() als App-Fenster", () => {
  const dateien = ["js/app", "js/kern", "js/verwaltung"].flatMap((o) => readdirSync(new URL("../" + o, import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => `${o}/${f}`)).concat(["js/karten.js"]);
  for (const f of dateien) {
    const t = lies(f).replace(/^\s*\/\/.*$/gm, "").replace(/installEreignis\.prompt\(\)/g, "");
    assert.doesNotMatch(t, /(^|[^.\w])(window\.)?confirm\(|(^|[^.\w])prompt\(/m, `${f} benutzt noch ein Browser-Fenster`);
  }
  const ui = lies("js/kern/ui.js");
  assert.match(ui, /export const frage = /); assert.match(ui, /export const eingabe = /); assert.match(ui, /e\.key === "Escape"/); assert.match(ui, /role="alertdialog" aria-modal="true"/);
  assert.match(lies("css/app.css"), /\.frage-hg \{ position: fixed; inset: 0; z-index: 9800/, "über allen anderen Fenstern");
});
test("📈 Auswertungen: Verläufe, Zu-/Abgänge, Probenbesuch, Besetzung Ist/Soll, Leihinstrumente, CSV", () => {
  const m = mini(), h = new Date();
  assert.equal(monate(24, h).length, 24); assert.equal(monate(3, new Date("2026-01-15")).map((x) => x.label).join(","), "Nov 25,Dez 25,Jan 26");
  const mv = mitgliederVerlauf(m, { n: 6, heute: h }); assert.equal(mv.length, 6); assert.ok(mv[5].wert > 0, "Mitglieder heute");
  const za = zuAbgaenge(m, { heute: h }); assert.equal(za.length, 5); assert.ok(za.every((x) => Number.isInteger(x.zu) && Number.isInteger(x.ab)));
  const pm = probenbesuchMonate(m, { n: 6, heute: h }); assert.ok(pm.some((x) => x.wert != null && x.wert >= 0 && x.wert <= 100));
  const pr = probenbesuchRegister(m, { von: new Date(h.getTime() - 180 * 864e5) }); assert.ok(pr.length && pr.every((x) => x.erfasst > 0));
  const bs = besetzungRegister(m, "g-a"); assert.ok(bs.some((x) => x.soll), "Soll aus den Orchester-Einstellungen");
  assert.equal(leihVerlauf(m, { n: 3, heute: h }).length, 3);
  const k = kachelAuswertung({ termine: 5, nachrichten: 2, gibtsnicht: 9 }, [{ id: "termine" }, { id: "nachrichten" }, { id: "pinnwand" }]);
  assert.deepEqual(k.genutzt.map((x) => x.id), ["termine", "nachrichten"]); assert.deepEqual(k.nie.map((x) => x.id), ["pinnwand"]);
  assert.equal(csv(["a", "b"], [["x;y", 'zit"at']]), '﻿a;b\r\n"x;y";"zit""at"', "Semikolon und Anführungszeichen sicher");
  const a = lies("js/app/auswertungen.js"); assert.match(a, /Als Tabelle/); assert.match(a, /awCsv/); assert.match(lies("js/app/start.js"), /id: "auswertungen"[^\n]*istVerwalter\(\)/);
});
test("🧭 Kachel-Nutzung: anonym (keine Person in der Tabelle), begrenzt, nur Leitung/Vorstand/Admin lesen", async () => {
  const sql = lies("supabase/migrations/20261204000000_bk_kachel_nutzung.sql");
  assert.match(sql, /create table if not exists bk_kachel_nutzung \(tag date not null, kachel text not null, anzahl integer/); assert.doesNotMatch(sql, /person/);
  assert.match(sql, /enable row level security/); assert.match(sql, /grant select, insert, update, delete on bk_kachel_nutzung to service_role/);
  const kind = d.personen.find((p) => p.typ === "schueler" && p.status === "aktiv" && codes[p.id]).id, t = new Date().toISOString().slice(0, 10), alt = "2020-01-01";
  const r = await rufe({ aktion: "kachel_nutzung", tage: { [t]: { termine: 3, "böse;drop": 5, nachrichten: 9999 }, [alt]: { termine: 1 } } }, await login(kind));
  assert.equal(r.json.gezaehlt, 2, "ungültige Kachel und alter Tag fallen weg");
  await rufe({ aktion: "kachel_nutzung", tage: { [t]: { termine: 2 } } }, await login(kind));
  const z = await db.q(`select kachel, anzahl from bk_kachel_nutzung order by kachel`); assert.deepEqual(z.map((x) => [x.kachel, x.anzahl]), [["nachrichten", 500], ["termine", 5]], "aufaddiert, höchstens 500 je Meldung");
  assert.equal((await rufe({ aktion: "kachel_nutzung_lesen", tage: 30 }, await login(kind))).status, 403);
  const l = await rufe({ aktion: "kachel_nutzung_lesen", tage: 30 }, await login("p-leitung")); assert.deepEqual(l.json.zaehlung, { nachrichten: 500, termine: 5 });
  const kz = lies("js/app/kachelzaehler.js").replace(/^\s*\/\/.*$/gm, ""); assert.match(kz, /TAKT = 600000/, "höchstens alle 10 Minuten senden"); assert.doesNotMatch(kz, /S\.ich|person/i, "nie die Person");
});
