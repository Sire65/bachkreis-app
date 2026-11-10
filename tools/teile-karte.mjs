// 📦 0.55.0 Programmteile bei Bedarf laden: erzeugt js/app/teile-karte.js – welche Ansicht (VIEWS.x) und welche Aktion (AKTIONEN.y)
// in welchem nachladbaren Teil steckt. Aufruf: node tools/teile-karte.mjs (der Vertragstest prüft, dass die Karte aktuell ist).
import fs from "node:fs";
import path from "node:path";
const W = path.resolve(import.meta.dirname, "..");
// Nur Teile, die NICHTS beim Start tun und von keinem anderen Programmteil importiert werden (nur main.js)
export const NACHLADBAR = ["instrumente.js", "orchester.js", "notenarchiv.js", "fotoalbum.js", "leitung.js", "kommunikation.js", "standorte.js", "spiele.js", "schilder.js", "kalender.js", "unterlagen.js", "nutzung.js", "meins.js", "sprachsteuerung.js", "jahresbericht.js", "konzertkarten.js", "passkey.js", "einstellungen.js", "adminbereich.js"];
export function karteBauen() {
  const views = {}, aktionen = {};
  for (const d of NACHLADBAR) {
    const s = fs.readFileSync(path.join(W, "js/app", d), "utf8").replace(/^\s*\/\/.*$/gm, "");
    for (const m of s.matchAll(/^VIEWS\.(\w+)\s*=/gm)) views[m[1]] = d;
    for (const m of s.matchAll(/^AKTIONEN\.(\w+)\s*=/gm)) aktionen[m[1]] = d;
  }
  const sort = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  return `// ⚙️ Erzeugt von tools/teile-karte.mjs – nicht von Hand ändern. Welche Ansicht/Aktion steckt in welchem nachladbaren Programmteil.\nexport const TEILE_KARTE = ${JSON.stringify({ views: sort(views), aktionen: sort(aktionen) }, null, 1)};\n`;
}
if (process.argv[1] === import.meta.filename) { fs.writeFileSync(path.join(W, "js/app/teile-karte.js"), karteBauen()); console.log("js/app/teile-karte.js geschrieben"); }
