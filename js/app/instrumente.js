// Instrumente: Inventar, Verleih (Ausgabe/Rückgabe mit Zustand), Reparatur (Meldung → Kostenvoranschlag → Freigabe →
// Werkstatt → erledigt), Einkauf, Förderverein (Spenden & Freigaben), „Mein Leihinstrument“. Vorbild: KC Club Leihmodul.
import { S, VIEWS, db, zeige, kopf, name, vorname, istLeitung, istVorstand, istVerwalter, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, geld, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { aktiveAusleihe, ausleihenVon, kinderVon, tagIso, elternVon } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

const STATUS = { verfuegbar: ["b-gruen", "verfügbar"], verliehen: ["b-blau", "verliehen"], reparatur: ["b-gelb", "in Reparatur"], ausgemustert: ["b-grau", "ausgemustert"] };
const REP = { gemeldet: ["b-rot", "gemeldet"], angebot: ["b-gelb", "Kostenvoranschlag"], freigegeben: ["b-blau", "freigegeben"], in_arbeit: ["b-blau", "in der Werkstatt"], erledigt: ["b-gruen", "erledigt"], abgelehnt: ["b-grau", "abgelehnt"] };
const typName = (id) => hole("instrument_typen", id)?.name || "Instrument";
const darfFreigeben = (betrag) => istVorstand() || (istLeitung() && Number(betrag || 0) <= Number(konfig().freigabe_grenze_eur || 0));

VIEWS.instrumente = {
  render(p) {
    const filter = p.filter || "alle";
    const heute = tagIso(new Date());
    let inv = liste("inventar", (i) => i.status !== "ausgemustert");
    if (filter === "verfuegbar") inv = inv.filter((i) => i.status === "verfuegbar");
    if (filter === "verliehen") inv = inv.filter((i) => i.status === "verliehen");
    if (filter === "reparatur") inv = inv.filter((i) => i.status === "reparatur");
    if (filter === "wartung") inv = inv.filter((i) => i.wartung_faellig && i.wartung_faellig <= tagIso(new Date(Date.now() + 30 * 86400000)));
    const n = (f) => liste("inventar", f).length;
    const reps = liste("reparaturen", (r) => !["erledigt", "abgelehnt"].includes(r.status));
    return kopf("🎻 Instrumente") + `<div class="kennzahlen"><div class="kennzahl"><b>${n((i) => i.status !== "ausgemustert")}</b><small>im Inventar</small></div><div class="kennzahl"><b>${n((i) => i.status === "verliehen")}</b><small>verliehen</small></div><div class="kennzahl"><b>${n((i) => i.status === "verfuegbar")}</b><small>verfügbar</small></div><div class="kennzahl"><b>${reps.length}</b><small>Reparaturen offen</small></div></div>
      ${reps.length ? `<div class="karte"><h3>🔧 Reparaturen</h3><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl"><div class="zeile-titel">${esc(hole("inventar", r.inventar_id)?.bezeichnung)}</div><div class="zeile-unter">${esc(r.meldung)}</div></div><span class="badge ${REP[r.status][0]}">${REP[r.status][1]}</span></li>`).join("")}</ul></div>` : ""}
      <div class="umschalter">${[["alle", "Alle"], ["verfuegbar", "frei"], ["verliehen", "verliehen"], ["reparatur", "Reparatur"], ["wartung", "Wartung"]].map(([k, t]) => `<button class="${filter === k ? "an" : ""}" data-a="invFilter" data-x="${k}">${t}</button>`).join("")}</div>
      <div class="karte"><ul class="liste">${inv.sort((a, b) => a.inventar_nr.localeCompare(b.inventar_nr)).map((i) => {
        const a = aktiveAusleihe(db, i.id);
        const wart = i.wartung_faellig && i.wartung_faellig < heute;
        return `<li class="klick" data-a="oeffne" data-x="instrument|${i.id}"><div class="fl"><div class="zeile-titel">${esc(i.inventar_nr)} · ${esc(typName(i.typ_id))} ${esc(i.groesse || "")}</div><div class="zeile-unter">${esc(i.bezeichnung || "")}${a ? " · bei " + esc(name(a.person_id)) + " bis " + datumKurz(a.bis) : ""}${wart ? " · 🧰 Wartung überfällig" : ""}</div></div><span class="badge ${STATUS[i.status][0]}">${STATUS[i.status][1]}</span></li>`;
      }).join("") || '<li class="leer">Keine Instrumente</li>'}</ul></div>
      <p class="hinweis">Neue Instrumente, Inventarnummern und Werte werden in der PC-Verwaltung gepflegt.</p>`;
  },
};
AKTIONEN.invFilter = (f) => zeige("instrumente", { filter: f }, { ersetzen: true });

VIEWS.instrument = {
  render({ id }) {
    const i = hole("inventar", id);
    if (!i) return kopf("Instrument") + '<div class="leer">Nicht gefunden.</div>';
    const a = aktiveAusleihe(db, id);
    const hist = liste("ausleihen", (x) => x.inventar_id === id).sort((x, y) => (y.von || "").localeCompare(x.von || ""));
    const reps = liste("reparaturen", (r) => r.inventar_id === id);
    let html = kopf(`${esc(i.inventar_nr)} ${esc(typName(i.typ_id))}`) + `<div class="karte"><div class="zeile-titel">${esc(i.bezeichnung || "")} ${esc(i.groesse || "")}</div>
      <div><span class="badge ${STATUS[i.status][0]}">${STATUS[i.status][1]}</span> <span class="badge">Zustand: ${esc(i.zustand || "?")}</span></div>
      <div class="hinweis">Standort: ${esc(i.standort || "–")} · Wert ${geld(i.wert)} · Wartung fällig ${datumKurz(i.wartung_faellig)}${i.finanziert_von ? " · finanziert von " + esc(i.finanziert_von) : ""}</div></div>`;
    if (istVerwalter()) {
      html += `<div class="karte"><h3>Verleih</h3>${a ? `<p>Ausgeliehen an <b class="klick" data-a="oeffne" data-x="person|${a.person_id}">${esc(name(a.person_id))}</b> seit ${datumKurz(a.von)}, Rückgabe bis <b>${datumKurz(a.bis)}</b></p><div class="knopfreihe"><button class="knopf" data-a="rueckgabe" data-x="${a.id}">↩️ Rückgabe erfassen</button><button class="knopf" data-a="rueckgabeErinnern" data-x="${a.id}">⏰ Erinnern</button></div>`
        : i.status === "verfuegbar" ? `<button class="knopf haupt" data-a="ausgabeForm" data-x="${id}">🤝 Ausleihen an …</button>` : '<p class="hinweis">Zurzeit nicht verleihbar.</p>'}
        ${hist.length ? `<h4>Verlauf</h4><ul class="liste">${hist.map((x) => `<li><div class="fl">${esc(name(x.person_id))} <span class="hinweis">${datumKurz(x.von)} – ${x.status === "zurueck" ? datumKurz(x.bis) : "heute"}</span></div></li>`).join("")}</ul>` : ""}</div>`;
    }
    html += `<div class="karte"><h3>Reparatur & Wartung</h3><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl">${esc(r.meldung)} <span class="hinweis">${datumKurz(r.gemeldet_am)}</span></div><span class="badge ${REP[r.status][0]}">${REP[r.status][1]}</span></li>`).join("") || "<li class='hinweis'>keine</li>"}</ul><button class="knopf" data-a="schadenForm" data-x="${id}">🩹 Schaden melden</button></div>`;
    return html;
  },
};
AKTIONEN.ausgabeForm = (id) => {
  const i = hole("inventar", id);
  const kandidaten = liste("person_instrument", (x) => x.typ_id === i.typ_id && !x.eigenes).map((x) => x.person_id).filter((p) => !ausleihenVon(db, p).length);
  const andere = liste("personen", (p) => p.typ === "schueler" && !kandidaten.includes(p.id)).sort((a, b) => name(a).localeCompare(name(b)));
  blatt("Instrument ausleihen", `<div id="ausForm"><div class="feld"><label>An</label><select name="person">${kandidaten.length ? `<optgroup label="Spielt ${esc(typName(i.typ_id))}, ohne eigenes">${kandidaten.map((p) => `<option value="${p}">${esc(name(p))}</option>`).join("")}</optgroup>` : ""}<optgroup label="Alle Schüler">${andere.map((p) => `<option value="${p.id}">${esc(name(p))}</option>`).join("")}</optgroup></select></div>
    <div class="feld"><label>Rückgabe bis</label><input type="date" name="bis" value="${tagIso(new Date(Date.now() + 365 * 86400000))}"></div>
    <div class="feld"><label>Zustand bei Ausgabe</label><input name="zustand" value="gut, mit Kasten"></div>
    <label class="schalter"><span>Leihvertrag zur Zustimmung an die Eltern senden</span><input type="checkbox" name="vertrag" checked></label>
    <button class="knopf haupt breit" data-a="ausgabeSpeichern" data-x="${id}">🤝 Ausgeben</button></div>`);
};
AKTIONEN.ausgabeSpeichern = async (id) => {
  const f = formWerte(document.getElementById("ausForm"));
  await speichere("ausleihen", { inventar_id: id, person_id: f.person, von: tagIso(new Date()), bis: f.bis, status: "aktiv", zustand_ausgabe: f.zustand });
  await speichere("inventar", { ...hole("inventar", id), status: "verliehen" });
  if (f.vertrag) {
    const v = liste("genehmigung_vorlagen", (x) => /leih/i.test(x.titel))[0];
    if (v) await speichere("genehmigungen", { vorlage_id: v.id, kind_id: f.person, status: "ausstehend", frist: tagIso(new Date(Date.now() + 14 * 86400000)) });
    await senden({ an: elternVon(db, f.person), betreff: "Leihvertrag bitte bestätigen", text: `${vorname(f.person)} hat ein Leihinstrument erhalten. Bitte den Leihvertrag in der App bestätigen.`, ereignis: "genehmigung" });
  }
  blattZu(); toast("🤝 Ausgeliehen" + (f.vertrag ? " – Leihvertrag an Eltern gesendet" : ""));
  zeige("instrument", { id }, { ersetzen: true });
};
AKTIONEN.rueckgabe = async (aid) => {
  const zustand = prompt("Zustand bei Rückgabe:", "gut");
  if (zustand == null) return;
  const a = hole("ausleihen", aid);
  await speichere("ausleihen", { ...a, status: "zurueck", bis: tagIso(new Date()), zustand_rueckgabe: zustand });
  await speichere("inventar", { ...hole("inventar", a.inventar_id), status: "verfuegbar" });
  toast("↩️ Rückgabe erfasst");
  zeige("instrument", { id: a.inventar_id }, { ersetzen: true });
};
AKTIONEN.rueckgabeErinnern = async (aid) => {
  const a = hole("ausleihen", aid);
  await senden({ an: [a.person_id, ...elternVon(db, a.person_id)], betreff: "Leihinstrument: Rückgabe", text: `Bitte das Leihinstrument (${hole("inventar", a.inventar_id)?.bezeichnung}) bis ${datumKurz(a.bis)} zurückgeben.`, ereignis: "instrument" });
  toast("⏰ Erinnerung gesendet (simuliert)");
};
AKTIONEN.schadenForm = (id) => blatt("Schaden melden", `<div id="schForm"><div class="feld"><label>Was ist passiert?</label><textarea name="meldung" placeholder="z. B. Saite gerissen, Riss im Lack …"></textarea></div><button class="knopf haupt breit" data-a="schadenSpeichern" data-x="${id}">🩹 Melden</button></div>`);
AKTIONEN.schadenSpeichern = async (id) => {
  const f = formWerte(document.getElementById("schForm"));
  if (!f.meldung.trim()) return;
  await speichere("reparaturen", { inventar_id: id, meldung: f.meldung, status: "gemeldet", gemeldet_von: S.ich.id, gemeldet_am: tagIso(new Date()) });
  await senden({ an: [konfig().leitung_id, ...liste("personen", (p) => (p.rollen || []).includes("instrumentenwart")).map((p) => p.id)], betreff: "Schaden gemeldet", text: `${name(S.ich)}: ${f.meldung}`, ereignis: "instrument" });
  blattZu(); toast("🩹 Schaden gemeldet – die Leitung ist informiert");
  zeige(S.view, S.params, { ersetzen: true });
};

VIEWS.reparatur = {
  render({ id }) {
    const r = hole("reparaturen", id);
    if (!r) return kopf("Reparatur") + '<div class="leer">Nicht gefunden.</div>';
    const i = hole("inventar", r.inventar_id);
    const grenze = Number(konfig().freigabe_grenze_eur || 0);
    const schritte = ["gemeldet", "angebot", "freigegeben", "in_arbeit", "erledigt"];
    const pos = schritte.indexOf(r.status);
    let aktion = "";
    if (istVerwalter()) {
      if (r.status === "gemeldet") aktion = `<div id="kvForm"><div class="feld"><label>Werkstatt</label><select name="werkstatt">${liste("personen", (p) => p.typ === "dienstleister").map((p) => `<option value="${p.id}">${esc(p.firma || name(p))}</option>`).join("")}</select></div><div class="feld"><label>Kostenvoranschlag (€)</label><input type="number" name="kosten"></div><button class="knopf haupt" data-a="kvSpeichern" data-x="${id}">Kostenvoranschlag erfassen</button></div>`;
      if (r.status === "angebot") aktion = darfFreigeben(r.kosten) ? `<div class="knopfreihe"><button class="knopf gruen" data-a="repStatus" data-x="${id}|freigegeben">✅ Freigeben (${geld(r.kosten)})</button><button class="knopf rot" data-a="repStatus" data-x="${id}|abgelehnt">Ablehnen</button></div>` : `<p class="badge b-gelb">Über ${geld(grenze)} – Freigabe durch den Förderverein-Vorstand</p><button class="knopf" data-a="repAnFv" data-x="${id}">📨 Vorstand um Freigabe bitten</button>`;
      if (r.status === "freigegeben") aktion = `<button class="knopf haupt" data-a="repStatus" data-x="${id}|in_arbeit">🚚 In die Werkstatt gebracht</button>`;
      if (r.status === "in_arbeit") aktion = `<button class="knopf haupt" data-a="repStatus" data-x="${id}|erledigt">✅ Zurück & erledigt</button>`;
    }
    return kopf("🔧 Reparatur") + `<div class="karte"><div class="zeile-titel klick" data-a="oeffne" data-x="instrument|${i.id}">${esc(i.inventar_nr)} ${esc(i.bezeichnung)} ›</div><p>${esc(r.meldung)}</p>
      <div class="hinweis">gemeldet ${datumKurz(r.gemeldet_am)} von ${esc(name(r.gemeldet_von))}${r.werkstatt_id ? " · Werkstatt: " + esc(hole("personen", r.werkstatt_id)?.firma || "") : ""}${r.kosten ? " · Kosten " + geld(r.kosten) : ""}${r.freigegeben_von ? " · freigegeben von " + esc(name(r.freigegeben_von)) : ""}</div>
      <div class="zaehler">${schritte.map((s, k) => `<span class="badge ${k < pos ? "b-gruen" : k === pos ? REP[s][0] : "b-grau"}">${k + 1}. ${REP[s][1]}</span>`).join("")}${r.status === "abgelehnt" ? '<span class="badge b-grau">abgelehnt</span>' : ""}</div></div>
      ${aktion ? `<div class="karte">${aktion}</div>` : ""}`;
  },
};
AKTIONEN.kvSpeichern = async (id) => {
  const f = formWerte(document.getElementById("kvForm"));
  await speichere("reparaturen", { ...hole("reparaturen", id), werkstatt_id: f.werkstatt, kosten: Number(f.kosten || 0), status: "angebot" });
  zeige("reparatur", { id }, { ersetzen: true });
};
AKTIONEN.repStatus = async (x) => {
  const [id, st] = x.split("|");
  const r = hole("reparaturen", id);
  await speichere("reparaturen", { ...r, status: st, ...(st === "freigegeben" ? { freigegeben_von: S.ich.id } : {}) });
  if (st === "erledigt" || st === "abgelehnt") await speichere("inventar", { ...hole("inventar", r.inventar_id), status: "verfuegbar" });
  if (st === "in_arbeit") await speichere("inventar", { ...hole("inventar", r.inventar_id), status: "reparatur" });
  toast("Status: " + REP[st][1]);
  zeige("reparatur", { id }, { ersetzen: true });
};
AKTIONEN.repAnFv = async (id) => {
  const r = hole("reparaturen", id);
  await senden({ an: liste("personen", (p) => (p.rollen || []).includes("vorstand")).map((p) => p.id), betreff: "Freigabe Reparatur", text: `Bitte Reparatur freigeben: ${hole("inventar", r.inventar_id)?.bezeichnung}, ${geld(r.kosten)}`, ereignis: "instrument" });
  toast("📨 Vorstand informiert (simuliert)");
};

// ---------- Förderverein: Einkauf & Spenden ----------
const EK = { bedarf: "Bedarf", angebote: "Angebote", freigegeben: "freigegeben", bestellt: "bestellt", geliefert: "geliefert", inventarisiert: "inventarisiert", abgelehnt: "abgelehnt" };
VIEWS.foerderverein = {
  render() {
    const ek = liste("einkaeufe").sort((a, b) => (b.angelegt_am || "").localeCompare(a.angelegt_am || ""));
    const sp = liste("spenden").sort((a, b) => b.datum.localeCompare(a.datum));
    const reps = liste("reparaturen", (r) => r.status === "angebot");
    const summe = sp.filter((s) => s.datum.startsWith(String(new Date().getFullYear()))).reduce((a, s) => a + Number(s.betrag || 0), 0);
    return kopf("💛 Förderverein") + `<div class="kennzahlen"><div class="kennzahl"><b>${geld(summe)}</b><small>Spenden ${new Date().getFullYear()}</small></div><div class="kennzahl"><b>${ek.filter((e) => !["inventarisiert", "abgelehnt"].includes(e.status)).length}</b><small>Einkäufe offen</small></div><div class="kennzahl"><b>${reps.length}</b><small>Reparaturen zur Freigabe</small></div></div>
      ${reps.length ? `<div class="karte"><h3>🔧 Freigaben Reparatur</h3><ul class="liste">${reps.map((r) => `<li class="klick" data-a="oeffne" data-x="reparatur|${r.id}"><div class="fl">${esc(hole("inventar", r.inventar_id)?.bezeichnung)} – ${esc(r.meldung)}</div><b>${geld(r.kosten)}</b></li>`).join("")}</ul></div>` : ""}
      <div class="karte"><h3>🛒 Einkauf / Beschaffung</h3><ul class="liste">${ek.map((e) => `<li class="klick" data-a="oeffne" data-x="einkauf|${e.id}"><div class="fl"><div class="zeile-titel">${esc(e.titel)}</div><div class="zeile-unter">${geld(e.betrag)} · ${esc(e.finanzierung || "")}</div></div><span class="badge">${EK[e.status]}</span></li>`).join("")}</ul><button class="knopf" data-a="einkaufNeu">＋ Bedarf melden</button></div>
      <div class="karte"><h3>💛 Spenden & Unterstützer</h3><ul class="liste">${sp.map((s) => `<li><div class="fl"><div class="zeile-titel">${esc(hole("personen", s.person_id)?.firma || name(s.person_id))}</div><div class="zeile-unter">${datumKurz(s.datum)} · ${s.betrag ? geld(s.betrag) : esc(s.sachspende || "")} · ${esc(s.zweck || "")}</div></div>${s.dank_gesendet ? '<span class="badge b-gruen">Dank ✔</span>' : `<button class="knopf klein" data-a="dankSenden" data-x="${s.id}">💌 Danken</button>`}</li>`).join("")}</ul>
      <p class="hinweis">Zuwendungsbestätigungen stellt der Förderverein aus – die App liefert nur die Liste. Keine Buchhaltung in der App.</p></div>`;
  },
};
VIEWS.einkauf = {
  render({ id }) {
    const e = hole("einkaeufe", id);
    if (!e) return kopf("Einkauf") + '<div class="leer">Nicht gefunden.</div>';
    const folge = { bedarf: "angebote", angebote: "freigegeben", freigegeben: "bestellt", bestellt: "geliefert", geliefert: "inventarisiert" };
    const naechst = folge[e.status];
    const darf = naechst !== "freigegeben" || darfFreigeben(e.betrag);
    return kopf("🛒 " + esc(e.titel)) + `<div class="karte"><p>${esc(e.begruendung || "")}</p><div class="hinweis">${geld(e.betrag)} · ${esc(e.finanzierung || "")}${e.haendler_id ? " · " + esc(hole("personen", e.haendler_id)?.firma || "") : ""}</div>
      <div class="zaehler">${Object.entries(EK).filter(([k]) => k !== "abgelehnt").map(([k, t]) => `<span class="badge ${k === e.status ? "b-blau" : ""}">${t}</span>`).join("")}</div>
      ${naechst && istVerwalter() ? `<div class="knopfreihe">${darf ? `<button class="knopf haupt" data-a="ekWeiter" data-x="${id}|${naechst}">➡️ ${EK[naechst]}</button>` : '<span class="badge b-gelb">Freigabe durch Förderverein-Vorstand</span>'}<button class="knopf rot" data-a="ekWeiter" data-x="${id}|abgelehnt">Ablehnen</button></div>` : ""}
      ${naechst === "inventarisiert" ? '<p class="hinweis">Beim Inventarisieren wird automatisch ein Inventar-Eintrag angelegt.</p>' : ""}</div>`;
  },
};
AKTIONEN.ekWeiter = async (x) => {
  const [id, st] = x.split("|");
  const e = hole("einkaeufe", id);
  await speichere("einkaeufe", { ...e, status: st });
  if (st === "inventarisiert") {
    const nr = `BK-${String(liste("inventar").length + 1).padStart(3, "0")}`;
    await speichere("inventar", { inventar_nr: nr, typ_id: liste("instrument_typen")[0].id, bezeichnung: e.titel, status: "verfuegbar", zustand: "sehr_gut", wert: e.betrag, anschaffung: tagIso(new Date()), finanziert_von: e.finanzierung, standort: "Instrumentenraum" });
    toast(`🏷️ Als ${nr} inventarisiert – Typ bitte in der PC-Verwaltung prüfen`);
  }
  zeige("einkauf", { id }, { ersetzen: true });
};
AKTIONEN.einkaufNeu = () => blatt("Bedarf melden", `<div id="ekForm"><div class="feld"><label>Was wird gebraucht?</label><input name="titel"></div><div class="feld"><label>Begründung</label><textarea name="begruendung"></textarea></div><div class="feld"><label>geschätzter Betrag (€)</label><input type="number" name="betrag"></div><button class="knopf haupt breit" data-a="einkaufSpeichern">Speichern</button></div>`);
AKTIONEN.einkaufSpeichern = async () => {
  const f = formWerte(document.getElementById("ekForm"));
  if (!f.titel) return;
  await speichere("einkaeufe", { titel: f.titel, begruendung: f.begruendung, betrag: Number(f.betrag || 0), status: "bedarf", finanzierung: "foerderverein", angelegt_am: tagIso(new Date()) });
  blattZu(); zeige("foerderverein", {}, { ersetzen: true });
};
AKTIONEN.dankSenden = async (id) => {
  const s = hole("spenden", id);
  await senden({ an: [s.person_id], betreff: "Herzlichen Dank!", text: `Vielen Dank für Ihre Unterstützung (${s.zweck || "Bachkreis"})!`, ereignis: "rundschreiben", kanaele: ["mail"] });
  await speichere("spenden", { ...s, dank_gesendet: true });
  toast("💌 Dank gesendet (simuliert)");
  zeige("foerderverein", {}, { ersetzen: true });
};

// ---------- Mein Leihinstrument ----------
VIEWS.meininstrument = {
  render() {
    const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
    const al = ids.flatMap((p) => ausleihenVon(db, p));
    return kopf(istEltern() ? "🎻 Leihinstrumente" : "🎻 Mein Leihinstrument") + (al.map((a) => {
      const i = hole("inventar", a.inventar_id);
      const faellig = a.bis && a.bis < tagIso(new Date());
      return `<div class="karte"><div class="zeile-titel">${esc(typName(i.typ_id))} ${esc(i.groesse || "")} – ${esc(i.inventar_nr)}</div><div>${esc(i.bezeichnung || "")}</div>${istEltern() ? `<div class="hinweis">für ${esc(vorname(a.person_id))}</div>` : ""}
        <p>Ausgeliehen seit ${datumKurz(a.von)} · Rückgabe bis <b class="${faellig ? "b-rot badge" : ""}">${datumKurz(a.bis)}</b></p><button class="knopf" data-a="schadenForm" data-x="${i.id}">🩹 Schaden melden</button></div>`;
    }).join("") || '<div class="leer">Kein Leihinstrument. Wenn du eins brauchst, sprich die Leitung an.</div>');
  },
};
