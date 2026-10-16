// 🧰 PC-Werkzeuge (0.24.0): die Abläufe der App auch am PC – übersichtlich in drei Spalten.
// 📅 Terminplanung (Serie, Register, Benachrichtigen, Nachfassen, Absagen) · ✍️ Genehmigungen (anfordern, erinnern, Stand je Kind)
// 📣 Rundschreiben · 🎭 Projekte & Konzerte (Programm, Anmeldungen, Helfer, Begleiter, Transport) · 💶 Kasse & Beiträge
// 🛡️ Notfall- & Foto-Listen · 🚗 Mitfahrbörse · 📜 Teilnahmebescheinigungen · 🏖️ Ferien eintragen
// main.js übergibt seine Bausteine (registrieren); dieses Modul greift nicht selbst auf main.js zu.
import { liste, hole, speichere, speichereViele, loesche, konfig } from "../kern/daten.js";
import { esc, AKTIONEN, toast, frage, herunterladen, datumKurz, formWerte, vonLokal, zuLokal, $ } from "../kern/ui.js";
import { TEILNAHME, GENEHMIGUNG_ZWECKE, FOTO_ZWECKE, UEBE_ARTEN } from "../kern/schema.js";
import { tagIso, eingeladene, antwortVon, antwortZaehler, besetzung, gesamtAmpel, genehmigungsUebersicht, genehmigungStatus, verteilerListe, verteilerAufloesen,
  elternVon, gruppenMitglieder, instrumenteVon, fehlzeiten, fotoErlaubnis, csvAus, uebeStand } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

let A; // { ANSICHTEN, V, zeichne, darf, db, pn, sonder }
const T = {}; // Zustand der Werkzeuge (Auswahl, Filter)
const hatRolle = (...r) => (A.V.ich?.rollen || []).some((x) => r.includes(x));
const planer = () => hatRolle("admin", "leitung", "lehrkraft", "terminplaner");
const leitung = () => hatRolle("admin", "leitung", "lehrkraft");
const kasse = () => hatRolle("admin", "leitung", "vorstand");
const geld = (v) => Number(v || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const bereich = (titel, inhalt, klasse = "") => `<section class="vw-bereich ${klasse}"><h3>${titel}</h3>${inhalt}</section>`;
const kopf = (titel, rechts = "", hinweis = "") => `<div class="vw-kopf"><h2>${titel}</h2>${rechts}${hinweis ? `<span class="hinweis">${hinweis}</span>` : ""}</div>`;
const opt = (l, w, f = (x) => x.name || x.titel) => l.map((x) => `<option value="${esc(x.id)}" ${x.id === w ? "selected" : ""}>${esc(f(x))}</option>`).join("");
const chips = (name, l, gewaehlt = [], f = (x) => x.name) => `<div class="wahlen">${l.map((x) => `<label><input type="checkbox" name="${name}" data-mehr="1" value="${esc(x.id)}" ${gewaehlt.includes(x.id) ? "checked" : ""}> ${esc(f(x))}</label>`).join("")}</div>`;
const gruppenSortiert = () => liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
const csv = (datei, zeilen) => { if (!zeilen.length) return toast("Nichts zu exportieren"); herunterladen(`${datei}-${tagIso(new Date())}.csv`, "﻿" + csvAus(zeilen, Object.keys(zeilen[0])), "text/csv"); };

export function werkzeugeRegistrieren(api) {
  A = api;
  const W = [
    ["termineplanen", "📅", "Terminplanung", "Termine", planer], ["genehmigungen", "✍️", "Genehmigungen", "Genehmigungen", leitung], ["rundschreiben", "📣", "Rundschreiben", "Kommunikation", leitung],
    ["projekteplanen", "🎭", "Projekte & Konzerte", "Termine", leitung], ["kasse", "💶", "Kasse & Beiträge", "Förderverein", kasse], ["schutzlisten", "🛡️", "Notfall- & Foto-Listen", "Genehmigungen", leitung],
    ["mitfahrboerse", "🚗", "Mitfahrbörse", "Termine", planer], ["bescheinigung", "📜", "Teilnahmebescheinigungen", "Orchester", leitung], ["ferien", "🏖️", "Ferien & freie Tage", "Termine", planer],
    ["uebebuehne", "🎻", "Übe-Bühne: Aufgaben & Fortschritt", "Orchester", leitung],
  ];
  for (const [k, sym, t, b, recht] of W) A.sonder(k, sym, t, b, recht);
}

// ---------- 📅 Terminplanung ----------
const ZEITRAUM = { 14: "2 Wochen", 42: "6 Wochen", 120: "4 Monate" };
function terminAnsicht() {
  const tage = Number(T.tage) || 42, bis = new Date(Date.now() + tage * 86400000), jetzt = new Date();
  const l = liste("termine", (t) => new Date(t.beginn) > new Date(jetzt - 86400000) && new Date(t.beginn) < bis).sort((a, b) => a.beginn.localeCompare(b.beginn));
  const arten = liste("terminarten").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)), start = new Date(Date.now() + 7 * 86400000); start.setHours(18, 0, 0, 0);
  const AMP = { gruen: "🟢", gelb: "🟡", rot: "🔴", grau: "⚪" };
  const zeile = (t) => {
    const z = antwortZaehler(db(), t), amp = t.soll ? gesamtAmpel(besetzung(db(), t)) : null, art = hole("terminarten", t.art_id);
    return `<tr class="${t.status === "abgesagt" ? "inv-abgang" : ""}"><td>${datumKurz(t.beginn)} ${new Date(t.beginn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td><td><b>${esc(t.titel)}</b>${t.register?.length ? ` <span class="badge b-lila">Registerprobe</span>` : ""}</td>
      <td>${esc(art?.sym || "")} ${esc(art?.name || "")}</td><td>${t.fuer_alle ? "🌍 alle" : (t.gruppen || []).map((g) => esc(hole("gruppen", g)?.kuerzel || "")).join(" ")}</td>
      <td class="r vw-rm"><b>✅ ${z.ja}</b> 🤔 ${z.vielleicht} ❌ ${z.nein} ❔ ${z.offen}</td><td>${amp ? AMP[amp] || "" : ""}</td>
      <td class="vw-aktionen">${t.status !== "abgesagt" ? `<button class="knopf klein" data-a="tpNachfassen" data-x="${t.id}" title="Offene erinnern" aria-label="Offene erinnern" ${z.offen + z.vielleicht ? "" : "disabled"}>⏰</button><button class="knopf klein" data-a="tpBearbeiten" data-x="${t.id}" title="Bearbeiten" aria-label="Bearbeiten">✏️</button><button class="knopf klein rot" data-a="tpAbsagen" data-x="${t.id}" title="Absagen" aria-label="Absagen">✕</button>` : '<span class="badge b-grau">abgesagt</span>'}</td></tr>`;
  };
  const form = `<div id="tpForm"><div class="vw-raster3 vw-felder">
      <div class="feld"><label>Titel *</label><input name="titel" placeholder="z. B. Probe A-Orchester"></div>
      <div class="feld"><label>Art</label><select name="art_id">${opt(arten, arten[0]?.id, (a) => `${a.sym || ""} ${a.name}`)}</select></div>
      <div class="feld"><label>Ort</label><input name="ort" list="tpOrte"><datalist id="tpOrte">${[...new Set(liste("termine").map((x) => x.ort).filter(Boolean))].map((o) => `<option value="${esc(o)}">`).join("")}</datalist></div>
      <div class="feld"><label>Beginn *</label><input type="datetime-local" name="beginn" value="${zuLokal(start.toISOString())}"></div>
      <div class="feld"><label>Ende</label><input type="datetime-local" name="ende" value="${zuLokal(new Date(start.getTime() + 90 * 60000).toISOString())}"></div>
      <div class="feld"><label>Antwort bis</label><input type="date" name="frist"></div>
      <div class="feld"><label>Teilnahme</label><select name="teilnahme">${Object.entries(TEILNAHME).map(([k, [sym, n]]) => `<option value="${k}" ${k === "erwuenscht" ? "selected" : ""}>${sym} ${n}</option>`).join("")}</select></div>
      <div class="feld"><label>Projekt / Konzert</label><select name="projekt_id"><option value="">–</option>${opt(liste("projekte"), "")}</select></div>
      <div class="feld"><label>Wiederholen</label><select name="serie"><option value="">einmalig</option><option value="7">jede Woche</option><option value="14">alle 2 Wochen</option></select></div>
      <div class="feld"><label>Serie bis</label><input type="date" name="serie_bis"></div></div>
    <div class="vw-raster3 vw-ja"><label class="vw-schalter"><input type="checkbox" name="fuer_alle"><span>🌍 Für alle (ganzer Bachkreis)</span></label><label class="vw-schalter"><input type="checkbox" name="melden" checked><span>📨 Eingeladene benachrichtigen</span></label></div>
    <div class="feld"><label>Für welche Orchester?</label>${chips("gruppen", gruppenSortiert(), [], (g) => `${g.kuerzel} · ${g.name}`)}</div>
    <div class="feld"><label>🎼 Nur für einzelne Register (Registerprobe) – leer = alle</label>${chips("register", liste("register").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)), [], (r) => r.kurz || r.name)}</div>
    <div class="vw-raster3"><div class="feld vw-breit2"><label>Hinweise (Treffpunkt, Kleidung …)</label><textarea name="beschreibung" rows="3"></textarea></div><div class="feld"><label>Probenplan</label><textarea name="probenplan" rows="3" placeholder="17:00 Einspielen …"></textarea></div></div>
    <div class="knopfreihe"><button class="knopf haupt" data-a="tpSpeichern">💾 Termin(e) anlegen</button></div></div>`;
  return kopf("📅 Terminplanung", `<select data-c="tpTage">${Object.entries(ZEITRAUM).map(([k, t]) => `<option value="${k}" ${tage === Number(k) ? "selected" : ""}>nächste ${t}</option>`).join("")}</select>`, "Neue Termine (auch als Serie und als Registerprobe), Rückmeldungen, Erinnern und Absagen – wie in der App.")
    + bereich("➕ Neuer Termin", form)
    + `<div class="vw-tabelle-wrap vw-abstand"><table class="vw-tabelle inv-tabelle"><thead><tr><th>Beginn</th><th>Titel</th><th>Art</th><th>für</th><th class="r">Rückmeldungen</th><th>Ampel</th><th></th></tr></thead><tbody>${l.map(zeile).join("") || '<tr><td colspan="7" class="hinweis">Keine Termine im Zeitraum.</td></tr>'}</tbody></table></div>`;
}
AKTIONEN.tpTage = (v) => { T.tage = v; A.zeichne(); };
AKTIONEN.tpSpeichern = async () => {
  const f = formWerte($("#tpForm"));
  if (!f.titel || !f.beginn) return toast("Titel und Beginn fehlen");
  if (!f.fuer_alle && !(f.gruppen || []).length) return toast("Bitte „Für alle“ oder mindestens ein Orchester wählen");
  const basis = { titel: f.titel, art_id: f.art_id, beginn: vonLokal(f.beginn), ende: f.ende ? vonLokal(f.ende) : null, ort: f.ort, fuer_alle: !!f.fuer_alle, gruppen: f.fuer_alle ? [] : f.gruppen || [], register: f.register || [],
    teilnahme: f.teilnahme, projekt_id: f.projekt_id || null, frist: f.frist || null, beschreibung: f.beschreibung, probenplan: f.probenplan, status: "geplant" };
  const neu = [basis];
  if (f.serie && f.serie_bis) {
    const schritt = Number(f.serie) * 86400000, dauer = basis.ende ? new Date(basis.ende) - new Date(basis.beginn) : 0;
    for (let b = new Date(basis.beginn).getTime() + schritt; b <= new Date(f.serie_bis + "T23:59").getTime() && neu.length < 60; b += schritt) neu.push({ ...basis, beginn: new Date(b).toISOString(), ende: dauer ? new Date(b + dauer).toISOString() : null, frist: null });
  }
  const gesp = await speichereViele("termine", neu);
  if (f.melden) {
    const an = [...new Set(gesp.flatMap((t) => eingeladene(db(), t)))];
    const s = await senden({ an, betreff: `Neu: ${basis.titel}${gesp.length > 1 ? ` (${gesp.length} Termine)` : ""}`, text: `${basis.titel} ab ${datumKurz(basis.beginn)}${basis.ort ? " · " + basis.ort : ""}. Bitte in der App zu- oder absagen.`, ereignis: "termin_neu" });
    toast(`📅 ${gesp.length} Termin(e) angelegt · ${an.length} benachrichtigt (${s.push} Push, ${s.mail} Mail)`, 4000);
  } else toast(`📅 ${gesp.length} Termin(e) angelegt`);
  A.zeichne();
};
AKTIONEN.tpBearbeiten = (id) => A.oeffne("termine", id);
AKTIONEN.tpNachfassen = async (id) => {
  const t = hole("termine", id), an = eingeladene(db(), t).filter((p) => ["vielleicht", undefined].includes(antwortVon(db(), id, p)?.antwort));
  const s = await senden({ an, betreff: `Bitte antworten: ${t.titel}`, text: `${t.titel} am ${datumKurz(t.beginn)} – bitte kurz in der App zu- oder absagen.`, ereignis: "nachfassen" });
  toast(`⏰ ${an.length} erinnert (${s.push} Push, ${s.mail} Mail)`);
};
AKTIONEN.tpAbsagen = async (id) => {
  const t = hole("termine", id);
  if (!(await frage(`„${t.titel}“ am ${datumKurz(t.beginn)} absagen? Alle Eingeladenen werden benachrichtigt.`))) return;
  await speichere("termine", { ...t, status: "abgesagt" });
  await senden({ an: eingeladene(db(), t), betreff: `Abgesagt: ${t.titel}`, text: `Der Termin „${t.titel}“ am ${datumKurz(t.beginn)} fällt aus.`, ereignis: "termin_geaendert" });
  toast("Termin abgesagt und Eingeladene benachrichtigt"); A.zeichne();
};

// ---------- ✍️ Genehmigungen ----------
function genehmigungAnsicht() {
  const ue = genehmigungsUebersicht(db()), offen = T.gen;
  const karte = (u) => {
    const key = `${u.vorlage?.id}|${u.projekt?.id || ""}`, o = u.ausstehend + u.ueberfaellig;
    return `<section class="vw-bereich"><h3>${esc(u.vorlage?.titel || "")}</h3><div class="hinweis">${u.projekt ? esc(u.projekt.titel) + " · " : ""}${GENEHMIGUNG_ZWECKE[u.vorlage?.zweck] ? esc(GENEHMIGUNG_ZWECKE[u.vorlage.zweck]) + " · " : ""}Frist ${datumKurz(u.frist)}</div>
      <div class="balken" style="margin:8px 0"><i class="ja" style="width:${(u.erteilt / Math.max(1, u.gesamt)) * 100}%"></i><i class="vielleicht" style="width:${(o / Math.max(1, u.gesamt)) * 100}%"></i></div>
      <div class="zaehler"><span class="badge b-gruen">✔ ${u.erteilt}</span><span class="badge b-gelb">⏳ ${u.ausstehend}</span><span class="badge b-rot">⚠ ${u.ueberfaellig + u.abgelehnt}</span></div>
      <div class="vw-knoepfe"><button class="knopf" data-a="genErinnernPc" data-x="${esc(key)}" ${o ? "" : "disabled"}>⏰ ${o} offene Eltern erinnern</button><button class="knopf" data-a="genListe" data-x="${esc(key)}">${offen === key ? "▴ Liste schließen" : "▾ Stand je Kind"}</button></div>
      ${offen === key ? `<ul class="liste">${u.eintraege.map((g) => ({ g, st: genehmigungStatus(g) })).sort((a, b) => a.st.localeCompare(b.st)).map(({ g, st }) => `<li><div class="fl">${esc(A.pn(g.kind_id))}</div><span class="badge ${{ erteilt: "b-gruen", ausstehend: "b-gelb", ueberfaellig: "b-rot", abgelehnt: "b-rot", widerrufen: "b-grau" }[st] || ""}">${esc(st)}</span>${st === "ausstehend" || st === "ueberfaellig" ? `<button class="knopf klein" data-a="genPapierPc" data-x="${g.id}">📄 Papier da</button>` : ""}</li>`).join("")}</ul>` : ""}</section>`;
  };
  const form = `<div id="genForm" class="vw-raster3 vw-felder"><div class="feld"><label>Vorlage</label><select name="vorlage">${opt(liste("genehmigung_vorlagen"), "", (v) => v.titel)}</select></div>
    <div class="feld"><label>Für (Kinder)</label><select name="verteiler">${verteilerListe(db()).filter((v) => /^(alle|gruppe|register|projekt):?/.test(v.key) && !v.key.startsWith("projekteltern")).map((v) => `<option value="${esc(v.key)}">${esc(v.name)}</option>`).join("")}</select></div>
    <div class="feld"><label>Projekt (optional)</label><select name="projekt"><option value="">–</option>${opt(liste("projekte"), "")}</select></div>
    <div class="feld"><label>Frist</label><input type="date" name="frist" value="${tagIso(new Date(Date.now() + 14 * 86400000))}"></div>
    <div class="feld vw-feld-knopf"><button class="knopf haupt breit" data-a="genAnfordernPc">📨 Anfordern & Eltern benachrichtigen</button></div></div>`;
  return kopf("✍️ Genehmigungen", `<button class="knopf" data-a="vwTabelle" data-x="genehmigung_vorlagen">📝 Vorlagen bearbeiten</button>`, "„Ausstehend“ zählt nie als erteilt. Eltern antworten in der App; Papier-Eingang hier vermerken.")
    + bereich("➕ Genehmigung anfordern", form) + `<div class="vw-raster3 vw-abstand">${ue.map(karte).join("") || '<p class="hinweis">Noch keine Genehmigungen.</p>'}</div>`;
}
const genFinden = (key) => genehmigungsUebersicht(db()).find((x) => `${x.vorlage?.id}|${x.projekt?.id || ""}` === key);
AKTIONEN.genListe = (key) => { T.gen = T.gen === key ? null : key; A.zeichne(); };
AKTIONEN.genPapierPc = async (id) => { await speichere("genehmigungen", { ...hole("genehmigungen", id), status: "erteilt", papier: true, beantwortet_am: new Date().toISOString(), beantwortet_von: A.V.ich.id }); toast("📄 Papier-Eingang vermerkt"); A.zeichne(); };
AKTIONEN.genErinnernPc = async (key) => {
  const u = genFinden(key), an = [...new Set(u.eintraege.filter((g) => g.status === "ausstehend").flatMap((g) => elternVon(db(), g.kind_id)))];
  const s = await senden({ an, betreff: `Bitte bestätigen: ${u.vorlage.titel}`, text: `Es fehlt noch Ihre Zustimmung „${u.vorlage.titel}“. Bitte in der App unter Meins › Genehmigungen.`, ereignis: "genehmigung" });
  toast(`⏰ ${an.length} Eltern erinnert (${s.push} Push, ${s.mail} Mail)`);
};
AKTIONEN.genAnfordernPc = async () => {
  const f = formWerte($("#genForm")), kids = verteilerAufloesen(db(), f.verteiler).filter((k) => hole("personen", k)?.typ === "schueler");
  if (!f.vorlage || !kids.length) return toast("Bitte Vorlage und Empfänger wählen");
  const schon = new Set(liste("genehmigungen", (g) => g.vorlage_id === f.vorlage && (g.projekt_id || "") === (f.projekt || "") && g.status !== "widerrufen").map((g) => g.kind_id));
  const neu = kids.filter((k) => !schon.has(k));
  await speichereViele("genehmigungen", neu.map((k) => ({ vorlage_id: f.vorlage, kind_id: k, projekt_id: f.projekt || null, frist: f.frist, status: "ausstehend" })));
  const an = [...new Set(neu.flatMap((k) => elternVon(db(), k)))];
  await senden({ an, betreff: `Bitte bestätigen: ${hole("genehmigung_vorlagen", f.vorlage)?.titel}`, text: "Bitte in der Bachkreis-App unter Meins › Genehmigungen zustimmen oder ablehnen.", ereignis: "genehmigung" });
  toast(`📨 ${neu.length} angefordert${kids.length - neu.length ? ` (${kids.length - neu.length} hatten schon eine)` : ""}, ${an.length} Eltern benachrichtigt`, 4000); A.zeichne();
};

// ---------- 📣 Rundschreiben ----------
const RS_VORLAGEN = [["Probe fällt aus", "Die Probe am … fällt leider aus. Bitte gebt es weiter."], ["Helfer gesucht", "Für unser Konzert suchen wir Helferinnen und Helfer (Aufbau, Kuchen, Kasse). Bitte in der App melden."], ["Erinnerung Notenrückgabe", "Bitte gebt die ausgeliehenen Noten bis … zurück (Bleistift wegradieren)."]];
function rundschreibenAnsicht() {
  const v = verteilerListe(db()), wahl = T.verteiler || "alle_eltern", n = verteilerAufloesen(db(), wahl).length;
  return kopf("📣 Rundschreiben", "", "Geht über den BK Communicator: Push, E-Mail oder in der App – je nach Einstellung der Empfänger.")
    + `<div class="vw-raster3"><section class="vw-bereich vw-breit2"><h3>Neues Rundschreiben</h3><div id="rsForm">
      <div class="vw-raster3 vw-felder"><div class="feld vw-breit2"><label>An</label><select name="verteiler" data-c="rsVerteiler">${v.map((x) => `<option value="${esc(x.key)}" ${x.key === wahl ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div><div class="feld"><label>Empfänger</label><input value="${n} Personen" disabled></div></div>
      <div class="feld"><label>Betreff</label><input name="betreff" id="rsBetreff"></div><div class="feld"><label>Text</label><textarea name="text" id="rsText" rows="7"></textarea></div>
      <div class="vw-raster3 vw-ja"><label class="vw-schalter"><input type="checkbox" name="wichtig"><span>❗ wichtig (auch in der Ruhezeit)</span></label></div>
      <div class="knopfreihe"><button class="knopf haupt" data-a="rsSenden">📣 Senden</button></div></div></section>
      ${bereich("Vorlagen", `<div class="vw-knoepfe">${RS_VORLAGEN.map(([b], i) => `<button class="knopf" data-a="rsVorlage" data-x="${i}">📝 ${esc(b)}</button>`).join("")}</div><p class="hinweis">Antippen setzt Betreff und Text – danach anpassen.</p>`)}</div>`;
}
AKTIONEN.rsVerteiler = (v) => { T.verteiler = v; A.zeichne(); };
AKTIONEN.rsVorlage = (i) => { const [b, t] = RS_VORLAGEN[Number(i)]; $("#rsBetreff").value = b; $("#rsText").value = t; };
AKTIONEN.rsSenden = async () => {
  const f = formWerte($("#rsForm")), an = verteilerAufloesen(db(), f.verteiler);
  if (!f.betreff || !f.text) return toast("Betreff und Text fehlen");
  if (!(await frage(`Rundschreiben an ${an.length} Personen senden?`))) return;
  const s = await senden({ an, betreff: f.betreff, text: f.text, ereignis: "rundschreiben", wichtig: !!f.wichtig, prioritaet: f.wichtig ? "hoch" : undefined });
  toast(`📣 Gesendet an ${an.length} (${s.push} Push, ${s.mail} Mail, ${s.app || 0} App)`, 4000); A.zeichne();
};

// ---------- 🎭 Projekte & Konzerte ----------
const PG_SYM = { werk: "🎼", pause: "☕", ansage: "🎤", zugabe: "🔁", sonstiges: "•" };
function projektAnsicht() {
  const pr = liste("projekte").sort((a, b) => String(a.von || "").localeCompare(String(b.von || "")));
  const p = hole("projekte", T.projekt) || pr.find((x) => (x.bis || x.von || "") >= tagIso(new Date())) || pr[0];
  if (!p) return kopf("🎭 Projekte & Konzerte") + '<p class="hinweis">Noch keine Projekte.</p>';
  T.projekt = p.id;
  const pg = liste("programm", (x) => x.projekt_id === p.id).sort((a, b) => a.nr - b.nr);
  const dauer = (x) => Number(x.dauer_min) || Number(hole("werke", x.werk_id)?.dauer_min) || 0, summe = pg.reduce((s, x) => s + dauer(x), 0);
  const anm = liste("reise_anmeldungen", (a) => a.projekt_id === p.id && a.status !== "abgemeldet");
  const dienste = liste("dienste", (d) => d.projekt_id === p.id);
  const fz = new Date(); fz.setFullYear(fz.getFullYear() - 5);
  const programm = pg.length ? `<ol class="vw-pg">${pg.map((x, i) => `<li><span>${PG_SYM[x.art] || "•"}</span><div class="fl">${esc(x.werk_id ? `${hole("werke", x.werk_id)?.komponist || ""}: ${hole("werke", x.werk_id)?.titel || ""}` : x.titel || "")}<small>${x.gruppe_id ? esc(hole("gruppen", x.gruppe_id)?.kuerzel || "") + " · " : ""}${dauer(x) ? dauer(x) + " Min." : ""}</small></div>
      <button class="knopf klein" data-a="pgPc" data-x="${x.id}|-1" ${i ? "" : "disabled"}>▲</button><button class="knopf klein" data-a="pgPc" data-x="${x.id}|1" ${i < pg.length - 1 ? "" : "disabled"}>▼</button></li>`).join("")}</ol><p class="hinweis">Gesamt ${summe} Min.</p>` : '<p class="hinweis">Noch kein Programm.</p>';
  const anmeldung = p.anmeldung ? `<p class="hinweis">${anm.filter((a) => a.status === "angemeldet").length}${p.plaetze ? "/" + p.plaetze : ""} angemeldet · ${anm.filter((a) => a.status === "warteliste").length} Warteliste · offen ${geld(anm.filter((a) => a.status === "angemeldet" && !a.bezahlt).reduce((s, a) => s + Number(a.betrag || 0), 0))}</p>
    <ul class="liste vw-kurzliste">${anm.sort((a, b) => a.status.localeCompare(b.status) || A.pn(a.person_id).localeCompare(A.pn(b.person_id))).map((a) => `<li><div class="fl">${esc(A.pn(a.person_id))} ${a.status === "warteliste" ? '<span class="badge b-gelb">Warteliste</span>' : ""}</div>${a.status === "warteliste" ? `<button class="knopf klein" data-a="anmNachruecken" data-x="${a.id}">⤴ nachrücken</button>` : `<button class="knopf klein ${a.bezahlt ? "" : "haupt"}" data-a="anmBezahltPc" data-x="${a.id}">${a.bezahlt ? "💶 ✓" : "💶 bezahlt?"}</button>`}</li>`).join("") || '<li class="hinweis">noch niemand</li>'}</ul>` : '<p class="hinweis">Keine Anmeldung in der App (im Projekt „Anmeldung“ einschalten).</p>';
  const helfer = `<ul class="liste vw-kurzliste">${dienste.map((d) => `<li><div class="fl"><b>${esc(d.aufgabe)}</b> <small>${esc(d.zeit || "")}</small><div class="hinweis">${(d.helfer || []).map((h) => esc(A.pn(h))).join(", ") || "noch niemand"}</div></div><span class="badge ${(d.helfer || []).length >= (d.anzahl || 0) ? "b-gruen" : "b-gelb"}">${(d.helfer || []).length}/${d.anzahl || "?"}</span></li>`).join("") || '<li class="hinweis">noch keine Dienste</li>'}</ul><div class="vw-knoepfe"><button class="knopf" data-a="vwTabelle" data-x="dienste">🙋 Dienste bearbeiten</button><button class="knopf" data-a="dienstAufruf" data-x="${p.id}">📣 Helfer suchen (Eltern)</button></div>`;
  const begleiter = `<ul class="liste vw-kurzliste">${(p.begleiter || []).map((b) => { const x = hole("personen", b); const ok = x?.fz_vorgelegt_am && new Date(x.fz_vorgelegt_am) >= fz; return `<li><div class="fl">${esc(A.pn(b))}</div><span class="badge ${ok ? "b-gruen" : "b-rot"}">${ok ? "FZ ✓" : "FZ fehlt"}</span></li>`; }).join("") || '<li class="hinweis">keine Begleitpersonen</li>'}</ul>`;
  const transport = [...(p.transport_inventar || []).map((i) => hole("inventar", i)), ...(p.transport_ausstattung || []).map((i) => hole("ausstattung", i))].filter(Boolean);
  return kopf("🎭 Projekte & Konzerte", `<select data-c="prWahl">${opt(pr, p.id, (x) => `${x.titel} (${datumKurz(x.von)})`)}</select><button class="knopf" data-a="prBearbeiten" data-x="${p.id}">✏️ Projekt bearbeiten</button>`)
    + `<div class="vw-raster3">
      ${bereich("🎼 Programm", programm + `<div class="vw-knoepfe"><button class="knopf" data-a="vwTabelle" data-x="programm">✏️ Programmpunkte bearbeiten</button><button class="knopf" data-a="gemaPc" data-x="${p.id}">📜 GEMA-Liste (CSV)</button></div>`)}
      ${bereich("🧳 Anmeldungen & Kosten", anmeldung + (anm.length ? `<div class="vw-knoepfe"><button class="knopf" data-a="anmCsv" data-x="${p.id}">📤 Teilnehmerliste (CSV)</button></div>` : ""))}
      ${bereich("📍 Ablauf", `<div class="hinweis">${datumKurz(p.von)} – ${datumKurz(p.bis)} · ${esc(p.ort || "")}</div>${p.treffpunkt ? `<p>📍 <b>Treffpunkt:</b> ${esc(p.treffpunkt)}</p>` : ""}${p.kleiderordnung ? `<p>👔 <b>Kleidung:</b> ${esc(p.kleiderordnung)}</p>` : ""}<h4>🚚 Transport (${transport.length})</h4><ul class="liste vw-kurzliste">${transport.map((z) => `<li><div class="fl"><b>${esc(z.inventar_nr)}</b> ${esc(z.bezeichnung || hole("instrument_typen", z.typ_id)?.name || "")}</div><small>${esc(z.standort || "")}</small></li>`).join("") || '<li class="hinweis">nichts eingetragen</li>'}</ul>`)}
      ${bereich("🙋 Helfer & Dienste", helfer)}
      ${bereich("🛡️ Begleitpersonen", begleiter + `<div class="vw-knoepfe"><button class="knopf" data-a="schutzZu" data-x="projekt:${p.id}">🩺 Notfallliste für die Fahrt</button></div>`)}
      ${bereich("📅 Termine", `<ul class="liste vw-kurzliste">${liste("termine", (t) => t.projekt_id === p.id).sort((a, b) => a.beginn.localeCompare(b.beginn)).map((t) => `<li><div class="fl">${datumKurz(t.beginn)} ${esc(t.titel)}</div><small>✅ ${antwortZaehler(db(), t).ja}</small></li>`).join("") || '<li class="hinweis">keine</li>'}</ul>`)}
    </div>`;
}
AKTIONEN.prWahl = (v) => { T.projekt = v; A.zeichne(); };
AKTIONEN.prBearbeiten = (id) => A.oeffne("projekte", id);
AKTIONEN.pgPc = async (x) => {
  const [id, d] = x.split("|"), z = hole("programm", id), l = liste("programm", (y) => y.projekt_id === z.projekt_id).sort((a, b) => a.nr - b.nr), i = l.findIndex((y) => y.id === id), j = i + Number(d);
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  for (const [k, y] of l.entries()) if (y.nr !== k + 1) await speichere("programm", { ...y, nr: k + 1 });
  A.zeichne();
};
AKTIONEN.gemaPc = (pid) => csv("gema-" + (hole("projekte", pid)?.titel || "konzert").replace(/[^\wäöüÄÖÜß-]+/g, "-"), liste("programm", (x) => x.projekt_id === pid && x.werk_id).sort((a, b) => a.nr - b.nr).map((x, i) => {
  const w = hole("werke", x.werk_id); return { nr: i + 1, komponist: w.komponist, titel: w.titel, bearbeiter: w.bearbeiter || "", verlag: w.verlag || "", dauer_min: x.dauer_min || w.dauer_min || "", gema: w.gema ? "ja" : "nein" };
}));
AKTIONEN.anmBezahltPc = async (id) => { const a = hole("reise_anmeldungen", id); await speichere("reise_anmeldungen", { ...a, bezahlt: !a.bezahlt, bezahlt_am: a.bezahlt ? null : tagIso(new Date()) }); A.zeichne(); };
AKTIONEN.anmNachruecken = async (id) => {
  const a = hole("reise_anmeldungen", id); await speichere("reise_anmeldungen", { ...a, status: "angemeldet" });
  await senden({ an: [a.person_id, ...elternVon(db(), a.person_id)], betreff: `Nachgerückt: ${hole("projekte", a.projekt_id)?.titel}`, text: "Ein Platz ist frei geworden – die Anmeldung ist jetzt bestätigt.", ereignis: "standard" });
  toast("⤴ Nachgerückt und benachrichtigt"); A.zeichne();
};
AKTIONEN.anmCsv = (pid) => csv("teilnehmer", liste("reise_anmeldungen", (a) => a.projekt_id === pid && a.status !== "abgemeldet").map((a) => ({ name: A.pn(a.person_id), status: a.status, betrag: a.betrag ?? "", bezahlt: a.bezahlt ? "ja" : "nein", zimmer: a.zimmer || "", notiz: a.notiz || "" })));
AKTIONEN.dienstAufruf = async (pid) => {
  const offen = liste("dienste", (d) => d.projekt_id === pid && (d.helfer || []).length < (d.anzahl || 0)), p = hole("projekte", pid);
  if (!offen.length) return toast("Alle Dienste sind besetzt 👍");
  const an = verteilerAufloesen(db(), `projekteltern:${pid}`);
  const s = await senden({ an, betreff: `Helfer gesucht: ${p.titel}`, text: `Für „${p.titel}“ fehlen noch: ${offen.map((d) => `${d.aufgabe} (${(d.anzahl || 0) - (d.helfer || []).length})`).join(", ")}. Bitte bei der Leitung melden.`, ereignis: "rundschreiben" });
  toast(`📣 ${an.length} Eltern gefragt (${s.push} Push, ${s.mail} Mail)`);
};

// ---------- 💶 Kasse & Beiträge ----------
function kasseAnsicht() {
  const jahr = new Date().getFullYear(), heute = tagIso(new Date());
  const reisen = liste("reise_anmeldungen", (a) => a.status === "angemeldet" && !a.bezahlt);
  const fv = liste("fv_mitglieder", (m) => !m.austritt && m.beitrag_art !== "ehren" && (!m.bezahlt_bis || m.bezahlt_bis < `${jahr}-12-31`));
  const kaution = liste("ausleihen", (a) => a.status === "aktiv" && a.kaution && a.kaution_status === "offen");
  const gebuehr = liste("ausleihen", (a) => a.status === "aktiv" && a.gebuehr && (!a.gebuehr_bezahlt_bis || a.gebuehr_bezahlt_bis < heute));
  const spenden = liste("spenden", (s) => String(s.datum || "").startsWith(String(jahr)));
  const summe = (l, f) => l.reduce((s, x) => s + Number(f(x) || 0), 0);
  const zeilen = (l, text, knopf) => `<ul class="liste vw-kurzliste">${l.map((x) => `<li><div class="fl">${text(x)}</div>${knopf(x)}</li>`).join("") || '<li class="hinweis">alles erledigt 👍</li>'}</ul>`;
  return kopf("💶 Kasse & Beiträge", `<button class="knopf" data-a="kasseCsv">📤 Offene Posten (CSV)</button>`, "Kein Zahlungsverkehr in der App – hier wird nur vermerkt, was bezahlt ist. Lastschrift/SEPA bewusst nicht eingebaut.")
    + `<div class="vw-kz4"><div class="kennzahl"><b>🧳 ${geld(summe(reisen, (a) => a.betrag))}</b><small>Reisen offen (${reisen.length})</small></div><div class="kennzahl"><b>💛 ${geld(summe(fv, (m) => m.beitrag))}</b><small>FV-Beiträge ${jahr} offen (${fv.length})</small></div>
      <div class="kennzahl"><b>🤝 ${geld(summe(kaution, (a) => a.kaution) + summe(gebuehr, (a) => a.gebuehr))}</b><small>Kaution & Leihgebühr offen</small></div><div class="kennzahl"><b>🎁 ${geld(summe(spenden, (s) => s.betrag))}</b><small>Spenden ${jahr} (${spenden.filter((s) => !s.dank_gesendet).length} ohne Dank)</small></div></div>
    <div class="vw-raster3">
      ${bereich("🧳 Reisen & Freizeiten", zeilen(reisen, (a) => `${esc(A.pn(a.person_id))} <small>${esc(hole("projekte", a.projekt_id)?.titel || "")} · ${geld(a.betrag)}</small>`, (a) => `<button class="knopf klein haupt" data-a="anmBezahltPc" data-x="${a.id}">💶 bezahlt</button>`))}
      ${bereich("💛 Förderverein-Beiträge " + jahr, zeilen(fv, (m) => `${esc(A.pn(m.person_id))} <small>${geld(m.beitrag)} · bis ${m.bezahlt_bis ? datumKurz(m.bezahlt_bis) : "–"}</small>`, (m) => `<button class="knopf klein haupt" data-a="fvBezahlt" data-x="${m.id}">💶 ${jahr} bezahlt</button>`))}
      ${bereich("🤝 Kaution & Leihgebühr", zeilen([...kaution.map((a) => ["k", a]), ...gebuehr.map((a) => ["g", a])], ([art, a]) => `${esc(A.pn(a.person_id))} <small>${art === "k" ? `Kaution ${geld(a.kaution)}` : `Leihgebühr ${geld(a.gebuehr)}`} · ${esc((hole("inventar", a.inventar_id) || hole("ausstattung", a.ausstattung_id))?.inventar_nr || "")}</small>`,
        ([art, a]) => `<button class="knopf klein haupt" data-a="leihBezahlt" data-x="${art}|${a.id}">💶 bezahlt</button>`))}
    </div>`;
}
AKTIONEN.fvBezahlt = async (id) => { const m = hole("fv_mitglieder", id); await speichere("fv_mitglieder", { ...m, bezahlt_bis: `${new Date().getFullYear()}-12-31` }); toast("💛 Beitrag vermerkt"); A.zeichne(); };
AKTIONEN.leihBezahlt = async (x) => {
  const [art, id] = x.split("|"), a = hole("ausleihen", id);
  if (art === "k") await speichere("ausleihen", { ...a, kaution_status: "bezahlt" });
  else { const bis = new Date(a.gebuehr_bezahlt_bis && a.gebuehr_bezahlt_bis > tagIso(new Date()) ? a.gebuehr_bezahlt_bis : Date.now()); bis.setFullYear(bis.getFullYear() + 1); await speichere("ausleihen", { ...a, gebuehr_bezahlt_bis: tagIso(bis) }); }
  toast("💶 Vermerkt"); A.zeichne();
};
AKTIONEN.kasseCsv = () => {
  const heute = tagIso(new Date()), jahr = new Date().getFullYear(), z = [];
  for (const a of liste("reise_anmeldungen", (x) => x.status === "angemeldet" && !x.bezahlt)) z.push({ art: "Reise", name: A.pn(a.person_id), zweck: hole("projekte", a.projekt_id)?.titel || "", betrag: a.betrag ?? "" });
  for (const m of liste("fv_mitglieder", (x) => !x.austritt && x.beitrag_art !== "ehren" && (!x.bezahlt_bis || x.bezahlt_bis < `${jahr}-12-31`))) z.push({ art: "FV-Beitrag", name: A.pn(m.person_id), zweck: String(jahr), betrag: m.beitrag ?? "" });
  for (const a of liste("ausleihen", (x) => x.status === "aktiv" && x.kaution && x.kaution_status === "offen")) z.push({ art: "Kaution", name: A.pn(a.person_id), zweck: hole("inventar", a.inventar_id)?.inventar_nr || "", betrag: a.kaution });
  for (const a of liste("ausleihen", (x) => x.status === "aktiv" && x.gebuehr && (!x.gebuehr_bezahlt_bis || x.gebuehr_bezahlt_bis < heute))) z.push({ art: "Leihgebühr", name: A.pn(a.person_id), zweck: hole("inventar", a.inventar_id)?.inventar_nr || "", betrag: a.gebuehr });
  csv("offene-posten", z);
};

// ---------- 🛡️ Notfall- & Foto-Listen ----------
function schutzAnsicht() {
  const wahl = T.schutz || `gruppe:${gruppenSortiert()[0]?.id}`, [art, id] = wahl.split(":");
  const kids = (art === "projekt" ? [...new Set(liste("termine", (t) => t.projekt_id === id).flatMap((t) => (t.gruppen || []).flatMap((g) => gruppenMitglieder(db(), g))))] : gruppenMitglieder(db(), id))
    .map((k) => hole("personen", k)).filter((p) => p?.typ === "schueler").sort((a, b) => A.pn(a.id).localeCompare(A.pn(b.id)));
  const g = (k) => liste("gesundheit", (x) => x.person_id === k)[0];
  const ohne = kids.filter((k) => !g(k.id)).length, alt = kids.filter((k) => g(k.id)?.loeschen_am < tagIso(new Date())).length;
  const FK = { foto_intern: "App", foto_website: "Web", foto_presse: "Presse", foto_social: "Social" };
  return kopf("🛡️ Notfall- & Foto-Listen", `<select data-c="schutzZu">${gruppenSortiert().map((x) => `<option value="gruppe:${x.id}" ${wahl === `gruppe:${x.id}` ? "selected" : ""}>${esc(x.name)}</option>`).join("")}${liste("projekte").map((x) => `<option value="projekt:${x.id}" ${wahl === `projekt:${x.id}` ? "selected" : ""}>🎭 ${esc(x.titel)}</option>`).join("")}</select><button class="knopf" data-a="vwDrucken">🖨️ Drucken</button>`,
      "Vertraulich: nur für Leitung, Lehrkräfte und Begleitpersonen. Ausgedruckte Listen nach der Fahrt vernichten.")
    + `<div class="vw-kz4"><div class="kennzahl"><b>👥 ${kids.length}</b><small>Kinder</small></div><div class="kennzahl"><b>🩺 ${kids.length - ohne}</b><small>mit Gesundheitsangaben</small></div><div class="kennzahl"><b>❔ ${ohne}</b><small>ohne Angaben</small></div><div class="kennzahl"><b>⏳ ${alt}</b><small>Angaben abgelaufen</small></div></div>
    <div class="vw-tabelle-wrap" tabindex="0" role="region" aria-label="Tabelle"><table class="vw-tabelle inv-tabelle vw-umbruch"><thead><tr><th>Kind</th><th>Eltern / Notfall</th><th>Allergien · Medikamente · Hinweise</th><th>Erste Hilfe</th>${FOTO_ZWECKE.map((z) => `<th>📷 ${FK[z]}</th>`).join("")}</tr></thead><tbody>
      ${kids.map((k) => { const x = g(k.id), e = fotoErlaubnis(db(), k.id); return `<tr><td><b>${esc(A.pn(k.id))}</b></td><td>${elternVon(db(), k.id).map((el) => `${esc(A.pn(el))} ${esc(hole("personen", el)?.mobil || "")}`).join("<br>")}${x?.notfall_name ? `<br>🆘 ${esc(x.notfall_name)} ${esc(x.notfall_tel || "")}` : ""}</td>
        <td>${x ? [x.allergien && `⚠️ ${esc(x.allergien)}`, x.medikamente && `💊 ${esc(x.medikamente)}`, x.erkrankungen && `🩺 ${esc(x.erkrankungen)}`, x.ernaehrung && `🍽️ ${esc(x.ernaehrung)}`].filter(Boolean).join("<br>") || "–" : '<span class="hinweis">keine Angaben</span>'}</td>
        <td>${x ? (x.erste_hilfe_ok ? "✅" : "❔") + (x.medikamente_geben_ok ? " 💊✅" : "") : "–"}</td>${FOTO_ZWECKE.map((z) => `<td>${e[z] === "ja" ? "✅" : e[z] === "nein" ? "⛔" : "❔"}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`;
}
AKTIONEN.schutzZu = (v) => { T.schutz = v; A.ansicht("schutzlisten"); };

// ---------- 🚗 Mitfahrbörse ----------
function mitfahrtAnsicht() {
  const bis = new Date(Date.now() + 42 * 86400000);
  const l = liste("termine", (t) => new Date(t.beginn) > new Date() && new Date(t.beginn) < bis && t.status !== "abgesagt").sort((a, b) => a.beginn.localeCompare(b.beginn))
    .map((t) => ({ t, m: liste("mitfahrten", (x) => x.termin_id === t.id) })).filter((x) => x.m.length);
  return kopf("🚗 Mitfahrbörse", "", "Angebote und Gesuche der Familien – gebucht wird in der App. Hier der Überblick für die Planung.")
    + `<div class="vw-raster3">${l.map(({ t, m }) => bereich(`${esc(t.titel)} <small class="hinweis">${datumKurz(t.beginn)}</small>`, `<ul class="liste vw-kurzliste">${m.map((x) => `<li><div class="fl">${x.art === "gesuch" ? "🙋" : "🚗"} <b>${esc(A.pn(x.fahrer_id))}</b> <small>${esc(x.abfahrt || "")}</small><div class="hinweis">${x.art === "gesuch" ? `sucht für ${(x.mitfahrer || []).map((k) => esc(A.pn(k))).join(", ")}${x.zusage_von ? ` · ✅ fährt mit ${esc(A.pn(x.zusage_von))}` : " · offen"}` : `${(x.mitfahrer || []).length}/${x.plaetze} belegt: ${(x.mitfahrer || []).map((k) => esc(A.pn(k))).join(", ") || "–"}`}</div></div></li>`).join("")}</ul>`)).join("") || '<p class="hinweis">In den nächsten 6 Wochen gibt es keine Angebote oder Gesuche.</p>'}</div>`;
}

// ---------- 📜 Teilnahmebescheinigungen ----------
function bescheinigungAnsicht() {
  const gr = T.bgr || gruppenSortiert()[0]?.id, jahr = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const von = new Date(T.bvon || `${jahr}-08-01`), bis = new Date(T.bbis || `${jahr + 1}-07-31`);
  const kids = gruppenMitglieder(db(), gr).map((k) => hole("personen", k)).filter((p) => p?.typ === "schueler").sort((a, b) => A.pn(a.id).localeCompare(A.pn(b.id)));
  const fz = new Map(fehlzeiten(db(), { von, bis, personen: kids.map((k) => k.id) }).map((z) => [z.person_id, z]));
  const k = konfig(), gname = hole("gruppen", gr)?.name || "";
  const auftritte = (pid) => liste("termine", (t) => new Date(t.beginn) >= von && new Date(t.beginn) <= bis && /konzert|auftritt/i.test(hole("terminarten", t.art_id)?.name || t.titel) && ["ja", "spaet"].includes(antwortVon(db(), t.id, pid)?.anwesend)).length;
  return kopf("📜 Teilnahmebescheinigungen", `<select data-c="bFeld" data-x="bgr">${gruppenSortiert().map((g) => `<option value="${g.id}" ${g.id === gr ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>
      <input type="date" data-c="bFeld" data-x="bvon" value="${tagIso(von)}"><input type="date" data-c="bFeld" data-x="bbis" value="${tagIso(bis)}"><button class="knopf haupt" data-a="vwDrucken">🖨️ Alle drucken</button>`, "Für Zeugnisvermerk, Bewerbungen oder die Schule – mit Anwesenheit aus der App.")
    + `<div class="vw-bescheinigungen">${kids.map((p) => { const z = fz.get(p.id); return `<article class="vw-bescheinigung"><header><b>${esc(k.name || "Bachkreis")}</b><small>${esc(k.untertitel || "")}</small></header>
      <h3>Teilnahmebescheinigung</h3><p><b>${esc(A.pn(p.id))}</b>${p.jahrgang ? `, Jahrgangsstufe ${esc(p.jahrgang)}` : ""}, hat im Zeitraum ${datumKurz(von)} bis ${datumKurz(bis)} im <b>${esc(gname)}</b> mitgewirkt${instrumenteVon(db(), p.id)[0] ? ` (Instrument: ${esc(hole("instrument_typen", instrumenteVon(db(), p.id)[0].typ_id)?.name || "")})` : ""}.</p>
      <p>Teilnahme an Proben: ${z ? `${z.ja + z.spaet} von ${z.erfasst} erfassten Terminen (${z.quote} %)` : "nicht erfasst"}${auftritte(p.id) ? ` · Auftritte: ${auftritte(p.id)}` : ""}.</p>
      <footer><span>Bergkamen, ${datumKurz(new Date())}</span><span class="unterschrift">${esc(A.pn(A.V.ich.id))}, Leitung</span></footer></article>`; }).join("") || '<p class="hinweis">Keine Kinder in dieser Gruppe.</p>'}</div>`;
}
AKTIONEN.bFeld = (_, el) => { T[el.dataset.x] = el.value; A.zeichne(); };

// ---------- 🏖️ Ferien & freie Tage ----------
function ferienAnsicht() {
  const l = liste("termine", (t) => t.fuer_alle && t.teilnahme === "info" && /ferien|frei|keine probe/i.test(t.titel)).sort((a, b) => a.beginn.localeCompare(b.beginn));
  return kopf("🏖️ Ferien & freie Tage", "", "Schulferien und probenfreie Tage als Info-Termin für alle – erscheinen in App, Kalender-Abo und Kalenderdatei.")
    + `<div class="vw-raster3">${bereich("➕ Eintragen", `<div id="ferForm"><div class="feld"><label>Bezeichnung</label><input name="titel" placeholder="z. B. Herbstferien – keine Proben"></div><div class="feld"><label>von</label><input type="date" name="von"></div><div class="feld"><label>bis</label><input type="date" name="bis"></div>
        <div class="vw-knoepfe"><button class="knopf haupt" data-a="ferSpeichern">🏖️ Eintragen</button></div><p class="hinweis">Die Termine der Schulferien NRW stehen beim Schulministerium – hier einmal im Jahr eintragen.</p></div>`)}
      <section class="vw-bereich vw-breit2"><h3>Eingetragen</h3><ul class="liste vw-kurzliste">${l.map((t) => `<li><div class="fl"><b>${esc(t.titel)}</b> <small>${datumKurz(t.beginn)}${t.ende ? " – " + datumKurz(t.ende) : ""}</small></div><button class="knopf klein" data-a="ferWeg" data-x="${t.id}">🗑️</button></li>`).join("") || '<li class="hinweis">noch nichts</li>'}</ul></section></div>`;
}
AKTIONEN.ferSpeichern = async () => {
  const f = formWerte($("#ferForm"));
  if (!f.titel || !f.von) return toast("Bezeichnung und Beginn fehlen");
  const art = liste("terminarten").find((a) => /sonst|info/i.test(a.name)) || liste("terminarten")[0];
  await speichere("termine", { titel: f.titel, art_id: art?.id, beginn: new Date(f.von + "T00:00:00").toISOString(), ende: new Date((f.bis || f.von) + "T23:59:00").toISOString(), fuer_alle: true, gruppen: [], teilnahme: "info", status: "geplant", beschreibung: "Keine Proben." });
  toast("🏖️ Eingetragen"); A.zeichne();
};
AKTIONEN.ferWeg = async (id) => { if (await frage("Eintrag löschen?")) { await loesche("termine", id); A.zeichne(); } };

// ---------- 🎻 Übe-Bühne: Aufgaben, Stand je Kind, Rückmeldung (0.26.0) ----------
function uebeAnsicht() {
  const l = liste("uebeaufgaben").sort((a, b) => String(b.bis || "").localeCompare(String(a.bis || "")));
  const a = hole("uebeaufgaben", T.ua) || l[0];
  const sterne = (n) => "⭐".repeat(n || 0) + "☆".repeat(Math.max(0, 3 - (n || 0)));
  const st = a ? uebeStand(db(), a) : [];
  const liste_ = `<ul class="liste vw-kurzliste">${l.map((x) => { const s = uebeStand(db(), x); return `<li class="${x.id === a?.id ? "an" : ""}"><button type="button" class="vw-link" data-a="ueWahl" data-x="${x.id}"><b>${esc(x.titel)}</b><small>${esc(UEBE_ARTEN[x.art || "frei"] || "")}${x.bis ? ` · bis ${datumKurz(x.bis)}` : ""} · ✅ ${s.filter((y) => y.ziel).length}/${s.length}</small></button></li>`; }).join("") || '<li class="hinweis">Noch keine Aufgaben</li>'}</ul>
    <div class="vw-knoepfe"><button class="knopf" data-a="vwTabelle" data-x="uebeaufgaben">📝 Aufgaben bearbeiten</button><button class="knopf" data-a="vwTabelle" data-x="uebe_ergebnisse">⭐ Alle Ergebnisse</button></div>
    <p class="hinweis">Rhythmus-Baukasten und Vorspiel-Aufnahme gibt es in der App unter Bühne › Üben › „＋ Übe-Aufgabe geben“.</p>`;
  const tabelle = a ? `<div class="vw-tabelle-wrap" tabindex="0" role="region" aria-label="Stand je Kind"><table class="vw-tabelle"><thead><tr><th>Kind</th><th>Stand</th><th>geübt</th><th>beste</th><th>Tempo</th><th>Rückmeldung</th><th></th></tr></thead><tbody>${st.map((s) => `<tr>
      <td>${esc(A.pn(s.pid))}</td><td>${s.ziel ? '<span class="badge b-gruen">✅ Ziel</span>' : s.anzahl ? '<span class="badge b-gelb">🟡 geübt</span>' : '<span class="badge">⚪ offen</span>'}</td>
      <td>${s.anzahl || "–"}</td><td>${s.anzahl ? sterne(s.sterne) : "–"}</td><td>${s.tempo ? `♩ ${s.tempo}` : "–"}</td>
      <td><input data-ue-rm="${esc(s.pid)}" value="${esc(s.rueckmeldung?.rueckmeldung || "")}" placeholder="z. B. Super geübt!" aria-label="Rückmeldung für ${esc(A.pn(s.pid))}"></td>
      <td class="vw-aktionen"><button class="knopf klein" data-a="ueRmSpeichern" data-x="${esc(s.pid)}" title="Rückmeldung speichern" aria-label="Rückmeldung speichern">💾</button></td></tr>`).join("") || '<tr><td colspan="7" class="hinweis">Diese Aufgabe gilt für niemanden.</td></tr>'}</tbody></table></div>
    <div class="vw-knoepfe"><button class="knopf" data-a="ueCsv">⬇️ CSV</button></div>` : '<p class="hinweis">Links eine Aufgabe wählen.</p>';
  return kopf("🎻 Übe-Bühne", "", "Aufgaben der Lehrkräfte und der Stand je Kind (nur Zahlen: Sterne, Tempo, wie oft geübt). Rückmeldungen sehen das Kind und seine Eltern.")
    + `<div class="vw-raster3">${bereich("📝 Aufgaben", liste_)}${bereich(a ? `📊 ${esc(a.titel)}` : "📊 Stand", tabelle, "vw-breit2")}</div>`;
}
AKTIONEN.ueWahl = (id) => { T.ua = id; A.zeichne(); };
AKTIONEN.ueRmSpeichern = async (pid) => {
  const a = hole("uebeaufgaben", T.ua) || liste("uebeaufgaben").sort((x, y) => String(y.bis || "").localeCompare(String(x.bis || "")))[0];
  const text = document.querySelector(`[data-ue-rm="${CSS.escape(pid)}"]`)?.value.trim();
  if (!a || !text) return toast("Bitte eine Rückmeldung schreiben");
  const e = uebeStand(db(), a).find((s) => s.pid === pid)?.letzte;
  await speichere("uebe_ergebnisse", e ? { ...e, rueckmeldung: text, rueckmeldung_von: A.V.ich.id } : { person_id: pid, aufgabe_id: a.id, modus: null, datum: tagIso(new Date()), rueckmeldung: text, rueckmeldung_von: A.V.ich.id });
  await senden({ an: [pid], betreff: `💬 Rückmeldung zu „${a.titel}“`, text, ereignis: "standard" });
  toast("💬 Gespeichert"); A.zeichne();
};
AKTIONEN.ueCsv = () => {
  const a = hole("uebeaufgaben", T.ua) || liste("uebeaufgaben")[0]; if (!a) return;
  csv(`uebebuehne-${a.titel.replace(/[^\wäöüÄÖÜß-]+/g, "_")}`, uebeStand(db(), a).map((s) => ({ Kind: A.pn(s.pid), Ziel: s.ziel ? "ja" : "nein", Uebungen: s.anzahl, Sterne: s.sterne, Tempo: s.tempo || "", Rueckmeldung: s.rueckmeldung?.rueckmeldung || "" })));
};

// ---------- Anmelden der Ansichten ----------
const db = () => A.db;
export const WERKZEUG_ANSICHTEN = { termineplanen: terminAnsicht, genehmigungen: genehmigungAnsicht, rundschreiben: rundschreibenAnsicht, projekteplanen: projektAnsicht, kasse: kasseAnsicht, schutzlisten: schutzAnsicht, mitfahrboerse: mitfahrtAnsicht, bescheinigung: bescheinigungAnsicht, ferien: ferienAnsicht, uebebuehne: uebeAnsicht };
