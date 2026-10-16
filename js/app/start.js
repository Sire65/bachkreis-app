// Startseite nach Club-Vorbild: Kopf mit Statusleiste/LEDs, Register (Bachkreis · Meins · Technik · Admin), Kacheln.
import { S, VIEWS, db, einst, einstSetzen, zeige, istLeitung, istLehrkraft, istVerwalter, istVorstand, istEltern, istSchueler, hatRolle, vorname, ANSICHTEN, fehlerListe } from "./zustand.js";
import { esc, AKTIONEN, blatt, datum, uhr } from "../kern/ui.js";
import { liste, hole, datenInfo } from "../kern/daten.js";
import { nsId, nachrichtFrei } from "../kern/schema.js";
import { cockpit, termineFuer, antwortVon, kinderVon, genehmigungStatus, ausleihenVon } from "../kern/logik.js";
import { communicatorZustand } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";
import { kopfEinsetzen, kopfVerbinden, regEffekt } from "./kopf.js";
import { dunkelUmschalten } from "./darstellung.js";
import { pwOffenZahl } from "./pinnwand.js";
import { gesundheitFuer, gesundheitVon } from "./schutz.js";
import { mitfahrtZahlen } from "./extras.js";
import { wochenStand } from "./ueben.js";

export const REGISTER_ALLE = [["bachkreis", "Bachkreis"], ["meins", "Meins"], ["technik", "Technik"], ["admin", "Admin"]];
const registerSichtbar = () => REGISTER_ALLE.filter(([r]) => r !== "admin" || istLeitung());

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
    { id: "cockpit", sym: "🧭", t: "Cockpit", u: "Was braucht meine Aufmerksamkeit?", v: "cockpit", nur: () => istLehrkraft() || istVorstand(), zahl: () => cockpit(db, S.ich.id).filter((c) => c.dring >= 2).length },
    { id: "termine", sym: "📅", t: "Termine", u: "Proben · Konzerte · Zu- & Absagen", v: "termine", zahl: () => offeneAntworten() },
    { id: "sos", sym: "🆘", t: "SOS – Notfall", u: "Notruf · Kontakte im Notfall", v: "sos", klasse: "sos" },
    { id: "nachrichten", sym: "💬", t: "Nachrichten", u: "Gruppen · Rundschreiben", v: "nachrichten", zahl: () => ungelesen() },
    { id: "orchester", sym: "🎼", t: "Orchester", u: "Sitzplan · Gesichter · Besetzung", v: "orchester", nur: () => !istEltern() },
    { id: "instrumentenkunde", sym: "🎺", t: "Instrumentenkunde", u: "Halten · Hören · Worauf achten", v: "instrumentenkunde" },
    { id: "buehne", sym: "🎭", t: "Bühne", u: "Das Orchester spielt · Konzertaufnahmen", v: "buehne" },
    { id: "pinnwand", sym: "📌", t: "Pinnwand", u: "Post-its · wichtig · für alle oder privat", v: "pinnwand", zahl: () => pwOffenZahl() },
    { id: "projekte", sym: "🎭", t: "Konzerte & Projekte", u: "Programm · Ablauf · Checkliste", v: "projekte" },
    { id: "noten", sym: "📚", t: "Notenarchiv", u: "Orchester › Stücke › Noten je Instrument", v: "noten", nur: () => istVerwalter() },
    { id: "instrumente", sym: "🎻", t: "Instrumente", u: "Inventar · Verleih · Reparatur", v: "instrumente", nur: () => istVerwalter(), zahl: () => liste("reparaturen", (r) => r.status === "gemeldet" || r.status === "angebot").length },
    { id: "genehmigungen", sym: "✍️", t: "Genehmigungen", u: "Einverständnis der Eltern", v: "genehmigungen", nur: () => istLehrkraft() },
    { id: "anwesenheit", sym: "📋", t: "Anwesenheit", u: "Fehlzeiten je Kind · Orchester", v: "anwesenheit", nur: () => hatRolle("admin", "leitung", "lehrkraft", "terminplaner") },
    { id: "fotoliste", sym: "📷", t: "Foto-Liste", u: "Wer darf aufs Foto – App, Website, Presse, Social", v: "fotoliste", nur: () => istLehrkraft() },
    { id: "rundschreiben", sym: "📣", t: "Rundschreiben", u: "An Eltern, Schüler, Spender …", v: "rundschreiben", nur: () => istVerwalter() },
    { id: "foerderverein", sym: "💛", t: "Förderverein", u: "Einkauf · Spenden · Freigaben", v: "foerderverein", nur: () => istVorstand() || istLeitung() },
  ],
  meins: [
    { id: "meinetermine", sym: "🗓️", t: () => (istEltern() ? "Termine meiner Kinder" : "Meine Termine"), u: "Zusagen auf einen Blick", v: "termine", p: { filter: "meine" }, zahl: () => offeneAntworten() },
    { id: "kinder", sym: "👪", t: "Meine Kinder", u: "Gruppe · Instrument · Termine", v: "kinder", nur: () => istEltern() },
    { id: "meinegenehmigungen", sym: "✍️", t: "Genehmigungen", u: "Zustimmen · Ablehnen · Widerrufen", v: "meinegenehmigungen", nur: () => istEltern(), zahl: () => offeneGenehmigungen() },
    { id: "gesundheit", sym: "🩺", t: "Gesundheit & Notfall", u: "Allergien · Medikamente · Notfallkontakt", v: "gesundheit", nur: () => gesundheitFuer().length > 0, zahl: () => gesundheitFuer().filter((k) => !gesundheitVon(k)).length },
    { id: "ueben", sym: "🎻", t: "Üben", u: () => uebenUntertitel(), v: "ueben", nur: () => istSchueler() || istEltern() },
    { id: "uebeuebersicht", sym: "📊", t: "Übe-Übersicht", u: "Geteilte Übezeiten der Schüler", v: "uebenUebersicht", nur: () => hatRolle("leitung", "lehrkraft", "admin") },
    { id: "meinenoten", sym: "🎼", t: "Meine Noten", u: "Stimmen für mein Instrument", v: "meinenoten", nur: () => istSchueler() || istEltern() },
    { id: "meininstrument", sym: "🎻", t: () => (istEltern() ? "Leihinstrumente" : "Mein Leihinstrument"), u: "Rückgabe · Schaden melden", v: "meininstrument", nur: () => istSchueler() || istEltern() },
    { id: "abwesenheit", sym: "🏖️", t: "Abwesenheit", u: "Zeitraum auf einmal absagen", v: "abwesenheit", nur: () => istSchueler() || istEltern() },
    { id: "mitfahrboerse", sym: "🚗", t: "Mitfahrbörse", u: "Plätze anbieten · suchen · buchen", v: "mitfahrboerse", nur: () => istEltern() || istLehrkraft(), zahl: () => mitfahrSuchende() },
    { id: "meinregister", sym: "🎼", t: "Mein Register", u: "Wer kommt? Erinnern", v: "meinregister", nur: () => hatRolle("registerfuehrer") },
    { id: "wechselwunsch", sym: "🔀", t: "Gruppenwechsel", u: "Wunsch an die Leitung", v: "wechselwunsch", nur: () => istSchueler() },
    { id: "meingesicht", sym: "🙂", t: "Mein Gesicht", u: "Frisur, Brille, Farben – fürs Orchester", aktion: "meinGesicht" },
    { id: "meinedaten", sym: "🔐", t: "Meine Daten", u: "Was ist über mich gespeichert?", v: "meinedaten" },
    { id: "aenderung", sym: "✏️", t: "Änderung melden", u: "Neue Anschrift, Telefon …", v: "aenderung" },
    { id: "einstellungen", sym: "⚙️", t: "Meine Einstellungen", u: "Benachrichtigung · Schrift · Ansicht", v: "einstellungen" },
    { id: "test", sym: "🧪", t: "Test an mich", u: "Push & Mail ausprobieren", v: "test" },
  ],
  technik: [
    { id: "update", sym: "🔄", t: "Update prüfen", u: () => `Installiert: v${APP_VERSION} ${APP_STUFE}`, aktion: "updatePruefen" },
    { id: "sicherheit", sym: "🛡️", t: "Sicherheits-Check", u: "Läuft alles sicher? Jetzt prüfen", v: "sicherheit" },
    { id: "kalender", sym: "📆", t: "Kalender", u: "Apple · Google · Outlook – automatisch aktuell", v: "kalender" },
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
const AD_KACHELN = [["daten", "🗄️", "Datenquelle"], ["abgleich", "🔁", "Abgleich"], ["versand", "📡", "Communicator"], ["push", "🔔", "Push"], ["zugaenge", "🔑", "Zugänge"], ["fehler", "🩺", "Fehler"], ["speicher", "💾", "Speicher"], ["version", "📱", "Versionen"], ["backup", "🛟", "Backup / Export"]];
KACHELN.admin = AD_KACHELN.map(([id, sym, t]) => ({ id: "ad-" + id, sym, t, v: "admin", p: { blatt: id }, u: () => adminZustaende()[id][1], klasse: () => `ad l-${adminZustaende()[id][0]}`, nur: () => istLeitung() }));

const EINFACH = ["termine", "nachrichten", "sos", "meinetermine", "meinegenehmigungen", "meinenoten", "ueben", "pinnwand", "cockpit"];
const wert = (x) => (typeof x === "function" ? x() : x);
export function kachelnFuer(reg) {
  const e = einst();
  const k = KACHELN[reg].filter((x) => (!x.nur || x.nur()) && !e.kachelnAus.includes(x.id));
  const reihe = e.reihenfolge[reg];
  if (reihe) k.sort((a, b) => (reihe.indexOf(a.id) + 1 || 999) - (reihe.indexOf(b.id) + 1 || 999));
  return k;
}
function kachelHtml(k) {
  const z = k.zahl ? wert(k.zahl) : 0;
  const ziel = k.aktion ? `data-a="${k.aktion}"` : `data-a="kachel" data-x="${esc(k.id)}"`;
  return `<button class="kachel ${esc(wert(k.klasse) || "")}" ${ziel} data-id="${esc(k.id)}">${z ? `<span class="zahl">${esc(z)}</span>` : ""}<div class="sym">${k.sym}</div><b>${esc(wert(k.t))}</b><small>${esc(wert(k.u) || "")}</small></button>`;
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

VIEWS.start = {
  render() {
    const e = einst();
    if (!registerSichtbar().find(([r]) => r === S.register)) S.register = "bachkreis";
    let raster;
    if (e.einfach) {
      const alle = [...KACHELN.bachkreis, ...KACHELN.meins].filter((x) => EINFACH.includes(x.id) && (!x.nur || x.nur()));
      raster = `<div class="raster einfach" id="raster">${alle.map(kachelHtml).join("")}</div>`;
    } else raster = `<div class="register" id="register">${registerHtml()}</div><div class="raster" id="raster">${rasterHtml()}</div>`;
    // Der Kopf (kopf.js) ist ein dauerhaftes Element – hier nur sein Platz
    return `<section id="v-start">
      <div id="kopfPlatz"></div>
      <div id="updateHinweis"></div>
      <div class="abschnitt"><h3>${e.einfach ? "Einfache Ansicht" : "Schnellzugriff"}</h3></div>
      ${raster}
      ${e.einfach ? "" : `<div class="wischhinweis">‹ wischen für weitere Bereiche ›</div>`}
      <div class="karte"><h3>Heute wichtig</h3>${heuteWichtig()}</div>
      <button class="knopf breit" data-a="ansichtWechseln">${e.einfach ? "🔧 Erweiterte Ansicht" : "🙂 Einfache Ansicht"}</button>
      <div class="fusszeile">Bachkreis-App v${APP_VERSION} ${APP_STUFE} · ${esc(datenInfo().hinweis || "")}</div></section>`;
  },
  nach() {
    kopfEinsetzen(document.getElementById("kopfPlatz"));
    if (einst().einfach) return;
    // Wischen links/rechts über Kacheln oder Register wechselt das Register (wie Club-App)
    for (const el of [document.getElementById("raster"), document.getElementById("register")]) {
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
const registerHtml = () => registerSichtbar().map(([r, n]) => `<button class="${r === S.register ? "an reg-lauf" : ""}" data-a="register" data-x="${r}" data-r="${r}">${n}<span class="anz">${kachelnFuer(r).length}</span></button>`).join("");
const rasterHtml = () => kachelnFuer(S.register).map(kachelHtml).join("");
function registerWechseln(r, richtung) {
  const neu = r !== S.register; S.register = r;
  const reg = document.getElementById("register"), ra = document.getElementById("raster");
  if (S.view !== "start" || !reg || !ra) return zeige("start", {}, { ersetzen: true });
  reg.innerHTML = registerHtml(); ra.innerHTML = rasterHtml();
  if (neu && !regEffekt(richtung || 1) && richtung) { ra.classList.remove("rein-links", "rein-rechts"); void ra.offsetWidth; ra.classList.add(richtung > 0 ? "rein-links" : "rein-rechts"); }
}
function registerWischen(schritt) {
  const regs = registerSichtbar().map(([x]) => x), i = regs.indexOf(S.register), n = regs[i + schritt];
  if (n) registerWechseln(n, schritt);
}
kopfVerbinden({ adminZustaende, ungelesen, meineUnterhaltungen, offeneGenehmigungen });

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
AKTIONEN.ansichtWechseln = () => { einstSetzen("einfach", !einst().einfach); zeige("start", {}, { ersetzen: true }); };
AKTIONEN.themaUmschalten = () => dunkelUmschalten(); // reihum A → T → N wie in der KC Club App
AKTIONEN.ledBlatt = () => {
  const az = adminZustaende();
  const z = (f, t, x) => `<li><i class="led ${f}"></i><div class="fl"><b>${t}</b><div class="zeile-unter">${esc(x)}</div></div></li>`;
  blatt("Verbindung & Status", `<ul class="liste">${z(az.daten[0], "Daten", az.daten[1])}${z(az.versand[0], "Versand (Push/Mail)", az.versand[1])}${z(az.push[0], "Push auf diesem Gerät", az.push[1])}</ul>
    <p class="hinweis">Grün = gemessen und in Ordnung · Gelb = aufpassen · Rot = Problem · <b>Grau = unbekannt</b> (nie „in Ordnung“). In der Vorführversion gibt es keinen Server – deshalb grau.</p>`);
};
AKTIONEN.oeffne = (x) => { const [view, id] = String(x).split("|"); zeige(view, id ? { id } : {}); };

// 🎻 Untertitel der Üben-Kachel: Minuten diese Woche (eigene bzw. Kinder)
function uebenUntertitel() {
  const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
  const min = ids.reduce((a, pid) => a + wochenStand(liste("uebungen", (u) => u.person_id === pid && !u.geloescht_am)).summe, 0);
  return min ? `Diese Woche ${min} Min. geübt` : "Tagebuch · Stoppuhr · Übezeiten";
}
