// Tabellen-Registry: EINE Beschreibung für lokale Demo-Datenbank, Supabase-Adapter, PC-Verwaltung (Formulare, Listen,
// CSV-Import/-Export) und den Vertragstest (jede Tabelle muss in den Supabase-Migrationen existieren: bk_<name>).
// Keine Tabelle, kein Feld wird anderswo hart codiert (AGENTS.md Regel 4).

// Rollen. „Verwalter“ dürfen in der PC-Verwaltung arbeiten (Leitung, Vorstand Förderverein, Lehrkräfte, Admin).
export const ROLLEN = {
  admin: "Admin",
  leitung: "Leitung",
  lehrkraft: "Lehrkraft",
  vorstand: "Vorstand Förderverein",
  instrumentenwart: "Instrumentenwart",
  notenwart: "Notenwart",
  registerfuehrer: "Registerführer",
  schueler: "Schüler",
  eltern: "Eltern",
};
export const VERWALTER = ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"];
const L = ["admin", "leitung"];
const LL = ["admin", "leitung", "lehrkraft"];
const ALLE_VERWALTER = VERWALTER;

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

// Feldtypen: text, lang, email, tel, datum, zeit (Datum+Uhrzeit), zahl, geld, ja, wahl, ref, refs, farbe, liste (Textliste), json
// „intern“ = Spalten, die die App selbst pflegt (nicht im Formular der Verwaltung).
export const TABELLEN = {
  personen: {
    titel: "Personen", sym: "👥", gruppe: "Stammdaten",
    lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "vorname", t: "Vorname", typ: "text", pflicht: true },
      { k: "nachname", t: "Nachname", typ: "text", pflicht: true },
      { k: "typ", t: "Art", typ: "wahl", werte: PERSONEN_TYPEN, pflicht: true },
      { k: "status", t: "Status", typ: "wahl", werte: { aktiv: "aktiv", pausiert: "pausiert", gast: "Gast/Aushilfe", ausgetreten: "ausgetreten" } },
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
    intern: [{ k: "benachrichtigung", typ: "json" }],
    anzeige: (z) => `${z.vorname || ""} ${z.nachname || ""}`.trim(),
  },
  eltern_kind: {
    titel: "Eltern ↔ Kind", sym: "👪", gruppe: "Stammdaten", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "eltern_id", t: "Eltern", typ: "ref", ref: "personen", filter: (p) => p.typ === "eltern", pflicht: true },
      { k: "kind_id", t: "Kind", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler", pflicht: true },
      { k: "beziehung", t: "Beziehung", typ: "wahl", werte: { mutter: "Mutter", vater: "Vater", sonstige: "Erziehungsberechtigt" } },
      { k: "hauptkontakt", t: "Hauptkontakt", typ: "ja" },
    ],
    liste: ["eltern_id", "kind_id", "beziehung", "hauptkontakt"],
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
    ],
    liste: ["kuerzel", "name", "beschreibung", "aktiv"],
    anzeige: (z) => `${z.kuerzel} – ${z.name}`,
  },
  gruppe_zuordnung: {
    titel: "Gruppen-Zuordnung", sym: "🔀", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" || p.typ === "ehemalig", pflicht: true },
      { k: "gruppe_id", t: "Gruppe", typ: "ref", ref: "gruppen", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { stamm: "Stammgruppe (generell)", temporaer: "temporär" }, pflicht: true },
      { k: "von", t: "gültig von", typ: "datum", pflicht: true },
      { k: "bis", t: "gültig bis", typ: "datum" },
      { k: "projekt_id", t: "nur für Projekt", typ: "ref", ref: "projekte" },
      { k: "grund", t: "Grund", typ: "text" },
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
    ],
    liste: ["name", "register_id", "wartung_monate"],
    anzeige: (z) => z.name,
  },
  person_instrument: {
    titel: "Instrumente je Person", sym: "🎺", gruppe: "Orchester", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler" || p.typ === "ehemalig", pflicht: true },
      { k: "typ_id", t: "Instrument", typ: "ref", ref: "instrument_typen", pflicht: true },
      { k: "register_id", t: "Register (Stimme)", typ: "ref", ref: "register" },
      { k: "haupt", t: "Hauptinstrument", typ: "ja" },
      { k: "eigenes", t: "eigenes Instrument", typ: "ja" },
      { k: "niveau", t: "Niveau / Bemerkung", typ: "text" },
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
      { k: "status", t: "Status", typ: "wahl", werte: { verfuegbar: "verfügbar", verliehen: "verliehen", reparatur: "in Reparatur", ausgemustert: "ausgemustert" } },
      { k: "standort", t: "Standort", typ: "text" },
      { k: "wert", t: "Wert (€)", typ: "geld" },
      { k: "anschaffung", t: "Anschaffung", typ: "datum" },
      { k: "finanziert_von", t: "finanziert von", typ: "text" },
      { k: "wartung_faellig", t: "Wartung fällig", typ: "datum" },
      { k: "notiz", t: "Notiz", typ: "lang" },
    ],
    liste: ["inventar_nr", "typ_id", "bezeichnung", "groesse", "status", "zustand", "wartung_faellig"],
    anzeige: (z) => `${z.inventar_nr} ${z.bezeichnung || ""}`.trim(),
  },
  ausleihen: {
    titel: "Ausleihen", sym: "🤝", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_id", t: "Instrument", typ: "ref", ref: "inventar", pflicht: true },
      { k: "person_id", t: "an", typ: "ref", ref: "personen", filter: (p) => p.typ === "schueler", pflicht: true },
      { k: "von", t: "ab", typ: "datum", pflicht: true },
      { k: "bis", t: "Rückgabe bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { angefragt: "angefragt", aktiv: "ausgeliehen", zurueck: "zurückgegeben" } },
      { k: "zustand_ausgabe", t: "Zustand bei Ausgabe", typ: "text" },
      { k: "zustand_rueckgabe", t: "Zustand bei Rückgabe", typ: "text" },
    ],
    liste: ["inventar_id", "person_id", "von", "bis", "status"],
  },
  reparaturen: {
    titel: "Reparaturen & Wartung", sym: "🔧", gruppe: "Instrumente", lesen: ALLE_VERWALTER, schreiben: [...L, "vorstand", "instrumentenwart"],
    felder: [
      { k: "inventar_id", t: "Instrument", typ: "ref", ref: "inventar", pflicht: true },
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
      { k: "checkliste", t: "Checkliste (eine Zeile je Punkt, [x] = erledigt)", typ: "lang" },
    ],
    liste: ["titel", "art", "von", "bis", "ort"],
    anzeige: (z) => z.titel,
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
    titel: "Termine", sym: "📅", gruppe: "Termine", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art_id", t: "Art", typ: "ref", ref: "terminarten", pflicht: true },
      { k: "beginn", t: "Beginn", typ: "zeit", pflicht: true },
      { k: "ende", t: "Ende", typ: "zeit" },
      { k: "ort", t: "Ort", typ: "text" },
      { k: "gruppen", t: "Eingeladene Gruppen", typ: "refs", ref: "gruppen" },
      { k: "projekt_id", t: "Projekt", typ: "ref", ref: "projekte" },
      { k: "frist", t: "Antwort bis", typ: "datum" },
      { k: "status", t: "Status", typ: "wahl", werte: { geplant: "geplant", abgesagt: "abgesagt" } },
      { k: "beschreibung", t: "Hinweise (Treffpunkt, Kleidung …)", typ: "lang" },
    ],
    liste: ["beginn", "titel", "art_id", "ort", "gruppen", "status"],
    intern: [{ k: "soll", typ: "json" }, { k: "register", typ: "refs", ref: "register" }],
    anzeige: (z) => z.titel,
  },
  antworten: {
    titel: "Zu-/Absagen", sym: "✅", gruppe: "Termine", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "termin_id", t: "Termin", typ: "ref", ref: "termine", pflicht: true },
      { k: "person_id", t: "Person", typ: "ref", ref: "personen", pflicht: true },
      { k: "antwort", t: "Antwort", typ: "wahl", werte: { ja: "Zusage", vielleicht: "vielleicht", nein: "Absage" }, pflicht: true },
      { k: "notiz", t: "Notiz", typ: "text" },
      { k: "von_person_id", t: "beantwortet von", typ: "ref", ref: "personen" },
      { k: "anwesend", t: "tatsächlich anwesend", typ: "wahl", werte: { "": "nicht erfasst", ja: "anwesend", nein: "fehlte" } },
    ],
    liste: ["termin_id", "person_id", "antwort", "notiz", "anwesend"],
    intern: [{ k: "register_id", typ: "ref", ref: "register" }],
  },
  unterhaltungen: {
    titel: "Unterhaltungen", sym: "💬", gruppe: "Kommunikation", lesen: L, schreiben: L,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { gruppe: "Gruppe", einzel: "Einzelgespräch", verteiler: "Rundschreiben" } },
      { k: "verteiler", t: "Verteiler (automatisch)", typ: "text" },
      { k: "mitglieder", t: "Mitglieder", typ: "refs", ref: "personen" },
    ],
    liste: ["titel", "art", "verteiler"],
    anzeige: (z) => z.titel,
  },
  nachrichten: {
    titel: "Nachrichten", sym: "✉️", gruppe: "Kommunikation", lesen: L, schreiben: L,
    felder: [
      { k: "unterhaltung_id", t: "Unterhaltung", typ: "ref", ref: "unterhaltungen", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "text", t: "Text", typ: "lang", pflicht: true },
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "rueckmeldung", t: "Rückmeldung erbeten", typ: "ja" },
    ],
    liste: ["unterhaltung_id", "von", "text", "zeit"],
    intern: [{ k: "gelesen_von", typ: "refs", ref: "personen" }, { k: "rueckmeldungen", typ: "json" }],
  },
  pinnwand: {
    titel: "Pinnwand", sym: "📌", gruppe: "Kommunikation", lesen: ALLE_VERWALTER, schreiben: LL,
    felder: [
      { k: "text", t: "Text", typ: "lang", pflicht: true },
      { k: "von", t: "von", typ: "ref", ref: "personen" },
      { k: "wichtig", t: "wichtig", typ: "ja" },
      { k: "erledigt", t: "erledigt", typ: "ja" },
      { k: "zeit", t: "Zeit", typ: "zeit" },
    ],
    liste: ["text", "von", "wichtig", "erledigt", "zeit"],
  },
  genehmigung_vorlagen: {
    titel: "Genehmigungs-Vorlagen", sym: "📝", gruppe: "Genehmigungen", lesen: ALLE_VERWALTER, schreiben: L,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "text", t: "Text für die Eltern", typ: "lang", pflicht: true },
      { k: "fassung", t: "Textfassung", typ: "zahl" },
      { k: "gueltig_monate", t: "gültig … Monate (leer = unbegrenzt)", typ: "zahl" },
    ],
    liste: ["titel", "fassung", "gueltig_monate"],
    anzeige: (z) => z.titel,
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
    ],
    liste: ["komponist", "titel", "werkverzeichnis", "rechte"],
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
  spenden: {
    titel: "Unterstützer & Spenden", sym: "💛", gruppe: "Förderverein", lesen: [...L, "vorstand"], schreiben: [...L, "vorstand"],
    felder: [
      { k: "person_id", t: "von", typ: "ref", ref: "personen", filter: (p) => ["spender", "unterstuetzer", "foerderverein", "eltern"].includes(p.typ), pflicht: true },
      { k: "datum", t: "Datum", typ: "datum", pflicht: true },
      { k: "betrag", t: "Betrag (€)", typ: "geld" },
      { k: "sachspende", t: "Sachspende", typ: "text" },
      { k: "zweck", t: "Zweck", typ: "text" },
      { k: "dank_gesendet", t: "Dank gesendet", typ: "ja" },
    ],
    liste: ["datum", "person_id", "betrag", "sachspende", "zweck", "dank_gesendet"],
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
  versand: {
    titel: "Versandprotokoll", sym: "📨", gruppe: "System", lesen: L, schreiben: L, nurLesen: true,
    felder: [
      { k: "zeit", t: "Zeit", typ: "zeit" },
      { k: "kanal", t: "Kanal", typ: "wahl", werte: { push: "Push", mail: "E-Mail", whatsapp: "WhatsApp-Übergabe", app: "App" } },
      { k: "an_id", t: "an", typ: "ref", ref: "personen" },
      { k: "betreff", t: "Betreff", typ: "text" },
      { k: "status", t: "Status", typ: "wahl", werte: { simuliert: "simuliert (Demo)", uebergeben: "übergeben", gesendet: "gesendet", fehler: "Fehler" } },
      { k: "ereignis", t: "Ereignis", typ: "text" },
    ],
    liste: ["zeit", "kanal", "an_id", "betreff", "status"],
    intern: [{ k: "info", typ: "text" }],
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
