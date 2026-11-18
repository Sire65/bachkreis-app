// 🧹 0.78.0 Anordnung aller Seiten prüfen (alle Kachel-Ziele je Rolle): zu breit, zu kleine Knöpfe, volle Knopfreihen.
// Aufruf: node tools/anordnung-pruefen.mjs <Ordner> [Breite=390] – Lokaler Server auf :8080 nötig. Abgeschirmt (KC-TESTS-OHNE-ECHTSERVER).
import { chromium } from "playwright";
import fs from "node:fs";
const OHNE_ECHTSERVER = "--host-resolver-rules=MAP *.supabase.co 0.0.0.0, MAP *.supabase.com 0.0.0.0, MAP *.workers.dev 0.0.0.0, MAP speed.cloudflare.com 0.0.0.0, MAP api.github.com 0.0.0.0";
const O = process.argv[2], B = Number(process.argv[3] || 390);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-proxy-server", OHNE_ECHTSERVER] });
const ctx = await b.newContext({ viewport: { width: B, height: 844 }, deviceScaleFactor: 1 });
await ctx.route("**/*", (r) => (r.request().url().startsWith("http://localhost:8080/") ? r.continue() : r.abort()));
await ctx.addInitScript(() => { window.__frage = true; try { const e = JSON.parse(localStorage.getItem("bk_einstellungen") || "{}"); localStorage.setItem("bk_einstellungen", JSON.stringify({ ...e, einfuehrung: true })); } catch {} });
const p = await ctx.newPage(); const fehler = []; p.on("pageerror", (e) => fehler.push(e.message));
await p.goto("http://localhost:8080/index.html"); await p.waitForSelector(".kachel"); await p.waitForTimeout(800);
const rollen = await p.evaluate(async () => (await import("/js/kern/daten.js")).konfig().demo_personen);
const erg = []; const gesehen = new Set();
for (const [rolle, pid] of Object.entries(rollen)) {
  if (!pid) continue;
  await p.evaluate(async (pid) => (await import("/js/app/zustand.js")).alsPerson(pid), pid); await p.waitForTimeout(300);
  const ziele = await p.evaluate(async () => { const s = await import("/js/app/start.js"); const out = []; for (const [r] of s.REGISTER_ALLE) { try { for (const k of [...s.kachelnAlle(r), ...s.kachelnMehr(r)]) if (k.v) out.push({ id: k.id, v: k.v, p: k.p || {}, t: k.t }); } catch {} } return out; });
  for (const z of [{ id: "start", v: "start", p: {}, t: "Start" }, ...ziele]) {
    const key = rolle + "|" + z.v + JSON.stringify(z.p); if (gesehen.has(key)) continue; gesehen.add(key);
    try {
      await p.evaluate(async ([v, x]) => (await import("/js/app/zustand.js")).zeige(v, x), [z.v, z.p]); await p.waitForTimeout(450);
      await p.evaluate(() => document.querySelectorAll("#blattHg,#snHg,.frage-hg").forEach((e) => e.remove()));
      const m = await p.evaluate((B) => {
        const sicht = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
        const root = document.querySelector("main") || document.body; const out = { breit: [], klein: [], reihen: [], umbruch: [], text: [] };
        const docB = document.documentElement.scrollWidth; if (docB > B + 1) out.breit.push("Seite " + docB + "px");
        for (const e of root.querySelectorAll("*")) { if (!sicht(e)) continue; const r = e.getBoundingClientRect(); if (r.right > B + 2 && !e.closest(".lauf,.ticker,[data-quer],.quer-scroll,.tab-scroll,table,.ad-tab,svg,pre,code") && getComputedStyle(e).position !== "fixed") { out.breit.push((e.className || e.tagName) + "→" + Math.round(r.right)); if (out.breit.length > 4) break; } }
        for (const k of root.querySelectorAll("button,.knopf,a.knopf,label.knopf,select,input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])")) {
          if (!sicht(k) || k.closest(".kachel,.tabbar,#tabbar,nav.unten,.fuss,.chip-reihe,.nb-zeile,.kopf-leiste")) continue; const r = k.getBoundingClientRect();
          if (r.height < 34 || r.width < 34) out.klein.push(`${(k.textContent || k.getAttribute("aria-label") || k.tagName).trim().slice(0, 22)} ${Math.round(r.width)}×${Math.round(r.height)}`);
          const lh = parseFloat(getComputedStyle(k).lineHeight) || 20; if (k.tagName !== "SELECT" && r.height > lh * 2.6 + 20) out.umbruch.push(`${k.textContent.trim().slice(0, 30)} (${Math.round(r.height)}px)`);
        }
        for (const r of root.querySelectorAll(".knopfreihe,.knoepfe,.aktionen")) { if (!sicht(r)) continue; const n = [...r.children].filter(sicht).length; const zeilen = new Set([...r.children].filter(sicht).map((c) => Math.round(c.getBoundingClientRect().top))).size; if (n >= 5 || zeilen >= 3) out.reihen.push(`${n} Knöpfe/${zeilen} Zeilen: ${[...r.children].map((c) => c.textContent.trim().slice(0, 14)).join(" | ").slice(0, 120)}`); }
        const hoehe = document.documentElement.scrollHeight;
        const anzahlKnoepfe = [...root.querySelectorAll("button,.knopf")].filter(sicht).length;
        return { ...out, hoehe, anzahlKnoepfe };
      }, B);
      const nr = String(erg.length).padStart(3, "0");
      const schlecht = m.breit.length || m.reihen.length || m.umbruch.length || m.klein.length > 3 || m.anzahlKnoepfe > 40;
      if (schlecht) await p.screenshot({ path: `${O}/${nr}-${rolle}-${z.v}.png`, fullPage: true }).catch(() => {});
      erg.push({ nr, rolle, v: z.v, p: z.p, t: z.t, ...m });
    } catch (e) { erg.push({ rolle, v: z.v, fehler: String(e.message).slice(0, 100) }); }
  }
}
fs.writeFileSync(`${O}/ergebnis.json`, JSON.stringify(erg, null, 1));
console.log("Seiten:", erg.length, "Fehler:", fehler.slice(0, 5));
await b.close();
