# Änderungen

## 0.53.0 DEV – 09.11.2026
🖨️ **Druckvorschau überall** (wie KC „Druckvorschau“ / „📄 PDF in jeder Druckvorschau“) – Bestandsaufnahme: 11 Druckstellen, bisher alle ohne Vorschau und ohne PDF. Jetzt öffnet jede ein A4-Blatt mit Bachkreis-Kopf (Logo, Name, Titel, Datum) und -Fuß, darüber die Knöpfe:
- **🖨️ Drucken** · **📄 PDF** – echtes A4-PDF, das die App selbst baut (`js/kern/pdf.js`, keine fremde Bibliothek, kein fremder Dienst): Seitenwechsel nur zwischen Zeilen/Blöcken und nie direkt nach einer Überschrift, ab Seite 2 mit Kopfzeile, unten „Seite x von y“; am Handy teilen (WhatsApp, Mail …), sonst speichern · **💬 In Chat** (PDF als Anhang in einen gewählten Chat) · **📥 Eingangskorb** · **📤 An Mitglieder** (Leitung/Lehrkraft/Vorstand: in die Eingangskörbe ausgewählter Personen)
- Umgestellt: Termine/Teilnehmerliste, Meine Daten, Konzertprogramm, Rücklauf Genehmigungen, Foto-Einwilligungen für den Fotografen (alle über den gemeinsamen Knopf), Notenblatt, Notfallpass/-pässe, Brief & Protokoll im Büro (bisher eigenes Fenster), Leihvertrag und leeres Formular; Schilder-Druckerei behält ihr randloses Drucken und bekommt zusätzlich **📄 PDF**. Die PC-Verwaltung (QR-Zugänge, Etiketten) bleibt beim direkten Druck
- 📥 **Eingangskorb für alle** (wie KC-CLUB-EINGANGSKORB, Kachel unter Meins mit Zahl): Geteiltes, aus der Druckvorschau Abgelegtes, eigene 📝 Notizen und 📎 Dateien, und was die Leitung hineinlegt – ansehen, 💬 in einen Chat schicken, löschen. Privat (Person, bei Kindern die Eltern, und wer es hineingelegt hat); es dürfen nur eigene Dateien hinein (Server prüft). Neue Tabelle `eingangskorb`
- 📲 **Teilen → Bachkreis** (wie KC-CLUB-TEILEN-AN-SICH-SELBST): Die installierte App steht im Teilen-Menü des Handys (Manifest `share_target`). PDFs, Fotos, Texte und Links landen nach einer Frage „Wohin damit?“ im 📥 Eingangskorb oder in einem 💬 Chat; der Service Worker legt das Geteilte dafür kurz beiseite
- Behoben: Auswahlfenster aus der Druckvorschau liegen jetzt darüber statt dahinter

## 0.52.0 DEV – 09.11.2026
📝 **Leihvertrag als Formular** (Wunsch Hansi): Kachel „📝 Leihverträge“ für Leitung, Vorstand und Instrumentenwart – und für Mitglieder/Eltern, sobald es einen Vertrag für sie gibt.
- Formular: Entleiher/in wählen → **Anschrift und Geburtsdatum** kommen aus der Kartei und werden mit dem Vertrag festgehalten; bei Minderjährigen die/der **Erziehungsberechtigte** (Auswahl aus den hinterlegten Eltern); **ein oder mehrere Instrumente** und weitere Ausstattung, **Zubehör** (Koffer, Bogen, Kolophonium …) plus Freitext, **Leihe ab/bis**, Kaution, Leihgebühr, Versicherung, Zustand bei Ausgabe, **Leihbedingungen mit Schadensklausel** (Muster, je Vertrag anpassbar; Standard unter ⚙️ Leihbedingungen – bitte vom Vorstand prüfen lassen)
- ✍️ **Unterschriften** mit dem Finger: Mitglied, Erziehungsberechtigte (nur bei Minderjährigen) und „für den Bachkreis“ – vor Ort auf einem Gerät (vermerkt) oder jede/r auf dem eigenen Handy; Eltern sehen oben „📝 Leihvertrag wartet auf Ihre Unterschrift“. Der Server setzt Name, Zeit und Gerät, lässt nur den eigenen Platz zu und sperrt Änderungen, sobald unterschrieben ist
- 🤝 Nach allen Unterschriften: „Instrumente ausgeben“ legt die Ausleihen an (Inventar „verliehen“); ↩️ Rückgabe mit Zustand
- 🖨️ **Drucken / PDF** des Vertrags und **leeres Formular** für Papier; aus der bisherigen „Instrument ausleihen“-Maske gibt es den Weg zum Formular
- Neue Tabelle `leihvertraege` (Migration 20261120000000), Ausleihen verweisen auf ihren Vertrag

## 0.51.0 DEV – 09.11.2026
Paket A aus dem Abgleich mit der KC Club App – Nachrichten & Anrufe:
- 🔒 **Geheim schreiben** (wie KC-CLUB-VERSCHLUESSELT): im Einzelchat unter Erwachsenen das 🔒 in der Schreibleiste – Ende-zu-Ende verschlüsselt (WebCrypto: ECDH P-256 + AES-GCM), der Server speichert nur Zeichensalat und den Platzhalter „🔒 Geheime Nachricht“; geheime Nachrichten lassen sich nicht ändern. 🔑 **Schlüsselbund** (Technik): eigenen Schlüssel mit Passwort aufs zweite Gerät mitnehmen. Kinderschutz: bei Minderjährigen nie (dort bleibt alles für die Eltern lesbar); Admin kann „Geheim schreiben“ abschalten. Neue Tabelle `geheimschluessel` (nur öffentliche Schlüssel)
- 👤 **Kontakt teilen** (KC-CLUB-KONTAKT): 📎 → „Kontakt teilen“ – Karte mit 💬 Schreiben und 📞/🎥 Anrufen; Kontakte von Kindern werden nie geteilt (Server prüft)
- 👥 **Konferenz** (KC-CLUB-KONFERENZ): im Gruppen-Chat, wenn alle erwachsen sind, oben 👥 – nur Ton, bis 4 Personen; im Chat steht „📞 Dazukommen“
- 👋 **Anklopfen: schreiben oder sprechen?** (KC-CLUB-ANKLOPFEN-ART) – bei „Ja“ ruft man gleich an; 📼 **Anrufbeantworter** (KC-CLUB-ANRUFBEANTWORTER): hat jemand keine Zeit oder reagiert nicht, geht direkt die Sprachnachricht auf
- 🪑 **Runder Tisch**: 🟢 sehen, wer schon da sitzt (KC-CLUB-GESPRAECHE); 💼 **Tasche** (KC-CLUB-TISCH-TASCHE) – vorher PDF, Foto oder Musik packen und am Tisch allen zeigen (direkt von Gerät zu Gerät); 🙋 **Gäste mit eigenem Link** (KC-CLUB-RUNDER-TISCH-GAST) – Leitung/Admin/Vorstand lädt ein (3 Std. bis 3 Tage, zurückziehbar), Gast braucht kein Konto, kommt nur an diesen Tisch (neue Seite `gast.html`, Tabelle `tischgaeste`, gespeichert wird nur der Hash des Links). Verbinden am Tisch jetzt als gemeinsamer Kern `js/kern/tischnetz.js` für App und Gast-Seite
- 📶 **Sende-Schlange sichtbar** (KC-CLUB-SENDE-SCHLANGE): ohne Netz geschriebene Nachrichten zeigen 🕓 und im Chat „wartet aufs Netz – geht von selbst raus“ mit 🔄 Jetzt versuchen; 🐌 **Laden dauert zu lange** (KC-CLUB-LADE-SICHERHEIT): nach 12 s ehrlicher Hinweis und „✕ Nicht mehr warten“

## 0.50.1 DEV – 09.11.2026
- ✥ Startseite: Nach „✅ Fertig“ beim Anordnen fehlte der Knopf „✥ Anordnen“, bis die Seite neu gezeichnet wurde – jetzt ist er immer da (nur ein-/ausgeblendet)
- 🧪 Rundgang: Einstiegsfrage „Wie viel Hilfe?“ vorab beantwortet und auf jedes Neuzeichnen gewartet (in der CI schlug der Rundgang sonst fehl, 0.50.0 wurde darum nicht veröffentlicht)

## 0.50.0 DEV – 09.11.2026
Anrufe, Runder Tisch und Fernhilfe (wie KC-CLUB-ANRUF, KC-CLUB-RUNDER-TISCH, KC-CLUB-FERNHILFE). Ton, Bild und Daten gehen direkt von Gerät zu Gerät (WebRTC, verschlüsselt), nichts wird aufgezeichnet; der Club-Server vermittelt nur den Aufbau (neue Tabelle `anrufe`, Aktionen `anruf_lage`/`tisch_lage`, Einträge nach 2 Tagen gelöscht). Kostenlos: öffentlicher STUN-Server, eigener STUN/TURN über `konfig.rtc_server` möglich.
- 📞🎥 **Anrufe**: im Einzelchat oben 📞 und 🎥; Klingeln mit Annehmen/Ablehnen (Ton, Vibration, Push), Gespräch mit Stumm, Kamera aus, Kamera wechseln, Auflegen; verpasste Anrufe als Zahl an der Kachel „📞 Anrufe“ mit Rückruf. 🔒 Kinderschutz auf dem Server: Minderjährige telefonieren nur mit den eigenen Eltern, unter Erwachsenen gelten die Chat-Regeln
- 🪑 **Runder Tisch**: Online-Treffen bis 8 Erwachsene – „Offener Tisch“ oder direkt aus der Sitzung („🪑 Online dabei sein“); Mikro, Kamera, 🖥️ Bildschirm teilen, ✋ Hand heben, 🚪 Verlassen
- 🛟 **Fernhilfe**: Mitglied bittet Leitung/Admin (wer gerade online ist, steht oben); der Helfer sieht den Bildschirm und zeigt mit rotem Kreis; tippen darf er nur nach „🖱️ Bedienen erlauben“; Chat-Verläufe und Videos werden nie mitgeschickt; jeder kann sofort beenden
- 🧩 Admin kann Anrufe, Runden Tisch und Fernhilfe einzeln abschalten (Module); Vorführung: zwei Tabs im selben Browser können sich wirklich anrufen

## 0.49.0 DEV – 09.11.2026
Abgleich mit der KC Club App 2.80x–2.88x, Paket 5 „Feinschliff“:
- 📈 **So nutzen wir die App** (wie KC-CLUB-NUTZUNG-ALLE): für alle unter Technik – 7/30/90 Tage, Aktionen, „machen mit“ (erst ab 3), Nachrichten, Benachrichtigungen mit ↑↓ zum Zeitraum davor, Farbfeld Wochentag × Uhrzeit („Am meisten los: mittwochs gegen 19 Uhr“), pro Tag, beliebteste Bereiche. Nur Summen (gemeinsame Auswertung `nutzungAuswerten` in logik.js, Server-Aktion `nutzung_lage`) – nie Personen, nie Inhalte
- 🎬 **Sitzungen**: 👥 Anwesenheit (da / entschuldigt / fehlt) im Protokoll; ⏭️ vertagte Punkte kommen bei der nächsten Sitzung gleicher Art als „Offen aus dem letzten Protokoll“ (wie KC-CLUB-PROTOKOLL-VERTAGT); 💡 Vorschläge auf der Tagesordnung werden beim Beenden als behandelt abgeschlossen (KC-CLUB-VORSCHLAG-BEHANDELT); ☐ Aufgaben aus dem letzten Protokoll stehen im neuen zum Abhaken (KC-CLUB-PROTOKOLL-AUFGABEN-STAND)
- 🔎 **Protokoll-Prüfung durch den Schriftführer** (wie KC-CLUB-PROTOKOLL-PRUEFUNG): „📨 Zur Prüfung an …“, Prüfer: „✅ Stimmt so – freigeben“ oder „✏️ Änderung wünschen“; Wünsche als Abhak-Liste, „📨 Nochmal zur Prüfung“; Veröffentlichen erst nach Freigabe, sonst „📢 Trotzdem veröffentlichen“ mit Vermerk; 🔔 Erinnern 1× am Tag; Zahl an der Sitzungs-Kachel
- ⚡ **Kurze Server-Aussetzer** (wie KC-CLUB-DB-AUSSETZER): reine Abfragen fragt die App nach 4 und 8 Sekunden selbst nochmal – Speichern, Senden, Anmelden nie doppelt
- 🕰️ **Rotes ✕ an der Stunden-Uhr** (wie KC-CLUB-UHR-X) mit der Frage „ganz aus?“
- Migration 20261117000000_bk_feinschliff.sql (Anwesenheit, Prüf-Felder an Dokumenten); tests/paket5.test.mjs


## 0.48.0 DEV – 08.11.2026
Abgleich mit der KC Club App, Paket 4 „Leitung“ (letztes Paket der Liste):
- 🎬 **Sitzung vorbereiten & leiten** (wie KC-CLUB-SITZUNG-ABLAUF, -SCHRITTE, -FRIST): Vorstandssitzung, Elternabend, Leitungsrunde, Mitgliederversammlung – Schritte mit Häkchen: 💡 offene Vorschläge übernehmen · 📝 Tagesordnung (Minuten, Reihenfolge, voraussichtliches Ende) · 📨 Einladen mit Frist („bis spätestens …“, rot wenn verpasst) an die Zielgruppe · 🔔 Erinnern · ▶️ Leiten TOP für TOP mit Uhr, Notiz und Beschluss · 🗒️ Protokoll als fertiger Text im Büro-Ordner „Protokolle“ (danach wie gewohnt freigeben). Planen: Leitung, Vorstand, Admin; Eingeladene sehen die Tagesordnung ab der Einladung. Tabelle bk_versammlungen (bk_sitzungen ist die Anmelde-Sitzung)
- 📁 **Meine Unterlagen** (wie KC „eigener Archiv-Ordner“): Ordner je Person, für Eltern auch je Kind – Bescheinigungen, Verträge, Atteste, Rechnungen, Einwilligungen; Leitung legt für alle ab, Eltern für die eigene Familie; Abkürzungen zu Genehmigungen, Leihinstrument, Einwilligungen; sichtbar nur Familie + Leitung
- 🪧 **Schilder-Druckerei** (wie KC „Schilder-Druckerei“): Wegweiser mit Pfeil, Reserviert, Registerschild, Türschild, Garderobe, Kuchenbuffet mit Preisliste, Pult-Namenskarten zum Knicken – A4 quer/hoch oder A5, Schwarz-Gold mit Logo oder hell; Vorschau, Drucken
- Migration 20261116000000_bk_versammlungen.sql (bk_versammlungen, bk_unterlagen); tests/paket4.test.mjs


## 0.47.0 DEV – 08.11.2026
Abgleich mit der KC Club App, Paket 3 „Gemeinschaft“:
- 🛍️ **Bachkreis-Börse** (wie KC „Helfen, Leihen & Börse“): 🎁 Biete · 🔎 Suche (Instrumente, Noten, Konzertkleidung, Zubehör; Preis, VB oder zu verschenken, Foto) und 🙋 Helfer gesucht (Kuchen, Auf-/Abbau, Fahrdienst) mit Plätzen, Frist und „Ich helfe“; Kontakt über eine Nachricht in der App; Status offen/reserviert/erledigt; nur Erwachsene. Server: ändern nur eigene Anzeigen, als Helfer nur sich selbst, Plätze begrenzt (VOLL), Leitung räumt auf
- 📖 **Jahrbuch** (wie KC „Unser Clubjahr“ + „Mein Clubmoment“): je Schuljahr ein Buch zum Blättern (Reiter, ‹ ›, Wischen) – Titel mit Zahlen, Konzerte, Fahrten, Fotos aus dem Fotoalbum, 💛 schönste Momente; Momente schreiben alle (auch Kinder), sichtbar erst nach Freigabe durch die Leitung
- 🎲 **Musik-Spiele** (wie KC „Spiele“): 🃏 Instrumenten-Memory mit Klängen, 🎵 Noten-Raten im Violin- und Bassschlüssel (deutsche Namen mit H, Note anhören), Quiz; Rekorde nur auf dem Gerät
- 🎭 **Stimmen-Effekte** für Sprachnachrichten (wie KC): 14 Stimmen (Maus, Helium, Ente, Außerirdischer, Roboter, Blechdose, Brummbär, Riese, Gespenst, Radio, Megafon, Echo, Unter Wasser) – Auswahl beim Aufnehmen, verarbeitet im Handy (Web Audio), gesendet als WAV
- Migration 20261115000000_bk_boerse_jahrbuch.sql (bk_boerse, bk_jahrbuch_momente); tests/paket3.test.mjs


## 0.46.0 DEV – 08.11.2026
Abgleich mit der KC Club App, Paket 2 „Sicherheit & Notfall“:
- 🪪 **Notfallpass** (wie KC „Dein Notfallpass im SOS-Bereich“): je Kind eine Karte mit Gesicht, Allergien, Medikamenten, Hinweisen, Ernährung, Schwimmer, Krankenkasse, Arzt, Tetanus, Erlaubnissen und Notfallnummern (Eltern zum Antippen), Stand der Bestätigung (abgelaufen = orange); 🖨️ Drucken; im SOS, unter Meins und in der Lupe. Sichtbar nur, was der Server ohnehin freigibt (Eltern: eigene Kinder; Begleitpersonen: Kinder ihrer Fahrt)
- 🧳 **Fahrt-Mappe** für Begleitpersonen/Leitung: alle Notfallpässe der angemeldeten Kinder einer Fahrt, kompakt, zum Drucken
- 📍 **Standorte** (wie KC „Standorte“, „Standort mit Entfernung“, „Wo bin ich“): Probenorte, Auftrittsorte, Treffpunkte, Unterkünfte mit Adresse, Hinweis, 🧭 Anfahrt (Karten-App), 🗺️ Karte (OpenStreetMap), 📏 Entfernung von hier (Position bleibt auf dem Gerät); Pflege durch die Leitung (konfig standorte, „📍 Ich stehe gerade dort“); beim Termin „🧭 Anfahrt“
- 📸 **Bildschirmfoto mit Markierung** (wie KC-CLUB-BILDSCHIRMFOTO, -MELDUNG, -FARBEN): 📸 antippen → verschiebbarer roter Auslöser → Foto des sichtbaren Bereichs (ohne Auslöser, Meldungen, Unsichtbares) → mit dem Finger einkreisen (6 Farben, Rückgängig) → 🆘 an die Leitung (Rückmeldung mit Bild) oder 💾 aufs Handy; auch direkt im Rückmelde-Formular (Text bleibt erhalten). Bild sehen nur Person und Leitung; Wartung löscht es nicht als verwaist. html2canvas 1.4.1 (MIT) in lib/html2canvas, erst beim ersten Foto geladen
- Migration 20261114000000_bk_bildschirmfoto.sql (bk_rueckmeldungen.bild); tests/paket2.test.mjs


## 0.45.0 DEV – 08.11.2026
Abgleich mit der KC Club App, Paket 1 „Ordnung & Bedienung“:
- 🗺️ **Alles auf einen Blick** (wie KC „Club-App auf einen Blick“): jeder Bereich der App, nach Registern (Bachkreis · Meins · Technik · Admin) in Klappbereichen, nur was die eigene Rolle sieht, auch auf der Startseite ausgeblendete Kacheln (gestrichelt), Suche; Kachel unter Technik
- 🙋 **Einstieg** (wie KC-CLUB-EINSTIEG): ab dem 2. Öffnen einmal „Wie viel Hilfe möchtest du?“ – 🙋 Viel (Tipps, Übersicht), 👌 Ein bisschen (Standard), 😎 Ich komme klar (keine Tipps); an diesem Start sonst kein Fenster; änderbar in ⚙️ › Ansagen & Tipps
- 🗂️ **Einstellungen als Kartei** (wie KC-CLUB-ROLLKARTEI): Umschalter ☰ Liste / 🗂️ Kartei; Reiter oben, ein Bereich, ‹ › und Wischen blättern
- 🗺️ **Feiertage je Bundesland** (wie KC „Bundesländer wählen“): alle 16 Länder mit ihren Feiertagen (Buß- und Bettag, Reformationstag, Heilige Drei Könige, Frauentag …), mehrere wählbar; Standard NRW
- ⏳ **Warte-Bild** wählbar (wie KC mit Küchen-Motiven, hier Musik): Bachkreis-Logo, 🎻 Geige streicht, ⏱️ Metronom, 🎵 Noten hüpfen, 🪄 Taktstock, 🥁 Trommelwirbel, 🎶 Notenschlüssel – fest, abwechselnd oder täglich anders
- ✨ **Blinken** einstellbar: Ungelesen-Zahlen, rote Lämpchen, Kopf-Pfeil (aus = ruhig)
- tests/ueberblick.test.mjs


## 0.44.0 DEV – 08.11.2026
- 🔽 Klappbereiche wie in der KC Club App (KC-CLUB-KLAPPE-GLEICH, -KLAPPE-UNTEN, -KLAPPEN-ALLE, -GRUPPE-KLAPPEN): ein gemeinsamer Baustein `js/kern/klappen.js` für jeden `<details data-klappe>` – Titel links, runder weinroter Pfeil rechts (dreht sich), 🔓/🔒 Schloss stellt den Bereich fest (neben der Kopfzeile, damit Bildschirmleser keinen verschachtelten Knopf finden), unten „▴ Zuklappen“ (springt zur Überschrift), Auf/Zu je Gerät gemerkt; oben „▾ Alle auf / ▴ Alle zu“ (festgestellte bleiben, wie sie sind). Wird beim Zeichnen jeder Seite und jedes Blatts eingerichtet
- 💬 Chat: runde weinrote Pfeile an eingeklappten Tagen und Wochen und an aufgeklappten Tages-/Wochenköpfen (KC-CLUB-KLAPP-PFEILE), Abschnitte der Chat-Übersicht und „Archiviert“ mit demselben Pfeil; 👥 Chat-Kopf: „Mit: …“ einzeilig, Pfeil zeigt alle Namen (nur wenn die Zeile nicht passt, beim Öffnen immer zu – KC-CLUB-CHAT-KOPF-KLAPPEN); ✏️ ▾-Griff über dem Schreibfeld klappt den Schreibbereich weg, „▴ ✏️ Schreiben“ öffnet ihn mit Schreibmarke, beim Öffnen eines Chats immer offen (KC-CLUB-SCHREIBEN-KLAPPEN)
- 📋 Listen: Termine (Heute · Morgen · Woche · Monate), Protokolle (Meine Aufgaben, Jahre), Vorschläge › Erledigt (nach Monaten), Rückmeldungen (Eingang der Leitung, Meine), Erstattung › Kasse (nach Status), Einstellungen (+ Alle auf/zu), Instrumente und Noten (Gruppen), Instrumentenkunde, Probenplan/Protokoll, Startnachrichten, Chronik u. a.
- ⚙️ Einstellungen innen wie KC in Unter-Klappen mit Pfeil (Auf/Zu gemerkt, die Suche öffnet passende): 🎨 Darstellung › Farbdesign · Themen · Tag & Nacht · Schrift & Größe · Schatten, Ecken & Tippflächen · Chat-Farben · Sparmodus; ✨ Effekte › Bewegung · Uhr · Überraschungen · Jahreszeiten · Kacheln & Register · Senden & Löschen · Klänge; 🧩 Startseite › Ansicht · Info-Feld & Laufband · Kacheln · Anordnen & auswählen
- Korrektur: ein langer angehefteter Zettel im Chat machte die Seite auf dem Handy breiter als den Bildschirm
- tests/klappen.test.mjs


## 0.43.1 DEV – 08.11.2026
- 🧑‍💻 Korrektur: Wer nur die Rolle „Entwickler“ hat (ohne eingetragene Admin-Rolle), gilt jetzt überall als Admin – PC-Verwaltung (Rechte je Tabelle, geschützte Bereiche, Kommunikation), Chat-Regeln und Pinnwand (schema.js), Express ohne Grenze, Communicator-Wartung (Server), Empfängerlisten bei Terminumfrage, Protokollen, Rückmeldungen und Abstimmungen
- tests/admin-rollen.test.mjs (+ Nur-Entwickler)


## 0.43.0 DEV – 08.11.2026
- 🧑‍💻 Rollen **Entwickler** und **Admin** (Strukturen für einen späteren eigenen Admin der Bachkreis-App):
  - Entwickler = technische Verantwortung, bleibt immer, hat alle Admin-Rechte (`rollenMit`); nur er ernennt/entzieht Admins (Server `NUR_ENTWICKLER`), niemand kann ihn löschen oder austragen (`ENTWICKLER_GESCHUETZT`); Zugänge von Entwickler/Admins verwaltet nur der Entwickler
  - Admin › 👑 Rollen: Entwickler und Admins anzeigen, Admin ernennen/entziehen (nur Entwickler); Demo-Person „Hansi (Entwickler)“; Vorlage für die ersten Zugänge in docs/ECHTBETRIEB.md
- 🛡️ Admin-Bereich wie KC (nur Admin/Entwickler, Register „Admin“):
  - Leitstand mit Wächter-Lämpchen (Datenbank-Größe, Verbindungen, Cache, Zeitpläne pg_cron, Aufrufe pg_net, db_monitor-Prüfung, Communicator, Fehlerberichte, Anmeldungen, Datenvolumen, Spiegel/Sicherung, Wartung) – nicht Messbares bleibt grau
  - Verlauf 30 Tage (stündlicher Messwert der Server-Wartung, nur Zahlen), Datenbank: Belegung je Tabelle, tote Zeilen, teuerste Abfragen (Abfragetext nur für den Entwickler), Zeitpläne, Prüfung
  - Nutzung & Versionen der Geräte (Online-Ping meldet die App-Version), Fehlerberichte der Geräte (neue Tabelle, automatisch gemeldet, nur Admin liest)
  - 🚧 Wartungsmodus: Hinweis oben für alle, speichern dürfen nur Admin/Entwickler (Server 503 `WARTUNG`, Fehlerberichte ausgenommen)
  - 🧩 Module freigeben: Fotoalbum, Advent, Vorschläge, Erstattung, Protokolle, Quiz, Bühne, Übe-Bühne, Chronik, Mitfahrbörse, Austausch für alle abschalten (Admin sieht sie weiter mit 🚫)
  - 🪞 Spiegel & Sicherung (vorgesehen, grau bis eingerichtet), 🔗 Dienste (nur Entwickler)
  - Server-Aktion `admin_lage`; App-weite Schalter (Express-Grenze, Ändern-Minuten, Schüler-Chat, Kinder-Ansicht ab Klasse, Freigabegrenze, km-Satz, Speichergrenzen, Fristen, Wartung, Module) setzt nur noch Admin/Entwickler (`NUR_ADMIN`)
- ⚙️ Zahnrad nach Stufe: 🧒 Kinder (vereinfacht, ohne Startseiten-Umbau) · 👪 Eltern (+ Familie) · 🎼 Leitungen (+ Leitung) · 🛠️ Admin (+ App-Einstellungen für alle) · 🧑‍💻 Entwickler (+ Technik); oben „Ansicht: …“
- Migration 20261113000000_bk_admin.sql (bk_fehlerberichte, bk_online.version); tests/admin-rollen.test.mjs


## 0.42.0 DEV – 08.11.2026
- Abgleich mit der KC Club App 2.882, Teil 5 (letzter Teil der Liste):
  - 🆘 Rückmeldungen zur App (wie KC-CLUB-UNTERSTUETZUNG-ANFRAGE, KC-CLUB-FEEDBACK): 🆘 Problem · 🤝 Hilfe mit der App (auf Wunsch Rückruf) · 💡 Idee · ⭐ Lob mit Sternen; technische Angaben (Gerät, Browser, installiert, Version, Ansicht) automatisch, keine Inhalte. Leitung: Eingang mit Filter, Antwort + Status, Antwort kommt als Nachricht. Fremde Meldungen sieht nur die Leitung. Einstieg: Hilfe-Zentrum und Kachel „🆘 Hilfe & Rückmeldung“
  - 💶 Erstattung (wie KC Erstattung, -BRIEFBOGEN, -CSV): Fahrtkosten (km × Satz, Standard 0,30 €, konfig km_satz) und Auslagen mit Beleg (Foto/PDF, verkleinert); Betrag rechnet der Server; Kasse (Vorstand, Leitung) genehmigt / zahlt aus / lehnt ab mit Notiz; Antrag auf dem Briefbogen, CSV für die Kasse; Beleg sehen nur Person und Kasse. Keine Bankdaten in der App. Migration 20261112000000_bk_rueckmeldung_erstattung.sql
  - 🐞 Marienkäfer (jeder 50. Start) und 🍀 Glücksklee (jeder 25. Start) wie KC-CLUB-MARIENKAEFER / -GLUECKSKLEE: Käfer krabbelt zur Mitte, dreht sich um, lächelt und blinzelt; Klee wird hereingeweht und wieder fortgepustet; antippen = musikalischer Glücksspruch. Immer nur eine Überraschung (Käfer vor Klee vor Fee), nicht ohne Effekte / bei weniger Bewegung, abschaltbar und zum Ansehen in ⚙️ › ✨ Effekte
  - 📏 Datenvolumen-Messung (wie KC-CLUB-EGRESS-MESSUNG): der Server zählt Bytes je Aktion (bei „laden“ je Tabelle), alle 10 Minuten eine Zeile in bk_kom_ereignisse (nur Namen und Zahlen); „Zugang im Blick“ › 💾 zeigt das Volumen hochgerechnet auf 30 Tage gegen das Kontingent (Standard 5 GB, konfig grenze_volumen_gb) mit den größten Verbrauchern – ohne Messung grau
- tests/rueckmeldung-erstattung.test.mjs, tests/zugang.test.mjs (+ Datenvolumen)


## 0.41.0 DEV – 08.11.2026
- Abgleich mit der KC Club App 2.882, Teil 4:
  - 💡🗳️ Vorschläge & Abstimmungen (wie KC-CLUB-ABSTIMMUNG, -VORSCHLAG-*, -VORSCHLAG-ERLEDIGT): Vorschläge reicht jede/r ein (an alle oder als Idee ans Team), andere unterstützen mit 👍; Leitung/Lehrkräfte/Vorstand starten Abstimmungen für alle, Eltern, das Team oder den Vorstand – mit eigenen Antworten (sonst Ja/Nein/Enthaltung), Frist, 📣 Erinnern und 🔒 geheim (der Server entfernt bei geheimen Abstimmungen die Person aus fremden Stimmen – auch für die Leitung). Eine Stimme je Person (ändern/zurücknehmen bis zur Frist), Antworten nach der ersten Stimme gesperrt, Abschluss mit Ergebnis. Aus einem Vorschlag wird mit einem Tipp eine Abstimmung. Migration 20261111000000_bk_vorschlaege.sql
  - 🗒️ Protokolle für Mitglieder (wie KC-Kachel „Protokolle“, KC-CLUB-PROTOKOLL-INFO): Protokolle aus dem Büro gibt die Leitung mit „📣 Für Mitglieder freigeben“ frei (alle / Eltern / Team, mit Benachrichtigung); Kachel mit Zahl neuer Protokolle, „📌 Meine Aufgaben“ aus den Aufgaben-Zeilen mit dem eigenen Namen, im Text gelb markiert
  - 🎄 Adventskalender (wie KC-CLUB-ADVENTSKALENDER, -ADVENT-UEBERRASCHUNG, für den Bachkreis neu gefüllt): 24 Türchen auf einer Winterlandschaft – 🎵 Weihnachtslieder zum Anhören (gemeinfreie Melodien, selbst erzeugter Klang), 🧩 Musikrätsel, ✂️ Bastelideen, 🍪 Leckereien, 🎅 Nikolaus-Quiz, 🕯️ Adventssonntage, am 24. „Stille Nacht“ und ein Weihnachtsgruß. Heutiges Türchen leuchtet, frühere nachholen, spätere zu; bis 30.11. Überraschung (nur die Leitung sieht eine Vorschau), sichtbar bis 6. Januar; gemerkt auf dem Gerät
- 🐞 Server: Abstimmung abschließen meldete fälschlich „Antworten gesperrt“ (Feld-Reihenfolge aus der Datenbank) – mit Test behoben, bevor es live war
- tests/vorschlaege.test.mjs (Abstimmungen, geheim, Adventskalender); tests/buero.test.mjs angepasst (freigegebene Protokolle)


## 0.40.0 DEV – 08.11.2026
- Abgleich mit der KC Club App 2.882, Teil 3:
  - 📷 Fotoalbum (wie KC-CLUB-FOTOALBUM, -FOTO-ALBEN, Diashow, Papierkorb, -FOTO-ENDGUELTIG): Alben „alle“ oder „nur Team“, Fotos hochladen (Erwachsene: Team und Eltern; vorher verkleinert auf ca. 1600 px), Großansicht mit Wischen, ▶️ Diashow, ⬇️ speichern/teilen, Bildunterschrift, 🗑️ Papierkorb 30 Tage + endgültig löschen. 🔐 Markierte Personen brauchen die Foto-Einwilligung „intern (App)“ – der Server lehnt sonst ab; vor dem Hochladen zeigt die App, welche Kinder nicht gezeigt werden dürfen. Datei-Zugriff nur über sichtbare Fotos. Migration 20261110000000_bk_fotoalbum.sql
  - 📖 PDF-Ansicht in der App (wie KC-CLUB-DOKUMENTE / -DOK-SCHONEND): pdf.js 4.10.38 (Apache-2.0) in lib/pdfjs, erst beim ersten PDF geladen; Seiten werden nur nahe am Bildschirm gezeichnet. Gilt für Noten, Dokumente, Büro, Chat-Anhänge, Übe-Aufgaben
  - 🎼 Pult-Modus (neu für den Bachkreis): eine Seite bildschirmfüllend (quer zwei), blättern per Tippen links/rechts, Wischen, Pfeil-/Bildtasten (Bluetooth-Blätterpedal); Bildschirm bleibt an
- 🐞 Server-Wartung: verwaiste Dateien – Dateien von Dokumenten/Büro, Übe-Aufgaben, Übe-Aufnahmen, Mitschnitten und Fotos werden nicht mehr nach 1 Tag als „verwaist“ gelöscht (betraf nur den Echtbetrieb, der noch nicht läuft)
- Vorführversion: Beispielalben mit selbst gezeichneten Bildern, Beispiel-PDF „Probenplan“ unter 📂 Dokumente
- tests/fotoalbum.test.mjs


## 0.39.0 DEV – 07.11.2026
- Abgleich mit der KC Club App 2.882, Teil 2 (Wunsch Hansi „Club App checken und anpassen“):
  - 🗳️ Terminumfrage (wie KC Terminumfrage): Planer (Leitung, Lehrkräfte, Vorstand, Terminplaner) schlagen Termine vor, für Eltern, Mitglieder (Kinder stimmen selbst) oder das Team; abstimmen ✅/🤔/❌ mit Kommentar bis zur Frist; Auszählung mit „am besten“, „📅 Festlegen“ legt den Termin an und gibt allen Bescheid, „📣 Erinnern“ nur an die, die noch fehlen. Fremde Antworten sehen nur Ersteller und Leitung. Hinweis in Termine und „Für dich“. Migration 20261109000000_bk_terminumfrage.sql
  - ❓ Hilfe-Zentrum (KC-CLUB-HILFEZENTRUM): 9 Themen, 43 Hilfen mit Kapitelnummern, Suche, „✨ Neu seit deinem letzten Besuch“, „👉 Zeig mir wo“ mit Leiste „↩️ Zurück zur Hilfe“; Hilfen je Rolle
  - 🔍 Lupe (KC-CLUB-LUPE, KC-CLUB-SUCHE-UNSCHARF): runde Knöpfe 🔍 und ? unten rechts (abschaltbar), Suche über Funktionen, Hilfen, Chats, Termine, Personen, Noten, Dokumente – mit Tippfehlern und Wortanfängen
- js/kern/suche.js, js/kern/hilfe.js, js/app/hilfezentrum.js, js/app/terminumfrage.js; tests/terminumfrage.test.mjs, tests/hilfe-suche.test.mjs


## 0.38.0 DEV – 07.11.2026
- 💬 Nachrichten wie KC Club App 2.882 (Wunsch Hansi 07.11. „Club App checken und anpassen, z. B. das Nachrichtenmodul“), js/app/chatplus.js:
  - ↪️ Weiterleiten (KC-CLUB-WEITERLEITEN) mit Vermerk „Weitergeleitet von …“ und Anhängen – den Namen setzt der Server, nur Sichtbares lässt sich weiterleiten
  - 📌 Anheften (KC-CLUB-ANHEFTEN): bis zu 3 Nachrichten oben im Chat; in Gruppen/Rundschreiben die Leitung, in Einzelchats und Runden alle
  - @Erwähnungen (KC-CLUB-ERWAEHNUNG): Vorschläge beim Tippen, Hervorhebung (gelb, wenn du gemeint bist); erwähnte Personen bekommen Bescheid auch bei 🔕
  - ⋮ Chat-Menü + 🔍 im Chat-Kopf (KC-CLUB-CHAT-KOPF, KC-CLUB-CHATSUCHE): suchen mit Treffer vor/zurück, 🔕 stumm (8 Std./1 Woche/immer – ❗, 🏎️ und @ kommen durch), ⭐ Favorit, 📦 Archiv (Neues holt den Chat zurück)
  - 🔖 Merkliste (KC-CLUB-MERKEN), 👁 „Wer hat noch nicht gelesen?“ für eigene Nachrichten mit 7/14/30 Tagen und „💬 Erinnern“ (KC-CLUB-UNGELESEN-LEITUNG), 📬 Lesestand in der Übersicht (KC-CLUB-CHAT-LESESTAND)
  - ↩️ Zurückholen (KC-CLUB-ZURUECKHOLEN): eigene, noch von niemandem gelesene Nachricht (bis 24 Std.) verschwindet bei allen, der Text kommt zurück ins Feld
  - ❗ nachträglich wichtig, 📤 Anhang teilen, 👉 nach rechts wischen = antworten (KC-CLUB-WISCHEN), ⬇️ Sprungknopf mit Punkt bei Neuem (KC-CLUB-NACH-UNTEN)
  - Datenschutz: Chat-Einstellungen und Merkliste sieht nur die Person selbst – auch nicht die Leitung. Neue Tabellen bk_chat_einstellungen, bk_chat_merker (Migration 20261108000000_bk_chat_plus.sql mit Rechten für service_role)
- 🌙 Farbige Namen in Gruppen-Chats im Nachtmodus besser lesbar (Kontrast)
- tests/chatplus.test.mjs


## 0.37.0 DEV – 07.11.2026
- 🏢 Büro-Raum wie die Club App (Wunsch Hansi 07.11. „Büro komplett nachbauen – Ordner, Ordnerschrank mit Jalousien mit Bachkreis-Logo, Schreibtisch usw.“), js/app/bueroraum.js nach KC teile/buero.js:
  - 🗄️ Aktenschrank: Einklapp-Zeile mit Anzahl Ordner, 🔓/🔒 Schloss, Jalousie mit 28 Lamellen „Bachkreis Bergkamen“, Logo + „seit 1969“, runder Pfeilschalter; Lamellen klappen auf und die Jalousie fährt zur Seite (ohne Effekte: sofort). Regal mit Ordnerrücken: alle Büro-Ordner (mit Zahl) + Wege zu Chronik & Orte, Auftrittsanfragen, Projekte, Partner, Dokumente
  - 🪑 Schreibtisch: Pinnwand (Nächster Termin, Eingang), Lampe mit T/N/A, Bildschirm mit Uhr und Lagezeilen + goldenes Namensschild, Kalender, Eingangskorb (Cockpit-Punkte), Drucker, Handy (Nachricht/Anrufen/WhatsApp), Telefon, Kaffee → ☕ Pause mit Bildschirmschoner (an Geburtstagen 🎂 Glückwunschkarte), Füller (Brief, Protokoll, Pinnwand, Chronik), Tastatur (Person, Rundschreiben, Startnachricht), 🧮 Rechner (ohne eval)
  - ✏️ Einrichten: ziehen/tauschen, fein verschieben, 🛒 Katalog (Tischuhr, Metronom, Stimmgabel a′, Notenpult, Kopierer, Pflanze, Bild, Locher), Grundaufstellung – gespeichert auf dem Gerät
  - Kinder sind bei Handy/Telefon nicht wählbar (Kinderschutz: über die Eltern). ☰ Liste bleibt als zweite Ansicht (Bildschirm antippen), Ordner öffnen sich „aufgeschlagen“
- js/kern/buerotisch.js, tests/bueroraum.test.mjs


## 0.36.0 DEV – 07.11.2026
- 🗺️ Chronik der Auftrittsorte (Wunsch Frau Jacka 07.11.: „wo wir seit der Gründung überall gespielt haben“): neuer Reiter „Orte“ in der Chronik – Weltkarte (Natural Earth 1:50m, gemeinfrei, bilder/weltkarte.json, erst beim Öffnen geladen), Zoom Welt/Europa/Deutschland, Zahlen Orte/Länder/Kontinente, Liste nach Ländern mit Flagge, Punkt/Zeile antippen zeigt die Einträge. js/kern/orte.js: Ortsverzeichnis ohne Netz-Abfrage, `ortVon` (eigene Koordinaten > Stadt > Stadtname im Feld „Ort“; unbekannt = nicht auf der Karte, nie geraten)
- 📥 Auftrittsorte laut Schul-Website (Deutschland, Polen, Frankreich, USA, Israel, Kolumbien, Russland, Großbritannien, Norwegen, Portugal, Italien, China, Österreich + Austausch-Länder) mit festen ids – Knopf „übernehmen“ für Leitung/Vorstand legt nur Fehlendes an, Gelöschtes kommt nicht zurück; in der Vorführversion schon drin
- 📜 Chronik: Felder Stadt, Land, Koordinaten; Jahr nicht mehr Pflicht („Ohne Jahresangabe“ eingeklappt unter der Zeitleiste). Migration 20261107000000_bk_chronik_orte.sql (mit Rechten für service_role)
- 💾 Speicher im Blick (Zugang im Blick, nur Leitung): Datenbank- und Dateigröße gegen die Grenzen des kostenlosen Tarifs (Standard 500 MB / 1024 MB, änderbar in der PC-Verwaltung), gelb ab 80 %, rot ab 95 %, unbekannt grau; größte Tabellen; Server-Aktion `speicher_lage` (nur Zahlen, keine Inhalte)
- 🧹 Löschfrist Änderungsprotokoll: die tägliche Wartung löscht Einträge älter als `aenderungen_monate` (Standard 12, mindestens 3)
- 💤 .github/workflows/wach.yml: montags und donnerstags ein Mini-Aufruf (`aktion: wach`), damit das kostenlose Supabase-Projekt in den Ferien nicht nach 7 Tagen einschläft; ohne Secret tut er nichts
- tests/chronik-orte.test.mjs, tests/zugang.test.mjs (+3)

## 0.35.0 DEV – 07.11.2026
- 🧪 Vorführdaten nach einem Update ergänzen (Wunsch Hansi 07.11.: Link vor 2 Wochen weitergegeben – wer ihn damals geöffnet hat, sah neue Bereiche wie das Büro ohne Beispiele): `demoErgaenzen` in js/kern/adapter-lokal.js – beim ersten Start einer neuen Version kommen nur Beispiel-Zeilen dazu, deren ID dieser Browser nie gesehen hat (Merkliste `bekannt` in __meta); Eingetragenes bleibt, Gelöschtes kommt nicht zurück, fehlende Einstellungen werden ergänzt; Fehler blockieren nie den Start
- tests/demo-ergaenzen.test.mjs

## 0.34.0 DEV – 06.11.2026
- 🎻 Echte Instrumentenklänge (Wunsch Hansi 06.11. „Instrumente noch originalgetreuer klingen lassen – evtl. gibt es dafür im Netz Töne“): 149 kurze Aufnahmen aus **VS Chamber Orchestra 2 – Community Edition** (Versilian Studios, **CC0** – frei, ohne Namensnennungspflicht; Nennung trotzdem in docs/LIZENZEN-TOENE.md) in `ton/instrumente/<art>/<midi>.mp3`, je Instrument 4–16 Töne im Abstand von 3–5 Halbtönen, dazwischen umgestimmt
- js/kern/musik.js: `klaengeLaden`/`klaengeBereit`, Aufnahme statt Synth in `ton`, `zupf`, `pauke`, `trommel` – damit klingen Instrumentenkunde, Bühnen-Orchester (jede Sektion mit eigenem Instrument: Klarinette, Horn, Trompete, Posaune statt „Blech“), Übe-Bühne, Notenblatt und Quiz echt; lange Töne wiederholen die Mitte der Aufnahme
- Laden erst beim ersten Gebrauch, nicht im Offline-Speicher (Updates bleiben klein); offline oder vor dem Laden klingt der bisherige Synth – nie Stille; Schalter „🎻 Echte Instrumentenklänge“ unter ⚙️ › ✨ Effekte
- Tonhöhe jeder Aufnahme beim Bau gemessen (Oktav-Versatz der Bibliothek berücksichtigt, Ausreißer verworfen); Werkzeug tools/klangproben/ (Python + ffmpeg, außerhalb der App)
- tests/klangproben.test.mjs; Rundgang prüft, dass die Violinen-Aufnahmen geladen werden

## 0.33.0 DEV – 05.11.2026
- 🏢 Büro (Wunsch Hansi 05.11. „wie Club App mit Ordnern wie Protokolle, Noten, Grafik und Design mit Vorlagen, Elternbriefe“; nach KC-CLUB-BUERO-RAUM): js/app/buero.js – Regal mit 11 Ordnern (Registry `BUERO_ORDNER` in schema.js), 📥 Eingangskorb aus dem Cockpit, Suche, Ordner nach Jahren, Dokument schreiben/hochladen/verlinken
- Kein zweiter Speicher: Büro-Dokumente liegen in `dokumente` mit neuen Feldern `ordner`, `jahr`, `inhalt` und den Sichtbarkeiten „Büro: Leitung & Lehrkräfte“ / „Büro: Vorstand & Leitung“ (`bueroDarf`); der Server filtert auch für Rollen, die Dokumente sonst ganz lesen (Instrumenten-/Notenwart), und lehnt fremde Büro-Sichtbarkeiten beim Schreiben ab (`BUERO_NICHT_ERLAUBT`); geschützter Datei-Abruf wie bisher
- ✉️ Brief aus Vorlage ({vorname} {datum} {orchester} {termin} {leitung}) → 🖨️ Druck mit Briefkopf · 📣 Rundschreiben (Betreff/Text vorausgefüllt) · 💾 „Elternbriefe“ · 🗒️ Protokoll-Vorlage; Vorführdaten mit 3 Vorlagen und Beispielen
- 📂 Dokumente für Mitglieder zeigt nur noch Dokumente ohne Büro-Ordner
- 👪 Eltern-Ansicht (docs/KONZEPT-ANSICHTEN.md Teil 3): js/app/elternstart.js – „✅ Bitte erledigen“, Kinder-Umschalter, nächste Termine mit Antwort je Kind, 10 Kacheln, schmaler Kopf, „🔧 Alle Bereiche“ ↔ „👪 Eltern-Übersicht“
- Migration 20261105000000_bk_buero.sql; tests/buero.test.mjs; Rundgang (Eltern, Büro, Vorstand), Echtbetrieb angepasst

## 0.32.0 DEV – 05.11.2026
- 🧒 Kinder-Ansicht (docs/KONZEPT-ANSICHTEN.md, Teil 2): js/app/kinderstart.js – nächster Termin mit Mitbringen und Zusage (Kinder sagen selbst zu), „Meine Übe-Aufgaben“ mit Stand, wichtige Pinnwand-Zettel als Karte, 8 Kacheln (Termine, Üben, Noten, Quiz, Instrumente, Orchester, Nachrichten, Ich), schmaler Kopf ohne Info-Feld, Kinder-Fußleiste (Start · Termine · Üben · Nachrichten · Ich), SOS-Knopf
- 🔧 Ab Klasse 9 (`konfig.ansicht_kind_ab_klasse`, PC-Verwaltung › Einstellungen) „Mehr anzeigen“ ↔ „🧒 Einfache Kinder-Ansicht“; Rechte unverändert (Server)
- 🧠 Quiz: js/kern/quiz.js (reine Logik, testbar) + js/app/quiz.js – 6 Bereiche, leicht/schwer (Standard nach Klasse), 5 Fragen je Runde, Erklärung nach jeder Antwort, Noten als selbst gezeichnetes Notenbild, Klänge aus der Instrumentenkunde (`lehreKlang`) bzw. WebAudio
- ⭐ Sterne je Runde, 🔥 Übe-Serie (aus Übe-Tagebuch und Übe-Ergebnissen), 🏅 8 Abzeichen – nur auf dem Gerät, keine Ranglisten
- 🙂 Seite „Ich“ (kindich) · Kachel 🧠 Quiz auch für alle anderen im Register Bachkreis
- Entscheidungen Hansi 05.11.: Kinder sagen selbst zu; Altersgrenze Klasse 9; Nachrichten wie bisher (Kinderschutz-Regeln); Pinnwand nur als Karte „wichtig“; Quiz-Punkte privat (Lehrkraft sieht sie nur beim späteren „Quiz der Woche“); Sterne/Abzeichen ja, Ranglisten nein
- tests/quiz.test.mjs; Rundgang prüft Kinder-Ansicht, Zusage, Quiz-Runde, „Ich“

## 0.31.0 DEV – 04.11.2026
- 🔑 Zugang & Organisation wie die KC Club App 2.859 – neues Modul js/app/zugang.js
- 📲 Einladung zum Installieren (KC-CLUB-INSTALL-EINLADUNG): nur Handy/Tablet im Browser, ab dem 3. Öffnen, höchstens alle 3 Tage, „leise“; Knöpfe Jetzt installieren / Zeig mir wie / Nicht mehr fragen; Hilfe-Kapitel und App-Installation mit Knöpfen (KC-CLUB-HILFE-INSTALL); Kachel „📲 App installieren“
- 🛡️ Zugang im Blick (Leitung, KC-CLUB-INSTALL-STAND): Server-Aktion `zugang_lage` – Anmeldeversuche 14 Tage je Tag, gerade gesperrte Anschlüsse (nur Anzahl, keine Adresse), Fehlversuche 24 Std., je Mitglied ✅ installiert · 🌐 Browser · 💻 PC · ❔ noch nicht gesehen; Online-Meldung trägt nur die Art (`bk_online.modus`), keine Gerätekennung
- 🔗 Freundliche Link-Hilfe auf der Anmeldeseite (ungültig/gesperrt, zu viele Versuche, offline)
- ✏️ Umfrage mit freier Antwort (`umfrage.frei`, `umfrage_frei` je Person ≤ 120 Zeichen, nur die eigene – Server prüft) · 🐞 „Mehrere Antworten erlauben“ wurde nie übernommen (Häkchen erst nach dem Schließen gelesen) – behoben
- 💡 Tipp des Tages mit 👍 / 👎 („Kenne ich schon“ blendet ihn auf diesem Gerät aus, ↺ in den Einstellungen)
- 📊 Bachkreis in Zahlen (nur aus sichtbaren Daten)
- „Termin ändern ohne Benachrichtigung“ gab es schon (Schalter „Eingeladene benachrichtigen“ im Terminformular)
- Migration 20261104000000_bk_zugang.sql; tests/zugang.test.mjs; Rundgang (Zahlen, Zugang, Tipp, Umfrage frei), Echtbetrieb (Zugang im Blick)

## 0.30.0 DEV – 04.11.2026
- 🧩 Bedienung wie die KC Club App 2.858 – neue Module js/app/bedienung.js, js/app/stundenuhren.js, js/app/startnachricht.js, css/bedienung.css
- 📣 Startnachricht der Leitung (KC-CLUB-STARTNACHRICHT, -SPRUNG, -ANTWORT): Tabellen `startnachrichten` + `startnachricht_antworten`, Empfänger alle/Orchester/Personen (`snFuerMich` in schema.js), Pflicht-Fenster ohne ✕, Ja/Später (24 Std.)/Nein, Rückfrage, Knopf zu fester Stelle der App; Absender/Zeit/„später“ setzt der Server; Leitung sieht die Antworten
- 🔐 Migrationen geben jede Tabelle ausdrücklich nur `service_role` frei (`revoke … from public, anon, authenticated` + `grant …`) – Supabase vergibt für neue Tabellen seit 30.10.2026 keine Rechte mehr von selbst (wie KC-SUPABASE-GRANTS); Nachtrag 20261103000000_bk_startnachricht.sql mit Sicherheitsnetz für alle bk_-Tabellen; Test prüft jede Migration
- 🔄 Drehzeichen auf Kacheln mit Rückseite (überdeckt keine Zahl), Rückseite mit 🔄 zurück · 🌀 Kachel-Effekte Einblenden/Zug/Welle/Wirbel/Wackeln/Start/Abwechselnd/Ohne
- 🌗 Schatten (Standard/aus/leicht/mittel/kräftig) · ⬜ Ecken per Regler (2–32 px) · 👆 größere Tippflächen (Standard an) · ⚙️ Einstellungs-Übersicht oben
- 🔔 Kopf-Pfeil blinkt bei eingerolltem Kopf, solange es einen Grund gibt (neue Nachricht, neues Mitglied, jemand neu online) · 🟢 Vornamen unter „online“
- 📌 Pinnwand öffnet sich nie von selbst (Schalter „Neue Zettel sofort als Fenster“) · 📍 gelesene Zettel ab dem Folgetag als Nadel im Rahmen
- 🎁 Geburtstags-Vogel mit Paket, Strauß und „Happy Birthday“ (nur freigegebene Geburtstage, höchstens stündlich) · 🕰️ sieben Stundenuhren mit freien Aufnahmen (Quellen in den Einstellungen, docs/LIZENZEN-TOENE.md), Laden erst beim Gebrauch, sonst Ersatzglocke
- ⏱️ Uhr & Takt: Metronom 30–240, Taktarten mit Betonung, Tempo tippen · Timer mit Gong · Stoppuhr mit Runden
- § Impressum (Felder in der PC-Verwaltung; Fehlendes steht als „noch nicht eingetragen“ da)
- 🐞 Start-Fenster (Tipp, Was ist neu, Übetag, Nachfrage zu Terminen) sind „leise“ – 🏎️ Express und 📣 Startnachricht gehen vor
- tests/startnachricht.test.mjs; Rundgang prüft 🔄, Metronom/Timer, Einstellungs-Übersicht, Impressum, Startnachricht Leitung → Eltern → Antwort; Echtbetrieb ohne Pinnwand-Fenster

## 0.29.0 DEV – 04.11.2026
- 💬 Nachrichten wie die KC Club App 2.858 – neues Modul js/kern/chattext.js (reines JavaScript, nichts geht an fremde Dienste)
- 📝❗🏎️ Versand-Leiste über dem Eingabefeld (`versandLeisteHtml`), erscheint beim Schreiben/Anhängen; ❗/🏎️ aus der Werkzeugreihe dorthin verschoben; Schalter „Versand-Leiste immer zeigen“ (`versandImmer`)
- 𝐅 Formatieren (`naFormat`, `naFarbe`): fett/kursiv/durchgestrichen nur am Wortrand, Farben [rot]…[/rot], Gelb als Textmarker; Vorschau/Push ohne Zeichen (`klartext`, `nachrichtKurz`) · 👋 Grußformeln
- 🛡️ Link-Prüfer (`linkGruende`): http, Zahlen-Adresse, Punycode, Kurz-Links, @-Adressen, Nachahmer-Namen, Passwort-Seiten → ⚠️; sonst 🔗-Karte mit der Adresse (nichts wird geladen)
- 📅 Termin in der Nachricht (`terminErkennen`) → eigener Termin oder Bachkreis-Termin (Vorlage vorausgefüllt) · 💡 Zu-/Absage erkennen (`erkennen`, nur Leitung/Planer, nur fremde Nachrichten < 21 Tage) → Rückmeldung eintragen, ✕ blendet aus
- 💬 Chat-Übersicht: Filter-Chips mit Zahl, Gliederung Zeit/Art/Name/aus, aufklappbare Abschnitte, „🔴 Ungelesen“ zuerst · 👥 Filter im Chat (alle/andere/meine/keine) · ⌨️ Tastatur-Knopf
- 🟢🟠🔴 Alter der ältesten ungelesenen Nachricht (`nachrichtStufe`): Zähler in Fußleiste, Kachel und Mini-Feld blinkt (≤ 2 Tage grün, ≤ 4 orange, sonst rot; aus bei „ohne Effekte“/reduzierter Bewegung)
- tests/chattext.test.mjs; Rundgang prüft Versand-Leiste, Formatieren, 📅-Knopf, Filter und Chat-Übersicht

## 0.28.0 DEV – 18.10.2026
- 🏠 Startseite wie die KC Club App – neues Modul js/app/startseite.js, css/startseite.css (alles nur Geräte-Einstellungen, nichts geht an den Server)
- 🟢 Einfache Ansicht: Kacheln je Rolle (`einfachKacheln()`), eigene Reihenfolge (▲▼), erste Frage „Wie möchtest du starten?“ (nur Echtbetrieb), Umschalten unten mit Hinweis
- 🔄 Kachel-Rückseite (`KACHEL_RUECK`): Doppeltipp dreht um, ↩ oder 8 s zurück, Einzeltipp öffnet wie bisher; abschaltbar
- ✥ Anordnen: lange drücken (0,6 s) → ziehen mit Mitlaufen am Rand, ◀▲▼▶, ✕ / 👁️, „nur ausgeblendete zeigen“, ↺ Standard; Register festhalten und verschieben (`registerReihe`)
- 📰 Info-Laufband (rot/orange/gold/weiß, 6 s, Wischen, Berühren hält an, ✕ für heute), 🔢 Fallblatt-Countdown, ⚡ Schnellstart-Karte (Auswahl bis 8), 🔲 Kachelgröße normal/klein/mini, ⭐ zuletzt gewählt, 🔢 Zahlen zählen hoch
- 💡 Vorschläge (frühestens nach 21 Tagen/8 Nutzungstagen, alle 7 Tage höchstens einer), 📋 Tagesübersicht für Leitung/Lehrkräfte/Vorstand (einmal am Tag, „🌙 heute nicht mehr“)
- ⚙️ Startseite & Ansicht: neue Schalter, Kachel-Auswahl kompakt in aufklappbaren Blöcken („x von y“, „✅ Alle anzeigen“)
- 🐞 Start-Fenster sind „leise“: eine 🏎️ Express-Nachricht verdrängt sie (sonst hätte die Start-Frage Express blockiert)
- Rundgang prüft Laufband, Umdrehen, Anordnen/Ziehen/Ausblenden, Schnellstart und einfache Ansicht

## 0.27.0 DEV – 16.10.2026
- 🏫 Abgleich mit gymnasium-bergkamen.de/bachkreis (docs/KONZEPT-UEBEBUEHNE.md Teil A): neues Modul js/app/vereinsleben.js, css/vereinsleben.css
- 📜 Tabelle `chronik` (für alle sichtbar; Demo nur mit Fakten der Schul-Website, Quelle angegeben), Repertoire aus `programm` + Chronik (`repertoire()` in logik.js, CSV), Tab „Über uns“
- 📂 Tabelle `dokumente` mit Sichtbarkeit alle/Eltern/Schüler/Verwaltung; Dateien geschützt (Server prüft beim Abruf die Sichtbarkeit)
- 🏠 `gastgeber` (Eltern nur eigenes Angebot, 1–6 Plätze, Status „bestätigt“ nur durch die Leitung) und `gaeste` (Gastfamilie sieht nur die eigenen Gäste, ohne interne Notiz); projekte.gastfamilien/gaeste_anzahl/partner_id
- 📨 Tabelle `anfragen` (Leitung, Lehrkräfte, Vorstand), Zusage → Termin (`anfrageZuTermin()`), App-Ansicht und PC-Werkzeug „Anfragen, Austausch & Repertoire“
- 🤝 Tabelle `partner`; programm.dirigent_id / eigene_komposition / urauffuehrung; Konfiguration `instagram`; Links in „Über die App“
- 🌙 Dunkelmodus-Kontraste (Chat „neu“, Bühnen-Titel, Übe-Serie) – axe: 0 Verstöße
- Migration 20261102000000_bk_abgleich.sql; Tests tests/abgleich.test.mjs; Rundgang und axe decken die neuen Ansichten ab

## 0.26.0 DEV – 16.10.2026
- 🎭🎻 Übe-Bühne (js/app/uebebuehne.js, css/uebebuehne.css): Bühnen-Modus „🎻 Üben“ (`BUEHNE_MODI` in buehne.js) mit eigenem Avatar als Solist (`orchesterSvg({ solist })`), Kachel „Übe-Bühne“ (Zahl = offene Aufgaben), Knopf in „Üben“
- 🎼 Mitspielen: Begleitung aus der Partitur (eigene Rolle ausgelassen), eigene Stimme laut/leise/aus, Takt von–bis (`stelleSt`), Tempo-Stufen, Einzählen, Schleife, Tempo steigern bis zum Zieltempo, Selbsteinschätzung ⭐
- ✋ Noten & Griffe (js/kern/griffe.js): Streicher 1. Lage, Flöte, Klarinette (inkl. Clarion), Trompete/Horn/Tuba (Ventile über Naturtöne), Posaune (Zugpositionen); Oboe/Fagott bewusst ohne Bild. Tonleitern je Instrument (js/kern/uebematerial.js)
- 🥁 Rhythmus (js/kern/rhythmus.js): Muster-Text, 7 Stufen, Mittippen per Fläche/Leertaste mit Latenz-Ausgleich, Auswertung je Note · 🎯 Stimmgerät (js/kern/stimmton.js, Autokorrelation, nur lokal) mit „Ton halten“ · 👂 Ohr-Spiele (höher/tiefer, Dur/Moll, nachklatschen)
- 📝 uebeaufgaben: art, stueck, takt_von/bis, tempo_ziel, muster, taktart, tonart, oktaven, ton, sekunden, spiel, ziel_sterne, datei, vorspiel; Formular mit Rhythmus-Baukasten; neue Tabelle `uebe_ergebnisse` (nur Zahlen, Rückmeldung nur Lehrkraft); Einwilligungs-Zweck `uebeaufnahmen`
- 🔒 Server: Ergebnisse nur für sich/eigene Kinder, Aufgabe muss sichtbar sein, Werte geprüft, Rückmeldung geschützt; Aufnahme nur mit Einwilligung (Minderjährige), Löschdatum +30 Tage vom Server, Wartung löscht Datei und Verweis; Dateizugriff für Aufgaben-PDF/Vorspiel und eigene Aufnahmen
- 📊 Fortschritt & Rückmeldung in der App (`uebefortschritt`) und am PC (Werkzeug „Übe-Bühne“, CSV) – `uebeStand()`/`uebeZielErreicht()` in logik.js
- Migration 20261101000000_bk_uebebuehne.sql; Tests tests/uebebuehne.test.mjs; Rundgang und axe-Prüfung decken alle Übe-Arten ab

## 0.25.0 DEV – 16.10.2026
- ♿ Externe Prüfwerkzeuge aus Git: axe-core (WCAG 2.1 A/AA, aus KC-Infrastructure-Control-Center) über alle Ansichten × Demo-Rollen und alle PC-Bereiche – vorher ≈ 350 Verstöße, jetzt 0 (`npm run a11y`, tests/e2e/barrierefrei.mjs)
- 🎨 Kontraste: `--gruen/--gelb/--rot` dunkler (≥ 4,5 : 1 auf den Marken-Hintergründen), SOS-Rot, Übe-Serie, „neu“ im Chat, Pinnwand „erledigt“ ohne Transparenz, Gruppenfarben als Randstreifen statt Schriftfarbe, PC-Seitenleiste feste Farben
- 🗣️ `beschriftungenVerknuepfen()` (ui.js) nach jedem Zeichnen/Blatt: verknüpft `<label>` mit dem Feld, gibt Feldern ohne Beschriftung einen Namen; Lesehaken `role="img"`, Gesichter ohne Namen `aria-hidden`, Übeaufgaben-Haken beschriftet, scrollbare Tabellen per Tastatur erreichbar
- 🩺 db_monitor aus KC-System-Check (tools/db-monitor.sql) als Test mit nachgebildeten Supabase-Rollen: RLS überall, keine ungedeckten Rechte, keine RLS-umgehenden Views/Definer – Ergebnis „healthy“
- 🧹 ESLint (Regeln wie im KICC + recommended, `npm run lint`): 0 Fehler. Behoben: PC-Formular speicherte Freitext-Listen als String (unerreichbarer Zweig), undefinierte Globale in effekte.js, toter Code in regeln.js

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
