// 🩺 Datenbank-Prüfung mit db_monitor aus dem KC System Check (tools/db-monitor.sql, Kopie von share/db-monitor/install.sql):
// Supabase-Rollen nachgebildet (anon/authenticated bekommen wie dort alle Rechte auf neue Tabellen) → alle Migrationen → Bericht.
// Muss „healthy“ sein: jede Tabelle mit RLS, keine offenen Rechte, keine Views/Definer-Funktionen, die RLS umgehen.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const W = path.resolve(import.meta.dirname, "..");
test("db_monitor (KC System Check): Sicherheit und Kapazität ohne Befund", async () => {
  const pg = new PGlite();
  await pg.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`);
  for (const f of fs.readdirSync(path.join(W, "supabase/migrations")).sort()) await pg.exec(fs.readFileSync(path.join(W, "supabase/migrations", f), "utf8"));
  await pg.exec(fs.readFileSync(path.join(W, "tools/db-monitor.sql"), "utf8"));
  const r = (await pg.query("select db_monitor.report() as r")).rows[0].r;
  const s = r.security;
  assert.deepEqual(s.client_roles_present.sort(), ["anon", "authenticated"], "Supabase-Rollen nicht erkannt – Prüfung wäre blind");
  assert.deepEqual(s.tables_without_rls, [], "Tabellen ohne RLS");
  assert.deepEqual(s.uncovered_grants, [], "ungedeckte Rechte");
  assert.deepEqual(s.views_bypassing_rls, [], "Views umgehen RLS");
  assert.deepEqual(s.definer_without_search_path, [], "security definer ohne search_path");
  assert.deepEqual(s.permissive_policies, [], "Policies mit using(true)");
  assert.deepEqual(r.critical, [], JSON.stringify(r.critical));
  assert.equal(r.status, "healthy", JSON.stringify(r.warnings));
  await pg.close();
});
