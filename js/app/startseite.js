// 🏠 Startseite wie in der KC Club App (0.28.0):
//  - 🟢 Einfache / 🔧 Erweiterte Ansicht: beim ersten Start eine Frage (Echtbetrieb), umschaltbar unten und in ⚙️ (KC-CLUB-ANSICHT)
//  - 🔄 Kachel umdrehen: doppelt tippen → hinten passende Schnellaktionen, ↩ oder nach 8 s zurück (KC-CLUB-KACHEL-RUECKSEITE)
//  - ✥ Anordnen: lange drücken → Kacheln ziehen, ◀▲▼▶, ✕ verbergen / 👁️ einblenden; Register festhalten und verschieben (KC-CLUB-KACHELN-ZIEHEN)
//  - 🙈 Ausgeblendete anzeigen · ⭐ zuletzt gewählte Kachel · Kachelgröße normal/klein/mini · Zahlen zählen hoch
//  - 📰 Info-Laufband über den drei Feldern (KC-CLUB-INFO-LAUFBAND) · 🔢 Fallblatt-Countdown (KC-CLUB-FALLBLATT)
//  - ⚡ Schnellstart-Karte im Infofeld (KC-CLUB-SCHNELLSTART) · 💡 Vorschläge zur Startseite (KC-CLUB-KACHEL-VORSCHLAG)
//  - 📋 Tagesübersicht für Leitung/Lehrkräfte/Vorstand (KC-CLUB-TAGESINFO)
// Alles merkt sich nur DIESES Gerät (Geräte-Einstellungen); gezählt wird lokal, nichts geht an den Server.
import { S, db, zeige, einst, einstSetzen, istEltern, istSchueler, istLehrkraft, istVorstand, istVerwalter, hatRolle, vorname, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, datum, uhr, frage } from "../kern/ui.js";
import { liste, hole, datenInfo } from "../kern/daten.js";
import { kinderVon, termineFuer, antwortVon, cockpit, tagIso, ausleihenVon, aufgabeGiltFuer } from "../kern/logik.js";

let SV = {}; // von start.js: { KACHELN, kachelnFuer, kachelnAlle, register, neuZeichnen, ungelesen, offeneAntworten, offeneGenehmigungen, onlineZahl, pwOffen }
export function startseiteVerbinden(f) { Object.assign(SV, f); }
const lehrt = () => hatRolle("admin", "leitung", "lehrkraft");
const ruhig = () => einst().effekte === false || matchMedia("(prefers-reduced-motion: reduce)").matches;
const lokal = { lesen: (k, std) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? std; } catch { return std; } }, schreiben: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const heute = () => tagIso(new Date());
const demo = () => datenInfo().art === "lokal-demo";
const leise = (b) => { if (b) b.dataset.leise = "1"; return b; }; // darf von 🏎️ Express verdrängt werden
const leute = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);

// ================= 🔄 Kachel-Rückseite =================
const ZS = (v, f, p) => () => { zeige(v, p || {}); if (f) setTimeout(f, 250); };
const AK = (n, x) => () => AKTIONEN[n]?.(x);
const UB = (m) => ZS("buehne", () => AKTIONEN.ubModus?.(m), { modus: "ueben" });
export const KACHEL_RUECK = {
  termine: [["🗓️", "Meine Termine", ZS("termine", null, { filter: "meine" })], ["＋", "Neuer Termin", AK("terminNeu"), () => hatRolle("admin", "leitung", "lehrkraft", "terminplaner")], ["🏖️", "Abwesenheit", ZS("abwesenheit"), () => istSchueler() || istEltern()]],
  meinetermine: [["📅", "Alle Termine", ZS("termine")], ["🏖️", "Abwesenheit", ZS("abwesenheit"), () => istSchueler() || istEltern()], ["📆", "Im Handy-Kalender", ZS("kalender")]],
  nachrichten: [["✉️", "Neue Nachricht", AK("chatNeu")], ["🟢", "Wer ist online?", AK("onlineListe")], ["📣", "Rundschreiben", ZS("rundschreiben"), () => istVerwalter()]],
  pinnwand: [["📝", "Neuer Zettel", ZS("pinnwand", AK("pwNeu"))], ["📌", "Zur Pinnwand", ZS("pinnwand")]],
  buehne: [["🎼", "Vorhang auf", ZS("buehne", AK("bwSpielen"))], ["🎻", "Üben", ZS("buehne", null, { modus: "ueben" })]],
  uebebuehne: [["🎼", "Mitspielen", UB("mitspielen")], ["🥁", "Rhythmus", UB("rhythmus")], ["🎯", "Stimmgerät", UB("stimmen")]],
  ueben: [["⏱", "Stoppuhr starten", ZS("ueben", AK("uebenUhr", "start"))], ["🎭", "Übe-Bühne", ZS("buehne", null, { modus: "ueben" })]],
  uebeuebersicht: [["📊", "Fortschritt", AK("ubFortschritt")], ["＋", "Übe-Aufgabe", ZS("buehne", AK("aufgabeNeu"), { modus: "ueben" })]],
  orchester: [["🟢", "Wer ist online?", AK("onlineListe")], ["🙂", "Mein Gesicht", AK("meinGesicht")]],
  sos: [["📞", "112 anrufen", () => { location.href = "tel:112"; }], ["🆘", "SOS öffnen", ZS("sos")]],
  chronik: [["🎼", "Repertoire", ZS("chronik", null, { tab: "repertoire" })], ["ℹ️", "Über uns", ZS("chronik", null, { tab: "ueber" })]],
  anfragen: [["＋", "Neue Anfrage", ZS("anfragen", AK("anNeu"))], ["📨", "Alle Anfragen", ZS("anfragen")]],
  dokumente: [["📂", "Dokumente", ZS("dokumente")], ["＋", "Dokument hochladen", ZS("dokumente", AK("dokNeu")), () => lehrt() || istVorstand()]],
  einstellungen: [["🧩", "Startseite & Ansicht", ZS("einstellungen")], ["🌗", "Hell / Dunkel", AK("themaUmschalten")]],
  kalender: [["📆", "Kalender-Abo", ZS("kalender")], ["🗓️", "Meine Termine", ZS("termine", null, { filter: "meine" })]],
};
const krAn = () => !einst().einfach && einst().kachelRueck !== false;
const krAktionen = (id) => (KACHEL_RUECK[id] || []).filter((a) => !a[3] || a[3]());
const KR = { letzt: { id: null, t: 0 }, warte: null, offen: null, zu: null };
function krUmdrehen(el, zurueck) {
  const id = el.dataset.id, k = Object.values(SV.KACHELN || {}).flat().find((x) => x.id === id);
  el.classList.add("kr-dreht");
  setTimeout(() => {
    if (zurueck || el.classList.contains("kr-hinten")) { KR.offen = null; clearTimeout(KR.zu); SV.neuZeichnen?.(); return; }
    el.classList.add("kr-hinten"); KR.offen = id;
    el.innerHTML = `<div class="kr-titel">${k?.sym || ""} ${esc(typeof k?.t === "function" ? k.t() : k?.t || "")}</div>${krAktionen(id).map((a, i) => `<span class="kr-akt" role="button" tabindex="0" data-kr="${i}">${a[0]} ${esc(a[1])}</span>`).join("")}<span class="kr-zurueck" role="button" tabindex="0" data-kr="zu" aria-label="Zurückdrehen">↩</span>`;
    requestAnimationFrame(() => el.classList.remove("kr-dreht"));
    clearTimeout(KR.zu); KR.zu = setTimeout(() => { if (KR.offen === id && el.isConnected) krUmdrehen(el, true); }, 8000);
  }, ruhig() ? 0 : 160);
}
export const kachelOffenHinten = () => !!(KR.offen && document.querySelector("#raster > .kachel.kr-hinten"));
// Wächter vor dem normalen Öffnen (Erfassungsphase): Doppeltipp erkennen, Rückseiten-Aktionen ausführen, sonst normal öffnen
window.addEventListener("click", (e) => {
  const el = e.target.closest?.("#raster > .kachel[data-id]"); if (!el || ANO.an || S.view !== "start") return;
  if (el.classList.contains("kr-hinten")) {
    e.preventDefault(); e.stopImmediatePropagation();
    const a = e.target.closest("[data-kr]"); if (!a) return;
    if (a.dataset.kr === "zu") return krUmdrehen(el, true);
    const akt = krAktionen(el.dataset.id)[Number(a.dataset.kr)]; krUmdrehen(el, true); if (akt) try { akt[2](); } catch (x) { toast("⚠️ " + x.message); }
    return;
  }
  if (!krAn() || !krAktionen(el.dataset.id).length || e.detail === 0 || el.dataset.krDurch) return; // Tastatur: sofort öffnen
  e.preventDefault(); e.stopImmediatePropagation();
  const jetzt = Date.now(), id = el.dataset.id;
  if (KR.letzt.id === id && jetzt - KR.letzt.t < 320) { clearTimeout(KR.warte); KR.letzt = { id: null, t: 0 }; return krUmdrehen(el); }
  KR.letzt = { id, t: jetzt }; clearTimeout(KR.warte);
  KR.warte = setTimeout(() => { KR.letzt = { id: null, t: 0 }; el.dataset.krDurch = "1"; try { el.click(); } finally { delete el.dataset.krDurch; } }, 260);
}, true);

// ================= ✥ Anordnen: verschieben, verbergen, ziehen =================
export const ANO = { an: false, frisch: null, nurAus: false };
document.addEventListener("bk-ansicht", () => { if (S.view !== "start") { ANO.an = false; ANO.nurAus = false; ANO.frisch = null; } });
const SCHLUESSEL = () => (einst().einfach ? "einfach" : S.register);
export function anordnenHtml(alle) {
  const aus = einst().kachelnAus, einfach = einst().einfach, n = alle.length;
  const b = (k, i, d, z, t) => `<button type="button" title="${t}" aria-label="${t}" ${i + d < 0 || i + d >= n ? "disabled" : ""} data-a="kaSchieben" data-x="${esc(k.id)}|${d}">${z}</button>`;
  return alle.map((k, i) => { const weg = !einfach && aus.includes(k.id);
    return `<div class="kachel bearb${weg ? " aus" : ""}${k.id === ANO.frisch ? " frisch" : ""}" data-id="${esc(k.id)}">${weg || einfach ? "" : `<button type="button" class="kweg" title="Ausblenden" aria-label="${esc(typeof k.t === "function" ? k.t() : k.t)} ausblenden" data-a="kaAus" data-x="${esc(k.id)}">✕</button>`}
      <div class="sym">${k.sym}</div><b>${esc(typeof k.t === "function" ? k.t() : k.t)}</b><small>${weg ? "🙈 ausgeblendet" : esc(typeof k.u === "function" ? k.u() : k.u || "")}</small>
      <div class="kstrg">${weg ? `<button type="button" class="ein" data-a="kaEin" data-x="${esc(k.id)}">👁️ Einblenden</button>`
        : einfach ? b(k, i, -1, "▲", "nach oben") + b(k, i, 1, "▼", "nach unten") : b(k, i, -1, "◀", "nach links") + b(k, i, -spalten(), "▲", "nach oben") + b(k, i, spalten(), "▼", "nach unten") + b(k, i, 1, "▶", "nach rechts")}</div></div>`; }).join("");
}
export const anordnenLeiste = () => `<div class="ka-leiste" role="status"><span>✥ <b>Anordnen:</b> Kachel festhalten und ziehen – oder die Pfeile.${einst().einfach ? "" : " ✕ blendet aus."}</span><span class="ka-knoepfe"><button type="button" class="knopf klein" data-a="kaStandard">↺ Standard</button><button type="button" class="knopf klein haupt" data-a="kaFertig">✅ Fertig</button></span></div>`;
function spalten() { const r = document.getElementById("raster"); return r ? getComputedStyle(r).gridTemplateColumns.split(" ").filter(Boolean).length : 2; }
function reihenfolgeSetzen(ids) { einstSetzen("reihenfolge", { ...einst().reihenfolge, [SCHLUESSEL()]: ids }); }
const aktuelleIds = () => [...document.querySelectorAll("#raster > .kachel[data-id]")].map((k) => k.dataset.id);
AKTIONEN.kaAnordnen = () => { ANO.an = true; ANO.nurAus = false; if (S.view !== "start") zeige("start"); else SV.neuZeichnen(); toast("✥ Kacheln festhalten und ziehen – oder die Pfeile benutzen"); };
AKTIONEN.kaFertig = () => { ANO.an = false; ANO.frisch = null; SV.neuZeichnen(); toast("💾 Gespeichert"); };
AKTIONEN.kaSchieben = (x) => { const [id, d] = x.split("|"), ids = aktuelleIds(), i = ids.indexOf(id), j = i + Number(d); if (i < 0 || j < 0 || j >= ids.length) return; ids.splice(i, 1); ids.splice(j, 0, id); ANO.frisch = id; reihenfolgeSetzen(ids); SV.neuZeichnen(); };
AKTIONEN.kaAus = (id) => { einstSetzen("kachelnAus", [...new Set([...einst().kachelnAus, id])]); ANO.frisch = id; SV.neuZeichnen(); };
AKTIONEN.kaEin = (id) => { einstSetzen("kachelnAus", einst().kachelnAus.filter((x) => x !== id)); ANO.frisch = id; SV.neuZeichnen(); };
AKTIONEN.kaStandard = async () => {
  if (!(await frage(einst().einfach ? "Kacheln wieder in der ursprünglichen Reihenfolge?" : "Kacheln dieses Registers wieder in der ursprünglichen Reihenfolge – und alle einblenden?"))) return;
  const { [SCHLUESSEL()]: _, ...rest } = einst().reihenfolge; einstSetzen("reihenfolge", rest);
  if (!einst().einfach) { const ids = (SV.kachelnAlle?.(S.register) || []).map((k) => k.id); einstSetzen("kachelnAus", einst().kachelnAus.filter((x) => !ids.includes(x))); }
  SV.neuZeichnen();
};
AKTIONEN.kaNurAus = (x) => { ANO.nurAus = x === "1"; SV.neuZeichnen(); };
// Lange drücken (0,6 s; im Anordnen-Modus 0,3 s) → Kachel hängt am Finger; Fingerbewegung vorher = normales Scrollen
const Z = { t: null, x0: 0, y0: 0, el: null, ziehen: null, bis: 0, rand: 0 }; // bis: Klicks bis dahin schlucken (nach Halten/Ziehen)
function zAbbrechen() { clearTimeout(Z.t); Z.t = null; Z.el?.classList.remove("gedrueckt"); Z.el = null; }
document.addEventListener("pointerdown", (e) => {
  if (S.view !== "start" || Z.ziehen || e.button > 0) return;
  const k = e.target.closest?.("#raster > .kachel[data-id]"); if (!k || k.classList.contains("kr-hinten") || k.classList.contains("aus")) return;
  if (ANO.an && e.target.closest("button")) return;
  Z.el = k; Z.x0 = e.clientX; Z.y0 = e.clientY; k.classList.add("gedrueckt");
  Z.t = setTimeout(() => {
    const id = Z.el?.dataset.id, alt = Z.el?.getBoundingClientRect().top; zAbbrechen(); Z.bis = Infinity; try { navigator.vibrate?.(30); } catch {}
    if (!ANO.an) { // Anordnen blendet oben die Leiste ein → Seite so nachrücken, dass die Kachel unter dem Finger bleibt
      ANO.an = true; SV.neuZeichnen();
      const neu = document.querySelector(`#raster > .kachel[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect().top;
      if (alt != null && neu != null) scrollBy(0, neu - alt);
    }
    ziehenStart(id, Z.x0, Z.y0);
  }, ANO.an ? 300 : 600);
});
document.addEventListener("pointermove", (e) => {
  if (Z.t && Math.hypot(e.clientX - Z.x0, e.clientY - Z.y0) > 12) zAbbrechen();
  if (Z.ziehen) ziehenBewegen(e.clientX, e.clientY);
});
["pointerup", "pointercancel"].forEach((n) => document.addEventListener(n, () => { if (Z.t) zAbbrechen(); if (Z.ziehen) ziehenEnde(); if (Z.bis === Infinity) Z.bis = Date.now() + 350; }));
window.addEventListener("click", (e) => { if (Date.now() < Z.bis) { e.stopImmediatePropagation(); e.preventDefault(); Z.bis = 0; } }, true);
document.addEventListener("touchmove", (e) => { if ((Z.ziehen || RZ.el) && e.cancelable) e.preventDefault(); }, { passive: false });
function ziehenStart(id, x, y) {
  const el = document.querySelector(`#raster > .kachel[data-id="${CSS.escape(id)}"]`); if (!el || el.classList.contains("aus")) return;
  const r = el.getBoundingClientRect(), geist = el.cloneNode(true);
  geist.classList.add("geist"); geist.classList.remove("frisch");
  geist.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:60;pointer-events:none;margin:0`;
  geist.insertAdjacentHTML("beforeend", '<div class="kpfeil4" aria-hidden="true"><b>✥</b></div>');
  document.body.appendChild(geist); el.classList.add("platzhalter");
  Z.ziehen = { id, el, geist, dx: Math.min(r.width - 10, Math.max(10, x - r.left)), dy: Math.min(r.height - 10, Math.max(10, y - r.top)), x, y };
  ziehenBewegen(x, y);
  clearInterval(Z.rand); Z.rand = setInterval(() => { if (!Z.ziehen) return clearInterval(Z.rand); const d = Z.ziehen.y < 90 ? -12 : Z.ziehen.y > innerHeight - 140 ? 12 : 0; if (d) { scrollBy(0, d); ziehenBewegen(Z.ziehen.x, Z.ziehen.y); } }, 30);
}
function ziehenBewegen(x, y) {
  const z = Z.ziehen; z.x = x; z.y = y; z.geist.style.left = x - z.dx + "px"; z.geist.style.top = y - z.dy + "px";
  const ra = document.getElementById("raster"); if (!ra) return;
  const ziel = [...ra.children].find((k) => { if (k === z.el || !k.dataset.id) return false; const r = k.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
  if (ziel) { const kids = [...ra.children]; ra.insertBefore(z.el, kids.indexOf(z.el) > kids.indexOf(ziel) ? ziel : ziel.nextSibling); }
}
function ziehenEnde() {
  const z = Z.ziehen; Z.ziehen = null; clearInterval(Z.rand); if (!z) return;
  z.geist.remove(); z.el.classList.remove("platzhalter");
  ANO.frisch = z.id; reihenfolgeSetzen(aktuelleIds()); SV.neuZeichnen();
}
// Register festhalten (0,45 s) → nach links/rechts schieben → loslassen = neue Reihenfolge
const RZ = { t: null, el: null, gezogen: false };
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest?.("#register button[data-r]"); if (!b || S.view !== "start") return;
  const x0 = e.clientX, y0 = e.clientY;
  RZ.t = setTimeout(() => { RZ.t = null; RZ.el = b; RZ.gezogen = true; b.classList.add("zieht"); try { navigator.vibrate?.(25); } catch {} toast("↔️ Register nach links oder rechts ziehen, dann loslassen"); }, 450);
  RZ.start = [x0, y0];
});
document.addEventListener("pointermove", (e) => {
  if (RZ.t && Math.hypot(e.clientX - RZ.start[0], e.clientY - RZ.start[1]) > 10) { clearTimeout(RZ.t); RZ.t = null; }
  if (!RZ.el) return;
  const reg = document.getElementById("register"), ziel = [...reg.children].find((k) => { if (k === RZ.el) return false; const r = k.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; });
  if (ziel) { const kids = [...reg.children]; reg.insertBefore(RZ.el, kids.indexOf(RZ.el) > kids.indexOf(ziel) ? ziel : ziel.nextSibling); }
});
["pointerup", "pointercancel"].forEach((n) => document.addEventListener(n, () => {
  clearTimeout(RZ.t); RZ.t = null; if (!RZ.el) return;
  RZ.el.classList.remove("zieht"); RZ.el = null;
  const neu = [...document.querySelectorAll("#register button[data-r]")].map((b) => b.dataset.r);
  einstSetzen("registerReihe", neu); toast("💾 Reihenfolge der Register gespeichert"); SV.neuZeichnen();
  setTimeout(() => { RZ.gezogen = false; }, 200);
}));
document.addEventListener("click", (e) => { if (RZ.gezogen && e.target.closest?.("#register")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

// ================= ⭐ zuletzt gewählt · 🔢 Zahlen zählen hoch · 💡 Nutzung zählen =================
const ZULETZT = "bk_kachel_zuletzt";
document.addEventListener("click", (e) => {
  const k = e.target.closest?.("#raster > .kachel[data-id]"); if (!k || ANO.an || k.classList.contains("kr-hinten") || S.view !== "start") return;
  lokal.schreiben(ZULETZT, k.dataset.id); nuKachel(k.dataset.id);
}, true);
export function nachDemZeichnen() {
  const id = lokal.lesen(ZULETZT, "");
  if (id) document.querySelector(`#raster > .kachel[data-id="${CSS.escape(id)}"]`)?.classList.add("zuletzt");
  const alt = lokal.lesen("bk_kachel_zahlen", {}), neu = {};
  for (const z of document.querySelectorAll("#raster > .kachel[data-id] > .zahl")) {
    const kid = z.parentElement.dataset.id, ziel = Number(z.textContent) || 0; neu[kid] = ziel;
    const von = Number(alt[kid]) || 0;
    if (!ruhig() && ziel > von && ziel <= 99) { const t0 = performance.now(), d = 700; const schritt = (t) => { const f = Math.min(1, (t - t0) / d); z.textContent = Math.round(von + (ziel - von) * f); if (f < 1 && z.isConnected) requestAnimationFrame(schritt); }; requestAnimationFrame(schritt); z.classList.add("hoch"); }
  }
  lokal.schreiben("bk_kachel_zahlen", { ...alt, ...neu });
}

// ================= 📰 Info-Laufband =================
const IL_AUS = "bk_il_aus", IL = { liste: [], i: 0, uhr: 0, halt: 0, x0: null };
const ilAusgeblendet = () => { const a = lokal.lesen(IL_AUS, null); return a && a.tag === heute() ? a.ids : []; };
const TIPPS = [
  ["🔄", "Doppelt auf eine Kachel tippen", "Sie dreht sich um – hinten warten Schnellaktionen."], ["✥", "Lange auf eine Kachel drücken", "Dann kannst du sie verschieben oder ausblenden."],
  ["🎻", "Die Übe-Bühne", "Mitspielen mit dem Orchester, Griffe, Rhythmus und Stimmgerät."], ["📆", "Termine im Handy-Kalender", "Unter Technik › Kalender – automatisch aktuell."],
  ["🏖️", "Länger weg?", "Meins › Abwesenheit sagt alle Termine im Zeitraum auf einmal ab."], ["📄", "Das Eselsohr am Kopf", "Doppelt tippen – dahinter wartet die Bühne mit dem Orchester."],
  ["⚡", "Schnellstart", "Im Info-Feld oben: die wichtigsten Dinge mit einem Tipp."], ["🌗", "Hell oder dunkel", "Oben in der Statusleiste umschalten."],
];
function ilMeldungen() {
  const L = [], add = (m) => L.push(m), pers = leute(), in3 = tagIso(new Date(Date.now() + 3 * 86400000));
  // 🔴 bitte erledigen
  const naechste = pers.flatMap((p) => termineFuer(db, p).filter((t) => t.status !== "abgesagt").slice(0, 3).map((t) => ({ t, p }))).sort((a, b) => a.t.beginn.localeCompare(b.t.beginn));
  const offen = naechste.find(({ t, p }) => !antwortVon(db, t.id, p) && new Date(t.beginn) - Date.now() < 21 * 86400000 && t.teilnahme !== "info");
  if (offen) add({ id: "antwort:" + offen.t.id + offen.p, stufe: "rot", sym: "📅", t: `Jetzt für „${offen.t.titel}“ zu- oder absagen${istEltern() ? ` (${vorname(offen.p)})` : ""}`, u: `${datum(offen.t.beginn)}, ${uhr(offen.t.beginn)} Uhr`, ziel: ["oeffne", "termin|" + offen.t.id],
    knoepfe: [["✔ Zusagen", "antworten", `${offen.t.id}|${offen.p}|ja`], ["✖", "antworten", `${offen.t.id}|${offen.p}|nein`]] });
  const oa = SV.offeneAntworten?.() || 0;
  if (oa > 1) add({ id: "antworten", stufe: "rot", sym: "❔", t: `${oa} Termine warten auf eine Antwort`, u: "Antippen – zu- oder absagen", ziel: ["kachel", "meinetermine"] });
  const og = SV.offeneGenehmigungen?.() || 0;
  if (og) add({ id: "genehmigung", stufe: "rot", sym: "✍️", t: `${og} Genehmigung${og === 1 ? "" : "en"} warte${og === 1 ? "t" : "n"} auf Ihre Antwort`, u: "Zustimmen oder ablehnen", ziel: ["kachel", "meinegenehmigungen"] });
  for (const p of istSchueler() || istEltern() ? pers : []) for (const a of liste("uebeaufgaben", (x) => aufgabeGiltFuer(db, x, p) && !(x.erledigt || []).includes(p) && x.bis && x.bis <= in3 && x.bis >= heute()).slice(0, 2))
    add({ id: `aufgabe:${a.id}:${p}`, stufe: "rot", sym: "📝", t: `Übeaufgabe bis ${a.bis.split("-").reverse().slice(0, 2).join(".")}.: ${a.titel}`, u: istEltern() ? `für ${vorname(p)}` : "Antippen und üben", ziel: ["ubAufgabeOeffnen", `${a.id}|${p}`] });
  for (const a of istSchueler() ? ausleihenVon(db, S.ich.id).filter((x) => x.bis && x.bis < heute()) : []) add({ id: "rueckgabe:" + a.id, stufe: "rot", sym: "🎻", t: "Leihinstrument: Rückgabe ist überfällig", u: "Bitte mit der Leitung sprechen", ziel: ["kachel", "meininstrument"] });
  if ("Notification" in globalThis && Notification.permission === "default" && !demo()) add({ id: "push", stufe: "rot", sym: "🔔", t: "Benachrichtigungen sind aus", u: "Sonst verpasst du Termine und Nachrichten", ziel: ["kachel", "einstellungen"], knoepfe: [["Einschalten", "pushErlauben", ""]] });
  // 🟠 Leitung
  if (istLehrkraft() || istVorstand()) {
    for (const c of cockpit(db, S.ich.id).filter((x) => x.dring >= 2).slice(0, 3)) add({ id: "cockpit:" + c.text, stufe: "orange", sym: c.sym, t: c.text, u: "Cockpit", ziel: ["oeffne", `${c.ziel.view}|${c.ziel.id || ""}`] });
    const an = liste("anfragen", (a) => ["neu", "pruefung"].includes(a.status || "neu")).length;
    if (an) add({ id: "anfragen", stufe: "orange", sym: "📨", t: `${an} Auftrittsanfrage${an === 1 ? "" : "n"} offen`, u: "Zusagen oder absagen", ziel: ["kachel", "anfragen"] });
    const gaeste = liste("gaeste", (g) => !g.gastgeber_id && hole("projekte", g.projekt_id)?.gastfamilien).length;
    if (gaeste) add({ id: "gaeste", stufe: "orange", sym: "🏠", t: `${gaeste} Gäste haben noch keine Gastfamilie`, u: "Austausch & Gastfamilien", ziel: ["kachel", "austausch"] });
  }
  // 🟡 Hinweise
  const un = SV.ungelesen?.() || 0;
  if (un) add({ id: "nachrichten", stufe: "gold", sym: "💬", t: `${un} ungelesene Nachricht${un === 1 ? "" : "en"}`, u: "Antippen zum Lesen", ziel: ["kachel", "nachrichten"] });
  const beantw = naechste.find(({ t, p }) => antwortVon(db, t.id, p));
  if (beantw) { const tage = Math.round((new Date(beantw.t.beginn).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (tage >= 1 && tage <= 14) add({ id: "countdown:" + beantw.t.id, stufe: "gold", sym: "⏳", t: tage === 1 ? `Morgen: ${beantw.t.titel}` : `Noch ${tage} Tage bis ${beantw.t.titel}`, u: `${datum(beantw.t.beginn)}, ${uhr(beantw.t.beginn)} Uhr`, ziel: ["oeffne", "termin|" + beantw.t.id] }); }
  const pw = SV.pwOffen?.() || 0;
  if (pw) add({ id: "pinnwand", stufe: "gold", sym: "📌", t: `${pw} neue${pw === 1 ? "r" : ""} Zettel an der Pinnwand`, u: "Antippen zum Lesen", ziel: ["kachel", "pinnwand"] });
  // ⚪ schöne Infos
  const md = heute().slice(5);
  for (const p of liste("personen", (x) => x.geburtsdatum && x.geburtsdatum.slice(5) === md && x.status !== "ausgetreten" && x.id !== S.ich.id).slice(0, 3))
    add({ id: "geb:" + p.id, stufe: "weiss", sym: "🎂", t: `${p.vorname} hat heute Geburtstag`, u: "Gratuliere mit einer Nachricht", ziel: ["kachel", "nachrichten"] });
  const on = SV.onlineZahl?.() || 0;
  if (on > 0) add({ id: "online", stufe: "weiss", sym: "🟢", t: on === 1 ? "1 Person ist gerade online" : `${on} sind gerade online`, u: "Antippen – anklopfen oder schreiben", ziel: ["onlineListe", ""] });
  for (const c of liste("chronik", (x) => x.datum && x.datum.slice(5) === md && x.jahr < new Date().getFullYear())) add({ id: "chronik:" + c.id, stufe: "weiss", sym: "📜", t: `Heute vor ${new Date().getFullYear() - c.jahr} Jahren: ${c.titel}`, u: "Aus der Chronik", ziel: ["kachel", "chronik"] });
  const aus = new Set(ilAusgeblendet()), sichtbar = L.filter((m) => !aus.has(m.id)), rang = { rot: 0, orange: 1, gold: 2, weiss: 3 };
  sichtbar.sort((a, b) => rang[a.stufe] - rang[b.stufe]);
  if (!sichtbar.some((m) => m.stufe === "rot" || m.stufe === "orange")) sichtbar.unshift({ id: "_ok", stufe: "weiss", sym: "👍", t: "Alles erledigt", u: "Für dich steht gerade nichts an", ohneAus: true });
  const d = new Date(), tp = TIPPS[(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % TIPPS.length];
  sichtbar.push({ id: "_tipp", stufe: "weiss", sym: "💡", t: `Tipp: ${tp[1]}`, u: tp[2], ohneAus: true });
  return sichtbar;
}
function ilEintrag(m) {
  if (!m) return "";
  const ziel = m.ziel ? `data-a="ilAuf" data-x="${esc(m.ziel[0])}§${esc(m.ziel[1])}"` : "";
  return `<div class="il-eintrag il-${m.stufe}"><span class="il-sym" aria-hidden="true">${m.sym}</span><button type="button" class="il-text" ${ziel || "disabled"}><b>${esc(m.t)}</b><small>${esc(m.u || "")}</small></button>
    ${m.ohneAus ? "<span></span>" : `<button type="button" class="il-weg" data-a="ilWeg" data-x="${esc(m.id)}" aria-label="Für heute ausblenden" title="Für heute ausblenden">✕</button>`}
    ${m.knoepfe ? `<span class="il-knoepfe">${m.knoepfe.map(([t, a, x]) => `<button type="button" class="il-knopf" data-a="${a}" data-x="${esc(x)}">${esc(t)}</button>`).join("")}</span>` : ""}</div>`;
}
export function laufbandHtml() {
  if (einst().laufband === false) return "";
  IL.liste = ilMeldungen(); IL.i = Math.min(IL.i, IL.liste.length - 1);
  return `<div class="il" id="ilBand" aria-live="polite"><div class="il-inhalt" id="ilInhalt">${ilEintrag(IL.liste[IL.i])}</div>
    <div class="il-punkte">${IL.liste.map((m, i) => `<i class="il-p il-p-${m.stufe}${i === IL.i ? " an" : ""}"></i>`).join("")}</div></div>`;
}
function ilWeiter(d = 1) {
  const band = document.getElementById("ilBand"); if (!band || !IL.liste.length) return;
  IL.i = (IL.i + d + IL.liste.length) % IL.liste.length;
  const inh = document.getElementById("ilInhalt");
  const tauschen = () => { inh.innerHTML = ilEintrag(IL.liste[IL.i]); band.querySelectorAll(".il-p").forEach((p, i) => p.classList.toggle("an", i === IL.i)); inh.classList.remove("il-weg-anim"); };
  if (ruhig()) return tauschen();
  inh.classList.add("il-weg-anim"); setTimeout(tauschen, 220);
}
export function laufbandStarten() {
  const band = document.getElementById("ilBand"); if (!band) return clearInterval(IL.uhr);
  if (band.dataset.an) return; // schon verbunden (gleicher Inhalt im Kopf)
  band.dataset.an = "1"; clearInterval(IL.uhr);
  IL.uhr = setInterval(() => {
    if (!document.getElementById("ilBand")) return clearInterval(IL.uhr);
    if (document.hidden || Date.now() < IL.halt) return;
    ilWeiter(1);
  }, 6000);
  band.addEventListener("pointerdown", (e) => { IL.halt = Date.now() + 10000; IL.x0 = e.clientX; });
  band.addEventListener("pointerup", (e) => { if (IL.x0 != null && Math.abs(e.clientX - IL.x0) > 50) { ilWeiter(e.clientX < IL.x0 ? 1 : -1); IL.schluck = true; } IL.x0 = null; });
  band.addEventListener("click", (e) => { if (IL.schluck) { IL.schluck = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
AKTIONEN.ilAuf = (x) => { const [a, y] = String(x).split("§"); AKTIONEN[a]?.(y); };
AKTIONEN.ilWeg = (id) => { const a = ilAusgeblendet(); lokal.schreiben(IL_AUS, { tag: heute(), ids: [...new Set([...a, id])] }); toast("Für heute ausgeblendet"); const b = document.getElementById("ilBand"); if (b) b.outerHTML = laufbandHtml(); laufbandStarten(); };

// ================= 🔢 Fallblatt-Countdown =================
export function countdownHtml(text, tage) {
  if (einst().countdown !== "fallblatt" || !(tage >= 2)) return esc(text);
  const z = String(Math.min(999, tage)).padStart(2, "0"), alt = lokal.lesen("bk_fb_alt", ""), neu = alt && alt !== z;
  lokal.schreiben("bk_fb_alt", z);
  return `<span class="fb-reihe" aria-label="in ${tage} Tagen">${[...z].map((c, i) => `<span class="fb-z${neu && !ruhig() && alt[i] !== c ? " kippt" : ""}" style="--v:${i * 70}ms"><span>${c}</span></span>`).join("")}</span><small class="fb-einheit">Tage</small>`;
}

// ================= ⚡ Schnellstart =================
const SCHNELL = [
  { id: "schreiben", sym: "✉️", t: "Schreiben", los: AK("chatNeu") },
  { id: "termine", sym: "📅", t: "Termine", los: ZS("termine", null, { filter: "meine" }) },
  { id: "zettel", sym: "📌", t: "Zettel", los: ZS("pinnwand", AK("pwNeu")) },
  { id: "uebebuehne", sym: "🎻", t: "Übe-Bühne", los: ZS("buehne", null, { modus: "ueben" }) },
  { id: "stoppuhr", sym: "⏱", t: "Übe-Uhr", los: ZS("ueben", AK("uebenUhr", "start")), nur: () => istSchueler() || istEltern() },
  { id: "stimmen", sym: "🎯", t: "Stimmen", los: UB("stimmen") },
  { id: "online", sym: "🟢", t: "Online", los: AK("onlineListe") },
  { id: "sos", sym: "🆘", t: "SOS", los: ZS("sos") },
  { id: "noten", sym: "🎼", t: "Noten", los: ZS("meinenoten"), nur: () => istSchueler() || istEltern() },
  { id: "kalender", sym: "📆", t: "Kalender", los: ZS("kalender") },
  { id: "mitfahrt", sym: "🚗", t: "Mitfahrt", los: ZS("mitfahrboerse"), nur: () => istEltern() || istLehrkraft() },
  { id: "abwesend", sym: "🏖️", t: "Abwesend", los: ZS("abwesenheit"), nur: () => istSchueler() || istEltern() },
  { id: "gesicht", sym: "🙂", t: "Gesicht", los: AK("meinGesicht") },
  { id: "orchester", sym: "👥", t: "Orchester", los: ZS("orchester"), nur: () => !istEltern() },
  { id: "rundschreiben", sym: "📣", t: "Rundschreiben", los: ZS("rundschreiben"), nur: () => istVerwalter() },
  { id: "cockpit", sym: "🧭", t: "Cockpit", los: ZS("cockpit"), nur: () => istLehrkraft() || istVorstand() },
  { id: "chronik", sym: "📜", t: "Chronik", los: ZS("chronik") },
];
const SCHNELL_STANDARD = ["schreiben", "termine", "zettel", "uebebuehne", "online", "sos", "kalender", "gesicht"];
const schnellMoeglich = () => SCHNELL.filter((x) => !x.nur || x.nur());
const schnellAuswahl = () => { const ids = einst().schnellIds || SCHNELL_STANDARD, da = schnellMoeglich(); const l = ids.map((id) => da.find((x) => x.id === id)).filter(Boolean); for (const x of da) if (l.length < 8 && !l.includes(x) && !einst().schnellIds) l.push(x); return l.slice(0, 8); };
export const schnellstartAn = () => !einst().einfach && einst().schnellstart !== false;
export function schnellstartHtml() {
  return `<div class="schnell-kopf"><h2>⚡ Schnellstart</h2><button type="button" class="schnell-wahl-knopf" data-a="schnellWahl" aria-label="Symbole auswählen" title="Symbole auswählen">✏️</button></div>
    <div class="schnell-raster">${schnellAuswahl().map((x) => `<button type="button" class="mini" data-a="schnellLos" data-x="${x.id}"><b>${x.sym}</b><span>${esc(x.t)}</span></button>`).join("")}</div>`;
}
AKTIONEN.schnellLos = (id) => { const x = SCHNELL.find((y) => y.id === id); try { x?.los(); } catch (e) { toast("⚠️ " + e.message); } };
function schnellWahlHtml() {
  const ids = einst().schnellIds || schnellAuswahl().map((x) => x.id);
  return `<p class="hinweis">Bis zu 8 Symbole – die Zahl zeigt die Reihenfolge.</p><div class="schnell-wahl">${schnellMoeglich().map((x) => { const i = ids.indexOf(x.id);
    return `<button type="button" class="${i >= 0 ? "an" : ""}" data-a="schnellUmschalten" data-x="${x.id}" aria-pressed="${i >= 0}">${i >= 0 ? `<i>${i + 1}</i>` : ""}<span>${x.sym}</span>${esc(x.t)}</button>`; }).join("")}</div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="schnellStandard">↺ Standard</button></div>`;
}
AKTIONEN.schnellWahl = () => blatt("⚡ Schnellstart – Symbole", `<div id="schnellWahl">${schnellWahlHtml()}</div>`);
AKTIONEN.schnellUmschalten = (id) => {
  const ids = [...(einst().schnellIds || schnellAuswahl().map((x) => x.id))], i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1); else if (ids.length >= 8) return toast("Höchstens 8 Symbole – erst eines abwählen"); else ids.push(id);
  einstSetzen("schnellIds", ids); const w = document.getElementById("schnellWahl"); if (w) w.innerHTML = schnellWahlHtml(); SV.kopfNeu?.();
};
AKTIONEN.schnellStandard = () => { einstSetzen("schnellIds", null); const w = document.getElementById("schnellWahl"); if (w) w.innerHTML = schnellWahlHtml(); SV.kopfNeu?.(); };

// ================= 💡 Vorschläge zur Startseite (nur Vorschlag – die App baut nie selbst um) =================
const NU = "bk_nutzung", NU_NIE = ["sos", "termine", "meinetermine", "nachrichten"];
const nuLeer = () => ({ seit: heute(), k: {}, tage: [], nein: [], zuletzt: "", erwNein: false, erwSpaeter: "" });
const nuStand = () => ({ ...nuLeer(), ...lokal.lesen(NU, {}) });
const tageZw = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function nuKachel(id) { const st = nuStand(); if (!st.tage.includes(heute())) st.tage = [...st.tage, heute()].slice(-90); st.k[id] = { n: (st.k[id]?.n || 0) + 1, z: heute() }; lokal.schreiben(NU, st); }
export function nuTagZaehlen() { const st = nuStand(); if (!st.tage.includes(heute())) { st.tage = [...st.tage, heute()].slice(-90); lokal.schreiben(NU, st); } }
export function vorschlagPruefen() {
  const st = nuStand(), h = heute();
  if (einst().vorschlaege === false || tageZw(st.seit, h) < 21 || st.tage.length < 8 || (st.zuletzt && tageZw(st.zuletzt, h) < 7)) return;
  if (S.view !== "start" || document.getElementById("blattHg") || ANO.an) return;
  if (einst().einfach) {
    const ids = Object.keys(st.k);
    if (st.erwNein || (st.erwSpaeter && h < st.erwSpaeter) || ids.length < 4 || ids.reduce((s, id) => s + st.k[id].n, 0) < 20) return;
    st.zuletzt = h; lokal.schreiben(NU, st);
    return leise(blatt("💡 Weitere Funktionen?", `<p>Du kommst mit der App schon richtig gut zurecht! Möchtest du die <b>erweiterte Ansicht</b> ausprobieren? Dann hast du Register, mehr Kacheln, Schnellstart und mehr.</p>
      <div class="knopfreihe"><button class="knopf haupt" data-a="nuErweitert" data-x="ja">🔧 Ja, zeigen</button><button class="knopf" data-a="nuErweitert" data-x="spaeter">Später</button><button class="knopf" data-a="nuErweitert" data-x="nein">Nein, danke</button></div>`));
  }
  const k = (SV.kachelnFuer?.(S.register) || []).filter((x) => !NU_NIE.includes(x.id) && !st.nein.includes(x.id) && !(x.zahl && x.zahl()))
    .map((x) => ({ x, z: st.k[x.id]?.z || st.seit })).filter((v) => tageZw(v.z, h) >= 28).sort((a, b) => a.z.localeCompare(b.z))[0]?.x;
  if (!k) return;
  st.zuletzt = h; lokal.schreiben(NU, st);
  leise(blatt("💡 Vorschlag zur Startseite", `<p>Die Kachel <b>${k.sym} ${esc(typeof k.t === "function" ? k.t() : k.t)}</b> hast du seit 4 Wochen nicht benutzt. Soll sie verborgen werden? Du findest sie jederzeit unter „🙈 ausgeblendete anzeigen“.</p>
    <div class="knopfreihe"><button class="knopf haupt" data-a="nuVerbergen" data-x="${esc(k.id)}">🙈 Verbergen</button><button class="knopf" data-a="nuBehalten" data-x="${esc(k.id)}">Behalten</button></div>
    <p class="hinweis">Gezählt wird nur auf diesem Gerät. Abschalten: ⚙️ › Startseite & Ansicht.</p>`));
}
AKTIONEN.nuVerbergen = (id) => { einstSetzen("kachelnAus", [...new Set([...einst().kachelnAus, id])]); blattZu(); SV.neuZeichnen(); toast("🙈 Verborgen"); };
AKTIONEN.nuBehalten = (id) => { const st = nuStand(); st.nein = [...new Set([...st.nein, id])]; lokal.schreiben(NU, st); blattZu(); };
AKTIONEN.nuErweitert = (x) => { const st = nuStand(); if (x === "nein") st.erwNein = true; if (x === "spaeter") st.erwSpaeter = tagIso(new Date(Date.now() + 14 * 86400000)); lokal.schreiben(NU, st); blattZu(); if (x === "ja") AKTIONEN.ansichtSetzen("erweitert"); };
AKTIONEN.nuVergessen = () => { lokal.schreiben(NU, nuLeer()); toast("🧹 Gemerkte Nutzung gelöscht"); };

// ================= 🟢 Ansicht wählen (erste Frage) =================
export function ansichtFrage() {
  if (einst().ansichtGewaehlt || demo() || document.getElementById("blattHg")) return false;
  leise(blatt(`Hallo ${S.ich?.vorname || ""}! 👋`, `<p>Schön, dass du dabei bist. <b>Wie möchtest du starten?</b></p>
    <div class="ansicht-wahl"><button type="button" class="knopf haupt" data-a="ansichtSetzen" data-x="einfach"><b>🟢 Einfach</b><small>Wenige große Kacheln – nur das Wichtigste</small></button>
    <button type="button" class="knopf" data-a="ansichtSetzen" data-x="erweitert"><b>🔧 Erweitert</b><small>Alle Bereiche, Register, Schnellstart</small></button></div>
    <p class="hinweis">Umschalten geht jederzeit – ganz unten auf der Startseite.</p>`));
  return true;
}
AKTIONEN.ansichtSetzen = (art) => {
  einstSetzen("ansichtGewaehlt", true); einstSetzen("einfach", art === "einfach"); blattZu(); ANO.an = false;
  zeige("start", {}, { ersetzen: true });
  toast(art === "einfach" ? "🟢 Einfache Ansicht – „🔧 Erweiterte Ansicht“ findest du unten auf der Startseite" : "🔧 Erweiterte Ansicht – „🟢 Einfache Ansicht“ findest du unten auf der Startseite", 4500);
};

// ================= 📋 Tagesübersicht (Leitung, Lehrkräfte, Vorstand) =================
const tageszeit = () => { const h = new Date().getHours(); return h < 11 ? "Guten Morgen" : h < 17 ? "Guten Tag" : "Guten Abend"; };
export function tagesinfoBeimStart() {
  if (!(istLehrkraft() || istVorstand()) || einst().tagesinfo === false || demo() || document.getElementById("blattHg")) return;
  if (lokal.lesen("bk_tagesinfo_tag", "") === heute()) return;
  lokal.schreiben("bk_tagesinfo_tag", heute()); AKTIONEN.tagesinfo();
}
AKTIONEN.tagesinfo = () => {
  const z = (sym, text, a, x) => `<button type="button" class="ti-zeile" data-a="tiAuf" data-x="${esc(a)}§${esc(x)}">${sym} <span>${text}</span><b>›</b></button>`;
  const zeilen = [], un = SV.ungelesen?.() || 0;
  if (un) zeilen.push(z("💬", `<b>${un}</b> ungelesene Nachricht${un === 1 ? "" : "en"}`, "kachel", "nachrichten"));
  for (const c of cockpit(db, S.ich.id).slice(0, 6)) zeilen.push(z(c.sym, esc(c.text), "oeffne", `${c.ziel.view}|${c.ziel.id || ""}`));
  const an = liste("anfragen", (a) => ["neu", "pruefung"].includes(a.status || "neu")).length;
  if (an) zeilen.push(z("📨", `<b>${an}</b> offene Auftrittsanfrage${an === 1 ? "" : "n"}`, "kachel", "anfragen"));
  const gestern = tagIso(new Date(Date.now() - 86400000)), geuebt = new Set(liste("uebe_ergebnisse", (e) => e.datum >= gestern && e.modus).map((e) => e.person_id)).size;
  if (geuebt && lehrt()) zeilen.push(z("🎻", `<b>${geuebt}</b> Kind${geuebt === 1 ? " hat" : "er haben"} seit gestern auf der Übe-Bühne geübt`, "ubFortschritt", ""));
  const md = heute().slice(5), geb = liste("personen", (p) => p.geburtsdatum?.slice(5) === md && p.status !== "ausgetreten");
  if (geb.length) zeilen.push(z("🎂", `Geburtstag: ${geb.map((p) => esc(name(p))).join(", ")}`, "kachel", "nachrichten"));
  const jetzt = new Date();
  leise(blatt(`${tageszeit()}, ${S.ich.vorname}`, `<p>Heute ist <b>${esc(datum(jetzt))}</b>, es ist <b>${uhr(jetzt)} Uhr</b>.</p>
    <div class="ti">${zeilen.join("") || '<p class="hinweis">👍 Heute steht nichts Dringendes an.</p>'}</div>
    <div class="ansicht-wahl"><button type="button" class="knopf haupt" data-a="tiAuf" data-x="kachel§cockpit">🧭 Zum Cockpit</button><button type="button" class="knopf" data-a="blattZu">Zur App</button>
    <button type="button" class="knopf" data-a="tiHeuteAus">🌙 Heute nicht mehr anzeigen</button></div>
    <label class="schalter"><span><small>Auf diesem Gerät nicht mehr beim Start zeigen</small></span><input type="checkbox" data-c="einstSchalterAus" data-x="tagesinfo" ${einst().tagesinfo === false ? "checked" : ""}></label>`));
};
AKTIONEN.tiAuf = (x) => { blattZu(); AKTIONEN.ilAuf(x); };
AKTIONEN.tiHeuteAus = () => { lokal.schreiben("bk_tagesinfo_tag", heute()); blattZu(); toast("🌙 Heute nicht mehr – über „📋 Übersicht“ jederzeit erreichbar"); };
AKTIONEN.einstSchalterAus = (_, el) => einstSetzen(el.dataset.x, !el.checked);
