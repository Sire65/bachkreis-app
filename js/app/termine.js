// Termine: Liste/Kalender, Zu-/Absage (auch Eltern für ihre Kinder), Besetzungsampel, Nachfassen, Serientermine,
// Abwesenheit (Zeitraum auf einmal absagen), Kalender-Export (.ics). Vorbild: KC Club „treffen“/„teilnahme“.
import { S, VIEWS, db, zeige, zurueck, kopf, name, vorname, istLehrkraft, istLeitung, istEltern } from "./zustand.js";
import { esc, AKTIONEN, datum, datumKurz, uhr, wochentag, monatKurz, MONATE, toast, blatt, blattZu, formWerte, zuLokal, vonLokal, herunterladen, frage } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele, loesche } from "../kern/daten.js";
import { termineFuer, antwortVon, antwortZaehler, besetzung, gesamtAmpel, eingeladene, eingeladen, kinderVon, ics, tagIso, registerVon, instrumenteVon } from "../kern/logik.js";
import { senden, whatsapp } from "../kern/versand.js";

const ANTW = { ja: ["✅", "Zusage"], vielleicht: ["🤔", "Vielleicht"], nein: ["❌", "Absage"] };
const AMPEL_TEXT = { gruen: "Besetzung erfüllt", gelb: "nur mit „Vielleicht“ erfüllt", grau: "unbekannt – Antworten fehlen", rot: "unterbesetzt", neutral: "kein Soll" };
const art = (t) => hole("terminarten", t.art_id) || { sym: "📌", name: "Termin", farbe: "#6b6455" };
const fuerWen = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);

function antwortKnoepfe(t, personId) {
  const a = antwortVon(db, t.id, personId);
  const zu = t.status === "abgesagt";
  return `<div class="antworten">${Object.entries(ANTW).map(([k, [s, n]]) => `<button class="${k} ${a?.antwort === k ? "an" : ""}" ${zu ? "disabled" : ""} data-a="antworten" data-x="${t.id}|${personId}|${k}">${s} ${n}</button>`).join("")}</div>`;
}
function terminKarte(t, { mitAntwort = true } = {}) {
  const a = art(t);
  const z = antwortZaehler(db, t);
  const gr = (t.gruppen || []).map((g) => hole("gruppen", g)).filter(Boolean).map((g) => `<span class="badge" style="background:${esc(g.farbe)}22;color:${esc(g.farbe)}">${esc(g.kuerzel)}</span>`).join("");
  const ampel = istLehrkraft() && t.soll ? gesamtAmpel(besetzung(db, t)) : null;
  let antwort = "";
  if (mitAntwort) {
    for (const p of fuerWen()) if (eingeladen(db, t, p)) antwort += `${istEltern() ? `<div class="zeile-unter" style="margin-top:8px"><b>${esc(vorname(p))}</b></div>` : ""}${antwortKnoepfe(t, p)}`;
  }
  return `<div class="karte termin ${t.status === "abgesagt" ? "abgesagt" : ""}" style="border-left-color:${esc(a.farbe)}">
    <div class="kopf klick" data-a="oeffne" data-x="termin|${t.id}">
      <div class="datum">${wochentag(t.beginn)}<br>${new Date(t.beginn).getDate()}<small>${monatKurz(t.beginn)}</small></div>
      <div class="fl" style="flex:1;min-width:0"><div class="zeile-titel">${a.sym} ${esc(t.titel)}</div>
        <div class="zeile-unter">${uhr(t.beginn)}${t.ende ? "–" + uhr(t.ende) : ""} Uhr · ${esc(t.ort || "")}</div>
        <div>${gr}${t.status === "abgesagt" ? '<span class="badge b-rot">abgesagt</span>' : ""}${ampel ? `<span class="badge"><span class="punkt ${ampel}"></span>${AMPEL_TEXT[ampel]}</span>` : ""}</div></div>
    </div>
    ${istLehrkraft() ? `<div class="zaehler"><span class="badge b-gruen">✅ ${z.ja}</span><span class="badge b-gelb">🤔 ${z.vielleicht}</span><span class="badge b-rot">❌ ${z.nein}</span><span class="badge b-grau">❔ ${z.offen} offen</span></div>` : ""}
    ${antwort}</div>`;
}

VIEWS.termine = {
  render(p) {
    const modus = p.modus || "liste";
    const filter = p.filter || (istLehrkraft() ? "alle" : "meine");
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    let ts;
    if (filter === "meine") ts = [...new Map(fuerWen().flatMap((x) => termineFuer(db, x)).map((t) => [t.id, t])).values()].sort((a, b) => a.beginn.localeCompare(b.beginn));
    else if (filter === "vergangen") ts = liste("termine", (t) => new Date(t.beginn) < heute).sort((a, b) => b.beginn.localeCompare(a.beginn));
    else ts = liste("termine", (t) => new Date(t.ende || t.beginn) >= heute).sort((a, b) => a.beginn.localeCompare(b.beginn));
    const neu = istLehrkraft() ? `<button class="knopf haupt klein" data-a="terminNeu">＋ Neu</button>` : "";
    const filterKn = istLehrkraft() ? `<div class="umschalter">${[["alle", "Alle"], ["meine", "Meine"], ["vergangen", "Vergangen"]].map(([k, n]) => `<button class="${filter === k ? "an" : ""}" data-a="termineFilter" data-x="${k}">${n}</button>`).join("")}</div>` : "";
    const modusKn = `<div class="umschalter">${[["liste", "☰ Liste"], ["kalender", "🗓️ Kalender"]].map(([k, n]) => `<button class="${modus === k ? "an" : ""}" data-a="termineModus" data-x="${k}">${n}</button>`).join("")}</div>`;
    const inhalt = modus === "kalender" ? monatsKalender(ts, p.monat) : ts.length ? ts.map((t) => terminKarte(t)).join("") : `<div class="leer">Keine Termine.</div>`;
    return kopf("📅 Termine", neu) + modusKn + filterKn + inhalt;
  },
};
function monatsKalender(ts, monat) {
  const basis = monat ? new Date(monat + "-01T12:00") : new Date();
  const jahr = basis.getFullYear(), m = basis.getMonth();
  const erster = new Date(jahr, m, 1), start = new Date(erster); start.setDate(1 - ((erster.getDay() + 6) % 7));
  const heute = tagIso(new Date());
  let html = `<div class="knopfreihe"><button class="knopf klein" data-a="monat" data-x="${tagIso(new Date(jahr, m - 1, 1)).slice(0, 7)}">‹</button><b style="flex:1;text-align:center">${MONATE[m]} ${jahr}</b><button class="knopf klein" data-a="monat" data-x="${tagIso(new Date(jahr, m + 1, 1)).slice(0, 7)}">›</button></div><div class="monat">`;
  html += ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<div class="wt">${w}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const tag = tagIso(d);
    const an = ts.filter((t) => tagIso(t.beginn) === tag);
    html += `<div class="tag ${d.getMonth() !== m ? "fremd" : ""} ${tag === heute ? "heute" : ""}" data-a="${an.length ? "oeffne" : "nix"}" data-x="${an.length ? "termin|" + an[0].id : ""}">${d.getDate()}${an.map((t) => `<i style="background:${esc(art(t).farbe)}" title="${esc(t.titel)}"></i>`).join("")}</div>`;
  }
  return html + "</div>";
}
AKTIONEN.nix = () => {};
AKTIONEN.termineFilter = (f) => zeige("termine", { ...S.params, filter: f }, { ersetzen: true });
AKTIONEN.termineModus = (m) => zeige("termine", { ...S.params, modus: m }, { ersetzen: true });
AKTIONEN.monat = (m) => zeige("termine", { ...S.params, monat: m }, { ersetzen: true });

AKTIONEN.antworten = async (x) => {
  const [tid, pid, antwort] = x.split("|");
  const t = hole("termine", tid);
  const alt = antwortVon(db, tid, pid);
  let notiz = alt?.notiz || "";
  if (antwort !== "ja") notiz = prompt(antwort === "nein" ? "Grund (freiwillig):" : "Bemerkung (freiwillig):", notiz) ?? notiz;
  await speichere("antworten", { ...(alt || {}), termin_id: tid, person_id: pid, antwort, notiz, von_person_id: S.ich.id });
  toast(`${ANTW[antwort][0]} ${ANTW[antwort][1]} gespeichert${pid !== S.ich.id ? " für " + vorname(pid) : ""}`);
  if (antwort === "nein" && t?.art_id && hole("terminarten", t.art_id)?.pflicht) toast("ℹ️ Pflichttermin – die Leitung wird informiert.");
  zeige(S.view, S.params, { ersetzen: true });
};

// ---------- Termin-Detail ----------
VIEWS.termin = {
  render({ id }) {
    const t = hole("termine", id);
    if (!t) return kopf("Termin") + `<div class="leer">Termin nicht gefunden.</div>`;
    const a = art(t);
    const projekt = t.projekt_id ? hole("projekte", t.projekt_id) : null;
    const knoepfe = istLehrkraft() ? `<button class="knopf klein" data-a="terminBearbeiten" data-x="${t.id}">✏️</button>` : "";
    let html = kopf(`${a.sym} ${esc(t.titel)}`, knoepfe);
    html += `<div class="karte"><div class="zeile-titel">${datum(t.beginn)}</div><div>${uhr(t.beginn)}${t.ende ? " – " + (tagIso(t.ende) !== tagIso(t.beginn) ? datum(t.ende) + ", " : "") + uhr(t.ende) : ""} Uhr</div>
      <div>📍 ${esc(t.ort || "–")}</div>${projekt ? `<div class="klick" data-a="oeffne" data-x="projekt|${projekt.id}">🎭 ${esc(projekt.titel)} ›</div>` : ""}
      ${t.frist ? `<div class="hinweis">Antwort bis ${datumKurz(t.frist)}</div>` : ""}
      ${t.beschreibung ? `<p>${esc(t.beschreibung).replace(/\n/g, "<br>")}</p>` : ""}
      ${t.status === "abgesagt" ? '<p class="badge b-rot">Dieser Termin ist abgesagt.</p>' : ""}
      <div class="knopfreihe"><button class="knopf klein" data-a="terminIcs" data-x="${t.id}">📆 In meinen Kalender</button><button class="knopf klein" data-a="terminWa" data-x="${t.id}">🟢 Per WhatsApp teilen</button></div></div>`;
    const meine = fuerWen().filter((p) => eingeladen(db, t, p));
    if (meine.length) html += `<div class="karte"><h3>${istEltern() ? "Antwort für meine Kinder" : "Meine Antwort"}</h3>${meine.map((p) => `${istEltern() ? `<b>${esc(vorname(p))}</b>` : ""}${antwortKnoepfe(t, p)}${instrumentWahl(t, p)}`).join("")}</div>`;
    if (istLehrkraft()) {
      const z = antwortZaehler(db, t);
      html += `<div class="karte"><h3>Rückmeldungen (${z.gesamt} eingeladen)</h3><div class="zaehler"><span class="badge b-gruen">✅ ${z.ja}</span><span class="badge b-gelb">🤔 ${z.vielleicht}</span><span class="badge b-rot">❌ ${z.nein}</span><span class="badge b-grau">❔ ${z.offen} offen</span></div>
        <div class="knopfreihe"><button class="knopf klein" data-a="nachfassen" data-x="${t.id}" ${z.offen ? "" : "disabled"}>⏰ ${z.offen} ohne Antwort erinnern</button><button class="knopf klein" data-a="drucken">🖨️ Liste drucken</button>
        ${t.status !== "abgesagt" ? `<button class="knopf klein rot" data-a="terminAbsagen" data-x="${t.id}">Termin absagen</button>` : ""}</div></div>`;
      if (t.soll) html += besetzungHtml(t);
      html += teilnehmerHtml(t);
    }
    return html;
  },
};
function instrumentWahl(t, p) {
  const inst = instrumenteVon(db, p);
  if (inst.length < 2) return "";
  const a = antwortVon(db, t.id, p);
  const aktuell = registerVon(db, p, a);
  return `<div class="feld"><label>Ich spiele bei diesem Termin:</label><select data-c="instrumentWahl" data-x="${t.id}|${p}">${inst.map((i) => { const r = i.register_id || hole("instrument_typen", i.typ_id)?.register_id; return `<option value="${esc(r)}" ${r === aktuell ? "selected" : ""}>${esc(hole("instrument_typen", i.typ_id)?.name)} (${esc(hole("register", r)?.name || "")})</option>`; }).join("")}</select></div>`;
}
AKTIONEN.instrumentWahl = async (wert, el) => {
  const [tid, pid] = el.dataset.x.split("|");
  const alt = antwortVon(db, tid, pid);
  if (!alt) { toast("Bitte zuerst zu- oder absagen."); return; }
  await speichere("antworten", { ...alt, register_id: wert });
  toast("🎻 Instrument für diesen Termin gespeichert");
};
function besetzungHtml(t) {
  const b = besetzung(db, t);
  const ga = gesamtAmpel(b);
  return `<div class="karte"><h3><span class="punkt ${ga}"></span> Besetzungsampel – ${AMPEL_TEXT[ga]}</h3>
    ${b.map((z) => { const s = Math.max(z.soll, z.ja + z.vielleicht + z.offen, 1); return `<div class="ampelzeile"><div><span class="punkt ${z.ampel}"></span><b>${esc(z.register.name)}</b> <span class="hinweis">${z.ja} zu · ${z.vielleicht} vielleicht · ${z.offen} offen${z.soll ? " · Soll " + z.soll : ""}</span></div>
      <div>${z.ampel === "rot" || z.ampel === "grau" ? `<button class="knopf klein" data-a="registerNachricht" data-x="${t.id}|${z.register.id}">📣</button>` : ""}</div>
      <div class="balken"><i class="ja" style="width:${(z.ja / s) * 100}%"></i><i class="vielleicht" style="width:${(z.vielleicht / s) * 100}%"></i><i class="offen" style="width:${(z.offen / s) * 100}%"></i></div></div>`; }).join("")}
    <p class="hinweis">Grau heißt: noch unbekannt – es fehlen Antworten. Grau zählt nie als „in Ordnung“.</p></div>`;
}
function teilnehmerHtml(t) {
  const ids = eingeladene(db, t);
  const gruppen = { ja: [], vielleicht: [], nein: [], offen: [] };
  for (const p of ids) { const a = antwortVon(db, t.id, p); gruppen[a ? a.antwort : "offen"].push({ p, a }); }
  const vergangen = new Date(t.beginn) < new Date();
  return `<div class="karte"><h3>Teilnehmer ${vergangen ? "· Anwesenheit" : ""}</h3>${Object.entries(gruppen).map(([k, l]) => l.length ? `<h4>${k === "offen" ? "❔ ohne Antwort" : ANTW[k].join(" ")} (${l.length})</h4><ul class="liste">${l.sort((a, b) => name(a.p).localeCompare(name(b.p))).map(({ p, a }) => `<li><div class="fl"><span class="klick" data-a="oeffne" data-x="person|${p}">${esc(name(p))}</span> <span class="hinweis">${esc(hole("register", registerVon(db, p, a))?.kurz || "")}${a?.notiz ? " · " + esc(a.notiz) : ""}</span></div>${vergangen ? `<select data-c="anwesend" data-x="${t.id}|${p}"><option value="">–</option><option value="ja" ${a?.anwesend === "ja" ? "selected" : ""}>da</option><option value="nein" ${a?.anwesend === "nein" ? "selected" : ""}>fehlte</option></select>` : ""}</li>`).join("")}</ul>` : "").join("")}</div>`;
}
AKTIONEN.anwesend = async (wert, el) => {
  const [tid, pid] = el.dataset.x.split("|");
  const alt = antwortVon(db, tid, pid);
  await speichere("antworten", { ...(alt || { termin_id: tid, person_id: pid, antwort: wert === "ja" ? "ja" : "nein", notiz: "ohne Rückmeldung" }), anwesend: wert });
  toast("Anwesenheit gespeichert");
};
AKTIONEN.drucken = () => window.print();
AKTIONEN.terminIcs = (id) => { const t = hole("termine", id); herunterladen(`${t.titel}.ics`, ics([t]), "text/calendar"); };
AKTIONEN.terminWa = (id) => {
  const t = hole("termine", id);
  whatsapp(`🎻 ${t.titel}\n📅 ${datum(t.beginn)}, ${uhr(t.beginn)} Uhr\n📍 ${t.ort || ""}${t.beschreibung ? "\n" + t.beschreibung : ""}\n\nBitte in der Bachkreis-App zu- oder absagen.`, { betreff: t.titel });
};
AKTIONEN.nachfassen = async (id) => {
  const t = hole("termine", id);
  const offen = eingeladene(db, t).filter((p) => !antwortVon(db, id, p));
  const an = [...offen, ...offen.flatMap((p) => liste("eltern_kind", (e) => e.kind_id === p).map((e) => e.eltern_id))];
  const s = await senden({ an, betreff: `Bitte antworten: ${t.titel}`, text: `Für „${t.titel}“ am ${datum(t.beginn)} fehlt noch deine Zu- oder Absage.`, ereignis: "nachfassen" });
  toast(`⏰ Erinnerung an ${offen.length} Schüler (+ Eltern): ${s.push} Push, ${s.mail} Mail (simuliert)`);
};
AKTIONEN.registerNachricht = async (x) => {
  const [tid, rid] = x.split("|");
  const t = hole("termine", tid), r = hole("register", rid);
  const an = eingeladene(db, t).filter((p) => registerVon(db, p, antwortVon(db, tid, p)) === rid);
  const s = await senden({ an, betreff: `${r.name}: wir brauchen euch!`, text: `Für „${t.titel}“ am ${datum(t.beginn)} ist ${r.name} noch nicht ausreichend besetzt. Bitte antwortet in der App.`, ereignis: "nachfassen" });
  toast(`📣 ${an.length} aus ${r.name} benachrichtigt (${s.push} Push, simuliert)`);
};
AKTIONEN.terminAbsagen = async (id) => {
  if (!(await frage("Termin wirklich absagen? Alle Eingeladenen werden benachrichtigt."))) return;
  const t = await speichere("termine", { ...hole("termine", id), status: "abgesagt" });
  await senden({ an: eingeladene(db, t), betreff: `Abgesagt: ${t.titel}`, text: `Der Termin „${t.titel}“ am ${datum(t.beginn)} fällt aus.`, ereignis: "termin_geaendert" });
  toast("Termin abgesagt und Eingeladene benachrichtigt (simuliert)");
  zeige("termin", { id }, { ersetzen: true });
};

// ---------- Termin anlegen / bearbeiten (inkl. Serie) ----------
function terminForm(t = {}) {
  const arten = liste("terminarten").sort((a, b) => a.sort - b.sort);
  const gruppen = liste("gruppen").sort((a, b) => a.sort - b.sort);
  const projekte = liste("projekte");
  const regs = liste("register").sort((a, b) => a.sort - b.sort);
  const soll = t.soll || {};
  return `<div id="terminForm">
    <div class="feld"><label>Titel</label><input name="titel" value="${esc(t.titel || "")}" required></div>
    <div class="feld"><label>Art</label><select name="art_id">${arten.map((a) => `<option value="${a.id}" ${a.id === t.art_id ? "selected" : ""}>${a.sym} ${esc(a.name)}</option>`).join("")}</select></div>
    <div class="feld"><label>Beginn</label><input type="datetime-local" name="beginn" value="${zuLokal(t.beginn)}"></div>
    <div class="feld"><label>Ende</label><input type="datetime-local" name="ende" value="${zuLokal(t.ende)}"></div>
    <div class="feld"><label>Ort</label><input name="ort" value="${esc(t.ort || "")}" list="orte"><datalist id="orte">${[...new Set(liste("termine").map((x) => x.ort).filter(Boolean))].map((o) => `<option value="${esc(o)}">`).join("")}</datalist></div>
    <div class="feld"><label>Eingeladene Gruppen</label><div class="wahlen">${gruppen.map((g) => `<label><input type="checkbox" name="gruppen" data-mehr="1" value="${g.id}" ${(t.gruppen || []).includes(g.id) ? "checked" : ""}> ${esc(g.kuerzel)} – ${esc(g.name)}</label>`).join("")}</div></div>
    <div class="feld"><label>Projekt</label><select name="projekt_id"><option value="">–</option>${projekte.map((p) => `<option value="${p.id}" ${p.id === t.projekt_id ? "selected" : ""}>${esc(p.titel)}</option>`).join("")}</select></div>
    <div class="feld"><label>Antwort bis</label><input type="date" name="frist" value="${esc(t.frist || "")}"></div>
    <div class="feld"><label>Hinweise</label><textarea name="beschreibung">${esc(t.beschreibung || "")}</textarea></div>
    <details><summary><b>Soll-Besetzung je Register</b> (für die Ampel)</summary>${regs.map((r) => `<div class="feld" style="display:flex;gap:8px;align-items:center"><label style="flex:1">${esc(r.name)}</label><input type="number" min="0" style="width:80px" name="soll_${r.id}" value="${soll[r.id] || ""}"></div>`).join("")}</details>
    ${t.id ? "" : `<div class="feld"><label>Wiederholen (Serie)</label><select name="serie"><option value="">einmalig</option><option value="7">wöchentlich</option><option value="14">alle 2 Wochen</option></select></div><div class="feld"><label>Serie bis</label><input type="date" name="serie_bis"></div>`}
    <label class="schalter"><span>Eingeladene benachrichtigen</span><input type="checkbox" name="melden" checked></label>
    <button class="knopf haupt breit" data-a="terminSpeichern" data-x="${t.id || ""}">💾 Speichern</button></div>`;
}
AKTIONEN.terminNeu = () => blatt("Neuer Termin", terminForm({ beginn: new Date(Date.now() + 7 * 86400000).toISOString(), gruppen: [] }));
AKTIONEN.terminBearbeiten = (id) => blatt("Termin bearbeiten", terminForm(hole("termine", id)));
AKTIONEN.terminSpeichern = async (id) => {
  const f = formWerte(document.getElementById("terminForm"));
  if (!f.titel || !f.beginn) { toast("Titel und Beginn fehlen"); return; }
  const soll = {};
  for (const [k, v] of Object.entries(f)) if (k.startsWith("soll_") && Number(v) > 0) soll[k.slice(5)] = Number(v);
  const basis = { titel: f.titel, art_id: f.art_id, beginn: vonLokal(f.beginn), ende: vonLokal(f.ende), ort: f.ort, gruppen: f.gruppen || [], projekt_id: f.projekt_id || null, frist: f.frist || null, beschreibung: f.beschreibung, soll: Object.keys(soll).length ? soll : null };
  let gespeichert;
  if (id) gespeichert = [await speichere("termine", { ...hole("termine", id), ...basis })];
  else {
    const neu = [{ ...basis, status: "geplant" }];
    if (f.serie && f.serie_bis) {
      const schritt = Number(f.serie) * 86400000;
      const dauer = basis.ende ? new Date(basis.ende) - new Date(basis.beginn) : 0;
      for (let b = new Date(basis.beginn).getTime() + schritt; b <= new Date(f.serie_bis + "T23:59").getTime() && neu.length < 60; b += schritt)
        neu.push({ ...basis, status: "geplant", beginn: new Date(b).toISOString(), ende: dauer ? new Date(b + dauer).toISOString() : null, frist: null });
    }
    gespeichert = await speichereViele("termine", neu);
  }
  if (f.melden) {
    const an = [...new Set(gespeichert.flatMap((t) => eingeladene(db, t)))];
    await senden({ an, betreff: id ? `Geändert: ${basis.titel}` : `Neuer Termin: ${basis.titel}`, text: `${basis.titel} am ${datum(basis.beginn)}, ${uhr(basis.beginn)} Uhr${gespeichert.length > 1 ? ` (+${gespeichert.length - 1} weitere)` : ""}`, ereignis: id ? "termin_geaendert" : "termin_neu" });
  }
  blattZu();
  toast(`💾 ${gespeichert.length} Termin${gespeichert.length === 1 ? "" : "e"} gespeichert`);
  zeige("termin", { id: gespeichert[0].id }, { ersetzen: !!id });
};

// ---------- Abwesenheit: Zeitraum auf einmal absagen ----------
VIEWS.abwesenheit = {
  render() {
    const kids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
    return kopf("🏖️ Abwesenheit") + `<div class="karte" id="abwForm"><p class="hinweis">Für alle Termine im Zeitraum wird automatisch abgesagt. Einzelne Termine kannst du danach wieder ändern.</p>
      ${istEltern() ? `<div class="feld"><label>Für</label><select name="person">${kids.map((k) => `<option value="${k}">${esc(name(k))}</option>`).join("")}</select></div>` : `<input type="hidden" name="person" value="${S.ich.id}">`}
      <div class="feld"><label>von</label><input type="date" name="von" value="${tagIso(new Date())}"></div><div class="feld"><label>bis</label><input type="date" name="bis"></div>
      <div class="feld"><label>Grund (freiwillig)</label><input name="grund" placeholder="z. B. Klassenfahrt"></div>
      <button class="knopf haupt breit" data-a="abwesenheitSpeichern">Absagen für Zeitraum</button></div>`;
  },
};
AKTIONEN.abwesenheitSpeichern = async () => {
  const f = formWerte(document.getElementById("abwForm"));
  if (!f.von || !f.bis) { toast("Bitte Zeitraum wählen"); return; }
  const ts = termineFuer(db, f.person).filter((t) => tagIso(t.beginn) >= f.von && tagIso(t.beginn) <= f.bis);
  for (const t of ts) await speichere("antworten", { ...(antwortVon(db, t.id, f.person) || {}), termin_id: t.id, person_id: f.person, antwort: "nein", notiz: f.grund || "Abwesenheit", von_person_id: S.ich.id }, { still: true });
  toast(`❌ ${ts.length} Termine abgesagt`);
  zurueck();
};

// ---------- Kalender-Export ----------
VIEWS.kalender = {
  render() {
    const ts = fuerWen().flatMap((p) => termineFuer(db, p));
    return kopf("📆 Kalender-Export") + `<div class="karte"><p>Alle ${ts.length} kommenden Termine als Kalenderdatei (.ics) – lässt sich in Google-, Apple- und Outlook-Kalender importieren.</p>
      <button class="knopf haupt breit" data-a="alleIcs">📥 Kalenderdatei herunterladen</button>
      <p class="hinweis">Im Echtbetrieb gibt es zusätzlich ein Kalender-Abo (webcal-Link), das sich automatisch aktualisiert – wie in der Club-App.</p></div>`;
  },
};
AKTIONEN.alleIcs = () => herunterladen("bachkreis-termine.ics", ics([...new Map(fuerWen().flatMap((p) => termineFuer(db, p)).map((t) => [t.id, t])).values()]), "text/calendar");
export { terminKarte };
