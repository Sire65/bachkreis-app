-- Bachkreis-App – Nachtrag: 🧭 Kachel-Nutzung – anonym gezählt (0.76.0) (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)

create table if not exists bk_kachel_nutzung (tag date not null, kachel text not null, anzahl integer not null default 0, primary key (tag, kachel));
comment on table bk_kachel_nutzung is 'Wie oft wurde welche Kachel geöffnet – je Tag, ohne Person (0.76.0, Auswertungen)';
alter table bk_kachel_nutzung enable row level security;
revoke all on bk_kachel_nutzung from public, anon, authenticated;
grant select, insert, update, delete on bk_kachel_nutzung to service_role;

