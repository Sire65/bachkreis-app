-- Bachkreis-App – Nachtrag: 🗺️ Chronik mit Auftrittsorten (Stadt, Land, Koordinaten), Jahr nicht mehr Pflicht (0.36.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Chronik
create table if not exists bk_chronik (
  id text primary key default gen_random_uuid()::text,
  jahr integer,
  datum date,
  titel text not null,
  art text check (art is null or art in ('gruendung', 'konzert', 'reise', 'austausch', 'cd', 'urauffuehrung', 'partner', 'auszeichnung', 'sonstiges')),
  ort text,
  stadt text,
  land text,
  koordinaten text,
  beschreibung text,
  programm text,
  projekt_id text,
  aufnahme_id text,
  partner_id text,
  quelle text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_chronik_geaendert on bk_chronik (geaendert_am);
alter table bk_chronik enable row level security;
revoke all on bk_chronik from public, anon, authenticated;
grant select, insert, update, delete on bk_chronik to service_role;
drop trigger if exists bk_chronik_stempel on bk_chronik;
create trigger bk_chronik_stempel before update on bk_chronik for each row execute function bk_abgleich_stempel();

alter table bk_chronik add column if not exists jahr integer;
alter table bk_chronik add column if not exists datum date;
alter table bk_chronik add column if not exists titel text;
alter table bk_chronik add column if not exists art text;
alter table bk_chronik drop constraint if exists bk_chronik_art_check;
alter table bk_chronik add constraint bk_chronik_art_check check (art is null or art in ('gruendung', 'konzert', 'reise', 'austausch', 'cd', 'urauffuehrung', 'partner', 'auszeichnung', 'sonstiges'));
alter table bk_chronik add column if not exists ort text;
alter table bk_chronik add column if not exists stadt text;
alter table bk_chronik add column if not exists land text;
alter table bk_chronik add column if not exists koordinaten text;
alter table bk_chronik add column if not exists beschreibung text;
alter table bk_chronik add column if not exists programm text;
alter table bk_chronik add column if not exists projekt_id text;
alter table bk_chronik add column if not exists aufnahme_id text;
alter table bk_chronik add column if not exists partner_id text;
alter table bk_chronik add column if not exists quelle text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_projekt_id_fk') then alter table bk_chronik add constraint bk_chronik_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_aufnahme_id_fk') then alter table bk_chronik add constraint bk_chronik_aufnahme_id_fk foreign key (aufnahme_id) references bk_aufnahmen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chronik_partner_id_fk') then alter table bk_chronik add constraint bk_chronik_partner_id_fk foreign key (partner_id) references bk_partner(id) on delete restrict; end if; end $$;

alter table bk_chronik alter column jahr drop not null;

