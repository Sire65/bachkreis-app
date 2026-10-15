-- BK Communicator – Ergänzungen zum Grundschema (von Hand gepflegt). Die Tabellen bk_versand (Aufträge) und bk_kom_*
-- entstehen aus der Tabellen-Registry (Grundschema); hier: Indizes, Push-Abos, zeitgesteuerte Wartung.

-- Aufträge: Idempotenz (Vorgang:Person:Kanal) – derselbe Auftrag entsteht nie zweimal
create unique index if not exists bk_versand_idempotenz on bk_versand (idempotenz) where idempotenz is not null;
create index if not exists bk_versand_faellig on bk_versand (status, naechster_versuch) where status in ('wartend', 'erneut', 'in_arbeit');
create index if not exists bk_versand_korrelation on bk_versand (korrelation);
create index if not exists bk_versand_anbieter on bk_versand (anbieter_id, gesendet_am);
create index if not exists bk_kom_ereignisse_zeit on bk_kom_ereignisse (zeit);

-- Push-Abos je Gerät (Web-Push, VAPID). Verschwundene Abos (404/410 vom Push-Dienst) werden abgeschaltet.
alter table bk_push_abos add column if not exists aktiv boolean not null default true;
alter table bk_push_abos add column if not exists geraet text;
alter table bk_push_abos add column if not exists zuletzt_ok timestamptz;
alter table bk_push_abos add column if not exists fehler text;
create index if not exists bk_push_abos_person on bk_push_abos (person_id) where aktiv;

-- Zeitgesteuerte Wartung jede Minute (Wiederholungen, Eskalationen, Anbieter-Zustand). Nur wenn pg_cron/pg_net
-- verfügbar sind (Supabase: ja; lokale Test-Datenbank: nein). Adresse und Schlüssel der Function stehen im Vault
-- (bk_kom_url, bk_kom_token) – eingetragen von der Function selbst beim Aufruf „einrichten“ (CI, siehe supabase.yml).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net')
     and exists (select 1 from pg_namespace where nspname = 'vault') then
    create extension if not exists pg_cron with schema pg_catalog;
    create extension if not exists pg_net with schema extensions;
    perform cron.unschedule(jobid) from cron.job where jobname = 'bk-kom-wartung';
    perform cron.schedule('bk-kom-wartung', '* * * * *', $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'bk_kom_url'),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-bk-planer', (select decrypted_secret from vault.decrypted_secrets where name = 'bk_kom_token')),
        body := '{"aufgabe":"wartung"}'::jsonb,
        timeout_milliseconds := 55000)
      where exists (select 1 from vault.decrypted_secrets where name = 'bk_kom_url')
    $job$);
  end if;
end $$;
