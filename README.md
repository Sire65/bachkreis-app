# Bachkreis-App

Verwaltungs- und Termin-App für den **Bachkreis Bergkamen**. Die App bündelt Proben, Konzerte, Zusagen, Nachrichten, SOS, Instrumente, Noten, Genehmigungen und Förderverein. Dazu gehört eine **PC-Verwaltung** für Stammdaten und Zugänge.

> **Stand: Vorführversion 0.1.0 DEV.** Alle Personen sind erfunden, die Daten liegen nur im Browser. Push und E-Mail sind simuliert, die WhatsApp-Übergabe funktioniert echt.

## Starten

```bash
npm start                # oder: python3 -m http.server 8080
# App:          http://localhost:8080/index.html
# Verwaltung:   http://localhost:8080/verwaltung.html
npm test                 # Vertrags- und Logiktests (ohne Abhängigkeiten)
```

Oben in der App wechselt **„Ansicht als“** zwischen Leitung, Lehrkraft, Förderverein, Schüler/in und Eltern.
**Technik › Demo zurücksetzen** erzeugt die Demodaten neu.

## Aufbau

| Teil | Inhalt |
|---|---|
| `index.html`, `js/app/` | App fürs Handy. Register **Bachkreis · Meins · Technik · Admin** mit Kacheln, nach Vorbild der KC Club App. |
| `verwaltung.html`, `js/verwaltung/` | PC-Verwaltung: Tabellen, Formulare, Zugänge & QR-Karten, Gruppen-Board, Schuljahreswechsel, CSV-Import/-Export, Abgleich. |
| `js/kern/schema.js` | **Tabellen-Registry**. Daraus entstehen Formulare, Listen, CSV und das Supabase-Schema. |
| `js/kern/daten.js` + `adapter-*.js` | Datenfassade mit austauschbaren Adaptern: `lokal-demo` (IndexedDB) jetzt, `supabase` vorbereitet. |
| `js/kern/logik.js` | Fachlogik: Gruppen, Besetzungsampel, Cockpit, Verteiler, ICS, CSV. Rein und getestet. |
| `js/kern/versand.js` | Versand-Dienst mit Kanal-Adaptern: Push, Mail, App, WhatsApp-Übergabe. |
| `supabase/migrations/` | Grundschema `bk_*`, **erzeugt** mit `npm run schema`. |
| `sw.js` | Service Worker mit **atomarem Update**: neue Version erst nach „Jetzt aktualisieren“. |
| `tests/` | Vertragstests (Version, SW-Dateiliste, Secrets, Aktionen/Ansichten, Migration), Logiktests und Browser-Rundgang. |

## Regeln

Es gilt der Entwicklervertrag in [`AGENTS.md`](AGENTS.md):

- keine kostenpflichtigen Dienste
- Registry + Adapter
- UNKNOWN nie als OK
- jede Änderung erhöht die Version (`js/kern/version.js`, `version.json`, `sw.js`, `?v=` in den HTML-Dateien, `package.json`)

## Dokumentation

- [Konzept](docs/KONZEPT.md): Gesamtkonzept, Recherche, Module
- [Architektur](docs/ARCHITEKTUR.md): Adapter, Abgleich, Rollen, Sicherheit
- [Funktionen](docs/FEATURES.md): Feature-IDs und Stand
- [Konten](docs/KONTEN.md): eigene kostenlose Konten des Bachkreises (Checkliste)
