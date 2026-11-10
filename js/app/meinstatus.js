// 🟢 Mein Status (0.58.0, wie KC „Mein Status“): verfügbar · beschäftigt · im Urlaub · krank · nicht erreichbar – mit „bis“ und Hinweis.
// Oben links im Kopf als Knopf, unter Meins als Kachel. Die anderen sehen das Zeichen am Gesicht (Chat, Mitglieder, Ansprechpartner)
// und den Text auf der Personenseite und im Chat-Kopf. Nach dem „bis“-Tag gilt wieder 🟢 verfügbar.
// 🤒 krank mit „bis“: Termine bis dahin auf Wunsch gleich absagen (Grund „krank“). Eltern setzen den Status für ihre Kinder mit.
import { S, VIEWS, db, zeige, zeichne, kopf, vorname, istEltern } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, datum, uhr } from "../kern/ui.js";
import { hole, speichere } from "../kern/daten.js";
import { STATUS_ARTEN, statusId, statusWirksam } from "../kern/schema.js";
import { termineFuer, antwortVon, kinderVon } from "../kern/logik.js";

const heute = () => new Date().toISOString().slice(0, 10);
const tagKurz = (d) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
export const statusVon = (pid) => statusWirksam(hole("personenstatus", statusId(pid)));
export const statusArt = (pid) => statusVon(pid)?.status || "verfuegbar";
// „🤒 krank bis Fr 14.11. · Hinweis“ – ohne Status: „🟢 verfügbar“
export function statusText(pid, { hinweis = true } = {}) {
  const s = statusVon(pid), [sym, t] = STATUS_ARTEN[s?.status || "verfuegbar"];
  return `${sym} ${t}${s?.bis ? " bis " + tagKurz(s.bis) : ""}${hinweis && s?.hinweis ? " · " + s.hinweis : ""}`;
}
export const statusZeileHtml = (pid) => (statusVon(pid) ? `<div class="st-zeile st-${esc(statusArt(pid))}">${esc(statusText(pid))}</div>` : "");

const M = { fuer: null, wahl: null };
const fuerWen = () => [S.ich.id, ...(istEltern() ? kinderVon(db, S.ich.id) : [])];
VIEWS.meinstatus = {
  render() {
    const wer = fuerWen(); if (!wer.includes(M.fuer)) M.fuer = S.ich.id;
    const s = statusVon(M.fuer), wahl = M.wahl || s?.status || "verfuegbar", du = M.fuer === S.ich.id;
    return kopf("🟢 Mein Status") + `
    ${wer.length > 1 ? `<div class="karte st-fuer"><h3>Für wen?</h3>${wer.map((pid) => `<button type="button" class="st-option${pid === M.fuer ? " an" : ""}" data-a="stFuer" data-x="${esc(pid)}"><span class="st-sym">${pid === S.ich.id ? "🙂" : "👧"}</span><span class="st-t">${esc(pid === S.ich.id ? "Ich" : vorname(pid))}</span><small>${esc(statusText(pid, { hinweis: false }))}</small></button>`).join("")}</div>` : ""}
    <div class="karte"><h3>${du ? "Wie geht es dir gerade?" : `Wie geht es ${esc(vorname(M.fuer))}?`}</h3>
      <div class="st-liste" role="radiogroup" aria-label="Status">${Object.entries(STATUS_ARTEN).map(([k, [sym, t]]) => `<button type="button" role="radio" aria-checked="${k === wahl}" class="st-option st-${k}${k === wahl ? " an" : ""}" data-a="stWahl" data-x="${k}"><span class="st-sym">${sym}</span><span class="st-t">${t}</span>${k === wahl ? '<span class="st-haken">✓</span>' : ""}</button>`).join("")}</div>
    </div>
    <div class="karte st-extra"${wahl === "verfuegbar" ? " hidden" : ""}>
      <label class="st-feld"><span>bis <small>(danach wieder 🟢 verfügbar)</small></span><input type="date" id="stBis" min="${heute()}" value="${esc(s?.bis || "")}"></label>
      <label class="st-feld"><span>Hinweis für die anderen <small>(freiwillig)</small></span><input id="stHinweis" maxlength="120" placeholder="z. B. Ab Montag bin ich wieder da" value="${esc(s?.hinweis || "")}"></label>
    </div>
    <button type="button" class="knopf haupt breit" data-a="stSpeichern">💾 Speichern</button>
    <p class="hinweis st-wer">Sehen können das alle, die ${du ? "dich" : esc(vorname(M.fuer))} im Chat, in der Mitgliederliste oder als Ansprechpartner sehen${du ? "" : " – bei Kindern nur Leitung, Lehrkräfte, Vorstand und Eltern"}.</p>`;
  },
};
AKTIONEN.statusOeffnen = () => { M.fuer = S.ich.id; M.wahl = null; zeige("meinstatus"); };
AKTIONEN.stFuer = (pid) => { M.fuer = pid; M.wahl = null; zeichne(); };
AKTIONEN.stWahl = (k) => {
  const bis = document.getElementById("stBis")?.value, hinweis = document.getElementById("stHinweis")?.value; // Eingaben behalten
  M.wahl = k; zeichne();
  if (bis) { const e = document.getElementById("stBis"); if (e) e.value = bis; }
  if (hinweis) { const e = document.getElementById("stHinweis"); if (e) e.value = hinweis; }
};
AKTIONEN.stSpeichern = async () => {
  const pid = M.fuer || S.ich.id, s = statusVon(pid), wahl = M.wahl || s?.status || "verfuegbar";
  const bis = wahl === "verfuegbar" ? null : document.getElementById("stBis")?.value || null, hinweis = wahl === "verfuegbar" ? null : document.getElementById("stHinweis")?.value.trim() || null;
  if (bis && bis < heute()) return toast("Das „bis“-Datum liegt in der Vergangenheit.");
  await speichere("personenstatus", { ...(hole("personenstatus", statusId(pid)) || {}), id: statusId(pid), person_id: pid, status: wahl, bis, hinweis, gesetzt_von: S.ich.id, geloescht_am: null });
  M.wahl = null;
  toast(`💾 Status gespeichert: ${statusText(pid, { hinweis: false })}`);
  if (wahl === "krank" && bis) return krankAbsagen(pid, bis);
  zeige("start");
};
// 🤒 Termine bis zum „bis“-Tag: nicht beantwortete und unsichere sind vorausgewählt, Zugesagte markiert (wählbar)
function krankAbsagen(pid, bis) {
  const l = termineFuer(db, pid).filter((t) => t.status !== "abgesagt" && String(t.beginn).slice(0, 10) <= bis)
    .map((t) => ({ t, a: antwortVon(db, t.id, pid) })).filter(({ a }) => a?.antwort !== "nein");
  if (!l.length) return zeige("start");
  const f = pid !== S.ich.id ? vorname(pid) : "";
  blatt("🤒 Gute Besserung!", `<p>Bis ${esc(tagKurz(bis))} ${f ? `hat ${esc(f)}` : "hast du"} ${l.length === 1 ? "diesen Termin" : "diese Termine"}. Absagen (Grund: krank)?</p>
    <div class="st-termine">${l.map(({ t, a }) => `<label class="st-termin"><input type="checkbox" value="${esc(t.id)}"${a?.antwort === "ja" ? "" : " checked"}><span class="st-tt"><b>${esc(t.titel)}</b><small>${esc(datum(t.beginn))} · ${esc(uhr(t.beginn))} Uhr${a?.antwort === "ja" ? ' · <em class="st-zugesagt">schon zugesagt</em>' : ""}</small></span></label>`).join("")}</div>
    <button type="button" class="knopf haupt breit" data-a="stAbsagen" data-x="${esc(pid)}">✅ Ausgewählte absagen</button>
    <button type="button" class="knopf breit" data-a="stNurStatus">Nein, nur Status setzen</button>
    <p class="hinweis">Die Leitung sieht die Absage wie gewohnt mit Grund „krank“.${f ? ` Gilt für ${esc(f)}.` : ""}</p>`);
}
AKTIONEN.stAbsagen = async (pid) => {
  const ids = [...document.querySelectorAll(".st-termine input:checked")].map((e) => e.value);
  for (const tid of ids) { const alt = antwortVon(db, tid, pid); await speichere("antworten", { ...(alt || {}), termin_id: tid, person_id: pid, antwort: "nein", notiz: "krank", nachfragen_am: null, von_person_id: S.ich.id }); }
  blattZu(); toast(ids.length ? `❌ ${ids.length} Termin${ids.length === 1 ? "" : "e"} abgesagt – gute Besserung! 🍵` : "Nur der Status ist gesetzt."); zeige("start");
};
AKTIONEN.stNurStatus = () => { blattZu(); zeige("start"); };
