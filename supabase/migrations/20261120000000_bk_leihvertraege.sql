-- Bachkreis-App – Nachtrag: 📝 Leihvertrag als Formular mit Unterschriften (0.52.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Leihverträge
create table if not exists bk_leihvertraege (
  id text primary key default gen_random_uuid()::text,
  nr text,
  person_id text not null,
  eltern_id text,
  anschrift text,
  geburtsdatum date,
  eltern_name text,
  eltern_anschrift text,
  telefon text,
  inventar_ids text[],
  ausstattung_ids text[],
  zubehoer text[],
  zubehoer_frei text,
  von date not null,
  bis date,
  kaution numeric(10,2),
  gebuehr numeric(10,2),
  versicherung text check (versicherung is null or versicherung in ('verein', 'privat', 'keine')),
  klausel text,
  hinweis text,
  unterschriften jsonb,
  status text check (status is null or status in ('entwurf', 'wartet', 'unterschrieben', 'beendet')),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_leihvertraege_geaendert on bk_leihvertraege (geaendert_am);
alter table bk_leihvertraege enable row level security;
revoke all on bk_leihvertraege from public, anon, authenticated;
grant select, insert, update, delete on bk_leihvertraege to service_role;
drop trigger if exists bk_leihvertraege_stempel on bk_leihvertraege;
create trigger bk_leihvertraege_stempel before update on bk_leihvertraege for each row execute function bk_abgleich_stempel();

alter table bk_leihvertraege add column if not exists nr text;
alter table bk_leihvertraege add column if not exists person_id text;
alter table bk_leihvertraege add column if not exists eltern_id text;
alter table bk_leihvertraege add column if not exists anschrift text;
alter table bk_leihvertraege add column if not exists geburtsdatum date;
alter table bk_leihvertraege add column if not exists eltern_name text;
alter table bk_leihvertraege add column if not exists eltern_anschrift text;
alter table bk_leihvertraege add column if not exists telefon text;
alter table bk_leihvertraege add column if not exists inventar_ids text[];
alter table bk_leihvertraege add column if not exists ausstattung_ids text[];
alter table bk_leihvertraege add column if not exists zubehoer text[];
alter table bk_leihvertraege add column if not exists zubehoer_frei text;
alter table bk_leihvertraege add column if not exists von date;
alter table bk_leihvertraege add column if not exists bis date;
alter table bk_leihvertraege add column if not exists kaution numeric(10,2);
alter table bk_leihvertraege add column if not exists gebuehr numeric(10,2);
alter table bk_leihvertraege add column if not exists versicherung text;
alter table bk_leihvertraege drop constraint if exists bk_leihvertraege_versicherung_check;
alter table bk_leihvertraege add constraint bk_leihvertraege_versicherung_check check (versicherung is null or versicherung in ('verein', 'privat', 'keine'));
alter table bk_leihvertraege add column if not exists klausel text;
alter table bk_leihvertraege add column if not exists hinweis text;
alter table bk_leihvertraege add column if not exists unterschriften jsonb;
alter table bk_leihvertraege add column if not exists status text;
alter table bk_leihvertraege drop constraint if exists bk_leihvertraege_status_check;
alter table bk_leihvertraege add constraint bk_leihvertraege_status_check check (status is null or status in ('entwurf', 'wartet', 'unterschrieben', 'beendet'));
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_leihvertraege_person_id_fk') then alter table bk_leihvertraege add constraint bk_leihvertraege_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_leihvertraege_eltern_id_fk') then alter table bk_leihvertraege add constraint bk_leihvertraege_eltern_id_fk foreign key (eltern_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Ausleihen
create table if not exists bk_ausleihen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text,
  ausstattung_id text,
  person_id text not null,
  von date not null,
  bis date,
  status text check (status is null or status in ('angefragt', 'aktiv', 'zurueck')),
  zustand_ausgabe text,
  zustand_rueckgabe text,
  zubehoer text[],
  kaution numeric(10,2),
  kaution_status text check (kaution_status is null or kaution_status in ('offen', 'bezahlt', 'zurueck', 'einbehalten')),
  gebuehr numeric(10,2),
  gebuehr_bezahlt_bis date,
  versicherung text check (versicherung is null or versicherung in ('verein', 'privat', 'keine')),
  vertrag_id text,
  leihvertrag_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_ausleihen_geaendert on bk_ausleihen (geaendert_am);
alter table bk_ausleihen enable row level security;
revoke all on bk_ausleihen from public, anon, authenticated;
grant select, insert, update, delete on bk_ausleihen to service_role;
drop trigger if exists bk_ausleihen_stempel on bk_ausleihen;
create trigger bk_ausleihen_stempel before update on bk_ausleihen for each row execute function bk_abgleich_stempel();

alter table bk_ausleihen add column if not exists inventar_id text;
alter table bk_ausleihen add column if not exists ausstattung_id text;
alter table bk_ausleihen add column if not exists person_id text;
alter table bk_ausleihen add column if not exists von date;
alter table bk_ausleihen add column if not exists bis date;
alter table bk_ausleihen add column if not exists status text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_status_check;
alter table bk_ausleihen add constraint bk_ausleihen_status_check check (status is null or status in ('angefragt', 'aktiv', 'zurueck'));
alter table bk_ausleihen add column if not exists zustand_ausgabe text;
alter table bk_ausleihen add column if not exists zustand_rueckgabe text;
alter table bk_ausleihen add column if not exists zubehoer text[];
alter table bk_ausleihen add column if not exists kaution numeric(10,2);
alter table bk_ausleihen add column if not exists kaution_status text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_kaution_status_check;
alter table bk_ausleihen add constraint bk_ausleihen_kaution_status_check check (kaution_status is null or kaution_status in ('offen', 'bezahlt', 'zurueck', 'einbehalten'));
alter table bk_ausleihen add column if not exists gebuehr numeric(10,2);
alter table bk_ausleihen add column if not exists gebuehr_bezahlt_bis date;
alter table bk_ausleihen add column if not exists versicherung text;
alter table bk_ausleihen drop constraint if exists bk_ausleihen_versicherung_check;
alter table bk_ausleihen add constraint bk_ausleihen_versicherung_check check (versicherung is null or versicherung in ('verein', 'privat', 'keine'));
alter table bk_ausleihen add column if not exists vertrag_id text;
alter table bk_ausleihen add column if not exists leihvertrag_id text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_inventar_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_ausstattung_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_ausstattung_id_fk foreign key (ausstattung_id) references bk_ausstattung(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_person_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_vertrag_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_vertrag_id_fk foreign key (vertrag_id) references bk_genehmigungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_leihvertrag_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_leihvertrag_id_fk foreign key (leihvertrag_id) references bk_leihvertraege(id) on delete restrict; end if; end $$;

