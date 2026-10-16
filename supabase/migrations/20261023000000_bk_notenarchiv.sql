-- Bachkreis-App – Nachtrag: Notenarchiv: Orchester/Klasse, Schwierigkeit, Dauer je Werk (0.13.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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

