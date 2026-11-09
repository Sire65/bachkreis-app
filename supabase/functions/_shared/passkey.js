// 🔑 Passkeys (WebAuthn, 0.56.0): Anmelden mit Fingerabdruck, Gesicht oder Geräte-PIN statt Zugangscode.
// Nur eingebaute Technik (Web Crypto), keine Bibliothek: kleiner CBOR-Leser, COSE-Schlüssel (ES256 / P-256) → JWK,
// Signatur-Prüfung (DER → roh). Läuft in Deno (Supabase) und Node (Tests). Bescheinigungen der Hersteller werden nicht geprüft
// (attestation "none") – entscheidend ist, dass das Gerät den privaten Schlüssel besitzt und die Anfrage für UNSERE Seite (rpId) gilt.
const C = crypto.subtle;
export const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s) => { const t = String(s || "").replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "===".slice((t.length + 3) % 4)), (c) => c.charCodeAt(0)); };
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
export const sha256Bytes = async (b) => new Uint8Array(await C.digest("SHA-256", b));

// ---------- CBOR (nur was WebAuthn braucht: Zahlen, Bytes, Text, Listen, Maps) ----------
export function cbor(bytes) {
  const b = new Uint8Array(bytes); let i = 0;
  const laenge = (info) => {
    if (info < 24) return info;
    const n = { 24: 1, 25: 2, 26: 4, 27: 8 }[info]; if (!n) throw new Error("CBOR");
    let v = 0; for (let k = 0; k < n; k++) v = v * 256 + b[i++]; return v;
  };
  const lies = () => {
    if (i >= b.length) throw new Error("CBOR zu kurz");
    const x = b[i++], typ = x >> 5, info = x & 31;
    if (typ === 7) { if (info === 20) return false; if (info === 21) return true; if (info === 22) return null; throw new Error("CBOR"); }
    const n = laenge(info);
    if (typ === 0) return n;
    if (typ === 1) return -1 - n;
    if (typ === 2) { const v = b.slice(i, i + n); i += n; return v; }
    if (typ === 3) { const v = new TextDecoder().decode(b.slice(i, i + n)); i += n; return v; }
    if (typ === 4) return Array.from({ length: n }, lies);
    if (typ === 5) { const m = new Map(); for (let k = 0; k < n; k++) { const s = lies(); m.set(s, lies()); } return m; }
    throw new Error("CBOR-Typ");
  };
  const wert = lies(); return { wert, rest: i };
}
// authenticatorData: rpIdHash(32) · flags(1) · signCount(4) · [attestedCredentialData]
export function authDaten(ad) {
  const a = new Uint8Array(ad); if (a.length < 37) throw new Error("authData zu kurz");
  const flags = a[32], zaehler = ((a[33] << 24) >>> 0) + (a[34] << 16) + (a[35] << 8) + a[36];
  const r = { rpHash: hex(a.slice(0, 32)), up: !!(flags & 1), uv: !!(flags & 4), zaehler };
  if (flags & 64) {
    const idLaenge = (a[53] << 8) + a[54];
    r.credId = b64u(a.slice(55, 55 + idLaenge));
    r.cose = cbor(a.slice(55 + idLaenge)).wert;
  }
  return r;
}
export function coseZuJwk(m) {
  if (!(m instanceof Map) || m.get(1) !== 2 || m.get(3) !== -7 || m.get(-1) !== 1) throw new Error("Nur ES256 (P-256) wird unterstützt");
  return { kty: "EC", crv: "P-256", x: b64u(m.get(-2)), y: b64u(m.get(-3)) };
}
// ECDSA-Signatur aus WebAuthn ist DER (SEQUENCE{r,s}); Web Crypto will r‖s mit je 32 Byte
export function derZuRoh(der) {
  const d = new Uint8Array(der); if (d[0] !== 0x30) throw new Error("DER");
  let i = 2; if (d[1] & 0x80) i = 2 + (d[1] & 0x7f);
  const teil = () => { if (d[i++] !== 0x02) throw new Error("DER"); const n = d[i++]; let v = d.slice(i, i + n); i += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  const r = teil(), s = teil(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}
function clientDaten(cdj, art, challenge) {
  const c = JSON.parse(new TextDecoder().decode(unb64u(cdj)));
  if (c.type !== art) throw new Error("FALSCHE_ART");
  if (c.challenge !== challenge) throw new Error("CHALLENGE");
  const o = new URL(c.origin);
  if (o.protocol !== "https:" && o.hostname !== "localhost") throw new Error("HERKUNFT");
  return { c, rpId: o.hostname };
}
// Registrierung prüfen → { credId, jwk, rpHash, zaehler }
export async function registrierungPruefen({ clientDataJSON, attestationObject }, challenge) {
  const { rpId } = clientDaten(clientDataJSON, "webauthn.create", challenge);
  const att = cbor(unb64u(attestationObject)).wert;
  const ad = authDaten(att.get("authData"));
  if (ad.rpHash !== hex(await sha256Bytes(new TextEncoder().encode(rpId)))) throw new Error("RP_ID");
  if (!ad.up || !ad.credId) throw new Error("UNVOLLSTAENDIG");
  return { credId: ad.credId, jwk: coseZuJwk(ad.cose), rpHash: ad.rpHash, zaehler: ad.zaehler };
}
// Anmeldung prüfen (gespeicherter Schlüssel) → { zaehler }
export async function anmeldungPruefen({ clientDataJSON, authenticatorData, signature }, challenge, gespeichert) {
  clientDaten(clientDataJSON, "webauthn.get", challenge);
  const ad = authDaten(unb64u(authenticatorData));
  if (ad.rpHash !== gespeichert.rp_hash) throw new Error("RP_ID");
  if (!ad.up) throw new Error("NICHT_BESTAETIGT");
  const k = await C.importKey("jwk", { ...gespeichert.public_key, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const daten = new Uint8Array([...unb64u(authenticatorData), ...(await sha256Bytes(unb64u(clientDataJSON)))]);
  if (!(await C.verify({ name: "ECDSA", hash: "SHA-256" }, k, derZuRoh(unb64u(signature)), daten))) throw new Error("SIGNATUR");
  if (ad.zaehler && gespeichert.zaehler && ad.zaehler <= gespeichert.zaehler) throw new Error("ZAEHLER"); // kopierter Schlüssel?
  return { zaehler: ad.zaehler };
}
