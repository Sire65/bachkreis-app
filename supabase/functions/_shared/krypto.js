// Kleine Krypto-Helfer für bk-api und den BK Communicator (Web Crypto – läuft in Deno und Node).
export async function sha256(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export function zufallsToken(bytes = 32) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// Vergleich in konstanter Zeit (Planer-Schlüssel)
export function gleich(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
// HMAC-SHA-256 als base64url (📆 Kalender-Abo: Link aus Person + Zählnummer, ohne gespeichertes Geheimnis je Person)
export async function hmac(geheimnis, text) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(geheimnis)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(String(text))));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
