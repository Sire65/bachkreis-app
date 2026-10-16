// Termine: Liste/Kalender, Zu-/Absage (auch Eltern für ihre Kinder), Besetzungsampel, Nachfassen, Serientermine,
// Abwesenheit (Zeitraum auf einmal absagen), Kalender-Export (.ics). Vorbild: KC Club „treffen“/„teilnahme“.
import { S, VIEWS, db, einst, zeige, zurueck, zeichne, kopf, name, vorname, istLehrkraft, istLeitung, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, datum, datumKurz, uhr, wochentag, monatKurz, MONATE, toast, blatt, blattZu, formWerte, zuLokal, vonLokal, herunterladen, frage } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele, loesche } from "../kern/daten.js";
import { feiertageNRW, termineFuer, antwortVon, antwortZaehler, besetzung, gesamtAmpel, eingeladene, eingeladen, kinderVon, ics, googleKalenderLink, tagIso, registerVon, instrumenteVon, teilnahmeVon, eigeneVorkommen } from "../kern/logik.js";
import { TERMIN_PLANER, TEILNAHME, ANWESENHEIT } from "../kern/schema.js";
import { senden, whatsapp } from "../kern/versand.js";

// 0.16.0 KINDERLEICHT (Wunsch Hansi: „das machen teilweise Kinder – einfach, logisch“): große Knöpfe „Ich komme / Ich kann nicht /
// Weiß noch nicht“, klare Hinweise ❗ erforderlich · 🙂 erwünscht · ℹ️ nur Info, Termine nach „Heute / Diese Woche / Später“,
// Filter Mein Orchester · Für alle · Meine eigenen, und eigene Termine (Üben, Unterricht, Vorspiel) mit wenigen Tipps.
const ANTW = { ja: ["✅", "Zusage"], vielleicht: ["⏳", "Weiß noch nicht"], nein: ["❌", "Absage"] };
const ANTW_ICH = { ja: ["✅", "Ich komme"], nein: ["❌", "Ich kann nicht"], vielleicht: ["⏳", "Weiß noch nicht"] };
const ANTW_STAND = { ja: (w) => (w ? `✅ ${w} kommt` : "✅ Du kommst"), nein: (w) => (w ? `❌ ${w} kommt nicht` : "❌ Du kommst nicht"), vielleicht: (w) => (w ? `⏳ ${w} überlegt noch` : "⏳ Du überlegst noch") };
const GRUENDE = [["krank", "🤒 krank"], ["schule", "📚 Schule / Klausur"], ["urlaub", "✈️ Urlaub / weg"], ["familie", "👪 Familie"], ["anderes", "✏️ anderes"]];
const EIGEN_ART = { ueben: ["🎻", "Üben"], unterricht: ["🎓", "Unterricht"], vorspiel: ["🎵", "Vorspiel"], sonstiges: ["📌", "Sonstiges"] };
const AMPEL_TEXT = { gruen: "Besetzung erfüllt", gelb: "nur mit „Weiß noch nicht“ erfüllt", grau: "unbekannt – Antworten fehlen", rot: "unterbesetzt", neutral: "kein Soll" };
const art = (t) => hole("terminarten", t.art_id) || { sym: "📌", name: "Termin", farbe: "#6b6455" };
const fuerWen = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);
export const darfPlanen = () => hatRolle(...TERMIN_PLANER);
const T = { aendern: new Set() };
// „morgen“, „übermorgen“, sonst „Sa, 17.10.“ – für Kinder leichter als ein volles Datum
const wannText = (iso) => { const d = new Date(iso + "T12:00:00"), h = new Date(); h.setHours(12, 0, 0, 0); const t = Math.round((d - h) / 86400000);
  return t <= 0 ? "heute" : t === 1 ? "morgen" : t === 2 ? "übermorgen" : `am ${wochentag(d.toISOString())}, ${d.getDate()}.${d.getMonth() + 1}.`; };
const teilnahmeBadge = (t) => { const k = teilnahmeVon(db, t), [s, n] = TEILNAHME[k] || TEILNAHME.erwuenscht; return `<span class="badge tn-${k}">${s} ${n}</span>`; };

function antwortBereich(t, p) {
  const a = antwortVon(db, t.id, p), zu = t.status === "abgesagt", k = `${t.id}|${p}`;
  const name = istEltern() && fuerWen().filter((x) => eingeladen(db, t, x)).length > 1 ? `<div class="t-wer">${esc(vorname(p))}</div>` : ""; // Name nur, wenn mehrere Kinder eingeladen sind
  if (zu) return "";
  if (a && !T.aendern.has(k)) {
    const nach = a.antwort === "vielleicht" && a.nachfragen_am ? ` – wir fragen ${esc(wannText(a.nachfragen_am))} nochmal` : "";
    return `${name}<div class="t-stand ${a.antwort}"><span>${ANTW_STAND[a.antwort](istEltern() || p !== S.ich.id ? vorname(p) : "")}${nach}${a.notiz && a.antwort === "nein" ? ` <small>(${esc(a.notiz)})</small>` : ""}</span>
      <button type="button" class="link" data-a="antwortAendern" data-x="${esc(k)}">ändern</button></div>`;
  }
  return `${name}<div class="antworten gross">${Object.entries(ANTW_ICH).map(([w, [s, n]]) => `<button class="${w} ${a?.antwort === w ? "an" : ""}" data-a="antworten" data-x="${esc(t.id)}|${esc(p)}|${w}">${s}<b>${istEltern() && w !== "vielleicht" ? (w === "ja" ? "kommt" : "kann nicht") : n}</b></button>`).join("")}</div>`;
}
function terminKarte(t, { mitAntwort = true } = {}) {
  if (t.eigen) return eigenKarte(t);
  const a = art(t), planer = darfPlanen(), tn = teilnahmeVon(db, t);
  const gr = t.fuer_alle ? '<span class="badge b-alle">🌍 für alle</span>' : (t.gruppen || []).map((g) => hole("gruppen", g)).filter(Boolean).map((g) => `<span class="badge" style="background:${esc(g.farbe)}22;color:${esc(g.farbe)}">${esc(g.kuerzel)}</span>`).join("");
  const ampel = planer && t.soll ? gesamtAmpel(besetzung(db, t)) : null;
  let antwort = "";
  if (mitAntwort) {
    if (tn === "info") antwort = '<div class="t-info">ℹ️ Nur zur Info – du musst nicht antworten.</div>';
    else for (const p of fuerWen()) if (eingeladen(db, t, p)) antwort += antwortBereich(t, p);
  }
  const z = planer && tn !== "info" ? antwortZaehler(db, t) : null;
  return `<div class="karte termin ${t.status === "abgesagt" ? "abgesagt" : ""}" style="border-left-color:${esc(a.farbe)}">
    <div class="kopf klick" data-a="oeffne" data-x="termin|${t.id}">
      <div class="datum">${wochentag(t.beginn)}<br>${new Date(t.beginn).getDate()}<small>${monatKurz(t.beginn)}</small></div>
      <div class="fl" style="flex:1;min-width:0"><div class="zeile-titel">${a.sym} ${esc(t.titel)}</div>
        <div class="zeile-unter">🕒 ${uhr(t.beginn)}${t.ende ? "–" + uhr(t.ende) : ""} Uhr${t.ort ? ` · 📍 ${esc(t.ort)}` : ""}</div>
        <div class="t-marken">${teilnahmeBadge(t)}${gr}${t.status === "abgesagt" ? '<span class="badge b-rot">fällt aus</span>' : ""}${ampel ? `<span class="badge"><span class="punkt ${ampel}"></span>${AMPEL_TEXT[ampel]}</span>` : ""}</div></div>
    </div>
    ${z ? `<div class="zaehler"><span class="badge b-gruen">✅ ${z.ja}</span><span class="badge b-gelb">⏳ ${z.vielleicht}</span><span class="badge b-rot">❌ ${z.nein}</span><span class="badge b-grau">❔ ${z.offen} offen</span></div>` : ""}
    ${antwort}</div>`;
}
function eigenKarte(e) {
  const [s, n] = EIGEN_ART[e.art] || EIGEN_ART.sonstiges;
  return `<div class="karte termin eigen klick" data-a="eigenBearbeiten" data-x="${esc(e.eigen_id)}">
    <div class="kopf"><div class="datum">${wochentag(e.beginn)}<br>${new Date(e.beginn).getDate()}<small>${monatKurz(e.beginn)}</small></div>
      <div class="fl" style="flex:1;min-width:0"><div class="zeile-titel">${s} ${esc(e.titel)}</div>
        <div class="zeile-unter">🕒 ${uhr(e.beginn)}${e.ende ? "–" + uhr(e.ende) : ""} Uhr${e.ort ? ` · 📍 ${esc(e.ort)}` : ""}</div>
        <div class="t-marken"><span class="badge b-eigen">🙋 ${istEltern() ? esc(vorname(e.person_id)) + " – eigener Termin" : "Mein eigener Termin"}</span>${e.woechentlich_bis ? '<span class="badge">🔁 jede Woche</span>' : ""}</div></div></div></div>`;
}
// Was sehe ich? Termine meines Orchesters + für alle + meine eigenen (Eltern: die der Kinder)
function meineEintraege(filter, bisTage = 150) {
  const von = new Date(); von.setHours(0, 0, 0, 0); const bis = new Date(von.getTime() + bisTage * 86400000);
  const ts = [...new Map(fuerWen().flatMap((x) => termineFuer(db, x)).map((t) => [t.id, t])).values()];
  const eigen = liste("eigene_termine", (e) => fuerWen().includes(e.person_id) && !e.geloescht_am).flatMap((e) => eigeneVorkommen(e, von, bis));
  const offen = (t) => teilnahmeVon(db, t) !== "info" && t.status !== "abgesagt" && fuerWen().some((p) => eingeladen(db, t, p) && (!antwortVon(db, t.id, p) || antwortVon(db, t.id, p).antwort === "vielleicht"));
  const l = filter === "eigene" ? eigen : filter === "global" ? ts.filter((t) => t.fuer_alle) : filter === "orchester" ? ts.filter((t) => !t.fuer_alle) : filter === "offen" ? ts.filter(offen) : [...ts, ...eigen];
  return { l: l.sort((a, b) => a.beginn.localeCompare(b.beginn)), offen: ts.filter(offen).length, eigen: eigen.length, global: ts.filter((t) => t.fuer_alle).length, orchester: ts.filter((t) => !t.fuer_alle).length };
}
// Abschnitte: Heute · Morgen · Diese Woche · Nächste Woche · danach je Monat
function abschnitte(l) {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  const mo = new Date(h); mo.setDate(h.getDate() - ((h.getDay() + 6) % 7));
  const titel = (d) => {
    const t = Math.floor((new Date(new Date(d).setHours(0, 0, 0, 0)) - h) / 86400000);
    if (t < 0) return "Vorbei"; if (t === 0) return "Heute"; if (t === 1) return "Morgen";
    const w = Math.floor((new Date(d) - mo) / (7 * 86400000));
    return w === 0 ? "Diese Woche" : w === 1 ? "Nächste Woche" : `${MONATE[new Date(d).getMonth()]} ${new Date(d).getFullYear()}`;
  };
  const out = [];
  for (const x of l) { const k = titel(x.beginn); if (out[out.length - 1]?.k !== k) out.push({ k, l: [] }); out[out.length - 1].l.push(x); }
  return out;
}

VIEWS.termine = {
  render(p) {
    const modus = p.modus || "liste", planer = darfPlanen();
    const filter = p.filter || (planer ? "alle" : "meine_alle");
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    let ts, chips = "", stand = null;
    if (planer && ["alle", "vergangen"].includes(filter)) {
      ts = filter === "vergangen" ? liste("termine", (t) => new Date(t.beginn) < heute).sort((a, b) => b.beginn.localeCompare(a.beginn)) : liste("termine", (t) => new Date(t.ende || t.beginn) >= heute).sort((a, b) => a.beginn.localeCompare(b.beginn));
    } else { stand = meineEintraege(filter.replace(/^meine_/, "").replace(/^meine$/, "alle")); ts = stand.l; }
    const f = filter.replace(/^meine_/, "");
    chips = `<div class="inst-chips t-filter">${(planer ? [["alle", "📋 Alle Termine"], ["meine_alle", "🙋 Meine"], ...(stand ? [] : [["meine_eigene", "🙋 Eigene"]]), ["vergangen", "🕰️ Vergangen"]] : [])
      .concat(stand || !planer ? [["meine_offen", `❔ Noch antworten`, stand?.offen], ["meine_orchester", "🎻 Mein Orchester", stand?.orchester], ["meine_global", "🌍 Für alle", stand?.global], ["meine_eigene", "🙋 Eigene", stand?.eigen]] : [])
      .map(([k, n, z]) => `<button type="button" class="${filter === k || (k === "meine_alle" && filter === "meine") ? "an" : ""}${k === "meine_offen" && z ? " t-offen" : ""}" data-a="termineFilter" data-x="${k}">${n}${z != null ? ` <b>${z}</b>` : ""}</button>`).join("")}${stand && filter !== "meine_alle" && filter !== "meine" && !planer ? `<button type="button" data-a="termineFilter" data-x="meine_alle">✕</button>` : ""}</div>`;
    const knoepfe = `<button class="knopf klein" data-a="eigenNeu" title="Eigenen Termin eintragen (z. B. Üben)">＋ Eigener</button>${planer ? `<button class="knopf haupt klein" data-a="terminNeu">＋ Termin</button>` : ""}`;
    const modusKn = `<div class="umschalter">${[["liste", "☰ Liste"], ["kalender", "🗓️ Kalender"]].map(([k, n]) => `<button class="${modus === k ? "an" : ""}" data-a="termineModus" data-x="${k}">${n}</button>`).join("")}</div>`;
    const hinweis = stand?.offen && !["meine_offen"].includes(filter) && !planer ? `<button type="button" class="karte t-hinweis" data-a="termineFilter" data-x="meine_offen">❔ <b>${stand.offen} ${stand.offen === 1 ? "Termin wartet" : "Termine warten"} auf ${istEltern() ? "eure" : "deine"} Antwort</b><span>antippen ›</span></button>` : "";
    const inhalt = modus === "kalender" ? monatsKalender(ts, p.monat)
      : ts.length ? abschnitte(ts).map((a) => `<h3 class="t-abschnitt">${esc(a.k)}</h3>${a.l.map((t) => terminKarte(t)).join("")}`).join("")
      : `<div class="leer">${f === "eigene" ? "Noch keine eigenen Termine.<br><button class=\"knopf haupt\" data-a=\"eigenNeu\">＋ Eigenen Termin eintragen</button>" : f === "offen" ? "🎉 Alles beantwortet!" : "Keine Termine."}</div>`;
    return kopf("📅 Termine", knoepfe) + modusKn + chips + hinweis + inhalt;
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
    const ft = einst().feiertage !== false ? feiertageNRW(d.getFullYear())[tag] : null;
    html += `<div class="tag ${d.getMonth() !== m ? "fremd" : ""} ${tag === heute ? "heute" : ""} ${ft ? "feiertag" : ""}" ${ft ? `title="${esc(ft)}"` : ""} data-a="${an.length ? (an[0].eigen ? "eigenBearbeiten" : "oeffne") : "nix"}" data-x="${an.length ? (an[0].eigen ? an[0].eigen_id : "termin|" + an[0].id) : ""}">${d.getDate()}${ft ? `<small class="ft">${esc(ft)}</small>` : ""}${an.map((t) => `<i style="background:${t.eigen ? "#7b3fa0" : esc(art(t).farbe)}" title="${esc(t.titel)}"></i>`).join("")}</div>`;
  }
  return html + "</div>";
}
AKTIONEN.nix = () => {};
AKTIONEN.termineFilter = (f) => zeige("termine", { ...S.params, filter: f }, { ersetzen: true });
AKTIONEN.termineModus = (m) => zeige("termine", { ...S.params, modus: m }, { ersetzen: true });
AKTIONEN.monat = (m) => zeige("termine", { ...S.params, monat: m }, { ersetzen: true });

AKTIONEN.antwortAendern = (k) => { T.aendern.add(k); zeichne(); };
async function antwortSpeichern(tid, pid, antwort, extra = {}) {
  const alt = antwortVon(db, tid, pid), t = hole("termine", tid);
  await speichere("antworten", { ...(alt || {}), termin_id: tid, person_id: pid, antwort, notiz: extra.notiz ?? (antwort === "ja" ? "" : alt?.notiz || ""), nachfragen_am: extra.nachfragen_am ?? null, von_person_id: S.ich.id });
  T.aendern.delete(`${tid}|${pid}`); blattZu();
  const f = pid !== S.ich.id ? ` für ${vorname(pid)}` : "";
  toast(antwort === "ja" ? `✅ Zugesagt${f} – schön, dass ${f ? vorname(pid) : "du"} dabei ${f ? "ist" : "bist"}!` : antwort === "nein" ? `❌ Abgesagt${f}${teilnahmeVon(db, t) === "pflicht" ? " – die Leitung sieht den Grund" : ""}` : `⏳ Gemerkt${f} – wir fragen ${wannText(extra.nachfragen_am)} nochmal`, 3500);
  zeichne();
}
AKTIONEN.antworten = async (x) => {
  const [tid, pid, antwort] = x.split("|");
  const t = hole("termine", tid), pflicht = teilnahmeVon(db, t) === "pflicht", f = pid !== S.ich.id ? vorname(pid) : "";
  if (antwort === "ja") return antwortSpeichern(tid, pid, "ja");
  if (antwort === "nein") {
    // ❌ Absage: Grund antippen (bei erforderlicher Teilnahme muss einer gewählt werden)
    return blatt(`❌ ${f ? f + " kann" : "Du kannst"} nicht kommen`, `<p><b>${esc(t.titel)}</b> · ${esc(datum(t.beginn))}</p>
      <p>${pflicht ? "❗ Die Teilnahme ist <b>erforderlich</b> – bitte sag kurz, warum:" : "Magst du sagen, warum? (freiwillig)"}</p>
      <div class="t-gruende">${GRUENDE.map(([k, n]) => `<button type="button" data-a="absageGrund" data-x="${esc(tid)}|${esc(pid)}|${k}">${n}</button>`).join("")}</div>
      <div class="feld"><input id="absageText" placeholder="oder selbst schreiben …" maxlength="120"></div>
      <button class="knopf rot breit" data-a="absageSenden" data-x="${esc(tid)}|${esc(pid)}">❌ Absagen</button>`);
  }
  // ⏳ Weiß noch nicht: wann sollen wir nochmal fragen?
  const tage = Math.floor((new Date(t.beginn) - Date.now()) / 86400000), opt = [];
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return tagIso(d); };
  if (tage >= 1) opt.push([plus(1), "🌅 Morgen"]);
  if (tage >= 4) opt.push([plus(3), "📆 In 3 Tagen"]);
  if (tage >= 9) opt.push([plus(7), "🗓️ In einer Woche"]);
  if (tage >= 3) opt.push([tagIso(new Date(new Date(t.beginn).getTime() - 2 * 86400000)), "⏰ 2 Tage vorher"]);
  if (!opt.length) opt.push([plus(0), "⏰ Heute noch"]);
  blatt(`⏳ ${f ? f + " weiß" : "Du weißt"} es noch nicht`, `<p><b>${esc(t.titel)}</b> · ${esc(datum(t.beginn))}</p><p>Wann sollen wir nochmal fragen?</p>
    <div class="t-gruende">${opt.map(([d, n]) => `<button type="button" data-a="spaeterFragen" data-x="${esc(tid)}|${esc(pid)}|${d}">${n}</button>`).join("")}</div>
    ${t.frist ? `<p class="hinweis">Antwort bis ${esc(datumKurz(t.frist))}.</p>` : ""}`);
};
AKTIONEN.absageGrund = (x) => { const [tid, pid, k] = x.split("|"); antwortSpeichern(tid, pid, "nein", { notiz: GRUENDE.find((g) => g[0] === k)?.[1].replace(/^\S+\s/, "") || k }); };
AKTIONEN.absageSenden = (x) => {
  const [tid, pid] = x.split("|"), text = document.getElementById("absageText")?.value.trim() || "";
  if (!text && teilnahmeVon(db, hole("termine", tid)) === "pflicht") return toast("❗ Bitte einen Grund antippen oder kurz schreiben.");
  antwortSpeichern(tid, pid, "nein", { notiz: text });
};
AKTIONEN.spaeterFragen = (x) => { const [tid, pid, d] = x.split("|"); antwortSpeichern(tid, pid, "vielleicht", { nachfragen_am: d }); };
// ⏳ Beim Öffnen: „Du wolltest dich noch entscheiden“ (fällige Nachfragen) – einmal am Tag
export function termineStart() {
  const heute = tagIso(new Date());
  const faellig = fuerWen().flatMap((p) => termineFuer(db, p).filter((t) => t.status !== "abgesagt" && eingeladen(db, t, p)).map((t) => ({ t, p, a: antwortVon(db, t.id, p) })))
    .filter(({ a }) => a?.antwort === "vielleicht" && a.nachfragen_am && a.nachfragen_am <= heute);
  if (!faellig.length) return false;
  try { if (localStorage.getItem("bk_nachfragen") === heute) return false; localStorage.setItem("bk_nachfragen", heute); } catch { return false; }
  setTimeout(() => blatt("⏳ Du wolltest dich noch entscheiden", faellig.slice(0, 4).map(({ t, p }) => `<div class="karte t-nachfrage"><b>${esc(t.titel)}</b><div class="hinweis">${esc(datum(t.beginn))}, ${esc(uhr(t.beginn))} Uhr${istEltern() ? ` · ${esc(vorname(p))}` : ""}</div>
    <div class="antworten gross">${Object.entries(ANTW_ICH).map(([w, [s, n]]) => `<button class="${w}" data-a="antworten" data-x="${esc(t.id)}|${esc(p)}|${w}">${s}<b>${n}</b></button>`).join("")}</div></div>`).join("")), 900);
  return true;
}

// ---------- Termin-Detail ----------
VIEWS.termin = {
  render({ id }) {
    const t = hole("termine", id);
    if (!t) return kopf("Termin") + `<div class="leer">Termin nicht gefunden.</div>`;
    const a = art(t);
    const projekt = t.projekt_id ? hole("projekte", t.projekt_id) : null;
    const knoepfe = darfPlanen() ? `<button class="knopf klein" data-a="terminBearbeiten" data-x="${t.id}">✏️</button>` : "";
    let html = kopf(`${a.sym} ${esc(t.titel)}`, knoepfe);
    html += `<div class="karte"><div class="zeile-titel">${datum(t.beginn)}</div><div>${uhr(t.beginn)}${t.ende ? " – " + (tagIso(t.ende) !== tagIso(t.beginn) ? datum(t.ende) + ", " : "") + uhr(t.ende) : ""} Uhr</div>
      <div>📍 ${esc(t.ort || "–")}</div>${projekt ? `<div class="klick" data-a="oeffne" data-x="projekt|${projekt.id}">🎭 ${esc(projekt.titel)} ›</div>` : ""}
      <div class="t-marken">${teilnahmeBadge(t)}${t.fuer_alle ? '<span class="badge b-alle">🌍 für alle</span>' : ""}</div>
      ${t.frist ? `<div class="hinweis">Antwort bis ${datumKurz(t.frist)}</div>` : ""}
      ${t.beschreibung ? `<p>${esc(t.beschreibung).replace(/\n/g, "<br>")}</p>` : ""}
      ${t.status === "abgesagt" ? '<p class="badge b-rot">Dieser Termin ist abgesagt.</p>' : ""}
      <div class="knopfreihe"><button class="knopf klein" data-a="terminIcs" data-x="${t.id}">📆 In meinen Kalender</button><button class="knopf klein" data-a="terminWa" data-x="${t.id}">🟢 Per WhatsApp teilen</button></div></div>`;
    const meine = fuerWen().filter((p) => eingeladen(db, t, p));
    if (teilnahmeVon(db, t) === "info") html += '<div class="karte t-info">ℹ️ Nur zur Info – du musst nicht antworten.</div>';
    else if (meine.length) html += `<div class="karte"><h3>${istEltern() ? "Antwort für meine Kinder" : "Kommst du?"}</h3>${meine.map((p) => `${antwortBereich(t, p)}${instrumentWahl(t, p)}`).join("")}</div>`;
    if (darfPlanen() && teilnahmeVon(db, t) !== "info") {
      const z = antwortZaehler(db, t);
      html += `<div class="karte"><h3>Rückmeldungen (${z.gesamt} eingeladen)</h3><div class="zaehler"><span class="badge b-gruen">✅ ${z.ja}</span><span class="badge b-gelb">🤔 ${z.vielleicht}</span><span class="badge b-rot">❌ ${z.nein}</span><span class="badge b-grau">❔ ${z.offen} offen</span></div>
        <div class="knopfreihe"><button class="knopf klein" data-a="nachfassen" data-x="${t.id}" ${z.offen + z.vielleicht ? "" : "disabled"}>⏰ ${z.offen + z.vielleicht} offene erinnern</button><button class="knopf klein" data-a="drucken">🖨️ Liste drucken</button>
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
  const vergangen = new Date(t.beginn) < new Date(), darfAnw = darfPlanen();
  return `<div class="karte"><h3>Teilnehmer ${vergangen ? "· Anwesenheit" : ""}</h3>${Object.entries(gruppen).map(([k, l]) => l.length ? `<h4>${k === "offen" ? "❔ ohne Antwort" : ANTW[k].join(" ")} (${l.length})</h4><ul class="liste">${l.sort((a, b) => name(a.p).localeCompare(name(b.p))).map(({ p, a }) => `<li><div class="fl"><span class="klick" data-a="oeffne" data-x="person|${p}">${esc(name(p))}</span> <span class="hinweis">${esc(hole("register", registerVon(db, p, a))?.kurz || "")}${a?.notiz ? " · " + esc(a.notiz) : ""}</span></div>${vergangen && darfAnw ? anwKnoepfe(t, p, a) : vergangen && a?.anwesend ? `<span class="badge">${ANWESENHEIT[a.anwesend]?.join(" ") || ""}</span>` : ""}</li>`).join("")}</ul>` : "").join("")}
    ${vergangen && darfAnw ? `<div class="knopfreihe"><button class="knopf klein" data-a="anwAlleDa" data-x="${t.id}">✅ Alle Zusagen „da“</button><button class="knopf klein" data-a="kachel" data-x="anwesenheit">📋 Fehlzeiten</button></div>` : ""}</div>`;
}
// 📋 Anwesenheit nach Beginn: ✅ da · ⏰ verspätet · 🟡 entschuldigt · ❌ unentschuldigt (wer abgesagt hat: 🟡 vorgeschlagen)
function anwKnoepfe(t, p, a) {
  const ist = a?.anwesend || "", vorschlag = !ist && a?.antwort === "nein" ? "entschuldigt" : "";
  return `<span class="anw-knoepfe" role="group" aria-label="Anwesenheit">${Object.entries(ANWESENHEIT).map(([k, [sym, txt]]) => `<button type="button" class="${ist === k ? "an" : vorschlag === k ? "vorschlag" : ""}" data-a="anwSetzen" data-x="${t.id}|${p}|${k}" title="${txt}" aria-label="${txt}" aria-pressed="${ist === k}">${sym}</button>`).join("")}</span>`;
}
AKTIONEN.anwSetzen = async (x) => {
  const [tid, pid, wert] = x.split("|"), alt = antwortVon(db, tid, pid);
  await speichere("antworten", { ...(alt || { termin_id: tid, person_id: pid, antwort: ["ja", "spaet"].includes(wert) ? "ja" : "nein", notiz: "ohne Rückmeldung" }), anwesend: alt?.anwesend === wert ? "" : wert });
  zeichne();
};
AKTIONEN.anwAlleDa = async (tid) => {
  const t = hole("termine", tid), l = eingeladene(db, t).map((p) => antwortVon(db, tid, p)).filter((a) => a?.antwort === "ja" && !a.anwesend);
  for (const a of l) await speichere("antworten", { ...a, anwesend: "ja" });
  toast(`✅ ${l.length} als „da“ eingetragen – Fehlende einzeln ändern`); zeichne();
};
AKTIONEN.anwesend = async (wert, el) => {
  const [tid, pid] = el.dataset.x.split("|");
  const alt = antwortVon(db, tid, pid);
  await speichere("antworten", { ...(alt || { termin_id: tid, person_id: pid, antwort: wert === "ja" ? "ja" : "nein", notiz: "ohne Rückmeldung" }), anwesend: wert });
  toast("Anwesenheit gespeichert");
};
AKTIONEN.drucken = () => window.print();
// 📆 Ein Termin in den eigenen Kalender: Apple/Outlook per Kalenderdatei, Google per Vorlage (dort „Speichern“)
AKTIONEN.terminIcs = (id) => {
  const t = hole("termine", id);
  blatt("📆 In meinen Kalender", `<p><b>${esc(t.titel)}</b><br><span class="hinweis">${esc(datum(t.beginn))}, ${esc(uhr(t.beginn))} Uhr${t.ort ? " · " + esc(t.ort) : ""}</span></p>
    <div class="knopfreihe kal-wahl"><button class="knopf" data-a="terminIcsDatei" data-x="${esc(t.id)}">🍎 Apple / Outlook</button><a class="knopf" href="${esc(googleKalenderLink(t))}" target="_blank" rel="noopener">🟢 Google Kalender</a></div>
    <p class="hinweis">Alle Termine auf einmal – und automatisch aktuell: <button class="link" data-a="kachel" data-x="kalender">📆 Kalender-Abo</button></p>`);
};
AKTIONEN.terminIcsDatei = (id) => { const t = hole("termine", id); blattZu(); herunterladen(`${t.titel}.ics`, ics([t], "Bachkreis", { alarm: Number(hole("personen", S.ich.id)?.kalender_alarm) || 0 }), "text/calendar"); };
AKTIONEN.terminWa = (id) => {
  const t = hole("termine", id);
  whatsapp(`🎻 ${t.titel}\n📅 ${datum(t.beginn)}, ${uhr(t.beginn)} Uhr\n📍 ${t.ort || ""}${t.beschreibung ? "\n" + t.beschreibung : ""}\n\nBitte in der Bachkreis-App zu- oder absagen.`, { betreff: t.titel });
};
AKTIONEN.nachfassen = async (id) => {
  const t = hole("termine", id);
  const offen = eingeladene(db, t).filter((p) => !antwortVon(db, id, p) || antwortVon(db, id, p).antwort === "vielleicht"); // ohne Antwort + „weiß noch nicht“
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
    <div class="feld"><label>Für wen?</label><div class="t-wahl"><label class="t-chip alle"><input type="checkbox" name="fuer_alle" ${t.fuer_alle ? "checked" : ""}><span>🌍 Für alle</span></label>${gruppen.map((g) => `<label class="t-chip"><input type="checkbox" name="gruppen" data-mehr="1" value="${g.id}" ${(t.gruppen || []).includes(g.id) ? "checked" : ""}><span>${esc(g.kuerzel)} · ${esc(g.name)}</span></label>`).join("")}</div>
      <p class="hinweis">„Für alle“ = der ganze Bachkreis (z. B. Weihnachtsfeier) – dann braucht es keine Gruppe.</p></div>
    <div class="feld"><label>Teilnahme</label><div class="t-wahl">${Object.entries(TEILNAHME).map(([k, [sym, n]]) => `<label class="t-chip tn-${k}"><input type="radio" name="teilnahme" value="${k}" ${(t.teilnahme || (t.id ? teilnahmeVon(db, t) : hole("terminarten", arten[0]?.id)?.pflicht ? "pflicht" : "erwuenscht")) === k ? "checked" : ""}><span>${sym} ${n}</span></label>`).join("")}</div>
      <p class="hinweis">❗ erforderlich: Absage nur mit Grund · 🙂 erwünscht: Zusage/Absage/Weiß noch nicht · ℹ️ Info: ohne Antwort.</p></div>
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
  if (!f.fuer_alle && !(f.gruppen || []).length) { toast("Bitte „Für alle“ oder mindestens ein Orchester wählen"); return; }
  if (f.ende && vonLokal(f.ende) < vonLokal(f.beginn)) { toast("Das Ende liegt vor dem Beginn"); return; }
  const basis = { titel: f.titel, art_id: f.art_id, beginn: vonLokal(f.beginn), ende: vonLokal(f.ende), ort: f.ort, fuer_alle: !!f.fuer_alle, teilnahme: f.teilnahme || "erwuenscht", gruppen: f.fuer_alle ? [] : f.gruppen || [], projekt_id: f.projekt_id || null, frist: f.frist || null, beschreibung: f.beschreibung, soll: Object.keys(soll).length ? soll : null };
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

// ---------- 🙋 Eigene Termine (Üben, Unterricht, Vorspiel …) – mit wenigen Tipps ----------
const DAUER = [15, 30, 45, 60, 90];
function eigenForm(e) {
  const kids = istEltern() ? kinderVon(db, S.ich.id) : [], b = new Date(e.beginn), dauer = e.ende ? Math.round((new Date(e.ende) - b) / 60000) : 30;
  const zw = (n) => String(n).padStart(2, "0");
  return `<div id="eigenForm" class="et-form" data-id="${esc(e.id || "")}">
    ${kids.length > 1 ? `<div class="feld"><label>Für wen?</label><div class="t-wahl">${kids.map((k) => `<label class="t-chip"><input type="radio" name="person_id" value="${esc(k)}" ${(e.person_id || kids[0]) === k ? "checked" : ""}><span>${esc(vorname(k))}</span></label>`).join("")}</div></div>` : `<input type="hidden" name="person_id" value="${esc(e.person_id || kids[0] || S.ich.id)}">`}
    <div class="feld"><label>Was?</label><div class="t-wahl">${Object.entries(EIGEN_ART).map(([k, [sym, n]]) => `<label class="t-chip"><input type="radio" name="art" value="${k}" data-c="eigenArt" ${(e.art || "ueben") === k ? "checked" : ""}><span>${sym} ${n}</span></label>`).join("")}</div></div>
    <div class="feld"><label>Titel</label><input name="titel" id="etTitel" value="${esc(e.titel || "Üben")}" maxlength="80"></div>
    <div class="et-zeit"><div class="feld"><label>Tag</label><input type="date" name="tag" value="${tagIso(b)}"></div><div class="feld"><label>Uhrzeit</label><input type="time" name="zeit" value="${zw(b.getHours())}:${zw(b.getMinutes())}"></div></div>
    <div class="feld"><label>Wie lange?</label><div class="t-wahl">${DAUER.map((m) => `<label class="t-chip"><input type="radio" name="dauer" value="${m}" ${dauer === m ? "checked" : ""}><span>${m < 60 ? m + " Min." : m === 90 ? "1½ Std." : m / 60 + " Std."}</span></label>`).join("")}</div></div>
    <label class="schalter"><span><b>🔁 Jede Woche</b><div class="hinweis">z. B. Unterricht immer montags</div></span><input type="checkbox" name="woechentlich" ${e.woechentlich_bis ? "checked" : ""}></label>
    <div class="feld et-bis"><label>Jede Woche bis</label><input type="date" name="woechentlich_bis" value="${esc(e.woechentlich_bis || tagIso(new Date(b.getTime() + 8 * 7 * 86400000)))}"></div>
    <div class="feld"><label>Erinnerung im Handy-Kalender</label><div class="t-wahl">${[[0, "keine"], [15, "15 Min."], [30, "30 Min."], [60, "1 Std."]].map(([m, n]) => `<label class="t-chip"><input type="radio" name="erinnerung" value="${m}" ${Number(e.erinnerung || 0) === m ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>
    <div class="feld"><label>Wo? (freiwillig)</label><input name="ort" value="${esc(e.ort || "")}" maxlength="80"></div>
    <div class="feld"><label>Notiz (freiwillig)</label><input name="notiz" value="${esc(e.notiz || "")}" maxlength="300"></div>
    <button class="knopf haupt breit" data-a="eigenSpeichern">💾 Speichern</button>
    ${e.id ? `<button class="knopf rot breit" data-a="eigenLoeschen" data-x="${esc(e.id)}">🗑️ Löschen</button>` : ""}
    <p class="hinweis">🔒 Nur du${istEltern() ? " und dein Kind" : " und deine Eltern"} sehen eigene Termine.</p></div>`;
}
AKTIONEN.eigenNeu = () => { const b = new Date(); b.setDate(b.getDate() + 1); b.setHours(17, 0, 0, 0); blatt("🙋 Eigener Termin", eigenForm({ beginn: b.toISOString(), art: "ueben", titel: "Üben" })); };
AKTIONEN.eigenBearbeiten = (id) => { const e = hole("eigene_termine", id); if (e) blatt("🙋 Eigener Termin", eigenForm(e)); };
AKTIONEN.eigenArt = (v) => { const t = document.getElementById("etTitel"); if (t && (!t.value || Object.values(EIGEN_ART).some(([, n]) => n === t.value) || /^Geigenunterricht$/.test(t.value))) t.value = EIGEN_ART[v]?.[1] || ""; };
AKTIONEN.eigenSpeichern = async () => {
  const el = document.getElementById("eigenForm"), f = formWerte(el), id = el.dataset.id;
  if (!f.titel?.trim()) return toast("Bitte einen Titel eingeben");
  if (!f.tag || !f.zeit) return toast("Bitte Tag und Uhrzeit wählen");
  const b = new Date(`${f.tag}T${f.zeit}`), e = new Date(b.getTime() + Number(f.dauer || 30) * 60000);
  const alt = id ? hole("eigene_termine", id) : {};
  await speichere("eigene_termine", { ...alt, person_id: f.person_id, art: f.art || "ueben", titel: f.titel.trim(), beginn: b.toISOString(), ende: e.toISOString(), ort: f.ort || "", notiz: f.notiz || "", woechentlich_bis: f.woechentlich ? f.woechentlich_bis || null : null, erinnerung: Number(f.erinnerung || 0) });
  blattZu(); toast("🙋 Eigener Termin gespeichert"); zeichne();
};
AKTIONEN.eigenLoeschen = async (id) => {
  if (!(await frage("Diesen eigenen Termin löschen?"))) return;
  await speichere("eigene_termine", { ...hole("eigene_termine", id), geloescht_am: new Date().toISOString() }); blattZu(); toast("🗑️ Gelöscht"); zeichne();
};

// 📆 Kalender übertragen (Apple, Google, Outlook) steht in kalender.js
export { terminKarte };
