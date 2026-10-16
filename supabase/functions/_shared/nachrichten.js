// BK-NACHRICHTEN auf dem Server: Empfänger einer Unterhaltung bestimmen, Bescheid über den BK Communicator geben und
// ⏰ geplante Nachrichten zur Sendezeit freigeben (auch Wiederholungen). Läuft in bk-api (Bescheid) und bk-kom (jede Minute).
import { TABELLEN } from "./schema.js";
import { empfaengerVon, naechsteSendung, nachrichtEreignis, nachrichtKurz } from "./logik.js";
import * as kom from "./kom/kern.js";

const VERTEILER_TABELLEN = ["personen", "gruppe_zuordnung", "gruppen", "eltern_kind", "person_instrument", "termine", "projekte", "register"];
// Kleine Daten-Fassade (liste/hole/konfig) über PostgreSQL, damit logik.js auch auf dem Server rechnen kann
export async function speicherDb(db, tabellen = VERTEILER_TABELLEN) {
  const daten = {};
  for (const t of tabellen) daten[t] = (await db.q(`select to_jsonb(t) as z from bk_${t} t where t.geloescht_am is null`)).map((r) => r.z);
  const konfig = Object.fromEntries((await db.q(`select schluessel, wert from bk_konfig`)).map((r) => [r.schluessel, r.wert]));
  return { liste: (t, f) => (daten[t] || []).filter((z) => !f || f(z)), hole: (t, id) => (daten[t] || []).find((z) => z.id === id) || null, konfig: () => konfig };
}
export async function unterhaltungEmpfaenger(db, u, mdb = null) {
  if (!u) return [];
  if (!u.verteiler) return [...new Set(u.mitglieder || [])];
  return empfaengerVon(mdb || (await speicherDb(db)), u);
}
const kurz = (t, n) => { const x = [...String(t || "")]; return x.length > n ? x.slice(0, n - 1).join("") + "…" : x.join(""); };
// Bescheid zu einer Nachricht (je Nachricht nur einmal – Korrelation „nachricht:<id>“)
export async function nachrichtBescheid(db, n, { ausloeser = "", kanaele = null, mdb = null } = {}) {
  const korrelation = `nachricht:${n.id}`;
  if ((await db.q(`select 1 from bk_versand where korrelation = $1 limit 1`, [korrelation])).length) return { ok: true, schon: true, auftraege: 0 };
  const u = (await db.q(`select to_jsonb(u) as z from bk_unterhaltungen u where id = $1`, [n.unterhaltung_id]))[0]?.z;
  const an = (await unterhaltungEmpfaenger(db, u, mdb)).filter((p) => p !== n.von);
  const von = (await db.q(`select vorname, nachname from bk_personen where id = $1`, [n.von]))[0];
  const wer = von ? `${von.vorname} ${von.nachname}`.trim() : ausloeser || "Bachkreis";
  const kopf = n.express ? `🏎️ EXPRESS von ${wer}` : n.wichtig ? `❗ Wichtig: ${wer}` : wer;
  return kom.annehmen(db, { ereignis: nachrichtEreignis(n, u), an, betreff: u?.art === "einzel" ? kopf : `${kopf} · ${u?.titel || "Chat"}`, text: kurz(nachrichtKurz(n), 500),
    kanaele: kanaele || (n.kanaele?.length ? n.kanaele : null), korrelation, ausloeser: ausloeser || wer, variablen: { absender_person: wer, unterhaltung: n.unterhaltung_id } });
}
// ⏰ Fällige geplante Nachrichten freigeben: Sendezeit erreicht → für alle sichtbar (geplant_frei), Bescheid, nächste Wiederholung anlegen
export async function nachrichtenFreigeben(db, { limit = 100 } = {}) {
  const faellig = (await db.q(`select to_jsonb(n) as z from bk_nachrichten n where geplant_um is not null and geplant_frei is null and geplant_um <= now()
    and geloescht_am is null and zurueckgezogen_am is null order by geplant_um limit $1`, [limit])).map((r) => r.z);
  const cols = ["id", ...[...TABELLEN.nachrichten.felder, ...TABELLEN.nachrichten.intern].map((f) => f.k), "geaendert_von"];
  let mdb = null, gesendet = 0;
  for (const n of faellig) {
    const r = await db.q(`update bk_nachrichten set geplant_frei = now(), zeit = geplant_um, geaendert_von = 'Zeitplan' where id = $1 and geplant_frei is null returning id`, [n.id]);
    if (!r.length) continue; // schon von einem parallelen Lauf erledigt
    const weiter = naechsteSendung(n.geplant_um, n.wiederholung);
    if (weiter) {
      const neu = { ...n, id: crypto.randomUUID(), geplant_um: weiter, zeit: weiter, geplant_frei: null, gelesen_von: [n.von], reaktionen: {}, rueckmeldungen: {}, bearbeitet_am: null, geaendert_von: "Zeitplan" };
      await db.q(`insert into bk_nachrichten (${cols.join(", ")}) select ${cols.join(", ")} from jsonb_populate_record(null::bk_nachrichten, $1::jsonb)`, [JSON.stringify(Object.fromEntries(cols.map((k) => [k, neu[k] ?? null])))]);
    }
    mdb ||= await speicherDb(db);
    await nachrichtBescheid(db, { ...n, zeit: n.geplant_um }, { ausloeser: "Zeitplan", mdb }).catch((e) => console.error("geplant bescheid", e));
    gesendet++;
  }
  return { faellig: faellig.length, gesendet };
}
// ⏳ Selbstlöschen (KC-CLUB-SELBSTLOESCHEN): abgelaufene Nachrichten bei allen leeren („Diese Nachricht wurde gelöscht“), ihre Dateien entfernen
export async function nachrichtenAufraeumen(db, ablage, { limit = 200 } = {}) {
  const weg = (await db.q(`update bk_nachrichten set text = '', zurueckgezogen_am = now(), reaktionen = '{}'::jsonb, umfrage = null, umfrage_stimmen = '{}'::jsonb,
      anlagen = '[]'::jsonb, geaendert_von = 'Selbstlöschen'
    where id in (select id from bk_nachrichten where loescht_am is not null and loescht_am <= now() and zurueckgezogen_am is null and geloescht_am is null limit $1)
    returning id`, [limit]));
  // Dateien, auf die keine sichtbare Nachricht und keine Stimme mehr zeigt, nach 1 Tag aufräumen (auch abgebrochene Uploads)
  const verwaist = await db.q(`select d.id from bk_dateien d where d.geloescht_am is null and d.erstellt_am < now() - interval '1 day'
    and not exists (select 1 from bk_nachrichten n where n.anlagen @> jsonb_build_array(jsonb_build_object('id', d.id)) and n.geloescht_am is null)
    and not exists (select 1 from bk_stimmen s where s.datei = 'datei:' || d.id and s.geloescht_am is null) limit 100`);
  for (const d of verwaist) { await ablage.loeschen(db, d.id); await db.q(`update bk_dateien set geloescht_am = now() where id = $1`, [d.id]); }
  return { geleert: weg.length, dateien: verwaist.length };
}
