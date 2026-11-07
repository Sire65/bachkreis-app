-- Bachkreis-App – Nachtrag: 🗳️ Terminumfrage: mögliche Termine ankreuzen, Leitung entscheidet → Termin (0.39.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Terminumfragen
create table if not exists bk_terminumfragen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  beschreibung text,
  von text,
  an text check (an is null or an in ('mitglieder', 'eltern', 'verwaltung')),
  fuer_alle boolean,
  gruppen text[],
  art_id text,
  ort text,
  dauer_min integer,
  optionen jsonb,
  frist date,
  status text check (status is null or status in ('offen', 'entschieden', 'abgebrochen')),
  gewaehlt text,
  termin_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_terminumfragen_geaendert on bk_terminumfragen (geaendert_am);
alter table bk_terminumfragen enable row level security;
revoke all on bk_terminumfragen from public, anon, authenticated;
grant select, insert, update, delete on bk_terminumfragen to service_role;
drop trigger if exists bk_terminumfragen_stempel on bk_terminumfragen;
create trigger bk_terminumfragen_stempel before update on bk_terminumfragen for each row execute function bk_abgleich_stempel();

alter table bk_terminumfragen add column if not exists titel text;
alter table bk_terminumfragen add column if not exists beschreibung text;
alter table bk_terminumfragen add column if not exists von text;
alter table bk_terminumfragen add column if not exists an text;
alter table bk_terminumfragen drop constraint if exists bk_terminumfragen_an_check;
alter table bk_terminumfragen add constraint bk_terminumfragen_an_check check (an is null or an in ('mitglieder', 'eltern', 'verwaltung'));
alter table bk_terminumfragen add column if not exists fuer_alle boolean;
alter table bk_terminumfragen add column if not exists gruppen text[];
alter table bk_terminumfragen add column if not exists art_id text;
alter table bk_terminumfragen add column if not exists ort text;
alter table bk_terminumfragen add column if not exists dauer_min integer;
alter table bk_terminumfragen add column if not exists optionen jsonb;
alter table bk_terminumfragen add column if not exists frist date;
alter table bk_terminumfragen add column if not exists status text;
alter table bk_terminumfragen drop constraint if exists bk_terminumfragen_status_check;
alter table bk_terminumfragen add constraint bk_terminumfragen_status_check check (status is null or status in ('offen', 'entschieden', 'abgebrochen'));
alter table bk_terminumfragen add column if not exists gewaehlt text;
alter table bk_terminumfragen add column if not exists termin_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_terminumfragen_von_fk') then alter table bk_terminumfragen add constraint bk_terminumfragen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_terminumfragen_art_id_fk') then alter table bk_terminumfragen add constraint bk_terminumfragen_art_id_fk foreign key (art_id) references bk_terminarten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_terminumfragen_termin_id_fk') then alter table bk_terminumfragen add constraint bk_terminumfragen_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;

-- Terminumfragen: Antworten
create table if not exists bk_terminumfrage_antworten (
  id text primary key default gen_random_uuid()::text,
  umfrage_id text not null,
  person_id text not null,
  stimmen jsonb,
  kommentar text,
  am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_terminumfrage_antworten_geaendert on bk_terminumfrage_antworten (geaendert_am);
alter table bk_terminumfrage_antworten enable row level security;
revoke all on bk_terminumfrage_antworten from public, anon, authenticated;
grant select, insert, update, delete on bk_terminumfrage_antworten to service_role;
drop trigger if exists bk_terminumfrage_antworten_stempel on bk_terminumfrage_antworten;
create trigger bk_terminumfrage_antworten_stempel before update on bk_terminumfrage_antworten for each row execute function bk_abgleich_stempel();

alter table bk_terminumfrage_antworten add column if not exists umfrage_id text;
alter table bk_terminumfrage_antworten add column if not exists person_id text;
alter table bk_terminumfrage_antworten add column if not exists stimmen jsonb;
alter table bk_terminumfrage_antworten add column if not exists kommentar text;
alter table bk_terminumfrage_antworten add column if not exists am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_terminumfrage_antworten_umfrage_id_fk') then alter table bk_terminumfrage_antworten add constraint bk_terminumfrage_antworten_umfrage_id_fk foreign key (umfrage_id) references bk_terminumfragen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_terminumfrage_antworten_person_id_fk') then alter table bk_terminumfrage_antworten add constraint bk_terminumfrage_antworten_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

