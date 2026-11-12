// Gemeinsame IndexedDB-Hilfen (ein Schlüssel-Wert-Speicher „tabellen“ je Datenbank) für beide Daten-Adapter.
export function idbOeffnen(name, version = 1) {
  return new Promise((ok, fehler) => {
    if (!("indexedDB" in globalThis)) return fehler(new Error("IndexedDB nicht verfügbar"));
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("tabellen")) r.result.createObjectStore("tabellen"); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}
export function idbLesen(db, key) {
  return new Promise((ok, fehler) => {
    const t = db.transaction("tabellen", "readonly").objectStore("tabellen").get(key);
    t.onsuccess = () => ok(t.result); t.onerror = () => fehler(t.error);
  });
}
export function idbSchreiben(db, key, wert) {
  return new Promise((ok, fehler) => {
    const tx = db.transaction("tabellen", "readwrite");
    tx.objectStore("tabellen").put(wert, key);
    tx.oncomplete = () => ok(); tx.onerror = () => fehler(tx.error);
  });
}
export function idbLeeren(db) {
  return new Promise((ok, fehler) => {
    const tx = db.transaction("tabellen", "readwrite");
    tx.objectStore("tabellen").clear();
    tx.oncomplete = () => ok(); tx.onerror = () => fehler(tx.error);
  });
}
