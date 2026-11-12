// 👆 Anmelden ohne Code (0.56.0, Passkeys/WebAuthn): Fingerabdruck, Gesicht oder Geräte-PIN. Der private Schlüssel verlässt das Gerät nie,
// der Server kennt nur den öffentlichen. Einrichten unter Technik › „Anmelden ohne Code“; anmelden auf der Anmeldeseite.
// Wird der Zugang gesperrt (Handy verloren), sind auch die Passkeys gesperrt. Nur im Echtbetrieb.
import { S, VIEWS, zeichne, kopf } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole, loesche, serverAktion, istEchtbetrieb, anmelden } from "../kern/daten.js";

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => { const t = String(s).replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "===".slice((t.length + 3) % 4)), (c) => c.charCodeAt(0)); };
export const passkeyMoeglich = () => !!window.PublicKeyCredential && !!navigator.credentials;
function geraetName() {
  const u = navigator.userAgent;
  const g = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows-PC" : "Gerät";
  return `${g} · ${new Date().toLocaleDateString("de-DE")}`;
}
const FEHLER = { CHALLENGE_ABGELAUFEN: "Das hat zu lange gedauert – bitte noch einmal.", PASSKEY_UNBEKANNT: "Dieses Gerät ist nicht (mehr) eingerichtet oder der Zugang ist gesperrt. Bitte mit dem Code anmelden.",
  PASSKEY_UNGUELTIG: "Die Bestätigung hat nicht gepasst. Bitte mit dem Code anmelden.", ZU_VIELE_VERSUCHE: "Zu viele Versuche – bitte in 15 Minuten erneut probieren.",
  SCHON_EINGERICHTET: "Dieses Gerät ist schon eingerichtet.", ZU_VIELE_GERAETE: "Höchstens 10 Geräte – bitte zuerst ein altes entfernen." };

AKTIONEN.pkAnmelden = async () => {
  if (!passkeyMoeglich()) return toast("Dieses Gerät kann keine Passkeys.");
  try {
    const o = await serverAktion("passkey_optionen");
    if (!o?.ok) return toast("Server nicht erreichbar.");
    const a = await navigator.credentials.get({ publicKey: { challenge: unb64u(o.challenge), userVerification: "preferred", timeout: 120000 } });
    const r = await anmelden({ passkey: { id: o.id, credId: a.id, clientDataJSON: b64u(a.response.clientDataJSON), authenticatorData: b64u(a.response.authenticatorData), signature: b64u(a.response.signature) } });
    if (r?.ok) return location.reload();
    toast("🔑 " + (FEHLER[r?.fehler] || "Anmeldung nicht möglich."), 5000);
  } catch (e) { if (e?.name !== "NotAllowedError" && e?.name !== "AbortError") toast("🔑 Anmelden mit Passkey ging nicht: " + (e?.message || e)); }
};

VIEWS.passkeys = {
  render() {
    const meine = liste("passkeys", (p) => p.person_id === S.ich?.id).sort((a, b) => String(b.erstellt_am).localeCompare(String(a.erstellt_am)));
    return kopf("👆 Anmelden ohne Code") + `<div class="karte"><p>Mit einem <b>Passkey</b> meldest du dich mit <b>Fingerabdruck, Gesicht oder der Geräte-PIN</b> an – ohne Zugangscode. Der geheime Teil bleibt auf deinem Gerät; der Bachkreis-Server kennt nur den öffentlichen Teil.</p>
      ${!istEchtbetrieb() ? '<p class="badge b-gelb">🧪 In der Vorführversion nicht möglich – nur im Echtbetrieb.</p>' : !passkeyMoeglich() ? '<p class="badge b-gelb">Dieses Gerät oder dieser Browser kann keine Passkeys.</p>'
        : '<button type="button" class="knopf haupt breit" data-a="pkEinrichten">➕ Dieses Gerät einrichten</button>'}
      <p class="hinweis">Handy verloren? Die Leitung sperrt deinen Zugang – damit sind auch alle Passkeys gesperrt.</p></div>
      <div class="karte"><h2>Deine Geräte</h2>${meine.length ? `<ul class="liste">${meine.map((p) => `<li>📱 <b>${esc(p.name || "Gerät")}</b> <small>${p.zuletzt ? "zuletzt " + new Date(p.zuletzt).toLocaleDateString("de-DE") : "noch nicht benutzt"}</small>
        <button type="button" class="knopf klein" data-a="pkEntfernen" data-x="${esc(p.id)}">Entfernen</button></li>`).join("")}</ul>` : "<p>Noch kein Gerät eingerichtet.</p>"}</div>`;
  },
};
AKTIONEN.pkEinrichten = async () => {
  try {
    const o = await serverAktion("passkey_start");
    if (!o?.ok) return toast("Server nicht erreichbar.");
    const c = await navigator.credentials.create({ publicKey: {
      challenge: unb64u(o.challenge), rp: { name: "Bachkreis Bergkamen" }, user: { id: unb64u(o.user.id), name: o.user.name, displayName: o.user.displayName },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none", timeout: 120000,
      excludeCredentials: (o.vorhanden || []).map((id) => ({ type: "public-key", id: unb64u(id) })) } });
    const r = await serverAktion("passkey_registrieren", { id: o.id, name: geraetName(), clientDataJSON: b64u(c.response.clientDataJSON), attestationObject: b64u(c.response.attestationObject) });
    if (!r?.ok) return toast("🔑 " + (FEHLER[r?.fehler] || "Einrichten ging nicht."), 5000);
    toast("✅ Fertig – ab jetzt kannst du dich mit Fingerabdruck/Gesicht anmelden.", 5000); zeichne();
  } catch (e) { if (e?.name === "InvalidStateError") toast(FEHLER.SCHON_EINGERICHTET); else if (e?.name !== "NotAllowedError") toast("🔑 Einrichten ging nicht: " + (e?.message || e)); }
};
AKTIONEN.pkEntfernen = async (id) => {
  const p = hole("passkeys", id); if (!p || !confirm(`„${p.name || "Gerät"}“ entfernen? Danach meldest du dich dort wieder mit dem Code an.`)) return;
  await loesche("passkeys", id); toast("Entfernt"); zeichne();
};
