// 📎 Ablage für Dateien (Anhänge, Sprachnachrichten, Noten) – austauschbar (AGENTS.md Regel 4/18).
//  - „datenbank“ (Standard, kostenlos, überall gleich – auch in den Tests): Inhalt in bk_dateien.inhalt (bytea)
//  - „storage“: Supabase Storage (privater Bucket), siehe ablage-deno.js – Auswahl über das Secret BK_ABLAGE=storage
// Schnittstelle: speichern(db, id, base64, mime) · lesen(db, id) → base64 · loeschen(db, id)
export const ABLAGE_DATENBANK = {
  name: "datenbank",
  async speichern(db, id, b64) { await db.q(`update bk_dateien set inhalt = decode($2, 'base64'), ablage = 'datenbank' where id = $1`, [id, b64]); },
  async lesen(db, id) { return (await db.q(`select encode(inhalt, 'base64') as b from bk_dateien where id = $1`, [id]))[0]?.b ?? null; },
  async loeschen(db, id) { await db.q(`update bk_dateien set inhalt = null where id = $1`, [id]); },
};
