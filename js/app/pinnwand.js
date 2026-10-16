// 📌 Pinnwand wie in der KC Club App (KC-CLUB-PINNWAND und Folgeversionen): Korkwand mit Post-its in vier Farben
// (1 gelb · 2 rosé · 3 hellgrün · 4 hellblau), höchstens PINNWAND.max Zettel je Person mit je PINNWAND.zeichen Zeichen,
// Wichtigkeit (❗ beim Öffnen zeigen), für wen (nur ich · alle · bestimmte), Antwort-Knopf, „✓ Erledigt“ je Person,
// „👁️ gelesen x/y“ für den Verfasser, neue Zettel gehen als Post-it-Fenster auf, Erinnerung an eigene alte Zettel.
// Rechte und Farben erzwingt der Server (supabase/functions/_shared/regeln.js) – hier wird nur angezeigt und vorbereitet.
import { S, VIEWS, zeige, zeichne, kopf, name, vorname, istLeitung, istVerwalter, einst } from "./zustand.js";
import { esc, AKTIONEN, toast, uhr, frage, $ } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele, loesche, konfig, abonnieren, neueId, istEchtbetrieb, jetztAbgleichen } from "../kern/daten.js";
import { PINNWAND, pwSichtbar, pwEmpfaenger, pwGelesenId, pwAppPerson } from "../kern/schema.js";
import { senden } from "../kern/versand.js";
import { reisswolf, zettelAnpinnen } from "./effekte.js";

const PW = { form: null, wichtigStart: false };
const ich = () => S.ich?.id;
const jetztIso = () => new Date().toISOString();

// Je Gerät gemerkt (reine Komfortfunktion wie KC „kc_club_pw_gemeldet“): welche Zettel schon als Fenster aufgingen
const GEMELDET_MAX = 200;
const gemeldet = new Set((() => { try { return JSON.parse(localStorage.getItem("bk_pw_gemeldet") || "[]"); } catch { return []; } })());
function gemeldetMerken(ids) {
  ids.forEach((id) => gemeldet.add(id));
  try { localStorage.setItem("bk_pw_gemeldet", JSON.stringify([...gemeldet].slice(-GEMELDET_MAX))); } catch {}
}

// ---------- Daten ----------
export const pwZettel = () => liste("pinnwand", (z) => pwSichtbar(z, ich())).sort((a, b) => (b.wichtig ? 1 : 0) - (a.wichtig ? 1 : 0) || String(b.zeit || "").localeCompare(String(a.zeit || "")));
const gelesen = (zid, pid = ich()) => hole("pinnwand_gelesen", pwGelesenId(zid, pid));
const erledigtAm = (z) => (z.fuer === "ich" ? null : gelesen(z.id)?.erledigt_am || null);
const meine = () => liste("pinnwand", (z) => z.von === ich());
// wichtig und noch offen (eigene Zettel „nur für mich“ zählen mit – sie sind ein Merkzettel)
const pwOffen = (z) => z.wichtig && !erledigtAm(z) && (z.von !== ich() || z.fuer === "ich");
// Zahl auf der Kachel: fremde Zettel, die ich noch nicht abgehakt habe
export const pwOffenZahl = () => (S.ich ? pwZettel().filter((z) => z.von !== ich() && z.fuer !== "ich" && !erledigtAm(z)).length : 0);
const freieFarbe = () => { const belegt = new Set(meine().map((z) => Number(z.farbe))); return [1, 2, 3, 4].find((n) => !belegt.has(n)) ?? 1; };
const fristen = () => {
  const k = konfig(), zahl = (v, s) => (Number(v) > 0 ? Number(v) : s);
  return { erinnernTage: zahl(k.pinnwand_erinnern_tage, PINNWAND.erinnernTage), pauseTage: zahl(k.pinnwand_pause_tage, PINNWAND.pauseTage) };
};

// ---------- Darstellung eines Zettels ----------
// leicht schräg – je Zettel immer gleich (aus der ID), damit beim Neuzeichnen nichts wackelt
const dreh = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * 0.8 + (h % 2 ? 0.4 : -0.4); };
const farbe = (z) => " f" + ([1, 2, 3, 4].includes(Number(z.farbe)) ? Number(z.farbe) : 1);
const tagMonat = (iso) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`; };
const zeitKurz = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? uhr(iso) : `${tagMonat(iso)} ${uhr(iso)}`; };
const vorn = (id) => (id === ich() ? S.ich?.vorname || "mir" : vorname(id) || name(id).split(" ")[0] || "?");
const zKopf = (wer, iso) => `<div class="zkopf">von <b>${esc(wer)}</b>${iso ? `<br>angepinnt am ${tagMonat(iso)} ${uhr(iso)}` : ""}</div>`;
const fuerText = (z) => (z.fuer === "ich" ? "nur für mich" : z.fuer === "personen" ? "für " + (z.personen || []).map(vorn).join(", ") : "für alle");
const privat = (z) => z.fuer === "personen" && (z.personen || []).length === 1;
const hinweisText = (z, wichtig = z.wichtig) => `Du hast ein neues ${wichtig ? "wichtiges " : ""}${privat(z) ? "privates " : ""}Post-it von ${vorn(z.von)} bekommen`;

function leserHtml(z) {
  const lese = liste("pinnwand_gelesen", (g) => g.zettel_id === z.id && g.person_id !== z.von).sort((a, b) => String(a.gesehen_am).localeCompare(String(b.gesehen_am)));
  const empf = pwEmpfaenger(z, liste("personen"));
  const anzahl = Number.isFinite(z.anzahl) ? z.anzahl : empf.length;
  // „Noch nicht gesehen“ nur, wenn alle Empfänger bekannt sind (Verwalter sehen alle Personen, sonst nur bei bestimmten Empfängern)
  const offen = istVerwalter() || z.fuer === "personen" ? empf.filter((id) => !lese.some((g) => g.person_id === id)).map(vorn).sort() : [];
  return `<details><summary>👁️ gelesen ${lese.length}/${anzahl} · ✓ erl. ${lese.filter((l) => l.erledigt_am).length}</summary>`
    + lese.map((l) => `<div>${esc(vorn(l.person_id))}: gesehen ${zeitKurz(l.gesehen_am)}${l.erledigt_am ? ` · ✓ ${zeitKurz(l.erledigt_am)}` : ""}</div>`).join("")
    + (offen.length ? `<div style="margin-top:4px">Noch nicht gesehen: ${offen.map(esc).join(", ")}</div>` : "") + `</details>`;
}

function zettelHtml(z) {
  const mein = z.von === ich(), erl = erledigtAm(z), k = [];
  if (!mein && z.antworten !== false) k.push(`<button class="antw" data-a="pwAntworten" data-x="${esc(z.id)}">✍️ Antworten</button>`);
  if (!mein && z.fuer !== "ich") k.push(erl ? `<button class="erl" data-a="pwErledigt" data-x="${esc(z.id)}:zurueck">✓ erledigt ${zeitKurz(erl)}</button>` : `<button data-a="pwErledigt" data-x="${esc(z.id)}">✓ Erledigt</button>`);
  if (mein) k.push(`<button data-a="pwWichtig" data-x="${esc(z.id)}">${z.wichtig ? "❗ nicht mehr wichtig" : "❗ wichtig machen"}</button>`);
  if (mein || istLeitung()) k.push(`<button data-a="pwAbnehmen" data-x="${esc(z.id)}">🗑️ abnehmen</button>`);
  return `<div class="zettel${z.wichtig ? " wichtig" : ""}${farbe(z)}${erl ? " erledigt" : ""}" data-zid="${esc(z.id)}" style="--dreh:${dreh(z.id)}deg">`
    + (z.wichtig ? `<span class="zwichtig">❗ WICHTIG</span>` : "") + zKopf(vorn(z.von), z.zeit)
    + `<div class="ztext">${esc(z.text)}</div><div class="zfuss">${esc(fuerText(z))}</div>`
    + ((mein || istLeitung()) && z.fuer !== "ich" ? leserHtml(z) : "") + (k.length ? `<div class="zknoepfe">${k.join("")}</div>` : "") + `</div>`;
}

// 🎂 Aushang (wie KC Geburtstags-Zettel / Hilfe-Aushang): wer heute Geburtstag hat und ihn freigegeben hat – grün, zählt nicht zu den 4 Zetteln
function geburtstage() {
  const h = new Date(), md = `${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  return liste("personen", (p) => p.status === "aktiv" && (p.id === ich() ? (p.geburtsdatum || "").slice(5, 10) === md : (p.freigaben?.geburtstag || p.gb_md) && (p.gb_md || (p.geburtsdatum || "").slice(5, 10)) === md));
}
function aushangHtml() {
  return geburtstage().slice(0, 6).map((p) => `<div class="zettel aushang" style="--dreh:${dreh("gb" + p.id)}deg"><span class="zwichtig">🎂 GEBURTSTAG</span>
    <div class="ztext">${p.id === ich() ? "Alles Gute zum Geburtstag! 🥳" : `${esc(name(p))} hat heute Geburtstag 🎉`}</div>
    ${p.id === ich() ? `<div class="zfuss">Der Bachkreis gratuliert dir ganz herzlich! 🎻</div>` : `<div class="zknoepfe"><button class="antw" data-a="pwGratulieren" data-x="${esc(p.id)}">🎂 Ich möchte gratulieren</button></div>`}</div>`).join("");
}

// ---------- Formular „＋ Zettel“ ----------
const EMO = ["🎻", "🎵", "🤒", "💐", "🍀", "💪", "❤️", "🙏", "🤗", "🎂", "🎉", "👍", "☀️", "👏"];
function neuesFormular(vorgabe = {}) {
  PW.form = { text: "", wichtig: false, fuer: "", personen: [], antworten: true, antwortAn: null, suche: "", ...vorgabe };
}
const zeichen = (t) => [...String(t || "")].length;
function formHtml() {
  const f = PW.form, voll = meine().length >= PINNWAND.max, n = zeichen(f.text);
  const knopf = (aktion, x, an, t) => `<button type="button" data-a="${aktion}" data-x="${x}" class="${an ? "an" : ""}">${t}</button>`;
  const leute = f.fuer === "personen" ? liste("personen", (p) => pwAppPerson(p) && p.id !== ich()).sort((a, b) => name(a).localeCompare(name(b), "de")) : [];
  const q = f.suche.toLowerCase();
  return `<div id="pwForm" class="karte">
    ${f.antwortAn ? `<div class="hinweis" style="margin:0 0 8px">↩️ Antwort an <b>${esc(f.antwortAn.name)}</b> – vorausgewählt nur für ${esc(f.antwortAn.name)} (privat). Für alle? Unten „👥 Für alle“ tippen.</div>` : ""}
    ${voll ? `<div class="hinweis pw-voll"><b>Du hast schon ${PINNWAND.max} Zettel hängen.</b> Nimm einen ab, dann kannst du anheften:${meine().map((z) => `<div class="zeile"><span class="zettelpunkt${farbe(z)}"></span><span style="flex:1">${esc(String(z.text).slice(0, 60))}${zeichen(z.text) > 60 ? " …" : ""}</span><button class="knopf klein" data-a="pwAbnehmen" data-x="${esc(z.id)}">🗑️ abnehmen</button></div>`).join("")}</div>` : ""}
    <div class="feld"><label class="pw-kopfzeile" for="pwText">Kurze Nachricht <span class="zaehler200${n >= PINNWAND.zeichen ? " voll" : n >= PINNWAND.zeichen - 20 ? " knapp" : ""}" id="pwZaehler" aria-live="polite">${n} / ${PINNWAND.zeichen} Zeichen</span></label>
      <textarea id="pwText" rows="3" maxlength="${PINNWAND.zeichen}" placeholder="z. B. Notenmappen bitte bis Freitag abgeben">${esc(f.text)}</textarea></div>
    <div class="pw-emo">${EMO.map((e) => `<button type="button" data-a="pwEmo" data-x="${e}" aria-label="Emoji ${e} einfügen">${e}</button>`).join("")}</div>
    <div class="hinweis" style="margin:8px 0 4px">Wichtigkeit</div>
    <div class="umschalter" id="pwWichtig">${knopf("pwFormWichtig", "0", !f.wichtig, "📝 Normal")}${knopf("pwFormWichtig", "1", f.wichtig, "❗ Hoch – beim Öffnen zeigen")}</div>
    <div class="hinweis" style="margin:4px 0 4px">Für wen?</div>
    <div class="umschalter" id="pwFuer">${knopf("pwFuer", "ich", f.fuer === "ich", "🙋 Nur für mich")}${knopf("pwFuer", "alle", f.fuer === "alle", "👥 Für alle")}${knopf("pwFuer", "personen", f.fuer === "personen", "✅ Bestimmte")}</div>
    ${f.fuer === "personen" ? `<div id="pwPersonen"><div class="feld"><label for="pwSuche">Name suchen</label><input id="pwSuche" placeholder="🔍 z. B. Anna" value="${esc(f.suche)}" autocomplete="off"></div>
      <div class="wahlliste" id="pwListe">${leute.map((p) => `<label data-name="${esc(name(p).toLowerCase())}"${q && !name(p).toLowerCase().includes(q) ? " hidden" : ""}><input type="checkbox" data-c="pwWahl" value="${esc(p.id)}" ${f.personen.includes(p.id) ? "checked" : ""}><span style="flex:1">${esc(name(p))}</span></label>`).join("") || '<div class="leer">Niemand gefunden</div>'}</div>
      <div class="hinweis" id="pwGewaehlt">${f.personen.length ? "Für: " + f.personen.map((id) => esc(vorn(id))).join(", ") : "Noch niemand ausgewählt"}</div></div>` : ""}
    ${f.fuer !== "ich" ? `<div id="pwAntwZeile"><div class="hinweis" style="margin:4px 0 4px">Sollen andere darauf antworten können?</div>
      <div class="umschalter" id="pwAntw">${knopf("pwAntw", "1", f.antworten, "✍️ Mit Antwort-Knopf")}${knopf("pwAntw", "0", !f.antworten, "🚫 Ohne Antwort-Knopf")}</div></div>` : ""}
    <div class="knopfreihe"><button class="knopf haupt" id="pwSpeichernKnopf" data-a="pwAnheften" ${voll ? "disabled" : ""}>📌 Anheften</button><button class="knopf" data-a="pwAbbrechen">Abbrechen</button></div></div>`;
}

// ---------- Ansicht ----------
VIEWS.pinnwand = {
  render() {
    const zs = pwZettel(), m = meine().length, voll = m >= PINNWAND.max, wichtigOffen = zs.filter(pwOffen).length;
    const aushang = aushangHtml();
    return kopf("📌 Pinnwand", `<button class="knopf haupt klein" id="pwNeuKnopf" data-a="pwNeu" title="Du hast ${m} von ${PINNWAND.max} Zetteln hängen">＋ Zettel <span class="pwStand${voll ? " voll" : ""}">${m}/${PINNWAND.max}</span></button>`)
      + (PW.wichtigStart && wichtigOffen ? `<div class="karte pw-hinweis-wichtig"><b>❗ ${wichtigOffen === 1 ? "Ein wichtiger Zettel" : wichtigOffen + " wichtige Zettel"} für dich.</b> Bitte lesen und mit „✓ Erledigt“ abhaken.</div>` : "")
      + (voll && !PW.form ? `<div class="hinweis pw-voll">📌 Du hast schon <b>${PINNWAND.max} von ${PINNWAND.max}</b> Zetteln hängen. Für einen neuen erst einen eigenen abnehmen – mit <b>🗑️ abnehmen</b> auf deinem Zettel oder über „＋ Zettel“.</div>` : "")
      + (PW.form ? formHtml() : "")
      + `<div class="kork" id="pwWand">${aushang}${zs.map(zettelHtml).join("")}${!zs.length && !aushang ? `<div class="leer">Noch keine Zettel an der Pinnwand.<br>Mit „＋ Zettel“ einen anheften.</div>` : ""}</div>`
      + `<p class="hinweis" style="margin-top:12px">Jeder darf höchstens <b>${PINNWAND.max} Zettel</b> gleichzeitig anheften – der 1. gelb, der 2. rosé, der 3. hellgrün, der 4. hellblau, je höchstens <b>${PINNWAND.zeichen} Zeichen</b>. „✓ Erledigt“ zeigt dem Verfasser, dass du es gelesen und erledigt hast.</p>`;
  },
  nach() { setTimeout(gesehenMarkieren, 0); },
};

// „gesehen“ beim ersten Anzeigen erfassen (erste Zeit bleibt stehen); eigene Zettel zählen nicht – wie KC
let markiertLaeuft = false;
async function gesehenMarkieren(ids = null) {
  if (!S.ich || markiertLaeuft) return;
  const neu = pwZettel().filter((z) => z.von !== ich() && (!ids || ids.includes(z.id)) && !gelesen(z.id))
    .map((z) => ({ id: pwGelesenId(z.id, ich()), zettel_id: z.id, person_id: ich(), gesehen_am: jetztIso(), erledigt_am: null }));
  if (!neu.length) return;
  markiertLaeuft = true;
  try { await speichereViele("pinnwand_gelesen", neu); gemeldetMerken(neu.map((g) => g.zettel_id)); } finally { markiertLaeuft = false; }
}

function formNeuZeichnen(fokus) {
  zeichne();
  const el = fokus && document.getElementById(fokus);
  if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} }
}
function zumFormular() {
  if (S.view !== "pinnwand") zeige("pinnwand"); else zeichne();
  const f = document.getElementById("pwForm");
  f?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("pwText")?.focus();
}

// Tippen im Formular: Text und Suche im Zustand halten, ohne neu zu zeichnen (Fokus bleibt)
document.addEventListener("input", (e) => {
  if (!PW.form) return;
  if (e.target.id === "pwText") {
    PW.form.text = e.target.value;
    const n = zeichen(PW.form.text), z = document.getElementById("pwZaehler");
    if (z) { z.textContent = `${n} / ${PINNWAND.zeichen} Zeichen`; z.classList.toggle("knapp", n >= PINNWAND.zeichen - 20 && n < PINNWAND.zeichen); z.classList.toggle("voll", n >= PINNWAND.zeichen); }
  } else if (e.target.id === "pwSuche") {
    PW.form.suche = e.target.value; const q = PW.form.suche.toLowerCase();
    document.querySelectorAll("#pwListe label[data-name]").forEach((l) => { l.hidden = !!q && !l.dataset.name.includes(q); });
  }
});

AKTIONEN.pwNeu = () => { if (!PW.form) neuesFormular(); zumFormular(); };
AKTIONEN.pwAbbrechen = () => { PW.form = null; zeichne(); };
AKTIONEN.pwFormWichtig = (x) => { PW.form.wichtig = x === "1"; formNeuZeichnen(); };
AKTIONEN.pwAntw = (x) => { PW.form.antworten = x === "1"; formNeuZeichnen(); };
AKTIONEN.pwFuer = (x) => { PW.form.fuer = x; formNeuZeichnen(x === "personen" ? "pwSuche" : null); };
AKTIONEN.pwWahl = (id, el) => {
  const f = PW.form; f.personen = el.checked ? [...new Set([...f.personen, id])] : f.personen.filter((p) => p !== id);
  const g = document.getElementById("pwGewaehlt"); if (g) g.textContent = f.personen.length ? "Für: " + f.personen.map(vorn).join(", ") : "Noch niemand ausgewählt";
};
AKTIONEN.pwEmo = (e) => {
  const t = document.getElementById("pwText"); if (!t) return;
  if (zeichen(t.value) + zeichen(e) > PINNWAND.zeichen) return toast(`Höchstens ${PINNWAND.zeichen} Zeichen.`);
  const a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
  t.value = t.value.slice(0, a) + e + t.value.slice(b);
  t.focus(); try { t.setSelectionRange(a + e.length, a + e.length); } catch {}
  t.dispatchEvent(new Event("input", { bubbles: true }));
};

AKTIONEN.pwAnheften = async () => {
  const f = PW.form, text = String(document.getElementById("pwText")?.value ?? f.text).trim();
  if (!text) return toast("Bitte eine kurze Nachricht schreiben.");
  if (zeichen(text) > PINNWAND.zeichen) return toast(`Höchstens ${PINNWAND.zeichen} Zeichen.`);
  if (!f.fuer) return toast("Bitte wählen: nur für mich, für alle oder bestimmte Personen.");
  if (f.fuer === "personen" && !f.personen.length) return toast("Bitte mindestens eine Person auswählen.");
  if (meine().length >= PINNWAND.max) return toast(`Du hast schon ${PINNWAND.max} Zettel an der Pinnwand – bitte erst einen abnehmen.`);
  const z = { id: neueId(), text, von: ich(), wichtig: !!f.wichtig, fuer: f.fuer, personen: f.fuer === "personen" ? f.personen : [], antworten: f.fuer !== "ich" && f.antworten !== false, farbe: freieFarbe(), zeit: jetztIso() };
  z.anzahl = pwEmpfaenger(z, liste("personen")).length;
  const antwort = !!f.antwortAn;
  await speichere("pinnwand", z);
  PW.form = null;
  if (S.view !== "pinnwand") zeige("pinnwand"); else zeichne();
  toast(antwort ? "📌 Antwort angeheftet" : "📌 Angeheftet");
  zettelAnpinnen(document.querySelector(`#pwWand .zettel[data-zid="${CSS.escape(z.id)}"]`));
  if (z.fuer !== "ich") bescheidGeben(z, false);
};

// Push/Mail über den BK Communicator (Regel „pinnwand“). Im Echtbetrieb bestimmt der Server die Empfänger aus dem Zettel.
async function bescheidGeben(z, wichtig) {
  const fertig = new Set(wichtig ? liste("pinnwand_gelesen", (g) => g.zettel_id === z.id && g.erledigt_am).map((g) => g.person_id) : []);
  const an = pwEmpfaenger(z, liste("personen")).filter((id) => !fertig.has(id));
  const kopfText = hinweisText(z, wichtig || z.wichtig);
  try {
    if (istEchtbetrieb()) await jetztAbgleichen(); // der Zettel muss beim Server sein, bevor er Bescheid gibt
    const r = await senden({ an, betreff: `📌 ${kopfText}`, text: `${kopfText}:\n\n„${z.text}“`, ereignis: "pinnwand", zettel_id: z.id, wichtig });
    return (r.push || 0) + (r.mail || 0) + (r.app || 0) + (r.vorgemerkt || 0);
  } catch (e) { console.warn("Pinnwand-Bescheid", e); return 0; }
}

AKTIONEN.pwErledigt = async (x) => {
  const [id, zurueck] = String(x).split(":"), z = hole("pinnwand", id); if (!z) return;
  const g = gelesen(id);
  await speichere("pinnwand_gelesen", { id: pwGelesenId(id, ich()), zettel_id: id, person_id: ich(), gesehen_am: g?.gesehen_am || jetztIso(), erledigt_am: zurueck ? null : jetztIso() });
  zeichne();
  if (!zurueck) toast("✓ Erledigt – der Verfasser sieht es");
};

// nachträglich ❗ wichtig (KC-CLUB-PINNWAND-WICHTIG-NACHTRAEGLICH) – auf Wunsch mit erneutem Bescheid an alle, die noch nicht abgehakt haben
AKTIONEN.pwWichtig = async (id) => {
  const z = hole("pinnwand", id); if (!z || z.von !== ich()) return;
  const an = !z.wichtig;
  const bescheid = an && z.fuer !== "ich" ? await frage("❗ Zettel als wichtig markieren.\n\nSollen die Empfänger, die ihn noch nicht abgehakt haben, nochmal Bescheid bekommen?\n\nOK = 🔔 Ja, Bescheid geben · Abbrechen = nur markieren") : false;
  await speichere("pinnwand", { ...z, wichtig: an });
  zeichne();
  if (!an) return toast("Nicht mehr als wichtig markiert");
  const n = bescheid ? await bescheidGeben({ ...z, wichtig: true }, true) : 0;
  toast(bescheid ? (n ? `❗ Wichtig – Bescheid ist unterwegs` : "❗ Wichtig markiert – alle haben ihn schon abgehakt") : "❗ Jetzt als wichtig markiert");
};

AKTIONEN.pwAbnehmen = async (id) => {
  if (!(await frage("Zettel von der Pinnwand abnehmen?"))) return;
  await reisswolf(document.querySelector(`.zettel[data-zid="${CSS.escape(id)}"]`));
  await loesche("pinnwand", id);
  document.getElementById("pwErinnernHg")?.remove();
  zeichne(); toast("🗑️ Abgenommen");
};

function antwortVorbereiten(z) {
  neuesFormular({ fuer: "personen", personen: [z.von], antwortAn: { id: z.von, name: vorn(z.von) } });
  zumFormular();
}
AKTIONEN.pwAntworten = (id) => { const z = hole("pinnwand", id); if (z) antwortVorbereiten(z); };
AKTIONEN.pwGratulieren = (pid) => {
  const p = hole("personen", pid); if (!p) return;
  neuesFormular({ fuer: "personen", personen: [pid], text: `Alles Gute zum Geburtstag, ${p.vorname}! 🎂 `, antwortAn: { id: pid, name: p.vorname } });
  zumFormular();
};

// ---------- Post-it-Fenster: neue Zettel gehen direkt auf (KC-CLUB-PINNWAND-DIREKT) ----------
function fenster(id, inhalt) {
  document.getElementById(id)?.remove();
  const hg = document.createElement("div"); hg.className = "blatt-hg pw-fenster-hg"; hg.id = id;
  hg.innerHTML = `<div class="blatt" role="dialog" aria-modal="true">${inhalt}</div>`;
  hg.addEventListener("click", (e) => { if (e.target === hg) hg.remove(); });
  document.body.appendChild(hg);
  return hg;
}
const fensterOffen = () => !!document.querySelector(".blatt-hg");
let FENSTER_LISTE = [];
function pwFenster(neu) {
  const l = [...neu].sort((a, b) => (b.wichtig ? 1 : 0) - (a.wichtig ? 1 : 0)).slice(0, 5);
  FENSTER_LISTE = l.map((z) => z.id);
  gemeldetMerken(FENSTER_LISTE);
  fenster("pwFensterHg", `<h3 style="margin:0">📌 ${esc(l.length === 1 ? hinweisText(l[0]) : `Du hast ${neu.length} neue Zettel bekommen`)}</h3>
    <div class="pwfenster-zettel">${l.map((z) => `<div class="zettel${z.wichtig ? " wichtig" : ""}${farbe(z)}" style="--dreh:${dreh(z.id)}deg">
      ${z.wichtig ? '<span class="zwichtig">❗ WICHTIG</span>' : ""}${zKopf(vorn(z.von), z.zeit)}<div class="ztext">${esc(z.text)}</div>
      ${privat(z) ? '<div class="zfuss">nur für dich</div>' : ""}${z.antworten !== false ? `<div class="zknoepfe"><button class="antw" data-a="pwFensterAntworten" data-x="${esc(z.id)}">✍️ Antworten</button></div>` : ""}</div>`).join("")}</div>
    ${neu.length > l.length ? `<p class="hinweis" style="margin:0">… und ${neu.length - l.length} weitere an der Pinnwand</p>` : ""}
    <button class="knopf haupt breit" data-a="pwFensterGelesen">✓ Gelesen</button>
    <button class="knopf breit" data-a="pwFensterWand" style="margin-top:8px">📌 Zur Pinnwand</button>`);
}
const fensterZu = () => document.getElementById("pwFensterHg")?.remove();
AKTIONEN.pwFensterGelesen = () => { fensterZu(); gesehenMarkieren(FENSTER_LISTE); };
AKTIONEN.pwFensterWand = () => { fensterZu(); zeige("pinnwand"); };
AKTIONEN.pwFensterAntworten = (id) => { fensterZu(); gesehenMarkieren(FENSTER_LISTE); AKTIONEN.pwAntworten(id); };

const neueFremde = () => pwZettel().filter((z) => z.von !== ich() && !gelesen(z.id) && !gemeldet.has(z.id));

// ---------- Erinnerung an eigene alte Zettel (KC-CLUB-PINNWAND-ERINNERUNG / -FRISTEN) ----------
// „Hängen lassen“ fragt für diese Zettel frühestens nach pauseTage wieder (je Gerät gemerkt)
const erinnertLesen = () => { try { return JSON.parse(localStorage.getItem("bk_pw_erinnert") || "{}"); } catch { return {}; } };
function pwErinnern() {
  const { erinnernTage, pauseTage } = fristen(), bis = erinnertLesen(), jetzt = Date.now();
  const alt = meine().filter((z) => jetzt - new Date(z.zeit).getTime() >= erinnernTage * 86400000 && !(bis[z.id] && new Date(bis[z.id]).getTime() > jetzt))
    .sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)));
  if (!alt.length) return false;
  fenster("pwErinnernHg", `<h3 style="margin:0">📌 ${alt.length === 1 ? `Dein Zettel vom ${tagMonat(alt[0].zeit)} hängt noch an der Pinnwand.` : `Deine ${alt.length} Zettel hängen noch an der Pinnwand.`}</h3>
    <p style="margin:4px 0 0">Möchtest du ${alt.length === 1 ? "ihn" : "sie"} abnehmen?</p>
    <div class="pwfenster-zettel">${alt.map((z) => `<div class="zettel${z.wichtig ? " wichtig" : ""}${farbe(z)}" data-zid="${esc(z.id)}" style="--dreh:${dreh(z.id)}deg">
      ${z.wichtig ? '<span class="zwichtig">❗ WICHTIG</span>' : ""}${zKopf(vorn(z.von), z.zeit)}<div class="ztext">${esc(z.text)}</div>
      <div class="zfuss">${esc(fuerText(z))}</div><div class="zknoepfe"><button class="antw" data-a="pwAbnehmen" data-x="${esc(z.id)}">🗑️ Abnehmen</button></div></div>`).join("")}</div>
    <button class="knopf breit" data-a="pwErinnernLassen" data-x="${alt.map((z) => z.id).join(",")}">📌 ${alt.length === 1 ? "Hängen lassen" : "Alle hängen lassen"}</button>`);
  return true;
}
AKTIONEN.pwErinnernLassen = (ids) => {
  document.getElementById("pwErinnernHg")?.remove();
  const { pauseTage } = fristen(), bis = erinnertLesen(), spaeter = new Date(Date.now() + pauseTage * 86400000).toISOString();
  for (const id of String(ids).split(",")) bis[id] = spaeter;
  const haengen = new Set(meine().map((z) => z.id));
  for (const id of Object.keys(bis)) if (!haengen.has(id)) delete bis[id]; // abgenommene vergessen
  try { localStorage.setItem("bk_pw_erinnert", JSON.stringify(bis)); } catch {}
  toast(`📌 Bleibt hängen – ich erinnere dich in ${pauseTage} Tagen wieder`);
};

// ---------- Beim Öffnen der App (KC pwStart): neue Zettel → Fenster; sonst wichtige offene → Pinnwand; sonst Erinnerung ----------
let abonniert = false;
export function pinnwandStart() {
  if (!abonniert) { abonniert = true; abonnieren(neueImLauf); }
  if (!S.ich || fensterOffen()) return false;
  const neu = neueFremde();
  if (neu.length) { pwFenster(neu); return true; }
  if (pwZettel().some(pwOffen) && S.view === "start") { PW.wichtigStart = true; zeige("pinnwand"); return true; }
  return pwErinnern();
}

// Bei geöffneter App: neue Zettel (Abgleich, anderes Fenster) gehen einmal je Gerät als Fenster auf (KC-CLUB-PINNWAND-LIVE)
function neueImLauf(tabs) {
  if (!S.ich || !(tabs || []).includes("pinnwand") || document.hidden || S.view === "pinnwand" || fensterOffen()) return;
  const neu = neueFremde();
  if (!neu.length) return;
  pwFenster(neu);
  if (einst().ton !== false) try { navigator.vibrate?.([30, 40, 30]); } catch {}
}
document.addEventListener("bk-ansicht", () => { if (S.view !== "pinnwand") PW.wichtigStart = false; });
