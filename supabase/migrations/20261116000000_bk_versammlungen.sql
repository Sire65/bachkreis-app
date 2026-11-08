-- Bachkreis-App – Nachtrag: 🎬 Sitzungen & Versammlungen vorbereiten und leiten, 📁 Unterlagen je Familie (0.48.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Sitzungen & Versammlungen
create table if not exists bk_versammlungen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('vorstand', 'elternabend', 'leitung', 'mitglieder')),
  zielgruppe text check (zielgruppe is null or zielgruppe in ('vorstand', 'eltern', 'team', 'alle')),
  beginn timestamptz not null,
  ort text,
  tagesordnung jsonb,
  status text check (status is null or status in ('planung', 'eingeladen', 'laeuft', 'beendet')),
  frist_tage integer,
  eingeladen_am timestamptz,
  erinnert_am timestamptz,
  gestartet_am timestamptz,
  beendet_am timestamptz,
  leiter text,
  protokoll_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_versammlungen_geaendert on bk_versammlungen (geaendert_am);
alter table bk_versammlungen enable row level security;
revoke all on bk_versammlungen from public, anon, authenticated;
grant select, insert, update, delete on bk_versammlungen to service_role;
drop trigger if exists bk_versammlungen_stempel on bk_versammlungen;
create trigger bk_versammlungen_stempel before update on bk_versammlungen for each row execute function bk_abgleich_stempel();

alter table bk_versammlungen add column if not exists titel text;
alter table bk_versammlungen add column if not exists art text;
alter table bk_versammlungen drop constraint if exists bk_versammlungen_art_check;
alter table bk_versammlungen add constraint bk_versammlungen_art_check check (art is null or art in ('vorstand', 'elternabend', 'leitung', 'mitglieder'));
alter table bk_versammlungen add column if not exists zielgruppe text;
alter table bk_versammlungen drop constraint if exists bk_versammlungen_zielgruppe_check;
alter table bk_versammlungen add constraint bk_versammlungen_zielgruppe_check check (zielgruppe is null or zielgruppe in ('vorstand', 'eltern', 'team', 'alle'));
alter table bk_versammlungen add column if not exists beginn timestamptz;
alter table bk_versammlungen add column if not exists ort text;
alter table bk_versammlungen add column if not exists tagesordnung jsonb;
alter table bk_versammlungen add column if not exists status text;
alter table bk_versammlungen drop constraint if exists bk_versammlungen_status_check;
alter table bk_versammlungen add constraint bk_versammlungen_status_check check (status is null or status in ('planung', 'eingeladen', 'laeuft', 'beendet'));
alter table bk_versammlungen add column if not exists frist_tage integer;
alter table bk_versammlungen add column if not exists eingeladen_am timestamptz;
alter table bk_versammlungen add column if not exists erinnert_am timestamptz;
alter table bk_versammlungen add column if not exists gestartet_am timestamptz;
alter table bk_versammlungen add column if not exists beendet_am timestamptz;
alter table bk_versammlungen add column if not exists leiter text;
alter table bk_versammlungen add column if not exists protokoll_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_versammlungen_leiter_fk') then alter table bk_versammlungen add constraint bk_versammlungen_leiter_fk foreign key (leiter) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_versammlungen_protokoll_id_fk') then alter table bk_versammlungen add constraint bk_versammlungen_protokoll_id_fk foreign key (protokoll_id) references bk_dokumente(id) on delete restrict; end if; end $$;

-- Unterlagen (Familien-Ordner)
create table if not exists bk_unterlagen (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  titel text not null,
  art text check (art is null or art in ('bescheinigung', 'vertrag', 'attest', 'rechnung', 'einwilligung', 'sonst')),
  datei text not null,
  von text,
  jahr integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_unterlagen_geaendert on bk_unterlagen (geaendert_am);
alter table bk_unterlagen enable row level security;
revoke all on bk_unterlagen from public, anon, authenticated;
grant select, insert, update, delete on bk_unterlagen to service_role;
drop trigger if exists bk_unterlagen_stempel on bk_unterlagen;
create trigger bk_unterlagen_stempel before update on bk_unterlagen for each row execute function bk_abgleich_stempel();

alter table bk_unterlagen add column if not exists person_id text;
alter table bk_unterlagen add column if not exists titel text;
alter table bk_unterlagen add column if not exists art text;
alter table bk_unterlagen drop constraint if exists bk_unterlagen_art_check;
alter table bk_unterlagen add constraint bk_unterlagen_art_check check (art is null or art in ('bescheinigung', 'vertrag', 'attest', 'rechnung', 'einwilligung', 'sonst'));
alter table bk_unterlagen add column if not exists datei text;
alter table bk_unterlagen add column if not exists von text;
alter table bk_unterlagen add column if not exists jahr integer;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_unterlagen_person_id_fk') then alter table bk_unterlagen add constraint bk_unterlagen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_unterlagen_von_fk') then alter table bk_unterlagen add constraint bk_unterlagen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

