// 🎄 Adventskalender (0.41.0, wie KC-CLUB-ADVENTSKALENDER): 24 Türchen auf einer verschneiten Winterlandschaft, das heutige leuchtet golden,
// frühere lassen sich nachholen, spätere sind zu. Inhalte: js/kern/advent.js. Bis 30.11. eine Überraschung – nur die Leitung sieht eine Vorschau.
// Geöffnete Türchen merkt sich das Gerät (kein Server). Ohne Effekte („✨ Effekte“ aus) gehen die Türchen ohne Animation auf.
import { VIEWS, zeige, zeichne, kopf, einst, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt } from "../kern/ui.js";
import { TUEREN, LIEDER, ANORDNUNG, adventSichtbar, tuerOffenBar, heutigesTuerchen, melodie } from "../kern/advent.js";
import { startseiteVerbinden } from "./startseite.js";

const leitet = () => hatRolle("admin", "leitung");
const vorschau = () => leitet() && new Date().getMonth() !== 11 && !(new Date().getMonth() === 0 && new Date().getDate() <= 6);
const SCHL = () => `bk_advent_${new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()}`;
const offen = () => { try { return new Set(JSON.parse(localStorage.getItem(SCHL()) || "[]")); } catch { return new Set(); } };
const merken = (n) => { const o = offen(); o.add(n); try { localStorage.setItem(SCHL(), JSON.stringify([...o])); } catch {} };
export const adventDa = () => adventSichtbar(new Date(), leitet());
export const adventHinweis = () => { const h = heutigesTuerchen(); return h && !offen().has(h) && adventSichtbar(new Date(), false) ? h : null; };

const SCHNEE = Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 800}" cy="${(i * 53) % 330}" r="${1 + (i % 3)}" fill="#fff" opacity="${0.5 + (i % 4) / 8}"/>`).join("");
const HG = `<svg class="adv-hg" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="advH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1b3d"/><stop offset="1" stop-color="#3b4f8a"/></linearGradient></defs>
  <rect width="800" height="520" fill="url(#advH)"/>${SCHNEE}<circle cx="680" cy="80" r="34" fill="#fff6c8"/>
  <path d="M0 400 Q200 340 400 380 T800 360 V520 H0 Z" fill="#e8eef7"/><path d="M290 380 V260 h70 v-40 l30 -40 l30 40 v40 h70 v120 Z" fill="#2a2216"/>
  ${[310, 340, 440, 470].map((x) => `<rect x="${x}" y="300" width="18" height="26" fill="#ffd23f"/>`).join("")}<rect x="378" y="238" width="24" height="30" fill="#ffd23f"/><path d="M380 380 v-36 a10 10 0 0 1 20 0 v36" fill="#ffd23f"/>
  ${[90, 150, 640, 720].map((x, i) => `<path d="M${x} ${400 - i % 2 * 10} l30 -90 l30 90 Z" fill="#1f5e3a"/>`).join("")}</svg>`;

VIEWS.advent = {
  render() {
    if (!adventDa()) return kopf("🎄 Adventskalender") + '<div class="leer">Der Adventskalender öffnet am 1. Dezember. 🤫</div>';
    const o = offen(), h = heutigesTuerchen(), vs = vorschau();
    return kopf("🎄 Bachkreis-Adventskalender") + (vs ? '<p class="karte adv-vorschau">👀 <b>Vorschau für die Leitung</b> – Mitglieder sehen den Kalender erst ab 1. Dezember (Überraschung). Hier lassen sich alle Türchen öffnen.</p>' : "")
      + `<div class="adv-kalender">${HG}<div class="adv-tueren">${ANORDNUNG.map((n) => { const darf = tuerOffenBar(n, new Date(), vs), auf = o.has(n), t = TUEREN[n];
        return `<button type="button" class="adv-tuer${n === 24 ? " gross" : ""}${auf ? " auf" : ""}${n === h ? " heute" : ""}${darf ? "" : " zu"}" data-a="adventTuer" data-x="${n}" aria-label="Türchen ${n}${auf ? `: ${esc(t.titel)}` : darf ? "" : " – noch zu"}">${auf ? `<span class="adv-sym" aria-hidden="true">${t.sym}</span>` : ""}<b>${n}</b></button>`; }).join("")}</div></div>
      <p class="hinweis">${h ? (o.has(h) ? "Heute schon geöffnet – morgen wartet das nächste. 🎁" : `Heute ist Türchen ${h} dran! ✨`) : "Frühere Türchen kannst du nachholen."} Ein Türchen pro Tag – mit Liedern zum Anhören, Rätseln, Bastelideen und Leckereien.</p>`;
  },
};
AKTIONEN.adventTuer = (x) => {
  const n = Number(x), t = TUEREN[n]; if (!t) return;
  if (!tuerOffenBar(n, new Date(), vorschau())) return toast(`🤫 Türchen ${n} ist noch zu – noch ${n - new Date().getDate()} Mal schlafen!`);
  const war = offen().has(n); merken(n);
  const el = document.querySelector(`.adv-tuer[data-x="${n}"]`);
  const zeigen = () => { inhaltZeigen(n); if (!war) zeichne(); };
  if (!war && el && einst().effekte !== false && el.animate) el.animate([{ transform: "perspective(400px) rotateY(0)" }, { transform: "perspective(400px) rotateY(-80deg)" }], { duration: 450, easing: "ease-in" }).finished.then(zeigen, zeigen);
  else zeigen();
};
function inhaltZeigen(n) {
  const t = TUEREN[n], l = t.lied && LIEDER[t.lied];
  let html = `<p class="adv-nr">${t.sym} Türchen ${n}</p>`;
  if (t.text) html += `<p>${esc(t.text)}</p>`;
  if (l) html += `<div class="adv-lied"><b>🎵 ${esc(l.t)}</b><small>${esc(l.von)} · gemeinfrei</small><button type="button" class="knopf haupt" data-a="adventLied" data-x="${t.lied}">▶️ Melodie anhören</button></div>`;
  if (t.frage) html += `<p class="adv-frage"><b>❓ ${esc(t.frage)}</b></p><details><summary>💡 Tipp</summary><p>${esc(t.tipp)}</p></details><details class="adv-loesung"><summary>✅ Auflösung</summary><p>${esc(t.antwort)}</p></details>`;
  if (t.material || t.zutaten) html += `<p><b>${t.zutaten ? "🛒 Zutaten" : "🧰 Du brauchst"}:</b> ${esc(t.material || t.zutaten)}</p><ol class="adv-schritte">${t.schritte.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>${t.tipp ? `<p class="hinweis">💡 ${esc(t.tipp)}</p>` : ""}${t.zutaten ? '<p class="hinweis">👩‍🍳 Mit einem Erwachsenen backen und kochen – Ofen und Herd sind heiß!</p>' : ""}`;
  if (t.knopf) html += `<button type="button" class="knopf haupt breit" data-a="adventZu" data-x="${t.knopf[1]}">${esc(t.knopf[0])}</button>`;
  blatt(`${t.sym} ${esc(t.titel)}`, html);
}
AKTIONEN.adventZu = (v) => zeige(v);
let ADV_CTX = null;
AKTIONEN.adventLied = (k) => {
  const l = LIEDER[k]; if (!l) return;
  try {
    ADV_CTX?.close?.(); const a = (ADV_CTX = new (window.AudioContext || window.webkitAudioContext)()); let t = a.currentTime + 0.05; const schlag = 0.42;
    for (const [n, d] of melodie(l.noten)) { const o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = 440 * 2 ** ((n - 69) / 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d * schlag * 0.95);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + d * schlag); t += d * schlag; }
    toast(`🎵 ${l.t}`);
  } catch { toast("Ton geht auf diesem Gerät nicht"); }
};
startseiteVerbinden({ adventHinweis });

