// 📈 Auswertungen (0.76.0, Bewertung 17.11.: „Statistik nur als Momentaufnahme – es fehlen Verläufe, Besetzung, Vergleich der Schuljahre,
// Export und welche Funktionen genutzt werden“). Reine Rechnungen auf den Daten, die die Person ohnehin sehen darf – laufen auch in Tests.
// Nur Zahlen, keine Inhalte aus Chats. Ansicht: js/app/auswertungen.js
import { schuljahrVon } from "./schema.js";
import { registerVon } from "./logik.js";

const tag = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const monatsEnde = (j, m) => tag(new Date(j, m + 1, 0, 12));
const imZeitraum = (z, t) => (!z.von || String(z.von).slice(0, 10) <= t) && (!z.bis || String(z.bis).slice(0, 10) >= t);
export const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
// die letzten n Monate bis einschließlich dem Monat von „heute“: [{ j, m, label, ende }]
export function monate(n, heute = new Date()) {
  const h = new Date(heute); return Array.from({ length: n }, (_, i) => { const d = new Date(h.getFullYear(), h.getMonth() - (n - 1 - i), 15); return { j: d.getFullYear(), m: d.getMonth(), label: `${MONAT_KURZ[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, ende: monatsEnde(d.getFullYear(), d.getMonth()) }; });
}
// Orchester-Zeit: Stamm-Zuordnungen außer im Ehemaligen-Orchester; gezählt werden Schüler/innen und Ehemalige (für ihre frühere Orchesterzeit)
const stamm = (db) => { const ehem = new Set(db.liste("gruppen", (g) => g.ehemalige).map((g) => g.id)); return db.liste("gruppe_zuordnung", (z) => !z.geloescht_am && z.art !== "temporaer" && !ehem.has(z.gruppe_id)); };
const schuelerIds = (db) => new Set(db.liste("personen", (p) => ["schueler", "ehemalig"].includes(p.typ) && !p.geloescht_am).map((p) => p.id));

// 👥 Mitglieder (Schülerinnen und Schüler in einem Orchester) am Monatsende
export function mitgliederVerlauf(db, { n = 24, heute = new Date() } = {}) {
  const zu = stamm(db), sch = schuelerIds(db);
  return monate(n, heute).map((mo) => {
    const t = mo.ende > tag(heute) ? tag(heute) : mo.ende;
    return { label: mo.label, wert: new Set(zu.filter((z) => sch.has(z.person_id) && imZeitraum(z, t)).map((z) => z.person_id)).size };
  });
}
// 🔀 Zu- und Abgänge je Schuljahr: Zugang = erste Orchester-Zuordnung im Schuljahr; Abgang = ausgetreten im Schuljahr
// oder die letzte Zuordnung endet im Schuljahr (und danach keine neue)
export function zuAbgaenge(db, { jahre = 5, heute = new Date() } = {}) {
  const sj = schuljahrVon(heute), j0 = Number(sj.slice(0, 4)), zu = stamm(db), sch = schuelerIds(db), je = new Map();
  for (let i = jahre - 1; i >= 0; i--) { const j = j0 - i; je.set(`${j}/${String((j + 1) % 100).padStart(2, "0")}`, { zu: 0, ab: 0 }); }
  const sjVon = (d) => (d ? schuljahrVon(new Date(String(d).slice(0, 10) + "T12:00")) : null);
  const proPerson = new Map(); for (const z of zu) if (sch.has(z.person_id)) (proPerson.get(z.person_id) || proPerson.set(z.person_id, []).get(z.person_id)).push(z);
  for (const [pid, l] of proPerson) {
    const erste = l.map((z) => String(z.von || "")).filter(Boolean).sort()[0], s1 = sjVon(erste); if (je.has(s1)) je.get(s1).zu++;
    const p = db.hole("personen", pid), offen = l.some((z) => !z.bis), letzte = l.map((z) => String(z.bis || "")).filter(Boolean).sort().pop();
    const ab = p?.ausgetreten_am || (!offen && letzte && letzte < tag(heute) ? letzte : null), s2 = sjVon(ab); if (je.has(s2)) je.get(s2).ab++;
  }
  return [...je].map(([label, v]) => ({ label, ...v }));
}
// ✅ Probenbesuch je Monat: Anteil „da“ + „verspätet“ an allen erfassten Anwesenheiten vergangener Termine (nicht abgesagt)
export function probenbesuchMonate(db, { n = 12, heute = new Date() } = {}) {
  const tm = new Map(db.liste("termine", (t) => !t.geloescht_am && t.status !== "abgesagt" && new Date(t.beginn) < heute).map((t) => [t.id, t]));
  const mo = monate(n, heute), idx = new Map(mo.map((m, i) => [`${m.j}-${m.m}`, i])), z = mo.map(() => ({ da: 0, erfasst: 0 }));
  for (const a of db.liste("antworten", (x) => !x.geloescht_am && x.anwesend)) {
    const t = tm.get(a.termin_id); if (!t) continue; const d = new Date(t.beginn), i = idx.get(`${d.getFullYear()}-${d.getMonth()}`); if (i == null) continue;
    z[i].erfasst++; if (a.anwesend === "ja" || a.anwesend === "spaet") z[i].da++;
  }
  return mo.map((m, i) => ({ label: m.label, wert: z[i].erfasst ? Math.round((z[i].da / z[i].erfasst) * 100) : null, erfasst: z[i].erfasst }));
}
// 🎻 Probenbesuch je Register im Zeitraum (Hauptinstrument der Person)
export function probenbesuchRegister(db, { von, bis = new Date() }) {
  const tm = new Set(db.liste("termine", (t) => !t.geloescht_am && t.status !== "abgesagt" && new Date(t.beginn) < bis && (!von || new Date(t.beginn) >= von)).map((t) => t.id));
  const reg = new Map(); for (const pi of db.liste("person_instrument", (x) => !x.geloescht_am && x.register_id).sort((a, b) => (b.haupt ? 1 : 0) - (a.haupt ? 1 : 0))) if (!reg.has(pi.person_id)) reg.set(pi.person_id, pi.register_id);
  const z = new Map();
  for (const a of db.liste("antworten", (x) => !x.geloescht_am && x.anwesend && tm.has(x.termin_id))) {
    const r = reg.get(a.person_id); if (!r) continue; const e = z.get(r) || { da: 0, erfasst: 0 }; e.erfasst++; if (a.anwesend === "ja" || a.anwesend === "spaet") e.da++; z.set(r, e);
  }
  return db.liste("register", (r) => !r.geloescht_am).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)).map((r) => { const e = z.get(r.id); return { label: r.name, wert: e?.erfasst ? Math.round((e.da / e.erfasst) * 100) : null, erfasst: e?.erfasst || 0 }; }).filter((x) => x.erfasst);
}
// 🎼 Besetzung je Register heute – je Orchester: Ist (Stamm-Mitglieder, nach Hauptinstrument) und Soll (Orchester-Einstellung „Soll-Besetzung“)
export function besetzungRegister(db, gruppeId, { heute = new Date() } = {}) {
  const t = tag(heute), g = db.hole("gruppen", gruppeId), drin = new Set(stamm(db).filter((z) => z.gruppe_id === gruppeId && imZeitraum(z, t)).map((z) => z.person_id)), z = new Map();
  for (const pid of drin) { const r = registerVon(db, pid); if (r) z.set(r, (z.get(r) || 0) + 1); }
  const soll = g?.soll && typeof g.soll === "object" ? g.soll : {};
  return db.liste("register", (r) => !r.geloescht_am).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)).map((r) => ({ label: r.name, wert: z.get(r.id) || 0, soll: Number(soll[r.id]) || null })).filter((x) => x.wert || x.soll);
}
// 🎺 Leihinstrumente: wie viele am Monatsende verliehen sind
export function leihVerlauf(db, { n = 12, heute = new Date() } = {}) {
  const l = db.liste("ausleihen", (a) => !a.geloescht_am && a.inventar_id && a.von);
  return monate(n, heute).map((mo) => { const t = mo.ende > tag(heute) ? tag(heute) : mo.ende; return { label: mo.label, wert: l.filter((a) => String(a.von).slice(0, 10) <= t && (!a.bis || String(a.bis).slice(0, 10) >= t) && (a.status !== "zurueck" || (a.bis && String(a.bis).slice(0, 10) >= t))).length }; });
}
// 🧭 Kachel-Nutzung: Zählungen { kachel: anzahl } mit allen Kacheln abgleichen → genutzt (absteigend) und nie genutzt
export function kachelAuswertung(zaehlung, alle) {
  const genutzt = Object.entries(zaehlung || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, k: alle.find((x) => x.id === id) })).filter((x) => x.k).sort((a, b) => b.n - a.n);
  const ids = new Set(genutzt.map((x) => x.id));
  return { genutzt, nie: alle.filter((k) => !ids.has(k.id)) };
}
// ⬇️ CSV (Semikolon, für Excel/LibreOffice in Deutschland), Kopfzeile + Zeilen
export function csv(kopf, zeilen) {
  const f = (v) => { const s = v == null ? "" : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [kopf, ...zeilen].map((z) => z.map(f).join(";")).join("\r\n");
}
