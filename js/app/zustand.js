// Gemeinsamer Zustand der App: angemeldete Person, Ansicht (Rolle), Navigation, Geräte-Einstellungen.
import * as D from "../kern/daten.js";
import { esc, $, toast } from "../kern/ui.js";

export const db = { liste: D.liste, hole: D.hole, konfig: D.konfig };
export const S = { ich: null, ansicht: "leitung", view: "start", params: {}, register: "bachkreis", verlauf: [] };
export const VIEWS = {};

// ---------- Geräte-Einstellungen (nur dieses Gerät, wie „Gilt für dieses Gerät“ in der Club-App) ----------
const STANDARD = { thema: "auto", schrift: "normal", einfach: false, effekte: true, startRegister: "bachkreis", ruheVon: "21:00", ruheBis: "07:00", ruhe: false, kachelnAus: [], reihenfolge: {} };
export function einst() {
  try { return { ...STANDARD, ...JSON.parse(localStorage.getItem("bk_einstellungen") || "{}") }; } catch { return { ...STANDARD }; }
}
export function einstSetzen(k, v) {
  const e = einst(); e[k] = v;
  try { localStorage.setItem("bk_einstellungen", JSON.stringify(e)); } catch {}
  einstAnwenden();
}
export function einstAnwenden() {
  const e = einst(), r = document.documentElement;
  const dunkel = e.thema === "dunkel" || (e.thema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  r.classList.toggle("dunkel", dunkel);
  r.classList.toggle("gross", e.schrift === "gross");
  r.classList.toggle("riesig", e.schrift === "riesig");
  r.classList.toggle("ohne-effekt", !e.effekte);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dunkel ? "#15140f" : "#1a1500";
}

// ---------- Personen & Rechte ----------
export const name = (id) => { const p = typeof id === "object" ? id : D.hole("personen", id); return p ? `${p.vorname} ${p.nachname}`.trim() : "–"; };
export const vorname = (id) => D.hole("personen", id)?.vorname || "";
export const rollen = () => S.ich?.rollen || [];
export const hatRolle = (...r) => r.some((x) => rollen().includes(x));
export const istLeitung = () => hatRolle("leitung", "admin");
export const istLehrkraft = () => hatRolle("leitung", "admin", "lehrkraft");
export const istVorstand = () => hatRolle("vorstand");
export const istVerwalter = () => hatRolle("leitung", "admin", "lehrkraft", "vorstand", "instrumentenwart", "notenwart");
export const istEltern = () => S.ich?.typ === "eltern";
export const istSchueler = () => S.ich?.typ === "schueler";

export const ANSICHTEN = { leitung: "🎼 Leitung", lehrkraft: "👩‍🏫 Lehrkraft", vorstand: "💛 Förderverein", schueler: "🎻 Schüler/in", eltern: "👪 Eltern" };
export function alsPerson(personId) {
  const p = D.hole("personen", personId);
  if (!p) return false;
  S.ich = p;
  D.setzeWer(name(p));
  try { localStorage.setItem("bk_ich", p.id); } catch {}
  return true;
}

// ---------- Navigation ----------
export function zeige(view, params = {}, { ersetzen = false } = {}) {
  if (!VIEWS[view]) { toast("Diese Ansicht gibt es noch nicht."); return; }
  if (!ersetzen && S.view !== view) S.verlauf.push({ view: S.view, params: S.params });
  S.view = view; S.params = params;
  try { history[ersetzen ? "replaceState" : "pushState"]({ view, params }, "", "#" + view); } catch {}
  zeichne();
  window.scrollTo(0, 0);
}
export function zurueck() {
  const v = S.verlauf.pop() || { view: "start", params: {} };
  S.view = v.view; S.params = v.params;
  try { history.replaceState({ view: v.view, params: v.params }, "", "#" + v.view); } catch {}
  zeichne();
}
export function zeichne() {
  const v = VIEWS[S.view] || VIEWS.start;
  const ziel = $("#inhalt");
  try {
    ziel.innerHTML = v.render(S.params);
    v.nach?.(ziel, S.params);
  } catch (e) {
    console.error(e);
    ziel.innerHTML = `<div class="karte"><h3>⚠️ Fehler beim Anzeigen</h3><p class="hinweis">${esc(e.message)}</p><button class="knopf" data-a="start">Zur Startseite</button></div>`;
    fehlerMerken(e);
  }
}
export function kopf(titel, rechts = "") {
  return `<div class="kopf2"><button class="zurueck" data-a="zurueck" aria-label="Zurück">‹</button><h2>${titel}</h2>${rechts}</div>`;
}

// ---------- Fehlerprotokoll (Admin) ----------
export function fehlerMerken(e) {
  try {
    const l = JSON.parse(localStorage.getItem("bk_fehler") || "[]");
    l.push({ zeit: new Date().toISOString(), text: String(e?.message || e), view: S.view });
    localStorage.setItem("bk_fehler", JSON.stringify(l.slice(-50)));
  } catch {}
}
export const fehlerListe = () => { try { return JSON.parse(localStorage.getItem("bk_fehler") || "[]"); } catch { return []; } };
