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
  freigaben jsonb,
  avatar jsonb,
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
  soll jsonb,
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
  gruppe text check (gruppe is null or gruppe in ('streicher', 'holz', 'blech', 'schlag', 'tasten', 'sonstige')),
  symbol text,
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
  art text check (art is null or art in ('gruppe', 'einzel', 'runde', 'verteiler')),
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
  text text,
  zeit timestamptz,
  rueckmeldung boolean,
  wichtig boolean,
  express boolean,
  antwort_auf text,
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

-- Nachrichten: angekommen & gelesen
create table if not exists bk_nachricht_status (
  id text primary key default gen_random_uuid()::text,
  nachricht_id text not null,
  person_id text not null,
  autor_id text,
  zugestellt_am timestamptz,
  gelesen_am timestamptz,
  express_antwort text check (express_antwort is null or express_antwort in ('geoeffnet', 'spaeter', 'nein')),
  express_bestaetigt_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_nachricht_status_geaendert on bk_nachricht_status (geaendert_am);
alter table bk_nachricht_status enable row level security;
drop trigger if exists bk_nachricht_status_stempel on bk_nachricht_status;
create trigger bk_nachricht_status_stempel before update on bk_nachricht_status for each row execute function bk_abgleich_stempel();

-- Pinnwand
create table if not exists bk_pinnwand (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  von text,
  wichtig boolean,
  fuer text check (fuer is null or fuer in ('ich', 'alle', 'personen')),
  personen text[],
  farbe integer,
  antworten boolean,
  zeit timestamptz,
  anzahl integer,
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

-- Pinnwand: gesehen & erledigt
create table if not exists bk_pinnwand_gelesen (
  id text primary key default gen_random_uuid()::text,
  zettel_id text not null,
  person_id text not null,
  gesehen_am timestamptz,
  erledigt_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_pinnwand_gelesen_geaendert on bk_pinnwand_gelesen (geaendert_am);
alter table bk_pinnwand_gelesen enable row level security;
drop trigger if exists bk_pinnwand_gelesen_stempel on bk_pinnwand_gelesen;
create trigger bk_pinnwand_gelesen_stempel before update on bk_pinnwand_gelesen for each row execute function bk_abgleich_stempel();

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
  gruppen text[],
  schwierigkeit text check (schwierigkeit is null or schwierigkeit in ('leicht', 'mittel', 'schwer')),
  dauer_min integer,
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

-- Konzertaufnahmen
create table if not exists bk_aufnahmen (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  datum date,
  projekt_id text,
  datei text,
  quelle_url text,
  dauer_sek integer,
  freigabe text check (freigabe is null or freigabe in ('intern', 'mitglieder', 'oeffentlich')),
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_aufnahmen_geaendert on bk_aufnahmen (geaendert_am);
alter table bk_aufnahmen enable row level security;
drop trigger if exists bk_aufnahmen_stempel on bk_aufnahmen;
create trigger bk_aufnahmen_stempel before update on bk_aufnahmen for each row execute function bk_abgleich_stempel();

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

-- Versand-Aufträge
create table if not exists bk_versand (
  id text primary key default gen_random_uuid()::text,
  zeit timestamptz,
  kanal text check (kanal is null or kanal in ('push', 'mail', 'app', 'whatsapp')),
  an_id text,
  betreff text,
  status text check (status is null or status in ('wartend', 'in_arbeit', 'gesendet', 'zugestellt', 'angezeigt', 'geoeffnet', 'quittiert', 'erneut', 'tot', 'fehler', 'unterdrueckt', 'simuliert', 'uebergeben', 'vorgemerkt')),
  ereignis text,
  programm text,
  prioritaet text check (prioritaet is null or prioritaet in ('normal', 'hoch', 'kritisch')),
  anbieter_id text,
  versuche integer,
  fehler_code text,
  fehler_text text,
  naechster_versuch timestamptz,
  gesendet_am timestamptz,
  korrelation text,
  info text,
  vorlage text,
  idempotenz text,
  anbieter_nachricht_id text,
  quittung_noetig boolean,
  quittung_hash text,
  status_am timestamptz,
  meta jsonb,
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

-- Communicator: Grundeinstellungen
create table if not exists bk_kom_einstellungen (
  id text primary key default gen_random_uuid()::text,
  versand_aktiv boolean,
  nur_kostenlos boolean,
  max_pro_minute integer,
  ruhe_von text,
  ruhe_bis text,
  max_versuche integer,
  basis_sekunden integer,
  max_sekunden integer,
  absender_name text,
  absender_email text,
  antwort_an text,
  app_url text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_einstellungen_geaendert on bk_kom_einstellungen (geaendert_am);
alter table bk_kom_einstellungen enable row level security;
drop trigger if exists bk_kom_einstellungen_stempel on bk_kom_einstellungen;
create trigger bk_kom_einstellungen_stempel before update on bk_kom_einstellungen for each row execute function bk_abgleich_stempel();

-- Communicator: Programme
create table if not exists bk_kom_programme (
  id text primary key default gen_random_uuid()::text,
  schluessel text not null,
  name text not null,
  aktiv boolean,
  beschreibung text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_programme_geaendert on bk_kom_programme (geaendert_am);
alter table bk_kom_programme enable row level security;
drop trigger if exists bk_kom_programme_stempel on bk_kom_programme;
create trigger bk_kom_programme_stempel before update on bk_kom_programme for each row execute function bk_abgleich_stempel();

-- Communicator: Vorlagen
create table if not exists bk_kom_vorlagen (
  id text primary key default gen_random_uuid()::text,
  schluessel text not null,
  name text not null,
  betreff text,
  text text,
  varianten jsonb,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_vorlagen_geaendert on bk_kom_vorlagen (geaendert_am);
alter table bk_kom_vorlagen enable row level security;
drop trigger if exists bk_kom_vorlagen_stempel on bk_kom_vorlagen;
create trigger bk_kom_vorlagen_stempel before update on bk_kom_vorlagen for each row execute function bk_abgleich_stempel();

-- Communicator: Regeln je Ereignis
create table if not exists bk_kom_regeln (
  id text primary key default gen_random_uuid()::text,
  ereignis text not null check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'nachricht_wichtig', 'express', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard')),
  programm_id text not null,
  kanaele text[],
  modus text check (modus is null or modus in ('rueckfall', 'alle')),
  vorlage_id text,
  prioritaet text check (prioritaet is null or prioritaet in ('normal', 'hoch', 'kritisch')),
  ruhezeit text check (ruhezeit is null or ruhezeit in ('verschieben', 'ignorieren')),
  quittung boolean,
  eltern text check (eltern is null or eltern in ('auch', 'statt', 'nein')),
  dedupe_sekunden integer,
  aktiv boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_regeln_geaendert on bk_kom_regeln (geaendert_am);
alter table bk_kom_regeln enable row level security;
drop trigger if exists bk_kom_regeln_stempel on bk_kom_regeln;
create trigger bk_kom_regeln_stempel before update on bk_kom_regeln for each row execute function bk_abgleich_stempel();

-- Communicator: Anbieter
create table if not exists bk_kom_anbieter (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  kanal text not null check (kanal is null or kanal in ('push', 'mail', 'alle')),
  art text not null check (art is null or art in ('webpush', 'brevo', 'smtp', 'protokoll')),
  kostenlos boolean,
  aktiv boolean,
  bremse_minute integer,
  bremse_stunde integer,
  tageslimit integer,
  geheimnis text,
  notiz text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_anbieter_geaendert on bk_kom_anbieter (geaendert_am);
alter table bk_kom_anbieter enable row level security;
drop trigger if exists bk_kom_anbieter_stempel on bk_kom_anbieter;
create trigger bk_kom_anbieter_stempel before update on bk_kom_anbieter for each row execute function bk_abgleich_stempel();

-- Communicator: Routen
create table if not exists bk_kom_routen (
  id text primary key default gen_random_uuid()::text,
  kanal text not null check (kanal is null or kanal in ('push', 'mail')),
  anbieter_id text not null,
  rang integer,
  auto_wechsel boolean,
  aktiv boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_routen_geaendert on bk_kom_routen (geaendert_am);
alter table bk_kom_routen enable row level security;
drop trigger if exists bk_kom_routen_stempel on bk_kom_routen;
create trigger bk_kom_routen_stempel before update on bk_kom_routen for each row execute function bk_abgleich_stempel();

-- Communicator: Eskalationen
create table if not exists bk_kom_eskalationen (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  ereignis text not null check (ereignis is null or ereignis in ('termin_neu', 'termin_geaendert', 'erinnerung', 'nachfassen', 'nachricht', 'nachricht_wichtig', 'express', 'rundschreiben', 'genehmigung', 'instrument', 'pinnwand', 'sos', 'test', 'standard')),
  ausloeser text not null check (ausloeser is null or ausloeser in ('nicht_quittiert', 'fehlgeschlagen')),
  warte_sekunden integer,
  kanaele text[],
  an text check (an is null or an in ('empfaenger', 'leitung')),
  aktiv boolean,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_eskalationen_geaendert on bk_kom_eskalationen (geaendert_am);
alter table bk_kom_eskalationen enable row level security;
drop trigger if exists bk_kom_eskalationen_stempel on bk_kom_eskalationen;
create trigger bk_kom_eskalationen_stempel before update on bk_kom_eskalationen for each row execute function bk_abgleich_stempel();

-- Communicator: Anbieter-Zustand
create table if not exists bk_kom_zustand (
  id text primary key default gen_random_uuid()::text,
  anbieter_id text,
  status text check (status is null or status in ('ok', 'gestoert', 'ausgefallen', 'nicht_eingerichtet', 'unbekannt')),
  fehler_folge integer,
  letzter_erfolg timestamptz,
  letzter_fehler timestamptz,
  fehler_text text,
  gesendet_24h integer,
  geprueft_am timestamptz,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_zustand_geaendert on bk_kom_zustand (geaendert_am);
alter table bk_kom_zustand enable row level security;
drop trigger if exists bk_kom_zustand_stempel on bk_kom_zustand;
create trigger bk_kom_zustand_stempel before update on bk_kom_zustand for each row execute function bk_abgleich_stempel();

-- Communicator: Ereignisprotokoll
create table if not exists bk_kom_ereignisse (
  id text primary key default gen_random_uuid()::text,
  zeit timestamptz,
  auftrag_id text,
  art text,
  kanal text,
  anbieter_id text,
  code text,
  text text,
  version integer not null default 1,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geaendert_von text,
  geloescht_am timestamptz
);
create index if not exists bk_kom_ereignisse_geaendert on bk_kom_ereignisse (geaendert_am);
alter table bk_kom_ereignisse enable row level security;
drop trigger if exists bk_kom_ereignisse_stempel on bk_kom_ereignisse;
create trigger bk_kom_ereignisse_stempel before update on bk_kom_ereignisse for each row execute function bk_abgleich_stempel();

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
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_nachricht_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_nachricht_id_fk foreign key (nachricht_id) references bk_nachrichten(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_person_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_nachricht_status_autor_id_fk') then alter table bk_nachricht_status add constraint bk_nachricht_status_autor_id_fk foreign key (autor_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_von_fk') then alter table bk_pinnwand add constraint bk_pinnwand_von_fk foreign key (von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_gelesen_zettel_id_fk') then alter table bk_pinnwand_gelesen add constraint bk_pinnwand_gelesen_zettel_id_fk foreign key (zettel_id) references bk_pinnwand(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_pinnwand_gelesen_person_id_fk') then alter table bk_pinnwand_gelesen add constraint bk_pinnwand_gelesen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_vorlage_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_vorlage_id_fk foreign key (vorlage_id) references bk_genehmigung_vorlagen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_kind_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_kind_id_fk foreign key (kind_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_projekt_id_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_genehmigungen_beantwortet_von_fk') then alter table bk_genehmigungen add constraint bk_genehmigungen_beantwortet_von_fk foreign key (beantwortet_von) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_werk_id_fk') then alter table bk_stimmen add constraint bk_stimmen_werk_id_fk foreign key (werk_id) references bk_werke(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_register_id_fk') then alter table bk_stimmen add constraint bk_stimmen_register_id_fk foreign key (register_id) references bk_register(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_gruppe_id_fk') then alter table bk_stimmen add constraint bk_stimmen_gruppe_id_fk foreign key (gruppe_id) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_stimmen_person_id_fk') then alter table bk_stimmen add constraint bk_stimmen_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufnahmen_projekt_id_fk') then alter table bk_aufnahmen add constraint bk_aufnahmen_projekt_id_fk foreign key (projekt_id) references bk_projekte(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_spenden_person_id_fk') then alter table bk_spenden add constraint bk_spenden_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_zustaendig_id_fk') then alter table bk_aufgaben add constraint bk_aufgaben_zustaendig_id_fk foreign key (zustaendig_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_von_id_fk') then alter table bk_aufgaben add constraint bk_aufgaben_von_id_fk foreign key (von_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_aufgaben_ziel_gruppe_fk') then alter table bk_aufgaben add constraint bk_aufgaben_ziel_gruppe_fk foreign key (ziel_gruppe) references bk_gruppen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_zugaenge_person_id_fk') then alter table bk_zugaenge add constraint bk_zugaenge_person_id_fk foreign key (person_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_versand_an_id_fk') then alter table bk_versand add constraint bk_versand_an_id_fk foreign key (an_id) references bk_personen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_versand_anbieter_id_fk') then alter table bk_versand add constraint bk_versand_anbieter_id_fk foreign key (anbieter_id) references bk_kom_anbieter(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kom_regeln_programm_id_fk') then alter table bk_kom_regeln add constraint bk_kom_regeln_programm_id_fk foreign key (programm_id) references bk_kom_programme(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kom_regeln_vorlage_id_fk') then alter table bk_kom_regeln add constraint bk_kom_regeln_vorlage_id_fk foreign key (vorlage_id) references bk_kom_vorlagen(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kom_routen_anbieter_id_fk') then alter table bk_kom_routen add constraint bk_kom_routen_anbieter_id_fk foreign key (anbieter_id) references bk_kom_anbieter(id) on delete restrict; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bk_kom_zustand_anbieter_id_fk') then alter table bk_kom_zustand add constraint bk_kom_zustand_anbieter_id_fk foreign key (anbieter_id) references bk_kom_anbieter(id) on delete restrict; end if; end $$;

-- Konfiguration (Schlüssel/Wert) und Push-Abos
create table if not exists bk_konfig (schluessel text primary key, wert jsonb, geaendert_am timestamptz not null default now());
alter table bk_konfig enable row level security;
create table if not exists bk_push_abos (id text primary key default gen_random_uuid()::text, person_id text not null references bk_personen(id), endpoint text not null unique, schluessel jsonb not null, erstellt_am timestamptz not null default now());
alter table bk_push_abos enable row level security;
-- Ablage für Dateien (Anhänge, Sprachnachrichten, Noten)
create table if not exists bk_dateien (id text primary key, von text references bk_personen(id), name text not null, mime text not null, groesse integer not null, art text, inhalt bytea, ablage text not null default 'datenbank', erstellt_am timestamptz not null default now(), geloescht_am timestamptz);
alter table bk_dateien enable row level security;
-- Zugangscodes nur als Hash speichern (Spalte code bleibt für die Vorführversion, im Echtbetrieb leer)
alter table bk_zugaenge add column if not exists code_hash text;
create unique index if not exists bk_zugaenge_code_hash on bk_zugaenge (code_hash) where code_hash is not null;
