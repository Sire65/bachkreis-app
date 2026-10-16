# Konzept: Übe-Bühne + Abgleich mit der Internetseite (Stand 0.25.0, 16.10.2026)

Status: **Teil B gebaut in 0.26.0** (Übe-Bühne komplett, alle Ausbaustufen). Teil A folgt in 0.27.0.

---

## Teil A – Abgleich: Internetseite ↔ App

Quelle: https://www.gymnasium-bergkamen.de/bachkreis/ (Abruf 16.10.2026).
Laut Internetseite heißt die Leitung **Bettina Jacka**. Bitte prüfen, ob „Frau Jacker“ dieselbe Person ist.

### Das hat die App schon

| Internetseite | App |
|---|---|
| A-Orchester (Jg. 9–12), B-Orchester (Jg. 5–9), je ca. 50 Kinder | Gruppen A/B mit Soll-Besetzung und Wechselregel B → A |
| Orchesterklasse, Streicher- und Bläser-AGs als Vorstufe | Gruppen C/D, Interessenten & Probespiel (0.24) |
| Beratung bei der Instrumentenwahl | Instrumentenkunde mit Avatar & Klang, Interessenten |
| „Lernfortschritte begleiten“ | Übe-Tagebuch, Übe-Serie, Übeaufgaben (0.22) – **ausbaufähig, siehe Teil B** |
| Konzerte, Mitwirkung bei Veranstaltungen | Termine, Projekte, Konzertprogramm, Kleiderordnung, Transportliste |
| Soloauftritte | Programm mit Solisten |
| Probenfreizeiten, Austausche In- und Ausland | Reisen: Anmeldung, Zimmer, Kosten, „bezahlt“, Begleiter-Zugriff auf Notfalldaten |
| Förderverein: Instrumente zum Verleih, Pflege, Reparatur | Inventar, Ausleihe mit Leihvertrag, Reparatur mit Freigabe, Abschreibung |
| Förderverein: Orchestermaterial | Notenarchiv, Notenexemplare, Mietmaterial, GEMA |
| Förderverein: Mitglieder informieren, Feste | FV-Mitgliedschaft, Rundschreiben, Termine „für alle“ |
| Förderverein: Beiträge und Spenden | Kasse & Beiträge, Spenden, Sachspenden |
| Vorstand (Vorsitz, Kasse, Schriftführung) | Rolle „Vorstand“ mit eigenen Rechten |
| Kooperation Musikschule, Partner | Personentyp „Partner (Schule, Orchester, Musikschule)“ |

### Das fehlt noch (Vorschläge, nach Nutzen sortiert)

1. **Austausch & Gastfamilien.** Bei Gegenbesuchen (z. B. Westerstede, Emden, Ausland) braucht es:
   - eine Gastgeberliste: welche Familie nimmt wie viele Gäste auf, Allergien der Gäste;
   - eine Zuordnung Gast ↔ Familie;
   - ein Programm für die Gäste.

   Reisen gibt es schon, Gäste beherbergen noch nicht.
2. **Auftrittsanfragen.** Das Orchester wird an Gemeinden, Kirchen und Veranstaltungen „ausgeliehen“. Ablauf:
   - Anfrage erfassen (wer, wann, wo, welche Besetzung, Honorar/Spende);
   - Leitung sagt zu oder ab;
   - daraus wird automatisch ein Termin mit der passenden Besetzung.
3. **Chronik & Konzertarchiv.** Dazu gehören:
   - über 900 Konzerte, CDs, Schallplatten, Uraufführungen (Moondog, Kilar …), Partnerschaft mit der Neuen Philharmonie Westfalen seit 2017;
   - Konzerte rückblickend mit Programm und Fotos (nur mit Foto-Einwilligung);
   - „Was haben wir schon gespielt?“ hilft auch bei der Programmplanung.
4. **Dokumente-Ablage.** Satzung, Flyer des Fördervereins, Beitrittserklärung, Leihvertrag-Vorlage und Orchesterklassen-Flyer – zum Herunterladen für Eltern und Interessenten.
5. **Partner-Kontakte.** Musikschule, Neue Philharmonie Westfalen, Austauschorchester: Ansprechpartner, letzte Begegnung, nächste Planung.
6. **Dirigier- und Kompositionsversuche.** Dafür reicht eine Kennzeichnung im Programm: „eigene Komposition“ oder „Schüler dirigiert“. Kleiner Aufwand.
7. **Öffentliche Links** in „Über“: Schul-Unterseite, Instagram.

> Die Punkte 1–4 sind echte Lücken im Vereinsalltag. 5–7 sind Kleinigkeiten.

---

## Teil B – Übe-Bühne (Übungsmodus auf der Bühne)

### Idee in einem Satz
Das Kind wählt auf der Bühne sein Instrument und ein Stück oder eine Aufgabe von Frau Jacka. Das Bachkreis-Orchester begleitet es, die Noten laufen mit, und die App hilft mit Tempo, Griffen, Rhythmus und Stimmen. Geübte Minuten landen automatisch im Übe-Tagebuch.

### So sieht es aus
- Auf der **🎭 Bühne** kommt ein neuer Schalter dazu: **„Zuhören“ | „🎻 Üben“**.
- Im Übe-Modus rückt das Orchester nach hinten. Vorne sitzt **der eigene Avatar** (aus „Mein Gesicht“) mit dem eigenen Instrument.
- **Unter der Bühne steht das Notenblatt** aus dem Notensatz. Die gerade gespielte Note leuchtet, wie heute schon beim „Anhören“.
- Darunter liegt eine **große, kindgerechte Knopfleiste**: ▶ Los · ⏸ · 🐢 Tempo · 🔁 Stelle wiederholen · 🥁 Metronom · 🎯 Hilfe.

### Die Übe-Arten

| Art | Was passiert | Technik |
|---|---|---|
| **1. Mitspielen** | Das Orchester spielt die Begleitung, die eigene Stimme ist leise oder stumm. Einzähler, Tempo 50–100 %, Stelle „Takt 5 bis 12“ in Schleife. | `musik.js` + `notensatz.js` (vorhanden) |
| **2. Noten & Griffe** | Note antippen → Ton erklingt, Notenname, **Griffbild**. Violine/Bratsche/Cello: Saite und Finger. Flöte/Klarinette: Griffloch-Bild. Trompete/Horn: Ventile. Posaune: Zug-Position. | SVG je Instrument, Grundlagen der 1. Lage |
| **3. Rhythmus-Trainer** | Ein Rhythmus wird angezeigt und vorgespielt. Das Kind tippt mit (Bildschirm oder Leertaste). Die App zeigt „zu früh / genau / zu spät“ und vergibt bis zu 3 Sterne. Kein Mikrofon nötig. | Zeitmessung im Browser |
| **4. Stimmgerät & Ton halten** *(freiwillig)* | Mit dem Mikrofon erkennt die App die Tonhöhe. Ein Zeiger zeigt „zu tief / genau / zu hoch“. Übungen: Leersaiten stimmen, einen langen Ton gerade halten. | Tonhöhen-Erkennung **nur im Gerät**, nichts wird aufgenommen oder gesendet |
| **5. Ohr-Spiele** | „Welcher Ton ist höher?“, „Klatsch den Rhythmus nach“, Tonleiter erkennen – kurze Spiele für Kleine (Orchesterklasse). | WebAudio |

Belohnung: Nach einer gelungenen Runde verbeugt sich der eigene Avatar, das Orchester applaudiert, Sterne erscheinen und die Übe-Serie 🔥 zählt weiter. **Keine Ranglisten**: Kinder vergleichen sich nicht untereinander, nur mit sich selbst.

### Was Frau Jacka (Leitung/Lehrkräfte) hinterlegen kann
Die vorhandenen **Übeaufgaben** werden zu „Übe-Bühnen-Aufgaben“ erweitert:

| Aufgabe | Eingabe | Kind sieht |
|---|---|---|
| **Notenstelle** | Stück + Stimme, Takt von–bis, Zieltempo (♩ = 80) | Mitspielen mit genau dieser Stelle in Schleife, Tempo steigt in Stufen bis zum Ziel |
| **Rhythmus** | Rhythmus-Baukasten: Notenwerte antippen (𝅝 𝅗𝅥 ♩ ♪ 𝅘𝅥𝅯, Pausen, Punktierung), Taktart, Tempo | Rhythmus-Trainer mit diesem Muster |
| **Tonleiter** | Tonart, Dur/Moll, 1–2 Oktaven, Tempo | Noten werden automatisch gesetzt, mit Griffen, zum Mitspielen |
| **Ton halten / Intonation** | Ton(e), Dauer | Stimmgerät-Übung |
| **Eigenes Material** | PDF der Stimme und/oder eine **Vorspiel-Aufnahme** von Frau Jacka (Handy-Mikro) | Noten ansehen, Vorspiel anhören, mitspielen |

Weitere Angaben je Aufgabe:
- **Für wen:** Person, Register oder Gruppe. Das gibt es schon.
- **Bis wann** und **Ziel**, z. B. 3 Sterne oder Zieltempo erreicht.
- **Kommentar und Smiley-Rückmeldung** der Lehrkraft nach der Abgabe.

**Übersicht für die Lehrkraft** im Handy und am PC:
- je Aufgabe: wer hat geübt, wie oft, bestes Tempo, Sterne;
- Ampel: offen · geübt · Ziel erreicht;
- Eltern sehen dasselbe für ihre eigenen Kinder.

### Datenschutz & Kinderschutz
- **Mikrofon nur auf Knopfdruck.** Die Tonhöhe wird nur im Gerät berechnet. Es gibt **keine Aufnahme und keinen Upload**.
- **Vorspielen an die Lehrkraft** (Kind nimmt sich auf und schickt es) gibt es nur als spätere Option. Dafür braucht es eine eigene Einwilligung der Eltern (neuer Zweck „Übe-Aufnahmen“), Löschfrist 30 Tage, und nur die Lehrkraft sieht die Aufnahme.
- **Gespeichert werden nur Zahlen:** Datum, Minuten, Sterne, bestes Tempo. Kinder sehen nur ihre eigenen Ergebnisse, Eltern die ihrer Kinder, Lehrkräfte und Leitung alle. Der Server prüft das wie bei den Übeaufgaben heute.
- **Urheberrecht:** Automatisch gesetzte Noten und Begleitung gibt es nur für gemeinfreie Stücke, Tonleitern und Rhythmen. Für geschützte Werke lädt die Lehrkraft das PDF hoch (Notenarchiv) und kann ein eigenes Vorspiel aufnehmen. Eine automatische Begleitung gibt es dafür nicht.

### Datenmodell (Erweiterung)
- `uebeaufgaben` bekommt diese neuen Felder:
  - `art` (frei · notenstelle · rhythmus · tonleiter · tonhalten · material)
  - `stimme_id`, `takt_von`, `takt_bis`, `tempo_ziel`
  - `muster` (Rhythmus als JSON), `tonart`, `datei` (PDF/Vorspiel)
  - `ziel_sterne`
- Neue Tabelle `uebe_ergebnisse`:
  - Felder: aufgabe_id, person_id, datum, minuten, sterne, tempo, `rueckmeldung` (Lehrkraft)
  - Server-Regel: Kind schreibt nur eigene, Eltern lesen nur die ihrer Kinder, die Rückmeldung schreibt nur die Lehrkraft.
- Geübte Minuten → `ueben` (Übe-Tagebuch), damit Serie und Statistik wie bisher weiterlaufen.

### Technik & Kosten
- **Alles läuft im Browser:** Web Audio, die vorhandene Musik-Engine und der Notensatz. Es funktioniert **offline** und ohne neue Dienste, also **0 €**.
- **Neue Bausteine:**
  - `js/kern/griffe.js` (Griffbilder)
  - `js/kern/rhythmus.js` (Muster setzen, Tippen auswerten)
  - `js/kern/stimmton.js` (Tonhöhe per Autokorrelation)
  - `js/app/uebebuehne.js` (Bühnen-Modus)
- **Grenzen:**
  - Die Tonhöhen-Erkennung funktioniert gut bei einstimmigen Instrumenten, nicht bei Pauke oder Schlagwerk. Dort gibt es nur den Rhythmus-Trainer.
  - Griffbilder gibt es zunächst nur für die Grundlagen (1. Lage bzw. Grundgriffe).

### Ausbaustufen
| Version | Inhalt |
|---|---|
| **0.26** | Übe-Modus auf der Bühne: Mitspielen mit Tempo und Schleife, Rhythmus-Trainer, Aufgaben „Notenstelle“ und „Rhythmus“ mit Baukasten, Ergebnisse, Minuten ins Übe-Tagebuch |
| **0.27** | Griffbilder für alle Orchesterinstrumente, Tonleiter-Aufgaben, Stimmgerät und „Ton halten“ (Mikrofon, nur lokal) |
| **0.28** | Lehrkraft-Übersicht und Rückmeldung am PC, Ohr-Spiele für die Orchesterklasse, Vorspiel-Aufnahme der Lehrkraft |
| später | Freiwillig: Kind schickt eine Aufnahme an die Lehrkraft (nur mit Eltern-Einwilligung) |
