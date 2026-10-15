// Gemeinsame Test-Datenbank: PostgreSQL im Arbeitsspeicher (PGlite) mit ALLEN Migrationen und den Demodaten.
// Zugangscodes werden wie im Echtbetrieb nur als Hash gespeichert; die Klartext-Codes gibt die Funktion zurück.
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { erzeugeDemodaten } from "../js/kern/demodaten.js";
import { TABELLEN, TABELLEN_NAMEN } from "../js/kern/schema.js";
import { sha256 } from "../supabase/functions/_shared/api.js";

const W = path.resolve(import.meta.dirname, "..");
export async function demoDatenbank({ jetzt = new Date(), geaendert = null } = {}) {
  const pg = new PGlite();
  const db = { q: async (t, p = []) => (await pg.query(t, p)).rows };
  for (const f of fs.readdirSync(path.join(W, "supabase/migrations")).sort()) await pg.exec(fs.readFileSync(path.join(W, "supabase/migrations", f), "utf8"));
  const d = erzeugeDemodaten(jetzt);
  const codes = {};
  await pg.exec("set session_replication_role = replica");
  for (const t of TABELLEN_NAMEN) {
    const felder = [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])];
    for (const z0 of d[t] || []) {
      const z = { ...z0 };
      if (t === "zugaenge") { codes[z.person_id] = z.code; z.code_hash = await sha256(z.code); z.code = null; }
      const daten = Object.fromEntries(["id", ...felder.map((f) => f.k), ...(t === "zugaenge" ? ["code_hash"] : [])].map((k) => [k, z[k] === "" && ["datum", "zeit", "zahl", "geld"].includes(felder.find((f) => f.k === k)?.typ) ? null : z[k] ?? null]));
      await pg.query(`insert into bk_${t} select * from jsonb_populate_record(null::bk_${t}, $1::jsonb) on conflict (id) do nothing`,
        [JSON.stringify({ ...daten, version: 1, erstellt_am: new Date().toISOString(), geaendert_am: geaendert || new Date().toISOString() })]);
    }
  }
  await pg.exec("set session_replication_role = origin");
  return { pg, db, d, codes };
}
