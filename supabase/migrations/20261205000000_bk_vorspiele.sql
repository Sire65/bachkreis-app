-- Bachkreis-App – Nachtrag: 🎙️ Vorspiele: aufnehmen und an Lehrkraft, Register, Orchester oder Auswahl senden (0.79.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Vorspiele
create table if not exists bk_vorspiele (
  id text primary key default gen_random_uuid()::text,
  von text not null,
  stueck text,
  notiz text,
  aufnahme text not null,
  dauer_sek integer,
  an_art text check (an_art is null or an_art in ('lehrkraft', 'register', 'orchester', 'auswahl')),
  an text[],
  loeschen_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_vorspiele_geaendert on bk_vorspiele (geaendert_am);
alter table bk_vorspiele enable row level security;
revoke all on bk_vorspiele from public, anon, authenticated;
grant select, insert, update, delete on bk_vorspiele to service_role;
drop trigger if exists bk_vorspiele_stempel on bk_vorspiele;
create trigger bk_vorspiele_stempel before update on bk_vorspiele for each row execute function bk_abgleich_stempel();

alter table bk_vorspiele add column if not exists von text;
alter table bk_vorspiele add column if not exists stueck text;
alter table bk_vorspiele add column if not exists notiz text;
alter table bk_vorspiele add column if not exists aufnahme text;
alter table bk_vorspiele add column if not exists dauer_sek integer;
alter table bk_vorspiele add column if not exists an_art text;
alter table bk_vorspiele drop constraint if exists bk_vorspiele_an_art_check;
alter table bk_vorspiele add constraint bk_vorspiele_an_art_check check (an_art is null or an_art in ('lehrkraft', 'register', 'orchester', 'auswahl'));
alter table bk_vorspiele add column if not exists an text[];
alter table bk_vorspiele add column if not exists loeschen_am date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiele_von_fk') then alter table bk_vorspiele add constraint bk_vorspiele_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Vorspiele: Antworten
create table if not exists bk_vorspiel_antworten (
  id text primary key default gen_random_uuid()::text,
  vorspiel_id text not null,
  von text not null,
  art text check (art is null or art in ('gehoert', 'tipp', 'text', 'sprache')),
  text text,
  aufnahme text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_vorspiel_antworten_geaendert on bk_vorspiel_antworten (geaendert_am);
alter table bk_vorspiel_antworten enable row level security;
revoke all on bk_vorspiel_antworten from public, anon, authenticated;
grant select, insert, update, delete on bk_vorspiel_antworten to service_role;
drop trigger if exists bk_vorspiel_antworten_stempel on bk_vorspiel_antworten;
create trigger bk_vorspiel_antworten_stempel before update on bk_vorspiel_antworten for each row execute function bk_abgleich_stempel();

alter table bk_vorspiel_antworten add column if not exists vorspiel_id text;
alter table bk_vorspiel_antworten add column if not exists von text;
alter table bk_vorspiel_antworten add column if not exists art text;
alter table bk_vorspiel_antworten drop constraint if exists bk_vorspiel_antworten_art_check;
alter table bk_vorspiel_antworten add constraint bk_vorspiel_antworten_art_check check (art is null or art in ('gehoert', 'tipp', 'text', 'sprache'));
alter table bk_vorspiel_antworten add column if not exists text text;
alter table bk_vorspiel_antworten add column if not exists aufnahme text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiel_antworten_vorspiel_id_fk') then alter table bk_vorspiel_antworten add constraint bk_vorspiel_antworten_vorspiel_id_fk foreign key (vorspiel_id) references bk_vorspiele(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiel_antworten_von_fk') then alter table bk_vorspiel_antworten add constraint bk_vorspiel_antworten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_vorspiele_von on bk_vorspiele (von);
create index if not exists bk_vorspiel_antworten_vs on bk_vorspiel_antworten (vorspiel_id);

