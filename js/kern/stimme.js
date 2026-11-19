// 🎭 Stimmen-Effekte für Sprachnachrichten (0.47.0, wie KC: Mäusestimme, Helium, Ente, Außerirdischer, Roboter, Blechdose, Brummbär,
// Riese, Gespenst, Altes Radio, Megafon, Echo, Unter Wasser). Alles läuft im Handy (Web Audio, OfflineAudioContext) – nichts geht an fremde Dienste.
// Ergebnis: WAV, mono, 16 kHz (klein genug für den Chat). Bei „Normal“ bleibt die Aufnahme unverändert.
export const STIMMEN = [["normal", "🙂", "Normal"], ["maus", "🐭", "Mäusestimme"], ["helium", "🎈", "Helium"], ["ente", "🦆", "Ente"], ["alien", "👽", "Außerirdischer"],
  ["roboter", "🤖", "Roboter"], ["blech", "🥫", "Blechdose"], ["brumm", "🐻", "Brummbär"], ["riese", "🏔️", "Riese in der Höhle"], ["geist", "👻", "Gespenst"],
  ["radio", "📻", "Altes Radio"], ["megafon", "📢", "Megafon"], ["echo", "🔁", "Echo"], ["wasser", "🫧", "Unter Wasser"]];
// Tempo/Tonhöhe je Effekt (Abspielgeschwindigkeit) – höher = heller und schneller
export const TEMPO = { maus: 1.6, helium: 1.35, ente: 1.25, alien: 1.05, roboter: 1, blech: 1.1, brumm: 0.75, riese: 0.65, geist: 0.9, radio: 1, megafon: 1, echo: 1, wasser: 0.95, normal: 1 };
const RATE = 16000;

function verzerrung(ctx, staerke) { const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + staerke) * x * 20 * (Math.PI / 180)) / (Math.PI + staerke * Math.abs(x)); } w.curve = c; return w; }
function filter(ctx, art, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = art; b.frequency.value = f; b.Q.value = q; return b; }
function echo(ctx, ein, aus, ms, fb, nass = 0.5) { const d = ctx.createDelay(2), g = ctx.createGain(), m = ctx.createGain(); d.delayTime.value = ms / 1000; g.gain.value = fb; m.gain.value = nass; ein.connect(d); d.connect(g).connect(d); d.connect(m).connect(aus); }
function ringmod(ctx, ein, hz, typ = "sine") { const g = ctx.createGain(); g.gain.value = 0; const o = ctx.createOscillator(); o.type = typ; o.frequency.value = hz; o.connect(g.gain); o.start(); ein.connect(g); return g; }

// baut die Effektkette: quelle → … → ziel
function kette(ctx, art, quelle, ziel) {
  let k = quelle;
  const weiter = (n) => { k.connect(n); k = n; };
  if (art === "ente") weiter(filter(ctx, "bandpass", 1400, 3));
  if (art === "alien") { k = ringmod(ctx, k, 30); weiter(filter(ctx, "highpass", 300)); }
  if (art === "roboter") { k = ringmod(ctx, k, 55, "square"); weiter(filter(ctx, "lowpass", 3000)); }
  if (art === "blech") { weiter(filter(ctx, "bandpass", 1800, 6)); weiter(verzerrung(ctx, 30)); }
  if (art === "radio") { weiter(filter(ctx, "highpass", 500)); weiter(filter(ctx, "lowpass", 2800)); weiter(verzerrung(ctx, 15)); }
  if (art === "megafon") { weiter(filter(ctx, "highpass", 700)); weiter(filter(ctx, "lowpass", 3600)); weiter(verzerrung(ctx, 50)); }
  if (art === "wasser") weiter(filter(ctx, "lowpass", 500, 4));
  if (art === "geist") weiter(filter(ctx, "lowpass", 2200));
  const laut = ctx.createGain(); laut.gain.value = ["blech", "megafon", "radio"].includes(art) ? 0.6 : 1; weiter(laut);
  k.connect(ziel);
  if (art === "echo") echo(ctx, k, ziel, 260, 0.45);
  if (art === "riese") echo(ctx, k, ziel, 140, 0.35, 0.4);
  if (art === "geist") echo(ctx, k, ziel, 330, 0.5, 0.6);
}
// Float32 (mono) → WAV-Blob 16 Bit
export function wavAus(daten, rate = RATE) {
  const n = daten.length, puffer = new ArrayBuffer(44 + n * 2), v = new DataView(puffer), s = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  let spitze = 0; for (let i = 0; i < n; i++) spitze = Math.max(spitze, Math.abs(daten[i])); const f = spitze > 0.98 ? 0.98 / spitze : 1;
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, daten[i] * f)) * 0x7fff, true);
  return new Blob([puffer], { type: "audio/wav" });
}
export async function stimmeAnwenden(blob, art) {
  if (!art || art === "normal") return { blob, faktor: 1 };
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext, OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!AC || !OAC) throw new Error("Stimmen-Effekte gehen auf diesem Gerät nicht");
  const ac = new AC(), roh = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close?.();
  const tempo = TEMPO[art] || 1, nach = ["echo", "riese", "geist"].includes(art) ? 1.2 : 0, laenge = Math.ceil((roh.duration / tempo + nach) * RATE);
  const oc = new OAC(1, laenge, RATE), q = oc.createBufferSource(); q.buffer = roh; q.playbackRate.value = tempo;
  kette(oc, art, q, oc.destination); q.start();
  const fertig = await oc.startRendering();
  return { blob: wavAus(fertig.getChannelData(0)), faktor: 1 / tempo };
}
