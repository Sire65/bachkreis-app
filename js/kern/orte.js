// 🗺️ Auftrittsorte (0.36.0, Wunsch Frau Jacka „Chronik, wo wir seit der Gründung überall gespielt haben“)
// Ortsverzeichnis (Stadt → Land, Breite, Länge) ohne Netz-Abfrage, Länder mit Flagge/Kontinent und die Auftrittsorte laut Schul-Website.
// Koordinaten: gerundete Stadtmitte (reicht für die Weltkarte). Eigene Orte: Feld „koordinaten“ („51.62, 7.64“) im Chronik-Eintrag.

export const LAENDER = {
  DE: ["Deutschland", "Europa"], PL: ["Polen", "Europa"], FR: ["Frankreich", "Europa"], GB: ["Großbritannien", "Europa"], NO: ["Norwegen", "Europa"],
  PT: ["Portugal", "Europa"], IT: ["Italien", "Europa"], AT: ["Österreich", "Europa"], HU: ["Ungarn", "Europa"], RU: ["Russland", "Europa"],
  NL: ["Niederlande", "Europa"], BE: ["Belgien", "Europa"], CH: ["Schweiz", "Europa"], ES: ["Spanien", "Europa"], DK: ["Dänemark", "Europa"], CZ: ["Tschechien", "Europa"],
  TR: ["Türkei", "Asien"], IL: ["Israel", "Asien"], CN: ["China", "Asien"], MY: ["Malaysia", "Asien"], SG: ["Singapur", "Asien"], JP: ["Japan", "Asien"],
  US: ["USA", "Nordamerika"], CA: ["Kanada", "Nordamerika"], CO: ["Kolumbien", "Südamerika"], PY: ["Paraguay", "Südamerika"], PE: ["Peru", "Südamerika"], BR: ["Brasilien", "Südamerika"],
  ZA: ["Südafrika", "Afrika"], AU: ["Australien", "Ozeanien"],
};
export const flagge = (code) => (/^[A-Z]{2}$/.test(code || "") ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌍");
export const landName = (code) => LAENDER[code]?.[0] || code || "?";

// Stadt → [Land, Breite, Länge]
export const ORTE = {
  Bergkamen: ["DE", 51.62, 7.64], Kamen: ["DE", 51.59, 7.66], "Lünen": ["DE", 51.62, 7.53], Unna: ["DE", 51.54, 7.69], Hamm: ["DE", 51.68, 7.82], Hagen: ["DE", 51.36, 7.47],
  "München": ["DE", 48.14, 11.58], Bielefeld: ["DE", 52.02, 8.53], Dortmund: ["DE", 51.51, 7.47], "Bad Oeynhausen": ["DE", 52.2, 8.8], Hannover: ["DE", 52.37, 9.73],
  "Lüneburg": ["DE", 53.25, 10.41], Dresden: ["DE", 51.05, 13.74], Hattingen: ["DE", 51.4, 7.19], "Münster": ["DE", 51.96, 7.63], Westerstede: ["DE", 53.26, 7.93], Emden: ["DE", 53.37, 7.21],
  Berlin: ["DE", 52.52, 13.4], Hamburg: ["DE", 53.55, 9.99], "Köln": ["DE", 50.94, 6.96], "Düsseldorf": ["DE", 51.23, 6.78], Essen: ["DE", 51.46, 7.01], Bochum: ["DE", 51.48, 7.22],
  Gelsenkirchen: ["DE", 51.51, 7.1], Recklinghausen: ["DE", 51.61, 7.2], Werne: ["DE", 51.66, 7.63], Selm: ["DE", 51.69, 7.48], Holzwickede: ["DE", 51.5, 7.62], Schwerte: ["DE", 51.44, 7.57],
  Iserlohn: ["DE", 51.38, 7.7], Soest: ["DE", 51.57, 8.11], Lippstadt: ["DE", 51.67, 8.35], Paderborn: ["DE", 51.72, 8.75], Bonn: ["DE", 50.74, 7.1], "Frankfurt am Main": ["DE", 50.11, 8.68],
  Stuttgart: ["DE", 48.78, 9.18], Leipzig: ["DE", 51.34, 12.37], Wuppertal: ["DE", 51.26, 7.15], Bremen: ["DE", 53.08, 8.8], "Nürnberg": ["DE", 49.45, 11.08], Weimar: ["DE", 50.98, 11.33],
  Krakau: ["PL", 50.06, 19.94], Wieliczka: ["PL", 49.99, 20.06], "Nowy Sącz": ["PL", 49.62, 20.69], Warschau: ["PL", 52.23, 21.01],
  Bordeaux: ["FR", 44.84, -0.58], "Besançon": ["FR", 47.24, 6.02], Paris: ["FR", 48.86, 2.35],
  "New Ulm": ["US", 44.31, -94.46], Minneapolis: ["US", 44.98, -93.27], Madison: ["US", 43.07, -89.4],
  "Be’er Sheva": ["IL", 31.25, 34.79], Akko: ["IL", 32.93, 35.08], Jerusalem: ["IL", 31.77, 35.21],
  Cali: ["CO", 3.45, -76.53], Cartagena: ["CO", 10.39, -75.48], "Bogotá": ["CO", 4.71, -74.07], Barranquilla: ["CO", 10.96, -74.8], "Medellín": ["CO", 6.24, -75.58],
  Moskau: ["RU", 55.76, 37.62], Dewsbury: ["GB", 53.69, -1.63], Huddersfield: ["GB", 53.65, -1.78], Leicester: ["GB", 52.64, -1.13], London: ["GB", 51.51, -0.13],
  Kongsberg: ["NO", 59.67, 9.65], Oslo: ["NO", 59.91, 10.75], Fagernes: ["NO", 60.99, 9.23], Porto: ["PT", 41.15, -8.61], Lissabon: ["PT", 38.72, -9.14],
  Biella: ["IT", 45.57, 8.05], Rom: ["IT", 41.9, 12.5], Shanghai: ["CN", 31.23, 121.47], "Xi’an": ["CN", 34.34, 108.94], Peking: ["CN", 39.9, 116.4], Linz: ["AT", 48.31, 14.29], Wien: ["AT", 48.21, 16.37],
  Budapest: ["HU", 47.5, 19.04], Ankara: ["TR", 39.93, 32.86], Istanbul: ["TR", 41.01, 28.98], "Kuala Lumpur": ["MY", 3.14, 101.69], Singapur: ["SG", 1.35, 103.82], "Asunción": ["PY", -25.26, -57.58], Lima: ["PE", -12.05, -77.04],
};
// Schreibweisen, die oft vorkommen
const ANDERS = { "beer sheva": "Be’er Sheva", "beersheba": "Be’er Sheva", "xian": "Xi’an", "xi'an": "Xi’an", "beijing": "Peking", "krakow": "Krakau", "kraków": "Krakau", "moscow": "Moskau", "lisboa": "Lissabon", "frankfurt": "Frankfurt am Main", "munich": "München", "bogota": "Bogotá", "medellin": "Medellín", "besancon": "Besançon", "nowy sacz": "Nowy Sącz" };
const klein = (s) => String(s || "").trim().toLowerCase().replace(/[’`]/g, "'");
const NAMEN = Object.keys(ORTE).sort((a, b) => b.length - a.length);
const wortIn = (t, w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(t);
export function stadtFinden(text) {
  const t = klein(text); if (!t) return null;
  if (ANDERS[t]) return ANDERS[t];
  const genau = NAMEN.find((n) => klein(n) === t); if (genau) return genau;
  // im Freitext („Olympiahalle München“, „Linz (Kulturhauptstadt 2009)“) – nur ganze Wörter
  const n = NAMEN.find((x) => wortIn(t, klein(x))); if (n) return n;
  const a = Object.keys(ANDERS).find((x) => wortIn(t, x)); return a ? ANDERS[a] : null;
}
export function koordinatenLesen(s) {
  const m = String(s || "").replace(/\s+/g, " ").match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[;, ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if (!m) return null; const b = Number(m[1].replace(",", ".")), l = Number(m[2].replace(",", "."));
  return b >= -90 && b <= 90 && l >= -180 && l <= 180 ? [b, l] : null;
}
// Ort eines Chronik-Eintrags: eigene Koordinaten > Stadt > Stadtname im Feld „Ort“. null = nicht auf der Karte.
export function ortVon(c) {
  const stadt = stadtFinden(c.stadt) || (c.stadt ? null : stadtFinden(c.ort)), eigen = koordinatenLesen(c.koordinaten), g = stadt ? ORTE[stadt] : null;
  const land = c.land || g?.[0] || null;
  if (eigen) return { stadt: c.stadt || stadt || c.ort || "?", land, breite: eigen[0], laenge: eigen[1] };
  if (g) return { stadt: c.stadt || stadt, land, breite: g[1], laenge: g[2] };
  return null;
}
// Plattkarte wie bilder/weltkarte.json (tools/weltkarte.py): x = (Länge + 180) * k, y = (nord − Breite) * k
export const projektion = (breite, laenge, k = 4, nord = 85) => [Math.round((laenge + 180) * k * 10) / 10, Math.round((nord - breite) * k * 10) / 10];

// Orte gruppieren: je Stadt ein Punkt mit allen Einträgen
export function orteSammeln(chronik) {
  const m = new Map();
  for (const c of chronik) {
    const o = ortVon(c); if (!o) continue;
    const key = `${o.land}|${o.stadt}`;
    if (!m.has(key)) m.set(key, { ...o, eintraege: [] });
    m.get(key).eintraege.push(c);
  }
  const orte = [...m.values()].map((o) => ({ ...o, jahre: [...new Set(o.eintraege.map((c) => c.jahr).filter(Boolean))].sort((a, b) => a - b) }));
  const laender = [...new Set(orte.map((o) => o.land).filter(Boolean))], kontinente = [...new Set(laender.map((l) => LAENDER[l]?.[1]).filter(Boolean))];
  return { orte, laender, kontinente };
}

// 📥 Auftrittsorte laut Internetseite des Gymnasiums (gymnasium-bergkamen.de/bachkreis) – feste ids, damit die Übernahme nichts doppelt anlegt.
// Jahr nur, wo die Seite es nennt.
export const WEBSITE_QUELLE = "Schul-Website (Bachkreis)";
const w = (id, titel, stadt, ort, art = "konzert", jahr = null) => ({ id: `ch-web-${id}`, jahr, titel, art, stadt, land: ORTE[stadt][0], ort, quelle: WEBSITE_QUELLE });
export const CHRONIK_WEBSITE = [
  w("kamen", "Konzert in der Konzertaula", "Kamen", "Konzertaula Kamen"), w("luenen", "Konzert im Hansesaal", "Lünen", "Hansesaal"), w("unna", "Konzert in der Stadthalle", "Unna", "Stadthalle Unna"),
  w("hamm", "Konzert in Hamm", "Hamm", ""), w("hagen", "Konzert in Hagen", "Hagen", ""), w("bielefeld", "Konzert in der Rudolf-Oetker-Halle", "Bielefeld", "Rudolf-Oetker-Halle"),
  w("dortmund", "Konzert im Westfalenpark", "Dortmund", "Westfalenpark"), w("oeynhausen", "Konzert im Kurpark", "Bad Oeynhausen", "Stadtpark / Kurpark"),
  w("lueneburg", "Kirchenkonzert", "Lüneburg", "Kirche"), w("dresden", "Kirchenkonzert", "Dresden", "Kirche"), w("muenster", "Bundesbegegnung „Schulen musizieren“", "Münster", ""),
  w("westerstede", "Austausch", "Westerstede", "", "austausch"), w("emden", "Austausch", "Emden", "", "austausch"),
  w("krakau", "Konzert in der Philharmonie", "Krakau", "Philharmonie", "reise"), w("wieliczka", "Kirchenkonzert", "Wieliczka", "Kirche", "reise"), w("nowysacz", "Kirchenkonzert", "Nowy Sącz", "Kirche", "reise"),
  w("bordeaux", "Konzert im Stadttheater", "Bordeaux", "Grand Théâtre (Stadttheater)", "reise"), w("besancon", "Konzert in Besançon", "Besançon", "", "reise"),
  w("newulm", "Konzert in New Ulm", "New Ulm", "", "reise"), w("minneapolis", "Konzert an der Universität", "Minneapolis", "Universität", "reise"), w("madison", "Konzert an der Universität", "Madison", "Universität", "reise"),
  w("beersheva", "Konzert in Be’er Sheva", "Be’er Sheva", "", "reise"), w("akko", "Konzert in Akko", "Akko", "", "reise"),
  w("cali", "Konzert in Cali", "Cali", "", "reise"), w("cartagena", "Konzert in Cartagena", "Cartagena", "", "reise"), w("bogota", "Konzerte in Bogotá", "Bogotá", "u. a. Deutsche Schule", "reise"),
  w("barranquilla", "Konzert an der Deutschen Schule", "Barranquilla", "Deutsche Schule", "reise"), w("medellin", "Konzert an der Deutschen Schule", "Medellín", "Deutsche Schule", "reise"),
  w("moskau", "Konzerte in Moskau", "Moskau", "Tabakov-Musikschule · Deutsche Schule", "reise"),
  w("dewsbury", "Konzert in der Stadthalle", "Dewsbury", "Town Hall", "reise"), w("huddersfield", "Konzert in der Stadthalle", "Huddersfield", "Town Hall", "reise"), w("leicester", "Kirchenkonzert", "Leicester", "Kirche", "reise"),
  w("kongsberg", "Kirchenkonzert", "Kongsberg", "Kirche", "reise"), w("oslo", "Konzert an der Deutschen Schule", "Oslo", "Deutsche Schule", "reise"), w("fagernes", "Konzert in Fagernes", "Fagernes", "", "reise"),
  w("porto", "Konzert an der Deutschen Schule", "Porto", "Deutsche Schule", "reise"), w("lissabon", "Konzert an der Deutschen Schule", "Lissabon", "Deutsche Schule", "reise"),
  w("biella", "Kirchenkonzert", "Biella", "Kirche", "reise"),
  w("shanghai", "Konzert in Shanghai", "Shanghai", "", "reise"), w("xian", "Konzert in Xi’an", "Xi’an", "", "reise"), w("peking", "Konzert in Peking", "Peking", "", "reise"),
  // Austausch-Länder ohne genannte Stadt: Punkt in der Hauptstadt, im Text so benannt
  w("ungarn", "Austausch (Ort auf der Website nicht genannt)", "Budapest", "", "austausch"), w("tuerkei", "Austausch (Ort auf der Website nicht genannt)", "Ankara", "", "austausch"),
  w("malaysia", "Austausch (Ort auf der Website nicht genannt)", "Kuala Lumpur", "", "austausch"), w("singapur", "Austausch", "Singapur", "", "austausch"),
  w("paraguay", "Austausch (Ort auf der Website nicht genannt)", "Asunción", "", "austausch"), w("peru", "Austausch (Ort auf der Website nicht genannt)", "Lima", "", "austausch"),
];
// Übernahme: nur fehlende ids anlegen (nichts überschreiben, nichts doppelt)
export const websiteFehlend = (vorhanden) => { const ids = new Set(vorhanden.map((c) => c.id)); return CHRONIK_WEBSITE.filter((c) => !ids.has(c.id)); };
