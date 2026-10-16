-- Bachkreis-App – Nachtrag: Anhänge, Sprachnachrichten, Umfragen, Selbstlöschen (0.9.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Nachrichten
create table if not exists bk_nachrichten (
  id text primary key default gen_random_uuid()::text,
  unterhaltung_id text not null,
  von text,
  text text,
  zeit timestamptz,
  rueckmeldung boolean,
  wichtig boolean,
  express boolean,
  antwort_auf text,
  kanaele text[],
  geplant_um timestamptz,
  wiederholung text check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich')),
  anlagen jsonb,
  umfrage jsonb,
  loescht_am timestamptz,
  gelesen_von text[],
  rueckmeldungen jsonb,
  reaktionen jsonb,
  anzahl integer,
  bearbeitet_am timestamptz,
  zurueckgezogen_am timestamptz,
  geplant_frei timestamptz,
  umfrage_stimmen jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachrichten_geaendert on bk_nachrichten (geaendert_am);
alter table bk_nachrichten enable row level security;
drop trigger if exists bk_nachrichten_stempel on bk_nachrichten;
create trigger bk_nachrichten_stempel before update on bk_nachrichten for each row execute function bk_abgleich_stempel();

alter table bk_nachrichten add column if not exists unterhaltung_id text;
alter table bk_nachrichten add column if not exists von text;
alter table bk_nachrichten add column if not exists text text;
alter table bk_nachrichten add column if not exists zeit timestamptz;
alter table bk_nachrichten add column if not exists rueckmeldung boolean;
alter table bk_nachrichten add column if not exists wichtig boolean;
alter table bk_nachrichten add column if not exists express boolean;
alter table bk_nachrichten add column if not exists antwort_auf text;
alter table bk_nachrichten add column if not exists kanaele text[];
alter table bk_nachrichten add column if not exists geplant_um timestamptz;
alter table bk_nachrichten add column if not exists wiederholung text;
alter table bk_nachrichten drop constraint if exists bk_nachrichten_wiederholung_check;
alter table bk_nachrichten add constraint bk_nachrichten_wiederholung_check check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich'));
alter table bk_nachrichten add column if not exists anlagen jsonb;
alter table bk_nachrichten add column if not exists umfrage jsonb;
alter table bk_nachrichten add column if not exists loescht_am timestamptz;
alter table bk_nachrichten add column if not exists gelesen_von text[];
alter table bk_nachrichten add column if not exists rueckmeldungen jsonb;
alter table bk_nachrichten add column if not exists reaktionen jsonb;
alter table bk_nachrichten add column if not exists anzahl integer;
alter table bk_nachrichten add column if not exists bearbeitet_am timestamptz;
alter table bk_nachrichten add column if not exists zurueckgezogen_am timestamptz;
alter table bk_nachrichten add column if not exists geplant_frei timestamptz;
alter table bk_nachrichten add column if not exists umfrage_stimmen jsonb;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_unterhaltung_id_fk') then alter table bk_nachrichten add constraint bk_nachrichten_unterhaltung_id_fk foreign key (unterhaltung_id) references bk_unterhaltungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_von_fk') then alter table bk_nachrichten add constraint bk_nachrichten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Ablage für Dateien (Anhänge, Sprachnachrichten, Noten)
create table if not exists bk_dateien (id text primary key, von text references bk_personen(id), name text not null, mime text not null, groesse integer not null, art text, inhalt bytea, ablage text not null default 'datenbank', erstellt_am timestamptz not null default now(), geloescht_am timestamptz);
alter table bk_dateien enable row level security;

