-- Bachkreis-App – Nachtrag: 📦 Inventur per Regal-Schild: Lagerorte, Inventuren (0.63.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Lagerorte (Regal · Fach · Schrank)
create table if not exists bk_lagerorte (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  raum text,
  hinweis text,
  sort integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_lagerorte_geaendert on bk_lagerorte (geaendert_am);
alter table bk_lagerorte enable row level security;
revoke all on bk_lagerorte from public, anon, authenticated;
grant select, insert, update, delete on bk_lagerorte to service_role;
drop trigger if exists bk_lagerorte_stempel on bk_lagerorte;
create trigger bk_lagerorte_stempel before update on bk_lagerorte for each row execute function bk_abgleich_stempel();

alter table bk_lagerorte add column if not exists name text;
alter table bk_lagerorte add column if not exists raum text;
alter table bk_lagerorte add column if not exists hinweis text;
alter table bk_lagerorte add column if not exists sort integer;

-- Inventuren
create table if not exists bk_inventuren (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  beginn timestamptz,
  abgeschlossen timestamptz,
  ergebnis jsonb,
  von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_inventuren_geaendert on bk_inventuren (geaendert_am);
alter table bk_inventuren enable row level security;
revoke all on bk_inventuren from public, anon, authenticated;
grant select, insert, update, delete on bk_inventuren to service_role;
drop trigger if exists bk_inventuren_stempel on bk_inventuren;
create trigger bk_inventuren_stempel before update on bk_inventuren for each row execute function bk_abgleich_stempel();

alter table bk_inventuren add column if not exists titel text;
alter table bk_inventuren add column if not exists beginn timestamptz;
alter table bk_inventuren add column if not exists abgeschlossen timestamptz;
alter table bk_inventuren add column if not exists ergebnis jsonb;
alter table bk_inventuren add column if not exists von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_inventuren_von_fk') then alter table bk_inventuren add constraint bk_inventuren_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Inventar (Instrumente)
create table if not exists bk_inventar (
  id text primary key default gen_random_uuid()::text,
  inventar_nr text not null,
  typ_id text not null,
  bezeichnung text,
  groesse text,
  zustand text check (zustand is null or zustand in ('sehr_gut', 'gut', 'gebraucht', 'maengel')),
  status text check (status is null or status in ('verfuegbar', 'im_einsatz', 'verliehen', 'reparatur', 'defekt', 'vermisst', 'gestohlen', 'ausgemustert', 'verkauft', 'verschrottet')),
  standort text,
  wert numeric(10,2),
  anschaffung date,
  finanziert_von text,
  wartung_faellig date,
  seriennummer text,
  eigentuemer text check (eigentuemer is null or eigentuemer in ('foerderverein', 'schule', 'leihgabe', 'privat')),
  haendler text,
  beleg text,
  garantie_bis date,
  afa_art text check (afa_art is null or afa_art in ('linear', 'sofort', 'keine')),
  afa_jahre integer,
  verantwortlich_id text,
  inventur_am date,
  lagerort_id text,
  ausgeschieden_am date,
  ausgeschieden_grund text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_inventar_geaendert on bk_inventar (geaendert_am);
alter table bk_inventar enable row level security;
revoke all on bk_inventar from public, anon, authenticated;
grant select, insert, update, delete on bk_inventar to service_role;
drop trigger if exists bk_inventar_stempel on bk_inventar;
create trigger bk_inventar_stempel before update on bk_inventar for each row execute function bk_abgleich_stempel();

alter table bk_inventar add column if not exists inventar_nr text;
alter table bk_inventar add column if not exists typ_id text;
alter table bk_inventar add column if not exists bezeichnung text;
alter table bk_inventar add column if not exists groesse text;
alter table bk_inventar add column if not exists zustand text;
alter table bk_inventar drop constraint if exists bk_inventar_zustand_check;
alter table bk_inventar add constraint bk_inventar_zustand_check check (zustand is null or zustand in ('sehr_gut', 'gut', 'gebraucht', 'maengel'));
alter table bk_inventar add column if not exists status text;
alter table bk_inventar drop constraint if exists bk_inventar_status_check;
alter table bk_inventar add constraint bk_inventar_status_check check (status is null or status in ('verfuegbar', 'im_einsatz', 'verliehen', 'reparatur', 'defekt', 'vermisst', 'gestohlen', 'ausgemustert', 'verkauft', 'verschrottet'));
alter table bk_inventar add column if not exists standort text;
alter table bk_inventar add column if not exists wert numeric(10,2);
alter table bk_inventar add column if not exists anschaffung date;
alter table bk_inventar add column if not exists finanziert_von text;
alter table bk_inventar add column if not exists wartung_faellig date;
alter table bk_inventar add column if not exists seriennummer text;
alter table bk_inventar add column if not exists eigentuemer text;
alter table bk_inventar drop constraint if exists bk_inventar_eigentuemer_check;
alter table bk_inventar add constraint bk_inventar_eigentuemer_check check (eigentuemer is null or eigentuemer in ('foerderverein', 'schule', 'leihgabe', 'privat'));
alter table bk_inventar add column if not exists haendler text;
alter table bk_inventar add column if not exists beleg text;
alter table bk_inventar add column if not exists garantie_bis date;
alter table bk_inventar add column if not exists afa_art text;
alter table bk_inventar drop constraint if exists bk_inventar_afa_art_check;
alter table bk_inventar add constraint bk_inventar_afa_art_check check (afa_art is null or afa_art in ('linear', 'sofort', 'keine'));
alter table bk_inventar add column if not exists afa_jahre integer;
alter table bk_inventar add column if not exists verantwortlich_id text;
alter table bk_inventar add column if not exists inventur_am date;
alter table bk_inventar add column if not exists lagerort_id text;
alter table bk_inventar add column if not exists ausgeschieden_am date;
alter table bk_inventar add column if not exists ausgeschieden_grund text;
alter table bk_inventar add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_inventar_typ_id_fk') then alter table bk_inventar add constraint bk_inventar_typ_id_fk foreign key (typ_id) references bk_instrument_typen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_inventar_verantwortlich_id_fk') then alter table bk_inventar add constraint bk_inventar_verantwortlich_id_fk foreign key (verantwortlich_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_inventar_lagerort_id_fk') then alter table bk_inventar add constraint bk_inventar_lagerort_id_fk foreign key (lagerort_id) references bk_lagerorte(id) on delete restrict; end if; end $$;

-- Ausstattung & Zubehör
create table if not exists bk_ausstattung (
  id text primary key default gen_random_uuid()::text,
  inventar_nr text not null,
  kategorie text not null check (kategorie is null or kategorie in ('notenstaender', 'dirigent', 'stuhl', 'schlagwerk', 'koffer', 'technik', 'licht', 'notenarchiv', 'edv', 'moebel', 'kleidung', 'pflege', 'sonstiges')),
  bezeichnung text not null,
  hersteller text,
  anzahl integer,
  status text check (status is null or status in ('verfuegbar', 'im_einsatz', 'verliehen', 'reparatur', 'defekt', 'vermisst', 'gestohlen', 'ausgemustert', 'verkauft', 'verschrottet')),
  zustand text check (zustand is null or zustand in ('neu', 'sehr_gut', 'gut', 'gebraucht', 'maengel')),
  standort text,
  anschaffung date,
  wert numeric(10,2),
  finanzierung text check (finanzierung is null or finanzierung in ('foerderverein', 'schule', 'spende', 'zuschuss', 'sonstige')),
  einkauf_id text,
  seriennummer text,
  eigentuemer text check (eigentuemer is null or eigentuemer in ('foerderverein', 'schule', 'leihgabe', 'privat')),
  haendler text,
  beleg text,
  garantie_bis date,
  afa_art text check (afa_art is null or afa_art in ('linear', 'sofort', 'keine')),
  afa_jahre integer,
  verantwortlich_id text,
  inventur_am date,
  lagerort_id text,
  ausgeschieden_am date,
  ausgeschieden_grund text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_ausstattung_geaendert on bk_ausstattung (geaendert_am);
alter table bk_ausstattung enable row level security;
revoke all on bk_ausstattung from public, anon, authenticated;
grant select, insert, update, delete on bk_ausstattung to service_role;
drop trigger if exists bk_ausstattung_stempel on bk_ausstattung;
create trigger bk_ausstattung_stempel before update on bk_ausstattung for each row execute function bk_abgleich_stempel();

alter table bk_ausstattung add column if not exists inventar_nr text;
alter table bk_ausstattung add column if not exists kategorie text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_kategorie_check;
alter table bk_ausstattung add constraint bk_ausstattung_kategorie_check check (kategorie is null or kategorie in ('notenstaender', 'dirigent', 'stuhl', 'schlagwerk', 'koffer', 'technik', 'licht', 'notenarchiv', 'edv', 'moebel', 'kleidung', 'pflege', 'sonstiges'));
alter table bk_ausstattung add column if not exists bezeichnung text;
alter table bk_ausstattung add column if not exists hersteller text;
alter table bk_ausstattung add column if not exists anzahl integer;
alter table bk_ausstattung add column if not exists status text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_status_check;
alter table bk_ausstattung add constraint bk_ausstattung_status_check check (status is null or status in ('verfuegbar', 'im_einsatz', 'verliehen', 'reparatur', 'defekt', 'vermisst', 'gestohlen', 'ausgemustert', 'verkauft', 'verschrottet'));
alter table bk_ausstattung add column if not exists zustand text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_zustand_check;
alter table bk_ausstattung add constraint bk_ausstattung_zustand_check check (zustand is null or zustand in ('neu', 'sehr_gut', 'gut', 'gebraucht', 'maengel'));
alter table bk_ausstattung add column if not exists standort text;
alter table bk_ausstattung add column if not exists anschaffung date;
alter table bk_ausstattung add column if not exists wert numeric(10,2);
alter table bk_ausstattung add column if not exists finanzierung text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_finanzierung_check;
alter table bk_ausstattung add constraint bk_ausstattung_finanzierung_check check (finanzierung is null or finanzierung in ('foerderverein', 'schule', 'spende', 'zuschuss', 'sonstige'));
alter table bk_ausstattung add column if not exists einkauf_id text;
alter table bk_ausstattung add column if not exists seriennummer text;
alter table bk_ausstattung add column if not exists eigentuemer text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_eigentuemer_check;
alter table bk_ausstattung add constraint bk_ausstattung_eigentuemer_check check (eigentuemer is null or eigentuemer in ('foerderverein', 'schule', 'leihgabe', 'privat'));
alter table bk_ausstattung add column if not exists haendler text;
alter table bk_ausstattung add column if not exists beleg text;
alter table bk_ausstattung add column if not exists garantie_bis date;
alter table bk_ausstattung add column if not exists afa_art text;
alter table bk_ausstattung drop constraint if exists bk_ausstattung_afa_art_check;
alter table bk_ausstattung add constraint bk_ausstattung_afa_art_check check (afa_art is null or afa_art in ('linear', 'sofort', 'keine'));
alter table bk_ausstattung add column if not exists afa_jahre integer;
alter table bk_ausstattung add column if not exists verantwortlich_id text;
alter table bk_ausstattung add column if not exists inventur_am date;
alter table bk_ausstattung add column if not exists lagerort_id text;
alter table bk_ausstattung add column if not exists ausgeschieden_am date;
alter table bk_ausstattung add column if not exists ausgeschieden_grund text;
alter table bk_ausstattung add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausstattung_einkauf_id_fk') then alter table bk_ausstattung add constraint bk_ausstattung_einkauf_id_fk foreign key (einkauf_id) references bk_einkaeufe(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausstattung_verantwortlich_id_fk') then alter table bk_ausstattung add constraint bk_ausstattung_verantwortlich_id_fk foreign key (verantwortlich_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausstattung_lagerort_id_fk') then alter table bk_ausstattung add constraint bk_ausstattung_lagerort_id_fk foreign key (lagerort_id) references bk_lagerorte(id) on delete restrict; end if; end $$;

create index if not exists bk_inventar_lagerort on bk_inventar (lagerort_id);

