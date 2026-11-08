// 🔽 Klappbereiche wie in der KC Club App (0.44.0): KC-CLUB-KLAPPE-GLEICH · KC-CLUB-KLAPPE-UNTEN · KC-CLUB-KLAPPEN-ALLE · KC-CLUB-GRUPPE-KLAPPEN
// Jeder <details data-klappe="name"> bekommt dieselbe Kopfzeile: Titel links, 🔓/🔒 Schloss und runder weinroter Pfeil rechts, der sich dreht.
// - Auf/Zu wird je Gerät gemerkt (localStorage bk_klappe_<name>), 🔒 stellt den Bereich fest (bleibt offen bzw. zu), 🔓 löst ihn.
// - Lange Bereiche haben unten „▴ Zuklappen“ (springt zur Überschrift) – nicht bei data-ohne-unten oder class="innen".
// - data-ohne-schloss: kurzer Bereich ohne Schloss. Ein Knopf .klappen-alle[data-wurzel] schaltet „▾ Alle auf“ / „▴ Alle zu“.
import { toast } from "./ui.js";

const lies = (k) => { try { return localStorage.getItem("bk_" + k); } catch { return null; } };
const schreib = (k, v) => { try { localStorage.setItem("bk_" + k, v); } catch {} };
export const klappeFest = (name) => lies("fest_" + name) === "1";
export const klappeGemerkt = (name) => { const v = lies("klappe_" + name); return v === null ? null : v === "1"; };

export function klappenEinrichten(wurzel = document) {
  if (!wurzel?.querySelectorAll) return;
  for (const d of wurzel.querySelectorAll("details[data-klappe]:not([data-klappe-an])")) {
    const name = d.dataset.klappe, s = d.querySelector(":scope > summary");
    if (!name || !s) continue;
    d.dataset.klappeAn = "1";
    const v = klappeGemerkt(name); if (v !== null) d.open = v;
    const mitSchloss = !d.hasAttribute("data-ohne-schloss");
    s.insertAdjacentHTML("beforeend", '<span class="kl-pfeil" aria-hidden="true">▾</span>');
    // 🔓 Schloss neben (nicht in) der Kopfzeile – ein Knopf in <summary> wäre für Bildschirmleser „verschachtelt“
    let schloss = null;
    if (mitSchloss) {
      const r = document.createElement("div"); r.className = "kl-rahmen"; d.before(r); r.append(d);
      d.classList.add("mit-schloss");
      schloss = document.createElement("button"); schloss.type = "button"; schloss.className = "kl-schloss"; r.append(schloss);
      const setze = () => { if (!s.offsetHeight) return; schloss.style.top = `${s.offsetTop + (s.offsetHeight - 38) / 2}px`; schloss.style.right = `${r.clientWidth - (s.offsetLeft + s.offsetWidth) + 4}px`; };
      requestAnimationFrame(setze); d.addEventListener("toggle", setze);
    }
    const zeigeSchloss = () => {
      if (!schloss) return;
      const fest = klappeFest(name);
      d.classList.toggle("fest", fest); schloss.classList.toggle("zu", fest);
      schloss.textContent = fest ? "🔒" : "🔓";
      schloss.setAttribute("aria-label", fest ? "Festgestellt – antippen zum Lösen" : "Bereich so feststellen");
      schloss.setAttribute("aria-pressed", String(fest));
    };
    zeigeSchloss();
    schloss?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const fest = !klappeFest(name); schreib("fest_" + name, fest ? "1" : "0"); zeigeSchloss();
      toast(fest ? `🔒 Festgestellt – bleibt ${d.open ? "offen" : "zu"}` : "🔓 Gelöst – wieder auf- und zuklappbar");
    });
    s.addEventListener("click", (e) => {
      if (klappeFest(name)) {
        e.preventDefault();
        toast("🔒 Dieser Bereich ist festgestellt – zum Lösen das Schloss antippen.");
      }
    });
    d.addEventListener("toggle", () => { schreib("klappe_" + name, d.open ? "1" : "0"); alleKnoepfeZeigen(); });
    if (!d.classList.contains("innen") && !d.hasAttribute("data-ohne-unten")) {
      d.insertAdjacentHTML("beforeend", '<button type="button" class="kl-unten" aria-label="Bereich zuklappen">▴ Zuklappen</button>');
      d.querySelector(":scope > .kl-unten").addEventListener("click", () => {
        if (klappeFest(name)) return toast("🔒 Dieser Bereich ist festgestellt – zum Lösen oben das Schloss antippen.");
        d.open = false; s.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  }
  for (const b of wurzel.querySelectorAll(".klappen-alle:not([data-an])")) { b.dataset.an = "1"; b.addEventListener("click", () => klappenAlle(b)); }
  alleKnoepfeZeigen();
}
// nur sichtbare oberste Bereiche zählen (keine inneren Klappen), festgestellte bleiben, wie sie sind
const sichtbare = (w) => [...w.querySelectorAll("details[data-klappe-an]:not(.innen)")].filter((d) => d.offsetParent !== null && !d.parentElement.closest("details[data-klappe-an]") && !klappeFest(d.dataset.klappe));
function knopfZeigen(b) {
  const w = document.getElementById(b.dataset.wurzel); if (!w) return;
  const l = sichtbare(w), auf = l.some((d) => !d.open);
  b.hidden = l.length < 2;
  b.textContent = auf ? "▾ Alle auf" : "▴ Alle zu"; b.setAttribute("aria-label", auf ? "Alle Bereiche aufklappen" : "Alle Bereiche zuklappen");
}
function alleKnoepfeZeigen() { for (const b of document.querySelectorAll(".klappen-alle")) knopfZeigen(b); }
export function klappenAlle(b) {
  const w = document.getElementById(b.dataset.wurzel); if (!w) return;
  const l = sichtbare(w), auf = l.some((d) => !d.open);
  l.forEach((d) => (d.open = auf));
  knopfZeigen(b);
}
// Kopfzeile mit „Alle auf/zu“ – wurzelId = id des Elements, dessen Bereiche gemeint sind
export const klappenAlleKnopf = (wurzelId) => `<div class="klappen-alle-zeile"><button type="button" class="knopf klein klappen-alle" data-wurzel="${wurzelId}">▾ Alle auf</button></div>`;
// kleiner Helfer für Listen: <details data-klappe> mit Zahl rechts neben dem Titel
export const klappe = (name, titel, inhalt, { offen = false, zahl = null, klasse = "", ohneUnten = false, ohneSchloss = false } = {}) =>
  `<details class="kl ${klasse}" data-klappe="${name}"${ohneUnten ? " data-ohne-unten" : ""}${ohneSchloss ? " data-ohne-schloss" : ""}${offen ? " open" : ""}><summary><span class="kl-titel">${titel}</span>${zahl != null ? `<span class="kl-zahl">${zahl}</span>` : ""}</summary><div class="kl-inhalt">${inhalt}</div></details>`;
