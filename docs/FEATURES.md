# Funktionen (Feature-IDs aus dem Konzept)

Stand v0.1.0 DEV (Vorführversion). DoD = Definition of Done.

**Erklärung der Spalte „Stand“:**
- ✅ in der Vorführversion umgesetzt und getestet
- 🟡 vorbereitet bzw. simuliert
- ⏳ offen

| ID | Funktion | Stand | Test |
|---|---|---|---|
| BK-F01 | Teilnehmerverwaltung, Register/Gruppen-Registry | ✅ | logik: Demodaten/Pflichtfelder |
| BK-F02 | Link-/QR-Login, Rollen | ✅ Code-Login, QR-Karten · 🟡 Server-Hash | Rundgang |
| BK-F03 | Terminarten-Registry, Einzel- & Serientermine, Projekte | ✅ | Rundgang |
| BK-F04 | Zusage/Vielleicht/Absage, Notiz, Frist, Abwesenheit | ✅ | Rundgang |
| BK-F05 | Terminplan Liste/Monat, Filter | ✅ | Rundgang |
| BK-F06 | Besetzungsampel (grau = unbekannt) | ✅ | logik: Ampel, Mehrfach-Instrumente |
| BK-F07 | Push | 🟡 simuliert, lokale Benachrichtigung auf dem Gerät | – |
| BK-F08 | E-Mail | 🟡 simuliert (Brevo-Adapter folgt) | – |
| BK-F09 | WhatsApp-Übergabe | ✅ | logik: waLink |
| BK-F10 | ICS-Export | ✅ Datei · ⏳ Abo-Feed (Server) | logik: ICS |
| BK-F11 | Instrumente: Katalog, Inventar, Ausleihe | ✅ | Rundgang |
| BK-F12 | Präsenzliste | ✅ in Termin-Detail | – |
| BK-F13 | Auswertungen + Export | ✅ Kennzahlen, CSV · ⏳ Berichte | logik: CSV |
| BK-F14 | Terminfindung (Doodle) | ⏳ | – |
| BK-F15 | Mitfahrgelegenheiten | ⏳ | – |
| BK-F16 | Notenarchiv, „Meine Noten“ | ✅ Metadaten · ⏳ PDF-Speicher | Rundgang |
| BK-F17 | Offline-/Notbetrieb | 🟡 App startet offline (SW) · ⏳ signierte Vorab-Antworten | – |
| BK-F18 | Mandantenfähigkeit | ⏳ optional | – |
| BK-F19 | Gruppen A–D, Wechsel generell/temporär, Wechselwunsch | ✅ | logik: temporär/generell |
| BK-F20 | Mehrere Instrumente, Wahl je Termin | ✅ | logik |
| BK-F22 | Personen-/Rollenmodell inkl. Eltern↔Kind | ✅ | logik: Verteiler |
| BK-F23 | Leitungs-Cockpit | ✅ | logik: Cockpit |
| BK-F24 | Vorgänge & Aufgaben | ✅ | Rundgang |
| BK-F25 | Kommunikation: Verteiler, Vorlagen, Rückmeldung, Versandprotokoll | ✅ | Rundgang |
| BK-F26 | Genehmigungen der Eltern | ✅ | logik: überfällig |
| BK-F27 | Konzerte & Projekte mit Checkliste | ✅ | Rundgang |
| BK-F28 | Reisen/Probenfreizeiten (Zimmer, Notfallinfos mit Auto-Löschung) | ⏳ (Genehmigung + Termin vorhanden) | – |
| BK-F29 | Reparatur mit Freigabegrenze | ✅ | Rundgang |
| BK-F30 | Einkauf / Beschaffung | ✅ | Rundgang |
| BK-F31 | Spender & Dank | ✅ | Rundgang |
| BK-F32 | Inventur per QR | ⏳ | – |
| BK-F33 | Schuljahreswechsel | ✅ (Verwaltung) | – |
| BK-F34 | Datenschutz: Auskunft, Export, Audit | ✅ Auskunft/Export/Protokoll · ⏳ Löschfristen | – |
| BK-F35 | PC-Verwaltung inkl. Zugänge, Import/Export, Abgleich | ✅ | Rundgang |
