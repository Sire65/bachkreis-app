// 💬 Nachrichten wie in der KC Club App (KC-CLUB-CHAT und Folgeversionen) – aufgebaut wie WhatsApp:
//  - Chatliste mit Suche, Bild, letzter Nachricht (mit Haken), Uhrzeit und Zähler; „＋ Neue Nachricht“ (Einzelchat oder Runde)
//  - Sprechblasen mit Tages-Trennern, „⬇ Neue Nachrichten“, Uhrzeit und Haken: ✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen (KC-CLUB-HAKEN)
//  - ❗ Wichtig (KC-CLUB-WICHTIG, auf Wunsch vorher fragen), 🏎️ Express (KC-CLUB-EXPRESS: kommt sofort durch, beim Empfänger
//    geht ein Fenster auf, „Empfang bestätigen“, Zustellzeiten je Empfänger), ⏰ später senden – auch wiederholt (KC-CLUB-SPAETER-SENDEN),
//    🔔 Zustellwahl Push · E-Mail · WhatsApp (KC-CLUB-ZUSTELLWAHL), ↩️ Antworten, Reaktionen, ✏️ Bearbeiten, 🗑️ Zurückziehen,
//    ℹ️ Details (wann gesendet, angekommen, gelesen – und was der BK Communicator je Weg gemacht hat), Entwürfe.
// Zustellung über den BK Communicator (Regeln „Neue Nachricht“, „❗ Wichtige Nachricht“, „🏎️ Express-Sendung“).
// Rechte, Express-Grenze, Bearbeiten-Frist und Kinderschutz erzwingt der Server (supabase/functions/_shared/regeln.js).
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, istLeitung, istVerwalter, einst } from "./zustand.js";
import { meineUnterhaltungen, gelesenVonMir, lokalGelesen } from "./start.js";
import { esc, AKTIONEN, toast, uhr, frage, blatt, blattZu, $ } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele, konfig, abonnieren, neueId, istEchtbetrieb, jetztAbgleichen, serverAktion } from "../kern/daten.js";
import { CHAT, nsId, nachrichtFrei, nachrichtAbgelaufen, chatPartnerErlaubt, pwAppPerson } from "../kern/schema.js";
import { empfaengerVon, naechsteSendung, nachrichtEreignis, nachrichtKurz, kinderVon, elternVon, instrumenteVon } from "../kern/logik.js";
import { hochladen, bildVerkleinern, dateiUrl, dateiOeffnen, groesseText, artVonMime } from "../kern/dateien.js";
import { zuhoeren, spracheMoeglich, aufnahme, aufnahmeMoeglich, dauerText, SPRACHE_FEHLER } from "./sprache.js";
import { senden, whatsapp } from "../kern/versand.js";
import { papierflieger } from "./effekte.js";
import { cfAnwenden } from "./darstellung.js";
import { gesicht } from "./gesichter.js";
import { netzSymbolHtml } from "./netzsymbol.js";

const ich = () => S.ich?.id;
const jetztIso = () => new Date().toISOString();
const C = { anlagen: [], ablauf: null, aufnahme: null, diktat: null, offen: {}, antwort: null, wichtig: false, express: false, zustell: { push: false, mail: false, whatsapp: false }, zustellOffen: false, emoji: false, trenner: {}, suche: "", wfZuletzt: {} };
const PRIVAT = ["einzel", "runde"];
const expressMax = () => (Number(konfig().express_max_tag) > 0 ? Number(konfig().express_max_tag) : CHAT.expressMax);
const bearbeitenMin = () => (Number(konfig().bearbeiten_minuten) > 0 ? Number(konfig().bearbeiten_minuten) : CHAT.bearbeitenMin);
const expressUnbegrenzt = () => (S.ich?.rollen || []).some((r) => CHAT.expressUnbegrenzt.includes(r));

// ---------- Entwürfe (KC-CLUB-ENTWURF): je Chat auf diesem Gerät ----------
const ENTWURF_KEY = "bk_entwuerfe";
const entwuerfe = () => { try { return JSON.parse(localStorage.getItem(ENTWURF_KEY) || "{}"); } catch { return {}; } };
const entwurf = (uid) => (einst().entwuerfe !== false ? entwuerfe()[uid] || "" : C.text?.[uid] || "");
function entwurfSetzen(uid, t) {
  (C.text ||= {})[uid] = t;
  if (einst().entwuerfe === false) return;
  const e = entwuerfe(); if (t) e[uid] = t; else delete e[uid];
  try { localStorage.setItem(ENTWURF_KEY, JSON.stringify(e)); } catch {}
}

// ---------- Hilfen ----------
const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const tagNull = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const tageAb = (iso) => Math.round((tagNull(new Date()) - tagNull(iso)) / 86400000);
const zeitListe = (iso) => { if (!iso) return ""; const t = tageAb(iso), d = new Date(iso); return t === 0 ? uhr(iso) : t === 1 ? "gestern" : t < 7 && t > 0 ? WT[d.getDay()] : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`; };
const tagTrenner = (iso) => { const t = tageAb(iso), d = new Date(iso); return t === 0 ? "Heute" : t === 1 ? "Gestern" : `${WT[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""}`; };
const sek = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
const wannGenau = (iso) => (iso ? `${tageAb(iso) === 0 ? "heute" : tageAb(iso) === 1 ? "gestern" : `${WT[new Date(iso).getDay()].slice(0, 2)} ${new Date(iso).getDate()}.${new Date(iso).getMonth() + 1}.`} ${sek(iso)}` : "–");
const umUhr = (iso) => { const t = tageAb(iso); return t === 0 ? `um ${uhr(iso)} Uhr` : `am ${new Date(iso).getDate()}.${new Date(iso).getMonth() + 1}. ${uhr(iso)} Uhr`; };
const vorn = (id) => (id === ich() ? "Du" : vorname(id) || name(id).split(" ")[0] || "jemand");
const textHtml = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
// Farbe je Absender in Gruppen (wie WhatsApp), aus der ID immer gleich
const FARBEN = ["#1e88e5", "#43a047", "#e53935", "#8e24aa", "#fb8c00", "#00897b", "#6d4c41", "#d81b60", "#3949ab", "#7cb342"];
const farbeVon = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return FARBEN[Math.abs(h) % FARBEN.length]; };

export const chatPartnerVon = (u) => (u?.art === "einzel" ? (u.mitglieder || []).find((m) => m !== ich()) : null);
export const chatTitel = (u) => (u?.art === "einzel" ? name(chatPartnerVon(u)) || "Einzelgespräch" : u?.titel || "Chat");
const chatBild = (u, gross = false) => {
  const p = chatPartnerVon(u);
  if (p) return `<span class="chat-bild gesicht-bild${gross ? " gross" : ""}">${gesicht(p, name(p))}</span>`;
  return `<span class="chat-bild${gross ? " gross" : ""} sym">${u?.art === "verteiler" ? "📣" : u?.art === "runde" ? "👫" : "👥"}</span>`;
};
const empfaenger = (u) => empfaengerVon(db, u).filter((p) => p !== ich());
export const chatNachrichten = (uid) => liste("nachrichten", (n) => n.unterhaltung_id === uid && nachrichtFrei(n) && !nachrichtAbgelaufen(n)).sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)));
const geplanteVonMir = (uid) => liste("nachrichten", (n) => n.unterhaltung_id === uid && n.von === ich() && !nachrichtFrei(n)).sort((a, b) => String(a.geplant_um).localeCompare(String(b.geplant_um)));
const statusVon = (n) => liste("nachricht_status", (s) => s.nachricht_id === n.id && s.person_id !== n.von);
const meinStatus = (n) => hole("nachricht_status", nsId(n.id, ich()));

// ---------- Haken (KC-CLUB-HAKEN): ✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen; in Gruppen erst, wenn es für alle gilt ----------
const HAKEN_EINS = '<svg viewBox="0 0 13 11" width="15" height="12" aria-hidden="true"><path d="M1.5 6.2l3.3 3.3L11.5 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HAKEN_ZWEI = '<svg viewBox="0 0 19 11" width="21" height="12" aria-hidden="true"><path d="M1.5 6.2l3.3 3.3L11.5 1.8M8.2 8.6l.9.9L17.5 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function hakenStand(n) {
  const anzahl = Math.max(1, n.anzahl || empfaenger(hole("unterhaltungen", n.unterhaltung_id)).length), st = statusVon(n);
  const gelesen = st.filter((s) => s.gelesen_am).length, an = st.filter((s) => s.zugestellt_am || s.gelesen_am).length;
  return { anzahl, gelesen, an, stufe: anzahl && gelesen >= anzahl ? "gelesen" : anzahl && an >= anzahl ? "angekommen" : "gesendet" };
}
function hakenHtml(n) {
  if (n.zurueckgezogen_am) return "";
  let { anzahl, gelesen, stufe } = hakenStand(n);
  if (stufe === "gelesen" && einst().lesebestaetigung === false) stufe = "angekommen"; // wie WhatsApp: ohne eigene Lesebestätigung keine blauen Haken
  const z = stufe === "gelesen" ? `<span class="haken blau" title="gelesen" aria-label="gelesen">${HAKEN_ZWEI}</span>`
    : stufe === "angekommen" ? `<span class="haken" title="angekommen – noch nicht gelesen" aria-label="angekommen">${HAKEN_ZWEI}</span>`
    : `<span class="haken" title="gesendet – noch nicht angekommen" aria-label="gesendet">${HAKEN_EINS}</span>`;
  const teil = stufe !== "gelesen" && anzahl > 1 && gelesen && einst().lesebestaetigung !== false ? ` <small class="haken-teil" title="schon gelesen">${gelesen}/${anzahl}</small>` : "";
  return z + teil + ((n.kanaele || []).includes("mail") || n.wichtig || n.express ? ' <span class="zustellung" title="auch per E-Mail">✉️</span>' : "");
}

// ---------- Chatliste ----------
function chatEintraege() {
  return meineUnterhaltungen().map((u) => {
    const ns = chatNachrichten(u.id), letzte = ns[ns.length - 1];
    return { u, letzte, neu: ns.filter((n) => !gelesenVonMir(n)).length, plan: geplanteVonMir(u.id).length, expressNeu: ns.some((n) => n.express && n.von !== ich() && !gelesenVonMir(n)) };
  }).sort((a, b) => String(b.letzte?.zeit || "").localeCompare(String(a.letzte?.zeit || "")));
}
VIEWS.nachrichten = {
  render() {
    const q = C.suche.toLowerCase();
    const l = chatEintraege().filter(({ u, letzte }) => !q || chatTitel(u).toLowerCase().includes(q) || String(letzte?.text || "").toLowerCase().includes(q));
    const rechts = `${spracheMoeglich() && einst().sprachsteuerung !== false ? `<button class="knopf klein" data-a="sprachsteuerung" title="Sprachsteuerung" aria-label="Sprachsteuerung">🎤</button>` : ""}<button class="knopf haupt klein" data-a="chatNeu" title="Neue Nachricht" aria-label="Neue Nachricht">＋ Neu</button>${istVerwalter() ? `<button class="knopf klein" data-a="kachel" data-x="rundschreiben" title="Rundschreiben">📣</button>` : ""}`;
    const netz = netzSymbolHtml(); // 📡 statt 💬 vorn, wenn das Verbindungs-Symbol an ist
    return kopf(netz ? "Nachrichten" : "💬 Nachrichten", rechts).replace("<h2>", netz + "<h2>") + `<input class="chat-suche" type="search" id="chatSuche" placeholder="🔍 Chats und Nachrichten durchsuchen" value="${esc(C.suche)}" aria-label="Chats durchsuchen">
      <div class="karte chatliste"><ul class="liste">${l.map(({ u, letzte, neu, plan, expressNeu }) => {
        const vorschau = letzte ? (letzte.zurueckgezogen_am ? "🚫 Nachricht gelöscht" : `${letzte.von === ich() ? "" : u.art === "einzel" ? "" : esc(vorn(letzte.von)) + ": "}${letzte.express ? "🏎️ " : letzte.wichtig ? "❗ " : ""}${esc(nachrichtKurz(letzte).slice(0, 70))}`) : "noch keine Nachricht";
        return `<li class="klick" data-a="oeffne" data-x="unterhaltung|${esc(u.id)}">${chatBild(u)}
          <div class="fl"><div class="zeile-titel">${esc(chatTitel(u))}</div><div class="zeile-unter">${letzte?.von === ich() ? hakenHtml(letzte) + " " : ""}${vorschau}${plan ? ` · <span title="geplant">⏰ ${plan}</span>` : ""}</div></div>
          <div class="chat-rechts"><div class="hinweis${neu ? " neu" : ""}">${letzte ? zeitListe(letzte.zeit) : ""}</div>${neu ? `<span class="chat-zahl${expressNeu ? " express" : ""}">${neu}</span>` : ""}</div></li>`;
      }).join("") || `<li class="leer">${q ? "Nichts gefunden" : "Noch keine Unterhaltungen – tippe auf „＋ Neue Nachricht“."}</li>`}</ul></div>`;
  },
  nach(w) { w.querySelector("#chatSuche")?.addEventListener("input", (e) => { C.suche = e.target.value; const pos = e.target.selectionStart; zeichne(); const f = document.getElementById("chatSuche"); f?.focus(); try { f?.setSelectionRange(pos, pos); } catch {} }); },
};

// ---------- Neue Nachricht: Einzelchat (gibt es schon einen, öffnet er sich) oder Runde mit Betreff ----------
const NEU = { wahl: [], suche: "", titel: "" };
function partnerListe() {
  const me = S.ich, verwandt = new Set([...kinderVon(db, me.id), ...elternVon(db, me.id)]);
  const opt = { schuelerUntereinander: konfig().chat_schueler_untereinander !== false };
  return liste("personen", (p) => pwAppPerson(p) && chatPartnerErlaubt(me, p, { ...opt, verwandt: verwandt.has(p.id) })).sort((a, b) => name(a).localeCompare(name(b), "de"));
}
VIEWS.chatNeu = {
  render() {
    const q = NEU.suche.toLowerCase(), l = partnerListe();
    return kopf("✉️ Neue Nachricht") + `<div class="karte"><div class="feld"><label for="neuSuche">An wen?</label><input id="neuSuche" type="search" placeholder="🔍 Name suchen" value="${esc(NEU.suche)}" autocomplete="off"></div>
      <div class="wahlliste" id="neuListe">${l.map((p) => `<label data-name="${esc(name(p).toLowerCase())}"${q && !name(p).toLowerCase().includes(q) ? " hidden" : ""}><input type="checkbox" data-c="chatNeuWahl" value="${esc(p.id)}" ${NEU.wahl.includes(p.id) ? "checked" : ""}>
        <span class="chat-bild klein gesicht-bild">${gesicht(p.id, name(p))}</span><span style="flex:1">${esc(name(p))}<small class="hinweis"> ${esc(p.typ === "schueler" ? "Schüler/in" : p.typ === "eltern" ? "Eltern" : p.typ === "lehrkraft" ? "Lehrkraft" : p.typ === "leitung" ? "Leitung" : "")}</small></span></label>`).join("") || '<div class="leer">Niemand gefunden</div>'}</div>
      <div class="hinweis" id="neuGewaehlt">${NEU.wahl.length ? "An: " + NEU.wahl.map((id) => esc(name(id))).join(", ") : "Noch niemand ausgewählt"}</div>
      <div id="neuTitelZeile" class="feld"${NEU.wahl.length > 1 ? "" : " hidden"}><label for="neuTitel">Name der Runde (Betreff)</label><input id="neuTitel" maxlength="80" placeholder="z. B. Fahrgemeinschaft Probe" value="${esc(NEU.titel)}"></div>
      <button class="knopf haupt breit" data-a="chatNeuWeiter">💬 Weiter zum Chat</button>
      <p class="hinweis">${S.ich?.typ === "eltern" ? "Privat schreiben Eltern der Leitung, den Lehrkräften und den eigenen Kindern." : S.ich?.typ === "schueler" ? "Privat schreibst du der Leitung, den Lehrkräften, deinen Eltern" + (konfig().chat_schueler_untereinander !== false ? " und anderen Schülerinnen und Schülern." : ".") : "Eine Person = Einzelchat. Mehrere = Runde mit Betreff."}</p></div>`;
  },
  nach(w) {
    w.querySelector("#neuSuche")?.addEventListener("input", (e) => { NEU.suche = e.target.value; const q = NEU.suche.toLowerCase(); w.querySelectorAll("#neuListe label[data-name]").forEach((l) => { l.hidden = !!q && !l.dataset.name.includes(q); }); });
    w.querySelector("#neuTitel")?.addEventListener("input", (e) => { NEU.titel = e.target.value; });
  },
};
AKTIONEN.chatNeu = () => { NEU.wahl = []; NEU.suche = ""; NEU.titel = ""; zeige("chatNeu"); };
AKTIONEN.chatNeuWahl = (id, el) => {
  NEU.wahl = el.checked ? [...new Set([...NEU.wahl, id])] : NEU.wahl.filter((x) => x !== id);
  const g = document.getElementById("neuGewaehlt"); if (g) g.textContent = NEU.wahl.length ? "An: " + NEU.wahl.map((x) => name(x)).join(", ") : "Noch niemand ausgewählt";
  document.getElementById("neuTitelZeile")?.toggleAttribute("hidden", NEU.wahl.length < 2);
};
export async function einzelchatMit(pid) {
  const da = liste("unterhaltungen", (u) => u.art === "einzel" && (u.mitglieder || []).length === 2 && u.mitglieder.includes(pid) && u.mitglieder.includes(ich()))[0];
  if (da) return da;
  return speichere("unterhaltungen", { id: neueId(), titel: "Einzelgespräch", art: "einzel", mitglieder: [ich(), pid] });
}
AKTIONEN.chatNeuWeiter = async () => {
  if (!NEU.wahl.length) return toast("Bitte mindestens eine Person auswählen.");
  const u = NEU.wahl.length === 1 ? await einzelchatMit(NEU.wahl[0])
    : await speichere("unterhaltungen", { id: neueId(), titel: (NEU.titel || "").trim() || "Runde", art: "runde", mitglieder: [ich(), ...NEU.wahl] });
  zeige("unterhaltung", { id: u.id }, { ersetzen: true });
};
AKTIONEN.chatMit = async (pid) => { const u = await einzelchatMit(pid); zeige("unterhaltung", { id: u.id }); };

// ---------- Eine Unterhaltung ----------
function blaseHtml(n, u, gruppe) {
  const eigen = n.von === ich(), weg = !!n.zurueckgezogen_am;
  const bezug = n.antwort_auf ? hole("nachrichten", n.antwort_auf) : null;
  const re = Object.entries(n.reaktionen || {}).filter(([, e]) => e).reduce((m, [p, e]) => { (m[e] ||= []).push(p); return m; }, {});
  const reHtml = Object.keys(re).length ? `<div class="reaktionen">${Object.entries(re).map(([e, ps]) => `<button type="button" class="${ps.includes(ich()) ? "meine" : ""}" title="${esc(ps.map(vorn).join(", "))}" data-a="naReagieren" data-x="${esc(n.id)}|${esc(e)}">${esc(e)}${ps.length > 1 ? ` <b>${ps.length}</b>` : ""}</button>`).join("")}</div>` : "";
  let express = "";
  if (n.express && eigen) {
    const st = statusVon(n), l = empfaenger(u);
    express = `<div class="express-status"><div>🏎️ Per Express versandt ${umUhr(n.zeit)}</div>${l.slice(0, 8).map((p) => {
      const s = st.find((x) => x.person_id === p);
      const ank = s?.zugestellt_am ? `📬 angekommen ${umUhr(s.zugestellt_am)}` : s?.gelesen_am ? "📬 angekommen" : "📭 noch nicht angekommen";
      const gel = s?.gelesen_am ? ` · 👁 gelesen ${umUhr(s.gelesen_am)}` : s?.zugestellt_am ? " · noch nicht gelesen" : "";
      return `<div class="${s?.gelesen_am ? "" : "warte"}"><b>${esc(vorn(p))}</b>: ${ank}${gel}${s?.express_bestaetigt_am ? " · ✅ Empfang bestätigt" : ""}</div>`;
    }).join("")}${l.length > 8 ? `<div>… und ${l.length - 8} weitere</div>` : ""}</div>`;
  } else if (n.express && meinStatus(n)?.express_bestaetigt_am) express = `<div class="express-status">✅ Du hast den Empfang bestätigt</div>`;
  const rueck = n.rueckmeldung && !weg ? rueckmeldungHtml(n) : "";
  return `<div class="blase ${eigen ? "ich" : "du"}${n.wichtig && !weg ? " wichtig" : ""}${n.express && !weg ? " express" : ""}${gruppe && !eigen ? " farbig" : ""}" id="msg-${esc(n.id)}" data-a="naMenue" data-x="${esc(n.id)}"${gruppe && !eigen ? ` style="--pf:${farbeVon(n.von)}"` : ""}>
    ${weg ? "" : (n.wichtig ? '<div class="wichtig-marke">❗ WICHTIG</div>' : "") + (n.express ? '<div class="express-marke">🏎️ EXPRESS</div>' : "")}
    ${gruppe && !eigen ? `<div class="von">${esc(name(n.von))}</div>` : ""}
    ${bezug && !weg ? `<div class="zitat" data-a="zuNachricht" data-x="${esc(bezug.id)}"><b>${esc(bezug.von === ich() ? "Du" : name(bezug.von))}</b><span>${esc(bezug.zurueckgezogen_am ? "🚫 gelöscht" : String(bezug.text).slice(0, 90))}</span></div>` : ""}
    ${weg ? '<div class="txt weg">🚫 Diese Nachricht wurde gelöscht</div>' : (n.text ? `<div class="txt">${textHtml(n.text)}</div>` : "") + anlagenHtml(n) + umfrageHtml(n)}
    ${rueck}${express}
    <div class="fuss">${n.loescht_am && !weg ? `<span class="sl-marke" title="Löscht sich selbst – bei allen">⏳ ${esc(restText(n.loescht_am))}</span> ` : ""}${n.bearbeitet_am && !weg ? '<span class="bearb">bearbeitet</span> ' : ""}${uhr(n.zeit)}${eigen ? " " + hakenHtml(n) : ""}</div>${reHtml}</div>`;
}
function rueckmeldungHtml(n) {
  const r = n.rueckmeldungen || {}, meine = r[ich()], zahl = (w) => Object.values(r).filter((x) => x === w).length;
  return `<div class="knopfreihe">${[["ja", "👍 Ja / dabei"], ["nein", "👎 Nein"], ["gelesen", "👁️ Gelesen"]].map(([k, t]) => `<button class="knopf klein ${meine === k ? "gruen" : ""}" data-a="rueckmelden" data-x="${esc(n.id)}|${k}">${t}${istLeitung() ? " " + zahl(k) : ""}</button>`).join("")}</div>`;
}
// Vergangene Tage eingeklappt (rechts „Mo, 11.11.26“), ältere Wochen als „KW 45/26“ – heute, ungelesene und gesuchte Nachrichten sind offen
const tagKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const tagKurz = (iso) => { const d = new Date(iso); return `${WT[d.getDay()].slice(0, 2)}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`; };
export function kalenderwoche(iso) {
  const d = new Date(iso), x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), wt = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - wt);
  const j = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return { kw: Math.ceil(((x - j) / 86400000 + 1) / 7), jahr: x.getUTCFullYear() };
}
const kwText = (iso) => { const k = kalenderwoche(iso); return `KW ${k.kw}/${String(k.jahr).slice(2)}`; };
const werText = (ns) => { const w = [...new Set(ns.map((n) => vorn(n.von)))]; return w.slice(0, 3).join(", ") + (w.length > 3 ? " …" : ""); };
function verlaufHtml(u) {
  const ns = chatNachrichten(u.id), gruppe = u.art !== "einzel";
  if (!(u.id in C.trenner)) C.trenner[u.id] = ns.find((n) => n.von !== ich() && !gelesenVonMir(n))?.id || null;
  const ein = einst().chatEinklappen !== false, kwAn = einst().chatKW !== false, offen = (C.offen[u.id] ||= new Set());
  const tage = [];
  for (const n of ns) { const k = tagKey(n.zeit); if (tages(tage)?.key !== k) tage.push({ key: k, zeit: n.zeit, ns: [] }); tages(tage).ns.push(n); }
  const heute = tagKey(new Date());
  const mussOffen = (t) => t.key === heute || t.ns.some((n) => n.id === C.trenner[u.id] || n.id === C.ziel || (n.von !== ich() && !gelesenVonMir(n)));
  const tagOffen = (t) => !ein || mussOffen(t) || offen.has("t:" + t.key);
  const tagHtml = (t) => {
    if (!tagOffen(t)) return `<button type="button" class="tag-zu" data-a="tagUm" data-x="t:${t.key}"><span class="tz-pfeil">▸</span><span class="tz-info">${t.ns.length} ${t.ns.length === 1 ? "Nachricht" : "Nachrichten"} · ${esc(werText(t.ns))}</span><b class="tz-datum">${tagKurz(t.zeit)}</b></button>`;
    const kopfT = ein && t.key !== heute && !mussOffen(t) ? `<button type="button" class="tag-trenner auf" data-a="tagUm" data-x="t:${t.key}"><span>▾ ${tagTrenner(t.zeit)}</span></button>` : `<div class="tag-trenner"><span>${tagTrenner(t.zeit)}</span></div>`;
    return kopfT + t.ns.map((n) => (n.id === C.trenner[u.id] ? '<div class="neu-trenner" id="neuTrenner">⬇ Neue Nachrichten</div>' : "") + blaseHtml(n, u, gruppe)).join("");
  };
  let html = "", zu = 0;
  for (let i = 0; i < tage.length;) {
    const t = tage[i];
    if (ein && kwAn && tageAb(t.zeit) >= 7) { // ganze Kalenderwoche zusammenfassen
      const wk = kwText(t.zeit), woche = [];
      while (i < tage.length && tageAb(tage[i].zeit) >= 7 && kwText(tage[i].zeit) === wk) woche.push(tage[i++]);
      const wOffen = offen.has("w:" + wk) || woche.some(mussOffen);
      if (!wOffen) { zu++; const m = woche.reduce((x, y) => x + y.ns.length, 0); html += `<button type="button" class="tag-zu kw" data-a="tagUm" data-x="w:${wk}"><span class="tz-pfeil">▸</span><span class="tz-info">${m} ${m === 1 ? "Nachricht" : "Nachrichten"} an ${woche.length} ${woche.length === 1 ? "Tag" : "Tagen"} · ${esc(werText(woche.flatMap((x) => x.ns)))}</span><b class="tz-datum">${wk}</b></button>`; continue; }
      html += `<button type="button" class="kw-kopf" data-a="tagUm" data-x="w:${wk}">▾ ${wk}</button>` + woche.map((x) => { if (!tagOffen(x)) zu++; return tagHtml(x); }).join("");
      continue;
    }
    if (!tagOffen(t)) zu++;
    html += tagHtml(t); i++;
  }
  const leiste = ein && tage.length > 1 ? `<div class="tag-alle">${zu ? `<button type="button" data-a="tageAlle" data-x="auf">⤢ Alle ${tage.length} Tage aufklappen</button>` : `<button type="button" data-a="tageAlle" data-x="zu">⤡ Vergangene Tage einklappen</button>`}</div>` : "";
  const plan = geplanteVonMir(u.id).map((g) => `<button type="button" class="gp-blase" data-a="gpMenue" data-x="${esc(g.id)}">${textHtml(g.text || nachrichtKurz(g))}
    <small>⏰ wird gesendet ${esc(gpWann(g.geplant_um))}${g.wiederholung && g.wiederholung !== "einmal" ? ` · 🔁 ${esc(gpWdhText(g.wiederholung, g.geplant_um))}` : ""}<br><i>Nur du siehst das – antippen zum Ändern</i></small></button>`).join("");
  return (html ? leiste + html : '<div class="leer">Noch keine Nachrichten – schreib die erste.</div>') + (plan ? `<div class="gp-warte">${plan}</div>` : "");
}
const tages = (l) => l[l.length - 1];
AKTIONEN.tagUm = (k) => { const o = (C.offen[S.params.id] ||= new Set()); if (o.has(k)) o.delete(k); else o.add(k); verlaufNeu(S.params.id, true); };
AKTIONEN.tageAlle = (w) => {
  const id = S.params.id, o = (C.offen[id] = new Set());
  if (w === "auf") for (const n of chatNachrichten(id)) { o.add("t:" + tagKey(n.zeit)); o.add("w:" + kwText(n.zeit)); }
  verlaufNeu(id, true);
};

// ---------- 📎 Anhänge, 📊 Umfrage, ⏳ Selbstlöschen in der Blase ----------
const restText = (iso) => { const m = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 60000)); return m < 60 ? `noch ${m} Min.` : m < 48 * 60 ? `noch ${Math.round(m / 60)} Std.` : `noch ${Math.round(m / 1440)} Tage`; };
function anlagenHtml(n) {
  return (n.anlagen || []).map((a, i) => {
    if (a.art === "bild" && a.id) return `<button type="button" class="anhang-bild" data-a="bildZeigen" data-x="${esc(a.id)}"><img data-datei="${esc(a.id)}" alt="📷 ${esc(a.name)}"></button>`;
    if (a.art === "sprache" && a.id) return `<div class="sprache" data-sprache="${esc(a.id)}"><button type="button" class="knopf klein" data-a="spracheSpielen" data-x="${esc(a.id)}">▶️ Sprachnachricht ${a.dauer ? dauerText(a.dauer) : ""}</button></div>`;
    if (a.art === "noten") return `<button type="button" class="anhang-karte noten" data-a="anhangOeffnen" data-x="${esc(n.id)}|${i}"><span class="ak-sym">🎼</span><span><b>${esc(a.name)}</b><small>${a.id ? `Noten · ${groesseText(a.groesse)} · antippen zum Öffnen` : "im Notenarchiv – antippen"}</small></span></button>`;
    return `<button type="button" class="anhang-karte" data-a="anhangOeffnen" data-x="${esc(n.id)}|${i}"><span class="ak-sym">${a.art === "video" ? "🎬" : /pdf/.test(a.mime || "") ? "📕" : "📄"}</span><span><b>${esc(a.name)}</b><small>${groesseText(a.groesse)}</small></span></button>`;
  }).join("");
}
function umfrageHtml(n) {
  const u = n.umfrage; if (!u) return "";
  const st = Object.values(n.umfrage_stimmen || {}).filter((x) => Array.isArray(x) && x.length), meine = (n.umfrage_stimmen || {})[ich()] || [];
  const zahl = u.optionen.map((_, i) => st.filter((x) => x.includes(i)).length), max = Math.max(1, ...zahl);
  return `<div class="umfrage"><div class="uf-frage">📊 ${esc(u.frage)}</div><small class="hinweis">${u.mehrfach ? "Mehrere Antworten möglich" : "Eine Antwort"} · ${st.length} ${st.length === 1 ? "Stimme" : "Stimmen"}</small>
    ${u.optionen.map((o, i) => `<button type="button" class="uf-opt${meine.includes(i) ? " meine" : ""}" data-a="umfrageStimme" data-x="${esc(n.id)}|${i}"><span class="uf-balken" style="width:${Math.round((zahl[i] / max) * 100)}%"></span><span class="uf-text">${meine.includes(i) ? "✅" : "⚪"} ${esc(o)}</span><b>${zahl[i]}</b></button>`).join("")}
    ${st.length ? `<button type="button" class="uf-wer" data-a="umfrageWer" data-x="${esc(n.id)}">👥 Wer hat was gewählt?</button>` : ""}</div>`;
}
function bilderLaden(wurzel = document) {
  wurzel.querySelectorAll("img[data-datei]:not([data-geladen])").forEach((img) => {
    img.dataset.geladen = "1";
    const eigen = img.closest(".blase")?.classList.contains("ich");
    if (einst().fotosLaden === false && !eigen) { img.closest(".anhang-bild")?.classList.add("nicht-geladen"); return; }
    dateiUrl(img.dataset.datei).then((u) => { img.src = u; }).catch((e) => { img.closest(".anhang-bild")?.classList.add("fehler"); img.alt = "⚠️ " + e.message; });
  });
}
AKTIONEN.bildZeigen = async (id) => {
  let url; try { url = await dateiUrl(id); } catch (e) { return toast("⚠️ " + e.message); }
  document.getElementById("bildGross")?.remove();
  const d = document.createElement("div"); d.id = "bildGross"; d.className = "bild-gross"; d.setAttribute("role", "dialog");
  d.innerHTML = `<img src="${url}" alt="Foto"><div class="bg-knoepfe"><a class="knopf" href="${url}" download="Bachkreis-Foto.jpg">⬇️ Speichern</a><button type="button" class="knopf haupt" data-a="bildZu">✕ Schließen</button></div>`;
  d.addEventListener("click", (e) => { if (e.target === d) d.remove(); });
  document.body.appendChild(d);
};
AKTIONEN.bildZu = () => document.getElementById("bildGross")?.remove();
AKTIONEN.spracheSpielen = async (id) => {
  const box = document.querySelector(`[data-sprache="${CSS.escape(id)}"]`);
  try { const url = await dateiUrl(id); if (box) box.innerHTML = `<audio controls autoplay src="${url}"></audio>`; } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.anhangOeffnen = async (x) => {
  const [nid, i] = String(x).split("|"), a = hole("nachrichten", nid)?.anlagen?.[Number(i)]; if (!a) return;
  if (!a.id) { if (a.werk_id && istVerwalter()) return zeige("noten", { werk: a.werk_id }); return zeige("meinenoten"); }
  try { await dateiOeffnen(a.id, a.name, a.mime); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.umfrageStimme = async (x) => {
  const [nid, i] = String(x).split("|"), n = hole("nachrichten", nid); if (!n?.umfrage) return;
  const k = Number(i), cur = (n.umfrage_stimmen || {})[ich()] || [];
  const neu = n.umfrage.mehrfach ? (cur.includes(k) ? cur.filter((y) => y !== k) : [...cur, k]) : cur[0] === k ? [] : [k];
  await speichere("nachrichten", { ...n, umfrage_stimmen: { ...(n.umfrage_stimmen || {}), [ich()]: neu } });
  verlaufNeu(n.unterhaltung_id, true);
};
AKTIONEN.umfrageWer = (nid) => {
  const n = hole("nachrichten", nid); if (!n?.umfrage) return;
  const st = Object.entries(n.umfrage_stimmen || {}).filter(([, v]) => Array.isArray(v) && v.length);
  blatt(`📊 ${n.umfrage.frage}`, n.umfrage.optionen.map((o, i) => { const w = st.filter(([, v]) => v.includes(i)).map(([p]) => vorn(p)); return `<div class="ni-zeile"><span><b>${esc(o)}</b> (${w.length})</span><span class="hinweis">${esc(w.join(", ") || "–")}</span></div>`; }).join(""));
};

const EMOJIS = ["👍", "❤️", "😂", "😊", "🙏", "👏", "🎻", "🎵", "🎼", "🎉", "😮", "😢", "🤗", "💪", "☀️", "🚗"];
function eingabeHtml(u) {
  const darf = u.art !== "verteiler" || istVerwalter();
  if (!darf) return '<p class="hinweis eingabe-zu">📣 Rundschreiben – nur die Leitung kann hier schreiben. Antworten geht mit den Knöpfen unter der Nachricht.</p>';
  const a = C.antwort && hole("nachrichten", C.antwort);
  const z = C.zustell, zAn = z.push || z.mail || z.whatsapp, alle = z.push && z.mail && z.whatsapp;
  const exp = !expressUnbegrenzt() ? ` data-zahl="${expressHeute()}/${expressMax()}"` : "";
  const hinweis = [C.wichtig ? "❗ Wird als WICHTIG gesendet – bei allen farbig markiert, auch per E-Mail" : "", C.express ? "🏎️ Express: kommt sofort an – auch nachts. Beim Empfänger geht ein Fenster auf." : "", C.ablauf ? `⏳ Löscht sich nach ${C.ablauf === 1 ? "1 Std." : C.ablauf === 24 ? "24 Std." : "7 Tagen"} – bei allen` : "", C.diktat ? "🗣️ Ich höre zu … einfach sprechen" : "", entwurf(u.id) && !document.getElementById("chatText") ? "✏️ Entwurf – noch nicht gesendet" : ""].filter(Boolean);
  return `<div class="chat-eingabe" id="chatEingabe">
    ${a ? `<div class="antwort-leiste"><div class="zitat"><b>↩️ ${esc(a.von === ich() ? "Du" : name(a.von))}</b><span>${esc(String(a.text).slice(0, 90))}</span></div><button type="button" class="knopf klein" data-a="naAntwortWeg" aria-label="Antwort aufheben">✕</button></div>` : ""}
    ${C.zustellOffen ? `<div class="zustell"><span>Benachrichtigen:</span><button class="${alle ? "an" : ""}" data-a="zustellWahl" data-x="alle">✅ Alle</button><button class="${z.push ? "an" : ""}" data-a="zustellWahl" data-x="push">🔔 Push</button><button class="${z.mail ? "an" : ""}" data-a="zustellWahl" data-x="mail">✉️ E-Mail</button><button class="${z.whatsapp ? "an" : ""}" data-a="zustellWahl" data-x="whatsapp">🟢 WhatsApp</button><span>${z.push || z.mail ? "" : "· wie eingestellt"}</span></div>` : ""}
    ${C.emoji ? `<div class="chat-emoji">${EMOJIS.map((e) => `<button type="button" data-a="chatEmoji" data-x="${e}" aria-label="Emoji ${e}">${e}</button>`).join("")}</div>` : ""}
    ${hinweis.length ? `<div class="eingabe-hinweis">${hinweis.map(esc).join("<br>")}</div>` : ""}
    ${C.anlagen.length ? `<div class="anhang-chips">${C.anlagen.map((a) => `<span class="anhang-chip ${a.status}">${a.art === "bild" ? "📷" : a.art === "sprache" ? "🎤" : a.art === "noten" ? "🎼" : a.art === "video" ? "🎬" : "📄"} ${esc(a.name.length > 28 ? a.name.slice(0, 26) + "…" : a.name)}${a.status === "laedt" ? " ⏳" : a.status === "fehler" ? " ⚠️" : ""}<button type="button" data-a="anhangWeg" data-x="${a.tmp}" aria-label="Anhang entfernen">✕</button></span>`).join("")}</div>` : ""}
    ${C.aufnahme ? `<div class="aufnahme-leiste"><span class="rec">●</span><b id="aufZeit">${dauerText(C.aufnahme.sekunden())}</b><span class="hinweis">Sprachnachricht wird aufgenommen …</span><button type="button" class="knopf klein" data-a="aufnahmeWeg">✖ Verwerfen</button><button type="button" class="knopf haupt klein" data-a="aufnahmeSenden">➤ Senden</button></div>` : `<div class="innen${aufnahmeMoeglich() ? " mit-mikro" : ""}">
      <button type="button" class="rund anhang" data-a="anhangMenue" title="Anhang: Foto, Datei, Noten, Umfrage" aria-label="Anhang">📎</button>
      <textarea id="chatText" rows="1" maxlength="${CHAT.zeichen}" placeholder="${C.express ? "🏎️ Express-Sendung schreiben …" : C.wichtig ? "❗ Wichtige Nachricht schreiben …" : "Nachricht schreiben …"}" class="${C.express ? "express" : C.wichtig ? "wichtig" : ""}" aria-label="Nachricht schreiben">${esc(entwurf(u.id))}</textarea>
      <button type="button" class="rund mikro" data-a="aufnahmeStart" title="Sprachnachricht aufnehmen" aria-label="Sprachnachricht aufnehmen">🎙️</button>
      <button type="button" class="rund senden" data-a="chatSenden" data-x="${esc(u.id)}" aria-label="Senden" title="Senden">➤</button>
      <div class="werkzeuge">
        <button type="button" class="rund${C.emoji ? " an" : ""}" data-a="chatEmojiAuf" title="Emoji" aria-label="Emoji einfügen">😊</button>
        ${spracheMoeglich() ? `<button type="button" class="rund diktat${C.diktat ? " an" : ""}" data-a="diktieren" title="Diktieren – sprechen statt tippen" aria-label="Diktieren">🗣️</button>` : ""}
        <button type="button" class="rund${zAn ? " an" : ""}" data-a="zustellAuf" title="Wie benachrichtigen? (Push, E-Mail, WhatsApp)" aria-label="Wie benachrichtigen">🔔</button>
        <button type="button" class="rund wichtig-knopf${C.wichtig ? " an" : ""}" data-a="wichtigUm" title="Wichtig – Wichtigkeit hoch" aria-pressed="${C.wichtig}">❗</button>
        <button type="button" class="rund express-knopf${C.express ? " an" : ""}" data-a="expressUm" title="Express-Sendung – kommt sofort an, auch nachts" aria-pressed="${C.express}"${C.express ? exp : ""}>🏎️</button>
        <button type="button" class="rund" data-a="spaeterWahl" data-x="${esc(u.id)}" title="Später senden …" aria-label="Später senden">⏰</button>
        <button type="button" class="rund ablauf${C.ablauf ? " an" : ""}" data-a="ablaufWahl" title="Nachricht löscht sich selbst …" aria-label="Selbstlöschen">⏳</button>
      </div></div>`}</div>`;
}
VIEWS.unterhaltung = {
  render({ id }) {
    const u = hole("unterhaltungen", id);
    if (!u || !meineUnterhaltungen().some((x) => x.id === id)) return kopf("Nachrichten") + '<div class="leer">Nicht gefunden.</div>';
    const l = empfaengerVon(db, u), p = chatPartnerVon(u);
    const unter = p ? ({ schueler: "Schüler/in", eltern: "Eltern", lehrkraft: "Lehrkraft", leitung: "Leitung" }[hole("personen", p)?.typ] || "Bachkreis") : u.art === "verteiler" ? `📣 Rundschreiben · ${l.length} Empfänger` : `${u.art === "runde" ? "Runde" : "Gruppe"} · ${l.length} Mitglieder`;
    return `<div class="chat-kopf"><button class="zurueck" data-a="zurueck" aria-label="Zurück">‹</button>${chatBild(u, true)}<div class="chat-kopf-text" data-a="chatMitglieder" data-x="${esc(id)}"><h2>${esc(chatTitel(u))}</h2><div class="hinweis">${esc(unter)}</div></div></div>
      <div id="chatHg" class="chat-hg" aria-hidden="true"></div><div class="chat" id="chatVerlauf">${verlaufHtml(u)}</div>${eingabeHtml(u)}`;
  },
  nach(w, { id }) {
    cfAnwenden();
    eingabeVerdrahten(id, false);
    bilderLaden(w);
    abstand();
    const tr = document.getElementById("neuTrenner");
    if (tr && !C.gesprungen?.[id]) { (C.gesprungen ||= {})[id] = true; tr.scrollIntoView({ block: "start" }); } else window.scrollTo(0, document.body.scrollHeight);
    nachrichtenVorlesen(id);
    setTimeout(() => gelesenMarkieren(id), 400);
  },
};
// Platz für die feste Eingabe unten (KC-CLUB-CHAT-ABSTAND)
function abstand() { const e = document.getElementById("chatEingabe"), v = document.getElementById("chatVerlauf"); if (e && v) v.style.paddingBottom = e.offsetHeight + 24 + "px"; }
function verlaufNeu(id, stehen = false) {
  const v = document.getElementById("chatVerlauf"), u = hole("unterhaltungen", id); if (!v || !u || S.view !== "unterhaltung" || S.params.id !== id) return;
  const unten = innerHeight + scrollY >= document.body.scrollHeight - 160, y = scrollY;
  v.innerHTML = verlaufHtml(u); abstand(); bilderLaden(v);
  if (stehen) window.scrollTo(0, y); else if (unten) window.scrollTo(0, document.body.scrollHeight);
}
function nachrichtenVorlesen(uid) {
  if (einst().vorlesen !== true || !("speechSynthesis" in globalThis)) return;
  for (const n of chatNachrichten(uid).filter((x) => x.von !== ich() && !gelesenVonMir(x) && !x.zurueckgezogen_am).slice(-3)) {
    const s = new SpeechSynthesisUtterance(`${name(n.von)} schreibt${n.wichtig ? " wichtig" : ""}: ${nachrichtKurz(n)}`); s.lang = "de-DE"; speechSynthesis.speak(s);
  }
}
// Gelesen melden (blaue Haken beim Absender) – ohne Lesebestätigung nur auf diesem Gerät merken (wie WhatsApp)
let markLaeuft = false;
async function gelesenMarkieren(uid) {
  if (!S.ich || markLaeuft || S.view !== "unterhaltung" || S.params.id !== uid || document.hidden) return;
  const offen = chatNachrichten(uid).filter((n) => n.von !== ich() && !gelesenVonMir(n));
  if (!offen.length) return;
  markLaeuft = true;
  try {
    if (einst().lesebestaetigung === false) {
      lokalGelesen(offen.map((n) => n.id));
      const ohne = offen.filter((n) => !meinStatus(n));
      if (ohne.length) await speichereViele("nachricht_status", ohne.map((n) => ({ id: nsId(n.id, ich()), nachricht_id: n.id, person_id: ich(), zugestellt_am: jetztIso() })));
    } else {
      await speichereViele("nachricht_status", offen.map((n) => ({ ...(meinStatus(n) || {}), id: nsId(n.id, ich()), nachricht_id: n.id, person_id: ich(), zugestellt_am: meinStatus(n)?.zugestellt_am || jetztIso(), gelesen_am: jetztIso() })));
    }
  } finally { markLaeuft = false; }
}
// ✓✓ angekommen: alles, was auf diesem Gerät ankommt, einmal als „angekommen“ melden (im Echtbetrieb auch der Push-Empfang)
let ankunftZuletzt = 0;
async function angekommenMelden() {
  if (!S.ich || Date.now() - ankunftZuletzt < 4000) return;
  ankunftZuletzt = Date.now();
  const ids = new Set(meineUnterhaltungen().map((u) => u.id));
  const neu = liste("nachrichten", (n) => ids.has(n.unterhaltung_id) && n.von !== ich() && nachrichtFrei(n) && !n.zurueckgezogen_am && !meinStatus(n) && !gelesenVonMir(n));
  if (neu.length) await speichereViele("nachricht_status", neu.slice(0, 200).map((n) => ({ id: nsId(n.id, ich()), nachricht_id: n.id, person_id: ich(), zugestellt_am: jetztIso() })));
}

// ---------- Eingabe-Knöpfe ----------
AKTIONEN.chatEmojiAuf = () => { C.emoji = !C.emoji; eingabeNeu(); };
AKTIONEN.chatEmoji = (e) => {
  const t = document.getElementById("chatText"); if (!t) return;
  const a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
  t.value = t.value.slice(0, a) + e + t.value.slice(b); t.focus(); try { t.setSelectionRange(a + e.length, a + e.length); } catch {}
  t.dispatchEvent(new Event("input", { bubbles: true }));
};
AKTIONEN.zustellAuf = () => { C.zustellOffen = !C.zustellOffen; eingabeNeu(); };
AKTIONEN.zustellWahl = (k) => { const z = C.zustell; if (k === "alle") { const an = !(z.push && z.mail && z.whatsapp); z.push = z.mail = z.whatsapp = an; } else z[k] = !z[k]; eingabeNeu(); };
AKTIONEN.wichtigUm = () => { C.wichtig = !C.wichtig; eingabeNeu(); toast(C.wichtig ? "❗ Wird als WICHTIG gesendet – bei allen farbig markiert, auch per E-Mail" : "Normale Wichtigkeit"); };
const expressHeute = () => liste("nachrichten", (n) => n.von === ich() && n.express && Date.now() - Date.parse(n.zeit) < 86400000).length;
AKTIONEN.expressUm = () => {
  if (!C.express && !expressUnbegrenzt() && expressHeute() >= expressMax()) return toast(`🏎️ Heute schon ${expressMax()} von ${expressMax()} Express-Sendungen verschickt – mehr gehen nicht. Bitte normal (oder ❗ wichtig) senden.`, 5000);
  C.express = !C.express; eingabeNeu();
  if (C.express) toast(`🏎️ Express an: kommt sofort an – auch nachts. Beim Empfänger geht ein Fenster auf. Nur für Eiliges!${expressUnbegrenzt() ? "" : ` Heute ${expressHeute()}/${expressMax()}.`}`, 5000);
};
AKTIONEN.naAntwortWeg = () => { C.antwort = null; eingabeNeu(); };
// Nur die Eingabe neu zeichnen (Text bleibt, Fokus bleibt)
function eingabeNeu() {
  const alt = document.getElementById("chatEingabe"), u = hole("unterhaltungen", S.params.id); if (!alt || !u) return zeichne();
  const t = document.getElementById("chatText"); if (t) entwurfSetzen(u.id, t.value);
  const d = document.createElement("div"); d.innerHTML = eingabeHtml(u); alt.replaceWith(d.firstElementChild);
  eingabeVerdrahten(u.id, !C.aufnahme && !C.diktat);
  abstand();
}
function eingabeVerdrahten(id, fokus) {
  const t = document.getElementById("chatText"), e = document.getElementById("chatEingabe");
  if (!t) return;
  const stand = () => { e?.classList.toggle("hat-text", !!t.value.trim() || C.anlagen.length > 0); };
  const hoehe = () => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, innerHeight * 0.36) + "px"; abstand(); };
  t.addEventListener("input", () => { entwurfSetzen(id, t.value); hoehe(); stand(); });
  t.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey && einst().enterSendet === true) { ev.preventDefault(); AKTIONEN.chatSenden(id); } });
  hoehe(); stand();
  if (fokus) { t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch {} }
}

// ---------- Senden ----------
async function wichtigkeitFragen(uid) {
  if (C.wichtig || C.express) return;
  const an = einst().wichtigFragen ?? istLeitung();
  if (!an || Date.now() - (C.wfZuletzt[uid] || 0) < 30 * 60000) return;
  C.wfZuletzt[uid] = Date.now();
  if (await frage("Wie wichtig ist diese Nachricht?\n\nOK = ❗ Hoch – bei allen farbig markiert, geht per Push UND E-Mail raus.\nAbbrechen = 📝 Normal – wie immer.")) C.wichtig = true;
}
function zustellKanaele() { const z = C.zustell, k = []; if (z.push) k.push("push"); if (z.mail) k.push("mail"); if (!k.length && einst().zustellStandard === "push") k.push("push"); if (!k.length && einst().zustellStandard === "pushmail") k.push("push", "mail"); return k; }
async function nachrichtBauen(uid, text, extra = {}) {
  const u = hole("unterhaltungen", uid);
  return { id: neueId(), unterhaltung_id: uid, von: ich(), text, zeit: jetztIso(), gelesen_von: [ich()], rueckmeldung: false, rueckmeldungen: {}, reaktionen: {},
    wichtig: !!C.wichtig, express: !!C.express, antwort_auf: C.antwort || null, kanaele: zustellKanaele(), anzahl: empfaenger(u).length,
    anlagen: C.anlagen.filter((a) => a.status === "fertig").map(({ id, name, mime, groesse, art, dauer, stimme_id, werk_id }) => ({ id, name, mime, groesse, art, dauer, stimme_id, werk_id })),
    loescht_am: C.ablauf ? new Date(Date.now() + C.ablauf * 3600000).toISOString() : null, ...extra };
}
function eingabeZuruecksetzen(uid) {
  entwurfSetzen(uid, ""); C.anlagen = []; C.ablauf = null; C.antwort = null; C.wichtig = false; C.express = false; C.zustell = { push: false, mail: false, whatsapp: false }; C.zustellOffen = false; C.emoji = false;
}
AKTIONEN.chatSenden = async (uid) => {
  const feld = document.getElementById("chatText"), text = String(feld?.value ?? entwurf(uid)).trim();
  if (!text && !C.anlagen.length) return;
  if (C.anlagen.some((a) => a.status === "laedt")) {
    toast("⏳ Der Anhang lädt noch – die Nachricht geht mit ihm zusammen raus, sobald er fertig ist …");
    const bis = Date.now() + 180000;
    while (C.anlagen.some((a) => a.status === "laedt") && Date.now() < bis) await new Promise((r) => setTimeout(r, 300));
    if (C.anlagen.some((a) => a.status === "laedt")) return toast("⚠️ Der Anhang ist noch nicht fertig – nichts wurde gesendet. Bitte gleich nochmal ➤.");
  }
  if (C.anlagen.some((a) => a.status === "fehler")) return toast("⚠️ Ein Anhang ging nicht hoch – bitte mit ✕ entfernen oder neu wählen.");
  if ([...text].length > CHAT.zeichen) return toast(`Höchstens ${CHAT.zeichen} Zeichen.`);
  await wichtigkeitFragen(uid);
  const u = hole("unterhaltungen", uid), n = await nachrichtBauen(uid, text);
  const whatsappAuch = C.zustell.whatsapp;
  papierflieger(document.querySelector('[data-a="chatSenden"]'), n.wichtig, n.id, n.express);
  await speichere("nachrichten", n);
  eingabeZuruecksetzen(uid);
  C.trenner[uid] = null;
  zeichne(); window.scrollTo(0, document.body.scrollHeight);
  if (whatsappAuch) { const p = chatPartnerVon(u); whatsapp(`${text}\n\n– ${S.ich.vorname} (Bachkreis-App)`, { nummer: p ? hole("personen", p)?.mobil || "" : "", anId: p, betreff: chatTitel(u) }); }
  setTimeout(() => bilderLaden(), 50);
  const r = await bescheid(n, u);
  if (n.express) toast(`🏎️ Per Express versandt${r ? ` (${r} Wege)` : ""}. Unter der Nachricht siehst du, wann sie angekommen ist und gelesen wurde.${expressUnbegrenzt() ? "" : ` Heute ${expressHeute()}/${expressMax()}.`}`, 5000);
};
// Bescheid über den BK Communicator – im Echtbetrieb bestimmt der Server Empfänger und Regel (je Nachricht einmal)
async function bescheid(n, u) {
  try {
    if (istEchtbetrieb()) { await jetztAbgleichen(); const r = await senden({ an: [], betreff: chatTitel(u), text: nachrichtKurz(n), ereignis: nachrichtEreignis(n, u), nachricht_id: n.id, kanaele: n.kanaele }); return (r.vorgemerkt || 0); }
    const an = empfaenger(u);
    const r = await senden({ an, betreff: `${n.express ? "🏎️ EXPRESS von " : n.wichtig ? "❗ Wichtig: " : ""}${name(n.von)} · ${chatTitel(u)}`, text: nachrichtKurz(n), ereignis: nachrichtEreignis(n, u), kanaele: n.kanaele?.length ? n.kanaele : null, nachricht_id: n.id });
    demoZustellung(n, an);
    return (r.push || 0) + (r.mail || 0);
  } catch (e) { console.warn("Nachricht-Bescheid", e); return 0; }
}
// Vorführversion: Ankunft (und im Einzelchat das Lesen) wird nach ein paar Sekunden nachgespielt – so sieht man die Haken wandern
function demoZustellung(n, an) {
  if (istEchtbetrieb() || !an.length) return;
  setTimeout(() => speichereViele("nachricht_status", an.map((p) => ({ id: nsId(n.id, p), nachricht_id: n.id, person_id: p, autor_id: n.von, zugestellt_am: jetztIso() }))).then(() => S.view === "unterhaltung" && verlaufNeu(n.unterhaltung_id)), 1500);
  // Express nicht nachspielen: wer in der Vorführversion zur Empfängerin wechselt, sieht das Express-Fenster selbst
  if (an.length === 1 && !n.express) setTimeout(() => speichere("nachricht_status", { id: nsId(n.id, an[0]), nachricht_id: n.id, person_id: an[0], autor_id: n.von, zugestellt_am: jetztIso(), gelesen_am: jetztIso() }).then(() => S.view === "unterhaltung" && verlaufNeu(n.unterhaltung_id)), 6000);
}

// ---------- Nachricht antippen: Reaktionen, Antworten, Kopieren, Bearbeiten, Details, Löschen ----------
const SCHNELL = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
AKTIONEN.naMenue = (id) => {
  const n = hole("nachrichten", id); if (!n || n.zurueckgezogen_am) return;
  const eigen = n.von === ich(), meine = (n.reaktionen || {})[ich()];
  const bearbeitbar = eigen && Date.now() - Date.parse(n.zeit) < bearbeitenMin() * 60000;
  blatt(eigen ? "Deine Nachricht" : `Nachricht von ${name(n.von)}`, `<div class="na-vorschau">${esc(String(n.text).slice(0, 160))}</div>
    <div class="na-schnell">${SCHNELL.map((e) => `<button type="button" class="${meine === e ? "an" : ""}" data-a="naReagieren" data-x="${esc(id)}|${e}" aria-label="Mit ${e} reagieren">${e}</button>`).join("")}</div>
    <div class="na-knoepfe"><button class="knopf" data-a="naAntworten" data-x="${esc(id)}">↩️ Antworten</button>
    ${n.text ? `<button class="knopf" data-a="naKopieren" data-x="${esc(id)}">📋 Kopieren</button>` : ""}
    ${(n.anlagen || []).filter((a) => a.id).map((a, i) => `<button class="knopf" data-a="anhangOeffnen" data-x="${esc(id)}|${(n.anlagen || []).indexOf(a)}">⬇️ ${esc(a.art === "sprache" ? "Sprachnachricht" : a.name)} öffnen / speichern</button>`).join("")}
    ${bearbeitbar ? `<button class="knopf" data-a="naBearbeiten" data-x="${esc(id)}">✏️ Bearbeiten (noch ${Math.max(1, Math.ceil((bearbeitenMin() * 60000 - (Date.now() - Date.parse(n.zeit))) / 60000))} Min.)</button>` : ""}
    <button class="knopf" data-a="naVorlesen" data-x="${esc(id)}">🔊 Vorlesen</button>
    <button class="knopf" data-a="naInfo" data-x="${esc(id)}">ℹ️ Details – wann gesendet, angekommen, gelesen</button>
    ${eigen || istLeitung() ? `<button class="knopf rot" data-a="naLoeschen" data-x="${esc(id)}">🗑️ Für alle löschen</button>` : ""}</div>`);
};
AKTIONEN.naReagieren = async (x) => {
  const [id, e] = String(x).split("|"), n = hole("nachrichten", id); if (!n) return;
  blattZu();
  const re = { ...(n.reaktionen || {}) }; if (re[ich()] === e) re[ich()] = null; else re[ich()] = e;
  await speichere("nachrichten", { ...n, reaktionen: re }); // null = eigene Reaktion entfernen (der Server löscht den Eintrag)
  verlaufNeu(n.unterhaltung_id);
};
AKTIONEN.naAntworten = (id) => { blattZu(); C.antwort = id; eingabeNeu(); };
AKTIONEN.naKopieren = async (id) => { blattZu(); try { await navigator.clipboard.writeText(hole("nachrichten", id)?.text || ""); toast("📋 Kopiert"); } catch { toast("Kopieren ging nicht"); } };
AKTIONEN.naVorlesen = (id) => { blattZu(); const n = hole("nachrichten", id); if (!n || !("speechSynthesis" in globalThis)) return; const s = new SpeechSynthesisUtterance(`${name(n.von)}: ${n.text}`); s.lang = "de-DE"; speechSynthesis.cancel(); speechSynthesis.speak(s); };
AKTIONEN.naBearbeiten = (id) => {
  const n = hole("nachrichten", id); if (!n) return;
  blatt("✏️ Nachricht bearbeiten", `<div class="feld"><textarea id="naBearbText" rows="4" maxlength="${CHAT.zeichen}">${esc(n.text)}</textarea></div>
    <p class="hinweis">Bei allen steht danach „bearbeitet“. Geht nur in den ersten ${bearbeitenMin()} Minuten.</p><button class="knopf haupt breit" data-a="naBearbSpeichern" data-x="${esc(id)}">💾 Speichern</button>`);
};
AKTIONEN.naBearbSpeichern = async (id) => {
  const n = hole("nachrichten", id), t = String(document.getElementById("naBearbText")?.value || "").trim(); if (!n || !t) return;
  if (Date.now() - Date.parse(n.zeit) > bearbeitenMin() * 60000) { blattZu(); return toast(`✏️ Zu spät – bearbeiten geht nur in den ersten ${bearbeitenMin()} Minuten.`); }
  await speichere("nachrichten", { ...n, text: t, bearbeitet_am: jetztIso() }); blattZu(); verlaufNeu(n.unterhaltung_id); toast("✏️ Geändert");
};
AKTIONEN.naLoeschen = async (id) => {
  const n = hole("nachrichten", id); if (!n) return; blattZu();
  if (!(await frage(n.von === ich() ? "Nachricht für alle löschen?\n\nBei allen steht dann „Diese Nachricht wurde gelöscht“." : "Nachricht als Leitung für alle löschen?"))) return;
  await speichere("nachrichten", { ...n, text: "", zurueckgezogen_am: jetztIso(), reaktionen: {} }); verlaufNeu(n.unterhaltung_id); toast("🗑️ Gelöscht");
};
AKTIONEN.zuNachricht = (id) => {
  let el = document.getElementById("msg-" + id);
  if (!el) { const n = hole("nachrichten", id); if (!n) return; C.ziel = id; const o = (C.offen[n.unterhaltung_id] ||= new Set()); o.add("t:" + tagKey(n.zeit)); o.add("w:" + kwText(n.zeit)); verlaufNeu(n.unterhaltung_id, true); el = document.getElementById("msg-" + id); if (!el) return; } el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("aufblitzen"); void el.offsetWidth; el.classList.add("aufblitzen"); };
AKTIONEN.rueckmelden = async (x) => {
  const [id, w] = x.split("|"), n = hole("nachrichten", id);
  await speichere("nachrichten", { ...n, rueckmeldungen: { ...(n.rueckmeldungen || {}), [ich()]: w } });
  toast("Rückmeldung gespeichert"); verlaufNeu(n.unterhaltung_id);
};
AKTIONEN.chatMitglieder = (uid) => {
  const u = hole("unterhaltungen", uid); if (!u) return;
  const l = empfaengerVon(db, u);
  blatt(`${chatTitel(u)} – ${l.length} ${u.art === "verteiler" ? "Empfänger" : "Mitglieder"}`, `<ul class="liste">${l.map((p) => `<li><span class="chat-bild klein gesicht-bild">${gesicht(p, name(p))}</span><div class="fl">${esc(p === ich() ? "Du" : name(p))}</div>${p !== ich() && chatPartnerErlaubt(S.ich, hole("personen", p), { verwandt: [...kinderVon(db, ich()), ...elternVon(db, ich())].includes(p), schuelerUntereinander: konfig().chat_schueler_untereinander !== false }) && u.art !== "einzel" ? `<button class="knopf klein" data-a="chatMit" data-x="${esc(p)}">💬</button>` : ""}</li>`).join("")}</ul>`);
};

// ℹ️ Details (KC nachrichtInfo): je Empfänger gesendet → angekommen → gelesen; Absender sieht dazu, was der Communicator je Weg gemacht hat
const NI_KANAL = { push: "🔔 Push", mail: "✉️ E-Mail", app: "💬 In der App", whatsapp: "🟢 WhatsApp" };
const NI_STATUS = { wartend: "⏳ wartet", erneut: "🔁 neuer Versuch geplant", in_arbeit: "📤 wird gesendet", gesendet: "📤 verschickt", zugestellt: "📬 zugestellt", angezeigt: "📬 auf dem Handy angezeigt", geoeffnet: "👆 geöffnet", quittiert: "✅ bestätigt", simuliert: "🧪 simuliert (Vorführversion)", unterdrueckt: "🚫 nicht gesendet", fehler: "⚠️ Fehler", tot: "⚠️ aufgegeben" };
AKTIONEN.naInfo = async (id) => {
  const n = hole("nachrichten", id); if (!n) return;
  const u = hole("unterhaltungen", n.unterhaltung_id), eigen = n.von === ich();
  const st = statusVon(n), l = eigen ? empfaenger(u) : [];
  const zeile = (p) => { const s = st.find((x) => x.person_id === p);
    const h = s?.gelesen_am ? '<span class="haken blau">' + HAKEN_ZWEI + "</span>" : s?.zugestellt_am ? '<span class="haken">' + HAKEN_ZWEI + "</span>" : '<span class="haken">' + HAKEN_EINS + "</span>";
    return `<div class="ni-zeile"><span>${h} <b>${esc(vorn(p))}</b></span><span class="hinweis">${s?.zugestellt_am ? `📬 ${esc(wannGenau(s.zugestellt_am))}` : "noch nicht angekommen"}${s?.gelesen_am ? ` · 👀 ${esc(wannGenau(s.gelesen_am))}` : ""}${s?.express_bestaetigt_am ? ` · ✅ ${esc(wannGenau(s.express_bestaetigt_am))}` : ""}</span></div>`; };
  let wege = "";
  if (eigen) {
    let w = [];
    if (istEchtbetrieb()) { try { w = (await serverAktion("nachricht_zustellung", { id })).wege || []; } catch { w = null; } }
    else w = liste("versand", (v) => v.korrelation === `nachricht:${id}`).map((v) => ({ name: name(v.an_id), kanal: v.kanal, status: v.status, zeit: v.zeit, gesendet_am: v.gesendet_am, status_am: v.status_am, fehler: v.fehler_code }));
    wege = w === null ? '<p class="hinweis">Zustellung gerade nicht abrufbar (keine Verbindung).</p>'
      : !w.length ? `<p class="hinweis">${nachrichtFrei(n) ? "Kein Push und keine E-Mail verschickt – die Nachricht steht nur in der App (z. B. weil die Empfänger es so eingestellt haben)." : "Wird erst zur geplanten Zeit verschickt."}</p>`
      : `<div class="ni-wege">${w.slice(0, 60).map((v) => `<div class="ni-zeile"><span>${NI_KANAL[v.kanal] || esc(v.kanal)} an <b>${esc(v.name)}</b></span><span class="hinweis">${NI_STATUS[v.status] || esc(v.status)} ${esc(wannGenau(v.status_am || v.gesendet_am || v.zeit))}${v.fehler ? ` · ${esc(v.fehler)}` : ""}</span></div>`).join("")}${w.length > 60 ? `<p class="hinweis">… und ${w.length - 60} weitere</p>` : ""}</div>`;
  }
  const g = l.filter((p) => st.some((s) => s.person_id === p && s.gelesen_am)).length;
  blatt("ℹ️ Nachricht – Einzelheiten", `${n.wichtig ? '<div class="ni-zeile ni-wichtig"><span>❗ <b>Wichtige Nachricht</b></span><span>Wichtigkeit: hoch</span></div>' : ""}
    ${n.express ? '<div class="ni-zeile ni-express"><span>🏎️ <b>Express-Sendung</b></span><span>kommt sofort durch</span></div>' : ""}
    <div class="ni-zeile"><span>✍️ Geschrieben ${eigen ? "von dir" : "von " + esc(name(n.von))}</span><span class="hinweis">${esc(wannGenau(n.zeit))}</span></div>
    ${n.bearbeitet_am ? `<div class="ni-zeile"><span>✏️ Bearbeitet</span><span class="hinweis">${esc(wannGenau(n.bearbeitet_am))}</span></div>` : ""}
    ${eigen ? `<h4>👥 Empfänger${l.length > 1 ? ` – ${g} von ${l.length} gelesen` : ""}</h4>${l.map(zeile).join("") || '<p class="hinweis">Nur du</p>'}
      <h4>🚚 Zustellung über den BK Communicator</h4>${wege}`
      : `<div class="ni-zeile"><span>📬 Bei dir angekommen</span><span class="hinweis">${esc(wannGenau(meinStatus(n)?.zugestellt_am))}</span></div><div class="ni-zeile"><span>👀 Von dir gelesen</span><span class="hinweis">${esc(wannGenau(meinStatus(n)?.gelesen_am || (gelesenVonMir(n) ? n.zeit : null)))}</span></div>`}`);
};

// ---------- ⏰ Später senden (KC-CLUB-SPAETER-SENDEN): Zeit antippen, wie oft, planen ----------
const GP = { uid: null, um: null, wdh: "einmal", eigene: false, aendern: null, text: "" };
const gpUhr = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
export function gpWann(iso) {
  const d = new Date(iso), t = -tageAb(iso);
  return (t === 0 ? "heute" : t === 1 ? "morgen" : t === 2 ? "übermorgen" : `${WT[d.getDay()].slice(0, 2)} ${d.getDate()}.${d.getMonth() + 1}.`) + " um " + gpUhr(d) + " Uhr";
}
const gpWdhText = (w, iso) => { const d = iso ? new Date(iso) : null; return w === "taeglich" ? "jeden Tag" : w === "werktags" ? "werktags (Mo–Fr)" : w === "woechentlich" ? `jeden ${d ? WT[d.getDay()] : "Woche"}` : w === "monatlich" ? `jeden Monat am ${d ? d.getDate() + "." : ""}` : "einmal"; };
function gpVorschlaege() {
  const jetzt = new Date(), morgen = (h) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d; };
  const abend = new Date(); abend.setHours(18, 0, 0, 0);
  return [...(abend - jetzt > 15 * 60000 ? [["🌇", "Heute Abend", abend]] : []), ["🌅", "Morgen früh", morgen(8)], ["☀️", "Morgen Mittag", morgen(12)]];
}
AKTIONEN.spaeterWahl = (uid) => {
  const text = String(document.getElementById("chatText")?.value || "").trim();
  if (!text) return toast("⏰ Erst die Nachricht schreiben – dann auf ⏰ tippen und die Zeit wählen.");
  if (C.express) return toast("🏎️ Express geht sofort raus – später senden geht nur ohne Express.");
  Object.assign(GP, { uid, um: null, wdh: "einmal", eigene: false, aendern: null, text });
  gpBlatt();
};
function gpBlatt() {
  const v = gpVorschlaege(), gewaehlt = (d) => GP.um && !GP.eigene && Math.abs(GP.um - d) < 60000;
  const lokal = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");
  const wd = GP.um ? WT[GP.um.getDay()] : "Wochentag";
  const wdh = [["einmal", "Nur einmal"], ["taeglich", "Jeden Tag"], ["werktags", "Werktags (Mo–Fr)"], ["woechentlich", `Jeden ${wd}`], ["monatlich", `Jeden Monat am ${GP.um ? GP.um.getDate() + "." : "…"}`]];
  const zusammen = GP.um ? `📤 Wird gesendet: <b>${esc(gpWann(GP.um.toISOString()))}</b>${GP.wdh !== "einmal" ? `<br>🔁 danach <b>${esc(gpWdhText(GP.wdh, GP.um.toISOString()))}</b>` : ""}` : "Bitte oben eine Zeit antippen.";
  blattAktualisieren("gp", GP.aendern ? "⏰ Zeit ändern" : "⏰ Wann soll die Nachricht ankommen?", `<div class="gp-vorschau">${esc(GP.text.length > 140 ? GP.text.slice(0, 140) + " …" : GP.text)}</div>
    <div class="gp-titel">1. Wann?</div>
    <div class="gp-wahl">${v.map(([sym, t, d], i) => `<button class="knopf${gewaehlt(d) ? " haupt" : ""}" data-a="gpZeit" data-x="${i}">${sym} ${t}<small>${esc(gpWann(d.toISOString()).replace(/^(heute|morgen) um /, ""))}</small></button>`).join("")}
      <button class="knopf${GP.eigene ? " haupt" : ""}" data-a="gpEigene">📅 Andere Zeit …</button></div>
    ${GP.eigene ? `<div class="gp-eigen"><label>Tag <input type="date" id="gpTag" data-c="gpEigeneGesetzt" value="${lokal(GP.um)}" min="${lokal(new Date())}"></label>
      <label>Uhrzeit <input type="time" id="gpZeit" data-c="gpEigeneGesetzt" value="${GP.um ? `${String(GP.um.getHours()).padStart(2, "0")}:${String(GP.um.getMinutes()).padStart(2, "0")}` : "08:00"}" step="300"></label></div>` : ""}
    <div class="gp-titel">2. Wie oft?</div>
    <div class="gp-wahl gp-wdh">${wdh.map(([w, t]) => `<button class="knopf${GP.wdh === w ? " haupt" : ""}" data-a="gpWdh" data-x="${w}">${w === "einmal" ? "1️⃣" : "🔁"} ${esc(t)}</button>`).join("")}</div>
    <p class="gp-zusammen">${zusammen}</p>
    <button class="knopf haupt breit gp-los" data-a="gpPlanen" ${GP.um ? "" : "disabled"}>⏰ ${GP.aendern ? "Speichern" : "Planen"}</button>`);
}
// Offenes Fenster nur neu befüllen (kein erneutes Hochfahren bei jeder Wahl)
function blattAktualisieren(art, titel, inhalt) {
  const da = document.querySelector(`#blattHg .blatt[data-art="${art}"]`);
  if (!da) { blatt(titel, inhalt).dataset.art = art; return; }
  da.innerHTML = `<h3>${esc(titel)}</h3>${inhalt}<button class="knopf breit" data-a="blattZu">Schließen</button>`;
}
AKTIONEN.gpZeit = (i) => { const d = gpVorschlaege()[Number(i)]?.[2]; if (!d) return; GP.um = d; GP.eigene = false; gpBlatt(); };
AKTIONEN.gpEigene = () => { GP.eigene = true; if (!GP.um) { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); GP.um = d; } gpBlatt(); };
AKTIONEN.gpEigeneGesetzt = () => {
  const t = document.getElementById("gpTag")?.value, z = document.getElementById("gpZeit")?.value; if (!t || !z) return;
  const [y, m, d] = t.split("-").map(Number), [h, mi] = z.split(":").map(Number);
  GP.um = new Date(y, m - 1, d, h, mi, 0, 0); gpBlatt();
};
AKTIONEN.gpWdh = (w) => { GP.wdh = w; gpBlatt(); };
AKTIONEN.gpPlanen = async () => {
  if (!GP.um) return toast("Bitte zuerst eine Zeit antippen.");
  if (GP.um - Date.now() < 60000) return toast("⏰ Diese Zeit ist schon vorbei – bitte eine spätere wählen.");
  if (GP.wdh === "werktags" && [0, 6].includes(GP.um.getDay())) return toast("„Werktags“ geht nur, wenn der erste Termin von Montag bis Freitag ist.");
  const um = GP.um.toISOString();
  if (GP.aendern) { const g = hole("nachrichten", GP.aendern); if (g) await speichere("nachrichten", { ...g, geplant_um: um, zeit: um, wiederholung: GP.wdh }); }
  else {
    await wichtigkeitFragen(GP.uid);
    const n = await nachrichtBauen(GP.uid, GP.text, { zeit: um, geplant_um: um, wiederholung: GP.wdh, express: false });
    await speichere("nachrichten", n);
    eingabeZuruecksetzen(GP.uid);
  }
  blattZu();
  toast(`⏰ ${GP.aendern ? "Geändert" : "Geplant"}: ${gpWann(um)}${GP.wdh !== "einmal" ? " – danach " + gpWdhText(GP.wdh, um) : ""}`);
  zeichne(); window.scrollTo(0, document.body.scrollHeight);
};
AKTIONEN.gpMenue = (id) => {
  const g = hole("nachrichten", id); if (!g) return;
  const wdh = g.wiederholung && g.wiederholung !== "einmal";
  blatt("⏰ Geplante Nachricht", `<div class="gp-vorschau">${esc(g.text.length > 200 ? g.text.slice(0, 200) + " …" : g.text)}</div>
    <p class="hinweis">Wird gesendet: <b>${esc(gpWann(g.geplant_um))}</b>${wdh ? `<br>🔁 ${esc(gpWdhText(g.wiederholung, g.geplant_um))}` : ""}</p>
    <div class="na-knoepfe"><button class="knopf haupt" data-a="gpJetzt" data-x="${esc(id)}">📤 Jetzt senden${wdh ? " (einmal extra)" : ""}</button>
    <button class="knopf" data-a="gpAendern" data-x="${esc(id)}">🕐 Zeit ändern</button>
    <button class="knopf rot" data-a="gpLoeschen" data-x="${esc(id)}">🗑️ ${wdh ? "Löschen (Wiederholung beenden)" : "Löschen"}</button></div>`);
};
AKTIONEN.gpAendern = (id) => { const g = hole("nachrichten", id); if (!g) return; Object.assign(GP, { uid: g.unterhaltung_id, um: new Date(g.geplant_um), wdh: g.wiederholung || "einmal", eigene: true, aendern: id, text: g.text }); gpBlatt(); };
AKTIONEN.gpJetzt = async (id) => {
  const g = hole("nachrichten", id); if (!g) return; blattZu();
  const u = hole("unterhaltungen", g.unterhaltung_id);
  const n = { ...g, id: neueId(), zeit: jetztIso(), geplant_um: null, wiederholung: null, geplant_frei: null };
  await speichere("nachrichten", n);
  if (!g.wiederholung || g.wiederholung === "einmal") await speichere("nachrichten", { ...g, geloescht_am: jetztIso() });
  zeichne(); toast("📤 Gesendet"); await bescheid(n, u);
};
AKTIONEN.gpLoeschen = async (id) => {
  const g = hole("nachrichten", id); if (!g) return; blattZu();
  if (!(await frage(g.wiederholung && g.wiederholung !== "einmal" ? "🗑️ Geplante Nachricht löschen?\n\nSie wird dann nicht mehr wiederholt. Bereits gesendete bleiben im Chat." : "🗑️ Geplante Nachricht löschen?\n\nSie wird dann nicht gesendet."))) return;
  await speichere("nachrichten", { ...g, geloescht_am: jetztIso() }); zeichne(); toast("🗑️ Geplante Nachricht gelöscht");
};
// Vorführversion: fällige geplante Nachrichten selbst freigeben (im Echtbetrieb macht das der Server jede Minute – auch bei ausgeschaltetem Handy)
async function geplanteFreigebenDemo() {
  if (istEchtbetrieb()) return;
  const jetzt = jetztIso();
  for (const g of liste("nachrichten", (n) => n.geplant_um && !n.geplant_frei && n.geplant_um <= jetzt && !n.zurueckgezogen_am)) {
    await speichere("nachrichten", { ...g, geplant_frei: jetzt, zeit: g.geplant_um });
    const weiter = naechsteSendung(g.geplant_um, g.wiederholung);
    if (weiter) await speichere("nachrichten", { ...g, id: neueId(), geplant_um: weiter, zeit: weiter, geplant_frei: null, reaktionen: {}, rueckmeldungen: {} });
    if (g.von === ich()) await bescheid({ ...g, zeit: g.geplant_um }, hole("unterhaltungen", g.unterhaltung_id));
  }
}

// ---------- 🏎️ Express beim Empfänger (KC-CLUB-EXPRESS): Fenster beim Öffnen bzw. sofort – Öffnen · Später · Nein, Empfang bestätigen ----------
const EXP = { spaeter: {}, aktiv: null };
function expressOffen() {
  const ids = new Set(meineUnterhaltungen().map((u) => u.id)), grenze = Date.now() - 2 * 86400000;
  return liste("nachrichten", (n) => n.express && ids.has(n.unterhaltung_id) && n.von !== ich() && nachrichtFrei(n) && !n.zurueckgezogen_am && Date.parse(n.zeit) > grenze
    && !gelesenVonMir(n) && (!meinStatus(n)?.express_antwort || (meinStatus(n).express_antwort === "spaeter" && (EXP.spaeter[n.id] || 0) < Date.now())) && !(EXP.spaeter[n.id] > Date.now()))
    .sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)));
}
export function expressPruefen() {
  if (!S.ich || document.hidden || document.querySelector(".blatt-hg") || EXP.aktiv) return false;
  const l = expressOffen(); if (!l.length) return false;
  const n = l[0], u = hole("unterhaltungen", n.unterhaltung_id);
  if (S.view === "unterhaltung" && S.params.id === n.unterhaltung_id) return false; // steht schon offen vor einem
  EXP.aktiv = n.id;
  try { navigator.vibrate?.([120, 60, 120, 60, 240]); } catch {}
  const b = blatt("🏎️ EXPRESS-SENDUNG", `<p style="margin:0 0 2px">von <b>${esc(name(n.von))}</b>${u && u.art !== "einzel" ? ` · ${esc(chatTitel(u))}` : ""}</p>
    <p class="hinweis" style="margin:0 0 10px">${esc(tagTrenner(n.zeit))}, ${uhr(n.zeit)} Uhr${l.length > 1 ? ` · noch ${l.length - 1} weitere` : ""}</p>
    <div class="express-text">${textHtml(String(n.text).slice(0, 300))}</div>
    <label class="express-best"><input type="checkbox" id="expBest" checked><b>📬 Empfang bestätigen</b><small>${esc(vorn(n.von))} sieht dann, dass die Sendung angekommen ist</small></label>
    <div class="na-knoepfe"><button class="knopf haupt" data-a="expressAntwort" data-x="geoeffnet">📬 Öffnen</button>
    <button class="knopf" data-a="expressAntwort" data-x="spaeter">⏰ Später – in 30 Minuten nochmal</button>
    <button class="knopf" data-a="expressAntwort" data-x="nein">✖ Nein, jetzt nicht</button></div>`);
  b.classList.add("express-blatt");
  b.closest(".blatt-hg")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) EXP.aktiv = null; });
  b.querySelector('[data-a="blattZu"]')?.addEventListener("click", () => { EXP.aktiv = null; });
  speichere("nachricht_status", { ...(meinStatus(n) || {}), id: nsId(n.id, ich()), nachricht_id: n.id, person_id: ich(), zugestellt_am: meinStatus(n)?.zugestellt_am || jetztIso() }, { still: true }).catch(() => {});
  return true;
}
AKTIONEN.expressAntwort = async (antwort) => {
  const n = hole("nachrichten", EXP.aktiv); EXP.aktiv = null; if (!n) return blattZu();
  const best = !!document.getElementById("expBest")?.checked; blattZu();
  if (antwort === "spaeter") EXP.spaeter[n.id] = Date.now() + 30 * 60000;
  await speichere("nachricht_status", { ...(meinStatus(n) || {}), id: nsId(n.id, ich()), nachricht_id: n.id, person_id: ich(), zugestellt_am: meinStatus(n)?.zugestellt_am || jetztIso(), express_antwort: antwort, ...(best ? { express_bestaetigt_am: jetztIso() } : {}) });
  if (antwort === "geoeffnet") zeige("unterhaltung", { id: n.unterhaltung_id });
  else toast(antwort === "spaeter" ? `⏰ Erinnerung in 30 Minuten${best ? " · Empfang bestätigt" : ""}` : `Ok – die Nachricht wartet im Chat${best ? " · Empfang bestätigt" : ""}`);
  setTimeout(expressPruefen, 800);
};

// ---------- Ton bei neuer Nachricht (im offenen Chat), live nachzeichnen ----------
function ton() {
  if (einst().ton === false || einst().chatTon === false) return;
  try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.15, a.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.25); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.3); } catch {}
  try { navigator.vibrate?.(40); } catch {}
}
let gestartet = false, letzteZahl = null;
export function nachrichtenStart() {
  if (gestartet) return; gestartet = true;
  abonnieren((tabs) => {
    if (!S.ich || !(tabs || []).some((t) => ["nachrichten", "nachricht_status", "unterhaltungen"].includes(t))) return;
    angekommenMelden();
    if (S.view === "unterhaltung") {
      const id = S.params.id, n = chatNachrichten(id), letzte = n[n.length - 1];
      if (letzte && letzte.von !== ich() && letzte.id !== letzteZahl && !gelesenVonMir(letzte)) ton();
      letzteZahl = letzte?.id;
      if (document.getElementById("chatText") === document.activeElement) verlaufNeu(id); // beim Tippen nur den Verlauf auffrischen
      setTimeout(() => gelesenMarkieren(id), 400);
    }
    setTimeout(expressPruefen, 300);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { setTimeout(expressPruefen, 1200); if (S.view === "unterhaltung") gelesenMarkieren(S.params.id); } });
  setInterval(() => { geplanteFreigebenDemo().catch(() => {}); }, 30000);
  geplanteFreigebenDemo().then(angekommenMelden).catch(() => {});
}

// ---------- 📎 Anhang wählen: Foto/Video · Datei · Noten · Umfrage (wie KC anlageMenue) ----------
const datWahl = (art, accept, sym, t, mehr = false) => `<label class="knopf">${sym} ${t}<input type="file" accept="${accept}" data-c="anhangGewaehlt" data-x="${art}" ${mehr ? "multiple" : ""} hidden></label>`;
AKTIONEN.anhangMenue = () => {
  blatt("📎 Anhängen", `<div class="na-knoepfe">
    ${datWahl("bild", "image/*,video/*", "📷", "Foto oder Video", true)}
    ${datWahl("datei", ".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt,.csv,.zip,application/pdf", "📄", "Datei (PDF, Word, Excel …)", true)}
    <button class="knopf" data-a="notenWahl">🎼 Noten aus dem Notenarchiv</button>
    ${datWahl("noten", "application/pdf,image/*", "🎼", "Noten vom Gerät (PDF oder Foto)", true)}
    <button class="knopf" data-a="umfrageNeu">📊 Umfrage</button></div>
    <p class="hinweis">Je Datei höchstens 8 MB. Fotos werden vorher verkleinert. Die Empfänger sehen Anhänge nur, solange sie die Nachricht sehen dürfen.</p>`);
};
async function anhangDazu(datei, art) {
  if (C.anlagen.length >= CHAT.anlagenMax) return toast(`Höchstens ${CHAT.anlagenMax} Anhänge je Nachricht.`);
  const a = { tmp: neueId(), status: "laedt", name: datei.name || "Datei", art: art === "bild" ? artVonMime(datei.type) : art, mime: datei.type, groesse: datei.size };
  C.anlagen.push(a); eingabeNeu();
  try {
    const f = a.art === "bild" ? await bildVerkleinern(datei) : datei;
    Object.assign(a, await hochladen(f, { name: f.name || a.name, art: a.art }), { status: "fertig", art: a.art });
  } catch (e) { a.status = "fehler"; toast("⚠️ " + e.message, 4500); }
  if (S.view === "unterhaltung") eingabeNeu();
}
AKTIONEN.anhangGewaehlt = (_, el) => { const l = [...(el.files || [])], art = el.dataset.x; blattZu(); for (const f of l) anhangDazu(f, art); };
AKTIONEN.anhangWeg = (tmp) => { C.anlagen = C.anlagen.filter((a) => a.tmp !== tmp); eingabeNeu(); };
// 🎼 Noten aus dem Archiv: mit PDF als Datei, sonst als Hinweis „im Notenarchiv“
function meineStimmen() {
  if (istVerwalter()) return liste("stimmen");
  const regs = instrumenteVon(db, ich()).map((i) => i.register_id).filter(Boolean);
  return liste("stimmen", (s) => s.person_id === ich() || (!s.person_id && regs.includes(s.register_id)));
}
AKTIONEN.notenWahl = () => {
  const st = meineStimmen(), werke = [...new Set(st.map((s) => s.werk_id))].map((id) => hole("werke", id)).filter(Boolean).sort((a, b) => a.titel.localeCompare(b.titel, "de"));
  blatt("🎼 Noten anhängen", werke.map((w) => `<h4>${esc(w.titel)} <small class="hinweis">${esc(w.komponist)}</small></h4><div class="knopfreihe">${st.filter((s) => s.werk_id === w.id).map((s) => `<button class="knopf klein" data-a="notenAnhang" data-x="${esc(s.id)}">${s.datei?.startsWith("datei:") ? "📕" : "🎼"} ${esc(s.bezeichnung)}</button>`).join("")}</div>`).join("")
    + `<p class="hinweis">📕 = mit PDF (öffnet sich direkt) · 🎼 = Hinweis aufs Notenarchiv. ${istVerwalter() ? "PDFs hängst du im Notenarchiv an die Stimme." : ""}</p>` || '<div class="leer">Keine Noten gefunden.</div>');
};
AKTIONEN.notenAnhang = (sid) => {
  const s = hole("stimmen", sid), w = s && hole("werke", s.werk_id); if (!s) return; blattZu();
  const id = s.datei?.startsWith("datei:") ? s.datei.slice(6) : undefined;
  C.anlagen.push({ tmp: neueId(), status: "fertig", art: "noten", name: `${w?.titel || "Noten"} – ${s.bezeichnung}`, id, mime: id ? "application/pdf" : undefined, stimme_id: s.id, werk_id: s.werk_id });
  eingabeNeu();
};
// 📊 Umfrage (KC-CLUB-CHATUMFRAGE)
AKTIONEN.umfrageNeu = () => {
  blatt("📊 Umfrage", `<div id="ufForm"><div class="feld"><label>Frage</label><input id="ufFrage" maxlength="200" placeholder="z. B. Wer fährt mit zum Konzert nach Unna?"></div>
    <div id="ufOptionen">${[1, 2, 3].map((i) => `<div class="feld"><input class="uf-o" maxlength="80" placeholder="Antwort ${i}"></div>`).join("")}</div>
    <button class="knopf klein" data-a="umfrageOption">＋ Antwort</button>
    <label class="schalter"><span>Mehrere Antworten erlauben</span><input type="checkbox" id="ufMehr"></label>
    <button class="knopf haupt breit" data-a="umfrageSenden">📊 Umfrage senden</button></div>`);
};
AKTIONEN.umfrageOption = () => { const l = document.getElementById("ufOptionen"); if (l && l.children.length < 10) l.insertAdjacentHTML("beforeend", `<div class="feld"><input class="uf-o" maxlength="80" placeholder="Antwort ${l.children.length + 1}"></div>`); };
AKTIONEN.umfrageSenden = async () => {
  const frage = String(document.getElementById("ufFrage")?.value || "").trim(), optionen = [...document.querySelectorAll(".uf-o")].map((x) => x.value.trim()).filter(Boolean);
  if (!frage || optionen.length < 2) return toast("Bitte eine Frage und mindestens zwei Antworten eintragen.");
  const uid = S.params.id, u = hole("unterhaltungen", uid); blattZu();
  const n = await nachrichtBauen(uid, "", { umfrage: { frage, optionen, mehrfach: !!document.getElementById("ufMehr")?.checked }, anlagen: [] });
  await speichere("nachrichten", n); zeichne(); window.scrollTo(0, document.body.scrollHeight); await bescheid(n, u);
};
// ⏳ Selbstlöschen für die nächste Nachricht (KC-CLUB-SELBSTLOESCHEN)
AKTIONEN.ablaufWahl = () => blatt("⏳ Nachricht löscht sich selbst", `<p class="hinweis">Gilt für die nächste Nachricht – sie verschwindet danach bei allen (auch Anhänge).</p>
  <div class="na-knoepfe">${[[null, "Aus – bleibt stehen"], [1, "⏳ nach 1 Stunde"], [24, "⏳ nach 24 Stunden"], [168, "⏳ nach 7 Tagen"]].map(([h, t]) => `<button class="knopf${C.ablauf === h ? " haupt" : ""}" data-a="ablaufSetzen" data-x="${h ?? ""}">${t}</button>`).join("")}</div>`);
AKTIONEN.ablaufSetzen = (h) => { C.ablauf = h ? Number(h) : null; blattZu(); eingabeNeu(); };
// 🗣️ Diktieren: Sprache → Text ins Schreibfeld (Senden bleibt in deiner Hand)
AKTIONEN.diktieren = () => {
  if (C.diktat) { C.diktat(); C.diktat = null; return eingabeNeu(); }
  const t = document.getElementById("chatText"); if (!t) return;
  const basis = t.value ? t.value.replace(/\s*$/, " ") : "";
  C.diktat = zuhoeren({ weiter: true,
    zwischen: (x) => { const f = document.getElementById("chatText"); if (f) { f.value = basis + x; f.dispatchEvent(new Event("input", { bubbles: true })); } },
    fertig: () => { C.diktat = null; eingabeNeu(); },
    fehler: (f) => { C.diktat = null; eingabeNeu(); toast("🗣️ " + (SPRACHE_FEHLER[f] || SPRACHE_FEHLER.FEHLER), 4500); } });
  eingabeNeu();
};
// 🎙️ Sprachnachricht (KC-CLUB-SPRACHE): aufnehmen → senden oder verwerfen
let aufTakt = null;
AKTIONEN.aufnahmeStart = async () => {
  if (!aufnahmeMoeglich()) return toast("🎙️ Dieses Gerät kann hier keine Sprachnachricht aufnehmen.");
  try { C.aufnahme = await aufnahme({ beiEnde: () => AKTIONEN.aufnahmeSenden() }); }
  catch { return toast("🎙️ " + SPRACHE_FEHLER.KEIN_MIKROFON, 5000); }
  try { navigator.vibrate?.(30); } catch {}
  eingabeNeu();
  clearInterval(aufTakt); aufTakt = setInterval(() => { const z = document.getElementById("aufZeit"); if (z && C.aufnahme) z.textContent = dauerText(C.aufnahme.sekunden()); }, 500);
};
AKTIONEN.aufnahmeWeg = () => { clearInterval(aufTakt); C.aufnahme?.abbrechen(); C.aufnahme = null; eingabeNeu(); toast("🗑️ Verworfen"); };
AKTIONEN.aufnahmeSenden = async () => {
  clearInterval(aufTakt); const a = C.aufnahme; if (!a) return; C.aufnahme = null; eingabeNeu();
  const r = await a.stopp(); if (!r?.blob?.size) return toast("🎙️ Die Aufnahme war leer.");
  if (r.dauer < 1) return toast("🎙️ Zu kurz – bitte länger sprechen.");
  const uid = S.params.id, u = hole("unterhaltungen", uid);
  try {
    const ext = /mp4/.test(r.blob.type) ? "m4a" : /ogg/.test(r.blob.type) ? "ogg" : "webm";
    const up = await hochladen(r.blob, { name: `Sprachnachricht.${ext}`, art: "sprache" });
    const n = await nachrichtBauen(uid, "", { anlagen: [{ ...up, art: "sprache", dauer: r.dauer }] });
    papierflieger(document.querySelector('[data-a="chatSenden"]'), n.wichtig, n.id, n.express);
    await speichere("nachrichten", n); eingabeZuruecksetzen(uid); zeichne(); window.scrollTo(0, document.body.scrollHeight);
    await bescheid(n, u);
  } catch (e) { toast("⚠️ " + e.message, 4500); }
};

// ---------- Für die Sprachsteuerung ----------
export const chatPartner = () => partnerListe();
export async function chatMitText(pid, text, { express = false, wichtig = false } = {}) {
  const u = await einzelchatMit(pid);
  entwurfSetzen(u.id, text || ""); C.express = !!express; C.wichtig = !!wichtig;
  zeige("unterhaltung", { id: u.id });
  return u;
}
export function ungeleseneVorlesen() {
  if (!("speechSynthesis" in globalThis)) return 0;
  const ids = new Set(meineUnterhaltungen().map((u) => u.id));
  const l = liste("nachrichten", (n) => ids.has(n.unterhaltung_id) && n.von !== ich() && nachrichtFrei(n) && !nachrichtAbgelaufen(n) && !n.zurueckgezogen_am && !gelesenVonMir(n)).sort((a, b) => String(a.zeit).localeCompare(String(b.zeit))).slice(-8);
  speechSynthesis.cancel();
  const sag = (t) => { const s = new SpeechSynthesisUtterance(t); s.lang = "de-DE"; speechSynthesis.speak(s); };
  if (!l.length) sag("Du hast keine neuen Nachrichten.");
  else { sag(l.length === 1 ? "Eine neue Nachricht." : `${l.length} neue Nachrichten.`); for (const n of l) sag(`${name(n.von)}${n.express ? ", Express" : n.wichtig ? ", wichtig" : ""}: ${nachrichtKurz(n)}`); }
  return l.length;
}
