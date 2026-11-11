-- Bachkreis-App – Nachtrag: 🔑 Genehmigung „eigener App-Zugang“ für Kinder (0.65.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

alter table bk_genehmigung_vorlagen drop constraint if exists bk_genehmigung_vorlagen_zweck_check;
alter table bk_genehmigung_vorlagen add constraint bk_genehmigung_vorlagen_zweck_check check (zweck is null or zweck in ('teilnahme', 'foto_intern', 'foto_website', 'foto_presse', 'foto_social', 'reise', 'leihvertrag', 'gesundheit', 'uebeaufnahmen', 'eigener_zugang', 'sonstiges'));
