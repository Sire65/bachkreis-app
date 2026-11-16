// 📰 0.70.0 Bachkreis-Echo: alle reichen ein (auch Kinder), Redaktion sortiert, Leitung gibt frei (Vier-Augen), Datenschutz vor dem Erscheinen,
// nur erschienene Hefte für Mitglieder, A5-Satz und Heftdruck (Ausschießen) – Server-Regeln über die echte API mit Demo-Datenbank
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { demoDatenbank } from "./demo-db.mjs";
import { echoPruefung, heftAusschiessen, heftSeitenZahl, einwilligung } from "../js/kern/logik.js";
import { pdfAusJpegs, FORMATE } from "../js/kern/pdf.js";
import { ROLLEN, TABELLEN } from "../js/kern/schema.js";

let db, d, codes;
const tok = {};
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "9.9.9.15" });
async function login(pid) { if (tok[pid]) return tok[pid]; const r = await rufe({ aktion: "anmelden", code: codes[pid] }); assert.equal(r.status, 200, "Anmeldung " + pid); return (tok[pid] = r.json.token); }
const sp = async (pid, tab, z) => (await rufe({ aktion: "speichern", tab, zeilen: [z] }, await login(pid))).json;
const lade = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const mini = () => ({ liste: (t, f = () => true) => (d[t] || []).filter((z) => !z.geloescht_am).filter(f), hole: (t, id) => (d[t] || []).find((x) => x.id === id) || null });
let kind, eltern;
before(async () => {
  ({ db, d, codes } = await demoDatenbank());
  kind = d.personen.find((p) => p.typ === "schueler" && p.status === "aktiv" && codes[p.id]).id;
  eltern = d.personen.find((p) => p.typ === "eltern" && codes[p.id]).id;
});

test("📰 Tabellen, Rolle Redaktion, Migration mit Rechten (KC-SUPABASE-GRANTS)", () => {
  assert.ok(TABELLEN.echo_hefte && TABELLEN.echo_beitraege); assert.ok(ROLLEN.redaktion);
  const m = lies("supabase/migrations/20261201000000_bk_echo.sql");
  for (const t of ["bk_echo_hefte", "bk_echo_beitraege"]) {
    assert.match(m, new RegExp(`alter table ${t} enable row level security`)); assert.match(m, new RegExp(`revoke all on ${t} from public, anon, authenticated`));
    assert.match(m, new RegExp(`grant select, insert, update, delete on ${t} to service_role`));
  }
});

test("✍️ Kinder reichen ein, ändern nur Eigenes, solange es nicht angenommen ist; nur eigene Fotos", async () => {
  const r = await sp(kind, "echo_beitraege", { id: "t-eb1", rubrik: "schueler", titel: "Mein Konzert", text: "Es war toll.", status: "angenommen", heft_id: null, von: "p-leitung" });
  const z = r.gespeichert?.[0]; assert.ok(z, JSON.stringify(r.konflikte));
  assert.equal(z.status, "eingereicht", "Kinder können nichts selbst annehmen"); assert.equal(z.von, kind, "von setzt der Server");
  assert.equal((await sp(eltern, "echo_beitraege", { ...z, titel: "geändert" })).konflikte?.[0]?.grund, "NUR_EIGENE");
  assert.equal((await sp(kind, "echo_beitraege", { id: "t-eb2", rubrik: "witz", titel: "x", text: "y", bild: "datei:fremd" })).konflikte?.[0]?.grund, "NUR_EIGENE_DATEI");
  assert.equal((await sp(kind, "echo_beitraege", { id: "t-eb3", rubrik: "witz", titel: "", text: "" })).konflikte?.[0]?.grund, "TEXT_FEHLT");
  // Redaktion nimmt an → das Kind kann nicht mehr ändern
  assert.ok((await sp("p-lk2", "echo_hefte", { id: "t-h0", nr: 5, ausgabe: "fruehling", jahr: 2027 })).gespeichert?.[0]);
  const a = (await sp("p-lk2", "echo_beitraege", { ...z, heft_id: "t-h0", status: "angenommen", reihenfolge: 9 })).gespeichert?.[0];
  assert.equal(a.status, "angenommen"); assert.equal(a.von, kind, "Autor/in bleibt");
  assert.equal((await sp(kind, "echo_beitraege", { ...a, text: "neu" })).konflikte?.[0]?.grund, "SCHON_BEARBEITET");
  assert.equal((await sp(eltern, "echo_hefte", { id: "t-h", nr: 9 })).konflikte?.[0]?.grund, "NUR_REDAKTION");
});

test("👀 Vier-Augen: wer zur Freigabe schickt, darf nicht freigeben; Redaktion ohne Leitung gibt nie frei", async () => {
  const h = (await sp("p-leitung", "echo_hefte", { id: "t-h1", nr: 7, ausgabe: "sommer", jahr: 2027, status: "freigabe" })).gespeichert?.[0];
  assert.equal(h.freigabe_von, "p-leitung");
  assert.equal((await sp("p-leitung", "echo_hefte", { ...h, status: "erschienen" })).konflikte?.[0]?.grund, "VIER_AUGEN");
  assert.equal((await sp("p-lk2", "echo_hefte", { ...h, status: "erschienen" })).konflikte?.[0]?.grund, "NUR_LEITUNG");
  const e = (await sp("p-leitung", "echo_hefte", { ...(await lade("p-leitung")).echo_hefte.find((x) => x.id === "eh-2"), status: "erschienen" }));
  assert.equal(e.gespeichert?.[0]?.status, "erschienen", JSON.stringify(e.konflikte)); assert.equal(e.gespeichert[0].freigegeben_von, "p-leitung");
  assert.ok((await db.q("select korrelation from bk_versand where korrelation = 'echo:eh-2'")).length > 0, "Nachricht „Das neue Echo ist da“");
  assert.equal((await sp("p-lk2", "echo_hefte", { ...e.gespeichert[0], titel: "später" })).konflikte?.[0]?.grund, "SCHON_ERSCHIENEN");
});

test("🔒 Mitglieder sehen nur erschienene Hefte und deren angenommene Beiträge (plus Eigenes)", async () => {
  const l = await lade(eltern);
  assert.ok(l.echo_hefte.every((h) => h.status === "erschienen")); assert.ok(l.echo_hefte.some((h) => h.id === "eh-1"));
  assert.ok(!l.echo_hefte.some((h) => h.id === "t-h1"), "Entwurf/Freigabe bleibt in der Redaktion");
  assert.ok(l.echo_beitraege.every((b) => b.von === eltern || (b.status === "angenommen" && l.echo_hefte.some((h) => h.id === b.heft_id))));
  assert.ok(!l.echo_beitraege.some((b) => b.id === "eb-10"), "Eingang anderer bleibt verborgen");
  const r = await lade("p-lk2"); assert.ok(r.echo_beitraege.some((b) => b.id === "eb-10"), "Redaktion sieht den Eingang");
});

test("🛡️ Datenschutz vor dem Erscheinen: Schutzsperre, verborgen, Foto/Porträt ohne Einwilligung, Name unter Foto", async () => {
  const m = mini(), schutz = d.kinderschutz.find((k) => k.schutz_aktiv)?.kind_id;
  const ohne = d.personen.find((p) => p.typ === "schueler" && einwilligung(m, p.id, "foto_intern") !== "ja" && !d.kinderschutz.find((k) => k.kind_id === p.id && (k.schutz_aktiv || k.sichtbar === "leitung")))?.id;
  const mit = d.personen.find((p) => p.typ === "schueler" && einwilligung(m, p.id, "foto_intern") === "ja" && !d.kinderschutz.find((k) => k.kind_id === p.id && (k.foto_name || k.schutz_aktiv || k.sichtbar === "leitung")))?.id;
  assert.ok(schutz && ohne && mit);
  const vn = (id) => d.personen.find((p) => p.id === id).vorname;
  const fake = { ...m, liste: (t, f) => (t === "echo_beitraege" ? [
    { id: "x1", heft_id: "H", status: "angenommen", titel: "A", personen: [schutz] },
    { id: "x2", heft_id: "H", status: "angenommen", titel: "B", bild: "datei:1", personen: [ohne] },
    { id: "x3", heft_id: "H", status: "angenommen", titel: "C", rubrik: "vorstellen", personen: [ohne] },
    { id: "x4", heft_id: "H", status: "angenommen", titel: "D", bild: "datei:2", bild_text: `${vn(mit)} beim Üben`, personen: [mit] },
    { id: "x5", heft_id: "H", status: "eingereicht", titel: "E", personen: [schutz] }].filter(f) : m.liste(t, f)) };
  const p = echoPruefung(fake, "H");
  assert.deepEqual(p.map((x) => [x.beitrag, x.art]), [["x1", "schutz"], ["x2", "foto"], ["x3", "portraet"], ["x4", "name"]]);
  // Server: Heft mit Problem kann nicht erscheinen
  const id = d.personen.find((x) => x.id === schutz).id;
  const h = (await sp("p-lk2", "echo_hefte", { id: "t-h2", nr: 8, status: "freigabe" })).gespeichert[0];
  assert.ok((await sp("p-lk2", "echo_beitraege", { id: "t-eb9", heft_id: "t-h2", rubrik: "orchesterleben", titel: "Mit Schutzkind", text: "…", personen: [id], status: "angenommen" })).gespeichert?.[0]);
  assert.equal((await sp("p-leitung", "echo_hefte", { ...h, status: "erschienen" })).konflikte?.[0]?.grund, "ECHO_DATENSCHUTZ");
});

test("🖨️ Heftdruck: Seiten auf ein Vielfaches von 4, richtig ausgeschossen; A5-PDF", () => {
  assert.deepEqual([1, 4, 5, 12, 13].map(heftSeitenZahl), [4, 4, 8, 12, 16]);
  assert.deepEqual(heftAusschiessen(8), [[8, 1], [2, 7], [6, 3], [4, 5]]);
  const a = heftAusschiessen(12); assert.equal(a.length, 6); assert.deepEqual(a.flat().sort((x, y) => x - y), Array.from({ length: 12 }, (_, i) => i + 1));
  for (const [l, r] of a) assert.equal(l + r, 13, "gegenüber liegende Seiten ergeben n+1");
  assert.deepEqual(FORMATE.a5, [419.53, 595.28]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), pdf = new TextDecoder().decode(pdfAusJpegs([{ daten: jpg, w: 10, h: 14 }], { format: "a5" }));
  assert.match(pdf, /MediaBox \[0 0 419\.53 595\.28\]/);
});

test("🧩 Rätsel und Termine im Heft: Buchstabensalat immer gleich, regelmäßige Proben zusammengefasst", async () => {
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
  const src = lies("js/app/echo.js");
  assert.match(src, /export function buchstabensalat/); assert.match(src, /Auflösung aus Heft/);
  assert.match(src, /echoPruefung\(db, id\)/, "App prüft vor dem Erscheinen"); assert.match(src, /freigabe_von === S\.ich\?\.id/, "Vier-Augen auch in der App");
  assert.match(lies("tools/teile-karte.mjs"), /"echo\.js"/); assert.match(lies("sw.js"), /js\/app\/echo\.js/); assert.match(lies("sw.js"), /css\/echo\.css/);
  assert.match(lies("supabase/functions/_shared/api.js"), /bk_echo_beitraege b where bild = \$1/, "Fotos nur, wenn der Beitrag sichtbar ist");
});
