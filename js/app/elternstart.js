// 👪 Eltern-Ansicht (0.33.0, Konzept docs/KONZEPT-ANSICHTEN.md 3): erst erledigen, dann informieren.
// Oben „✅ Bitte erledigen“ (offene Zusagen, Genehmigungen, Leihinstrument, Notfallbogen, wichtige Zettel), Kinder-Umschalter bei Geschwistern,
// die nächsten Termine der Kinder mit Antwort, darunter wenige Kacheln. „🔧 Alle Bereiche“ schaltet auf die gewohnte Ansicht.
import { S, db, einst, einstSetzen, zeige, istEltern, vorname } from "./zustand.js";
import { esc, AKTIONEN, datum, uhr, toast } from "../kern/ui.js";
import { liste } from "../kern/daten.js";
import { kinderVon, termineFuer, antwortVon, teilnahmeVon, ausleihenVon, tagIso } from "../kern/logik.js";
import { gesundheitVon } from "./schutz.js";
import { pwWichtigFuerMich } from "./pinnwand.js";
import { meineOffenenUnterschriften } from "./leihvertrag.js";

export const elternAnsicht = () => istEltern() && einst().elternAlle !== true;
const kinder = () => kinderVon(db, S.ich.id).filter((id) => liste("personen", (p) => p.id === id && p.status !== "ausgetreten").length);
const gewaehlt = () => { const k = kinder(), w = einst().elternKind; return w && k.includes(w) ? [w] : k; };

export function elternErledigen(ks = gewaehlt(), heute = new Date()) {
  const z = [], bis = tagIso(new Date(heute.getTime() + 30 * 86400000)), h = tagIso(heute);
  for (const k of ks) {
    const offen = termineFuer(db, k).filter((t) => t.status !== "abgesagt" && tagIso(t.beginn) >= h && tagIso(t.beginn) <= bis && teilnahmeVon(db, t) !== "info" && !antwortVon(db, t.id, k));
    if (offen.length) z.push({ sym: "📅", text: `<b>${offen.length}</b> Termin${offen.length > 1 ? "e" : ""} ohne Zu-/Absage · ${esc(vorname(k))}`, a: "kachel", x: "meinetermine" });
    if (!gesundheitVon(k)) z.push({ sym: "🩺", text: `Notfallbogen für <b>${esc(vorname(k))}</b> ausfüllen`, a: "kachel", x: "gesundheit" });
    for (const a of ausleihenVon(db, k).filter((x) => x.bis && x.bis <= tagIso(new Date(heute.getTime() + 14 * 86400000))))
      z.push({ sym: "🎻", text: `Leihinstrument (${esc(vorname(k))}): Rückgabe ${a.bis < h ? "war" : "bis"} <b>${esc(a.bis.split("-").reverse().join("."))}</b>`, a: "kachel", x: "meininstrument" });
  }
  const gen = liste("genehmigungen", (g) => ks.includes(g.kind_id) && g.status === "ausstehend").length;
  if (gen) z.unshift({ sym: "✍️", text: `<b>${gen}</b> Genehmigung${gen > 1 ? "en warten" : " wartet"} auf Ihre Antwort`, a: "kachel", x: "meinegenehmigungen" });
  const lv = meineOffenenUnterschriften(); // 📝 0.52.0
  if (lv) z.unshift({ sym: "📝", text: `<b>${lv}</b> Leihvertrag${lv > 1 ? "e warten" : " wartet"} auf Ihre Unterschrift`, a: "kachel", x: "leihvertraege" });
  const zettel = pwWichtigFuerMich().length;
  if (zettel) z.push({ sym: "📌", text: `<b>${zettel}</b> wichtige${zettel > 1 ? "" : "r"} Zettel an der Pinnwand`, a: "kachel", x: "pinnwand" });
  return z;
}
// 0.62.0 die 8 wichtigsten (Wunsch Hansi); Mitfahrbörse, Üben und Elternbereich stehen unter „Alle Bereiche“
export const ELTERN_KACHELN = [["meinetermine", "📅", "Termine"], ["meinstatus", "🤒", "Krank / Status"], ["nachrichten", "💬", "Nachrichten"], ["meinegenehmigungen", "✍️", "Genehmigungen"],
  ["pinnwand", "📌", "Pinnwand"], ["gesundheit", "🩺", "Notfall"], ["meininstrument", "🎻", "Leihinstrument"], ["kinder", "👪", "Meine Kinder"]];

export function elternStartHtml() {
  const ks = kinder(), w = einst().elternKind && ks.includes(einst().elternKind) ? einst().elternKind : "", sicht = gewaehlt();
  const todo = elternErledigen(sicht), heute = tagIso(new Date());
  const termine = [];
  for (const k of sicht) for (const t of termineFuer(db, k).filter((t) => t.status !== "abgesagt" && tagIso(t.beginn) >= heute).slice(0, 6)) { const e = termine.find((x) => x.t.id === t.id); if (e) e.k.push(k); else termine.push({ t, k: [k] }); }
  termine.sort((a, b) => a.t.beginn.localeCompare(b.t.beginn));
  const antw = (t, k) => { const a = antwortVon(db, t.id, k); return a ? { ja: "✅", nein: "❌", vielleicht: "🤔" }[a.antwort] || "❔" : teilnahmeVon(db, t) === "info" ? "ℹ️" : "❔"; };
  return `<section id="v-start" class="ansicht-eltern"><div id="kopfPlatz"></div><div id="updateHinweis"></div>
    ${ks.length > 1 ? `<div class="wahlen eltern-kinder" role="group" aria-label="Für welches Kind?">${ks.map((k) => `<button type="button" class="chip-wahl${w === k ? " an" : ""}" data-a="elternKind" data-x="${esc(k)}" aria-pressed="${w === k}">${esc(vorname(k))}</button>`).join("")}<button type="button" class="chip-wahl${!w ? " an" : ""}" data-a="elternKind" data-x="" aria-pressed="${!w}">👪 Alle</button></div>` : ""}
    <div class="karte eltern-todo"><h3>✅ Bitte erledigen${todo.length ? ` <span class="badge b-gelb">${todo.length}</span>` : ""}</h3>
      ${todo.length ? `<div class="ifzliste kind-ich">${todo.map((x) => `<button type="button" class="ifz" data-a="${x.a}" data-x="${esc(x.x)}"><span>${x.sym}</span><span class="ifzt">${x.text}</span><span>›</span></button>`).join("")}</div>` : "<p>👍 Alles erledigt – danke!</p>"}</div>
    <div class="karte"><h3>📅 Die nächsten Termine</h3>${termine.length ? `<ul class="liste">${termine.slice(0, 5).map(({ t, k }) => `<li class="klick" data-a="oeffne" data-x="termin|${esc(t.id)}"><span>${k.map((x) => antw(t, x)).join("")}</span><div class="fl"><div class="zeile-titel">${esc(t.titel)}</div><div class="zeile-unter">${esc(datum(t.beginn))}, ${uhr(t.beginn)} Uhr · ${k.map((x) => esc(vorname(x))).join(", ")}</div></div><span>›</span></li>`).join("")}</ul>` : '<p class="hinweis">Gerade keine Termine.</p>'}</div>
    <div class="abschnitt sz-zeile"><h3><span>Für Sie</span><button type="button" class="ansichtname erw" data-a="elternAlle" data-x="1" title="Antippen: alle Bereiche der App zeigen">&lt; Alle Bereiche &gt;</button></h3>
      <span class="sz-rechts"><button type="button" class="ausweis-knopf" data-a="ausweisZeigen" title="Mein Ausweis-QR – zum Vorzeigen" aria-label="QR – mein Ausweis"><svg class="qr-sym" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h6v6H1zM2.5 2.5v3h3v-3zM9 1h6v6H9zm1.5 1.5v3h3v-3zM1 9h6v6H1zm1.5 1.5v3h3v-3zM9 9h2v2H9zm4 0h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2H9zm4 0h2v2h-2z" fill="currentColor" fill-rule="evenodd"/></svg> QR</button></span></div>
    <div class="raster kind-raster eltern-raster" id="raster">${ELTERN_KACHELN.map(([id, sym, t]) => `<button type="button" class="kachel kind-kachel" data-a="elternKachel" data-x="${id}" data-id="${id}"><div class="sym" aria-hidden="true">${sym}</div><b>${esc(t)}</b></button>`).join("")}</div>
    <button type="button" class="knopf breit ansicht-knopf" data-a="elternAlle" data-x="1">🔧 Alle Bereiche anzeigen</button></section>`;
}
AKTIONEN.elternKind = (x) => { einstSetzen("elternKind", x || null); zeige("start", {}, { ersetzen: true }); };
AKTIONEN.elternKachel = (id) => (id === "meinetermine" ? zeige("termine", { filter: "meine" }) : zeige(id));
AKTIONEN.elternAlle = (x) => { einstSetzen("elternAlle", !!x); zeige("start", {}, { ersetzen: true }); toast(x ? "🔧 Alle Bereiche – zurück geht's unten mit „👪 Eltern-Übersicht“" : "👪 Eltern-Übersicht"); };
