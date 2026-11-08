// 💡🗳️ Vorschläge & Abstimmungen (0.41.0, wie KC-CLUB-ABSTIMMUNG, KC-CLUB-VORSCHLAG-*, KC-CLUB-VORSCHLAG-ERLEDIGT):
// 💡 Vorschlag: jede/r reicht eine Idee ein (an alle oder ans Team), andere unterstützen mit 👍. Das Team macht daraus eine Abstimmung oder legt ihn
// als ✅ erledigt (mit Ergebnis) ab. 🗳️ Abstimmung: Leitung/Lehrkräfte/Vorstand fragen alle, Eltern, das Team oder den Vorstand – mit Frist, eigenen
// Antworten (sonst Ja/Nein/Enthaltung) und auf Wunsch 🔒 geheim (dann sieht niemand, wer wie gestimmt hat – erzwingt der Server).
import { S, VIEWS, zeige, zeichne, kopf, name, hatRolle, istVerwalter } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { VS_AN, VS_ABSTIMMEN, vsZielgruppe, vsAuszaehlen } from "../kern/schema.js";
import { tagIso } from "../kern/logik.js";
import { senden } from "../kern/versand.js";
import { startseiteVerbinden } from "./startseite.js";

const ich = () => S.ich?.id;
const leitet = () => hatRolle("admin", "leitung");
export const darfAbstimmungAnlegen = () => hatRolle(...VS_ABSTIMMEN);
const zielgruppe = (v) => vsZielgruppe(v, { typ: S.ich?.typ, rollen: S.ich?.rollen || [], verwalter: istVerwalter() });
const stimmenVon = (v) => liste("vorschlag_stimmen", (s) => s.vorschlag_id === v.id);
const meineStimme = (v) => stimmenVon(v).find((s) => s.person_id === ich());
// gleiche Regel wie der Server (vsSichtbar) – wichtig für die Vorführversion ohne Server
const sichtbar = (v) => v.von === ich() || zielgruppe(v) || (v.an !== "vorstand" && istVerwalter());
const laeuft = (v) => v.status === "offen" && (!v.frist || v.frist >= tagIso(new Date()));
// offene Abstimmungen für mich ohne meine Stimme (für „Für dich“ und die Kachel)
export const offeneAbstimmungen = () => liste("vorschlaege", (v) => v.art === "abstimmung" && laeuft(v) && zielgruppe(v) && !meineStimme(v)?.wahl);
const V = { tab: "abstimmungen" };

VIEWS.vorschlaege = {
  render() {
    const alle = liste("vorschlaege", sichtbar).sort((a, b) => String(b.erstellt_am || b.id).localeCompare(String(a.erstellt_am || a.id)));
    const abst = alle.filter((v) => v.art === "abstimmung" && v.status === "offen"), vors = alle.filter((v) => v.art === "vorschlag" && v.status === "offen"), fertig = alle.filter((v) => v.status !== "offen");
    const tabs = [["abstimmungen", `🗳️ Abstimmungen (${abst.length})`], ["vorschlaege", `💡 Vorschläge (${vors.length})`], ["erledigt", `✅ Erledigt (${fertig.length})`]];
    const l = V.tab === "vorschlaege" ? vors : V.tab === "erledigt" ? fertig : abst;
    return kopf("💡 Vorschläge & Abstimmungen", `<button class="knopf klein" data-a="vsNeu" data-x="vorschlag">＋ Vorschlag</button>${darfAbstimmungAnlegen() ? '<button class="knopf haupt klein" data-a="vsNeu" data-x="abstimmung">＋ Abstimmung</button>' : ""}`)
      + `<div class="umschalter vier" role="group" aria-label="Ansicht">${tabs.map(([k, t]) => `<button type="button" class="${V.tab === k ? "an" : ""}" aria-pressed="${V.tab === k}" data-a="vsTab" data-x="${k}">${t}</button>`).join("")}</div>`
      + (l.length ? l.map(karte).join("") : `<div class="leer">${V.tab === "vorschlaege" ? "Noch keine Vorschläge – hast du eine Idee? ＋ Vorschlag" : V.tab === "erledigt" ? "Noch nichts erledigt." : "Gerade läuft keine Abstimmung."}</div>`);
  },
};
AKTIONEN.vsTab = (k) => { V.tab = k; zeichne(); };
function karte(v) {
  const z = vsAuszaehlen(v, stimmenVon(v)), meine = meineStimme(v)?.wahl, offen = laeuft(v), darf = offen && zielgruppe(v), chef = v.von === ich() || leitet() || (v.an === "vorstand" && hatRolle("vorstand"));
  const namenSichtbar = !v.anonym && chef, max = Math.max(1, ...z.optionen.map((o) => o.zahl));
  const kopfZ = `<div class="vs-kopf"><span class="badge">${v.art === "abstimmung" ? "🗳️ Abstimmung" : "💡 Vorschlag"}</span><span class="badge">${esc(VS_AN[v.an] || "")}</span>${v.anonym ? '<span class="badge b-gelb">🔒 geheim</span>' : ""}${v.frist && v.status === "offen" ? `<span class="badge${offen ? "" : " b-rot"}">⏰ ${offen ? "bis" : "beendet"} ${esc(new Date(v.frist + "T12:00").toLocaleDateString("de-DE"))}</span>` : ""}</div>`;
  const auswahl = v.art === "abstimmung"
    ? `<div class="vs-optionen">${z.optionen.map((o) => `<div class="vs-option${meine === o.id ? " meine" : ""}">${darf ? `<button type="button" class="knopf${meine === o.id ? " haupt" : ""}" aria-pressed="${meine === o.id}" data-a="vsStimme" data-x="${esc(v.id)}|${esc(o.id)}">${esc(o.t)}</button>` : `<b>${esc(o.t)}</b>`}
        <div class="vs-balken" role="img" aria-label="${o.zahl} Stimmen"><i style="width:${Math.round((o.zahl / max) * 100)}%"></i></div><small>${o.zahl}</small></div>`).join("")}</div>`
    : `<div class="knopfreihe">${darf ? `<button type="button" class="knopf${meine ? " haupt" : ""}" aria-pressed="${!!meine}" data-a="vsStimme" data-x="${esc(v.id)}|dafuer">👍 ${meine ? "Unterstützt" : "Unterstützen"}</button>` : ""}<span class="vs-zahl">👍 ${z.stimmen} ${z.stimmen === 1 ? "Unterstützung" : "Unterstützungen"}</span></div>`;
  return `<div class="karte vs-karte">${kopfZ}<h3>${esc(v.titel)}</h3>${v.text ? `<p>${esc(v.text)}</p>` : ""}<p class="hinweis">von ${esc(name(v.von))}${v.art === "abstimmung" ? ` · ${z.stimmen} ${z.stimmen === 1 ? "Stimme" : "Stimmen"}` : ""}</p>
    ${v.status === "offen" ? auswahl : ""}${v.ergebnis ? `<p class="vs-ergebnis">✅ <b>Ergebnis:</b> ${esc(v.ergebnis)}</p>` : v.status !== "offen" ? `<div class="vs-optionen">${z.optionen.map((o) => `<div class="vs-option"><b>${esc(o.t)}</b><small>${o.zahl}</small></div>`).join("")}</div>` : ""}
    ${meine && darf ? `<button type="button" class="knopf klein" data-a="vsStimme" data-x="${esc(v.id)}|">↩️ Stimme zurücknehmen</button>` : ""}
    ${namenSichtbar && z.stimmen ? `<details><summary>Wer hat wie gestimmt?</summary><ul class="liste">${stimmenVon(v).filter((s) => s.wahl && s.person_id).map((s) => `<li><div class="fl">${esc(name(s.person_id))}</div><span>${esc(z.optionen.find((o) => o.id === s.wahl)?.t || s.wahl)}</span></li>`).join("")}</ul></details>` : ""}
    ${chef && v.status === "offen" ? `<div class="knopfreihe">${v.art === "vorschlag" && darfAbstimmungAnlegen() ? `<button type="button" class="knopf klein" data-a="vsZurAbstimmung" data-x="${esc(v.id)}">🗳️ Abstimmung daraus</button>` : ""}<button type="button" class="knopf klein" data-a="vsAbschliessen" data-x="${esc(v.id)}">✅ Abschließen</button>${v.art === "abstimmung" ? `<button type="button" class="knopf klein" data-a="vsErinnern" data-x="${esc(v.id)}">📣 Erinnern</button>` : ""}</div>` : ""}</div>`;
}
AKTIONEN.vsStimme = async (x) => {
  const [id, wahl] = String(x).split("|"), v = hole("vorschlaege", id); if (!v) return;
  const alt = meineStimme(v), neu = wahl && alt?.wahl === wahl && v.art === "vorschlag" ? null : wahl || null;
  try { await speichere("vorschlag_stimmen", { ...(alt || { id: neueId() }), vorschlag_id: v.id, person_id: ich(), wahl: neu, am: new Date().toISOString() }); }
  catch (e) { return toast("⚠️ " + e.message); }
  toast(neu ? (v.art === "vorschlag" ? "👍 Danke für die Unterstützung" : "🗳️ Deine Stimme ist gezählt") : "↩️ Zurückgenommen"); zeichne();
};
AKTIONEN.vsAbschliessen = (id) => {
  const v = hole("vorschlaege", id); if (!v) return;
  blatt("✅ Abschließen", `<div class="feld"><label for="vsErg">Ergebnis / Beschluss (für alle sichtbar)</label><textarea id="vsErg" rows="3" maxlength="2000" placeholder="${v.art === "abstimmung" ? "z. B. Mehrheit für den Harz – wir buchen" : "z. B. umgesetzt / nicht möglich, weil …"}">${esc(v.ergebnis || "")}</textarea></div>
    <button type="button" class="knopf haupt breit" data-a="vsAbschliessenJetzt" data-x="${esc(id)}">✅ Abschließen</button>`);
};
AKTIONEN.vsAbschliessenJetzt = async (id) => { const v = hole("vorschlaege", id); await speichere("vorschlaege", { ...v, status: v.art === "abstimmung" ? "beendet" : "erledigt", ergebnis: document.getElementById("vsErg")?.value || null }); blattZu(); V.tab = "erledigt"; toast("✅ Abgeschlossen"); zeichne(); };
AKTIONEN.vsZurAbstimmung = (id) => { const v = hole("vorschlaege", id); vsForm({ art: "abstimmung", titel: v.titel, text: `${v.text || ""}${v.text ? "\n\n" : ""}(aus dem Vorschlag von ${name(v.von)})`, an: "alle", ausVorschlag: v.id }); };
AKTIONEN.vsErinnern = async (id) => {
  const v = hole("vorschlaege", id); if (!v) return;
  const schon = new Set(stimmenVon(v).filter((s) => s.wahl && s.person_id).map((s) => s.person_id));
  const an = liste("personen", (p) => p.status === "aktiv" && p.id !== ich() && vsZielgruppe(v, { typ: p.typ, rollen: p.rollen || [], verwalter: (p.rollen || []).some((r) => ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"].includes(r)) }) && (v.anonym || !schon.has(p.id))).map((p) => p.id);
  if (!an.length) return toast("👍 Alle haben abgestimmt");
  await senden({ an, betreff: `🗳️ Bitte abstimmen: ${v.titel}`, text: `In der Bachkreis-App unter 💡 Vorschläge & Abstimmungen${v.frist ? ` – bis ${new Date(v.frist + "T12:00").toLocaleDateString("de-DE")}` : ""}.`, ereignis: "rundschreiben" });
  toast(`📣 ${an.length} erinnert${v.anonym ? " (geheim: alle aus der Zielgruppe)" : ""}`);
};

// ---------- Neu ----------
AKTIONEN.vsNeu = (art) => vsForm({ art: art === "abstimmung" && darfAbstimmungAnlegen() ? "abstimmung" : "vorschlag" });
function vsForm(v) {
  const ab = v.art === "abstimmung", an = ab ? VS_AN : { alle: VS_AN.alle, team: "🧑‍🏫 nur an Leitung & Team (Idee)" };
  const frist = new Date(); frist.setDate(frist.getDate() + 10);
  blatt(ab ? "🗳️ Neue Abstimmung" : "💡 Neuer Vorschlag", `<div id="vsForm" class="vl-form">
    <div class="feld"><label for="vsTitel">${ab ? "Frage" : "Deine Idee"} *</label><input id="vsTitel" name="titel" maxlength="140" value="${esc(v.titel || "")}" placeholder="${ab ? "z. B. Probenfahrt 2027: wohin?" : "z. B. Weihnachtslied ins Programm"}"></div>
    <div class="feld"><label for="vsText">Beschreibung</label><textarea id="vsText" name="text" rows="3" maxlength="2000">${esc(v.text || "")}</textarea></div>
    <div class="feld"><label for="vsAn">Für wen?</label><select id="vsAn" name="an">${Object.entries(an).map(([k, t]) => `<option value="${k}" ${k === (v.an || "alle") ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
    ${ab ? `<div class="feld"><label for="vsOpt">Antworten (eine je Zeile – leer = 👍 Ja · 👎 Nein · 🤷 Enthaltung)</label><textarea id="vsOpt" name="optionen" rows="3" placeholder="🌲 Harz&#10;🌊 Nordsee"></textarea></div>
      <div class="vl-raster"><div class="feld"><label for="vsFrist">Abstimmen bis</label><input id="vsFrist" name="frist" type="date" value="${tagIso(frist)}"></div>
      <label class="feld vs-geheim"><span><input type="checkbox" name="anonym"> 🔒 geheim</span><small class="hinweis">Niemand sieht, wer wie gestimmt hat – auch die Leitung nicht.</small></label></div>` : ""}
    <button type="button" class="knopf haupt breit" data-a="vsAnlegen" data-x="${esc(v.art)}|${esc(v.ausVorschlag || "")}">${ab ? "🗳️ Abstimmung starten" : "💡 Vorschlag einreichen"}</button></div>`);
}
AKTIONEN.vsAnlegen = async (x) => {
  const [art, aus] = String(x).split("|"), f = formWerte(document.getElementById("vsForm"));
  if (!String(f.titel || "").trim()) return toast("Bitte kurz beschreiben, worum es geht.");
  const optionen = art === "abstimmung" ? String(f.optionen || "").split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 12).map((t, i) => ({ id: `o${i + 1}`, t })) : null;
  if (optionen && optionen.length === 1) return toast("Bitte mindestens zwei Antworten – oder leer lassen für Ja/Nein/Enthaltung.");
  const v = { id: neueId(), titel: f.titel.trim(), text: f.text || null, von: ich(), art, an: f.an, optionen: optionen?.length ? optionen : null, frist: art === "abstimmung" ? f.frist || null : null, anonym: !!f.anonym, status: "offen" };
  try { await speichere("vorschlaege", v); } catch (e) { return toast("⚠️ " + e.message); }
  if (aus) { const alt = hole("vorschlaege", aus); if (alt) await speichere("vorschlaege", { ...alt, status: "erledigt", ergebnis: `🗳️ Wird abgestimmt: „${v.titel}“` }).catch(() => {}); }
  blattZu(); V.tab = art === "abstimmung" ? "abstimmungen" : "vorschlaege";
  if (art === "abstimmung") {
    const an = liste("personen", (p) => p.status === "aktiv" && p.id !== ich() && vsZielgruppe(v, { typ: p.typ, rollen: p.rollen || [], verwalter: (p.rollen || []).some((r) => ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"].includes(r)) })).map((p) => p.id);
    senden({ an, betreff: `🗳️ Neue Abstimmung: ${v.titel}`, text: `Bitte in der Bachkreis-App unter 💡 Vorschläge & Abstimmungen abstimmen${v.frist ? ` – bis ${new Date(v.frist + "T12:00").toLocaleDateString("de-DE")}` : ""}.`, ereignis: "rundschreiben" }).catch(() => {});
  }
  toast(art === "abstimmung" ? "🗳️ Abstimmung gestartet" : "💡 Danke für deinen Vorschlag!"); zeige("vorschlaege");
};
startseiteVerbinden({ vsOffen: offeneAbstimmungen });

