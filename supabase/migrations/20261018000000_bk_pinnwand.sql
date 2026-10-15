-- Bachkreis-App – Nachtrag: Pinnwand wie in der KC Club App (0.7.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Pinnwand
create table if not exists bk_pinnwand (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  von text,
  wichtig boolean,
  fuer text check (fuer is null or fuer in ('ich', 'alle', 'personen')),
  personen text[],
  farbe integer,
  antworten boolean,
  zeit timestamptz,
  anzahl integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_pinnwand_geaendert on bk_pinnwand (geaendert_am);
alter table bk_pinnwand enable row level security;
drop trigger if exists bk_pinnwand_stempel on bk_pinnwand;
create trigger bk_pinnwand_stempel before update on bk_pinnwand for each row execute function bk_abgleich_stempel();

alter table bk_pinnwand add column if not exists text text;
alter table bk_pinnwand add column if not exists von text;
alter table bk_pinnwand add column if not exists wichtig boolean;
alter table bk_pinnwand add column if not exists fuer text;
alter table bk_pinnwand drop constraint if exists bk_pinnwand_fuer_check;
alter table bk_pinnwand add constraint bk_pinnwand_fuer_check check (fuer is null or fuer in ('ich', 'alle', 'personen'));
alter table bk_pinnwand add column if not exists personen text[];
alter table bk_pinnwand add column if not exists farbe integer;
alter table bk_pinnwand add column if not exists antworten boolean;
alter table bk_pinnwand add column if not exists zeit timestamptz;
alter table bk_pinnwand add column if not exists anzahl integer;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_von_fk') then alter table bk_pinnwand add constraint bk_pinnwand_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Pinnwand: gesehen & erledigt
create table if not exists bk_pinnwand_gelesen (
  id text primary key default gen_random_uuid()::text,
  zettel_id text not null,
  person_id text not null,
  gesehen_am timestamptz,
  erledigt_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_pinnwand_gelesen_geaendert on bk_pinnwand_gelesen (geaendert_am);
alter table bk_pinnwand_gelesen enable row level security;
drop trigger if exists bk_pinnwand_gelesen_stempel on bk_pinnwand_gelesen;
create trigger bk_pinnwand_gelesen_stempel before update on bk_pinnwand_gelesen for each row execute function bk_abgleich_stempel();

alter table bk_pinnwand_gelesen add column if not exists zettel_id text;
alter table bk_pinnwand_gelesen add column if not exists person_id text;
alter table bk_pinnwand_gelesen add column if not exists gesehen_am timestamptz;
alter table bk_pinnwand_gelesen add column if not exists erledigt_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_gelesen_zettel_id_fk') then alter table bk_pinnwand_gelesen add constraint bk_pinnwand_gelesen_zettel_id_fk foreign key (zettel_id) references bk_pinnwand(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_gelesen_person_id_fk') then alter table bk_pinnwand_gelesen add constraint bk_pinnwand_gelesen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

alter table bk_kom_regeln drop constraint if exists bk_kom_regeln_ereignis_check;
alter table bk_kom_regeln add constraint bk_kom_regeln_ereignis_check check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard'));
alter table bk_kom_eskalationen drop constraint if exists bk_kom_eskalationen_ereignis_check;
alter table bk_kom_eskalationen add constraint bk_kom_eskalationen_ereignis_check check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard'));
insert into bk_kom_regeln select * from jsonb_populate_record(null::bk_kom_regeln, jsonb_build_object('version', 1, 'erstellt_am', now(), 'geaendert_am', now(), 'geaendert_von', 'Standard') || '{"id":"kr-pinnwand","ereignis":"pinnwand","programm_id":"kp-app","kanaele":["push","app"],"modus":"rueckfall","vorlage_id":"kv-standard","prioritaet":"normal","ruhezeit":"verschieben","quittung":false,"eltern":"nein","dedupe_sekunden":0,"aktiv":true}'::jsonb) on conflict (id) do nothing;
