-- Bachkreis-App – Grundschema (automatisch erzeugt aus js/kern/schema.js mit tools/schema-sql.mjs – nicht von Hand ändern)
-- Abgleich-Spalten je Tabelle: id, version, erstellt_am, geaendert_am, geaendert_von, geloescht_am (weiches Löschen).
-- Zugriff ausschließlich über die Edge Function bk-api (Service-Role serverseitig). RLS ist überall aktiv, ohne Policies = für
-- anon/authenticated gesperrt. Feinere Policies folgen mit dem Supabase-Adapter (siehe docs/ARCHITEKTUR.md).

create or replace function bk_abgleich_stempel() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.geaendert_am := now();
  return new;
end $$;

-- Personen
create table if not exists bk_personen (
  id text primary key default gen_random_uuid()::text,
  vorname text not null,
  nachname text not null,
  typ text not null check (typ is null or typ in ('schueler', 'eltern', 'leitung', 'lehrkraft', 'foerderverein', 'unterstuetzer', 'spender', 'partner', 'dienstleister', 'ehemalig')),
  status text check (status is null or status in ('aktiv', 'pausiert', 'gast', 'ausgetreten')),
  jahrgang integer,
  schule text,
  firma text,
  email text,
  mobil text,
  telefon text,
  strasse text,
  plz text,
  ort text,
  geburtsdatum date,
  rollen text[],
  notfall_info text,
  kontakt_ok boolean,
  foto_ok boolean,
  notiz text,
  benachrichtigung jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_personen_geaendert on bk_personen (geaendert_am);
alter table bk_personen enable row level security;
drop trigger if exists bk_personen_stempel on bk_personen;
create trigger bk_personen_stempel before update on bk_personen for each row execute function bk_abgleich_stempel();

-- Eltern ↔ Kind
create table if not exists bk_eltern_kind (
  id text primary key default gen_random_uuid()::text,
  eltern_id text not null,
  kind_id text not null,
  beziehung text check (beziehung is null or beziehung in ('mutter', 'vater', 'sonstige')),
  hauptkontakt boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_eltern_kind_geaendert on bk_eltern_kind (geaendert_am);
alter table bk_eltern_kind enable row level security;
drop trigger if exists bk_eltern_kind_stempel on bk_eltern_kind;
create trigger bk_eltern_kind_stempel before update on bk_eltern_kind for each row execute function bk_abgleich_stempel();

-- Gruppen
create table if not exists bk_gruppen (
  id text primary key default gen_random_uuid()::text,
  kuerzel text not null,
  name text not null,
  beschreibung text,
  farbe text,
  sort integer,
  aktiv boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gruppen_geaendert on bk_gruppen (geaendert_am);
alter table bk_gruppen enable row level security;
drop trigger if exists bk_gruppen_stempel on bk_gruppen;
create trigger bk_gruppen_stempel before update on bk_gruppen for each row execute function bk_abgleich_stempel();

-- Gruppen-Zuordnung
create table if not exists bk_gruppe_zuordnung (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  gruppe_id text not null,
  art text not null check (art is null or art in ('stamm', 'temporaer')),
  von date not null,
  bis date,
  projekt_id text,
  grund text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_gruppe_zuordnung_geaendert on bk_gruppe_zuordnung (geaendert_am);
alter table bk_gruppe_zuordnung enable row level security;
drop trigger if exists bk_gruppe_zuordnung_stempel on bk_gruppe_zuordnung;
create trigger bk_gruppe_zuordnung_stempel before update on bk_gruppe_zuordnung for each row execute function bk_abgleich_stempel();

-- Register / Stimmgruppen
create table if not exists bk_register (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  kurz text,
  familie text check (familie is null or familie in ('streicher', 'holz', 'blech', 'schlag', 'tasten')),
  sort integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_register_geaendert on bk_register (geaendert_am);
alter table bk_register enable row level security;
drop trigger if exists bk_register_stempel on bk_register;
create trigger bk_register_stempel before update on bk_register for each row execute function bk_abgleich_stempel();

-- Instrumententypen
create table if not exists bk_instrument_typen (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  register_id text,
  wartung_monate integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_instrument_typen_geaendert on bk_instrument_typen (geaendert_am);
alter table bk_instrument_typen enable row level security;
drop trigger if exists bk_instrument_typen_stempel on bk_instrument_typen;
create trigger bk_instrument_typen_stempel before update on bk_instrument_typen for each row execute function bk_abgleich_stempel();

-- Instrumente je Person
create table if not exists bk_person_instrument (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  typ_id text not null,
  register_id text,
  haupt boolean,
  eigenes boolean,
  niveau text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_person_instrument_geaendert on bk_person_instrument (geaendert_am);
alter table bk_person_instrument enable row level security;
drop trigger if exists bk_person_instrument_stempel on bk_person_instrument;
create trigger bk_person_instrument_stempel before update on bk_person_instrument for each row execute function bk_abgleich_stempel();

-- Inventar (Instrumente)
create table if not exists bk_inventar (
  id text primary key default gen_random_uuid()::text,
  inventar_nr text not null,
  typ_id text not null,
  bezeichnung text,
  groesse text,
  zustand text check (zustand is null or zustand in ('sehr_gut', 'gut', 'gebraucht', 'maengel')),
  status text check (status is null or status in ('verfuegbar', 'verliehen', 'reparatur', 'ausgemustert')),
  standort text,
  wert numeric(10,2),
  anschaffung date,
  finanziert_von text,
  wartung_faellig date,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_inventar_geaendert on bk_inventar (geaendert_am);
alter table bk_inventar enable row level security;
drop trigger if exists bk_inventar_stempel on bk_inventar;
create trigger bk_inventar_stempel before update on bk_inventar for each row execute function bk_abgleich_stempel();

-- Ausleihen
create table if not exists bk_ausleihen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text not null,
  person_id text not null,
  von date not null,
  bis date,
  status text check (status is null or status in ('angefragt', 'aktiv', 'zurueck')),
  zustand_ausgabe text,
  zustand_rueckgabe text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_ausleihen_geaendert on bk_ausleihen (geaendert_am);
alter table bk_ausleihen enable row level security;
drop trigger if exists bk_ausleihen_stempel on bk_ausleihen;
create trigger bk_ausleihen_stempel before update on bk_ausleihen for each row execute function bk_abgleich_stempel();

-- Reparaturen & Wartung
create table if not exists bk_reparaturen (
  id text primary key default gen_random_uuid()::text,
  inventar_id text not null,
  meldung text not null,
  status text check (status is null or status in ('gemeldet', 'angebot', 'freigegeben', 'in_arbeit', 'erledigt', 'abgelehnt')),
  werkstatt_id text,
  kosten numeric(10,2),
  gemeldet_von text,
  freigegeben_von text,
  gemeldet_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_reparaturen_geaendert on bk_reparaturen (geaendert_am);
alter table bk_reparaturen enable row level security;
drop trigger if exists bk_reparaturen_stempel on bk_reparaturen;
create trigger bk_reparaturen_stempel before update on bk_reparaturen for each row execute function bk_abgleich_stempel();

-- Einkauf / Beschaffung
create table if not exists bk_einkaeufe (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  begruendung text,
  status text check (status is null or status in ('bedarf', 'angebote', 'freigegeben', 'bestellt', 'geliefert', 'inventarisiert', 'abgelehnt')),
  betrag numeric(10,2),
  haendler_id text,
  finanzierung text check (finanzierung is null or finanzierung in ('foerderverein', 'schule', 'spende', 'sonstige')),
  angelegt_am date,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_einkaeufe_geaendert on bk_einkaeufe (geaendert_am);
alter table bk_einkaeufe enable row level security;
drop trigger if exists bk_einkaeufe_stempel on bk_einkaeufe;
create trigger bk_einkaeufe_stempel before update on bk_einkaeufe for each row execute function bk_abgleich_stempel();

-- Projekte / Konzerte
create table if not exists bk_projekte (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('konzert', 'reise', 'freizeit', 'sonstiges')),
  von date,
  bis date,
  ort text,
  beschreibung text,
  checkliste text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_projekte_geaendert on bk_projekte (geaendert_am);
alter table bk_projekte enable row level security;
drop trigger if exists bk_projekte_stempel on bk_projekte;
create trigger bk_projekte_stempel before update on bk_projekte for each row execute function bk_abgleich_stempel();

-- Terminarten
create table if not exists bk_terminarten (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  sym text,
  farbe text,
  pflicht boolean,
  sort integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_terminarten_geaendert on bk_terminarten (geaendert_am);
alter table bk_terminarten enable row level security;
drop trigger if exists bk_terminarten_stempel on bk_terminarten;
create trigger bk_terminarten_stempel before update on bk_terminarten for each row execute function bk_abgleich_stempel();

-- Termine
create table if not exists bk_termine (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art_id text not null,
  beginn timestamptz not null,
  ende timestamptz,
  ort text,
  gruppen text[],
  projekt_id text,
  frist date,
  status text check (status is null or status in ('geplant', 'abgesagt')),
  beschreibung text,
  soll jsonb,
  register text[],
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_termine_geaendert on bk_termine (geaendert_am);
alter table bk_termine enable row level security;
drop trigger if exists bk_termine_stempel on bk_termine;
create trigger bk_termine_stempel before update on bk_termine for each row execute function bk_abgleich_stempel();

-- Zu-/Absagen
create table if not exists bk_antworten (
  id text primary key default gen_random_uuid()::text,
  termin_id text not null,
  person_id text not null,
  antwort text not null check (antwort is null or antwort in ('ja', 'vielleicht', 'nein')),
  notiz text,
  von_person_id text,
  anwesend text check (anwesend is null or anwesend in ('', 'ja', 'nein')),
  register_id text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_antworten_geaendert on bk_antworten (geaendert_am);
alter table bk_antworten enable row level security;
drop trigger if exists bk_antworten_stempel on bk_antworten;
create trigger bk_antworten_stempel before update on bk_antworten for each row execute function bk_abgleich_stempel();

-- Unterhaltungen
create table if not exists bk_unterhaltungen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('gruppe', 'einzel', 'verteiler')),
  verteiler text,
  mitglieder text[],
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_unterhaltungen_geaendert on bk_unterhaltungen (geaendert_am);
alter table bk_unterhaltungen enable row level security;
drop trigger if exists bk_unterhaltungen_stempel on bk_unterhaltungen;
create trigger bk_unterhaltungen_stempel before update on bk_unterhaltungen for each row execute function bk_abgleich_stempel();

-- Nachrichten
create table if not exists bk_nachrichten (
  id text primary key default gen_random_uuid()::text,
  unterhaltung_id text not null,
  von text,
  text text not null,
  zeit timestamptz,
  rueckmeldung boolean,
  gelesen_von text[],
  rueckmeldungen jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachrichten_geaendert on bk_nachrichten (geaendert_am);
alter table bk_nachrichten enable row level security;
drop trigger if exists bk_nachrichten_stempel on bk_nachrichten;
create trigger bk_nachrichten_stempel before update on bk_nachrichten for each row execute function bk_abgleich_stempel();

-- Pinnwand
create table if not exists bk_pinnwand (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  von text,
  wichtig boolean,
  erledigt boolean,
  zeit timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_pinnwand_geaendert on bk_pinnwand (geaendert_am);
alter table bk_pinnwand enable row level security;
drop trigger if exists bk_pinnwand_stempel on bk_pinnwand;
create trigger bk_pinnwand_stempel before update on bk_pinnwand for each row execute function bk_abgleich_stempel();

-- Genehmigungs-Vorlagen
create table if not exists bk_genehmigung_vorlagen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  text text not null,
  fassung integer,
  gueltig_monate integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_genehmigung_vorlagen_geaendert on bk_genehmigung_vorlagen (geaendert_am);
alter table bk_genehmigung_vorlagen enable row level security;
drop trigger if exists bk_genehmigung_vorlagen_stempel on bk_genehmigung_vorlagen;
create trigger bk_genehmigung_vorlagen_stempel before update on bk_genehmigung_vorlagen for each row execute function bk_abgleich_stempel();

-- Genehmigungen
create table if not exists bk_genehmigungen (
  id text primary key default gen_random_uuid()::text,
  vorlage_id text not null,
  kind_id text not null,
  projekt_id text,
  frist date,
  status text check (status is null or status in ('ausstehend', 'erteilt', 'abgelehnt', 'widerrufen')),
  beantwortet_von text,
  beantwortet_am timestamptz,
  papier boolean,
  vorlage_version integer,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_genehmigungen_geaendert on bk_genehmigungen (geaendert_am);
alter table bk_genehmigungen enable row level security;
drop trigger if exists bk_genehmigungen_stempel on bk_genehmigungen;
create trigger bk_genehmigungen_stempel before update on bk_genehmigungen for each row execute function bk_abgleich_stempel();

-- Notenarchiv – Werke
create table if not exists bk_werke (
  id text primary key default gen_random_uuid()::text,
  komponist text not null,
  titel text not null,
  werkverzeichnis text,
  ausgabe text,
  rechte text check (rechte is null or rechte in ('gemeinfrei', 'lizenziert', 'intern')),
  projekte text[],
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_werke_geaendert on bk_werke (geaendert_am);
alter table bk_werke enable row level security;
drop trigger if exists bk_werke_stempel on bk_werke;
create trigger bk_werke_stempel before update on bk_werke for each row execute function bk_abgleich_stempel();

-- Notenarchiv – Stimmen
create table if not exists bk_stimmen (
  id text primary key default gen_random_uuid()::text,
  werk_id text not null,
  bezeichnung text not null,
  register_id text,
  gruppe_id text,
  person_id text,
  datei text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_stimmen_geaendert on bk_stimmen (geaendert_am);
alter table bk_stimmen enable row level security;
drop trigger if exists bk_stimmen_stempel on bk_stimmen;
create trigger bk_stimmen_stempel before update on bk_stimmen for each row execute function bk_abgleich_stempel();

-- Unterstützer & Spenden
create table if not exists bk_spenden (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  datum date not null,
  betrag numeric(10,2),
  sachspende text,
  zweck text,
  dank_gesendet boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_spenden_geaendert on bk_spenden (geaendert_am);
alter table bk_spenden enable row level security;
drop trigger if exists bk_spenden_stempel on bk_spenden;
create trigger bk_spenden_stempel before update on bk_spenden for each row execute function bk_abgleich_stempel();

-- Vorgänge & Aufgaben
create table if not exists bk_aufgaben (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  art text check (art is null or art in ('aufgabe', 'aenderung', 'wechselwunsch', 'sonstiges')),
  status text check (status is null or status in ('offen', 'in_arbeit', 'erledigt')),
  zustaendig_id text,
  von_id text,
  frist date,
  text text,
  ziel_gruppe text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_aufgaben_geaendert on bk_aufgaben (geaendert_am);
alter table bk_aufgaben enable row level security;
drop trigger if exists bk_aufgaben_stempel on bk_aufgaben;
create trigger bk_aufgaben_stempel before update on bk_aufgaben for each row execute function bk_abgleich_stempel();

-- Zugänge
create table if not exists bk_zugaenge (
  id text primary key default gen_random_uuid()::text,
  person_id text not null,
  code text,
  art text check (art is null or art in ('link', 'iserv')),
  aktiv boolean,
  verwaltung boolean,
  zuletzt timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_zugaenge_geaendert on bk_zugaenge (geaendert_am);
alter table bk_zugaenge enable row level security;
drop trigger if exists bk_zugaenge_stempel on bk_zugaenge;
create trigger bk_zugaenge_stempel before update on bk_zugaenge for each row execute function bk_abgleich_stempel();

-- Versandprotokoll
create table if not exists bk_versand (
  id text primary key default gen_random_uuid()::text,
  zeit timestamptz,
  kanal text check (kanal is null or kanal in ('push', 'mail', 'whatsapp', 'app')),
  an_id text,
  betreff text,
  status text check (status is null or status in ('simuliert', 'uebergeben', 'gesendet', 'fehler')),
  ereignis text,
  info text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_versand_geaendert on bk_versand (geaendert_am);
alter table bk_versand enable row level security;
drop trigger if exists bk_versand_stempel on bk_versand;
create trigger bk_versand_stempel before update on bk_versand for each row execute function bk_abgleich_stempel();

-- Änderungsprotokoll (Abgleich)
create table if not exists bk_aenderungen (
  id text primary key default gen_random_uuid()::text,
  zeit timestamptz,
  tabelle text,
  zeile_id text,
  aktion text check (aktion is null or aktion in ('neu', 'geaendert', 'geloescht')),
  wer text,
  quelle text check (quelle is null or quelle in ('app', 'verwaltung', 'import', 'system')),
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_aenderungen_geaendert on bk_aenderungen (geaendert_am);
alter table bk_aenderungen enable row level security;
drop trigger if exists bk_aenderungen_stempel on bk_aenderungen;
create trigger bk_aenderungen_stempel before update on bk_aenderungen for each row execute function bk_abgleich_stempel();

-- Fremdschlüssel (nach allen Tabellen, damit die Reihenfolge egal ist)
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eltern_kind_eltern_id_fk') then alter table bk_eltern_kind add constraint bk_eltern_kind_eltern_id_fk foreign key (eltern_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_eltern_kind_kind_id_fk') then alter table bk_eltern_kind add constraint bk_eltern_kind_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gruppe_zuordnung_person_id_fk') then alter table bk_gruppe_zuordnung add constraint bk_gruppe_zuordnung_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gruppe_zuordnung_gruppe_id_fk') then alter table bk_gruppe_zuordnung add constraint bk_gruppe_zuordnung_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_gruppe_zuordnung_projekt_id_fk') then alter table bk_gruppe_zuordnung add constraint bk_gruppe_zuordnung_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_instrument_typen_register_id_fk') then alter table bk_instrument_typen add constraint bk_instrument_typen_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_person_instrument_person_id_fk') then alter table bk_person_instrument add constraint bk_person_instrument_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_person_instrument_typ_id_fk') then alter table bk_person_instrument add constraint bk_person_instrument_typ_id_fk foreign key (typ_id) references bk_instrument_typen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_person_instrument_register_id_fk') then alter table bk_person_instrument add constraint bk_person_instrument_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_inventar_typ_id_fk') then alter table bk_inventar add constraint bk_inventar_typ_id_fk foreign key (typ_id) references bk_instrument_typen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_inventar_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_ausleihen_person_id_fk') then alter table bk_ausleihen add constraint bk_ausleihen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_inventar_id_fk') then alter table bk_reparaturen add constraint bk_reparaturen_inventar_id_fk foreign key (inventar_id) references bk_inventar(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_werkstatt_id_fk') then alter table bk_reparaturen add constraint bk_reparaturen_werkstatt_id_fk foreign key (werkstatt_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_gemeldet_von_fk') then alter table bk_reparaturen add constraint bk_reparaturen_gemeldet_von_fk foreign key (gemeldet_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_reparaturen_freigegeben_von_fk') then alter table bk_reparaturen add constraint bk_reparaturen_freigegeben_von_fk foreign key (freigegeben_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_einkaeufe_haendler_id_fk') then alter table bk_einkaeufe add constraint bk_einkaeufe_haendler_id_fk foreign key (haendler_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_art_id_fk') then alter table bk_termine add constraint bk_termine_art_id_fk foreign key (art_id) references bk_terminarten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_termine_projekt_id_fk') then alter table bk_termine add constraint bk_termine_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_termin_id_fk') then alter table bk_antworten add constraint bk_antworten_termin_id_fk foreign key (termin_id) references bk_termine(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_person_id_fk') then alter table bk_antworten add constraint bk_antworten_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_von_person_id_fk') then alter table bk_antworten add constraint bk_antworten_von_person_id_fk foreign key (von_person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_antworten_register_id_fk') then alter table bk_antworten add constraint bk_antworten_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_unterhaltung_id_fk') then alter table bk_nachrichten add constraint bk_nachrichten_unterhaltung_id_fk foreign key (unterhaltung_id) references bk_unterhaltungen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachrichten_von_fk') then alter table bk_nachrichten add constraint bk_nachrichten_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_von_fk') then alter table bk_pinnwand add constraint bk_pinnwand_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_vorlage_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_vorlage_id_fk foreign key (vorlage_id) references bk_genehmigung_vorlagen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_kind_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_projekt_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_beantwortet_von_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_beantwortet_von_fk foreign key (beantwortet_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_werk_id_fk') then alter table bk_stimmen add constraint bk_stimmen_werk_id_fk foreign key (werk_id) references bk_werke(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_register_id_fk') then alter table bk_stimmen add constraint bk_stimmen_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_gruppe_id_fk') then alter table bk_stimmen add constraint bk_stimmen_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_person_id_fk') then alter table bk_stimmen add constraint bk_stimmen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_spenden_person_id_fk') then alter table bk_spenden add constraint bk_spenden_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_zustaendig_id_fk') then alter table bk_aufgaben add constraint bk_aufgaben_zustaendig_id_fk foreign key (zustaendig_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_von_id_fk') then alter table bk_aufgaben add constraint bk_aufgaben_von_id_fk foreign key (von_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_ziel_gruppe_fk') then alter table bk_aufgaben add constraint bk_aufgaben_ziel_gruppe_fk foreign key (ziel_gruppe) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_zugaenge_person_id_fk') then alter table bk_zugaenge add constraint bk_zugaenge_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_versand_an_id_fk') then alter table bk_versand add constraint bk_versand_an_id_fk foreign key (an_id) references bk_personen(id) on delete restrict; end if; end $$;

-- Konfiguration (Schlüssel/Wert) und Push-Abos
create table if not exists bk_konfig (schluessel text primary key, wert jsonb, geaendert_am timestamptz not null default now());
alter table bk_konfig enable row level security;
create table if not exists bk_push_abos (id text primary key default gen_random_uuid()::text, person_id text not null references bk_personen(id), endpoint text not null unique, schluessel jsonb not null, erstellt_am timestamptz not null default now());
alter table bk_push_abos enable row level security;
-- Zugangscodes nur als Hash speichern (Spalte code bleibt für die Vorführversion, im Echtbetrieb leer)
alter table bk_zugaenge add column if not exists code_hash text;
create unique index if not exists bk_zugaenge_code_hash on bk_zugaenge (code_hash) where code_hash is not null;
