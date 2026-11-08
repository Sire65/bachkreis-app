// 🪪 Notfallpass (0.46.0, wie KC „Dein Notfallpass im SOS-Bereich“): je Kind eine Karte mit allem, was im Notfall zählt – Allergien, Medikamente,
// Hinweise, Erlaubnisse, Notfallkontakte (Eltern zum Anrufen), Krankenkasse/Arzt, Stand der Bestätigung. Sichtbar ist nur, was der Server ohnehin
// freigibt (Eltern: eigene Kinder; Begleitpersonen: Kinder der Fahrt). 🧳 Fahrt-Mappe: alle Pässe einer Fahrt zum Durchblättern und Drucken.
import { S, VIEWS, db, zeige, kopf, name, istEltern, istLehrkraft } from "./zustand.js";
import { esc, AKTIONEN, datumKurz } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";
import { TABELLEN } from "../kern/schema.js";
import { elternVon, tagIso } from "../kern/logik.js";
import { gesundheitVon, gesundheitFuer } from "./schutz.js";
import { gesicht } from "./gesichter.js";

const tel = (n) => `tel:${String(n || "").replace(/[^\d+]/g, "")}`;
const SCHWIMMER = TABELLEN.gesundheit.felder.find((f) => f.k === "schwimmer").werte;
// Für wen darf ich Pässe sehen? Eigene Kinder/sich selbst + Kinder der Fahrten, die ich begleite (Leitung/Lehrkräfte: alle Fahrten)
export function meineFahrten() {
  const heute = tagIso(new Date());
  return liste("projekte", (p) => ["reise", "freizeit", "austausch"].includes(p.art) && (p.bis || p.von || heute) >= heute && ((p.begleiter || []).includes(S.ich?.id) || istLehrkraft()))
    .sort((a, b) => String(a.von).localeCompare(String(b.von)));
}
export const fahrtKinder = (pr) => [...new Set(liste("reise_anmeldungen", (a) => a.projekt_id === pr.id && a.status !== "abgemeldet").map((a) => a.person_id))]
  .filter((id) => hole("personen", id)?.typ === "schueler").sort((a, b) => name(a).localeCompare(name(b)));
export const passFuer = () => gesundheitFuer();

export function passHtml(pid, kurz = false) {
  const p = hole("personen", pid); if (!p) return "";
  const g = gesundheitVon(pid), alt = g?.loeschen_am && g.loeschen_am < tagIso(new Date());
  const zeile = (t, v, wichtig = false) => (v ? `<div class="np-zeile${wichtig ? " wichtig" : ""}"><span>${t}</span><b>${esc(v)}</b></div>` : "");
  const kontakte = [...elternVon(db, pid).map((e) => hole("personen", e)).filter((e) => e?.mobil).map((e) => [name(e), e.mobil, "Eltern"]), ...(g?.notfall_tel ? [[g.notfall_name || "Notfallkontakt", g.notfall_tel, "Notfall"]] : [])];
  return `<article class="np-karte${alt ? " alt" : ""}${!g ? " leer" : ""}" aria-label="Notfallpass ${esc(name(p))}">
    <header class="np-kopf"><span class="np-gesicht" aria-hidden="true">${gesicht(pid, "")}</span><div><div class="np-titel">🪪 NOTFALLPASS</div><b class="np-name">${esc(name(p))}</b>${p.geburtsdatum ? `<small>geb. ${esc(datumKurz(p.geburtsdatum))}</small>` : ""}</div></header>
    ${g ? `${zeile("⚠️ Allergien", g.allergien, true)}${zeile("💊 Medikamente", g.medikamente, true)}${zeile("🩺 Hinweise", g.erkrankungen, true)}${zeile("🍽️ Ernährung", g.ernaehrung)}
      ${zeile("🏊 Schwimmer", g.schwimmer && SCHWIMMER[g.schwimmer])}${kurz ? "" : `${zeile("🏥 Krankenkasse", g.krankenkasse)}${zeile("👩‍⚕️ Arzt", g.hausarzt)}${zeile("💉 Tetanus", g.tetanus && datumKurz(g.tetanus))}`}
      <div class="np-erlaubt">${g.erste_hilfe_ok ? "✅ Erste Hilfe erlaubt" : "❔ Erste Hilfe nicht freigegeben"} · ${g.medikamente_geben_ok ? "✅ Medikamente geben erlaubt" : "❔ Medikamente geben nicht freigegeben"}</div>`
      : '<p class="hinweis">🩺 Keine Gesundheitsangaben hinterlegt – im Notfall bitte die Eltern anrufen.</p>'}
    <div class="np-kontakte">${kontakte.map(([n, t, art]) => `<a class="np-tel" href="${tel(t)}"><span>📞 ${esc(n)} <small>${art}</small></span><b>${esc(t)}</b></a>`).join("") || '<p class="hinweis">Keine Telefonnummer hinterlegt.</p>'}</div>
    <footer class="np-fuss">${g ? `${alt ? "⚠️ Nicht mehr bestätigt seit " : "Bestätigt am "}${esc(datumKurz(g.geprueft_am) || "–")}` : "Noch nicht ausgefüllt"} · 112 Notruf</footer></article>`;
}

VIEWS.notfallpass = {
  render(p = {}) {
    const eigene = passFuer(), fahrten = meineFahrten(), pr = p.fahrt ? hole("projekte", p.fahrt) : null;
    if (pr) {
      const kids = fahrtKinder(pr);
      return kopf(`🧳 Notfallpässe: ${esc(pr.titel)}`, '<button type="button" class="knopf klein" data-a="npDrucken">🖨️ Drucken</button>')
        + `<p class="hinweis">${kids.length} Kinder · ${esc(datumKurz(pr.von))}${pr.bis ? ` – ${esc(datumKurz(pr.bis))}` : ""}${pr.ort ? ` · ${esc(pr.ort)}` : ""}. Die Angaben sind besonders geschützt – nur für die Begleitung dieser Fahrt.</p>
        <div class="np-liste">${kids.map((k) => passHtml(k, true)).join("") || '<div class="leer">Noch niemand angemeldet.</div>'}</div>`;
    }
    const wahl = eigene.includes(p.id) ? p.id : eigene[0];
    return kopf("🪪 Notfallpass", wahl ? '<button type="button" class="knopf klein" data-a="npDrucken">🖨️ Drucken</button>' : "")
      + (eigene.length > 1 ? `<div class="umschalter" role="group" aria-label="Kind wählen">${eigene.map((k) => `<button type="button" class="${k === wahl ? "an" : ""}" aria-pressed="${k === wahl}" data-a="npKind" data-x="${esc(k)}">${esc(hole("personen", k)?.vorname || "")}</button>`).join("")}</div>` : "")
      + (wahl ? `<div class="np-liste">${passHtml(wahl)}</div><div class="knopfreihe"><button type="button" class="knopf" data-a="kachel" data-x="gesundheit">✏️ Angaben ändern</button></div>
        <p class="hinweis">Tipp: Ausdrucken und in die Instrumententasche legen – oder ein Bildschirmfoto für unterwegs. Die Angaben sehen nur Sie und die Begleitpersonen einer Fahrt.</p>`
        : istEltern() ? '<div class="leer">Noch kein Kind mit Ihnen verknüpft.</div>' : "")
      + (fahrten.length ? `<div class="karte"><h3>🧳 Fahrt-Mappe für Begleitpersonen</h3><ul class="liste">${fahrten.map((f) => `<li class="klick" data-a="npFahrt" data-x="${esc(f.id)}"><div class="fl"><b>${esc(f.titel)}</b><div class="zeile-unter">${esc(datumKurz(f.von))} · ${fahrtKinder(f).length} Kinder</div></div><span aria-hidden="true">›</span></li>`).join("")}</ul></div>` : "")
      + (!wahl && !fahrten.length ? '<div class="leer">Notfallpässe gibt es für Kinder (Eltern) und für Begleitpersonen einer Fahrt.</div>' : "");
  },
};
AKTIONEN.npKind = (id) => zeige("notfallpass", { id }, { ersetzen: true });
AKTIONEN.npFahrt = (id) => zeige("notfallpass", { fahrt: id });
AKTIONEN.npDrucken = () => { document.body.classList.add("np-druck"); setTimeout(() => { print(); document.body.classList.remove("np-druck"); }, 50); };
// für das SOS: Knöpfe zu den Pässen
export function sosPassHtml() {
  const eigene = passFuer(), fahrten = meineFahrten();
  if (!eigene.length && !fahrten.length) return "";
  return `<div class="karte"><h3>🪪 Notfallpass</h3><div class="knopfreihe">${eigene.map((k) => `<button type="button" class="knopf" data-a="npAuf" data-x="${esc(k)}">🪪 ${esc(k === S.ich?.id ? "Mein Pass" : hole("personen", k)?.vorname || "")}</button>`).join("")}
    ${fahrten.map((f) => `<button type="button" class="knopf" data-a="npFahrt" data-x="${esc(f.id)}">🧳 ${esc(f.titel)}</button>`).join("")}</div></div>`;
}
AKTIONEN.npAuf = (id) => zeige("notfallpass", { id });
