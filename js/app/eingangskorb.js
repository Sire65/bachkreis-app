// 📥 Eingangskorb (0.53.0, wie KC-CLUB-EINGANGSKORB / KC-CLUB-TEILEN-AN-SICH-SELBST): für jede/n ein privater Korb.
// Hinein kommt: was man am Handy über „Teilen“ an die Bachkreis-App schickt (PDF, Foto, Text, Link), was man aus der Druckvorschau ablegt,
// eigene Notizen – und was die Leitung einem hineinlegt. Von dort: ansehen, in einen Chat schicken, löschen.
import { S, VIEWS, zeige, zeichne, kopf, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere } from "../kern/daten.js";
import { EK_QUELLEN } from "../kern/schema.js";
import { dateiOeffnen, groesseText } from "../kern/dateien.js";
import { inKorb, chatWahl } from "./druckvorschau.js";

const meineIds = () => new Set([S.ich?.id, ...liste("eltern_kind", (e) => e.eltern_id === S.ich?.id).map((e) => e.kind_id)]);
export const korbListe = () => liste("eingangskorb", (k) => meineIds().has(k.person_id)).sort((a, b) => String(b.erstellt_am || b.geaendert_am || "").localeCompare(String(a.erstellt_am || a.geaendert_am || "")));
export const korbNeu = () => korbListe().filter((k) => !k.gelesen_am).length;
const sym = (k) => (!k.datei ? "📝" : /pdf/.test(k.mime || "") ? "📕" : /^image/.test(k.mime || "") ? "🖼️" : /^audio/.test(k.mime || "") ? "🎵" : "📄");
const zeit = (k) => { const t = k.erstellt_am || k.geaendert_am; return t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : ""; };

VIEWS.eingangskorb = {
  render() {
    const l = korbListe(), ich = S.ich?.id;
    return kopf("📥 Eingangskorb") + `<p class="hinweis">Dein privater Korb: Was du am Handy über <b>Teilen → Bachkreis</b> schickst, was du aus einer Druckvorschau ablegst – und was dir die Leitung hineinlegt.</p>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="ekNotiz">📝 Notiz</button><label class="knopf">📎 Datei hineinlegen<input type="file" data-c="ekDatei" accept="application/pdf,image/*,audio/*,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt" hidden></label></div>
      <div class="karte"><ul class="liste ek-liste">${l.map((k) => `<li class="${k.gelesen_am ? "" : "ek-neu"}"><span class="ek-sym" aria-hidden="true">${sym(k)}</span>
        <div class="fl"><b>${esc(k.titel)}</b><div class="zeile-unter">${esc(EK_QUELLEN[k.quelle] || "")}${k.von && k.von !== ich ? ` · von ${esc(name(k.von))}` : ""}${k.person_id !== ich ? ` · für ${esc(name(k.person_id))}` : ""} · ${esc(zeit(k))}${k.groesse ? ` · ${esc(groesseText(k.groesse))}` : ""}</div></div>
        <span class="ek-knoepfe"><button type="button" class="knopf klein haupt" data-a="ekOeffnen" data-x="${esc(k.id)}" aria-label="${esc(k.titel)} öffnen">👁️</button><button type="button" class="knopf klein" data-a="ekChat" data-x="${esc(k.id)}" aria-label="${esc(k.titel)} in einen Chat">💬</button><button type="button" class="knopf klein" data-a="ekWeg" data-x="${esc(k.id)}" aria-label="${esc(k.titel)} löschen">🗑️</button></span></li>`).join("") || "<li>Der Korb ist leer.</li>"}</ul></div>`;
  },
};
AKTIONEN.ekOeffnen = async (id) => {
  const k = hole("eingangskorb", id); if (!k) return;
  if (!k.gelesen_am) speichere("eingangskorb", { ...k, gelesen_am: new Date().toISOString() }, { still: true }).then(() => zeichne()).catch(() => {});
  if (k.datei) return dateiOeffnen(k.datei.replace(/^datei:/, ""), k.name || k.titel, k.mime || "");
  blatt(`📝 ${k.titel}`, `<div class="ek-text">${esc(k.text).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')}</div><button type="button" class="knopf" data-a="ekKopieren" data-x="${esc(k.id)}">📋 Kopieren</button>`);
};
AKTIONEN.ekKopieren = async (id) => { try { await navigator.clipboard.writeText(hole("eingangskorb", id)?.text || ""); toast("📋 Kopiert"); } catch { toast("Kopieren ging nicht"); } };
AKTIONEN.ekWeg = async (id) => { const k = hole("eingangskorb", id); if (!k) return; await speichere("eingangskorb", { ...k, geloescht_am: new Date().toISOString() }); toast("🗑️ Gelöscht"); zeichne(); };
AKTIONEN.ekChat = (id) => chatWahl("ekChatSenden", id);
AKTIONEN.ekChatSenden = async (x) => {
  const [uid, id] = String(x).split("|"), k = hole("eingangskorb", id); if (!k) return; blattZu();
  const n = await import("./nachrichten.js");
  const anlagen = k.datei ? [{ id: k.datei.replace(/^datei:/, ""), name: k.name || k.titel, mime: k.mime, groesse: k.groesse, art: /^image/.test(k.mime || "") ? "bild" : "datei" }] : [];
  try { await n.nachrichtDirekt(uid, k.datei ? "" : k.text, { anlagen }); toast("💬 Gesendet"); zeige("unterhaltung", { id: uid }); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.ekNotiz = () => blatt("📝 Notiz in den Eingangskorb", `<div class="feld"><label for="ekTitel">Titel</label><input id="ekTitel" maxlength="120"></div><div class="feld"><label for="ekText">Text</label><textarea id="ekText" rows="5"></textarea></div><button type="button" class="knopf haupt" data-a="ekNotizSpeichern">📥 Hineinlegen</button>`);
AKTIONEN.ekNotizSpeichern = async () => {
  const t = document.getElementById("ekTitel")?.value.trim(), x = document.getElementById("ekText")?.value.trim(); if (!x) return toast("Bitte etwas schreiben");
  await inKorb(null, { titel: t || x.slice(0, 40), text: x, quelle: "notiz" }); blattZu(); toast("📥 Abgelegt"); zeichne();
};
AKTIONEN.ekDatei = async (_, el) => { const f = el.files?.[0]; if (!f) return; try { await inKorb(f, { titel: f.name, quelle: "teilen" }); toast("📥 Abgelegt"); zeichne(); } catch (e) { toast("⚠️ " + e.message, 4000); } el.value = ""; };

// ---------- 📲 Teilen-Ziel: „Teilen → Bachkreis“ am Handy (manifest share_target, sw.js legt das Geteilte kurz beiseite) ----------
const T = { daten: null, dateien: [] };
export async function teilenPruefen() {
  if (typeof caches === "undefined" || !/[?&]teilen=1/.test(location.search)) return;
  history.replaceState(null, "", location.pathname + location.hash);
  try {
    const c = await caches.open("bk-teilen"), m = await c.match("teilen-daten"); if (!m) return toast("📲 Es ist nichts angekommen – bitte nochmal teilen.");
    T.daten = await m.json(); T.dateien = [];
    for (const [i, d] of (T.daten.dateien || []).entries()) { const r = await c.match(`teilen-datei-${i}`); if (r) T.dateien.push(new File([await r.blob()], d.name || `Datei-${i + 1}`, { type: d.type || "application/octet-stream" })); }
    await caches.delete("bk-teilen");
  } catch { return toast("📲 Das Geteilte konnte nicht gelesen werden."); }
  if (!S.ich) return toast("Bitte erst anmelden – dann nochmal teilen.");
  const text = [T.daten.titel, T.daten.text, T.daten.url].filter(Boolean).join("\n");
  blatt("📲 Mit der Bachkreis-App geteilt", `${T.dateien.length ? `<ul class="liste">${T.dateien.map((f) => `<li>${/pdf/.test(f.type) ? "📕" : /^image/.test(f.type) ? "🖼️" : "📄"} ${esc(f.name)} <small>${esc(groesseText(f.size))}</small></li>`).join("")}</ul>` : ""}
    ${text ? `<div class="ek-text">${esc(text).replace(/\n/g, "<br>")}</div>` : ""}<p>Wohin damit?</p>
    <div class="knopfspalte"><button type="button" class="knopf haupt" data-a="teilenKorb">📥 In meinen Eingangskorb</button><button type="button" class="knopf" data-a="teilenChat">💬 In einen Chat</button><button type="button" class="knopf" data-a="blattZu">Verwerfen</button></div>`);
}
AKTIONEN.teilenKorb = async () => {
  const text = [T.daten?.text, T.daten?.url].filter(Boolean).join("\n"), titel = T.daten?.titel || "";
  try {
    for (const f of T.dateien) await inKorb(f, { titel: titel || f.name, quelle: "teilen", text });
    if (!T.dateien.length && text) await inKorb(null, { titel: titel || text.slice(0, 40), text, quelle: "teilen" });
    blattZu(); toast("📥 Im Eingangskorb"); zeige("eingangskorb");
  } catch (e) { toast("⚠️ " + e.message, 5000); }
};
AKTIONEN.teilenChat = () => chatWahl("teilenChatSenden");
AKTIONEN.teilenChatSenden = async (uid) => {
  blattZu();
  try {
    const { hochladen } = await import("../kern/dateien.js"), n = await import("./nachrichten.js"), anlagen = [];
    for (const f of T.dateien) { const a = await hochladen(f, { name: f.name }); anlagen.push({ id: a.id, name: a.name, mime: a.mime, groesse: a.groesse, art: a.art }); }
    await n.nachrichtDirekt(uid, [T.daten?.text, T.daten?.url].filter(Boolean).join("\n"), { anlagen }); toast("💬 Gesendet"); zeige("unterhaltung", { id: uid });
  } catch (e) { toast("⚠️ " + e.message, 5000); }
};
