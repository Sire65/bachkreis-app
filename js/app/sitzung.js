// 🎬 Sitzung vorbereiten & leiten (0.48.0, wie KC „Clubsitzung vorbereiten und leiten“: KC-CLUB-SITZUNG-ABLAUF, -SCHRITTE, -FRIST, -VORGABEN).
// Vorstandssitzung, Elternabend, Leitungsrunde, Mitgliederversammlung – Schritt für Schritt mit Häkchen:
// 1 💡 Vorschläge übernehmen · 2 📝 Tagesordnung · 3 📨 Einladen (Frist: spätestens N Tage vorher) · 4 🔔 Erinnern · 5 ▶️ Leiten (TOP für TOP mit Uhr,
// Notiz und Beschluss) · 6 🗒️ Protokoll (fertiger Text im Büro-Ordner „Protokolle“, danach wie gewohnt freigeben). Planen dürfen Leitung, Vorstand, Admin;
// Eingeladene sehen die Tagesordnung, sobald eingeladen ist.
import { S, VIEWS, zeige, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datum, uhr, zuLokal, vonLokal } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { SITZUNG_ARTEN, SITZUNG_FUER, SITZUNG_STATUS, SITZUNG_PLANER, sitzungFuerMich, rollenMit, VS_AN } from "../kern/schema.js";
import { senden } from "../kern/versand.js";
import { klappe } from "../kern/klappen.js";

export const darfPlanen = () => hatRolle(...SITZUNG_PLANER);
const tagMs = 86400000;
export const fristBis = (s) => new Date(new Date(s.beginn).getTime() - (Number(s.frist_tage ?? 3) || 0) * tagMs);
export const empfaenger = (s) => liste("personen", (p) => p.status === "aktiv" && sitzungFuerMich(s, p, rollenMit(p.rollen))).map((p) => p.id);
export function schritte(s, jetzt = new Date()) {
  const to = s.tagesordnung || [];
  return [
    ["vorschlaege", "💡 Vorschläge übernehmen", to.some((p) => p.von === "vorschlag") || !!s.eingeladen_am || !(() => { try { return offeneVorschlaege(s); } catch { return []; } })().length],
    ["to", "📝 Tagesordnung festlegen", to.length > 0],
    ["einladen", "📨 Einladen", !!s.eingeladen_am, !s.eingeladen_am && jetzt > fristBis(s) ? "Frist verpasst" : !s.eingeladen_am ? `bis spätestens ${datum(fristBis(s).toISOString())}` : ""],
    ["erinnern", "🔔 Erinnern", !!s.erinnert_am || ["laeuft", "beendet"].includes(s.status)], // nach Beginn erledigt sich das Erinnern
    ["leiten", "▶️ Sitzung leiten", s.status === "beendet"],
    ["protokoll", "🗒️ Protokoll", !!s.protokoll_id],
  ];
}
// offene Vorschläge, die zur Zielgruppe passen (Vorstand → an „vorstand“, Eltern → „eltern“/„alle“, Team → „team“)
export function offeneVorschlaege(s) {
  const passt = { vorstand: ["vorstand"], eltern: ["eltern", "alle"], team: ["team"], alle: ["alle", "eltern"] }[s.zielgruppe] || [];
  const schon = new Set((s.tagesordnung || []).map((p) => p.titel));
  return liste("vorschlaege", (v) => v.status === "offen" && v.art === "vorschlag" && passt.includes(v.an) && !schon.has(v.titel));
}
export const sitzungenFuerMich = () => liste("versammlungen", (s) => darfPlanen() || sitzungFuerMich(s, S.ich, rollenMit(S.ich?.rollen))).sort((a, b) => String(a.beginn).localeCompare(String(b.beginn)));
export const naechsteSitzung = () => sitzungenFuerMich().find((s) => s.status !== "beendet" && new Date(s.beginn) > new Date(Date.now() - 6 * 3600000));

const zeile = (s) => `<li class="klick" data-a="oeffne" data-x="sitzung|${esc(s.id)}"><span aria-hidden="true">${(SITZUNG_ARTEN[s.art] || "🎬").split(" ")[0]}</span><div class="fl"><div class="zeile-titel">${esc(s.titel)}</div><div class="zeile-unter">${esc(datum(s.beginn))}, ${esc(uhr(s.beginn))} Uhr${s.ort ? ` · ${esc(s.ort)}` : ""} · ${esc(SITZUNG_STATUS[s.status] || "")}</div></div><span aria-hidden="true">›</span></li>`;
VIEWS.sitzungen = {
  render() {
    const l = sitzungenFuerMich(), jetzt = Date.now(), kommend = l.filter((s) => s.status !== "beendet" && new Date(s.beginn).getTime() > jetzt - 6 * 3600000), alt = l.filter((s) => !kommend.includes(s)).reverse();
    return kopf("🎬 Sitzungen", darfPlanen() ? '<button type="button" class="knopf haupt klein" data-a="sitzNeu">＋ Sitzung</button>' : "")
      + `<p class="hinweis">Vorstandssitzung, Elternabend, Leitungsrunde – ${darfPlanen() ? "Schritt für Schritt vorbereiten, einladen, leiten und das Protokoll gleich mitschreiben." : "hier steht die Tagesordnung, sobald eingeladen ist."}</p>
      <div class="karte"><h3>📅 Kommende</h3><ul class="liste">${kommend.map(zeile).join("") || "<li>Keine Sitzung geplant.</li>"}</ul></div>
      ${alt.length ? klappe("sitz_alt", "🗂️ Vergangene", `<ul class="liste">${alt.map(zeile).join("")}</ul>`, { zahl: alt.length }) : ""}`;
  },
};

VIEWS.sitzung = {
  render({ id }) {
    const s = hole("versammlungen", id); if (!s) return kopf("🎬 Sitzung") + '<div class="leer">Nicht gefunden.</div>';
    const planer = darfPlanen(), to = s.tagesordnung || [], min = to.reduce((a, p) => a + (p.minuten || 0), 0);
    const kopfInfo = `<div class="karte sitz-kopf"><div class="badge">${esc(SITZUNG_ARTEN[s.art] || "")}</div><h3>${esc(s.titel)}</h3><p>📅 ${esc(datum(s.beginn))}, ${esc(uhr(s.beginn))} Uhr${s.ort ? ` · 📍 ${esc(s.ort)}` : ""}<br>👥 ${esc(SITZUNG_FUER[s.zielgruppe] || "")} · ${esc(SITZUNG_STATUS[s.status] || "")}${s.leiter ? ` · Leitung: ${esc(name(s.leiter))}` : ""}</p>
      ${planer ? `<button type="button" class="knopf klein" data-a="sitzAendern" data-x="${esc(s.id)}">✏️ Daten ändern</button>` : ""}</div>`;
    if (!planer) return kopf("🎬 Sitzung") + kopfInfo + `<div class="karte"><h3>📝 Tagesordnung</h3><ol class="sitz-to">${to.map((p) => `<li><b>${esc(p.titel)}</b>${p.minuten ? ` <small>(${p.minuten} Min.)</small>` : ""}${s.status === "beendet" && p.beschluss ? `<div class="sitz-beschluss">✅ ${esc(p.beschluss)}</div>` : ""}</li>`).join("") || "<li>Folgt.</li>"}</ol></div>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="kachel" data-x="vorschlaege">💡 Vorschlag einbringen</button></div>`;
    if (s.status === "laeuft") return kopf("🔴 Sitzung läuft") + leitenHtml(s);
    const st = schritte(s), naechster = st.find(([, , ok]) => !ok)?.[0];
    const vs = offeneVorschlaege(s);
    const teil = {
      vorschlaege: vs.length ? `<ul class="liste">${vs.map((v) => `<li><div class="fl"><b>${esc(v.titel)}</b><div class="zeile-unter">${esc(name(v.von))} · ${esc(VS_AN[v.an] || "")}</div></div><button type="button" class="knopf klein" data-a="sitzVsUebernehmen" data-x="${esc(s.id)}|${esc(v.id)}">＋ auf die TO</button></li>`).join("")}</ul>` : '<p class="hinweis">Keine offenen Vorschläge für diesen Kreis.</p>',
      to: `<ol class="sitz-to bearbeiten">${to.map((p, i) => `<li><div class="fl"><b>${esc(p.titel)}</b>${p.minuten ? ` <small>${p.minuten} Min.</small>` : ""}</div><span class="sitz-to-knoepfe"><button type="button" class="knopf klein" data-a="sitzTopHoch" data-x="${esc(s.id)}|${i}" aria-label="TOP ${i + 1} nach oben" ${i ? "" : "disabled"}>▲</button><button type="button" class="knopf klein" data-a="sitzTopWeg" data-x="${esc(s.id)}|${i}" aria-label="TOP ${i + 1} entfernen">✕</button></span></li>`).join("")}</ol>
        <div class="sitz-neu-top"><input id="sitzTopText" maxlength="160" placeholder="Neuer Punkt, z. B. Kassenbericht" aria-label="Neuer Tagesordnungspunkt"><input id="sitzTopMin" type="number" min="0" max="240" placeholder="Min." aria-label="Minuten"><button type="button" class="knopf klein haupt" data-a="sitzTopNeu" data-x="${esc(s.id)}">＋</button></div>
        <p class="hinweis">${to.length} Punkte · ca. ${min} Minuten${min ? ` · Ende gegen ${esc(uhr(new Date(new Date(s.beginn).getTime() + min * 60000).toISOString()))} Uhr` : ""}</p>`,
      einladen: `<p>${s.eingeladen_am ? `✅ Eingeladen am ${esc(datum(s.eingeladen_am))} – ${empfaenger(s).length} Personen.` : `An ${empfaenger(s).length} Personen (${esc(SITZUNG_FUER[s.zielgruppe])}) mit Tagesordnung. Frist: spätestens <b>${esc(datum(fristBis(s).toISOString()))}</b>.`}</p>
        <button type="button" class="knopf${s.eingeladen_am ? "" : " haupt"}" data-a="sitzEinladen" data-x="${esc(s.id)}" ${to.length ? "" : "disabled"}>📨 ${s.eingeladen_am ? "Erneut einladen (geänderte TO)" : "Jetzt einladen"}</button>`,
      erinnern: `<p class="hinweis">${s.erinnert_am ? `✅ Erinnert am ${esc(datum(s.erinnert_am))}.` : "Am Tag vorher kurz erinnern."}</p><button type="button" class="knopf" data-a="sitzErinnern" data-x="${esc(s.id)}" ${s.eingeladen_am ? "" : "disabled"}>🔔 Erinnerung senden</button>`,
      leiten: s.status === "beendet" ? `<p>✅ Beendet ${s.beendet_am ? `um ${esc(uhr(s.beendet_am))} Uhr` : ""}.</p>` : `<button type="button" class="knopf haupt breit" data-a="sitzStart" data-x="${esc(s.id)}" ${to.length ? "" : "disabled"}>▶️ Sitzung starten</button>`,
      protokoll: s.protokoll_id ? `<p>✅ Protokoll liegt im Büro.</p><div class="knopfreihe"><button type="button" class="knopf" data-a="oeffne" data-x="buerodok|${esc(s.protokoll_id)}">🗒️ Öffnen</button><button type="button" class="knopf" data-a="protokollFreigeben" data-x="${esc(s.protokoll_id)}">📣 Für Mitglieder freigeben</button></div>`
        : `<button type="button" class="knopf${s.status === "beendet" ? " haupt" : ""}" data-a="sitzProtokoll" data-x="${esc(s.id)}" ${s.status === "beendet" ? "" : "disabled"}>🗒️ Protokoll erzeugen</button>`,
    };
    return kopf("🎬 Sitzung") + kopfInfo
      + `<ol class="sitz-schritte">${st.map(([k, t, ok, hinweis], i) => `<li class="${ok ? "ok" : k === naechster ? "jetzt" : ""}"><details class="kl" data-klappe="sitz_${k}" data-ohne-unten data-ohne-schloss ${k === naechster || (k === "to" && !ok) ? "open" : ""}><summary><span class="kl-titel">${ok ? "✅" : `<span class="sitz-nr">${i + 1}</span>`} ${t}${hinweis ? ` <small class="${hinweis === "Frist verpasst" ? "sitz-rot" : "hinweis"}">${esc(hinweis)}</small>` : ""}</span></summary><div class="kl-inhalt">${teil[k]}</div></details></li>`).join("")}</ol>`;
  },
};
// ▶️ Leiten: TOP für TOP, Uhr läuft je TOP, Notiz und Beschluss mitschreiben
const L = { top: 0, start: 0, takt: null };
function leitenHtml(s) {
  const to = s.tagesordnung || [], i = Math.min(L.top, to.length - 1), p = to[i] || {};
  const anw = Object.values(s.anwesenheit || {}).filter((v) => v === "da").length;
  return `<div class="knopfreihe"><button type="button" class="knopf" data-a="sitzAnwesenheit" data-x="${esc(s.id)}">👥 Anwesenheit${anw ? ` (${anw} da)` : ""}</button></div><div class="karte sitz-live"><div class="sitz-live-kopf"><b>TOP ${i + 1} von ${to.length}</b><span id="sitzUhr" class="sitz-uhr" aria-live="off">0:00</span>${p.minuten ? `<small>geplant ${p.minuten} Min.</small>` : ""}</div>
    <h3>${esc(p.titel || "")}</h3>
    <div class="feld"><label for="sitzNotiz">📝 Notiz</label><textarea id="sitzNotiz" rows="4" maxlength="2000">${esc(p.notiz || "")}</textarea></div>
    <div class="feld"><label for="sitzBeschluss">✅ Beschluss / Ergebnis</label><input id="sitzBeschluss" maxlength="1000" value="${esc(p.beschluss || "")}" placeholder="z. B. einstimmig angenommen"></div>
    <label class="schalter"><span><b>⏭️ Vertagt</b><div class="hinweis">Kommt bei der nächsten Sitzung wieder auf die Tagesordnung</div></span><input type="checkbox" id="sitzVertagt" ${p.vertagt ? "checked" : ""}></label>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="sitzTopGehe" data-x="${esc(s.id)}|${i - 1}" ${i ? "" : "disabled"}>‹ Zurück</button>${i < to.length - 1 ? `<button type="button" class="knopf haupt" data-a="sitzTopGehe" data-x="${esc(s.id)}|${i + 1}">✓ Nächster TOP ›</button>` : `<button type="button" class="knopf haupt" data-a="sitzEnde" data-x="${esc(s.id)}">⏹️ Sitzung beenden</button>`}</div></div>
    <div class="karte"><ol class="sitz-to">${to.map((x, k) => `<li class="${k === i ? "jetzt" : x.erledigt ? "ok" : ""}">${x.erledigt ? "✅ " : ""}${esc(x.titel)}</li>`).join("")}</ol></div>`;
}
const uhrText = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
if (typeof document !== "undefined") document.addEventListener("bk-ansicht", () => { clearInterval(L.takt); L.takt = null; setTimeout(() => { if (document.getElementById("sitzUhr")) { L.start ||= Date.now(); L.takt = setInterval(() => { const u = document.getElementById("sitzUhr"); if (!u) return clearInterval(L.takt); u.textContent = uhrText(Date.now() - L.start); }, 1000); } }, 0); });

// ---------- Aktionen ----------
const holeS = (x) => { const [id, n] = String(x).split("|"); return [hole("versammlungen", id), n]; };
const sichern = async (s, aend, meldung) => { const neu = await speichere("versammlungen", { ...s, ...aend }); if (meldung) toast(meldung); zeichne(); return neu; };
function sitzForm(s = null) {
  const morgen = new Date(Date.now() + 14 * tagMs); morgen.setHours(19, 30, 0, 0);
  blatt(s ? "✏️ Sitzung ändern" : "＋ Neue Sitzung", `<form id="sitzForm">
    <div class="feld"><label for="sfArt">Art</label><select id="sfArt" name="art">${Object.entries(SITZUNG_ARTEN).map(([k, t]) => `<option value="${k}" ${(s?.art || "vorstand") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="feld"><label for="sfTitel">Titel</label><input id="sfTitel" name="titel" required maxlength="120" value="${esc(s?.titel || "")}" placeholder="z. B. Vorstandssitzung November"></div>
    <div class="feld"><label for="sfFuer">Für wen?</label><select id="sfFuer" name="zielgruppe">${Object.entries(SITZUNG_FUER).map(([k, t]) => `<option value="${k}" ${(s?.zielgruppe || "vorstand") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="feld"><label for="sfBeginn">Beginn</label><input id="sfBeginn" name="beginn" type="datetime-local" required value="${esc(zuLokal(s?.beginn || morgen.toISOString()))}"></div>
    <div class="feld"><label for="sfOrt">Ort</label><input id="sfOrt" name="ort" maxlength="100" value="${esc(s?.ort || "")}" placeholder="z. B. Musiksaal"></div>
    <div class="feld"><label for="sfFrist">Einladung spätestens … Tage vorher</label><input id="sfFrist" name="frist_tage" type="number" min="0" max="30" value="${esc(s?.frist_tage ?? 3)}"></div></form>
    <button type="button" class="knopf haupt breit" data-a="sitzSpeichern" data-x="${esc(s?.id || "")}">💾 Speichern</button>`);
}
AKTIONEN.sitzNeu = () => sitzForm();
AKTIONEN.sitzAendern = (id) => sitzForm(hole("versammlungen", id));
AKTIONEN.sitzSpeichern = async (id) => {
  const f = formWerte(document.getElementById("sitzForm")); if (!String(f.titel || "").trim()) return toast("Bitte einen Titel eingeben");
  const alt = id ? hole("versammlungen", id) : null;
  // ⏭️ 0.49.0 (wie KC-CLUB-PROTOKOLL-VERTAGT): vertagte Punkte der letzten Sitzung gleicher Art kommen als „Offen aus dem letzten Protokoll“ gleich nach der Begrüßung
  const vertagt = alt ? [] : (letzteSitzung(f.art)?.tagesordnung || []).filter((p) => p.vertagt).map((p) => ({ titel: `Offen aus dem letzten Protokoll: ${p.titel.replace(/^Offen aus dem letzten Protokoll: /, "")}`, minuten: p.minuten || 10, vs_id: p.vs_id || null, von: p.vs_id ? "vorschlag" : null }));
  if (vertagt.length) toast(`⏭️ ${vertagt.length} vertagte${vertagt.length > 1 ? " Punkte" : "r Punkt"} aus der letzten Sitzung übernommen`, 3500);
  const z = await speichere("versammlungen", { ...(alt || { id: neueId(), status: "planung", tagesordnung: [{ titel: "Begrüßung & Protokoll der letzten Sitzung", minuten: 5 }, ...vertagt], leiter: S.ich.id }), art: f.art, titel: f.titel.trim(), zielgruppe: f.zielgruppe, beginn: vonLokal(f.beginn), ort: f.ort || null, frist_tage: Number(f.frist_tage) || 0 });
  blattZu(); toast("💾 Gespeichert"); zeige("sitzung", { id: z.id }, { ersetzen: !!alt });
};
AKTIONEN.sitzTopNeu = async (id) => {
  const s = hole("versammlungen", id), t = String(document.getElementById("sitzTopText")?.value || "").trim(); if (!s || !t) return toast("Bitte den Punkt eintragen");
  await sichern(s, { tagesordnung: [...(s.tagesordnung || []), { titel: t, minuten: Number(document.getElementById("sitzTopMin")?.value) || null }] });
  document.getElementById("sitzTopText")?.focus();
};
AKTIONEN.sitzTopWeg = async (x) => { const [s, n] = holeS(x); if (s) await sichern(s, { tagesordnung: (s.tagesordnung || []).filter((_, i) => i !== Number(n)) }); };
AKTIONEN.sitzTopHoch = async (x) => { const [s, n] = holeS(x); if (!s || !Number(n)) return; const t = [...(s.tagesordnung || [])], i = Number(n); [t[i - 1], t[i]] = [t[i], t[i - 1]]; await sichern(s, { tagesordnung: t }); };
AKTIONEN.sitzVsUebernehmen = async (x) => { const [s, vid] = holeS(x), v = hole("vorschlaege", vid); if (!s || !v) return; await sichern(s, { tagesordnung: [...(s.tagesordnung || []), { titel: v.titel, von: "vorschlag", vs_id: v.id, minuten: 10 }] }, "💡 Auf der Tagesordnung"); };
export const letzteSitzung = (art, vor = null) => liste("versammlungen", (x) => x.art === art && x.status === "beendet" && (!vor || x.beginn < vor)).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn)))[0] || null;
const toText = (s) => (s.tagesordnung || []).map((p, i) => `${i + 1}. ${p.titel}${p.minuten ? ` (${p.minuten} Min.)` : ""}`).join("\n");
AKTIONEN.sitzEinladen = async (id) => {
  const s = hole("versammlungen", id); if (!s) return; const an = empfaenger(s).filter((p) => p !== S.ich.id);
  if (!confirm(`Einladung mit Tagesordnung an ${an.length} Personen senden?`)) return;
  senden({ an, betreff: `📨 Einladung: ${s.titel}`, text: `${SITZUNG_ARTEN[s.art] || "Sitzung"} am ${datum(s.beginn)}, ${uhr(s.beginn)} Uhr${s.ort ? ` – ${s.ort}` : ""}\n\nTagesordnung:\n${toText(s)}\n\nIn der Bachkreis-App unter 🎬 Sitzungen.`, ereignis: "rundschreiben" }).catch(() => {});
  await sichern(s, { eingeladen_am: new Date().toISOString(), status: s.status === "planung" ? "eingeladen" : s.status }, `📨 ${an.length} eingeladen`);
};
AKTIONEN.sitzErinnern = async (id) => {
  const s = hole("versammlungen", id); if (!s) return; const an = empfaenger(s).filter((p) => p !== S.ich.id);
  senden({ an, betreff: `🔔 Erinnerung: ${s.titel}`, text: `${datum(s.beginn)}, ${uhr(s.beginn)} Uhr${s.ort ? ` – ${s.ort}` : ""}. Bis dann!`, ereignis: "rundschreiben" }).catch(() => {});
  await sichern(s, { erinnert_am: new Date().toISOString() }, `🔔 ${an.length} erinnert`);
};
AKTIONEN.sitzStart = async (id) => { const s = hole("versammlungen", id); if (!s) return; L.top = 0; L.start = Date.now(); await sichern(s, { status: "laeuft", gestartet_am: new Date().toISOString(), leiter: s.leiter || S.ich.id }); };
async function topMerken(s) {
  const to = [...(s.tagesordnung || [])], i = Math.min(L.top, to.length - 1); if (i < 0) return s;
  to[i] = { ...to[i], notiz: document.getElementById("sitzNotiz")?.value || null, beschluss: document.getElementById("sitzBeschluss")?.value || null, vertagt: !!document.getElementById("sitzVertagt")?.checked, erledigt: true };
  return speichere("versammlungen", { ...s, tagesordnung: to });
}
AKTIONEN.sitzTopGehe = async (x) => { const [s, n] = holeS(x); if (!s) return; await topMerken(s); L.top = Math.max(0, Number(n)); L.start = Date.now(); zeichne(); };
AKTIONEN.sitzEnde = async (id) => {
  let s = hole("versammlungen", id); if (!s) return; s = await topMerken(s);
  // 💡 0.49.0 (wie KC-CLUB-VORSCHLAG-BEHANDELT): Vorschläge auf der Tagesordnung gelten als behandelt – vertagte bleiben offen
  let n = 0;
  for (const p of (s.tagesordnung || []).filter((x) => x.vs_id && !x.vertagt)) {
    const v = hole("vorschlaege", p.vs_id); if (!v || v.status !== "offen") continue;
    try { await speichere("vorschlaege", { ...v, status: "erledigt", ergebnis: `Behandelt in „${s.titel}“ am ${datum(s.beginn)}${p.beschluss ? ` – ${p.beschluss}` : ""}` }); n++; } catch {}
  }
  await sichern(s, { status: "beendet", beendet_am: new Date().toISOString() }, `⏹️ Sitzung beendet${n ? ` · 💡 ${n} Vorschlag${n > 1 ? "e" : ""} als behandelt markiert` : ""} – jetzt das Protokoll erzeugen`);
};
// 👥 Anwesenheit (wie KC-CLUB-TEILNAHME): je eingeladene Person da / entschuldigt / fehlt
AKTIONEN.sitzAnwesenheit = (id) => {
  const s = hole("versammlungen", id); if (!s) return; const a = s.anwesenheit || {};
  blatt("👥 Anwesenheit", `<ul class="liste sitz-anw">${empfaenger(s).sort((x, y) => name(x).localeCompare(name(y))).map((pid) => `<li><div class="fl">${esc(name(pid))}</div><div class="umschalter klein" role="group" aria-label="${esc(name(pid))}">${[["da", "✅ da"], ["entschuldigt", "🙏 entsch."], ["fehlt", "✖ fehlt"]].map(([k, t]) => `<button type="button" class="${a[pid] === k ? "an" : ""}" aria-pressed="${a[pid] === k}" data-a="sitzAnwSetzen" data-x="${esc(id)}|${esc(pid)}|${k}">${t}</button>`).join("")}</div></li>`).join("")}</ul>`);
};
AKTIONEN.sitzAnwSetzen = async (x) => { const [id, pid, k] = String(x).split("|"), s = hole("versammlungen", id); if (!s) return; await speichere("versammlungen", { ...s, anwesenheit: { ...(s.anwesenheit || {}), [pid]: k } }); AKTIONEN.sitzAnwesenheit(id); };
// ✅☐ Aufgaben-Stand aus dem letzten Protokoll gleicher Art (wie KC-CLUB-PROTOKOLL-AUFGABEN-STAND)
export function aufgabenAusText(inhalt) {
  const z = String(inhalt || "").split("\n"), i = z.findIndex((x) => /^Aufgaben \(wer · was · bis wann\):/.test(x)); if (i < 0) return [];
  const l = []; for (const x of z.slice(i + 1)) { if (!x.trim()) { if (l.length) break; continue; } const t = x.replace(/^\s*[-•☐✓]\s*/, "").trim(); if (/^Protokoll erstellt/.test(t)) break; if (t) l.push(t); }
  return l;
}
export function protokollText(s, jetzt = new Date(), vorherAufgaben = []) {
  const to = s.tagesordnung || [], anw = s.anwesenheit || {}, wer = (k) => Object.entries(anw).filter(([, v]) => v === k).map(([p]) => name(p)).sort();
  return [`${SITZUNG_ARTEN[s.art] || "Sitzung"}: ${s.titel}`, `Datum: ${datum(s.beginn)}, ${uhr(s.beginn)}${s.beendet_am ? `–${uhr(s.beendet_am)}` : ""} Uhr${s.ort ? ` · Ort: ${s.ort}` : ""}`, `Sitzungsleitung: ${s.leiter ? name(s.leiter) : "–"}`,
    ...(wer("da").length ? [`Anwesend (${wer("da").length}): ${wer("da").join(", ")}`] : []), ...(wer("entschuldigt").length ? [`Entschuldigt: ${wer("entschuldigt").join(", ")}`] : []), "",
    ...(vorherAufgaben.length ? ["Aufgaben aus dem letzten Protokoll (bitte abhaken):", ...vorherAufgaben.map((a) => `☐ offen – ${a}`), ""] : []),
    ...to.flatMap((p, i) => [`TOP ${i + 1}: ${p.titel}${p.vertagt ? " – ⏭️ vertagt" : ""}`, ...(p.notiz ? [p.notiz] : []), ...(p.beschluss ? [`Beschluss: ${p.beschluss}`] : []), ""]),
    "Aufgaben (wer · was · bis wann):", "- ", "", `Protokoll erstellt am ${datum(jetzt.toISOString())} mit der Bachkreis-App.`].join("\n");
}
AKTIONEN.sitzProtokoll = async (id) => {
  const s = hole("versammlungen", id); if (!s) return;
  const vor = letzteSitzung(s.art, s.beginn), vorherAufgaben = vor?.protokoll_id ? aufgabenAusText(hole("dokumente", vor.protokoll_id)?.inhalt) : [];
  const d = await speichere("dokumente", { id: neueId(), titel: `Protokoll: ${s.titel} (${datum(s.beginn)})`, art: "protokoll", ordner: "protokolle", sichtbar: s.art === "vorstand" ? "vorstand" : "leitung", jahr: new Date(s.beginn).getFullYear(), inhalt: protokollText(s, new Date(), vorherAufgaben) });
  await sichern(s, { protokoll_id: d.id }, "🗒️ Protokoll liegt im Büro – Aufgaben ergänzen und freigeben");
  zeige("buerodok", { id: d.id });
};
