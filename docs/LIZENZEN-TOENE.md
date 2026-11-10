# Töne und Aufnahmen in der Bachkreis-App

Alle Aufnahmen sind frei verwendbar, gekürzt und in der Lautstärke angepasst (mono MP3, Ordner `ton/`). Sie werden erst beim ersten Gebrauch geladen.
Die gleichen Angaben stehen in der App unter ⚙️ Einstellungen › ✨ Effekte › 🕰️ Stundenuhr › „📜 Quellen der Aufnahmen“.

| Datei | Was | Urheber | Lizenz | Quelle |
|---|---|---|---|---|
| kuckuck-ruf.mp3 | Kuckucksuhr | freesound.org/s/128177 | CC0 | https://freesound.org/s/128177 |
| uhr-bigben-melodie.mp3, uhr-bigben-schlag.mp3 | Big Ben, Westminster-Melodie und Stundenschlag (Radio Oranje, Neujahr 1945) | Great Brightstar (Hochlader) | gemeinfrei | https://commons.wikimedia.org/wiki/File:Westminster_chimes_(1_January_1945).wav |
| uhr-carillon-melodie.mp3, uhr-carillon-schlag.mp3 | Westminster-Melodie vom Carillon | Max.metz | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Westminster-vom-Carillon_MaxMetz.wav |
| uhr-roehren-schlag.mp3 | Standuhr aus Röhrenglocken | gsb1039 | CC0 | https://commons.wikimedia.org/wiki/File:415061_gsb1039_clock-chime-tubebells-handbells-vibes.wav |
| uhr-standuhr-ticken.mp3, uhr-standuhr-schlag.mp3 | Große Standuhr in London-Hackney | radio aporee (Aufnahme 52813) | gemeinfrei (Public Domain Mark 1.0) | https://archive.org/details/aporee_52813_60333 |
| uhr-kiel.mp3 | Glockenspiel im Kieler Rathausturm | Michael Brandtner | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Glockenspiel_Kieler_Rathausturm.flac |
| uhr-berlin.mp3 | Geläut des Berliner Doms (2016) | Morn | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Berlin_Cathedral_bells,_2016.wav |
| uhr-freiburg.mp3 | Glockenspiel am Neuen Rathaus Freiburg | Andreas Schwarzkopf | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Neues_Rathaus_Freiburg,_Glockenspiel.mp3 |

## 🎻 Instrumentenklänge (0.34.0) – Ordner `ton/instrumente/`

Alle 149 Dateien stammen aus **VS Chamber Orchestra 2 – Community Edition** von Versilian Studios
(aufgenommen von Sam Gossner & Simon Dalzell, Schnitt Elan Hickler/Soundemote; Klavier: Simon Dalzell / Ivy Audio),
Quelle: https://github.com/sgossner/VSCO-2-CE · Lizenz: **CC0 1.0** (gemeinfrei – Weitergabe und Änderung ohne Bedingungen; Nennung erwünscht).
Bearbeitet: Stille am Anfang entfernt, auf 2,5–3 s gekürzt, ausgeblendet, Lautheit angeglichen (−18 LUFS), mono MP3.

| Ordner | Instrument (VSCO-Ordner) |
|---|---|
| violine | Solo Violin, Arco Vib, forte |
| viola | Viola Section, sustain vibrato |
| cello | Cello Section, sustain vibrato |
| bass | Solo Contrabass, sustain vibrato |
| floete · oboe · klarinette · fagott | Flute susvib · Oboe Vib · Clarinet susLong · Bassoon vib |
| trompete · horn · posaune · tuba | Trumpet susvib · F Horn sus · Tenor Trombone sus · Tuba sus |
| harfe · klavier · glockenspiel | Harp · Upright Piano (dyn2) · Glock |
| pauke · trommel | Timpani Hit · Snare (VSCO 1 Percussion) · Crash-Becken |

Neu erzeugen: `VSCO=~/vsco python3 tools/klangproben/bauen.py` (braucht ffmpeg und einen Teil-Klon des VSCO-Repositorys) – schreibt die Dateien und `js/kern/klangproben.js`.

Selbst erzeugt (WebAudio, keine Aufnahme): Ersatzklang der Instrumente (offline/vor dem Laden), Ersatzglocken der Stundenuhren, Metronom-Klick, Timer-Gong, „Happy Birthday“ (Melodie gemeinfrei).

## Karte (0.36.0)

`bilder/weltkarte.json` (Chronik › Orte): Land-Umrisse aus **Natural Earth 1:50m Land** – gemeinfrei (public domain), naturalearthdata.com. Vereinfacht und als SVG-Pfad gespeichert mit `python3 tools/weltkarte.py ne_50m_land.geojson bilder/weltkarte.json`. Stadt-Koordinaten in `js/kern/orte.js`: gerundete Stadtmitten (Fakten, keine geschützten Daten).

## PDF-Anzeige (0.40.0)

`lib/pdfjs/` – **pdf.js 4.10.38** (Mozilla Foundation, Apache License 2.0, Lizenztext in `lib/pdfjs/LICENSE`), unveränderter „legacy build“ aus pdfjs-dist, übernommen aus der KC Club App. Wird erst beim ersten Öffnen eines PDFs geladen; nichts kommt von fremden Servern.

`lib/jsqr/` – **jsQR 1.4.0** (Cosmo Wolfe, Apache License 2.0, Lizenztext in `lib/jsqr/LICENSE`), unveränderte Datei `dist/jsQR.js` aus dem npm-Paket – liest QR-Codes aus dem Kamerabild (🔍 Ausweis prüfen, 0.62.0), nur wenn der Browser keinen eigenen QR-Leser hat (z. B. iPhone).

## Beispielbilder und Beispiel-PDF (0.40.0)

`bilder/demo/*.svg` (Fotoalbum der Vorführversion) und `bilder/demo/probenplan.pdf` sind selbst erzeugt (keine echten Fotos, keine erkennbaren Personen) – frei verwendbar.
