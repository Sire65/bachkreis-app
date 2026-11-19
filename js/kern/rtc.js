// 📞 Verbindungs-Kern für Anrufe, Runden Tisch und Fernhilfe (0.50.0). Ton, Bild und Daten laufen direkt von Gerät zu Gerät (WebRTC, verschlüsselt);
// der Server vermittelt nur den Aufbau (ein Angebot, eine Antwort – ohne „Trickle“, damit nur wenige Anfragen nötig sind).
// Server für den Verbindungsaufbau (STUN/TURN) kommen aus der Konfiguration (konfig rtc_server) – Standard: ein öffentlicher, kostenloser STUN-Server.
// Vermittlung als Adapter: im Echtbetrieb über den Club-Server (speichern/anruf_lage/tisch_lage), in der Vorführung über einen BroadcastChannel
// (zwei Tabs im selben Browser können sich wirklich anrufen).
import { konfig, istEchtbetrieb, serverAktion, serverAktionStill, liste, neueId } from "./daten.js";

// 👋 0.51.0 Brücke fürs Anklopfen „📞 Sprechen“: anruf.js trägt ein, online.js ruft (ohne Kreis-Import)
export const ANRUF_BRUECKE = { darf: null, rufen: null };
export const STANDARD_ICE = [{ urls: "stun:stun.l.google.com:19302" }];
let ICE_VORGABE = null; // 🙋 0.51.0 Gast-Seite: Server-Liste kommt vom Server (ohne App-Daten)
export const iceSetzen = (l) => { ICE_VORGABE = Array.isArray(l) && l.length ? l : null; };
export const iceServer = () => { if (ICE_VORGABE) return ICE_VORGABE; try { const k = konfig().rtc_server; return Array.isArray(k) && k.length ? k : STANDARD_ICE; } catch { return STANDARD_ICE; } };
export const rtcMoeglich = () => typeof RTCPeerConnection !== "undefined";
export function neueVerbindung() { return new RTCPeerConnection({ iceServers: iceServer() }); }
// alle Kandidaten sammeln (höchstens 3 s), dann die fertige Beschreibung zurückgeben
async function gesammelt(pc) {
  if (pc.iceGatheringState !== "complete") await new Promise((ok) => { const t = setTimeout(ok, 3000); pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } }); });
  return { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
}
export async function angebotMachen(pc) { await pc.setLocalDescription(await pc.createOffer()); return gesammelt(pc); }
export async function antwortMachen(pc, angebot) { await pc.setRemoteDescription(angebot); await pc.setLocalDescription(await pc.createAnswer()); return gesammelt(pc); }
export const antwortSetzen = (pc, antwort) => pc.setRemoteDescription(antwort);

// ---------- Vermittlung (Adapter) ----------
const DEMO = { kanal: null, zeilen: new Map(), hoerer: new Set() };
function demoKanal() {
  if (DEMO.kanal || typeof BroadcastChannel === "undefined") return DEMO.kanal;
  DEMO.kanal = new BroadcastChannel("bk-rtc");
  // neuer Tab fragt „wer ist da?“ – die anderen schicken ihre Zeilen noch einmal (sonst sähe er den Runden Tisch leer)
  DEMO.kanal.onmessage = (e) => { const z = e.data; if (z?.hallo) { for (const x of DEMO.zeilen.values()) DEMO.kanal.postMessage(x); return; } if (!z?.id) return; DEMO.zeilen.set(z.id, { ...(DEMO.zeilen.get(z.id) || {}), ...z }); for (const f of DEMO.hoerer) try { f(DEMO.zeilen.get(z.id)); } catch {} };
  DEMO.kanal.postMessage({ hallo: 1 });
  return DEMO.kanal;
}
export const vermittlung = {
  wer: () => null, // setzt die App (wer bin ich) – nur für die Vorführung
  async senden(zeile) {
    const z = { id: zeile.id || neueId(), beginn: zeile.beginn || new Date().toISOString(), ...zeile };
    if (istEchtbetrieb()) { const r = await serverAktion("speichern", { tab: "anrufe", zeilen: [z] }); if (r?.konflikte?.length) throw new Error(ANRUF_FEHLER[r.konflikte[0].grund] || r.konflikte[0].grund); return r?.gespeichert?.[0] || z; }
    const alt = DEMO.zeilen.get(z.id), neu = { ...(alt || {}), ...z, von: alt?.von || z.von || vermittlung.wer() }; DEMO.zeilen.set(z.id, neu); demoKanal()?.postMessage(neu); return neu; // Vorführung: Absender setzt sonst der Server
  },
  async holen(id) {
    if (istEchtbetrieb()) { const r = await serverAktionStill("anruf_lage", { id }); return r?.anruf || null; }
    return DEMO.zeilen.get(id) || null;
  },
  async tisch(raum) {
    if (istEchtbetrieb()) { const r = await serverAktionStill("tisch_lage", { raum }); return { zeilen: r?.zeilen || [], namen: r?.namen || {} }; }
    return { zeilen: [...DEMO.zeilen.values()].filter((z) => z.raum_id === raum), namen: {} };
  },
  // eingehende Anrufe: Vorführung sofort über den Kanal; Echtbetrieb über den normalen Abgleich (und Push)
  hoeren(f) { demoKanal(); DEMO.hoerer.add(f); return () => DEMO.hoerer.delete(f); },
  eingehend(ich) {
    const frisch = (z) => z && z.status === "klingelt" && (z.an || []).includes(ich) && Date.now() - new Date(z.beginn).getTime() < 70000;
    return [...(istEchtbetrieb() ? liste("anrufe") : []), ...DEMO.zeilen.values()].filter(frisch);
  },
};
export const ANRUF_FEHLER = { ANRUF_NICHT_ERLAUBT: "🔒 Mit dieser Person kannst du nicht telefonieren (Kinderschutz).", NUR_ERWACHSENE: "🔒 Nur für Erwachsene.", MODUL_AUS: "Diese Funktion ist gerade abgeschaltet.", GENAU_EINE_PERSON: "Bitte genau eine Person wählen." };

// ---------- Daten-Kanal: Nachrichten in Stücken (Bilder für die Fernhilfe) ----------
export function datenSenden(kanal, obj) {
  if (!kanal || kanal.readyState !== "open") return false;
  const s = JSON.stringify(obj), n = 15000, id = Math.random().toString(36).slice(2, 8);
  if (s.length <= n) { kanal.send(s); return true; }
  for (let i = 0, t = Math.ceil(s.length / n); i < t; i++) kanal.send(JSON.stringify({ _st: id, i, t, d: s.slice(i * n, (i + 1) * n) }));
  return true;
}
export function datenEmpfang(f) {
  const teile = new Map();
  return (e) => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m?._st) { const l = teile.get(m._st) || []; l[m.i] = m.d; teile.set(m._st, l); if (l.filter((x) => x != null).length === m.t) { teile.delete(m._st); try { f(JSON.parse(l.join(""))); } catch {} } return; }
    f(m);
  };
}
