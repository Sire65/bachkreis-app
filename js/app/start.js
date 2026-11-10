// Startseite nach Club-Vorbild: Kopf mit Statusleiste/LEDs, Register (Bachkreis · Meins · Technik · Admin), Kacheln.
import { S, VIEWS, db, einst, zeige, istLeitung, istLehrkraft, istVerwalter, istVorstand, istEltern, istSchueler, hatRolle, vorname, fehlerListe } from "./zustand.js";
import { esc, AKTIONEN, blatt, datum, uhr } from "../kern/ui.js";
import { liste, hole, datenInfo, konfig } from "../kern/daten.js";
import { nsId, nachrichtFrei, MODULE } from "../kern/schema.js";
import { cockpit, termineFuer, antwortVon, kinderVon, ausleihenVon } from "../kern/logik.js";
import { communicatorZustand } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";
import { kopfEinsetzen, kopfVerbinden, regEffekt } from "./kopf.js";
import { dunkelUmschalten } from "./darstellung.js";
import { pwOffenZahl } from "./pinnwand.js";
import { gesundheitFuer, gesundheitVon } from "./schutz.js";
import { mitfahrtZahlen } from "./extras.js";
import { wochenStand } from "./ueben.js";
import { startseiteVerbinden, ANO, anordnenHtml, anordnenLeiste, nachDemZeichnen, laufbandHtml, laufbandStarten, countdownHtml, schnellstartHtml, schnellstartAn, vorschlagPruefen, nuTagZaehlen, ansichtFrage, tagesinfoBeimStart, kachelOffenHinten, drehZeichen } from "./startseite.js";
import { gbvPruefen } from "./bedienung.js";
import { netzBlattFuellen } from "./netzsymbol.js";
import { kindAnsicht, kinderStartHtml, kindGross } from "./kinderstart.js";
import { bueroDa } from "./buero.js";
import { adventDa, adventHinweis } from "./advent.js";
import { offeneAbstimmungen } from "./vorschlaege.js";
import { darfErstattung, erOffen } from "./erstattung.js";
import { rmNeu } from "./rueckmeldung.js";
import { passFuer, meineFahrten } from "./notfallpass.js";
import { boerseFuerMich, helferOffen } from "./boerse.js";
import { momenteOffen } from "./jahrbuch.js";
import { naechsteSitzung, sitzungenFuerMich } from "./sitzung.js";
import { pruefenFuerMich } from "./pruefung.js";
import { verpassteAnrufe, anrufAn } from "./anruf.js";
import { fernhilfeKachelDa } from "./fernhilfe.js";
import { tischDa } from "./tisch.js";
import { lvChef, meineOffenenUnterschriften } from "./leihvertrag.js";
import { korbNeu } from "./eingangskorb.js";
import { geheimTechnik } from "../kern/geheim.js";
import { erwachsen } from "../kern/schema.js";
const erwachsenIch = () => erwachsen(S.ich);
import { neueProtokolle } from "./protokolle.js";
import { elternAnsicht, elternStartHtml } from "./elternstart.js";
import { onlineZahl, onlineSichtbar } from "./online.js";
import { offeneUebeAufgaben } from "./uebebuehne.js";
import { austauschProjekte, anfragenOffen } from "./vereinsleben.js";

export const REGISTER_ALLE = [["bachkreis", "Bachkreis"], ["meins", "Meins"], ["technik", "Technik"], ["admin", "Admin"]];
// eigene Reihenfolge der Register (festhalten und ziehen, KC-CLUB-REGISTER-ZIEHEN)
const registerSichtbar = () => { const o = einst().registerReihe || [], pos = (r) => { const i = o.indexOf(r[0]); return i < 0 ? 100 + REGISTER_ALLE.indexOf(r) : i; };
  return REGISTER_ALLE.filter(([r]) => r !== "admin" || hatRolle("admin")).sort((a, b) => pos(a) - pos(b)); };

// Zahlen für Kacheln
function offeneAntworten() {
  const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
  let n = 0;
  for (const p of ids) for (const t of termineFuer(db, p)) if (t.status !== "abgesagt" && !antwortVon(db, t.id, p)) n++;
  return n;
}
// Gelesen? Eigene Nachrichten immer; sonst ✓✓-Status (gelesen_am), ältere Daten (gelesen_von) oder – ohne Lesebestätigung – nur auf diesem Gerät gemerkt
const LOKAL_GELESEN = new Set((() => { try { return JSON.parse(localStorage.getItem("bk_gelesen_lokal") || "[]"); } catch { return []; } })());
export function lokalGelesen(ids) { ids.forEach((id) => LOKAL_GELESEN.add(id)); try { localStorage.setItem("bk_gelesen_lokal", JSON.stringify([...LOKAL_GELESEN].slice(-3000))); } catch {} }
export const gelesenVonMir = (n) => n.von === S.ich?.id || (n.gelesen_von || []).includes(S.ich?.id) || !!hole("nachricht_status", nsId(n.id, S.ich?.id))?.gelesen_am || LOKAL_GELESEN.has(n.id);
export function ungelesen() {
  if (!S.ich) return 0;
  return meineUnterhaltungen().reduce((s, u) => s + liste("nachrichten", (n) => n.unterhaltung_id === u.id && nachrichtFrei(n) && !gelesenVonMir(n)).length, 0);
}
// 0.29.0 Nachrichten-Alter (KC-CLUB-NACHRICHT-ALTER/-BLINKEN): blinkt, solange etwas ungelesen ist – bis 2 Tage grün, 3./4. Tag orange, danach rot
export function nachrichtStufe() {
  if (!S.ich) return null;
  let aelteste = null;
  for (const u of meineUnterhaltungen()) for (const n of liste("nachrichten", (x) => x.unterhaltung_id === u.id && nachrichtFrei(x) && !gelesenVonMir(x))) if (!aelteste || n.zeit < aelteste) aelteste = n.zeit;
  if (!aelteste) return null;
  const tage = (Date.now() - Date.parse(aelteste)) / 86400000;
  return tage <= 2 ? "gruen" : tage <= 4 ? "orange" : "rot";
}
export const NACHRICHT_STUFE_TEXT = { gruen: "Ungelesen – neu", orange: "Ungelesen seit ein paar Tagen", rot: "Ungelesen seit mehr als 4 Tagen" };
export function meineUnterhaltungen() {
  // Einzelchats und Runden sind privat – auch die Leitung sieht nur die, in denen sie dabei ist
  return liste("unterhaltungen").filter((u) => (u.mitglieder || []).includes(S.ich.id) || (!["einzel", "runde"].includes(u.art) && (istLeitung() || imVerteiler(u.verteiler))));
}
function imVerteiler(v) {
  if (!v) return false;
  const [art, id] = v.split(":");
  if (art === "gruppe") return S.ich.typ === "schueler" && liste("gruppe_zuordnung", (z) => z.person_id === S.ich.id && z.gruppe_id === id).length > 0;
  if (art === "eltern") return istEltern() && kinderVon(db, S.ich.id).some((k) => liste("gruppe_zuordnung", (z) => z.person_id === k && z.gruppe_id === id).length > 0);
  return false;
}
const offeneGenehmigungen = () => istEltern() ? liste("genehmigungen", (g) => kinderVon(db, S.ich.id).includes(g.kind_id) && g.status === "ausstehend").length : 0;

// 🚗 Wie viele Kinder suchen in den nächsten 2 Wochen noch eine Mitfahrt (zu Terminen, die mich betreffen)?
const mitfahrSuchende = () => { const bis = Date.now() + 14 * 86400000; return liste("termine", (t) => new Date(t.beginn) > new Date() && new Date(t.beginn) < bis).reduce((s, t) => s + mitfahrtZahlen(t).suchen, 0); };
export const KACHELN = {
  bachkreis: [
    { id: "buero", sym: "🏢", t: "Büro", u: "Ordner · Vorlagen · Briefe · Protokolle", v: "buero", nur: () => bueroDa() },
    { id: "cockpit", sym: "🧭", t: "Cockpit", u: "Was braucht meine Aufmerksamkeit?", v: "cockpit", nur: () => istLehrkraft() || istVorstand(), zahl: () => cockpit(db, S.ich.id).filter((c) => c.dring >= 2).length },
    { id: "termine", sym: "📅", t: "Termine", u: "Proben · Konzerte · Zu- & Absagen", v: "termine", zahl: () => offeneAntworten() },
    { id: "sos", sym: "🆘", t: "SOS – Notfall", u: "Notruf · Kontakte im Notfall", v: "sos", klasse: "sos" },
    { id: "nachrichten", sym: "💬", t: "Nachrichten", u: "Gruppen · Rundschreiben", v: "nachrichten", zahl: () => ungelesen() },
    { id: "orchester", sym: "🎼", t: "Orchester", u: "Sitzplan · Gesichter · Besetzung", v: "orchester", nur: () => !istEltern() },
    { id: "quiz", sym: "🧠", t: "Quiz", u: "Instrumente · Noten · Rhythmus · Hören", v: "quiz" },
    { id: "instrumentenkunde", sym: "🎺", t: "Instrumentenkunde", u: "Halten · Hören · Worauf achten", v: "instrumentenkunde" },
    { id: "buehne", sym: "🎭", t: "Bühne", u: "Das Orchester spielt · Konzertaufnahmen · Üben", v: "buehne" },
    { id: "pinnwand", sym: "📌", t: "Pinnwand", u: "Post-its · wichtig · für alle oder privat", v: "pinnwand", zahl: () => pwOffenZahl() },
    { id: "projekte", sym: "🎭", t: "Konzerte & Projekte", u: "Programm · Ablauf · Checkliste", v: "projekte" },
    { id: "noten", sym: "📚", t: "Notenarchiv", u: "Orchester › Stücke › Noten je Instrument", v: "noten", nur: () => istVerwalter() },
    { id: "leihvertraege", sym: "📝", t: "Leihverträge", u: "Instrumente leihen · unterschreiben · drucken", v: "leihvertraege", nur: () => lvChef() || liste("leihvertraege", (v) => v.person_id === S.ich?.id || liste("eltern_kind", (e) => e.eltern_id === S.ich?.id && e.kind_id === v.person_id).length).length > 0, zahl: () => meineOffenenUnterschriften() || (lvChef() ? liste("leihvertraege", (v) => v.status === "wartet").length : 0) },
    { id: "instrumente", sym: "🎻", t: "Instrumente", u: "Inventar · Verleih · Reparatur", v: "instrumente", nur: () => istVerwalter(), zahl: () => liste("reparaturen", (r) => r.status === "gemeldet" || r.status === "angebot").length },
    { id: "genehmigungen", sym: "✍️", t: "Genehmigungen", u: "Einverständnis der Eltern", v: "genehmigungen", nur: () => istLehrkraft() },
    { id: "anwesenheit", sym: "📋", t: "Anwesenheit", u: "Fehlzeiten je Kind · Orchester", v: "anwesenheit", nur: () => hatRolle("admin", "leitung", "lehrkraft", "terminplaner") },
    { id: "fotoliste", sym: "📷", t: "Foto-Liste", u: "Wer darf aufs Foto – App, Website, Presse, Social", v: "fotoliste", nur: () => istLehrkraft() },
    { id: "rundschreiben", sym: "📣", t: "Rundschreiben", u: "An Eltern, Schüler, Spender …", v: "rundschreiben", nur: () => istVerwalter() },
    { id: "fotoalbum", sym: "📷", t: "Fotoalbum", u: "Konzerte · Fahrten · Proben", v: "fotoalbum" },
    { id: "advent", sym: "🎄", t: "Adventskalender", u: "Jeden Tag ein Türchen", v: "advent", nur: () => adventDa(), zahl: () => (adventHinweis() ? 1 : 0) },
    { id: "vorschlaege", sym: "💡", t: "Vorschläge & Abstimmungen", u: "Ideen · abstimmen · Ergebnisse", v: "vorschlaege", zahl: () => offeneAbstimmungen().length },
    { id: "erstattung", sym: "💶", t: "Erstattung", u: "Fahrtkosten · Auslagen mit Beleg", v: "erstattung", nur: () => darfErstattung(), zahl: () => erOffen() },
    { id: "rueckmeldungen", sym: "🆘", t: "Hilfe & Rückmeldung", u: "Klappt etwas nicht? · Idee · Lob", v: "rueckmeldungen", zahl: () => rmNeu() },
    { id: "protokolle", sym: "🗒️", t: "Protokolle", u: "Elternabende · Besprechungen · meine Aufgaben", v: "protokolle", zahl: () => neueProtokolle() },
    { id: "sitzungen", sym: "🎬", t: "Sitzungen", u: () => { const s = naechsteSitzung(); return s ? `${new Date(s.beginn).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} · ${s.titel}` : "Vorbereiten · Einladen · Leiten"; }, v: "sitzungen", nur: () => sitzungenFuerMich().length > 0 || hatRolle("admin", "leitung", "vorstand"), zahl: () => pruefenFuerMich() },
    { id: "schilder", sym: "🪧", t: "Schilder-Druckerei", u: "Wegweiser · Reserviert · Buffet · Pultkarten", v: "schilder", nur: () => istVerwalter() || istEltern() },
    { id: "boerse", sym: "🛍️", t: "Börse & Helfer", u: "Biete · Suche · Helfer gesucht", v: "boerse", nur: () => boerseFuerMich(), zahl: () => helferOffen() },
    { id: "jahrbuch", sym: "📖", t: "Jahrbuch", u: "Unser Bachkreis-Jahr zum Blättern", v: "jahrbuch", zahl: () => momenteOffen() },
    { id: "spiele", sym: "🎲", t: "Musik-Spiele", u: "Memory · Noten-Raten · Quiz", v: "spiele" },
    { id: "standorte", sym: "📍", t: "Standorte", u: "Probenorte · Anfahrt · Entfernung", v: "standorte" },
    { id: "chronik", sym: "📜", t: "Chronik & Repertoire", u: "Seit 1969 · Was haben wir gespielt?", v: "chronik" },
    { id: "dokumente", sym: "📂", t: "Dokumente", u: "Satzung · Flyer · Vorlagen", v: "dokumente" },
    { id: "austausch", sym: "🏠", t: "Austausch & Gastfamilien", u: "Gäste aufnehmen · Zuordnung", v: "austausch", nur: () => austauschProjekte().length > 0 && (istEltern() || istLehrkraft()), zahl: () => (istLehrkraft() ? austauschProjekte().reduce((s, p) => s + liste("gaeste", (g) => g.projekt_id === p.id && !g.gastgeber_id).length, 0) : 0) },
    { id: "anfragen", sym: "📨", t: "Auftrittsanfragen", u: "Gemeinden, Kirchen, Feste – zusagen", v: "anfragen", nur: () => istLehrkraft() || istVorstand(), zahl: () => anfragenOffen() },
    { id: "partner", sym: "🤝", t: "Partner & Kontakte", u: "Musikschule · Partnerorchester · Austausch", v: "partner", nur: () => istLehrkraft() || istVorstand() },
    { id: "startnachricht", sym: "📣", t: "Startnachricht", u: "Fenster beim nächsten Öffnen · Ja/Später/Nein", v: "startnachricht", nur: () => istLeitung() },
    { id: "zahlen", sym: "📊", t: "Bachkreis in Zahlen", u: "Mitglieder · Termine · Zusagen · Übezeit", v: "zahlen", nur: () => istVerwalter() },
    { id: "uhrtakt", sym: "⏱️", t: "Uhr & Takt", u: "Metronom · Timer · Stoppuhr", aktion: "uhrWerkzeug" },
    { id: "foerderverein", sym: "💛", t: "Förderverein", u: "Einkauf · Spenden · Freigaben", v: "foerderverein", nur: () => istVorstand() || istLeitung() },
  ],
  meins: [
    { id: "eingangskorb", sym: "📥", t: "Eingangskorb", u: "Geteiltes · Abgelegtes · von der Leitung", v: "eingangskorb", zahl: () => korbNeu() },
    { id: "meinetermine", sym: "🗓️", t: () => (istEltern() ? "Termine meiner Kinder" : "Meine Termine"), u: "Zusagen auf einen Blick", v: "termine", p: { filter: "meine" }, zahl: () => offeneAntworten() },
    { id: "kinder", sym: "👪", t: "Meine Kinder", u: "Gruppe · Instrument · Termine", v: "kinder", nur: () => istEltern() },
    { id: "meinegenehmigungen", sym: "✍️", t: "Genehmigungen", u: "Zustimmen · Ablehnen · Widerrufen", v: "meinegenehmigungen", nur: () => istEltern(), zahl: () => offeneGenehmigungen() },
    { id: "gesundheit", sym: "🩺", t: "Gesundheit & Notfall", u: "Allergien · Medikamente · Notfallkontakt", v: "gesundheit", nur: () => gesundheitFuer().length > 0, zahl: () => gesundheitFuer().filter((k) => !gesundheitVon(k)).length },
    { id: "notfallpass", sym: "🪪", t: "Notfallpass", u: "Allergien · Medikamente · Notfallnummern", v: "notfallpass", nur: () => passFuer().length > 0 || meineFahrten().length > 0 },
    { id: "ueben", sym: "🎻", t: "Üben", u: () => uebenUntertitel(), v: "ueben", nur: () => istSchueler() || istEltern() },
    { id: "uebebuehne", sym: "🎻", t: "Übe-Bühne", u: "Mitspielen · Griffe · Rhythmus · Stimmgerät", v: "buehne", p: { modus: "ueben" }, nur: () => istSchueler() || istEltern() || hatRolle("leitung", "lehrkraft", "admin"), zahl: () => (istSchueler() ? offeneUebeAufgaben(S.ich.id) : istEltern() ? kinderVon(db, S.ich.id).reduce((s, k) => s + offeneUebeAufgaben(k), 0) : 0) },
    { id: "uebeuebersicht", sym: "📊", t: "Übe-Übersicht", u: "Geteilte Übezeiten der Schüler", v: "uebenUebersicht", nur: () => hatRolle("leitung", "lehrkraft", "admin") },
    { id: "meinenoten", sym: "🎼", t: "Meine Noten", u: "Stimmen für mein Instrument", v: "meinenoten", nur: () => istSchueler() || istEltern() },
    { id: "meininstrument", sym: "🎻", t: () => (istEltern() ? "Leihinstrumente" : "Mein Leihinstrument"), u: "Rückgabe · Schaden melden", v: "meininstrument", nur: () => istSchueler() || istEltern() },
    { id: "abwesenheit", sym: "🏖️", t: "Abwesenheit", u: "Zeitraum auf einmal absagen", v: "abwesenheit", nur: () => istSchueler() || istEltern() },
    { id: "mitfahrboerse", sym: "🚗", t: "Mitfahrbörse", u: "Plätze anbieten · suchen · buchen", v: "mitfahrboerse", nur: () => istEltern() || istLehrkraft(), zahl: () => mitfahrSuchende() },
    { id: "meinregister", sym: "🎼", t: "Mein Register", u: "Wer kommt? Erinnern", v: "meinregister", nur: () => hatRolle("registerfuehrer") },
    { id: "wechselwunsch", sym: "🔀", t: "Gruppenwechsel", u: "Wunsch an die Leitung", v: "wechselwunsch", nur: () => istSchueler() },
    { id: "meingesicht", sym: "🙂", t: "Mein Gesicht", u: "Frisur, Brille, Farben – fürs Orchester", aktion: "meinGesicht" },
    { id: "unterlagen", sym: "📁", t: "Meine Unterlagen", u: "Bescheinigungen · Verträge · Atteste", v: "unterlagen", nur: () => !istSchueler() || hatRolle("admin", "leitung") },
    { id: "meinstatus", sym: "🟢", t: "Mein Status", u: "Verfügbar, Urlaub, krank – mit Hinweis", v: "meinstatus", aktion: "statusOeffnen" },
    { id: "meinedaten", sym: "🔐", t: "Meine Daten", u: "Was ist über mich gespeichert?", v: "meinedaten" },
    { id: "aenderung", sym: "✏️", t: "Änderung melden", u: "Neue Anschrift, Telefon …", v: "aenderung" },
    { id: "einstellungen", sym: "⚙️", t: "Meine Einstellungen", u: "Benachrichtigung · Schrift · Ansicht", v: "einstellungen" },
    { id: "test", sym: "🧪", t: "Test an mich", u: "Push & Mail ausprobieren", v: "test" },
  ],
  technik: [
    { id: "update", sym: "🔄", t: "Update prüfen", u: () => `Installiert: v${APP_VERSION} ${APP_STUFE}`, aktion: "updatePruefen" },
    { id: "zugang", sym: "🛡️", t: "Zugang im Blick", u: "💾 Speicher · Anmeldeversuche · 📲 Installiert?", v: "zugang", nur: () => istLeitung() },
    { id: "installieren", sym: "📲", t: "App installieren", u: "Auf den Startbildschirm – startet schneller", aktion: "installieren" },
    { id: "sicherheit", sym: "🛡️", t: "Sicherheits-Check", u: "Läuft alles sicher? Jetzt prüfen", v: "sicherheit" },
    { id: "kalender", sym: "📆", t: "Kalender", u: "Apple · Google · Outlook – automatisch aktuell", v: "kalender" },
    { id: "bildschirmfoto", sym: "📸", t: "Bildschirmfoto", u: "Einkreisen · an die Leitung schicken", aktion: "bildschirmfoto" },
    { id: "anrufe", sym: "📞", t: "Anrufe", u: "📞 Anruf · 🎥 Video – im Einzelchat", v: "anrufe", nur: () => anrufAn(), zahl: () => verpassteAnrufe() },
    { id: "tisch", sym: "🪑", t: "Runder Tisch", u: "Online-Treffen mit Bild und Ton", v: "tisch", nur: () => tischDa() },
    { id: "datenschutz", sym: "⚖️", t: "Datenschutz", u: "Was mit deinen Daten passiert · Regeln", v: "datenschutz" },
    { id: "zustimmungen", sym: "✅", t: "Zustimmungen", u: "Wer hat Datenschutz & Regeln bestätigt?", v: "zustimmungen", nur: () => hatRolle("admin", "leitung", "vorstand") },
    { id: "passkeys", sym: "👆", t: "Anmelden ohne Code", u: "Fingerabdruck / Gesicht (Passkey)", v: "passkeys" },
    { id: "schluesselbund", sym: "🔑", t: "Schlüsselbund", u: "🔒 Geheime Nachrichten auf jedem Gerät lesen", v: "schluesselbund", nur: () => geheimTechnik() && erwachsenIch() },
    { id: "fernhilfe", sym: "🛟", t: "Fernhilfe", u: "Jemand schaut mit auf deinen Bildschirm", v: "fernhilfe", nur: () => fernhilfeKachelDa() },
    { id: "konzertkarten", sym: "🎟️", t: "Konzertkarten", u: "Online reservieren · Abendkasse", v: "konzertkarten", nur: () => hatRolle("admin", "leitung", "vorstand") },
    { id: "jahresbericht", sym: "📊", t: "Jahresbericht", u: "Das Jahr in Zahlen · für Vorstand & Versammlung", v: "jahresbericht", nur: () => hatRolle("admin", "leitung", "vorstand") },
    { id: "nutzung", sym: "📈", t: "So nutzen wir die App", u: "Wann ist am meisten los?", v: "nutzung" },
    { id: "ueberblick", sym: "🗺️", t: "Alles auf einen Blick", u: "Jeder Bereich der App", v: "ueberblick" },
    { id: "hilfe", sym: "❓", t: "Hilfe & Tipps", u: "Kurz erklärt", v: "hilfe" },
    { id: "verwaltung", sym: "💻", t: "PC-Verwaltung", u: "Stammdaten am PC/Notebook pflegen", aktion: "verwaltungOeffnen", nur: () => istVerwalter() },
    { id: "ueber", sym: "ℹ️", t: "Über die App", u: "Version · Datenquelle · Lizenzen", v: "ueber" },
    { id: "abmelden", sym: "🚪", t: "Abmelden", u: "Von diesem Gerät abmelden", aktion: "abmeldenApp", nur: () => datenInfo().server === true },
    { id: "demo", sym: "♻️", t: "Demo zurücksetzen", u: "Alle Demodaten neu erzeugen", aktion: "demoReset", nur: () => datenInfo().art === "lokal-demo" },
  ],
  admin: [],
};

// Admin-Register: Leitstand mit Lämpchen (grün gut · gelb aufpassen · rot Problem · grau unbekannt – grau ist nie OK)
export function adminZustaende() {
  const info = datenInfo();
  const fehler24 = fehlerListe().filter((f) => Date.now() - new Date(f.zeit).getTime() < 86400000).length;
  const zug = liste("zugaenge");
  const nieGesehen = zug.filter((z) => z.aktiv && !z.zuletzt).length;
  const push = !("Notification" in globalThis) ? ["grau", "nicht unterstützt"] : Notification.permission === "granted" ? ["gruen", "auf diesem Gerät erlaubt"] : Notification.permission === "denied" ? ["rot", "auf diesem Gerät blockiert"] : ["gelb", "noch nicht erlaubt"];
  return {
    daten: !info.server ? ["grau", "Demo – kein Server gemessen"]
      : !info.online ? ["rot", info.hinweis]
      : info.letzterAbgleich && Date.now() - new Date(info.letzterAbgleich).getTime() > 5 * 60000 ? ["gelb", "Stand veraltet – " + info.hinweis]
      : ["gruen", info.hinweis],
    abgleich: [info.server ? "gruen" : "grau", `${liste("aenderungen").length} Änderungen protokolliert`],
    versand: (() => { const c = communicatorZustand(); return [c.farbe, c.text]; })(),
    push,
    zugaenge: [nieGesehen > 20 ? "gelb" : "gruen", `${zug.filter((z) => z.aktiv).length} aktiv · ${nieGesehen} nie angemeldet`],
    fehler: [fehler24 ? "rot" : "gruen", fehler24 ? `${fehler24} in 24 Std.` : "keine in 24 Std."],
    speicher: ["grau", "Speicher prüfen …"],
    version: ["gruen", `v${APP_VERSION} ${APP_STUFE}`],
    backup: [info.server ? "grau" : "grau", info.server ? "Backup-Messung folgt" : "Demo: Export als Datei"],
  };
}
// 🛡️ 0.43.0 Admin-Register wie KC (Leitstand, Datenbank, Nutzung, Wartung, Module, Rollen, Spiegel, Dienste) – nur Admin und Entwickler.
// Die Lämpchen der neuen Kacheln kommen aus adminbereich.js (letzte Messung); ohne Messung grau.
const AD_KACHELN = [["lage", "🛡️", "Leitstand"], ["datenbank", "🗄️", "Datenbank"], ["nutzung", "📈", "Nutzung"], ["wartung", "🚧", "Wartung"], ["module", "🧩", "Module"], ["rollen", "👑", "Rollen"],
  ["spiegel", "🪞", "Spiegel & Sicherung"], ["dienste", "🔗", "Dienste", () => hatRolle("entwickler")],
  ["daten", "📦", "Datenquelle"], ["abgleich", "🔁", "Abgleich"], ["versand", "📡", "Communicator"], ["push", "🔔", "Push"], ["zugaenge", "🔑", "Zugänge"], ["fehler", "🩺", "Fehler"], ["speicher", "💾", "Speicher"], ["version", "📱", "Versionen"], ["backup", "🛟", "Backup / Export"]];
const ADMIN_TEILE = ["lage", "datenbank", "nutzung", "wartung", "module", "rollen", "spiegel", "dienste"];
let adminLeds = () => ({});
export const adminLedsVerbinden = (f) => { adminLeds = f; };
const adZustand = (id) => (ADMIN_TEILE.includes(id) ? adminLeds()[id] || ["grau", "noch nicht gemessen"] : adminZustaende()[id]);
KACHELN.admin = AD_KACHELN.map(([id, sym, t, nur]) => ({ id: "ad-" + id, sym, t, v: ADMIN_TEILE.includes(id) ? "adminbereich" : "admin", p: ADMIN_TEILE.includes(id) ? { teil: id } : { blatt: id }, u: () => adZustand(id)[1], klasse: () => `ad l-${adZustand(id)[0]}`, nur: () => hatRolle("admin") && (!nur || nur()) }));

// 🟢 Einfache Ansicht (wie KC): wenige große Kacheln je nach Rolle – Reihenfolge änderbar (▲▼), es wird nichts gelöscht
const EINFACH = ["cockpit", "termine", "meinetermine", "nachrichten", "kinder", "meinegenehmigungen", "uebebuehne", "ueben", "meinenoten", "pinnwand", "sos"];
const wert = (x) => (typeof x === "function" ? x() : x);
const sortiert = (k, reihe) => (reihe ? [...k].sort((a, b) => (reihe.indexOf(a.id) + 1 || 999) - (reihe.indexOf(b.id) + 1 || 999)) : k);
// alle Kacheln, die man sehen darf (auch ausgeblendete) – in eigener Reihenfolge
// 🧩 0.43.0 Module, die der Admin abgeschaltet hat (konfig module_aus), sieht nur noch Admin/Entwickler – zum Prüfen, mit 🚫 am Rand
export const modulAus = (id) => MODULE[id] !== undefined && (konfig().module_aus || []).includes(id);
const modulFrei = (x) => !modulAus(x.id) || hatRolle("admin");
export const kachelnAlle = (reg) => sortiert(KACHELN[reg].filter((x) => (!x.nur || x.nur()) && modulFrei(x)), einst().reihenfolge[reg]);
export const kachelnFuer = (reg) => kachelnAlle(reg).filter((x) => !einst().kachelnAus.includes(x.id));
export function einfachKacheln() {
  const alle = [...KACHELN.bachkreis, ...KACHELN.meins].filter((x) => EINFACH.includes(x.id) && (!x.nur || x.nur()) && modulFrei(x));
  const l = EINFACH.map((id) => alle.find((x) => x.id === id)).filter(Boolean).filter((x) => !(x.id === "termine" && alle.some((y) => y.id === "meinetermine") && !istLehrkraft()));
  return sortiert(l, einst().reihenfolge.einfach);
}
function kachelHtml(k) {
  const z = k.zahl ? wert(k.zahl) : 0;
  const ziel = k.aktion ? `data-a="${k.aktion}"` : `data-a="kachel" data-x="${esc(k.id)}"`;
  const na = k.id === "nachrichten" && z ? nachrichtStufe() : null;
  return `<button class="kachel ${esc(wert(k.klasse) || "")}${na ? " na-" + na : ""}${modulAus(k.id) ? " modul-aus" : ""}" ${ziel} data-id="${esc(k.id)}">${z ? `<span class="zahl">${esc(z)}</span>` : ""}<div class="sym">${k.sym}</div><b>${esc(wert(k.t))}</b><small>${esc(wert(k.u) || "")}</small>${drehZeichen(k.id)}</button>`;
}

function heuteWichtig() {
  const zeilen = [];
  const personen = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
  const naechste = personen.flatMap((p) => termineFuer(db, p).slice(0, 2).map((t) => ({ t, p }))).sort((a, b) => a.t.beginn.localeCompare(b.t.beginn)).slice(0, 3);
  for (const { t, p } of naechste) {
    const a = antwortVon(db, t.id, p);
    zeilen.push(`<li class="klick" data-a="oeffne" data-x="termin|${t.id}"><span>${a ? { ja: "✅", vielleicht: "🤔", nein: "❌" }[a.antwort] : "❔"}</span><div class="fl"><div class="zeile-titel">${esc(t.titel)}${istEltern() ? ` · ${esc(vorname(p))}` : ""}</div><div class="zeile-unter">${datum(t.beginn)}, ${uhr(t.beginn)} Uhr · ${esc(t.ort || "")}</div></div></li>`);
  }
  if (istLehrkraft() || istVorstand()) {
    const c = cockpit(db, S.ich.id).filter((x) => x.dring >= 2).slice(0, 3);
    for (const x of c) zeilen.push(`<li class="klick" data-a="oeffne" data-x="${esc(x.ziel.view)}|${esc(x.ziel.id || "")}"><span>${x.sym}</span><div class="fl">${esc(x.text)}</div></li>`);
  }
  const og = offeneGenehmigungen();
  if (og) zeilen.push(`<li class="klick" data-a="kachel" data-x="meinegenehmigungen"><span>✍️</span><div class="fl"><b>${og} Genehmigung${og === 1 ? "" : "en"}</b> warten auf Ihre Antwort</div></li>`);
  for (const a of istSchueler() ? ausleihenVon(db, S.ich.id).filter((a) => a.bis && a.bis < new Date().toISOString().slice(0, 10)) : []) zeilen.push(`<li><span>🎻</span><div class="fl">Leihinstrument: Rückgabe war am ${a.bis.split("-").reverse().join(".")} fällig</div></li>`);
  return zeilen.length ? `<ul class="liste">${zeilen.join("")}</ul>` : `<p class="hinweis">Heute steht nichts Dringendes an. 🎶</p>`;
}

const groesse = () => ({ klein: " klein3", mini: " klein4" }[einst().kachelGroesse] || "");
function rasterBlock() {
  const e = einst();
  if (e.einfach) return `${ANO.an ? anordnenLeiste() : ""}<div class="raster einfach${ANO.an ? " anordnen" : ""}" id="raster">${ANO.an ? anordnenHtml(einfachKacheln()) : einfachKacheln().map(kachelHtml).join("")}</div>`;
  const ausN = kachelnAlle(S.register).length - kachelnFuer(S.register).length;
  if (!ausN) ANO.nurAus = false;
  const inhalt = ANO.an ? anordnenHtml(kachelnAlle(S.register)) : ANO.nurAus ? kachelnAlle(S.register).filter((k) => e.kachelnAus.includes(k.id)).map(kachelHtml).join("") : rasterHtml();
  const hinweis = ANO.an ? "" : ANO.nurAus ? `<p class="hinweis ka-nuraus-text">🙈 Du siehst gerade nur die <b>ausgeblendeten</b> Kacheln.</p><button type="button" class="knopf breit" data-a="kaNurAus" data-x="0">🙈 Ausgeblendete wieder verbergen</button>`
    : ausN ? `<div class="ka-aus-zeile"><button type="button" class="ka-ausgeblendet" data-a="kaNurAus" data-x="1">👀 ${ausN} ausgeblendete Kachel${ausN > 1 ? "n" : ""} zeigen</button></div>` : "";
  return `<div class="register" id="register">${registerHtml()}</div>${ANO.an ? anordnenLeiste() : ""}<div class="raster${groesse()}${ANO.an ? " anordnen" : ""}${ANO.nurAus ? " nur-aus" : ""}" id="raster">${inhalt}</div>${hinweis}`;
}
VIEWS.start = {
  render() {
    if (kindAnsicht()) return kinderStartHtml(); // 🧒 0.32.0 eigene Kinder-Startseite
    if (elternAnsicht()) return elternStartHtml(); // 👪 0.33.0 Eltern-Übersicht
    const e = einst();
    if (!registerSichtbar().find(([r]) => r === S.register)) S.register = registerSichtbar()[0][0];
    // Der Kopf (kopf.js) ist ein dauerhaftes Element – hier nur sein Platz
    return `<section id="v-start" class="${e.einfach ? "ansicht-einfach" : "ansicht-erweitert"}">
      <div id="kopfPlatz"></div>
      <div id="updateHinweis"></div>
      <div class="abschnitt sz-zeile"><h3><button type="button" class="sz-link" data-a="schnellstartOben" title="Antippen: oben die Schnellstart-Symbole zeigen">Schnellzugriff</button>
        ${e.einfach ? '<button type="button" class="ansichtname ein" data-a="ansichtWechseln" title="Antippen: zur erweiterten Ansicht wechseln">&gt; Einfache Ansicht &lt;</button>' : '<button type="button" class="ansichtname erw" data-a="ansichtWechseln" title="Antippen: zur einfachen Ansicht wechseln">&lt; Erweiterte Ansicht &gt;</button>'}</h3>
        <span class="sz-rechts"><button type="button" class="knopf klein sz-anordnen" data-a="kaAnordnen" title="Kacheln verschieben${e.einfach ? "" : " oder ausblenden"}" aria-label="✥ Anordnen – Kacheln verschieben" ${ANO.an ? "hidden" : ""}>✥</button><button type="button" class="ausweis-knopf" data-a="ausweisZeigen" title="Mein Ausweis-QR – zum Vorzeigen" aria-label="QR – mein Ausweis"><svg class="qr-sym" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h6v6H1zM2.5 2.5v3h3v-3zM9 1h6v6H9zm1.5 1.5v3h3v-3zM1 9h6v6H1zm1.5 1.5v3h3v-3zM9 9h2v2H9zm4 0h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2H9zm4 0h2v2h-2z" fill="currentColor" fill-rule="evenodd"/></svg> QR</button></span></div>
      <div id="rasterBlock">${rasterBlock()}</div>
      ${e.einfach || ANO.an ? "" : `<div class="wischhinweis">‹ wischen für weitere Bereiche · doppelt tippen dreht eine Kachel um · lange drücken ordnet an ›</div>`}
      <div class="karte"><h3>Heute wichtig${istLehrkraft() || istVorstand() ? ' <button type="button" class="knopf klein" data-a="tagesinfo">📋 Übersicht</button>' : ""}</h3>${heuteWichtig()}</div>
      <button class="knopf breit ansicht-knopf" data-a="ansichtWechseln">${e.einfach ? "🔧 Erweiterte Ansicht" : "🟢 Einfache Ansicht"}</button>
      ${istSchueler() && kindGross() ? '<button class="knopf breit ansicht-knopf" data-a="kindMehr" data-x="">🧒 Einfache Kinder-Ansicht</button>' : ""}
      ${istEltern() ? '<button class="knopf breit ansicht-knopf" data-a="elternAlle" data-x="">👪 Eltern-Übersicht</button>' : ""}
      <div class="fusszeile">Bachkreis-App v${APP_VERSION} ${APP_STUFE} · ${esc(datenInfo().hinweis || "")}</div></section>`;
  },
  nach() {
    kopfEinsetzen(document.getElementById("kopfPlatz"));
    if (kindAnsicht() || elternAnsicht()) { setTimeout(gbvPruefen, 1500); return; }
    nachDemZeichnen(); nuTagZaehlen();
    clearTimeout(START_FRAGEN); START_FRAGEN = setTimeout(() => { if (S.view === "start" && !ansichtFrage()) tagesinfoBeimStart(); }, 1200);
    clearTimeout(START_VORSCHLAG); START_VORSCHLAG = setTimeout(vorschlagPruefen, 25000);
    setTimeout(gbvPruefen, 1500); // 🎁 Geburtstags-Vogel (höchstens einmal je Stunde)
    if (einst().einfach) return;
    // Wischen links/rechts über Kacheln oder Register wechselt das Register (wie Club-App)
    for (const el of [document.getElementById("rasterBlock")]) {
      let x0 = null, y0 = 0;
      el?.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      el?.addEventListener("touchend", (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) registerWischen(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
  },
};
let START_FRAGEN = 0, START_VORSCHLAG = 0;
// Startseite neu zeichnen ohne den Kopf anzufassen (Anordnen, Rückseite zurück, Ausblenden)
function startNeu() {
  const b = document.getElementById("rasterBlock");
  if (S.view !== "start" || !b) return zeige("start", {}, { ersetzen: true });
  if (kachelOffenHinten() && !ANO.an) document.querySelector("#raster > .kachel.kr-hinten")?.classList.remove("kr-hinten");
  b.innerHTML = rasterBlock(); nachDemZeichnen();
  const knopf = document.querySelector('#v-start .abschnitt [data-a="kaAnordnen"]'); if (knopf) knopf.hidden = ANO.an;
}
startseiteVerbinden({ KACHELN, kachelnFuer, kachelnAlle, neuZeichnen: startNeu, ungelesen: () => ungelesen(), offeneAntworten: () => offeneAntworten(), offeneGenehmigungen: () => offeneGenehmigungen(),
  onlineZahl: () => (onlineSichtbar() ? onlineZahl() : 0), pwOffen: () => pwOffenZahl(), kopfNeu: () => document.dispatchEvent(new CustomEvent("bk-kopf-neu")) });
const registerHtml = () => registerSichtbar().map(([r, n]) => `<button class="${r === S.register ? "an reg-lauf" : ""}" data-a="register" data-x="${r}" data-r="${r}">${n}<span class="anz">${kachelnFuer(r).length}</span></button>`).join("");
const rasterHtml = () => kachelnFuer(S.register).map(kachelHtml).join("");
function registerWechseln(r, richtung) {
  const neu = r !== S.register; S.register = r;
  const b = document.getElementById("rasterBlock");
  if (S.view !== "start" || !b) return zeige("start", {}, { ersetzen: true });
  ANO.nurAus = false; b.innerHTML = rasterBlock(); nachDemZeichnen();
  const ra = document.getElementById("raster");
  if (neu && !regEffekt(richtung || 1) && richtung && ra) { ra.classList.remove("rein-links", "rein-rechts"); void ra.offsetWidth; ra.classList.add(richtung > 0 ? "rein-links" : "rein-rechts"); }
}
function registerWischen(schritt) {
  if (ANO.an) return;
  const regs = registerSichtbar().map(([x]) => x), i = regs.indexOf(S.register), n = regs[i + schritt];
  if (n) registerWechseln(n, schritt);
}
kopfVerbinden({ adminZustaende, ungelesen, meineUnterhaltungen, offeneGenehmigungen, nachrichtStufe, laufband: laufbandHtml, laufbandStart: laufbandStarten, countdown: countdownHtml, schnellstart: schnellstartHtml, schnellstartAn });

AKTIONEN.register = (r) => {
  if (S.view !== "start") { S.register = r; return zeige("start", {}, { ersetzen: true }); }
  const regs = registerSichtbar().map(([x]) => x);
  registerWechseln(r, regs.indexOf(r) >= regs.indexOf(S.register) ? 1 : -1);
};
AKTIONEN.kachel = (id) => {
  const k = Object.values(KACHELN).flat().find((x) => x.id === id);
  if (!k) return zeige(id);
  if (k.aktion) return AKTIONEN[k.aktion]();
  zeige(k.v, k.p || {});
};
AKTIONEN.ansichtWechseln = () => AKTIONEN.ansichtSetzen(einst().einfach ? "erweitert" : "einfach");
AKTIONEN.themaUmschalten = () => dunkelUmschalten(); // reihum A → T → N wie in der KC Club App
AKTIONEN.ledBlatt = () => {
  const az = adminZustaende();
  const z = (f, t, x) => `<li><i class="led ${f}"></i><div class="fl"><b>${t}</b><div class="zeile-unter">${esc(x)}</div></div></li>`;
  blatt("Verbindung & Status", `<div id="netzBlatt" class="nz-blatt"></div><h3>Status</h3><ul class="liste">${z(az.daten[0], "Daten", az.daten[1])}${z(az.versand[0], "Versand (Push/Mail)", az.versand[1])}${z(az.push[0], "Push auf diesem Gerät", az.push[1])}${(() => { const w = document.getElementById("ledWetter"); return w ? z(w.className.replace("led ", ""), "Wetter", w.title.replace(/^Wetter: /, "")) : ""; })()}</ul>
    <p class="hinweis">Grün = gemessen und in Ordnung · Gelb = aufpassen · Rot = Problem · <b>Grau = unbekannt</b> (nie „in Ordnung“). In der Vorführversion gibt es keinen Server – deshalb grau.</p>`);
  netzBlattFuellen(); // 📶 0.57.0 Balken im Kopf → Messwerte hier
};
AKTIONEN.oeffne = (x) => { const [view, id] = String(x).split("|"); zeige(view, id ? { id } : {}); };

// 🎻 Untertitel der Üben-Kachel: Minuten diese Woche (eigene bzw. Kinder)
function uebenUntertitel() {
  const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
  const min = ids.reduce((a, pid) => a + wochenStand(liste("uebungen", (u) => u.person_id === pid && !u.geloescht_am)).summe, 0);
  return min ? `Diese Woche ${min} Min. geübt` : "Tagebuch · Stoppuhr · Übezeiten";
}
