// 🪑 Netz am Runden Tisch (0.51.0, aus tisch.js herausgelöst): jeder mit jedem direkt verbunden. Wer später kommt, ruft die Früheren an,
// die Früheren antworten. Wird von der App (tisch.js) und von der Gast-Seite (gast.js) benutzt – dieselbe Logik, ein Kern.
// Kennungen: Personen über „von“, Gäste über „gast“ (gast-…).
import { neueVerbindung, angebotMachen, antwortMachen, antwortSetzen, datenSenden, datenEmpfang } from "./rtc.js";

export const FRISCH = 90000;
export const pidVon = (z) => z.von || z.gast;
export const lebendig = (z) => z.art === "tisch_da" && z.status !== "beendet" && Date.now() - new Date(z.ende || z.beginn).getTime() < FRISCH;

export function tischNetz({ ich, vermittlung, strom, max = () => 8, beiAenderung = () => {}, beiNachricht = () => {}, beiOffen = () => {} }) {
  const N = { peers: new Map(), versucht: new Map(), namen: {}, raum: null, seit: null };
  function peerNeu(pid, rolle) {
    const pc = neueVerbindung(), p = { pid, pc, rolle, kanal: null, strom: null, hand: false, seit: Date.now(), zeile: null };
    N.peers.set(pid, p);
    const s = strom(); (s?.getTracks() || []).forEach((t) => pc.addTrack(t, s));
    pc.ontrack = (e) => { p.strom = e.streams[0]; beiAenderung(pid); };
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) peerWeg(pid); else beiAenderung(pid); };
    pc.ondatachannel = (e) => kanalDran(p, e.channel);
    if (rolle === "ruf") kanalDran(p, pc.createDataChannel("tisch"));
    return p;
  }
  function kanalDran(p, k) {
    p.kanal = k;
    k.onopen = () => beiOffen(p);
    k.onmessage = datenEmpfang((m) => { if (m.weg) peerWeg(p.pid); else beiNachricht(p, m); });
  }
  function peerWeg(pid) {
    const p = N.peers.get(pid); if (!p) return;
    try { p.pc.close(); } catch {}
    N.peers.delete(pid); N.versucht.set(pid, Date.now()); beiAenderung(pid);
  }
  async function runde() {
    if (!N.raum) return null;
    let lage;
    try { lage = await vermittlung.tisch(N.raum); } catch { return null; }
    if (!N.raum) return null;
    Object.assign(N.namen, lage.namen || {});
    const wir = ich(), da = lage.zeilen.filter(lebendig), andere = new Map(da.filter((z) => pidVon(z) !== wir).map((z) => [pidVon(z), z]));
    for (const pid of [...N.peers.keys()]) if (!andere.has(pid)) peerWeg(pid);
    for (const z of lage.zeilen.filter((x) => x.art === "tisch" && x.status === "klingelt" && (x.an || []).includes(wir) && x.angebot && andere.has(pidVon(x)))) {
      const von = pidVon(z), alt = N.peers.get(von); if (alt?.zeile === z.id) continue;
      if (alt) peerWeg(von);
      const p = peerNeu(von, "ab"); p.zeile = z.id;
      try { const antwort = await antwortMachen(p.pc, z.angebot); await vermittlung.senden({ id: z.id, status: "angenommen", antwort }); } catch { peerWeg(von); }
    }
    for (const p of N.peers.values()) {
      if (p.rolle !== "ruf" || p.pc.remoteDescription) continue;
      const z = lage.zeilen.find((x) => x.id === p.zeile);
      if (z?.antwort) await antwortSetzen(p.pc, z.antwort).catch(() => peerWeg(p.pid));
      else if (Date.now() - p.seit > 40000) { if (p.zeile) vermittlung.senden({ id: p.zeile, status: "verpasst" }).catch(() => {}); peerWeg(p.pid); }
    }
    for (const [pid, z] of andere) {
      if (N.peers.has(pid) || N.peers.size >= max() - 1) continue;
      if (new Date(z.beginn).getTime() > new Date(N.seit).getTime()) continue; // der andere kam später → er ruft
      if (Date.now() - (N.versucht.get(pid) || 0) < 60000) continue;
      const p = peerNeu(pid, "ruf"); N.versucht.set(pid, Date.now());
      try { const angebot = await angebotMachen(p.pc); const r = await vermittlung.senden({ art: "tisch", raum_id: N.raum, an: [pid], angebot, status: "klingelt" }); p.zeile = r.id; } catch { peerWeg(pid); }
    }
    return lage;
  }
  const alleSenden = (obj) => { let n = 0; for (const p of N.peers.values()) if (datenSenden(p.kanal, obj)) n++; return n; };
  function schliessen() { for (const p of N.peers.values()) { datenSenden(p.kanal, { weg: 1 }); try { p.pc.close(); } catch {} } N.peers.clear(); N.raum = null; N.seit = null; }
  const videoSetzen = (track) => { for (const p of N.peers.values()) p.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track).catch(() => {}); };
  return { N, runde, peerWeg, alleSenden, schliessen, videoSetzen };
}
