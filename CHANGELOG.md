# Änderungen

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
