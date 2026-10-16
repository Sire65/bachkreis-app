// Browser-Test Echtbetrieb: startet tests/e2e/server-lokal.mjs (bk-api-Logik + PostgreSQL/PGlite) und prüft
// Anmeldung, Datenschutz-Sicht der Eltern, Abgleich zwischen zwei Geräten, PC-Verwaltung und Zugangscodes.
// Aufruf: node tests/e2e/echtbetrieb.mjs   (benötigt „playwright“ und „@electric-sql/pglite“)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const PORT = 8791, B = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, [new URL("./server-lokal.mjs", import.meta.url).pathname, String(PORT)], { stdio: ["ignore", "pipe", "inherit"] });
const info = await new Promise((ok, f) => { srv.stdout.once("data", (d) => ok(JSON.parse(String(d).split("\n")[0]))); srv.once("exit", () => f(new Error("Server beendet"))); });
const fehler = [];
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const seite = async (breite = 400) => {
  const p = await (await b.newContext({ viewport: { width: breite, height: 860 }, serviceWorkers: "block" })).newPage();
  p.on("pageerror", (e) => fehler.push(e.message)); p.on("dialog", (d) => d.accept()); return p;
};
const sicht = (p) => p.evaluate(async () => {
  const m = await import("/js/kern/daten.js");
  return { mitAdresse: m.liste("personen", (x) => x.strasse).length, zugaenge: m.liste("zugaenge").length, spenden: m.liste("spenden").length, info: m.datenInfo() };
});
// 📌 Pinnwand: neue Zettel gehen beim Öffnen als Post-it-Fenster auf – „✓ Gelesen“ meldet es dem Server
async function pinnwandGelesen(pg) {
  await pg.waitForSelector("#pwFensterHg", { timeout: 6000 });
  await pg.click('[data-a="pwFensterGelesen"]'); await pg.waitForSelector("#pwFensterHg", { state: "detached" });
}
try {
  const p = await seite();
  await p.goto(B + "/index.html"); await p.waitForSelector("#anmeldeCode");
  assert.ok(!(await p.$("#demoleiste")), "keine Demo-Leiste im Echtbetrieb");
  await p.fill("#anmeldeCode", "FALSCH12"); await p.click('[data-a="anmeldenCode"]'); await p.waitForSelector(".badge.b-rot");
  await p.goto(B + "/index.html?k=" + info.codes.eltern.code); await p.waitForSelector(".kachel", { timeout: 20000 });
  assert.ok(!p.url().includes("k="), "Code aus der Adresszeile entfernt");
  await pinnwandGelesen(p);
  const s = await sicht(p);
  assert.equal(s.info.art, "supabase"); assert.equal(s.zugaenge, 0); assert.equal(s.spenden, 0);
  assert.ok(s.mitAdresse <= 6, "nur eigene Familie mit Anschrift: " + s.mitAdresse);
  await p.click('#raster .kachel[data-id="termine"]'); await p.waitForSelector('[data-a="antworten"]');
  await p.click('[data-a="antworten"][data-x$="|ja"]'); await p.waitForTimeout(2500);
  const l = await seite();
  await l.goto(B + "/index.html?k=" + info.codes.leitung.code); await l.waitForSelector(".kachel", { timeout: 20000 });
  await pinnwandGelesen(l);
  const gl = await l.evaluate(async (e) => (await import("/js/kern/daten.js")).liste("pinnwand_gelesen", (g) => g.zettel_id === "pw-2" && g.person_id === e).length, info.codes.eltern.id);
  assert.equal(gl, 1, "Verfasserin sieht, dass die Eltern den Zettel gelesen haben");
  const z = await l.evaluate(async () => (await import("/js/kern/daten.js")).liste("antworten", (a) => a.von_person_id && a.von_person_id !== a.person_id).length);
  assert.ok(z >= 1, "Leitung sieht die Zusage der Eltern");
  const v = await seite(1280);
  await v.goto(B + "/verwaltung.html"); await v.waitForSelector("#vwCode");
  await v.fill("#vwCode", info.codes.eltern.code); await v.click('[data-a="vwCodeServer"]'); await v.waitForSelector(".badge.b-rot");
  await v.fill("#vwCode", info.codes.leitung.code); await v.click('[data-a="vwCodeServer"]'); await v.waitForSelector(".vw-seite", { timeout: 20000 });
  await v.click('[data-a="vwAnsicht"][data-x="zugaenge"]');
  await v.click('.vw-tabelle tbody tr [data-a="zugNeu"]'); await v.waitForTimeout(500);
  await v.click('[data-a="zugKarten"]');
  const code = await v.$eval(".qr-karte code", (c) => c.textContent);
  await v.waitForTimeout(1500);
  // BK Communicator: Konsole, Test-Mail an mich → Auftrag „gesendet“ über den (Protokoll-)Anbieter
  await v.click('[data-a="vwAnsicht"][data-x="communicator"]'); await v.waitForSelector(".led");
  await v.click('[data-a="komTest"][data-x="mail"]');
  await v.waitForFunction(() => [...document.querySelectorAll(".vw-tabelle .badge")].some((b) => b.textContent === "gesendet"), null, { timeout: 15000 });
  const n = await seite();
  await n.goto(B + "/index.html?k=" + code); await n.waitForSelector(".kachel", { timeout: 20000 });
  await pinnwandGelesen(n);
  // 💬 Nachrichten über den Server: Lehrkraft schickt 🏎️ Express in den Einzelchat → Schülerin bekommt das Fenster, bestätigt
  // den Empfang → die Lehrkraft sieht blaue Haken und „✅ Empfang bestätigt“; der Communicator hat einen Auftrag „express“
  const sch = await seite(), lk = await seite();
  await sch.goto(B + "/index.html?k=" + info.codes.schueler.code); await sch.waitForSelector(".kachel", { timeout: 20000 }); await pinnwandGelesen(sch);
  await lk.goto(B + "/index.html?k=" + info.codes.lehrkraft.code); await lk.waitForSelector(".kachel", { timeout: 20000 }); await pinnwandGelesen(lk);
  await lk.evaluate(async () => (await import("/js/app/zustand.js")).zeige("unterhaltung", { id: "u-e2" })); await lk.waitForSelector("#chatText");
  await lk.click('[data-a="expressUm"]'); await lk.fill("#chatText", "Echtbetrieb: Probe heute im Musikraum!"); await lk.click('[data-a="chatSenden"]');
  await lk.waitForTimeout(2500);
  await sch.evaluate(async () => (await import("/js/kern/daten.js")).jetztAbgleichen());
  await sch.waitForSelector('[data-a="expressAntwort"][data-x="geoeffnet"]', { timeout: 10000 });
  await sch.click('[data-a="expressAntwort"][data-x="geoeffnet"]'); await sch.waitForSelector("#chatVerlauf"); await sch.waitForTimeout(2500);
  await sch.evaluate(async () => (await import("/js/kern/daten.js")).jetztAbgleichen()); await sch.waitForTimeout(1000);
  await lk.evaluate(async () => (await import("/js/kern/daten.js")).jetztAbgleichen()); await lk.waitForTimeout(800);
  await lk.waitForFunction(() => [...document.querySelectorAll("#chatVerlauf .blase.express")].pop()?.textContent.includes("Empfang bestätigt"), null, { timeout: 10000 });
  assert.ok(await lk.$("#chatVerlauf .blase.express:last-of-type .haken.blau") || await lk.evaluate(() => !![...document.querySelectorAll("#chatVerlauf .blase.express")].pop()?.querySelector(".haken.blau")), "blaue Haken beim Absender");
  // 📎 Noten-PDF über den Server: Lehrkraft hängt eine Datei an → Schülerin lädt sie (Rechte-Prüfung auf dem Server)
  await lk.click('[data-a="anhangMenue"]');
  await lk.setInputFiles('input[data-x="noten"]', { name: "Air-Cello.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
  await lk.waitForSelector(".anhang-chip.fertig", { timeout: 10000 }); await lk.fill("#chatText", "Hier die Noten"); await lk.click('[data-a="chatSenden"]'); await lk.waitForTimeout(2500);
  await sch.evaluate(async () => (await import("/js/kern/daten.js")).jetztAbgleichen()); await sch.waitForTimeout(800);
  const pdf = await sch.evaluate(async () => {
    const d = await import("/js/kern/daten.js"), f = await import("/js/kern/dateien.js");
    const n = d.liste("nachrichten", (x) => (x.anlagen || []).some((a) => a.name === "Air-Cello.pdf"))[0];
    await f.dateiUrl(n.anlagen[0].id); // lädt wie beim Antippen
    const r = await d.serverAktion("datei_holen", { id: n.anlagen[0].id }); return atob(r.daten);
  });
  assert.equal(pdf, "%PDF-1.4\n%%EOF", "Schülerin bekommt das PDF");
  assert.deepEqual(fehler.filter((x) => !/401/.test(x)), [], "keine Seitenfehler");
  console.log("Echtbetrieb-Test ✔");
} finally { await b.close(); srv.kill(); }
