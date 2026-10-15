// Fiktive Demodaten für die Vorführversion. Alle Schüler-, Eltern- und Spendernamen sind ERFUNDEN.
// Die Daten werden relativ zum heutigen Tag erzeugt, damit die Vorführung immer „aktuell“ wirkt.
// Deterministisch (fester Zufallsstartwert) – jede Vorführung sieht gleich aus.

function zufall(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VORNAMEN_M = ["Ben", "Paul", "Leon", "Finn", "Jonas", "Elias", "Noah", "Luis", "Felix", "Henry", "Emil", "Theo", "Anton", "Jakob", "Moritz", "Niklas", "David", "Samuel", "Julian", "Tim", "Max", "Ole", "Matteo", "Linus", "Erik"];
const VORNAMEN_W = ["Emma", "Mia", "Hanna", "Lea", "Sophie", "Lina", "Marie", "Clara", "Ella", "Lena", "Amelie", "Johanna", "Frieda", "Ida", "Paula", "Greta", "Luisa", "Mila", "Nele", "Anna", "Charlotte", "Lotta", "Emilia", "Romy", "Pia"];
const ELTERN_V = ["Andrea", "Stefan", "Sabine", "Thomas", "Claudia", "Markus", "Nicole", "Frank", "Katrin", "Jens", "Silke", "Dirk", "Anja", "Oliver", "Tanja", "Sven", "Julia", "Christian", "Melanie", "Michael"];
const NACHNAMEN = ["Becker", "Hoffmann", "Schäfer", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner", "Krause", "Meier", "Lehmann", "Huber", "Kaiser", "Fuchs", "Peters", "Scholz", "Möller", "Weiß", "Jung", "Hahn", "Vogel", "Friedrich", "Keller", "Günther", "Frank", "Berger", "Winkler", "Roth", "Beck", "Lorenz", "Baumann", "Franke", "Albrecht", "Schuster", "Simon", "Ludwig", "Böhm", "Winter", "Kraus", "Martin", "Schumacher"];
const STRASSEN = ["Am Römerberg", "Hubert-Biernat-Straße", "Präsidentenstraße", "Landwehrstraße", "Erich-Ollenhauer-Straße", "Jahnstraße", "Lessingstraße", "Rünther Straße", "Werner Straße", "Ebertstraße", "Schulstraße", "Kanalstraße"];
const ORTE = [["59192", "Bergkamen"], ["59192", "Bergkamen-Oberaden"], ["59192", "Bergkamen-Weddinghofen"], ["59174", "Kamen"], ["59368", "Werne"]];

const REGISTER = [
  ["r-v1", "Violine 1", "Vl 1", "streicher"], ["r-v2", "Violine 2", "Vl 2", "streicher"], ["r-va", "Viola", "Va", "streicher"],
  ["r-vc", "Violoncello", "Vc", "streicher"], ["r-kb", "Kontrabass", "Kb", "streicher"], ["r-fl", "Flöte", "Fl", "holz"],
  ["r-ob", "Oboe", "Ob", "holz"], ["r-kl", "Klarinette", "Kl", "holz"], ["r-fg", "Fagott", "Fg", "holz"], ["r-hr", "Horn", "Hr", "blech"],
  ["r-tr", "Trompete", "Tr", "blech"], ["r-pos", "Posaune", "Pos", "blech"], ["r-tb", "Tuba", "Tb", "blech"], ["r-sw", "Schlagwerk", "Schlw", "schlag"],
  ["r-hk", "Harfe / Klavier", "Hf/Kl", "tasten"],
];
const TYPEN = [
  ["t-vl", "Violine", "r-v1", 12], ["t-va", "Viola", "r-va", 12], ["t-vc", "Violoncello", "r-vc", 12], ["t-kb", "Kontrabass", "r-kb", 12],
  ["t-fl", "Querflöte", "r-fl", 24], ["t-ob", "Oboe", "r-ob", 12], ["t-kl", "Klarinette", "r-kl", 24], ["t-fg", "Fagott", "r-fg", 12],
  ["t-hr", "Waldhorn", "r-hr", 24], ["t-tr", "Trompete", "r-tr", 24], ["t-pos", "Posaune", "r-pos", 24], ["t-tb", "Tuba", "r-tb", 24],
  ["t-pk", "Pauken", "r-sw", 36], ["t-sw", "Kleines Schlagwerk", "r-sw", 36], ["t-kla", "Klavier / E-Piano", "r-hk", 12], ["t-pic", "Piccoloflöte", "r-fl", 24],
];
// Besetzungsverteilung je Orchester (Register → Anzahl)
const BES_A = { "r-v1": 8, "r-v2": 7, "r-va": 4, "r-vc": 6, "r-kb": 2, "r-fl": 3, "r-ob": 2, "r-kl": 3, "r-fg": 2, "r-hr": 3, "r-tr": 3, "r-pos": 2, "r-tb": 1, "r-sw": 3, "r-hk": 1 };
const BES_B = { "r-v1": 8, "r-v2": 8, "r-va": 3, "r-vc": 6, "r-kb": 1, "r-fl": 4, "r-ob": 1, "r-kl": 4, "r-fg": 1, "r-hr": 2, "r-tr": 3, "r-pos": 2, "r-tb": 1, "r-sw": 2, "r-hk": 1 };
const BES_C = { "r-v1": 3, "r-v2": 3, "r-va": 1, "r-vc": 3, "r-fl": 2, "r-kl": 2 };
const BES_D = { "r-v1": 2, "r-va": 1, "r-vc": 2, "r-fl": 1, "r-hr": 1, "r-tr": 1 };
const SOLL_A = { "r-v1": 7, "r-v2": 6, "r-va": 3, "r-vc": 5, "r-kb": 2, "r-fl": 2, "r-ob": 2, "r-kl": 2, "r-fg": 2, "r-hr": 3, "r-tr": 2, "r-pos": 2, "r-tb": 1, "r-sw": 2 };
const SOLL_B = { "r-v1": 6, "r-v2": 6, "r-va": 2, "r-vc": 4, "r-kb": 1, "r-fl": 3, "r-kl": 3, "r-hr": 2, "r-tr": 2, "r-pos": 1, "r-sw": 1 };
const TYP_VON_REGISTER = { "r-v1": "t-vl", "r-v2": "t-vl", "r-va": "t-va", "r-vc": "t-vc", "r-kb": "t-kb", "r-fl": "t-fl", "r-ob": "t-ob", "r-kl": "t-kl", "r-fg": "t-fg", "r-hr": "t-hr", "r-tr": "t-tr", "r-pos": "t-pos", "r-tb": "t-tb", "r-sw": "t-sw", "r-hk": "t-kla" };

const tag = (basis, plusTage, h = 0, m = 0) => { const d = new Date(basis); d.setDate(d.getDate() + plusTage); d.setHours(h, m, 0, 0); return d; };
const iso = (d) => d.toISOString();
const isoTag = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const naechsterWochentag = (basis, wt) => { const d = new Date(basis); d.setHours(0, 0, 0, 0); while (d.getDay() !== wt) d.setDate(d.getDate() + 1); return d; };

export function erzeugeDemodaten(heute = new Date()) {
  const r = zufall(1969);
  const wahl = (a) => a[Math.floor(r() * a.length)];
  const jetzt = new Date(heute);
  const d = {};
  let pn = 0;
  const pid = () => `p-${String(++pn).padStart(3, "0")}`;
  const adresse = () => { const [plz, ort] = wahl(ORTE); return { strasse: `${wahl(STRASSEN)} ${1 + Math.floor(r() * 80)}`, plz, ort }; };
  const handy = () => `0151 ${String(1000000 + Math.floor(r() * 8999999))}`;

  d.register = REGISTER.map(([id, name, kurz, familie], i) => ({ id, name, kurz, familie, sort: i + 1 }));
  d.instrument_typen = TYPEN.map(([id, name, register_id, wartung_monate]) => ({ id, name, register_id, wartung_monate }));
  d.gruppen = [
    { id: "g-a", kuerzel: "A", name: "A-Orchester", beschreibung: "Jahrgänge 9–12", farbe: "#1f5f99", sort: 1, aktiv: true },
    { id: "g-b", kuerzel: "B", name: "B-Orchester", beschreibung: "Jahrgänge 5–9", farbe: "#c98a00", sort: 2, aktiv: true },
    { id: "g-c", kuerzel: "C", name: "Orchesterklasse / AGs", beschreibung: "Erprobungsstufe mit Musikschule (Beispiel)", farbe: "#2e7d4f", sort: 3, aktiv: true },
    { id: "g-d", kuerzel: "D", name: "Ehemalige", beschreibung: "Ehemaligenorchester (Beispiel)", farbe: "#7b3fa0", sort: 4, aktiv: true },
  ];
  d.terminarten = [
    { id: "ta-probe", name: "Probe", sym: "🎻", farbe: "#1f5f99", pflicht: true, sort: 1 },
    { id: "ta-register", name: "Registerprobe", sym: "🎼", farbe: "#0e7c86", pflicht: false, sort: 2 },
    { id: "ta-gp", name: "Generalprobe", sym: "🎯", farbe: "#c0392b", pflicht: true, sort: 3 },
    { id: "ta-konzert", name: "Konzert / Auftritt", sym: "🎭", farbe: "#b8860b", pflicht: true, sort: 4 },
    { id: "ta-freizeit", name: "Probenfreizeit", sym: "🏕️", farbe: "#2e7d4f", pflicht: false, sort: 5 },
    { id: "ta-austausch", name: "Austausch / Reise", sym: "🚌", farbe: "#7b3fa0", pflicht: false, sort: 6 },
    { id: "ta-fest", name: "Fördervereinsfest", sym: "🎉", farbe: "#d35400", pflicht: false, sort: 7 },
    { id: "ta-sonst", name: "Sonstiges", sym: "📌", farbe: "#6b5c57", pflicht: false, sort: 8 },
  ];

  // --- Personen ---
  d.personen = []; d.eltern_kind = []; d.gruppe_zuordnung = []; d.person_instrument = []; d.zugaenge = [];
  const schuljahrStart = isoTag(new Date(jetzt.getFullYear() - (jetzt.getMonth() < 7 ? 1 : 0), 7, 15));
  const leitung = { id: "p-leitung", vorname: "Bettina", nachname: "Jacka", typ: "leitung", status: "aktiv", email: "leitung@beispiel.invalid", mobil: "0151 0000001", rollen: ["leitung", "admin"], kontakt_ok: true, foto_ok: true };
  d.personen.push(leitung);
  const lehrkraefte = [
    { id: "p-lk1", vorname: "Martin", nachname: "Sommer", typ: "lehrkraft", rollen: ["lehrkraft", "notenwart"] },
    { id: "p-lk2", vorname: "Judith", nachname: "Engel", typ: "lehrkraft", rollen: ["lehrkraft"] },
    { id: "p-lk3", vorname: "Rainer", nachname: "Blum", typ: "lehrkraft", rollen: ["lehrkraft", "instrumentenwart"] },
  ];
  const vorstand = [
    { id: "p-fv1", vorname: "Karin", nachname: "Lindner", typ: "foerderverein", rollen: ["vorstand"], firma: "Vorsitz (Beispiel)" },
    { id: "p-fv2", vorname: "Holger", nachname: "Brandt", typ: "foerderverein", rollen: ["vorstand"], firma: "Schatzmeister (Beispiel)" },
    { id: "p-fv3", vorname: "Ute", nachname: "Kessler", typ: "foerderverein", rollen: ["vorstand"], firma: "Schriftführung (Beispiel)" },
  ];
  for (const p of [...lehrkraefte, ...vorstand]) d.personen.push({ ...p, status: "aktiv", email: `${p.vorname.toLowerCase()}.${p.nachname.toLowerCase()}@beispiel.invalid`, mobil: handy(), ...adresse(), kontakt_ok: true, foto_ok: true });

  const elternListe = [];
  function eltern(nachname, kind) {
    if (elternListe.length > 6 && r() < 0.08) { // Geschwisterkinder: gleiche Eltern
      const e = wahl(elternListe);
      d.eltern_kind.push({ id: `ek-${d.eltern_kind.length + 1}`, eltern_id: e.id, kind_id: kind.id, beziehung: e.beziehung, hauptkontakt: true });
      kind.nachname = e.nachname; Object.assign(kind, { strasse: e.strasse, plz: e.plz, ort: e.ort });
      return;
    }
    const zwei = r() < 0.45;
    const adr = { strasse: kind.strasse, plz: kind.plz, ort: kind.ort };
    for (let i = 0; i < (zwei ? 2 : 1); i++) {
      const vn = wahl(ELTERN_V);
      const e = { id: pid(), vorname: vn, nachname, typ: "eltern", status: "aktiv", email: `${vn.toLowerCase()}.${nachname.toLowerCase().replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c])}@beispiel.invalid`, mobil: handy(), ...adr, rollen: ["eltern"], kontakt_ok: true, beziehung: i === 0 ? "mutter" : "vater" };
      d.personen.push(e); elternListe.push(e);
      d.eltern_kind.push({ id: `ek-${d.eltern_kind.length + 1}`, eltern_id: e.id, kind_id: kind.id, beziehung: e.beziehung, hauptkontakt: i === 0 });
    }
  }
  function schueler(gruppe, bes, jgVon, jgBis, typ = "schueler") {
    for (const [reg, n] of Object.entries(bes)) {
      for (let i = 0; i < n; i++) {
        const w = r() < 0.55;
        const vorname = wahl(w ? VORNAMEN_W : VORNAMEN_M);
        const nachname = wahl(NACHNAMEN);
        const jg = jgVon + Math.floor(r() * (jgBis - jgVon + 1));
        const alter = jg + 5;
        const s = { id: pid(), vorname, nachname, typ, status: "aktiv", jahrgang: typ === "schueler" ? jg : null, schule: typ === "schueler" ? (r() < 0.85 ? "Städt. Gymnasium Bergkamen" : wahl(["Realschule Oberaden", "Willy-Brandt-Gesamtschule", "Gymnasium Kamen"])) : null,
          geburtsdatum: typ === "schueler" ? isoTag(new Date(jetzt.getFullYear() - alter, Math.floor(r() * 12), 1 + Math.floor(r() * 27))) : null,
          ...adresse(), mobil: (typ === "ehemalig" || jg >= 8) && r() < 0.8 ? handy() : "", email: typ === "ehemalig" ? `${vorname.toLowerCase()}.${nachname.toLowerCase()}@beispiel.invalid` : "",
          rollen: typ === "schueler" ? ["schueler"] : [], kontakt_ok: true, foto_ok: r() < 0.85,
          notfall_info: typ === "schueler" && r() < 0.12 ? wahl(["Allergie: Nüsse", "Asthma-Spray im Rucksack", "Laktoseintoleranz", "Heuschnupfen"]) : "" };
        d.personen.push(s);
        if (typ === "schueler") eltern(nachname, s);
        d.gruppe_zuordnung.push({ id: `gz-${d.gruppe_zuordnung.length + 1}`, person_id: s.id, gruppe_id: gruppe, art: "stamm", von: schuljahrStart, bis: null, grund: "Schuljahr" });
        d.person_instrument.push({ id: `pi-${d.person_instrument.length + 1}`, person_id: s.id, typ_id: TYP_VON_REGISTER[reg], register_id: reg, haupt: true, eigenes: r() < 0.7 });
        if (r() < 0.12) { // Mehrfach-Instrumentalisten
          const zweit = reg === "r-v1" || reg === "r-v2" ? ["t-va", "r-va"] : reg === "r-fl" ? ["t-pic", "r-fl"] : reg === "r-sw" ? ["t-pk", "r-sw"] : ["t-kla", "r-hk"];
          d.person_instrument.push({ id: `pi-${d.person_instrument.length + 1}`, person_id: s.id, typ_id: zweit[0], register_id: zweit[1], haupt: false, eigenes: r() < 0.5, niveau: "Zweitinstrument" });
        }
        if (typ === "schueler" && reg === "r-v1" && i === 0) s.rollen.push("registerfuehrer");
      }
    }
  }
  schueler("g-a", BES_A, 9, 12);
  schueler("g-b", BES_B, 5, 9);
  schueler("g-c", BES_C, 5, 6);
  schueler("g-d", BES_D, 0, 0, "ehemalig");

  // Fester Demo-Schüler und Demo-Eltern für den Rollenumschalter
  const demoSchueler = d.personen.find((p) => p.typ === "schueler" && d.gruppe_zuordnung.find((g) => g.person_id === p.id && g.gruppe_id === "g-a") && d.person_instrument.find((x) => x.person_id === p.id && x.register_id === "r-vc"));
  const demoKindB = d.personen.find((p) => p.typ === "schueler" && d.gruppe_zuordnung.find((g) => g.person_id === p.id && g.gruppe_id === "g-b") && d.person_instrument.find((x) => x.person_id === p.id && x.register_id === "r-fl"));
  const demoEltern = d.personen.find((p) => p.id === d.eltern_kind.find((e) => e.kind_id === demoKindB.id)?.eltern_id);

  // Temporärer Gruppenwechsel (B-Schüler hilft im A-Orchester beim Konzert aus) + genereller Wechsel (B → A)
  const bGeiger = d.personen.filter((p) => d.gruppe_zuordnung.find((g) => g.person_id === p.id && g.gruppe_id === "g-b") && d.person_instrument.find((x) => x.person_id === p.id && x.register_id === "r-v2"))[1];

  // Partner, Dienstleister, Spender (fiktiv bzw. öffentliche Partnerschaften als Beispiel)
  const extern = [
    { id: "p-x1", vorname: "Sekretariat", nachname: "Gymnasium", typ: "partner", firma: "Städt. Gymnasium Bergkamen (Beispielkontakt)" },
    { id: "p-x2", vorname: "Büro", nachname: "Musikschule", typ: "partner", firma: "Musikschule Bergkamen (Beispielkontakt)" },
    { id: "p-x3", vorname: "Kontakt", nachname: "Austauschschule", typ: "partner", firma: "Partnerschule Emden (Beispielkontakt)" },
    { id: "p-w1", vorname: "Werkstatt", nachname: "Saitenklang", typ: "dienstleister", firma: "Geigenbau Saitenklang (fiktiv)" },
    { id: "p-w2", vorname: "Service", nachname: "Blechwerk", typ: "dienstleister", firma: "Blasinstrumente Blechwerk (fiktiv)" },
    { id: "p-w3", vorname: "Verkauf", nachname: "Musikhaus", typ: "dienstleister", firma: "Musikhaus Notenschlüssel (fiktiv)" },
    { id: "p-s1", vorname: "Gerda", nachname: "Wohlfahrt", typ: "spender" },
    { id: "p-s2", vorname: "Team", nachname: "Bäckerei Morgenrot", typ: "spender", firma: "Bäckerei Morgenrot (fiktiv)" },
    { id: "p-s3", vorname: "Stiftung", nachname: "Klangraum", typ: "unterstuetzer", firma: "Stiftung Klangraum (fiktiv)" },
    { id: "p-s4", vorname: "Werner", nachname: "Altmann", typ: "unterstuetzer" },
  ];
  for (const p of extern) d.personen.push({ ...p, status: "aktiv", email: `kontakt.${p.nachname.toLowerCase().replace(/[^a-z]/g, "")}@beispiel.invalid`, telefon: `02307 ${100000 + Math.floor(r() * 899999)}`, ...adresse(), kontakt_ok: true });

  // Zugänge (Codes) – im Echtbetrieb gehasht auf dem Server; hier sichtbar, weil Demo
  const code = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(r() * 32)]).join("");
  for (const p of d.personen) {
    if (["partner", "dienstleister", "spender", "unterstuetzer"].includes(p.typ)) continue;
    d.zugaenge.push({ id: `z-${p.id}`, person_id: p.id, code: code(), art: "link", aktiv: p.typ !== "ehemalig" || r() < 0.5, verwaltung: ["leitung", "lehrkraft", "foerderverein"].includes(p.typ), zuletzt: r() < 0.6 ? iso(tag(jetzt, -Math.floor(r() * 20), 8 + Math.floor(r() * 12))) : null });
  }

  // --- Projekte & Termine ---
  const konzertTag = naechsterWochentag(tag(jetzt, 26), 0);
  const freizeitTag = naechsterWochentag(tag(jetzt, 45), 5);
  d.projekte = [
    { id: "pr-herbst", titel: "Herbstkonzert", art: "konzert", von: isoTag(tag(jetzt, -30)), bis: isoTag(konzertTag), ort: "PZ Städt. Gymnasium Bergkamen",
      beschreibung: "Traditionelles Herbstkonzert von A- und B-Orchester mit dem Förderverein.",
      checkliste: "[x] Saal reserviert\n[x] Plakat an Druckerei\n[ ] Pressetext an Lokalzeitung\n[ ] Stühle & Notenständer (Hausmeister)\n[ ] Transport Pauken & Kontrabässe\n[ ] Helfer für Kuchenverkauf (Eltern)\n[ ] Programmheft drucken" },
    { id: "pr-freizeit", titel: "Probenfreizeit A-Orchester", art: "freizeit", von: isoTag(freizeitTag), bis: isoTag(tag(freizeitTag, 2)), ort: "Jugendherberge (Beispiel)",
      beschreibung: "Wochenende mit Register- und Tuttiproben. Anreise Freitag 15 Uhr mit Bus ab Schule.",
      checkliste: "[x] Haus gebucht\n[ ] Bus bestellen\n[ ] Zimmerplan\n[ ] Einverständniserklärungen vollständig\n[ ] Notfallliste für Begleitpersonen" },
    { id: "pr-fruehling", titel: "Frühlingskonzert mit Partnerorchester", art: "konzert", von: isoTag(tag(jetzt, 150)), bis: isoTag(tag(jetzt, 200)), ort: "PZ Städt. Gymnasium Bergkamen",
      beschreibung: "Gemeinsames Konzert mit dem Jugendensemble der Partnerschule (Beispiel).", checkliste: "[ ] Termin mit Partnerschule abstimmen\n[ ] Unterbringung Gäste" },
  ];
  d.termine = [];
  let tn = 0;
  const termin = (t) => { const x = { id: `t-${++tn}`, status: "geplant", ...t }; d.termine.push(x); return x; };
  const probeDi = naechsterWochentag(tag(jetzt, -21), 2);
  const probeDo = naechsterWochentag(tag(jetzt, -21), 4);
  for (let w = 0; w < 9; w++) {
    const di = tag(probeDi, w * 7, 18, 0), diE = tag(probeDi, w * 7, 19, 45);
    termin({ titel: "Probe A-Orchester", art_id: "ta-probe", beginn: iso(di), ende: iso(diE), ort: "PZ / Musiksaal", gruppen: ["g-a"], projekt_id: di <= konzertTag ? "pr-herbst" : null, frist: isoTag(tag(di, -1)), soll: SOLL_A,
      beschreibung: w === 4 ? "Bitte Stimmen „Air“ mitbringen." : "" });
    const dO = tag(probeDo, w * 7, 16, 30), doE = tag(probeDo, w * 7, 18, 0);
    termin({ titel: "Probe B-Orchester", art_id: "ta-probe", beginn: iso(dO), ende: iso(doE), ort: "Musiksaal", gruppen: ["g-b"], projekt_id: dO <= konzertTag ? "pr-herbst" : null, frist: isoTag(tag(dO, -1)), soll: SOLL_B });
  }
  termin({ titel: "Registerprobe Streicher A", art_id: "ta-register", beginn: iso(tag(probeDi, 22, 16, 0)), ende: iso(tag(probeDi, 22, 17, 30)), ort: "Raum 104", gruppen: ["g-a"], projekt_id: "pr-herbst", soll: { "r-v1": 7, "r-v2": 6, "r-va": 3, "r-vc": 5, "r-kb": 2 }, register: ["r-v1", "r-v2", "r-va", "r-vc", "r-kb"] });
  termin({ titel: "Generalprobe Herbstkonzert", art_id: "ta-gp", beginn: iso(tag(konzertTag, -1, 10, 0)), ende: iso(tag(konzertTag, -1, 13, 0)), ort: "PZ Städt. Gymnasium Bergkamen", gruppen: ["g-a", "g-b"], projekt_id: "pr-herbst", frist: isoTag(tag(konzertTag, -7)), soll: SOLL_A,
    beschreibung: "Mit Aufbau. Bitte Notenständer mitbringen." });
  termin({ titel: "Herbstkonzert", art_id: "ta-konzert", beginn: iso(tag(konzertTag, 0, 17, 0)), ende: iso(tag(konzertTag, 0, 19, 30)), ort: "PZ Städt. Gymnasium Bergkamen", gruppen: ["g-a", "g-b"], projekt_id: "pr-herbst", frist: isoTag(tag(konzertTag, -10)), soll: SOLL_A,
    beschreibung: "Treffpunkt 16:00 zum Einspielen. Kleidung: schwarz. Eintritt 7 € / Schüler 4 €." });
  termin({ titel: "Probenfreizeit A-Orchester", art_id: "ta-freizeit", beginn: iso(tag(freizeitTag, 0, 15, 0)), ende: iso(tag(freizeitTag, 2, 14, 0)), ort: "Jugendherberge (Beispiel)", gruppen: ["g-a"], projekt_id: "pr-freizeit", frist: isoTag(tag(freizeitTag, -14)), soll: SOLL_A,
    beschreibung: "Einverständniserklärung der Eltern erforderlich." });
  termin({ titel: "Fördervereinsfest", art_id: "ta-fest", beginn: iso(tag(konzertTag, 21, 15, 0)), ende: iso(tag(konzertTag, 21, 19, 0)), ort: "Forum der Schule", gruppen: ["g-a", "g-b", "g-c", "g-d"], frist: isoTag(tag(konzertTag, 14)) });
  termin({ titel: "Ehemaligen-Probe", art_id: "ta-probe", beginn: iso(tag(naechsterWochentag(tag(jetzt, 10), 6), 0, 14, 0)), ende: iso(tag(naechsterWochentag(tag(jetzt, 10), 6), 0, 17, 0)), ort: "Musiksaal", gruppen: ["g-d"] });
  termin({ titel: "Orchesterklasse Vorspiel", art_id: "ta-sonst", beginn: iso(tag(naechsterWochentag(tag(jetzt, 12), 3), 0, 15, 0)), ende: iso(tag(naechsterWochentag(tag(jetzt, 12), 3), 0, 16, 0)), ort: "Aula", gruppen: ["g-c"] });

  // temporäre Aushilfe B → A fürs Herbstkonzert, genereller Wechsel eines Schülers ab Halbjahr
  if (bGeiger) d.gruppe_zuordnung.push({ id: `gz-${d.gruppe_zuordnung.length + 1}`, person_id: bGeiger.id, gruppe_id: "g-a", art: "temporaer", von: isoTag(tag(konzertTag, -14)), bis: isoTag(konzertTag), projekt_id: "pr-herbst", grund: "Aushilfe 2. Violine fürs Herbstkonzert" });

  // Antworten: vergangene Termine fast vollständig, nahe Termine teilweise, ferne kaum
  d.antworten = [];
  const mitglieder = (g) => d.gruppe_zuordnung.filter((z) => z.gruppe_id === g && z.art === "stamm").map((z) => z.person_id);
  for (const t of d.termine) {
    const tage = (new Date(t.beginn) - jetzt) / 86400000;
    const quote = tage < 0 ? 0.95 : tage < 8 ? 0.7 : tage < 30 ? 0.4 : 0.1;
    const personen = new Set(t.gruppen.flatMap(mitglieder));
    for (const pid2 of personen) {
      if (r() > quote) continue;
      const x = r();
      const antwort = x < 0.78 ? "ja" : x < 0.88 ? "vielleicht" : "nein";
      d.antworten.push({ id: `an-${d.antworten.length + 1}`, termin_id: t.id, person_id: pid2, antwort, notiz: antwort === "nein" ? wahl(["krank", "Klassenfahrt", "Familienfeier", "Wettbewerb Jugend musiziert", ""]) : antwort === "vielleicht" ? wahl(["komme evtl. später", "Arzttermin vorher", ""]) : "",
        anwesend: tage < 0 ? (antwort === "nein" ? "nein" : r() < 0.93 ? "ja" : "nein") : "" });
    }
  }

  // --- Inventar ---
  d.inventar = [];
  let inr = 0;
  const inv = (typ, bez, groesse, extra = {}) => d.inventar.push({ id: `i-${++inr}`, inventar_nr: `BK-${String(inr).padStart(3, "0")}`, typ_id: typ, bezeichnung: bez, groesse, zustand: wahl(["sehr_gut", "gut", "gut", "gebraucht"]), status: "verfuegbar", standort: "Instrumentenraum", wert: 0, ...extra });
  for (let i = 0; i < 6; i++) inv("t-vl", wahl(["Höfner", "Gewa", "Stentor"]) + " Schülergeige", wahl(["1/2", "3/4", "3/4", "4/4"]), { wert: 250 + Math.floor(r() * 400) });
  for (let i = 0; i < 3; i++) inv("t-va", "Gewa Viola", wahl(["38 cm", "39,5 cm", "40,5 cm"]), { wert: 450 });
  for (let i = 0; i < 6; i++) inv("t-vc", wahl(["Höfner", "Gewa"]) + " Cello", wahl(["1/2", "3/4", "4/4"]), { wert: 900 + Math.floor(r() * 600) });
  for (let i = 0; i < 2; i++) inv("t-kb", "Kontrabass", wahl(["3/4", "1/2"]), { wert: 1800 });
  inv("t-fg", "Fagott (Schülermodell)", "", { wert: 4200, finanziert_von: "Stiftung Klangraum (fiktiv)" });
  inv("t-ob", "Oboe", "", { wert: 2200 });
  for (let i = 0; i < 2; i++) inv("t-hr", "Doppelhorn F/B", "", { wert: 2400 });
  inv("t-tb", "Tuba", "3/4", { wert: 3900 });
  inv("t-pos", "Tenorposaune", "", { wert: 900 });
  for (let i = 0; i < 4; i++) inv("t-pk", "Pauke " + ["32\"", "29\"", "26\"", "23\""][i], "", { wert: 1500, standort: "PZ Bühnenlager" });
  inv("t-sw", "Kleine Trommel + Becken", "", { wert: 600, standort: "PZ Bühnenlager" });
  inv("t-kla", "E-Piano Stagepiano", "", { wert: 1100 });
  inv("t-kl", "Klarinette (Böhm)", "", { wert: 700 });
  for (const i of d.inventar) {
    const monate = d.instrument_typen.find((t) => t.id === i.typ_id)?.wartung_monate || 12;
    i.anschaffung = isoTag(tag(jetzt, -Math.floor(200 + r() * 2500)));
    i.wartung_faellig = isoTag(tag(jetzt, Math.floor(-40 + r() * monate * 30)));
  }
  // Ausleihen
  d.ausleihen = [];
  const schuelerOhneEigenes = d.person_instrument.filter((x) => !x.eigenes && x.haupt && d.personen.find((p) => p.id === x.person_id)?.typ === "schueler");
  for (const i of d.inventar) {
    if (["t-pk", "t-sw", "t-kla"].includes(i.typ_id)) continue;
    const kand = schuelerOhneEigenes.find((x) => x.typ_id === i.typ_id && !d.ausleihen.find((a) => a.person_id === x.person_id));
    if (kand && r() < 0.75) {
      const von = tag(jetzt, -Math.floor(30 + r() * 300));
      const bis = tag(von, 365);
      d.ausleihen.push({ id: `al-${d.ausleihen.length + 1}`, inventar_id: i.id, person_id: kand.person_id, von: isoTag(von), bis: isoTag(bis), status: "aktiv", zustand_ausgabe: "gut, mit Bogen und Kasten" });
      i.status = "verliehen";
    }
  }
  // eine Rückgabe überfällig für das Cockpit
  if (d.ausleihen[1]) d.ausleihen[1].bis = isoTag(tag(jetzt, -5));
  if (d.ausleihen[3]) d.ausleihen[3].bis = isoTag(tag(jetzt, 9));
  // Reparaturen
  const rep1 = d.inventar.find((i) => i.typ_id === "t-vc" && i.status === "verfuegbar");
  const rep2 = d.inventar.find((i) => i.typ_id === "t-hr");
  const rep3 = d.inventar.find((i) => i.typ_id === "t-vl" && i.status === "verfuegbar");
  d.reparaturen = [];
  if (rep1) { d.reparaturen.push({ id: "rp-1", inventar_id: rep1.id, meldung: "Riss in der Decke unterhalb des Griffbretts", status: "angebot", werkstatt_id: "p-w1", kosten: 280, gemeldet_von: "p-lk3", gemeldet_am: isoTag(tag(jetzt, -9)) }); rep1.status = "reparatur"; }
  if (rep2) { d.reparaturen.push({ id: "rp-2", inventar_id: rep2.id, meldung: "Ventil 2 klemmt – Generalüberholung", status: "in_arbeit", werkstatt_id: "p-w2", kosten: 160, gemeldet_von: "p-lk3", freigegeben_von: "p-fv2", gemeldet_am: isoTag(tag(jetzt, -20)) }); rep2.status = "reparatur"; }
  if (rep3) d.reparaturen.push({ id: "rp-3", inventar_id: rep3.id, meldung: "Neue Saiten + Steg richten", status: "gemeldet", gemeldet_von: demoSchueler?.id || "p-lk3", gemeldet_am: isoTag(tag(jetzt, -2)) });
  d.einkaeufe = [
    { id: "ek-1", titel: "Cello 3/4 für Nachwuchs B-Orchester", begruendung: "Drei Interessenten aus der Orchesterklasse, nur ein freies 3/4-Cello.", status: "angebote", betrag: 1450, haendler_id: "p-w3", finanzierung: "foerderverein", angelegt_am: isoTag(tag(jetzt, -12)) },
    { id: "ek-2", titel: "10 Notenständer (klappbar)", begruendung: "Für Auftritte außerhalb der Schule", status: "bestellt", betrag: 290, haendler_id: "p-w3", finanzierung: "spende", angelegt_am: isoTag(tag(jetzt, -30)) },
  ];
  d.spenden = [
    { id: "sp-1", person_id: "p-s1", datum: isoTag(tag(jetzt, -40)), betrag: 250, zweck: "Notenständer", dank_gesendet: true },
    { id: "sp-2", person_id: "p-s2", datum: isoTag(tag(jetzt, -15)), betrag: 0, sachspende: "Kuchen für das Herbstkonzert", zweck: "Herbstkonzert", dank_gesendet: false },
    { id: "sp-3", person_id: "p-s3", datum: isoTag(tag(jetzt, -300)), betrag: 4200, zweck: "Fagott (Schülermodell)", dank_gesendet: true },
  ];

  // --- Noten ---
  d.werke = [
    { id: "w-1", komponist: "Johann Sebastian Bach", titel: "Brandenburgisches Konzert Nr. 3 G-Dur", werkverzeichnis: "BWV 1048", ausgabe: "gemeinfreie Ausgabe (Beispiel)", rechte: "gemeinfrei", projekte: ["pr-herbst"] },
    { id: "w-2", komponist: "Johann Sebastian Bach", titel: "Orchestersuite Nr. 3 – Air", werkverzeichnis: "BWV 1068", ausgabe: "Bearbeitung für Schulorchester (Beispiel)", rechte: "intern", projekte: ["pr-herbst"] },
    { id: "w-3", komponist: "Antonín Dvořák", titel: "Sinfonie Nr. 9 „Aus der Neuen Welt“ – 4. Satz (Auszug)", werkverzeichnis: "op. 95", ausgabe: "Bearbeitung (Beispiel)", rechte: "intern", projekte: ["pr-herbst"] },
    { id: "w-4", komponist: "Verschiedene", titel: "Filmmusik-Medley", werkverzeichnis: "", ausgabe: "Verlagsausgabe (lizenziert, Beispiel)", rechte: "lizenziert", projekte: ["pr-herbst", "pr-fruehling"] },
    { id: "w-5", komponist: "Georg Friedrich Händel", titel: "Wassermusik – Hornpipe", werkverzeichnis: "HWV 349", ausgabe: "gemeinfreie Ausgabe (Beispiel)", rechte: "gemeinfrei", projekte: ["pr-fruehling"] },
  ];
  d.stimmen = [];
  for (const w of d.werke) {
    d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: w.id, bezeichnung: "Partitur", register_id: null, gruppe_id: null, datei: "" });
    for (const reg of d.register) {
      if (w.id === "w-1" && !["streicher", "tasten"].includes(reg.familie)) continue;
      d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: w.id, bezeichnung: reg.name, register_id: reg.id, gruppe_id: w.id === "w-3" && reg.id === "r-v1" ? null : null, datei: "" });
    }
  }
  // Sonderzuteilung: Solostimme
  if (demoSchueler) d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: "w-2", bezeichnung: "Violoncello Solo", register_id: null, person_id: demoSchueler.id, datei: "" });

  // --- Genehmigungen ---
  d.genehmigung_vorlagen = [
    { id: "gv-1", titel: "Teilnahme & Datenschutz", text: "Ich bin einverstanden, dass mein Kind am Bachkreis teilnimmt und die für die Organisation nötigen Daten (Name, Kontakt, Instrument, Gruppe, Termine) in der Bachkreis-App verarbeitet werden. Die Datenschutzhinweise habe ich gelesen.", fassung: 1, gueltig_monate: null },
    { id: "gv-2", titel: "Foto & Video", text: "Fotos und Videos von Proben und Konzerten, auf denen mein Kind zu sehen ist, dürfen auf der Schulwebsite, in der Presse und auf den Kanälen des Bachkreises veröffentlicht werden. Widerruf jederzeit möglich.", fassung: 1, gueltig_monate: 12 },
    { id: "gv-3", titel: "Probenfreizeit", text: "Mein Kind darf an der Probenfreizeit teilnehmen. Die Begleitpersonen dürfen im Notfall die nötigen Entscheidungen treffen. Gesundheitsangaben habe ich in der App hinterlegt.", fassung: 1, gueltig_monate: null },
    { id: "gv-4", titel: "Instrumenten-Leihvertrag", text: "Das Leihinstrument wird pfleglich behandelt und bei Beschädigung sofort gemeldet. Rückgabe zum vereinbarten Datum.", fassung: 1, gueltig_monate: 12 },
  ];
  d.genehmigungen = [];
  const kinderA = mitglieder("g-a");
  for (const kid of kinderA) {
    const x = r();
    d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-3", kind_id: kid, projekt_id: "pr-freizeit", frist: isoTag(tag(freizeitTag, -14)), status: x < 0.55 ? "erteilt" : x < 0.6 ? "abgelehnt" : "ausstehend", papier: x < 0.1 });
  }
  for (const kid of [...kinderA, ...mitglieder("g-b"), ...mitglieder("g-c")]) {
    d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-2", kind_id: kid, frist: isoTag(tag(jetzt, 10)), status: r() < 0.8 ? "erteilt" : "ausstehend" });
  }
  for (const g of d.genehmigungen) if (g.status !== "ausstehend") { g.beantwortet_am = iso(tag(jetzt, -Math.floor(1 + r() * 20), 19)); g.beantwortet_von = d.eltern_kind.find((e) => e.kind_id === g.kind_id)?.eltern_id || null; }
  // Demo-Eltern: eine offene Genehmigung sicherstellen
  if (demoKindB) d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-4", kind_id: demoKindB.id, frist: isoTag(tag(jetzt, 7)), status: "ausstehend" });

  // --- Kommunikation ---
  d.unterhaltungen = [
    { id: "u-a", titel: "A-Orchester", art: "gruppe", verteiler: "gruppe:g-a" },
    { id: "u-b", titel: "B-Orchester", art: "gruppe", verteiler: "gruppe:g-b" },
    { id: "u-eb", titel: "Eltern B-Orchester", art: "verteiler", verteiler: "eltern:g-b" },
    { id: "u-fv", titel: "Leitung & Förderverein", art: "gruppe", mitglieder: ["p-leitung", "p-fv1", "p-fv2", "p-fv3"] },
    { id: "u-lk", titel: "Lehrkräfte Bachkreis", art: "gruppe", mitglieder: ["p-leitung", "p-lk1", "p-lk2", "p-lk3"] },
  ];
  d.nachrichten = [];
  const nachricht = (u, von, text, minVorher, extra = {}) => d.nachrichten.push({ id: `n-${d.nachrichten.length + 1}`, unterhaltung_id: u, von, text, zeit: iso(new Date(jetzt.getTime() - minVorher * 60000)), gelesen_von: [von], ...extra });
  nachricht("u-a", "p-leitung", "Liebe A-Orchester-Leute, am Dienstag bitte unbedingt die Stimmen vom Brandenburgischen Konzert mitbringen. 🎻", 60 * 26);
  nachricht("u-a", demoSchueler?.id || "p-leitung", "Gibt es die Cello-Stimme auch digital?", 60 * 25);
  nachricht("u-a", "p-leitung", "Ja – unter Meins › Meine Noten. 👍", 60 * 24);
  nachricht("u-b", "p-leitung", "Die Probe am Donnerstag beginnt ausnahmsweise erst 16:45 Uhr.", 60 * 5);
  nachricht("u-eb", "p-leitung", "Liebe Eltern, für das Herbstkonzert suchen wir Helfer beim Kuchenverkauf und beim Transport der Instrumente. Bitte kurz zurückmelden!", 60 * 30, { rueckmeldung: true });
  nachricht("u-fv", "p-fv2", "Kostenvoranschlag für das Cello ist da (280 €). Freigabe über die App?", 60 * 3);
  nachricht("u-lk", "p-lk1", "Ich habe die Air-Bearbeitung ins Notenarchiv gestellt.", 60 * 48);
  d.pinnwand = [
    { id: "pw-1", text: "Fundsache: schwarzer Cellobogen im Musiksaal – bei Frau Jacka abholen.", von: "p-leitung", wichtig: false, erledigt: false, zeit: iso(tag(jetzt, -2, 12)) },
    { id: "pw-2", text: "Herbstkonzert: Kleidung komplett schwarz!", von: "p-leitung", wichtig: true, erledigt: false, zeit: iso(tag(jetzt, -6, 9)) },
    { id: "pw-3", text: "Plakate fürs Herbstkonzert hängen ab Montag in der Pausenhalle.", von: "p-lk2", wichtig: false, erledigt: true, zeit: iso(tag(jetzt, -9, 9)) },
  ];
  d.aufgaben = [
    { id: "au-1", titel: "Neue Anschrift melden", art: "aenderung", status: "offen", von_id: demoEltern?.id || null, zustaendig_id: "p-leitung", text: "Wir sind umgezogen: Am Römerberg 12, 59192 Bergkamen.", frist: isoTag(tag(jetzt, 7)) },
    { id: "au-2", titel: "Pressetext Herbstkonzert schreiben", art: "aufgabe", status: "in_arbeit", zustaendig_id: "p-lk2", von_id: "p-leitung", frist: isoTag(tag(konzertTag, -14)) },
  ];
  d.versand = [];
  d.aenderungen = [];

  d.__konfig = {
    name: "Bachkreis Bergkamen",
    untertitel: "Jugendsinfonieorchester",
    leitung_id: "p-leitung",
    demo_personen: { leitung: "p-leitung", lehrkraft: "p-lk1", vorstand: "p-fv2", schueler: demoSchueler?.id, eltern: demoEltern?.id },
    notrufe: [["🚑", "Notruf / Rettungsdienst", "112"], ["🚓", "Polizei", "110"], ["🩺", "Ärztlicher Bereitschaftsdienst", "116117"], ["☠️", "Giftnotruf NRW (Bonn)", "0228 19240"]],
    schule_telefon: "02307 964440",
    freigabe_grenze_eur: 250,
    nachfass_tage: 3,
  };
  for (const t of Object.keys(d)) if (Array.isArray(d[t])) for (const z of d[t]) { z.version = 1; z.erstellt_am = z.erstellt_am || iso(jetzt); z.geaendert_am = z.geaendert_am || iso(jetzt); z.geaendert_von = "Demodaten"; }
  return d;
}
