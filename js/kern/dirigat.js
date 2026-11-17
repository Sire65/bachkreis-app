// 🪄 Dirigat-Rechnung (0.72.0) – reines JavaScript ohne Bildschirm, läuft auch in Tests. Benutzt von js/app/buehne.js.
// 🪄 0.72.0 Dirigent wie echt (Wunsch Hansi „realitätsnäher, beide Hände, im Takt“): die rechte Hand führt die Schlagfigur des Takts
// (2er: ab–auf · 3er: ab–rechts–auf · 4er: ab–links–rechts–auf), jeder Schlag landet genau auf dem Schlagpunkt (Ictus) und federt nach oben
// zurück; die linke Hand spiegelt kleiner und etwas weicher. Arme mit Ellenbogen (Schulter–Ellenbogen–Hand), Taktstock folgt der Bewegung,
// Körper wiegt mit, Kopf nickt auf der Eins. Zeit kommt vom Schlag selbst (takt(schlag, takte, dauer)) – also immer im Takt der Musik.
// Koordinaten: Figur von hinten gesehen, rechte Hand rechts; y nach unten. Schultern bei (±6, -19).
export const SCHULTER = 6;
const OBERARM = 7, UNTERARM = 7;
export const SCHLAGFIGUR = {
  2: [[10, -12.5], [11.5, -21]],
  3: [[10, -12.5], [17, -15.5], [11.5, -22]],
  4: [[10, -12.5], [1.5, -15], [17, -15.5], [11.5, -22]],
};
export const RUHE = { r: [11, -17], l: [-11, -17] };
// Ellenbogen per Zwei-Glieder-Rechnung: von beiden möglichen Lagen die, die tiefer und weiter außen liegt (wie ein echter Arm –
// nie über den Kopf geklappt)
export function armPfad(seite, [hx, hy]) {
  const sx = seite * SCHULTER, sy = -19, dx = hx - sx, dy = hy - sy, d = Math.min(OBERARM + UNTERARM - 0.01, Math.max(1, Math.hypot(dx, dy)));
  const a = Math.acos((OBERARM * OBERARM + d * d - UNTERARM * UNTERARM) / (2 * OBERARM * d)), g = Math.atan2(dy, dx);
  const lage = [g + a, g - a].map((w) => [sx + OBERARM * Math.cos(w), sy + OBERARM * Math.sin(w)]);
  const [ex, ey] = lage.sort((p, q) => (q[1] + seite * q[0] * 0.6) - (p[1] + seite * p[0] * 0.6))[0];
  return `M${sx} ${sy} L${ex.toFixed(2)} ${ey.toFixed(2)} L${hx.toFixed(2)} ${hy.toFixed(2)}`;
}
// Position der rechten Hand: von Schlagpunkt b (u = 0) nach Schlagpunkt b+1 (u = 1) über einen Rückfederbogen;
// schnell aus dem Schlag heraus und schnell in den nächsten hinein, oben kurz langsamer – wie echtes Dirigieren
export function handPosition(takte, schlag, u) {
  const f = SCHLAGFIGUR[takte] || SCHLAGFIGUR[4], a = f[schlag % f.length], b = f[(schlag + 1) % f.length];
  const t = Math.min(1, Math.max(0, u + Math.sin(2 * Math.PI * u) / (2 * Math.PI) * 0.55));
  const hoch = schlag % f.length === 0 ? 5 : 3.5, cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - hoch;
  const m = 1 - t;
  return [m * m * a[0] + 2 * m * t * cx + t * t * b[0], m * m * a[1] + 2 * m * t * cy + t * t * b[1]];
}
// Tempo aus einer Einsatz-Kurve (Ringpuffer, 10 ms je Fach): stärkste Wiederholung zwischen 380 und 1000 ms
export function tempoSchaetzen(faecher, jetzt, n = 600) {
  const len = Math.min(n, jetzt), x = Array.from({ length: len }, (_, i) => faecher[(jetzt - len + 1 + i + n * 4) % n]);
  const m = x.reduce((a, b) => a + b, 0) / len, y = x.map((v) => v - m);
  let best = 0, wert = 0;
  for (let lag = 38; lag <= 100; lag++) { let s = 0; for (let i = lag; i < len; i++) s += y[i] * y[i - lag]; if (s > wert) { wert = s; best = lag; } }
  return best ? best * 10 : 0;
}
