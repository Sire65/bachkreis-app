// 📚 Notenarchiv (0.13.0) – in drei Ebenen: 🎻 Orchester / Klasse › 🎼 Stücke › 📄 Noten nach Instrument.
// Jede Ebene als 🔲 Kacheln oder ☰ Liste (das Gerät merkt sich die Wahl), Stücke mit Suche, Chips und ⚙️ Filter.
// Ein Stück gehört zu den Orchestern/Klassen aus „für Orchester / Klasse“ (werke.gruppen), sonst zu den Gruppen seiner Stimmen.
// Werke, Stimmen und Zuordnung pflegt die PC-Verwaltung; PDFs hängt man hier mit „📤“ an eine Stimme.
import { VIEWS, db, zeige, zeichne, kopf, name, einst, einstSetzen, hatRolle } from "./zustand.js";
import { esc, AKTIONEN } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";
import { instrumenteVon } from "../kern/logik.js";
import { INSTRUMENT_GRUPPEN } from "../kern/schema.js";

const RECHTE = { gemeinfrei: ["b-gruen", "gemeinfrei"], lizenziert: ["b-gelb", "lizenziert"], intern: ["b-blau", "nur intern"] };
const STUFE = { leicht: "🟢 leicht", mittel: "🟡 mittel", schwer: "🔴 schwer" };
const ANSICHTEN = [["kachel", "🔲", "Kacheln"], ["liste", "☰", "Liste"]];
const SORT = { komponist: "Komponist", titel: "Titel", stufe: "Schwierigkeit", fehlt: "fehlende PDFs zuerst" };
const ALLE = "alle", OHNE = "ohne";
const NF = { q: "", rechte: "", projekt: "", register: "", stufe: "", pdf: "", panel: false, familie: "" };
const darf = () => hatRolle("leitung", "admin", "lehrkraft", "notenwart");
const ansicht = () => einst().notenAnsicht || "kachel";
const hatPdf = (s) => !!s.datei?.startsWith("datei:");
const famVon = (s) => (s.register_id ? hole("register", s.register_id)?.familie || "sonstige" : s.person_id ? "solo" : "partitur");
const FAM = { partitur: ["📖", "Partitur"], ...INSTRUMENT_GRUPPEN, solo: ["⭐", "Solo / Sonderstimmen"] };
const FAM_REIHE = ["partitur", "streicher", "holz", "blech", "schlag", "tasten", "sonstige", "solo"];

// Zu welchen Orchestern/Klassen gehört ein Stück?
export function werkGruppen(w) {
  if (w.gruppen?.length) return w.gruppen;
  return [...new Set(liste("stimmen", (s) => s.werk_id === w.id && s.gruppe_id).map((s) => s.gruppe_id))];
}
// Stimmen eines Stücks – für ein Orchester nur die allgemeinen und die dieses Orchesters
function stimmenVon(w, gr) {
  const reg = (s) => hole("register", s.register_id)?.sort ?? 999;
  return liste("stimmen", (s) => s.werk_id === w.id && (!gr || gr === ALLE || gr === OHNE || !s.gruppe_id || s.gruppe_id === gr))
    .sort((a, b) => FAM_REIHE.indexOf(famVon(a)) - FAM_REIHE.indexOf(famVon(b)) || reg(a) - reg(b) || a.bezeichnung.localeCompare(b.bezeichnung, "de"));
}
const pdfStand = (st) => ({ da: st.filter(hatPdf).length, alle: st.length });
const balken = ({ da, alle }) => `<span class="na-pdf${alle && da === alle ? " voll" : ""}" title="${da} von ${alle} Stimmen mit PDF"><i style="width:${alle ? Math.round((da / alle) * 100) : 0}%"></i></span><small class="na-pdfz">📕 ${da}/${alle}</small>`;
// Wer spielt welches Register in diesem Orchester? (für „wie viele Ausdrucke“)
function spielerJeRegister(gr) {
  const m = new Map();
  if (!gr || gr === ALLE || gr === OHNE) return m;
  for (const z of liste("gruppe_zuordnung", (z) => z.gruppe_id === gr)) for (const i of instrumenteVon(db, z.person_id)) if (i.register_id) m.set(i.register_id, (m.get(i.register_id) || 0) + 1);
  return m;
}
const ansichtKnoepfe = () => `<div class="inst-ansicht" role="group" aria-label="Ansicht">${ANSICHTEN.map(([k, sym, t]) => `<button type="button" class="${ansicht() === k ? "an" : ""}" data-a="notenAnsicht" data-x="${k}" title="${t}" aria-label="${t}" aria-pressed="${ansicht() === k}">${sym}</button>`).join("")}</div>`;
const pfad = (teile) => `<nav class="na-pfad" aria-label="Pfad">${teile.map(([t, ziel], i) => (ziel && i < teile.length - 1 ? `<button type="button" data-a="notenZu" data-x="${esc(ziel)}">${t}</button>` : `<b>${t}</b>`)).join("<span>›</span>")}</nav>`;
const grName = (gr) => (gr === ALLE ? "Alle Stücke" : gr === OHNE ? "Ohne Orchester" : esc(hole("gruppen", gr)?.name || "Orchester"));

// ---------- Ebene 1: Orchester / Klasse ----------
function klassenHtml() {
  const werke = liste("werke"), gruppen = liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
  const karten = gruppen.map((g) => {
    const ws = werke.filter((w) => werkGruppen(w).includes(g.id));
    return { id: g.id, sym: g.kuerzel, farbe: g.farbe, titel: g.name, unter: g.beschreibung || "", ws, st: ws.flatMap((w) => stimmenVon(w, g.id)) };
  });
  const ohne = werke.filter((w) => !werkGruppen(w).length);
  if (ohne.length) karten.push({ id: OHNE, sym: "?", farbe: "#9aa0a6", titel: "Ohne Orchester", unter: "Stücke ohne Zuordnung – in der PC-Verwaltung „für Orchester / Klasse“ setzen", ws: ohne, st: ohne.flatMap((w) => stimmenVon(w)) });
  karten.push({ id: ALLE, sym: "📚", farbe: "var(--haupt)", titel: "Alle Stücke", unter: "das ganze Archiv", ws: werke, st: werke.flatMap((w) => stimmenVon(w)) });
  const kachel = (k) => `<button type="button" class="na-klasse" style="--f:${esc(k.farbe || "var(--haupt)")}" data-a="notenZu" data-x="${esc(k.id)}">
    <span class="na-kz">${esc(k.sym)}</span><b>${esc(k.titel)}</b><small>${esc(k.unter)}</small>
    <span class="na-zahlen">🎼 ${k.ws.length} ${k.ws.length === 1 ? "Stück" : "Stücke"} · ${k.st.length} Stimmen</span>${balken(pdfStand(k.st))}</button>`;
  const zeile = (k) => `<li class="klick na-zeile" data-a="notenZu" data-x="${esc(k.id)}"><span class="na-kz klein" style="--f:${esc(k.farbe || "var(--haupt)")}">${esc(k.sym)}</span>
    <div class="fl"><div class="zeile-titel">${esc(k.titel)}</div><div class="zeile-unter">🎼 ${k.ws.length} Stücke · ${k.st.length} Stimmen</div></div>${balken(pdfStand(k.st))}</li>`;
  return kopf("📚 Notenarchiv", ansichtKnoepfe()) + pfad([["📚 Notenarchiv"]])
    + `<div class="inst-leiste"><input type="search" id="notenSuche" placeholder="🔍 Stück, Komponist, BWV … im ganzen Archiv" value="${esc(NF.q)}" aria-label="Notenarchiv durchsuchen"></div>`
    + (ansicht() === "liste" ? `<div class="karte"><ul class="liste">${karten.map(zeile).join("")}</ul></div>` : `<div class="na-gitter">${karten.map(kachel).join("")}</div>`)
    + `<p class="hinweis">Erst das Orchester bzw. die Klasse wählen, dann das Stück – dort stehen die Noten nach Instrument. Werke, Stimmen und Zuordnung pflegt die PC-Verwaltung.</p>`;
}

// ---------- Ebene 2: Stücke eines Orchesters ----------
function stueckeGefiltert(gr) {
  const alle = liste("werke").filter((w) => (gr === ALLE ? true : gr === OHNE ? !werkGruppen(w).length : werkGruppen(w).includes(gr)));
  const q = NF.q.trim().toLowerCase();
  const l = alle.map((w) => ({ w, st: stimmenVon(w, gr) })).filter(({ w, st }) =>
    (!q || [w.titel, w.komponist, w.werkverzeichnis, w.ausgabe].some((x) => String(x || "").toLowerCase().includes(q)) || st.some((s) => s.bezeichnung.toLowerCase().includes(q)))
    && (!NF.rechte || w.rechte === NF.rechte) && (!NF.projekt || (w.projekte || []).includes(NF.projekt)) && (!NF.stufe || w.schwierigkeit === NF.stufe)
    && (!NF.register || st.some((s) => s.register_id === NF.register)));
  const pdfF = { fehlt: ({ st }) => st.some((s) => !hatPdf(s)), komplett: ({ st }) => st.length && st.every(hatPdf) };
  const mitPdf = NF.pdf ? l.filter(pdfF[NF.pdf]) : l;
  const s = einst().notenSort || "komponist", stufe = { leicht: 1, mittel: 2, schwer: 3 };
  mitPdf.sort((a, b) => (s === "titel" ? a.w.titel.localeCompare(b.w.titel, "de")
    : s === "stufe" ? (stufe[a.w.schwierigkeit] || 9) - (stufe[b.w.schwierigkeit] || 9)
    : s === "fehlt" ? (b.st.length - pdfStand(b.st).da) - (a.st.length - pdfStand(a.st).da)
    : a.w.komponist.localeCompare(b.w.komponist, "de")) || a.w.titel.localeCompare(b.w.titel, "de"));
  return { alle, l: mitPdf, vorPdf: l, pdfF };
}
function stueckeHtml(gr) {
  const g = hole("gruppen", gr), { alle, l, vorPdf, pdfF } = stueckeGefiltert(gr);
  const opt = (o, w) => Object.entries(o).map(([k, t]) => `<option value="${esc(k)}" ${w === k ? "selected" : ""}>${esc(t)}</option>`).join("");
  const projekte = Object.fromEntries([...new Set(alle.flatMap((w) => w.projekte || []))].map((p) => [p, hole("projekte", p)?.titel || p]));
  const regs = Object.fromEntries(liste("register").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)).filter((r) => alle.some((w) => stimmenVon(w, gr).some((s) => s.register_id === r.id))).map((r) => [r.id, r.name]));
  const aktiv = [["rechte", RECHTE[NF.rechte]?.[1]], ["projekt", projekte[NF.projekt] && "🎭 " + projekte[NF.projekt]], ["register", regs[NF.register] && "🎻 " + regs[NF.register]], ["stufe", STUFE[NF.stufe]]].filter(([, t]) => t);
  const chips = [["", "Alle", vorPdf.length], ["fehlt", "📄 PDF fehlt", vorPdf.filter(pdfF.fehlt).length], ["komplett", "📕 vollständig", vorPdf.filter(pdfF.komplett).length]];
  const reg = NF.register && hole("register", NF.register);
  // mit Instrument-Filter: die passende Stimme direkt auf der Karte
  const schnell = (st) => (reg ? st.filter((s) => s.register_id === reg.id).map((s) => `<button type="button" class="knopf klein na-schnell" data-a="notenDatei" data-x="${esc(s.id)}">${hatPdf(s) ? "📕" : "📄"} ${esc(s.bezeichnung)}</button>`).join("") : "");
  const marken = (w) => `${w.schwierigkeit ? `<span class="na-marke">${STUFE[w.schwierigkeit]}</span>` : ""}${w.rechte ? `<span class="badge ${RECHTE[w.rechte]?.[0] || ""}">${esc(RECHTE[w.rechte]?.[1] || w.rechte)}</span>` : ""}${w.dauer_min ? `<span class="na-marke">⏱ ${w.dauer_min} Min.</span>` : ""}`;
  const kachel = ({ w, st }) => `<article class="na-stueck"><button type="button" class="na-stueck-knopf" data-a="notenWerk" data-x="${esc(w.id)}|${esc(gr)}">
      <small class="na-komp">${esc(w.komponist)}</small><b>${esc(w.titel)}</b><small>${esc(w.werkverzeichnis || "")}</small>
      <span class="na-marken">${marken(w)}</span>${balken(pdfStand(st))}</button>${schnell(st)}</article>`;
  const zeile = ({ w, st }) => `<li class="na-zeile"><div class="fl klick" data-a="notenWerk" data-x="${esc(w.id)}|${esc(gr)}"><div class="zeile-titel">${esc(w.titel)}</div>
      <div class="zeile-unter">${esc(w.komponist)}${w.werkverzeichnis ? " · " + esc(w.werkverzeichnis) : ""} · ${st.length} Stimmen</div><span class="na-marken">${marken(w)}</span></div><div class="na-zeile-unten">${schnell(st)}<span class="na-pdfwrap">${balken(pdfStand(st))}</span></div></li>`;
  const inhalt = !l.length ? `<div class="leer">Keine Stücke gefunden.${NF.q || aktiv.length || NF.pdf ? '<br><button class="knopf klein" data-a="notenReset">↺ Suche & Filter zurücksetzen</button>' : ""}</div>`
    : ansicht() === "liste" ? `<div class="karte"><ul class="liste">${l.map(zeile).join("")}</ul></div>` : `<div class="na-gitter">${l.map(kachel).join("")}</div>`;
  return kopf(`🎼 ${grName(gr)}`, ansichtKnoepfe()) + pfad([["📚 Notenarchiv", "start"], [`${g ? esc(g.kuerzel) + " · " : ""}${grName(gr)}`]])
    + `<div class="inst-leiste"><input type="search" id="notenSuche" placeholder="🔍 Stück, Komponist, BWV, Stimme …" value="${esc(NF.q)}" aria-label="Stücke durchsuchen">
      <button type="button" class="inst-filterknopf${NF.panel ? " an" : ""}" data-a="notenPanel" aria-expanded="${NF.panel}" title="Filter & Sortierung">⚙️${aktiv.length ? `<i>${aktiv.length}</i>` : ""}</button></div>
    <div class="inst-chips">${chips.map(([k, t, n]) => `<button type="button" class="${NF.pdf === k ? "an" : ""}" data-a="notenPdf" data-x="${k}">${t} <b>${n}</b></button>`).join("")}</div>
    ${NF.panel ? `<div class="inst-panel karte">
      <label>Instrument<select data-c="notenFeld" data-x="register"><option value="">alle</option>${opt(regs, NF.register)}</select></label>
      <label>Projekt / Konzert<select data-c="notenFeld" data-x="projekt"><option value="">alle</option>${opt(projekte, NF.projekt)}</select></label>
      <label>Schwierigkeit<select data-c="notenFeld" data-x="stufe"><option value="">alle</option>${opt(STUFE, NF.stufe)}</select></label>
      <label>Rechte<select data-c="notenFeld" data-x="rechte"><option value="">alle</option>${opt(Object.fromEntries(Object.entries(RECHTE).map(([k, v]) => [k, v[1]])), NF.rechte)}</select></label>
      <label>Sortieren<select data-c="notenSortieren">${opt(SORT, einst().notenSort || "komponist")}</select></label>
      <button type="button" class="knopf klein" data-a="notenReset">↺ Zurücksetzen</button></div>` : ""}
    ${aktiv.length ? `<div class="inst-aktiv">${aktiv.map(([k, t]) => `<button type="button" data-a="notenFeldWeg" data-x="${k}">${esc(t)} ✕</button>`).join("")}</div>` : ""}
    <p class="hinweis na-anzahl">${l.length !== alle.length ? `${l.length} von ${alle.length} Stücken` : `${l.length} ${l.length === 1 ? "Stück" : "Stücke"}`}</p>${inhalt}`;
}

// ---------- Ebene 3: Noten eines Stücks nach Instrument ----------
function notenHtml(w, gr) {
  const st = stimmenVon(w, gr), spieler = spielerJeRegister(gr), g = hole("gruppen", gr);
  const fams = FAM_REIHE.filter((f) => st.some((s) => famVon(s) === f));
  const sicht = NF.familie && fams.includes(NF.familie) ? st.filter((s) => famVon(s) === NF.familie) : st;
  const ziel = (s) => { const z = zielRoh(s); return z && z !== s.bezeichnung ? z : ""; };
  const zielRoh = (s) => (s.register_id ? hole("register", s.register_id)?.name : s.person_id ? "nur " + name(s.person_id) : s.gruppe_id ? "nur " + (hole("gruppen", s.gruppe_id)?.kuerzel || "") : "alle");
  const knoepfe = (s) => `<button type="button" class="knopf klein" data-a="notenDatei" data-x="${esc(s.id)}">${hatPdf(s) ? "📕 Öffnen" : "📄 kein PDF"}</button>${darf() ? `<label class="knopf klein na-hoch" title="PDF hochladen">📤<input type="file" accept="application/pdf,image/*" data-c="notenHochladen" data-x="${esc(s.id)}" hidden></label>` : ""}`;
  const anzahl = (s) => (s.register_id && spieler.get(s.register_id) ? `<span class="na-spieler" title="So viele spielen dieses Instrument in ${grName(gr)}">👥 ${spieler.get(s.register_id)}</span>` : "");
  const kachel = (s) => `<div class="na-stimme${hatPdf(s) ? " hat" : ""}"><b>${esc(s.bezeichnung)}</b><small>${esc(ziel(s) || "")}</small>${anzahl(s)}<div class="na-stimme-knoepfe">${knoepfe(s)}</div></div>`;
  const zeile = (s) => `<li class="na-zeile"><div class="fl"><div class="zeile-titel">${hatPdf(s) ? "📕" : "📄"} ${esc(s.bezeichnung)}</div><div class="zeile-unter">${esc(ziel(s) || "")}</div></div>${anzahl(s)}<div class="na-stimme-knoepfe">${knoepfe(s)}</div></li>`;
  const block = (f) => {
    const l = sicht.filter((s) => famVon(s) === f); if (!l.length) return "";
    const [sym, t] = FAM[f] || ["🎵", f];
    return `<details class="ig" open><summary>${sym} ${esc(t)} <b>${l.length}</b><small>📕 ${l.filter(hatPdf).length}/${l.length}</small></summary>`
      + (ansicht() === "liste" ? `<ul class="liste">${l.map(zeile).join("")}</ul>` : `<div class="na-stimmen">${l.map(kachel).join("")}</div>`) + "</details>";
  };
  const r = RECHTE[w.rechte];
  return kopf("📄 Noten", ansichtKnoepfe()) + pfad([["📚 Notenarchiv", "start"], [`${g ? esc(g.kuerzel) + " · " : ""}${grName(gr)}`, gr], [esc(w.titel)]])
    + `<div class="karte na-werk"><h3 class="na-titel">${esc(w.titel)}</h3><b>${esc(w.komponist)}</b>${w.werkverzeichnis ? ` · ${esc(w.werkverzeichnis)}` : ""}<div class="hinweis">${esc(w.ausgabe || "")}</div>
      <div class="na-marken">${w.schwierigkeit ? `<span class="na-marke">${STUFE[w.schwierigkeit]}</span>` : ""}${r ? `<span class="badge ${r[0]}">${esc(r[1])}</span>` : ""}${w.dauer_min ? `<span class="na-marke">⏱ ${w.dauer_min} Min.</span>` : ""}
      ${(w.projekte || []).map((x) => `<span class="badge">🎭 ${esc(hole("projekte", x)?.titel || "")}</span>`).join("")}${werkGruppen(w).map((x) => `<span class="badge">🎻 ${esc(hole("gruppen", x)?.name || "")}</span>`).join("")}</div>${balken(pdfStand(st))}</div>
    <div class="inst-chips"><button type="button" class="${!NF.familie ? "an" : ""}" data-a="notenFamilie" data-x="">Alle <b>${st.length}</b></button>${fams.map((f) => `<button type="button" class="${NF.familie === f ? "an" : ""}" data-a="notenFamilie" data-x="${f}">${FAM[f]?.[0] || "🎵"} ${esc(FAM[f]?.[1] || f)} <b>${st.filter((s) => famVon(s) === f).length}</b></button>`).join("")}</div>
    ${st.length ? fams.map(block).join("") : '<div class="leer">Für dieses Stück sind noch keine Stimmen angelegt.</div>'}
    <p class="hinweis">📕 = PDF da · 👥 = so viele spielen das Instrument in diesem Orchester (Anzahl Ausdrucke). Schüler sehen nur ihre eigenen Stimmen unter „🎼 Meine Noten“; im Chat lassen sich Noten mit 📎 › 🎼 verschicken.</p>`;
}

VIEWS.noten = {
  render(p) {
    if (p.werk) { const w = hole("werke", p.werk); if (w) return notenHtml(w, p.gr || werkGruppen(w)[0] || ALLE); }
    if (p.gr) return stueckeHtml(p.gr);
    if (NF.q.trim()) return stueckeHtml(ALLE); // Suche auf der ersten Ebene durchsucht alle Stücke
    return klassenHtml();
  },
  nach(w) {
    const f = w.querySelector("#notenSuche");
    f?.addEventListener("input", () => { NF.q = f.value; const pos = f.selectionStart; zeichne(); const n = document.getElementById("notenSuche"); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch {} });
  },
};
AKTIONEN.notenZu = (x) => { NF.familie = ""; if (x === "start") { NF.q = ""; zeige("noten"); } else zeige("noten", { gr: x }); };
AKTIONEN.notenWerk = (x) => { const [id, gr] = String(x).split("|"); NF.familie = ""; zeige("noten", { werk: id, gr: gr || undefined }); };
AKTIONEN.notenAnsicht = (a) => { einstSetzen("notenAnsicht", a); zeichne(); };
AKTIONEN.notenPanel = () => { NF.panel = !NF.panel; zeichne(); };
AKTIONEN.notenPdf = (k) => { NF.pdf = k; zeichne(); };
AKTIONEN.notenFamilie = (f) => { NF.familie = f; zeichne(); };
AKTIONEN.notenFeld = (_, el) => { NF[el.dataset.x] = el.value; zeichne(); };
AKTIONEN.notenFeldWeg = (k) => { NF[k] = ""; zeichne(); };
AKTIONEN.notenSortieren = (_, el) => { einstSetzen("notenSort", el.value); zeichne(); };
AKTIONEN.notenReset = () => { Object.assign(NF, { q: "", rechte: "", projekt: "", register: "", stufe: "", pdf: "" }); zeichne(); };
