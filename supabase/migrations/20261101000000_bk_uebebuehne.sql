-- Bachkreis-App – Nachtrag: Übe-Bühne: Aufgaben mit Notenstelle/Rhythmus/Tonleiter/Ton halten/Ohr-Spiel/Material, Ergebnisse, Einwilligung Übe-Aufnahmen (0.26.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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

-- Übe-Bühne: Ergebnisse
create table if not exists bk_uebe_ergebnisse (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  aufgabe_id text,
  modus text check (modus is null or modus in ('mitspielen', 'griffe', 'rhythmus', 'stimmen', 'gehoer')),
  stueck text,
  datum date not null,
  minuten integer,
  sterne integer,
  tempo integer,
  aufnahme text,
  loeschen_am date,
  rueckmeldung text,
  rueckmeldung_von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_uebe_ergebnisse_geaendert on bk_uebe_ergebnisse (geaendert_am);
alter table bk_uebe_ergebnisse enable row level security;
drop trigger if exists bk_uebe_ergebnisse_stempel on bk_uebe_ergebnisse;
create trigger bk_uebe_ergebnisse_stempel before update on bk_uebe_ergebnisse for each row execute function bk_abgleich_stempel();

alter table bk_uebe_ergebnisse add column if not exists person_id text;
alter table bk_uebe_ergebnisse add column if not exists aufgabe_id text;
alter table bk_uebe_ergebnisse add column if not exists modus text;
alter table bk_uebe_ergebnisse drop constraint if exists bk_uebe_ergebnisse_modus_check;
alter table bk_uebe_ergebnisse add constraint bk_uebe_ergebnisse_modus_check check (modus is null or modus in ('mitspielen', 'griffe', 'rhythmus', 'stimmen', 'gehoer'));
alter table bk_uebe_ergebnisse add column if not exists stueck text;
alter table bk_uebe_ergebnisse add column if not exists datum date;
alter table bk_uebe_ergebnisse add column if not exists minuten integer;
alter table bk_uebe_ergebnisse add column if not exists sterne integer;
alter table bk_uebe_ergebnisse add column if not exists tempo integer;
alter table bk_uebe_ergebnisse add column if not exists aufnahme text;
alter table bk_uebe_ergebnisse add column if not exists loeschen_am date;
alter table bk_uebe_ergebnisse add column if not exists rueckmeldung text;
alter table bk_uebe_ergebnisse add column if not exists rueckmeldung_von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebe_ergebnisse_person_id_fk') then alter table bk_uebe_ergebnisse add constraint bk_uebe_ergebnisse_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebe_ergebnisse_aufgabe_id_fk') then alter table bk_uebe_ergebnisse add constraint bk_uebe_ergebnisse_aufgabe_id_fk foreign key (aufgabe_id) references bk_uebeaufgaben(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_uebe_ergebnisse_rueckmeldung_von_fk') then alter table bk_uebe_ergebnisse add constraint bk_uebe_ergebnisse_rueckmeldung_von_fk foreign key (rueckmeldung_von) references bk_personen(id) on delete restrict; end if; end $$;

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

