# Kommunikation: KC Communicator und Bachkreis

## Wie der KC Communicator arbeitet (Stand Analyse 15.10.2026)
Der Communicator ist der zentrale Versand-Kern der KC-Programme. Im KC-Supabase-Projekt läuft er als
`kc-communication-router` und `kc-communication-dispatch` mit rund 30 Tabellen `kc_communication_*`.

| Baustein | Aufgabe |
|---|---|
| Programm-Registry | Welches Fachprogramm darf senden, über welche Kanäle |
| Ereignisregeln | Ereignis (z. B. `club_treffen`) → Vorlage, Kanäle, Modus „Ausweichen“ oder „alle“, Doppelte unterdrücken |
| Vorlagen | Text je Kanal (Push-Titel, Mail-Betreff/-Text) mit Platzhaltern |
| Empfänger | Personen, dynamische Gruppen, Einstellungen je Person (welcher Kanal, Ausweichen ja/nein) |
| Anbieter & Routen | mehrere Anbieter je Kanal mit Priorität, Gesundheitsstatus, automatischem Wechsel bei Ausfall |
| Schutz | Bremse je Anbieter (web.de → Brevo), globale Ratengrenze, **Prio 1** für Notfälle, **Zero-Cost-Sperre** |
| Protokoll | jeder Auftrag mit Status, Wiederholschutz (Idempotenz) und Quittungen (zugestellt, angezeigt) |

Die Personen kommen dabei aus `kc_core_people` (KC-Stammdaten).

## Wie es beim Bachkreis läuft
Der Bachkreis hat ein **eigenes Supabase-Projekt** mit eigenen Personen (`bk_personen`), darunter Daten von Kindern.
Den KC Communicator als Dienst mitzunutzen, hätte drei Nachteile:
- Alle Schüler und Eltern müssten zusätzlich in `kc_core_people` im KC-Projekt liegen. Daten von Kindern wären dann in
  einer fremden Datenbank.
- Der Bachkreis wäre vom KC-Projekt abhängig und könnte die App nicht an den Förderverein übergeben.
- Fällt das KC-Projekt aus, fällt auch die Bachkreis-Kommunikation aus.

**Entscheidung (Vorschlag):** Der Bachkreis bekommt eine **eigene Instanz desselben Communicator-Kerns** in seinem
Projekt. Es gibt also keinen Neubau mit anderen Regeln, sondern denselben Aufbau mit Programmen, Ereignisregeln,
Vorlagen, Anbieter-Routen mit Ausweichen, Bremse, Prio 1, Zero-Cost-Sperre und Quittungen. Nur die Empfänger-Auflösung
liest `bk_personen` statt `kc_core_people` (Adapter). Ziel nach AGENTS.md Regel 3: **ein Kern, zwei Installationen**.
Fehlerkorrekturen fließen in beide.

### Kanäle beim Bachkreis (alle kostenlos)
| Kanal | Weg | Hinweis |
|---|---|---|
| Push | Web-Push (VAPID) aus der Edge Function | wie KC (`kc_member_push_subscriptions` → `bk_push_abos`) |
| E-Mail | Brevo (Free, ca. 300/Tag) und als Ausweichweg ein eigenes Postfach per SMTP | gleiches Ausweichprinzip wie KC (web.de ↔ Brevo) |
| WhatsApp | **nur Übergabe** (wa.me / Teilen) – der Mensch drückt „Senden“ | keine kostenpflichtige API |
| App | Nachricht in der Unterhaltung, mit Lesebestätigung und Rückmeldung | – |

### Besonderheiten Bachkreis
- **Minderjährige:** Benachrichtigungen gehen je nach Einstellung an das Kind, die Eltern oder beide. Genehmigungen
  gehen immer an die Eltern.
- **Verteiler entstehen automatisch** aus den Daten, z. B. „Eltern B-Orchester“, „Register Cello“, „Teilnehmer
  Probenfreizeit“.
- **SOS** läuft mit Prio 1, an der Ruhezeit und der Ratengrenze vorbei.

## BK Communicator – gebaut (0.4.0)
Der Bachkreis hat jetzt seine **eigene Instanz desselben Communicator-Aufbaus**. Ein Kern für Server und Tests:
`supabase/functions/_shared/kom/kern.js` (ohne Abhängigkeiten, Datenbank und Anbieter werden hineingereicht).

| KC Communicator | BK Communicator | Ort |
|---|---|---|
| `kc-communication-router` | `annehmen()` – über bk-api `versenden` | `_shared/kom/kern.js` |
| `kc-communication-dispatch` | `zustellen()` – direkt nach dem Annehmen im Hintergrund + jede Minute | `_shared/kom/kern.js` |
| `kc-communication-maintenance` | `wartung()` – Edge Function `bk-kom`, pg_cron jede Minute | `bk-kom/index.ts` |
| `kc-communication-push-receipt` | `quittung()` – Service Worker meldet angezeigt / geöffnet / bestätigt | `bk-kom/index.ts`, `sw.js` |
| `kc_communication_programs` | `bk_kom_programme` | Verwaltung › Communicator |
| Ereignisregeln | `bk_kom_regeln` (Kanäle, Modus Rückfall/alle, Vorlage, Priorität, Ruhezeit, Quittung, Eltern, Doppelte) | 〃 |
| Vorlagen mit `channel_variants` | `bk_kom_vorlagen` (`varianten` je Kanal, Platzhalter `{{vorname}}` …) | 〃 |
| Provider + Routen + Health | `bk_kom_anbieter`, `bk_kom_routen`, `bk_kom_zustand` (3 Fehler in Folge = ausgefallen) | 〃 |
| Bremse je Provider (web.de → Brevo) | `bremse_minute`, `bremse_stunde`, `tageslimit` je Anbieter | 〃 |
| Requests + Status | `bk_versand` = Aufträge: wartet → gesendet → zugestellt → angezeigt → geöffnet → bestätigt; Wiederholung, aufgegeben, Fehler, unterdrückt | 〃 |
| delivery_events | `bk_kom_ereignisse` (gesendet, Fehler, Wechsel, Rückfall, erneut, aufgegeben, gebremst, verschoben, eskaliert, Quittungen) | 〃 |
| Escalation rules | `bk_kom_eskalationen` (nicht bestätigt / fehlgeschlagen → Kanäle → Empfänger oder Leitung) | 〃 |
| Prio 1, Zero-Cost, Rate-Limit | Priorität „kritisch“ (übergeht Not-Aus, Ruhezeit, Ratengrenze, Vorlieben), Zero-Cost-Sperre, `max_pro_minute` | `bk_kom_einstellungen` |
| Idempotency `${correlation}:${person}:${channel}` | `idempotenz` = Vorgang:Person:Kanal (eindeutiger Index) | Migration `…_bk_kom.sql` |

### Ablauf eines Versands
1. **Annehmen (Router):** Programm aktiv? → Regel zum Ereignis (sonst „standard“) → Empfänger auflösen. Bei
   Minderjährigen gilt je nach Regel: Eltern zusätzlich (`auch`), statt des Kindes (`statt`) oder nur das Kind (`nein`).
   Danach greifen die Vorlieben der Person (Meins › Benachrichtigungen), die Erreichbarkeit (Push nur mit aktivem
   Geräte-Abo, E-Mail nur mit Adresse) und die Doppelten-Sperre. Im Modus **Rückfall** entsteht ein Auftrag für den
   ersten erreichbaren Kanal, die übrigen Kanäle merkt sich der Auftrag. Im Modus **alle** entsteht je Kanal ein
   Auftrag. In der Ruhezeit wird verschoben (außer bei Notfall).
2. **Zustellen (Dispatch):** Fällige Aufträge werden gesperrt (`for update skip locked`, also kein Doppelversand bei
   parallelen Läufen). Danach: Route nach Rang, ausgefallene Anbieter nach hinten, Zero-Cost-Sperre, Bremse. Bei
   Störung wechselt der Auftrag sofort zum nächsten Anbieter (z. B. Brevo → SMTP).
   - Danebengegangen → Wiederholung mit Backoff `min(max, basis·2^(n−1))`.
   - Nach `max_versuche` → **aufgegeben**, dann Rückfall auf den nächsten Kanal (zuletzt „In der App“).
   - Empfänger-Fehler (kein Push-Abo, Abo abgelaufen 404/410, ungültige Adresse) werden **nicht** wiederholt: Es gilt
     sofort der Rückfall, und der Anbieter bleibt „gesund“.
3. **Wartung (jede Minute):** Sie erledigt mehrere Dinge:
   - hängende Aufträge lösen und zustellen;
   - Eskalationen auslösen (z. B. SOS nach 5 Min. unbestätigt → E-Mail, nach 15 Min. → Leitung);
   - den Anbieter-Zustand prüfen, wobei ein ausgefallener Anbieter nach 15 Min. zur Probe wieder dran ist;
   - aufräumen.
4. **Quittungen:** Jede Push-Nachricht trägt Auftrags-ID und ein Einmal-Token (in der Datenbank nur als Hash). Der
   Service Worker meldet „angezeigt“ und „geöffnet“. Bei Notfällen gilt Antippen oder „✅ Verstanden“ als
   **bestätigt**. Damit stoppt die Eskalation, und noch offene Aufträge desselben Vorgangs entfallen.

### Konsole (PC-Verwaltung › 📡 Communicator)
Die Konsole bietet:
- **Lämpchen:** grün nur, wenn gemessen und gut; grau = unbekannt, nie „ok“.
- Zähler je Status (24 Std.) und der Zustand je Anbieter.
- **Not-Aus** (Versand an/aus; Notfälle gehen trotzdem).
- Test-Push und Test-Mail an mich, „Jetzt zustellen“.
- Die Auftragsliste mit dem Verlauf jedes Vorgangs.
- Den Einstieg in alle Einstellungstabellen: Regeln, Vorlagen, Anbieter, Routen, Eskalationen, Programme,
  Grundeinstellungen.

In der Vorführversion werden dieselben Regeln im Browser angewendet und die Aufträge als „simuliert“ eingetragen.

### Einrichtung (alles kostenlos)
| Was | Wo | Wer |
|---|---|---|
| VAPID-Schlüssel (Push) | Supabase-Secrets `BK_VAPID_PUBLIC/PRIVATE/SUBJECT` | GitHub-Action `supabase.yml` (einmalig) |
| Wartungs-Schlüssel + pg_cron | Secret `BK_KOM_TOKEN`, Vault `bk_kom_url`/`bk_kom_token` | GitHub-Action (Aufruf `einrichten`) |
| Brevo-API-Schlüssel | Supabase › Edge Functions › Secrets: `BK_BREVO_API_KEY` | Bachkreis (Brevo-Konto, Absender bestätigen) |
| Ersatz-Postfach (optional) | Secret `BK_SMTP_URL`, z. B. `smtps://name%40web.de:passwort@smtp.web.de:465` | Bachkreis |
| Absender-Adresse | Verwaltung › Communicator › Grundeinstellungen (`absender_email`) oder Secret `BK_MAIL_ABSENDER` | Leitung |

Ohne Brevo-Schlüssel und Absender steht der Mail-Anbieter auf „nicht eingerichtet“ (gelb). Mails fallen dann auf
„In der App“ zurück, nichts geht verloren und nichts wird als zugestellt angezeigt.

Die Schlüssel stehen **nie** in der Datenbank oder im Repository. In `kom_anbieter.geheimnis` steht nur der *Name*
des Secrets.

## Nachrichten wie in der KC Club App (0.8.0)

Der Chat ist aufgebaut wie WhatsApp und arbeitet mit dem BK Communicator zusammen.

### Was die App kann

- **Chatliste:** Suche, Bild, letzte Nachricht mit Haken, Uhrzeit, Zähler. Mit „＋ Neue Nachricht“ entsteht bei einer Person ein Einzelchat (gibt es ihn schon, öffnet er sich), bei mehreren eine Runde mit Betreff.
- **Sprechblasen:** Tages-Trenner („Heute“, „Gestern“), „⬇ Neue Nachrichten“, Uhrzeit. In Gruppen hat jeder Absender seine Farbe.
- **Haken:** ✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen. In Gruppen erst, wenn es für alle gilt; daneben steht klein „2/5“.
  - „Angekommen“ meldet das Gerät des Empfängers. Im Echtbetrieb kommt die Meldung auch von der Push-Quittung („angezeigt“), also auch bei geschlossener App.
  - Ohne eigene Lesebestätigung (⚙️ › 💬 Nachrichten) gibt es keine blauen Haken – in beide Richtungen, wie bei WhatsApp.
- **❗ Wichtig:** orange umrandet, Regel „❗ Wichtige Nachricht“ (Push **und** E-Mail). Auf Wunsch fragt die App vor dem Senden nach der Wichtigkeit.
- **🏎️ Express:** Regel „🏎️ Express-Sendung“: Push, E-Mail und App, die Ruhezeit gilt nicht.
  - Beim Empfänger geht ein Fenster auf: Öffnen · Später (30 Min.) · Nein, dazu „📬 Empfang bestätigen“.
  - Der Absender sieht je Empfänger: angekommen um …, gelesen um …, ✅ Empfang bestätigt.
  - Höchstens 5 am Tag je Person, die Leitung unbegrenzt (PC-Verwaltung › Einstellungen).
- **⏰ Später senden:** heute Abend, morgen früh, morgen Mittag oder eine eigene Zeit.
  - Wiederholung: einmal, jeden Tag, werktags, jede Woche, jeden Monat.
  - Bis dahin sieht nur der Absender die Nachricht, blass und gestrichelt. Antippen: jetzt senden, Zeit ändern, löschen.
  - Im Echtbetrieb gibt `bk-kom` die Nachricht jede Minute frei, auch wenn das Handy aus ist. Dann geht der Bescheid raus und die nächste Wiederholung wird eingeplant.
- **🔔 Zustellwahl je Nachricht:** Push, E-Mail, WhatsApp-Übergabe. Ohne Wahl gilt die Einstellung der Empfänger.
- **Antippen einer Nachricht:** Reaktion, ↩️ Antworten (Zitat), 📋 Kopieren, ✏️ Bearbeiten (15 Min.), 🔊 Vorlesen, ℹ️ Details, 🗑️ für alle löschen („Diese Nachricht wurde gelöscht“).
  - Details zeigen, wann gesendet, angekommen und gelesen.
  - Der Absender sieht dazu, was der Communicator je Weg gemacht hat (Aktion `nachricht_zustellung`).
- **Entwürfe:** je Chat auf dem Gerät gemerkt.

### Speicherung

- Nachrichten liegen in `bk_nachrichten`: wichtig, express, antwort_auf, kanaele, geplant_um/wiederholung, reaktionen, bearbeitet_am, zurueckgezogen_am.
- Je Empfänger gibt es eine Zeile in `bk_nachricht_status` (zugestellt_am, gelesen_am, express_antwort, express_bestaetigt_am).
  - Diese Zeilen sieht nur der Absender und die Person selbst.
  - So wird eine Gruppen-Nachricht nicht bei jeder Lesebestätigung neu an alle Geräte verteilt.
- Bescheid: Aktion `versenden` mit `nachricht_id`. Der Server bestimmt Empfänger, Ereignis und Kanäle selbst und gibt je Nachricht nur einmal Bescheid (Korrelation `nachricht:<id>`).

### Datenschutz und Kinderschutz

- Einzelchats und Runden sieht nur, wer dabei ist – auch die Leitung nicht.
- Eltern schreiben privat nur der Leitung, den Lehrkräften, Verwaltern und den eigenen Kindern.
- Schüler schreiben Schülern (abschaltbar in der PC-Verwaltung), der Leitung, den Lehrkräften und den eigenen Eltern.
- Die Leitung kann jede sichtbare Nachricht für alle löschen.

### Einstellungen

- **⚙️ Mehr › 💬 Nachrichten:** Lesebestätigung, Wichtigkeit fragen, Ton, Vorlesen, Entwürfe, Enter sendet, vorausgewählte Benachrichtigung, Chat-Farben.
- **PC-Verwaltung › Einstellungen:** Express je Tag, Bearbeiten-Frist, Schüler untereinander.

## Anhänge, Sprache, Umfragen, Selbstlöschen (0.9.0)

- **📎 Anhänge:** Foto oder Video, Datei (PDF, Word, Excel …) und 🎼 Noten. Je Datei höchstens 8 MB; Fotos werden vorher verkleinert.
  - Noten kommen entweder aus dem Notenarchiv (Stimme mit PDF öffnet direkt, ohne PDF als Hinweis aufs Archiv) oder als PDF/Foto vom Gerät.
  - Im Notenarchiv hängen Leitung, Lehrkräfte und Notenwart mit „📤 PDF“ ein PDF an eine Stimme. Schüler finden es unter „Meine Noten“.
- **🎙️ Sprachnachricht:** Mikrofon rechts neben dem Schreibfeld (bei leerem Feld, wie WhatsApp), höchstens 3 Minuten.
- **🗣️ Diktieren:** sprechen statt tippen – der Text landet im Schreibfeld, gesendet wird mit ➤.
- **🎤 Sprachsteuerung** (Mikrofon oben im Kopf und in den Nachrichten):
  - „Öffne Termine/Nachrichten/Pinnwand/Noten/Einstellungen“
  - „Nachricht an Bettina: …“, „Express an Judith: …“, „Wichtig an Martin: …“
  - „Neuer Zettel: …“, „Lies meine Nachrichten“, „Hilfe“
  - Gesendet wird nie ungefragt.
- **📊 Umfrage:** Frage mit 2–10 Antworten, eine oder mehrere wählbar, Balken mit Stimmen, „👥 Wer hat was gewählt?“.
- **⏳ Selbstlöschen:** nach 1 Std., 24 Std. oder 7 Tagen. Danach ist die Nachricht bei allen leer und der Anhang weg (Wartung `bk-kom`, jede Minute).
- **📂 Eingeklappte Tage:** Im Chat sind vergangene Tage eingeklappt, rechts steht das Datum („Mo, 11.11.26“).
  - Ältere Wochen sind als „KW 45/26“ zusammengefasst.
  - Heute, Ungelesenes und angesprungene Nachrichten sind immer offen. „⤢ Alle aufklappen“ öffnet alles.
  - Abschaltbar unter ⚙️ › 💬 Nachrichten.

### Ablage der Dateien

- Die Tabelle `bk_dateien` wird nicht abgeglichen. Dateien gibt es nur über `bk-api`:
  - `datei_hochladen`: Art, Größe und eine Tagesgrenze werden geprüft.
  - `datei_holen`: nur für den Hochlader, wer die Nachricht sieht, oder wer die Noten-Stimme sieht.
- Gespeichert wird austauschbar (Adapter):
  - Standard ist die Datenbank (kostenlos).
  - Mit dem Secret `BK_ABLAGE=storage` stattdessen Supabase Storage, privater Bucket `bk-dateien` (kostenlos bis 1 GB).
- Verwaiste Dateien räumt die Wartung nach einem Tag auf.
- In der Vorführversion liegen Dateien nur auf dem Gerät (IndexedDB).

