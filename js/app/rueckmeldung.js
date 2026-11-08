// 🆘💬 Rückmeldungen zur App (0.42.0, wie KC-CLUB-UNTERSTUETZUNG-ANFRAGE, KC-CLUB-FEEDBACK, „Klappt etwas nicht?“ KC-CLUB-HILFE-INSTALL):
// 🆘 Problem melden · 🤝 Hilfe mit der App anfragen (auf Wunsch Rückruf) · 💡 Idee · ⭐ Lob mit Sternen. Die App hängt technische Angaben an
// (Gerät, Browser, installiert?, Version, wo in der App) – keine Inhalte. Die Leitung antwortet; die Antwort steht bei der Meldung und kommt als Nachricht.
import { S, VIEWS, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { RM_ARTEN, RM_STATUS, RM_LEITUNG } from "../kern/schema.js";
import { APP_VERSION } from "../kern/version.js";
import { senden } from "../kern/versand.js";
import { startseiteVerbinden } from "./startseite.js";

const chef = () => hatRolle(...RM_LEITUNG);
export const rmNeu = () => (chef() ? liste("rueckmeldungen", (r) => r.status === "neu").length : 0);
function geraet() {
  const ua = navigator.userAgent, os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "anderes";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "anderer Browser";
  const inst = matchMedia?.("(display-mode: standalone)").matches || navigator.standalone ? "installiert" : "im Browser";
  return `${os} · ${br} · ${inst} · App ${APP_VERSION} · ${innerWidth}×${innerHeight}`;
}
const RM = { art: "problem", sterne: 0, vorher: "start" };
AKTIONEN.rmNeu = (art) => {
  RM.art = RM_ARTEN[art] ? art : "problem"; RM.sterne = 0; RM.vorher = S.verlauf?.at?.(-1)?.view || S.view;
  rmForm();
};
function rmForm() {
  blatt("🆘 Rückmeldung an die Leitung", `<div class="umschalter rm-arten" role="group" aria-label="Worum geht es?">${Object.entries(RM_ARTEN).map(([k, t]) => `<button type="button" class="${RM.art === k ? "an" : ""}" aria-pressed="${RM.art === k}" data-a="rmArt" data-x="${k}">${t}</button>`).join("")}</div>
    ${RM.art === "lob" ? `<div class="rm-sterne" role="group" aria-label="Wie gefällt dir die App?">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${RM.sterne >= n ? "an" : ""}" aria-pressed="${RM.sterne === n}" aria-label="${n} von 5 Sternen" data-a="rmSterne" data-x="${n}">★</button>`).join("")}</div>` : ""}
    <div class="feld"><label for="rmText">${RM.art === "problem" ? "Was klappt nicht? Was hast du gemacht, was ist passiert?" : RM.art === "hilfe" ? "Wobei brauchst du Hilfe?" : RM.art === "idee" ? "Deine Idee" : "Was möchtest du uns sagen?"}</label><textarea id="rmText" rows="5" maxlength="3000"></textarea></div>
    ${RM.art === "hilfe" || RM.art === "problem" ? '<label class="rm-rueckruf"><input type="checkbox" id="rmRueckruf"> 📞 Bitte ruft mich an (Nummer aus meinen Daten)</label>' : ""}
    <p class="hinweis">Mitgeschickt werden nur technische Angaben: ${esc(geraet())}.</p>
    <button type="button" class="knopf haupt breit" data-a="rmSenden">📨 Absenden</button>`);
}
AKTIONEN.rmArt = (k) => { RM.art = k; const t = document.getElementById("rmText")?.value || ""; rmForm(); const f = document.getElementById("rmText"); if (f) f.value = t; };
AKTIONEN.rmSterne = (n) => { RM.sterne = Number(n); const t = document.getElementById("rmText")?.value || ""; rmForm(); const f = document.getElementById("rmText"); if (f) f.value = t; };
AKTIONEN.rmSenden = async () => {
  const text = String(document.getElementById("rmText")?.value || "").trim(); if (!text) return toast("Bitte kurz beschreiben, worum es geht.");
  await speichere("rueckmeldungen", { id: neueId(), art: RM.art, text, von: S.ich.id, sterne: RM.art === "lob" && RM.sterne ? RM.sterne : null, geraet: geraet(), ansicht: RM.vorher, rueckruf: !!document.getElementById("rmRueckruf")?.checked, status: "neu" });
  const an = liste("personen", (p) => p.status === "aktiv" && (p.rollen || []).some((r) => RM_LEITUNG.includes(r))).map((p) => p.id).filter((p) => p !== S.ich.id);
  senden({ an, betreff: `${RM_ARTEN[RM.art]} – ${name(S.ich)}`, text: text.slice(0, 300), ereignis: "rundschreiben" }).catch(() => {});
  blattZu(); toast("📨 Danke! Die Leitung hat deine Nachricht bekommen – die Antwort steht unter 🆘 Meine Rückmeldungen.", 4500);
};

const F = { status: "neu" };
VIEWS.rueckmeldungen = {
  render() {
    const meine = liste("rueckmeldungen", (r) => r.von === S.ich?.id).sort((a, b) => String(b.erstellt_am || b.id).localeCompare(String(a.erstellt_am || a.id)));
    const alle = chef() ? liste("rueckmeldungen").filter((r) => F.status === "alle" || r.status === F.status).sort((a, b) => String(b.erstellt_am || b.id).localeCompare(String(a.erstellt_am || a.id))) : [];
    const zeile = (r, leitung) => `<div class="karte rm-karte"><div class="rm-kopf"><b>${esc(RM_ARTEN[r.art] || "")}</b><span class="badge">${esc(RM_STATUS[r.status] || "")}</span>${r.sterne ? `<span class="rm-stern" aria-label="${r.sterne} Sterne">${"★".repeat(r.sterne)}</span>` : ""}</div>
      ${leitung ? `<p class="hinweis">von ${esc(name(r.von))}${r.rueckruf ? " · 📞 bittet um Rückruf" : ""} · ${esc(r.geraet || "")}${r.ansicht ? ` · in „${esc(r.ansicht)}“` : ""}</p>` : ""}<p>${esc(r.text).replace(/\n/g, "<br>")}</p>
      ${r.antwort ? `<div class="rm-antwort"><b>💬 Antwort der Leitung:</b> ${esc(r.antwort).replace(/\n/g, "<br>")}</div>` : ""}
      ${leitung ? `<button type="button" class="knopf klein" data-a="rmAntworten" data-x="${esc(r.id)}">💬 ${r.antwort ? "Antwort ändern" : "Antworten"}</button>` : ""}</div>`;
    return kopf("🆘 Rückmeldungen", '<button class="knopf haupt klein" data-a="rmNeu" data-x="problem">＋ Neu</button>')
      + `<div class="knopfreihe rm-schnell">${Object.entries(RM_ARTEN).map(([k, t]) => `<button type="button" class="knopf" data-a="rmNeu" data-x="${k}">${t}</button>`).join("")}</div>`
      + (chef() ? `<h3>🧑‍💼 Eingang der Leitung</h3><div class="umschalter" role="group" aria-label="Filter">${[["neu", "🆕 neu"], ["in_arbeit", "🔧 in Arbeit"], ["erledigt", "✅ erledigt"], ["alle", "alle"]].map(([k, t]) => `<button type="button" class="${F.status === k ? "an" : ""}" aria-pressed="${F.status === k}" data-a="rmFilter" data-x="${k}">${t}</button>`).join("")}</div>${alle.map((r) => zeile(r, true)).join("") || '<div class="leer">Nichts in dieser Liste.</div>'}` : "")
      + `<h3>🙋 Meine Rückmeldungen</h3>${meine.map((r) => zeile(r, false)).join("") || '<div class="leer">Noch nichts gemeldet. Klappt etwas nicht? Oben antippen.</div>'}`;
  },
};
AKTIONEN.rmFilter = (k) => { F.status = k; zeichne(); };
AKTIONEN.rmAntworten = (id) => {
  const r = hole("rueckmeldungen", id); if (!r) return;
  blatt("💬 Antwort", `<p class="hinweis">${esc(RM_ARTEN[r.art])} von ${esc(name(r.von))}</p><div class="feld"><label for="rmAntwort">Antwort (steht bei der Meldung und kommt als Nachricht)</label><textarea id="rmAntwort" rows="4" maxlength="3000">${esc(r.antwort || "")}</textarea></div>
    <div class="feld"><label for="rmStatus">Status</label><select id="rmStatus">${Object.entries(RM_STATUS).map(([k, t]) => `<option value="${k}" ${k === (r.status === "neu" ? "in_arbeit" : r.status) ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <button type="button" class="knopf haupt breit" data-a="rmAntwortSenden" data-x="${esc(id)}">💾 Speichern und senden</button>`);
};
AKTIONEN.rmAntwortSenden = async (id) => {
  const r = hole("rueckmeldungen", id), antwort = document.getElementById("rmAntwort")?.value.trim() || null, status = document.getElementById("rmStatus")?.value || r.status;
  await speichere("rueckmeldungen", { ...r, antwort, status, beantwortet_am: antwort ? new Date().toISOString() : r.beantwortet_am });
  if (antwort && antwort !== r.antwort) senden({ an: [r.von], betreff: "💬 Antwort auf deine Rückmeldung", text: antwort.slice(0, 500), ereignis: "rundschreiben" }).catch(() => {});
  blattZu(); toast("💬 Gespeichert"); zeichne();
};
startseiteVerbinden({ rmNeu });

