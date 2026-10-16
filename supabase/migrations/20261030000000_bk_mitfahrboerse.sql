-- Bachkreis-App – Nachtrag: Mitfahrbörse: Angebote und Gesuche, Zusage (0.23.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Mitfahrbörse
create table if not exists bk_mitfahrten (
  id text primary key default gen_random_uuid()::text,
  termin_id text not null,
  art text check (art is null or art in ('angebot', 'gesuch')),
  fahrer_id text not null,
  richtung text check (richtung is null or richtung in ('hin', 'zurueck', 'beides')),
  plaetze integer,
  abfahrt text,
  mitfahrer text[],
  zusage_von text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_mitfahrten_geaendert on bk_mitfahrten (geaendert_am);
alter table bk_mitfahrten enable row level security;
drop trigger if exists bk_mitfahrten_stempel on bk_mitfahrten;
create trigger bk_mitfahrten_stempel before update on bk_mitfahrten for each row execute function bk_abgleich_stempel();

alter table bk_mitfahrten add column if not exists termin_id text;
alter table bk_mitfahrten add column if not exists art text;
alter table bk_mitfahrten drop constraint if exists bk_mitfahrten_art_check;
alter table bk_mitfahrten add constraint bk_mitfahrten_art_check check (art is null or art in ('angebot', 'gesuch'));
alter table bk_mitfahrten add column if not exists fahrer_id text;
alter table bk_mitfahrten add column if not exists richtung text;
alter table bk_mitfahrten drop constraint if exists bk_mitfahrten_richtung_check;
alter table bk_mitfahrten add constraint bk_mitfahrten_richtung_check check (richtung is null or richtung in ('hin', 'zurueck', 'beides'));
alter table bk_mitfahrten add column if not exists plaetze integer;
alter table bk_mitfahrten add column if not exists abfahrt text;
alter table bk_mitfahrten add column if not exists mitfahrer text[];
alter table bk_mitfahrten add column if not exists zusage_von text;
alter table bk_mitfahrten add column if not exists notiz text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_termin_id_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_fahrer_id_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_fahrer_id_fk foreign key (fahrer_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_mitfahrten_zusage_von_fk') then alter table bk_mitfahrten add constraint bk_mitfahrten_zusage_von_fk foreign key (zusage_von) references bk_personen(id) on delete restrict; end if; end $$;

