// AUTOMATISCH KOPIERT aus js/kern/logik.js (tools/server-kopie.mjs) – nicht von Hand ändern.
// Fachlogik ohne Oberfläche – rein, testbar (tests/logik.test.mjs). Bekommt einen Datenzugriff „db“ mit
// liste(tab, filter), hole(tab, id), konfig(). Dieselben Regeln gelten später serverseitig.
import { AUSSTATTUNG_KATEGORIEN, ND_INSTRUMENT, GWG_GRENZE, INVENTAR_ABGANG, FOTO_ZWECKE, elternZugriff, TABELLEN, TABELLEN_NAMEN } from "./schema.js";

export const tagIso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const imZeitraum = (z, tag) => (!z.von || z.von <= tag) && (!z.bis || z.bis >= tag);

// ---------- Gruppen ----------
// Regel: Stammgruppe = generelle Zuordnung (mit Historie über von/bis). Temporäre Zuordnung = ZUSÄTZLICHE Gruppe im
// Zeitraum (z. B. Aushilfe B → A); ist ein Projekt gesetzt, gilt sie nur für Termine dieses Projekts.
export function stammgruppe(db, personId, datum = new Date()) {
  const tag = tagIso(datum);
  const z = db.liste("gruppe_zuordnung", (x) => x.person_id === personId && x.art === "stamm" && imZeitraum(x, tag))
    .sort((a, b) => (b.von || "").localeCompare(a.von || ""))[0];
  return z ? z.gruppe_id : null;
}
export function wirksameGruppen(db, personId, datum = new Date(), projektId = null) {
  const tag = tagIso(datum);
  const g = new Set();
  const s = stammgruppe(db, personId, datum);
  if (s) g.add(s);
  for (const z of db.liste("gruppe_zuordnung", (x) => x.person_id === personId && x.art === "temporaer" && imZeitraum(x, tag))) {
    if (z.projekt_id && z.projekt_id !== projektId) continue;
    g.add(z.gruppe_id);
  }
  return [...g];
}
export function temporaereZuordnungen(db, personId, datum = new Date()) {
  const tag = tagIso(datum);
  return db.liste("gruppe_zuordnung", (x) => x.person_id === personId && x.art === "temporaer" && (!x.bis || x.bis >= tag));
}
// Genereller Wechsel: alte Stammzuordnung endet am Vortag, neue beginnt am Stichtag (Historie bleibt erhalten).
export function generellerWechselPlan(db, personId, neueGruppe, abDatum) {
  const ab = tagIso(abDatum);
  const vortag = tagIso(new Date(new Date(ab).getTime() - 86400000));
  const alt = db.liste("gruppe_zuordnung", (x) => x.person_id === personId && x.art === "stamm" && imZeitraum(x, ab));
  return {
    beenden: alt.map((z) => ({ ...z, bis: vortag })),
    neu: { person_id: personId, gruppe_id: neueGruppe, art: "stamm", von: ab, bis: null },
  };
}
export function gruppenMitglieder(db, gruppeId, datum = new Date()) {
  const ids = new Set(db.liste("gruppe_zuordnung", (z) => z.gruppe_id === gruppeId).map((z) => z.person_id));
  return [...ids].filter((p) => wirksameGruppen(db, p, datum).includes(gruppeId));
}

// ---------- Instrumente / Register ----------
export function instrumenteVon(db, personId) {
  return db.liste("person_instrument", (x) => x.person_id === personId).sort((a, b) => (b.haupt ? 1 : 0) - (a.haupt ? 1 : 0));
}
export function registerVon(db, personId, antwort = null) {
  if (antwort?.register_id) return antwort.register_id;
  const h = instrumenteVon(db, personId)[0];
  if (!h) return null;
  return h.register_id || db.hole("instrument_typen", h.typ_id)?.register_id || null;
}

// ---------- Termine ----------
export function eingeladen(db, termin, personId) {
  const gr = wirksameGruppen(db, personId, termin.beginn, termin.projekt_id);
  if (termin.fuer_alle) return gr.length > 0; // 🌍 für alle: jeder, der in irgendeinem Orchester ist (auch Ehemalige)
  if (!gr.some((g) => (termin.gruppen || []).includes(g))) return false;
  if (termin.register?.length) return termin.register.includes(registerVon(db, personId));
  return true;
}
export function eingeladene(db, termin) {
  const kandidaten = new Set(db.liste("gruppe_zuordnung", (z) => termin.fuer_alle || (termin.gruppen || []).includes(z.gruppe_id)).map((z) => z.person_id));
  return [...kandidaten].filter((p) => {
    const person = db.hole("personen", p);
    return person && person.status !== "ausgetreten" && eingeladen(db, termin, p);
  });
}
// ❗ erforderlich · 🙂 erwünscht · ℹ️ nur zur Info – ohne Angabe: Pflicht-Terminart → erforderlich, sonst erwünscht
export const teilnahmeVon = (db, t) => t?.teilnahme || (db.hole("terminarten", t?.art_id)?.pflicht ? "pflicht" : "erwuenscht");
// 🙋 eigene Termine (auch „jede Woche bis …“) als einzelne Vorkommen im Zeitraum
export function eigeneVorkommen(e, von, bis) {
  const out = [], dauer = e.ende ? new Date(e.ende) - new Date(e.beginn) : 0, ende = e.woechentlich_bis ? new Date(e.woechentlich_bis + "T23:59:59") : new Date(e.beginn);
  for (let b = new Date(e.beginn), n = 0; b <= ende && n < 60; b = new Date(b.getTime() + 7 * 86400000), n++) {
    if (b >= von && b <= bis) out.push({ ...e, id: `${e.id}@${n}`, eigen_id: e.id, beginn: b.toISOString(), ende: dauer ? new Date(b.getTime() + dauer).toISOString() : null, eigen: true });
  }
  return out;
}
export const antwortVon = (db, terminId, personId) => db.liste("antworten", (a) => a.termin_id === terminId && a.person_id === personId)[0] || null;

export function antwortZaehler(db, termin) {
  const ids = eingeladene(db, termin);
  const z = { ja: 0, vielleicht: 0, nein: 0, offen: 0, gesamt: ids.length };
  for (const p of ids) { const a = antwortVon(db, termin.id, p); z[a ? a.antwort : "offen"]++; }
  return z;
}

// Besetzungsampel je Register.
// grün = Zusagen erfüllen Soll · gelb = nur mit „vielleicht“ erfüllt · grau = UNBEKANNT (es fehlen noch Antworten, die
// das Soll erfüllen könnten) – nie als OK zählen (AGENTS.md Regel 11) · rot = selbst wenn alle Offenen kämen, reicht es nicht.
export function besetzung(db, termin) {
  const soll = termin.soll || {};
  const regs = db.liste("register").sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const zeilen = {};
  for (const r of regs) zeilen[r.id] = { register: r, soll: soll[r.id] || 0, ja: 0, vielleicht: 0, nein: 0, offen: 0, personen: [] };
  for (const p of eingeladene(db, termin)) {
    const a = antwortVon(db, termin.id, p);
    const reg = registerVon(db, p, a);
    if (!reg || !zeilen[reg]) continue;
    zeilen[reg][a ? a.antwort : "offen"]++;
    zeilen[reg].personen.push({ id: p, antwort: a?.antwort || "offen" });
  }
  const liste = Object.values(zeilen).filter((z) => z.soll > 0 || z.ja + z.vielleicht + z.nein + z.offen > 0);
  for (const z of liste) z.ampel = ampel(z);
  return liste;
}
export function ampel(z) {
  if (!z.soll) return "neutral";
  if (z.ja >= z.soll) return "gruen";
  if (z.ja + z.vielleicht >= z.soll) return "gelb";
  if (z.ja + z.vielleicht + z.offen >= z.soll) return "grau";
  return "rot";
}
export function gesamtAmpel(liste) {
  const f = liste.map((z) => z.ampel).filter((a) => a !== "neutral");
  if (!f.length) return "neutral";
  for (const a of ["rot", "grau", "gelb"]) if (f.includes(a)) return a;
  return "gruen";
}

export function termineFuer(db, personId, { abHeute = true, heute = new Date() } = {}) {
  const grenze = new Date(heute); grenze.setHours(0, 0, 0, 0);
  return db.liste("termine", (t) => (!abHeute || new Date(t.ende || t.beginn) >= grenze) && eingeladen(db, t, personId))
    .sort((a, b) => a.beginn.localeCompare(b.beginn));
}

// ---------- Eltern / Kinder ----------
export const kinderVon = (db, elternId) => db.liste("eltern_kind", (e) => e.eltern_id === elternId && elternZugriff(e, db.hole("personen", e.kind_id))).map((e) => e.kind_id);
export const elternVon = (db, kindId) => { const k = db.hole("personen", kindId); return db.liste("eltern_kind", (e) => e.kind_id === kindId && elternZugriff(e, k)).map((e) => e.eltern_id); };

// ---------- Genehmigungen ----------
export function genehmigungStatus(g, heute = new Date()) {
  if (g.status === "ausstehend" && g.frist && g.frist < tagIso(heute)) return "ueberfaellig";
  return g.status;
}
export function genehmigungsUebersicht(db, filter = () => true, heute = new Date()) {
  const gruppen = {};
  for (const g of db.liste("genehmigungen", filter)) {
    const key = `${g.vorlage_id}|${g.projekt_id || ""}`;
    const e = gruppen[key] || (gruppen[key] = { vorlage: db.hole("genehmigung_vorlagen", g.vorlage_id), projekt: g.projekt_id ? db.hole("projekte", g.projekt_id) : null, erteilt: 0, ausstehend: 0, ueberfaellig: 0, abgelehnt: 0, widerrufen: 0, gesamt: 0, frist: g.frist, eintraege: [] });
    e[genehmigungStatus(g, heute)]++; e.gesamt++; e.eintraege.push(g);
  }
  return Object.values(gruppen);
}

// ---------- Instrumente ----------
export function aktiveAusleihe(db, inventarId) { return db.liste("ausleihen", (a) => a.inventar_id === inventarId && a.status === "aktiv")[0] || null; }
export function ausleihenVon(db, personId) { return db.liste("ausleihen", (a) => a.person_id === personId && a.status !== "zurueck"); }

// ---------- Verteiler (automatische Zielgruppen) ----------
export function verteilerListe(db) {
  const v = [{ key: "alle", name: "Alle aktiven Schüler" }, { key: "alle_eltern", name: "Alle Eltern" }];
  for (const g of db.liste("gruppen").sort((a, b) => a.sort - b.sort)) {
    v.push({ key: `gruppe:${g.id}`, name: `${g.name} (Schüler)` });
    v.push({ key: `eltern:${g.id}`, name: `Eltern ${g.name}` });
  }
  for (const r of db.liste("register").sort((a, b) => a.sort - b.sort)) v.push({ key: `register:${r.id}`, name: `Register ${r.name}` });
  for (const p of db.liste("projekte")) v.push({ key: `projekt:${p.id}`, name: `Teilnehmer ${p.titel}` }, { key: `projekteltern:${p.id}`, name: `Eltern ${p.titel}` });
  v.push({ key: "typ:lehrkraft", name: "Lehrkräfte" }, { key: "typ:foerderverein", name: "Förderverein-Vorstand" }, { key: "typ:spender", name: "Spender & Unterstützer" }, { key: "typ:partner", name: "Partner (Schule, Musikschule …)" }, { key: "typ:ehemalig", name: "Ehemalige" });
  return v;
}
export function verteilerAufloesen(db, key, heute = new Date()) {
  const [art, id] = key.split(":");
  const aktiv = (p) => p && p.status !== "ausgetreten";
  const schueler = () => db.liste("personen", (p) => p.typ === "schueler" && aktiv(p)).map((p) => p.id);
  const elternVonListe = (kids) => [...new Set(kids.flatMap((k) => elternVon(db, k)))];
  const projektTeilnehmer = (pid) => [...new Set(db.liste("termine", (t) => t.projekt_id === pid).flatMap((t) => eingeladene(db, t)))];
  switch (art) {
    case "alle": return schueler();
    case "alle_eltern": return db.liste("personen", (p) => p.typ === "eltern" && aktiv(p)).map((p) => p.id);
    case "gruppe": return gruppenMitglieder(db, id, heute);
    case "eltern": return elternVonListe(gruppenMitglieder(db, id, heute));
    case "register": return db.liste("person_instrument", (x) => x.register_id === id).map((x) => x.person_id).filter((p) => aktiv(db.hole("personen", p)));
    case "projekt": return projektTeilnehmer(id);
    case "projekteltern": return elternVonListe(projektTeilnehmer(id));
    case "typ": return db.liste("personen", (p) => (id === "spender" ? ["spender", "unterstuetzer"].includes(p.typ) : p.typ === id) && aktiv(p)).map((p) => p.id);
    default: return [];
  }
}

// ---------- Cockpit ----------
// Liefert Einträge {bereich, dring (0..3), sym, text, ziel, aktion}. bereich: heute | ich | andere | bald
export function cockpit(db, ichId, heute = new Date()) {
  const k = db.konfig();
  const h = tagIso(heute);
  const inTagen = (n) => tagIso(new Date(heute.getTime() + n * 86400000));
  const out = [];
  // Heute / diese Woche: Termine mit Besetzung
  for (const t of db.liste("termine", (t) => t.status !== "abgesagt" && tagIso(t.beginn) >= h && tagIso(t.beginn) <= inTagen(7)).sort((a, b) => a.beginn.localeCompare(b.beginn))) {
    const b = besetzung(db, t); const ga = gesamtAmpel(b);
    const z = antwortZaehler(db, t);
    out.push({ bereich: "heute", dring: ga === "rot" ? 3 : ga === "grau" ? 2 : 1, sym: "📅", ampel: ga, text: `${t.titel} – ${z.ja} Zusagen, ${z.offen} offen`, ziel: { view: "termin", id: t.id } });
  }
  // Projekte mit offenen Checkpunkten
  for (const p of db.liste("projekte", (p) => p.bis && p.bis >= h)) {
    const offen = (p.checkliste || "").split("\n").filter((l) => l.trim().startsWith("[ ]")).length;
    if (offen) out.push({ bereich: p.von <= inTagen(30) ? "heute" : "bald", dring: p.bis <= inTagen(21) ? 2 : 1, sym: "🎭", text: `${p.titel}: ${offen} offene Punkte auf der Checkliste`, ziel: { view: "projekt", id: p.id } });
  }
  // Wartet auf mich: Freigaben, Änderungsmeldungen, Wechselwünsche
  const grenze = Number(k.freigabe_grenze_eur || 0);
  for (const r of db.liste("reparaturen", (r) => r.status === "angebot")) {
    const i = r.inventar_id ? db.hole("inventar", r.inventar_id) : db.hole("ausstattung", r.ausstattung_id);
    out.push({ bereich: "ich", dring: 2, sym: "🔧", text: `Reparatur freigeben: ${i?.bezeichnung || "Instrument"} (${r.kosten ?? "?"} €)${r.kosten > grenze ? " – über Freigabegrenze, Förderverein" : ""}`, ziel: { view: "reparatur", id: r.id } });
  }
  for (const e of db.liste("einkaeufe", (e) => e.status === "angebote")) out.push({ bereich: "ich", dring: 1, sym: "🛒", text: `Einkauf entscheiden: ${e.titel} (${e.betrag} €)`, ziel: { view: "einkauf", id: e.id } });
  for (const a of db.liste("aufgaben", (a) => a.status !== "erledigt" && (a.zustaendig_id === ichId || !a.zustaendig_id))) out.push({ bereich: "ich", dring: a.frist && a.frist <= inTagen(3) ? 2 : 1, sym: a.art === "aenderung" ? "✏️" : a.art === "wechselwunsch" ? "🔀" : "🗂️", text: a.titel, ziel: { view: "aufgabe", id: a.id } });
  // Wartet auf andere: Genehmigungen, Rückgaben, Werkstatt, Bestellungen
  for (const u of genehmigungsUebersicht(db, () => true, heute)) {
    const offen = u.ausstehend + u.ueberfaellig;
    if (offen) out.push({ bereich: "andere", dring: u.ueberfaellig ? 3 : 1, sym: "✍️", text: `${u.vorlage?.titel}${u.projekt ? " · " + u.projekt.titel : ""}: ${offen} von ${u.gesamt} fehlen${u.ueberfaellig ? " (Frist abgelaufen)" : ""}`, ziel: { view: "genehmigungen" } });
  }
  for (const a of db.liste("ausleihen", (a) => a.status === "aktiv" && a.bis && a.bis <= inTagen(14))) {
    const i = db.hole("inventar", a.inventar_id), p = db.hole("personen", a.person_id);
    out.push({ bereich: a.bis < h ? "andere" : "bald", dring: a.bis < h ? 2 : 1, sym: "🎻", text: `${a.bis < h ? "Rückgabe überfällig" : "Rückgabe bald"}: ${i?.bezeichnung || "Instrument"} (${p ? p.vorname + " " + p.nachname : "?"})`, ziel: { view: "instrument", id: a.inventar_id } });
  }
  for (const r of db.liste("reparaturen", (r) => r.status === "in_arbeit" || r.status === "freigegeben")) {
    const i = r.inventar_id ? db.hole("inventar", r.inventar_id) : db.hole("ausstattung", r.ausstattung_id);
    out.push({ bereich: "andere", dring: 0, sym: "🔧", text: `In der Werkstatt: ${i?.bezeichnung || "Instrument"}`, ziel: { view: "reparatur", id: r.id } });
  }
  for (const r of db.liste("reparaturen", (r) => r.status === "gemeldet")) {
    const i = r.inventar_id ? db.hole("inventar", r.inventar_id) : db.hole("ausstattung", r.ausstattung_id);
    out.push({ bereich: "ich", dring: 1, sym: "🩹", text: `Neue Schadensmeldung: ${i?.bezeichnung || "Instrument"} – Kostenvoranschlag einholen`, ziel: { view: "reparatur", id: r.id } });
  }
  for (const e of db.liste("einkaeufe", (e) => e.status === "bestellt")) out.push({ bereich: "andere", dring: 0, sym: "📦", text: `Bestellt, Lieferung offen: ${e.titel}`, ziel: { view: "einkauf", id: e.id } });
  // ✨ 0.22.0: Mietmaterial zurück an den Verlag, Schlüssel überfällig, Führungszeugnis der Begleitpersonen, Förderverein-Beiträge
  for (const w of db.liste("werke", (w) => w.miete_bis && w.miete_bis <= inTagen(30))) {
    const st = new Set(db.liste("stimmen", (x) => x.werk_id === w.id).map((x) => x.id));
    const draussen = db.liste("notenexemplare", (e) => st.has(e.stimme_id) && e.person_id && !e.zurueck_am).length;
    out.push({ bereich: w.miete_bis < h ? "heute" : "bald", dring: w.miete_bis < h ? 3 : 2, sym: "📜", text: `Mietmaterial „${w.titel}“ zurück bis ${w.miete_bis.split("-").reverse().join(".")}${draussen ? ` – ${draussen} Exemplare noch bei Spielern` : ""}`, ziel: { view: "noten", werk: w.id } });
  }
  for (const s2 of db.liste("schluessel", (x) => x.status === "ausgegeben" && x.rueckgabe_bis && x.rueckgabe_bis < h)) {
    const p = db.hole("personen", s2.person_id);
    out.push({ bereich: "andere", dring: 1, sym: "🔑", text: `Schlüssel ${s2.nr} (${s2.bezeichnung || ""}) überfällig bei ${p ? p.vorname + " " + p.nachname : "?"}`, ziel: { view: "cockpit" } });
  }
  const fzAlt = new Date(heute); fzAlt.setFullYear(fzAlt.getFullYear() - 5);
  const begleiter = new Set(db.liste("projekte", (p) => p.bis && p.bis >= h).flatMap((p) => p.begleiter || []));
  const ohneFz = [...begleiter].map((id) => db.hole("personen", id)).filter((p) => p && (!p.fz_vorgelegt_am || new Date(p.fz_vorgelegt_am) < fzAlt));
  if (ohneFz.length) out.push({ bereich: "ich", dring: 2, sym: "🛡️", text: `Führungszeugnis fehlt/älter als 5 Jahre: ${ohneFz.map((p) => p.vorname + " " + p.nachname).join(", ")} (Begleitperson)`, ziel: { view: "cockpit" } });
  const offenFv = db.liste("fv_mitglieder", (m) => !m.austritt && m.beitrag_art !== "ehren" && (!m.bezahlt_bis || m.bezahlt_bis < `${heute.getFullYear()}-01-01`)).length;
  if (offenFv) out.push({ bereich: "andere", dring: 0, sym: "💛", text: `Förderverein: ${offenFv} Mitgliedsbeiträge für ${heute.getFullYear()} offen`, ziel: { view: "foerderverein" } });
  // Fällig bald: Wartung, temporäre Zuordnungen laufen aus, Termin-Fristen
  const wartung = db.liste("inventar", (i) => !INVENTAR_ABGANG.includes(i.status) && i.wartung_faellig && i.wartung_faellig <= inTagen(30));
  if (wartung.length) out.push({ bereich: "bald", dring: wartung.some((i) => i.wartung_faellig < h) ? 2 : 1, sym: "🧰", text: `Wartung fällig: ${wartung.length} Instrument${wartung.length === 1 ? "" : "e"}`, ziel: { view: "instrumente", filter: "wartung" } });
  for (const z of db.liste("gruppe_zuordnung", (z) => z.art === "temporaer" && z.bis && z.bis >= h && z.bis <= inTagen(21))) {
    const p = db.hole("personen", z.person_id), g = db.hole("gruppen", z.gruppe_id);
    out.push({ bereich: "bald", dring: 0, sym: "🔀", text: `Temporär in ${g?.kuerzel}: ${p?.vorname} ${p?.nachname} bis ${z.bis.split("-").reverse().join(".")}`, ziel: { view: "person", id: z.person_id } });
  }
  const nach = Number(k.nachfass_tage || 3);
  for (const t of db.liste("termine", (t) => t.status !== "abgesagt" && t.frist && t.frist >= h && t.frist <= inTagen(nach))) {
    const z = antwortZaehler(db, t);
    if (z.offen) out.push({ bereich: "bald", dring: 1, sym: "⏰", text: `Antwortfrist ${t.titel}: ${z.offen} ohne Antwort – nachfassen?`, ziel: { view: "termin", id: t.id } });
  }
  return out.sort((a, b) => b.dring - a.dring);
}

// ---------- Kalender (.ics) ----------
// Für Apple-, Google- und Outlook-Kalender: Termine (mit Erinnerung „alarm“ Minuten vorher) und – wenn gewünscht –
// die eigenen 🎻 Übezeiten als wöchentlich wiederkehrende Termine mit eigener Erinnerung (RRULE + VALARM).
const icsZeit = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);
// Zeilen über 75 Zeichen falten (RFC 5545) – sonst schneiden manche Kalender lange Beschreibungen ab
const falten = (z) => { const out = []; let r = z; while (r.length > 73) { out.push(r.slice(0, 73)); r = " " + r.slice(73); } out.push(r); return out.join("\r\n"); };
const BYDAY = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const alarmZeilen = (min, text) => (min > 0 ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(text)}`, `TRIGGER:-PT${min}M`, "END:VALARM"] : []);
// Nächstes Datum (YYYYMMDD, Ortszeit) ab heute, das auf einen der Wochentage (1=Mo … 7=So) fällt
function uebeStart(tage, heute = new Date()) {
  for (let i = 0; i < 7; i++) { const d = new Date(heute); d.setDate(d.getDate() + i); const wt = d.getDay() || 7; if (tage.includes(wt)) return d; }
  return heute;
}
export function uebeRrule(plan) { return `FREQ=WEEKLY;BYDAY=${(plan.tage || []).map((t) => BYDAY[t]).join(",")}`; }
export function ics(termine, name = "Bachkreis", { alarm = 0, uebe = null, titelVor = null, heute = new Date() } = {}) {
  const z = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bachkreis-App//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(name)}`, "X-WR-TIMEZONE:Europe/Berlin", "REFRESH-INTERVAL;VALUE=DURATION:PT2H", "X-PUBLISHED-TTL:PT2H"];
  for (const t of termine) {
    const vor = titelVor?.(t);
    z.push("BEGIN:VEVENT", `UID:${t.id}@bachkreis-app`, `DTSTAMP:${icsZeit(new Date())}`, `DTSTART:${icsZeit(t.beginn)}`, `DTEND:${icsZeit(t.ende || t.beginn)}`,
      `SUMMARY:${icsText((vor ? vor + ": " : "") + (t.status === "abgesagt" ? "ABGESAGT – " : "") + t.titel)}`, `LOCATION:${icsText(t.ort)}`, `DESCRIPTION:${icsText(t.beschreibung)}`,
      t.status === "abgesagt" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED", ...(t.status === "abgesagt" ? [] : alarmZeilen(alarm, t.titel)), "END:VEVENT");
  }
  if (uebe?.an && uebe.tage?.length) {
    const d = uebeStart(uebe.tage, heute), [h, m] = String(uebe.zeit || "17:00").split(":").map(Number), zw = (n) => String(n).padStart(2, "0");
    const ende = new Date(d); ende.setHours(h, m + (uebe.dauer || 30), 0, 0);
    const tag = `${d.getFullYear()}${zw(d.getMonth() + 1)}${zw(d.getDate())}`;
    z.push("BEGIN:VEVENT", `UID:ueben-${uebe.id || "ich"}@bachkreis-app`, `DTSTAMP:${icsZeit(new Date())}`, `DTSTART;TZID=Europe/Berlin:${tag}T${zw(h)}${zw(m)}00`,
      `DTEND;TZID=Europe/Berlin:${tag}T${zw(ende.getHours())}${zw(ende.getMinutes())}00`, `RRULE:${uebeRrule(uebe)}`, `SUMMARY:${icsText("🎻 Üben" + (uebe.wer ? " – " + uebe.wer : ""))}`,
      `DESCRIPTION:${icsText(`Übezeit aus der Bachkreis-App (${uebe.dauer || 30} Min.). Danach in der App unter „🎻 Üben“ eintragen.`)}`, ...alarmZeilen(uebe.alarm ?? 10, "Zeit zum Üben 🎻"), "END:VEVENT");
  }
  z.push("END:VCALENDAR");
  return z.map(falten).join("\r\n");
}
// „Zu Google Kalender hinzufügen“ für EINEN Termin (ohne Konto-Verbindung: Google öffnet die Vorlage, man tippt „Speichern“)
export function googleKalenderLink(t) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: t.titel, dates: `${icsZeit(t.beginn)}/${icsZeit(t.ende || t.beginn)}`, location: t.ort || "", details: t.beschreibung || "", ctz: "Europe/Berlin" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

// ---------- WhatsApp-Übergabe (keine API, Mensch drückt „Senden“) ----------
export function waLink(text, nummer = "") {
  const n = String(nummer || "").replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^00/, "").replace(/^0/, "49");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// ---------- CSV ----------
export function csvAus(zeilen, spalten) {
  const esc = (v) => { const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [spalten.map(esc).join(";"), ...zeilen.map((z) => spalten.map((s) => esc(z[s])).join(";"))].join("\r\n");
}
export function csvEin(text) {
  const zeilen = []; let feld = "", zeile = [], inQ = false;
  const t = text.replace(/^\uFEFF/, "");
  const trenner = (t.split("\n")[0].match(/;/g) || []).length >= (t.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) { if (c === '"' && t[i + 1] === '"') { feld += '"'; i++; } else if (c === '"') inQ = false; else feld += c; }
    else if (c === '"') inQ = true;
    else if (c === trenner) { zeile.push(feld); feld = ""; }
    else if (c === "\n") { zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ""; }
    else if (c !== "\r") feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  const [kopf, ...rest] = zeilen.filter((z) => z.some((f) => f.trim()));
  if (!kopf) return [];
  return rest.map((z) => Object.fromEntries(kopf.map((k, i) => [k.trim(), z[i] ?? ""])));
}

// Gesetzliche Feiertage NRW (wie in der KC Club App) – für den Kalender
function osterSonntagIso(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}
const plusTage = (iso, n) => { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export function feiertageNRW(jahr) {
  const o = osterSonntagIso(jahr);
  return Object.fromEntries([[`${jahr}-01-01`, "Neujahr"], [plusTage(o, -2), "Karfreitag"], [plusTage(o, 1), "Ostermontag"], [`${jahr}-05-01`, "Tag der Arbeit"],
    [plusTage(o, 39), "Christi Himmelfahrt"], [plusTage(o, 50), "Pfingstmontag"], [plusTage(o, 60), "Fronleichnam"], [`${jahr}-10-03`, "Tag der Deutschen Einheit"],
    [`${jahr}-11-01`, "Allerheiligen"], [`${jahr}-12-25`, "1. Weihnachtstag"], [`${jahr}-12-26`, "2. Weihnachtstag"]]);
}

// ---------- Nachrichten (gemeinsam für App und Server – tools/server-kopie.mjs kopiert diese Datei) ----------
// Wer bekommt Nachrichten einer Unterhaltung? Verteiler (automatisch) + feste Mitglieder (+ Leitung bei Verteilern)
export function empfaengerVon(db, u) {
  if (!u) return [];
  if (u.verteiler) return [...new Set([...verteilerAufloesen(db, u.verteiler), ...(u.mitglieder || []), db.konfig().leitung_id].filter(Boolean))];
  return [...new Set(u.mitglieder || [])];
}
// ⏰ Wiederholung: nächster Sendezeitpunkt nach iso (jeden Tag, werktags, jede Woche, jeden Monat) – null bei „einmal“
export function naechsteSendung(iso, wdh) {
  const d = new Date(iso);
  if (wdh === "taeglich") d.setDate(d.getDate() + 1);
  else if (wdh === "werktags") { do d.setDate(d.getDate() + 1); while ([0, 6].includes(d.getDay())); }
  else if (wdh === "woechentlich") d.setDate(d.getDate() + 7);
  else if (wdh === "monatlich") { const tag = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(tag, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  else return null;
  return d.toISOString();
}
// Communicator-Ereignis einer Nachricht
export const nachrichtEreignis = (n, u) => (n.express ? "express" : n.wichtig ? "nachricht_wichtig" : u?.art === "verteiler" ? "rundschreiben" : "nachricht");
// Kurzfassung einer Nachricht für Chatliste und Benachrichtigung (Text, sonst 📊 Umfrage / 🎤 Sprachnachricht / 📷 Foto / 🎼 Noten / 📄 Datei)
export function nachrichtKurz(n) {
  if (n.text) return n.text;
  if (n.umfrage) return `📊 ${n.umfrage.frage}`;
  const a = (n.anlagen || [])[0]; if (!a) return "";
  const mehr = (n.anlagen || []).length > 1 ? ` (+${n.anlagen.length - 1})` : "";
  const d = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.round(s || 0) % 60).padStart(2, "0")}`;
  return (a.art === "sprache" ? `🎤 Sprachnachricht${a.dauer ? " " + d(a.dauer) : ""}` : a.art === "bild" ? "📷 Foto" : a.art === "video" ? "🎬 Video" : a.art === "noten" ? `🎼 Noten: ${a.name}` : `📄 ${a.name}`) + mehr;
}

// ---------- 📦 Abschreibung (0.19.0) ----------
// Linear monatsgenau ab dem Monat der Anschaffung (pro rata temporis), bis zum Monat des Abgangs; „sofort“ = ganz im
// Anschaffungsjahr (geringwertige Wirtschaftsgüter); ohne Angabe: bis GWG_GRENZE sofort, sonst linear. Richtwerte –
// die Werte der Kassenprüfung / Steuerberatung gehen vor (afa_art, afa_jahre am Datensatz).
const mIndex = (d) => d.getFullYear() * 12 + d.getMonth();
const rund2 = (x) => Math.round(x * 100) / 100;
export function nutzungsdauer(tab, z) {
  return Number(z.afa_jahre) || (tab === "ausstattung" ? AUSSTATTUNG_KATEGORIEN[z.kategorie]?.[2] || 5 : ND_INSTRUMENT);
}
export function abschreibung(tab, z, { stichtag = new Date(), jahr } = {}) {
  const basis = Number(z.wert) || 0, jahre = nutzungsdauer(tab, z);
  const art = z.afa_art || (basis > 0 && basis <= GWG_GRENZE ? "sofort" : "linear");
  const J = jahr ?? stichtag.getFullYear();
  const leer = { art, jahre, basis, kumuliert: 0, restwert: basis, afaJahr: 0, abgang: false, endeJahr: null };
  if (!basis || !z.anschaffung) return { ...leer, ohneDaten: true };
  const start = mIndex(new Date(z.anschaffung + "T12:00:00"));
  const abgang = INVENTAR_ABGANG.includes(z.status) && z.ausgeschieden_am ? mIndex(new Date(z.ausgeschieden_am + "T12:00:00")) : null;
  const monat = art === "linear" ? basis / (jahre * 12) : 0;
  const kumBis = (m) => { // kumulierte Abschreibung bis einschließlich Monat m
    if (abgang != null) m = Math.min(m, abgang);
    if (m < start || art === "keine") return 0;
    return art === "sofort" ? basis : Math.min(basis, (m - start + 1) * monat);
  };
  const jetzt = mIndex(stichtag), kum = kumBis(jetzt), weg = abgang != null && abgang <= jetzt;
  return { art, jahre, basis, kumuliert: rund2(kum), restwert: weg ? 0 : rund2(basis - kum), buchwertAbgang: weg ? rund2(basis - kum) : null,
    afaJahr: rund2(kumBis(J * 12 + 11) - kumBis(J * 12 - 1)), abgang: weg, endeJahr: art === "linear" ? Math.floor((start + jahre * 12 - 1) / 12) : art === "sofort" ? Math.floor(start / 12) : null };
}
// Ein Inventar-Bestand aus Instrumenten (inventar) und Ausstattung – einheitliche Zeilen für Übersicht, Anlagenverzeichnis, Etiketten
export function inventarBestand(db, { stichtag = new Date(), jahr } = {}) {
  const typName = (id) => db.hole("instrument_typen", id)?.name || "Instrument";
  const zeile = (tab, z) => ({ tab, z, id: z.id, nr: z.inventar_nr || "", art: tab === "inventar" ? "instrument" : z.kategorie || "sonstiges",
    name: tab === "inventar" ? `${typName(z.typ_id)}${z.groesse ? " " + z.groesse : ""}${z.bezeichnung ? " · " + z.bezeichnung : ""}` : z.bezeichnung || "",
    anzahl: tab === "inventar" ? 1 : Number(z.anzahl) || 1, afa: abschreibung(tab, z, { stichtag, jahr }) });
  return [...db.liste("inventar").map((z) => zeile("inventar", z)), ...db.liste("ausstattung").map((z) => zeile("ausstattung", z))]
    .sort((a, b) => a.nr.localeCompare(b.nr, "de", { numeric: true }));
}
// Nächste freie Inventar-Nr. mit Präfix (Instrumente „BK-“, Ausstattung „A-“) – über beide Tabellen eindeutig
export function naechsteInventarNr(db, praefix = "A-") {
  const n = [...db.liste("inventar"), ...db.liste("ausstattung")].map((z) => String(z.inventar_nr || "")).filter((x) => x.startsWith(praefix)).map((x) => parseInt(x.slice(praefix.length), 10) || 0);
  return praefix + String(Math.max(0, ...n) + 1).padStart(3, "0");
}

// ---------- 📷 Einwilligungen je Zweck (0.20.0) ----------
// Stand einer Einwilligung (Vorlagen mit diesem Zweck): "ja" = erteilt und nicht abgelaufen, "nein" = abgelehnt/widerrufen, "offen" = nichts da.
// "offen" heißt im Zweifel NEIN (nicht fotografieren/veröffentlichen). Gibt es noch keine Vorlage für den Zweck, gilt das alte Feld foto_ok.
export function einwilligung(db, kindId, zweck, heute = new Date()) {
  const vorlagen = db.liste("genehmigung_vorlagen", (v) => v.zweck === zweck);
  if (!vorlagen.length) { const p = db.hole("personen", kindId); return FOTO_ZWECKE.includes(zweck) && p?.foto_ok != null ? (p.foto_ok ? "ja" : "nein") : "offen"; }
  const ids = new Set(vorlagen.map((v) => v.id));
  const g = db.liste("genehmigungen", (x) => x.kind_id === kindId && ids.has(x.vorlage_id) && x.status !== "ausstehend").sort((a, b) => String(b.beantwortet_am || "").localeCompare(String(a.beantwortet_am || "")))[0];
  if (!g) return "offen";
  if (g.status !== "erteilt") return "nein";
  const monate = Number(vorlagen.find((v) => v.id === g.vorlage_id)?.gueltig_monate) || 0;
  if (monate && g.beantwortet_am) { const bis = new Date(g.beantwortet_am); bis.setMonth(bis.getMonth() + monate); if (bis < heute) return "offen"; }
  return "ja";
}
export const fotoErlaubnis = (db, kindId, heute = new Date()) => Object.fromEntries(FOTO_ZWECKE.map((z) => [z, einwilligung(db, kindId, z, heute)]));

// ---------- 📋 Anwesenheit & Fehlzeiten (0.20.0) ----------
// Zählt je Person über vergangene Termine im Zeitraum: da, verspätet, entschuldigt, unentschuldigt; Quote = (da + verspätet) / erfasst.
export function fehlzeiten(db, { von, bis = new Date(), personen = null, gruppe = null } = {}) {
  const termine = db.liste("termine", (t) => new Date(t.beginn) < bis && (!von || new Date(t.beginn) >= von) && t.status !== "abgesagt" && (!gruppe || t.fuer_alle || (t.gruppen || []).includes(gruppe)));
  const tIds = new Set(termine.map((t) => t.id)), m = new Map();
  for (const a of db.liste("antworten", (a) => tIds.has(a.termin_id) && a.anwesend)) {
    if (personen && !personen.includes(a.person_id)) continue;
    const z = m.get(a.person_id) || { person_id: a.person_id, ja: 0, spaet: 0, entschuldigt: 0, nein: 0, erfasst: 0 };
    if (z[a.anwesend] != null) z[a.anwesend]++;
    z.erfasst++; m.set(a.person_id, z);
  }
  return [...m.values()].map((z) => ({ ...z, quote: z.erfasst ? Math.round(((z.ja + z.spaet) / z.erfasst) * 100) : null })).sort((a, b) => (a.quote ?? 101) - (b.quote ?? 101) || b.nein - a.nein);
}

// ---------- 🎓 Schuljahreswechsel nach Regeln (0.21.0) ----------
// Je Gruppe: „weiter in Gruppe … ab Jahrgangsstufe …“; nach dem Abschlussjahrgang (konfig.abschluss_jahrgang, Standard 12) in die
// Gruppe mit „Ehemalige“. Hinweise zeigen, was beim Übergang zu den Ehemaligen noch offen ist (Leihinstrument, Genehmigungen).
export function schuljahrVorschlaege(db, { abschluss = 12, stichtag = new Date() } = {}) {
  const ehem = db.liste("gruppen", (g) => g.ehemalige && g.aktiv !== false)[0];
  return db.liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten").map((p) => {
    const jg = Number(p.jahrgang || 0) + 1, g = stammgruppe(db, p.id, stichtag), gr = g ? db.hole("gruppen", g) : null;
    let ziel = null, grund = "";
    if (jg > abschluss && ehem) { ziel = ehem.id; grund = `Abschluss → ${ehem.name}`; }
    else if (gr?.wechsel_nach && Number(gr.wechsel_ab_jg) && jg >= Number(gr.wechsel_ab_jg)) { const z = db.hole("gruppen", gr.wechsel_nach); if (z) { ziel = z.id; grund = `Jg ${jg} → ${z.name}`; } }
    const hinweise = [];
    if (ziel && ziel === ehem?.id) {
      const leih = db.liste("ausleihen", (a) => a.person_id === p.id && a.status === "aktiv").length, gen = db.liste("genehmigungen", (x) => x.kind_id === p.id && x.status === "ausstehend").length;
      if (leih) hinweise.push(`🎻 ${leih} Leihinstrument${leih > 1 ? "e" : ""} noch nicht zurück`);
      if (gen) hinweise.push(`✍️ ${gen} offene Genehmigung${gen > 1 ? "en" : ""}`);
      if (db.liste("eltern_kind", (e) => e.kind_id === p.id).length) hinweise.push("👪 Eltern sehen danach nichts mehr (außer das Kind erlaubt es)");
    }
    return { p, jg, g, ziel, grund, hinweise };
  });
}

// ---------- 🔐 Auskunft (Art. 15) & Löschfristen (0.21.0) ----------
// Alle Zeilen aller Tabellen, die auf eine der Personen verweisen (ref/refs auf „personen“) – ohne Systemprotokolle und Zugangscodes.
const AUSKUNFT_OHNE = new Set(["aenderungen", "zugaenge"]);
export function personenDaten(db, ids) {
  const set = new Set(ids), out = {};
  for (const t of TABELLEN_NAMEN) {
    if (AUSKUNFT_OHNE.has(t) || t.startsWith("kom_")) continue;
    const f = [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])].filter((x) => x.ref === "personen");
    const zeilen = t === "personen" ? db.liste(t, (z) => set.has(z.id)) : f.length ? db.liste(t, (z) => f.some((x) => (x.typ === "refs" ? (z[x.k] || []).some((v) => set.has(v)) : set.has(z[x.k])))) : [];
    if (zeilen.length) out[t] = zeilen;
  }
  return out;
}
// Ausgetretene, deren Löschfrist abgelaufen ist (ausgetreten_am + monate), und abgelaufene Gesundheitsangaben
export function loeschKandidaten(db, { monate = 24, heute = new Date() } = {}) {
  const grenze = new Date(heute); grenze.setMonth(grenze.getMonth() - monate);
  const personen = db.liste("personen", (p) => p.status === "ausgetreten" && p.ausgetreten_am && new Date(p.ausgetreten_am) < grenze && !p.anonymisiert);
  const gesundheit = db.liste("gesundheit", (g) => g.loeschen_am && g.loeschen_am < tagIso(heute));
  return { personen, gesundheit };
}
// Anonymisieren statt löschen: Statistik (Anwesenheit, Ausleih-Verlauf) bleibt, die Person ist nicht mehr erkennbar
export const ANONYM_LEEREN = ["email", "mobil", "telefon", "strasse", "plz", "ort", "geburtsdatum", "notfall_info", "notiz", "schule", "avatar", "freigaben", "benachrichtigung", "uebe_plan"];
export const ANONYM_LOESCHEN = ["gesundheit", "uebungen", "eigene_termine", "eltern_kind", "klopfen", "reise_anmeldungen"];

// ---------- 🛒 Einkauf → Inventar (0.24.0, gemeinsam für App und PC) ----------
// Instrument (Typ am Titel erkannt) oder Ausstattung (Notenständer, Technik …); Nummer über beide Tabellen eindeutig
export function einkaufInventar(db, e, heute = new Date()) {
  const typ = db.liste("instrument_typen").find((t) => new RegExp(String(t.name).split(/[ /]/)[0], "i").test(e.titel || ""));
  const instrument = !!typ && !/ständer|staender|pult|stuhl|koffer|kabel|lautsprecher|beamer|mappe/i.test(e.titel || "");
  const eig = e.finanzierung === "schule" ? "schule" : "foerderverein", tag = tagIso(heute);
  if (instrument) return { tab: "inventar", zeile: { inventar_nr: naechsteInventarNr(db, "BK-"), typ_id: typ.id, bezeichnung: e.titel, status: "verfuegbar", zustand: "sehr_gut", wert: e.betrag ?? null, anschaffung: tag, finanziert_von: e.finanzierung || "", standort: "Instrumentenraum", eigentuemer: eig } };
  return { tab: "ausstattung", zeile: { inventar_nr: naechsteInventarNr(db, "A-"), kategorie: /ständer|staender|pult/i.test(e.titel || "") ? "notenstaender" : /lautsprecher|beamer|mikro/i.test(e.titel || "") ? "technik" : "sonstiges",
    bezeichnung: e.titel, anzahl: Number((String(e.titel || "").match(/^(\d+)/) || [])[1]) || 1, status: "verfuegbar", zustand: "neu", wert: e.betrag ?? null, anschaffung: tag, finanzierung: e.finanzierung || null, einkauf_id: e.id, eigentuemer: eig, standort: "Instrumentenraum" } };
}

// ---------- 🎭 Übe-Bühne (0.26.0): Für wen gilt eine Übeaufgabe? Ziel erreicht? Stand je Kind ----------
export function aufgabeGiltFuer(db, a, pid) {
  if (a.person_id) return a.person_id === pid;
  if (!a.register_id && !a.gruppe_id) return false;
  return (!a.register_id || registerVon(db, pid) === a.register_id) && (!a.gruppe_id || wirksameGruppen(db, pid).includes(a.gruppe_id));
}
export const aufgabeKinder = (db, a) => db.liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten" && aufgabeGiltFuer(db, a, p.id)).map((p) => p.id);
// Ziel: Sterne (Standard 2) und – bei Notenstelle/Tonleiter – das Zieltempo
export function uebeZielErreicht(a, e) {
  if (!a || !e) return false;
  const sterne = Number(e.sterne) || 0, ziel = Number(a.ziel_sterne) || 2;
  if (["notenstelle", "tonleiter"].includes(a.art) && a.tempo_ziel && (Number(e.tempo) || 0) < Number(a.tempo_ziel)) return false;
  return sterne >= ziel;
}
// Stand je Kind: Anzahl Übungen, beste Sterne, bestes Tempo, Ziel erreicht, letzte Rückmeldung/Aufnahme
export function uebeStand(db, a) {
  const erg = db.liste("uebe_ergebnisse", (e) => e.aufgabe_id === a.id && !e.geloescht_am);
  return aufgabeKinder(db, a).map((pid) => {
    const l = erg.filter((e) => e.person_id === pid).sort((x, y) => String(y.datum).localeCompare(String(x.datum)) || String(y.erstellt_am || "").localeCompare(String(x.erstellt_am || "")));
    const geuebt = l.filter((e) => e.modus);
    return { pid, anzahl: geuebt.length, sterne: Math.max(0, ...geuebt.map((e) => Number(e.sterne) || 0)), tempo: Math.max(0, ...geuebt.map((e) => Number(e.tempo) || 0)) || null,
      ziel: (a.erledigt || []).includes(pid) || geuebt.some((e) => uebeZielErreicht(a, e)), letzte: l[0] || null, aufnahme: l.find((e) => e.aufnahme) || null, rueckmeldung: l.find((e) => e.rueckmeldung) || null };
  });
}

// ---------- 📨 Auftrittsanfrage → Termin (0.27.0, gemeinsam für App und PC) ----------
export const anfrageZuTermin = (a, artId) => ({ titel: `🎺 Auftritt: ${a.anlass}`, art_id: artId || null, beginn: a.datum, ende: new Date(new Date(a.datum).getTime() + (Number(a.dauer_min) || 60) * 60000).toISOString(),
  ort: a.ort || null, gruppen: a.gruppen || [], fuer_alle: false, teilnahme: "pflicht", beschreibung: `Für: ${a.veranstalter}${a.kontakt_name ? ` (${a.kontakt_name})` : ""}` });
export const auftrittsArt = (db) => db.liste("terminarten").find((t) => /auftritt|konzert/i.test(t.name)) || db.liste("terminarten")[0];
// 🎼 „Was haben wir schon gespielt?“ – aus den Konzertprogrammen und den Programmen der Chronik (0.27.0)
export function repertoire(db) {
  const m = new Map(), dazu = (schluessel, anzeige, jahr, anlass) => {
    const e = m.get(schluessel) || { anzeige, auftritte: [] };
    if (!e.auftritte.some((a) => a.jahr === jahr && a.anlass === anlass)) e.auftritte.push({ jahr, anlass });
    m.set(schluessel, e);
  };
  for (const x of db.liste("programm", (p) => p.werk_id || (p.titel && p.art !== "pause" && p.art !== "ansage"))) {
    const w = x.werk_id ? db.hole("werke", x.werk_id) : null, pr = db.hole("projekte", x.projekt_id);
    const anzeige = w ? `${w.komponist} – ${w.titel}` : x.titel, jahr = Number(String(pr?.bis || pr?.von || "").slice(0, 4)) || null;
    dazu(anzeige.toLowerCase(), anzeige, jahr, pr?.titel || "Konzert");
  }
  for (const c of db.liste("chronik", (x) => x.programm)) for (const z of String(c.programm).split("\n").map((s) => s.trim()).filter(Boolean)) dazu(z.toLowerCase(), z, c.jahr, c.titel);
  return [...m.values()].map((e) => ({ ...e, auftritte: e.auftritte.sort((a, b) => (b.jahr || 0) - (a.jahr || 0)) })).sort((a, b) => a.anzeige.localeCompare(b.anzeige, "de"));
}
