// Ablage-Adapter „storage“ für die Edge Functions: Supabase Storage, privater Bucket „bk-dateien“ (kostenlos bis 1 GB).
// Der Service-Schlüssel bleibt auf dem Server; die App bekommt Dateien nur über bk-api (Rechte-Prüfung je Datei).
import { ABLAGE_DATENBANK } from "./ablage.js";
const URL_ = Deno.env.get("SUPABASE_URL") ?? "", KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", BUCKET = "bk-dateien";
const kopf = (mime) => ({ Authorization: `Bearer ${KEY}`, apikey: KEY, ...(mime ? { "Content-Type": mime, "x-upsert": "true" } : {}) });
const b64zuBytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
const bytesZuB64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
export const ABLAGE_STORAGE = {
  name: "storage",
  async speichern(db, id, b64, mime) {
    const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${id}`, { method: "POST", headers: kopf(mime || "application/octet-stream"), body: b64zuBytes(b64) });
    if (!r.ok) throw new Error("STORAGE_" + r.status);
    await db.q(`update bk_dateien set inhalt = null, ablage = 'storage' where id = $1`, [id]);
  },
  async lesen(db, id) {
    const a = (await db.q(`select ablage from bk_dateien where id = $1`, [id]))[0]?.ablage;
    if (a !== "storage") return ABLAGE_DATENBANK.lesen(db, id); // ältere Dateien aus der Datenbank
    const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${id}`, { headers: kopf() });
    return r.ok ? bytesZuB64(new Uint8Array(await r.arrayBuffer())) : null;
  },
  async loeschen(db, id) { await fetch(`${URL_}/storage/v1/object/${BUCKET}/${id}`, { method: "DELETE", headers: kopf() }).catch(() => {}); await ABLAGE_DATENBANK.loeschen(db, id); },
};
export const ablage = () => ((Deno.env.get("BK_ABLAGE") ?? "") === "storage" && URL_ && KEY ? ABLAGE_STORAGE : ABLAGE_DATENBANK);
