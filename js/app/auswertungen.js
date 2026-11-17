// 📈 Auswertungen (0.76.0, Bewertung 17.11. Punkt 5): Verläufe statt nur Momentaufnahmen – Mitglieder, Zu-/Abgänge je Schuljahr,
// Probenbesuch je Monat und je Register, Besetzung Ist/Soll je Orchester, Leihinstrumente, und welche Kacheln genutzt werden (anonym).
// Jede Auswertung: Diagramm (Linien 2 px, Balken mit Abstand, ruhige Achsen, Werte beim Zeigen), „Als Tabelle“ und ⬇️ CSV für den Vorstand.
// Rechnungen: js/kern/auswertung.js (nur Zahlen, nur was die Person sehen darf). Farben geprüft (Dataviz-Check: hell und dunkel).
import { VIEWS, db, zeichne, kopf, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, herunterladen } from "../kern/ui.js";
import { liste, istEchtbetrieb, serverAktion } from "../kern/daten.js";
import { schuljahrVon } from "../kern/schema.js";
import { mitgliederVerlauf, zuAbgaenge, probenbesuchMonate, probenbesuchRegister, besetzungRegister, leihVerlauf, kachelAuswertung, csv } from "../kern/auswertung.js";
import { KACHELN } from "./start.js";
import { geraetZaehlung } from "./kachelzaehler.js";

export const AW_ROLLEN = ["admin", "leitung", "vorstand", "lehrkraft", "instrumentenwart", "notenwart"], AW_NUTZUNG = ["admin", "leitung", "vorstand"];
const AW = { monate: 6, gruppe: null, tage: 30, nutzung: null, laedt: false };
const fmt = (v, e = "") => (v == null ? "–" : `${Number(v).toLocaleString("de-DE")}${e}`);
// führende leere Monate weglassen (Daten gibt es erst ab …) – mindestens 2 Punkte bleiben
const ohneLeerAnfang = (l) => { const i = l.findIndex((x) => x.wert); return i <= 0 ? l : l.slice(Math.min(i, l.length - 2)); };

// ---------- Diagramme (SVG, ohne fremde Bibliothek) ----------
const B = 330, H = 150, L = 30, R = 8, O = 12, U = 26;
function achse(max, einheit) {
  const s = [0, max / 2, max].map((v) => Math.round(v));
  return s.map((v) => { const y = O + (H - O - U) * (1 - v / (max || 1)); return `<line class="dv-gitter" x1="${L}" x2="${B - R}" y1="${y}" y2="${y}"/><text class="dv-achse" x="${L - 4}" y="${y + 3}" text-anchor="end">${v}${einheit}</text>`; }).join("");
}
export function linie(daten, { einheit = "", max = null, titel = "" } = {}) {
  const w = daten.map((d) => d.wert ?? 0), m = max ?? Math.max(4, Math.ceil(Math.max(...w) * 1.15)), n = daten.length, schritt = (B - L - R) / Math.max(1, n - 1);
  const x = (i) => L + i * schritt, y = (v) => O + (H - O - U) * (1 - (v ?? 0) / m);
  const pkt = daten.map((d, i) => `${x(i).toFixed(1)},${y(d.wert).toFixed(1)}`).join(" "), jede = Math.ceil(n / 6);
  return `<svg class="dv" viewBox="0 0 ${B} ${H}" role="img" aria-label="${esc(titel)}">${achse(m, einheit)}<polyline class="dv-linie" points="${pkt}"/>
    ${daten.map((d, i) => `<g class="dv-punkt"><circle cx="${x(i)}" cy="${y(d.wert)}" r="${i === n - 1 ? 4 : 3}"/><rect x="${x(i) - schritt / 2}" y="${O}" width="${schritt}" height="${H - O - U}" fill="transparent"><title>${esc(d.label)}: ${fmt(d.wert, einheit)}</title></rect></g>${i % jede === 0 || i === n - 1 ? `<text class="dv-achse" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : ""}`).join("")}
    <text class="dv-wert" x="${x(n - 1) - 6}" y="${y(daten[n - 1]?.wert) - 8}" text-anchor="end">${fmt(daten[n - 1]?.wert, einheit)}</text></svg>`;
}
export function balken(daten, { serien = [{ k: "wert", name: "" }], einheit = "", max = null, titel = "" } = {}) {
  const alle = daten.flatMap((d) => serien.map((s) => d[s.k] ?? 0)), m = max ?? Math.max(4, Math.ceil(Math.max(...alle) * 1.15)), n = daten.length;
  const fach = (B - L - R) / n, bb = Math.min(22, (fach - 6) / serien.length - 2), y = (v) => O + (H - O - U) * (1 - (v ?? 0) / m);
  return `<svg class="dv" viewBox="0 0 ${B} ${H}" role="img" aria-label="${esc(titel)}">${achse(m, einheit)}${daten.map((d, i) => {
    const x0 = L + i * fach + (fach - serien.length * (bb + 2)) / 2;
    return serien.map((s, j) => { const v = d[s.k]; if (v == null) return ""; const yy = y(v), h = Math.max(0, H - U - yy);
      return `<g><rect class="dv-balken dv-s${j + 1}" x="${x0 + j * (bb + 2)}" y="${yy}" width="${bb}" height="${h}" rx="3"><title>${esc(d.label)}${s.name ? ` · ${esc(s.name)}` : ""}: ${fmt(v, einheit)}</title></rect>${serien.length > 1 && v ? `<text class="dv-klein" x="${x0 + j * (bb + 2) + bb / 2}" y="${yy - 3}" text-anchor="middle">${v}</text>` : ""}</g>`; }).join("")
      + `<text class="dv-achse" x="${L + i * fach + fach / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
  }).join("")}</svg>`;
}
// waagerechte Balken (Register), optional mit Soll-Strich
export function quer(daten, { einheit = "", max = null, titel = "" } = {}) {
  const m = max ?? Math.max(4, ...daten.map((d) => Math.max(d.wert ?? 0, d.soll ?? 0))), zh = 22, h = daten.length * zh + 8, links = 104, breit = B - links - 44;
  return `<svg class="dv" viewBox="0 0 ${B} ${h}" role="img" aria-label="${esc(titel)}">${daten.map((d, i) => { const y = 4 + i * zh, w = Math.max(2, (breit * (d.wert ?? 0)) / m);
    return `<text class="dv-achse" x="${links - 6}" y="${y + 14}" text-anchor="end">${esc(d.label)}</text><rect class="dv-balken dv-s1" x="${links}" y="${y + 3}" width="${w}" height="${zh - 8}" rx="3"><title>${esc(d.label)}: ${fmt(d.wert, einheit)}${d.soll ? ` (Soll ${d.soll})` : ""}</title></rect>
      ${d.soll ? `<line class="dv-soll" x1="${links + (breit * d.soll) / m}" x2="${links + (breit * d.soll) / m}" y1="${y}" y2="${y + zh - 2}"><title>Soll ${d.soll}</title></line>` : ""}<text class="dv-wert" x="${links + w + 5}" y="${y + 14}">${fmt(d.wert, einheit)}${d.soll ? `<tspan class="dv-klein"> / ${d.soll}</tspan>` : ""}</text>`; }).join("")}</svg>`;
}
const legende = (namen) => `<div class="dv-legende">${namen.map((n, i) => `<span><i class="dv-s${i + 1}"></i>${esc(n)}</span>`).join("")}</div>`;
// „Als Tabelle“ + CSV
const AWT = new Map();
function tabelle(id, kopfZ, zeilen, datei) {
  AWT.set(id, { kopfZ, zeilen, datei });
  return `<details class="dv-tabelle"><summary>📋 Als Tabelle</summary><table class="ad-tab"><thead><tr>${kopfZ.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${zeilen.map((z) => `<tr>${z.map((v) => `<td>${esc(v ?? "–")}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <button type="button" class="knopf klein" data-a="awCsv" data-x="${esc(id)}">⬇️ Als CSV (Excel)</button></details>`;
}
AKTIONEN.awCsv = (id) => { const t = AWT.get(id); if (t) herunterladen(`Bachkreis-${t.datei}-${new Date().toISOString().slice(0, 10)}.csv`, csv(t.kopfZ, t.zeilen), "text/csv"); };
const chips = (aktion, werte, an, txt) => `<div class="wahlen" role="group">${werte.map((w) => `<button type="button" class="chip-wahl${String(w) === String(an) ? " an" : ""}" aria-pressed="${String(w) === String(an)}" data-a="${aktion}" data-x="${esc(w)}">${esc(txt(w))}</button>`).join("")}</div>`;
const leer = (l) => !l.length || l.every((x) => !x.wert && !x.zu && !x.ab);
const karte = (sym, titel, frage, inhalt) => `<div class="karte aw-karte"><h3>${sym} ${esc(titel)}</h3><p class="hinweis">${esc(frage)}</p>${inhalt}</div>`;
const keineDaten = '<p class="hinweis">⚪ Noch keine Daten für diese Auswertung.</p>';

// ---------- Ansicht ----------
VIEWS.auswertungen = {
  render() {
    if (!hatRolle(...AW_ROLLEN)) return kopf("📈 Auswertungen") + '<div class="karte"><p>Für Leitung, Lehrkräfte und Vorstand.</p></div>';
    const orch = liste("gruppen", (g) => g.aktiv !== false && !g.ehemalige).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)); AW.gruppe ||= orch[0]?.id;
    const mv = ohneLeerAnfang(mitgliederVerlauf(db)), za = zuAbgaenge(db), pm = ohneLeerAnfang(probenbesuchMonate(db).map((x) => ({ ...x, wert: x.erfasst ? x.wert : null })));
    const pr = probenbesuchRegister(db, { von: new Date(Date.now() - AW.monate * 30.5 * 86400000) }), bs = besetzungRegister(db, AW.gruppe), lv = ohneLeerAnfang(leihVerlauf(db));
    const sj = schuljahrVon(), jetzt = za.find((x) => x.label === sj) || { zu: 0, ab: 0 }, pmLetzt = [...pm].reverse().find((x) => x.wert != null);
    const kenn = (sym, wert, t) => `<div class="zahl-karte"><span aria-hidden="true">${sym}</span><b>${esc(wert)}</b><small>${esc(t)}</small></div>`;
    return kopf("📈 Auswertungen") + `
      <div class="zahlen-raster aw-kenn">${kenn("👥", fmt(mv[mv.length - 1]?.wert), "Kinder & Jugendliche in einem Orchester")}${kenn("✅", fmt(pmLetzt?.wert, " %"), `Probenbesuch ${pmLetzt ? pmLetzt.label : ""}`)}${kenn("🔀", `+${jetzt.zu} / −${jetzt.ab}`, `Zu- / Abgänge ${sj}`)}${kenn("🎺", fmt(lv[lv.length - 1]?.wert), "Leihinstrumente verliehen")}</div>
      ${karte("👥", "Mitglieder im Verlauf", "Wie viele Kinder und Jugendliche sind am Monatsende in einem Orchester?", leer(mv) ? keineDaten : linie(mv, { titel: "Mitglieder je Monat" }) + tabelle("mitglieder", ["Monat", "Mitglieder"], mv.map((x) => [x.label, x.wert]), "Mitglieder"))}
      ${karte("🔀", "Zu- und Abgänge je Schuljahr", "Wie viele kommen neu dazu, wie viele hören auf? Vergleich der letzten fünf Schuljahre.", leer(za) ? keineDaten : legende(["Zugänge", "Abgänge"]) + balken(za, { serien: [{ k: "zu", name: "Zugänge" }, { k: "ab", name: "Abgänge" }], titel: "Zu- und Abgänge je Schuljahr" }) + tabelle("zuab", ["Schuljahr", "Zugänge", "Abgänge"], za.map((x) => [x.label, x.zu, x.ab]), "Zu-und-Abgaenge"))}
      ${karte("✅", "Probenbesuch je Monat", "Anteil „da“ und „verspätet“ an allen erfassten Anwesenheiten vergangener Termine.", !pm.some((x) => x.wert != null) ? '<p class="hinweis">⚪ Noch keine Anwesenheit erfasst (Termin › Anwesenheit).</p>' : balken(pm, { einheit: " %", max: 100, titel: "Probenbesuch je Monat" }) + tabelle("probenmonat", ["Monat", "Probenbesuch %", "erfasst"], pm.map((x) => [x.label, x.wert, x.erfasst]), "Probenbesuch-Monate"))}
      ${karte("🎻", "Probenbesuch je Register", "Wo fehlen am meisten? (nach Hauptinstrument)", chips("awMonate", [3, 6, 12], AW.monate, (m) => `${m} Monate`) + (pr.length ? quer(pr, { einheit: " %", max: 100, titel: "Probenbesuch je Register" }) + tabelle("probenregister", ["Register", "Probenbesuch %", "erfasst"], pr.map((x) => [x.label, x.wert, x.erfasst]), "Probenbesuch-Register") : keineDaten))}
      ${karte("🎼", "Besetzung je Register", "Ist (Balken) und Soll (Strich, aus den Orchester-Einstellungen) – wo braucht es Nachwuchs?", (orch.length > 1 ? chips("awGruppe", orch.map((g) => g.id), AW.gruppe, (id) => orch.find((g) => g.id === id)?.name || id) : "") + (bs.length ? quer(bs, { titel: "Besetzung je Register" }) + `<p class="hinweis">${bs.filter((x) => x.soll && x.wert < x.soll).map((x) => `🔻 ${esc(x.label)}: ${x.soll - x.wert} fehlen`).join(" · ") || "✅ Überall mindestens das Soll."}</p>` + tabelle("besetzung", ["Register", "Ist", "Soll"], bs.map((x) => [x.label, x.wert, x.soll]), "Besetzung") : keineDaten))}
      ${karte("🎺", "Leihinstrumente", "Wie viele Instrumente sind am Monatsende verliehen?", leer(lv) ? keineDaten : linie(lv, { titel: "Verliehene Instrumente je Monat" }) + tabelle("leih", ["Monat", "verliehen"], lv.map((x) => [x.label, x.wert]), "Leihinstrumente"))}
      ${hatRolle(...AW_NUTZUNG) ? nutzungKarte() : ""}
      <div class="karte"><h3>Mehr Zahlen</h3><div class="knopfreihe"><button type="button" class="knopf" data-a="oeffne" data-x="zahlen">📊 Bachkreis in Zahlen</button><button type="button" class="knopf" data-a="oeffne" data-x="jahresbericht">📊 Jahresbericht</button><button type="button" class="knopf" data-a="oeffne" data-x="nutzung">📈 So nutzen wir die App</button></div>
        <p class="hinweis">Gezählt wird nur, was du in der App sehen darfst – nur Zahlen, keine Inhalte aus Chats. Stand: jetzt.</p></div>`;
  },
  nach() { if (hatRolle(...AW_NUTZUNG) && istEchtbetrieb() && !AW.nutzung && !AW.laedt) nutzungLaden(); },
};
function nutzungKarte() {
  const alle = Object.values(KACHELN).flat().filter((k) => !k.nur || k.nur());
  const echt = istEchtbetrieb(), z = echt ? AW.nutzung?.zaehlung : geraetZaehlung(AW.tage), a = z ? kachelAuswertung(z, alle) : null, top = a?.genutzt.slice(0, 10) || [];
  return karte("🧭", "Welche Kacheln werden genutzt?", "Wie oft wurde welche Kachel geöffnet – anonym gezählt (nur Kachel und Tag, nie die Person). Hilft beim Aufräumen: was nie genutzt wird, kann weiter nach hinten.",
    chips("awTage", [7, 30, 90], AW.tage, (t) => `${t} Tage`) + (!z ? `<p class="hinweis">${AW.laedt ? "⏳ wird geladen …" : "⚪ nicht messbar (keine Verbindung)"}</p>`
      : `${echt ? "" : '<p class="hinweis">🧪 Vorführversion: nur die Zählung dieses Geräts.</p>'}${top.length ? quer(top.map((x) => ({ label: `${x.k.sym} ${typeof x.k.t === "function" ? x.k.t() : x.k.t}`.slice(0, 22), wert: x.n })), { titel: "Meistgenutzte Kacheln" }) : '<p class="hinweis">⚪ Im Zeitraum noch nichts gezählt.</p>'}
        ${a.nie.length ? `<details class="dv-tabelle"><summary>💤 Nie geöffnet (${a.nie.length})</summary><p>${a.nie.map((k) => `${k.sym} ${esc(typeof k.t === "function" ? k.t() : k.t)}`).join(" · ")}</p></details>` : ""}
        ${tabelle("kacheln", ["Kachel", "geöffnet"], (a?.genutzt || []).map((x) => [typeof x.k.t === "function" ? x.k.t() : x.k.t, x.n]), "Kachel-Nutzung")}`));
}
async function nutzungLaden() {
  AW.laedt = true;
  try { const r = await serverAktion("kachel_nutzung_lesen", { tage: AW.tage }); AW.nutzung = r?.ok ? r : { zaehlung: null }; } catch { AW.nutzung = { zaehlung: null }; }
  AW.laedt = false; zeichne();
}
AKTIONEN.awMonate = (m) => { AW.monate = Number(m); zeichne(); };
AKTIONEN.awGruppe = (g) => { AW.gruppe = g; zeichne(); };
AKTIONEN.awTage = (t) => { AW.tage = Number(t); AW.nutzung = null; zeichne(); };
