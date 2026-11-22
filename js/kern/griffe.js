// ✋ Griffbilder (0.26.0, Übe-Bühne): Wie greife ich diesen Ton? Vereinfachte Grundgriffe für Anfänger –
// Streicher in der 1. Lage (Saite + Finger), Flöte und Klarinette (Löcher/Klappen), Blech (Ventile), Posaune (Zug).
// Immer für den NOTIERTEN Ton (so wie er im Notenblatt steht). Feinheiten zeigt die Lehrkraft.

// ---------- Streicher ----------
const SAITEN = {
  v1: { namen: ["G", "D", "A", "E"], toene: [55, 62, 69, 76] }, v2: { namen: ["G", "D", "A", "E"], toene: [55, 62, 69, 76] },
  va: { namen: ["C", "G", "D", "A"], toene: [48, 55, 62, 69] }, vc: { namen: ["C", "G", "D", "A"], toene: [36, 43, 50, 57] },
  kb: { namen: ["E", "A", "D", "G"], toene: [40, 45, 50, 55] }, // notiert (klingt eine Oktave tiefer)
};
// Halbtöne über der leeren Saite → [Finger, Hinweis]
const FINGER = {
  hoch: { 0: [0, "leere Saite"], 1: [1, "tief"], 2: [1, ""], 3: [2, "tief"], 4: [2, "hoch"], 5: [3, ""], 6: [3, "hoch"], 7: [4, ""] },
  cello: { 0: [0, "leere Saite"], 1: [1, "tief (halbe Lage)"], 2: [1, ""], 3: [2, ""], 4: [3, ""], 5: [4, ""], 6: [4, "erweitert"] },
  bass: { 0: [0, "leere Saite"], 1: [1, "halbe Lage"], 2: [1, ""], 3: [2, ""], 4: [4, ""] },
};
function streicher(key, ton) {
  const s = SAITEN[key], f = FINGER[key === "vc" ? "cello" : key === "kb" ? "bass" : "hoch"], max = Math.max(...Object.keys(f).map(Number));
  if (ton < s.toene[0]) return { art: "hinweis", text: "Dieser Ton ist tiefer als die tiefste Saite." };
  let i = s.toene.length - 1;
  while (i > 0 && ton < s.toene[i]) i--;
  const ab = ton - s.toene[i];
  if (ab > max) return { art: "saite", saite: i, finger: null, text: `${s.namen[i]}-Saite, höhere Lage – das zeigt dir deine Lehrkraft.`, lage: true, key };
  const [fi, h] = f[ab];
  return { art: "saite", saite: i, finger: fi, ab, key, text: fi === 0 ? `${s.namen[i]}-Saite, leer (0)` : `${s.namen[i]}-Saite, ${fi}. Finger${h ? " " + h : ""}` };
}

// ---------- Holzbläser (Daumen T, links 1-3 | rechts 1-3; „.“ = offen) ----------
const FLOETE = {
  60: ["T123|123", "C-Rolle (rechter kleiner Finger)"], 61: ["T123|123", "Cis-Rolle (rechter kleiner Finger)"], 62: ["T123|123", ""], 63: ["T123|123", "Es-Klappe"],
  64: ["T123|12.", "Es-Klappe"], 65: ["T123|1..", "Es-Klappe"], 66: ["T123|..3", "Es-Klappe"], 67: ["T123|...", "Es-Klappe"], 68: ["T123|...", "Gis-Klappe + Es-Klappe"],
  69: ["T12.|...", "Es-Klappe"], 70: ["T1..|1..", "Es-Klappe"], 71: ["T1..|...", "Es-Klappe"], 72: [".1..|...", "Es-Klappe"], 73: ["....|...", "Es-Klappe"],
  74: ["T.23|123", ""], 75: ["T.23|123", "Es-Klappe"],
};
for (let m = 76; m <= 85; m++) FLOETE[m] = [FLOETE[m - 12][0], (FLOETE[m - 12][1] ? FLOETE[m - 12][1] + " · " : "") + "überblasen (2. Oktave)"];
const KLARINETTE = {
  52: ["T123|123", "E-Klappe (linker kleiner Finger)"], 53: ["T123|123", "F-Klappe (rechter kleiner Finger)"], 55: ["T123|123", ""], 57: ["T123|12.", ""],
  59: ["T123|1..", ""], 60: ["T123|...", ""], 62: ["T12.|...", ""], 64: ["T1..|...", ""], 65: ["T...|...", ""], 66: [".1..|...", ""], 67: ["....|...", "alles offen"],
  68: ["....|...", "Gis-Klappe (linker Zeigefinger)"], 69: ["....|...", "A-Klappe (linker Zeigefinger)"], 70: ["....|...", "A-Klappe + Registerklappe"],
};
function holz(tab, ton, register = "") {
  const g = tab[ton];
  if (!g) return null;
  const [l, r] = g[0].split("|");
  return { art: "loch", daumen: l[0] === "T", links: [1, 2, 3].map((i) => l[i] !== "."), rechts: [0, 1, 2].map((i) => r[i] !== "."), extra: [g[1], register].filter(Boolean).join(" · ") };
}
function klarinette(ton) {
  if (ton >= 71 && ton <= 84) { const g = holz(KLARINETTE, ton - 19, "Registerklappe (linker Daumen)"); if (g) return { ...g, text: "Clarion-Lage: Griff wie eine Duodezime tiefer + Registerklappe" }; }
  const g = holz(KLARINETTE, ton);
  return g ? { ...g, text: "Grundgriff" } : { art: "hinweis", text: "Sondergriff – den zeigt dir deine Lehrkraft." };
}

// ---------- Blech: Ventile über die Naturtöne (kleinste Ventil-Kombination), Posaune: Zugpositionen ----------
const VENTILE = ["0", "2", "1", "12", "23", "13", "123"]; // erniedrigt um 0 … 6 Halbtöne
const TROMPETE_NATUR = [60, 67, 72, 76, 79, 84]; // notiert: c' g' c'' e'' g'' c''' (7. Naturton ausgelassen)
function ventile(ton) {
  for (let d = 0; d <= 6; d++) if (TROMPETE_NATUR.includes(ton + d)) return { art: "ventil", ventile: VENTILE[d], text: VENTILE[d] === "0" ? "ohne Ventil (0)" : `Ventil ${VENTILE[d].split("").join(" + ")}` };
  return { art: "hinweis", text: "Dieser Ton liegt außerhalb der Grundgriffe." };
}
const POSAUNE_NATUR = [46, 53, 58, 62, 65, 70]; // klingend: B F b d' f' b'
function zug(ton) {
  for (let d = 0; d <= 6; d++) if (POSAUNE_NATUR.includes(ton + d)) return { art: "zug", position: d + 1, text: `${d + 1}. Position${d === 0 ? " (Zug ganz innen)" : d === 6 ? " (Zug ganz außen)" : ""}` };
  return { art: "hinweis", text: "Dieser Ton liegt außerhalb der Grundgriffe." };
}

// Griff für Instrument (Schlüssel aus notensatz.INSTRUMENTE) und notierten Ton (MIDI)
export function griff(key, ton) {
  if (ton == null) return { art: "hinweis", text: "Pause – hier wird nicht gespielt." };
  switch (key) {
    case "v1": case "v2": case "va": case "vc": case "kb": return streicher(key, ton);
    case "fl": { const g = holz(FLOETE, ton); return g ? { ...g, text: "Grundgriff" } : { art: "hinweis", text: "Dieser Ton liegt außerhalb der Grundgriffe." }; }
    case "kl": return klarinette(ton);
    case "tr": case "hr": return ventile(ton); // Horn in F: gleiche Griffe wie Trompete (notiert)
    case "tb": return ventile(ton + 26); // B-Tuba: Griffe wie Trompete, zwei Oktaven + Ganzton tiefer
    case "pos": return zug(ton);
    case "sw": return { art: "hinweis", text: "Pauke: Der Ton wird mit dem Pedal gestimmt – üb den Rhythmus mit 🥁." };
    default: return { art: "hinweis", text: "Für dieses Instrument gibt es noch kein Griffbild – frag deine Lehrkraft." };
  }
}

// ---------- Bilder (SVG, Farben aus dem Thema) ----------
export function griffSvg(g) {
  if (!g || g.art === "hinweis") return "";
  if (g.art === "saite") {
    const s = SAITEN[g.key], n = s.namen.length, x = (i) => 30 + i * 30, yF = (f) => 30 + f * 34;
    const punkt = g.finger > 0 ? `<circle cx="${x(g.saite)}" cy="${yF(g.finger) - 17}" r="11" class="gr-an"/><text x="${x(g.saite)}" y="${yF(g.finger) - 12.5}" text-anchor="middle" class="gr-zahl">${g.finger}</text>` : "";
    const leer = g.finger === 0 ? `<circle cx="${x(g.saite)}" cy="14" r="9" fill="none" class="gr-ring"/><text x="${x(g.saite)}" y="18.5" text-anchor="middle" class="gr-zahl2">0</text>` : "";
    return `<svg viewBox="0 0 ${60 + (n - 1) * 30} 200" class="griff-svg" role="img" aria-label="${g.text}">
      <rect x="18" y="26" width="${24 + (n - 1) * 30}" height="166" rx="6" class="gr-brett"/><rect x="18" y="26" width="${24 + (n - 1) * 30}" height="5" class="gr-sattel"/>
      ${[1, 2, 3, 4].map((f) => `<line x1="18" x2="${42 + (n - 1) * 30}" y1="${yF(f)}" y2="${yF(f)}" class="gr-linie"/>`).join("")}
      ${s.namen.map((nm, i) => `<line x1="${x(i)}" x2="${x(i)}" y1="26" y2="192" class="gr-saite" stroke-width="${2.6 - i * 0.4}"/><text x="${x(i)}" y="199" text-anchor="middle" class="gr-name">${nm}</text>`).join("")}${leer}${punkt}</svg>`;
  }
  if (g.art === "loch") {
    const loch = (cx, cy, zu, r = 9) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${zu ? "gr-zu" : "gr-offen"}"/>`;
    return `<svg viewBox="0 0 120 210" class="griff-svg" role="img" aria-label="Griffbild">
      <rect x="44" y="6" width="32" height="198" rx="12" class="gr-rohr"/>
      <text x="18" y="38" text-anchor="middle" class="gr-name">D</text>${loch(18, 50, g.daumen, 8)}
      ${g.links.map((z, i) => loch(60, 34 + i * 26, z)).join("")}<line x1="48" x2="72" y1="112" y2="112" class="gr-linie"/>
      ${g.rechts.map((z, i) => loch(60, 132 + i * 26, z)).join("")}
      <text x="96" y="64" text-anchor="middle" class="gr-name">links</text><text x="96" y="162" text-anchor="middle" class="gr-name">rechts</text></svg>`;
  }
  if (g.art === "ventil") {
    const an = new Set(g.ventile.split(""));
    return `<svg viewBox="0 0 160 90" class="griff-svg" role="img" aria-label="${g.text}">${[1, 2, 3].map((v) => `<circle cx="${30 + (v - 1) * 50}" cy="40" r="20" class="${an.has(String(v)) ? "gr-zu" : "gr-offen"}"/><text x="${30 + (v - 1) * 50}" y="46" text-anchor="middle" class="${an.has(String(v)) ? "gr-zahl" : "gr-zahl2"}">${v}</text>`).join("")}
      <text x="80" y="84" text-anchor="middle" class="gr-name">gefüllt = drücken</text></svg>`;
  }
  if (g.art === "zug") {
    return `<svg viewBox="0 0 250 80" class="griff-svg" role="img" aria-label="${g.text}"><rect x="10" y="26" width="230" height="12" rx="6" class="gr-brett"/>
      ${[1, 2, 3, 4, 5, 6, 7].map((p) => `<line x1="${20 + (p - 1) * 35}" x2="${20 + (p - 1) * 35}" y1="20" y2="44" class="gr-linie"/><text x="${20 + (p - 1) * 35}" y="62" text-anchor="middle" class="${p === g.position ? "gr-zahl3" : "gr-name"}">${p}</text>`).join("")}
      <circle cx="${20 + (g.position - 1) * 35}" cy="32" r="11" class="gr-an"/><text x="125" y="14" text-anchor="middle" class="gr-name">innen ← Zug → außen</text></svg>`;
  }
  return "";
}
