// Kern der Edge Function bk-api – unabhängig von der Datenbank-Anbindung (Deno: postgres.js, Tests: PGlite).
// db.q(sqlText, params) → Array von Zeilen. Alle Datensätze laufen als JSON (to_jsonb / jsonb_populate_record).
//
// Aktionen:  anmelden {code, verwaltung?} · laden {seit?} · speichern {tab, zeilen[]} · versenden {…} · abmelden
// Anmeldung: persönlicher Zugangscode (QR-Link) → Sitzung (Token; in der DB nur als SHA-256-Hash).
import { TABELLEN, TABELLEN_NAMEN } from "./schema.js";
import { kontext, filtern, schreibPruefung } from "./regeln.js";

const SITZUNG_TAGE = 180;
const MAX_FEHLVERSUCHE = 20; // je IP in 15 Minuten
const UEBERLAPPUNG_MS = 5000; // Abgleich: kleine Überlappung gegen gleichzeitige Transaktionen

export async function sha256(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function zufallsToken() {
  const a = new Uint8Array(32); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const spalten = (tab) => [...TABELLEN[tab].felder, ...(TABELLEN[tab].intern || [])].map((f) => f.k);
const fehler = (status, code, extra = {}) => ({ status, json: { ok: false, fehler: code, ...extra } });
const name = (p) => `${p?.vorname || ""} ${p?.nachname || ""}`.trim() || "Unbekannt";

async function alleZeilen(db, tab) {
  return (await db.q(`select to_jsonb(t) as z from bk_${tab} t`)).map((r) => r.z);
}
async function kontextLaden(db, person) {
  const noetig = ["eltern_kind", "gruppe_zuordnung", "person_instrument", "ausleihen", "termine", "unterhaltungen"];
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
    const zeilen = seit
      ? (await db.q(`select to_jsonb(t) as z from bk_${tab} t where t.geaendert_am > $1::timestamptz`, [seit])).map((r) => r.z)
      : await alleZeilen(db, tab);
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
    await db.q(`insert into bk_aenderungen (zeit, tabelle, zeile_id, aktion, wer, quelle) values (now(), $1, $2, $3, $4, $5)`,
      [tab, zeile.id, z.geloescht_am && !alt?.geloescht_am ? "geloescht" : alt ? "geaendert" : "neu", name(s.person), body.quelle === "verwaltung" ? "verwaltung" : "app"]);
    gespeichert.push(filtern(tab, [zeile], ctx)[0] || { id: zeile.id, version: zeile.version });
  }
  return { status: konflikte.length && !gespeichert.length ? 409 : 200, json: { ok: konflikte.length === 0, gespeichert, konflikte } };
}

// ---------- Versand vormerken (der Versand-Kern „Communicator“ arbeitet die Einträge ab) ----------
async function versenden(db, s, body) {
  const ctx = await kontextLaden(db, s.person);
  let an = Array.isArray(body.an) ? body.an.map(String).slice(0, 500) : [];
  if (!ctx.istVerwalter) {
    // Schüler/Eltern dürfen nur Mitglieder einer sichtbaren Unterhaltung benachrichtigen (Chat-Nachricht)
    if (body.ereignis !== "nachricht" || !ctx.unterhaltungen.has(body.unterhaltung_id)) return fehler(403, "KEIN_VERSANDRECHT");
    const u = (await db.q(`select to_jsonb(u) as z from bk_unterhaltungen u where id = $1`, [body.unterhaltung_id]))[0]?.z;
    an = [...(u?.mitglieder || [])];
    const [art, gid] = String(u?.verteiler || "").split(":");
    if (art === "gruppe" && gid) an.push(...(await db.q(`select person_id from bk_gruppe_zuordnung where gruppe_id = $1 and geloescht_am is null`, [gid])).map((r) => r.person_id));
    an = an.filter((p) => p !== ctx.ich);
  }
  const kanaele = Array.isArray(body.kanaele) && body.kanaele.length ? body.kanaele.filter((k) => ["push", "mail", "app"].includes(k)) : ["push", "app"];
  let n = 0;
  for (const id of new Set(an)) for (const k of kanaele) {
    await db.q(`insert into bk_versand (zeit, kanal, an_id, betreff, status, ereignis, info, geaendert_von) values (now(), $1, $2, $3, 'vorgemerkt', $4, $5, $6)`,
      [k, id, String(body.betreff || "").slice(0, 300), String(body.ereignis || "").slice(0, 60), String(body.text || "").slice(0, 2000), name(s.person)]);
    n++;
  }
  return { status: 200, json: { ok: true, vorgemerkt: n } };
}

export async function verarbeiten(db, body, meta = {}) {
  try {
    const aktion = String(body?.aktion || "");
    if (aktion === "anmelden") return await anmelden(db, body, meta);
    const s = await sitzungPruefen(db, meta.token);
    if (!s) return fehler(401, "NICHT_ANGEMELDET");
    if (aktion === "laden") return await laden(db, s, body);
    if (aktion === "speichern") return await speichern(db, s, body);
    if (aktion === "versenden") return await versenden(db, s, body);
    if (aktion === "konfig_setzen") {
      if (!(s.person.rollen || []).some((r) => r === "leitung" || r === "admin")) return fehler(403, "NUR_LEITUNG");
      const k = String(body.schluessel || "");
      if (!/^[a-z_]{2,40}$/.test(k)) return fehler(400, "SCHLUESSEL_UNGUELTIG");
      await db.q(`insert into bk_konfig (schluessel, wert, geaendert_am) values ($1, $2::jsonb, now()) on conflict (schluessel) do update set wert = excluded.wert, geaendert_am = now()`, [k, JSON.stringify(body.wert ?? null)]);
      return { status: 200, json: { ok: true } };
    }
    if (aktion === "abmelden") { await db.q(`update bk_sitzungen set widerrufen_am = now() where id = $1`, [s.sid]); return { status: 200, json: { ok: true } }; }
    return fehler(400, "UNBEKANNTE_AKTION");
  } catch (e) {
    console.error("bk-api", e);
    return fehler(500, "SERVERFEHLER");
  }
}
