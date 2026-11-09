# Auftragsverarbeiter (Art. 28 DSGVO) – Muster-Liste

Jeder Dienstleister, der Mitgliederdaten im Auftrag speichert oder verarbeitet, braucht einen **Auftragsverarbeitungsvertrag (AVV/DPA)**.
Bei den meisten Anbietern wird er online im Konto abgeschlossen (kostenlos). Bitte als PDF ablegen und hier das Datum eintragen.

| Dienstleister | Aufgabe | Daten | Standort | AVV wo? | abgeschlossen am |
|---|---|---|---|---|---|
| Supabase Inc. | Datenbank, Server-Funktionen, Dateien | alle App-Daten | EU (Frankfurt) | Dashboard › Organization › Legal Documents (DPA) | ________ |
| Neon Inc. | tägliche Sicherungskopie | Kopie der Datenbank | EU (Frankfurt) | neon.tech › Legal › DPA | ________ |
| Backblaze Inc. | verschlüsselte Langzeit-Sicherung | verschlüsselte Kopie | EU (Amsterdam) | Konto › DPA | ________ |
| Brevo (Sendinblue SAS) | E-Mail-Versand (Einladungen, Erinnerungen) | Name, E-Mail, Nachrichtentext | EU (Frankreich) | Konto › Sicherheit › DPA | ________ |
| GitHub Inc. (Pages) | stellt die App-Dateien bereit | keine Mitgliederdaten (nur Programm) | weltweit | nicht nötig (keine personenbezogenen Daten) | – |
| Cloudflare (optional) | Weiterleitung / Schutz | Internet-Adressen | EU/weltweit | Dashboard › DPA | ________ |

Hinweise:
- Bei US-Firmen auf **EU-Rechenzentrum** und Standardvertragsklauseln / EU-US Data Privacy Framework achten.
- Neue Dienstleister erst nach Eintrag hier und in der Datenschutzerklärung (`js/app/datenschutz.js`, Abschnitt 5) nutzen.
- Konten des Bachkreises von denen des KC trennen (eigene Zugänge, eigene Geheimnisse – siehe `docs/KONTEN.md`).
