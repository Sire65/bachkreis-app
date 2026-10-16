// 📎 Dateien der App (Anhänge, Sprachnachrichten, Noten-PDFs) – über den Daten-Adapter:
//  - Echtbetrieb: bk-api „datei_hochladen“ / „datei_holen“ (Server prüft Art, Größe und wer die Datei sehen darf)
//  - Vorführversion: nur auf diesem Gerät (IndexedDB „bachkreis-dateien“)
// Fotos werden vor dem Hochladen verkleinert (schont Datenvolumen und Speicher).
import { istEchtbetrieb, serverAktion, neueId } from "./daten.js";
import { idbOeffnen, idbLesen, idbSchreiben } from "./speicher-idb.js";
import { DATEI } from "./schema.js";

const CACHE = new Map();
let idbP = null;
const idb = () => (idbP ||= idbOeffnen("bachkreis-dateien"));
const FEHLER = { DATEIART_NICHT_ERLAUBT: "Diese Dateiart geht leider nicht.", DATEI_ZU_GROSS: "Die Datei ist zu groß (höchstens 8 MB).", TAGESGRENZE_DATEIEN: "Heute wurden schon sehr viele Dateien hochgeladen – bitte morgen wieder.", KEIN_ZUGRIFF: "Diese Datei darfst du nicht öffnen.", DATEI_FEHLT: "Die Datei gibt es nicht mehr.", DATEI_GELOESCHT: "Die Datei wurde gelöscht." };
export const groesseText = (b) => (b >= 1048576 ? `${(b / 1048576).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);
export const artVonMime = (m) => (/^image\//.test(m) ? "bild" : /^audio\//.test(m) ? "sprache" : /^video\//.test(m) ? "video" : "datei");

const zuB64 = (blob) => new Promise((ok, f) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => f(r.error); r.readAsDataURL(blob); });
const ausB64 = (b, mime) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: mime }); };

// Fotos: längste Seite höchstens 1600 px, JPEG 85 % (GIF bleibt, damit es sich bewegt)
export async function bildVerkleinern(datei, max = 1600) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(datei.type) || datei.size < 250 * 1024) return datei;
  try {
    const bild = await createImageBitmap(datei);
    const f = Math.min(1, max / Math.max(bild.width, bild.height));
    const c = document.createElement("canvas"); c.width = Math.round(bild.width * f); c.height = Math.round(bild.height * f);
    c.getContext("2d").drawImage(bild, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return blob && blob.size < datei.size ? new File([blob], datei.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : datei;
  } catch { return datei; }
}

export async function hochladen(blob, { name = blob.name || "Datei", art = artVonMime(blob.type) } = {}) {
  const mime = (blob.type || "application/octet-stream").split(";")[0].toLowerCase();
  if (!DATEI.mime.test(mime)) throw new Error(`${FEHLER.DATEIART_NICHT_ERLAUBT} (${mime || "unbekannt"})`);
  if (blob.size > DATEI.max) throw new Error(FEHLER.DATEI_ZU_GROSS);
  let id;
  if (istEchtbetrieb()) {
    const r = await serverAktion("datei_hochladen", { name, mime, art, daten: await zuB64(blob) });
    if (!r?.ok) throw new Error(FEHLER[r?.fehler] || "Hochladen hat nicht geklappt – bitte nochmal.");
    id = r.id;
  } else {
    id = neueId();
    await idbSchreiben(await idb(), id, { blob, name, mime, groesse: blob.size, art });
  }
  CACHE.set(id, URL.createObjectURL(blob));
  return { id, name, mime, groesse: blob.size, art };
}

// Blob-Adresse einer Datei (einmal geladen, danach aus dem Speicher)
export async function dateiUrl(id) {
  if (CACHE.has(id)) return CACHE.get(id);
  let blob;
  if (istEchtbetrieb()) {
    const r = await serverAktion("datei_holen", { id });
    if (!r?.ok) throw new Error(FEHLER[r?.fehler] || "Die Datei lässt sich gerade nicht laden.");
    blob = ausB64(r.daten, r.mime);
  } else {
    const d = await idbLesen(await idb(), id);
    if (!d) throw new Error("In der Vorführversion liegt diese Datei nur auf dem Gerät, auf dem sie hochgeladen wurde.");
    blob = d.blob;
  }
  const url = URL.createObjectURL(blob); CACHE.set(id, url); return url;
}
// Öffnen: PDF/Bild/Video im neuen Tab, sonst herunterladen
export async function dateiOeffnen(id, name = "Datei", mime = "") {
  const url = await dateiUrl(id);
  if (/^(application\/pdf|image\/|video\/|audio\/|text\/plain)/.test(mime)) { const w = window.open(url, "_blank", "noopener"); if (w) return; }
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
