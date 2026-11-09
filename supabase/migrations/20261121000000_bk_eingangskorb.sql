-- Bachkreis-App – Nachtrag: 📥 Eingangskorb für alle (Teilen, Druckvorschau, Leitung) (0.53.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Eingangskorb
create table if not exists bk_eingangskorb (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  titel text not null,
  text text,
  datei text,
  name text,
  mime text,
  groesse integer,
  quelle text check (quelle is null or quelle in ('teilen', 'druck', 'leitung', 'notiz')),
  von text,
  gelesen_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_eingangskorb_geaendert on bk_eingangskorb (geaendert_am);
alter table bk_eingangskorb enable row level security;
revoke all on bk_eingangskorb from public, anon, authenticated;
grant select, insert, update, delete on bk_eingangskorb to service_role;
drop trigger if exists bk_eingangskorb_stempel on bk_eingangskorb;
create trigger bk_eingangskorb_stempel before update on bk_eingangskorb for each row execute function bk_abgleich_stempel();

alter table bk_eingangskorb add column if not exists person_id text;
alter table bk_eingangskorb add column if not exists titel text;
alter table bk_eingangskorb add column if not exists text text;
alter table bk_eingangskorb add column if not exists datei text;
alter table bk_eingangskorb add column if not exists name text;
alter table bk_eingangskorb add column if not exists mime text;
alter table bk_eingangskorb add column if not exists groesse integer;
alter table bk_eingangskorb add column if not exists quelle text;
alter table bk_eingangskorb drop constraint if exists bk_eingangskorb_quelle_check;
alter table bk_eingangskorb add constraint bk_eingangskorb_quelle_check check (quelle is null or quelle in ('teilen', 'druck', 'leitung', 'notiz'));
alter table bk_eingangskorb add column if not exists von text;
alter table bk_eingangskorb add column if not exists gelesen_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eingangskorb_person_id_fk') then alter table bk_eingangskorb add constraint bk_eingangskorb_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eingangskorb_von_fk') then alter table bk_eingangskorb add constraint bk_eingangskorb_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_eingangskorb_person on bk_eingangskorb (person_id);

