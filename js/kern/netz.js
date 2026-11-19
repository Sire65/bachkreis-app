// 📡 Verbindung messen – ohne Inhalte: nur Dauer und Erfolg jeder Anfrage an den Server (Adapter) bzw. an die App-Adresse („Jetzt messen“).
// Qualität aus echten Antwortzeiten, sonst Schätzung des Handys (navigator.connection.rtt). Ohne Messung „unbekannt“ – nie als gut anzeigen.
export const VERALTET_MS = 3 * 60 * 1000;
export const NETZ = { zeiten: [], letzteOk: 0, letzterFehler: 0, fehlerText: "", anfragen: 0, fehler: 0, messung: null };
const zuhoerer = new Set();
export const netzAbonnieren = (f) => { zuhoerer.add(f); return () => zuhoerer.delete(f); };
const melden = () => { for (const f of zuhoerer) { try { f(); } catch {} } };
export function netzMessung(ms, ok, fehlerText = "") {
  NETZ.anfragen++;
  if (ok) { NETZ.letzteOk = Date.now(); NETZ.zeiten.push(Math.round(ms)); if (NETZ.zeiten.length > 20) NETZ.zeiten.shift(); }
  else { NETZ.fehler++; NETZ.letzterFehler = Date.now(); NETZ.fehlerText = fehlerText || "keine Antwort"; }
  melden();
}
const nav = () => (typeof navigator === "object" ? navigator : {});
// Netzart: nur Android verrät sie (connection.type) – sonst die zuletzt selbst gewählte
export function netzErkannt(c = nav().connection) { const t = c?.type; return t === "wifi" || t === "ethernet" ? "wlan" : t === "cellular" ? "mobil" : null; }
export function netzArt(gewaehlt = null, c = nav().connection) {
  const e = netzErkannt(c); if (e) return { art: e, quelle: "erkannt" };
  return gewaehlt === "wlan" || gewaehlt === "mobil" ? { art: gewaehlt, quelle: "gewaehlt" } : { art: null, quelle: "" };
}
export function netzQualitaet({ online = nav().onLine !== false, c = nav().connection, n = NETZ, jetzt = Date.now() } = {}) {
  if (!online) return { stufe: 0, farbe: "rot", text: "Offline – das Handy hat kein Netz" };
  if (n.letzterFehler > n.letzteOk && jetzt - n.letzterFehler < VERALTET_MS) return { stufe: 0, farbe: "rot", text: "Keine Verbindung zum Server" + (n.fehlerText ? ` (${n.fehlerText})` : "") };
  const frisch = n.letzteOk && jetzt - n.letzteOk < VERALTET_MS;
  const letzte = n.zeiten.slice(-5), ms = frisch && letzte.length ? Math.round(letzte.reduce((a, b) => a + b, 0) / letzte.length) : null;
  const wert = ms ?? (c?.rtt > 0 ? c.rtt : null);
  if (wert == null) return { stufe: null, farbe: "grau", text: "Qualität noch unbekannt – noch keine Messung" };
  const stufe = wert <= 400 ? 4 : wert <= 1000 ? 3 : wert <= 2500 ? 2 : 1;
  return { stufe, ms, farbe: ["", "rot", "gelb", "gruen", "gruen"][stufe], text: ["", "Schwach", "Mäßig", "Gut", "Sehr gut"][stufe] + (ms == null ? " (Schätzung des Handys)" : "") };
}
