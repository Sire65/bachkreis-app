-- Bachkreis-App – Nachtrag: 📸 Bildschirmfoto an Rückmeldungen (0.46.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

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

