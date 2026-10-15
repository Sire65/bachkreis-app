// Jahreszeiten im Kopf – übernommen aus der KC Club App (KC-CLUB-JAHRESZEIT-AUTOMATIK, -DEKO, -BUEHNE, -EXTRAS …) und für den
// Bachkreis angepasst: Schneemann mit Dirigenten-Zylinder und goldenem Schal, Notenständer am Probentag statt Kochtopf,
// ein Orchesterwart (🧑‍🎓) statt Twinkey. Alles läuft nur im Gerät (Canvas/SVG), nichts geht an einen Server.
// Die Kommentare mit Versionsnummern („2.247.0 …“) stammen aus der KC Club App und erklären die Herkunft der Details.
import { S, einst as bkEinst, einstSetzen, zeige } from "./zustand.js";
import { esc, toast } from "../kern/ui.js";
import { WET, WETTER_VERALTET_MIN, wetterArt } from "./wetter.js";
import { themaWert, themaEigenSetzen, SPAR, jahreszeitArtSetzen, beiThemaWechsel } from "./darstellung.js";

// ---------- Anbindung an die Bachkreis-App (statt der globalen KC-Hilfen) ----------
const $ = (id) => document.getElementById(id);
const EINST_NAME = { animiert: "effekte" };
const einst = (k, std) => { const v = bkEinst()[EINST_NAME[k] || k]; return v === undefined ? std : v; };
const einstellung = (k, v) => einstSetzen(EINST_NAME[k] || k, v);
const einfach = () => !!bkEinst().einfach;
const fxAn = () => einst("animiert", true) && !SPAR.an && typeof document !== "undefined" && !!document.body?.animate;
const fxAusHinweis = () => toast("Effekte sind aus – unter Meins › Einstellungen „Kachel-Effekte“ einschalten.", 4000);
const melde = (t) => toast(t, 3000);
const RG = { an: false }, KOCH = { ok: true, bild: null };
const rgSichtbar = (e) => { if (!e?.isConnected) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && getComputedStyle(e).visibility !== "hidden"; };
const TZ = "Europe/Berlin";
const tagPlus = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const heuteIso = () => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
const isoBerlin = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
// Sonnenauf- und -untergang für Bergkamen (51,62° N · 7,64° O), NOAA-Näherung (aus der KC Club App)
function sonne(d = new Date()) {
  const rad = Math.PI / 180, lat = 51.62 * rad, lon = 7.64;
  const n = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (n - 1);
  const zgl = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dekl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat) * Math.cos(dekl)) - Math.tan(lat) * Math.tan(dekl)) / rad;
  const mitte = 720 - 4 * lon - zgl, t0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { auf: new Date(t0 + (mitte - 4 * ha) * 6e4), unter: new Date(t0 + (mitte + 4 * ha) * 6e4) };
}
export function istNacht() { const j = new Date(), s = sonne(j); return j < s.auf || j > s.unter; }
const FEIERTAGE_CACHE = {};
function osterSonntag(jahr) { // Gaußsche Osterformel – ISO-Datum
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}
function feiertageNRW(jahr) {
  if (FEIERTAGE_CACHE[jahr]) return FEIERTAGE_CACHE[jahr];
  const ostern = osterSonntag(jahr);
  const liste = [
    [`${jahr}-01-01`, "Neujahr"], [tagPlus(ostern, -2), "Karfreitag"], [tagPlus(ostern, 1), "Ostermontag"], [`${jahr}-05-01`, "Tag der Arbeit"],
    [tagPlus(ostern, 39), "Christi Himmelfahrt"], [tagPlus(ostern, 50), "Pfingstmontag"], [tagPlus(ostern, 60), "Fronleichnam"],
    [`${jahr}-10-03`, "Tag der Deutschen Einheit"], [`${jahr}-11-01`, "Allerheiligen"], [`${jahr}-12-25`, "1. Weihnachtstag"], [`${jahr}-12-26`, "2. Weihnachtstag"],
  ];
  return (FEIERTAGE_CACHE[jahr] = Object.fromEntries(liste));
}
// Was die Bühne aus den App-Daten braucht (setzt kopf.js): nächster eigener Termin → Notenständer am Probentag
export const JZ_KONTEXT = { naechsterTermin: () => null };
// Astronomische Jahreszeiten-Anfänge (Meeus) – aus der KC Club App
var JZ_LETZTE = { art: null, eis: null };
function jzAnfaenge(jahr) {
  const Y = (jahr - 2000) / 1000, jd = (a, b, c, d, e) => a + b * Y + c * Y * Y + d * Y ** 3 + e * Y ** 4, zeit = (x) => new Date((x - 2440587.5) * 86400000);
  return { fruehling: zeit(jd(2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057)), sommer: zeit(jd(2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030)),
    herbst: zeit(jd(2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078)), winter: zeit(jd(2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032)) };
}
// ---------- ab hier: Code der KC Club App ----------
function jahreszeitArt(d = new Date()) {
  const m = d.getMonth() + 1, t = d.getDate(), a = jzAnfaenge(d.getFullYear());
  const weih = new Date(d.getFullYear(), 11, 25), advent1 = new Date(weih); advent1.setDate(25 - ((weih.getDay() || 7)) - 21); // 4 Sonntage vor dem 25.12.
  if ((m === 12 && t === 31) || (m === 1 && t === 1)) return "silvester";
  if (d >= advent1 && (m === 11 || (m === 12 && t <= 30))) return "advent";
  if (d >= a.winter || d < a.fruehling) return "winter";
  if (d < a.sommer) return "fruehling";
  if (d < a.herbst) return "sommer";
  return "herbst";
}
// Wahl je Gerät: „auto“ (Standard) stellt sich von selbst um; sonst eine feste Jahreszeit
const JZ_WAHL = [["auto", "🔄 Automatik"], ["fruehling", "🌱 Frühling"], ["sommer", "🌻 Sommer"], ["herbst", "🍂 Herbst"], ["winter", "⛄ Winter"]];
const jzWahl = () => { const t = themaWert("jz"); if (t) return t; try { const w = localStorage.getItem("bk_jzWahl"); return JZ_WAHL.some(([k]) => k === w) ? w : "auto"; } catch { return "auto"; } }; // 2.323.0: Thema zuerst (auch advent/silvester)
const jahreszeitAktuell = (d = new Date()) => (jzWahl() === "auto" ? jahreszeitArt(d) : jzWahl());
function jzWahlSetzen(w) { if (!themaEigenSetzen("jz", w)) try { localStorage.setItem("bk_jzWahl", w); } catch {} JZB.vorschau = null; jzWahlZeigen(); jahreszeitKopf(); melde(w === "auto" ? "🔄 Automatik: die Jahreszeit stellt sich von selbst um" : `${JZ_WAHL.find(([k]) => k === w)[1]} fest eingestellt`); }
function jzWahlZeigen() { document.dispatchEvent(new CustomEvent("bk-jahreszeit")); } // Bachkreis: Auswahl zeichnet Meins › Einstellungen neu
// ❄️ Eiszapfen (2.273.0, Wunsch Hansi): im tiefen Winter hängen kurze Eiszapfen an der Leiste mit den LEDs – höchstens 9 px, damit nichts verdeckt wird.
// Tiefer Winter: Winter fest gewählt oder als Vorschau, sonst Winteranfang bis Ende Februar – und an jedem Wintertag (auch Advent/Silvester), an dem
// das frische Wetter Frost meldet (veraltete Wetterdaten zählen nicht).
function jzTieferWinter(art) {
  if (!["winter", "advent", "silvester"].includes(art)) return false;
  if (JZB.vorschau === "winter" || jzWahl() === "winter") return true;
  try { const r = WET?.r, j = r?.daten?.jetzt, frisch = !!j && !!r.stand && Date.now() - new Date(r.stand) <= WETTER_VERALTET_MIN * 60000;
    if (frisch && Number.isFinite(+j.temp) && +j.temp <= 0) return true; } catch {} // Wetter noch nicht geladen
  const d = new Date(); return art === "winter" && d.getMonth() + 1 !== 3;
}
function jzEiszapfen(h, art) {
  const leiste = h.querySelector(".statusleiste"); leiste?.querySelector(".jz-eis")?.remove(); leiste?.classList.remove("jz-eis-an");
  if (!leiste || einfach() || !fxAn() || !einst("jahreszeit", true) || !jzTieferWinter(art)) return;
  leiste.classList.add("jz-eis-an");
  leiste.insertAdjacentHTML("beforeend", '<svg class="jz-eis" aria-hidden="true"></svg>');
  requestAnimationFrame(jzEisLaenge);
}
// ---------- 2.335.0 KC-CLUB-DEKO (Wunsch Hansi „Deko: Wimpel, Lichterkette usw. – an die Stelle, wo die Eiszapfen hängen“) ----------
// Unter der Leiste mit den Lämpchen hängt eine Girlande in Bögen: 🎏 Wimpel, 💡 Lichterkette (einige Birnen funkeln sanft) oder 🏮 Laternen.
// Automatisch passend zu Jahreszeit bzw. Thema (z. B. Herbst = Laternen, Advent = warmweiße Lichter, Oktoberfest = blau-weiße Wimpel, Silvester
// = goldene Lichter); im tiefen Winter hängen dort die Eiszapfen. Wahl je Gerät unter ⚙️ → 🍂 Jahreszeiten. Ein stilles Bild (SVG) – kostet
// keinen Akku; nur das sanfte Funkeln ist eine Bildschirm-Animation (im Sparmodus aus). Tippen geht hindurch.
const JZ_DEKO_WAHL = [["auto", "🔄 Automatisch"], ["wimpel", "🎏 Wimpel"], ["lichter", "💡 Lichterkette"], ["laternen", "🏮 Laternen"], ["aus", "🚫 Aus"]];
const JZ_DEKO_FARBEN = { bunt: ["#e63946", "#ffb703", "#2a9d8f", "#3a86ff", "#ff6b9a", "#8ac926"], pastell: ["#f7a8c4", "#9fd3ff", "#fff3a0", "#b6f0b0", "#d9b8f7"],
  bayern: ["#1f6fd1", "#ffffff"], herbst: ["#e85d04", "#ffba08", "#dc2f02", "#f48c06", "#9d0208"], karibik: ["#ff006e", "#ffbe0b", "#00bbf9", "#00f5d4", "#fb5607"],
  warm: ["#ffd27a", "#fff0c2", "#ffc65c"], gold: ["#ffd700", "#fff1a8", "#f5c542", "#ffe680"], halloween: ["#ff7a00", "#9b4dca", "#ffae42", "#7b2cbf"] };
const JZ_DEKO_AUTO = { herbst: ["laternen", "herbst"], advent: ["lichter", "warm"], silvester: ["lichter", "gold"], sommer: ["wimpel", "bunt"], fruehling: ["wimpel", "pastell"],
  wiesn: ["wimpel", "bayern"], karneval: ["wimpel", "bunt"], kirmes: ["lichter", "bunt"], karibik: ["laternen", "karibik"], halloween: ["lichter", "halloween"] };
const JZ_DEKO_STANDARD = { wimpel: "bunt", lichter: "warm", laternen: "herbst" };
const jzDekoWahl = () => { try { const w = localStorage.getItem("bk_jzDeko"); return JZ_DEKO_WAHL.some(([k]) => k === w) ? w : "auto"; } catch { return "auto"; } };
function jzDekoArt(art) { // → [Art, Farben] oder null
  const w = jzDekoWahl(); if (w === "aus") return null;
  const a = JZ_DEKO_AUTO[art] || null;
  if (w === "auto") return a && !jzTieferWinter(art) ? a : null;
  return [w, a && a[0] === w ? a[1] : JZ_DEKO_STANDARD[w]];
}
function jzDekoWeg(h) { const l = (h || document).querySelector("#v-start .statusleiste, .statusleiste"); l?.querySelector(".jz-deko")?.remove(); l?.classList.remove("jz-deko-an"); }
function jzDeko(h, art) {
  const leiste = h.querySelector(".statusleiste"); jzDekoWeg(h);
  const d = jzDekoArt(art); if (!leiste || !d) return;
  leiste.classList.add("jz-deko-an");
  leiste.insertAdjacentHTML("beforeend", `<svg class="jz-deko" aria-hidden="true" data-art="${d[0]}" data-farben="${d[1]}"></svg>`);
  requestAnimationFrame(jzDekoMalen);
  try { new ResizeObserver(() => jzDekoMalen()).observe(leiste.querySelector(".jz-deko")); } catch {} // 2.337.0: sobald die Startseite sichtbar wird, malen
}
function jzDekoMalen() {
  const e = document.querySelector("#v-start .statusleiste .jz-deko"); if (!e) return;
  const W = Math.round(e.getBoundingClientRect().width), art = e.dataset.art, F = JZ_DEKO_FARBEN[e.dataset.farben] || JZ_DEKO_FARBEN.bunt; if (W < 40) return;
  const mass = `${W}|${art}|${e.dataset.farben}`; if (e.dataset.mass === mass) return; e.dataset.mass = mass;
  const boegen = Math.max(2, Math.round(W / 130)), sp = W / boegen, durch = art === "laternen" ? 5 : 7, X = (v) => v.toFixed(1);
  const y = (x) => { const f = (x % sp) / sp; return 1.5 + durch * 4 * f * (1 - f); }; // Girlande hängt in Bögen durch
  const ab = (x) => (y(x + .5) - y(x - .5)); // Steigung → Neigung der Teile
  let seil = ""; for (let b = 0; b < boegen; b++) seil += `M${X(b * sp)} 1.5 Q${X((b + .5) * sp)} ${X(1.5 + durch * 2)} ${X((b + 1) * sp)} 1.5 `;
  let teile = "", H = 22;
  if (art === "wimpel") {
    let i = 0; for (let x = 7; x < W - 5; x += 13, i++) {
      const c = F[i % F.length], a = Math.atan(ab(x)) * 57.3, x0 = x - 5.2, x1 = x + 5.2;
      teile += `<path d="M${X(x0)} ${X(y(x0))} L${X(x1)} ${X(y(x1))} L${X(x)} ${X(y(x) + 12)} Z" fill="${c}" stroke="rgba(0,0,0,.18)" stroke-width=".5"/>`
        + (F.length === 2 && c === "#ffffff" ? "" : `<path d="M${X(x0 + 1.4)} ${X(y(x0 + 1.4) + 1.2)} L${X(x - .4)} ${X(y(x) + 7)}" stroke="rgba(255,255,255,.45)" stroke-width=".9" stroke-linecap="round" fill="none" transform="rotate(${X(a * .2)} ${X(x)} ${X(y(x))})"/>`);
    }
    H = 22;
  } else if (art === "lichter") {
    let i = 0; for (let x = 8; x < W - 4; x += 15, i++) {
      const c = F[i % F.length], k = (i % 2 ? 1 : -1) * 14 + Math.atan(ab(x)) * 57.3, yy = y(x);
      teile += `<g transform="rotate(${X(k)} ${X(x)} ${X(yy)})"><circle cx="${X(x)}" cy="${X(yy + 6.5)}" r="5.5" fill="${c}" opacity=".28"/>`
        + `<rect x="${X(x - 1.3)}" y="${X(yy + .3)}" width="2.6" height="2.6" rx=".6" fill="#2f3b2a"/>`
        + `<ellipse class="${i % 3 === 1 ? "fk" : ""}" style="${i % 3 === 1 ? `animation-delay:-${(i * .7) % 2.6}s` : ""}" cx="${X(x)}" cy="${X(yy + 6.4)}" rx="2.3" ry="3.4" fill="${c}"/>`
        + `<ellipse cx="${X(x - .7)}" cy="${X(yy + 5.4)}" rx=".7" ry="1.2" fill="#fff" opacity=".75"/></g>`;
    }
    H = 20;
  } else { // Laternen: runde Papierlaternen mit Rippen, innen leuchtend
    let i = 0; for (let x = sp / 4; x < W - 6; x += Math.max(34, sp / 2), i++) {
      const c = F[i % F.length], yy = y(x), cy = yy + 10;
      teile += `<line x1="${X(x)}" y1="${X(yy)}" x2="${X(x)}" y2="${X(cy - 6)}" stroke="#3a2a1a" stroke-width=".8"/>`
        + `<ellipse cx="${X(x)}" cy="${X(cy)}" rx="7" ry="6" fill="url(#jzDekoGlut${i % F.length})"/>`
        + `<path d="M${X(x - 3.5)} ${X(cy - 5.2)} Q${X(x - 5.2)} ${X(cy)} ${X(x - 3.5)} ${X(cy + 5.2)} M${X(x + 3.5)} ${X(cy - 5.2)} Q${X(x + 5.2)} ${X(cy)} ${X(x + 3.5)} ${X(cy + 5.2)} M${X(x)} ${X(cy - 6)} L${X(x)} ${X(cy + 6)}" stroke="rgba(0,0,0,.22)" stroke-width=".6" fill="none"/>`
        + `<rect x="${X(x - 2.6)}" y="${X(cy - 7)}" width="5.2" height="1.8" rx=".5" fill="#2b2b2b"/><rect x="${X(x - 2.2)}" y="${X(cy + 5.4)}" width="4.4" height="1.6" rx=".5" fill="#2b2b2b"/>`
        + `<line x1="${X(x)}" y1="${X(cy + 7)}" x2="${X(x)}" y2="${X(cy + 10)}" stroke="${c}" stroke-width="1"/>`;
    }
    H = 30;
  }
  const verlauf = art === "laternen" ? `<defs>${F.map((c, j) => `<radialGradient id="jzDekoGlut${j}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".85"/></radialGradient>`).join("")}</defs>` : "";
  e.setAttribute("viewBox", `0 0 ${W} ${H}`); e.style.height = `${H}px`;
  e.innerHTML = `${verlauf}<path d="${seil}" fill="none" stroke="${art === "lichter" ? "#2f3b2a" : "rgba(60,40,25,.85)"}" stroke-width="${art === "lichter" ? 1 : .9}"/>${teile}`;
}
function jzDekoSetzen(w) { try { localStorage.setItem("bk_jzDeko", w); } catch {} jzDekoWahlZeigen(); jahreszeitKopf();
  melde(w === "aus" ? "🚫 Keine Deko an der Leiste" : w === "auto" ? "🔄 Deko passend zur Jahreszeit" : `${JZ_DEKO_WAHL.find(([k]) => k === w)[1]} hängt jetzt an der Leiste`);
  if (w !== "aus" && !einst("jahreszeit", true)) melde("„🍂 Jahreszeiten im Kopf“ ist aus – erst einschalten, dann hängt die Deko.", true); }
function jzDekoWahlZeigen() { document.dispatchEvent(new CustomEvent("bk-jahreszeit")); } // Bachkreis: Auswahl zeichnet Meins › Einstellungen neu
// 2.277.0 (Wunsch Hansi „länger und unterschiedlich wie Eiszapfen am Dach“): unregelmäßige Abstände, viele kurze, einige lange.
// 2.278.0 („Spitzen gerade in das Feld darunter“): Länge nach dem echten Abstand bis zum Infofeld – die längsten ragen 6 px hinein,
// ohne Feld (z. B. Kopf eingerollt) 22 px.
// 2.279.0 (Fund Hansi am PC-Monitor „einfach Dreiecke, realitätsnäher“): in echten Pixeln gezeichnet statt in die Breite gezogen – auf dem
// breiten Bildschirm mehr Zapfen, nie breiter. Jeder Zapfen leicht schief, mit Verdickung, rundem Tropfen-Ende, Eis-Verlauf und Glanzkante;
// oben ein unregelmäßiger Eisrand. Fester Zufall, damit nichts springt; neu gezeichnet nur, wenn sich Breite oder Länge ändern.
function jzEisLaenge() {
  const e = document.querySelector("#v-start .statusleiste .jz-eis"); if (!e) return;
  const l = e.parentElement.getBoundingClientRect(), f = document.querySelector("#v-start #heroInfo"), r = f && rgSichtbar(f) ? f.getBoundingClientRect() : null;
  const luecke = r && r.top > l.bottom ? r.top - l.bottom : 0, W = Math.round(e.getBoundingClientRect().width); if (W < 20) return;
  const lmax = Math.round(luecke ? Math.max(22, Math.min(46, luecke + 6)) : 22), H = lmax + 5, mass = `${W}x${lmax}`;
  if (e.dataset.mass === mass) return; e.dataset.mass = mass;
  const zf = (i) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); }, X = (v) => v.toFixed(1), roh = [];
  for (let x = 3, i = 0; x < W - 3; i++) { roh.push({ x, i, r: 3.5 + Math.pow(zf(i), 1.3) * 12 + (i % 5 === 2 ? 6 : 0) }); x += 4 + zf(i + 100) * 8; }
  const s = lmax / Math.max(...roh.map((z) => z.r));
  const zapfen = roh.map(({ x, i, r: rr }) => {
    const L = rr * s, b = 1.4 + L * .085 + zf(i + 50) * 1.3, d = (zf(i + 200) - .5) * b * .7, P = (fx, fy) => `${X(x + fx * b + d * fy)} ${X(fy * L)}`; // d: Spitze leicht schief
    return `<path class="jz-zapfen" d="M${X(x - b)} 0 C${P(-1.05, .22)} ${P(-.55, .48)} ${P(-.36, .6)} C${P(-.44, .7)} ${P(-.16, .82)} ${P(-.07, .94)} Q${P(0, 1.03)} ${P(.08, .94)} C${P(.2, .8)} ${P(.5, .68)} ${P(.4, .6)} C${P(.62, .47)} ${P(1.05, .22)} ${X(x + b)} 0 Z"/>`
      + (L > 9 ? `<path class="jz-glanz" d="M${P(-.5, .06)} Q${P(-.42, .38)} ${P(-.16, .74)}"/>` : "")
      ;
  }).join("");
  e._spitzen = roh.map(({ x, i, r: rr }) => { const L = rr * s, b = 1.4 + L * .085 + zf(i + 50) * 1.3; return [x + (zf(i + 200) - .5) * b * .7, L]; }).filter(([, L]) => L > lmax * .72); // 2.281.0: für die Tropfen – 2.283.0: nur die langen Zapfen
  let rand = "M0 -1"; for (let x = 0, i = 0; x < W; i++) { const n = Math.min(W, x + 5 + zf(i + 300) * 7); rand += ` Q${X((x + n) / 2)} ${X(2 + zf(i + 400) * 3)} ${X(n)} ${X(.8 + zf(i + 500))}`; x = n; }
  e.setAttribute("viewBox", `0 0 ${W} ${H}`); e.style.height = `${H}px`;
  e.innerHTML = `<defs><linearGradient id="jzEisVerlauf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".97"/><stop offset=".4" stop-color="#eaf7ff" stop-opacity=".92"/><stop offset=".8" stop-color="#b9e2ff" stop-opacity=".82"/><stop offset="1" stop-color="#93ccf3" stop-opacity=".72"/></linearGradient></defs>
    <g fill="url(#jzEisVerlauf)">${zapfen}</g><path class="jz-rand" d="${rand} L${W} -1 Z"/>`;
}
addEventListener("resize", () => requestAnimationFrame(() => { jzEisLaenge(); jzDekoMalen(); }));
// 💧 2.281.0 (Wunsch Hansi „ab und an ein leicht blauer Wassertropfen von verschiedenen Eiszapfen – nicht zu oft, sonst stört es“):
// höchstens ein Tropfen alle 7–16 s – 2.283.0: alle 3½–8 s, nur von den langen Zapfen (2.282.0: deutlicher, fällt bis unten – dort bildet sich langsam eine Pfütze), jedes Mal an einem anderen längeren Zapfen; er wächst an der Spitze, löst sich und fällt kurz.
// Nur sichtbar, bewegungsarm-Einstellung des Geräts wird beachtet; ein einziger Takt für die ganze App.
(function jzTropfTakt() {
  setTimeout(() => {
    try {
      const e = document.querySelector("#v-start .statusleiste .jz-eis"), sp = e?._spitzen;
      // 2.322.0 KC-CLUB-EIS-TAKT (Fund Hansi „noch keinen fallenden Eiszapfen gesehen“): sein Handy meldet „Bewegung reduzieren“ – dann lief dieser Takt nie
      // (keine Tropfen, kein Eisstück), obwohl die Jahreszeiten-Bühne seit 2.263.0 bewusst trotzdem läuft. Jetzt wie die Bühne: abschaltbar über
      // „🍂 Jahreszeiten im Kopf“ bzw. Sparmodus, nicht über die Geräte-Einstellung.
      if (sp?.length && !document.hidden && rgSichtbar(e) && !SPAR?.an) {
        const zuletzt = e._zuletzt || []; let n = Math.floor(Math.random() * sp.length); // 2.283.0: nie einer der letzten drei Zapfen
        for (let v = 0; v < sp.length && zuletzt.includes(n) && sp.length > 3; v++) n = (n + 1) % sp.length; e._zuletzt = [n, ...zuletzt].slice(0, 3);
        const eis = jzbEisNameWill(); if (eis) { let g = 0; for (let i = 1; i < sp.length; i++) if (sp[i][1] > sp[g][1]) g = i; n = g; } // 2.319.0 KC-CLUB-EISNAME: vom größten Zapfen
        const [x, L] = sp[n], t = document.createElementNS("http://www.w3.org/2000/svg", "path");
        t.setAttribute("class", eis ? "jz-eisstueck" : "jz-tropfen");
        t.setAttribute("d", eis ? `M${x.toFixed(1)} ${(L - 6).toFixed(1)} l4.2 6 l-1.3 7.5 l-2.9 1.8 l-2.9 -2.4 l-.9 -6.9 z` : `M${x.toFixed(1)} ${(L - 4.5).toFixed(1)} q3.4 5 0 7.6 q-3.4 -2.6 0 -7.6 z`); e.appendChild(t); // 2.282.0: deutlicher
        t.style.transformBox = "fill-box"; t.style.transformOrigin = "50% 0";
        const a = t.animate([{ transform: "scale(.25)", opacity: 0 }, { transform: "scale(1)", opacity: .95, offset: .6 }, { transform: "translateY(1px) scale(1,1.08)", opacity: .95 }], { duration: 1500, easing: "ease-out" });
        a.onfinish = () => { // gelöst: in der Jahreszeiten-Bühne bis zum Boden fallen (dort wächst die Pfütze) – ohne Bühne nur ein kurzes Stück
          const r = t.getBoundingClientRect(); if ((eis ? jzbEisStueck : jzbEisTropfen)(r.left + r.width / 2, r.top + r.height / 2)) return t.remove();
          const b = t.animate([{ transform: "translateY(1px)", opacity: .95 }, { transform: "translateY(40px)", opacity: 0 }], { duration: 900, easing: "ease-in" });
          b.onfinish = b.oncancel = () => t.remove();
        };
        a.oncancel = () => t.remove();
      }
    } catch {}
    jzTropfTakt();
  }, 3500 + Math.random() * 4500); // 2.283.0: etwas öfter (alle 3½–8 s)
})();
const JZ_TEILE = { herbst: ["🍂", "🍁", "🍂", "🍃"], advent: ["❄", "✦", "❄", "•"], winter: ["❄", "•", "❄"], silvester: ["✨", "🎆", "✨", "🎇"], fruehling: ["🌸", "🌼", "🌸"], sommer: ["🦋", "✨"] };
function jahreszeitKopf() {
  const h = document.querySelector("#v-start .hero"); if (!h) return;
  h.querySelector(".jz-schicht")?.remove(); h.querySelector(".jz-sprech")?.remove(); h.classList.remove("jz-boden"); jzbStop(); jzDekoWeg(h);
  if (!fxAn() || !einst("jahreszeit", true)) { if (einst("jahreszeit", true)) jzDeko(h, JZB.vorschau || jahreszeitAktuell()); return; } // 2.335.0: die Deko ist ein stilles Bild – auch im Sparmodus
  // 2.247.0 KC-CLUB-JAHRESZEIT-BUEHNE: Herbst, Advent/Winter, Frühling und Sommer mit Boden (Laub, Schnee, Gras, Sonnenblume) – Silvester bleibt Feuerwerk
  // 2.263.0 (Fund Hansi „Blätter bleiben immer noch nicht liegen“): sein Handy meldet „Bewegung reduzieren“ (wie schon bei der Jalousie, 2.161.0) –
  // dann lief bisher nur die alte Emoji-Deko, bei der nichts liegen bleibt. Die Bühne ist ruhig und lässt sich mit „🍂 Jahreszeiten im Kopf“ abschalten,
  // sie läuft deshalb auch bei „Bewegung reduzieren“.
  const jetzt = JZB.vorschau || jahreszeitAktuell(); JZ_LETZTE.art = jetzt;
  jzEiszapfen(h, jetzt); // KC-CLUB-JAHRESZEIT-AUTOMATIK (2.273.0)
  jzDeko(h, jetzt); // 2.335.0 KC-CLUB-DEKO
  if (JZB_ARTEN.includes(jetzt) && jzbStart(h, jetzt)) return;
  const art = jetzt, teile = JZ_TEILE[art], n = art === "sommer" ? 3 : art === "silvester" ? 9 : 11;
  const s = document.createElement("div"); s.className = `jz-schicht jz-${art}`; s.setAttribute("aria-hidden", "true");
  s.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 97 + 13) % 100};--v:${(i * 37) % 11};--d:${(art === "silvester" ? 2.4 : 7) + ((i * 53) % 9) * 0.7}s;--s:${0.6 + ((i * 29) % 7) / 10}">${teile[i % teile.length]}</i>`).join("");
  h.prepend(s);
}
function jahreszeitUmschalten(an) { einstellung("jahreszeit", an); jahreszeitKopf(); }
// Automatik: wechselt die Jahreszeit (z. B. um Mitternacht oder genau zum Winteranfang), stellt sich der Kopf von selbst um – und Frost lässt Eiszapfen wachsen
setInterval(() => { try { const h = document.querySelector("#v-start .hero"); if (!h || JZB.vorschau) return; const art = jahreszeitAktuell(), eis = jzTieferWinter(art);
  if (art !== JZ_LETZTE.art) jahreszeitKopf(); else if (eis !== JZ_LETZTE.eis) jzEiszapfen(h, art); else jzEisLaenge(); JZ_LETZTE.eis = eis; } catch {} }, 60000);

// ---------- KC-CLUB-JAHRESZEIT-BUEHNE (2.247.0, Wunsch Hansi): Jahreszeiten im Kopf mit Boden ----------
// 🍂 Herbst: Laub fällt und bleibt unten liegen; liegt genug, kommt ein Windstoß (abwechselnd von links und von rechts) und weht es weg.
// ❄️ Winter/Advent: Schnee bleibt liegen und wird weggeweht – jeder 3. Lauf wird daraus ein lachender Schneemann
//    (mit Kochmütze und weinrotem Schal, im Advent mit Weihnachtsmütze), der nach einer Weile schmilzt.
// 🌱 Frühling: Gras wächst mit den ersten Blumen, Blüten schweben herab, Schmetterlinge – jeder 3. Lauf hoppelt ein Osterhase vorbei.
// 🌻 Sommer: eine Sonnenblume wächst (jeder 3. Lauf drei), eine Biene besucht sie – abends Glühwürmchen. Am Ende fallen die Blütenblätter, Windstoß.
// Ein <canvas> im Kopf; zeichnet nur, wenn die Startseite im Bild und die App im Vordergrund ist. Aus bei „✨ Animierte Knöpfe“ aus,
// Sparmodus oder „Bewegung reduzieren“ (dann wie bisher). Tippen geht durch (pointer-events: none). Lauf-Zähler je Gerät (kc_club_jzLauf).
const JZB_ARTEN = ["herbst", "advent", "winter", "fruehling", "sommer", "kirmes", "wiesn", "karibik", "karneval", "halloween"]; // 2.331.0: + Themen-Bühnen
const JZB_BLUEHT = 150; // 2.250.0 (Fund Hansi „Sonnenblume nur kurz“): Blumen/Sonnenblume blühen 2½ Min., bevor der Wind kommt
const JZB_SP = 3, JZB_RAND = 22; // 2.259.0: 22 statt 16 – nichts in die runden Ecken (Radius 26) // Bodenspalten in px; nichts in den runden Ecken ablegen
const JZB_LAUB = ["#e0802a", "#c8432b", "#e8b23a", "#a85a2a", "#d96a1f", "#b33a2a", "#cf9a2b"];
const JZB_GRUEN = ["#5d9b35", "#6fae3e", "#4f8a2b", "#7cbd4a"];
const JZB_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const JZB = { lauf: 0, vorschau: "" };
const jzbZ = (a, b) => a + Math.random() * (b - a);
const jzbW = (l) => l[Math.floor(Math.random() * l.length)];
const jzbEase = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const jzbHopp = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2); // leicht überschwingend
const jzbBodenH = (x) => JZB.boden[Math.max(0, Math.min(JZB.boden.length - 1, Math.round(x / JZB_SP)))] || 0;
const jzbImFeld = (x) => x > JZB_RAND && x < JZB.w - JZB_RAND;
function jzbLaufLesen() { try { return +localStorage.getItem("bk_jzLauf") || 0; } catch { return 0; } }
function jzbAufhaeufen(x, menge, breite) {
  const i0 = Math.round(x / JZB_SP);
  for (let d = -breite; d <= breite; d++) { const i = i0 + d; if (i >= 0 && i < JZB.boden.length) JZB.boden[i] += menge * (1 - Math.abs(d) / (breite + 1)); }
}
function jzbStart(h, art) {
  const cv = document.createElement("canvas"), ctx = cv.getContext && cv.getContext("2d");
  if (!ctx || typeof ResizeObserver === "undefined") return false;
  const s = document.createElement("div"); s.className = `jz-schicht jz-buehne jz-${art}`; s.setAttribute("aria-hidden", "true");
  s.appendChild(cv); h.prepend(s);
  // 2.259.0 (Fund Hansi „Blätter bleiben nicht liegen“): unter dem Infofeld waren nur ~8–18 px Boden – liegendes Laub lag halb unter der Kante.
  // Jetzt eigener Bodenstreifen (CSS .jz-boden) und Sprechblase für Twinkey
  h.classList.add("jz-boden");
  const sb = document.createElement("div"); sb.className = "jz-sprech"; sb.setAttribute("aria-hidden", "true"); h.appendChild(sb);
  const saison = art === "advent" ? "winter" : art;
  Object.assign(JZB, { s, cv, ctx, art, saison, w: 0, h: 0, dpr: 0, k: 1, T: 0, pt: 0, letzt: 0, imBild: true, pruef: 0, spawn: 0,
    flug: [], liegt: [], fx: [], boden: [], wind: null, mann: null, halme: [], blumen: [], gaeste: [], welk: 0, phase: "anfang",
    blase: sb, besuch: null, gegossen: false, ext: {}, extraPruef: 0, eier: [], igel: null, igelUhr: undefined, schirm: null, schirmUhr: undefined, tropfen: [], pfuetzen: null, regenSpawn: 0, blaeser: null, eicheln: null, hoernchen: null, hoernchenUhr: undefined, nussName: null, nussErster: false, raupe: null, raupeUhr: undefined, ski: null, skiUhr: null, rillen: null, fest: null }); // 2.249.0 KC-CLUB-JAHRESZEIT-EXTRAS
  if (!h.dataset.jzKlick) { h.dataset.jzKlick = "1"; h.addEventListener("click", jzbEiAntippen); } // Ostereier antippen
  // Vorschau im Winter: gleich der Schneemann-Lauf, damit man ihn nicht erst nach zwei Windstößen sieht
  JZB.lauf = JZB.vorschau ? (JZB.extra === "twinkey" ? 1 : saison === "winter" ? 2 : 0) : jzbLaufLesen(); // Vorschau „🧹 Twinkey“: gleich sein Lauf
  JZB.ro = new ResizeObserver(jzbGroesse); JZB.ro.observe(s);
  if (typeof IntersectionObserver !== "undefined") { JZB.io = new IntersectionObserver((e) => { JZB.imBild = e[e.length - 1].isIntersecting; jzbWeiter(); }); JZB.io.observe(s); }
  if (!JZB.horcht) { JZB.horcht = true; document.addEventListener("visibilitychange", jzbWeiter); }
  jzbGroesse(); jzbWeiter();
  return true;
}
function jzbStop() { if (JZB.raf) cancelAnimationFrame(JZB.raf); clearTimeout(JZB.warteUhr); JZB.raf = 0; JZB.ro?.disconnect(); JZB.io?.disconnect(); JZB.ro = JZB.io = JZB.cv = null; }
function jzbGroesse() {
  const { s, cv } = JZB; if (!cv) return;
  const w = s.clientWidth, h = s.clientHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1); // 2.334.0: 1,5 statt 2 – knapp halb so viele Bildpunkte
  if (!w || !h || (w === JZB.w && h === JZB.h && dpr === JZB.dpr)) return;
  const breiter = JZB.w && Math.abs(w - JZB.w) > 8;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); JZB.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const alt = JZB.boden; JZB.boden = Array.from({ length: Math.ceil(w / JZB_SP) + 1 }, (_, i) => alt[i] || 0);
  Object.assign(JZB, { w, h, dpr, k: h >= 150 ? 1 : Math.max(.55, h / 150) });
  if (breiter && JZB.halme.length) jzbPflanzen(); // Handy gedreht: Beet neu verteilen (gleich weit gewachsen)
  if (breiter && JZB.eier.length) jzbEierVerstecken();
  if (!JZB.raf) jzbMalen();
}
function jzbWeiter() {
  if (JZB.raf || !JZB.cv) return;
  if (document.hidden || !JZB.imBild) { JZB.letzt = 0; return; }
  JZB.raf = requestAnimationFrame(jzbBild);
}
// 2.334.0 KC-CLUB-AKKU (Fund Hansi „Akku ruck, zuck leer – Handy meldet hohen Akkuverbrauch“): Das Jahreszeiten-Bild im Kopf wurde
// 60× je Sekunde in voller Auflösung neu gemalt – auch wenn niemand hinsah. Jetzt höchstens 30 Bilder je Sekunde, nach 45 s ohne
// Bedienung nur noch 12 (sieht gleich aus, die Bewegung rechnet mit der echten Zeit), Auflösung höchstens 1,5-fach.
const JZB_FPS = 30, JZB_FPS_RUHE = 12, JZB_RUHE_MS = 45000, JZB_STEHEN_MS = 180000; // 2.361.0: nach 3 Min. ohne Bedienung steht das Bild ganz still
let jzbBedient = Date.now();
["pointerdown", "keydown", "wheel"].forEach((t) => addEventListener(t, () => { jzbBedient = Date.now(); }, { passive: true, capture: true }));
// Akku unter 30 % und nicht am Laden: immer die sparsame Bildrate (Chrome/Android meldet den Akkustand, sonst gilt das Übliche)
let jzbAkkuKnapp = false;
try { navigator.getBattery?.().then((b) => { const f = () => { jzbAkkuKnapp = !b.charging && b.level < .3; }; f(); b.addEventListener("levelchange", f); b.addEventListener("chargingchange", f); }).catch(() => {}); } catch {}
// 2.337.0 KC-CLUB-AKKU-2 (Gesamtprüfung: Messung Startseite in Ruhe ≈ 8 % Rechenzeit, davon die Hälfte dauernd laufende Rahmen-„Ameisen“
// und atmende Lämpchen): nach derselben Ruhezeit (oder bei knappem Akku) halten diese Endlos-Animationen an – sichtbar bleiben sie,
// nur stehend. Beim ersten Antippen laufen sie sofort weiter.
setInterval(() => { try { document.documentElement.classList.toggle("bk-ruhe", jzbAkkuKnapp || Date.now() - jzbBedient > JZB_RUHE_MS); } catch {} }, 5000);
addEventListener("pointerdown", () => document.documentElement.classList.remove("bk-ruhe"), { passive: true, capture: true });
// 2.358.0 KC-CLUB-AKKU-3: eine Vorschau läuft nur noch 2 Minuten mit voller Bildrate (vorher dauerhaft), danach wie sonst sparsam;
// nach 15 Minuten endet sie von selbst (vorher blieb sie bis „beenden“ oder Neustart – auch der Grund für Hansis 30 % Akku in kurzer Zeit)
const jzbFps = () => ((JZB.vorschau && Date.now() - (JZB.vorschauSeit || 0) < 120000) || (!jzbAkkuKnapp && Date.now() - jzbBedient < JZB_RUHE_MS) ? JZB_FPS : JZB_FPS_RUHE);
// 2.361.0 KC-CLUB-AKKU-6 (Hansi „unsere App saugt das Handy leer“): Auch 6–12 Bilder/s halten Grafikchip und Bildschirm-Elektronik dauernd wach.
// Nach 3 Minuten ohne Bedienung bleibt das Kopfbild jetzt stehen (wie ein Foto); das erste Antippen/Wischen lässt es sofort weiterlaufen.
const jzbStehen = () => !(JZB.vorschau && Date.now() - (JZB.vorschauSeit || 0) < 120000) && Date.now() - jzbBedient > JZB_STEHEN_MS;
["pointerdown", "keydown", "wheel"].forEach((t) => addEventListener(t, () => { if (JZB.steht) { JZB.steht = false; JZB.letzt = 0; jzbWeiter(); } }, { passive: true }));
setInterval(() => { try { if ((JZB.vorschau || JZB.extra) && JZB.vorschauSeit && Date.now() - JZB.vorschauSeit > 15 * 60000) { JZB.vorschauSeit = 0; // still beenden – ohne auf die Startseite zu springen
  JZB.vorschau = ""; JZB.extra = ""; JZB.eisName = null; JZB.eisStueck = null; JZB.nussName = null; if (S.view === "start") jahreszeitKopf(); jzVorschauLeiste(); } } catch {} }, 30000);
function jzbBild(ts) {
  JZB.raf = 0;
  if (!JZB.cv?.isConnected) return jzbStop();
  const dt = JZB.letzt ? Math.min(.09, (ts - JZB.letzt) / 1000) : .016; JZB.letzt = ts;
  if ((JZB.pruef += dt) > 1) { JZB.pruef = 0; if (!fxAn() || !einst("jahreszeit", true)) return jahreszeitKopf(); }
  if (JZB.w) { if ((JZB.extraPruef -= dt) <= 0) { JZB.extraPruef = 30; jzbExtrasBestimmen(); } JZB.T += dt; JZB.pt += dt; jzbSchritt(dt); jzbMalen(); }
  if (jzbStehen()) { JZB.steht = true; return; } // 2.361.0: steht still bis zur nächsten Bedienung
  JZB.raf = -1; clearTimeout(JZB.warteUhr); JZB.warteUhr = setTimeout(() => { JZB.raf = 0; jzbWeiter(); }, Math.max(0, 1000 / jzbFps() - 10)); // schlafen – das nächste Bild kommt mit dem nächsten Bildwechsel danach
}
function jzbPhase(p) { JZB.phase = p; JZB.pt = 0; }
function jzbLaufEnde() {
  const J = JZB; J.lauf++; if (!J.vorschau) try { localStorage.setItem("bk_jzLauf", String(J.lauf)); } catch {}
  J.boden.fill(0); J.liegt = []; J.mann = null; J.iglu = null; J.sonne = null; J.wind = null; J.besuch = null; J.gegossen = false; J.welk = 0; J.halme = []; J.blumen = []; J.gaeste = J.gaeste.filter((g) => g.typ === "falter" || g.typ === "osterhase"); // 2.337.0: der Osterhase legt seine Eier zu Ende
  jzbPhase("anfang");
}
// Windstoß: abwechselnd von links (dir 1) und von rechts (dir -1); die Front zieht über den Kopf und nimmt mit, was liegt
function jzbWindStart(dauer = 4.2) {
  const J = JZB; J.wind = { dir: (J.lauf >> 1) % 2 ? -1 : 1, t: 0, dauer, st: 0, front: 0, striche: [], naechster: 0 };
  for (const f of J.flug) J.fx.push({ ...f, vx: 0, vy: f.vy || 20, a: 1 }); J.flug = [];
  jzbPhase("wind");
}
function jzbWindSchritt(dt) {
  const J = JZB, W = J.wind; if (!W) return;
  W.t += dt; W.st = Math.sin(Math.PI * Math.min(1, W.t / W.dauer));
  if (W.t < W.dauer * .85 && (W.naechster -= dt) <= 0) {
    W.naechster = jzbZ(.03, .09); // 2.250.0 (Fund Hansi „Windstoß nicht gesehen“): mehr, längere und kräftigere Striche
    W.striche.push({ x: W.dir > 0 ? -160 : J.w + 160, y: jzbZ(J.h * .08, J.h - 6), l: jzbZ(60, 160), v: jzbZ(420, 640), a: jzbZ(.4, .75), ph: jzbZ(0, 6) });
  }
  for (const s of W.striche) s.x += W.dir * s.v * dt;
  W.striche = W.striche.filter((s) => s.x > -220 && s.x < J.w + 220);
  const weg = Math.min(1.2, W.t / (W.dauer * .7)) * (J.w + 80) - 40; W.front = W.dir > 0 ? weg : J.w - weg;
}
const jzbHinterFront = (x) => { const W = JZB.wind; return !!W && (W.dir > 0 ? x < W.front : x > W.front); };
const jzbWindVorbei = () => { const W = JZB.wind; return !W || (W.t >= W.dauer && !W.striche.length); };

function jzbNeuesTeil(typ) {
  const J = JZB;
  if (typ === "blatt") return { typ, x: jzbZ(0, J.w), y: -12, vy: jzbZ(16, 28), s: jzbZ(6, 9.5) * (.75 + .25 * J.k), rot: jzbZ(0, 6.3), vr: jzbZ(-1.6, 1.6), ph: jzbZ(0, 6.3), fq: jzbZ(.9, 1.7), amp: jzbZ(14, 28), farbe: jzbW(themaWert("laub") || JZB_LAUB), form: Math.random() < .45 ? 1 : 0 }; // 2.323.0: Indian Summer leuchtet
  if (typ === "flocke") { const r = jzbZ(1, 2.6); return { typ, x: jzbZ(-10, J.w + 10), y: -4, r, vy: 12 + r * 9, ph: jzbZ(0, 6.3), fq: jzbZ(.8, 1.8), amp: jzbZ(5, 12) }; }
  return { typ: "bluete", x: jzbZ(0, J.w), y: -6, s: jzbZ(2.2, 3.4), vy: jzbZ(13, 20), rot: jzbZ(0, 6.3), vr: jzbZ(-2, 2), ph: jzbZ(0, 6.3), fq: jzbZ(.8, 1.4), amp: jzbZ(10, 20), farbe: jzbW(["#f9c6d6", "#ffe3ec", "#ffffff"]), a: 1 };
}
// Fallende Teile: Blätter bleiben liegen (stapeln sich), Flocken werden zur Schneedecke, Blüten vergehen im Gras
function jzbFallen(dt) {
  const J = JZB;
  for (const b of J.flug) {
    b.ph += dt * b.fq; b.x += Math.sin(b.ph) * b.amp * dt; if (b.vr) b.rot += b.vr * dt;
    b.y += b.vy * dt * (b.typ === "blatt" ? .65 + .35 * Math.abs(Math.cos(b.ph)) : 1);
    const boden = J.h - jzbBodenH(b.x);
    if (b.typ === "blatt" && b.y + b.s * .3 >= boden) {
      if (jzbImFeld(b.x)) { J.liegt.push({ x: b.x, yb: J.h - boden + b.s * .5, rot: jzbZ(-.5, .5) + (Math.random() < .5 ? 0 : Math.PI), s: b.s, farbe: b.farbe, form: b.form }); jzbAufhaeufen(b.x, b.s * .16, 3); }
      b.weg = true;
    } else if (b.typ === "flocke" && b.y + b.r >= boden) {
      if (jzbImFeld(b.x)) jzbAufhaeufen(b.x, b.r * 1.25, 2);
      b.weg = true;
    } else if (b.typ === "bluete" && b.y > J.h - 8 * J.k) { b.a -= dt * 1.2; if (b.a <= 0) b.weg = true; }
    if (b.y > J.h + 12) b.weg = true;
  }
  J.flug = J.flug.filter((b) => !b.weg);
}
// Fortgewehtes, Funken, abfallende Blütenblätter
function jzbFxSchritt(dt) {
  const J = JZB, W = J.wind, zug = W ? W.dir * 300 * W.st : 0;
  for (const p of J.fx) {
    if (p.liegt && !W) { p.y = J.h - 2; p.a = (p.a ?? 1) - dt * p.blass; if (p.a <= 0) p.weg = true; continue; }
    if (p.typ === "funke") { p.a -= dt * 1.1; p.x += p.vx * dt; p.y += p.vy * dt; if (p.a <= 0) p.weg = true; continue; }
    if (p.typ === "scherbe" || p.typ === "nuss" || p.typ === "pilz") { // 2.356.0: Eis-Scherben und Nüsse fliegen, hüpfen am Boden und verschwinden · 2.389.0: Pilze
      p.vy += (p.leicht ? 190 : 300) * dt; if (p.leicht) p.vx *= 1 - .35 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > J.h - 2) { p.y = J.h - 2; p.vy = -Math.abs(p.vy) * .3; p.vx *= .6; p.vr *= .6; p.a -= dt * 1.4; } else p.a -= dt * .2;
      if (p.a <= 0 || p.x < -40 || p.x > J.w + 40) p.weg = true; continue;
    }
    if (p.typ === "schmelz") { // rinnt am Schneemann herunter, wird schneller, wackelt leicht – unten läuft er in die Pfütze
      p.v = Math.min(70, p.v + 40 * dt); p.y += p.v * dt; p.spur = Math.min(10 * J.k, p.spur + p.v * dt * .5); p.x = p.x0 + Math.sin(p.y * .25 + p.ph) * .6 * J.k;
      if (p.y >= J.h - 2) { p.y = J.h - 2; p.a -= dt * 2.5; p.spur = Math.max(0, p.spur - 30 * dt); if (p.a <= 0) p.weg = true; }
      continue;
    }
    if (p.typ === "schal") { // liegt, bis die Windfront kommt – dann wirbelt er hoch, tanzt mit den Flocken und fliegt davon
      if (!W || (!p.los && !jzbHinterFront(p.x))) { if (!p.los) p.y = J.h - 3; else p.x += (p.vx || 60) * dt; if (p.x < -60 || p.x > J.w + 60) p.weg = true; continue; }
      if (!p.los) { p.los = true; p.vy = -jzbZ(150, 200); p.vx = W.dir * 40; // hochgewirbelt – mit einer Handvoll Schnee
        for (let i = 0; i < 14; i++) J.fx.push({ typ: "flocke", x: p.x + jzbZ(-14, 14), y: J.h - 4, r: jzbZ(.8, 2), vx: W.dir * jzbZ(40, 150), vy: -jzbZ(60, 170), a: 1 }); }
      p.t += dt; p.vx += W.dir * 90 * W.st * dt; p.vx *= 1 - .2 * dt;
      p.vx = W.dir * Math.min(110, Math.max(50, Math.abs(p.vx))); // nie stehen bleiben, nie zu schnell – er soll tanzen
      p.vy += (60 - 95 * W.st + Math.sin(p.t * 3.4) * 290) * dt; p.vy *= 1 - .35 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < 10 * J.k) { p.y = 10 * J.k; p.vy = Math.abs(p.vy) * .4; } else if (p.y > J.h - 3) { p.y = J.h - 3; p.vy = -Math.abs(p.vy) * .6 - 50; }
      p.rot += W.dir * (1.2 + 2.5 * W.st) * dt;
      if (p.x < -60 || p.x > J.w + 60) p.weg = true; continue;
    }
    p.vx = (p.vx || 0) + zug * dt; p.vx *= 1 - .35 * dt;
    p.vy = (p.vy || 0) + (W ? 70 - 90 * W.st : 40) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt; if (p.ph !== undefined) p.ph += dt * (p.fq || 1) * 3;
    if (p.blass) p.a = (p.a ?? 1) - dt * p.blass;
    const boden = J.h - 2;
    if (p.y > boden && !W) { p.y = boden; p.vx = 0; p.vy = 0; p.liegt = true; p.blass = p.blass || .25; }
    if (p.x < -50 || p.x > J.w + 50 || p.y > J.h + 30 || (p.a ?? 1) <= 0) p.weg = true;
  }
  J.fx = J.fx.filter((p) => !p.weg);
}
function jzbSchritt(dt) {
  const J = JZB, S = J.saison;
  if (J.phase === "anfang" && JZB_FESTE.includes(S)) { jzbFestStart(); jzbPhase("fest"); } // 2.331.0 KC-CLUB-THEMEN-BUEHNE
  else if (J.phase === "anfang") { if (S === "fruehling" || S === "sommer") jzbPflanzen(); jzbPhase(S === "fruehling" || S === "sommer" ? "wachsen" : "fallen"); }
  jzbWindSchritt(dt);
  if (S === "herbst") jzbHerbst(dt);
  else if (S === "winter") jzbWinter(dt);
  else if (JZB_FESTE.includes(S)) jzbFest(dt);
  else jzbBeet(dt);
  jzbFallen(dt); jzbFxSchritt(dt); jzbGaeste(dt); jzbExtrasSchritt(dt); jzbBesuchSchritt(dt);
}
// 🍂 Herbst
function jzbHerbst(dt) {
  const J = JZB;
  if (J.phase === "fallen") {
    if ((J.spawn -= dt) <= 0 && J.flug.length < 12) { J.spawn = jzbZ(.45, 1.1); J.flug.push(jzbNeuesTeil("blatt")); }
    if (J.liegt.length >= Math.max(22, Math.round(J.w / 10))) { // 2.259.0: im Wechsel Wind / Twinkey mit Besen · 2.328.0: + Mann mit Laubbläser
      const w = J.extra === "blaeser" ? 2 : J.lauf % 3; if (w === 1) jzbBesuchStart("fegen"); else if (w === 2) jzbBlaeserStart(); else jzbWindStart(); }
  } else if (J.phase === "blasen") {
    if (!J.blaeser && J.liegt.length) jzbWindStart(); // falls doch noch etwas liegt: der Wind holt den Rest
    else if (!J.blaeser && !J.liegt.length && !J.fx.length) { if ((J.spawn -= dt) < -1.5) jzbLaufEnde(); }
  } else if (J.phase === "besuch") {
    if (!J.besuch && !J.liegt.length && !J.fx.length) { if ((J.spawn -= dt) < -1.5) jzbLaufEnde(); }
  } else if (J.phase === "wind") {
    const W = J.wind;
    for (const b of J.liegt) if (jzbHinterFront(b.x + W.dir * jzbZ(0, 30))) {
      J.fx.push({ typ: "blatt", x: b.x, y: J.h - b.yb, s: b.s, farbe: b.farbe, form: b.form, rot: b.rot, vr: jzbZ(-10, 10), vx: W.dir * jzbZ(150, 280), vy: -jzbZ(70, 190), ph: jzbZ(0, 6.3), fq: jzbZ(1, 2) });
      b.weg = true;
    }
    J.liegt = J.liegt.filter((b) => !b.weg);
    J.boden.forEach((v, i) => { if (v && jzbHinterFront(i * JZB_SP)) J.boden[i] = 0; });
    if (jzbWindVorbei() && !J.liegt.length && !J.fx.length) { if ((J.spawn -= dt) < -1.5) jzbLaufEnde(); }
  }
}
// ❄️ Winter: Schneedecke, Windstoß – oder jeder 3. Lauf ein Schneemann
function jzbWinter(dt) {
  const J = JZB, B = J.boden, n = B.length;
  const schneit = J.phase === "fallen" || J.phase === "bauen" || (J.phase === "stehen" && J.pt > 6);
  if (schneit && (J.spawn -= dt) <= 0 && J.flug.length < (J.phase === "fallen" ? 50 : 22)) { J.spawn = J.phase === "fallen" ? jzbZ(.07, .18) : jzbZ(.2, .45); J.flug.push(jzbNeuesTeil("flocke")); }
  if ((J.glatt = (J.glatt || 0) + dt) > .1) { // Schnee rutscht ein wenig – weiche Verwehungen statt Zacken
    J.glatt = 0;
    for (let i = 1; i < n - 1; i++) { const d = B[i] - (B[i - 1] + B[i + 1]) / 2; if (d > 1.2) { B[i] -= d * .3; B[i - 1] += d * .15; B[i + 1] += d * .15; } }
  }
  if (J.sonne) J.sonne.t += dt;
  const innen = B.slice(Math.ceil(JZB_RAND / JZB_SP), Math.floor((J.w - JZB_RAND) / JZB_SP)), schnitt = innen.reduce((a, b) => a + b, 0) / Math.max(1, innen.length);
  if (J.phase === "fallen" && schnitt >= 9 * J.k) {
    if (J.lauf % 3 === 2) (Math.floor(J.lauf / 3) % 2 ? jzbIgluStart : jzbSchneemannStart)(); else if (J.lauf % 2) jzbBesuchStart("schippen"); else jzbWindStart(); // 2.320.0: abwechselnd Schneemann / Iglu
  } else if (J.phase === "bauen" || J.phase === "stehen") {
    if (J.phase === "bauen") { for (let i = 0; i < n; i++) B[i] -= B[i] * .07 * dt; if (J.pt >= 8) { jzbPhase("stehen"); jzbFunken(); } } // Schnee wird zum Schneemann gerollt
    else { for (let i = 0; i < n; i++) B[i] = Math.min(B[i], 9 * J.k); if (J.pt >= 50) { jzbSonneStart(); jzbPhase("schmelzen"); } }
  } else if (J.phase === "besuch") {
    if (!J.besuch && B.every((v) => v < .3) && !J.fx.length) { if ((J.spawn -= dt) < -1.5) jzbLaufEnde(); }
  } else if (J.phase === "schmelzen") {
    jzbSchmelzTropfen(dt);
    if (J.pt >= JZB_SONNE + JZB_SCHMELZ && J.iglu) { const I = J.iglu; J.iglu = null; jzbWindStart(6); J.wind.dir = I.x < J.w / 2 ? 1 : -1; } // 2.320.0: Iglu ist geschmolzen
    else if (J.pt >= JZB_SONNE + JZB_SCHMELZ) { // nur der Schal bleibt liegen – der Wind nimmt ihn mit
      const m = J.mann; J.mann = null; if (m) J.fx.push({ typ: "schal", x: m.x, y: J.h - 3, vx: 0, vy: 0, rot: 0, t: 0, a: 1 });
      jzbWindStart(6); if (m) J.wind.dir = m.x < J.w / 2 ? 1 : -1; // Wind weht zur freien Seite – der Schal fliegt quer über den Kopf
    }
  } else if (J.phase === "wind") {
    const W = J.wind;
    for (let i = 0; i < n; i++) if (B[i] > .05 && jzbHinterFront(i * JZB_SP)) {
      const ab = Math.min(B[i], 70 * dt); B[i] -= ab;
      if (J.fx.length < 170 && Math.random() < ab * .45) J.fx.push({ typ: "flocke", x: i * JZB_SP, y: J.h - B[i] - 1, r: jzbZ(.8, 2.2), vx: W.dir * jzbZ(160, 320), vy: -jzbZ(15, 80), a: 1 });
    }
    if (jzbWindVorbei() && B.every((v) => v < .3) && !J.fx.length) { if ((J.spawn -= dt) < -1.5) jzbLaufEnde(); }
  }
}
// ☀️ 2.277.0 KC-CLUB-SCHNEEMANN-SONNE (Wunsch Hansi): nach einer Weile kommt von links eine strahlende Sonne und steigt ein Stück über den
// Schneemann – er schmilzt, nur sein weinroter Schal bleibt liegen; der Wind wirbelt ihn dann mit dem Schnee davon.
const JZB_SONNE = 2.6, JZB_SCHMELZ = 6.5; // Sekunden: Sonne geht auf, dann schmilzt der Schneemann
function jzbSonneStart() {
  const J = JZB, m = J.mann || J.iglu, k = J.k; if (!m) return; // 2.320.0: auch über dem Iglu
  J.sonne = { t: 0, zx: Math.max(18 * k, m.x - 26 * k), zy: Math.max(18 * k, J.h - 84 * k) };
}
function jzbSonneMalen(c) {
  const J = JZB, S = J.sonne; if (!S) return;
  const k = J.k, ein = jzbEase(S.t / JZB_SONNE), aus = J.phase === "wind" && J.wind ? Math.min(1, J.wind.t / 2.2) : 0; if (aus >= 1) return;
  const x = -30 * k + (S.zx + 30 * k) * ein, y = S.zy + 30 * k * (1 - ein), r = 12 * k;
  c.save(); c.globalAlpha = 1 - aus;
  const glut = c.createRadialGradient(x, y, r * .5, x, y, r * 3.4); glut.addColorStop(0, "rgba(255,222,100,.55)"); glut.addColorStop(1, "rgba(255,222,100,0)");
  c.fillStyle = glut; c.beginPath(); c.arc(x, y, r * 3.4, 0, 7); c.fill();
  c.strokeStyle = "#ffd54a"; c.lineCap = "round"; c.lineWidth = 2.2 * k;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + J.T * .5, l = r * (.5 + .22 * Math.sin(J.T * 4 + i * 1.7));
    c.beginPath(); c.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); c.lineTo(x + Math.cos(a) * (r * 1.25 + l), y + Math.sin(a) * (r * 1.25 + l)); c.stroke(); }
  const g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r); g.addColorStop(0, "#fff7b8"); g.addColorStop(.6, "#ffd23a"); g.addColorStop(1, "#f5a300");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = "#b86e00"; c.lineWidth = 1.2 * k; // freundliches Gesicht
  for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * .33, y - r * .12, r * .13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  c.beginPath(); c.arc(x, y + r * .1, r * .42, Math.PI * .2, Math.PI * .8); c.stroke();
  c.restore();
}
// fliegender bzw. liegender Schal: weinrotes Band mit Goldstreifen und Fransen
function jzbTropfenMalen(c, p) { // blauer Wassertropfen mit heller Spur und Glanzpunkt
  const s = p.s;
  if (p.spur > .5) { const g = c.createLinearGradient(p.x, p.y - p.spur, p.x, p.y); g.addColorStop(0, "rgba(140,200,255,0)"); g.addColorStop(1, "rgba(120,190,255,.7)");
    c.strokeStyle = g; c.lineWidth = s * .9; c.lineCap = "round"; c.beginPath(); c.moveTo(p.x, p.y - p.spur); c.lineTo(p.x, p.y); c.stroke(); }
  c.fillStyle = "#4aa3f0"; c.beginPath(); c.moveTo(p.x, p.y - s * 2.2); c.quadraticCurveTo(p.x + s * 1.1, p.y - s * .2, p.x, p.y + s); c.quadraticCurveTo(p.x - s * 1.1, p.y - s * .2, p.x, p.y - s * 2.2); c.fill();
  c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(p.x - s * .3, p.y - s * .3, s * .3, 0, 7); c.fill();
}
function jzbSchalMalen(c, x, y, rot, t, flug) {
  const k = JZB.k, L = 42 * k, w = 3.1 * k, n = 14, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([(u - .5) * L, Math.sin(u * 6.5 + t * (flug ? 9 : 0)) * (flug ? 3.6 : .9) * k]); }
  c.save(); c.translate(x, y); c.rotate(rot); c.lineCap = "round"; c.lineJoin = "round";
  const band = () => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); };
  c.strokeStyle = "rgba(255,244,228,.9)"; c.lineWidth = w * 2 + 2.4 * k; band(); // heller Rand – sonst verschwindet Weinrot auf dem weinroten Kopf
  c.strokeStyle = "#a31d33"; c.lineWidth = w * 2; band();
  c.strokeStyle = "#d4a017"; c.lineWidth = 1.2 * k; c.lineCap = "butt";
  for (const i of [2, 3, n - 3, n - 2]) { const [px, py] = pts[i]; c.beginPath(); c.moveTo(px, py - w); c.lineTo(px, py + w); c.stroke(); }
  c.strokeStyle = "#d4a017"; c.lineWidth = .8 * k;
  for (const e of [0, n]) { const [px, py] = pts[e], sg = e ? 1 : -1; for (let f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(px, py + f * w * .6); c.lineTo(px + sg * 2.6 * k, py + f * w * .9); c.stroke(); } }
  c.restore();
}
// 💧 2.280.0 (Wunsch Hansi „beim Schmelzen ein paar blaue Wassertropfen fließen lassen“): Tropfen lösen sich am Rand der Kugeln,
// rinnen mit einer kurzen Wasserspur am Schneemann herunter und laufen in die Pfütze
function jzbSchmelzTropfen(dt) {
  const J = JZB, m = J.mann, k = J.k, s = jzbEase((J.pt - JZB_SONNE) / JZB_SCHMELZ); if (!m || s <= 0 || s > .95) return;
  if ((J.tropfUhr = (J.tropfUhr || 0) - dt) > 0) return; J.tropfUhr = jzbZ(.04, .11);
  const gy = J.h - 1, kug = [[15, .9 * 15], [11, .9 * 15 + .78 * 15 + .82 * 11], [8.5, .9 * 15 + .78 * 15 + .82 * 11 + .78 * 11 + .85 * 8.5]]; // Radius, Höhe der Mitte (wie beim Malen)
  const [r, h] = kug[Math.random() < .5 ? 0 : Math.random() < .65 ? 1 : 2], seite = Math.random() < .5 ? -1 : 1, a = jzbZ(-.5, .35);
  const x = m.x + seite * Math.cos(a) * r * k * (1 + .3 * s), y = gy - (h + Math.sin(a) * r) * k * (1 - .92 * s);
  J.fx.push({ typ: "schmelz", x, y, x0: x, v: jzbZ(8, 18), s: jzbZ(1.8, 2.7) * k, spur: 0, a: 1, ph: jzbZ(0, 6.3) });
}
function jzbSchneemannStart() {
  const J = JZB, links = Math.floor(J.lauf / 6) % 2 === 0, r = 24 * J.k; // 2.320.0: /6 – Schneemann und Iglu wechseln sich ab, die Seite wechselt trotzdem
  J.mann = { x: links ? JZB_RAND + r + 8 : J.w - JZB_RAND - r - 8, blick: links ? 1 : -1, muetze: J.art === "advent" ? "weihnacht" : "koch" };
  jzbPhase("bauen");
}
function jzbFunken() {
  const J = JZB, m = J.mann; if (!m) return;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; J.fx.push({ typ: "funke", x: m.x + Math.cos(a) * 10, y: J.h - 52 * J.k + Math.sin(a) * 10, vx: Math.cos(a) * jzbZ(25, 55), vy: Math.sin(a) * jzbZ(25, 55), s: jzbZ(2, 3.5), a: 1, farbe: i % 2 ? "#fff6c2" : "#ffffff" }); }
}
// 🌱 Frühling / 🌻 Sommer: Beet anlegen
function jzbPflanzen() {
  const J = JZB, k = J.k, sommer = J.saison === "sommer";
  J.halme = [];
  for (let x = JZB_RAND - 6; x < J.w - JZB_RAND + 6; x += jzbZ(2.6, 4.2))
    J.halme.push({ x, z: (sommer ? jzbZ(4, 10) : jzbZ(5, 14)) * k, v: jzbZ(0, 7), f: sommer ? jzbW(["#7aa83a", "#8db63c", "#a3b84a", "#6f9e35"]) : jzbW(JZB_GRUEN), n: jzbZ(-.25, .25), b: jzbZ(1.3, 2.1) });
  if (sommer) {
    const drei = J.lauf % 3 === 2, hoch = Math.max(28, Math.min(105, J.h * .52));
    const plaetze = drei ? [[.64, .78], [.78, 1], [.91, .62]] : [[.84, 1]];
    J.blumen = plaetze.map(([p, f], i) => ({ typ: "sonnenblume", x: Math.min(J.w - 30, J.w * p), H: hoch * f, s: (.8 + .2 * f) * k, t0: i * 1.5, ab: [] }));
  } else {
    const n = Math.max(4, Math.round(J.w / 48)), arten = ["gaensebluemchen", "tulpe", "krokus", "loewenzahn"];
    J.blumen = Array.from({ length: n }, (_, i) => ({ typ: arten[(i + J.lauf) % arten.length], x: JZB_RAND + 10 + (i + jzbZ(.15, .85)) * (J.w - 2 * JZB_RAND - 20) / n, z: jzbZ(12, 24) * k, t0: 7 + jzbZ(0, 12), farbe: jzbW(["#e63946", "#ff7aa2", "#f4a261", "#ffd166"]) }));
  }
}
function jzbBeet(dt) {
  const J = JZB, sommer = J.saison === "sommer";
  if (J.phase === "wachsen") {
    if (!sommer && (J.spawn -= dt) <= 0 && J.flug.length < 6) { J.spawn = jzbZ(1.2, 2.8); J.flug.push(jzbNeuesTeil("bluete")); }
    if (!J.gaeste.some((g) => g.typ === "falter") && J.pt > 10 && Math.random() < dt / 14) J.gaeste.push(jzbFalter());
    if (!sommer && J.lauf % 3 === 2 && J.pt > 16 && !J.hase) { J.hase = true; J.gaeste.push({ typ: "hase", x: J.w + 24, t: 0 }); }
    if (sommer && J.pt > 15 && !J.gaeste.some((g) => g.typ === "biene" || g.typ === "gluehwurm")) {
      if (typeof istNacht === "function" && istNacht()) for (let i = 0; i < 7; i++) J.gaeste.push({ typ: "gluehwurm", x: jzbZ(20, J.w - 20), y: jzbZ(J.h * .35, J.h - 12), vx: jzbZ(-12, 12), vy: jzbZ(-8, 8), ph: jzbZ(0, 6.3) });
      else J.gaeste.push({ typ: "biene", t: 0, b: 0 });
    }
    if (!J.gegossen && J.pt > (sommer ? 28 : 34)) { J.gegossen = true; jzbBesuchStart("giessen"); } // 2.259.0: Twinkey gießt
    if (sommer && J.pt > JZB_BLUEHT) for (const f of J.blumen) { // Spätsommer: die Blütenblätter fallen eins nach dem anderen
      const soll = Math.floor((J.pt - JZB_BLUEHT - f.t0 * .3) * 2.6);
      while (f.ab.length < Math.min(16, soll)) {
        const i = jzbBlattNr(f), kopf = jzbSonnenKopf(f), a = i / 16 * Math.PI * 2 + .1, rr = 12 * f.s;
        f.ab.push(i); J.fx.push({ typ: "bluetenblatt", x: kopf.x + Math.cos(a) * rr, y: kopf.y + Math.sin(a) * rr, s: 4.5 * f.s, rot: a, vr: jzbZ(-3, 3), vx: jzbZ(-10, 10), vy: jzbZ(5, 15), farbe: i % 2 ? "#f2b705" : "#f7c51e" });
      }
    }
    if (J.pt >= JZB_BLUEHT + (sommer ? 8 : 0)) {
      J.gaeste = J.gaeste.filter((g) => g.typ !== "biene" && g.typ !== "gluehwurm"); J.hase = false;
      if (!sommer) for (const f of J.blumen) for (let i = 0; i < 5; i++) J.fx.push({ typ: "bluetenblatt", x: f.x, y: J.h - f.z, s: 2.6 * J.k, rot: jzbZ(0, 6.3), vr: jzbZ(-6, 6), vx: 0, vy: -jzbZ(10, 40), farbe: f.typ === "tulpe" ? f.farbe : f.typ === "krokus" ? "#b58ae6" : f.typ === "loewenzahn" ? "#ffd23f" : "#ffffff" });
      jzbWindStart(3.6);
    }
  } else if (J.phase === "wind") {
    J.welk = jzbEase(J.wind.t / J.wind.dauer);
    if (jzbWindVorbei() && !J.fx.length) { if ((J.spawn -= dt) < -1.2) jzbLaufEnde(); }
  }
}
function jzbBlattNr(f) { for (;;) { const i = Math.floor(Math.random() * 16); if (!f.ab.includes(i)) return i; } }
function jzbFalter() {
  const J = JZB, dir = Math.random() < .5 ? 1 : -1;
  return { typ: "falter", dir, x: dir > 0 ? -16 : J.w + 16, y0: jzbZ(J.h * .25, J.h * .75), t: 0, v: jzbZ(26, 40), farbe: jzbW([["#f6c445", "#e09f1f"], ["#ff8fb1", "#e0577f"], ["#8ecae6", "#3a8fc0"], ["#ffffff", "#c9c9c9"]]) };
}
function jzbGaeste(dt) {
  const J = JZB;
  for (const g of J.gaeste) {
    g.t = (g.t || 0) + dt;
    if (g.typ === "falter") { g.x += g.dir * g.v * dt; g.y = g.y0 + Math.sin(g.t * 1.7) * 12 + Math.sin(g.t * 4.3) * 4; if (g.x < -30 || g.x > J.w + 30) g.weg = true; }
    else if (g.typ === "osterhase") { const z = g.t % 1; if (z < .55) g.x -= 42 * J.k * dt; g.y = J.h - 1 - (z < .55 ? Math.sin(z / .55 * Math.PI) * 11 * J.k : 0);
      for (const e of J.eier || []) if (e.da === false && g.x < e.x) e.da = true; if (g.x < -30) { g.weg = true; for (const e of J.eier || []) e.da = true; } }
    else if (g.typ === "hase") { const z = g.t % .8; if (z < .55) g.x -= 70 * J.k * dt; g.y = J.h - 1 - (z < .55 ? Math.sin(z / .55 * Math.PI) * 15 * J.k : 0); if (g.x < -30) g.weg = true; }
    else if (g.typ === "gluehwurm") { g.ph += dt; g.vx += jzbZ(-20, 20) * dt; g.vy += jzbZ(-20, 20) * dt; g.vx *= .98; g.vy *= .98; g.x = Math.max(8, Math.min(J.w - 8, g.x + g.vx * dt)); g.y = Math.max(J.h * .2, Math.min(J.h - 8, g.y + g.vy * dt)); }
  }
  J.gaeste = J.gaeste.filter((g) => !g.weg);
}

// ---------- Zeichnen ----------
function jzbMalen() {
  const J = JZB, c = J.ctx; if (!c || !J.w) return;
  c.clearRect(0, 0, J.w, J.h);
  jzbExtrasHinten(c); // Ostereier – das Gras wächst darüber
  if (J.fest) jzbFestMalen(c); // 2.331.0 KC-CLUB-THEMEN-BUEHNE
  if (J.saison === "winter") jzbSonneMalen(c); // 2.277.0: hinter Schnee und Schneemann
  if (J.saison === "fruehling" || J.saison === "sommer") jzbBeetMalen(c);
  if (J.saison === "winter") jzbSchneeMalen(c);
  for (const b of J.liegt) { const w = b.wackel ? Math.sin(J.T * 30) * .5 * b.wackel : 0; jzbBlatt(c, b.x, J.h - b.yb - Math.abs(w) * 3, b.s, b.rot + w, 1, .65, b.farbe, b.form); } // raschelt beim Igel
  if (J.iglu) jzbIgluMalen(c); // 2.320.0 KC-CLUB-WINTER-IGLU – vor den Figuren (die laufen davor)
  jzbExtrasBoden(c);
  if (J.mann) jzbSchneemannMalen(c);
  jzbTwinkeyMalen(c);
  for (const g of J.gaeste) jzbGastMalen(c, g);
  const flocken = [];
  for (const p of [...J.flug, ...J.fx]) {
    c.globalAlpha = Math.max(0, Math.min(1, p.a ?? 1));
    if (p.typ === "flocke") { if (p.a === undefined || p.a >= 1) flocken.push(p); else { c.fillStyle = "#fff"; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } }
    else if (p.typ === "blatt") jzbBlatt(c, p.x, p.y, p.s, p.rot, p.liegt ? 1 : Math.cos(p.ph * 1.3), p.liegt ? .55 : 1, p.farbe, p.form);
    else if (p.typ === "bluete" || p.typ === "bluetenblatt") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.farbe; c.beginPath(); c.ellipse(0, 0, p.s, p.s * (p.typ === "bluete" ? .7 : .35), 0, 0, 7); c.fill(); c.restore(); }
    else if (p.typ === "funke") jzbStern(c, p.x, p.y, p.s, p.farbe);
    else if (p.typ === "scherbe") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = "#e3f5ff"; c.strokeStyle = "rgba(60,140,210,.9)"; c.lineWidth = .8;
      c.beginPath(); c.moveTo(-p.s, -p.s * .35); c.lineTo(p.s * .85, -p.s * .7); c.lineTo(p.s * .3, p.s * .85); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    else if (p.typ === "nuss") jzbEichelMalen(c, p.x, p.y, p.nuss, p.rot, J.k, p.s);
    else if (p.typ === "pilz") jzbPilzMalen(c, p.x, p.y, p.art, p.rot, J.k, p.s, 1); // 2.389.0
    else if (p.typ === "schal") jzbSchalMalen(c, p.x, p.y, p.rot, p.t, !!p.los);
    else if (p.typ === "schmelz") jzbTropfenMalen(c, p);
    else if (p.typ === "wasser") { c.fillStyle = "rgba(120,190,255,.95)"; c.beginPath(); c.ellipse(p.x, p.y, 1.1, 1.8, 0, 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
  if (flocken.length) { c.fillStyle = "rgba(255,255,255,.92)"; c.beginPath(); for (const f of flocken) { c.moveTo(f.x + f.r, f.y); c.arc(f.x, f.y, f.r, 0, 7); } c.fill(); }
  jzbRegenMalen(c);
  const W = J.wind;
  if (W) {
    c.lineCap = "round";
    for (const s of W.striche) { c.lineWidth = s.a > .6 ? 2.4 : 1.7;
      c.strokeStyle = `rgba(255,255,255,${s.a})`; c.beginPath(); c.moveTo(s.x, s.y);
      c.quadraticCurveTo(s.x - W.dir * s.l * .5, s.y - 7 * Math.sin(J.T * 6 + s.ph), s.x - W.dir * s.l, s.y + 2); c.stroke();
    }
  }
}
function jzbBlatt(c, x, y, s, rot, sx, sy, farbe, form) {
  c.save(); c.translate(x, y); c.scale(1, sy); c.rotate(rot); c.scale(Math.abs(sx) < .15 ? .15 * Math.sign(sx || 1) : sx, 1);
  c.fillStyle = farbe; c.beginPath();
  if (form) for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .5 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } // Ahorn
  else { c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * .8, s, 0); c.quadraticCurveTo(0, s * .8, -s, 0); }
  c.closePath(); c.fill();
  c.strokeStyle = "rgba(90,40,10,.45)"; c.lineWidth = .8; c.beginPath();
  if (form) { c.moveTo(0, s * 1.05); c.lineTo(0, -s * .6); } else { c.moveTo(-s * 1.3, 0); c.lineTo(s * .7, 0); }
  c.stroke(); c.restore();
}
function jzbStern(c, x, y, s, farbe) {
  c.fillStyle = farbe; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .35 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath(); c.fill();
}
function jzbSchneeMalen(c) {
  const J = JZB, B = J.boden; if (!B.some((v) => v > .3)) return;
  c.beginPath(); c.moveTo(0, J.h + 2);
  B.forEach((v, i) => c.lineTo(i * JZB_SP, J.h - v));
  c.lineTo(J.w, J.h + 2); c.closePath();
  const g = c.createLinearGradient(0, J.h - 16, 0, J.h); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d3e1f0");
  c.fillStyle = g; c.fill(); c.strokeStyle = "rgba(190,210,235,.7)"; c.lineWidth = 1; c.stroke();
}
function jzbKugel(c, x, y, r) {
  if (r <= .3) return;
  const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(.7, "#f1f5fa"); g.addColorStop(1, "#c9d7e6");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
// ⛄ Der Schneemann: drei Kugeln rollen sich zusammen, dann Gesicht (lachend), Karottennase, Knöpfe, Arme, weinroter Schal, Mütze
function jzbSchneemannMalen(c) {
  const J = JZB, m = J.mann, k = J.k, t = J.pt, ph = J.phase, x = m.x, gy = J.h - 1 - Math.min(jzbBodenH(x), 6 * k) * .5;
  const bau = ph === "bauen" ? t : 99, g1 = jzbEase(bau / 2.2), g2 = jzbEase((bau - 2.2) / 1.8), g3 = jzbEase((bau - 4) / 1.6);
  const teil = (i) => jzbHopp((bau - 5.6 - i * .3) / .5);
  const schmelz = ph === "schmelzen" ? jzbEase((t - JZB_SONNE) / JZB_SCHMELZ) : 0, lachen = ph === "stehen" && t % 4 < 1.3;
  const r1 = 15 * k * g1, r2 = 11 * k * g2, r3 = 8.5 * k * g3;
  const y1 = gy - r1 * .9, y2 = y1 - r1 * .78 - r2 * .82, hy = y2 - r2 * .78 - r3 * .85 + (lachen ? Math.sin(J.T * 18) * .8 : 0);
  c.save();
  if (schmelz) { // Pfütze und zusammensackender Schneemann
    c.fillStyle = `rgba(200,225,255,${.55 * (1 - schmelz * .6)})`; c.beginPath(); c.ellipse(x, gy, 15 * k * (1 + .7 * schmelz), 2.6 * k, 0, 0, 7); c.fill();
    c.translate(x, gy); c.scale(1 + .3 * schmelz, 1 - .92 * schmelz); c.translate(-x, -gy); c.globalAlpha = 1 - schmelz * .75;
  }
  c.lineCap = "round"; c.strokeStyle = "#6b4a2b";
  const arm = (seite, winkel, a) => { // Stockarme mit zwei Zweigen
    if (a <= 0) return; const sx = x + seite * r2 * .8, sy = y2 - r2 * .15, l = 15 * k * a, ex = sx + Math.cos(winkel) * l, ey = sy + Math.sin(winkel) * l;
    c.lineWidth = 1.8 * k; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey);
    for (const d of [-.6, .6]) { c.moveTo(ex - Math.cos(winkel) * l * .2, ey - Math.sin(winkel) * l * .2); c.lineTo(ex + Math.cos(winkel + d) * l * .28, ey + Math.sin(winkel + d) * l * .28); }
    c.stroke();
  };
  if (g3 >= 1) { const winken = ph === "stehen" ? Math.sin(J.T * 5) * .35 : 0; arm(-m.blick, m.blick > 0 ? Math.PI + .45 : -.45, teil(4)); arm(m.blick, (m.blick > 0 ? -.55 : Math.PI + .55) + winken * m.blick, teil(4)); }
  jzbKugel(c, x, y1, r1); jzbKugel(c, x, y2, r2);
  c.fillStyle = "#2b2b2b"; const kn = teil(3);
  if (kn > 0) for (const [kx, ky] of [[x, y2 - r2 * .25], [x, y2 + r2 * .3], [x, y1 - r1 * .4]]) { c.beginPath(); c.arc(kx, ky, 1.6 * k * kn, 0, 7); c.fill(); }
  jzbKugel(c, x, hy, r3);
  if (g3 >= 1) {
    const sc = teil(5), hals = y2 - r2 * .8; // Schal in Clubfarbe Weinrot mit Goldstreifen
    if (sc > 0 && !schmelz) {
      c.fillStyle = "#d4a017"; c.beginPath(); c.ellipse(x, hals, r2 * .85 * sc, 3 * k * sc, 0, 0, 7); c.fill();
      const ex = x - m.blick * r2 * .35, wehen = (J.wind ? J.wind.dir * J.wind.st : Math.sin(J.T * 1.3) * .15) * .4;
      c.save(); c.translate(ex, hals); c.rotate(wehen); c.fillRect(-2.2 * k, 0, 4.4 * k, 11 * k * sc);
      c.fillStyle = "#1a1500"; for (const f of [.35, .65]) c.fillRect(-2.2 * k, 11 * k * sc * f, 4.4 * k, 1.2 * k); c.restore();
    }
    const au = teil(0);
    if (au > 0) { // lachende Augen (∩ ∩) und rote Bäckchen
      c.strokeStyle = "#2b2b2b"; c.lineWidth = 1.5 * k * au;
      for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r3 * .36, hy - r3 * .15, r3 * .17, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      c.fillStyle = `rgba(255,110,130,${.45 * au})`; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r3 * .58, hy + r3 * .14, r3 * .16, 0, 7); c.fill(); }
    }
    const mu = teil(2);
    if (mu > 0) { // weit offener, lachender Mund mit Zunge
      const mw = r3 * .44 * mu, mh = r3 * .36 * mu * (lachen ? .7 + .3 * Math.abs(Math.sin(J.T * 14)) : .85), my = hy + r3 * .3;
      c.fillStyle = "#7a1426"; c.beginPath(); c.moveTo(x - mw, my); c.ellipse(x, my, mw, mh, 0, 0, Math.PI); c.closePath(); c.fill();
      c.save(); c.clip(); c.fillStyle = "#e8707e"; c.beginPath(); c.ellipse(x, my + mh * .95, mw * .55, mh * .5, 0, 0, 7); c.fill(); c.restore();
    }
    const na = teil(1);
    if (na > 0) { c.fillStyle = "#f08a24"; c.beginPath(); c.moveTo(x + m.blick * r3 * .05, hy - r3 * .08); c.lineTo(x + m.blick * (r3 * .1 + r3 * .95 * na), hy + r3 * .02); c.lineTo(x + m.blick * r3 * .05, hy + r3 * .14); c.closePath(); c.fill(); }
    const hu = teil(6);
    if (hu > 0) {
      c.save(); c.translate(x, hy - r3 * .82); c.scale(hu * k, hu * k);
      if (m.muetze === "weihnacht") { // Weihnachtsmütze
        c.fillStyle = "#c62828"; c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-2, -14, 9 * m.blick, -11); c.quadraticCurveTo(4, -5, 8, 0); c.closePath(); c.fill();
        c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, 0, 9, 2.6, 0, 0, 7); c.fill(); c.beginPath(); c.arc(9 * m.blick, -11, 2.6, 0, 7); c.fill();
      } else { // Zylinder wie ein Dirigent – mit Goldband (Bachkreis)
        c.fillStyle = "#16130a"; c.beginPath(); c.ellipse(0, 0, 9, 2.4, 0, 0, 7); c.fill();
        c.fillRect(-5.6, -13, 11.2, 13); c.beginPath(); c.ellipse(0, -13, 5.6, 1.6, 0, 0, 7); c.fill();
        c.fillStyle = "#d4a017"; c.fillRect(-5.6, -4.2, 11.2, 2.2);
        c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-4.4, -12, 1.6, 7.5);
      }
      c.restore();
    }
  }
  c.restore();
  if (schmelz) { // 2.277.0: der Schal schmilzt nicht – er sinkt mit und legt sich flach in die Pfütze
    const hals = y2 - r2 * .8, sy = Math.min(J.h - 3, gy + (hals - gy) * (1 - .92 * schmelz));
    if (schmelz < .85) {
      c.fillStyle = "#d4a017"; c.beginPath(); c.ellipse(x, sy, r2 * .85 * (1 + .5 * schmelz), 3 * k * (1 - .4 * schmelz), 0, 0, 7); c.fill();
      c.save(); c.translate(x - m.blick * r2 * .35, sy); c.rotate(-m.blick * schmelz * 1.5); c.fillRect(-2.2 * k, 0, 4.4 * k, 11 * k);
      c.fillStyle = "#1a1500"; for (const f of [.35, .65]) c.fillRect(-2.2 * k, 11 * k * f, 4.4 * k, 1.2 * k); c.restore();
    } else jzbSchalMalen(c, x, J.h - 3, 0, 0, false);
  }
}
function jzbHalmWinkel(x, n) { const W = JZB.wind; return n + Math.sin(JZB.T * 1.5 + x * .045) * .1 + (W ? W.dir * W.st * .7 : 0); }
function jzbBeetMalen(c) {
  const J = JZB, t = J.phase === "wachsen" ? J.pt : 99, welk = 1 - J.welk, k = J.k;
  c.lineCap = "round";
  for (const g of J.halme) {
    const hz = g.z * jzbEase((t - g.v) / 9) * welk; if (hz < .5) continue;
    const a = jzbHalmWinkel(g.x, g.n);
    c.strokeStyle = g.f; c.lineWidth = g.b; c.beginPath(); c.moveTo(g.x, J.h + 1);
    c.quadraticCurveTo(g.x + Math.sin(a) * hz * .2, J.h - hz * .55, g.x + Math.sin(a) * hz, J.h - Math.cos(a) * hz); c.stroke();
  }
  for (const f of J.blumen) {
    if (f.typ === "sonnenblume") { jzbSonnenblume(c, f, t, welk); continue; }
    const hz = f.z * jzbEase((t - f.t0) / 2.2) * welk; if (hz < .5) continue;
    const a = jzbHalmWinkel(f.x, 0) * .7, tx = f.x + Math.sin(a) * hz, ty = J.h - Math.cos(a) * hz;
    c.strokeStyle = "#4f8a2b"; c.lineWidth = 1.4 * k; c.beginPath(); c.moveTo(f.x, J.h + 1); c.quadraticCurveTo(f.x + Math.sin(a) * hz * .3, J.h - hz * .5, tx, ty); c.stroke();
    const bl = jzbHopp((t - f.t0 - 2) / 1.2) * welk; if (bl <= 0) continue;
    c.save(); c.translate(tx, ty); c.rotate(a * .6); c.scale(bl * k, bl * k);
    if (f.typ === "gaensebluemchen" || f.typ === "loewenzahn") {
      const lz = f.typ === "loewenzahn", n = lz ? 16 : 10;
      c.fillStyle = lz ? "#ffd23f" : "#ffffff";
      for (let i = 0; i < n; i++) { c.save(); c.translate(0, -2); c.rotate(i / n * Math.PI * 2); c.beginPath(); c.ellipse(lz ? 2.6 : 3, 0, lz ? 2.4 : 2.6, lz ? .7 : 1.1, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = lz ? "#f2a900" : "#ffcf33"; c.beginPath(); c.arc(0, -2, lz ? 1.8 : 1.6, 0, 7); c.fill();
    } else { // Tulpe / Krokus: Kelch
      const krokus = f.typ === "krokus", br = krokus ? 2.9 : 3.8;
      c.fillStyle = krokus ? "#9b6bd6" : f.farbe; c.beginPath(); c.moveTo(-br, -6); c.quadraticCurveTo(-br - .2, 0, 0, 0); c.quadraticCurveTo(br + .2, 0, br, -6);
      c.lineTo(br * .6, -3.6); c.lineTo(br * .32, -7.4); c.lineTo(0, -4.2); c.lineTo(-br * .32, -7.4); c.lineTo(-br * .6, -3.6); c.closePath(); c.fill();
      c.strokeStyle = krokus ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.15)"; c.lineWidth = .6; c.beginPath(); c.moveTo(0, -.5); c.lineTo(0, -4); c.stroke();
    }
    c.restore();
  }
}
function jzbSonnenKopf(f) {
  const J = JZB, t = J.phase === "wachsen" ? J.pt : 99, hz = f.H * jzbEase((t - f.t0) / 9) * (1 - J.welk), a = jzbHalmWinkel(f.x, 0) * .35;
  return { x: f.x + Math.sin(a) * hz, y: J.h - Math.cos(a) * hz, hz, a };
}
// 🌻 Sonnenblume: Stiel wächst, zwei Blätter, Knospe – dann geht die Blüte auf und wiegt sich leicht
function jzbSonnenblume(c, f, t, welk) {
  const J = JZB, s = f.s, { x: kx, y: ky, hz, a } = jzbSonnenKopf(f); if (hz < .5) return;
  c.strokeStyle = "#4f8a2b"; c.lineWidth = 2.6 * s; c.beginPath(); c.moveTo(f.x, J.h + 1); c.quadraticCurveTo(f.x + Math.sin(a) * hz * .3 + 2, J.h - hz * .5, kx, ky); c.stroke();
  for (const [anteil, seite] of [[.35, -1], [.6, 1]]) {
    const gr = jzbEase((hz / f.H - anteil) * 6) * welk; if (gr <= 0) continue;
    const bx = f.x + (kx - f.x) * anteil, by = J.h - hz * anteil, L = 9 * s * gr;
    c.save(); c.translate(bx, by); c.rotate(seite * -.9 + a); c.fillStyle = "#5c9a33"; c.beginPath(); c.ellipse(seite * L * .85, 0, L, L * .42, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(30,70,20,.5)"; c.lineWidth = .7; c.beginPath(); c.moveTo(0, 0); c.lineTo(seite * L * 1.6, 0); c.stroke(); c.restore();
  }
  const auf = jzbHopp((t - f.t0 - 9) / 2.5) * welk, rk = 6 * s;
  c.save(); c.translate(kx, ky); c.scale(.86 + .14 * Math.cos(J.T * .35 + f.x), 1);
  if (auf <= 0) { c.fillStyle = "#5c9a33"; c.beginPath(); c.arc(0, 0, 3.2 * s * jzbEase((t - f.t0 - 6) / 3), 0, 7); c.fill(); c.restore(); return; }
  for (let i = 0; i < 16; i++) {
    if (f.ab.includes(i)) continue;
    const w = i / 16 * Math.PI * 2 + .1, pl = 9 * s * auf;
    c.save(); c.rotate(w); c.fillStyle = i % 2 ? "#f2b705" : "#f7c51e"; c.beginPath(); c.ellipse(rk + pl * .5, 0, pl * .5, pl * .19, 0, 0, 7); c.fill(); c.restore();
  }
  const g = c.createRadialGradient(-rk * .3, -rk * .3, rk * .1, 0, 0, rk); g.addColorStop(0, "#7a5230"); g.addColorStop(1, "#3b2412");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rk * Math.max(.4, auf), 0, 7); c.fill();
  c.fillStyle = "rgba(200,150,80,.55)";
  for (let i = 0; i < 13; i++) { const w = i * 2.4, r = Math.sqrt(i / 13) * rk * .8 * auf; c.beginPath(); c.arc(Math.cos(w) * r, Math.sin(w) * r, .7 * s, 0, 7); c.fill(); }
  c.restore();
}
function jzbGastMalen(c, g) {
  const J = JZB, k = J.k;
  if (g.typ === "falter") {
    const f = .15 + .85 * Math.abs(Math.sin(g.t * 13));
    c.save(); c.translate(g.x, g.y); c.scale(k, k);
    for (const s of [-1, 1]) { c.save(); c.scale(s * f, 1); c.fillStyle = g.farbe[0]; c.beginPath(); c.ellipse(3.6, -2.4, 3.6, 3, -.4, 0, 7); c.fill(); c.fillStyle = g.farbe[1]; c.beginPath(); c.ellipse(2.6, 2.2, 2.4, 2, .4, 0, 7); c.fill(); c.restore(); }
    c.strokeStyle = "#3a2a1a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, 4); c.stroke(); c.restore();
  } else if (g.typ === "hase" || g.typ === "biene" || g.typ === "osterhase") {
    let x = g.x, y = g.y, gr = 20 * k, spiegel = 1;
    if (g.typ === "biene") { // fliegt Achten um die (erste) Sonnenblume
      const f = J.blumen[0]; if (!f) return; const kopf = jzbSonnenKopf(f), r = 20 * f.s;
      x = kopf.x + Math.cos(g.t * 1.3) * r + Math.sin(g.t * 3.1) * 3; y = kopf.y + Math.sin(g.t * 2.6) * r * .55;
      spiegel = -Math.sin(g.t * 1.3) > 0 ? -1 : 1; gr = 12 * k;
    }
    c.save(); c.translate(x, y); c.scale(spiegel, 1); c.font = `${gr}px ${JZB_EMOJI}`; c.textAlign = "center"; c.textBaseline = g.typ !== "biene" ? "bottom" : "middle"; c.fillText(g.typ !== "biene" ? "🐇" : "🐝", 0, 0); if (g.typ === "osterhase") { c.font = `${11 * k}px ${JZB_EMOJI}`; c.fillText("🧺", 9 * k, -2 * k); } c.restore();
  } else if (g.typ === "gluehwurm") {
    const a = .35 + .65 * Math.abs(Math.sin(g.ph * 1.6)), r = 6 * k, gr = c.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
    gr.addColorStop(0, `rgba(240,255,150,${a})`); gr.addColorStop(1, "rgba(200,255,100,0)"); c.fillStyle = gr; c.beginPath(); c.arc(g.x, g.y, r, 0, 7); c.fill();
  }
}
// ---------- 2.331.0 KC-CLUB-THEMEN-BUEHNE (Wunsch Hansi „neue Bühnenbilder für die Themen: Sim-Jü, Oktoberfest, Karibik“) ----------
// Eigene Szenen der Kopf-Bühne für Themen (über ein Thema, „Nach Kalender“ oder die Vorschau – die Jahreszeiten-Automatik bleibt wie sie ist).
// Ein Lauf dauert rund zwei Minuten: Aufbau → Szene → Höhepunkt → Ausblenden → nächster Lauf.
// 🎡 Sim-Jü: Lichterkette, Riesenrad mit Gondeln, Luftballons, Lebkuchenherz mit dem eigenen Vornamen, zum Schluss Feuerwerk.
// 🥨 Oktoberfest: blau-weiße Wimpel, Brezn, Fass wird angezapft („O'zapft is!“), zwei Maßkrüge stoßen an („Prost!“), Lebkuchenherz mit Namen.
// 🌴 Karibik: Meer mit Wellen, Strand und Palme (ab und zu fällt eine Kokosnuss), Segelboot, Papagei oder springender Fisch, der Vorname
// wird in den Sand geschrieben – eine Welle holt ihn; zum Schluss Sonnenuntergang. Alles nur Bild, nichts wird gespeichert oder gesendet.
const JZB_FESTE = ["kirmes", "wiesn", "karibik", "karneval", "halloween"]; // 2.332.0: + Karneval, Halloween
const JZB_FEST_DAUER = 120; // Sekunden je Lauf
const JZB_FEST_BUNT = ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7bed6f", "#c77dff", "#ff9f1c", "#ffffff"];
function jzbFestStart() {
  JZB.fest = { t: 0, a: 0, raketen: [], raketUhr: 0, ballons: [], ballonUhr: jzbZ(2, 5), spritzer: [], schild: -1, boot: null, bootUhr: jzbZ(2, 6),
    gast: null, gastUhr: jzbZ(8, 14), nuss: null, nussUhr: jzbZ(18, 30), welle: -1, prost: [],
    konfetti: [], liegt: [], kamelle: [], wagen: null, wagenUhr: jzbZ(3, 6), kanone: false, fleder: [], flederUhr: jzbZ(1, 4), geist: null, geistUhr: jzbZ(5, 9) }; // 2.332.0
}
function jzbFest(dt) {
  const J = JZB, k = J.k;
  if (J.phase === "anfang" || !J.fest) { jzbFestStart(); jzbPhase("fest"); }
  const F = J.fest; F.t += dt;
  F.a = Math.min(1, F.t / 2.5, Math.max(0, (JZB_FEST_DAUER - F.t) / 4));
  if (F.t >= JZB_FEST_DAUER) { J.fest = null; return jzbLaufEnde(); }
  for (const s of F.spritzer) { s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a -= dt * 1.3; }
  F.spritzer = F.spritzer.filter((s) => s.a > 0 && s.y < J.h + 4);
  if (J.saison === "kirmes") {
    if ((F.ballonUhr -= dt) <= 0 && F.t < JZB_FEST_DAUER - 15) { F.ballonUhr = jzbZ(5, 11); F.ballons.push({ x: jzbZ(J.w * .1, J.w * .7), y: J.h + 20 * k, v: jzbZ(18, 28) * k, ph: jzbZ(0, 6), farbe: jzbW(JZB_FEST_BUNT.slice(0, 6)) }); }
    for (const b of F.ballons) { b.y -= b.v * dt; b.ph += dt; b.x += Math.sin(b.ph * 1.3) * 8 * dt; }
    F.ballons = F.ballons.filter((b) => b.y > -40 * k);
    // 🎆 Feuerwerk zum Schluss (am Sim-Jü-Montag gibt es das echte)
    if (F.t > JZB_FEST_DAUER - 30 && F.t < JZB_FEST_DAUER - 7 && (F.raketUhr -= dt) <= 0) { F.raketUhr = jzbZ(.45, 1.1);
      F.raketen.push({ x: jzbZ(J.w * .3, J.w - 30), y: J.h, ziel: jzbZ(J.h * .12, J.h * .42), v: jzbZ(120, 160) * Math.max(.7, k), farbe: jzbW(JZB_FEST_BUNT) }); }
    for (const r of F.raketen) {
      r.y -= r.v * dt; r.x += Math.sin(r.y * .08) * 6 * dt;
      if (r.y <= r.ziel) { r.weg = true; const n = 22, zwei = Math.random() < .4 ? jzbW(JZB_FEST_BUNT) : r.farbe;
        for (let i = 0; i < n; i++) { const w = i / n * Math.PI * 2, v = jzbZ(35, 70) * Math.max(.7, k);
          J.fx.push({ typ: "funke", x: r.x, y: r.y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, s: jzbZ(1.8, 3.2), a: 1, farbe: i % 2 ? r.farbe : zwei }); } }
    }
    F.raketen = F.raketen.filter((r) => !r.weg);
  } else if (J.saison === "wiesn") {
    if (F.schild < 0 && F.t > 24) F.schild = 0; if (F.schild >= 0) F.schild += dt;
    if (F.t > 19 && F.t < 25 && Math.random() < dt * 6) { const f = jzbWiesnFass(); F.spritzer.push({ x: f.kx + jzbZ(-6, 6) * k, y: f.ky - 22 * k, vx: jzbZ(-25, 25), vy: jzbZ(-40, -10), a: 1, r: jzbZ(1.2, 2.2) * k, schaum: true }); }
    for (const z of [[46, 60], [82, 96]]) if (F.t > z[0] && F.t < z[1] && !F.prost.includes(z[0])) { F.prost.push(z[0]); F.krug = { t: 0, klirr: false }; }
    if (F.krug) { const K = F.krug; K.t += dt;
      if (!K.klirr && K.t > 2.4) { K.klirr = true; const m = jzbWiesnKrugMitte();
        for (let i = 0; i < 14; i++) F.spritzer.push({ x: m + jzbZ(-4, 4), y: J.h - 26 * k, vx: jzbZ(-60, 60), vy: jzbZ(-120, -50), a: 1, r: jzbZ(1, 2.3) * k, schaum: i % 3 > 0 }); }
      if (K.t > 7) F.krug = null; }
  } else if (J.saison === "karneval") jzbKarnevalSchritt(F, dt);
  else if (J.saison === "halloween") jzbHalloweenSchritt(F, dt);
  else { // 🌴 Karibik
    if (!F.boot && (F.bootUhr -= dt) <= 0) { const dir = J.lauf % 2 ? -1 : 1; F.boot = { dir, x: dir > 0 ? -40 * k : J.w + 40 * k }; }
    if (F.boot) { F.boot.x += F.boot.dir * 13 * k * dt; if (F.boot.x < -60 * k || F.boot.x > J.w + 60 * k) { F.boot = null; F.bootUhr = jzbZ(15, 30); } }
    if (!F.gast && (F.gastUhr -= dt) <= 0 && F.t < JZB_FEST_DAUER - 10) {
      F.gast = Math.random() < .55 ? { typ: "papagei", dir: Math.random() < .5 ? 1 : -1, t: 0, y0: jzbZ(J.h * .25, J.h * .55) } : { typ: "fisch", x: jzbZ(J.w * .1, J.w * .5), t: 0, dir: Math.random() < .5 ? 1 : -1 }; }
    if (F.gast) { const g = F.gast; g.t += dt; if (g.typ === "papagei" ? g.t > (J.w + 80) / (55 * k) : g.t > 1.6) { F.gast = null; F.gastUhr = jzbZ(10, 20); } }
    if (!F.nuss && (F.nussUhr -= dt) <= 0) { const p = jzbPalme(); F.nuss = { x: p.kx + 4 * k, y: p.ky + 4 * k, vx: -jzbZ(8, 20) * k, vy: 0, lieg: 0 }; }
    if (F.nuss) { const n = F.nuss, boden = jzbKaribikSand(n.x) - 3.5 * k;
      if (n.lieg) { n.lieg += dt; n.x += n.vx * dt; n.vx *= 1 - 2 * dt; if (n.lieg > 7) { F.nuss = null; F.nussUhr = jzbZ(25, 45); } }
      else { n.vy += 300 * dt; n.x += n.vx * dt; n.y += n.vy * dt; if (n.y >= boden) { n.y = boden; if (n.vy > 60) n.vy = -n.vy * .35; else { n.lieg = .01; n.vx = -14 * k; } } }
      if (n.lieg) n.y = jzbKaribikSand(n.x) - 3.5 * k; }
    if (F.welle < 0 && F.t > 72) F.welle = 0; if (F.welle >= 0 && F.welle < 6) F.welle += dt;
  }
}
// ---- gemeinsame Teile ----
function jzbKetteY(x, y0, hang) { // Girlande in zwei Bögen über die Breite
  const J = JZB, a = JZB_RAND, b = J.w - JZB_RAND, m = (a + b) / 2, l = x < m ? a : m, r = x < m ? m : b, u = (x - l) / (r - l);
  return y0 + Math.sin(u * Math.PI) * hang;
}
function jzbHerzMalen(c, x, y0, k, t) { // 🧡 Lebkuchenherz mit Zuckerguss und dem eigenen Vornamen – hängt am Band und schaukelt
  const J = JZB, name = jzbEisNameText() || "Bachkreis", b = 16 * k, w = Math.sin(J.T * 1.4 + 1) * .07;
  c.save(); c.translate(x, y0); c.rotate(w);
  c.strokeStyle = "#c0392b"; c.lineWidth = 1.4 * k; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 4 * k); c.stroke();
  c.translate(0, 4 * k + b * .2);
  const herz = () => { c.beginPath(); c.moveTo(0, b * .3); c.bezierCurveTo(-b * .1, b * .05, -b * 1.05, -b * .05, -b * .95, -b * .62);
    c.bezierCurveTo(-b * .85, -b * 1.12, -b * .15, -b * 1.05, 0, -b * .62); c.bezierCurveTo(b * .15, -b * 1.05, b * .85, -b * 1.12, b * .95, -b * .62);
    c.bezierCurveTo(b * 1.05, -b * .05, b * .1, b * .05, 0, b * .3); c.closePath(); };
  c.translate(0, b * .95); c.scale(1.18, 1.05);
  herz(); const g = c.createLinearGradient(0, -b, 0, b * .4); g.addColorStop(0, "#b8743a"); g.addColorStop(1, "#7a4319"); c.fillStyle = g; c.fill();
  c.setLineDash([1.6 * k, 2.2 * k]); c.lineCap = "round"; c.strokeStyle = "#fff"; c.lineWidth = 1.6 * k; c.save(); c.scale(.86, .86); c.translate(0, -b * .05); herz(); c.stroke(); c.restore(); c.setLineDash([]);
  c.fillStyle = "#ff8fb1"; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * b * .55, -b * .62, 1.8 * k, 0, 7); c.fill(); }
  let fs = 8.5 * k; c.font = `700 ${fs}px "Comic Sans MS","Segoe Print",cursive,sans-serif`; const tw = c.measureText(name).width;
  if (tw > b * 1.35) { fs *= b * 1.35 / tw; c.font = `700 ${fs}px "Comic Sans MS","Segoe Print",cursive,sans-serif`; }
  c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 2 * k; c.strokeStyle = "rgba(122,67,25,.9)"; c.strokeText(name, 0, -b * .38); c.fillStyle = "#fffaf0"; c.fillText(name, 0, -b * .38);
  c.restore(); void t;
}
function jzbPfostenMalen(c, x, y, x1) { // Holzpfosten mit Querlatte unten links (dort ist unter dem Infofeld Platz) – daran hängen Herz und Brezn
  const J = JZB, k = J.k; c.fillStyle = "#7a4e26"; c.fillRect(x - 1.6 * k, y - 2 * k, 3.2 * k, J.h - y + 2 * k); c.fillRect(x - 1.6 * k, y - 2 * k, x1 - x, 2.6 * k);
  c.fillStyle = "#5a3818"; c.beginPath(); c.arc(x, y - 2 * k, 2 * k, 0, 7); c.fill();
}
const jzbStangeY = () => JZB.h - 37 * JZB.k;
function jzbBreznMalen(c, bx, by, k) {
  const bw = Math.sin(JZB.T * 1.6) * .1;
  c.save(); c.translate(bx, by); c.rotate(bw); c.strokeStyle = "#c0392b"; c.lineWidth = 1.2 * k; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 5 * k); c.stroke();
  c.translate(0, 15 * k); c.scale(.9, .9); c.strokeStyle = "#8a4a16"; c.lineWidth = 3.4 * k; c.lineCap = "round"; c.beginPath();
  c.moveTo(-3 * k, -9 * k); c.bezierCurveTo(-14 * k, -11 * k, -15 * k, 6 * k, -4 * k, 6 * k); c.bezierCurveTo(3 * k, 6 * k, 3 * k, -2 * k, 0, -2 * k);
  c.bezierCurveTo(-3 * k, -2 * k, -3 * k, 6 * k, 4 * k, 6 * k); c.bezierCurveTo(15 * k, 6 * k, 14 * k, -11 * k, 3 * k, -9 * k); c.stroke();
  c.fillStyle = "#fff"; for (let i = 0; i < 9; i++) c.fillRect(-11 * k + (i * 2.7 % 22) * k, -6 * k + (i * 5 % 11) * k, 1, 1); c.restore();
}
function jzbSpritzerMalen(c, F) {
  for (const s of F.spritzer) { c.globalAlpha = Math.max(0, s.a) * F.a; c.fillStyle = s.schaum ? "#fffdf2" : "#f2b632"; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); }
  c.globalAlpha = F.a;
}
function jzbFestMalen(c) {
  const J = JZB, F = J.fest; if (!F) return;
  c.save(); c.globalAlpha = F.a;
  if (J.saison === "kirmes") jzbKirmesMalen(c, F); else if (J.saison === "wiesn") jzbWiesnMalen(c, F); else if (J.saison === "karneval") jzbKarnevalMalen(c, F); else if (J.saison === "halloween") jzbHalloweenMalen(c, F); else jzbKaribikMalen(c, F);
  c.restore();
}
// ---- 🎡 Sim-Jü ----
function jzbKirmesMalen(c, F) {
  const J = JZB, k = J.k, T = J.T, R = Math.max(22, Math.min(50, J.h * .34)) * Math.max(.8, k), cx = J.w - R - 40, cy = J.h - R - 13 * k;
  // 2.336.0 (Wunsch Hansi „ganz oben nichts – keine Wimpel usw.“): die Lichterkette hängt jetzt als Deko an der Leiste (KC-CLUB-DEKO)
  const takt = Math.floor(T * 3.5);
  // Luftballons
  for (const b of F.ballons) {
    c.strokeStyle = "rgba(80,80,80,.6)"; c.lineWidth = .8; c.beginPath(); c.moveTo(b.x, b.y + 9 * k); c.quadraticCurveTo(b.x + Math.sin(b.ph * 2) * 4, b.y + 17 * k, b.x, b.y + 25 * k); c.stroke();
    c.fillStyle = b.farbe; c.beginPath(); c.ellipse(b.x, b.y, 6.5 * k, 8.5 * k, Math.sin(b.ph) * .1, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(b.x - 2.2 * k, b.y - 3 * k, 1.5 * k, 2.4 * k, -.4, 0, 7); c.fill();
    c.fillStyle = b.farbe; c.beginPath(); c.moveTo(b.x, b.y + 8 * k); c.lineTo(b.x - 1.6 * k, b.y + 10.5 * k); c.lineTo(b.x + 1.6 * k, b.y + 10.5 * k); c.fill();
  }
  // Lebkuchenherz links neben dem Riesenrad an der Lichterkette
  const sy = jzbStangeY(); jzbPfostenMalen(c, JZB_RAND + 3, sy, JZB_RAND + 50 * k); jzbHerzMalen(c, JZB_RAND + 28 * k, sy, k, F.t);
  // Riesenrad
  c.strokeStyle = "#5b6472"; c.lineWidth = 2.6 * k; c.lineCap = "round";
  c.beginPath(); c.moveTo(cx - R * .62, J.h - 2); c.lineTo(cx, cy); c.lineTo(cx + R * .62, J.h - 2); c.stroke();
  c.lineWidth = 1.4 * k; c.beginPath(); c.moveTo(cx - R * .34, cy + R * .55); c.lineTo(cx + R * .34, cy + R * .55); c.stroke();
  const th = T * .22, n = 8;
  c.strokeStyle = "rgba(235,235,245,.9)"; c.lineWidth = 1.1 * k;
  for (let i = 0; i < n * 2; i++) { const a = th + i / (n * 2) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); }
  c.strokeStyle = "#e9edf5"; c.lineWidth = 2.2 * k; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
  c.lineWidth = 1 * k; c.beginPath(); c.arc(cx, cy, R * .82, 0, 7); c.stroke();
  for (let i = 0; i < 24; i++) { const a = th + i / 24 * Math.PI * 2, an = (i + takt) % 2 === 0; c.fillStyle = an ? "#fff3a0" : "rgba(255,200,120,.45)"; c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, (an ? 1.6 : 1.1) * k, 0, 7); c.fill(); }
  for (let i = 0; i < n; i++) { // Gondeln hängen immer senkrecht und pendeln leicht
    const a = th + i / n * Math.PI * 2, gx = cx + Math.cos(a) * R, gy = cy + Math.sin(a) * R, p = Math.sin(T * 1.7 + i) * .08, gw = 9 * k, gh = 7 * k;
    c.save(); c.translate(gx, gy); c.rotate(p);
    c.strokeStyle = "#cfd5e0"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 3 * k); c.stroke();
    c.fillStyle = JZB_FEST_BUNT[i % 6]; c.beginPath(); c.moveTo(-gw / 2, 3 * k); c.lineTo(gw / 2, 3 * k); c.lineTo(gw * .4, 3 * k + gh); c.lineTo(-gw * .4, 3 * k + gh); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(-gw * .3, 4 * k, gw * .6, 2 * k);
    c.restore();
  }
  c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(cx, cy, 3 * k, 0, 7); c.fill();
  // Raketen mit Leuchtspur (die Funken zeichnet die Bühne)
  for (const r of F.raketen) { c.strokeStyle = "rgba(255,230,160,.8)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(r.x, r.y + 12 * k); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(r.x, r.y, 1.6, 0, 7); c.fill(); }
}
// ---- 🥨 Oktoberfest ----
function jzbWiesnFass() { const J = JZB, k = J.k, r = Math.max(13, Math.min(22, J.h * .15)) * Math.max(.8, k), fx = J.w - r * 1.6 - 46; return { fx, fy: J.h - 2 - 10 * k - r, r, kx: fx - r * 1.55, ky: J.h - 2 }; }
const jzbWiesnKrugMitte = () => JZB.w * .5;
function jzbKrugMalen(c, x, yb, k, fuell, kipp, spiegel) { // 🍺 Maßkrug aus Glas mit Henkel, Bier und Schaumkrone
  const w = 13 * k, h = 20 * k;
  c.save(); c.translate(x, yb); c.rotate(kipp); c.scale(spiegel, 1);
  c.strokeStyle = "rgba(230,240,245,.95)"; c.lineWidth = 2.4 * k; c.beginPath(); c.moveTo(w / 2, -h * .78); c.quadraticCurveTo(w / 2 + 8 * k, -h * .7, w / 2 + 6.5 * k, -h * .4); c.quadraticCurveTo(w / 2 + 5 * k, -h * .22, w / 2, -h * .22); c.stroke();
  if (fuell > 0) { const bh = (h - 2.5 * k) * fuell, g = c.createLinearGradient(0, -bh, 0, 0); g.addColorStop(0, "#f7c548"); g.addColorStop(1, "#d98a12");
    c.fillStyle = g; c.fillRect(-w / 2 + 1, -bh - 1.5 * k, w - 2, bh); c.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-w * .2 + i * 2.6 * k, -bh * (.3 + (i % 2) * .3) - 1.5 * k, .7 * k, 0, 7); c.fill(); }
    if (fuell > .55) { c.fillStyle = "#fffdf2"; c.beginPath(); const fy = -bh - 1.5 * k; c.moveTo(-w / 2 - 1, fy + 2 * k);
      for (let i = 0; i <= 4; i++) c.arc(-w / 2 + i * w / 4, fy - .5 * k, 2.4 * k, Math.PI, 0); c.lineTo(w / 2 + 1, fy + 2 * k); c.closePath(); c.fill(); } }
  c.fillStyle = "rgba(220,235,245,.28)"; c.strokeStyle = "rgba(235,245,250,.95)"; c.lineWidth = 1.3 * k; c.beginPath(); c.rect(-w / 2, -h, w, h - 1.5 * k); c.fill(); c.stroke();
  c.fillStyle = "rgba(235,245,250,.9)"; c.fillRect(-w / 2 - .5, -1.6 * k, w + 1, 1.8 * k);
  c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = .8; for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) { c.beginPath(); c.arc(-w * .28 + s * w * .28, -h * .75 + r * h * .25, 1.6 * k, 0, 7); c.stroke(); }
  c.restore();
}
function jzbWiesnMalen(c, F) {
  const J = JZB, k = J.k, T = J.T;
  // 2.336.0 (Wunsch Hansi): keine Wimpelkette mehr oben – die blau-weißen Wimpel hängen als Deko an der Leiste (KC-CLUB-DEKO)
  // Lebkuchenherz und Brezn am Pfosten unten links
  const f = jzbWiesnFass(), sy = jzbStangeY(); jzbPfostenMalen(c, JZB_RAND + 3, sy, JZB_RAND + 72 * k); jzbHerzMalen(c, JZB_RAND + 25 * k, sy, k, F.t); jzbBreznMalen(c, JZB_RAND + 60 * k, sy, k);
  // Fass auf dem Bock, Zapfhahn, Krug füllt sich
  c.fillStyle = "#6b4423"; c.fillRect(f.fx - f.r * 1.1, f.fy + f.r * .7, 3 * k, J.h - f.fy - f.r * .7); c.fillRect(f.fx + f.r * 1.1 - 3 * k, f.fy + f.r * .7, 3 * k, J.h - f.fy - f.r * .7);
  const g = c.createLinearGradient(0, f.fy - f.r, 0, f.fy + f.r); g.addColorStop(0, "#c08a4e"); g.addColorStop(.5, "#9a6431"); g.addColorStop(1, "#6e4220");
  c.fillStyle = g; c.beginPath(); c.ellipse(f.fx, f.fy, f.r * 1.3, f.r, 0, 0, 7); c.fill();
  c.strokeStyle = "#3d3d3d"; c.lineWidth = 2 * k; for (const s of [-.75, .75]) { c.beginPath(); c.ellipse(f.fx + s * f.r * 1.3 * .82, f.fy, f.r * .16, f.r * .97, 0, 0, 7); c.stroke(); }
  c.fillStyle = "#a87240"; c.beginPath(); c.ellipse(f.fx - f.r * 1.3, f.fy, f.r * .28, f.r, 0, 0, 7); c.fill(); c.strokeStyle = "#3d3d3d"; c.lineWidth = 1.4 * k; c.stroke();
  c.fillStyle = "#c9c9c9"; c.fillRect(f.fx - f.r * 1.55, f.fy - 2 * k, f.r * .3, 3.4 * k); c.fillRect(f.kx - 1.5 * k, f.fy - 2 * k, 3 * k, 7 * k);
  const fuell = jzbEase((F.t - 4) / 16);
  if (F.t > 4 && F.t < 21) { c.strokeStyle = "rgba(242,182,50,.95)"; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(f.kx, f.fy + 5 * k); c.lineTo(f.kx + Math.sin(T * 20) * .4, f.ky - 20 * k * Math.max(.1, fuell)); c.stroke(); }
  jzbKrugMalen(c, f.kx, f.ky, k, fuell, 0, 1);
  if (F.schild >= 0 && F.schild < 10) { // Holzschild „O'zapft is!“
    const s = jzbHopp(F.schild / .7) * Math.min(1, (10 - F.schild) / .6), sx = f.fx - f.r * .2, sy = f.fy - f.r - 16 * k;
    c.save(); c.translate(sx, sy); c.scale(s, s); c.rotate(-.06); c.fillStyle = "#8b5a2b"; c.strokeStyle = "#5a3818"; c.lineWidth = 1.5; c.beginPath(); if (c.roundRect) c.roundRect(-34 * k, -9 * k, 68 * k, 18 * k, 4 * k); else c.rect(-34 * k, -9 * k, 68 * k, 18 * k); c.fill(); c.stroke();
    c.font = `700 ${10 * k}px Georgia,serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff4d6"; c.fillText("O'zapft is!", 0, .5 * k); c.restore();
  }
  if (F.krug) { // zwei Maßkrüge kommen von links und rechts und stoßen an
    const K = F.krug, m = jzbWiesnKrugMitte(), weg = K.t < 2.4 ? 1 - jzbEase(K.t / 2.4) : K.t < 4.6 ? 0 : jzbEase((K.t - 4.6) / 2.4), d = 9 * k + weg * (J.w * .3);
    const kipp = K.t > 2 && K.t < 3.2 ? Math.sin((K.t - 2) / 1.2 * Math.PI) * .22 : 0;
    jzbKrugMalen(c, m - d, J.h - 2, k, 1, kipp, 1); jzbKrugMalen(c, m + d, J.h - 2, k, 1, -kipp, -1);
    if (K.t > 2.4 && K.t < 4.8) { const a = Math.min(1, (K.t - 2.4) * 3, (4.8 - K.t) * 3); c.save(); c.globalAlpha *= a; c.font = `700 ${12 * k}px Georgia,serif`; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.45)"; c.strokeText("Prost!", m, J.h - 32 * k); c.fillStyle = "#ffe08a"; c.fillText("Prost!", m, J.h - 32 * k); c.restore(); }
  }
  jzbSpritzerMalen(c, F);
}
// ---- 🌴 Karibik ----
const jzbKaribikHorizont = () => JZB.h - 30 * JZB.k;
function jzbKaribikSand(x) { const J = JZB, a = J.w * .55; if (x < a) return J.h + 20; const u = Math.min(1, (x - a) / (J.w * .2)); return J.h - 3 - jzbEase(u) * 16 * J.k; }
function jzbPalme() { const J = JZB, k = J.k, H = Math.max(36, Math.min(80, J.h * .5)) * Math.max(.8, k), px = J.w * .8, py = jzbKaribikSand(px) + 2, bieg = Math.sin(J.T * .7) * 3 * k; return { px, py, H, kx: px + H * .2 + bieg, ky: py - H }; }
function jzbKaribikMalen(c, F) {
  const J = JZB, k = J.k, T = J.T, H0 = jzbKaribikHorizont(), abend = jzbEase((F.t - (JZB_FEST_DAUER - 28)) / 20);
  // Sonne – zum Schluss geht sie unter und färbt sich rot
  const sx = J.w * .5, sy = J.h * .355 + abend * (H0 - J.h * .355), sr = 13 * k * (1 + abend * .25);
  const gl = c.createRadialGradient(sx, sy, sr * .5, sx, sy, sr * 2.6); gl.addColorStop(0, abend > .3 ? "rgba(255,140,60,.55)" : "rgba(255,230,120,.5)"); gl.addColorStop(1, "rgba(255,200,80,0)");
  c.fillStyle = gl; c.beginPath(); c.arc(sx, sy, sr * 2.6, 0, 7); c.fill();
  c.save(); c.beginPath(); c.rect(0, 0, J.w, H0); c.clip(); c.fillStyle = abend > 0 ? `rgb(255,${Math.round(214 - 110 * abend)},${Math.round(80 - 40 * abend)})` : "#ffd650"; c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fill(); c.restore();
  if (abend > 0) { const g = c.createLinearGradient(0, H0 - J.h * .5, 0, H0); g.addColorStop(0, "rgba(255,120,60,0)"); g.addColorStop(1, `rgba(255,110,50,${.22 * abend})`); c.fillStyle = g; c.fillRect(0, H0 - J.h * .5, J.w, J.h * .5); }
  // Meer mit Wellen und Glitzer
  const mg = c.createLinearGradient(0, H0, 0, J.h); mg.addColorStop(0, "#1fb5c9"); mg.addColorStop(1, "#0e8aa8"); c.fillStyle = mg;
  c.beginPath(); c.moveTo(0, J.h); for (let x = 0; x <= J.w; x += 6) c.lineTo(x, H0 + Math.sin(x * .05 + T * 1.6) * 1.2 * k); c.lineTo(J.w, J.h); c.fill();
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2;
  for (let r = 0; r < 2; r++) { c.beginPath(); for (let x = 0; x <= J.w * .62; x += 5) { const y = H0 + (6 + r * 6) * k + Math.sin(x * .06 - T * (2 + r) + r) * 1.6 * k; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  if (abend > 0) { c.fillStyle = `rgba(255,170,90,${.6 * abend})`; for (let i = 0; i < 5; i++) c.fillRect(sx - (10 - i * 1.5) * k, H0 + 2 * k + i * 3 * k, (20 - i * 3) * k, 1.3 * k); }
  // Segelboot
  if (F.boot) { const b = F.boot, by = H0 + 2 * k + Math.sin(T * 2) * 1.2 * k; c.save(); c.translate(b.x, by); c.scale(b.dir * k, k); c.rotate(Math.sin(T * 1.5) * .05);
    c.fillStyle = "#7a3e1d"; c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(10, 5); c.lineTo(-11, 5); c.closePath(); c.fill();
    c.strokeStyle = "#5a3a20"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -26); c.stroke();
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(1, -25); c.lineTo(13, -3); c.lineTo(1, -3); c.fill(); c.fillStyle = "#ff6b4a"; c.beginPath(); c.moveTo(-1, -22); c.lineTo(-11, -3); c.lineTo(-1, -3); c.fill(); c.restore(); }
  // Strand mit Namen im Sand – die große Welle holt ihn
  const a = J.w * .55; c.fillStyle = "#f3d9a4"; c.beginPath(); c.moveTo(a, J.h + 1); for (let x = a; x <= J.w; x += 4) c.lineTo(x, jzbKaribikSand(x)); c.lineTo(J.w, J.h + 1); c.fill();
  const name = jzbEisNameText(), nx = J.w * .74, ny = J.h - 6 * k, buchst = Math.floor(Math.max(0, F.t - 8) / .7), weg = F.welle < 0 ? 0 : Math.min(1, F.welle / 2.5);
  if (name && buchst > 0 && weg < 1) { c.save(); c.globalAlpha *= 1 - weg; c.font = `italic 600 ${9.5 * k}px "Segoe Print","Comic Sans MS",cursive,sans-serif`; c.textAlign = "left"; c.textBaseline = "middle";
    const t = name.slice(0, buchst), w = c.measureText(name).width; c.fillStyle = "rgba(140,95,45,.75)"; c.fillText(t, nx - w / 2, ny); c.restore(); }
  if (F.welle >= 0 && F.welle < 6) { const p = F.welle < 2.5 ? jzbEase(F.welle / 2.5) : 1 - jzbEase((F.welle - 2.5) / 3.5), vx = a + p * (J.w * .32);
    c.fillStyle = "rgba(60,200,215,.75)"; c.beginPath(); c.moveTo(a - 4, J.h + 1); for (let x = a - 4; x <= vx; x += 4) c.lineTo(x, Math.max(jzbKaribikSand(x), J.h - 9 * k) - 2 * k + Math.sin(x * .2 + T * 4) * k); c.lineTo(vx, J.h + 1); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 1.6 * k; c.beginPath(); c.arc(vx, J.h - 6 * k, 3 * k, -1.6, 1.2); c.stroke(); }
  c.font = `${13 * k}px ${JZB_EMOJI}`; c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText("🍹", J.w * .64, jzbKaribikSand(J.w * .64) + 2);
  // Palme
  const P = jzbPalme(); c.strokeStyle = "#8a6239"; c.lineCap = "round";
  for (let i = 0; i < 10; i++) { const u0 = i / 10, u1 = (i + 1) / 10, pt = (u) => [P.px + (P.kx - P.px) * u * u, P.py + (P.ky - P.py) * u]; const [x0, y0] = pt(u0), [x1, y1] = pt(u1);
    c.lineWidth = (5.5 - u0 * 2.5) * k; c.strokeStyle = i % 2 ? "#8a6239" : "#9c7246"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  const wedel = [[-2.6, 1], [-2.0, 1.1], [-1.3, .9], [-.4, .7], [.5, .9], [1.1, 1.05], [-3.0, .8]];
  for (const [w0, l0] of wedel) { const sw = Math.sin(T * 1.3 + w0) * .08, w = w0 + sw, L = 30 * k * l0, ex = P.kx + Math.cos(w) * L, ey = P.ky + Math.sin(w) * L * .55 + L * .35;
    const mx = P.kx + Math.cos(w) * L * .55, my = P.ky + Math.sin(w) * L * .55 - 6 * k;
    c.strokeStyle = "#2e8b3e"; c.lineWidth = 1.8 * k; c.beginPath(); c.moveTo(P.kx, P.ky); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    c.strokeStyle = "#3fae4f"; c.lineWidth = 1.1 * k;
    for (let j = 1; j < 9; j++) { const u = j / 9, qx = (1 - u) * (1 - u) * P.kx + 2 * (1 - u) * u * mx + u * u * ex, qy = (1 - u) * (1 - u) * P.ky + 2 * (1 - u) * u * my + u * u * ey, ll = (1 - u * .6) * 6 * k;
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + Math.cos(w + 1.9) * ll, qy + Math.sin(w + 1.9) * ll + 2 * k); c.moveTo(qx, qy); c.lineTo(qx + Math.cos(w - 1.2) * ll, qy + Math.abs(Math.sin(w - 1.2)) * ll + 2 * k); c.stroke(); } }
  c.fillStyle = "#6b4423"; for (const [dx, dy] of [[-3, 3], [2.5, 4], [0, 6.5]]) { if (F.nuss && dx === 2.5) continue; c.beginPath(); c.arc(P.kx + dx * k, P.ky + dy * k, 3.4 * k, 0, 7); c.fill(); }
  if (F.nuss) { c.fillStyle = "#6b4423"; c.beginPath(); c.arc(F.nuss.x, F.nuss.y, 3.4 * k, 0, 7); c.fill(); }
  // Papagei oder springender Fisch
  const g = F.gast; if (g) { c.save(); c.font = `${(g.typ === "papagei" ? 17 : 13) * k}px ${JZB_EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle";
    if (g.typ === "papagei") { const x = g.dir > 0 ? -30 + g.t * 55 * k : J.w + 30 - g.t * 55 * k, y = g.y0 + Math.sin(g.t * 3) * 6 * k; c.translate(x, y); c.scale(-g.dir, 1); c.fillText("🦜", 0, 0); }
    else { const u = g.t / 1.6, x = g.x + g.dir * u * 40 * k, y = H0 + 6 * k - Math.sin(u * Math.PI) * 24 * k; c.translate(x, y); c.scale(-g.dir, 1); c.rotate(-g.dir * (u - .5) * 1.6 * -1); c.fillText("🐠", 0, 0); }
    c.restore(); }
  void F;
}
// ---- 🎭 Karneval (2.332.0 KC-CLUB-THEMEN-BUEHNE-2): Luftschlangen, Konfetti-Regen (bleibt liegen), Karnevalswagen mit „Helau, <Vorname>!“,
// der Jeck wirft Kamelle; zum Schluss zwei Konfetti-Kanonen ----
const jzbKonfettiNeu = (x, y, vx, vy) => ({ x, y, vx, vy, rot: jzbZ(0, 6.3), vr: jzbZ(-6, 6), ph: jzbZ(0, 6.3), fq: jzbZ(5, 10), farbe: jzbW(JZB_FEST_BUNT.slice(0, 6)), w: jzbZ(2.2, 3.6) });
function jzbKarnevalSchritt(F, dt) {
  const J = JZB, k = J.k;
  if (F.t < JZB_FEST_DAUER - 6) { F.kSpawn = (F.kSpawn || 0) - dt; while (F.kSpawn < 0) { F.kSpawn += .17; F.konfetti.push(jzbKonfettiNeu(jzbZ(0, J.w), -6, 0, jzbZ(14, 26))); } }
  if (!F.kanone && F.t > JZB_FEST_DAUER - 18) { F.kanone = true; // Konfetti-Kanonen links und rechts
    for (const s of [1, -1]) for (let i = 0; i < 60; i++) F.konfetti.push(jzbKonfettiNeu(s > 0 ? JZB_RAND : J.w - JZB_RAND, J.h - 4, s * jzbZ(40, 170), -jzbZ(140, 260))); }
  for (const p of F.konfetti) {
    p.vy = Math.min(p.vy + 140 * dt, 30); p.vx *= 1 - 1.4 * dt; p.ph += dt * p.fq;
    p.x += p.vx * dt + Math.sin(p.ph * .4) * 9 * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.y >= J.h - 2 && p.vy > 0) { p.weg = true; if (jzbImFeld(p.x)) { F.liegt.push({ x: p.x, y: J.h - jzbZ(1, 3), rot: p.rot, farbe: p.farbe, w: p.w }); if (F.liegt.length > 180) F.liegt.shift(); } }
  }
  F.konfetti = F.konfetti.filter((p) => !p.weg && p.x > -20 && p.x < J.w + 20);
  if (!F.wagen && (F.wagenUhr -= dt) <= 0 && F.t < JZB_FEST_DAUER - 25) { const dir = (J.lauf + F.prost.length) % 2 ? -1 : 1; F.prost.push(1); F.wagen = { dir, x: dir > 0 ? -70 * k : J.w + 70 * k, t: 0, wurf: 1 }; }
  if (F.wagen) { const W = F.wagen; W.t += dt; W.x += W.dir * 20 * k * dt;
    if ((W.wurf -= dt) <= 0 && W.x > 0 && W.x < J.w) { W.wurf = jzbZ(.9, 2); F.kamelle.push({ x: W.x - W.dir * 8 * k, y: J.h - 34 * k, vx: jzbZ(-50, 50), vy: -jzbZ(70, 120), rot: 0, farbe: jzbW(JZB_FEST_BUNT.slice(0, 6)), lieg: 0 }); }
    if (W.x < -80 * k || W.x > J.w + 80 * k) { F.wagen = null; F.wagenUhr = jzbZ(18, 30); } }
  for (const m of F.kamelle) { if (m.lieg) { m.lieg += dt; continue; } m.vy += 230 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += 8 * dt; if (m.y >= J.h - 3) { m.y = J.h - 3; m.lieg = .01; } }
  F.kamelle = F.kamelle.filter((m) => m.lieg < 9);
}
function jzbKamelleMalen(c, m, k) {
  c.save(); c.translate(m.x, m.y); c.rotate(m.rot); c.globalAlpha *= Math.min(1, (9 - m.lieg) / 1.5); c.fillStyle = m.farbe;
  c.beginPath(); c.ellipse(0, 0, 2.6 * k, 1.8 * k, 0, 0, 7); c.fill();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 2.2 * k, 0); c.lineTo(s * 4.6 * k, -1.8 * k); c.lineTo(s * 4.6 * k, 1.8 * k); c.closePath(); c.fill(); }
  c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(-.6 * k, -1.6 * k, 1.2 * k, 3.2 * k); c.restore();
}
function jzbKarnevalMalen(c, F) {
  const J = JZB, k = J.k, T = J.T;
  // 2.336.0 (Wunsch Hansi „ganz oben nichts“): keine Luftschlangen mehr vom oberen Rand – die bunten Wimpel hängen als Deko an der Leiste
  const blatt = (p) => { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(p.ph === undefined ? 1 : Math.max(.15, Math.abs(Math.cos(p.ph))), 1); c.fillStyle = p.farbe; c.fillRect(-p.w * k / 2, -p.w * k * .35, p.w * k, p.w * k * .7); c.restore(); };
  for (const p of F.liegt) blatt(p);
  for (const m of F.kamelle) jzbKamelleMalen(c, m, k);
  const W = F.wagen;
  if (W) { // Karnevalswagen mit Fransen, Banner und Jeck
    const b = 46 * k, yb = J.h - 2, hop = Math.abs(Math.sin(W.t * 6)) * .8 * k, name = jzbEisNameText();
    c.save(); c.translate(W.x, yb - hop);
    for (const s of [-1, 1]) { const rx = s * b * .62; c.fillStyle = "#2b2b2b"; c.beginPath(); c.arc(rx, -4.5 * k + hop, 4.5 * k, 0, 7); c.fill(); c.strokeStyle = "#bbb"; c.lineWidth = 1;
      for (let q = 0; q < 3; q++) { const a = W.t * 4 * W.dir + q * 2.1; c.beginPath(); c.moveTo(rx, -4.5 * k + hop); c.lineTo(rx + Math.cos(a) * 4 * k, -4.5 * k + hop + Math.sin(a) * 4 * k); c.stroke(); } }
    c.fillStyle = "#d62f6b"; c.fillRect(-b, -21 * k, 2 * b, 13 * k);
    for (let i = 0; i < 16; i++) { c.fillStyle = JZB_FEST_BUNT[i % 6]; c.beginPath(); const x0 = -b + i * b / 8; c.moveTo(x0, -8 * k); c.lineTo(x0 + b / 8, -8 * k); c.lineTo(x0 + b / 16, -4 * k + Math.sin(W.t * 8 + i) * .8 * k); c.fill(); }
    c.fillStyle = "#ffd23f"; c.fillRect(-b, -22.5 * k, 2 * b, 2 * k);
    let fs = 8.5 * k; const txt = name ? `Helau, ${name}!` : "Helau!"; c.font = `800 ${fs}px "Trebuchet MS",sans-serif`; const tw = c.measureText(txt).width; if (tw > b * 1.85) { fs *= b * 1.85 / tw; c.font = `800 ${fs}px "Trebuchet MS",sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText(txt, 0, -14.5 * k);
    c.font = `${19 * k}px ${JZB_EMOJI}`; c.textBaseline = "bottom"; c.fillText("🤡", -b * .4, -21 * k); c.fillText("🥳", b * .35, -21 * k);
    if (W.t % 4 < 1.4) { c.font = `800 ${11 * k}px "Trebuchet MS",sans-serif`; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.45)"; c.strokeText("Helau!", -b * .4, -42 * k); c.fillStyle = "#ffe14d"; c.fillText("Helau!", -b * .4, -42 * k); }
    c.restore();
  }
  for (const p of F.konfetti) blatt(p);
}
// ---- 🎃 Halloween: Mond, Spinnennetz mit Spinne, leuchtende Kürbisse, Fledermäuse, ein Gespenst ruft „Buuuh, <Vorname>!“ ----
function jzbHalloweenSchritt(F, dt) {
  const J = JZB, k = J.k, schwarm = !F.kanone && F.t > JZB_FEST_DAUER - 20;
  if (schwarm) F.kanone = true;
  if ((F.flederUhr -= dt) <= 0 || schwarm) { F.flederUhr = jzbZ(6, 13); const dir = Math.random() < .5 ? 1 : -1, n = schwarm ? 12 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) F.fleder.push({ dir, x: dir > 0 ? -20 - i * jzbZ(10, 25) : J.w + 20 + i * jzbZ(10, 25), y0: jzbZ(J.h * .15, J.h * .6), v: jzbZ(45, 70) * k, ph: jzbZ(0, 6), s: jzbZ(.8, 1.2) }); }
  for (const f of F.fleder) { f.x += f.dir * f.v * dt; f.ph += dt; }
  F.fleder = F.fleder.filter((f) => (f.dir > 0 ? f.x < J.w + 80 : f.x > -80));
  if (!F.geist && (F.geistUhr -= dt) <= 0 && F.t < JZB_FEST_DAUER - 10) F.geist = { t: 0 };
  if (F.geist && (F.geist.t += dt) > 7) { F.geist = null; F.geistUhr = jzbZ(14, 24); }
}
function jzbKuerbis(c, x, yb, r, k, i) {
  const J = JZB, fl = .75 + .25 * Math.sin(J.T * 13 + i * 2) * Math.sin(J.T * 7.3 + i), cy = yb - r * .82;
  const gl = c.createRadialGradient(x, cy, r * .3, x, cy, r * 2.2); gl.addColorStop(0, `rgba(255,170,40,${.35 * fl})`); gl.addColorStop(1, "rgba(255,140,20,0)"); c.fillStyle = gl; c.beginPath(); c.arc(x, cy, r * 2.2, 0, 7); c.fill();
  const g = c.createRadialGradient(x - r * .3, cy - r * .3, r * .2, x, cy, r * 1.2); g.addColorStop(0, "#ffa23a"); g.addColorStop(1, "#c9530a"); c.fillStyle = g;
  for (const [dx, w] of [[-.45, .62], [.45, .62], [0, .7]]) { c.beginPath(); c.ellipse(x + dx * r, cy, r * w, r * .82, 0, 0, 7); c.fill(); }
  c.strokeStyle = "rgba(120,50,0,.35)"; c.lineWidth = 1; for (const dx of [-.35, .35]) { c.beginPath(); c.ellipse(x + dx * r, cy, r * .3, r * .78, 0, 0, 7); c.stroke(); }
  c.fillStyle = "#4e6b2a"; c.fillRect(x - r * .1, cy - r * 1.02, r * .2, r * .3);
  c.fillStyle = `rgba(255,${Math.round(200 + 40 * fl)},70,${.8 + .2 * fl})`;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * .45, cy - r * .32); c.lineTo(x + s * r * .2, cy - r * .02); c.lineTo(x + s * r * .62, cy - r * .02); c.fill(); }
  c.beginPath(); c.moveTo(x - r * .6, cy + r * .22); for (let j = 0; j <= 6; j++) c.lineTo(x - r * .6 + j * r * .2, cy + r * (j % 2 ? .32 : .22)); c.lineTo(x + r * .5, cy + r * .5); c.lineTo(x - r * .5, cy + r * .5); c.closePath(); c.fill(); void k;
}
function jzbFlederMalen(c, f, k) {
  const y = f.y0 + Math.sin(f.ph * 2.3) * 9 * k, fl = Math.sin(f.ph * 16), s = 7 * k * f.s;
  c.save(); c.translate(f.x, y); c.scale(f.dir, 1); c.fillStyle = "#1d1222";
  c.beginPath(); c.ellipse(0, 0, s * .32, s * .45, 0, 0, 7); c.fill(); c.beginPath(); c.arc(s * .1, -s * .45, s * .22, 0, 7); c.fill();
  c.beginPath(); c.moveTo(s * .02, -s * .62); c.lineTo(s * .1, -s * .82); c.lineTo(s * .2, -s * .6); c.fill();
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, -s * .1); c.lineTo(sd * s * 1.5, -s * .4 - fl * s * .7); c.lineTo(sd * s * 1.25, s * .05 - fl * s * .3); c.lineTo(sd * s * .9, -s * .05); c.lineTo(sd * s * .6, s * .2); c.lineTo(sd * s * .3, s * .05); c.closePath(); c.fill(); }
  c.restore();
}
function jzbHalloweenMalen(c, F) {
  const J = JZB, k = J.k, T = J.T, mx = J.w * .5, my = J.h * .355, mr = 12 * k;
  const gl = c.createRadialGradient(mx, my, mr * .6, mx, my, mr * 3); gl.addColorStop(0, "rgba(220,235,255,.45)"); gl.addColorStop(1, "rgba(200,220,255,0)"); c.fillStyle = gl; c.beginPath(); c.arc(mx, my, mr * 3, 0, 7); c.fill();
  c.fillStyle = "#fff4cf"; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.fillStyle = "rgba(200,180,120,.45)";
  for (const [dx, dy, r] of [[-.35, -.2, .22], [.3, .25, .16], [.1, -.45, .12], [-.1, .4, .1]]) { c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, r * mr, 0, 7); c.fill(); }
  const nx = J.w - JZB_RAND + 4, ny = 2, R = 34 * k; c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = .7; // Spinnennetz oben rechts
  const sp = 6, a0 = Math.PI / 2, a1 = Math.PI; for (let i = 0; i <= sp; i++) { const a = a0 + (a1 - a0) * i / sp; c.beginPath(); c.moveTo(nx, ny); c.lineTo(nx + Math.cos(a) * R, ny + Math.sin(a) * R); c.stroke(); }
  for (const f of [.3, .55, .8]) { c.beginPath(); for (let i = 0; i <= sp; i++) { const a = a0 + (a1 - a0) * i / sp, r = R * f * (i % 2 ? .93 : 1); i ? c.lineTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r) : c.moveTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r); } c.stroke(); }
  const sx = nx - R * .45, sy0 = ny + R * .45, lang = Math.max(0, Math.sin(F.t * Math.PI * 2 / 16)) * J.h * .32, sy = sy0 + lang; // Spinne seilt sich ab
  c.beginPath(); c.moveTo(sx, sy0); c.lineTo(sx, sy); c.stroke(); c.fillStyle = "#151015"; c.strokeStyle = "#151015"; c.lineWidth = 1;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const w = Math.sin(T * 6 + i) * .6 * k; c.beginPath(); c.moveTo(sx, sy + 3 * k); c.lineTo(sx + s * 4.5 * k, sy + (i - 1) * 2 * k + w); c.lineTo(sx + s * 6 * k, sy + (i - .5) * 2.6 * k); c.stroke(); }
  c.beginPath(); c.arc(sx, sy + 3 * k, 3 * k, 0, 7); c.fill(); c.beginPath(); c.arc(sx, sy + .5 * k, 1.8 * k, 0, 7); c.fill();
  const ks = [[JZB_RAND + 16 * k, 10], [JZB_RAND + 38 * k, 6.5], [J.w - 70 * k, 12.5], [J.w - 48 * k, 7]];
  ks.forEach(([x, r], i) => jzbKuerbis(c, x, J.h - 1, r * k, k, i));
  const G = F.geist;
  if (G) { // Gespenst steigt hinter dem großen Kürbis auf, schwebt, ruft und verblasst
    const name = jzbEisNameText(), auf = jzbEase(G.t / 1.5), a = Math.min(1, G.t * 2, Math.max(0, (7 - G.t) / 1)), gx = J.w - 70 * k - 22 * k * auf + Math.sin(G.t * 1.6) * 4 * k, gy = J.h - 14 * k - auf * 26 * k + Math.sin(G.t * 2.4) * 2 * k, s = 13 * k;
    c.save(); c.globalAlpha *= a; c.fillStyle = "rgba(250,250,255,.93)"; c.beginPath(); c.moveTo(gx - s * .7, gy + s * .9); c.lineTo(gx - s * .7, gy - s * .1); c.arc(gx, gy - s * .1, s * .7, Math.PI, 0); c.lineTo(gx + s * .7, gy + s * .9);
    for (let i = 0; i < 4; i++) { const x0 = gx + s * .7 - (i + .5) * s * .35; c.quadraticCurveTo(x0, gy + s * (i % 2 ? .65 : 1.15) + Math.sin(T * 6 + i) * 1.5, gx + s * .7 - (i + 1) * s * .35, gy + s * .9); } c.fill();
    c.fillStyle = "#1a1a2a"; for (const d of [-.25, .25]) { c.beginPath(); c.ellipse(gx + d * s, gy - s * .25, s * .1, s * .16, 0, 0, 7); c.fill(); } c.beginPath(); c.ellipse(gx, gy + s * .12, s * .12, s * .17, 0, 0, 7); c.fill();
    if (G.t > 1.8 && G.t < 5.8) { const txt = name ? `Buuuh, ${name}!` : "Buuuh!"; c.font = `800 ${11 * k}px "Trebuchet MS",sans-serif`; c.textAlign = "right"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(20,10,30,.7)"; c.strokeText(txt, gx - s, gy - s * .9); c.fillStyle = "#fff"; c.fillText(txt, gx - s, gy - s * .9); }
    c.restore(); }
  for (const f of F.fleder) jzbFlederMalen(c, f, k);
}
// ---------- KC-CLUB-JAHRESZEIT-EXTRAS (2.249.0, Wunsch Hansi „baue noch die weiteren Ideen“): Besonderes auf der Kopf-Bühne ----------
// 🥾 Nikolaus (6.12.): ein gefüllter Stiefel steht unten. ☔ Regen – nur wenn die Wetterdaten frisch sind und es wirklich regnet (Regel 11:
// kein Regen aus alten Daten, kein zusätzlicher Wetter-Abruf): Tropfen, Pfützen mit Ringen, ab und zu läuft ein gelber Schirm vorbei.
// 🍲 Heute ist Treffen: ein dampfender Kochtopf (bis 5 Std. nach Beginn). 🥚 Ostern (Karfreitag bis Ostermontag): bunte Eier im Gras –
// antippen, dann schlüpft ein Küken. 🦔 Herbst: ab und zu raschelt ein Igel durchs Laub. Vorschau je Extra unter ⚙️ → ✨ Effekte.
const JZB_EXTRAS = { nikolaus: "advent", regen: "", topf: "", ostern: "fruehling", igel: "herbst" }; // Extra → Jahreszeit der Vorschau ("" = die jetzige)
function jzbExtrasBestimmen() {
  const J = JZB, heute = heuteIso(), x = { igel: J.saison === "herbst" };
  x.nikolaus = heute.slice(5) === "12-06" && J.saison === "winter";
  const kf = Object.entries(feiertageNRW(+heute.slice(0, 4))).find(([, n]) => n === "Karfreitag")?.[0];
  x.ostern = !!kf && heute >= kf && heute <= tagPlus(kf, 3) && J.saison === "fruehling";
  const tr = JZ_KONTEXT.naechsterTermin(), beginn = tr ? new Date(tr.beginn) : null;
  x.topf = !!beginn && isoBerlin(beginn) === heute && Date.now() < +beginn + 5 * 3600000;
  const r = WET.r, j = r?.daten?.jetzt;
  x.regen = !!j && !!r.stand && Date.now() - new Date(r.stand) <= WETTER_VERALTET_MIN * 60000 && ["regen", "niesel", "gewitter"].includes(wetterArt(j.code).szene);
  if (J.extra) x[J.extra] = true;
  const te = !J.vorschau && themaWert("extra"); if (te === "ostern" && J.saison === "fruehling") x.ostern = true; // 2.332.0: Thema 🐣 Ostern – Eier die ganze Zeit
  J.ext = x;
  if (x.ostern && !J.eier?.length) jzbEierVerstecken();
  if (x.igel && J.igelUhr === undefined) J.igelUhr = J.extra === "igel" ? 4 : jzbZ(25, 60);
}
function jzbEierVerstecken() { // 2.332.0 (Wunsch Hansi „Thema Ostern“): der Osterhase hoppelt mit dem Korb herein und legt die Eier
  const J = JZB, n = 5, farben = [["#e63946", "#ffd166"], ["#4cc9f0", "#ffffff"], ["#b5179e", "#f9c6d6"], ["#ffb703", "#2a9d8f"], ["#80b918", "#ffffff"], ["#7b2cbf", "#ffd166"]];
  J.eier = Array.from({ length: n }, (_, i) => ({ x: JZB_RAND + 14 + (i + jzbZ(.2, .8)) * (J.w - 2 * JZB_RAND - 28) / n, f: farben[(i + J.lauf) % farben.length], kipp: jzbZ(-.35, .35), muster: i % 3, gef: false, t: 0 }));
  if (!J.gaeste.some((g) => g.typ === "osterhase")) { for (const e of J.eier) e.da = false; J.gaeste.push({ typ: "osterhase", x: J.w + 24, t: 0 }); }
}
function jzbEiAntippen(e) { // Ostereier finden: Tippen auf den Kopf (nicht auf Knöpfe) prüft, ob ein Ei getroffen wurde
  const J = JZB; if (!J.ext?.ostern || !J.eier?.length || !J.cv || e.target.closest("button, a, input, select, textarea, [data-a], [role=button]")) return;
  const r = J.s.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, k = J.k;
  const ei = J.eier.find((v) => !v.gef && v.da !== false && Math.hypot(x - v.x, y - (J.h - 7 * k)) < 18); if (!ei) return;
  ei.gef = true; ei.t = 0;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; J.fx.push({ typ: "funke", x: ei.x + Math.cos(a) * 6, y: J.h - 10 * k + Math.sin(a) * 6, vx: Math.cos(a) * 45, vy: Math.sin(a) * 45 - 20, s: jzbZ(2, 3.4), a: 1, farbe: i % 2 ? ei.f[0] : "#fff6c2" }); }
  const rest = J.eier.filter((v) => !v.gef).length;
  melde(rest ? `🥚 Ei gefunden! Noch ${rest} versteckt.` : "🐣 Alle Ostereier gefunden – frohe Ostern!");
}
// ---------- KC-CLUB-WINTER-KINDER (2.282.0, Wunsch Hansi): Eistropfen bilden unten eine Pfütze · zwei Kinder auf dem Schlitten
// (Bommelmützen, Schals wehen nach hinten; abwechselnd von links und von rechts) · ein paar Kinder machen eine Schneeballschlacht ----------
// Nur Winter und nur, wenn Schnee liegt; Schlitten und Schneeballschlacht wechseln sich ab, nie beides zugleich.
// Jacke, Mütze, Schal – 2.283.0 (Wunsch Hansi „Mütze und Schal verschiedenfarbig, z. B. grüner Schal und gelbe Mütze – jedes Kind anders“):
// kräftige, gut unterscheidbare Kombinationen; in einer Gruppe trägt nie ein Kind dieselben Farben wie ein anderes
const JZB_KIND_FARBEN = [["#2f6fd6", "#ffd21f", "#1f9d4c"], ["#d83a3a", "#1fb5d6", "#ff8c1a"], ["#1f9d4c", "#ff4fa3", "#ffd21f"], ["#7a3fb5", "#ff8c1a", "#29c46a"],
  ["#f2c230", "#d83a3a", "#2f6fd6"], ["#e8732a", "#7a3fb5", "#38d1c0"], ["#2a9d8f", "#ffffff", "#e63946"], ["#5b4cc4", "#9be564", "#ff5c8a"]];
const jzbKindFarben = (n) => { const l = JZB_KIND_FARBEN.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, n); };
const jzbSchneeMittel = () => { const J = JZB, B = J.boden, a = Math.ceil(JZB_RAND / JZB_SP), e = Math.floor((J.w - JZB_RAND) / JZB_SP), t = B.slice(a, e); return t.reduce((s, v) => s + v, 0) / Math.max(1, t.length); };
const jzbGrund = (x) => JZB.h - jzbBodenH(x) - 1;
// 💧 Eistropfen aus der Leiste: fällt auf den Boden, dort wächst langsam eine Pfütze (und trocknet sehr langsam wieder)
function jzbEisTropfen(sx, sy) {
  const J = JZB; if (!J.cv || J.saison !== "winter") return false;
  const r = J.cv.getBoundingClientRect(); if (!r.width) return false;
  (J.eisTropfen = J.eisTropfen || []).push({ x: (sx - r.left) * J.w / r.width, y: (sy - r.top) * J.h / r.height, v: 0, s: 2.4 * J.k, spur: 0 });
  return true;
}
// ❄️ 2.319.0 KC-CLUB-EISNAME (Wunsch Hansi „ab und an fällt vom größeren Eiszapfen etwas taumelnd herunter – unten wird daraus der erste
// Buchstabe des angemeldeten Users aus Glitzer-Eis, und immer so weiter, bis der ganze Name fertig ist; bei der Sonne vom Schneemann schmilzt der Name“).
// Nur im Winter auf der Bühne, der Name bleibt nur auf diesem Gerät (nichts geht an den Server). Höchstens ein Stück gleichzeitig.
const jzbEisNameText = () => String(S.ich?.vorname || String(S.ich?.name || "").split(" ")[0] || "").trim().slice(0, 12);
function jzbEisNameWill() {
  const J = JZB, txt = jzbEisNameText(); if (!J.cv || J.saison !== "winter" || !txt || J.eisStueck || J.sonne || J.raupe) return false;
  const N = J.eisName; if (N && (N.schmelz > 0 || N.n >= [...N.text].length)) return false;
  if (!J.eisErster) return (J.eisErster = true); // 2.322.0: das erste Stück gleich beim ersten Mal – man soll es auch sehen
  return Math.random() < (J.vorschau ? .7 : .5); // „ab und an“ – etwa jedes zweite Mal statt eines Tropfens
}
function jzbEisStueck(sx, sy) {
  const J = JZB; if (!J.cv || J.saison !== "winter") return false;
  const r = J.cv.getBoundingClientRect(); if (!r.width) return false;
  if (!J.eisName || J.eisName.text !== jzbEisNameText()) J.eisName = { text: jzbEisNameText(), n: 0, gelandet: [], schmelz: 0, weg: [], fertig: null };
  const x = (sx - r.left) * J.w / r.width, y = (sy - r.top) * J.h / r.height;
  J.eisStueck = { x0: x, x, y, y0: y, v: 0, t: 0, rot: 0, vr: jzbZ(3, 6) * (Math.random() < .5 ? -1 : 1), ph: jzbZ(0, 6) };
  return true;
}
function jzbEisNameLage() { // Mitte jedes Buchstabens (zentriert), Schriftgröße passend zur Bühne
  const J = JZB, N = J.eisName, c = J.ctx, fs = Math.round(Math.min(20 * J.k, J.h * .32)), z = [...N.text];
  c.save(); c.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; const b = z.map((ch) => c.measureText(ch).width + 1.5 * J.k); c.restore();
  const ges = b.reduce((a, v) => a + v, 0); let x = Math.max(JZB_RAND, (J.w - ges) / 2);
  const pos = b.map((w) => { const m = x + w / 2; x += w; return m; });
  return { fs, z, pos, y: pos.reduce((a, v) => a + jzbGrund(v), 0) / Math.max(1, pos.length) + 1 }; // gemeinsame Grundlinie (Mittel der Schneehöhe) – steht im Schnee
}
function jzbEisNameSchritt(dt) {
  if (JZB.saison !== "winter") { JZB.eisName = null; JZB.eisStueck = null; return; } // 2.356.0: nie neben dem Herbst-Namen stehen bleiben
  const J = JZB, N = J.eisName, S = J.eisStueck, k = J.k;
  if (S && N) {
    const L = jzbEisNameLage(), zx = L.pos[Math.min(N.n, L.pos.length - 1)], boden = L.y - L.fs * .45;
    S.t += dt; S.v = Math.min(95 * k, S.v + 140 * k * dt); S.y += S.v * dt; // langsamer als ein Tropfen: es taumelt
    const p = Math.min(1, (S.y - S.y0) / Math.max(1, boden - S.y0));
    S.x = S.x0 + (zx - S.x0) * jzbEase(p) + Math.sin(S.t * 5 + S.ph) * 7 * k * (1 - p); S.rot += (S.vr + Math.sin(S.t * 3) * 4) * dt;
    if (S.y >= boden) { // gelandet → der nächste Buchstabe entsteht mit Glitzer
      J.eisStueck = null; N.gelandet[N.n] = J.T; N.n++; if (N.n >= [...N.text].length) N.fertig = J.T;
      for (let i = 0; i < 10; i++) J.fx.push({ typ: "flocke", x: zx, y: boden, r: jzbZ(.6, 1.6), vx: jzbZ(-45, 45), vy: -jzbZ(20, 70), a: 1, blass: 1.6 });
    }
  }
  // 2.356.0 KC-CLUB-NAME-WEG (Wunsch Hansi „der Name soll weg sein, wenn die Schneeraupe ihn wegschiebt – dann zerspringt er in Stücke“):
  // das Schild der Raupe erreicht einen Buchstaben → er zerspringt in Eis-Scherben; sind alle weg, beginnt der Name später von vorn
  if (N && N.n && J.raupe) {
    const R = J.raupe, vorn = R.x + R.dir * 36 * k, L = jzbEisNameLage(); N.weg = N.weg || [];
    for (let i = 0; i < N.n; i++) {
      if (N.weg[i] || (R.dir > 0 ? vorn < L.pos[i] - L.fs * .3 : vorn > L.pos[i] + L.fs * .3)) continue;
      N.weg[i] = true;
      for (let q = 0; q < 16; q++) J.fx.push({ typ: "scherbe", x: L.pos[i] + jzbZ(-.35, .35) * L.fs, y: L.y - jzbZ(.1, .9) * L.fs, s: jzbZ(1.6, 3.6) * k, rot: jzbZ(0, 6.3), vr: jzbZ(-14, 14),
        vx: R.dir * jzbZ(40, 170) + jzbZ(-40, 40), vy: -jzbZ(60, 190), a: 1 });
      for (let q = 0; q < 8; q++) J.fx.push({ typ: "flocke", x: L.pos[i], y: L.y - L.fs * .3, r: jzbZ(.6, 1.6), vx: jzbZ(-60, 60), vy: -jzbZ(30, 90), a: 1, blass: 1.6 });
    }
    if (N.weg.filter(Boolean).length >= N.n) { J.eisName = null; J.eisStueck = null; }
  }
}
function jzbEisNameMalen(c) {
  const J = JZB, N = J.eisName, S = J.eisStueck, k = J.k; if (!N || J.saison !== "winter") return;
  if (N.n) {
    const L = jzbEisNameLage(), m = N.schmelz || 0;
    c.save(); c.font = `800 ${L.fs}px "Segoe UI", Roboto, Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    for (let i = 0; i < N.n; i++) {
      if (N.weg?.[i]) continue; // 2.356.0: von der Raupe zersprungen
      const x = L.pos[i], y = L.y, neu = Math.min(1, (J.T - (N.gelandet[i] ?? -9)) / .35), sc = (.4 + .6 * jzbEase(neu)) * (1 + (neu < 1 ? .15 * Math.sin(neu * Math.PI) : 0));
      c.save(); c.translate(x, y); c.scale(sc * (1 + m * .35), sc * (1 - m * .85)); c.globalAlpha = 1 - m * .55;
      const g = c.createLinearGradient(0, -L.fs, 0, 0); g.addColorStop(0, "#ffffff"); g.addColorStop(.45, "#d9f1ff"); g.addColorStop(1, "#86c8f4");
      c.strokeStyle = "rgba(40,110,180,.75)"; c.lineWidth = 2 * k; c.strokeText(L.z[i], 0, 0);
      c.fillStyle = g; c.fillText(L.z[i], 0, 0);
      c.restore();
      if (m < .6) for (let f = 0; f < 2; f++) { // Glitzer: kleine funkelnde Sterne auf dem Eis
        const a = Math.max(0, Math.sin(J.T * 3.2 + i * 2.3 + f * 1.7)), sx = x + (f ? .22 : -.18) * L.fs, sy = y - (f ? .62 : .3) * L.fs, l = (1.2 + a * 2.2) * k;
        if (a < .15) continue; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = .9 * k;
        c.beginPath(); c.moveTo(sx - l, sy); c.lineTo(sx + l, sy); c.moveTo(sx, sy - l); c.lineTo(sx, sy + l); c.stroke();
      }
    }
    c.restore();
  }
  if (S) { // das fallende, taumelnde Eisstück
    c.save(); c.translate(S.x, S.y); c.rotate(S.rot); c.scale(1.6 * k, 1.6 * k); // 2.322.0: größer, damit man es fallen sieht
    c.fillStyle = "#e6f6ff"; c.strokeStyle = "rgba(60,140,210,.9)"; c.lineWidth = .9;
    c.beginPath(); c.moveTo(0, -5); c.lineTo(3.2, -1); c.lineTo(2, 4); c.lineTo(-1.2, 5); c.lineTo(-3.2, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "rgba(255,255,255,.95)"; c.beginPath(); c.arc(-.8, -1.6, 1, 0, 7); c.fill();
    c.restore();
  }
}
// ---------- 2.320.0 KC-CLUB-WINTER-IGLU + KC-CLUB-WINTER-HUSKY (Wunsch Hansi): ab und an fährt ein Hundeschlitten mit Huskies vorbei.
// Abwechselnd mit dem Schneemann baut ein Eskimo Block für Block ein Iglu und geht hinein; dann kommt der Schlittenmann mit seinen Huskies
// heim – er wohnt dort – und geht auch hinein (Licht im Eingang). Kommt die Sonne, kommen beide heraus, fahren mit dem Gespann davon,
// und das Iglu schmilzt (wie der Schneemann und der Eis-Name). Nur Winter, nur auf der Bühne, nichts geht an den Server. ----------
const JZB_IGLU_R = 25, JZB_HUND_ABST = 15, JZB_HUNDE = 4;
function jzbIgluStart() {
  const J = JZB, k = J.k, links = Math.floor(J.lauf / 6) % 2 === 0, R = JZB_IGLU_R * k;
  const x = links ? JZB_RAND + R + 6 : J.w - JZB_RAND - R - 6, blick = links ? 1 : -1;
  J.iglu = { x, blick, R, eingang: x + blick * (R + 6 * k), drin: 0, licht: 0,
    bauer: { x: x + blick * (R + 14 * k), dir: -blick, geht: 0, sichtbar: true, farbe: ["#b5651d", "#e8d9b5"] } };
  jzbPhase("bauen");
}
function jzbHuskyStart(iglu) { // Gespann fährt quer durchs Bild – beim Iglu hält es an
  const J = JZB, k = J.k, I = J.iglu, dir = iglu && I ? -I.blick : (J.huskyDir = J.huskyDir === 1 ? -1 : 1);
  const vorne = (22 + (JZB_HUNDE - 1) * JZB_HUND_ABST + 8) * k; // Hunde liegen vor dem Schlitten
  J.husky = { dir, x: dir > 0 ? -vorne - 30 * k : J.w + vorne + 30 * k, v: 92 * k, t: 0, halt: iglu && I ? I.eingang - I.blick * 0 + (-dir) * (vorne + 6 * k) : null, steht: false,
    fahrer: { sichtbar: true, x: 0, geht: 0 }, gast: false, f: ["#2f6fd6", "#e8d9b5"] };
}
function jzbIgluSchritt(dt) {
  const J = JZB, I = J.iglu, k = J.k; if (!I) return;
  const B = I.bauer, ph = J.phase, t = J.pt, H = J.husky;
  const gehe = (p, ziel, v) => { const d = ziel - p.x; if (Math.abs(d) < 1) { p.x = ziel; p.geht = 0; return true; } p.dir = Math.sign(d); p.x += Math.sign(d) * Math.min(Math.abs(d), v * dt); p.geht += dt; return false; };
  if (ph === "stehen") {
    if (B.sichtbar && t > 1 && gehe(B, I.eingang, 34 * k)) { B.sichtbar = false; I.drin++; } // Eskimo geht ins Iglu
    if (!H && t > 5) jzbHuskyStart(true); // der Schlittenmann kommt heim
    if (H && H.steht && H.fahrer.sichtbar && (H.steht += dt) > .8 && gehe(H.fahrer, I.eingang, 34 * k)) { H.fahrer.sichtbar = false; I.drin++; }
  } else if (ph === "schmelzen") {
    if (t > .4 && I.drin) { I.drin = 0; B.sichtbar = true; B.x = I.eingang; if (H) { H.fahrer.sichtbar = true; H.fahrer.x = I.eingang; } } // die Sonne lockt beide heraus
    if (H && H.steht && !I.drin) {
      const ok1 = !B.sichtbar || gehe(B, H.x, 34 * k), ok2 = gehe(H.fahrer, H.x, 34 * k);
      if (ok1 && B.sichtbar) { B.sichtbar = false; H.gast = true; } // setzt sich in den Schlitten
      if (ok2 && !B.sichtbar && t > 1.5) { H.steht = false; H.halt = null; H.dir = I.blick; H.t = 0; } // und los – vom schmelzenden Iglu weg
    }
  }
  I.licht += ((I.drin ? 1 : 0) - I.licht) * Math.min(1, dt * 2);
}
function jzbHuskySchritt(dt) {
  const J = JZB, H = J.husky, k = J.k; if (!H) return;
  H.t += dt;
  if (H.halt !== null && !H.steht) { // abbremsen bis zum Halt
    const d = (H.halt - H.x) * H.dir; if (d <= 0) { H.x = H.halt; H.steht = .001; H.fahrer.x = H.x - H.dir * 11 * k; H.fahrer.dir = H.dir; } else H.x += H.dir * Math.min(d, Math.max(18 * k, Math.min(H.v, d * 1.6)) * dt);
  } else if (!H.steht) H.x += H.dir * H.v * dt;
  if (!H.steht && Math.random() < dt * 10) J.fx.push({ typ: "flocke", x: H.x - H.dir * 6 * k, y: jzbGrund(H.x) - 1, r: jzbZ(.7, 1.6), vx: -H.dir * jzbZ(15, 45), vy: -jzbZ(15, 40), a: 1, blass: 1.3 }); // Schneestaub
  const vorne = (22 + (JZB_HUNDE - 1) * JZB_HUND_ABST + 8) * k;
  if (!H.steht && (H.x < -vorne - 40 * k || H.x > J.w + vorne + 40 * k) && H.t > 1) { J.husky = null; J.kinderUhr = jzbZ(40, 80); }
}
function jzbFigurMalen(c, x, gy, dir, geht, f, k, arm) { // Eskimo / Schlittenmann im Pelz-Anorak mit Kapuze
  const s = Math.sin(geht * 12) * (geht ? 2.2 : 0) * k;
  c.save(); c.lineCap = "round";
  c.strokeStyle = "#3b2a1e"; c.lineWidth = 3 * k; // Stiefel
  c.beginPath(); c.moveTo(x - 2 * k, gy - 7 * k); c.lineTo(x - 2 * k + s, gy - 1); c.moveTo(x + 2 * k, gy - 7 * k); c.lineTo(x + 2 * k - s, gy - 1); c.stroke();
  c.fillStyle = f[0]; c.beginPath(); c.moveTo(x - 6 * k, gy - 6 * k); c.quadraticCurveTo(x - 6.5 * k, gy - 19 * k, x, gy - 20 * k); c.quadraticCurveTo(x + 6.5 * k, gy - 19 * k, x + 6 * k, gy - 6 * k); c.closePath(); c.fill(); // Anorak
  c.fillStyle = f[1]; c.fillRect(x - 6.2 * k, gy - 7.6 * k, 12.4 * k, 2.2 * k); // Pelzsaum
  const ax = x + dir * 5 * k, ay = gy - 15 * k, aw = arm ?? .9; c.strokeStyle = f[0]; c.lineWidth = 2.8 * k; // Arm
  c.beginPath(); c.moveTo(x + dir * 3 * k, ay); c.lineTo(ax + dir * Math.cos(aw) * 5 * k, ay + Math.sin(aw) * 5 * k); c.stroke();
  c.fillStyle = f[1]; c.beginPath(); c.arc(x, gy - 23 * k, 5.6 * k, 0, 7); c.fill(); // Kapuze mit Pelz
  c.fillStyle = "#e0a878"; c.beginPath(); c.arc(x + dir * .6 * k, gy - 23 * k, 3.6 * k, 0, 7); c.fill(); // Gesicht
  c.fillStyle = "#2b2b2b"; c.beginPath(); c.arc(x + dir * 1.8 * k, gy - 23.6 * k, .55 * k, 0, 7); c.fill(); c.beginPath(); c.arc(x - dir * .4 * k, gy - 23.6 * k, .55 * k, 0, 7); c.fill();
  c.strokeStyle = "#8a3b2b"; c.lineWidth = .7 * k; c.beginPath(); c.arc(x + dir * .7 * k, gy - 22.4 * k, 1.2 * k, .2, Math.PI - .2); c.stroke(); // Lächeln
  c.restore();
}
function jzbHundMalen(c, x, gy, dir, lauf, k, liegt) { // Husky von der Seite: grau mit weißem Bauch, Spitzohren, Ringelschwanz
  c.save(); c.translate(x, gy); c.scale(dir * k, k); c.lineCap = "round";
  const p = lauf * 14, b = liegt ? 0 : Math.sin(p) * 1.2;
  if (!liegt) { c.strokeStyle = "#5d6670"; c.lineWidth = 1.8; for (const [lx, o] of [[-4.5, 0], [-3, Math.PI], [3.5, Math.PI], [5, 0]]) { const w = Math.sin(p + o) * 2.6; c.beginPath(); c.moveTo(lx, -5 + b); c.lineTo(lx + w, -.5); c.stroke(); } }
  const y = liegt ? -2.6 : -6.5 + b;
  c.strokeStyle = "#5d6670"; c.lineWidth = 1.8; c.beginPath(); c.arc(-7.5, y - 2.5, 2.6, Math.PI * .4, Math.PI * 1.7 + (liegt ? Math.sin(JZB.T * 9) * .3 : 0)); c.stroke(); // Ringelschwanz
  c.fillStyle = "#7f8a95"; c.beginPath(); c.ellipse(0, y, 7.5, 3.6, 0, 0, 7); c.fill();
  c.fillStyle = "#f2f4f6"; c.beginPath(); c.ellipse(.5, y + 1.6, 5.2, 1.8, 0, 0, 7); c.fill();
  const hx = 7.2, hy = y - (liegt ? 1.5 : 3.2); c.fillStyle = "#7f8a95"; c.beginPath(); c.arc(hx, hy, 3, 0, 7); c.fill(); // Kopf
  c.beginPath(); c.moveTo(hx - 2, hy - 2); c.lineTo(hx - 1.2, hy - 5.4); c.lineTo(hx + .2, hy - 2.4); c.moveTo(hx + .4, hy - 2.4); c.lineTo(hx + 1.6, hy - 5.4); c.lineTo(hx + 2.4, hy - 1.8); c.fill(); // Ohren
  c.fillStyle = "#f2f4f6"; c.beginPath(); c.ellipse(hx + 2.2, hy + 1, 2.2, 1.4, 0, 0, 7); c.fill(); // Schnauze hell
  c.fillStyle = "#222"; c.beginPath(); c.arc(hx + 4.2, hy + .6, .7, 0, 7); c.fill(); c.beginPath(); c.arc(hx + 1, hy - .6, .55, 0, 7); c.fill(); // Nase, Auge
  c.strokeStyle = "#c62828"; c.lineWidth = 1; c.beginPath(); c.moveTo(4.5, y - 3); c.lineTo(5, y + 3); c.stroke(); // Geschirr
  c.restore();
}
function jzbGespannMalen(c, H) {
  const J = JZB, k = J.k, d = H.dir, gy = jzbGrund(H.x) + .5, lauf = H.steht ? 0 : J.T;
  const hund = (i) => H.x + d * (22 + i * JZB_HUND_ABST) * k;
  c.save(); c.strokeStyle = "#8b5a2b"; c.lineWidth = .9 * k; c.beginPath(); c.moveTo(H.x + d * 8 * k, gy - 5 * k); c.lineTo(hund(JZB_HUNDE - 1), gy - 6 * k); c.stroke(); c.restore(); // Zugleine
  for (let i = JZB_HUNDE - 1; i >= 0; i--) jzbHundMalen(c, hund(i), jzbGrund(hund(i)) + .5 + (i % 2 ? .8 : 0) * k, d, lauf + i * .37, k, !!H.steht);
  c.save(); c.lineCap = "round"; c.strokeStyle = "#5a3a1c"; c.lineWidth = 1.4 * k; // Kufen mit hochgebogener Spitze
  c.beginPath(); c.moveTo(H.x - d * 10 * k, gy - 1); c.lineTo(H.x + d * 8 * k, gy - 1); c.quadraticCurveTo(H.x + d * 12 * k, gy - 1, H.x + d * 11 * k, gy - 5 * k); c.stroke();
  c.fillStyle = "#a8743a"; c.fillRect(Math.min(H.x - d * 8 * k, H.x + d * 7 * k), gy - 7 * k, 15 * k, 3.4 * k); // Ladefläche
  c.strokeStyle = "#7a4f24"; c.beginPath(); c.moveTo(H.x - d * 9 * k, gy - 1); c.lineTo(H.x - d * 9 * k, gy - 15 * k); c.lineTo(H.x - d * 5 * k, gy - 15 * k); c.stroke(); // Haltebügel
  c.restore();
  if (H.gast) jzbFigurMalen(c, H.x + d * 2 * k, gy - 6 * k, d, 0, ["#b5651d", "#e8d9b5"], k * .85, -.4); // der Eskimo sitzt im Schlitten
  if (H.fahrer.sichtbar && !H.steht) jzbFigurMalen(c, H.x - d * 11 * k, gy - 2 * k, d, 0, H.f, k, -.9); // Schlittenmann steht hinten auf den Kufen
}
function jzbIgluMalen(c) {
  const J = JZB, I = J.iglu, k = J.k, x = I.x, gy = J.h - 1 - Math.min(jzbBodenH(x), 6 * k) * .5, R = I.R, Hh = 21 * k, reihen = 5;
  const bau = J.phase === "bauen" ? Math.min(1, J.pt / 7.5) : 1, schmelz = J.phase === "schmelzen" ? jzbEase((J.pt - JZB_SONNE) / JZB_SCHMELZ) : 0;
  c.save();
  if (schmelz) { c.fillStyle = `rgba(200,225,255,${.55 * (1 - schmelz * .6)})`; c.beginPath(); c.ellipse(x, gy, R * (1 + .5 * schmelz), 3 * k, 0, 0, 7); c.fill();
    c.translate(x, gy); c.scale(1 + .25 * schmelz, 1 - .9 * schmelz); c.translate(-x, -gy); c.globalAlpha = 1 - schmelz * .7; }
  const fertig = Math.floor(bau * reihen + 1e-6), teil = bau * reihen - fertig, hoehe = Hh * Math.min(1, (fertig + teil) / reihen);
  c.save(); c.beginPath(); c.rect(x - R - 20 * k, gy - hoehe, 2 * R + 40 * k, hoehe + 2); c.clip();
  const g = c.createLinearGradient(x - R, gy - Hh, x + R, gy); g.addColorStop(0, "#ffffff"); g.addColorStop(.6, "#e6f2fb"); g.addColorStop(1, "#b9d6ef");
  // Eingangstunnel
  const ex = x + I.blick * R * .78; c.fillStyle = g; c.beginPath(); c.ellipse(ex + I.blick * 3 * k, gy, 9 * k, 10 * k, 0, Math.PI, 0); c.fill();
  c.fillStyle = g; c.beginPath(); c.ellipse(x, gy, R, Hh, 0, Math.PI, 0); c.fill(); // Kuppel
  c.strokeStyle = "rgba(120,160,200,.75)"; c.lineWidth = .8 * k;
  for (let i = 1; i < reihen; i++) { const h = Hh * i / reihen, w = R * Math.sqrt(1 - (h / Hh) ** 2); c.beginPath(); c.moveTo(x - w, gy - h); c.lineTo(x + w, gy - h); c.stroke(); } // Blockreihen
  for (let i = 0; i < reihen; i++) { const h0 = Hh * i / reihen, h1 = Hh * (i + 1) / reihen, w = R * Math.sqrt(1 - (h0 / Hh) ** 2), n = Math.max(2, Math.round(w / (7 * k)));
    for (let j = 1; j < n * 2; j++) { const xx = x - w + (j + (i % 2 ? .5 : 0)) * w / n; if (Math.abs(xx - x) > R * Math.sqrt(1 - (h1 / Hh) ** 2) && i) continue; c.beginPath(); c.moveTo(xx, gy - h0); c.lineTo(xx, gy - h1); c.stroke(); } }
  c.fillStyle = `rgba(${Math.round(55 + 200 * I.licht)},${Math.round(70 + 130 * I.licht)},${Math.round(90 + 0 * I.licht)},.92)`; // Eingang – mit Licht, wenn jemand drin ist
  c.beginPath(); c.ellipse(ex + I.blick * 9 * k, gy, 4.2 * k, 6.5 * k, 0, Math.PI, 0); c.fill();
  if (I.licht > .05) { const gl = c.createRadialGradient(ex + I.blick * 10 * k, gy - 3 * k, 1, ex + I.blick * 10 * k, gy - 3 * k, 14 * k); gl.addColorStop(0, `rgba(255,200,90,${.45 * I.licht})`); gl.addColorStop(1, "rgba(255,200,90,0)"); c.fillStyle = gl; c.beginPath(); c.arc(ex + I.blick * 10 * k, gy - 3 * k, 14 * k, 0, 7); c.fill(); }
  c.restore();
  if (J.phase === "bauen" && bau < 1) { const bx = x + I.blick * (R * .5) * (1 - 2 * ((fertig + teil) % 1)), by = gy - hoehe; c.fillStyle = "#f4f9fd"; c.strokeStyle = "rgba(120,160,200,.9)"; c.lineWidth = .7 * k; c.fillRect(bx - 3.5 * k, by - 2.8 * k, 7 * k, 3.6 * k); c.strokeRect(bx - 3.5 * k, by - 2.8 * k, 7 * k, 3.6 * k); } // Block wird gesetzt
  c.restore();
}
function jzbIgluLeuteMalen(c) { // Eskimo am Iglu und das Gespann (vor dem Iglu)
  const J = JZB, I = J.iglu, H = J.husky, k = J.k;
  if (H) jzbGespannMalen(c, H);
  if (I && I.bauer.sichtbar) { const B = I.bauer, bauen = J.phase === "bauen"; jzbFigurMalen(c, B.x, jzbGrund(B.x) + .5, B.dir, B.geht, B.farbe, k, bauen ? -.6 + Math.sin(J.T * 4) * .8 : .9); }
  if (H && H.steht && H.fahrer.sichtbar) jzbFigurMalen(c, H.fahrer.x, jzbGrund(H.fahrer.x) + .5, H.fahrer.dir || H.dir, H.fahrer.geht, H.f, k);
}
function jzbWinterKinder(dt) {
  const J = JZB, k = J.k;
  jzbEisNameSchritt(dt); // 2.319.0 KC-CLUB-EISNAME
  for (const t of J.eisTropfen || []) {
    t.v = Math.min(260, t.v + 520 * dt); t.y += t.v * dt; t.spur = Math.min(12 * k, t.spur + t.v * dt * .4);
    if (t.y >= jzbGrund(t.x)) {
      t.weg = true; const P = (J.eisPfuetzen = J.eisPfuetzen || []), p = P.find((q) => Math.abs(q.x - t.x) < q.r + 6 * k);
      if (p) { p.r = Math.min(22 * k, p.r + 1.6 * k); p.ringe.push(0); } else P.push({ x: t.x, r: 4 * k, ringe: [0] });
      for (let i = 0; i < 4; i++) J.fx.push({ typ: "wasser", x: t.x, y: jzbGrund(t.x) - 1, vx: jzbZ(-30, 30), vy: -jzbZ(30, 60), a: 1, blass: 2.5 });
    }
  }
  if (J.eisTropfen) J.eisTropfen = J.eisTropfen.filter((t) => !t.weg);
  for (const p of J.eisPfuetzen || []) { p.r -= dt * .04 * k; p.ringe = p.ringe.map((g) => g + dt * 1.4).filter((g) => g < 1); } // trocknet ganz langsam
  if (J.eisPfuetzen) J.eisPfuetzen = J.eisPfuetzen.filter((p) => p.r > .5);
  if (J.saison !== "winter") return;
  // wann kommen die Kinder? – erst wenn Schnee liegt; abwechselnd Schlitten / Schneeballschlacht
  jzbPiste(dt); // 2.318.0 KC-CLUB-WINTER-PISTE
  jzbIgluSchritt(dt); jzbHuskySchritt(dt); // 2.320.0 KC-CLUB-WINTER-IGLU / -HUSKY
  if (!J.schlitten && !J.ballspiel && !J.raupe && !J.ski && !J.husky && !J.iglu && (J.kinderUhr = (J.kinderUhr ?? (J.vorschau ? 4 : jzbZ(15, 30))) - dt) <= 0) {
    if (jzbSchneeMittel() < 3 * k || J.phase === "wind" || J.phase === "schmelzen") J.kinderUhr = 5;
    else if ((J.kinderArt = J.kinderArt === "schlitten" ? "ball" : J.kinderArt === "ball" ? "husky" : "schlitten") === "husky") jzbHuskyStart(); // 2.320.0: ab und an ein Hundegespann
    else if (J.kinderArt === "schlitten") {
      const dir = J.schlittenDir = J.schlittenDir === 1 ? -1 : 1; // einmal von links, beim nächsten Mal von rechts
      J.schlitten = { dir, x: dir > 0 ? -40 * k : J.w + 40 * k, t: 0, f: jzbKindFarben(2) };
    } else jzbBallspielStart();
  }
  if (J.schlitten) {
    const s = J.schlitten; s.t += dt; s.x += s.dir * 78 * k * dt;
    if (Math.random() < dt * 14) J.fx.push({ typ: "flocke", x: s.x - s.dir * 18 * k, y: jzbGrund(s.x) - 2, r: jzbZ(.8, 1.8), vx: -s.dir * jzbZ(20, 60), vy: -jzbZ(20, 50), a: 1, blass: 1.2 }); // Schneestaub
    if (s.x < -60 * k || s.x > J.w + 60 * k) { J.schlitten = null; J.kinderUhr = jzbZ(45, 90); }
  }
  if (J.ballspiel) jzbBallspielSchritt(dt);
}
function jzbBallspielStart() {
  const J = JZB, k = J.k, m = J.mann, links = m && m.x < J.w / 2, rechts = m && m.x >= J.w / 2;
  const plaetze = [[links ? .3 : .16, 1], [links ? .42 : .3, 1], [rechts ? .7 : .84, -1]].concat(J.w > 520 ? [[rechts ? .58 : .7, -1]] : []);
  const farben = jzbKindFarben(plaetze.length);
  J.ballspiel = { t: 0, baelle: [], kinder: plaetze.map(([p, blick], i) => ({ ziel: J.w * p, x: blick > 0 ? -20 * k - i * 14 * k : J.w + 20 * k + i * 14 * k, blick, f: farben[i], uhr: jzbZ(.8, 2), wurf: 0, treffer: 0 })) };
}
function jzbBallspielSchritt(dt) {
  const J = JZB, k = J.k, S = J.ballspiel, g = 260 * k; S.t += dt;
  const geht = S.geht = S.t > 16;
  for (const c of S.kinder) {
    c.wurf = Math.max(0, c.wurf - dt); c.treffer = Math.max(0, c.treffer - dt);
    const soll = geht ? (c.blick > 0 ? -40 * k : J.w + 40 * k) : c.ziel, d = soll - c.x;
    c.laeuft = Math.abs(d) > 1; if (c.laeuft) c.x += Math.sign(d) * Math.min(Math.abs(d), (geht ? 95 : 55) * k * dt);
    if (!geht && !c.laeuft && (c.uhr -= dt) <= 0) { // werfen: im Bogen auf ein Kind der anderen Seite – nicht jeder Wurf trifft
      const geg = S.kinder.filter((o) => o.blick !== c.blick && !o.laeuft); c.uhr = jzbZ(1.3, 2.6); if (!geg.length) continue;
      const o = jzbW(geg), T = jzbZ(.8, 1.1), tx = o.x + (Math.random() < .6 ? 0 : jzbZ(-14, 14) * k), x0 = c.x + c.blick * 3 * k, y0 = jzbGrund(c.x) - 30 * k, ty = jzbGrund(tx) - 14 * k;
      c.wurf = .35; S.baelle.push({ x: x0, y: y0, vx: (tx - x0) / T, vy: (ty - y0) / T - .5 * g * T, ziel: o, tx });
    }
  }
  for (const b of S.baelle) {
    b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    const o = b.ziel, triff = Math.abs(b.x - o.x) < 5 * k && b.y > jzbGrund(o.x) - 26 * k && b.y < jzbGrund(o.x) - 4 * k;
    if (triff || b.y >= jzbGrund(b.x)) { b.weg = true; if (triff) o.treffer = .45;
      for (let i = 0; i < 9; i++) J.fx.push({ typ: "flocke", x: b.x, y: b.y, r: jzbZ(.7, 1.8), vx: jzbZ(-60, 60), vy: -jzbZ(10, 70), a: 1, blass: 1.6 }); } // Schnee stäubt
  }
  S.baelle = S.baelle.filter((b) => !b.weg);
  if (geht && S.kinder.every((c) => c.x < -30 * k || c.x > J.w + 30 * k)) { J.ballspiel = null; J.kinderUhr = jzbZ(45, 90); }
}
// Kind von der Seite: f = [Jacke, Mütze, Schal]; sitzt (Schlitten) oder steht; Schal weht nach hinten
function jzbKind(c, f, sitzt, opt = {}) {
  const T = JZB.T, wehen = opt.wehen ?? .3, ph = opt.ph || 0;
  c.lineCap = "round"; c.lineJoin = "round";
  if (sitzt) { c.strokeStyle = "#2b3550"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -6); c.lineTo(7, -5); c.lineTo(9, -2); c.stroke(); } // Beine nach vorn
  else { const s = opt.laeuft ? Math.sin(T * 14 + ph) * 3 : 0; c.strokeStyle = "#2b3550"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-1.5, -8); c.lineTo(-1.5 - s, 0); c.moveTo(1.5, -8); c.lineTo(1.5 + s, 0); c.stroke(); }
  const ky = sitzt ? -6 : -8; // Jacke
  // 2.318.0 (Fund Hansi „die Kinder bei der Schneeballschlacht haben keine Arme“): die Arme lagen in Jackenfarbe auf der Jacke – jetzt
  // zwei richtige Arme mit dunklem Rand und Fäustlingen; beim Werfen holt der vordere Arm mit dem Schneeball weit nach hinten aus und schleudert nach vorn
  const arm = (a, vorn) => { const sx = vorn ? 1 : -1, sy = ky - 9.5, L = 7.2, ex = sx + Math.sin(a) * L, ey = sy + Math.cos(a) * L, mx = sx + Math.sin(a) * L * .5 + (vorn ? .6 : -.4), my = sy + Math.cos(a) * L * .5;
    c.strokeStyle = "rgba(20,25,40,.55)"; c.lineWidth = 3.6; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    c.strokeStyle = f[0]; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    c.fillStyle = f[2]; c.beginPath(); c.arc(ex, ey, 1.6, 0, 7); c.fill(); return [ex, ey]; };
  const sw = opt.laeuft ? Math.sin(T * 14 + (opt.ph || 0)) * .6 : 0;
  let aV = opt.arm === "vor" ? 1.45 : .35 + sw, aH = opt.arm === "vor" ? 1.25 : -.2 - sw;
  if (opt.ausholen) { aV = .35 - opt.ausholen * 2.75; aH = -.2 + opt.ausholen * .9; } // Ball in der Hand, Arm weit nach hinten oben
  if (opt.wurf) { const p = jzbEase(opt.wurf); aV = -2.4 + p * 4.1; aH = .7 - p * 1.1; } // Wurf: von hinten oben schnell nach vorn
  arm(aH, false); // hinterer Arm (hinter der Jacke)
  c.fillStyle = f[0]; c.beginPath(); c.ellipse(0, ky - 6, 4.6, 6.4, 0, 0, 7); c.fill();
  c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(-1.4, ky - 5, 2.4, 5.4, 0, 0, 7); c.fill(); // etwas Schatten, damit der vordere Arm sich abhebt
  const hand = arm(aV, true);
  if (opt.ausholen) { c.fillStyle = "#ffffff"; c.strokeStyle = "rgba(160,190,220,.9)"; c.lineWidth = .6; c.beginPath(); c.arc(hand[0], hand[1] - 1.2, 2, 0, 7); c.fill(); c.stroke(); }
  const hy = ky - 15; // Kopf
  c.fillStyle = "#f6cba6"; c.beginPath(); c.arc(0, hy, 4.4, 0, 7); c.fill();
  c.fillStyle = "#3a2a1a"; c.beginPath(); c.arc(2.2, hy - .4, .6, 0, 7); c.fill();
  c.strokeStyle = "#a0523a"; c.lineWidth = .7; c.beginPath(); c.arc(2, hy + 1.3, 1.2, .2, Math.PI * .8); c.stroke(); // Lächeln
  c.fillStyle = "rgba(255,120,120,.5)"; c.beginPath(); c.arc(2.6, hy + 1.2, 1, 0, 7); c.fill();
  // Bommelmütze: Kappe mit Bündchen, Bommel hüpft und neigt sich nach hinten
  c.fillStyle = f[1]; c.beginPath(); c.moveTo(-4.8, hy - .8); c.quadraticCurveTo(-4.6, hy - 7.2, .4, hy - 7.2); c.quadraticCurveTo(4.8, hy - 6.4, 4.8, hy - .8); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(-4.8, hy - 2.2, 9.6, 1.4);
  const bx = -2.6 - wehen * 2.4, by = hy - 8 + Math.sin(T * 9 + ph) * .5;
  c.fillStyle = f[1]; c.beginPath(); c.arc(bx, by, 2, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.arc(bx - .5, by - .6, .8, 0, 7); c.fill();
  // Schal: um den Hals, zwei Enden flattern nach hinten (je schneller, desto waagrechter)
  const sy = hy + 4.6; c.fillStyle = f[2]; c.beginPath(); c.ellipse(0, sy, 4, 1.6, 0, 0, 7); c.fill();
  c.strokeStyle = f[2]; c.lineWidth = 2;
  for (const [l, v] of [[9, 0], [7, 1.7]]) { c.beginPath(); c.moveTo(-2.6, sy);
    for (let i = 1; i <= 4; i++) { const u = i / 4; c.lineTo(-2.6 - u * l * (.35 + wehen), sy + u * l * (1 - wehen) * .9 + Math.sin(T * 12 + ph + v + u * 4) * wehen * 2.2 * u); }
    c.stroke(); }
}
function jzbSchlittenMalen(c, s, k) {
  const x = s.x, y = jzbGrund(x) + 1, hops = Math.abs(Math.sin(s.t * 7)) * .8;
  c.save(); c.translate(x, y - hops); c.scale(s.dir * k * 1.2, k * 1.2);
  c.strokeStyle = "#7a4a22"; c.lineWidth = 1.6; c.lineCap = "round"; // Kufen mit hochgebogener Spitze
  for (const z of [0, 1.2]) { c.beginPath(); c.moveTo(-20, -1 - z); c.lineTo(13, -1 - z); c.quadraticCurveTo(20, -1 - z, 19, -7 - z); c.stroke(); }
  c.strokeStyle = "#7a4a22"; c.lineWidth = 1.2; for (const sx of [-15, -3, 9]) { c.beginPath(); c.moveTo(sx, -1); c.lineTo(sx, -5); c.stroke(); }
  c.fillStyle = "#c08447"; c.fillRect(-19, -6.4, 30, 2.6); c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-19, -6.4, 30, .8);
  c.strokeStyle = "#a3492f"; c.lineWidth = .8; c.beginPath(); c.moveTo(18, -7); c.quadraticCurveTo(14, -12, 9, -13); c.stroke(); // Zugseil
  c.save(); c.translate(-9, -5); jzbKind(c, s.f[1], true, { wehen: .85, ph: 1.3, arm: "vor" }); c.restore(); // hinten
  c.save(); c.translate(4, -5); jzbKind(c, s.f[0], true, { wehen: .85, arm: "vor" }); c.restore(); // vorn hält das Seil
  c.restore();
}
function jzbBallspielMalen(c, S, k) {
  for (const [i, ki] of S.kinder.entries()) {
    const zuck = ki.treffer ? Math.sin(ki.treffer * 40) * 1.5 : 0;
    c.save(); c.translate(ki.x + zuck, jzbGrund(ki.x) + 1); c.scale(ki.blick * k * 1.15, k * 1.15); c.rotate(ki.treffer ? -.15 : 0);
    jzbKind(c, ki.f, false, { wehen: ki.laeuft ? .55 : .2, ph: i * 1.7, wurf: ki.wurf > 0 ? 1 - ki.wurf / .35 : 0, laeuft: ki.laeuft,
      ausholen: !ki.wurf && !ki.laeuft && !S.geht && ki.uhr < .55 ? Math.min(1, (.55 - ki.uhr) / .3) : 0 });
    c.restore();
  }
  c.fillStyle = "#ffffff"; c.strokeStyle = "rgba(160,190,220,.8)"; c.lineWidth = .6;
  for (const b of S.baelle) { c.beginPath(); c.arc(b.x, b.y, 2.3 * k, 0, 7); c.fill(); c.stroke(); }
}
function jzbWinterKinderMalen(c) {
  const J = JZB, k = J.k;
  for (const p of J.eisPfuetzen || []) { // Pfütze auf dem Schnee bzw. Boden – blau schimmernd, mit Ringen, wenn ein Tropfen fällt
    const y = jzbGrund(p.x) + .5;
    c.fillStyle = "rgba(95,165,235,.55)"; c.beginPath(); c.ellipse(p.x, y, p.r, Math.max(1.4 * k, p.r * .22), 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(p.x - p.r * .3, y - p.r * .06, p.r * .32, Math.max(.5, p.r * .05), 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = .8;
    for (const g of p.ringe) { c.globalAlpha = 1 - g; c.beginPath(); c.ellipse(p.x, y, 2 + g * p.r * .8, (2 + g * p.r * .8) * .22, 0, 0, 7); c.stroke(); }
    c.globalAlpha = 1;
  }
  for (const t of J.eisTropfen || []) jzbTropfenMalen(c, t);
  jzbEisNameMalen(c); // 2.319.0 KC-CLUB-EISNAME
  jzbIgluLeuteMalen(c); // 2.320.0
  if (J.schlitten) jzbSchlittenMalen(c, J.schlitten, k);
  if (J.ballspiel) jzbBallspielMalen(c, J.ballspiel, k);
  jzbPisteMalen(c);
}
// ---------- KC-CLUB-WINTER-PISTE (2.318.0, Wunsch Hansi): ab und an fährt eine Schneeraupe (Pistenraupe) vorbei und glättet die
// Schneehügel – vorn schiebt das Schild den Schnee glatt, hinten zieht die Fräse ein Rillenmuster. Ein paar Minuten später wedeln zwei
// Skifahrer in verschiedenfarbigen Anzügen über die frisch präparierte Piste. Nur Winter, nur wenn Schnee liegt, nie zugleich mit den Kindern.
const JZB_SKI_FARBEN = [["#e63946", "#ffffff"], ["#1d6fe0", "#ffd21f"], ["#2bb24c", "#ff4fa3"], ["#ffb703", "#1d3557"], ["#9b2fd6", "#38d1c0"], ["#ff6f1a", "#2f6fd6"], ["#ff4fa3", "#ffffff"], ["#14a3a3", "#ffd166"]];
const jzbPisteFrei = () => { const J = JZB; return !J.schlitten && !J.ballspiel && !J.besuch && !J.mann && !J.iglu && !J.husky && (J.phase === "fallen" || J.phase === "stehen") && jzbSchneeMittel() >= 3 * J.k; };
function jzbPiste(dt) {
  const J = JZB, k = J.k, B = J.boden;
  if (J.rillen) { J.rillen.t += dt; if (J.rillen.t > 120 || J.phase === "wind" || J.phase === "besuch") J.rillen = null; }
  if (!J.raupe && !J.ski) {
    const nameFertig = J.eisName?.fertig != null && J.T - J.eisName.fertig > (J.vorschau ? 15 : 75); // 2.356.0: dann kommt die Raupe und schiebt ihn weg
    if (nameFertig && J.raupeUhr > 3) J.raupeUhr = 3;
    if ((J.raupeUhr = (J.raupeUhr ?? (J.extra === "raupe" ? 2 : jzbZ(60, 150))) - dt) <= 0) {
      if (!jzbPisteFrei()) J.raupeUhr = 6;
      else { const dir = J.raupeDir = J.raupeDir === 1 ? -1 : 1; J.raupe = { dir, x: dir > 0 ? -70 * k : J.w + 70 * k, t: 0, eben: jzbSchneeMittel() }; J.rillen = null; }
    }
    if (J.skiUhr !== undefined && J.skiUhr !== null && (J.skiUhr -= dt) <= 0) {
      if (jzbSchneeMittel() < 3 * k || J.schlitten || J.ballspiel || J.besuch || J.husky || J.iglu || J.phase === "wind" || J.phase === "schmelzen") J.skiUhr = 8;
      else { const dir = Math.random() < .5 ? 1 : -1, f = JZB_SKI_FARBEN.slice().sort(() => Math.random() - .5).slice(0, 2); J.skiUhr = null;
        J.ski = { dir, t: 0, fahrer: f.map((farbe, i) => ({ x: dir > 0 ? -30 * k - i * 70 * k : J.w + 30 * k + i * 70 * k, f: farbe, ph: i * 1.9 })) }; }
    }
  }
  if (J.raupe) {
    const R = J.raupe; R.t += dt; R.x += R.dir * 42 * k * dt;
    const vorn = R.x + R.dir * 34 * k, hinten = R.x - R.dir * 30 * k, a = Math.min(vorn, hinten), b = Math.max(vorn, hinten);
    for (let i = Math.max(0, Math.floor(a / JZB_SP)); i <= Math.min(B.length - 1, Math.ceil(b / JZB_SP)); i++) {
      const d = B[i] - R.eben; if (Math.abs(d) < .05) continue; B[i] -= d * Math.min(1, dt * 6); // Hügel abtragen, Mulden auffüllen
      if (d > 1.5 * k && J.fx.length < 170 && Math.random() < dt * 8) J.fx.push({ typ: "flocke", x: i * JZB_SP, y: J.h - B[i] - 2, r: jzbZ(.8, 1.8), vx: R.dir * jzbZ(30, 80), vy: -jzbZ(20, 60), a: 1, blass: 1.4 }); // Schnee vor dem Schild
    }
    const rx = R.x - R.dir * 32 * k; if (jzbImFeld(rx)) { if (!J.rillen) J.rillen = { von: rx, bis: rx, t: 0 }; J.rillen.von = Math.min(J.rillen.von, rx); J.rillen.bis = Math.max(J.rillen.bis, rx); }
    if (R.x < -90 * k || R.x > J.w + 90 * k) { J.raupe = null; J.raupeUhr = jzbZ(300, 480); J.skiUhr = J.extra === "raupe" ? 4 : jzbZ(120, 200); } // „ein paar Minuten später“: die Skifahrer
  }
  if (J.ski) {
    const S = J.ski; S.t += dt;
    for (const f of S.fahrer) {
      f.x += S.dir * 105 * k * dt; f.dreh = Math.sin(S.t * 5.2 + f.ph); // wedeln: Schwung links, Schwung rechts
      if (Math.abs(f.dreh) > .85 && J.fx.length < 170 && Math.random() < dt * 30) J.fx.push({ typ: "flocke", x: f.x - S.dir * 6 * k, y: jzbGrund(f.x) - 1, r: jzbZ(.7, 1.6), vx: -S.dir * jzbZ(20, 60) + f.dreh * 25, vy: -jzbZ(25, 70), a: 1, blass: 1.6 }); // Schnee spritzt in der Kurve
    }
    if (S.fahrer.every((f) => f.x < -60 * k || f.x > J.w + 60 * k)) J.ski = null;
  }
}
function jzbRaupeMalen(c, R, k) {
  const J = JZB, y = J.h - R.eben, wipp = Math.sin(R.t * 9) * .3;
  c.save(); c.translate(R.x, y + 1 + wipp); c.scale(R.dir * k, k); c.lineJoin = "round"; c.lineCap = "round";
  // Kette mit Laufrollen
  c.fillStyle = "#2b2f38"; c.beginPath(); c.roundRect(-26, -9, 52, 9, 4.5); c.fill();
  c.fillStyle = "#59606e"; for (const rx of [-21, -12, -3, 6, 15, 21]) { c.beginPath(); c.arc(rx, -4.5, 2.6, 0, 7); c.fill(); }
  c.strokeStyle = "#454b57"; c.lineWidth = .8; const lauf = (R.t * 42) % 4;
  for (let gx = -24 + lauf; gx < 25; gx += 4) { c.beginPath(); c.moveTo(gx, -9); c.lineTo(gx, -8); c.moveTo(gx, -.8); c.lineTo(gx, 0); c.stroke(); }
  // Aufbau (rot) mit Motorhaube vorn
  c.fillStyle = "#d62828"; c.beginPath(); c.moveTo(-24, -9); c.lineTo(-24, -17); c.lineTo(10, -17); c.lineTo(22, -14); c.lineTo(24, -9); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-24, -17, 46, 1.4);
  // Fahrerhaus mit Fenstern
  c.fillStyle = "#c01f1f"; c.beginPath(); c.moveTo(-14, -17); c.lineTo(-13, -30); c.lineTo(4, -30); c.lineTo(10, -17); c.closePath(); c.fill();
  c.fillStyle = "#bfe3ff"; c.beginPath(); c.moveTo(-11, -19); c.lineTo(-10.5, -28); c.lineTo(-3, -28); c.lineTo(-3, -19); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-1, -19); c.lineTo(-1, -28); c.lineTo(3, -28); c.lineTo(7.4, -19); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(-9.5, -27, 1.2, 6);
  c.fillStyle = "#f6cba6"; c.beginPath(); c.arc(1.6, -24.5, 1.8, 0, 7); c.fill(); c.fillStyle = "#1d3557"; c.fillRect(-.2, -27, 3.6, 1.2); // Fahrer mit Mütze
  // Rundumleuchte (blinkt)
  const an = Math.sin(R.t * 12) > 0; c.fillStyle = an ? "#ffb000" : "#a86a00"; c.beginPath(); c.roundRect(-6, -33, 4, 3, 1); c.fill();
  if (an) { c.fillStyle = "rgba(255,176,0,.28)"; c.beginPath(); c.arc(-4, -31.5, 7, 0, 7); c.fill(); }
  // Schild vorn (gewölbt) und Fräse hinten
  c.fillStyle = "#e9edf2"; c.strokeStyle = "#8a96a8"; c.lineWidth = .8; c.beginPath(); c.moveTo(28, -13); c.quadraticCurveTo(33, -7, 30, 0); c.lineTo(34, 0); c.quadraticCurveTo(37, -7, 32, -14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "#5b6272"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(24, -11); c.lineTo(29, -10); c.stroke();
  c.fillStyle = "#3d4350"; c.beginPath(); c.roundRect(-36, -7, 9, 6, 2); c.fill(); c.strokeStyle = "#3d4350"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-27, -5); c.lineTo(-24, -6); c.stroke();
  c.strokeStyle = "#c9d2de"; c.lineWidth = .6; for (let fx = -35; fx < -28; fx += 1.6) { c.beginPath(); c.moveTo(fx, -1); c.lineTo(fx, .8); c.stroke(); }
  c.restore();
}
function jzbSkiMalen(c, f, dir, k) {
  const J = JZB, y = jzbGrund(f.x) + 1, d = f.dreh || 0, kipp = d * .22, hoch = Math.abs(d) * 1.2;
  c.save(); c.translate(f.x, y - hoch); c.scale(dir * k * 1.15, k * 1.15); c.lineCap = "round"; c.lineJoin = "round";
  // Skier (vorne hochgebogen), leicht schräg im Schwung
  c.save(); c.rotate(d * .06); c.strokeStyle = f.f[0]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-13, 0); c.lineTo(11, 0); c.quadraticCurveTo(15, 0, 15, -3); c.stroke();
  c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = .6; c.beginPath(); c.moveTo(-13, .9); c.lineTo(12, .9); c.stroke(); c.restore();
  c.rotate(kipp); // ganzer Körper legt sich in die Kurve
  // Beine gebeugt (Hosen etwas dunkler), Skischuhe
  c.strokeStyle = "#20263a"; c.lineWidth = 3; c.beginPath(); c.moveTo(-1, -1); c.lineTo(3, -7); c.lineTo(-1, -13); c.stroke();
  c.strokeStyle = f.f[0]; c.lineWidth = 3.1; c.beginPath(); c.moveTo(1, -1); c.lineTo(5, -7); c.lineTo(1, -13); c.stroke();
  c.fillStyle = "#20263a"; c.fillRect(-2.5, -2.4, 5, 2.4);
  // Oberkörper nach vorn gebeugt im Anzug
  c.fillStyle = f.f[0]; c.beginPath(); c.ellipse(2, -18, 4.4, 6.8, .45, 0, 7); c.fill();
  c.fillStyle = f.f[1]; c.beginPath(); c.ellipse(3.2, -18.6, 1.1, 5, .45, 0, 7); c.fill(); // Streifen
  // Arme mit Stöcken – Stockeinsatz wechselt mit dem Schwung
  const st = d > 0 ? 1 : -1;
  for (const [vorn, sign] of [[false, -1], [true, 1]]) {
    const hx = 8 + (vorn ? 2 : 0) + (st === sign ? 2 : -1), hy = -16;
    c.strokeStyle = vorn ? f.f[0] : "rgba(0,0,0,.35)"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(3, -22); c.lineTo(hx, hy); c.stroke();
    c.strokeStyle = "#9aa3b0"; c.lineWidth = .8; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - 6 - (st === sign ? -3 : 3), 1); c.stroke();
    c.fillStyle = "#20263a"; c.beginPath(); c.arc(hx, hy, 1.3, 0, 7); c.fill();
  }
  // Kopf mit Helm und Skibrille
  c.fillStyle = "#f6cba6"; c.beginPath(); c.arc(7, -27, 3.8, 0, 7); c.fill();
  c.fillStyle = f.f[1]; c.beginPath(); c.arc(6.6, -28, 4.2, Math.PI * 1.02, Math.PI * 2.05); c.fill();
  c.fillStyle = "#ff9f1c"; c.beginPath(); c.roundRect(7.2, -28.2, 3.8, 2, 1); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(8, -27.9, 1.2, .7);
  c.restore();
}
function jzbPisteMalen(c) {
  const J = JZB, k = J.k;
  if (J.rillen) { // Rillenmuster der Fräse, verblasst langsam
    const R = J.rillen; c.strokeStyle = `rgba(150,180,215,${.55 * Math.max(0, 1 - R.t / 120)})`; c.lineWidth = .9;
    for (let x = Math.max(JZB_RAND, R.von); x < Math.min(J.w - JZB_RAND, R.bis); x += 3.2 * k) { const y = jzbGrund(x) + 1; c.beginPath(); c.moveTo(x, y + .5); c.lineTo(x, y + Math.min(4 * k, jzbBodenH(x) * .6)); c.stroke(); }
  }
  if (J.raupe) jzbRaupeMalen(c, J.raupe, k);
  if (J.ski) for (const f of J.ski.fahrer) jzbSkiMalen(c, f, J.ski.dir, k);
}
// ---------- 2.328.0 KC-CLUB-HERBST-BLAESER + KC-CLUB-HERBST-HOERNCHEN (Wunsch Hansi): Ist der Laubhaufen groß genug, kommt (im Wechsel mit
// Wind und Twinkeys Besen) ein Mann mit Laubbläser und pustet das Laub weg. Auf dem Boden liegen Eicheln und Haselnüsse; ab und an flitzt
// ein Eichhörnchen herbei, stopft sich eine dicke Nuss in die Backe und saust wieder davon. Nur Herbst, nur Anzeige auf diesem Gerät. ----------
function jzbBlaeserStart() {
  const J = JZB, k = J.k, dir = (J.lauf >> 1) % 2 ? -1 : 1;
  for (const f of J.flug) J.fx.push({ ...f, vx: dir * jzbZ(60, 140), vy: f.vy || 20, a: 1 }); J.flug = []; // was noch fällt, wird gleich mitgepustet
  J.blaeser = { dir, x: dir > 0 ? -30 * k : J.w + 30 * k, t: 0, luft: [] };
  jzbPhase("blasen");
}
function jzbBlaeserSchritt(dt) {
  const J = JZB, B = J.blaeser, k = J.k; if (!B) return;
  B.t += dt; const an = B.t > .6; B.x += B.dir * (an ? 34 : 50) * k * dt; // erst hereinlaufen, dann langsam pustend weiter
  const d0 = B.x + B.dir * 14 * k, d1 = B.x + B.dir * 72 * k, lo = Math.min(d0, d1), hi = Math.max(d0, d1);
  if (an) {
    for (const b of J.liegt) if (b.x > lo && b.x < hi && Math.random() < dt * 9) { // Blätter wirbeln in Blasrichtung davon
      J.fx.push({ typ: "blatt", x: b.x, y: J.h - b.yb, s: b.s, farbe: b.farbe, form: b.form, rot: b.rot, vr: jzbZ(-12, 12), vx: B.dir * jzbZ(190, 340), vy: -jzbZ(40, 170), ph: jzbZ(0, 6.3), fq: jzbZ(1, 2) });
      b.weg = true;
    }
    J.liegt = J.liegt.filter((b) => !b.weg);
    for (const p of J.fx) if (p.typ === "blatt" && p.liegt && p.x > lo && p.x < hi) { p.liegt = false; p.vx = B.dir * jzbZ(190, 300); p.vy = -jzbZ(40, 120); } // auch schon Hingefallenes
    // 2.356.0 KC-CLUB-NAME-WEG (Wunsch Hansi „beim Herbstlaub soll das der Laubbläser sein – dann werden die Blätter aufgewirbelt“)
    const N = J.saison === "herbst" ? J.nussName : null;
    if (N && N.n) {
      const L = jzbNussNameLage(); N.weg = N.weg || [];
      for (let i = 0; i < N.n; i++) {
        if (N.weg[i] || L.pos[i] < lo - L.fs * .3 || L.pos[i] > hi + L.fs * .3) continue;
        N.weg[i] = true; const laub = themaWert("laub") || JZB_LAUB;
        for (let q = 0; q < 14; q++) J.fx.push({ typ: "blatt", x: L.pos[i] + jzbZ(-.4, .4) * L.fs, y: L.y - jzbZ(.05, .9) * L.fs, s: jzbZ(5, 8.5) * (.75 + .25 * k), farbe: jzbW(laub), form: Math.random() < .45 ? 1 : 0,
          rot: jzbZ(0, 6.3), vr: jzbZ(-14, 14), vx: B.dir * jzbZ(170, 340), vy: -jzbZ(90, 230), ph: jzbZ(0, 6.3), fq: jzbZ(1, 2) });
        for (let q = 0; q < 6; q++) J.fx.push({ typ: "nuss", x: L.pos[i] + jzbZ(-.35, .35) * L.fs, y: L.y - jzbZ(.1, .7) * L.fs, s: jzbZ(.9, 1.3), nuss: q % 2 === 0, rot: jzbZ(0, 6.3), vr: jzbZ(-10, 10),
          vx: B.dir * jzbZ(80, 200), vy: -jzbZ(60, 160), a: 1 });
      }
      if (N.weg.filter(Boolean).length >= N.n) J.nussName = null;
    }
    for (const pz of J.pilze || []) if (!pz.weg && pz.wachs > .3 && pz.x > lo && pz.x < hi) { // 2.389.0 KC-CLUB-HERBST-PILZE: Pilze wirbeln davon
      pz.weg = true; J.fx.push({ typ: "pilz", x: pz.x, y: J.h - 2, art: pz.art, s: pz.s * pz.wachs, rot: pz.kipp, vr: B.dir * jzbZ(8, 18), vx: B.dir * jzbZ(170, 320), vy: -jzbZ(150, 280), a: 1, leicht: true });
    }
    if (Math.random() < dt * 22) B.luft.push({ x: B.x + B.dir * 16 * k, y: J.h - 4 * k - jzbZ(0, 6) * k, l: jzbZ(10, 22) * k, a: .8 });
  }
  for (const l of B.luft) { l.x += B.dir * 260 * k * dt; l.a -= dt * 1.6; }
  B.luft = B.luft.filter((l) => l.a > 0);
  if (B.x < -60 * k || B.x > J.w + 60 * k) J.blaeser = null;
}
function jzbBlaeserMalen(c, B, k) { // Gärtner in Warnjacke mit Gehörschutz und Rückentrage-Laubbläser
  const J = JZB, gy = J.h - 1, geht = B.t * 9, s = Math.sin(geht) * 2.4, brumm = Math.sin(B.t * 60) * .25;
  c.save(); c.translate(B.x, gy); c.scale(B.dir * k * 1.1, k * 1.1); c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; // Luftstrom aus der Düse
  for (const l of B.luft) { c.globalAlpha = Math.max(0, l.a); const lx = (l.x - B.x) / (B.dir * k * 1.1), ly = (l.y - gy) / (k * 1.1); c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + l.l / (k * 1.1), ly + 1); c.stroke(); }
  c.globalAlpha = 1;
  c.strokeStyle = "#2d3a4a"; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-2, -12); c.lineTo(-2 + s, -1); c.moveTo(2, -12); c.lineTo(2 - s, -1); c.stroke(); // Hose
  c.fillStyle = "#2b1d14"; c.fillRect(-4 + s, -1.6, 4.2, 1.8); c.fillRect(-.2 - s, -1.6, 4.2, 1.8); // Schuhe
  c.fillStyle = "#4a4f57"; c.beginPath(); c.roundRect(-11, -26 + brumm, 7, 12, 2); c.fill(); // Bläser auf dem Rücken
  c.fillStyle = "#ff7a00"; c.fillRect(-11, -22 + brumm, 7, 3); c.fillStyle = "#222"; c.beginPath(); c.arc(-7.5, -16 + brumm, 1.6, 0, 7); c.fill();
  c.fillStyle = "#ff8c1a"; c.beginPath(); c.moveTo(-5, -12); c.quadraticCurveTo(-6, -26, 0, -27); c.quadraticCurveTo(6, -26, 5, -12); c.closePath(); c.fill(); // Warnjacke
  c.fillStyle = "#e9f2f5"; c.fillRect(-5.4, -17, 10.6, 1.3); c.fillRect(-5.2, -21.5, 10.2, 1.1); // Reflexstreifen
  c.strokeStyle = "#555b63"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-6, -15); c.quadraticCurveTo(2, -10, 10, -9); c.lineTo(17, -4); c.stroke(); // Schlauch + Rohr
  c.strokeStyle = "#ff7a00"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(9, -9.5); c.lineTo(17, -4); c.stroke(); c.fillStyle = "#333"; c.beginPath(); c.arc(17.4, -3.8, 1.4, 0, 7); c.fill(); // Düse
  c.strokeStyle = "#ff8c1a"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(2, -23); c.lineTo(9, -10); c.stroke(); // Arm am Rohr
  c.fillStyle = "#f2c49b"; c.beginPath(); c.arc(9, -10, 1.5, 0, 7); c.fill();
  c.fillStyle = "#f2c49b"; c.beginPath(); c.arc(1, -31, 4.4, 0, 7); c.fill(); // Kopf
  c.fillStyle = "#2f6f3a"; c.beginPath(); c.arc(1, -32.2, 4.6, Math.PI * 1.05, Math.PI * 2); c.fill(); c.fillRect(1, -33, 6.5, 1.6); // Schirmmütze
  c.fillStyle = "#e63946"; c.beginPath(); c.arc(-.4, -30.6, 2.2, 0, 7); c.fill(); c.strokeStyle = "#e63946"; c.lineWidth = 1; c.beginPath(); c.arc(1, -31, 5.2, Math.PI * 1.15, Math.PI * 1.75); c.stroke(); // Gehörschutz
  c.fillStyle = "#2b2b2b"; c.beginPath(); c.arc(3.6, -31.6, .6, 0, 7); c.fill();
  c.restore();
}
// 🌰 Eicheln und Haselnüsse – ein paar liegen immer da (unter dem Laub); ist eine weg, fällt später eine neue vom Baum
function jzbEichelnPruefen(dt) {
  const J = JZB, k = J.k;
  if (!J.eicheln) { const n = Math.max(4, Math.min(7, Math.round(J.w / 70))); J.eicheln = Array.from({ length: n }, (_, i) => jzbEichelNeu(jzbBodenX((i + jzbZ(.15, .85)) / n, 20 * k), i % 3 === 1, 0)); }
  const frei = J.eicheln.filter((e) => !e.weg).length;
  if (frei < 3 && (J.eichelUhr = (J.eichelUhr ?? jzbZ(20, 40)) - dt) <= 0) { J.eichelUhr = null; J.eicheln.push(jzbEichelNeu(jzbBodenX(Math.random(), 20 * k), Math.random() < .4, -J.h)); }
  for (const e of J.eicheln) if (e.dy < 0) { e.v = (e.v || 0) + 300 * dt; e.dy = Math.min(0, e.dy + e.v * dt); if (!e.dy) { e.hopp = .25; for (let i = 0; i < 4; i++) J.fx.push({ typ: "funke", x: e.x, y: J.h - 3, vx: jzbZ(-25, 25), vy: -jzbZ(10, 30), s: 1.4, a: .8, farbe: "#c9a36b" }); } }
  for (const e of J.eicheln) if (e.hopp) e.hopp = Math.max(0, e.hopp - dt);
  J.eicheln = J.eicheln.filter((e) => !e.weg);
}
// 🍄 2.389.0 KC-CLUB-HERBST-PILZE (Wunsch Hansi „unten ein paar Pilze wachsen lassen, auch Fliegenpilze – kommt der Laubbläser, pustet er sie
// weg und sie fliegen wirbelnd durch die Gegend“): 3–5 Pilze (Fliegenpilz, Steinpilz, kleine Braune) wachsen langsam aus dem Boden; der
// Laubbläser pustet sie wie das Laub davon. Später wächst an anderer Stelle ein neuer. Nur Herbst, nur Anzeige auf diesem Gerät.
const JZB_PILZ_ARTEN = ["fliegen", "stein", "braun"];
// 2.392.0 (Fund Hansi): etwas kleiner und höchstens 2 Fliegenpilze gleichzeitig
const jzbPilzNeu = (x, wachs = 0) => ({ x, art: JZB_PILZ_ARTEN[Math.random() < .45 && (JZB.pilze || []).filter((pz) => pz.art === "fliegen" && !pz.weg).length < 2 ? 0 : Math.random() < .5 ? 1 : 2], s: jzbZ(1.1, 1.4), kipp: jzbZ(-.12, .12), wachs, tempo: jzbZ(.12, .25) });
function jzbPilzePruefen(dt) {
  const J = JZB, k = J.k;
  if (!J.pilze) { const n = Math.max(3, Math.min(5, Math.round(J.w / 90))); J.pilze = []; for (let i = 0; i < n; i++) J.pilze.push(jzbPilzNeu(jzbBodenX((i + jzbZ(.2, .8)) / n, 30 * k), 1)); }
  for (const pz of J.pilze) if (pz.wachs < 1) pz.wachs = Math.min(1, pz.wachs + pz.tempo * dt);
  J.pilze = J.pilze.filter((pz) => !pz.weg);
  if (J.pilze.length < 3 && !J.blaeser && (J.pilzUhr = (J.pilzUhr ?? jzbZ(12, 30)) - dt) <= 0) { J.pilzUhr = null; J.pilze.push(jzbPilzNeu(jzbBodenX(Math.random(), 30 * k))); }
}
function jzbPilzeMalen(c) {
  const J = JZB; if (J.saison !== "herbst" || !J.pilze) return;
  for (const pz of J.pilze) jzbPilzMalen(c, pz.x, J.h - 1, pz.art, pz.kipp, J.k, pz.s, pz.wachs);
}
function jzbPilzMalen(c, x, y, art, kipp, k, gross = 1, wachs = 1) {
  if (wachs <= 0) return;
  c.save(); c.translate(x, y); c.rotate(kipp); c.scale(k * gross * (.35 + .65 * wachs), k * gross * wachs);
  const stiel = art === "stein" ? "#efe3c8" : art === "braun" ? "#e8d9b8" : "#fbf7ee", sb = art === "stein" ? 3.2 : art === "braun" ? 1.3 : 2;
  const sh = art === "braun" ? 7 : art === "stein" ? 7.5 : 10;
  c.fillStyle = stiel; c.beginPath(); c.moveTo(-sb, 0); c.quadraticCurveTo(-sb * 1.25, -sh * .5, -sb * .8, -sh); c.lineTo(sb * .8, -sh); c.quadraticCurveTo(sb * 1.25, -sh * .5, sb, 0); c.closePath(); c.fill();
  c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = .5; c.stroke();
  if (art === "fliegen") { c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, -sh * .62, sb * 1.6, .9, 0, 0, 7); c.fill(); } // Manschette
  const hw = art === "braun" ? 4.2 : art === "stein" ? 6.8 : 7.2, hh = art === "braun" ? 3.6 : art === "stein" ? 5 : 5.6;
  c.fillStyle = art === "fliegen" ? "#d62828" : art === "stein" ? "#7a4a22" : "#a8743e";
  c.beginPath(); c.ellipse(0, -sh, hw, hh, 0, Math.PI, 0); c.closePath(); c.fill();
  c.fillStyle = art === "fliegen" ? "#f3e7d3" : "#d9c39c"; c.fillRect(-hw * .92, -sh - .2, hw * 1.84, 1); // Unterseite (Lamellen/Röhren)
  if (art === "fliegen") { c.fillStyle = "#fff"; for (const [px, py, r] of [[-3.8, -2, .9], [-.8, -4.2, 1], [2.6, -2.6, .85], [4.6, -1.2, .6], [-5.6, -.8, .55], [.9, -1.6, .6]]) { c.beginPath(); c.arc(px, -sh + py, r, 0, 7); c.fill(); } }
  c.fillStyle = "rgba(255,255,255,.28)"; c.beginPath(); c.ellipse(-hw * .35, -sh - hh * .55, hw * .25, hh * .18, -.3, 0, 7); c.fill(); // Glanz
  c.restore();
}
// 2.392.0 KC-CLUB-HERBST-MITTE-FREI (Fund Hansi): in der Mitte legt das Eichhörnchen den Namen – dort liegen keine Eicheln und
// wachsen keine Pilze (nur Laub). jzbBodenX(u, rand) verteilt u (0…1) über den Boden OHNE den Namensbereich (+ Platz fürs Eichhörnchen).
function jzbMitteFrei() {
  const J = JZB, txt = J.nussName?.text || jzbEisNameText(); if (!txt || !J.ctx) return null;
  const L = jzbNussNameLage(txt); return [L.pos[0] - L.fs * .6 - 8 * J.k, L.pos[L.pos.length - 1] + L.fs * .6 + 40 * J.k];
}
function jzbBodenX(u, rand) {
  const J = JZB, lo = JZB_RAND + rand, hi = J.w - JZB_RAND - rand, z = jzbMitteFrei();
  const a = z ? Math.max(lo, z[0]) : lo, b = z ? Math.min(hi, z[1]) : lo, luecke = Math.max(0, b - a), frei = hi - lo - luecke;
  if (frei < 40 * J.k) return lo + u * (hi - lo);
  const x = lo + u * frei; return x > a ? x + luecke : x;
}
const jzbEichelNeu = (x, nuss, dy) => ({ x, nuss, dy, kipp: jzbZ(-.6, .6), v: 0, hopp: 0 });
function jzbEichelMalen(c, x, y, nuss, kipp, k, gross = 1) {
  c.save(); c.translate(x, y); c.rotate(kipp); c.scale(k * gross, k * gross);
  if (nuss) { // Haselnuss: rund, glänzend braun mit heller Kappe unten
    c.fillStyle = "#8a5a2b"; c.beginPath(); c.ellipse(0, -3.4, 3.4, 3.6, 0, 0, 7); c.fill();
    c.fillStyle = "#d9b98a"; c.beginPath(); c.ellipse(0, -.6, 2.6, 1.2, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.4)"; c.beginPath(); c.ellipse(-1.2, -4.6, .9, 1.4, -.4, 0, 7); c.fill();
  } else { // Eichel: längliche Frucht mit genarbtem Hütchen und Stiel
    c.fillStyle = "#b8862f"; c.beginPath(); c.ellipse(0, -3.2, 2.5, 3.4, 0, 0, 7); c.fill();
    c.fillStyle = "#6b4a24"; c.beginPath(); c.ellipse(0, -5.6, 2.9, 1.7, 0, Math.PI, 0); c.fill(); c.fillRect(-2.9, -5.7, 5.8, 1);
    c.strokeStyle = "#6b4a24"; c.lineWidth = .8; c.beginPath(); c.moveTo(0, -7); c.lineTo(.6, -8.4); c.stroke();
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-.9, -3, .6, 1.4, 0, 0, 7); c.fill();
  }
  c.restore();
}
function jzbEichelnMalen(c) {
  const J = JZB; if (J.saison !== "herbst" || !J.eicheln) return;
  for (const e of J.eicheln) jzbEichelMalen(c, e.x, J.h - 1 + e.dy - Math.sin((e.hopp || 0) * 12) * (e.hopp || 0) * 8, e.nuss, e.kipp + e.dy * .02, J.k, 1.4);
}
// 🐿️ Eichhörnchen: hüpft zur nächsten Nuss, stopft sie sich in die Backe und flitzt zurück
// 2.329.0 KC-CLUB-NUSSNAME (Wunsch Hansi, Variante 2): wie im Winter der Name aus Eis – im Herbst bringt das Eichhörnchen ab und an eine Nuss
// in der Backe und legt daraus den nächsten Buchstaben des Vornamens (jeder Buchstabe aus vielen kleinen Eicheln und Haselnüssen). Ist der Name
// fertig, sitzt es stolz daneben. Nach einer Weile holt es sich die Nüsse Buchstabe für Buchstabe wieder (vom Ende her) – dann beginnt es von vorn.
// Dazwischen frisst es weiter Nüsse vom Boden. Nur Herbst, nur auf diesem Gerät (nichts geht an den Server).
function jzbNussNameLage(text = JZB.nussName.text) {
  // 2.398.0 KC-CLUB-NUSSNAME-LESBAR (Fund Hansi „Name etwas größer, Buchstaben besser erkennbar“): ein Drittel größer
  const J = JZB, c = J.ctx, fs = Math.round(Math.min(36 * J.k, J.h * .5)), z = [...text], f = `900 ${fs}px "Arial Black", "Segoe UI", Roboto, Arial, sans-serif`;
  c.save(); c.font = f; const b = z.map((ch) => c.measureText(ch).width + 3 * J.k); c.restore();
  const ges = b.reduce((a, v) => a + v, 0); let x = Math.max(JZB_RAND, (J.w - ges) / 2);
  return { fs, f, z, pos: b.map((w) => { const m = x + w / 2; x += w; return m; }), y: J.h - 2 };
}
function jzbNussPunkte(ch, fs, f) { // Rasterpunkte innerhalb des Buchstabens – dort liegt je eine kleine Nuss (zwischengespeichert)
  const J = JZB, key = `${ch}|${fs}`; J.nussPunkte = J.nussPunkte || new Map(); if (J.nussPunkte.has(key)) return J.nussPunkte.get(key);
  const cv = document.createElement("canvas"), w = Math.ceil(fs * 1.4), h = Math.ceil(fs * 1.25), c = cv.getContext("2d"); cv.width = w; cv.height = h;
  c.font = f; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillStyle = "#000"; c.fillText(ch, w / 2, h - fs * .12);
  const d = c.getImageData(0, 0, w, h).data, st = Math.max(2.4, fs / 10.5), pk = []; // 2.398.0: dichter → klarere Kanten
  for (let y = st / 2; y < h; y += st) for (let x = st / 2 + ((Math.round(y / st) % 2) ? st / 2 : 0); x < w; x += st)
    if (d[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 120) pk.push([x - w / 2, y - (h - fs * .12), pk.length % 3 === 0, Math.sin(pk.length * 7.3) * .5]);
  const r = { pk, st }; J.nussPunkte.set(key, r); return r;
}
function jzbNussNameMalen(c) {
  const J = JZB, N = J.nussName; if (J.saison !== "herbst" || !N || !N.n) return;
  const L = jzbNussNameLage();
  for (let i = 0; i < N.n; i++) {
    if (N.weg?.[i]) continue; // 2.356.0: vom Laubbläser weggepustet
    const { pk, st } = jzbNussPunkte(L.z[i], L.fs, L.f), neu = Math.min(1, (J.T - (N.gelandet[i] ?? -9)) / .4);
    c.save(); c.font = L.f; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.globalAlpha = .75 * neu; c.fillStyle = "#3a1f0a"; // dunkler Untergrund – damit man den Buchstaben gut lesen kann
    c.lineJoin = "round"; c.lineWidth = Math.max(2, L.fs / 9); c.strokeStyle = "rgba(255,236,200,.55)"; // 2.398.0: heller Rand trennt den Buchstaben vom Hintergrund
    c.strokeText(L.z[i], L.pos[i], L.y - L.fs * .12 + st * .45); c.fillText(L.z[i], L.pos[i], L.y - L.fs * .12 + st * .45); c.restore();
    for (const [px, py, nuss, kipp] of pk) { const q = jzbEase(Math.min(1, neu * 1.6 - (py / -L.fs) * .6)); if (q <= 0) continue; // Nüsse purzeln von unten nach oben dazu
      jzbEichelMalen(c, L.pos[i] + px, L.y + py + st * .45 - (1 - q) * 6 * J.k, nuss, kipp, 1, st / 6.2 * (.6 + .4 * q)); }
  }
}
function jzbHerbstTiere(dt) {
  const J = JZB, k = J.k;
  if (J.saison !== "herbst") { J.eicheln = null; J.pilze = null; J.hoernchen = null; J.blaeser = null; J.nussName = null; J.hund = null; return; }
  jzbBlaeserSchritt(dt); jzbEichelnPruefen(dt); jzbPilzePruefen(dt); jzbStreunerSchritt(dt); // 2.369.0 KC-CLUB-HERBST-HUND · 2.389.0 Pilze
  const txt = jzbEisNameText(); if (J.nussName && J.nussName.text !== txt) J.nussName = null;
  if (!J.nussName && txt) J.nussName = { text: txt, n: 0, gelandet: [], fertig: null };
  const N = J.nussName, laenge = N ? [...N.text].length : 0;
  if (N && N.fertig !== null && !J.blaeser && !J.hoernchen && J.T - N.fertig > (J.vorschau ? 15 : 75) && !N.weg?.some(Boolean)) jzbBlaeserStart(); // 2.356.0: Name eine Weile fertig → Laubbläser kommt
  if (!J.hoernchen && (J.hoernchenUhr = (J.hoernchenUhr ?? (J.extra === "hoernchen" ? 3 : jzbZ(15, 35))) - dt) <= 0) {
    let art = "essen";
    if (N && N.n < laenge && !N.fertig) art = !J.nussErster || Math.random() < .7 ? "bringen" : "essen";
    // 2.356.0 KC-CLUB-NAME-WEG: das Eichhörnchen holt die Nüsse nicht mehr – der Laubbläser pustet den Namen weg (siehe oben)
    const frei = J.eicheln.filter((e) => !e.dy && !e.reserviert);
    if (J.blaeser || (art === "essen" && !frei.length)) J.hoernchenUhr = 8;
    else {
      const dir = Math.random() < .5 ? 1 : -1, start = dir > 0 ? -24 * k : J.w + 24 * k;
      if (art === "essen") { const ziel = frei.sort((a, b) => Math.abs(a.x - start) - Math.abs(b.x - start))[Math.min(frei.length - 1, Math.floor(Math.random() * 2))];
        ziel.reserviert = true; J.hoernchen = { art, dir, x: start, t: 0, ziel, zx: ziel.x - dir * 9 * k, phase: "hin", backe: 0, nuss: ziel.nuss, halt: 0 }; }
      else { J.nussErster = true; const L = jzbNussNameLage(), i = art === "bringen" ? N.n : N.n - 1, zx = L.pos[i] - dir * (L.fs * .45 + 9 * k);
        J.hoernchen = { art, dir, x: start, t: 0, i, zx, phase: "hin", backe: art === "bringen" ? 1 : 0, nuss: Math.random() < .5, halt: 0 }; }
    }
  }
  const H = J.hoernchen; if (!H) return;
  H.t += dt;
  if (H.phase === "hin") {
    H.x += H.dir * 105 * k * dt;
    if ((H.zx - H.x) * H.dir <= 0) { H.x = H.zx; H.phase = "nehmen"; H.halt = 0; }
  } else if (H.phase === "nehmen") { // schnuppern, Nuss greifen/ablegen – kauen
    H.halt += dt;
    if (H.art === "essen") {
      if (H.halt > .7 && !H.ziel.weg) { H.ziel.weg = true; for (const b of J.liegt) if (Math.abs(b.x - H.x) < 14 * k) b.wackel = 1; }
      if (H.halt > .7) H.backe = Math.min(1, H.backe + dt * 3);
    } else if (H.art === "bringen") {
      if (H.halt > .3) H.backe = Math.max(0, H.backe - dt * 2.5);
      if (H.halt > .6 && !H.fertig && N && N.n === H.i) { H.fertig = true; N.gelandet[N.n] = J.T; N.n++; // der nächste Buchstabe liegt da
        const L = jzbNussNameLage(); for (let q = 0; q < 8; q++) J.fx.push({ typ: "funke", x: L.pos[H.i] + jzbZ(-8, 8) * k, y: L.y - jzbZ(0, L.fs), vx: jzbZ(-30, 30), vy: -jzbZ(10, 50), s: jzbZ(1.4, 2.4), a: 1, farbe: q % 2 ? "#ffd166" : "#fff6c2" });
        if (N.n >= laenge) N.fertig = J.T; }
    } else if (H.art === "holen") {
      if (H.halt > .6 && !H.fertig && N && N.n === H.i + 1) { H.fertig = true; N.n--; if (!N.n) J.nussName = null; } // Buchstabe weg – Nüsse in die Backe
      if (H.halt > .6) H.backe = Math.min(1, H.backe + dt * 3);
    }
    if (H.halt > 1.9) { if (H.art === "bringen" && N && N.fertig !== null && N.n >= laenge && !H.stolz) { const L = jzbNussNameLage(); H.phase = "zumEnde"; H.stolz = true; H.dir = 1; H.zx = L.pos[L.pos.length - 1] + L.fs * .5 + 16 * k; } else { H.phase = "weg"; H.dir = H.x < J.w / 2 ? -1 : 1; } } // zur näheren Seite davon
  } else if (H.phase === "zumEnde") { // hüpft ans Ende des Namens …
    H.x += H.dir * 70 * k * dt; if ((H.zx - H.x) * H.dir <= 0) { H.x = H.zx; H.dir = -1; H.phase = "stolz"; H.halt = 0; }
  } else if (H.phase === "stolz") { // … und sitzt stolz neben seinem fertigen Werk
    H.halt += dt; if (Math.random() < dt * 3) J.fx.push({ typ: "funke", x: H.x + jzbZ(-10, 10) * k, y: J.h - jzbZ(18, 30) * k, vx: 0, vy: -20, s: 2, a: 1, farbe: "#ffd166" });
    if (H.halt > 4.5) { H.phase = "weg"; H.dir = H.x < J.w / 2 ? -1 : 1; }
  } else { H.x += H.dir * 135 * k * dt; if (H.x < -40 * k || H.x > J.w + 40 * k) { const bau = J.nussName && !J.nussName.fertig; J.hoernchen = null; J.hoernchenUhr = bau ? jzbZ(12, 25) : jzbZ(35, 75); } }
  if (H.phase !== "nehmen" && H.phase !== "stolz") for (const b of J.liegt) if (Math.abs(b.x - H.x) < 8 * k) b.wackel = 1; // raschelt durchs Laub
}
// ---------- 2.369.0 KC-CLUB-HERBST-HUND (Wunsch Hansi „in der Herbst-Animation ab und an einen streunenden Hund mit wedelndem Schwanz durchs Bild laufen
// lassen; ca. in der Mitte bleibt er stehen, schnuppert ein bisschen rum und läuft dann weiter“) ----------
// Etwa alle 1½–4 Minuten (Vorschau „hund“: nach 3 s): trottet von einer Seite herein, bleibt um die Mitte stehen, senkt die Nase ins Laub (Blätter rascheln),
// hebt kurz den Kopf, schnuppert noch einmal und trottet zur anderen Seite hinaus. Der Schwanz wedelt die ganze Zeit – beim Schnuppern besonders schnell.
function jzbStreunerSchritt(dt) {
  const J = JZB, k = J.k;
  if (!J.hund) {
    if (J.blaeser) return; // nicht mitten durch den Laubbläser
    J.hundUhr = (J.hundUhr ?? (J.extra === "hund" ? 3 : jzbZ(30, 70))) - dt;
    if (J.hundUhr > 0) return;
    const dir = Math.random() < .5 ? 1 : -1;
    J.hund = { dir, x: dir > 0 ? -30 * k : J.w + 30 * k, zx: J.w * jzbZ(.42, .58), phase: "hin", t: 0, halt: 0, dauer: jzbZ(3.2, 4.8) };
    return;
  }
  const D = J.hund; D.t += dt;
  if (D.phase === "hin") { D.x += D.dir * 62 * k * dt; if ((D.zx - D.x) * D.dir <= 0) { D.x = D.zx; D.phase = "schnuppern"; D.halt = 0; } }
  else if (D.phase === "schnuppern") {
    D.halt += dt;
    if (D.halt > 1.4 && D.halt < 1.9) D.x += D.dir * 10 * k * dt; // zwei kleine Schritte weiter
    if (Math.random() < dt * 4) for (const b of J.liegt || []) if (Math.abs(b.x - (D.x + D.dir * 16 * k)) < 7 * k) b.wackel = 1; // die Nase raschelt im Laub
    if (D.halt > D.dauer) { D.phase = "weg"; }
  } else { D.x += D.dir * 70 * k * dt; if (D.x < -40 * k || D.x > J.w + 40 * k) { J.hund = null; J.hundUhr = J.extra === "hund" ? 6 : jzbZ(90, 240); } }
  if (D.phase !== "schnuppern") for (const b of J.liegt || []) if (Math.abs(b.x - D.x) < 9 * k) b.wackel = 1; // trottet durchs Laub
}
function jzbHundBein(c, x, ph, hinten, laeuft, farbe) {
  const L = 4.25, schw = laeuft ? Math.sin(ph) * .5 : 0, knick = laeuft ? Math.max(0, Math.cos(ph)) * .9 : 0;
  const a1 = hinten ? schw + .38 + knick * .25 : schw - .05 - knick * .2, a2 = hinten ? schw - .38 - knick * .7 : schw - .05 - knick;
  const kx = x + Math.sin(a1) * L, ky = -8 + Math.cos(a1) * L, fx = kx + Math.sin(a2) * L, fy = Math.min(0, ky + Math.cos(a2) * L);
  c.strokeStyle = farbe; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, -8.6); c.lineTo(kx, ky); c.stroke();
  c.lineWidth = 1.7; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  c.fillStyle = farbe; c.beginPath(); c.ellipse(fx + .7, fy - .4, 1.3, .8, 0, 0, 7); c.fill(); // Pfote
}
function jzbStreunerMalen(c, D, k) {
  const J = JZB, laeuft = D.phase !== "schnuppern" || (D.halt > 1.4 && D.halt < 1.9), sp = laeuft ? (D.t * 9) % (Math.PI * 2) : 0;
  // Kopf: beim Schnuppern runter zur Erde (zwischendurch kurz hoch), die Nase zuckt
  let kopf = 0; if (D.phase === "schnuppern") { const h = D.halt; kopf = h < .4 ? h / .4 : h > 2.1 && h < 2.6 ? 1 - (h - 2.1) / .5 * .8 : h >= 2.6 && h < 3 ? .2 + (h - 2.6) / .4 * .8 : h > D.dauer - .4 ? Math.max(0, (D.dauer - h) / .4) : 1; kopf = Math.max(0, Math.min(1, kopf)); }
  const zuck = D.phase === "schnuppern" && kopf > .8 ? Math.sin(D.t * 26) * .5 : 0;
  const wedel = Math.sin(D.t * (D.phase === "schnuppern" ? 22 : 13)) * (D.phase === "schnuppern" ? .7 : .45), hopp = laeuft ? Math.abs(Math.sin(sp)) * 1.2 : 0;
  c.save(); c.translate(D.x, J.h - 1 - hopp * k); c.scale(D.dir * k * 1.4, k * 1.4); c.lineCap = "round"; c.lineJoin = "round";
  const fell = "#8a6a4a", dunkel = "#5e4630";
  // Schwanz (wedelt)
  c.save(); c.translate(-9, -11); c.rotate(-1.05 + wedel); c.strokeStyle = fell; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-1, -5, 2, -8.5); c.stroke();
  c.strokeStyle = "#c9a77f"; c.lineWidth = 1; c.beginPath(); c.moveTo(1.4, -7); c.lineTo(2.2, -8.6); c.stroke(); c.restore();
  // Beine (hinten dunkler, vorne heller), laufen über Kreuz – 2.393.0 KC-CLUB-HUND-GELENKE (Fund Hansi „läuft unnatürlich, keine Gelenke“):
  // je Bein Ober- und Unterschenkel mit Knie bzw. Sprunggelenk und Pfote; beim Vorschwingen knickt das Bein ein und die Pfote hebt sich
  jzbHundBein(c, -6, sp + Math.PI, true, laeuft, dunkel); jzbHundBein(c, 5, sp, false, laeuft, dunkel);
  jzbHundBein(c, -4, sp, true, laeuft, fell); jzbHundBein(c, 7, sp + Math.PI, false, laeuft, fell);
  // Körper mit Fleck und etwas struppigem Fell
  c.fillStyle = fell; c.beginPath(); c.ellipse(0, -10.5, 9.5, 4.6, 0, 0, 7); c.fill();
  c.fillStyle = dunkel; c.beginPath(); c.ellipse(-3, -12, 3.6, 2.5, -.2, 0, 7); c.fill();
  c.strokeStyle = "#6f5439"; c.lineWidth = .8; for (const x of [-6, -2, 2]) { c.beginPath(); c.moveTo(x, -14.6); c.lineTo(x + 1.2, -16); c.stroke(); }
  // Hals und Kopf (senkt sich zum Schnuppern)
  c.save(); c.translate(7, -12); c.rotate(kopf * .95);
  c.fillStyle = fell; c.beginPath(); c.ellipse(2, -1.5, 3.4, 3.2, .3, 0, 7); c.fill(); // Hals
  c.beginPath(); c.arc(4.6, -4.2, 3.9, 0, 7); c.fill(); // Kopf
  c.beginPath(); c.ellipse(8.2 + zuck * .3, -3.2, 3.2, 2.1, .1, 0, 7); c.fill(); // Schnauze
  c.fillStyle = "#1b1b1b"; c.beginPath(); c.arc(11.1 + zuck * .4, -3.4, 1, 0, 7); c.fill(); // Nase
  c.beginPath(); c.arc(5.6, -5.4, .7, 0, 7); c.fill(); // Auge
  c.fillStyle = dunkel; c.beginPath(); c.moveTo(3, -7.4); c.quadraticCurveTo(1, -6.5, 1.4, -2.2); c.quadraticCurveTo(3, -3.4, 4.4, -6.6); c.closePath(); c.fill(); // Schlappohr
  c.restore();
  // Schnupper-Wölkchen an der Nase
  if (D.phase === "schnuppern" && kopf > .8 && Math.sin(D.t * 13) > .6) { c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(19, -2.6, 1.2, 0, 7); c.arc(21.2, -3.6, .9, 0, 7); c.fill(); }
  c.restore();
}
function jzbHoernchenMalen(c, H, k) {
  const J = JZB, laeuft = H.phase !== "nehmen" && H.phase !== "stolz", sp = laeuft ? (H.t * 11) % (Math.PI * 2) : 0, hopp = laeuft ? Math.abs(Math.sin(sp)) * 4 : 0;
  const bueck = H.phase === "nehmen" && H.halt < .9 ? Math.sin(Math.min(1, H.halt / .45) * Math.PI / 2) * .35 : 0, kau = H.phase === "nehmen" && H.halt > .9 ? Math.sin(H.t * 22) * .35 : 0;
  c.save(); c.translate(H.x, J.h - 1 - hopp * k); c.scale(H.dir * k * 1.15, k * 1.15); c.lineCap = "round"; c.lineJoin = "round";
  // buschiger Schwanz: geschwungen nach oben, weht beim Laufen
  const sw = laeuft ? Math.sin(sp) * 2 : Math.sin(H.t * 3) * 1;
  c.fillStyle = "#a9461d"; c.beginPath(); c.moveTo(-6, -5); c.bezierCurveTo(-16, -6, -18, -18 + sw, -11, -22 + sw); c.bezierCurveTo(-6, -25 + sw, -2, -20 + sw, -6, -16 + sw);
  c.bezierCurveTo(-9, -13, -6, -9, -3, -8); c.closePath(); c.fill();
  c.strokeStyle = "#d9763f"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -7); c.bezierCurveTo(-14, -9, -15, -17 + sw, -10, -20.5 + sw); c.stroke();
  // Hinterbein, Körper, Bauch
  const bein = laeuft ? Math.sin(sp) * 2.5 : 0;
  c.fillStyle = "#8f3a17"; c.beginPath(); c.ellipse(-3 - bein, -3, 3.2, 2.6, 0, 0, 7); c.fill();
  c.save(); c.rotate(bueck); c.fillStyle = "#b5562a"; c.beginPath(); c.ellipse(0, -7, 6.6, 4.4, -.25, 0, 7); c.fill();
  c.fillStyle = "#f3dfc0"; c.beginPath(); c.ellipse(2.6, -5.2, 3, 2.3, -.3, 0, 7); c.fill();
  c.strokeStyle = "#8f3a17"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(4, -6); c.lineTo(5 + bein, -1.2); c.stroke(); // Vorderbein
  // Kopf mit Ohr-Pinsel, Auge, Nase und (nach dem Fund) dicker Backe
  c.fillStyle = "#b5562a"; c.beginPath(); c.ellipse(7, -11.5, 3.6, 3.2, .2, 0, 7); c.fill();
  c.beginPath(); c.moveTo(5.2, -14); c.lineTo(5.6, -18); c.lineTo(7.2, -14.4); c.closePath(); c.fill();
  c.strokeStyle = "#7a2f12"; c.lineWidth = .8; c.beginPath(); c.moveTo(5.6, -18); c.lineTo(5.2, -19.2); c.stroke();
  if (H.backe > 0) { const r = 1 + H.backe * 3 + kau * .4; c.fillStyle = "#c86a3a"; c.beginPath(); c.arc(7.6, -10.2, r, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.arc(7, -11, r * .45, 0, 7); c.fill(); }
  c.fillStyle = "#1b1b1b"; c.beginPath(); c.arc(8.2, -12.6, .75, 0, 7); c.fill(); c.beginPath(); c.arc(10.5, -11.4, .6, 0, 7); c.fill();
  if (H.backe > 0 && H.backe < 1) jzbEichelMalen(c, 10.6, -9.6, H.nuss, .3, .55); // Nuss verschwindet im Mäulchen
  c.restore(); c.restore();
}
function jzbExtrasSchritt(dt) {
  const J = JZB, X = J.ext || {}, W = J.wind;
  jzbWinterKinder(dt); // 2.282.0 KC-CLUB-WINTER-KINDER
  if (X.regen) { // Tropfen fallen schräg, landen in Pfützen
    if (!J.pfuetzen) J.pfuetzen = [.18, .43, .7, .9].map((p) => ({ x: J.w * p + jzbZ(-12, 12), r: 0, ringe: [] }));
    J.regenSpawn = (J.regenSpawn || 0) - dt;
    while (J.regenSpawn < 0) { J.regenSpawn += .022; (J.tropfen = J.tropfen || []).push({ x: jzbZ(-20, J.w + 10), y: -10, v: jzbZ(260, 340) }); }
    for (const t of J.tropfen) {
      t.x += (W ? W.dir * 160 * W.st : 40) * dt; t.y += t.v * dt;
      if (t.y >= J.h - 2) { t.weg = true; const p = J.pfuetzen.find((q) => Math.abs(q.x - t.x) < q.r * .9 + 3); if (p && p.ringe.length < 6) p.ringe.push({ x: t.x, a: 0 }); }
    }
    J.tropfen = J.tropfen.filter((t) => !t.weg);
    for (const p of J.pfuetzen) { p.r = Math.min(18 * J.k, p.r + dt * .9); for (const g of p.ringe) g.a += dt * 1.6; p.ringe = p.ringe.filter((g) => g.a < 1); }
    if ((J.schirmUhr = (J.schirmUhr ?? (J.extra === "regen" ? 2 : jzbZ(8, 20))) - dt) <= 0 && !J.schirm) { const dir = Math.random() < .5 ? 1 : -1; J.schirm = { dir, x: dir > 0 ? -30 : J.w + 30, t: 0 }; }
  } else if (J.tropfen?.length || J.pfuetzen) { J.tropfen = []; J.pfuetzen = J.pfuetzen?.map((p) => ({ ...p, r: p.r - dt * 3 })).filter((p) => p.r > 0) || null; if (!J.pfuetzen?.length) J.pfuetzen = null; }
  if (J.schirm) { const s = J.schirm; s.t += dt; s.x += s.dir * 34 * J.k * dt; if (s.x < -40 || s.x > J.w + 40) { J.schirm = null; J.schirmUhr = jzbZ(25, 50); } }
  if (X.igel && !J.igel && (J.igelUhr -= dt) <= 0) { const dir = Math.random() < .5 ? 1 : -1; J.igel = { dir, x: dir > 0 ? -20 : J.w + 20, t: 0, halt: jzbZ(.35, .65) }; }
  if (J.igel) {
    const g = J.igel, mitte = g.dir > 0 ? g.x / J.w : 1 - g.x / J.w;
    g.t += dt; const steht = mitte > g.halt && mitte < g.halt + .02 && g.schnuff === undefined ? (g.schnuff = 1.8, true) : g.schnuff > 0;
    if (steht) g.schnuff -= dt; else g.x += g.dir * 16 * J.k * dt;
    for (const b of J.liegt) if (Math.abs(b.x - g.x) < 9 * J.k) b.wackel = 1; // es raschelt
    if (g.x < -30 || g.x > J.w + 30) { J.igel = null; J.igelUhr = jzbZ(35, 75); }
  }
  for (const b of J.liegt) if (b.wackel) b.wackel = Math.max(0, b.wackel - dt * 1.5);
  for (const e of J.eier || []) if (e.gef) e.t += dt;
  jzbHerbstTiere(dt); // 2.328.0 KC-CLUB-HERBST-BLAESER + KC-CLUB-HERBST-HOERNCHEN
}
function jzbExtrasHinten(c) { // vor dem Gras: Ostereier (das Gras wächst darüber)
  const J = JZB, k = J.k;
  jzbPilzeMalen(c); jzbEichelnMalen(c); // 2.328.0: Eicheln liegen unter dem Laub · 2.389.0: Pilze dahinter
  if (!J.ext?.ostern) return;
  const hase = J.gaeste.some((g) => g.typ === "osterhase");
  for (const e of J.eier || []) {
    if (e.da === false && hase) continue; // noch nicht gelegt
    const y = J.h - 7 * k - (e.gef ? Math.min(1, e.t * 3) * 6 * k : 0);
    c.save(); c.translate(e.x, y); c.rotate(e.kipp * (e.gef ? 0 : 1));
    if (e.gef && e.t > .35) { c.font = `${17 * k}px ${JZB_EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🐣", 0, 0); c.restore(); continue; }
    c.fillStyle = e.f[0]; c.beginPath(); c.ellipse(0, 0, 5.2 * k, 7 * k, 0, 0, 7); c.fill();
    c.save(); c.clip(); c.fillStyle = e.f[1];
    if (e.muster === 0) for (const yy of [-2.5, 1.5]) c.fillRect(-6 * k, yy * k, 12 * k, 1.6 * k);
    else if (e.muster === 1) for (const [xx, yy] of [[-2, -3], [2, -1], [-1.5, 2], [2.2, 3]]) { c.beginPath(); c.arc(xx * k, yy * k, 1.1 * k, 0, 7); c.fill(); }
    else { c.beginPath(); for (let i = -6; i <= 6; i += 3) c.lineTo(i * k, (i / 3) % 2 ? -1 * k : 1 * k); c.lineWidth = 1.3 * k; c.strokeStyle = e.f[1]; c.stroke(); }
    c.restore(); c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(-1.8 * k, -3 * k, 1.3 * k, 2 * k, -.4, 0, 7); c.fill(); c.restore();
  }
}
function jzbExtrasBoden(c) { // Pfützen, Stiefel, Kochtopf, Igel, Schirm
  const J = JZB, k = J.k, X = J.ext || {};
  for (const p of J.pfuetzen || []) {
    if (p.r <= 0) continue;
    c.fillStyle = "rgba(170,200,235,.42)"; c.beginPath(); c.ellipse(p.x, J.h - 1.5, p.r, p.r * .2, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = .8;
    for (const g of p.ringe) { c.globalAlpha = 1 - g.a; c.beginPath(); c.ellipse(g.x, J.h - 1.5, 2 + g.a * 8, (2 + g.a * 8) * .25, 0, 0, 7); c.stroke(); } c.globalAlpha = 1;
  }
  if (X.nikolaus) jzbStiefel(c, J.w * .6, J.h - 1, k);
  if (X.topf) jzbTopf(c, Math.max(J.w * .3, 90 * k), J.h - 1, k);
  if (J.igel) jzbIgel(c, J.igel, k);
  if (J.schirm) jzbSchirm(c, J.schirm, k);
  jzbNussNameMalen(c); // 2.329.0 KC-CLUB-NUSSNAME
  if (J.hoernchen) jzbHoernchenMalen(c, J.hoernchen, k); // 2.328.0
  if (J.hund) jzbStreunerMalen(c, J.hund, k); // 2.369.0 KC-CLUB-HERBST-HUND
  if (J.blaeser) jzbBlaeserMalen(c, J.blaeser, k);
  jzbWinterKinderMalen(c); // 2.282.0
}
function jzbStiefel(c, x, y, k) { // 🥾 gefüllter Nikolaus-Stiefel
  c.save(); c.translate(x, y); c.scale(k, k);
  c.strokeStyle = "#c62828"; c.lineWidth = 2.2; c.lineCap = "round"; c.beginPath(); c.moveTo(4, -26); c.lineTo(4, -34); c.arc(8, -34, 4, Math.PI, 0); c.stroke(); // Zuckerstange
  c.strokeStyle = "#fff"; c.lineWidth = .9; c.setLineDash([1.6, 2]); c.beginPath(); c.moveTo(4, -26); c.lineTo(4, -34); c.arc(8, -34, 4, Math.PI, 0); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#f28c28"; c.beginPath(); c.arc(-4, -28, 4.6, 0, 7); c.fill(); c.fillStyle = "#3a7d2c"; c.beginPath(); c.ellipse(-3, -32.4, 1.6, .8, -.5, 0, 7); c.fill(); // Mandarine
  c.fillStyle = "#c62828"; c.beginPath(); c.moveTo(-1, -24); c.lineTo(1.5, -36); c.lineTo(4, -24); c.closePath(); c.fill(); c.fillStyle = "#f6d7b0"; c.beginPath(); c.arc(1.5, -30, 1.3, 0, 7); c.fill(); // Schoko-Nikolaus
  c.fillStyle = "#8d5a2b"; c.beginPath(); c.arc(-8, -25, 2.4, 0, 7); c.arc(8.5, -25.5, 2.2, 0, 7); c.fill(); // Nüsse
  const g = c.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, "#3b2314"); g.addColorStop(.5, "#6d4126"); g.addColorStop(1, "#3b2314");
  c.fillStyle = g; c.beginPath(); c.moveTo(-9, -24); c.lineTo(-9, -6); c.quadraticCurveTo(-9, 0, -3, 0); c.lineTo(15, 0); c.quadraticCurveTo(18, 0, 17, -4); c.quadraticCurveTo(15, -8, 7, -9); c.lineTo(7, -24); c.closePath(); c.fill();
  c.fillStyle = "#1e120a"; c.fillRect(-9, -1.6, 26, 1.6); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-6, -21, 2, 12); // Sohle, Glanz
  c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(-1, -24, 9.5, 2.8, 0, 0, 7); c.fill(); // Fellrand
  c.restore();
}
function jzbTopf(c, x, y, k) { // 🎼 Notenständer mit aufsteigenden Noten – heute ist Probe/Konzert (statt Kochtopf in der KC-App)
  const T = JZB.T;
  c.save(); c.translate(x, y); c.scale(k, k);
  for (let i = 0; i < 3; i++) { // Noten steigen auf wie Dampf
    const p = ((T * .3 + i / 3) % 1), yy = -30 - p * 30, xx = (i - 1) * 7 + Math.sin(T * 2 + i) * 3 * (1 + p);
    c.fillStyle = `rgba(255,240,190,${.85 * (1 - p)})`; c.font = `${9 + p * 3}px ${JZB_EMOJI}`; c.textAlign = "center"; c.fillText(i % 2 ? "♫" : "♪", xx, yy);
  }
  c.strokeStyle = "#2b2b2b"; c.lineWidth = 1.4; c.lineCap = "round";
  c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 0); c.moveTo(0, 0); c.lineTo(-7, 0); c.moveTo(0, 0); c.lineTo(7, 0); c.moveTo(0, -2); c.lineTo(-5, 0); c.stroke(); // Fuß
  c.fillStyle = "#3a3a3a"; c.beginPath(); c.moveTo(-13, -16); c.lineTo(13, -16); c.lineTo(11, -30); c.lineTo(-11, -30); c.closePath(); c.fill(); // Pult
  c.fillStyle = "#fffaf0"; c.fillRect(-10, -29, 9.4, 12); c.fillRect(.6, -29, 9.4, 12); // aufgeschlagene Noten
  c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = .4;
  for (const s of [-1, 1]) for (let l = 0; l < 4; l++) { const ly = -27 + l * 2.6; c.beginPath(); c.moveTo(s < 0 ? -9.4 : 1.2, ly); c.lineTo(s < 0 ? -1.2 : 9.4, ly); c.stroke(); }
  c.fillStyle = "#1a1500"; for (const [nx, ny] of [[-7, -25], [-4, -22.5], [4, -24], [7, -20]]) { c.beginPath(); c.ellipse(nx, ny, 1.1, .8, -.4, 0, 7); c.fill(); }
  c.restore();
}
function jzbIgel(c, g, k) { // 🦔 Igel mit Stacheln, Schnäuzchen und trippelnden Füßen
  const y = JZB.h - 1, lauf = g.schnuff > 0 ? 0 : Math.sin(g.t * 14);
  c.save(); c.translate(g.x, y); c.scale(g.dir * k, k);
  c.fillStyle = "#2b1d14"; for (const fx of [-4, 4]) { c.beginPath(); c.ellipse(fx + (fx > 0 ? lauf : -lauf) * 1.5, -1, 2, 1.2, 0, 0, 7); c.fill(); }
  // 2.393.0 KC-CLUB-IGEL-STACHELN (Fund Hansi): feinere Stacheln, auch an den Seiten bis fast zum Boden
  c.fillStyle = "#4e342e"; c.beginPath();
  for (let i = 0; i <= 44; i++) { const a = Math.PI * .94 + i / 44 * Math.PI * .98, r = i % 2 ? 11 : 12.4; c.lineTo(Math.cos(a) * r * 1.15 - 1, -2 + Math.sin(a) * r); } c.lineTo(6, -1); c.closePath(); c.fill();
  // 2.394.0 (Fund Hansi „an den Seiten nur eine braune Fläche“): Rücken UND Seiten ganz mit Stacheln – drei Reihen, leicht nach hinten geneigt
  c.lineCap = "round";
  for (const [r0, r1, n, ab] of [[1.5, 7.5, 18, 0], [4.5, 10.5, 28, .5], [7, 13, 40, 0]]) for (let i = 0; i <= n; i++) {
    const a = Math.PI * .93 + (i + ab) / n * Math.PI * .95, r = r1 + (i % 3) * .6, at = a - .22;
    const x0 = Math.cos(a) * r0 * 1.15 - 1, y0 = -2 + Math.sin(a) * r0, x1 = Math.cos(at) * r * 1.15 - 1, y1 = -2 + Math.sin(at) * r;
    c.strokeStyle = i % 2 ? "#2e2018" : "#6b4a3a"; c.lineWidth = .95; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = "rgba(235,220,200,.8)"; c.lineWidth = .55; c.beginPath(); c.moveTo(x0 + (x1 - x0) * .78, y0 + (y1 - y0) * .78); c.lineTo(x1, y1); c.stroke(); // helle Spitzen
  }
  const schnupf = g.schnuff > 0 ? Math.sin(g.t * 22) * .6 : 0;
  c.fillStyle = "#d7b899"; c.beginPath(); c.moveTo(7, -9); c.quadraticCurveTo(13, -6, 16 + schnupf, -3.5); c.quadraticCurveTo(12, -1, 7, -2); c.closePath(); c.fill();
  c.fillStyle = "#111"; c.beginPath(); c.arc(16.2 + schnupf, -3.6, 1.2, 0, 7); c.fill(); c.beginPath(); c.arc(10.5, -6.2, .9, 0, 7); c.fill();
  c.restore();
}
function jzbSchirm(c, s, k) { // ☔ gelber Regenschirm läuft vorbei (mit Gummistiefeln)
  const y = JZB.h - 1, schritt = Math.sin(s.t * 9), wipp = Math.abs(schritt) * 1.2;
  c.save(); c.translate(s.x, y); c.scale(k, k);
  c.strokeStyle = "#2b2b2b"; c.lineWidth = 1.6; c.lineCap = "round";
  for (const [b, v] of [[-2, schritt], [2, -schritt]]) { c.beginPath(); c.moveTo(b, -12); c.lineTo(b + v * 2.5, -3); c.stroke(); c.fillStyle = "#f2c200"; c.beginPath(); c.ellipse(b + v * 2.5 + 1, -1.8, 2.4, 1.8, 0, 0, 7); c.fill(); }
  c.fillStyle = "#24476b"; c.beginPath(); c.ellipse(0, -16, 4.5, 6, 0, 0, 7); c.fill(); // Mantel
  c.translate(0, -wipp); c.strokeStyle = "#d4a017"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -17); c.lineTo(0, -34); c.stroke();
  c.fillStyle = "#f6c445"; c.beginPath(); c.moveTo(-17, -32); // gelb – Weinrot verschwände im Kopf
  c.quadraticCurveTo(0, -52, 17, -32); for (let i = 0; i < 5; i++) { const x1 = 17 - i * 6.8, x2 = x1 - 6.8; c.quadraticCurveTo((x1 + x2) / 2, -35.5, x2, -32); } // gewellter Rand
  c.closePath(); c.fill();
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.1; for (const xx of [-10, 0, 10]) { c.beginPath(); c.moveTo(0, -44); c.quadraticCurveTo(xx * .6, -40, xx, -33); c.stroke(); } // Speichen
  c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -44, 1.3, 0, 7); c.fill();
  c.restore();
}
function jzbRegenMalen(c) {
  const J = JZB; if (!J.tropfen?.length) return;
  const W = J.wind, sx = (W ? W.dir * 160 * W.st : 40) / 300;
  c.strokeStyle = "rgba(205,228,255,.7)"; c.lineWidth = 1.1; c.beginPath();
  for (const t of J.tropfen) { c.moveTo(t.x, t.y); c.lineTo(t.x - sx * 12, t.y - 12); } c.stroke();
}
// ---------- KC-CLUB-JAHRESZEIT-TWINKEY (2.259.0, Wunsch Hansi „Twinkey kommt kurz mit einem Besen vorbei und sagt einen Spruch“) ----------
// Herbst: Twinkey fegt das Laub weg · Winter: Twinkey schippt den Schnee beiseite (im Wechsel mit dem Windstoß; jeder 3. Winter-Lauf bleibt
// der Schneemann) · Frühling/Sommer: Twinkey gießt die Blumen bzw. die Sonnenblume. Twinkey = 🧑‍🍳 wie beim Schach, Beine und Werkzeug gezeichnet,
// Spruch als Sprechblase über dem Kopf (aria-hidden, Tippen geht durch).
const JZB_SPRUECHE = {
  fegen: ["Im Takt fegen – eins, zwei, drei, vier!", "Einmal durchfegen – dann ist wieder Platz für die Probe.", "Allegro mit dem Besen!", "Sauber gefegt ist halb geprobt."],
  schippen: ["Schnee schippen hält fit – fast wie Pauke spielen!", "So, der Weg zur Probe ist frei!", "Ja, ja – im Winter gehört das Schneeschippen dazu.", "Brrr! Gleich gibt's einen heißen Tee vor der Probe."],
  giessenSommer: ["Die Sonnenblume hat Durst – ein Schluck Wasser für dich!", "Immer schön gießen – crescendo wachsen!", "Wer groß werden will, braucht Sonne und Wasser."],
  giessenFruehling: ["Die ersten Blumen – die brauchen jetzt viel Liebe.", "Ein bisschen Wasser, dann blüht's noch schöner.", "Frühling! Da klingt alles fast von allein."],
};
function jzbBesuchStart(art) {
  const J = JZB, dir = (J.lauf >> 1) % 2 ? -1 : 1;
  const B = { art, dir, x: dir > 0 ? -34 : J.w + 34, t: 0, sagt: false, halt: 0, fertig: false };
  if (art === "giessen") {
    const f = J.saison === "sommer" ? J.blumen[0] : J.blumen[Math.floor(J.blumen.length / 2)];
    B.ziel = f ? f.x - dir * (J.saison === "sommer" ? 24 : 18) * J.k : J.w / 2;
  } else { for (const f of J.flug) J.fx.push({ ...f, vx: 0, vy: f.vy || 20, a: 1 }); J.flug = []; jzbPhase("besuch"); }
  J.besuch = B;
}
function jzbSagen(text) {
  const b = JZB.blase; if (!b) return;
  b.textContent = "🧑‍🎓 " + text; b.classList.add("an"); clearTimeout(JZB.blaseUhr);
  JZB.blaseUhr = setTimeout(() => b.classList.remove("an"), 4200);
}
function jzbBesuchSchritt(dt) {
  const J = JZB, B = J.besuch; if (!B) return;
  const k = J.k, geht = !(B.halt > 0);
  B.t += dt;
  if (geht) B.x += B.dir * 34 * k * dt; else B.halt -= dt;
  const spitze = B.x + B.dir * 17 * k, hinter = (x) => (B.dir > 0 ? x <= spitze : x >= spitze);
  if (B.art === "fegen") {
    for (const b of J.liegt) if (hinter(b.x)) { J.fx.push({ typ: "blatt", x: b.x, y: J.h - b.yb, s: b.s, farbe: b.farbe, form: b.form, rot: b.rot, vr: jzbZ(-8, 8), vx: B.dir * jzbZ(90, 170), vy: -jzbZ(25, 75), ph: jzbZ(0, 6.3), fq: jzbZ(1, 2) }); b.weg = true; }
    J.liegt = J.liegt.filter((b) => !b.weg);
    J.boden.forEach((v, i) => { if (v && hinter(i * JZB_SP)) J.boden[i] = 0; });
  } else if (B.art === "schippen") {
    J.boden.forEach((v, i) => { if (v > .05 && hinter(i * JZB_SP)) { if (J.fx.length < 170 && Math.random() < v * .35) J.fx.push({ typ: "flocke", x: i * JZB_SP, y: J.h - v, r: jzbZ(.9, 2.3), vx: B.dir * jzbZ(50, 130), vy: -jzbZ(70, 150), a: 1 }); J.boden[i] = 0; } });
  } else if (B.art === "giessen") {
    if (!B.gegossen && (B.dir > 0 ? B.x >= B.ziel : B.x <= B.ziel)) { B.gegossen = true; B.halt = 4.5; }
    if (B.halt > 0 && Math.random() < dt * 30) J.fx.push({ typ: "wasser", x: B.x + B.dir * 21 * k, y: J.h - 24 * k, vx: B.dir * jzbZ(18, 34), vy: jzbZ(10, 30), a: 1, blass: 1.2 });
  }
  if (!B.sagt && (B.art === "giessen" ? B.halt > 0 : (B.dir > 0 ? B.x > J.w * .38 : B.x < J.w * .62))) {
    B.sagt = true; jzbSagen(jzbW(JZB_SPRUECHE[B.art === "giessen" ? (J.saison === "sommer" ? "giessenSommer" : "giessenFruehling") : B.art]));
  }
  if (J.blase) { const halb = (J.blase.offsetWidth || 160) / 2 + 8; J.blase.style.left = `${Math.max(halb, Math.min(J.w - halb, B.x))}px`; } // ganz im Kopf
  if (B.x < -50 || B.x > J.w + 50) J.besuch = null;
}
function jzbTwinkeyMalen(c) {
  const J = JZB, B = J.besuch; if (!B) return;
  const k = J.k, y = J.h, geht = !(B.halt > 0), schritt = geht ? Math.sin(B.t * 10) : 0, x = B.x;
  c.save(); c.lineCap = "round";
  c.strokeStyle = "#2c3e50"; c.lineWidth = 2.6 * k; // Beine
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 2.5 * k, y - 11 * k); c.lineTo(x + s * 2.5 * k + schritt * s * 3.5 * k, y - 2 * k); c.stroke(); c.fillStyle = "#111"; c.beginPath(); c.ellipse(x + s * 2.5 * k + schritt * s * 3.5 * k + B.dir * 1.2 * k, y - 1.6 * k, 2.4 * k, 1.4 * k, 0, 0, 7); c.fill(); }
  const hx = x + B.dir * 8 * k, hy = y - 17 * k; // Hand
  if (B.art === "fegen" || B.art === "schippen") {
    const zug = Math.sin(B.t * 9), tx = x + B.dir * (17 + zug * 4) * k, ty = y - (B.art === "schippen" ? 3 + Math.max(0, -zug) * 5 : 2) * k;
    c.strokeStyle = "#8d5a2b"; c.lineWidth = 1.8 * k; c.beginPath(); c.moveTo(hx - B.dir * 3 * k, hy - 6 * k); c.lineTo(tx, ty); c.stroke();
    c.save(); c.translate(tx, ty); c.scale(B.dir, 1);
    if (B.art === "fegen") { c.fillStyle = "#d9a441"; c.beginPath(); c.moveTo(-2 * k, -3 * k); c.lineTo(3 * k, -3 * k); c.lineTo(6 * k, 2.4 * k); c.lineTo(-4 * k, 2.4 * k); c.closePath(); c.fill(); c.strokeStyle = "#a87a22"; c.lineWidth = .7; for (const b of [-2, 0, 2, 4]) { c.beginPath(); c.moveTo(b * .6 * k, -2.5 * k); c.lineTo(b * k, 2.2 * k); c.stroke(); } }
    else { c.fillStyle = "#9aa3ab"; c.beginPath(); c.moveTo(-2 * k, -3 * k); c.lineTo(6 * k, -1 * k); c.lineTo(6 * k, 2.5 * k); c.lineTo(-2 * k, 2.5 * k); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.fillRect(-1 * k, -1 * k, 6 * k, 2 * k); }
    c.restore();
  } else { // Gießkanne
    const kipp = B.halt > 0 ? .55 : .1;
    c.save(); c.translate(hx + B.dir * 3 * k, hy + 1 * k); c.scale(B.dir, 1); c.rotate(kipp);
    c.fillStyle = "#2e8b57"; c.beginPath(); c.roundRect ? c.roundRect(-4 * k, -4 * k, 9 * k, 8 * k, 2 * k) : c.rect(-4 * k, -4 * k, 9 * k, 8 * k); c.fill();
    c.strokeStyle = "#2e8b57"; c.lineWidth = 1.6 * k; c.beginPath(); c.moveTo(5 * k, 1 * k); c.lineTo(11 * k, -4 * k); c.stroke(); c.beginPath(); c.arc(0, -5 * k, 3 * k, Math.PI, 0); c.stroke();
    c.restore();
  }
  const kopfY = y - 8 * k + (geht ? -Math.abs(schritt) * 1.2 * k : 0);
  if (!KOCH.ok && KOCH.bild?.complete && KOCH.bild.naturalWidth) { const g = 26 * k; c.drawImage(KOCH.bild, x - g / 2, kopfY - g * 1.02, g, g); } // 2.355.0: Gerät ohne Koch-Emoji
  else { c.font = `${26 * k}px ${JZB_EMOJI}`; c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText("🧑‍🎓", x, kopfY); }
  c.restore();
}
// Vorschau aus den Einstellungen: eine Jahreszeit sofort im Kopf zeigen (bis „Heute“ oder Neustart der App)
function jahreszeitVorschau(art, extra) { // extra (2.249.0): nikolaus, regen, topf, ostern, igel
  if (!fxAn()) return fxAusHinweis(() => jahreszeitVorschau(art, extra));
  if (!einst("jahreszeit", true)) return melde("„🍂 Jahreszeiten im Kopf“ ist aus – erst einschalten.", true);
  if (art === "heute") JZB.vorschau = ""; else if (art) JZB.vorschau = art;
  JZB.vorschauSeit = art === "heute" ? 0 : Date.now(); // 2.358.0 KC-CLUB-AKKU-3
  JZB.eisName = null; JZB.eisStueck = null; JZB.nussName = null; // 2.356.0 KC-CLUB-NAME-WEG: Vorschau gewechselt oder beendet → kein alter Name bleibt stehen
  JZB.extra = extra || "";
  zeige("start"); setTimeout(jahreszeitKopf, 350);
  jzVorschauLeiste(); // 2.355.0
}
// ---------- 2.355.0 KC-CLUB-VORSCHAU-ENDE (Fund Hansi „in den Einstellungen z. B. Nikolaus-Stiefel gewählt, wird angezeigt – wie bekomme ich ihn
// wieder weg?“): solange eine Vorschau läuft, steht auf der Startseite ein Knopf „✕ Vorschau beenden“ (vorher nur „📅 Heute“ in den Einstellungen)
const JZ_VORSCHAU_NAME = { nikolaus: "Nikolaus-Stiefel", regen: "Regen", topf: "Notenständer am Probentag", ostern: "Ostereier", igel: "Igel", twinkey: "Orchesterwart fegt",
  herbst: "Herbst", winter: "Winter", fruehling: "Frühling", sommer: "Sommer", kirmes: "Kirmes", wiesn: "Oktoberfest", karibik: "Karibik", karneval: "Karneval", halloween: "Halloween", advent: "Advent" };
function jzVorschauLeiste(v = S.view) {
  const an = !!(JZB.vorschau || JZB.extra) && v === "start" && !(typeof RG !== "undefined" && RG.an);
  let b = $("jzVorschauAus");
  if (!an) { b?.remove(); return; }
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "jzVorschauAus"; b.className = "jz-vorschau-aus"; b.onclick = () => { jahreszeitVorschau("heute"); melde("📅 Vorschau beendet – der Kopf zeigt wieder den heutigen Tag."); }; document.body.appendChild(b); }
  b.innerHTML = `👁 Vorschau: <b>${esc(JZ_VORSCHAU_NAME[JZB.extra] || JZ_VORSCHAU_NAME[JZB.vorschau] || "Jahreszeit")}</b> · ✕ beenden`;
}

// ---------- Schnittstelle für die Bachkreis-App ----------
// Kopf wieder sichtbar (z. B. nach Themenwechsel in den Einstellungen): Jahreszeit neu zeichnen, wenn sie sich geändert hat
function jzPruefen() { if (JZB.vorschau) return; if (JZ_LETZTE.art !== jahreszeitAktuell()) jahreszeitKopf(); }
jahreszeitArtSetzen(jahreszeitArt); beiThemaWechsel(() => { if (!JZB.vorschau) jahreszeitKopf(); });
export { jzPruefen, jahreszeitKopf, jahreszeitArt, jahreszeitAktuell, jahreszeitVorschau, jzWahl, jzWahlSetzen, JZ_WAHL, jzDekoWahl, jzDekoSetzen, JZ_DEKO_WAHL, jzAnfaenge, jzEisLaenge, jzDekoMalen, jzVorschauLeiste, JZB, JZB_EXTRAS, JZ_VORSCHAU_NAME };
