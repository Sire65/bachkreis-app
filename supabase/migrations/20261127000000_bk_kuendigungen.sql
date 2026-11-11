-- Bachkreis-App – Nachtrag: 🚪 Kündigung in vier Varianten, 💤 Pause bis (0.66.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Kündigungen
create table if not exists bk_kuendigungen (
  id text primary key default gen_random_uuid()::text,
  az text,
  person_id text not null,
  art text not null check (art is null or art in ('alles', 'ehemalig', 'teil', 'pause')),
  bereiche text[],
  gruppe_ids text[],
  zum date not null,
  bis date,
  grund text,
  weg text check (weg is null or weg in ('app', 'papier', 'mail', 'muendlich')),
  status text check (status is null or status in ('eingegangen', 'bestaetigt', 'vollzogen', 'zurueckgenommen', 'beendet')),
  offen text,
  notiz text,
  unterschrift jsonb,
  eingereicht_von text,
  eingereicht_am timestamptz,
  bestaetigt_von text,
  bestaetigt_am timestamptz,
  vollzogen_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kuendigungen_geaendert on bk_kuendigungen (geaendert_am);
alter table bk_kuendigungen enable row level security;
revoke all on bk_kuendigungen from public, anon, authenticated;
grant select, insert, update, delete on bk_kuendigungen to service_role;
drop trigger if exists bk_kuendigungen_stempel on bk_kuendigungen;
create trigger bk_kuendigungen_stempel before update on bk_kuendigungen for each row execute function bk_abgleich_stempel();

alter table bk_kuendigungen add column if not exists az text;
alter table bk_kuendigungen add column if not exists person_id text;
alter table bk_kuendigungen add column if not exists art text;
alter table bk_kuendigungen drop constraint if exists bk_kuendigungen_art_check;
alter table bk_kuendigungen add constraint bk_kuendigungen_art_check check (art is null or art in ('alles', 'ehemalig', 'teil', 'pause'));
alter table bk_kuendigungen add column if not exists bereiche text[];
alter table bk_kuendigungen add column if not exists gruppe_ids text[];
alter table bk_kuendigungen add column if not exists zum date;
alter table bk_kuendigungen add column if not exists bis date;
alter table bk_kuendigungen add column if not exists grund text;
alter table bk_kuendigungen add column if not exists weg text;
alter table bk_kuendigungen drop constraint if exists bk_kuendigungen_weg_check;
alter table bk_kuendigungen add constraint bk_kuendigungen_weg_check check (weg is null or weg in ('app', 'papier', 'mail', 'muendlich'));
alter table bk_kuendigungen add column if not exists status text;
alter table bk_kuendigungen drop constraint if exists bk_kuendigungen_status_check;
alter table bk_kuendigungen add constraint bk_kuendigungen_status_check check (status is null or status in ('eingegangen', 'bestaetigt', 'vollzogen', 'zurueckgenommen', 'beendet'));
alter table bk_kuendigungen add column if not exists offen text;
alter table bk_kuendigungen add column if not exists notiz text;
alter table bk_kuendigungen add column if not exists unterschrift jsonb;
alter table bk_kuendigungen add column if not exists eingereicht_von text;
alter table bk_kuendigungen add column if not exists eingereicht_am timestamptz;
alter table bk_kuendigungen add column if not exists bestaetigt_von text;
alter table bk_kuendigungen add column if not exists bestaetigt_am timestamptz;
alter table bk_kuendigungen add column if not exists vollzogen_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kuendigungen_person_id_fk') then alter table bk_kuendigungen add constraint bk_kuendigungen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Personen
create table if not exists bk_personen (
  id text primary key default gen_random_uuid()::text,
  vorname text not null,
  nachname text not null,
  typ text not null check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig')),
  status text check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten')),
  ausgetreten_am date,
  pause_bis date,
  fz_vorgelegt_am date,
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
  anonymisiert boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_personen_geaendert on bk_personen (geaendert_am);
alter table bk_personen enable row level security;
revoke all on bk_personen from public, anon, authenticated;
grant select, insert, update, delete on bk_personen to service_role;
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
alter table bk_personen add column if not exists ausgetreten_am date;
alter table bk_personen add column if not exists pause_bis date;
alter table bk_personen add column if not exists fz_vorgelegt_am date;
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
alter table bk_personen add column if not exists anonymisiert boolean;

create index if not exists bk_kuendigungen_faellig on bk_kuendigungen (status, zum);

