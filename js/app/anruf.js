// 📞🎥 Anrufe & Videoanrufe (0.50.0, wie KC-CLUB-ANRUF): aus dem Einzelchat anrufen, Klingeln mit Annehmen/Ablehnen, Gespräch mit Stumm,
// Kamera an/aus, Kamera wechseln, Auflegen. Ton und Bild gehen direkt von Gerät zu Gerät; der Server vermittelt nur.
// 🔒 Kinderschutz (Server prüft): Kinder telefonieren nur mit den eigenen Eltern. Admin kann Anrufe abschalten (Module).
import { S, VIEWS, db, zeige, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { hole, liste, abonnieren, istEchtbetrieb, konfig } from "../kern/daten.js";
import { anrufErlaubt, ANRUF_STATUS, ANRUF_ARTEN } from "../kern/schema.js";
import { kinderVon, elternVon } from "../kern/logik.js";
import { senden } from "../kern/versand.js";
import { rtcMoeglich, neueVerbindung, angebotMachen, antwortMachen, antwortSetzen, vermittlung, ANRUF_FEHLER, datenSenden, datenEmpfang } from "../kern/rtc.js";
import { gesicht } from "./gesichter.js";

export const modulAbgeschaltet = (id) => (konfig().module_aus || []).includes(id) && !hatRolle("admin");
const G = { pc: null, strom: null, kanal: null, id: null, art: null, mit: null, start: 0, takt: null, klingel: null, poll: null, demoPc: null, rolle: null };
export const anrufAn = () => rtcMoeglich() && !modulAbgeschaltet("anrufe");
const verwandt = (pid) => [...kinderVon(db, S.ich.id), ...elternVon(db, S.ich.id)].includes(pid);
export const darfAnrufen = (pid) => anrufAn() && anrufErlaubt(S.ich, hole("personen", pid), { verwandt: verwandt(pid) });
export const anrufKnoepfe = (pid) => (darfAnrufen(pid) ? `<button type="button" class="chat-kopf-knopf" data-a="anrufen" data-x="${esc(pid)}|audio" aria-label="Anrufen">📞</button><button type="button" class="chat-kopf-knopf" data-a="anrufen" data-x="${esc(pid)}|video" aria-label="Videoanruf">🎥</button>` : "");

// ---------- Töne ----------
let ac = null;
function ton(muster) {
  try { ac ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch { return () => {}; }
  let aus = false; const spiel = () => { if (aus) return; const t = ac.currentTime; for (const [f, s, d] of muster) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + s); g.gain.exponentialRampToValueAtTime(0.12, t + s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + s + d); o.connect(g).connect(ac.destination); o.start(t + s); o.stop(t + s + d + 0.05); } };
  spiel(); const iv = setInterval(spiel, 3000); return () => { aus = true; clearInterval(iv); };
}
const KLINGELN = [[880, 0, 0.35], [988, 0.4, 0.35], [880, 0.8, 0.35], [988, 1.2, 0.35]], FREIZEICHEN = [[425, 0, 1]];

// ---------- Fenster ----------
function fenster(text) {
  let f = document.getElementById("anrufFenster");
  if (!f) { f = document.createElement("div"); f.id = "anrufFenster"; f.className = "anruf-fenster"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", "Anruf"); document.body.appendChild(f); }
  const p = hole("personen", G.mit), video = G.art === "video";
  f.innerHTML = `<div class="af-kopf"><span class="af-bild" aria-hidden="true">${gesicht(G.mit, "")}</span><div><b>${esc(name(p))}</b><div id="afStatus" class="af-status" aria-live="polite">${esc(text)}</div></div></div>
    <video id="afFern" class="af-fern${video ? "" : " nur-ton"}" autoplay playsinline></video><video id="afEigen" class="af-eigen${video ? "" : " aus"}" autoplay playsinline muted></video>
    <div class="af-knoepfe"><button type="button" class="af-k" data-a="anrufStumm" aria-pressed="false" aria-label="Mikrofon stumm">🎤</button>${video ? '<button type="button" class="af-k" data-a="anrufKamera" aria-pressed="false" aria-label="Kamera aus">📷</button><button type="button" class="af-k" data-a="anrufWechseln" aria-label="Kamera wechseln">🔄</button>' : ""}
      <button type="button" class="af-k rot" data-a="auflegen" aria-label="Auflegen">⏹️</button></div>`;
  if (G.strom) { const e = document.getElementById("afEigen"); e.srcObject = G.strom; }
  return f;
}
const status = (t) => { const s = document.getElementById("afStatus"); if (s) s.textContent = t; };
function verbunden() {
  G.klingel?.(); G.klingel = null; clearInterval(G.poll); G.poll = null; G.start = Date.now();
  clearInterval(G.takt); G.takt = setInterval(() => { const s = Math.floor((Date.now() - G.start) / 1000); status(`🟢 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`); }, 1000);
}
function pcEinrichten(pc) {
  pc.ontrack = (e) => { const v = document.getElementById("afFern"); if (v && v.srcObject !== e.streams[0]) v.srcObject = e.streams[0]; };
  pc.onconnectionstatechange = () => { if (pc.connectionState === "connected") verbunden(); if (pc.connectionState === "failed") { toast("📵 Keine Verbindung möglich – vielleicht blockiert das Netz direkte Verbindungen.", 5000); ende(false); } if (pc.connectionState === "disconnected") status("🟠 Verbindung wackelt …"); };
  pc.ondatachannel = (e) => kanalEinrichten(e.channel);
}
function kanalEinrichten(k) { G.kanal = k; k.onmessage = datenEmpfang((m) => { if (m.auflegen) { toast("📞 Aufgelegt"); ende(false); } }); }
async function medien(art) {
  try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: art === "video" ? { facingMode: "user", width: { ideal: 640 } } : false }); }
  catch { throw new Error(art === "video" ? "Kamera/Mikrofon nicht freigegeben" : "Mikrofon nicht freigegeben"); }
}
// ---------- Anrufen ----------
export async function anrufen(pid, art = "audio") {
  if (G.pc) return toast("Du telefonierst schon.");
  if (!darfAnrufen(pid)) return toast(ANRUF_FEHLER.ANRUF_NICHT_ERLAUBT);
  try {
    G.art = art; G.mit = pid; G.rolle = "ruf"; G.strom = await medien(art);
    fenster(`📳 Es klingelt bei ${name(pid).split(" ")[0]} …`); G.klingel = ton(FREIZEICHEN);
    const pc = (G.pc = neueVerbindung()); pcEinrichten(pc); G.strom.getTracks().forEach((t) => pc.addTrack(t, G.strom)); kanalEinrichten(pc.createDataChannel("bk"));
    const angebot = await angebotMachen(pc);
    const z = await vermittlung.senden({ art, an: [pid], angebot, status: "klingelt" }); G.id = z.id;
    if (istEchtbetrieb()) senden({ an: [pid], betreff: `${art === "video" ? "🎥" : "📞"} ${name(S.ich)} ruft dich an`, text: "Jetzt in der Bachkreis-App annehmen.", ereignis: "nachricht" }).catch(() => {});
    const t0 = Date.now();
    G.poll = setInterval(async () => {
      const r = await vermittlung.holen(G.id).catch(() => null);
      if (r?.antwort && G.pc && !G.pc.remoteDescription) { status("🔗 verbindet …"); await antwortSetzen(G.pc, r.antwort).catch(() => {}); clearInterval(G.poll); G.poll = null; }
      else if (r?.status === "abgelehnt") { toast("✖ Abgelehnt"); ende(false); }
      else if (!istEchtbetrieb() && Date.now() - t0 > 6000 && !r?.antwort) { clearInterval(G.poll); G.poll = null; await vorfuehrGegenstelle(angebot); }
      else if (Date.now() - t0 > 60000) { toast("📵 Niemand hat abgenommen"); vermittlung.senden({ id: G.id, status: "verpasst" }).catch(() => {}); ende(false); }
    }, 2000);
  } catch (e) { toast("⚠️ " + e.message, 4000); ende(false); }
}
// 🧪 Vorführung ohne zweites Gerät: dieses Gerät nimmt selbst ab (eigene Kamera kommt als Gegenstelle zurück)
async function vorfuehrGegenstelle(angebot) {
  status("🧪 Vorführung: Gegenstelle ist dieses Gerät");
  const pc2 = (G.demoPc = neueVerbindung()); G.strom.getTracks().forEach((t) => pc2.addTrack(t.clone(), G.strom));
  pc2.ondatachannel = (e) => { e.channel.onmessage = () => {}; };
  const antwort = await antwortMachen(pc2, angebot); await antwortSetzen(G.pc, antwort);
}
// ---------- Eingehend ----------
const gesehen = new Set();
function eingangPruefen() {
  if (!S.ich || G.pc) return;
  for (const z of vermittlung.eingehend(S.ich.id)) { if (gesehen.has(z.id) || !["audio", "video", "fernhilfe"].includes(z.art)) continue; gesehen.add(z.id); klingeln(z); break; }
}
function klingeln(z) {
  G.art = z.art; G.mit = z.von; G.id = z.id; G.rolle = "ab"; G.klingel = ton(KLINGELN); try { navigator.vibrate?.([400, 200, 400]); } catch {}
  const f = fenster(`${ANRUF_ARTEN[z.art] || "Anruf"} …`);
  f.querySelector("#afFern").classList.add("nur-ton"); f.querySelector("#afEigen").classList.add("aus"); // beim Klingeln noch kein Bild
  f.querySelector(".af-knoepfe").innerHTML = `<button type="button" class="af-k gruen" data-a="anrufAnnehmen" aria-label="Annehmen">${z.art === "video" ? "🎥" : "📞"}</button><button type="button" class="af-k rot" data-a="anrufAblehnen" aria-label="Ablehnen">✖</button>`;
  G.poll = setInterval(async () => { const r = await vermittlung.holen(z.id).catch(() => null); if (!r || ["verpasst", "beendet"].includes(r.status)) { toast(`📵 Verpasster Anruf von ${name(z.von)}`); ende(false); } }, 4000);
}
AKTIONEN.anrufAnnehmen = async () => {
  G.klingel?.(); G.klingel = null; clearInterval(G.poll); G.poll = null;
  if (G.art === "fernhilfe") { const id = G.id; ende(false); return import("./fernhilfe.js").then((m) => m.fernhilfeAnnehmen(id)); }
  try {
    const z = await vermittlung.holen(G.id); if (!z?.angebot) throw new Error("Anruf ist schon vorbei");
    G.strom = await medien(G.art); fenster("🔗 verbindet …");
    const pc = (G.pc = neueVerbindung()); pcEinrichten(pc); G.strom.getTracks().forEach((t) => pc.addTrack(t, G.strom));
    const antwort = await antwortMachen(pc, z.angebot); await vermittlung.senden({ id: G.id, status: "angenommen", antwort });
  } catch (e) { toast("⚠️ " + e.message, 4000); ende(false); }
};
AKTIONEN.anrufAblehnen = () => { vermittlung.senden({ id: G.id, status: "abgelehnt" }).catch(() => {}); ende(false); };
AKTIONEN.anrufen = (x) => { const [pid, art] = String(x).split("|"); anrufen(pid, art || "audio"); };
AKTIONEN.auflegen = () => ende(true);
AKTIONEN.anrufStumm = (_, el) => { const a = G.strom?.getAudioTracks()[0]; if (!a) return; a.enabled = !a.enabled; el.setAttribute("aria-pressed", String(!a.enabled)); el.classList.toggle("aus", !a.enabled); el.textContent = a.enabled ? "🎤" : "🔇"; };
AKTIONEN.anrufKamera = (_, el) => { const v = G.strom?.getVideoTracks()[0]; if (!v) return; v.enabled = !v.enabled; el.setAttribute("aria-pressed", String(!v.enabled)); el.classList.toggle("aus", !v.enabled); };
AKTIONEN.anrufWechseln = async () => {
  const alt = G.strom?.getVideoTracks()[0]; if (!alt || !G.pc) return; const vorn = (alt.getSettings().facingMode || "user") === "user";
  try { const neu = (await navigator.mediaDevices.getUserMedia({ video: { facingMode: vorn ? "environment" : "user" } })).getVideoTracks()[0];
    await G.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(neu); G.strom.removeTrack(alt); alt.stop(); G.strom.addTrack(neu); document.getElementById("afEigen").srcObject = G.strom; } catch { toast("Nur eine Kamera gefunden"); }
};
export function ende(selbst) {
  if (selbst) { datenSenden(G.kanal, { auflegen: 1 }); if (G.id) vermittlung.senden({ id: G.id, status: G.pc?.connectionState === "connected" ? "beendet" : G.rolle === "ruf" ? "verpasst" : "beendet" }).catch(() => {}); }
  G.klingel?.(); clearInterval(G.poll); clearInterval(G.takt);
  try { G.pc?.close(); G.demoPc?.close(); } catch {}
  G.strom?.getTracks().forEach((t) => t.stop());
  Object.assign(G, { pc: null, strom: null, kanal: null, id: null, mit: null, takt: null, klingel: null, poll: null, demoPc: null, rolle: null });
  document.getElementById("anrufFenster")?.remove();
}
export const anrufLaeuft = () => !!G.pc || !!document.getElementById("anrufFenster");

// ---------- Liste ----------
VIEWS.anrufe = {
  render() {
    const l = liste("anrufe", (z) => ["audio", "video", "fernhilfe"].includes(z.art) && (z.von === S.ich?.id || (z.an || []).includes(S.ich?.id))).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn))).slice(0, 30);
    return kopf("📞 Anrufe") + `<p class="hinweis">Anrufen geht im Einzelchat über 📞 oder 🎥. Ton und Bild gehen direkt von Gerät zu Gerät – nichts wird aufgezeichnet.</p>
      <div class="karte"><ul class="liste">${l.map((z) => { const ich = z.von === S.ich.id, mit = ich ? z.an[0] : z.von; return `<li><span aria-hidden="true">${z.status === "verpasst" && !ich ? "📵" : ich ? "↗️" : "↙️"}</span><div class="fl"><b>${esc(name(mit))}</b><div class="zeile-unter">${esc(ANRUF_ARTEN[z.art] || "")} · ${esc(ANRUF_STATUS[z.status] || "")} · ${esc(new Date(z.beginn).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}</div></div>${darfAnrufen(mit) ? `<button type="button" class="knopf klein" data-a="anrufen" data-x="${esc(mit)}|audio" aria-label="${esc(name(mit))} zurückrufen">📞</button>` : ""}</li>`; }).join("") || "<li>Noch keine Anrufe.</li>"}</ul></div>`;
  },
};
export const verpassteAnrufe = () => liste("anrufe", (z) => z.status === "verpasst" && (z.an || []).includes(S.ich?.id) && Date.now() - new Date(z.beginn).getTime() < 3 * 86400000).length;

if (typeof document !== "undefined") {
  vermittlung.wer = () => S.ich?.id || null;
  vermittlung.hoeren(() => eingangPruefen());
  let abo = false; // Datenquelle steht erst nach dem Start bereit
  setInterval(() => {
    if (!abo) try { abonnieren((tabs) => { if (!tabs || tabs.includes?.("anrufe")) eingangPruefen(); }); abo = true; } catch {}
    if (!document.hidden) eingangPruefen();
  }, 3000); // nur lokal – fragt nicht den Server
  window.addEventListener("pagehide", () => { if (G.pc) ende(true); });
}
export const anrufZeigen = () => zeige("anrufe");
