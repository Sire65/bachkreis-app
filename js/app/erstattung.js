// 💶 Erstattung (0.42.0, wie KC Erstattung, KC-CLUB-ERSTATTUNG-BRIEFBOGEN, KC-CLUB-ERSTATTUNG-CSV): Fahrtkosten (km × Satz, Standard 0,30 €/km,
// änderbar in der PC-Verwaltung als km_satz) und Auslagen mit Beleg (Foto oder PDF). Einreichen: Erwachsene (Lehrkräfte, Leitung, Vorstand, Eltern als
// Fahrer). Die Kasse (Vorstand Förderverein, Leitung) genehmigt, zahlt aus oder lehnt ab – mit Notiz. Den Betrag rechnet der Server.
// 🖨️ Antrag auf dem Bachkreis-Briefbogen, ⬇️ CSV für die Kasse. Keine Bankdaten in der App – ausgezahlt wird wie gewohnt über die Kasse.
import { S, VIEWS, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, herunterladen } from "../kern/ui.js";
import { liste, hole, speichere, neueId, konfig } from "../kern/daten.js";
import { ER_ARTEN, ER_STATUS, ER_KASSE, ER_KM_SATZ, erBetrag } from "../kern/schema.js";
import { csvAus, tagIso } from "../kern/logik.js";
import { hochladen, bildVerkleinern, dateiOeffnen } from "../kern/dateien.js";
import { briefDrucken } from "./buero.js";

const kasse = () => hatRolle(...ER_KASSE);
export const darfErstattung = () => !!S.ich && S.ich.typ !== "schueler";
const satz = () => (Number(konfig().km_satz) > 0 ? Number(konfig().km_satz) : ER_KM_SATZ);
const euro = (x) => (Number(x) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export const erOffen = () => (kasse() ? liste("erstattungen", (e) => e.status === "eingereicht" && e.von !== S.ich?.id).length : 0);
const E = { tab: "meine", beleg: null };

VIEWS.erstattung = {
  render() {
    if (!darfErstattung()) return kopf("💶 Erstattung") + '<div class="leer">Erstattungen reichen Erwachsene ein.</div>';
    const meine = liste("erstattungen", (e) => e.von === S.ich.id).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    const alle = kasse() ? liste("erstattungen").sort((a, b) => String(b.datum).localeCompare(String(a.datum))) : [];
    const tabs = kasse() ? `<div class="umschalter" role="group" aria-label="Ansicht"><button type="button" class="${E.tab === "meine" ? "an" : ""}" aria-pressed="${E.tab === "meine"}" data-a="erTab" data-x="meine">🙋 Meine</button><button type="button" class="${E.tab === "kasse" ? "an" : ""}" aria-pressed="${E.tab === "kasse"}" data-a="erTab" data-x="kasse">🏦 Kasse (${erOffen()} offen)</button></div>` : "";
    const zeile = (e, k) => `<li><span aria-hidden="true">${e.art === "fahrt" ? "🚗" : "🧾"}</span><div class="fl"><div class="zeile-titel">${esc(e.zweck)}</div>
      <div class="zeile-unter">${esc(new Date(e.datum + "T12:00").toLocaleDateString("de-DE"))}${e.km ? ` · ${e.km} km` : ""}${k ? ` · ${esc(name(e.von))}` : ""} · ${esc(ER_STATUS[e.status] || "")}${e.notiz_kasse ? ` · 💬 ${esc(e.notiz_kasse)}` : ""}</div></div>
      <b class="er-betrag">${euro(e.betrag)}</b>${e.beleg ? `<button type="button" class="knopf klein" data-a="erBeleg" data-x="${esc(e.id)}" aria-label="Beleg ansehen">🧾</button>` : ""}
      <button type="button" class="knopf klein" data-a="erDrucken" data-x="${esc(e.id)}" aria-label="Antrag drucken">🖨️</button>
      ${k ? `<button type="button" class="knopf klein haupt" data-a="erPruefen" data-x="${esc(e.id)}">Prüfen</button>` : e.status === "eingereicht" ? `<button type="button" class="knopf klein" data-a="erZurueck" data-x="${esc(e.id)}" aria-label="Zurückziehen">✕</button>` : ""}</li>`;
    const summe = (l, st) => l.filter((e) => !st || st.includes(e.status)).reduce((s, e) => s + (Number(e.betrag) || 0), 0);
    const inhalt = E.tab === "kasse" && kasse()
      ? `<div class="karte"><p>📨 offen: <b>${euro(summe(alle, ["eingereicht"]))}</b> · ✅ genehmigt, noch nicht ausgezahlt: <b>${euro(summe(alle, ["genehmigt"]))}</b></p><div class="knopfreihe"><button type="button" class="knopf klein" data-a="erCsv">⬇️ Als Liste (CSV)</button></div>
          <ul class="liste">${alle.map((e) => zeile(e, true)).join("") || '<li class="leer">Keine Erstattungen.</li>'}</ul></div>`
      : `<div class="knopfreihe"><button type="button" class="knopf haupt" data-a="erNeu" data-x="fahrt">🚗 Fahrtkosten</button><button type="button" class="knopf haupt" data-a="erNeu" data-x="auslage">🧾 Auslage</button></div>
        <div class="karte"><ul class="liste">${meine.map((e) => zeile(e, false)).join("") || '<li class="leer">Noch nichts eingereicht.</li>'}</ul></div>`;
    return kopf("💶 Erstattung") + `<p class="hinweis">Fahrtkosten (${euro(satz())} je km) und Auslagen mit Beleg. Ausgezahlt wird über die Kasse des Fördervereins – Bankdaten stehen nicht in der App.</p>` + tabs + inhalt;
  },
};
AKTIONEN.erTab = (k) => { E.tab = k; zeichne(); };
AKTIONEN.erNeu = (art) => {
  E.beleg = null; const fahrt = art === "fahrt";
  const termine = liste("termine", (t) => new Date(t.beginn) > new Date(Date.now() - 60 * 86400000) && new Date(t.beginn) < new Date(Date.now() + 86400000)).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn))).slice(0, 30);
  blatt(fahrt ? "🚗 Fahrtkosten" : "🧾 Auslage", `<div id="erForm" class="vl-form">
    <div class="vl-raster"><div class="feld"><label for="erDatum">Datum *</label><input id="erDatum" name="datum" type="date" value="${tagIso(new Date())}"></div>
      ${fahrt ? `<div class="feld"><label for="erKm">Kilometer (hin und zurück) *</label><input id="erKm" name="km" type="number" min="1" max="5000" inputmode="numeric" data-c="erRechnen"></div>` : `<div class="feld"><label for="erBetragF">Betrag (€) *</label><input id="erBetragF" name="betrag" type="number" min="0.01" step="0.01" inputmode="decimal"></div>`}</div>
    <div class="feld"><label for="erZweck">Wofür? *</label><input id="erZweck" name="zweck" maxlength="200" placeholder="${fahrt ? "z. B. Instrumententransport zum Konzert" : "z. B. Saiten für Leih-Geigen"}"></div>
    <div class="feld"><label for="erTermin">Zu einem Termin? (freiwillig)</label><select id="erTermin" name="termin_id"><option value="">–</option>${termine.map((t) => `<option value="${esc(t.id)}">${esc(new Date(t.beginn).toLocaleDateString("de-DE"))} · ${esc(t.titel)}</option>`).join("")}</select></div>
    <div class="feld"><label for="erBelegF">Beleg ${fahrt ? "(freiwillig)" : "*"} – Foto oder PDF</label><input id="erBelegF" type="file" accept="image/*,application/pdf" data-c="erBelegWahl"><small class="hinweis" id="erBelegOk"></small></div>
    ${fahrt ? `<p class="er-rechnung" id="erRechnung" aria-live="polite">${euro(0)}</p>` : ""}
    <button type="button" class="knopf haupt breit" data-a="erEinreichen" data-x="${art}">📨 Einreichen</button></div>`);
};
AKTIONEN.erRechnen = (v) => { const r = document.getElementById("erRechnung"); if (r) r.textContent = `${Number(v) || 0} km × ${euro(satz())} = ${euro(erBetrag({ art: "fahrt", km: v }, satz()))}`; };
document.addEventListener("input", (e) => { if (e.target?.id === "erKm") AKTIONEN.erRechnen(e.target.value); });
AKTIONEN.erBelegWahl = async (_, el) => {
  const f = el.files?.[0]; if (!f) return; const ok = document.getElementById("erBelegOk"); if (ok) ok.textContent = "⏳ lädt hoch …";
  try { const klein = /^image\//.test(f.type) ? await bildVerkleinern(f, 1600) : f; const r = await hochladen(klein, { name: f.name }); E.beleg = "datei:" + r.id; if (ok) ok.textContent = `✅ ${f.name}`; }
  catch (e) { E.beleg = null; if (ok) ok.textContent = "⚠️ " + e.message; }
};
AKTIONEN.erEinreichen = async (art) => {
  const f = formWerte(document.getElementById("erForm"));
  if (!f.datum || !String(f.zweck || "").trim()) return toast("Bitte Datum und „Wofür?“ angeben.");
  if (art === "fahrt" && !(Number(f.km) > 0)) return toast("Bitte die Kilometer eintragen.");
  if (art === "auslage" && !(Number(f.betrag) > 0)) return toast("Bitte den Betrag eintragen.");
  if (art === "auslage" && !E.beleg) return toast("Für Auslagen bitte ein Foto oder PDF des Belegs anhängen.");
  const z = { id: neueId(), von: S.ich.id, art, datum: f.datum, zweck: f.zweck.trim(), km: art === "fahrt" ? Number(f.km) : null, betrag: art === "fahrt" ? erBetrag({ art, km: f.km }, satz()) : Number(f.betrag), beleg: E.beleg, termin_id: f.termin_id || null, status: "eingereicht" };
  try { await speichere("erstattungen", z); } catch (e) { return toast("⚠️ " + e.message); }
  blattZu(); toast(`📨 Eingereicht: ${euro(z.betrag)} – die Kasse meldet sich`); zeichne();
};
AKTIONEN.erZurueck = async (id) => { const e = hole("erstattungen", id); if (e) { await speichere("erstattungen", { ...e, geloescht_am: new Date().toISOString() }); toast("✕ Zurückgezogen"); zeichne(); } };
AKTIONEN.erBeleg = async (id) => {
  const e = hole("erstattungen", id); if (!e?.beleg) return;
  if (e.beleg.startsWith("bild:")) return window.open(e.beleg.slice(5), "_blank", "noopener");
  try { await dateiOeffnen(e.beleg.replace(/^datei:/, ""), `Beleg ${e.zweck}`, ""); } catch (x) { toast("⚠️ " + x.message); }
};
AKTIONEN.erPruefen = (id) => {
  const e = hole("erstattungen", id); if (!e) return;
  blatt(`💶 ${esc(e.zweck)}`, `<p><b>${euro(e.betrag)}</b> · ${esc(ER_ARTEN[e.art])}${e.km ? ` · ${e.km} km` : ""} · von ${esc(name(e.von))} · ${esc(new Date(e.datum + "T12:00").toLocaleDateString("de-DE"))}</p>
    <div class="feld"><label for="erNotiz">Notiz der Kasse (sieht die Person)</label><input id="erNotiz" maxlength="300" value="${esc(e.notiz_kasse || "")}"></div>
    <div class="knopfspalte">${[["genehmigt", "✅ Genehmigen"], ["ausgezahlt", "💶 Ausgezahlt"], ["abgelehnt", "✖ Ablehnen"], ["eingereicht", "↩️ Zurück auf eingereicht"]].filter(([k]) => k !== e.status).map(([k, t]) => `<button type="button" class="knopf" data-a="erStatus" data-x="${esc(id)}|${k}">${t}</button>`).join("")}</div>`);
};
AKTIONEN.erStatus = async (x) => { const [id, st] = String(x).split("|"), e = hole("erstattungen", id); if (!e) return; await speichere("erstattungen", { ...e, status: st, notiz_kasse: document.getElementById("erNotiz")?.value || null, bearbeitet_von: S.ich.id }); blattZu(); toast(ER_STATUS[st]); zeichne(); };
AKTIONEN.erDrucken = (id) => {
  const e = hole("erstattungen", id); if (!e) return;
  briefDrucken(`Antrag auf Erstattung – ${e.zweck}`, `Antragsteller/in: ${name(e.von)}\nDatum der Ausgabe/Fahrt: ${new Date(e.datum + "T12:00").toLocaleDateString("de-DE")}\nArt: ${ER_ARTEN[e.art]}\nWofür: ${e.zweck}\n${e.km ? `Kilometer: ${e.km} × ${euro(satz())}\n` : ""}Betrag: ${euro(e.betrag)}\nBeleg: ${e.beleg ? "liegt in der App bei" : "–"}\nStatus: ${ER_STATUS[e.status]}${e.notiz_kasse ? ` (${e.notiz_kasse})` : ""}\n\n\n_______________________________          _______________________________\nUnterschrift Antragsteller/in                       Geprüft (Kasse)`);
};
AKTIONEN.erCsv = () => herunterladen(`erstattungen-${tagIso(new Date())}.csv`, "﻿" + csvAus(liste("erstattungen").map((e) => ({ Datum: e.datum, Person: name(e.von), Art: ER_ARTEN[e.art], Zweck: e.zweck, Km: e.km || "", Betrag: String(e.betrag).replace(".", ","), Status: ER_STATUS[e.status], Notiz: e.notiz_kasse || "" })), ["Datum", "Person", "Art", "Zweck", "Km", "Betrag", "Status", "Notiz"]), "text/csv");
