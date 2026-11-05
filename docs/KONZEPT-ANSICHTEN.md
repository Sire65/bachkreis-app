# Konzept: Eigene Ansichten für Kinder, Eltern, Lehrkräfte und Vorstand

Stand: 05.11.2026 · Bachkreis-App 0.31.0 · Entwurf zur Freigabe

## 1. Ausgangslage

Heute sehen alle dieselbe Startseite: Kopf mit Infofeld, Register (Bachkreis · Meins · Technik · Admin) und Kacheln.
Die Rollen blenden nur einzelne Kacheln aus. Eine Schülerin der Orchesterklasse sieht dadurch im Register „Bachkreis“
bis zu 12 Kacheln (Chronik, Dokumente, Konzerte & Projekte, Pinnwand, Bühne …) und im Register „Meins“ weitere 9.
Die „einfache Ansicht“ hilft etwas, ist aber für alle Rollen gleich gebaut.

**Ziel:** Jede Gruppe bekommt eine eigene, feste Übersicht, die zu ihrem Alltag passt:

| Gruppe | braucht vor allem | Gefühl |
|---|---|---|
| 🧒 Kinder (Schülerinnen und Schüler) | Wann ist Probe? Was soll ich üben? Spielen und lernen | klar, groß, bunt, wenig Text |
| 👪 Eltern | Was muss ich tun? Termine meiner Kinder, Zusagen, Genehmigungen | „Erledigen-Liste“, schnell fertig |
| 🎼 Leitung und Lehrkräfte (Frau Jacka und andere) | Probe vorbereiten, Anwesenheit, Übe-Aufgaben, Planung | Arbeitsplatz mit allem |
| 💛 Vorstand / Förderverein | Freigaben, Geld, Anfragen, Zahlen | Übersicht, keine Kinder-Details |

**Grundsätze:**
- **Nichts geht verloren** (AGENTS.md Regel 1): Jede Funktion bleibt erreichbar. Sie liegt nur nicht mehr auf der ersten Seite.
- **Die Rechte ändern sich nicht:** Was jemand sehen darf, bestimmt weiter der Server. Die Ansicht ordnet nur.
- **Automatisch richtig:** Die App wählt die Ansicht nach Person und Rolle. Gemischte Rollen (z. B. eine Lehrkraft, die auch Mutter ist) schalten oben um.
- **Die Leitung kann anpassen:** Welche Kacheln zu welcher Ansicht gehören, stellt die Leitung in der PC-Verwaltung ein. Es ist nichts fest eingebaut (Regel 4).

## 2. 🧒 Kinder-Ansicht

Kurz, groß, in einer festen Reihenfolge von oben nach unten. Keine Register, kein Wischen, keine Verwaltung.

```
┌──────────────────────────────────────┐
│ 🎻 Hallo Luisa!            ⚙️  🆘    │  ← Kopf schmal: Name, eigenes Gesicht, SOS immer sichtbar
├──────────────────────────────────────┤
│ 📅 NÄCHSTE PROBE                     │
│ Morgen, Mi 16:30 · Musiksaal         │
│ 🎒 Mitbringen: Geige, Noten, Stift   │
│ [ ✅ Ich komme ]  [ ❌ Kann nicht ]  │  ← nur, wenn Kinder selbst zusagen dürfen
├──────────────────────────────────────┤
│ 🎯 MEINE ÜBE-AUFGABEN       ⭐ 7/10  │
│ ▸ Takt 17–24 langsam    ▓▓▓▓░░  2/3  │
│ ▸ D-Dur-Tonleiter       ✓ geschafft  │
│ [ 🎻 Jetzt üben ]                    │
├──────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ 📅     │ │ 🎻     │ │ 🎼     │     │
│ │Termine │ │ Üben   │ │ Noten  │     │
│ └────────┘ └────────┘ └────────┘     │
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ 🧠     │ │ 🎺     │ │ 🎭     │     │
│ │ Quiz   │ │Instru- │ │Orches- │     │
│ │        │ │mente   │ │ter     │     │
│ └────────┘ └────────┘ └────────┘     │
│ ┌────────┐ ┌────────┐                │
│ │ 💬     │ │ 🙂     │                │
│ │Nachr.  │ │Ich     │                │
│ └────────┘ └────────┘                │
└──────────────────────────────────────┘
 Fußleiste: 🏠 Start · 📅 Termine · 🎻 Üben · 💬 Nachrichten
```

### Kacheln (höchstens 8)
| Kachel | Inhalt | gibt es schon? |
|---|---|---|
| 📅 Termine | nur die eigenen Termine, Zusage/Absage, was mitbringen | ✅ Meine Termine |
| 🎻 Üben | Übe-Bühne (Mitspielen, Griffe, Rhythmus, Stimmgerät) + Übe-Tagebuch + Stoppuhr/Metronom zusammen | ✅ zusammenlegen |
| 🎼 Meine Noten | Stimmen für mein Instrument, Probenoten | ✅ |
| 🧠 Quiz | **neu** – siehe Abschnitt 2.2 | 🆕 |
| 🎺 Instrumente kennenlernen | Instrumentenkunde: Aussehen, Klang, Halten | ✅ |
| 🎭 Mein Orchester | Bühne mit meinem Platz, Gesichter, Wer ist online | ✅ |
| 💬 Nachrichten | nur erlaubte Chats (Kinderschutz-Regeln bleiben) | ✅ |
| 🙂 Ich | Mein Gesicht, Mein Leihinstrument, Schriftgröße, Farbe | ✅ zusammenfassen |

**Für Kinder ausgeblendet** (bleibt per Link/Suche erreichbar, wo sie Rechte haben): Chronik, Dokumente, Konzerte & Projekte (Details stehen im Termin), Pinnwand (wichtige Zettel erscheinen oben als Karte), Mitfahrbörse, Austausch, Einstellungs-Vielfalt, Infofeld-Karussell, Laufband.

### 2.1 Belohnen statt vergleichen
- ⭐ Sterne für erledigte Übe-Aufgaben und gelöste Quiz-Runden, 🔥 Übe-Serie („3 Tage hintereinander“)
- 🏅 Abzeichen: „Tonleiter-Profi“, „Rhythmus-Ass“, „Instrumenten-Kenner“, „10 Proben dabei“
- **Keine Ranglisten** mit anderen Kindern (Druck, Datenschutz). Nur der eigene Fortschritt zählt.

### 2.2 🧠 Quiz (neu)
Kurze Runden (5 Fragen, etwa 2 Minuten). Alles läuft auf dem Gerät, ohne fremden Dienst und kostenlos.

| Bereich | Beispiel | Baut auf |
|---|---|---|
| 🎺 Instrumente | Bild oder Klang → welches Instrument? Familie (Streicher/Holz/Blech)? | Instrumentenkunde (Bilder, Klänge vorhanden) |
| 🎼 Noten lesen | Note auf dem Notensystem → Name (c, d, e …), Violin-/Bassschlüssel | Notensatz (vorhanden) |
| 🥁 Rhythmus | Wie viele Schläge hat eine halbe Note? Takt hören → richtiges Muster | Rhythmus-Modul (vorhanden) |
| 👂 Hören | höher/tiefer, Dur oder Moll, Intervall | Ohr-Spiele der Übe-Bühne (vorhanden) |
| 📖 Musik-Wörter | p, f, crescendo, Allegro, Fermate … | neu: kleine Wörterliste |
| 🎻 Unser Bachkreis | Seit wann gibt es den Bachkreis? Was spielen wir im Konzert? | Chronik und Konzertprogramm |

- **Schwierigkeit** nach Jahrgang oder Orchester (Orchesterklasse leicht, Bachkreis schwerer), wählbar.
- **Lehrkraft-Quiz:** Frau Jacka kann ein „Quiz der Woche“ zusammenstellen (Fragen aus den Bereichen + eigene Fragen zu einem Stück).
- **Ergebnisse:** gehören dem Kind. Lehrkräfte sehen nur „hat teilgenommen / Punkte“, und auch das nur, wenn das Quiz von ihnen kam (wie bei den Übe-Aufgaben).

### 2.3 Jüngere und ältere Kinder
- **Orchesterklasse / jüngere Kinder:** nur die Kinder-Ansicht.
- **Ältere Jugendliche** (ab einer Altersgrenze, die die Leitung festlegt, Vorschlag: ab Klasse 9): dürfen unten auf „🔧 Mehr anzeigen“ umschalten. Dann kommen Pinnwand, Konzerte & Projekte, Chronik und Mitfahrbörse dazu.

## 3. 👪 Eltern-Ansicht

Eltern wollen schnell erledigen und wieder raus. Darum steht oben die „Erledigen-Liste“, darunter die Kinder.

```
┌──────────────────────────────────────┐
│ 👪 Guten Abend, Frau Hoffmann        │
│ [ Luisa 🎻 ] [ Ben 🎺 ] [ Beide ]    │  ← Kinder-Umschalter (eine Familie, mehrere Kinder)
├──────────────────────────────────────┤
│ ✅ BITTE ERLEDIGEN (3)               │
│ ▸ 2 Termine ohne Zu-/Absage   [›]    │
│ ▸ Genehmigung Probenfahrt     [›]    │
│ ▸ Leihgeige: Rückgabe 30.11.  [›]    │
├──────────────────────────────────────┤
│ 📅 DIE NÄCHSTEN TERMINE              │
│ Mi 16:30 Probe A-Orchester (Luisa) ✅│
│ Sa 10:00 Generalprobe (beide)     ❓ │
├──────────────────────────────────────┤
│ Kacheln: 📅 Termine · 💬 Nachrichten │
│ ✍️ Genehmigungen · 🚗 Mitfahrbörse   │
│ 🎻 Üben meines Kindes · 🩺 Notfall   │
│ 🎻 Leihinstrument · 📌 Pinnwand      │
│ 📂 Elternbereich (Dokumente, FV)     │
└──────────────────────────────────────┘
```

- **Erledigen-Liste:** alles, wo die Eltern gefragt sind. Jede Zeile führt direkt hin. Ist alles erledigt: „👍 Alles erledigt“.
- **Kinder-Umschalter:** filtert Termine, Üben, Leihinstrument und Noten auf ein Kind. „Beide“ zeigt alles zusammen.
- **Üben meines Kindes:** Wochenziel, Sterne und Aufgaben (nur lesen, wenn das Kind es teilt bzw. minderjährig ist – wie heute).
- **Austausch / Gastfamilie und Förderverein** nur, wenn gerade aktiv bzw. Mitglied.

## 4. 🎼 Leitung und Lehrkräfte (Frau Jacka und andere)

Ein Arbeitsplatz. Die heutige erweiterte Ansicht mit Registern bleibt, wird aber nach Aufgaben geordnet:

| Register | Kacheln |
|---|---|
| **Heute** (neu, Start) | 🧭 Cockpit (offene Punkte) · 📋 Anwesenheit der heutigen Probe · 📅 Termine · 💬 Nachrichten · 🎯 Übe-Aufgaben & Fortschritt · 🆘 SOS |
| **Orchester** | 🎼 Orchester/Besetzung · 📚 Notenarchiv · 🎻 Instrumente · 🎭 Konzerte & Projekte · 🧠 Quiz verteilen · 🎺 Instrumentenkunde |
| **Organisation** | ✍️ Genehmigungen · 📷 Foto-Liste · 📣 Rundschreiben · 📣 Startnachricht · 📨 Auftrittsanfragen · 🤝 Partner · 🏠 Austausch · 📂 Dokumente |
| **Technik / Admin** | wie heute (Zugang im Blick, Zahlen, Sicherheits-Check, PC-Verwaltung …) |

- **„Heute“-Karte oben:** nächste Probe mit Zusagen je Register, „📋 Anwesenheit abhaken“, „Wer fehlt unentschuldigt?“.
- **Probenmodus** (Idee für später): ein Knopf während der Probe – Anwesenheit, Metronom, Stimmton, Sitzplan auf einen Blick.

## 5. 💛 Vorstand / Förderverein

| Bereich | Kacheln |
|---|---|
| Start | 🧭 Cockpit (Freigaben, offene Beträge) · 💛 Förderverein (Einkauf, Spenden, Freigaben) · 📅 Konzerte & Termine · 💬 Nachrichten |
| Verein | 👥 FV-Mitglieder · 📨 Auftrittsanfragen · 🤝 Partner · 📂 Dokumente · 📊 Bachkreis in Zahlen · 📜 Chronik |

Keine Übe-Aufgaben, Gesundheit oder Kinder-Details, nur das, was der Vorstand ohnehin sehen darf (Need-to-know aus 0.20.0 bleibt).

**Zusatz-Rollen** bringen ihre Kacheln in jede Ansicht mit: Instrumentenwart (🎻 Instrumente, Reparaturen), Notenwart (📚 Notenarchiv), Registerführer (🎼 Mein Register), Terminplaner (📅 Termine planen).

## 6. Umsetzung (Technik)

- **Ansichts-Profile** als Registry `js/kern/ansichten.js`: je Profil Kopf-Art, Karten oben, Kacheln, Register, Fußleiste und ob umgeschaltet werden darf. Profile: `kind`, `kind_gross`, `eltern`, `lehrkraft`, `vorstand`.
- **Auswahl:** automatisch aus Personentyp, Rollen und Alter. Gemischte Personen bekommen einen Umschalter („Als Elternteil / Als Lehrkraft“).
- **PC-Verwaltung › Ansichten:** Die Leitung schaltet je Profil Kacheln an oder aus und legt die Altersgrenze fest (Konfiguration `ansichten`, ohne neue Tabelle).
- **Bleibt:** eigene Anordnung je Gerät, einfache/erweiterte Ansicht für Erwachsene, alle Server-Regeln.
- **Neu für das Quiz:** Fragen-Bausteine im Browser; Lehrkraft-Quiz als Erweiterung der Übe-Aufgaben (Art „quiz“) und Ergebnisse in `uebe_ergebnisse` – keine neue Tabelle nötig.
- **Tests:** je Profil prüft der Rundgang, dass genau die vorgesehenen Kacheln da sind; der Barrierefreiheits-Check läuft je Profil.

## 7. Vorschlag für die Reihenfolge

| Version | Inhalt |
|---|---|
| 0.32.0 | 🧒 Kinder-Ansicht (Start, Übe-Karte, 8 Kacheln, Fußleiste) + 🧠 Quiz mit Instrumenten, Noten, Rhythmus, Hören |
| 0.33.0 | 👪 Eltern-Ansicht mit Erledigen-Liste und Kinder-Umschalter |
| 0.34.0 | 🎼 Lehrkraft-Arbeitsplatz („Heute“), 💛 Vorstand, Ansichten in der PC-Verwaltung, Quiz der Woche |

## 8. Bitte entscheiden

1. **Altersgrenze** für „Mehr anzeigen“ bei Kindern – Vorschlag: ab Klasse 9.
2. **Dürfen Kinder selbst zu- und absagen**, oder nur die Eltern? (Heute: Kinder dürfen.)
3. **Nachrichten für Kinder:** wie heute (Gruppen-Chats, Leitung, eigene Eltern) – oder bei jüngeren Kindern nur lesen?
4. **Pinnwand für Kinder:** ganz weglassen, oder nur wichtige Zettel als Karte oben?
5. **Quiz-Ergebnisse:** Sollen Lehrkräfte die Punkte sehen (nur beim „Quiz der Woche“), oder bleibt alles privat?
6. **Belohnungen:** Sterne und Abzeichen ja – Ranglisten nein (Vorschlag). Einverstanden?
