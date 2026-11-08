// 🎬📁🪧 0.48.0 Paket 4: Sitzungen, Unterlagen, Schilder
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { sitzungFuerMich } from "../js/kern/schema.js";
import { schritte, fristBis, protokollText } from "../js/app/sitzung.js";
import { schildHtml, VORLAGEN } from "../js/app/schilder.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, d, codes, S, E;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.8" });
const tok = {};
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200); return (tok[pid] = r.json.token); }
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const speichern = async (pid, tab, zeilen) => (await rufe({ aktion: "speichern", tab, zeilen }, await login(pid))).json;
before(async () => { ({ db, d, codes } = await demoDatenbank({ geaendert: "2026-10-01T00:00:00Z" })); ({ schueler: S, eltern: E } = d.__konfig.demo_personen); });

test("🎬 Sitzung: planen nur Leitung/Vorstand; in Planung nur fürs Büro, nach Einladung für die Zielgruppe", async () => {
  assert.equal((await speichern("p-lk1", "versammlungen", [{ id: "vs-x", titel: "Test", beginn: "2026-12-01T18:00:00Z" }])).konflikte[0].grund, "NUR_LEITUNG");
  const s = (await speichern("p-fv1", "versammlungen", [{ id: "si-t", titel: "Elternabend", art: "elternabend", zielgruppe: "eltern", beginn: "2026-12-01T18:00:00Z", status: "planung", tagesordnung: [{ titel: "Fahrt 2027", minuten: 20, unsinn: 1 }, { titel: "" }] }])).gespeichert[0];
  assert.deepEqual(s.tagesordnung.map((p) => p.titel), ["Fahrt 2027"]);
  assert.ok(!(await laden(E)).versammlungen.some((x) => x.id === "si-t"), "Planung noch nicht sichtbar");
  await speichern("p-fv1", "versammlungen", [{ ...s, status: "eingeladen", eingeladen_am: "2026-11-20T10:00:00Z" }]);
  assert.ok((await laden(E)).versammlungen.some((x) => x.id === "si-t"), "Eltern sehen den Elternabend");
  assert.ok(!(await laden(S)).versammlungen.some((x) => x.id === "si-t"), "Kinder nicht");
  assert.ok(!(await laden("p-lk1")).versammlungen.some((x) => x.id === "si-1"), "Lehrkraft sieht die Vorstandssitzung nicht");
  assert.ok(sitzungFuerMich({ zielgruppe: "team" }, { typ: "lehrkraft" }, ["lehrkraft"]) && !sitzungFuerMich({ zielgruppe: "vorstand" }, { typ: "eltern" }, []));
});

test("🎬 Schritte, Frist und Protokolltext", () => {
  const s = { titel: "Vorstand", art: "vorstand", zielgruppe: "vorstand", beginn: "2026-12-10T18:30:00Z", frist_tage: 3, tagesordnung: [{ titel: "Kasse", notiz: "Bestand 1.234 €", beschluss: "einstimmig entlastet" }] };
  assert.equal(fristBis(s).toISOString().slice(0, 10), "2026-12-07");
  const st = schritte(s, new Date("2026-12-08T10:00:00Z"));
  assert.equal(st.find(([k]) => k === "einladen")[3], "Frist verpasst"); assert.equal(st.find(([k]) => k === "to")[2], true);
  const t = protokollText(s, new Date("2026-12-11T10:00:00Z"));
  assert.match(t, /TOP 1: Kasse/); assert.match(t, /Beschluss: einstimmig entlastet/); assert.match(t, /Aufgaben \(wer · was · bis wann\):/);
});

test("📁 Unterlagen: Familie und Leitung sehen sie; Eltern legen nur für die eigene Familie ab; Kinder nicht selbst", async () => {
  const kind = d.eltern_kind.find((e) => e.eltern_id === E).kind_id;
  const u = (await speichern(E, "unterlagen", [{ id: "ul-t", person_id: kind, titel: "Attest", art: "attest", datei: "datei:abc-1", von: "p-leitung" }])).gespeichert[0];
  assert.equal(u.von, E);
  const fremd = d.personen.find((p) => p.typ === "schueler" && !d.eltern_kind.some((e) => e.eltern_id === E && e.kind_id === p.id)).id;
  assert.equal((await speichern(E, "unterlagen", [{ id: "ul-f", person_id: fremd, titel: "x", datei: "datei:abc-2" }])).konflikte[0].grund, "NICHT_MEINE_PERSON");
  assert.equal((await speichern(E, "unterlagen", [{ id: "ul-d", person_id: kind, titel: "ohne", datei: "javascript:x" }])).konflikte[0].grund, "DATEI_FEHLT");
  assert.ok((await laden("p-leitung")).unterlagen.some((x) => x.id === "ul-t"));
  assert.ok(!(await laden("p-lk1")).unterlagen.some((x) => x.id === "ul-t"), "Lehrkraft nicht");
});

test("🪧 Schilder: alle Vorlagen erzeugen ein Schild, Text wird maskiert, Buffet-Preise als Tabelle", () => {
  for (const v of Object.keys(VORLAGEN)) assert.ok(schildHtml(v, () => "Test").length > 50, v);
  assert.ok(!schildHtml("tuer", () => "<b>x</b>").includes("<b>x</b>"));
  assert.match(schildHtml("buffet", (k) => (k === "preise" ? "Kuchen = 1,50 €" : "Buffet")), /<td>Kuchen<\/td><td>1,50 €<\/td>/);
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  for (const f of ["sitzung", "unterlagen", "schilder"]) assert.ok(lies("sw.js").includes(`"js/app/${f}.js"`), f);
  assert.ok(lies("supabase/migrations/20261116000000_bk_versammlungen.sql").includes("grant select, insert, update, delete on bk_unterlagen to service_role"));
});
