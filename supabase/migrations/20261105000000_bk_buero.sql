-- Bachkreis-App – Nachtrag: 🏢 Büro: Dokumente mit Ordner, Jahr, Text und den Sichtbarkeiten Leitung/Vorstand (0.33.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Dokumente
create table if not exists bk_dokumente (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('satzung', 'flyer', 'formular', 'vorlage', 'info', 'protokoll')),
  beschreibung text,
  datei text,
  url text,
  fassung text,
  sichtbar text check (sichtbar is null or sichtbar in ('alle', 'eltern', 'schueler', 'verwaltung', 'leitung', 'vorstand')),
  sort integer,
  ordner text check (ordner is null or ordner in ('protokolle', 'noten', 'grafik', 'vorlagen', 'elternbriefe', 'konzerte', 'vertraege', 'presse', 'finanzen', 'schule', 'archiv')),
  jahr integer,
  inhalt text,
  pruefer text,
  pruef_status text check (pruef_status is null or pruef_status in ('offen', 'wuensche', 'frei', 'ohne')),
  pruef_wuensche jsonb,
  pruef_von text,
  pruef_am timestamptz,
  geprueft_am timestamptz,
  pruef_erinnert timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_dokumente_geaendert on bk_dokumente (geaendert_am);
alter table bk_dokumente enable row level security;
revoke all on bk_dokumente from public, anon, authenticated;
grant select, insert, update, delete on bk_dokumente to service_role;
drop trigger if exists bk_dokumente_stempel on bk_dokumente;
create trigger bk_dokumente_stempel before update on bk_dokumente for each row execute function bk_abgleich_stempel();

alter table bk_dokumente add column if not exists titel text;
alter table bk_dokumente add column if not exists art text;
alter table bk_dokumente drop constraint if exists bk_dokumente_art_check;
alter table bk_dokumente add constraint bk_dokumente_art_check check (art is null or art in ('satzung', 'flyer', 'formular', 'vorlage', 'info', 'protokoll'));
alter table bk_dokumente add column if not exists beschreibung text;
alter table bk_dokumente add column if not exists datei text;
alter table bk_dokumente add column if not exists url text;
alter table bk_dokumente add column if not exists fassung text;
alter table bk_dokumente add column if not exists sichtbar text;
alter table bk_dokumente drop constraint if exists bk_dokumente_sichtbar_check;
alter table bk_dokumente add constraint bk_dokumente_sichtbar_check check (sichtbar is null or sichtbar in ('alle', 'eltern', 'schueler', 'verwaltung', 'leitung', 'vorstand'));
alter table bk_dokumente add column if not exists sort integer;
alter table bk_dokumente add column if not exists ordner text;
alter table bk_dokumente drop constraint if exists bk_dokumente_ordner_check;
alter table bk_dokumente add constraint bk_dokumente_ordner_check check (ordner is null or ordner in ('protokolle', 'noten', 'grafik', 'vorlagen', 'elternbriefe', 'konzerte', 'vertraege', 'presse', 'finanzen', 'schule', 'archiv'));
alter table bk_dokumente add column if not exists jahr integer;
alter table bk_dokumente add column if not exists inhalt text;
alter table bk_dokumente add column if not exists pruefer text;
alter table bk_dokumente add column if not exists pruef_status text;
alter table bk_dokumente drop constraint if exists bk_dokumente_pruef_status_check;
alter table bk_dokumente add constraint bk_dokumente_pruef_status_check check (pruef_status is null or pruef_status in ('offen', 'wuensche', 'frei', 'ohne'));
alter table bk_dokumente add column if not exists pruef_wuensche jsonb;
alter table bk_dokumente add column if not exists pruef_von text;
alter table bk_dokumente add column if not exists pruef_am timestamptz;
alter table bk_dokumente add column if not exists geprueft_am timestamptz;
alter table bk_dokumente add column if not exists pruef_erinnert timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_dokumente_pruefer_fk') then alter table bk_dokumente add constraint bk_dokumente_pruefer_fk foreign key (pruefer) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_dokumente_pruef_von_fk') then alter table bk_dokumente add constraint bk_dokumente_pruef_von_fk foreign key (pruef_von) references bk_personen(id) on delete restrict; end if; end $$;

