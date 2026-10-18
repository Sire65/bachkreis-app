# Funktionen (Feature-IDs aus dem Konzept)

Stand v0.3.0 DEV (Vorführversion). DoD = Definition of Done.

**Erklärung der Spalte „Stand“:**
- ✅ in der Vorführversion umgesetzt und getestet
- 🟡 vorbereitet bzw. simuliert
- ⏳ offen

| ID | Funktion | Stand | Test |
|---|---|---|---|
| BK-F01 | Teilnehmerverwaltung, Register/Gruppen-Registry | ✅ | logik: Demodaten/Pflichtfelder |
| BK-F02 | Link-/QR-Login, Rollen | ✅ Code-Login, QR-Karten · 🟡 Server-Hash | Rundgang |
| BK-F03 | Terminarten-Registry, Einzel- & Serientermine, Projekte | ✅ | Rundgang |
| BK-F04 | Zusage/Vielleicht/Absage, Notiz, Frist, Abwesenheit | ✅ | Rundgang |
| BK-F05 | Terminplan Liste/Monat, Filter | ✅ | Rundgang |
| BK-F06 | Besetzungsampel (grau = unbekannt) | ✅ | logik: Ampel, Mehrfach-Instrumente |
| BK-F07 | Push | 🟡 simuliert, lokale Benachrichtigung auf dem Gerät | – |
| BK-F08 | E-Mail | 🟡 simuliert (Brevo-Adapter folgt) | – |
| BK-F09 | WhatsApp-Übergabe | ✅ | logik: waLink |
| BK-F10 | ICS-Export | ✅ Datei · ⏳ Abo-Feed (Server) | logik: ICS |
| BK-F11 | Instrumente: Katalog, Inventar, Ausleihe | ✅ | Rundgang |
| BK-F12 | Präsenzliste | ✅ in Termin-Detail | – |
| BK-F13 | Auswertungen + Export | ✅ Kennzahlen, CSV · ⏳ Berichte | logik: CSV |
| BK-F14 | Terminfindung (Doodle) | ⏳ | – |
| BK-F15 | Mitfahrgelegenheiten | ⏳ | – |
| BK-F16 | Notenarchiv, „Meine Noten“ | ✅ Metadaten · ⏳ PDF-Speicher | Rundgang, notensatz.test (Demo-Probenoten, Explorer 0.18.0) |
| BK-F17 | Offline-/Notbetrieb | 🟡 App startet offline (SW) · ⏳ signierte Vorab-Antworten | – |
| BK-F18 | Mandantenfähigkeit | ⏳ optional | – |
| BK-F19 | Gruppen A–D, Wechsel generell/temporär, Wechselwunsch | ✅ | logik: temporär/generell |
| BK-F20 | Mehrere Instrumente, Wahl je Termin | ✅ | logik |
| BK-F22 | Personen-/Rollenmodell inkl. Eltern↔Kind | ✅ | logik: Verteiler |
| BK-F23 | Leitungs-Cockpit | ✅ | logik: Cockpit |
| BK-F24 | Vorgänge & Aufgaben | ✅ | Rundgang |
| BK-F25 | Kommunikation: Verteiler, Vorlagen, Rückmeldung, Versandprotokoll | ✅ | Rundgang |
| BK-F26 | Genehmigungen der Eltern | ✅ | logik: überfällig |
| BK-F27 | Konzerte & Projekte mit Checkliste | ✅ | Rundgang |
| BK-F28 | Reisen/Probenfreizeiten (Zimmer, Notfallinfos mit Auto-Löschung) | ⏳ (Genehmigung + Termin vorhanden) | – |
| BK-F29 | Reparatur mit Freigabegrenze | ✅ | Rundgang |
| BK-F30 | Einkauf / Beschaffung | ✅ | Rundgang |
| BK-F31 | Spender & Dank | ✅ | Rundgang |
| BK-F32 | Inventur per QR | ⏳ | – |
| BK-F33 | Schuljahreswechsel | ✅ (Verwaltung) | – |
| BK-F34 | Datenschutz: Auskunft, Export, Audit | ✅ Auskunft/Export/Protokoll · ⏳ Löschfristen | – |
| BK-F35 | PC-Verwaltung inkl. Zugänge, Import/Export, Abgleich | ✅ | Rundgang |
| BK-F36 | Bühne mit Orchester: Melodien (Musik-Engine), Konzertaufnahmen, Mitschnitt, Eselsohr | ✅ | logik: Musik · Bühnen-Test |
| BK-F38 | Echtbetrieb-Server bk-api: Anmeldung, Rechte & Sichtbarkeit je Rolle, Delta-Abgleich, Versionskonflikte | ✅ (eingespielt sobald Konto da) | server.test (13), e2e echtbetrieb |
| BK-F39 | Supabase-Adapter im Browser (Kopie auf dem Gerät, Ausgang offline), Anmeldeseite, Abmelden | ✅ | e2e echtbetrieb |
| BK-F40 | BK Communicator: Router (Programme, Regeln, Vorlagen, Eltern Minderjähriger, Vorlieben, Rückfall/alle, Ruhezeit, Doppelte, Idempotenz) | ✅ | kom.test 1, 2, 9 |
| BK-F41 | BK Communicator: Zustellung mit Routen, Anbieterwechsel, Zustand, Bremse, Zero-Cost, Not-Aus, Backoff, aufgegeben, Rückfall-Kanal | ✅ | kom.test 3–8 |
| BK-F42 | BK Communicator: Wartung (pg_cron), Eskalationen, Push-Quittungen (angezeigt/geöffnet/bestätigt) | ✅ | kom.test 3, 10 |
| BK-F43 | Web-Push-Abo je Gerät (VAPID), Test an mich, Rechte beim Versand | ✅ | kom.test 11 |
| BK-F44 | Communicator-Konsole in der PC-Verwaltung (Lämpchen, Not-Aus, Test, Aufträge mit Verlauf) | ✅ | e2e echtbetrieb |
| BK-F37 | Bachkreis-Logo überall (App-Symbol, Favicon, Kopf, Verwaltung, QR-Karten) | ✅ | Vertrag: SW-Dateiliste |
| BK-F45 | Kopf wie KC: Kopfzeile, Statusleiste mit LEDs, Lichtschein, Jalousie halb/ganz | ✅ | e2e rundgang |
| BK-F46 | Infofeld zum Blättern (‹ › « », Punkte, Wischen): Termin, Wetter, Für dich, Demnächst, Zentrale, Leitung | ✅ | e2e rundgang |
| BK-F47 | Wetter Bergkamen (Open-Meteo): 7 Tage, Details, Termin-Wetter, Szene | ✅ | e2e rundgang (nachgebildete Daten) |
| BK-F48 | Jahreszeiten im Kopf (aus der KC Club App): Deko, Eiszapfen, Bühne mit allen Extras und Themen | ✅ | e2e rundgang |
| BK-F49 | Register-Effekte, Kuckucksuhr, Konfetti | ✅ | e2e rundgang |
| BK-F50 | Fußleiste wie KC (Start, Termine, Nachrichten mit Zähler, Orchester/Kinder, Mehr) | ✅ | e2e rundgang |
| BK-F51 | Einstellungen wie KC: Farbdesigns, Themen + Schriften, Tag/Nacht A/T/N, Schrift-Zoom, Chat-Farben, Sparmodus | ✅ | e2e rundgang |
| BK-F52 | Effekte wie KC: Sende-Effekte, Fee, Reißwolf, Anpinnen, Tipp des Tages, Was ist neu, Vorlesen, Feiertage | ✅ | e2e rundgang |
| BK-F53 | Privatsphäre-Freigaben (Geburtstag, Handy, E-Mail, Adresse), andere Geräte abmelden | ✅ | server.test |
| BK-F54 | 📦 Inventar & Ausstattung (Notenständer, Taktstock, Stühle, Technik …): Inventar-Nr., Anschaffung, Preis, Abschreibung, Status inkl. defekt/vermisst/gestohlen/verkauft, Inventur, QR-Etiketten, Anlagenverzeichnis | ✅ | inventar.test, e2e rundgang |
| BK-F55 | 🛡️ Kinderschutz Chat (Eltern in Kopie), Need-to-know je Rolle, Freigabegrenze Server, interne Vermerke | ✅ | schutz.test |
| BK-F56 | 🩺 Gesundheit & Notfall (Eltern pflegen, Begleiter während der Fahrt, Löschfrist) | ✅ | schutz.test, e2e rundgang |
| BK-F57 | 📷 Einwilligungen je Zweck, Foto-Liste | ✅ | schutz.test, e2e rundgang |
| BK-F58 | 📋 Anwesenheit (da/verspätet/entschuldigt/unentschuldigt), Fehlzeiten App + PC | ✅ | schutz.test, e2e rundgang |
| BK-F59 | 🎼 Registerproben, Registerführer („Mein Register“) | ✅ | verein.test |
| BK-F60 | 🤝 Leihvertrag an der Ausleihe: Zubehör, Kaution, Leihgebühr, Versicherung | ✅ | e2e rundgang |
| BK-F61 | 👪 Eltern pflegen Kontaktdaten der Kinder, Elternrechte ab 18 nur mit Erlaubnis | ✅ | verein.test |
| BK-F62 | 🎭 Konzertprogramm, Treffpunkt, Kleiderordnung, Transportliste | ✅ | verein.test, e2e rundgang |
| BK-F63 | 🧳 Anmeldung zu Fahrten/Freizeiten (Plätze, Warteliste, Schluss, bezahlt) | ✅ | verein.test, e2e rundgang |
| BK-F64 | 🎓 Schuljahreswechsel nach Regeln der Gruppen | ✅ | verein.test |
| BK-F65 | 🔐 Auskunft über alle Tabellen, 🧹 Löschfristen/Anonymisieren | ✅ | verein.test |
| BK-F66 | 🚗 Mitfahrbörse je Termin: anbieten, suchen, buchen, „Ich nehme mit“, Übersicht | ✅ | extras.test, e2e rundgang |
| BK-F67 | 📝 Übeaufgaben der Lehrkräfte | ✅ | extras.test, e2e rundgang |
| BK-F68 | 📜 Mietmaterial, Papier-Exemplare, GEMA-Liste | ✅ | extras.test |
| BK-F69 | 🚪 Räume, 🔑 Schlüssel, 💛 FV-Mitglieder, 🛡️ Führungszeugnis-Vermerk | ✅ | extras.test |
| BK-F70 | 🔧 Reparatur für Ausstattung, 📧 Werkstatt-Auftrag, 🛒 Einkauf → Inventar/Ausstattung, Sachspende ↔ Inventar | ✅ | e2e rundgang |
| BK-F71 | 🖥️ PC-Programm: Bereiche in 3 Spalten, Bearbeiten-Fenster, Werkzeuge für Termine, Genehmigungen, Rundschreiben, Projekte, Kasse, Notfall-/Foto-Listen, Mitfahrbörse, Bescheinigungen, Ferien | ✅ | e2e rundgang |
| BK-F72 | 🌱 Interessenten & Probespiel, 🙋 Helfer- & Dienstplan, 🎼 Probenplan | ✅ | e2e rundgang |
| BK-F73 | ♿ Barrierefreiheit (axe, WCAG 2.1 AA) in allen Rollen + PC, 🩺 db_monitor-Prüfung, 🧹 ESLint | ✅ | tests/e2e/barrierefrei.mjs, tests/dbmonitor.test.mjs, npm run lint |
| BK-F74 | 🎭🎻 Übe-Bühne: Mitspielen, Noten & Griffe, Rhythmus, Stimmgerät, Ohr-Spiele, Übe-Aufgaben mit Fortschritt & Rückmeldung, Vorspiel-Aufnahme mit Einwilligung | ✅ | tests/uebebuehne.test.mjs, e2e rundgang, axe |
| BK-F75 | 🏫 Abgleich Internetseite: Chronik & Repertoire, Dokumente, Austausch & Gastfamilien, Auftrittsanfragen → Termin, Partner, Dirigier-/Kompositionsversuche | ✅ | tests/abgleich.test.mjs, e2e rundgang, axe |
| BK-F76 | 🏠 Startseite wie KC: einfache/erweiterte Ansicht, Kacheln umdrehen, Anordnen/Ziehen, Register verschieben, Laufband, Schnellstart, Fallblatt, Kachelgröße, Vorschläge, Tagesübersicht | ✅ | e2e rundgang, echtbetrieb, axe |

## 🎻 Instrumente-Übersicht (0.10.0)
- **Drei Ansichten** (Umschalter oben, das Gerät merkt sich die Wahl):
  - 🔲 **Kacheln:** kompakt, Farbstreifen nach Status, Merker 🔧 ⏰ ⚠️ ❗.
  - ☰ **Liste:** eine Zeile je Instrument.
  - 🗂️ **Drehregister:** Karteikarten zum Wischen, mit Reitern je Instrumentengruppe und allen wichtigen Daten.
- **Instrumentengruppen:** Streicher, Holzbläser, Blechbläser, Schlagwerk, Tasten & Harfe, Sonstiges.
  - Die Gruppe kommt aus dem Register des Instrumententyps, oder sie wird in der PC-Verwaltung je Typ gesetzt (Feld „Instrumentengruppe“, dazu ein eigenes Symbol).
  - Gruppen sind einklappbar und zeigen „x frei · y verliehen“.
- **Suche:** nach Inventar-Nr., Instrument, Größe, Hersteller, Standort, Ausleiher und Notiz.
- **Status-Chips mit Zahlen:** Alle, frei, verliehen, 🔧 Reparatur, ⏰ Wartung fällig, ⚠️ Rückgabe überfällig, ausgemustert.
- **⚙️ Filter:** Gruppe, Instrument, Standort, Zustand; dazu Gruppieren (Gruppe/Instrument/Standort/Status/keine) und Sortieren (Nr., Instrument, Status, Rückgabe, Wartung). Aktive Filter erscheinen als Chips mit ✕.


## 🎼 Orchester, Gesichter und Instrumentenkunde (0.11.0)
- **Orchester** in drei Ansichten: 🪑 Sitzplan (Bühnenaufstellung, Dirigentin vorn), 👥 Register (Karten mit ⭐ Registerführung, 🏷️ Leihbedarf), 📊 Besetzung (Soll/Ist je Register, Soll je Gruppe in `gruppen.soll`).
- **📅 Zusagen:** zeigt die Antworten zur nächsten Probe an jedem Gesicht (✓ ✗ ~ ?).
- **🏷️ Leihinstrumente koordinieren:** Leihbedarf gegen freie Instrumente, Sprung zum passenden Instrument.
- **🙂 Gesichter:** gezeichnet (SVG), keine Fotos; ohne eigene Wahl aus der Personen-ID abgeleitet. Selbst gestaltbar unter „Mein Gesicht“ (`personen.avatar`, vom Server auf Zahlen 0–19 bereinigt).
- **🎺 Instrumentenkunde:** 16 Instrumente nach Familien; eine Figur mit dem eigenen Gesicht hält und spielt das Instrument (Animation), Klang per WebAudio (Melodie, Tonleiter, Tonumfang), Steckbrief, „Darauf kommt es an“, Pflege, Einstieg, „Schon gewusst?“ und wer im Bachkreis es spielt.

## 📡 Verbindungs-Symbol (0.12.0)
- Oben links in 💬 Nachrichten: Router im WLAN, Satellit im Mobilfunk, 🌐 wenn die Netzart unbekannt ist. Die Netzart verrät nur Android; sonst gilt die selbst gewählte.
- Wellen = Qualität aus den echten Antwortzeiten (Ø der letzten 5 Anfragen, höchstens 3 Minuten alt), sonst Schätzung des Handys; ohne Messung grau (nie „gut“), ✕ bei offline/Serverfehler.
- Antippen: Blatt mit Netzart, Qualität, Messwerten, „📏 Jetzt messen“ (3× version.json ohne Zwischenspeicher).
- Gemessen werden nur Dauer und Erfolg – keine Inhalte. Schalter: ⚙️ › 💬 Nachrichten (Symbol), ⚙️ › ✨ Effekte (Blinken; aus auch bei „Animierte Knöpfe“ aus und „Bewegung reduzieren“).

## 📚 Notenarchiv (0.13.0)
- **Drei Ebenen:** 🎻 Orchester / Klasse (A, B, Orchesterklasse, Ehemalige, „Alle Stücke“, ggf. „Ohne Orchester“) › 🎼 Stücke › 📄 Noten nach Instrument. Oben ein Pfad zum Zurückspringen.
- **Ansicht:** 🔲 Kacheln oder ☰ Liste auf allen Ebenen (je Gerät gemerkt). Ein Balken zeigt, wie viele Stimmen schon ein PDF haben.
- **Stücke:** Suche (Titel, Komponist, Werkverzeichnis, Ausgabe, Stimme), Chips „📄 PDF fehlt“ / „📕 vollständig“, ⚙️ Filter Instrument · Projekt · Schwierigkeit · Rechte, Sortieren. Mit Instrument-Filter steht die passende Stimme direkt auf der Karte.
- **Noten eines Stücks:** nach Instrumentengruppen (Partitur, Streicher, Holz, Blech, Schlagwerk, Tasten & Harfe, Solo/Sonderstimmen) mit Chips zum Filtern, 👥 Spieler je Instrument im gewählten Orchester, PDF öffnen und 📤 hochladen (Leitung, Lehrkräfte, Notenwart).
- **Zuordnung:** werke.gruppen („für Orchester / Klasse“, PC-Verwaltung); ohne Angabe zählen die Gruppen der Stimmen. Stimmen mit „nur Gruppe“ erscheinen nur in diesem Orchester.

## 📦 Inventar & Abschreibung (0.19.0)
- **Ausstattung & Zubehör** (PC-Programm, Tabelle `ausstattung`): Notenständer & Pultleuchten, Dirigentenpult & Taktstock, Stühle, Schlagwerk-Zubehör, Koffer/Transport, Ton- & Videotechnik, Licht/Kabel, Notenmappen, Büro & EDV, Möbel, Kleidung, Pflege/Ersatzteile, Sonstiges. Je Stück oder als Sammelposten (Anzahl).
- **Felder** (auch bei Instrumenten): Inventar-Nr. (wird vorgeschlagen, über Instrumente und Ausstattung eindeutig), Seriennummer, Eigentümer (Förderverein, Schule, Leihgabe, privat), Anschaffung, Preis, gekauft bei, Beleg, Garantie, Abschreibung (Art, Nutzungsdauer), verantwortlich, zuletzt gesehen (Inventur), ausgeschieden am + Grund.
- **Status:** verfügbar · im Einsatz · verliehen · in Reparatur · defekt · vermisst · gestohlen · ausgemustert · verkauft · verschrottet. Abgang (gestohlen, verkauft …) ohne Datum → heute.
- **Abschreibung:** linear monatsgenau ab Anschaffungsmonat bis zum Abgang; bis 800 € sofort (GWG); Richtwerte je Kategorie (Instrumente 10 Jahre), im Datensatz änderbar. Im Formular: AfA dieses Jahr, bisher, Restbuchwert.
- **Übersicht „📦 Inventar & Abschreibung“:** Kennzahlen (Bestand, Anschaffungswert, AfA des Jahres, Restbuchwert, Problemfälle, Inventur überfällig), Filter (Bereich, Kategorie, Status, Eigentümer, Jahr), Problemfälle, Abgänge, ✅ Inventur-Modus, 🏷️ QR-Etiketten zum Aufkleben, 📤 Anlagenverzeichnis (CSV für Kassenprüfung).

## 🎼 Demo-Probenoten · 🗂️ Explorer (0.18.0)
- **Explorer:** dritte Ansicht im Notenarchiv (🗂️) – ein Baum wie im Windows-Explorer: 📁 Stück › 🎻 Instrument › 📄 Noten, ▸/▾ zum Auf- und Zuklappen, eingerückt mit Hilfslinien; Orchester-Chips, Suche (Treffer klappen auf), ⊞/⊟ alles auf/zu, › öffnet die Stück-Seite.
- **Probenoten:** gemeinfreie Stücke (Petzold-Menuett, Pachelbel-Kanon, Beethoven „Ode an die Freude“, Mozart „Kleine Nachtmusik“, Dvořák Largo) und die eigene Bachkreis-Fanfare, in der App selbst gesetzt (keine Fremd-Dateien, keine Kosten, offline). Je Instrument eine eigene Stimme: Melodie, Mittelstimme oder Bass – vereinfacht, zum Üben, keine Originalausgabe.
- **Richtig notiert:** Violin-, Alt- und Bassschlüssel; Klarinette/Trompete in B und Horn in F transponiert mit passender Tonart; Kontrabass klingt eine Oktave tiefer. Lage innerhalb des Instrumentenumfangs.
- **Notenblatt:** ▶ Anhören (Klang des Instruments, die Note leuchtet mit), 🔍 Takte je Zeile, 🖨️ Drucken (nur das Blatt), ⬇️ SVG speichern, Link zu IMSLP für Originalausgaben. Echte PDFs (📤) bleiben wie gehabt.

## 🎻 Üben und 📆 Kalender (0.14.0)
- **Übe-Tagebuch:** ⏱ Stoppuhr (läuft beim Seitenwechsel weiter), Eintrag mit Datum, Minuten, Stück, Inhalt (Tonleitern, Etüden, Stück, Vom Blatt, Rhythmus, Technik, Gehör), Gefühl 😖–🤩 und Notiz. Woche als Balken Mo–So, Wochenziel, 🔥 Tage in Folge.
- **Datenschutz:** Einträge sehen nur die Person, ihre Eltern und – nur wenn „geteilt“ – Leitung/Lehrkräfte (Server-Regel `uebungen`, auch für die Leitung privat). Eltern dürfen fürs Kind eintragen.
- **Übezeiten:** Wochentage, Uhrzeit, Dauer, Wochenziel, Erinnerung vorher (`personen.uebe_plan`, vom Server bereinigt). Erinnert wird über den Handy-Kalender (wiederkehrender Termin mit Erinnerung) und beim Öffnen der App („Heute ist Übetag“, einmal am Tag, abschaltbar).
- **Kalender-Abo:** persönlicher Link `…/functions/v1/bk-api?kalender=<person>.<HMAC>` – Apple (webcal), Google (Per URL hinzufügen), Outlook (Link kopieren). Enthält die eigenen Termine (Eltern: die der Kinder mit Vornamen) der letzten 60 Tage und alle kommenden, Erinnerung vor jedem Termin (`personen.kalender_alarm`) und die Übezeiten. „Neuer Link“ erhöht die Zählnummer in `bk_kalender_abos` → alter Link ungültig. Ohne Secret `BK_KALENDER_GEHEIMNIS` antwortet der Server „nicht eingerichtet“ (der Supabase-Workflow legt es einmalig an).
- **Einmal übertragen:** Kalenderdatei (.ics) mit Erinnerungen und Übezeiten; je Termin „🍎 Apple/Outlook“ (Datei) oder „🟢 Google Kalender“ (Vorlage).

## 📅 Termine kinderleicht · 🟢 Online & 👋 Anklopfen (0.16.0)
- **Wer sieht welche Termine:** die Termine der eigenen Orchester (A, B, Orchesterklasse, Ehemalige …), 🌍 Termine „für alle“ (ganzer Bachkreis) und 🙋 eigene Termine. Eltern sehen die ihrer Kinder.
- **Wer trägt ein:** Leitung, Lehrkräfte und Personen mit der Rolle „Terminplaner“ (PC-Verwaltung › Personen › Rollen). Beim Anlegen: Für wen (🌍 Für alle oder Orchester), Teilnahme (❗ erforderlich · 🙂 erwünscht · ℹ️ nur Info), Antwort bis, Serie.
- **Antworten:** ✅ Ich komme · ❌ Ich kann nicht · ⏳ Weiß noch nicht. Bei ❗ erforderlich braucht die Absage einen Grund (Gründe zum Antippen; der Server lehnt sonst ab). Bei ℹ️ Info gibt es keine Antwort. „Weiß noch nicht“ fragt: wann nochmal fragen? (morgen, in 3 Tagen, in einer Woche, 2 Tage vorher) – an dem Tag kommt beim Öffnen „Du wolltest dich noch entscheiden“. „Offene erinnern“ der Leitung erreicht auch die Unentschlossenen.
- **Ansicht:** Abschnitte Heute · Morgen · Diese Woche · Nächste Woche · Monat; Filter Noch antworten · Mein Orchester · Für alle · Eigene; Hinweis „x Termine warten auf deine Antwort“.
- **Eigene Termine:** Was (Üben, Unterricht, Vorspiel, Sonstiges), Tag, Uhrzeit, Dauer, jede Woche bis …, Erinnerung im Handy-Kalender. Privat (Server-Regel), auch im Kalender-Abo.
- **🟢 Wer ist online:** in 💬 Nachrichten oben, mit Gesichtern. Meldung alle 45 s, „online“ = in den letzten 2 Minuten. Stand älter als 3 Minuten → keine Anzeige.
- **👋 Anklopfen:** „Hast du gerade kurz Zeit?“ – der andere antwortet ✅ Ja, jetzt (Chat geht auf) · ⏰ Später · ✋ Gerade nicht; Absender wartet mit 60-Sekunden-Uhr. Push über den BK Communicator. Höchstens einmal je Minute und Person, 20 je Stunde.
- **Einstellbar (Zahnrad › 🟢 Wer ist online & Anklopfen):** Leitung wählt, wer die Funktion bekommt (Leitung & Lehrkräfte · Schüler · Eltern; Standard: nur Leitung & Lehrkräfte). Jeder kann „Mich als online zeigen“ ausschalten. Kinderschutz: man sieht nur, wem man auch privat schreiben darf.
