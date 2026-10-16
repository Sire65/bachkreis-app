// ✨ Extras (0.22.0): 📝 Übeaufgaben der Lehrkräfte · 🚗 Mitfahrgelegenheiten je Termin · 📜 GEMA-Liste & Mietmaterial · 📧 Werkstatt-Auftrag.
// Rechte setzt der Server (regeln.js: uebeaufgaben, mitfahrten); hier steht die Oberfläche.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, istEltern, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz, herunterladen, frage } from "../kern/ui.js";
import { liste, hole, speichere, loesche } from "../kern/daten.js";
import { kinderVon, tagIso, registerVon, wirksameGruppen, csvAus, eingeladen, termineFuer } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

const lehrt = () => hatRolle("admin", "leitung", "lehrkraft");

// ---------- 📝 Übeaufgaben ----------
// Für wen gilt eine Aufgabe? Eine Person – oder alle eines Registers/einer Gruppe
export function aufgabenFuer(pid) {
  const reg = registerVon(db, pid), gr = wirksameGruppen(db, pid);
  return liste("uebeaufgaben", (a) => (a.person_id ? a.person_id === pid : (!a.register_id || a.register_id === reg) && (!a.gruppe_id || gr.includes(a.gruppe_id)) && !!(a.register_id || a.gruppe_id)))
    .sort((a, b) => String(a.bis || "9").localeCompare(String(b.bis || "9")));
}
export function aufgabenHtml(pid) {
  const l = aufgabenFuer(pid), heute = tagIso(new Date());
  if (!l.length) return "";
  return `<div class="karte ua-karte"><h3>📝 Aufgaben ${pid === S.ich.id ? "für dich" : `für ${esc(vorname(pid))}`}</h3><ul class="liste">${l.map((a) => {
    const ok = (a.erledigt || []).includes(pid), w = a.werk_id ? hole("werke", a.werk_id) : null;
    return `<li class="${ok ? "ua-ok" : ""}"><label class="ua-haken"><input type="checkbox" data-c="aufgabeHaken" data-x="${a.id}|${pid}" aria-label="${esc(a.titel)} erledigt" ${ok ? "checked" : ""}></label><div class="fl"><div class="zeile-titel">${esc(a.titel)}</div>
      <div class="zeile-unter">${w ? `🎼 ${esc(w.titel)} · ` : ""}${a.text ? esc(a.text) + " · " : ""}von ${esc(name(a.von_id))}${a.bis ? ` · <span class="${!ok && a.bis < heute ? "ua-spaet" : ""}">bis ${datumKurz(a.bis)}</span>` : ""}</div></div>
      <button type="button" class="knopf klein" data-a="ubAufgabeOeffnen" data-x="${a.id}|${pid}" title="Auf der Übe-Bühne üben">🎭 Üben</button></li>`;
  }).join("")}</ul></div>`;
}
AKTIONEN.aufgabeHaken = async (_, el) => {
  const [id, pid] = el.dataset.x.split("|"), a = hole("uebeaufgaben", id), l = new Set(a.erledigt || []);
  el.checked ? l.add(pid) : l.delete(pid);
  await speichere("uebeaufgaben", { ...a, erledigt: [...l] });
  if (el.checked) toast("✅ Super – erledigt!"); zeichne();
};
// Lehrkräfte: Aufgaben verwalten (in der Übe-Übersicht)
export function aufgabenVerwaltenHtml() {
  if (!lehrt()) return "";
  const l = liste("uebeaufgaben").sort((a, b) => String(b.bis || "").localeCompare(String(a.bis || "")));
  const ziel = (a) => (a.person_id ? name(a.person_id) : [a.register_id && hole("register", a.register_id)?.name, a.gruppe_id && hole("gruppen", a.gruppe_id)?.name].filter(Boolean).join(" · "));
  return `<div class="karte"><h3>📝 Übeaufgaben <button class="knopf klein haupt" data-a="aufgabeNeu">＋ Aufgabe</button></h3><ul class="liste">${l.map((a) => `<li><div class="fl"><div class="zeile-titel">${esc(a.titel)}</div><div class="zeile-unter">für ${esc(ziel(a) || "–")}${a.bis ? ` · bis ${datumKurz(a.bis)}` : ""} · ✅ ${(a.erledigt || []).length} erledigt</div></div><button class="knopf klein" data-a="aufgabeWeg" data-x="${a.id}" aria-label="Aufgabe löschen">🗑️</button></li>`).join("") || '<li class="hinweis">Noch keine Aufgaben.</li>'}</ul></div>`;
}
// ＋ Aufgabe geben: Formular mit Übe-Bühne-Arten (Rhythmus-Baukasten …) in uebebuehne.js (AKTIONEN.aufgabeNeu)
AKTIONEN.aufgabeWeg = async (id) => { if (await frage("Aufgabe löschen?")) { await loesche("uebeaufgaben", id); zeichne(); } };

// ---------- 🚗 Mitfahrbörse: anbieten · suchen · buchen ----------
const RICHTUNG = { hin: "hin", zurueck: "zurück", beides: "hin & zurück" };
const angebote = (tid) => liste("mitfahrten", (m) => m.termin_id === tid && m.art !== "gesuch");
const gesuche = (tid) => liste("mitfahrten", (m) => m.termin_id === tid && m.art === "gesuch");
const frei = (m) => Math.max(0, (m.plaetze || 0) - (m.mitfahrer || []).length);
const erwachsen = () => S.ich && S.ich.typ !== "schueler";
// Welche meiner Kinder sind zu diesem Termin eingeladen und haben noch keine Fahrt?
function kinderOhneFahrt(t) {
  const kids = istEltern() ? kinderVon(db, S.ich.id) : [];
  const gebucht = new Set([...angebote(t.id).flatMap((m) => m.mitfahrer || []), ...gesuche(t.id).flatMap((g) => g.mitfahrer || [])]);
  return kids.filter((k) => !gebucht.has(k) && eingeladenSicher(t, k));
}
const eingeladenSicher = (t, k) => { try { return eingeladen(db, t, k); } catch { return true; } };
export function mitfahrtZahlen(t) { return { frei: angebote(t.id).reduce((s, m) => s + frei(m), 0), suchen: gesuche(t.id).filter((g) => !g.zusage_von).reduce((s, g) => s + (g.mitfahrer || []).length, 0) }; }
export function mitfahrtHtml(t) {
  if (new Date(t.beginn) < new Date() || t.status === "abgesagt") return "";
  const A = angebote(t.id), G = gesuche(t.id), kids = istEltern() ? kinderVon(db, S.ich.id) : [];
  const ohne = kinderOhneFahrt(t);
  const angebotHtml = (m) => {
    const f = frei(m), meins = m.fahrer_id === S.ich?.id;
    return `<div class="mf-angebot"><div>🚗 <b>${esc(meins ? "Du" : name(m.fahrer_id))}</b> · ${RICHTUNG[m.richtung] || ""} · ${esc(m.abfahrt || "")} <span class="badge ${f ? "b-gruen" : "b-grau"}">${f} frei</span></div>
      ${m.notiz ? `<div class="hinweis">${esc(m.notiz)}</div>` : ""}<div class="hinweis">Mit dabei: ${(m.mitfahrer || []).map((k) => esc(vorname(k))).join(", ") || "noch niemand"}</div>
      <div class="knopfreihe">${meins ? `<button class="knopf klein" data-a="mfWeg" data-x="${m.id}">Angebot zurückziehen</button>` : kids.map((k) => (m.mitfahrer || []).includes(k) ? `<button class="knopf klein" data-a="mfBuchen" data-x="${m.id}|${k}|aus">➖ ${esc(vorname(k))} austragen</button>` : f && ohne.includes(k) ? `<button class="knopf klein haupt" data-a="mfBuchen" data-x="${m.id}|${k}|ein">➕ ${esc(vorname(k))} mitfahren lassen</button>` : "").join("")}</div></div>`;
  };
  const gesuchHtml = (g) => {
    const meins = g.fahrer_id === S.ich?.id, zu = g.zusage_von;
    return `<div class="mf-angebot mf-gesuch${zu ? " ok" : ""}"><div>🙋 <b>${esc(meins ? "Ihr" : name(g.fahrer_id))}</b> ${meins ? "sucht" : "sucht"} für ${(g.mitfahrer || []).map((k) => esc(vorname(k))).join(" & ")} · ${RICHTUNG[g.richtung] || ""}${g.abfahrt ? ` · ab ${esc(g.abfahrt)}` : ""}
      ${zu ? `<span class="badge b-gruen">✅ fährt mit ${esc(zu === S.ich?.id ? "dir" : name(zu))}</span>` : '<span class="badge b-gelb">noch offen</span>'}</div>${g.notiz ? `<div class="hinweis">${esc(g.notiz)}</div>` : ""}
      <div class="knopfreihe">${meins ? `<button class="knopf klein" data-a="mfWeg" data-x="${g.id}">Gesuch zurückziehen</button>` : erwachsen() ? (!zu ? `<button class="knopf klein haupt" data-a="mfZusage" data-x="${g.id}|ja">✅ Ich nehme mit</button>` : zu === S.ich?.id ? `<button class="knopf klein" data-a="mfZusage" data-x="${g.id}|nein">Zusage zurücknehmen</button>` : "") : ""}</div></div>`;
  };
  const z = mitfahrtZahlen(t);
  return `<div class="karte mf-karte"><h3>🚗 Mitfahrbörse <span class="hinweis">${z.frei} Plätze frei · ${z.suchen} suchen</span></h3>
    ${A.map(angebotHtml).join("")}${G.map(gesuchHtml).join("")}${!A.length && !G.length ? '<p class="hinweis">Noch keine Angebote oder Gesuche.</p>' : ""}
    ${erwachsen() ? `<div class="knopfreihe">${!A.some((m) => m.fahrer_id === S.ich.id) ? `<button class="knopf klein" data-a="mfAnbieten" data-x="${t.id}">🚗 Ich biete Plätze an</button>` : ""}${ohne.length ? `<button class="knopf klein" data-a="mfSuchen" data-x="${t.id}">🙋 Wir suchen eine Mitfahrt</button>` : ""}</div>`
      : `<p class="hinweis">Frag deine Eltern – sie können dich hier eintragen.</p>`}
    <p class="hinweis">Abholung bitte direkt mit den Eltern absprechen. Mitfahren nur mit Einverständnis der Eltern.</p></div>`;
}
const formRichtung = () => `<div class="feld"><label>Richtung</label><select name="richtung">${Object.entries(RICHTUNG).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>`;
AKTIONEN.mfAnbieten = (tid) => blatt("🚗 Plätze anbieten", `<div id="mfForm">${formRichtung()}
  <div class="feld"><label>Freie Plätze</label><input type="number" name="plaetze" min="1" max="8" value="2"></div><div class="feld"><label>Abfahrt (Ort, Uhrzeit)</label><input name="abfahrt" placeholder="z. B. 15:40 Kirche Weddinghofen"></div>
  <div class="feld"><label>Notiz (optional)</label><input name="notiz" placeholder="z. B. Kindersitz vorhanden, Cello passt rein"></div>
  <button class="knopf haupt breit" data-a="mfSpeichern" data-x="${tid}">🚗 Anbieten</button></div>`);
AKTIONEN.mfSpeichern = async (tid) => {
  const f = formWerte(document.getElementById("mfForm"));
  await speichere("mitfahrten", { termin_id: tid, art: "angebot", fahrer_id: S.ich.id, richtung: f.richtung, plaetze: Number(f.plaetze) || 1, abfahrt: f.abfahrt, notiz: f.notiz, mitfahrer: [] });
  // Wer sucht schon? Diese Eltern bekommen Bescheid
  const an = gesuche(tid).filter((g) => !g.zusage_von).map((g) => g.fahrer_id);
  if (an.length) await senden({ an, betreff: "🚗 Neue Mitfahrgelegenheit", text: `${name(S.ich.id)} bietet ${f.plaetze} Plätze zu „${hole("termine", tid)?.titel || ""}“ an (${f.abfahrt || ""}).`, ereignis: "standard" });
  blattZu(); toast("🚗 Danke! Andere Eltern sehen dein Angebot beim Termin."); zeichne();
};
AKTIONEN.mfSuchen = (tid) => {
  const t = hole("termine", tid), ohne = kinderOhneFahrt(t);
  blatt("🙋 Mitfahrt suchen", `<div id="mfForm"><div class="feld"><label>Für</label><div class="t-wahl">${ohne.map((k, i) => `<label class="t-chip"><input type="checkbox" name="kinder" value="${k}" ${i === 0 ? "checked" : ""}><span>${esc(vorname(k))}</span></label>`).join("")}</div></div>
    ${formRichtung()}<div class="feld"><label>Abholen in (Ort, Uhrzeit)</label><input name="abfahrt" placeholder="z. B. Rünthe, Marktplatz"></div><div class="feld"><label>Notiz (optional)</label><input name="notiz" placeholder="z. B. mit Kontrabass"></div>
    <button class="knopf haupt breit" data-a="mfSucheSpeichern" data-x="${tid}">🙋 Gesuch eintragen</button></div>`);
};
AKTIONEN.mfSucheSpeichern = async (tid) => {
  const f = formWerte(document.getElementById("mfForm")), kinder = [].concat(f.kinder || []).filter(Boolean);
  if (!kinder.length) return toast("Bitte ein Kind wählen");
  await speichere("mitfahrten", { termin_id: tid, art: "gesuch", fahrer_id: S.ich.id, richtung: f.richtung, plaetze: kinder.length, abfahrt: f.abfahrt, notiz: f.notiz, mitfahrer: kinder, zusage_von: null });
  // Fahrer mit freien Plätzen bekommen Bescheid
  const an = angebote(tid).filter((m) => frei(m) >= kinder.length).map((m) => m.fahrer_id);
  if (an.length) await senden({ an, betreff: "🙋 Mitfahrt gesucht", text: `${kinder.map((k) => vorname(k)).join(" & ")} sucht eine Mitfahrt zu „${hole("termine", tid)?.titel || ""}“ (${f.abfahrt || ""}).`, ereignis: "standard" });
  blattZu(); toast("🙋 Eingetragen – wer fährt, sieht dein Gesuch."); zeichne();
};
AKTIONEN.mfZusage = async (x) => {
  const [id, art] = x.split("|"), g = hole("mitfahrten", id);
  await speichere("mitfahrten", { ...g, zusage_von: art === "ja" ? S.ich.id : null });
  await senden({ an: [g.fahrer_id], betreff: art === "ja" ? "🚗 Mitfahrt gefunden" : "🚗 Mitfahrt entfällt", text: art === "ja" ? `${name(S.ich.id)} nimmt ${(g.mitfahrer || []).map((k) => vorname(k)).join(" & ")} mit (${hole("termine", g.termin_id)?.titel || ""}). Bitte die Abholung absprechen.` : `${name(S.ich.id)} kann doch nicht mitnehmen – das Gesuch ist wieder offen.`, ereignis: "standard" });
  toast(art === "ja" ? "✅ Danke! Die Eltern bekommen Bescheid." : "Zusage zurückgenommen"); zeichne();
};
AKTIONEN.mfBuchen = async (x) => {
  const [id, k, art] = x.split("|"), m = hole("mitfahrten", id), l = new Set(m.mitfahrer || []);
  art === "ein" ? l.add(k) : l.delete(k);
  if (l.size > (m.plaetze || 0)) return toast("Leider schon voll");
  await speichere("mitfahrten", { ...m, mitfahrer: [...l] });
  // Ein offenes eigenes Gesuch für das Kind hat sich damit erledigt
  if (art === "ein") for (const g of gesuche(m.termin_id).filter((g) => g.fahrer_id === S.ich.id && (g.mitfahrer || []).includes(k))) await loesche("mitfahrten", g.id);
  await senden({ an: [m.fahrer_id], betreff: art === "ein" ? "🚗 Mitfahrt gebucht" : "🚗 Mitfahrt abgesagt", text: `${vorname(k)} ${art === "ein" ? "fährt bei dir mit" : "fährt doch nicht mit"} (${hole("termine", m.termin_id)?.titel || ""}).`, ereignis: "standard" });
  zeichne();
};
AKTIONEN.mfWeg = async (id) => {
  const m = hole("mitfahrten", id);
  if (!(await frage(m.art === "gesuch" ? "Gesuch zurückziehen?" : "Angebot zurückziehen? Gebuchte Familien werden benachrichtigt."))) return;
  await loesche("mitfahrten", id);
  const an = m.art === "gesuch" ? (m.zusage_von ? [m.zusage_von] : []) : (m.mitfahrer || []).flatMap((k) => liste("eltern_kind", (e) => e.kind_id === k).map((e) => e.eltern_id));
  if (an.length) await senden({ an, betreff: "🚗 Mitfahrt entfällt", text: m.art === "gesuch" ? `Die Mitfahrt für ${(m.mitfahrer || []).map((k) => vorname(k)).join(" & ")} wird nicht mehr gebraucht.` : `Die Mitfahrgelegenheit bei ${name(m.fahrer_id)} entfällt – bitte anders planen.`, ereignis: "standard" });
  zeichne();
};
// Übersicht: alle kommenden Termine mit Angeboten und Gesuchen (für Familien und Leitung)
VIEWS.mitfahrboerse = {
  render(p) {
    const nur = p.nur || "", bis = new Date(Date.now() + 42 * 86400000);
    const ich = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
    const termine = [...new Map(ich.flatMap((k) => termineFuer(db, k)).map((t) => [t.id, t])).values()]
      .filter((t) => new Date(t.beginn) > new Date() && new Date(t.beginn) < bis && t.status !== "abgesagt").sort((a, b) => a.beginn.localeCompare(b.beginn));
    const l = termine.map((t) => ({ t, z: mitfahrtZahlen(t), ohne: kinderOhneFahrt(t).length })).filter(({ z }) => !nur || (nur === "frei" ? z.frei : z.suchen));
    return kopf("🚗 Mitfahrbörse") + `<div class="inst-chips">${[["", "Alle Termine"], ["frei", "🚗 mit freien Plätzen"], ["suchen", "🙋 jemand sucht"]].map(([k, t]) => `<button type="button" class="${nur === k ? "an" : ""}" data-a="mfFilter" data-x="${k}">${t}</button>`).join("")}</div>
      <div class="karte"><ul class="liste">${l.map(({ t, z, ohne }) => `<li class="klick" data-a="oeffne" data-x="termin|${t.id}"><div class="fl"><div class="zeile-titel">${esc(t.titel)}</div><div class="zeile-unter">${new Date(t.beginn).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${new Date(t.beginn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · ${esc(t.ort || "")}</div></div>
        <span class="mf-zahlen">${z.frei ? `<span class="badge b-gruen">🚗 ${z.frei}</span>` : ""}${z.suchen ? `<span class="badge b-gelb">🙋 ${z.suchen}</span>` : ""}${!z.frei && !z.suchen ? '<span class="badge">–</span>' : ""}</span></li>`).join("") || '<li class="hinweis">Keine passenden Termine in den nächsten 6 Wochen.</li>'}</ul></div>
      <p class="hinweis">🚗 = freie Plätze · 🙋 = Kinder, die noch eine Mitfahrt suchen. Antippen öffnet den Termin – dort anbieten, suchen oder buchen.</p>`;
  },
};
AKTIONEN.mfFilter = (k) => zeige("mitfahrboerse", { nur: k }, { ersetzen: true });

// ---------- 📜 GEMA-Liste & Mietmaterial ----------
export function gemaCsv(pid) {
  const p = hole("projekte", pid), l = liste("programm", (x) => x.projekt_id === pid && x.werk_id).sort((a, b) => a.nr - b.nr);
  const z = l.map((x, i) => { const w = hole("werke", x.werk_id); return { nr: i + 1, komponist: w.komponist, titel: w.titel, bearbeiter: w.bearbeiter || "", verlag: w.verlag || "", dauer_min: x.dauer_min || w.dauer_min || "", gema: w.gema ? "ja" : "nein", es_spielt: hole("gruppen", x.gruppe_id)?.name || "" }; });
  if (!z.length) return toast("Noch kein Programm mit Werken");
  herunterladen(`gema-${(p?.titel || "konzert").replace(/[^\wäöüÄÖÜß-]+/g, "-")}.csv`, "﻿" + csvAus(z, Object.keys(z[0])), "text/csv");
  toast(`📜 GEMA-Liste: ${z.filter((x) => x.gema === "ja").length} von ${z.length} Werken GEMA-pflichtig`);
}
AKTIONEN.gemaListe = (pid) => gemaCsv(pid);

// ---------- 📧 Werkstatt-Auftrag über den Communicator ----------
AKTIONEN.werkstattAuftrag = async (rid) => {
  const r = hole("reparaturen", rid), w = hole("personen", r.werkstatt_id), gegen = r.inventar_id ? hole("inventar", r.inventar_id) : hole("ausstattung", r.ausstattung_id);
  if (!w) return toast("Bitte zuerst eine Werkstatt eintragen");
  const s = await senden({ an: [w.id], betreff: `Reparaturauftrag ${gegen?.inventar_nr || ""}`, text: `Guten Tag,\nbitte reparieren: ${gegen?.bezeichnung || ""} (${gegen?.inventar_nr || ""}).\nSchaden: ${r.meldung}\nFreigegeben bis ${r.kosten ? r.kosten + " €" : "Kostenvoranschlag"}.\nViele Grüße\nBachkreis`, ereignis: "instrument", kanaele: ["mail"] });
  toast(`📧 Auftrag an ${w.firma || name(w)} (${s.mail} Mail – im Vorführmodus simuliert)`);
};
