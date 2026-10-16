// 🥁 Rhythmus (0.26.0, Übe-Bühne): Muster lesen/schreiben, als Noten setzen und das Mittippen auswerten.
// Muster als Text: Schläge je Note (Viertel = 1), negativ = Pause, z. B. "1 .5 .5 -1 2". Läuft im Browser und in den Tests.

export const NOTENWERTE = [
  { w: 4, t: "Ganze", z: "𝅝" }, { w: 3, t: "Halbe mit Punkt", z: "𝅗𝅥." }, { w: 2, t: "Halbe", z: "𝅗𝅥" }, { w: 1.5, t: "Viertel mit Punkt", z: "♩." },
  { w: 1, t: "Viertel", z: "♩" }, { w: 0.75, t: "Achtel mit Punkt", z: "♪." }, { w: 0.5, t: "Achtel", z: "♪" }, { w: 0.25, t: "Sechzehntel", z: "𝅘𝅥𝅯" },
];
const ERLAUBT = new Set(NOTENWERTE.map((n) => n.w));
export const MUSTER_MAX = 64;

export function musterLesen(text) {
  const m = String(text || "").trim().split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!m.length || m.length > MUSTER_MAX || m.some((x) => !ERLAUBT.has(Math.abs(x)))) return null;
  return m.map((x) => ({ dauer: Math.abs(x), pause: x < 0 }));
}
export const musterText = (m) => m.map((n) => (n.pause ? "-" : "") + String(n.dauer).replace(/^0\./, ".")).join(" ");
export const musterSchlaege = (m) => m.reduce((s, n) => s + n.dauer, 0);
// Passt das Muster in ganze Takte?
export function musterPruefen(m, takt = 4) {
  if (!m?.length) return { ok: false, text: "Noch keine Noten im Rhythmus" };
  if (m.every((n) => n.pause)) return { ok: false, text: "Nur Pausen – bitte mindestens eine Note" };
  const s = musterSchlaege(m), rest = s % takt;
  return rest < 1e-6 ? { ok: true, text: `${s / takt} Takt${s / takt === 1 ? "" : "e"} · ${m.filter((n) => !n.pause).length} Noten` } : { ok: false, text: `Noch ${takt - rest} Schlag/Schläge bis zum vollen Takt` };
}
// Einsätze (in Schlägen ab Beginn) der klingenden Noten
export function einsaetze(m) { const r = []; let t = 0; for (const n of m) { if (!n.pause) r.push(t); t += n.dauer; } return r; }

// Für den Notensatz: eine Zeile, alle Noten auf der Mittellinie (h')
export const rhythmusSt = (m, takt = 4, tempo = 80, titel = "Rhythmus") => ({ stueck: { titel }, key: "rhythmus", inst: { name: "Rhythmus" }, vorzeichen: 0, takt, tempo,
  zeilen: [{ name: "", sl: "violin", trans: 0, klang: "trommel", noten: m.map((n) => ({ ton: n.pause ? null : 71, dauer: n.dauer })) }] });

// Mittippen auswerten. soll: Einsätze in Schlägen, taps: Tipp-Zeiten in Sekunden ab Schlag 1, schlag: Sekunden je Schlag.
// Jeder Einsatz bekommt den nächsten freien Tipp im Fenster; zu viele Tipps zählen als „extra“.
export function bewerten(soll, taps, schlag) {
  const fenster = Math.max(0.16, Math.min(0.4, 0.42 * schlag)), frei = taps.map((t) => ({ t, weg: false }));
  const treffer = soll.map((b) => {
    const ziel = b * schlag;
    let best = null;
    for (const x of frei) if (!x.weg && Math.abs(x.t - ziel) <= fenster && (!best || Math.abs(x.t - ziel) < Math.abs(best.t - ziel))) best = x;
    if (!best) return { schlag: b, ms: null };
    best.weg = true;
    return { schlag: b, ms: Math.round((best.t - ziel) * 1000) };
  });
  const getroffen = treffer.filter((x) => x.ms != null), extra = frei.filter((x) => !x.weg).length;
  const quote = soll.length ? getroffen.length / soll.length : 0;
  const mittel = getroffen.length ? Math.round(getroffen.reduce((s, x) => s + Math.abs(x.ms), 0) / getroffen.length) : null;
  const sterne = quote === 1 && mittel <= 70 && extra <= 1 ? 3 : quote >= 0.8 && mittel <= 130 && extra <= 3 ? 2 : quote >= 0.5 ? 1 : 0;
  return { treffer, extra, quote, mittel, sterne };
}
// Wie war ein einzelner Tipp?  genau (≤ 60 ms) · knapp (≤ 130 ms) · daneben / verpasst
export const tippUrteil = (ms) => (ms == null ? "verpasst" : Math.abs(ms) <= 60 ? "genau" : Math.abs(ms) <= 130 ? (ms < 0 ? "früh" : "spät") : ms < 0 ? "zu früh" : "zu spät");

// Eingebaute Stufen (für freies Üben ohne Aufgabe)
export const RHYTHMUS_STUFEN = [
  { id: "r1", titel: "1 · Viertel", takt: 4, muster: "1 1 1 1 1 1 1 1" },
  { id: "r2", titel: "2 · Halbe & Viertel", takt: 4, muster: "2 1 1 1 1 2 4" },
  { id: "r3", titel: "3 · Achtel", takt: 4, muster: "1 .5 .5 1 1 .5 .5 .5 .5 1 1" },
  { id: "r4", titel: "4 · Pausen", takt: 4, muster: "1 -1 1 1 .5 .5 -1 1 -1 1 -1 2" },
  { id: "r5", titel: "5 · Punktiert", takt: 4, muster: "1.5 .5 1 1 1.5 .5 2" },
  { id: "r6", titel: "6 · Walzer (3/4)", takt: 3, muster: "2 1 1 1 1 3 1 .5 .5 1 3" },
  { id: "r7", titel: "7 · Sechzehntel", takt: 4, muster: ".25 .25 .25 .25 1 .5 .5 1 .25 .25 .25 .25 .25 .25 .25 .25 2" },
];
