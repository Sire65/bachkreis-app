// Bühne mit Orchester (statt Twinkey in der Club-App): Vorhang auf, das Bachkreis-Orchester spielt Melodien
// (Musik-Engine js/kern/musik.js) oder Konzertaufnahmen (Datei/Mitschnitt) – die Musiker bewegen sich passend dazu.
// Erreichbar über das Eselsohr am Kopf (doppelt tippen = Kopf umdrehen) und über die Kachel „Bühne“.
import { S, VIEWS, kopf, istLehrkraft, zeige } from "./zustand.js";
import { esc, AKTIONEN, toast, datumKurz } from "../kern/ui.js";
import { liste, hole, konfig } from "../kern/daten.js";
import { musikAdresse } from "../kern/musikort.js";
import { STRICH, strichNeu, bogenStand, armD, handBei, bogenTransform, haltung } from "../kern/streicher.js";
import { STUECKE, spielen, baender, klaengeBereit, stueckKlaenge } from "../kern/musik.js";
import { stimmeErzeugen, notenSvg, zeigerX, taktUndPos } from "../kern/notensatz.js";
import { merkmale, gesichtSvg, HAUT, HAARFARBE } from "./gesichter.js";
import { SCHLAGFIGUR, SCHULTER, RUHE, armPfad, handPosition, tempoSchaetzen, einsatzRichtung, einsatzStaerke, mitEinsatz } from "../kern/dirigat.js";

const B = { ctx: null, lauf: null, audio: null, quelle: null, analyser: null, raf: 0, modus: "melodien", stueck: STUECKE[0].id, tempo: 1, laut: 0.8, applaus: true, mitschnitt: null, blobUrl: null, tipp: 0 };

// ---------- Zeichnung ----------
// 0.15.0: Die Musiker tragen die Gesichter der echten Bachkreis-Mitglieder (gezeichnet, aus „Mein Gesicht“), sitzen auf ihrem
// Register-Platz und halten ihr Instrument wie in echt. Wer gerade spielt, hebt das Instrument (Bläser), streicht mit dem Bogen,
// wiegt sich und nickt; wer Pause hat, lässt das Instrument sinken. Konzertkleidung schwarz.
const SEK_REGISTER = { "r-v1": "v1", "r-v2": "v2", "r-va": "va", "r-vc": "vc", "r-kb": "kb", "r-fl": "fl", "r-ob": "ob", "r-kl": "kl", "r-fg": "fg", "r-hr": "hr", "r-tr": "tr", "r-pos": "pos", "r-tb": "pos", "r-sw": "pk" };
const INST_NAME = { v1: "Violine 1", v2: "Violine 2", va: "Bratsche", vc: "Cello", kb: "Kontrabass", fl: "Flöte", ob: "Oboe", kl: "Klarinette", fg: "Fagott", hr: "Horn", tr: "Trompete", pos: "Posaune", pk: "Pauke" };
// Wer sitzt wo? Mitglieder des ersten (größten) Orchesters nach Register – fehlt jemand, ein Gast-Gesicht
function besetzungFuerBuehne() {
  const g = liste("gruppen", (x) => x.aktiv !== false).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99))[0];
  const drin = new Set(liste("gruppe_zuordnung", (z) => z.gruppe_id === g?.id).map((z) => z.person_id));
  const m = {};
  for (const pi of liste("person_instrument").sort((a, b) => (b.haupt ? 1 : 0) - (a.haupt ? 1 : 0))) {
    const sek = SEK_REGISTER[pi.register_id]; if (!sek || !drin.has(pi.person_id)) continue;
    (m[sek] ||= []); if (!m[sek].includes(pi.person_id)) m[sek].push(pi.person_id);
  }
  return m;
}
const ARM = (d, farbe) => `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const HAND = (x, y, haut, k = "") => `<circle${k ? ` class="${k}"` : ""} cx="${x}" cy="${y}" r="1.25" fill="${haut}"/>`;
// 🎻 0.79.0 Bogenarm: Schulter fest, Ellbogen/Hand werden beim Streichen neu gerechnet (js/kern/streicher.js)
const BOGENARM = (inst, farbe) => ARM(armD(STRICH[inst], handBei(STRICH[inst], 0, 1)), farbe).replace("<path ", '<path class="rarm" ');
const BOGEN_START = (inst) => `transform="${bogenTransform(STRICH[inst], 0, 1)}"`;
function figur(x, y, s, sek, inst, pid, nr) {
  const mm = merkmale(pid || `gast-${sek}-${nr}`), haut = HAUT[mm.haut % HAUT.length];
  const kleid = "#121216", lang = [1, 2, 4, 8].includes(mm.frisur % 9);
  const steht = inst === "bass", nm = pid ? (hole("personen", pid)?.vorname || "") : "";
  const kopf = `<g class="kopf"><rect x="-1.6" y="-19.6" width="3.2" height="2.6" fill="${haut}"/><g transform="translate(-9.6 -33.6) scale(.3)">${gesichtSvg(mm, { rund: false })}</g></g>`;
  const rumpf = `<path d="M-7 ${steht ? 2 : 0} L-7.6 -13.5 Q-7.2 -17.6 -2.6 -18.2 L2.6 -18.2 Q7.2 -17.6 7.6 -13.5 L7 ${steht ? 2 : 0} Z" fill="${kleid}"/>`
    + (lang ? `<path d="M-2.6 -18.2 Q0 -15.6 2.6 -18.2" fill="none" stroke="${haut}" stroke-width="1.1"/>` : `<path d="M-2 -18.2 L0 -13 L2 -18.2 Z" fill="#f4f4f4"/><path d="M-1.6 -17.2 L0 -16.4 L1.6 -17.2 L1.6 -15.6 L0 -16.4 L-1.6 -15.6 Z" fill="#111"/>`);
  const beine = steht ? `<path d="M-5 2 L-5.5 14 M4 2 L4.5 14" stroke="#0c0c0f" stroke-width="3.2" stroke-linecap="round"/>`
    : `<path d="M-5.6 -0.5 L-6 3 L-6.4 8 M4.6 -0.5 L5 3 L5.4 8" stroke="#0c0c0f" stroke-width="3" stroke-linecap="round"/>`;
  let i = "";
  switch (inst) {
    case "geige": case "bratsche": {
      const g = inst === "bratsche" ? 1.12 : 1;
      i = `<g transform="scale(${g})"><g class="geige"><ellipse cx="-9" cy="-17" rx="4.7" ry="2.7" fill="#a4561f" stroke="#5e2c0b" stroke-width=".4" transform="rotate(-24 -9 -17)"/>
          <path d="M-10.6 -16.4 l-.4 .9 M-7.6 -17.8 l-.4 .9" stroke="#2b1506" stroke-width=".35"/><line x1="-5.6" y1="-18.4" x2="-19.4" y2="-23.4" stroke="#151515" stroke-width=".9"/><circle cx="-19.9" cy="-23.6" r=".95" fill="#6b3410"/></g>
        ${ARM("M-5.6 -16.6 Q-11 -11.5 -15.6 -20.4", kleid)}${HAND(-16, -21.2, haut, "lh")}
        ${BOGENARM("geige", kleid)}
        <g class="bogen" ${BOGEN_START("geige")}>${HAND(2.6, -10.8, haut)}<line x1="3" y1="-10.4" x2="-12.4" y2="-27.2" stroke="#d9c49a" stroke-width=".7"/><line x1="2.4" y1="-11.2" x2="-12.8" y2="-27.8" stroke="#3a2412" stroke-width=".55"/></g></g>`; break;
    }
    case "cello":
      i = `<line x1="0" y1="4" x2="0.4" y2="8" stroke="#888" stroke-width=".6"/><ellipse cx="0" cy="-3.5" rx="5.8" ry="8.8" fill="#8f4716" stroke="#4e2307" stroke-width=".5"/><path d="M-3 -6 q1 2 0 4 M3 -6 q-1 2 0 4" stroke="#2b1506" stroke-width=".45" fill="none"/>
        <line x1="0" y1="-11.5" x2="-3.2" y2="-27.5" stroke="#151515" stroke-width="1.1"/><circle cx="-3.4" cy="-28.4" r="1.1" fill="#5e2c0b"/><line x1="-1.8" y1="0" x2="1.8" y2="0" stroke="#e8d6a8" stroke-width=".6"/>
        ${ARM("M-5.6 -16.6 Q-10.5 -14 -2.8 -21", kleid)}${HAND(-2.6, -21.4, haut, "lh")}${BOGENARM("cello", kleid)}
        <g class="bogen-quer" ${BOGEN_START("cello")}>${HAND(11.4, -2.6, haut)}<line x1="12" y1="-2.4" x2="-11" y2="-3.6" stroke="#d9c49a" stroke-width=".8"/></g>`; break;
    case "bass":
      i = `<line x1="5" y1="13" x2="5" y2="16" stroke="#888" stroke-width=".7"/><ellipse cx="5" cy="1" rx="7.6" ry="12" fill="#7a3a10" stroke="#3e1a05" stroke-width=".6"/><path d="M1.6 -2 q1.4 3 0 6 M8.4 -2 q-1.4 3 0 6" stroke="#2b1506" stroke-width=".5" fill="none"/>
        <line x1="4.6" y1="-11" x2="1.4" y2="-37" stroke="#151515" stroke-width="1.4"/><circle cx="1.2" cy="-38" r="1.4" fill="#4e2307"/>
        ${ARM("M-5.6 -16.6 Q-8 -24 1.6 -27", kleid)}${HAND(1.8, -27.4, haut, "lh")}${BOGENARM("bass", kleid)}
        <g class="bogen-quer" ${BOGEN_START("bass")}>${HAND(13.2, 1.6, haut)}<line x1="15" y1="2.2" x2="-6" y2="1" stroke="#d9c49a" stroke-width=".9"/></g>`; break;
    case "floete":
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-3 -13 1.4 -20.6", kleid)}${ARM("M5.6 -16.6 Q12 -14 11.6 -22.8", kleid)}
        <line x1="-2" y1="-21.4" x2="18" y2="-25.2" stroke="#dfe3ea" stroke-width="1.15"/><circle cx="6" cy="-22.6" r=".35" fill="#888"/><circle cx="9" cy="-23.2" r=".35" fill="#888"/><circle cx="13" cy="-24" r=".35" fill="#888"/>
        ${HAND(1.6, -21.4, haut)}${HAND(11.6, -23.6, haut)}</g>`; break;
    case "oboe": case "klarinette": {
      const k = inst === "klarinette";
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-5 -11 1.6 -15.6", kleid)}${ARM("M5.6 -16.6 Q7 -11 2.6 -9.6", kleid)}
        <line x1="0.8" y1="-19.6" x2="${k ? 3.6 : 3.2}" y2="${k ? -3.6 : -4.8}" stroke="${k ? "#101010" : "#2a1a12"}" stroke-width="1.5"/><path d="M${k ? 2.2 : 2} ${k ? -4.6 : -5.6} l${k ? 2.8 : 2.2} 0 l.6 ${k ? 2 : 1.6} l-4 0 z" fill="${k ? "#101010" : "#2a1a12"}"/>
        ${k ? `<circle cx="1.6" cy="-14" r=".35" fill="#c9ccd3"/><circle cx="2.2" cy="-10" r=".35" fill="#c9ccd3"/>` : ""}${HAND(1.6, -15.6, haut)}${HAND(2.6, -9.8, haut)}</g>`; break;
    }
    case "fagott":
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-7 -10 -1.4 -12.6", kleid)}${ARM("M5.6 -16.6 Q8 -8 1.6 -5", kleid)}
        <line x1="-3.6" y1="5" x2="4.6" y2="-32" stroke="#6a3410" stroke-width="2.8" stroke-linecap="round"/><path d="M-1 -15 Q-3 -18 0.4 -20.4" stroke="#c9b07a" stroke-width=".6" fill="none"/>
        ${HAND(-1.2, -12.6, haut)}${HAND(1.4, -5.2, haut)}</g>`; break;
    case "horn":
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-4 -12 3.6 -13.6", kleid)}${ARM("M5.6 -16.6 Q14 -12 13 -6.6", kleid)}
        <circle cx="8" cy="-11.6" r="5.2" fill="none" stroke="#e0b23a" stroke-width="1.6"/><circle cx="8" cy="-11.6" r="2.6" fill="none" stroke="#c99a25" stroke-width=".8"/>
        <path d="M1 -20 Q3 -17 4.6 -14.6" stroke="#e0b23a" stroke-width=".9" fill="none"/><ellipse cx="13.4" cy="-6" rx="3.6" ry="2.4" fill="#e8be44" transform="rotate(30 13.4 -6)"/>${HAND(3.6, -13.4, haut)}${HAND(12.8, -6.4, haut)}</g>`; break;
    case "trompete":
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-1 -15 5 -20.4", kleid)}${ARM("M5.6 -16.6 Q9 -15 9 -20.4", kleid)}
        <line x1="0.8" y1="-21" x2="15" y2="-21.6" stroke="#e8be44" stroke-width="1.4"/><line x1="5" y1="-19.4" x2="12" y2="-19.8" stroke="#e8be44" stroke-width="1"/>
        <path d="M15 -21.6 L20 -25 L20 -18.2 Z" fill="#f0c84c"/><rect x="7.6" y="-23.6" width="2.6" height="2.4" fill="#c99a25"/>${HAND(5.2, -20.6, haut)}${HAND(8.8, -22.8, haut)}</g>`; break;
    case "posaune":
      i = `<g class="blas">${ARM("M-5.6 -16.6 Q-1 -15 4.4 -20.4", kleid)}<line x1="0.8" y1="-20.6" x2="14" y2="-21.4" stroke="#d9ac36" stroke-width="1.2"/>
        <path d="M14 -21.4 L19.6 -25.4 L19.6 -17.4 Z" fill="#e8be44"/><line x1="1.6" y1="-19" x2="9" y2="-18.6" stroke="#d9ac36" stroke-width="1"/>${HAND(4.4, -20.6, haut)}
        <g class="zug">${ARM("M5.6 -16.6 Q10 -14 14 -17", kleid)}<path d="M9 -19.4 H24 V-17.2 H9" fill="none" stroke="#d9ac36" stroke-width=".9"/>${HAND(14, -17.6, haut)}</g></g>`; break;
    case "pauke":
      i = `<path d="M-19 -3 a9 6.5 0 0 0 18 0 z M1 -3 a9 6.5 0 0 0 18 0 z" fill="#b8652c" stroke="#6e3510" stroke-width=".5"/><ellipse cx="-10" cy="-3" rx="9" ry="2.2" fill="#efe3c8"/><ellipse cx="10" cy="-3" rx="9" ry="2.2" fill="#efe3c8"/>
        <g class="schlegel">${ARM("M-5.6 -16.6 Q-11 -12 -9 -8", kleid)}${HAND(-9, -7.8, haut)}<line x1="-9" y1="-8" x2="-11" y2="-3.6" stroke="#5e3a19" stroke-width=".7"/><circle cx="-11.2" cy="-3.4" r="1.2" fill="#f2efe6"/></g>
        <g class="schlegel s2">${ARM("M5.6 -16.6 Q11 -12 9 -8", kleid)}${HAND(9, -7.8, haut)}<line x1="9" y1="-8" x2="11" y2="-3.6" stroke="#5e3a19" stroke-width=".7"/><circle cx="11.2" cy="-3.4" r="1.2" fill="#f2efe6"/></g>`; break;
  }
  i = i.replace('<g class="blas">', `<g class="blas" transform="${haltung(inst, 0, 0, 0).blas}">`); // 0.79.2 Ruhehaltung: Instrument gesenkt
  const stuhl = steht ? "" : `<path d="M-7 1 H7 L6 2.6 H-6 Z" fill="#2a1d12"/><path d="M-5.6 2.6 V8.4 M5.6 2.6 V8.4" stroke="#2a1d12" stroke-width=".9"/>`;
  const pult = ["pauke", "bass", "cello"].includes(inst) ? "" : `<line x1="-14" y1="8" x2="-14" y2="-10" stroke="#1d1d1d" stroke-width=".8"/><g transform="rotate(-10 -14 -13)"><rect x="-19.5" y="-16" width="11" height="6.6" fill="#22201c"/><rect x="-19" y="-15.6" width="10" height="5.8" fill="#f6f1e2"/><path d="M-18 -14.4 h8 M-18 -13 h8 M-18 -11.6 h8" stroke="#9a9182" stroke-width=".25"/></g>`;
  // 0.79.0 jeder Musiker wiegt im eigenen Tempo und versetzt (nicht alle wie Roboter gleichzeitig)
  const zz = ((nr + 1) * 2654435761 % 1000) / 1000, eigen = `--v:${(0.82 + zz * 0.4).toFixed(2)};--d:-${(zz * 1.3).toFixed(2)}s`;
  return `<g class="mus sek-${sek} inst-${inst}" data-strich="${STRICH[inst] ? inst : ""}" data-inst="${inst}" data-o="${zz.toFixed(3)}" style="${eigen}" transform="translate(${x} ${y}) scale(${s})"><title>${esc(nm ? `${nm} – ${INST_NAME[sek] || ""}` : INST_NAME[sek] || "")}</title><ellipse class="licht" cx="0" cy="7" rx="17" ry="5"/>${stuhl}${beine}
    <g class="koerper">${rumpf}${kopf}${i}</g>${pult}</g>`;
}
function dirigent() {
  // Die Dirigentin steht mit dem Rücken zum Publikum: Haare von hinten, schwarzer Frack, Taktstock in der rechten Hand
  const lp = liste("personen", (p) => (p.rollen || []).includes("leitung"))[0], mm = merkmale(lp || "leitung"), haar = HAARFARBE[mm.haar % HAARFARBE.length], haut = HAUT[mm.haut % HAUT.length];
  const lang = [1, 2, 4, 8].includes(mm.frisur % 9);
  return `<g class="dirigent" transform="translate(200 250) scale(1.95)"><title>${esc(lp ? `${lp.vorname} ${lp.nachname} – Dirigentin` : "Dirigent")}</title><rect x="-13" y="-1" width="26" height="6" rx="1.5" fill="#3b2a1a"/><rect x="-11" y="-3" width="22" height="2.5" fill="#5e3a19"/>
    <path d="M-4 -1 L-5 6 M4 -1 L5 6" stroke="#0d0d0d" stroke-width="3"/>
    <g class="koerper" id="dirKoerper" style="transform-origin:0px 0px">
    <!-- Arme zuerst: was vor der Brust geschieht, verdeckt der Rücken (wir sehen die Dirigentin von hinten) -->
    <path id="dirArmL" d="${armPfad(-1, RUHE.l)}" fill="none" stroke="#0d0d0d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle id="dirHandL" cx="${RUHE.l[0]}" cy="${RUHE.l[1]}" r="1.4" fill="${haut}"/>
    <path id="dirArmR" d="${armPfad(1, RUHE.r)}" fill="none" stroke="#0d0d0d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <line id="dirStab" x1="${RUHE.r[0]}" y1="${RUHE.r[1]}" x2="${RUHE.r[0] + 7}" y2="${RUHE.r[1] - 9}" stroke="#f5f5f5" stroke-width=".9" stroke-linecap="round"/><circle id="dirHandR" cx="${RUHE.r[0]}" cy="${RUHE.r[1]}" r="1.4" fill="${haut}"/>
    <path d="M-7 -1 L-7.4 -19 Q0 -23 7.4 -19 L7 -1 Z" fill="#0d0d0d"/>
    <g id="dirKopf"><rect x="-1.8" y="-22.6" width="3.6" height="3" fill="${haut}"/><circle cx="0" cy="-27" r="5.6" fill="${haar}"/>${lang ? `<path d="M-5.4 -26 Q-6 -18 -2 -19 L2 -19 Q6 -18 5.4 -26 Z" fill="${haar}"/>` : ""}
    <circle cx="-5.5" cy="-26.6" r="1" fill="${haut}"/><circle cx="5.5" cy="-26.6" r="1" fill="${haut}"/></g></g></g>`;
}
// 🎭 Übe-Bühne (0.26.0): eigener Avatar vorne als Solist (Instrument nach Notensatz-Schlüssel)
const SOLO_INST = { v1: ["v1", "geige"], v2: ["v2", "geige"], va: ["va", "bratsche"], vc: ["vc", "cello"], kb: ["kb", "bass"], fl: ["fl", "floete"], ob: ["ob", "oboe"], kl: ["kl", "klarinette"],
  fg: ["fg", "fagott"], hr: ["hr", "horn"], tr: ["tr", "trompete"], pos: ["pos", "posaune"], tb: ["pos", "posaune"], sw: ["pk", "pauke"] };
export const soloMoeglich = (key) => !!SOLO_INST[key];
// Weitere Bühnen-Modi (z. B. „Üben“ aus uebebuehne.js): { titel, html() }
export const BUEHNE_MODI = {};
// 🎻 0.71.0 Bach zum Anhören (Wunsch Hansi „weil es ja ein Bachkreis ist“): echte Orchesteraufnahmen, gemeinfrei (US-Militärmusik =
// Public Domain) bzw. CC0, von Wikimedia Commons – liegen in audio/bach/ (eigene Seite, kein fremder Server, kein Internet-Abruf beim Hören).
// Quellen und Lizenzen: audio/bach/QUELLEN.md
export const BACH_AUFNAHMEN = [
  { id: "air", titel: "Air", werk: "Orchestersuite Nr. 3 D-Dur, BWV 1068", wer: "Air Force Strings · United States Air Force Band", lizenz: "gemeinfrei", takt: 4 },
  { id: "jesus", titel: "Jesus bleibet meine Freude", werk: "Kantate BWV 147", wer: "Orchestra Gli Armonici", lizenz: "CC0", takt: 3 },
  { id: "badinerie", titel: "Badinerie", werk: "Orchestersuite Nr. 2 h-Moll, BWV 1067", wer: "historische Aufnahme (European Archive)", lizenz: "CC0", takt: 2 },
  { id: "violinkonzert", titel: "Violinkonzert a-Moll – 1. Satz", werk: "BWV 1041", wer: "Chamber Orchestra · United States Marine Band", lizenz: "gemeinfrei", takt: 2 },
  { id: "wachet", titel: "Wachet auf, ruft uns die Stimme", werk: "Choral aus BWV 140", wer: "Stellar Brass · US Air Force Band of the Rockies", lizenz: "gemeinfrei", takt: 4 },
];
const bachHtml = () => `<div class="bw-stuecke">${BACH_AUFNAHMEN.map((x) => `<button type="button" data-a="bwBach" data-x="${x.id}"><b>${esc(x.titel)}</b><small>${esc(x.werk)} · ${esc(x.wer)}</small></button>`).join("")}</div>
  <div class="knopfreihe"><button class="knopf" data-a="bwStopp">⏹ Stopp</button></div><div class="bw-regler"><label>🔊 Lautstärke <input type="range" min="0" max="1" step="0.05" value="${B.laut}" data-c="bwLaut"></label></div>
  <p class="hinweis">🎻 Johann Sebastian Bach (1685–1750) – unser Namensgeber. Echte Orchesteraufnahmen, frei von Rechten (gemeinfrei bzw. CC0, über Wikimedia Commons). Stück antippen – der Vorhang geht auf.</p>`;
// 0.79.1 Ausschnitt: oben war nur leere Wand (das Orchester saß im unteren Drittel und wirkte winzig) – jetzt füllt es die Bühne
const OBEN = 82;
export function orchesterSvg(opt = {}) {
  const m = [], bes = besetzungFuerBuehne();
  let nr = 0;
  const reihe = (sek, inst, xs, y, s) => { xs.forEach((x, k) => m.push(figur(x, y, s, sek, inst, bes[sek]?.[k], nr++))); };
  // Sitzordnung aus Sicht des Publikums: vorne Violine 1 (links) und Celli (rechts), dahinter Violine 2 und Bratschen,
  // dann Holzbläser, ganz hinten Hörner, Pauke, Trompete, Posaune; Kontrabässe stehen rechts.
  reihe("hr", "horn", [92, 120], 150, 1.0); reihe("pk", "pauke", [200], 150, 1.05); reihe("tr", "trompete", [262], 150, 1.0); reihe("pos", "posaune", [290, 318], 150, 1.0);
  reihe("fl", "floete", [138], 172, 1.12); reihe("ob", "oboe", [172], 172, 1.12); reihe("kl", "klarinette", [228], 172, 1.12); reihe("fg", "fagott", [262], 172, 1.12);
  reihe("kb", "bass", [330, 354], 178, 1.15);
  reihe("v2", "geige", [52, 86, 120, 154], 200, 1.27); reihe("va", "bratsche", [256, 290, 324], 200, 1.27);
  reihe("v1", "geige", [50, 90, 130, 168], 236, 1.42); reihe("vc", "cello", [236, 274, 312, 350], 236, 1.42);
  const falten = (x0, b) => Array.from({ length: 7 }, (_, i) => `<rect x="${x0 + i * b / 7}" y="0" width="${b / 14}" height="250" fill="rgba(0,0,0,.18)"/>`).join("");
  return `<svg class="buehne-svg" viewBox="0 ${OBEN} 400 ${250 - OBEN}" role="img" aria-label="Bühne mit dem Bachkreis-Orchester">
    <defs><linearGradient id="bwWand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c120b"/><stop offset="1" stop-color="#3a2414"/></linearGradient>
      <linearGradient id="bwBoden" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d4521"/><stop offset="1" stop-color="#a0662f"/></linearGradient>
      <linearGradient id="bwVorhang" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e0a15"/><stop offset=".5" stop-color="#b5172b"/><stop offset="1" stop-color="#7c0c18"/></linearGradient>
      <radialGradient id="bwSpot" cx=".5" cy=".2" r=".7"><stop offset="0" stop-color="rgba(255,236,170,.28)"/><stop offset="1" stop-color="rgba(255,236,170,0)"/></radialGradient></defs>
    <rect width="400" height="250" fill="url(#bwWand)"/><polygon points="0,250 400,250 378,140 22,140" fill="url(#bwBoden)"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${22 + i * 44.5}" y1="140" x2="${i * 50}" y2="250" stroke="rgba(0,0,0,.15)"/>`).join("")}
    <path d="M70 132 H330 V150 H70 Z" fill="#5a3a1c"/><path d="M70 150 H330 L336 156 H64 Z" fill="#3a2410"/>
    <path d="M52 156 H348 V172 H52 Z" fill="#6a4421"/><path d="M52 172 H348 L356 178 H44 Z" fill="#3e2712"/>
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${30 + i * 48}" cy="248" rx="9" ry="2.6" fill="rgba(255,214,140,.55)" class="rampe"/>`).join("")}
    <rect width="400" height="250" fill="url(#bwSpot)" class="spot"/>
    <g class="orchester">${m.join("")}</g><g id="bwNoten"></g>${opt.solist ? solistSvg(opt.solist) : dirigent()}
    <g class="vorhang vorhang-l"><rect x="-10" y="0" width="215" height="250" fill="url(#bwVorhang)"/>${falten(-10, 215)}</g>
    <g class="vorhang vorhang-r"><rect x="195" y="0" width="215" height="250" fill="url(#bwVorhang)"/>${falten(195, 215)}</g>
    <g transform="translate(0 ${OBEN})"><rect x="0" y="0" width="400" height="22" fill="#7c0c18"/><path d="M0 22 Q25 32 50 22 T100 22 T150 22 T200 22 T250 22 T300 22 T350 22 T400 22 V18 H0 Z" fill="#9d1022"/>
    <image href="icons/logo.png" x="186" y="2" width="28" height="28"/></g></svg>`;
}

function solistSvg({ pid, key }) {
  const [sek, inst] = SOLO_INST[key] || SOLO_INST.v1;
  return `<g class="solist-podest"><ellipse cx="200" cy="246" rx="46" ry="7" fill="rgba(255,230,160,.28)"/></g>` + figur(200, inst === "bass" ? 214 : 232, inst === "bass" ? 1.75 : 2.05, sek, inst, pid, 99).replace(`class="mus sek-${sek} inst-${inst}"`, `class="mus solist sek-solo inst-${inst}"`);
}

// ---------- Oberfläche ----------
export function buehneHtml(kompakt = false) {
  if (BUEHNE_MODI[B.modus] && !kompakt) return `<div class="buehne" id="buehne">${umschalter()}${BUEHNE_MODI[B.modus].html()}</div>`;
  if (BUEHNE_MODI[B.modus]) B.modus = "melodien";
  const aufnahmen = liste("aufnahmen").sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
  const st = STUECKE.find((x) => x.id === B.stueck) || STUECKE[0];
  // 🎼 0.79.3 Schalter „Orchester | Noten“ (Wunsch Hansi): bei den Melodien statt des Orchesters die Noten mit mitlaufendem Zeiger
  const noten = B.ansicht === "noten" && B.modus === "melodien" && !kompakt;
  const ansicht = kompakt || !["melodien", "bach"].includes(B.modus) ? "" : `<div class="bw-ansicht" role="group" aria-label="Was auf der Bühne zu sehen ist">${[["orchester", "🎻 Orchester"], ["noten", "🎼 Noten"]].map(([k, t]) => `<button type="button" class="${(B.ansicht || "orchester") === k ? "an" : ""}" data-a="bwAnsicht" data-x="${k}" aria-pressed="${(B.ansicht || "orchester") === k}">${t}</button>`).join("")}</div>`;
  return `<div class="buehne ${kompakt ? "kompakt" : ""}" id="buehne">${ansicht}
    ${noten ? `<div class="buehne-rahmen bw-notenrahmen offen" id="bwRahmen"><div class="bw-blatt" id="bwBlatt">${notenSvg(stimmeErzeugen(st.id, B.stimme === "partitur" ? "Partitur" : "Violine"), { takteJeZeile: 4, zeiger: true, titel: st.titel })}</div></div>
      <div class="bw-stimme">${[["melodie", "Melodie"], ["partitur", "Partitur (3 Stimmen)"]].map(([k, t]) => `<button type="button" class="chip-wahl${(B.stimme || "melodie") === k ? " an" : ""}" data-a="bwStimme" data-x="${k}">${t}</button>`).join("")}</div>`
    : B.ansicht === "noten" && B.modus === "bach" && !kompakt ? `<div class="buehne-rahmen bw-notenrahmen offen" id="bwRahmen"><p class="bw-keine-noten">🎼 Zu den Bach-Aufnahmen gibt es noch keine mitlaufenden Noten – eine echte Aufnahme hält kein festes Tempo.<br>Mitlaufende Noten gibt es bei <b>🎼 Melodien</b>.</p></div>`
    : `<div class="buehne-rahmen ${B.lauf || B.audio ? "offen" : ""}" id="bwRahmen">${orchesterSvg()}</div>`}<div class="bw-titel" id="bwTitel">${esc(B.lauf ? st.titel : "Vorhang auf für den Bachkreis!")}</div>
    ${umschalter()}
    ${B.modus === "bach" ? bachHtml() : B.modus === "melodien" ? `
      <div class="bw-stuecke">${STUECKE.map((x) => `<button class="${x.id === B.stueck ? "an" : ""}" data-a="bwStueck" data-x="${x.id}"><b>${esc(x.titel)}</b><small>${esc(x.komponist)}</small></button>`).join("")}</div>
      <div class="knopfreihe"><button class="knopf haupt" data-a="bwSpielen">▶ Vorhang auf</button><button class="knopf" data-a="bwStopp">⏹ Stopp</button></div>
      <div class="bw-regler"><label>🥁 Tempo <input type="range" min="0.7" max="1.3" step="0.05" value="${B.tempo}" data-c="bwTempo"></label><label>🔊 Lautstärke <input type="range" min="0" max="1" step="0.05" value="${B.laut}" data-c="bwLaut"></label>
      <label class="bw-haken"><input type="checkbox" class="schalter-cb" data-c="bwApplaus" ${B.applaus ? "checked" : ""}> 👏 Applaus am Ende</label></div>
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

function umschalter() {
  const modi = [["melodien", "🎼 Melodien"], ["bach", "🎻 Bach"], ["aufnahmen", "🎧 Aufnahmen"], ...Object.entries(BUEHNE_MODI).map(([k, m]) => [k, m.titel])];
  return `<div class="umschalter">${modi.map(([k, t]) => `<button type="button" class="${B.modus === k ? "an" : ""}" data-a="bwModus" data-x="${k}">${t}</button>`).join("")}</div>`;
}
export function sekAn(sek, dauer = 0.4) {
  const r = document.getElementById("bwRahmen"); if (!r) return;
  einsatzPruefen(sek);
  for (const s of sek) for (const el of r.querySelectorAll(`.sek-${s}`)) {
    el.classList.add("aktiv"); if (el.dataset.strich) strichStarten(el, dauer * 1000); else bewegen(el);
    clearTimeout(el._aus); el._aus = setTimeout(() => el.classList.remove("aktiv"), Math.max(250, dauer * 1000 + 120));
  }
}
// 🎻 0.79.0 Bogenstriche: jeder Ton ein Strich (Ab/Auf im Wechsel), Arm folgt; in der Pause sinkt der Bogen weich ab.
// 🎭 0.79.2 Eine gemeinsame Schleife bewegt ALLE Musiker per Programm (wie die Dirigentin): Wiegen und Federn im Takt, Nicken auf jeden
// Schlag, Instrument heben/schwenken, Posaunenzug, Paukenschlegel, Vibrato. Läuft nur, solange sich etwas bewegt.
// „Bewegung reduzieren“ des Geräts → halb so stark (vorher stand das Orchester dann ganz still, nur die Dirigentin bewegte sich).
const STR = { el: new Set(), raf: 0, ruhig: typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches };
function strichStarten(el, dauerMs) { el._strich = strichNeu(el._strich, dauerMs, performance.now()); bewegen(el); }
function bewegen(el) { STR.el.add(el); if (!STR.raf) STR.raf = requestAnimationFrame(striche); }
const schlagJetzt = (jetzt) => (jetzt - DIR.zeit < DIR.dauer * 3 ? (DIR.n || 0) + (jetzt - DIR.zeit) / DIR.dauer : jetzt / 650);
function striche(jetzt) {
  const b = schlagJetzt(jetzt), staerke = STR.ruhig ? 0.5 : 1;
  for (const el of STR.el) {
    if (!el.isConnected) { STR.el.delete(el); continue; }
    const ziel = el.classList.contains("aktiv") ? 0 : 1;
    el._ruhe = el._ruhe ?? 1; el._ruhe += (ziel - el._ruhe) * 0.12; if (Math.abs(ziel - el._ruhe) < 0.01) el._ruhe = ziel;
    if (!el._teile) el._teile = { k: el.querySelector(".koerper"), kopf: el.querySelector(".kopf"), blas: el.querySelector(".blas"), zug: el.querySelector(".zug"), schl: el.querySelectorAll(".schlegel"), lh: el.querySelector(".lh"), bogen: el.querySelector(".bogen,.bogen-quer"), arm: el.querySelector(".rarm"), off: Number(el.dataset.o) || 0 };
    const T = el._teile, h = haltung(el.dataset.inst, b, T.off, (1 - el._ruhe) * staerke, jetzt);
    T.k?.setAttribute("transform", h.koerper); T.kopf?.setAttribute("transform", h.kopf); T.blas?.setAttribute("transform", h.blas);
    T.zug?.setAttribute("transform", h.zug); T.lh?.setAttribute("transform", h.lh); T.schl.forEach((s, i) => s.setAttribute("transform", h.schlegel[i % 2]));
    if (el.dataset.strich) {
      const d = STRICH[el.dataset.strich], p = bogenStand(el._strich, jetzt) * (1 - el._ruhe) * staerke;
      T.bogen?.setAttribute("transform", bogenTransform(d, p, el._ruhe)); T.arm?.setAttribute("d", armD(d, handBei(d, p, el._ruhe)));
    }
    if (el._ruhe === 1 && (!el._strich || jetzt > el._strich.start + el._strich.dauer)) STR.el.delete(el);
  }
  STR.raf = STR.el.size ? requestAnimationFrame(striche) : 0;
}
function note(sek) {
  const g = document.getElementById("bwNoten"); if (!g || g.childElementCount > 14) return;
  const xs = { v1: 100, v2: 90, fl: 138, ob: 172, tr: 262, hr: 106, vc: 300, kb: 366 };
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", (xs[sek] || 200) + (Math.random() * 30 - 15)); t.setAttribute("y", 140);
  t.setAttribute("class", "notenzeichen"); t.textContent = Math.random() < 0.5 ? "♪" : "♫";
  g.appendChild(t); setTimeout(() => t.remove(), 1800);
}
const DIR = { schlag: 0, takte: 4, dauer: 600, zeit: 0, raf: 0, ruhe: true, einsatz: null, letzterEinsatz: 0, still: {} };
// 👉 0.73.0 Einsatz: setzt eine Gruppe nach einer Pause (≥ 2 Schläge) wieder ein, zeigt die Dirigentin zu ihr – höchstens alle 1,5 Schläge;
// nach 8 Schlägen ohne Einsatz wendet sie sich der nächsten spielenden (anderen) Gruppe zu
function einsatzPruefen(sek) {
  const jetzt = performance.now(), pause = Math.max(1200, DIR.dauer * 2);
  for (const s of sek) {
    const vorher = DIR.still[s] || 0; DIR.still[s] = jetzt;
    const wechsel = jetzt - DIR.letzterEinsatz > DIR.dauer * 8 && s !== DIR.einsatzSek; // lange kein Einsatz → einer anderen Gruppe zuwenden
    if ((jetzt - vorher < pause && !wechsel) || jetzt - DIR.letzterEinsatz < DIR.dauer * 1.5 || !DIR.raf) continue;
    const ri = einsatzRichtung(s); if (!ri || Math.abs(ri.r) < 0.12 && ri.hoch < 0.5) continue; // direkt vor ihr: kein Extra-Zeigen
    DIR.einsatz = { ...ri, sek: s, zeit: jetzt, dauer: Math.max(700, DIR.dauer * 1.6) }; DIR.letzterEinsatz = jetzt; DIR.einsatzSek = s; break;
  }
}
function dirigentZeichnen(jetzt) {
  const armR = document.getElementById("dirArmR"); if (!armR) { DIR.raf = 0; return; }
  const seit = jetzt - DIR.zeit, aus = seit > DIR.dauer * 2.5;
  let r, l;
  if (aus) { r = RUHE.r; l = RUHE.l; } // keine Schläge mehr → Hände in Bereitschaft
  else {
    const u = Math.min(1, seit / DIR.dauer);
    r = handPosition(DIR.takte, DIR.schlag, u);
    const lu = Math.max(0, u - 0.06), lh = handPosition(DIR.takte, DIR.schlag, lu); // links: Spiegel, kleiner, etwas später
    l = [-(SCHULTER + (lh[0] - SCHULTER) * 0.75), -19 + (lh[1] + 19) * 0.8 + 0.5];
  }
  let dreh = 0, kopfX = 0;
  if (DIR.einsatz && !aus) {
    const e = einsatzStaerke((jetzt - DIR.einsatz.zeit) / DIR.einsatz.dauer);
    if (e <= 0 && jetzt > DIR.einsatz.zeit) DIR.einsatz = null;
    else ({ r, l, dreh, kopf: kopfX } = mitEinsatz(r, l, DIR.einsatz, e));
  }
  armR.setAttribute("d", armPfad(1, r));
  document.getElementById("dirArmL")?.setAttribute("d", armPfad(-1, l));
  for (const [id, [x, y]] of [["dirHandR", r], ["dirHandL", l]]) { const h = document.getElementById(id); if (h) { h.setAttribute("cx", x.toFixed(2)); h.setAttribute("cy", y.toFixed(2)); } }
  const stab = document.getElementById("dirStab"); // Taktstock zeigt nach vorn-oben, kippt mit der Bewegung
  if (stab) { const w = (-55 + (r[0] - 10) * 2 + (r[1] + 16) * 2.5) * Math.PI / 180; stab.setAttribute("x1", r[0].toFixed(2)); stab.setAttribute("y1", r[1].toFixed(2)); stab.setAttribute("x2", (r[0] + 11.5 * Math.cos(w)).toFixed(2)); stab.setAttribute("y2", (r[1] + 11.5 * Math.sin(w)).toFixed(2)); }
  const k = document.getElementById("dirKoerper"), kopf = document.getElementById("dirKopf");
  const eins = !aus && DIR.schlag === 0 ? Math.max(0, 1 - seit / (DIR.dauer * 0.5)) : 0;
  if (k) k.setAttribute("transform", aus ? "" : `rotate(${((r[0] - 9) * 0.35 + dreh).toFixed(2)})`);
  if (kopf) kopf.setAttribute("transform", `translate(${kopfX.toFixed(2)} ${(eins * 0.9).toFixed(2)})`);
  DIR.raf = aus ? 0 : requestAnimationFrame(dirigentZeichnen);
}
export function takt(schlag, takte, dauer = 0) {
  const jetzt = performance.now(), gemessen = jetzt - DIR.zeit;
  DIR.dauer = dauer > 0 ? dauer : gemessen > 250 && gemessen < 1600 ? DIR.dauer * 0.6 + gemessen * 0.4 : DIR.dauer;
  Object.assign(DIR, { schlag, takte: SCHLAGFIGUR[takte] ? takte : 4, zeit: jetzt, n: (DIR.n || 0) + 1 });
  document.getElementById("bwRahmen")?.style.setProperty("--schlag", `${Math.round(DIR.dauer)}ms`); // 0.79.0 Musiker nicken im Takt
  if (!DIR.raf) DIR.raf = requestAnimationFrame(dirigentZeichnen);
}
function vorhang(auf) { document.getElementById("bwRahmen")?.classList.toggle("offen", auf); }
function titel(t) { const e = document.getElementById("bwTitel"); if (e) e.textContent = t; }

export function buehneStopp(ruhig = false) {
  B.lauf?.stop(); B.lauf = null; cancelAnimationFrame(B.zeigerRaf);
  if (B.audio) { B.audio.pause(); B.audio = null; }
  cancelAnimationFrame(B.raf);
  for (const el of document.querySelectorAll(".mus.aktiv")) el.classList.remove("aktiv");
  if (!ruhig) { vorhang(false); titel("Vorhang zu – bis zum nächsten Mal!"); }
}
const kontext = () => { B.ctx = B.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (B.ctx.state === "suspended") B.ctx.resume(); return B.ctx; };

AKTIONEN.bwModus = (m) => {
  buehneStopp(true);
  if (BUEHNE_MODI[m] && document.getElementById("buehne")?.classList.contains("kompakt")) return zeige("buehne", { modus: m }); // Üben braucht Platz: ganze Seite
  B.modus = m; neuZeichnen();
};
export const buehneModus = () => B.modus;
AKTIONEN.bwStueck = (id) => { B.stueck = id; if (B.ansicht === "noten") neuZeichnen(); for (const b of document.querySelectorAll(".bw-stuecke button")) b.classList.toggle("an", b.dataset.x === id); if (B.lauf) AKTIONEN.bwSpielen(); };
AKTIONEN.bwAnsicht = (x) => { B.ansicht = x === "noten" ? "noten" : "orchester"; neuZeichnen(); if (B.lauf) zeigerStarten(); };
AKTIONEN.bwStimme = (x) => { B.stimme = x === "partitur" ? "partitur" : "melodie"; neuZeichnen(); if (B.lauf) zeigerStarten(); };
// 🎼 0.79.3 Zeiger in den Noten: aktueller Takt hell hinterlegt, Strich an der gespielten Stelle, Zeile rollt mit
// 0.79.3 Nach „▶ Vorhang auf“ steht man am Handy unten bei den Knöpfen – Bühne bzw. Noten ins Bild holen (nur auf der Bühnen-Seite)
function buehneZeigen() {
  const r = document.getElementById("bwRahmen"); if (!r || r.closest(".kompakt")) return;
  const oben = Math.max(0, ...[...document.querySelectorAll(".kopf2, .demoleiste, #demoleiste")].map((e) => e.getBoundingClientRect().bottom)) + 8; // feste Kopfzeilen
  const box = r.getBoundingClientRect(), ziel = (document.querySelector(".bw-ansicht")?.getBoundingClientRect().top ?? box.top);
  if (ziel < oben || box.bottom > innerHeight) scrollTo({ top: scrollY + ziel - oben, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function zeigerStarten() {
  cancelAnimationFrame(B.zeigerRaf);
  const blatt = document.getElementById("bwBlatt"); if (!blatt || !B.lauf?.sb) return;
  const st = STUECKE.find((x) => x.id === B.stueck) || STUECKE[0], felder = new Map([...blatt.querySelectorAll(".nb-takt")].map((r) => [Number(r.dataset.takt), r]));
  const linie = blatt.querySelector(".nb-zeiger"), lauf = B.lauf; let vorher = null;
  const schritt = () => {
    if (B.lauf !== lauf || !blatt.isConnected) return;
    const schlag = (B.ctx.currentTime - lauf.t0) / lauf.sb;
    if (schlag >= 0) {
      const { takt, pos } = taktUndPos(schlag, st.takt), r = felder.get(takt);
      if (r !== vorher) { vorher?.classList.remove("an"); r?.classList.add("an"); vorher = r;
        if (r) { const box = r.getBoundingClientRect(), b = blatt.getBoundingClientRect(); if (box.top < b.top || box.bottom > b.bottom) blatt.scrollTo({ top: blatt.scrollTop + box.top - b.top - 8, behavior: "smooth" }); } }
      if (r && linie) { const xs = r.dataset.xs.split(" ").map((s) => s.split(":").map(Number)), x = zeigerX(xs, pos), y = Number(r.getAttribute("y"));
        linie.setAttribute("x1", x.toFixed(1)); linie.setAttribute("x2", x.toFixed(1)); linie.setAttribute("y1", y + 4); linie.setAttribute("y2", y + Number(r.getAttribute("height")) - 4); }
    }
    B.zeigerRaf = requestAnimationFrame(schritt);
  };
  schritt();
}
AKTIONEN.bwTempo = (v) => { B.tempo = Number(v); };
AKTIONEN.bwLaut = (v) => { B.laut = Number(v); B.lauf?.lautstaerke(B.laut); if (B.audio) B.audio.volume = B.laut; };
AKTIONEN.bwApplaus = (_, el) => { B.applaus = el.checked; };
AKTIONEN.bwStopp = () => buehneStopp();
AKTIONEN.bwSpielen = async () => {
  if (!(window.AudioContext || window.webkitAudioContext)) { toast("Dieses Gerät kann keine Musik erzeugen"); return; }
  buehneStopp(true);
  const st = STUECKE.find((x) => x.id === B.stueck) || STUECKE[0];
  vorhang(true); titel(`${st.titel} – ${st.komponist}`);
  const ctx = kontext(), nr = (B.startNr = (B.startNr || 0) + 1);
  await klaengeBereit(ctx, stueckKlaenge(st), 3000); if (B.startNr !== nr) return; // 🎻 echte Aufnahmen, während der Vorhang aufgeht (0.34.0)
  B.lauf = spielen(ctx, st, {
    tempoFaktor: B.tempo, lautstaerke: B.laut, mitApplaus: B.applaus,
    onEreignis: (e) => { sekAn(e.sek, e.dauer); if (e.sek.some((s) => st.melodieSek.includes(s)) && Math.random() < 0.45) note(e.sek[0]); },
    onTakt: (s) => takt(s, st.takt, 60000 / (st.tempo * B.tempo)),
    onEnde: () => { B.lauf = null; cancelAnimationFrame(B.zeigerRaf); titel("👏 Bravo! – Verbeugung"); document.getElementById("bwRahmen")?.classList.add("verbeugung"); setTimeout(() => { document.getElementById("bwRahmen")?.classList.remove("verbeugung"); vorhang(false); }, 2600); },
  });
  zeigerStarten(); // 🎼 nur wenn die Noten zu sehen sind
  buehneZeigen();
};

// Aufnahmen: Pegel je Band treibt die Sektionen
function aufnahmeSpielen(url, name, taktArt = 4) {
  buehneStopp(true);
  const ctx = kontext();
  const a = new Audio(); a.src = url; a.volume = B.laut; a.crossOrigin = "anonymous";
  B.audio = a;
  if (!B.analyser) { B.analyser = ctx.createAnalyser(); B.analyser.fftSize = 1024; B.analyser.connect(ctx.destination); }
  try { const q = ctx.createMediaElementSource(a); q.connect(B.analyser); } catch (e) { console.warn(e); }
  const daten = new Uint8Array(B.analyser.frequencyBinCount);
  // 🪄 0.72.0 Takt aus der Aufnahme: Einsatz-Stärke (Energie-Anstiege) in 10-ms-Fächern sammeln; jede Sekunde per Autokorrelation
  // über die letzten 6 s das Tempo schätzen (380–1000 ms je Schlag) und gleichmäßig weiterschlagen. Starke Einsätze kurz vor oder
  // nach einem Schlag ziehen die Phase sanft heran – so bleibt die Dirigentin im Takt der Musik.
  let schlag = 0, mittel = 0, vorher = 0, takt0 = 0, per = 600, letzteSchaetzung = 0, start = 0, letztesFach = 0;
  const faecher = new Float32Array(600);
  const schleife = (zeit) => {
    if (B.audio !== a) return;
    const p = baender(B.analyser, daten, ctx.sampleRate);
    const schlagS = Math.max(0.3, per / 1000); // 🎻 0.79.0 Streicher: ein Bogenstrich je Schlag (vorher Zittern alle 0,25 s)
    if (p.tief > 0.32) sekAn(["vc", "kb"], schlagS); if (p.tief > 0.55) sekAn(["pk"], 0.2);
    if (p.mitte > 0.25) sekAn(["va", "v2", "kl", "fg", "hr"], schlagS);
    if (p.hoch > 0.12) sekAn(["v1", "fl", "ob", "tr", "pos"], schlagS);
    const e = p.tief * 1.2 + p.mitte + p.hoch * 0.5, auf = Math.max(0, e - vorher); mittel = mittel * 0.95 + e * 0.05;
    if (!start) start = zeit;
    const fach = Math.floor((zeit - start) / 10); for (; letztesFach < fach; ) faecher[++letztesFach % 600] = 0; faecher[fach % 600] += auf;
    if (zeit - letzteSchaetzung > 1000 && fach > 400) { letzteSchaetzung = zeit; const g = tempoSchaetzen(faecher, fach); if (g) per = per * 0.6 + g * 0.4; }
    if (takt0 && auf > 0.06 && Math.abs(zeit - takt0) < per * 0.25) takt0 += (zeit - takt0) * 0.3; // Phase nachziehen
    vorher = e;
    if (mittel > 0.04) {
      if (!takt0 || zeit - takt0 > per * 2) takt0 = zeit; // Start bzw. nach Pause (Tab im Hintergrund) nicht nachholen
      if (zeit >= takt0) { takt(schlag++ % taktArt, taktArt, per); takt0 += per; if (Math.random() < 0.3) note("v1"); }
    } else takt0 = 0; // Stille: Hände in Bereitschaft
    B.raf = requestAnimationFrame(schleife);
  };
  a.onplay = () => { vorhang(true); titel(name); buehneZeigen(); B.raf = requestAnimationFrame(schleife); };
  a.onended = () => { titel("👏 Bravo!"); setTimeout(() => vorhang(false), 1500); B.audio = null; };
  a.onerror = () => { toast("Diese Aufnahme kann hier nicht abgespielt werden"); buehneStopp(); };
  a.play().catch(() => toast("Bitte noch einmal ▶ antippen"));
}
// 🎙️ 0.79.0 Vorspiel „auf der Bühne anhören“: das Orchester spielt sichtbar mit (Bewegung aus dem Pegel der Aufnahme)
export function aufnahmeAufBuehne(url, name) {
  if (BUEHNE_MODI[B.modus]) B.modus = "melodien"; // Üben zeigt kein ganzes Orchester
  zeige("buehne", {}); setTimeout(() => aufnahmeSpielen(url, name), 600);
}
AKTIONEN.bwAufnahme = (id) => {
  const a = hole("aufnahmen", id);
  if (!a?.datei) { toast("🎧 Vorführversion: Die Datei liegt später im geschützten Speicher. Zum Ausprobieren: „Aufnahme vom Gerät abspielen“."); return; }
  aufnahmeSpielen(a.datei, a.titel);
};
AKTIONEN.bwBach = (id) => { const x = BACH_AUFNAHMEN.find((y) => y.id === id); if (x) aufnahmeSpielen(musikAdresse(`${x.id}.mp3`, konfig().musik_basis), `${x.titel} – J. S. Bach`, x.takt || 4); };
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

VIEWS.buehne = { render(p = {}) { if (p.modus) { B.modus = p.modus; delete p.modus; } return kopf("🎭 Bühne") + buehneHtml(false); }, nach: (z, p) => BUEHNE_MODI[B.modus]?.nach?.(z, p) };
export const kopfVorne = () => { if (document.getElementById("heroRueck")) kopfDrehen(false); };
