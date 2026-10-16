-- Bachkreis-App – Nachtrag: Registerproben, Leihvertrag/Kaution, Eltern ab 18, Konzertprogramm, Reise-Anmeldung, Schuljahres-Regeln (0.21.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Personen
create table if not exists bk_personen (
  id text primary key default gen_random_uuid()::text,
  vorname text not null,
  nachname text not null,
  typ text not null check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig')),
  status text check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten')),
  ausgetreten_am date,
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

-- Eltern ↔ Kind
create table if not exists bk_eltern_kind (
  id text primary key default gen_random_uuid()::text,
  eltern_id text not null,
  kind_id text not null,
  beziehung text check (beziehung is null or beziehung in ('mutter', 'vater', 'sonstige')),
  hauptkontakt boolean,
  zugriff_ab_18 boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_eltern_kind_geaendert on bk_eltern_kind (geaendert_am);
alter table bk_eltern_kind enable row level security;
drop trigger if exists bk_eltern_kind_stempel on bk_eltern_kind;
create trigger bk_eltern_kind_stempel before update on bk_eltern_kind for each row execute function bk_abgleich_stempel();

alter table bk_eltern_kind add column if not exists eltern_id text;
alter table bk_eltern_kind add column if not exists kind_id text;
alter table bk_eltern_kind add column if not exists beziehung text;
alter table bk_eltern_kind drop constraint if exists bk_eltern_kind_beziehung_check;
alter table bk_eltern_kind add constraint bk_eltern_kind_beziehung_check check (beziehung is null or beziehung in ('mutter', 'vater', 'sonstige'));
alter table bk_eltern_kind add column if not exists hauptkontakt boolean;
alter table bk_eltern_kind add column if not exists zugriff_ab_18 boolean;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eltern_kind_eltern_id_fk') then alter table bk_eltern_kind add constraint bk_eltern_kind_eltern_id_fk foreign key (eltern_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eltern_kind_kind_id_fk') then alter table bk_eltern_kind add constraint bk_eltern_kind_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;

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
  wechsel_nach text,
  wechsel_ab_jg integer,
  ehemalige boolean,
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
alter table bk_gruppen add column if not exists wechsel_nach text;
alter table bk_gruppen add column if not exists wechsel_ab_jg integer;
alter table bk_gruppen add column if not exists ehemalige boolean;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gruppen_wechsel_nach_fk') then alter table bk_gruppen add constraint bk_gruppen_wechsel_nach_fk foreign key (wechsel_nach) references bk_gruppen(id) on delete restrict; end if; end $$;

-- Ausleihen
create table if not exists bk_ausleihen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text not null,
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
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_person_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_vertrag_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_vertrag_id_fk foreign key (vertrag_id) references bk_genehmigungen(id) on delete restrict; end if; end $$;

-- Genehmigungen
create table if not exists bk_genehmigungen (
  id text primary key default gen_random_uuid()::text,
  vorlage_id text not null,
  kind_id text not null,
  projekt_id text,
  frist date,
  status text check (status is null or status in ('ausstehend', 'erteilt', 'abgelehnt', 'widerrufen')),
  beantwortet_von text,
  beantwortet_am timestamptz,
  papier boolean,
  ausleihe_id text,
  vorlage_version integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_genehmigungen_geaendert on bk_genehmigungen (geaendert_am);
alter table bk_genehmigungen enable row level security;
drop trigger if exists bk_genehmigungen_stempel on bk_genehmigungen;
create trigger bk_genehmigungen_stempel before update on bk_genehmigungen for each row execute function bk_abgleich_stempel();

alter table bk_genehmigungen add column if not exists vorlage_id text;
alter table bk_genehmigungen add column if not exists kind_id text;
alter table bk_genehmigungen add column if not exists projekt_id text;
alter table bk_genehmigungen add column if not exists frist date;
alter table bk_genehmigungen add column if not exists status text;
alter table bk_genehmigungen drop constraint if exists bk_genehmigungen_status_check;
alter table bk_genehmigungen add constraint bk_genehmigungen_status_check check (status is null or status in ('ausstehend', 'erteilt', 'abgelehnt', 'widerrufen'));
alter table bk_genehmigungen add column if not exists beantwortet_von text;
alter table bk_genehmigungen add column if not exists beantwortet_am timestamptz;
alter table bk_genehmigungen add column if not exists papier boolean;
alter table bk_genehmigungen add column if not exists ausleihe_id text;
alter table bk_genehmigungen add column if not exists vorlage_version integer;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_vorlage_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_vorlage_id_fk foreign key (vorlage_id) references bk_genehmigung_vorlagen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_kind_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_projekt_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_beantwortet_von_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_beantwortet_von_fk foreign key (beantwortet_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_ausleihe_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_ausleihe_id_fk foreign key (ausleihe_id) references bk_ausleihen(id) on delete restrict; end if; end $$;

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
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_projekt_id_fk') then alter table bk_programm add constraint bk_programm_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_werk_id_fk') then alter table bk_programm add constraint bk_programm_werk_id_fk foreign key (werk_id) references bk_werke(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_programm_gruppe_id_fk') then alter table bk_programm add constraint bk_programm_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;

-- Anmeldungen (Reisen & Freizeiten)
create table if not exists bk_reise_anmeldungen (
  id text primary key default gen_random_uuid()::text,
  projekt_id text not null,
  person_id text not null,
  status text check (status is null or status in ('angemeldet', 'warteliste', 'abgemeldet')),
  angemeldet_von text,
  angemeldet_am timestamptz,
  betrag numeric(10,2),
  bezahlt boolean,
  bezahlt_am date,
  zimmer text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_reise_anmeldungen_geaendert on bk_reise_anmeldungen (geaendert_am);
alter table bk_reise_anmeldungen enable row level security;
drop trigger if exists bk_reise_anmeldungen_stempel on bk_reise_anmeldungen;
create trigger bk_reise_anmeldungen_stempel before update on bk_reise_anmeldungen for each row execute function bk_abgleich_stempel();

alter table bk_reise_anmeldungen add column if not exists projekt_id text;
alter table bk_reise_anmeldungen add column if not exists person_id text;
alter table bk_reise_anmeldungen add column if not exists status text;
alter table bk_reise_anmeldungen drop constraint if exists bk_reise_anmeldungen_status_check;
alter table bk_reise_anmeldungen add constraint bk_reise_anmeldungen_status_check check (status is null or status in ('angemeldet', 'warteliste', 'abgemeldet'));
alter table bk_reise_anmeldungen add column if not exists angemeldet_von text;
alter table bk_reise_anmeldungen add column if not exists angemeldet_am timestamptz;
alter table bk_reise_anmeldungen add column if not exists betrag numeric(10,2);
alter table bk_reise_anmeldungen add column if not exists bezahlt boolean;
alter table bk_reise_anmeldungen add column if not exists bezahlt_am date;
alter table bk_reise_anmeldungen add column if not exists zimmer text;
alter table bk_reise_anmeldungen add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reise_anmeldungen_projekt_id_fk') then alter table bk_reise_anmeldungen add constraint bk_reise_anmeldungen_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reise_anmeldungen_person_id_fk') then alter table bk_reise_anmeldungen add constraint bk_reise_anmeldungen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reise_anmeldungen_angemeldet_von_fk') then alter table bk_reise_anmeldungen add constraint bk_reise_anmeldungen_angemeldet_von_fk foreign key (angemeldet_von) references bk_personen(id) on delete restrict; end if; end $$;

