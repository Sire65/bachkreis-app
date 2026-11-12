// 🕰️ Stundenuhren zur vollen Stunde (0.30.0, wie KC-CLUB-STUNDENUHREN / -ECHT): neben dem Kuckuck berühmte Uhren und Glockenspiele mit
// echten, frei verwendbaren Aufnahmen (Quelle, Urheber und Lizenz stehen in den Einstellungen und in docs/LIZENZEN-TOENE.md).
// Mehrere gewählt → jede Stunde die nächste. Aufnahmen werden erst beim ersten Gebrauch geladen; fehlen sie (offline), klingt eine selbst
// erzeugte Glocke – nie Stille. Nur bei offener App; nachts (22–7 Uhr) ohne Ton.
import { einst, einstSetzen } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";

const CC_BY_SA = "CC BY-SA 4.0", GEKUERZT = "gekürzt, lautstärkeangepasst";
export const UHR_AUFNAHMEN = {
  bigben_melodie: { datei: "ton/uhr-bigben-melodie.mp3", was: "Big Ben, Westminster-Melodie (Radio Oranje, Neujahr 1945)", urheber: "Great Brightstar (Hochlader)", lizenz: "gemeinfrei", quelle: "https://commons.wikimedia.org/wiki/File:Westminster_chimes_(1_January_1945).wav" },
  bigben_schlag: { datei: "ton/uhr-bigben-schlag.mp3", was: "Big Ben, Stundenschlag (1945)", urheber: "Great Brightstar (Hochlader)", lizenz: "gemeinfrei", quelle: "https://commons.wikimedia.org/wiki/File:Westminster_chimes_(1_January_1945).wav" },
  carillon_melodie: { datei: "ton/uhr-carillon-melodie.mp3", was: "Westminster-Melodie vom Carillon", urheber: "Max.metz", lizenz: CC_BY_SA, quelle: "https://commons.wikimedia.org/wiki/File:Westminster-vom-Carillon_MaxMetz.wav" },
  carillon_schlag: { datei: "ton/uhr-carillon-schlag.mp3", was: "Carillon, Stundenschlag", urheber: "Max.metz", lizenz: CC_BY_SA, quelle: "https://commons.wikimedia.org/wiki/File:Westminster-vom-Carillon_MaxMetz.wav" },
  roehren_schlag: { datei: "ton/uhr-roehren-schlag.mp3", was: "Standuhr aus Röhrenglocken", urheber: "gsb1039", lizenz: "CC0", quelle: "https://commons.wikimedia.org/wiki/File:415061_gsb1039_clock-chime-tubebells-handbells-vibes.wav" },
  standuhr_ticken: { datei: "ton/uhr-standuhr-ticken.mp3", was: "Große Standuhr in London-Hackney: Ticken und Anlauf", urheber: "radio aporee (Aufnahme 52813)", lizenz: "gemeinfrei (Public Domain Mark 1.0)", quelle: "https://archive.org/details/aporee_52813_60333" },
  standuhr_schlag: { datei: "ton/uhr-standuhr-schlag.mp3", was: "Große Standuhr in London-Hackney: Stundenschlag", urheber: "radio aporee (Aufnahme 52813)", lizenz: "gemeinfrei (Public Domain Mark 1.0)", quelle: "https://archive.org/details/aporee_52813_60333" },
  kiel: { datei: "ton/uhr-kiel.mp3", was: "Glockenspiel im Kieler Rathausturm", urheber: "Michael Brandtner", lizenz: "CC BY 4.0", quelle: "https://commons.wikimedia.org/wiki/File:Glockenspiel_Kieler_Rathausturm.flac" },
  berlin: { datei: "ton/uhr-berlin.mp3", was: "Geläut des Berliner Doms (2016)", urheber: "Morn", lizenz: CC_BY_SA, quelle: "https://commons.wikimedia.org/wiki/File:Berlin_Cathedral_bells,_2016.wav" },
  freiburg: { datei: "ton/uhr-freiburg.mp3", was: "Glockenspiel am Neuen Rathaus Freiburg („Stimmt an mit hellem hohen Klang“)", urheber: "Andreas Schwarzkopf", lizenz: CC_BY_SA, quelle: "https://commons.wikimedia.org/wiki/File:Neues_Rathaus_Freiburg,_Glockenspiel.mp3" },
};
for (const a of Object.values(UHR_AUFNAHMEN)) a.geaendert = GEKUERZT;
// Ersatzklang: Glocke aus Teiltönen (Schlagton, Unterton, kleine Terz, Quinte) – f = Grundfrequenz
const glocke = (f, laut = 0.3, dauer = 2.6) => (a, t) => {
  for (const [m, l, d] of [[1, 1, 1], [0.5, 0.5, 1.3], [1.2, 0.35, 0.7], [1.5, 0.25, 0.6], [2, 0.3, 0.5], [2.76, 0.12, 0.35]]) {
    const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut * l, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer * d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dauer * d + 0.05);
  }
  return 0;
};
export const STUNDENUHREN = [
  { id: "kuckuck", sym: "🐦", t: "Kuckucksuhr", u: "Der Kuckuck ruft die Stunden – wie bisher" },
  { id: "bigben", sym: "📻", t: "Big Ben", u: "London, Neujahr 1945 im Radio: Westminster-Melodie und die große Glocke", vorspiel: "bigben_melodie", schlag: "bigben_schlag", takt: 4050, ersatz: glocke(165, 0.4, 3.2) },
  { id: "carillon", sym: "🔔", t: "Westminster-Glockenspiel", u: "Carillon: Westminster-Melodie, dann der Stundenschlag", vorspiel: "carillon_melodie", schlag: "carillon_schlag", takt: 2200, ersatz: glocke(330) },
  { id: "kiel", sym: "⛵", t: "Kieler Rathaus-Glockenspiel", u: "Vom Kieler Rathausturm, dann der Stundenschlag", vorspiel: "kiel", takt: 1900, ersatz: glocke(392) },
  { id: "freiburg", sym: "🌲", t: "Freiburger Rathaus-Glockenspiel", u: "„Stimmt an mit hellem hohen Klang“, dann der Stundenschlag", vorspiel: "freiburg", takt: 2100, ersatz: glocke(440) },
  { id: "berlin", sym: "🏛️", t: "Berliner Dom", u: "Das Geläut des Berliner Doms, dann der Stundenschlag", vorspiel: "berlin", takt: 2200, ersatz: glocke(131, 0.45, 3.4) },
  { id: "roehren", sym: "🎐", t: "Röhrenglocken-Standuhr", u: "Tiefer, voller Schlag aus Röhrenglocken", schlag: "roehren_schlag", takt: 2600, ersatz: glocke(220) },
  { id: "standuhr", sym: "🕰️", t: "Große Standuhr", u: "Echte alte Großvateruhr: erst das Ticken, dann die tiefen Schläge", vorspiel: "standuhr_ticken", schlag: "standuhr_schlag", takt: 850, pause: 0, ersatz: glocke(196, 0.35, 1.6) },
];
export function stundenuhrenGewaehlt() { const l = (einst().stundenuhren || []).filter((id) => STUNDENUHREN.some((x) => x.id === id)); return l.length ? l : ["kuckuck"]; }
export function stundenuhrFuer(h) { const l = stundenuhrenGewaehlt(), tag = Math.floor(Date.now() / 86400000); return l[(tag * 24 + h) % l.length]; }

let audio = null; const PUFFER = {};
function laden(k) {
  const A = UHR_AUFNAHMEN[k]; if (!A || !audio) return Promise.resolve(null);
  return PUFFER[k] || (PUFFER[k] = fetch(A.datei).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((b) => new Promise((ja, nein) => audio.decodeAudioData(b, ja, nein))).then((p) => (A.puffer = p)).catch(() => { delete PUFFER[k]; return null; }));
}
function spielen(k, t, laut = 0.9) { const p = UHR_AUFNAHMEN[k]?.puffer; if (!p) return 0; const q = audio.createBufferSource(), g = audio.createGain(); q.buffer = p; g.gain.value = laut; q.connect(g).connect(audio.destination); q.start(t); return p.duration; }
const turmSvg = (h, sym) => { const z = (h % 12) * 30, zeiger = (w, l, b) => `<line x1="60" y1="70" x2="${60 + l * Math.sin(w * Math.PI / 180)}" y2="${70 - l * Math.cos(w * Math.PI / 180)}" stroke="#1a1500" stroke-width="${b}" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 120 150" aria-hidden="true"><path d="M30 150 V50 L60 8 L90 50 V150 Z" fill="#6b5a3a" stroke="#2b2010" stroke-width="2"/><path d="M24 54 L60 4 L96 54" fill="none" stroke="#2b2010" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="60" cy="70" r="24" fill="#fff8e1" stroke="#d4a017" stroke-width="4"/>${Array.from({ length: 12 }, (_, i) => { const w = i * 30 * Math.PI / 180; return `<line x1="${60 + 18 * Math.sin(w)}" y1="${70 - 18 * Math.cos(w)}" x2="${60 + 21 * Math.sin(w)}" y2="${70 - 21 * Math.cos(w)}" stroke="#1a1500" stroke-width="${i % 3 ? 1 : 2.2}"/>`; }).join("")}
    ${zeiger(z, 12, 3)}${zeiger(0, 17, 2)}<circle cx="60" cy="70" r="2.4" fill="#1a1500"/><rect x="48" y="112" width="24" height="38" rx="12" fill="#2b2010"/><text x="60" y="108" text-anchor="middle" font-size="16">${sym}</text></svg>`; };
// Zeigt die Uhr und spielt (Vorspiel, dann h Schläge im Takt der Uhr). tonImmer = Probe aus den Einstellungen (auch nachts mit Ton).
export function stundenuhrZeigen(id, h, tonImmer = false) {
  const U = STUNDENUHREN.find((x) => x.id === id && x.id !== "kuckuck"); if (!U) return 0;
  document.querySelector(".stundenuhr")?.remove();
  const n = (h % 12) || 12, mitTon = einst().ton !== false && (tonImmer || !(h >= 22 || h < 7));
  const u = document.createElement("div"); u.className = "kuckuck stundenuhr"; u.setAttribute("role", "img"); u.setAttribute("aria-label", `${U.t}: ${h} Uhr`); u.title = `${U.t} · ${h} Uhr – antippen schließt`;
  u.innerHTML = `${turmSvg(h, U.sym)}<div class="kk-zahl" aria-hidden="true">${h}</div><div class="su-name">${esc(U.t)}</div>`;
  const zu = () => { clearTimeout(u._t); u.classList.remove("an"); setTimeout(() => u.remove(), 600); };
  // ✕ 0.49.0 (wie KC-CLUB-UHR-X): rotes X schließt – danach die Frage, ob die Uhr ganz aus soll (nicht bei der Probe in den Einstellungen)
  const x = document.createElement("button"); x.type = "button"; x.className = "su-x"; x.setAttribute("aria-label", "Uhr schließen"); x.textContent = "✕";
  x.addEventListener("click", (e) => { e.stopPropagation(); zu(); if (!tonImmer) uhrAusFragen(); });
  u.appendChild(x); u.setAttribute("role", "group");
  document.body.appendChild(u); requestAnimationFrame(() => requestAnimationFrame(() => u.classList.add("an")));
  const ablauf = async () => {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); await Promise.race([audio.resume?.(), new Promise((r) => setTimeout(r, 1500))]); } catch { audio = null; }
    if (!audio || audio.state !== "running") { u._t = setTimeout(zu, 8000); return; }
    await Promise.race([Promise.all([U.vorspiel && laden(U.vorspiel), U.schlag && laden(U.schlag)]), new Promise((r) => setTimeout(r, 4000))]);
    let t = audio.currentTime + 0.1;
    if (U.vorspiel) t += (spielen(U.vorspiel, t) || 0) + (U.pause ?? 0.6);
    for (let i = 0; i < n; i++) { const tt = t + (i * U.takt) / 1000; if (!(U.schlag && spielen(U.schlag, tt, 1))) U.ersatz?.(audio, tt);
      setTimeout(() => { if (u.isConnected) { u.classList.add("ruft"); setTimeout(() => u.classList.remove("ruft"), 300); } }, Math.max(0, (tt - audio.currentTime) * 1000)); }
    u._t = setTimeout(zu, Math.max(3000, (t - audio.currentTime) * 1000 + n * U.takt + 1800));
  };
  u.addEventListener("click", () => { if (u._warte) { u._warte = false; u.querySelector(".kk-tonhinweis")?.remove(); ablauf(); } else zu(); });
  if (!mitTon) { u._t = setTimeout(zu, 9000); return n; }
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) { // Ton erst nach einem Tippen erlaubt
    u._warte = true; u.insertAdjacentHTML("beforeend", `<div class="kk-tonhinweis">🔊 Antippen – ${n} Schläge</div>`); u._t = setTimeout(zu, 20000); return n;
  }
  ablauf(); return n;
}
function uhrAusFragen() {
  blatt("🕰️ Uhr zur vollen Stunde", `<p>Soll die Uhr zur vollen Stunde ganz aus sein? Du kannst sie unter ⚙️ › ✨ Effekte jederzeit wieder einschalten.</p>
    <div class="knopfspalte"><button type="button" class="knopf haupt" data-a="uhrGanzAus">🔕 Ja, ganz aus</button><button type="button" class="knopf" data-a="blattZu">Nein, nur jetzt</button></div>`);
}
AKTIONEN.uhrGanzAus = () => { einstSetzen("kuckuck", false); blattZu(); toast("🔕 Die Uhr zur vollen Stunde ist aus"); };
AKTIONEN.stundenuhrUm = (wert, el) => { // data-c: (Wert, Element) – die Uhr steht in data-x
  const id = el?.dataset?.x, l = new Set(stundenuhrenGewaehlt()); if (!id) return; if (el.checked) l.add(id); else l.delete(id);
  if (!l.size) { toast("Mindestens eine Uhr bleibt ausgewählt"); if (el) el.checked = true; return; }
  einstSetzen("stundenuhren", STUNDENUHREN.map((x) => x.id).filter((x) => l.has(x)));
  toast(l.size > 1 ? `🔄 ${l.size} Uhren gewählt – jede Stunde kommt eine andere` : `${STUNDENUHREN.find((x) => l.has(x.id)).sym} Zur vollen Stunde: ${STUNDENUHREN.find((x) => l.has(x.id)).t}`);
};
export function stundenuhrenEinstHtml() {
  const g = new Set(stundenuhrenGewaehlt());
  return `<h4>🕰️ Welche Uhr zur vollen Stunde?</h4><p class="hinweis">Mehrere gewählt = jede Stunde eine andere.</p><div class="su-wahl">${STUNDENUHREN.map((U) => `<div class="schalter"><label><input type="checkbox" data-c="stundenuhrUm" data-x="${U.id}" ${g.has(U.id) ? "checked" : ""}> <b>${U.sym} ${esc(U.t)}</b><div class="hinweis">${esc(U.u)}</div></label><button type="button" class="knopf klein" data-a="stundenuhrProbe" data-x="${U.id}">🔊 Probe</button></div>`).join("")}</div>
    <details class="su-quellen" data-klappe="su_quellen" data-ohne-unten data-ohne-schloss><summary>📜 Quellen der Aufnahmen</summary><ul>${Object.values(UHR_AUFNAHMEN).map((A) => `<li>${esc(A.was)} – ${esc(A.urheber)}, ${esc(A.lizenz)} (${esc(A.geaendert)}) · <a href="${esc(A.quelle)}" target="_blank" rel="noopener">Quelle ↗</a></li>`).join("")}<li>Kuckuck: freesound.org/s/128177, CC0</li></ul></details>`;
}
