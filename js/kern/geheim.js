// 🔒 Geheim schreiben (0.51.0, wie KC-CLUB-VERSCHLUESSELT / KC-CLUB-SCHLUESSELBUND): Ende-zu-Ende-Verschlüsselung im Einzelchat unter Erwachsenen.
// Jede Person hat ein Schlüsselpaar (ECDH P-256). Der private Schlüssel bleibt auf dem Gerät (IndexedDB), der öffentliche liegt in „geheimschluessel“.
// Beide Seiten leiten daraus denselben AES-GCM-Schlüssel ab – der Server sieht nur Zufallszeichen. Mit dem 🔑 Schlüsselbund nimmt man
// den eigenen Schlüssel (mit Passwort geschützt) auf ein zweites Gerät mit. Nur eingebaute Browser-Technik (WebCrypto), keine Bibliothek.
const C = globalThis.crypto?.subtle;
export const geheimTechnik = () => !!C && typeof indexedDB !== "undefined";
const ECDH = { name: "ECDH", namedCurve: "P-256" };
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const text = new TextEncoder(), lesen = new TextDecoder();

// ---------- Gerätespeicher (eigene kleine Datenbank, getrennt von den App-Daten) ----------
function db() {
  return new Promise((ok, nein) => { const r = indexedDB.open("bachkreis-geheim", 1); r.onupgradeneeded = () => r.result.createObjectStore("schluessel"); r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); });
}
async function idb(art, key, wert) {
  const d = await db();
  return new Promise((ok, nein) => { const t = d.transaction("schluessel", art === "lesen" ? "readonly" : "readwrite"), s = t.objectStore("schluessel");
    const r = art === "lesen" ? s.get(key) : art === "weg" ? s.delete(key) : s.put(wert, key); r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); });
}
export const eigenesPaar = (pid) => idb("lesen", "paar-" + pid);
async function paarSpeichern(pid, paar) { await idb("schreiben", "paar-" + pid, paar); }

export async function fingerabdruck(pub) {
  const h = new Uint8Array(await C.digest("SHA-256", text.encode(`${pub.x}.${pub.y}`)));
  return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");
}
const nurOeffentlich = (jwk) => ({ kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y });
// neues Schlüsselpaar für diese Person auf diesem Gerät
export async function paarErzeugen(pid) {
  const k = await C.generateKey(ECDH, true, ["deriveKey"]);
  const privat = await C.exportKey("jwk", k.privateKey), pub = nurOeffentlich(await C.exportKey("jwk", k.publicKey));
  const paar = { privat, pub, fp: await fingerabdruck(pub), seit: new Date().toISOString() };
  await paarSpeichern(pid, paar); return paar;
}
async function gemeinsam(privatJwk, pubJwk) {
  const priv = await C.importKey("jwk", privatJwk, ECDH, false, ["deriveKey"]), pub = await C.importKey("jwk", nurOeffentlich(pubJwk), ECDH, false, []);
  return C.deriveKey({ name: "ECDH", public: pub }, priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function verschluesseln(paar, partnerPub, klartext) {
  const k = await gemeinsam(paar.privat, partnerPub), iv = C ? crypto.getRandomValues(new Uint8Array(12)) : null;
  const ct = await C.encrypt({ name: "AES-GCM", iv }, k, text.encode(klartext));
  return { v: 1, iv: b64(iv), ct: b64(ct), fp: await fingerabdruck(partnerPub) };
}
export async function entschluesseln(paar, partnerPub, g) {
  const k = await gemeinsam(paar.privat, partnerPub);
  return lesen.decode(await C.decrypt({ name: "AES-GCM", iv: unb64(g.iv) }, k, unb64(g.ct)));
}

// ---------- 🔑 Schlüsselbund: den eigenen Schlüssel mit Passwort verpackt mitnehmen ----------
async function passwortSchluessel(pw, salz) {
  const basis = await C.importKey("raw", text.encode(pw), "PBKDF2", false, ["deriveKey"]);
  return C.deriveKey({ name: "PBKDF2", salt: salz, iterations: 250000, hash: "SHA-256" }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function schluesselbundPacken(paar, pw) {
  const salz = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await C.encrypt({ name: "AES-GCM", iv }, await passwortSchluessel(pw, salz), text.encode(JSON.stringify(paar)));
  return "BKSB1." + [salz, iv, new Uint8Array(ct)].map(b64).join(".");
}
export async function schluesselbundAuspacken(pid, paket, pw) {
  const [kopf, salz, iv, ct] = String(paket || "").trim().split(".");
  if (kopf !== "BKSB1" || !ct) throw new Error("Das ist kein Schlüsselbund aus der Bachkreis-App.");
  let paar;
  try { paar = JSON.parse(lesen.decode(await C.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await passwortSchluessel(pw, unb64(salz)), unb64(ct)))); }
  catch { throw new Error("Passwort falsch – oder der Text ist nicht vollständig."); }
  if (!paar?.privat?.d || !paar?.pub?.x) throw new Error("Schlüsselbund unvollständig.");
  await paarSpeichern(pid, paar); return paar;
}
