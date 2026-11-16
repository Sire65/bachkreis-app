-- Bachkreis-App – Nachtrag: 📰 Bachkreis-Echo: Hefte und Beiträge (0.70.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Bachkreis-Echo: Hefte
create table if not exists bk_echo_hefte (
  id text primary key default gen_random_uuid()::text,
  nr integer not null,
  titel text,
  ausgabe text check (ausgabe is null or ausgabe in ('fruehling', 'sommer', 'herbst', 'winter', 'sonder')),
  jahr integer,
  status text check (status is null or status in ('entwurf', 'freigabe', 'erschienen')),
  vorwort text,
  vorwort_von text,
  titelbild text,
  instrument text,
  komponist text,
  termine_von date,
  termine_bis date,
  erscheint_am date,
  freigabe_von text,
  freigabe_am timestamptz,
  freigegeben_von text,
  erschienen_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_echo_hefte_geaendert on bk_echo_hefte (geaendert_am);
alter table bk_echo_hefte enable row level security;
revoke all on bk_echo_hefte from public, anon, authenticated;
grant select, insert, update, delete on bk_echo_hefte to service_role;
drop trigger if exists bk_echo_hefte_stempel on bk_echo_hefte;
create trigger bk_echo_hefte_stempel before update on bk_echo_hefte for each row execute function bk_abgleich_stempel();

alter table bk_echo_hefte add column if not exists nr integer;
alter table bk_echo_hefte add column if not exists titel text;
alter table bk_echo_hefte add column if not exists ausgabe text;
alter table bk_echo_hefte drop constraint if exists bk_echo_hefte_ausgabe_check;
alter table bk_echo_hefte add constraint bk_echo_hefte_ausgabe_check check (ausgabe is null or ausgabe in ('fruehling', 'sommer', 'herbst', 'winter', 'sonder'));
alter table bk_echo_hefte add column if not exists jahr integer;
alter table bk_echo_hefte add column if not exists status text;
alter table bk_echo_hefte drop constraint if exists bk_echo_hefte_status_check;
alter table bk_echo_hefte add constraint bk_echo_hefte_status_check check (status is null or status in ('entwurf', 'freigabe', 'erschienen'));
alter table bk_echo_hefte add column if not exists vorwort text;
alter table bk_echo_hefte add column if not exists vorwort_von text;
alter table bk_echo_hefte add column if not exists titelbild text;
alter table bk_echo_hefte add column if not exists instrument text;
alter table bk_echo_hefte add column if not exists komponist text;
alter table bk_echo_hefte add column if not exists termine_von date;
alter table bk_echo_hefte add column if not exists termine_bis date;
alter table bk_echo_hefte add column if not exists erscheint_am date;
alter table bk_echo_hefte add column if not exists freigabe_von text;
alter table bk_echo_hefte add column if not exists freigabe_am timestamptz;
alter table bk_echo_hefte add column if not exists freigegeben_von text;
alter table bk_echo_hefte add column if not exists erschienen_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_echo_hefte_vorwort_von_fk') then alter table bk_echo_hefte add constraint bk_echo_hefte_vorwort_von_fk foreign key (vorwort_von) references bk_personen(id) on delete restrict; end if; end $$;

-- Bachkreis-Echo: Beiträge
create table if not exists bk_echo_beitraege (
  id text primary key default gen_random_uuid()::text,
  heft_id text,
  rubrik text not null check (rubrik is null or rubrik in ('orchesterleben', 'vorstellen', 'schueler', 'raetsel', 'spiel', 'witz', 'wissen', 'foerderverein', 'sonstiges')),
  titel text not null,
  text text not null,
  bild text,
  bild_text text,
  personen text[],
  autor_zeile text,
  von text,
  status text check (status is null or status in ('eingereicht', 'angenommen', 'zurueck', 'abgelehnt')),
  reihenfolge integer,
  redaktion_notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_echo_beitraege_geaendert on bk_echo_beitraege (geaendert_am);
alter table bk_echo_beitraege enable row level security;
revoke all on bk_echo_beitraege from public, anon, authenticated;
grant select, insert, update, delete on bk_echo_beitraege to service_role;
drop trigger if exists bk_echo_beitraege_stempel on bk_echo_beitraege;
create trigger bk_echo_beitraege_stempel before update on bk_echo_beitraege for each row execute function bk_abgleich_stempel();

alter table bk_echo_beitraege add column if not exists heft_id text;
alter table bk_echo_beitraege add column if not exists rubrik text;
alter table bk_echo_beitraege drop constraint if exists bk_echo_beitraege_rubrik_check;
alter table bk_echo_beitraege add constraint bk_echo_beitraege_rubrik_check check (rubrik is null or rubrik in ('orchesterleben', 'vorstellen', 'schueler', 'raetsel', 'spiel', 'witz', 'wissen', 'foerderverein', 'sonstiges'));
alter table bk_echo_beitraege add column if not exists titel text;
alter table bk_echo_beitraege add column if not exists text text;
alter table bk_echo_beitraege add column if not exists bild text;
alter table bk_echo_beitraege add column if not exists bild_text text;
alter table bk_echo_beitraege add column if not exists personen text[];
alter table bk_echo_beitraege add column if not exists autor_zeile text;
alter table bk_echo_beitraege add column if not exists von text;
alter table bk_echo_beitraege add column if not exists status text;
alter table bk_echo_beitraege drop constraint if exists bk_echo_beitraege_status_check;
alter table bk_echo_beitraege add constraint bk_echo_beitraege_status_check check (status is null or status in ('eingereicht', 'angenommen', 'zurueck', 'abgelehnt'));
alter table bk_echo_beitraege add column if not exists reihenfolge integer;
alter table bk_echo_beitraege add column if not exists redaktion_notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_echo_beitraege_heft_id_fk') then alter table bk_echo_beitraege add constraint bk_echo_beitraege_heft_id_fk foreign key (heft_id) references bk_echo_hefte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_echo_beitraege_von_fk') then alter table bk_echo_beitraege add constraint bk_echo_beitraege_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_echo_beitraege_heft on bk_echo_beitraege (heft_id);

