// Start der Bachkreis-App: Datenquelle starten, Person bestimmen (Zugangscode ?k= / gemerkte Person / Demo-Rolle),
// Ansichten laden, Service Worker mit atomarem Update (AGENTS.md Regel 16).
import { datenStarten, liste, hole, abonnieren, konfig, speichere } from "../kern/daten.js";
import { AKTIONEN, aktionenStarten, toast, esc, $ } from "../kern/ui.js";
import { S, zeige, zurueck, zeichne, alsPerson, einst, einstAnwenden, ANSICHTEN, fehlerMerken } from "./zustand.js";
import { setzeEmpfaengerGeraet } from "../kern/versand.js";
import "./start.js";
import "./termine.js";
import "./kommunikation.js";
import "./orchester.js";
import "./instrumente.js";
import "./leitung.js";
import "./meins.js";

window.addEventListener("error", (e) => fehlerMerken(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => fehlerMerken(e.reason));

AKTIONEN.start = () => { S.verlauf = []; zeige("start", {}, { ersetzen: true }); };
AKTIONEN.zurueck = () => zurueck();

function ansichtVonPerson(p) {
  const r = p.rollen || [];
  if (r.includes("leitung") || r.includes("admin")) return "leitung";
  if (r.includes("lehrkraft")) return "lehrkraft";
  if (r.includes("vorstand")) return "vorstand";
  return p.typ === "eltern" ? "eltern" : "schueler";
}
function demoLeiste() {
  const dp = konfig().demo_personen || {};
  const opts = Object.entries(ANSICHTEN).filter(([k]) => dp[k]).map(([k, t]) => `<option value="${k}" ${S.ansicht === k ? "selected" : ""}>${t}</option>`).join("");
  $("#demoleiste").innerHTML = `🧪 VORFÜHRVERSION · Demodaten · Ansicht als <select data-c="ansichtWahl" aria-label="Ansicht wählen">${opts}</select> <span>${esc(S.ich ? S.ich.vorname + " " + S.ich.nachname : "")}</span>`;
}
AKTIONEN.ansichtWahl = (v) => {
  const id = konfig().demo_personen?.[v];
  if (!id || !alsPerson(id)) return;
  S.ansicht = v; S.verlauf = []; S.register = einst().startRegister;
  setzeEmpfaengerGeraet(id);
  demoLeiste();
  zeige("start", {}, { ersetzen: true });
  toast(`Ansicht: ${ANSICHTEN[v]}`);
};

async function anmeldenMitCode(code) {
  const z = liste("zugaenge", (x) => x.code === code && x.aktiv)[0];
  if (!z) { toast("⚠️ Zugangscode ungültig oder gesperrt"); return false; }
  await speichere("zugaenge", { ...z, zuletzt: new Date().toISOString() });
  return alsPerson(z.person_id);
}

async function starten() {
  einstAnwenden();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", einstAnwenden);
  aktionenStarten();
  await datenStarten({ quelle: "app" });
  const url = new URL(location.href);
  const code = url.searchParams.get("k");
  let ok = false;
  if (code) {
    ok = await anmeldenMitCode(code.trim().toUpperCase());
    url.searchParams.delete("k"); history.replaceState(null, "", url.pathname + url.hash); // Code nicht in der Adresszeile lassen
  }
  if (!ok) { let id = null; try { id = localStorage.getItem("bk_ich"); } catch {} ok = id ? alsPerson(id) : false; }
  if (!ok) ok = alsPerson(konfig().demo_personen?.leitung || konfig().leitung_id);
  S.ansicht = ansichtVonPerson(S.ich);
  S.register = einst().startRegister || "bachkreis";
  setzeEmpfaengerGeraet(S.ich.id);
  demoLeiste();
  const view = location.hash.slice(1);
  zeige("start", {}, { ersetzen: true });
  if (view && view !== "start") { /* Unterseiten nach Neuladen nicht direkt öffnen – Parameter fehlen */ }
  window.addEventListener("popstate", () => { if (S.view !== "start") zurueck(); });
  // Änderungen aus anderen Fenstern (z. B. PC-Verwaltung) → neu zeichnen, wenn gerade nicht getippt wird
  abonnieren((tabs) => {
    if (S.ich) { const neu = hole("personen", S.ich.id); if (neu) S.ich = neu; }
    const fokus = document.activeElement;
    if (fokus && $("#inhalt").contains(fokus) && /INPUT|TEXTAREA|SELECT/.test(fokus.tagName)) return;
    if (document.getElementById("blattHg")) return;
    zeichne();
  });
  $("#lade").remove();
  swStarten();
}

// ---------- Service Worker: neue Version wird erst nach Bestätigung aktiv (kein Mischstand) ----------
function updateLeiste(worker) {
  const ziel = document.getElementById("updateHinweis") || document.body;
  if (document.getElementById("updLeiste")) return;
  const d = document.createElement("div");
  d.className = "updateleiste"; d.id = "updLeiste";
  d.innerHTML = `🔄 Neue Version bereit<button class="knopf klein">Jetzt aktualisieren</button>`;
  d.querySelector("button").onclick = () => worker.postMessage("jetzt-aktivieren");
  ziel.prepend(d);
}
async function swStarten() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    if (reg.waiting && navigator.serviceWorker.controller) updateLeiste(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) updateLeiste(w); });
    });
    document.addEventListener("bk-update", (e) => updateLeiste(e.detail));
    let neu = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (neu) return; neu = true; location.reload(); });
  } catch (e) { console.warn("Service Worker nicht registriert", e); }
}

starten().catch((e) => {
  console.error(e); fehlerMerken(e);
  document.getElementById("lade").innerHTML = `<div class="karte"><h3>⚠️ Start fehlgeschlagen</h3><p>${esc(e.message)}</p><a class="knopf" href="./">Neu laden</a></div>`;
});
