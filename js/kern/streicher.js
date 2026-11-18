// 🎻 Bogenstriche der Streicher (0.79.0, Wunsch Hansi „die Streicher muss man besser spielen sehen – dass sich der Bogen auf und ab bewegt“).
// Reine Rechnung (läuft auch in Tests): jeder Ton ist ein eigener Strich, abwechselnd Abstrich/Aufstrich. Der Bogen gleitet entlang
// seiner eigenen Achse über die Saiten (der Kontaktpunkt bleibt auf den Saiten); kurze Töne nehmen wenig Bogen, lange den ganzen.
// Die Schulter bleibt fest, Ellbogen und Hand folgen (Zwei-Gelenk-Arm). Koordinaten wie in figur() (buehne.js), je Musiker-Figur.
export const STRICH = {
  // hand = Bogenhand in Ruhe-Spielhaltung, achse = Richtung des Bogens (Einheitsvektor), weg = halber Strichweg,
  // oa/ua = Ober-/Unterarm, ruhe = Bogen in der Pause abgesenkt (Verschiebung + Drehung um die Hand)
  geige: { schulter: [5.6, -16.6], hand: [2.6, -10.8], achse: [-0.675, -0.737], weg: 8.5, oa: 7.6, ua: 7, ruhe: [2, 4, 14] },
  cello: { schulter: [5.6, -16.6], hand: [11.4, -2.6], achse: [-0.9986, -0.052], weg: 8.5, oa: 10.5, ua: 10.5, ruhe: [1, 2.5, 0] },
  bass: { schulter: [5.6, -16.6], hand: [13.2, 1.6], achse: [-0.9984, -0.057], weg: 7.5, oa: 12.5, ua: 12.5, ruhe: [1, 2.5, 0] },
};
STRICH.bratsche = STRICH.geige;
export const strichArt = (inst) => STRICH[inst] || null;

const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)); // weich anfangen und abbremsen wie ein echter Bogenwechsel
// Stand des Bogens -1 … 1 (Spitze … Frosch) zu einem Zeitpunkt
export function bogenStand(s, jetzt) {
  if (!s) return 0;
  return s.von + (s.nach - s.von) * glatt((jetzt - s.start) / s.dauer);
}
// neuer Strich: Richtung wechselt, Länge nach Tondauer (0,35 … 1 Bogen); läuft der vorige noch (unter 80 %), bleibt er (kein Zittern)
export function strichNeu(alt, dauerMs, jetzt) {
  if (alt && jetzt - alt.start < alt.dauer * 0.8) return alt;
  const von = bogenStand(alt, jetzt), anteil = Math.max(0.35, Math.min(1, dauerMs / 900));
  const nach = (alt ? alt.nach : -1) > 0 ? -anteil : anteil;
  return { von, nach, start: jetzt, dauer: Math.max(180, Math.min(1600, dauerMs)) };
}
// Position der Bogenhand: p = Stand (-1 … 1), ruhe = 0 (spielt) … 1 (Pause)
export function handBei(d, p, ruhe = 0) {
  return [d.hand[0] + p * d.weg * d.achse[0] + ruhe * d.ruhe[0], d.hand[1] + p * d.weg * d.achse[1] + ruhe * d.ruhe[1]];
}
// Ellbogen per Zwei-Gelenk-Rechnung (Ellbogen nach außen = größeres x); ist die Hand zu weit weg, ist der Arm gestreckt
export function ellbogen(d, h) {
  const [sx, sy] = d.schulter, dx = h[0] - sx, dy = h[1] - sy, l = Math.hypot(dx, dy) || 1e-6;
  if (l >= d.oa + d.ua) return [sx + (dx / l) * d.oa, sy + (dy / l) * d.oa];
  const a = (d.oa * d.oa - d.ua * d.ua + l * l) / (2 * l), hh = Math.sqrt(Math.max(0, d.oa * d.oa - a * a));
  const px = sx + (a * dx) / l, py = sy + (a * dy) / l, nx = -dy / l, ny = dx / l;
  const e1 = [px + hh * nx, py + hh * ny], e2 = [px - hh * nx, py - hh * ny];
  return e1[0] >= e2[0] ? e1 : e2;
}
const f = (n) => n.toFixed(2);
export function armD(d, h) { const e = ellbogen(d, h); return `M${d.schulter[0]} ${d.schulter[1]} L${f(e[0])} ${f(e[1])} L${f(h[0])} ${f(h[1])}`; }
// SVG-Transform der Bogen-Gruppe (Hand + Bogen)
export function bogenTransform(d, p, ruhe = 0) {
  const [hx, hy] = handBei(d, p, ruhe);
  return `translate(${f(hx - d.hand[0])} ${f(hy - d.hand[1])}) rotate(${f(ruhe * d.ruhe[2])} ${d.hand[0]} ${d.hand[1]})`;
}
