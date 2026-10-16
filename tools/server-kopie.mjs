// Kopiert die Tabellen-Registry für die Edge Functions (Supabase bündelt nur Dateien unter supabase/functions).
// Aufruf über „npm run schema“. Der Vertragstest prüft, dass die Kopie aktuell ist.
import fs from "node:fs";
import path from "node:path";
const W = path.resolve(import.meta.dirname, "..");
export const KOPF = "// AUTOMATISCH KOPIERT aus js/kern/schema.js (tools/server-kopie.mjs) – nicht von Hand ändern.\n";
export const serverSchema = () => KOPF + fs.readFileSync(path.join(W, "js/kern/schema.js"), "utf8");
export const KOPF_LOGIK = "// AUTOMATISCH KOPIERT aus js/kern/logik.js (tools/server-kopie.mjs) – nicht von Hand ändern.\n";
export const serverLogik = () => KOPF_LOGIK + fs.readFileSync(path.join(W, "js/kern/logik.js"), "utf8");
if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(path.join(W, "supabase/functions/_shared/schema.js"), serverSchema());
  fs.writeFileSync(path.join(W, "supabase/functions/_shared/logik.js"), serverLogik());
}
