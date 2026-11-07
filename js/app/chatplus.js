// 💬 0.38.0 Nachrichten wie die KC Club App 2.882 (Wunsch Hansi „Club App checken und die Bachkreis-App anpassen, z. B. das Nachrichtenmodul“):
// ↪️ Weiterleiten (KC-CLUB-WEITERLEITEN) · 📌 Anheften (KC-CLUB-ANHEFTEN) · @Erwähnungen (KC-CLUB-ERWAEHNUNG) · 🔕 Stumm (KC-CLUB-STUMM)
// 🔍 Suche im Chat (KC-CLUB-CHATSUCHE) · ↩️ Zurückholen (KC-CLUB-ZURUECKHOLEN) · 👁 Wer hat noch nicht gelesen? (KC-CLUB-UNGELESEN-LEITUNG)
// 🔖 Merkliste (KC-CLUB-MERKEN) · 📦 Archiv & ⭐ Favoriten (KC-CLUB-CHAT-ARCHIV / -FAVORITEN) · ⋮ Chat-Menü (KC-CLUB-CHAT-KOPF)
// 👉 Wischen zum Antworten (KC-CLUB-WISCHEN) · ⬇️ Sprungknopf (KC-CLUB-NACH-UNTEN) · ❗ nachträglich wichtig · 📤 Anhang teilen (KC-CLUB-ANLAGE-TEILEN).
// Rechte erzwingt der Server (regeln.js): Weiterleiten nur Sichtbares, Zurückholen nur Ungelesenes, Anheften in Gruppen nur die Leitung,
// Chat-Einstellungen und Merkliste sieht nur die Person selbst – auch nicht die Leitung.
import { S, VIEWS, db, zeige, zeichne, kopf, name, istVerwalter } from "./zustand.js";
import { meineUnterhaltungen, gelesenVonMir } from "./start.js";
import { esc, AKTIONEN, toast, frage, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, istEchtbetrieb } from "../kern/daten.js";
import { ceId, cmId, STUMM_IMMER, ANGEHEFTET_MAX, nachrichtFrei, nachrichtAbgelaufen } from "../kern/schema.js";
import { empfaengerVon, nachrichtKurz } from "../kern/logik.js";
import { dateiUrl } from "../kern/dateien.js";
import { chatTitel, chatNachrichten, chatMitText, nachrichtDirekt, verlaufNeu } from "./nachrichten.js";

const ich = () => S.ich?.id;
const vorn = (p) => hole("personen", p)?.vorname || name(p);

// ---------- 🔕 📦 ⭐ Einstellungen je Chat (nur für mich) ----------
export const ceVon = (uid) => hole("chat_einstellungen", ceId(uid, ich())) || null;
export const stummAn = (uid) => { const b = ceVon(uid)?.stumm_bis; return !!b && Date.parse(b) > Date.now(); };
export const archiviert = (uid) => !!ceVon(uid)?.archiviert;
export const favorit = (uid) => !!ceVon(uid)?.favorit;
async function ceSetzen(uid, patch) {
  const alt = ceVon(uid) || { id: ceId(uid, ich()), unterhaltung_id: uid, person_id: ich(), stumm_bis: null, archiviert: false, favorit: false };
  await speichere("chat_einstellungen", { ...alt, ...patch });
}
const stummText = (uid) => { const b = ceVon(uid)?.stumm_bis; if (!b || Date.parse(b) <= Date.now()) return ""; return b.startsWith("2999") ? "immer" : `bis ${new Date(b).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}`; };

// ---------- ⋮ Chat-Menü im Kopf ----------
AKTIONEN.chatMenue = (uid) => {
  const u = hole("unterhaltungen", uid); if (!u) return;
  const st = stummText(uid), eigene = chatNachrichten(uid).filter((n) => n.von === ich() && !n.zurueckgezogen_am).length;
  blatt(`⋮ ${esc(chatTitel(u))}`, `<div class="bu-wahl">
    <button type="button" class="bu-wahl-k" data-a="chatSucheAuf" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">🔍</span><span class="mk-titel">Im Chat suchen</span><span class="mk-unter">Treffer markiert, vor und zurück</span></button>
    <button type="button" class="bu-wahl-k" data-a="stummWahl" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">${st ? "🔔" : "🔕"}</span><span class="mk-titel">${st ? "Ton wieder an" : "Stumm schalten"}</span><span class="mk-unter">${st ? `stumm ${esc(st)}` : "kein Push, keine Mail – ❗ und @dich kommen durch"}</span></button>
    <button type="button" class="bu-wahl-k" data-a="favoritUm" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">⭐</span><span class="mk-titel">${favorit(uid) ? "Kein Favorit mehr" : "Als Favorit oben halten"}</span><span class="mk-unter">nur für dich</span></button>
    <button type="button" class="bu-wahl-k" data-a="archivUm" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">📦</span><span class="mk-titel">${archiviert(uid) ? "Aus dem Archiv holen" : "Archivieren"}</span><span class="mk-unter">nur für dich ausblenden – Neues holt ihn zurück</span></button>
    <button type="button" class="bu-wahl-k" data-a="merklisteAuf" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">🔖</span><span class="mk-titel">Gemerkt in diesem Chat</span><span class="mk-unter">${merker(uid).length} Nachrichten</span></button>
    ${eigene ? `<button type="button" class="bu-wahl-k" data-a="ungelesenAuf" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">👁</span><span class="mk-titel">Wer hat noch nicht gelesen?</span><span class="mk-unter">deine Nachrichten hier</span></button>` : ""}
    <button type="button" class="bu-wahl-k" data-a="chatMitglieder" data-x="${esc(uid)}"><span class="mk-sym" aria-hidden="true">👥</span><span class="mk-titel">${u.art === "verteiler" ? "Empfänger" : "Mitglieder"}</span><span class="mk-unter">${empfaengerVon(db, u).length} Personen</span></button>
  </div>`);
};
AKTIONEN.stummWahl = (uid) => {
  if (stummAn(uid)) { ceSetzen(uid, { stumm_bis: null }).then(() => { blattZu(); toast("🔔 Ton wieder an"); zeichne(); }); return; }
  blatt("🔕 Stumm schalten – wie lange?", `<p class="hinweis">Du siehst alles weiter in der App, nur Push und E-Mail bleiben aus. ❗ Wichtiges, 🏎️ Express und Nachrichten, in denen du mit @ erwähnt wirst, kommen trotzdem.</p>
    <div class="knopfspalte">${[["8", "🌙 8 Stunden"], ["168", "📅 1 Woche"], ["immer", "🔕 Immer"]].map(([x, t]) => `<button type="button" class="knopf" data-a="stummSetzen" data-x="${esc(uid)}|${x}">${t}</button>`).join("")}</div>`);
};
AKTIONEN.stummSetzen = async (x) => {
  const [uid, h] = String(x).split("|"), bis = h === "immer" ? STUMM_IMMER : new Date(Date.now() + Number(h) * 3600000).toISOString();
  await ceSetzen(uid, { stumm_bis: bis }); blattZu(); toast(`🔕 Stumm ${h === "immer" ? "– bis du es wieder anschaltest" : h === "8" ? "für 8 Stunden" : "für 1 Woche"}`); zeichne();
};
AKTIONEN.favoritUm = async (uid) => { const an = !favorit(uid); await ceSetzen(uid, { favorit: an, archiviert: an ? false : archiviert(uid) }); blattZu(); toast(an ? "⭐ Steht jetzt oben" : "⭐ Kein Favorit mehr"); zeichne(); };
AKTIONEN.archivUm = async (uid) => {
  const an = !archiviert(uid); await ceSetzen(uid, { archiviert: an, favorit: an ? false : favorit(uid) }); blattZu();
  toast(an ? "📦 Archiviert – unten unter „📦 Archiviert“; neue Nachrichten holen den Chat zurück" : "📦 Wieder in der Liste");
  if (an && S.view === "unterhaltung") zeige("nachrichten"); else zeichne();
};
// Neue Nachricht holt einen archivierten Chat zurück (wie KC/WhatsApp)
export function archivAufwachen(uid, letzteZeit) {
  const c = ceVon(uid); if (!c?.archiviert || !letzteZeit) return false;
  return Date.parse(letzteZeit) > Date.parse(c.geaendert_am || c.erstellt_am || 0);
}

// ---------- 🔍 Suche im offenen Chat ----------
const SU = { uid: null, q: "", treffer: [], i: 0 };
AKTIONEN.chatSucheAuf = (uid) => { blattZu(); SU.uid = uid; SU.q = ""; SU.treffer = []; SU.i = 0; sucheLeiste(); };
function sucheLeiste() {
  document.getElementById("chatSucheLeiste")?.remove();
  const k = document.querySelector(".chat-kopf"); if (!k) return;
  const d = document.createElement("div"); d.id = "chatSucheLeiste"; d.className = "chat-suche-leiste";
  d.innerHTML = `<input type="search" id="chatSucheFeld" placeholder="🔍 In diesem Chat suchen …" aria-label="In diesem Chat suchen" value="${esc(SU.q)}"><span id="chatSucheZahl" class="hinweis" aria-live="polite"></span>
    <button type="button" class="knopf klein" data-a="chatSucheSprung" data-x="-1" aria-label="Vorheriger Treffer">▲</button><button type="button" class="knopf klein" data-a="chatSucheSprung" data-x="1" aria-label="Nächster Treffer">▼</button><button type="button" class="knopf klein" data-a="chatSucheZu" aria-label="Suche schließen">✕</button>`;
  k.after(d); const f = d.querySelector("input"); f.focus();
  f.addEventListener("input", () => { SU.q = f.value; sucheJetzt(); });
}
function sucheJetzt() {
  document.querySelectorAll(".blase.treffer, .blase.treffer-an").forEach((b) => b.classList.remove("treffer", "treffer-an"));
  const q = SU.q.trim().toLowerCase(), z = document.getElementById("chatSucheZahl");
  if (q.length < 2) { SU.treffer = []; if (z) z.textContent = ""; return; }
  // eingeklappte Tage aufklappen, damit Treffer sichtbar sind
  SU.treffer = chatNachrichten(SU.uid).filter((n) => !n.zurueckgezogen_am && `${n.text || ""} ${(n.anlagen || []).map((a) => a.name).join(" ")}`.toLowerCase().includes(q)).map((n) => n.id);
  SU.i = SU.treffer.length - 1;
  if (z) z.textContent = SU.treffer.length ? `${SU.treffer.length} Treffer` : "nichts gefunden";
  if (SU.treffer.length) springe();
}
function springe() {
  const id = SU.treffer[SU.i]; if (!id) return;
  AKTIONEN.zuNachricht(id);
  document.querySelectorAll(".blase.treffer-an").forEach((b) => b.classList.remove("treffer-an"));
  for (const t of SU.treffer) document.getElementById("msg-" + t)?.classList.add("treffer");
  document.getElementById("msg-" + id)?.classList.add("treffer-an");
  const z = document.getElementById("chatSucheZahl"); if (z) z.textContent = `${SU.i + 1} / ${SU.treffer.length}`;
}
AKTIONEN.chatSucheSprung = (r) => { if (!SU.treffer.length) return; SU.i = (SU.i + Number(r) + SU.treffer.length) % SU.treffer.length; springe(); };
AKTIONEN.chatSucheZu = () => { document.getElementById("chatSucheLeiste")?.remove(); document.querySelectorAll(".blase.treffer, .blase.treffer-an").forEach((b) => b.classList.remove("treffer", "treffer-an")); SU.q = ""; };

// ---------- 📌 Anheften ----------
export const darfAnheften = (u) => !!u && (["einzel", "runde"].includes(u.art) || istVerwalter());
export function angeheftetHtml(u) {
  const ids = (u?.angeheftet || []).filter((id) => { const n = hole("nachrichten", id); return n && !n.zurueckgezogen_am && !n.geloescht_am; });
  if (!ids.length) return "";
  return `<div class="chat-angeheftet" role="region" aria-label="Angeheftete Nachrichten">${ids.map((id) => { const n = hole("nachrichten", id);
    return `<button type="button" class="chat-pin" data-a="zuNachricht" data-x="${esc(id)}"><span aria-hidden="true">📌</span><b>${esc(n.von === ich() ? "Du" : vorn(n.von))}:</b> <span>${esc(nachrichtKurz(n).slice(0, 80))}</span></button>`; }).join("")}</div>`;
}
AKTIONEN.naAnheften = async (id) => {
  const n = hole("nachrichten", id), u = n && hole("unterhaltungen", n.unterhaltung_id); if (!u) return; blattZu();
  const l = [...(u.angeheftet || [])], weg = l.includes(id);
  if (!weg && l.length >= ANGEHEFTET_MAX) l.shift();
  await speichere("unterhaltungen", { ...u, angeheftet: weg ? l.filter((x) => x !== id) : [...l, id] });
  toast(weg ? "📌 Gelöst" : `📌 Angeheftet – steht oben im Chat (höchstens ${ANGEHEFTET_MAX})`); zeichne();
};

// ---------- 🔖 Merkliste ----------
const merker = (uid) => liste("chat_merker", (m) => m.person_id === ich() && m.aktiv !== false).map((m) => ({ m, n: hole("nachrichten", m.nachricht_id) })).filter((x) => x.n && !x.n.zurueckgezogen_am && (!uid || x.n.unterhaltung_id === uid));
export const gemerkt = (nid) => hole("chat_merker", cmId(nid, ich()))?.aktiv === true;
AKTIONEN.naMerken = async (id) => {
  blattZu(); const an = !gemerkt(id);
  await speichere("chat_merker", { ...(hole("chat_merker", cmId(id, ich())) || {}), id: cmId(id, ich()), nachricht_id: id, person_id: ich(), aktiv: an, am: new Date().toISOString() });
  toast(an ? "🔖 Gemerkt – unter 💬 Nachrichten › 🔖" : "🔖 Nicht mehr gemerkt");
  const n = hole("nachrichten", id); if (n) verlaufNeu(n.unterhaltung_id, true);
};
AKTIONEN.merklisteAuf = (uid) => { blattZu(); zeige("merkliste", uid ? { uid } : {}); };
VIEWS.merkliste = {
  render({ uid } = {}) {
    const l = merker(uid).sort((a, b) => String(b.m.am).localeCompare(String(a.m.am)));
    return kopf(uid ? `🔖 Gemerkt · ${chatTitel(hole("unterhaltungen", uid))}` : "🔖 Gemerkte Nachrichten") + `<p class="hinweis">Deine Lesezeichen – nur du siehst sie. Antippen springt zur Nachricht.</p>
      <div class="karte"><ul class="liste">${l.map(({ n }) => `<li class="klick" data-a="springZu" data-x="${esc(n.id)}"><span aria-hidden="true">🔖</span><div class="fl"><div class="zeile-titel">${esc(nachrichtKurz(n).slice(0, 120))}</div>
        <div class="zeile-unter">${esc(n.von === ich() ? "Du" : name(n.von))} · ${esc(chatTitel(hole("unterhaltungen", n.unterhaltung_id)))} · ${esc(new Date(n.zeit).toLocaleDateString("de-DE"))}</div></div><span aria-hidden="true">›</span></li>`).join("") || '<li class="leer">Noch nichts gemerkt – in einem Chat eine Nachricht antippen › 🔖 Merken.</li>'}</ul></div>`;
  },
};
// aus Listen zur Nachricht im Chat springen
AKTIONEN.springZu = (id) => { const n = hole("nachrichten", id); if (!n) return; zeige("unterhaltung", { id: n.unterhaltung_id }); setTimeout(() => AKTIONEN.zuNachricht(id), 250); };

// ---------- ↪️ Weiterleiten ----------
AKTIONEN.naWeiterleiten = (id) => {
  const n = hole("nachrichten", id); if (!n) return;
  const ziele = meineUnterhaltungen().filter((u) => u.id !== n.unterhaltung_id && (u.art !== "verteiler" || istVerwalter())).sort((a, b) => chatTitel(a).localeCompare(chatTitel(b), "de"));
  blatt("↪️ Weiterleiten an …", `<div class="na-vorschau">${esc(nachrichtKurz(n).slice(0, 160))}</div><p class="hinweis">Die Nachricht geht mit dem Vermerk „↪️ Weitergeleitet von ${esc(name(n.von))}“ raus – Anhänge kommen mit.</p>
    <div class="bu-telliste">${ziele.map((u) => `<button type="button" class="bu-telzeile" data-a="weiterAn" data-x="${esc(id)}|${esc(u.id)}"><b>${esc(chatTitel(u))}</b><small>${u.art === "einzel" ? "Einzelchat" : u.art === "verteiler" ? "Rundschreiben" : u.art === "runde" ? "Runde" : "Gruppe"}</small><span aria-hidden="true">↪️</span></button>`).join("") || '<p class="hinweis">Kein anderer Chat da.</p>'}</div>`);
};
AKTIONEN.weiterAn = async (x) => {
  const [id, uid] = String(x).split("|"), n = hole("nachrichten", id); if (!n) return;
  blattZu();
  try {
    await nachrichtDirekt(uid, n.text || "", { weiter_von: n.id, weitergeleitet_von: n.weitergeleitet_von || name(n.von),
      anlagen: (n.anlagen || []).map(({ id: aid, name: an, mime, groesse, art, dauer, stimme_id, werk_id }) => ({ id: aid, name: an, mime, groesse, art, dauer, stimme_id, werk_id })) });
    toast(`↪️ Weitergeleitet an „${chatTitel(hole("unterhaltungen", uid))}“`);
  } catch (e) { toast("⚠️ " + e.message); }
};

// ---------- ↩️ Zurückholen · ❗ nachträglich wichtig · 📤 Anhang teilen ----------
export const zurueckholbar = (n) => n.von === ich() && !n.zurueckgezogen_am && Date.now() - Date.parse(n.zeit) < 24 * 3600000
  && !(n.gelesen_von || []).some((p) => p !== ich()) && !liste("nachricht_status", (s) => s.nachricht_id === n.id && s.gelesen_am && s.person_id !== ich()).length;
AKTIONEN.naZurueckholen = async (id) => {
  const n = hole("nachrichten", id); if (!n) return; blattZu();
  if (!zurueckholbar(n)) return toast("Geht nicht mehr – jemand hat sie schon gelesen.");
  if (!(await frage("Nachricht zurückholen?\n\nSie verschwindet bei allen (noch hat sie niemand gelesen). Der Text kommt zurück ins Eingabefeld."))) return;
  try {
    await speichere("nachrichten", { ...n, zurueckholen: true, geloescht_am: istEchtbetrieb() ? undefined : new Date().toISOString() });
    toast("↩️ Zurückgeholt – du kannst sie neu schreiben");
    await chatMitTextIn(n.unterhaltung_id, n.text || "");
  } catch (e) { toast(/SCHON_GELESEN/.test(e.message) ? "Zu spät – jemand hat sie gerade gelesen." : "⚠️ " + e.message); }
};
async function chatMitTextIn(uid, text) {
  const u = hole("unterhaltungen", uid), p = u?.art === "einzel" ? (u.mitglieder || []).find((m) => m !== ich()) : null;
  if (p) return chatMitText(p, text);
  try { const e = JSON.parse(localStorage.getItem("bk_entwuerfe") || "{}"); e[uid] = text; localStorage.setItem("bk_entwuerfe", JSON.stringify(e)); } catch {}
  zeige("unterhaltung", { id: uid });
}
AKTIONEN.naWichtig = async (id) => {
  const n = hole("nachrichten", id); if (!n) return; blattZu();
  await speichere("nachrichten", { ...n, wichtig: !n.wichtig }); toast(n.wichtig ? "Nicht mehr als wichtig markiert" : "❗ Jetzt als WICHTIG markiert (ohne neue Benachrichtigung)"); verlaufNeu(n.unterhaltung_id, true);
};
AKTIONEN.anhangTeilen = async (x) => {
  const [id, i] = String(x).split("|"), a = hole("nachrichten", id)?.anlagen?.[Number(i)]; if (!a?.id) return;
  try {
    const url = await dateiUrl(a.id), blob = await (await fetch(url)).blob(), datei = new File([blob], a.name || "Datei", { type: a.mime || blob.type });
    if (navigator.canShare?.({ files: [datei] })) await navigator.share({ files: [datei], title: a.name });
    else toast("Teilen geht auf diesem Gerät nicht – „öffnen / speichern“ benutzen.");
  } catch (e) { if (e?.name !== "AbortError") toast("⚠️ Teilen ging nicht"); }
};

// ---------- 👁 Wer hat noch nicht gelesen? (eigene Nachrichten) ----------
const UG = { tage: 7 };
AKTIONEN.ungelesenAuf = (uid) => { blattZu(); zeige("ungelesen", uid ? { uid } : {}); };
AKTIONEN.ungelesenTage = (t) => { UG.tage = Number(t) || 7; zeichne(); };
export function ungeleseneEmpfaenger(n, alle = []) {
  const gel = new Set([...(n.gelesen_von || []), ...liste("nachricht_status", (s) => s.nachricht_id === n.id && s.gelesen_am).map((s) => s.person_id)]);
  return alle.filter((p) => p !== n.von && !gel.has(p));
}
VIEWS.ungelesen = {
  render({ uid } = {}) {
    const seit = Date.now() - UG.tage * 86400000;
    const meine = liste("nachrichten", (n) => n.von === ich() && (!uid || n.unterhaltung_id === uid) && nachrichtFrei(n) && !nachrichtAbgelaufen(n) && !n.zurueckgezogen_am && Date.parse(n.zeit) > seit)
      .sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
    const zeilen = meine.map((n) => { const u = hole("unterhaltungen", n.unterhaltung_id); return { n, u, offen: u ? ungeleseneEmpfaenger(n, empfaengerVon(db, u)) : [] }; }).filter((x) => x.offen.length);
    return kopf("👁 Wer hat noch nicht gelesen?") + `<p class="hinweis">Deine Nachrichten${uid ? ` in „${esc(chatTitel(hole("unterhaltungen", uid)))}“` : ""}, die noch nicht alle gelesen haben. Wer keine Lesebestätigung schickt, steht hier auch.</p>
      <div class="umschalter klein" role="group" aria-label="Zeitraum">${[7, 14, 30].map((t) => `<button type="button" class="${UG.tage === t ? "an" : ""}" data-a="ungelesenTage" data-x="${t}" aria-pressed="${UG.tage === t}">${t} Tage</button>`).join("")}</div>
      ${zeilen.map(({ n, u, offen }) => `<div class="karte"><button type="button" class="ug-kopf" data-a="springZu" data-x="${esc(n.id)}"><b>${esc(chatTitel(u))}</b> · ${esc(new Date(n.zeit).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }))}<span>${esc(nachrichtKurz(n).slice(0, 90))}</span></button>
        <p class="hinweis">${offen.length} noch nicht gelesen:</p><ul class="liste">${offen.slice(0, 40).map((p) => `<li><div class="fl">${esc(name(p))}</div>${hole("personen", p)?.typ === "schueler" ? "" : `<button type="button" class="knopf klein" data-a="ugErinnern" data-x="${esc(n.id)}|${esc(p)}">💬 Erinnern</button>`}</li>`).join("")}${offen.length > 40 ? `<li class="hinweis">… und ${offen.length - 40} weitere</li>` : ""}</ul></div>`).join("") || '<div class="leer">👍 Alles gelesen.</div>'}`;
  },
};
AKTIONEN.ugErinnern = (x) => {
  const [id, p] = String(x).split("|"), n = hole("nachrichten", id), u = n && hole("unterhaltungen", n.unterhaltung_id); if (!n) return;
  chatMitText(p, `Hallo ${vorn(p)}, hast du meine Nachricht vom ${new Date(n.zeit).toLocaleDateString("de-DE")} in „${chatTitel(u)}“ schon gesehen? „${nachrichtKurz(n).slice(0, 80)}“`);
};

// ---------- @Erwähnungen: Vorschläge beim Tippen, Hervorhebung in der Blase ----------
export function erwaehnungVorschlag(textarea, uid) {
  const v = textarea.value.slice(0, textarea.selectionStart), m = v.match(/(?:^|\s)@([\p{L}-]{0,20})$/u);
  document.getElementById("erwVorschlag")?.remove();
  if (!m) return;
  const u = hole("unterhaltungen", uid), q = m[1].toLowerCase();
  const l = empfaengerVon(db, u).filter((p) => p !== ich()).map((p) => hole("personen", p)).filter((p) => p && `${p.vorname} ${p.nachname}`.toLowerCase().includes(q)).slice(0, 6);
  if (!l.length) return;
  const d = document.createElement("div"); d.id = "erwVorschlag"; d.className = "erw-vorschlag"; d.setAttribute("role", "listbox"); d.setAttribute("aria-label", "Person erwähnen");
  d.innerHTML = l.map((p) => `<button type="button" role="option" data-p="${esc(p.id)}">@${esc(p.vorname)} ${esc(p.nachname)}</button>`).join("");
  d.addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; e.stopPropagation(); const p = hole("personen", b.dataset.p);
    const vor = v.slice(0, v.length - m[1].length - 1), rest = textarea.value.slice(textarea.selectionStart), ein = `@${p.vorname} ${p.nachname} `;
    textarea.value = vor + ein + rest; textarea.focus(); const pos = (vor + ein).length; textarea.setSelectionRange(pos, pos); textarea.dispatchEvent(new Event("input")); d.remove(); });
  textarea.closest(".chat-eingabe")?.prepend(d);
}
export function erwaehnungenMarkieren(html, n) {
  let h = html;
  for (const id of n.erwaehnt || []) { const p = hole("personen", id); if (!p) continue;
    for (const t of [`@${p.vorname} ${p.nachname}`, `@${p.vorname}`]) { const e = esc(t); if (h.includes(e)) { h = h.split(e).join(`<mark class="erw${id === ich() ? " ich" : ""}">${e}</mark>`); break; } } }
  return h;
}

// ---------- 👉 Wischen zum Antworten · ⬇️ nach unten ----------
export function chatGestenVerdrahten(uid) {
  const v = document.getElementById("chatVerlauf"); if (!v || v.dataset.gesten) return; v.dataset.gesten = "1";
  let st = null;
  v.addEventListener("touchstart", (e) => { const b = e.target.closest(".blase"); if (!b || e.touches.length !== 1) return; st = { b, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 }; }, { passive: true });
  v.addEventListener("touchmove", (e) => { if (!st) return; const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y; if (Math.abs(dy) > Math.abs(dx)) { st.b.style.transform = ""; st = null; return; } st.dx = Math.max(0, Math.min(90, dx)); st.b.style.transform = `translateX(${st.dx}px)`; }, { passive: true });
  v.addEventListener("touchend", () => { if (!st) return; const { b, dx } = st; b.style.transform = ""; st = null; if (dx > 60) { const id = b.id.replace(/^msg-/, ""); AKTIONEN.naAntworten(id); navigator.vibrate?.(15); } });
  // ⬇️ erscheint, wenn man weit hochgescrollt hat (mit Punkt bei Neuem)
  let k = document.getElementById("chatRunter");
  if (!k) { k = document.createElement("button"); k.id = "chatRunter"; k.type = "button"; k.className = "chat-runter"; k.setAttribute("aria-label", "Ganz nach unten"); k.textContent = "⬇️"; k.hidden = true;
    k.addEventListener("click", () => { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); k.classList.remove("neu"); }); document.body.appendChild(k); }
  const pruefen = () => { if (S.view !== "unterhaltung") { k.hidden = true; return; } k.hidden = document.body.scrollHeight - (innerHeight + scrollY) < 700; if (k.hidden) k.classList.remove("neu"); };
  window.removeEventListener("scroll", chatGestenVerdrahten.pruefen || (() => {})); chatGestenVerdrahten.pruefen = pruefen;
  window.addEventListener("scroll", pruefen, { passive: true }); pruefen();
}
export const runterNeu = () => { const k = document.getElementById("chatRunter"); if (k && !k.hidden) k.classList.add("neu"); };
export const ungelesenZahl = (uid) => chatNachrichten(uid).filter((n) => n.von !== ich() && !gelesenVonMir(n)).length;
