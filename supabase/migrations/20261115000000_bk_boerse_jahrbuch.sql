-- Bachkreis-App – Nachtrag: 🛍️ Bachkreis-Börse (Biete/Suche/Helfer), 📖 Jahrbuch-Momente (0.47.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Bachkreis-Börse
create table if not exists bk_boerse (
  id text primary key default gen_random_uuid()::text,
  art text not null check (art is null or art in ('biete', 'suche', 'helfer')),
  kategorie text check (kategorie is null or kategorie in ('instrument', 'noten', 'kleidung', 'zubehoer', 'kuchen', 'aufbau', 'fahrdienst', 'sonst')),
  titel text not null,
  text text,
  preis numeric(10,2),
  verschenken boolean,
  foto text,
  von text,
  status text check (status is null or status in ('offen', 'reserviert', 'erledigt')),
  termin_id text,
  helfer_anzahl integer,
  helfer text[],
  frist date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_boerse_geaendert on bk_boerse (geaendert_am);
alter table bk_boerse enable row level security;
revoke all on bk_boerse from public, anon, authenticated;
grant select, insert, update, delete on bk_boerse to service_role;
drop trigger if exists bk_boerse_stempel on bk_boerse;
create trigger bk_boerse_stempel before update on bk_boerse for each row execute function bk_abgleich_stempel();

alter table bk_boerse add column if not exists art text;
alter table bk_boerse drop constraint if exists bk_boerse_art_check;
alter table bk_boerse add constraint bk_boerse_art_check check (art is null or art in ('biete', 'suche', 'helfer'));
alter table bk_boerse add column if not exists kategorie text;
alter table bk_boerse drop constraint if exists bk_boerse_kategorie_check;
alter table bk_boerse add constraint bk_boerse_kategorie_check check (kategorie is null or kategorie in ('instrument', 'noten', 'kleidung', 'zubehoer', 'kuchen', 'aufbau', 'fahrdienst', 'sonst'));
alter table bk_boerse add column if not exists titel text;
alter table bk_boerse add column if not exists text text;
alter table bk_boerse add column if not exists preis numeric(10,2);
alter table bk_boerse add column if not exists verschenken boolean;
alter table bk_boerse add column if not exists foto text;
alter table bk_boerse add column if not exists von text;
alter table bk_boerse add column if not exists status text;
alter table bk_boerse drop constraint if exists bk_boerse_status_check;
alter table bk_boerse add constraint bk_boerse_status_check check (status is null or status in ('offen', 'reserviert', 'erledigt'));
alter table bk_boerse add column if not exists termin_id text;
alter table bk_boerse add column if not exists helfer_anzahl integer;
alter table bk_boerse add column if not exists helfer text[];
alter table bk_boerse add column if not exists frist date;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_boerse_von_fk') then alter table bk_boerse add constraint bk_boerse_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_boerse_termin_id_fk') then alter table bk_boerse add constraint bk_boerse_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;

-- Jahrbuch: schönste Momente
create table if not exists bk_jahrbuch_momente (
  id text primary key default gen_random_uuid()::text,
  schuljahr text not null,
  text text not null,
  foto_id text,
  von text,
  freigegeben boolean,
  freigegeben_von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_jahrbuch_momente_geaendert on bk_jahrbuch_momente (geaendert_am);
alter table bk_jahrbuch_momente enable row level security;
revoke all on bk_jahrbuch_momente from public, anon, authenticated;
grant select, insert, update, delete on bk_jahrbuch_momente to service_role;
drop trigger if exists bk_jahrbuch_momente_stempel on bk_jahrbuch_momente;
create trigger bk_jahrbuch_momente_stempel before update on bk_jahrbuch_momente for each row execute function bk_abgleich_stempel();

alter table bk_jahrbuch_momente add column if not exists schuljahr text;
alter table bk_jahrbuch_momente add column if not exists text text;
alter table bk_jahrbuch_momente add column if not exists foto_id text;
alter table bk_jahrbuch_momente add column if not exists von text;
alter table bk_jahrbuch_momente add column if not exists freigegeben boolean;
alter table bk_jahrbuch_momente add column if not exists freigegeben_von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_jahrbuch_momente_foto_id_fk') then alter table bk_jahrbuch_momente add constraint bk_jahrbuch_momente_foto_id_fk foreign key (foto_id) references bk_fotos(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_jahrbuch_momente_von_fk') then alter table bk_jahrbuch_momente add constraint bk_jahrbuch_momente_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_jahrbuch_momente_freigegeben_von_fk') then alter table bk_jahrbuch_momente add constraint bk_jahrbuch_momente_freigegeben_von_fk foreign key (freigegeben_von) references bk_personen(id) on delete restrict; end if; end $$;

