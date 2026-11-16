-- Bachkreis-App – Nachtrag: ✏️ Änderung erbitten (0.70.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

alter table bk_personen add column if not exists aenderung_bitte jsonb;

