// BK Communicator – Versand-Kern nach dem Vorbild des KC Communicators (kc-communication-router/-dispatch/-maintenance/
// -push-receipt), als EIN gemeinsamer Kern für die Edge Functions (Deno) und die Node-Tests (PGlite).
// Datenbank-Zugang: db.q(sqlText, params) → Zeilen. Kanal-Adapter werden hineingereicht (Deno: echte Anbieter,
// Tests: Attrappen) – der Kern selbst hat keine Abhängigkeiten und kennt keine Schlüssel.
//
//  annehmen()  = Router: Programm prüfen, Regel + Vorlage wählen, Empfänger auflösen (Eltern Minderjähriger),
//                Vorlieben, Erreichbarkeit, Rückfall-/Alle-Modus, Ruhezeit, Doppelte, Idempotenz → Aufträge (bk_versand)
//  zustellen() = Dispatch: fällige Aufträge sperren (skip locked), Route + Anbieter wählen (Rang, Zustand, Bremse,
//                Zero-Cost), senden, bei Störung Anbieterwechsel, Wiederholung mit Backoff, „aufgegeben“, Rückfall-Kanal
//  wartung()   = jede Minute: hängende Aufträge lösen, zustellen, Eskalationen, Anbieter-Zustand, Aufräumen
//  quittung()  = angezeigt / geöffnet / bestätigt (Service Worker bzw. App)
import { TABELLEN, KOM_EREIGNISSE } from "../schema.js";
import { sha256, zufallsToken } from "../krypto.js";

export const RANG = { wartend: 0, erneut: 0, in_arbeit: 1, gesendet: 2, zugestellt: 3, angezeigt: 4, geoeffnet: 5, quittiert: 6 };
const ERFOLG = ["gesendet", "zugestellt", "angezeigt", "geoeffnet", "quittiert"];
const OFFEN = ["wartend", "erneut", "in_arbeit"];
const STANDARD_EINST = { versand_aktiv: true, nur_kostenlos: true, max_pro_minute: 120, ruhe_von: "21:30", ruhe_bis: "07:00", max_versuche: 5, basis_sekunden: 30, max_sekunden: 3600, absender_name: "Bachkreis", absender_email: "", antwort_an: "", app_url: "" };
const NOTFALL_REGEL = { id: null, ereignis: "standard", kanaele: ["push", "app"], modus: "rueckfall", vorlage_id: null, prioritaet: "normal", ruhezeit: "verschieben", quittung: false, eltern: "auch", dedupe_sekunden: 0 };
const VCOLS = ["id", ...TABELLEN.versand.felder.map((f) => f.k), ...(TABELLEN.versand.intern || []).map((f) => f.k), "geaendert_von"];
const WER = "Communicator";

// Protokoll-Adapter (sendet nichts) – für Tests und als „Trockenlauf“-Anbieter
export const PROTOKOLL_ADAPTER = { bereit: () => true, async senden({ auftrag }) { return { ok: true, id: "protokoll-" + auftrag.id }; } };

// ---------- Hilfen ----------
const ohneNull = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== null && v !== undefined && v !== ""));
const vollName = (p) => `${p?.vorname || ""} ${p?.nachname || ""}`.trim();
export const ersetze = (s, v) => String(s ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (v[k] ?? "") + "");
const htmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const backoff = (n, einst) => Math.min(einst.max_sekunden, Math.max(einst.basis_sekunden, einst.basis_sekunden * 2 ** (n - 1)));

async function tabelle(db, t) { return (await db.q(`select to_jsonb(t) as z from bk_${t} t where t.geloescht_am is null`)).map((r) => r.z); }
export async function konfigLaden(db) {
  const [e, programme, vorlagen, regeln, anbieter, routen, eskalationen] = [
    await tabelle(db, "kom_einstellungen"), await tabelle(db, "kom_programme"), await tabelle(db, "kom_vorlagen"), await tabelle(db, "kom_regeln"),
    await tabelle(db, "kom_anbieter"), await tabelle(db, "kom_routen"), await tabelle(db, "kom_eskalationen")];
  const g = e.find((x) => x.id === "global");
  // Ruhezeit leer = keine Ruhezeit (nicht durch den Standard ersetzen)
  const einst = { ...STANDARD_EINST, ...ohneNull(g), ...(g ? { ruhe_von: g.ruhe_von, ruhe_bis: g.ruhe_bis } : {}) };
  return { einst, programme, vorlagen, regeln, anbieter, routen, eskalationen };
}

export async function protokoll(db, { auftrag_id = null, art, kanal = null, anbieter_id = null, code = null, text = null }) {
  await db.q(`insert into bk_kom_ereignisse (id, zeit, auftrag_id, art, kanal, anbieter_id, code, text, geaendert_von) values (gen_random_uuid()::text, now(), $1, $2, $3, $4, $5, $6, $7)`,
    [auftrag_id, art, kanal, anbieter_id, code, text == null ? null : String(text).slice(0, 500), WER]);
}

async function auftragAnlegen(db, z) {
  const daten = Object.fromEntries(VCOLS.map((k) => [k, z[k] ?? null]));
  daten.id ||= crypto.randomUUID(); daten.zeit ||= new Date().toISOString(); daten.status_am = new Date().toISOString();
  daten.versuche ??= 0; daten.geaendert_von ||= WER;
  const r = await db.q(`insert into bk_versand (${VCOLS.join(", ")}) select ${VCOLS.join(", ")} from jsonb_populate_record(null::bk_versand, $1::jsonb)
    on conflict (idempotenz) where idempotenz is not null do nothing returning to_jsonb(bk_versand.*) as z`, [JSON.stringify(daten)]);
  return r[0]?.z || null;
}
async function setzen(db, id, felder) {
  const sets = [], werte = [];
  for (const [k, v] of Object.entries(felder)) {
    if (v === JETZT) { sets.push(`${k} = now()`); continue; }
    werte.push(k === "meta" ? JSON.stringify(v) : v);
    sets.push(`${k} = $${werte.length + 1}${k === "meta" ? "::jsonb" : ""}`);
  }
  await db.q(`update bk_versand set ${sets.join(", ")}, status_am = now(), geaendert_von = '${WER}' where id = $1`, [id, ...werte]);
}
const JETZT = Symbol("jetzt");

// Ruhezeit (Europe/Berlin): Ende der laufenden Ruhezeit oder null
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim()); return m ? +m[1] * 60 + +m[2] : null; };
function berlinMinuten(d) {
  const p = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  return +p.find((x) => x.type === "hour").value * 60 + +p.find((x) => x.type === "minute").value;
}
export function ruhezeitEnde(einst, jetzt = new Date()) {
  const von = hm(einst.ruhe_von), bis = hm(einst.ruhe_bis);
  if (von == null || bis == null || von === bis) return null;
  const m = berlinMinuten(jetzt);
  if (!(von < bis ? m >= von && m < bis : m >= von || m < bis)) return null;
  return new Date(jetzt.getTime() + ((bis - m + 1440) % 1440) * 60000 - jetzt.getSeconds() * 1000 - jetzt.getMilliseconds());
}

const minderjaehrig = (p, heute = new Date()) => {
  if (p.typ !== "schueler") return false;
  if (!p.geburtsdatum) return true; // unbekannt → vorsichtshalber minderjährig
  const g = new Date(p.geburtsdatum); const a = heute.getFullYear() - g.getFullYear() - (heute < new Date(heute.getFullYear(), g.getMonth(), g.getDate()) ? 1 : 0);
  return a < 18;
};

// Regel wählen: Ereignis (+ Programm) → Ereignis → „standard“ → eingebaute Notfall-Regel
export function regelFinden(cfg, ereignis, programm) {
  const prog = (r) => cfg.programme.find((p) => p.id === r.programm_id);
  const aktiv = cfg.regeln.filter((r) => r.aktiv !== false);
  return (programm && aktiv.find((r) => r.ereignis === ereignis && prog(r)?.schluessel === programm))
    || aktiv.find((r) => r.ereignis === ereignis) || aktiv.find((r) => r.ereignis === "standard") || NOTFALL_REGEL;
}

// ---------- Router ----------
// auftrag: { ereignis, programm?, an:[personId], betreff, text, variablen?, prioritaet?, kanaele?, korrelation?, ausloeser?, quittung? }
export async function annehmen(db, auftrag) {
  const cfg = await konfigLaden(db);
  const ereignis = KOM_EREIGNISSE[auftrag.ereignis] ? auftrag.ereignis : "standard";
  const regel = regelFinden(cfg, ereignis, auftrag.programm);
  const programm = cfg.programme.find((p) => p.id === regel.programm_id);
  if (programm && programm.aktiv === false) {
    await protokoll(db, { art: "abgelehnt", code: "PROGRAMM_AUS", text: `${programm.name}: ${auftrag.betreff || ""}` });
    return { ok: false, fehler: "PROGRAMM_AUS", auftraege: 0, unterdrueckt: 0 };
  }
  const prioritaet = ["normal", "hoch", "kritisch"].includes(auftrag.prioritaet) ? auftrag.prioritaet : regel.prioritaet || "normal";
  const kritisch = prioritaet === "kritisch";
  const erlaubt = ["push", "mail", "app"];
  const regelK = (regel.kanaele || []).filter((k) => erlaubt.includes(k));
  const wunsch = Array.isArray(auftrag.kanaele) ? auftrag.kanaele.filter((k) => erlaubt.includes(k)) : [];
  const kanaele = wunsch.length ? [...regelK.filter((k) => wunsch.includes(k)), ...wunsch.filter((k) => !regelK.includes(k))] : regelK.length ? regelK : ["app"];
  const korrelation = String(auftrag.korrelation || crypto.randomUUID()).slice(0, 80);
  const quittung = !!(regel.quittung || auftrag.quittung);

  // Empfänger: Personen + Eltern Minderjähriger (Regel „auch“ / „statt“ / „nein“)
  const ids = [...new Set((auftrag.an || []).map(String))].slice(0, 2000);
  const pers = new Map((await db.q(`select to_jsonb(p) as z from bk_personen p where id = any($1::text[]) and geloescht_am is null`, [ids])).map((r) => [r.z.id, r.z]));
  const ek = await db.q(`select eltern_id, kind_id from bk_eltern_kind where kind_id = any($1::text[]) and geloescht_am is null`, [ids]);
  const elternVon = (k) => ek.filter((e) => e.kind_id === k).map((e) => e.eltern_id);
  const ziel = []; // { id, fuer }
  for (const id of ids) {
    const p = pers.get(id); if (!p) continue;
    const mj = minderjaehrig(p);
    if (mj && regel.eltern === "statt" && elternVon(id).length) { for (const e of elternVon(id)) ziel.push({ id: e, fuer: id }); continue; }
    ziel.push({ id, fuer: null });
    if (mj && regel.eltern === "auch") for (const e of elternVon(id)) ziel.push({ id: e, fuer: id });
  }
  const fehlend = [...new Set(ziel.map((z) => z.id).filter((x) => !pers.has(x)))];
  if (fehlend.length) for (const r of await db.q(`select to_jsonb(p) as z from bk_personen p where id = any($1::text[]) and geloescht_am is null`, [fehlend])) pers.set(r.z.id, r.z);
  const gesehen = new Set();
  const empf = ziel.filter((z) => pers.has(z.id) && !gesehen.has(z.id) && gesehen.add(z.id));
  const mitAbo = new Set((await db.q(`select distinct person_id from bk_push_abos where aktiv and person_id = any($1::text[])`, [empf.map((e) => e.id)])).map((r) => r.person_id));

  const ruheEnde = !kritisch && regel.ruhezeit !== "ignorieren" ? ruhezeitEnde(cfg.einst) : null;
  const inhalt = (await sha256(`${ereignis}|${auftrag.betreff || ""}|${auftrag.text || ""}`)).slice(0, 32);
  const basis = {
    betreff: String(auftrag.betreff || "").slice(0, 300), info: String(auftrag.text || "").slice(0, 4000), ereignis, programm: programm?.schluessel || null,
    prioritaet, korrelation, vorlage: regel.vorlage_id || null, quittung_noetig: quittung,
  };
  const sum = { ok: true, korrelation, auftraege: 0, unterdrueckt: 0, verschoben: 0, kanaele: { push: 0, mail: 0, app: 0 } };
  const unterdruecken = async (p, kanal, code) => {
    sum.unterdrueckt++;
    await auftragAnlegen(db, { ...basis, kanal, an_id: p.id, status: "unterdrueckt", fehler_code: code, idempotenz: `${korrelation}:${p.id}:-`, meta: { regel_id: regel.id } });
  };
  for (const { id, fuer } of empf) {
    const p = pers.get(id);
    if (p.status === "ausgetreten") { await unterdruecken(p, kanaele[0], "AUSGETRETEN"); continue; }
    const pref = p.benachrichtigung?.[ereignis];
    const kp = kritisch || !Array.isArray(pref) ? kanaele : kanaele.filter((k) => pref.includes(k));
    if (!kp.length) { await unterdruecken(p, kanaele[0], "VORLIEBE"); continue; }
    const erreichbar = (k) => k === "app" || (k === "push" && mitAbo.has(p.id)) || (k === "mail" && !!p.email);
    const verf = kp.filter(erreichbar);
    if (!verf.length) { await unterdruecken(p, kp[0], "KEIN_KANAL"); continue; }
    if (Number(regel.dedupe_sekunden) > 0) {
      const d = await db.q(`select 1 from bk_versand where an_id = $1 and ereignis = $2 and meta->>'inhalt' = $3 and zeit > now() - ($4 || ' seconds')::interval and status <> 'unterdrueckt' limit 1`, [p.id, ereignis, inhalt, String(regel.dedupe_sekunden)]);
      if (d.length) { await unterdruecken(p, verf[0], "DOPPELT"); continue; }
    }
    const reihe = regel.modus === "alle" ? verf : [verf[0]];
    for (const [i, k] of reihe.entries()) {
      const spaeter = k !== "app" && ruheEnde;
      const a = await auftragAnlegen(db, {
        ...basis, kanal: k, an_id: p.id, status: k === "app" ? "zugestellt" : "wartend", naechster_versuch: spaeter ? ruheEnde.toISOString() : null,
        idempotenz: `${korrelation}:${p.id}:${k}`,
        meta: { regel_id: regel.id, inhalt, fuer, ausloeser: auftrag.ausloeser || null, variablen: auftrag.variablen || {}, weitere: regel.modus === "alle" || i > 0 ? [] : verf.slice(1) },
      });
      if (!a) continue; // schon vorhanden (Idempotenz)
      sum.auftraege++; sum.kanaele[k]++;
      if (spaeter) { sum.verschoben++; await protokoll(db, { auftrag_id: a.id, art: "verschoben", kanal: k, code: "RUHEZEIT", text: "bis " + ruheEnde.toISOString() }); }
    }
  }
  return sum;
}

// ---------- Anbieter-Zustand ----------
async function zustand(db, anbieterId, art, text = null) {
  const vorhanden = await db.q(`select id from bk_kom_zustand where anbieter_id = $1 and geloescht_am is null`, [anbieterId]);
  if (!vorhanden.length) await db.q(`insert into bk_kom_zustand (id, anbieter_id, status, fehler_folge, gesendet_24h, geaendert_von) values ($1, $2, 'unbekannt', 0, 0, $3) on conflict (id) do nothing`, ["kz-" + anbieterId.replace(/^ka-/, ""), anbieterId, WER]);
  if (art === "pruefen") return;
  if (art === "ok") await db.q(`update bk_kom_zustand set status = 'ok', fehler_folge = 0, letzter_erfolg = now(), geprueft_am = now(), geaendert_von = '${WER}'
    where anbieter_id = $1 and (status <> 'ok' or fehler_folge <> 0 or letzter_erfolg is null or letzter_erfolg < now() - interval '1 minute')`, [anbieterId]);
  else if (art === "fehler") await db.q(`update bk_kom_zustand set fehler_folge = coalesce(fehler_folge, 0) + 1, status = case when coalesce(fehler_folge, 0) + 1 >= 3 then 'ausgefallen' else 'gestoert' end,
    letzter_fehler = now(), fehler_text = $2, geprueft_am = now(), geaendert_von = '${WER}' where anbieter_id = $1`, [anbieterId, String(text || "").slice(0, 300)]);
  else await db.q(`update bk_kom_zustand set status = $2, geprueft_am = now(), fehler_text = $3, geaendert_von = '${WER}' where anbieter_id = $1 and status is distinct from $2`, [anbieterId, art, text]);
}

async function bremseFrei(db, an) {
  const r = (await db.q(`select count(*) filter (where gesendet_am > now() - interval '1 minute')::int as m, count(*) filter (where gesendet_am > now() - interval '1 hour')::int as h, count(*)::int as t
    from bk_versand where anbieter_id = $1 and gesendet_am > now() - interval '1 day'`, [an.id]))[0];
  return !((an.bremse_minute && r.m >= an.bremse_minute) || (an.bremse_stunde && r.h >= an.bremse_stunde) || (an.tageslimit && r.t >= an.tageslimit));
}

// ---------- Nachricht bauen (Vorlage je Kanal) ----------
function nachrichtBauen(cfg, a, person, umg) {
  const vorlage = cfg.vorlagen.find((v) => v.id === a.vorlage);
  const variante = vorlage?.varianten?.[a.kanal] || {};
  const appUrl = cfg.einst.app_url || umg.appUrl || "";
  const v = { betreff: a.betreff || "", text: a.info || "", vorname: person?.vorname || "", name: vollName(person), absender: cfg.einst.absender_name || "", app_url: appUrl, ...(a.meta?.variablen || {}) };
  const betreff = ersetze(variante.betreff ?? vorlage?.betreff ?? "{{betreff}}", v).slice(0, 300);
  const text = ersetze(variante.text ?? vorlage?.text ?? "{{text}}", v);
  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d2433">${htmlEsc(text).replace(/\n/g, "<br>")}</div>`;
  return { betreff, text, html, appUrl };
}

// ---------- Rückfall: nächster Kanal derselben Person ----------
async function rueckfall(db, a) {
  const weitere = a.meta?.weitere || [];
  if (!weitere.length) return null;
  const k = weitere[0];
  const n = await auftragAnlegen(db, {
    zeit: new Date().toISOString(), kanal: k, an_id: a.an_id, betreff: a.betreff, info: a.info, ereignis: a.ereignis, programm: a.programm, prioritaet: a.prioritaet,
    korrelation: a.korrelation, vorlage: a.vorlage, quittung_noetig: a.quittung_noetig, status: k === "app" ? "zugestellt" : "wartend",
    idempotenz: `${a.korrelation}:${a.an_id}:${k}`, meta: { ...a.meta, weitere: weitere.slice(1), rueckfall_von: a.id },
  });
  if (n) await protokoll(db, { auftrag_id: a.id, art: "rueckfall", kanal: k, text: `weiter über ${k}` });
  return n;
}

// ---------- Dispatch ----------
// adapter: { webpush, brevo, smtp, protokoll } → { bereit(umg, anbieter, einst), senden({...}) }
// umg: { appUrl, quittungUrl }
export async function zustellen(db, adapter, umg = {}, { korrelation = null, limit = 50, zeitbudgetMs = 20000 } = {}) {
  const cfg = await konfigLaden(db);
  const start = Date.now();
  const proMin = (await db.q(`select count(*)::int as n from bk_versand where gesendet_am > now() - interval '1 minute'`))[0].n;
  const frei = Math.max(0, (cfg.einst.max_pro_minute || 120) - proMin);
  const nurKritisch = !cfg.einst.versand_aktiv || frei === 0; // Not-Aus oder Ratenlimit: Notfälle gehen trotzdem
  const params = [Math.min(limit, nurKritisch ? limit : frei)];
  if (korrelation) params.push(korrelation);
  const gesperrt = (await db.q(`update bk_versand v set status = 'in_arbeit', status_am = now(), versuche = coalesce(v.versuche, 0) + 1, geaendert_von = '${WER}'
    where v.id in (select id from bk_versand where status in ('wartend', 'erneut') and kanal in ('push', 'mail') and geloescht_am is null
      and coalesce(naechster_versuch, zeit) <= now() ${korrelation ? "and korrelation = $2" : ""} ${nurKritisch ? "and prioritaet = 'kritisch'" : ""}
      order by (case prioritaet when 'kritisch' then 0 when 'hoch' then 1 else 2 end), zeit limit $1 for update skip locked)
    returning to_jsonb(v.*) as z`, params)).map((r) => r.z);
  const bericht = { bearbeitet: 0, gesendet: 0, fehler: 0, wiederholung: 0, zurueck: 0, pausiert: !cfg.einst.versand_aktiv };
  for (const a of gesperrt) {
    if (Date.now() - start > zeitbudgetMs) { await db.q(`update bk_versand set status = 'erneut', versuche = greatest(coalesce(versuche, 1) - 1, 0) where id = $1`, [a.id]); bericht.zurueck++; continue; }
    bericht.bearbeitet++;
    const e = await einzeln(db, cfg, adapter, umg, a);
    bericht[e]++;
  }
  return bericht;
}

async function einzeln(db, cfg, adapter, umg, a) {
  const person = (await db.q(`select to_jsonb(p) as z from bk_personen p where id = $1`, [a.an_id]))[0]?.z;
  const endgueltig = async (code, text, art = "fehler") => {
    await setzen(db, a.id, { status: art, fehler_code: code, fehler_text: text, naechster_versuch: null });
    await protokoll(db, { auftrag_id: a.id, art, kanal: a.kanal, code, text });
    await rueckfall(db, a);
    return "fehler";
  };
  // Empfängerseitige Fehler: nicht wiederholen, sofort Rückfall-Kanal (wie KC: PUSH_NO_ACTIVE_SUBSCRIPTION, EMAIL_RECIPIENT_MISSING …)
  if (!person || person.geloescht_am) return endgueltig("EMPFAENGER_FEHLT", "Person nicht gefunden");
  let abos = [];
  if (a.kanal === "push") {
    abos = await db.q(`select id, endpoint, schluessel from bk_push_abos where person_id = $1 and aktiv`, [a.an_id]);
    if (!abos.length) return endgueltig("PUSH_KEIN_ABO", "kein aktives Push-Abo");
  }
  if (a.kanal === "mail" && !person.email) return endgueltig("MAIL_KEINE_ADRESSE", "keine E-Mail-Adresse");

  // Routen → Kandidaten (Rang; gestörte/ausgefallene Anbieter nach hinten, wenn Wechsel erlaubt)
  const zst = new Map((await db.q(`select anbieter_id, status from bk_kom_zustand where geloescht_am is null`)).map((r) => [r.anbieter_id, r.status]));
  const routen = cfg.routen.filter((r) => r.aktiv !== false && r.kanal === a.kanal).sort((x, y) => (x.rang || 99) - (y.rang || 99));
  const kand = []; let gebremst = false; const gruende = [];
  for (const r of routen) {
    const an = cfg.anbieter.find((x) => x.id === r.anbieter_id);
    if (!an || an.aktiv === false) continue;
    if (cfg.einst.nur_kostenlos && !an.kostenlos) { gruende.push(`${an.name}: kostenpflichtig gesperrt`); continue; }
    const impl = adapter[an.art];
    if (!impl || !impl.bereit(umg, an, cfg.einst)) { await zustand(db, an.id, "nicht_eingerichtet", "Secret oder Absender fehlt"); gruende.push(`${an.name}: nicht eingerichtet`); continue; }
    if (!(await bremseFrei(db, an))) { gebremst = true; gruende.push(`${an.name}: gebremst`); continue; }
    kand.push({ r, an, impl, schlecht: r.auto_wechsel !== false && ["ausgefallen"].includes(zst.get(an.id)) });
  }
  kand.sort((x, y) => x.schlecht - y.schlecht);
  if (!kand.length) {
    if (gebremst) {
      await setzen(db, a.id, { status: "erneut", naechster_versuch: new Date(Date.now() + 60000).toISOString(), versuche: Math.max(0, (a.versuche || 1) - 1) });
      await protokoll(db, { auftrag_id: a.id, art: "gebremst", kanal: a.kanal, text: gruende.join(" · ") });
      return "wiederholung";
    }
    return endgueltig("KEIN_ANBIETER", gruende.join(" · ") || "keine aktive Route");
  }

  const n = nachrichtBauen(cfg, a, person, umg);
  let t = null;
  if (a.kanal === "push") { t = zufallsToken(18); await setzen(db, a.id, { quittung_hash: await sha256(t) }); }
  const push = { titel: n.betreff, text: n.text.slice(0, 240), url: n.appUrl || "./", id: a.id, t, q: umg.quittungUrl || "", kritisch: a.prioritaet === "kritisch", tag: a.korrelation };
  let letzter = null;
  for (const [i, k] of kand.entries()) {
    let res;
    try { res = await k.impl.senden({ auftrag: a, person, abos, nachricht: { ...n, push }, einst: cfg.einst, anbieter: k.an, umg }); }
    catch (e) { res = { ok: false, code: "AUSNAHME", text: String(e?.message || e) }; }
    if (res?.abos_weg?.length) await db.q(`update bk_push_abos set aktiv = false, fehler = 'abgelaufen' where endpoint = any($1::text[])`, [res.abos_weg]);
    if (res?.abos_ok?.length) await db.q(`update bk_push_abos set zuletzt_ok = now(), fehler = null where endpoint = any($1::text[])`, [res.abos_ok]);
    if (res?.ok) {
      await setzen(db, a.id, { status: "gesendet", gesendet_am: JETZT, anbieter_id: k.an.id, anbieter_nachricht_id: res.id ? String(res.id).slice(0, 200) : null, fehler_code: null, fehler_text: null, naechster_versuch: null });
      await zustand(db, k.an.id, "ok");
      await protokoll(db, { auftrag_id: a.id, art: "gesendet", kanal: a.kanal, anbieter_id: k.an.id });
      return "gesendet";
    }
    if (res?.empfaenger) { // Empfänger-Problem (Adresse ungültig, alle Abos weg): Anbieter ist gesund
      await setzen(db, a.id, { anbieter_id: k.an.id });
      return endgueltig(res.code || "EMPFAENGER", res.text || "");
    }
    letzter = res || { code: "UNBEKANNT" };
    await zustand(db, k.an.id, "fehler", `${letzter.code}: ${letzter.text || ""}`);
    await protokoll(db, { auftrag_id: a.id, art: "fehler", kanal: a.kanal, anbieter_id: k.an.id, code: letzter.code, text: letzter.text });
    if (k.r.auto_wechsel === false) break;
    if (i < kand.length - 1) await protokoll(db, { auftrag_id: a.id, art: "wechsel", kanal: a.kanal, anbieter_id: kand[i + 1].an.id, text: `${k.an.name} → ${kand[i + 1].an.name}` });
  }
  const versuche = a.versuche || 1;
  if (versuche >= (cfg.einst.max_versuche || 5)) {
    await setzen(db, a.id, { status: "tot", fehler_code: letzter?.code || null, fehler_text: letzter?.text ? String(letzter.text).slice(0, 300) : null, naechster_versuch: null });
    await protokoll(db, { auftrag_id: a.id, art: "tot", kanal: a.kanal, code: letzter?.code, text: `aufgegeben nach ${versuche} Versuchen` });
    await rueckfall(db, a);
    return "fehler";
  }
  const sek = backoff(versuche, cfg.einst);
  await setzen(db, a.id, { status: "erneut", naechster_versuch: new Date(Date.now() + sek * 1000).toISOString(), fehler_code: letzter?.code || null, fehler_text: letzter?.text ? String(letzter.text).slice(0, 300) : null });
  await protokoll(db, { auftrag_id: a.id, art: "erneut", kanal: a.kanal, code: letzter?.code, text: `nächster Versuch in ${sek} s` });
  return "wiederholung";
}

// ---------- Eskalation ----------
async function eskalieren(db, cfg) {
  let n = 0;
  const leitung = (await db.q(`select id from bk_personen where geloescht_am is null and 'leitung' = any(rollen)`)).map((r) => r.id);
  for (const e of cfg.eskalationen.filter((x) => x.aktiv !== false)) {
    const warte = String(Math.max(0, Number(e.warte_sekunden) || 0));
    const gruppen = e.ausloeser === "nicht_quittiert"
      ? await db.q(`select korrelation, an_id from bk_versand where ereignis = $1 and quittung_noetig and status <> 'unterdrueckt' and coalesce(meta->>'eskalation', '') = ''
          and zeit > now() - interval '1 day' group by korrelation, an_id
          having not bool_or(status = 'quittiert') and min(zeit) < now() - ($2 || ' seconds')::interval`, [e.ereignis, warte])
      : await db.q(`select korrelation, an_id from bk_versand where ereignis = $1 and status <> 'unterdrueckt' and coalesce(meta->>'eskalation', '') = ''
          and zeit > now() - interval '1 day' group by korrelation, an_id
          having bool_or(status in ('fehler', 'tot')) and not bool_or(kanal <> 'app' and status = any($3::text[])) and not bool_or(status = any($4::text[]))
          and max(status_am) < now() - ($2 || ' seconds')::interval`, [e.ereignis, warte, ERFOLG, OFFEN]);
    for (const g of gruppen) {
      const o = (await db.q(`select to_jsonb(v) as z from bk_versand v where korrelation = $1 and an_id = $2 order by zeit limit 1`, [g.korrelation, g.an_id]))[0]?.z;
      if (!o) continue;
      const ziele = e.an === "leitung" ? leitung : [g.an_id];
      const betroffen = (await db.q(`select vorname, nachname from bk_personen where id = $1`, [g.an_id]))[0];
      for (const zid of ziele) for (const k of (e.kanaele || []).filter((x) => ["push", "mail", "app"].includes(x))) {
        const fuerLeitung = e.an === "leitung";
        const a = await auftragAnlegen(db, {
          zeit: new Date().toISOString(), kanal: k, an_id: zid, ereignis: o.ereignis, programm: o.programm, prioritaet: o.prioritaet, vorlage: o.vorlage,
          betreff: fuerLeitung ? `Eskalation: ${o.betreff}` : o.betreff,
          info: fuerLeitung ? `${vollName(betroffen)}: ${e.ausloeser === "nicht_quittiert" ? "nicht bestätigt" : "nicht zustellbar"} – „${o.betreff}“\n\n${o.info || ""}` : o.info,
          korrelation: `${g.korrelation}:esk:${e.id}`.slice(0, 120), idempotenz: `${g.korrelation}:esk:${e.id}:${zid}:${k}`,
          status: k === "app" ? "zugestellt" : "wartend", quittung_noetig: false, meta: { eskalation: e.id, von: g.an_id, ursprung: g.korrelation, weitere: [] },
        });
        if (a) { n++; await protokoll(db, { auftrag_id: o.id, art: "eskaliert", kanal: k, text: `${e.name} → ${zid}` }); }
      }
    }
  }
  return n;
}

// ---------- Wartung (jede Minute über pg_cron → bk-kom) ----------
export async function wartung(db, adapter, umg = {}) {
  const h = await db.q(`update bk_versand set status = 'erneut', naechster_versuch = now(), status_am = now() where status = 'in_arbeit' and status_am < now() - interval '10 minutes' returning id`);
  const z = await zustellen(db, adapter, umg, { limit: 200, zeitbudgetMs: 40000 });
  const cfg = await konfigLaden(db);
  const eskaliert = await eskalieren(db, cfg);
  const z2 = eskaliert ? await zustellen(db, adapter, umg, { limit: 100, zeitbudgetMs: 10000 }) : null;
  // Anbieter-Zustand: Einrichtung prüfen, Zähler, „ausgefallen“ nach 15 Min. zur Probe wieder freigeben
  for (const an of cfg.anbieter) {
    const impl = adapter[an.art];
    const bereit = !!impl && impl.bereit(umg, an, cfg.einst);
    await zustand(db, an.id, "pruefen");
    if (!bereit && an.aktiv !== false) await zustand(db, an.id, "nicht_eingerichtet", "Secret oder Absender fehlt");
    else if (bereit) await db.q(`update bk_kom_zustand set status = 'unbekannt', fehler_text = null where anbieter_id = $1 and status = 'nicht_eingerichtet'`, [an.id]);
    await db.q(`update bk_kom_zustand set status = 'gestoert', fehler_text = coalesce(fehler_text, '') || ' (Probe)' where anbieter_id = $1 and status = 'ausgefallen' and letzter_fehler < now() - interval '15 minutes'`, [an.id]);
    await db.q(`update bk_kom_zustand z set gesendet_24h = s.n, geprueft_am = now() from (select count(*)::int as n from bk_versand where anbieter_id = $1 and gesendet_am > now() - interval '1 day') s
      where z.anbieter_id = $1 and z.gesendet_24h is distinct from s.n`, [an.id]);
  }
  await db.q(`delete from bk_kom_ereignisse where zeit < now() - interval '90 days'`);
  await db.q(`delete from bk_versand where zeit < now() - interval '365 days' and status <> all($1::text[])`, [OFFEN]);
  if (h.length) await protokoll(db, { art: "wartung", code: "HAENGER", text: `${h.length} hängende Aufträge erneut eingeplant` });
  return { haenger: h.length, zustellung: z, eskaliert, nachEskalation: z2 };
}

// ---------- Quittungen ----------
const QUITTUNG = ["angezeigt", "geoeffnet", "quittiert"];
async function quittungAnwenden(db, a, art) {
  if (RANG[a.status] !== undefined && RANG[art] > RANG[a.status]) await setzen(db, a.id, { status: art });
  if (art === "quittiert") {
    // Bestätigt = ganzer Vorgang für diese Person erledigt; noch offene Aufträge (z. B. Mail später) entfallen
    await db.q(`update bk_versand set status = 'quittiert', status_am = now(), geaendert_von = '${WER}' where korrelation = $1 and an_id = $2 and status = any($3::text[])`, [a.korrelation, a.an_id, ["gesendet", "zugestellt", "angezeigt", "geoeffnet"]]);
    await db.q(`update bk_versand set status = 'unterdrueckt', fehler_code = 'QUITTIERT', status_am = now(), geaendert_von = '${WER}' where korrelation = $1 and an_id = $2 and status in ('wartend', 'erneut')`, [a.korrelation, a.an_id]);
  }
  await protokoll(db, { auftrag_id: a.id, art, kanal: a.kanal });
}
// Vom Service Worker: Auftrags-ID + Einmal-Token aus der Push-Nachricht (keine Anmeldung nötig)
export async function quittung(db, { id, t, art }) {
  if (!QUITTUNG.includes(art) || !id || !t) return { status: 400, json: { ok: false, fehler: "UNGUELTIG" } };
  const a = (await db.q(`select to_jsonb(v) as z from bk_versand v where id = $1`, [String(id)]))[0]?.z;
  if (!a || !a.quittung_hash || a.quittung_hash !== (await sha256(t))) return { status: 403, json: { ok: false, fehler: "TOKEN" } };
  await quittungAnwenden(db, a, art);
  return { status: 200, json: { ok: true } };
}
// Aus der App (angemeldete Person bestätigt einen Vorgang)
export async function quittierenPerson(db, korrelation, personId) {
  const a = (await db.q(`select to_jsonb(v) as z from bk_versand v where korrelation = $1 and an_id = $2 and status <> 'unterdrueckt' order by zeit limit 1`, [String(korrelation || ""), personId]))[0]?.z;
  if (!a) return false;
  await quittungAnwenden(db, a, "quittiert");
  return true;
}
