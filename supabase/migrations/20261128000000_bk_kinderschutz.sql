-- Bachkreis-App – Nachtrag: 🛡️ Schutz & Einwilligungen je Kind, Abholliste (0.69.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Schutz & Einwilligungen (Kinder)
create table if not exists bk_kinderschutz (
  id text primary key default gen_random_uuid()::text,
  kind_id text not null,
  kinder_chat text check (kinder_chat is null or kinder_chat in ('ja', 'nein')),
  sichtbar text check (sichtbar is null or sichtbar in ('voll', 'vorname', 'leitung')),
  online_sichtbar boolean,
  foto_name boolean,
  schutz_wunsch boolean,
  schutz_aktiv boolean,
  abholer jsonb,
  bestaetigt_am timestamptz,
  bestaetigt_von text,
  schutz_geprueft_am timestamptz,
  schutz_von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kinderschutz_geaendert on bk_kinderschutz (geaendert_am);
alter table bk_kinderschutz enable row level security;
revoke all on bk_kinderschutz from public, anon, authenticated;
grant select, insert, update, delete on bk_kinderschutz to service_role;
drop trigger if exists bk_kinderschutz_stempel on bk_kinderschutz;
create trigger bk_kinderschutz_stempel before update on bk_kinderschutz for each row execute function bk_abgleich_stempel();

alter table bk_kinderschutz add column if not exists kind_id text;
alter table bk_kinderschutz add column if not exists kinder_chat text;
alter table bk_kinderschutz drop constraint if exists bk_kinderschutz_kinder_chat_check;
alter table bk_kinderschutz add constraint bk_kinderschutz_kinder_chat_check check (kinder_chat is null or kinder_chat in ('ja', 'nein'));
alter table bk_kinderschutz add column if not exists sichtbar text;
alter table bk_kinderschutz drop constraint if exists bk_kinderschutz_sichtbar_check;
alter table bk_kinderschutz add constraint bk_kinderschutz_sichtbar_check check (sichtbar is null or sichtbar in ('voll', 'vorname', 'leitung'));
alter table bk_kinderschutz add column if not exists online_sichtbar boolean;
alter table bk_kinderschutz add column if not exists foto_name boolean;
alter table bk_kinderschutz add column if not exists schutz_wunsch boolean;
alter table bk_kinderschutz add column if not exists schutz_aktiv boolean;
alter table bk_kinderschutz add column if not exists abholer jsonb;
alter table bk_kinderschutz add column if not exists bestaetigt_am timestamptz;
alter table bk_kinderschutz add column if not exists bestaetigt_von text;
alter table bk_kinderschutz add column if not exists schutz_geprueft_am timestamptz;
alter table bk_kinderschutz add column if not exists schutz_von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kinderschutz_kind_id_fk') then alter table bk_kinderschutz add constraint bk_kinderschutz_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;

create unique index if not exists bk_kinderschutz_kind on bk_kinderschutz (kind_id) where geloescht_am is null;

