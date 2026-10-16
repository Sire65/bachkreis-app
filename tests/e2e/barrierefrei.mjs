// ♿ Barrierefreiheit (WCAG 2.1 A/AA) mit axe-core – Werkzeug aus dem KC Infrastructure Control Center (@axe-core/playwright).
// Prüft jede Ansicht in jeder Demo-Rolle und alle Bereiche des PC-Programms (inkl. Formular-Fenster).
// Lokal: npm start, dann  npm i --no-save playwright-core @axe-core/playwright  und  BASIS=http://localhost:8080 node tests/e2e/barrierefrei.mjs
// Ergebnis: Liste der Verstöße; Exit-Code 1, wenn welche gefunden wurden. NURPC=1 prüft nur das PC-Programm.
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
const BASIS = process.env.BASIS || "http://localhost:8080";
const VIEWS = "start termine nachrichten pinnwand instrumente noten orchester einstellungen meinedaten kinder kalender ueben cockpit genehmigungen meingesicht instrumentenkunde buehne mitfahrboerse projekte foerderverein einkauf meininstrument meinenoten meinegenehmigungen hilfe ueber sicherheit sos anwesenheit fotoliste gesundheit meinregister".split(" ");
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, bypassCSP: true });
const p = await ctx.newPage(); p.on("dialog", (d) => d.dismiss());
await p.route("https://api.open-meteo.com/**", (r) => r.abort());
const funde = new Map();
const pruefe = async (wo) => {
  const r = await new AxeBuilder({ page: globalThis.PP || p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of r.violations) for (const n of v.nodes) {
    const k = v.id + " | " + n.target.join(" ");
    if (!funde.has(k)) funde.set(k, { id: v.id, impact: v.impact, wo, ziel: n.target.join(" "), html: n.html.slice(0, 140), info: n.failureSummary?.split("\n")[1]?.slice(0, 160) });
  }
};
await p.goto(BASIS + "/index.html"); await p.waitForSelector(".kachel");
await p.evaluate(() => document.querySelectorAll("#pwFensterHg,#blattHg").forEach((e) => e.remove()));
const rollen = await p.$$eval('#demoleiste select option', (o) => o.map((x) => x.value));
for (const r of (process.env.NURPC ? [] : rollen)) {
  await p.selectOption("#demoleiste select", r); await p.waitForTimeout(300);
  for (const v of VIEWS) {
    await p.evaluate(async (v) => { document.querySelectorAll("#pwFensterHg,#blattHg").forEach((e) => e.remove()); (await import("/js/app/zustand.js")).zeige(v, {}); }, v).catch(() => {});
    await p.waitForTimeout(120); await pruefe(r + ":" + v);
  }
}
await ctx.setDefaultTimeout(3000); const q = await ctx.newPage(); q.on("dialog", (d) => d.dismiss()); await p.close(); const p2 = q;
await q.setViewportSize({ width: 1400, height: 900 }); await q.goto(BASIS + "/verwaltung.html"); await q.waitForTimeout(800); await q.click('[data-a="vwAls"][data-x="p-leitung"]'); await q.waitForTimeout(500);
globalThis.PP = q; 
await pruefe("pc:start");
const knoepfe = await q.$$eval('[data-a="vwTabelle"],[data-a="vwAnsicht"]', (l) => l.map((x) => [x.dataset.a, x.dataset.x]));
console.error("PC-Knöpfe", knoepfe.length);
for (const [a, x] of knoepfe) { await q.click(`[data-a="${a}"][data-x="${x}"] >> nth=0`).catch(() => {}); await q.waitForTimeout(150); await pruefe("pc:" + x);
  if (a === "vwTabelle" && ["personen","termine","ausstattung","gesundheit"].includes(x)) { await q.click(".vw-haupt tbody tr").catch(() => {}); await q.waitForTimeout(200); await pruefe("pc-form:" + x); await q.keyboard.press("Escape"); } }
await b.close();
const L = [...funde.values()]; const c = {}; L.forEach((f) => (c[f.id + " (" + f.impact + ")"] = (c[f.id + " (" + f.impact + ")"] || 0) + 1));
console.log(c); for (const f of L) console.log(`${f.id} @${f.wo} ${f.ziel} :: ${f.html} :: ${f.info}`);
console.log(L.length ? `❌ ${L.length} Verstöße` : "✅ axe: keine Verstöße");
process.exit(L.length ? 1 : 0);
