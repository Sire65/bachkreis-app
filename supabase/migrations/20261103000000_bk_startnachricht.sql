-- Bachkreis-App – Nachtrag: Startnachricht der Leitung mit Antworten Ja/Später/Nein (0.30.0) + ausdrückliche Rechte für service_role (KC-SUPABASE-GRANTS) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Startnachrichten
create table if not exists bk_startnachrichten (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  von text,
  an text check (an is null or an in ('alle', 'gruppen', 'personen')),
  gruppen text[],
  personen text[],
  wichtig boolean,
  wahl boolean,
  ziel text,
  zeit timestamptz,
  bis date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_startnachrichten_geaendert on bk_startnachrichten (geaendert_am);
alter table bk_startnachrichten enable row level security;
revoke all on bk_startnachrichten from public, anon, authenticated;
grant select, insert, update, delete on bk_startnachrichten to service_role;
drop trigger if exists bk_startnachrichten_stempel on bk_startnachrichten;
create trigger bk_startnachrichten_stempel before update on bk_startnachrichten for each row execute function bk_abgleich_stempel();

alter table bk_startnachrichten add column if not exists text text;
alter table bk_startnachrichten add column if not exists von text;
alter table bk_startnachrichten add column if not exists an text;
alter table bk_startnachrichten drop constraint if exists bk_startnachrichten_an_check;
alter table bk_startnachrichten add constraint bk_startnachrichten_an_check check (an is null or an in ('alle', 'gruppen', 'personen'));
alter table bk_startnachrichten add column if not exists gruppen text[];
alter table bk_startnachrichten add column if not exists personen text[];
alter table bk_startnachrichten add column if not exists wichtig boolean;
alter table bk_startnachrichten add column if not exists wahl boolean;
alter table bk_startnachrichten add column if not exists ziel text;
alter table bk_startnachrichten add column if not exists zeit timestamptz;
alter table bk_startnachrichten add column if not exists bis date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_startnachrichten_von_fk') then alter table bk_startnachrichten add constraint bk_startnachrichten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Startnachricht: Antworten
create table if not exists bk_startnachricht_antworten (
  id text primary key default gen_random_uuid()::text,
  nachricht_id text not null,
  person_id text not null,
  antwort text check (antwort is null or antwort in ('gelesen', 'ja', 'spaeter', 'nein')),
  rueckfrage text,
  am timestamptz,
  spaeter_bis timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_startnachricht_antworten_geaendert on bk_startnachricht_antworten (geaendert_am);
alter table bk_startnachricht_antworten enable row level security;
revoke all on bk_startnachricht_antworten from public, anon, authenticated;
grant select, insert, update, delete on bk_startnachricht_antworten to service_role;
drop trigger if exists bk_startnachricht_antworten_stempel on bk_startnachricht_antworten;
create trigger bk_startnachricht_antworten_stempel before update on bk_startnachricht_antworten for each row execute function bk_abgleich_stempel();

alter table bk_startnachricht_antworten add column if not exists nachricht_id text;
alter table bk_startnachricht_antworten add column if not exists person_id text;
alter table bk_startnachricht_antworten add column if not exists antwort text;
alter table bk_startnachricht_antworten drop constraint if exists bk_startnachricht_antworten_antwort_check;
alter table bk_startnachricht_antworten add constraint bk_startnachricht_antworten_antwort_check check (antwort is null or antwort in ('gelesen', 'ja', 'spaeter', 'nein'));
alter table bk_startnachricht_antworten add column if not exists rueckfrage text;
alter table bk_startnachricht_antworten add column if not exists am timestamptz;
alter table bk_startnachricht_antworten add column if not exists spaeter_bis timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_startnachricht_antworten_nachricht_id_fk') then alter table bk_startnachricht_antworten add constraint bk_startnachricht_antworten_nachricht_id_fk foreign key (nachricht_id) references bk_startnachrichten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_startnachricht_antworten_person_id_fk') then alter table bk_startnachricht_antworten add constraint bk_startnachricht_antworten_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Sicherheitsnetz: alle Bachkreis-Tabellen ausdrücklich für den Server freigeben, für die App-Schlüssel nichts
do $$ declare t text; begin for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'bk\_%' loop execute format('revoke all on %I from public, anon, authenticated', t); execute format('grant select, insert, update, delete on %I to service_role', t); end loop; end $$;

