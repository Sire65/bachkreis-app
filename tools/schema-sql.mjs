// Erzeugt die Supabase-Migration aus der Tabellen-Registry (js/kern/schema.js) – eine Quelle für App, Verwaltung und DB.
// Aufruf: node tools/schema-sql.mjs > supabase/migrations/20261015000000_bk_grundschema.sql
// Der Vertragstest prüft, dass die Migration zum Schema passt.
import { TABELLEN, TABELLEN_NAMEN } from "../js/kern/schema.js";

const TYP = { text: "text", lang: "text", email: "text", tel: "text", farbe: "text", datum: "date", zeit: "timestamptz", zahl: "integer", geld: "numeric(10,2)", ja: "boolean", wahl: "text", ref: "text", refs: "text[]", liste: "text[]", json: "jsonb" };
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function erzeugeSql() {
  const z = [];
  z.push("-- Bachkreis-App – Grundschema (automatisch erzeugt aus js/kern/schema.js mit tools/schema-sql.mjs – nicht von Hand ändern)");
  z.push("-- Abgleich-Spalten je Tabelle: id, version, erstellt_am, geaendert_am, geaendert_von, geloescht_am (weiches Löschen).");
  z.push("-- Zugriff ausschließlich über die Edge Function bk-api (Service-Role serverseitig). RLS ist überall aktiv, ohne Policies = für");
  z.push("-- anon/authenticated gesperrt. Feinere Policies folgen mit dem Supabase-Adapter (siehe docs/ARCHITEKTUR.md).");
  z.push("");
  z.push(`create or replace function bk_abgleich_stempel() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.geaendert_am := now();
  return new;
end $$;`);
  z.push("");
  for (const t of TABELLEN_NAMEN) {
    const d = TABELLEN[t];
    const spalten = [`  id text primary key default gen_random_uuid()::text`];
    for (const f of [...d.felder, ...(d.intern || [])]) {
      let s = `  ${f.k} ${TYP[f.typ] || "text"}`;
      if (f.pflicht) s += " not null";
      if (f.typ === "wahl") s += ` check (${f.k} is null or ${f.k} in (${Object.keys(f.werte).map(q).join(", ")}))`;
      spalten.push(s);
    }
    spalten.push("  version integer not null default 1", "  erstellt_am timestamptz not null default now()", "  geaendert_am timestamptz not null default now()", "  geaendert_von text", "  geloescht_am timestamptz");
    z.push(`-- ${d.titel}`);
    z.push(`create table if not exists bk_${t} (\n${spalten.join(",\n")}\n);`);
    z.push(`create index if not exists bk_${t}_geaendert on bk_${t} (geaendert_am);`);
    z.push(`alter table bk_${t} enable row level security;`);
    z.push(`drop trigger if exists bk_${t}_stempel on bk_${t};`);
    z.push(`create trigger bk_${t}_stempel before update on bk_${t} for each row execute function bk_abgleich_stempel();`);
    z.push("");
  }
  z.push("-- Fremdschlüssel (nach allen Tabellen, damit die Reihenfolge egal ist)");
  for (const t of TABELLEN_NAMEN) {
    for (const f of [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])]) {
      if (f.typ !== "ref") continue;
      const n = `bk_${t}_${f.k}_fk`;
      z.push(`do $$ begin if not exists (select 1 from pg_constraint where conname = ${q(n)}) then alter table bk_${t} add constraint ${n} foreign key (${f.k}) references bk_${f.ref}(id) on delete restrict; end if; end $$;`);
    }
  }
  z.push("");
  z.push("-- Konfiguration (Schlüssel/Wert) und Push-Abos");
  z.push("create table if not exists bk_konfig (schluessel text primary key, wert jsonb, geaendert_am timestamptz not null default now());");
  z.push("alter table bk_konfig enable row level security;");
  z.push("create table if not exists bk_push_abos (id text primary key default gen_random_uuid()::text, person_id text not null references bk_personen(id), endpoint text not null unique, schluessel jsonb not null, erstellt_am timestamptz not null default now());");
  z.push("alter table bk_push_abos enable row level security;");
  z.push("-- Zugangscodes nur als Hash speichern (Spalte code bleibt für die Vorführversion, im Echtbetrieb leer)");
  z.push("alter table bk_zugaenge add column if not exists code_hash text;");
  z.push("create unique index if not exists bk_zugaenge_code_hash on bk_zugaenge (code_hash) where code_hash is not null;");
  return z.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(erzeugeSql());
