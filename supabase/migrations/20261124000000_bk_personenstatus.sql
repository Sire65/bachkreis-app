-- Bachkreis-App – Nachtrag: 🟢 Mein Status (0.58.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Mein Status
create table if not exists bk_personenstatus (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  status text not null check (status is null or status in ('verfuegbar', 'beschaeftigt', 'urlaub', 'krank', 'abwesend')),
  bis date,
  hinweis text,
  gesetzt_von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_personenstatus_geaendert on bk_personenstatus (geaendert_am);
alter table bk_personenstatus enable row level security;
revoke all on bk_personenstatus from public, anon, authenticated;
grant select, insert, update, delete on bk_personenstatus to service_role;
drop trigger if exists bk_personenstatus_stempel on bk_personenstatus;
create trigger bk_personenstatus_stempel before update on bk_personenstatus for each row execute function bk_abgleich_stempel();

alter table bk_personenstatus add column if not exists person_id text;
alter table bk_personenstatus add column if not exists status text;
alter table bk_personenstatus drop constraint if exists bk_personenstatus_status_check;
alter table bk_personenstatus add constraint bk_personenstatus_status_check check (status is null or status in ('verfuegbar', 'beschaeftigt', 'urlaub', 'krank', 'abwesend'));
alter table bk_personenstatus add column if not exists bis date;
alter table bk_personenstatus add column if not exists hinweis text;
alter table bk_personenstatus add column if not exists gesetzt_von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_personenstatus_person_id_fk') then alter table bk_personenstatus add constraint bk_personenstatus_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_personenstatus_gesetzt_von_fk') then alter table bk_personenstatus add constraint bk_personenstatus_gesetzt_von_fk foreign key (gesetzt_von) references bk_personen(id) on delete restrict; end if; end $$;

create unique index if not exists bk_personenstatus_person on bk_personenstatus (person_id) where geloescht_am is null;

