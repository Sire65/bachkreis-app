-- Bachkreis-App – Nachtrag: 📷 Fotoalbum: Alben (alle / nur Team), Fotos mit markierten Personen (Foto-Einwilligung), Papierkorb (0.40.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Fotoalben
create table if not exists bk_fotoalben (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  datum date,
  beschreibung text,
  projekt_id text,
  sichtbar text check (sichtbar is null or sichtbar in ('alle', 'verwaltung')),
  von text,
  titelbild text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_fotoalben_geaendert on bk_fotoalben (geaendert_am);
alter table bk_fotoalben enable row level security;
revoke all on bk_fotoalben from public, anon, authenticated;
grant select, insert, update, delete on bk_fotoalben to service_role;
drop trigger if exists bk_fotoalben_stempel on bk_fotoalben;
create trigger bk_fotoalben_stempel before update on bk_fotoalben for each row execute function bk_abgleich_stempel();

alter table bk_fotoalben add column if not exists titel text;
alter table bk_fotoalben add column if not exists datum date;
alter table bk_fotoalben add column if not exists beschreibung text;
alter table bk_fotoalben add column if not exists projekt_id text;
alter table bk_fotoalben add column if not exists sichtbar text;
alter table bk_fotoalben drop constraint if exists bk_fotoalben_sichtbar_check;
alter table bk_fotoalben add constraint bk_fotoalben_sichtbar_check check (sichtbar is null or sichtbar in ('alle', 'verwaltung'));
alter table bk_fotoalben add column if not exists von text;
alter table bk_fotoalben add column if not exists titelbild text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fotoalben_projekt_id_fk') then alter table bk_fotoalben add constraint bk_fotoalben_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fotoalben_von_fk') then alter table bk_fotoalben add constraint bk_fotoalben_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Fotos
create table if not exists bk_fotos (
  id text primary key default gen_random_uuid()::text,
  album_id text not null,
  datei text not null,
  titel text,
  von text,
  personen text[],
  aufgenommen_am timestamptz,
  papierkorb_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_fotos_geaendert on bk_fotos (geaendert_am);
alter table bk_fotos enable row level security;
revoke all on bk_fotos from public, anon, authenticated;
grant select, insert, update, delete on bk_fotos to service_role;
drop trigger if exists bk_fotos_stempel on bk_fotos;
create trigger bk_fotos_stempel before update on bk_fotos for each row execute function bk_abgleich_stempel();

alter table bk_fotos add column if not exists album_id text;
alter table bk_fotos add column if not exists datei text;
alter table bk_fotos add column if not exists titel text;
alter table bk_fotos add column if not exists von text;
alter table bk_fotos add column if not exists personen text[];
alter table bk_fotos add column if not exists aufgenommen_am timestamptz;
alter table bk_fotos add column if not exists papierkorb_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fotos_album_id_fk') then alter table bk_fotos add constraint bk_fotos_album_id_fk foreign key (album_id) references bk_fotoalben(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_fotos_von_fk') then alter table bk_fotos add constraint bk_fotos_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

