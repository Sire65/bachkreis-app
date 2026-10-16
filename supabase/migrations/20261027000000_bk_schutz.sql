-- Bachkreis-App – Nachtrag: Kinderschutz & Datenschutz: Gesundheit & Notfall, Begleitpersonen, Einwilligungen je Zweck, Anwesenheit (0.20.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Gesundheit & Notfall
create table if not exists bk_gesundheit (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  allergien text,
  ernaehrung text,
  medikamente text,
  erkrankungen text,
  notfall_name text,
  notfall_tel text,
  krankenkasse text,
  hausarzt text,
  tetanus date,
  schwimmer text check (schwimmer is null or schwimmer in ('ja', 'nein', 'unsicher')),
  erste_hilfe_ok boolean,
  medikamente_geben_ok boolean,
  geprueft_am date,
  geprueft_von text,
  loeschen_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gesundheit_geaendert on bk_gesundheit (geaendert_am);
alter table bk_gesundheit enable row level security;
drop trigger if exists bk_gesundheit_stempel on bk_gesundheit;
create trigger bk_gesundheit_stempel before update on bk_gesundheit for each row execute function bk_abgleich_stempel();

alter table bk_gesundheit add column if not exists person_id text;
alter table bk_gesundheit add column if not exists allergien text;
alter table bk_gesundheit add column if not exists ernaehrung text;
alter table bk_gesundheit add column if not exists medikamente text;
alter table bk_gesundheit add column if not exists erkrankungen text;
alter table bk_gesundheit add column if not exists notfall_name text;
alter table bk_gesundheit add column if not exists notfall_tel text;
alter table bk_gesundheit add column if not exists krankenkasse text;
alter table bk_gesundheit add column if not exists hausarzt text;
alter table bk_gesundheit add column if not exists tetanus date;
alter table bk_gesundheit add column if not exists schwimmer text;
alter table bk_gesundheit drop constraint if exists bk_gesundheit_schwimmer_check;
alter table bk_gesundheit add constraint bk_gesundheit_schwimmer_check check (schwimmer is null or schwimmer in ('ja', 'nein', 'unsicher'));
alter table bk_gesundheit add column if not exists erste_hilfe_ok boolean;
alter table bk_gesundheit add column if not exists medikamente_geben_ok boolean;
alter table bk_gesundheit add column if not exists geprueft_am date;
alter table bk_gesundheit add column if not exists geprueft_von text;
alter table bk_gesundheit add column if not exists loeschen_am date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gesundheit_person_id_fk') then alter table bk_gesundheit add constraint bk_gesundheit_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gesundheit_geprueft_von_fk') then alter table bk_gesundheit add constraint bk_gesundheit_geprueft_von_fk foreign key (geprueft_von) references bk_personen(id) on delete restrict; end if; end $$;

-- Projekte / Konzerte
create table if not exists bk_projekte (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('konzert', 'reise', 'freizeit', 'sonstiges')),
  von date,
  bis date,
  ort text,
  beschreibung text,
  checkliste text,
  begleiter text[],
  treffpunkt text,
  kleiderordnung text,
  anmeldung boolean,
  anmeldeschluss date,
  kosten numeric(10,2),
  plaetze integer,
  transport_inventar text[],
  transport_ausstattung text[],
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_projekte_geaendert on bk_projekte (geaendert_am);
alter table bk_projekte enable row level security;
drop trigger if exists bk_projekte_stempel on bk_projekte;
create trigger bk_projekte_stempel before update on bk_projekte for each row execute function bk_abgleich_stempel();

alter table bk_projekte add column if not exists titel text;
alter table bk_projekte add column if not exists art text;
alter table bk_projekte drop constraint if exists bk_projekte_art_check;
alter table bk_projekte add constraint bk_projekte_art_check check (art is null or art in ('konzert', 'reise', 'freizeit', 'sonstiges'));
alter table bk_projekte add column if not exists von date;
alter table bk_projekte add column if not exists bis date;
alter table bk_projekte add column if not exists ort text;
alter table bk_projekte add column if not exists beschreibung text;
alter table bk_projekte add column if not exists checkliste text;
alter table bk_projekte add column if not exists begleiter text[];
alter table bk_projekte add column if not exists treffpunkt text;
alter table bk_projekte add column if not exists kleiderordnung text;
alter table bk_projekte add column if not exists anmeldung boolean;
alter table bk_projekte add column if not exists anmeldeschluss date;
alter table bk_projekte add column if not exists kosten numeric(10,2);
alter table bk_projekte add column if not exists plaetze integer;
alter table bk_projekte add column if not exists transport_inventar text[];
alter table bk_projekte add column if not exists transport_ausstattung text[];

-- Genehmigungs-Vorlagen
create table if not exists bk_genehmigung_vorlagen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  text text not null,
  fassung integer,
  gueltig_monate integer,
  zweck text check (zweck is null or zweck in ('teilnahme', 'foto_intern', 'foto_website', 'foto_presse', 'foto_social', 'reise', 'leihvertrag', 'gesundheit', 'uebeaufnahmen', 'sonstiges')),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_genehmigung_vorlagen_geaendert on bk_genehmigung_vorlagen (geaendert_am);
alter table bk_genehmigung_vorlagen enable row level security;
drop trigger if exists bk_genehmigung_vorlagen_stempel on bk_genehmigung_vorlagen;
create trigger bk_genehmigung_vorlagen_stempel before update on bk_genehmigung_vorlagen for each row execute function bk_abgleich_stempel();

alter table bk_genehmigung_vorlagen add column if not exists titel text;
alter table bk_genehmigung_vorlagen add column if not exists text text;
alter table bk_genehmigung_vorlagen add column if not exists fassung integer;
alter table bk_genehmigung_vorlagen add column if not exists gueltig_monate integer;
alter table bk_genehmigung_vorlagen add column if not exists zweck text;
alter table bk_genehmigung_vorlagen drop constraint if exists bk_genehmigung_vorlagen_zweck_check;
alter table bk_genehmigung_vorlagen add constraint bk_genehmigung_vorlagen_zweck_check check (zweck is null or zweck in ('teilnahme', 'foto_intern', 'foto_website', 'foto_presse', 'foto_social', 'reise', 'leihvertrag', 'gesundheit', 'uebeaufnahmen', 'sonstiges'));

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

