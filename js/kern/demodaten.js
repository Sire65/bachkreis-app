// Fiktive Demodaten für die Vorführversion. Alle Schüler-, Eltern- und Spendernamen sind ERFUNDEN.
// Die Daten werden relativ zum heutigen Tag erzeugt, damit die Vorführung immer „aktuell“ wirkt.
// Deterministisch (fester Zufallsstartwert) – jede Vorführung sieht gleich aus.

import { KOM_STANDARD } from "./kom-standard.js";
import { pwAppPerson, pwEmpfaenger, pwGelesenId } from "./schema.js";
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
    { id: "g-a", kuerzel: "A", name: "A-Orchester", beschreibung: "Jahrgänge 9–12", farbe: "#1f5f99", sort: 1, aktiv: true, soll: SOLL_A },
    { id: "g-b", kuerzel: "B", name: "B-Orchester", beschreibung: "Jahrgänge 5–9", farbe: "#c98a00", sort: 2, aktiv: true, soll: SOLL_B, wechsel_nach: "g-a", wechsel_ab_jg: 9 },
    { id: "g-c", kuerzel: "C", name: "Orchesterklasse / AGs", beschreibung: "Erprobungsstufe mit Musikschule (Beispiel)", farbe: "#2e7d4f", sort: 3, aktiv: true, wechsel_nach: "g-b", wechsel_ab_jg: 7 },
    { id: "g-d", kuerzel: "D", name: "Ehemalige", beschreibung: "Ehemaligenorchester (Beispiel)", farbe: "#7b3fa0", sort: 4, aktiv: true, ehemalige: true },
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
  // 🌍 für alle: Weihnachtsfeier (erwünscht) · ℹ️ nur zur Info: Elternabend-Hinweis
  termin({ titel: "Weihnachtsfeier des Bachkreises", art_id: "ta-fest", beginn: iso(tag(konzertTag, 35, 17, 0)), ende: iso(tag(konzertTag, 35, 20, 0)), ort: "Forum der Schule", fuer_alle: true, gruppen: [], teilnahme: "erwuenscht", beschreibung: "Für alle – mit Familie! Bitte etwas fürs Buffet mitbringen." });
  termin({ titel: "Ferien – keine Proben", art_id: "ta-sonst", beginn: iso(tag(konzertTag, 7, 8, 0)), ende: iso(tag(konzertTag, 13, 18, 0)), ort: "", fuer_alle: true, gruppen: [], teilnahme: "info", beschreibung: "In den Herbstferien finden keine Proben statt." });
  for (const t of d.termine) if (["ta-gp", "ta-konzert"].includes(t.art_id) && !t.teilnahme) t.teilnahme = "pflicht";

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
        anwesend: tage < 0 ? (antwort === "nein" ? (r() < 0.85 ? "entschuldigt" : "nein") : ((y) => (y < 0.88 ? "ja" : y < 0.95 ? "spaet" : "nein"))(r())) : "" });
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
  for (const i of d.inventar) Object.assign(i, { eigentuemer: i.finanziert_von ? "foerderverein" : wahl(["foerderverein", "foerderverein", "schule"]), inventur_am: isoTag(tag(jetzt, -Math.floor(20 + r() * 400))) });
  // 📦 Inventar-Fälle (0.19.0): eine Geige defekt, ein Cello auf der Konzertreise gestohlen (Anzeige erstattet)
  Object.assign(d.inventar[2], { status: "defekt", zustand: "maengel", notiz: "Steg umgefallen, Decke gerissen – Kostenvoranschlag anfragen" });
  Object.assign(d.inventar[12], { status: "gestohlen", ausgeschieden_am: isoTag(tag(jetzt, -48)), ausgeschieden_grund: "Diebstahl aus dem Bus, Anzeige Polizei Bergkamen Az. 123/26 (Beispiel), Versicherung informiert" });

  // 📦 Ausstattung & Zubehör (0.19.0): Notenständer, Taktstock, Stühle, Technik … mit Anschaffung, Preis und Status
  d.ausstattung = [];
  const aus = (kategorie, bezeichnung, extra) => d.ausstattung.push({ id: `au-${d.ausstattung.length + 1}`, inventar_nr: `A-${String(d.ausstattung.length + 1).padStart(3, "0")}`, kategorie, bezeichnung,
    anzahl: 1, status: "verfuegbar", zustand: "gut", standort: "Instrumentenraum", eigentuemer: "foerderverein", finanzierung: "foerderverein", ...extra });
  const vor = (tage) => isoTag(tag(jetzt, -tage));
  aus("notenstaender", "Orchester-Notenständer (schwarz, klappbar)", { hersteller: "König & Meyer 101", anzahl: 40, wert: 1960, anschaffung: vor(900), haendler: "Musikhaus (Beispiel)", beleg: "RE-2024-0815", inventur_am: vor(30) });
  aus("notenstaender", "Pultleuchten LED", { hersteller: "K&M 12250", anzahl: 12, wert: 540, anschaffung: vor(400), inventur_am: vor(30) });
  aus("notenstaender", "Notenständer Stahl", { hersteller: "K&M 100/1", anzahl: 4, status: "defekt", zustand: "maengel", wert: 120, anschaffung: vor(3200), notiz: "Klemmschrauben gebrochen", inventur_am: vor(30) });
  aus("dirigent", "Dirigentenpult mit Ablage", { hersteller: "K&M 12330", wert: 289, anschaffung: vor(1500), standort: "PZ Bühne", inventur_am: vor(30) });
  aus("dirigent", "Taktstock Ebenholz-Griff", { hersteller: "Mollard (Beispiel)", wert: 85, anschaffung: vor(700), status: "im_einsatz", standort: "bei der Leitung", inventur_am: vor(30) });
  aus("dirigent", "Ersatz-Taktstock", { wert: 25, anschaffung: vor(200), status: "vermisst", notiz: "seit dem Sommerkonzert nicht wiedergefunden" });
  aus("stuhl", "Orchesterstühle (höhenverstellbar)", { anzahl: 30, wert: 4500, anschaffung: vor(1800), finanzierung: "zuschuss", eigentuemer: "schule", standort: "Musikraum 104", inventur_am: vor(200) });
  aus("stuhl", "Cellistenhocker", { anzahl: 4, wert: 380, anschaffung: vor(1100), inventur_am: vor(200) });
  aus("schlagwerk", "Paukenfelle Ersatzsatz", { wert: 310, anschaffung: vor(300), standort: "PZ Bühnenlager" });
  aus("koffer", "Transportcase Pauke", { anzahl: 2, wert: 890, anschaffung: vor(600), standort: "PZ Bühnenlager", status: "reparatur", notiz: "Rolle abgebrochen – beim Sattler" });
  aus("technik", "Aktive Lautsprecher (Paar)", { hersteller: "the box pro (Beispiel)", wert: 699, anschaffung: vor(500), seriennummer: "SN-4471-A/B", garantie_bis: isoTag(tag(jetzt, 230)) });
  aus("technik", "Aufnahmegerät Stereo", { hersteller: "Zoom H5", wert: 279, anschaffung: vor(380), status: "verliehen", standort: "ausgeliehen an Lehrkraft", seriennummer: "H5-88213" });
  aus("technik", "Beamer für Probenraum", { wert: 640, anschaffung: vor(2400), status: "gestohlen", ausgeschieden_am: vor(120), ausgeschieden_grund: "Einbruch Musikraum, Anzeige Az. 77/26 (Beispiel)", eigentuemer: "schule", finanzierung: "schule" });
  aus("licht", "Verlängerungskabel & Mehrfachstecker", { anzahl: 10, wert: 140, anschaffung: vor(800) });
  aus("notenarchiv", "Notenmappen schwarz mit Logo", { anzahl: 80, wert: 560, anschaffung: vor(650), finanzierung: "spende" });
  aus("edv", "Notebook Notenwart", { hersteller: "Lenovo (Beispiel)", wert: 749, anschaffung: vor(420), standort: "Notenwart", seriennummer: "PF-3K2Q9", afa_art: "linear", afa_jahre: 1 });
  aus("moebel", "Notenschrank 4 Türen", { wert: 1250, anschaffung: vor(3000), standort: "Musikraum 104" });
  aus("kleidung", "Bachkreis-Poloshirts (Größen-Mix)", { anzahl: 60, wert: 900, anschaffung: vor(250), finanzierung: "spende", eigentuemer: "foerderverein" });
  aus("pflege", "Kolophonium, Saiten, Rohrblätter", { wert: 160, anschaffung: vor(60), afa_art: "sofort" });
  aus("sonstiges", "Alte Notenpulte (Holz)", { anzahl: 6, wert: 300, anschaffung: vor(4500), status: "verkauft", ausgeschieden_am: vor(90), ausgeschieden_grund: "Flohmarkt Schulfest, Erlös 60 € an den Förderverein" });

  // Ausleihen
  d.ausleihen = [];
  const schuelerOhneEigenes = d.person_instrument.filter((x) => !x.eigenes && x.haupt && d.personen.find((p) => p.id === x.person_id)?.typ === "schueler");
  for (const i of d.inventar) {
    if (["t-pk", "t-sw", "t-kla"].includes(i.typ_id) || i.status !== "verfuegbar") continue;
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
    { id: "w-1", komponist: "Johann Sebastian Bach", titel: "Brandenburgisches Konzert Nr. 3 G-Dur", werkverzeichnis: "BWV 1048", ausgabe: "gemeinfreie Ausgabe (Beispiel)", rechte: "gemeinfrei", projekte: ["pr-herbst"], gruppen: ["g-a"], schwierigkeit: "schwer", dauer_min: 11 },
    { id: "w-2", komponist: "Johann Sebastian Bach", titel: "Orchestersuite Nr. 3 – Air", werkverzeichnis: "BWV 1068", ausgabe: "Bearbeitung für Schulorchester (Beispiel)", rechte: "intern", projekte: ["pr-herbst"], gruppen: ["g-a", "g-b"], schwierigkeit: "mittel", dauer_min: 5 },
    { id: "w-3", komponist: "Antonín Dvořák", titel: "Sinfonie Nr. 9 „Aus der Neuen Welt“ – 4. Satz (Auszug)", werkverzeichnis: "op. 95", ausgabe: "Bearbeitung (Beispiel)", rechte: "intern", projekte: ["pr-herbst"], gruppen: ["g-a"], schwierigkeit: "schwer", dauer_min: 7 },
    { id: "w-4", komponist: "Verschiedene", titel: "Filmmusik-Medley", werkverzeichnis: "", ausgabe: "Verlagsausgabe (lizenziert, Beispiel)", rechte: "lizenziert", projekte: ["pr-herbst", "pr-fruehling"], gruppen: ["g-a", "g-b", "g-c"], schwierigkeit: "mittel", dauer_min: 8 },
    { id: "w-5", komponist: "Georg Friedrich Händel", titel: "Wassermusik – Hornpipe", werkverzeichnis: "HWV 349", ausgabe: "gemeinfreie Ausgabe (Beispiel)", rechte: "gemeinfrei", projekte: ["pr-fruehling"], gruppen: ["g-b", "g-c"], schwierigkeit: "leicht", dauer_min: 3 },
    { id: "w-6", komponist: "Johann Pachelbel", titel: "Kanon in D", werkverzeichnis: "P. 37", ausgabe: "Bearbeitung für Orchesterklasse (Beispiel)", rechte: "gemeinfrei", projekte: ["pr-fruehling"], gruppen: ["g-c"], schwierigkeit: "leicht", dauer_min: 5 },
    { id: "w-7", komponist: "Wolfgang Amadeus Mozart", titel: "Eine kleine Nachtmusik – 1. Satz", werkverzeichnis: "KV 525", ausgabe: "gemeinfreie Ausgabe (Beispiel) · 🎼 Demo-Probenoten", rechte: "gemeinfrei", projekte: [], gruppen: ["g-d"], schwierigkeit: "mittel", dauer_min: 6 },
    // 🎼 Demo-Probenoten (0.18.0): gemeinfreie Melodien, in der App selbst gesetzt – je Instrument eine eigene Stimme
    { id: "w-8", komponist: "Christian Petzold", titel: "Menuett G-Dur (Notenbüchlein für Anna Magdalena Bach)", werkverzeichnis: "BWV Anh. 114", ausgabe: "🎼 Demo-Probenoten, selbst gesetzt (gemeinfrei)", rechte: "gemeinfrei", projekte: ["pr-fruehling"], gruppen: ["g-b", "g-c"], schwierigkeit: "leicht", dauer_min: 2 },
    { id: "w-9", komponist: "Ludwig van Beethoven", titel: "Ode an die Freude (9. Sinfonie)", werkverzeichnis: "op. 125", ausgabe: "🎼 Demo-Probenoten, selbst gesetzt (gemeinfrei)", rechte: "gemeinfrei", projekte: [], gruppen: ["g-b", "g-c", "g-d"], schwierigkeit: "leicht", dauer_min: 2 },
    { id: "w-10", komponist: "Antonín Dvořák", titel: "Largo „Aus der Neuen Welt“ – Thema", werkverzeichnis: "op. 95", ausgabe: "🎼 Demo-Probenoten, selbst gesetzt (gemeinfrei)", rechte: "gemeinfrei", projekte: [], gruppen: ["g-a", "g-d"], schwierigkeit: "mittel", dauer_min: 3 },
    { id: "w-11", komponist: "Bachkreis (eigene Komposition)", titel: "Bachkreis-Fanfare", werkverzeichnis: "", ausgabe: "🎼 Demo-Probenoten, eigene Komposition", rechte: "intern", projekte: ["pr-herbst"], gruppen: ["g-a", "g-b"], schwierigkeit: "leicht", dauer_min: 1 },
  ];
  // Werk → Stück der Musik-Engine (für die Demo-Probenoten); welche Register Stimmen bekommen
  const DEMO_NOTEN = { "w-6": "kanon", "w-7": "nachtmusik", "w-8": "menuett", "w-9": "freude", "w-10": "largo", "w-11": "fanfare" };
  const BESETZT = { "w-8": ["streicher", "holz", "tasten"], "w-11": ["blech", "schlag", "streicher"] };
  d.stimmen = [];
  for (const w of d.werke) {
    d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: w.id, bezeichnung: "Partitur", register_id: null, gruppe_id: null, datei: DEMO_NOTEN[w.id] ? "demo:" + DEMO_NOTEN[w.id] : "" });
    for (const reg of d.register) {
      if (w.id === "w-1" && !["streicher", "tasten"].includes(reg.familie)) continue;
      if (["w-6", "w-7"].includes(w.id) && reg.familie !== "streicher" && !(w.id === "w-6" && reg.familie === "holz")) continue;
      if (BESETZT[w.id] && !BESETZT[w.id].includes(reg.familie)) continue;
      d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: w.id, bezeichnung: reg.name, register_id: reg.id, gruppe_id: null, datei: DEMO_NOTEN[w.id] ? "demo:" + DEMO_NOTEN[w.id] : "" });
    }
  }
  // 🙋 eigene Termine des Demo-Schülers: Geigenunterricht jede Woche, Vorspiel; 👋 Anklopfen der Leitung (beantwortet)
  d.eigene_termine = []; d.klopfen = [];
  if (demoSchueler) {
    const mo = naechsterWochentag(tag(jetzt, 0), 1);
    d.eigene_termine.push({ id: "et-1", person_id: demoSchueler.id, art: "unterricht", titel: "Geigenunterricht Musikschule", beginn: iso(tag(mo, 0, 15, 30)), ende: iso(tag(mo, 0, 16, 15)), ort: "Musikschule Bergkamen", woechentlich_bis: isoTag(tag(mo, 56)), erinnerung: 30, notiz: "" });
    d.eigene_termine.push({ id: "et-2", person_id: demoSchueler.id, art: "vorspiel", titel: "Vorspiel bei Oma", beginn: iso(tag(jetzt, 5, 16, 0)), ende: iso(tag(jetzt, 5, 17, 0)), ort: "", woechentlich_bis: null, erinnerung: 60, notiz: "Air üben!" });
    d.klopfen.push({ id: "kl-1", von: "p-leitung", an: demoSchueler.id, zeit: iso(tag(jetzt, -1, 18, 5)), antwort: "ja", antwort_am: iso(tag(jetzt, -1, 18, 6)) });
  }
  // 🎻 Übe-Tagebuch: der Demo-Schüler übt fast täglich, Übezeiten Mo/Mi/Fr/So 17:30 (Wochenziel 150 Min.)
  d.uebungen = [];
  if (demoSchueler) {
    demoSchueler.uebe_plan = { an: true, tage: [1, 3, 5, 7], zeit: "17:30", dauer: 30, ziel: 150, alarm: 10 };
    const plan = [[0, 25, ["tonleitern", "stueck"], 4], [1, 30, ["stueck"], 3], [2, 15, ["etueden"], 2], [4, 40, ["stueck", "vomblatt"], 5], [5, 20, ["tonleitern", "rhythmus"], 4],
      [6, 35, ["stueck"], 4], [8, 30, ["etueden", "stueck"], 3], [9, 20, ["tonleitern"], 3], [11, 45, ["stueck"], 5], [12, 25, ["gehoer", "rhythmus"], 4]];
    plan.forEach(([vor, minuten, inhalt, gefuehl], i) => d.uebungen.push({ id: `ue-${i + 1}`, person_id: demoSchueler.id, datum: isoTag(tag(jetzt, -vor - 1)), minuten,
      werk_id: ["w-2", "w-3", "w-1"][i % 3], inhalt, gefuehl, notiz: i === 0 ? "Takt 17–24 langsam mit Metronom" : "", geteilt: true }));
  }
  // Sonderzuteilung: Solostimme
  if (demoSchueler) d.stimmen.push({ id: `st-${d.stimmen.length + 1}`, werk_id: "w-2", bezeichnung: "Violoncello Solo", register_id: null, person_id: demoSchueler.id, datei: "" });

  // --- Konzertaufnahmen (Demo: ohne Datei – im Echtbetrieb im geschützten Speicher) ---
  d.aufnahmen = [
    { id: "au-k1", titel: "Herbstkonzert (Vorjahr) – Mitschnitt", datum: isoTag(tag(jetzt, -340)), projekt_id: null, datei: "", quelle_url: "", freigabe: "mitglieder", notiz: "Demo-Eintrag: Datei folgt" },
    { id: "au-k2", titel: "Frühlingskonzert – Brandenburgisches Konzert Nr. 3", datum: isoTag(tag(jetzt, -150)), projekt_id: null, datei: "", quelle_url: "", freigabe: "intern", notiz: "Demo-Eintrag: Einwilligungen prüfen" },
    { id: "au-k3", titel: "Bachkreis Bergkamen auf YouTube", datum: null, projekt_id: null, datei: "", quelle_url: "https://www.youtube.com/channel/UC1dNrcYTR2Bf2f9wpFbL8oQ", freigabe: "oeffentlich", notiz: "öffentlicher Kanal" },
  ];

  // --- Genehmigungen ---
  d.genehmigung_vorlagen = [
    { id: "gv-1", titel: "Teilnahme & Datenschutz", text: "Ich bin einverstanden, dass mein Kind am Bachkreis teilnimmt und die für die Organisation nötigen Daten (Name, Kontakt, Instrument, Gruppe, Termine) in der Bachkreis-App verarbeitet werden. Die Datenschutzhinweise habe ich gelesen.", fassung: 1, gueltig_monate: null, zweck: "teilnahme" },
    { id: "gv-2", titel: "Foto & Video – Schul-Website", zweck: "foto_website", text: "Fotos und Videos von Proben und Konzerten, auf denen mein Kind zu sehen ist, dürfen auf der Schulwebsite veröffentlicht werden. Widerruf jederzeit möglich.", fassung: 2, gueltig_monate: 12 },
    { id: "gv-5", titel: "Fotos intern (App, nur Mitglieder)", zweck: "foto_intern", text: "Fotos von Proben und Konzerten mit meinem Kind dürfen in der Bachkreis-App gezeigt werden (nur für angemeldete Mitglieder). Widerruf jederzeit möglich.", fassung: 1, gueltig_monate: null },
    { id: "gv-6", titel: "Fotos Presse", zweck: "foto_presse", text: "Fotos von Konzerten, auf denen mein Kind zu sehen ist, dürfen an die Lokalpresse gegeben werden (ohne Nachnamen). Widerruf für künftige Fotos jederzeit möglich.", fassung: 1, gueltig_monate: 12 },
    { id: "gv-7", titel: "Fotos Social Media", zweck: "foto_social", text: "Fotos von Konzerten mit meinem Kind dürfen auf den Social-Media-Kanälen des Bachkreises gezeigt werden. Widerruf jederzeit möglich.", fassung: 1, gueltig_monate: 12 },
    { id: "gv-3", titel: "Probenfreizeit", text: "Mein Kind darf an der Probenfreizeit teilnehmen. Die Begleitpersonen dürfen im Notfall die nötigen Entscheidungen treffen. Gesundheitsangaben habe ich in der App hinterlegt.", fassung: 1, gueltig_monate: null, zweck: "reise" },
    { id: "gv-4", titel: "Instrumenten-Leihvertrag", text: "Das Leihinstrument wird pfleglich behandelt und bei Beschädigung sofort gemeldet. Rückgabe zum vereinbarten Datum.", fassung: 1, gueltig_monate: 12, zweck: "leihvertrag" },
  ];
  d.genehmigungen = [];
  const kinderA = mitglieder("g-a");
  for (const kid of kinderA) {
    const x = r();
    d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-3", kind_id: kid, projekt_id: "pr-freizeit", frist: isoTag(tag(freizeitTag, -14)), status: x < 0.55 ? "erteilt" : x < 0.6 ? "abgelehnt" : "ausstehend", papier: x < 0.1 });
  }
  for (const kid of [...kinderA, ...mitglieder("g-b"), ...mitglieder("g-c")]) {
    d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-2", kind_id: kid, frist: isoTag(tag(jetzt, 10)), status: r() < 0.8 ? "erteilt" : "ausstehend" });
    // 📷 je Zweck: intern fast alle, Presse/Social etwas weniger – einige lehnen ab
    for (const [v, ja] of [["gv-5", 0.94], ["gv-6", 0.7], ["gv-7", 0.55]]) { const x = r(); d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: v, kind_id: kid, frist: isoTag(tag(jetzt, 10)), status: x < ja ? "erteilt" : x < ja + 0.15 ? "abgelehnt" : "ausstehend" }); }
  }
  for (const g of d.genehmigungen) if (g.status !== "ausstehend") { g.beantwortet_am = iso(tag(jetzt, -Math.floor(1 + r() * 20), 19)); g.beantwortet_von = d.eltern_kind.find((e) => e.kind_id === g.kind_id)?.eltern_id || null; }
  for (const g of d.genehmigungen) if (g.status !== "ausstehend") g.vorlage_version = d.genehmigung_vorlagen.find((v) => v.id === g.vorlage_id)?.fassung || 1;
  // 🩺 Gesundheit & Notfall (0.20.0): Angaben für einen Teil der Kinder, eins davon abgelaufen; Begleitpersonen der Probenfreizeit
  d.gesundheit = [];
  const ALLERG = ["Erdnüsse (Notfallset im Rucksack)", "Heuschnupfen", "Wespenstich", "", "", "", "Laktose", ""];
  [...kinderA, ...mitglieder("g-b")].filter(() => r() < 0.55).forEach((kid, i) => {
    const bestaetigt = tag(jetzt, -Math.floor(10 + r() * 300));
    d.gesundheit.push({ id: `gs-${i + 1}`, person_id: kid, allergien: wahl(ALLERG), ernaehrung: wahl(["", "", "vegetarisch", "kein Schweinefleisch", "glutenfrei"]), medikamente: i % 7 === 0 ? "Asthmaspray (Salbutamol) bei Bedarf, 1–2 Hübe" : "",
      erkrankungen: i % 7 === 0 ? "Asthma (belastungsabhängig)" : "", notfall_name: i % 5 === 0 ? "Oma (Beispiel)" : "", notfall_tel: i % 5 === 0 ? "02307 000000" : "", krankenkasse: wahl(["AOK (Beispiel)", "TK (Beispiel)", "Barmer (Beispiel)"]),
      hausarzt: "", tetanus: isoTag(tag(jetzt, -Math.floor(300 + r() * 2500))), schwimmer: wahl(["ja", "ja", "ja", "unsicher"]), erste_hilfe_ok: true, medikamente_geben_ok: i % 7 === 0,
      geprueft_am: isoTag(bestaetigt), geprueft_von: d.eltern_kind.find((e) => e.kind_id === kid)?.eltern_id || null, loeschen_am: isoTag(tag(bestaetigt, i === 3 ? -30 - (jetzt - bestaetigt) / 86400000 : 395)) });
  });
  const freizeit = d.projekte.find((x) => x.id === "pr-freizeit");
  if (freizeit) freizeit.begleiter = ["p-leitung", ...d.personen.filter((x) => x.typ === "lehrkraft").slice(0, 1).map((x) => x.id)];
  // 🧹 Löschfristen (0.21.0): zwei Ehemalige sind ausgetreten – einer vor über zwei Jahren (zum Anonymisieren), einer erst kürzlich
  const ehemAlle = d.personen.filter((p) => p.typ === "ehemalig");
  if (ehemAlle[0]) Object.assign(ehemAlle[0], { status: "ausgetreten", ausgetreten_am: isoTag(tag(jetzt, -800)) });
  if (ehemAlle[1]) Object.assign(ehemAlle[1], { status: "ausgetreten", ausgetreten_am: isoTag(tag(jetzt, -60)) });
  // 🎭 Konzert & Reise (0.21.0): Programmfolge Herbstkonzert, Treffpunkt/Kleidung/Transport, Anmeldung zur Probenfreizeit
  const herbst = d.projekte.find((x) => x.id === "pr-herbst");
  Object.assign(herbst, { treffpunkt: "17:15 Uhr Bühneneingang PZ, Einspielen 17:30", kleiderordnung: "schwarz-weiß (schwarze Hose/Rock, weißes Hemd/Bluse)",
    transport_inventar: d.inventar.filter((i) => ["t-pk", "t-kb"].includes(i.typ_id)).map((i) => i.id), transport_ausstattung: d.ausstattung.filter((a) => ["notenstaender", "dirigent", "technik"].includes(a.kategorie) && a.status === "verfuegbar").map((a) => a.id) });
  d.programm = [["werk", "w-11", null, "g-a"], ["werk", "w-1", null, "g-a"], ["ansage", null, "Begrüßung durch den Förderverein", null], ["werk", "w-5", null, "g-b"], ["werk", "w-2", null, "g-b"],
    ["pause", null, "Pause mit Kuchenbuffet", null, 20], ["werk", "w-3", null, "g-a"], ["werk", "w-4", null, "g-a"], ["zugabe", "w-9", null, "g-a"]]
    .map(([art, werk_id, titel, gruppe_id, dauer], i) => ({ id: `pg-${i + 1}`, projekt_id: "pr-herbst", nr: i + 1, art, werk_id, titel: titel || "", gruppe_id, dauer_min: dauer || null, solisten: werk_id === "w-1" ? "Solovioline: Konzertmeisterin" : "", notiz: art === "pause" ? "Umbau B → A, Pauken stimmen" : "" }));
  Object.assign(freizeit, { treffpunkt: "Freitag 15:00 Uhr Busparkplatz Schule", kleiderordnung: "bequem, Hausschuhe, Notenständer-Lampe", anmeldung: true, anmeldeschluss: isoTag(tag(freizeitTag, -10)), kosten: 85, plaetze: 40 });
  d.reise_anmeldungen = [];
  for (const kid of kinderA.filter(() => r() < 0.6)) d.reise_anmeldungen.push({ id: `ra-${d.reise_anmeldungen.length + 1}`, projekt_id: "pr-freizeit", person_id: kid, status: "angemeldet",
    angemeldet_von: d.eltern_kind.find((e) => e.kind_id === kid)?.eltern_id || null, angemeldet_am: iso(tag(jetzt, -Math.floor(1 + r() * 20), 20)), betrag: 85, bezahlt: r() < 0.6, zimmer: "" });
  for (const a of d.reise_anmeldungen) if (a.bezahlt) a.bezahlt_am = isoTag(tag(jetzt, -2));
  // 🤝 Leihverträge: Zubehör, Kaution, Gebühr; Vertrag mit der Ausleihe verknüpft
  const vertrag = d.genehmigung_vorlagen.find((v) => v.zweck === "leihvertrag");
  d.ausleihen.forEach((a, i) => {
    Object.assign(a, { zubehoer: ["koffer", ...(["t-vl", "t-va", "t-vc", "t-kb"].includes(d.inventar.find((x) => x.id === a.inventar_id)?.typ_id) ? ["bogen", "kolophonium"] : ["pflege"])], kaution: 50, kaution_status: i % 4 === 0 ? "offen" : "bezahlt", gebuehr: 30,
      gebuehr_bezahlt_bis: i % 3 === 0 ? null : isoTag(tag(jetzt, 200)), versicherung: "verein" });
    if (vertrag && d.personen.find((p) => p.id === a.person_id)?.typ === "schueler") {
      const g = { id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: vertrag.id, kind_id: a.person_id, ausleihe_id: a.id, frist: a.von, status: i % 5 === 0 ? "ausstehend" : "erteilt" };
      if (g.status === "erteilt") Object.assign(g, { beantwortet_am: iso(tag(new Date(a.von), 2, 19)), beantwortet_von: d.eltern_kind.find((e) => e.kind_id === a.person_id)?.eltern_id || null, vorlage_version: vertrag.fassung });
      d.genehmigungen.push(g); a.vertrag_id = g.id;
    }
  });
  // Demo-Eltern: eine offene Genehmigung sicherstellen
  if (demoKindB) d.genehmigungen.push({ id: `ge-${d.genehmigungen.length + 1}`, vorlage_id: "gv-4", kind_id: demoKindB.id, frist: isoTag(tag(jetzt, 7)), status: "ausstehend" });

  // --- Kommunikation ---
  d.unterhaltungen = [
    { id: "u-a", titel: "A-Orchester", art: "gruppe", verteiler: "gruppe:g-a" },
    { id: "u-b", titel: "B-Orchester", art: "gruppe", verteiler: "gruppe:g-b" },
    { id: "u-eb", titel: "Eltern B-Orchester", art: "verteiler", verteiler: "eltern:g-b" },
    { id: "u-fv", titel: "Leitung & Förderverein", art: "gruppe", mitglieder: ["p-leitung", "p-fv1", "p-fv2", "p-fv3"] },
    { id: "u-lk", titel: "Lehrkräfte Bachkreis", art: "gruppe", mitglieder: ["p-leitung", "p-lk1", "p-lk2", "p-lk3"] },
    // eigene Unterhaltungen (wie KC Einzelchat) – privat: nur die Beteiligten sehen sie
    { id: "u-e1", titel: "Einzelgespräch", art: "einzel", mitglieder: ["p-leitung", "p-lk2"] },
    ...(demoSchueler ? [{ id: "u-e2", titel: "Einzelgespräch", art: "einzel", mitglieder: [demoSchueler.id, "p-lk1"] }] : []),
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
  // Nachrichten wie KC: ❗ wichtig, 🏎️ Express, ↩️ Antwort, Reaktionen, ⏰ geplant
  nachricht("u-a", "p-leitung", "Generalprobe am Samstag: Treffpunkt 9:30 Uhr in der Aula, Instrumente schon gestimmt mitbringen!", 60 * 3, { wichtig: true, reaktionen: demoSchueler ? { [demoSchueler.id]: "👍" } : {} });
  nachricht("u-e1", "p-lk2", "Hallo Bettina, hast du die Programmhefte schon bestellt?", 60 * 50);
  nachricht("u-e1", "p-leitung", "Noch nicht – mache ich heute Abend. 📖", 60 * 49, { antwort_auf: "n-" + d.nachrichten.length, reaktionen: { "p-lk2": "🙏" } });
  nachricht("u-e1", "p-leitung", "Der Bus für Sevilla muss bis morgen 12 Uhr bestätigt werden – bitte kurz zurückrufen!", 25, { express: true });
  if (demoSchueler) {
    nachricht("u-e2", "p-lk1", `Hallo ${demoSchueler.vorname}, kannst du am Donnerstag 15 Minuten früher zum Einspielen kommen?`, 90);
    nachricht("u-e2", demoSchueler.id, "Ja, klappt! 👍", 80, { antwort_auf: "n-" + d.nachrichten.length });
  }
  // ältere Tage/Wochen (im Chat eingeklappt: „Mo, 12.10.26“ bzw. „KW 41/26“), 📊 Umfrage, 🎼 Noten als Anhang
  const st1 = d.stimmen.find((x) => x.werk_id === "w-2") || d.stimmen[0], w1 = st1 && d.werke.find((w) => w.id === st1.werk_id);
  nachricht("u-a", "p-leitung", "Willkommen im neuen Schuljahr! Die erste Probe ist am Dienstag um 18 Uhr. 🎻", 60 * 24 * 23);
  nachricht("u-a", demoSchueler?.id || "p-leitung", "Super, ich freu mich! 😊", 60 * 24 * 23 - 40);
  nachricht("u-a", "p-leitung", "Die Probenpläne für den Herbst hängen an der Pinnwand.", 60 * 24 * 16);
  nachricht("u-a", "p-leitung", "Hier sind die Noten für das Herbstkonzert – bitte bis Dienstag üben.", 60 * 24 * 9, st1 ? { anlagen: [{ art: "noten", name: `${w1?.titel || "Noten"} – ${st1.bezeichnung}`, stimme_id: st1.id, werk_id: st1.werk_id }] } : {});
  nachricht("u-a", "p-leitung", "", 60 * 24 * 2, { umfrage: { frage: "Wer fährt mit dem Bus zum Konzert nach Unna?", optionen: ["Ich fahre mit dem Bus", "Ich werde gebracht", "Weiß ich noch nicht"], mehrfach: false },
    umfrage_stimmen: Object.fromEntries(d.gruppe_zuordnung.filter((z) => z.gruppe_id === "g-a").slice(0, 14).map((z, i) => [z.person_id, [i % 3 === 2 ? 1 : 0]])) });
  nachricht("u-a", demoSchueler?.id || "p-leitung", "Brauchen wir für Unna die Mappen mit?", 60 * 24 * 2 - 30);
  const morgen8 = tag(jetzt, 1, 8);
  nachricht("u-b", "p-leitung", "Guten Morgen! Denkt heute an eure Notenmappen. 🎼", 0, { zeit: iso(morgen8), geplant_um: iso(morgen8), wiederholung: "woechentlich" });
  // Pinnwand wie KC: Post-its in 4 Farben (je Verfasser 1 gelb, 2 rosé, 3 hellgrün, 4 hellblau), für alle / bestimmte / nur mich
  const andererSchueler = d.personen.find((p) => p.typ === "schueler" && p.id !== demoSchueler?.id);
  d.pinnwand = [
    { id: "pw-1", text: "Fundsache: schwarzer Cellobogen im Musiksaal – bei Frau Jacka abholen. 🎻", von: "p-leitung", wichtig: false, fuer: "alle", personen: [], farbe: 1, antworten: true, zeit: iso(tag(jetzt, -2, 12)) },
    { id: "pw-2", text: "Herbstkonzert: Kleidung komplett schwarz! 🖤", von: "p-leitung", wichtig: true, fuer: "alle", personen: [], farbe: 2, antworten: true, zeit: iso(tag(jetzt, -6, 9)) },
    { id: "pw-3", text: "Plakate fürs Herbstkonzert hängen ab Montag in der Pausenhalle.", von: "p-lk2", wichtig: false, fuer: "alle", personen: [], farbe: 1, antworten: false, zeit: iso(tag(jetzt, -9, 9)) },
    { id: "pw-4", text: "Stimmzettel für die Bratschen vorbereiten 📝", von: "p-leitung", wichtig: false, fuer: "ich", personen: [], farbe: 3, antworten: false, zeit: iso(tag(jetzt, -1, 8)) },
  ];
  if (andererSchueler) d.pinnwand.push({ id: "pw-5", text: "Wer kann mich am Donnerstag zur Probe mitnehmen? 🚗", von: andererSchueler.id, wichtig: false, fuer: "alle", personen: [], farbe: 1, antworten: true, zeit: iso(new Date(jetzt.getTime() - 3 * 3600000)) });
  if (demoSchueler) d.pinnwand.push({ id: "pw-6", text: `Super Solo heute, ${demoSchueler.vorname}! 👏 Bitte die Cello-Stimme bis Freitag üben.`, von: "p-lk1", wichtig: false, fuer: "personen", personen: [demoSchueler.id], farbe: 1, antworten: true, zeit: iso(new Date(jetzt.getTime() - 40 * 60000)) });
  const pwAlle = d.personen.filter((p) => pwAppPerson(p));
  for (const z of d.pinnwand) z.anzahl = pwEmpfaenger(z, pwAlle).length;
  // gesehen / erledigt: etwa die Hälfte hat den wichtigen Zettel schon gelesen, ein Teil abgehakt
  d.pinnwand_gelesen = [];
  pwAlle.filter((p) => p.id !== "p-leitung" && p.id !== demoSchueler?.id).forEach((p, i) => {
    if (i % 2) return;
    d.pinnwand_gelesen.push({ id: pwGelesenId("pw-2", p.id), zettel_id: "pw-2", person_id: p.id, gesehen_am: iso(tag(jetzt, -5, 10 + (i % 8))), erledigt_am: i % 4 ? null : iso(tag(jetzt, -4, 18)) });
    if (i % 3 === 0) d.pinnwand_gelesen.push({ id: pwGelesenId("pw-1", p.id), zettel_id: "pw-1", person_id: p.id, gesehen_am: iso(tag(jetzt, -1, 17)), erledigt_am: null });
  });
  // ✓✓ angekommen / blaue ✓✓ gelesen je Empfänger (wie KC-CLUB-HAKEN) – für die Nachrichten der Leitung und das Einzelgespräch
  d.nachricht_status = [];
  const empfDemo = (u) => (u.verteiler ? d.gruppe_zuordnung.filter((z) => z.gruppe_id === u.verteiler.split(":")[1]).map((z) => z.person_id) : u.mitglieder || []);
  for (const n of d.nachrichten.filter((x) => !x.geplant_um)) {
    const u = d.unterhaltungen.find((x) => x.id === n.unterhaltung_id);
    if (!u || u.art === "verteiler") continue;
    const andere = [...new Set(empfDemo(u))].filter((p) => p !== n.von);
    n.anzahl = andere.length;
    andere.forEach((p, i) => {
      const t0 = new Date(n.zeit).getTime(), alt = jetzt.getTime() - t0 > 3600000;
      if (!alt && i % 3 === 2 && !n.express) return; // ganz neue Nachricht: noch nicht bei allen angekommen
      const bis = (ms) => iso(new Date(Math.min(t0 + ms, jetzt.getTime() - 30000)));
      d.nachricht_status.push({ id: `${n.id}:${p}`, nachricht_id: n.id, person_id: p, autor_id: n.von, zugestellt_am: bis((1 + i % 5) * 60000),
        gelesen_am: alt || i % 2 === 0 ? bis((6 + i * 7 % 300) * 60000) : null,
        ...(n.express ? { express_antwort: "geoeffnet", express_bestaetigt_am: bis(4 * 60000) } : {}) });
    });
  }
  d.aufgaben = [
    { id: "au-1", titel: "Neue Anschrift melden", art: "aenderung", status: "offen", von_id: demoEltern?.id || null, zustaendig_id: "p-leitung", text: "Wir sind umgezogen: Am Römerberg 12, 59192 Bergkamen.", frist: isoTag(tag(jetzt, 7)) },
    { id: "au-2", titel: "Pressetext Herbstkonzert schreiben", art: "aufgabe", status: "in_arbeit", zustaendig_id: "p-lk2", von_id: "p-leitung", frist: isoTag(tag(konzertTag, -14)) },
  ];
  d.versand = [];
  for (const [t, zeilen] of Object.entries(KOM_STANDARD)) d[t] = structuredClone(zeilen);
  d.kom_ereignisse = [];
  d.aenderungen = [];

  // ---------- 0.22.0: Extras ----------
  // 🔧 Reparatur auch für Ausstattung (Transportcase beim Sattler) · 💛 Sachspende = Inventar
  const caseA = d.ausstattung.find((x) => x.status === "reparatur");
  if (caseA) d.reparaturen.push({ id: "rp-4", ausstattung_id: caseA.id, meldung: "Rolle am Transportcase abgebrochen", status: "in_arbeit", werkstatt_id: "p-w2", kosten: 45, gemeldet_von: "p-lk3", gemeldet_am: isoTag(tag(jetzt, -9)) });
  const fagott = d.inventar.find((i) => i.typ_id === "t-fg"); if (fagott) Object.assign(d.spenden.find((x) => x.id === "sp-3"), { inventar_id: fagott.id });
  // 📜 Mietmaterial & GEMA: das Filmmusik-Medley ist gemietet und GEMA-pflichtig
  Object.assign(d.werke.find((w) => w.id === "w-4"), { verlag: "Musikverlag (Beispiel)", bearbeiter: "J. Beispiel", miete_bis: isoTag(tag(konzertTag, 21)), gema: true });
  for (const w of d.werke) if (!w.verlag && w.rechte === "gemeinfrei") w.verlag = "gemeinfrei";
  // 💛 Förderverein-Mitglieder (ohne Lastschrift): Vorstand und einige Eltern
  d.fv_mitglieder = [...d.personen.filter((p) => p.typ === "foerderverein"), ...d.personen.filter((p) => p.typ === "eltern").filter(() => r() < 0.25)].map((p, i) => ({ id: `fv-${i + 1}`, person_id: p.id, mitglied_nr: String(101 + i),
    eintritt: isoTag(tag(jetzt, -Math.floor(100 + r() * 2000))), beitrag_art: i < 3 ? "einzel" : wahl(["familie", "familie", "einzel", "ermaessigt"]), beitrag: i < 3 ? 24 : wahl([36, 36, 24, 12]), zahlweise: wahl(["ueberweisung", "dauerauftrag"]),
    bezahlt_bis: isoTag(new Date(jetzt.getFullYear() + (r() < 0.8 ? 0 : -1), 11, 31)), austritt: null, notiz: "" }));
  // 🚪 Räume & 🔑 Schlüssel
  d.raeume = [{ id: "rm-1", name: "Musikraum 104", ort: "Städt. Gymnasium, Altbau", plaetze: 60, ausstattung: "Flügel, Beamer, 40 Notenständer", hinweis: "Hausmeister bis 18 Uhr" },
    { id: "rm-2", name: "PZ / Aula", ort: "Städt. Gymnasium", plaetze: 450, ausstattung: "Bühne, Licht, Tonanlage", hinweis: "Nur nach Absprache mit der Schulleitung" },
    { id: "rm-3", name: "Instrumentenraum", ort: "Altbau Keller", plaetze: 0, ausstattung: "Regale, Notenschrank", hinweis: "" }];
  d.schluessel = [{ id: "sl-1", nr: "S-01", raum_id: "rm-1", bezeichnung: "Musikraum 104", person_id: "p-leitung", ausgegeben_am: isoTag(tag(jetzt, -400)), status: "ausgegeben", kaution: 0 },
    { id: "sl-2", nr: "S-02", raum_id: "rm-3", bezeichnung: "Instrumentenraum", person_id: "p-lk3", ausgegeben_am: isoTag(tag(jetzt, -200)), status: "ausgegeben", kaution: 0 },
    { id: "sl-3", nr: "S-03", raum_id: "rm-3", bezeichnung: "Instrumentenraum (Ersatz)", status: "da" },
    { id: "sl-4", nr: "S-04", raum_id: "rm-2", bezeichnung: "PZ Bühnenlager", person_id: "p-lk2", ausgegeben_am: isoTag(tag(jetzt, -30)), rueckgabe_bis: isoTag(tag(jetzt, -2)), status: "ausgegeben", kaution: 20 }];
  // 📄 Papier-Notenexemplare: Mietmaterial Filmmusik-Medley an das A-Orchester ausgegeben
  d.notenexemplare = [];
  for (const st of d.stimmen.filter((x) => x.werk_id === "w-4" && x.register_id).slice(0, 8)) {
    const spieler = d.person_instrument.filter((x) => x.register_id === st.register_id).slice(0, 2);
    spieler.forEach((x, j) => d.notenexemplare.push({ id: `ne-${d.notenexemplare.length + 1}`, stimme_id: st.id, nr: `${st.bezeichnung.slice(0, 3)}-${j + 1}`, person_id: x.person_id, ausgegeben_am: isoTag(tag(jetzt, -40)), zurueck_am: null, zustand: j ? "bleistift" : "gut" }));
  }
  // 📝 Übeaufgaben der Lehrkräfte
  const regDemo = demoSchueler ? d.person_instrument.find((x) => x.person_id === demoSchueler.id)?.register_id : null;
  d.uebeaufgaben = [
    { id: "ua-1", titel: "Air: Takt 1–16 langsam (♩ = 60)", text: "Auf gleichmäßigen Bogen achten, Bindungen genau.", werk_id: "w-2", person_id: demoSchueler?.id || null, von_id: "p-lk1", bis: isoTag(tag(jetzt, 6)), erledigt: [] },
    { id: "ua-2", titel: "Tonleiter G-Dur über 2 Oktaven", text: "Jeden Tag 5 Minuten, mit Metronom.", register_id: regDemo, gruppe_id: "g-a", von_id: "p-lk1", bis: isoTag(tag(jetzt, 10)), erledigt: [] },
    { id: "ua-3", titel: "Brandenburgisches Konzert: Einsätze üben", text: "Takte 40–60 mit Aufnahme mitspielen.", gruppe_id: "g-a", von_id: "p-leitung", bis: isoTag(tag(jetzt, 14)), erledigt: [] }];
  // 🚗 Mitfahrgelegenheiten zur Probenfreizeit und zur nächsten Probe
  d.mitfahrten = [];
  const fahrt = d.termine.find((t) => t.projekt_id === "pr-freizeit"), probe = d.termine.filter((t) => new Date(t.beginn) > jetzt && (t.gruppen || []).includes("g-a")).sort((a, b) => a.beginn.localeCompare(b.beginn))[0];
  const elternA = [...new Set(d.eltern_kind.filter((e) => mitglieder("g-a").includes(e.kind_id)).map((e) => e.eltern_id))];
  if (fahrt && elternA[0]) d.mitfahrten.push({ id: "mf-1", termin_id: fahrt.id, fahrer_id: elternA[0], richtung: "hin", plaetze: 3, abfahrt: "14:30 Uhr Rathausplatz Oberaden", mitfahrer: [] });
  if (probe && elternA[1]) d.mitfahrten.push({ id: "mf-2", termin_id: probe.id, fahrer_id: elternA[1], richtung: "beides", plaetze: 2, abfahrt: "Weddinghofen, Kirche – 15:40 Uhr", mitfahrer: [] });
  // 🛡️ Führungszeugnis-Vermerk (nur Datum): Lehrkräfte ja, eine Begleitperson fehlt noch
  for (const p of d.personen.filter((x) => x.typ === "lehrkraft" || x.id === "p-leitung")) p.fz_vorgelegt_am = isoTag(tag(jetzt, -Math.floor(100 + r() * 1500)));

  // Privatsphäre (⚙️ Mehr): etwa die Hälfte der Schüler zeigt ihren Geburtstag
  d.personen.forEach((p, i) => { if (p.typ === "schueler" && i % 2 === 0) p.freigaben = { geburtstag: true }; });
  d.__konfig = {
    name: "Bachkreis Bergkamen",
    untertitel: "Jugendsinfonieorchester",
    webseite: "https://www.gymnasium-bergkamen.de/bachkreis/",
    leitung_id: "p-leitung",
    demo_personen: { leitung: "p-leitung", lehrkraft: "p-lk1", vorstand: "p-fv2", schueler: demoSchueler?.id, eltern: demoEltern?.id },
    notrufe: [["🚑", "Notruf / Rettungsdienst", "112"], ["🚓", "Polizei", "110"], ["🩺", "Ärztlicher Bereitschaftsdienst", "116117"], ["☠️", "Giftnotruf NRW (Bonn)", "0228 19240"]],
    schule_telefon: "02307 964440",
    freigabe_grenze_eur: 250,
    leih_kaution: 50, leih_gebuehr: 30, abschluss_jahrgang: 12,
    nachfass_tage: 3,
    pinnwand_erinnern_tage: 3,
    express_max_tag: 5,
    bearbeiten_minuten: 15,
    chat_schueler_untereinander: true,
    pinnwand_pause_tage: 7,
    online_fuer: ["leitung", "schueler"], // Vorführung: auch Schüler sehen „Wer ist online“ (im Echtbetrieb Standard nur Leitung & Lehrkräfte)
  };
  for (const t of Object.keys(d)) if (Array.isArray(d[t])) for (const z of d[t]) { z.version = 1; z.erstellt_am = z.erstellt_am || iso(jetzt); z.geaendert_am = z.geaendert_am || iso(jetzt); z.geaendert_von = "Demodaten"; }
  return d;
}
