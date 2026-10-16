-- Bachkreis-App – Nachtrag: Termine für alle, Teilnahme, eigene Termine, Wer ist online, Anklopfen (0.16.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Termine
create table if not exists bk_termine (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art_id text not null,
  beginn timestamptz not null,
  ende timestamptz,
  ort text,
  fuer_alle boolean,
  gruppen text[],
  teilnahme text check (teilnahme is null or teilnahme in ('pflicht', 'erwuenscht', 'info')),
  projekt_id text,
  frist date,
  status text check (status is null or status in ('geplant', 'abgesagt')),
  beschreibung text,
  register text[],
  soll jsonb,
  probenplan text,
  protokoll text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_termine_geaendert on bk_termine (geaendert_am);
alter table bk_termine enable row level security;
drop trigger if exists bk_termine_stempel on bk_termine;
create trigger bk_termine_stempel before update on bk_termine for each row execute function bk_abgleich_stempel();

alter table bk_termine add column if not exists titel text;
alter table bk_termine add column if not exists art_id text;
alter table bk_termine add column if not exists beginn timestamptz;
alter table bk_termine add column if not exists ende timestamptz;
alter table bk_termine add column if not exists ort text;
alter table bk_termine add column if not exists fuer_alle boolean;
alter table bk_termine add column if not exists gruppen text[];
alter table bk_termine add column if not exists teilnahme text;
alter table bk_termine drop constraint if exists bk_termine_teilnahme_check;
alter table bk_termine add constraint bk_termine_teilnahme_check check (teilnahme is null or teilnahme in ('pflicht', 'erwuenscht', 'info'));
alter table bk_termine add column if not exists projekt_id text;
alter table bk_termine add column if not exists frist date;
alter table bk_termine add column if not exists status text;
alter table bk_termine drop constraint if exists bk_termine_status_check;
alter table bk_termine add constraint bk_termine_status_check check (status is null or status in ('geplant', 'abgesagt'));
alter table bk_termine add column if not exists beschreibung text;
alter table bk_termine add column if not exists register text[];
alter table bk_termine add column if not exists soll jsonb;
alter table bk_termine add column if not exists probenplan text;
alter table bk_termine add column if not exists protokoll text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_art_id_fk') then alter table bk_termine add constraint bk_termine_art_id_fk foreign key (art_id) references bk_terminarten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_projekt_id_fk') then alter table bk_termine add constraint bk_termine_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;

-- Zu-/Absagen
create table if not exists bk_antworten (
  id text primary key default gen_random_uuid()::text,
  termin_id text not null,
  person_id text not null,
  antwort text not null check (antwort is null or antwort in ('ja', 'vielleicht', 'nein')),
  notiz text,
  von_person_id text,
  anwesend text check (anwesend is null or anwesend in ('', 'ja', 'spaet', 'entschuldigt', 'nein')),
  register_id text,
  nachfragen_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_antworten_geaendert on bk_antworten (geaendert_am);
alter table bk_antworten enable row level security;
drop trigger if exists bk_antworten_stempel on bk_antworten;
create trigger bk_antworten_stempel before update on bk_antworten for each row execute function bk_abgleich_stempel();

alter table bk_antworten add column if not exists termin_id text;
alter table bk_antworten add column if not exists person_id text;
alter table bk_antworten add column if not exists antwort text;
alter table bk_antworten drop constraint if exists bk_antworten_antwort_check;
alter table bk_antworten add constraint bk_antworten_antwort_check check (antwort is null or antwort in ('ja', 'vielleicht', 'nein'));
alter table bk_antworten add column if not exists notiz text;
alter table bk_antworten add column if not exists von_person_id text;
alter table bk_antworten add column if not exists anwesend text;
alter table bk_antworten drop constraint if exists bk_antworten_anwesend_check;
alter table bk_antworten add constraint bk_antworten_anwesend_check check (anwesend is null or anwesend in ('', 'ja', 'spaet', 'entschuldigt', 'nein'));
alter table bk_antworten add column if not exists register_id text;
alter table bk_antworten add column if not exists nachfragen_am date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_termin_id_fk') then alter table bk_antworten add constraint bk_antworten_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_person_id_fk') then alter table bk_antworten add constraint bk_antworten_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_von_person_id_fk') then alter table bk_antworten add constraint bk_antworten_von_person_id_fk foreign key (von_person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_register_id_fk') then alter table bk_antworten add constraint bk_antworten_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;

-- Eigene Termine
create table if not exists bk_eigene_termine (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  art text check (art is null or art in ('ueben', 'unterricht', 'vorspiel', 'sonstiges')),
  titel text not null,
  beginn timestamptz not null,
  ende timestamptz,
  ort text,
  woechentlich_bis date,
  erinnerung integer,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_eigene_termine_geaendert on bk_eigene_termine (geaendert_am);
alter table bk_eigene_termine enable row level security;
drop trigger if exists bk_eigene_termine_stempel on bk_eigene_termine;
create trigger bk_eigene_termine_stempel before update on bk_eigene_termine for each row execute function bk_abgleich_stempel();

alter table bk_eigene_termine add column if not exists person_id text;
alter table bk_eigene_termine add column if not exists art text;
alter table bk_eigene_termine drop constraint if exists bk_eigene_termine_art_check;
alter table bk_eigene_termine add constraint bk_eigene_termine_art_check check (art is null or art in ('ueben', 'unterricht', 'vorspiel', 'sonstiges'));
alter table bk_eigene_termine add column if not exists titel text;
alter table bk_eigene_termine add column if not exists beginn timestamptz;
alter table bk_eigene_termine add column if not exists ende timestamptz;
alter table bk_eigene_termine add column if not exists ort text;
alter table bk_eigene_termine add column if not exists woechentlich_bis date;
alter table bk_eigene_termine add column if not exists erinnerung integer;
alter table bk_eigene_termine add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eigene_termine_person_id_fk') then alter table bk_eigene_termine add constraint bk_eigene_termine_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Anklopfen
create table if not exists bk_klopfen (
  id text primary key default gen_random_uuid()::text,
  von text not null,
  an text not null,
  zeit timestamptz not null,
  antwort text check (antwort is null or antwort in ('ja', 'spaeter', 'nein')),
  antwort_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_klopfen_geaendert on bk_klopfen (geaendert_am);
alter table bk_klopfen enable row level security;
drop trigger if exists bk_klopfen_stempel on bk_klopfen;
create trigger bk_klopfen_stempel before update on bk_klopfen for each row execute function bk_abgleich_stempel();

alter table bk_klopfen add column if not exists von text;
alter table bk_klopfen add column if not exists an text;
alter table bk_klopfen add column if not exists zeit timestamptz;
alter table bk_klopfen add column if not exists antwort text;
alter table bk_klopfen drop constraint if exists bk_klopfen_antwort_check;
alter table bk_klopfen add constraint bk_klopfen_antwort_check check (antwort is null or antwort in ('ja', 'spaeter', 'nein'));
alter table bk_klopfen add column if not exists antwort_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_klopfen_von_fk') then alter table bk_klopfen add constraint bk_klopfen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_klopfen_an_fk') then alter table bk_klopfen add constraint bk_klopfen_an_fk foreign key (an) references bk_personen(id) on delete restrict; end if; end $$;

-- 🟢 Wer ist online: nur Zeitpunkt der letzten Meldung je Person (wird nie an Geräte geladen)
create table if not exists bk_online (person_id text primary key references bk_personen(id) on delete cascade, zuletzt timestamptz not null default now(), sichtbar boolean not null default true);
alter table bk_online enable row level security;

