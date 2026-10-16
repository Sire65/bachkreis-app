// 📦 Inventar & Abschreibung: linear monatsgenau, GWG sofort, Abgang (gestohlen/verkauft), eindeutige Nummern; Server-Korrekturen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { abschreibung, inventarBestand, naechsteInventarNr } from "../js/kern/logik.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { filtern, kontext } from "../supabase/functions/_shared/regeln.js";
import { demoDatenbank } from "./demo-db.mjs";

const st = new Date("2026-10-16T12:00:00");
test("Abschreibung linear: monatsgenau ab Anschaffungsmonat, Restwert nie negativ", () => {
  const a = abschreibung("ausstattung", { kategorie: "notenstaender", wert: 1200, anschaffung: "2025-07-10" }, { stichtag: st });
  assert.equal(a.art, "linear"); assert.equal(a.jahre, 10);
  assert.equal(a.afaJahr, 120, "2026 volles Jahr: 1200/10");
  assert.equal(abschreibung("ausstattung", { kategorie: "notenstaender", wert: 1200, anschaffung: "2025-07-10" }, { stichtag: st, jahr: 2025 }).afaJahr, 60, "2025: Juli–Dezember = 6 Monate");
  assert.equal(a.kumuliert, 160, "Juli 2025 bis Oktober 2026 = 16 Monate à 10 €");
  assert.equal(a.restwert, 1040);
  assert.equal(a.endeJahr, 2035);
  const alt = abschreibung("inventar", { wert: 900, anschaffung: "2000-01-01" }, { stichtag: st });
  assert.equal(alt.restwert, 0); assert.equal(alt.afaJahr, 0);
});
test("Abschreibung: bis 800 € sofort (GWG), „keine“ behält den Wert, eigene Nutzungsdauer", () => {
  const g = abschreibung("ausstattung", { kategorie: "dirigent", wert: 85, anschaffung: "2026-03-01" }, { stichtag: st });
  assert.equal(g.art, "sofort"); assert.equal(g.afaJahr, 85); assert.equal(g.restwert, 0);
  assert.equal(abschreibung("inventar", { wert: 5000, anschaffung: "2020-01-01", afa_art: "keine" }, { stichtag: st }).restwert, 5000);
  assert.equal(abschreibung("ausstattung", { kategorie: "edv", wert: 1200, anschaffung: "2026-01-15", afa_jahre: 1, afa_art: "linear" }, { stichtag: st }).afaJahr, 1200);
  assert.equal(abschreibung("ausstattung", { wert: 100 }, { stichtag: st }).ohneDaten, true);
});
test("Abgang: gestohlen/verkauft → Abschreibung bis zum Abgangsmonat, Restwert 0, Buchwert beim Abgang", () => {
  const a = abschreibung("inventar", { wert: 1200, anschaffung: "2025-01-01", status: "gestohlen", ausgeschieden_am: "2026-03-20" }, { stichtag: st });
  assert.equal(a.abgang, true); assert.equal(a.restwert, 0);
  assert.equal(a.kumuliert, 150, "15 Monate (Jan 2025 – März 2026)");
  assert.equal(a.buchwertAbgang, 1050);
  assert.equal(a.afaJahr, 30, "2026 nur Januar–März");
});
test("Demodaten: Bestand aus Instrumenten und Ausstattung, Nummern eindeutig, nächste Nummer frei", () => {
  const d = erzeugeDemodaten(st), db = { liste: (t, f) => (d[t] || []).filter(f || (() => true)), hole: (t, id) => (d[t] || []).find((z) => z.id === id) };
  const b = inventarBestand(db, { stichtag: st });
  assert.ok(b.some((x) => x.art === "notenstaender") && b.some((x) => x.art === "dirigent") && b.some((x) => x.tab === "inventar"));
  const nrn = b.map((x) => x.nr.toLowerCase());
  assert.equal(new Set(nrn).size, nrn.length, "Inventar-Nr. eindeutig");
  assert.ok(["defekt", "gestohlen", "vermisst", "reparatur"].every((s) => b.some((x) => x.z.status === s)), "Problemfälle in der Vorführung");
  assert.equal(naechsteInventarNr(db, "A-"), `A-${String(d.ausstattung.length + 1).padStart(3, "0")}`);
  assert.ok(!d.ausleihen.some((a) => ["defekt", "gestohlen"].includes(d.inventar.find((i) => i.id === a.inventar_id)?.status)), "defekte/gestohlene Instrumente sind nicht verliehen");
});
test("Server: Ausstattung nur für Verwalter, „nur Gruppe“-Stimmen nur für diese Gruppe, Ausgetretene können sich nicht anmelden", async () => {
  const { db, d, codes } = await demoDatenbank({ jetzt: new Date() });
  const schueler = d.personen.find((p) => p.typ === "schueler" && codes[p.id]);
  const alle = { ...d };
  const ctx = kontext(schueler, alle);
  assert.equal(filtern("ausstattung", d.ausstattung, ctx).length, 0, "Schüler sehen keine Ausstattung");
  const fremd = d.gruppen.find((g) => !ctx.gruppen.has(g.id));
  const reg = [...ctx.register][0];
  const st1 = { id: "st-x", werk_id: "w-1", bezeichnung: "nur fremd", register_id: reg, gruppe_id: fremd.id, datei: "" };
  assert.equal(filtern("stimmen", [st1], ctx).length, 0);
  assert.equal(filtern("stimmen", [{ ...st1, gruppe_id: [...ctx.gruppen][0] }], ctx).length, 1);
  assert.equal((await verarbeiten(db, { aktion: "anmelden", code: codes[schueler.id] }, { ip: "1.2.3.4" }, {})).status, 200);
  await db.q(`update bk_personen set status = 'ausgetreten' where id = $1`, [schueler.id]);
  assert.equal((await verarbeiten(db, { aktion: "anmelden", code: codes[schueler.id] }, { ip: "1.2.3.5" }, {})).status, 401, "ausgetreten → kein Login");
});
