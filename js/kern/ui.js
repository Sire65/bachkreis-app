// Kleine Oberflächen-Helfer (ohne Framework, wie in der Club-App). Ereignisse laufen über data-a="aktion" und
// eine zentrale Aktions-Registry – keine Inline-onclick-Strings (CSP-freundlich).
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const $ = (sel, wurzel = document) => wurzel.querySelector(sel);
export const $$ = (sel, wurzel = document) => [...wurzel.querySelectorAll(sel)];

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const datum = (d) => { if (!d) return "–"; const x = new Date(d); return `${WT[x.getDay()]}, ${x.getDate()}. ${MON[x.getMonth()]} ${x.getFullYear()}`; };
export const datumKurz = (d) => { if (!d) return "–"; const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`; };
export const uhr = (d) => { if (!d) return ""; const x = new Date(d); return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`; };
export const wochentag = (d) => WT[new Date(d).getDay()];
export const monatKurz = (d) => MON[new Date(d).getMonth()];
export const vorZeit = (d) => {
  if (!d) return "nie";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "gerade eben"; if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`; if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const t = Math.floor(s / 86400); return t === 1 ? "gestern" : `vor ${t} Tagen`;
};
export const geld = (v) => (v == null || v === "" ? "–" : Number(v).toLocaleString("de-DE", { style: "currency", currency: "EUR" }));
// datetime-local <-> ISO
export const zuLokal = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
export const vonLokal = (v) => (v ? new Date(v).toISOString() : null);

let toastTimer = null;
export function toast(text, ms = 2600) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = text; t.classList.remove("versteckt");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("versteckt"), ms);
}

// Blatt (Bottom-Sheet). inhalt = HTML. Rückgabe: Element; schliessen() entfernt.
export function blatt(titel, inhalt) {
  blattZu();
  const hg = document.createElement("div");
  hg.className = "blatt-hg"; hg.id = "blattHg";
  hg.innerHTML = `<div class="blatt" role="dialog" aria-modal="true" aria-label="${esc(titel)}"><h3>${esc(titel)}</h3>${inhalt}<button class="knopf breit" data-a="blattZu">Schließen</button></div>`;
  hg.addEventListener("click", (e) => { if (e.target === hg) blattZu(); });
  document.body.appendChild(hg);
  beschriftungenVerknuepfen(hg);
  return hg.querySelector(".blatt");
}
export function blattZu() { $("#blattHg")?.remove(); }

export async function frage(text) { return window.confirm(text); }

export function herunterladen(name, inhalt, typ = "text/plain") {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ + ";charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Zentrale Aktions-Registry
export const AKTIONEN = { blattZu };
export function aktionenStarten(wurzel = document) {
  wurzel.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || el.disabled) return;
    const f = AKTIONEN[el.dataset.a];
    if (!f) { console.warn("Unbekannte Aktion", el.dataset.a); return; }
    e.preventDefault();
    Promise.resolve(f(el.dataset.x, el, e)).catch((err) => { console.error(err); toast("⚠️ " + err.message); });
  });
  wurzel.addEventListener("change", (e) => {
    const el = e.target.closest("[data-c]");
    if (!el) return;
    const f = AKTIONEN[el.dataset.c];
    if (f) Promise.resolve(f(el.value, el, e)).catch((err) => { console.error(err); toast("⚠️ " + err.message); });
  });
}

// Formular lesen: alle [name]-Felder eines Containers
export function formWerte(wurzel) {
  const o = {};
  for (const el of $$("[name]", wurzel)) {
    if (el.type === "checkbox") {
      if (el.dataset.mehr) { (o[el.name] ||= []); if (el.checked) o[el.name].push(el.value); }
      else o[el.name] = el.checked;
    } else if (el.type === "radio") { if (el.checked) o[el.name] = el.value; }
    else if (el.multiple) o[el.name] = [...el.selectedOptions].map((x) => x.value);
    else o[el.name] = el.value;
  }
  return o;
}

export const BACHKREIS_LOGO = `<img class="bk-logo" src="icons/logo.png" alt="Bachkreis Bergkamen" width="256" height="256">`;

// ♿ 0.25.0 (axe-Prüfung): Beschriftungen ohne for= mit dem folgenden Eingabefeld verknüpfen – Bildschirmleser lesen dann den Feldnamen vor.
let _lid = 0;
export function beschriftungenVerknuepfen(wurzel) {
  wurzel?.querySelectorAll?.("label:not([for])").forEach((l) => {
    if (l.querySelector("input,select,textarea")) return;
    const e = l.nextElementSibling;
    if (!e || !/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) return;
    if (!e.id) e.id = "bkf" + ++_lid;
    l.htmlFor = e.id;
  });
  // Felder ganz ohne Beschriftung (Filter-Auswahl, Haken in Tabellen): Namen aus Titel, Platzhalter, Text davor, erster Option oder Zeile
  wurzel?.querySelectorAll?.("select,input:not([type=hidden]):not([type=button]):not([type=submit]),textarea").forEach((e) => {
    if (e.closest("label") || e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && wurzel.querySelector?.(`label[for="${CSS.escape(e.id)}"]`))) return;
    const vorher = e.previousSibling?.textContent?.trim();
    const n = e.title || e.placeholder || (vorher && vorher.length < 40 ? vorher : "") || (e.tagName === "SELECT" ? e.options[0]?.textContent : "") || e.closest("tr,li")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) || e.name || e.dataset.x || "";
    if (n) e.setAttribute("aria-label", n.trim());
  });
}
