// 🐞 Marienkäfer und 🍀 Glücksklee (0.42.0, wie KC-CLUB-MARIENKAEFER / KC-CLUB-GLUECKSKLEE): kleine Überraschungen für die Kinder (und alle anderen).
// 🐞 jeder 50. Start: krabbelt von links unten über die Startseite zur Mitte, bleibt stehen, dreht sich um, schaut lächelnd und blinzelt, krabbelt weiter.
// 🍀 jeder 25. Start: ein Windstoß pustet ein vierblättriges Kleeblatt von oben ins Bild, es bleibt kurz liegen und wird fortgeweht.
// Antippen: ein musikalischer Glücksspruch. Immer nur eine Überraschung (Käfer vor Klee vor Fee). Nur auf der Startseite, nicht ohne Effekte,
// nicht bei „weniger Bewegung“. Abschaltbar in ⚙️ Einstellungen › ✨ Effekte. Nichts wird gespeichert außer dem Start-Zähler auf dem Gerät.
import { S } from "./zustand.js";
import { toast } from "../kern/ui.js";
import { fxAn } from "./effekte.js";
import { SPRUECHE_KAEFER, SPRUECHE_KLEE, zufall } from "../kern/glueck.js";
export { ueberraschung } from "../kern/glueck.js";

const darf = (vorschau) => vorschau || (fxAn() && !matchMedia?.("(prefers-reduced-motion: reduce)").matches && S.view === "start" && !document.getElementById("blattHg"));

const KAEFER_OBEN = `<svg viewBox="0 0 60 70" width="54" height="63" aria-hidden="true"><g class="bein">${[18, 32, 46].map((y) => `<path d="M14 ${y} l-10 -4 M46 ${y} l10 -4" stroke="#222" stroke-width="3" stroke-linecap="round"/>`).join("")}</g>
  <path d="M24 10 q-4 -8 -10 -8 M36 10 q4 -8 10 -8" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="14" rx="11" ry="8" fill="#222"/>
  <ellipse cx="30" cy="40" rx="22" ry="26" fill="#d62828"/><path d="M30 16 V66" stroke="#222" stroke-width="2.5"/>${[[20, 30], [40, 30], [18, 48], [42, 48], [26, 58], [34, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#222"/>`).join("")}</svg>`;
const KAEFER_VORN = `<svg viewBox="0 0 70 60" width="66" height="57" aria-hidden="true"><ellipse cx="35" cy="40" rx="26" ry="20" fill="#d62828"/>${[[20, 40], [50, 40], [35, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#222"/>`).join("")}
  <circle cx="35" cy="22" r="16" fill="#222"/><g class="augen"><circle cx="29" cy="20" r="4.5" fill="#fff"/><circle cx="41" cy="20" r="4.5" fill="#fff"/><circle cx="30" cy="21" r="2" fill="#111"/><circle cx="42" cy="21" r="2" fill="#111"/></g>
  <circle cx="25" cy="27" r="2.6" fill="#ff8a9a" opacity=".8"/><circle cx="45" cy="27" r="2.6" fill="#ff8a9a" opacity=".8"/><path d="M29 28 q6 5 12 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M28 8 q-5 -7 -11 -6 M42 8 q5 -7 11 -6" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
const KLEE = `<svg viewBox="0 0 80 90" width="72" height="81" aria-hidden="true">${[0, 90, 180, 270].map((r) => `<path transform="rotate(${r} 40 40)" d="M40 40 C24 28 26 8 38 12 C40 6 48 8 46 18 C52 26 48 36 40 40 Z" fill="#3f9a3c" stroke="#2c6e2a" stroke-width="1.5"/>`).join("")}
  <circle cx="40" cy="40" r="4" fill="#2c6e2a"/><path d="M40 44 q4 22 -6 42" stroke="#2c6e2a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

export async function kaeferKommt(vorschau = false) {
  if (!darf(vorschau) || document.getElementById("gkKaefer")) return;
  const k = document.createElement("button"); k.type = "button"; k.id = "gkKaefer"; k.className = "gk-kaefer"; k.setAttribute("aria-label", "Ein Marienkäfer – antippen für einen Glücksspruch");
  k.innerHTML = KAEFER_OBEN; k.onclick = () => toast(zufall(SPRUECHE_KAEFER), 4000);
  document.body.appendChild(k);
  const w = innerWidth, h = innerHeight, mitteX = w / 2 - 30, mitteY = h * 0.55;
  try {
    const hin = k.animate([{ transform: `translate(-80px, ${h - 120}px) rotate(55deg)` }, { transform: `translate(${mitteX}px, ${mitteY}px) rotate(55deg)` }], { duration: 5200, easing: "linear", fill: "forwards" });
    await hin.finished;
    k.style.transform = `translate(${mitteX}px, ${mitteY}px)`; hin.cancel(); // aufrecht zum Betrachter drehen
    k.innerHTML = KAEFER_VORN; k.classList.add("vorn");
    await new Promise((r) => setTimeout(r, 2600));
    k.innerHTML = KAEFER_OBEN; k.classList.remove("vorn");
    await k.animate([{ transform: `translate(${mitteX}px, ${mitteY}px) rotate(80deg)` }, { transform: `translate(${w + 80}px, ${mitteY - 140}px) rotate(80deg)` }], { duration: 4800, easing: "linear", fill: "forwards" }).finished;
  } catch {}
  k.remove();
}
export async function kleeKommt(vorschau = false) {
  if (!darf(vorschau) || document.getElementById("gkKlee")) return;
  const wind = document.createElement("div"); wind.className = "gk-wind"; wind.setAttribute("aria-hidden", "true"); wind.innerHTML = "<i></i><i></i><i></i>"; document.body.appendChild(wind);
  const k = document.createElement("button"); k.type = "button"; k.id = "gkKlee"; k.className = "gk-klee"; k.setAttribute("aria-label", "Ein vierblättriges Kleeblatt – antippen für einen Glücksspruch");
  k.innerHTML = KLEE; k.onclick = () => toast(zufall(SPRUECHE_KLEE), 4000); document.body.appendChild(k);
  const w = innerWidth, x = w * 0.5 - 36, y = innerHeight * 0.5;
  try {
    await k.animate([{ transform: `translate(${w * 0.15}px, -100px) rotate(0deg)` }, { transform: `translate(${w * 0.7}px, ${y * 0.4}px) rotate(260deg)` }, { transform: `translate(${x}px, ${y}px) rotate(380deg)` }], { duration: 3200, easing: "ease-out", fill: "forwards" }).finished;
    wind.remove(); k.classList.add("liegt");
    await new Promise((r) => setTimeout(r, 8000));
    const w2 = document.createElement("div"); w2.className = "gk-wind"; w2.setAttribute("aria-hidden", "true"); w2.innerHTML = "<i></i><i></i><i></i>"; document.body.appendChild(w2);
    k.classList.remove("liegt");
    await k.animate([{ transform: `translate(${x}px, ${y}px) rotate(380deg)` }, { transform: `translate(${w + 120}px, ${y - 220}px) rotate(720deg)` }], { duration: 1800, easing: "ease-in", fill: "forwards" }).finished;
    w2.remove();
  } catch {}
  wind.remove(); k.remove();
}
