// 🪪 Mein Ausweis (0.61.0, wie KC-CLUB-AUSWEIS-QR): rechts über den Kacheln der QR-Knopf – antippen zeigt den persönlichen Ausweis
// mit QR-Code (Person + Prüfcode vom Server, nicht fälschbar), Name, Art und Gruppe. Zum Vorzeigen bei Konzert, Fahrt oder
// Instrumenten-Ausgabe. QR immer schwarz auf weiß (auch im Dunkel-Design), damit jeder Scanner ihn liest.
// Der Ausweis wird auf dem Gerät gemerkt – er geht auch ohne Netz. Wird nur bei Bedarf geladen (teile-karte).
import { S, db, name, VIEWS, kopf, hatRolle } from "./zustand.js";
import { gesicht } from "./gesichter.js";
import { esc, AKTIONEN, blatt } from "../kern/ui.js";
import { hole, serverAktionStill, istEchtbetrieb, konfig } from "../kern/daten.js";
import { PERSONEN_TYPEN } from "../kern/schema.js";
import { wirksameGruppen } from "../kern/logik.js";
import { qrLeserStart, qrLeserStopp, qrLeserLaeuft, qrLeserVergessen, qrcodeLaden, qrSvg } from "../kern/qrleser.js";

const SPEICHER = () => "bk_ausweis_" + (S.ich?.id || "");
const qrLaden = qrcodeLaden;
function ausweisHtml(a, frisch) {
  const p = S.ich, gruppen = wirksameGruppen(db, p.id).map((g) => hole("gruppen", g)).filter(Boolean).map((g) => g.name).join(", ");
  return `<div class="ausweis-karte">
    <div class="ausweis-kopf"><img src="icons/logo.png" alt="" width="34" height="34"><span>${esc(konfig().name || "Bachkreis Bergkamen")}</span></div>
    <div class="ausweis-qr" role="img" aria-label="QR-Code meines Ausweises">${a ? a.svg : '<p class="hinweis">QR-Code nicht verfügbar</p>'}</div>
    <div class="ausweis-name">${esc(name(p))}</div>
    <div class="ausweis-art">${esc(PERSONEN_TYPEN[p.typ] || "")}${gruppen ? " · " + esc(gruppen) : ""}</div>
    ${a?.nummer ? `<div class="ausweis-nr">Nr. ${esc(a.nummer)}</div>` : ""}
    ${a?.demo ? '<div class="ausweis-demo">🧪 Vorführversion – nur zum Ansehen</div>' : ""}
  </div>
  <p class="hinweis ausweis-hinweis">Zum Vorzeigen bei Konzert, Fahrt oder Instrumenten-Ausgabe. Persönlich – nicht weitergeben.${frisch ? "" : " ⏳ wird aktualisiert …"}</p>
  ${hatRolle(...AUSWEIS_PRUEFER) ? '<div class="knopfreihe"><button type="button" class="knopf breit" data-a="kachel" data-x="ausweispruefen">🔍 Ausweis eines anderen prüfen</button></div>' : ""}`;
}
AKTIONEN.ausweisZeigen = async () => {
  let alt = null; try { alt = JSON.parse(localStorage.getItem(SPEICHER()) || "null"); } catch {}
  blatt("🪪 Mein Ausweis", `<div id="ausweisInhalt">${alt ? ausweisHtml(alt, false) : '<p class="hinweis">⏳ Ausweis wird geladen …</p>'}</div>`);
  const fuellen = (html) => { const f = document.getElementById("ausweisInhalt"); if (f) f.innerHTML = html; };
  try {
    await qrLaden();
    let a;
    if (!istEchtbetrieb()) a = { inhalt: `BK1:${S.ich.id}:DEMO`, nummer: "DEMO-0000", demo: true };
    else {
      const r = await serverAktionStill("mein_ausweis");
      if (!r?.ok) { if (!alt) fuellen(`<p class="hinweis">${r?.fehler === "AUSWEIS_NICHT_EINGERICHTET" ? "Der Ausweis ist auf dem Server noch nicht eingerichtet – bitte die Leitung fragen." : "Gerade keine Verbindung – bitte später noch einmal."}</p>`); else fuellen(ausweisHtml(alt, true)); return; }
      a = { inhalt: r.inhalt, nummer: r.nummer };
    }
    a.svg = alt?.inhalt === a.inhalt ? alt.svg : qrSvg(a.inhalt);
    try { localStorage.setItem(SPEICHER(), JSON.stringify(a)); } catch {}
    fuellen(ausweisHtml(a, true));
  } catch (e) { if (!alt) fuellen(`<p class="hinweis">Ausweis konnte nicht angezeigt werden: ${esc(e.message || e)}</p>`); }
};

// ---------- 🔍 Ausweis prüfen (0.62.0): Kamera auf den QR-Code – Leitung, Lehrkräfte, Vorstand ----------
// Liest den QR mit dem eingebauten Leser des Browsers (Android/Chrome) oder mit jsQR (iPhone u. a., lib/jsqr, nur hier geladen).
// Prüft beim Server (Prüfcode) und zeigt groß ✅ mit Name, Art und Gesicht – oder ❌. Das Kamerabild verlässt das Gerät nie.
export const AUSWEIS_PRUEFER = ["admin", "leitung", "lehrkraft", "vorstand"];
const SC = { ergebnis: null };
async function pruefen(inhalt) {
  const [kopf, pid, code] = String(inhalt).split(":");
  if (kopf !== "BK1") return { gueltig: false, grund: "Das ist kein Bachkreis-Ausweis." };
  if (!istEchtbetrieb()) { const p = hole("personen", pid); return { gueltig: !!p && code === "DEMO", person: p && { id: p.id, name: name(p), typ: p.typ }, demo: true }; }
  const r = await serverAktionStill("ausweis_pruefen", { inhalt });
  if (!r?.ok) return { gueltig: false, grund: r?.fehler === "AUSWEIS_NICHT_EINGERICHTET" ? "Der Ausweis ist auf dem Server noch nicht eingerichtet." : "Keine Verbindung – bitte gleich noch einmal." };
  return { gueltig: !!r.gueltig, person: r.person };
}
function ergebnisHtml(e) {
  if (!e) return '<p class="hinweis ap-tipp">Halte den QR-Code des Ausweises in den Rahmen.</p>';
  const p = e.person;
  return e.gueltig ? `<div class="ap-ergebnis ok" role="status"><div class="ap-zeichen">✅</div>${p ? `<span class="ap-gesicht">${gesicht(p.id, p.name)}</span><b>${esc(p.name)}</b><span>${esc(PERSONEN_TYPEN[p.typ] || "")}${p.status === "ausgetreten" ? " · ausgetreten" : ""}</span>` : ""}${e.demo ? '<small>🧪 Vorführversion</small>' : ""}</div>`
    : `<div class="ap-ergebnis nein" role="alert"><div class="ap-zeichen">❌</div><b>Nicht gültig</b><span>${esc(e.grund || "Der Ausweis ist gefälscht, abgelaufen oder gehört nicht zum Bachkreis.")}</span></div>`;
}
VIEWS.ausweispruefen = {
  render: () => kopf("🔍 Ausweis prüfen") + (!hatRolle(...AUSWEIS_PRUEFER) ? '<div class="karte"><p>Ausweise prüfen Leitung, Lehrkräfte und Vorstand.</p></div>' : `
    <div class="karte ap-karte"><div class="ap-video"><video id="apVideo" playsinline muted aria-label="Kamerabild"></video><span class="ap-rahmen" aria-hidden="true"></span></div>
    <div id="apErgebnis" aria-live="polite">${ergebnisHtml(SC.ergebnis)}</div>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="apStart">📷 Kamera starten</button><button type="button" class="knopf" data-a="apWeiter">🔄 Nächsten prüfen</button></div>
    <p class="hinweis">Für Abendkasse, Abfahrt einer Fahrt oder Instrumenten-Ausgabe. Das Kamerabild bleibt auf diesem Gerät.</p></div>`),
  nach: () => { if (hatRolle(...AUSWEIS_PRUEFER)) AKTIONEN.apStart(); },
};
document.addEventListener("bk-ansicht", () => { if (S.view !== "ausweispruefen" && S.view !== "inventur") qrLeserStopp(); });
AKTIONEN.apWeiter = () => { SC.ergebnis = null; qrLeserVergessen(); const e = document.getElementById("apErgebnis"); if (e) e.innerHTML = ergebnisHtml(null); if (!qrLeserLaeuft()) AKTIONEN.apStart(); };
AKTIONEN.apStart = async () => {
  const fehler = await qrLeserStart(document.getElementById("apVideo"), async (text) => {
    SC.ergebnis = await pruefen(text);
    const e = document.getElementById("apErgebnis"); if (e) e.innerHTML = ergebnisHtml(SC.ergebnis);
    try { navigator.vibrate?.(SC.ergebnis.gueltig ? 60 : [80, 60, 80]); } catch {}
  });
  if (fehler) { const e = document.getElementById("apErgebnis"); if (e) e.innerHTML = ergebnisHtml({ gueltig: false, grund: fehler }); }
};
