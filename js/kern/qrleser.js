// 📷 QR-Leser (0.63.0, aus 🔍 Ausweis prüfen herausgelöst – benutzt von Ausweis prüfen und 📦 Inventur):
// Kamera auf, QR-Code lesen – mit dem eingebauten Leser des Browsers (Android/Chrome) oder mit jsQR (iPhone u. a., lib/jsqr, nur hier geladen).
// Das Kamerabild verlässt das Gerät nie. qrLeserStart(video, beiText) → Promise<null | Fehlertext>; qrLeserStopp() beendet die Kamera.
const Q = { strom: null, lauf: false, letzter: "" };
function jsqrLaden() {
  if (typeof globalThis.jsQR === "function") return Promise.resolve();
  return new Promise((ok, nein) => { const s = document.createElement("script"); s.src = "lib/jsqr/jsQR.js"; s.onload = ok; s.onerror = () => nein(new Error("QR-Leser fehlt")); document.head.appendChild(s); });
}
export const qrLeserLaeuft = () => Q.lauf;
export function qrLeserStopp() { Q.lauf = false; Q.strom?.getTracks().forEach((t) => t.stop()); Q.strom = null; }
export const qrLeserVergessen = () => { Q.letzter = ""; }; // denselben Code noch einmal melden („Nächsten prüfen“)
export async function qrLeserStart(v, beiText) {
  if (!v || Q.lauf) return null;
  if (!navigator.mediaDevices?.getUserMedia) return "Dieses Gerät erlaubt keinen Kamera-Zugriff.";
  try { Q.strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); }
  catch { return "Kamera nicht erlaubt – bitte in den Browser-Einstellungen freigeben."; }
  v.srcObject = Q.strom; await v.play().catch(() => {});
  let leser = null; // eingebauter Leser nur, wenn er QR wirklich kann (sonst jsQR)
  try { if ("BarcodeDetector" in window && (await window.BarcodeDetector.getSupportedFormats()).includes("qr_code")) leser = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch {}
  if (!leser) await jsqrLaden().catch(() => {});
  const c = document.createElement("canvas"), cx = c.getContext("2d", { willReadFrequently: true });
  Q.lauf = true; Q.letzter = "";
  const runde = async () => {
    if (!Q.lauf || !document.body.contains(v)) return qrLeserStopp();
    let text = null;
    try {
      if (v.readyState >= 2) {
        if (leser) text = (await leser.detect(v))[0]?.rawValue || null;
        else if (globalThis.jsQR) { c.width = v.videoWidth; c.height = v.videoHeight; cx.drawImage(v, 0, 0); const b = cx.getImageData(0, 0, c.width, c.height); text = globalThis.jsQR(b.data, b.width, b.height)?.data || null; }
      }
    } catch {}
    if (text && text !== Q.letzter) { Q.letzter = text; try { await beiText(text); } catch {} }
    setTimeout(runde, 250);
  };
  runde();
  return null;
}
// QR-Code als SVG (qrcode-generator, lib/qrcode) – für Ausweis und Regal-Schilder
export function qrcodeLaden() {
  if (typeof globalThis.qrcode === "function") return Promise.resolve();
  return new Promise((ok, nein) => { const s = document.createElement("script"); s.src = "lib/qrcode/qrcode.js"; s.onload = ok; s.onerror = () => nein(new Error("QR-Programm fehlt")); document.head.appendChild(s); });
}
export function qrSvg(text) { const q = globalThis.qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
