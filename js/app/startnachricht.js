// 📣 Startnachricht der Leitung (0.30.0, wie KC-CLUB-STARTNACHRICHT, -SPRUNG, -ANTWORT): Die Leitung schreibt eine Nachricht an alle,
// an bestimmte Orchester oder Personen. Sie geht beim nächsten Öffnen der App als Fenster auf – Pflicht: „gelesen“ bestätigen oder
// ✅ Ja (mit Knopf direkt zur Stelle der App) · ⏰ Später (morgen wieder) · ✖ Nein. Dazu ↩️ Rückfrage. Die Leitung sieht, wer wie geantwortet hat.
// Empfänger-Regel (snFuerMich) und Antwort-Prüfung stehen in schema.js bzw. regeln.js – erzwungen wird auf dem Server.
import { S, VIEWS, zeige, zeichne, kopf, name, istLeitung, einst } from "./zustand.js";
import { esc, AKTIONEN, toast, datum, uhr, frage } from "../kern/ui.js";
import { liste, hole, speichere, abonnieren, neueId } from "../kern/daten.js";
import { snFuerMich, snAntwortId, SN_ANTWORTEN, SN_SPAETER_STD } from "../kern/schema.js";
import { kinderVon } from "../kern/logik.js";
import { db } from "./zustand.js";

// Wohin der Knopf führen darf (nur feste Ziele – kein freier Link)
export const SN_ZIELE = {
  termine: ["📅", "Termine"], pinnwand: ["📌", "Pinnwand"], nachrichten: ["💬", "Nachrichten"], einstellungen: ["⚙️", "Einstellungen"],
  kalender: ["📆", "Handy-Kalender"], ueben: ["🎻", "Üben"], uebebuehne: ["🎭", "Übe-Bühne"], meinedaten: ["🔐", "Meine Daten"],
  gesicht: ["🙂", "Mein Gesicht"], dokumente: ["📂", "Dokumente"], meinegenehmigungen: ["✍️", "Genehmigungen"],
};
function sprung(ziel) {
  if (ziel === "uebebuehne") return zeige("buehne", { modus: "ueben" });
  if (ziel === "gesicht") return import("./teile.js").then(async (t) => { await t.aktionNachladen("meinGesicht"); AKTIONEN.meinGesicht?.(); }); // 📦 liegt in orchester.js (nachladbar)
  if (SN_ZIELE[ziel]) zeige(ziel);
}
const gruppenVon = (pid) => { const ids = new Set([pid, ...kinderVon(db, pid)]); return new Set(liste("gruppe_zuordnung", (z) => ids.has(z.person_id)).map((z) => z.gruppe_id)); };
const antwortVon = (nid, pid) => hole("startnachricht_antworten", snAntwortId(nid, pid));
const WEG = new Set(); // in dieser Sitzung schon beantwortet (bis der Abgleich zurück ist)

export function snOffen() {
  if (!S.ich) return [];
  const g = gruppenVon(S.ich.id), jetzt = new Date().toISOString();
  return liste("startnachrichten", (z) => snFuerMich(z, S.ich.id, g) && !WEG.has(z.id))
    .filter((z) => { const a = antwortVon(z.id, S.ich.id); return !a || (a.antwort === "spaeter" && String(a.spaeter_bis || "") <= jetzt); })
    .sort((a, b) => String(a.zeit || "").localeCompare(String(b.zeit || "")));
}
const offenDa = () => document.getElementById("snHg");
// Beim Start und nach jedem Abgleich: die älteste offene Startnachricht zeigen (nicht über Express/SOS)
let abonniert = false; // erst beim Start anmelden – die Datenschicht steht beim Laden des Moduls noch nicht
export function snPruefen() {
  if (!abonniert) { abonniert = true; abonnieren((tabs) => { if ((tabs || []).includes("startnachrichten")) setTimeout(snPruefen, 300); }); }
  const l = snOffen();
  if (!l.length || document.hidden || offenDa() || document.querySelector(".blatt-hg .blatt:not([data-leise])")) return false;
  const x = l[0], von = hole("personen", x.von), vn = von?.vorname || "der Leitung", ziel = SN_ZIELE[x.ziel];
  const hg = document.createElement("div"); hg.className = "blatt-hg"; hg.id = "snHg";
  hg.innerHTML = `<div class="blatt sn-blatt" role="dialog" aria-modal="true" aria-label="Nachricht der Leitung">
    <div class="sn-kopf">📣 Nachricht von <b>${esc(von ? name(von) : "der Leitung")}</b>${x.wichtig ? ' <span class="sn-wichtig">❗ WICHTIG</span>' : ""}</div>
    <p class="hinweis" style="margin:2px 0 10px">${x.zeit ? esc(datum(x.zeit)) + ", " + uhr(x.zeit) + " Uhr" : ""}${l.length > 1 ? ` · noch ${l.length - 1} weitere` : ""}</p>
    <div class="sn-text">${esc(x.text).replace(/\n/g, "<br>")}</div>
    ${x.wahl ? `<div class="sn-antworten"><button type="button" class="knopf haupt" data-a="snAntwort" data-x="${esc(x.id)}|ja">✅ Ja${ziel ? ` – ${ziel[0]} ${esc(ziel[1])} ›` : ""}</button>
      <button type="button" class="knopf" data-a="snAntwort" data-x="${esc(x.id)}|spaeter">⏰ Später – morgen nochmal erinnern</button>
      <button type="button" class="knopf" data-a="snAntwort" data-x="${esc(x.id)}|nein">✖ Nein, danke</button></div>`
    : `<label class="sn-pflicht"><input type="checkbox" id="snGelesen" data-c="snHaken"><span><b>Ich habe die Nachricht gelesen</b><small>Pflicht – ${esc(vn)} sieht deine Bestätigung</small></span></label>
      <button type="button" class="knopf haupt" id="snOk" data-a="snAntwort" data-x="${esc(x.id)}|gelesen" disabled>✅ Gelesen – bestätigen${ziel ? ` · ${ziel[0]} ${esc(ziel[1])} ›` : ""}</button>`}
    <button type="button" class="knopf" data-a="snFrageAuf">↩️ Rückfrage an ${esc(vn)}</button>
    <div id="snFrage" hidden><label for="snFrageText" class="hinweis">Deine Rückfrage</label><textarea id="snFrageText" rows="3" maxlength="1000" placeholder="Deine Rückfrage an ${esc(vn)} …"></textarea>
      <button type="button" class="knopf haupt" data-a="snAntwort" data-x="${esc(x.id)}|gelesen|frage">↩️ Rückfrage senden (gilt auch als gelesen)</button></div></div>`;
  document.body.appendChild(hg); // Pflicht: kein Wegtippen, kein ✕ – nur eine Antwort schließt
  if (x.wichtig) try { navigator.vibrate?.([120, 60, 120]); } catch {}
  hg.querySelector("button, input")?.focus();
  return true;
}
AKTIONEN.snHaken = (_, el) => { const ok = document.getElementById("snOk"); if (ok) ok.disabled = !el.checked; };
AKTIONEN.snFrageAuf = (_, el) => { document.getElementById("snFrage").hidden = false; el.hidden = true; document.getElementById("snFrageText")?.focus(); };
AKTIONEN.snAntwort = async (x) => {
  const [id, antwort, mitFrage] = String(x).split("|"), n = hole("startnachrichten", id); if (!n || !S.ich) return;
  const rueckfrage = mitFrage ? String(document.getElementById("snFrageText")?.value || "").trim() : "";
  if (mitFrage && !rueckfrage) return toast("Bitte die Rückfrage eintippen.");
  document.querySelectorAll("#snHg button").forEach((b) => (b.disabled = true));
  try {
    const alt = antwortVon(id, S.ich.id);
    await speichere("startnachricht_antworten", { ...(alt || {}), id: snAntwortId(id, S.ich.id), nachricht_id: id, person_id: S.ich.id, antwort, rueckfrage: rueckfrage || null,
      am: new Date().toISOString(), spaeter_bis: antwort === "spaeter" ? new Date(Date.now() + SN_SPAETER_STD * 3600000).toISOString() : null });
  } catch (e) { document.querySelectorAll("#snHg button").forEach((b) => (b.disabled = false)); return toast("⚠️ " + e.message); }
  WEG.add(id); offenDa()?.remove();
  toast(antwort === "spaeter" ? "⏰ Alles klar – ich erinnere dich morgen wieder." : rueckfrage ? "↩️ Rückfrage gesendet – danke!" : antwort === "nein" ? "✖ Danke für die Rückmeldung" : "✅ Danke – bestätigt");
  if ((antwort === "ja" || antwort === "gelesen") && n.ziel && !rueckfrage) setTimeout(() => sprung(n.ziel), 300);
  setTimeout(snPruefen, 700);
};

// ---------- Leitung: schreiben und Antworten sehen ----------
const SN = { form: { an: "alle", gruppen: [], personen: [], wichtig: false, wahl: false, ziel: "", bis: "" } };
const empfaenger = (z) => liste("personen", (p) => p.status === "aktiv" && snFuerMich(z, p.id, gruppenVon(p.id)));
VIEWS.startnachricht = {
  render() {
    if (!istLeitung()) return kopf("📣 Startnachricht") + '<p class="hinweis">Nur für die Leitung.</p>';
    const f = SN.form, gruppen = liste("gruppen").sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const chip = (a, k, t, an) => `<button type="button" class="chip-wahl${an ? " an" : ""}" data-a="${a}" data-x="${esc(k)}" aria-pressed="${an}">${t}</button>`;
    const gesendet = liste("startnachrichten", (z) => !z.geloescht_am).sort((a, b) => String(b.zeit || "").localeCompare(String(a.zeit || "")));
    return kopf("📣 Startnachricht") + `<div class="karte"><p class="hinweis">Geht beim nächsten Öffnen der App als Fenster auf – die Empfänger müssen „gelesen“ bestätigen oder mit Ja / Später / Nein antworten.</p>
      <label for="snText"><b>Nachricht</b></label><textarea id="snText" rows="4" maxlength="1000" placeholder="z. B. Bitte sucht euch ein Gesicht fürs Orchester aus 🙂"></textarea>
      <h4>An wen?</h4><div class="wahlen">${chip("snAn", "alle", "👥 Alle", f.an === "alle")}${chip("snAn", "gruppen", "🎻 Orchester", f.an === "gruppen")}${chip("snAn", "personen", "🙋 Personen", f.an === "personen")}</div>
      ${f.an === "gruppen" ? `<div class="wahlen">${gruppen.map((g) => chip("snGruppe", g.id, esc(g.name), f.gruppen.includes(g.id))).join("")}</div>` : ""}
      ${f.an === "personen" ? `<label for="snPerson" class="hinweis">Person hinzufügen</label><select id="snPerson" data-c="snPerson"><option value="">– wählen –</option>${liste("personen", (p) => p.status === "aktiv" && p.id !== S.ich.id && !f.personen.includes(p.id)).sort((a, b) => name(a).localeCompare(name(b))).map((p) => `<option value="${esc(p.id)}">${esc(name(p))}</option>`).join("")}</select>
        <div class="wahlen">${f.personen.map((id) => chip("snPersonWeg", id, "✕ " + esc(name(id)), true)).join("")}</div>` : ""}
      <h4>Antwort</h4><div class="wahlen">${chip("snWahl", "", "✓ Nur „gelesen“ bestätigen", !f.wahl)}${chip("snWahl", "1", "✅ Ja · ⏰ Später · ✖ Nein", f.wahl)}</div>
      <label class="schalter"><span><b>❗ Wichtig</b><div class="hinweis">Rot markiert, Handy vibriert</div></span><input type="checkbox" data-c="snWichtig" ${f.wichtig ? "checked" : ""}></label>
      <label for="snZiel"><b>Knopf zu einer Stelle der App</b> <span class="hinweis">(optional)</span></label><select id="snZiel" data-c="snZiel"><option value="">– kein Knopf –</option>${Object.entries(SN_ZIELE).map(([k, [s, t]]) => `<option value="${k}" ${f.ziel === k ? "selected" : ""}>${s} ${esc(t)}</option>`).join("")}</select>
      <label for="snBis"><b>Zeigen bis</b> <span class="hinweis">(optional, danach nicht mehr)</span></label><input type="date" id="snBis" data-c="snBis" value="${esc(f.bis)}">
      <button type="button" class="knopf haupt breit" data-a="snSenden" style="margin-top:12px">📣 Senden</button></div>
      <h3>Gesendet</h3>${gesendet.length ? gesendet.map(gesendetHtml).join("") : '<p class="hinweis">Noch keine Startnachricht.</p>'}`;
  },
};
function gesendetHtml(z) {
  const emp = empfaenger(z), a = emp.map((p) => [p, antwortVon(z.id, p.id)]), zahl = (k) => a.filter(([, x]) => x?.antwort === k).length, offen = a.filter(([, x]) => !x).length;
  return `<details class="karte" data-klappe="sn_${esc(z.id)}" data-ohne-unten><summary><b>${esc(String(z.text).slice(0, 70))}${String(z.text).length > 70 ? "…" : ""}</b><br><small>${esc(datum(z.zeit))} · von ${esc(name(z.von))} · ${emp.length} Empfänger · ${z.wahl ? `✅ ${zahl("ja")} · ⏰ ${zahl("spaeter")} · ✖ ${zahl("nein")}` : `✓ ${zahl("gelesen")}`} · offen ${offen}</small></summary>
    ${a.map(([p, x]) => `<div class="sn-quittung"><span>${esc(name(p))}</span><span>${x ? `${SN_ANTWORTEN[x.antwort] || ""} ${esc(datum(x.am))}${x.rueckfrage ? `<br>↩️ <i>${esc(x.rueckfrage)}</i>` : ""}` : "– noch nicht"}</span></div>`).join("")}
    ${z.von === S.ich?.id || istLeitung() ? `<button type="button" class="knopf klein" data-a="snLoeschen" data-x="${esc(z.id)}">🗑️ Zurückziehen</button>` : ""}</details>`;
}
const neu = () => { const t = document.getElementById("snText")?.value; zeichne(); const el = document.getElementById("snText"); if (el && t) el.value = t; };
AKTIONEN.snAn = (x) => { SN.form.an = x; neu(); };
AKTIONEN.snGruppe = (id) => { const l = SN.form.gruppen; SN.form.gruppen = l.includes(id) ? l.filter((g) => g !== id) : [...l, id]; neu(); };
AKTIONEN.snPerson = (id) => { if (id && !SN.form.personen.includes(id)) SN.form.personen.push(id); neu(); };
AKTIONEN.snPersonWeg = (id) => { SN.form.personen = SN.form.personen.filter((p) => p !== id); neu(); };
AKTIONEN.snWahl = (x) => { SN.form.wahl = !!x; neu(); };
AKTIONEN.snWichtig = (_, el) => { SN.form.wichtig = el.checked; };
AKTIONEN.snZiel = (v) => { SN.form.ziel = v; };
AKTIONEN.snBis = (v) => { SN.form.bis = v; };
AKTIONEN.snSenden = async () => {
  const f = SN.form, text = String(document.getElementById("snText")?.value || "").trim();
  if (!text) return toast("Bitte eine Nachricht schreiben.");
  if (f.an === "gruppen" && !f.gruppen.length) return toast("Bitte mindestens ein Orchester wählen.");
  if (f.an === "personen" && !f.personen.length) return toast("Bitte mindestens eine Person wählen.");
  const z = { id: neueId(), text, von: S.ich.id, an: f.an, gruppen: f.an === "gruppen" ? f.gruppen : [], personen: f.an === "personen" ? f.personen : [], wichtig: f.wichtig, wahl: f.wahl, ziel: f.ziel || null, bis: f.bis || null, zeit: new Date().toISOString() };
  const n = empfaenger(z).length;
  if (!(await frage(`Startnachricht an ${n} Person${n === 1 ? "" : "en"} senden?`))) return;
  await speichere("startnachrichten", z);
  SN.form = { an: "alle", gruppen: [], personen: [], wichtig: false, wahl: false, ziel: "", bis: "" };
  toast(`📣 Gesendet – erscheint beim nächsten Öffnen bei ${n} Person${n === 1 ? "" : "en"}`); zeichne();
};
AKTIONEN.snLoeschen = async (id) => { if (!(await frage("Startnachricht zurückziehen? Wer sie noch nicht gesehen hat, bekommt sie nicht mehr."))) return; const z = hole("startnachrichten", id); await speichere("startnachrichten", { ...z, geloescht_am: new Date().toISOString() }); toast("🗑️ Zurückgezogen"); zeichne(); };
export const snAn = () => einst().startnachricht !== false;
