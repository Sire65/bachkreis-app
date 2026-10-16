-- Bachkreis-App – Nachtrag: Mitfahrten, Räume & Schlüssel, Notenexemplare, Mietmaterial/GEMA, Übeaufgaben, Förderverein-Mitglieder, Führungszeugnis, Reparatur/Spende für Ausstattung (0.22.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Personen
create table if not exists bk_personen (
  id text primary key default gen_random_uuid()::text,
  vorname text not null,
  nachname text not null,
  typ text not null check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig')),
  status text check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten')),
  ausgetreten_am date,
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

-- Reparaturen & Wartung
create table if not exists bk_reparaturen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text,
  ausstattung_id text,
  meldung text not null,
  status text check (status is null or status in ('gemeldet', 'angebot', 'freigegeben', 'in_arbeit', 'erledigt', 'abgelehnt')),
  werkstatt_id text,
  kosten numeric(10,2),
  gemeldet_von text,
  freigegeben_von text,
  gemeldet_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_reparaturen_geaendert on bk_reparaturen (geaendert_am);
alter table bk_reparaturen enable row level security;
drop trigger if exists bk_reparaturen_stempel on bk_reparaturen;
create trigger bk_reparaturen_stempel before update on bk_reparaturen for each row execute function bk_abgleich_stempel();

alter table bk_reparaturen add column if not exists inventar_id text;
alter table bk_reparaturen add column if not exists ausstattung_id text;
alter table bk_reparaturen add column if not exists meldung text;
alter table bk_reparaturen add column if not exists status text;
alter table bk_reparaturen drop constraint if exists bk_reparaturen_status_check;
alter table bk_reparaturen add constraint bk_reparaturen_status_check check (status is null or status in ('gemeldet', 'angebot', 'freigegeben', 'in_arbeit', 'erledigt', 'abgelehnt'));
alter table bk_reparaturen add column if not exists werkstatt_id text;
alter table bk_reparaturen add column if not exists kosten numeric(10,2);
alter table bk_reparaturen add column if not exists gemeldet_von text;
alter table bk_reparaturen add column if not exists freigegeben_von text;
alter table bk_reparaturen add column if not exists gemeldet_am date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_inventar_id_fk') then alter table bk_reparaturen add constraint bk_reparaturen_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_ausstattung_id_fk') then alter table bk_reparaturen add constraint bk_reparaturen_ausstattung_id_fk foreign key (ausstattung_id) references bk_ausstattung(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_werkstatt_id_fk') then alter table bk_reparaturen add constraint bk_reparaturen_werkstatt_id_fk foreign key (werkstatt_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_gemeldet_von_fk') then alter table bk_reparaturen add constraint bk_reparaturen_gemeldet_von_fk foreign key (gemeldet_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_freigegeben_von_fk') then alter table bk_reparaturen add constraint bk_reparaturen_freigegeben_von_fk foreign key (freigegeben_von) references bk_personen(id) on delete restrict; end if; end $$;

-- Notenarchiv – Werke
create table if not exists bk_werke (
  id text primary key default gen_random_uuid()::text,
  komponist text not null,
  titel text not null,
  werkverzeichnis text,
  ausgabe text,
  rechte text check (rechte is null or rechte in ('gemeinfrei', 'lizenziert', 'intern')),
  projekte text[],
  gruppen text[],
  schwierigkeit text check (schwierigkeit is null or schwierigkeit in ('leicht', 'mittel', 'schwer')),
  dauer_min integer,
  verlag text,
  bearbeiter text,
  miete_bis date,
  gema boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_werke_geaendert on bk_werke (geaendert_am);
alter table bk_werke enable row level security;
drop trigger if exists bk_werke_stempel on bk_werke;
create trigger bk_werke_stempel before update on bk_werke for each row execute function bk_abgleich_stempel();

alter table bk_werke add column if not exists komponist text;
alter table bk_werke add column if not exists titel text;
alter table bk_werke add column if not exists werkverzeichnis text;
alter table bk_werke add column if not exists ausgabe text;
alter table bk_werke add column if not exists rechte text;
alter table bk_werke drop constraint if exists bk_werke_rechte_check;
alter table bk_werke add constraint bk_werke_rechte_check check (rechte is null or rechte in ('gemeinfrei', 'lizenziert', 'intern'));
alter table bk_werke add column if not exists projekte text[];
alter table bk_werke add column if not exists gruppen text[];
alter table bk_werke add column if not exists schwierigkeit text;
alter table bk_werke drop constraint if exists bk_werke_schwierigkeit_check;
alter table bk_werke add constraint bk_werke_schwierigkeit_check check (schwierigkeit is null or schwierigkeit in ('leicht', 'mittel', 'schwer'));
alter table bk_werke add column if not exists dauer_min integer;
alter table bk_werke add column if not exists verlag text;
alter table bk_werke add column if not exists bearbeiter text;
alter table bk_werke add column if not exists miete_bis date;
alter table bk_werke add column if not exists gema boolean;

-- Unterstützer & Spenden
create table if not exists bk_spenden (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  datum date not null,
  betrag numeric(10,2),
  sachspende text,
  zweck text,
  dank_gesendet boolean,
  inventar_id text,
  ausstattung_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_spenden_geaendert on bk_spenden (geaendert_am);
alter table bk_spenden enable row level security;
drop trigger if exists bk_spenden_stempel on bk_spenden;
create trigger bk_spenden_stempel before update on bk_spenden for each row execute function bk_abgleich_stempel();

alter table bk_spenden add column if not exists person_id text;
alter table bk_spenden add column if not exists datum date;
alter table bk_spenden add column if not exists betrag numeric(10,2);
alter table bk_spenden add column if not exists sachspende text;
alter table bk_spenden add column if not exists zweck text;
alter table bk_spenden add column if not exists dank_gesendet boolean;
alter table bk_spenden add column if not exists inventar_id text;
alter table bk_spenden add column if not exists ausstattung_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_spenden_person_id_fk') then alter table bk_spenden add constraint bk_spenden_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_spenden_inventar_id_fk') then alter table bk_spenden add constraint bk_spenden_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_spenden_ausstattung_id_fk') then alter table bk_spenden add constraint bk_spenden_ausstattung_id_fk foreign key (ausstattung_id) references bk_ausstattung(id) on delete restrict; end if; end $$;

-- Förderverein – Mitglieder
create table if not exists bk_fv_mitglieder (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  mitglied_nr text,
  eintritt date not null,
  austritt date,
  beitrag_art text check (beitrag_art is null or beitrag_art in ('familie', 'einzel', 'ermaessigt', 'foerder', 'ehren')),
  beitrag numeric(10,2),
  zahlweise text check (zahlweise is null or zahlweise in ('ueberweisung', 'bar', 'dauerauftrag')),
  bezahlt_bis date,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_fv_mitglieder_geaendert on bk_fv_mitglieder (geaendert_am);
alter table bk_fv_mitglieder enable row level security;
drop trigger if exists bk_fv_mitglieder_stempel on bk_fv_mitglieder;
create trigger bk_fv_mitglieder_stempel before update on bk_fv_mitglieder for each row execute function bk_abgleich_stempel();

alter table bk_fv_mitglieder add column if not exists person_id text;
alter table bk_fv_mitglieder add column if not exists mitglied_nr text;
alter table bk_fv_mitglieder add column if not exists eintritt date;
alter table bk_fv_mitglieder add column if not exists austritt date;
alter table bk_fv_mitglieder add column if not exists beitrag_art text;
alter table bk_fv_mitglieder drop constraint if exists bk_fv_mitglieder_beitrag_art_check;
alter table bk_fv_mitglieder add constraint bk_fv_mitglieder_beitrag_art_check check (beitrag_art is null or beitrag_art in ('familie', 'einzel', 'ermaessigt', 'foerder', 'ehren'));
alter table bk_fv_mitglieder add column if not exists beitrag numeric(10,2);
alter table bk_fv_mitglieder add column if not exists zahlweise text;
alter table bk_fv_mitglieder drop constraint if exists bk_fv_mitglieder_zahlweise_check;
alter table bk_fv_mitglieder add constraint bk_fv_mitglieder_zahlweise_check check (zahlweise is null or zahlweise in ('ueberweisung', 'bar', 'dauerauftrag'));
alter table bk_fv_mitglieder add column if not exists bezahlt_bis date;
alter table bk_fv_mitglieder add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fv_mitglieder_person_id_fk') then alter table bk_fv_mitglieder add constraint bk_fv_mitglieder_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Räume
create table if not exists bk_raeume (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  ort text,
  plaetze integer,
  ausstattung text,
  hinweis text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_raeume_geaendert on bk_raeume (geaendert_am);
alter table bk_raeume enable row level security;
drop trigger if exists bk_raeume_stempel on bk_raeume;
create trigger bk_raeume_stempel before update on bk_raeume for each row execute function bk_abgleich_stempel();

alter table bk_raeume add column if not exists name text;
alter table bk_raeume add column if not exists ort text;
alter table bk_raeume add column if not exists plaetze integer;
alter table bk_raeume add column if not exists ausstattung text;
alter table bk_raeume add column if not exists hinweis text;

-- Schlüssel
create table if not exists bk_schluessel (
  id text primary key default gen_random_uuid()::text,
  nr text not null,
  raum_id text,
  bezeichnung text,
  person_id text,
  ausgegeben_am date,
  rueckgabe_bis date,
  status text check (status is null or status in ('da', 'ausgegeben', 'verloren')),
  kaution numeric(10,2),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_schluessel_geaendert on bk_schluessel (geaendert_am);
alter table bk_schluessel enable row level security;
drop trigger if exists bk_schluessel_stempel on bk_schluessel;
create trigger bk_schluessel_stempel before update on bk_schluessel for each row execute function bk_abgleich_stempel();

alter table bk_schluessel add column if not exists nr text;
alter table bk_schluessel add column if not exists raum_id text;
alter table bk_schluessel add column if not exists bezeichnung text;
alter table bk_schluessel add column if not exists person_id text;
alter table bk_schluessel add column if not exists ausgegeben_am date;
alter table bk_schluessel add column if not exists rueckgabe_bis date;
alter table bk_schluessel add column if not exists status text;
alter table bk_schluessel drop constraint if exists bk_schluessel_status_check;
alter table bk_schluessel add constraint bk_schluessel_status_check check (status is null or status in ('da', 'ausgegeben', 'verloren'));
alter table bk_schluessel add column if not exists kaution numeric(10,2);
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_schluessel_raum_id_fk') then alter table bk_schluessel add constraint bk_schluessel_raum_id_fk foreign key (raum_id) references bk_raeume(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_schluessel_person_id_fk') then alter table bk_schluessel add constraint bk_schluessel_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Notenexemplare (Papier)
create table if not exists bk_notenexemplare (
  id text primary key default gen_random_uuid()::text,
  stimme_id text not null,
  nr text not null,
  person_id text,
  ausgegeben_am date,
  zurueck_am date,
  zustand text check (zustand is null or zustand in ('gut', 'bleistift', 'beschaedigt', 'fehlt')),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_notenexemplare_geaendert on bk_notenexemplare (geaendert_am);
alter table bk_notenexemplare enable row level security;
drop trigger if exists bk_notenexemplare_stempel on bk_notenexemplare;
create trigger bk_notenexemplare_stempel before update on bk_notenexemplare for each row execute function bk_abgleich_stempel();

alter table bk_notenexemplare add column if not exists stimme_id text;
alter table bk_notenexemplare add column if not exists nr text;
alter table bk_notenexemplare add column if not exists person_id text;
alter table bk_notenexemplare add column if not exists ausgegeben_am date;
alter table bk_notenexemplare add column if not exists zurueck_am date;
alter table bk_notenexemplare add column if not exists zustand text;
alter table bk_notenexemplare drop constraint if exists bk_notenexemplare_zustand_check;
alter table bk_notenexemplare add constraint bk_notenexemplare_zustand_check check (zustand is null or zustand in ('gut', 'bleistift', 'beschaedigt', 'fehlt'));
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_notenexemplare_stimme_id_fk') then alter table bk_notenexemplare add constraint bk_notenexemplare_stimme_id_fk foreign key (stimme_id) references bk_stimmen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_notenexemplare_person_id_fk') then alter table bk_notenexemplare add constraint bk_notenexemplare_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Übeaufgaben
create table if not exists bk_uebeaufgaben (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  text text,
  werk_id text,
  person_id text,
  register_id text,
  gruppe_id text,
  von_id text,
  bis date,
  erledigt text[],
  art text check (art is null or art in ('frei', 'notenstelle', 'rhythmus', 'tonleiter', 'tonhalten', 'gehoer', 'material')),
  stueck text check (stueck is null or stueck in ('menuett', 'kanon', 'freude', 'nachtmusik', 'largo', 'fanfare')),
  takt_von integer,
  takt_bis integer,
  tempo_ziel integer,
  muster text,
  taktart integer,
  tonart text check (tonart is null or tonart in ('C', 'G', 'D', 'A', 'E', 'F', 'B', 'Es', 'a', 'e', 'h', 'd', 'g')),
  oktaven integer,
  ton text,
  sekunden integer,
  spiel text check (spiel is null or spiel in ('hoehe', 'durmoll', 'nachklatschen')),
  ziel_sterne integer,
  datei text,
  vorspiel text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_uebeaufgaben_geaendert on bk_uebeaufgaben (geaendert_am);
alter table bk_uebeaufgaben enable row level security;
drop trigger if exists bk_uebeaufgaben_stempel on bk_uebeaufgaben;
create trigger bk_uebeaufgaben_stempel before update on bk_uebeaufgaben for each row execute function bk_abgleich_stempel();

alter table bk_uebeaufgaben add column if not exists titel text;
alter table bk_uebeaufgaben add column if not exists text text;
alter table bk_uebeaufgaben add column if not exists werk_id text;
alter table bk_uebeaufgaben add column if not exists person_id text;
alter table bk_uebeaufgaben add column if not exists register_id text;
alter table bk_uebeaufgaben add column if not exists gruppe_id text;
alter table bk_uebeaufgaben add column if not exists von_id text;
alter table bk_uebeaufgaben add column if not exists bis date;
alter table bk_uebeaufgaben add column if not exists erledigt text[];
alter table bk_uebeaufgaben add column if not exists art text;
alter table bk_uebeaufgaben drop constraint if exists bk_uebeaufgaben_art_check;
alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_art_check check (art is null or art in ('frei', 'notenstelle', 'rhythmus', 'tonleiter', 'tonhalten', 'gehoer', 'material'));
alter table bk_uebeaufgaben add column if not exists stueck text;
alter table bk_uebeaufgaben drop constraint if exists bk_uebeaufgaben_stueck_check;
alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_stueck_check check (stueck is null or stueck in ('menuett', 'kanon', 'freude', 'nachtmusik', 'largo', 'fanfare'));
alter table bk_uebeaufgaben add column if not exists takt_von integer;
alter table bk_uebeaufgaben add column if not exists takt_bis integer;
alter table bk_uebeaufgaben add column if not exists tempo_ziel integer;
alter table bk_uebeaufgaben add column if not exists muster text;
alter table bk_uebeaufgaben add column if not exists taktart integer;
alter table bk_uebeaufgaben add column if not exists tonart text;
alter table bk_uebeaufgaben drop constraint if exists bk_uebeaufgaben_tonart_check;
alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_tonart_check check (tonart is null or tonart in ('C', 'G', 'D', 'A', 'E', 'F', 'B', 'Es', 'a', 'e', 'h', 'd', 'g'));
alter table bk_uebeaufgaben add column if not exists oktaven integer;
alter table bk_uebeaufgaben add column if not exists ton text;
alter table bk_uebeaufgaben add column if not exists sekunden integer;
alter table bk_uebeaufgaben add column if not exists spiel text;
alter table bk_uebeaufgaben drop constraint if exists bk_uebeaufgaben_spiel_check;
alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_spiel_check check (spiel is null or spiel in ('hoehe', 'durmoll', 'nachklatschen'));
alter table bk_uebeaufgaben add column if not exists ziel_sterne integer;
alter table bk_uebeaufgaben add column if not exists datei text;
alter table bk_uebeaufgaben add column if not exists vorspiel text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebeaufgaben_werk_id_fk') then alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_werk_id_fk foreign key (werk_id) references bk_werke(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebeaufgaben_person_id_fk') then alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebeaufgaben_register_id_fk') then alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebeaufgaben_gruppe_id_fk') then alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebeaufgaben_von_id_fk') then alter table bk_uebeaufgaben add constraint bk_uebeaufgaben_von_id_fk foreign key (von_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Mitfahrbörse
create table if not exists bk_mitfahrten (
  id text primary key default gen_random_uuid()::text,
  termin_id text not null,
  art text check (art is null or art in ('angebot', 'gesuch')),
  fahrer_id text not null,
  richtung text check (richtung is null or richtung in ('hin', 'zurueck', 'beides')),
  plaetze integer,
  abfahrt text,
  mitfahrer text[],
  zusage_von text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_mitfahrten_geaendert on bk_mitfahrten (geaendert_am);
alter table bk_mitfahrten enable row level security;
drop trigger if exists bk_mitfahrten_stempel on bk_mitfahrten;
create trigger bk_mitfahrten_stempel before update on bk_mitfahrten for each row execute function bk_abgleich_stempel();

alter table bk_mitfahrten add column if not exists termin_id text;
alter table bk_mitfahrten add column if not exists art text;
alter table bk_mitfahrten drop constraint if exists bk_mitfahrten_art_check;
alter table bk_mitfahrten add constraint bk_mitfahrten_art_check check (art is null or art in ('angebot', 'gesuch'));
alter table bk_mitfahrten add column if not exists fahrer_id text;
alter table bk_mitfahrten add column if not exists richtung text;
alter table bk_mitfahrten drop constraint if exists bk_mitfahrten_richtung_check;
alter table bk_mitfahrten add constraint bk_mitfahrten_richtung_check check (richtung is null or richtung in ('hin', 'zurueck', 'beides'));
alter table bk_mitfahrten add column if not exists plaetze integer;
alter table bk_mitfahrten add column if not exists abfahrt text;
alter table bk_mitfahrten add column if not exists mitfahrer text[];
alter table bk_mitfahrten add column if not exists zusage_von text;
alter table bk_mitfahrten add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_termin_id_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_fahrer_id_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_fahrer_id_fk foreign key (fahrer_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_zusage_von_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_zusage_von_fk foreign key (zusage_von) references bk_personen(id) on delete restrict; end if; end $$;

alter table bk_reparaturen alter column inventar_id drop not null;

