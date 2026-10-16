-- Bachkreis-App – Nachtrag: PC-Verwaltung: Probenplan, Ausleihe von Ausstattung, Interessenten, Helfer- & Dienstplan (0.24.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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

-- Ausleihen
create table if not exists bk_ausleihen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text,
  ausstattung_id text,
  person_id text not null,
  von date not null,
  bis date,
  status text check (status is null or status in ('angefragt', 'aktiv', 'zurueck')),
  zustand_ausgabe text,
  zustand_rueckgabe text,
  zubehoer text[],
  kaution numeric(10,2),
  kaution_status text check (kaution_status is null or kaution_status in ('offen', 'bezahlt', 'zurueck', 'einbehalten')),
  gebuehr numeric(10,2),
  gebuehr_bezahlt_bis date,
  versicherung text check (versicherung is null or versicherung in ('verein', 'privat', 'keine')),
  vertrag_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_ausleihen_geaendert on bk_ausleihen (geaendert_am);
alter table bk_ausleihen enable row level security;
drop trigger if exists bk_ausleihen_stempel on bk_ausleihen;
create trigger bk_ausleihen_stempel before update on bk_ausleihen for each row execute function bk_abgleich_stempel();

alter table bk_ausleihen add column if not exists inventar_id text;
alter table bk_ausleihen add column if not exists ausstattung_id text;
alter table bk_ausleihen add column if not exists person_id text;
alter table bk_ausleihen add column if not exists von date;
alter table bk_ausleihen add column if not exists bis date;
alter table bk_ausleihen add column if not exists status text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_status_check;
alter table bk_ausleihen add constraint bk_ausleihen_status_check check (status is null or status in ('angefragt', 'aktiv', 'zurueck'));
alter table bk_ausleihen add column if not exists zustand_ausgabe text;
alter table bk_ausleihen add column if not exists zustand_rueckgabe text;
alter table bk_ausleihen add column if not exists zubehoer text[];
alter table bk_ausleihen add column if not exists kaution numeric(10,2);
alter table bk_ausleihen add column if not exists kaution_status text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_kaution_status_check;
alter table bk_ausleihen add constraint bk_ausleihen_kaution_status_check check (kaution_status is null or kaution_status in ('offen', 'bezahlt', 'zurueck', 'einbehalten'));
alter table bk_ausleihen add column if not exists gebuehr numeric(10,2);
alter table bk_ausleihen add column if not exists gebuehr_bezahlt_bis date;
alter table bk_ausleihen add column if not exists versicherung text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_versicherung_check;
alter table bk_ausleihen add constraint bk_ausleihen_versicherung_check check (versicherung is null or versicherung in ('verein', 'privat', 'keine'));
alter table bk_ausleihen add column if not exists vertrag_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_inventar_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_ausstattung_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_ausstattung_id_fk foreign key (ausstattung_id) references bk_ausstattung(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_person_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_vertrag_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_vertrag_id_fk foreign key (vertrag_id) references bk_genehmigungen(id) on delete restrict; end if; end $$;

-- Interessenten & Probespiel
create table if not exists bk_interessenten (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  kontakt text,
  instrument_id text,
  jahrgang integer,
  erfahrung text,
  status text check (status is null or status in ('anfrage', 'probespiel', 'schnupper', 'aufgenommen', 'warteliste', 'abgesagt')),
  probespiel_am timestamptz,
  gruppe_id text,
  leihinstrument boolean,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_interessenten_geaendert on bk_interessenten (geaendert_am);
alter table bk_interessenten enable row level security;
drop trigger if exists bk_interessenten_stempel on bk_interessenten;
create trigger bk_interessenten_stempel before update on bk_interessenten for each row execute function bk_abgleich_stempel();

alter table bk_interessenten add column if not exists name text;
alter table bk_interessenten add column if not exists kontakt text;
alter table bk_interessenten add column if not exists instrument_id text;
alter table bk_interessenten add column if not exists jahrgang integer;
alter table bk_interessenten add column if not exists erfahrung text;
alter table bk_interessenten add column if not exists status text;
alter table bk_interessenten drop constraint if exists bk_interessenten_status_check;
alter table bk_interessenten add constraint bk_interessenten_status_check check (status is null or status in ('anfrage', 'probespiel', 'schnupper', 'aufgenommen', 'warteliste', 'abgesagt'));
alter table bk_interessenten add column if not exists probespiel_am timestamptz;
alter table bk_interessenten add column if not exists gruppe_id text;
alter table bk_interessenten add column if not exists leihinstrument boolean;
alter table bk_interessenten add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_interessenten_instrument_id_fk') then alter table bk_interessenten add constraint bk_interessenten_instrument_id_fk foreign key (instrument_id) references bk_instrument_typen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_interessenten_gruppe_id_fk') then alter table bk_interessenten add constraint bk_interessenten_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;

-- Helfer- & Dienstplan
create table if not exists bk_dienste (
  id text primary key default gen_random_uuid()::text,
  aufgabe text not null,
  projekt_id text,
  termin_id text,
  zeit text,
  anzahl integer,
  helfer text[],
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_dienste_geaendert on bk_dienste (geaendert_am);
alter table bk_dienste enable row level security;
drop trigger if exists bk_dienste_stempel on bk_dienste;
create trigger bk_dienste_stempel before update on bk_dienste for each row execute function bk_abgleich_stempel();

alter table bk_dienste add column if not exists aufgabe text;
alter table bk_dienste add column if not exists projekt_id text;
alter table bk_dienste add column if not exists termin_id text;
alter table bk_dienste add column if not exists zeit text;
alter table bk_dienste add column if not exists anzahl integer;
alter table bk_dienste add column if not exists helfer text[];
alter table bk_dienste add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_dienste_projekt_id_fk') then alter table bk_dienste add constraint bk_dienste_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_dienste_termin_id_fk') then alter table bk_dienste add constraint bk_dienste_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;

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

alter table bk_ausleihen alter column inventar_id drop not null;

