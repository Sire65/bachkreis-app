// Browser-Rundgang (Visual-TÜV light): öffnet in allen Demo-Rollen jede Kachel und prüft, dass keine Fehler auftreten.
// Lokal: npm start (Port 8080) und dann  BASIS=http://localhost:8080 node tests/e2e/rundgang.mjs
// Benötigt das Paket „playwright“ (in CI per npx installiert). Screenshots landen in tests/e2e/bilder/ (nicht im Repo).
import { chromium } from "playwright";
import fs from "node:fs";

const BASIS = process.env.BASIS || "http://localhost:8080";
const BILDER = new URL("./bilder/", import.meta.url).pathname;
fs.mkdirSync(BILDER, { recursive: true });
const fehler = [];
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage();
p.on("pageerror", (e) => fehler.push("Seitenfehler: " + e.message));
p.on("console", (m) => { if (m.type() === "error") fehler.push("Konsole: " + m.text()); });
p.on("dialog", (d) => d.dismiss());
// Wetter: nachgebildete Open-Meteo-Antwort (Test ohne Internet und immer gleich)
await p.route("https://api.open-meteo.com/**", (r) => {
  const t0 = new Date(), iso = (i) => new Date(t0.getTime() + i * 86400000).toISOString().slice(0, 10), n = 16, a = (f) => Array.from({ length: n }, (_, i) => f(i));
  const stunden = Array.from({ length: 7 * 24 }, (_, i) => i);
  r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({
    current: { temperature_2m: 11, apparent_temperature: 9, weather_code: 61, wind_speed_10m: 12, wind_gusts_10m: 25, precipitation: 0.2, is_day: 1 },
    daily: { time: a(iso), weather_code: a((i) => [61, 3, 0, 95, 71, 45, 2][i % 7]), temperature_2m_max: a(() => 13), temperature_2m_min: a(() => 5), precipitation_probability_max: a((i) => i * 5), sunrise: a((i) => iso(i) + "T07:50"), sunset: a((i) => iso(i) + "T18:30"),
      precipitation_sum: a(() => 1), wind_speed_10m_max: a(() => 20), wind_gusts_10m_max: a(() => 30), uv_index_max: a(() => 2), sunshine_duration: a(() => 7200) },
    hourly: { time: stunden.map((i) => `${iso(Math.floor(i / 24))}T${String(i % 24).padStart(2, "0")}:00`), temperature_2m: stunden.map(() => 10), weather_code: stunden.map(() => 3), precipitation_probability: stunden.map(() => 20), is_day: stunden.map((i) => (i % 24 > 7 && i % 24 < 19 ? 1 : 0)) },
  }) });
});
await p.goto(BASIS + "/index.html");
await p.waitForSelector(".kachel");
// Kopf wie KC: alle Infofeld-Karten, Wetter-Tag, Jalousie halb/ganz, Jahreszeiten-Vorschauen
const karten = await p.$$eval("#infoPunkte .ipunkt", (l) => l.length);
for (let i = 0; i < karten; i++) { await p.click(`#infoPunkte .ipunkt[data-x="${i}"]`); await p.waitForTimeout(150); }
await p.click('[data-a="infoGehe"][data-x="1"]'); await p.waitForSelector(".wtag", { timeout: 8000 }); await p.click('.wtag[data-wtag="2"]');
for (const art of ["halb", "ganz", "ganz"]) { await p.click(`[data-a="kopfRollo"][data-x="${art}"]`); await p.waitForTimeout(2300); }
for (const x of ["herbst", "advent", "winter", "fruehling", "sommer", "kirmes", "wiesn", "karibik", "karneval", "halloween"]) {
  await p.evaluate(async (x) => (await import("/js/app/jahreszeiten.js")).jahreszeitVorschau(x), x); await p.waitForTimeout(700);
}
await p.evaluate(async () => (await import("/js/app/jahreszeiten.js")).jahreszeitVorschau("heute"));
await p.screenshot({ path: `${BILDER}kopf.png` });
// ⚙️ Mehr wie KC: alle Klappbereiche, Farbdesign, Thema mit Schrift, Tag/Nacht, Chat-Farben, Sende-Effekt, Sparmodus
await p.evaluate(() => document.getElementById("blattHg")?.remove());
await p.click('#fuss [data-x="einstellungen"]'); await p.waitForSelector("details.einst");
await p.$$eval("details.einst", (l) => l.forEach((d) => { d.open = true; }));
for (const [a, x] of [["designWahl", "nordsee"], ["designWahl", "disko"], ["themaWahl", "weihnachten"], ["themaWahl", "auto"], ["themaWahl", "aus"], ["modusWahl", "nacht"], ["modusWahl", "auto"], ["sendeEffektWahl", "taube"], ["sparWahl", "auto"], ["designStandard", ""]]) {
  await p.evaluate(([a, x]) => document.querySelector(`[data-a="${a}"]${x ? `[data-x="${x}"]` : ""}`).click(), [a, x]); await p.waitForTimeout(120);
}
await p.evaluate(() => document.querySelector('[data-a="cfOeffnen"]').click()); await p.waitForSelector(".cf-farben");
await p.evaluate(() => document.querySelector('[data-a="cfSetzen"][data-x="hintergrund:noten"]').click());
await p.evaluate(() => document.querySelector('[data-a="cfStandard"]').click());
await p.screenshot({ path: `${BILDER}einstellungen.png` });
await p.evaluate(() => document.getElementById("blattHg")?.remove());
await p.click('#fuss [data-x="start"]'); await p.waitForSelector("#bkHero");
for (const rolle of ["leitung", "lehrkraft", "vorstand", "schueler", "eltern"]) {
  await p.selectOption("#demoleiste select", rolle);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${BILDER}${rolle}-start.png`, fullPage: true });
  const regs = await p.$$eval("#register button", (bs) => bs.map((x) => x.dataset.x));
  for (const r of regs) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click(`#register button[data-x="${r}"]`);
    const ids = await p.$$eval("#raster .kachel", (ks) => ks.map((k) => k.dataset.id));
    for (const id of ids) {
      if (["demo", "verwaltung", "update"].includes(id)) continue;
      await p.evaluate((id) => document.querySelector(`#raster .kachel[data-id="${id}"]`).click(), id);
      await p.waitForTimeout(120);
      const t = await p.$eval("#inhalt", (e) => e.innerText);
      if (t.includes("Fehler beim Anzeigen")) fehler.push(`${rolle}/${id}: ${t.slice(0, 200)}`);
      await p.evaluate(() => document.querySelector('[data-a="zurueck"]')?.click());
      await p.waitForTimeout(80);
      await p.evaluate((r) => document.querySelector(`#register button[data-x="${r}"]`)?.click(), r);
    }
  }
}
// PC-Verwaltung: alle Tabellen und Sonderansichten
await p.setViewportSize({ width: 1280, height: 860 });
await p.goto(BASIS + "/verwaltung.html");
await p.click('[data-a="vwAls"][data-x="p-leitung"]');
for (const x of await p.$$eval('[data-a="vwTabelle"],[data-a="vwAnsicht"]', (l) => l.map((e) => [e.dataset.a, e.dataset.x]))) {
  await p.click(`[data-a="${x[0]}"][data-x="${x[1]}"]`);
  await p.waitForTimeout(60);
  if (x[1] === "uebersicht" || x[1] === "personen" || x[1] === "gruppenboard") await p.screenshot({ path: `${BILDER}verwaltung-${x[1]}.png` });
}
await b.close();
if (fehler.length) { console.error(fehler.join("\n")); process.exit(1); }
console.log("Rundgang ohne Fehler ✔");
