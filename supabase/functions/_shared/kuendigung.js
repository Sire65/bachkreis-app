// 🚪 0.66.0 Kündigungen auf dem Server wirksam machen – in der Wartung (jede Minute über bk-kom) und auf Knopfdruck der Leitung
// (Aktion kuendigung_vollziehen). Was passiert, rechnet logik.js kuendigungFolgen (dieselbe Funktion wie in der Vorführung).
// Bei „alles“ zusätzlich: alle Sitzungen beenden und Push-Abos abschalten. Kündigungs-Nachweise werden nach 3 Jahren gelöscht.
import { TABELLEN, KUENDIGUNG_NACHWEIS_JAHRE } from "./schema.js";
import { kuendigungFolgen, kuendigungenFaellig, pausenEnde } from "./logik.js";
import { speicherDb } from "./nachrichten.js";

const TABS = ["personen", "zugaenge", "gruppe_zuordnung", "gruppen", "gesundheit", "uebe_ergebnisse", "fv_mitglieder", "genehmigung_vorlagen", "genehmigungen", "kuendigungen"];
const spalten = (tab) => [...new Set(["id", ...[...TABELLEN[tab].felder, ...(TABELLEN[tab].intern || [])].map((f) => f.k), "geaendert_von", "geloescht_am"])];

async function schreiben(db, tab, zeile, wer) {
  const cols = spalten(tab), daten = Object.fromEntries(cols.map((k) => [k, (k === "geaendert_von" ? wer : zeile[k]) ?? null]));
  const upd = cols.filter((k) => k !== "id").map((k) => `${k} = excluded.${k}`).join(", ");
  await db.q(`insert into bk_${tab} (${cols.join(", ")}) select ${cols.join(", ")} from jsonb_populate_record(null::bk_${tab}, $1::jsonb)
    on conflict (id) do update set ${upd}`, [JSON.stringify(daten)]);
  await db.q(`insert into bk_aenderungen (zeit, tabelle, zeile_id, aktion, wer, quelle) values (now(), $1, $2, 'geaendert', $3, 'system')`, [tab, zeile.id, wer]);
}
async function anwenden(db, folgen, wer) {
  for (const f of folgen) {
    await schreiben(db, f.tab, f.zeile, wer);
    if (f.datei) await db.q(`update bk_dateien set inhalt = null, geloescht_am = now() where id = $1 and geloescht_am is null`, [String(f.datei).replace(/^datei:/, "")]);
  }
  const aus = folgen.filter((f) => f.tab === "personen" && f.zeile.status === "ausgetreten").map((f) => f.zeile.id);
  if (aus.length) {
    await db.q(`update bk_sitzungen set widerrufen_am = now() where person_id = any($1::text[]) and widerrufen_am is null`, [aus]);
    await db.q(`update bk_push_abos set aktiv = false, fehler = 'ausgetreten' where person_id = any($1::text[]) and aktiv`, [aus]);
  }
}
// eine Kündigung sofort wirksam machen (Leitung) – nur bestätigte
export async function kuendigungVollziehen(db, id, wer = "Leitung", heute = new Date()) {
  const mdb = await speicherDb(db, TABS), k = mdb.hole("kuendigungen", id);
  if (!k) return { ok: false, fehler: "UNBEKANNT" };
  if (k.status !== "bestaetigt") return { ok: false, fehler: "NICHT_BESTAETIGT" };
  const folgen = kuendigungFolgen(mdb, k, heute);
  await anwenden(db, folgen, wer);
  return { ok: true, zeilen: folgen.length };
}
// Wartung: fällige Kündigungen wirksam machen, Pausen beenden, alte Nachweise löschen
export async function kuendigungenWartung(db, heute = new Date()) {
  const mdb = await speicherDb(db, TABS), faellig = kuendigungenFaellig(mdb, heute);
  for (const k of faellig) await anwenden(db, kuendigungFolgen(mdb, k, heute), "Kündigung");
  const ende = pausenEnde(faellig.length ? await speicherDb(db, TABS) : mdb, heute);
  for (const f of ende) await schreiben(db, f.tab, f.zeile, "Pause beendet");
  const alt = await db.q(`delete from bk_kuendigungen where status in ('vollzogen', 'zurueckgenommen', 'beendet') and zum < current_date - ($1 || ' years')::interval returning id`, [String(KUENDIGUNG_NACHWEIS_JAHRE)]);
  return { vollzogen: faellig.length, pausenEnde: ende.filter((f) => f.tab === "personen").length, nachweiseGeloescht: alt.length };
}
