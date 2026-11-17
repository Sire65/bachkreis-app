-- Bachkreis-App – Nachtrag: 🧊 Hänger-Messung mit Fehler-ID (0.75.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

alter table bk_fehlerberichte add column if not exists fehler_id text;
alter table bk_fehlerberichte add column if not exists messung jsonb;

