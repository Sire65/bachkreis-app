// Effekte wie in der KC Club App (KC-CLUB-EFFEKTE-2, -BOTEN, -EMPFANGS-EFFEKT, -FEE, -REISSWOLF): beim Senden fliegt ein Papierflieger,
// eine Brieftaube, ein Postauto, Postbote mit Fahrrad, Flaschenpost, Rakete, Luftballon oder Baron Münchhausen los (❗ wichtig = Blaulicht);
// die kleine Fee schwebt ab und zu durchs Startbild; Gelöschtes läuft durch einen Reißwolf; neue Zettel werden angepinnt; Zahlen zählen hoch.
// Alles nur im Gerät, abschaltbar (⚙️ Mehr › ✨ Effekte), ruhig im Sparmodus. Kommentare mit Versionsnummern stammen aus der KC Club App.
import { S, einst as bkEinst, einstSetzen } from "./zustand.js";
import { esc, toast, blatt } from "../kern/ui.js";
import { themaWert, themaEigenSetzen, SPAR, sparWahl, sparSetzen } from "./darstellung.js";

const $ = (id) => document.getElementById(id);
const EINST_NAME = { animiert: "effekte" };
const einst = (k, std) => { const v = bkEinst()[EINST_NAME[k] || k]; return v === undefined ? std : v; };
const einstellung = (k, v) => einstSetzen(EINST_NAME[k] || k, v);
const einfach = () => !!bkEinst().einfach;
const melde = (t) => toast(t, 3000);
const frage = async (t) => window.confirm(t.replace(/\n/g, "\n"));
export const fxAn = () => einst("animiert", true) && !SPAR?.an && typeof document !== "undefined" && !!document.body?.animate;
const INIT = null, api = () => Promise.resolve();
// Effekte sind aus → Grund nennen und mit einem Tipp einschalten (KC-CLUB-EFFEKTE-GRUND)
async function fxAusHinweis(nochmal) {
  if (!einst("animiert", true)) {
    if (!window.confirm("✨ Effekte sind aus\n\n„Animierte Knöpfe“ ist ausgeschaltet – dann ruhen alle Effekte und die Jahreszeiten im Kopf.\n\nJetzt einschalten?")) return;
    einstellung("animiert", true);
  } else if (SPAR?.an) {
    if (!window.confirm(`🐢 Der Sparmodus ist an (${SPAR.grund}).\nIm Sparmodus ruhen alle Effekte.\n\nSparmodus ausschalten?`)) return;
    sparSetzen("aus");
  } else return melde("Dieser Browser kann die Effekte leider nicht zeigen – bitte Chrome, Safari oder Firefox aktualisieren.");
  if (fxAn() && typeof nochmal === "function") setTimeout(nochmal, 200);
}

// 1) ✉️ Nachricht gesendet: ein Papierflieger (oder eine Brieftaube) startet am Senden-Knopf und fliegt davon
// 2.175.0 (Wunsch Hansi „etwas in Schlangenlinien – oder eine weiße Brieftaube mit Kuvert im Schnabel“): Wahl je Gerät unter 🎨 Darstellung
// 2.176.0 (Wunsch Hansi „als drittes ein gelbes Postauto – und wenn als wichtig markiert ein Auto mit Blaulicht“)
// 2.362.0 KC-CLUB-BOTEN (Wunsch Hansi „als Versand auch einen Postboten auf dem Fahrrad, Brieftaube, Papierflieger … auch unter Voreinstellungen“):
// + 🚴 Postbote mit Fahrrad, 🍾 Flaschenpost, 🚀 Rakete, 🎈 Luftballon. 🏎️ Rennwagen = Express-Sendung (eigener Knopf, nicht wählbar als Standard).
const SENDE_EFFEKTE = [["flieger", "✈️ Papierflieger"], ["taube", "🕊️ Brieftaube"], ["postauto", "🚐 Postauto"], ["fahrrad", "🚴 Postbote mit Fahrrad"], ["flasche", "🍾 Flaschenpost"], ["rakete", "🚀 Rakete"], ["ballon", "🎈 Luftballon"], ["muenchhausen", "🎩 Baron Münchhausen"], ["wechsel", "🔀 Abwechselnd"], ["aus", "🚫 Aus"]];
const SENDE_REIHE = ["flieger", "taube", "postauto", "fahrrad", "flasche", "rakete", "ballon", "muenchhausen"]; // 2.363.0 + Münchhausen
const sendeEffektWahl = () => { const t = themaWert("effekt"); if (t) return t; try { const w = localStorage.getItem("bk_sendeEffekt"); return SENDE_EFFEKTE.some(([k]) => k === w) ? w : "wechsel"; } catch { return "wechsel"; } };
let SENDE_FX_N = 0;
const FLIEGER_SVG = (g) => `<svg viewBox="0 0 120 120" width="${g}" height="${g}" style="transform:scaleX(-1)">
    <g stroke="#fff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" fill="#fff"><path d="M10 72 108 14 70 108 56 78Z"/></g>
    <path d="M10 72 108 14 56 78Z" fill="#c0392b"/><path d="M108 14 70 108 56 78Z" fill="#8a6400"/><path d="M56 78 64 96 70 108Z" fill="#5a1520"/>
    <path d="M10 72 108 14 56 78Z" fill="none" stroke="#3b0d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M108 14 70 108 56 78" fill="none" stroke="#3b0d14" stroke-width="2.5" stroke-linejoin="round"/>
    <g stroke="#3b0d14" stroke-width="4" stroke-linecap="round"><path d="M20 102 34 88"/><path d="M8 92 20 80"/><path d="M34 112 44 102"/></g></svg>`;
// Taube schaut nach links (Flugrichtung), Flügel schlagen getrennt; Kuvert in Club-Farben (Beige/Weinrot) hängt am Schnabel
const TAUBE_SVG = (g) => `<svg viewBox="0 0 140 120" width="${Math.round(g * 1.17)}" height="${g}" overflow="visible">
    <g class="fl-hinten" fill="#e4e1dc" stroke="#9a948c" stroke-width="2" stroke-linejoin="round"><path d="M64 60C66 34 84 14 112 10 104 28 96 44 84 60Z"/></g>
    <path d="M94 60 130 46 126 62 134 76 94 72Z" fill="#fff" stroke="#9a948c" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="72" cy="64" rx="30" ry="16" fill="#fff" stroke="#9a948c" stroke-width="2"/>
    <circle cx="40" cy="52" r="12" fill="#fff" stroke="#9a948c" stroke-width="2"/><circle cx="36" cy="50" r="2.2" fill="#222"/>
    <path d="M29 51 17 55 29 57Z" fill="#e8a33d" stroke="#b97a1e" stroke-width="1" stroke-linejoin="round"/>
    <g class="tb-brief" transform="rotate(-8 17 64)"><rect x="4" y="57" width="26" height="17" rx="2" fill="#f3e6cf" stroke="#8a6400" stroke-width="2"/><path d="M4 57 17 67 30 57" fill="none" stroke="#8a6400" stroke-width="2"/><circle cx="17" cy="67" r="2.6" fill="#8a6400"/></g>
    <g class="fl-vorn" fill="#fff" stroke="#9a948c" stroke-width="2" stroke-linejoin="round"><path d="M58 60C58 30 76 6 106 2 100 22 92 42 80 62Z"/><path d="M72 40 88 22M76 48 94 32" fill="none" stroke-width="1.5"/></g></svg>`;
// 2.362.0 KC-CLUB-BOTEN: neue Boten (neutral, ohne Firmenzeichen; Club-Farben Weinrot/Beige). Fahrzeuge schauen nach links (Fahrtrichtung).
const BRIEF_SVG = (x, y, w = 24, h = 16) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#f3e6cf" stroke="#8a6400" stroke-width="2"/><path d="M${x} ${y} ${x + w / 2} ${y + h * 0.6} ${x + w} ${y}" fill="none" stroke="#8a6400" stroke-width="2"/>`;
const VELO_RAD = (x) => `<g class="fz-rad"><circle cx="${x}" cy="90" r="21" fill="none" stroke="#222" stroke-width="5"/><path d="M${x} 69v42M${x - 21} 90h42M${x - 15} 75l30 30M${x + 15} 75l-30 30" stroke="#999" stroke-width="1.4"/><circle cx="${x}" cy="90" r="3" fill="#555"/></g>`;
const FAHRRAD_SVG = (b) => `<svg viewBox="0 0 200 116" width="${b}" height="${Math.round(b * 0.58)}" overflow="visible">
    ${VELO_RAD(42)}${VELO_RAD(152)}
    <g fill="none" stroke="#8a6400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M42 90 60 46M60 46 120 52 152 90M85 90 120 52M85 90 60 46M85 90h-2"/></g>
    <path d="M60 46 50 40M60 46 70 43" stroke="#333" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="38" r="4" fill="#e8b923" stroke="#8a6d00" stroke-width="1.5"/>
    <path d="M110 48h20" stroke="#333" stroke-width="6" stroke-linecap="round"/>
    <g stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M118 46 100 68 88 88" stroke="#1f3f6b" stroke-width="8"/><path d="M118 46 96 18" stroke="#1f4e8c" stroke-width="13"/><path d="M102 26 64 44" stroke="#1f4e8c" stroke-width="6"/></g>
    <circle cx="92" cy="9" r="9" fill="#f2c9a0" stroke="#8a5a3a" stroke-width="1.5"/><path d="M82 6q10-13 20 0Z" fill="#1f4e8c"/><path d="M83 6h-9" stroke="#1f4e8c" stroke-width="3" stroke-linecap="round"/>
    <rect x="118" y="24" width="36" height="26" rx="4" fill="#f5c400" stroke="#3b2a00" stroke-width="2"/>${BRIEF_SVG(125, 29, 22, 14)}</svg>`;
const RENNWAGEN_SVG = (b) => `<svg viewBox="0 0 200 110" width="${b}" height="${Math.round(b * 0.55)}" overflow="visible">
    <g class="fz-tempo" stroke="#bbb" stroke-width="3" stroke-linecap="round"><path d="M200 58h26M206 70h34M200 82h22"/></g>
    <path d="M172 38h26v9h-8v22h-6V47h-12Z" fill="#3b0d14"/>
    <path d="M10 80 32 70l46-4 16-14h36l12 13 42 2 8 15-182 4Z" fill="#c0392b" stroke="#3b0d14" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="2" y="82" width="36" height="6" rx="2" fill="#3b0d14"/>
    <circle cx="112" cy="50" r="10" fill="#f5c400" stroke="#3b0d14" stroke-width="2"/><path d="M102 50h12" stroke="#222" stroke-width="4" stroke-linecap="round"/>
    <text x="128" y="80" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="sans-serif" font-style="italic">EXPRESS</text>
    ${RAD(40)}${RAD(160)}<g class="fz-rauch" fill="#d6d1c8"><circle cx="198" cy="86" r="4"/><circle cx="208" cy="82" r="6"/><circle cx="220" cy="78" r="8"/></g></svg>`;
const FLASCHE_SVG = (b) => `<svg viewBox="0 0 140 90" width="${b}" height="${Math.round(b * 0.64)}" overflow="visible">
    <g transform="translate(140 0) scale(-1 1) rotate(-10 70 45)"><path d="M18 34h72q12 0 18 7h14v12h-14q-6 7-18 7H18q-8 0-8-13t8-13Z" fill="#9fd6c2" fill-opacity=".8" stroke="#2e6b5a" stroke-width="2.5"/>
    <rect x="121" y="40" width="10" height="14" rx="2" fill="#a0723c" stroke="#5c3d17" stroke-width="1.5"/><rect x="26" y="40" width="54" height="14" rx="3" fill="#f3e6cf" stroke="#8a6400" stroke-width="1.5"/>
    <path d="M32 47h42" stroke="#8a6400" stroke-width="1.2" stroke-dasharray="4 3"/><path d="M22 38q20-6 60-2" stroke="#fff" stroke-width="2" opacity=".6" fill="none"/></g>
    <path d="M-6 78q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#3a8fd6" stroke-width="4" stroke-linecap="round"/></svg>`;
const RAKETE_SVG = (h) => `<svg viewBox="0 0 80 160" width="${Math.round(h * 0.5)}" height="${h}" overflow="visible">
    <g class="rk-flamme"><path d="M26 112q14 40 14 46 0-6 14-46Z" fill="#f5a623"/><path d="M32 112q8 24 8 30 0-6 8-30Z" fill="#ffe680"/></g>
    <path d="M18 90 4 118h14ZM62 90l14 28H62Z" fill="#c0392b" stroke="#3b0d14" stroke-width="2" stroke-linejoin="round"/>
    <path d="M40 4q22 22 22 70v40H18V74q0-48 22-70Z" fill="#f3f3f3" stroke="#3b0d14" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M40 4q12 12 17 30H23q5-18 17-30Z" fill="#c0392b" stroke="#3b0d14" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="40" cy="56" r="9" fill="#cfe9f7" stroke="#3b0d14" stroke-width="2.5"/>${BRIEF_SVG(28, 76, 24, 16)}</svg>`;
const BALLON_SVG = (h) => `<svg viewBox="0 0 90 170" width="${Math.round(h * 0.53)}" height="${h}" overflow="visible">
    <path d="M45 89q-9 20 0 38t0 22" fill="none" stroke="#555" stroke-width="1.6"/>
    <ellipse cx="45" cy="42" rx="34" ry="40" fill="#c0392b" stroke="#8a6400" stroke-width="2"/><ellipse cx="32" cy="27" rx="8" ry="13" fill="#fff" opacity=".35"/>
    <path d="M40 81h10l-5 8Z" fill="#8a6400"/><g transform="rotate(-8 45 158)">${BRIEF_SVG(31, 149, 28, 18)}</g></svg>`;
// 2.363.0 KC-CLUB-MUENCHHAUSEN (Wunsch Hansi „auch noch Baron Münchhausen als Bote“): der Lügenbaron reitet auf der Kanonenkugel (Ritt auf der
// Kanonenkugel), Dreispitz, roter Rock, weiße Perücke, Brief in der ausgestreckten Hand – fliegt nach links.
const MUENCHHAUSEN_SVG = (h) => `<svg viewBox="0 0 150 130" width="${Math.round(h * 1.15)}" height="${h}" overflow="visible">
    <g class="mh-rauch" fill="#cfcac2"><circle cx="102" cy="98" r="7"/><circle cx="118" cy="94" r="9"/><circle cx="136" cy="90" r="11"/></g>
    <path d="M84 72q22 6 30-2-8 14-30 12Z" fill="#8f1a1a" stroke="#5a0f0f" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="72" cy="96" r="24" fill="#2b2b2b" stroke="#000" stroke-width="2"/><circle cx="64" cy="87" r="6" fill="#6a6a6a"/>
    <path d="M70 84 52 104" stroke="#f3e6cf" stroke-width="8" stroke-linecap="round"/><path d="M52 104 44 112" stroke="#1a1a1a" stroke-width="10" stroke-linecap="round"/>
    <path d="M62 82q-2-28 12-36l14 4q4 22-4 34Z" fill="#b22222" stroke="#5a0f0f" stroke-width="2" stroke-linejoin="round"/>
    <path d="M68 50l6 30" stroke="#d4a017" stroke-width="2" stroke-dasharray="2 4"/>
    <path d="M72 54 50 42" stroke="#b22222" stroke-width="7" stroke-linecap="round"/><circle cx="48" cy="41" r="4.5" fill="#f2c9a0" stroke="#8a5a3a" stroke-width="1.2"/>
    <g transform="rotate(-14 38 32)">${BRIEF_SVG(26, 24, 22, 14)}</g>
    <circle cx="88" cy="34" r="6" fill="#f4f4f4" stroke="#bbb" stroke-width="1"/><circle cx="90" cy="42" r="5" fill="#f4f4f4" stroke="#bbb" stroke-width="1"/><path d="M92 44q8 4 6 12" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="35" r="10" fill="#f2c9a0" stroke="#8a5a3a" stroke-width="1.5"/><circle cx="75" cy="32" r="1.6" fill="#222"/>
    <path d="M70 39q4 3 7 0 3 3 7 0" fill="none" stroke="#5a3a1a" stroke-width="2" stroke-linecap="round"/>
    <path d="M64 27 79 15l16 12-8-2-8 4-8-4Z" fill="#1a1a1a" stroke="#d4a017" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
// Rakete/Ballon/Flaschenpost beim Absender: startet am Senden-Knopf – Rakete schießt hoch, Ballon schwebt pendelnd davon, Flasche schaukelt nach links
// 🎩 Münchhausen: „Bumm“ am Senden-Knopf, dann reitet er auf der Kugel im hohen Bogen nach links aus dem Bild
function sendeMuenchhausen(r) {
  const h = Math.round(Math.min(110, innerWidth * 0.27)), b = Math.round(h * 1.15);
  const links = Math.max(0, Math.min(r.right, innerWidth) - b), oben = r.top - h * 0.85;
  const knall = document.createElement("div"); knall.className = "papierflieger"; knall.setAttribute("aria-hidden", "true");
  knall.innerHTML = `<svg viewBox="0 0 80 60" width="80" height="60"><g fill="#e8e2d8" stroke="#b8b0a4" stroke-width="2"><circle cx="24" cy="34" r="14"/><circle cx="42" cy="26" r="17"/><circle cx="58" cy="36" r="13"/></g><text x="40" y="38" text-anchor="middle" font-size="15" font-weight="900" fill="#b22222" font-family="sans-serif">BUMM!</text></svg>`;
  knall.style.left = Math.max(0, r.left + r.width / 2 - 40) + "px"; knall.style.top = r.top - 30 + "px"; document.body.appendChild(knall);
  knall.animate([{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.25 }, { transform: "scale(1.4) translateY(-10px)", opacity: 0 }], { duration: 900, easing: "ease-out", fill: "forwards" }).onfinish = () => knall.remove();
  try { navigator.vibrate?.([70]); } catch {}
  const f = document.createElement("div"); f.className = "papierflieger"; f.setAttribute("aria-hidden", "true"); f.innerHTML = MUENCHHAUSEN_SVG(h);
  f.style.left = links + "px"; f.style.top = oben + "px"; document.body.appendChild(f);
  const N = 22, bild = [], weg = links + b + 30, steig = Math.min(oben + h * 0.5, innerHeight * 0.45);
  for (let i = 0; i <= N; i++) { const t = i / N; bild.push({ transform: `translate(${(-weg * t).toFixed(1)}px, ${(-steig * Math.sin(Math.PI * t * 0.85)).toFixed(1)}px) rotate(${(-12 + 22 * t).toFixed(1)}deg) scale(${i === 0 ? 0.4 : 1})`, opacity: i === 0 ? 0 : 1 }); }
  f.animate(bild, { duration: 2300, easing: "linear", fill: "forwards", delay: 120 }).onfinish = () => f.remove();
  f.querySelectorAll(".mh-rauch circle").forEach((c, i) => c.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: .85, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.7) translate(10px,4px)" }], { duration: 600, iterations: Infinity, delay: i * 150 }));
  setTimeout(() => { f.remove(); knall.remove(); }, 3000);
}
function sendeFlug(r, art) {
  if (art === "muenchhausen") return sendeMuenchhausen(r);
  const hoch = art !== "flasche", g = Math.round(Math.min(art === "rakete" ? 120 : 130, innerWidth * 0.3)), fb = Math.round(Math.min(150, innerWidth * 0.36));
  const b = art === "flasche" ? fb : Math.round(g * (art === "rakete" ? 0.5 : 0.53)), h = art === "flasche" ? Math.round(fb * 0.64) : g;
  const f = document.createElement("div"); f.className = "papierflieger"; f.setAttribute("aria-hidden", "true");
  f.innerHTML = art === "rakete" ? RAKETE_SVG(g) : art === "ballon" ? BALLON_SVG(g) : FLASCHE_SVG(fb);
  const links = hoch ? Math.max(0, Math.min(r.left + r.width / 2 - b / 2, innerWidth - b)) : Math.max(0, Math.min(r.right, innerWidth) - b - 6);
  f.style.left = links + "px"; f.style.top = (hoch ? r.top - h * 0.8 : r.top - h - 2) + "px"; document.body.appendChild(f);
  const N = 20, bild = [], weit = r.top + h + 40, dauer = art === "rakete" ? 1500 : art === "ballon" ? 3200 : 2800;
  for (let i = 0; i <= N; i++) {
    const t = i / N; let x = 0, y = 0, w = 0;
    if (art === "rakete") { x = Math.sin(t * Math.PI * 8) * 3 * (1 - t); y = -weit * t * t; }
    else if (art === "ballon") { x = Math.sin(t * Math.PI * 3) * 26; y = -weit * t; w = Math.sin(t * Math.PI * 3) * 9; }
    else { x = -(links + b + 20) * t; y = Math.sin(t * Math.PI * 6) * 7; w = Math.sin(t * Math.PI * 6 + 1) * 9; }
    bild.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${w.toFixed(1)}deg) scale(${i === 0 ? 0.5 : 1})`, opacity: i === 0 ? 0 : t > 0.92 ? (1 - t) * 12 : 1 });
  }
  f.animate(bild, { duration: dauer, easing: art === "rakete" ? "ease-in" : "linear", fill: "forwards" }).onfinish = () => f.remove();
  f.querySelectorAll(".rk-flamme").forEach((x) => { x.style.transformBox = "fill-box"; x.style.transformOrigin = "top"; x.animate([{ transform: "scaleY(.7)" }, { transform: "scaleY(1.25)" }], { duration: 90, iterations: Infinity, direction: "alternate" }); });
  setTimeout(() => f.remove(), dauer + 400);
}
function papierflieger(von, wichtig = typeof WICHTIG !== "undefined" && !!WICHTIG, mid = null, express = typeof EXPRESS !== "undefined" && !!EXPRESS) {
  if (!fxAn() || !von) return;
  const r = von.getBoundingClientRect(); if (!r.width) return;
  const wahl = sendeEffektWahl(); if (wahl === "aus") return;
  const art = fxArt(wahl, wichtig, mid, express); if (!art) return; // ❗ wichtig → immer Blaulicht; 🏎️ Express → Rennwagen; „Abwechselnd“ nach Nachrichten-Kennung (2.177.0)
  if (FZ_SVG[art]) return sendeFahrzeug(r, art);
  if (art === "rakete" || art === "ballon" || art === "flasche" || art === "muenchhausen") return sendeFlug(r, art);
  const g = Math.round(Math.min(130, innerWidth * 0.3));
  const f = document.createElement("div"); f.className = "papierflieger"; f.setAttribute("aria-hidden", "true");
  f.innerHTML = art === "taube" ? TAUBE_SVG(g) : FLIEGER_SVG(g);
  const b = art === "taube" ? Math.round(g * 1.17) : g;
  f.style.left = r.left + r.width / 2 - b / 2 + "px"; f.style.top = r.top + r.height / 2 - g / 2 + "px"; document.body.appendChild(f);
  // Schlangenlinie: Grundbogen nach oben links + seitliches Pendeln (2½ Wellen), Spitze zeigt immer in Flugrichtung
  const dx = -(r.left + b), dy = -(r.top + g * 0.6), len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const amp = Math.min(70, innerWidth * 0.12), N = 16, bild = [];
  const pos = (t) => { const welle = Math.sin(t * Math.PI * 5) * amp * Math.sin(t * Math.PI); return { x: dx * t + nx * welle, y: dy * (t * t * 0.4 + t * 0.6) + ny * welle }; };
  const nase = art === "taube" ? 180 : -149; // Richtung, in die die Figur ohne Drehung zeigt
  bild.push({ transform: "translate(0,0) rotate(0deg) scale(.3)", opacity: 0 }, { transform: "translate(14px,18px) rotate(8deg) scale(1.1)", opacity: 1, offset: 0.12 });
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = pos(t), q = pos(Math.min(1, t + 0.02)), p0 = pos(Math.max(0, t - 0.02));
    let w = Math.atan2(q.y - p0.y, q.x - p0.x) * 180 / Math.PI - nase; w = ((w + 540) % 360) - 180;
    if (art === "taube") w = Math.max(-35, Math.min(35, w)); // Taube neigt sich nur, kippt nicht über Kopf
    bild.push({ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${w.toFixed(1)}deg) scale(${(1 - t * 0.45).toFixed(2)})`, opacity: t > 0.9 ? (1 - t) * 10 : 1, offset: 0.2 + t * 0.8 });
  }
  const dauer = art === "taube" ? 2400 : 2000;
  f.animate(bild, { duration: dauer, easing: "ease-in-out", fill: "forwards" }).onfinish = () => f.remove();
  if (art === "taube") f.querySelectorAll(".fl-vorn, .fl-hinten").forEach((fl, i) => {
    fl.style.transformOrigin = "72px 60px";
    fl.animate([{ transform: "scaleY(1)" }, { transform: `scaleY(${i ? -0.45 : -0.6})` }], { duration: 190, iterations: Math.ceil(dauer / 190), direction: "alternate", easing: "ease-in-out", delay: i ? 30 : 0 });
  });
  setTimeout(() => f.remove(), dauer + 400);
}
// 🚐 Postauto / 🚨 Blaulicht-Wagen: fährt vom Senden-Knopf mit drehenden Rädern und leichtem Federn nach links aus dem Bild.
// Neutral gestaltet (kein Firmen- oder Behördenzeichen): gelbes Club-Postauto mit Kuvert, weißer Wagen mit weinroter Linie + Blaulicht
const RAD = (x) => `<g class="fz-rad"><circle cx="${x}" cy="92" r="13" fill="#222"/><circle cx="${x}" cy="92" r="6" fill="#bbb"/><path d="M${x - 6} 92h12M${x} 86v12" stroke="#555" stroke-width="2"/></g>`;
const POSTAUTO_SVG = (b) => `<svg viewBox="0 0 200 110" width="${b}" height="${Math.round(b * 0.55)}" overflow="visible">
    <g stroke="#3b2a00" stroke-width="2.5" stroke-linejoin="round"><path d="M70 20h112q8 0 8 8v62H70Z" fill="#f5c400"/><path d="M70 36H38q-6 0-10 6L14 62q-4 4-4 10v18h60Z" fill="#f5c400"/></g>
    <path d="M64 42H40q-4 0-6 4l-10 16h40Z" fill="#cfe9f7" stroke="#3b2a00" stroke-width="2"/>
    <rect x="98" y="34" width="56" height="36" rx="3" fill="#fff" stroke="#8a6400" stroke-width="2.5"/><path d="M98 34 126 56 154 34" fill="none" stroke="#8a6400" stroke-width="2.5"/><circle cx="126" cy="56" r="4" fill="#8a6400"/>
    <text x="126" y="84" text-anchor="middle" font-size="10" font-weight="700" fill="#3b2a00" font-family="sans-serif">KÖCHECLUB-POST</text>
    <rect x="8" y="76" width="8" height="6" rx="2" fill="#ffe680" stroke="#3b2a00" stroke-width="1.5"/>${RAD(42)}${RAD(158)}
    <g class="fz-rauch" fill="#d6d1c8"><circle cx="198" cy="94" r="5"/><circle cx="210" cy="88" r="7"/><circle cx="224" cy="82" r="9"/></g></svg>`;
const BLAULICHT_SVG = (b) => `<svg viewBox="0 0 200 110" width="${b}" height="${Math.round(b * 0.55)}" overflow="visible">
    <circle class="bl-schein bl-a" cx="78" cy="22" r="26" fill="#2f7bff" opacity=".35"/><circle class="bl-schein bl-b" cx="108" cy="22" r="26" fill="#2f7bff" opacity=".35"/>
    <path d="M10 72q0-12 12-14l30-4 22-20q6-6 14-6h52q10 0 16 8l18 20 14 4q10 2 10 12v18H10Z" fill="#fff" stroke="#333" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M82 36 64 54h40V36ZM110 36v18h44l-14-16q-2-2-6-2Z" fill="#cfe9f7" stroke="#333" stroke-width="2"/>
    <rect x="12" y="64" width="176" height="10" fill="#8a6400"/><text x="100" y="86" text-anchor="middle" font-size="11" font-weight="800" fill="#8a6400" font-family="sans-serif">❗ WICHTIG</text>
    <rect x="70" y="18" width="46" height="9" rx="3" fill="#333"/><rect class="bl-a" x="72" y="16" width="20" height="9" rx="3" fill="#2f7bff"/><rect class="bl-b" x="94" y="16" width="20" height="9" rx="3" fill="#2f7bff"/>
    <rect x="10" y="64" width="7" height="7" rx="2" fill="#ffe680" stroke="#333" stroke-width="1.5"/>${RAD(46)}${RAD(156)}</svg>`;
const FZ_SVG = { postauto: (b) => POSTAUTO_SVG(b), blaulicht: (b) => BLAULICHT_SVG(b), fahrrad: (b) => FAHRRAD_SVG(b), express: (b) => RENNWAGEN_SVG(b) }; // 2.362.0
function sendeFahrzeug(r, art) {
  const b = Math.round(Math.min(190, innerWidth * 0.42)), h = Math.round(b * (art === "fahrrad" ? 0.58 : 0.55));
  const f = document.createElement("div"); f.className = "papierflieger"; f.setAttribute("aria-hidden", "true");
  f.innerHTML = FZ_SVG[art](b);
  const links = Math.max(0, Math.min(r.right, innerWidth) - b - 6); // ganz im Bild starten, Heck am Senden-Knopf
  f.style.left = links + "px"; f.style.top = r.top - h - 4 + "px"; document.body.appendChild(f);
  const dx = -(links + b + 20), N = 18, bild = [{ transform: "translate(30px,0) scale(.4)", opacity: 0 }, { transform: "translate(0,0) rotate(3deg) scale(1)", opacity: 1, offset: 0.1 }];
  for (let i = 1; i <= N; i++) { const t = i / N, x = dx * (0.2 * t + 0.8 * t * t), y = -Math.abs(Math.sin(t * Math.PI * 7)) * 4; bild.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(i < 4 ? 3 - i : 0)}deg)`, opacity: 1, offset: 0.1 + t * 0.9 }); }
  const dauer = art === "express" ? 1200 : art === "blaulicht" ? 1900 : art === "fahrrad" ? 2900 : 2300;
  f.animate(bild, { duration: dauer, easing: "ease-in", fill: "forwards" }).onfinish = () => f.remove();
  if (art === "fahrrad") try { navigator.vibrate?.([30, 60, 30]); } catch {} // „kling-kling“
  f.querySelectorAll(".fz-tempo path").forEach((x, i) => x.animate([{ opacity: 0, transform: "translateX(0)" }, { opacity: 1 }, { opacity: 0, transform: "translateX(24px)" }], { duration: 300, iterations: Infinity, delay: i * 90 }));
  f.querySelectorAll(".fz-rad").forEach((rad) => { rad.style.transformBox = "fill-box"; rad.style.transformOrigin = "center"; rad.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }], { duration: 380, iterations: Infinity }); });
  f.querySelectorAll(".fz-rauch circle").forEach((c, i) => c.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: .8, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6) translate(8px,-6px)" }], { duration: 700, iterations: Infinity, delay: i * 180 }));
  if (art === "blaulicht") {
    f.querySelectorAll(".bl-a").forEach((x) => x.animate([{ opacity: 1 }, { opacity: 0.15 }], { duration: 160, iterations: Infinity, direction: "alternate" }));
    f.querySelectorAll(".bl-b").forEach((x) => x.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 160, iterations: Infinity, direction: "alternate" }));
    try { navigator.vibrate?.([60, 60, 60]); } catch {}
  }
  setTimeout(() => f.remove(), dauer + 400);
}
// ---------- KC-CLUB-EMPFANGS-EFFEKT (2.177.0, Wunsch Hansi „mit Taube schicken → bei ihm kommt die Taube an und lässt den Brief fallen“) ----------
// Der Absender bestimmt den Effekt (Wahl unter 🎨 Darstellung, beim Server als „sende_effekt“ gemerkt). „Abwechselnd“ hängt an der
// Nachrichten-Kennung → Absender und Empfänger sehen dasselbe. ❗ wichtig → Blaulicht. Der Empfänger sieht es nur bei offener
// Unterhaltung, frischer Nachricht, eigenen Effekten an (✨ Animierte Knöpfe, kein Sparmodus) und eigenem Sende-Effekt nicht „Aus“.
const fxReihe = (mid) => { let h = 0; for (const c of String(mid)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return SENDE_REIHE[h % SENDE_REIHE.length]; };
const fxArt = (wahl, wichtig, mid, express) => wahl === "aus" ? null : express ? "express" : wichtig ? "blaulicht" : wahl === "wechsel" ? (mid ? fxReihe(mid) : SENDE_REIHE[SENDE_FX_N++ % SENDE_REIHE.length]) : SENDE_REIHE.includes(wahl) ? wahl : null;
function sendeEffektMelden() {} // Bachkreis: Wahl gilt nur auf diesem Gerät
const EMPF = { chat: null, letzte: null };
function empfangsEffekt(u) {
  const letzte = [...(u?.nachrichten || [])].reverse().find((m) => !m.eigen);
  const erst = EMPF.chat !== u?.id; EMPF.chat = u?.id;
  if (!letzte) { EMPF.letzte = null; return; }
  const neu = !erst && letzte.id !== EMPF.letzte; EMPF.letzte = letzte.id;
  // 2.179.0 (Wunsch Hansi „auch spätere Nachrichten sollen die Animation bekommen“): beim Öffnen einer Unterhaltung bekommt die erste
  // ungelesene Nachricht anderer ihren Effekt – genau die, zu der die App springt („⬇ Neue Nachrichten“). Höchstens 7 Tage alt.
  const ziel = neu ? letzte : erst && u.gelesenBis ? u.nachrichten.find((m) => !m.eigen && m.zeit > u.gelesenBis) : null;
  if (!ziel || document.hidden || !fxAn() || sendeEffektWahl() === "aus" || Date.now() - Date.parse(ziel.zeit) > (neu ? 120000 : 7 * 86400000)) return;
  const art = fxArt(u.sendeEffekte?.[ziel.vonId], ziel.wichtig, ziel.id, !!ziel.express); if (!art) return;
  setTimeout(() => { const el = document.getElementById("msg-" + ziel.id); if (el) ankunftEffekt(el, art).catch(() => {}); }, neu ? 450 : 750);
}
const fxWarte = (a) => new Promise((ok) => { a.onfinish = a.oncancel = () => ok(); });
const fxEl = (html, x, y) => { const f = document.createElement("div"); f.className = "papierflieger"; f.setAttribute("aria-hidden", "true"); f.innerHTML = html; f.style.left = x + "px"; f.style.top = y + "px"; document.body.appendChild(f); return f; };
const fxHuepfen = (el) => el.animate([{ transform: "none" }, { transform: "translateY(-6px) scale(1.04)" }, { transform: "translateY(2px) scale(.99)" }, { transform: "none" }], { duration: 520, easing: "ease-out" });
// Lage jedes sichtbaren Zeichens der Nachricht (höchstens 160, Leerzeichen zählen nicht) – für den Buchstabenregen des Fliegers
function fxZeichen(wurzel) {
  const aus = [], w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT), rg = document.createRange();
  for (let n = w.nextNode(); n && aus.length < 160; n = w.nextNode()) {
    const t = n.textContent; let i = 0;
    for (const c of t) { const l = c.length; if (c.trim()) { rg.setStart(n, i); rg.setEnd(n, i + l); const b = rg.getClientRects()[0]; if (b && b.width) aus.push({ c, x: b.left, y: b.top, h: b.height }); } i += l; if (aus.length >= 160) break; }
  }
  return aus.length >= 160 ? [] : aus; // sehr lange Nachrichten: lieber ohne Regen als halb
}
async function ankunftEffekt(el, art) {
  const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
  const weg = [], zurueck = []; const fertig = () => { weg.forEach((x) => x.remove()); zurueck.forEach((f) => f()); }; setTimeout(fertig, 8000);
  try {
    if (art === "taube") {
      // fliegt von oben rechts in Wellen heran, schwebt über der Blase, lässt das Kuvert fallen und fliegt nach links davon
      const g = Math.round(Math.min(110, innerWidth * 0.26)), b = Math.round(g * 1.17);
      const zx = Math.max(4, Math.min(innerWidth - b - 4, r.left + r.width / 2 - b * 0.2)), zy = Math.max(4, r.top - g * 0.95);
      const f = fxEl(TAUBE_SVG(g), zx, zy); weg.push(f);
      const sx = innerWidth - zx + 20, sy = -zy - g, flap = [];
      f.querySelectorAll(".fl-vorn, .fl-hinten").forEach((fl, i) => { fl.style.transformOrigin = "72px 60px"; flap.push(fl.animate([{ transform: "scaleY(1)" }, { transform: `scaleY(${i ? -0.45 : -0.6})` }], { duration: 190, iterations: Infinity, direction: "alternate", easing: "ease-in-out", delay: i ? 30 : 0 })); });
      const hin = []; for (let i = 0; i <= 10; i++) { const t = i / 10, e = 1 - Math.pow(1 - t, 2); hin.push({ transform: `translate(${(sx * (1 - e)).toFixed(1)}px, ${(sy * (1 - e) + Math.sin(t * Math.PI * 3) * 18 * (1 - t)).toFixed(1)}px) rotate(${(-12 * (1 - t)).toFixed(1)}deg)` }); }
      await fxWarte(f.animate(hin, { duration: 1300, fill: "forwards" }));
      await fxWarte(f.animate([{ transform: "translate(0,0)" }, { transform: "translate(0,-6px)" }, { transform: "translate(0,0)" }], { duration: 380, fill: "forwards" }));
      const brief = f.querySelector(".tb-brief"); const br = brief?.getBoundingClientRect(); if (brief) brief.style.visibility = "hidden";
      if (br) {
        const k = fxEl(`<svg viewBox="0 0 30 22" width="${Math.round(br.width)}" height="${Math.round(br.height)}"><rect x="2" y="2" width="26" height="17" rx="2" fill="#f3e6cf" stroke="#8a6400" stroke-width="2"/><path d="M2 2 15 12 28 2" fill="none" stroke="#8a6400" stroke-width="2"/><circle cx="15" cy="12" r="2.6" fill="#8a6400"/></svg>`, br.left, br.top); weg.push(k);
        const fall = r.top + Math.min(24, r.height / 2) - br.top;
        f.animate([{ transform: "translate(0,0)" }, { transform: `translate(${-(zx + b + 30)}px, ${-(zy + g)}px) rotate(-14deg)` }], { duration: 1200, easing: "ease-in", fill: "forwards" });
        await fxWarte(k.animate([{ transform: "translate(0,0) rotate(-8deg)" }, { transform: `translate(6px, ${fall * 0.5}px) rotate(16deg) scale(1.4)`, offset: 0.45 }, { transform: `translate(-4px, ${fall}px) rotate(-6deg) scale(1.8)`, offset: 0.85 }, { transform: `translate(0, ${fall - 4}px) rotate(0deg) scale(1.9)` }], { duration: 900, easing: "ease-in", fill: "forwards" }));
        fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200);
        await fxWarte(k.animate([{ opacity: 1 }, { opacity: 0, transform: `translate(0, ${fall}px) scale(.5)` }], { duration: 450, fill: "forwards" }));
      }
      flap.forEach((a) => a.cancel());
    } else if (art === "flieger") {
      // 2.178.0 (Wunsch Hansi): kommt in Schlangenlinien angeflogen, bleibt über der Blase stehen und schüttelt ganz viele Buchstaben aus –
      // sie regnen herunter und setzen sich genau an ihren Platz: daraus wird die Nachricht. Danach fliegt er davon.
      const txt = el.querySelector(".txt") || el, zeichen = fxZeichen(txt);
      const g = Math.round(Math.min(100, innerWidth * 0.24));
      const zx = Math.max(4, Math.min(innerWidth - g - 4, r.left + r.width / 2 - g / 2)), zy = Math.max(4, r.top - g * 1.15);
      if (zeichen.length) { txt.style.visibility = "hidden"; zurueck.push(() => { txt.style.visibility = ""; }); }
      const f = fxEl(FLIEGER_SVG(g), zx, zy); weg.push(f);
      const sx = innerWidth - zx + g, sy = -zy - g, len = Math.hypot(sx, sy) || 1, nx = -sy / len, ny = sx / len, amp = Math.min(50, innerWidth * 0.1), bild = [];
      const pos = (t) => { const w = Math.sin(t * Math.PI * 4) * amp * Math.sin(t * Math.PI); return { x: sx * (1 - t) + nx * w, y: sy * (1 - t) + ny * w }; };
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, p = pos(t), q = pos(Math.min(1, t + 0.03)), p0 = pos(Math.max(0, t - 0.03));
        let w = Math.atan2(q.y - p0.y, q.x - p0.x) * 180 / Math.PI + 149; w = ((w + 540) % 360) - 180;
        bild.push({ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${(i === 14 ? 0 : w).toFixed(1)}deg) scale(${(0.7 + t * 0.3).toFixed(2)})`, opacity: 1 });
      }
      await fxWarte(f.animate(bild, { duration: 1400, easing: "ease-out", fill: "forwards" }));
      if (zeichen.length) {
        const wackeln = f.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-12deg) translateY(-4px)" }, { transform: "rotate(10deg)" }, { transform: "rotate(0deg)" }], { duration: 300, iterations: Infinity });
        const st = getComputedStyle(txt), ox = zx + g / 2, oy = zy + g * 0.6, schritt = Math.max(8, Math.min(28, 1100 / zeichen.length));
        const regen = zeichen.map((z, i) => {
          const s = document.createElement("span"); s.className = "fx-buchstabe"; s.textContent = z.c; s.setAttribute("aria-hidden", "true");
          s.style.cssText = `left:${z.x}px;top:${z.y}px;font:${st.font};color:${st.color};line-height:${z.h}px`; document.body.appendChild(s); weg.push(s);
          const vx = ox - z.x + (Math.random() - 0.5) * 60, vy = oy - z.y + (Math.random() - 0.5) * 20, dreh = (Math.random() - 0.5) * 540;
          return fxWarte(s.animate([{ transform: `translate(${vx}px, ${vy}px) rotate(${dreh}deg) scale(.4)`, opacity: 0 },
            { transform: `translate(${vx * 0.45}px, ${vy * 0.25 - 30}px) rotate(${dreh / 2}deg) scale(1.3)`, opacity: 1, offset: 0.35 },
            { transform: "translate(0, 3px) rotate(0deg) scale(1)", opacity: 1, offset: 0.85 }, { transform: "translate(0,0) scale(1)", opacity: 1 }],
            { duration: 750, delay: i * schritt, easing: "cubic-bezier(.3,.6,.4,1)", fill: "both" }));
        });
        await Promise.all(regen); wackeln.cancel();
        txt.style.visibility = ""; fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200);
        weg.filter((x) => x.classList?.contains("fx-buchstabe")).forEach((x) => x.remove());
        await fxWarte(f.animate([{ transform: "translate(0,0)" }, { transform: `translate(${-(zx + g + 20)}px, ${-(zy + g)}px) rotate(-30deg) scale(.7)` }], { duration: 800, easing: "ease-in", fill: "forwards" }));
      } else {
        fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200);
        await fxWarte(f.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.2) rotate(20deg)", opacity: 0 }], { duration: 420, easing: "ease-in", fill: "forwards" }));
      }
    } else if (art === "muenchhausen") {
      // 2.363.0: 🎩 kommt im Bogen von rechts oben angeflogen, „setzt auf“ über der Blase (Blase hüpft), lüftet kurz den Hut und fliegt links davon
      const h = Math.round(Math.min(100, innerWidth * 0.25)), b = Math.round(h * 1.15);
      const zx = Math.max(4, Math.min(innerWidth - b - 4, r.left + r.width / 2 - b / 2)), zy = Math.max(4, r.top - h * 0.9);
      const f = fxEl(MUENCHHAUSEN_SVG(h), zx, zy); weg.push(f);
      const rauch = [...f.querySelectorAll(".mh-rauch circle")].map((c, i) => c.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: .85, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.7) translate(10px,4px)" }], { duration: 600, iterations: Infinity, delay: i * 150 }));
      const dx = innerWidth - zx + 10, hoch = Math.min(zy + h, 220), hin = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; hin.push({ transform: `translate(${(dx * (1 - t)).toFixed(1)}px, ${(-hoch * Math.sin(Math.PI * (1 - t) * 0.6)).toFixed(1)}px) rotate(${(-10 * (1 - t)).toFixed(1)}deg)` }); }
      await fxWarte(f.animate(hin, { duration: 1300, easing: "ease-out", fill: "forwards" }));
      rauch.forEach((a) => a.pause()); fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200);
      await fxWarte(f.animate([{ transform: "translate(0,0)" }, { transform: "translate(0,-8px) rotate(-4deg)" }, { transform: "translate(0,0)" }], { duration: 600, fill: "forwards" }));
      rauch.forEach((a) => a.play());
      const zurueckB = []; for (let i = 0; i <= 12; i++) { const t = i / 12; zurueckB.push({ transform: `translate(${(-(zx + b + 30) * t).toFixed(1)}px, ${(-hoch * Math.sin(Math.PI * t * 0.6)).toFixed(1)}px) rotate(${(10 * t).toFixed(1)}deg)` }); }
      await fxWarte(f.animate(zurueckB, { duration: 1300, easing: "ease-in", fill: "forwards" }));
    } else if (art === "rakete" || art === "ballon" || art === "flasche") {
      // 2.362.0 KC-CLUB-BOTEN: Rakete landet über der Blase und startet wieder · Ballon schwebt herab und steigt wieder · Flasche schaukelt heran und weiter
      const hoch = art !== "flasche", g = Math.round(Math.min(110, innerWidth * 0.26)), fb = Math.round(Math.min(130, innerWidth * 0.32));
      const b = hoch ? Math.round(g * (art === "rakete" ? 0.5 : 0.53)) : fb, h = hoch ? g : Math.round(fb * 0.64);
      const zx = Math.max(4, Math.min(innerWidth - b - 4, hoch ? r.left + r.width / 2 - b / 2 : r.right - b * 0.4)), zy = Math.max(4, hoch ? r.top - h * 0.95 : r.bottom - h * 0.7);
      const f = fxEl(art === "rakete" ? RAKETE_SVG(g) : art === "ballon" ? BALLON_SVG(g) : FLASCHE_SVG(fb), zx, zy); weg.push(f);
      const fl = [...f.querySelectorAll(".rk-flamme")].map((x) => { x.style.transformBox = "fill-box"; x.style.transformOrigin = "top"; return x.animate([{ transform: "scaleY(.7)" }, { transform: "scaleY(1.25)" }], { duration: 90, iterations: Infinity, direction: "alternate" }); });
      const von = hoch ? `translate(${art === "ballon" ? 30 : 0}px, ${-(zy + h + 20)}px)` : `translate(${innerWidth - zx + 10}px, 0)`;
      const hinBild = [{ transform: von }, ...(art === "flasche" ? [{ transform: `translate(${(innerWidth - zx) * 0.5}px, -6px) rotate(8deg)` }, { transform: "translate(0,6px) rotate(-6deg)", offset: 0.8 }] : art === "ballon" ? [{ transform: "translate(-24px, -40px) rotate(-8deg)", offset: 0.6 }] : []), { transform: "translate(0,0) rotate(0deg)" }];
      await fxWarte(f.animate(hinBild, { duration: art === "rakete" ? 900 : art === "ballon" ? 1800 : 1600, easing: art === "rakete" ? "cubic-bezier(.2,.7,.3,1)" : "ease-out", fill: "forwards" }));
      fl.forEach((a) => a.pause()); fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200);
      await new Promise((ok) => setTimeout(ok, 600)); fl.forEach((a) => a.play());
      await fxWarte(f.animate([{ transform: "translate(0,0)" }, { transform: hoch ? `translate(${art === "ballon" ? -30 : 0}px, ${-(zy + h + 20)}px)` : `translate(${-(zx + b + 20)}px, 4px) rotate(-8deg)` }], { duration: art === "rakete" ? 900 : 1500, easing: "ease-in", fill: "forwards" }));
    } else {
      // 🚐/🚨/🚴/🏎️ fährt von rechts heran, bremst neben der Blase, liefert ab (Kuvert hüpft hinein / Blaulicht blinkt) und fährt links davon
      const b = Math.round(Math.min(170, innerWidth * 0.38)), h = Math.round(b * (art === "fahrrad" ? 0.58 : 0.55));
      const zx = Math.min(innerWidth - b - 6, Math.max(r.right - b * 0.35, 6)), zy = Math.min(innerHeight - h - 4, r.bottom - h * 0.75);
      const f = fxEl((FZ_SVG[art] || FZ_SVG.postauto)(b), zx, zy); weg.push(f);
      const raeder = [...f.querySelectorAll(".fz-rad")].map((rad) => { rad.style.transformBox = "fill-box"; rad.style.transformOrigin = "center"; return rad.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }], { duration: 380, iterations: Infinity }); });
      if (art === "blaulicht") {
        f.querySelectorAll(".bl-a").forEach((x) => x.animate([{ opacity: 1 }, { opacity: 0.15 }], { duration: 160, iterations: Infinity, direction: "alternate" }));
        f.querySelectorAll(".bl-b").forEach((x) => x.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 160, iterations: Infinity, direction: "alternate" }));
      }
      f.querySelectorAll(".fz-rauch circle").forEach((c, i) => c.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: .8, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6) translate(8px,-6px)" }], { duration: 700, iterations: Infinity, delay: i * 180 }));
      await fxWarte(f.animate([{ transform: `translate(${innerWidth - zx + 10}px,0)` }, { transform: "translate(-6px,0) rotate(-3deg)", offset: 0.85 }, { transform: "translate(0,0) rotate(0deg)" }], { duration: art === "express" ? 600 : art === "blaulicht" ? 900 : art === "fahrrad" ? 1600 : 1200, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }));
      raeder.forEach((a) => a.pause());
      if (art === "postauto" || art === "fahrrad") {
        const k = fxEl(`<svg viewBox="0 0 30 22" width="${Math.round(b * 0.22)}" height="${Math.round(b * 0.16)}"><rect x="2" y="2" width="26" height="17" rx="2" fill="#f3e6cf" stroke="#8a6400" stroke-width="2"/><path d="M2 2 15 12 28 2" fill="none" stroke="#8a6400" stroke-width="2"/><circle cx="15" cy="12" r="2.6" fill="#8a6400"/></svg>`, zx + b * 0.55, zy + h * 0.3); weg.push(k);
        const dx = r.left + r.width / 2 - (zx + b * 0.55), dy = r.top + Math.min(20, r.height / 2) - (zy + h * 0.3);
        await fxWarte(k.animate([{ transform: "translate(0,0) scale(.5)" }, { transform: `translate(${dx * 0.5}px, ${dy - 50}px) scale(1.2) rotate(-12deg)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(0deg)` }], { duration: 750, easing: "ease-in-out", fill: "forwards" }));
        fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1200); k.remove();
      } else {
        fxHuepfen(el); el.classList.add("aufblitzen"); setTimeout(() => el.classList.remove("aufblitzen"), 1600);
        try { navigator.vibrate?.([60, 60, 60]); } catch {}
        await new Promise((ok) => setTimeout(ok, 700));
      }
      raeder.forEach((a) => a.play());
      await fxWarte(f.animate([{ transform: "translate(0,0)" }, { transform: `translate(${-(zx + b + 20)}px,0)` }], { duration: 900, easing: "ease-in", fill: "forwards" }));
    }
  } finally { fertig(); }
}
function sendeEffektSetzen(w) { if (!themaEigenSetzen("effekt", w)) try { localStorage.setItem("bk_sendeEffekt", w); } catch {} sendeEffektZeigen(); sendeEffektMelden(); melde(SENDE_EFFEKTE.find(([k]) => k === w)?.[1] || w); }
function sendeEffektZeigen() { document.dispatchEvent(new CustomEvent("bk-effekt")); }
function sendeEffektVorschau(knopf) {
  if (!fxAn()) return fxAusHinweis(() => sendeEffektVorschau(knopf));
  if (sendeEffektWahl() === "aus") return melde("Sende-Effekt ist aus – oben einen auswählen.", true);
  papierflieger(knopf, false);
}
function blaulichtVorschau(knopf) { if (!fxAn()) return fxAusHinweis(() => blaulichtVorschau(knopf)); if (sendeEffektWahl() === "aus") return melde("Sende-Effekt ist aus – oben einen auswählen.", true); papierflieger(knopf, true); }
// KC-CLUB-FEE (2.372.0, Wunsch Hansi): bei jeder 20. Anmeldung (Server zählt je Mitglied über alle Geräte) schwebt eine kleine Fee
// durchs obere Startbild – bleibt kurz stehen, lächelt, fliegt weiter. Antippen = ein motivierender Spruch. „🧚 Fee ansehen“ zeigt sie jederzeit.
const FEE_SPRUECHE = [
  "Heute ist ein guter Tag, um etwas Leckeres zu zaubern. ✨",
  "Du bist ein wichtiger Teil vom Club – schön, dass es dich gibt!",
  "Gute Laune ist die beste Zutat. Du hast sie dabei.",
  "Jeder große Koch hat mal mit einem angebrannten Topf angefangen.",
  "Mut ist, einfach mal ein neues Rezept auszuprobieren.",
  "Was du heute mit Liebe machst, schmeckt morgen noch besser.",
  "Ein Lächeln am Herd wärmt mehr als jede Flamme.",
  "Kleine Schritte bringen dich auch ans Ziel – ganz in Ruhe.",
  "Du kannst mehr, als du denkst. Wirklich!",
  "Gemeinsam kochen heißt gemeinsam lachen. Darauf freuen wir uns.",
  "Heute darfst du stolz auf dich sein – einfach so.",
  "Die Prise Mut, die dir fehlt, streue ich dir hiermit drüber. ✨",
  "Fehler sind nur Gewürze, die man noch nicht kannte.",
  "Wer teilt, hat doppelt. Das gilt für Rezepte und für Freude.",
  "Ein guter Tag beginnt mit einem guten Gedanken – hier ist er: Du schaffst das!",
  "Nimm dir heute Zeit für etwas, das dir Freude macht.",
  "Die besten Momente entstehen oft ganz ungeplant.",
  "Du bringst Würze in unseren Club. Danke dafür!",
  "Heute wird gut. Ich habe es mit meinem Zauberstab nachgeprüft. 🪄",
  "Langsam gekocht wird’s am zartesten – auch bei Plänen.",
  "Glaub an dich wie an einen frisch gebackenen Kuchen: Er geht auf!",
  "Jede Begegnung im Club macht die Welt ein bisschen wärmer.",
  "Atme tief durch – das Leben ist ein Festmahl.",
  "Sei heute freundlich zu dir selbst. Du hast es verdient.",
  "Neugier ist das beste Rezept gegen Langeweile.",
  "Mit dir am Tisch wird jedes Essen zum Fest.",
  "Was einmal gelingt, gelingt wieder. Du hast es schon bewiesen.",
  "Heute ist ein schöner Tag, um jemandem eine Freude zu machen.",
  "Die Welt braucht mehr Menschen wie dich – mit Herz und Kochlöffel.",
  "Mach heute eine Sache, auf die du dich morgen freust.",
  "Auch ein kleiner Erfolg ist ein Grund, die Gläser zu heben. 🥂",
  "Kopf hoch – der Duft von etwas Gutem liegt schon in der Luft.",
  "Du musst nicht perfekt sein, um wunderbar zu sein.",
  "Freundschaft ist die beste Vorspeise fürs Leben.",
  "Jeder Tag ist eine neue Seite im Kochbuch deines Lebens.",
  "Heute ist dein Glückstag – ich habe Feenstaub dagelassen. ✨",
  "Was du gibst, kommt zurück – meistens mit Nachtisch.",
  "Bleib neugierig, bleib hungrig, bleib du.",
  "Ruhe bewahren und weiterrühren – das wird was!",
  "Danke, dass du immer wieder vorbeischaust. Das macht den Club lebendig. 💗",
];
const FEE_SVG = `<svg viewBox="0 0 170 170" aria-hidden="true"><defs>
<linearGradient id="feeFg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1e8" stop-opacity=".9"/><stop offset=".45" stop-color="#e3d0ff" stop-opacity=".65"/><stop offset="1" stop-color="#c9f3e6" stop-opacity=".55"/></linearGradient>
<linearGradient id="feeKl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a8c8"/><stop offset="1" stop-color="#e57ba8"/></linearGradient>
<linearGradient id="feeRo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3e5" stop-opacity=".95"/><stop offset="1" stop-color="#f7a9cb" stop-opacity=".8"/></linearGradient>
<linearGradient id="feeHa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe3a0"/><stop offset=".6" stop-color="#f0c766"/><stop offset="1" stop-color="#d9a640"/></linearGradient>
<linearGradient id="feeHt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1bfa6"/><stop offset=".6" stop-color="#fcdcc9"/><stop offset="1" stop-color="#f3c6ae"/></linearGradient><linearGradient id="feeHt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eebba2"/><stop offset="1" stop-color="#f6cdb8"/></linearGradient><radialGradient id="feeIr" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".6" stop-color="#3f86c8"/><stop offset="1" stop-color="#244f8a"/></radialGradient><clipPath id="feeA1"><path d="M85.4 33.8 C87 31.4 90.6 31.2 92.6 33.4 C91 35.4 87.4 35.6 85.4 33.8Z"/></clipPath><clipPath id="feeA2"><path d="M96.6 33.4 C98.2 31.6 100.8 31.8 102 33.6 C100.6 35 98.2 35.2 96.6 33.4Z"/></clipPath>
<radialGradient id="feeSt" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffc4dd" stop-opacity="0"/></radialGradient></defs>
<g transform="rotate(16 90 90)">

<g class="fee-fl l"><path d="M84 62 C70 40 44 14 26 10 C16 9 18 22 30 34 C44 48 66 58 84 62Z" fill="url(#feeFg)" stroke="#e9b7e0" stroke-width=".7"/>
<path d="M84 62 C62 50 42 28 28 14 M70 52 L48 40 M60 44 L44 24" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/>
<path d="M84 66 C68 66 46 74 38 86 C34 94 44 96 54 90 C66 82 78 72 84 66Z" fill="url(#feeFg)" stroke="#e9b7e0" stroke-width=".7"/>
<path d="M84 66 C68 72 52 82 42 90" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/></g>
<g class="fee-fl r"><path d="M88 60 C92 38 104 12 118 4 C128 0 128 12 120 26 C112 40 98 54 88 60Z" fill="url(#feeFg)" stroke="#e9b7e0" stroke-width=".7"/>
<path d="M88 60 C98 42 108 22 118 8 M96 46 L108 36" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/></g>

<path d="M82 30 C70 32 62 44 58 56 C54 66 46 72 40 76 C50 78 58 72 62 66 C60 76 54 84 48 88 C60 88 68 78 72 70 C74 78 72 86 68 92 C78 88 82 76 82 66 C84 56 88 46 92 40Z" fill="url(#feeHa)"/>
<path d="M66 50 C62 60 54 68 46 74 M74 56 C70 66 64 76 56 84 M80 58 C80 68 76 78 72 86" stroke="#fff3c9" stroke-width=".9" fill="none" opacity=".75" stroke-linecap="round"/>

<path d="M82 98 C78 104 74 110 69.5 117.6 C66 121 60 125 55 129.5 C52.5 131.4 50.6 132.6 49 133.4 L51 136.4 C56 134 62 130 66.6 125.6 C69.4 123.4 71 122.4 72 121 C77 114 83 108 90.6 103Z" fill="url(#feeHt2)"/>
<path d="M49.4 133 C46 135 42 137.6 38.2 139.8 C37.4 140.4 37.8 141.2 38.8 141 C42.8 140.4 46.8 139.2 50.6 137.6 C52 137 52.4 135.6 51.8 134.4 C51.2 133.2 50.2 132.8 49.4 133Z" fill="#e57fa8" stroke="#d26a95" stroke-width=".4"/>
<path d="M51.2 132 L54.4 135.4 M53.4 130.6 L56 133.8 M50.8 135.4 L55.6 131" stroke="#f9c9dc" stroke-width=".65" stroke-linecap="round"/>
<path d="M95 102 C92 110 87 118 81.4 125.4 C79.8 127.6 77 128 75.4 126.6 C70 123 63.4 118.4 57.8 114.6 L58.8 111.4 C62.8 111.4 69 113.6 74.4 116.4 C76.2 117.4 77.8 117.6 78.8 116.8 C81 112 84 106 86.8 100.6Z" fill="url(#feeHt)"/>
<path d="M59.2 111.2 C55.4 109.4 51 107.6 46.8 106.2 C45.8 105.9 45.4 106.7 46.2 107.4 C49.4 109.8 53.2 112.4 57.2 114.8 C58.6 115.6 59.8 114.8 60 113.4 C60.2 112.4 60 111.6 59.2 111.2Z" fill="#ec8db3" stroke="#d26a95" stroke-width=".4"/>
<path d="M60.8 111 L61.6 115.4 M62.8 111.4 L63.4 116 M60.4 114.6 L64.2 111.8" stroke="#f9c9dc" stroke-width=".65" stroke-linecap="round"/>
<path d="M80.4 124.6 C78.6 126 77 126.2 76 125.4" stroke="#fff" stroke-width=".55" fill="none" opacity=".55" stroke-linecap="round"/>

<path d="M82 60 C74 64 68 70 62 70 C58 70 55 67 52 66" stroke="#f8cdb6" stroke-width="3.6" fill="none" stroke-linecap="round"/>

<path d="M82 78 C78 86 70 94 64 102 C70 104 74 101 78 104 C82 101 86 106 90 103 C94 106 98 102 102 104 C106 101 110 103 114 100 C108 92 100 84 96 78Z" fill="url(#feeRo)" stroke="#f08db5" stroke-width=".6"/>
<path d="M83 78 C80 86 76 92 72 98 C76 99 80 97 83 99 C86 96 90 100 93 97 C96 99 100 96 104 97 C100 90 97 84 95 78Z" fill="url(#feeKl)"/>
<circle class="fee-gl" cx="76" cy="98" r=".6" fill="#fff"/><circle class="fee-gl" cx="96" cy="100" r=".6" fill="#fff"/><circle class="fee-gl" cx="108" cy="99" r=".6" fill="#fff"/><circle class="fee-gl" cx="86" cy="92" r=".6" fill="#fff"/><circle class="fee-gl" cx="68" cy="101" r=".6" fill="#fff"/>
<circle class="fee-gl" cx="82" cy="72" r=".5" fill="#fff"/><circle class="fee-gl" cx="89" cy="78" r=".5" fill="#fff"/><circle class="fee-gl" cx="94" cy="74" r=".5" fill="#fff"/><circle class="fee-gl" cx="79" cy="95" r=".5" fill="#fff"/><circle class="fee-gl" cx="90" cy="99" r=".5" fill="#fff"/><circle class="fee-gl" cx="101" cy="96" r=".5" fill="#fff"/><circle class="fee-gl" cx="104" cy="101" r=".5" fill="#fff"/><circle class="fee-gl" cx="73" cy="100" r=".5" fill="#fff"/><circle class="fee-gl" cx="84" cy="102" r=".5" fill="#fff"/><circle class="fee-gl" cx="98" cy="90" r=".5" fill="#fff"/>

<path d="M84 52 L92 52 L93 58 L83 58Z" fill="#f8cdb6"/>
<path d="M78 60 C82 56 94 56 99 60 L97 64 L80 64Z" fill="#fbd6c2"/>
<path d="M80 62 Q84 59 88 62 Q92 59 97 62 L95 80 Q89 83 83 80Z" fill="url(#feeKl)" stroke="#d96b98" stroke-width=".6"/>
<circle class="fee-gl" cx="85" cy="66" r=".6" fill="#fff"/><circle class="fee-gl" cx="91" cy="70" r=".6" fill="#fff"/><circle class="fee-gl" cx="87" cy="75" r=".6" fill="#fff"/><circle class="fee-gl" cx="93" cy="65" r=".6" fill="#fff"/>

<path d="M89 45 L95.4 46.4 L95.6 57 L87.6 57Z" fill="#f3c6ae"/>
<path d="M81 22 C78 30 79 40 82 48 C78 52 74 54 72 58 C80 58 86 54 88 48Z" fill="url(#feeHa)"/>
<path d="M82.6 27 C82.4 19.6 88 15 94.4 15.2 C101 15.4 104.6 20.6 104.4 27.4 C104.3 32.4 103.6 36.6 102 40.4 C100.4 44.4 97.6 48.4 94 49.6 C90.6 50.4 86.6 47.6 84.6 43.6 C83 40 82.7 33.4 82.6 27Z" fill="#fcdcc9"/>
<path d="M84.4 42 C86.4 46.8 90.2 50 94 49.6 C91 49.2 88 47 86.2 43.4Z" fill="#efc0a8" opacity=".7"/>
<path d="M85 29.6 Q88.6 27.4 92.4 28.8" stroke="#b98a52" stroke-width=".85" fill="none" stroke-linecap="round"/><path d="M96.6 28.8 Q99.6 27.6 102.2 29.4" stroke="#b98a52" stroke-width=".8" fill="none" stroke-linecap="round"/>
<path d="M85.6 31.6 Q89 29.8 92.4 31.6" stroke="#e8b49c" stroke-width=".45" fill="none"/>
<g class="fee-aug"><path d="M85.4 33.8 C87 31.4 90.6 31.2 92.6 33.4 C91 35.4 87.4 35.6 85.4 33.8Z" fill="#fff"/>
<g clip-path="url(#feeA1)"><circle cx="89.6" cy="33.5" r="1.9" fill="url(#feeIr)"/><circle cx="89.7" cy="33.5" r=".85" fill="#14213a"/><circle cx="90.3" cy="32.8" r=".5" fill="#fff"/></g>
<path d="M84.6 34.2 C86.4 31.2 90.8 30.8 92.8 33.4" stroke="#2a1d2e" stroke-width="1" fill="none" stroke-linecap="round"/>
<path d="M85.4 33.4 l-1.5 -.6 M86.4 32.4 l-1.2 -1.1 M87.6 31.7 l-.7 -1.3" stroke="#2a1d2e" stroke-width=".5" stroke-linecap="round"/>
<path d="M86.4 34.8 C88.2 35.6 90.8 35.4 92.2 34" stroke="#c99784" stroke-width=".35" fill="none"/></g>
<g class="fee-aug"><path d="M96.6 33.4 C98.2 31.6 100.8 31.8 102 33.6 C100.6 35 98.2 35.2 96.6 33.4Z" fill="#fff"/>
<g clip-path="url(#feeA2)"><circle cx="99.4" cy="33.4" r="1.7" fill="url(#feeIr)"/><circle cx="99.5" cy="33.4" r=".75" fill="#14213a"/><circle cx="100" cy="32.8" r=".45" fill="#fff"/></g>
<path d="M96.2 33.4 C98 31 101 31.2 102.4 33.4" stroke="#2a1d2e" stroke-width=".9" fill="none" stroke-linecap="round"/>
<path d="M102.2 33.2 l1.1 -.7 M101.4 32.2 l.9 -1" stroke="#2a1d2e" stroke-width=".45" stroke-linecap="round"/></g>
<path d="M98.2 37 C98.7 38.2 98.7 39.2 98 39.8" stroke="#d99a85" stroke-width=".5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M96.4 40.2 Q97 40.6 97.6 40.2" stroke="#d99a85" stroke-width=".4" fill="none" stroke-linecap="round" opacity=".7"/>
<ellipse class="fee-wange" cx="88" cy="39.2" rx="2.6" ry="1.4" fill="#ff9ec4" opacity=".35"/><ellipse class="fee-wange" cx="101.4" cy="38.6" rx="1.4" ry="1.1" fill="#ff9ec4" opacity=".3"/>
<g class="fee-mund"><path d="M91.6 43.2 C92.8 42.4 94 42.2 94.8 42.8 C95.6 42.2 96.8 42.4 97.8 43 C95.8 43.8 93.6 43.8 91.6 43.2Z" fill="#d4567e"/>
<path d="M91.8 43.3 C93.6 43.9 95.8 43.9 97.6 43.1 C96.6 45.6 93 45.8 91.8 43.3Z" fill="#e57c9f"/><path d="M93.6 44.5 Q94.8 44.9 96 44.4" stroke="#fff" stroke-width=".35" opacity=".6" fill="none"/>
<path d="M90.6 42.4 Q91.1 43.3 91.8 43.3 M98.6 41.9 Q98.1 43 97.5 43.1" stroke="#c4476f" stroke-width=".45" fill="none" stroke-linecap="round"/></g>
<g class="fee-mund-gross"><path d="M91 42.6 C93.4 41.8 96 41.6 98.4 42.2 C97.6 46.4 92.6 47 91 42.6Z" fill="#9e3358"/>
<path d="M91.6 42.8 C93.6 42.4 96 42.2 97.8 42.6 L97.4 43.6 C95.4 44 93.4 44 91.9 43.7Z" fill="#fff"/>
<path d="M91 42.6 C92.6 41.6 94 41.4 94.8 42 C95.8 41.4 97.2 41.4 98.4 42.2 C96 42.6 93.4 42.8 91 42.6Z" fill="#d4567e"/>
<path d="M91.6 44.2 C93.6 46.6 96.6 46.4 97.9 43.2 C97 47.4 92.4 47.2 91.6 44.2Z" fill="#e57c9f"/></g>
<path d="M80.6 30 C79.4 18 88 11.6 96.4 12.6 C103.6 13.4 107.6 19.6 106 28 C105.4 31.6 104.4 33.8 103.4 35 C104 29 102.6 23.4 98.4 21 C94.4 24.4 89 25.8 84.8 25.4 C83.6 28.4 83.4 32 83.8 36 C82 34.6 81 32.4 80.6 30Z" fill="url(#feeHa)"/>
<path d="M85 25.4 C90 24.6 95 22.4 98.4 19.4 C100.6 22 102 25 102.4 28.4" stroke="#fff3c9" stroke-width=".6" fill="none" opacity=".6"/>
<path d="M86 15.6 C92 13.2 100 14 104 19.6" stroke="#fff3c9" stroke-width="1" fill="none" opacity=".75" stroke-linecap="round"/>
<path d="M89 13.4 l2 -4 l2 3 l2 -5 l2 5 l2 -3 l1 4Z" fill="#ffd1e6" stroke="#ef9cc3" stroke-width=".5"/><circle cx="95" cy="8.4" r="1" fill="#fff"/>

<g class="fee-stab"><path d="M95 60 C102 56 108 50 114 44" stroke="#fbd6c2" stroke-width="3.6" fill="none" stroke-linecap="round"/>
<line x1="114" y1="45" x2="134" y2="20" stroke="#e9c46a" stroke-width="1.6" stroke-linecap="round"/><line x1="114" y1="45" x2="134" y2="20" stroke="#fff" stroke-width=".5" stroke-dasharray="2 3"/>
<path class="fee-gl" d="M124 24 L124.6 25.4 L126 26 L124.6 26.6 L124 28 L123.4 26.6 L122 26 L123.4 25.4Z" fill="#fff4c4"/><path class="fee-gl" d="M118 16 L118.6 17.4 L120 18 L118.6 18.6 L118 20 L117.4 18.6 L116 18 L117.4 17.4Z" fill="#fff4c4"/><path class="fee-gl" d="M110 20 L110.6 21.4 L112 22 L110.6 22.6 L110 24 L109.4 22.6 L108 22 L109.4 21.4Z" fill="#fff4c4"/><path class="fee-gl" d="M102 12 L102.6 13.4 L104 14 L102.6 14.6 L102 16 L101.4 14.6 L100 14 L101.4 13.4Z" fill="#fff4c4"/><path class="fee-gl" d="M94 4 L94.6 5.4 L96 6 L94.6 6.6 L94 8 L93.4 6.6 L92 6 L93.4 5.4Z" fill="#fff4c4"/><circle cx="136" cy="17" r="9" fill="url(#feeSt)" class="fee-schein"/>
<path class="fee-stern" d="M136 9 L138.2 14.8 L144.2 15 L139.5 18.8 L141.2 24.6 L136 21.2 L130.8 24.6 L132.5 18.8 L127.8 15 L133.8 14.8Z" fill="#ffd8ea" stroke="#f08db5" stroke-width=".7"/>
<circle class="fee-gl" cx="146" cy="10" r="1.2" fill="#fff"/><circle class="fee-gl" cx="150" cy="20" r=".9" fill="#ffe9a8"/><circle class="fee-gl" cx="128" cy="6" r="1" fill="#fff"/></g>
</g></svg>`; // 2.377.0: Flug-Beinhaltung wie klassische Feen (beide Beine nach hinten, eins gestreckt, eins gebeugt) // 2.374.0: erwachsene, schlanke Fee (Wunsch Hansi „zu kindlich“) – eigene Zeichnung; 2.375.0: Gesicht, Beine und Füße neu
const FEE_VORN_SVG = `<svg viewBox="0 0 170 170" aria-hidden="true"><defs>
<linearGradient id="fefFg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1e8" stop-opacity=".9"/><stop offset=".45" stop-color="#e3d0ff" stop-opacity=".65"/><stop offset="1" stop-color="#c9f3e6" stop-opacity=".55"/></linearGradient>
<linearGradient id="fefKl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a8c8"/><stop offset="1" stop-color="#e57ba8"/></linearGradient>
<linearGradient id="fefRo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3e5" stop-opacity=".95"/><stop offset="1" stop-color="#f7a9cb" stop-opacity=".8"/></linearGradient>
<linearGradient id="fefHa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe3a0"/><stop offset=".6" stop-color="#f0c766"/><stop offset="1" stop-color="#d9a640"/></linearGradient>
<linearGradient id="fefHt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1bfa6"/><stop offset=".5" stop-color="#fcdcc9"/><stop offset="1" stop-color="#f1bfa6"/></linearGradient>
<radialGradient id="fefIr" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".6" stop-color="#3f86c8"/><stop offset="1" stop-color="#244f8a"/></radialGradient>
<radialGradient id="fefSt" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffc4dd" stop-opacity="0"/></radialGradient>
<clipPath id="fefA1"><path d="M77.4 31.2 C78.6 29.4 81.6 29.2 83.2 31 C81.8 33.2 78.8 33.4 77.4 31.2Z"/></clipPath><clipPath id="fefA2"><path d="M 92.6 31.2 C 91.4 29.4 88.4 29.2 86.8 31 C 88.2 32.6 91.2 32.8 92.6 31.2 Z"/></clipPath></defs>
<g class="fee-fl l"><path d="M80 60 C66 40 44 20 30 20 C21 21 23 33 33 43 C46 54 64 60 80 60Z" fill="url(#fefFg)" stroke="#e9b7e0" stroke-width=".7"/><path d="M80 60 C62 48 44 32 32 24 M66 52 L46 42 M58 46 L42 30" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/><path d="M80 66 C66 68 50 78 44 90 C42 98 52 98 60 92 C70 84 76 74 80 66Z" fill="url(#fefFg)" stroke="#e9b7e0" stroke-width=".7"/><path d="M80 66 C66 74 54 84 46 92" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/></g><g class="fee-fl r"><path d="M 90 60 C 104 40 126 20 140 20 C 149 21 147 33 137 43 C 124 54 106 60 90 60 Z" fill="url(#fefFg)" stroke="#e9b7e0" stroke-width=".7"/><path d="M 90 60 C 108 48 126 32 138 24 M 104 52 L 124 42 M 112 46 L 128 30" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/><path d="M 90 66 C 104 68 120 78 126 90 C 128 98 118 98 110 92 C 100 84 94 74 90 66 Z" fill="url(#fefFg)" stroke="#e9b7e0" stroke-width=".7"/><path d="M 90 66 C 104 74 116 84 124 92" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/></g>
<path d="M72 26 C70 12 79 8 85 8 C91 8 100 12 98 26 C100 40 104 56 103 76 C99 72 96.6 66 95.6 60 L74.4 60 C73.4 66 71 72 67 76 C66 56 70 40 72 26Z" fill="url(#fefHa)"/>
<path d="M72.6 40 C71.4 52 70 62 68.6 72 M97.4 40 C98.6 52 100 62 101.4 72" stroke="#fff3c9" stroke-width=".8" fill="none" opacity=".6"/>
<path d="M86.4 103 C87 109 89.4 113.6 91.2 117.4 C91.4 120.6 89 124.6 85.4 128.8 L87.6 130.6 C91.6 126.6 95.4 122.4 96.2 118.2 C96.6 113 95.6 107.6 94.8 103Z" fill="url(#fefHt)"/>
<path d="M85.6 128.4 C84 131.6 82.4 135 81.4 138.6 C81.2 139.6 82 140 82.6 139.2 C84.6 136.4 86.6 133.6 88.2 130.6Z" fill="#ec8db3" stroke="#d26a95" stroke-width=".4"/>
<path d="M84.6 126.8 L88.6 128.6 M85 129.2 L88.8 126.2" stroke="#f9c9dc" stroke-width=".65" stroke-linecap="round"/>
<path d="M94.4 114.6 C95.2 116 95.4 117.8 95 119.4" stroke="#fff" stroke-width=".55" fill="none" opacity=".55" stroke-linecap="round"/>
<path d="M75.4 103 C75 110 75.4 116 76 121 C76.4 125 75.6 130 76.6 136 L79.6 136 C80.4 130 81.6 125 81.8 121 C82.2 115 83.2 109 83.4 103Z" fill="url(#fefHt)"/>
<path d="M76.4 135.4 C75.8 140 76.4 145 77.8 149 C78.4 150.2 79.4 150.2 79.6 149 C80.4 145 80.6 140 79.8 135.4Z" fill="#ec8db3" stroke="#d26a95" stroke-width=".4"/>
<path d="M75.8 132 L80.2 134.6 M76 134.8 L80.4 131.8 M76.2 129.4 L79.8 131.4" stroke="#f9c9dc" stroke-width=".65" stroke-linecap="round"/>
<path d="M76.5 78 C72 86 66 94 60 102 C64 104.5 68 102.5 71 105 C74 102.5 78 106 81 103.5 C84 106.5 87 103.5 89.5 106 C92.5 103 96 106 99 103.5 C102 105 106 103.5 110 102 C104 94 98 86 93.5 78Z" fill="url(#fefRo)" stroke="#f08db5" stroke-width=".6"/>
<path d="M77 78 C74.6 85 71.6 91 68.6 97 C72 98 75 96.4 78 98 C81 96 84 98.6 86.4 96.6 C89 98.6 92 96.4 95 97.6 C97.6 96.6 100 97.6 102 96.6 C99 91 96 85 93 78Z" fill="url(#fefKl)"/>
<circle class="fee-gl" cx="70" cy="99" r="0.6" fill="#fff"/><circle class="fee-gl" cx="78" cy="101" r="0.5" fill="#fff"/><circle class="fee-gl" cx="88" cy="100" r="0.6" fill="#fff"/><circle class="fee-gl" cx="98" cy="100" r="0.5" fill="#fff"/><circle class="fee-gl" cx="105" cy="101" r="0.5" fill="#fff"/><circle class="fee-gl" cx="64" cy="101" r="0.5" fill="#fff"/><circle class="fee-gl" cx="82" cy="92" r="0.5" fill="#fff"/><circle class="fee-gl" cx="91" cy="88" r="0.5" fill="#fff"/><circle class="fee-gl" cx="75" cy="94" r="0.5" fill="#fff"/><circle class="fee-gl" cx="97" cy="93" r="0.5" fill="#fff"/><circle class="fee-gl" cx="85" cy="96" r="0.4" fill="#fff"/>
<path d="M82 45 L88 45 L88.6 54 L81.4 54Z" fill="#f3c6ae"/>
<path d="M72 57 C76 53 80 52.6 85 53 C90 52.6 94 53 98 57 L96 61 L74 61Z" fill="#fcdcc9"/>
<path d="M74 58.6 Q79.5 55.4 85 58.8 Q90.5 55.4 96 58.6 L93.6 80 Q85 83 76.4 80Z" fill="url(#fefKl)" stroke="#d96b98" stroke-width=".6"/>
<circle class="fee-gl" cx="79" cy="63" r="0.55" fill="#fff"/><circle class="fee-gl" cx="85" cy="66" r="0.6" fill="#fff"/><circle class="fee-gl" cx="90" cy="62" r="0.5" fill="#fff"/><circle class="fee-gl" cx="81" cy="71" r="0.5" fill="#fff"/><circle class="fee-gl" cx="88" cy="73" r="0.55" fill="#fff"/><circle class="fee-gl" cx="84" cy="77" r="0.45" fill="#fff"/><circle class="fee-gl" cx="92" cy="69" r="0.45" fill="#fff"/>
<path d="M74.6 59 C69.6 64 66.4 70 65 76 C64.4 79 65.8 82 68.2 84" stroke="#fbd6c2" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="68.8" cy="84.6" rx="1.8" ry="1.4" fill="#fbd6c2"/>
<path d="M75 31 C75 20 79.6 15 85 15 C90.4 15 95 20 95 31 C95 37.6 93 43.4 89.4 46.6 C87.6 48.2 82.4 48.2 80.6 46.6 C77 43.4 75 37.6 75 31Z" fill="#fcdcc9"/>
<path d="M77.6 41 C79 44.6 81 46.8 83 47.4 C81 47.6 79.4 46.6 78.4 45 Z M92.4 41 C91 44.6 89 46.8 87 47.4 C89 47.6 90.6 46.6 91.6 45Z" fill="#efc0a8" opacity=".6"/>
<path d="M77 27.4 Q80 25.8 83.2 27" stroke="#b98a52" stroke-width=".85" fill="none" stroke-linecap="round"/><path d="M 93 27.4 Q 90 25.8 86.8 27" stroke="#b98a52" stroke-width=".85" fill="none" stroke-linecap="round"/>
<g class="fee-aug"><path d="M77.4 31.2 C78.6 29.4 81.6 29.2 83.2 31 C81.8 33.2 78.8 33.4 77.4 31.2Z" fill="#fff"/><g clip-path="url(#fefA1)"><circle cx="80.3" cy="30.9" r="2" fill="url(#fefIr)"/><circle cx="80.3" cy="30.9" r=".8" fill="#14213a"/><circle cx="80.85" cy="30.3" r=".48" fill="#fff"/></g><path d="M76.8 31.4 C78.4 28.8 81.8 28.6 83.4 30.8" stroke="#2a1d2e" stroke-width=".95" fill="none" stroke-linecap="round"/><path d="M77.4 30.6 l-1.5 -.7 M78.2 29.6 l-1.1 -1.2 M79.4 29 l-.6 -1.4" stroke="#2a1d2e" stroke-width=".48" stroke-linecap="round"/></g><path d="M77.8 29.2 Q80.4 27.6 83 29" stroke="#e8b49c" stroke-width=".4" fill="none"/><g class="fee-aug"><path d="M 92.6 31.2 C 91.4 29.4 88.4 29.2 86.8 31 C 88.2 32.6 91.2 32.8 92.6 31.2 Z" fill="#fff"/><g clip-path="url(#fefA2)"><circle cx="89.7" cy="30.9" r="2" fill="url(#fefIr)"/><circle cx="89.7" cy="30.9" r=".8" fill="#14213a"/><circle cx="90.25" cy="30.3" r=".48" fill="#fff"/></g><path d="M 93.2 31.4 C 91.6 28.8 88.2 28.6 86.6 30.8" stroke="#2a1d2e" stroke-width=".95" fill="none" stroke-linecap="round"/><path d="M92.6 30.6 l1.5 -.7 M91.8 29.6 l1.1 -1.2 M90.6 29 l.6 -1.4" stroke="#2a1d2e" stroke-width=".48" stroke-linecap="round"/></g><path d="M 92.2 29.2 Q 89.6 27.6 87 29" stroke="#e8b49c" stroke-width=".4" fill="none"/>
<path d="M85.7 33.6 C86.2 35.4 86.3 36.8 85.6 37.6" stroke="#d99a85" stroke-width=".5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M83.9 38.2 Q85 38.8 86.1 38.2" stroke="#d99a85" stroke-width=".42" fill="none" stroke-linecap="round" opacity=".75"/>
<ellipse class="fee-wange" cx="78.6" cy="37" rx="2.4" ry="1.3" fill="#ff9ec4" opacity=".35"/><ellipse class="fee-wange" cx="91.4" cy="37" rx="2.4" ry="1.3" fill="#ff9ec4" opacity=".35"/>
<g class="fee-mund"><path d="M82 41.4 C83.2 40.6 84.4 40.5 85 41 C85.6 40.5 86.8 40.6 88 41.4 C86 42 84 42 82 41.4Z" fill="#d4567e"/><path d="M82.2 41.5 C84 42.1 86 42.1 87.8 41.5 C86.8 43.8 83.2 43.8 82.2 41.5Z" fill="#e57c9f"/><path d="M84 42.7 Q85 43.1 86 42.7" stroke="#fff" stroke-width=".35" opacity=".6" fill="none"/><path d="M81.2 40.7 Q81.6 41.5 82.2 41.5 M88.8 40.7 Q88.4 41.5 87.8 41.5" stroke="#c4476f" stroke-width=".45" fill="none" stroke-linecap="round"/></g>
<g class="fee-mund-gross"><path d="M81.2 40.8 C83.6 40.2 86.4 40.2 88.8 40.8 C88 45.4 82 45.4 81.2 40.8Z" fill="#9e3358"/><path d="M81.8 41 C83.8 40.7 86.2 40.7 88.2 41 L87.8 42 C86 42.4 84 42.4 82.2 42Z" fill="#fff"/><path d="M81.2 40.8 C82.8 39.8 84.2 39.7 85 40.3 C85.8 39.7 87.2 39.8 88.8 40.8 C86.2 41 83.8 41 81.2 40.8Z" fill="#d4567e"/><path d="M81.8 42.4 C83.6 45 86.4 45 88.2 42.4 C87.6 46 82.4 46 81.8 42.4Z" fill="#e57c9f"/></g>
<path d="M85 12.6 C78.6 12.6 73.6 17.4 74.4 27 C74.8 31.4 75.6 35 76 38.4 C77 32 78 25.6 82.6 21.6 C85.6 19.2 89.6 19.4 92.4 22.4 C93.6 25.4 94.2 30 94.4 34 C95.2 31 95.8 28 95.6 25.4 C95.4 17.4 91.2 12.6 85 12.6Z" fill="url(#fefHa)"/>
<path d="M78 17.6 C81 15 86 14.4 90 16" stroke="#fff3c9" stroke-width=".9" fill="none" opacity=".75" stroke-linecap="round"/>
<path d="M79 13 l2 -4 l2 3 l2 -5 l2 5 l2 -3 l2 4Z" fill="#ffd1e6" stroke="#ef9cc3" stroke-width=".5"/><circle cx="85" cy="7.6" r="1" fill="#fff"/>
<g class="fee-stab-f"><path d="M95.4 59 C100 55 104.4 50 108.2 44" stroke="#fbd6c2" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="108.8" cy="43" rx="1.6" ry="1.9" fill="#fbd6c2"/>
<line x1="108.6" y1="44" x2="121" y2="20" stroke="#e9c46a" stroke-width="1.6" stroke-linecap="round"/><line x1="108.6" y1="44" x2="121" y2="20" stroke="#fff" stroke-width=".5" stroke-dasharray="2 3"/>
<circle cx="122.4" cy="17" r="9" fill="url(#fefSt)" class="fee-schein"/>
<path class="fee-stern" d="M122.4 9 L124.6 14.8 L130.6 15 L125.9 18.8 L127.6 24.6 L122.4 21.2 L117.2 24.6 L118.9 18.8 L114.2 15 L120.2 14.8Z" fill="#ffd8ea" stroke="#f08db5" stroke-width=".7"/></g>
</svg>`; // 2.376.0: Vorderansicht beim Stehenbleiben
let FEE_LAEUFT = false;
// 2.376.0 (Wunsch Hansi): kommt von rechts, dreht sich beim Stehen nach vorn (ein Bein gestreckt, eins leicht gebeugt), wedelt einmal mit dem Stab –
// dann wirbelt Zauberschnee wild umher – dreht sich zurück und fliegt weiter. Jedes Mal eine andere Flugbahn (nie zweimal dieselbe hintereinander).
const FEE_EIN = ["welle", "bogen", "looping", "sturz"], FEE_AUS = ["welle", "steil", "bogen", "sturz"];
function feeBahn() {
  let alt = ""; try { alt = localStorage.getItem("bk_fee_bahn") || ""; } catch {}
  let b; do { b = { ein: FEE_EIN[Math.floor(Math.random() * FEE_EIN.length)], aus: FEE_AUS[Math.floor(Math.random() * FEE_AUS.length)] }; } while (`${b.ein}/${b.aus}` === alt);
  try { localStorage.setItem("bk_fee_bahn", `${b.ein}/${b.aus}`); } catch {}
  return { ...b, amp: 8 + Math.random() * 16, takt: 300 + Math.random() * 260, halt: .3 + Math.random() * .4, hoch: Math.random() };
}
function feeKommt(vorschau) {
  if (typeof document === "undefined" || FEE_LAEUFT) return;
  if (vorschau !== true && !einst("fee", true)) return; // 2.379.0: abgeschaltet unter ⚙️ → ✨ Effekte
  if (vorschau === true && !fxAn()) return fxAusHinweis(() => feeKommt(true));
  if (vorschau !== true && (!fxAn() || document.hidden || S.view !== "start")) { // 2.372.0: wartet, bis die Startseite sichtbar ist (höchstens 2 Min.)
    const n = (feeKommt.versuche = (feeKommt.versuche || 0) + 1); if (n <= 24 && einst("animiert", true)) setTimeout(feeKommt, 5000); return;
  }
  feeKommt.versuche = 0;
  const held = vorschau === true ? null : document.querySelector("#v-start .hero");
  const r = held?.getBoundingClientRect(), bw = innerWidth, top = r && r.height > 60 ? Math.max(4, r.top) : 70, hoehe = r && r.height > 60 ? Math.min(r.height, 260) : 220;
  const f = document.createElement("div"); f.className = "fee"; f.setAttribute("role", "button"); f.setAttribute("aria-label", "Fee – antippen für einen schönen Spruch");
  f.innerHTML = `<div class="fee-innen"><div class="fee-seite">${FEE_SVG}</div><div class="fee-vorn">${FEE_VORN_SVG}</div></div>`;
  document.body.appendChild(f); FEE_LAEUFT = true;
  const W = 120, B = feeBahn(), minY = Math.max(2, top - 16), maxY = Math.max(minY + 20, top + hoehe - 96);
  const hx = Math.round(bw * B.halt - W / 2), hy = Math.min(maxY, Math.max(minY, top + Math.max(4, hoehe / 2 - 64))), y0 = minY + (maxY - minY) * B.hoch;
  const ein = 3000, steh = 4000, aus = 3000, lerp = (a, b, k) => a + (b - a) * k, klemm = (v) => Math.min(maxY + 30, Math.max(minY - 30, v));
  let t0 = 0, x = bw + 10, y = y0, staubUhr = 0, ende = false, stufe = "";
  const pos = () => { f.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
  const stern = () => { const s = f.querySelector(f.classList.contains("vorn") ? ".fee-vorn .fee-stern" : ".fee-seite .fee-stern")?.getBoundingClientRect(); return s ? [s.left + s.width / 2, s.top + s.height / 2] : [x + 10, y + 23]; };
  const staub = (sx, sy, viel) => {
    const kreis = viel === -1; if (kreis) viel = 0; // 2.378.0: Glitzerkreis bleibt fast stehen
    for (let i = 0; i < (viel || 1); i++) {
      const s = document.createElement("div"); s.className = "fee-staub"; document.body.appendChild(s);
      const dx = (Math.random() - .5) * (viel ? 90 : kreis ? 5 : 14), dy = (viel ? (Math.random() - .5) * 90 : kreis ? 2 + Math.random() * 5 : 18 + Math.random() * 22);
      s.animate([{ transform: `translate(${sx}px,${sy}px) scale(1)`, opacity: 1 }, { transform: `translate(${sx + dx}px,${sy + dy}px) scale(.2)`, opacity: 0 }], { duration: viel ? 900 : kreis ? 1300 : 1100 + Math.random() * 500, easing: "ease-out" }).onfinish = () => s.remove();
    }
  };
  f.onclick = (e) => { e.stopPropagation(); const [sx, sy] = stern(); staub(sx, sy, 18); feeSpruch(); };
  const drehen = (vorn) => { f.querySelector(".fee-innen")?.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(.08)", offset: .5 }, { transform: "scaleX(1)" }], { duration: 340, easing: "ease-in-out" }); setTimeout(() => f.classList.toggle("vorn", vorn), 170); };
  const weg = () => { ende = true; f.remove(); FEE_LAEUFT = false; };
  const schritt = (jetzt) => {
    if (ende) return; if (!t0) t0 = jetzt; const t = jetzt - t0;
    if (t < ein) { // Einflug von rechts
      const k = t / ein, e = 1 - Math.pow(1 - k, 2);
      x = lerp(bw + 10, hx, e); y = lerp(y0, hy, e);
      if (B.ein === "welle") y += Math.sin(t / B.takt) * B.amp * (1 - e * .7);
      else if (B.ein === "bogen") y -= Math.sin(Math.PI * e) * hoehe * .32;
      else if (B.ein === "sturz") y += Math.sin(Math.PI * e) * hoehe * .3;
      else if (B.ein === "looping" && k > .3 && k < .75) { const p = (k - .3) / .45 * Math.PI * 2, R = 26; x -= R * Math.sin(p); y -= R * (1 - Math.cos(p)); }
      y = klemm(y);
    } else if (t < ein + steh) { // Stehen: umdrehen, lächeln, wedeln, Zauberschnee
      const s = t - ein; x = hx; y = hy + Math.sin(t / 520) * 4;
      if (!stufe) { stufe = "dreht"; drehen(true); }
      if (stufe === "dreht" && s > 450) { stufe = "lacht"; f.classList.add("lacht"); }
      if (stufe === "lacht" && s > 950) { stufe = "zaubert"; f.classList.add("zaubert"); }
      if (stufe === "zaubert" && s > 2150) { stufe = "schnee"; const [sx, sy] = stern(); feeZauberschnee(sx, sy, top, hoehe); }
      if (stufe === "schnee" && s > 3600) { stufe = "zurueck"; f.classList.remove("lacht", "zaubert"); drehen(false); }
    } else if (t < ein + steh + aus) { // weiter nach links – jede Bahn anders
      const k = (t - ein - steh) / aus, kk = k * k;
      x = lerp(hx, -W - 20, kk); y = hy;
      if (B.aus === "welle") y += Math.sin(t / B.takt) * B.amp - k * 24;
      else if (B.aus === "steil") { x = lerp(hx, hx - bw * .45, k); y = hy - kk * (hy + W + 40); }
      else if (B.aus === "bogen") y += Math.sin(Math.PI * k) * hoehe * .28;
      else y -= Math.sin(Math.PI * k) * hoehe * .34;
      if (B.aus !== "steil") y = klemm(y);
      if (x < -W - 10 || y < -W - 10) return weg();
    } else return weg();
    if (stufe !== "lacht" && stufe !== "schnee" && jetzt - staubUhr > (stufe === "zaubert" ? 30 : 70)) { staubUhr = jetzt; // 2.378.0: beim Kreisen zeichnet der Stern einen Glitzerkreis
      const [sx, sy] = stern(); staub(sx, sy, stufe === "zaubert" ? -1 : 0); }
    pos(); requestAnimationFrame(schritt);
  };
  pos(); requestAnimationFrame(schritt);
}
// 2.376.0: Zauberschnee – Flocken und Funken wirbeln wild durchs Startbild und rieseln dann aus
function feeZauberschnee(sx, sy, top, hoehe) {
  const zeichen = ["❄", "❅", "✦", "✧", "❆", "•"], farben = ["#ffffff", "#ffe3f0", "#dff3ff", "#fff4c4"], bw = innerWidth;
  for (let i = 0; i < 64; i++) {
    const s = document.createElement("div"); s.className = "fee-flocke"; s.textContent = zeichen[i % zeichen.length];
    s.style.color = farben[i % farben.length]; s.style.fontSize = `${8 + Math.random() * 10}px`; document.body.appendChild(s);
    const pkt = [[sx, sy]]; for (let j = 0; j < 3; j++) pkt.push([Math.random() * bw, top + Math.random() * hoehe]);
    const [lx, ly] = pkt[3]; pkt.push([lx + (Math.random() - .5) * 40, ly + 30 + Math.random() * 40]);
    const dreh = (Math.random() - .5) * 720;
    s.animate(pkt.map(([px, py], j) => ({ transform: `translate(${px.toFixed(0)}px,${py.toFixed(0)}px) rotate(${(dreh * j / 4).toFixed(0)}deg) scale(${j === 0 ? .3 : 1})`, opacity: j === 4 ? 0 : 1 })),
      { duration: 2200 + Math.random() * 1400, delay: Math.random() * 220, easing: "ease-in-out", fill: "backwards" }).onfinish = () => s.remove();
  }
}
function feeSpruch() {
  const s = FEE_SPRUECHE[Math.floor(Math.random() * FEE_SPRUECHE.length)];
  const b = blatt("🧚 Die Fee sagt …", `<div class="fee-spruch">${s}</div>`); b.closest(".blatt-hg").style.zIndex = "9200";
}
// 3) 📌 neuer Pinnwand-Zettel: fällt leicht schräg herunter, setzt auf, die Nadel wird hineingedrückt
function zettelAnpinnen(el) {
  if (!fxAn() || !el) return;
  el.animate([{ translate: "0 -140px", scale: "1.12", opacity: 0 }, { translate: "0 8px", scale: "1", opacity: 1, offset: 0.68 }, { translate: "0 -3px", offset: 0.84 }, { translate: "0 0", scale: "1", opacity: 1 }],
    { duration: 720, easing: "cubic-bezier(.3,.7,.3,1)" });
  const n = document.createElement("span"); n.className = "zettel-nadel"; n.textContent = "📌"; n.setAttribute("aria-hidden", "true"); el.appendChild(n);
  n.animate([{ transform: "translate(-50%, -60px) scale(1.8)", opacity: 0 }, { transform: "translate(-50%, -60px) scale(1.8)", opacity: 1, offset: 0.55 }, { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.85 }, { transform: "translate(-50%, 0) scale(1)", opacity: 0 }],
    { duration: 1700, easing: "ease-in", fill: "forwards" }).onfinish = () => n.remove();
  try { navigator.vibrate?.(12); } catch {}
}
// 4) 🔢 Zahlen auf Kacheln/im Kopf zählen hoch, wenn sie (neu) erscheinen oder steigen – sinken springt sofort
const ZAHL_ALT = new Map();
function zahlenHochzaehlen(wurzel, sel, schluessel) {
  if (!wurzel) return;
  wurzel.querySelectorAll(sel).forEach((el) => {
    const neu = parseInt(el.textContent, 10), k = schluessel(el); if (!Number.isFinite(neu) || String(neu) !== el.textContent.trim()) return;
    const alt = ZAHL_ALT.has(k) ? ZAHL_ALT.get(k) : 0; ZAHL_ALT.set(k, neu);
    if (!fxAn() || neu <= alt) return;
    const t0 = performance.now(), dauer = Math.min(900, 380 + (neu - alt) * 60);
    const schritt = (t) => { const p = Math.min(1, Math.max(0, (t - t0) / dauer)), e = 1 - Math.pow(1 - p, 3); if (!el.isConnected) return; el.textContent = String(Math.round(alt + (neu - alt) * e)); if (p < 1) requestAnimationFrame(schritt); };
    el.textContent = String(alt); requestAnimationFrame(schritt);
    el.animate([{ scale: "1" }, { scale: "1.35" }, { scale: "1" }], { duration: dauer + 200, easing: "ease-out" });
  });
}

// ---------- KC-CLUB-REISSWOLF (2.54.0, Wunsch Hansi): Gelöschtes läuft sichtbar durch einen Aktenvernichter ----------
// Rein optisch: Streifen-Kopien des Elements fallen aus einem Schlitz. Abschaltbar, ruhig bei „Bewegung reduzieren“/Sparmodus. Fehler hier stören nie das Löschen.
function reisswolf(el) {
  try {
    if (!el?.isConnected || !einst("reisswolf", true) || SPAR?.an || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 10 || r.bottom < 0 || r.top > innerHeight) return Promise.resolve();
    const n = Math.max(6, Math.min(16, Math.round(r.width / 22))), box = document.createElement("div");
    box.className = "rw-box"; box.setAttribute("aria-hidden", "true");
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    for (let i = 0; i < n; i++) {
      const s2 = document.createElement("div"), c = el.cloneNode(true);
      c.removeAttribute("id"); c.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
      c.style.cssText += `;position:absolute;left:0;top:0;width:${r.width}px;height:${r.height}px;margin:0;box-sizing:border-box;pointer-events:none`;
      s2.className = "rw-streifen"; s2.style.clipPath = `inset(0 ${(100 - ((i + 1) * 100) / n).toFixed(2)}% 0 ${((i * 100) / n).toFixed(2)}%)`;
      s2.style.setProperty("--rw-x", `${((Math.random() - .5) * 18).toFixed(1)}px`); s2.style.setProperty("--rw-d", `${(Math.random() * 10 - 5).toFixed(1)}deg`);
      s2.style.animationDelay = `${(420 + Math.random() * 120).toFixed(0)}ms`; s2.appendChild(c); box.appendChild(s2);
    }
    box.insertAdjacentHTML("beforeend", '<div class="rw-schlitz"></div>');
    (el.parentElement || document.body).appendChild(box); el.style.visibility = "hidden";
    try { navigator.vibrate?.([15, 30, 15, 30, 15]); } catch {}
    return new Promise((ok) => setTimeout(() => { box.remove(); ok(); }, 1250));
  } catch { return Promise.resolve(); }
}

export { SENDE_EFFEKTE, sendeEffektWahl, sendeEffektSetzen, sendeEffektVorschau, blaulichtVorschau, papierflieger, ankunftEffekt, feeKommt, reisswolf, zettelAnpinnen, zahlenHochzaehlen, fxAusHinweis };
