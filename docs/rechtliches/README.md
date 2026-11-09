# ⚖️ Rechtliches – Unterlagen für den Vorstand (Muster, Stand 09.11.2026)

Diese Unterlagen sind **Muster**. Sie beschreiben, wie die Bachkreis-App mit Daten umgeht, und helfen dem Vorstand,
die Pflichten nach DSGVO zu erfüllen. Vor dem Echtbetrieb bitte vom Vorstand prüfen, ergänzen (Namen, Anschrift,
Ansprechpartner) und – wenn möglich – von einer fachkundigen Person (Datenschutzberatung des Landesmusikrats,
Kirchengemeinde/Träger, Rechtsanwalt) gegenlesen lassen. Die App ersetzt keine Rechtsberatung.

| Datei | Wofür | Pflicht? |
|---|---|---|
| `VERARBEITUNGSVERZEICHNIS.md` | Was wird wofür, wie lange, an wen verarbeitet (Art. 30 DSGVO) | ja |
| `DSFA-KURZ.md` | Kurze Risikoabschätzung (Kinderdaten, Gesundheitsangaben, Chats) | empfohlen |
| `AUFTRAGSVERARBEITUNG.md` | Liste der Dienstleister und ihrer AV-Verträge (Art. 28) | ja |
| `LOESCHKONZEPT.md` | Fristen und wie gelöscht wird | ja |

In der App:
- **⚖️ Datenschutz** (Kachel unter Technik, Link unter ⚙️ › Impressum): Datenschutzerklärung und Nutzungsregeln, druckbar als PDF.
- **Zustimmung beim ersten Start**: Datenschutz + Regeln bestätigen; Eltern bestätigen auch für Kinder unter 16. Ändert sich die Fassung
  (`DS_VERSION` in `js/kern/schema.js`), wird erneut gefragt.
- **✅ Zustimmungen** (Leitung/Vorstand/Admin): Nachweis, wer wann welche Fassung bestätigt hat; druckbar.
- **🔐 Meine Daten**: Auskunft und Export für jede Person selbst.

Was der Vorstand noch erledigen muss:
1. Impressum-Angaben in der PC-Verwaltung eintragen (füllt auch Abschnitt 1 der Datenschutzerklärung).
2. AV-Verträge mit den Dienstleistern abschließen (bei Supabase, Neon, Backblaze, Brevo online im Konto).
3. Verzeichnis und Löschkonzept unterschreiben und aufbewahren; jährlich prüfen.
4. Fotoerlaubnis und Notfall-Gesundheitsangaben bleiben **eigene Einwilligungen** (in der App je Zweck, widerrufbar).
