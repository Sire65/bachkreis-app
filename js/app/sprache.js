// 🎤 Sprache im Browser – kostenlos, ohne fremden Dienst im App-Code (KC-CLUB-SPRACHE / -MIKRO-WIE-CHAT):
//  - zuhoeren(): Spracherkennung des Browsers (Chrome/Android, Safari/iOS ab 14.5) für Diktieren und Sprachbefehle
//  - aufnahme(): Sprachnachricht mit dem Mikrofon (MediaRecorder) – höchstens 3 Minuten
// Ohne Unterstützung sagen die Knöpfe freundlich, was fehlt (UNKNOWN nie als OK – AGENTS.md Regel 11).
const SR = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const spracheMoeglich = () => !!SR();
export const aufnahmeMoeglich = () => !!(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

// Hört zu; zwischen(text) während des Sprechens, fertig(text) am Ende. Rückgabe: stop()
export function zuhoeren({ zwischen = () => {}, fertig = () => {}, fehler = () => {}, weiter = false } = {}) {
  const K = SR(); if (!K) { fehler("NICHT_MOEGLICH"); return () => {}; }
  const r = new K(); r.lang = "de-DE"; r.interimResults = true; r.continuous = weiter; r.maxAlternatives = 1;
  let endgueltig = "", aus = false;
  r.onresult = (e) => {
    let z = "";
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) endgueltig += t; else z += t; }
    zwischen((endgueltig + z).trim());
  };
  r.onerror = (e) => { if (!aus) fehler(e.error === "not-allowed" || e.error === "service-not-allowed" ? "KEIN_MIKROFON" : e.error === "no-speech" ? "NICHTS_GEHOERT" : "FEHLER"); };
  r.onend = () => { if (!aus) { aus = true; fertig(endgueltig.trim()); } };
  try { r.start(); } catch { fehler("FEHLER"); }
  return () => { try { r.stop(); } catch {} };
}
export const SPRACHE_FEHLER = { NICHT_MOEGLICH: "Dieses Gerät/dieser Browser kann keine Sprache erkennen (am besten Chrome oder Safari).", KEIN_MIKROFON: "Das Mikrofon ist nicht erlaubt – bitte in den Browser-Einstellungen freigeben.", NICHTS_GEHOERT: "Ich habe nichts gehört – bitte nochmal.", FEHLER: "Die Spracherkennung hat gerade nicht geklappt." };

// 🎙️ Sprachnachricht aufnehmen. Rückgabe: { stopp() → Promise<{blob, dauer}>, abbrechen(), sekunden() }
export async function aufnahme({ maxSek = 180, beiEnde = () => {} } = {}) {
  const strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const typ = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  const rec = new MediaRecorder(strom, typ ? { mimeType: typ, audioBitsPerSecond: 32000 } : {});
  const teile = [], start = Date.now();
  let fertig, abgebrochen = false;
  const ende = new Promise((ok) => { fertig = ok; });
  rec.ondataavailable = (e) => { if (e.data.size) teile.push(e.data); };
  rec.onstop = () => { strom.getTracks().forEach((t) => t.stop()); fertig(abgebrochen ? null : { blob: new Blob(teile, { type: (rec.mimeType || "audio/webm").split(";")[0] }), dauer: Math.round((Date.now() - start) / 1000) }); };
  rec.start(250);
  const max = setTimeout(() => { if (rec.state === "recording") { rec.stop(); beiEnde(); } }, maxSek * 1000);
  return {
    sekunden: () => Math.round((Date.now() - start) / 1000),
    stopp: () => { clearTimeout(max); if (rec.state === "recording") rec.stop(); return ende; },
    abbrechen: () => { clearTimeout(max); abgebrochen = true; if (rec.state === "recording") rec.stop(); },
  };
}
export const dauerText = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.round(s || 0) % 60).padStart(2, "0")}`;
