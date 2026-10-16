// Kern der Edge Function bk-api – unabhängig von der Datenbank-Anbindung (Deno: postgres.js, Tests: PGlite).
// db.q(sqlText, params) → Array von Zeilen. Alle Datensätze laufen als JSON (to_jsonb / jsonb_populate_record).
//
// Aktionen:  anmelden {code, verwaltung?} · laden {seit?} · speichern {tab, zeilen[]} · versenden {…} · abmelden
//            push_schluessel · push_abo · push_ab · push_status · quittieren · kom_test · kom_wartung (BK Communicator)
// Anmeldung: persönlicher Zugangscode (QR-Link) → Sitzung (Token; in der DB nur als SHA-256-Hash).
import { TABELLEN, TABELLEN_NAMEN, pwEmpfaenger, CHAT, DATEI, nachrichtFrei, nachrichtAbgelaufen, onlineErlaubt, chatPartnerErlaubt } from "./schema.js";
import { ABLAGE_DATENBANK } from "./ablage.js";
import { nachrichtBescheid } from "./nachrichten.js";
import { kontext, filtern, schreibPruefung } from "./regeln.js";
import { sha256, zufallsToken, hmac, gleich } from "./krypto.js";
import { termineFuer, ics, eigeneVorkommen } from "./logik.js";
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
  // Alles, was die Regeln brauchen (regeln.js kontext): Begleitpersonen/Anmeldung (projekte, reise_anmeldungen), Textfassung (genehmigung_vorlagen)
  const noetig = ["eltern_kind", "gruppe_zuordnung", "person_instrument", "ausleihen", "termine", "terminarten", "unterhaltungen", "pinnwand", "personen", "projekte", "genehmigung_vorlagen", "reise_anmeldungen", "uebeaufgaben", "mitfahrten", "genehmigungen", "gastgeber"];
  const alle = {};
  for (const t of noetig) alle[t] = await alleZeilen(db, t);
  const ctx = kontext(person, alle);
  ctx.konfig = Object.fromEntries((await db.q(`select schluessel, wert from bk_konfig`)).map((r) => [r.schluessel, r.wert]));
  ctx.expressMax = Number(ctx.konfig.express_max_tag) > 0 ? Number(ctx.konfig.express_max_tag) : CHAT.expressMax;
  ctx.bearbeitenMin = Number(ctx.konfig.bearbeiten_minuten) > 0 ? Number(ctx.konfig.bearbeiten_minuten) : CHAT.bearbeitenMin;
  ctx.expressHeute = (await db.q(`select count(*)::int as n from bk_nachrichten where von = $1 and express is true and zeit > now() - interval '1 day' and geloescht_am is null`, [person.id]))[0].n;
  return ctx;
}

// ---------- Sitzung ----------
async function sitzungPruefen(db, token) {
  if (!token) return null;
  const h = await sha256(token);
  const r = await db.q(
    `select to_jsonb(p) as p, s.id as sid from bk_sitzungen s join bk_personen p on p.id = s.person_id
     where s.token_hash = $1 and s.ablauf > now() and s.widerrufen_am is null and p.geloescht_am is null and p.status is distinct from 'ausgetreten'`, [h]);
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
     where z.code_hash = $1 and z.aktiv is true and z.geloescht_am is null and p.geloescht_am is null and p.status is distinct from 'ausgetreten'`, [await sha256(code)]) : [];
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
  // ✓✓-Status braucht die Nachricht (Absender, Unterhaltung, Express) – einmal für alle Zeilen holen
  if (tab === "nachricht_status") {
    const ids = [...new Set(zeilen.map((z) => String(z?.nachricht_id || "")))];
    ctx.nMap = new Map((await db.q(`select to_jsonb(n) as z from bk_nachrichten n where id = any($1::text[])`, [ids])).map((r) => [r.z.id, r.z]));
  }
  // 📎 Anhänge: welche der genannten Dateien hat diese Person hochgeladen bzw. darf sie als Noten weitergeben?
  if (tab === "nachrichten") {
    const ids = [...new Set(zeilen.flatMap((z) => (Array.isArray(z?.anlagen) ? z.anlagen : []).map((a) => String(a?.id || "")).filter(Boolean)))];
    ctx.dateien = new Map((ids.length ? await db.q(`select id, von, mime, groesse from bk_dateien where id = any($1::text[]) and geloescht_am is null`, [ids]) : []).map((d) => [d.id, d]));
    ctx.notenDateien = new Set();
    if (ids.length) {
      const st = (await db.q(`select to_jsonb(s) as z from bk_stimmen s where datei = any($1::text[]) and geloescht_am is null`, [ids.map((i) => "datei:" + i)])).map((r) => r.z);
      for (const z of filtern("stimmen", st, ctx)) ctx.notenDateien.add(String(z.datei).slice(6));
    }
  }
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
    if (tab === "unterhaltungen") { ctx.unterhaltungen.add(zeile.id); ctx.uMap.set(zeile.id, zeile); }
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
  if (body.nachricht_id) {
    // BK-NACHRICHTEN: Bescheid zu einer eigenen Nachricht – Empfänger, Ereignis (❗/🏎️) und Kanäle bestimmt der Server, je Nachricht einmal
    const n = (await db.q(`select to_jsonb(n) as z from bk_nachrichten n where id = $1`, [String(body.nachricht_id)]))[0]?.z;
    if (!n || n.von !== ctx.ich || n.geloescht_am || n.zurueckgezogen_am || !ctx.unterhaltungen.has(n.unterhaltung_id) || !nachrichtFrei(n)) return fehler(403, "KEIN_VERSANDRECHT");
    const r = await nachrichtBescheid(db, n, { ausloeser: name(s.person), kanaele: Array.isArray(body.kanaele) && body.kanaele.length ? body.kanaele : null });
    if (r.ok && !r.schon && dienste.adapter) dienste.hintergrund(kom.zustellen(db, dienste.adapter, dienste.umgebung, { korrelation: r.korrelation, limit: 200 }).catch((e) => console.error("bk-kom zustellen", e)));
    return { status: 200, json: { ...r, vorgemerkt: r.auftraege } };
  }
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

// ---------- 📎 Dateien: hochladen (nur angemeldet, Art und Größe geprüft) und holen (nur wer sie sehen darf) ----------
async function dateiHochladen(db, s, body, ablage) {
  // eslint-disable-next-line no-control-regex -- Steuerzeichen in Dateinamen bewusst ersetzen
  const name = String(body.name || "Datei").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120), mime = String(body.mime || "").toLowerCase().split(";")[0];
  const b64 = String(body.daten || "");
  if (!DATEI.mime.test(mime)) return fehler(400, "DATEIART_NICHT_ERLAUBT");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || !b64.length) return fehler(400, "DATEI_UNGUELTIG");
  const groesse = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (groesse > DATEI.max) return fehler(413, "DATEI_ZU_GROSS");
  const heute = (await db.q(`select coalesce(sum(groesse), 0)::bigint as n from bk_dateien where von = $1 and erstellt_am > now() - interval '1 day'`, [s.person.id]))[0].n;
  if (Number(heute) + groesse > 100 * 1024 * 1024) return fehler(429, "TAGESGRENZE_DATEIEN");
  const id = crypto.randomUUID(), art = DATEI.arten.includes(body.art) ? body.art : "datei";
  await db.q(`insert into bk_dateien (id, von, name, mime, groesse, art) values ($1, $2, $3, $4, $5, $6)`, [id, s.person.id, name, mime, groesse, art]);
  try { await ablage.speichern(db, id, b64, mime); } catch (e) { await db.q(`delete from bk_dateien where id = $1`, [id]); throw e; }
  return { status: 200, json: { ok: true, id, name, mime, groesse } };
}
async function dateiHolen(db, s, body, ablage) {
  const id = String(body.id || "");
  const d = (await db.q(`select id, von, name, mime, groesse from bk_dateien where id = $1 and geloescht_am is null`, [id]))[0];
  if (!d) return fehler(404, "DATEI_FEHLT");
  let darf = d.von === s.person.id;
  if (!darf) {
    const ctx = await kontextLaden(db, s.person);
    const jetzt = new Date().toISOString();
    const ns = (await db.q(`select to_jsonb(n) as z from bk_nachrichten n where anlagen @> $1::jsonb and geloescht_am is null and zurueckgezogen_am is null`, [JSON.stringify([{ id }])])).map((r) => r.z);
    darf = filtern("nachrichten", ns, ctx).some((n) => nachrichtFrei(n) && !nachrichtAbgelaufen(n, jetzt));
    if (!darf) darf = filtern("stimmen", (await db.q(`select to_jsonb(s) as z from bk_stimmen s where datei = $1 and geloescht_am is null`, ["datei:" + id])).map((r) => r.z), ctx).length > 0;
    // 🎭 Übe-Bühne: Noten/Vorspiel einer sichtbaren Aufgabe, Aufnahme eines eigenen (bzw. Kinder-)Ergebnisses
    if (!darf) darf = filtern("uebeaufgaben", (await db.q(`select to_jsonb(u) as z from bk_uebeaufgaben u where (datei = $1 or vorspiel = $1) and geloescht_am is null`, ["datei:" + id])).map((r) => r.z), ctx).length > 0;
    if (!darf) darf = filtern("dokumente", (await db.q(`select to_jsonb(d) as z from bk_dokumente d where datei = $1 and geloescht_am is null`, ["datei:" + id])).map((r) => r.z), ctx).length > 0;
    if (!darf) darf = filtern("uebe_ergebnisse", (await db.q(`select to_jsonb(e) as z from bk_uebe_ergebnisse e where aufnahme = $1 and geloescht_am is null`, ["datei:" + id])).map((r) => r.z), ctx).length > 0;
  }
  if (!darf) return fehler(403, "KEIN_ZUGRIFF");
  const b = await ablage.lesen(db, id);
  if (!b) return fehler(410, "DATEI_GELOESCHT");
  return { status: 200, json: { ok: true, id, name: d.name, mime: d.mime, groesse: d.groesse, daten: b } };
}

// ℹ️ Details einer eigenen Nachricht: was der Communicator je Empfänger und Weg gemacht hat (nur der Absender sieht das)
async function nachrichtZustellung(db, s, body) {
  const n = (await db.q(`select von from bk_nachrichten where id = $1`, [String(body.id || "")]))[0];
  if (!n || n.von !== s.person.id) return fehler(403, "NUR_ABSENDER");
  const wege = (await db.q(`select v.an_id, v.kanal, v.status, v.zeit, v.gesendet_am, v.status_am, v.fehler_code, v.naechster_versuch, p.vorname, p.nachname
    from bk_versand v left join bk_personen p on p.id = v.an_id where v.korrelation = $1 order by v.zeit`, [`nachricht:${body.id}`]))
    .map((v) => ({ an_id: v.an_id, name: `${v.vorname || ""} ${v.nachname || ""}`.trim(), kanal: v.kanal, status: v.status, zeit: v.zeit, gesendet_am: v.gesendet_am, status_am: v.status_am, fehler: v.fehler_code, naechster: v.naechster_versuch }));
  return { status: 200, json: { ok: true, wege } };
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

// ---------- 📆 Kalender-Abo (Apple, Google, Outlook) ----------
// Link = <person>.<HMAC(Geheimnis, person:zählnummer)> – nichts Geheimes in der Datenbank; „neuer Link“ erhöht die Zählnummer,
// dann gilt der alte nicht mehr. Der Kalender holt alle paar Stunden: nur Termine dieser Person (Eltern: ihrer Kinder) und die Übezeiten.
async function kalenderEpoche(db, pid) {
  return (await db.q(`select epoche from bk_kalender_abos where person_id = $1`, [pid]))[0]?.epoche ?? 0;
}
async function kalenderToken(pid, epoche, geheimnis) { return `${pid}.${await hmac(geheimnis, `kalender:${pid}:${epoche}`)}`; }
async function kalenderLink(db, s, body, dienste) {
  const g = dienste.kalenderGeheimnis, basis = String(dienste.basisUrl || "");
  if (!g || !/^https:\/\//.test(basis)) return fehler(503, "KALENDER_NICHT_EINGERICHTET");
  let ep = await kalenderEpoche(db, s.person.id);
  if (body.neu) {
    ep = (await db.q(`insert into bk_kalender_abos (person_id, epoche) values ($1, 1) on conflict (person_id) do update set epoche = bk_kalender_abos.epoche + 1 returning epoche`, [s.person.id]))[0].epoche;
  }
  const url = `${basis}?kalender=${encodeURIComponent(await kalenderToken(s.person.id, ep, g))}`;
  return { status: 200, json: { ok: true, url, webcal: url.replace(/^https:/, "webcal:") } };
}
export async function kalenderFeed(db, token, geheimnis) {
  const leer = { status: 404, text: "Kalender nicht gefunden" };
  if (!geheimnis) return { status: 503, text: "Kalender nicht eingerichtet" };
  const m = /^([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{20,})$/.exec(String(token || ""));
  if (!m) return leer;
  const pid = m[1];
  if (!gleich(await kalenderToken(pid, await kalenderEpoche(db, pid), geheimnis), token)) return leer;
  const p = (await db.q(`select to_jsonb(p) as p from bk_personen p where id = $1 and geloescht_am is null`, [pid]))[0]?.p;
  if (!p || p.status === "ausgetreten") return leer;
  const alle = {};
  for (const t of ["termine", "gruppe_zuordnung", "person_instrument", "instrument_typen", "eltern_kind", "personen", "eigene_termine"]) alle[t] = (await alleZeilen(db, t)).filter((z) => !z.geloescht_am);
  const mini = { liste: (t, f = () => true) => (alle[t] || []).filter(f), hole: (t, id) => (alle[t] || []).find((z) => z.id === id) || null };
  const kinder = alle.eltern_kind.filter((e) => e.eltern_id === pid).map((e) => e.kind_id);
  const wer = [...new Set([pid, ...kinder])], seit = new Date(Date.now() - 60 * 86400000);
  const jeTermin = new Map();
  for (const w of wer) for (const t of termineFuer(mini, w, { abHeute: true, heute: seit })) (jeTermin.get(t.id) || jeTermin.set(t.id, { t, wer: new Set() }).get(t.id)).wer.add(w);
  const vorname = (id) => mini.hole("personen", id)?.vorname || "";
  // 🙋 eigene Termine (Üben, Unterricht …) der Person bzw. ihrer Kinder mit in den Kalender
  for (const e of alle.eigene_termine.filter((x) => wer.includes(x.person_id))) for (const v of eigeneVorkommen(e, seit, new Date(Date.now() + 400 * 86400000))) jeTermin.set(v.id, { t: { ...v, titel: "🙋 " + v.titel }, wer: new Set([e.person_id]) });
  const titelVor = kinder.length ? (t) => [...jeTermin.get(t.id).wer].filter((w) => w !== pid).map(vorname).join(" & ") : null;
  await db.q(`insert into bk_kalender_abos (person_id, epoche, zuletzt) values ($1, 0, now()) on conflict (person_id) do update set zuletzt = now()`, [pid]);
  return { status: 200, text: ics([...jeTermin.values()].map((x) => x.t), "Bachkreis", { alarm: Number(p.kalender_alarm) || 0, uebe: p.uebe_plan ? { ...p.uebe_plan, id: pid } : null, titelVor }) };
}

// ---------- 🟢 Wer ist online · 👋 Anklopfen ----------
// Jedes Gerät meldet sich alle ~45 s („online“); zurück kommt, wer in den letzten 2 Minuten da war – nur Personenkreise, die die Leitung
// freigegeben hat (konfig.online_fuer), nur sichtbare („Mich als online zeigen“) und nur, wem man auch privat schreiben darf (Kinderschutz).
const ONLINE_SEK = 120;
async function onlineListe(db, s, ctx) {
  const k = ctx.konfig, verw = new Set([...ctx.kinder, ...ctx.eltern]);
  const r = (await db.q(`select to_jsonb(p) as z from bk_online o join bk_personen p on p.id = o.person_id
    where o.zuletzt > now() - ($2 || ' seconds')::interval and o.sichtbar and p.id <> $1 and p.geloescht_am is null`, [s.person.id, String(ONLINE_SEK)])).map((x) => x.z);
  return r.filter((p) => onlineErlaubt(p, k) && chatPartnerErlaubt(s.person, p, { verwandt: verw.has(p.id), schuelerUntereinander: k.chat_schueler_untereinander !== false }))
    .map((p) => ({ id: p.id, vorname: p.vorname, name: `${p.vorname || ""} ${p.nachname || ""}`.trim(), typ: p.typ }));
}
async function online(db, s, body) {
  const ctx = await kontextLaden(db, s.person);
  const sichtbar = body.sichtbar !== false && onlineErlaubt(s.person, ctx.konfig);
  await db.q(`insert into bk_online (person_id, zuletzt, sichtbar) values ($1, now(), $2) on conflict (person_id) do update set zuletzt = now(), sichtbar = excluded.sichtbar`, [s.person.id, sichtbar]);
  if (!onlineErlaubt(s.person, ctx.konfig)) return { status: 200, json: { ok: true, erlaubt: false, liste: [] } };
  return { status: 200, json: { ok: true, erlaubt: true, liste: await onlineListe(db, s, ctx) } };
}
async function anklopfen(db, s, body, dienste) {
  const ctx = await kontextLaden(db, s.person), an = String(body.an || "");
  if (!onlineErlaubt(s.person, ctx.konfig)) return fehler(403, "ANKLOPFEN_AUS");
  if (!(await onlineListe(db, s, ctx)).some((p) => p.id === an)) return fehler(409, "NICHT_ONLINE");
  const kurz = await db.q(`select 1 from bk_klopfen where von = $1 and an = $2 and zeit > now() - interval '60 seconds' and geloescht_am is null`, [s.person.id, an]);
  if (kurz.length) return fehler(429, "GERADE_ANGEKLOPFT");
  const stunde = (await db.q(`select count(*)::int as n from bk_klopfen where von = $1 and zeit > now() - interval '1 hour'`, [s.person.id]))[0].n;
  if (stunde >= 20) return fehler(429, "ZU_OFT");
  const id = crypto.randomUUID();
  await db.q(`insert into bk_klopfen (id, von, an, zeit, geaendert_von) values ($1, $2, $3, now(), $4)`, [id, s.person.id, an, name(s.person)]);
  const r = await kom.annehmen(db, { ereignis: "anklopfen", an: [an], betreff: `👋 ${s.person.vorname || name(s.person)} klopft an`, text: "Hast du gerade kurz Zeit? Antippen und antworten.", kanaele: ["push"], korrelation: `klopfen:${id}`, ausloeser: name(s.person) });
  if (r.ok && dienste.adapter) dienste.hintergrund(kom.zustellen(db, dienste.adapter, dienste.umgebung, { korrelation: r.korrelation, limit: 5 }).catch((e) => console.error("bk-kom klopfen", e)));
  return { status: 200, json: { ok: true, id } };
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
    if (aktion === "nachricht_zustellung") return await nachrichtZustellung(db, s, body);
    if (aktion === "datei_hochladen") return await dateiHochladen(db, s, body, dienste.ablage || ABLAGE_DATENBANK);
    if (aktion === "datei_holen") return await dateiHolen(db, s, body, dienste.ablage || ABLAGE_DATENBANK);
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
    if (aktion === "kalender_link") return await kalenderLink(db, s, body, dienste);
    if (aktion === "online") return await online(db, s, body);
    if (aktion === "anklopfen") return await anklopfen(db, s, body, dienste);
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
