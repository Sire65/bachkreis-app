// 📈 So nutzen wir die App (0.49.0, wie KC-CLUB-NUTZUNG-ALLE): für alle – wann ist am meisten los (Farbfeld Wochentag × Uhrzeit),
// wie viele machen mit, Nachrichten und Benachrichtigungen pro Tag, die beliebtesten Bereiche. Nur Summen, nie Personen, nie Inhalte;
// „wie viele Mitglieder“ erst ab 3. Vorführversion: aus den Daten auf dem Gerät.
import { VIEWS, zeichne, kopf } from "./zustand.js";
import { esc, AKTIONEN } from "../kern/ui.js";
import { liste, istEchtbetrieb, serverAktion } from "../kern/daten.js";
import { TABELLEN } from "../kern/schema.js";
import { nutzungAuswerten, WOCHENTAGE } from "../kern/logik.js";

const N = { tage: 30, daten: null, fehler: null, laedt: false };
async function laden() {
  N.laedt = true; N.fehler = null;
  try {
    if (istEchtbetrieb()) { const r = await serverAktion("nutzung_lage", { tage: N.tage }); if (r?.ok) N.daten = r; else N.fehler = r?.fehler || "nicht möglich"; }
    else N.daten = nutzungAuswerten({ aenderungen: liste("aenderungen").filter((x) => !["nachricht_status", "aenderungen"].includes(x.tabelle)), nachrichten: liste("nachrichten"), versand: liste("versand") }, N.tage);
  } catch (e) { N.fehler = e.message; }
  N.laedt = false; zeichne();
}
const pfeil = (z) => (z?.trend === "hoch" ? '<span class="nz-trend hoch" title="mehr als im Zeitraum davor">↑</span>' : z?.trend === "runter" ? '<span class="nz-trend runter" title="weniger als im Zeitraum davor">↓</span>' : z?.trend === "gleich" ? '<span class="nz-trend" title="etwa gleich">→</span>' : "");
const kachel = (sym, t, z) => `<div class="nz-zahl"><span aria-hidden="true">${sym}</span><b>${z?.n == null ? "–" : z.n.toLocaleString("de-DE")}${pfeil(z)}</b><small>${t}</small></div>`;
function feldHtml(d) {
  const max = Math.max(1, ...d.feld.flat());
  return `<div class="nz-feld" role="img" aria-label="${d.spitze ? `Am meisten los: ${d.spitze.tag} gegen ${d.spitze.stunde} Uhr` : "Noch keine Daten"}">
    <span></span>${[0, 6, 12, 18].map((h) => `<span class="nz-h" style="grid-column:${h + 2} / span 6">${h} Uhr</span>`).join("")}
    ${d.feld.map((r, w) => `<span class="nz-wt">${WOCHENTAGE[w]}</span>${r.map((n) => `<i style="--a:${(n / max).toFixed(2)}"></i>`).join("")}`).join("")}</div>`;
}
function balken(d) {
  const l = d.tage_liste.slice(-31), max = Math.max(1, ...l.map((x) => x.nachrichten + x.push + x.mail));
  return l.length ? `<div class="nz-balken" role="img" aria-label="Nachrichten und Benachrichtigungen pro Tag">${l.map((x) => `<div class="nz-tag" title="${esc(x.tag)}: ${x.nachrichten} Nachrichten, ${x.push} Push, ${x.mail} E-Mail">
    <i class="m" style="height:${(x.mail / max) * 100}%"></i><i class="p" style="height:${(x.push / max) * 100}%"></i><i class="n" style="height:${(x.nachrichten / max) * 100}%"></i></div>`).join("")}</div>
    <p class="nz-legende"><i class="n"></i> Nachrichten <i class="p"></i> Push <i class="m"></i> E-Mail</p>` : '<p class="hinweis">Noch keine Daten.</p>';
}
VIEWS.nutzung = {
  render() {
    const d = N.daten;
    return kopf("📈 So nutzen wir die App") + `<div class="umschalter" role="group" aria-label="Zeitraum">${[7, 30, 90].map((t) => `<button type="button" class="${N.tage === t ? "an" : ""}" aria-pressed="${N.tage === t}" data-a="nzTage" data-x="${t}">${t} Tage</button>`).join("")}</div>`
      + (N.fehler ? `<p class="badge b-rot">⚠️ ${esc(N.fehler)}</p>` : !d ? '<p class="hinweis">wird gezählt …</p>'
        : `<div class="nz-zahlen">${kachel("👆", "Aktionen in der App", d.aktionen)}${kachel("👥", "machen mit", d.mitglieder)}${kachel("💬", "Nachrichten", d.nachrichten)}${kachel("🔔", "Benachrichtigungen", d.benachrichtigungen)}</div>
        <div class="karte"><h3>🕒 Wann ist am meisten los?</h3>${d.spitze ? `<p>Am meisten los: <b>${esc({ Mo: "montags", Di: "dienstags", Mi: "mittwochs", Do: "donnerstags", Fr: "freitags", Sa: "samstags", So: "sonntags" }[d.spitze.tag] || d.spitze.tag)} gegen ${d.spitze.stunde} Uhr</b></p>` : ""}${feldHtml(d)}</div>
        <div class="karte"><h3>📅 Pro Tag</h3>${balken(d)}</div>
        <div class="karte"><h3>🏆 Beliebteste Bereiche</h3><ol class="nz-top">${d.bereiche.map((b) => `<li><span>${esc(TABELLEN[b.t]?.sym || "📄")} ${esc(TABELLEN[b.t]?.titel || b.t)}</span><b>${b.n}</b></li>`).join("") || "<li>–</li>"}</ol></div>
        <p class="hinweis">Gezählt werden nur Summen – nie, wer was gemacht hat, und nie Inhalte. „Machen mit“ steht erst ab 3 Personen da. Pfeil ↑↓ = Vergleich mit den ${d.tage} Tagen davor.</p>`);
  },
  nach() { if (!N.daten && !N.laedt && !N.fehler) laden(); },
};
AKTIONEN.nzTage = (t) => { N.tage = Number(t); N.daten = null; laden(); };
