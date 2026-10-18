// 🏫 Vereinsleben (0.27.0) – Abgleich mit der Internetseite des Bachkreises:
// 📜 Chronik & Repertoire („Was haben wir schon gespielt?“) · 📂 Dokumente (Satzung, Flyer, Vorlagen) · 🏠 Austausch & Gastfamilien
// 📨 Auftrittsanfragen (Zusage legt den Termin an) · 🤝 Partner. Rechte setzt der Server (regeln.js); hier steht die Oberfläche.
import { S, VIEWS, zeichne, kopf, name, istEltern, hatRolle, istVerwalter } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, frage, zuLokal, vonLokal, herunterladen } from "../kern/ui.js";
import { liste, hole, speichere, loesche, konfig } from "../kern/daten.js";
import { tagIso, csvAus, anfrageZuTermin, auftrittsArt, repertoire as repertoireVon } from "../kern/logik.js";
import { db } from "./zustand.js";
import { CHRONIK_ARTEN, DOKUMENT_ARTEN, DOKUMENT_SICHT, PARTNER_ARTEN, ANFRAGE_STATUS, ANFRAGE_BESETZUNG, GASTGEBER_STATUS } from "../kern/schema.js";
import { hochladen, dateiOeffnen } from "../kern/dateien.js";
import { senden } from "../kern/versand.js";

const leitet = () => hatRolle("admin", "leitung", "lehrkraft");
const vorstandOderLeitung = () => leitet() || hatRolle("vorstand");
const opt = (o, w) => Object.entries(o).map(([k, t]) => `<option value="${k}" ${k === w ? "selected" : ""}>${esc(t)}</option>`).join("");
const feld = (t, inhalt) => `<div class="feld"><label>${t}</label>${inhalt}</div>`;
const uhrzeit = (iso) => (iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "");
const V = { tab: "chronik", suche: "", anfrageFilter: "offen" };

// ================= 📜 Chronik · 🎼 Repertoire · ℹ️ Über uns =================
VIEWS.chronik = {
  render(p = {}) {
    if (p.tab) { V.tab = p.tab; delete p.tab; }
    const tabs = [["chronik", "📜 Chronik"], ["repertoire", "🎼 Repertoire"], ["ueber", "ℹ️ Über uns"]];
    return kopf("📜 Chronik", vorstandOderLeitung() && V.tab === "chronik" ? '<button class="knopf klein" data-a="chNeu">＋ Eintrag</button>' : "")
      + `<div class="umschalter">${tabs.map(([k, t]) => `<button type="button" class="${V.tab === k ? "an" : ""}" data-a="chTab" data-x="${k}">${t}</button>`).join("")}</div>`
      + (V.tab === "repertoire" ? repertoireHtml() : V.tab === "ueber" ? ueberHtml() : chronikHtml());
  },
};
AKTIONEN.chTab = (k) => { V.tab = k; zeichne(); };
function chronikHtml() {
  const l = liste("chronik").sort((a, b) => b.jahr - a.jahr || String(b.datum || "").localeCompare(String(a.datum || "")));
  if (!l.length) return '<div class="leer">Noch keine Einträge.</div>';
  const jahrzehnte = [...new Set(l.map((c) => Math.floor(c.jahr / 10) * 10))];
  return jahrzehnte.map((jz) => `<div class="karte"><h3>${jz}er</h3><ol class="vl-zeitleiste">${l.filter((c) => Math.floor(c.jahr / 10) * 10 === jz).map((c) => `<li>
      <span class="vl-jahr">${c.jahr}</span><div class="fl"><div class="zeile-titel">${esc(CHRONIK_ARTEN[c.art]?.split(" ")[0] || "📌")} ${esc(c.titel)}</div>
      <div class="zeile-unter">${[c.datum ? datumKurz(c.datum) : "", c.ort, c.partner_id ? hole("partner", c.partner_id)?.name : ""].filter(Boolean).map(esc).join(" · ")}</div>
      ${c.beschreibung ? `<p class="vl-text">${esc(c.beschreibung)}</p>` : ""}${c.programm ? `<p class="vl-text">🎼 ${esc(c.programm).replace(/\n/g, " · ")}</p>` : ""}
      ${c.quelle ? `<small class="hinweis">Quelle: ${esc(c.quelle)}</small>` : ""}</div>
      ${vorstandOderLeitung() ? `<button type="button" class="knopf klein" data-a="chBearbeiten" data-x="${c.id}" aria-label="Bearbeiten">✏️</button>` : ""}</li>`).join("")}</ol></div>`).join("");
}
function chronikForm(c = {}) {
  blatt(c.id ? "📜 Eintrag bearbeiten" : "📜 Neuer Chronik-Eintrag", `<div id="chForm" class="vl-form"><div class="vl-raster">${feld("Jahr *", `<input type="number" name="jahr" value="${esc(c.jahr ?? new Date().getFullYear())}" min="1900" max="2100">`)}${feld("Datum (wenn bekannt)", `<input type="date" name="datum" value="${esc(c.datum || "")}">`)}${feld("Art", `<select name="art">${opt(CHRONIK_ARTEN, c.art || "konzert")}</select>`)}</div>
    ${feld("Was *", `<input name="titel" value="${esc(c.titel || "")}" placeholder="z. B. Frühlingskonzert mit Partnerorchester">`)}${feld("Ort", `<input name="ort" value="${esc(c.ort || "")}">`)}
    ${feld("Beschreibung", `<textarea name="beschreibung" rows="3">${esc(c.beschreibung || "")}</textarea>`)}${feld("Programm (ein Werk je Zeile: Komponist – Werk)", `<textarea name="programm" rows="3">${esc(c.programm || "")}</textarea>`)}
    ${feld("Projekt in der App", `<select name="projekt_id"><option value="">–</option>${liste("projekte").map((p) => `<option value="${p.id}" ${p.id === c.projekt_id ? "selected" : ""}>${esc(p.titel)}</option>`).join("")}</select>`)}
    <div class="vl-knoepfe"><button class="knopf haupt" data-a="chSpeichern" data-x="${esc(c.id || "")}">💾 Speichern</button>${c.id ? `<button class="knopf rot" data-a="chWeg" data-x="${c.id}">🗑 Löschen</button>` : ""}</div></div>`);
}
AKTIONEN.chNeu = () => chronikForm();
AKTIONEN.chBearbeiten = (id) => chronikForm(hole("chronik", id));
AKTIONEN.chSpeichern = async (id) => {
  const f = formWerte(document.getElementById("chForm")), jahr = Number(f.jahr);
  if (!f.titel || !(jahr >= 1900 && jahr <= 2100)) return toast("Bitte Jahr und „Was“ angeben");
  await speichere("chronik", { ...(id ? hole("chronik", id) : {}), jahr, datum: f.datum || null, titel: f.titel, art: f.art, ort: f.ort || null, beschreibung: f.beschreibung || null, programm: f.programm || null, projekt_id: f.projekt_id || null });
  blattZu(); toast("📜 Gespeichert"); zeichne();
};
AKTIONEN.chWeg = async (id) => { if (await frage("Eintrag löschen?")) { await loesche("chronik", id); blattZu(); zeichne(); } };

const repertoire = () => repertoireVon(db);
function repertoireHtml() {
  const q = V.suche.toLowerCase(), l = repertoire().filter((e) => !q || e.anzeige.toLowerCase().includes(q));
  return `<div class="karte"><div class="feld"><label for="vlSuche">Suchen (Komponist oder Werk)</label><input id="vlSuche" type="search" data-c="vlSuche" value="${esc(V.suche)}" placeholder="z. B. Mozart"></div>
    <p class="hinweis">${l.length} Werke aus den Konzertprogrammen und der Chronik – hilft bei der Programmplanung: Was haben wir wann schon gespielt?</p></div>
    <div class="karte"><ul class="liste">${l.map((e) => `<li><div class="fl"><div class="zeile-titel">🎼 ${esc(e.anzeige)}</div><div class="zeile-unter">${e.auftritte.map((a) => `${a.jahr || "?"} · ${esc(a.anlass)}`).join(" | ")}</div></div><span class="badge">${e.auftritte.length}×</span></li>`).join("") || '<li class="hinweis">Nichts gefunden.</li>'}</ul>
    ${leitet() ? '<div class="vl-knoepfe"><button class="knopf klein" data-a="vlRepCsv">⬇️ Als Liste (CSV)</button></div>' : ""}</div>`;
}
AKTIONEN.vlSuche = (v) => { V.suche = v; zeichne(); document.getElementById("vlSuche")?.focus(); };
AKTIONEN.vlRepCsv = () => herunterladen(`repertoire-${tagIso(new Date())}.csv`, "﻿" + csvAus(repertoire().map((e) => ({ Werk: e.anzeige, Auffuehrungen: e.auftritte.length, Wann: e.auftritte.map((a) => `${a.jahr || "?"} ${a.anlass}`).join("; ") })), ["Werk", "Auffuehrungen", "Wann"]), "text/csv");
function ueberHtml() {
  const k = konfig(), partner = liste("partner").sort((a, b) => (a.seit || 9999) - (b.seit || 9999));
  return `<div class="karte"><h3>${esc(k.name || "Bachkreis Bergkamen")}</h3>
    <ul class="vl-fakten"><li>🎻 Jugendsinfonieorchester des Städtischen Gymnasiums Bergkamen, gegründet 1969</li><li>👥 Zwei Orchester mit je etwa 50 Kindern und Jugendlichen von 10 bis 18 Jahren</li>
      <li>🅰️ A-Orchester: Jahrgänge 9–12 · 🅱️ B-Orchester: Jahrgänge 5–9</li><li>🌱 Einstieg über Orchesterklasse, Streicher- und Bläser-AGs</li>
      <li>🌍 Austausche u. a. mit England, Frankreich, Israel, Italien, Kolumbien, Malaysia, Norwegen, Polen, Singapur, der Türkei, Ungarn, den USA, China, Russland, Paraguay und Peru; im Inland mit Westerstede und Emden</li>
      <li>🎼 Über 900 Konzerte und Veranstaltungen, zwei CDs, vier Schallplatten, Uraufführungen</li><li>🎓 Soloauftritte, Dirigier- und Kompositionsversuche</li></ul>
    <div class="vl-knoepfe">${k.webseite ? `<a class="knopf" href="${esc(k.webseite)}" target="_blank" rel="noopener">🌐 Zur Internetseite ↗</a>` : ""}${k.instagram ? `<a class="knopf" href="${esc(k.instagram)}" target="_blank" rel="noopener">📸 Instagram ↗</a>` : ""}</div>
    <p class="hinweis">Angaben laut Internetseite der Schule.</p></div>
    ${partner.length ? `<div class="karte"><h3>🤝 Partner</h3><ul class="liste">${partner.map((p) => `<li><div class="fl"><div class="zeile-titel">${esc(PARTNER_ARTEN[p.art]?.split(" ")[0] || "🤝")} ${esc(p.name)}</div><div class="zeile-unter">${[p.ort, p.seit ? `seit ${p.seit}` : ""].filter(Boolean).map(esc).join(" · ")}</div></div>${p.website ? `<a class="knopf klein" href="${esc(p.website)}" target="_blank" rel="noopener">↗</a>` : ""}</li>`).join("")}</ul></div>` : ""}`;
}

// ================= 📂 Dokumente =================
VIEWS.dokumente = {
  render() {
    const l = liste("dokumente").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99) || a.titel.localeCompare(b.titel, "de"));
    const arten = Object.keys(DOKUMENT_ARTEN).filter((a) => l.some((d) => d.art === a)).concat(l.some((d) => !d.art) ? [""] : []);
    return kopf("📂 Dokumente", vorstandOderLeitung() ? '<button class="knopf klein" data-a="dokNeu">＋ Dokument</button>' : "")
      + (arten.map((a) => `<div class="karte"><h3>${esc(DOKUMENT_ARTEN[a] || "📄 Sonstiges")}</h3><ul class="liste">${l.filter((d) => (d.art || "") === a).map((d) => `<li><div class="fl"><div class="zeile-titel">${esc(d.titel)}</div>
          <div class="zeile-unter">${[d.fassung ? `Stand ${d.fassung}` : "", d.beschreibung, vorstandOderLeitung() && d.sichtbar && d.sichtbar !== "alle" ? `👁️ ${DOKUMENT_SICHT[d.sichtbar]}` : ""].filter(Boolean).map(esc).join(" · ")}</div></div>
          <div class="vl-akt">${d.datei ? `<button type="button" class="knopf klein haupt" data-a="dokOeffnen" data-x="${d.id}">📄 Öffnen</button>` : d.url ? `<a class="knopf klein haupt" href="${esc(d.url)}" target="_blank" rel="noopener">🔗 Öffnen</a>` : '<span class="badge">liegt bei der Leitung</span>'}
          ${vorstandOderLeitung() ? `<button type="button" class="knopf klein" data-a="dokBearbeiten" data-x="${d.id}" aria-label="Bearbeiten">✏️</button>` : ""}</div></li>`).join("")}</ul></div>`).join("") || '<div class="leer">Noch keine Dokumente.</div>')
      + '<p class="hinweis">Hochgeladene Dateien sind geschützt: Nur wer das Dokument sehen darf, kann sie öffnen.</p>';
  },
};
const DF = { datei: null };
function dokForm(d = {}) {
  DF.datei = d.datei || null;
  blatt(d.id ? "📂 Dokument bearbeiten" : "📂 Neues Dokument", `<div id="dokForm" class="vl-form">${feld("Titel *", `<input name="titel" value="${esc(d.titel || "")}">`)}
    <div class="vl-raster">${feld("Art", `<select name="art">${opt(DOKUMENT_ARTEN, d.art || "info")}</select>`)}${feld("Sichtbar für", `<select name="sichtbar">${opt(DOKUMENT_SICHT, d.sichtbar || "alle")}</select>`)}${feld("Stand / Fassung", `<input name="fassung" value="${esc(d.fassung || "")}">`)}</div>
    ${feld("Kurzbeschreibung", `<input name="beschreibung" value="${esc(d.beschreibung || "")}">`)}
    ${feld("Datei hochladen (PDF, Word …)", `<input type="file" data-c="dokDatei" accept=".pdf,.doc,.docx,.odt,.xlsx,.png,.jpg">${DF.datei ? '<small class="hinweis" id="dokDateiOk">✅ Datei vorhanden</small>' : '<small class="hinweis" id="dokDateiOk"></small>'}`)}
    ${feld("… oder Link", `<input name="url" type="url" value="${esc(d.url || "")}" placeholder="https://…">`)}
    <div class="vl-knoepfe"><button class="knopf haupt" data-a="dokSpeichern" data-x="${esc(d.id || "")}">💾 Speichern</button>${d.id ? `<button class="knopf rot" data-a="dokWeg" data-x="${d.id}">🗑 Löschen</button>` : ""}</div></div>`);
}
AKTIONEN.dokNeu = () => dokForm();
AKTIONEN.dokBearbeiten = (id) => dokForm(hole("dokumente", id));
AKTIONEN.dokDatei = async (_, el) => {
  const f = el.files?.[0]; if (!f) return;
  try { const r = await hochladen(f, { art: "datei" }); DF.datei = "datei:" + r.id; const ok = document.getElementById("dokDateiOk"); if (ok) ok.textContent = `✅ ${f.name}`; } catch (e) { toast(e.message); }
};
AKTIONEN.dokSpeichern = async (id) => {
  const f = formWerte(document.getElementById("dokForm"));
  if (!f.titel) return toast("Bitte einen Titel angeben");
  if (f.url && !/^https:\/\//.test(f.url)) return toast("Links bitte mit https:// angeben");
  await speichere("dokumente", { ...(id ? hole("dokumente", id) : {}), titel: f.titel, art: f.art, sichtbar: f.sichtbar, fassung: f.fassung || null, beschreibung: f.beschreibung || null, datei: DF.datei, url: f.url || null });
  blattZu(); toast("📂 Gespeichert"); zeichne();
};
AKTIONEN.dokWeg = async (id) => { if (await frage("Dokument löschen?")) { await loesche("dokumente", id); blattZu(); zeichne(); } };
AKTIONEN.dokOeffnen = async (id) => { const d = hole("dokumente", id); try { await dateiOeffnen(String(d.datei).replace(/^datei:/, ""), d.titel, "application/pdf"); } catch (e) { toast(e.message); } };

// ================= 🏠 Austausch & Gastfamilien =================
export const austauschProjekte = () => liste("projekte", (p) => p.gastfamilien && (!p.bis || p.bis >= tagIso(new Date()))).sort((a, b) => String(a.von || "").localeCompare(String(b.von || "")));
function bedarf(pr) {
  const gg = liste("gastgeber", (g) => g.projekt_id === pr.id && g.status !== "abgesagt"), gaeste = liste("gaeste", (g) => g.projekt_id === pr.id);
  return { gg, gaeste, plaetze: gg.reduce((s, g) => s + (Number(g.plaetze) || 0), 0), bestaetigt: gg.filter((g) => g.status === "bestaetigt").reduce((s, g) => s + (Number(g.plaetze) || 0), 0),
    erwartet: Number(pr.gaeste_anzahl) || gaeste.length, ohne: gaeste.filter((g) => !g.gastgeber_id).length };
}
VIEWS.austausch = {
  render() {
    const l = austauschProjekte();
    return kopf("🏠 Austausch & Gastfamilien") + (l.map((pr) => (leitet() ? austauschLeitung(pr) : austauschEltern(pr))).join("")
      || '<div class="leer">Gerade werden keine Gastfamilien gesucht.</div>');
  },
};
const projektKopf = (pr) => `<h3>${esc(pr.titel)}</h3><p class="zeile-unter">${pr.von ? datumKurz(pr.von) : ""}${pr.bis && pr.bis !== pr.von ? ` – ${datumKurz(pr.bis)}` : ""}${pr.partner_id ? ` · 🤝 ${esc(hole("partner", pr.partner_id)?.name || "")}` : ""}</p>`;
const balken = (b) => `<div class="vl-bedarf"><div class="vl-balken"><i style="width:${Math.min(100, b.erwartet ? (b.plaetze / b.erwartet) * 100 : 0)}%"></i></div><small>${b.plaetze} von ${b.erwartet} Plätzen angeboten · ${b.bestaetigt} bestätigt</small></div>`;
function austauschEltern(pr) {
  const mein = liste("gastgeber", (g) => g.projekt_id === pr.id && g.person_id === S.ich.id)[0], b = bedarf(pr);
  const gaeste = mein ? liste("gaeste", (g) => g.gastgeber_id === mein.id) : [];
  return `<div class="karte">${projektKopf(pr)}${pr.beschreibung ? `<p>${esc(pr.beschreibung)}</p>` : ""}${balken(b)}
    ${mein && mein.status !== "abgesagt" ? `<div class="vl-box"><b>🏠 Euer Angebot: ${mein.plaetze} ${Number(mein.plaetze) === 1 ? "Platz" : "Plätze"}</b> <span class="badge ${mein.status === "bestaetigt" ? "b-gruen" : "b-gelb"}">${esc(GASTGEBER_STATUS[mein.status] || "")}</span>
        ${mein.schlafplatz ? `<div class="zeile-unter">${esc(mein.schlafplatz)}</div>` : ""}
        ${gaeste.length ? `<h4>🧳 Eure Gäste</h4><ul class="liste">${gaeste.map((g) => `<li><div class="fl"><div class="zeile-titel">${esc(`${g.vorname} ${g.nachname || ""}`)}${g.alter ? `, ${g.alter} J.` : ""}</div><div class="zeile-unter">${[g.instrument, g.herkunft, g.ankunft ? `Ankunft ${datumKurz(g.ankunft)} ${uhrzeit(g.ankunft)}` : "", g.abreise ? `Abreise ${datumKurz(g.abreise)}` : ""].filter(Boolean).map(esc).join(" · ")}</div>
          ${g.essen || g.allergien ? `<div class="vl-hinweis">🍽️ ${esc([g.essen, g.allergien].filter(Boolean).join(" · "))}</div>` : ""}${g.notfall_tel ? `<a class="knopf klein" href="tel:${esc(g.notfall_tel)}">📞 Begleitung</a>` : ""}</div></li>`).join("")}</ul>` : '<p class="hinweis">Die Leitung teilt die Gäste zu – ihr bekommt Bescheid.</p>'}
        <div class="vl-knoepfe"><button class="knopf klein" data-a="ggForm" data-x="${pr.id}">✏️ Ändern</button><button class="knopf klein rot" data-a="ggAbsagen" data-x="${mein.id}">Absagen</button></div></div>`
      : istEltern() ? `<div class="vl-knoepfe"><button class="knopf haupt" data-a="ggForm" data-x="${pr.id}">🏠 Wir nehmen Gäste auf</button></div>` : '<p class="hinweis">Gastfamilien melden sich über die Eltern-Ansicht.</p>'}</div>`;
}
AKTIONEN.ggForm = (pid) => {
  const mein = liste("gastgeber", (g) => g.projekt_id === pid && g.person_id === S.ich.id)[0] || {};
  blatt("🏠 Gäste aufnehmen", `<div id="ggForm" class="vl-form">${feld("Wie viele Gäste?", `<div class="ub-chips">${[1, 2, 3, 4].map((n) => `<label class="vl-chip"><input type="radio" name="plaetze" value="${n}" ${Number(mein.plaetze || 1) === n ? "checked" : ""}> ${n}</label>`).join("")}</div>`)}
    ${feld("Schlafplatz", `<input name="schlafplatz" value="${esc(mein.schlafplatz || "")}" placeholder="z. B. eigenes Zimmer, Gästebett">`)}${feld("Hinweise", `<textarea name="hinweise" rows="3" placeholder="Haustiere, Essen, Abholung …">${esc(mein.hinweise || "")}</textarea>`)}
    <div class="vl-knoepfe"><button class="knopf haupt" data-a="ggSpeichern" data-x="${pid}">💾 Angebot senden</button></div><p class="hinweis">Die Leitung bestätigt und teilt die Gäste zu. Ihr seht dann Name, Alter, Ankunft und wichtige Hinweise eurer Gäste.</p></div>`);
};
AKTIONEN.ggSpeichern = async (pid) => {
  const f = formWerte(document.getElementById("ggForm")), alt = liste("gastgeber", (g) => g.projekt_id === pid && g.person_id === S.ich.id)[0];
  await speichere("gastgeber", { ...(alt || {}), projekt_id: pid, person_id: S.ich.id, plaetze: Number(f.plaetze) || 1, schlafplatz: f.schlafplatz, hinweise: f.hinweise, status: alt?.status === "abgesagt" ? "angeboten" : alt?.status || "angeboten" });
  blattZu(); toast("🏠 Danke! Euer Angebot ist bei der Leitung."); zeichne();
};
AKTIONEN.ggAbsagen = async (id) => { if (await frage("Angebot wirklich zurückziehen?")) { await speichere("gastgeber", { ...hole("gastgeber", id), status: "abgesagt" }); zeichne(); } };
function austauschLeitung(pr) {
  const b = bedarf(pr), belegt = (g) => b.gaeste.filter((x) => x.gastgeber_id === g.id).length;
  return `<div class="karte">${projektKopf(pr)}${balken(b)}
    <div class="vl-zahlen"><span><b>${b.gaeste.length}</b> Gäste erfasst</span><span><b>${b.ohne}</b> ohne Familie</span><span><b>${b.gg.length}</b> Familien</span></div>
    <h4>🏠 Gastfamilien</h4><ul class="liste">${b.gg.map((g) => `<li><div class="fl"><div class="zeile-titel">${esc(name(g.person_id))} <span class="badge ${g.status === "bestaetigt" ? "b-gruen" : "b-gelb"}">${esc(GASTGEBER_STATUS[g.status] || "")}</span></div>
        <div class="zeile-unter">${belegt(g)} von ${g.plaetze} belegt${g.schlafplatz ? ` · ${esc(g.schlafplatz)}` : ""}${g.hinweise ? ` · ${esc(g.hinweise)}` : ""}</div></div>
        ${g.status !== "bestaetigt" ? `<button class="knopf klein" data-a="ggBestaetigen" data-x="${g.id}">✅ Bestätigen</button>` : ""}</li>`).join("") || '<li class="hinweis">Noch keine Angebote.</li>'}</ul>
    <h4>🧳 Gäste</h4><ul class="liste">${b.gaeste.map((g) => `<li><div class="fl"><div class="zeile-titel">${esc(`${g.vorname} ${g.nachname || ""}`)}${g.alter ? `, ${g.alter} J.` : ""}</div><div class="zeile-unter">${[g.instrument, g.herkunft].filter(Boolean).map(esc).join(" · ")}</div></div>
        <select data-c="gastZuordnen" data-x="${g.id}" aria-label="Gastfamilie für ${esc(g.vorname)}"><option value="">– Familie wählen –</option>${b.gg.map((h) => `<option value="${h.id}" ${h.id === g.gastgeber_id ? "selected" : ""} ${h.id !== g.gastgeber_id && belegt(h) >= h.plaetze ? "disabled" : ""}>${esc(name(h.person_id))} (${belegt(h)}/${h.plaetze})</option>`).join("")}</select></li>`).join("") || '<li class="hinweis">Noch keine Gäste erfasst.</li>'}</ul>
    <div class="vl-knoepfe"><button class="knopf" data-a="gastNeu" data-x="${pr.id}">＋ Gast</button><button class="knopf" data-a="ggSuchen" data-x="${pr.id}">📣 Gastfamilien suchen</button><button class="knopf" data-a="ggListe" data-x="${pr.id}">⬇️ Zuordnung (CSV)</button></div></div>`;
}
AKTIONEN.ggBestaetigen = async (id) => {
  const g = hole("gastgeber", id); await speichere("gastgeber", { ...g, status: "bestaetigt" });
  await senden({ an: [g.person_id], betreff: `🏠 Danke – ihr seid Gastfamilie: ${hole("projekte", g.projekt_id)?.titel || ""}`, text: "Die Leitung hat euer Angebot bestätigt. Eure Gäste seht ihr in der App unter „Austausch & Gastfamilien“.", ereignis: "standard" });
  toast("✅ Bestätigt"); zeichne();
};
AKTIONEN.gastZuordnen = async (v, el) => { const g = hole("gaeste", el.dataset.x); await speichere("gaeste", { ...g, gastgeber_id: v || null }); toast(v ? `🧳 ${g.vorname} zugeordnet` : "Zuordnung entfernt"); zeichne(); };
AKTIONEN.gastNeu = (pid) => blatt("🧳 Gast erfassen", `<div id="gastForm" class="vl-form"><div class="vl-raster">${feld("Vorname *", '<input name="vorname">')}${feld("Nachname", '<input name="nachname">')}${feld("Alter", '<input type="number" name="alter" min="6" max="30">')}</div>
  <div class="vl-raster">${feld("Kommt aus", '<input name="herkunft">')}${feld("Instrument", '<input name="instrument">')}${feld("Essen", '<input name="essen" placeholder="vegetarisch …">')}</div>
  <div class="vl-raster">${feld("Ankunft", '<input type="datetime-local" name="ankunft">')}${feld("Abreise", '<input type="datetime-local" name="abreise">')}${feld("Notfall: Begleitung (Telefon)", '<input type="tel" name="notfall_tel">')}</div>
  ${feld("Allergien / Gesundheit (sieht die Gastfamilie)", '<textarea name="allergien" rows="2"></textarea>')}<div class="vl-knoepfe"><button class="knopf haupt" data-a="gastSpeichern" data-x="${pid}">💾 Speichern</button></div></div>`);
AKTIONEN.gastSpeichern = async (pid) => {
  const f = formWerte(document.getElementById("gastForm"));
  if (!f.vorname) return toast("Bitte einen Vornamen angeben");
  await speichere("gaeste", { projekt_id: pid, vorname: f.vorname, nachname: f.nachname || null, alter: Number(f.alter) || null, herkunft: f.herkunft || null, instrument: f.instrument || null, essen: f.essen || null, allergien: f.allergien || null, notfall_tel: f.notfall_tel || null, ankunft: f.ankunft ? vonLokal(f.ankunft) : null, abreise: f.abreise ? vonLokal(f.abreise) : null, gastgeber_id: null });
  blattZu(); zeichne();
};
AKTIONEN.ggSuchen = async (pid) => {
  const pr = hole("projekte", pid), an = liste("personen", (p) => p.typ === "eltern" && p.status !== "ausgetreten").map((p) => p.id);
  if (!(await frage(`Alle ${an.length} Eltern bitten, Gäste aufzunehmen?`))) return;
  await senden({ an, betreff: `🏠 Gastfamilien gesucht: ${pr.titel}`, text: `${pr.beschreibung || ""} Wir suchen Familien, die ${pr.gaeste_anzahl || "einige"} Gäste aufnehmen. In der App unter „Austausch & Gastfamilien“ könnt ihr Plätze anbieten.`, ereignis: "standard" });
  toast("📣 Aufruf gesendet");
};
AKTIONEN.ggListe = (pid) => {
  const z = liste("gaeste", (g) => g.projekt_id === pid).map((g) => { const h = hole("gastgeber", g.gastgeber_id); return { Gast: `${g.vorname} ${g.nachname || ""}`.trim(), Alter: g.alter || "", Herkunft: g.herkunft || "", Gastfamilie: h ? name(h.person_id) : "– offen –", Essen: g.essen || "", Allergien: g.allergien || "" }; });
  herunterladen(`gastfamilien-${tagIso(new Date())}.csv`, "﻿" + csvAus(z, ["Gast", "Alter", "Herkunft", "Gastfamilie", "Essen", "Allergien"]), "text/csv");
};

// ================= 📨 Auftrittsanfragen =================
VIEWS.anfragen = {
  render() {
    const offen = ["neu", "pruefung"], f = V.anfrageFilter;
    const l = liste("anfragen", (a) => (f === "offen" ? offen.includes(a.status || "neu") : f === "alle" || a.status === f)).sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")));
    const chips = [["offen", "offen"], ["zugesagt", "zugesagt"], ["abgesagt", "abgesagt"], ["alle", "alle"]];
    return kopf("📨 Auftrittsanfragen", '<button class="knopf klein" data-a="anNeu">＋ Anfrage</button>')
      + `<div class="umschalter">${chips.map(([k, t]) => `<button type="button" class="${f === k ? "an" : ""}" data-a="anFilter" data-x="${k}">${t}</button>`).join("")}</div>`
      + (l.map((a) => `<div class="karte vl-anfrage"><div class="vl-anfrage-kopf"><b>${esc(a.anlass)}</b><span class="badge">${esc(ANFRAGE_STATUS[a.status || "neu"])}</span></div>
        <div class="zeile-unter">${[a.veranstalter, a.datum ? `${datumKurz(a.datum)} ${uhrzeit(a.datum)}` : "Datum offen", a.ort, a.dauer_min ? `${a.dauer_min} Min.` : "", ANFRAGE_BESETZUNG[a.besetzung], a.honorar ? `${Number(a.honorar).toLocaleString("de-DE")} €` : ""].filter(Boolean).map(esc).join(" · ")}</div>
        ${a.kontakt_name || a.kontakt_tel || a.kontakt_email ? `<div class="zeile-unter">👤 ${esc([a.kontakt_name, a.kontakt_tel, a.kontakt_email].filter(Boolean).join(" · "))}</div>` : ""}${a.notiz ? `<p class="vl-text">${esc(a.notiz)}</p>` : ""}
        ${a.termin_id ? `<p class="hinweis">📅 Termin angelegt: ${esc(hole("termine", a.termin_id)?.titel || "")}</p>` : ""}
        <div class="vl-knoepfe">${!["zugesagt", "abgesagt", "erledigt"].includes(a.status) ? `<button class="knopf klein haupt" data-a="anZusagen" data-x="${a.id}">✅ Zusagen & Termin anlegen</button><button class="knopf klein" data-a="anStatus" data-x="${a.id}|pruefung">🔎 in Prüfung</button><button class="knopf klein rot" data-a="anStatus" data-x="${a.id}|abgesagt">❌ Absagen</button>` : ""}<button class="knopf klein" data-a="anBearbeiten" data-x="${a.id}">✏️ Bearbeiten</button></div></div>`).join("") || '<div class="leer">Keine Anfragen.</div>');
  },
};
AKTIONEN.anFilter = (k) => { V.anfrageFilter = k; zeichne(); };
function anfrageForm(a = {}) {
  blatt(a.id ? "📨 Anfrage bearbeiten" : "📨 Neue Auftrittsanfrage", `<div id="anForm" class="vl-form">${feld("Anlass *", `<input name="anlass" value="${esc(a.anlass || "")}" placeholder="z. B. Gottesdienst, Empfang, Jubiläum">`)}
    <div class="vl-raster">${feld("Veranstalter *", `<input name="veranstalter" value="${esc(a.veranstalter || "")}">`)}${feld("Ansprechpartner/in", `<input name="kontakt_name" value="${esc(a.kontakt_name || "")}">`)}${feld("Telefon", `<input type="tel" name="kontakt_tel" value="${esc(a.kontakt_tel || "")}">`)}</div>
    <div class="vl-raster">${feld("E-Mail", `<input type="email" name="kontakt_email" value="${esc(a.kontakt_email || "")}">`)}${feld("Wann", `<input type="datetime-local" name="datum" value="${esc(a.datum ? zuLokal(a.datum) : "")}">`)}${feld("Dauer (Min.)", `<input type="number" name="dauer_min" min="5" value="${esc(a.dauer_min ?? "")}">`)}</div>
    <div class="vl-raster">${feld("Ort", `<input name="ort" value="${esc(a.ort || "")}">`)}${feld("Besetzung", `<select name="besetzung">${opt(ANFRAGE_BESETZUNG, a.besetzung || "a")}</select>`)}${feld("Honorar / Spende (€)", `<input type="number" name="honorar" min="0" value="${esc(a.honorar ?? "")}">`)}</div>
    ${feld("Es spielen", `<div class="wahlen">${liste("gruppen", (g) => g.aktiv !== false).map((g) => `<label><input type="checkbox" name="gruppen" data-mehr="1" value="${g.id}" ${(a.gruppen || []).includes(g.id) ? "checked" : ""}> ${esc(g.name)}</label>`).join("")}</div>`)}
    ${feld("Notiz", `<textarea name="notiz" rows="2">${esc(a.notiz || "")}</textarea>`)}
    <div class="vl-knoepfe"><button class="knopf haupt" data-a="anSpeichern" data-x="${esc(a.id || "")}">💾 Speichern</button>${a.id ? `<button class="knopf rot" data-a="anWeg" data-x="${a.id}">🗑 Löschen</button>` : ""}</div></div>`);
}
AKTIONEN.anNeu = () => anfrageForm();
AKTIONEN.anBearbeiten = (id) => anfrageForm(hole("anfragen", id));
AKTIONEN.anSpeichern = async (id) => {
  const f = formWerte(document.getElementById("anForm"));
  if (!f.anlass || !f.veranstalter) return toast("Bitte Anlass und Veranstalter angeben");
  const alt = id ? hole("anfragen", id) : null;
  await speichere("anfragen", { ...(alt || {}), anlass: f.anlass, veranstalter: f.veranstalter, kontakt_name: f.kontakt_name || null, kontakt_tel: f.kontakt_tel || null, kontakt_email: f.kontakt_email || null, datum: f.datum ? vonLokal(f.datum) : null,
    dauer_min: Number(f.dauer_min) || null, ort: f.ort || null, besetzung: f.besetzung, honorar: f.honorar === "" ? null : Number(f.honorar), gruppen: f.gruppen || [], notiz: f.notiz || null, status: alt?.status || "neu", eingegangen_am: alt?.eingegangen_am || tagIso(new Date()) });
  blattZu(); toast("📨 Gespeichert"); zeichne();
};
AKTIONEN.anWeg = async (id) => { if (await frage("Anfrage löschen?")) { await loesche("anfragen", id); blattZu(); zeichne(); } };
AKTIONEN.anStatus = async (x) => { const [id, st] = x.split("|"); await speichere("anfragen", { ...hole("anfragen", id), status: st }); zeichne(); };
// ✅ Zusage: Termin für die Gruppen anlegen (Art „Konzert / Auftritt“), Anfrage verknüpfen
AKTIONEN.anZusagen = async (id) => {
  const a = hole("anfragen", id);
  if (!a.datum) return toast("Bitte erst das Datum eintragen (✏️ Bearbeiten)");
  if (!(a.gruppen || []).length) return toast("Bitte erst wählen, wer spielt (✏️ Bearbeiten)");
  const t = await speichere("termine", anfrageZuTermin(a, auftrittsArt(db)?.id));
  await speichere("anfragen", { ...a, status: "zugesagt", termin_id: t.id });
  toast("✅ Zugesagt – Termin ist angelegt"); zeichne();
};

// ================= 🤝 Partner (Leitung, Lehrkräfte, Vorstand) =================
VIEWS.partner = {
  render() {
    const l = liste("partner").sort((a, b) => a.name.localeCompare(b.name, "de"));
    return kopf("🤝 Partner & Kontakte", '<button class="knopf klein" data-a="paNeu">＋ Partner</button>')
      + (l.map((p) => `<div class="karte"><div class="vl-anfrage-kopf"><b>${esc(PARTNER_ARTEN[p.art]?.split(" ")[0] || "🤝")} ${esc(p.name)}</b>${p.seit ? `<span class="badge">seit ${p.seit}</span>` : ""}</div>
        <div class="zeile-unter">${[PARTNER_ARTEN[p.art]?.replace(/^\S+\s/, ""), p.ort, p.land].filter(Boolean).map(esc).join(" · ")}</div>
        ${p.ansprechpartner || p.telefon || p.email ? `<div class="zeile-unter">👤 ${esc([p.ansprechpartner, p.telefon, p.email].filter(Boolean).join(" · "))}</div>` : ""}${p.notiz ? `<p class="vl-text">${esc(p.notiz)}</p>` : ""}
        ${p.letzte_begegnung || p.naechste_planung ? `<p class="hinweis">${p.letzte_begegnung ? `Zuletzt: ${datumKurz(p.letzte_begegnung)}` : ""}${p.naechste_planung ? ` · Als Nächstes: ${esc(p.naechste_planung)}` : ""}</p>` : ""}
        <div class="vl-knoepfe">${p.website ? `<a class="knopf klein" href="${esc(p.website)}" target="_blank" rel="noopener">🌐 Internetseite ↗</a>` : ""}<button class="knopf klein" data-a="paBearbeiten" data-x="${p.id}">✏️ Bearbeiten</button></div></div>`).join("") || '<div class="leer">Noch keine Partner.</div>');
  },
};
function partnerForm(p = {}) {
  blatt(p.id ? "🤝 Partner bearbeiten" : "🤝 Neuer Partner", `<div id="paForm" class="vl-form">${feld("Name *", `<input name="name" value="${esc(p.name || "")}">`)}
    <div class="vl-raster">${feld("Art", `<select name="art">${opt(PARTNER_ARTEN, p.art || "orchester")}</select>`)}${feld("Ort", `<input name="ort" value="${esc(p.ort || "")}">`)}${feld("Land", `<input name="land" value="${esc(p.land || "")}">`)}</div>
    <div class="vl-raster">${feld("Ansprechpartner/in", `<input name="ansprechpartner" value="${esc(p.ansprechpartner || "")}">`)}${feld("Telefon", `<input type="tel" name="telefon" value="${esc(p.telefon || "")}">`)}${feld("E-Mail", `<input type="email" name="email" value="${esc(p.email || "")}">`)}</div>
    <div class="vl-raster">${feld("Internetseite", `<input type="url" name="website" value="${esc(p.website || "")}">`)}${feld("Partner seit (Jahr)", `<input type="number" name="seit" value="${esc(p.seit ?? "")}">`)}${feld("Letzte Begegnung", `<input type="date" name="letzte_begegnung" value="${esc(p.letzte_begegnung || "")}">`)}</div>
    ${feld("Nächste Planung", `<input name="naechste_planung" value="${esc(p.naechste_planung || "")}">`)}${feld("Notiz", `<textarea name="notiz" rows="2">${esc(p.notiz || "")}</textarea>`)}
    <div class="vl-knoepfe"><button class="knopf haupt" data-a="paSpeichern" data-x="${esc(p.id || "")}">💾 Speichern</button></div></div>`);
}
AKTIONEN.paNeu = () => partnerForm();
AKTIONEN.paBearbeiten = (id) => partnerForm(hole("partner", id));
AKTIONEN.paSpeichern = async (id) => {
  const f = formWerte(document.getElementById("paForm"));
  if (!f.name) return toast("Bitte einen Namen angeben");
  await speichere("partner", { ...(id ? hole("partner", id) : {}), ...Object.fromEntries(["name", "art", "ort", "land", "ansprechpartner", "telefon", "email", "website", "letzte_begegnung", "naechste_planung", "notiz"].map((k) => [k, f[k] || null])), seit: Number(f.seit) || null });
  blattZu(); toast("🤝 Gespeichert"); zeichne();
};
export const anfragenOffen = () => liste("anfragen", (a) => ["neu", "pruefung"].includes(a.status || "neu")).length;
export const zeigtPartner = () => istVerwalter() && (leitet() || hatRolle("vorstand"));
