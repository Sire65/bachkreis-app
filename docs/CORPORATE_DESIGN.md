# 🎨 Corporate Design Bachkreis Bergkamen

Gilt für alles, was die App druckt oder als PDF erzeugt (Druckvorschau `js/app/druckvorschau.js`, Konstante `CD`) – und als Richtschnur
für Briefe, Aushänge und Schilder. Seit App 0.54.0.

## Marke
| Element | Wert |
|---|---|
| Logo | `icons/logo.png` (Bachkreis-Kreis mit Notenschlüssel-Schrift), immer unverzerrt, links im Kopf, 42 px hoch (≈ 11 mm) |
| Name | **Bachkreis Bergkamen** (aus der Konfiguration `name`), fett |
| Untertitel | *Jugendsinfonieorchester* (Konfiguration `untertitel`), in Dunkelgold |

## Farben
| Name | Hex | Verwendung |
|---|---|---|
| Gold | `#f2b705` | Linie unter dem Kopf, Linie über dem Fuß, Akzentbalken an Überschriften |
| Dunkel | `#1a1500` | Text, Name im Kopf, „Seite 1/2“ |
| Dunkelgold | `#8a6400` | Untertitel, Name im Fuß |
| Grau | `#555555` | Datum, Dokumentname im Fuß |
| Hellgold | `#fdf3cc` | Tabellenköpfe, Hinweis-Felder |

## Schrift
Systemschrift ohne Serifen (`system-ui, -apple-system, Segoe UI, Roboto, Arial`) – auf jedem Gerät vorhanden, nichts wird nachgeladen.
Fließtext 14 px (≈ 10,5 pt), Überschriften 19 / 15,5 px, Kopf/Fuß 10,5–16 px.

## Seite (A4 hoch oder quer)
- Ränder links/rechts **15 mm**.
- **Kopf auf jeder Seite:** Logo · **Bachkreis Bergkamen** · *Jugendsinfonieorchester* – rechts das Datum – darunter die Goldlinie (2 px).
- **Fuß auf jeder Seite:** dünne Goldlinie, darunter in drei Spalten
  - **links:** Name des Dokuments (z. B. „Leihvertrag LV-2026-001“),
  - **Mitte:** **Seite 1/2**,
  - **rechts:** Bachkreis Bergkamen.
- Seitenwechsel nur zwischen Zeilen und Blöcken, nie direkt nach einer Überschrift.

## So entsteht es
Die App setzt die Seiten selbst (Inhalt → Satzbreite 680 px → Seitenbilder mit Kopf und Fuß). Vorschau, **🖨️ Drucken** und **📄 PDF**
verwenden genau dieselben Seiten – was man sieht, kommt aufs Papier. Kein fremder Dienst, keine Bibliothek außer html2canvas (MIT, liegt in `lib/`).
