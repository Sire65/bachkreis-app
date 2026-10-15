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
await p.goto(BASIS + "/index.html");
await p.waitForSelector(".kachel");
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
