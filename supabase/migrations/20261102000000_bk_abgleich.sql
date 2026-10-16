-- Bachkreis-App – Nachtrag: Abgleich Internetseite: Austausch & Gastfamilien, Auftrittsanfragen, Chronik, Dokumente, Partner, Dirigier-/Kompositionsversuche (0.27.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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
  gastfamilien boolean,
  gaeste_anzahl integer,
  partner_id text,
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
alter table bk_projekte add column if not exists gastfamilien boolean;
alter table bk_projekte add column if not exists gaeste_anzahl integer;
alter table bk_projekte add column if not exists partner_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_projekte_partner_id_fk') then alter table bk_projekte add constraint bk_projekte_partner_id_fk foreign key (partner_id) references bk_partner(id) on delete restrict; end if; end $$;

-- Konzertprogramm
create table if not exists bk_programm (
  id text primary key default gen_random_uuid()::text,
  projekt_id text not null,
  nr integer not null,
  art text not null check (art is null or art in ('werk', 'pause', 'ansage', 'zugabe', 'sonstiges')),
  werk_id text,
  titel text,
  gruppe_id text,
  solisten text,
  dauer_min integer,
  notiz text,
  dirigent_id text,
  eigene_komposition boolean,
  urauffuehrung boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_programm_geaendert on bk_programm (geaendert_am);
alter table bk_programm enable row level security;
drop trigger if exists bk_programm_stempel on bk_programm;
create trigger bk_programm_stempel before update on bk_programm for each row execute function bk_abgleich_stempel();

alter table bk_programm add column if not exists projekt_id text;
alter table bk_programm add column if not exists nr integer;
alter table bk_programm add column if not exists art text;
alter table bk_programm drop constraint if exists bk_programm_art_check;
alter table bk_programm add constraint bk_programm_art_check check (art is null or art in ('werk', 'pause', 'ansage', 'zugabe', 'sonstiges'));
alter table bk_programm add column if not exists werk_id text;
alter table bk_programm add column if not exists titel text;
alter table bk_programm add column if not exists gruppe_id text;
alter table bk_programm add column if not exists solisten text;
alter table bk_programm add column if not exists dauer_min integer;
alter table bk_programm add column if not exists notiz text;
alter table bk_programm add column if not exists dirigent_id text;
alter table bk_programm add column if not exists eigene_komposition boolean;
alter table bk_programm add column if not exists urauffuehrung boolean;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_projekt_id_fk') then alter table bk_programm add constraint bk_programm_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_werk_id_fk') then alter table bk_programm add constraint bk_programm_werk_id_fk foreign key (werk_id) references bk_werke(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_gruppe_id_fk') then alter table bk_programm add constraint bk_programm_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_dirigent_id_fk') then alter table bk_programm add constraint bk_programm_dirigent_id_fk foreign key (dirigent_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Gastfamilien
create table if not exists bk_gastgeber (
  id text primary key default gen_random_uuid()::text,
  projekt_id text not null,
  person_id text not null,
  plaetze integer not null,
  schlafplatz text,
  hinweise text,
  status text check (status is null or status in ('angeboten', 'bestaetigt', 'abgesagt')),
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gastgeber_geaendert on bk_gastgeber (geaendert_am);
alter table bk_gastgeber enable row level security;
drop trigger if exists bk_gastgeber_stempel on bk_gastgeber;
create trigger bk_gastgeber_stempel before update on bk_gastgeber for each row execute function bk_abgleich_stempel();

alter table bk_gastgeber add column if not exists projekt_id text;
alter table bk_gastgeber add column if not exists person_id text;
alter table bk_gastgeber add column if not exists plaetze integer;
alter table bk_gastgeber add column if not exists schlafplatz text;
alter table bk_gastgeber add column if not exists hinweise text;
alter table bk_gastgeber add column if not exists status text;
alter table bk_gastgeber drop constraint if exists bk_gastgeber_status_check;
alter table bk_gastgeber add constraint bk_gastgeber_status_check check (status is null or status in ('angeboten', 'bestaetigt', 'abgesagt'));
alter table bk_gastgeber add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gastgeber_projekt_id_fk') then alter table bk_gastgeber add constraint bk_gastgeber_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gastgeber_person_id_fk') then alter table bk_gastgeber add constraint bk_gastgeber_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Gäste (Austausch)
create table if not exists bk_gaeste (
  id text primary key default gen_random_uuid()::text,
  projekt_id text not null,
  vorname text not null,
  nachname text,
  alter integer,
  herkunft text,
  instrument text,
  gastgeber_id text,
  ankunft timestamptz,
  abreise timestamptz,
  essen text,
  allergien text,
  notfall_tel text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gaeste_geaendert on bk_gaeste (geaendert_am);
alter table bk_gaeste enable row level security;
drop trigger if exists bk_gaeste_stempel on bk_gaeste;
create trigger bk_gaeste_stempel before update on bk_gaeste for each row execute function bk_abgleich_stempel();

alter table bk_gaeste add column if not exists projekt_id text;
alter table bk_gaeste add column if not exists vorname text;
alter table bk_gaeste add column if not exists nachname text;
alter table bk_gaeste add column if not exists alter integer;
alter table bk_gaeste add column if not exists herkunft text;
alter table bk_gaeste add column if not exists instrument text;
alter table bk_gaeste add column if not exists gastgeber_id text;
alter table bk_gaeste add column if not exists ankunft timestamptz;
alter table bk_gaeste add column if not exists abreise timestamptz;
alter table bk_gaeste add column if not exists essen text;
alter table bk_gaeste add column if not exists allergien text;
alter table bk_gaeste add column if not exists notfall_tel text;
alter table bk_gaeste add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gaeste_projekt_id_fk') then alter table bk_gaeste add constraint bk_gaeste_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gaeste_gastgeber_id_fk') then alter table bk_gaeste add constraint bk_gaeste_gastgeber_id_fk foreign key (gastgeber_id) references bk_gastgeber(id) on delete restrict; end if; end $$;

-- Auftrittsanfragen
create table if not exists bk_anfragen (
  id text primary key default gen_random_uuid()::text,
  anlass text not null,
  veranstalter text not null,
  kontakt_name text,
  kontakt_tel text,
  kontakt_email text,
  datum timestamptz,
  dauer_min integer,
  ort text,
  besetzung text check (besetzung is null or besetzung in ('a', 'b', 'beide', 'ensemble', 'streicher', 'blaeser', 'kammer')),
  gruppen text[],
  honorar numeric(10,2),
  status text check (status is null or status in ('neu', 'pruefung', 'zugesagt', 'abgesagt', 'erledigt')),
  termin_id text,
  eingegangen_am date,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_anfragen_geaendert on bk_anfragen (geaendert_am);
alter table bk_anfragen enable row level security;
drop trigger if exists bk_anfragen_stempel on bk_anfragen;
create trigger bk_anfragen_stempel before update on bk_anfragen for each row execute function bk_abgleich_stempel();

alter table bk_anfragen add column if not exists anlass text;
alter table bk_anfragen add column if not exists veranstalter text;
alter table bk_anfragen add column if not exists kontakt_name text;
alter table bk_anfragen add column if not exists kontakt_tel text;
alter table bk_anfragen add column if not exists kontakt_email text;
alter table bk_anfragen add column if not exists datum timestamptz;
alter table bk_anfragen add column if not exists dauer_min integer;
alter table bk_anfragen add column if not exists ort text;
alter table bk_anfragen add column if not exists besetzung text;
alter table bk_anfragen drop constraint if exists bk_anfragen_besetzung_check;
alter table bk_anfragen add constraint bk_anfragen_besetzung_check check (besetzung is null or besetzung in ('a', 'b', 'beide', 'ensemble', 'streicher', 'blaeser', 'kammer'));
alter table bk_anfragen add column if not exists gruppen text[];
alter table bk_anfragen add column if not exists honorar numeric(10,2);
alter table bk_anfragen add column if not exists status text;
alter table bk_anfragen drop constraint if exists bk_anfragen_status_check;
alter table bk_anfragen add constraint bk_anfragen_status_check check (status is null or status in ('neu', 'pruefung', 'zugesagt', 'abgesagt', 'erledigt'));
alter table bk_anfragen add column if not exists termin_id text;
alter table bk_anfragen add column if not exists eingegangen_am date;
alter table bk_anfragen add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_anfragen_termin_id_fk') then alter table bk_anfragen add constraint bk_anfragen_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;

-- Chronik
create table if not exists bk_chronik (
  id text primary key default gen_random_uuid()::text,
  jahr integer not null,
  datum date,
  titel text not null,
  art text check (art is null or art in ('gruendung', 'konzert', 'reise', 'austausch', 'cd', 'urauffuehrung', 'partner', 'auszeichnung', 'sonstiges')),
  ort text,
  beschreibung text,
  programm text,
  projekt_id text,
  aufnahme_id text,
  partner_id text,
  quelle text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_chronik_geaendert on bk_chronik (geaendert_am);
alter table bk_chronik enable row level security;
drop trigger if exists bk_chronik_stempel on bk_chronik;
create trigger bk_chronik_stempel before update on bk_chronik for each row execute function bk_abgleich_stempel();

alter table bk_chronik add column if not exists jahr integer;
alter table bk_chronik add column if not exists datum date;
alter table bk_chronik add column if not exists titel text;
alter table bk_chronik add column if not exists art text;
alter table bk_chronik drop constraint if exists bk_chronik_art_check;
alter table bk_chronik add constraint bk_chronik_art_check check (art is null or art in ('gruendung', 'konzert', 'reise', 'austausch', 'cd', 'urauffuehrung', 'partner', 'auszeichnung', 'sonstiges'));
alter table bk_chronik add column if not exists ort text;
alter table bk_chronik add column if not exists beschreibung text;
alter table bk_chronik add column if not exists programm text;
alter table bk_chronik add column if not exists projekt_id text;
alter table bk_chronik add column if not exists aufnahme_id text;
alter table bk_chronik add column if not exists partner_id text;
alter table bk_chronik add column if not exists quelle text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_projekt_id_fk') then alter table bk_chronik add constraint bk_chronik_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_aufnahme_id_fk') then alter table bk_chronik add constraint bk_chronik_aufnahme_id_fk foreign key (aufnahme_id) references bk_aufnahmen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_partner_id_fk') then alter table bk_chronik add constraint bk_chronik_partner_id_fk foreign key (partner_id) references bk_partner(id) on delete restrict; end if; end $$;

-- Dokumente
create table if not exists bk_dokumente (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('satzung', 'flyer', 'formular', 'vorlage', 'info', 'protokoll')),
  beschreibung text,
  datei text,
  url text,
  fassung text,
  sichtbar text check (sichtbar is null or sichtbar in ('alle', 'eltern', 'schueler', 'verwaltung')),
  sort integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_dokumente_geaendert on bk_dokumente (geaendert_am);
alter table bk_dokumente enable row level security;
drop trigger if exists bk_dokumente_stempel on bk_dokumente;
create trigger bk_dokumente_stempel before update on bk_dokumente for each row execute function bk_abgleich_stempel();

alter table bk_dokumente add column if not exists titel text;
alter table bk_dokumente add column if not exists art text;
alter table bk_dokumente drop constraint if exists bk_dokumente_art_check;
alter table bk_dokumente add constraint bk_dokumente_art_check check (art is null or art in ('satzung', 'flyer', 'formular', 'vorlage', 'info', 'protokoll'));
alter table bk_dokumente add column if not exists beschreibung text;
alter table bk_dokumente add column if not exists datei text;
alter table bk_dokumente add column if not exists url text;
alter table bk_dokumente add column if not exists fassung text;
alter table bk_dokumente add column if not exists sichtbar text;
alter table bk_dokumente drop constraint if exists bk_dokumente_sichtbar_check;
alter table bk_dokumente add constraint bk_dokumente_sichtbar_check check (sichtbar is null or sichtbar in ('alle', 'eltern', 'schueler', 'verwaltung'));
alter table bk_dokumente add column if not exists sort integer;

-- Partner & Kontakte
create table if not exists bk_partner (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  art text check (art is null or art in ('musikschule', 'orchester', 'austausch', 'schule', 'kirche', 'stadt', 'presse', 'sonstige')),
  ort text,
  land text,
  ansprechpartner text,
  email text,
  telefon text,
  website text,
  seit integer,
  letzte_begegnung date,
  naechste_planung text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_partner_geaendert on bk_partner (geaendert_am);
alter table bk_partner enable row level security;
drop trigger if exists bk_partner_stempel on bk_partner;
create trigger bk_partner_stempel before update on bk_partner for each row execute function bk_abgleich_stempel();

alter table bk_partner add column if not exists name text;
alter table bk_partner add column if not exists art text;
alter table bk_partner drop constraint if exists bk_partner_art_check;
alter table bk_partner add constraint bk_partner_art_check check (art is null or art in ('musikschule', 'orchester', 'austausch', 'schule', 'kirche', 'stadt', 'presse', 'sonstige'));
alter table bk_partner add column if not exists ort text;
alter table bk_partner add column if not exists land text;
alter table bk_partner add column if not exists ansprechpartner text;
alter table bk_partner add column if not exists email text;
alter table bk_partner add column if not exists telefon text;
alter table bk_partner add column if not exists website text;
alter table bk_partner add column if not exists seit integer;
alter table bk_partner add column if not exists letzte_begegnung date;
alter table bk_partner add column if not exists naechste_planung text;
alter table bk_partner add column if not exists notiz text;

