# Änderungen

## 0.24.0 DEV – 16.10.2026
- 🖥️ PC-Layout: `.vw-raster3`/`.vw-kz4`/`.vw-bereich`, Seitenleiste mit „Werkzeuge“, Übersicht nach Bereichen (alle Tabellen + Werkzeuge) mit Cockpit „Was ist zu tun?“; Formular als Fenster (`.vw-modal`, Esc schließt) mit 3 Spalten, Schaltern in einer Reihe, langen Feldern über volle Breite; Mehrfachauswahl als Chips (≤ 40); Einstellungen in Abschnitten
- 🧰 js/verwaltung/werkzeuge.js: Terminplanung, Genehmigungen, Rundschreiben, Projekte & Konzerte, Kasse & Beiträge, Notfall- & Foto-Listen, Mitfahrbörse, Teilnahmebescheinigungen, Ferien
- ⚙️ Folgeschritte nach dem Speichern am PC (Ausleihe, Reparatur, Einkauf → `einkaufInventar()` gemeinsam mit der App, Termin neu/abgesagt → Benachrichtigung); Datenauskunft je Person
- Schema: termine.register/soll als Formularfelder (Soll-Editor), termine.probenplan/protokoll (intern), ausleihen.ausstattung_id, Tabellen `interessenten`, `dienste`, nachrichten.kanaele mit Werten
- 🐞 Sortierung nach Datum/Zahl statt Anzeige, auf-/absteigend; Namen statt IDs (`nameVon`), Absturz bei „liste“ ohne Werte
- Migration 20261031000000_bk_pc.sql; Rundgang prüft PC-Werkzeuge und Formular-Überschriften

## 0.23.0 DEV – 16.10.2026
- 🚗 mitfahrten: art (angebot/gesuch), zusage_von, notiz; Server: Gesuch nur für eigene Kinder, „Ich nehme mit“ nur als man selbst (SCHON_ZUGESAGT), eigene Zusage zurücknehmen; Benachrichtigungen bei Angebot, Gesuch, Zusage, Buchung, Rückzug
- Ansicht „Mitfahrbörse“ (Kachel für Eltern und Lehrkräfte, Zahl = Kinder ohne Mitfahrt in 14 Tagen), Mini-Anzeige 🚗/🙋 in der Terminliste
- 🐞 Instrumentenkunde: Position (transform-Attribut) und Wipp-Animation (CSS) in getrennten Gruppen – die Animation überschrieb die Position des Kopfes; Rundgang prüft die Kopfposition beim Spielen
- Migration 20261030000000_bk_mitfahrboerse.sql

## 0.22.0 DEV – 16.10.2026
- 🚗 Tabelle `mitfahrten` (Server: nur Erwachsene, eigene Kinder buchen, Plätze nur Fahrer, VOLL); Karte „Mitfahren“ im Termin
- 📝 Tabelle `uebeaufgaben` (Person / Register / Gruppe; Schüler haken nur sich ab); Anzeige unter „Üben“, Verwaltung in der Übe-Übersicht
- 📜 werke: verlag, bearbeiter, miete_bis, gema; Tabelle `notenexemplare` (eigene sichtbar, „Meine Noten“); GEMA-CSV aus dem Programm; Cockpit: Mietmaterial-Frist mit offenen Exemplaren
- 🚪 `raeume` (allgemein sichtbar), 🔑 `schluessel` (Cockpit: überfällig), 💛 `fv_mitglieder` (Cockpit: offene Beiträge), personen.fz_vorgelegt_am (geschützt; Cockpit: Begleitpersonen ohne gültiges Führungszeugnis)
- 🔧 reparaturen.ausstattung_id (inventar_id nicht mehr Pflicht), Reparatur-Ansicht/Status für Ausstattung, „Auftrag an die Werkstatt“ per Communicator-Mail; Einkauf „inventarisiert“ → Instrument oder Ausstattung; spenden.inventar_id/ausstattung_id
- 🧹 bk-kom Wartung: abgelaufene Gesundheitsangaben automatisch löschen (Inhalt geleert, Protokoll LOESCHFRIST)
- Migration 20261029000000_bk_extras.sql; Tests tests/extras.test.mjs; Rundgang erweitert

## 0.21.0 DEV – 16.10.2026
- 🎼 Terminformular: Register-Auswahl (termine.register); Registerführer: Server-Sicht auf Antworten des eigenen Registers ohne `notiz`, Ansicht „Mein Register“ mit Erinnern
- 🤝 ausleihen: zubehoer, kaution(+status), gebuehr(+bezahlt bis), versicherung, vertrag_id; genehmigungen.ausleihe_id; Vorlage per Zweck „leihvertrag“; Kaution bei Rückgabe; konfig leih_kaution/leih_gebuehr
- 👪 `elternZugriff` (ab 18 nur mit eltern_kind.zugriff_ab_18, Ehemalige ebenso) in Server-Kontext und kinderVon/elternVon; Eltern ändern `KIND_KONTAKT`-Felder ihrer Kinder
- 🎭 Tabelle `programm` (allgemein sichtbar), projekte: treffpunkt, kleiderordnung, transport_inventar/-ausstattung (intern), anmeldung, anmeldeschluss, kosten, plaetze; js/app/konzert.js
- 🧳 Tabelle `reise_anmeldungen` (Selbstanmeldung, Warteliste, Anmeldeschluss, Betrag/bezahlt nur Kasse)
- 🎓 gruppen.wechsel_nach/wechsel_ab_jg/ehemalige, `schuljahrVorschlaege()`, konfig abschluss_jahrgang (statt fester Kürzel)
- 🔐 `personenDaten()` (Auskunft über alle Tabellen), `loeschKandidaten()`, personen.ausgetreten_am, PC-Ansicht „Datenschutz & Löschfristen“ (Anonymisieren mit Sicherung), konfig loeschfrist_monate
- 🎓 Ehemalige in pwAppPerson, untereinander privat schreiben
- 🐞 Server-Kontext lädt jetzt auch projekte, genehmigung_vorlagen, reise_anmeldungen (Begleiter-Zugriff und Textfassung aus 0.20.0 wirkten im Echtbetrieb sonst nicht)
- Migration 20261028000000_bk_verein.sql; Tests tests/verein.test.mjs; Syntax-Prüfung aller Browser-Dateien im Vertragstest

## 0.20.0 DEV – 16.10.2026
- 🛡️ `chatPartnerErlaubt`: Kind ↔ Erwachsener nur Leitung/Lehrkraft (oder verwandt); `chatMitgliederMitKopie`/`istMinderjaehrig`: Eltern minderjähriger Kinder automatisch in neuen privaten Unterhaltungen (Einzel → Runde „… · mit Eltern“), Server prüft auch für Verwalter; konfig `chat_eltern_kopie`
- 💶 Server: Status „freigegeben“ bei Reparatur/Einkauf nur Vorstand oder Leitung bis `freigabe_grenze_eur` (FREIGABE_UEBER_GRENZE)
- 🔒 `PERSONEN_SICHT` je Rolle (Vorstand, Instrumentenwart, Notenwart); `antworten` lesen nur Terminplanung; Felder mit `vermerk: true` (gruppe_zuordnung.grund, person_instrument.niveau, projekte.checkliste) nur für Rollen mit Leserecht; Genehmigung: Textfassung vom Server
- 🩺 Tabelle `gesundheit` (Eltern-Selbstpflege, Bestätigung + `loeschen_am`), `projekte.begleiter` (Sicht nur 3 Tage vor bis 3 Tage nach der Fahrt), Anzeige in SOS und Personenkarte
- 📷 `genehmigung_vorlagen.zweck`, `einwilligung()`/`fotoErlaubnis()`, Ansicht „Foto-Liste“, Hinweis bei Foto-Anhängen
- 📋 `antworten.anwesend` + spaet/entschuldigt, Abhak-Knöpfe im Termin, „Alle Zusagen da“, `fehlzeiten()`, Ansicht „Anwesenheit“ (App) und „Anwesenheit & Fehlzeiten“ (PC, CSV)
- Migration 20261027000000_bk_schutz.sql; Tests tests/schutz.test.mjs; Rundgang erweitert

## 0.19.0 DEV – 16.10.2026
- 📦 Tabelle `ausstattung` (Kategorien mit Richtwert-Nutzungsdauer, Sammelposten, Eigentümer, Finanzierung, Einkauf-Verweis) und gemeinsame Inventar-Felder auch für `inventar` (Seriennummer, Eigentümer, Händler, Beleg, Garantie, AfA-Art/-Jahre, verantwortlich, Inventur, Abgang); Status-Katalog INVENTAR_STATUS
- logik.js: `abschreibung()` (linear pro rata temporis, GWG sofort, Abgang), `inventarBestand()`, `naechsteInventarNr()`
- PC-Verwaltung: Ansicht „Inventar & Abschreibung“ (Kennzahlen, Filter, Problemfälle, Inventur, QR-Etiketten, Anlagenverzeichnis-CSV), Abschreibungs-Kasten im Formular, Nummernvorschlag, Prüfung auf doppelte Inventar-Nr., Abgangsdatum automatisch
- Korrekturen: Anmeldung/Sitzung bei „ausgetreten“ gesperrt; `stimmen.gruppe_id` serverseitig beachtet; Reparatur erledigt → „verliehen“ bei aktiver Ausleihe; ausgeschiedene Instrumente überall ausgeblendet
- Nachtrags-Migration 20261026000000_bk_inventar.sql; Tests tests/inventar.test.mjs; docs/KONZEPT-CHECK.md (Lückenanalyse)

## 0.18.0 DEV – 16.10.2026
- 🎼 Demo-Probenoten: js/kern/notensatz.js setzt die gemeinfreien Stücke der Musik-Engine als SVG (ohne Bibliothek/Schriftart) – je Instrument Melodie, Mittelstimme (Akkordtöne mit kurzen Wegen) oder Bass aus der Harmonie, Pauken auf Grundton/Dominante, Klavier zweizeilig, Partitur dreizeilig
- Schlüssel, Tonart, Transposition (Kl/Tr in B, Hr in F, Kb 8va), Vorzeichen-Rechtschreibung je Takt, Haltebögen über Taktstriche, Balken, Pausen, Ganztaktpausen
- js/app/notenblatt.js: Ansicht „notenblatt“ (▶ Anhören mit mitlaufender Note, Größe, Drucken, SVG speichern, IMSLP-Hinweis); stimmen.datei „demo:<stück>“ öffnet sie über notenDatei
- 🗂️ Notenarchiv-Ansicht „Explorer“: Baum Stück › Instrument › Noten mit ▸/▾, Einrückung, Alle auf-/zuklappen, Orchester-Chips, Suche klappt Treffer auf
- Vorführdaten: Werke w-8…w-11 (Menuett, Ode an die Freude, Largo, Fanfare); Kanon und Nachtmusik mit Demo-Noten; lizenzierte Werke bekommen keine
- Tests: tests/notensatz.test.mjs; Rundgang prüft Explorer und transponiertes Notenblatt

## 0.17.0 DEV – 16.10.2026
- 🏠 Startseite: drei Kacheln im Feld „Nächster Termin“ (wie KC kacheln3): Nachrichten, Wer ist online (Liste mit Anklopfen), Countdown zum Termin; Antwort-Knöpfe nur, solange noch nicht geantwortet
- 🟢 Fußzeile: grüne Online-Zahl am Orchester-/Kinder-Knopf; Orchester: grüner Punkt an Gesichtern, „x online“-Knopf hebt nur diese hervor; Ereignis „bk-online“ frischt Startseite, Fußzeile und Orchester auf
- Vorführdaten: online_fuer = Leitung & Schüler (Echtbetrieb weiter Standard nur Leitung & Lehrkräfte)

## 0.16.0 DEV – 16.10.2026
- 📅 Termine kinderleicht: Abschnitte, große Antwort-Knöpfe, Antwort-Stand mit „ändern“, Absage-Gründe zum Antippen, „Weiß noch nicht“ mit Nachfrage-Tag (antworten.nachfragen_am) und Erinnerung beim Öffnen, Filter Noch antworten/Mein Orchester/Für alle/Eigene
- termine.fuer_alle (🌍 ganzer Bachkreis) und termine.teilnahme (❗ erforderlich · 🙂 erwünscht · ℹ️ Info); Server: Info-Termine ohne Antwort, Absage bei erforderlicher Teilnahme nur mit Grund
- 🙋 eigene_termine (privat, auch wöchentlich, im Kalender-Abo und in der Kalenderdatei); Rolle „terminplaner“ darf Termine anlegen
- 🟢 Online/👋 Anklopfen: Server-Aktionen online/anklopfen (Tabelle bk_online, Tabelle klopfen), konfig.online_fuer im Zahnrad, Kinderschutz über chatPartnerErlaubt, „Mich als online zeigen“
- Nachtrags-Migration 20261025000000_bk_termine_online.sql

## 0.15.0 DEV – 16.10.2026
- 🎭 Bühne: Gesichter der Mitglieder (erstes Orchester, nach Register), neue Instrumenten-Zeichnungen mit Armen und Händen, Spielhaltung/Pausenhaltung, Kopfnicken, Posaunenzug, Podeste, Rampenlicht, Dirigentin von hinten

## 0.14.0 DEV – 16.10.2026
- 🎻 Üben (js/app/ueben.js): Tagebuch (Tabelle uebungen, privat: Person, Eltern, geteilt → Leitung/Lehrkräfte), Stoppuhr, Woche/Ziel/Serie, Übezeiten (personen.uebe_plan), Hinweis beim Öffnen, Übe-Übersicht
- 📆 Kalender (js/app/kalender.js): Abo-Link je Person (HMAC aus Person + Zählnummer, Geheimnis BK_KALENDER_GEHEIMNIS, Tabelle bk_kalender_abos), GET bk-api?kalender=… liefert .ics mit Erinnerung (personen.kalender_alarm) und Übezeiten (RRULE); neuer Link macht den alten ungültig
- .ics: Erinnerungen (VALARM), Zeilenfaltung, Übezeiten als Serie; Google-Kalender-Vorlage je Termin
- Nachtrags-Migration 20261024000000_bk_ueben_kalender.sql; Supabase-Workflow erzeugt BK_KALENDER_GEHEIMNIS einmalig

## 0.13.0 DEV – 16.10.2026
- 📚 Notenarchiv neu (js/app/notenarchiv.js): Orchester/Klasse › Stücke › Noten nach Instrument, Kacheln/Liste, Suche, Chips, Filter (Instrument, Projekt, Schwierigkeit, Rechte), Sortierung, PDF-Stand, Spieler je Register
- werke: gruppen („für Orchester / Klasse“), schwierigkeit, dauer_min – Nachtrags-Migration 20261023000000_bk_notenarchiv.sql

## 0.12.1 DEV – 16.10.2026
- 🐦 Kuckuck wie KC 2.428.0: gesperrter Ton → „🔊 Antippen“ (bis 20 s), stumm gerufen → eine Minute „nochmal mit Ton“; schlafenden Ton wecken, nie Rufe übereinander

## 0.12.0 DEV – 16.10.2026
- 📡 Verbindungs-Symbol in Nachrichten (wie KC Club 2.428.0): Router (WLAN) / Satellit (Mobilfunk), Qualität aus echten Antwortzeiten (js/kern/netz.js, Messung im Supabase-Adapter), Info-Blatt mit „Jetzt messen“, Schalter in den Einstellungen

## 0.11.0 DEV – 16.10.2026
- 🎼 Orchester: Sitzplan mit Gesichtern, Register, Besetzung Soll/Ist, Zusagen der nächsten Probe, 🏷️ Leihinstrumente koordinieren
- 🙂 Gezeichnete Gesichter (personen.avatar, nur Zahlen) mit Editor „Mein Gesicht“, auch in Chats
- 🎺 Instrumentenkunde: 16 Instrumente mit Figur, Klang (WebAudio), Steckbrief, Beachten, Pflege
- gruppen.soll (Soll-Besetzung), Nachtrags-Migration 20261022000000_bk_orchester.sql

## 0.10.0 DEV – 16.10.2026
- 🎻 Instrumente: Kacheln, Liste, Drehregister; Instrumentengruppen; Suche, Status-Chips, Filter, Gruppieren, Sortieren
- Instrumententypen: Felder „Instrumentengruppe“ und „Symbol“ (PC-Verwaltung), Nachtrags-Migration 20261021000000_bk_instrumente.sql

## 0.9.0 DEV – 16.10.2026
- 📂 Vergangene Tage im Chat eingeklappt (Datum rechts, ältere Wochen als KW), 📎 Anhänge (Fotos, Dateien, 🎼 Noten), 🎙️ Sprachnachrichten, 🗣️ Diktieren, 🎤 Sprachsteuerung, 📊 Umfragen, ⏳ Selbstlöschen
- Datei-Ablage mit Adapter (Datenbank oder Supabase Storage), Aktionen datei_hochladen/datei_holen mit Rechte-Prüfung, Noten-PDFs an Stimmen, Aufräumen in bk-kom
- Nachtrags-Migration 20261020000000_bk_anlagen.sql

## 0.8.0 DEV – 16.10.2026
- 💬 Nachrichten wie in der KC Club App (WhatsApp-artig): Haken ✓/✓✓/blau, ❗ wichtig, 🏎️ Express mit Empfangsbestätigung, ⏰ später senden (auch wiederholt), Zustellwahl, Antworten, Reaktionen, Bearbeiten, Löschen, Details mit Zustellzeiten, Einzelchats und Runden mit Kinderschutz, Einstellungen im Zahnrad
- Anschluss an den BK Communicator: Regeln „❗ Wichtige Nachricht“ und „🏎️ Express-Sendung“, Bescheid je Nachricht einmal, Push-Quittung → ✓✓ angekommen, geplante Nachrichten gibt bk-kom frei
- Neue Tabelle nachricht_status, Nachtrags-Migration 20261019000000_bk_nachrichten.sql

## 0.7.0 DEV – 15.10.2026
- 📌 Pinnwand wie in der KC Club App: Korkwand, Post-its in 4 Farben, wichtig, für wen, Antworten, Erledigt je Person, „gelesen x/y“, Post-it-Fenster beim Öffnen, Erinnerung, Geburtstags-Aushang, Bescheid über den BK Communicator
- Neue Tabelle pinnwand_gelesen, Nachtrags-Migration 20261018000000_bk_pinnwand.sql (für schon eingespielte Datenbanken)

## 0.6.1 DEV – 15.10.2026
- Warten wie in der KC Club App: das Bachkreis-Logo dreht sich, hinten steht „since 1969“ (Start, Anmelden, Server-Aktionen, Abgleich)
- Logo oben links öffnet direkt die Internetseite des Bachkreises (Adresse in PC-Verwaltung → Einstellungen)

## 0.6.0 DEV – 15.10.2026
- ⚙️ Mehr: alle Einstellungen wie in der KC Club App (Farbdesigns, Themen mit Schriften, Tag/Nacht, Schriftgröße, Chat-Farben, Sparmodus, Effekte, Privatsphäre, Installation)

## 0.5.1 DEV – 15.10.2026
- Fußleiste wie in der KC Club App (Start, Termine, Nachrichten, Orchester/Kinder, Mehr)

## 0.5.0 DEV – 15.10.2026
- Kopf wie in der KC Club App: Jalousie, Infofeld zum Blättern, Wetter, Jahreszeiten (ganzes Sortiment), Register-Effekte, Kuckucksuhr

## 0.4.0 DEV – 15.10.2026
- BK Communicator: Versand-Kern wie der KC Communicator (Router, Zustellung, Wartung, Eskalation, Quittungen), Web-Push, Brevo/SMTP, Konsole in der PC-Verwaltung

## 0.3.0 DEV – 15.10.2026
- Echtbetrieb vorbereitet: bk-api, Supabase-Adapter, Anmeldung, Rechte auf dem Server, CI-Einrichtung

## 0.2.1 DEV – 15.10.2026
- Veröffentlichung über den Zweig gh-pages

## 0.2.0 DEV – 15.10.2026
- Bühne mit Orchester (Melodien, Konzertaufnahmen, Mitschnitt), Eselsohr am Kopf
- Echtes Bachkreis-Logo überall (App-Symbol, Favicon, Kopf, Verwaltung, QR-Karten)
- Tabelle Konzertaufnahmen

## 0.1.0 DEV – 15.10.2026
Erste Vorführversion. Die Inhalte stehen in `version.json` unter „neu“.
