-- Bachkreis-App – Nachtrag: 👤 Kontakt teilen, 👥 Konferenz, 🔒 Geheim schreiben, 🙋 Gäste am Runden Tisch (0.51.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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
  weitergeleitet_von text,
  erwaehnt text[],
  kanaele text[],
  geplant_um timestamptz,
  wiederholung text check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich')),
  anlagen jsonb,
  umfrage jsonb,
  loescht_am timestamptz,
  kontakt text,
  konferenz text,
  geheim jsonb,
  gelesen_von text[],
  rueckmeldungen jsonb,
  reaktionen jsonb,
  anzahl integer,
  bearbeitet_am timestamptz,
  zurueckgezogen_am timestamptz,
  geplant_frei timestamptz,
  umfrage_stimmen jsonb,
  umfrage_frei jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachrichten_geaendert on bk_nachrichten (geaendert_am);
alter table bk_nachrichten enable row level security;
revoke all on bk_nachrichten from public, anon, authenticated;
grant select, insert, update, delete on bk_nachrichten to service_role;
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
alter table bk_nachrichten add column if not exists weitergeleitet_von text;
alter table bk_nachrichten add column if not exists erwaehnt text[];
alter table bk_nachrichten add column if not exists kanaele text[];
alter table bk_nachrichten add column if not exists geplant_um timestamptz;
alter table bk_nachrichten add column if not exists wiederholung text;
alter table bk_nachrichten drop constraint if exists bk_nachrichten_wiederholung_check;
alter table bk_nachrichten add constraint bk_nachrichten_wiederholung_check check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich'));
alter table bk_nachrichten add column if not exists anlagen jsonb;
alter table bk_nachrichten add column if not exists umfrage jsonb;
alter table bk_nachrichten add column if not exists loescht_am timestamptz;
alter table bk_nachrichten add column if not exists kontakt text;
alter table bk_nachrichten add column if not exists konferenz text;
alter table bk_nachrichten add column if not exists geheim jsonb;
alter table bk_nachrichten add column if not exists gelesen_von text[];
alter table bk_nachrichten add column if not exists rueckmeldungen jsonb;
alter table bk_nachrichten add column if not exists reaktionen jsonb;
alter table bk_nachrichten add column if not exists anzahl integer;
alter table bk_nachrichten add column if not exists bearbeitet_am timestamptz;
alter table bk_nachrichten add column if not exists zurueckgezogen_am timestamptz;
alter table bk_nachrichten add column if not exists geplant_frei timestamptz;
alter table bk_nachrichten add column if not exists umfrage_stimmen jsonb;
alter table bk_nachrichten add column if not exists umfrage_frei jsonb;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_unterhaltung_id_fk') then alter table bk_nachrichten add constraint bk_nachrichten_unterhaltung_id_fk foreign key (unterhaltung_id) references bk_unterhaltungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_von_fk') then alter table bk_nachrichten add constraint bk_nachrichten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_kontakt_fk') then alter table bk_nachrichten add constraint bk_nachrichten_kontakt_fk foreign key (kontakt) references bk_personen(id) on delete restrict; end if; end $$;

-- Anrufe & Runder Tisch (Vermittlung)
create table if not exists bk_anrufe (
  id text primary key default gen_random_uuid()::text,
  art text not null check (art is null or art in ('audio', 'video', 'fernhilfe', 'tisch', 'tisch_da')),
  von text,
  an text[],
  raum_id text,
  status text check (status is null or status in ('klingelt', 'angenommen', 'abgelehnt', 'beendet', 'verpasst')),
  angebot jsonb,
  antwort jsonb,
  beginn timestamptz,
  ende timestamptz,
  gast text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_anrufe_geaendert on bk_anrufe (geaendert_am);
alter table bk_anrufe enable row level security;
revoke all on bk_anrufe from public, anon, authenticated;
grant select, insert, update, delete on bk_anrufe to service_role;
drop trigger if exists bk_anrufe_stempel on bk_anrufe;
create trigger bk_anrufe_stempel before update on bk_anrufe for each row execute function bk_abgleich_stempel();

alter table bk_anrufe add column if not exists art text;
alter table bk_anrufe drop constraint if exists bk_anrufe_art_check;
alter table bk_anrufe add constraint bk_anrufe_art_check check (art is null or art in ('audio', 'video', 'fernhilfe', 'tisch', 'tisch_da'));
alter table bk_anrufe add column if not exists von text;
alter table bk_anrufe add column if not exists an text[];
alter table bk_anrufe add column if not exists raum_id text;
alter table bk_anrufe add column if not exists status text;
alter table bk_anrufe drop constraint if exists bk_anrufe_status_check;
alter table bk_anrufe add constraint bk_anrufe_status_check check (status is null or status in ('klingelt', 'angenommen', 'abgelehnt', 'beendet', 'verpasst'));
alter table bk_anrufe add column if not exists angebot jsonb;
alter table bk_anrufe add column if not exists antwort jsonb;
alter table bk_anrufe add column if not exists beginn timestamptz;
alter table bk_anrufe add column if not exists ende timestamptz;
alter table bk_anrufe add column if not exists gast text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_anrufe_von_fk') then alter table bk_anrufe add constraint bk_anrufe_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Öffentliche Schlüssel (Geheim schreiben)
create table if not exists bk_geheimschluessel (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  pub jsonb,
  fingerabdruck text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_geheimschluessel_geaendert on bk_geheimschluessel (geaendert_am);
alter table bk_geheimschluessel enable row level security;
revoke all on bk_geheimschluessel from public, anon, authenticated;
grant select, insert, update, delete on bk_geheimschluessel to service_role;
drop trigger if exists bk_geheimschluessel_stempel on bk_geheimschluessel;
create trigger bk_geheimschluessel_stempel before update on bk_geheimschluessel for each row execute function bk_abgleich_stempel();

alter table bk_geheimschluessel add column if not exists person_id text;
alter table bk_geheimschluessel add column if not exists pub jsonb;
alter table bk_geheimschluessel add column if not exists fingerabdruck text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_geheimschluessel_person_id_fk') then alter table bk_geheimschluessel add constraint bk_geheimschluessel_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Gäste am Runden Tisch
create table if not exists bk_tischgaeste (
  id text primary key default gen_random_uuid()::text,
  raum_id text not null,
  name text not null,
  gueltig_bis timestamptz,
  von text,
  token_hash text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_tischgaeste_geaendert on bk_tischgaeste (geaendert_am);
alter table bk_tischgaeste enable row level security;
revoke all on bk_tischgaeste from public, anon, authenticated;
grant select, insert, update, delete on bk_tischgaeste to service_role;
drop trigger if exists bk_tischgaeste_stempel on bk_tischgaeste;
create trigger bk_tischgaeste_stempel before update on bk_tischgaeste for each row execute function bk_abgleich_stempel();

alter table bk_tischgaeste add column if not exists raum_id text;
alter table bk_tischgaeste add column if not exists name text;
alter table bk_tischgaeste add column if not exists gueltig_bis timestamptz;
alter table bk_tischgaeste add column if not exists von text;
alter table bk_tischgaeste add column if not exists token_hash text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_tischgaeste_von_fk') then alter table bk_tischgaeste add constraint bk_tischgaeste_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Anklopfen
create table if not exists bk_klopfen (
  id text primary key default gen_random_uuid()::text,
  von text not null,
  an text not null,
  zeit timestamptz not null,
  antwort text check (antwort is null or antwort in ('ja', 'spaeter', 'nein')),
  antwort_am timestamptz,
  art text check (art is null or art in ('schreiben', 'sprechen')),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_klopfen_geaendert on bk_klopfen (geaendert_am);
alter table bk_klopfen enable row level security;
revoke all on bk_klopfen from public, anon, authenticated;
grant select, insert, update, delete on bk_klopfen to service_role;
drop trigger if exists bk_klopfen_stempel on bk_klopfen;
create trigger bk_klopfen_stempel before update on bk_klopfen for each row execute function bk_abgleich_stempel();

alter table bk_klopfen add column if not exists von text;
alter table bk_klopfen add column if not exists an text;
alter table bk_klopfen add column if not exists zeit timestamptz;
alter table bk_klopfen add column if not exists antwort text;
alter table bk_klopfen drop constraint if exists bk_klopfen_antwort_check;
alter table bk_klopfen add constraint bk_klopfen_antwort_check check (antwort is null or antwort in ('ja', 'spaeter', 'nein'));
alter table bk_klopfen add column if not exists antwort_am timestamptz;
alter table bk_klopfen add column if not exists art text;
alter table bk_klopfen drop constraint if exists bk_klopfen_art_check;
alter table bk_klopfen add constraint bk_klopfen_art_check check (art is null or art in ('schreiben', 'sprechen'));
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_klopfen_von_fk') then alter table bk_klopfen add constraint bk_klopfen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_klopfen_an_fk') then alter table bk_klopfen add constraint bk_klopfen_an_fk foreign key (an) references bk_personen(id) on delete restrict; end if; end $$;

create unique index if not exists bk_geheimschluessel_person on bk_geheimschluessel (person_id) where geloescht_am is null;
create index if not exists bk_tischgaeste_hash on bk_tischgaeste (token_hash);

