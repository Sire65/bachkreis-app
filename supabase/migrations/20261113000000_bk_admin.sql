-- Bachkreis-App – Nachtrag: 🧑‍💻 Entwickler/Admin, 🩺 Fehlerberichte der Geräte, 📱 App-Version je Gerät (0.43.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Fehlerberichte
create table if not exists bk_fehlerberichte (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  ansicht text,
  app_version text,
  geraet text,
  person_id text,
  anzahl integer,
  zuletzt timestamptz,
  erledigt boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_fehlerberichte_geaendert on bk_fehlerberichte (geaendert_am);
alter table bk_fehlerberichte enable row level security;
revoke all on bk_fehlerberichte from public, anon, authenticated;
grant select, insert, update, delete on bk_fehlerberichte to service_role;
drop trigger if exists bk_fehlerberichte_stempel on bk_fehlerberichte;
create trigger bk_fehlerberichte_stempel before update on bk_fehlerberichte for each row execute function bk_abgleich_stempel();

alter table bk_fehlerberichte add column if not exists text text;
alter table bk_fehlerberichte add column if not exists ansicht text;
alter table bk_fehlerberichte add column if not exists app_version text;
alter table bk_fehlerberichte add column if not exists geraet text;
alter table bk_fehlerberichte add column if not exists person_id text;
alter table bk_fehlerberichte add column if not exists anzahl integer;
alter table bk_fehlerberichte add column if not exists zuletzt timestamptz;
alter table bk_fehlerberichte add column if not exists erledigt boolean;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fehlerberichte_person_id_fk') then alter table bk_fehlerberichte add constraint bk_fehlerberichte_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

alter table bk_online add column if not exists version text;

