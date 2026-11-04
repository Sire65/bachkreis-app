// 🧩 Bedienung wie die KC Club App 2.858 (0.30.0): Schatten & Ecken (KC-CLUB-SCHATTEN, -KACHEL-ECKEN), größere Tippflächen
// (KC-CLUB-TIPPFLAECHEN), Kachel-Effekte (KC-CLUB-KACHEL-WIRBEL, -ZUG), 🎁 Geburtstags-Vogel (KC-CLUB-GEBURTSTAG-VOGEL) und
// ⏱️ Timer · Stoppuhr · 🥁 Metronom (KC-CLUB-UHR-WECKER, fürs Üben). Alles nur auf diesem Gerät – nichts geht an den Server.
import { S, einst, einstSetzen, zeige } from "./zustand.js";
import { esc, AKTIONEN, blatt, toast } from "../kern/ui.js";

const ruhig = () => einst().effekte === false || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("spar");

// ================= 🌗 Schatten · ⬜ Ecken · 👆 Tippflächen =================
export const SCHATTEN = [["", "Standard"], ["aus", "Aus"], ["leicht", "🌤️ Leicht"], ["mittel", "⛅ Mittel"], ["kraeftig", "🌥️ Kräftig"]];
export const ECKEN_STANDARD = 18;
export function bedienungAnwenden() {
  const e = einst(), r = document.documentElement;
  for (const [s] of SCHATTEN) if (s) r.classList.toggle("sch-" + s, e.schatten === s);
  const ecken = Number(e.ecken);
  if (e.ecken !== undefined && e.ecken !== null && e.ecken !== "" && ecken >= 2 && ecken <= 32) r.style.setProperty("--radius", ecken + "px"); else r.style.removeProperty("--radius");
  r.classList.toggle("tipp-gross", e.tippGross !== false);
}
if (typeof document !== "undefined") { document.addEventListener("bk-einst", bedienungAnwenden); bedienungAnwenden(); }
AKTIONEN.schattenWahl = (x) => { einstSetzen("schatten", x || null); neuEinst(); };
AKTIONEN.eckenStandard = () => { einstSetzen("ecken", null); neuEinst(); toast(`⬜ Ecken wieder Standard (${ECKEN_STANDARD} px)`); };
AKTIONEN.eckenSetzen = (v) => { einstSetzen("ecken", Number(v)); const w = document.getElementById("eckenWert"); if (w) w.textContent = `${v} px`; };
const neuEinst = () => { if (S.view === "einstellungen") { const y = scrollY; zeige("einstellungen", {}, { ersetzen: true }); scrollTo(0, y); } };
export const eckenWert = () => (Number(einst().ecken) >= 2 ? Number(einst().ecken) : ECKEN_STANDARD);

// ================= 🌀 Kachel-Effekte beim Erscheinen =================
export const KACHEL_EFFEKTE = [["einfach", "✨ Einblenden"], ["zug", "🚂 Kachel-Zug"], ["welle", "🌊 Welle"], ["wirbel", "🌀 Wirbel"], ["wackeln", "🫨 Wackeln"], ["start", "🚀 Start"], ["abwechselnd", "🔀 Abwechselnd"], ["aus", "⏸️ Ohne"]];
const FX_REIHUM = ["zug", "welle", "wirbel", "wackeln", "start"];
let fxLetzt = "";
export function kachelEffekt(raster = document.getElementById("raster")) {
  if (!raster || raster.classList.contains("anordnen")) return;
  let w = einst().kachelEffekt || "einfach";
  if (w === "abwechselnd") { const l = FX_REIHUM.filter((x) => x !== fxLetzt); w = l[Math.floor(Math.random() * l.length)]; }
  fxLetzt = w;
  raster.classList.remove(...KACHEL_EFFEKTE.map(([k]) => "fx-" + k));
  [...raster.children].forEach((k, i) => k.style.setProperty("--i", String(i)));
  if (ruhig() || w === "einfach") return;
  raster.classList.add("fx-" + w);
}
AKTIONEN.kachelEffektWahl = (x) => { einstSetzen("kachelEffekt", x); neuEinst(); toast(`${KACHEL_EFFEKTE.find(([k]) => k === x)?.[1] || ""} – zu sehen auf der Startseite`); };
AKTIONEN.kachelEffektVorschau = () => { zeige("start"); setTimeout(() => kachelEffekt(), 50); };

// ================= 🎁 Geburtstags-Vogel im Kopf =================
// Hat heute jemand Geburtstag (nur wer den Geburtstag freigegeben hat – wie „Für dich“), fliegt ein Vogel mit Paket durch den Kopf,
// wirft es ab, ein Blumenstrauß springt heraus, dazu „Happy Birthday“ mit Vornamen. Höchstens einmal je Stunde und Gerät.
const GBV_ABSTAND_MS = 60 * 60000, GBV_F = 1.55;
const GBV_VOGEL = `<svg viewBox="0 0 90 70" width="${90 * GBV_F}" height="${70 * GBV_F}"><path class="gbv-schnur" d="M45 40 L45 52" stroke="#5a3718" stroke-width="1.5"/>
  <g class="gbv-paket-am"><rect x="33" y="50" width="24" height="18" rx="2" fill="#1a1500"/><rect x="43" y="50" width="4" height="18" fill="#d4a017"/><rect x="33" y="57" width="24" height="4" fill="#d4a017"/></g>
  <ellipse cx="45" cy="32" rx="20" ry="11" fill="#3d6fb6"/><circle cx="64" cy="25" r="8" fill="#3d6fb6"/><circle cx="67" cy="23" r="1.8" fill="#fff"/><circle cx="67.5" cy="23" r=".9" fill="#111"/>
  <path d="M71 25 L80 27 L71 29 Z" fill="#f2a900"/><path d="M25 30 L10 24 L14 34 Z" fill="#2c5592"/><path class="gbv-fluegel" d="M40 28 Q32 6 52 10 Q50 22 48 28 Z" fill="#5b8fd8"/></svg>`;
const GBV_PAKET = `<svg viewBox="0 0 28 26" width="${28 * GBV_F}" height="${26 * GBV_F}"><rect x="2" y="6" width="24" height="18" rx="2" fill="#1a1500"/><rect x="12" y="6" width="4" height="18" fill="#d4a017"/><rect x="2" y="13" width="24" height="4" fill="#d4a017"/><path d="M14 6 Q8 0 6 4 Q8 7 14 6 Q20 7 22 4 Q20 0 14 6" fill="#d4a017"/></svg>`;
let GBV_QUELLE = () => [];
export function gbvVerbinden(f) { GBV_QUELLE = f; }
export function gbvPruefen() {
  const h = document.getElementById("bkHero");
  if (einst().gbvogel === false || ruhig() || S.view !== "start" || document.hidden || !h || h.classList.contains("eingerollt")) return;
  const namen = GBV_QUELLE(); if (!namen.length) return;
  const k = "bk_gbv_" + new Date().toISOString().slice(0, 10); let zuletzt = 0; try { zuletzt = Number(localStorage.getItem(k)) || 0; } catch {}
  if (Date.now() - zuletzt < GBV_ABSTAND_MS) return;
  try { localStorage.setItem(k, String(Date.now())); } catch {}
  setTimeout(() => gbvFlug(namen), 1500);
}
// Happy Birthday (Mildred & Patty Hill, gemeinfrei) – leise, selbst erzeugt
const HB = [[67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2], [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2]];
function hbSpielen(laut = 0.12, schlag = 0.42) {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(); let t = a.currentTime + 0.05;
    for (const [n, d] of HB) { const o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = 440 * 2 ** ((n - 69) / 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d * schlag * 0.95);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + d * schlag); t += d * schlag; }
    setTimeout(() => a.close?.(), (t - a.currentTime + 1) * 1000);
  } catch {}
}
export async function gbvFlug(namen = ["dir"]) {
  const h = document.getElementById("bkHero"); if (!h || !h.getClientRects().length || typeof h.animate !== "function" || h.querySelector(".gbv")) return;
  const W = h.offsetWidth, H = h.offsetHeight, warten = (a) => a.finished.catch(() => {});
  const b = document.createElement("div"); b.className = "gbv"; b.setAttribute("aria-hidden", "true");
  b.innerHTML = `<i class="gbv-vogel">${GBV_VOGEL}</i><i class="gbv-paket">${GBV_PAKET}</i><i class="gbv-strauss">💐</i><b class="gbv-text">${[..."Happy Birthday"].map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}</b><small class="gbv-name"></small>`;
  b.querySelector(".gbv-name").textContent = namen.length === 1 && namen[0] === "dir" ? "Alles Gute für dich! 🎂" : "Alles Gute, " + (namen.length > 1 ? namen.slice(0, -1).join(", ") + " und " + namen[namen.length - 1] : namen[0]) + "! 🎂";
  h.append(b);
  try {
    const v = b.querySelector(".gbv-vogel"), pk = b.querySelector(".gbv-paket"), am = v.querySelector(".gbv-paket-am"), schnur = v.querySelector(".gbv-schnur");
    const VB = 90 * GBV_F, VH = 70 * GBV_F, boden = H - 26 * GBV_F - 8, abwurfX = W * 0.5 - VB / 2;
    const R = Math.max(22, Math.min(55, W * 0.15, (boden - VH - 40) / 2)), yU = Math.max(6, Math.min(H * 0.12, boden - VH - 30)) + 2 * R, cy = yU - R;
    const T_REIN = 3000, T_KREIS = 3600, T_RAUS = 3000, FLUG = T_REIN + T_KREIS + T_RAUS, k = [];
    const kf = (x, y, s, t) => k.push({ transform: `translate(${x}px, ${y}px) scaleX(${s})`, offset: t / FLUG });
    kf(-VB - 20, yU + 24, 1, 0);
    for (let i = 0; i <= 24; i++) { const w = (i / 24) * Math.PI * 2, c = Math.cos(w); kf(abwurfX + R * Math.sin(w), cy + R * c, Math.sign(c || 1) * Math.max(0.55, Math.abs(c)), T_REIN + (i / 24) * T_KREIS); }
    kf(W + 30, yU - 40, 1, FLUG);
    v.style.transformOrigin = `${VB / 2}px ${VH / 2}px`;
    if (einst().ton !== false) hbSpielen();
    const flug = v.animate(k, { duration: FLUG, easing: "linear", fill: "forwards" });
    await new Promise((r) => setTimeout(r, T_REIN + T_KREIS));
    am.style.visibility = "hidden"; schnur.style.visibility = "hidden";
    const px = abwurfX + 33 * GBV_F, py = yU + 50 * GBV_F;
    pk.style.opacity = "1";
    await warten(pk.animate([{ transform: `translate(${px}px, ${py}px) rotate(0deg)` }, { transform: `translate(${px}px, ${boden}px) rotate(18deg)` }], { duration: 1200, easing: "cubic-bezier(.45,0,1,1)", fill: "forwards" }));
    await warten(pk.animate([{ transform: `translate(${px}px, ${boden}px) scale(1.25, .7)` }, { transform: `translate(${px}px, ${boden - 6}px) scale(1.5)`, opacity: 0 }], { duration: 260, fill: "forwards" }));
    for (let i = 0; i < 14; i++) { const f = document.createElement("u"); f.className = "gbv-fetzen"; f.style.background = ["#1a1500", "#d4a017", "#e94b3c", "#3d6fb6", "#2fa36b", "#f2b705"][i % 6]; b.append(f);
      const wink = (i / 14) * Math.PI * 2, wx = Math.cos(wink) * (40 + (i % 3) * 18), wy = Math.sin(wink) * 30 - 40;
      f.animate([{ transform: `translate(${px + 20}px, ${boden + 14}px)`, opacity: 1 }, { transform: `translate(${px + 20 + wx}px, ${boden + 14 + wy}px) rotate(${i * 50}deg)`, opacity: 0 }], { duration: 900, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }); }
    const st = b.querySelector(".gbv-strauss"), sx = W / 2 - 37, sy = boden - 56;
    st.animate([{ transform: `translate(${sx}px, ${sy + 30}px) scale(.1)`, opacity: 0 }, { transform: `translate(${sx}px, ${sy - 8}px) scale(1.15)`, opacity: 1, offset: 0.6 }, { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1 }], { duration: 700, easing: "ease-out", fill: "forwards" });
    const tx = b.querySelector(".gbv-text"), nm = b.querySelector(".gbv-name"), ty = Math.max(cy - R + 20, sy - 84);
    tx.style.top = ty + "px"; nm.style.top = ty + 50 + "px"; b.classList.add("gbv-feier");
    await warten(nm.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 1200, fill: "forwards" }));
    await new Promise((r) => setTimeout(r, 5000));
    await warten(b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, fill: "forwards" }));
    flug.cancel();
  } finally { b.remove(); }
}
AKTIONEN.gbvVorschau = () => { zeige("start"); setTimeout(() => gbvFlug([S.ich?.vorname || "dir"]), 600); };

// ================= ⏱️ Timer · Stoppuhr · 🥁 Metronom =================
// Läuft, solange die App offen ist. Timer-Ende: Gong, Vibration, Hinweis. Metronom: 30–240 Schläge, Taktart mit Betonung, Tippen = Tempo.
const UW = { tab: "metronom", timerBis: 0, timerDauer: 0, timerPause: 0, stoppStart: 0, stoppZeit: 0, runden: [], takt: null,
  bpm: 90, schlaege: 4, an: false, schlag: 0, naechster: 0, ctx: null, plan: null, tipps: [] };
const fmt = (ms, zehntel = false) => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  return `${h ? h + ":" : ""}${String(m % 60).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}${zehntel ? "," + Math.floor((ms % 1000) / 100) : ""}`; };
const TEMPI = [[40, "Grave"], [60, "Largo"], [66, "Larghetto"], [76, "Adagio"], [92, "Andante"], [108, "Moderato"], [120, "Allegretto"], [156, "Allegro"], [176, "Vivace"], [200, "Presto"], [999, "Prestissimo"]];
export const tempoName = (bpm) => TEMPI.find(([g]) => bpm < g)?.[1] || "Prestissimo";
function audioCtx() { try { UW.ctx = UW.ctx || new (window.AudioContext || window.webkitAudioContext)(); UW.ctx.resume?.(); } catch { UW.ctx = null; } return UW.ctx; }
function klick(t, betont) {
  const a = UW.ctx; if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = betont ? 1760 : 1175;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(betont ? 0.35 : 0.2, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06);
}
function gong() {
  const a = audioCtx(); if (!a || einst().ton === false) return;
  for (let i = 0; i < 3; i++) { const t = a.currentTime + 0.05 + i * 0.9; for (const [m, l] of [[1, 0.3], [2.76, 0.1], [5.4, 0.04]]) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 523 * m;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(l, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 1.3); } }
}
function metronomPlanen() {
  const a = UW.ctx; if (!a || !UW.an) return;
  while (UW.naechster < a.currentTime + 0.12) {
    const betont = UW.schlaege > 1 && UW.schlag % UW.schlaege === 0, nr = UW.schlag % UW.schlaege, t = UW.naechster;
    klick(t, betont);
    setTimeout(() => { document.querySelectorAll(".mt-punkt").forEach((p, i) => p.classList.toggle("an", i === nr)); }, Math.max(0, (t - a.currentTime) * 1000));
    UW.schlag++; UW.naechster += 60 / UW.bpm;
  }
}
function metronomStart() { const a = audioCtx(); if (!a) return toast("🔇 Ton ist auf diesem Gerät nicht verfügbar"); UW.an = true; UW.schlag = 0; UW.naechster = a.currentTime + 0.08; clearInterval(UW.plan); UW.plan = setInterval(metronomPlanen, 25); metronomPlanen(); }
function metronomStopp() { UW.an = false; clearInterval(UW.plan); document.querySelectorAll(".mt-punkt").forEach((p) => p.classList.remove("an")); }
function uwHtml() {
  const tab = (k, t) => `<button type="button" class="${UW.tab === k ? "an" : ""}" data-a="uwTab" data-x="${k}" aria-pressed="${UW.tab === k}">${t}</button>`;
  let inhalt = "";
  if (UW.tab === "metronom") inhalt = `<div class="mt-anzeige"><b id="mtBpm">${UW.bpm}</b><small>Schläge/Min · <span id="mtName">${tempoName(UW.bpm)}</span></small></div>
    <div class="mt-punkte" aria-hidden="true">${Array.from({ length: UW.schlaege }, (_, i) => `<i class="mt-punkt${i === 0 && UW.schlaege > 1 ? " eins" : ""}"></i>`).join("")}</div>
    <input type="range" min="30" max="240" value="${UW.bpm}" data-c="mtBpm" aria-label="Tempo in Schlägen pro Minute" class="mt-regler">
    <div class="knopfreihe uw-mitte"><button type="button" class="knopf" data-a="mtSchritt" data-x="-5">−5</button><button type="button" class="knopf" data-a="mtSchritt" data-x="-1">−1</button><button type="button" class="knopf" data-a="mtSchritt" data-x="1">+1</button><button type="button" class="knopf" data-a="mtSchritt" data-x="5">+5</button></div>
    <div class="wahlen uw-mitte">${[[1, "ohne Takt"], [2, "2/4"], [3, "3/4"], [4, "4/4"], [6, "6/8"]].map(([n, t]) => `<button type="button" class="chip-wahl${UW.schlaege === n ? " an" : ""}" data-a="mtTakt" data-x="${n}" aria-pressed="${UW.schlaege === n}">${t}</button>`).join("")}</div>
    <div class="knopfreihe uw-mitte"><button type="button" class="knopf haupt" data-a="mtUm">${UW.an ? "⏹ Stopp" : "▶ Start"}</button><button type="button" class="knopf" data-a="mtTippen">👆 Tempo tippen</button></div>`;
  else if (UW.tab === "timer") { const rest = UW.timerBis ? UW.timerBis - Date.now() : UW.timerPause;
    inhalt = `<div class="mt-anzeige"><b id="uwTimer">${fmt(rest || 0)}</b><small>${UW.timerBis ? "läuft" : UW.timerPause ? "angehalten" : "Zeit wählen"}</small></div>
    <div class="wahlen uw-mitte">${[1, 3, 5, 10, 15, 20, 30, 45, 60].map((m) => `<button type="button" class="chip-wahl" data-a="uwTimerSetzen" data-x="${m}">${m} Min.</button>`).join("")}</div>
    <div class="knopfreihe uw-mitte">${UW.timerBis ? `<button type="button" class="knopf" data-a="uwTimerPause">⏸ Anhalten</button>` : UW.timerPause ? `<button type="button" class="knopf haupt" data-a="uwTimerWeiter">▶ Weiter</button>` : ""}${UW.timerBis || UW.timerPause ? `<button type="button" class="knopf" data-a="uwTimerStopp">✖ Beenden</button>` : ""}</div>
    <p class="hinweis">Zum Üben: z. B. 15 Minuten – am Ende klingt ein Gong. Läuft, solange die App offen ist.</p>`; }
  else { const z = UW.stoppStart ? Date.now() - UW.stoppStart + UW.stoppZeit : UW.stoppZeit;
    inhalt = `<div class="mt-anzeige"><b id="uwStopp">${fmt(z, true)}</b><small>${UW.stoppStart ? "läuft" : z ? "angehalten" : "bereit"}</small></div>
    <div class="knopfreihe uw-mitte"><button type="button" class="knopf haupt" data-a="uwStoppUm">${UW.stoppStart ? "⏸ Anhalten" : "▶ Start"}</button>${UW.stoppStart ? `<button type="button" class="knopf" data-a="uwRunde">🏁 Runde</button>` : z ? `<button type="button" class="knopf" data-a="uwStoppNull">↺ Null</button>` : ""}</div>
    ${UW.runden.length ? `<ol class="uw-runden">${UW.runden.map((r) => `<li>${fmt(r, true)}</li>`).join("")}</ol>` : ""}`; }
  return `<div class="uw-tabs" role="group" aria-label="Werkzeug">${tab("metronom", "🥁 Metronom")}${tab("timer", "⏲️ Timer")}${tab("stopp", "⏱️ Stoppuhr")}</div><div id="uwInhalt">${inhalt}</div>`;
}
const uwNeu = () => { const w = document.getElementById("uwWurzel"); if (w) w.innerHTML = uwHtml(); };
export function uhrWerkzeug(tab) { if (tab) UW.tab = tab; blatt("⏱️ Uhr & Takt", `<div id="uwWurzel" class="uw">${uwHtml()}</div>`); uwTakt(); }
function uwTakt() {
  clearInterval(UW.takt);
  UW.takt = setInterval(() => {
    if (UW.timerBis && Date.now() >= UW.timerBis) { UW.timerBis = 0; UW.timerPause = 0; gong(); try { navigator.vibrate?.([300, 150, 300]); } catch {} toast(`⏲️ Zeit ist um (${UW.timerDauer} Min.) – gut gemacht! 🎻`, 6000); uwNeu(); }
    const t = document.getElementById("uwTimer"); if (t && UW.timerBis) t.textContent = fmt(UW.timerBis - Date.now());
    const s = document.getElementById("uwStopp"); if (s && UW.stoppStart) s.textContent = fmt(Date.now() - UW.stoppStart + UW.stoppZeit, true);
    if (!UW.timerBis && !UW.stoppStart && !UW.an && !document.getElementById("uwWurzel")) clearInterval(UW.takt);
  }, 100);
}
export const uhrWerkzeugLaeuft = () => !!(UW.timerBis || UW.stoppStart || UW.an);
AKTIONEN.uhrWerkzeug = (x) => uhrWerkzeug(x || undefined);
AKTIONEN.uwTab = (x) => { UW.tab = x; uwNeu(); };
AKTIONEN.mtUm = () => { if (UW.an) metronomStopp(); else metronomStart(); uwNeu(); uwTakt(); };
AKTIONEN.mtTakt = (x) => { UW.schlaege = Number(x) || 4; UW.schlag = 0; uwNeu(); };
const bpmSetzen = (v) => { UW.bpm = Math.max(30, Math.min(240, Math.round(v))); const b = document.getElementById("mtBpm"), n = document.getElementById("mtName"), r = document.querySelector(".mt-regler");
  if (b) b.textContent = UW.bpm; if (n) n.textContent = tempoName(UW.bpm); if (r) r.value = UW.bpm; };
AKTIONEN.mtBpm = (v) => bpmSetzen(Number(v));
AKTIONEN.mtSchritt = (x) => bpmSetzen(UW.bpm + Number(x));
AKTIONEN.mtTippen = () => {
  const t = performance.now(); UW.tipps = [...UW.tipps.filter((x) => t - x < 3000), t].slice(-6);
  if (UW.tipps.length >= 2) { const d = (UW.tipps[UW.tipps.length - 1] - UW.tipps[0]) / (UW.tipps.length - 1); bpmSetzen(60000 / d); }
};
AKTIONEN.uwTimerSetzen = (x) => { audioCtx(); UW.timerDauer = Number(x); UW.timerBis = Date.now() + UW.timerDauer * 60000; UW.timerPause = 0; uwNeu(); uwTakt(); };
AKTIONEN.uwTimerPause = () => { UW.timerPause = UW.timerBis - Date.now(); UW.timerBis = 0; uwNeu(); };
AKTIONEN.uwTimerWeiter = () => { UW.timerBis = Date.now() + UW.timerPause; UW.timerPause = 0; uwNeu(); uwTakt(); };
AKTIONEN.uwTimerStopp = () => { UW.timerBis = 0; UW.timerPause = 0; uwNeu(); };
AKTIONEN.uwStoppUm = () => { if (UW.stoppStart) { UW.stoppZeit += Date.now() - UW.stoppStart; UW.stoppStart = 0; } else UW.stoppStart = Date.now(); uwNeu(); uwTakt(); };
AKTIONEN.uwRunde = () => { UW.runden.unshift(Date.now() - UW.stoppStart + UW.stoppZeit); UW.runden = UW.runden.slice(0, 10); uwNeu(); };
AKTIONEN.uwStoppNull = () => { UW.stoppZeit = 0; UW.runden = []; uwNeu(); };
// Schieberegler (Ecken, Tempo) wirken schon beim Ziehen, nicht erst beim Loslassen
if (typeof document !== "undefined") document.addEventListener("input", (e) => { const el = e.target; if (el?.matches?.('input[type="range"][data-c]')) AKTIONEN[el.dataset.c]?.(el.value, el, e); });
