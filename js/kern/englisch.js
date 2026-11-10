// 🌐 English (0.56.0): Oberfläche auf Englisch – für Gäste, Austausch-Orchester und Familien, die (noch) wenig Deutsch sprechen.
// Übersetzt werden Bedienelemente (Kacheln, Register, Fußleiste, Knöpfe, Einstellungen) direkt in der Seite: Textstücke und die Attribute
// placeholder / aria-label / title, sobald sie erscheinen (MutationObserver). Inhalte (Nachrichten, Termin-Titel, Namen) bleiben wie geschrieben.
// Wird nur geladen, wenn „English“ gewählt ist – Deutsch kostet nichts. Fehlende Wörter: einfach im Wörterbuch EN ergänzen.
export const EN = {
  // Register, Fußleiste, Kopf
  "Bachkreis": "Bachkreis", "Meins": "Mine", "Technik": "Tools", "Admin": "Admin", "Start": "Home", "Termine": "Events", "Nachrichten": "Messages",
  "Kinder": "Children", "Orchester": "Orchestra", "Mehr": "More", "Üben": "Practice", "Ich": "Me", "Zurück": "Back", "Suche": "Search",
  // Kacheln
  "Abmelden": "Log out", "Abwesenheit": "Absence", "Adventskalender": "Advent calendar", "Alles auf einen Blick": "Everything at a glance",
  "Anmelden ohne Code": "Sign in without code", "Anrufe": "Calls", "Anwesenheit": "Attendance", "App installieren": "Install app",
  "Auftrittsanfragen": "Performance requests", "Austausch & Gastfamilien": "Exchange & host families", "Bachkreis in Zahlen": "Bachkreis in numbers",
  "Bildschirmfoto": "Screenshot", "Börse & Helfer": "Marketplace & helpers", "Bühne": "Stage", "Büro": "Office", "Chronik & Repertoire": "History & repertoire",
  "Cockpit": "Cockpit", "Datenschutz": "Privacy", "Demo zurücksetzen": "Reset demo", "Dokumente": "Documents", "Eingangskorb": "Inbox",
  "Erstattung": "Reimbursement", "Fernhilfe": "Remote help", "Foto-Liste": "Photo list", "Fotoalbum": "Photo album", "Förderverein": "Friends' association",
  "Genehmigungen": "Permissions", "Gesundheit & Notfall": "Health & emergency", "Gruppenwechsel": "Group change", "Hilfe & Rückmeldung": "Help & feedback",
  "Hilfe & Tipps": "Help & tips", "Instrumente": "Instruments", "Instrumentenkunde": "Instrument guide", "Jahrbuch": "Yearbook", "Jahresbericht": "Annual report",
  "Kalender": "Calendar", "Konzerte & Projekte": "Concerts & projects", "Konzertkarten": "Concert tickets", "Leihverträge": "Loan agreements",
  "Mein Gesicht": "My face", "Mein Register": "My section", "Meine Daten": "My data", "Meine Einstellungen": "My settings", "Meine Kinder": "My children",
  "Meine Noten": "My sheet music", "Meine Unterlagen": "My documents", "Mitfahrbörse": "Ride sharing", "Musik-Spiele": "Music games", "Notenarchiv": "Sheet music archive",
  "Notfallpass": "Emergency card", "PC-Verwaltung": "PC administration", "Partner & Kontakte": "Partners & contacts", "Pinnwand": "Pinboard", "Protokolle": "Minutes",
  "Quiz": "Quiz", "Runder Tisch": "Round table", "Rundschreiben": "Circular", "SOS – Notfall": "SOS – emergency", "Schilder-Druckerei": "Sign printer",
  "Schlüsselbund": "Key ring", "Sicherheits-Check": "Security check", "Sitzungen": "Meetings", "So nutzen wir die App": "How we use the app", "Standorte": "Locations",
  "Startnachricht": "Welcome message", "Test an mich": "Test to me", "Uhr & Takt": "Clock & metronome", "Ungelesen seit mehr als 4 Tagen": "Unread for more than 4 days",
  "Update prüfen": "Check for update", "Vorschläge & Abstimmungen": "Suggestions & votes", "Zugang im Blick": "Access overview", "Zustimmungen": "Consents",
  "Änderung melden": "Report a change", "Übe-Bühne": "Practice stage", "Übe-Übersicht": "Practice overview", "Über die App": "About the app", "Nutzungsregeln": "Rules of use",
  // Knöpfe
  "Speichern": "Save", "Drucken": "Print", "Neu": "New", "Nochmal": "Again", "Löschen": "Delete", "Kopieren": "Copy", "Erinnern": "Remind", "Übersicht": "Overview",
  "Öffnen": "Open", "Ändern": "Change", "Bearbeiten": "Edit", "Drucken / PDF": "Print / PDF", "Standard": "Default", "Ansehen": "View", "Anhören": "Listen",
  "Andere Person": "Other person", "Alle": "All", "Absagen": "Decline", "Ablehnen": "Reject", "Vorschlag": "Suggestion", "Neue Umfrage": "New poll", "Aufgabe": "Task",
  "Senden": "Send", "Schreiben": "Write", "Antworten": "Reply", "Abschließen": "Finish", "Weiter": "Next", "Weiter ›": "Next ›", "Vorschau": "Preview", "PDF": "PDF",
  "Zurücksetzen": "Reset", "Zum Cockpit": "To the cockpit", "Wählen": "Choose", "Wie vorher": "As before", "Stopp": "Stop", "Später": "Later", "Schaden melden": "Report damage",
  "Nein, danke": "No, thanks", "Nachricht schreiben": "Write a message", "Jetzt üben": "Practice now", "Jetzt installieren": "Install now", "Impressum": "Legal notice",
  "Fertig – eintragen": "Done – save", "Datei öffnen": "Open file", "Auflegen": "Hang up", "Als Liste (CSV)": "As list (CSV)", "Alles im Cockpit": "All in the cockpit",
  "Übernehmen": "Apply", "Änderungswunsch senden": "Send change request", "Anmelden": "Sign in", "Abbrechen": "Cancel", "Schließen": "Close", "Fertig": "Done",
  "Ja": "Yes", "Nein": "No", "Vielleicht": "Maybe", "Zusage": "Yes, I'm coming", "Absage": "Can't come", "weiß noch nicht": "not sure yet", "Zusagen": "Accept",
  "Entfernen": "Remove", "Teilen": "Share", "Hinzufügen": "Add", "Hochladen": "Upload", "Herunterladen": "Download", "Filter": "Filter", "Sortieren": "Sort",
  "Link teilen": "Share link", "Liste drucken / PDF": "Print list / PDF", "Von Hand / Kasse": "Manual / box office", "abgeholt": "picked up", "reserviert": "reserved", "storniert": "cancelled",
  "Alle Konzerte": "All concerts", "Dieses Gerät einrichten": "Set up this device", "Deine Geräte": "Your devices", "Zustimmen und loslegen": "Agree and start",
  "Datenschutzerklärung lesen": "Read the privacy policy", "Nutzungsregeln lesen": "Read the rules of use", "Vorschau schließen": "Close preview",
  // Einstellungen
  "Darstellung": "Appearance", "Effekte": "Effects", "Startseite": "Home screen", "Installieren": "Install", "Familie": "Family", "Leitung": "Leaders",
  "Für alle (Admin)": "For everyone (admin)", "Entwickler": "Developer", "Normal": "Normal", "Groß": "Large", "Sehr groß": "Very large", "Hell": "Light", "Dunkel": "Dark",
  "Automatisch": "Automatic", "Benachrichtigungen": "Notifications", "Privatsphäre": "Privacy", "Sprache": "Language", "Deutsch": "Deutsch", "English": "English",
  // Häufige Wörter
  "heute": "today", "morgen": "tomorrow", "gestern": "yesterday", "Probe": "Rehearsal", "Konzert": "Concert", "Ort": "Place", "Beginn": "Begins", "Ende": "End",
  "Name": "Name", "Datum": "Date", "Zeit": "Time", "Status": "Status", "Notiz": "Note", "Zeitraum": "Period", "Mitglieder": "Members", "Spenden": "Donations",
  "Schuljahr": "School year", "Kalenderjahr": "Calendar year", "Plätze": "Seats", "Karten": "Tickets", "Gerät": "Device", "Hinweis": "Note", "Fehler": "Error",
  "Einen Moment …": "One moment …", "Wird gespeichert …": "Saving …", "Anmelden …": "Signing in …", "Keine Einträge": "No entries", "Noch nichts da.": "Nothing here yet.",
  "Mit Fingerabdruck / Gesicht anmelden": "Sign in with fingerprint / face", "Bitte mit deinem persönlichen Zugangscode anmelden.": "Please sign in with your personal access code.",
};
const KERN = /^(\s*[^\p{L}\p{N}]*?)([\p{L}\p{N}].*?[\p{L}\p{N}.…›)!?]|[\p{L}\p{N}])(\s*[^\p{L}\p{N}]*)$/u;
export function uebersetzeText(t, w = EN) {
  if (!t || !t.trim()) return t;
  if (w[t.trim()]) return t.replace(t.trim(), w[t.trim()]);
  const m = KERN.exec(t); if (!m) return t;
  const ziel = w[m[2]] ?? w[m[2].replace(/[.…]$/, "")];
  return ziel ? m[1] + ziel + m[3] : t;
}
const ATTR = ["placeholder", "aria-label", "title"];
function knoten(n) {
  if (n.nodeType === 3) { const neu = uebersetzeText(n.nodeValue); if (neu !== n.nodeValue) n.nodeValue = neu; return; }
  if (n.nodeType !== 1 || ["SCRIPT", "STYLE", "TEXTAREA", "CODE"].includes(n.tagName) || n.isContentEditable || n.closest?.("[translate=no], .blase, .pw-text, .zettel")) return;
  for (const a of ATTR) { const v = n.getAttribute?.(a); if (v) { const neu = uebersetzeText(v); if (neu !== v) n.setAttribute(a, neu); } }
  for (const k of n.childNodes) knoten(k);
}
let beobachter = null;
export function englischAn() {
  document.documentElement.lang = "en";
  if (beobachter) return;
  knoten(document.body);
  beobachter = new MutationObserver((l) => { for (const m of l) { if (m.type === "characterData") knoten(m.target); else for (const n of m.addedNodes) knoten(n); } });
  beobachter.observe(document.body, { childList: true, subtree: true, characterData: true });
}
