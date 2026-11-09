// 🔎 Protokoll-Prüfung durch den Schriftführer (0.49.0, wie KC-CLUB-PROTOKOLL-PRUEFUNG): Wer ein Protokoll erstellt hat, gibt es „📨 Zur Prüfung an …“.
// Der Prüfer liest es und antwortet „✅ Stimmt so – freigeben“ oder „✏️ Änderung wünschen“ (Text). Wünsche stehen beim Ersteller als Abhak-Liste,
// danach „📨 Nochmal zur Prüfung“. Veröffentlichen erst nach Freigabe – sonst nur „📢 Trotzdem veröffentlichen“ mit Vermerk. Erinnern höchstens 1× am Tag.
import { S, zeichne, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, datum } from "../kern/ui.js";
import { liste, hole, speichere } from "../kern/daten.js";
import { rollenMit } from "../kern/schema.js";
import { senden } from "../kern/versand.js";

const PRUEFER_ROLLEN = ["vorstand", "leitung", "admin", "lehrkraft"];
export const pruefenFuerMich = () => liste("dokumente", (d) => d.art === "protokoll" && d.pruefer === S.ich?.id && d.pruef_status === "offen").length;
export function pruefungHtml(d) {
  if (d.art !== "protokoll") return "";
  const ich = S.ich?.id, w = Array.isArray(d.pruef_wuensche) ? d.pruef_wuensche : [];
  let inhalt;
  if (!d.pruefer || d.pruef_status === "ohne") {
    const kandidaten = liste("personen", (p) => p.status === "aktiv" && p.id !== ich && rollenMit(p.rollen).some((r) => PRUEFER_ROLLEN.includes(r))).sort((a, b) => name(a).localeCompare(name(b)));
    inhalt = `${d.pruef_status === "ohne" ? '<p class="badge b-gelb">⚠️ Ohne Freigabe veröffentlicht</p>' : '<p class="hinweis">Bevor alle es lesen: der Schriftführer schaut kurz drüber.</p>'}
      <div class="feld"><label for="pfWer">Prüfen soll</label><select id="pfWer">${kandidaten.map((p) => `<option value="${esc(p.id)}" ${/schrift/i.test(p.firma || "") ? "selected" : ""}>${esc(name(p))}${p.firma ? ` – ${esc(p.firma)}` : ""}</option>`).join("")}</select></div>
      <button type="button" class="knopf haupt" data-a="pfSenden" data-x="${esc(d.id)}">📨 Zur Prüfung senden</button>`;
  } else if (d.pruef_status === "frei") {
    inhalt = `<p>✅ Freigegeben von <b>${esc(name(d.pruefer))}</b>${d.geprueft_am ? ` am ${esc(datum(d.geprueft_am))}` : ""} – jetzt kann es veröffentlicht werden.</p>`;
  } else if (d.pruef_status === "offen" && d.pruefer === ich) {
    inhalt = `<p>🔎 <b>Bitte prüfen</b> – ${esc(name(d.pruef_von))} hat dir das Protokoll geschickt.</p>
      <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="pfFrei" data-x="${esc(d.id)}">✅ Stimmt so – freigeben</button></div>
      <div class="feld"><label for="pfWunsch">✏️ Änderung wünschen</label><textarea id="pfWunsch" rows="3" maxlength="500" placeholder="z. B. TOP 3: Betrag ist 1.450 €, nicht 1.540 €"></textarea></div>
      <button type="button" class="knopf" data-a="pfWunsch" data-x="${esc(d.id)}">↩️ Änderungswunsch senden</button>`;
  } else if (d.pruef_status === "offen") {
    const heute = new Date().toISOString().slice(0, 10), erinnert = String(d.pruef_erinnert || "").slice(0, 10) === heute;
    inhalt = `<p>🔎 Liegt zur Prüfung bei <b>${esc(name(d.pruefer))}</b> seit ${esc(datum(d.pruef_am))}.</p><button type="button" class="knopf" data-a="pfErinnern" data-x="${esc(d.id)}" ${erinnert ? "disabled" : ""}>🔔 ${erinnert ? "Heute schon erinnert" : "Erinnern"}</button>`;
  } else {
    inhalt = `<p>↩️ <b>${esc(name(d.pruefer))}</b> wünscht Änderungen – bitte einarbeiten und abhaken:</p>
      <ul class="liste">${w.map((x, i) => `<li><label class="pf-wunsch"><input type="checkbox" data-c="pfAbhaken" data-x="${esc(d.id)}|${i}" ${x.erledigt ? "checked" : ""}> <span class="${x.erledigt ? "pf-ok" : ""}">${esc(x.text)}</span></label></li>`).join("")}</ul>
      <button type="button" class="knopf haupt" data-a="pfNochmal" data-x="${esc(d.id)}" ${w.every((x) => x.erledigt) ? "" : "disabled"}>📨 Nochmal zur Prüfung</button>`;
  }
  return `<div class="karte pf-karte"><h3>🔎 Prüfung durch den Schriftführer</h3>${inhalt}</div>`;
}
const sichern = async (d, aend, meldung) => { await speichere("dokumente", { ...d, ...aend }); if (meldung) toast(meldung); zeichne(); };
const melden = (an, betreff, text) => senden({ an: [an].filter(Boolean), betreff, text, ereignis: "rundschreiben" }).catch(() => {});
AKTIONEN.pfSenden = async (id) => {
  const d = hole("dokumente", id), wer = document.getElementById("pfWer")?.value; if (!d || !wer) return toast("Bitte auswählen, wer prüfen soll");
  melden(wer, "🔎 Protokoll bitte prüfen", `${name(S.ich)} bittet dich, „${d.titel}“ zu prüfen – in der Bachkreis-App im Büro unter Protokolle.`);
  await sichern(d, { pruefer: wer, pruef_status: "offen", pruef_von: S.ich.id, pruef_am: new Date().toISOString(), pruef_wuensche: [], geprueft_am: null }, `📨 An ${name(wer)} zur Prüfung`);
};
AKTIONEN.pfFrei = async (id) => { const d = hole("dokumente", id); if (!d) return; melden(d.pruef_von, "✅ Protokoll freigegeben", `${name(S.ich)} hat „${d.titel}“ freigegeben – es kann veröffentlicht werden.`); await sichern(d, { pruef_status: "frei", geprueft_am: new Date().toISOString() }, "✅ Freigegeben – danke!"); };
AKTIONEN.pfWunsch = async (id) => {
  const d = hole("dokumente", id), t = String(document.getElementById("pfWunsch")?.value || "").trim(); if (!d || !t) return toast("Bitte kurz schreiben, was geändert werden soll");
  melden(d.pruef_von, "↩️ Änderung am Protokoll gewünscht", `${name(S.ich)} zu „${d.titel}“: ${t}`);
  await sichern(d, { pruef_status: "wuensche", pruef_wuensche: [...(d.pruef_wuensche || []).filter((x) => !x.erledigt), { text: t, erledigt: false }] }, "↩️ Wunsch geschickt");
};
AKTIONEN.pfAbhaken = async (_, el) => { const [id, i] = String(el.dataset.x).split("|"), d = hole("dokumente", id); if (!d) return; const w = [...(d.pruef_wuensche || [])]; w[Number(i)] = { ...w[Number(i)], erledigt: !!el.checked }; await sichern(d, { pruef_wuensche: w }); };
AKTIONEN.pfNochmal = async (id) => { const d = hole("dokumente", id); if (!d) return; melden(d.pruefer, "🔎 Protokoll nochmal prüfen", `„${d.titel}“ ist überarbeitet – bitte nochmal prüfen.`); await sichern(d, { pruef_status: "offen", pruef_am: new Date().toISOString() }, "📨 Nochmal zur Prüfung"); };
AKTIONEN.pfErinnern = async (id) => { const d = hole("dokumente", id); if (!d) return; melden(d.pruefer, "🔔 Erinnerung: Protokoll prüfen", `Bitte „${d.titel}“ prüfen – danke!`); await sichern(d, { pruef_erinnert: new Date().toISOString() }, "🔔 Erinnert"); };
// vor dem Veröffentlichen: ohne Freigabe nachfragen
export function vorVeroeffentlichen(d, weiter) {
  if (!d?.pruefer || ["frei", "ohne"].includes(d.pruef_status)) return weiter();
  blatt("🔎 Noch nicht freigegeben", `<p>${esc(name(d.pruefer))} hat das Protokoll noch nicht freigegeben.</p><div class="knopfspalte"><button type="button" class="knopf" data-a="pfErinnern" data-x="${esc(d.id)}">🔔 Erinnern</button>
    <button type="button" class="knopf rot" data-a="pfTrotzdem" data-x="${esc(d.id)}">📢 Trotzdem veröffentlichen (ohne Freigabe)</button></div>`);
}
AKTIONEN.pfTrotzdem = async (id) => { const d = hole("dokumente", id); if (!d) return; await speichere("dokumente", { ...d, pruef_status: "ohne" }); blattZu(); AKTIONEN.protokollFreigeben(id); };
