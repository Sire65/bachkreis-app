// 🏢 Büro für Leitung, Lehrkräfte und Vorstand (0.33.0, nach KC-CLUB-BUERO / -BUERO-RAUM / -BRIEFBOGEN):
// oben der 📥 Eingangskorb (alles, was gerade wartet – aus dem Cockpit), darunter das Regal mit Ordnern (Registry BUERO_ORDNER in schema.js).
// Dokumente liegen in der vorhandenen Tabelle „dokumente“ (kein zweiter Speicher): Datei hochladen, Text schreiben oder Link.
// Aus 📄 Vorlagen entsteht ein Brief: Platzhalter füllen → 🖨️ drucken (Briefbogen) · 📣 als Rundschreiben senden · 💾 in „Elternbriefe“ ablegen.
// Sichtbarkeit „Büro: Leitung & Lehrkräfte“ bzw. „Büro: Vorstand & Leitung“ prüft der Server (bueroDarf in regeln.js).
import { pruefungHtml, vorVeroeffentlichen } from "./pruefung.js";
import { S, VIEWS, zeige, zeichne, kopf, name, rollen, db } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, datum, uhr, frage, BACHKREIS_LOGO } from "../kern/ui.js";
import { liste, hole, speichere, loesche, konfig } from "../kern/daten.js";
import { BUERO_ORDNER, DOKUMENT_ARTEN, DOKUMENT_SICHT, bueroDarf, bueroZugang } from "../kern/schema.js";
import { cockpit, termineFuer } from "../kern/logik.js";
import { hochladen, dateiOeffnen } from "../kern/dateien.js";
import { raumAn, raumHtml, einrichtenAn } from "./bueroraum.js";

export const bueroDa = () => bueroZugang(rollen());
const sichtErlaubt = () => Object.keys(DOKUMENT_SICHT).filter((k) => bueroDarf(k, rollen()));
const ordnerSichtbar = () => Object.entries(BUERO_ORDNER).filter(([k, o]) => bueroDarf(o.sicht, rollen()) || bueroDokumente(k).length > 0);
export const bueroDokumente = (ordner) => liste("dokumente", (d) => !!d.ordner && (!ordner || d.ordner === ordner) && bueroDarf(d.sichtbar, rollen())); // gleiche Regel wie der Server
const BU = { ordner: null, suche: "", datei: null };

// ---------- 📥 Eingangskorb: was gerade auf die Leitung wartet (Cockpit-Punkte mit Dringlichkeit ≥ 2) ----------
function eingangHtml() {
  const c = cockpit(db, S.ich.id).filter((x) => x.dring >= 2).slice(0, 6);
  if (!c.length) return `<div class="karte bu-eingang"><h3>📥 Eingang</h3><p>👍 Gerade liegt nichts an.</p></div>`;
  return `<div class="karte bu-eingang"><h3>📥 Eingang <span class="badge b-gelb">${c.length}</span></h3><div class="ifzliste bu-liste kind-ich">${c.map((x) => `<button type="button" class="ifz" data-a="oeffne" data-x="${esc(x.ziel.view)}|${esc(x.ziel.id || "")}"><span>${x.sym}</span><span class="ifzt">${esc(x.text)}</span><span>›</span></button>`).join("")}</div>
    <button type="button" class="knopf klein" data-a="kachel" data-x="cockpit">🧭 Alles im Cockpit</button></div>`;
}
const gruss = () => { const h = new Date().getHours(); return h < 11 ? "☀️ Guten Morgen" : h < 18 ? "🌤️ Guten Tag" : "🌙 Guten Abend"; };

VIEWS.buero = {
  render(p = {}) {
    if (!bueroDa()) return kopf("🏢 Büro") + '<p class="hinweis">Das Büro ist für Leitung, Lehrkräfte und Vorstand.</p>';
    if (p.ordner) return ordnerHtml(p.ordner);
    const docs = bueroDokumente(), q = BU.suche.trim().toLowerCase();
    const treffer = q ? docs.filter((d) => `${d.titel} ${d.beschreibung || ""} ${d.inhalt || ""}`.toLowerCase().includes(q)) : [];
    const n = (k) => docs.filter((d) => d.ordner === k).length;
    // 🏠 0.37.0 Büro-Raum wie die Club App (Aktenschrank mit Jalousie, Schreibtisch) – ☰ Liste bleibt als zweite Ansicht
    if (raumAn()) return kopf("🏢 Büro", `<button class="knopf klein${einrichtenAn() ? " haupt" : ""}" data-a="bueStart" aria-label="Schreibtisch einrichten">✏️</button><button class="knopf klein" data-a="buAnsicht" aria-label="Als Liste zeigen">☰</button><button class="knopf klein haupt" data-a="buNeu">＋ Neu</button>`)
      + `<p class="bu-gruss">${gruss()}, ${esc(S.ich.vorname || "")}!</p>
      <input class="einst-suche" type="search" placeholder="🔍 Im Büro suchen …" value="${esc(BU.suche)}" data-c="buSuche" aria-label="Im Büro suchen">
      ${q ? `<div class="karte"><h3>🔍 ${treffer.length} Treffer</h3>${dokListe(treffer)}</div>` : ""}${raumHtml({ docZahl: n })}
      <p class="hinweis">🔐 Ordner im Büro sehen nur Leitung und Lehrkräfte – „Förderverein & Finanzen“ auch der Vorstand. Bildschirm antippen: Büro als Liste.</p>`;
    return kopf("🏢 Büro", '<button class="knopf klein" data-a="buAnsicht" aria-label="Als Raum zeigen">🏠</button><button class="knopf klein haupt" data-a="buNeu">＋ Neu</button>') + `<p class="bu-gruss">${gruss()}, ${esc(S.ich.vorname || "")}!</p>
      ${eingangHtml()}
      <div class="knopfreihe bu-schnell"><button type="button" class="knopf" data-a="buBriefNeu">✉️ Brief / Elternbrief</button><button type="button" class="knopf" data-a="buProtokollNeu">🗒️ Protokoll schreiben</button><button type="button" class="knopf" data-a="buDateiNeu">⬆️ Datei ablegen</button></div>
      <input class="einst-suche" type="search" placeholder="🔍 Im Büro suchen …" value="${esc(BU.suche)}" data-c="buSuche" aria-label="Im Büro suchen">
      ${q ? `<div class="karte"><h3>🔍 ${treffer.length} Treffer</h3>${dokListe(treffer)}</div>` : ""}
      <h3>🗄️ Regal</h3><div class="bul-regal">${ordnerSichtbar().map(([k, o]) => `<button type="button" class="bul-ordner" style="--of:${o.farbe}" data-a="buOrdner" data-x="${k}"><span class="bu-rueck" aria-hidden="true">${o.sym}</span><b>${esc(o.t)}</b><small>${n(k)} ${n(k) === 1 ? "Dokument" : "Dokumente"}</small></button>`).join("")}</div>
      <p class="hinweis">🔐 Ordner im Büro sehen nur Leitung und Lehrkräfte – „Förderverein & Finanzen“ auch der Vorstand. Für Eltern und Schüler gibt es weiter 📂 Dokumente.</p>`;
  },
};
function dokListe(l) {
  if (!l.length) return '<p class="hinweis">Noch nichts abgelegt.</p>';
  const nachJahr = {}; for (const d of l) (nachJahr[d.jahr || "ohne Jahr"] = nachJahr[d.jahr || "ohne Jahr"] || []).push(d);
  return Object.keys(nachJahr).sort((a, b) => String(b).localeCompare(String(a))).map((j) => `<h4>${esc(j)}</h4><ul class="liste">${nachJahr[j].sort((a, b) => a.titel.localeCompare(b.titel, "de")).map((d) => `<li class="klick" data-a="buDok" data-x="${esc(d.id)}"><span>${d.art === "vorlage" ? "📄" : d.datei ? "📎" : d.url ? "🔗" : "📝"}</span><div class="fl"><div class="zeile-titel">${esc(d.titel)}</div><div class="zeile-unter">${esc(DOKUMENT_ARTEN[d.art] || "")}${d.beschreibung ? ` · ${esc(d.beschreibung)}` : ""}${d.sichtbar === "vorstand" ? " · 💛 auch Vorstand" : ""}</div></div><span>›</span></li>`).join("")}</ul>`).join("");
}
function ordnerHtml(k) {
  const o = BUERO_ORDNER[k]; if (!o) return kopf("🏢 Büro") + '<p class="hinweis">Diesen Ordner gibt es nicht.</p>';
  const l = bueroDokumente(k);
  return kopf(`${o.sym} ${o.t}`, `<button class="knopf klein haupt" data-a="buNeu" data-x="${k}">＋ Neu</button>`) + `<div class="bu-aufgeschlagen" style="--of:${o.farbe}"><div class="bu-auf-kopf"><span aria-hidden="true">${o.sym}</span><b>${esc(o.t)}</b><button type="button" class="knopf klein" data-a="buZurueckBuero">‹ Zurück ins Büro</button></div><div class="bu-auf-blatt"><p class="hinweis">${esc(o.u)}</p>
    ${k === "vorlagen" ? '<div class="knopfreihe"><button type="button" class="knopf" data-a="buBriefNeu">✉️ Brief aus Vorlage</button></div>' : ""}${k === "protokolle" ? '<div class="knopfreihe"><button type="button" class="knopf" data-a="buProtokollNeu">🗒️ Neues Protokoll</button></div>' : ""}
    ${k === "noten" ? '<div class="knopfreihe"><button type="button" class="knopf" data-a="kachel" data-x="noten">📚 Zum Notenarchiv</button></div>' : ""}
    ${dokListe(l)}</div></div>`;
}
AKTIONEN.buZurueckBuero = () => zeige("buero");
AKTIONEN.buDruckText = (betreff, text) => briefDrucken(betreff, text);
// ---------- Dokument ansehen ----------
VIEWS.buerodok = {
  render({ id }) {
    const d = hole("dokumente", id); if (!d) return kopf("🏢 Büro") + '<p class="hinweis">Dokument nicht gefunden.</p>';
    const o = BUERO_ORDNER[d.ordner];
    return kopf(`${d.art === "vorlage" ? "📄" : "📝"} ${esc(d.titel)}`) + `<div class="karte"><p class="hinweis">${o ? `${o.sym} ${esc(o.t)}` : ""}${d.jahr ? ` · ${d.jahr}` : ""} · ${esc(DOKUMENT_SICHT[d.sichtbar] || "")}${d.fassung ? ` · ${esc(d.fassung)}` : ""}</p>
      ${d.beschreibung ? `<p>${esc(d.beschreibung)}</p>` : ""}${d.inhalt ? `<div class="bu-text">${esc(d.inhalt).replace(/\n/g, "<br>")}</div>` : ""}
      <div class="knopfreihe">${d.datei ? `<button type="button" class="knopf haupt" data-a="dokOeffnen" data-x="${esc(d.id)}">📎 Datei öffnen</button>` : ""}${d.url ? `<a class="knopf" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">🔗 Link öffnen ↗</a>` : ""}
      ${d.art === "vorlage" ? `<button type="button" class="knopf haupt" data-a="buBriefNeu" data-x="${esc(d.id)}">✉️ Brief daraus</button>` : ""}${d.inhalt ? `<button type="button" class="knopf" data-a="buDrucken" data-x="${esc(d.id)}">🖨️ Drucken</button>` : ""}
      <button type="button" class="knopf" data-a="buBearbeiten" data-x="${esc(d.id)}">✏️ Bearbeiten</button>
      ${d.art === "protokoll" ? `<button type="button" class="knopf" data-a="protokollVeroeffentlichen" data-x="${esc(d.id)}">📣 ${["leitung", "vorstand"].includes(d.sichtbar) ? "Für Mitglieder freigeben" : "Freigabe ändern"}</button>` : ""}</div></div>${pruefungHtml(d)}`;
  },
};
AKTIONEN.buOrdner = (k) => zeige("buero", { ordner: k });
AKTIONEN.buDok = (id) => zeige("buerodok", { id });
AKTIONEN.buSuche = (v) => { BU.suche = v; zeichne(); document.querySelector(".einst-suche")?.focus(); };

// ---------- Neu / Bearbeiten ----------
function form(d = {}) {
  BU.datei = d.datei || null;
  const ordner = d.ordner || BU.ordnerVorgabe || "protokolle", sicht = d.sichtbar || BUERO_ORDNER[ordner]?.sicht || "leitung";
  const sel = (n, werte, w) => `<select name="${n}">${Object.entries(werte).map(([k, t]) => `<option value="${k}" ${k === w ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  blatt(d.id ? "✏️ Dokument bearbeiten" : "＋ Neues Dokument im Büro", `<div id="buForm" class="vl-form">
    <div class="feld"><label>Titel *</label><input name="titel" value="${esc(d.titel || "")}" maxlength="120"></div>
    <div class="feld"><label>Ordner</label>${sel("ordner", Object.fromEntries(Object.entries(BUERO_ORDNER).map(([k, o]) => [k, `${o.sym} ${o.t}`])), ordner)}</div>
    <div class="feld"><label>Art</label>${sel("art", DOKUMENT_ARTEN, d.art || (ordner === "vorlagen" ? "vorlage" : ordner === "protokolle" ? "protokoll" : "info"))}</div>
    <div class="feld"><label>Jahr</label><input name="jahr" type="number" min="1969" max="2100" value="${esc(d.jahr || new Date().getFullYear())}"></div>
    <div class="feld"><label>Wer darf es sehen?</label>${sel("sichtbar", Object.fromEntries(sichtErlaubt().map((k) => [k, DOKUMENT_SICHT[k]])), sicht)}</div>
    <div class="feld"><label>Kurzbeschreibung</label><input name="beschreibung" value="${esc(d.beschreibung || "")}" maxlength="200"></div>
    <div class="feld"><label>Text (für geschriebene Dokumente und Vorlagen – Platzhalter: {vorname} {datum} {orchester} {termin} {leitung})</label><textarea name="inhalt" rows="8">${esc(d.inhalt || "")}</textarea></div>
    <div class="feld"><label>Datei (PDF, Word, Bild …)</label><input type="file" data-c="buDatei" accept=".pdf,.doc,.docx,.odt,.xlsx,.ods,.pptx,.png,.jpg,.jpeg,.svg,.mscz,.musicxml"><small class="hinweis" id="buDateiOk">${d.datei ? "📎 Datei vorhanden" : ""}</small></div>
    <div class="feld"><label>Link</label><input name="url" type="url" value="${esc(d.url || "")}" placeholder="https://…"></div>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="buSpeichern" data-x="${esc(d.id || "")}">💾 Speichern</button>${d.id ? `<button type="button" class="knopf" data-a="buWeg" data-x="${esc(d.id)}">🗑️ Löschen</button>` : ""}</div></div>`);
}
AKTIONEN.buNeu = (ordner) => { BU.ordnerVorgabe = ordner || S.params?.ordner || null; form(); };
AKTIONEN.buDateiNeu = () => { BU.ordnerVorgabe = S.params?.ordner || "archiv"; form(); };
AKTIONEN.buBearbeiten = (id) => form(hole("dokumente", id));
AKTIONEN.buDatei = async (_, el) => {
  const f = el.files?.[0]; if (!f) return;
  try { const r = await hochladen(f, { art: "datei" }); BU.datei = "datei:" + r.id; const ok = document.getElementById("buDateiOk"); if (ok) ok.textContent = `✅ ${f.name}`; } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.buSpeichern = async (id) => {
  const f = formWerte(document.getElementById("buForm"));
  if (!String(f.titel || "").trim()) return toast("Bitte einen Titel eingeben.");
  if (!bueroDarf(f.sichtbar, rollen())) return toast("Diese Sichtbarkeit darfst du nicht wählen.");
  const alt = id ? hole("dokumente", id) : {};
  const z = await speichere("dokumente", { ...alt, titel: f.titel.trim(), ordner: f.ordner, art: f.art, jahr: Number(f.jahr) || null, sichtbar: f.sichtbar, beschreibung: f.beschreibung || null, inhalt: f.inhalt || null, url: f.url || null, datei: BU.datei || alt.datei || null });
  blattZu(); toast("💾 Im Büro abgelegt"); zeige("buerodok", { id: z?.id || id }, { ersetzen: !!id });
};
AKTIONEN.buWeg = async (id) => { if (!(await frage("Dokument aus dem Büro löschen?"))) return; await loesche("dokumente", id); blattZu(); toast("🗑️ Gelöscht"); zeige("buero"); };

// ---------- ✉️ Brief aus Vorlage ----------
const leitungName = () => name(konfig().leitung_id || "") || name(S.ich);
const platzhalter = (t, w) => String(t || "").replace(/\{(vorname|datum|orchester|termin|leitung)\}/g, (_, k) => w[k] ?? `{${k}}`);
function naechsterTerminText() { const t = termineFuer(db, S.ich.id).find((x) => x.status !== "abgesagt" && new Date(x.beginn) > new Date()) || liste("termine", (x) => x.status !== "abgesagt" && new Date(x.beginn) > new Date()).sort((a, b) => a.beginn.localeCompare(b.beginn))[0]; return t ? `${t.titel} am ${datum(t.beginn)}, ${uhr(t.beginn)} Uhr` : ""; }
AKTIONEN.buBriefNeu = (vorlageId) => {
  const vorlagen = liste("dokumente", (d) => d.art === "vorlage" && d.inhalt), v = vorlageId ? hole("dokumente", vorlageId) : vorlagen[0];
  const gruppen = liste("gruppen");
  const w = { vorname: "{vorname}", datum: datum(new Date().toISOString()), orchester: gruppen[0]?.name || "", termin: naechsterTerminText(), leitung: leitungName() };
  blatt("✉️ Brief / Elternbrief", `<div id="briefForm" class="vl-form">
    <div class="feld"><label>Vorlage</label><select name="vorlage" data-c="buBriefVorlage">${vorlagen.map((d) => `<option value="${esc(d.id)}" ${d.id === v?.id ? "selected" : ""}>${esc(d.titel)}</option>`).join("")}<option value="">– ohne Vorlage –</option></select></div>
    <div class="feld"><label>Betreff</label><input name="betreff" id="briefBetreff" value="${esc(v?.beschreibung || v?.titel || "")}"></div>
    <div class="feld"><label>Text</label><textarea name="text" id="briefText" rows="12">${esc(platzhalter(v?.inhalt, w))}</textarea><div class="hinweis">{vorname} bleibt stehen und wird beim Rundschreiben für jede Person ersetzt.</div></div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="buBriefDrucken">🖨️ Drucken</button><button type="button" class="knopf haupt" data-a="buBriefSenden">📣 Als Rundschreiben</button><button type="button" class="knopf" data-a="buBriefAblegen">💾 In „Elternbriefe“ ablegen</button></div></div>`);
};
AKTIONEN.buBriefVorlage = (id) => AKTIONEN.buBriefNeu(id || undefined);
const briefWerte = () => formWerte(document.getElementById("briefForm"));
export function briefDrucken(betreff, text) {
  const k = konfig(), absender = [k.impressum_name || k.name || "Bachkreis Bergkamen", k.impressum_anschrift || ""].filter(Boolean).join(" · ").replace(/\n/g, ", ");
  const w = window.open("", "_blank"); if (!w) return toast("Bitte Pop-ups erlauben, um zu drucken.");
  w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(betreff)}</title><style>
    body{font:12pt/1.5 Georgia,serif;margin:20mm 22mm;color:#111} .kopf{display:flex;align-items:center;gap:14px;border-bottom:2px solid #d4a017;padding-bottom:8px;margin-bottom:24px}
    .kopf img{width:64px;height:64px} .kopf b{font-size:16pt} .abs{font-size:8pt;color:#555;margin-bottom:28px} .datum{text-align:right;margin-bottom:20px} h1{font-size:13pt;margin:0 0 16px}
    .fuss{position:fixed;bottom:12mm;left:22mm;right:22mm;font-size:8pt;color:#666;border-top:1px solid #ccc;padding-top:4px} @media print{button{display:none}}</style></head><body>
    <div class="kopf">${BACHKREIS_LOGO.replace('src="icons/', `src="${location.origin}${location.pathname.replace(/[^/]*$/, "")}icons/`)}<div><b>${esc(k.name || "Bachkreis Bergkamen")}</b><br>${esc(k.untertitel || "Jugendorchester")}</div></div>
    <div class="abs">${esc(absender)}</div><div class="datum">${esc(datum(new Date().toISOString()))}</div><h1>${esc(betreff)}</h1><div>${esc(text).replace(/\n/g, "<br>")}</div>
    <div class="fuss">${esc(absender)}${k.webseite ? " · " + esc(k.webseite) : ""}</div></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 400);
}
AKTIONEN.buBriefDrucken = () => { const f = briefWerte(); briefDrucken(f.betreff, String(f.text).replace(/\{vorname\}/g, "…")); };
AKTIONEN.buBriefSenden = () => { const f = briefWerte(); blattZu(); zeige("rundschreiben", { betreff: f.betreff, text: f.text }); };
AKTIONEN.buBriefAblegen = async () => {
  const f = briefWerte(); if (!String(f.betreff || "").trim()) return toast("Bitte einen Betreff eingeben.");
  const z = await speichere("dokumente", { titel: f.betreff.trim(), ordner: "elternbriefe", art: "info", jahr: new Date().getFullYear(), sichtbar: "leitung", beschreibung: `Brief vom ${datumKurz(new Date().toISOString())}`, inhalt: f.text });
  blattZu(); toast("💾 In „Elternbriefe“ abgelegt"); zeige("buerodok", { id: z?.id });
};
AKTIONEN.buDrucken = (id) => { const d = hole("dokumente", id); if (d) briefDrucken(d.titel, d.inhalt || ""); };
// ---------- 🗒️ Protokoll mit fester Gliederung ----------
AKTIONEN.buProtokollNeu = () => {
  BU.ordnerVorgabe = "protokolle";
  form({ ordner: "protokolle", art: "protokoll", sichtbar: "leitung", titel: `Protokoll ${datumKurz(new Date().toISOString())}`,
    inhalt: `Besprechung am ${datum(new Date().toISOString())}\nOrt: \nAnwesend: ${name(S.ich)}\nProtokoll: ${name(S.ich)}\n\nTOP 1 – \n\nTOP 2 – \n\nBeschlüsse:\n- \n\nAufgaben (wer · was · bis wann):\n- \n\nNächste Besprechung: ` });
};
AKTIONEN.dokOeffnen = AKTIONEN.dokOeffnen || (async (id) => { const d = hole("dokumente", id); try { await dateiOeffnen(String(d.datei).replace(/^datei:/, ""), d.titel, "application/pdf"); } catch (e) { toast("⚠️ " + e.message); } });

// 🔎 0.49.0 erst prüfen lassen, dann veröffentlichen (ohne Freigabe nur mit Rückfrage)
AKTIONEN.protokollVeroeffentlichen = (id) => vorVeroeffentlichen(hole("dokumente", id), () => AKTIONEN.protokollFreigeben(id));
