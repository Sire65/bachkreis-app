// 🎯 Stimmgerät (0.26.0, Übe-Bühne): erkennt die Tonhöhe aus dem Mikrofon – NUR im Gerät (Autokorrelation),
// nichts wird aufgenommen, gespeichert oder gesendet. Funktioniert gut bei einstimmigen Instrumenten.

// Tonhöhe in Hz aus einem Block Messwerte – oder null (zu leise / kein klarer Ton)
export function tonhoehe(buf, sampleRate) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < 0.01) return null;
  // Ränder unter 20 % der Spitze abschneiden (sauberere Korrelation)
  let a = 0, b = n - 1;
  const grenze = 0.2;
  for (let i = 0; i < n / 2; i++) if (Math.abs(buf[i]) < grenze) { a = i; break; }
  for (let i = 1; i < n / 2; i++) if (Math.abs(buf[n - i]) < grenze) { b = n - i; break; }
  const x = buf.slice(a, b), m = x.length;
  if (m < 64) return null;
  const c = new Float32Array(m);
  for (let lag = 0; lag < m; lag++) { let s = 0; for (let i = 0; i < m - lag; i++) s += x[i] * x[i + lag]; c[lag] = s; }
  let d = 0;
  while (d < m - 1 && c[d] > c[d + 1]) d++; // erstes Tal
  let best = -1, wert = -Infinity;
  for (let i = d; i < m; i++) if (c[i] > wert) { wert = c[i]; best = i; }
  if (best <= 0 || best >= m - 1 || wert < c[0] * 0.3) return null;
  const y1 = c[best - 1], y2 = c[best], y3 = c[best + 1], k = (y1 + y3 - 2 * y2) / 2, l = (y3 - y1) / 2;
  const T = k ? best - l / (2 * k) : best;
  const f = sampleRate / T;
  return f >= 25 && f <= 2500 ? f : null;
}
export const midiVon = (f) => 69 + 12 * Math.log2(f / 440);
// Nächster Ton (klingend, MIDI) und Abweichung in Cent (−50 … +50)
export function abweichung(f) { const m = midiVon(f), r = Math.round(m); return { midi: r, cent: Math.round((m - r) * 100) }; }
export const centZu = (f, ziel) => Math.round((midiVon(f) - ziel) * 100);
// Urteil für die Anzeige
export const stimmUrteil = (cent) => (Math.abs(cent) <= 8 ? "genau" : Math.abs(cent) <= 20 ? (cent < 0 ? "etwas tief" : "etwas hoch") : cent < 0 ? "zu tief" : "zu hoch");
