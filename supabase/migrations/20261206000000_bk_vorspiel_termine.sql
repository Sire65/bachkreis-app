-- Bachkreis-App – Nachtrag: 📅 Live-Vorspiel verabreden: Terminanfrage mit annehmen, ablehnen, Gegenvorschlag (0.79.7) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Vorspiel-Verabredungen
create table if not exists bk_vorspiel_termine (
  id text primary key default gen_random_uuid()::text,
  kind text not null,
  lehrkraft text not null,
  angefragt_von text,
  zeiten jsonb,
  dauer_min integer,
  status text check (status is null or status in ('offen', 'angenommen', 'abgelehnt', 'abgesagt', 'zurueckgezogen')),
  am_zug text check (am_zug is null or am_zug in ('kind', 'lehrkraft')),
  termin timestamptz,
  notiz text,
  verlauf jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_vorspiel_termine_geaendert on bk_vorspiel_termine (geaendert_am);
alter table bk_vorspiel_termine enable row level security;
revoke all on bk_vorspiel_termine from public, anon, authenticated;
grant select, insert, update, delete on bk_vorspiel_termine to service_role;
drop trigger if exists bk_vorspiel_termine_stempel on bk_vorspiel_termine;
create trigger bk_vorspiel_termine_stempel before update on bk_vorspiel_termine for each row execute function bk_abgleich_stempel();

alter table bk_vorspiel_termine add column if not exists kind text;
alter table bk_vorspiel_termine add column if not exists lehrkraft text;
alter table bk_vorspiel_termine add column if not exists angefragt_von text;
alter table bk_vorspiel_termine add column if not exists zeiten jsonb;
alter table bk_vorspiel_termine add column if not exists dauer_min integer;
alter table bk_vorspiel_termine add column if not exists status text;
alter table bk_vorspiel_termine drop constraint if exists bk_vorspiel_termine_status_check;
alter table bk_vorspiel_termine add constraint bk_vorspiel_termine_status_check check (status is null or status in ('offen', 'angenommen', 'abgelehnt', 'abgesagt', 'zurueckgezogen'));
alter table bk_vorspiel_termine add column if not exists am_zug text;
alter table bk_vorspiel_termine drop constraint if exists bk_vorspiel_termine_am_zug_check;
alter table bk_vorspiel_termine add constraint bk_vorspiel_termine_am_zug_check check (am_zug is null or am_zug in ('kind', 'lehrkraft'));
alter table bk_vorspiel_termine add column if not exists termin timestamptz;
alter table bk_vorspiel_termine add column if not exists notiz text;
alter table bk_vorspiel_termine add column if not exists verlauf jsonb;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiel_termine_kind_fk') then alter table bk_vorspiel_termine add constraint bk_vorspiel_termine_kind_fk foreign key (kind) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiel_termine_lehrkraft_fk') then alter table bk_vorspiel_termine add constraint bk_vorspiel_termine_lehrkraft_fk foreign key (lehrkraft) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_vorspiel_termine_angefragt_von_fk') then alter table bk_vorspiel_termine add constraint bk_vorspiel_termine_angefragt_von_fk foreign key (angefragt_von) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_vorspiel_termine_kind on bk_vorspiel_termine (kind);
create index if not exists bk_vorspiel_termine_lehrkraft on bk_vorspiel_termine (lehrkraft);

