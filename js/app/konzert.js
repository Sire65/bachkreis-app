// 🎭 Konzert & Reise (0.21.0): Programmfolge mit Werken, Pause, Ansagen, Zugabe und Gesamtdauer · Treffpunkt & Kleiderordnung ·
// Transportliste aus dem Inventar (zum Abhaken beim Packen) · Reise-/Freizeit-Anmeldung mit Warteliste und „bezahlt“.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, geld, frage } from "../kern/ui.js";
import { liste, hole, speichere, loesche } from "../kern/daten.js";
import { kinderVon, gruppenMitglieder, tagIso } from "../kern/logik.js";
import { PROGRAMM_ARTEN } from "../kern/schema.js";

const darfProgramm = () => hatRolle("admin", "leitung", "lehrkraft", "notenwart");
const darfKasse = () => hatRolle("admin", "leitung", "lehrkraft", "vorstand");
const SYM = { werk: "🎼", pause: "☕", ansage: "🎤", zugabe: "🔁", sonstiges: "•" };
export const programmVon = (pid) => liste("programm", (x) => x.projekt_id === pid).sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0));
const dauerVon = (x) => Number(x.dauer_min) || (x.werk_id ? Number(hole("werke", x.werk_id)?.dauer_min) || 0 : 0);
const mm = (min) => (min >= 60 ? `${Math.floor(min / 60)} Std. ${min % 60} Min.` : `${min} Min.`);

// ---------- 🎼 Programm ----------
export function programmHtml(p) {
  const l = programmVon(p.id), alt = liste("werke", (w) => (w.projekte || []).includes(p.id));
  const summe = l.reduce((s, x) => s + dauerVon(x), 0), ohneDauer = l.filter((x) => ["werk", "zugabe"].includes(x.art) && !dauerVon(x)).length;
  let uhr = null;
  const beginn = liste("termine", (t) => t.projekt_id === p.id && t.status !== "abgesagt").sort((a, b) => a.beginn.localeCompare(b.beginn)).find((t) => p.art === "konzert" || /konzert/i.test(t.titel));
  if (beginn) uhr = new Date(beginn.beginn);
  const zeile = (x, i) => {
    const w = x.werk_id ? hole("werke", x.werk_id) : null, d = dauerVon(x), ab = uhr ? `${String(uhr.getHours()).padStart(2, "0")}:${String(uhr.getMinutes()).padStart(2, "0")}` : "";
    if (uhr) uhr = new Date(uhr.getTime() + d * 60000);
    return `<li class="pg-${x.art}"><span class="pg-uhr">${ab}</span><span class="pg-sym">${SYM[x.art] || "•"}</span><div class="fl"><div class="zeile-titel">${w ? `${esc(w.komponist)}: ${esc(w.titel)}` : esc(x.titel || PROGRAMM_ARTEN[x.art] || "")}</div>
      <div class="zeile-unter">${x.gruppe_id ? esc(hole("gruppen", x.gruppe_id)?.name || "") : ""}${x.solisten ? ` · Solo: ${esc(x.solisten)}` : ""}${d ? ` · ${d} Min.` : ""}${x.notiz && darfProgramm() ? ` · ${esc(x.notiz)}` : ""}</div></div>
      ${darfProgramm() ? `<span class="pg-knoepfe"><button class="knopf klein" data-a="pgSchieben" data-x="${x.id}|-1" ${i === 0 ? "disabled" : ""} aria-label="nach oben">▲</button><button class="knopf klein" data-a="pgSchieben" data-x="${x.id}|1" ${i === l.length - 1 ? "disabled" : ""} aria-label="nach unten">▼</button><button class="knopf klein" data-a="pgLoeschen" data-x="${x.id}" aria-label="entfernen">✕</button></span>` : ""}</li>`;
  };
  const leer = !l.length && alt.length ? `<ol>${alt.map((w) => `<li><b>${esc(w.komponist)}</b>: ${esc(w.titel)}</li>`).join("")}</ol><p class="hinweis">Reihenfolge noch nicht festgelegt.</p>` : "";
  return `<div class="karte"><h3>🎼 Programm${l.length ? ` <span class="hinweis">· ${mm(summe)}${ohneDauer ? ` (${ohneDauer} ohne Dauer)` : ""}</span>` : ""}</h3>
    ${l.length ? `<ol class="pg-liste">${l.map(zeile).join("")}</ol>` : leer || '<p class="hinweis">Noch kein Programm.</p>'}
    ${darfProgramm() ? `<div class="knopfreihe"><button class="knopf klein" data-a="pgNeu" data-x="${p.id}">＋ Programmpunkt</button>${!l.length && alt.length ? `<button class="knopf klein" data-a="pgUebernehmen" data-x="${p.id}">⤵️ Werke übernehmen</button>` : ""}<button class="knopf klein" data-a="drucken">🖨️ Programmzettel</button></div>` : ""}</div>`;
}
AKTIONEN.pgNeu = (pid) => {
  const werke = liste("werke").sort((a, b) => a.komponist.localeCompare(b.komponist, "de"));
  blatt("Programmpunkt", `<div id="pgForm"><div class="feld"><label>Art</label><select name="art">${Object.entries(PROGRAMM_ARTEN).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>
    <div class="feld"><label>Werk</label><select name="werk_id"><option value="">– (Pause, Ansage …)</option>${werke.map((w) => `<option value="${w.id}">${esc(w.komponist)}: ${esc(w.titel)}</option>`).join("")}</select></div>
    <div class="feld"><label>oder Titel</label><input name="titel" placeholder="z. B. Pause mit Kuchenbuffet"></div>
    <div class="feld"><label>Es spielt</label><select name="gruppe_id"><option value="">–</option>${liste("gruppen").map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></div>
    <div class="gs-zwei"><div class="feld"><label>Solisten</label><input name="solisten"></div><div class="feld"><label>Dauer (Min.)</label><input type="number" min="0" name="dauer_min"></div></div>
    <div class="feld"><label>Notiz (intern)</label><input name="notiz" placeholder="Umbau, Stimmen …"></div>
    <button class="knopf haupt breit" data-a="pgSpeichern" data-x="${pid}">💾 Hinzufügen</button></div>`);
};
AKTIONEN.pgSpeichern = async (pid) => {
  const f = formWerte(document.getElementById("pgForm")), l = programmVon(pid);
  if (f.art !== "pause" && !f.werk_id && !f.titel) return toast("Bitte ein Werk oder einen Titel angeben");
  await speichere("programm", { projekt_id: pid, nr: (l.at(-1)?.nr || 0) + 1, art: f.art, werk_id: f.werk_id || null, titel: f.titel || (f.art === "pause" ? "Pause" : ""), gruppe_id: f.gruppe_id || null, solisten: f.solisten, dauer_min: Number(f.dauer_min) || null, notiz: f.notiz });
  blattZu(); zeichne();
};
AKTIONEN.pgUebernehmen = async (pid) => {
  const werke = liste("werke", (w) => (w.projekte || []).includes(pid));
  for (const [i, w] of werke.entries()) await speichere("programm", { projekt_id: pid, nr: i + 1, art: "werk", werk_id: w.id, gruppe_id: (w.gruppen || [])[0] || null });
  toast(`⤵️ ${werke.length} Werke übernommen – jetzt sortieren und Pause einfügen`); zeichne();
};
AKTIONEN.pgSchieben = async (x) => {
  const [id, d] = x.split("|"), z = hole("programm", id), l = programmVon(z.projekt_id), i = l.findIndex((y) => y.id === id), j = i + Number(d);
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  for (const [k, y] of l.entries()) if (y.nr !== k + 1) await speichere("programm", { ...y, nr: k + 1 });
  zeichne();
};
AKTIONEN.pgLoeschen = async (id) => { if (await frage("Programmpunkt entfernen?")) { await loesche("programm", id); zeichne(); } };

// ---------- 📍 Treffpunkt, Kleiderordnung, Transport ----------
const PACK = "bk_pack_";
const gepackt = (pid) => { try { return new Set(JSON.parse(localStorage.getItem(PACK + pid) || "[]")); } catch { return new Set(); } };
export function infoHtml(p) {
  const tr = [...(p.transport_inventar || []).map((id) => ["inventar", hole("inventar", id)]), ...(p.transport_ausstattung || []).map((id) => ["ausstattung", hole("ausstattung", id)])].filter(([, z]) => z);
  const g = gepackt(p.id);
  const info = [p.treffpunkt && `📍 <b>Treffpunkt:</b> ${esc(p.treffpunkt)}`, p.kleiderordnung && `👔 <b>Kleidung:</b> ${esc(p.kleiderordnung)}`].filter(Boolean);
  return (info.length ? `<div class="karte pg-info">${info.map((x) => `<div>${x}</div>`).join("")}</div>` : "")
    + (tr.length && darfProgramm() ? `<div class="karte"><h3>🚚 Transportliste <span class="hinweis">${g.size}/${tr.length} eingepackt</span></h3><ul class="liste">${tr.map(([t, z]) => `<li><label class="pg-pack"><input type="checkbox" data-c="packHaken" data-x="${p.id}|${z.id}" ${g.has(z.id) ? "checked" : ""}> <b>${esc(z.inventar_nr)}</b> ${esc(t === "inventar" ? hole("instrument_typen", z.typ_id)?.name || "" : z.bezeichnung)}${z.anzahl > 1 ? ` (${z.anzahl}×)` : ""} <span class="hinweis">${esc(z.standort || "")}</span></label></li>`).join("")}</ul>
      <p class="hinweis">Die Liste pflegt die PC-Verwaltung (Projekt › Transport). Abhaken merkt sich dieses Gerät.</p></div>` : "");
}
AKTIONEN.packHaken = (_, el) => { const [pid, id] = el.dataset.x.split("|"), g = gepackt(pid); el.checked ? g.add(id) : g.delete(id); try { localStorage.setItem(PACK + pid, JSON.stringify([...g])); } catch {} zeichne(); };

// ---------- 🧳 Anmeldung (Reise / Freizeit) ----------
const ANM = { angemeldet: ["b-gruen", "✅ angemeldet"], warteliste: ["b-gelb", "⏳ Warteliste"], abgemeldet: ["b-grau", "abgemeldet"] };
export function anmeldungHtml(p) {
  if (!p.anmeldung) return "";
  const heute = tagIso(new Date()), zu = p.anmeldeschluss && heute > p.anmeldeschluss;
  const gruppen = [...new Set(liste("termine", (t) => t.projekt_id === p.id).flatMap((t) => t.gruppen || []))];
  const kandidaten = (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]).filter((k) => !gruppen.length || gruppen.some((g) => gruppenMitglieder(db, g).includes(k)));
  const anm = (k) => liste("reise_anmeldungen", (a) => a.projekt_id === p.id && a.person_id === k)[0];
  const alle = liste("reise_anmeldungen", (a) => a.projekt_id === p.id);
  const belegt = alle.filter((a) => a.status === "angemeldet").length;
  let html = `<div class="karte"><h3>🧳 Anmeldung</h3><div class="hinweis">${p.kosten ? `Kosten ${geld(p.kosten)} je Teilnehmer · ` : ""}${p.plaetze ? `${p.plaetze} Plätze · ` : ""}${p.anmeldeschluss ? `Anmeldeschluss ${datumKurz(p.anmeldeschluss)}` : ""}</div>
    ${kandidaten.map((k) => { const a = anm(k); return `<div class="anm-zeile"><b>${esc(vorname(k))}</b> ${a ? `<span class="badge ${ANM[a.status][0]}">${ANM[a.status][1]}</span>${a.betrag ? ` <span class="badge ${a.bezahlt ? "b-gruen" : "b-gelb"}">${a.bezahlt ? "💶 bezahlt" : `💶 ${geld(a.betrag)} offen`}</span>` : ""}` : ""}
      ${!a || a.status === "abgemeldet" ? (zu ? '<span class="hinweis">Anmeldeschluss vorbei</span>' : `<button class="knopf klein haupt" data-a="anmelden" data-x="${p.id}|${k}">✅ Anmelden</button>`) : `<button class="knopf klein" data-a="abmelden" data-x="${a.id}">Abmelden</button>`}</div>`; }).join("") || (darfKasse() ? "" : '<p class="hinweis">Für dich ist keine Anmeldung vorgesehen.</p>')}</div>`;
  if (darfKasse() && alle.length) html += `<div class="karte"><h3>Teilnehmer (${belegt}${p.plaetze ? "/" + p.plaetze : ""})</h3><ul class="liste">${alle.filter((a) => a.status !== "abgemeldet").sort((a, b) => a.status.localeCompare(b.status) || name(a.person_id).localeCompare(name(b.person_id))).map((a) => `<li><div class="fl">${esc(name(a.person_id))} <span class="badge ${ANM[a.status][0]}">${ANM[a.status][1]}</span></div>${a.betrag ? `<button class="knopf klein ${a.bezahlt ? "" : "haupt"}" data-a="anmBezahlt" data-x="${a.id}">${a.bezahlt ? "💶 bezahlt ✓" : "💶 als bezahlt"}</button>` : ""}</li>`).join("")}</ul>
    <p class="hinweis">Offen: ${geld(alle.filter((a) => a.status === "angemeldet" && !a.bezahlt).reduce((s, a) => s + Number(a.betrag || 0), 0))}</p></div>`;
  return html;
}
AKTIONEN.anmelden = async (x) => {
  const [pid, k] = x.split("|"), p = hole("projekte", pid), alt = liste("reise_anmeldungen", (a) => a.projekt_id === pid && a.person_id === k)[0];
  const belegt = liste("reise_anmeldungen", (a) => a.projekt_id === pid && a.status === "angemeldet").length;
  const status = p.plaetze && belegt >= p.plaetze ? "warteliste" : "angemeldet";
  await speichere("reise_anmeldungen", { ...(alt || {}), projekt_id: pid, person_id: k, status, angemeldet_von: S.ich.id, angemeldet_am: new Date().toISOString(), betrag: alt?.betrag ?? p.kosten ?? null, bezahlt: !!alt?.bezahlt });
  toast(status === "warteliste" ? "⏳ Ausgebucht – auf der Warteliste" : `✅ ${vorname(k)} ist angemeldet${p.kosten ? ` – bitte ${geld(p.kosten)} überweisen` : ""}`); zeichne();
};
AKTIONEN.abmelden = async (id) => { if (!(await frage("Wirklich abmelden?"))) return; await speichere("reise_anmeldungen", { ...hole("reise_anmeldungen", id), status: "abgemeldet" }); zeichne(); };
AKTIONEN.anmBezahlt = async (id) => { const a = hole("reise_anmeldungen", id); await speichere("reise_anmeldungen", { ...a, bezahlt: !a.bezahlt, bezahlt_am: a.bezahlt ? null : tagIso(new Date()) }); zeichne(); };
