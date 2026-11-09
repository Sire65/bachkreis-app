-- Bachkreis-App – Nachtrag: 📞 Anrufe & Video, 🪑 Runder Tisch, 🛟 Fernhilfe – nur Vermittlung (0.50.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Anrufe & Runder Tisch (Vermittlung)
create table if not exists bk_anrufe (
  id text primary key default gen_random_uuid()::text,
  art text not null check (art is null or art in ('audio', 'video', 'fernhilfe', 'tisch', 'tisch_da')),
  von text,
  an text[],
  raum_id text,
  status text check (status is null or status in ('klingelt', 'angenommen', 'abgelehnt', 'beendet', 'verpasst')),
  angebot jsonb,
  antwort jsonb,
  beginn timestamptz,
  ende timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_anrufe_geaendert on bk_anrufe (geaendert_am);
alter table bk_anrufe enable row level security;
revoke all on bk_anrufe from public, anon, authenticated;
grant select, insert, update, delete on bk_anrufe to service_role;
drop trigger if exists bk_anrufe_stempel on bk_anrufe;
create trigger bk_anrufe_stempel before update on bk_anrufe for each row execute function bk_abgleich_stempel();

alter table bk_anrufe add column if not exists art text;
alter table bk_anrufe drop constraint if exists bk_anrufe_art_check;
alter table bk_anrufe add constraint bk_anrufe_art_check check (art is null or art in ('audio', 'video', 'fernhilfe', 'tisch', 'tisch_da'));
alter table bk_anrufe add column if not exists von text;
alter table bk_anrufe add column if not exists an text[];
alter table bk_anrufe add column if not exists raum_id text;
alter table bk_anrufe add column if not exists status text;
alter table bk_anrufe drop constraint if exists bk_anrufe_status_check;
alter table bk_anrufe add constraint bk_anrufe_status_check check (status is null or status in ('klingelt', 'angenommen', 'abgelehnt', 'beendet', 'verpasst'));
alter table bk_anrufe add column if not exists angebot jsonb;
alter table bk_anrufe add column if not exists antwort jsonb;
alter table bk_anrufe add column if not exists beginn timestamptz;
alter table bk_anrufe add column if not exists ende timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_anrufe_von_fk') then alter table bk_anrufe add constraint bk_anrufe_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_anrufe_raum on bk_anrufe (raum_id) where raum_id is not null;

