// 🪑 Runder Tisch (0.50.0, wie KC-CLUB-RUNDER-TISCH): Online-Treffen mit Bild und Ton für bis zu 8 Erwachsene – z. B. zur Sitzung,
// wenn jemand nicht kommen kann. Jeder ist mit jedem direkt verbunden (Gerät zu Gerät, verschlüsselt), der Server vermittelt nur.
// Wer später kommt, ruft die schon Anwesenden an; die antworten automatisch. Knöpfe: Mikro, Kamera, Bildschirm teilen, ✋ Hand heben, Verlassen.
import { S, VIEWS, zeige, zeichne, kopf, name } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { istEchtbetrieb, liste, hole } from "../kern/daten.js";
import { erwachsen } from "../kern/schema.js";
import { rtcMoeglich, neueVerbindung, angebotMachen, antwortMachen, antwortSetzen, vermittlung, ANRUF_FEHLER, datenSenden, datenEmpfang } from "../kern/rtc.js";
import { modulAbgeschaltet, anrufLaeuft } from "./anruf.js";

export const TISCH_MAX = 8;
const TAKT = 5000, LEBT = 30000, FRISCH = 90000;
const T = { raum: null, strom: null, kamera: null, teilen: null, da: null, seit: null, peers: new Map(), namen: {}, hand: false, poll: null, puls: null, versucht: new Map() };
export const tischDa = () => rtcMoeglich() && erwachsen(S.ich) && !modulAbgeschaltet("tisch");
export const amTisch = () => !!T.raum;

function raeume() {
  const r = [{ id: "bachkreis", t: "🪑 Offener Tisch", u: "für alle Erwachsenen im Bachkreis" }];
  for (const s of liste("versammlungen", (x) => x.status !== "beendet" && Math.abs(new Date(x.beginn) - Date.now()) < 7 * 86400000)) r.push({ id: s.id, t: `🎬 ${s.titel}`, u: new Date(s.beginn).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) });
  return r;
}
const raumTitel = (id) => raeume().find((r) => r.id === id)?.t || "🪑 Runder Tisch";
const lebendig = (z) => z.art === "tisch_da" && z.status !== "beendet" && Date.now() - new Date(z.ende || z.beginn).getTime() < FRISCH;

// ---------- Verbindungen ----------
function peerNeu(pid, rolle) {
  const pc = neueVerbindung(), p = { pid, pc, rolle, kanal: null, strom: null, hand: false, seit: Date.now(), zeile: null };
  T.peers.set(pid, p);
  (T.strom?.getTracks() || []).forEach((t) => pc.addTrack(t, T.strom));
  pc.ontrack = (e) => { p.strom = e.streams[0]; kachelVideo(pid); };
  pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) peerWeg(pid); else kachelStatus(pid); };
  pc.ondatachannel = (e) => kanalDran(p, e.channel);
  if (rolle === "ruf") kanalDran(p, pc.createDataChannel("tisch"));
  return p;
}
function kanalDran(p, k) {
  p.kanal = k;
  k.onopen = () => datenSenden(k, { hand: T.hand });
  k.onmessage = datenEmpfang((m) => { if ("hand" in m) { p.hand = !!m.hand; kachelStatus(p.pid); if (p.hand) toast(`✋ ${name(p.pid) !== "–" ? name(p.pid) : T.namen[p.pid] || "Jemand"} meldet sich`); } if (m.weg) peerWeg(p.pid); });
}
function peerWeg(pid) {
  const p = T.peers.get(pid); if (!p) return;
  try { p.pc.close(); } catch {}
  T.peers.delete(pid); T.versucht.set(pid, Date.now()); zeichneGitter();
}
async function runde() {
  if (!T.raum) return;
  let lage;
  try { lage = await vermittlung.tisch(T.raum); } catch { return; }
  if (!T.raum) return;
  Object.assign(T.namen, lage.namen || {});
  const ich = S.ich.id, da = lage.zeilen.filter(lebendig), andere = new Map(da.filter((z) => z.von !== ich).map((z) => [z.von, z]));
  // weg sind, wer nicht mehr anwesend ist
  for (const pid of [...T.peers.keys()]) if (!andere.has(pid)) peerWeg(pid);
  // eingehende Angebote beantworten (die Früheren antworten den Späteren)
  for (const z of lage.zeilen.filter((x) => x.art === "tisch" && x.status === "klingelt" && (x.an || []).includes(ich) && x.angebot && andere.has(x.von))) {
    const alt = T.peers.get(z.von); if (alt?.zeile === z.id) continue;
    if (alt) peerWeg(z.von);
    const p = peerNeu(z.von, "ab"); p.zeile = z.id;
    try { const antwort = await antwortMachen(p.pc, z.angebot); await vermittlung.senden({ id: z.id, status: "angenommen", antwort }); } catch { peerWeg(z.von); }
  }
  // meine Angebote: Antwort setzen; ohne Antwort nach 40 s aufgeben
  for (const p of T.peers.values()) {
    if (p.rolle !== "ruf" || p.pc.remoteDescription) continue;
    const z = lage.zeilen.find((x) => x.id === p.zeile);
    if (z?.antwort) await antwortSetzen(p.pc, z.antwort).catch(() => peerWeg(p.pid));
    else if (Date.now() - p.seit > 40000) { if (p.zeile) vermittlung.senden({ id: p.zeile, status: "verpasst" }).catch(() => {}); peerWeg(p.pid); }
  }
  // die Späteren rufen die Früheren an
  const meinBeginn = T.seit;
  for (const [pid, z] of andere) {
    if (T.peers.has(pid) || T.peers.size >= TISCH_MAX - 1) continue;
    if (new Date(z.beginn).getTime() > new Date(meinBeginn).getTime()) continue; // der andere kam später → er ruft mich
    if (Date.now() - (T.versucht.get(pid) || 0) < 60000) continue;
    const p = peerNeu(pid, "ruf"); T.versucht.set(pid, Date.now());
    try { const angebot = await angebotMachen(p.pc); const r = await vermittlung.senden({ art: "tisch", raum_id: T.raum, an: [pid], angebot, status: "klingelt" }); p.zeile = r.id; } catch { peerWeg(pid); }
  }
  zeichneGitter();
}

// ---------- Beitreten / Verlassen ----------
async function beitreten(raum) {
  if (!tischDa()) return toast(ANRUF_FEHLER.NUR_ERWACHSENE);
  if (anrufLaeuft()) return toast("Erst das Telefonat beenden.");
  if (T.raum) verlassen();
  try { T.strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 480 } } }); }
  catch { try { T.strom = await navigator.mediaDevices.getUserMedia({ audio: true }); toast("📷 Ohne Kamera – nur Ton"); } catch { return toast("⚠️ Mikrofon nicht freigegeben", 4000); } }
  T.kamera = T.strom.getVideoTracks()[0] || null;
  try { const z = await vermittlung.senden({ art: "tisch_da", raum_id: raum, an: [], status: "angenommen" }); T.da = z.id; T.seit = z.beginn; }
  catch (e) { T.strom.getTracks().forEach((t) => t.stop()); T.strom = null; return toast("⚠️ " + e.message, 4000); }
  T.raum = raum; T.hand = false; T.versucht.clear();
  zeichne(); runde();
  T.poll = setInterval(() => { if (!document.hidden || T.peers.size) runde(); }, TAKT);
  T.puls = setInterval(() => vermittlung.senden({ id: T.da, lebt: 1, ende: new Date().toISOString() }).catch(() => {}), LEBT);
}
export function verlassen() {
  if (!T.raum) return;
  for (const p of T.peers.values()) { datenSenden(p.kanal, { weg: 1 }); try { p.pc.close(); } catch {} }
  if (T.da) vermittlung.senden({ id: T.da, status: "beendet" }).catch(() => {});
  clearInterval(T.poll); clearInterval(T.puls);
  [T.strom, T.teilen].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
  Object.assign(T, { raum: null, strom: null, kamera: null, teilen: null, da: null, seit: null, hand: false, poll: null, puls: null });
  T.peers.clear();
}

// ---------- Anzeige ----------
const wer = (pid) => (hole("personen", pid) ? name(pid) : T.namen[pid] || "Gast");
function kachelHtml(pid, ich) {
  const p = T.peers.get(pid), hand = ich ? T.hand : p?.hand, st = ich ? "" : p?.pc.connectionState === "connected" ? "" : "🔗 verbindet …";
  return `<figure class="ti-kachel${hand ? " hand" : ""}" data-pid="${esc(pid)}"><video autoplay playsinline ${ich ? "muted" : ""}></video>
    <figcaption>${hand ? '<span aria-label="meldet sich">✋</span> ' : ""}${esc(ich ? "Du" : wer(pid))}${st ? ` <small>${st}</small>` : ""}</figcaption></figure>`;
}
function zeichneGitter() {
  const g = document.getElementById("tiGitter"); if (!g || !T.raum) return;
  const ids = [S.ich.id, ...T.peers.keys()];
  // vorhandene Kacheln behalten (sonst springt das Bild), neue anhängen, alte entfernen
  for (const f of [...g.children]) if (!ids.includes(f.dataset.pid)) f.remove();
  for (const pid of ids) {
    let f = g.querySelector(`[data-pid="${CSS.escape(pid)}"]`);
    if (!f) { g.insertAdjacentHTML("beforeend", kachelHtml(pid, pid === S.ich.id)); f = g.lastElementChild; }
    kachelVideo(pid); kachelStatus(pid);
  }
  g.dataset.n = String(Math.min(ids.length, 9));
  const z = document.getElementById("tiZahl"); if (z) z.textContent = `${ids.length} am Tisch`;
}
function kachelVideo(pid) {
  const v = document.querySelector(`#tiGitter [data-pid="${CSS.escape(pid)}"] video`); if (!v) return;
  const s = pid === S.ich.id ? T.teilen || T.strom : T.peers.get(pid)?.strom;
  if (s && v.srcObject !== s) v.srcObject = s;
}
function kachelStatus(pid) {
  const f = document.querySelector(`#tiGitter [data-pid="${CSS.escape(pid)}"]`); if (!f) return;
  const ich = pid === S.ich.id, p = T.peers.get(pid), hand = ich ? T.hand : p?.hand, st = ich || p?.pc.connectionState === "connected" ? "" : "🔗 verbindet …";
  f.classList.toggle("hand", !!hand);
  f.querySelector("figcaption").innerHTML = `${hand ? '<span aria-label="meldet sich">✋</span> ' : ""}${esc(ich ? "Du" : wer(pid))}${st ? ` <small>${st}</small>` : ""}`;
}
const knopf = (a, sym, t, an) => `<button type="button" class="ti-k${an ? " aus" : ""}" data-a="${a}" aria-pressed="${!!an}" aria-label="${esc(t)}" title="${esc(t)}">${sym}</button>`;

VIEWS.tisch = {
  render({ raum } = {}) {
    if (!tischDa()) return kopf("🪑 Runder Tisch") + `<p class="hinweis">${rtcMoeglich() ? "Der Runde Tisch ist nur für Erwachsene." : "Dieses Gerät kann keine Video-Verbindungen."}</p>`;
    if (T.raum) {
      const mik = T.strom?.getAudioTracks()[0], kam = T.kamera;
      return kopf(raumTitel(T.raum), `<span id="tiZahl" class="badge"></span>`) + `<div id="tiGitter" class="ti-gitter" data-n="1"></div>
        ${!istEchtbetrieb() ? '<p class="hinweis">🧪 Vorführung: Öffne die App in einem zweiten Tab, wähle dort oben eine andere erwachsene Person und setz dich an denselben Tisch.</p>' : ""}
        <div class="ti-leiste" role="toolbar" aria-label="Runder Tisch">${knopf("tiMikro", mik?.enabled === false ? "🔇" : "🎤", "Mikrofon stumm", mik?.enabled === false)}${kam ? knopf("tiKamera", "📷", "Kamera aus", kam.enabled === false) : ""}
          ${navigator.mediaDevices?.getDisplayMedia ? knopf("tiTeilen", "🖥️", T.teilen ? "Teilen beenden" : "Bildschirm teilen", !!T.teilen) : ""}${knopf("tiHand", "✋", "Hand heben", T.hand)}
          <button type="button" class="ti-k rot" data-a="tiVerlassen" aria-label="Tisch verlassen" title="Tisch verlassen">🚪</button></div>`;
    }
    const r = raeume(), vor = raum && r.find((x) => x.id === raum);
    return kopf("🪑 Runder Tisch") + `<p class="hinweis">Online-Treffen mit Bild und Ton – bis zu ${TISCH_MAX} Personen. Alles geht direkt von Gerät zu Gerät, nichts wird aufgezeichnet.</p>
      <div class="karte"><ul class="liste">${(vor ? [vor] : r).map((x) => `<li><div class="fl"><b>${esc(x.t)}</b><div class="zeile-unter">${esc(x.u)}</div></div><button type="button" class="knopf haupt" data-a="tiBeitreten" data-x="${esc(x.id)}">🪑 Platz nehmen</button></li>`).join("")}</ul></div>
      ${vor && r.length > 1 ? '<button type="button" class="knopf" data-a="tiAlle">Andere Tische</button>' : ""}`;
  },
  nach() { zeichneGitter(); },
};
AKTIONEN.tiBeitreten = (raum) => beitreten(raum);
AKTIONEN.tiOeffnen = (raum) => zeige("tisch", { raum });
AKTIONEN.tiAlle = () => zeige("tisch", {}, { ersetzen: true });
AKTIONEN.tiVerlassen = () => { verlassen(); toast("🚪 Tisch verlassen"); zeichne(); };
AKTIONEN.tiMikro = (_, el) => { const a = T.strom?.getAudioTracks()[0]; if (!a) return; a.enabled = !a.enabled; el.textContent = a.enabled ? "🎤" : "🔇"; el.classList.toggle("aus", !a.enabled); el.setAttribute("aria-pressed", String(!a.enabled)); };
AKTIONEN.tiKamera = (_, el) => { if (!T.kamera) return; T.kamera.enabled = !T.kamera.enabled; el.classList.toggle("aus", !T.kamera.enabled); el.setAttribute("aria-pressed", String(!T.kamera.enabled)); };
AKTIONEN.tiHand = (_, el) => { T.hand = !T.hand; el.classList.toggle("aus", T.hand); el.setAttribute("aria-pressed", String(T.hand)); for (const p of T.peers.values()) datenSenden(p.kanal, { hand: T.hand }); kachelStatus(S.ich.id); };
const videoSetzen = (track) => { for (const p of T.peers.values()) p.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track).catch(() => {}); };
function teilenEnde() { T.teilen?.getTracks().forEach((t) => t.stop()); T.teilen = null; if (T.kamera) videoSetzen(T.kamera); kachelVideo(S.ich.id); if (S.view === "tisch") zeichne(); }
AKTIONEN.tiTeilen = async () => {
  if (T.teilen) return teilenEnde();
  if (!T.kamera) return toast("Bildschirm teilen geht nur, wenn die Kamera dabei ist.");
  try { T.teilen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); } catch { return; }
  const t = T.teilen.getVideoTracks()[0]; t.onended = teilenEnde; videoSetzen(t); kachelVideo(S.ich.id); zeichne();
};
if (typeof window !== "undefined") window.addEventListener("pagehide", () => verlassen());
export const tischOeffnen = (raum) => zeige("tisch", { raum });
