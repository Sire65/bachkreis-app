-- Bachkreis-App – Nachtrag: 🎟️ Konzertkarten: Reservierung ohne Konto, Abendkasse · 🔑 Passkeys (0.56.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

-- Kartenreservierungen
create table if not exists bk_kartenreservierungen (
  id text primary key default gen_random_uuid()::text,
  termin_id text not null,
  name text not null,
  email text,
  anzahl integer not null,
  code text,
  status text check (status is null or status in ('reserviert', 'abgeholt', 'storniert')),
  quelle text check (quelle is null or quelle in ('online', 'kasse')),
  notiz text,
  zeit timestamptz,
  ip_hash text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kartenreservierungen_geaendert on bk_kartenreservierungen (geaendert_am);
alter table bk_kartenreservierungen enable row level security;
revoke all on bk_kartenreservierungen from public, anon, authenticated;
grant select, insert, update, delete on bk_kartenreservierungen to service_role;
drop trigger if exists bk_kartenreservierungen_stempel on bk_kartenreservierungen;
create trigger bk_kartenreservierungen_stempel before update on bk_kartenreservierungen for each row execute function bk_abgleich_stempel();

alter table bk_kartenreservierungen add column if not exists termin_id text;
alter table bk_kartenreservierungen add column if not exists name text;
alter table bk_kartenreservierungen add column if not exists email text;
alter table bk_kartenreservierungen add column if not exists anzahl integer;
alter table bk_kartenreservierungen add column if not exists code text;
alter table bk_kartenreservierungen add column if not exists status text;
alter table bk_kartenreservierungen drop constraint if exists bk_kartenreservierungen_status_check;
alter table bk_kartenreservierungen add constraint bk_kartenreservierungen_status_check check (status is null or status in ('reserviert', 'abgeholt', 'storniert'));
alter table bk_kartenreservierungen add column if not exists quelle text;
alter table bk_kartenreservierungen drop constraint if exists bk_kartenreservierungen_quelle_check;
alter table bk_kartenreservierungen add constraint bk_kartenreservierungen_quelle_check check (quelle is null or quelle in ('online', 'kasse'));
alter table bk_kartenreservierungen add column if not exists notiz text;
alter table bk_kartenreservierungen add column if not exists zeit timestamptz;
alter table bk_kartenreservierungen add column if not exists ip_hash text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kartenreservierungen_termin_id_fk') then alter table bk_kartenreservierungen add constraint bk_kartenreservierungen_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;

-- Termine
create table if not exists bk_termine (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art_id text not null,
  beginn timestamptz not null,
  ende timestamptz,
  ort text,
  fuer_alle boolean,
  gruppen text[],
  teilnahme text check (teilnahme is null or teilnahme in ('pflicht', 'erwuenscht', 'info')),
  projekt_id text,
  frist date,
  status text check (status is null or status in ('geplant', 'abgesagt')),
  beschreibung text,
  register text[],
  soll jsonb,
  probenplan text,
  protokoll text,
  karten_aktiv boolean,
  karten_plaetze integer,
  karten_je integer,
  karten_hinweis text,
  karten_token text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_termine_geaendert on bk_termine (geaendert_am);
alter table bk_termine enable row level security;
revoke all on bk_termine from public, anon, authenticated;
grant select, insert, update, delete on bk_termine to service_role;
drop trigger if exists bk_termine_stempel on bk_termine;
create trigger bk_termine_stempel before update on bk_termine for each row execute function bk_abgleich_stempel();

alter table bk_termine add column if not exists titel text;
alter table bk_termine add column if not exists art_id text;
alter table bk_termine add column if not exists beginn timestamptz;
alter table bk_termine add column if not exists ende timestamptz;
alter table bk_termine add column if not exists ort text;
alter table bk_termine add column if not exists fuer_alle boolean;
alter table bk_termine add column if not exists gruppen text[];
alter table bk_termine add column if not exists teilnahme text;
alter table bk_termine drop constraint if exists bk_termine_teilnahme_check;
alter table bk_termine add constraint bk_termine_teilnahme_check check (teilnahme is null or teilnahme in ('pflicht', 'erwuenscht', 'info'));
alter table bk_termine add column if not exists projekt_id text;
alter table bk_termine add column if not exists frist date;
alter table bk_termine add column if not exists status text;
alter table bk_termine drop constraint if exists bk_termine_status_check;
alter table bk_termine add constraint bk_termine_status_check check (status is null or status in ('geplant', 'abgesagt'));
alter table bk_termine add column if not exists beschreibung text;
alter table bk_termine add column if not exists register text[];
alter table bk_termine add column if not exists soll jsonb;
alter table bk_termine add column if not exists probenplan text;
alter table bk_termine add column if not exists protokoll text;
alter table bk_termine add column if not exists karten_aktiv boolean;
alter table bk_termine add column if not exists karten_plaetze integer;
alter table bk_termine add column if not exists karten_je integer;
alter table bk_termine add column if not exists karten_hinweis text;
alter table bk_termine add column if not exists karten_token text;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_art_id_fk') then alter table bk_termine add constraint bk_termine_art_id_fk foreign key (art_id) references bk_terminarten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_projekt_id_fk') then alter table bk_termine add constraint bk_termine_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;

-- Passkeys
create table if not exists bk_passkeys (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  name text,
  cred_id text not null,
  zuletzt timestamptz,
  public_key jsonb,
  rp_hash text,
  zaehler integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_passkeys_geaendert on bk_passkeys (geaendert_am);
alter table bk_passkeys enable row level security;
revoke all on bk_passkeys from public, anon, authenticated;
grant select, insert, update, delete on bk_passkeys to service_role;
drop trigger if exists bk_passkeys_stempel on bk_passkeys;
create trigger bk_passkeys_stempel before update on bk_passkeys for each row execute function bk_abgleich_stempel();

alter table bk_passkeys add column if not exists person_id text;
alter table bk_passkeys add column if not exists name text;
alter table bk_passkeys add column if not exists cred_id text;
alter table bk_passkeys add column if not exists zuletzt timestamptz;
alter table bk_passkeys add column if not exists public_key jsonb;
alter table bk_passkeys add column if not exists rp_hash text;
alter table bk_passkeys add column if not exists zaehler integer;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_passkeys_person_id_fk') then alter table bk_passkeys add constraint bk_passkeys_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;

create unique index if not exists bk_passkeys_cred on bk_passkeys (cred_id);
create table if not exists bk_passkey_challenges (id text primary key, challenge text not null, person_id text, art text not null, ablauf timestamptz not null, benutzt boolean not null default false, erstellt_am timestamptz not null default now());
alter table bk_passkey_challenges enable row level security;
revoke all on bk_passkey_challenges from public, anon, authenticated;
grant select, insert, update, delete on bk_passkey_challenges to service_role;
revoke all on bk_passkey_challenges from public, anon, authenticated;
grant select, insert, update, delete on bk_passkey_challenges to service_role;
create index if not exists bk_kartenreservierungen_termin on bk_kartenreservierungen (termin_id);
create unique index if not exists bk_termine_karten_token on bk_termine (karten_token) where karten_token is not null;

