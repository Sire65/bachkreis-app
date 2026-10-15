-- Bachkreis-App – Anmeldung & Sitzungen für die Edge Function bk-api (von Hand gepflegt)
create table if not exists bk_sitzungen (
  id text primary key default gen_random_uuid()::text,
  person_id text not null references bk_personen(id),
  token_hash text not null unique,
  art text not null default 'app' check (art in ('app', 'verwaltung')),
  geraet text,
  erstellt_am timestamptz not null default now(),
  zuletzt timestamptz,
  ablauf timestamptz not null,
  widerrufen_am timestamptz
);
create index if not exists bk_sitzungen_person on bk_sitzungen (person_id);
alter table bk_sitzungen enable row level security;

-- Fehlversuche bei der Anmeldung (nur gehashte IP, wird nach 30 Tagen gelöscht)
create table if not exists bk_anmeldeversuche (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ok boolean not null,
  zeit timestamptz not null default now()
);
create index if not exists bk_anmeldeversuche_ip on bk_anmeldeversuche (ip_hash, zeit);
alter table bk_anmeldeversuche enable row level security;

-- Grundeinstellungen (Leitung ändert sie später in der PC-Verwaltung)
insert into bk_konfig (schluessel, wert) values
  ('name', '"Bachkreis Bergkamen"'), ('untertitel', '"Jugendsinfonieorchester"'),
  ('freigabe_grenze_eur', '250'), ('nachfass_tage', '3'), ('schule_telefon', '"02307 964440"'),
  ('notrufe', '[["🚑","Notruf / Rettungsdienst","112"],["🚓","Polizei","110"],["🩺","Ärztlicher Bereitschaftsdienst","116117"],["☠️","Giftnotruf NRW (Bonn)","0228 19240"]]')
on conflict (schluessel) do nothing;
