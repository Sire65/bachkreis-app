// 📡 Verbindungs-Symbol oben links in 💬 Nachrichten (wie in der KC Club App): blinkender Router im WLAN, blinkender Satellit im Mobilfunk.
// Die Wellen zeigen die Qualität (grün gut, gelb mäßig, rot schwach, grau unbekannt, ✕ keine Verbindung). Antippen → Blatt mit Netzart,
// Qualität und Messwerten, „📏 Jetzt messen“. ⚙️ › 💬 Nachrichten: Symbol an/aus · ⚙️ › ✨ Effekte: Blinken an/aus.
import { esc, AKTIONEN, blatt } from "../kern/ui.js";
import { einst } from "./zustand.js";
import { NETZ, netzArt, netzQualitaet, netzMessung, netzAbonnieren } from "../kern/netz.js";

const NAME = { wlan: "📶 WLAN", mobil: "🛰️ Mobilfunk" };
const gewaehlt = () => { try { return localStorage.getItem("bk_netzart"); } catch { return null; } };
const blinkt = (q) => einst().netzBlinken !== false && einst().effekte !== false && q.stufe !== 0;
export function netzSvg(art, stufe, farbe) {
  const f = { gruen: "#2e9d5b", gelb: "#d9a21b", rot: "#d0453f", grau: "#9aa0a6" }[farbe] || "#9aa0a6", aus = "rgba(128,128,128,.25)";
  const w = (n) => (stufe == null || stufe >= n ? f : aus), led = stufe === 0 ? "#d0453f" : f;
  const wellen = (x, y, dreh) => `<g transform="translate(${x} ${y}) rotate(${dreh})" fill="none" stroke-linecap="round" stroke-width="2.2"><path class="nz-w nz-w1" d="M-2.8 -2.8 A4 4 0 0 1 2.8 -2.8" stroke="${w(1)}"/><path class="nz-w nz-w2" d="M-5.6 -5.6 A8 8 0 0 1 5.6 -5.6" stroke="${w(2)}"/><path class="nz-w nz-w3" d="M-8.5 -8.5 A12 12 0 0 1 8.5 -8.5" stroke="${w(3)}"/></g>`;
  const kreuz = stufe === 0 ? `<g stroke="#d0453f" stroke-width="2.6" stroke-linecap="round"><path d="M28 3 L37 12 M37 3 L28 12"/></g>` : "";
  if (art === "mobil") return `<svg viewBox="0 0 40 32" class="nz-svg" aria-hidden="true">
    <g transform="rotate(-35 16 19)"><rect x="1" y="15" width="9" height="8" rx="1" fill="#3f6fb5"/><rect x="22" y="15" width="9" height="8" rx="1" fill="#3f6fb5"/>
    <path d="M1 19 H10 M22 19 H31 M5.5 15 V23 M26.5 15 V23" stroke="#a9c4ef" stroke-width=".8"/><rect x="10" y="18.2" width="12" height="1.6" fill="#78909c"/>
    <rect x="12.5" y="14.5" width="7" height="9" rx="1.6" fill="#b0bec5" stroke="#546e7a" stroke-width="1"/><circle class="nz-led" cx="16" cy="17" r="1.3" fill="${led}"/></g>
    <path d="M19 12 Q22 9 25 12" fill="none" stroke="#78909c" stroke-width="1.6"/>${wellen(27, 11, 45)}${kreuz}</svg>`;
  if (art === "wlan") return `<svg viewBox="0 0 40 32" class="nz-svg" aria-hidden="true">
    <path d="M11 21 L8.5 9 M29 21 L31.5 9" stroke="#546e7a" stroke-width="2" stroke-linecap="round"/>
    <rect x="5" y="20" width="30" height="9" rx="2.6" fill="#546e7a"/><rect x="5" y="20" width="30" height="3" rx="1.5" fill="#78909c"/>
    <circle class="nz-led nz-l1" cx="12" cy="25.3" r="1.5" fill="${led}"/><circle class="nz-led nz-l2" cx="17" cy="25.3" r="1.5" fill="${led}"/><circle class="nz-led nz-l3" cx="22" cy="25.3" r="1.5" fill="${led}"/><circle cx="29" cy="25.3" r="1" fill="#cfd8dc"/>
    ${wellen(20, 17, 0)}${kreuz}</svg>`;
  return `<svg viewBox="0 0 40 32" class="nz-svg" aria-hidden="true"><circle cx="20" cy="17" r="11" fill="none" stroke="${f}" stroke-width="2"/><path d="M9 17 H31 M20 6 Q13 17 20 28 Q27 17 20 6" fill="none" stroke="${f}" stroke-width="1.5"/>
    <circle class="nz-led" cx="33" cy="7" r="2" fill="${led}"/>${kreuz}</svg>`;
}

function titel(art, quelle, q) { return `${art ? NAME[art] + (quelle === "gewaehlt" ? " (von dir gewählt)" : "") : "Netzart unbekannt"} · ${q.text} – antippen für Infos`; }
export function netzSymbolHtml() {
  if (einst().netzSymbol === false) return "";
  const { art, quelle } = netzArt(gewaehlt()), q = netzQualitaet(), t = esc(titel(art, quelle, q));
  return `<button type="button" class="na-netz${blinkt(q) ? " nz-blink" : ""}" id="naNetz" data-a="netzInfo" title="${t}" aria-label="${t}" data-schl="${[art, q.stufe, q.farbe].join("|")}">${netzSvg(art, q.stufe, q.farbe)}</button>`;
}
// im Platz auffrischen (ohne die ganze Seite neu zu zeichnen; Animation läuft nur bei Änderung neu an)
export function netzSymbolAuffrischen() {
  const b = document.getElementById("naNetz"); if (!b) return;
  const { art, quelle } = netzArt(gewaehlt()), q = netzQualitaet(), schl = [art, q.stufe, q.farbe].join("|");
  b.classList.toggle("nz-blink", blinkt(q)); b.title = titel(art, quelle, q); b.setAttribute("aria-label", b.title);
  if (b.dataset.schl !== schl) { b.dataset.schl = schl; b.innerHTML = netzSvg(art, q.stufe, q.farbe); }
  if (document.getElementById("netzBlatt")) netzBlattFuellen();
}
function netzBlattFuellen() {
  const el = document.getElementById("netzBlatt"); if (!el) return;
  const { art, quelle } = netzArt(gewaehlt()), q = netzQualitaet(), c = navigator.connection, m = NETZ.messung;
  const zeit = (t) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const z = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  el.innerHTML = `<div class="nz-gross${blinkt(q) ? " nz-blink" : ""}">${netzSvg(art, q.stufe, q.farbe)}</div>
    <p class="nz-mitte"><b>${art ? NAME[art] : "🌐 Netzart unbekannt"}</b><br><small class="hinweis">${quelle === "erkannt" ? "vom Handy erkannt" : quelle === "gewaehlt" ? "von dir gewählt – das Handy verrät die Netzart nicht" : "Das Handy verrät die Netzart nicht (iPhone nie). Wähle sie selbst:"}</small></p>
    ${quelle !== "erkannt" ? `<div class="knopfreihe nz-mitte"><button type="button" class="knopf klein${art === "wlan" ? " haupt" : ""}" data-a="netzWahl" data-x="wlan">📶 Ich bin im WLAN</button><button type="button" class="knopf klein${art === "mobil" ? " haupt" : ""}" data-a="netzWahl" data-x="mobil">🛰️ Mobilfunk</button></div>` : ""}
    <p class="nz-mitte"><span class="nz-balken s${q.stufe ?? "x"} ${q.farbe}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>Verbindungsqualität: ${esc(q.text)}</b></p>
    <table class="nz-tabelle">
      ${z("Handy", navigator.onLine ? "online" : "offline")}
      ${z("Antwortzeit", q.ms != null ? `Ø ${q.ms.toLocaleString("de-DE")} ms (letzte ${Math.min(5, NETZ.zeiten.length)} Anfragen)` : "–")}
      ${m ? z("Gemessen", m.laeuft ? "⏳ misst …" : m.fehler ? "❌ " + esc(m.fehler) : `${m.ping} ms · ${zeit(m.zeit)} Uhr`) : ""}
      ${z("Letzte Antwort", NETZ.letzteOk ? zeit(NETZ.letzteOk) + " Uhr" : "–")}
      ${z("Tempo-Klasse (Handy)", c?.effectiveType ? esc(String(c.effectiveType).toUpperCase()) : "unbekannt")}
      ${z("Datentempo laut Handy", c?.downlink ? `ca. ${c.downlink.toLocaleString("de-DE")} Mbit/s` : "unbekannt")}
      ${z("Antwortzeit laut Handy", c?.rtt ? `ca. ${c.rtt} ms` : "unbekannt")}
      ${c?.saveData ? z("Datensparmodus", "an") : ""}
      ${z("Anfragen / Fehler", `${NETZ.anfragen} / ${NETZ.fehler}`)}
    </table>
    <button type="button" class="knopf breit" data-a="netzMessen" ${m?.laeuft ? "disabled" : ""}>📏 Jetzt messen</button>
    <p class="hinweis" style="font-size:.8rem">Wellen: 4 = sehr gut (bis 0,4 s) · 3 = gut (bis 1 s) · 2 = mäßig (bis 2,5 s) · 1 = schwach · grau = noch unbekannt · ✕ = keine Verbindung. Symbol: ⚙️ › 💬 Nachrichten · Blinken: ⚙️ › ✨ Effekte.</p>`;
}
AKTIONEN.netzInfo = () => { blatt("📡 Verbindung", '<div id="netzBlatt" class="nz-blatt"></div>'); netzBlattFuellen(); };
AKTIONEN.netzWahl = (n) => { try { localStorage.setItem("bk_netzart", n); } catch {} netzSymbolAuffrischen(); };
// „Jetzt messen“: 3× die kleine version.json der App ohne Zwischenspeicher – misst die echte Leitung, auch in der Vorführversion
AKTIONEN.netzMessen = async () => {
  if (NETZ.messung?.laeuft) return;
  NETZ.messung = { laeuft: true }; netzBlattFuellen();
  try {
    const zeiten = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now(), r = await fetch(`version.json?netz=${Date.now()}`, { cache: "no-store" });
      await r.text(); if (!r.ok) throw new Error("Antwort " + r.status);
      const ms = performance.now() - t0; zeiten.push(ms); netzMessung(ms, true);
    }
    NETZ.messung = { ping: Math.round(Math.min(...zeiten)), zeit: Date.now() };
  } catch (e) { netzMessung(0, false, e.message); NETZ.messung = { fehler: e.message || "keine Antwort", zeit: Date.now() }; }
  netzSymbolAuffrischen();
};
netzAbonnieren(netzSymbolAuffrischen);
try { navigator.connection?.addEventListener?.("change", netzSymbolAuffrischen); } catch {}
addEventListener("online", netzSymbolAuffrischen); addEventListener("offline", netzSymbolAuffrischen);
setInterval(netzSymbolAuffrischen, 30000);
