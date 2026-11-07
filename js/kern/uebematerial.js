// 🎵 Übe-Material (0.26.0, Übe-Bühne): Tonleitern je Instrument, Ausschnitte (Takt von–bis), deutsche Notennamen.
// Baut auf dem Notensatz auf (gleiches Stimmen-Format: { vorzeichen, takt, tempo, zeilen: [{ sl, trans, klang, noten }] }).
import { INSTRUMENTE, buchstabieren } from "./notensatz.js";

// Tonarten für Tonleitern: Grundton (Tonklasse), Vorzeichen, Dur/Moll
export const TONARTEN = {
  C: { t: "C-Dur", pc: 0, vz: 0 }, G: { t: "G-Dur", pc: 7, vz: 1 }, D: { t: "D-Dur", pc: 2, vz: 2 }, A: { t: "A-Dur", pc: 9, vz: 3 }, E: { t: "E-Dur", pc: 4, vz: 4 },
  F: { t: "F-Dur", pc: 5, vz: -1 }, B: { t: "B-Dur", pc: 10, vz: -2 }, Es: { t: "Es-Dur", pc: 3, vz: -3 },
  a: { t: "a-Moll", pc: 9, vz: 0, moll: true }, e: { t: "e-Moll", pc: 4, vz: 1, moll: true }, h: { t: "h-Moll", pc: 11, vz: 2, moll: true },
  d: { t: "d-Moll", pc: 2, vz: -1, moll: true }, g: { t: "g-Moll", pc: 7, vz: -2, moll: true },
};
const DUR = [2, 2, 1, 2, 2, 2, 1], MOLL = [2, 1, 2, 2, 1, 2, 2]; // Moll: natürlich
export const hatTonumfang = (key) => !!INSTRUMENTE[key]?.umfang && key !== "sw";

// Tonleiter auf- und abwärts in Vierteln (klingende Töne), letzter Ton lang bis zum Taktende.
// Lage: die tiefste, in der die ganze Tonleiter ins Instrument passt (Streicher: ab der leeren Saite).
export function tonleiterSt(key, tonart = "C", oktaven = 1, tempo = 80) {
  const inst = INSTRUMENTE[key], ta = TONARTEN[tonart];
  if (!hatTonumfang(key) || !ta) return null;
  const [lo, hi] = inst.umfang;
  let okt = Math.max(1, Math.min(2, Number(oktaven) || 1)), start = null;
  for (; okt >= 1 && start == null; okt--) for (let m = lo; m + 12 * okt <= hi; m++) if (((m % 12) + 12) % 12 === ta.pc) { start = m; break; }
  okt++;
  if (start == null) return null;
  const schritte = ta.moll ? MOLL : DUR, auf = [start];
  for (let o = 0; o < okt; o++) for (const s of schritte) auf.push(auf[auf.length - 1] + s);
  const toene = [...auf, ...auf.slice(0, -1).reverse()];
  const n = toene.length, letzte = Math.max(2, Math.ceil((n - 1 + 2) / 4) * 4 - (n - 1));
  const noten = toene.map((ton, i) => ({ ton, dauer: i === n - 1 ? letzte : 1 }));
  return { stueck: { titel: `${ta.t}-Tonleiter` }, key, inst, vorzeichen: ta.vz, takt: 4, tempo,
    zeilen: [{ name: "", sl: inst.sl || "violin", trans: inst.trans || 0, klang: inst.klang, noten }] };
}

// Ausschnitt Takt von–bis (1-basiert, einschließlich). Noten, die über den Rand reichen, werden gekürzt.
export function ausschnitt(noten, takt, von, bis) {
  const a = (von - 1) * takt, b = bis * takt, out = [];
  let t = 0;
  for (const n of noten) {
    const s = t, e = t + n.dauer; t = e;
    if (e <= a + 1e-6 || s >= b - 1e-6) continue;
    const s2 = Math.max(s, a), e2 = Math.min(e, b);
    out.push({ ton: s < a - 1e-6 ? null : n.ton, dauer: e2 - s2 }); // angeschnittene Note vorn → Pause
  }
  return out;
}
export const taktZahl = (st) => Math.max(1, ...st.zeilen.map((z) => Math.ceil(z.noten.reduce((s, n) => s + n.dauer, 0) / st.takt - 1e-6)));
export function stelleSt(st, von, bis) {
  const max = taktZahl(st), v = Math.max(1, Math.min(max, von | 0 || 1)), b = Math.max(v, Math.min(max, bis | 0 || max));
  return { ...st, von: v, bis: b, zeilen: st.zeilen.map((z) => ({ ...z, noten: ausschnitt(z.noten, st.takt, v, b) })) };
}

// Deutscher Notenname mit Oktav-Strichen (c' = eingestrichenes C = MIDI 60), passend zur Tonart geschrieben
const BUCHST = ["c", "d", "e", "f", "g", "a", "h"];
export function notenName(m, vz = 0) {
  const { dn, a } = buchstabieren(m, vz), L = ((dn % 7) + 7) % 7, okt = Math.floor(dn / 7);
  let n = BUCHST[L];
  if (a === 1) n += "is";
  if (a === -1) n = n === "e" ? "es" : n === "a" ? "as" : n === "h" ? "b" : n + "es";
  if (okt <= 2) return n[0].toUpperCase() + n.slice(1) + (okt <= 1 ? "," : "");
  return n + "'".repeat(Math.max(0, okt - 3));
}
