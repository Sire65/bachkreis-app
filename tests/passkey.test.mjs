// 🔑 0.56.0 Passkeys: Einrichten und Anmelden mit einem nachgebildeten Gerät (ECDSA P-256) – Challenge nur einmal,
// fremde Seite (rpId), falsche Signatur, Zähler, gesperrter Zugang; die Geräte-Liste ist privat und ohne Schlüssel
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { verarbeiten } from "../supabase/functions/_shared/api.js";
import { cbor, derZuRoh, b64u } from "../supabase/functions/_shared/passkey.js";
import { demoDatenbank } from "./demo-db.mjs";

let db, codes, P, tok;
const rufe = (body, token, ip = "9.9.9.8") => verarbeiten(db, body, { token, ip });
const te = new TextEncoder(), C = crypto.subtle;
// --- Mini-CBOR-Schreiber (nur für den Test) ---
function enc(v) {
  const kopf = (t, n) => (n < 24 ? [(t << 5) | n] : n < 256 ? [(t << 5) | 24, n] : [(t << 5) | 25, n >> 8, n & 255]);
  if (typeof v === "number") return v >= 0 ? kopf(0, v) : kopf(1, -1 - v);
  if (v instanceof Uint8Array) return [...kopf(2, v.length), ...v];
  if (typeof v === "string") { const b = te.encode(v); return [...kopf(3, b.length), ...b]; }
  if (v instanceof Map) return [...kopf(5, v.size), ...[...v].flatMap(([k, w]) => [...enc(k), ...enc(w)])];
  throw new Error("enc");
}
const cb = (v) => new Uint8Array(enc(v));
const zuDer = (roh) => { const teil = (b) => { let i = 0; while (i < 31 && b[i] === 0) i++; let x = b.slice(i); if (x[0] & 0x80) x = new Uint8Array([0, ...x]); return [2, x.length, ...x]; };
  const r = teil(roh.slice(0, 32)), s = teil(roh.slice(32)); return new Uint8Array([0x30, r.length + s.length, ...r, ...s]); };
const sha = async (b) => new Uint8Array(await C.digest("SHA-256", b));
// --- nachgebildetes Gerät ---
async function geraet(herkunft = "https://bachkreis.example") {
  const k = await C.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await C.exportKey("jwk", k.publicKey), un = (s) => new Uint8Array(Buffer.from(s, "base64url"));
  const credId = crypto.getRandomValues(new Uint8Array(16)); let zaehler = 0;
  const rpHash = await sha(te.encode(new URL(herkunft).hostname));
  const cd = (type, challenge, origin = herkunft) => te.encode(JSON.stringify({ type, challenge, origin }));
  return {
    credId: b64u(credId),
    async erstellen(challenge, origin) {
      const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, un(jwk.x)], [-3, un(jwk.y)]]);
      const ad = new Uint8Array([...rpHash, 0x41, 0, 0, 0, 0, ...new Uint8Array(16), 0, credId.length, ...credId, ...cb(cose)]);
      return { clientDataJSON: b64u(cd("webauthn.create", challenge, origin)), attestationObject: b64u(cb(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", ad]]))) };
    },
    async signieren(challenge, { origin, zaehlerWeiter = true, fremdRp = false } = {}) {
      if (zaehlerWeiter) zaehler++;
      const rh = fremdRp ? await sha(te.encode("boese.example")) : rpHash;
      const ad = new Uint8Array([...rh, 0x05, 0, 0, 0, zaehler]), c = cd("webauthn.get", challenge, origin);
      const sig = new Uint8Array(await C.sign({ name: "ECDSA", hash: "SHA-256" }, k.privateKey, new Uint8Array([...ad, ...(await sha(c))])));
      return { credId: b64u(credId), clientDataJSON: b64u(c), authenticatorData: b64u(ad), signature: b64u(zuDer(sig)) };
    },
  };
}
before(async () => {
  ({ db, codes } = await demoDatenbank());
  P = Object.keys(codes).find((id) => id !== "p-leitung");
  tok = (await rufe({ aktion: "anmelden", code: codes[P] })).json.token;
});

test("🔧 CBOR und DER", () => {
  const m = cbor(cb(new Map([["a", 1], [-2, new Uint8Array([1, 2])]]))).wert;
  assert.equal(m.get("a"), 1); assert.deepEqual([...m.get(-2)], [1, 2]);
  const roh = new Uint8Array(64).map((_, i) => (i === 0 ? 0x80 : i === 32 ? 0 : i));
  assert.deepEqual([...derZuRoh(zuDer(roh))], [...roh]);
});

test("🔑 Einrichten (nur angemeldet) und mit dem Gerät anmelden – Challenge nur einmal", async () => {
  assert.equal((await rufe({ aktion: "passkey_start" })).status, 401);
  const g = await geraet();
  const st = await rufe({ aktion: "passkey_start" }, tok);
  assert.equal(st.status, 200); assert.ok(st.json.challenge.length > 30);
  const reg = await rufe({ aktion: "passkey_registrieren", id: st.json.id, name: "Mein Handy", ...(await g.erstellen(st.json.challenge)) }, tok);
  assert.equal(reg.status, 200, JSON.stringify(reg.json)); assert.ok(!("public_key" in reg.json.passkey));
  assert.equal((await rufe({ aktion: "passkey_registrieren", id: st.json.id, ...(await g.erstellen(st.json.challenge)) }, tok)).json.fehler, "CHALLENGE_ABGELAUFEN");
  const o = await rufe({ aktion: "passkey_optionen" });
  const an = await rufe({ aktion: "passkey_anmelden", id: o.json.id, ...(await g.signieren(o.json.challenge)) });
  assert.equal(an.status, 200, JSON.stringify(an.json)); assert.equal(an.json.person.id, P); assert.ok(an.json.token);
  assert.equal((await rufe({ aktion: "laden" }, an.json.token)).status, 200, "Sitzung gilt");
  assert.equal((await rufe({ aktion: "passkey_anmelden", id: o.json.id, ...(await g.signieren(o.json.challenge)) })).json.fehler, "CHALLENGE_ABGELAUFEN");
  // Liste: privat, ohne Schlüssel; umbenennen/entfernen nur selbst
  const l = (await rufe({ aktion: "laden" }, tok)).json.daten.passkeys;
  assert.equal(l.length, 1); assert.ok(!("public_key" in l[0]) && !("rp_hash" in l[0]));
  const leitung = (await rufe({ aktion: "anmelden", code: codes["p-leitung"] })).json.token;
  assert.ok(!((await rufe({ aktion: "laden" }, leitung)).json.daten.passkeys || []).some((x) => x.person_id === P), "auch die Leitung sieht fremde Passkeys nicht");
  assert.equal((await rufe({ aktion: "speichern", tab: "passkeys", zeilen: [{ ...l[0], geloescht_am: new Date().toISOString() }] }, leitung)).json.konflikte[0].grund, "NUR_EIGENE");
  assert.equal((await rufe({ aktion: "speichern", tab: "passkeys", zeilen: [{ id: "pk-neu", person_id: P, cred_id: "x" }] }, tok)).json.konflikte[0].grund, "NUR_UEBER_GERAET");
});

test("🛡️ Abgelehnt: fremde Seite, falsche Signatur, alter Zähler, unbekanntes Gerät, gesperrter Zugang", async () => {
  const g = await geraet(), st = await rufe({ aktion: "passkey_start" }, tok);
  assert.equal((await rufe({ aktion: "passkey_registrieren", id: st.json.id, ...(await g.erstellen(st.json.challenge, "http://bachkreis.example")) }, tok)).json.fehler, "PASSKEY_UNGUELTIG", "nur https");
  const st2 = await rufe({ aktion: "passkey_start" }, tok);
  assert.equal((await rufe({ aktion: "passkey_registrieren", id: st2.json.id, ...(await g.erstellen(st2.json.challenge)) }, tok)).status, 200);
  const versuch = async (opts, aendern) => { const o = await rufe({ aktion: "passkey_optionen" }, undefined, "7.7.7.7"); const a = await g.signieren(o.json.challenge, opts); return rufe({ aktion: "passkey_anmelden", id: o.json.id, ...(aendern ? aendern(a) : a) }, undefined, "7.7.7.7"); };
  assert.equal((await versuch({ fremdRp: true })).json.fehler, "PASSKEY_UNGUELTIG");
  assert.equal((await versuch({}, (a) => ({ ...a, signature: b64u(zuDer(new Uint8Array(64).fill(7))) }))).json.fehler, "PASSKEY_UNGUELTIG");
  assert.equal((await versuch({}, (a) => ({ ...a, credId: "unbekannt" }))).json.fehler, "PASSKEY_UNBEKANNT");
  assert.equal((await versuch({})).status, 200);
  assert.equal((await versuch({ zaehlerWeiter: false })).json.fehler, "PASSKEY_UNGUELTIG", "Zähler muss steigen (kopierter Schlüssel)");
  await db.q(`update bk_zugaenge set aktiv = false where person_id = $1`, [P]);
  assert.equal((await versuch({})).json.fehler, "PASSKEY_UNBEKANNT", "Zugang gesperrt → Passkey gesperrt");
  await db.q(`update bk_zugaenge set aktiv = true where person_id = $1`, [P]);
});
