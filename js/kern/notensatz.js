// 🎼 Notensatz (0.18.0): setzt die gemeinfreien Stücke der Musik-Engine als echte Noten (SVG) – je Instrument eine eigene Stimme.
// Ohne Bibliothek und ohne Musik-Schriftart, läuft offline. Melodie-Instrumente bekommen die Melodie (in passender Oktave),
// Mittelstimmen (Violine 2, Viola, Horn) Akkordtöne mit kurzen Wegen, tiefe Instrumente den Bass aus der Harmonie.
// Transponierende Instrumente (Klarinette/Trompete in B, Horn in F) und der Kontrabass (klingt eine Oktave tiefer)
// werden so notiert, wie man sie spielt – mit passender Tonart.
import { STUECKE, parseNoten, parseAkkorde } from "./musik.js";

export const TONART = { menuett: 1, kanon: 2, freude: 2, nachtmusik: 1, largo: 0, fanfare: 2 }; // Vorzeichen: + = Kreuze, − = Be
const DUR = ["Ges", "Des", "As", "Es", "B", "F", "C", "G", "D", "A", "E", "H", "Fis"];
export const tonartName = (vz) => DUR[vz + 6] + "-Dur";

// Instrument → Rolle, Schlüssel, Transposition (notiert = klingend + trans), Umfang und Lage (klingend, MIDI), Klangfarbe
export const INSTRUMENTE = {
  v1: { name: "Violine 1", rolle: "melodie", sl: "violin", umfang: [55, 93], klang: "violine" },
  v2: { name: "Violine 2", rolle: "mitte", lage: 69, sl: "violin", umfang: [55, 86], klang: "violine" },
  va: { name: "Viola", rolle: "mitte", lage: 62, sl: "alt", umfang: [48, 76], klang: "viola" },
  vc: { name: "Violoncello", rolle: "bass", lage: 47, sl: "bass", umfang: [36, 64], klang: "cello" },
  kb: { name: "Kontrabass", rolle: "bass", lage: 36, sl: "bass", trans: 12, umfang: [28, 50], klang: "bass", info: "klingt eine Oktave tiefer als notiert" },
  fl: { name: "Flöte", rolle: "melodie", sl: "violin", umfang: [62, 96], klang: "floete" },
  ob: { name: "Oboe", rolle: "melodie", sl: "violin", umfang: [58, 91], klang: "oboe" },
  kl: { name: "Klarinette in B", rolle: "melodie", sl: "violin", trans: 2, umfang: [50, 89], klang: "klarinette", info: "in B – klingt einen Ganzton tiefer als notiert" },
  fg: { name: "Fagott", rolle: "bass", lage: 43, sl: "bass", umfang: [34, 67], klang: "fagott" },
  hr: { name: "Horn in F", rolle: "mitte", lage: 60, sl: "violin", trans: 7, umfang: [41, 74], klang: "horn", info: "in F – klingt eine Quinte tiefer als notiert" },
  tr: { name: "Trompete in B", rolle: "melodie", sl: "violin", trans: 2, umfang: [54, 82], klang: "trompete", info: "in B – klingt einen Ganzton tiefer als notiert" },
  pos: { name: "Posaune", rolle: "bass", lage: 45, sl: "bass", umfang: [40, 70], klang: "posaune" },
  tb: { name: "Tuba", rolle: "bass", lage: 38, sl: "bass", umfang: [28, 58], klang: "tuba" },
  sw: { name: "Pauken", rolle: "pauke", lage: 45, sl: "bass", umfang: [40, 55], klang: "pauke", info: "Grundton und Dominante" },
  hk: { name: "Klavier", rolle: "klavier", klang: "klavier" },
  partitur: { name: "Partitur", rolle: "partitur", info: "vereinfacht, klingend notiert" },
};
// Stimmen-/Registernamen → Instrument (keine festen IDs: funktioniert mit jedem Register-Katalog)
const NAMEN = [[/partitur|direktion/i, "partitur"], [/cello/i, "vc"], [/kontrabass/i, "kb"], [/viola|bratsche/i, "va"], [/violine\s*(2|ii)|vl\.?\s*2|2\.\s*violine/i, "v2"],
  [/violine|geige/i, "v1"], [/fl[öo]te|piccolo|pikkolo/i, "fl"], [/oboe/i, "ob"], [/klarinette/i, "kl"], [/fagott/i, "fg"], [/horn/i, "hr"], [/trompete/i, "tr"],
  [/posaune/i, "pos"], [/tuba/i, "tb"], [/pauke|schlag/i, "sw"], [/klavier|harfe|piano|tasten/i, "hk"]];
export const instrumentVon = (text) => NAMEN.find(([r]) => r.test(String(text || "")))?.[1] || null;

// ---------- Stimmen erzeugen ----------
const pcVon = (m) => ((m % 12) + 12) % 12;
function lageWaehlen(noten, [lo, hi]) {
  const t = noten.filter((n) => n.ton != null).map((n) => n.ton), min = Math.min(...t), max = Math.max(...t);
  const k = [0, 12, -12, 24, -24].find((v) => min + v >= lo && max + v <= hi) ?? 0;
  return noten.map((n) => ({ ton: n.ton == null ? null : n.ton + k, dauer: n.dauer }));
}
function naechster(pcs, ziel, lo, hi) {
  let best = null;
  for (let p = lo; p <= hi; p++) if (pcs.includes(pcVon(p)) && (best == null || Math.abs(p - ziel) < Math.abs(best - ziel))) best = p;
  return best;
}
function mittelstimme(akk, lage, [lo, hi]) {
  let vor = lage;
  return akk.map((a) => {
    const pcs = a.toene.map(pcVon), grund = pcVon(a.grund);
    let best = null, wert = Infinity;
    for (let p = lo; p <= hi; p++) {
      if (!pcs.includes(pcVon(p))) continue;
      const w = Math.abs(p - vor) + 0.35 * Math.abs(p - lage) + (pcVon(p) === grund ? 1.5 : 0) + (p === vor ? 1.2 : 0); // lieber Terz/Quinte, kleine Schritte, etwas Bewegung
      if (w < wert) { wert = w; best = p; }
    }
    vor = best;
    return { ton: best, dauer: a.dauer };
  });
}
function bassstimme(akk, takt, lage, [lo, hi], art) {
  const out = [];
  for (const a of akk) {
    const g = naechster([pcVon(a.grund)], lage, lo, hi), q = g + 7 <= hi ? g + 7 : g - 5;
    if (art !== "schlaege") { out.push({ ton: g, dauer: a.dauer }); continue; }
    for (let rest = a.dauer; rest > 1e-6;) {
      const teil = Math.min(rest, takt);
      if (teil === 3 && takt === 3) out.push({ ton: g, dauer: 1 }, { ton: q, dauer: 1 }, { ton: q, dauer: 1 }); // Hm-ta-ta
      else if (teil === 4) out.push({ ton: g, dauer: 2 }, { ton: q, dauer: 2 });
      else out.push({ ton: g, dauer: teil });
      rest -= teil;
    }
  }
  return out;
}
function paukenstimme(akk, vz, lage, [lo, hi]) {
  const tonika = pcVon(vz * 7), dominante = pcVon(vz * 7 + 7), out = [];
  for (const a of akk) {
    const pc = pcVon(a.grund);
    if (pc !== tonika && pc !== dominante) { out.push({ ton: null, dauer: a.dauer }); continue; }
    out.push({ ton: naechster([pc], lage, lo, hi), dauer: Math.min(1, a.dauer) });
    if (a.dauer > 1) out.push({ ton: null, dauer: a.dauer - 1 });
  }
  return out;
}

// Liefert die Stimme eines Stücks für ein Instrument (Name der Stimme oder des Registers) – oder null.
export function stimmeErzeugen(stueckId, bezeichnung = "Partitur") {
  const s = STUECKE.find((x) => x.id === stueckId);
  if (!s) return null;
  const key = instrumentVon(bezeichnung) || "partitur", inst = INSTRUMENTE[key], vz = TONART[s.id] ?? 0;
  const mel = parseNoten(s.melodie), akk = parseAkkorde(s.akkorde, 3);
  const zeile = (i, noten, name = "") => ({ name, sl: i.sl, trans: i.trans || 0, klang: i.klang, noten });
  const ROLLE = {
    melodie: () => [zeile(inst, lageWaehlen(mel, inst.umfang))],
    mitte: () => [zeile(inst, mittelstimme(akk, inst.lage, inst.umfang))],
    bass: () => [zeile(inst, bassstimme(akk, s.takt, inst.lage, inst.umfang, s.bassArt))],
    pauke: () => [zeile(inst, paukenstimme(akk, vz, inst.lage, inst.umfang))],
    klavier: () => [zeile({ sl: "violin", klang: "klavier" }, lageWaehlen(mel, [57, 88]), "r. H."), zeile({ sl: "bass", klang: "klavier" }, bassstimme(akk, s.takt, 48, [36, 60], s.bassArt), "l. H.")],
    partitur: () => [zeile(INSTRUMENTE.v1, lageWaehlen(mel, [55, 93]), "Melodie"), zeile(INSTRUMENTE.va, mittelstimme(akk, 62, [48, 76]), "Mitte"), zeile(INSTRUMENTE.vc, bassstimme(akk, s.takt, 47, [36, 64], s.bassArt), "Bass")],
  };
  return { stueck: s, key, inst, vorzeichen: vz, takt: s.takt, tempo: s.tempo, zeilen: ROLLE[inst.rolle]() };
}

// ---------- Rechtschreibung der Töne ----------
const NAT = [0, 2, 4, 5, 7, 9, 11], KREUZ = [3, 0, 4, 1, 5, 2, 6], BE = [6, 2, 5, 1, 4, 0, 3];
export const transVz = (vz, t) => { let k = pcVon(t * 7); if (k > 6) k -= 12; let r = vz + k; if (r > 6) r -= 12; if (r < -6) r += 12; return r; };
function alterationen(vz) { const a = Array(7).fill(0); (vz > 0 ? KREUZ.slice(0, vz) : BE.slice(0, -vz)).forEach((L) => (a[L] = vz > 0 ? 1 : -1)); return a; }
// MIDI-Ton → diatonische Stufe (dn = Oktave·7 + Buchstabe) und Vorzeichen (+1 ♯, −1 ♭, 0)
export function buchstabieren(m, vz, alt = alterationen(vz)) {
  const pc = pcVon(m);
  let L = alt.findIndex((a, i) => pcVon(NAT[i] + a) === pc), a = L >= 0 ? alt[L] : 0;
  if (L < 0) for (const x of vz >= 0 ? [0, 1, -1] : [0, -1, 1]) { L = NAT.findIndex((n) => pcVon(n + x) === pc); if (L >= 0) { a = x; break; } }
  return { dn: (Math.floor((m - a - NAT[L]) / 12) - 1) * 7 + L, a };
}

// ---------- Takte ----------
const WERTE = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
const zerlegen = (d) => { const r = []; for (let rest = d; rest > 1e-6;) { const w = WERTE.find((v) => v <= rest + 1e-6) ?? rest; r.push(w); rest -= w; } return r; };
export function takteBauen(noten, takt) {
  const takte = [[]];
  let pos = 0;
  noten.forEach((n, idx) => {
    let rest = n.dauer, erst = true;
    while (rest > 1e-6) {
      const teil = Math.min(rest, takt - pos), stuecke = zerlegen(teil);
      stuecke.forEach((d, j) => {
        const letzte = j === stuecke.length - 1 && rest - teil < 1e-6;
        takte[takte.length - 1].push({ ton: n.ton, dauer: d, pos, idx: erst ? idx : -1, binde: n.ton != null && !letzte });
        pos += d; erst = false;
      });
      rest -= teil;
      if (pos >= takt - 1e-6) { pos = 0; takte.push([]); }
    }
  });
  if (!takte[takte.length - 1].length) takte.pop();
  return takte.map((t) => (t.every((e) => e.ton == null) ? [{ ton: null, dauer: takt, pos: 0, idx: -1, ganz: true }] : t));
}

// ---------- Zeichnen ----------
const S = 8, H = S / 2; // Linienabstand
const TOP = { violin: 38, bass: 26, alt: 32 }; // diatonische Stufe der obersten Linie (F5 / A3 / G4)
const VZ_DN = { kreuz: [38, 35, 39, 36, 33, 37, 34], be: [34, 37, 33, 36, 32, 35, 31] }; // im Violinschlüssel
const VZ_VERSATZ = { violin: 0, alt: -7, bass: -14 };
const f1 = (n) => Math.round(n * 10) / 10;
const SCHLUESSEL = {
  violin: `<g transform="translate(X Y) scale(.8)"><path d="M15 32C9 31 9 23 15 22C23 21 26 31 19 35C11 39 3 33 4 24C5 14 18 8 20-2C21-9 18-13 15-10C11-6 11 2 13 10L18 44C19 51 13 52 11 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12.5" cy="47" r="3.2"/></g>`,
  bass: `<g transform="translate(X Y) scale(.8)"><path d="M5 11C4 3 16 1 19 9C22 19 13 30 3 36" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="6.5" cy="11" r="3.6"/><circle cx="25" cy="5" r="1.9"/><circle cx="25" cy="15" r="1.9"/></g>`,
  alt: `<g transform="translate(X Y) scale(.8)"><rect x="0" y="0" width="3.6" height="40"/><path d="M7 0V40M8 20L11.5 15C14 11 15 2 21 2C27 2 27 13 21 13M8 20L11.5 25C14 29 15 38 21 38C27 38 27 27 21 27" fill="none" stroke="currentColor" stroke-width="1.8"/></g>`,
};
const kreuz = (x, y) => `<path d="M${f1(x - 1.6)} ${f1(y - 8)}V${f1(y + 8.5)}M${f1(x + 1.6)} ${f1(y - 8.5)}V${f1(y + 8)}" stroke-width="1"/><path d="M${f1(x - 3.8)} ${f1(y - 1.6)}L${f1(x + 3.8)} ${f1(y - 3.8)}M${f1(x - 3.8)} ${f1(y + 3.8)}L${f1(x + 3.8)} ${f1(y + 1.6)}" stroke-width="2.2"/>`;
const be = (x, y) => `<path d="M${f1(x - 2.5)} ${f1(y - 11)}V${f1(y + 3.5)}C${f1(x + 3.5)} ${f1(y - 0.5)} ${f1(x + 4)} ${f1(y - 5)} ${f1(x - 2.5)} ${f1(y - 2.5)}" stroke-width="1.4"/>`;
const aufloesung = (x, y) => `<path d="M${f1(x - 2.2)} ${f1(y - 8)}V${f1(y + 3)}L${f1(x + 2.2)} ${f1(y + 2)}M${f1(x + 2.2)} ${f1(y + 8)}V${f1(y - 3)}L${f1(x - 2.2)} ${f1(y - 2)}" stroke-width="1.3"/>`;
const ZEICHEN = { 1: kreuz, "-1": be, 0: aufloesung };

function pause(e, x, y0) {
  const d = e.ganz ? 4 : e.dauer, punkt = [3, 1.5, 0.75].includes(d) ? `<circle cx="${f1(x + 8)}" cy="${f1(y0 + S * 1.5)}" r="1.5" stroke="none"/>` : "";
  if (d >= 4) return `<rect x="${f1(x - 5)}" y="${f1(y0 + S)}" width="10" height="${H}" stroke="none"/>`;
  if (d >= 2) return `<rect x="${f1(x - 5)}" y="${f1(y0 + 2 * S - H)}" width="10" height="${H}" stroke="none"/>` + punkt;
  if (d >= 1) return `<path d="M${f1(x - 2)} ${f1(y0 + S * 0.6)}l4.5 5.5l-4 4.5l4.5 5.5c-5-2.5-6.5 2-2 5.5" stroke-width="2.2" stroke-linejoin="round"/>` + punkt;
  const fahne = (yy) => `<circle cx="${f1(x - 2.5)}" cy="${f1(yy)}" r="2" stroke="none"/><path d="M${f1(x - 2.5)} ${f1(yy + 1.5)}q3.5 1.2 6-2" stroke-width="1.3"/>`;
  return fahne(y0 + S * 1.5) + (d < 0.5 ? fahne(y0 + S * 2.5) : "") + `<path d="M${f1(x + 3.5)} ${f1(y0 + S * 1.3)}L${f1(x - 1)} ${f1(y0 + S * 3.3)}" stroke-width="1.4"/>` + punkt;
}

// Zeichnet eine Stimme (eine oder mehrere Notenzeilen) als SVG. takteJeZeile: wie viele Takte nebeneinander.
export function notenSvg(st, { takteJeZeile = 4, titel = "" } = {}) {
  const T = Math.max(1, Math.min(8, takteJeZeile | 0)), mehr = st.zeilen.length > 1;
  const zl = st.zeilen.map((z) => {
    const vz = transVz(st.vorzeichen, z.trans);
    return { ...z, vz, alt: alterationen(vz), top: TOP[z.sl], takte: takteBauen(z.noten.map((n) => ({ ton: n.ton == null ? null : n.ton + z.trans, dauer: n.dauer })), st.takt) };
  });
  const nTakte = Math.max(...zl.map((z) => z.takte.length)), maxVz = Math.max(...zl.map((z) => Math.abs(z.vz)));
  const LINKS = mehr ? 44 : 6, W = LINKS + 64 + T * 150, RECHTS = W - 4, ABST = 80, OBEN = 34, UNTEN = 30;
  const sysH = OBEN + (zl.length - 1) * ABST + 4 * S + UNTEN;
  const out = [], binde = zl.map(() => null);
  let ySys = 0, vorFaktor = null;
  for (let b0 = 0; b0 < nTakte; b0 += T) {
    const erst = b0 === 0, kopfB = 30 + maxVz * 7 + (maxVz ? 6 : 0) + (erst ? 22 : 6);
    const lay = [];
    for (let b = b0; b < Math.min(nTakte, b0 + T); b++) {
      const ps = [...new Set(zl.flatMap((z) => (z.takte[b] || []).filter((e) => !e.ganz).map((e) => e.pos)))].sort((a, c) => a - c);
      const sp = ps.map((p, i) => 12 + 22 * Math.sqrt((ps[i + 1] ?? st.takt) - p));
      lay.push({ b, ps, sp, w: 18 + (sp.length ? sp.reduce((a, c) => a + c, 0) : 60) });
    }
    const x0 = LINKS + kopfB, avail = RECHTS - x0, summe = lay.reduce((a, l) => a + l.w, 0);
    const f = lay.length === T ? avail / summe : Math.min(avail / summe, vorFaktor ?? 1.5);
    vorFaktor = f;
    let x = x0;
    for (const l of lay) {
      l.x = x; l.xs = new Map(); let cur = x + 13 * f;
      l.ps.forEach((p, i) => { l.xs.set(p, cur + 4); cur += l.sp[i] * f; });
      l.ende = x + l.w * f; x = l.ende;
    }
    const xEnde = lay[lay.length - 1].ende, yErst = ySys + OBEN, yLetzt = ySys + OBEN + (zl.length - 1) * ABST;
    if (!erst) out.push(`<text x="${LINKS + 2}" y="${f1(yErst - 12)}" font-size="9" stroke="none" font-style="italic">${b0 + 1}</text>`);
    if (mehr) out.push(`<path d="M${LINKS} ${yErst}V${yLetzt + 4 * S}" stroke-width="1"/><path d="M${LINKS - 4} ${yErst - 2}V${yLetzt + 4 * S + 2}" stroke-width="3"/>`);
    zl.forEach((z, zi) => {
      const y0 = ySys + OBEN + zi * ABST, yv = (dn) => y0 + (z.top - dn) * H;
      out.push(`<path d="${[0, 1, 2, 3, 4].map((i) => `M${LINKS} ${y0 + i * S}H${f1(xEnde)}`).join("")}" stroke-width=".8"/>`);
      if (mehr && erst) out.push(`<text x="${LINKS - 8}" y="${y0 + 2 * S + 3}" font-size="9" text-anchor="end" stroke="none">${z.name}</text>`);
      out.push(SCHLUESSEL[z.sl].replace("X", LINKS + 3).replace("Y", z.sl === "violin" ? y0 - 3 : y0));
      const vzDn = (z.vz > 0 ? VZ_DN.kreuz : VZ_DN.be).slice(0, Math.abs(z.vz)).map((d) => d + VZ_VERSATZ[z.sl]);
      vzDn.forEach((d, i) => out.push(ZEICHEN[z.vz > 0 ? 1 : -1](LINKS + 35 + i * 7, yv(d))));
      if (erst) {
        const tx = LINKS + 34 + maxVz * 7 + (maxVz ? 6 : 0) + 6;
        out.push(`<text x="${tx}" y="${y0 + S * 1.85}" font-size="17" font-weight="900" text-anchor="middle" font-family="Georgia,serif" stroke="none">${st.takt}</text><text x="${tx}" y="${y0 + S * 3.85}" font-size="17" font-weight="900" text-anchor="middle" font-family="Georgia,serif" stroke="none">4</text>`);
      }
      for (const l of lay) {
        const ev = z.takte[l.b] || [], zust = new Map();
        const geo = ev.map((e) => {
          if (e.ton == null) return { e, x: e.ganz ? (l.x + l.ende) / 2 : l.xs.get(e.pos) };
          const { dn, a } = buchstabieren(e.ton, z.vz, z.alt), L = ((dn % 7) + 7) % 7, fort = e.idx === -1;
          const soll = zust.has(dn) ? zust.get(dn) : z.alt[L];
          if (!fort) zust.set(dn, a);
          return { e, x: l.xs.get(e.pos), dn, y: yv(dn), acc: !fort && a !== soll ? a : null, up: dn < z.top - 4 };
        });
        // Balken: Achtel/Sechzehntel innerhalb eines Schlags
        const gruppen = []; let g = [];
        for (const o of geo) {
          const kurz = o.e.ton != null && (o.e.dauer === 0.5 || o.e.dauer === 0.25);
          if (kurz && g.length && Math.floor(g[0].e.pos + 1e-6) === Math.floor(o.e.pos + 1e-6)) g.push(o);
          else { if (g.length) gruppen.push(g); g = kurz ? [o] : []; }
        }
        if (g.length) gruppen.push(g);
        const balken = gruppen.filter((gr) => gr.length > 1);
        for (const gr of balken) { const up = gr.reduce((a, o) => a + o.dn, 0) / gr.length < z.top - 4; gr.forEach((o) => { o.up = up; o.balken = gr; }); }
        for (const o of geo) {
          const { e } = o;
          if (e.ton == null) { out.push(pause(e, o.x, y0)); continue; }
          const { x, y, dn } = o;
          for (let d = z.top + 2; d <= dn; d += 2) out.push(`<path d="M${f1(x - 8)} ${f1(yv(d))}H${f1(x + 8)}" stroke-width="1"/>`);
          for (let d = z.top - 10; d >= dn; d -= 2) out.push(`<path d="M${f1(x - 8)} ${f1(yv(d))}H${f1(x + 8)}" stroke-width="1"/>`);
          if (o.acc != null) out.push(ZEICHEN[o.acc](x - 13, y));
          const hohl = e.dauer >= 2, k = e.idx >= 0 ? ` data-k="${zi}-${e.idx}"` : "";
          out.push(e.dauer >= 4
            ? `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6" ry="4" fill="none" stroke-width="2"${k}/>`
            : `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="5.2" ry="3.7" transform="rotate(-22 ${f1(x)} ${f1(y)})" ${hohl ? 'fill="none" stroke-width="1.7"' : 'stroke="none"'}${k}/>`);
          if ([3, 1.5, 0.75].includes(e.dauer)) out.push(`<circle cx="${f1(x + 9)}" cy="${f1((z.top - dn) % 2 === 0 ? y - H : y)}" r="1.6" stroke="none"/>`);
          if (e.dauer < 4 && !o.balken) {
            const mitte = y0 + 2 * S, sx = o.up ? x + 4.7 : x - 4.7, tip = o.up ? Math.min(y - 3.5 * S, mitte) : Math.max(y + 3.5 * S, mitte);
            out.push(`<path d="M${f1(sx)} ${f1(o.up ? y - 1 : y + 1)}V${f1(tip)}" stroke-width="1.2"/>`);
            for (let i = 0; i < (e.dauer <= 0.25 ? 2 : e.dauer <= 0.75 ? 1 : 0); i++) {
              const ty = tip + (o.up ? i * 6 : -i * 6);
              out.push(o.up ? `<path d="M${f1(sx)} ${f1(ty)}c1 5 8.5 7 6 14" stroke-width="1.8"/>` : `<path d="M${f1(sx)} ${f1(ty)}c1-5 8.5-7 6-14" stroke-width="1.8"/>`);
            }
          }
          const vor = binde[zi];
          if (vor && e.idx === -1) {
            const unten = o.up, dy = unten ? 6 : -6, bogen = (xa, ya, xb, yb) => `<path d="M${f1(xa)} ${f1(ya + dy)}Q${f1((xa + xb) / 2)} ${f1((ya + yb) / 2 + dy * 2)} ${f1(xb)} ${f1(yb + dy)}" stroke-width="1.3"/>`;
            if (vor.sys === b0) out.push(bogen(vor.x + 4, vor.y, x - 4, y));
            else out.push(bogen(LINKS + kopfB - 14, y, x - 4, y));
          }
          binde[zi] = e.binde ? { x, y, sys: b0 } : null;
        }
        for (const gr of balken) {
          const up = gr[0].up, sx = (o) => (up ? o.x + 4.7 : o.x - 4.7), a = gr[0], z2 = gr[gr.length - 1];
          const steig = Math.max(-S, Math.min(S, (z2.y - a.y) * 0.5)), m = steig / Math.max(1, sx(z2) - sx(a));
          let basis = up ? Math.min(...gr.map((o) => o.y - 3.3 * S - m * (sx(o) - sx(a)))) : Math.max(...gr.map((o) => o.y + 3.3 * S - m * (sx(o) - sx(a))));
          const by = (o) => basis + m * (sx(o) - sx(a));
          for (const o of gr) out.push(`<path d="M${f1(sx(o))} ${f1(up ? o.y - 1 : o.y + 1)}V${f1(by(o))}" stroke-width="1.2"/>`);
          const dick = up ? 3.6 : -3.6;
          out.push(`<path d="M${f1(sx(a))} ${f1(by(a))}L${f1(sx(z2))} ${f1(by(z2))}L${f1(sx(z2))} ${f1(by(z2) + dick)}L${f1(sx(a))} ${f1(by(a) + dick)}Z" stroke="none"/>`);
          for (let i = 0; i < gr.length - 1; i++) if (gr[i].e.dauer === 0.25 && gr[i + 1].e.dauer === 0.25) {
            const o1 = gr[i], o2 = gr[i + 1], v = up ? 6 : -6;
            out.push(`<path d="M${f1(sx(o1))} ${f1(by(o1) + v)}L${f1(sx(o2))} ${f1(by(o2) + v)}L${f1(sx(o2))} ${f1(by(o2) + v + dick)}L${f1(sx(o1))} ${f1(by(o1) + v + dick)}Z" stroke="none"/>`);
          }
        }
      }
    });
    lay.forEach((l) => {
      const schluss = l.b === nTakte - 1;
      if (schluss) out.push(`<path d="M${f1(l.ende - 6)} ${yErst}V${yLetzt + 4 * S}" stroke-width="1"/><path d="M${f1(l.ende - 1.5)} ${yErst}V${yLetzt + 4 * S}" stroke-width="3"/>`);
      else if (mehr) out.push(`<path d="M${f1(l.ende)} ${yErst}V${yLetzt + 4 * S}" stroke-width="1"/>`);
      else out.push(`<path d="M${f1(l.ende)} ${yErst}V${yErst + 4 * S}" stroke-width="1"/>`);
    });
    ySys += sysH;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="nb-svg" viewBox="0 0 ${W} ${f1(ySys)}" role="img" aria-label="${String(titel).replace(/[<&"]/g, "")}" fill="currentColor" stroke="currentColor" stroke-linecap="round">${out.join("")}</svg>`;
}
