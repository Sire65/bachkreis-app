// 🏢 Büro-Raum: reine Rechenteile (ohne Bildschirm) – getestet in tests/bueroraum.test.mjs
export const LAMELLEN = 28, SCHRANK_SCHRIFT = "Bachkreis Bergkamen";
export const EXTRA = ["x1", "x2", "x3", "x4"], MAX = EXTRA.length, PLAETZE = ["lampe", "monitor", "kalender", "korb", "drucker", "handy", "kaffee", "fueller", "telefon", "tastatur", "rechner"];
export const FEIN_MAX = 60, FEIN_SCHRITT = 4;
export const fein = (x) => Math.max(-FEIN_MAX, Math.min(FEIN_MAX, Math.round(Number(x) || 0)));
// je Lamelle ein Buchstabe, mittig verteilt; das Logo steht darüber
export function lamellenBuchstaben(text = SCHRANK_SCHRIFT, n = LAMELLEN) {
  const w = [...text], ab = Math.floor((n - w.length) / 2);
  return Array.from({ length: n }, (_, i) => { const z = w[i - ab]; return z && z !== " " ? z : ""; });
}
// gewünschter Platz (wenn frei) > eigener Grundplatz > Zusatzreihe > nächster freier
export function plaetzeRechnen(ids, frei, wunsch) {
  const res = {}, belegt = new Set();
  for (const id of ids) { const w = wunsch[id]; if (w && frei.includes(w) && !belegt.has(w)) { res[id] = w; belegt.add(w); } }
  for (const id of ids) if (!res[id]) { const w = [id, ...EXTRA, ...frei].find((a) => frei.includes(a) && !belegt.has(a)); if (w) { res[id] = w; belegt.add(w); } }
  return res;
}
export function einrichtungPruefen(w, katalogIds = []) {
  const o = w && typeof w === "object" ? w : {}, versatz = {};
  if (o.versatz && typeof o.versatz === "object") for (const [k, p] of Object.entries(o.versatz).slice(0, 30)) if (/^[a-z0-9]{1,12}$/.test(k) && Array.isArray(p)) { const v = [fein(p[0]), fein(p[1])]; if (v[0] || v[1]) versatz[k] = v; }
  const plaetze = {}; if (o.plaetze && typeof o.plaetze === "object") for (const [k, p] of Object.entries(o.plaetze)) if (/^[a-z0-9]{1,12}$/.test(k) && [...PLAETZE, ...EXTRA].includes(p)) plaetze[k] = p;
  return { plaetze, versatz, dinge: Array.isArray(o.dinge) ? [...new Set(o.dinge)].filter((d) => katalogIds.includes(d)).slice(0, MAX) : [] };
}
// ---------- 🧮 Rechner (ohne eval: Punkt vor Strich, Klammern nicht nötig) ----------
export function rechne(ausdruck) {
  const t = String(ausdruck).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^-?\d*\.?\d+([+\-*/]-?\d*\.?\d+)*$/.test(t)) return null;
  const teile = t.match(/(^-?|(?<=[+\-*/])-?)\d*\.?\d+|[+\-*/]/g);
  const zahlen = [], ops = [];
  for (const x of teile) if (/^[+\-*/]$/.test(x)) ops.push(x); else zahlen.push(Number(x));
  // erst * und /
  const z = [zahlen[0]], o = [];
  ops.forEach((op, i) => { const b = zahlen[i + 1]; if (op === "*") z[z.length - 1] *= b; else if (op === "/") z[z.length - 1] /= b; else { o.push(op); z.push(b); } });
  const r = o.reduce((a, op, i) => (op === "+" ? a + z[i + 1] : a - z[i + 1]), z[0]);
  return Number.isFinite(r) ? Math.round(r * 1e10) / 1e10 : null;
}
