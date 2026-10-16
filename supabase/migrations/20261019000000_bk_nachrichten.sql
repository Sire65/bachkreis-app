-- Bachkreis-App – Nachtrag: Nachrichten wie in der KC Club App (0.8.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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

-- Nachrichten: angekommen & gelesen
create table if not exists bk_nachricht_status (
  id text primary key default gen_random_uuid()::text,
  nachricht_id text not null,
  person_id text not null,
  autor_id text,
  zugestellt_am timestamptz,
  gelesen_am timestamptz,
  express_antwort text check (express_antwort is null or express_antwort in ('geoeffnet', 'spaeter', 'nein')),
  express_bestaetigt_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachricht_status_geaendert on bk_nachricht_status (geaendert_am);
alter table bk_nachricht_status enable row level security;
drop trigger if exists bk_nachricht_status_stempel on bk_nachricht_status;
create trigger bk_nachricht_status_stempel before update on bk_nachricht_status for each row execute function bk_abgleich_stempel();

alter table bk_nachricht_status add column if not exists nachricht_id text;
alter table bk_nachricht_status add column if not exists person_id text;
alter table bk_nachricht_status add column if not exists autor_id text;
alter table bk_nachricht_status add column if not exists zugestellt_am timestamptz;
alter table bk_nachricht_status add column if not exists gelesen_am timestamptz;
alter table bk_nachricht_status add column if not exists express_antwort text;
alter table bk_nachricht_status drop constraint if exists bk_nachricht_status_express_antwort_check;
alter table bk_nachricht_status add constraint bk_nachricht_status_express_antwort_check check (express_antwort is null or express_antwort in ('geoeffnet', 'spaeter', 'nein'));
alter table bk_nachricht_status add column if not exists express_bestaetigt_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_nachricht_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_nachricht_id_fk foreign key (nachricht_id) references bk_nachrichten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_person_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_autor_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_autor_id_fk foreign key (autor_id) references bk_personen(id) on delete restrict; end if; end $$;

alter table bk_unterhaltungen drop constraint if exists bk_unterhaltungen_art_check;
alter table bk_unterhaltungen add constraint bk_unterhaltungen_art_check check (art is null or art in ('gruppe', 'einzel', 'runde', 'verteiler'));
alter table bk_kom_regeln drop constraint if exists bk_kom_regeln_ereignis_check;
alter table bk_kom_regeln add constraint bk_kom_regeln_ereignis_check check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'nachricht_wichtig', 'express', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard'));
alter table bk_kom_eskalationen drop constraint if exists bk_kom_eskalationen_ereignis_check;
alter table bk_kom_eskalationen add constraint bk_kom_eskalationen_ereignis_check check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'nachricht_wichtig', 'express', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard'));
insert into bk_kom_regeln select * from jsonb_populate_record(null::bk_kom_regeln, jsonb_build_object('version', 1, 'erstellt_am', now(), 'geaendert_am', now(), 'geaendert_von', 'Standard') || '{"id":"kr-nachricht_wichtig","ereignis":"nachricht_wichtig","programm_id":"kp-app","kanaele":["push","mail","app"],"modus":"alle","vorlage_id":"kv-standard","prioritaet":"hoch","ruhezeit":"verschieben","quittung":false,"eltern":"nein","dedupe_sekunden":0,"aktiv":true}'::jsonb) on conflict (id) do nothing;
insert into bk_kom_regeln select * from jsonb_populate_record(null::bk_kom_regeln, jsonb_build_object('version', 1, 'erstellt_am', now(), 'geaendert_am', now(), 'geaendert_von', 'Standard') || '{"id":"kr-express","ereignis":"express","programm_id":"kp-app","kanaele":["push","mail","app"],"modus":"alle","vorlage_id":"kv-standard","prioritaet":"hoch","ruhezeit":"ignorieren","quittung":false,"eltern":"nein","dedupe_sekunden":0,"aktiv":true}'::jsonb) on conflict (id) do nothing;
