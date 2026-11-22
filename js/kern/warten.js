// Warte-Anzeige wie in der KC Club App (KC-CLUB-WARTEN / KC-CLUB-MUETZE-SINCE): das Bachkreis-Logo dreht sich,
// auf der Rückseite steht „since 1969“. Erscheint erst nach 350 ms (kurze Vorgänge flackern nicht) und nur, wenn die
// Person gerade selbst etwas angetippt hat – Abgleiche im Hintergrund laufen unsichtbar. Läuft ohne DOM (Tests) still mit.
const TIPP_MS = 4000, VERZOEGERUNG_MS = 350, LANG_MS = 12000;
let zahl = 0, timer = null, langTimer = null, tippZeit = 0;
const hatDom = typeof document !== "undefined";
if (hatDom) addEventListener("pointerdown", () => { tippZeit = Date.now(); }, true);

export const WARTE_LOGO = `<div class="warte-logo" aria-hidden="true"><img src="icons/logo.png" alt="" width="64" height="64"></div>`;
// ⏳ 0.45.0 Warte-Bilder mit Musik-Motiven (wie KC „⏳ Warte-Bild“ mit Küchen-Motiven): weiße Strichgrafik im Bachkreis-Kreis, ruhige Bewegung, passender Text
const K = (inhalt) => `<div class="warte-bild" aria-hidden="true"><svg viewBox="0 0 80 80" width="72" height="72"><circle cx="40" cy="40" r="38" class="wb-kreis"/>${inhalt}</svg></div>`;
export const WARTE_BILDER = {
  logo: { t: "🎼 Bachkreis-Logo", text: null, html: () => WARTE_LOGO },
  geige: { t: "🎻 Geige streicht", text: "Wird gestimmt …", html: () => K(`<g class="wb-strich"><path d="M33 22 q-8 2 -6 10 q-6 4 -3 12 q2 8 12 8 q10 0 12 -8 q3 -8 -3 -12 q2 -8 -6 -10 Z"/><path d="M40 22 V12 M37 13 h6"/><path d="M36 38 h8 M36 46 h8"/></g><path class="wb-strich wb-bogen" d="M14 56 L66 36"/>`) },
  metronom: { t: "⏱️ Metronom tickt", text: "Im Takt …", html: () => K(`<g class="wb-strich"><path d="M28 62 L36 16 h8 L52 62 Z"/><path d="M26 62 h28"/></g><g class="wb-pendel"><path class="wb-strich" d="M40 56 V22"/><rect x="36" y="28" width="8" height="6" rx="1" class="wb-voll"/></g>`) },
  noten: { t: "🎵 Noten hüpfen", text: "Einen Takt Geduld …", html: () => K(`<g class="wb-strich"><path d="M14 30 h52 M14 37 h52 M14 44 h52 M14 51 h52 M14 58 h52"/></g>${[[24, 0], [38, 1], [52, 2]].map(([x, i]) => `<g class="wb-note" style="animation-delay:${i * 0.2}s"><ellipse cx="${x}" cy="48" rx="4.5" ry="3.4" class="wb-voll"/><path class="wb-strich" d="M${x + 4} 47 V30"/></g>`).join("")}`) },
  taktstock: { t: "🪄 Taktstock dirigiert", text: "Gleich geht's los …", html: () => K(`<path class="wb-strich wb-spur" d="M40 22 L40 56 L24 44 L56 44 L40 22"/><circle r="3.4" class="wb-voll wb-spitze"><animateMotion dur="1.8s" repeatCount="indefinite" path="M40 22 L40 56 L24 44 L56 44 L40 22"/></circle>`) },
  trommel: { t: "🥁 Trommelwirbel", text: "Trommelwirbel …", html: () => K(`<g class="wb-strich"><ellipse cx="40" cy="44" rx="20" ry="7"/><path d="M20 44 v12 q20 10 40 0 v-12"/></g><path class="wb-strich wb-stock1" d="M26 18 L38 40"/><path class="wb-strich wb-stock2" d="M54 18 L42 40"/>`) },
  harfe: { t: "🎶 Notenschlüssel dreht", text: "Einen Moment …", html: () => K(`<text x="40" y="54" text-anchor="middle" class="wb-schluessel">𝄞</text>`) },
};
export const WARTE_WAHL = [...Object.entries(WARTE_BILDER).map(([k, v]) => [k, v.t]), ["wechsel", "🔀 Abwechselnd"], ["taeglich", "📅 Jeden Tag ein anderes"]];
function bildWahl() {
  let w = "logo"; try { w = JSON.parse(localStorage.getItem("bk_einstellungen") || "{}").warteBild || "logo"; } catch {}
  const k = Object.keys(WARTE_BILDER);
  if (w === "wechsel") return k[Math.floor(Math.random() * k.length)];
  if (w === "taeglich") return k[Math.floor(Date.now() / 86400000) % k.length];
  return WARTE_BILDER[w] ? w : "logo";
}
export const warteBildHtml = (k) => (WARTE_BILDER[k] || WARTE_BILDER.logo).html();

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
  // 🐌 0.51.0 (wie KC-CLUB-LADE-SICHERHEIT): nach 12 s ehrlich sagen, dass es dauert – und nicht festhalten: „Nicht mehr warten“ schließt die Anzeige,
  // die Sache läuft im Hintergrund weiter (Gespeichertes geht über die Sende-Schlange raus, sobald das Netz wieder da ist)
  if (!langTimer) langTimer = setTimeout(() => { if (!zahl) return; const w = element(); w.querySelector("b").textContent = "🐌 Laden dauert zu lange – das Netz ist gerade langsam.";
    if (!w.querySelector(".warten-weg")) w.insertAdjacentHTML("beforeend", '<p class="warten-unter">Was du gespeichert hast, geht von selbst raus, sobald das Netz wieder da ist.</p><button type="button" class="knopf warten-weg">✕ Nicht mehr warten</button>');
    w.querySelector(".warten-weg").onclick = () => wartenWeg(); }, LANG_MS);
  if (!timer) timer = setTimeout(() => {
    const w = element(), k = bildWahl(), alt = w.firstElementChild; // jedes Mal das gewählte (oder ein abwechselndes) Bild
    if (alt && w.dataset.bild !== k) { alt.outerHTML = warteBildHtml(k); w.dataset.bild = k; }
    w.querySelector("b").textContent = text === "Einen Moment …" && WARTE_BILDER[k].text ? WARTE_BILDER[k].text : text;
    w.classList.remove("versteckt"); requestAnimationFrame(() => w.classList.add("an"));
  }, VERZOEGERUNG_MS);
  return true;
}

// ✕ Anzeige schließen, ohne den Vorgang abzubrechen
export function wartenWeg() {
  zahl = 0; clearTimeout(timer); timer = null; clearTimeout(langTimer); langTimer = null;
  const w = hatDom && document.getElementById("warten"); if (!w) return;
  w.querySelectorAll(".warten-unter, .warten-weg").forEach((e) => e.remove()); w.classList.remove("an"); w.classList.add("versteckt");
}
export function wartenEnde() {
  zahl = Math.max(0, zahl - 1); if (zahl) return;
  clearTimeout(timer); timer = null; clearTimeout(langTimer); langTimer = null;
  const w = hatDom && document.getElementById("warten"); if (!w) return;
  w.querySelectorAll(".warten-unter, .warten-weg").forEach((e) => e.remove());
  w.classList.remove("an"); setTimeout(() => { if (!zahl) w.classList.add("versteckt"); }, 200);
}

export async function mitWarten(fn, text, erzwingen = false) {
  const an = wartenStart(text, erzwingen);
  try { return await fn(); } finally { if (an) wartenEnde(); }
}
