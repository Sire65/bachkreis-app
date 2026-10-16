// Kopf der Startseite – aufgebaut wie in der KC Club App:
//  - Kopfzeile (Logo + Version, Name, Begrüßung, Tag/Nacht, Aktualisieren), Statusleiste (Ansicht, LEDs), Lichtschein beim Öffnen
//  - Jalousie: links ⌃ rollt das Infofeld ein (Statusleiste bleibt), rechts ⌃⌃ rollt alles bis auf die Kopfzeile ein (KC-CLUB-KOPF-ROLLO)
//  - Infofeld zum Blättern: ‹ › und « » auf dem Rahmen, Punkte darunter, Wischen im Feld (KC-CLUB-INFOFELD)
//    Karten: Nächster Termin · Wetter · Für dich · Demnächst · Kommunikationszentrale · Leitungszentrale
//  - Register Bachkreis/Meins/Technik/Admin mit Wechsel-Effekt (Jalousie, Kartenstapel, Umdrehen) und Wischen (KC-CLUB-REGISTER-EFFEKTE)
//  - Jahreszeiten im Kopf (jahreszeiten.js) und Kuckucksuhr zur vollen Stunde (KC-CLUB-KUCKUCKSUHR)
// Der Kopf ist EIN dauerhaftes Element: beim Neuzeichnen der Startseite wird er nur umgesetzt – so laufen Bühne und
// Animationen ungestört weiter.
import { S, db, einst, einstSetzen, zeige, istLeitung, istLehrkraft, istEltern, istSchueler, istVorstand, vorname, name, ANSICHTEN } from "./zustand.js";
import { esc, AKTIONEN, toast, datum, uhr, vorZeit, BACHKREIS_LOGO } from "../kern/ui.js";
import { liste, hole, konfig, datenInfo, jetztAbgleichen } from "../kern/daten.js";
import { termineFuer, antwortVon, kinderVon, cockpit, ausleihenVon } from "../kern/logik.js";
import { communicatorZustand, versandStatistik } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";
import { WET, WETTER_NEU_MIN, wetterLaden, infoWetter, wetterSzene, wetterTagDetails } from "./wetter.js";
import { jahreszeitKopf, jzEisLaenge, jzVorschauLeiste, jzPruefen, JZ_KONTEXT, istNacht } from "./jahreszeiten.js";
import { ESELSOHR } from "./buehne.js";
import { anwendenDesign } from "./darstellung.js";
import { spracheMoeglich } from "./sprache.js";

const $ = (id) => document.getElementById(id);
const K = { hero: null, glanzGelaufen: false, infoLetztes: "", adminZustaende: () => ({}), ungelesen: () => 0, meineUnterhaltungen: () => [], offeneGenehmigungen: () => 0 };
// start.js reicht Zähl-Funktionen herein (vermeidet Kreis-Importe)
export function kopfVerbinden(f) { Object.assign(K, f); }

// ---------- Hilfen ----------
const fuerWen = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);
export function naechsterTermin() {
  const l = fuerWen().flatMap((p) => termineFuer(db, p).filter((t) => t.status !== "abgesagt").map((t) => ({ t, p })));
  // Leitung und Lehrkräfte sind oft nicht selbst eingeladen – dann der nächste Termin des Bachkreises überhaupt
  if (!l.length && (istLehrkraft() || istVorstand())) { const heute = new Date(); heute.setHours(0, 0, 0, 0); for (const t of liste("termine", (x) => x.status !== "abgesagt" && new Date(x.ende || x.beginn) >= heute)) l.push({ t, p: S.ich.id }); }
  l.sort((a, b) => a.t.beginn.localeCompare(b.t.beginn));
  return l[0] || null;
}
JZ_KONTEXT.naechsterTermin = () => naechsterTermin()?.t || null;
const gruss = () => { const h = new Date().getHours(); return h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend"; };

// ---------- Aufbau (einmal) ----------
function kopfBauen() {
  const h = document.createElement("div");
  h.className = "hero"; h.id = "bkHero";
  h.innerHTML = `
    <button type="button" class="kopf-pfeil kp-halb" id="kopfPfeilHalb" data-a="kopfRollo" data-x="halb" title="Kopf halb einrollen – Statusleiste mit LEDs bleibt" aria-label="Kopf halb einrollen" aria-expanded="true"><span>⌃</span></button>
    <button type="button" class="kopf-pfeil kp-ganz" id="kopfPfeil" data-a="kopfRollo" data-x="ganz" title="Kopf ganz einrollen – nur die Kopfzeile bleibt" aria-label="Kopf ganz einrollen" aria-expanded="true"><span class="kp-doppel">⌃<b>⌃</b></span></button>
    <div class="kopf-glanz" id="kopfGlanz" aria-hidden="true"><b></b><u></u></div>
    <div class="kopfzeile">
      <div class="kopflogo"><button class="logo" data-a="webseite" aria-label="Internetseite des Bachkreises öffnen" title="Zur Bachkreis-Internetseite">${BACHKREIS_LOGO}</button><button class="kopf-version" id="kopfVersion" data-a="updatePruefen" title="Update prüfen" aria-label="Version – Update prüfen">v${APP_VERSION}</button></div>
      <div class="kopftext"><div class="marke-klein" id="kopfMarke"></div><div class="gruss"><span id="begruessung">Hallo!</span></div></div>
      <div class="kopfrechts"><div class="knopfreihe">
        <button class="rund" id="spracheKnopf" data-a="sprachsteuerung" title="Sprachsteuerung – sag, was passieren soll" aria-label="Sprachsteuerung" hidden>🎤</button>
        <button class="rund" id="modusKnopf" data-a="themaUmschalten" title="Tag/Nacht umschalten" aria-label="Tag/Nacht umschalten">🌙</button>
        <button class="rund" id="aktualisierenKnopf" data-a="kopfAktualisieren" title="Aktualisieren" aria-label="Aktualisieren">↻</button>
      </div></div>
    </div>
    <div class="statusleiste">
      <button class="statuschip" id="statusChip" data-a="kachel" data-x="meinedaten"></button>
      <span class="sl-luecke"></span>
      <button class="leds" id="leds" data-a="ledBlatt" title="Verbindung & Status" aria-label="Verbindung und Status"><i class="led grau" id="ledDaten"></i><i class="led grau" id="ledComm"></i><i class="led grau" id="ledPush"></i><i class="led-trenner" aria-hidden="true"></i><i class="led grau" id="ledWetter"></i></button>
    </div>
    <div class="info" id="heroInfo"><h2>Einen Moment …</h2><div class="unter">Daten werden geladen.</div></div>
    <div class="ipunkte" id="infoPunkte"></div>
    ${ESELSOHR}`;
  // Wischen im Infofeld (wie KC: links/rechts blättert, die Wetter-Tagesleiste scrollt selbst)
  let x0 = null, y0 = 0;
  h.addEventListener("touchstart", (e) => { const f = e.target.closest?.("#heroInfo"); if (!f || e.target.closest(".wtage")) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  h.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) infoBlaettern(dx < 0 ? 1 : -1);
  }, { passive: true });
  // Wetter-Tage: antippen = anzeigen, lange drücken = Details (KC-CLUB-WETTER-TAGE)
  let druck = null;
  h.addEventListener("pointerdown", (e) => {
    const b = e.target.closest?.("[data-wtag]"); if (!b) return;
    const i = +b.dataset.wtag; clearTimeout(druck?.timer);
    druck = { i, x: e.clientX, y: e.clientY, lang: false, timer: setTimeout(() => { if (!druck) return; druck.lang = true; try { navigator.vibrate?.(15); } catch {} wetterTagDetails(i, naechsterTermin()?.t); }, 550) };
  });
  h.addEventListener("pointermove", (e) => { if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) > 12) { clearTimeout(druck.timer); druck = null; } });
  const los = (e, abbruch) => {
    if (!druck) return; clearTimeout(druck.timer); const d = druck; druck = null;
    const b = e.target.closest?.("[data-wtag]");
    if (!abbruch && !d.lang && b && +b.dataset.wtag === d.i) { const sl = h.querySelector(".wtage")?.scrollLeft || 0; WET.tag = d.i; heroZeigen(0); const l = h.querySelector(".wtage"); if (l) l.scrollLeft = sl; }
  };
  h.addEventListener("pointerup", (e) => los(e, false));
  h.addEventListener("pointercancel", (e) => los(e, true));
  h.addEventListener("contextmenu", (e) => { if (e.target.closest?.("[data-wtag]")) e.preventDefault(); });
  // Lichtschein: nach dem Durchlauf „lauf“ entfernen
  const g = h.querySelector("#kopfGlanz");
  const aus = (e) => { if (e?.animationName && e.animationName !== "kopfFunkeln") return; g.classList.remove("lauf"); };
  g.addEventListener("animationend", aus); g.addEventListener("animationcancel", aus);
  return h;
}

// Startseite ruft das nach jedem Zeichnen auf: Kopf an seinen Platz setzen und Inhalte auffrischen
export function kopfEinsetzen(platz) {
  if (!platz) return;
  if (!K.hero) K.hero = kopfBauen();
  const neu = !K.hero.isConnected;
  platz.replaceWith(K.hero);
  kopfAuffrischen();
  if (neu) {
    try { const w = localStorage.getItem(KOPF_ROLLO); kopfRolloSetzen(w === "1" ? "ganz" : w === "halb" ? "halb" : "offen"); } catch {}
    requestAnimationFrame(() => { jzEisLaenge(); });
  }
  if (!K.hero.querySelector(".jz-schicht")) jahreszeitKopf(); else jzPruefen();
  jzVorschauLeiste(S.view);
  if (!K.glanzGelaufen) { K.glanzGelaufen = true; kopfGlanzStarten(); }
}

export function kopfAuffrischen() {
  const sk = K.hero?.querySelector("#spracheKnopf"); if (sk) sk.hidden = !(spracheMoeglich() && einst().sprachsteuerung !== false);
  const h = K.hero; if (!h || !S.ich) return;
  const az = K.adminZustaende();
  h.querySelector("#kopfMarke").textContent = (konfig().name || "Bachkreis Bergkamen").toUpperCase();
  h.querySelector("#begruessung").textContent = `${gruss()}, ${S.ich.vorname}!`;
  h.querySelector("#statusChip").textContent = `${ANSICHTEN[S.ansicht] || "🎻"} ▾`;
  anwendenDesign(); // Mond/Sonne mit A/T/N am Knopf
  h.querySelector("#kopfVersion").textContent = `v${APP_VERSION}`;
  const led = (id, [f, t], n) => { const e = h.querySelector("#" + id); e.className = "led " + f; e.title = `${n}: ${t}`; };
  if (az.daten) led("ledDaten", az.daten, "Daten");
  if (az.versand) led("ledComm", az.versand, "Communicator");
  if (az.push) led("ledPush", az.push, "Push");
  const w = WET.r?.daten ? (Date.now() - new Date(WET.r.stand) > 3 * 3600000 ? ["gelb", "Wetter veraltet"] : ["gruen", "Wetter aktuell"]) : WET.r ? ["rot", "Wetter nicht erreichbar"] : ["grau", "Wetter noch nicht geladen"];
  led("ledWetter", w, "Wetter");
  infoFelderAktualisieren();
  heroZeigen();
}

// ---------- Infofeld (KC-CLUB-INFOFELD) ----------
const INFO_ALLE = [
  { id: "termin", t: "Nächster Termin", html: () => infoTermin() },
  { id: "wetter", t: "Wetter", html: () => infoWetter(naechsterTermin()?.t) },
  { id: "fuerdich", t: "Für dich", html: () => infoFuerDich() },
  { id: "demnaechst", t: "Demnächst", html: () => infoDemnaechst() },
  { id: "zentrale", t: "Kommunikationszentrale", html: () => infoZentrale() },
  { id: "leitung", t: "Leitungszentrale", html: () => infoLeitung(), nur: () => istLehrkraft() || istVorstand() },
];
let INFO_FELDER = INFO_ALLE.filter((f) => !f.nur);
let INFO_I = (() => { try { return Math.max(0, INFO_ALLE.findIndex((f) => f.id === (einst().infoStart || localStorage.getItem("bk_infofeld")))); } catch { return 0; } })();
function infoFelderAktualisieren() {
  const aktuell = INFO_FELDER[INFO_I]?.id || INFO_ALLE[INFO_I]?.id;
  INFO_FELDER = INFO_ALLE.filter((f) => !f.nur || f.nur());
  INFO_I = Math.max(0, INFO_FELDER.findIndex((f) => f.id === aktuell));
}
export function heroZeigen(richtung) {
  const hi = $("heroInfo"); if (!hi || !S.ich) return;
  if (einst().einfach) INFO_I = 0; // einfache Ansicht: nur „Nächster Termin“ (wie KC)
  const f = INFO_FELDER[INFO_I] || INFO_FELDER[0], inhalt = f.html();
  const erzwingen = richtung !== undefined;
  if (!erzwingen && $("infoFeld") && K.infoLetztes === f.id + inhalt) return; // gleicher Inhalt → Wetter-Animation nicht neu starten
  K.infoLetztes = f.id + inhalt;
  hi.innerHTML = `<div class="ifeld ifeld-${f.id}${richtung ? (richtung > 0 ? " rein-r" : " rein-l") : ""}" id="infoFeld" data-id="${f.id}">${inhalt}</div>
    <button class="ipfeil links mit-sprung" data-a="infoBlaettern" data-x="-1" aria-label="Vorheriges Feld">‹</button><button class="ipfeil rechts mit-sprung" data-a="infoBlaettern" data-x="1" aria-label="Nächstes Feld">›</button>
    <button class="ipfeil links sprung" data-a="infoSpringen" data-x="-1" aria-label="Zur ersten Karte" title="Zur ersten Karte">«</button><button class="ipfeil rechts sprung" data-a="infoSpringen" data-x="1" aria-label="Zur letzten Karte" title="Zur letzten Karte">»</button>`;
  $("infoPunkte").innerHTML = INFO_FELDER.map((x, i) => `<button class="ipunkt${i === INFO_I ? " an" : ""}" data-a="infoGehe" data-x="${i}" aria-label="${esc(x.t)}" title="${esc(x.t)}"></button>`).join("");
  if (f.id === "wetter") { wetterSzene(); if (!WET.laedt && Date.now() - WET.geholt > WETTER_NEU_MIN * 60000) wetterLaden(() => { if (INFO_FELDER[INFO_I]?.id === "wetter") heroZeigen(0); kopfLedsWetter(); }); }
  if (f.id === "zentrale") zentraleUhr();
}
function kopfLedsWetter() { if (K.hero) kopfAuffrischen(); }
function infoGehe(i, richtung) {
  const n = INFO_FELDER.length, neu = ((i % n) + n) % n;
  if (!richtung) richtung = neu >= INFO_I ? 1 : -1;
  INFO_I = neu; try { localStorage.setItem("bk_infofeld", INFO_FELDER[neu].id); } catch {}
  heroZeigen(richtung);
}
function infoBlaettern(d) { if (einst().einfach) return; infoGehe(INFO_I + d, d); }
function infoSpringen(d) { if (einst().einfach) return; const ziel = d < 0 ? 0 : INFO_FELDER.length - 1; if (ziel !== INFO_I) infoGehe(ziel, d); }
AKTIONEN.infoBlaettern = (x) => infoBlaettern(+x);
AKTIONEN.infoSpringen = (x) => infoSpringen(+x);
AKTIONEN.infoGehe = (x) => infoGehe(+x);
// BK-WEBSEITE (0.6.1, wie KC webseite()): Logo oben links öffnet direkt die Internetseite des Bachkreises.
// Adresse steht in der Konfiguration (PC-Verwaltung → Einstellungen); nur http(s) wird geöffnet.
export const WEBSEITE_STANDARD = "https://www.gymnasium-bergkamen.de/bachkreis/";
export function webseiteUrl() {
  const u = String(konfig().webseite ?? WEBSEITE_STANDARD).trim();
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
}
AKTIONEN.webseite = () => {
  const u = webseiteUrl();
  if (u) window.open(u, "_blank", "noopener"); else toast("🌐 Für die Internetseite ist noch keine Adresse eingetragen (PC-Verwaltung → Einstellungen).");
};
export const infoKarten = () => INFO_ALLE.filter((f) => !f.nur || f.nur()).map((f) => [f.id, f.t]);

// Karte 1: Nächster Termin mit Zu-/Absage direkt im Kopf
function infoTermin() {
  const n = naechsterTermin();
  if (!n) return `<h2>📅 Keine Termine</h2><div class="unter">Gerade steht kein Termin an. Neue Termine erscheinen hier.</div>`;
  const { t, p } = n, a = antwortVon(db, t.id, p), art = hole("terminarten", t.art_id);
  const tage = Math.round((new Date(t.beginn).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const wann = tage === 0 ? "Heute" : tage === 1 ? "Morgen" : tage < 7 ? `In ${tage} Tagen` : datum(t.beginn);
  const ANTW = { ja: "✅ Zusage", vielleicht: "🤔 Vielleicht", nein: "❌ Absage" };
  return `<h2>${art?.sym || "📅"} ${esc(t.titel)}</h2>
    <div class="unter">${esc(wann)}${tage < 7 && tage > 1 ? ` (${esc(datum(t.beginn))})` : ""}, ${uhr(t.beginn)} Uhr${t.ort ? ` · 📍 ${esc(t.ort)}` : ""}${istEltern() ? ` · für ${esc(vorname(p))}` : ""}</div>
    <div class="ifzliste" style="grid-template-columns:repeat(3,1fr);display:grid">${Object.entries(ANTW).map(([k, txt]) => `<button class="ifz${a?.antwort === k ? " an" : ""}" data-a="antworten" data-x="${t.id}|${p}|${k}" style="justify-content:center">${txt}</button>`).join("")}</div>
    <button class="ifz" data-a="oeffne" data-x="termin|${t.id}" style="margin-top:6px"><span>🔎</span><span class="ifzt">${a ? `Deine Antwort: <b>${esc(ANTW[a.antwort])}</b>` : "<b>Noch keine Antwort</b> – bitte zu- oder absagen"}</span><span>›</span></button>`;
}

// Karte 3: alles, was mich gerade betrifft – jede Zeile führt direkt hin
function infoFuerDich() {
  const z = [], zeile = (sym, text, a, x = "") => `<button class="ifz" data-a="${a}" data-x="${esc(x)}"><span>${sym}</span><span class="ifzt">${text}</span><span>›</span></button>`;
  const ug = K.ungelesen();
  if (ug) z.push(zeile("💬", `<b>${ug}</b> neue Nachricht${ug > 1 ? "en" : ""}`, "kachel", "nachrichten"));
  let offen = 0; for (const p of fuerWen()) for (const t of termineFuer(db, p)) if (t.status !== "abgesagt" && !antwortVon(db, t.id, p)) offen++;
  if (offen) z.push(zeile("📅", `<b>${offen}</b> Termin${offen > 1 ? "e" : ""} ohne Zu- oder Absage`, "kachel", "meinetermine"));
  const og = K.offeneGenehmigungen();
  if (og) z.push(zeile("✍️", `<b>${og}</b> Genehmigung${og > 1 ? "en warten" : " wartet"} auf Ihre Antwort`, "kachel", "meinegenehmigungen"));
  if (istSchueler() || istEltern()) for (const kid of fuerWen()) for (const a of ausleihenVon(db, kid).filter((x) => x.bis && x.bis < new Date().toISOString().slice(0, 10)))
    z.push(zeile("🎻", `Leihinstrument${istEltern() ? ` (${esc(vorname(kid))})` : ""}: Rückgabe war am <b>${esc(a.bis.split("-").reverse().join("."))}</b>`, "kachel", "meininstrument"));
  if (istLehrkraft() || istVorstand()) { const c = cockpit(db, S.ich.id).filter((x) => x.dring >= 2).length; if (c) z.push(zeile("🧭", `<b>${c}</b> Punkt${c > 1 ? "e brauchen" : " braucht"} deine Aufmerksamkeit`, "kachel", "cockpit")); }
  const aufg = liste("aufgaben", (a) => a.zustaendig_id === S.ich.id && a.status !== "erledigt").length;
  if (aufg) z.push(zeile("🗂️", `<b>${aufg}</b> offene Aufgabe${aufg > 1 ? "n" : ""}`, "kachel", "cockpit"));
  const heute = new Date(), md = `${String(heute.getMonth() + 1).padStart(2, "0")}-${String(heute.getDate()).padStart(2, "0")}`;
  const gb = liste("personen", (p) => p.status === "aktiv" && (p.id === S.ich.id ? (p.geburtsdatum || "").slice(5, 10) === md : (p.freigaben?.geburtstag || p.gb_md) && (p.gb_md || (p.geburtsdatum || "").slice(5, 10)) === md));
  for (const p of gb.slice(0, 3)) z.push(zeile("🎂", p.id === S.ich.id ? "<b>Herzlichen Glückwunsch zum Geburtstag!</b> 🎉" : `<b>${esc(name(p))}</b> hat heute Geburtstag`, p.id === S.ich.id ? "konfetti" : "nix"));
  if (!z.length) return `<h2>👍 Alles erledigt</h2><div class="unter">Gerade ist nichts Offenes für dich. Schön! 🎶</div>`;
  const MAX = 4;
  return `<h2>✨ Für dich</h2><div class="ifzliste">${z.slice(0, MAX).join("")}</div>${z.length > MAX ? `<div class="unter" style="font-size:.85rem">… und ${z.length - MAX} weitere unten bei „Heute wichtig“</div>` : ""}`;
}

// Karte 4: die nächsten 14 Tage
function infoDemnaechst() {
  const bis = Date.now() + 14 * 86400000;
  const ids = new Set(), l = [];
  for (const p of fuerWen()) for (const t of termineFuer(db, p)) if (new Date(t.beginn) <= bis && !ids.has(t.id)) { ids.add(t.id); l.push(t); }
  l.sort((a, b) => a.beginn.localeCompare(b.beginn));
  if (!l.length) return `<h2>🗓️ Demnächst</h2><div class="unter">In den nächsten 14 Tagen steht nichts an.</div>`;
  return `<h2>🗓️ Demnächst</h2><div class="ifzliste">${l.slice(0, 4).map((t) => `<button class="ifz" data-a="oeffne" data-x="termin|${t.id}"><span>${hole("terminarten", t.art_id)?.sym || "📅"}</span><span class="ifzt"><b>${esc(t.titel)}</b><br><small>${esc(datum(t.beginn))}, ${uhr(t.beginn)} Uhr${t.status === "abgesagt" ? " · ❌ abgesagt" : ""}</small></span><span>›</span></button>`).join("")}</div>${l.length > 4 ? `<div class="unter" style="font-size:.85rem">… und ${l.length - 4} weitere</div>` : ""}`;
}

// Karte 5: Kommunikationszentrale (Leuchtanzeige wie KC-CLUB-ZENTRALE)
function infoZentrale() {
  const ug = K.ungelesen(), us = K.meineUnterhaltungen();
  const letzte = us.flatMap((u) => liste("nachrichten", (n) => n.unterhaltung_id === u.id).map((n) => ({ n, u }))).sort((a, b) => String(b.n.zeit).localeCompare(String(a.n.zeit))).slice(0, 3);
  const cz = communicatorZustand(), st = versandStatistik();
  const ticker = letzte.map(({ n, u }) => `${u.titel}: ${name(n.von)} – ${String(n.text || "").slice(0, 60)}`).join("   ✦   ") || "Keine neuen Nachrichten";
  return `<h2>📡 Kommunikationszentrale</h2>
    <div class="zdisplay"><div class="zdkopf"><span>BK COMMUNICATOR</span><span class="zuhr" id="zUhr">${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></div>
      <div class="zdwerte"><span>✉ ${ug} ungelesen</span><span>💬 ${us.length} Unterhaltungen</span><span>📨 ${st.heute} heute</span><span><i class="alampe ${cz.farbe}"></i> Versand</span></div>
      <div class="zticker"><span>${esc(ticker)}</span></div></div>
    <div class="zwer"><button class="zchip" data-a="kachel" data-x="nachrichten">💬 Nachrichten</button>${istLehrkraft() ? `<button class="zchip" data-a="kachel" data-x="rundschreiben">📣 Rundschreiben</button>` : ""}<button class="zchip" data-a="kachel" data-x="sos">🆘 SOS</button></div>`;
}
let zUhrTakt = 0;
function zentraleUhr() { clearInterval(zUhrTakt); zUhrTakt = setInterval(() => { const u = $("zUhr"); if (!u) return clearInterval(zUhrTakt); u.textContent = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }, 1000); }

// Karte 6: Leitungszentrale (Lämpchen wie KC-CLUB-ADMINLAGE) – nur Leitung, Lehrkräfte, Vorstand
function infoLeitung() {
  const az = K.adminZustaende();
  const c = cockpit(db, S.ich.id), d3 = c.filter((x) => x.dring >= 3).length, d2 = c.filter((x) => x.dring === 2).length;
  const zeile = (f, t, x) => `<div class="azeile"><i class="alampe ${f}"></i><b>${esc(t)}</b><span>${esc(x)}</span></div>`;
  const anteil = (() => { const n = naechsterTermin(); if (!n) return null; const alle = liste("antworten", (a) => a.termin_id === n.t.id); return { t: n.t, ja: alle.filter((a) => a.antwort === "ja").length, n: alle.length }; })();
  return `<h2>🧭 Leitungszentrale</h2>
    <div class="adisplay"><div class="zdkopf"><span>LAGE ${new Date().toLocaleDateString("de-DE")}</span><span>${d3 ? "🔴" : d2 ? "🟡" : "🟢"}</span></div>
      ${az.daten ? zeile(az.daten[0], "Daten", az.daten[1]) : ""}${az.versand ? zeile(az.versand[0], "Communicator", az.versand[1]) : ""}${az.zugaenge ? zeile(az.zugaenge[0], "Zugänge", az.zugaenge[1]) : ""}${az.fehler ? zeile(az.fehler[0], "Fehler", az.fehler[1]) : ""}</div>
    ${anteil ? `<div class="abalken"><span>📅</span><b>${esc(anteil.t.titel)}</b><span>${anteil.ja} Zusagen</span><div class="aspur"><i class="${anteil.ja >= 10 ? "gruen" : anteil.ja >= 5 ? "gelb" : "rot"}" style="width:${Math.min(100, anteil.ja * 4)}%"></i></div><small>${anteil.n} Antworten bisher</small></div>` : ""}
    <div class="zwer"><button class="zchip" data-a="kachel" data-x="cockpit">🧭 Cockpit${d3 + d2 ? ` (${d3 + d2})` : ""}</button>${istLeitung() ? `<button class="zchip" data-a="register" data-x="admin">🛠️ Admin</button>` : ""}<button class="zchip" data-a="verwaltungOeffnen">💻 PC-Verwaltung</button></div>`;
}

// ---------- Jalousie (KC-CLUB-KOPF-ROLLO, -ROLLO-2) ----------
const KOPF_ROLLO = "bk_kopf_eingerollt", ROLLO_FAHRT_MS = 1400, ROLLO_KLAPP_MS = 320, ROLLO_VERSATZ_MS = 22;
const ROLLO_RANG = { offen: 0, halb: 1, ganz: 2 };
const kopfRolloStand = () => { const h = K.hero; return h?.classList.contains("eingerollt") ? "ganz" : h?.classList.contains("halb-eingerollt") ? "halb" : "offen"; };
function kopfRolloKlassen(h, stand) { h.classList.toggle("eingerollt", stand === "ganz"); h.classList.toggle("halb-eingerollt", stand === "halb"); requestAnimationFrame(jzEisLaenge); }
function kopfRolloSetzen(stand) { const h = K.hero; if (!h) return; kopfRolloKlassen(h, stand); kopfPfeileZeigen(stand); }
function kopfPfeileZeigen(stand) {
  const g = $("kopfPfeil"), hb = $("kopfPfeilHalb");
  if (g) { const zu = stand === "ganz"; g.classList.toggle("dreh", zu); g.setAttribute("aria-expanded", zu ? "false" : "true"); g.title = zu ? "Kopf ausrollen – alles zeigen" : "Kopf ganz einrollen – nur die Kopfzeile bleibt"; g.setAttribute("aria-label", g.title.split(" – ")[0]); }
  if (hb) { const zu = stand !== "offen"; hb.classList.toggle("dreh", zu); hb.setAttribute("aria-expanded", zu ? "false" : "true"); hb.title = stand === "halb" ? "Kopf ausrollen – alles zeigen" : stand === "ganz" ? "Kopf halb ausrollen – Statusleiste mit LEDs zeigen" : "Kopf halb einrollen – Statusleiste mit LEDs bleibt"; hb.setAttribute("aria-label", hb.title.split(" – ")[0]); }
}
async function kopfRolloFahren(ziel) {
  const h = K.hero, kz = h?.querySelector(".kopfzeile"), sl = h?.querySelector(".statusleiste");
  const von = kopfRolloStand(); if (von === ziel) return;
  if (!h || !kz || !sl || typeof h.animate !== "function" || !h.getClientRects().length) return kopfRolloSetzen(ziel);
  if (h.dataset.rollt) return; h.dataset.rollt = "1";
  kopfPfeileZeigen(ziel);
  const zu = ROLLO_RANG[ziel] > ROLLO_RANG[von];
  const hoehe = (s) => { kopfRolloKlassen(h, s); return h.offsetHeight; };
  // Die Jalousie deckt nur den Teil ab, der verschwindet: bei „halb“ alles unter der Statusleiste, bei „ganz“ alles unter der Kopfzeile
  const kante = (s) => (s === "ganz" ? kz.offsetTop + kz.offsetHeight : sl.offsetTop + sl.offsetHeight) + 6;
  const offenerStand = zu ? von : ziel, engerStand = zu ? ziel : von;
  const klein = hoehe(engerStand), gross = hoehe(offenerStand), oben = kante(engerStand);
  const vorhang = document.createElement("div"); vorhang.className = "rollo-lamellen"; vorhang.style.top = oben + "px"; vorhang.style.height = Math.max(0, gross - oben) + "px";
  const anzahl = Math.ceil(Math.max(0, gross - oben) / 16);
  vorhang.innerHTML = '<i class="rl-lamelle"></i>'.repeat(anzahl);
  const leiste = document.createElement("div"); leiste.className = "rollo-leiste";
  const lamellen = [...vorhang.children], warten = (a) => a.finished.catch(() => {});
  const klappen = (auf) => Promise.all(lamellen.map((l, i) => warten(l.animate(auf ? [{ transform: "scaleY(1)", opacity: 1 }, { transform: "scaleY(.06)", opacity: 0 }] : [{ transform: "scaleY(.06)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }],
    { duration: ROLLO_KLAPP_MS, delay: (auf ? anzahl - 1 - i : i) * ROLLO_VERSATZ_MS, easing: "ease-in-out", fill: "forwards" }))));
  const fahren = (a, b) => { h.style.overflow = "hidden"; return warten(h.animate([{ height: a + "px" }, { height: b + "px" }], { duration: ROLLO_FAHRT_MS, easing: "cubic-bezier(.45,.05,.4,1)", fill: "forwards" })); };
  try {
    if (zu) { h.append(vorhang, leiste); lamellen.forEach((l) => { l.style.opacity = "0"; }); await klappen(false); await fahren(gross, klein); kopfRolloSetzen(ziel); }
    else { h.append(vorhang, leiste); await fahren(klein, gross); await klappen(true); kopfRolloSetzen(ziel); }
  } finally {
    h.getAnimations?.().forEach((a) => { if (a.effect?.target === h) a.cancel(); }); h.style.overflow = ""; vorhang.remove(); leiste.remove(); delete h.dataset.rollt;
    kopfRolloSetzen(kopfRolloStand());
  }
}
// rechts ⌃⌃: offen/halb → ganz, ganz → offen · links ⌃: offen → halb, halb → offen, ganz → halb
AKTIONEN.kopfRollo = (art = "ganz") => {
  if (K.hero?.dataset.rollt) return;
  const von = kopfRolloStand();
  const ziel = art === "halb" ? (von === "offen" ? "halb" : von === "halb" ? "offen" : "halb") : (von === "ganz" ? "offen" : "ganz");
  kopfRolloFahren(ziel);
  try { ziel === "offen" ? localStorage.removeItem(KOPF_ROLLO) : localStorage.setItem(KOPF_ROLLO, ziel === "ganz" ? "1" : "halb"); } catch {}
};

// ---------- Lichtschein beim Öffnen (KC-CLUB-KOPF-GLANZ, -AUFBLITZEN) ----------
function kopfGlanzStarten(seit = Date.now()) {
  const g = $("kopfGlanz"); if (!g || getComputedStyle(g).display === "none") return;
  const frei = !document.hidden && S.view === "start" && !document.getElementById("blattHg") && g.offsetParent !== null;
  if (!frei) { if (Date.now() - seit < 600000) setTimeout(() => kopfGlanzStarten(seit), 700); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { // Stern funkelt am Logo, wandert schräg nach unten rechts und blitzt in der Mitte auf
      const l = K.hero.querySelector(".kopflogo .logo")?.getBoundingClientRect(), k = g.getBoundingClientRect();
      if (l?.width) {
        const fx = Math.round(l.left - k.left + l.width * 0.78), fy = Math.round(l.top - k.top + l.height * 0.22), zx = Math.round(k.width - 30), zy = Math.round(k.height - 24);
        g.style.setProperty("--fx", `${fx}px`); g.style.setProperty("--fy", `${fy}px`); g.style.setProperty("--dx", `${zx - fx}px`); g.style.setProperty("--dy", `${zy - fy}px`);
        g.style.setProperty("--mx", `${Math.round((fx + zx) / 2)}px`); g.style.setProperty("--my", `${Math.round((fy + zy) / 2)}px`);
      }
    } catch {}
    g.classList.remove("lauf"); void g.offsetWidth; g.classList.add("lauf");
  }));
}
{ let weg = 0; document.addEventListener("visibilitychange", () => { if (document.hidden) { weg = Date.now(); return; } if (weg && Date.now() - weg >= 60000 && K.hero?.isConnected) kopfGlanzStarten(); }); }

AKTIONEN.kopfAktualisieren = async () => {
  const b = $("aktualisierenKnopf"); b?.animate?.([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 700 });
  WET.geholt = 0; await jetztAbgleichen?.();
  wetterLaden(() => kopfAuffrischen());
  kopfAuffrischen(); toast("↻ Aktualisiert");
};

// ---------- Register-Wechsel mit Effekt (KC-CLUB-REGISTER-EFFEKTE) ----------
export const REG_EFFEKTE = [["jalousie", "🪟 Jalousie"], ["karten", "🃏 Kartenstapel"], ["drehen", "🔄 Umdrehen"], ["zufall", "🎲 Zufall"], ["aus", "🚫 Aus"]];
export const regEffektWahl = () => { try { const w = localStorage.getItem("bk_regEffekt"); return REG_EFFEKTE.some(([k]) => k === w) ? w : "jalousie"; } catch { return "jalousie"; } };
export function regEffektSetzen(w) { try { localStorage.setItem("bk_regEffekt", w); } catch {} }
export function regEffekt(richtung, art) {
  let w = art || regEffektWahl();
  if (w === "aus" || !einst().effekte || einst().einfach) return false;
  if (w === "zufall") w = ["jalousie", "karten", "drehen"][Math.floor(Math.random() * 3)];
  const ra = $("raster"); if (!ra?.animate) return false;
  const k = [...ra.children].filter((x) => x.offsetParent !== null).slice(0, 40);
  if (!k.length) return false;
  ra.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
  const oben = Math.min(...k.map((x) => x.offsetTop)), reihe = (x) => Math.round((x.offsetTop - oben) / Math.max(40, k[0].offsetHeight * 0.6));
  const seite = richtung < 0 ? -1 : 1, P = "perspective(800px) ";
  k.forEach((x, i) => {
    const r = reihe(x), spalte = k.filter((y, j) => j < i && reihe(y) === r).length;
    let f, o;
    if (w === "jalousie") { // Lamellen: jede Kachel klappt von oben herunter, Reihe für Reihe
      x.style.transformOrigin = "50% 0";
      f = [{ transform: P + "rotateX(-92deg)", opacity: 0 }, { transform: P + "rotateX(14deg)", opacity: 1, offset: 0.62 }, { transform: P + "rotateX(-5deg)", offset: 0.82 }, { transform: P + "rotateX(0)", opacity: 1 }];
      o = { duration: 520, delay: r * 85 + spalte * 30, easing: "cubic-bezier(.25,.7,.35,1)" };
    } else if (w === "karten") { // Kartenstapel: fliegen in Wischrichtung herein und legen sich ab
      f = [{ transform: `translate(${seite * 115}%, -18%) rotate(${seite * 16}deg) scale(.82)`, opacity: 0 }, { transform: `translate(${seite * -4}%, 2%) rotate(${seite * -2.5}deg) scale(1.03)`, opacity: 1, offset: 0.72 }, { transform: "none", opacity: 1 }];
      o = { duration: 540, delay: i * 48, easing: "cubic-bezier(.2,.85,.3,1)" };
    } else { // Umdrehen: eine schnelle Drehung um die eigene Achse
      f = [{ transform: P + "rotateY(-300deg) scale(.6)", opacity: 0 }, { transform: P + "rotateY(18deg) scale(1.05)", opacity: 1, offset: 0.7 }, { transform: P + "rotateY(0) scale(1)", opacity: 1 }];
      o = { duration: 640, delay: i * 42, easing: "cubic-bezier(.2,.7,.3,1)" };
    }
    const a = x.animate(f, { ...o, fill: "backwards" });
    a.onfinish = a.oncancel = () => { x.style.transformOrigin = ""; };
  });
  return true;
}

// ---------- Kuckucksuhr zur vollen Stunde (KC-CLUB-KUCKUCKSUHR, -KLANG-2, -ECHT) ----------
// Nur solange die App offen und sichtbar ist; einmal je Stunde und Gerät; 12-Stunden-Zählung; Ton nur mit „Töne“ an und nicht nachts.
// Ruf: echte Kuckucksuhr-Aufnahme (CC0, freesound.org/s/128177, wie in der KC Club App), sonst selbst erzeugter Klang.
const KK_FENSTER_MIN = 2, KK_NACHT_VON = 22, KK_NACHT_BIS = 7, KK_TAKT_MS = 1500;
let audio = null, KK_RAUSCHEN = null, KK_HALL = null;
const KK_AUFNAHME = { datei: "ton/kuckuck-ruf.mp3", puffer: null, laeuft: null };
const kkJetzt = () => { const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number); return { h, m }; };
const kkRufe = (h) => (h % 12) || 12;
function kkRauschen() { if (KK_RAUSCHEN) return KK_RAUSCHEN; const b = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (KK_RAUSCHEN = b); }
function kkHall() {
  if (KK_HALL) return KK_HALL;
  const sr = audio.sampleRate, n = Math.floor(sr * 0.5), ir = audio.createBuffer(2, n, sr);
  for (let k = 0; k < 2; k++) { const d = ir.getChannelData(k); let tief = 0; for (let i = 0; i < n; i++) { tief = tief * 0.7 + (Math.random() * 2 - 1) * 0.3; d[i] = tief * Math.pow(1 - i / n, 4); } }
  const c = audio.createConvolver(); c.buffer = ir; const g = audio.createGain(); g.gain.value = 0.22; c.connect(g).connect(audio.destination);
  return (KK_HALL = c);
}
function kkAusgang() { const g = audio.createGain(), lp = audio.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3000; g.connect(lp); lp.connect(audio.destination); lp.connect(kkHall()); return g; }
function kkGong(t) {
  const aus = kkAusgang();
  for (const [mal, laut, dauer] of [[1, 0.3, 1.8], [2.76, 0.13, 1.1], [5.4, 0.06, 0.6], [8.93, 0.025, 0.3]]) {
    const o = audio.createOscillator(), g = audio.createGain(); o.type = "sine"; o.frequency.value = 311 * mal;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(aus); o.start(t); o.stop(t + dauer + 0.05);
  }
}
function kkKlack(t) {
  const aus = kkAusgang(), n = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  n.buffer = kkRauschen(); f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 4;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(f).connect(g).connect(aus); n.start(t, Math.random()); n.stop(t + 0.04);
}
function kkPfeife(f, t, dauer, laut = 1) {
  const aus = kkAusgang(), hk = audio.createGain(); hk.connect(aus);
  hk.gain.setValueAtTime(0.0001, t); hk.gain.exponentialRampToValueAtTime(laut * 0.5, t + 0.05);
  hk.gain.setValueAtTime(laut * 0.5, t + dauer - 0.1); hk.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  const tonhoehe = (p, mal) => { p.setValueAtTime(f * mal, t); p.setValueAtTime(f * mal, t + dauer - 0.12); p.exponentialRampToValueAtTime(f * mal * 0.96, t + dauer); };
  for (const [mal, a] of [[1, 1], [2, 0.03], [3, 0.11], [5, 0.02]]) {
    const o = audio.createOscillator(), g = audio.createGain(); o.type = "sine"; tonhoehe(o.frequency, mal); g.gain.value = a;
    o.connect(g).connect(hk); o.start(t); o.stop(t + dauer + 0.02);
  }
  const sp = audio.createOscillator(), sg = audio.createGain();
  sp.type = "sine"; sp.frequency.value = f * 2; sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.18 * laut, t + 0.012); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  sp.connect(sg).connect(aus); sp.start(t); sp.stop(t + 0.08);
  const n = audio.createBufferSource(), bp = audio.createBiquadFilter(), ng = audio.createGain();
  n.buffer = kkRauschen(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 6; ng.gain.value = 0.06;
  n.connect(bp).connect(ng).connect(hk); n.start(t, Math.random()); n.stop(t + dauer + 0.02);
}
function kkTon(t0) { kkGong(t0); kkKlack(t0 + 0.18); kkPfeife(440, t0 + 0.24, 0.26, 1); kkPfeife(349.23, t0 + 0.56, 0.5, 0.95); }
function kkAufnahmeLaden() {
  if (KK_AUFNAHME.puffer || KK_AUFNAHME.laeuft || !audio) return KK_AUFNAHME.laeuft;
  KK_AUFNAHME.laeuft = fetch(KK_AUFNAHME.datei).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((b) => new Promise((ja, nein) => audio.decodeAudioData(b, ja, nein))).then((p) => (KK_AUFNAHME.puffer = p)).catch(() => { KK_AUFNAHME.laeuft = null; return null; });
  return KK_AUFNAHME.laeuft;
}
function kkAufnahmeSpielen(t) { const q = audio.createBufferSource(), g = audio.createGain(); q.buffer = KK_AUFNAHME.puffer; g.gain.value = 0.9; q.connect(g).connect(audio.destination); q.start(t); }
export function kuckuckZeigen(h = kkJetzt().h, tonImmer = false) {
  document.querySelector(".kuckuck")?.remove();
  const n = kkRufe(h), mitTon = einst().ton !== false && (tonImmer || !(h >= KK_NACHT_VON || h < KK_NACHT_BIS));
  const z = (h % 12) * 30, zeiger = (w, l, b) => `<line x1="75" y1="80" x2="${75 + l * Math.sin(w * Math.PI / 180)}" y2="${80 - l * Math.cos(w * Math.PI / 180)}" stroke="#2b1607" stroke-width="${b}" stroke-linecap="round"/>`;
  const u = document.createElement("div"); u.className = "kuckuck"; u.setAttribute("role", "img"); u.setAttribute("aria-label", `Kuckucksuhr: ${h} Uhr`); u.title = `${h} Uhr – antippen schließt die Uhr`;
  u.innerHTML = `<svg viewBox="0 0 150 175" aria-hidden="true">
    <g class="kk-pendel"><line x1="75" y1="128" x2="75" y2="160" stroke="#8a5a1a" stroke-width="2"/><circle cx="75" cy="163" r="7" fill="#d4a017" stroke="#8a5a1a" stroke-width="1.5"/></g>
    <line x1="58" y1="128" x2="58" y2="150" stroke="#555" stroke-width="1.2"/><path d="M53 150h10l-2 14h-6z" fill="#4a3a20"/>
    <line x1="92" y1="128" x2="92" y2="146" stroke="#555" stroke-width="1.2"/><path d="M87 146h10l-2 14h-6z" fill="#4a3a20"/>
    <path d="M22 55 L75 12 L128 55 L120 128 L30 128 Z" fill="#7a4a1e" stroke="#3a1f0a" stroke-width="2"/>
    <path d="M8 60 L75 4 L142 60 L134 64 L75 16 L16 64 Z" fill="#4e2a0e" stroke="#2b1607" stroke-width="1.5"/>
    <path d="M60 4 q15 -8 30 0" fill="none" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/><circle cx="75" cy="2" r="4" fill="#d4a017"/>
    <rect x="61" y="27" width="28" height="22" rx="3" fill="#1a0d04"/>
    <g class="kk-vogel"><ellipse cx="75" cy="40" rx="10" ry="7" fill="#8d6e63"/><circle cx="81" cy="34" r="5.5" fill="#a1887f"/><circle cx="83" cy="33" r="1.3" fill="#111"/>
      <path class="kk-schnabel" d="M86 34 l7 1.5 l-7 1.5 z" fill="#f9a825"/><path d="M66 40 l-7 -3 l2 5 z" fill="#6d4c41"/></g>
    <rect class="kk-tuer" x="61" y="27" width="28" height="22" rx="3" fill="#a0652a" stroke="#3a1f0a" stroke-width="1.5"/>
    <circle cx="75" cy="80" r="26" fill="#fff8e1" stroke="#3a1f0a" stroke-width="2.5"/>
    ${Array.from({ length: 12 }, (_, i) => { const w = i * 30 * Math.PI / 180; return `<line x1="${75 + 21 * Math.sin(w)}" y1="${80 - 21 * Math.cos(w)}" x2="${75 + 24 * Math.sin(w)}" y2="${80 - 24 * Math.cos(w)}" stroke="#3a1f0a" stroke-width="${i % 3 ? 1.2 : 2.4}"/>`; }).join("")}
    ${zeiger(z, 13, 3.2)}${zeiger(0, 19, 2)}<circle cx="75" cy="80" r="2.6" fill="#2b1607"/>
    <path d="M30 128 h90" stroke="#3a1f0a" stroke-width="3"/><path d="M40 112 q8 -10 16 0 M94 112 q8 -10 16 0" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/>
  </svg><div class="kk-zahl" aria-hidden="true">${h}</div>`;
  const zu = () => { clearTimeout(u._t); u.classList.remove("an"); setTimeout(() => u.remove(), 600); };
  u.addEventListener("click", (e) => (u._tipp ? u._tipp(e) : zu())); document.body.appendChild(u);
  requestAnimationFrame(() => requestAnimationFrame(() => u.classList.add("an")));
  if (mitTon) try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); kkAufnahmeLaden(); } catch {}
  let i = 0, gespielt = 0;
  // Wie KC 2.428.0: Android gibt den Ton erst nach einem Tippen in der App frei. Ist er noch gesperrt (App zur vollen Stunde geöffnet),
  // wartet die Uhr bis zu 20 s mit „🔊 Antippen“; ruft sie stumm, bietet sie danach eine Minute „nochmal mit Ton“ an.
  const hinweis = (text) => {
    u.querySelector(".kk-tonhinweis")?.remove(); u.insertAdjacentHTML("beforeend", `<div class="kk-tonhinweis">${text}</div>`);
    u._tipp = (e) => {
      e.stopPropagation(); u._tipp = null; u.querySelector(".kk-tonhinweis")?.remove(); clearTimeout(u._t);
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); kkAufnahmeLaden(); } catch {} // im Tippen = erlaubt
      i = 0; gespielt = 0; u._nochmal = true; u.classList.add("offen");
      Promise.race([Promise.resolve(audio?.resume?.()), new Promise((r) => setTimeout(r, 1500))]).catch(() => {}).then(() => { if (u.isConnected) u._t = setTimeout(ruf, 350); });
    };
  };
  const ruf = () => {
    if (!u.isConnected) return;
    if (i >= n) {
      u.classList.remove("offen");
      if (mitTon && !gespielt && !u._nochmal) { hinweis(`🔊 Antippen – ${n}× mit Ton`); u._t = setTimeout(zu, 60000); return; }
      u._t = setTimeout(zu, 1400); return;
    }
    i++; u.classList.add("ruft"); setTimeout(() => u.classList.remove("ruft"), 350);
    if (mitTon && audio) try { // läuft der Ton nicht, wecken – gespielt wird nur, wenn er binnen 0,4 s läuft (nie übereinander)
      const spielen = () => { gespielt++; if (KK_AUFNAHME.puffer) kkAufnahmeSpielen(audio.currentTime + 0.02); else kkTon(audio.currentTime + 0.02); };
      if (audio.state === "running") spielen();
      else { const ab = Date.now(); Promise.resolve(audio.resume?.()).then(() => { if (audio.state === "running" && Date.now() - ab < 400 && u.isConnected) spielen(); }, () => {}); }
    } catch {}
    u._t = setTimeout(ruf, KK_AUFNAHME.puffer && mitTon ? Math.round(KK_AUFNAHME.puffer.duration * 1000) : KK_TAKT_MS);
  };
  if (mitTon && (!audio || audio.state !== "running") && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    hinweis(`🔊 Antippen – der Kuckuck ruft ${n}×`);
    u._t = setTimeout(() => { u._tipp = null; u.querySelector(".kk-tonhinweis")?.remove(); u.classList.add("offen"); u._t = setTimeout(ruf, 350); }, 20000);
    return n;
  }
  const bereit = mitTon && audio ? Promise.race([Promise.resolve(audio.resume?.()).then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 1500))]) : Promise.resolve(false);
  u._t = setTimeout(() => { u.classList.add("offen"); bereit.then(() => { if (u.isConnected) u._t = setTimeout(ruf, 350); }); }, 700);
  return n;
}
function kuckuckPruefen() {
  if (!S.ich || document.hidden || einst().kuckuck === false) return;
  const { h, m } = kkJetzt(); if (m >= KK_FENSTER_MIN) return;
  const stunde = `${new Date().toISOString().slice(0, 10)} ${h}`;
  try { if (localStorage.getItem("bk_kuckuck_zuletzt") === stunde) return; localStorage.setItem("bk_kuckuck_zuletzt", stunde); } catch { return; }
  kuckuckZeigen(h);
}
setInterval(kuckuckPruefen, 15000); document.addEventListener("visibilitychange", () => { if (!document.hidden) kuckuckPruefen(); });
AKTIONEN.kuckuckProbe = () => kuckuckZeigen(kkJetzt().h, true);

// ---------- Konfetti zum eigenen Geburtstag (KC-CLUB-KONFETTI) – in Bachkreis-Farben Gold, Schwarz, Weiß ----------
const KONFETTI_FARBEN = ["#d4a017", "#f2b705", "#1a1500", "#ffffff", "#fff1a8", "#8a6400"];
export function konfetti(x = innerWidth / 2, y = innerHeight / 3, menge = 90) {
  if (!einst().effekte || !document.body.animate) return;
  for (let i = 0; i < menge; i++) {
    const e = document.createElement("i"); e.className = "konfetti";
    e.style.cssText = `left:${x}px;top:${y}px;background:${KONFETTI_FARBEN[i % KONFETTI_FARBEN.length]};width:${6 + Math.random() * 5}px;height:${8 + Math.random() * 6}px`;
    document.body.appendChild(e);
    const w = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260, dx = Math.cos(w) * v, dy = Math.sin(w) * v - 160;
    e.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: `translate(${dx}px, ${dy + 420}px) rotate(${Math.random() * 1080 - 540}deg)`, opacity: 0 }],
      { duration: 1600 + Math.random() * 900, easing: "cubic-bezier(.2,.6,.4,1)" }).onfinish = () => e.remove();
  }
}
AKTIONEN.konfetti = () => konfetti();

// Nachts den Tag/Nacht-Knopf passend anzeigen (Hinweis für die Bühne: istNacht kommt aus jahreszeiten.js)
export const nachtJetzt = () => istNacht();

// Vorschau-Knopf („✕ beenden“) nur auf der Startseite (wie KC-CLUB-VORSCHAU-ENDE)
document.addEventListener("bk-ansicht", () => jzVorschauLeiste(S.view));
