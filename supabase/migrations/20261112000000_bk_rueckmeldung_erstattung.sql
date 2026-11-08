-- Bachkreis-App – Nachtrag: 🆘 Rückmeldungen zur App, 💶 Erstattungen (Fahrtkosten, Auslagen mit Beleg) (0.42.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Rückmeldungen zur App
create table if not exists bk_rueckmeldungen (
  id text primary key default gen_random_uuid()::text,
  art text check (art is null or art in ('problem', 'hilfe', 'idee', 'lob')),
  text text not null,
  von text,
  sterne integer,
  geraet text,
  ansicht text,
  rueckruf boolean,
  bild text,
  status text check (status is null or status in ('neu', 'in_arbeit', 'erledigt')),
  antwort text,
  beantwortet_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_rueckmeldungen_geaendert on bk_rueckmeldungen (geaendert_am);
alter table bk_rueckmeldungen enable row level security;
revoke all on bk_rueckmeldungen from public, anon, authenticated;
grant select, insert, update, delete on bk_rueckmeldungen to service_role;
drop trigger if exists bk_rueckmeldungen_stempel on bk_rueckmeldungen;
create trigger bk_rueckmeldungen_stempel before update on bk_rueckmeldungen for each row execute function bk_abgleich_stempel();

alter table bk_rueckmeldungen add column if not exists art text;
alter table bk_rueckmeldungen drop constraint if exists bk_rueckmeldungen_art_check;
alter table bk_rueckmeldungen add constraint bk_rueckmeldungen_art_check check (art is null or art in ('problem', 'hilfe', 'idee', 'lob'));
alter table bk_rueckmeldungen add column if not exists text text;
alter table bk_rueckmeldungen add column if not exists von text;
alter table bk_rueckmeldungen add column if not exists sterne integer;
alter table bk_rueckmeldungen add column if not exists geraet text;
alter table bk_rueckmeldungen add column if not exists ansicht text;
alter table bk_rueckmeldungen add column if not exists rueckruf boolean;
alter table bk_rueckmeldungen add column if not exists bild text;
alter table bk_rueckmeldungen add column if not exists status text;
alter table bk_rueckmeldungen drop constraint if exists bk_rueckmeldungen_status_check;
alter table bk_rueckmeldungen add constraint bk_rueckmeldungen_status_check check (status is null or status in ('neu', 'in_arbeit', 'erledigt'));
alter table bk_rueckmeldungen add column if not exists antwort text;
alter table bk_rueckmeldungen add column if not exists beantwortet_am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_rueckmeldungen_von_fk') then alter table bk_rueckmeldungen add constraint bk_rueckmeldungen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Erstattungen
create table if not exists bk_erstattungen (
  id text primary key default gen_random_uuid()::text,
  von text,
  art text check (art is null or art in ('fahrt', 'auslage')),
  datum date not null,
  zweck text not null,
  km integer,
  betrag numeric(10,2),
  beleg text,
  termin_id text,
  status text check (status is null or status in ('eingereicht', 'genehmigt', 'ausgezahlt', 'abgelehnt')),
  notiz_kasse text,
  bearbeitet_von text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_erstattungen_geaendert on bk_erstattungen (geaendert_am);
alter table bk_erstattungen enable row level security;
revoke all on bk_erstattungen from public, anon, authenticated;
grant select, insert, update, delete on bk_erstattungen to service_role;
drop trigger if exists bk_erstattungen_stempel on bk_erstattungen;
create trigger bk_erstattungen_stempel before update on bk_erstattungen for each row execute function bk_abgleich_stempel();

alter table bk_erstattungen add column if not exists von text;
alter table bk_erstattungen add column if not exists art text;
alter table bk_erstattungen drop constraint if exists bk_erstattungen_art_check;
alter table bk_erstattungen add constraint bk_erstattungen_art_check check (art is null or art in ('fahrt', 'auslage'));
alter table bk_erstattungen add column if not exists datum date;
alter table bk_erstattungen add column if not exists zweck text;
alter table bk_erstattungen add column if not exists km integer;
alter table bk_erstattungen add column if not exists betrag numeric(10,2);
alter table bk_erstattungen add column if not exists beleg text;
alter table bk_erstattungen add column if not exists termin_id text;
alter table bk_erstattungen add column if not exists status text;
alter table bk_erstattungen drop constraint if exists bk_erstattungen_status_check;
alter table bk_erstattungen add constraint bk_erstattungen_status_check check (status is null or status in ('eingereicht', 'genehmigt', 'ausgezahlt', 'abgelehnt'));
alter table bk_erstattungen add column if not exists notiz_kasse text;
alter table bk_erstattungen add column if not exists bearbeitet_von text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_erstattungen_von_fk') then alter table bk_erstattungen add constraint bk_erstattungen_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_erstattungen_termin_id_fk') then alter table bk_erstattungen add constraint bk_erstattungen_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_erstattungen_bearbeitet_von_fk') then alter table bk_erstattungen add constraint bk_erstattungen_bearbeitet_von_fk foreign key (bearbeitet_von) references bk_personen(id) on delete restrict; end if; end $$;

