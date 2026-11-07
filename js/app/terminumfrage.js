// 🗳️ Terminumfrage (0.39.0, wie KC Terminumfrage – „Doodle“): mögliche Termine vorschlagen, alle kreuzen an (✅ passt · 🤔 notfalls · ❌ geht nicht),
// wer sie angelegt hat sieht die Auszählung und legt mit einem Tipp den Termin an. Für Elternabende, Probenwochenenden, Planungstreffen.
// Rechte erzwingt der Server (regeln.js): anlegen Leitung/Lehrkräfte/Vorstand/Terminplaner, abstimmen nur wer gemeint ist (Eltern / Mitglieder selbst /
// Team), fremde Antworten sehen nur wer die Umfrage angelegt hat und die Leitung. Kinder sehen keine Namen anderer.
import { S, VIEWS, db, zeige, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { TU_AN, TU_STIMMEN, TU_PLANER, tuAntwortId, tuAuszaehlen, tuFuerMich } from "../kern/schema.js";
import { eingeladene, elternVon, kinderVon, tagIso } from "../kern/logik.js";
import { senden } from "../kern/versand.js";
import { startseiteVerbinden } from "./startseite.js";

const ich = () => S.ich?.id;
export const darfUmfragen = () => hatRolle(...TU_PLANER);
const leitet = () => hatRolle("admin", "leitung");
const wann = (iso) => new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr";
function meinCtx() {
  const kinder = new Set(kinderVon(db, ich())), eigene = new Set(liste("gruppe_zuordnung", (z) => z.person_id === ich()).map((z) => z.gruppe_id));
  const gruppen = new Set([...eigene, ...liste("gruppe_zuordnung", (z) => kinder.has(z.person_id)).map((z) => z.gruppe_id)]);
  return { gruppen, eigeneGruppen: eigene, kinder, verwalter: hatRolle("admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart") };
}
export const fuerMich = (u) => tuFuerMich(u, meinCtx());
export const meineAntwort = (u) => hole("terminumfrage_antworten", tuAntwortId(u.id, ich()));
// Wer ist gemeint? (für Benachrichtigung und „noch nicht abgestimmt“)
export function tuEmpfaenger(u) {
  if (u.an === "verwaltung") return liste("personen", (p) => p.status === "aktiv" && (p.rollen || []).some((r) => ["admin", "leitung", "lehrkraft", "vorstand"].includes(r))).map((p) => p.id);
  const kinderUndMitglieder = eingeladene(db, { fuer_alle: u.fuer_alle, gruppen: u.gruppen, beginn: u.optionen?.[0]?.beginn || new Date().toISOString() });
  if (u.an === "eltern") return [...new Set(kinderUndMitglieder.filter((p) => hole("personen", p)?.typ === "schueler").flatMap((k) => elternVon(db, k)))];
  return kinderUndMitglieder;
}
// offene Umfragen, bei denen ich noch nicht abgestimmt habe (für „Für dich“ und die Termine)
export const offeneFuerMich = () => liste("terminumfragen", (u) => u.status === "offen" && (!u.frist || u.frist >= tagIso(new Date())) && fuerMich(u) && !meineAntwort(u));

VIEWS.terminumfragen = {
  render() {
    const alle = liste("terminumfragen", (u) => fuerMich(u) || u.von === ich() || leitet()).sort((a, b) => String(b.erstellt_am || b.id).localeCompare(String(a.erstellt_am || a.id)));
    const offen = offeneFuerMich(), laufend = alle.filter((u) => u.status === "offen" && !offen.includes(u)), fertig = alle.filter((u) => u.status !== "offen");
    const zeile = (u) => { const z = tuAuszaehlen(u, liste("terminumfrage_antworten", (a) => a.umfrage_id === u.id)), g = u.optionen.find((o) => o.id === u.gewaehlt);
      return `<li class="klick" data-a="oeffne" data-x="terminumfrage|${esc(u.id)}"><span aria-hidden="true">${u.status === "entschieden" ? "📅" : u.status === "abgebrochen" ? "✖" : "🗳️"}</span><div class="fl"><div class="zeile-titel">${esc(u.titel)}</div>
        <div class="zeile-unter">${u.status === "entschieden" && g ? `Festgelegt: ${esc(wann(g.beginn))}` : u.status === "abgebrochen" ? "abgebrochen" : `${u.optionen.length} Vorschläge${u.frist ? ` · bis ${esc(new Date(u.frist + "T12:00").toLocaleDateString("de-DE"))}` : ""}${u.von === ich() || leitet() ? ` · ${z.antworten} Antworten` : meineAntwort(u) ? " · ✅ abgestimmt" : ""}`}</div></div><span aria-hidden="true">›</span></li>`; };
    return kopf("🗳️ Terminumfragen", darfUmfragen() ? '<button class="knopf haupt klein" data-a="tuNeu">＋ Neue Umfrage</button>' : "")
      + `<p class="hinweis">Mögliche Termine ankreuzen – wer die Umfrage angelegt hat, legt danach den Termin fest.</p>`
      + (offen.length ? `<div class="karte tu-bitte"><h3>🙋 Bitte abstimmen (${offen.length})</h3><ul class="liste">${offen.map(zeile).join("")}</ul></div>` : "")
      + (laufend.length ? `<div class="karte"><h3>🗳️ Laufen gerade</h3><ul class="liste">${laufend.map(zeile).join("")}</ul></div>` : "")
      + (fertig.length ? `<div class="karte"><h3>📅 Entschieden</h3><ul class="liste">${fertig.slice(0, 20).map(zeile).join("")}</ul></div>` : "")
      + (!alle.length ? `<div class="leer">Gerade keine Terminumfrage.${darfUmfragen() ? '<br><button class="knopf haupt" data-a="tuNeu">＋ Neue Umfrage</button>' : ""}</div>` : "");
  },
};

const ST = { stimmen: {}, fuer: null };
VIEWS.terminumfrage = {
  render({ id }) {
    const u = hole("terminumfragen", id); if (!u) return kopf("🗳️ Terminumfrage") + '<div class="leer">Nicht gefunden.</div>';
    const antworten = liste("terminumfrage_antworten", (a) => a.umfrage_id === u.id), z = tuAuszaehlen(u, antworten), chef = u.von === ich() || leitet();
    if (ST.fuer !== u.id) { ST.fuer = u.id; ST.stimmen = { ...(meineAntwort(u)?.stimmen || {}) }; }
    const offen = u.status === "offen" && (!u.frist || u.frist >= tagIso(new Date())), darf = fuerMich(u) && offen;
    const g = u.optionen.find((o) => o.id === u.gewaehlt);
    const kopfTxt = `<div class="karte"><h3>${esc(u.titel)}</h3>${u.beschreibung ? `<p>${esc(u.beschreibung)}</p>` : ""}<p class="hinweis">${esc(TU_AN[u.an] || "")}${u.ort ? ` · 📍 ${esc(u.ort)}` : ""} · ⏱️ ${u.dauer_min || 120} Min.${u.frist ? ` · abstimmen bis ${esc(new Date(u.frist + "T12:00").toLocaleDateString("de-DE"))}` : ""} · von ${esc(name(u.von))}</p>
      ${u.status === "entschieden" && g ? `<p class="tu-fest">📅 Festgelegt: <b>${esc(wann(g.beginn))}</b>${u.termin_id ? ` <button type="button" class="knopf klein" data-a="oeffne" data-x="termin|${esc(u.termin_id)}">Zum Termin ›</button>` : ""}</p>` : u.status === "abgebrochen" ? '<p class="tu-fest">✖ Abgebrochen</p>' : !offen ? '<p class="tu-fest">⏰ Abstimmung beendet – die Entscheidung kommt.</p>' : ""}</div>`;
    const abstimmen = darf ? `<div class="karte"><h3>🙋 Deine Antwort</h3><p class="hinweis">Für jeden Vorschlag antippen: ✅ passt · 🤔 notfalls · ❌ geht nicht.</p>
      ${u.optionen.map((o) => `<div class="tu-option"><b>${esc(wann(o.beginn))}</b><div class="tu-knoepfe" role="group" aria-label="${esc(wann(o.beginn))}">${Object.entries(TU_STIMMEN).map(([k, t]) => `<button type="button" class="tu-k ${k}${ST.stimmen[o.id] === k ? " an" : ""}" aria-pressed="${ST.stimmen[o.id] === k}" data-a="tuStimme" data-x="${esc(o.id)}|${k}">${t}</button>`).join("")}</div></div>`).join("")}
      <div class="feld"><label for="tuKommentar">Kommentar (freiwillig)</label><input id="tuKommentar" maxlength="300" value="${esc(meineAntwort(u)?.kommentar || "")}" placeholder="z. B. komme erst 19:30"></div>
      <button type="button" class="knopf haupt breit" data-a="tuAbstimmen" data-x="${esc(u.id)}">${meineAntwort(u) ? "💾 Antwort ändern" : "✅ Abstimmen"}</button></div>` : fuerMich(u) && meineAntwort(u) ? `<div class="karte"><p>✅ Du hast abgestimmt.</p></div>` : "";
    const auswertung = chef ? `<div class="karte"><h3>📊 Auszählung · ${z.antworten} ${z.antworten === 1 ? "Antwort" : "Antworten"} von ${tuEmpfaenger(u).length}</h3>
      ${z.optionen.map((o) => `<div class="tu-zeile${o.id === z.beste ? " beste" : ""}${o.id === u.gewaehlt ? " gewaehlt" : ""}"><div class="fl"><b>${esc(wann(o.beginn))}</b>${o.id === z.beste && u.status === "offen" ? ' <span class="badge b-gruen">am besten</span>' : ""}
        <div class="tu-balken" role="img" aria-label="${o.ja} passt, ${o.vielleicht} notfalls, ${o.nein} geht nicht"><i class="ja" style="flex:${o.ja}"></i><i class="vielleicht" style="flex:${o.vielleicht}"></i><i class="nein" style="flex:${o.nein}"></i></div>
        <small>✅ ${o.ja} · 🤔 ${o.vielleicht} · ❌ ${o.nein}</small></div>${u.status === "offen" ? `<button type="button" class="knopf klein${o.id === z.beste ? " haupt" : ""}" data-a="tuFestlegen" data-x="${esc(u.id)}|${esc(o.id)}">📅 Festlegen</button>` : ""}</div>`).join("")}
      <details><summary>Wer hat wie abgestimmt?</summary><ul class="liste">${antworten.map((a) => `<li><div class="fl"><b>${esc(name(a.person_id))}</b>${a.kommentar ? `<div class="zeile-unter">💬 ${esc(a.kommentar)}</div>` : ""}</div><span class="tu-mini">${u.optionen.map((o) => ({ ja: "✅", vielleicht: "🤔", nein: "❌" }[a.stimmen?.[o.id]] || "·")).join(" ")}</span></li>`).join("") || '<li class="hinweis">Noch niemand.</li>'}</ul></details>
      ${u.status === "offen" ? `<div class="knopfreihe"><button type="button" class="knopf" data-a="tuErinnern" data-x="${esc(u.id)}">📣 Erinnern (${Math.max(0, tuEmpfaenger(u).length - z.antworten)} offen)</button><button type="button" class="knopf rot" data-a="tuAbbrechen" data-x="${esc(u.id)}">✖ Abbrechen</button></div>` : ""}</div>` : "";
    return kopf("🗳️ Terminumfrage") + kopfTxt + abstimmen + auswertung;
  },
};
AKTIONEN.tuStimme = (x) => { const [o, s] = String(x).split("|"); ST.stimmen[o] = ST.stimmen[o] === s ? undefined : s; zeichne(); };
AKTIONEN.tuAbstimmen = async (id) => {
  const u = hole("terminumfragen", id); if (!u) return;
  const stimmen = Object.fromEntries(Object.entries(ST.stimmen).filter(([, s]) => s));
  if (!Object.keys(stimmen).length) return toast("Bitte mindestens einen Vorschlag ankreuzen.");
  await speichere("terminumfrage_antworten", { ...(meineAntwort(u) || {}), id: tuAntwortId(u.id, ich()), umfrage_id: u.id, person_id: ich(), stimmen, kommentar: document.getElementById("tuKommentar")?.value || null, am: new Date().toISOString() });
  toast("✅ Danke – deine Antwort ist gespeichert"); zeichne();
};
AKTIONEN.tuFestlegen = async (x) => {
  const [id, oid] = String(x).split("|"), u = hole("terminumfragen", id), o = u?.optionen.find((y) => y.id === oid); if (!o) return;
  if (!(await frage(`Termin festlegen?\n\n${u.titel}\n${wann(o.beginn)}\n\nDer Termin wird angelegt und alle bekommen Bescheid.`))) return;
  const ende = new Date(Date.parse(o.beginn) + (u.dauer_min || 120) * 60000).toISOString();
  const t = await speichere("termine", { id: neueId(), titel: u.titel, art_id: u.art_id || "ta-sonst", beginn: o.beginn, ende, ort: u.ort || null, fuer_alle: !!u.fuer_alle, gruppen: u.gruppen || [], teilnahme: "erwuenscht", status: "geplant", beschreibung: `Aus der Terminumfrage „${u.titel}“.${u.beschreibung ? "\n" + u.beschreibung : ""}` });
  await speichere("terminumfragen", { ...u, status: "entschieden", gewaehlt: oid, termin_id: t?.id || null });
  senden({ an: tuEmpfaenger(u).filter((p) => p !== ich()), betreff: `📅 Festgelegt: ${u.titel}`, text: `${u.titel} findet am ${wann(o.beginn)} statt${u.ort ? ` (${u.ort})` : ""}. Danke fürs Abstimmen!`, ereignis: "termin" }).catch(() => {});
  toast("📅 Termin angelegt – alle bekommen Bescheid"); zeichne();
};
AKTIONEN.tuAbbrechen = async (id) => { const u = hole("terminumfragen", id); if (u && (await frage("Umfrage abbrechen? Es wird kein Termin angelegt."))) { await speichere("terminumfragen", { ...u, status: "abgebrochen" }); zeichne(); } };
AKTIONEN.tuErinnern = async (id) => {
  const u = hole("terminumfragen", id); if (!u) return;
  const schon = new Set(liste("terminumfrage_antworten", (a) => a.umfrage_id === u.id).map((a) => a.person_id)), an = tuEmpfaenger(u).filter((p) => !schon.has(p) && p !== ich());
  if (!an.length) return toast("👍 Alle haben schon abgestimmt");
  await senden({ an, betreff: `🗳️ Bitte abstimmen: ${u.titel}`, text: `Bitte in der Bachkreis-App unter Termine › 🗳️ Terminumfragen ankreuzen, wann es passt${u.frist ? ` – bis ${new Date(u.frist + "T12:00").toLocaleDateString("de-DE")}` : ""}.`, ereignis: "rundschreiben" });
  toast(`📣 ${an.length} ${an.length === 1 ? "Person" : "Personen"} erinnert`);
};

// ---------- Neue Umfrage ----------
const NF = { optionen: [] };
const lokal = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
AKTIONEN.tuNeu = () => {
  const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(19, 0, 0, 0);
  NF.optionen = [0, 2, 7].map((n) => { const x = new Date(d); x.setDate(x.getDate() + n); return lokal(x); });
  tuForm();
};
function tuForm() {
  const gruppen = liste("gruppen").sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  const frist = new Date(); frist.setDate(frist.getDate() + 5);
  blatt("🗳️ Neue Terminumfrage", `<div id="tuForm" class="vl-form">
    <div class="feld"><label for="tuTitel">Worum geht es? *</label><input id="tuTitel" name="titel" maxlength="120" placeholder="z. B. Elternabend B-Orchester"></div>
    <div class="feld"><label for="tuBesch">Hinweise</label><textarea id="tuBesch" name="beschreibung" rows="2" maxlength="1000"></textarea></div>
    <div class="feld"><label for="tuAn">Wer stimmt ab?</label><select id="tuAn" name="an">${Object.entries(TU_AN).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join("")}</select></div>
    <fieldset class="feld"><legend>Welche Orchester? (nicht für „Leitung, Lehrkräfte & Vorstand“)</legend><label><input type="checkbox" name="fuer_alle"> 🌍 ganzer Bachkreis</label>${gruppen.map((g) => `<label><input type="checkbox" name="gruppen" data-mehr="1" value="${esc(g.id)}"> ${esc(g.name)}</label>`).join("")}</fieldset>
    <div class="vl-raster"><div class="feld"><label for="tuOrt">Ort</label><input id="tuOrt" name="ort" maxlength="120"></div><div class="feld"><label for="tuDauer">Dauer (Min.)</label><input id="tuDauer" name="dauer_min" type="number" min="15" max="1440" value="90"></div>
      <div class="feld"><label for="tuFrist">Abstimmen bis</label><input id="tuFrist" name="frist" type="date" value="${tagIso(frist)}"></div></div>
    <div class="feld"><label for="tuArt">Terminart (für den Termin danach)</label><select id="tuArt" name="art_id">${liste("terminarten").sort((a, b) => (a.sort ?? 9) - (b.sort ?? 9)).map((a) => `<option value="${esc(a.id)}" ${a.id === "ta-sonst" ? "selected" : ""}>${esc(a.sym || "")} ${esc(a.name)}</option>`).join("")}</select></div>
    <fieldset class="feld"><legend>Mögliche Termine (mindestens 2)</legend><div id="tuOptionen">${NF.optionen.map((v, i) => `<div class="tu-opt-zeile"><input type="datetime-local" data-opt="${i}" value="${esc(v)}" aria-label="Vorschlag ${i + 1}"><button type="button" class="knopf klein" data-a="tuOptWeg" data-x="${i}" aria-label="Vorschlag ${i + 1} entfernen">✕</button></div>`).join("")}</div>
      <button type="button" class="knopf klein" data-a="tuOptDazu">＋ Vorschlag</button></fieldset>
    <button type="button" class="knopf haupt breit" data-a="tuAnlegen">🗳️ Umfrage starten</button></div>`);
}
const optLesen = () => [...document.querySelectorAll("#tuOptionen [data-opt]")].map((i) => i.value);
AKTIONEN.tuOptDazu = () => { NF.optionen = optLesen(); const l = NF.optionen.at(-1); const d = l ? new Date(l) : new Date(); d.setDate(d.getDate() + 1); NF.optionen.push(lokal(d)); feldBehalten(tuForm); };
AKTIONEN.tuOptWeg = (i) => { NF.optionen = optLesen(); NF.optionen.splice(Number(i), 1); feldBehalten(tuForm); };
function feldBehalten(neu) { const w = formWerte(document.getElementById("tuForm")); neu(); const f = document.getElementById("tuForm"); if (!f) return;
  for (const [k, v] of Object.entries(w)) { if (k === "gruppen") for (const g of v || []) { const c = f.querySelector(`[name="gruppen"][value="${CSS.escape(g)}"]`); if (c) c.checked = true; } else { const el = f.querySelector(`[name="${k}"]`); if (!el) continue; if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; } } }
AKTIONEN.tuAnlegen = async () => {
  const f = formWerte(document.getElementById("tuForm")), opts = optLesen().filter(Boolean).map((v) => new Date(v)).filter((d) => !Number.isNaN(d.getTime()));
  if (!String(f.titel || "").trim()) return toast("Bitte angeben, worum es geht.");
  if (opts.length < 2) return toast("Bitte mindestens 2 mögliche Termine eintragen.");
  if (f.an !== "verwaltung" && !f.fuer_alle && !(f.gruppen || []).length) return toast("Bitte die Orchester wählen (oder „ganzer Bachkreis“).");
  const u = { id: neueId(), titel: f.titel.trim(), beschreibung: f.beschreibung || null, von: ich(), an: f.an, fuer_alle: !!f.fuer_alle, gruppen: f.fuer_alle ? [] : f.gruppen || [], ort: f.ort || null, dauer_min: Number(f.dauer_min) || 90,
    art_id: f.art_id || null, frist: f.frist || null, status: "offen", optionen: [...new Set(opts.map((d) => d.toISOString()))].sort().map((b, i) => ({ id: `o${i + 1}`, beginn: b })) };
  const z = await speichere("terminumfragen", u); blattZu();
  const an = tuEmpfaenger(u).filter((p) => p !== ich());
  senden({ an, betreff: `🗳️ Terminumfrage: ${u.titel}`, text: `Wann passt es? Bitte in der Bachkreis-App unter Termine › 🗳️ Terminumfragen ankreuzen${u.frist ? ` – bis ${new Date(u.frist + "T12:00").toLocaleDateString("de-DE")}` : ""}.`, ereignis: "rundschreiben" }).catch(() => {});
  toast(`🗳️ Umfrage gestartet – ${an.length} ${an.length === 1 ? "Person bekommt" : "Personen bekommen"} Bescheid`); zeige("terminumfrage", { id: z?.id || u.id });
};
startseiteVerbinden({ tuOffen: offeneFuerMich }); // „Für dich“ auf der Startseite
