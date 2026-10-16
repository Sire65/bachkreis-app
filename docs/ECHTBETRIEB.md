# Umstellung auf den Echtbetrieb (Supabase)

Die App läuft heute als **Vorführversion**: Demodaten liegen nur im Browser. Für den Echtbetrieb gibt es zusätzlich einen
Server-Teil. Dieser ist **fertig gebaut und getestet**; er wird nur noch im Supabase-Projekt des Bachkreises eingespielt.

## Was der Server macht (Edge Function `bk-api`)
- **Anmeldung** mit persönlichem Zugangscode bzw. QR-Link.
  - Die Sitzung gilt 180 Tage.
  - Auf dem Server liegt nur ein Hash des Codes.
  - Wer zu viele falsche Codes probiert, wird gebremst.
- **Datenschutz:** Der Server entscheidet, wer was sieht. Die Regeln stehen in `supabase/functions/_shared/regeln.js`.
  - Eltern sehen nur ihre eigenen Kinder: Zusagen, Genehmigungen, Leihinstrumente, Adressen.
  - Schüler sehen nur ihre eigenen Daten und die Termine ihrer Gruppen.
  - Andere Personen erscheinen nur mit Namen.
  - Gesundheitsangaben sehen nur Leitung und Lehrkräfte.
  - Spenden, Einkäufe, Zugänge und Protokolle bekommen nur die zuständigen Rollen.
- **Schreiben:** Schüler und Eltern dürfen nur Bestimmtes selbst ändern:
  - Zusage/Absage für sich bzw. das eigene Kind
  - Genehmigungen der eigenen Kinder
  - Chat und Rückmeldungen
  - Schadensmeldungen, Änderungsmeldungen, Wechselwünsche
  - eigene Pinnwand-Zettel und Benachrichtigungs-Einstellungen
- **Nachrichten (wie KC):** Die Regeln prüft der Server, nicht die App.
  - Einzelchats und Runden sind privat; die Kinderschutz-Regel gilt für neue Chats (`chatPartnerErlaubt`).
  - Express ist auf 5 am Tag begrenzt, Bearbeiten auf 15 Minuten. Nachrichten-Status setzt jede Person nur für sich.
  - Geplante Nachrichten bleiben bis zur Sendezeit verborgen; `bk-kom` gibt sie jede Minute frei.
  - Schon eingespielte Datenbanken bekommen die neuen Spalten und die Tabelle `nachricht_status` mit der Nachtrags-Migration `20261019000000_bk_nachrichten.sql`.
- **Dateien (Anhänge, Noten-PDFs):** Sie gehen nur über `bk-api`; Rechte, Arten und 8 MB je Datei prüft der Server.
  - Ablage standardmäßig in der Datenbank. Optional Supabase Storage: Secret `BK_ABLAGE=storage` und einen privaten Bucket `bk-dateien` anlegen.
  - Nachtrags-Migration `20261020000000_bk_anlagen.sql`.
- **Pinnwand (wie KC):** Die Regeln prüft der Server, nicht die App.
  - Wer einen Zettel sieht: der Verfasser, die Empfänger, bei „für alle“ alle. Private Zettel sieht auch die Leitung nicht.
  - Anheften: höchstens 4 Zettel je Person, je 200 Zeichen. Farbe (1–4), Zeit und Empfängerzahl setzt der Server.
  - „Gesehen“ und „Erledigt“ setzt jede Person nur für sich (Tabelle `pinnwand_gelesen`, ID `zettel:person`). Wer gelesen hat, sieht nur der Verfasser (und die Leitung bei sichtbaren Zetteln).
  - Abnehmen darf der Verfasser oder die Leitung. Ändern darf nur der Verfasser, und nur die Wichtigkeit.
  - Bescheid (Ereignis `pinnwand`) darf nur der Verfasser auslösen, je Zettel einmal (und einmal für „jetzt wichtig“). Die Empfänger bestimmt der Server aus dem Zettel.
  - Schon eingespielte Datenbanken bekommen die neuen Spalten mit der Nachtrags-Migration `20261018000000_bk_pinnwand.sql`.

  Alles andere ist den Verwalter-Rollen vorbehalten.
- **Abgleich:** Geräte holen nur Änderungen seit dem letzten Abgleich (alle 30 s und beim Öffnen).
  - Gleichzeitige Änderungen derselben Zeile werden erkannt (Versionsnummer) und nicht überschrieben.
  - Jede Änderung wird im Änderungsprotokoll festgehalten.
- **Versand:** Der BK Communicator nimmt Benachrichtigungen an, legt Aufträge in `bk_versand` an und stellt sie über Web-Push und E-Mail zu. Die Edge Function `bk-kom` wartet jede Minute (siehe `KOMMUNIKATION.md`).

Getestet wird in `tests/server.test.mjs` (16 Tests gegen PostgreSQL/PGlite, dazu 12 in `tests/nachrichten.test.mjs`) und `tests/e2e/echtbetrieb.mjs` (Browser).
Lokal ausprobieren: `node tests/e2e/server-lokal.mjs` startet App und Server mit Demodaten. Die Zugangscodes erscheinen
in der Konsole.

## Schritte (einmalig, ca. 1 Stunde)
1. **Supabase-Konto des Bachkreises** anlegen (Funktions-Mailadresse, 2-Faktor).
2. Darin ein **Projekt in Frankfurt** (eu-central-1) anlegen und das Datenbank-Passwort im Passwort-Tresor ablegen.
3. Unter Account › Access Tokens einen **Zugangs-Token** erzeugen.
4. Im GitHub-Repo unter Settings › Secrets and variables › Actions › **Secrets** eintragen:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF` (die Projekt-Kennung aus der Projekt-URL)
   - `SUPABASE_DB_PASSWORD`
5. Unter Actions den Workflow **„Supabase“** ausführen. Er erledigt:
   - Tabellen und Communicator-Startwerte anlegen;
   - `bk-api` und `bk-kom` veröffentlichen;
   - Push-Schlüssel (VAPID) erzeugen;
   - den Schlüssel fürs Kalender-Abo (`BK_KALENDER_GEHEIMNIS`) einmalig erzeugen – nie ändern, sonst werden alle abonnierten Kalender-Links ungültig;
   - die minütliche Wartung (pg_cron) einrichten.
5a. **E-Mail einrichten (kostenlos):**
   - Ein Brevo-Konto anlegen und dort die Absender-Adresse bestätigen.
   - In Supabase unter Edge Functions › Secrets `BK_BREVO_API_KEY` eintragen.
   - In der PC-Verwaltung unter Communicator › Grundeinstellungen die `absender_email` eintragen.
   - Optional als Ersatzweg `BK_SMTP_URL` für ein eigenes Postfach eintragen.
6. Unter Settings › Secrets and variables › Actions › **Variables** eintragen:
   - `BK_DATENQUELLE` = `supabase`
   - `BK_API_URL` = `https://<projekt-kennung>.supabase.co/functions/v1/bk-api`
7. Workflow **„Pages“** ausführen. Danach ist unter https://sire65.github.io/bachkreis-app/ der Echtbetrieb erreichbar, die
   Vorführversion bleibt unter `/demo/` für Schulungen.
8. **Erste Anmeldung der Leitung:** Den ersten Zugang einmalig per SQL im Supabase-Dashboard anlegen. Die Vorlage steht
   unten. Danach erledigt die Leitung alles in der PC-Verwaltung:
   - Personen per CSV-Import einspielen
   - Zugänge und QR-Karten erzeugen

### Erster Zugang (SQL-Vorlage, Code selbst wählen, mindestens 8 Zeichen)
```sql
insert into bk_personen (id, vorname, nachname, typ, status, rollen) values ('p-leitung', 'Bettina', 'Jacka', 'leitung', 'aktiv', '{leitung,admin}');
insert into bk_zugaenge (person_id, code_hash, art, aktiv, verwaltung)
values ('p-leitung', encode(sha256(upper('MEINCODE1')::bytea), 'hex'), 'link', true, true);
```

## Vor dem ersten echten Kind
- Auftragsverarbeitungsvertrag (AVV) mit Supabase abschließen
- Datenschutzbeauftragten der Schule einbeziehen
- Datenschutzhinweise für Eltern bereitstellen
- Einwilligungen (Vorlage „Teilnahme & Datenschutz“) einholen
