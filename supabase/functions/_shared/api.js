// Kern der Edge Function bk-api – unabhängig von der Datenbank-Anbindung (Deno: postgres.js, Tests: PGlite).
// db.q(sqlText, params) → Array von Zeilen. Alle Datensätze laufen als JSON (to_jsonb / jsonb_populate_record).
//
// Aktionen:  anmelden {code, verwaltung?} · laden {seit?} · speichern {tab, zeilen[]} · versenden {…} · abmelden
//            push_schluessel · push_abo · push_ab · push_status · quittieren · kom_test · kom_wartung (BK Communicator)
// Anmeldung: persönlicher Zugangscode (QR-Link) → Sitzung (Token; in der DB nur als SHA-256-Hash).
import { TABELLEN, TABELLEN_NAMEN, pwEmpfaenger } from "./schema.js";
import { kontext, filtern, schreibPruefung } from "./regeln.js";
import { sha256, zufallsToken } from "./krypto.js";
import * as kom from "./kom/kern.js";

const SITZUNG_TAGE = 180;
const MAX_FEHLVERSUCHE = 20; // je IP in 15 Minuten
const UEBERLAPPUNG_MS = 5000; // Abgleich: kleine Überlappung gegen gleichzeitige Transaktionen

export { sha256 };
const spalten = (tab) => [...TABELLEN[tab].felder, ...(TABELLEN[tab].intern || [])].map((f) => f.k);
const fehler = (status, code, extra = {}) => ({ status, json: { ok: false, fehler: code, ...extra } });
const name = (p) => `${p?.vorname || ""} ${p?.nachname || ""}`.trim() || "Unbekannt";

async function alleZeilen(db, tab) {
  return (await db.q(`select to_jsonb(t) as z from bk_${tab} t`)).map((r) => r.z);
}
async function kontextLaden(db, person) {
  const noetig = ["eltern_kind", "gruppe_zuordnung", "person_instrument", "ausleihen", "termine", "unterhaltungen", "pinnwand", "personen"];
  const alle = {};
  for (const t of noetig) alle[t] = await alleZeilen(db, t);
  return kontext(person, alle);
}

// ---------- Sitzung ----------
async function sitzungPruefen(db, token) {
  if (!token) return null;
  const h = await sha256(token);
  const r = await db.q(
    `select to_jsonb(p) as p, s.id as sid from bk_sitzungen s join bk_personen p on p.id = s.person_id
     where s.token_hash = $1 and s.ablauf > now() and s.widerrufen_am is null and p.geloescht_am is null`, [h]);
  if (!r.length) return null;
  await db.q(`update bk_sitzungen set zuletzt = now() where id = $1`, [r[0].sid]);
  return { person: r[0].p, sid: r[0].sid };
}

async function anmelden(db, body, meta) {
  const ipHash = await sha256("ip:" + (meta.ip || "unbekannt"));
  const zuViele = await db.q(`select count(*)::int as n from bk_anmeldeversuche where ip_hash = $1 and ok = false and zeit > now() - interval '15 minutes'`, [ipHash]);
  if (zuViele[0].n >= MAX_FEHLVERSUCHE) return fehler(429, "ZU_VIELE_VERSUCHE");
  const code = String(body.code || "").trim().toUpperCase();
  const treffer = code.length >= 6 ? await db.q(
    `select to_jsonb(z) as z, to_jsonb(p) as p from bk_zugaenge z join bk_personen p on p.id = z.person_id
     where z.code_hash = $1 and z.aktiv is true and z.geloescht_am is null and p.geloescht_am is null`, [await sha256(code)]) : [];
  await db.q(`insert into bk_anmeldeversuche (ip_hash, ok) values ($1, $2)`, [ipHash, treffer.length > 0]);
  if (!treffer.length) return fehler(401, "CODE_UNGUELTIG");
  const { z, p } = treffer[0];
  if (body.verwaltung && !z.verwaltung) return fehler(403, "KEIN_VERWALTUNGSRECHT");
  const token = zufallsToken();
  await db.q(`insert into bk_sitzungen (person_id, token_hash, art, ablauf, geraet) values ($1, $2, $3, now() + ($4 || ' days')::interval, $5)`,
    [p.id, await sha256(token), body.verwaltung ? "verwaltung" : "app", String(SITZUNG_TAGE), String(meta.geraet || "").slice(0, 200)]);
  await db.q(`update bk_zugaenge set zuletzt = now() where id = $1`, [z.id]);
  return { status: 200, json: { ok: true, token, person: p, verwaltung: !!z.verwaltung } };
}

// ---------- Laden (Delta-Abgleich) ----------
async function laden(db, s, body) {
  const ctx = await kontextLaden(db, s.person);
  const jetzt = (await db.q(`select now() as t`))[0].t;
  const seit = body.seit ? new Date(new Date(body.seit).getTime() - UEBERLAPPUNG_MS).toISOString() : null;
  const daten = {};
  for (const tab of TABELLEN_NAMEN) {
    // Protokoll-Tabellen (Versand, Communicator-Ereignisse) nur die letzten Tage – sonst wächst jedes Gerät endlos
    const tage = TABELLEN[tab].aufbewahrung_tage;
    const frist = tage ? ` and t.zeit > now() - interval '${Number(tage)} days'` : "";
    const zeilen = seit
      ? (await db.q(`select to_jsonb(t) as z from bk_${tab} t where t.geaendert_am > $1::timestamptz${frist}`, [seit])).map((r) => r.z)
      : (await db.q(`select to_jsonb(t) as z from bk_${tab} t where true${frist}`)).map((r) => r.z);
    // Beim Komplett-Laden gelöschte Zeilen weglassen; beim Delta mitschicken, damit Geräte sie entfernen
    const sichtbar = filtern(tab, seit ? zeilen : zeilen.filter((z) => !z.geloescht_am), ctx);
    if (sichtbar.length || !seit) daten[tab] = sichtbar;
  }
  const konfig = Object.fromEntries((await db.q(`select schluessel, wert from bk_konfig`)).map((r) => [r.schluessel, r.wert]));
  return { status: 200, json: { ok: true, jetzt: new Date(jetzt).toISOString(), komplett: !seit, daten, konfig, ich: s.person.id } };
}

// ---------- Speichern ----------
async function speichern(db, s, body) {
  const tab = String(body.tab || "");
  if (!TABELLEN[tab]) return fehler(400, "UNBEKANNTE_TABELLE");
  const zeilen = Array.isArray(body.zeilen) ? body.zeilen.slice(0, 500) : [];
  const ctx = await kontextLaden(db, s.person);
  const cols = ["id", ...spalten(tab).filter((k) => k !== "id"), "geaendert_von", "geloescht_am"];
  if (tab === "zugaenge") cols.push("code_hash");
  const gespeichert = [], konflikte = [];
  for (const neuRoh of zeilen) {
    if (!neuRoh || typeof neuRoh !== "object") continue;
    const { basis_version, ...neu } = neuRoh;
    const altR = neu.id ? await db.q(`select to_jsonb(t) as z from bk_${tab} t where id = $1`, [neu.id]) : [];
    const alt = altR[0]?.z || null;
    const p = schreibPruefung(tab, neu, alt, ctx);
    if (!p.ok) { konflikte.push({ id: neu.id, grund: p.grund, zeile: alt ? filtern(tab, [alt], ctx)[0] || null : null }); continue; }
    if (alt && basis_version != null && alt.version !== basis_version && !p.zusammenfuehren) {
      konflikte.push({ id: neu.id, grund: "VERSION", zeile: filtern(tab, [alt], ctx)[0] || null }); continue;
    }
    const z = { ...p.zeile, geaendert_von: name(s.person) };
    if (tab === "zugaenge" && z.code) { z.code_hash = await sha256(String(z.code).trim().toUpperCase()); z.code = null; }
    if (tab === "zugaenge" && !z.code && alt?.code_hash && !z.code_hash) z.code_hash = alt.code_hash;
    if (!z.id) z.id = crypto.randomUUID();
    const daten = Object.fromEntries(cols.map((k) => [k, z[k] ?? null]));
    const upd = cols.filter((k) => k !== "id").map((k) => `${k} = excluded.${k}`).join(", ");
    const r = await db.q(
      `insert into bk_${tab} (${cols.join(", ")}) select ${cols.join(", ")} from jsonb_populate_record(null::bk_${tab}, $1::jsonb)
       on conflict (id) do update set ${upd} returning to_jsonb(bk_${tab}.*) as z`, [JSON.stringify(daten)]);
    const zeile = r[0].z;
    if (tab === "pinnwand") ctx.pw.set(zeile.id, zeile); // mehrere Zettel in einem Rutsch: Grenze und Farben stimmen weiter
    await db.q(`insert into bk_aenderungen (zeit, tabelle, zeile_id, aktion, wer, quelle) values (now(), $1, $2, $3, $4, $5)`,
      [tab, zeile.id, z.geloescht_am && !alt?.geloescht_am ? "geloescht" : alt ? "geaendert" : "neu", name(s.person), body.quelle === "verwaltung" ? "verwaltung" : "app"]);
    gespeichert.push(filtern(tab, [zeile], ctx)[0] || { id: zeile.id, version: zeile.version });
  }
  return { status: konflikte.length && !gespeichert.length ? 409 : 200, json: { ok: konflikte.length === 0, gespeichert, konflikte } };
}

// ---------- Versand über den BK Communicator ----------
// Rechte: Verwalter senden an beliebige Personen. Schüler/Eltern nur Chat-Nachrichten an Mitglieder einer sichtbaren
// Unterhaltung, Instrumenten-Meldungen nur an Verwalter, und den Test nur an sich selbst. Priorität bestimmt die Regel.
const VERWALTER_ROLLEN = ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"];
async function versenden(db, s, body, dienste) {
  const ctx = await kontextLaden(db, s.person);
  let an = Array.isArray(body.an) ? body.an.map(String).slice(0, 2000) : [];
  const ereignis = String(body.ereignis || "standard");
  let korrelation = body.korrelation;
  if (ereignis === "pinnwand") {
    // BK-PINNWAND: Bescheid nur durch den Verfasser, Empfänger bestimmt der Server aus dem Zettel – je Zettel (und „jetzt wichtig“) nur einmal
    const z = ctx.pw.get(String(body.zettel_id || ""));
    if (!z || z.geloescht_am || z.von !== ctx.ich || z.fuer === "ich") return fehler(403, "KEIN_VERSANDRECHT");
    korrelation = `pinnwand:${z.id}${body.wichtig ? ":wichtig" : ""}`;
    if ((await db.q(`select 1 from bk_versand where korrelation = $1 limit 1`, [korrelation])).length) return { status: 200, json: { ok: true, schon: true, auftraege: 0 } };
    const fertig = new Set(body.wichtig ? (await db.q(`select person_id from bk_pinnwand_gelesen where zettel_id = $1 and erledigt_am is not null and geloescht_am is null`, [z.id])).map((r) => r.person_id) : []);
    an = pwEmpfaenger(z, ctx.personen).filter((id) => !fertig.has(id));
  } else if (!ctx.istVerwalter) {
    if (ereignis === "nachricht") {
      if (!ctx.unterhaltungen.has(body.unterhaltung_id)) return fehler(403, "KEIN_VERSANDRECHT");
      const u = (await db.q(`select to_jsonb(u) as z from bk_unterhaltungen u where id = $1`, [body.unterhaltung_id]))[0]?.z;
      an = [...(u?.mitglieder || [])];
      const [art, gid] = String(u?.verteiler || "").split(":");
      if (art === "gruppe" && gid) an.push(...(await db.q(`select person_id from bk_gruppe_zuordnung where gruppe_id = $1 and geloescht_am is null`, [gid])).map((r) => r.person_id));
      an = an.filter((p) => p !== ctx.ich);
    } else if (ereignis === "instrument") {
      an = (await db.q(`select id from bk_personen where id = any($1::text[]) and geloescht_am is null and rollen && $2::text[]`, [an, VERWALTER_ROLLEN])).map((r) => r.id);
    } else return fehler(403, "KEIN_VERSANDRECHT");
  }
  const r = await kom.annehmen(db, {
    ereignis, an, betreff: body.betreff, text: body.text, kanaele: body.kanaele, korrelation, ausloeser: name(s.person),
    prioritaet: ctx.istVerwalter ? body.prioritaet : undefined, variablen: { absender_person: name(s.person) },
  });
  if (r.ok && dienste.adapter) dienste.hintergrund(kom.zustellen(db, dienste.adapter, dienste.umgebung, { korrelation: r.korrelation, limit: 100 }).catch((e) => console.error("bk-kom zustellen", e)));
  return { status: 200, json: { ...r, vorgemerkt: r.auftraege } };
}

// Push-Abo dieses Geräts speichern (Web-Push, VAPID). Der öffentliche Schlüssel kommt vom Server.
async function pushAbo(db, s, body) {
  const a = body.abo || {};
  const endpoint = String(a.endpoint || "");
  if (!/^https:\/\//.test(endpoint) || !a.keys?.p256dh || !a.keys?.auth) return fehler(400, "ABO_UNGUELTIG");
  await db.q(`insert into bk_push_abos (person_id, endpoint, schluessel, aktiv, geraet) values ($1, $2, $3::jsonb, true, $4)
    on conflict (endpoint) do update set person_id = excluded.person_id, schluessel = excluded.schluessel, aktiv = true, fehler = null, geraet = excluded.geraet`,
    [s.person.id, endpoint.slice(0, 1000), JSON.stringify({ p256dh: String(a.keys.p256dh), auth: String(a.keys.auth) }), String(body.geraet || "").slice(0, 200)]);
  return { status: 200, json: { ok: true } };
}

// dienste (nur Edge Function/Tests): { adapter, umgebung: { appUrl, quittungUrl, vapidPublic }, hintergrund(promise) }
export async function verarbeiten(db, body, meta = {}, dienste = {}) {
  dienste = { umgebung: {}, hintergrund: (p) => p, ...dienste };
  try {
    const aktion = String(body?.aktion || "");
    if (aktion === "anmelden") return await anmelden(db, body, meta);
    const s = await sitzungPruefen(db, meta.token);
    if (!s) return fehler(401, "NICHT_ANGEMELDET");
    if (aktion === "laden") return await laden(db, s, body);
    if (aktion === "speichern") return await speichern(db, s, body);
    if (aktion === "versenden") return await versenden(db, s, body, dienste);
    if (aktion === "push_schluessel") return { status: 200, json: { ok: !!dienste.umgebung.vapidPublic, schluessel: dienste.umgebung.vapidPublic || null } };
    if (aktion === "push_abo") return await pushAbo(db, s, body);
    if (aktion === "push_ab") { await db.q(`update bk_push_abos set aktiv = false, fehler = 'abgemeldet' where endpoint = $1 and person_id = $2`, [String(body.endpoint || ""), s.person.id]); return { status: 200, json: { ok: true } }; }
    if (aktion === "push_status") { const r = await db.q(`select count(*)::int as n from bk_push_abos where person_id = $1 and aktiv`, [s.person.id]); return { status: 200, json: { ok: true, geraete: r[0].n, schluessel: !!dienste.umgebung.vapidPublic } }; }
    if (aktion === "quittieren") return { status: 200, json: { ok: await kom.quittierenPerson(db, body.korrelation, s.person.id) } };
    if (aktion === "kom_test") {
      const r = await kom.annehmen(db, { ereignis: "test", an: [s.person.id], betreff: "Test vom Bachkreis", text: String(body.text || "Wenn du das liest, funktioniert der BK Communicator. 🎻").slice(0, 500), kanaele: body.kanaele, ausloeser: name(s.person) });
      const z = dienste.adapter ? await kom.zustellen(db, dienste.adapter, dienste.umgebung, { korrelation: r.korrelation, limit: 10 }) : null;
      return { status: 200, json: { ...r, zustellung: z } };
    }
    if (aktion === "kom_wartung") {
      if (!(s.person.rollen || []).some((r) => r === "leitung" || r === "admin")) return fehler(403, "NUR_LEITUNG");
      if (!dienste.adapter) return fehler(503, "KEIN_VERSAND");
      return { status: 200, json: { ok: true, bericht: await kom.wartung(db, dienste.adapter, dienste.umgebung) } };
    }
    if (aktion === "konfig_setzen") {
      if (!(s.person.rollen || []).some((r) => r === "leitung" || r === "admin")) return fehler(403, "NUR_LEITUNG");
      const k = String(body.schluessel || "");
      if (!/^[a-z_]{2,40}$/.test(k)) return fehler(400, "SCHLUESSEL_UNGUELTIG");
      await db.q(`insert into bk_konfig (schluessel, wert, geaendert_am) values ($1, $2::jsonb, now()) on conflict (schluessel) do update set wert = excluded.wert, geaendert_am = now()`, [k, JSON.stringify(body.wert ?? null)]);
      return { status: 200, json: { ok: true } };
    }
    if (aktion === "abmelden_andere") { // ⚙️ Mehr › Privatsphäre: alle anderen Geräte abmelden
      const r = await db.q(`update bk_sitzungen set widerrufen_am = now() where person_id = $1 and id <> $2 and widerrufen_am is null returning id`, [s.person.id, s.sid]);
      return { status: 200, json: { ok: true, anzahl: r.length } };
    }
    if (aktion === "abmelden") { await db.q(`update bk_sitzungen set widerrufen_am = now() where id = $1`, [s.sid]); return { status: 200, json: { ok: true } }; }
    return fehler(400, "UNBEKANNTE_AKTION");
  } catch (e) {
    console.error("bk-api", e);
    return fehler(500, "SERVERFEHLER");
  }
}
