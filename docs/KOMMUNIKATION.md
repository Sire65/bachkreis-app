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

### Stand
- **App:** Kanal-Adapter in `js/kern/versand.js`; in der Vorführversion simuliert.
- **Echtbetrieb:** Der Server prüft die Rechte und merkt jeden Versand in `bk_versand` vor (Status `vorgemerkt`).
- **Nächster Schritt:** Edge Function `bk-versand` als Instanz des Communicator-Kerns. Sie arbeitet die Vormerkungen
  ab und setzt den Status auf gesendet bzw. Fehler; „vorgemerkt“ wird nie als zugestellt angezeigt.
