# Kurze Risikoabschätzung (angelehnt an Art. 35 DSGVO) – Muster

Eine vollständige Datenschutz-Folgenabschätzung ist für einen kleinen Verein meist nicht vorgeschrieben. Weil die App aber
**Daten von Kindern**, **Gesundheitsangaben** (Notfallpass) und **Chats** verarbeitet, empfiehlt sich diese kurze Abschätzung.

| Risiko | Wie wahrscheinlich | Wie schwer | Maßnahme in der App | Rest-Risiko |
|---|---|---|---|---|
| Fremde lesen Mitgliederdaten | gering | hoch | persönlicher Zugangscode, Server prüft jede Zeile nach Rolle, Sperre nach Fehlversuchen, Sicherheits-Check | gering |
| Kinder werden von Erwachsenen privat angeschrieben | mittel | hoch | Kinder chatten privat nur mit Leitung, Lehrkräften, Eltern; Melden-Knopf; kein Geheim-Chat für Kinder | gering |
| Fotos werden nach außen weitergegeben | mittel | mittel | Foto-Einwilligung je Zweck, Nutzungsregeln, Wasserzeichen-freie interne Ablage | mittel (organisatorisch) |
| Gesundheitsangaben gelangen an Unbefugte | gering | hoch | nur Leitung/Fahrtbetreuung, Ablaufdatum, Einwilligung widerrufbar | gering |
| Datenverlust | gering | mittel | tägliche Sicherung (Neon), verschlüsselte Kopie (Backblaze), Notbetrieb | gering |
| Dienstleister außerhalb der EU | gering | mittel | Rechenzentren in der EU gewählt; AV-Verträge | gering |
| Verlorenes Handy | mittel | mittel | Zugang sperren, neuer Code; geheime Schlüssel nur auf dem Gerät | gering |

**Ergebnis:** Mit den Maßnahmen ist das Risiko vertretbar. Jährlich und bei neuen Funktionen (z. B. Video, KI) neu bewerten.

Datum, Unterschrift Vorstand: ______________________
