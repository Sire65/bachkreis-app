# 📱 Gerätetest-Plan (0.55.0)

Automatische Tests laufen in Chromium. Vor jedem größeren Bündel und vor dem Echtbetrieb einmal auf echten Geräten prüfen.
Je Gerät ca. 15 Minuten. Ergebnis als ✅ / ⚠️ / ❌ eintragen, Fehler mit „Klappt etwas nicht?“ in der App melden.

## Geräte
| Gerät | System | Browser | wer testet | Ergebnis |
|---|---|---|---|---|
| iPhone (aktuell) | iOS 18/19 | Safari + „Zum Home-Bildschirm“ | | |
| iPhone (älter, z. B. SE) | iOS 16 | Safari | | |
| iPad | iPadOS | Safari | | |
| Android-Handy | Android 14/15 | Chrome + installiert | | |
| Android (günstig/älter) | Android 11 | Chrome | | |
| PC | Windows 11 | Edge / Chrome | | |
| Mac | macOS | Safari | | |

## Ablauf je Gerät
1. **Installieren:** Seite öffnen, „Zum Home-Bildschirm“/„Installieren“, App startet ohne Adresszeile.
2. **Anmelden** mit Testzugang; **Zustimmung** Datenschutz/Regeln erscheint einmal und ist danach weg.
3. **Start schnell?** Bis die Startseite steht < 3 s im WLAN; Programmteile (Instrumente, Noten, Fotoalbum) öffnen beim ersten Mal ohne Fehler.
4. **Offline:** Flugmodus → App öffnen, Termine und Noten sichtbar; Zusage geht nach dem Wieder-Verbinden raus.
5. **Mitteilungen:** Push einschalten (iPhone erst nach Installation möglich), Testnachricht kommt an.
6. **Kamera/Mikro:** Foto hochladen, Sprachnachricht, Anruf zwischen zwei Geräten, Runder Tisch mit drei Geräten.
7. **Drucken/PDF:** Leihvertrag → Vorschau → PDF speichern/teilen; Teilen → Bachkreis legt eine Datei in den Eingangskorb.
8. **Darstellung:** Hell/Dunkel, große Schrift (System-Schriftgröße), Querformat, Bildschirmleser (VoiceOver/TalkBack) liest Knöpfe vor.
9. **Update:** neue Version wird angeboten und lädt ohne Datenverlust.

## Bekannte Eigenheiten
- iPhone: Push nur bei installierter App; Teilen-Ziel (share_target) gibt es in Safari nicht – dort „Datei wählen“ im Eingangskorb.
- Ältere Android-Geräte: Runder Tisch ab 4 Personen ggf. ruckelig → Video aus, nur Ton.
