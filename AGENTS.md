# KICC Developer Contract

Diese Regeln gelten fuer Menschen, Codex, Claude und andere Coding-Agents.

1. Keine vorhandenen freigegebenen Funktionen entfernen oder stillschweigend veraendern.
2. Keine Hotfix-Dateikaskaden. Fehler an der eigentlichen Quelle beheben.
3. Bestehende KC-Cores verwenden; keine Parallel-Cores fuer vorhandene Grundfunktionen bauen.
4. Keine hart codierten Provider, Programme, Geraete, Datenbanken oder Cloudrollen. Registry + Adapter + Capabilities verwenden.
5. Status und Traffic strikt trennen. Traffic-Animation nur bei realer Telemetrie.
6. Keine kostenpflichtigen Abhaengigkeiten, APIs oder Enterprise-Funktionen. Zero-Cost-Check ist Release-Gate.
7. Jede neue Funktion erhaelt Feature-ID, Tests und Definition-of-Done.
8. Jeder Build erhoeht die Version oder Buildkennung gemaess zentralem Versionsvertrag.
9. DEV -> RC -> FINAL. FINAL nur nach Regression, Visual-TUEV, Security, Framework-Studio-/Architekturpruefung und Release-TUEV.
10. Kritische Aktionen: Analyse -> Auswirkung -> Recovery-Punkt -> Autorisierung -> Ausfuehrung -> Verifikation -> Audit.
11. UNKNOWN darf nie als OK angezeigt werden. Veraltete Messdaten muessen sichtbar markiert werden.
12. KICC ist Kontrollsystem und darf kein Single Point of Failure fuer produktive KC-Datenwege werden.
13. Automatisierung bevorzugen; wo moeglich Auswahl/Erkennung statt Freitext.
14. Dokumentation und Architekturentscheidungen bei relevanten Aenderungen aktualisieren.
15. Keine Secrets in Browsercode, Repository oder sichtbaren Logs.
16. PWA-/Update-Mechanismus muss atomar sein; Mischstaende aus alter/neuer Version sind verboten.
17. Release-Artefakte sind unveraenderlich. Fehler werden mit neuer Version korrigiert.
18. Lokale, Cloud- und kuenftige Provider muessen ueber austauschbare Adapter integrierbar bleiben.
