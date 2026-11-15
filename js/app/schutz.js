// 🛡️ Schutz & Fürsorge (0.20.0): 🩺 Gesundheit & Notfall (Eltern pflegen, Leitung/Lehrkräfte/Begleiter lesen),
// 📷 Foto-Liste (wer darf wofür fotografiert werden – je Zweck aus den Einwilligungen), 📋 Anwesenheit & Fehlzeiten.
// Die Rechte setzt der Server durch (regeln.js: gesundheit, begleitKinder); hier steht nur die Oberfläche.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, toast, formWerte, blatt, blattZu, frage } from "../kern/ui.js";
import { liste, hole, speichere, istEchtbetrieb } from "../kern/daten.js";
import { kinderVon, fotoErlaubnis, fehlzeiten, tagIso, gruppenMitglieder } from "../kern/logik.js";
import { TABELLEN, GENEHMIGUNG_ZWECKE, FOTO_ZWECKE, istMinderjaehrig, ksVon, KS_SICHT, KS_SPERRE } from "../kern/schema.js";

// ---------- 🩺 Gesundheit & Notfall ----------
export const gesundheitVon = (pid) => liste("gesundheit", (g) => g.person_id === pid)[0] || null;
const abgelaufen = (g) => !!g?.loeschen_am && g.loeschen_am < tagIso(new Date());
// Für wen darf ich den Bogen ausfüllen? Eltern: ihre Kinder; volljährige Schüler: sich selbst
export const gesundheitFuer = () => (istEltern() ? kinderVon(db, S.ich.id) : S.ich?.typ === "schueler" && !istMinderjaehrig(S.ich) ? [S.ich.id] : []);
// Kurzfassung für SOS, Teilnehmerlisten, Begleiter
export function gesundheitKurz(pid) {
  const g = gesundheitVon(pid);
  if (!g) return '<div class="hinweis">🩺 keine Gesundheitsangaben hinterlegt</div>';
  const z = [["⚠️ Allergien", g.allergien], ["🍽️ Ernährung", g.ernaehrung], ["💊 Medikamente", g.medikamente], ["🩺 Hinweise", g.erkrankungen],
    ["📞 Notfall", [g.notfall_name, g.notfall_tel].filter(Boolean).join(" · ")], ["🏥 Krankenkasse", g.krankenkasse], ["👩‍⚕️ Arzt", g.hausarzt],
    ["🏊 Schwimmer", g.schwimmer && TABELLEN.gesundheit.felder.find((f) => f.k === "schwimmer").werte[g.schwimmer]]].filter(([, v]) => v);
  return `<div class="gs-kurz${abgelaufen(g) ? " alt" : ""}">${z.map(([t, v]) => `<div><b>${t}:</b> ${esc(v)}</div>`).join("")}
    <div class="hinweis">${g.erste_hilfe_ok ? "✅ Erste Hilfe erlaubt" : "❔ Erste Hilfe nicht freigegeben"} · ${g.medikamente_geben_ok ? "✅ Medikamente geben erlaubt" : "❔ Medikamente nicht freigegeben"} · bestätigt ${datumKurz(g.geprueft_am)}${abgelaufen(g) ? " · ⚠️ abgelaufen – Eltern um Bestätigung bitten" : ""}</div></div>`;
}
VIEWS.gesundheit = {
  render(p) {
    const fuer = gesundheitFuer();
    if (!fuer.length) return kopf("🩺 Gesundheit & Notfall") + '<div class="leer">Die Angaben pflegen die Eltern (bei Volljährigen die Person selbst).</div>';
    const pid = fuer.includes(p.pid) ? p.pid : fuer[0], g = gesundheitVon(pid) || {};
    const f = (k) => TABELLEN.gesundheit.felder.find((x) => x.k === k);
    const feld = (k, art = "text") => { const d = f(k); return art === "lang" ? `<div class="feld"><label>${esc(d.t)}</label><textarea name="${k}" maxlength="1000">${esc(g[k] || "")}</textarea></div>` : `<div class="feld"><label>${esc(d.t)}</label><input name="${k}" type="${art}" value="${esc(g[k] || "")}"></div>`; };
    return kopf("🩺 Gesundheit & Notfall") + (fuer.length > 1 ? `<div class="inst-chips">${fuer.map((k) => `<button type="button" class="${k === pid ? "an" : ""}" data-a="gsKind" data-x="${k}">${esc(vorname(k))}</button>`).join("")}</div>` : "")
      + `<div class="karte" id="gsForm"><h3>${esc(name(pid))}</h3>
        <p class="hinweis">🔒 Sehen dürfen das nur die Leitung, die Lehrkräfte und – nur während einer Fahrt – die Begleitpersonen. Nichts davon erscheint in Listen für andere Eltern oder Kinder.</p>
        ${feld("allergien", "lang")}${feld("ernaehrung")}${feld("medikamente", "lang")}${feld("erkrankungen", "lang")}
        <div class="gs-zwei">${feld("notfall_name")}${feld("notfall_tel", "tel")}</div><div class="gs-zwei">${feld("krankenkasse")}${feld("hausarzt")}</div>
        <div class="gs-zwei">${feld("tetanus", "date")}<div class="feld"><label>${esc(f("schwimmer").t)}</label><select name="schwimmer"><option value="">–</option>${Object.entries(f("schwimmer").werte).map(([k, t]) => `<option value="${k}" ${g.schwimmer === k ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
        <label class="schalter"><span>${esc(f("erste_hilfe_ok").t)}</span><input type="checkbox" name="erste_hilfe_ok" ${g.erste_hilfe_ok ? "checked" : ""}></label>
        <label class="schalter"><span>${esc(f("medikamente_geben_ok").t)}</span><input type="checkbox" name="medikamente_geben_ok" ${g.medikamente_geben_ok ? "checked" : ""}></label>
        <button class="knopf haupt breit" data-a="gsSpeichern" data-x="${pid}">✅ Speichern und bestätigen</button>
        <p class="hinweis">${g.geprueft_am ? `Zuletzt bestätigt am ${datumKurz(g.geprueft_am)}. ` : ""}Die Angaben gelten 13 Monate ab der letzten Bestätigung und werden danach gelöscht, wenn niemand sie erneut bestätigt.</p></div>`;
  },
};
AKTIONEN.gsKind = (k) => zeige("gesundheit", { pid: k }, { ersetzen: true });
AKTIONEN.gsSpeichern = async (pid) => {
  const f = formWerte(document.getElementById("gsForm")), alt = gesundheitVon(pid) || {};
  const bis = new Date(); bis.setDate(bis.getDate() + 395);
  await speichere("gesundheit", { ...alt, ...f, person_id: pid, erste_hilfe_ok: !!f.erste_hilfe_ok, medikamente_geben_ok: !!f.medikamente_geben_ok, tetanus: f.tetanus || null, schwimmer: f.schwimmer || null,
    geprueft_am: tagIso(new Date()), geprueft_von: S.ich.id, loeschen_am: tagIso(bis) });
  toast("🩺 Gespeichert – danke!"); zeichne();
};

// ---------- 📷 Foto-Liste ----------
const FOTO_KURZ = { foto_intern: "App", foto_website: "Website", foto_presse: "Presse", foto_social: "Social" };
const FOTO_SYM = { ja: ["b-gruen", "✅"], nein: ["b-rot", "⛔"], offen: ["b-grau", "❔"] };
// 🛡️ 0.69.0 „Schutz & Fotos“ (Leitung, Lehrkräfte): Foto-Einwilligungen + was die Eltern zu Kontakt, Sichtbarkeit und Abholung gewählt haben,
// ⚠️ Schutzsperre (setzt nur die Leitung, ohne Grund), 🙋 offene Bitten um Schutz, ⏳ noch nicht gewählt (= alles aus)
const ksDa = (id) => !!hole("kinderschutz", id)?.bestaetigt_am;
const ksK = (id) => ksVon({ [id]: hole("kinderschutz", id) }, id);
const KS_FILTER = { alle: "Alle", schutz: "🛡️ Schutz", bitte: "🙋 Bitten", offen: "⏳ nicht gewählt" };
VIEWS.fotoliste = {
  render(p) {
    const gruppen = liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
    const f = p.f || "alle", gr = f === "alle" ? p.gr || gruppen[0]?.id : null;
    const basis = gr ? gruppenMitglieder(db, gr).map((id) => hole("personen", id)) : liste("personen", (x) => x.typ === "schueler" && x.status !== "ausgetreten");
    const kids = basis.filter((x) => x?.typ === "schueler").filter((k) => f === "alle" || (f === "schutz" ? ksK(k.id).schutz_aktiv : f === "bitte" ? ksK(k.id).schutz_wunsch && !hole("kinderschutz", k.id)?.schutz_geprueft_am : !ksDa(k.id))).sort((a, b) => name(a).localeCompare(name(b), "de"));
    const zeilen = kids.map((k) => ({ k, e: fotoErlaubnis(db, k.id), s: ksK(k.id) }));
    const nicht = (z) => zeilen.filter((x) => x.e[z] !== "ja");
    const zahl = { schutz: liste("kinderschutz", (z) => z.schutz_aktiv).length, bitte: liste("kinderschutz", (z) => z.schutz_wunsch && !z.schutz_geprueft_am).length, offen: liste("personen", (x) => x.typ === "schueler" && x.status !== "ausgetreten" && !ksDa(x.id)).length };
    return kopf("🛡️ Schutz & Fotos") + `<div class="wahlen">${Object.entries(KS_FILTER).map(([k, t]) => `<button type="button" class="chip-wahl${f === k ? " an" : ""}" data-a="ksFilter" data-x="${k}" aria-pressed="${f === k}">${t}${zahl[k] ? ` ${zahl[k]}` : ""}</button>`).join("")}</div>
      ${f === "alle" ? `<div class="inst-chips">${gruppen.map((g) => `<button type="button" class="${g.id === gr ? "an" : ""}" data-a="fotoGruppe" data-x="${g.id}">${esc(g.kuerzel)} · ${esc(g.name)}</button>`).join("")}</div>` : ""}
      <div class="karte"><b>Nicht fotografieren / nicht zeigen:</b> ${FOTO_ZWECKE.map((z) => `<span class="badge ${nicht(z).length ? "b-rot" : "b-gruen"}">${FOTO_KURZ[z]}: ${nicht(z).length}</span>`).join("")}
        <p class="hinweis">❔ = keine gültige Einwilligung – gilt wie ⛔. ⚠️ = Schutzsperre: nie fotografieren, nicht an Fremde herausgeben, nur an die Eltern bzw. die Abholliste übergeben. Antippen zeigt Abholliste und Einstellungen.</p></div>
      <div class="karte"><table class="foto-tab"><thead><tr><th>Kind</th>${FOTO_ZWECKE.map((z) => `<th title="${esc(GENEHMIGUNG_ZWECKE[z])}">${FOTO_KURZ[z]}</th>`).join("")}<th title="Privat mit anderen Kindern schreiben">💬</th><th title="Für andere sichtbar">👀</th><th title="Abholliste">🚗</th></tr></thead>
        <tbody>${zeilen.map(({ k, e, s: ks }) => `<tr class="klick${FOTO_ZWECKE.some((z) => e[z] !== "ja") || ks.schutz_aktiv ? " foto-achtung" : ""}" data-a="ksKind" data-x="${esc(k.id)}"><td>${ks.schutz_aktiv ? '<span title="Schutzsperre">⚠️</span> ' : ""}${ks.schutz_wunsch && !hole("kinderschutz", k.id)?.schutz_geprueft_am ? '<span title="Eltern bitten um Schutz">🙋</span> ' : ""}${esc(name(k))}${ksDa(k.id) ? "" : ' <span class="hinweis" title="Eltern haben noch nicht gewählt – alles aus">⏳</span>'}</td>
          ${FOTO_ZWECKE.map((z) => `<td><span class="badge ${FOTO_SYM[e[z]][0]}">${FOTO_SYM[e[z]][1]}</span></td>`).join("")}<td>${ks.kinder_chat === "ja" && !ks.schutz_aktiv ? "✅" : "🚫"}</td><td>${ks.schutz_aktiv ? "🔒" : { voll: "👤", vorname: "🔤", leitung: "🔒" }[ks.sichtbar]}</td><td>${(ks.abholer || []).length ? (ks.abholer || []).length : ""}</td></tr>`).join("") || '<tr><td colspan="8" class="hinweis">Niemand in dieser Auswahl.</td></tr>'}</tbody></table>
        <div class="knopfreihe"><button class="knopf" data-a="drucken">🖨️ Für den Fotografen drucken</button><button class="knopf" data-a="kachel" data-x="genehmigungen">✍️ Einwilligungen anfordern</button></div></div>`;
  },
};
AKTIONEN.ksFilter = (f) => zeige("fotoliste", { f }, { ersetzen: true });
AKTIONEN.ksKind = (id) => {
  const k = hole("personen", id), z = hole("kinderschutz", id), s = ksK(id), e = fotoErlaubnis(db, id), chef = hatRolle(...KS_SPERRE);
  const eltern = liste("eltern_kind", (x) => x.kind_id === id).map((x) => hole("personen", x.eltern_id)).filter(Boolean);
  blatt(`🛡️ ${name(k)}`, `${s.schutz_aktiv ? '<p class="ks-meldung rot">⚠️ Schutzsperre aktiv – nicht fotografieren, nur an Eltern bzw. die Abholliste übergeben.</p>' : ""}
    ${s.schutz_wunsch && !z?.schutz_geprueft_am ? '<p class="ks-meldung gelb">🙋 Die Eltern bitten um besonderen Schutz – bitte persönlich Kontakt aufnehmen.</p>' : ""}
    <h4>🚗 Darf abholen</h4><ul class="liste">${eltern.map((p) => `<li><div class="fl"><b>${esc(name(p))}</b><div class="zeile-unter">Eltern${p.mobil ? ` · ${esc(p.mobil)}` : ""}</div></div></li>`).join("")}
      ${(s.abholer || []).map((a) => `<li><div class="fl"><b>${esc(a.name)}</b><div class="zeile-unter">${esc(a.beziehung || "")}${a.telefon ? ` · ${esc(a.telefon)}` : ""}</div></div></li>`).join("")}</ul>
    <h4>Einstellungen der Eltern ${z?.bestaetigt_am ? `<small class="hinweis">(bestätigt ${datumKurz(z.bestaetigt_am)})</small>` : '<small class="hinweis">(⏳ noch nicht gewählt – alles aus)</small>'}</h4>
    <ul class="ks-liste"><li>📷 ${FOTO_ZWECKE.map((x) => `${FOTO_SYM[e[x]][1]} ${FOTO_KURZ[x]}`).join(" · ")}${s.foto_name ? " · Name darunter erlaubt" : " · ohne Namen"}</li>
      <li>💬 Privat mit anderen Kindern: ${s.kinder_chat === "ja" ? "ja" : "nein"} · 🟢 Online sichtbar: ${s.online_sichtbar ? "ja" : "nein"}</li><li>👀 ${esc(KS_SICHT[s.sichtbar] || "")}</li></ul>
    ${chef ? `<div class="knopfreihe">${s.schutz_wunsch && !z?.schutz_geprueft_am ? `<button type="button" class="knopf" data-a="ksGeprueft" data-x="${esc(id)}">✅ Bitte bearbeitet</button>` : ""}
      <button type="button" class="knopf ${s.schutz_aktiv ? "" : "haupt"}" data-a="ksSperre" data-x="${esc(id)}">${s.schutz_aktiv ? "Schutzsperre aufheben" : "🛡️ Schutzsperre setzen"}</button></div>
      <p class="hinweis">Gründe gehören nicht in die App – nur der Hinweis. Jede Änderung wird mit Zeit und Person protokolliert.</p>` : ""}`);
};
const ksSpeichern = async (id, felder) => { const z = hole("kinderschutz", id); await speichere("kinderschutz", { ...(z || { id, kind_id: id }), ...felder, ...(istEchtbetrieb() ? {} : felder.schutz_geprueft ? { schutz_geprueft_am: new Date().toISOString() } : {}) }); };
AKTIONEN.ksSperre = async (id) => { const an = !ksK(id).schutz_aktiv; if (!(await frage(an ? `Schutzsperre für ${name(id)} setzen? Keine Fotos, für andere unsichtbar, keine Kontakte zu anderen Kindern.` : `Schutzsperre für ${name(id)} aufheben?`))) return;
  await ksSpeichern(id, { schutz_aktiv: an, schutz_geprueft: true }); blattZu(); toast(an ? "🛡️ Schutzsperre gesetzt" : "Schutzsperre aufgehoben"); zeichne(); };
AKTIONEN.ksGeprueft = async (id) => { await ksSpeichern(id, { schutz_geprueft: true }); blattZu(); toast("✅ Als bearbeitet vermerkt"); zeichne(); };
AKTIONEN.fotoGruppe = (g) => zeige("fotoliste", { gr: g }, { ersetzen: true });

// ---------- 📋 Anwesenheit & Fehlzeiten ----------
const ZEITRAUM = { 30: "30 Tage", 90: "3 Monate", 180: "Halbjahr", 365: "1 Jahr" };
export const darfAnwesenheit = () => hatRolle("admin", "leitung", "lehrkraft", "terminplaner");
VIEWS.anwesenheit = {
  render(p) {
    const tage = Number(p.tage) || 90, gruppen = liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)), gr = p.gr || "";
    const von = new Date(Date.now() - tage * 86400000), personen = gr ? gruppenMitglieder(db, gr) : null;
    const l = fehlzeiten(db, { von, personen, gruppe: gr || null }).filter((z) => hole("personen", z.person_id)?.typ === "schueler");
    const summe = l.reduce((s, z) => ({ ja: s.ja + z.ja, spaet: s.spaet + z.spaet, ent: s.ent + z.entschuldigt, nein: s.nein + z.nein, alle: s.alle + z.erfasst }), { ja: 0, spaet: 0, ent: 0, nein: 0, alle: 0 });
    const auffaellig = l.filter((z) => z.nein >= 2 || (z.quote != null && z.quote < 70));
    const zeile = (z) => `<li class="klick" data-a="oeffne" data-x="person|${z.person_id}"><div class="fl"><div class="zeile-titel">${esc(name(z.person_id))}</div>
      <div class="zeile-unter">✅ ${z.ja} · ⏰ ${z.spaet} · 🟡 ${z.entschuldigt} · ❌ ${z.nein} von ${z.erfasst}</div></div><span class="badge ${z.quote == null ? "b-grau" : z.quote >= 85 ? "b-gruen" : z.quote >= 70 ? "b-gelb" : "b-rot"}">${z.quote == null ? "UNBEKANNT" : z.quote + " %"}</span></li>`;
    return kopf("📋 Anwesenheit") + `<div class="inst-chips"><button type="button" class="${!gr ? "an" : ""}" data-a="anwFilter" data-x="gr:">Alle</button>${gruppen.map((g) => `<button type="button" class="${gr === g.id ? "an" : ""}" data-a="anwFilter" data-x="gr:${g.id}">${esc(g.kuerzel)}</button>`).join("")}</div>
      <div class="inst-chips">${Object.entries(ZEITRAUM).map(([k, t]) => `<button type="button" class="${tage === Number(k) ? "an" : ""}" data-a="anwFilter" data-x="tage:${k}">${t}</button>`).join("")}</div>
      <div class="kennzahlen"><div class="kennzahl"><b>${summe.alle ? Math.round(((summe.ja + summe.spaet) / summe.alle) * 100) + " %" : "UNBEKANNT"}</b><small>anwesend (inkl. verspätet)</small></div>
        <div class="kennzahl"><b>⏰ ${summe.spaet}</b><small>verspätet</small></div><div class="kennzahl"><b>🟡 ${summe.ent}</b><small>entschuldigt</small></div><div class="kennzahl"><b>❌ ${summe.nein}</b><small>unentschuldigt</small></div></div>
      ${auffaellig.length ? `<div class="karte anw-achtung"><h3>⚠️ Bitte ansprechen (${auffaellig.length})</h3><p class="hinweis">2× unentschuldigt oder unter 70 % – vielleicht ein Gespräch mit Kind/Eltern.</p><ul class="liste">${auffaellig.map(zeile).join("")}</ul></div>` : ""}
      <div class="karte"><h3>Alle (${l.length})</h3><ul class="liste">${l.map(zeile).join("") || '<li class="hinweis">Noch keine Anwesenheit erfasst – in einem vergangenen Termin unter „Teilnehmer“ abhaken.</li>'}</ul></div>
      <p class="hinweis">Erfasst wird im Termin (nach Beginn): ✅ da · ⏰ verspätet · 🟡 entschuldigt · ❌ unentschuldigt. Wer vorher abgesagt hat, ist automatisch „entschuldigt“ vorgeschlagen.</p>`;
  },
};
AKTIONEN.anwFilter = (x) => { const [k, v] = x.split(":"); zeige("anwesenheit", { ...S.params, [k]: v }, { ersetzen: true }); };
