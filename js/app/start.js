// Startseite nach Club-Vorbild: Kopf mit Statusleiste/LEDs, Register (Bachkreis · Meins · Technik · Admin), Kacheln.
import { S, VIEWS, db, einst, einstSetzen, zeige, istLeitung, istLehrkraft, istVerwalter, istVorstand, istEltern, istSchueler, hatRolle, vorname, ANSICHTEN, fehlerListe } from "./zustand.js";
import { esc, AKTIONEN, blatt, BACHKREIS_LOGO, datum, uhr } from "../kern/ui.js";
import { liste, datenInfo } from "../kern/daten.js";
import { cockpit, termineFuer, antwortVon, kinderVon, genehmigungStatus, ausleihenVon } from "../kern/logik.js";
import { versandStatistik } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";

export const REGISTER_ALLE = [["bachkreis", "Bachkreis"], ["meins", "Meins"], ["technik", "Technik"], ["admin", "Admin"]];
const registerSichtbar = () => REGISTER_ALLE.filter(([r]) => r !== "admin" || istLeitung());

// Zahlen für Kacheln
function offeneAntworten() {
  const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
  let n = 0;
  for (const p of ids) for (const t of termineFuer(db, p)) if (t.status !== "abgesagt" && !antwortVon(db, t.id, p)) n++;
  return n;
}
export function ungelesen() {
  return meineUnterhaltungen().reduce((s, u) => s + liste("nachrichten", (n) => n.unterhaltung_id === u.id && !(n.gelesen_von || []).includes(S.ich.id)).length, 0);
}
export function meineUnterhaltungen() {
  return liste("unterhaltungen").filter((u) => istLeitung() || (u.mitglieder || []).includes(S.ich.id) || imVerteiler(u.verteiler));
}
function imVerteiler(v) {
  if (!v) return false;
  const [art, id] = v.split(":");
  if (art === "gruppe") return S.ich.typ === "schueler" && liste("gruppe_zuordnung", (z) => z.person_id === S.ich.id && z.gruppe_id === id).length > 0;
  if (art === "eltern") return istEltern() && kinderVon(db, S.ich.id).some((k) => liste("gruppe_zuordnung", (z) => z.person_id === k && z.gruppe_id === id).length > 0);
  return false;
}
const offeneGenehmigungen = () => istEltern() ? liste("genehmigungen", (g) => kinderVon(db, S.ich.id).includes(g.kind_id) && g.status === "ausstehend").length : 0;

export const KACHELN = {
  bachkreis: [
    { id: "cockpit", sym: "🧭", t: "Cockpit", u: "Was braucht meine Aufmerksamkeit?", v: "cockpit", nur: () => istLehrkraft() || istVorstand(), zahl: () => cockpit(db, S.ich.id).filter((c) => c.dring >= 2).length },
    { id: "termine", sym: "📅", t: "Termine", u: "Proben · Konzerte · Zu- & Absagen", v: "termine", zahl: () => offeneAntworten() },
    { id: "sos", sym: "🆘", t: "SOS – Notfall", u: "Notruf · Kontakte im Notfall", v: "sos", klasse: "sos" },
    { id: "nachrichten", sym: "💬", t: "Nachrichten", u: "Gruppen · Rundschreiben", v: "nachrichten", zahl: () => ungelesen() },
    { id: "orchester", sym: "🎼", t: "Orchester", u: "Gruppen A–D · Register", v: "orchester", nur: () => !istEltern() },
    { id: "pinnwand", sym: "📌", t: "Pinnwand", u: "Kurze Zettel · wichtig & erledigt", v: "pinnwand" },
    { id: "projekte", sym: "🎭", t: "Konzerte & Projekte", u: "Programm · Ablauf · Checkliste", v: "projekte" },
    { id: "noten", sym: "📚", t: "Notenarchiv", u: "Werke · Stimmen · Zuteilung", v: "noten", nur: () => istVerwalter() },
    { id: "instrumente", sym: "🎻", t: "Instrumente", u: "Inventar · Verleih · Reparatur", v: "instrumente", nur: () => istVerwalter(), zahl: () => liste("reparaturen", (r) => r.status === "gemeldet" || r.status === "angebot").length },
    { id: "genehmigungen", sym: "✍️", t: "Genehmigungen", u: "Einverständnis der Eltern", v: "genehmigungen", nur: () => istLehrkraft() },
    { id: "rundschreiben", sym: "📣", t: "Rundschreiben", u: "An Eltern, Schüler, Spender …", v: "rundschreiben", nur: () => istVerwalter() },
    { id: "foerderverein", sym: "💛", t: "Förderverein", u: "Einkauf · Spenden · Freigaben", v: "foerderverein", nur: () => istVorstand() || istLeitung() },
  ],
  meins: [
    { id: "meinetermine", sym: "🗓️", t: () => (istEltern() ? "Termine meiner Kinder" : "Meine Termine"), u: "Zusagen auf einen Blick", v: "termine", p: { filter: "meine" }, zahl: () => offeneAntworten() },
    { id: "kinder", sym: "👪", t: "Meine Kinder", u: "Gruppe · Instrument · Termine", v: "kinder", nur: () => istEltern() },
    { id: "meinegenehmigungen", sym: "✍️", t: "Genehmigungen", u: "Zustimmen · Ablehnen · Widerrufen", v: "meinegenehmigungen", nur: () => istEltern(), zahl: () => offeneGenehmigungen() },
    { id: "meinenoten", sym: "🎼", t: "Meine Noten", u: "Stimmen für mein Instrument", v: "meinenoten", nur: () => istSchueler() || istEltern() },
    { id: "meininstrument", sym: "🎻", t: () => (istEltern() ? "Leihinstrumente" : "Mein Leihinstrument"), u: "Rückgabe · Schaden melden", v: "meininstrument", nur: () => istSchueler() || istEltern() },
    { id: "abwesenheit", sym: "🏖️", t: "Abwesenheit", u: "Zeitraum auf einmal absagen", v: "abwesenheit", nur: () => istSchueler() || istEltern() },
    { id: "wechselwunsch", sym: "🔀", t: "Gruppenwechsel", u: "Wunsch an die Leitung", v: "wechselwunsch", nur: () => istSchueler() },
    { id: "meinedaten", sym: "🔐", t: "Meine Daten", u: "Was ist über mich gespeichert?", v: "meinedaten" },
    { id: "aenderung", sym: "✏️", t: "Änderung melden", u: "Neue Anschrift, Telefon …", v: "aenderung" },
    { id: "einstellungen", sym: "⚙️", t: "Meine Einstellungen", u: "Benachrichtigung · Schrift · Ansicht", v: "einstellungen" },
    { id: "test", sym: "🧪", t: "Test an mich", u: "Push & Mail ausprobieren", v: "test" },
  ],
  technik: [
    { id: "update", sym: "🔄", t: "Update prüfen", u: () => `Installiert: v${APP_VERSION} ${APP_STUFE}`, aktion: "updatePruefen" },
    { id: "sicherheit", sym: "🛡️", t: "Sicherheits-Check", u: "Läuft alles sicher? Jetzt prüfen", v: "sicherheit" },
    { id: "kalender", sym: "📆", t: "Kalender-Export", u: "Termine ins Handy übernehmen", v: "kalender" },
    { id: "hilfe", sym: "❓", t: "Hilfe & Tipps", u: "Kurz erklärt", v: "hilfe" },
    { id: "verwaltung", sym: "💻", t: "PC-Verwaltung", u: "Stammdaten am PC/Notebook pflegen", aktion: "verwaltungOeffnen", nur: () => istVerwalter() },
    { id: "ueber", sym: "ℹ️", t: "Über die App", u: "Version · Datenquelle · Lizenzen", v: "ueber" },
    { id: "demo", sym: "♻️", t: "Demo zurücksetzen", u: "Alle Demodaten neu erzeugen", aktion: "demoReset", nur: () => datenInfo().art === "lokal-demo" },
  ],
  admin: [],
};

// Admin-Register: Leitstand mit Lämpchen (grün gut · gelb aufpassen · rot Problem · grau unbekannt – grau ist nie OK)
export function adminZustaende() {
  const info = datenInfo();
  const vs = versandStatistik();
  const fehler24 = fehlerListe().filter((f) => Date.now() - new Date(f.zeit).getTime() < 86400000).length;
  const zug = liste("zugaenge");
  const nieGesehen = zug.filter((z) => z.aktiv && !z.zuletzt).length;
  const push = !("Notification" in globalThis) ? ["grau", "nicht unterstützt"] : Notification.permission === "granted" ? ["gruen", "auf diesem Gerät erlaubt"] : Notification.permission === "denied" ? ["rot", "auf diesem Gerät blockiert"] : ["gelb", "noch nicht erlaubt"];
  return {
    daten: info.server ? ["gruen", "Server verbunden"] : ["grau", "Demo – kein Server gemessen"],
    abgleich: [info.server ? "gruen" : "grau", `${liste("aenderungen").length} Änderungen protokolliert`],
    versand: [vs.fehler ? "gelb" : "grau", `${vs.gesamt} Einträge · simuliert`],
    push,
    zugaenge: [nieGesehen > 20 ? "gelb" : "gruen", `${zug.filter((z) => z.aktiv).length} aktiv · ${nieGesehen} nie angemeldet`],
    fehler: [fehler24 ? "rot" : "gruen", fehler24 ? `${fehler24} in 24 Std.` : "keine in 24 Std."],
    speicher: ["grau", "Speicher prüfen …"],
    version: ["gruen", `v${APP_VERSION} ${APP_STUFE}`],
    backup: [info.server ? "grau" : "grau", info.server ? "Backup-Messung folgt" : "Demo: Export als Datei"],
  };
}
const AD_KACHELN = [["daten", "🗄️", "Datenquelle"], ["abgleich", "🔁", "Abgleich"], ["versand", "📨", "Versand"], ["push", "🔔", "Push"], ["zugaenge", "🔑", "Zugänge"], ["fehler", "🩺", "Fehler"], ["speicher", "💾", "Speicher"], ["version", "📱", "Versionen"], ["backup", "🛟", "Backup / Export"]];
KACHELN.admin = AD_KACHELN.map(([id, sym, t]) => ({ id: "ad-" + id, sym, t, v: "admin", p: { blatt: id }, u: () => adminZustaende()[id][1], klasse: () => `ad l-${adminZustaende()[id][0]}`, nur: () => istLeitung() }));

const EINFACH = ["termine", "nachrichten", "sos", "meinetermine", "meinegenehmigungen", "meinenoten", "pinnwand", "cockpit"];
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

function led(farbe, titel) { return `<i class="led ${farbe}" title="${esc(titel)}"></i>`; }

VIEWS.start = {
  render() {
    const e = einst();
    const k = db.konfig();
    if (!registerSichtbar().find(([r]) => r === S.register)) S.register = "bachkreis";
    const az = adminZustaende();
    const stunde = new Date().getHours();
    const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Hallo" : "Guten Abend";
    let raster;
    if (e.einfach) {
      const alle = [...KACHELN.bachkreis, ...KACHELN.meins].filter((x) => EINFACH.includes(x.id) && (!x.nur || x.nur()));
      raster = `<div class="raster einfach" id="raster">${alle.map(kachelHtml).join("")}</div>`;
    } else {
      const reg = registerSichtbar().map(([r, n]) => `<button class="${r === S.register ? "an" : ""}" data-a="register" data-x="${r}" data-r="${r}">${n}<span class="anz">${kachelnFuer(r).length}</span></button>`).join("");
      raster = `<div class="register" id="register">${reg}</div><div class="raster" id="raster">${kachelnFuer(S.register).map(kachelHtml).join("")}</div>`;
    }
    return `
      <div class="hero">
        <div class="kopfzeile">
          <button class="logo" data-a="kachel" data-x="ueber" aria-label="Über die App">${BACHKREIS_LOGO}</button>
          <div class="kopftext"><div class="marke-klein">${esc((k.name || "Bachkreis").toUpperCase())}</div><div class="gruss">${gruss}, ${esc(S.ich.vorname)}!</div></div>
          <button class="rund" data-a="themaUmschalten" title="Tag/Nacht" aria-label="Tag/Nacht umschalten">${document.documentElement.classList.contains("dunkel") ? "☀️" : "🌙"}</button>
        </div>
        <div class="statusleiste">
          <button class="chip" data-a="kachel" data-x="meinedaten">${esc(ANSICHTEN[S.ansicht] || "")}</button>
          <button class="leds" data-a="ledBlatt" aria-label="Verbindungsstatus">${led(az.daten[0], "Daten: " + az.daten[1])}${led(az.versand[0], "Versand: " + az.versand[1])}${led(az.push[0], "Push: " + az.push[1])}</button>
        </div>
        <div class="info"><h2>${esc(k.untertitel || "")}</h2><div class="unter">${datum(new Date())}</div></div>
      </div>
      <div id="updateHinweis"></div>
      <div class="abschnitt"><h3>${e.einfach ? "Einfache Ansicht" : "Schnellzugriff"}</h3></div>
      ${raster}
      <div class="karte"><h3>Heute wichtig</h3>${heuteWichtig()}</div>
      <button class="knopf breit" data-a="ansichtWechseln">${e.einfach ? "🔧 Erweiterte Ansicht" : "🙂 Einfache Ansicht"}</button>
      <div class="fusszeile">Bachkreis-App v${APP_VERSION} ${APP_STUFE} · ${esc(datenInfo().hinweis || "")}</div>`;
  },
  nach() {
    // Wischen zwischen Registern (wie Club-App)
    const r = document.getElementById("raster");
    if (!r || einst().einfach) return;
    let x0 = null;
    r.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    r.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) < 70) return;
      const regs = registerSichtbar().map(([x]) => x); const i = regs.indexOf(S.register);
      const n = regs[i + (dx < 0 ? 1 : -1)]; if (n) { S.register = n; zeige("start", {}, { ersetzen: true }); }
    });
  },
};

AKTIONEN.register = (r) => { S.register = r; zeige("start", {}, { ersetzen: true }); };
AKTIONEN.kachel = (id) => {
  const k = Object.values(KACHELN).flat().find((x) => x.id === id);
  if (!k) return zeige(id);
  if (k.aktion) return AKTIONEN[k.aktion]();
  zeige(k.v, k.p || {});
};
AKTIONEN.ansichtWechseln = () => { einstSetzen("einfach", !einst().einfach); zeige("start", {}, { ersetzen: true }); };
AKTIONEN.themaUmschalten = () => { einstSetzen("thema", document.documentElement.classList.contains("dunkel") ? "hell" : "dunkel"); zeige("start", {}, { ersetzen: true }); };
AKTIONEN.ledBlatt = () => {
  const az = adminZustaende();
  const z = (f, t, x) => `<li><i class="led ${f}"></i><div class="fl"><b>${t}</b><div class="zeile-unter">${esc(x)}</div></div></li>`;
  blatt("Verbindung & Status", `<ul class="liste">${z(az.daten[0], "Daten", az.daten[1])}${z(az.versand[0], "Versand (Push/Mail)", az.versand[1])}${z(az.push[0], "Push auf diesem Gerät", az.push[1])}</ul>
    <p class="hinweis">Grün = gemessen und in Ordnung · Gelb = aufpassen · Rot = Problem · <b>Grau = unbekannt</b> (nie „in Ordnung“). In der Vorführversion gibt es keinen Server – deshalb grau.</p>`);
};
AKTIONEN.oeffne = (x) => { const [view, id] = String(x).split("|"); zeige(view, id ? { id } : {}); };
