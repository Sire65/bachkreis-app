// Bühne mit Orchester (statt Twinkey in der Club-App): Vorhang auf, das Bachkreis-Orchester spielt Melodien
// (Musik-Engine js/kern/musik.js) oder Konzertaufnahmen (Datei/Mitschnitt) – die Musiker bewegen sich passend dazu.
// Erreichbar über das Eselsohr am Kopf (doppelt tippen = Kopf umdrehen) und über die Kachel „Bühne“.
import { S, VIEWS, kopf, istLehrkraft } from "./zustand.js";
import { esc, AKTIONEN, toast, datumKurz, herunterladen } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";
import { STUECKE, spielen, baender } from "../kern/musik.js";

const B = { ctx: null, lauf: null, audio: null, quelle: null, analyser: null, raf: 0, modus: "melodien", stueck: STUECKE[0].id, tempo: 1, laut: 0.8, applaus: true, mitschnitt: null, blobUrl: null, tipp: 0 };
const ALLE_SEK = ["v1", "v2", "va", "vc", "kb", "fl", "ob", "kl", "fg", "hr", "tr", "pos", "pk"];

// ---------- Zeichnung ----------
const HAUT = ["#f1c9a5", "#e0ac83", "#c68863", "#8d5a3b", "#f5d6bc"];
const HAAR = ["#2b1b10", "#6b3e1f", "#c9a15a", "#111", "#8a5a2b", "#d8c08a"];
function figur(x, y, s, sek, inst, nr) {
  const haut = HAUT[nr % HAUT.length], haar = HAAR[(nr * 7) % HAAR.length], kleid = nr % 3 === 0 ? "#1d1d24" : "#111";
  const sitzt = !["kb"].includes(sek);
  let i = "";
  switch (inst) {
    case "geige": i = `<ellipse cx="-4" cy="-16" rx="4" ry="2.3" fill="#9b4f1c" transform="rotate(-25 -4 -16)"/><g class="bogen" style="transform-origin:3px -13px"><line x1="3" y1="-13" x2="15" y2="-21" stroke="#e9dfc8" stroke-width=".9"/><line x1="3" y1="-13" x2="6" y2="-8" stroke="${kleid}" stroke-width="2.6" stroke-linecap="round"/></g>`; break;
    case "bratsche": i = `<ellipse cx="-4" cy="-15.5" rx="4.8" ry="2.7" fill="#7f3d14" transform="rotate(-25 -4 -15.5)"/><g class="bogen" style="transform-origin:3px -13px"><line x1="3" y1="-13" x2="15" y2="-20" stroke="#e9dfc8" stroke-width=".9"/><line x1="3" y1="-13" x2="6" y2="-8" stroke="${kleid}" stroke-width="2.6" stroke-linecap="round"/></g>`; break;
    case "cello": i = `<line x1="0" y1="-4" x2="0" y2="-26" stroke="#3a1f0c" stroke-width="1.4"/><ellipse cx="0" cy="-5" rx="5.2" ry="8.5" fill="#8b4513"/><path d="M-2 -7 q2 2 0 4 M2 -7 q-2 2 0 4" stroke="#3a1f0c" stroke-width=".6" fill="none"/><g class="bogen-quer"><line x1="-10" y1="-6" x2="9" y2="-4" stroke="#e9dfc8" stroke-width=".9"/></g>`; break;
    case "bass": i = `<line x1="6" y1="0" x2="6" y2="-36" stroke="#3a1f0c" stroke-width="1.6"/><ellipse cx="6" cy="-9" rx="6.5" ry="11" fill="#6e3510"/><g class="bogen-quer"><line x1="-4" y1="-10" x2="16" y2="-8" stroke="#e9dfc8" stroke-width="1"/></g>`; break;
    case "floete": i = `<g class="blas"><line x1="-2" y1="-21" x2="15" y2="-23" stroke="#d9dde3" stroke-width="1.3"/></g>`; break;
    case "oboe": case "klarinette": i = `<g class="blas"><line x1="0" y1="-19" x2="2.5" y2="-6" stroke="#151515" stroke-width="1.8"/><circle cx="2.6" cy="-5.6" r="1.2" fill="${inst === "oboe" ? "#2a2a2a" : "#151515"}"/></g>`; break;
    case "fagott": i = `<g class="blas"><line x1="-3" y1="-2" x2="4" y2="-30" stroke="#5a2d0c" stroke-width="2.6"/><path d="M0 -19 q-6 -1 -2 -3" stroke="#c9b07a" stroke-width=".7" fill="none"/></g>`; break;
    case "horn": i = `<g class="blas"><circle cx="7" cy="-11" r="5" fill="none" stroke="#e0b23a" stroke-width="1.6"/><circle cx="7" cy="-11" r="2.2" fill="#e0b23a"/></g>`; break;
    case "trompete": i = `<g class="blas"><line x1="1" y1="-20" x2="13" y2="-20" stroke="#e8be44" stroke-width="1.6"/><path d="M13 -20 l4 -3 v6 z" fill="#e8be44"/></g>`; break;
    case "posaune": i = `<g class="blas"><line x1="1" y1="-20" x2="18" y2="-18" stroke="#d9ac36" stroke-width="1.4"/><line x1="8" y1="-17" x2="18" y2="-16" stroke="#d9ac36" stroke-width="1"/><path d="M18 -18 l3 -3 v6 z" fill="#d9ac36"/></g>`; break;
    case "pauke": i = `<path d="M-17 -3 a8 6 0 0 0 16 0 z M1 -3 a8 6 0 0 0 16 0 z" fill="#b8652c"/><ellipse cx="-9" cy="-3" rx="8" ry="2" fill="#efe3c8"/><ellipse cx="9" cy="-3" rx="8" ry="2" fill="#efe3c8"/><g class="schlegel"><line x1="-4" y1="-13" x2="-9" y2="-5" stroke="#3b2a1a" stroke-width="1"/><circle cx="-9" cy="-5" r="1.4" fill="#eee"/></g><g class="schlegel s2"><line x1="4" y1="-13" x2="9" y2="-5" stroke="#3b2a1a" stroke-width="1"/><circle cx="9" cy="-5" r="1.4" fill="#eee"/></g>`; break;
  }
  const stuhl = sitzt ? `<rect x="-6" y="-1" width="12" height="2.4" rx="1" fill="#3b2a1a"/><line x1="-5" y1="1" x2="-5" y2="5" stroke="#3b2a1a"/><line x1="5" y1="1" x2="5" y2="5" stroke="#3b2a1a"/>` : "";
  const notenpult = !["pauke", "bass"].includes(inst) ? `<line x1="-12" y1="2" x2="-12" y2="-12" stroke="#222" stroke-width=".8"/><rect x="-17" y="-17" width="10" height="6" fill="#f3efe3" stroke="#222" stroke-width=".5" transform="rotate(-8 -12 -14)"/>` : "";
  return `<g class="mus sek-${sek}" transform="translate(${x} ${y}) scale(${s})"><ellipse class="licht" cx="0" cy="3" rx="16" ry="5"/>${stuhl}${notenpult}
    <g class="koerper"><path d="M-7 ${sitzt ? 0 : 4} L-6 -16 Q0 -19 6 -16 L7 ${sitzt ? 0 : 4} Z" fill="${kleid}"/><circle cx="0" cy="-22" r="5" fill="${haut}"/><path d="M-5.2 -23 q0 -6.5 5.2 -6.5 q5.2 0 5.2 6.5 q-2 -3 -5.2 -3 q-3 0 -5.2 3z" fill="${haar}"/>${i}</g></g>`;
}
function dirigent() {
  return `<g class="dirigent" transform="translate(200 250) scale(1.95)"><rect x="-13" y="-1" width="26" height="6" rx="1.5" fill="#3b2a1a"/><rect x="-11" y="-3" width="22" height="2.5" fill="#5e3a19"/>
    <g class="koerper"><path d="M-7 -1 L-7 -20 Q0 -24 7 -20 L7 -1 Z" fill="#0d0d0d"/><path d="M-4 -1 L-5 6 M4 -1 L5 6" stroke="#0d0d0d" stroke-width="3"/>
    <circle cx="0" cy="-27" r="5.5" fill="#f1c9a5"/><path d="M-5.6 -27 q0 -7 5.6 -7 q5.6 0 5.6 7 q0 3 -2 4 q-3.6 1.5 -7.2 0 q-2 -1 -2 -4z" fill="#6b3e1f"/>
    <path d="M-6 -19 L-14 -27" stroke="#0d0d0d" stroke-width="3" stroke-linecap="round"/>
    <g class="taktstock" id="taktstock" style="transform-origin:6px -19px"><path d="M6 -19 L14 -28" stroke="#0d0d0d" stroke-width="3" stroke-linecap="round"/><line x1="14" y1="-28" x2="24" y2="-36" stroke="#f5f5f5" stroke-width=".9"/></g></g></g>`;
}
function orchesterSvg() {
  const m = [];
  let nr = 0;
  const reihe = (sek, inst, xs, y, s) => { for (const x of xs) m.push(figur(x, y, s, sek, inst, nr++)); };
  // Sitzordnung aus Sicht des Publikums: vorne Violine 1 (links) und Celli (rechts), dahinter Violine 2 und Bratschen,
  // dann Holzbläser, ganz hinten Hörner, Pauke, Trompete, Posaune; Kontrabässe stehen rechts.
  reihe("hr", "horn", [92, 120], 150, 1.0); reihe("pk", "pauke", [200], 150, 1.05); reihe("tr", "trompete", [262], 150, 1.0); reihe("pos", "posaune", [290, 318], 150, 1.0);
  reihe("fl", "floete", [138], 172, 1.12); reihe("ob", "oboe", [172], 172, 1.12); reihe("kl", "klarinette", [228], 172, 1.12); reihe("fg", "fagott", [262], 172, 1.12);
  reihe("kb", "bass", [338, 360], 178, 1.2);
  reihe("v2", "geige", [52, 86, 120, 154], 200, 1.27); reihe("va", "bratsche", [256, 290, 324], 200, 1.27);
  reihe("v1", "geige", [50, 90, 130, 168], 236, 1.42); reihe("vc", "cello", [236, 274, 312, 350], 236, 1.42);
  const falten = (x0, b) => Array.from({ length: 7 }, (_, i) => `<rect x="${x0 + i * b / 7}" y="0" width="${b / 14}" height="250" fill="rgba(0,0,0,.18)"/>`).join("");
  return `<svg class="buehne-svg" viewBox="0 0 400 250" role="img" aria-label="Bühne mit dem Bachkreis-Orchester">
    <defs><linearGradient id="bwWand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c120b"/><stop offset="1" stop-color="#3a2414"/></linearGradient>
      <linearGradient id="bwBoden" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d4521"/><stop offset="1" stop-color="#a0662f"/></linearGradient>
      <linearGradient id="bwVorhang" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e0a15"/><stop offset=".5" stop-color="#b5172b"/><stop offset="1" stop-color="#7c0c18"/></linearGradient>
      <radialGradient id="bwSpot" cx=".5" cy=".2" r=".7"><stop offset="0" stop-color="rgba(255,236,170,.28)"/><stop offset="1" stop-color="rgba(255,236,170,0)"/></radialGradient></defs>
    <rect width="400" height="250" fill="url(#bwWand)"/><polygon points="0,250 400,250 378,140 22,140" fill="url(#bwBoden)"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${22 + i * 44.5}" y1="140" x2="${i * 50}" y2="250" stroke="rgba(0,0,0,.15)"/>`).join("")}
    <polygon points="60,150 340,150 350,160 50,160" fill="rgba(0,0,0,.18)"/><polygon points="40,168 360,168 368,178 32,178" fill="rgba(0,0,0,.12)"/>
    <rect width="400" height="250" fill="url(#bwSpot)" class="spot"/>
    <g class="orchester">${m.join("")}</g><g id="bwNoten"></g>${dirigent()}
    <g class="vorhang vorhang-l"><rect x="-10" y="0" width="215" height="250" fill="url(#bwVorhang)"/>${falten(-10, 215)}</g>
    <g class="vorhang vorhang-r"><rect x="195" y="0" width="215" height="250" fill="url(#bwVorhang)"/>${falten(195, 215)}</g>
    <rect x="0" y="0" width="400" height="22" fill="#7c0c18"/><path d="M0 22 Q25 32 50 22 T100 22 T150 22 T200 22 T250 22 T300 22 T350 22 T400 22 V18 H0 Z" fill="#9d1022"/>
    <image href="icons/logo.png" x="186" y="2" width="28" height="28"/></svg>`;
}

// ---------- Oberfläche ----------
export function buehneHtml(kompakt = false) {
  const aufnahmen = liste("aufnahmen").sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
  const st = STUECKE.find((x) => x.id === B.stueck) || STUECKE[0];
  return `<div class="buehne ${kompakt ? "kompakt" : ""}" id="buehne">
    <div class="buehne-rahmen ${B.lauf || B.audio ? "offen" : ""}" id="bwRahmen">${orchesterSvg()}</div><div class="bw-titel" id="bwTitel">${esc(B.lauf ? st.titel : "Vorhang auf für den Bachkreis!")}</div>
    <div class="umschalter"><button class="${B.modus === "melodien" ? "an" : ""}" data-a="bwModus" data-x="melodien">🎼 Melodien</button><button class="${B.modus === "aufnahmen" ? "an" : ""}" data-a="bwModus" data-x="aufnahmen">🎧 Konzertaufnahmen</button></div>
    ${B.modus === "melodien" ? `
      <div class="bw-stuecke">${STUECKE.map((x) => `<button class="${x.id === B.stueck ? "an" : ""}" data-a="bwStueck" data-x="${x.id}"><b>${esc(x.titel)}</b><small>${esc(x.komponist)}</small></button>`).join("")}</div>
      <div class="knopfreihe"><button class="knopf haupt" data-a="bwSpielen">▶ Vorhang auf</button><button class="knopf" data-a="bwStopp">⏹ Stopp</button></div>
      <div class="bw-regler"><label>🥁 Tempo <input type="range" min="0.7" max="1.3" step="0.05" value="${B.tempo}" data-c="bwTempo"></label><label>🔊 Lautstärke <input type="range" min="0" max="1" step="0.05" value="${B.laut}" data-c="bwLaut"></label>
      <label class="bw-haken"><input type="checkbox" data-c="bwApplaus" ${B.applaus ? "checked" : ""}> 👏 Applaus am Ende</label></div>
      <p class="hinweis">Gemeinfreie Melodien, im Gerät erzeugt – ohne Internet. Die Musiker spielen mit, sobald ihr Register dran ist.</p>`
    : `
      <ul class="liste">${aufnahmen.map((a) => `<li><div class="fl"><div class="zeile-titel">${esc(a.titel)}</div><div class="zeile-unter">${datumKurz(a.datum)}${a.projekt_id ? " · " + esc(hole("projekte", a.projekt_id)?.titel || "") : ""} · ${esc({ intern: "nur Leitung", mitglieder: "für Mitglieder", oeffentlich: "öffentlich" }[a.freigabe] || "")}</div></div>
        ${a.quelle_url ? `<a class="knopf klein" href="${esc(a.quelle_url)}" target="_blank" rel="noopener">↗ öffnen</a>` : ""}<button class="knopf klein" data-a="bwAufnahme" data-x="${a.id}">▶</button></li>`).join("") || '<li class="hinweis">Noch keine Aufnahmen hinterlegt.</li>'}</ul>
      <div class="knopfreihe"><label class="knopf">📂 Aufnahme vom Gerät abspielen<input type="file" accept="audio/*,video/*" data-c="bwDatei" hidden></label>
      ${istLehrkraft() ? `<button class="knopf" data-a="bwMitschnitt">${B.mitschnitt ? "⏹ Mitschnitt beenden" : "⏺ Probe/Konzert mitschneiden"}</button>` : ""}<button class="knopf" data-a="bwStopp">⏹ Stopp</button></div>
      ${B.blobUrl ? `<button class="knopf klein" data-a="bwMitschnittSpeichern">💾 Letzten Mitschnitt speichern</button>` : ""}
      <p class="hinweis">Aufnahmen spielen auf der Bühne – das Orchester bewegt sich zur Musik (tiefe Töne: Celli, Bässe, Pauke · Mitte: Bratschen, Holz · hoch: Violinen, Flöten, Trompeten). Im Echtbetrieb liegen die Mitschnitte im geschützten Speicher des Bachkreises; Veröffentlichung nur mit Foto-/Video-Einwilligung.</p>`}
  </div>`;
}

function sekAn(sek, dauer = 0.4) {
  const r = document.getElementById("bwRahmen"); if (!r) return;
  for (const s of sek) for (const el of r.querySelectorAll(`.sek-${s}`)) {
    el.classList.add("aktiv");
    clearTimeout(el._aus); el._aus = setTimeout(() => el.classList.remove("aktiv"), Math.max(250, dauer * 1000 + 120));
  }
}
function note(sek) {
  const g = document.getElementById("bwNoten"); if (!g || g.childElementCount > 14) return;
  const xs = { v1: 100, v2: 90, fl: 138, ob: 172, tr: 262, hr: 106, vc: 300, kb: 366 };
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", (xs[sek] || 200) + (Math.random() * 30 - 15)); t.setAttribute("y", 140);
  t.setAttribute("class", "notenzeichen"); t.textContent = Math.random() < 0.5 ? "♪" : "♫";
  g.appendChild(t); setTimeout(() => t.remove(), 1800);
}
const SCHLAG_WINKEL = { 2: [40, -20], 3: [45, -35, -10], 4: [45, -30, 15, -40] };
function takt(schlag, takte) {
  const st = document.getElementById("taktstock"); if (!st) return;
  st.style.transform = `rotate(${(SCHLAG_WINKEL[takte] || SCHLAG_WINKEL[4])[schlag] ?? 0}deg)`;
}
function vorhang(auf) { document.getElementById("bwRahmen")?.classList.toggle("offen", auf); }
function titel(t) { const e = document.getElementById("bwTitel"); if (e) e.textContent = t; }

export function buehneStopp(ruhig = false) {
  B.lauf?.stop(); B.lauf = null;
  if (B.audio) { B.audio.pause(); B.audio = null; }
  cancelAnimationFrame(B.raf);
  for (const el of document.querySelectorAll(".mus.aktiv")) el.classList.remove("aktiv");
  if (!ruhig) { vorhang(false); titel("Vorhang zu – bis zum nächsten Mal!"); }
}
const kontext = () => { B.ctx = B.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (B.ctx.state === "suspended") B.ctx.resume(); return B.ctx; };

AKTIONEN.bwModus = (m) => { buehneStopp(true); B.modus = m; neuZeichnen(); };
AKTIONEN.bwStueck = (id) => { B.stueck = id; for (const b of document.querySelectorAll(".bw-stuecke button")) b.classList.toggle("an", b.dataset.x === id); if (B.lauf) AKTIONEN.bwSpielen(); };
AKTIONEN.bwTempo = (v) => { B.tempo = Number(v); };
AKTIONEN.bwLaut = (v) => { B.laut = Number(v); B.lauf?.lautstaerke(B.laut); if (B.audio) B.audio.volume = B.laut; };
AKTIONEN.bwApplaus = (_, el) => { B.applaus = el.checked; };
AKTIONEN.bwStopp = () => buehneStopp();
AKTIONEN.bwSpielen = () => {
  if (!(window.AudioContext || window.webkitAudioContext)) { toast("Dieses Gerät kann keine Musik erzeugen"); return; }
  buehneStopp(true);
  const st = STUECKE.find((x) => x.id === B.stueck) || STUECKE[0];
  vorhang(true); titel(`${st.titel} – ${st.komponist}`);
  const ctx = kontext();
  B.lauf = spielen(ctx, st, {
    tempoFaktor: B.tempo, lautstaerke: B.laut, mitApplaus: B.applaus,
    onEreignis: (e) => { sekAn(e.sek, e.dauer); if (e.sek.some((s) => st.melodieSek.includes(s)) && Math.random() < 0.45) note(e.sek[0]); },
    onTakt: (s) => takt(s, st.takt),
    onEnde: () => { B.lauf = null; titel("👏 Bravo! – Verbeugung"); document.getElementById("bwRahmen")?.classList.add("verbeugung"); setTimeout(() => { document.getElementById("bwRahmen")?.classList.remove("verbeugung"); vorhang(false); }, 2600); },
  });
};

// Aufnahmen: Pegel je Band treibt die Sektionen
function aufnahmeSpielen(url, name) {
  buehneStopp(true);
  const ctx = kontext();
  const a = new Audio(); a.src = url; a.volume = B.laut; a.crossOrigin = "anonymous";
  B.audio = a;
  if (!B.analyser) { B.analyser = ctx.createAnalyser(); B.analyser.fftSize = 1024; B.analyser.connect(ctx.destination); }
  try { const q = ctx.createMediaElementSource(a); q.connect(B.analyser); } catch (e) { console.warn(e); }
  const daten = new Uint8Array(B.analyser.frequencyBinCount);
  let schlag = 0, letzter = 0;
  const schleife = (zeit) => {
    if (B.audio !== a) return;
    const p = baender(B.analyser, daten, ctx.sampleRate);
    if (p.tief > 0.32) sekAn(["vc", "kb"], 0.25); if (p.tief > 0.55) sekAn(["pk"], 0.2);
    if (p.mitte > 0.25) sekAn(["va", "v2", "kl", "fg", "hr"], 0.25);
    if (p.hoch > 0.12) sekAn(["v1", "fl", "ob", "tr", "pos"], 0.25);
    if (zeit - letzter > 520 && p.tief + p.mitte > 0.4) { takt(schlag++ % 4, 4); letzter = zeit; if (Math.random() < 0.3) note("v1"); }
    B.raf = requestAnimationFrame(schleife);
  };
  a.onplay = () => { vorhang(true); titel(name); B.raf = requestAnimationFrame(schleife); };
  a.onended = () => { titel("👏 Bravo!"); setTimeout(() => vorhang(false), 1500); B.audio = null; };
  a.onerror = () => { toast("Diese Aufnahme kann hier nicht abgespielt werden"); buehneStopp(); };
  a.play().catch(() => toast("Bitte noch einmal ▶ antippen"));
}
AKTIONEN.bwAufnahme = (id) => {
  const a = hole("aufnahmen", id);
  if (!a?.datei) { toast("🎧 Vorführversion: Die Datei liegt später im geschützten Speicher. Zum Ausprobieren: „Aufnahme vom Gerät abspielen“."); return; }
  aufnahmeSpielen(a.datei, a.titel);
};
AKTIONEN.bwDatei = (_, el) => {
  const f = el.files?.[0]; if (!f) return;
  if (B.blobUrl) URL.revokeObjectURL(B.blobUrl);
  B.blobUrl = URL.createObjectURL(f); B.blobName = f.name;
  aufnahmeSpielen(B.blobUrl, f.name.replace(/\.[^.]+$/, ""));
};
AKTIONEN.bwMitschnitt = async () => {
  if (B.mitschnitt) { B.mitschnitt.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { toast("Mitschnitt wird auf diesem Gerät nicht unterstützt"); return; }
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const rec = new MediaRecorder(strom); const teile = [];
    rec.ondataavailable = (e) => teile.push(e.data);
    rec.onstop = () => {
      strom.getTracks().forEach((t) => t.stop()); B.mitschnitt = null;
      const blob = new Blob(teile, { type: rec.mimeType || "audio/webm" });
      if (B.blobUrl) URL.revokeObjectURL(B.blobUrl);
      B.blobUrl = URL.createObjectURL(blob); B.blobName = `Mitschnitt-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`; B.blob = blob;
      neuZeichnen(); aufnahmeSpielen(B.blobUrl, "Mitschnitt von eben");
    };
    rec.start(); B.mitschnitt = rec; toast("⏺ Mitschnitt läuft – nochmal tippen zum Beenden"); neuZeichnen();
  } catch { toast("Kein Zugriff aufs Mikrofon"); }
};
AKTIONEN.bwMitschnittSpeichern = () => {
  if (!B.blobUrl) return;
  const a = document.createElement("a"); a.href = B.blobUrl; a.download = B.blobName || "aufnahme.webm"; document.body.appendChild(a); a.click(); a.remove();
};
function neuZeichnen() {
  const alt = document.getElementById("buehne"); if (!alt) return;
  const kompakt = alt.classList.contains("kompakt");
  const neu = document.createElement("div"); neu.innerHTML = buehneHtml(kompakt);
  alt.replaceWith(neu.firstElementChild);
}

// Bühne stoppt, wenn die Ansicht wechselt oder die App in den Hintergrund geht (wie in der Club-App)
document.addEventListener("bk-ansicht", () => { if (!document.getElementById("heroRueck") || S.view !== "start") buehneStopp(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && B.lauf) buehneStopp(); });
export const buehneLaeuft = () => !!(B.lauf || B.audio || B.mitschnitt);

// ---------- Eselsohr: Kopf umdrehen ----------
export const ESELSOHR = `<button type="button" class="eselsohr" data-a="eselsohr" title="Doppelt tippen: Kopf umdrehen – Bühne mit Orchester" aria-label="Kopf umdrehen: Bühne mit Orchester"></button>`;
AKTIONEN.eselsohr = (_, el) => {
  const jetzt = Date.now();
  if (jetzt - B.tipp < 450) { B.tipp = 0; kopfDrehen(!document.getElementById("heroRueck")); return; }
  B.tipp = jetzt;
  setTimeout(() => { if (B.tipp && Date.now() - B.tipp >= 440) { el.classList.remove("wink"); void el.offsetWidth; el.classList.add("wink"); toast("🎭 Doppelt aufs Eselsohr tippen – dahinter wartet die Bühne mit dem Orchester"); } }, 470);
};
function kopfDrehen(an) {
  const hero = document.querySelector("#inhalt .hero"); if (!hero) return;
  if (an) {
    hero.classList.add("dreh-weg");
    setTimeout(() => {
      hero.classList.add("versteckt"); hero.classList.remove("dreh-weg");
      hero.insertAdjacentHTML("afterend", `<div class="hero-rueck dreh-her" id="heroRueck"><div class="hr-kopf"><b>🎭 Bühne</b><span class="hinweis">Doppelt aufs Eselsohr: zurückdrehen</span></div>${buehneHtml(true)}<button type="button" class="eselsohr hinten" data-a="eselsohr" aria-label="Kopf zurückdrehen"></button></div>`);
    }, 230);
  } else {
    buehneStopp(true);
    const r = document.getElementById("heroRueck"); r?.classList.add("dreh-weg");
    setTimeout(() => { r?.remove(); hero.classList.remove("versteckt"); hero.classList.add("dreh-her"); setTimeout(() => hero.classList.remove("dreh-her"), 320); }, 230);
  }
}

VIEWS.buehne = { render() { return kopf("🎭 Bühne") + buehneHtml(false); } };
export const kopfVorne = () => { if (document.getElementById("heroRueck")) kopfDrehen(false); };
