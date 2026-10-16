// Start der Bachkreis-App: Datenquelle starten, Person bestimmen (Zugangscode ?k= / gemerkte Person / Demo-Rolle),
// Ansichten laden, Service Worker mit atomarem Update (AGENTS.md Regel 16).
import { datenStarten, liste, hole, abonnieren, konfig, speichere, datenInfo, istEchtbetrieb, anmelden, abmelden, beiHinweis } from "../kern/daten.js";
import { AKTIONEN, aktionenStarten, toast, esc, $, BACHKREIS_LOGO } from "../kern/ui.js";
import { S, zeige, zurueck, zeichne, alsPerson, einst, einstAnwenden, ANSICHTEN, fehlerMerken } from "./zustand.js";
import { setzeEmpfaengerGeraet, pushAbonnieren } from "../kern/versand.js";
import "./start.js";
import "./termine.js";
import "./kommunikation.js";
import { pinnwandStart } from "./pinnwand.js";
import { nachrichtenStart, expressPruefen } from "./nachrichten.js";
import "./sprachsteuerung.js";
import "./orchester.js";
import "./instrumente.js";
import "./leitung.js";
import "./notenarchiv.js";
import "./meins.js";
import "./fuss.js";
import { anwendenDesign } from "./darstellung.js";
import { beimStart } from "./einstellungen.js";
import { buehneLaeuft } from "./buehne.js";

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

// ---------- Anmeldung (Echtbetrieb): persönlicher Code oder QR-Link ?k=CODE ----------
function anmeldeSeite(meldung = "") {
  $("#demoleiste")?.remove();
  $("#lade")?.remove();
  $("#inhalt").innerHTML = `<div class="karte" style="max-width:440px;margin:40px auto;text-align:center">
    <div style="width:120px;margin:0 auto 10px">${BACHKREIS_LOGO}</div><h2>${esc(konfig().name || "Bachkreis Bergkamen")}</h2>
    <p>Bitte mit deinem persönlichen Zugangscode anmelden.</p>
    ${meldung ? `<p class="badge b-rot">${esc(meldung)}</p>` : ""}
    <div class="feld"><input id="anmeldeCode" placeholder="z. B. AB12CD34" autocomplete="one-time-code" autocapitalize="characters" style="text-align:center;font-size:1.2rem;letter-spacing:.12em"></div>
    <button class="knopf haupt breit" data-a="anmeldenCode">Anmelden</button>
    <p class="hinweis">Tipp: Den QR-Code auf deiner Einrichtungskarte mit der Handy-Kamera scannen – dann geht es automatisch. Keine Karte? Bitte bei der Leitung melden.</p></div>`;
  document.getElementById("anmeldeCode")?.addEventListener("keydown", (e) => { if (e.key === "Enter") AKTIONEN.anmeldenCode(); });
}
const FEHLERTEXT = { CODE_UNGUELTIG: "Dieser Code ist ungültig oder gesperrt.", ZU_VIELE_VERSUCHE: "Zu viele Versuche – bitte in 15 Minuten erneut probieren." };
AKTIONEN.anmeldenCode = async () => {
  const code = ($("#anmeldeCode")?.value || "").trim();
  if (code.length < 6) { toast("Bitte den vollständigen Code eingeben"); return; }
  const r = await anmelden(code).catch(() => ({ ok: false, fehler: "OFFLINE" }));
  if (!r.ok) { anmeldeSeite(FEHLERTEXT[r.fehler] || "Anmeldung nicht möglich – bitte Internetverbindung prüfen."); return; }
  location.reload();
};
AKTIONEN.abmeldenApp = async () => { if (!confirm("Von diesem Gerät abmelden?")) return; await abmelden(); location.reload(); };

async function starten() {
  einstAnwenden(); anwendenDesign();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", einstAnwenden);
  aktionenStarten();
  const url = new URL(location.href);
  const code = url.searchParams.get("k");
  if (code) { url.searchParams.delete("k"); history.replaceState(null, "", url.pathname + url.hash); } // Code nicht in der Adresszeile lassen
  try {
    await datenStarten({ quelle: "app" });
  } catch (e) {
    if (e.code !== "ANMELDUNG") throw e;
    if (code) { const r = await anmelden(code.trim()).catch(() => ({ ok: false })); if (r.ok) return location.reload(); return anmeldeSeite(FEHLERTEXT[r.fehler] || "Anmeldung mit diesem Link nicht möglich."); }
    return anmeldeSeite();
  }
  let ok = false;
  if (istEchtbetrieb()) {
    ok = alsPerson(datenInfo().ich);
    if (!ok) return anmeldeSeite("Dein Zugang ist nicht mehr aktiv.");
    $("#demoleiste")?.remove();
    beiHinweis((t) => toast("ℹ️ " + t, 4000));
  } else {
    if (code) ok = await anmeldenMitCode(code.trim().toUpperCase());
    if (!ok) { let id = null; try { id = localStorage.getItem("bk_ich"); } catch {} ok = id ? alsPerson(id) : false; }
    if (!ok) ok = alsPerson(konfig().demo_personen?.leitung || konfig().leitung_id);
  }
  S.ansicht = ansichtVonPerson(S.ich);
  S.register = einst().startRegister || "bachkreis";
  setzeEmpfaengerGeraet(S.ich.id);
  if (!istEchtbetrieb()) demoLeiste();
  // Echtbetrieb: Push-Abo dieses Geräts auffrischen, wenn Benachrichtigungen schon erlaubt sind (still im Hintergrund)
  else if (globalThis.Notification?.permission === "granted") pushAbonnieren().catch((e) => console.warn("Push-Abo", e));
  const view = location.hash.slice(1);
  zeige("start", {}, { ersetzen: true });
  // Pinnwand zuerst (neue Zettel, wichtige, Erinnerung – wie KC pwStart); dann Tipp des Tages, „Was ist neu“, ab und zu die Fee
  nachrichtenStart();
  const express = expressPruefen(); // 🏎️ Express-Sendungen zuerst (wie KC)
  const pw = pinnwandStart();
  beimStart(express || pw);
  if (view && view !== "start") { /* Unterseiten nach Neuladen nicht direkt öffnen – Parameter fehlen */ }
  window.addEventListener("popstate", () => { if (S.view !== "start") zurueck(); });
  // Änderungen aus anderen Fenstern (z. B. PC-Verwaltung) → neu zeichnen, wenn gerade nicht getippt wird
  abonnieren((tabs) => {
    if (S.ich) { const neu = hole("personen", S.ich.id); if (neu) S.ich = neu; }
    const fokus = document.activeElement;
    if (fokus && $("#inhalt").contains(fokus) && /INPUT|TEXTAREA|SELECT/.test(fokus.tagName)) return;
    if (document.getElementById("blattHg")) return;
    if (document.getElementById("heroRueck") || buehneLaeuft()) return; // Bühne nicht unterbrechen
    zeichne();
  });
  $("#lade")?.remove();
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
    // Neu laden nur bei einem echten Update (vorher gab es schon eine aktive Version) – nicht beim allerersten Besuch.
    const hatteVersion = !!navigator.serviceWorker.controller;
    let neu = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hatteVersion || neu) return; neu = true; location.reload(); });
  } catch (e) { console.warn("Service Worker nicht registriert", e); }
}

starten().catch((e) => {
  console.error(e); fehlerMerken(e);
  document.getElementById("lade").innerHTML = `<div class="karte"><h3>⚠️ Start fehlgeschlagen</h3><p>${esc(e.message)}</p><a class="knopf" href="./">Neu laden</a></div>`;
});
