// 🎻 Üben (0.14.0): Übe-Tagebuch mit ⏱ Stoppuhr, Wochenübersicht (Balken, Wochenziel, 🔥 Serie), Einträge mit Stück, Inhalt und Gefühl.
// ⏰ Übezeiten (Wochentage, Uhrzeit, Dauer): erinnern über den Handy-Kalender (Apple, Google – mit Erinnerung vorher, zuverlässig auch
// bei geschlossener App) und beim Öffnen der App („Heute ist Übetag“). Einträge sind privat: nur ich, meine Eltern und – wenn geteilt –
// Leitung/Lehrkräfte (Server-Regel). Leitung/Lehrkräfte sehen unter „Übe-Übersicht“ die geteilten Übezeiten der Woche.
import { aufgabenHtml, aufgabenVerwaltenHtml } from "./extras.js";
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname, einst, einstSetzen, istEltern, istSchueler, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, frage, blatt, blattZu, herunterladen } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { kinderVon, ics, uebeRrule } from "../kern/logik.js";

export const INHALT = { tonleitern: "🎵 Tonleitern", etueden: "🏃 Etüden", stueck: "🎼 Stück", vomblatt: "👀 Vom Blatt", rhythmus: "🥁 Rhythmus", technik: "✋ Technik", gehoer: "🎧 Gehör" };
const GEFUEHL = ["😖", "😕", "🙂", "😊", "🤩"];
const WT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MINUTEN = [10, 15, 20, 30, 45, 60];
const UE = { person: null, form: null };
const STOPP_KEY = "bk_ueben_stoppuhr";
const zw = (n) => String(n).padStart(2, "0");
export const tagIsoLokal = (d = new Date()) => `${d.getFullYear()}-${zw(d.getMonth() + 1)}-${zw(d.getDate())}`;
const montag = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() || 7) - 1)); return x; };
const leute = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);
const wer = () => { const l = leute(); return l.includes(UE.person) ? UE.person : l[0]; };
const eintraege = (pid) => liste("uebungen", (u) => u.person_id === pid && !u.geloescht_am).sort((a, b) => b.datum.localeCompare(a.datum) || String(b.erstellt_am || "").localeCompare(String(a.erstellt_am || "")));
const planVon = (pid) => hole("personen", pid)?.uebe_plan || { an: false, tage: [], zeit: "17:00", dauer: 30, ziel: 120, alarm: 10 };

// Woche Mo–So: Minuten je Tag, Summe, Serie (Tage in Folge bis heute/gestern)
export function wochenStand(liste_, heute = new Date()) {
  const mo = montag(heute), tage = WT.map((_, i) => { const d = new Date(mo); d.setDate(mo.getDate() + i); return tagIsoLokal(d); });
  const jeTag = Object.fromEntries(tage.map((t) => [t, 0]));
  for (const u of liste_) if (u.datum in jeTag) jeTag[u.datum] += Number(u.minuten) || 0;
  const geuebt = new Set(liste_.map((u) => u.datum));
  let serie = 0; const d = new Date(heute); d.setHours(12);
  if (!geuebt.has(tagIsoLokal(d))) d.setDate(d.getDate() - 1); // heute noch nicht geübt → Serie bis gestern zählt weiter
  while (geuebt.has(tagIsoLokal(d))) { serie++; d.setDate(d.getDate() - 1); }
  return { tage, jeTag, summe: Object.values(jeTag).reduce((a, b) => a + b, 0), serie };
}
// Stücke, die zur Person passen (Werke der Projekte, für die sie Stimmen hat) – sonst alle
function stueckeFuer(pid) {
  const reg = new Set(liste("person_instrument", (x) => x.person_id === pid).map((x) => x.register_id));
  const ids = new Set(liste("stimmen", (s) => s.person_id === pid || (s.register_id && reg.has(s.register_id))).map((s) => s.werk_id));
  const l = liste("werke", (w) => ids.has(w.id));
  return (l.length ? l : liste("werke")).sort((a, b) => a.titel.localeCompare(b.titel, "de"));
}
// ⏱ Stoppuhr überlebt das Wechseln der Seite und Neuladen (nur auf diesem Gerät)
const stopp = () => { try { return JSON.parse(localStorage.getItem(STOPP_KEY) || "null"); } catch { return null; } };
const stoppSetzen = (v) => { try { v ? localStorage.setItem(STOPP_KEY, JSON.stringify(v)) : localStorage.removeItem(STOPP_KEY); } catch {} };
const stoppMs = (s) => (s ? s.ms + (s.lauf ? Date.now() - s.lauf : 0) : 0);
const uhrText = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${zw(s % 60)}`; };

VIEWS.ueben = {
  render() {
    const pid = wer(); if (!pid) return kopf("🎻 Üben") + '<div class="leer">Keine Person zum Eintragen.</div>';
    UE.person = pid;
    const l = eintraege(pid), w = wochenStand(l), plan = planVon(pid), ziel = plan.ziel || 0, eigen = pid === S.ich.id;
    const f = UE.form ||= { minuten: 20, werk_id: "", inhalt: [], gefuehl: 3, notiz: "", datum: tagIsoLokal(), geteilt: einst().uebenTeilen !== false };
    const s = stopp(), max = Math.max(30, ...Object.values(w.jeTag), plan.dauer || 0);
    const heute = tagIsoLokal(), stuecke = stueckeFuer(pid);
    const wahl = leute().length > 1 ? `<div class="inst-chips">${leute().map((x) => `<button type="button" class="${x === pid ? "an" : ""}" data-a="uebenWer" data-x="${esc(x)}">${esc(vorname(x))}</button>`).join("")}</div>` : "";
    return kopf("🎻 Üben", `<button class="knopf klein" data-a="ubBuehneOeffnen" title="Mitspielen, Griffe, Rhythmus, Stimmgerät">🎭 Übe-Bühne</button>${hatRolle("leitung", "lehrkraft", "admin") ? '<button class="knopf klein" data-a="uebenUebersicht" title="Geteilte Übezeiten der Schüler">📊 Übersicht</button>' : ""}`) + wahl
      + aufgabenHtml(pid) + `<div class="karte ue-woche"><div class="ue-kopf"><b>Diese Woche</b><span>${w.summe} Min.${ziel ? ` von ${ziel}` : ""}</span>${w.serie ? `<span class="ue-serie" title="Tage in Folge geübt">🔥 ${w.serie}</span>` : ""}</div>
        ${ziel ? `<div class="ue-ziel"><i style="width:${Math.min(100, Math.round((w.summe / ziel) * 100))}%"></i></div>` : ""}
        <div class="ue-balken">${w.tage.map((t, i) => `<div class="ue-tag${t === heute ? " heute" : ""}${plan.an && plan.tage.includes(i + 1) ? " plan" : ""}" title="${WT[i]}: ${w.jeTag[t]} Min."><span style="height:${Math.round((w.jeTag[t] / max) * 100)}%"></span><small>${w.jeTag[t] || ""}</small><b>${WT[i]}</b></div>`).join("")}</div>
        ${plan.an ? `<p class="hinweis">⏰ Übezeiten: ${plan.tage.map((t) => WT[t - 1]).join(", ")} um ${esc(plan.zeit)} (${plan.dauer} Min.)</p>` : ""}</div>
      <div class="karte ue-uhr"><div class="ue-zeit" id="ueZeit">${uhrText(stoppMs(s))}</div>
        <div class="knopfreihe">${!s ? '<button class="knopf haupt" data-a="uebenUhr" data-x="start">▶ Üben starten</button>'
          : s.lauf ? '<button class="knopf" data-a="uebenUhr" data-x="pause">⏸ Pause</button><button class="knopf haupt" data-a="uebenUhr" data-x="stopp">⏹ Fertig – eintragen</button>'
          : '<button class="knopf" data-a="uebenUhr" data-x="weiter">▶ Weiter</button><button class="knopf haupt" data-a="uebenUhr" data-x="stopp">⏹ Fertig – eintragen</button><button class="knopf klein" data-a="uebenUhr" data-x="weg">✕</button>'}</div></div>
      <div class="karte ue-form"><h3>✍️ Üben eintragen${eigen ? "" : ` für ${esc(vorname(pid))}`}</h3>
        <label>Wann<input type="date" data-c="uebenFeld" data-x="datum" value="${esc(f.datum)}" max="${heute}"></label>
        <div class="ue-zeile"><span>Minuten</span><div class="inst-chips">${MINUTEN.map((m) => `<button type="button" class="${Number(f.minuten) === m ? "an" : ""}" data-a="uebenMin" data-x="${m}">${m}</button>`).join("")}<input type="number" min="1" max="600" data-c="uebenFeld" data-x="minuten" value="${esc(f.minuten)}" aria-label="Minuten" class="ue-min"></div></div>
        <label>Stück<select data-c="uebenFeld" data-x="werk_id"><option value="">– ohne Stück –</option>${stuecke.map((s) => `<option value="${esc(s.id)}" ${f.werk_id === s.id ? "selected" : ""}>${esc(s.titel)}</option>`).join("")}</select></label>
        <div class="ue-zeile"><span>Was geübt</span><div class="ue-inhalt">${Object.entries(INHALT).map(([k, t]) => `<button type="button" class="${f.inhalt.includes(k) ? "an" : ""}" data-a="uebenInhalt" data-x="${k}">${t}</button>`).join("")}</div></div>
        <div class="ue-zeile"><span>Wie lief's?</span><div class="ue-gefuehl">${GEFUEHL.map((g, i) => `<button type="button" class="${f.gefuehl === i + 1 ? "an" : ""}" data-a="uebenGefuehl" data-x="${i + 1}" aria-label="Gefühl ${i + 1} von 5">${g}</button>`).join("")}</div></div>
        <label>Notiz<input type="text" maxlength="500" data-c="uebenFeld" data-x="notiz" value="${esc(f.notiz)}" placeholder="z. B. Takt 17–24 mit Metronom"></label>
        <label class="schalter"><span><b>Mit Leitung & Lehrkräften teilen</b><div class="hinweis">Sonst sehen es nur du${eigen ? "" : " und das Kind"} und die Eltern.</div></span><input type="checkbox" data-c="uebenTeilen" ${f.geteilt ? "checked" : ""}></label>
        <button class="knopf haupt breit" data-a="uebenSpeichern">✔ Eintragen</button></div>
      ${eigen ? planHtml(plan) : ""}
      <div class="karte"><h3>📖 Tagebuch</h3>${l.length ? `<ul class="liste ue-liste">${l.slice(0, 30).map((u) => `<li><div class="fl"><div class="zeile-titel">${esc(datumText(u.datum))} · ${u.minuten} Min. ${u.gefuehl ? GEFUEHL[u.gefuehl - 1] : ""}</div>
          <div class="zeile-unter">${u.werk_id ? "🎼 " + esc(hole("werke", u.werk_id)?.titel || "") + " · " : ""}${(u.inhalt || []).map((k) => INHALT[k] || "").join(" ")}${u.notiz ? " · " + esc(u.notiz) : ""}${u.geteilt ? " · 👁️ geteilt" : ""}</div></div>
          <button class="knopf klein" data-a="uebenLoeschen" data-x="${esc(u.id)}" aria-label="Eintrag löschen">🗑️</button></li>`).join("")}</ul>` : '<div class="leer">Noch nichts eingetragen – los geht\'s! 🎻</div>'}</div>`;
  },
  nach() { uhrTakt(); },
};
const datumText = (iso) => { const d = new Date(iso + "T12:00:00"), h = tagIsoLokal(); return iso === h ? "Heute" : iso === tagIsoLokal(new Date(Date.now() - 86400000)) ? "Gestern" : `${WT[(d.getDay() || 7) - 1]}, ${zw(d.getDate())}.${zw(d.getMonth() + 1)}.`; };
function planHtml(p) {
  return `<div class="karte ue-plan"><h3>⏰ Übezeiten & Erinnerung</h3>
    <label class="schalter"><span><b>Übezeiten planen</b><div class="hinweis">An diesen Tagen erinnert dich dein Handy-Kalender – und die App beim Öffnen.</div></span><input type="checkbox" data-c="planFeld" data-x="an" ${p.an ? "checked" : ""}></label>
    <div class="ue-wt">${WT.map((t, i) => `<button type="button" class="${p.tage.includes(i + 1) ? "an" : ""}" data-a="planTag" data-x="${i + 1}">${t}</button>`).join("")}</div>
    <div class="ue-planfelder"><label>Uhrzeit<input type="time" data-c="planFeld" data-x="zeit" value="${esc(p.zeit)}"></label>
      <label>Dauer (Min.)<input type="number" min="5" max="240" data-c="planFeld" data-x="dauer" value="${esc(p.dauer)}"></label>
      <label>Wochenziel (Min.)<input type="number" min="0" max="3000" step="10" data-c="planFeld" data-x="ziel" value="${esc(p.ziel)}"></label>
      <label>Erinnerung vorher<select data-c="planFeld" data-x="alarm">${[0, 5, 10, 15, 30, 60].map((m) => `<option value="${m}" ${Number(p.alarm) === m ? "selected" : ""}>${m ? m + " Min." : "keine"}</option>`).join("")}</select></label></div>
    ${p.an && p.tage.length ? `<div class="knopfreihe"><button class="knopf" data-a="planKalender" data-x="apple">🍎 Apple / Outlook</button><button class="knopf" data-a="planKalender" data-x="google">🟢 Google Kalender</button></div>
      <p class="hinweis">Einmal in den Kalender übernehmen – er erinnert dich dann jede Woche von selbst. Mit dem Kalender-Abo (📆 Kalender) kommen Änderungen automatisch.</p>` : ""}</div>`;
}
let uhrTimer = null;
function uhrTakt() {
  clearInterval(uhrTimer);
  if (!stopp()?.lauf) return;
  uhrTimer = setInterval(() => { const e = document.getElementById("ueZeit"); if (!e) return clearInterval(uhrTimer); e.textContent = uhrText(stoppMs(stopp())); }, 1000);
}
AKTIONEN.uebenWer = (pid) => { UE.person = pid; UE.form = null; zeichne(); };
AKTIONEN.uebenUhr = (was) => {
  const s = stopp();
  if (was === "start") stoppSetzen({ ms: 0, lauf: Date.now() });
  else if (was === "pause" && s) stoppSetzen({ ms: stoppMs(s), lauf: 0 });
  else if (was === "weiter" && s) stoppSetzen({ ms: s.ms, lauf: Date.now() });
  else if (was === "weg") stoppSetzen(null);
  else if (was === "stopp" && s) {
    const min = Math.max(1, Math.round(stoppMs(s) / 60000));
    stoppSetzen(null); UE.form = { ...(UE.form || {}), minuten: min, datum: tagIsoLokal() };
    toast(`⏱ ${min} Min. geübt – jetzt noch Stück und Inhalt wählen, dann ✔ Eintragen`, 4000);
  }
  zeichne();
};
AKTIONEN.uebenFeld = (v, el) => { UE.form[el.dataset.x] = el.dataset.x === "minuten" ? Number(v) : v; };
AKTIONEN.uebenMin = (m) => { UE.form.minuten = Number(m); zeichne(); };
AKTIONEN.uebenInhalt = (k) => { const l = UE.form.inhalt; UE.form.inhalt = l.includes(k) ? l.filter((x) => x !== k) : [...l, k]; zeichne(); };
AKTIONEN.uebenGefuehl = (g) => { UE.form.gefuehl = Number(g); zeichne(); };
AKTIONEN.uebenTeilen = (_, el) => { UE.form.geteilt = el.checked; einstSetzen("uebenTeilen", el.checked); };
AKTIONEN.uebenSpeichern = async () => {
  const f = UE.form, min = Math.round(Number(f.minuten));
  if (!(min >= 1 && min <= 600)) return toast("Bitte die Minuten angeben (1–600).");
  if (!f.datum || f.datum > tagIsoLokal()) return toast("Bitte ein Datum bis heute wählen.");
  await speichere("uebungen", { id: neueId("ue"), person_id: UE.person, datum: f.datum, minuten: min, werk_id: f.werk_id || null, inhalt: f.inhalt, gefuehl: f.gefuehl || null, notiz: f.notiz || "", geteilt: !!f.geteilt });
  const w = wochenStand(eintraege(UE.person)), ziel = planVon(UE.person).ziel;
  toast(ziel && w.summe >= ziel ? `🏆 Wochenziel geschafft – ${w.summe} Min.!` : `✔ ${min} Min. eingetragen${w.serie > 1 ? ` · 🔥 ${w.serie} Tage in Folge` : ""}`, 3500);
  UE.form = null; zeichne();
};
AKTIONEN.uebenLoeschen = async (id) => {
  if (!(await frage("Diesen Eintrag löschen?"))) return;
  const u = hole("uebungen", id); await speichere("uebungen", { ...u, geloescht_am: new Date().toISOString() }); zeichne();
};
// Übezeiten speichern (eigene Person)
async function planSpeichern(aend) {
  const p = hole("personen", S.ich.id), plan = { ...planVon(S.ich.id), ...aend };
  plan.tage = [...new Set(plan.tage)].sort();
  await speichere("personen", { ...p, uebe_plan: plan }); zeichne();
}
AKTIONEN.planFeld = (v, el) => { const k = el.dataset.x; planSpeichern({ [k]: k === "an" ? el.checked : ["dauer", "ziel", "alarm"].includes(k) ? Number(v) : v }); };
AKTIONEN.planTag = (t) => { const p = planVon(S.ich.id), n = Number(t); planSpeichern({ tage: p.tage.includes(n) ? p.tage.filter((x) => x !== n) : [...p.tage, n], an: true }); };
AKTIONEN.planKalender = (art) => {
  const p = planVon(S.ich.id);
  if (art === "google") {
    const d = new Date(); // Startdatum: nächster Übetag for (let i = 0; i < 7; i++) { if (p.tage.includes(d.getDay() || 7)) break; d.setDate(d.getDate() + 1); }
    const [h, m] = p.zeit.split(":").map(Number), b = new Date(d); b.setHours(h, m, 0, 0); const e = new Date(b.getTime() + p.dauer * 60000);
    const t = (x) => `${x.getFullYear()}${zw(x.getMonth() + 1)}${zw(x.getDate())}T${zw(x.getHours())}${zw(x.getMinutes())}00`;
    const q = new URLSearchParams({ action: "TEMPLATE", text: "🎻 Üben", dates: `${t(b)}/${t(e)}`, ctz: "Europe/Berlin", recur: "RRULE:" + uebeRrule(p), details: "Übezeit aus der Bachkreis-App – danach unter „🎻 Üben“ eintragen." });
    window.open("https://calendar.google.com/calendar/render?" + q, "_blank", "noopener");
    return toast("🟢 Google Kalender öffnet sich – dort „Speichern“ tippen. Die Erinnerung stellst du in Google ein.", 5000);
  }
  herunterladen("bachkreis-ueben.ics", ics([], "Bachkreis – Üben", { uebe: { ...p, id: S.ich.id } }), "text/calendar");
  toast("📥 Kalenderdatei geladen – öffnen und „Hinzufügen“ tippen (iPhone: Kalender, PC: Outlook)", 5000);
};

// ⏰ Beim Öffnen der App: Heute ist Übetag, die Übezeit ist da – und noch nichts eingetragen? Einmal am Tag freundlich erinnern.
export function uebenStart() {
  if (!istSchueler() || einst().uebeHinweis === false) return false;
  const p = planVon(S.ich.id), jetzt = new Date(), heute = tagIsoLokal();
  if (!p.an || !p.tage.includes(jetzt.getDay() || 7)) return false;
  const [h, m] = String(p.zeit || "17:00").split(":").map(Number);
  if (jetzt.getHours() * 60 + jetzt.getMinutes() < h * 60 + m - (p.alarm || 0)) return false;
  if (eintraege(S.ich.id).some((u) => u.datum === heute)) return false;
  try { if (localStorage.getItem("bk_uebe_hinweis") === heute) return false; localStorage.setItem("bk_uebe_hinweis", heute); } catch { return false; }
  setTimeout(() => blatt("🎻 Heute ist Übetag", `<p>Deine Übezeit ist um <b>${esc(p.zeit)}</b> (${p.dauer} Min.). Schon geübt?</p>
    <div class="knopfreihe"><button class="knopf haupt" data-a="uebenJetzt">▶ Jetzt üben</button><button class="knopf" data-a="uebenSchon">✔ Schon geübt – eintragen</button></div>`), 1200);
  return true;
}
AKTIONEN.uebenJetzt = () => { blattZu(); stoppSetzen({ ms: 0, lauf: Date.now() }); zeige("ueben"); };
AKTIONEN.uebenSchon = () => { blattZu(); zeige("ueben"); };

// 📊 Leitung/Lehrkräfte: geteilte Übezeiten der Woche je Schüler (nur, was die Schüler selbst teilen)
VIEWS.uebenUebersicht = {
  render() {
    const je = new Map();
    for (const u of liste("uebungen", (u) => u.geteilt && !u.geloescht_am)) (je.get(u.person_id) || je.set(u.person_id, []).get(u.person_id)).push(u);
    const zeilen = [...je.entries()].map(([pid, l]) => ({ pid, w: wochenStand(l), letzte: l.map((u) => u.datum).sort().pop() })).sort((a, b) => b.w.summe - a.w.summe);
    return kopf("📊 Übe-Übersicht") + `<div class="karte"><ul class="liste">${zeilen.map(({ pid, w, letzte }) => `<li><div class="fl"><div class="zeile-titel">${esc(name(pid))}</div>
      <div class="zeile-unter">diese Woche ${w.summe} Min.${w.serie ? ` · 🔥 ${w.serie}` : ""} · zuletzt ${esc(datumText(letzte))}</div></div>
      <div class="ue-mini">${w.tage.map((t) => `<i style="height:${Math.min(100, Math.round((w.jeTag[t] / 60) * 100))}%"></i>`).join("")}</div></li>`).join("") || '<li class="leer">Noch keine geteilten Übezeiten.</li>'}</ul></div>
      <p class="hinweis">Hier stehen nur Einträge, die Schüler bewusst mit Leitung & Lehrkräften teilen.</p>` + aufgabenVerwaltenHtml();
  },
};
AKTIONEN.uebenUebersicht = () => zeige("uebenUebersicht");
