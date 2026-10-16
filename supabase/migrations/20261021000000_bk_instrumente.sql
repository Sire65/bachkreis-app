-- Bachkreis-App – Nachtrag: Instrumentengruppen und Symbole (0.10.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Instrumententypen
create table if not exists bk_instrument_typen (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  register_id text,
  wartung_monate integer,
  gruppe text check (gruppe is null or gruppe in ('streicher', 'holz', 'blech', 'schlag', 'tasten', 'sonstige')),
  symbol text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_instrument_typen_geaendert on bk_instrument_typen (geaendert_am);
alter table bk_instrument_typen enable row level security;
drop trigger if exists bk_instrument_typen_stempel on bk_instrument_typen;
create trigger bk_instrument_typen_stempel before update on bk_instrument_typen for each row execute function bk_abgleich_stempel();

alter table bk_instrument_typen add column if not exists name text;
alter table bk_instrument_typen add column if not exists register_id text;
alter table bk_instrument_typen add column if not exists wartung_monate integer;
alter table bk_instrument_typen add column if not exists gruppe text;
alter table bk_instrument_typen drop constraint if exists bk_instrument_typen_gruppe_check;
alter table bk_instrument_typen add constraint bk_instrument_typen_gruppe_check check (gruppe is null or gruppe in ('streicher', 'holz', 'blech', 'schlag', 'tasten', 'sonstige'));
alter table bk_instrument_typen add column if not exists symbol text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_instrument_typen_register_id_fk') then alter table bk_instrument_typen add constraint bk_instrument_typen_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;

