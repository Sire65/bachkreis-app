-- Bachkreis-App – Nachtrag: ⚖️ Zustimmungen zu Datenschutz und Nutzungsregeln (0.55.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Zustimmungen (Datenschutz & Regeln)
create table if not exists bk_zustimmungen (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  fuer_id text not null,
  art text not null check (art is null or art in ('datenschutz', 'regeln')),
  fassung text not null,
  zeit timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_zustimmungen_geaendert on bk_zustimmungen (geaendert_am);
alter table bk_zustimmungen enable row level security;
revoke all on bk_zustimmungen from public, anon, authenticated;
grant select, insert, update, delete on bk_zustimmungen to service_role;
drop trigger if exists bk_zustimmungen_stempel on bk_zustimmungen;
create trigger bk_zustimmungen_stempel before update on bk_zustimmungen for each row execute function bk_abgleich_stempel();

alter table bk_zustimmungen add column if not exists person_id text;
alter table bk_zustimmungen add column if not exists fuer_id text;
alter table bk_zustimmungen add column if not exists art text;
alter table bk_zustimmungen drop constraint if exists bk_zustimmungen_art_check;
alter table bk_zustimmungen add constraint bk_zustimmungen_art_check check (art is null or art in ('datenschutz', 'regeln'));
alter table bk_zustimmungen add column if not exists fassung text;
alter table bk_zustimmungen add column if not exists zeit timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_zustimmungen_person_id_fk') then alter table bk_zustimmungen add constraint bk_zustimmungen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_zustimmungen_fuer_id_fk') then alter table bk_zustimmungen add constraint bk_zustimmungen_fuer_id_fk foreign key (fuer_id) references bk_personen(id) on delete restrict; end if; end $$;

create index if not exists bk_zustimmungen_fuer on bk_zustimmungen (fuer_id);

