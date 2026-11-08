-- Bachkreis-App – Nachtrag: 💡🗳️ Vorschläge & Abstimmungen (auch geheim), eine Stimme je Person (0.41.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Vorschläge & Abstimmungen
create table if not exists bk_vorschlaege (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  text text,
  von text,
  art text check (art is null or art in ('vorschlag', 'abstimmung')),
  an text check (an is null or an in ('alle', 'eltern', 'team', 'vorstand')),
  optionen jsonb,
  frist date,
  anonym boolean,
  status text check (status is null or status in ('offen', 'beendet', 'erledigt')),
  ergebnis text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_vorschlaege_geaendert on bk_vorschlaege (geaendert_am);
alter table bk_vorschlaege enable row level security;
revoke all on bk_vorschlaege from public, anon, authenticated;
grant select, insert, update, delete on bk_vorschlaege to service_role;
drop trigger if exists bk_vorschlaege_stempel on bk_vorschlaege;
create trigger bk_vorschlaege_stempel before update on bk_vorschlaege for each row execute function bk_abgleich_stempel();

alter table bk_vorschlaege add column if not exists titel text;
alter table bk_vorschlaege add column if not exists text text;
alter table bk_vorschlaege add column if not exists von text;
alter table bk_vorschlaege add column if not exists art text;
alter table bk_vorschlaege drop constraint if exists bk_vorschlaege_art_check;
alter table bk_vorschlaege add constraint bk_vorschlaege_art_check check (art is null or art in ('vorschlag', 'abstimmung'));
alter table bk_vorschlaege add column if not exists an text;
alter table bk_vorschlaege drop constraint if exists bk_vorschlaege_an_check;
alter table bk_vorschlaege add constraint bk_vorschlaege_an_check check (an is null or an in ('alle', 'eltern', 'team', 'vorstand'));
alter table bk_vorschlaege add column if not exists optionen jsonb;
alter table bk_vorschlaege add column if not exists frist date;
alter table bk_vorschlaege add column if not exists anonym boolean;
alter table bk_vorschlaege add column if not exists status text;
alter table bk_vorschlaege drop constraint if exists bk_vorschlaege_status_check;
alter table bk_vorschlaege add constraint bk_vorschlaege_status_check check (status is null or status in ('offen', 'beendet', 'erledigt'));
alter table bk_vorschlaege add column if not exists ergebnis text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorschlaege_von_fk') then alter table bk_vorschlaege add constraint bk_vorschlaege_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Stimmen
create table if not exists bk_vorschlag_stimmen (
  id text primary key default gen_random_uuid()::text,
  vorschlag_id text not null,
  person_id text,
  wahl text,
  am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_vorschlag_stimmen_geaendert on bk_vorschlag_stimmen (geaendert_am);
alter table bk_vorschlag_stimmen enable row level security;
revoke all on bk_vorschlag_stimmen from public, anon, authenticated;
grant select, insert, update, delete on bk_vorschlag_stimmen to service_role;
drop trigger if exists bk_vorschlag_stimmen_stempel on bk_vorschlag_stimmen;
create trigger bk_vorschlag_stimmen_stempel before update on bk_vorschlag_stimmen for each row execute function bk_abgleich_stempel();

alter table bk_vorschlag_stimmen add column if not exists vorschlag_id text;
alter table bk_vorschlag_stimmen add column if not exists person_id text;
alter table bk_vorschlag_stimmen add column if not exists wahl text;
alter table bk_vorschlag_stimmen add column if not exists am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorschlag_stimmen_vorschlag_id_fk') then alter table bk_vorschlag_stimmen add constraint bk_vorschlag_stimmen_vorschlag_id_fk foreign key (vorschlag_id) references bk_vorschlaege(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorschlag_stimmen_person_id_fk') then alter table bk_vorschlag_stimmen add constraint bk_vorschlag_stimmen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

create unique index if not exists bk_vorschlag_stimmen_einmal on bk_vorschlag_stimmen (vorschlag_id, person_id) where geloescht_am is null;

