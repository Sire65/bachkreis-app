// ✨ 0.22.0: Mitfahrten, Übeaufgaben, Papier-Exemplare, Räume, Löschfrist-Wartung, Cockpit-Hinweise (Miete, Schlüssel, Führungszeugnis, Beiträge).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { wartung } from "../supabase/functions/_shared/kom/kern.js";
import { cockpit } from "../js/kern/logik.js";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "5.5.5.5" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("🚗 Mitfahrt: Eltern buchen nur eigene Kinder, fremde bleiben, voll ist voll; Schüler bieten nicht an", async () => {
  const m = d.mitfahrten.find((x) => x.id === "mf-2") || d.mitfahrten[0];
  const t = d.termine.find((x) => x.id === m.termin_id);
  const familien = d.eltern_kind.filter((e) => e.eltern_id !== m.fahrer_id && codes[e.eltern_id] && d.gruppe_zuordnung.some((z) => z.person_id === e.kind_id && (t.gruppen || []).includes(z.gruppe_id)));
  const [f1, f2] = [familien[0], familien.find((x) => x.eltern_id !== familien[0].eltern_id)];
  let r = await speichern(f1.eltern_id, "mitfahrten", { ...m, mitfahrer: [f1.kind_id, "p-fremd"], plaetze: 8, abfahrt: "gehackt" });
  assert.deepEqual(r.gespeichert[0].mitfahrer, [f1.kind_id], "nur das eigene Kind, Rest unverändert");
  assert.equal(r.gespeichert[0].plaetze, m.plaetze, "Plätze ändert nur der Fahrer");
  r = await speichern(f2.eltern_id, "mitfahrten", { ...r.gespeichert[0], mitfahrer: [f2.kind_id] });
  assert.deepEqual(r.gespeichert[0].mitfahrer.sort(), [f1.kind_id, f2.kind_id].sort(), "fremdes Kind bleibt drin");
  const f3 = familien.find((x) => ![f1.eltern_id, f2.eltern_id].includes(x.eltern_id));
  if (f3 && m.plaetze <= 2) assert.equal((await speichern(f3.eltern_id, "mitfahrten", { ...r.gespeichert[0], mitfahrer: [...r.gespeichert[0].mitfahrer, f3.kind_id] })).konflikte[0].grund, "VOLL");
  assert.equal((await speichern(dp.schueler, "mitfahrten", { id: "mf-x", termin_id: m.termin_id, fahrer_id: dp.schueler, plaetze: 2 })).konflikte[0].grund, "NUR_ERWACHSENE");
});

test("📝 Übeaufgaben: Schüler sieht Aufgaben für sich/Register/Gruppe und hakt nur sich selbst ab", async () => {
  const S = await laden(dp.schueler);
  const ids = S.uebeaufgaben.map((a) => a.id);
  assert.ok(ids.includes("ua-1") && ids.includes("ua-2"), JSON.stringify(ids));
  const a = S.uebeaufgaben.find((x) => x.id === "ua-2");
  const r = await speichern(dp.schueler, "uebeaufgaben", { ...a, erledigt: [dp.schueler, "p-fremd"], titel: "geändert" });
  assert.deepEqual(r.gespeichert[0].erledigt, [dp.schueler]);
  assert.equal(r.gespeichert[0].titel, a.titel, "Titel bleibt");
  const fremd = d.personen.find((p) => p.typ === "schueler" && codes[p.id] && !d.gruppe_zuordnung.some((z) => z.person_id === p.id && z.gruppe_id === "g-a"));
  assert.ok(!(await laden(fremd.id)).uebeaufgaben.some((x) => x.id === "ua-3"), "A-Orchester-Aufgabe nicht für andere Gruppen");
});

test("📄 Papier-Exemplare: jeder sieht nur die eigenen · 🚪 Räume sieht jeder · 🔑 Schlüssel nur Verwaltung", async () => {
  const e = d.notenexemplare[0];
  assert.ok((await laden(e.person_id)).notenexemplare.every((x) => x.person_id === e.person_id));
  const S = await laden(dp.schueler);
  assert.ok(S.raeume.length >= 2); assert.equal((S.schluessel || []).length, 0);
});

test("🧹 Wartung löscht abgelaufene Gesundheitsangaben automatisch", async () => {
  const alt = d.gesundheit.find((g) => g.loeschen_am < new Date().toISOString().slice(0, 10));
  assert.ok(alt, "Demo hat eine abgelaufene Angabe");
  const b = await wartung(db, {}, {});
  assert.ok(b.geloescht >= 1);
  const z = (await db.q(`select geloescht_am, allergien from bk_gesundheit where id = $1`, [alt.id]))[0];
  assert.ok(z.geloescht_am && z.allergien == null, "gelöscht und Inhalt geleert");
});

test("🧭 Cockpit: Mietmaterial, Schlüssel überfällig, Führungszeugnis der Begleitpersonen, offene Beiträge", () => {
  const dd = erzeugeDemodaten(new Date());
  dd.werke.find((w) => w.id === "w-4").miete_bis = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  dd.projekte.find((p) => p.id === "pr-freizeit").begleiter.push(dd.personen.find((p) => p.typ === "eltern").id);
  const db2 = { liste: (t, f) => (dd[t] || []).filter(f || (() => true)), hole: (t, id) => (dd[t] || []).find((z) => z.id === id), konfig: () => dd.__konfig };
  const c = cockpit(db2, "p-leitung").map((x) => x.sym + " " + x.text);
  assert.ok(c.some((t) => t.startsWith("📜") && /Exemplare/.test(t)), "Mietmaterial mit Exemplaren");
  assert.ok(c.some((t) => t.startsWith("🔑")), "Schlüssel überfällig");
  assert.ok(c.some((t) => t.startsWith("🛡️")), "Führungszeugnis fehlt");
});

test("🙋 Gesuch: Eltern suchen nur für eigene Kinder; „Ich nehme mit“ setzt nur sich selbst; eine fremde Zusage bleibt", async () => {
  const fahrt = d.termine.find((t) => t.projekt_id === "pr-freizeit");
  const fam = d.eltern_kind.filter((e) => codes[e.eltern_id] && d.gruppe_zuordnung.some((z) => z.person_id === e.kind_id && (fahrt.gruppen || []).includes(z.gruppe_id)));
  const elternVon = (k) => d.eltern_kind.filter((e) => e.kind_id === k).map((e) => e.eltern_id);
  const gewaehlt = [];
  for (const e of fam) if (!gewaehlt.some((x) => x.kind_id === e.kind_id || elternVon(x.kind_id).includes(e.eltern_id) || elternVon(e.kind_id).includes(x.eltern_id))) gewaehlt.push(e);
  const [a, b, c] = gewaehlt;
  let r = await speichern(a.eltern_id, "mitfahrten", { id: "mf-g1", termin_id: fahrt.id, art: "gesuch", fahrer_id: a.eltern_id, richtung: "hin", mitfahrer: [a.kind_id, b.kind_id], zusage_von: c.eltern_id });
  assert.deepEqual(r.gespeichert[0].mitfahrer, [a.kind_id], "nur das eigene Kind");
  assert.equal(r.gespeichert[0].zusage_von, null, "Zusage nicht selbst setzen");
  r = await speichern(b.eltern_id, "mitfahrten", { ...r.gespeichert[0], zusage_von: b.eltern_id, mitfahrer: [], abfahrt: "gehackt" });
  assert.equal(r.gespeichert[0].zusage_von, b.eltern_id); assert.deepEqual(r.gespeichert[0].mitfahrer, [a.kind_id], "Gesuch sonst unverändert");
  assert.equal((await speichern(c.eltern_id, "mitfahrten", { ...r.gespeichert[0], zusage_von: c.eltern_id })).konflikte[0].grund, "SCHON_ZUGESAGT");
  r = await speichern(b.eltern_id, "mitfahrten", { ...r.gespeichert[0], zusage_von: null });
  assert.equal(r.gespeichert[0].zusage_von, null, "eigene Zusage zurücknehmen");
  assert.equal((await speichern(c.eltern_id, "mitfahrten", { id: "mf-g2", termin_id: fahrt.id, art: "gesuch", fahrer_id: c.eltern_id, mitfahrer: [a.kind_id] })).konflikte[0].grund, "KIND_FEHLT");
});
