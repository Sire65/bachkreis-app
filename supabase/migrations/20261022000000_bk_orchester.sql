-- Bachkreis-App – Nachtrag: Gesichter (Avatar) und Soll-Besetzung je Gruppe (0.11.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Personen
create table if not exists bk_personen (
  id text primary key default gen_random_uuid()::text,
  vorname text not null,
  nachname text not null,
  typ text not null check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig')),
  status text check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten')),
  jahrgang integer,
  schule text,
  firma text,
  email text,
  mobil text,
  telefon text,
  strasse text,
  plz text,
  ort text,
  geburtsdatum date,
  rollen text[],
  notfall_info text,
  kontakt_ok boolean,
  foto_ok boolean,
  notiz text,
  benachrichtigung jsonb,
  freigaben jsonb,
  avatar jsonb,
  uebe_plan jsonb,
  kalender_alarm integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_personen_geaendert on bk_personen (geaendert_am);
alter table bk_personen enable row level security;
drop trigger if exists bk_personen_stempel on bk_personen;
create trigger bk_personen_stempel before update on bk_personen for each row execute function bk_abgleich_stempel();

alter table bk_personen add column if not exists vorname text;
alter table bk_personen add column if not exists nachname text;
alter table bk_personen add column if not exists typ text;
alter table bk_personen drop constraint if exists bk_personen_typ_check;
alter table bk_personen add constraint bk_personen_typ_check check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig'));
alter table bk_personen add column if not exists status text;
alter table bk_personen drop constraint if exists bk_personen_status_check;
alter table bk_personen add constraint bk_personen_status_check check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten'));
alter table bk_personen add column if not exists jahrgang integer;
alter table bk_personen add column if not exists schule text;
alter table bk_personen add column if not exists firma text;
alter table bk_personen add column if not exists email text;
alter table bk_personen add column if not exists mobil text;
alter table bk_personen add column if not exists telefon text;
alter table bk_personen add column if not exists strasse text;
alter table bk_personen add column if not exists plz text;
alter table bk_personen add column if not exists ort text;
alter table bk_personen add column if not exists geburtsdatum date;
alter table bk_personen add column if not exists rollen text[];
alter table bk_personen add column if not exists notfall_info text;
alter table bk_personen add column if not exists kontakt_ok boolean;
alter table bk_personen add column if not exists foto_ok boolean;
alter table bk_personen add column if not exists notiz text;
alter table bk_personen add column if not exists benachrichtigung jsonb;
alter table bk_personen add column if not exists freigaben jsonb;
alter table bk_personen add column if not exists avatar jsonb;
alter table bk_personen add column if not exists uebe_plan jsonb;
alter table bk_personen add column if not exists kalender_alarm integer;

-- Gruppen
create table if not exists bk_gruppen (
  id text primary key default gen_random_uuid()::text,
  kuerzel text not null,
  name text not null,
  beschreibung text,
  farbe text,
  sort integer,
  aktiv boolean,
  soll jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gruppen_geaendert on bk_gruppen (geaendert_am);
alter table bk_gruppen enable row level security;
drop trigger if exists bk_gruppen_stempel on bk_gruppen;
create trigger bk_gruppen_stempel before update on bk_gruppen for each row execute function bk_abgleich_stempel();

alter table bk_gruppen add column if not exists kuerzel text;
alter table bk_gruppen add column if not exists name text;
alter table bk_gruppen add column if not exists beschreibung text;
alter table bk_gruppen add column if not exists farbe text;
alter table bk_gruppen add column if not exists sort integer;
alter table bk_gruppen add column if not exists aktiv boolean;
alter table bk_gruppen add column if not exists soll jsonb;

