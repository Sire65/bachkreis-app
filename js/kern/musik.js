// Musik-Engine der Bühne: kleines Orchester per Web Audio (keine Audiodateien, keine Kosten, offline).
// Stücke sind gemeinfrei (Bach-Umfeld, Pachelbel, Beethoven, Mozart, Dvořák) bzw. eigene Fanfare – als Noten hinterlegt.
// Notation: "D5:1 G4:.5 -:1" = Ton:Schläge, "-" = Pause. Akkorde: "G:3 D7:1.5" = Akkord:Schläge.

const NOTEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error("Unbekannte Note " + name);
  return 12 * (Number(m[3]) + 1) + NOTEN[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export function parseNoten(s) {
  return s.trim().split(/\s+/).map((t) => { const [n, d] = t.split(":"); return { ton: n === "-" ? null : midi(n), dauer: Number(d) }; });
}
const AKK = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] };
export function parseAkkorde(s, okt = 3) {
  return s.trim().split(/\s+/).map((t) => {
    const [n, d] = t.split(":");
    const m = /^([A-G])(#|b)?(m7|maj7|m|7)?$/.exec(n);
    if (!m) throw new Error("Unbekannter Akkord " + n);
    const grund = midi(m[1] + (m[2] || "") + okt);
    return { grund, toene: AKK[m[3] || ""].map((i) => grund + i), dauer: Number(d) };
  });
}

// Bühnen-Sektionen (für die Animation): v1 v2 va vc kb fl ob kl fg hr tr pos pk dir
export const STUECKE = [
  { id: "menuett", titel: "Menuett G-Dur", komponist: "Chr. Petzold (Notenbüchlein für A. M. Bach)", tempo: 112, takt: 3,
    melodie: "D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 F#4:1 G4:.5 A4:.5 B4:.5 G4:.5 A4:3 " +
      "D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 A4:1 B4:.5 A4:.5 G4:.5 F#4:.5 G4:3",
    akkorde: "G:3 G:3 C:3 G:3 Am:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 Am:3 G:3 D:3 G:3",
    melodieSek: ["v1", "fl"], bassArt: "schlaege" },
  { id: "kanon", titel: "Kanon in D", komponist: "Johann Pachelbel", tempo: 60, takt: 4,
    melodie: "F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 " +
      "F#5:1 D5:1 E5:1 F#5:1 D5:1 B4:1 C#5:1 A4:1 B4:1 G4:1 A4:1 F#4:1 G4:1 E4:1 G4:1 A4:1 F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:8",
    akkorde: "D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:8",
    melodieSek: ["v1"], bassArt: "lang" },
  { id: "freude", titel: "Ode an die Freude", komponist: "Ludwig van Beethoven (9. Sinfonie)", tempo: 104, takt: 4,
    melodie: "F#4:1 F#4:1 G4:1 A4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 D4:1 E4:1 F#4:1 F#4:1.5 E4:.5 E4:2 " +
      "F#4:1 F#4:1 G4:1 A4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 D4:1 E4:1 F#4:1 E4:1.5 D4:.5 D4:2 " +
      "E4:1 E4:1 F#4:1 D4:1 E4:1 F#4:.5 G4:.5 F#4:1 D4:1 E4:1 F#4:.5 G4:.5 F#4:1 E4:1 D4:1 E4:1 A3:2 " +
      "F#4:1 F#4:1 G4:1 A4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 D4:1 E4:1 F#4:1 E4:1.5 D4:.5 D4:2",
    akkorde: "D:4 A:4 D:4 A:4 D:4 A:4 D:4 A:2 D:2 A:4 D:4 A:4 D:2 A:2 D:4 A:4 D:4 A:2 D:2",
    melodieSek: ["v1", "fl", "hr"], oktave: 12, bassArt: "schlaege" },
  { id: "nachtmusik", titel: "Eine kleine Nachtmusik (Anfang)", komponist: "Wolfgang Amadeus Mozart", tempo: 132, takt: 4,
    melodie: "G4:1 -:.5 D4:.5 G4:1 -:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1 -:.5 A4:.5 C5:1 -:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2 " +
      "G4:1 -:.5 D4:.5 G4:1 -:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1 -:.5 A4:.5 C5:1 -:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 G4:2",
    akkorde: "G:4 G:4 D7:4 D:4 G:4 G:4 D7:4 G:4",
    melodieSek: ["v1", "v2"], bassArt: "schlaege" },
  { id: "largo", titel: "Largo „Aus der Neuen Welt“", komponist: "Antonín Dvořák (9. Sinfonie)", tempo: 56, takt: 4,
    melodie: "E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4:1 E4:1 G4:1 E4:1 D4:4 E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4:1 E4:1 D4:1 C4:1 C4:4",
    akkorde: "C:4 C:4 G:4 G:4 C:4 F:2 C:2 G:4 C:4",
    melodieSek: ["ob"], oktave: 12, bassArt: "lang" },
  { id: "fanfare", titel: "Bachkreis-Fanfare", komponist: "eigene Komposition (Demo)", tempo: 100, takt: 4,
    melodie: "D4:.5 F#4:.5 A4:.5 D5:1.5 A4:.5 D5:.5 F#5:2 -:.5 E5:.5 D5:.5 C#5:.5 B4:.5 A4:.5 G4:.5 F#4:.5 E4:1 A4:1 D5:4 " +
      "D4:.5 F#4:.5 A4:.5 D5:1.5 A4:.5 D5:.5 F#5:2 -:.5 G5:.5 F#5:.5 E5:.5 D5:.5 C#5:.5 B4:.5 C#5:.5 D5:2 D5:4",
    akkorde: "D:4 D:4 G:2 D:2 A:2 D:2 D:4 D:4 G:2 A:2 D:4",
    melodieSek: ["tr", "hr"], bassArt: "schlaege", pauke: true },
];

// ---------- Klangerzeugung ----------
function hall(ctx) {
  const lang = 2.2, n = ctx.sampleRate * lang, buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) { const d = buf.getChannelData(k); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  const c = ctx.createConvolver(); c.buffer = buf; return c;
}
const KLANG = {
  streicher: { wellen: ["sawtooth", "sawtooth"], verstimmt: 7, filter: 2800, an: 0.06, aus: 0.25, vib: 5, laut: 0.16 },
  bratsche: { wellen: ["sawtooth"], verstimmt: 0, filter: 1400, an: 0.12, aus: 0.3, vib: 3, laut: 0.07 },
  bass: { wellen: ["sawtooth"], verstimmt: 0, filter: 600, an: 0.04, aus: 0.2, vib: 0, laut: 0.18 },
  floete: { wellen: ["triangle"], verstimmt: 0, filter: 5000, an: 0.05, aus: 0.15, vib: 5, laut: 0.12 },
  oboe: { wellen: ["square"], verstimmt: 0, filter: 1800, an: 0.05, aus: 0.15, vib: 4, laut: 0.07 },
  blech: { wellen: ["sawtooth", "square"], verstimmt: 4, filter: 1600, an: 0.04, aus: 0.18, vib: 0, laut: 0.11 },
};
const VERSATZ = { fl: 12, hr: -12 }; // Oktavlage je Instrument relativ zur Melodie
const KLANG_VON_SEK = { v1: "streicher", v2: "streicher", fl: "floete", ob: "oboe", kl: "oboe", hr: "blech", tr: "blech", pos: "blech" };

function ton(ctx, ziel, art, frequenz, start, dauer, staerke = 1) {
  const k = KLANG[art];
  const env = ctx.createGain(); env.gain.value = 0;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = k.filter; f.Q.value = 0.7;
  f.connect(env); env.connect(ziel);
  const ende = start + Math.max(0.08, dauer);
  const v = k.laut * staerke;
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(v, start + k.an);
  env.gain.setValueAtTime(v, Math.max(start + k.an, ende - 0.02));
  env.gain.exponentialRampToValueAtTime(0.0001, ende + k.aus);
  const oscs = k.wellen.map((w, i) => { const o = ctx.createOscillator(); o.type = w; o.frequency.value = frequenz; o.detune.value = i ? k.verstimmt : -k.verstimmt / 2; o.connect(f); return o; });
  if (k.vib) {
    const lfo = ctx.createOscillator(), tiefe = ctx.createGain(); lfo.frequency.value = 5.3; tiefe.gain.setValueAtTime(0, start); tiefe.gain.linearRampToValueAtTime(k.vib, start + 0.25);
    lfo.connect(tiefe); for (const o of oscs) tiefe.connect(o.detune); lfo.start(start); lfo.stop(ende + k.aus + 0.05);
  }
  for (const o of oscs) { o.start(start); o.stop(ende + k.aus + 0.05); }
}
function pauke(ctx, ziel, frequenz, start, staerke = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(frequenz * 1.5, start); o.frequency.exponentialRampToValueAtTime(frequenz, start + 0.08);
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(0.5 * staerke, start + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
  o.connect(g); g.connect(ziel); o.start(start); o.stop(start + 1.3);
}
export function applaus(ctx, ziel, start, dauer = 3.5) {
  const n = ctx.sampleRate * dauer, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { const t = i / ctx.sampleRate; const klatsch = Math.random() < 0.0016 ? 1 : 0; d[i] = (Math.random() * 2 - 1) * 0.25 * Math.min(1, t * 3) * Math.min(1, (dauer - t) * 1.2) + klatsch * (Math.random() * 2 - 1); }
  const q = ctx.createBufferSource(); q.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 0.6;
  const g = ctx.createGain(); g.gain.value = 0.35;
  q.connect(f); f.connect(g); g.connect(ziel); q.start(start);
}

// Spielt ein Stück. onEreignis({sek:[…], t}) für die Animation, onTakt(schlag) für den Dirigenten, onEnde().
export function spielen(ctx, stueck, { tempoFaktor = 1, lautstaerke = 0.8, onEreignis = () => {}, onTakt = () => {}, onEnde = () => {}, mitApplaus = true } = {}) {
  const master = ctx.createGain(); master.gain.value = lautstaerke;
  const trocken = ctx.createGain(); trocken.gain.value = 0.8;
  const nass = ctx.createGain(); nass.gain.value = 0.35;
  const h = hall(ctx);
  trocken.connect(master); h.connect(nass); nass.connect(master); master.connect(ctx.destination);
  const bus = ctx.createGain(); bus.connect(trocken); bus.connect(h);
  const sb = 60 / (stueck.tempo * tempoFaktor); // Sekunden je Schlag
  const t0 = ctx.currentTime + 0.25;
  const timer = [];
  const melden = (zeit, ereignis) => timer.push(setTimeout(() => onEreignis(ereignis), Math.max(0, (zeit - ctx.currentTime) * 1000)));
  // Melodie
  let t = t0;
  const okt = stueck.oktave || 0;
  for (const n of parseNoten(stueck.melodie)) {
    const d = n.dauer * sb;
    if (n.ton != null) {
      for (const sek of stueck.melodieSek) {
        let m = n.ton + okt + (VERSATZ[sek] || 0);
        while (m > 93) m -= 12; // nicht höher als A6
        ton(ctx, bus, KLANG_VON_SEK[sek] || "streicher", hz(m), t, d * 0.95, sek === "fl" ? 0.7 : 1);
      }
      melden(t, { sek: stueck.melodieSek, dauer: d });
    }
    t += d;
  }
  const melodieEnde = t;
  // Begleitung: Bass + Mittelstimmen + (Pauke)
  t = t0;
  const akk = parseAkkorde(stueck.akkorde);
  akk.forEach((a, i) => {
    const d = a.dauer * sb;
    if (stueck.bassArt === "schlaege") {
      for (let s = 0; s < a.dauer; s += 1) { ton(ctx, bus, "bass", hz(a.grund - 12 + (s % 2 && a.dauer > 2 ? 7 : 0)), t + s * sb, sb * 0.7, s === 0 ? 1 : 0.7); melden(t + s * sb, { sek: ["vc", "kb"], dauer: sb }); }
    } else { ton(ctx, bus, "bass", hz(a.grund - 12), t, d * 0.97); melden(t, { sek: ["vc", "kb"], dauer: d }); }
    for (const tt of a.toene.slice(1, 3)) ton(ctx, bus, "bratsche", hz(tt + 12), t, d * 0.98);
    melden(t, { sek: ["v2", "va"], dauer: d });
    if (stueck.pauke && (i === 0 || i === akk.length - 1 || i % 4 === 0)) { pauke(ctx, bus, hz(a.grund - 12), t, 1); melden(t, { sek: ["pk"], dauer: sb }); }
    if (i === akk.length - 1 && !stueck.pauke) { pauke(ctx, bus, hz(a.grund - 12), t, 0.6); melden(t, { sek: ["pk"], dauer: sb }); }
    t += d;
  });
  const ende = Math.max(t, melodieEnde);
  for (let s = 0, z = t0; z < ende; s++, z += sb) timer.push(setTimeout(() => onTakt(s % stueck.takt), Math.max(0, (z - ctx.currentTime) * 1000)));
  if (mitApplaus) applaus(ctx, master, ende + 0.4);
  timer.push(setTimeout(() => onEnde(), (ende - ctx.currentTime + (mitApplaus ? 3.6 : 0.6)) * 1000));
  return {
    dauer: ende - t0,
    stop() {
      for (const x of timer) clearTimeout(x);
      try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch {}
      setTimeout(() => { try { master.disconnect(); } catch {} }, 300);
    },
    lautstaerke(v) { master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
  };
}

// Pegel je Frequenzband für Aufnahmen (Analyser) → welche Sektionen „spielen“
export function baender(analyser, daten, sampleRate) {
  analyser.getByteFrequencyData(daten);
  const hzJeBin = sampleRate / 2 / daten.length;
  const band = (von, bis) => { let s = 0, n = 0; for (let i = Math.floor(von / hzJeBin); i < Math.min(daten.length, bis / hzJeBin); i++) { s += daten[i]; n++; } return n ? s / n / 255 : 0; };
  return { tief: band(30, 250), mitte: band(250, 2000), hoch: band(2000, 8000) };
}
