// 📝 Leihvertrag als Formular (0.52.0): Name, Anschrift, Geburtsdatum, ein oder mehrere Instrumente, Ausstattung und Zubehör, Leihe ab/bis,
// Kaution/Gebühr/Versicherung, Leihbedingungen mit Schadensklausel – und drei Unterschriften: Mitglied, Erziehungsberechtigte (bei Minderjährigen),
// für den Bachkreis. Unterschrieben wird mit dem Finger – vor Ort auf einem Gerät oder jede/r auf dem eigenen Handy. Drucken/PDF und leeres Formular.
// Der Server prüft: jede/r setzt nur die eigene Unterschrift; was unterschrieben ist, ändert niemand mehr.
import { S, VIEWS, db, zeige, zeichne, kopf, name, hatRolle } from "./zustand.js"; // eslint-disable-line no-unused-vars
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, konfig, neueId } from "../kern/daten.js";
import { LEIH_ZUBEHOER, LV_STATUS, LV_VERWALTER, LV_ROLLEN, LV_KLAUSEL, istMinderjaehrig } from "../kern/schema.js";
import { elternVon } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

export const lvChef = () => hatRolle(...LV_VERWALTER);
const ich = () => S.ich?.id;
const tagIso = (d) => new Date(d).toISOString().slice(0, 10);
const dat = (iso) => (iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
const geld = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }));
const typName = (id) => hole("instrument_typen", id)?.name || "Instrument";
const anschriftVon = (p) => (p ? [p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");
const minderjaehrig = (pid) => { const p = hole("personen", pid); return p?.typ === "schueler" && istMinderjaehrig(p); };
export const noetigeRollen = (v) => ["mitglied", ...(minderjaehrig(v.person_id) ? ["eltern"] : []), "bachkreis"];
// darf ich diesen Platz unterschreiben? (vorOrt: Verwaltung lässt auf ihrem Gerät unterschreiben)
function darfUnterschreiben(v, rolle) {
  if (!["entwurf", "wartet"].includes(v.status) || v.unterschriften?.[rolle]) return false;
  if (rolle === "bachkreis") return lvChef();
  if (rolle === "mitglied") return v.person_id === ich() || lvChef();
  return elternVon(db, v.person_id).includes(ich()) || lvChef();
}
const vorOrt = (v, rolle) => rolle !== "bachkreis" && lvChef() && !(rolle === "mitglied" ? v.person_id === ich() : elternVon(db, v.person_id).includes(ich()));
export const meineOffenenUnterschriften = () => liste("leihvertraege", (v) => v.status === "wartet" && noetigeRollen(v).some((r) => r !== "bachkreis" && !v.unterschriften?.[r] && (r === "mitglied" ? v.person_id === ich() : elternVon(db, v.person_id).includes(ich())))).length;

// ---------- Das Dokument (Anzeige und Druck; ohne v = leeres Papierformular) ----------
function zeileLeer(t, w = "") { return `<div class="lv-zeile"><span class="lv-l">${t}</span><span class="lv-w">${w ? esc(w) : "&nbsp;"}</span></div>`; }
export function vertragHtml(v = null) {
  const k = konfig(), p = v && hole("personen", v.person_id), leer = !v;
  const inv = (v?.inventar_ids || []).map((id) => hole("inventar", id)).filter(Boolean), aus = (v?.ausstattung_ids || []).map((id) => hole("ausstattung", id)).filter(Boolean);
  const reihen = leer ? Array.from({ length: 3 }, () => "<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>").join("")
    : [...inv.map((i) => `<tr><td>${esc(i.inventar_nr)}</td><td>${esc(typName(i.typ_id))}</td><td>${esc([i.bezeichnung, i.groesse].filter(Boolean).join(" · "))}</td><td>${esc(geld(i.wert))}</td></tr>`),
      ...aus.map((a) => `<tr><td>${esc(a.nr || a.inventar_nr || "")}</td><td>${esc(a.bezeichnung || a.name || "Ausstattung")}</td><td></td><td>${esc(geld(a.wert))}</td></tr>`)].join("") || '<tr><td colspan="4">–</td></tr>';
  const zub = leer ? Object.values(LEIH_ZUBEHOER).map((t) => `☐ ${esc(t)}`).join("&nbsp;&nbsp; ") : [...(v.zubehoer || []).map((z) => LEIH_ZUBEHOER[z] || z), v.zubehoer_frei].filter(Boolean).map(esc).join(", ") || "–";
  const feld = (rolle) => {
    const u = v?.unterschriften?.[rolle], noetig = !v || noetigeRollen(v).includes(rolle);
    if (!noetig) return "";
    return `<div class="lv-unterschrift"><div class="lv-u-bild">${u ? `<img src="${esc(u.bild)}" alt="Unterschrift ${esc(u.name)}">` : v && darfUnterschreiben(v, rolle) ? `<button type="button" class="knopf haupt" data-a="lvUnterschreiben" data-x="${esc(v.id)}|${rolle}">✍️ ${vorOrt(v, rolle) ? "Vor Ort unterschreiben lassen" : "Jetzt unterschreiben"}</button>` : ""}</div>
      <div class="lv-u-linie">${u ? `${esc(dat(u.zeit))}, ${esc(u.name)}${u.vor_ort ? " (vor Ort)" : ""}` : "Ort, Datum, Unterschrift"}</div><div class="lv-u-rolle">${esc(LV_ROLLEN[rolle])}</div></div>`;
  };
  return `<article class="lv-dokument" aria-label="Leihvertrag">
    <header class="lv-kopf"><img src="icons/logo.png" alt="" width="54" height="54"><div><h2>Leihvertrag</h2><div>${esc(k.name || "Bachkreis Bergkamen")}${v?.nr ? ` · Nr. ${esc(v.nr)}` : " · Nr. ________"}</div></div></header>
    <p>Zwischen dem <b>${esc(k.name || "Bachkreis Bergkamen")}</b> (Verleiher) und</p>
    <section class="lv-block"><h3>Entleiher/in (Mitglied)</h3>${zeileLeer("Name", p ? name(p) : "")}${zeileLeer("Anschrift", v?.anschrift)}${zeileLeer("Geburtsdatum", dat(v?.geburtsdatum))}${zeileLeer("Telefon", v?.telefon)}</section>
    ${leer || minderjaehrig(v.person_id) || v.eltern_name ? `<section class="lv-block"><h3>Erziehungsberechtigte/r</h3>${zeileLeer("Name", v?.eltern_name)}${zeileLeer("Anschrift", v?.eltern_anschrift)}</section>` : ""}
    <section class="lv-block"><h3>Leihgegenstände</h3><table class="lv-tabelle"><thead><tr><th>Inv.-Nr.</th><th>Instrument / Gegenstand</th><th>Bezeichnung</th><th>Wert</th></tr></thead><tbody>${reihen}</tbody></table>
      ${zeileLeer("Zubehör", "").replace("&nbsp;", zub)}${v?.hinweis ? zeileLeer("Zustand / Besonderheiten", v.hinweis) : leer ? zeileLeer("Zustand / Besonderheiten") : ""}</section>
    <section class="lv-block lv-zwei">${zeileLeer("Leihe ab", dat(v?.von))}${zeileLeer("Rückgabe bis", v ? dat(v.bis) || "auf Widerruf" : "")}
      ${zeileLeer("Kaution", v ? geld(v.kaution) || "keine" : "")}${zeileLeer("Leihgebühr je Jahr", v ? geld(v.gebuehr) || "keine" : "")}
      ${zeileLeer("Versicherung", v ? { verein: "über den Förderverein", privat: "privat (Hausrat)", keine: "keine" }[v.versicherung] || "–" : "☐ Förderverein  ☐ privat  ☐ keine")}</section>
    <section class="lv-block"><h3>Leihbedingungen und Haftung bei Schäden</h3><div class="lv-klausel">${esc(v?.klausel || konfig().leih_klausel || LV_KLAUSEL)}</div></section>
    <p class="lv-bestaetigung">Mit der Unterschrift bestätigen die Unterzeichnenden den Empfang der Gegenstände in dem beschriebenen Zustand und erkennen die Leihbedingungen an.</p>
    <section class="lv-unterschriften">${feld("mitglied")}${feld("eltern")}${feld("bachkreis")}</section>
  </article>`;
}

// ---------- ✍️ Unterschreiben mit dem Finger ----------
const PAD = { zeichnet: false, striche: 0 };
AKTIONEN.lvUnterschreiben = (x) => {
  const [id, rolle] = String(x).split("|"), v = hole("leihvertraege", id); if (!v) return;
  const vorschlag = rolle === "bachkreis" ? name(S.ich) : rolle === "mitglied" ? name(v.person_id) : v.eltern_name || (elternVon(db, v.person_id).includes(ich()) ? name(S.ich) : "");
  blatt(`✍️ Unterschrift: ${LV_ROLLEN[rolle]}`, `${vorOrt(v, rolle) ? `<p class="badge b-gelb">Vor Ort: Bitte das Gerät an ${esc(rolle === "mitglied" ? name(v.person_id) : "die Erziehungsberechtigten")} geben.</p>` : ""}
    <div class="feld"><label for="lvName">Name in Druckbuchstaben</label><input id="lvName" value="${esc(vorschlag)}" maxlength="80" autocomplete="name"></div>
    <p class="hinweis">Mit dem Finger oder der Maus im Feld unterschreiben:</p><canvas id="lvPad" class="lv-pad" width="600" height="220" role="img" aria-label="Unterschriftenfeld"></canvas>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="lvPadNeu">↺ Nochmal</button><button type="button" class="knopf haupt" data-a="lvPadFertig" data-x="${esc(id)}|${rolle}">✍️ Unterschreiben</button></div>
    <p class="hinweis">Gespeichert werden das Bild der Unterschrift, der Name, Datum und Uhrzeit.</p>`);
  padEinrichten();
};
function padEinrichten() {
  const c = document.getElementById("lvPad"); if (!c) return;
  const g = c.getContext("2d"); g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0d2a6b"; PAD.striche = 0;
  const pkt = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]; };
  c.addEventListener("pointerdown", (e) => { e.preventDefault(); c.setPointerCapture?.(e.pointerId); PAD.zeichnet = true; PAD.striche++; const [x, y] = pkt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); });
  c.addEventListener("pointermove", (e) => { if (!PAD.zeichnet) return; e.preventDefault(); const [x, y] = pkt(e); g.lineTo(x, y); g.stroke(); });
  const ende = () => { PAD.zeichnet = false; };
  c.addEventListener("pointerup", ende); c.addEventListener("pointercancel", ende); c.addEventListener("pointerleave", ende);
}
AKTIONEN.lvPadNeu = () => { const c = document.getElementById("lvPad"); c?.getContext("2d").clearRect(0, 0, c.width, c.height); PAD.striche = 0; };
AKTIONEN.lvPadFertig = async (x) => {
  const [id, rolle] = String(x).split("|"), v = hole("leihvertraege", id), c = document.getElementById("lvPad"), nameU = document.getElementById("lvName")?.value.trim();
  if (!v || !c) return;
  if (!nameU) return toast("Bitte den Namen eintragen");
  if (PAD.striche < 1) return toast("Bitte im Feld unterschreiben");
  const u = { name: nameU, bild: c.toDataURL("image/png"), vor_ort: vorOrt(v, rolle) };
  try {
    const neu = await speichere("leihvertraege", { ...v, unterschriften: { ...(v.unterschriften || {}), [rolle]: { ...u, zeit: new Date().toISOString(), von: ich() } } });
    blattZu(); toast("✍️ Unterschrieben – danke!");
    const n = hole("leihvertraege", id) || neu;
    if (noetigeRollen(n).every((r) => n.unterschriften?.[r]) && n.status !== "unterschrieben") await speichere("leihvertraege", { ...n, status: "unterschrieben" }); // Vorführung: wie der Server
    zeichne();
  } catch (e) { toast("⚠️ " + (e.message || "Unterschrift ging nicht")); }
};

// ---------- Ansichten ----------
const statusBadge = (v) => `<span class="badge ${v.status === "unterschrieben" ? "b-gruen" : v.status === "wartet" ? "b-gelb" : ""}">${esc(LV_STATUS[v.status] || v.status)}</span>`;
const fehlt = (v) => noetigeRollen(v).filter((r) => !v.unterschriften?.[r]).map((r) => LV_ROLLEN[r]);
VIEWS.leihvertraege = {
  render() {
    const meine = new Set([ich(), ...liste("eltern_kind", (e) => e.eltern_id === ich()).map((e) => e.kind_id)]);
    const l = liste("leihvertraege", (v) => lvChef() || meine.has(v.person_id)).sort((a, b) => String(b.von).localeCompare(String(a.von)));
    const zeile = (v) => `<li><button type="button" class="lv-zeile-knopf" data-a="oeffne" data-x="leihvertrag|${esc(v.id)}"><span aria-hidden="true">📝</span><div class="fl"><b>${esc(name(v.person_id))}</b>
      <div class="zeile-unter">${esc(v.nr || "")} · ${(v.inventar_ids || []).map((i) => esc(typName(hole("inventar", i)?.typ_id))).join(", ") || "–"} · ab ${esc(dat(v.von))}</div>
      ${v.status === "wartet" ? `<div class="zeile-unter">✍️ fehlt: ${esc(fehlt(v).join(", "))}</div>` : ""}</div>${statusBadge(v)}</button></li>`;
    return kopf("📝 Leihverträge", lvChef() ? '<button type="button" class="knopf haupt klein" data-a="lvNeu">＋ Neu</button>' : "")
      + `<p class="hinweis">Leihvertrag für Instrumente und Zubehör – mit Unterschrift von Mitglied, Erziehungsberechtigten und Bachkreis, direkt auf dem Handy oder auf Papier.</p>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="lvLeerDrucken">🖨️ Leeres Formular drucken</button>${lvChef() ? '<button type="button" class="knopf" data-a="lvKlausel">⚙️ Leihbedingungen</button>' : ""}</div>
      <div class="karte"><ul class="liste">${l.map(zeile).join("") || "<li>Noch keine Leihverträge.</li>"}</ul></div>`;
  },
};
VIEWS.leihvertrag = {
  render({ id }) {
    const v = hole("leihvertraege", id); if (!v) return kopf("📝 Leihvertrag") + '<div class="leer">Nicht gefunden.</div>';
    const chef = lvChef(), ausgegeben = liste("ausleihen", (a) => a.leihvertrag_id === v.id && a.status === "aktiv").length;
    const offen = fehlt(v);
    return kopf(`📝 ${v.nr || "Leihvertrag"}`) + `<div class="lv-status">${statusBadge(v)}${offen.length && v.status !== "beendet" ? ` <span class="hinweis">Es fehlt: ${esc(offen.join(", "))}</span>` : ""}</div>
      ${vertragHtml(v)}
      <div class="knopfreihe lv-knoepfe"><button type="button" class="knopf" data-a="lvDrucken">🖨️ Drucken / PDF</button>
        ${chef && v.status === "entwurf" ? `<button type="button" class="knopf haupt" data-a="lvSenden" data-x="${esc(v.id)}">📨 Zur Unterschrift senden</button>` : ""}
        ${chef && v.status === "wartet" ? `<button type="button" class="knopf" data-a="lvSenden" data-x="${esc(v.id)}">🔔 Erinnern</button>` : ""}
        ${chef && !Object.keys(v.unterschriften || {}).length && v.status !== "beendet" ? `<button type="button" class="knopf" data-a="lvBearbeiten" data-x="${esc(v.id)}">✏️ Ändern</button>` : ""}
        ${chef && v.status === "unterschrieben" && !ausgegeben ? `<button type="button" class="knopf haupt" data-a="lvAusgeben" data-x="${esc(v.id)}">🤝 Instrumente ausgeben</button>` : ""}
        ${chef && v.status === "unterschrieben" ? `<button type="button" class="knopf" data-a="lvRueckgabe" data-x="${esc(v.id)}">↩️ Rückgabe</button>` : ""}</div>`;
  },
};
// ---------- Formular ----------
const F = { v: null };
VIEWS.leihvertragForm = {
  render({ id, inventar } = {}) {
    if (!lvChef()) return kopf("📝 Leihvertrag") + '<p class="hinweis">Nur für die Instrumentenverwaltung.</p>';
    const v = (F.v = id ? hole("leihvertraege", id) : F.v?.id === "neu" ? F.v : { id: "neu", inventar_ids: inventar ? [inventar] : [], zubehoer: ["koffer"], von: tagIso(new Date()), bis: tagIso(new Date(Date.now() + 365 * 86400000)), kaution: konfig().leih_kaution ?? "", versicherung: "verein" });
    const personen = liste("personen", (p) => p.status !== "ausgetreten" && ["schueler", "ehemalig", "lehrkraft", "leitung", "eltern", "foerderverein"].includes(p.typ)).sort((a, b) => name(a).localeCompare(name(b)));
    const inv = liste("inventar", (i) => i.status === "verfuegbar" || (v.inventar_ids || []).includes(i.id)).sort((a, b) => String(a.inventar_nr).localeCompare(String(b.inventar_nr)));
    const aus = liste("ausstattung", (a) => a.status !== "ausgeschieden" && a.status !== "defekt").slice(0, 60);
    const chip = (n, val, t, an) => `<label class="t-chip"><input type="checkbox" name="${n}" data-mehr="1" value="${esc(val)}" ${an ? "checked" : ""}><span>${esc(t)}</span></label>`;
    return kopf(id ? "✏️ Leihvertrag ändern" : "📝 Neuer Leihvertrag") + `<form id="lvForm" class="karte" autocomplete="off">
      <div class="feld"><label for="lvPerson">Entleiher/in (Mitglied)</label><select id="lvPerson" name="person_id" data-c="lvPersonGewaehlt"><option value="">– bitte wählen –</option>${personen.map((p) => `<option value="${esc(p.id)}" ${p.id === v.person_id ? "selected" : ""}>${esc(name(p))}</option>`).join("")}</select></div>
      <div id="lvPersonDaten">${personDaten(v)}</div>
      <fieldset class="lv-feldset"><legend>🎻 Instrumente (eins oder mehrere)</legend><div class="t-wahl lv-auswahl">${inv.map((i) => chip("inventar_ids", i.id, `${i.inventar_nr} · ${typName(i.typ_id)}${i.groesse ? " " + i.groesse : ""}`, (v.inventar_ids || []).includes(i.id))).join("") || "<p>Kein Instrument frei.</p>"}</div></fieldset>
      ${aus.length ? `<fieldset class="lv-feldset"><legend>📦 Weitere Ausstattung</legend><div class="t-wahl lv-auswahl">${aus.map((a) => chip("ausstattung_ids", a.id, a.bezeichnung || a.name || a.id, (v.ausstattung_ids || []).includes(a.id))).join("")}</div></fieldset>` : ""}
      <fieldset class="lv-feldset"><legend>🧰 Zubehör</legend><div class="t-wahl">${Object.entries(LEIH_ZUBEHOER).map(([z, t]) => chip("zubehoer", z, t, (v.zubehoer || []).includes(z))).join("")}</div>
        <div class="feld"><label for="lvZubFrei">Weiteres Zubehör</label><input id="lvZubFrei" name="zubehoer_frei" value="${esc(v.zubehoer_frei || "")}" placeholder="z. B. Notenständer, Stimmgerät"></div></fieldset>
      <div class="gs-zwei"><div class="feld"><label for="lvVon">Leihe ab</label><input id="lvVon" type="date" name="von" value="${esc(v.von || "")}" required></div><div class="feld"><label for="lvBis">Rückgabe bis</label><input id="lvBis" type="date" name="bis" value="${esc(v.bis || "")}"></div></div>
      <div class="gs-zwei"><div class="feld"><label for="lvKaution">Kaution (€)</label><input id="lvKaution" type="number" min="0" step="1" name="kaution" value="${esc(v.kaution ?? "")}"></div><div class="feld"><label for="lvGeb">Leihgebühr je Jahr (€)</label><input id="lvGeb" type="number" min="0" step="1" name="gebuehr" value="${esc(v.gebuehr ?? "")}"></div></div>
      <div class="feld"><label for="lvVers">Versicherung</label><select id="lvVers" name="versicherung">${Object.entries({ verein: "über den Förderverein", privat: "privat (Hausrat)", keine: "keine" }).map(([k, t]) => `<option value="${k}" ${v.versicherung === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="feld"><label for="lvHinweis">Zustand / Besonderheiten bei Ausgabe</label><textarea id="lvHinweis" name="hinweis" rows="2">${esc(v.hinweis || "")}</textarea></div>
      <details class="lv-klausel-wahl"><summary>📜 Leihbedingungen & Schadensklausel (für diesen Vertrag anpassen)</summary><textarea name="klausel" rows="10" aria-label="Leihbedingungen">${esc(v.klausel || konfig().leih_klausel || LV_KLAUSEL)}</textarea></details>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="lvSpeichern" data-x="entwurf">💾 Als Entwurf speichern</button><button type="button" class="knopf haupt" data-a="lvSpeichern" data-x="wartet">✍️ Speichern & unterschreiben lassen</button></div></form>
      <p class="hinweis">Anschrift und Geburtsdatum kommen aus der Kartei und werden mit dem Vertrag festgehalten. Was unterschrieben ist, lässt sich nicht mehr ändern.</p>`;
  },
};
function personDaten(v) {
  const p = v.person_id && hole("personen", v.person_id); if (!p) return "";
  const minder = minderjaehrig(p.id), eltern = elternVon(db, p.id).map((id) => hole("personen", id)).filter(Boolean), e = hole("personen", v.eltern_id) || eltern[0];
  return `<div class="lv-person"><div>🏠 ${esc(v.anschrift ?? anschriftVon(p)) || "<i>keine Anschrift in der Kartei</i>"}</div><div>🎂 ${esc(dat(v.geburtsdatum ?? p.geburtsdatum)) || "<i>kein Geburtsdatum</i>"}</div>
    ${minder ? `<div class="feld"><label for="lvEltern">Erziehungsberechtigte/r (unterschreibt mit)</label><select id="lvEltern" name="eltern_id">${eltern.map((x) => `<option value="${esc(x.id)}" ${x.id === e?.id ? "selected" : ""}>${esc(name(x))}</option>`).join("") || '<option value="">– keine Eltern hinterlegt –</option>'}</select></div>` : '<div class="hinweis">Volljährig – unterschreibt selbst.</div>'}</div>`;
}
AKTIONEN.lvPersonGewaehlt = (_, el) => { F.v = { ...(F.v || {}), id: F.v?.id || "neu", person_id: el.value, anschrift: undefined, geburtsdatum: undefined, eltern_id: undefined }; const d = document.getElementById("lvPersonDaten"); if (d) d.innerHTML = personDaten(F.v); };
AKTIONEN.lvNeu = () => { F.v = null; zeige("leihvertragForm"); };
AKTIONEN.lvBearbeiten = (id) => zeige("leihvertragForm", { id });
AKTIONEN.lvSpeichern = async (ziel) => {
  const f = formWerte(document.getElementById("lvForm")), p = hole("personen", f.person_id);
  if (!p) return toast("Bitte die/den Entleiher/in wählen");
  const inventar_ids = [].concat(f.inventar_ids || []), ausstattung_ids = [].concat(f.ausstattung_ids || []);
  if (!inventar_ids.length && !ausstattung_ids.length) return toast("Bitte mindestens ein Instrument oder Ausstattung wählen");
  if (!f.von) return toast("Bitte „Leihe ab“ eintragen");
  const e = hole("personen", f.eltern_id), alt = F.v?.id && F.v.id !== "neu" ? hole("leihvertraege", F.v.id) : null;
  const jahr = new Date(f.von).getFullYear(), nr = alt?.nr || `LV-${jahr}-${String(liste("leihvertraege", (x) => String(x.nr || "").startsWith(`LV-${jahr}-`)).length + 1).padStart(3, "0")}`;
  const v = await speichere("leihvertraege", { ...(alt || { id: neueId(), unterschriften: {} }), nr, person_id: p.id, eltern_id: minderjaehrig(p.id) ? e?.id || null : null,
    anschrift: anschriftVon(p), geburtsdatum: p.geburtsdatum || null, eltern_name: minderjaehrig(p.id) && e ? name(e) : null, eltern_anschrift: minderjaehrig(p.id) && e ? anschriftVon(e) || anschriftVon(p) : null,
    telefon: (minderjaehrig(p.id) ? e?.mobil : p.mobil) || p.mobil || null, inventar_ids, ausstattung_ids, zubehoer: [].concat(f.zubehoer || []), zubehoer_frei: f.zubehoer_frei || "",
    von: f.von, bis: f.bis || null, kaution: f.kaution === "" ? null : Number(f.kaution), gebuehr: f.gebuehr === "" ? null : Number(f.gebuehr), versicherung: f.versicherung, hinweis: f.hinweis || "", klausel: f.klausel || LV_KLAUSEL,
    status: ziel === "wartet" ? "wartet" : "entwurf" });
  F.v = null;
  if (ziel === "wartet") await benachrichtigen(v);
  toast(ziel === "wartet" ? "✍️ Gespeichert – jetzt unterschreiben" : "💾 Entwurf gespeichert");
  zeige("leihvertrag", { id: v.id }, { ersetzen: true });
};
async function benachrichtigen(v) {
  const an = [...(minderjaehrig(v.person_id) ? elternVon(db, v.person_id) : []), v.person_id].filter((x) => x && x !== ich());
  if (an.length) await senden({ an, betreff: "📝 Leihvertrag bitte unterschreiben", text: `Der Leihvertrag ${v.nr || ""} für ${name(v.person_id)} liegt in der Bachkreis-App bereit – bitte unter „📝 Leihverträge“ unterschreiben.`, ereignis: "genehmigung" }).catch(() => {});
}
AKTIONEN.lvSenden = async (id) => { const v = hole("leihvertraege", id); if (!v) return; if (v.status === "entwurf") await speichere("leihvertraege", { ...v, status: "wartet" }); await benachrichtigen(v); toast("📨 Zur Unterschrift geschickt"); zeichne(); };
AKTIONEN.lvAusgeben = async (id) => {
  const v = hole("leihvertraege", id); if (!v) return;
  for (const iid of v.inventar_ids || []) {
    await speichere("ausleihen", { inventar_id: iid, person_id: v.person_id, von: v.von, bis: v.bis, status: "aktiv", zustand_ausgabe: v.hinweis || "", zubehoer: v.zubehoer || [], kaution: v.kaution || null, kaution_status: v.kaution ? "offen" : null, gebuehr: v.gebuehr || null, versicherung: v.versicherung || null, leihvertrag_id: v.id });
    const i = hole("inventar", iid); if (i) await speichere("inventar", { ...i, status: "verliehen" });
  }
  for (const aid of v.ausstattung_ids || []) await speichere("ausleihen", { ausstattung_id: aid, person_id: v.person_id, von: v.von, bis: v.bis, status: "aktiv", leihvertrag_id: v.id });
  toast("🤝 Ausgegeben"); zeichne();
};
AKTIONEN.lvRueckgabe = async (id) => {
  const v = hole("leihvertraege", id); if (!v) return;
  const zustand = prompt("Zustand bei Rückgabe:", "gut"); if (zustand == null) return;
  for (const a of liste("ausleihen", (x) => x.leihvertrag_id === v.id && x.status === "aktiv")) {
    await speichere("ausleihen", { ...a, status: "zurueck", zustand_rueckgabe: zustand, bis: tagIso(new Date()) });
    const i = a.inventar_id && hole("inventar", a.inventar_id); if (i) await speichere("inventar", { ...i, status: "verfuegbar" });
  }
  await speichere("leihvertraege", { ...v, status: "beendet" }); toast("↩️ Zurückgegeben"); zeichne();
};
// ---------- 🖨️ Drucken ----------
async function drucken(html, titel) { (await import("./druckvorschau.js")).druckVorschau({ titel, html }); } // 🖨️ 0.53.0 Vorschau/PDF/Chat/Eingangskorb
AKTIONEN.lvDrucken = () => { const a = document.querySelector("#inhalt .lv-dokument"); if (!a) return; const k = a.cloneNode(true); k.querySelectorAll("button").forEach((b) => b.remove()); drucken(k.outerHTML, `Leihvertrag ${hole("leihvertraege", S.params?.id)?.nr || ""}`.trim()); };
AKTIONEN.lvLeerDrucken = () => drucken(vertragHtml(null), "Leihvertrag (Formular)");
// ---------- ⚙️ Standard-Leihbedingungen (Leitung) ----------
AKTIONEN.lvKlausel = () => blatt("⚙️ Leihbedingungen & Schadensklausel", `<p class="hinweis">Gilt für neue Leihverträge. Bitte vom Vorstand prüfen lassen – das ist ein Muster, keine Rechtsberatung.</p>
  <textarea id="lvKlauselText" rows="14" aria-label="Leihbedingungen">${esc(konfig().leih_klausel || LV_KLAUSEL)}</textarea>
  <div class="knopfreihe"><button type="button" class="knopf" data-a="lvKlauselStandard">↺ Muster</button><button type="button" class="knopf haupt" data-a="lvKlauselSpeichern">💾 Speichern</button></div>`);
AKTIONEN.lvKlauselStandard = () => { const t = document.getElementById("lvKlauselText"); if (t) t.value = LV_KLAUSEL; };
AKTIONEN.lvKlauselSpeichern = async () => { const { konfigSetzen } = await import("../kern/daten.js"); try { await konfigSetzen("leih_klausel", document.getElementById("lvKlauselText").value.trim()); blattZu(); toast("💾 Gespeichert"); } catch (e) { toast("⚠️ " + e.message); } };
