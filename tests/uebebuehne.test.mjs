// 🎭🎻 0.26.0 Übe-Bühne: Rhythmus-Auswertung, Griffe, Tonerkennung, Tonleitern/Ausschnitte, Server-Regeln für Ergebnisse und Aufnahmen.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { wartung } from "../supabase/functions/_shared/kom/kern.js";
import { musterLesen, musterText, musterPruefen, einsaetze, bewerten, RHYTHMUS_STUFEN } from "../js/kern/rhythmus.js";
import { griff, griffSvg } from "../js/kern/griffe.js";
import { tonhoehe, abweichung } from "../js/kern/stimmton.js";
import { tonleiterSt, stelleSt, taktZahl, notenName, TONARTEN } from "../js/kern/uebematerial.js";
import { stimmeErzeugen } from "../js/kern/notensatz.js";
import { STUECKE } from "../js/kern/musik.js";
import { UEBE_STUECKE, UEBE_TONARTEN } from "../js/kern/schema.js";
import { uebeZielErreicht } from "../js/kern/logik.js";
import { demoDatenbank } from "./demo-db.mjs";

test("🥁 Rhythmus: Muster lesen/schreiben, volle Takte, Auswertung genau/knapp/verpasst", () => {
  const m = musterLesen("1 .5 .5 -1 1.5 .5 2 1");
  assert.equal(musterText(m), "1 .5 .5 -1 1.5 .5 2 1");
  assert.ok(musterPruefen(m, 4).ok);
  assert.equal(musterPruefen(musterLesen("1 1 1"), 4).ok, false);
  assert.equal(musterLesen("1 0.3"), null, "nur erlaubte Notenwerte");
  for (const s of RHYTHMUS_STUFEN) assert.ok(musterPruefen(musterLesen(s.muster), s.takt).ok, s.titel);
  const soll = einsaetze(m); // Pause zählt nicht
  assert.deepEqual(soll, [0, 1, 1.5, 3, 4.5, 5, 7]);
  const schlag = 0.75, genau = bewerten(soll, soll.map((b) => b * schlag + 0.02), schlag);
  assert.equal(genau.sterne, 3); assert.equal(genau.quote, 1);
  const halb = bewerten(soll, soll.slice(0, 4).map((b) => b * schlag + 0.1), schlag);
  assert.ok(halb.sterne <= 1 && halb.treffer.filter((t) => t.ms == null).length === 3);
  assert.equal(bewerten(soll, [], schlag).sterne, 0);
});

test("✋ Griffe: Streicher 1. Lage, Ventile, Zug, Holz – mit Bild", () => {
  assert.equal(griff("v1", 69).text, "A-Saite, leer (0)");
  assert.equal(griff("v1", 71).text, "A-Saite, 1. Finger");
  assert.equal(griff("vc", 48).text, "G-Saite, 4. Finger");
  assert.equal(griff("tr", 62).ventile, "13"); // d'
  assert.equal(griff("tr", 64).ventile, "12"); // e'
  assert.equal(griff("tr", 67).ventile, "0"); // g'
  assert.equal(griff("hr", 65).ventile, "1"); // f' notiert
  assert.equal(griff("tb", 34).ventile, "0"); // B (Tuba)
  assert.equal(griff("pos", 55).position, 4); // g
  assert.equal(griff("pos", 46).position, 1); // B
  assert.equal(griff("pos", 40).position, 7); // E
  assert.equal(griff("fl", 67).links.join(), "true,true,true");
  assert.equal(griff("kl", 71).text.includes("Registerklappe"), true);
  for (const [k, t] of [["v1", 64], ["fl", 69], ["tr", 62], ["pos", 53]]) assert.ok(griffSvg(griff(k, t)).startsWith("<svg"), k);
  assert.equal(griff("ob", 69).art, "hinweis", "kein erfundenes Griffbild");
});

test("🎯 Stimmgerät erkennt Töne (Sinus mit Oberton) auf den Cent genau", () => {
  for (const [f, m] of [[98, 43], [196, 55], [440, 69], [466.16, 70], [880, 81]]) {
    const sr = 44100, b = new Float32Array(2048);
    for (let i = 0; i < b.length; i++) b[i] = 0.5 * Math.sin(2 * Math.PI * f * i / sr) + 0.2 * Math.sin(4 * Math.PI * f * i / sr);
    const a = abweichung(tonhoehe(b, sr));
    assert.equal(a.midi, m); assert.ok(Math.abs(a.cent) <= 3, `${f} Hz: ${a.cent} Cent`);
  }
  assert.equal(tonhoehe(new Float32Array(2048), 44100), null, "Stille → kein Ton");
});

test("🎵 Tonleitern, Ausschnitte, Notennamen; Schema-Listen passen zur Musik-Engine", () => {
  const g = tonleiterSt("v1", "G", 1);
  assert.equal(g.zeilen[0].noten.map((n) => notenName(n.ton, 1)).join(" "), "g a h c' d' e' fis' g' fis' e' d' c' h a g");
  assert.equal(g.zeilen[0].noten.reduce((s, n) => s + n.dauer, 0) % 4, 0);
  assert.equal(tonleiterSt("vc", "C", 2).zeilen[0].noten[0].ton, 36, "Cello C-Dur ab der leeren C-Saite");
  assert.equal(tonleiterSt("sw", "C", 1), null, "keine Tonleiter für Pauken");
  assert.equal(notenName(70, -2), "b'"); assert.equal(notenName(63, -3), "es'"); assert.equal(notenName(36, 0), "C");
  const st = stimmeErzeugen("menuett", "Violine 1"), teil = stelleSt(st, 3, 4);
  assert.equal(teil.zeilen[0].noten.reduce((s, n) => s + n.dauer, 0), 2 * st.takt);
  assert.ok(taktZahl(st) >= 16);
  assert.deepEqual(Object.keys(UEBE_STUECKE).sort(), STUECKE.map((s) => s.id).sort());
  assert.deepEqual(Object.keys(UEBE_TONARTEN).sort(), Object.keys(TONARTEN).sort());
  assert.equal(uebeZielErreicht({ art: "notenstelle", tempo_ziel: 100, ziel_sterne: 2 }, { sterne: 3, tempo: 90 }), false, "zu langsam");
  assert.equal(uebeZielErreicht({ art: "rhythmus", ziel_sterne: 3 }, { sterne: 3 }), true);
});

let db, d, codes, dp;
const rufe = (body, token) => verarbeiten(db, body, { token, ip: "6.6.6.6" }, {});
const login = async (pid) => (await rufe({ aktion: "anmelden", code: codes[pid] })).json.token;
const speichern = async (pid, tab, zeile) => (await rufe({ aktion: "speichern", tab, zeilen: [zeile] }, await login(pid))).json;
const laden = async (pid) => (await rufe({ aktion: "laden" }, await login(pid))).json.daten;
before(async () => { ({ db, d, codes } = await demoDatenbank({ jetzt: new Date() })); dp = { ...d.__konfig.demo_personen }; });

test("⭐ Ergebnisse: Kind schreibt nur eigene Zahlen, keine Rückmeldung; Eltern sehen die der Kinder; Lehrkraft schreibt Rückmeldung", async () => {
  const heute = new Date().toISOString().slice(0, 10);
  let r = await speichern(dp.schueler, "uebe_ergebnisse", { id: "ue-t1", person_id: dp.schueler, aufgabe_id: "ua-5", modus: "rhythmus", datum: heute, minuten: 5, sterne: 3, tempo: 80, rueckmeldung: "selbst gelobt" });
  assert.equal(r.gespeichert[0].rueckmeldung, null, "Rückmeldung schreibt nur die Lehrkraft");
  assert.equal(r.gespeichert[0].sterne, 3);
  assert.equal((await speichern(dp.schueler, "uebe_ergebnisse", { id: "ue-t2", person_id: dp.schueler, datum: heute, sterne: 7 })).konflikte[0].grund, "WERT_UNGUELTIG");
  const fremd = d.personen.find((p) => p.typ === "schueler" && p.id !== dp.schueler && codes[p.id]);
  assert.equal((await speichern(dp.schueler, "uebe_ergebnisse", { id: "ue-t3", person_id: fremd.id, datum: heute, sterne: 1 })).konflikte[0].grund, "NICHT_MEINE_PERSON");
  assert.equal((await speichern(dp.schueler, "uebe_ergebnisse", { id: "ue-t4", person_id: dp.schueler, aufgabe_id: "ua-8", datum: heute, sterne: 1 })).konflikte[0].grund, "AUFGABE_NICHT_SICHTBAR", "B-Orchester-Aufgabe");
  // Eltern sehen nur Ergebnisse der eigenen Kinder
  const E = await laden(dp.eltern), kinder = new Set(d.eltern_kind.filter((e) => e.eltern_id === dp.eltern).map((e) => e.kind_id));
  assert.ok(E.uebe_ergebnisse.length > 0 && E.uebe_ergebnisse.every((e) => kinder.has(e.person_id)));
  assert.ok(!(await laden(fremd.id)).uebe_ergebnisse.some((e) => e.person_id === dp.schueler), "andere Kinder sehen nichts");
  // Lehrkraft gibt Rückmeldung
  r = await speichern(dp.lehrkraft, "uebe_ergebnisse", { ...r.gespeichert[0], rueckmeldung: "Toll!", rueckmeldung_von: dp.lehrkraft });
  assert.equal(r.gespeichert[0].rueckmeldung, "Toll!");
  // … und das Kind kann sie nicht wieder entfernen
  r = await speichern(dp.schueler, "uebe_ergebnisse", { ...r.gespeichert[0], rueckmeldung: null, sterne: 2 });
  assert.equal(r.gespeichert[0].rueckmeldung, "Toll!");
});

test("🎙️ Übe-Aufnahme nur mit Einwilligung der Eltern, Löschdatum vom Server", async () => {
  const heute = new Date().toISOString().slice(0, 10);
  const r = await speichern(dp.schueler, "uebe_ergebnisse", { id: "ue-a1", person_id: dp.schueler, aufgabe_id: "ua-4", datum: heute, aufnahme: "datei:abcdef123", loeschen_am: "2099-01-01" });
  assert.ok(r.gespeichert?.length, JSON.stringify(r.konflikte));
  const tage = (new Date(r.gespeichert[0].loeschen_am) - new Date(heute)) / 86400000;
  assert.ok(tage >= 29 && tage <= 31, "nach 30 Tagen löschen – nicht, was das Gerät schickt");
  // ein minderjähriges Kind ohne erteilte Einwilligung
  const ohne = d.genehmigungen.find((g) => g.vorlage_id === "gv-8" && g.status === "ausstehend" && codes[g.kind_id]);
  assert.ok(ohne, "Demo hat Kinder ohne Einwilligung");
  const aufg = d.uebeaufgaben.find((a) => a.gruppe_id && d.gruppe_zuordnung.some((z) => z.person_id === ohne.kind_id && z.gruppe_id === a.gruppe_id) && !a.register_id);
  const k = await speichern(ohne.kind_id, "uebe_ergebnisse", { id: "ue-a2", person_id: ohne.kind_id, aufgabe_id: aufg?.id || null, datum: heute, aufnahme: "datei:abcdef456" });
  assert.equal(k.konflikte[0].grund, "KEINE_EINWILLIGUNG_AUFNAHME");
});

test("🧹 Wartung löscht abgelaufene Übe-Aufnahmen (Datei + Verweis), Zahlen und Rückmeldung bleiben", async () => {
  await db.q(`insert into bk_dateien (id, von, name, mime, groesse, art, inhalt) values ('aufn-alt-1', $1, 'v.webm', 'audio/webm', 3, 'sprache', '\\x010203')`, [dp.schueler]);
  await db.q(`insert into bk_uebe_ergebnisse (id, person_id, datum, sterne, aufnahme, loeschen_am, rueckmeldung) values ('ue-alt', $1, current_date - 40, 2, 'datei:aufn-alt-1', current_date - 1, 'Gut!')`, [dp.schueler]);
  await wartung(db, {}, {});
  const e = (await db.q(`select aufnahme, loeschen_am, sterne, rueckmeldung from bk_uebe_ergebnisse where id = 'ue-alt'`))[0];
  assert.equal(e.aufnahme, null); assert.equal(e.sterne, 2); assert.equal(e.rueckmeldung, "Gut!");
  const f = (await db.q(`select inhalt, geloescht_am from bk_dateien where id = 'aufn-alt-1'`))[0];
  assert.equal(f.inhalt, null); assert.ok(f.geloescht_am);
});
