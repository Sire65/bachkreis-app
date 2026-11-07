// ❓ Hilfe-Zentrum (0.39.0, wie KC-CLUB-HILFEZENTRUM): Hilfen nach Themen, Kapitel 1, 2 … und Einträge 1.1, 1.2 …,
// „👉 Zeig mir wo“ springt an die Stelle der App (mit „↩️ Zurück zur Hilfe“), „neu“ markiert Hilfen seit dem letzten Besuch.
// Registry: neue Hilfen nur hier eintragen. ziel = Ansicht (view) oder Aktion; fuer = wer die Hilfe sieht (leer = alle).
export const HILFE_THEMEN = [
  { id: "start", sym: "👋", t: "Erste Schritte" },
  { id: "termine", sym: "📅", t: "Termine & Zusagen" },
  { id: "nachrichten", sym: "💬", t: "Nachrichten & Pinnwand" },
  { id: "ueben", sym: "🎼", t: "Noten, Üben & Musik" },
  { id: "eltern", sym: "👪", t: "Für Eltern" },
  { id: "kinder", sym: "🧒", t: "Für Kinder" },
  { id: "leitung", sym: "🏢", t: "Leitung, Büro & Organisation" },
  { id: "einstellungen", sym: "⚙️", t: "Einstellungen & Aussehen" },
  { id: "technik", sym: "🛡️", t: "Technik & Datenschutz" },
];
const h = (id, thema, sym, t, text, ziel = null, fuer = null, neu = null) => ({ id, thema, sym, t, text, ziel, fuer, neu });
export const HILFE = [
  h("installieren", "start", "📲", "Die App auf den Startbildschirm legen", "Einmal installieren – dann startet die App schneller, du bleibst angemeldet und Benachrichtigungen kommen zuverlässig. Auf dem iPhone: Teilen ⬆️ › „Zum Home-Bildschirm“. Auf Android: Menü ⋮ › „App installieren“.", { a: "installieren" }),
  h("link", "start", "🔗", "Mein Link funktioniert nicht", "Den Link direkt aus der Nachricht antippen (nicht abtippen). Nach vielen Fehlversuchen ist die Anmeldung 15 Minuten gesperrt. Die Leitung schickt dir gern einen neuen persönlichen Link – der alte gilt dann nicht mehr."),
  h("startseite", "start", "🏠", "Die Startseite", "Oben steht „Für dich“: was gerade wichtig ist (rot = bitte erledigen). Darunter die Kacheln – lange drücken zum Anordnen, ↻ dreht eine Kachel um. Unten wechselst du zwischen Start, Termine, Nachrichten, Orchester und Mehr.", { v: "start" }),
  h("suche", "start", "🔍", "Etwas suchen – die Lupe", "Die runde Lupe 🔍 unten rechts durchsucht die ganze App: Funktionen, Hilfen, Personen, Termine, Chats und Noten – auch bei Tippfehlern.", { a: "lupe" }, null, "0.39.0"),
  h("demo", "start", "🧪", "Vorführversion", "Alle Personen sind erfunden. Daten liegen nur in diesem Browser. Oben „Ansicht als“ wechselt die Rolle (Leitung, Eltern, Kind …)."),

  h("zusagen", "termine", "📅", "Zu- oder absagen", "Termine › bei jedem Termin ✅ Zusage, 🤔 Vielleicht oder ❌ Absage antippen. Eltern sagen für ihre Kinder zu, Kinder können selbst zusagen. Bei Pflichtterminen bitte einen Grund angeben.", { v: "termine" }),
  h("abwesenheit", "termine", "🏖️", "Längere Abwesenheit", "Meins › Abwesenheit: Zeitraum wählen – alle Termine darin werden auf einmal abgesagt.", { v: "abwesenheit" }),
  h("kalenderabo", "termine", "🗓️", "Termine im Handy-Kalender", "Termine › Kalender verknüpfen: einmal abonnieren, dann stehen alle Bachkreis-Termine automatisch in Apple- oder Google-Kalender.", { v: "kalender" }),
  h("terminumfrage", "termine", "🗳️", "Terminumfrage – wann passt es?", "Termine › 🗳️: Bei einer Terminumfrage kreuzt du für jeden Vorschlag ✅ passt, 🤔 notfalls oder ❌ geht nicht an. Wer die Umfrage angelegt hat, sieht die Auszählung und legt den Termin fest – dann bekommen alle Bescheid.", { v: "terminumfragen" }, null, "0.39.0"),
  h("mitfahren", "termine", "🚗", "Mitfahrbörse", "Beim Termin › Mitfahren: Plätze anbieten oder einen Platz suchen – so kommen alle hin.", { v: "termine" }),

  h("chat", "nachrichten", "💬", "Nachrichten schreiben", "Nachrichten › ＋ Neu: an eine Person oder eine Runde. ❗ markiert Wichtiges, 🏎️ Express kommt sofort durch, ⏰ sendet später. Haken: ✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen.", { v: "nachrichten" }),
  h("weiterleiten", "nachrichten", "↪️", "Weiterleiten, merken, anheften", "Eine Nachricht antippen: ↪️ Weiterleiten an einen anderen Chat, 🔖 Merken (Liste unter 💬 › 🔖), 📌 Anheften (steht oben im Chat). Nach rechts wischen = antworten.", { v: "nachrichten" }, null, "0.38.0"),
  h("erwaehnen", "nachrichten", "@", "Jemanden mit @ erwähnen", "Im Chat „@“ tippen und einen Namen wählen – die Person wird markiert und bekommt Bescheid, auch wenn sie den Chat stumm geschaltet hat.", { v: "nachrichten" }, null, "0.38.0"),
  h("stumm", "nachrichten", "🔕", "Chat stumm, Favorit, Archiv", "Im Chat oben ⋮: 🔕 stumm (8 Std., 1 Woche, immer), ⭐ Favorit oben halten, 📦 archivieren. Das gilt nur für dich – niemand sonst sieht es.", { v: "nachrichten" }, null, "0.38.0"),
  h("ungelesen", "nachrichten", "👁", "Wer hat meine Nachricht noch nicht gelesen?", "Nachrichten › 👁: deine Nachrichten der letzten 7, 14 oder 30 Tage mit allen, die sie noch nicht gelesen haben – mit „💬 Erinnern“. Eine noch ungelesene eigene Nachricht kannst du auch ↩️ zurückholen.", { v: "ungelesen" }, null, "0.38.0"),
  h("pinnwand", "nachrichten", "📌", "Pinnwand", "Zettel für alle oder einzelne Personen – ❗ wichtig bleibt groß an der Wand. Gelesen und Erledigt sieht, wer den Zettel geschrieben hat.", { v: "pinnwand" }),
  h("whatsapp", "nachrichten", "🟢", "WhatsApp", "Die App öffnet WhatsApp mit fertigem Text – du wählst Kontakt oder Gruppe und drückst selbst auf Senden."),

  h("meinenoten", "ueben", "🎼", "Meine Noten", "Meins › Meine Noten zeigt automatisch die Stimmen für dein Instrument und deine Gruppe.", { v: "meinenoten" }),
  h("ueben", "ueben", "⏱️", "Üben eintragen", "Üben › Minuten eintragen, Wochenziel setzen, Erinnerungen bekommen. Die Lehrkraft sieht deinen Fortschritt.", { v: "ueben" }),
  h("uebebuehne", "ueben", "🎤", "Übe-Bühne: Mitspielen & Stimmgerät", "Mitspielen mit Begleitung, Griffe, Rhythmus, Stimmgerät und Ohr-Spiele – und die Aufgaben deiner Lehrkraft.", { v: "buehne" }),
  h("metronom", "ueben", "🥁", "Metronom, Timer, Stoppuhr", "Mehr › Uhr & Takt: Metronom (antippen im Takt), Timer und Stoppuhr.", { a: "uhrWerkzeug" }),
  h("instrumentenkunde", "ueben", "🎻", "Instrumente kennenlernen", "Instrumentenkunde: jedes Instrument mit Bild und echtem Klang (Aufnahmen, gemeinfrei).", { v: "instrumentenkunde" }),

  h("eltern-start", "eltern", "👪", "Die Eltern-Ansicht", "Eltern sehen oben, was für ihre Kinder zu erledigen ist: Zusagen, Genehmigungen, Gesundheitsangaben – mit einem Tipp erledigt.", { v: "start" }, "eltern"),
  h("genehmigung", "eltern", "✍️", "Genehmigungen geben", "Meins › Genehmigungen: Einverständnis (z. B. Fotos, Fahrten) erteilen oder widerrufen. Der Text, den du bestätigt hast, bleibt gespeichert.", { v: "meinegenehmigungen" }, "eltern"),
  h("gesundheit", "eltern", "🩺", "Gesundheit & Notfall", "Meins › Gesundheit: Allergien, Medikamente, Notfallnummer – sehen nur Leitung und Begleitpersonen rund um eine Fahrt.", { v: "gesundheit" }, "eltern"),
  h("meinedaten", "eltern", "🔐", "Meine Daten", "Meins › Meine Daten: Anschrift, Telefon und was andere sehen dürfen selbst ändern; Auskunft über alle gespeicherten Daten.", { v: "meinedaten" }),

  h("kinder-start", "kinder", "🧒", "Die Kinder-Ansicht", "Große, bunte Kacheln: Termine, Üben, Quiz, Instrumente. Zusagen kannst du selbst.", { v: "start" }, "kinder"),
  h("quiz", "kinder", "🧠", "Quiz & Abzeichen", "Quiz: Noten lesen, Instrumente erkennen, Bachkreis-Fragen – sammle Sterne und Abzeichen.", { v: "quiz" }),

  h("cockpit", "leitung", "🧭", "Cockpit", "Zeigt sortiert nach Dringlichkeit, was heute ansteht und wo Antworten, Genehmigungen oder Freigaben fehlen.", { v: "cockpit" }, "verwalter"),
  h("buero", "leitung", "🏢", "Das Büro", "Aktenschrank mit Jalousie und Ordnern (Protokolle, Noten, Grafik, Vorlagen, Elternbriefe …), Schreibtisch mit Füller (Briefe, Protokolle), Drucker, Telefon und Rechner. ✏️ richtet den Schreibtisch ein.", { v: "buero" }, "buero"),
  h("rundschreiben", "leitung", "📣", "Rundschreiben", "An Eltern, Schüler, Gruppen oder alle – per Push, E-Mail oder WhatsApp, mit Lesestand.", { v: "rundschreiben" }, "verwalter"),
  h("startnachricht", "leitung", "🪧", "Startnachricht", "Eine Nachricht, die beim Öffnen der App erscheint – mit Antwort Ja / Später / Nein.", { v: "startnachricht" }, "leitung"),
  h("terminumfrage-anlegen", "leitung", "🗳️", "Terminumfrage anlegen", "Termine › 🗳️ › ＋ Neue Umfrage: Vorschläge eintragen, wer abstimmt (Eltern, Mitglieder, Team), Frist. Bei der Auszählung „📅 Festlegen“ – der Termin wird angelegt und alle bekommen Bescheid. „📣 Erinnern“ schreibt nur denen, die noch nicht abgestimmt haben.", { v: "terminumfragen" }, "planer", "0.39.0"),
  h("chronik", "leitung", "📜", "Chronik & Auftrittsorte", "Chronik seit 1969 mit Weltkarte aller Auftrittsorte (Reiter 🗺️ Orte) und Repertoire „Was haben wir wann gespielt?“.", { v: "chronik" }),
  h("zugang", "leitung", "🛡️", "Zugang & Speicher im Blick", "Anmeldeversuche, Sperren, wer die App installiert hat – und wie voll Datenbank und Dateispeicher sind (Warnung ab 80 %).", { v: "zugang" }, "leitung"),
  h("pc", "leitung", "💻", "PC-Verwaltung", "Adressen, Instrumente, Gruppen, Zugänge und Import/Export werden bequem am PC oder Notebook gepflegt (Technik › PC-Verwaltung).", null, "verwalter"),

  h("darstellung", "einstellungen", "🎨", "Aussehen: Farben, Schrift, Tag/Nacht", "Mehr › Einstellungen: Farbdesign, Schriftgröße, Tag- und Nachtmodus (automatisch nach Sonne), Effekte an oder aus.", { v: "einstellungen" }),
  h("benachrichtigung", "einstellungen", "🔔", "Benachrichtigungen", "Mehr › Einstellungen › Benachrichtigungen: Push, E-Mail, Ruhezeit am Abend. Einzelne Chats stumm: im Chat ⋮ › 🔕.", { v: "einstellungen" }),
  h("hilfeknoepfe", "einstellungen", "❓", "Lupe und ? ausblenden", "Die runden Knöpfe 🔍 und ? unten rechts lassen sich in der Hilfe ganz unten aus- und wieder einschalten.", { v: "hilfe" }, null, "0.39.0"),

  h("sicherheit", "technik", "🛡️", "Sicherheits-Check", "Prüft Verbindung, Offline-Speicher und Benachrichtigungen. Grün = ok, Rot = Problem, Grau = unbekannt (nie „ok“).", { v: "sicherheit" }),
  h("datenschutz", "technik", "🔐", "Wer sieht was?", "Private Chats sehen nur die Beteiligten – auch die Leitung nicht. Fremde sehen von Kindern und Eltern nur den Namen. Gesundheitsangaben sehen nur Leitung und Begleitpersonen. Merkliste und Chat-Einstellungen sieht nur du."),
  h("update", "technik", "🔄", "Neue Version", "Gibt es eine neue Version, erscheint „Jetzt aktualisieren“. Was neu ist, steht danach in einem Fenster – und hier in der Hilfe mit „neu“."),
];
// Wer sieht welche Hilfe? (Rollen-Prüfung kommt aus der App)
export function hilfeFuer(pruef) { return HILFE.filter((e) => !e.fuer || pruef(e.fuer)); }
export function hilfeGliederung(alle) {
  const themen = HILFE_THEMEN.filter((t) => alle.some((e) => e.thema === t.id)).map((t, i) => ({ ...t, nr: i + 1, es: alle.filter((e) => e.thema === t.id) }));
  const nr = {}; themen.forEach((t) => t.es.forEach((e, i) => { nr[e.id] = `${t.nr}.${i + 1}`; }));
  return { themen, nr };
}
// „neu“: Hilfen, deren Version neuer ist als die beim letzten Besuch gesehene
const vz = (v) => String(v || "0").split(".").map(Number).reduce((a, x) => a * 1000 + (x || 0), 0);
export const hilfeNeu = (e, gesehen) => !!e.neu && vz(e.neu) > vz(gesehen);
