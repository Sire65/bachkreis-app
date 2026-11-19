// 🔍 Suche über die ganze App (0.39.0, wie KC-CLUB-SUCHE-UNSCHARF / Lupe): findet auch bei Tippfehlern und Wortanfängen.
// „Würdemann“ findet Wördemann, „Wilfried“ findet Willfried, „Brand“ findet Brandenburgisches Konzert. Reine Funktionen (getestet).
export const norm = (s) => String(s || "").toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// Abstand (Levenshtein) mit Abbruch über `max`
export function abstand(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let vor = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i]; let min = i;
    for (let j = 1; j <= b.length; j++) { jetzt[j] = Math.min(vor[j] + 1, jetzt[j - 1] + 1, vor[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); min = Math.min(min, jetzt[j]); }
    if (min > max) return max + 1; vor = jetzt;
  }
  return vor[b.length];
}
// Wie gut passt ein Suchwort zu einem Text? 0 = gar nicht. Jedes Suchwort muss passen.
export function trefferWert(q, text) {
  const qs = norm(q).split(" ").filter(Boolean), t = norm(text), ws = t.split(" ").filter(Boolean);
  if (!qs.length || !ws.length) return 0;
  let summe = 0;
  for (const w of qs) {
    let best = 0;
    for (const x of ws) {
      if (x === w) best = Math.max(best, 5);
      else if (x.startsWith(w)) best = Math.max(best, 4);
      else if (w.length >= 3 && x.includes(w)) best = Math.max(best, 2);
      else if (w.length >= 4) { const d = abstand(w, x.slice(0, Math.max(w.length, Math.min(x.length, w.length + 1))), w.length >= 7 ? 2 : 1); if (d <= (w.length >= 7 ? 2 : 1)) best = Math.max(best, 1.5); }
    }
    if (!best) return 0; summe += best;
  }
  return summe + (t.startsWith(norm(q)) ? 2 : 0);
}
// Einträge { t, u?, extra? } → sortierte Treffer (höchstens `max`)
export function suchen(q, eintraege, max = 8) {
  if (norm(q).length < 2) return [];
  return eintraege.map((e) => ({ e, w: Math.max(trefferWert(q, e.t) * 1.5, trefferWert(q, `${e.t} ${e.u || ""} ${e.extra || ""}`)) })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w).slice(0, max).map((x) => x.e);
}
