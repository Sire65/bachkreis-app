// 📊 Jahresbericht (0.56.0): Zahlen eines Schul- oder Kalenderjahres für Vorstand, Mitgliederversammlung und Förderer –
// Mitglieder, Termine/Proben, Anwesenheit, Konzerte, Fahrten, Instrumente, Spenden (nur Leitung/Vorstand). Nur Zahlen, keine Inhalte
// aus Chats. Drucken/PDF über die Druckvorschau im Bachkreis-Design. Wird erst beim Öffnen geladen (teile-karte).
import { VIEWS, zeichne, kopf, hatRolle } from "./zustand.js";
import { esc, AKTIONEN } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";

export const JB_ROLLEN = ["admin", "leitung", "vorstand"];
const tag = (d) => String(d || "").slice(0, 10);
const de = (d) => new Date(d + "T12:00:00").toLocaleDateString("de-DE");
const euro = (n) => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// Zeiträume: drei Schuljahre (1.8.–31.7.) und zwei Kalenderjahre, das laufende zuerst
export function zeitraeume(heute = new Date()) {
  const j = heute.getFullYear(), sj = heute.getMonth() >= 7 ? j : j - 1, aus = [];
  for (let i = 0; i < 3; i++) aus.push({ id: `sj${sj - i}`, t: `Schuljahr ${sj - i}/${String(sj - i + 1).slice(2)}`, von: `${sj - i}-08-01`, bis: `${sj - i + 1}-07-31` });
  for (let i = 0; i < 2; i++) aus.push({ id: `kj${j - i}`, t: `Kalenderjahr ${j - i}`, von: `${j - i}-01-01`, bis: `${j - i}-12-31` });
  return aus;
}
let gewaehlt = null;

export function jahresbericht(z, { spendenSehen = true } = {}) {
  const drin = (d) => { const t = tag(d); return !!t && t >= z.von && t <= z.bis; };
  const personen = liste("personen"), aktiv = (p) => p.status !== "ausgetreten" && p.typ !== "ehemalig";
  const schueler = personen.filter((p) => p.typ === "schueler");
  const mitglieder = {
    schueler: schueler.filter((p) => aktiv(p) && tag(p.erstellt_am) <= z.bis).length,
    neu: schueler.filter((p) => drin(p.erstellt_am)).length,
    aus: personen.filter((p) => drin(p.ausgetreten_am)).length,
    eltern: personen.filter((p) => p.typ === "eltern" && aktiv(p)).length,
    team: personen.filter((p) => ["leitung", "lehrkraft"].includes(p.typ) && aktiv(p)).length,
  };
  const termine = liste("termine", (t) => drin(t.beginn) && t.status !== "abgesagt");
  const arten = {};
  for (const t of termine) { const a = hole("terminarten", t.art_id); const k = a ? `${a.sym || ""} ${a.name}`.trim() : "ohne Art"; arten[k] = (arten[k] || 0) + 1; }
  const proben = termine.filter((t) => /probe/i.test(hole("terminarten", t.art_id)?.name || t.titel || ""));
  const tIds = new Set(termine.map((t) => t.id));
  const erfasst = liste("antworten", (a) => tIds.has(a.termin_id) && a.anwesend);
  const da = erfasst.filter((a) => ["ja", "spaet"].includes(a.anwesend)).length;
  const projekte = liste("projekte", (p) => drin(p.von || p.bis));
  const konzerte = projekte.filter((p) => p.art === "konzert");
  const fahrten = projekte.filter((p) => ["reise", "freizeit"].includes(p.art)).map((p) => ({ titel: p.titel, von: tag(p.von), ort: p.ort || "", teilnehmer: liste("reise_anmeldungen", (r) => r.projekt_id === p.id && r.status === "angemeldet").length }));
  const reps = liste("reparaturen", (r) => drin(r.gemeldet_am || r.erstellt_am));
  const instrumente = {
    bestand: liste("inventar").length,
    verliehen: liste("ausleihen", (a) => a.status === "aktiv" && a.inventar_id).length,
    neueAusleihen: liste("ausleihen", (a) => drin(a.von)).length,
    reparaturen: reps.length,
    reparaturKosten: reps.filter((r) => r.status === "erledigt").reduce((s, r) => s + (Number(r.kosten) || 0), 0),
  };
  const sp = spendenSehen ? liste("spenden", (s) => drin(s.datum)) : null;
  return {
    zeitraum: z, mitglieder, termine: termine.length, arten, proben: proben.length,
    anwesenheit: erfasst.length ? Math.round((da / erfasst.length) * 100) : null, erfasst: erfasst.length,
    konzerte: konzerte.map((k) => ({ titel: k.titel, von: tag(k.von), ort: k.ort || "" })), fahrten, instrumente,
    spenden: sp && { anzahl: sp.length, summe: sp.reduce((s, x) => s + (Number(x.betrag) || 0), 0), sach: sp.filter((x) => x.sachspende || x.inventar_id || x.ausstattung_id).length },
    fotos: liste("fotos", (f) => drin(f.erstellt_am)).length,
  };
}

const zahl = (w, t) => `<div class="jb-zahl"><b>${esc(String(w))}</b><span>${esc(t)}</span></div>`;
export function berichtHtml(b) {
  const m = b.mitglieder, i = b.instrumente;
  return `<div class="jb"><p class="jb-zeit">${esc(b.zeitraum.t)} · ${de(b.zeitraum.von)} – ${de(b.zeitraum.bis)}</p>
  <h2>👥 Mitglieder</h2><div class="jb-zahlen">${zahl(m.schueler, "Schülerinnen & Schüler")}${zahl("+" + m.neu, "neu dazu")}${zahl(m.aus, "ausgetreten")}${zahl(m.team, "Leitung & Lehrkräfte")}${zahl(m.eltern, "Eltern in der App")}</div>
  <h2>📅 Termine & Proben</h2><div class="jb-zahlen">${zahl(b.termine, "Termine")}${zahl(b.proben, "Proben")}${zahl(b.anwesenheit == null ? "–" : b.anwesenheit + " %", b.erfasst ? `Anwesenheit (${b.erfasst} Einträge)` : "Anwesenheit nicht erfasst")}</div>
  ${Object.keys(b.arten).length ? `<div class="jb-rolle" tabindex="0"><table class="jb-tabelle"><thead><tr><th>Art</th><th>Anzahl</th></tr></thead><tbody>${Object.entries(b.arten).sort((a, c) => c[1] - a[1]).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join("")}</tbody></table></div>` : ""}
  <h2>🎭 Konzerte</h2>${b.konzerte.length ? `<div class="jb-rolle" tabindex="0"><table class="jb-tabelle"><thead><tr><th>Datum</th><th>Konzert</th><th>Ort</th></tr></thead><tbody>${b.konzerte.map((k) => `<tr><td>${k.von ? de(k.von) : ""}</td><td>${esc(k.titel)}</td><td>${esc(k.ort)}</td></tr>`).join("")}</tbody></table></div>` : "<p>Keine Konzerte in diesem Zeitraum.</p>"}
  <h2>🧳 Fahrten & Freizeiten</h2>${b.fahrten.length ? `<div class="jb-rolle" tabindex="0"><table class="jb-tabelle"><thead><tr><th>Datum</th><th>Fahrt</th><th>Ort</th><th>Teilnehmer</th></tr></thead><tbody>${b.fahrten.map((f) => `<tr><td>${f.von ? de(f.von) : ""}</td><td>${esc(f.titel)}</td><td>${esc(f.ort)}</td><td>${f.teilnehmer}</td></tr>`).join("")}</tbody></table></div>` : "<p>Keine Fahrten in diesem Zeitraum.</p>"}
  <h2>🎻 Instrumente</h2><div class="jb-zahlen">${zahl(i.bestand, "im Bestand")}${zahl(i.verliehen, "zurzeit verliehen")}${zahl(i.neueAusleihen, "neue Ausleihen")}${zahl(i.reparaturen, "Reparaturen")}${zahl(euro(i.reparaturKosten), "Reparaturkosten (erledigt)")}</div>
  ${b.spenden ? `<h2>💛 Spenden & Förderer</h2><div class="jb-zahlen">${zahl(b.spenden.anzahl, "Spenden")}${zahl(euro(b.spenden.summe), "Geldspenden")}${zahl(b.spenden.sach, "Sachspenden")}</div>` : ""}
  <h2>🖼️ Erinnerungen</h2><div class="jb-zahlen">${zahl(b.fotos, "Fotos im Album")}</div></div>`;
}

VIEWS.jahresbericht = {
  render() {
    if (!hatRolle(...JB_ROLLEN)) return kopf("📊 Jahresbericht") + `<div class="karte"><p>Den Jahresbericht sehen Leitung und Vorstand.</p></div>`;
    const zs = zeitraeume(), z = zs.find((x) => x.id === gewaehlt) || zs[0];
    const b = jahresbericht(z, { spendenSehen: hatRolle(...JB_ROLLEN) });
    return kopf("📊 Jahresbericht") + `<div class="karte"><label>Zeitraum <select data-c="jbZeit" aria-label="Zeitraum">${zs.map((x) => `<option value="${x.id}"${x.id === z.id ? " selected" : ""}>${esc(x.t)}</option>`).join("")}</select></label>
      <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="jbPdf">🖨️ Drucken / PDF</button></div></div>
      <div class="karte">${berichtHtml(b)}</div>`;
  },
};
AKTIONEN.jbZeit = (v) => { gewaehlt = v; zeichne(); };
AKTIONEN.jbPdf = async () => {
  const zs = zeitraeume(), z = zs.find((x) => x.id === gewaehlt) || zs[0];
  (await import("./druckvorschau.js")).druckVorschau({ titel: `Jahresbericht ${z.t}`, html: `<h1>Jahresbericht</h1>${berichtHtml(jahresbericht(z))}` });
};
