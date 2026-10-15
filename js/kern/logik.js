// Fachlogik ohne Oberfläche – rein, testbar (tests/logik.test.mjs). Bekommt einen Datenzugriff „db“ mit
// liste(tab, filter), hole(tab, id), konfig(). Dieselben Regeln gelten später serverseitig.

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
  if (!gr.some((g) => (termin.gruppen || []).includes(g))) return false;
  if (termin.register?.length) return termin.register.includes(registerVon(db, personId));
  return true;
}
export function eingeladene(db, termin) {
  const kandidaten = new Set(db.liste("gruppe_zuordnung", (z) => (termin.gruppen || []).includes(z.gruppe_id)).map((z) => z.person_id));
  return [...kandidaten].filter((p) => {
    const person = db.hole("personen", p);
    return person && person.status !== "ausgetreten" && eingeladen(db, termin, p);
  });
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
export const kinderVon = (db, elternId) => db.liste("eltern_kind", (e) => e.eltern_id === elternId).map((e) => e.kind_id);
export const elternVon = (db, kindId) => db.liste("eltern_kind", (e) => e.kind_id === kindId).map((e) => e.eltern_id);

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
    const i = db.hole("inventar", r.inventar_id);
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
    const i = db.hole("inventar", r.inventar_id);
    out.push({ bereich: "andere", dring: 0, sym: "🔧", text: `In der Werkstatt: ${i?.bezeichnung || "Instrument"}`, ziel: { view: "reparatur", id: r.id } });
  }
  for (const r of db.liste("reparaturen", (r) => r.status === "gemeldet")) {
    const i = db.hole("inventar", r.inventar_id);
    out.push({ bereich: "ich", dring: 1, sym: "🩹", text: `Neue Schadensmeldung: ${i?.bezeichnung || "Instrument"} – Kostenvoranschlag einholen`, ziel: { view: "reparatur", id: r.id } });
  }
  for (const e of db.liste("einkaeufe", (e) => e.status === "bestellt")) out.push({ bereich: "andere", dring: 0, sym: "📦", text: `Bestellt, Lieferung offen: ${e.titel}`, ziel: { view: "einkauf", id: e.id } });
  // Fällig bald: Wartung, temporäre Zuordnungen laufen aus, Termin-Fristen
  const wartung = db.liste("inventar", (i) => i.status !== "ausgemustert" && i.wartung_faellig && i.wartung_faellig <= inTagen(30));
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
const icsZeit = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);
export function ics(termine, name = "Bachkreis") {
  const z = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bachkreis-App//DE", `X-WR-CALNAME:${icsText(name)}`];
  for (const t of termine) {
    z.push("BEGIN:VEVENT", `UID:${t.id}@bachkreis-app`, `DTSTAMP:${icsZeit(new Date())}`, `DTSTART:${icsZeit(t.beginn)}`, `DTEND:${icsZeit(t.ende || t.beginn)}`,
      `SUMMARY:${icsText(t.titel)}`, `LOCATION:${icsText(t.ort)}`, `DESCRIPTION:${icsText(t.beschreibung)}`, t.status === "abgesagt" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED", "END:VEVENT");
  }
  z.push("END:VCALENDAR");
  return z.join("\r\n");
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
