# Konzept: Bachkreis-App – Verwaltung des Bachkreises Bergkamen

Status: **IDEE / KONZEPT** – es wird noch nichts gebaut.
Stand: 10.10.2026 · Basis-Analyse: `Sire65/KC-Clubapp` v2.220.0 RC
Arbeitstitel vorher: „Bach-Kreis-Terminplaner“ (Umfang am 10.10.2026 erweitert).

---

## 1. Ziel

Eine eigenständige PWA für die **komplette Verwaltung des Bachkreises**. Die
Terminplanung ist dabei nur ein Teil.

Die **Leitung (Bettina Jacka)** sieht im **Leitungs-Cockpit** alle laufenden
Vorgänge und ihren Stand. Dazu gehören:
- Termine, Proben und Konzerte
- Reisen und Probenfreizeiten
- Instrumentenverleih, Reparatur und Einkauf
- Genehmigungen der Eltern
- Noten
- Kommunikation mit Schülern, Eltern, Schule, Lehrkräften, Musikschule,
  Partnerorchestern, Unterstützern und Spendern

Die App läuft **autark**: Sie hat eigene, kostenlose Konten, die nicht an die
KC-Infrastruktur gebunden sind. Sie kann an den Bachkreis bzw. den Förderverein
übergeben werden (siehe Abschnitt 9).

Leitsatz: **Bewährte Muster der Club-App übernehmen, aber den Monolithen nicht
forken.** Es gelten dieselben Grundsätze wie in der Club-App:
- Zero-Cost
- DEV → RC → FINAL
- Versionsvertrag
- atomares PWA-Update
- Registry + Adapter

### 1.1 Module im Überblick

| Nr. | Modul | Kurzbeschreibung |
|---|---|---|
| M1 | Personen & Rollen | Schüler, Eltern, Lehrkräfte, Leitung, Schule, Förderverein, Unterstützer, Spender, Partner, Dienstleister, Ehemalige |
| M2 | Gruppen & Besetzung | A/B/C/D, Gruppenwechsel, mehrere Instrumente, Schuljahreswechsel |
| M3 | Termine & Proben | Terminarten, Zusage/Vielleicht/Absage, Besetzungsampel, Präsenz |
| M4 | Konzerte & Auftritte | Programm, Ablauf, Ort, Transport, Helfer, Presse |
| M5 | Reisen & Probenfreizeiten | Austausch, Fahrten, Teilnehmer, Zimmer, Kosten, Notfallkontakte |
| M6 | Genehmigungen & Einverständnisse | digitale Elternzustimmung mit Fristen und Nachweis |
| M7 | Instrumente | Inventar, Verleih, Wartung/Reparatur, Einkauf/Beschaffung |
| M8 | Notenarchiv | Werke, Stimmen, Zuordnung zu Instrumenten, Gruppen und Personen |
| M9 | Kommunikation | Zielgruppen-Verteiler, Push/Mail/WhatsApp/Brief, Vorlagen, Rückmeldungen |
| M10 | Unterstützer & Spender | Kontakte, Zuwendungen, Dank, Sponsoren |
| M11 | Vorgänge & Aufgaben | einheitlicher Status, Zuständigkeit und Frist für alles, was offen ist |
| M12 | Leitungs-Cockpit | „Was braucht heute meine Aufmerksamkeit?“ |
| M13 | Dokumente | Verträge, Satzung, Protokolle, Fotos, Vorlagen |
| M14 | Auswertungen & Berichte | Beteiligung, Inventar, Jahresbericht |
| M15 | Administration | Rechte, Konfiguration, Audit, Datenschutz, Schuljahreswechsel |

---

## 1a. Recherche: Bachkreis Bergkamen (Stand 10.10.2026, öffentliche Quellen)

- **Was ist es?** Jugendsinfonieorchester des Städtischen Gymnasiums Bergkamen
  und der Musikschule Bergkamen, gegründet 1969 (Horst Römer). Leitung: Bettina Jacka.
  Seit 2017 Partnerorchester der Neuen Philharmonie Westfalen. >900 Konzerte,
  Austausch u. a. mit dem Johannes-Althusius-Gymnasium Emden.
- **Struktur** (bestätigt die Gruppen-Idee):
  - **A-Orchester** – Jahrgänge 9–12, ca. 50 Schüler
  - **B-Orchester** – Jahrgänge 5–9, ca. 50 Schüler
  - Vorstufen: **Orchesterklasse** (Erprobungsstufe, mit Musikschule), **Streicher- und Bläser-AGs**
  - **Ehemaligenorchester** (Alumni, Kontakt per Gmail-Adresse)
  → Kandidaten für Gruppen C/D. Übergang B → A entspricht dem „generellen Gruppenwechsel“
  (Jahrgangswechsel); Aushilfe eines B-Schülers im A-Orchester = „temporärer Wechsel“.
- **Förderverein des Bachkreises Bergkamen e.V.** (gegr. 1980): finanziert
  Instrumente zum Verleih, Orchestermaterial (= Noten), Probenfreizeiten,
  Konzerte, Austausche. Beitrag 15 € Schüler / 25 € Erwachsene, SEPA-Einzug.
- **Online-Präsenz**: Unterseite der Schulwebsite (QR-Code im Förderverein-Flyer
  führt ebenfalls dorthin), Facebook-Seite, YouTube-Kanal.
- **Login**: In öffentlichen Quellen wurde **kein eigener Bachkreis-Login /
  Mitgliederbereich** gefunden. Vorhanden ist das schulweite **IServ-Portal**
  (`portal-gymnasium-bergkamen.de`); Mail-Adressen der Schule laufen darüber.
  Eine eigene Domain `bachkreis-bergkamen.de` war nicht erreichbar.

### Folgen für das Konzept
1. **Teilnehmer sind überwiegend minderjährig (10–18)** → Datenschutz verschärft:
   Elternkontakt je Kind, Einwilligung der Eltern, Benachrichtigung an Kind **und/oder**
   Eltern (wählbar), Absage auch durch Eltern, Datensparsamkeit, keine öffentlichen
   Teilnehmerlisten, Löschkonzept beim Verlassen.
2. **WhatsApp-Übergabe** nur als Option; Mindestalter von WhatsApp beachten,
   bei Jüngeren an Eltern-Nummer.
3. **Login-Optionen** (Entscheidung offen):
   a) Link-/QR-Login wie Club-App (einfach, ohne Schulabhängigkeit),
   b) Anmeldung über **IServ** (Single Sign-On, falls die Schule es freigibt –
      technisch und organisatorisch zu prüfen; Schüler haben dort bereits Konten),
   c) Kombination: IServ für Schüler/Lehrkräfte, Link-Login für Eltern, Alumni, Aushilfen.
   Login als **Adapter**, damit beides möglich bleibt (AGENTS.md Regel 18).
4. **Schuljahres-Logik**: Jahrgangsstufe je Teilnehmer, Schuljahreswechsel als
   Sammel-Gruppenwechsel (Vorschlag B → A ab Jg. 9/10, Leitung bestätigt).
   Ferienkalender NRW zur Probenplanung.
5. **Terminarten ergänzen**: Probenfreizeit (mehrtägig, mit Zimmer-/Elternerklärung),
   Austausch/Reise, Fördervereinsfest, Gottesdienst-Mitwirkung.
6. **Instrumentenverleih** des Fördervereins = Inventar-Modul (BK-F11), inkl.
   Wartung/Reparatur.
7. **Förderverein-Mitglieder** (Eltern, Ehemalige) sind eigene Personengruppe;
   Beitragsverwaltung bleibt außen vor (nicht Ziel der App).

---

## 2. Was die Club-App schon kann (und wir übernehmen)

| Bedarf Bach Kreis | Vorhanden in KC Club App | Übernahme |
|---|---|---|
| Termine mit Zusage / Vielleicht / Absage | `kc_club_treffen` + `kc_club_teilnahme` (`ja`/`nein`/`vielleicht` + Notiz), Server `treffen_*` | **Datenmodell 1:1 als Vorlage**, erweitert um Terminarten + Besetzung |
| Premiere / Konzert | `treffen.art = 'veranstaltung'` | wird zur echten **Terminart-Registry** |
| Terminfindung | `kc_club_terminumfragen*` (Doodle-artig, „festlegen“ erzeugt Termin) | übernehmen, z. B. für Zusatzproben |
| Erinnerungen / Nachfassen | Cron `wartung`: Vortags-Erinnerung, 3 Tage vorher Nachfassen bei fehlender Antwort | übernehmen, Fristen konfigurierbar |
| Kalender | „In meinen Kalender“ (Google/Outlook/.ics), **ICS-Abo-Feed** per Token | übernehmen |
| Push | Web Push (VAPID), Service-Worker-Handler | Muster übernehmen, **eigener Versand** (Club nutzt externen KC-Communicator) |
| E-Mail | über KC-Communication-Router (Brevo) | über austauschbaren Mail-Adapter |
| WhatsApp | `wa.me`-/`whatsapp://`-Übergabe, Fallback `navigator.share` → Zwischenablage | **1:1 übernehmen** (keine kostenpflichtige API) |
| Instrumente-DB | Leih-Modul (`leih_gegenstaende`, `ausleihen` mit Status angefragt → genehmigt → abgeholt → zurück) | Vorlage für **Inventar + Ausleihe von Instrumenten** |
| Teilnehmerliste je Termin | `druckTreffen` mit Zählern Zusage/Vielleicht/Absage/ohne Antwort | übernehmen, ergänzt um Besetzungsprüfung |
| Login ohne Passwort | persönlicher Link-Token + QR-Einrichtungskarte | übernehmen (einfach für ältere Mitglieder) |
| Rollen | admin / vorstand / Ämter, Guards `nurAdmin` usw. | auf Kreis-Rollen umdeuten |
| Offline / Notbetrieb | signierte Vorab-Antworten + Schreib-Eingang (auch für Zusagen) | **Phase 2**, Muster übernehmen |
| Update ohne Mischstand | `sw.js` mit `jetzt-aktivieren` → `skipWaiting`, Versionsvertrag-Test | 1:1 übernehmen |

### Bewusst NICHT übernommen
Spiele, Rezepte, Fitness, Börse, Erstattung/Kasse, Büro, Schulungen/Hausbesuche,
DP2/Twinkey-Dienstplan, Anruf/Video, Standort/SOS, Wetter, Köcheclub-Branding,
„Hansi“-Sonderlogik.

### Warum kein Fork
- `app.js` = 2,7 MB / 25.669 Zeilen, Server `kc-club/index.ts` = 11.875 Zeilen mit ~340 Aktionen.
- „Köcheclub Werne“ ~245×, „Hansi“ ~700× fest eingebaut, Supabase-Projekt-ID in 6+ Dateien.
- Hängt an externen Kernen (`kc_core_people`, KC-Communicator, Push-Tabellen), die es im Bach Kreis nicht gibt.
- Kein Mandantenfeld.

→ **Herauslösen statt Löschen:** Wir bauen ein schlankes neues Repo und
übernehmen gezielt Datenmodell, Algorithmen und UI-Muster (mit Quellverweis).

---

## 3. Fachliches Modell

### 3.1 Personen & Besetzung
- **Teilnehmer**: Name, Kontakt (Mail, Mobil für WhatsApp), Stimme/Register,
  Status (aktiv / pausiert / Gast / Aushilfe),
  Benachrichtigungswunsch je Kanal, Ruhezeit.
- **Register / Stimmgruppen** (Registry, nicht fest codiert):
  z. B. Violine I/II, Viola, Cello, Kontrabass, Flöte, Oboe, Klarinette,
  Fagott, Horn, Trompete, Posaune, Tuba, Schlagwerk, Harfe/Klavier.
  Die Leitung pflegt die Liste selbst.
- **Erziehungsberechtigte** je Schüler (1–n), mit eigenem Zugang, Kontakt und Benachrichtigungswahl.
- **Jahrgangsstufe** und Schule (auch Nachbarschulen) je Schüler.
- **Weitere Verteiler**: Solisten, Registerführer, Vorstand – für zielgerichtete Einladungen.

### 3.1a Gruppen A / B / C / D
- Gruppen-Registry, Standard **A, B, C, D** (Name, Farbe, Sortierung, Beschreibung);
  weitere Gruppen kann die Leitung ergänzen – nichts fest codiert.
- Jeder Teilnehmer hat **genau eine Stammgruppe** (Zuordnung mit „gültig ab“).
- **Gruppenwechsel**:
  - **generell** – neue Stammgruppe ab Datum X; die alte Zuordnung bleibt als
    Historie erhalten (`gueltig_bis` wird gesetzt), Auswertungen der Vergangenheit
    bleiben korrekt.
  - **temporär** – Gastzuordnung zu einer anderen Gruppe für einen **Zeitraum**,
    ein **Projekt** oder **einzelne Termine** (z. B. „Anna spielt im
    Weihnachtsoratorium in Gruppe C mit“). Läuft automatisch aus; danach gilt
    wieder die Stammgruppe.
  - Wechsel durch Leitung; optional **Wechselwunsch** durch Teilnehmer
    (Antrag → Freigabe durch Leitung), jeweils mit Protokoll (wer, wann, warum).
- **Wirksame Gruppe** zu einem Termin = temporäre Zuordnung falls vorhanden,
  sonst Stammgruppe zum Termindatum. Diese Regel steuert Einladungen,
  Besetzungsampel, Notenzuteilung und Auswertungen.
- Termine können an eine oder mehrere Gruppen gerichtet sein
  („Probe Gruppe A + B“). Bei Gruppenwechsel nach Einladung: Einladung wird
  nachgezogen bzw. entfernt, bereits gegebene Antworten bleiben erhalten und
  werden markiert.
- Ansichten: Gruppenübersicht mit Mitgliedern je Register, Drag & Drop bzw.
  Auswahl-Dialog zum Verschieben (Auswahl statt Freitext), Filter „nur temporär
  verschobene“.

### 3.1b Mehrere Instrumente je Teilnehmer
- Ein Teilnehmer kann **beliebig viele Instrumente/Stimmen** haben
  (z. B. Violine + Viola, Sopran + Blockflöte).
- Je Zuordnung: **Hauptinstrument** ja/nein, optional Niveau/Bemerkung,
  „eigenes Instrument vorhanden“ ja/nein (sonst Bedarf aus Inventar).
- **Besetzung je Termin/Projekt**: Bei Mehrfach-Instrumentalisten legt die
  Leitung (oder der Teilnehmer bei der Zusage) fest, **mit welchem Instrument**
  er bei diesem Termin spielt. Standard = Hauptinstrument.
- Besetzungsampel zählt jede Person nur **einmal** pro Termin – in dem
  Register des gewählten Instruments; als „könnte auch“ werden alternative
  Instrumente angezeigt (Hilfe zum Ausgleichen roter Register).

### 3.2 Instrumente-DB (zwei Sichten)
1. **Instrumententypen** (Katalog): Violine, Cello, Oboe d'amore, Truhenorgel …
   → verknüpft mit Registern, dient der Besetzungsplanung.
2. **Inventar** (Instrumente im Besitz des Kreises): Inventarnr., Typ,
   Zustand, Standort, Versicherung/Wert, Wartung/Stimmung fällig,
   Fotos/Dokumente, **Ausleihe** an Teilnehmer (Workflow aus Club-Leihmodul).
   Ausbaustufe: Transport-/Aufbauplanung je Termin (z. B. Truhenorgel zum Konzertort).

### 3.2a Notenarchiv
**Aufbau**
- **Werk**: Komponist, Titel, BWV/Werkverzeichnis-Nr., Besetzung, Verlag/Ausgabe,
  Dauer, Schlagworte, Rechte-/Lizenzhinweis.
- **Stimme (Part)**: gehört zu einem Werk, z. B. „Partitur“, „Klavierauszug“,
  „Violine I“, „Oboe d'amore II“, „Continuo“, „Sopran“.
  Jede Stimme ist einem oder mehreren **Instrumententypen / Registern** zugeordnet.
- **Datei**: PDF (Ansicht im Browser via pdfjs, wie in der Club-App), optional
  Audio-Übungsdatei (z. B. Stimme zum Mitsingen); Version/Ausgabe, Upload-Datum.
- **Physisches Exemplar** (optional): Notenmappen/Hefte mit Inventarnr.,
  Ausgabe an Teilnehmer und Rückgabe – gleicher Ausleih-Workflow wie Instrumente.

**Zuordnung**
- Werk → **Projekt** („Weihnachtsoratorium 2026“: Kantaten I–III) und
  optional → **einzelne Termine** („heute: Nr. 1–9“) als Probenplan.
- Stimme → **Instrument/Register** (Grundregel) und bei Bedarf
  → **Gruppe** (z. B. Gruppe A spielt Violine I, Gruppe B Violine II)
  → oder direkt → **Person** (Sonderzuteilung, z. B. Solostimme).

**Wer sieht was** (automatisch, Auswahl statt Suche)
- Teilnehmer sieht unter „Meine Noten“ genau die Stimmen, die zu
  *seinen Instrumenten* × *seiner wirksamen Gruppe* × *seinen Projekten/Terminen*
  passen. Mehrfach-Instrumentalisten sehen alle passenden Stimmen, die für den
  Termin gewählte zuerst.
- Bei temporärem Gruppenwechsel wechseln die angezeigten Stimmen mit.
- Leitung/Notenwart sieht das gesamte Archiv inkl. Partituren.
- Hinweis in der Termin-Einladung: „Bitte mitbringen: Stimme Violine II, Nr. 1–9“.

**Rechte & Kosten**
- Nur Nutzer mit Login (Link-Token) erhalten Zugriff; Download über kurzlebige,
  signierte URLs; kein öffentlicher Ordner (anders als `dokumente/` der Club-App).
- Urheberrecht: Archiv kennzeichnet je Datei „gemeinfrei / lizenziert /
  nur intern“; Lizenzen werden nicht von der App geprüft – Verantwortung beim Kreis.
- **Speicher-Engpass**: Supabase Free Storage = 1 GB. Noten-PDFs schnell
  50–100 MB pro Werk → Speicher über austauschbaren Storage-Adapter
  (Supabase Storage, Cloudflare R2 Free 10 GB, ggf. vorhandenes B2-Backup aus
  KICC) – Zero-Cost-Check nötig.

### 3.3 Terminarten (Registry)
| Art | Typische Eigenschaften |
|---|---|
| Übungsprobe (regulär) | Serien-/Wiederholtermin (z. B. jeden Di 19:30), Zielgruppe Chor/Orchester/Register |
| Registerprobe | nur bestimmte Register eingeladen |
| Generalprobe | Pflichttermin, an Konzert gekoppelt |
| Premiere / Konzert | Treffpunkt, Einsingzeit, Kleiderordnung, Programm, Besetzungssoll |
| Orchestertermin | Orchesterprobe/Dienst, ggf. Aushilfen/Externe |
| Sonstiges | Vorstandssitzung, Ausflug … |

Termine können zu einem **Projekt** gehören (z. B. „Weihnachtsoratorium 2026“):
Projekt = Proben + Generalprobe + Aufführung(en) + Besetzungssoll + Noten.

### 3.4 Antworten
- `zusage` / `vielleicht` / `absage` / *keine Antwort* (wird **nie** als Zusage gezählt).
- Optional: Notiz („komme 20 min später“), Begründung bei Absage.
- **Antwortfrist** je Termin; danach Nachfassen, nach Frist Antwort nur noch durch Leitung.
- **Serien-Antwort**: „Ich kann alle Dienstage im November nicht“ (Abwesenheitszeitraum) → setzt Absagen automatisch, Einzeltermine bleiben änderbar.
- **Tatsächliche Anwesenheit** (Präsenzliste) getrennt von der Zusage – Grundlage für echte Auswertungen.

### 3.5 Besetzungsampel (neu, Kernnutzen)
Je Termin Soll-Besetzung pro Register (z. B. Sopran ≥ 4, Cello ≥ 2).
Anzeige pro Register: Zusagen / Vielleicht / Soll →
**grün** (erfüllt) · **gelb** (nur mit Vielleicht erfüllt) · **rot** (unterbesetzt) · **grau** (zu wenige Antworten = UNBEKANNT, nie grün).
Rot → Aktion „Aushilfe anfragen“ bzw. gezielte Nachricht an das Register.

---

### 3.6 Rollen & Rechte (M1/M15)

| Rolle | Sieht / darf |
|---|---|
| **Leitung** | alles, inkl. Cockpit, Freigaben und Kommunikation an alle |
| Stellvertretung / Lehrkraft | wie Leitung, ohne Systemverwaltung |
| Förderverein-Vorstand | Einkauf, Reparatur und Spender freigeben; Inventar lesen; Kommunikation an Mitglieder und Spender |
| Instrumentenwart | Inventar, Verleih, Wartung |
| Notenwart | Notenarchiv |
| Registerführer (Schüler) | eigenes Register: Antworten sehen, Erinnerungen auslösen |
| Schüler | eigene Termine, Noten, Leihinstrumente, Nachrichten |
| Eltern / Erziehungsberechtigte | **nur eigene Kinder**: Zusagen, Genehmigungen, Leihverträge, Nachrichten |
| Externe (Schule, Musikschule, Partner, Dienstleister, Spender) | **kein** App-Zugang nötig; Kommunikation per Mail und Link, nur bei Bedarf Lese-Link auf einzelne Vorgänge |

Rechte werden fein je Funktion vergeben, nach dem Muster `funktion_freigabe` der
Club-App. Jede Änderung wird im Audit-Log festgehalten.

### 3.7 Konzerte & Auftritte (M4)
- Ein Konzert ist ein **Projekt** mit Generalprobe, Aufführung(en) und Nachbereitung.
- Programmfolge mit Werken aus dem Notenarchiv, Dauer und Solisten.
- Ablaufplan: Treffpunkt, Einspielen, Pause, Ende.
- Ort mit Ansprechpartner, Bühne, Technik und Stühlen.
- Transportliste: Pauken, Kontrabässe, Notenständer; dazu Fahrer und Helfer (Eltern).
- Kleiderordnung, Eintritt (nur als Info, kein Kartenverkauf), Pressetext und
  Plakat als Dokument.
- Checkliste je Konzert, abgeleitet aus einer Vorlage. Offene Punkte erscheinen im Cockpit.

### 3.8 Reisen, Austausch & Probenfreizeiten (M5)
- Mehrtägige Termine mit Anmeldung und Teilnehmerliste.
- Zimmer-, Bus- und Gastfamilienzuteilung (Austausch Emden u. a.).
- **Pflicht-Einverständnisse** (M6): Reise, Foto, Gesundheitsangaben.
- **Notfallkontakte** und Gesundheitsinfos (Allergien, Medikamente):
  - besonders geschützt
  - nur für Leitung und Begleitpersonen sichtbar
  - werden nach der Reise automatisch gelöscht
- Kosten je Teilnehmer, nur Status „bezahlt ja/nein“. Die Buchhaltung bleibt beim Förderverein.
- Packliste und Infobrief an die Eltern (M9).

### 3.9 Genehmigungen & Einverständnisse (M6)
- **Vorlagen-Registry**:
  - Teilnahme am Bachkreis
  - Datenschutz
  - Foto/Video-Veröffentlichung (einzeln: Website, Presse, Social Media)
  - Reise/Probenfreizeit
  - Instrumenten-Leihvertrag
  - Medikamentengabe
  - Heimweg allein
- **Ablauf**: Die Leitung wählt Vorlage und Empfänger (Gruppe, Reise, einzelne Kinder).
  Die Eltern erhalten einen Link und stimmen in der App zu oder lehnen ab.
  - Nachweis: Name, Zeitpunkt, Version des Textes
  - optional Unterschrift per Finger
  - **Erinnerungen bis zur Frist**
- **Status je Kind**: ausstehend / erteilt / abgelehnt / abgelaufen / widerrufen.
  - „Ausstehend“ wird **nie** als erteilt gezählt.
  - Ein Widerruf ist jederzeit möglich.
- **Papier-Fallback**: Druck als PDF. Die Leitung trägt den Eingang manuell ein
  und lädt optional einen Scan hoch.
- **Wirkung**: Fehlt die Reisegenehmigung, wird das Kind im Cockpit und auf der
  Teilnehmerliste rot markiert. Fehlt die Foto-Erlaubnis, bekommt die Galerie einen Hinweis.

### 3.10 Instrumente: Verleih, Reparatur, Einkauf (M7)
Ergänzt Abschnitt 3.2 (Inventar).
- **Verleih**:
  - Leihvertrag (M6) mit Elternzustimmung, Ausgabe- und Rückgabe-Protokoll mit
    Zustand und Fotos
  - Leihfrist und Verlängerung, Erinnerung vor Ablauf
  - Schadensmeldung durch Schüler oder Eltern
- **Wartung & Reparatur**: Ein Reparaturauftrag läuft so ab:
  1. Meldung (Schaden, Foto)
  2. Prüfung
  3. Kostenvoranschlag der Werkstatt (Dienstleister aus M1)
  4. **Freigabe** durch den Förderverein bzw. die Leitung, je nach Betragsgrenze
  5. in Reparatur
  6. zurück
  7. abgeschlossen

  Kosten werden je Instrument dokumentiert. Wiederkehrende Wartung (z. B. neue
  Saiten, Bogen behaaren) erscheint als Fälligkeit im Cockpit.
- **Einkauf / Beschaffung**: Ein Einkauf läuft so ab:
  1. Bedarf (Instrument, Zubehör, Noten)
  2. Angebote einholen und vergleichen
  3. **Freigabe** nach Betragsgrenze
  4. Bestellung
  5. Lieferung
  6. **Inventarisierung** (das Inventarobjekt wird automatisch angelegt)
  7. Rechnung als Dokument

  Finanzierung über Förderverein, Schuletat oder Spende, mit Verknüpfung zu M10.
- **Inventur**: Zählliste per Handy, mit QR-Etikett je Instrument (QR-Erzeugung
  gibt es bereits in der Club-App).

### 3.11 Kommunikation (M9)
- **Zielgruppen-Verteiler** werden automatisch aus den Daten gebildet, ohne Pflege
  von Hand. Beispiele: „Eltern B-Orchester“, „alle Celli“, „Teilnehmer Reise Emden“,
  „Spender 2026“, „Lehrkräfte“, „Förderverein-Vorstand“.
- **Kanäle**: Push, E-Mail, WhatsApp-Übergabe, PDF-Brief zum Drucken. Je
  Empfänger gilt der Kanal, den er bevorzugt; Externe erreicht die App nur per E-Mail.
- **Nachrichtentypen**:
  - Info
  - Rundschreiben / Elternbrief **mit Rückmeldung** (z. B. „gelesen“ oder
    „komme / komme nicht“, wie bei einem Termin)
  - Erinnerung
  - Dank
  - Einladung
- **Vorlagen** mit Platzhaltern (Name, Kind, Termin) und Serienversand.
- **Gesprächsverläufe** in der App (Leitung ↔ Eltern/Schüler) mit Lesebestätigung.
  Vorlage ist der Communicator der Club-App.
- **Versandprotokoll**: Wer hat was wann über welchen Kanal erhalten oder gelesen?
  Ein Fehlversand ist sichtbar.
- **Schutzregeln**: keine Direktnachrichten zwischen Erwachsenen und einzelnen
  Minderjährigen ohne Leitung/Eltern in Kopie (Kinderschutzkonzept der Schule beachten).

### 3.12 Unterstützer & Spender (M10)
- Kontakte von Personen, Firmen und Stiftungen mit Ansprechpartner,
  Einwilligung zur Kontaktaufnahme und Interessen.
- Zuwendungen: Datum, Betrag bzw. Sachspende, Zweck (z. B. „Cello-Kauf“),
  verknüpft mit Einkauf und Inventar („gespendet von …“).
- Dankschreiben aus Vorlage. Die **Zuwendungsbestätigung** stellt der
  Förderverein aus; die App liefert nur die Liste.
- Unterstützer-Rundbrief: Konzerteinladungen, Jahresbericht.
- **Abgrenzung**: keine Buchhaltung, keine Mitgliedsbeiträge und keine
  SEPA-Einzüge. Das bleibt beim Förderverein, ggf. als späterer Adapter.

### 3.13 Vorgänge & Aufgaben (M11)
Alles, was offen sein kann, ist ein **Vorgang** mit einheitlichen Feldern:
- Typ, Status, Verantwortlicher, Frist, Bezug (Kind, Instrument, Termin, Konzert …)
- Verlauf und Kommentare

Beispiele für Vorgänge: Genehmigung, Reparatur, Einkauf, Leihrückgabe,
Konzert-Checkpunkt, Antwort auf eine Elternnachricht, Gruppenwechselwunsch.
Statusmodelle sind konfigurierbar (Registry). Aufgaben lassen sich delegieren,
z. B. an Instrumentenwart oder Förderverein.

### 3.14 Leitungs-Cockpit (M12)
Startseite der Leitung, sortiert nach Dringlichkeit:
1. **Heute / diese Woche**: Termine mit Besetzungsampel, Konzerte mit offenen Checkpunkten.
2. **Wartet auf mich**: Freigaben (Einkauf, Reparatur), Gruppenwechselwünsche, unbeantwortete Nachrichten.
3. **Wartet auf andere**:
   - fehlende Elterngenehmigungen je Termin/Reise
   - fällige Leihrückgaben
   - Reparaturen in der Werkstatt
   - offene Bestellungen
4. **Fällig bald**: Wartungen, Fristen, auslaufende temporäre Gruppenwechsel, Schuljahreswechsel.
5. **Kennzahlen**: Beteiligung, Antwortquote, verliehene Instrumente.
   - Jede Zahl trägt einen „Stand“.
   - Was unbekannt ist, wird als UNBEKANNT gezeigt (AGENTS.md Regel 11).

Jeder Eintrag lässt sich per Klick öffnen und direkt erledigen (freigeben,
erinnern, nachfassen). Die Kacheln lassen sich je Rolle anpassen; der
Förderverein-Vorstand sieht z. B. ein eigenes, kleineres Cockpit.

---

## 4. Funktionen (mit vorläufigen Feature-IDs)

| ID | Funktion | Quelle | Phase |
|---|---|---|---|
| BK-F01 | Teilnehmerverwaltung + Register/Gruppen-Registry | Club Mitglieder (neu modelliert) | 1 |
| BK-F02 | Link-/QR-Login, Rollen (Leitung, Registerführer, Mitglied, Gast) | Club `link_erzeugen`, `ichAus` | 1 |
| BK-F03 | Terminarten-Registry, Einzel- & Serientermine, Projekte | `treffen` + neu | 1 |
| BK-F04 | Zusage / Vielleicht / Absage mit Notiz, Frist, Serien-Abwesenheit | `teilnahme` + neu | 1 |
| BK-F05 | Terminplan: Liste, Monat, „Meine Termine“, Filter nach Art/Projekt/Register | Club Kalender | 1 |
| BK-F06 | Besetzungsampel je Termin | neu | 1 |
| BK-F07 | Push-Benachrichtigung (neuer Termin, Änderung, Absage, Erinnerung, Nachfassen) | Club `sw.js` + VAPID | 1 |
| BK-F08 | E-Mail (Einladung mit .ics, Erinnerung) über Mail-Adapter | Club Router-Muster | 1 |
| BK-F09 | WhatsApp-Übergabe (Einzeln, Register, Gruppe; Textvorlagen) | Club `waSenden` | 1 |
| BK-F10 | ICS-Abo-Feed + „In meinen Kalender“ | Club `kalender_abo` | 1 |
| BK-F11 | Instrumente: Katalog + Inventar + Ausleihe | Club Leihmodul | 2 |
| BK-F12 | Präsenzliste (tatsächliche Anwesenheit) | neu | 2 |
| BK-F13 | Auswertungen + Export CSV/PDF | Club `druckTreffen` + neu | 2 |
| BK-F14 | Terminfindung (Doodle) für Zusatzproben | Club `terminumfragen` | 2 |
| BK-F15 | Mitfahrgelegenheiten zu Proben/Konzerten | Club `mitfahrt` | 3 |
| BK-F16 | Notenarchiv: Werke, Stimmen, Dateien, Zuordnung zu Instrument/Gruppe/Person/Projekt/Termin, „Meine Noten“ | Club Archiv + pdfjs + neu | **2** |
| BK-F17 | Offline-/Notbetrieb (signierte Vorab-Antworten, Schreib-Eingang) | Club Notbetrieb | 3 |
| BK-F18 | Mandantenfähigkeit (`kreis_id`) für weitere Chöre/Ensembles | neu | optional |
| BK-F19 | Gruppen A/B/C/D (Registry), Stammgruppe, Gruppenwechsel generell (mit Historie) und temporär (Zeitraum/Projekt/Termin), Wechselwunsch + Protokoll | neu | **1** |
| BK-F20 | Mehrere Instrumente je Teilnehmer (Haupt/Neben), Instrumentwahl je Termin/Projekt | neu | **1** |
| BK-F21 | Notenexemplare (Papier) ausgeben/zurücknehmen | Club Leihmodul | 3 |
| BK-F22 | Erweitertes Personen- und Rollenmodell (Eltern–Kind-Verknüpfung, Lehrkräfte, Schule, Förderverein, Unterstützer, Spender, Partner, Dienstleister, Ehemalige), feine Rechte | Club Rollen + neu | **1** |
| BK-F23 | Leitungs-Cockpit (je Rolle anpassbar) | neu | **1** (v1), 2 (voll) |
| BK-F24 | Vorgänge & Aufgaben (einheitliches Status-/Frist-Modell) | Club Protokoll-Aufgaben + neu | **1** |
| BK-F25 | Kommunikation: automatische Zielgruppen-Verteiler, Vorlagen, Rundschreiben mit Rückmeldung, Gesprächsverläufe, Versandprotokoll | Club Communicator-Muster + neu | **1** (Basis), 2 |
| BK-F26 | Genehmigungen & Einverständnisse der Eltern (Vorlagen, Fristen, Nachweis, Widerruf, Papier-Fallback) | neu | **2** |
| BK-F27 | Konzerte & Auftritte (Programm, Ablauf, Transport, Helfer, Checklisten) | neu | 2 |
| BK-F28 | Reisen, Austausch & Probenfreizeiten (Anmeldung, Zuteilung, Notfallinfos mit Auto-Löschung) | neu | 3 |
| BK-F29 | Reparatur & Wartung (Auftrag, Kostenvoranschlag, Freigabe, Kosten je Instrument) | neu | 2 |
| BK-F30 | Einkauf / Beschaffung (Bedarf → Angebot → Freigabe → Bestellung → Inventarisierung) | neu | 3 |
| BK-F31 | Unterstützer & Spender (Kontakte, Zuwendungen, Dank, Liste für Zuwendungsbestätigung) | neu | 3 |
| BK-F32 | Inventur per QR-Etikett | Club QR | 3 |
| BK-F33 | Schuljahreswechsel (Jahrgang +1, Vorschläge B → A, Abgänger → Ehemalige, Datenlöschung) | neu | 2 |
| BK-F34 | Datenschutz-Werkzeuge (Auskunft, Löschung, Aufbewahrungsfristen, Audit-Log) | neu | **1** |

---

## 5. Auswertungen

- **Je Termin**: Zusagen/Vielleicht/Absagen/offen, je Register, Besetzungsampel, Druckliste.
- **Je Person**: Antwortquote, Zusagequote, tatsächliche Anwesenheit (aus Präsenzliste), Pünktlichkeit der Antwort.
- **Je Register**: durchschnittliche Besetzung, „Problemtermine“.
- **Je Projekt**: Probenbeteiligung bis zur Aufführung, wer hat < X % der Proben besucht (Hinweis an Leitung, keine Automatik).
- **Zeitverlauf**: Beteiligung pro Monat/Saison.
- **Export**: CSV (fehlt in der Club-App heute) und PDF über Druckansicht.
- Datenschutz: Personenbezogene Quoten nur für Leitung sichtbar; Mitglieder sehen nur eigene Werte.
- Alle Kennzahlen mit Zeitstempel „Stand“; fehlende Daten werden als UNBEKANNT gezeigt, nie als 0 % oder OK.

---

## 6. Benachrichtigungen

Ein **Benachrichtigungs-Dienst** mit austauschbaren Kanal-Adaptern:

| Kanal | Adapter | Kosten |
|---|---|---|
| Push | Web Push (VAPID) direkt aus Edge Function | 0 € |
| E-Mail | SMTP-/Free-Tier-Adapter (z. B. Brevo-Free oder vorhandenes Postfach) | 0 € im Freikontingent – Limit prüfen |
| WhatsApp | **nur Übergabe** (`wa.me`, Share-API, Zwischenablage) – Mensch drückt „Senden“ | 0 € |
| Kalender | ICS-Anhang + Abo-Feed | 0 € |

Ereignisse: Termin neu · geändert · abgesagt · Erinnerung (Vortag / X Std.) ·
Nachfassen (keine Antwort bis Frist − 3 Tage) · Besetzung rot · Ausleihe fällig.
Je Person wählbar, welcher Kanal für welches Ereignis; Ruhezeit („nicht stören“).

WhatsApp-Business-API wird **nicht** genutzt (kostenpflichtig) – Zero-Cost-Gate.

---

## 7. Technische Architektur (Vorschlag)

- **Frontend**: Vanilla-JS-PWA wie die Club-App (kein Build, läuft auf alten
  Handys), aber **modular** (ES-Module pro Bereich statt eines 2,7-MB-Monolithen).
- **Backend**: Supabase Free (Postgres, Edge Functions, pg_cron, Storage),
  **Region EU (Frankfurt)**.
  Zugriff wie in der Club-App ausschließlich über eine Edge Function,
  **zusätzlich** echte RLS-Policies als zweite Verteidigungslinie.
- **Hosting**: GitHub Pages oder Cloudflare Pages (Free).
- **Konfiguration statt Hartcodierung**: Name, Farben, Logo, Texte, Register,
  Terminarten, Fristen in Konfigurationstabelle; Projekt-URL nur an einer Stelle.
- **Adapter**: Mail, Push, Kalender jeweils hinter Interface (AGENTS.md Regel 4/18).
- **Übernommen 1:1**: `sw.js`-Update-Mechanik, Versionsvertrag (`version.json`
  + Test), Test „jede Client-Aktion existiert im Server“, Test „keine Secrets im Browser“.
- **KICC-Anbindung (optional)**: Die Bachkreis-App läuft autark auf eigenen
  Konten (Abschnitt 9). KICC kann sie über einen schreibgeschützten Heartbeat
  (Version und Status) beobachten. Personendaten fließen **nicht** zu KICC, und
  KICC ist keine Betriebsvoraussetzung (Regel 12).

### Datenmodell-Skizze (Präfix `bk_`)
```
bk_person(id, name, mail, mobil, status, ruhezeit, login_token_hash, …)
bk_register(id, name, gruppe, sort)                     -- Registry
bk_gruppe(id, kuerzel, name, farbe, sort, aktiv)          -- Registry: A, B, C, D …
bk_gruppe_zuordnung(id, person_id, gruppe_id, art,        -- art: 'stamm' | 'temporaer'
          gueltig_von, gueltig_bis, projekt_id, termin_id, grund, erstellt_von)
bk_gruppe_wechselwunsch(id, person_id, ziel_gruppe_id, art, von, bis, status)
bk_instrument_typ(id, name, register_id)
bk_person_instrument(person_id, instrument_typ_id, haupt bool, niveau,
          eigenes_instrument bool, bemerkung)              -- n Instrumente je Person
bk_termin_besetzung(termin_id, person_id, instrument_typ_id)  -- „spielt heute mit …“
bk_werk(id, komponist, titel, werkverzeichnis, verlag, besetzung, rechte, …)
bk_stimme(id, werk_id, bezeichnung, sort)
bk_stimme_zuordnung(stimme_id, instrument_typ_id|register_id, gruppe_id NULL)
bk_stimme_person(stimme_id, person_id, projekt_id)         -- Sonderzuteilung
bk_notendatei(id, stimme_id, speicher_adapter, pfad, art, version, groesse, rechte)
bk_projekt_werk(projekt_id, werk_id, sort)
bk_termin_werk(termin_id, werk_id, abschnitt)              -- Probenplan „Nr. 1–9“
bk_notenexemplar(id, stimme_id, inventar_nr, zustand)     -- Phase 3
bk_instrument(id, inventar_nr, typ_id, zustand, standort, wert, wartung_faellig, …)
bk_ausleihe(id, instrument_id, person_id, von, bis, status)
bk_terminart(id, schluessel, name, farbe, pflicht bool)  -- Registry
bk_projekt(id, titel, von, bis, beschreibung)
bk_serie(id, regel, terminart_id, zielgruppe)
bk_termin(id, terminart_id, projekt_id, serie_id, titel, beginn, ende, ort,
          treffpunkt, antwort_frist, status, …)
bk_termin_einladung(termin_id, gruppe_id|register_id|person_id)
bk_termin_soll(termin_id, register_id, anzahl)
bk_antwort(termin_id, person_id, antwort, notiz, geaendert_am)
bk_abwesenheit(person_id, von, bis, grund)
bk_anwesenheit(termin_id, person_id, anwesend, erfasst_von)
bk_benachrichtigung_wahl(person_id, ereignis, kanal)
bk_versand_protokoll(id, ereignis, kanal, person_id, status, zeit)
bk_push_abo(person_id, endpoint, keys)
bk_kalender_abo(person_id, token_hash)
bk_konfig(schluessel, wert jsonb)
```

---

## 8. Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 | Konten anlegen (Abschnitt 9), Datenschutz mit Schule klären, Repo, Zero-Cost-Check, Grundgerüst aus Club-Mustern (sw.js, Versionsvertrag, Tests) | lauffähige leere PWA, DEV |
| 1 | **Fundament & Alltag**: Personen/Rollen/Eltern (F01, F02, F22, F34), Gruppen & Instrumente je Person (F19, F20), Termine & Antworten & Besetzungsampel (F03–F06, F10), Kommunikation Basis (F07–F09, F25), Vorgänge (F24), Cockpit v1 (F23) | **nutzbarer Kern**, RC mit Leitung + Testgruppe |
| 2 | **Verwaltung**: Genehmigungen (F26), Instrumente-Inventar & Verleih (F11), Reparatur (F29), Notenarchiv (F16), Konzerte (F27), Präsenz & Auswertungen (F12, F13), Terminfindung (F14), Schuljahreswechsel (F33), Cockpit voll | **FINAL 1.0** |
| 3 | **Ausbau**: Einkauf (F30), Spender (F31), Reisen (F28), Inventur QR (F32), Mitfahrten (F15), Papier-Noten (F21), Notbetrieb (F17) | 1.x |
| 4 | Optional: IServ-Anmeldung, Mandantenfähigkeit (F18) | 2.x |

Jede Phase durchläuft Regression, Visual-TÜV, Security und Release-TÜV (AGENTS.md Regel 9).

---

## 9. Autarker Betrieb: eigene kostenlose Konten

Ziel ist eine App, die **unabhängig von den KC-Konten** läuft und sich bei Bedarf
**komplett an den Bachkreis bzw. Förderverein übergeben** lässt.

### 9.00 Entscheidung (15.10.2026)
- Nach Rücksprache mit Bettina Jacka wird die App **gebaut**.
- Der **Bachkreis legt eigene Projekte** bei Supabase und Neon an, bei Bedarf
  auch bei GitHub und Cloudflare. Plan B (Testdaten im KC-Projekt) entfällt.
- Bis dahin gibt es eine **Vorführversion** (siehe 9.6).

### 9.0 Eigenes Supabase-Projekt – lohnt sich der Aufwand?
Ist-Stand am 10.10.2026 (Abfrage über Supabase-MCP):
- Org „ha-joko@web.de's Org“ mit **2 aktiven Projekten** (KC-Projekt, Future Academy).
  Beide Free-Plätze sind also belegt.
- KC-Projekt: 123 MB DB, 276 Tabellen, rund 90 Edge Functions, davon etwa 30 für
  den KC Communicator (31 `kc_communication_*`-Tabellen).

| | A) Tabellen im KC-Projekt | B) Eigenes Projekt in eigenem Konto (**Empfehlung**) |
|---|---|---|
| Einrichtung | sofort | ca. 1–2 Std. einmalig, weitgehend automatisierbar |
| Communicator | per API mitnutzen | **derselbe Code** zusätzlich deployt (kein Neubau) |
| Daten Minderjähriger | liegen zwischen Club-, Kassen- und DP-Daten | sauber getrennt |
| Fehler / Ausfall | trifft KC **und** Bachkreis | getrennt |
| Limits (500 MB, Function-Anzahl) | geteilt, KC wächst bereits | eigenes Kontingent |
| Übergabe an den Förderverein | praktisch unmöglich | Konto übergeben, fertig |
| Datenschutzvertrag (AVV) | Förderverein müsste mit Privat-Infrastruktur arbeiten | Förderverein bzw. Bachkreis-Konto ist Vertragspartner |
| Späterer Umzug | teuer, mit Live-Daten – genau das Problem der Club-App | entfällt |

**Warum B weniger Aufwand bedeutet als befürchtet:**
- Die Bachkreis-Tabellen und -Funktionen sind ohnehin neu; sie entstehen in A und B gleich.
- Den **Communicator bauen wir nicht neu**. Sein Code wird zu einem portablen
  Kern (eine Quelle, Konfiguration je Projekt) und in beide Projekte deployt.
  Nach AGENTS.md Regel 3 ist das kein Parallel-Core. Der Bachkreis braucht
  davon nur Versand (Push/Mail), Vorlagen, Empfänger und Quittungen; Test- und
  Einmal-Funktionen entfallen.
- Für die Schlüssel und Geheimnisse gilt:
  - VAPID-Schlüssel erzeugt ein Skript in Sekunden.
  - Service-Role und Anon-Key liefert Supabase automatisch.
  - Dazu kommen ein Brevo-Key und ein Cron-Secret.
  - Gesetzt werden sie einmalig per GitHub Action, nach dem Muster
    `db-einspielen` der Club-App.
- Migrationen und Deploy laufen von Anfang an per CI. Ein neues Projekt ist
  damit reproduzierbar; auch eine Wiederherstellung nach einem Totalausfall
  funktioniert so.

**Plan B (nur falls kein neues Konto gewünscht)**: In der Entwicklung nur
Testdaten in einem eigenen Schema `bachkreis` im KC-Projekt halten. Echte Daten
von Kindern dürfen erst ins eigene Projekt. Der Umzug muss vor dem ersten
Echtbetrieb erfolgen.

### 9.1 Grundsatz Eigentum
- Alle Konten laufen auf **eine neue, neutrale Funktionsadresse**
  (z. B. eine eigene Mailadresse „Bachkreis-App“), **nicht auf eine Privatadresse**.
- Rechtlich sinnvollster Inhaber ist der **Förderverein des Bachkreises
  Bergkamen e.V.**: Er ist Verein, besitzt die Instrumente und kann Verträge
  (Auftragsverarbeitung) schließen. Vor dem Anlegen mit dem Vorstand klären.
- Mindestens **zwei Administratoren** je Dienst (Entwickler + Leitung oder
  Vorstand), damit niemand zum Single Point of Failure wird.
- **2-Faktor-Anmeldung** überall. Zugangsdaten liegen in einem Passwort-Tresor
  (z. B. Bitwarden Free), nie im Repository (Regel 15).
- Ein eigenes Konto für eine **eigene Organisation** ist durch die
  Nutzungsbedingungen gedeckt. Nicht erlaubt sind mehrere Konten nur zum
  Umgehen von Free-Limits.

### 9.2 Konten und Free-Limits
Die Limits sind ein Stand aus dem Gedächtnis und **beim Anlegen zu prüfen**
(Zero-Cost-Gate).

| Dienst | Zweck | Free-Rahmen (ca.) | Hinweis |
|---|---|---|---|
| **E-Mail-Postfach** (z. B. web.de/GMX/Gmail) | Inhaber-Adresse aller Konten, Absender | kostenlos | zuerst anlegen |
| **GitHub** (eigene Organisation) | Code, CI (Actions), Issues | Free-Org, Actions-Minuten für öffentliche Repos frei | Repo **privat** oder öffentlich ohne Daten; Secrets nur in GitHub Secrets |
| **Supabase** | Datenbank, Edge Functions, Cron, Storage | 2 Projekte, ca. 500 MB DB, 1 GB Storage | **pausiert nach ca. 7 Tagen ohne Zugriff** → Keep-alive per Cron/Action; Region Frankfurt |
| **Neon** | Spiegel-/Backup-Datenbank | ca. 0,5 GB je Projekt | Muster „Spiegel nach Neon“ aus der Club-App |
| **Cloudflare** | Hosting (Pages), Notbetrieb-Worker, **R2** für Noten-PDFs und Fotos | Pages frei, R2 ca. 10 GB | keine Egress-Kosten; Domain `*.pages.dev` kostenlos |
| **Backblaze B2** | verschlüsselte Offsite-Backups | ca. 10 GB | Muster aus KICC (`OBJECT-STORAGE-BACKUP.md`) |
| **Brevo** | E-Mail-Versand | ca. 300 Mails/Tag | reicht für ca. 100 Schüler + Eltern; Massenmails über den Tag verteilen; mit eigener Domain bessere Zustellbarkeit |
| (Web Push) | Push-Nachrichten | kostenlos (VAPID) | kein Konto nötig |
| (Domain, optional) | z. B. `bachkreis-app.de` | **kostet ca. 1 €/Monat** → nicht Zero-Cost | nur wenn der Förderverein sie bezahlt; sonst `pages.dev` |

### 9.3 Datenschutz-Pflichten (vor Echtbetrieb)
- **Auftragsverarbeitungsverträge (AVV)** mit Supabase, Cloudflare, Brevo,
  Backblaze und Neon abschließen. Bei den Free-Tarifen geht das meist online.
- **Datenschutzbeauftragten der Schule** und die Schulleitung einbeziehen.
  Es geht um Daten Minderjähriger; zu klären ist auch, ob Schule oder
  Förderverein Verantwortlicher ist.
- Verzeichnis der Verarbeitungstätigkeiten, Datenschutzhinweise für Eltern,
  Löschkonzept (Abgänger, Reisedaten, Gesundheitsangaben).
- Möglichst **EU-Regionen** wählen (Supabase Frankfurt, Neon EU, B2 EU-Central).

### 9.4 Reihenfolge Konten-Einrichtung (Checkliste, später)
1. Funktions-Mailadresse anlegen, Passwort-Tresor einrichten, zweiten Admin festlegen.
2. GitHub-Organisation anlegen und Repo `bachkreis-app` erstellen.
3. Supabase-Organisation anlegen, Projekt in EU (Frankfurt) erstellen, Keep-alive einplanen.
4. Cloudflare-Konto anlegen: Pages-Projekt aus GitHub, R2-Bucket.
5. Brevo-Konto anlegen, Absender verifizieren.
6. Neon und B2 für Spiegel und Backup anlegen.
7. Jedes Konto mit Limits, Inhaber und 2FA-Status in eine **Konten-Registry**
   (Dokument im Repo, ohne Passwörter) eintragen. KICC kann diese Registry
   später optional überwachen.

### 9.5 Kurzübersicht: was wann gebraucht wird

Grundregel: **Nur anlegen, was die aktuelle Phase wirklich braucht.**
Jedes Konto gibt genau einen Schlüssel an GitHub ab; alles Weitere legt die
CI automatisch an, nichts wird von Hand in Dashboards zusammengeklickt.

| Wann | Dienst | Von Hand (Hansi) | Ergebnis → GitHub Secret | Automatisch per CI |
|---|---|---|---|---|
| Start | Mailadresse | anlegen, 2FA | – | – |
| Start | Passwort-Tresor | anlegen, 2. Admin einladen | – | – |
| Start | GitHub | Organisation + Repo | – | Pages-Hosting, Tests |
| Start | Supabase | Konto, Projekt (Frankfurt), Access Token erzeugen | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, DB-Passwort | Tabellen, Functions, Cron, Secrets, VAPID |
| Start | Brevo | Konto, Absender bestätigen, API-Key | `BREVO_API_KEY` | – |
| Phase 2 | Cloudflare | Konto, **ein** API-Token (R2 + Pages) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | R2-Bucket, ggf. Pages |
| Phase 2 | Neon | Konto, API-Key | `NEON_API_KEY` | Projekt, Spiegel-Job |
| Phase 2 | Backblaze B2 | Konto, Application Key | `B2_KEY_ID`, `B2_APP_KEY` | Bucket, Backup-Job |
| Phase 3 | Cloudflare Worker/KV (Notbetrieb) | – | (Token von oben) | Worker, KV, Signaturschlüssel |

Nicht nötig: eigene Domain, DNS-Einträge, Cloudflare-Dashboard-Konfiguration,
WhatsApp-API.

### 9.6 Vorführversion bis zu den eigenen Projekten
- **Ohne Server**: Die PWA läuft komplett im Browser mit fiktiven Demodaten.
  - Die Daten liegen in IndexedDB; ein Knopf „Demo zurücksetzen“ stellt den Anfangsstand wieder her.
  - Es gibt keine Konten, keine Schlüssel und keine echten Personendaten.
- **Gleicher Code wie später**: Die App spricht nur mit einer Datenschnittstelle
  (Adapter). Für die Vorführung gibt es den Adapter `lokal-demo`, für den
  Echtbetrieb den Adapter `supabase`. Es wird nichts weggeworfen.
- **Rollenwechsel** über einen Umschalter „Ansicht als Leitung / Eltern /
  Schüler / Förderverein“. So lässt sich alles an einem Gerät vorführen.
- **Benachrichtigungen**:
  - Push und Mail werden simuliert: Sie erscheinen im Versandprotokoll und als Vorschau.
  - Die WhatsApp-Übergabe funktioniert echt (`wa.me`).
- **Hosting**: GitHub Pages aus einem eigenen Repo `bachkreis-app`.
  - Das Repo kann später per GitHub-Transfer samt Historie an die
    Bachkreis-Organisation gehen.
  - Es liegen nur Demodaten darin, das Repo darf also öffentlich sein.
- **Grenzen**: Jedes Gerät hat eigene Demodaten; es gibt keinen Abgleich
  zwischen Geräten und keine echten Pushs. Das ist für eine Vorführung ausreichend.
- **Umstieg**: Sobald die Bachkreis-Konten stehen, wird der Supabase-Adapter
  aktiviert und die Tabellen werden per CI angelegt. Die Vorführversion bleibt
  als Schulungs- und Testmodus erhalten.

---

## 10. Offene Entscheidungen

1. ~~Eigenes Repo / eigenes Supabase-Projekt~~ → **entschieden (10.10.2026)**:
   eigene, autarke Konten (Abschnitt 9). Offen bleibt: Inhaber Förderverein?
   Wer ist zweiter Admin?
2. **Datenschutz-Verantwortung**: Schule oder Förderverein? Zustimmung von
   Schulleitung und Datenschutzbeauftragtem einholen.
3. ~~Wer ist der Bach Kreis?~~ → Jugendsinfonieorchester, A- und B-Orchester mit je ca. 50 Schülern (Abschnitt 1a).
4. **Instrumente-DB**: Inventar des Kreises, Instrumente der Mitglieder, oder beides?
5. **Login**: Link-Token wie Club-App (einfach) oder zusätzlich PIN?
6. **E-Mail-Absender**: eigene Adresse des Kreises? Welcher kostenfreie Dienst?
7. **Mandantenfähigkeit** von Anfang an (`kreis_id`) – sinnvoll, wenn später weitere Ensembles dazukommen.
8. **Externe/Aushilfen**: Sollen Aushilfsmusiker ohne Konto per Link zu-/absagen können (wie `termin.html` in der Club-App)?
9. **Datenschutz**: Wer darf Telefonnummern und Anwesenheitsquoten sehen?
10. **Verhältnis zu KICC**: nur Registrierung/Heartbeat, oder mehr?
11. **Bedeutung der Gruppen A–D**: Leistungs-/Besetzungsgruppen, Probengruppen
    (z. B. wechselnde Probenabende) oder Teilensembles? Gehört jeder Teilnehmer
    immer genau einer Gruppe an, oder gibt es auch „keine Gruppe“?
12. **Gruppenwechsel**: Darf der Teilnehmer selbst einen Wunsch stellen, oder nur die Leitung umsetzen?
13. **Notenzuteilung**: reicht Instrument (+ Gruppe), oder werden Stimmen oft individuell an Personen vergeben?
14. **Noten-Speicher**: geschätzte Menge (Anzahl Werke/PDFs)? Entscheidet über Storage-Adapter.
15. **Notenwart**: Gibt es eine eigene Rolle für die Pflege des Archivs?
16. **Freigabegrenzen**: Ab welchem Betrag muss der Förderverein Reparatur oder Einkauf freigeben?
17. **Welche Genehmigungen** nutzt der Bachkreis heute auf Papier? Am besten die vorhandenen Formulare als Vorlagen übernehmen.
18. **Externe Kommunikation**: Sollen Schule, Partner und Spender nur Mails
    bekommen, oder auch einen Lese-Link auf Vorgänge?
19. **Buchhaltung**: Bleibt sie komplett beim Förderverein (Empfehlung), oder
    soll die App später Beiträge und Kosten führen?
20. **Mit Bettina Jacka abstimmen**: Was kostet sie heute am meisten Zeit? Das
    bestimmt die Reihenfolge der Module.
