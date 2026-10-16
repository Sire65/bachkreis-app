# Konzept-Check Bachkreis (Stand 0.27.0, 16.10.2026)

Gesamtprüfung: Was braucht ein Schul-/Jugendorchester mit Förderverein, was hat die App schon, was fehlt noch?
Rechte werden auf dem Server durchgesetzt (`supabase/functions/_shared/regeln.js`); was die Oberfläche nur ausblendet, gilt hier als **nicht** geschützt.

## Das Rollen-Konzept in Kürze

| Wer | sieht | darf |
|---|---|---|
| **Leitung / Admin** | alles | alles, Zugänge, Einstellungen, Freigaben |
| **Lehrkräfte** | alle Stammdaten, Termine, Rückmeldungen | Termine, Gruppen, Noten, Genehmigungen anlegen |
| **Vorstand Förderverein** | Stammdaten, Spenden, Einkauf, Inventar | Spenden, Einkauf, Inventar, Reparatur-Freigaben |
| **Instrumentenwart / Notenwart** | Stammdaten, Inventar bzw. Noten | Inventar, Ausleihe, Reparatur bzw. Werke/Stimmen/PDFs |
| **Terminplaner** | alle Termine und Rückmeldungen | Termine anlegen und ändern |
| **Schüler (Kinder)** | eigene Orchester-Termine, „für alle“, eigene Termine, eigene Stimmen, eigenes Leihinstrument, Pinnwand, Chat | antworten, üben eintragen, Schaden melden |
| **Eltern** | alles der eigenen Kinder | für die Kinder antworten, Genehmigungen erteilen/widerrufen, Änderungen melden |
| **Ehemalige** | Ehemaligen-Orchester | antworten |

Die Abläufe Termine → Zusage/Absage → Ampel → Erinnerung, Nachrichten/Pinnwand mit Kinderschutz-Regel, Instrumente → Ausleihe → Reparatur → Freigabe, Noten nach Orchester/Register und Genehmigungen mit Textfassung passen zusammen.

## In 0.19.0 behoben

- ✅ **Ausgetretene** (`personen.status = ausgetreten`) können sich nicht mehr anmelden, bestehende Sitzungen enden (`api.js`).
- ✅ **Stimmen „nur Gruppe“** sieht nur diese Gruppe (vorher sah sie das ganze Register, `regeln.js`).
- ✅ **Reparatur erledigt** setzt ein noch verliehenes Instrument wieder auf „verliehen“, nicht auf „verfügbar“ (`instrumente.js`).
- ✅ **Inventar-Status** um defekt, vermisst, gestohlen, verkauft, verschrottet, im Einsatz erweitert; ausgeschiedene Instrumente fallen aus „Alle“, Wartung und Instrumentenkunde heraus.
- ✅ **Weiteres Inventar** (Notenständer, Taktstock …) mit Abschreibung, Inventur, Etiketten, Anlagenverzeichnis – siehe FEATURES.md.

## In 0.20.0 umgesetzt (alle „Muss“)
- ✅ Kinderschutz im Chat (nur Leitung/Lehrkräfte, Eltern in Kopie) · ✅ Freigabegrenze auf dem Server · ✅ Need-to-know je Rolle · ✅ interne Vermerke nur intern · ✅ Gesundheit & Notfall strukturiert mit Begleiter-Zugriff und Löschfrist · ✅ Foto-Einwilligung je Zweck + Foto-Liste · ✅ Anwesenheit mit Fehlzeiten

## In 0.21.0 umgesetzt (alle „Sollte“)
- ✅ Registerproben · ✅ Registerführer · ✅ Leihvertrag mit Kaution/Gebühr/Zubehör, Ausleihe an Lehrkräfte/Ehemalige · ✅ Eltern-Selbstpflege & 18+ · ✅ Konzertprogramm, Kleiderordnung, Treffpunkt, Transportliste · ✅ Reise-Anmeldung · ✅ Schuljahreswechsel nach Regeln · ✅ Auskunft über alle Tabellen, Löschfristen · ✅ Ehemalige in Pinnwand/Chat

## In 0.22.0 umgesetzt (alle „Kann“ und Inventar-Schritte)
- ✅ Mitfahrgelegenheiten · ✅ Räume & Schlüssel · ✅ Papier-Notenexemplare · ✅ Mietmaterial-Fristen & GEMA-Liste · ✅ Übeaufgaben · ✅ Förderverein-Mitgliedschaft · ✅ Führungszeugnis-Vermerk · ✅ Werkstatt-Auftrag per Mail · ✅ Reparatur für Ausstattung · ✅ Einkauf → Inventar/Ausstattung · ✅ Sachspenden ↔ Inventar · ✅ automatische Löschfrist für Gesundheitsangaben

## In 0.25.0: Prüfung mit externen Werkzeugen (aus Git)
- ✅ **axe-core** (KC-Infrastructure-Control-Center): alle Ansichten × alle Demo-Rollen + PC-Programm – 0 Verstöße gegen WCAG 2.1 A/AA (vorher ≈ 350, v. a. Kontrast und fehlende Feldnamen)
- ✅ **db_monitor** (KC-System-Check): RLS auf jeder Tabelle, keine ungedeckten Rechte für anon/authenticated, keine RLS-umgehenden Views, Definer-Funktionen mit festem search_path – „healthy“
- ✅ **ESLint** (Regeln des KICC): 0 Fehler; 67 Hinweise auf ungenutzte Importe/Variablen bleiben als Aufräum-Liste
- ➖ Testlabor-Internettumgebung prüft die KC-Kommunikation (nicht den Bachkreis) – nicht anwendbar

## In 0.26.0 / 0.27.0
- ✅ **Übe-Bühne** (Mitspielen, Griffe, Rhythmus, Stimmgerät, Ohr-Spiele, Übe-Aufgaben mit Fortschritt) – siehe KONZEPT-UEBEBUEHNE.md Teil B
- ✅ **Abgleich mit der Internetseite**: Chronik & Repertoire, Dokumente, Austausch & Gastfamilien, Auftrittsanfragen, Partner, Dirigier-/Kompositionsversuche – Teil A

> Damit ist die Liste unten abgearbeitet. Bewusst nicht gebaut: Lastschrift/SEPA (Konzept: kein Zahlungsverkehr in der App) und eine Ausleihe von Ausstattung über die App (läuft über die PC-Verwaltung).

## Ursprüngliche Liste (Stand 0.19.0)

### Muss (Datenschutz, Kinderschutz, Sicherheit)
1. **Kinderschutz im Chat:** Jede Verwalter-Rolle (auch Notenwart, Instrumentenwart, Vorstand – oft selbst Eltern) darf einem Kind privat schreiben (`schema.js` `chatPartnerErlaubt`). Vorschlag: Einzelchats Erwachsener mit Kindern nur Leitung/Lehrkräfte, Eltern automatisch in Kopie (Vier-Augen-Prinzip).
2. **Freigabegrenze auch auf dem Server:** Die Reparatur-Freigabegrenze (`konfig.freigabe_grenze_eur`) prüft nur die App; der Server lässt Instrumentenwart/Leitung jeden Betrag freigeben.
3. **Need-to-know:** Instrumentenwart, Notenwart und Vorstand lesen alle Personendaten (Adressen, Geburtsdaten der Kinder), Genehmigungen und Rückmeldungen. Vorschlag: Feldfilter je Rolle (Instrumentenwart: Name + Kontakt).
4. **Interne Texte:** Bemerkungen `grund` (Gruppen-Zuordnung) und `niveau` (Instrumente je Person) sowie die Projekt-Checkliste gehen an alle Schüler/Eltern und sind nur in der Oberfläche versteckt.
5. **Gesundheit & Notfall strukturiert:** Allergien, Medikamente, Krankenkasse, Notfallkontakt statt Freitext; Zugriff für Begleitpersonen nur für die Dauer einer Reise; Löschdatum.
6. **Foto-Einwilligung je Zweck** (Website, Presse, Social Media) als Genehmigungsvorlagen mit Datum, Fassung und Widerruf statt eines Ja/Nein-Feldes.
7. **Anwesenheit:** neben anwesend ja/nein auch entschuldigt, unentschuldigt, verspätet; Fehlzeiten-Übersicht je Person/Register (Cockpit + PC).

### Sollte
- Registerproben im Terminformular anlegen können (Feld `register` gibt es, aber kein Eingabefeld).
- Registerführer bekommt eine Funktion (Rückmeldungen/Ampel des eigenen Registers).
- Leihvertrag fest mit der Ausleihe verknüpfen; Kaution, Leihgebühr, Zubehör (Bogen, Koffer); Ausleihe auch an Lehrkräfte/Ehemalige.
- Eltern pflegen Kontaktdaten der Kinder selbst; ab 18 Jahren keine automatischen Elternrechte.
- Konzertprogramm mit Reihenfolge, Solisten, Pause, Gesamtdauer; Kleiderordnung, Treffpunkt, Transportliste (aus dem Inventar).
- Reisen: Anmeldung, Zimmer, Kosten, „bezahlt“.
- Schuljahreswechsel über Regeln statt feste Kürzel; beim Wechsel zu „Ehemalige“ offene Ausleihen und Eltern-Verknüpfungen prüfen.
- Datenauskunft (Art. 15) über alle Tabellen, nicht nur Personendaten; Löschfristen nach Austritt.
- Ehemalige auch für Pinnwand und Chat zulassen.

### Kann
- Mitfahrgelegenheiten je Termin · Räume und Schlüssel · Papier-Notenexemplare mit Ausgabe/Rückgabe · Mietmaterial-Fristen und GEMA-Liste · Übeaufgaben der Lehrkräfte · Fördervereins-Mitgliedschaft · Vermerk Führungszeugnis · Werkstatt-Auftrag per Mail über den Communicator.

### Inventar – nächste Schritte
- Reparaturen und Ausleihen auch für Ausstattung (z. B. Notenständer zur Reparatur, Beamer ausleihen).
- Einkauf „inventarisiert“ legt den Inventar-Datensatz automatisch an (für Instrumente gibt es das schon).
- Sachspenden mit dem Inventar verknüpfen.
