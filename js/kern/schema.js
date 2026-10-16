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
export function chatPartnerErlaubt(ich, p, { verwandt = false, schuelerUntereinander = true } = {}) {
  if (!ich || !p || p.id === ich.id || !pwAppPerson(p)) return false;
  const verw = (x) => ["leitung", "lehrkraft"].includes(x.typ) || (x.rollen || []).some((r) => VERWALTER.includes(r));
  if (verw(ich) || verw(p) || verwandt) return true;
  if (ich.typ === "schueler" && p.typ === "schueler") return schuelerUntereinander !== false;
  return false;
}

// ---------- Pinnwand (gemeinsam für App und Server) ----------
export const PINNWAND = { max: 4, zeichen: 200, erinnernTage: 3, pauseTage: 7 };
// Wer bekommt einen Zettel „für alle“? Alle aktiven Personen mit App (Schüler, Eltern, Leitung, Lehrkräfte, Verwalter) außer dem Verfasser.
export const pwAppPerson = (p) => !!p && !p.geloescht_am && p.status !== "ausgetreten" && (["schueler", "eltern", "leitung", "lehrkraft"].includes(p.typ) || (p.rollen || []).some((r) => VERWALTER.includes(r)));
export const pwSichtbar = (z, ich) => !!z && (z.von === ich || (z.fuer || "alle") === "alle" || (z.fuer === "personen" && (z.personen || []).includes(ich)));
export const pwEmpfaenger = (z, personen) => (z.fuer === "ich" ? [] : z.fuer === "personen" ? [...new Set(z.personen || [])].filter((id) => id !== z.von) : personen.filter((p) => pwAppPerson(p) && p.id !== z.von).map((p) => p.id));
export const pwGelesenId = (zettelId, personId) => `${zettelId}:${personId}`;

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
    intern: [{ k: "benachrichtigung", typ: "json" }, { k: "freigaben", typ: "json" }, { k: "avatar", typ: "json" }], // avatar: selbst gestaltetes Gesicht · freigaben: { geburtstag, mobil, email, adresse } (Privatsphäre, setzt die Person selbst)
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
      { k: "soll", t: "Soll-Besetzung je Register (z. B. {\"r-v1\": 7})", typ: "json" },
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
      { k: "gruppe", t: "Instrumentengruppe (leer = aus dem Register)", typ: "wahl", werte: INSTRUMENT_GRUPPEN_NAMEN },
      { k: "symbol", t: "Symbol (Emoji, leer = automatisch)", typ: "text" },
    ],
    liste: ["name", "gruppe", "register_id", "wartung_monate"],
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
    titel: "Unterhaltungen", sym: "💬", gruppe: "Kommunikation", lesen: L, schreiben: ALLE_VERWALTER,
    felder: [
      { k: "titel", t: "Titel", typ: "text", pflicht: true },
      { k: "art", t: "Art", typ: "wahl", werte: { gruppe: "Gruppe", einzel: "Einzelgespräch", runde: "Runde (selbst angelegt)", verteiler: "Rundschreiben" } },
      { k: "verteiler", t: "Verteiler (automatisch)", typ: "text" },
      { k: "mitglieder", t: "Mitglieder", typ: "refs", ref: "personen" },
    ],
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
      { k: "kanaele", t: "Benachrichtigen über", typ: "liste" },
      { k: "geplant_um", t: "⏰ senden um", typ: "zeit" },
      { k: "wiederholung", t: "Wiederholung", typ: "wahl", werte: { einmal: "einmal", taeglich: "jeden Tag", werktags: "werktags", woechentlich: "jede Woche", monatlich: "jeden Monat" } },
      { k: "anlagen", t: "📎 Anhänge", typ: "json" },
      { k: "umfrage", t: "📊 Umfrage", typ: "json" },
      { k: "loescht_am", t: "⏳ löscht sich am", typ: "zeit" },
    ],
    liste: ["unterhaltung_id", "von", "text", "zeit"],
    intern: [{ k: "gelesen_von", typ: "refs", ref: "personen" }, { k: "rueckmeldungen", typ: "json" }, { k: "reaktionen", typ: "json" }, { k: "anzahl", typ: "zahl" },
      { k: "bearbeitet_am", typ: "zeit" }, { k: "zurueckgezogen_am", typ: "zeit" }, { k: "geplant_frei", typ: "zeit" },
      { k: "umfrage_stimmen", typ: "json" }],
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
      { k: "gruppen", t: "für Orchester / Klasse", typ: "refs", ref: "gruppen" },
      { k: "schwierigkeit", t: "Schwierigkeit", typ: "wahl", werte: { leicht: "leicht", mittel: "mittel", schwer: "schwer" } },
      { k: "dauer_min", t: "Dauer (Minuten)", typ: "zahl" },
    ],
    liste: ["komponist", "titel", "werkverzeichnis", "gruppen", "rechte"],
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
