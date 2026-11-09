// Erzeugt die Supabase-Migration aus der Tabellen-Registry (js/kern/schema.js) – eine Quelle für App, Verwaltung und DB.
// Aufruf: node tools/schema-sql.mjs > supabase/migrations/20261015000000_bk_grundschema.sql
// Der Vertragstest prüft, dass die Migration zum Schema passt.
import { TABELLEN, TABELLEN_NAMEN } from "../js/kern/schema.js";
import { KOM_STANDARD } from "../js/kern/kom-standard.js";

const TYP = { text: "text", lang: "text", email: "text", tel: "text", farbe: "text", datum: "date", zeit: "timestamptz", zahl: "integer", geld: "numeric(10,2)", ja: "boolean", wahl: "text", ref: "text", refs: "text[]", liste: "text[]", json: "jsonb" };
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function erzeugeSql() {
  const z = [];
  z.push("-- Bachkreis-App – Grundschema (automatisch erzeugt aus js/kern/schema.js mit tools/schema-sql.mjs – nicht von Hand ändern)");
  z.push("-- Abgleich-Spalten je Tabelle: id, version, erstellt_am, geaendert_am, geaendert_von, geloescht_am (weiches Löschen).");
  z.push("-- Zugriff ausschließlich über die Edge Function bk-api (Service-Role serverseitig). RLS ist überall aktiv, ohne Policies = für");
  z.push("-- anon/authenticated gesperrt. Feinere Policies folgen mit dem Supabase-Adapter (siehe docs/ARCHITEKTUR.md).");
  z.push("");
  z.push(`create or replace function bk_abgleich_stempel() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.geaendert_am := now();
  return new;
end $$;`);
  z.push("");
  for (const t of TABELLEN_NAMEN) z.push(...tabelleSql(t));
  z.push("-- Fremdschlüssel (nach allen Tabellen, damit die Reihenfolge egal ist)");
  for (const t of TABELLEN_NAMEN) z.push(...fkSql(t));
  z.push("");
  z.push("-- Konfiguration (Schlüssel/Wert) und Push-Abos");
  z.push("create table if not exists bk_konfig (schluessel text primary key, wert jsonb, geaendert_am timestamptz not null default now());");
  z.push("alter table bk_konfig enable row level security;");
  z.push("create table if not exists bk_push_abos (id text primary key default gen_random_uuid()::text, person_id text not null references bk_personen(id), endpoint text not null unique, schluessel jsonb not null, erstellt_am timestamptz not null default now());");
  z.push("alter table bk_push_abos enable row level security;");
  z.push(...DATEIEN_SQL, ...KALENDER_SQL, ...ONLINE_SQL);
  z.push("-- Zugangscodes nur als Hash speichern (Spalte code bleibt für die Vorführversion, im Echtbetrieb leer)");
  z.push("alter table bk_zugaenge add column if not exists code_hash text;");
  z.push("create unique index if not exists bk_zugaenge_code_hash on bk_zugaenge (code_hash) where code_hash is not null;");
  return mitRechten(z.join("\n") + "\n");
}

// Eine Tabelle (Spalten aus der Registry, Abgleich-Spalten, Index, RLS, Versions-Trigger)
function tabelleSql(t) {
  const d = TABELLEN[t], z = [];
  const spalten = [`  id text primary key default gen_random_uuid()::text`];
  for (const f of [...d.felder, ...(d.intern || [])]) {
    let s = `  ${f.k} ${TYP[f.typ] || "text"}`;
    if (f.pflicht) s += " not null";
    if (f.typ === "wahl") s += ` check (${wahlPruefung(f)})`;
    spalten.push(s);
  }
  spalten.push("  version integer not null default 1", "  erstellt_am timestamptz not null default now()", "  geaendert_am timestamptz not null default now()", "  geaendert_von text", "  geloescht_am timestamptz");
  z.push(`-- ${d.titel}`);
  z.push(`create table if not exists bk_${t} (\n${spalten.join(",\n")}\n);`);
  z.push(`create index if not exists bk_${t}_geaendert on bk_${t} (geaendert_am);`);
  z.push(`alter table bk_${t} enable row level security;`);
  z.push(`drop trigger if exists bk_${t}_stempel on bk_${t};`);
  z.push(`create trigger bk_${t}_stempel before update on bk_${t} for each row execute function bk_abgleich_stempel();`);
  z.push("");
  return z;
}
// 0.30.0 (wie KC-SUPABASE-GRANTS): Seit 30.10.2026 vergibt Supabase für neue Tabellen keine Rechte mehr von selbst – ohne grant
// antwortet die Schnittstelle auch dem Server (service_role) mit „permission denied“. Darum nach jeder RLS-Zeile: nichts für public/anon/
// authenticated (die App liest nie direkt), volle Rechte nur für service_role (Edge Functions).
export const mitRechten = (sql) => sql.replace(/^alter table (bk_\w+) enable row level security;$/gm, (m, t) => `${m}\nrevoke all on ${t} from public, anon, authenticated;\ngrant select, insert, update, delete on ${t} to service_role;`);
const wahlPruefung = (f) => `${f.k} is null or ${f.k} in (${Object.keys(f.werte).map(q).join(", ")})`;
function fkSql(t) {
  const z = [];
  for (const f of [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])]) {
    if (f.typ !== "ref") continue;
    const n = `bk_${t}_${f.k}_fk`;
    z.push(`do $$ begin if not exists (select 1 from pg_constraint where conname = ${q(n)}) then alter table bk_${t} add constraint ${n} foreign key (${f.k}) references bk_${f.ref}(id) on delete restrict; end if; end $$;`);
  }
  return z;
}
const komZeile = (t, r) => `insert into bk_${t} select * from jsonb_populate_record(null::bk_${t}, jsonb_build_object('version', 1, 'erstellt_am', now(), 'geaendert_am', now(), 'geaendert_von', 'Standard') || ${q(JSON.stringify(r))}::jsonb) on conflict (id) do nothing;`;

// 📎 Ablage für Anhänge und Noten (nur über bk-api erreichbar, wird nicht abgeglichen). Inhalt hier in der Datenbank – oder im
// Supabase-Speicher (Adapter „storage“, dann bleibt die Spalte inhalt leer).
const DATEIEN_SQL = [
  "-- Ablage für Dateien (Anhänge, Sprachnachrichten, Noten)",
  "create table if not exists bk_dateien (id text primary key, von text references bk_personen(id), name text not null, mime text not null, groesse integer not null, art text, inhalt bytea, ablage text not null default 'datenbank', erstellt_am timestamptz not null default now(), geloescht_am timestamptz);",
  "alter table bk_dateien enable row level security;",
];
const KALENDER_SQL = [
  "-- 📆 Kalender-Abo: nur die Zählnummer je Person (neuer Link = +1, alter ungültig) – der Link selbst wird nie gespeichert",
  "create table if not exists bk_kalender_abos (person_id text primary key references bk_personen(id) on delete cascade, epoche integer not null default 0, zuletzt timestamptz);",
  "alter table bk_kalender_abos enable row level security;",
];
const ONLINE_SQL = [
  "-- 🟢 Wer ist online: nur Zeitpunkt der letzten Meldung je Person (wird nie an Geräte geladen)",
  "create table if not exists bk_online (person_id text primary key references bk_personen(id) on delete cascade, zuletzt timestamptz not null default now(), sichtbar boolean not null default true);",
  "alter table bk_online enable row level security;",
];
// Nachträge für schon eingespielte Datenbanken (das Grundschema legt nur fehlende Tabellen an): neue Tabellen, neue Spalten,
// geänderte Wahl-Prüfungen und neue Communicator-Startwerte – alles wiederholbar. Neue Datenbanken bekommen es doppelt, schadet nicht.
export const NACHTRAEGE = {
  "20261118000000_bk_anrufe.sql": { titel: "📞 Anrufe & Video, 🪑 Runder Tisch, 🛟 Fernhilfe – nur Vermittlung (0.50.0)", tabellen: ["anrufe"], extra: ["create index if not exists bk_anrufe_raum on bk_anrufe (raum_id) where raum_id is not null;"] },
  "20261117000000_bk_feinschliff.sql": { titel: "🎬 Anwesenheit in Sitzungen, 🔎 Protokoll-Prüfung durch den Schriftführer (0.49.0)", tabellen: ["versammlungen", "dokumente"] },
  "20261116000000_bk_versammlungen.sql": { titel: "🎬 Sitzungen & Versammlungen vorbereiten und leiten, 📁 Unterlagen je Familie (0.48.0)", tabellen: ["versammlungen", "unterlagen"] },
  "20261115000000_bk_boerse_jahrbuch.sql": { titel: "🛍️ Bachkreis-Börse (Biete/Suche/Helfer), 📖 Jahrbuch-Momente (0.47.0)", tabellen: ["boerse", "jahrbuch_momente"] },
  "20261114000000_bk_bildschirmfoto.sql": { titel: "📸 Bildschirmfoto an Rückmeldungen (0.46.0)", tabellen: ["rueckmeldungen"] },
  "20261113000000_bk_admin.sql": { titel: "🧑‍💻 Entwickler/Admin, 🩺 Fehlerberichte der Geräte, 📱 App-Version je Gerät (0.43.0)", tabellen: ["fehlerberichte"], extra: ["alter table bk_online add column if not exists version text;"] },
  "20261112000000_bk_rueckmeldung_erstattung.sql": { titel: "🆘 Rückmeldungen zur App, 💶 Erstattungen (Fahrtkosten, Auslagen mit Beleg) (0.42.0)", tabellen: ["rueckmeldungen", "erstattungen"] },
  "20261111000000_bk_vorschlaege.sql": { titel: "💡🗳️ Vorschläge & Abstimmungen (auch geheim), eine Stimme je Person (0.41.0)", tabellen: ["vorschlaege", "vorschlag_stimmen"], extra: ["create unique index if not exists bk_vorschlag_stimmen_einmal on bk_vorschlag_stimmen (vorschlag_id, person_id) where geloescht_am is null;"] },
  "20261110000000_bk_fotoalbum.sql": { titel: "📷 Fotoalbum: Alben (alle / nur Team), Fotos mit markierten Personen (Foto-Einwilligung), Papierkorb (0.40.0)", tabellen: ["fotoalben", "fotos"] },
  "20261109000000_bk_terminumfrage.sql": { titel: "🗳️ Terminumfrage: mögliche Termine ankreuzen, Leitung entscheidet → Termin (0.39.0)", tabellen: ["terminumfragen", "terminumfrage_antworten"] },
  "20261108000000_bk_chat_plus.sql": { titel: "💬 Nachrichten wie KC 2.882: Weiterleiten, @Erwähnungen, Anheften, 🔕 stumm/📦 Archiv/⭐ Favorit je Person, 🔖 Merkliste (0.38.0)", tabellen: ["unterhaltungen", "nachrichten", "chat_einstellungen", "chat_merker"] },
  "20261107000000_bk_chronik_orte.sql": { titel: "🗺️ Chronik mit Auftrittsorten (Stadt, Land, Koordinaten), Jahr nicht mehr Pflicht (0.36.0)", tabellen: ["chronik"], extra: ["alter table bk_chronik alter column jahr drop not null;"] },
  "20261105000000_bk_buero.sql": { titel: "🏢 Büro: Dokumente mit Ordner, Jahr, Text und den Sichtbarkeiten Leitung/Vorstand (0.33.0)", tabellen: ["dokumente"] },
  "20261104000000_bk_zugang.sql": { titel: "Umfrage mit freier Antwort, 📲 wie läuft die App (installiert/Browser/PC) für die Liste „Installiert?“ (0.31.0)", tabellen: ["nachrichten"], extra: ["alter table bk_online add column if not exists modus text;", "alter table bk_online add column if not exists modus_am timestamptz;", "alter table bk_online drop constraint if exists bk_online_modus_check;", "alter table bk_online add constraint bk_online_modus_check check (modus is null or modus in ('installiert', 'browser', 'pc'));"] },
  "20261103000000_bk_startnachricht.sql": { titel: "Startnachricht der Leitung mit Antworten Ja/Später/Nein (0.30.0) + ausdrückliche Rechte für service_role (KC-SUPABASE-GRANTS)", tabellen: ["startnachrichten", "startnachricht_antworten"], extra: ["-- Sicherheitsnetz: alle Bachkreis-Tabellen ausdrücklich für den Server freigeben, für die App-Schlüssel nichts", "do $$ declare t text; begin for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'bk\\_%' loop execute format('revoke all on %I from public, anon, authenticated', t); execute format('grant select, insert, update, delete on %I to service_role', t); end loop; end $$;"] },
  "20261102000000_bk_abgleich.sql": { titel: "Abgleich Internetseite: Austausch & Gastfamilien, Auftrittsanfragen, Chronik, Dokumente, Partner, Dirigier-/Kompositionsversuche (0.27.0)", tabellen: ["projekte", "programm", "gastgeber", "gaeste", "anfragen", "chronik", "dokumente", "partner"] },
  "20261101000000_bk_uebebuehne.sql": { titel: "Übe-Bühne: Aufgaben mit Notenstelle/Rhythmus/Tonleiter/Ton halten/Ohr-Spiel/Material, Ergebnisse, Einwilligung Übe-Aufnahmen (0.26.0)", tabellen: ["uebeaufgaben", "uebe_ergebnisse", "genehmigung_vorlagen"] },
  "20261031000000_bk_pc.sql": { titel: "PC-Verwaltung: Probenplan, Ausleihe von Ausstattung, Interessenten, Helfer- & Dienstplan (0.24.0)", tabellen: ["termine", "ausleihen", "interessenten", "dienste", "nachrichten"], extra: ["alter table bk_ausleihen alter column inventar_id drop not null;"] },
  "20261030000000_bk_mitfahrboerse.sql": { titel: "Mitfahrbörse: Angebote und Gesuche, Zusage (0.23.0)", tabellen: ["mitfahrten"] },
  "20261029000000_bk_extras.sql": { titel: "Mitfahrten, Räume & Schlüssel, Notenexemplare, Mietmaterial/GEMA, Übeaufgaben, Förderverein-Mitglieder, Führungszeugnis, Reparatur/Spende für Ausstattung (0.22.0)", tabellen: ["personen", "reparaturen", "werke", "spenden", "fv_mitglieder", "raeume", "schluessel", "notenexemplare", "uebeaufgaben", "mitfahrten"], extra: ["alter table bk_reparaturen alter column inventar_id drop not null;"] },
  "20261028000000_bk_verein.sql": { titel: "Registerproben, Leihvertrag/Kaution, Eltern ab 18, Konzertprogramm, Reise-Anmeldung, Schuljahres-Regeln (0.21.0)", tabellen: ["personen", "eltern_kind", "gruppen", "ausleihen", "genehmigungen", "projekte", "programm", "reise_anmeldungen"] },
  "20261027000000_bk_schutz.sql": { titel: "Kinderschutz & Datenschutz: Gesundheit & Notfall, Begleitpersonen, Einwilligungen je Zweck, Anwesenheit (0.20.0)", tabellen: ["gesundheit", "projekte", "genehmigung_vorlagen", "antworten"] },
  "20261026000000_bk_inventar.sql": { titel: "Ausstattung & Zubehör, Inventar-Status, Abschreibung, Inventur (0.19.0)", tabellen: ["inventar", "ausstattung"] },
  "20261025000000_bk_termine_online.sql": { titel: "Termine für alle, Teilnahme, eigene Termine, Wer ist online, Anklopfen (0.16.0)", tabellen: ["termine", "antworten", "eigene_termine", "klopfen"], extra: ONLINE_SQL },
  "20261024000000_bk_ueben_kalender.sql": { titel: "Übe-Tagebuch, Übezeiten und Kalender-Abo (0.14.0)", tabellen: ["uebungen", "personen"], extra: KALENDER_SQL },
  "20261023000000_bk_notenarchiv.sql": { titel: "Notenarchiv: Orchester/Klasse, Schwierigkeit, Dauer je Werk (0.13.0)", tabellen: ["werke"] },
  "20261022000000_bk_orchester.sql": { titel: "Gesichter (Avatar) und Soll-Besetzung je Gruppe (0.11.0)", tabellen: ["personen", "gruppen"] },
  "20261021000000_bk_instrumente.sql": { titel: "Instrumentengruppen und Symbole (0.10.0)", tabellen: ["instrument_typen"] },
  "20261020000000_bk_anlagen.sql": { titel: "Anhänge, Sprachnachrichten, Umfragen, Selbstlöschen (0.9.0)", tabellen: ["nachrichten"], extra: DATEIEN_SQL },
  "20261019000000_bk_nachrichten.sql": { titel: "Nachrichten wie in der KC Club App (0.8.0)", tabellen: ["nachrichten", "nachricht_status"],
    pruefungen: [["unterhaltungen", "art"], ["kom_regeln", "ereignis"], ["kom_eskalationen", "ereignis"]], kom: { kom_regeln: ["kr-nachricht_wichtig", "kr-express"] } },
  "20261018000000_bk_pinnwand.sql": { titel: "Pinnwand wie in der KC Club App (0.7.0)", tabellen: ["pinnwand", "pinnwand_gelesen"], pruefungen: [["kom_regeln", "ereignis"], ["kom_eskalationen", "ereignis"]], kom: { kom_regeln: ["kr-pinnwand"] } },
};
export function erzeugeNachtragSql(datei) {
  const n = NACHTRAEGE[datei], z = [`-- Bachkreis-App – Nachtrag: ${n.titel} (automatisch erzeugt mit tools/schema-sql.mjs – nicht von Hand ändern)`, ""];
  const pruefung = (t, f) => [`alter table bk_${t} drop constraint if exists bk_${t}_${f.k}_check;`, `alter table bk_${t} add constraint bk_${t}_${f.k}_check check (${wahlPruefung(f)});`];
  for (const t of n.tabellen) {
    z.push(...tabelleSql(t));
    for (const f of [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])]) {
      z.push(`alter table bk_${t} add column if not exists ${f.k} ${TYP[f.typ] || "text"};`);
      if (f.typ === "wahl") z.push(...pruefung(t, f));
    }
    z.push(...fkSql(t), "");
  }
  for (const [t, k] of n.pruefungen || []) z.push(...pruefung(t, TABELLEN[t].felder.find((f) => f.k === k)));
  if (n.extra) z.push(...n.extra, "");
  for (const [t, ids] of Object.entries(n.kom || {})) for (const id of ids) z.push(komZeile(t, KOM_STANDARD[t].find((r) => r.id === id)));
  return mitRechten(z.join("\n") + "\n");
}

// Startwerte des BK Communicators (js/kern/kom-standard.js). Bestehende Zeilen bleiben unangetastet (on conflict do nothing).
export function erzeugeKomStandardSql() {
  const z = ["-- BK Communicator – Startwerte (automatisch erzeugt aus js/kern/kom-standard.js mit tools/schema-sql.mjs – nicht von Hand ändern)"];
  for (const [t, zeilen] of Object.entries(KOM_STANDARD)) {
    for (const r of zeilen) {
      z.push(komZeile(t, r));
    }
  }
  return z.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(process.argv[2] === "kom" ? erzeugeKomStandardSql() : process.argv[2] === "nachtrag" ? erzeugeNachtragSql(process.argv[3]) : erzeugeSql());
