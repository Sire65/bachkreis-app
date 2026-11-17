-- Bachkreis-App – Nachtrag: 📱 Liest lieber WhatsApp (0.75.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

alter table bk_personen add column if not exists whatsapp_lieber boolean;

