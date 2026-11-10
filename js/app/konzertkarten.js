// 🎟️ Konzertkarten – Abendkasse (0.56.0): Leitung/Vorstand schalten für ein Konzert die Online-Reservierung ein (Plätze, Höchstzahl je
// Reservierung, Hinweis), teilen den Karten-Link (karten.html#k=…), sehen die Reservierungen und haken an der Abendkasse ab.
// Reservierung von Hand (Telefon, Kasse), Liste drucken/PDF. Besucherdaten löscht der Server 30 Tage nach dem Konzert.
import { VIEWS, zeichne, kopf, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { KARTEN_ROLLEN, KARTEN_STATUS, KARTEN_JE_STANDARD } from "../kern/schema.js";

const darf = () => hatRolle(...KARTEN_ROLLEN), einstellen = () => hatRolle("admin", "leitung"); // Termine ändern nur Planer
const wann = (iso) => new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const istKonzert = (t) => t.karten_aktiv || /konzert|auftritt|vorspiel/i.test(hole("terminarten", t.art_id)?.name || "");
const kartenLink = (t) => new URL(`karten.html#k=${t.karten_token}`, location.href).href;
const token = () => { const b = crypto.getRandomValues(new Uint8Array(15)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export function kartenStand(tid) {
  const l = liste("kartenreservierungen", (r) => r.termin_id === tid), gueltig = l.filter((r) => r.status !== "storniert");
  const t = hole("termine", tid), sum = (a) => a.reduce((s, r) => s + (Number(r.anzahl) || 0), 0);
  return { liste: l, reserviert: sum(gueltig), abgeholt: sum(gueltig.filter((r) => r.status === "abgeholt")), frei: t?.karten_plaetze == null ? null : Math.max(0, t.karten_plaetze - sum(gueltig)) };
}
let offen = null, suche = "";

VIEWS.konzertkarten = {
  render() {
    if (!darf()) return kopf("🎟️ Konzertkarten") + `<div class="karte"><p>Die Konzertkarten verwalten Leitung und Vorstand.</p></div>`;
    const grenze = new Date(Date.now() - 30 * 86400000).toISOString();
    const konzerte = liste("termine", (t) => istKonzert(t) && t.status !== "abgesagt" && String(t.beginn) > grenze).sort((a, b) => String(a.beginn).localeCompare(String(b.beginn)));
    const t = konzerte.find((x) => x.id === offen);
    if (t) return detail(t);
    return kopf("🎟️ Konzertkarten") + `<div class="karte"><p>Besucher reservieren ohne Konto über einen eigenen Link – für Plakat, Schul-Website, WhatsApp oder Presse. An der Abendkasse hakt ihr die Namen hier ab.</p></div>
      ${konzerte.length ? `<ul class="liste">${konzerte.map((k) => { const s = kartenStand(k.id); return `<li><button type="button" class="knopf breit links" data-a="kkOffen" data-x="${esc(k.id)}">
        <b>${esc(k.titel)}</b><br><small>${esc(wann(k.beginn))}${k.ort ? " · " + esc(k.ort) : ""}</small><br>${k.karten_aktiv ? `🟢 online · <b>${s.reserviert}</b> reserviert${s.frei != null ? ` · ${s.frei} frei` : ""}` : "⚪ Reservierung aus"}</button></li>`; }).join("")}</ul>`
        : `<div class="karte"><p>Keine Konzerte in den nächsten Wochen. Termine mit der Art „Konzert“ (oder „Auftritt“) erscheinen hier.</p></div>`}`;
  },
};
function detail(t) {
  const s = kartenStand(t.id), q = suche.trim().toLowerCase();
  const l = s.liste.filter((r) => !q || String(r.name).toLowerCase().includes(q) || String(r.code || "").toLowerCase().includes(q)).sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  return kopf("🎟️ " + t.titel) + `<div class="karte"><p>${esc(wann(t.beginn))}${t.ort ? " · " + esc(t.ort) : ""}</p>
    ${einstellen() ? "" : '<p class="hinweis">Ein- und ausschalten, Plätze und Hinweis stellt die Leitung ein.</p>'}
    <label class="zs-haken"><input type="checkbox" class="schalter-cb" data-c="kkAktiv" ${einstellen() ? "" : "disabled"} ${t.karten_aktiv ? "checked" : ""}><span><b>Online-Reservierung</b> eingeschaltet</span></label>
    ${t.karten_aktiv ? `<div class="kk-zahlen"><label>Plätze <input type="number" min="1" max="5000" value="${esc(t.karten_plaetze ?? "")}" data-c="kkPlaetze" ${einstellen() ? "" : "disabled"} aria-label="Plätze insgesamt" style="width:90px"></label>
      <label>je Reservierung höchstens <input type="number" min="1" max="20" value="${esc(t.karten_je ?? KARTEN_JE_STANDARD)}" data-c="kkJe" ${einstellen() ? "" : "disabled"} aria-label="Höchstzahl je Reservierung" style="width:70px"></label></div>
      <label>Hinweis für Besucher <input value="${esc(t.karten_hinweis || "")}" data-c="kkHinweis" ${einstellen() ? "" : "disabled"} maxlength="200" placeholder="z. B. Eintritt frei – Spende erbeten" style="width:100%"></label>
      <p class="kk-link">${esc(kartenLink(t))}</p>
      <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="kkTeilen">📤 Link teilen</button><button type="button" class="knopf" data-a="kkKopieren">📋 Kopieren</button><a class="knopf" href="${esc(kartenLink(t))}" target="_blank" rel="noopener">👀 Ansehen</a></div>` : ""}
  </div>
  <div class="karte"><div class="kk-zahlen"><span class="badge">🎟️ ${s.reserviert} reserviert</span><span class="badge">✅ ${s.abgeholt} abgeholt</span>${s.frei != null ? `<span class="badge">💺 ${s.frei} frei</span>` : ""}</div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="kkHand">➕ Von Hand / Kasse</button><button type="button" class="knopf" data-a="kkDrucken">🖨️ Liste drucken / PDF</button></div>
    <input type="search" placeholder="🔍 Name oder Nr. suchen" value="${esc(suche)}" data-c="kkSuche" aria-label="Reservierungen durchsuchen" style="width:100%;margin-top:8px">
    ${l.length ? `<ul class="liste kk-liste">${l.map((r) => `<li class="${esc(r.status)}"><b>${esc(r.name)}</b> · ${r.anzahl}× ${r.code ? `<code>${esc(r.code)}</code>` : "<small>von Hand</small>"}
      <span class="badge">${esc(KARTEN_STATUS[r.status] || r.status)}</span>
      ${r.status === "reserviert" ? `<button type="button" class="knopf klein haupt" data-a="kkAbholen" data-x="${esc(r.id)}">✅ abgeholt</button><button type="button" class="knopf klein" data-a="kkStorno" data-x="${esc(r.id)}" aria-label="stornieren">✕</button>` : ""}
      ${r.status === "abgeholt" ? `<button type="button" class="knopf klein" data-a="kkZurueck" data-x="${esc(r.id)}">↩️</button>` : ""}</li>`).join("")}</ul>` : `<p>${q ? "Nichts gefunden." : "Noch keine Reservierungen."}</p>`}
  </div><div class="knopfreihe"><button type="button" class="knopf" data-a="kkZu">← Alle Konzerte</button></div>`;
}
const termin = () => hole("termine", offen);
async function terminSetzen(felder) { const t = termin(); if (!t) return; await speichere("termine", { ...t, ...felder }); zeichne(); }
async function reservierungSetzen(id, felder) { const r = hole("kartenreservierungen", id); if (!r) return; await speichere("kartenreservierungen", { ...r, ...felder }); zeichne(); }
AKTIONEN.kkOffen = (id) => { offen = id; suche = ""; zeichne(); };
AKTIONEN.kkZu = () => { offen = null; zeichne(); };
AKTIONEN.kkAktiv = (_, el) => { const t = termin(); terminSetzen({ karten_aktiv: el.checked, karten_token: t.karten_token || token(), karten_je: t.karten_je ?? KARTEN_JE_STANDARD }); };
AKTIONEN.kkPlaetze = (v) => terminSetzen({ karten_plaetze: v === "" ? null : Math.max(1, Math.round(Number(v))) });
AKTIONEN.kkJe = (v) => terminSetzen({ karten_je: Math.max(1, Math.min(20, Math.round(Number(v)) || KARTEN_JE_STANDARD)) });
AKTIONEN.kkHinweis = (v) => terminSetzen({ karten_hinweis: String(v).slice(0, 200) });
AKTIONEN.kkSuche = (v) => { suche = v; zeichne(); };
AKTIONEN.kkAbholen = (id) => reservierungSetzen(id, { status: "abgeholt" });
AKTIONEN.kkZurueck = (id) => reservierungSetzen(id, { status: "reserviert" });
AKTIONEN.kkStorno = (id) => { if (confirm("Diese Reservierung stornieren?")) reservierungSetzen(id, { status: "storniert" }); };
AKTIONEN.kkHand = async () => {
  const name = prompt("Name für die Reservierung (Telefon, Abendkasse):"); if (!name?.trim()) return;
  const n = Math.round(Number(prompt("Wie viele Karten?", "2"))); if (!(n >= 1)) return;
  await speichere("kartenreservierungen", { id: neueId(), termin_id: offen, name: name.trim(), anzahl: n, status: "reserviert", quelle: "kasse", zeit: new Date().toISOString() });
  toast("🎟️ Reserviert"); zeichne();
};
AKTIONEN.kkKopieren = async () => { try { await navigator.clipboard.writeText(kartenLink(termin())); toast("📋 Link kopiert"); } catch { toast("Kopieren ging nicht – bitte den Link markieren."); } };
AKTIONEN.kkTeilen = async () => {
  const t = termin(), text = `🎻 ${t.titel} – ${wann(t.beginn)}${t.ort ? ", " + t.ort : ""}. Karten reservieren:`;
  if (navigator.share) { try { await navigator.share({ title: t.titel, text, url: kartenLink(t) }); return; } catch (e) { if (e?.name === "AbortError") return; } }
  AKTIONEN.kkKopieren();
};
AKTIONEN.kkDrucken = async () => {
  const t = termin(), s = kartenStand(t.id), l = s.liste.filter((r) => r.status !== "storniert").sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  (await import("./druckvorschau.js")).druckVorschau({ titel: `Abendkasse ${t.titel}`, html: `<h1>Abendkasse – ${esc(t.titel)}</h1><p>${esc(wann(t.beginn))}${t.ort ? " · " + esc(t.ort) : ""} · ${s.reserviert} Karten reserviert${s.frei != null ? ` · ${s.frei} frei` : ""}</p>
    <table><thead><tr><th>✓</th><th>Name</th><th>Karten</th><th>Nr.</th><th>Notiz</th></tr></thead><tbody>${l.map((r) => `<tr><td>${r.status === "abgeholt" ? "✅" : "☐"}</td><td>${esc(r.name)}</td><td>${r.anzahl}</td><td>${esc(r.code || "–")}</td><td>${esc(r.notiz || "")}</td></tr>`).join("")}</tbody></table>` });
};
