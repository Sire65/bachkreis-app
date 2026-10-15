# Architektur

## Grundsätze
- **Eine Quelle für die Struktur:** `js/kern/schema.js` beschreibt alle Tabellen.
  - Daraus entstehen die Formulare und Listen der PC-Verwaltung, der CSV-Import/-Export und die Supabase-Migration (`tools/schema-sql.mjs`).
  - Der Vertragstest prüft, dass die Migration zum Schema passt.
- **Adapter statt fester Anbieter** (AGENTS.md Regel 4/18):
  - Daten: `lokal-demo` / `supabase`
  - Versand: Push / Mail / App / WhatsApp
  - Speicher für Noten (geplant): Supabase Storage / Cloudflare R2
  - Anmeldung: Link-Code / IServ (vorbereitet)
- **Ohne Build-Schritt:** ES-Module wie in der Club-App, aber in Bereiche aufgeteilt statt eines großen Monolithen.

## App und PC-Verwaltung
```
 Handy (index.html)                PC/Notebook (verwaltung.html)
 Termine, Zusagen, Nachrichten,    Adressen, Eltern↔Kind, Instrumente,
 SOS, Cockpit, Meine Noten …       Inventar, Gruppen, Zugänge, Import/Export
            \                           /
             └──── js/kern/daten.js ───┘   (gleiche Fassade, gleiche Tabellen)
                         │
          lokal-demo (IndexedDB + BroadcastChannel)   ← Vorführversion
          supabase  (Edge Function bk-api)            ← Echtbetrieb
                         │
                 Spiegel → Neon,  Backup → B2
```

## Abgleich
- **Abgleich-Spalten:** Jede Zeile hat `id`, `version`, `erstellt_am`, `geaendert_am`, `geaendert_von` und `geloescht_am`.
- **Weiches Löschen:** Gelöschte Zeilen bleiben mit Löschdatum stehen, damit die Löschung an andere Geräte und den Spiegel weitergegeben wird.
- **Protokoll:** Jede Änderung landet in `aenderungen` (Tabelle, Datensatz, Aktion, wer, Quelle: App, Verwaltung oder Import).
- **Vorführversion:** App und Verwaltung im selben Browser teilen sich die IndexedDB. Änderungen werden per BroadcastChannel sofort im anderen Fenster sichtbar.
- **Echtbetrieb:**
  - Supabase ist die führende Datenbank.
  - Die App lädt nur Änderungen seit `geaendert_am`.
  - Ein Spiegel-Job schreibt nach Neon (Muster: `kc-db-mirror-worker` der Club-App).

## Rollen und Rechte
| Rolle | App | PC-Verwaltung |
|---|---|---|
| Leitung / Admin | alles, Cockpit, Admin-Register | alles, auch Zugänge und Einstellungen |
| Lehrkraft | Termine anlegen, Genehmigungen, Orchester | Stammdaten lesen und schreiben (ohne Zugänge) |
| Vorstand Förderverein | Förderverein, Freigaben über der Grenze, Cockpit Förderverein | Inventar, Einkauf, Spenden |
| Instrumentenwart / Notenwart | Instrumente / Noten | jeweilige Tabellen |
| Schüler | eigene Termine, Noten, Leihinstrument, Wechselwunsch | – |
| Eltern | nur eigene Kinder: Zusagen, Genehmigungen, Leihinstrumente | – |

- Die Rechte je Tabelle stehen in `schema.js` (`lesen`/`schreiben`).
- Geschützte Felder wie Gesundheitsangaben sieht nur, wer die Rolle Leitung oder Lehrkraft hat.

## Sicherheit
- Keine Geheimnisse im Browsercode; ein Vertragstest prüft das.
- CSP mit `script-src 'self'` und ohne Inline-Handler.
- **Anmeldung:** über einen persönlichen Code bzw. QR-Link, wie in der Club-App.
  - Der Code wird nach der Anmeldung aus der Adresszeile entfernt.
  - Im Echtbetrieb speichert der Server nur einen Hash (`code_hash`).
- **Supabase:** RLS ist auf allen Tabellen aktiv, ohne Policies. Damit ist der Zugriff für `anon` und `authenticated` gesperrt; er läuft nur über die Edge Function `bk-api`.
  - Feinere Policies kommen als zweite Verteidigungslinie mit dem Adapter.
- **Kritische Aktionen** (Schuljahreswechsel, Import) laden vorher automatisch eine Sicherung herunter.

## Update (AGENTS.md Regel 16)
- `sw.js` cached pro Version **alle** Dateien.
- Eine neue Version wartet, bis jemand „Jetzt aktualisieren“ tippt; dann `skipWaiting` und Neuladen. Es gibt keinen Mischstand.
- Der Vertragstest stellt sicher, dass jede Datei in der Liste steht.
