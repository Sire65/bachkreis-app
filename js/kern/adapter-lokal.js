// Adapter „lokal-demo“: Daten liegen im Browser (IndexedDB, Rückfall: Arbeitsspeicher).
// App (index.html) und PC-Verwaltung (verwaltung.html) teilen sich dieselbe Datenbank; Änderungen werden über
// BroadcastChannel sofort an andere offene Fenster gemeldet – so lässt sich der spätere Abgleich über Supabase vorführen.
import { TABELLEN_NAMEN } from "./schema.js";
import { erzeugeDemodaten } from "./demodaten.js";

const DB_NAME = "bachkreis-demo";
const DB_VERSION = 1;
const KANAL = "bk-daten";

function idbOeffnen() {
  return new Promise((ok, fehler) => {
    if (!("indexedDB" in globalThis)) return fehler(new Error("IndexedDB nicht verfügbar"));
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => { r.result.createObjectStore("tabellen"); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}
function idbLesen(db, key) {
  return new Promise((ok, fehler) => {
    const t = db.transaction("tabellen", "readonly").objectStore("tabellen").get(key);
    t.onsuccess = () => ok(t.result); t.onerror = () => fehler(t.error);
  });
}
function idbSchreiben(db, key, wert) {
  return new Promise((ok, fehler) => {
    const tx = db.transaction("tabellen", "readwrite");
    tx.objectStore("tabellen").put(wert, key);
    tx.oncomplete = () => ok(); tx.onerror = () => fehler(tx.error);
  });
}
function idbLeeren(db) {
  return new Promise((ok, fehler) => {
    const tx = db.transaction("tabellen", "readwrite");
    tx.objectStore("tabellen").clear();
    tx.oncomplete = () => ok(); tx.onerror = () => fehler(tx.error);
  });
}

export function erzeugeLokalAdapter() {
  let db = null;
  let speicher = "arbeitsspeicher";
  const daten = {};
  const zuhoerer = new Set();
  let kanal = null;

  async function persist(tab) {
    if (db) await idbSchreiben(db, tab, daten[tab]);
  }
  function melden(tabs, extern) {
    for (const f of zuhoerer) { try { f(tabs); } catch (e) { console.error(e); } }
    if (!extern && kanal) kanal.postMessage({ tabs });
  }
  async function seed() {
    const d = erzeugeDemodaten();
    for (const t of TABELLEN_NAMEN) daten[t] = d[t] || [];
    daten.__konfig = d.__konfig || {};
    if (db) {
      for (const t of TABELLEN_NAMEN) await idbSchreiben(db, t, daten[t]);
      await idbSchreiben(db, "__konfig", daten.__konfig);
      await idbSchreiben(db, "__meta", { erzeugt: new Date().toISOString(), schema: DB_VERSION });
    }
  }

  return {
    art: "lokal-demo",
    beschreibung: "Vorführversion – Demodaten nur in diesem Browser",
    async starten() {
      try { db = await idbOeffnen(); speicher = "indexeddb"; } catch { db = null; }
      const meta = db ? await idbLesen(db, "__meta") : null;
      if (!meta) await seed();
      else {
        for (const t of TABELLEN_NAMEN) daten[t] = (await idbLesen(db, t)) || [];
        daten.__konfig = (await idbLesen(db, "__konfig")) || {};
      }
      if ("BroadcastChannel" in globalThis) {
        kanal = new BroadcastChannel(KANAL);
        kanal.onmessage = async (ev) => {
          const tabs = ev.data?.tabs || [];
          if (db) for (const t of tabs) daten[t] = t === "__konfig" ? ((await idbLesen(db, t)) || {}) : ((await idbLesen(db, t)) || []);
          melden(tabs, true);
        };
      }
      return { speicher };
    },
    info() {
      return { art: "lokal-demo", speicher, server: false, hinweis: "Keine Server-Verbindung – Demodaten" };
    },
    alle(tab) { return daten[tab] || []; },
    async schreiben(tab, zeilen) {
      daten[tab] = zeilen;
      await persist(tab);
    },
    async konfigSetzen(k, v) {
      daten.__konfig = { ...(daten.__konfig || {}), [k]: v };
      if (db) await idbSchreiben(db, "__konfig", daten.__konfig);
      melden(["__konfig"]);
    },
    konfig() { return daten.__konfig || {}; },
    geaendert(tabs) { melden(tabs); },
    abonnieren(f) { zuhoerer.add(f); return () => zuhoerer.delete(f); },
    async zuruecksetzen() {
      if (db) await idbLeeren(db);
      await seed();
      melden([...TABELLEN_NAMEN, "__konfig"]);
    },
  };
}
