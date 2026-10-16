// Instrumente: Inventar, Verleih (Ausgabe/Rückgabe mit Zustand), Reparatur (Meldung → Kostenvoranschlag → Freigabe →
// Werkstatt → erledigt), Einkauf, Förderverein (Spenden & Freigaben), „Mein Leihinstrument“. Vorbild: KC Club Leihmodul.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, einst, einstSetzen, istLeitung, istVorstand, istVerwalter, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, geld, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { aktiveAusleihe, ausleihenVon, kinderVon, tagIso, elternVon } from "../kern/logik.js";
import { senden } from "../kern/versand.js";
import { INSTRUMENT_GRUPPEN } from "../kern/schema.js";

const STATUS = { verfuegbar: ["b-gruen", "verfügbar"], verliehen: ["b-blau", "verliehen"], reparatur: ["b-gelb", "in Reparatur"], ausgemustert: ["b-grau", "ausgemustert"] };
const REP = { gemeldet: ["b-rot", "gemeldet"], angebot: ["b-gelb", "Kostenvoranschlag"], freigegeben: ["b-blau", "freigegeben"], in_arbeit: ["b-blau", "in der Werkstatt"], erledigt: ["b-gruen", "erledigt"], abgelehnt: ["b-grau", "abgelehnt"] };
const typName = (id) => hole("instrument_typen", id)?.name || "Instrument";
const darfFreigeben = (betrag) => istVorstand() || (istLeitung() && Number(betrag || 0) <= Number(konfig().freigabe_grenze_eur || 0));

// ---------- Instrumente-Übersicht: 🔲 Kacheln · ☰ Liste · 🗂️ Drehregister, mit Gruppen, Suche, Filtern und Sortierung ----------
// Die Daten pflegt die PC-Verwaltung (Inventar, Instrumententypen mit Instrumentengruppe und Symbol); hier steht je Instrument das Wichtigste.
// Ansicht, Gruppierung und Sortierung merkt sich das Gerät; Suche und Filter gelten, bis man sie zurücksetzt.
const IF = (() => { try { return { q: "", status: "aktiv", gruppe: "", typ: "", standort: "", zustand: "", panel: false, ...JSON.parse(sessionStorage.getItem("bk_inst_filter") || "{}") }; } catch { return { q: "", status: "aktiv", gruppe: "", typ: "", standort: "", zustand: "", panel: false }; } })();
const ifMerken = () => { try { sessionStorage.setItem("bk_inst_filter", JSON.stringify(IF)); } catch {} };
const ZUSTAND = { sehr_gut: "sehr gut", gut: "gut", gebraucht: "gebraucht", maengel: "Mängel" };
const SORT = { nr: "Inventar-Nr.", typ: "Instrument", status: "Status", rueckgabe: "Rückgabe", wartung: "Wartung" };
const GRUPPIEREN = { gruppe: "Instrumentengruppe", typ: "Instrument", standort: "Standort", status: "Status", keine: "nicht gruppieren" };
const ANSICHTEN_I = [["kachel", "🔲", "Kacheln"], ["liste", "☰", "Liste"], ["dreh", "🗂️", "Drehregister"]];
const SYMBOLE = [[/geige|violin/i, "🎻"], [/viola|bratsche/i, "🎻"], [/cello|kontrabass|bass/i, "🎻"], [/piccolo|flöte|floete/i, "🪈"], [/klarinette|oboe|fagott|saxo/i, "🎷"],
  [/trompete|posaune|tuba|euphon/i, "🎺"], [/horn/i, "📯"], [/pauke|trommel|schlag|becken|percuss/i, "🥁"], [/klavier|piano|flügel|cembalo|orgel|keyboard/i, "🎹"], [/harfe/i, "🪕"], [/gitarre/i, "🎸"]];
const typVon = (i) => hole("instrument_typen", i.typ_id);
const gruppeVon = (i) => { const t = typVon(i); return t?.gruppe || hole("register", t?.register_id)?.familie || "sonstige"; };
const symbolVon = (i) => { const t = typVon(i); return t?.symbol || SYMBOLE.find(([re]) => re.test(t?.name || ""))?.[1] || INSTRUMENT_GRUPPEN[gruppeVon(i)]?.[0] || "🎵"; };
const heuteIso = () => tagIso(new Date());
const wartungFaellig = (i) => !!i.wartung_faellig && i.wartung_faellig <= tagIso(new Date(Date.now() + 30 * 86400000));
const offeneRep = (i) => liste("reparaturen", (r) => r.inventar_id === i.id && !["erledigt", "abgelehnt"].includes(r.status));
function infoVon(i) {
  const a = aktiveAusleihe(db, i.id), h = heuteIso();
  return { i, a, typ: typName(i.typ_id), sym: symbolVon(i), gruppe: gruppeVon(i), rep: offeneRep(i), wartung: wartungFaellig(i), ueberfaellig: !!(a?.bis && a.bis < h), wartungUeber: !!(i.wartung_faellig && i.wartung_faellig < h) };
}
const STATUS_FILTER = { aktiv: ["Alle", (x) => x.i.status !== "ausgemustert"], verfuegbar: ["frei", (x) => x.i.status === "verfuegbar"], verliehen: ["verliehen", (x) => x.i.status === "verliehen"],
  reparatur: ["🔧 Reparatur", (x) => x.i.status === "reparatur" || x.rep.length > 0], wartung: ["⏰ Wartung", (x) => x.wartung && x.i.status !== "ausgemustert"], ueberfaellig: ["⚠️ Rückgabe", (x) => x.ueberfaellig], ausgemustert: ["ausgemustert", (x) => x.i.status === "ausgemustert"] };
function suchtreffer(x, q) {
  if (!q) return true;
  const t = [x.i.inventar_nr, x.typ, x.i.groesse, x.i.bezeichnung, x.i.standort, x.i.finanziert_von, x.i.notiz, INSTRUMENT_GRUPPEN[x.gruppe]?.[1], x.a ? name(x.a.person_id) : ""].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}
function gefiltert() {
  const alle = liste("inventar").map(infoVon);
  const basis = alle.filter((x) => suchtreffer(x, IF.q) && (!IF.gruppe || x.gruppe === IF.gruppe) && (!IF.typ || x.i.typ_id === IF.typ) && (!IF.standort || (x.i.standort || "–") === IF.standort) && (!IF.zustand || x.i.zustand === IF.zustand));
  const st = STATUS_FILTER[IF.status] || STATUS_FILTER.aktiv;
  const sort = einst().instSort || "nr";
  const cmp = { nr: (a, b) => a.i.inventar_nr.localeCompare(b.i.inventar_nr, "de", { numeric: true }), typ: (a, b) => a.typ.localeCompare(b.typ, "de") || cmp.nr(a, b),
    status: (a, b) => String(a.i.status).localeCompare(String(b.i.status)) || cmp.nr(a, b), rueckgabe: (a, b) => String(a.a?.bis || "9").localeCompare(String(b.a?.bis || "9")) || cmp.nr(a, b),
    wartung: (a, b) => String(a.i.wartung_faellig || "9").localeCompare(String(b.i.wartung_faellig || "9")) || cmp.nr(a, b) };
  return { alle, basis, liste: basis.filter(st[1]).sort(cmp[sort] || cmp.nr) };
}
function gruppiert(l) {
  const art = einst().instGruppe || "gruppe";
  if (art === "keine") return [{ key: "", titel: "", l }];
  const schluessel = (x) => (art === "typ" ? x.i.typ_id : art === "standort" ? x.i.standort || "–" : art === "status" ? x.i.status : x.gruppe);
  const titel = (k, x) => (art === "typ" ? `${x.sym} ${x.typ}` : art === "standort" ? `📍 ${k}` : art === "status" ? (STATUS[k]?.[1] || k) : `${INSTRUMENT_GRUPPEN[k]?.[0] || "🎵"} ${INSTRUMENT_GRUPPEN[k]?.[1] || k}`);
  const reihe = Object.keys(INSTRUMENT_GRUPPEN), m = new Map();
  for (const x of l) { const k = schluessel(x); if (!m.has(k)) m.set(k, { key: k, titel: titel(k, x), l: [] }); m.get(k).l.push(x); }
  return [...m.values()].sort((a, b) => (art === "gruppe" ? reihe.indexOf(a.key) - reihe.indexOf(b.key) : a.titel.localeCompare(b.titel, "de")));
}
const kurzName = (pid) => { const p = hole("personen", pid); return p ? `${p.vorname} ${(p.nachname || "")[0] || ""}.` : "?"; };
const dm = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : "");
const merker = (x) => `${x.rep.length ? '<i title="Reparatur offen">🔧</i>' : ""}${x.wartung ? `<i title="Wartung ${x.wartungUeber ? "überfällig" : "fällig"} ${datumKurz(x.i.wartung_faellig)}">⏰</i>` : ""}${x.i.zustand === "maengel" ? '<i title="Mängel">⚠️</i>' : ""}${x.ueberfaellig ? '<i title="Rückgabe überfällig">❗</i>' : ""}`;
const statusZeile = (x) => (x.a ? `👤 ${esc(kurzName(x.a.person_id))}${x.a.bis ? ` · bis ${dm(x.a.bis)}` : ""}` : x.i.status === "verfuegbar" ? `📍 ${esc(x.i.standort || "Lager")}` : esc(STATUS[x.i.status]?.[1] || ""));
const kachelHtml = (x) => `<button type="button" class="ik st-${esc(x.i.status)}${x.ueberfaellig ? " ueber" : ""}" data-a="oeffne" data-x="instrument|${esc(x.i.id)}">
  <span class="ik-kopf"><span class="ik-sym">${x.sym}</span><span class="ik-nr">${esc(x.i.inventar_nr)}</span><span class="ik-merker">${merker(x)}</span></span>
  <b class="ik-typ">${esc(x.typ)}${x.i.groesse ? ` <small>${esc(x.i.groesse)}</small>` : ""}</b>
  <small class="ik-bez">${esc(x.i.bezeichnung || "")}</small>
  <small class="ik-status"><i class="punkt"></i>${statusZeile(x)}</small></button>`;
const zeileHtml = (x) => `<li class="iz st-${esc(x.i.status)}${x.ueberfaellig ? " ueber" : ""}" data-a="oeffne" data-x="instrument|${esc(x.i.id)}">
  <span class="iz-sym">${x.sym}</span><span class="iz-haupt"><b>${esc(x.i.inventar_nr)} · ${esc(x.typ)}${x.i.groesse ? " " + esc(x.i.groesse) : ""}</b><small>${esc(x.i.bezeichnung || "")}${x.i.standort ? " · 📍 " + esc(x.i.standort) : ""}</small></span>
  <span class="iz-rechts"><span class="badge ${STATUS[x.i.status]?.[0] || ""}">${esc(STATUS[x.i.status]?.[1] || x.i.status)}</span><small>${x.a ? `${esc(kurzName(x.a.person_id))}${x.a.bis ? " · " + dm(x.a.bis) : ""}` : ""}${merker(x)}</small></span></li>`;
const feld = (t, w, klasse = "") => (w ? `<div class="dk-feld ${klasse}"><small>${t}</small><b>${w}</b></div>` : "");
const drehKarte = (x, n, gesamt) => `<article class="dk st-${esc(x.i.status)}" data-gruppe="${esc(x.gruppe)}" data-i="${n}">
  <div class="dk-reiter"><span>${INSTRUMENT_GRUPPEN[x.gruppe]?.[0] || "🎵"} ${esc(INSTRUMENT_GRUPPEN[x.gruppe]?.[1] || "")}</span><span>${n + 1}/${gesamt}</span></div>
  <div class="dk-kopf"><span class="dk-sym">${x.sym}</span><div><b>${esc(x.typ)}${x.i.groesse ? " " + esc(x.i.groesse) : ""}</b><small>${esc(x.i.inventar_nr)} · ${esc(x.i.bezeichnung || "")}</small></div></div>
  <div class="dk-gitter">${feld("Status", `<span class="badge ${STATUS[x.i.status]?.[0] || ""}">${esc(STATUS[x.i.status]?.[1] || "")}</span>`)}${feld("Zustand", esc(ZUSTAND[x.i.zustand] || "–"), x.i.zustand === "maengel" ? "warn" : "")}
    ${x.a ? feld("Ausgeliehen an", esc(name(x.a.person_id))) + feld("seit / bis", `${datumKurz(x.a.von)} – ${x.a.bis ? datumKurz(x.a.bis) : "offen"}`, x.ueberfaellig ? "warn" : "") : feld("Standort", esc(x.i.standort || "–"))}
    ${feld("Wartung", x.i.wartung_faellig ? datumKurz(x.i.wartung_faellig) : "–", x.wartungUeber ? "warn" : "")}${feld("Wert", x.i.wert ? geld(x.i.wert) : "")}
    ${x.rep.length ? feld("Reparatur", esc(REP[x.rep[0].status]?.[1] || x.rep[0].status), "warn") : ""}${feld("finanziert von", esc(x.i.finanziert_von || ""))}</div>
  ${x.i.notiz ? `<p class="dk-notiz">${esc(x.i.notiz)}</p>` : ""}
  <button class="knopf haupt breit" data-a="oeffne" data-x="instrument|${esc(x.i.id)}">Details, Verleih & Reparatur ›</button></article>`;

VIEWS.instrumente = {
  render() {
    const { alle, basis, liste: l } = gefiltert(), ans = einst().instAnsicht || "kachel";
    const opt = (o, w) => Object.entries(o).map(([k, t]) => `<option value="${esc(k)}" ${w === k ? "selected" : ""}>${esc(t)}</option>`).join("");
    const typen = Object.fromEntries(liste("instrument_typen").sort((a, b) => a.name.localeCompare(b.name, "de")).map((t) => [t.id, t.name]));
    const orte = Object.fromEntries([...new Set(alle.map((x) => x.i.standort || "–"))].sort().map((o) => [o, o]));
    const gruppen = Object.fromEntries(Object.keys(INSTRUMENT_GRUPPEN).filter((g) => alle.some((x) => x.gruppe === g)).map((g) => [g, `${INSTRUMENT_GRUPPEN[g][0]} ${INSTRUMENT_GRUPPEN[g][1]}`]));
    const aktiv = [["gruppe", gruppen[IF.gruppe]], ["typ", typen[IF.typ]], ["standort", IF.standort && "📍 " + IF.standort], ["zustand", ZUSTAND[IF.zustand]]].filter(([, t]) => t);
    const reps = liste("reparaturen", (r) => !["erledigt", "abgelehnt"].includes(r.status));
    const gr = gruppiert(l);
    let inhalt = "";
    if (!l.length) inhalt = `<div class="leer">Keine Instrumente gefunden.${IF.q || aktiv.length || IF.status !== "aktiv" ? '<br><button class="knopf klein" data-a="instReset">↺ Suche & Filter zurücksetzen</button>' : ""}</div>`;
    else if (ans === "liste") inhalt = gr.map((g) => (g.titel ? `<details class="ig" open><summary>${esc(g.titel)} <b>${g.l.length}</b></summary>` : "<div>") + `<ul class="iz-liste">${g.l.map(zeileHtml).join("")}</ul>` + (g.titel ? "</details>" : "</div>")).join("");
    else if (ans === "dreh") {
      const reihe = gr.flatMap((g) => g.l);
      const reiter = [...new Set(reihe.map((x) => x.gruppe))];
      inhalt = `<div class="dreh-reiter">${reiter.map((g) => `<button type="button" data-a="drehZu" data-x="${esc(g)}" data-g="${esc(g)}">${INSTRUMENT_GRUPPEN[g]?.[0] || "🎵"} ${esc(INSTRUMENT_GRUPPEN[g]?.[1] || g)}</button>`).join("")}</div>
        <div class="dreh"><button type="button" class="dreh-pfeil links" data-a="drehSchritt" data-x="-1" aria-label="vorheriges Instrument">‹</button>
        <div class="dreh-bahn" id="drehBahn">${reihe.map((x, n) => drehKarte(x, n, reihe.length)).join("")}</div>
        <button type="button" class="dreh-pfeil rechts" data-a="drehSchritt" data-x="1" aria-label="nächstes Instrument">›</button></div>`;
    } else inhalt = gr.map((g) => {
      const frei = g.l.filter((x) => x.i.status === "verfuegbar").length, verl = g.l.filter((x) => x.i.status === "verliehen").length;
      return (g.titel ? `<details class="ig" open><summary>${esc(g.titel)} <b>${g.l.length}</b><small>${frei} frei · ${verl} verliehen</small></summary>` : "<div>") + `<div class="ik-gitter">${g.l.map(kachelHtml).join("")}</div>` + (g.titel ? "</details>" : "</div>");
    }).join("");
    return kopf("🎻 Instrumente", `<span class="hinweis">${l.length}${l.length !== alle.length ? ` / ${alle.length}` : ""}</span>`)
      + `<div class="inst-leiste"><input type="search" id="instSuche" placeholder="🔍 Nr., Instrument, Hersteller, Name …" value="${esc(IF.q)}" aria-label="Instrumente durchsuchen">
        <div class="inst-ansicht" role="group" aria-label="Ansicht">${ANSICHTEN_I.map(([k, sym, t]) => `<button type="button" class="${ans === k ? "an" : ""}" data-a="instAnsicht" data-x="${k}" title="${t}" aria-label="${t}" aria-pressed="${ans === k}">${sym}</button>`).join("")}</div>
        <button type="button" class="inst-filterknopf${IF.panel ? " an" : ""}" data-a="instPanel" aria-expanded="${IF.panel}" title="Filter, Gruppen & Sortierung">⚙️${aktiv.length ? `<i>${aktiv.length}</i>` : ""}</button></div>
      <div class="inst-chips">${Object.entries(STATUS_FILTER).filter(([k]) => k !== "ausgemustert" || basis.some((x) => x.i.status === "ausgemustert")).map(([k, [t, f]]) => { const n = basis.filter(f).length; return n || k === "aktiv" || IF.status === k ? `<button type="button" class="${IF.status === k ? "an" : ""}" data-a="instStatus" data-x="${k}">${t} <b>${n}</b></button>` : ""; }).join("")}</div>
      ${IF.panel ? `<div class="inst-panel karte">
        <label>Gruppe<select data-c="instFeld" data-x="gruppe"><option value="">alle</option>${opt(gruppen, IF.gruppe)}</select></label>
        <label>Instrument<select data-c="instFeld" data-x="typ"><option value="">alle</option>${opt(typen, IF.typ)}</select></label>
        <label>Standort<select data-c="instFeld" data-x="standort"><option value="">alle</option>${opt(orte, IF.standort)}</select></label>
        <label>Zustand<select data-c="instFeld" data-x="zustand"><option value="">alle</option>${opt(ZUSTAND, IF.zustand)}</select></label>
        <label>Gruppieren<select data-c="instEinst" data-x="instGruppe">${opt(GRUPPIEREN, einst().instGruppe || "gruppe")}</select></label>
        <label>Sortieren<select data-c="instEinst" data-x="instSort">${opt(SORT, einst().instSort || "nr")}</select></label>
        <button type="button" class="knopf klein" data-a="instReset">↺ Zurücksetzen</button></div>` : ""}
      ${aktiv.length ? `<div class="inst-aktiv">${aktiv.map(([k, t]) => `<button type="button" data-a="instFeldWeg" data-x="${k}">${esc(t)} ✕</button>`).join("")}</div>` : ""}
      <div class="inst-inhalt ans-${ans}">${inhalt}</div>
      ${reps.length ? `<details class="karte inst-rep"><summary>🔧 ${reps.length} offene ${reps.length === 1 ? "Reparatur" : "Reparaturen"}</summary><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl"><div class="zeile-titel">${esc(hole("inventar", r.inventar_id)?.inventar_nr || "")} · ${esc(hole("inventar", r.inventar_id)?.bezeichnung || "")}</div><div class="zeile-unter">${esc(r.meldung)}</div></div><span class="badge ${REP[r.status]?.[0] || ""}">${esc(REP[r.status]?.[1] || r.status)}</span></li>`).join("")}</ul></details>` : ""}
      <p class="hinweis">Neue Instrumente, Inventarnummern, Werte, Instrumentengruppen und Symbole pflegt die PC-Verwaltung.</p>`;
  },
  nach(w) {
    const f = w.querySelector("#instSuche");
    f?.addEventListener("input", () => { IF.q = f.value; ifMerken(); const pos = f.selectionStart; zeichne(); const n = document.getElementById("instSuche"); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch {} });
    const bahn = w.querySelector("#drehBahn");
    if (bahn) { bahn.addEventListener("scroll", () => requestAnimationFrame(() => drehen(bahn)), { passive: true }); requestAnimationFrame(() => { if (IF.drehPos) bahn.scrollLeft = IF.drehPos; drehen(bahn); }); }
  },
};
// 🗂️ Drehregister: Karten drehen sich beim Wischen wie eine Kartei; Reiter springen zur Gruppe
function drehen(bahn) {
  const mitte = bahn.scrollLeft + bahn.clientWidth / 2;
  let aktiv = null, best = Infinity;
  for (const k of bahn.children) {
    const d = (k.offsetLeft + k.offsetWidth / 2 - mitte) / k.offsetWidth, a = Math.min(1, Math.abs(d));
    k.style.transform = `perspective(900px) rotateY(${Math.max(-1, Math.min(1, d)) * -38}deg) scale(${1 - a * 0.12})`;
    k.style.opacity = String(1 - a * 0.45);
    if (Math.abs(d) < best) { best = Math.abs(d); aktiv = k; }
  }
  IF.drehPos = bahn.scrollLeft;
  const g = aktiv?.dataset.gruppe;
  document.querySelectorAll(".dreh-reiter button").forEach((b) => b.classList.toggle("an", b.dataset.g === g));
}
AKTIONEN.drehSchritt = (x) => { const b = document.getElementById("drehBahn"); if (b) b.scrollBy({ left: Number(x) * (b.firstElementChild?.offsetWidth || 300), behavior: "smooth" }); };
AKTIONEN.drehZu = (g) => { const b = document.getElementById("drehBahn"), k = b?.querySelector(`[data-gruppe="${CSS.escape(g)}"]`); if (k) b.scrollTo({ left: k.offsetLeft - (b.clientWidth - k.offsetWidth) / 2, behavior: "smooth" }); };
AKTIONEN.instAnsicht = (a) => { einstSetzen("instAnsicht", a); IF.drehPos = 0; zeichne(); };
AKTIONEN.instStatus = (k) => { IF.status = k; IF.drehPos = 0; ifMerken(); zeichne(); };
AKTIONEN.instPanel = () => { IF.panel = !IF.panel; ifMerken(); zeichne(); };
AKTIONEN.instFeld = (v, el) => { IF[el.dataset.x] = v; IF.drehPos = 0; ifMerken(); zeichne(); };
AKTIONEN.instFeldWeg = (k) => { IF[k] = ""; ifMerken(); zeichne(); };
AKTIONEN.instEinst = (v, el) => { einstSetzen(el.dataset.x, v); zeichne(); };
AKTIONEN.instReset = () => { Object.assign(IF, { q: "", status: "aktiv", gruppe: "", typ: "", standort: "", zustand: "", drehPos: 0 }); ifMerken(); zeichne(); };
AKTIONEN.invFilter = (f) => { IF.status = f === "alle" ? "aktiv" : f; ifMerken(); zeige("instrumente", {}, { ersetzen: true }); }; // ältere Sprünge (Cockpit, Kopf)

VIEWS.instrument = {
  render({ id }) {
    const i = hole("inventar", id);
    if (!i) return kopf("Instrument") + '<div class="leer">Nicht gefunden.</div>';
    const a = aktiveAusleihe(db, id);
    const hist = liste("ausleihen", (x) => x.inventar_id === id).sort((x, y) => (y.von || "").localeCompare(x.von || ""));
    const reps = liste("reparaturen", (r) => r.inventar_id === id);
    let html = kopf(`${esc(i.inventar_nr)} ${esc(typName(i.typ_id))}`) + `<div class="karte"><div class="zeile-titel">${esc(i.bezeichnung || "")} ${esc(i.groesse || "")}</div>
      <div><span class="badge ${STATUS[i.status][0]}">${STATUS[i.status][1]}</span> <span class="badge">Zustand: ${esc(i.zustand || "?")}</span></div>
      <div class="hinweis">Standort: ${esc(i.standort || "–")} · Wert ${geld(i.wert)} · Wartung fällig ${datumKurz(i.wartung_faellig)}${i.finanziert_von ? " · finanziert von " + esc(i.finanziert_von) : ""}</div></div>`;
    if (istVerwalter()) {
      html += `<div class="karte"><h3>Verleih</h3>${a ? `<p>Ausgeliehen an <b class="klick" data-a="oeffne" data-x="person|${a.person_id}">${esc(name(a.person_id))}</b> seit ${datumKurz(a.von)}, Rückgabe bis <b>${datumKurz(a.bis)}</b></p><div class="knopfreihe"><button class="knopf" data-a="rueckgabe" data-x="${a.id}">↩️ Rückgabe erfassen</button><button class="knopf" data-a="rueckgabeErinnern" data-x="${a.id}">⏰ Erinnern</button></div>`
        : i.status === "verfuegbar" ? `<button class="knopf haupt" data-a="ausgabeForm" data-x="${id}">🤝 Ausleihen an …</button>` : '<p class="hinweis">Zurzeit nicht verleihbar.</p>'}
        ${hist.length ? `<h4>Verlauf</h4><ul class="liste">${hist.map((x) => `<li><div class="fl">${esc(name(x.person_id))} <span class="hinweis">${datumKurz(x.von)} – ${x.status === "zurueck" ? datumKurz(x.bis) : "heute"}</span></div></li>`).join("")}</ul>` : ""}</div>`;
    }
    html += `<div class="karte"><h3>Reparatur & Wartung</h3><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl">${esc(r.meldung)} <span class="hinweis">${datumKurz(r.gemeldet_am)}</span></div><span class="badge ${REP[r.status][0]}">${REP[r.status][1]}</span></li>`).join("") || "<li class='hinweis'>keine</li>"}</ul><button class="knopf" data-a="schadenForm" data-x="${id}">🩹 Schaden melden</button></div>`;
    return html;
  },
};
AKTIONEN.ausgabeForm = (id) => {
  const i = hole("inventar", id);
  const kandidaten = liste("person_instrument", (x) => x.typ_id === i.typ_id && !x.eigenes).map((x) => x.person_id).filter((p) => !ausleihenVon(db, p).length);
  const andere = liste("personen", (p) => p.typ === "schueler" && !kandidaten.includes(p.id)).sort((a, b) => name(a).localeCompare(name(b)));
  blatt("Instrument ausleihen", `<div id="ausForm"><div class="feld"><label>An</label><select name="person">${kandidaten.length ? `<optgroup label="Spielt ${esc(typName(i.typ_id))}, ohne eigenes">${kandidaten.map((p) => `<option value="${p}">${esc(name(p))}</option>`).join("")}</optgroup>` : ""}<optgroup label="Alle Schüler">${andere.map((p) => `<option value="${p.id}">${esc(name(p))}</option>`).join("")}</optgroup></select></div>
    <div class="feld"><label>Rückgabe bis</label><input type="date" name="bis" value="${tagIso(new Date(Date.now() + 365 * 86400000))}"></div>
    <div class="feld"><label>Zustand bei Ausgabe</label><input name="zustand" value="gut, mit Kasten"></div>
    <label class="schalter"><span>Leihvertrag zur Zustimmung an die Eltern senden</span><input type="checkbox" name="vertrag" checked></label>
    <button class="knopf haupt breit" data-a="ausgabeSpeichern" data-x="${id}">🤝 Ausgeben</button></div>`);
};
AKTIONEN.ausgabeSpeichern = async (id) => {
  const f = formWerte(document.getElementById("ausForm"));
  await speichere("ausleihen", { inventar_id: id, person_id: f.person, von: tagIso(new Date()), bis: f.bis, status: "aktiv", zustand_ausgabe: f.zustand });
  await speichere("inventar", { ...hole("inventar", id), status: "verliehen" });
  if (f.vertrag) {
    const v = liste("genehmigung_vorlagen", (x) => /leih/i.test(x.titel))[0];
    if (v) await speichere("genehmigungen", { vorlage_id: v.id, kind_id: f.person, status: "ausstehend", frist: tagIso(new Date(Date.now() + 14 * 86400000)) });
    await senden({ an: elternVon(db, f.person), betreff: "Leihvertrag bitte bestätigen", text: `${vorname(f.person)} hat ein Leihinstrument erhalten. Bitte den Leihvertrag in der App bestätigen.`, ereignis: "genehmigung" });
  }
  blattZu(); toast("🤝 Ausgeliehen" + (f.vertrag ? " – Leihvertrag an Eltern gesendet" : ""));
  zeige("instrument", { id }, { ersetzen: true });
};
AKTIONEN.rueckgabe = async (aid) => {
  const zustand = prompt("Zustand bei Rückgabe:", "gut");
  if (zustand == null) return;
  const a = hole("ausleihen", aid);
  await speichere("ausleihen", { ...a, status: "zurueck", bis: tagIso(new Date()), zustand_rueckgabe: zustand });
  await speichere("inventar", { ...hole("inventar", a.inventar_id), status: "verfuegbar" });
  toast("↩️ Rückgabe erfasst");
  zeige("instrument", { id: a.inventar_id }, { ersetzen: true });
};
AKTIONEN.rueckgabeErinnern = async (aid) => {
  const a = hole("ausleihen", aid);
  await senden({ an: [a.person_id, ...elternVon(db, a.person_id)], betreff: "Leihinstrument: Rückgabe", text: `Bitte das Leihinstrument (${hole("inventar", a.inventar_id)?.bezeichnung}) bis ${datumKurz(a.bis)} zurückgeben.`, ereignis: "instrument" });
  toast("⏰ Erinnerung gesendet (simuliert)");
};
AKTIONEN.schadenForm = (id) => blatt("Schaden melden", `<div id="schForm"><div class="feld"><label>Was ist passiert?</label><textarea name="meldung" placeholder="z. B. Saite gerissen, Riss im Lack …"></textarea></div><button class="knopf haupt breit" data-a="schadenSpeichern" data-x="${id}">🩹 Melden</button></div>`);
AKTIONEN.schadenSpeichern = async (id) => {
  const f = formWerte(document.getElementById("schForm"));
  if (!f.meldung.trim()) return;
  await speichere("reparaturen", { inventar_id: id, meldung: f.meldung, status: "gemeldet", gemeldet_von: S.ich.id, gemeldet_am: tagIso(new Date()) });
  await senden({ an: [konfig().leitung_id, ...liste("personen", (p) => (p.rollen || []).includes("instrumentenwart")).map((p) => p.id)], betreff: "Schaden gemeldet", text: `${name(S.ich)}: ${f.meldung}`, ereignis: "instrument" });
  blattZu(); toast("🩹 Schaden gemeldet – die Leitung ist informiert");
  zeige(S.view, S.params, { ersetzen: true });
};

VIEWS.reparatur = {
  render({ id }) {
    const r = hole("reparaturen", id);
    if (!r) return kopf("Reparatur") + '<div class="leer">Nicht gefunden.</div>';
    const i = hole("inventar", r.inventar_id);
    const grenze = Number(konfig().freigabe_grenze_eur || 0);
    const schritte = ["gemeldet", "angebot", "freigegeben", "in_arbeit", "erledigt"];
    const pos = schritte.indexOf(r.status);
    let aktion = "";
    if (istVerwalter()) {
      if (r.status === "gemeldet") aktion = `<div id="kvForm"><div class="feld"><label>Werkstatt</label><select name="werkstatt">${liste("personen", (p) => p.typ === "dienstleister").map((p) => `<option value="${p.id}">${esc(p.firma || name(p))}</option>`).join("")}</select></div><div class="feld"><label>Kostenvoranschlag (€)</label><input type="number" name="kosten"></div><button class="knopf haupt" data-a="kvSpeichern" data-x="${id}">Kostenvoranschlag erfassen</button></div>`;
      if (r.status === "angebot") aktion = darfFreigeben(r.kosten) ? `<div class="knopfreihe"><button class="knopf gruen" data-a="repStatus" data-x="${id}|freigegeben">✅ Freigeben (${geld(r.kosten)})</button><button class="knopf rot" data-a="repStatus" data-x="${id}|abgelehnt">Ablehnen</button></div>` : `<p class="badge b-gelb">Über ${geld(grenze)} – Freigabe durch den Förderverein-Vorstand</p><button class="knopf" data-a="repAnFv" data-x="${id}">📨 Vorstand um Freigabe bitten</button>`;
      if (r.status === "freigegeben") aktion = `<button class="knopf haupt" data-a="repStatus" data-x="${id}|in_arbeit">🚚 In die Werkstatt gebracht</button>`;
      if (r.status === "in_arbeit") aktion = `<button class="knopf haupt" data-a="repStatus" data-x="${id}|erledigt">✅ Zurück & erledigt</button>`;
    }
    return kopf("🔧 Reparatur") + `<div class="karte"><div class="zeile-titel klick" data-a="oeffne" data-x="instrument|${i.id}">${esc(i.inventar_nr)} ${esc(i.bezeichnung)} ›</div><p>${esc(r.meldung)}</p>
      <div class="hinweis">gemeldet ${datumKurz(r.gemeldet_am)} von ${esc(name(r.gemeldet_von))}${r.werkstatt_id ? " · Werkstatt: " + esc(hole("personen", r.werkstatt_id)?.firma || "") : ""}${r.kosten ? " · Kosten " + geld(r.kosten) : ""}${r.freigegeben_von ? " · freigegeben von " + esc(name(r.freigegeben_von)) : ""}</div>
      <div class="zaehler">${schritte.map((s, k) => `<span class="badge ${k < pos ? "b-gruen" : k === pos ? REP[s][0] : "b-grau"}">${k + 1}. ${REP[s][1]}</span>`).join("")}${r.status === "abgelehnt" ? '<span class="badge b-grau">abgelehnt</span>' : ""}</div></div>
      ${aktion ? `<div class="karte">${aktion}</div>` : ""}`;
  },
};
AKTIONEN.kvSpeichern = async (id) => {
  const f = formWerte(document.getElementById("kvForm"));
  await speichere("reparaturen", { ...hole("reparaturen", id), werkstatt_id: f.werkstatt, kosten: Number(f.kosten || 0), status: "angebot" });
  zeige("reparatur", { id }, { ersetzen: true });
};
AKTIONEN.repStatus = async (x) => {
  const [id, st] = x.split("|");
  const r = hole("reparaturen", id);
  await speichere("reparaturen", { ...r, status: st, ...(st === "freigegeben" ? { freigegeben_von: S.ich.id } : {}) });
  if (st === "erledigt" || st === "abgelehnt") await speichere("inventar", { ...hole("inventar", r.inventar_id), status: "verfuegbar" });
  if (st === "in_arbeit") await speichere("inventar", { ...hole("inventar", r.inventar_id), status: "reparatur" });
  toast("Status: " + REP[st][1]);
  zeige("reparatur", { id }, { ersetzen: true });
};
AKTIONEN.repAnFv = async (id) => {
  const r = hole("reparaturen", id);
  await senden({ an: liste("personen", (p) => (p.rollen || []).includes("vorstand")).map((p) => p.id), betreff: "Freigabe Reparatur", text: `Bitte Reparatur freigeben: ${hole("inventar", r.inventar_id)?.bezeichnung}, ${geld(r.kosten)}`, ereignis: "instrument" });
  toast("📨 Vorstand informiert (simuliert)");
};

// ---------- Förderverein: Einkauf & Spenden ----------
const EK = { bedarf: "Bedarf", angebote: "Angebote", freigegeben: "freigegeben", bestellt: "bestellt", geliefert: "geliefert", inventarisiert: "inventarisiert", abgelehnt: "abgelehnt" };
VIEWS.foerderverein = {
  render() {
    const ek = liste("einkaeufe").sort((a, b) => (b.angelegt_am || "").localeCompare(a.angelegt_am || ""));
    const sp = liste("spenden").sort((a, b) => b.datum.localeCompare(a.datum));
    const reps = liste("reparaturen", (r) => r.status === "angebot");
    const summe = sp.filter((s) => s.datum.startsWith(String(new Date().getFullYear()))).reduce((a, s) => a + Number(s.betrag || 0), 0);
    return kopf("💛 Förderverein") + `<div class="kennzahlen"><div class="kennzahl"><b>${geld(summe)}</b><small>Spenden ${new Date().getFullYear()}</small></div><div class="kennzahl"><b>${ek.filter((e) => !["inventarisiert", "abgelehnt"].includes(e.status)).length}</b><small>Einkäufe offen</small></div><div class="kennzahl"><b>${reps.length}</b><small>Reparaturen zur Freigabe</small></div></div>
      ${reps.length ? `<div class="karte"><h3>🔧 Freigaben Reparatur</h3><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl">${esc(hole("inventar", r.inventar_id)?.bezeichnung)} – ${esc(r.meldung)}</div><b>${geld(r.kosten)}</b></li>`).join("")}</ul></div>` : ""}
      <div class="karte"><h3>🛒 Einkauf / Beschaffung</h3><ul class="liste">${ek.map((e) => `<li class="klick" data-a="oeffne" data-x="einkauf|${e.id}"><div class="fl"><div class="zeile-titel">${esc(e.titel)}</div><div class="zeile-unter">${geld(e.betrag)} · ${esc(e.finanzierung || "")}</div></div><span class="badge">${EK[e.status]}</span></li>`).join("")}</ul><button class="knopf" data-a="einkaufNeu">＋ Bedarf melden</button></div>
      <div class="karte"><h3>💛 Spenden & Unterstützer</h3><ul class="liste">${sp.map((s) => `<li><div class="fl"><div class="zeile-titel">${esc(hole("personen", s.person_id)?.firma || name(s.person_id))}</div><div class="zeile-unter">${datumKurz(s.datum)} · ${s.betrag ? geld(s.betrag) : esc(s.sachspende || "")} · ${esc(s.zweck || "")}</div></div>${s.dank_gesendet ? '<span class="badge b-gruen">Dank ✔</span>' : `<button class="knopf klein" data-a="dankSenden" data-x="${s.id}">💌 Danken</button>`}</li>`).join("")}</ul>
      <p class="hinweis">Zuwendungsbestätigungen stellt der Förderverein aus – die App liefert nur die Liste. Keine Buchhaltung in der App.</p></div>`;
  },
};
VIEWS.einkauf = {
  render({ id }) {
    const e = hole("einkaeufe", id);
    if (!e) return kopf("Einkauf") + '<div class="leer">Nicht gefunden.</div>';
    const folge = { bedarf: "angebote", angebote: "freigegeben", freigegeben: "bestellt", bestellt: "geliefert", geliefert: "inventarisiert" };
    const naechst = folge[e.status];
    const darf = naechst !== "freigegeben" || darfFreigeben(e.betrag);
    return kopf("🛒 " + esc(e.titel)) + `<div class="karte"><p>${esc(e.begruendung || "")}</p><div class="hinweis">${geld(e.betrag)} · ${esc(e.finanzierung || "")}${e.haendler_id ? " · " + esc(hole("personen", e.haendler_id)?.firma || "") : ""}</div>
      <div class="zaehler">${Object.entries(EK).filter(([k]) => k !== "abgelehnt").map(([k, t]) => `<span class="badge ${k === e.status ? "b-blau" : ""}">${t}</span>`).join("")}</div>
      ${naechst && istVerwalter() ? `<div class="knopfreihe">${darf ? `<button class="knopf haupt" data-a="ekWeiter" data-x="${id}|${naechst}">➡️ ${EK[naechst]}</button>` : '<span class="badge b-gelb">Freigabe durch Förderverein-Vorstand</span>'}<button class="knopf rot" data-a="ekWeiter" data-x="${id}|abgelehnt">Ablehnen</button></div>` : ""}
      ${naechst === "inventarisiert" ? '<p class="hinweis">Beim Inventarisieren wird automatisch ein Inventar-Eintrag angelegt.</p>' : ""}</div>`;
  },
};
AKTIONEN.ekWeiter = async (x) => {
  const [id, st] = x.split("|");
  const e = hole("einkaeufe", id);
  await speichere("einkaeufe", { ...e, status: st });
  if (st === "inventarisiert") {
    const nr = `BK-${String(liste("inventar").length + 1).padStart(3, "0")}`;
    await speichere("inventar", { inventar_nr: nr, typ_id: liste("instrument_typen")[0].id, bezeichnung: e.titel, status: "verfuegbar", zustand: "sehr_gut", wert: e.betrag, anschaffung: tagIso(new Date()), finanziert_von: e.finanzierung, standort: "Instrumentenraum" });
    toast(`🏷️ Als ${nr} inventarisiert – Typ bitte in der PC-Verwaltung prüfen`);
  }
  zeige("einkauf", { id }, { ersetzen: true });
};
AKTIONEN.einkaufNeu = () => blatt("Bedarf melden", `<div id="ekForm"><div class="feld"><label>Was wird gebraucht?</label><input name="titel"></div><div class="feld"><label>Begründung</label><textarea name="begruendung"></textarea></div><div class="feld"><label>geschätzter Betrag (€)</label><input type="number" name="betrag"></div><button class="knopf haupt breit" data-a="einkaufSpeichern">Speichern</button></div>`);
AKTIONEN.einkaufSpeichern = async () => {
  const f = formWerte(document.getElementById("ekForm"));
  if (!f.titel) return;
  await speichere("einkaeufe", { titel: f.titel, begruendung: f.begruendung, betrag: Number(f.betrag || 0), status: "bedarf", finanzierung: "foerderverein", angelegt_am: tagIso(new Date()) });
  blattZu(); zeige("foerderverein", {}, { ersetzen: true });
};
AKTIONEN.dankSenden = async (id) => {
  const s = hole("spenden", id);
  await senden({ an: [s.person_id], betreff: "Herzlichen Dank!", text: `Vielen Dank für Ihre Unterstützung (${s.zweck || "Bachkreis"})!`, ereignis: "rundschreiben", kanaele: ["mail"] });
  await speichere("spenden", { ...s, dank_gesendet: true });
  toast("💌 Dank gesendet (simuliert)");
  zeige("foerderverein", {}, { ersetzen: true });
};

// ---------- Mein Leihinstrument ----------
VIEWS.meininstrument = {
  render() {
    const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
    const al = ids.flatMap((p) => ausleihenVon(db, p));
    return kopf(istEltern() ? "🎻 Leihinstrumente" : "🎻 Mein Leihinstrument") + (al.map((a) => {
      const i = hole("inventar", a.inventar_id);
      const faellig = a.bis && a.bis < tagIso(new Date());
      return `<div class="karte"><div class="zeile-titel">${esc(typName(i.typ_id))} ${esc(i.groesse || "")} – ${esc(i.inventar_nr)}</div><div>${esc(i.bezeichnung || "")}</div>${istEltern() ? `<div class="hinweis">für ${esc(vorname(a.person_id))}</div>` : ""}
        <p>Ausgeliehen seit ${datumKurz(a.von)} · Rückgabe bis <b class="${faellig ? "b-rot badge" : ""}">${datumKurz(a.bis)}</b></p><button class="knopf" data-a="schadenForm" data-x="${i.id}">🩹 Schaden melden</button></div>`;
    }).join("") || '<div class="leer">Kein Leihinstrument. Wenn du eins brauchst, sprich die Leitung an.</div>');
  },
};
