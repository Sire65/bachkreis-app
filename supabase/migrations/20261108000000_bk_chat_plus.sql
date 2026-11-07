-- Bachkreis-App – Nachtrag: 💬 Nachrichten wie KC 2.882: Weiterleiten, @Erwähnungen, Anheften, 🔕 stumm/📦 Archiv/⭐ Favorit je Person, 🔖 Merkliste (0.38.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Unterhaltungen
create table if not exists bk_unterhaltungen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('gruppe', 'einzel', 'runde', 'verteiler')),
  verteiler text,
  mitglieder text[],
  angeheftet jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_unterhaltungen_geaendert on bk_unterhaltungen (geaendert_am);
alter table bk_unterhaltungen enable row level security;
revoke all on bk_unterhaltungen from public, anon, authenticated;
grant select, insert, update, delete on bk_unterhaltungen to service_role;
drop trigger if exists bk_unterhaltungen_stempel on bk_unterhaltungen;
create trigger bk_unterhaltungen_stempel before update on bk_unterhaltungen for each row execute function bk_abgleich_stempel();

alter table bk_unterhaltungen add column if not exists titel text;
alter table bk_unterhaltungen add column if not exists art text;
alter table bk_unterhaltungen drop constraint if exists bk_unterhaltungen_art_check;
alter table bk_unterhaltungen add constraint bk_unterhaltungen_art_check check (art is null or art in ('gruppe', 'einzel', 'runde', 'verteiler'));
alter table bk_unterhaltungen add column if not exists verteiler text;
alter table bk_unterhaltungen add column if not exists mitglieder text[];
alter table bk_unterhaltungen add column if not exists angeheftet jsonb;

-- Nachrichten
create table if not exists bk_nachrichten (
  id text primary key default gen_random_uuid()::text,
  unterhaltung_id text not null,
  von text,
  text text,
  zeit timestamptz,
  rueckmeldung boolean,
  wichtig boolean,
  express boolean,
  antwort_auf text,
  weitergeleitet_von text,
  erwaehnt text[],
  kanaele text[],
  geplant_um timestamptz,
  wiederholung text check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich')),
  anlagen jsonb,
  umfrage jsonb,
  loescht_am timestamptz,
  gelesen_von text[],
  rueckmeldungen jsonb,
  reaktionen jsonb,
  anzahl integer,
  bearbeitet_am timestamptz,
  zurueckgezogen_am timestamptz,
  geplant_frei timestamptz,
  umfrage_stimmen jsonb,
  umfrage_frei jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachrichten_geaendert on bk_nachrichten (geaendert_am);
alter table bk_nachrichten enable row level security;
revoke all on bk_nachrichten from public, anon, authenticated;
grant select, insert, update, delete on bk_nachrichten to service_role;
drop trigger if exists bk_nachrichten_stempel on bk_nachrichten;
create trigger bk_nachrichten_stempel before update on bk_nachrichten for each row execute function bk_abgleich_stempel();

alter table bk_nachrichten add column if not exists unterhaltung_id text;
alter table bk_nachrichten add column if not exists von text;
alter table bk_nachrichten add column if not exists text text;
alter table bk_nachrichten add column if not exists zeit timestamptz;
alter table bk_nachrichten add column if not exists rueckmeldung boolean;
alter table bk_nachrichten add column if not exists wichtig boolean;
alter table bk_nachrichten add column if not exists express boolean;
alter table bk_nachrichten add column if not exists antwort_auf text;
alter table bk_nachrichten add column if not exists weitergeleitet_von text;
alter table bk_nachrichten add column if not exists erwaehnt text[];
alter table bk_nachrichten add column if not exists kanaele text[];
alter table bk_nachrichten add column if not exists geplant_um timestamptz;
alter table bk_nachrichten add column if not exists wiederholung text;
alter table bk_nachrichten drop constraint if exists bk_nachrichten_wiederholung_check;
alter table bk_nachrichten add constraint bk_nachrichten_wiederholung_check check (wiederholung is null or wiederholung in ('einmal', 'taeglich', 'werktags', 'woechentlich', 'monatlich'));
alter table bk_nachrichten add column if not exists anlagen jsonb;
alter table bk_nachrichten add column if not exists umfrage jsonb;
alter table bk_nachrichten add column if not exists loescht_am timestamptz;
alter table bk_nachrichten add column if not exists gelesen_von text[];
alter table bk_nachrichten add column if not exists rueckmeldungen jsonb;
alter table bk_nachrichten add column if not exists reaktionen jsonb;
alter table bk_nachrichten add column if not exists anzahl integer;
alter table bk_nachrichten add column if not exists bearbeitet_am timestamptz;
alter table bk_nachrichten add column if not exists zurueckgezogen_am timestamptz;
alter table bk_nachrichten add column if not exists geplant_frei timestamptz;
alter table bk_nachrichten add column if not exists umfrage_stimmen jsonb;
alter table bk_nachrichten add column if not exists umfrage_frei jsonb;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_unterhaltung_id_fk') then alter table bk_nachrichten add constraint bk_nachrichten_unterhaltung_id_fk foreign key (unterhaltung_id) references bk_unterhaltungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_von_fk') then alter table bk_nachrichten add constraint bk_nachrichten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;

-- Chat-Einstellungen je Person
create table if not exists bk_chat_einstellungen (
  id text primary key default gen_random_uuid()::text,
  unterhaltung_id text not null,
  person_id text not null,
  stumm_bis timestamptz,
  archiviert boolean,
  favorit boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_chat_einstellungen_geaendert on bk_chat_einstellungen (geaendert_am);
alter table bk_chat_einstellungen enable row level security;
revoke all on bk_chat_einstellungen from public, anon, authenticated;
grant select, insert, update, delete on bk_chat_einstellungen to service_role;
drop trigger if exists bk_chat_einstellungen_stempel on bk_chat_einstellungen;
create trigger bk_chat_einstellungen_stempel before update on bk_chat_einstellungen for each row execute function bk_abgleich_stempel();

alter table bk_chat_einstellungen add column if not exists unterhaltung_id text;
alter table bk_chat_einstellungen add column if not exists person_id text;
alter table bk_chat_einstellungen add column if not exists stumm_bis timestamptz;
alter table bk_chat_einstellungen add column if not exists archiviert boolean;
alter table bk_chat_einstellungen add column if not exists favorit boolean;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chat_einstellungen_unterhaltung_id_fk') then alter table bk_chat_einstellungen add constraint bk_chat_einstellungen_unterhaltung_id_fk foreign key (unterhaltung_id) references bk_unterhaltungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chat_einstellungen_person_id_fk') then alter table bk_chat_einstellungen add constraint bk_chat_einstellungen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Gemerkte Nachrichten
create table if not exists bk_chat_merker (
  id text primary key default gen_random_uuid()::text,
  nachricht_id text not null,
  person_id text not null,
  aktiv boolean,
  am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_chat_merker_geaendert on bk_chat_merker (geaendert_am);
alter table bk_chat_merker enable row level security;
revoke all on bk_chat_merker from public, anon, authenticated;
grant select, insert, update, delete on bk_chat_merker to service_role;
drop trigger if exists bk_chat_merker_stempel on bk_chat_merker;
create trigger bk_chat_merker_stempel before update on bk_chat_merker for each row execute function bk_abgleich_stempel();

alter table bk_chat_merker add column if not exists nachricht_id text;
alter table bk_chat_merker add column if not exists person_id text;
alter table bk_chat_merker add column if not exists aktiv boolean;
alter table bk_chat_merker add column if not exists am timestamptz;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chat_merker_nachricht_id_fk') then alter table bk_chat_merker add constraint bk_chat_merker_nachricht_id_fk foreign key (nachricht_id) references bk_nachrichten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_chat_merker_person_id_fk') then alter table bk_chat_merker add constraint bk_chat_merker_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

