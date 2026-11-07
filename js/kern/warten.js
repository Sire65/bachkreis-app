// Warte-Anzeige wie in der KC Club App (KC-CLUB-WARTEN / KC-CLUB-MUETZE-SINCE): das Bachkreis-Logo dreht sich,
// auf der Rückseite steht „since 1969“. Erscheint erst nach 350 ms (kurze Vorgänge flackern nicht) und nur, wenn die
// Person gerade selbst etwas angetippt hat – Abgleiche im Hintergrund laufen unsichtbar. Läuft ohne DOM (Tests) still mit.
const TIPP_MS = 4000, VERZOEGERUNG_MS = 350, LANG_MS = 20000;
let zahl = 0, timer = null, langTimer = null, tippZeit = 0;
const hatDom = typeof document !== "undefined";
if (hatDom) addEventListener("pointerdown", () => { tippZeit = Date.now(); }, true);

export const WARTE_LOGO = `<div class="warte-logo" aria-hidden="true"><img src="icons/logo.png" alt="" width="64" height="64"></div>`;

function element() {
  let w = document.getElementById("warten");
  if (!w) {
    w = document.createElement("div"); w.id = "warten"; w.className = "warten versteckt"; w.setAttribute("role", "status"); w.setAttribute("aria-live", "polite");
    w.innerHTML = `${WARTE_LOGO}<b id="wartenText">Einen Moment …</b>`;
    document.body.appendChild(w);
  }
  return w;
}

// erzwingen: auch ohne vorheriges Antippen zeigen (z. B. Anmelden per Enter-Taste)
export function wartenStart(text = "Einen Moment …", erzwingen = false) {
  if (!hatDom || (!erzwingen && Date.now() - tippZeit > TIPP_MS)) return false;
  zahl++;
  if (!langTimer) langTimer = setTimeout(() => { if (zahl) element().querySelector("b").textContent = "🐌 Dauert länger als üblich … (Netz langsam?)"; }, LANG_MS);
  if (!timer) timer = setTimeout(() => {
    const w = element(); w.querySelector("b").textContent = text;
    w.classList.remove("versteckt"); requestAnimationFrame(() => w.classList.add("an"));
  }, VERZOEGERUNG_MS);
  return true;
}

export function wartenEnde() {
  zahl = Math.max(0, zahl - 1); if (zahl) return;
  clearTimeout(timer); timer = null; clearTimeout(langTimer); langTimer = null;
  const w = hatDom && document.getElementById("warten"); if (!w) return;
  w.classList.remove("an"); setTimeout(() => { if (!zahl) w.classList.add("versteckt"); }, 200);
}

export async function mitWarten(fn, text, erzwingen = false) {
  const an = wartenStart(text, erzwingen);
  try { return await fn(); } finally { if (an) wartenEnde(); }
}
