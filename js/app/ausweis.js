// 🪪 Mein Ausweis (0.61.0, wie KC-CLUB-AUSWEIS-QR): rechts über den Kacheln der QR-Knopf – antippen zeigt den persönlichen Ausweis
// mit QR-Code (Person + Prüfcode vom Server, nicht fälschbar), Name, Art und Gruppe. Zum Vorzeigen bei Konzert, Fahrt oder
// Instrumenten-Ausgabe. QR immer schwarz auf weiß (auch im Dunkel-Design), damit jeder Scanner ihn liest.
// Der Ausweis wird auf dem Gerät gemerkt – er geht auch ohne Netz. Wird nur bei Bedarf geladen (teile-karte).
import { S, db, name } from "./zustand.js";
import { esc, AKTIONEN, blatt } from "../kern/ui.js";
import { hole, serverAktionStill, istEchtbetrieb, konfig } from "../kern/daten.js";
import { PERSONEN_TYPEN } from "../kern/schema.js";
import { wirksameGruppen } from "../kern/logik.js";

const SPEICHER = () => "bk_ausweis_" + (S.ich?.id || "");
function qrLaden() {
  if (typeof globalThis.qrcode === "function") return Promise.resolve();
  return new Promise((ok, nein) => { const s = document.createElement("script"); s.src = "lib/qrcode/qrcode.js"; s.onload = ok; s.onerror = () => nein(new Error("QR-Programm fehlt")); document.head.appendChild(s); });
}
function qrSvg(text) {
  const q = globalThis.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
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
  <p class="hinweis ausweis-hinweis">Zum Vorzeigen bei Konzert, Fahrt oder Instrumenten-Ausgabe. Persönlich – nicht weitergeben.${frisch ? "" : " ⏳ wird aktualisiert …"}</p>`;
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
