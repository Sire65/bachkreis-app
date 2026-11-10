// Tabellen-Registry: EINE Beschreibung für lokale Demo-Datenbank, Supabase-Adapter, PC-Verwaltung (Formulare, Listen,
// CSV-Import/-Export) und den Vertragstest (jede Tabelle muss in den Supabase-Migrationen existieren: bk_<name>).
// Keine Tabelle, kein Feld wird anderswo hart codiert (AGENTS.md Regel 4).

// Rollen. „Verwalter“ dürfen in der PC-Verwaltung arbeiten (Leitung, Vorstand Förderverein, Lehrkräfte, Admin).
export const ROLLEN = {
  entwickler: "Entwickler (technische Verantwortung, bleibt immer)",
  admin: "Admin (Bachkreis-App)",
  leitung: "Leitung",
  lehrkraft: "Lehrkraft",
  vorstand: "Vorstand Förderverein",
  instrumentenwart: "Instrumentenwart",
  notenwart: "Notenwart",
  registerfuehrer: "Registerführer",
  terminplaner: "Terminplaner (trägt Termine ein)",
  schueler: "Schüler",
  eltern: "Eltern",
};
// 🧑‍💻 0.43.0 Rollen-Stufen (Wunsch Hansi 08.11.: „vorsehen, dass ich der Entwickler bin und bleibe, aber später ein eigener Admin die Bachkreis-App
// administriert – wer, ist noch unklar“): Entwickler ⊃ Admin. Der Entwickler hat alle Admin-Rechte plus den technischen Bereich (Server, Datenbank-
// Überwachung im Detail, Rollen vergeben). Die Rollen „entwickler“ und „admin“ vergibt und entzieht NUR der Entwickler; einen Zugang (Code/Link)
// für eine Person mit diesen Rollen stellt nur der Entwickler aus. Erzwungen im Server (regeln.js), Anzeige in Zahnrad und Admin-Bereich.
export const HOCH_ROLLEN = ["entwickler", "admin"];
export const rollenMit = (r = []) => (Array.isArray(r) && r.includes("entwickler") && !r.includes("admin") ? [...r, "admin"] : Array.isArray(r) ? r : []);
export const istEntwicklerRolle = (r = []) => (r || []).includes("entwickler");
// Welche Ansicht des Zahnrads? kinder · eltern · leitung · admin · entwickler (höchste passende)
export function einstStufe(person, rollen = person?.rollen || [], kindAnsicht = false) {
  if (rollen.includes("entwickler")) return "entwickler";
  if (rollen.includes("admin")) return "admin";
  if (rollen.some((r) => ["leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart", "terminplaner"].includes(r))) return "leitung";
  if (person?.typ === "eltern" || rollen.includes("eltern")) return "eltern";
  if (person?.typ === "schueler" || kindAnsicht) return "kinder";
  return "eltern";
}
// 🛠️ App-weite Einstellungen, die nur Admin/Entwickler ändern (Server prüft in konfig_setzen); alles andere darf weiter die Leitung
export const ADMIN_KONFIG = ["wartung", "wartung_text", "module_aus", "express_max_tag", "bearbeiten_minuten", "chat_schueler_untereinander", "ansicht_kind_ab_klasse",
  "freigabe_grenze_eur", "km_satz", "grenze_db_mb", "grenze_dateien_mb", "grenze_volumen_gb", "aenderungen_monate", "loeschfrist_monate"];
// 🚦 Module, die der Admin für alle abschalten kann (wie KC „Freigaben“): abgeschaltet sehen sie nur noch Admin/Entwickler (zum Prüfen)
export const MODULE = { fotoalbum: "📷 Fotoalbum", advent: "🎄 Adventskalender", vorschlaege: "💡 Vorschläge & Abstimmungen", erstattung: "💶 Erstattung",
  anrufe: "📞 Anrufe & Video", tisch: "🪑 Runder Tisch", fernhilfe: "🛟 Fernhilfe", geheim: "🔒 Geheim schreiben", protokolle: "🗒️ Protokolle", quiz: "🧠 Quiz", buehne: "🎭 Bühne", uebebuehne: "🎤 Übe-Bühne", chronik: "📜 Chronik", mitfahrboerse: "🚗 Mitfahrbörse", austausch: "🏠 Austausch & Gastfamilien" };
export const VERWALTER = ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"];
const L = ["admin", "leitung"];
const LL = ["admin", "leitung", "lehrkraft"];
const ALLE_VERWALTER = VERWALTER;
const PLANER = [...VERWALTER, "terminplaner"]; // dürfen alle Termine und Rückmeldungen sehen
export const TERMIN_PLANER = ["admin", "leitung", "lehrkraft", "terminplaner"]; // dürfen Termine anlegen und ändern
// 🔒 Need-to-know (0.20.0): Wer die Personentabelle lesen darf, aber nicht Leitung/Lehrkraft ist, bekommt fremde Personen nur mit
// diesen Feldern (zusätzlich zu Name, Art, Status). Kinder: nie Geburtsdatum, Adresse oder Gesundheit. Freigaben der Person gelten zusätzlich.
export const PERSONEN_VOLL = ["admin", "leitung", "lehrkraft"];
export const PERSONEN_SICHT = {
  vorstand: { schueler: ["jahrgang"], eltern: ["email", "mobil", "telefon", "strasse", "plz", "ort", "kontakt_ok"], sonst: ["email", "mobil", "telefon", "strasse", "plz", "ort", "firma", "kontakt_ok"] },
  instrumentenwart: { schueler: ["jahrgang"], eltern: ["email", "mobil", "telefon"], sonst: ["email", "mobil", "telefon", "firma"] },
  notenwart: { schueler: ["jahrgang"], eltern: [], sonst: ["email", "firma"] },
};
// 📋 Anwesenheit (0.20.0): „ja“/„nein“ wie bisher, dazu verspätet und entschuldigt. Zählt als da: ja, spaet.
export const ANWESENHEIT = { ja: ["✅", "da"], spaet: ["⏰", "verspätet"], entschuldigt: ["🟡", "entschuldigt"], nein: ["❌", "fehlte unentschuldigt"] };
export const ANWESENHEIT_NAMEN = { "": "nicht erfasst", ...Object.fromEntries(Object.entries(ANWESENHEIT).map(([k, [, t]]) => [k, t])) };
// 📷 Einwilligungen je Zweck (0.20.0): Genehmigungs-Vorlagen tragen einen Zweck; Foto-Zwecke ergeben die Foto-Liste
export const GENEHMIGUNG_ZWECKE = { teilnahme: "Teilnahme & Datenschutz", foto_intern: "📷 Fotos intern (App, nur Mitglieder)", foto_website: "📷 Fotos Schul-Website",
  foto_presse: "📷 Fotos Presse", foto_social: "📷 Fotos Social Media", reise: "Fahrt / Freizeit", leihvertrag: "Leihvertrag Instrument", gesundheit: "Gesundheit / Erste Hilfe", uebeaufnahmen: "🎙️ Übe-Aufnahmen an die Lehrkraft", sonstiges: "Sonstiges" };
// 🎭 Übe-Bühne (0.26.0): Arten von Übeaufgaben, Demo-Stücke (= musik.js STUECKE), Tonarten (= uebematerial.js TONARTEN)
export const UEBE_ARTEN = { frei: "📝 Freie Aufgabe", notenstelle: "🎼 Notenstelle mitspielen", rhythmus: "🥁 Rhythmus", tonleiter: "🎵 Tonleiter", tonhalten: "🎯 Ton halten (Stimmgerät)", gehoer: "👂 Ohr-Spiel", material: "📎 Eigenes Material (PDF / Vorspiel)" };
export const UEBE_STUECKE = { menuett: "Menuett G-Dur (Petzold)", kanon: "Kanon in D (Pachelbel)", freude: "Ode an die Freude (Beethoven)", nachtmusik: "Eine kleine Nachtmusik (Mozart)", largo: "Largo (Dvořák)", fanfare: "Bachkreis-Fanfare" };
export const UEBE_TONARTEN = { C: "C-Dur", G: "G-Dur", D: "D-Dur", A: "A-Dur", E: "E-Dur", F: "F-Dur", B: "B-Dur", Es: "Es-Dur", a: "a-Moll", e: "e-Moll", h: "h-Moll", d: "d-Moll", g: "g-Moll" };
export const UEBE_SPIELE = { hoehe: "Höher oder tiefer?", durmoll: "Dur oder Moll?", nachklatschen: "Rhythmus nachklatschen" };
export const UEBE_MODI = { mitspielen: "Mitspielen", griffe: "Noten & Griffe", rhythmus: "Rhythmus", stimmen: "Stimmgerät", gehoer: "Ohr-Spiele" };
export const UEBE_AUFNAHME_TAGE = 30;
// 🏫 Abgleich mit der Internetseite (0.27.0): Austausch & Gastfamilien, Auftrittsanfragen, Chronik, Dokumente, Partner
export const GASTGEBER_STATUS = { angeboten: "angeboten", bestaetigt: "✅ bestätigt", abgesagt: "abgesagt" };
export const ANFRAGE_STATUS = { neu: "🆕 neu", pruefung: "🔎 in Prüfung", zugesagt: "✅ zugesagt", abgesagt: "❌ abgesagt", erledigt: "🏁 erledigt" };
export const ANFRAGE_BESETZUNG = { a: "A-Orchester", b: "B-Orchester", beide: "A- und B-Orchester", ensemble: "kleines Ensemble", streicher: "Streicher-Ensemble", blaeser: "Bläser-Ensemble", kammer: "Kammermusik" };
export const CHRONIK_ARTEN = { gruendung: "🎉 Gründung", konzert: "🎼 Konzert", reise: "✈️ Reise / Tournee", austausch: "🤝 Austausch", cd: "💿 CD / Aufnahme", urauffuehrung: "🆕 Uraufführung", partner: "🏛️ Partnerschaft", auszeichnung: "🏆 Auszeichnung", sonstiges: "📌 Sonstiges" };
export const DOKUMENT_ARTEN = { satzung: "📜 Satzung", flyer: "📰 Flyer", formular: "📝 Formular / Antrag", vorlage: "📄 Vorlage", info: "ℹ️ Information", protokoll: "🗒️ Protokoll" };
export const DOKUMENT_SICHT = { alle: "alle", eltern: "nur Eltern", schueler: "nur Schüler", verwaltung: "nur Leitung & Verwaltung", leitung: "🏢 Büro: nur Leitung & Lehrkräfte", vorstand: "🏢 Büro: Vorstand & Leitung" };
// 🏢 Büro (0.33.0, wie KC-CLUB-BUERO-RAUM): Ordner im Regal – Registry, nichts fest verdrahtet. sicht = Vorgabe für neue Dokumente im Ordner.
export const BUERO_ORDNER = {
  protokolle: { sym: "🗒️", t: "Protokolle", farbe: "#5d6f82", sicht: "leitung", u: "Besprechungen, Elternabende, Vorstand" },
  noten: { sym: "🎼", t: "Noten & Bearbeitungen", farbe: "#677662", sicht: "leitung", u: "Arrangements, Stimmen, Probenpläne" },
  grafik: { sym: "🎨", t: "Grafik & Design", farbe: "#806548", sicht: "leitung", u: "Logo, Plakate, Programmhefte, Fotos" },
  vorlagen: { sym: "📄", t: "Vorlagen", farbe: "#6e6a5c", sicht: "leitung", u: "Briefbogen, Elternbrief, Einladung, Urkunde" },
  elternbriefe: { sym: "✉️", t: "Elternbriefe", farbe: "#7d6b7f", sicht: "leitung", u: "Geschriebene und verschickte Briefe" },
  konzerte: { sym: "🎭", t: "Konzerte & Programme", farbe: "#816753", sicht: "leitung", u: "Programme, Abläufe, Bühnenpläne" },
  vertraege: { sym: "📑", t: "Verträge", farbe: "#55606b", sicht: "leitung", u: "Leihverträge, Vereinbarungen, Mieten" },
  presse: { sym: "📰", t: "Presse", farbe: "#62716b", sicht: "leitung", u: "Artikel, Pressetexte, Fotos für die Presse" },
  finanzen: { sym: "💶", t: "Förderverein & Finanzen", farbe: "#696d50", sicht: "vorstand", u: "Haushalt, Spenden, Kassenprüfung" },
  schule: { sym: "🏫", t: "Schule & Organisation", farbe: "#4f6d7a", sicht: "leitung", u: "Absprachen mit der Schule, Räume, Fristen" },
  archiv: { sym: "🗄️", t: "Archiv", farbe: "#5f5a57", sicht: "leitung", u: "Ältere Unterlagen" },
};
// Wer darf ein Büro-Dokument sehen und ändern? (gleiche Regel in App und Server)
export const BUERO_ROLLEN = { leitung: ["admin", "leitung", "lehrkraft"], vorstand: ["admin", "leitung", "vorstand"] };
export const bueroDarf = (sichtbar, rollen = []) => !BUERO_ROLLEN[sichtbar] || BUERO_ROLLEN[sichtbar].some((r) => rollen.includes(r));
export const bueroZugang = (rollen = []) => ["admin", "leitung", "lehrkraft", "vorstand"].some((r) => rollen.includes(r));
export const PARTNER_ARTEN = { musikschule: "🎓 Musikschule", orchester: "🎻 Orchester", austausch: "🤝 Austausch-Partner", schule: "🏫 Schule", kirche: "⛪ Kirche / Chor", stadt: "🏛️ Stadt / Kreis", presse: "📰 Presse", sonstige: "📌 Sonstige" }; // Übe-Aufnahmen der Kinder werden nach 30 Tagen gelöscht
export const FOTO_ZWECKE = ["foto_intern", "foto_website", "foto_presse", "foto_social"];
export const MITFAHRT_ARTEN = { angebot: "🚗 biete Plätze", gesuch: "🙋 suche Mitfahrt" };
export const PROGRAMM_ARTEN = { werk: "🎼 Werk", pause: "☕ Pause", ansage: "🎤 Ansage / Moderation", zugabe: "🔁 Zugabe", sonstiges: "Sonstiges" };
// ⚖️ 0.55.0 Datenschutz & Nutzungsregeln: Stand der Texte – ändert er sich, fragt die App beim nächsten Start erneut
// 🟢 0.58.0 Mein Status (wie KC „Mein Status“): verfügbar, beschäftigt, Urlaub, krank, nicht erreichbar – mit „bis“ und Hinweis
export const STATUS_ARTEN = { verfuegbar: ["🟢", "verfügbar"], beschaeftigt: ["🟠", "beschäftigt"], urlaub: ["🏖️", "im Urlaub"], krank: ["🤒", "krank"], abwesend: ["🔴", "nicht erreichbar"] };
export const statusId = (pid) => "st-" + pid;
// gilt der Status noch? Nach dem „bis“-Tag (oder bei „verfügbar“) → null = verfügbar
export function statusWirksam(s, heute = new Date().toISOString().slice(0, 10)) {
  if (!s || s.geloescht_am || !STATUS_ARTEN[s.status] || s.status === "verfuegbar") return null;
  return s.bis && String(s.bis).slice(0, 10) < heute ? null : s;
}
// 🎟️ 0.56.0 Konzertkarten
export const KARTEN_STATUS = { reserviert: "reserviert", abgeholt: "abgeholt", storniert: "storniert" };
export const KARTEN_ROLLEN = ["admin", "leitung", "vorstand"];
export const KARTEN_JE_STANDARD = 6;
export const KARTEN_CODE_ZEICHEN = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // ohne 0/O, 1/I/L
export const DS_VERSION = "2026-11-09";
export const ZUSTIMMUNG_ARTEN = { datenschutz: "Datenschutzerklärung gelesen", regeln: "Nutzungsregeln angenommen" };
export const ZUSTIMMUNG_NACHWEIS = ["admin", "leitung", "vorstand"];
// 📥 0.53.0 Eingangskorb: wer anderen etwas hineinlegen darf
export const EK_VERTEILER = ["admin", "leitung", "lehrkraft", "vorstand"];
export const EK_QUELLEN = { teilen: "📲 geteilt", druck: "🖨️ aus der Druckvorschau", leitung: "📤 von der Leitung", notiz: "📝 Notiz" };
// 📝 0.52.0 Leihvertrag-Formular
export const LV_STATUS = { entwurf: "✏️ Entwurf", wartet: "✍️ wartet auf Unterschrift", unterschrieben: "✅ unterschrieben", beendet: "↩️ zurückgegeben" };
export const LV_VERWALTER = ["admin", "leitung", "vorstand", "instrumentenwart"];
export const LV_ROLLEN = { mitglied: "Mitglied (Entleiher/in)", eltern: "Erziehungsberechtigte/r", bachkreis: "für den Bachkreis" };
export const LV_KLAUSEL = `1. Das Instrument und das Zubehör bleiben Eigentum des Bachkreises (bzw. seines Fördervereins) und werden nur für das Musizieren im Bachkreis und den Unterricht überlassen.
2. Instrument und Zubehör sind pfleglich zu behandeln: trocken lagern, nicht in die Nähe von Heizung oder Sonne, nicht im Auto liegen lassen, nach dem Spielen reinigen.
3. Reparaturen und Einstellarbeiten macht nur der Bachkreis bzw. eine von ihm beauftragte Werkstatt. Eigene Eingriffe sind nicht erlaubt.
4. Schäden, Verlust oder Diebstahl sind sofort zu melden (bei Diebstahl mit Anzeige bei der Polizei).
5. Für Schäden, die über die normale Abnutzung hinausgehen, sowie bei Verlust haftet die/der Entleiher/in – bei Minderjährigen die Erziehungsberechtigten – bis zur Höhe der Reparaturkosten bzw. des Zeitwerts. Eine bestehende Versicherung wird zuerst in Anspruch genommen; die Kaution kann verrechnet werden.
6. Eine Weitergabe an Dritte ist nicht erlaubt.
7. Die Rückgabe erfolgt zum vereinbarten Termin, bei Austritt aus dem Bachkreis oder auf Anforderung – vollständig und gereinigt. Die Kaution wird nach ordnungsgemäßer Rückgabe erstattet.`;
export const LEIH_ZUBEHOER = { koffer: "Koffer / Tasche", bogen: "Bogen", kolophonium: "Kolophonium", schulterstuetze: "Schulterstütze", mundstueck: "Mundstück", gurt: "Gurt", rohre: "Rohrblätter", pflege: "Pflegeset", staender: "Ständer" };
export const TEILNAHME = { pflicht: ["❗", "Teilnahme erforderlich"], erwuenscht: ["🙂", "Teilnahme erwünscht"], info: ["ℹ️", "Nur zur Info"] };

export const PERSONEN_TYPEN = {
  schueler: "Schüler/in",
  eltern: "Eltern / Erziehungsberechtigte",
  leitung: "Leitung",
  lehrkraft: "Lehrkraft",
  foerderverein: "Förderverein",
  unterstuetzer: "Unterstützer",
  spender: "Spender",
  partner: "Partner (Schule, Orchester, Musikschule)",
  dienstleister: "Dienstleister (Werkstatt, Händler)",
  ehemalig: "Ehemalige",
};

// BK Communicator: Kanäle, Status, Prioritäten, Ereignisse (gemeinsam für App, Verwaltung und Server)
export const KOM_KANAELE = { push: "Push", mail: "E-Mail", app: "In der App", whatsapp: "WhatsApp-Übergabe" };
export const KOM_KANAELE_VERSAND = { push: "Push", mail: "E-Mail", app: "In der App" };
export const KOM_PRIORITAET = { normal: "normal", hoch: "hoch", kritisch: "kritisch (Notfall)" };
export const KOM_STATUS = {
  wartend: "wartet", in_arbeit: "in Arbeit", gesendet: "gesendet", zugestellt: "zugestellt", angezeigt: "angezeigt", geoeffnet: "geöffnet", quittiert: "bestätigt",
  erneut: "Wiederholung geplant", tot: "aufgegeben", fehler: "Fehler", unterdrueckt: "unterdrückt", simuliert: "simuliert (Demo)", uebergeben: "übergeben", vorgemerkt: "vorgemerkt",
};
export const KOM_EREIGNISSE = {
  termin_neu: "Neuer Termin", termin_geaendert: "Termin geändert/abgesagt", erinnerung: "Erinnerung vor Terminen", nachfassen: "Nachfassen bei fehlender Antwort",
  nachricht: "Neue Nachricht", nachricht_wichtig: "❗ Wichtige Nachricht", express: "🏎️ Express-Sendung", rundschreiben: "Rundschreiben", genehmigung: "Genehmigung angefragt", instrument: "Leihinstrument (Rückgabe, Schaden)", pinnwand: "Pinnwand-Zettel", sos: "SOS / Notfall",
  test: "Test", standard: "alle anderen (Standard)",
};

// ---------- Instrumentengruppen (Kacheln, Liste, Drehregister) ----------
export const INSTRUMENT_GRUPPEN = { streicher: ["🎻", "Streicher"], holz: ["🪈", "Holzbläser"], blech: ["🎺", "Blechbläser"], schlag: ["🥁", "Schlagwerk"], tasten: ["🎹", "Tasten & Harfe"], sonstige: ["🎵", "Sonstiges"] };
export const INSTRUMENT_GRUPPEN_NAMEN = Object.fromEntries(Object.entries(INSTRUMENT_GRUPPEN).map(([k, [, n]]) => [k, n]));

// ---------- 📦 Inventar (0.19.0): Status, Eigentümer, Abschreibung – gemeinsam für Instrumente und Ausstattung ----------
export const INVENTAR_STATUS = { verfuegbar: "verfügbar", im_einsatz: "im Einsatz (fest)", verliehen: "verliehen", reparatur: "in Reparatur", defekt: "defekt",
  vermisst: "vermisst / verloren", gestohlen: "gestohlen", ausgemustert: "ausgemustert", verkauft: "verkauft", verschrottet: "verschrottet / entsorgt" };
export const INVENTAR_ABGANG = ["ausgemustert", "verkauft", "verschrottet", "gestohlen"]; // nicht mehr im Bestand (Abgang im Anlagenverzeichnis)
export const INVENTAR_PROBLEM = ["reparatur", "defekt", "vermisst", "gestohlen"];
export const EIGENTUEMER = { foerderverein: "Förderverein", schule: "Schule / Schulträger", leihgabe: "Leihgabe Dritter", privat: "privat" };
export const AFA_ARTEN = { linear: "linear über die Nutzungsdauer", sofort: "sofort (geringwertig, GWG)", keine: "keine Abschreibung" };
export const AUSSTATTUNG_KATEGORIEN = {
  notenstaender: ["🎼", "Notenständer & Pultleuchten", 10], dirigent: ["🪄", "Dirigentenpult & Taktstock", 10], stuhl: ["🪑", "Stühle & Hocker", 10],
  schlagwerk: ["🥁", "Schlagwerk-Zubehör", 8], koffer: ["🧳", "Koffer, Taschen & Transport", 5], technik: ["🎤", "Ton- & Videotechnik", 5],
  licht: ["💡", "Licht, Strom & Kabel", 8], notenarchiv: ["📚", "Notenmappen & Archiv", 10], edv: ["💻", "Büro & EDV", 3], moebel: ["🗄️", "Möbel & Schränke", 13],
  kleidung: ["👕", "Kleidung & Auftritt", 3], pflege: ["🧴", "Pflege & Ersatzteile", 1], sonstiges: ["📦", "Sonstiges", 5],
};
export const AUSSTATTUNG_KATEGORIEN_NAMEN = Object.fromEntries(Object.entries(AUSSTATTUNG_KATEGORIEN).map(([k, [, n]]) => [k, n]));
export const ND_INSTRUMENT = 10; // Richtwert Nutzungsdauer Musikinstrumente (Jahre) – mit Kassenprüfung/Steuerberatung abstimmen
export const GWG_GRENZE = 800; // € – bis hierhin standardmäßig Sofortabschreibung
// Felder, die Instrumente und Ausstattung gemeinsam haben (Anschaffung, Abschreibung, Verbleib)
const INV_FELDER = [
  { k: "seriennummer", t: "Seriennummer", typ: "text" },
  { k: "eigentuemer", t: "Eigentümer", typ: "wahl", werte: EIGENTUEMER },
  { k: "haendler", t: "gekauft bei", typ: "text" },
  { k: "beleg", t: "Beleg / Rechnungs-Nr.", typ: "text" },
  { k: "garantie_bis", t: "Garantie bis", typ: "datum" },
  { k: "afa_art", t: "Abschreibung", typ: "wahl", werte: AFA_ARTEN },
  { k: "afa_jahre", t: "Nutzungsdauer (Jahre, leer = Richtwert)", typ: "zahl" },
  { k: "verantwortlich_id", t: "verantwortlich", typ: "ref", ref: "personen", filter: (p) => ["leitung", "lehrkraft", "foerderverein"].includes(p.typ) },
  { k: "inventur_am", t: "zuletzt gesehen (Inventur)", typ: "datum" },
  { k: "ausgeschieden_am", t: "ausgeschieden am (verkauft, gestohlen …)", typ: "datum" },
  { k: "ausgeschieden_grund", t: "Grund / Verbleib (z. B. Anzeige-Nr., Käufer)", typ: "text" },
];

// ---------- Nachrichten (gemeinsam für App und Server) ----------
export const CHAT = { bearbeitenMin: 15, expressMax: 5, zeichen: 4000, expressUnbegrenzt: ["admin", "leitung"], anlagenMax: 10, selbstloeschenStd: [1, 24, 168] };
// 📎 Anhänge (Fotos, Sprachnachrichten, Dateien, Noten): höchstens DATEI.max Bytes je Datei, nur diese Arten
export const DATEI = { max: 8 * 1024 * 1024, arten: ["bild", "sprache", "datei", "noten", "video"],
  mime: /^(image\/(jpeg|png|gif|webp|heic|heif)|audio\/(webm|ogg|mp4|mpeg|aac|x-m4a|wav)|video\/(mp4|webm|quicktime)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.oasis\.opendocument\.[a-z.]+|vnd\.ms-excel|zip)|text\/(plain|csv))$/ };
export const nachrichtAbgelaufen = (n, jetzt = new Date().toISOString()) => !!n.loescht_am && n.loescht_am <= jetzt;
export const nsId = (nachrichtId, personId) => `${nachrichtId}:${personId}`;
// Geplante Nachrichten (⏰) sieht bis zur Sendezeit nur der Absender
export const nachrichtFrei = (n, jetzt = new Date().toISOString()) => !n.geplant_um || !!n.geplant_frei || n.geplant_um <= jetzt;
// Mit wem darf jemand eine eigene Unterhaltung (Einzelchat/Runde) anfangen? Kinderschutz: Eltern schreiben privat nur Leitung,
// Lehrkräften, Verwaltern und den eigenen Kindern; Schüler nur Schülern (abschaltbar), Leitung, Lehrkräften und den eigenen Eltern.
// verwandt = Eltern-Kind-Beziehung zwischen beiden. Verwalter dürfen mit allen App-Nutzern schreiben.
// 🛡️ Kinderschutz (0.20.0): Erwachsene schreiben Kindern privat nur, wenn sie Leitung oder Lehrkraft sind (nicht Notenwart,
// Instrumentenwart, Vorstand …) – und bei Minderjährigen sind die Eltern automatisch dabei (elternInKopie, konfig.chat_eltern_kopie).
const fuehrt = (x) => ["leitung", "lehrkraft"].includes(x.typ) || rollenMit(x.rollen).some((r) => ["admin", "leitung", "lehrkraft"].includes(r));
export function chatPartnerErlaubt(ich, p, { verwandt = false, schuelerUntereinander = true } = {}) {
  if (!ich || !p || p.id === ich.id || !pwAppPerson(p)) return false;
  if (verwandt) return true;
  const kind = (x) => x.typ === "schueler";
  if (kind(ich) && kind(p)) return schuelerUntereinander !== false;
  if (kind(ich) || kind(p)) return fuehrt(kind(ich) ? p : ich); // Kind ↔ Erwachsener: nur Leitung und Lehrkräfte
  const verw = (x) => fuehrt(x) || rollenMit(x.rollen).some((r) => VERWALTER.includes(r));
  if (ich.typ === "ehemalig" && p.typ === "ehemalig") return true; // 🎓 Ehemalige untereinander (0.21.0)
  return verw(ich) || verw(p);
}
// 📞 0.50.0 Anrufe, 🪑 Runder Tisch, 🛟 Fernhilfe – Kinderschutz: Minderjährige telefonieren nur mit den eigenen Eltern (verwandt);
// unter Erwachsenen gelten die Chat-Regeln. Runder Tisch und Fernhilfe nur für Erwachsene; Fernhilfe leistet nur Leitung/Admin.
export const ANRUF_ARTEN = { audio: "📞 Anruf", video: "🎥 Videoanruf", fernhilfe: "🛟 Fernhilfe", tisch: "🪑 Runder Tisch (Verbindung)", tisch_da: "🪑 Runder Tisch (anwesend)" };
export const ANRUF_STATUS = { klingelt: "📳 klingelt", angenommen: "✅ läuft", abgelehnt: "✖ abgelehnt", beendet: "⏹️ beendet", verpasst: "📵 verpasst" };
export const FERNHILFE_HELFER = ["admin", "leitung"];
export const erwachsen = (p) => !!p && !(p.typ === "schueler" && istMinderjaehrig(p));
export function anrufErlaubt(ich, p, { verwandt = false, art = "audio" } = {}) {
  if (!ich || !p || ich.id === p.id || !pwAppPerson(p)) return false;
  if (art === "fernhilfe") return erwachsen(ich) && erwachsen(p) && (rollenMit(ich.rollen).some((r) => FERNHILFE_HELFER.includes(r)) || rollenMit(p.rollen).some((r) => FERNHILFE_HELFER.includes(r)));
  if (!erwachsen(ich) || !erwachsen(p)) return verwandt; // 🔒 Kinder: nur mit den eigenen Eltern
  return chatPartnerErlaubt(ich, p, { verwandt });
}
// 👪 Elternrechte (0.21.0): bei volljährigen Schülern nur noch, wenn das Kind es erlaubt (eltern_kind.zugriff_ab_18)
export const elternZugriff = (e, kind) => !!e && (!kind || (kind.typ === "schueler" ? istMinderjaehrig(kind) || e.zugriff_ab_18 === true : kind.typ === "ehemalig" ? e.zugriff_ab_18 === true : true));
// Kontaktdaten, die Eltern für ihre Kinder selbst ändern dürfen (ohne Umweg über „Änderung melden“)
export const KIND_KONTAKT = ["mobil", "email", "telefon", "strasse", "plz", "ort", "schule"];
// Unter 18 (ohne Geburtsdatum: als minderjährig behandelt)
export function istMinderjaehrig(p, heute = new Date()) {
  if (!p || p.typ !== "schueler") return false;
  if (!p.geburtsdatum) return true;
  const g = new Date(p.geburtsdatum + "T12:00:00");
  return heute < new Date(g.getFullYear() + 18, g.getMonth(), g.getDate());
}
// Kommen bei einer privaten Unterhaltung von ich mit p die Eltern von p dazu? (Erwachsener ↔ minderjähriges, fremdes Kind)
export const elternInKopie = (ich, p, { verwandt = false, kopie = true } = {}) => kopie !== false && !verwandt && !!ich && ich.typ !== "schueler" && istMinderjaehrig(p);
// Mitglieder einer neuen privaten Unterhaltung inkl. Eltern in Kopie. elternVon(id) → Eltern-IDs, verwandt(id) → bool
export function chatMitgliederMitKopie(ich, andere, { person, elternVon, verwandt = () => false, kopie = true }) {
  const dazu = [];
  for (const id of andere) if (elternInKopie(ich, person(id), { verwandt: verwandt(id), kopie })) for (const e of elternVon(id)) if (e !== ich.id && !andere.includes(e) && !dazu.includes(e)) dazu.push(e);
  return { mitglieder: [ich.id, ...andere, ...dazu], kopie: dazu };
}

// ---------- Pinnwand (gemeinsam für App und Server) ----------
// 📣 Startnachricht (0.30.0): Empfänger-Regel – gleich in App und Server
export const SN_AN = { alle: "alle", gruppen: "bestimmte Orchester", personen: "bestimmte Personen" };
export const SN_ANTWORTEN = { gelesen: "✓ gelesen", ja: "✅ Ja", spaeter: "⏰ Später", nein: "✖ Nein" };
export const SN_SPAETER_STD = 24;
export const snAntwortId = (nid, pid) => `sna-${nid}-${pid}`;
// 💬 0.38.0 (wie KC-CLUB-STUMM / -CHAT-ARCHIV / -CHAT-FAVORITEN / -MERKEN): je Person und Chat bzw. Nachricht – feste ids, damit nichts doppelt entsteht
export const ceId = (uid, pid) => `ce-${uid}-${pid}`;
export const cmId = (nid, pid) => `cm-${nid}-${pid}`;
export const STUMM_IMMER = "2999-12-31T00:00:00.000Z";
export const ANGEHEFTET_MAX = 3;
// 🗳️ 0.39.0 Terminumfrage (wie KC Terminumfrage / Doodle): mögliche Termine ankreuzen, die Leitung entscheidet → daraus wird ein Termin
export const TU_AN = { mitglieder: "👥 Mitglieder der Orchester (Kinder sagen selbst)", eltern: "👪 Eltern", verwaltung: "🧑‍🏫 Leitung, Lehrkräfte & Vorstand" };
export const TU_STIMMEN = { ja: "✅ passt", vielleicht: "🤔 notfalls", nein: "❌ geht nicht" };
export const TU_PLANER = ["admin", "leitung", "lehrkraft", "vorstand", "terminplaner"];
export const tuAntwortId = (uid, pid) => `tua-${uid}-${pid}`;
// 📷 0.40.0 Fotoalbum (wie KC-CLUB-FOTOALBUM / -FOTO-ALBEN / Papierkorb / Diashow): Alben für alle oder nur das Team; Fotos laden Erwachsene hoch,
// markierte Kinder brauchen die Foto-Einwilligung „intern (App)“ – das prüft der Server. Papierkorb 30 Tage, dann endgültig.
export const FOTO_SICHT = { alle: "👥 alle im Bachkreis", verwaltung: "🔒 nur Leitung, Lehrkräfte & Vorstand" };
export const FOTO_HOCHLADEN = ["admin", "leitung", "lehrkraft", "vorstand", "eltern"];
export const FOTO_PAPIERKORB_TAGE = 30;
// 💡🗳️ 0.41.0 Vorschläge & Abstimmungen (wie KC-CLUB-ABSTIMMUNG / Vorschläge): Ideen einreichen und unterstützen 👍, Abstimmungen mit Frist –
// auf Wunsch geheim (dann sieht niemand, wer wie gestimmt hat, auch die Leitung nicht).
export const VS_AN = { alle: "👥 alle im Bachkreis", eltern: "👪 Eltern", team: "🧑‍🏫 Leitung, Lehrkräfte & Vorstand", vorstand: "🏛️ Vorstand Förderverein" };
export const VS_ABSTIMMEN = ["admin", "leitung", "lehrkraft", "vorstand"];
export const VS_STANDARD = [{ id: "ja", t: "👍 Ja" }, { id: "nein", t: "👎 Nein" }, { id: "enth", t: "🤷 Enthaltung" }];
// Wer gehört zur Zielgruppe (darf abstimmen bzw. unterstützen)?
export function vsZielgruppe(v, { typ = "", rollen = [], verwalter = false } = {}) {
  if (v.an === "eltern") return typ === "eltern";
  if (v.an === "team") return verwalter;
  if (v.an === "vorstand") return rollen.some((r) => ["admin", "leitung", "vorstand"].includes(r));
  return true;
}
// 🆘💬 0.42.0 Rückmeldungen (wie KC-CLUB-UNTERSTUETZUNG-ANFRAGE + KC-CLUB-FEEDBACK): Problem melden, Hilfe mit der App, Idee, Lob – mit Antwort der Leitung
export const RM_ARTEN = { problem: "🆘 Etwas klappt nicht", hilfe: "🤝 Ich brauche Hilfe mit der App", idee: "💡 Idee für die App", lob: "⭐ Rückmeldung / Lob" };
export const RM_STATUS = { neu: "🆕 neu", in_arbeit: "🔧 in Arbeit", erledigt: "✅ erledigt" };
export const RM_LEITUNG = ["admin", "leitung"];
// 💶 0.42.0 Erstattung (wie KC Erstattung): Fahrtkosten (km × Satz) und Auslagen mit Beleg – prüfen und auszahlen: Vorstand (Kasse) und Leitung
export const ER_ARTEN = { fahrt: "🚗 Fahrtkosten", auslage: "🧾 Auslage (Beleg)" };
export const ER_STATUS = { eingereicht: "📨 eingereicht", genehmigt: "✅ genehmigt", ausgezahlt: "💶 ausgezahlt", abgelehnt: "✖ abgelehnt" };
export const ER_KASSE = ["admin", "leitung", "vorstand"];
// 🛍️ 0.47.0 Bachkreis-Börse (wie KC „Helfen, Leihen & Börse“): Biete · Suche · Helfer gesucht – nur Erwachsene (Kinder nicht, Kinderschutz)
export const BOERSE_ARTEN = { biete: "🎁 Biete", suche: "🔎 Suche", helfer: "🙋 Helfer gesucht" };
export const BOERSE_KAT = { instrument: "🎻 Instrument", noten: "🎼 Noten", kleidung: "👔 Konzertkleidung", zubehoer: "🎒 Zubehör", kuchen: "🍰 Kuchen & Buffet", aufbau: "🪑 Auf- & Abbau", fahrdienst: "🚗 Fahrdienst", sonst: "📦 Sonstiges" };
export const BOERSE_STATUS = { offen: "🟢 offen", reserviert: "🟡 reserviert", erledigt: "✅ erledigt" };
// 🎬 0.48.0 Sitzung vorbereiten & leiten (wie KC-CLUB-SITZUNG-ABLAUF): Vorstand, Elternabend, Leitungsrunde, Mitgliederversammlung
export const SITZUNG_ARTEN = { vorstand: "💛 Vorstandssitzung", elternabend: "👪 Elternabend", leitung: "🎼 Leitungsrunde", mitglieder: "🏛️ Mitgliederversammlung" };
export const SITZUNG_FUER = { vorstand: "Vorstand & Leitung", eltern: "alle Eltern", team: "Leitung & Lehrkräfte", alle: "alle Erwachsenen" };
export const SITZUNG_STATUS = { planung: "📝 in Planung", eingeladen: "📨 eingeladen", laeuft: "🔴 läuft", beendet: "✅ beendet" };
export const SITZUNG_PLANER = ["admin", "leitung", "vorstand"];
export const sitzungFuerMich = (s, person, rollen = []) => !!s && !!person && (s.zielgruppe === "alle" ? person.typ !== "schueler" : s.zielgruppe === "eltern" ? person.typ === "eltern" || rollen.some((r) => ["admin", "leitung"].includes(r))
  : s.zielgruppe === "team" ? rollen.some((r) => ["admin", "leitung", "lehrkraft"].includes(r)) : rollen.some((r) => ["admin", "leitung", "vorstand"].includes(r)));
// 📁 0.48.0 Unterlagen je Person/Familie (wie KC „eigener Archiv-Ordner“): Bescheinigungen, Verträge, Atteste, Rechnungen
export const UNTERLAGEN_ARTEN = { bescheinigung: "🎓 Bescheinigung / Urkunde", vertrag: "📑 Vertrag", attest: "🩺 Attest / Nachweis", rechnung: "🧾 Rechnung / Quittung", einwilligung: "🔐 Einwilligung", sonst: "📄 Sonstiges" };
export const UNTERLAGEN_LEITUNG = ["admin", "leitung"];
export const boerseDarf = (p) => !!p && !(p.typ === "schueler" && istMinderjaehrig(p));
// 📖 0.47.0 Jahrbuch (wie KC „Unser Clubjahr“ + „Mein Clubmoment“): Schuljahr ab 1. August
export const schuljahrVon = (d = new Date()) => { const x = new Date(d), j = x.getMonth() >= 7 ? x.getFullYear() : x.getFullYear() - 1; return `${j}/${String((j + 1) % 100).padStart(2, "0")}`; };
export const ER_KM_SATZ = 0.30; // € je km (Standard, änderbar: konfig.km_satz)
export const erBetrag = (z, satz = ER_KM_SATZ) => (z.art === "fahrt" ? Math.round(Math.max(0, Number(z.km) || 0) * (Number(satz) > 0 ? Number(satz) : ER_KM_SATZ) * 100) / 100 : Math.round(Math.max(0, Number(z.betrag) || 0) * 100) / 100);
export function vsAuszaehlen(v, stimmen = []) {
  const opts = v.art === "abstimmung" ? (v.optionen?.length ? v.optionen : VS_STANDARD) : [{ id: "dafuer", t: "👍 dafür" }];
  const z = Object.fromEntries(opts.map((o) => [o.id, 0])); let n = 0;
  for (const s of stimmen) if (s.wahl && s.wahl in z) { z[s.wahl]++; n++; }
  return { optionen: opts.map((o) => ({ ...o, zahl: z[o.id] })), stimmen: n };
}
// Auszählung: je Option ja/vielleicht/nein; beste = meiste „ja“, dann wenigste „nein“, dann meiste „vielleicht“
export function tuAuszaehlen(umfrage, antworten = []) {
  const opt = (umfrage?.optionen || []).map((o) => ({ ...o, ja: 0, vielleicht: 0, nein: 0 }));
  for (const a of antworten) for (const o of opt) { const s = a.stimmen?.[o.id]; if (s in TU_STIMMEN) o[s]++; }
  const rang = [...opt].sort((a, b) => b.ja - a.ja || a.nein - b.nein || b.vielleicht - a.vielleicht);
  return { optionen: opt, beste: rang[0] && rang[0].ja > 0 ? rang[0].id : null, antworten: antworten.length };
}
// Für wen ist die Umfrage? (gleiche Regel in App und Server)
export function tuFuerMich(u, { gruppen = new Set(), eigeneGruppen = new Set(), kinder = new Set(), verwalter = false } = {}) {
  if (!u || u.geloescht_am) return false;
  if (u.an === "verwaltung") return verwalter;
  const trifft = (gs) => (u.fuer_alle ? gs.size > 0 : (u.gruppen || []).some((g) => gs.has(g)));
  return u.an === "eltern" ? kinder.size > 0 && trifft(gruppen) : trifft(eigeneGruppen);
}
// @Erwähnungen: „@Vorname“ oder „@Vorname Nachname“ im Text → Personen-ids (nur unter den Kandidaten)
export function erwaehnteIn(text, personen = []) {
  const t = String(text || ""), aus = new Set(), esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hat = (x) => new RegExp(`(?:^|[\\s(„"'])${esc(x)}(?![\\p{L}])`, "iu").test(t);
  const zahl = {}; for (const p of personen) if (p.vorname) zahl[p.vorname.toLowerCase()] = (zahl[p.vorname.toLowerCase()] || 0) + 1;
  // „@Vorname Nachname“ immer; „@Vorname“ allein nur, wenn der Vorname eindeutig ist
  for (const p of personen) if (p.vorname && (hat(`@${p.vorname} ${p.nachname || ""}`.trim()) || (zahl[p.vorname.toLowerCase()] === 1 && hat(`@${p.vorname}`)))) aus.add(p.id);
  return [...aus];
}
// gruppen = Gruppen der Person und ihrer Kinder (Eltern bekommen die Nachricht an das Orchester ihres Kindes)
export function snFuerMich(z, ich, gruppen, heute = new Date().toISOString().slice(0, 10)) {
  if (!z || z.geloescht_am || !ich || z.von === ich) return false;
  if (z.bis && String(z.bis) < heute) return false;
  if (z.an === "personen") return (z.personen || []).includes(ich);
  if (z.an === "gruppen") return (z.gruppen || []).some((g) => gruppen.has(g));
  return true;
}
export const PINNWAND = { max: 4, zeichen: 200, erinnernTage: 3, pauseTage: 7 };
// Wer bekommt einen Zettel „für alle“? Alle aktiven Personen mit App (Schüler, Eltern, Leitung, Lehrkräfte, Verwalter) außer dem Verfasser.
// 🟢 Wer ist online / 👋 Anklopfen (wie KC): welche Personenkreise das nutzen, stellt die Leitung im Zahnrad ein (konfig.online_fuer)
export const ONLINE_KREISE = { leitung: "Leitung & Lehrkräfte", schueler: "Schülerinnen & Schüler", eltern: "Eltern" };
export function onlineKreis(p) {
  if (!p) return null;
  if (["leitung", "lehrkraft"].includes(p.typ) || rollenMit(p.rollen).some((r) => VERWALTER.includes(r))) return "leitung";
  return p.typ === "schueler" ? "schueler" : p.typ === "eltern" ? "eltern" : null;
}
export const onlineFuer = (konfig) => (Array.isArray(konfig?.online_fuer) ? konfig.online_fuer.filter((k) => k in ONLINE_KREISE) : ["leitung"]);
export const onlineErlaubt = (p, konfig) => { const k = onlineKreis(p); return !!k && onlineFuer(konfig).includes(k); };
export const pwAppPerson = (p) => !!p && !p.geloescht_am && p.status !== "ausgetreten" && (["schueler", "eltern", "leitung", "lehrkraft", "ehemalig"].includes(p.typ) || rollenMit(p.rollen).some((r) => VERWALTER.includes(r)));
export const pwSichtbar = (z, ich) => !!z && (z.von === ich || (z.fuer || "alle") === "alle" || (z.fuer === "personen" && (z.personen || []).includes(ich)));
export const pwEmpfaenger = (z, personen) => (z.fuer === "ich" ? [] : z.fuer === "personen" ? [...new Set(z.personen || [])].filter((id) => id !== z.von) : personen.filter((p) => pwAppPerson(p) && p.id !== z.von).map((p) => p.id));
export const pwGelesenId = (zettelId, personId) => `${zettelId}:${personId}`;

// Feldtypen: text, lang, email, tel, datum, zeit (Datum+Uhrzeit), zahl, geld, ja, wahl, ref, refs, farbe, liste (Textliste), json
// „intern“ = Spalten, die die App selbst pflegt (nicht im Formular der Verwaltung). vermerk: true = interne Bemerkung, nur für Rollen,
// die die ganze Tabelle lesen dürfen (der Server schickt sie Schülern und Eltern nicht mit).
export const TABELLEN = {
  personen: {
    titel: "Personen", sym: "👥", gruppe: "Stammdaten",
    lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "vorname", t: "Vorname", typ: "text", pflicht: true },
      { k: "nachname", t: "Nachname", typ: "text", pflicht: true },
      { k: "typ", t: "Art", typ: "wahl", werte: PERSONEN_TYPEN, pflicht: true },
      { k: "status", t: "Status", typ: "wahl", werte: { aktiv: "aktiv", pausiert: "pausiert", gast: "Gast/Aushilfe", ausgetreten: "ausgetreten" } },
      { k: "ausgetreten_am", t: "ausgetreten am (Löschfrist beginnt)", typ: "datum" },
      { k: "fz_vorgelegt_am", t: "erweitertes Führungszeugnis eingesehen am (nur Datum, kein Inhalt)", typ: "datum", geschuetzt: true, nur: (z) => !["schueler"].includes(z.typ) },
      { k: "jahrgang", t: "Jahrgangsstufe", typ: "zahl", nur: (z) => z.typ === "schueler" },
      { k: "schule", t: "Schule", typ: "text", nur: (z) => z.typ === "schueler" },
      { k: "firma", t: "Firma / Einrichtung", typ: "text", nur: (z) => ["partner", "dienstleister", "spender", "unterstuetzer"].includes(z.typ) },
      { k: "email", t: "E-Mail", typ: "email" },
      { k: "mobil", t: "Mobil (WhatsApp)", typ: "tel" },
      { k: "telefon", t: "Telefon", typ: "tel" },
      { k: "strasse", t: "Straße", typ: "text" },
      { k: "plz", t: "PLZ", typ: "text" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "geburtsdatum", t: "Geburtsdatum", typ: "datum", nur: (z) => z.typ === "schueler" },
      { k: "rollen", t: "Rollen in der App", typ: "liste", werte: ROLLEN },
      { k: "notfall_info", t: "Notfall-/Gesundheitsinfo (geschützt)", typ: "lang", geschuetzt: true },
      { k: "kontakt_ok", t: "Einwilligung Kontaktaufnahme", typ: "ja" },
      { k: "foto_ok", t: "Foto-Erlaubnis", typ: "ja" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["nachname", "vorname", "typ", "jahrgang", "email", "mobil", "ort"],
    intern: [{ k: "benachrichtigung", typ: "json" }, { k: "freigaben", typ: "json" }, { k: "avatar", typ: "json" }, { k: "uebe_plan", typ: "json" }, { k: "kalender_alarm", typ: "zahl" }, { k: "anonymisiert", typ: "ja" }], // uebe_plan: Übezeiten & Wochenziel · kalender_alarm: Erinnerung in Minuten vor Terminen (Kalender-Abo) · avatar: selbst gestaltetes Gesicht · freigaben: { geburtstag, mobil, email, adresse } (Privatsphäre, setzt die Person selbst)
    anzeige: (z) => `${z.vorname || ""} ${z.nachname || ""}`.trim(),
  },
  eltern_kind: {
    titel: "Eltern ↔ Kind", sym: "👪", gruppe: "Stammdaten", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "eltern_id", t: "Eltern", typ: "ref", ref: "personen", filter: (p) => p.typ === "eltern", pflicht: true },
      { k: "kind_id", t: "Kind", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler", pflicht: true },
      { k: "beziehung", t: "Beziehung", typ: "wahl", werte: { mutter: "Mutter", vater: "Vater", sonstige: "Erziehungsberechtigt" } },
      { k: "hauptkontakt", t: "Hauptkontakt", typ: "ja" },
      { k: "zugriff_ab_18", t: "Kind ist volljährig und erlaubt den Eltern weiter Zugriff", typ: "ja" },
    ],
    liste: ["eltern_id", "kind_id", "beziehung", "hauptkontakt", "zugriff_ab_18"],
  },
  gruppen: {
    titel: "Gruppen", sym: "🅰️", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "kuerzel", t: "Kürzel", typ: "text", pflicht: true },
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "beschreibung", t: "Beschreibung", typ: "text" },
      { k: "farbe", t: "Farbe", typ: "farbe" },
      { k: "sort", t: "Reihenfolge", typ: "zahl" },
      { k: "aktiv", t: "aktiv", typ: "ja" },
      { k: "soll", t: "Soll-Besetzung je Register", typ: "json", editor: "soll" },
      // 🎓 Schuljahreswechsel als Regel (0.21.0) statt fester Kürzel
      { k: "wechsel_nach", t: "Schuljahreswechsel: weiter in Gruppe", typ: "ref", ref: "gruppen" },
      { k: "wechsel_ab_jg", t: "… ab Jahrgangsstufe", typ: "zahl" },
      { k: "ehemalige", t: "Gruppe der Ehemaligen (nach dem Abschluss)", typ: "ja" },
    ],
    liste: ["kuerzel", "name", "beschreibung", "aktiv", "wechsel_nach", "wechsel_ab_jg"],
    anzeige: (z) => `${z.kuerzel} – ${z.name}`,
  },
  gruppe_zuordnung: {
    titel: "Gruppen-Zuordnung", sym: "🔀", gruppe: "Orchester", lesen: PLANER, schreiben: LL,
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" || p.typ === "ehemalig", pflicht: true },
      { k: "gruppe_id", t: "Gruppe", typ: "ref", ref: "gruppen", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { stamm: "Stammgruppe (generell)", temporaer: "temporär" }, pflicht: true },
      { k: "von", t: "gültig von", typ: "datum", pflicht: true },
      { k: "bis", t: "gültig bis", typ: "datum" },
      { k: "projekt_id", t: "nur für Projekt", typ: "ref", ref: "projekte" },
      { k: "grund", t: "Grund (intern)", typ: "text", vermerk: true },
    ],
    liste: ["person_id", "gruppe_id", "art", "von", "bis", "grund"],
  },
  register: {
    titel: "Register / Stimmgruppen", sym: "🎼", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "kurz", t: "Kurz", typ: "text" },
      { k: "familie", t: "Familie", typ: "wahl", werte: { streicher: "Streicher", holz: "Holzbläser", blech: "Blechbläser", schlag: "Schlagwerk", tasten: "Tasten/Harfe" } },
      { k: "sort", t: "Reihenfolge", typ: "zahl" },
    ],
    liste: ["name", "kurz", "familie", "sort"],
    anzeige: (z) => z.name,
  },
  instrument_typen: {
    titel: "Instrumententypen", sym: "🎻", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "instrumentenwart"],
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "register_id", t: "Standard-Register", typ: "ref", ref: "register" },
      { k: "wartung_monate", t: "Wartung alle … Monate", typ: "zahl" },
      { k: "gruppe", t: "Instrumentengruppe (leer = aus dem Register)", typ: "wahl", werte: INSTRUMENT_GRUPPEN_NAMEN },
      { k: "symbol", t: "Symbol (Emoji, leer = automatisch)", typ: "text" },
    ],
    liste: ["name", "gruppe", "register_id", "wartung_monate"],
    anzeige: (z) => z.name,
  },
  person_instrument: {
    titel: "Instrumente je Person", sym: "🎺", gruppe: "Orchester", lesen: PLANER, schreiben: LL,
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" || p.typ === "ehemalig", pflicht: true },
      { k: "typ_id", t: "Instrument", typ: "ref", ref: "instrument_typen", pflicht: true },
      { k: "register_id", t: "Register (Stimme)", typ: "ref", ref: "register" },
      { k: "haupt", t: "Hauptinstrument", typ: "ja" },
      { k: "eigenes", t: "eigenes Instrument", typ: "ja" },
      { k: "niveau", t: "Niveau / Bemerkung (intern)", typ: "text", vermerk: true },
    ],
    liste: ["person_id", "typ_id", "register_id", "haupt", "eigenes"],
  },
  inventar: {
    titel: "Inventar (Instrumente)", sym: "🏷️", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_nr", t: "Inventar-Nr.", typ: "text", pflicht: true },
      { k: "typ_id", t: "Instrumententyp", typ: "ref", ref: "instrument_typen", pflicht: true },
      { k: "bezeichnung", t: "Bezeichnung / Hersteller", typ: "text" },
      { k: "groesse", t: "Größe", typ: "text" },
      { k: "zustand", t: "Zustand", typ: "wahl", werte: { sehr_gut: "sehr gut", gut: "gut", gebraucht: "gebraucht", maengel: "Mängel" } },
      { k: "status", t: "Status", typ: "wahl", werte: INVENTAR_STATUS },
      { k: "standort", t: "Standort", typ: "text" },
      { k: "wert", t: "Anschaffungswert (€)", typ: "geld" },
      { k: "anschaffung", t: "Anschaffung", typ: "datum" },
      { k: "finanziert_von", t: "finanziert von", typ: "text" },
      { k: "wartung_faellig", t: "Wartung fällig", typ: "datum" },
      ...INV_FELDER,
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["inventar_nr", "typ_id", "bezeichnung", "groesse", "status", "zustand", "wartung_faellig"],
    anzeige: (z) => `${z.inventar_nr} ${z.bezeichnung || ""}`.trim(),
  },
  // 📦 Weiteres Inventar (0.19.0): Notenständer, Taktstock, Stühle, Technik … – je Stück oder als Sammelposten (Anzahl)
  ausstattung: {
    titel: "Ausstattung & Zubehör", sym: "📦", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_nr", t: "Inventar-Nr. (ID)", typ: "text", pflicht: true },
      { k: "kategorie", t: "Kategorie", typ: "wahl", werte: AUSSTATTUNG_KATEGORIEN_NAMEN, pflicht: true },
      { k: "bezeichnung", t: "Bezeichnung", typ: "text", pflicht: true },
      { k: "hersteller", t: "Hersteller / Modell", typ: "text" },
      { k: "anzahl", t: "Anzahl (Sammelposten)", typ: "zahl" },
      { k: "status", t: "Status", typ: "wahl", werte: INVENTAR_STATUS },
      { k: "zustand", t: "Zustand", typ: "wahl", werte: { neu: "neu", sehr_gut: "sehr gut", gut: "gut", gebraucht: "gebraucht", maengel: "Mängel" } },
      { k: "standort", t: "Standort", typ: "text" },
      { k: "anschaffung", t: "Anschaffung", typ: "datum" },
      { k: "wert", t: "Anschaffungspreis gesamt (€)", typ: "geld" },
      { k: "finanzierung", t: "finanziert von", typ: "wahl", werte: { foerderverein: "Förderverein", schule: "Schuletat", spende: "Spende", zuschuss: "Zuschuss / Förderung", sonstige: "sonstige" } },
      { k: "einkauf_id", t: "aus Einkauf", typ: "ref", ref: "einkaeufe" },
      ...INV_FELDER,
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["inventar_nr", "kategorie", "bezeichnung", "anzahl", "status", "standort", "anschaffung", "wert"],
    anzeige: (z) => `${z.inventar_nr} ${z.bezeichnung || ""}`.trim(),
  },
  // 🌱 Interessenten & Probespiel (0.24.0): wer möchte mitspielen? Vom Erstkontakt bis zur Aufnahme
  interessenten: {
    titel: "Interessenten & Probespiel", sym: "🌱", gruppe: "Stammdaten", lesen: LL, schreiben: LL,
    felder: [
      { k: "name", t: "Name (Kind)", typ: "text", pflicht: true },
      { k: "kontakt", t: "Kontakt (Eltern, Telefon/E-Mail)", typ: "text" },
      { k: "instrument_id", t: "Instrument", typ: "ref", ref: "instrument_typen" },
      { k: "jahrgang", t: "Jahrgangsstufe", typ: "zahl" },
      { k: "erfahrung", t: "spielt seit / Unterricht bei", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: { anfrage: "Anfrage", probespiel: "Probespiel vereinbart", schnupper: "schnuppert mit", aufgenommen: "aufgenommen", warteliste: "Warteliste", abgesagt: "abgesagt" } },
      { k: "probespiel_am", t: "Probespiel / Schnuppern am", typ: "zeit" },
      { k: "gruppe_id", t: "passende Gruppe", typ: "ref", ref: "gruppen" },
      { k: "leihinstrument", t: "braucht Leihinstrument", typ: "ja" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["name", "instrument_id", "jahrgang", "status", "probespiel_am", "gruppe_id"],
    anzeige: (z) => z.name,
  },
  // 🙋 Helfer- & Dienstplan (0.24.0): Aufbau, Kuchen, Kasse, Fahrdienst … je Konzert oder Termin
  dienste: {
    titel: "Helfer- & Dienstplan", sym: "🙋", gruppe: "Termine", lesen: [...ALLE_VERWALTER, "terminplaner"], schreiben: TERMIN_PLANER,
    felder: [
      { k: "aufgabe", t: "Aufgabe", typ: "text", pflicht: true },
      { k: "projekt_id", t: "für Konzert / Projekt", typ: "ref", ref: "projekte" },
      { k: "termin_id", t: "oder Termin", typ: "ref", ref: "termine" },
      { k: "zeit", t: "wann", typ: "text" },
      { k: "anzahl", t: "Helfer gebraucht", typ: "zahl" },
      { k: "helfer", t: "eingeteilt", typ: "refs", ref: "personen", filter: (p) => ["eltern", "foerderverein", "lehrkraft", "leitung", "ehemalig"].includes(p.typ) },
      { k: "notiz", t: "Notiz", typ: "text" },
    ],
    liste: ["aufgabe", "projekt_id", "termin_id", "zeit", "anzahl"],
    anzeige: (z) => z.aufgabe,
  },
  // 🚪 Räume & Schlüssel (0.22.0)
  raeume: {
    titel: "Räume", sym: "🚪", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "name", t: "Raum", typ: "text", pflicht: true },
      { k: "ort", t: "Gebäude / Ort", typ: "text" },
      { k: "plaetze", t: "Plätze", typ: "zahl" },
      { k: "ausstattung", t: "Ausstattung (Klavier, Beamer …)", typ: "text" },
      { k: "hinweis", t: "Hinweis (Hausmeister, Schließzeiten)", typ: "text" },
    ],
    liste: ["name", "ort", "plaetze", "ausstattung"],
    anzeige: (z) => z.name,
  },
  schluessel: {
    titel: "Schlüssel", sym: "🔑", gruppe: "Orchester", lesen: [...L, "lehrkraft", "instrumentenwart"], schreiben: [...L, "instrumentenwart"],
    felder: [
      { k: "nr", t: "Schlüssel-Nr.", typ: "text", pflicht: true },
      { k: "raum_id", t: "für Raum", typ: "ref", ref: "raeume" },
      { k: "bezeichnung", t: "Bezeichnung (z. B. Schrank, Generalschlüssel)", typ: "text" },
      { k: "person_id", t: "ausgegeben an", typ: "ref", ref: "personen", filter: (p) => !["schueler", "eltern"].includes(p.typ) || (p.rollen || []).length > 1 },
      { k: "ausgegeben_am", t: "ausgegeben am", typ: "datum" },
      { k: "rueckgabe_bis", t: "Rückgabe bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { da: "im Schlüsselkasten", ausgegeben: "ausgegeben", verloren: "verloren" } },
      { k: "kaution", t: "Kaution (€)", typ: "geld" },
    ],
    liste: ["nr", "raum_id", "bezeichnung", "person_id", "status", "rueckgabe_bis"],
  },
  // 📄 Papier-Notenexemplare (0.22.0): wer hat welche Stimme ausgeliehen (Mietmaterial vollständig zurück?)
  notenexemplare: {
    titel: "Notenexemplare (Papier)", sym: "📄", gruppe: "Noten", lesen: ALLE_VERWALTER, schreiben: [...LL, "notenwart"],
    felder: [
      { k: "stimme_id", t: "Stimme", typ: "ref", ref: "stimmen", pflicht: true },
      { k: "nr", t: "Exemplar-Nr.", typ: "text", pflicht: true },
      { k: "person_id", t: "ausgegeben an", typ: "ref", ref: "personen" },
      { k: "ausgegeben_am", t: "ausgegeben am", typ: "datum" },
      { k: "zurueck_am", t: "zurück am", typ: "datum" },
      { k: "zustand", t: "Zustand", typ: "wahl", werte: { gut: "gut", bleistift: "mit Bleistift (radieren!)", beschaedigt: "beschädigt", fehlt: "fehlt" } },
    ],
    liste: ["stimme_id", "nr", "person_id", "ausgegeben_am", "zurueck_am", "zustand"],
  },
  // 🎻 Übeaufgaben (0.22.0): Lehrkraft gibt einer Person, einem Register oder einer Gruppe eine Aufgabe; Schüler haken ab
  uebeaufgaben: {
    titel: "Übeaufgaben", sym: "📝", gruppe: "Orchester", lesen: LL, schreiben: LL,
    felder: [
      { k: "titel", t: "Aufgabe", typ: "text", pflicht: true },
      { k: "text", t: "Beschreibung (Takte, Tempo …)", typ: "lang" },
      { k: "werk_id", t: "Stück", typ: "ref", ref: "werke" },
      { k: "person_id", t: "für Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" },
      { k: "register_id", t: "oder für Register", typ: "ref", ref: "register" },
      { k: "gruppe_id", t: "in Gruppe", typ: "ref", ref: "gruppen" },
      { k: "von_id", t: "von", typ: "ref", ref: "personen" },
      { k: "bis", t: "bis", typ: "datum" },
      { k: "erledigt", t: "erledigt von (Personen)", typ: "refs", ref: "personen" },
      // 🎭 Übe-Bühne (0.26.0)
      { k: "art", t: "Art", typ: "wahl", werte: UEBE_ARTEN },
      { k: "stueck", t: "Stück (Übe-Bühne)", typ: "wahl", werte: UEBE_STUECKE },
      { k: "takt_von", t: "Takt von", typ: "zahl" },
      { k: "takt_bis", t: "Takt bis", typ: "zahl" },
      { k: "tempo_ziel", t: "Zieltempo (Schläge/Min.)", typ: "zahl" },
      { k: "muster", t: "Rhythmus (Schläge, − = Pause)", typ: "text" },
      { k: "taktart", t: "Taktart (Schläge je Takt)", typ: "zahl" },
      { k: "tonart", t: "Tonart", typ: "wahl", werte: UEBE_TONARTEN },
      { k: "oktaven", t: "Oktaven", typ: "zahl" },
      { k: "ton", t: "Ton (z. B. A4)", typ: "text" },
      { k: "sekunden", t: "Ton halten (Sekunden)", typ: "zahl" },
      { k: "spiel", t: "Ohr-Spiel", typ: "wahl", werte: UEBE_SPIELE },
      { k: "ziel_sterne", t: "Ziel (Sterne 1–3)", typ: "zahl" },
      { k: "datei", t: "Noten (PDF)", typ: "text" },
      { k: "vorspiel", t: "Vorspiel-Aufnahme der Lehrkraft", typ: "text" },
    ],
    liste: ["titel", "art", "person_id", "register_id", "gruppe_id", "bis"],
    anzeige: (z) => z.titel,
  },
  // 🏠 Austausch & Gastfamilien (0.27.0): Eltern bieten Plätze an (eigene Zeile), die Leitung bestätigt und ordnet Gäste zu
  gastgeber: {
    titel: "Gastfamilien", sym: "🏠", gruppe: "Termine", lesen: LL, schreiben: LL,
    felder: [
      { k: "projekt_id", t: "Austausch / Projekt", typ: "ref", ref: "projekte", pflicht: true },
      { k: "person_id", t: "Familie (Elternteil)", typ: "ref", ref: "personen", pflicht: true, filter: (p) => p.typ === "eltern" || p.typ === "leitung" || p.typ === "lehrkraft" },
      { k: "plaetze", t: "Plätze", typ: "zahl", pflicht: true },
      { k: "schlafplatz", t: "Schlafplatz (z. B. eigenes Zimmer, Gästebett)", typ: "text" },
      { k: "hinweise", t: "Hinweise (Haustiere, Essen, Abholung …)", typ: "lang" },
      { k: "status", t: "Status", typ: "wahl", werte: GASTGEBER_STATUS },
      { k: "notiz", t: "Interne Notiz", typ: "lang", vermerk: true },
    ],
    liste: ["projekt_id", "person_id", "plaetze", "status"],
    anzeige: (z) => `${z.plaetze || "?"} Plätze`,
  },
  gaeste: {
    titel: "Gäste (Austausch)", sym: "🧳", gruppe: "Termine", lesen: LL, schreiben: LL,
    felder: [
      { k: "projekt_id", t: "Austausch / Projekt", typ: "ref", ref: "projekte", pflicht: true },
      { k: "vorname", t: "Vorname", typ: "text", pflicht: true },
      { k: "nachname", t: "Nachname", typ: "text" },
      { k: "alter", t: "Alter", typ: "zahl" },
      { k: "herkunft", t: "Kommt aus (Orchester / Ort)", typ: "text" },
      { k: "instrument", t: "Instrument", typ: "text" },
      { k: "gastgeber_id", t: "wohnt bei (Gastfamilie)", typ: "ref", ref: "gastgeber" },
      { k: "ankunft", t: "Ankunft", typ: "zeit" },
      { k: "abreise", t: "Abreise", typ: "zeit" },
      { k: "essen", t: "Essen (vegetarisch, halal …)", typ: "text" },
      { k: "allergien", t: "Allergien / Gesundheit (für die Gastfamilie)", typ: "lang" },
      { k: "notfall_tel", t: "Notfall: Begleitung der Gäste (Telefon)", typ: "tel" },
      { k: "notiz", t: "Interne Notiz", typ: "lang", vermerk: true },
    ],
    liste: ["projekt_id", "vorname", "nachname", "alter", "herkunft", "gastgeber_id"],
    anzeige: (z) => `${z.vorname} ${z.nachname || ""}`.trim(),
  },
  // 📨 Auftrittsanfragen (0.27.0): das Orchester wird an Gemeinden, Kirchen, Veranstalter „ausgeliehen“ – Zusage legt den Termin an
  anfragen: {
    titel: "Auftrittsanfragen", sym: "📨", gruppe: "Termine", lesen: [...L, "vorstand", "lehrkraft"], schreiben: [...L, "vorstand", "lehrkraft"],
    felder: [
      { k: "anlass", t: "Anlass", typ: "text", pflicht: true },
      { k: "veranstalter", t: "Veranstalter", typ: "text", pflicht: true },
      { k: "kontakt_name", t: "Ansprechpartner/in", typ: "text" },
      { k: "kontakt_tel", t: "Telefon", typ: "tel" },
      { k: "kontakt_email", t: "E-Mail", typ: "email" },
      { k: "datum", t: "Wann", typ: "zeit" },
      { k: "dauer_min", t: "Dauer (Min.)", typ: "zahl" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "besetzung", t: "Gewünschte Besetzung", typ: "wahl", werte: ANFRAGE_BESETZUNG },
      { k: "gruppen", t: "Es spielen", typ: "refs", ref: "gruppen" },
      { k: "honorar", t: "Honorar / Spende (€)", typ: "geld" },
      { k: "status", t: "Status", typ: "wahl", werte: ANFRAGE_STATUS },
      { k: "termin_id", t: "Termin", typ: "ref", ref: "termine" },
      { k: "eingegangen_am", t: "Eingegangen am", typ: "datum" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["datum", "anlass", "veranstalter", "besetzung", "status"],
    anzeige: (z) => z.anlass,
  },
  // 📜 Chronik & Konzertarchiv (0.27.0): Geschichte seit 1969 – sieht jedes Mitglied
  chronik: {
    titel: "Chronik", sym: "📜", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: [...LL, "vorstand"],
    felder: [
      { k: "jahr", t: "Jahr (wenn bekannt)", typ: "zahl" },
      { k: "datum", t: "Datum (wenn bekannt)", typ: "datum" },
      { k: "titel", t: "Was", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: CHRONIK_ARTEN },
      { k: "ort", t: "Ort / Saal", typ: "text" },
      // 🗺️ 0.36.0 Auftrittsorte: Stadt + Land (Kürzel DE, PL …) für die Weltkarte; Koordinaten nur, wenn die Stadt nicht im Ortsverzeichnis steht
      { k: "stadt", t: "Stadt", typ: "text" },
      { k: "land", t: "Land (Kürzel, z. B. DE)", typ: "text" },
      { k: "koordinaten", t: "Koordinaten („Breite, Länge“ – nur wenn nötig)", typ: "text" },
      { k: "beschreibung", t: "Beschreibung", typ: "lang" },
      { k: "programm", t: "Programm (ein Werk je Zeile: Komponist – Werk)", typ: "lang" },
      { k: "projekt_id", t: "Projekt in der App", typ: "ref", ref: "projekte" },
      { k: "aufnahme_id", t: "Aufnahme", typ: "ref", ref: "aufnahmen" },
      { k: "partner_id", t: "Partner", typ: "ref", ref: "partner" },
      { k: "quelle", t: "Quelle (z. B. Schul-Website)", typ: "text" },
    ],
    liste: ["jahr", "titel", "art", "stadt", "ort"],
    anzeige: (z) => `${z.jahr || "o. J."}: ${z.titel}${z.stadt ? ` (${z.stadt})` : ""}`,
  },
  // 📂 Dokumente (0.27.0): Satzung, Flyer, Beitrittserklärung, Vorlagen – als Datei (geschützt) oder Link
  dokumente: {
    titel: "Dokumente", sym: "📂", gruppe: "Förderverein", lesen: ALLE_VERWALTER, schreiben: [...LL, "vorstand"],
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: DOKUMENT_ARTEN },
      { k: "beschreibung", t: "Kurzbeschreibung", typ: "text" },
      { k: "datei", t: "Datei (hochgeladen)", typ: "text" },
      { k: "url", t: "Link (z. B. PDF auf der Schul-Website)", typ: "text" },
      { k: "fassung", t: "Fassung / Stand", typ: "text" },
      { k: "sichtbar", t: "Sichtbar für", typ: "wahl", werte: DOKUMENT_SICHT },
      { k: "sort", t: "Reihenfolge", typ: "zahl" },
      { k: "ordner", t: "🏢 Büro-Ordner", typ: "wahl", werte: Object.fromEntries(Object.entries(BUERO_ORDNER).map(([k, o]) => [k, `${o.sym} ${o.t}`])) },
      { k: "jahr", t: "Jahr", typ: "zahl" },
      { k: "inhalt", t: "Text (geschriebenes Dokument / Vorlage)", typ: "lang" },
      // 🔎 0.49.0 Prüfung durch den Schriftführer vor dem Veröffentlichen (KC-CLUB-PROTOKOLL-PRUEFUNG)
      { k: "pruefer", t: "Prüft (Schriftführer)", typ: "ref", ref: "personen" },
      { k: "pruef_status", t: "Prüfung", typ: "wahl", werte: { offen: "🔎 in Prüfung", wuensche: "↩️ Änderungen gewünscht", frei: "✅ freigegeben", ohne: "⚠️ ohne Freigabe veröffentlicht" } },
      { k: "pruef_wuensche", t: "Änderungswünsche", typ: "json" },
      { k: "pruef_von", t: "zur Prüfung gegeben von", typ: "ref", ref: "personen" },
      { k: "pruef_am", t: "zur Prüfung am", typ: "zeit" },
      { k: "geprueft_am", t: "geprüft am", typ: "zeit" },
      { k: "pruef_erinnert", t: "zuletzt erinnert", typ: "zeit" },
    ],
    liste: ["titel", "ordner", "art", "jahr", "sichtbar"],
    anzeige: (z) => z.titel,
  },
  // 🤝 Partner (0.27.0): Musikschule, Partnerorchester, Austausch-Orchester, Kirchen, Presse
  partner: {
    titel: "Partner & Kontakte", sym: "🤝", gruppe: "Orchester", lesen: [...LL, "vorstand"], schreiben: [...LL, "vorstand"],
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: PARTNER_ARTEN },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "land", t: "Land", typ: "text" },
      { k: "ansprechpartner", t: "Ansprechpartner/in", typ: "text" },
      { k: "email", t: "E-Mail", typ: "email" },
      { k: "telefon", t: "Telefon", typ: "tel" },
      { k: "website", t: "Internetseite", typ: "text" },
      { k: "seit", t: "Partner seit (Jahr)", typ: "zahl" },
      { k: "letzte_begegnung", t: "Letzte Begegnung", typ: "datum" },
      { k: "naechste_planung", t: "Nächste Planung", typ: "text" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["name", "art", "ort", "seit", "letzte_begegnung"],
    anzeige: (z) => z.name,
  },
  // 🎭 Übe-Bühne (0.26.0): Ergebnisse – nur Zahlen (Minuten, Sterne, Tempo). Kinder schreiben eigene, Eltern sehen die der Kinder,
  // Leitung/Lehrkräfte alle und geben Rückmeldung. Aufnahme nur mit Einwilligung (Zweck „uebeaufnahmen“), Löschung nach 30 Tagen.
  uebe_ergebnisse: {
    titel: "Übe-Bühne: Ergebnisse", sym: "⭐", gruppe: "Orchester", lesen: LL, schreiben: LL,
    felder: [
      { k: "person_id", t: "Kind", typ: "ref", ref: "personen", pflicht: true },
      { k: "aufgabe_id", t: "Aufgabe", typ: "ref", ref: "uebeaufgaben" },
      { k: "modus", t: "Übe-Art", typ: "wahl", werte: UEBE_MODI },
      { k: "stueck", t: "Stück", typ: "text" },
      { k: "datum", t: "Datum", typ: "datum", pflicht: true },
      { k: "minuten", t: "Minuten", typ: "zahl" },
      { k: "sterne", t: "Sterne (0–3)", typ: "zahl" },
      { k: "tempo", t: "Tempo (Schläge/Min.)", typ: "zahl" },
      { k: "aufnahme", t: "Aufnahme an die Lehrkraft", typ: "text" },
      { k: "loeschen_am", t: "Aufnahme löschen am", typ: "datum" },
      { k: "rueckmeldung", t: "Rückmeldung der Lehrkraft", typ: "lang" },
      { k: "rueckmeldung_von", t: "Rückmeldung von", typ: "ref", ref: "personen" },
    ],
    liste: ["datum", "person_id", "aufgabe_id", "modus", "sterne", "tempo"],
    anzeige: (z) => `${z.datum} · ${"⭐".repeat(z.sterne || 0) || "–"}`,
  },
  // 🚗 Mitfahrbörse (0.22.0/0.23.0): Eltern bieten Plätze an (angebot) oder suchen eine Mitfahrt für ihr Kind (gesuch);
  // gebucht wird für die eigenen Kinder, ein Gesuch nimmt ein/e Fahrer/in mit „Ich nehme mit“ an (zusage_von)
  mitfahrten: {
    titel: "Mitfahrbörse", sym: "🚗", gruppe: "Termine", lesen: TERMIN_PLANER, schreiben: TERMIN_PLANER,
    felder: [
      { k: "termin_id", t: "Termin", typ: "ref", ref: "termine", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: MITFAHRT_ARTEN },
      { k: "fahrer_id", t: "Fahrer/in bzw. suchende Eltern", typ: "ref", ref: "personen", pflicht: true },
      { k: "richtung", t: "Richtung", typ: "wahl", werte: { hin: "hin", zurueck: "zurück", beides: "hin & zurück" } },
      { k: "plaetze", t: "Plätze (frei bzw. gesucht)", typ: "zahl" },
      { k: "abfahrt", t: "Ort / Uhrzeit (Abfahrt bzw. Abholung)", typ: "text" },
      { k: "mitfahrer", t: "Mitfahrer (Kinder)", typ: "refs", ref: "personen" },
      { k: "zusage_von", t: "nimmt mit (bei Gesuch)", typ: "ref", ref: "personen" },
      { k: "notiz", t: "Notiz", typ: "text" },
    ],
    liste: ["termin_id", "art", "fahrer_id", "richtung", "plaetze", "abfahrt"],
  },
  ausleihen: {
    titel: "Ausleihen", sym: "🤝", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_id", t: "Instrument", typ: "ref", ref: "inventar" },
      { k: "ausstattung_id", t: "oder Ausstattung (Beamer, Notenständer …)", typ: "ref", ref: "ausstattung" },
      { k: "person_id", t: "an", typ: "ref", ref: "personen", filter: (p) => ["schueler", "ehemalig", "lehrkraft", "leitung", "eltern", "foerderverein"].includes(p.typ), pflicht: true },
      { k: "von", t: "ab", typ: "datum", pflicht: true },
      { k: "bis", t: "Rückgabe bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { angefragt: "angefragt", aktiv: "ausgeliehen", zurueck: "zurückgegeben" } },
      { k: "zustand_ausgabe", t: "Zustand bei Ausgabe", typ: "text" },
      { k: "zustand_rueckgabe", t: "Zustand bei Rückgabe", typ: "text" },
      // 🤝 Leihvertrag (0.21.0): Zubehör, Kaution, Leihgebühr, Versicherung, Verweis auf die Zustimmung der Eltern
      { k: "zubehoer", t: "Zubehör", typ: "liste", werte: LEIH_ZUBEHOER },
      { k: "kaution", t: "Kaution (€)", typ: "geld" },
      { k: "kaution_status", t: "Kaution", typ: "wahl", werte: { offen: "offen", bezahlt: "bezahlt", zurueck: "zurückgezahlt", einbehalten: "einbehalten (Schaden)" } },
      { k: "gebuehr", t: "Leihgebühr je Jahr (€)", typ: "geld" },
      { k: "gebuehr_bezahlt_bis", t: "Leihgebühr bezahlt bis", typ: "datum" },
      { k: "versicherung", t: "Versicherung", typ: "wahl", werte: { verein: "über den Förderverein", privat: "privat (Hausrat)", keine: "keine" } },
      { k: "vertrag_id", t: "Leihvertrag (Zustimmung)", typ: "ref", ref: "genehmigungen" },
      { k: "leihvertrag_id", t: "📝 Leihvertrag (Formular)", typ: "ref", ref: "leihvertraege" }, // 0.52.0
    ],
    liste: ["inventar_id", "person_id", "von", "bis", "status", "kaution_status"],
  },
  // ⚖️ 0.55.0 Zustimmungen: wer hat wann welcher Fassung zugestimmt (Eltern auch für ihre Kinder unter 16) – Nachweis für den Vorstand
  // 🟢 0.58.0 Mein Status – eine Zeile je Person (id „st-<person>“); setzen darf die Person selbst bzw. die Eltern für ihre Kinder
  personenstatus: {
    titel: "Mein Status", sym: "🟢", gruppe: "Verwaltung", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "status", t: "Status", typ: "wahl", werte: Object.fromEntries(Object.entries(STATUS_ARTEN).map(([k, [, t]]) => [k, t])), pflicht: true },
      { k: "bis", t: "bis", typ: "datum" },
      { k: "hinweis", t: "Hinweis", typ: "text" },
      { k: "gesetzt_von", t: "gesetzt von", typ: "ref", ref: "personen" },
    ],
    liste: ["person_id", "status", "bis", "hinweis"],
  },
  // 🔑 0.56.0 Passkeys: Anmelden mit Fingerabdruck/Gesicht/Geräte-PIN. Öffentlicher Schlüssel bleibt auf dem Server (intern),
  // die Person sieht ihre Geräte und kann sie entfernen. Angelegt wird nur über die Server-Aktion passkey_registrieren.
  passkeys: {
    titel: "Passkeys", sym: "🔑", gruppe: "Verwaltung", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "name", t: "Gerät", typ: "text" },
      { k: "cred_id", t: "Kennung", typ: "text", pflicht: true },
      { k: "zuletzt", t: "zuletzt benutzt", typ: "zeit" },
    ],
    intern: [{ k: "public_key", typ: "json" }, { k: "rp_hash", typ: "text" }, { k: "zaehler", typ: "zahl" }],
    liste: ["person_id", "name", "zuletzt"],
  },
  // 🎟️ 0.56.0 Kartenreservierungen fürs Konzert – Besucher reservieren ohne Konto über den Karten-Link; Leitung/Vorstand sehen die Liste
  // und haken an der Abendkasse ab. Gelöscht 30 Tage nach dem Konzert (Löschkonzept).
  kartenreservierungen: {
    titel: "Kartenreservierungen", sym: "🎟️", gruppe: "Termine", lesen: [], schreiben: [],
    felder: [
      { k: "termin_id", t: "Konzert", typ: "ref", ref: "termine", pflicht: true },
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "email", t: "E-Mail (freiwillig)", typ: "email" },
      { k: "anzahl", t: "Karten", typ: "zahl", pflicht: true },
      { k: "code", t: "Reservierungs-Nr.", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: KARTEN_STATUS },
      { k: "quelle", t: "Quelle", typ: "wahl", werte: { online: "online", kasse: "an der Kasse / von Hand" } },
      { k: "notiz", t: "Notiz", typ: "text" },
      { k: "zeit", t: "reserviert am", typ: "zeit" },
    ],
    intern: [{ k: "ip_hash", typ: "text" }],
    liste: ["termin_id", "name", "anzahl", "code", "status"],
  },
  zustimmungen: {
    titel: "Zustimmungen (Datenschutz & Regeln)", sym: "⚖️", gruppe: "Verwaltung", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "zugestimmt von", typ: "ref", ref: "personen", pflicht: true },
      { k: "fuer_id", t: "für", typ: "ref", ref: "personen", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: ZUSTIMMUNG_ARTEN, pflicht: true },
      { k: "fassung", t: "Fassung (Stand der Texte)", typ: "text", pflicht: true },
      { k: "zeit", t: "Zeitpunkt", typ: "zeit" },
    ],
    liste: ["fuer_id", "art", "fassung", "zeit"],
  },
  // 📥 0.53.0 Eingangskorb (wie KC-CLUB-EINGANGSKORB): was man sich selbst über „Teilen“ oder aus der Druckvorschau hineinlegt –
  // und was die Leitung einem hineinlegt. Privat: nur die Person (bei Kindern auch die Eltern) und wer es hineingelegt hat.
  eingangskorb: {
    titel: "Eingangskorb", sym: "📥", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "für", typ: "ref", ref: "personen", pflicht: true },
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "text", t: "Text / Notiz", typ: "lang" },
      { k: "datei", t: "Datei", typ: "text" },
      { k: "name", t: "Dateiname", typ: "text" },
      { k: "mime", t: "Dateiart", typ: "text" },
      { k: "groesse", t: "Größe (Byte)", typ: "zahl" },
      { k: "quelle", t: "Woher", typ: "wahl", werte: EK_QUELLEN },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "gelesen_am", t: "angesehen", typ: "zeit" },
    ],
    liste: ["titel", "person_id", "quelle"],
  },
  // 📝 0.52.0 Leihvertrag als Formular: mehrere Instrumente + Zubehör, Anschrift/Geburtsdatum zum Zeitpunkt des Vertrags, Schadensklausel,
  // Unterschriften von Mitglied, Erziehungsberechtigten (bei Minderjährigen) und Bachkreis – mit dem Finger, vor Ort oder jede/r auf dem eigenen Gerät
  leihvertraege: {
    titel: "Leihverträge", sym: "📝", gruppe: "Instrumente", lesen: [], schreiben: [],
    felder: [
      { k: "nr", t: "Vertrags-Nr.", typ: "text" },
      { k: "person_id", t: "Entleiher/in (Mitglied)", typ: "ref", ref: "personen", pflicht: true },
      { k: "eltern_id", t: "Erziehungsberechtigte/r", typ: "ref", ref: "personen" },
      { k: "anschrift", t: "Anschrift (zum Vertragszeitpunkt)", typ: "text" },
      { k: "geburtsdatum", t: "Geburtsdatum", typ: "datum" },
      { k: "eltern_name", t: "Name Erziehungsberechtigte/r", typ: "text" },
      { k: "eltern_anschrift", t: "Anschrift Erziehungsberechtigte/r", typ: "text" },
      { k: "telefon", t: "Telefon", typ: "text" },
      { k: "inventar_ids", t: "Instrumente", typ: "refs", ref: "inventar" },
      { k: "ausstattung_ids", t: "Ausstattung", typ: "refs", ref: "ausstattung" },
      { k: "zubehoer", t: "Zubehör", typ: "liste", werte: LEIH_ZUBEHOER },
      { k: "zubehoer_frei", t: "weiteres Zubehör", typ: "text" },
      { k: "von", t: "Leihe ab", typ: "datum", pflicht: true },
      { k: "bis", t: "Leihe bis", typ: "datum" },
      { k: "kaution", t: "Kaution (€)", typ: "geld" },
      { k: "gebuehr", t: "Leihgebühr je Jahr (€)", typ: "geld" },
      { k: "versicherung", t: "Versicherung", typ: "wahl", werte: { verein: "über den Förderverein", privat: "privat (Hausrat)", keine: "keine" } },
      { k: "klausel", t: "Leihbedingungen & Schadensklausel", typ: "lang" },
      { k: "hinweis", t: "Besonderheiten / Zustand bei Ausgabe", typ: "lang" },
      { k: "unterschriften", t: "Unterschriften (technisch)", typ: "json" },
      { k: "status", t: "Status", typ: "wahl", werte: LV_STATUS },
    ],
    liste: ["nr", "person_id", "von", "bis", "status"],
  },
  reparaturen: {
    titel: "Reparaturen & Wartung", sym: "🔧", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_id", t: "Instrument", typ: "ref", ref: "inventar" },
      { k: "ausstattung_id", t: "oder Ausstattung (Notenständer, Technik …)", typ: "ref", ref: "ausstattung" },
      { k: "meldung", t: "Schaden / Auftrag", typ: "lang", pflicht: true },
      { k: "status", t: "Status", typ: "wahl", werte: { gemeldet: "gemeldet", angebot: "Kostenvoranschlag liegt vor", freigegeben: "freigegeben", in_arbeit: "in der Werkstatt", erledigt: "erledigt", abgelehnt: "abgelehnt" } },
      { k: "werkstatt_id", t: "Werkstatt", typ: "ref", ref: "personen", filter: (p) => p.typ === "dienstleister" },
      { k: "kosten", t: "Kosten (€)", typ: "geld" },
      { k: "gemeldet_von", t: "gemeldet von", typ: "ref", ref: "personen" },
      { k: "freigegeben_von", t: "freigegeben von", typ: "ref", ref: "personen" },
      { k: "gemeldet_am", t: "gemeldet am", typ: "datum" },
    ],
    liste: ["inventar_id", "meldung", "status", "kosten", "gemeldet_am"],
  },
  einkaeufe: {
    titel: "Einkauf / Beschaffung", sym: "🛒", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand"],
    felder: [
      { k: "titel", t: "Was", typ: "text", pflicht: true },
      { k: "begruendung", t: "Begründung", typ: "lang" },
      { k: "status", t: "Status", typ: "wahl", werte: { bedarf: "Bedarf", angebote: "Angebote eingeholt", freigegeben: "freigegeben", bestellt: "bestellt", geliefert: "geliefert", inventarisiert: "inventarisiert", abgelehnt: "abgelehnt" } },
      { k: "betrag", t: "Betrag (€)", typ: "geld" },
      { k: "haendler_id", t: "Händler", typ: "ref", ref: "personen", filter: (p) => p.typ === "dienstleister" },
      { k: "finanzierung", t: "Finanzierung", typ: "wahl", werte: { foerderverein: "Förderverein", schule: "Schuletat", spende: "Spende", sonstige: "sonstige" } },
      { k: "angelegt_am", t: "angelegt am", typ: "datum" },
    ],
    liste: ["titel", "status", "betrag", "finanzierung", "angelegt_am"],
  },
  projekte: {
    titel: "Projekte / Konzerte", sym: "🎭", gruppe: "Termine", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { konzert: "Konzert", reise: "Reise / Austausch", freizeit: "Probenfreizeit", sonstiges: "Sonstiges" } },
      { k: "von", t: "von", typ: "datum" },
      { k: "bis", t: "bis", typ: "datum" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "beschreibung", t: "Beschreibung", typ: "lang" },
      { k: "checkliste", t: "Checkliste (eine Zeile je Punkt, [x] = erledigt)", typ: "lang", vermerk: true },
      { k: "begleiter", t: "Begleitpersonen (sehen während der Fahrt die Gesundheitsangaben)", typ: "refs", ref: "personen", filter: (p) => ["leitung", "lehrkraft", "eltern", "foerderverein"].includes(p.typ) },
      // 🎭 Konzert & Reise (0.21.0)
      { k: "treffpunkt", t: "Treffpunkt (z. B. 17:30 Bühneneingang)", typ: "text" },
      { k: "kleiderordnung", t: "Kleiderordnung", typ: "text" },
      { k: "anmeldung", t: "Anmeldung in der App (Reise / Freizeit)", typ: "ja" },
      { k: "anmeldeschluss", t: "Anmeldeschluss", typ: "datum" },
      { k: "kosten", t: "Kosten je Teilnehmer (€)", typ: "geld" },
      { k: "plaetze", t: "Plätze (leer = unbegrenzt)", typ: "zahl" },
      { k: "transport_inventar", t: "Transport: Instrumente", typ: "refs", ref: "inventar", vermerk: true },
      { k: "transport_ausstattung", t: "Transport: Ausstattung (Notenständer, Technik …)", typ: "refs", ref: "ausstattung", vermerk: true },
      // 🏠 Austausch (0.27.0): wir bekommen Besuch – Gastfamilien gesucht
      { k: "gastfamilien", t: "🏠 Gastfamilien gesucht (Besuch bei uns)", typ: "ja" },
      { k: "gaeste_anzahl", t: "Erwartete Gäste", typ: "zahl" },
      { k: "partner_id", t: "Partner (Austausch-Orchester)", typ: "ref", ref: "partner" },
    ],
    liste: ["titel", "art", "von", "bis", "ort"],
    anzeige: (z) => z.titel,
  },
  // 🎼 Konzertprogramm (0.21.0): Reihenfolge mit Werken, Pause, Ansagen, Zugabe; Gesamtdauer aus den Werken
  programm: {
    titel: "Konzertprogramm", sym: "🎼", gruppe: "Termine", lesen: ALLE_VERWALTER, schreiben: [...LL, "notenwart"],
    felder: [
      { k: "projekt_id", t: "Konzert / Projekt", typ: "ref", ref: "projekte", pflicht: true },
      { k: "nr", t: "Reihenfolge", typ: "zahl", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: PROGRAMM_ARTEN, pflicht: true },
      { k: "werk_id", t: "Werk", typ: "ref", ref: "werke" },
      { k: "titel", t: "Titel (wenn kein Werk)", typ: "text" },
      { k: "gruppe_id", t: "es spielt", typ: "ref", ref: "gruppen" },
      { k: "solisten", t: "Solisten", typ: "text" },
      { k: "dauer_min", t: "Dauer (Min., leer = vom Werk)", typ: "zahl" },
      { k: "notiz", t: "Notiz (Umbau, Stimmen …)", typ: "text" },
      // 🎓 Dirigier- und Kompositionsversuche (0.27.0, laut Internetseite Ziel des Bachkreises)
      { k: "dirigent_id", t: "🎓 Schüler/in dirigiert", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" || p.typ === "ehemalig" },
      { k: "eigene_komposition", t: "✍️ Eigene Komposition (Schüler/in)", typ: "ja" },
      { k: "urauffuehrung", t: "🆕 Uraufführung", typ: "ja" },
    ],
    liste: ["projekt_id", "nr", "art", "werk_id", "titel", "gruppe_id", "dauer_min"],
  },
  // 🧳 Reise-/Freizeit-Anmeldung (0.21.0): Eltern melden ihr Kind an, Kasse vermerkt „bezahlt“
  reise_anmeldungen: {
    titel: "Anmeldungen (Reisen & Freizeiten)", sym: "🧳", gruppe: "Termine", lesen: [...LL, "vorstand"], schreiben: [...LL, "vorstand"],
    felder: [
      { k: "projekt_id", t: "Reise / Freizeit", typ: "ref", ref: "projekte", pflicht: true },
      { k: "person_id", t: "Teilnehmer", typ: "ref", ref: "personen", pflicht: true },
      { k: "status", t: "Status", typ: "wahl", werte: { angemeldet: "angemeldet", warteliste: "Warteliste", abgemeldet: "abgemeldet" } },
      { k: "angemeldet_von", t: "angemeldet von", typ: "ref", ref: "personen" },
      { k: "angemeldet_am", t: "angemeldet am", typ: "zeit" },
      { k: "betrag", t: "Betrag (€)", typ: "geld" },
      { k: "bezahlt", t: "bezahlt", typ: "ja" },
      { k: "bezahlt_am", t: "bezahlt am", typ: "datum" },
      { k: "zimmer", t: "Zimmer / Gruppe", typ: "text" },
      { k: "notiz", t: "Notiz (Abholung, Wünsche)", typ: "text" },
    ],
    liste: ["projekt_id", "person_id", "status", "betrag", "bezahlt", "zimmer"],
  },
  terminarten: {
    titel: "Terminarten", sym: "🏷️", gruppe: "Termine", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "sym", t: "Symbol", typ: "text" },
      { k: "farbe", t: "Farbe", typ: "farbe" },
      { k: "pflicht", t: "Pflichttermin", typ: "ja" },
      { k: "sort", t: "Reihenfolge", typ: "zahl" },
    ],
    liste: ["sym", "name", "pflicht"],
    anzeige: (z) => `${z.sym || ""} ${z.name}`.trim(),
  },
  termine: {
    titel: "Termine", sym: "📅", gruppe: "Termine", lesen: PLANER, schreiben: TERMIN_PLANER,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art_id", t: "Art", typ: "ref", ref: "terminarten", pflicht: true },
      { k: "beginn", t: "Beginn", typ: "zeit", pflicht: true },
      { k: "ende", t: "Ende", typ: "zeit" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "fuer_alle", t: "Für alle (ganzer Bachkreis, z. B. Weihnachtsfeier)", typ: "ja" },
      { k: "gruppen", t: "Eingeladene Gruppen", typ: "refs", ref: "gruppen" },
      { k: "teilnahme", t: "Teilnahme", typ: "wahl", werte: { pflicht: "erforderlich", erwuenscht: "erwünscht", info: "nur zur Info" } },
      { k: "projekt_id", t: "Projekt", typ: "ref", ref: "projekte" },
      { k: "frist", t: "Antwort bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { geplant: "geplant", abgesagt: "abgesagt" } },
      { k: "beschreibung", t: "Hinweise (Treffpunkt, Kleidung …)", typ: "lang" },
      { k: "register", t: "Nur für Register (Registerprobe; leer = alle)", typ: "refs", ref: "register" },
      { k: "soll", t: "Soll-Besetzung je Register (für die Ampel)", typ: "json", editor: "soll" },
      // 🎼 Probenplan (0.24.0): was geprobt wird – und danach kurz, wie es lief
      { k: "probenplan", t: "Probenplan (Stücke, Takte, Reihenfolge)", typ: "lang" },
      { k: "protokoll", t: "Probenprotokoll (nach der Probe, intern)", typ: "lang", vermerk: true },
      // 🎟️ 0.56.0 Konzertkarten: öffentliche Reservierung über einen eigenen Link (karten.html#k=…)
      { k: "karten_aktiv", t: "🎟️ Kartenreservierung online", typ: "ja" },
      { k: "karten_plaetze", t: "Plätze insgesamt", typ: "zahl", nur: (z) => z.karten_aktiv },
      { k: "karten_je", t: "höchstens Karten je Reservierung", typ: "zahl", nur: (z) => z.karten_aktiv },
      { k: "karten_hinweis", t: "Hinweis für Besucher (Eintritt, Einlass …)", typ: "text", nur: (z) => z.karten_aktiv },
      { k: "karten_token", t: "Karten-Link (Kennung)", typ: "text", nur: (z) => z.karten_aktiv },
    ],
    liste: ["beginn", "titel", "art_id", "ort", "gruppen", "status"],
    anzeige: (z) => z.titel,
  },
  antworten: {
    titel: "Zu-/Absagen", sym: "✅", gruppe: "Termine", lesen: TERMIN_PLANER, schreiben: TERMIN_PLANER, // Absagegründe (krank …) nur für die Planung
    felder: [
      { k: "termin_id", t: "Termin", typ: "ref", ref: "termine", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "antwort", t: "Antwort", typ: "wahl", werte: { ja: "Zusage", vielleicht: "weiß noch nicht", nein: "Absage" }, pflicht: true },
      { k: "notiz", t: "Notiz", typ: "text" },
      { k: "von_person_id", t: "beantwortet von", typ: "ref", ref: "personen" },
      { k: "anwesend", t: "tatsächlich anwesend", typ: "wahl", werte: ANWESENHEIT_NAMEN },
    ],
    liste: ["termin_id", "person_id", "antwort", "notiz", "anwesend"],
    intern: [{ k: "register_id", typ: "ref", ref: "register" }, { k: "nachfragen_am", typ: "datum" }],
  },
  eigene_termine: {
    // 🙋 Eigene Termine (Üben, Unterricht, Vorspiel …): privat – nur die Person selbst und ihre Eltern
    titel: "Eigene Termine", sym: "🙋", gruppe: "Termine", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { ueben: "Üben", unterricht: "Unterricht", vorspiel: "Vorspiel", sonstiges: "Sonstiges" } },
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "beginn", t: "Beginn", typ: "zeit", pflicht: true },
      { k: "ende", t: "Ende", typ: "zeit" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "woechentlich_bis", t: "jede Woche bis", typ: "datum" },
      { k: "erinnerung", t: "Erinnerung (Minuten vorher)", typ: "zahl" },
      { k: "notiz", t: "Notiz", typ: "text" },
    ],
    liste: ["person_id", "beginn", "titel", "art"],
  },
  klopfen: {
    // 👋 Anklopfen (wie KC): „Hast du gerade Zeit?“ – sehen nur Absender und Empfänger
    titel: "Anklopfen", sym: "👋", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "von", t: "von", typ: "ref", ref: "personen", pflicht: true },
      { k: "an", t: "an", typ: "ref", ref: "personen", pflicht: true },
      { k: "zeit", t: "Zeit", typ: "zeit", pflicht: true },
      { k: "antwort", t: "Antwort", typ: "wahl", werte: { ja: "ja, jetzt", spaeter: "später", nein: "gerade nicht" } },
      { k: "antwort_am", t: "beantwortet", typ: "zeit" },
      { k: "art", t: "Wie?", typ: "wahl", werte: { schreiben: "✍️ schreiben", sprechen: "📞 sprechen" } }, // 0.51.0 KC-CLUB-ANKLOPFEN-ART
    ],
    liste: ["zeit", "von", "an", "antwort"], aufbewahrung_tage: 7,
  },
  unterhaltungen: {
    titel: "Unterhaltungen", sym: "💬", gruppe: "Kommunikation", lesen: L, schreiben: ALLE_VERWALTER,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { gruppe: "Gruppe", einzel: "Einzelgespräch", runde: "Runde (selbst angelegt)", verteiler: "Rundschreiben" } },
      { k: "verteiler", t: "Verteiler (automatisch)", typ: "text" },
      { k: "mitglieder", t: "Mitglieder", typ: "refs", ref: "personen" },
    ],
    intern: [{ k: "angeheftet", typ: "json" }], // 📌 0.38.0 bis zu 3 angeheftete Nachrichten (KC-CLUB-ANHEFTEN)
    liste: ["titel", "art", "verteiler"],
    anzeige: (z) => z.titel,
  },
  // BK-NACHRICHTEN (0.8.0, wie KC-CLUB-CHAT): ❗ wichtig, 🏎️ Express, ↩️ Antwort, ⏰ später senden (auch wiederholt), Reaktionen,
  // Bearbeiten (Frist), Zurückziehen. Haken (✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen) stehen je Empfänger in nachricht_status –
  // so wird eine Gruppen-Nachricht nicht bei jeder Lesebestätigung neu an alle verteilt. Schreiben nur über die Regeln (regeln.js).
  nachrichten: {
    titel: "Nachrichten", sym: "✉️", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "unterhaltung_id", t: "Unterhaltung", typ: "ref", ref: "unterhaltungen", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "text", t: "Text (leer bei reinen Anhängen/Umfragen)", typ: "lang" },
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "rueckmeldung", t: "Rückmeldung erbeten", typ: "ja" },
      { k: "wichtig", t: "❗ wichtig", typ: "ja" },
      { k: "express", t: "🏎️ Express", typ: "ja" },
      { k: "antwort_auf", t: "Antwort auf", typ: "text" },
      { k: "weitergeleitet_von", t: "↪️ weitergeleitet von", typ: "text" }, // 0.38.0 KC-CLUB-WEITERLEITEN (Name setzt der Server)
      { k: "erwaehnt", t: "@ erwähnt", typ: "refs", ref: "personen" }, // 0.38.0 KC-CLUB-ERWAEHNUNG (kommt auch bei 🔕 stumm durch)
      { k: "kanaele", t: "Benachrichtigen über", typ: "liste", werte: KOM_KANAELE },
      { k: "geplant_um", t: "⏰ senden um", typ: "zeit" },
      { k: "wiederholung", t: "Wiederholung", typ: "wahl", werte: { einmal: "einmal", taeglich: "jeden Tag", werktags: "werktags", woechentlich: "jede Woche", monatlich: "jeden Monat" } },
      { k: "anlagen", t: "📎 Anhänge", typ: "json" },
      { k: "umfrage", t: "📊 Umfrage", typ: "json" },
      { k: "loescht_am", t: "⏳ löscht sich am", typ: "zeit" },
      { k: "kontakt", t: "👤 geteilter Kontakt", typ: "ref", ref: "personen" }, // 0.51.0 KC-CLUB-KONTAKT
      { k: "konferenz", t: "👥 Konferenz (Raum)", typ: "text" }, // 0.51.0 KC-CLUB-KONFERENZ
      { k: "geheim", t: "🔒 verschlüsselt (technisch)", typ: "json" }, // 0.51.0 KC-CLUB-VERSCHLUESSELT – Text nur auf den Geräten lesbar
    ],
    liste: ["unterhaltung_id", "von", "text", "zeit"],
    intern: [{ k: "gelesen_von", typ: "refs", ref: "personen" }, { k: "rueckmeldungen", typ: "json" }, { k: "reaktionen", typ: "json" }, { k: "anzahl", typ: "zahl" },
      { k: "bearbeitet_am", typ: "zeit" }, { k: "zurueckgezogen_am", typ: "zeit" }, { k: "geplant_frei", typ: "zeit" },
      { k: "umfrage_stimmen", typ: "json" }, { k: "umfrage_frei", typ: "json" }], // 0.31.0: freie Antworten je Person (Text)
  },
  nachricht_status: {
    titel: "Nachrichten: angekommen & gelesen", sym: "✓✓", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "nachricht_id", t: "Nachricht", typ: "ref", ref: "nachrichten", pflicht: true },
      { k: "person_id", t: "Empfänger", typ: "ref", ref: "personen", pflicht: true },
      { k: "autor_id", t: "Absender", typ: "ref", ref: "personen" },
      { k: "zugestellt_am", t: "angekommen", typ: "zeit" },
      { k: "gelesen_am", t: "gelesen", typ: "zeit" },
      { k: "express_antwort", t: "Express-Antwort", typ: "wahl", werte: { geoeffnet: "geöffnet", spaeter: "später", nein: "jetzt nicht" } },
      { k: "express_bestaetigt_am", t: "Empfang bestätigt", typ: "zeit" },
    ],
    liste: ["nachricht_id", "person_id", "zugestellt_am", "gelesen_am"],
  },
  // BK-PINNWAND (0.7.0, wie KC-CLUB-PINNWAND): Post-its – höchstens PINNWAND.max je Person, je höchstens PINNWAND.zeichen Zeichen,
  // Farbe 1–4 vergibt der Server (gelb, rosé, hellgrün, hellblau). Sichtbar nur für Verfasser, Empfänger bzw. alle (fuer = alle) –
  // auch Verwalter sehen fremde private Zettel NICHT (Regel in regeln.js). Ändern nur über die Selbstbedienungs-Regeln.
  pinnwand: {
    titel: "Pinnwand", sym: "📌", gruppe: "Kommunikation", lesen: ALLE_VERWALTER, schreiben: [],
    felder: [
      { k: "text", t: "Text", typ: "lang", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "wichtig", t: "wichtig", typ: "ja" },
      { k: "fuer", t: "für", typ: "wahl", werte: { ich: "nur für mich", alle: "für alle", personen: "bestimmte Personen" } },
      { k: "personen", t: "Empfänger", typ: "refs", ref: "personen" },
      { k: "farbe", t: "Farbe (1–4)", typ: "zahl" },
      { k: "antworten", t: "mit Antwort-Knopf", typ: "ja" },
      { k: "zeit", t: "angepinnt", typ: "zeit" },
    ],
    liste: ["text", "von", "fuer", "wichtig", "zeit"],
    intern: [{ k: "anzahl", typ: "zahl" }],
  },
  uebungen: {
    // 🎻 Übe-Tagebuch: privat – sehen nur die Person selbst, ihre Eltern und (wenn „geteilt“) Leitung/Lehrkräfte
    titel: "Übe-Tagebuch", sym: "🎻", gruppe: "Noten", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "datum", t: "Datum", typ: "datum", pflicht: true },
      { k: "minuten", t: "Minuten", typ: "zahl", pflicht: true },
      { k: "werk_id", t: "Stück", typ: "ref", ref: "werke" },
      { k: "inhalt", t: "Was geübt", typ: "json" },
      { k: "gefuehl", t: "Wie lief's (1–5)", typ: "zahl" },
      { k: "notiz", t: "Notiz", typ: "lang" },
      { k: "geteilt", t: "mit Leitung/Lehrkräften geteilt", typ: "ja" },
    ],
    liste: ["person_id", "datum", "minuten", "werk_id", "gefuehl"],
  },
  // 📣 Startnachricht der Leitung (0.30.0, wie KC-CLUB-STARTNACHRICHT): geht beim nächsten Öffnen der App als Fenster auf –
  // Pflicht „gelesen“ oder Antwort ✅ Ja · ⏰ Später · ✖ Nein; dazu ↩️ Rückfrage. Empfänger: alle, Orchester (Gruppen) oder bestimmte Personen.
  startnachrichten: {
    titel: "Startnachrichten", sym: "📣", gruppe: "Kommunikation", lesen: L, schreiben: L,
    felder: [
      { k: "text", t: "Text", typ: "lang", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "an", t: "an", typ: "wahl", werte: SN_AN },
      { k: "gruppen", t: "Orchester", typ: "refs", ref: "gruppen" },
      { k: "personen", t: "Personen", typ: "refs", ref: "personen" },
      { k: "wichtig", t: "❗ wichtig", typ: "ja" },
      { k: "wahl", t: "mit Antwort Ja / Später / Nein", typ: "ja" },
      { k: "ziel", t: "Knopf zu (Stelle der App)", typ: "text" },
      { k: "zeit", t: "gesendet", typ: "zeit" },
      { k: "bis", t: "zeigen bis", typ: "datum" },
    ],
    liste: ["zeit", "text", "an", "wichtig"],
    anzeige: (z) => String(z.text || "").slice(0, 60),
  },
  // 🩺 0.43.0 Fehlerberichte der Geräte (wie KC Fehlerprotokoll): nur Fehlermeldung, Ansicht, Version, Gerät – sieht nur Admin/Entwickler
  fehlerberichte: {
    titel: "Fehlerberichte", sym: "🩺", gruppe: "System", lesen: ["admin"], schreiben: [],
    felder: [
      { k: "text", t: "Fehler", typ: "text", pflicht: true },
      { k: "ansicht", t: "Ansicht", typ: "text" },
      { k: "app_version", t: "App-Version", typ: "text" },
      { k: "geraet", t: "Gerät", typ: "text" },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen" },
      { k: "anzahl", t: "Anzahl", typ: "zahl" },
      { k: "zuletzt", t: "zuletzt", typ: "zeit" },
      { k: "erledigt", t: "erledigt", typ: "ja" },
    ],
    liste: ["text", "ansicht", "version", "anzahl", "zuletzt"],
  },
  rueckmeldungen: {
    titel: "Rückmeldungen zur App", sym: "🆘", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "art", t: "Art", typ: "wahl", werte: RM_ARTEN },
      { k: "text", t: "Was ist los?", typ: "lang", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "sterne", t: "Bewertung (1–5)", typ: "zahl" },
      { k: "geraet", t: "Gerät (automatisch)", typ: "text" },
      { k: "ansicht", t: "Wo in der App?", typ: "text" },
      { k: "rueckruf", t: "Bitte anrufen", typ: "ja" },
      { k: "bild", t: "📸 Bildschirmfoto (datei:…)", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: RM_STATUS },
      { k: "antwort", t: "Antwort der Leitung", typ: "lang" },
      { k: "beantwortet_am", t: "beantwortet", typ: "zeit" },
    ],
    liste: ["art", "von", "status"],
  },
  erstattungen: {
    titel: "Erstattungen", sym: "💶", gruppe: "Förderverein", lesen: ["admin", "leitung", "vorstand"], schreiben: [],
    felder: [
      { k: "von", t: "für", typ: "ref", ref: "personen" },
      { k: "art", t: "Art", typ: "wahl", werte: ER_ARTEN },
      { k: "datum", t: "Datum", typ: "datum", pflicht: true },
      { k: "zweck", t: "Wofür?", typ: "text", pflicht: true },
      { k: "km", t: "Kilometer (hin und zurück)", typ: "zahl" },
      { k: "betrag", t: "Betrag (€)", typ: "geld" },
      { k: "beleg", t: "Beleg (Foto/PDF)", typ: "text" },
      { k: "termin_id", t: "Termin", typ: "ref", ref: "termine" },
      { k: "status", t: "Status", typ: "wahl", werte: ER_STATUS },
      { k: "notiz_kasse", t: "Notiz der Kasse", typ: "text" },
      { k: "bearbeitet_von", t: "bearbeitet von", typ: "ref", ref: "personen" },
    ],
    liste: ["datum", "von", "zweck", "betrag", "status"],
  },
  anrufe: {
    titel: "Anrufe & Runder Tisch (Vermittlung)", sym: "📞", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "art", t: "Art", typ: "wahl", werte: ANRUF_ARTEN, pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "an", t: "an", typ: "refs", ref: "personen" },
      { k: "raum_id", t: "Runder Tisch", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: ANRUF_STATUS },
      { k: "angebot", t: "Verbindungsangebot (technisch)", typ: "json" },
      { k: "antwort", t: "Verbindungsantwort (technisch)", typ: "json" },
      { k: "beginn", t: "Beginn", typ: "zeit" },
      { k: "ende", t: "Ende", typ: "zeit" },
      { k: "gast", t: "🙋 Gast (statt Person)", typ: "text" }, // 0.51.0 KC-CLUB-RUNDER-TISCH-GAST
    ],
    liste: ["art", "von", "status"],
  },
  geheimschluessel: {
    // 🔑 0.51.0 Geheim schreiben (wie KC-CLUB-VERSCHLUESSELT): nur der ÖFFENTLICHE Schlüssel je Person – der private bleibt auf dem Gerät
    titel: "Öffentliche Schlüssel (Geheim schreiben)", sym: "🔑", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "pub", t: "Öffentlicher Schlüssel (technisch)", typ: "json" },
      { k: "fingerabdruck", t: "Fingerabdruck", typ: "text" },
    ],
    liste: ["person_id", "fingerabdruck"],
  },
  tischgaeste: {
    // 🙋 0.51.0 Gäste am Runden Tisch mit eigenem Link (wie KC-CLUB-RUNDER-TISCH-GAST) – der Link selbst wird nie gespeichert, nur sein Hash
    titel: "Gäste am Runden Tisch", sym: "🙋", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "raum_id", t: "Runder Tisch", typ: "text", pflicht: true },
      { k: "name", t: "Name des Gastes", typ: "text", pflicht: true },
      { k: "gueltig_bis", t: "gültig bis", typ: "zeit" },
      { k: "von", t: "eingeladen von", typ: "ref", ref: "personen" },
    ],
    intern: [{ k: "token_hash", typ: "text" }],
    liste: ["name", "raum_id", "gueltig_bis"],
  },
  unterlagen: {
    titel: "Unterlagen (Familien-Ordner)", sym: "📁", gruppe: "Genehmigungen", lesen: [], schreiben: [],
    felder: [
      { k: "person_id", t: "Für wen?", typ: "ref", ref: "personen", pflicht: true },
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: UNTERLAGEN_ARTEN },
      { k: "datei", t: "Datei (datei:…)", typ: "text", pflicht: true },
      { k: "von", t: "abgelegt von", typ: "ref", ref: "personen" },
      { k: "jahr", t: "Jahr", typ: "zahl" },
    ],
    liste: ["person_id", "titel", "art"],
  },
  versammlungen: {
    titel: "Sitzungen & Versammlungen", sym: "🎬", gruppe: "Förderverein", lesen: [], schreiben: [],
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: SITZUNG_ARTEN },
      { k: "zielgruppe", t: "Für wen?", typ: "wahl", werte: SITZUNG_FUER },
      { k: "beginn", t: "Beginn", typ: "zeit", pflicht: true },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "tagesordnung", t: "Tagesordnung", typ: "json" },
      { k: "status", t: "Status", typ: "wahl", werte: SITZUNG_STATUS },
      { k: "frist_tage", t: "Einladung spätestens (Tage vorher)", typ: "zahl" },
      { k: "eingeladen_am", t: "eingeladen am", typ: "zeit" },
      { k: "erinnert_am", t: "erinnert am", typ: "zeit" },
      { k: "gestartet_am", t: "gestartet", typ: "zeit" },
      { k: "beendet_am", t: "beendet", typ: "zeit" },
      { k: "leiter", t: "Sitzungsleitung", typ: "ref", ref: "personen" },
      { k: "protokoll_id", t: "Protokoll", typ: "ref", ref: "dokumente" },
      { k: "anwesenheit", t: "Anwesenheit (je Person da/entschuldigt/fehlt)", typ: "json" },
    ],
    liste: ["titel", "beginn", "status"],
  },
  boerse: {
    titel: "Bachkreis-Börse", sym: "🛍️", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "art", t: "Art", typ: "wahl", werte: BOERSE_ARTEN, pflicht: true },
      { k: "kategorie", t: "Bereich", typ: "wahl", werte: BOERSE_KAT },
      { k: "titel", t: "Was?", typ: "text", pflicht: true },
      { k: "text", t: "Beschreibung", typ: "lang" },
      { k: "preis", t: "Preis (€, leer = Verhandlungssache)", typ: "geld" },
      { k: "verschenken", t: "zu verschenken", typ: "ja" },
      { k: "foto", t: "Foto (datei:…)", typ: "text" },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "status", t: "Status", typ: "wahl", werte: BOERSE_STATUS },
      { k: "termin_id", t: "Für Termin", typ: "ref", ref: "termine" },
      { k: "helfer_anzahl", t: "Wie viele Helfer?", typ: "zahl" },
      { k: "helfer", t: "Helfer", typ: "refs", ref: "personen" },
      { k: "frist", t: "bis wann?", typ: "datum" },
    ],
    liste: ["art", "titel", "von", "status"],
  },
  jahrbuch_momente: {
    titel: "Jahrbuch: schönste Momente", sym: "📖", gruppe: "Kommunikation", lesen: [], schreiben: [],
    felder: [
      { k: "schuljahr", t: "Schuljahr", typ: "text", pflicht: true },
      { k: "text", t: "Mein schönster Moment", typ: "lang", pflicht: true },
      { k: "foto_id", t: "Foto aus dem Fotoalbum", typ: "ref", ref: "fotos" },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "freigegeben", t: "im Jahrbuch", typ: "ja" },
      { k: "freigegeben_von", t: "freigegeben von", typ: "ref", ref: "personen" },
    ],
    liste: ["schuljahr", "von", "freigegeben"],
  },
  vorschlaege: {
    titel: "Vorschläge & Abstimmungen", sym: "💡", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "titel", t: "Worum geht es?", typ: "text", pflicht: true },
      { k: "text", t: "Beschreibung", typ: "lang" },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "art", t: "Art", typ: "wahl", werte: { vorschlag: "💡 Vorschlag", abstimmung: "🗳️ Abstimmung" } },
      { k: "an", t: "Für wen?", typ: "wahl", werte: VS_AN },
      { k: "optionen", t: "Antworten", typ: "json" },
      { k: "frist", t: "Abstimmen bis", typ: "datum" },
      { k: "anonym", t: "🔒 geheim", typ: "ja" },
      { k: "status", t: "Status", typ: "wahl", werte: { offen: "läuft", beendet: "beendet", erledigt: "erledigt" } },
      { k: "ergebnis", t: "Ergebnis / Beschluss", typ: "lang" },
    ],
    liste: ["titel", "art", "an", "status"],
    anzeige: (z) => z.titel,
  },
  vorschlag_stimmen: {
    titel: "Stimmen", sym: "✋", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "vorschlag_id", t: "Vorschlag", typ: "ref", ref: "vorschlaege", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen" },
      { k: "wahl", t: "Wahl", typ: "text" },
      { k: "am", t: "am", typ: "zeit" },
    ],
    liste: ["vorschlag_id", "wahl", "am"],
  },
  fotoalben: {
    titel: "Fotoalben", sym: "📷", gruppe: "Orchester", lesen: L, schreiben: [],
    felder: [
      { k: "titel", t: "Name des Albums", typ: "text", pflicht: true },
      { k: "datum", t: "Datum", typ: "datum" },
      { k: "beschreibung", t: "Beschreibung", typ: "lang" },
      { k: "projekt_id", t: "Projekt", typ: "ref", ref: "projekte" },
      { k: "sichtbar", t: "Wer sieht es?", typ: "wahl", werte: FOTO_SICHT },
      { k: "von", t: "angelegt von", typ: "ref", ref: "personen" },
      { k: "titelbild", t: "Titelbild (Foto)", typ: "text" },
    ],
    liste: ["titel", "datum", "sichtbar"],
    anzeige: (z) => z.titel,
  },
  fotos: {
    titel: "Fotos", sym: "🖼️", gruppe: "Orchester", lesen: L, schreiben: [],
    felder: [
      { k: "album_id", t: "Album", typ: "ref", ref: "fotoalben", pflicht: true },
      { k: "datei", t: "Datei", typ: "text", pflicht: true },
      { k: "titel", t: "Bildunterschrift", typ: "text" },
      { k: "von", t: "hochgeladen von", typ: "ref", ref: "personen" },
      { k: "personen", t: "Wer ist zu sehen? (nur mit Foto-Einwilligung)", typ: "refs", ref: "personen" },
      { k: "aufgenommen_am", t: "aufgenommen", typ: "zeit" },
      { k: "papierkorb_am", t: "im Papierkorb seit", typ: "zeit" },
    ],
    liste: ["album_id", "titel", "von", "aufgenommen_am"],
  },
  terminumfragen: {
    titel: "Terminumfragen", sym: "🗳️", gruppe: "Termine", lesen: L, schreiben: [],
    felder: [
      { k: "titel", t: "Worum geht es?", typ: "text", pflicht: true },
      { k: "beschreibung", t: "Hinweise", typ: "lang" },
      { k: "von", t: "angelegt von", typ: "ref", ref: "personen" },
      { k: "an", t: "Wer stimmt ab?", typ: "wahl", werte: TU_AN },
      { k: "fuer_alle", t: "Ganzer Bachkreis", typ: "ja" },
      { k: "gruppen", t: "Orchester", typ: "refs", ref: "gruppen" },
      { k: "art_id", t: "Terminart (für den Termin)", typ: "ref", ref: "terminarten" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "dauer_min", t: "Dauer (Minuten)", typ: "zahl" },
      { k: "optionen", t: "Mögliche Termine", typ: "json" },
      { k: "frist", t: "Abstimmen bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { offen: "läuft", entschieden: "entschieden", abgebrochen: "abgebrochen" } },
      { k: "gewaehlt", t: "Gewählter Termin", typ: "text" },
      { k: "termin_id", t: "Angelegter Termin", typ: "ref", ref: "termine" },
    ],
    liste: ["titel", "an", "frist", "status"],
    anzeige: (z) => z.titel,
  },
  terminumfrage_antworten: {
    titel: "Terminumfragen: Antworten", sym: "🗳️", gruppe: "Termine", lesen: L, schreiben: [],
    felder: [
      { k: "umfrage_id", t: "Umfrage", typ: "ref", ref: "terminumfragen", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "stimmen", t: "Stimmen", typ: "json" },
      { k: "kommentar", t: "Kommentar", typ: "text" },
      { k: "am", t: "am", typ: "zeit" },
    ],
    liste: ["umfrage_id", "person_id", "am"],
  },
  // 💬 0.38.0 Chat-Einstellungen je Person (🔕 stumm bis, 📦 archiviert, ⭐ Favorit) – sieht und ändert nur die Person selbst
  chat_einstellungen: {
    titel: "Chat-Einstellungen je Person", sym: "🔕", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "unterhaltung_id", t: "Unterhaltung", typ: "ref", ref: "unterhaltungen", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "stumm_bis", t: "🔕 stumm bis", typ: "zeit" },
      { k: "archiviert", t: "📦 archiviert", typ: "ja" },
      { k: "favorit", t: "⭐ Favorit", typ: "ja" },
    ],
    liste: ["unterhaltung_id", "person_id", "stumm_bis", "archiviert", "favorit"],
  },
  // 🔖 0.38.0 Merkliste (KC-CLUB-MERKEN): private Lesezeichen auf Nachrichten
  chat_merker: {
    titel: "Gemerkte Nachrichten", sym: "🔖", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "nachricht_id", t: "Nachricht", typ: "ref", ref: "nachrichten", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "aktiv", t: "gemerkt", typ: "ja" },
      { k: "am", t: "am", typ: "zeit" },
    ],
    liste: ["nachricht_id", "person_id", "aktiv", "am"],
  },
  startnachricht_antworten: {
    titel: "Startnachricht: Antworten", sym: "✅", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "nachricht_id", t: "Startnachricht", typ: "ref", ref: "startnachrichten", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "antwort", t: "Antwort", typ: "wahl", werte: SN_ANTWORTEN },
      { k: "rueckfrage", t: "Rückfrage", typ: "lang" },
      { k: "am", t: "am", typ: "zeit" },
      { k: "spaeter_bis", t: "später – wieder zeigen ab", typ: "zeit" },
    ],
    liste: ["nachricht_id", "person_id", "antwort", "am"],
  },
  pinnwand_gelesen: {
    titel: "Pinnwand: gesehen & erledigt", sym: "👁️", gruppe: "Kommunikation", lesen: L, schreiben: [],
    felder: [
      { k: "zettel_id", t: "Zettel", typ: "ref", ref: "pinnwand", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "gesehen_am", t: "gesehen", typ: "zeit" },
      { k: "erledigt_am", t: "erledigt", typ: "zeit" },
    ],
    liste: ["zettel_id", "person_id", "gesehen_am", "erledigt_am"],
  },
  genehmigung_vorlagen: {
    titel: "Genehmigungs-Vorlagen", sym: "📝", gruppe: "Genehmigungen", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "text", t: "Text für die Eltern", typ: "lang", pflicht: true },
      { k: "fassung", t: "Textfassung", typ: "zahl" },
      { k: "gueltig_monate", t: "gültig … Monate (leer = unbegrenzt)", typ: "zahl" },
      { k: "zweck", t: "Zweck", typ: "wahl", werte: GENEHMIGUNG_ZWECKE },
    ],
    liste: ["titel", "zweck", "fassung", "gueltig_monate"],
    anzeige: (z) => z.titel,
  },
  // 🩺 Gesundheit & Notfall (0.20.0): strukturiert statt Freitext. Lesen: Leitung, Lehrkräfte, die Eltern (bzw. volljährige Schüler selbst)
  // und Begleitpersonen eines Projekts nur während der Fahrt (Server-Regel). Eltern pflegen selbst; Bestätigung hält 13 Monate (loeschen_am).
  gesundheit: {
    titel: "Gesundheit & Notfall", sym: "🩺", gruppe: "Genehmigungen", lesen: LL, schreiben: L,
    felder: [
      { k: "person_id", t: "Kind / Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler", pflicht: true },
      { k: "allergien", t: "Allergien", typ: "lang" },
      { k: "ernaehrung", t: "Ernährung / Unverträglichkeiten", typ: "text" },
      { k: "medikamente", t: "Medikamente (Name, Dosis, wann)", typ: "lang" },
      { k: "erkrankungen", t: "Erkrankungen / Hinweise (z. B. Asthma, Diabetes, Epilepsie)", typ: "lang" },
      { k: "notfall_name", t: "Notfallkontakt (wenn nicht die Eltern)", typ: "text" },
      { k: "notfall_tel", t: "Telefon Notfallkontakt", typ: "tel" },
      { k: "krankenkasse", t: "Krankenkasse", typ: "text" },
      { k: "hausarzt", t: "Hausarzt / Kinderarzt", typ: "text" },
      { k: "tetanus", t: "letzte Tetanus-Impfung", typ: "datum" },
      { k: "schwimmer", t: "Schwimmer", typ: "wahl", werte: { ja: "ja", nein: "nein", unsicher: "unsicher" } },
      { k: "erste_hilfe_ok", t: "Begleiter dürfen kleine Verletzungen versorgen und Zecken entfernen", typ: "ja" },
      { k: "medikamente_geben_ok", t: "Begleiter dürfen die genannten Medikamente geben", typ: "ja" },
      { k: "geprueft_am", t: "zuletzt bestätigt am", typ: "datum" },
      { k: "geprueft_von", t: "bestätigt von", typ: "ref", ref: "personen" },
      { k: "loeschen_am", t: "löschen am (ohne neue Bestätigung)", typ: "datum" },
    ],
    liste: ["person_id", "allergien", "medikamente", "geprueft_am", "loeschen_am"],
    anzeige: (z) => z.person_id,
  },
  genehmigungen: {
    titel: "Genehmigungen", sym: "✍️", gruppe: "Genehmigungen", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "vorlage_id", t: "Vorlage", typ: "ref", ref: "genehmigung_vorlagen", pflicht: true },
      { k: "kind_id", t: "Kind", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler", pflicht: true },
      { k: "projekt_id", t: "für Projekt", typ: "ref", ref: "projekte" },
      { k: "frist", t: "Frist", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { ausstehend: "ausstehend", erteilt: "erteilt", abgelehnt: "abgelehnt", widerrufen: "widerrufen" } },
      { k: "beantwortet_von", t: "beantwortet von", typ: "ref", ref: "personen" },
      { k: "beantwortet_am", t: "beantwortet am", typ: "zeit" },
      { k: "papier", t: "auf Papier eingegangen", typ: "ja" },
      { k: "ausleihe_id", t: "zur Ausleihe", typ: "ref", ref: "ausleihen" },
    ],
    liste: ["vorlage_id", "kind_id", "projekt_id", "frist", "status"],
    intern: [{ k: "vorlage_version", typ: "zahl" }],
  },
  werke: {
    titel: "Notenarchiv – Werke", sym: "📚", gruppe: "Noten", lesen: ALLE_VERWALTER, schreiben: [...LL, "notenwart"],
    felder: [
      { k: "komponist", t: "Komponist", typ: "text", pflicht: true },
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "werkverzeichnis", t: "Werkverzeichnis (BWV …)", typ: "text" },
      { k: "ausgabe", t: "Verlag / Ausgabe", typ: "text" },
      { k: "rechte", t: "Rechte", typ: "wahl", werte: { gemeinfrei: "gemeinfrei", lizenziert: "lizenziert", intern: "nur intern" } },
      { k: "projekte", t: "in Projekten", typ: "refs", ref: "projekte" },
      { k: "gruppen", t: "für Orchester / Klasse", typ: "refs", ref: "gruppen" },
      { k: "schwierigkeit", t: "Schwierigkeit", typ: "wahl", werte: { leicht: "leicht", mittel: "mittel", schwer: "schwer" } },
      { k: "dauer_min", t: "Dauer (Minuten)", typ: "zahl" },
      // 📜 Mietmaterial & GEMA (0.22.0)
      { k: "verlag", t: "Verlag (für GEMA)", typ: "text" },
      { k: "bearbeiter", t: "Bearbeiter / Arrangeur", typ: "text" },
      { k: "miete_bis", t: "Mietmaterial: Rückgabe an den Verlag bis", typ: "datum" },
      { k: "gema", t: "GEMA-pflichtig (Komponist/Bearbeiter < 70 Jahre tot)", typ: "ja" },
    ],
    liste: ["komponist", "titel", "werkverzeichnis", "gruppen", "rechte", "miete_bis"],
    anzeige: (z) => `${z.komponist}: ${z.titel}`,
  },
  stimmen: {
    titel: "Notenarchiv – Stimmen", sym: "🎼", gruppe: "Noten", lesen: ALLE_VERWALTER, schreiben: [...LL, "notenwart"],
    felder: [
      { k: "werk_id", t: "Werk", typ: "ref", ref: "werke", pflicht: true },
      { k: "bezeichnung", t: "Stimme", typ: "text", pflicht: true },
      { k: "register_id", t: "für Register", typ: "ref", ref: "register" },
      { k: "gruppe_id", t: "nur Gruppe", typ: "ref", ref: "gruppen" },
      { k: "person_id", t: "nur Person (Sonderzuteilung)", typ: "ref", ref: "personen" },
      { k: "datei", t: "Datei (Speicher-Adapter)", typ: "text" },
    ],
    liste: ["werk_id", "bezeichnung", "register_id", "gruppe_id", "datei"],
  },
  aufnahmen: {
    titel: "Konzertaufnahmen", sym: "🎧", gruppe: "Noten", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "datum", t: "Datum", typ: "datum" },
      { k: "projekt_id", t: "Projekt / Konzert", typ: "ref", ref: "projekte" },
      { k: "datei", t: "Datei (Speicher-Adapter)", typ: "text" },
      { k: "quelle_url", t: "Link (z. B. YouTube)", typ: "text" },
      { k: "dauer_sek", t: "Dauer (Sekunden)", typ: "zahl" },
      { k: "freigabe", t: "Sichtbar für", typ: "wahl", werte: { intern: "nur Leitung", mitglieder: "Mitglieder & Eltern", oeffentlich: "öffentlich" } },
      { k: "notiz", t: "Notiz (Einwilligungen, Rechte)", typ: "lang" },
    ],
    liste: ["datum", "titel", "projekt_id", "freigabe"],
    anzeige: (z) => z.titel,
  },
  spenden: {
    titel: "Unterstützer & Spenden", sym: "💛", gruppe: "Förderverein", lesen: [...L, "vorstand"], schreiben: [...L, "vorstand"],
    felder: [
      { k: "person_id", t: "von", typ: "ref", ref: "personen", filter: (p) => ["spender", "unterstuetzer", "foerderverein", "eltern"].includes(p.typ), pflicht: true },
      { k: "datum", t: "Datum", typ: "datum", pflicht: true },
      { k: "betrag", t: "Betrag (€)", typ: "geld" },
      { k: "sachspende", t: "Sachspende", typ: "text" },
      { k: "zweck", t: "Zweck", typ: "text" },
      { k: "dank_gesendet", t: "Dank gesendet", typ: "ja" },
      { k: "inventar_id", t: "Sachspende ist Instrument", typ: "ref", ref: "inventar" },
      { k: "ausstattung_id", t: "Sachspende ist Ausstattung", typ: "ref", ref: "ausstattung" },
    ],
    liste: ["datum", "person_id", "betrag", "sachspende", "zweck", "dank_gesendet"],
  },
  // 💛 Fördervereins-Mitgliedschaft (0.22.0) – ohne Lastschrift/SEPA (bewusst), nur „bezahlt bis“
  fv_mitglieder: {
    titel: "Förderverein – Mitglieder", sym: "🤝", gruppe: "Förderverein", lesen: [...L, "vorstand"], schreiben: [...L, "vorstand"],
    felder: [
      { k: "person_id", t: "Mitglied", typ: "ref", ref: "personen", pflicht: true },
      { k: "mitglied_nr", t: "Mitglieds-Nr.", typ: "text" },
      { k: "eintritt", t: "Eintritt", typ: "datum", pflicht: true },
      { k: "austritt", t: "Austritt", typ: "datum" },
      { k: "beitrag_art", t: "Beitrag", typ: "wahl", werte: { familie: "Familie", einzel: "Einzel", ermaessigt: "ermäßigt", foerder: "Fördermitglied", ehren: "Ehrenmitglied (frei)" } },
      { k: "beitrag", t: "Beitrag je Jahr (€)", typ: "geld" },
      { k: "zahlweise", t: "Zahlweise", typ: "wahl", werte: { ueberweisung: "Überweisung", bar: "bar", dauerauftrag: "Dauerauftrag" } },
      { k: "bezahlt_bis", t: "bezahlt bis", typ: "datum" },
      { k: "notiz", t: "Notiz", typ: "text" },
    ],
    liste: ["person_id", "mitglied_nr", "eintritt", "beitrag_art", "beitrag", "bezahlt_bis", "austritt"],
  },
  aufgaben: {
    titel: "Vorgänge & Aufgaben", sym: "🗂️", gruppe: "Leitung", lesen: ALLE_VERWALTER, schreiben: ALLE_VERWALTER,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { aufgabe: "Aufgabe", aenderung: "Änderungsmeldung", wechselwunsch: "Gruppenwechsel-Wunsch", sonstiges: "Sonstiges" } },
      { k: "status", t: "Status", typ: "wahl", werte: { offen: "offen", in_arbeit: "in Arbeit", erledigt: "erledigt" } },
      { k: "zustaendig_id", t: "zuständig", typ: "ref", ref: "personen" },
      { k: "von_id", t: "von", typ: "ref", ref: "personen" },
      { k: "frist", t: "Frist", typ: "datum" },
      { k: "text", t: "Beschreibung", typ: "lang" },
    ],
    liste: ["titel", "art", "status", "zustaendig_id", "frist"],
    intern: [{ k: "ziel_gruppe", typ: "ref", ref: "gruppen" }],
  },
  zugaenge: {
    titel: "Zugänge", sym: "🔑", gruppe: "System", lesen: [...L], schreiben: [...L],
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "code", t: "Zugangscode", typ: "text" },
      { k: "art", t: "Anmeldung", typ: "wahl", werte: { link: "persönlicher Link / QR", iserv: "IServ (vorbereitet)" } },
      { k: "aktiv", t: "aktiv", typ: "ja" },
      { k: "verwaltung", t: "darf PC-Verwaltung nutzen", typ: "ja" },
      { k: "zuletzt", t: "zuletzt gesehen", typ: "zeit" },
    ],
    liste: ["person_id", "art", "aktiv", "verwaltung", "zuletzt"],
  },
  // ---------- BK Communicator (Versand-Kern nach dem Vorbild des KC Communicators) ----------
  // versand = Auftrags-Tabelle: ein Auftrag je Empfänger und Kanal (Router legt an, Zustellung arbeitet ab).
  versand: {
    titel: "Versand-Aufträge", sym: "📨", gruppe: "Communicator", lesen: L, schreiben: L, nurLesen: true, aufbewahrung_tage: 30,
    anzeige: (z) => `${z.kanal} · ${z.betreff || ""}`,
    felder: [
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "kanal", t: "Kanal", typ: "wahl", werte: KOM_KANAELE },
      { k: "an_id", t: "an", typ: "ref", ref: "personen" },
      { k: "betreff", t: "Betreff", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: KOM_STATUS },
      { k: "ereignis", t: "Ereignis", typ: "text" },
      { k: "programm", t: "Programm", typ: "text" },
      { k: "prioritaet", t: "Priorität", typ: "wahl", werte: KOM_PRIORITAET },
      { k: "anbieter_id", t: "Anbieter", typ: "ref", ref: "kom_anbieter" },
      { k: "versuche", t: "Versuche", typ: "zahl" },
      { k: "fehler_code", t: "Fehlercode", typ: "text" },
      { k: "fehler_text", t: "Fehler", typ: "text" },
      { k: "naechster_versuch", t: "nächster Versuch", typ: "zeit" },
      { k: "gesendet_am", t: "gesendet", typ: "zeit" },
      { k: "korrelation", t: "Vorgang", typ: "text" },
    ],
    liste: ["zeit", "kanal", "an_id", "betreff", "status", "anbieter_id", "versuche"],
    intern: [
      { k: "info", typ: "text" }, { k: "vorlage", typ: "text" }, { k: "idempotenz", typ: "text" }, { k: "anbieter_nachricht_id", typ: "text" },
      { k: "quittung_noetig", typ: "ja" }, { k: "quittung_hash", typ: "text" }, { k: "status_am", typ: "zeit" }, { k: "meta", typ: "json" },
    ],
  },
  kom_einstellungen: {
    titel: "Communicator: Grundeinstellungen", sym: "🎛️", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: () => "Grundeinstellungen",
    felder: [
      { k: "versand_aktiv", t: "Versand eingeschaltet (aus = Not-Aus; Notfälle „kritisch“ gehen trotzdem raus)", typ: "ja" },
      { k: "nur_kostenlos", t: "Nur kostenlose Anbieter (Zero-Cost-Sperre)", typ: "ja" },
      { k: "max_pro_minute", t: "Höchstens … Zustellungen je Minute (alle Anbieter)", typ: "zahl" },
      { k: "ruhe_von", t: "Ruhezeit von (HH:MM)", typ: "text" },
      { k: "ruhe_bis", t: "Ruhezeit bis (HH:MM)", typ: "text" },
      { k: "max_versuche", t: "Versuche bis „aufgegeben“", typ: "zahl" },
      { k: "basis_sekunden", t: "Wartezeit 1. Wiederholung (Sek.)", typ: "zahl" },
      { k: "max_sekunden", t: "längste Wartezeit (Sek.)", typ: "zahl" },
      { k: "absender_name", t: "Absender-Name (E-Mail)", typ: "text" },
      { k: "absender_email", t: "Absender-Adresse (beim Mail-Anbieter bestätigt)", typ: "email" },
      { k: "antwort_an", t: "Antworten an (E-Mail)", typ: "email" },
      { k: "app_url", t: "Adresse der App (für Links in Mails/Push)", typ: "text" },
    ],
    liste: ["versand_aktiv", "nur_kostenlos", "max_pro_minute", "ruhe_von", "ruhe_bis"],
  },
  kom_programme: {
    titel: "Communicator: Programme", sym: "🧩", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => z.name,
    felder: [
      { k: "schluessel", t: "Schlüssel", typ: "text", pflicht: true },
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "aktiv", t: "aktiv (aus = Programm darf nichts senden)", typ: "ja" },
      { k: "beschreibung", t: "Beschreibung", typ: "lang" },
    ],
    liste: ["name", "schluessel", "aktiv"],
  },
  kom_vorlagen: {
    titel: "Communicator: Vorlagen", sym: "📝", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => z.name,
    felder: [
      { k: "schluessel", t: "Schlüssel", typ: "text", pflicht: true },
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "betreff", t: "Betreff ({{betreff}}, {{vorname}}, {{absender}} …)", typ: "text" },
      { k: "text", t: "Text ({{text}}, {{name}}, {{app_url}} …)", typ: "lang" },
      { k: "varianten", t: "Varianten je Kanal (JSON, z. B. {\"mail\":{\"text\":\"…\"}})", typ: "json" },
    ],
    liste: ["name", "schluessel", "betreff"],
  },
  kom_regeln: {
    titel: "Communicator: Regeln je Ereignis", sym: "🔀", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => `${KOM_EREIGNISSE[z.ereignis] || z.ereignis}`,
    felder: [
      { k: "ereignis", t: "Ereignis", typ: "wahl", werte: KOM_EREIGNISSE, pflicht: true },
      { k: "programm_id", t: "Programm", typ: "ref", ref: "kom_programme", pflicht: true },
      { k: "kanaele", t: "Kanäle (Rückfall in der Reihenfolge Push → E-Mail → App)", typ: "liste", werte: KOM_KANAELE_VERSAND },
      { k: "modus", t: "Modus", typ: "wahl", werte: { rueckfall: "Rückfall – erster erreichbarer Kanal, bei Fehler der nächste", alle: "Alle Kanäle gleichzeitig" } },
      { k: "vorlage_id", t: "Vorlage", typ: "ref", ref: "kom_vorlagen" },
      { k: "prioritaet", t: "Priorität", typ: "wahl", werte: KOM_PRIORITAET },
      { k: "ruhezeit", t: "In der Ruhezeit", typ: "wahl", werte: { verschieben: "bis zum Morgen verschieben", ignorieren: "trotzdem senden" } },
      { k: "quittung", t: "Lesebestätigung nötig (sonst Eskalation)", typ: "ja" },
      { k: "eltern", t: "Minderjährige", typ: "wahl", werte: { auch: "Eltern zusätzlich benachrichtigen", statt: "statt des Kindes die Eltern", nein: "nur das Kind" } },
      { k: "dedupe_sekunden", t: "Doppelte gleiche Meldung unterdrücken (Sek.)", typ: "zahl" },
      { k: "aktiv", t: "aktiv", typ: "ja" },
    ],
    liste: ["ereignis", "programm_id", "kanaele", "modus", "prioritaet", "aktiv"],
  },
  kom_anbieter: {
    titel: "Communicator: Anbieter", sym: "🏭", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => z.name,
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "kanal", t: "Kanal", typ: "wahl", werte: { push: "Push", mail: "E-Mail", alle: "alle (Test)" }, pflicht: true },
      { k: "art", t: "Technik", typ: "wahl", werte: { webpush: "Web-Push (VAPID, kostenlos)", brevo: "Brevo (E-Mail-API, Gratis-Kontingent)", smtp: "SMTP (eigenes Postfach)", protokoll: "Protokoll (Test, sendet nichts)" }, pflicht: true },
      { k: "kostenlos", t: "kostenlos", typ: "ja" },
      { k: "aktiv", t: "aktiv", typ: "ja" },
      { k: "bremse_minute", t: "Bremse: höchstens … je Minute", typ: "zahl" },
      { k: "bremse_stunde", t: "Bremse: höchstens … je Stunde", typ: "zahl" },
      { k: "tageslimit", t: "höchstens … je Tag (Gratis-Kontingent)", typ: "zahl" },
      { k: "geheimnis", t: "Name des Server-Secrets (nur der NAME, nie der Schlüssel!)", typ: "text" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["name", "kanal", "art", "kostenlos", "aktiv", "tageslimit"],
  },
  kom_routen: {
    titel: "Communicator: Routen", sym: "🛣️", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => `${z.kanal} #${z.rang}`,
    felder: [
      { k: "kanal", t: "Kanal", typ: "wahl", werte: { push: "Push", mail: "E-Mail" }, pflicht: true },
      { k: "anbieter_id", t: "Anbieter", typ: "ref", ref: "kom_anbieter", pflicht: true },
      { k: "rang", t: "Rang (1 = zuerst)", typ: "zahl" },
      { k: "auto_wechsel", t: "bei Störung automatisch zum nächsten Anbieter", typ: "ja" },
      { k: "aktiv", t: "aktiv", typ: "ja" },
    ],
    liste: ["kanal", "rang", "anbieter_id", "auto_wechsel", "aktiv"],
  },
  kom_eskalationen: {
    titel: "Communicator: Eskalationen", sym: "📣", gruppe: "Communicator", lesen: L, schreiben: L,
    anzeige: (z) => z.name,
    felder: [
      { k: "name", t: "Name", typ: "text", pflicht: true },
      { k: "ereignis", t: "Ereignis", typ: "wahl", werte: KOM_EREIGNISSE, pflicht: true },
      { k: "ausloeser", t: "Auslöser", typ: "wahl", werte: { nicht_quittiert: "nicht bestätigt", fehlgeschlagen: "Zustellung fehlgeschlagen" }, pflicht: true },
      { k: "warte_sekunden", t: "warten (Sek.)", typ: "zahl" },
      { k: "kanaele", t: "dann über", typ: "liste", werte: KOM_KANAELE_VERSAND },
      { k: "an", t: "an", typ: "wahl", werte: { empfaenger: "denselben Empfänger", leitung: "die Leitung" } },
      { k: "aktiv", t: "aktiv", typ: "ja" },
    ],
    liste: ["name", "ereignis", "ausloeser", "warte_sekunden", "an", "aktiv"],
  },
  kom_zustand: {
    titel: "Communicator: Anbieter-Zustand", sym: "🚦", gruppe: "Communicator", lesen: L, schreiben: [], nurLesen: true,
    anzeige: (z) => z.anbieter_id,
    felder: [
      { k: "anbieter_id", t: "Anbieter", typ: "ref", ref: "kom_anbieter" },
      { k: "status", t: "Zustand", typ: "wahl", werte: { ok: "ok", gestoert: "gestört", ausgefallen: "ausgefallen", nicht_eingerichtet: "nicht eingerichtet", unbekannt: "unbekannt" } },
      { k: "fehler_folge", t: "Fehler in Folge", typ: "zahl" },
      { k: "letzter_erfolg", t: "letzter Erfolg", typ: "zeit" },
      { k: "letzter_fehler", t: "letzter Fehler", typ: "zeit" },
      { k: "fehler_text", t: "Fehler", typ: "text" },
      { k: "gesendet_24h", t: "gesendet (24 Std.)", typ: "zahl" },
      { k: "geprueft_am", t: "geprüft", typ: "zeit" },
    ],
    liste: ["anbieter_id", "status", "fehler_folge", "gesendet_24h", "geprueft_am"],
  },
  kom_ereignisse: {
    titel: "Communicator: Ereignisprotokoll", sym: "🧾", gruppe: "Communicator", lesen: L, schreiben: [], nurLesen: true, aufbewahrung_tage: 14,
    anzeige: (z) => z.art,
    felder: [
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "auftrag_id", t: "Auftrag", typ: "text" },
      { k: "art", t: "Ereignis", typ: "text" },
      { k: "kanal", t: "Kanal", typ: "text" },
      { k: "anbieter_id", t: "Anbieter", typ: "text" },
      { k: "code", t: "Code", typ: "text" },
      { k: "text", t: "Text", typ: "text" },
    ],
    liste: ["zeit", "art", "kanal", "anbieter_id", "code", "text"],
  },
  aenderungen: {
    titel: "Änderungsprotokoll (Abgleich)", sym: "🔁", gruppe: "System", lesen: L, schreiben: [], nurLesen: true,
    felder: [
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "tabelle", t: "Tabelle", typ: "text" },
      { k: "zeile_id", t: "Datensatz", typ: "text" },
      { k: "aktion", t: "Aktion", typ: "wahl", werte: { neu: "neu", geaendert: "geändert", geloescht: "gelöscht" } },
      { k: "wer", t: "wer", typ: "text" },
      { k: "quelle", t: "Quelle", typ: "wahl", werte: { app: "App", verwaltung: "PC-Verwaltung", import: "Import", system: "System" } },
    ],
    liste: ["zeit", "tabelle", "aktion", "wer", "quelle"],
  },
};

export const TABELLEN_NAMEN = Object.keys(TABELLEN);

export function anzeigeName(tab, z) {
  if (!z) return "–";
  const d = TABELLEN[tab];
  if (d?.anzeige) return d.anzeige(z);
  return z.titel || z.name || z.id;
}
