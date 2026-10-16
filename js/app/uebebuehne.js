// 🎭🎻 Übe-Bühne (0.26.0): Üben auf der Bühne. Vorne sitzt der eigene Avatar mit dem eigenen Instrument, das Orchester begleitet.
// Übe-Arten: 🎼 Mitspielen (Tempo, Stelle, Schleife, Tempo steigern) · ✋ Noten & Griffe · 🥁 Rhythmus (mittippen, Auswertung)
// 🎯 Stimmgerät & Ton halten (Mikrofon nur im Gerät) · 👂 Ohr-Spiele. Aufgaben der Lehrkräfte öffnen die passende Übe-Art direkt;
// Ergebnisse sind nur Zahlen (Sterne, Tempo, Minuten), geübte Zeit geht ins Übe-Tagebuch. Vorspiel-Aufnahme nur mit Einwilligung.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, einst, einstSetzen, istEltern, istSchueler, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, frage } from "../kern/ui.js";
import { liste, hole, speichere, loesche } from "../kern/daten.js";
import { kinderVon, registerVon, tagIso, einwilligung, aufgabeGiltFuer, aufgabeKinder, uebeZielErreicht, uebeStand } from "../kern/logik.js";
import { UEBE_ARTEN, UEBE_STUECKE, UEBE_TONARTEN, UEBE_SPIELE, UEBE_AUFNAHME_TAGE, istMinderjaehrig } from "../kern/schema.js";
import { stimmeErzeugen, notenSvg, INSTRUMENTE, instrumentVon, transVz } from "../kern/notensatz.js";
import { instrumentSpielen, STUECKE, midi } from "../kern/musik.js";
import { tonleiterSt, stelleSt, taktZahl, notenName, hatTonumfang } from "../kern/uebematerial.js";
import { musterLesen, musterText, musterPruefen, einsaetze, rhythmusSt, bewerten, tippUrteil, RHYTHMUS_STUFEN, NOTENWERTE } from "../kern/rhythmus.js";
import { griff, griffSvg } from "../kern/griffe.js";
import { tonhoehe, centZu, stimmUrteil } from "../kern/stimmton.js";
import { BUEHNE_MODI, orchesterSvg, sekAn, soloMoeglich } from "./buehne.js";
import { hochladen, dateiUrl, dateiOeffnen } from "../kern/dateien.js";
import { senden } from "../kern/versand.js";

const MODI = {
  mitspielen: { sym: "🎼", t: "Mitspielen", u: "Das Orchester begleitet dich", inhalt: "stueck" },
  griffe: { sym: "✋", t: "Noten & Griffe", u: "Welcher Ton, welcher Griff?", inhalt: "technik" },
  rhythmus: { sym: "🥁", t: "Rhythmus", u: "Hören und mittippen", inhalt: "rhythmus" },
  stimmen: { sym: "🎯", t: "Stimmgerät", u: "Stimmen und Ton halten", inhalt: "technik" },
  gehoer: { sym: "👂", t: "Ohr-Spiele", u: "Höher? Dur oder Moll?", inhalt: "gehoer" },
};
const ART_MODUS = { notenstelle: "mitspielen", rhythmus: "rhythmus", tonleiter: "griffe", tonhalten: "stimmen", gehoer: "gehoer" };
const INST_WAHL = ["v1", "v2", "va", "vc", "kb", "fl", "ob", "kl", "fg", "hr", "tr", "pos", "tb", "sw"];
const TEMPI = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
const UB = { pid: null, inst: null, modus: null, aufgabe: null, seit: null, inhalt: new Set(), modusSeit: null, gen: 0, timer: [],
  stueck: "menuett", von: 1, bis: 8, faktor: 0.7, eigene: "an", schleife: true, steigern: false, einzaehlen: true, laeuft: false, runden: 0, bewerten: false,
  quelle: "stueck", tonart: "G", oktaven: 1, gi: 0,
  stufe: "r1", rbpm: 80, phase: "bereit", taps: [], t0: 0, rErgebnis: null, rHilfe: false,
  mic: null, ziel: null, halten: 0, gehalten: 0, haltenStart: 0, fertig: false,
  spiel: "hoehe", gr: null };
let AC = null;
const sterneText = (n) => "⭐".repeat(n || 0) + "☆".repeat(Math.max(0, 3 - (n || 0)));
const lehrt = () => hatRolle("admin", "leitung", "lehrkraft");
const leute = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);
const istKind = (pid) => hole("personen", pid)?.typ === "schueler";
const aufgabe = () => (UB.aufgabe ? hole("uebeaufgaben", UB.aufgabe) : null);

// ---------- Wer übt, mit welchem Instrument? ----------
function wer() { const l = leute(); if (!l.includes(UB.pid)) UB.pid = l[0] || S.ich.id; return UB.pid; }
function instVon(pid) {
  const rid = registerVon(db, pid), k = rid ? instrumentVon(hole("register", rid)?.name) : null;
  return k && INST_WAHL.includes(k) ? k : null;
}
function inst() {
  if (!UB.inst) UB.inst = instVon(wer()) || einst().ubInst || "v1";
  return UB.inst;
}

// ---------- Ton (eine AudioContext je Durchgang; Stopp = schließen) ----------
function audioNeu() {
  audioStopp();
  const K = window.AudioContext || window.webkitAudioContext;
  if (!K) { toast("Dieses Gerät kann keine Musik erzeugen"); return null; }
  AC = new K(); AC.resume?.();
  return AC;
}
function audioStopp() {
  UB.gen++; UB.timer.forEach(clearTimeout); UB.timer = [];
  try { AC?.close(); } catch {}
  AC = null; UB.laeuft = false;
  document.querySelectorAll("#ubNoten .an").forEach((e) => e.classList.remove("an"));
}
const spater = (ms, f) => { const g = UB.gen; UB.timer.push(setTimeout(() => { if (UB.gen === g) f(); }, ms)); };
const anzeige = (t) => { const e = document.getElementById("ubAnzeige"); if (e) e.textContent = t; };
function sitzung() { UB.seit ||= Date.now(); UB.modusSeit ||= Date.now(); if (UB.modus) UB.inhalt.add(MODI[UB.modus].inhalt); }
const minutenSeit = (t) => (t ? Math.max(1, Math.round((Date.now() - t) / 60000)) : 0);

// ---------- Ergebnisse ----------
async function ergebnis({ sterne = null, tempo = null, stueck = null } = {}) {
  const pid = wer(), a = aufgabe();
  if (!istKind(pid)) return; // Lehrkräfte probieren nur aus
  await speichere("uebe_ergebnisse", { person_id: pid, aufgabe_id: a && aufgabeGiltFuer(db, a, pid) ? a.id : null, modus: UB.modus, stueck, datum: tagIso(new Date()), minuten: minutenSeit(UB.modusSeit), sterne, tempo });
  UB.modusSeit = Date.now();
  if (a && !(a.erledigt || []).includes(pid) && uebeZielErreicht(a, { sterne, tempo })) {
    await speichere("uebeaufgaben", { ...a, erledigt: [...(a.erledigt || []), pid] });
    toast("🎉 Aufgabe geschafft – super!");
    document.getElementById("bwRahmen")?.classList.add("verbeugung"); setTimeout(() => document.getElementById("bwRahmen")?.classList.remove("verbeugung"), 2600);
  }
}
AKTIONEN.ubTagebuch = async () => {
  const pid = wer(), min = minutenSeit(UB.seit);
  if (!UB.seit) return;
  await speichere("uebungen", { person_id: pid, datum: tagIso(new Date()), minuten: Math.min(240, min), inhalt: [...UB.inhalt].length ? [...UB.inhalt] : ["technik"], gefuehl: null, notiz: "🎭 Übe-Bühne", geteilt: einst().uebenTeilen !== false });
  UB.seit = null; UB.inhalt = new Set(); toast(`📒 ${min} Min. ins Übe-Tagebuch eingetragen`); zeichne();
};

// ---------- Oberfläche ----------
function buehneBild() {
  const key = inst();
  return `<div class="buehne-rahmen offen ub-buehne" id="bwRahmen">${orchesterSvg(soloMoeglich(key) ? { solist: { pid: wer(), key } } : {})}</div>
    <div class="bw-titel" id="bwTitel">${esc(UB.modus ? `${MODI[UB.modus].sym} ${MODI[UB.modus].t}${aufgabe() ? " · " + aufgabe().titel : ""}` : "Vorhang auf – du bist dran!")}</div>`;
}
function kopfZeile() {
  const l = leute(), key = inst();
  const werWahl = l.length > 1 ? `<div class="ub-feld"><span>Wer übt?</span><div class="ub-chips">${l.map((x) => `<button type="button" class="${x === wer() ? "an" : ""}" data-a="ubWer" data-x="${esc(x)}">${esc(vorname(x))}</button>`).join("")}</div></div>` : "";
  const uhr = UB.seit && istKind(wer()) ? `<button type="button" class="knopf klein" data-a="ubTagebuch" title="Geübte Zeit ins Übe-Tagebuch">⏱ ${minutenSeit(UB.seit)} Min. · 📒 eintragen</button>` : "";
  return `<div class="karte ub-kopf">${werWahl}<div class="ub-feld"><span>Instrument</span><select data-c="ubInst" aria-label="Instrument">${INST_WAHL.map((k) => `<option value="${k}" ${k === key ? "selected" : ""}>${esc(INSTRUMENTE[k].name)}</option>`).join("")}</select></div>${uhr ? `<div class="ub-feld ub-rechts">${uhr}</div>` : ""}</div>`;
}
function startSeite() {
  const pid = wer(), auf = liste("uebeaufgaben", (a) => aufgabeGiltFuer(db, a, pid)).sort((a, b) => String(a.bis || "9").localeCompare(String(b.bis || "9")));
  const heute = tagIso(new Date()), erg = liste("uebe_ergebnisse", (e) => e.person_id === pid).sort((a, b) => String(b.datum).localeCompare(String(a.datum))).slice(0, 5);
  const stand = (a) => uebeStand(db, a).find((x) => x.pid === pid);
  return `<div class="karte"><h3>Was möchtest du üben?</h3><div class="ub-wahl">${Object.entries(MODI).map(([k, m]) => `<button type="button" data-a="ubModus" data-x="${k}"><span class="ub-sym">${m.sym}</span><b>${m.t}</b><small>${m.u}</small></button>`).join("")}</div></div>
    <div class="karte"><h3>📝 ${pid === S.ich.id ? "Deine" : `${esc(vorname(pid))}s`} Aufgaben</h3>${auf.length ? `<ul class="liste ub-aufgaben">${auf.map((a) => {
      const st = stand(a), ok = st?.ziel;
      return `<li class="${ok ? "ua-ok" : ""}"><div class="fl"><div class="zeile-titel">${ok ? "✅ " : ""}${esc(a.titel)}</div>
        <div class="zeile-unter">${esc(UEBE_ARTEN[a.art || "frei"] || "")}${a.bis ? ` · <span class="${!ok && a.bis < heute ? "ua-spaet" : ""}">bis ${datumKurz(a.bis)}</span>` : ""} · von ${esc(name(a.von_id))}${st?.anzahl ? ` · ${sterneText(st.sterne)}` : ""}</div>
        ${st?.rueckmeldung ? `<div class="ub-rm">💬 ${esc(st.rueckmeldung.rueckmeldung)}</div>` : ""}</div>
        <button type="button" class="knopf klein haupt" data-a="ubAufgabe" data-x="${a.id}">▶ Üben</button></li>`;
    }).join("")}</ul>` : '<p class="hinweis">Gerade keine Aufgaben – such dir oben etwas aus.</p>'}</div>
    ${erg.length ? `<div class="karte"><h3>⭐ Zuletzt geübt</h3><ul class="liste">${erg.map((e) => `<li><div class="fl"><div class="zeile-titel">${esc(MODI[e.modus]?.sym || "🎙️")} ${esc(e.aufgabe_id ? hole("uebeaufgaben", e.aufgabe_id)?.titel || "Aufgabe" : MODI[e.modus]?.t || "Vorspiel")}</div>
      <div class="zeile-unter">${datumKurz(e.datum)}${e.minuten ? ` · ${e.minuten} Min.` : ""}${e.tempo ? ` · ♩ = ${e.tempo}` : ""}${e.sterne != null ? ` · ${sterneText(e.sterne)}` : ""}${e.aufnahme ? " · 🎙️ Aufnahme geschickt" : ""}</div>
      ${e.rueckmeldung ? `<div class="ub-rm">💬 ${esc(name(e.rueckmeldung_von))}: ${esc(e.rueckmeldung)}</div>` : ""}</div></li>`).join("")}</ul></div>` : ""}
    ${lehrt() ? `<div class="karte"><h3>👩‍🏫 Für Lehrkräfte</h3><div class="ub-knoepfe"><button type="button" class="knopf haupt" data-a="aufgabeNeu">＋ Übe-Aufgabe geben</button><button type="button" class="knopf" data-a="ubFortschritt">📊 Fortschritt & Rückmeldung</button></div>
      <p class="hinweis">Aufgaben mit Notenstelle, Rhythmus, Tonleiter, Ton halten oder Ohr-Spiel öffnen bei den Kindern direkt die passende Übung.</p></div>` : ""}`;
}
function panel(inhalt, extra = "") {
  const a = aufgabe(), darfAufnahme = a && istKind(wer()) && aufnahmeErlaubt(wer());
  return `<div class="karte ub-panel"><div class="ub-panel-kopf"><button type="button" class="knopf klein" data-a="ubZurueck">‹ Übersicht</button><b>${MODI[UB.modus].sym} ${MODI[UB.modus].t}</b>${extra}</div>
    ${a ? `<div class="ub-auftrag"><b>📝 ${esc(a.titel)}</b>${a.text ? `<span>${esc(a.text)}</span>` : ""}<span class="hinweis">Ziel: ${a.tempo_ziel && ["notenstelle", "tonleiter"].includes(a.art) ? `♩ = ${a.tempo_ziel} · ` : ""}${sterneText(Number(a.ziel_sterne) || 2)}</span>
      ${materialKnoepfe(a)}${darfAufnahme ? `<button type="button" class="knopf klein" data-a="ubAufnahme">🎙️ Vorspielen & schicken</button>` : ""}</div>` : ""}
    ${inhalt}</div>`;
}
const materialKnoepfe = (a) => [a.datei ? `<button type="button" class="knopf klein" data-a="ubDatei" data-x="${esc(a.datei)}">📄 Noten öffnen</button>` : "", a.vorspiel ? `<button type="button" class="knopf klein" data-a="ubVorspiel" data-x="${esc(a.vorspiel)}">🔊 Vorspiel der Lehrkraft</button>` : ""].join("");

BUEHNE_MODI.ueben = {
  titel: "🎻 Üben",
  html() {
    if (UB.ich !== S.ich?.id) { audioStopp(); micStopp(); Object.assign(UB, { ich: S.ich?.id, pid: null, inst: null, modus: null, aufgabe: null, seit: null, inhalt: new Set(), gr: null, rErgebnis: null }); }
    const inhalt = !UB.modus ? startSeite() : UB.modus === "mitspielen" ? mitspielenHtml() : UB.modus === "griffe" ? griffeHtml() : UB.modus === "rhythmus" ? rhythmusHtml() : UB.modus === "stimmen" ? stimmenHtml() : gehoerHtml();
    return `<div class="ub">${buehneBild()}${kopfZeile()}${inhalt}</div>`;
  },
};
AKTIONEN.ubWer = (pid) => { audioStopp(); micStopp(); UB.pid = pid; UB.inst = null; zeichne(); };
AKTIONEN.ubInst = (_, el) => { audioStopp(); UB.inst = el.value; einstSetzen("ubInst", el.value); UB.gi = 0; UB.rErgebnis = null; zeichne(); };
AKTIONEN.ubModus = (m) => { audioStopp(); micStopp(); UB.modus = m; UB.aufgabe = null; UB.modusSeit = null; UB.rErgebnis = null; UB.bewerten = false; UB.gr = null; UB.gi = 0; zeichne(); scrollZurBuehne(); };
AKTIONEN.ubZurueck = () => { audioStopp(); micStopp(); UB.modus = null; UB.aufgabe = null; zeichne(); };
const scrollZurBuehne = () => requestAnimationFrame(() => document.querySelector(".ub-panel")?.scrollIntoView({ block: "start", behavior: "smooth" }));
// Aufgabe öffnen: passende Übe-Art mit den Vorgaben der Lehrkraft
AKTIONEN.ubAufgabe = (id) => {
  const a = hole("uebeaufgaben", id); if (!a) return;
  audioStopp(); micStopp();
  UB.modus = ART_MODUS[a.art] || "mitspielen"; UB.aufgabe = a.id; UB.modusSeit = null; UB.rErgebnis = null; UB.gr = null; UB.gi = 0; UB.bewerten = false;
  if (a.stueck) UB.stueck = a.stueck;
  if (a.art === "notenstelle") { UB.von = a.takt_von || 1; UB.bis = a.takt_bis || UB.von + 7; UB.faktor = 0.6; UB.steigern = !!a.tempo_ziel; UB.schleife = true; }
  if (a.art === "tonleiter") { UB.quelle = "tonleiter"; UB.tonart = a.tonart || "C"; UB.oktaven = a.oktaven || 1; }
  if (a.art === "rhythmus") { UB.stufe = "aufgabe"; UB.rbpm = a.tempo_ziel || 80; }
  if (a.art === "tonhalten") { try { UB.ziel = midi(a.ton || "A4"); } catch { UB.ziel = 69; } UB.halten = Number(a.sekunden) || 4; UB.gehalten = 0; UB.fertig = false; }
  if (a.art === "gehoer") UB.spiel = a.spiel || "hoehe";
  if (!ART_MODUS[a.art]) UB.modus = "mitspielen";
  zeichne(); scrollZurBuehne();
};
// Von „Üben“ (Übe-Tagebuch) aus: Bühne öffnen und Aufgabe starten
AKTIONEN.ubAufgabeOeffnen = (x) => { const [id, pid] = String(x).split("|"); UB.ich = S.ich.id; if (pid) { UB.pid = pid; UB.inst = null; } zeige("buehne", { modus: "ueben" }); AKTIONEN.ubAufgabe(id); };
AKTIONEN.ubBuehneOeffnen = () => zeige("buehne", { modus: "ueben" });
AKTIONEN.ubDatei = async (x) => { try { await dateiOeffnen(String(x).replace(/^datei:/, ""), "Noten", "application/pdf"); } catch (e) { toast(e.message); } };
AKTIONEN.ubVorspiel = async (x) => {
  try { const a = new Audio(await dateiUrl(String(x).replace(/^datei:/, ""))); a.play().catch(() => toast("Bitte noch einmal antippen")); } catch (e) { toast(e.message); }
};

// ================= 🎼 Mitspielen =================
function mitspielDaten() {
  const key = inst(), st = stimmeErzeugen(UB.stueck, INSTRUMENTE[key].name);
  if (!st) return null;
  const max = taktZahl(st); UB.von = Math.max(1, Math.min(max, UB.von)); UB.bis = Math.max(UB.von, Math.min(max, UB.bis));
  const teil = stelleSt(st, UB.von, UB.bis), beg = stelleSt(stimmeErzeugen(UB.stueck, "Partitur"), UB.von, UB.bis);
  return { st, max, teil, beg, bpm: Math.round(st.tempo * UB.faktor), rolle: INSTRUMENTE[key].rolle };
}
function mitspielenHtml() {
  const d = mitspielDaten(); if (!d) return panel('<p class="leer">Dieses Stück gibt es nicht.</p>');
  const a = aufgabe(), takte = Array.from({ length: d.max }, (_, i) => i + 1);
  return panel(`
    <div class="ub-feld"><span>Stück</span><select data-c="ubStueck" aria-label="Stück">${STUECKE.map((s) => `<option value="${s.id}" ${s.id === UB.stueck ? "selected" : ""}>${esc(s.titel)}</option>`).join("")}</select></div>
    <div class="ub-feld"><span>Takte</span><div class="ub-zwei"><select data-c="ubVon" aria-label="Takt von">${takte.map((t) => `<option ${t === UB.von ? "selected" : ""}>${t}</option>`).join("")}</select><span>bis</span><select data-c="ubBis" aria-label="Takt bis">${takte.map((t) => `<option ${t === UB.bis ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
    <div class="ub-feld"><span>Tempo</span><div class="ub-chips">${TEMPI.map((f) => `<button type="button" class="${Math.abs(f - UB.faktor) < 0.01 ? "an" : ""}" data-a="ubTempo" data-x="${f}">${f === 1 ? "🐇" : f <= 0.6 ? "🐢" : ""} ${Math.round(d.st.tempo * f)}</button>`).join("")}</div></div>
    <div class="ub-feld"><span>Meine Stimme</span><div class="ub-chips">${[["an", "🔊 laut"], ["leise", "🔉 leise"], ["aus", "🔇 aus"]].map(([k, t]) => `<button type="button" class="${UB.eigene === k ? "an" : ""}" data-a="ubEigene" data-x="${k}">${t}</button>`).join("")}</div></div>
    <div class="ub-schalter">${[["einzaehlen", "🥁 Einzählen"], ["schleife", "🔁 Wiederholen"], ["steigern", "🪜 Tempo steigern"]].map(([k, t]) => `<label><input type="checkbox" data-c="ubSchalter" data-x="${k}" ${UB[k] ? "checked" : ""}> ${t}</label>`).join("")}</div>
    <div class="ub-anzeige" id="ubAnzeige" aria-live="polite">${UB.laeuft ? "" : `♩ = ${d.bpm} · Takt ${UB.von}–${UB.bis}${UB.runden ? ` · ${UB.runden}× gespielt` : ""}${a?.tempo_ziel ? ` · Ziel ♩ = ${a.tempo_ziel}` : ""}`}</div>
    <div class="ub-knoepfe"><button type="button" class="knopf haupt gross" data-a="ubLos">${UB.laeuft ? "⏹ Stopp" : "▶ Los"}</button></div>
    <div class="ub-noten" id="ubNoten">${notenSvg(d.teil, { takteJeZeile: innerWidth < 560 ? 2 : 4, titel: `${d.st.stueck.titel} – ${INSTRUMENTE[inst()].name}` })}</div>
    ${INSTRUMENTE[inst()].info ? `<p class="hinweis">ℹ️ ${esc(INSTRUMENTE[inst()].info)} – die Noten sind so geschrieben, wie du sie spielst.</p>` : ""}
    ${UB.bewerten ? `<div class="ub-bewerten"><b>Wie lief's?</b><div class="ub-chips gross">${[1, 2, 3].map((n) => `<button type="button" data-a="ubSelbst" data-x="${n}">${sterneText(n)}</button>`).join("")}</div></div>` : ""}
    <p class="hinweis">Gemeinfreie Melodie, für den Bachkreis vereinfacht gesetzt. Der rote Notenkopf zeigt, wo ihr gerade seid.</p>`);
}
AKTIONEN.ubStueck = (_, el) => { audioStopp(); UB.stueck = el.value; UB.von = 1; UB.bis = 8; UB.gi = 0; zeichne(); };
AKTIONEN.ubVon = (_, el) => { audioStopp(); UB.von = Number(el.value); if (UB.bis < UB.von) UB.bis = UB.von; zeichne(); };
AKTIONEN.ubBis = (_, el) => { audioStopp(); UB.bis = Number(el.value); if (UB.von > UB.bis) UB.von = UB.bis; zeichne(); };
AKTIONEN.ubTempo = (f) => { audioStopp(); UB.faktor = Number(f); zeichne(); };
AKTIONEN.ubEigene = (k) => { audioStopp(); UB.eigene = k; zeichne(); };
AKTIONEN.ubSchalter = (_, el) => { UB[el.dataset.x] = el.checked; };
AKTIONEN.ubLos = () => { if (UB.laeuft) { audioStopp(); UB.bewerten = UB.runden > 0; zeichne(); return; } UB.bewerten = false; UB.runden = 0; mitspielenStarten(); };
function markieren(i) {
  document.querySelectorAll("#ubNoten .an").forEach((e) => e.classList.remove("an"));
  document.querySelector(`#ubNoten [data-k="0-${i}"]`)?.classList.add("an");
}
const SEK_STIMME = { Melodie: ["v1", "fl"], Mitte: ["v2", "va"], Bass: ["vc", "kb"] };
const ROLLE_STIMME = { melodie: "Melodie", mitte: "Mitte", bass: "Bass" };
function mitspielenStarten() {
  const d = mitspielDaten(); if (!d) return;
  const ctx = audioNeu(); if (!ctx) return;
  UB.laeuft = true; sitzung();
  const knopf = document.querySelector('[data-a="ubLos"]'); if (knopf) knopf.textContent = "⏹ Stopp";
  const schlag = 60 / d.bpm, vor = UB.einzaehlen ? d.st.takt : 0, rest = vor ? [[null, vor]] : [], gen = UB.gen;
  if (vor) { let n = 0; instrumentSpielen(ctx, "trommel", Array.from({ length: vor }, (_, i) => ["x", 1, i ? 0.55 : 1]), { schlag, lautstaerke: 0.8, onTon: () => { if (UB.gen === gen) anzeige(`🥁 ${++n}`); } }); }
  for (const z of d.beg.zeilen) {
    if (z.name === ROLLE_STIMME[d.rolle]) continue; // die eigene Rolle spielt das Kind
    instrumentSpielen(ctx, z.klang, [...rest, ...z.noten.map((n) => [n.ton, n.dauer])], { schlag, lautstaerke: z.name === "Melodie" ? 0.35 : 0.5, onTon: () => { if (UB.gen === gen) sekAn(SEK_STIMME[z.name] || [], schlag); } });
  }
  const z0 = d.teil.zeilen[0], idx = z0.noten.map((n, i) => (n.ton == null ? -1 : i)).filter((i) => i >= 0);
  let k = 0;
  instrumentSpielen(ctx, z0.klang, [...rest, ...z0.noten.map((n) => [n.ton, n.dauer])], { schlag, lautstaerke: { an: 0.9, leise: 0.3, aus: 0.0001 }[UB.eigene], onTon: () => {
    if (UB.gen !== gen) return;
    if (k === 0) anzeige(`♩ = ${d.bpm} · Runde ${UB.runden + 1}`);
    markieren(idx[k++]); sekAn(["solo"], schlag * 1.2);
  } });
  const dauer = (vor + z0.noten.reduce((s, n) => s + n.dauer, 0)) * schlag;
  spater(dauer * 1000 + 450, () => rundeFertig(d));
}
function rundeFertig(d) {
  UB.runden++;
  const a = aufgabe(), ziel = a?.tempo_ziel ? a.tempo_ziel / d.st.tempo : 1;
  if (UB.schleife && UB.runden < 30) {
    if (UB.steigern && UB.faktor < Math.min(1.1, ziel) - 1e-6) { UB.faktor = Math.min(Math.min(1.1, ziel), Math.round((UB.faktor + 0.05) * 100) / 100); toast(`🪜 Schneller: ♩ = ${Math.round(d.st.tempo * UB.faktor)}`); }
    return mitspielenStarten();
  }
  audioStopp(); UB.bewerten = true; zeichne();
}
AKTIONEN.ubSelbst = async (n) => {
  const d = mitspielDaten();
  UB.bewerten = false;
  await ergebnis({ sterne: Number(n), tempo: d ? d.bpm : null, stueck: UB.stueck });
  toast(Number(n) === 3 ? "🌟 Bravo!" : "👍 Weiter so!");
  zeichne();
};

// ================= ✋ Noten & Griffe =================
function griffDaten() {
  const key = inst();
  const st = UB.quelle === "tonleiter" ? tonleiterSt(key, UB.tonart, UB.oktaven, aufgabe()?.tempo_ziel || 72) : (() => { const s = stimmeErzeugen(UB.stueck, INSTRUMENTE[key].name); return s && stelleSt(s, UB.von, UB.bis); })();
  if (!st) return null;
  const z = st.zeilen[0], idx = z.noten.map((n, i) => (n.ton == null ? -1 : i)).filter((i) => i >= 0);
  UB.gi = Math.max(0, Math.min(idx.length - 1, UB.gi));
  return { st, z, idx, vz: transVz(st.vorzeichen, z.trans) };
}
function griffeHtml() {
  const key = inst(), d = griffDaten();
  const quelle = `<div class="ub-feld"><span>Noten aus</span><div class="ub-chips">${[["stueck", "🎼 Stück"], ["tonleiter", "🎵 Tonleiter"]].map(([k, t]) => `<button type="button" class="${UB.quelle === k ? "an" : ""}" data-a="ubQuelle" data-x="${k}">${t}</button>`).join("")}</div></div>`;
  const wahl = UB.quelle === "tonleiter"
    ? `<div class="ub-feld"><span>Tonart</span><div class="ub-zwei"><select data-c="ubTonart" aria-label="Tonart">${Object.entries(UEBE_TONARTEN).map(([k, t]) => `<option value="${k}" ${k === UB.tonart ? "selected" : ""}>${t}</option>`).join("")}</select>
        <select data-c="ubOktaven" aria-label="Oktaven">${[1, 2].map((o) => `<option value="${o}" ${o === Number(UB.oktaven) ? "selected" : ""}>${o} Oktave${o > 1 ? "n" : ""}</option>`).join("")}</select></div></div>`
    : `<div class="ub-feld"><span>Stück</span><select data-c="ubStueck" aria-label="Stück">${STUECKE.map((s) => `<option value="${s.id}" ${s.id === UB.stueck ? "selected" : ""}>${esc(s.titel)}</option>`).join("")}</select></div>`;
  if (!d) return panel(quelle + wahl + `<p class="leer">${hatTonumfang(key) ? "Diese Tonleiter passt nicht in den Tonumfang." : "Für dieses Instrument gibt es hier keine Tonleiter – probier 🥁 Rhythmus."}</p>`);
  const i = d.idx[UB.gi], n = d.z.noten[i], notiert = n.ton + d.z.trans, g = griff(key, notiert);
  return panel(quelle + wahl + `
    <div class="ub-noten klickbar" id="ubNoten" title="Tipp auf eine Note">${notenSvg(d.st, { takteJeZeile: innerWidth < 560 ? 2 : 4, titel: d.st.stueck.titel })}</div>
    <div class="ub-griff">
      <div class="ub-griff-kopf"><button type="button" class="knopf" data-a="ubGriffSchritt" data-x="-1" aria-label="Vorige Note" ${UB.gi ? "" : "disabled"}>‹</button>
        <div class="ub-tonname"><b>${esc(notenName(notiert, d.vz))}</b><small>Note ${UB.gi + 1} von ${d.idx.length}${d.z.trans ? ` · klingt ${esc(notenName(n.ton, d.st.vorzeichen))}` : ""}</small></div>
        <button type="button" class="knopf" data-a="ubGriffSchritt" data-x="1" aria-label="Nächste Note" ${UB.gi < d.idx.length - 1 ? "" : "disabled"}>›</button></div>
      <div class="ub-griff-bild">${griffSvg(g)}</div>
      <p class="ub-griff-text">${esc(g.text || "")}${g.extra ? `<br><small>${esc(g.extra)}</small>` : ""}</p>
      <div class="ub-knoepfe"><button type="button" class="knopf haupt" data-a="ubTonHoeren">🔊 Anhören</button><button type="button" class="knopf" data-a="ubGriffeAlle">${UB.laeuft ? "⏹ Stopp" : "▶ Langsam nacheinander"}</button></div>
    </div>
    <p class="hinweis">Vereinfachte Grundgriffe für den Anfang. Feinheiten (Lagen, Hilfsgriffe) zeigt dir deine Lehrkraft.</p>`);
}
AKTIONEN.ubQuelle = (k) => { audioStopp(); UB.quelle = k; UB.gi = 0; zeichne(); };
AKTIONEN.ubTonart = (_, el) => { audioStopp(); UB.tonart = el.value; UB.gi = 0; zeichne(); };
AKTIONEN.ubOktaven = (_, el) => { audioStopp(); UB.oktaven = Number(el.value); UB.gi = 0; zeichne(); };
AKTIONEN.ubGriffSchritt = (x) => { audioStopp(); UB.gi += Number(x); zeichne(); tonHoeren(); };
function tonHoeren() {
  const d = griffDaten(); if (!d) return;
  const ctx = audioNeu(); if (!ctx) return;
  sitzung();
  instrumentSpielen(ctx, d.z.klang, [[d.z.noten[d.idx[UB.gi]].ton, 1.6]], { schlag: 0.6 });
  markieren(d.idx[UB.gi]); sekAn(["solo"], 1);
}
AKTIONEN.ubTonHoeren = tonHoeren;
// Alle Noten nacheinander (bei Tonleiter-Aufgaben im Zieltempo) – Griff und Notenkopf wandern mit
AKTIONEN.ubGriffeAlle = () => {
  if (UB.laeuft) { audioStopp(); zeichne(); return; }
  const d = griffDaten(); if (!d) return;
  const ctx = audioNeu(); if (!ctx) return;
  sitzung(); UB.laeuft = true;
  const gen = UB.gen, schlag = 60 / (aufgabe()?.art === "tonleiter" && aufgabe().tempo_ziel ? aufgabe().tempo_ziel : 60);
  let k = 0;
  instrumentSpielen(ctx, d.z.klang, d.idx.map((i) => [d.z.noten[i].ton, 1]), { schlag, onTon: () => { if (UB.gen !== gen) return; UB.gi = k++; zeichne(); markieren(d.idx[UB.gi]); sekAn(["solo"], schlag); } });
  spater((d.idx.length * schlag + 0.6) * 1000, () => { UB.laeuft = false; if (aufgabe()?.art === "tonleiter") tonleiterFertig(); else zeichne(); });
};
function tonleiterFertig() { zeichne(); blatt("🎵 Tonleiter geschafft?", `<p>Hast du die Tonleiter mitgespielt? Wie lief's?</p><div class="ub-chips gross">${[1, 2, 3].map((n) => `<button type="button" data-a="ubTonleiterSterne" data-x="${n}">${sterneText(n)}</button>`).join("")}</div>`); }
AKTIONEN.ubTonleiterSterne = async (n) => { blattZu(); await ergebnis({ sterne: Number(n), tempo: aufgabe()?.tempo_ziel || 72, stueck: `tonleiter:${UB.tonart}` }); zeichne(); };
// Tipp auf eine Note im Notenblatt → diese Note
document.addEventListener("click", (e) => {
  const n = e.target.closest?.("#ubNoten.klickbar [data-k]"); if (!n || UB.modus !== "griffe") return;
  const d = griffDaten(); if (!d) return;
  const i = Number(n.dataset.k.split("-")[1]), k = d.idx.indexOf(i);
  if (k >= 0) { audioStopp(); UB.gi = k; zeichne(); tonHoeren(); }
});

// ================= 🥁 Rhythmus =================
function rhythmusDaten() {
  const a = aufgabe();
  if (UB.stufe === "aufgabe" && a?.art === "rhythmus") { const m = musterLesen(a.muster); if (m) return { m, takt: Number(a.taktart) || 4, titel: a.titel }; }
  const s = RHYTHMUS_STUFEN.find((x) => x.id === UB.stufe) || RHYTHMUS_STUFEN[0];
  return { m: musterLesen(s.muster), takt: s.takt, titel: s.titel };
}
function rhythmusHtml() {
  const d = rhythmusDaten(), a = aufgabe(), e = UB.rErgebnis;
  const stufen = `<div class="ub-feld"><span>Rhythmus</span><select data-c="ubStufe" aria-label="Rhythmus wählen">${a?.art === "rhythmus" ? `<option value="aufgabe" ${UB.stufe === "aufgabe" ? "selected" : ""}>📝 ${esc(a.titel)}</option>` : ""}${RHYTHMUS_STUFEN.map((s) => `<option value="${s.id}" ${s.id === UB.stufe ? "selected" : ""}>${esc(s.titel)}</option>`).join("")}</select></div>`;
  const tempo = `<div class="ub-feld"><span>Tempo</span><div class="ub-chips">${[60, 70, 80, 90, 100, 120].map((b) => `<button type="button" class="${b === UB.rbpm ? "an" : ""}" data-a="ubRTempo" data-x="${b}">♩ ${b}</button>`).join("")}</div></div>`;
  const ergebnisHtml = e ? `<div class="ub-ergebnis"><div class="ub-sterne">${sterneText(e.sterne)}</div><b>${e.treffer.filter((x) => x.ms != null).length} von ${e.treffer.length} getroffen${e.mittel != null ? ` · im Schnitt ${e.mittel} ms daneben` : ""}${e.extra ? ` · ${e.extra}× zu viel getippt` : ""}</b>
    <div class="ub-tipps">${e.treffer.map((x, i) => `<span class="r-${tippUrteil(x.ms).replace(/\s/g, "")}" title="${i + 1}. Note: ${tippUrteil(x.ms)}${x.ms != null ? ` (${x.ms > 0 ? "+" : ""}${x.ms} ms)` : ""}">${i + 1}</span>`).join("")}</div>
    <p class="hinweis">grün = genau · gelb = knapp · rot = daneben oder verpasst</p></div>` : "";
  return panel(stufen + tempo + `
    <div class="ub-noten" id="ubNoten">${notenSvg(rhythmusSt(d.m, d.takt, UB.rbpm, d.titel), { takteJeZeile: innerWidth < 560 ? 2 : 4, titel: d.titel })}</div>
    <div class="ub-anzeige" id="ubAnzeige" aria-live="polite">${UB.phase === "bereit" ? "Erst 👂 anhören, dann ▶ mittippen" : ""}</div>
    <div class="ub-knoepfe"><button type="button" class="knopf" data-a="ubRHoeren">👂 Anhören</button><button type="button" class="knopf haupt" data-a="ubRTippen">▶ Mittippen</button>
      <label class="ub-klein"><input type="checkbox" data-c="ubRHilfe" ${UB.rHilfe ? "checked" : ""}> leise mitspielen</label></div>
    <button type="button" class="ub-tipp" id="ubTipp" aria-label="Tippen">TIPP</button>${ergebnisHtml}
    <p class="hinweis">Tippe auf die große Fläche (am Computer: Leertaste) – genau dann, wenn eine Note beginnt. Vorher zählt das Metronom einen Takt ein.</p>`);
}
AKTIONEN.ubStufe = (_, el) => { audioStopp(); UB.stufe = el.value; UB.rErgebnis = null; UB.phase = "bereit"; zeichne(); };
AKTIONEN.ubRTempo = (b) => { audioStopp(); UB.rbpm = Number(b); UB.rErgebnis = null; zeichne(); };
AKTIONEN.ubRHilfe = (_, el) => { UB.rHilfe = el.checked; };
// Spielt Einzähler (+ Metronom) und auf Wunsch das Muster. Rückgabe: Startzeit von Schlag 1 (performance.now-Zeit) und Gesamtdauer
function rhythmusAbspielen(ctx, m, takt, bpm, { muster = true, laut = 0.9, metronom = true } = {}) {
  const schlag = 60 / bpm, schlaege = m.reduce((s, n) => s + n.dauer, 0), gen = UB.gen;
  const jetzt = performance.now(), ctxJetzt = ctx.currentTime;
  let n = 0;
  instrumentSpielen(ctx, "trommel", Array.from({ length: takt }, (_, i) => ["x", 1, i ? 0.55 : 1]), { schlag, lautstaerke: 0.85, onTon: () => { if (UB.gen === gen) anzeige(n < takt ? `🥁 ${++n}` : ""); } });
  if (metronom) instrumentSpielen(ctx, "trommel", [[null, takt], ...Array.from({ length: schlaege }, (_, i) => ["x", 1, i % takt ? 0.18 : 0.32])], { schlag, lautstaerke: 0.6 });
  if (muster) { let k = 0; const idx = m.map((x, i) => (x.pause ? -1 : i)).filter((i) => i >= 0);
    instrumentSpielen(ctx, "klavier", [[null, takt], ...m.map((x) => [x.pause ? null : 69, x.dauer])], { schlag, lautstaerke: laut, onTon: () => { if (UB.gen === gen) { markieren(idx[k++]); sekAn(["solo"], schlag); } } }); }
  const latenz = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
  return { t0: jetzt + (0.08 + takt * schlag) * 1000 + latenz - (ctx.currentTime - ctxJetzt) * 1000, dauer: (takt + schlaege) * schlag, schlag };
}
AKTIONEN.ubRHoeren = () => {
  const d = rhythmusDaten(), ctx = audioNeu(); if (!ctx) return;
  sitzung(); UB.phase = "hoeren"; UB.rErgebnis = null;
  const r = rhythmusAbspielen(ctx, d.m, d.takt, UB.rbpm);
  spater(r.dauer * 1000 + 300, () => { UB.phase = "bereit"; anzeige("Jetzt du: ▶ Mittippen"); document.querySelectorAll("#ubNoten .an").forEach((x) => x.classList.remove("an")); });
};
AKTIONEN.ubRTippen = () => {
  const d = rhythmusDaten(), ctx = audioNeu(); if (!ctx) return;
  sitzung(); UB.rErgebnis = null; UB.taps = []; UB.phase = "tippen";
  document.querySelectorAll("#ubNoten .r-genau,#ubNoten .r-knapp,#ubNoten .r-falsch").forEach((x) => x.classList.remove("r-genau", "r-knapp", "r-falsch"));
  const r = rhythmusAbspielen(ctx, d.m, d.takt, UB.rbpm, { muster: UB.rHilfe, laut: 0.25 });
  UB.t0 = r.t0;
  document.getElementById("ubTipp")?.classList.add("bereit");
  spater(r.dauer * 1000 + r.schlag * 600, () => rhythmusAuswerten(d, r.schlag));
};
function tippen() {
  if (UB.modus === "gehoer" && UB.gr?.phase === "tippen") return gehoerTipp();
  if (UB.modus !== "rhythmus" || UB.phase !== "tippen") return;
  UB.taps.push((performance.now() - UB.t0) / 1000);
  const p = document.getElementById("ubTipp"); if (p) { p.classList.remove("blitz"); void p.offsetWidth; p.classList.add("blitz"); }
  sekAn(["solo"], 0.25);
}
document.addEventListener("pointerdown", (e) => { if (e.target.closest?.("#ubTipp")) { e.preventDefault(); tippen(); } });
document.addEventListener("keydown", (e) => { if (e.code === "Space" && (UB.phase === "tippen" || UB.gr?.phase === "tippen") && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); tippen(); } });
async function rhythmusAuswerten(d, schlag) {
  UB.phase = "bereit"; audioStopp();
  const e = bewerten(einsaetze(d.m), UB.taps, schlag);
  UB.rErgebnis = e;
  await ergebnis({ sterne: e.sterne, tempo: UB.rbpm, stueck: UB.stufe === "aufgabe" ? null : UB.stufe });
  zeichne();
  const idx = d.m.map((x, i) => (x.pause ? -1 : i)).filter((i) => i >= 0);
  e.treffer.forEach((t, k) => document.querySelector(`#ubNoten [data-k="0-${idx[k]}"]`)?.classList.add(t.ms == null || Math.abs(t.ms) > 130 ? "r-falsch" : Math.abs(t.ms) > 60 ? "r-knapp" : "r-genau"));
  if (e.sterne === 3) { document.getElementById("bwRahmen")?.classList.add("verbeugung"); setTimeout(() => document.getElementById("bwRahmen")?.classList.remove("verbeugung"), 2600); }
}

// ================= 🎯 Stimmgerät & Ton halten =================
const SAITEN_KLINGEND = { v1: [55, 62, 69, 76], v2: [55, 62, 69, 76], va: [48, 55, 62, 69], vc: [36, 43, 50, 57], kb: [28, 33, 38, 43] };
function stimmZiele(key) {
  const a = aufgabe(), l = [];
  if (a?.art === "tonhalten") { try { l.push([midi(a.ton || "A4"), "📝 Aufgabe"]); } catch {} }
  for (const m of SAITEN_KLINGEND[key] || []) l.push([m, "Saite"]);
  if (!SAITEN_KLINGEND[key] && key !== "sw") l.push([69, "Stimmton"], [58, "Stimmton (B)"]);
  return l;
}
function stimmenHtml() {
  const key = inst(), trans = INSTRUMENTE[key].trans || 0, z = stimmZiele(key);
  const nm = (m) => notenName(m + trans, 0);
  return panel(`
    <div class="ub-feld"><span>Ziel-Ton</span><div class="ub-chips">${[[null, "frei"], ...z].map(([m, t]) => `<button type="button" class="${m === UB.ziel ? "an" : ""}" data-a="ubZiel" data-x="${m ?? ""}">${m == null ? "🎵 frei" : `${esc(nm(m))} <small>${esc(t)}</small>`}</button>`).join("")}</div></div>
    <div class="ub-stimm" id="ubStimm">
      <svg viewBox="0 0 220 120" class="ub-zeiger" role="img" aria-label="Stimm-Anzeige"><path d="M20 110 A90 90 0 0 1 200 110" class="ub-bogen"/><path d="M84 25 A90 90 0 0 1 136 25" class="ub-bogen-gut"/>
        ${[-50, -25, 0, 25, 50].map((c) => { const w = (c / 50) * 80 * Math.PI / 180; return `<line x1="${110 + Math.sin(w) * 82}" y1="${110 - Math.cos(w) * 82}" x2="${110 + Math.sin(w) * 96}" y2="${110 - Math.cos(w) * 96}" class="ub-strich"/>`; }).join("")}
        <g id="ubNadel" transform="rotate(0 110 110)"><line x1="110" y1="110" x2="110" y2="26" class="ub-nadel"/></g><circle cx="110" cy="110" r="6" class="ub-nabe"/></svg>
      <div class="ub-tonname gross"><b id="ubTon">–</b><small id="ubUrteil">${UB.mic ? "Spiel einen Ton …" : "Mikrofon ist aus"}</small></div>
      ${UB.ziel != null ? `<div class="ub-halten"><div class="ub-halten-balken"><i id="ubHalten" style="width:${Math.min(100, (UB.gehalten / 1000 / (UB.halten || 4)) * 100)}%"></i></div><small>🎯 ${esc(nm(UB.ziel))} ${UB.halten || 4} Sekunden genau halten${UB.fertig ? " – ✅ geschafft!" : ""}</small></div>` : ""}
    </div>
    <div class="ub-knoepfe"><button type="button" class="knopf haupt gross" data-a="ubMic">${UB.mic ? "⏹ Mikrofon aus" : "🎤 Mikrofon an"}</button>${UB.ziel != null ? `<button type="button" class="knopf" data-a="ubZielHoeren">🔊 Ziel-Ton anhören</button>` : ""}</div>
    <p class="hinweis">🔒 Der Ton wird nur hier im Gerät gemessen – nichts wird aufgenommen, gespeichert oder verschickt.${trans ? ` Angezeigt wird der Ton, wie er für ${esc(INSTRUMENTE[key].name)} notiert ist.` : ""}${key === "sw" ? " Bei Pauken ist die Messung ungenau – nutze lieber 🥁 Rhythmus." : ""}</p>`);
}
AKTIONEN.ubZiel = (x) => { UB.ziel = x === "" ? null : Number(x); UB.halten ||= Number(aufgabe()?.sekunden) || 4; UB.gehalten = 0; UB.fertig = false; UB.haltenStart = 0; zeichne(); };
AKTIONEN.ubZielHoeren = () => { const ctx = audioNeu(); if (ctx && UB.ziel != null) instrumentSpielen(ctx, INSTRUMENTE[inst()].klang || "klavier", [[UB.ziel, 3]], { schlag: 0.6 }); };
AKTIONEN.ubMic = async () => {
  if (UB.mic) { micStopp(); return zeichne(); }
  if (!navigator.mediaDevices?.getUserMedia) return toast("Dieses Gerät erlaubt kein Mikrofon");
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 2048;
    ctx.createMediaStreamSource(strom).connect(an);
    UB.mic = { strom, ctx, an, buf: new Float32Array(an.fftSize), verlauf: [], raf: 0, zuletzt: performance.now() };
    sitzung(); UB.haltenStart = performance.now(); zeichne(); micSchleife();
  } catch { toast("Kein Zugriff aufs Mikrofon – bitte im Browser erlauben"); }
};
function micStopp() {
  if (!UB.mic) return;
  cancelAnimationFrame(UB.mic.raf); UB.mic.strom.getTracks().forEach((t) => t.stop()); try { UB.mic.ctx.close(); } catch {}
  UB.mic = null;
}
function micSchleife() {
  const m = UB.mic; if (!m) return;
  m.raf = requestAnimationFrame(micSchleife);
  const jetzt = performance.now(), dt = jetzt - m.zuletzt; m.zuletzt = jetzt;
  if (!document.getElementById("ubStimm")) return micStopp();
  m.an.getFloatTimeDomainData(m.buf);
  const f = tonhoehe(m.buf, m.ctx.sampleRate);
  if (f) { m.verlauf.push(f); if (m.verlauf.length > 5) m.verlauf.shift(); } else if (m.verlauf.length) m.verlauf.shift();
  const fm = m.verlauf.length >= 3 ? [...m.verlauf].sort((a, b) => a - b)[Math.floor(m.verlauf.length / 2)] : null;
  const ton = document.getElementById("ubTon"), urteil = document.getElementById("ubUrteil"), nadel = document.getElementById("ubNadel");
  if (!fm) { if (urteil) urteil.textContent = "Spiel einen Ton …"; haltenSchritt(false, dt); return; }
  const trans = INSTRUMENTE[inst()].trans || 0, roh = 69 + 12 * Math.log2(fm / 440), naechst = UB.ziel != null && Math.abs(roh - UB.ziel) < 1.5 ? UB.ziel : Math.round(roh), cent = centZu(fm, naechst);
  if (ton) ton.textContent = notenName(naechst + trans, 0);
  if (urteil) { urteil.textContent = `${stimmUrteil(cent)} (${cent > 0 ? "+" : ""}${cent} Cent)`; urteil.className = Math.abs(cent) <= 8 ? "gut" : Math.abs(cent) <= 20 ? "mittel" : "schlecht"; }
  if (nadel) nadel.setAttribute("transform", `rotate(${Math.max(-50, Math.min(50, cent)) / 50 * 80} 110 110)`);
  haltenSchritt(UB.ziel != null && naechst === UB.ziel && Math.abs(cent) <= 15, dt);
}
function haltenSchritt(gut, dt) {
  if (UB.ziel == null || UB.fertig) return;
  UB.gehalten = gut ? UB.gehalten + dt : Math.max(0, UB.gehalten - dt * 2);
  const ziel = (UB.halten || 4) * 1000, b = document.getElementById("ubHalten");
  if (b) b.style.width = `${Math.min(100, (UB.gehalten / ziel) * 100)}%`;
  if (UB.gehalten >= ziel) {
    UB.fertig = true;
    const sek = (performance.now() - UB.haltenStart) / 1000, sterne = sek <= UB.halten + 8 ? 3 : sek <= UB.halten + 25 ? 2 : 1;
    toast(`🎯 Gehalten! ${sterneText(sterne)}`); sekAn(["solo"], 2);
    ergebnis({ sterne, stueck: `ton:${UB.ziel}` }).then(() => zeichne());
  }
}

// ================= 👂 Ohr-Spiele =================
const RUNDEN = 10;
function gehoerHtml() {
  const g = UB.gr;
  const wahl = `<div class="ub-feld"><span>Spiel</span><div class="ub-chips">${Object.entries(UEBE_SPIELE).map(([k, t]) => `<button type="button" class="${UB.spiel === k ? "an" : ""}" data-a="ubSpiel" data-x="${k}">${esc(t)}</button>`).join("")}</div></div>`;
  if (!g) return panel(wahl + `<div class="ub-knoepfe"><button type="button" class="knopf haupt gross" data-a="ubSpielStart">▶ Spiel starten (${RUNDEN} Runden)</button></div><p class="hinweis">Tipp: Kopfhörer helfen beim Hinhören.</p>`);
  if (g.runde > RUNDEN) {
    const sterne = g.richtig >= 9 ? 3 : g.richtig >= 7 ? 2 : g.richtig >= 5 ? 1 : 0;
    return panel(wahl + `<div class="ub-ergebnis"><div class="ub-sterne">${sterneText(sterne)}</div><b>${g.richtig} von ${RUNDEN} richtig</b></div><div class="ub-knoepfe"><button type="button" class="knopf haupt" data-a="ubSpielStart">🔁 Nochmal</button></div>`);
  }
  const antworten = UB.spiel === "hoehe" ? [["hoch", "⬆ höher"], ["tief", "⬇ tiefer"]] : UB.spiel === "durmoll" ? [["dur", "😊 Dur"], ["moll", "😢 Moll"]] : [];
  return panel(wahl + `<div class="ub-runde"><b>Runde ${g.runde} von ${RUNDEN}</b><span>✅ ${g.richtig}</span></div>
    <p class="ub-frage">${UB.spiel === "hoehe" ? "Ist der zweite Ton höher oder tiefer?" : UB.spiel === "durmoll" ? "Klingt der Akkord fröhlich (Dur) oder traurig (Moll)?" : "Hör zu – dann tippe den Rhythmus nach."}</p>
    <div class="ub-anzeige" id="ubAnzeige" aria-live="polite">${g.meldung || ""}</div>
    ${antworten.length ? `<div class="ub-antworten">${antworten.map(([k, t]) => `<button type="button" class="knopf gross" data-a="ubAntwort" data-x="${k}" ${g.phase !== "frage" ? "disabled" : ""}>${t}</button>`).join("")}</div>`
      : `<button type="button" class="ub-tipp" id="ubTipp" aria-label="Tippen">TIPP</button>`}
    <div class="ub-knoepfe"><button type="button" class="knopf" data-a="ubNochmal">🔁 Nochmal hören</button>${g.phase === "loesung" ? `<button type="button" class="knopf haupt" data-a="ubWeiter">Weiter ›</button>` : ""}</div>`);
}
AKTIONEN.ubSpiel = (k) => { audioStopp(); UB.spiel = k; UB.gr = null; zeichne(); };
AKTIONEN.ubSpielStart = () => { sitzung(); UB.gr = { runde: 1, richtig: 0 }; neueFrage(); };
const zufall = (n) => Math.floor(Math.random() * n);
function neueFrage() {
  const g = UB.gr; g.meldung = ""; g.phase = "frage";
  if (UB.spiel === "hoehe") { const a = 57 + zufall(16), max = g.runde < 4 ? 7 : g.runde < 8 ? 4 : 2, d = (1 + zufall(max)) * (Math.random() < 0.5 ? 1 : -1); g.frage = { a, b: a + d, loesung: d > 0 ? "hoch" : "tief" }; }
  else if (UB.spiel === "durmoll") { const r = 55 + zufall(10), moll = Math.random() < 0.5; g.frage = { toene: [r, r + (moll ? 3 : 4), r + 7], loesung: moll ? "moll" : "dur" }; }
  else { const B = [[1], [0.5, 0.5], [2], [1.5, 0.5], [1, 1]], m = []; let s = 0;
    while (s < 4) { const b = B[zufall(B.length)], sum = b.reduce((x, y) => x + y, 0); if (s + sum > 4) continue; b.forEach((w) => m.push({ dauer: w, pause: false })); s += sum; }
    g.frage = { m }; g.phase = "hoeren"; }
  zeichne(); frageSpielen();
}
function frageSpielen() {
  const g = UB.gr, ctx = audioNeu(); if (!ctx || !g) return;
  if (UB.spiel === "hoehe") instrumentSpielen(ctx, "klavier", [[g.frage.a, 1.2], [null, 0.4], [g.frage.b, 1.6]], { schlag: 0.55 });
  else if (UB.spiel === "durmoll") { instrumentSpielen(ctx, "klavier", g.frage.toene.map((t) => [t, 0.9]), { schlag: 0.45 }); for (const t of g.frage.toene) instrumentSpielen(ctx, "klavier", [[null, 3.2], [t, 3]], { schlag: 0.45, lautstaerke: 0.6 }); }
  else {
    const r = rhythmusAbspielen(ctx, g.frage.m, 4, 80, { metronom: false });
    g.phase = "hoeren";
    spater(r.dauer * 1000 + 400, () => { // jetzt nachklatschen: Einzähler, dann tippen
      const c2 = audioNeu(); if (!c2) return;
      const r2 = rhythmusAbspielen(c2, g.frage.m, 4, 80, { muster: false });
      g.phase = "tippen"; UB.taps = []; UB.t0 = r2.t0; anzeige("Gleich du: 🥁 …");
      spater(r2.dauer * 1000 + 500, () => { const e = bewerten(einsaetze(g.frage.m), UB.taps, r2.schlag); antwort(e.sterne >= 2, `${e.treffer.filter((x) => x.ms != null).length} von ${e.treffer.length} getroffen`); });
    });
  }
}
function gehoerTipp() { UB.taps.push((performance.now() - UB.t0) / 1000); const p = document.getElementById("ubTipp"); if (p) { p.classList.remove("blitz"); void p.offsetWidth; p.classList.add("blitz"); } }
AKTIONEN.ubNochmal = () => { if (UB.gr && UB.gr.phase !== "tippen") frageSpielen(); };
AKTIONEN.ubAntwort = (k) => { const g = UB.gr; if (!g || g.phase !== "frage") return; antwort(k === g.frage.loesung, g.frage.loesung === "hoch" ? "Der zweite Ton war höher." : g.frage.loesung === "tief" ? "Der zweite Ton war tiefer." : g.frage.loesung === "dur" ? "Das war Dur." : "Das war Moll."); };
function antwort(ok, text) {
  const g = UB.gr; g.phase = "loesung"; if (ok) { g.richtig++; sekAn(["solo"], 1); }
  g.meldung = ok ? `✅ Richtig! ${text}` : `❌ Leider nicht. ${text}`;
  zeichne();
}
AKTIONEN.ubWeiter = async () => {
  const g = UB.gr; if (!g) return;
  g.runde++;
  if (g.runde > RUNDEN) { audioStopp(); await ergebnis({ sterne: g.richtig >= 9 ? 3 : g.richtig >= 7 ? 2 : g.richtig >= 5 ? 1 : 0, stueck: `spiel:${UB.spiel}` }); return zeichne(); }
  neueFrage();
};

// ================= 🎙️ Vorspielen & an die Lehrkraft schicken (nur mit Einwilligung) =================
function aufnahmeErlaubt(pid) { const p = hole("personen", pid); return !istMinderjaehrig(p) || einwilligung(db, pid, "uebeaufnahmen") === "ja"; }
const REC = { rec: null, blob: null, url: null, timer: 0 };
AKTIONEN.ubAufnahme = () => {
  const a = aufgabe(); if (!a) return;
  if (!aufnahmeErlaubt(wer())) return toast("Dafür brauchen deine Eltern die Einwilligung „Übe-Aufnahmen“.");
  REC.blob = null;
  blatt("🎙️ Vorspielen", `<p>Spiel <b>${esc(a.titel)}</b> vor – die Aufnahme geht nur an <b>${esc(name(a.von_id))}</b> und die Leitung und wird nach ${UEBE_AUFNAHME_TAGE} Tagen gelöscht.</p>
    <div class="ub-knoepfe"><button type="button" class="knopf haupt gross" data-a="ubRec" id="ubRecKnopf">⏺ Aufnahme starten</button></div>
    <audio id="ubRecAudio" controls hidden></audio><div class="ub-knoepfe"><button type="button" class="knopf haupt" data-a="ubRecSenden" id="ubRecSenden" hidden>📤 An die Lehrkraft schicken</button></div>
    <p class="hinweis">Höchstens 3 Minuten. Du kannst dir die Aufnahme vorher anhören und neu aufnehmen.</p>`);
};
AKTIONEN.ubRec = async () => {
  if (REC.rec) { REC.rec.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) return toast("Aufnehmen geht auf diesem Gerät nicht");
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ audio: true }), rec = new MediaRecorder(strom), teile = [];
    rec.ondataavailable = (e) => teile.push(e.data);
    rec.onstop = () => {
      clearTimeout(REC.timer); strom.getTracks().forEach((t) => t.stop()); REC.rec = null;
      REC.blob = new Blob(teile, { type: (rec.mimeType || "audio/webm").split(";")[0] });
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = URL.createObjectURL(REC.blob);
      const au = document.getElementById("ubRecAudio"); if (au) { au.src = REC.url; au.hidden = false; }
      const k = document.getElementById("ubRecKnopf"); if (k) k.textContent = "⏺ Neu aufnehmen";
      const s = document.getElementById("ubRecSenden"); if (s) s.hidden = false;
    };
    rec.start(); REC.rec = rec; REC.timer = setTimeout(() => rec.state === "recording" && rec.stop(), 180000);
    const k = document.getElementById("ubRecKnopf"); if (k) k.textContent = "⏹ Aufnahme beenden";
  } catch { toast("Kein Zugriff aufs Mikrofon"); }
};
AKTIONEN.ubRecSenden = async () => {
  const a = aufgabe(); if (!a || !REC.blob) return;
  try {
    const d = await hochladen(new File([REC.blob], `Vorspiel ${vorname(wer())}.webm`, { type: REC.blob.type }), { art: "sprache" });
    await speichere("uebe_ergebnisse", { person_id: wer(), aufgabe_id: a.id, modus: null, datum: tagIso(new Date()), aufnahme: "datei:" + d.id });
    await senden({ an: [a.von_id], betreff: `🎙️ Vorspiel von ${vorname(wer())}: ${a.titel}`, text: "Neue Übe-Aufnahme – in der App unter Bühne › Üben › Fortschritt.", ereignis: "standard" });
    blattZu(); toast("📤 Geschickt – deine Lehrkraft hört rein!");
  } catch (e) { toast(e.message || "Hat nicht geklappt"); }
};

// ================= 👩‍🏫 Lehrkräfte: Aufgabe geben (mit Rhythmus-Baukasten) =================
const F = { werte: {}, rm: [], pause: false };
const optL = (l, w, f) => l.map((x) => `<option value="${esc(x.id)}" ${x.id === w ? "selected" : ""}>${esc(f(x))}</option>`).join("");
const optO = (o, w) => Object.entries(o).map(([k, t]) => `<option value="${k}" ${k === w ? "selected" : ""}>${esc(t)}</option>`).join("");
const TOENE = ["C3", "G3", "D4", "A4", "E5", "C2", "G2", "D3", "A3", "Bb3", "F4", "Bb4", "C4", "C5"];
function formHtml() {
  const w = F.werte, art = w.art || "notenstelle", feld = (t, inh) => `<div class="feld"><label>${t}</label>${inh}</div>`;
  const zahl = (n, v, p = "") => `<input type="number" name="${n}" value="${esc(v ?? "")}" placeholder="${p}" min="1">`;
  let spez = "";
  if (art === "notenstelle") spez = `<div class="ub-raster3">${feld("Stück", `<select name="stueck">${optO(UEBE_STUECKE, w.stueck || "menuett")}</select>`)}${feld("Takt von", zahl("takt_von", w.takt_von ?? 1))}${feld("Takt bis", zahl("takt_bis", w.takt_bis ?? 8))}</div>`;
  if (art === "tonleiter") spez = `<div class="ub-raster3">${feld("Tonart", `<select name="tonart">${optO(UEBE_TONARTEN, w.tonart || "G")}</select>`)}${feld("Oktaven", `<select name="oktaven">${[1, 2].map((o) => `<option ${Number(w.oktaven) === o ? "selected" : ""}>${o}</option>`).join("")}</select>`)}</div>`;
  if (art === "tonhalten") spez = `<div class="ub-raster3">${feld("Ton (klingend)", `<select name="ton">${TOENE.map((t) => `<option value="${t}" ${w.ton === t ? "selected" : ""}>${esc(notenName(midi(t)))} (${t})</option>`).join("")}</select>`)}${feld("Sekunden halten", `<select name="sekunden">${[3, 4, 6, 8].map((s) => `<option ${Number(w.sekunden || 4) === s ? "selected" : ""}>${s}</option>`).join("")}</select>`)}</div>`;
  if (art === "gehoer") spez = feld("Ohr-Spiel", `<select name="spiel">${optO(UEBE_SPIELE, w.spiel || "hoehe")}</select>`);
  if (art === "rhythmus") {
    const takt = Number(w.taktart) || 4, p = musterPruefen(F.rm, takt);
    spez = `<div class="ub-raster3">${feld("Taktart", `<select name="taktart" data-c="ubFormNeu">${[2, 3, 4].map((t) => `<option value="${t}" ${t === takt ? "selected" : ""}>${t}/4</option>`).join("")}</select>`)}</div>
      <div class="ub-baukasten"><div class="ub-chips">${NOTENWERTE.map((n) => `<button type="button" data-a="ubRmPlus" data-x="${n.w}" title="${esc(n.t)}">${F.pause ? "𝄽 " : ""}${esc(n.t)}</button>`).join("")}</div>
        <div class="ub-knoepfe"><label class="ub-klein"><input type="checkbox" data-c="ubRmPause" ${F.pause ? "checked" : ""}> als Pause</label><button type="button" class="knopf klein" data-a="ubRmWeg">⌫ letzte weg</button><button type="button" class="knopf klein" data-a="ubRmLeer">🗑 leeren</button><button type="button" class="knopf klein" data-a="ubRmHoeren" ${p.ok ? "" : "disabled"}>🔊 anhören</button></div>
        <div class="ub-noten klein" id="ubRmVorschau">${F.rm.length ? notenSvg(rhythmusSt(F.rm, takt, 80), { takteJeZeile: 4 }) : '<p class="hinweis">Tippe oben auf Notenwerte – so entsteht der Rhythmus.</p>'}</div>
        <p class="hinweis ${p.ok ? "" : "ub-warn"}">${esc(p.text)}</p></div>`;
  }
  if (art === "material" || art === "frei") spez = feld("Stück (Notenarchiv)", `<select name="werk_id"><option value="">–</option>${optL(liste("werke"), w.werk_id, (x) => `${x.komponist}: ${x.titel}`)}</select>`)
    + (art === "material" ? `<div class="ub-raster3">${feld("Noten (PDF)", `<input type="file" accept="application/pdf" data-c="ubFormDatei" data-x="datei">${w.datei ? '<small class="hinweis">✅ hochgeladen</small>' : ""}`)}
      ${feld("Vorspiel (Aufnahme)", `<input type="file" accept="audio/*" data-c="ubFormDatei" data-x="vorspiel">${w.vorspiel ? '<small class="hinweis">✅ hochgeladen</small>' : ""}`)}</div>` : "");
  const tempo = ["notenstelle", "tonleiter", "rhythmus"].includes(art) ? feld("Zieltempo (♩ je Minute)", zahl("tempo_ziel", w.tempo_ziel ?? (art === "rhythmus" ? 80 : ""), "z. B. 90")) : "";
  const kinder = liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten").sort((a, b) => name(a).localeCompare(name(b)));
  return `<div id="ubForm" class="ub-form">
    ${feld("Art der Aufgabe", `<select name="art" data-c="ubFormNeu">${optO(UEBE_ARTEN, art)}</select>`)}
    <div class="ub-raster3">${feld("Titel *", `<input name="titel" value="${esc(w.titel || "")}" placeholder="z. B. Menuett Takt 1–8">`)}${feld("Bis", `<input type="date" name="bis" value="${esc(w.bis || tagIso(new Date(Date.now() + 7 * 86400000)))}">`)}${feld("Ziel", `<select name="ziel_sterne">${[1, 2, 3].map((n) => `<option value="${n}" ${Number(w.ziel_sterne || 2) === n ? "selected" : ""}>${sterneText(n)}</option>`).join("")}</select>`)}</div>
    ${spez}${tempo}
    ${feld("Hinweis für die Kinder", `<textarea name="text" rows="2">${esc(w.text || "")}</textarea>`)}
    <div class="ub-raster3">${feld("Für ein Kind", `<select name="person_id"><option value="">– oder Register/Gruppe –</option>${optL(kinder, w.person_id, name)}</select>`)}
      ${feld("oder Register", `<select name="register_id"><option value="">alle</option>${optL(liste("register"), w.register_id, (r) => r.name)}</select>`)}
      ${feld("in Gruppe", `<select name="gruppe_id"><option value="">alle</option>${optL(liste("gruppen"), w.gruppe_id, (g) => g.name)}</select>`)}</div>
    <label class="schalter"><span>Kinder benachrichtigen</span><input type="checkbox" name="melden" ${w.melden === false ? "" : "checked"}></label>
    <div class="ub-knoepfe"><button type="button" class="knopf haupt" data-a="ubAufgabeSpeichern">💾 Aufgabe geben</button></div></div>`;
}
const formLesen = () => { const el = document.getElementById("ubForm"); if (el) Object.assign(F.werte, formWerte(el)); };
function formZeigen() { blatt("📝 Übe-Aufgabe geben", formHtml()); }
AKTIONEN.aufgabeNeu = () => { F.werte = { art: "notenstelle", melden: true }; F.rm = []; F.pause = false; formZeigen(); };
AKTIONEN.ubFormNeu = () => { formLesen(); formZeigen(); };
AKTIONEN.ubRmPause = (_, el) => { formLesen(); F.pause = el.checked; formZeigen(); };
AKTIONEN.ubRmPlus = (w) => { formLesen(); if (F.rm.length < 64) F.rm.push({ dauer: Number(w), pause: F.pause }); formZeigen(); };
AKTIONEN.ubRmWeg = () => { formLesen(); F.rm.pop(); formZeigen(); };
AKTIONEN.ubRmLeer = () => { formLesen(); F.rm = []; formZeigen(); };
AKTIONEN.ubRmHoeren = () => { formLesen(); const ctx = audioNeu(); if (ctx) rhythmusAbspielen(ctx, F.rm, Number(F.werte.taktart) || 4, Number(F.werte.tempo_ziel) || 80); };
AKTIONEN.ubFormDatei = async (_, el) => {
  const f = el.files?.[0]; if (!f) return;
  formLesen();
  try { const d = await hochladen(f, { art: el.dataset.x === "vorspiel" ? "sprache" : "noten" }); F.werte[el.dataset.x] = "datei:" + d.id; toast("📎 Hochgeladen"); formZeigen(); } catch (e) { toast(e.message); }
};
AKTIONEN.ubAufgabeSpeichern = async () => {
  formLesen();
  const w = F.werte, art = w.art || "frei";
  if (!w.titel) return toast("Bitte einen Titel eingeben");
  if (!(w.person_id || w.register_id || w.gruppe_id)) return toast("Bitte ein Kind, ein Register oder eine Gruppe wählen");
  if (art === "rhythmus" && !musterPruefen(F.rm, Number(w.taktart) || 4).ok) return toast("Der Rhythmus füllt noch nicht ganze Takte");
  const zahl = (v) => (v === "" || v == null ? null : Number(v));
  const a = await speichere("uebeaufgaben", { titel: w.titel, text: w.text || null, art, von_id: S.ich.id, bis: w.bis || null, erledigt: [], ziel_sterne: zahl(w.ziel_sterne),
    person_id: w.person_id || null, register_id: w.person_id ? null : w.register_id || null, gruppe_id: w.person_id ? null : w.gruppe_id || null,
    werk_id: ["frei", "material"].includes(art) ? w.werk_id || null : null, stueck: art === "notenstelle" ? w.stueck : null,
    takt_von: art === "notenstelle" ? zahl(w.takt_von) : null, takt_bis: art === "notenstelle" ? zahl(w.takt_bis) : null, tempo_ziel: ["notenstelle", "tonleiter", "rhythmus"].includes(art) ? zahl(w.tempo_ziel) : null,
    muster: art === "rhythmus" ? musterText(F.rm) : null, taktart: art === "rhythmus" ? zahl(w.taktart) || 4 : null, tonart: art === "tonleiter" ? w.tonart : null, oktaven: art === "tonleiter" ? zahl(w.oktaven) : null,
    ton: art === "tonhalten" ? w.ton : null, sekunden: art === "tonhalten" ? zahl(w.sekunden) : null, spiel: art === "gehoer" ? w.spiel : null,
    datei: art === "material" ? w.datei || null : null, vorspiel: art === "material" ? w.vorspiel || null : null });
  if (w.melden) await senden({ an: aufgabeKinder(db, a), betreff: `📝 Neue Übeaufgabe: ${a.titel}`, text: `${a.text || ""}${a.bis ? ` – bis ${datumKurz(a.bis)}` : ""}. In der App unter Bühne › Üben.`, ereignis: "standard" });
  blattZu(); toast("📝 Aufgabe gegeben"); zeichne();
};

// ================= 📊 Fortschritt & Rückmeldung (Lehrkräfte) =================
VIEWS.uebefortschritt = {
  render(p = {}) {
    if (!lehrt()) return kopf("📊 Fortschritt") + '<div class="leer">Nur für Lehrkräfte.</div>';
    const alle = p.alle === true, l = liste("uebeaufgaben", (a) => alle || a.von_id === S.ich.id).sort((a, b) => String(b.bis || "").localeCompare(String(a.bis || "")));
    const AMP = (s) => (s.ziel ? '<span class="badge b-gruen">✅ Ziel</span>' : s.anzahl ? '<span class="badge b-gelb">🟡 geübt</span>' : '<span class="badge">⚪ offen</span>');
    return kopf("📊 Übe-Fortschritt", `<button class="knopf klein" data-a="aufgabeNeu">＋ Aufgabe</button>`)
      + `<div class="umschalter"><button class="${alle ? "" : "an"}" data-a="ubFAlle" data-x="0">Meine Aufgaben</button><button class="${alle ? "an" : ""}" data-a="ubFAlle" data-x="1">Alle Aufgaben</button></div>`
      + (l.map((a) => {
        const st = uebeStand(db, a), ziel = st.filter((x) => x.ziel).length;
        return `<details class="karte ub-fort" ${p.offen === a.id ? "open" : ""}><summary><b>${esc(a.titel)}</b><span class="hinweis">${esc(UEBE_ARTEN[a.art || "frei"] || "")} · ${st.length} ${st.length === 1 ? "Kind" : "Kinder"} · ✅ ${ziel} · 🟡 ${st.filter((x) => !x.ziel && x.anzahl).length}${a.bis ? ` · bis ${datumKurz(a.bis)}` : ""}</span></summary>
          <div class="ub-tabelle" tabindex="0" role="region" aria-label="Stand ${esc(a.titel)}"><table><thead><tr><th>Kind</th><th>Stand</th><th>Ergebnis</th><th></th></tr></thead><tbody>${st.map((s) => `<tr>
            <td>${esc(name(s.pid))}</td><td>${AMP(s)}</td><td>${s.anzahl ? `${s.anzahl}× · ${sterneText(s.sterne)}${s.tempo ? ` · ♩ ${s.tempo}` : ""}` : "–"}</td>
            <td class="ub-akt">${s.aufnahme ? `<button class="knopf klein" data-a="ubVorspiel" data-x="${esc(s.aufnahme.aufnahme)}" title="Aufnahme anhören">🎙️</button>` : ""}<button class="knopf klein" data-a="ubRueckmeldung" data-x="${a.id}|${s.pid}" title="Rückmeldung geben">💬${s.rueckmeldung ? " ✓" : ""}</button></td></tr>`).join("")}</tbody></table></div>
          <div class="ub-knoepfe"><button class="knopf klein" data-a="ubAufgabeLoeschen" data-x="${a.id}">🗑 Aufgabe löschen</button></div></details>`;
      }).join("") || '<div class="leer">Noch keine Übe-Aufgaben.</div>');
  },
};
AKTIONEN.ubFortschritt = () => zeige("uebefortschritt", {});
AKTIONEN.ubFAlle = (x) => zeige("uebefortschritt", { alle: x === "1" }, { ersetzen: true });
AKTIONEN.ubRueckmeldung = (x) => {
  const [aid, pid] = x.split("|"), a = hole("uebeaufgaben", aid), s = uebeStand(db, a).find((y) => y.pid === pid);
  blatt(`💬 Rückmeldung für ${vorname(pid)}`, `<p class="hinweis">${esc(a.titel)}${s?.anzahl ? ` · ${s.anzahl}× geübt · beste ${sterneText(s.sterne)}` : " · noch nicht geübt"}</p>
    <div id="ubRmForm"><div class="feld"><label>Rückmeldung</label><textarea name="text" rows="3" placeholder="z. B. Schon richtig gut! Achte auf …">${esc(s?.rueckmeldung?.rueckmeldung || "")}</textarea></div>
    <div class="ub-chips">${["👍 Super!", "🌟 Klasse geübt!", "🐢 Noch etwas langsamer üben", "🎯 Achte auf die Intonation"].map((t) => `<button type="button" data-a="ubRmVorschlag" data-x="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <div class="ub-knoepfe"><button class="knopf haupt" data-a="ubRmSpeichern" data-x="${esc(x)}">💾 Speichern</button></div></div>`);
};
AKTIONEN.ubRmVorschlag = (t) => { const ta = document.querySelector('#ubRmForm textarea'); if (ta) ta.value = (ta.value ? ta.value + " " : "") + t; };
AKTIONEN.ubRmSpeichern = async (x) => {
  const [aid, pid] = x.split("|"), text = document.querySelector("#ubRmForm textarea")?.value.trim();
  if (!text) return toast("Bitte etwas schreiben");
  const a = hole("uebeaufgaben", aid), s = uebeStand(db, a).find((y) => y.pid === pid), e = s?.letzte;
  await speichere("uebe_ergebnisse", e ? { ...e, rueckmeldung: text, rueckmeldung_von: S.ich.id } : { person_id: pid, aufgabe_id: aid, modus: null, datum: tagIso(new Date()), rueckmeldung: text, rueckmeldung_von: S.ich.id });
  await senden({ an: [pid], betreff: `💬 Rückmeldung zu „${a.titel}“`, text, ereignis: "standard" });
  blattZu(); toast("💬 Rückmeldung gespeichert"); zeichne();
};
AKTIONEN.ubAufgabeLoeschen = async (id) => { if (await frage("Aufgabe löschen? Die Ergebnisse der Kinder bleiben erhalten.")) { await loesche("uebeaufgaben", id); zeichne(); } };

// Bühne verlassen / App im Hintergrund: Ton und Mikrofon aus
document.addEventListener("bk-ansicht", () => { if (S.view !== "buehne") { audioStopp(); micStopp(); } });
document.addEventListener("visibilitychange", () => { if (document.hidden) { audioStopp(); micStopp(); } });
export const offeneUebeAufgaben = (pid) => liste("uebeaufgaben", (a) => aufgabeGiltFuer(db, a, pid) && !(a.erledigt || []).includes(pid) && (!a.bis || a.bis >= tagIso(new Date()))).length;
