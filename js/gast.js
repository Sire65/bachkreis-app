// 🙋 Gast am Runden Tisch (0.51.0, wie KC-CLUB-RUNDER-TISCH-GAST): Seite für eingeladene Gäste ohne Konto.
// Der Link (#t=…) gilt nur für EINEN Tisch und läuft ab. Der Gast sieht nur, wer am Tisch sitzt – keine Daten aus der App.
// Verbindungen wie in der App über den gemeinsamen Kern (kern/tischnetz.js); Ton und Bild gehen direkt von Gerät zu Gerät.
import { UMGEBUNG } from "./kern/umgebung.js";
import { iceSetzen, rtcMoeglich, datenSenden } from "./kern/rtc.js";
import { tischNetz } from "./kern/tischnetz.js";

const SERVER_AKTION = "gast_tisch"; // Server-Aktion ohne Anmeldung (nur mit Gast-Link)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const G = { token: null, ich: null, raum: null, name: "", strom: null, kamera: null, poll: null, puls: null, da: null, hand: false, namen: {} };
const inhalt = () => document.getElementById("inhalt");
const meldung = (t) => { inhalt().innerHTML = `<div class="karte gast-kopf"><img src="icons/logo.png" alt="" width="56" height="56"><h1>Runder Tisch</h1></div><div class="karte" role="alert"><p>${t}</p></div>`; };

// Link lesen und aus der Adresszeile nehmen (bleibt nur in diesem Tab gespeichert)
function tokenLesen() {
  const m = /[#&]t=([^&]+)/.exec(location.hash);
  if (m) { try { sessionStorage.setItem("bk_gast", decodeURIComponent(m[1])); } catch {} history.replaceState(null, "", location.pathname); }
  try { return sessionStorage.getItem("bk_gast"); } catch { return m ? decodeURIComponent(m[1]) : null; }
}
async function api(unter, rest = {}) {
  const r = await fetch(UMGEBUNG.apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion: SERVER_AKTION, token: G.token, unter, ...rest }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw Object.assign(new Error(j.fehler || "Fehler " + r.status), { code: j.fehler });
  return j;
}
const neueId = () => (crypto.randomUUID ? crypto.randomUUID() : "g" + Date.now().toString(36) + Math.random().toString(36).slice(2));
const vermittlung = {
  async senden(z) { return (await api("speichern", { zeile: { id: z.id || neueId(), ...z } })).zeile; },
  async tisch() { const l = await api("lage"); Object.assign(G.namen, l.namen || {}); return { zeilen: l.zeilen || [], namen: l.namen || {} }; },
};
const NETZ = tischNetz({ ich: () => G.ich, vermittlung, strom: () => G.strom, beiAenderung: () => gitter(),
  beiOffen: (p) => datenSenden(p.kanal, { hand: G.hand }),
  beiNachricht: (p, m) => { if ("hand" in m) { p.hand = !!m.hand; gitter(); } } });

const wer = (pid) => G.namen[pid] || "Teilnehmer/in";
function gitter() {
  const g = document.getElementById("tiGitter"); if (!g) return;
  const ids = [G.ich, ...NETZ.N.peers.keys()];
  for (const f of [...g.children]) if (!ids.includes(f.dataset.pid)) f.remove();
  for (const pid of ids) {
    let f = [...g.children].find((x) => x.dataset.pid === pid);
    if (!f) { g.insertAdjacentHTML("beforeend", `<figure class="ti-kachel" data-pid="${esc(pid)}"><video autoplay playsinline ${pid === G.ich ? "muted" : ""}></video><figcaption></figcaption></figure>`); f = g.lastElementChild; }
    const p = NETZ.N.peers.get(pid), s = pid === G.ich ? G.strom : p?.strom, v = f.querySelector("video");
    if (s && v.srcObject !== s) v.srcObject = s;
    const hand = pid === G.ich ? G.hand : p?.hand; f.classList.toggle("hand", !!hand);
    f.querySelector("figcaption").textContent = `${hand ? "✋ " : ""}${pid === G.ich ? "Du" : wer(pid)}${pid !== G.ich && p?.pc.connectionState !== "connected" ? " · verbindet …" : ""}`;
  }
  g.dataset.n = String(Math.min(ids.length, 9));
}
function vorraum(lage) {
  const da = (lage.zeilen || []).filter((z) => z.art === "tisch_da" && z.status !== "beendet").map((z) => lage.namen?.[z.von || z.gast]).filter(Boolean);
  inhalt().innerHTML = `<div class="karte gast-kopf"><img src="icons/logo.png" alt="" width="56" height="56"><div><h1>Runder Tisch</h1><p>Hallo <b>${esc(G.name)}</b> – schön, dass du dabei bist!</p></div></div>
    <div class="karte"><p>${da.length ? `🟢 ${esc(da.join(", "))} ${da.length === 1 ? "sitzt" : "sitzen"} schon am Tisch.` : "Noch sitzt niemand am Tisch – du kannst trotzdem schon Platz nehmen."}</p>
    <p class="hinweis">Ton und Bild gehen direkt von Gerät zu Gerät, nichts wird aufgezeichnet. Dein Browser fragt gleich nach Kamera und Mikrofon.</p>
    <button type="button" class="knopf haupt breit" id="gPlatz">🪑 Platz nehmen</button></div>`;
  document.getElementById("gPlatz").onclick = platzNehmen;
}
async function platzNehmen() {
  try { G.strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 480 } } }); }
  catch { try { G.strom = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return alert("Bitte Mikrofon erlauben – sonst hört dich niemand."); } }
  G.kamera = G.strom.getVideoTracks()[0] || null;
  try { const z = await vermittlung.senden({ art: "tisch_da" }); G.da = z.id; NETZ.N.raum = G.raum; NETZ.N.seit = z.beginn; }
  catch (e) { return meldung(e.code === "LINK_UNGUELTIG" ? "Der Link ist abgelaufen oder wurde zurückgezogen." : "Platz nehmen ging nicht – bitte gleich nochmal versuchen."); }
  inhalt().innerHTML = `<div class="karte gast-kopf"><h1>🪑 Runder Tisch</h1></div><div id="tiGitter" class="ti-gitter" data-n="1"></div>
    <div class="ti-leiste" role="toolbar" aria-label="Runder Tisch"><button type="button" class="ti-k" id="gMik" aria-pressed="false" aria-label="Mikrofon stumm">🎤</button>${G.kamera ? '<button type="button" class="ti-k" id="gKam" aria-pressed="false" aria-label="Kamera aus">📷</button>' : ""}
    <button type="button" class="ti-k" id="gHand" aria-pressed="false" aria-label="Hand heben">✋</button><button type="button" class="ti-k rot" id="gWeg" aria-label="Tisch verlassen">🚪</button></div>`;
  const um = (el, an) => { el.classList.toggle("aus", an); el.setAttribute("aria-pressed", String(an)); };
  document.getElementById("gMik").onclick = (e) => { const a = G.strom.getAudioTracks()[0]; a.enabled = !a.enabled; e.currentTarget.textContent = a.enabled ? "🎤" : "🔇"; um(e.currentTarget, !a.enabled); };
  if (G.kamera) document.getElementById("gKam").onclick = (e) => { G.kamera.enabled = !G.kamera.enabled; um(e.currentTarget, !G.kamera.enabled); };
  document.getElementById("gHand").onclick = (e) => { G.hand = !G.hand; um(e.currentTarget, G.hand); NETZ.alleSenden({ hand: G.hand }); gitter(); };
  document.getElementById("gWeg").onclick = verlassen;
  gitter(); NETZ.runde();
  G.poll = setInterval(() => NETZ.runde().catch(() => {}), 5000);
  G.puls = setInterval(() => vermittlung.senden({ id: G.da, lebt: 1 }).catch(() => {}), 30000);
}
function verlassen() {
  NETZ.schliessen(); clearInterval(G.poll); clearInterval(G.puls);
  if (G.da) vermittlung.senden({ id: G.da, status: "beendet" }).catch(() => {});
  G.strom?.getTracks().forEach((t) => t.stop()); G.strom = null; G.da = null;
  meldung("Danke fürs Dabeisein! 👋 Du kannst das Fenster jetzt schließen – mit demselben Link kommst du wieder an den Tisch, solange er gilt.");
}
addEventListener("pagehide", () => { if (G.da) verlassen(); });

async function start() {
  G.token = tokenLesen();
  if (!UMGEBUNG.apiUrl) return meldung("🧪 Das ist die Vorführversion – Gast-Links funktionieren nur im Echtbetrieb.");
  if (!rtcMoeglich()) return meldung("Dieser Browser kann leider keine Video-Verbindungen. Bitte einen aktuellen Browser nehmen (Chrome, Safari, Firefox, Edge).");
  if (!G.token) return meldung("Der Link ist unvollständig. Bitte den ganzen Link aus der Einladung öffnen.");
  try { const l = await api("lage"); G.ich = l.ich; G.raum = l.raum; G.name = l.name; iceSetzen(l.ice); Object.assign(G.namen, l.namen || {}); vorraum(l); }
  catch (e) { meldung(e.code === "LINK_UNGUELTIG" ? "Der Link ist abgelaufen oder wurde zurückgezogen. Bitte um eine neue Einladung." : e.code === "MODUL_AUS" ? "Der Runde Tisch ist gerade abgeschaltet." : "Der Bachkreis-Server antwortet gerade nicht. Bitte später nochmal versuchen."); }
}
start();
