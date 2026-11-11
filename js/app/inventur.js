// 📦 Inventur per Regal-Schild (0.63.0, Wunsch Hansi „keine QR-Codes auf die Instrumente – evtl. Schilder fürs Regal“):
// Jeder Lagerort (Regalfach, Schrank, Kasten) bekommt ein gedrucktes Schild mit QR-Code. Inventur: Schild scannen → die App zeigt,
// was dort stehen soll → antippen „da“ oder „fehlt“; Verliehenes erkennt sie selbst; „hier gefunden“ ordnet ein Instrument dem Fach zu.
// Am Ende ein Inventurbericht (PDF) für den Vorstand. Instrumente werden über Inventar-Nr. bzw. Typ + Größe erkannt – ohne Aufkleber.
import { S, VIEWS, zeige, zeichne, kopf, hatRolle, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { INVENTAR_STATUS } from "../kern/schema.js";
import { qrLeserStart, qrLeserStopp, qrLeserVergessen, qrcodeLaden, qrSvg } from "../kern/qrleser.js";

export const INVENTUR_ROLLEN = ["admin", "leitung", "vorstand", "instrumentenwart"];
const ABGANG = ["ausgemustert", "verkauft", "verschrottet"];
const IV = { ort: null, scan: false, suche: "" };
const heute = () => new Date().toISOString().slice(0, 10);
const orte = () => liste("lagerorte").sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name), "de"));
const gegenstaende = () => [...liste("inventar").map((z) => ({ t: "inventar", z })), ...liste("ausstattung").map((z) => ({ t: "ausstattung", z }))].filter(({ z }) => !ABGANG.includes(z.status));
const titelVon = ({ t, z }) => t === "inventar" ? `${hole("instrument_typen", z.typ_id)?.name || "Instrument"}${z.groesse ? " " + z.groesse : ""}` : z.bezeichnung || z.name || "Ausstattung";
const symVon = ({ t }) => (t === "inventar" ? "🎻" : "🧰");
const nrVon = ({ z }) => z.inventar_nr || "";
const schluessel = (g) => `${g.t}:${g.z.id}`;
const aktiv = () => liste("inventuren", (x) => !x.abgeschlossen).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn)))[0] || null;
const verliehen = (g) => (g.t === "inventar" ? liste("ausleihen", (a) => a.inventar_id === g.z.id && a.status === "aktiv")[0] : liste("ausleihen", (a) => a.ausstattung_id === g.z.id && a.status === "aktiv")[0]) || null;
const ergebnisVon = (inv, g) => inv?.ergebnis?.[schluessel(g)] || null;

function fachZahlen(ortId, inv) {
  const l = gegenstaende().filter((g) => g.z.lagerort_id === ortId), offen = l.filter((g) => !verliehen(g) && !ergebnisVon(inv, g));
  return { gesamt: l.length, offen: offen.length, fehlt: l.filter((g) => ergebnisVon(inv, g)?.s === "fehlt").length };
}
VIEWS.inventur = {
  render() {
    if (!hatRolle(...INVENTUR_ROLLEN)) return kopf("📦 Inventur") + '<div class="karte"><p>Die Inventur machen Leitung, Vorstand und Instrumentenwart.</p></div>';
    return IV.ort ? fachHtml(hole("lagerorte", IV.ort)) : uebersichtHtml();
  },
  nach() { if (IV.scan) scanStarten(); },
};
function uebersichtHtml() {
  const inv = aktiv(), os = orte(), ohne = gegenstaende().filter((g) => !g.z.lagerort_id).length;
  return kopf("📦 Inventur") + `<div class="karte iv-start">
    ${inv ? `<p>🟢 <b>${esc(inv.titel)}</b> läuft seit ${new Date(inv.beginn).toLocaleDateString("de-DE")}.</p>` : "<p>Gerade läuft keine Inventur. Lagerorte und Schilder kannst du trotzdem schon anlegen.</p>"}
    <div class="iv-knoepfe">
      ${inv ? '<button type="button" class="knopf haupt breit" data-a="ivScan">📷 Regal-Schild scannen</button>' : '<button type="button" class="knopf haupt breit" data-a="ivStart">📦 Inventur starten</button>'}
      <button type="button" class="knopf breit" data-a="ivSchilder">🪧 Regal-Schilder drucken</button>
      <button type="button" class="knopf breit" data-a="ivOrtNeu">➕ Lagerort anlegen</button>
      ${inv ? '<button type="button" class="knopf breit" data-a="ivBericht">📄 Inventurbericht · abschließen</button>' : ""}
    </div></div>
    <video id="ivVideo" class="iv-video" playsinline muted hidden aria-label="Kamerabild"></video>
    <div class="karte"><h3>Lagerorte</h3>${os.length ? `<ul class="liste iv-orte">${os.map((o) => { const f = fachZahlen(o.id, inv);
      return `<li class="klick" data-a="ivOrt" data-x="${esc(o.id)}"><span class="iv-sym">📦</span><div class="fl"><b>${esc(o.name)}</b><small>${esc(o.raum || "")}${o.raum ? " · " : ""}${f.gesamt} Gegenstände</small></div>${inv ? (f.offen ? `<span class="badge">${f.offen} offen</span>` : `<span class="badge b-gruen">✅ fertig</span>`) + (f.fehlt ? ` <span class="badge b-rot">${f.fehlt} fehlt</span>` : "") : ""}<span>›</span></li>`; }).join("")}</ul>`
      : '<p class="hinweis">Noch keine Lagerorte. Lege für jedes Regalfach, jeden Schrank oder Kasten einen an – dann Schilder drucken und ans Regal kleben.</p>'}
    ${ohne ? `<p class="hinweis">ℹ️ ${ohne} Gegenstände haben noch keinen Lagerort. Fach öffnen → „➕ Hier gefunden“ ordnet sie zu (oder in der PC-Verwaltung).</p>` : ""}</div>`;
}
function fachHtml(o) {
  if (!o) { IV.ort = null; return uebersichtHtml(); }
  const inv = aktiv(), l = gegenstaende().filter((g) => g.z.lagerort_id === o.id).sort((a, b) => nrVon(a).localeCompare(nrVon(b), "de", { numeric: true }));
  const zeile = (g) => {
    const v = verliehen(g), e = ergebnisVon(inv, g), wer = v?.person_id ? name(v.person_id) : "";
    const rechts = v ? `<span class="badge b-blau">↗ verliehen</span>` : !inv ? "" : e?.s === "da" ? `<span class="badge b-gruen">✅ da</span><button type="button" class="knopf klein" data-a="ivSetzen" data-x="${esc(schluessel(g))}|">↩</button>`
      : e?.s === "fehlt" ? `<span class="badge b-rot">❓ fehlt</span><button type="button" class="knopf klein" data-a="ivSetzen" data-x="${esc(schluessel(g))}|">↩</button>`
      : `<button type="button" class="knopf klein iv-da" data-a="ivSetzen" data-x="${esc(schluessel(g))}|da">da</button><button type="button" class="knopf klein iv-fehlt" data-a="ivSetzen" data-x="${esc(schluessel(g))}|fehlt">fehlt</button>`;
    return `<li><span class="iv-sym">${symVon(g)}</span><div class="fl"><b>${esc(titelVon(g))}${nrVon(g) ? " · " + esc(nrVon(g)) : ""}</b><small>${v ? `an ${esc(wer || "?")} verliehen${v.bis ? " bis " + new Date(v.bis).toLocaleDateString("de-DE") : ""}` : `${esc(g.z.bezeichnung && g.t === "inventar" ? g.z.bezeichnung : INVENTAR_STATUS[g.z.status] || "")}${g.z.inventur_am ? " · zuletzt gesehen " + new Date(g.z.inventur_am).toLocaleDateString("de-DE") : ""}`}</small></div><span class="iv-rechts">${rechts}</span></li>`;
  };
  return kopf("📦 " + o.name) + `<div class="karte"><p>${esc(o.raum || "")}${o.hinweis ? " · " + esc(o.hinweis) : ""}</p>
    ${l.length ? `<ul class="liste iv-fach">${l.map(zeile).join("")}</ul>` : '<p class="hinweis">Hier ist noch nichts eingetragen.</p>'}
    <button type="button" class="knopf breit" data-a="ivHier">➕ Hier gefunden / gehört hierher</button></div>
    <div class="iv-knoepfe">${inv ? '<button type="button" class="knopf haupt breit" data-a="ivScan">✅ Fach fertig – nächstes Schild scannen</button>' : ""}
    <button type="button" class="knopf breit" data-a="ivSchilder" data-x="${esc(o.id)}">🪧 Schild für dieses Fach drucken</button>
    <button type="button" class="knopf breit" data-a="ivZurueck">‹ Alle Lagerorte</button></div>`;
}
// ---------- Aktionen ----------
AKTIONEN.ivOrt = (id) => { IV.ort = id; zeichne(); };
AKTIONEN.ivZurueck = () => { IV.ort = null; zeichne(); };
AKTIONEN.ivStart = async () => {
  const titel = `Inventur ${new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  await speichere("inventuren", { id: neueId(), titel, beginn: new Date().toISOString(), ergebnis: {}, von: S.ich.id });
  toast("📦 Inventur gestartet – jetzt das erste Regal-Schild scannen"); zeichne();
};
AKTIONEN.ivSetzen = async (x) => {
  const [k, s] = String(x).split("|"), [t, id] = k.split(":"), inv = aktiv(); if (!inv) return;
  const erg = { ...(inv.ergebnis || {}) };
  if (s) erg[k] = { s, ort: IV.ort, zeit: new Date().toISOString() }; else delete erg[k];
  await speichere("inventuren", { ...inv, ergebnis: erg });
  if (s === "da") { const z = hole(t, id); if (z) await speichere(t, { ...z, inventur_am: heute() }); }
  zeichne();
};
// „Hier gefunden“: Gegenstand suchen (Nr., Typ, Bezeichnung) → diesem Fach zuordnen und (bei laufender Inventur) als „da“ zählen
AKTIONEN.ivHier = () => { IV.suche = ""; blatt("➕ Hier gefunden", `<label class="st-feld"><span>Inventar-Nr., Instrument oder Bezeichnung</span><input id="ivSuche" type="search" autocomplete="off" placeholder="z. B. V-014, Cello, Notenständer"></label><div id="ivTreffer">${trefferHtml()}</div>`);
  const f = document.getElementById("ivSuche"); f?.addEventListener("input", () => AKTIONEN.ivSuche(f.value)); setTimeout(() => f?.focus(), 50); }; // beim Tippen filtern (nicht erst beim Verlassen – sonst verpufft der Tipp auf einen Treffer)
function trefferHtml() {
  const q = IV.suche.trim().toLowerCase();
  const l = gegenstaende().filter((g) => g.z.lagerort_id !== IV.ort && (!q || `${nrVon(g)} ${titelVon(g)} ${g.z.bezeichnung || ""}`.toLowerCase().includes(q))).slice(0, 30);
  return l.length ? `<ul class="liste">${l.map((g) => `<li class="klick" data-a="ivHierWahl" data-x="${esc(schluessel(g))}"><span class="iv-sym">${symVon(g)}</span><div class="fl"><b>${esc(titelVon(g))}${nrVon(g) ? " · " + esc(nrVon(g)) : ""}</b><small>${g.z.lagerort_id ? "bisher: " + esc(hole("lagerorte", g.z.lagerort_id)?.name || "?") : "noch ohne Lagerort"}</small></div><span>➕</span></li>`).join("")}</ul>` : '<p class="hinweis">Nichts gefunden.</p>';
}
AKTIONEN.ivSuche = (v) => { IV.suche = v; const t = document.getElementById("ivTreffer"); if (t) t.innerHTML = trefferHtml(); };
AKTIONEN.ivHierWahl = async (k) => {
  const [t, id] = k.split(":"), z = hole(t, id), inv = aktiv(); if (!z) return;
  const vorher = z.lagerort_id;
  await speichere(t, { ...z, lagerort_id: IV.ort, ...(inv ? { inventur_am: heute() } : {}) });
  if (inv) await speichere("inventuren", { ...inv, ergebnis: { ...(inv.ergebnis || {}), [k]: { s: "da", ort: IV.ort, vorher: vorher || null, zeit: new Date().toISOString() } } });
  blattZu(); toast(vorher ? "📦 Umgeräumt – steht jetzt hier" : "📦 Zugeordnet"); zeichne();
};
AKTIONEN.ivOrtNeu = () => blatt("➕ Lagerort anlegen", `<label class="st-feld"><span>Name</span><input id="ivOrtName" maxlength="60" placeholder="z. B. Regal A · Fach 2"></label>
  <label class="st-feld"><span>Raum / Stelle</span><input id="ivOrtRaum" maxlength="80" placeholder="z. B. Musiksaal, linke Wand"></label>
  <button type="button" class="knopf haupt breit" data-a="ivOrtSpeichern">💾 Anlegen</button>`);
AKTIONEN.ivOrtSpeichern = async () => {
  const n = document.getElementById("ivOrtName")?.value.trim(), r = document.getElementById("ivOrtRaum")?.value.trim();
  if (!n) return toast("Bitte einen Namen eingeben");
  const id = neueId(); await speichere("lagerorte", { id, name: n, raum: r || null, sort: orte().length + 1 });
  blattZu(); IV.ort = id; zeichne(); toast("📦 Lagerort angelegt – jetzt „➕ Hier gefunden“ für jedes Instrument im Fach");
};
// ---------- Scannen ----------
AKTIONEN.ivScan = () => { IV.ort = null; IV.scan = true; zeichne(); };
async function scanStarten() {
  const v = document.getElementById("ivVideo"); if (!v) return;
  v.hidden = false; v.scrollIntoView({ block: "center", behavior: "smooth" });
  qrLeserVergessen();
  const fehler = await qrLeserStart(v, (text) => {
    const m = /^BKL1:([\w-]+)$/.exec(String(text));
    if (!m) return toast("Das ist kein Bachkreis-Regal-Schild.");
    if (!hole("lagerorte", m[1])) return toast("Diesen Lagerort gibt es nicht (mehr).");
    try { navigator.vibrate?.(60); } catch {}
    qrLeserStopp(); IV.scan = false; IV.ort = m[1]; zeichne();
  });
  if (fehler) { IV.scan = false; v.hidden = true; toast(fehler); }
}
document.addEventListener("bk-ansicht", () => { if (S.view !== "inventur") { IV.scan = false; IV.ort = null; } });
// ---------- Regal-Schilder (Druckvorschau, Bachkreis-Design) ----------
AKTIONEN.ivSchilder = async (nurId) => {
  const os = nurId ? orte().filter((o) => o.id === nurId) : orte();
  if (!os.length) return toast("Erst einen Lagerort anlegen");
  await qrcodeLaden();
  const soll = (o) => { const z = {}; for (const g of gegenstaende().filter((x) => x.z.lagerort_id === o.id)) { const k = titelVon(g); z[k] = (z[k] || 0) + 1; } return Object.entries(z).map(([k, n]) => `${n}× ${k}`).join(", "); };
  const html = `<div class="iv-schilder">${os.map((o) => `<div class="iv-schild"><div class="iv-schild-qr">${qrSvg("BKL1:" + o.id)}</div><div class="iv-schild-text"><div class="iv-schild-gold"></div><h2>${esc(o.name)}</h2><p>${esc(o.raum || "")}</p>${soll(o) ? `<p><b>Soll hier stehen:</b> ${esc(soll(o))}</p>` : ""}<p class="iv-schild-fuss">🎻 Bachkreis Bergkamen · Inventur-Schild</p></div></div>`).join("")}</div>`;
  (await import("./druckvorschau.js")).druckVorschau({ titel: nurId ? `Regal-Schild ${os[0].name}` : "Regal-Schilder", html });
};
// ---------- Bericht & Abschluss ----------
AKTIONEN.ivBericht = async () => {
  const inv = aktiv(); if (!inv) return;
  const alle = gegenstaende(), e = inv.ergebnis || {};
  const fehlt = alle.filter((g) => e[schluessel(g)]?.s === "fehlt"), umgeraeumt = alle.filter((g) => e[schluessel(g)]?.vorher);
  const nichtGeprueft = alle.filter((g) => g.z.lagerort_id && !e[schluessel(g)] && !verliehen(g)), ohneOrt = alle.filter((g) => !g.z.lagerort_id && !e[schluessel(g)]);
  const wartung = alle.filter((g) => g.z.wartung_faellig && g.z.wartung_faellig <= heute());
  const tab = (l, extra = () => "") => l.length ? `<table><thead><tr><th>Nr.</th><th>Gegenstand</th><th>Lagerort</th><th></th></tr></thead><tbody>${l.map((g) => `<tr><td>${esc(nrVon(g))}</td><td>${esc(titelVon(g))}</td><td>${esc(hole("lagerorte", g.z.lagerort_id)?.name || "–")}</td><td>${extra(g)}</td></tr>`).join("")}</tbody></table>` : "<p>–</p>";
  const html = `<h1>${esc(inv.titel)}</h1><p>Begonnen ${new Date(inv.beginn).toLocaleDateString("de-DE")} · ${Object.keys(e).length} Gegenstände geprüft · ${alle.filter((g) => verliehen(g)).length} verliehen</p>
    <h2>❓ Fehlt (${fehlt.length})</h2>${tab(fehlt)}<h2>↪ Umgeräumt (${umgeraeumt.length})</h2>${tab(umgeraeumt, (g) => "vorher: " + esc(hole("lagerorte", e[schluessel(g)].vorher)?.name || "–"))}
    <h2>⏳ Noch nicht geprüft (${nichtGeprueft.length})</h2>${tab(nichtGeprueft)}<h2>📦 Ohne Lagerort (${ohneOrt.length})</h2>${tab(ohneOrt)}<h2>🔧 Wartung fällig (${wartung.length})</h2>${tab(wartung, (g) => new Date(g.z.wartung_faellig).toLocaleDateString("de-DE"))}`;
  blatt("📄 Inventurbericht", `<p><b>${fehlt.length}</b> fehlen · <b>${umgeraeumt.length}</b> umgeräumt · <b>${nichtGeprueft.length}</b> noch nicht geprüft · <b>${ohneOrt.length}</b> ohne Lagerort</p>
    <div class="iv-knoepfe"><button type="button" class="knopf breit" data-a="ivBerichtDruck">🖨️ Bericht drucken / PDF</button>
    <button type="button" class="knopf haupt breit" data-a="ivAbschliessen">✅ Inventur abschließen${fehlt.length ? ` (${fehlt.length} als „vermisst“ melden)` : ""}</button></div>`);
  IV.bericht = html;
};
AKTIONEN.ivBerichtDruck = async () => { blattZu(); (await import("./druckvorschau.js")).druckVorschau({ titel: aktiv()?.titel || "Inventurbericht", html: IV.bericht || "" }); };
AKTIONEN.ivAbschliessen = async () => {
  const inv = aktiv(); if (!inv) return;
  const e = inv.ergebnis || {};
  for (const [k, w] of Object.entries(e)) if (w.s === "fehlt") { const [t, id] = k.split(":"), z = hole(t, id); if (z && !["verliehen", "vermisst"].includes(z.status)) await speichere(t, { ...z, status: "vermisst" }); }
  await speichere("inventuren", { ...inv, abgeschlossen: new Date().toISOString() });
  blattZu(); toast("✅ Inventur abgeschlossen"); IV.ort = null; zeige("inventur", {}, { ersetzen: true });
};
