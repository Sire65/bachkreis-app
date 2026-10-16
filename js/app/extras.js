// ✨ Extras (0.22.0): 📝 Übeaufgaben der Lehrkräfte · 🚗 Mitfahrgelegenheiten je Termin · 📜 GEMA-Liste & Mietmaterial · 📧 Werkstatt-Auftrag.
// Rechte setzt der Server (regeln.js: uebeaufgaben, mitfahrten); hier steht die Oberfläche.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, herunterladen, frage } from "../kern/ui.js";
import { liste, hole, speichere, loesche } from "../kern/daten.js";
import { kinderVon, tagIso, registerVon, wirksameGruppen, csvAus } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

const lehrt = () => hatRolle("admin", "leitung", "lehrkraft");

// ---------- 📝 Übeaufgaben ----------
// Für wen gilt eine Aufgabe? Eine Person – oder alle eines Registers/einer Gruppe
export function aufgabenFuer(pid) {
  const reg = registerVon(db, pid), gr = wirksameGruppen(db, pid);
  return liste("uebeaufgaben", (a) => (a.person_id ? a.person_id === pid : (!a.register_id || a.register_id === reg) && (!a.gruppe_id || gr.includes(a.gruppe_id)) && !!(a.register_id || a.gruppe_id)))
    .sort((a, b) => String(a.bis || "9").localeCompare(String(b.bis || "9")));
}
export function aufgabenHtml(pid) {
  const l = aufgabenFuer(pid), heute = tagIso(new Date());
  if (!l.length) return "";
  return `<div class="karte ua-karte"><h3>📝 Aufgaben ${pid === S.ich.id ? "für dich" : `für ${esc(vorname(pid))}`}</h3><ul class="liste">${l.map((a) => {
    const ok = (a.erledigt || []).includes(pid), w = a.werk_id ? hole("werke", a.werk_id) : null;
    return `<li class="${ok ? "ua-ok" : ""}"><label class="ua-haken"><input type="checkbox" data-c="aufgabeHaken" data-x="${a.id}|${pid}" ${ok ? "checked" : ""}></label><div class="fl"><div class="zeile-titel">${esc(a.titel)}</div>
      <div class="zeile-unter">${w ? `🎼 ${esc(w.titel)} · ` : ""}${a.text ? esc(a.text) + " · " : ""}von ${esc(name(a.von_id))}${a.bis ? ` · <span class="${!ok && a.bis < heute ? "ua-spaet" : ""}">bis ${datumKurz(a.bis)}</span>` : ""}</div></div></li>`;
  }).join("")}</ul></div>`;
}
AKTIONEN.aufgabeHaken = async (_, el) => {
  const [id, pid] = el.dataset.x.split("|"), a = hole("uebeaufgaben", id), l = new Set(a.erledigt || []);
  el.checked ? l.add(pid) : l.delete(pid);
  await speichere("uebeaufgaben", { ...a, erledigt: [...l] });
  if (el.checked) toast("✅ Super – erledigt!"); zeichne();
};
// Lehrkräfte: Aufgaben verwalten (in der Übe-Übersicht)
export function aufgabenVerwaltenHtml() {
  if (!lehrt()) return "";
  const l = liste("uebeaufgaben").sort((a, b) => String(b.bis || "").localeCompare(String(a.bis || "")));
  const ziel = (a) => (a.person_id ? name(a.person_id) : [a.register_id && hole("register", a.register_id)?.name, a.gruppe_id && hole("gruppen", a.gruppe_id)?.name].filter(Boolean).join(" · "));
  return `<div class="karte"><h3>📝 Übeaufgaben <button class="knopf klein haupt" data-a="aufgabeNeu">＋ Aufgabe</button></h3><ul class="liste">${l.map((a) => `<li><div class="fl"><div class="zeile-titel">${esc(a.titel)}</div><div class="zeile-unter">für ${esc(ziel(a) || "–")}${a.bis ? ` · bis ${datumKurz(a.bis)}` : ""} · ✅ ${(a.erledigt || []).length} erledigt</div></div><button class="knopf klein" data-a="aufgabeWeg" data-x="${a.id}" aria-label="Aufgabe löschen">🗑️</button></li>`).join("") || '<li class="hinweis">Noch keine Aufgaben.</li>'}</ul></div>`;
}
AKTIONEN.aufgabeNeu = () => {
  const opt = (l, f) => l.map((x) => `<option value="${x.id}">${esc(f(x))}</option>`).join("");
  blatt("📝 Neue Übeaufgabe", `<div id="uaForm"><div class="feld"><label>Aufgabe</label><input name="titel" placeholder="z. B. Takt 17–32 langsam"></div><div class="feld"><label>Genauer</label><textarea name="text"></textarea></div>
    <div class="feld"><label>Stück</label><select name="werk_id"><option value="">–</option>${opt(liste("werke"), (w) => `${w.komponist}: ${w.titel}`)}</select></div>
    <div class="feld"><label>Für eine Person</label><select name="person_id"><option value="">– (oder Register/Gruppe)</option>${opt(liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten").sort((a, b) => name(a).localeCompare(name(b))), name)}</select></div>
    <div class="gs-zwei"><div class="feld"><label>oder Register</label><select name="register_id"><option value="">alle</option>${opt(liste("register"), (r) => r.name)}</select></div><div class="feld"><label>in Gruppe</label><select name="gruppe_id"><option value="">alle</option>${opt(liste("gruppen"), (g) => g.name)}</select></div></div>
    <div class="feld"><label>bis</label><input type="date" name="bis" value="${tagIso(new Date(Date.now() + 7 * 86400000))}"></div>
    <label class="schalter"><span>Benachrichtigen</span><input type="checkbox" name="melden" checked></label>
    <button class="knopf haupt breit" data-a="aufgabeSpeichern">💾 Aufgabe geben</button></div>`);
};
AKTIONEN.aufgabeSpeichern = async () => {
  const f = formWerte(document.getElementById("uaForm"));
  if (!f.titel || !(f.person_id || f.register_id || f.gruppe_id)) return toast("Bitte Aufgabe und Person, Register oder Gruppe wählen");
  const a = await speichere("uebeaufgaben", { titel: f.titel, text: f.text, werk_id: f.werk_id || null, person_id: f.person_id || null, register_id: f.person_id ? null : f.register_id || null, gruppe_id: f.person_id ? null : f.gruppe_id || null, von_id: S.ich.id, bis: f.bis || null, erledigt: [] });
  if (f.melden) {
    const an = liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten").map((p) => p.id).filter((pid) => aufgabenFuer(pid).some((x) => x.id === a.id));
    await senden({ an, betreff: `📝 Neue Übeaufgabe: ${a.titel}`, text: `${a.text || ""}${a.bis ? ` – bis ${datumKurz(a.bis)}` : ""}. In der App unter „Üben“.`, ereignis: "standard" });
  }
  blattZu(); toast("📝 Aufgabe gegeben"); zeichne();
};
AKTIONEN.aufgabeWeg = async (id) => { if (await frage("Aufgabe löschen?")) { await loesche("uebeaufgaben", id); zeichne(); } };

// ---------- 🚗 Mitfahrgelegenheiten ----------
const RICHTUNG = { hin: "hin", zurueck: "zurück", beides: "hin & zurück" };
export function mitfahrtHtml(t) {
  if (S.ich?.typ === "schueler" || new Date(t.beginn) < new Date() || t.status === "abgesagt") return "";
  const l = liste("mitfahrten", (m) => m.termin_id === t.id), kids = istEltern() ? kinderVon(db, S.ich.id) : [];
  const eigen = l.find((m) => m.fahrer_id === S.ich.id);
  return `<div class="karte mf-karte"><h3>🚗 Mitfahren</h3>${l.map((m) => {
    const frei = Math.max(0, (m.plaetze || 0) - (m.mitfahrer || []).length);
    return `<div class="mf-angebot"><div><b>${esc(name(m.fahrer_id))}</b> · ${RICHTUNG[m.richtung] || ""} · ${esc(m.abfahrt || "")} <span class="badge ${frei ? "b-gruen" : "b-grau"}">${frei} frei</span></div>
      <div class="hinweis">${(m.mitfahrer || []).map((k) => esc(vorname(k))).join(", ") || "noch niemand"}</div>
      <div class="knopfreihe">${kids.filter(() => m.fahrer_id !== S.ich.id).map((k) => (m.mitfahrer || []).includes(k) ? `<button class="knopf klein" data-a="mfBuchen" data-x="${m.id}|${k}|aus">➖ ${esc(vorname(k))} austragen</button>` : frei ? `<button class="knopf klein haupt" data-a="mfBuchen" data-x="${m.id}|${k}|ein">➕ ${esc(vorname(k))} mitnehmen</button>` : "").join("")}
        ${m.fahrer_id === S.ich.id ? `<button class="knopf klein" data-a="mfWeg" data-x="${m.id}">Angebot zurückziehen</button>` : ""}</div></div>`;
  }).join("") || '<p class="hinweis">Noch keine Mitfahrgelegenheit.</p>'}
    ${!eigen ? `<button class="knopf klein" data-a="mfAnbieten" data-x="${t.id}">🚗 Ich kann Kinder mitnehmen</button>` : ""}
    <p class="hinweis">Absprachen zur Abholung bitte direkt mit den Eltern. Mitfahren nur mit Einverständnis der Eltern.</p></div>`;
}
AKTIONEN.mfAnbieten = (tid) => blatt("🚗 Mitfahrgelegenheit anbieten", `<div id="mfForm"><div class="feld"><label>Richtung</label><select name="richtung">${Object.entries(RICHTUNG).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>
  <div class="feld"><label>Freie Plätze</label><input type="number" name="plaetze" min="1" max="8" value="2"></div><div class="feld"><label>Abfahrt (Ort, Uhrzeit)</label><input name="abfahrt" placeholder="z. B. 15:40 Kirche Weddinghofen"></div>
  <button class="knopf haupt breit" data-a="mfSpeichern" data-x="${tid}">🚗 Anbieten</button></div>`);
AKTIONEN.mfSpeichern = async (tid) => {
  const f = formWerte(document.getElementById("mfForm"));
  await speichere("mitfahrten", { termin_id: tid, fahrer_id: S.ich.id, richtung: f.richtung, plaetze: Number(f.plaetze) || 1, abfahrt: f.abfahrt, mitfahrer: [] });
  blattZu(); toast("🚗 Danke! Andere Eltern sehen dein Angebot beim Termin."); zeichne();
};
AKTIONEN.mfBuchen = async (x) => {
  const [id, k, art] = x.split("|"), m = hole("mitfahrten", id), l = new Set(m.mitfahrer || []);
  art === "ein" ? l.add(k) : l.delete(k);
  if (l.size > (m.plaetze || 0)) return toast("Leider schon voll");
  await speichere("mitfahrten", { ...m, mitfahrer: [...l] });
  if (art === "ein") await senden({ an: [m.fahrer_id], betreff: "🚗 Mitfahrt gebucht", text: `${vorname(k)} fährt bei dir mit (${hole("termine", m.termin_id)?.titel || ""}).`, ereignis: "standard" });
  zeichne();
};
AKTIONEN.mfWeg = async (id) => { if (await frage("Angebot zurückziehen? Gebuchte Familien werden benachrichtigt.")) { const m = hole("mitfahrten", id); await loesche("mitfahrten", id); const an = (m.mitfahrer || []).flatMap((k) => liste("eltern_kind", (e) => e.kind_id === k).map((e) => e.eltern_id)); if (an.length) await senden({ an, betreff: "🚗 Mitfahrt entfällt", text: `Die Mitfahrgelegenheit bei ${name(m.fahrer_id)} entfällt – bitte anders planen.`, ereignis: "standard" }); zeichne(); } };

// ---------- 📜 GEMA-Liste & Mietmaterial ----------
export function gemaCsv(pid) {
  const p = hole("projekte", pid), l = liste("programm", (x) => x.projekt_id === pid && x.werk_id).sort((a, b) => a.nr - b.nr);
  const z = l.map((x, i) => { const w = hole("werke", x.werk_id); return { nr: i + 1, komponist: w.komponist, titel: w.titel, bearbeiter: w.bearbeiter || "", verlag: w.verlag || "", dauer_min: x.dauer_min || w.dauer_min || "", gema: w.gema ? "ja" : "nein", es_spielt: hole("gruppen", x.gruppe_id)?.name || "" }; });
  if (!z.length) return toast("Noch kein Programm mit Werken");
  herunterladen(`gema-${(p?.titel || "konzert").replace(/[^\wäöüÄÖÜß-]+/g, "-")}.csv`, "﻿" + csvAus(z, Object.keys(z[0])), "text/csv");
  toast(`📜 GEMA-Liste: ${z.filter((x) => x.gema === "ja").length} von ${z.length} Werken GEMA-pflichtig`);
}
AKTIONEN.gemaListe = (pid) => gemaCsv(pid);

// ---------- 📧 Werkstatt-Auftrag über den Communicator ----------
AKTIONEN.werkstattAuftrag = async (rid) => {
  const r = hole("reparaturen", rid), w = hole("personen", r.werkstatt_id), gegen = r.inventar_id ? hole("inventar", r.inventar_id) : hole("ausstattung", r.ausstattung_id);
  if (!w) return toast("Bitte zuerst eine Werkstatt eintragen");
  const s = await senden({ an: [w.id], betreff: `Reparaturauftrag ${gegen?.inventar_nr || ""}`, text: `Guten Tag,\nbitte reparieren: ${gegen?.bezeichnung || ""} (${gegen?.inventar_nr || ""}).\nSchaden: ${r.meldung}\nFreigegeben bis ${r.kosten ? r.kosten + " €" : "Kostenvoranschlag"}.\nViele Grüße\nBachkreis`, ereignis: "instrument", kanaele: ["mail"] });
  toast(`📧 Auftrag an ${w.firma || name(w)} (${s.mail} Mail – im Vorführmodus simuliert)`);
};
