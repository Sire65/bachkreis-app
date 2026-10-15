// Server-Regeln der Bachkreis-App: WER darf WELCHE Zeile sehen und ändern. Läuft in der Edge Function bk-api (Deno)
// und in den Node-Tests – reines JavaScript ohne Abhängigkeiten. Die Oberfläche blendet nur aus; erzwungen wird HIER.
//
// Grundsatz:
//  - Verwalter-Rollen (Leitung, Lehrkraft, Vorstand …) sehen eine Tabelle ganz, wenn ihre Rolle in `lesen` steht.
//  - Alle anderen (Schüler, Eltern) sehen nur „ihre“ Zeilen: Eltern die ihrer Kinder, Schüler die eigenen,
//    dazu allgemeine Stammdaten (Gruppen, Register, Termine ihrer Gruppen, Pinnwand …).
//  - Fremde Personen sehen Schüler/Eltern nur mit Namen (keine Adresse, kein Telefon, keine Gesundheitsangaben).
//  - Geschützte Felder (Notfall-/Gesundheitsinfo) nur Leitung/Admin/Lehrkraft.
import { TABELLEN } from "./schema.js";

export const SERVER_ONLY = new Set(["aenderungen", "versand", "kom_zustand", "kom_ereignisse"]); // schreibt nur der Server
const GESCHUETZT_ROLLEN = ["admin", "leitung", "lehrkraft"];
const ALLGEMEIN = new Set(["gruppen", "register", "instrument_typen", "terminarten", "projekte", "genehmigung_vorlagen", "werke", "pinnwand"]);

export function kontext(person, alle) {
  const rollen = person?.rollen || [];
  const ich = person?.id;
  const kinder = (alle.eltern_kind || []).filter((e) => e.eltern_id === ich && !e.geloescht_am).map((e) => e.kind_id);
  const meine = new Set([ich, ...kinder]);
  const eltern = new Set((alle.eltern_kind || []).filter((e) => meine.has(e.kind_id) && !e.geloescht_am).map((e) => e.eltern_id));
  const gruppen = new Set((alle.gruppe_zuordnung || []).filter((z) => meine.has(z.person_id) && !z.geloescht_am).map((z) => z.gruppe_id));
  const register = new Set((alle.person_instrument || []).filter((x) => meine.has(x.person_id) && !x.geloescht_am).map((x) => x.register_id).filter(Boolean));
  const inventar = new Set((alle.ausleihen || []).filter((a) => meine.has(a.person_id) && !a.geloescht_am).map((a) => a.inventar_id));
  const termine = new Set((alle.termine || []).filter((t) => (t.gruppen || []).some((g) => gruppen.has(g))).map((t) => t.id));
  const istVerwalter = rollen.some((r) => ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"].includes(r));
  const ctx = { person, ich, rollen, kinder: new Set(kinder), meine, eltern, gruppen, register, inventar, termine, istVerwalter };
  const unterhaltungen = new Set((alle.unterhaltungen || []).filter((u) => unterhaltungSichtbar(u, ctx, alle)).map((u) => u.id));
  ctx.unterhaltungen = unterhaltungen;
  return ctx;
}

const hatRolle = (ctx, liste) => (liste || []).some((r) => ctx.rollen.includes(r));
export const darfAlleLesen = (tab, ctx) => hatRolle(ctx, TABELLEN[tab]?.lesen);
export const darfAlleSchreiben = (tab, ctx) => !SERVER_ONLY.has(tab) && !TABELLEN[tab]?.nurLesen && hatRolle(ctx, TABELLEN[tab]?.schreiben);

function unterhaltungSichtbar(u, ctx, alle) {
  if (hatRolle(ctx, TABELLEN.unterhaltungen.lesen)) return true;
  if ((u.mitglieder || []).includes(ctx.ich)) return true;
  const [art, id] = String(u.verteiler || "").split(":");
  if (art === "gruppe") return ctx.person?.typ === "schueler" && ctx.gruppen.has(id);
  if (art === "eltern") return ctx.kinder.size > 0 && (alle.gruppe_zuordnung || []).some((z) => ctx.kinder.has(z.person_id) && z.gruppe_id === id && !z.geloescht_am);
  if (art === "typ") return ctx.person?.typ === id;
  return false;
}

// Zeilen-Sichtbarkeit für Nicht-Verwalter (bzw. Tabellen, die eine Verwalter-Rolle nicht ganz lesen darf)
function zeileSichtbar(tab, z, ctx) {
  if (ALLGEMEIN.has(tab)) return true;
  switch (tab) {
    case "personen": return ctx.meine.has(z.id) || ctx.eltern.has(z.id) || ["leitung", "lehrkraft", "schueler", "ehemalig"].includes(z.typ);
    case "eltern_kind": return ctx.meine.has(z.kind_id) || ctx.meine.has(z.eltern_id);
    case "gruppe_zuordnung": case "person_instrument": return ctx.person?.typ === "schueler" || ctx.meine.has(z.person_id);
    case "inventar": return ctx.inventar.has(z.id);
    case "ausleihen": return ctx.meine.has(z.person_id);
    case "reparaturen": return z.gemeldet_von === ctx.ich || ctx.inventar.has(z.inventar_id);
    case "termine": return ctx.termine.has(z.id);
    case "antworten": return ctx.meine.has(z.person_id);
    case "unterhaltungen": return ctx.unterhaltungen.has(z.id);
    case "nachrichten": return ctx.unterhaltungen.has(z.unterhaltung_id);
    case "genehmigungen": return ctx.meine.has(z.kind_id);
    case "stimmen": return ctx.meine.has(z.person_id) || (!z.person_id && (!z.register_id || ctx.register.has(z.register_id)));
    case "aufnahmen": return z.freigabe === "mitglieder" || z.freigabe === "oeffentlich";
    case "aufgaben": return ctx.meine.has(z.von_id);
    default: return false; // einkaeufe, spenden, zugaenge, versand, aenderungen
  }
}

// Felder kürzen: fremde Personen nur mit Namen; geschützte Felder nur für berechtigte Rollen
const NUR_NAME = ["id", "vorname", "nachname", "typ", "status", "jahrgang", "rollen", "version", "geaendert_am", "geloescht_am"];
function kuerzen(tab, z, ctx, alleLesen) {
  let out = z;
  if (tab === "personen" && !alleLesen && !ctx.meine.has(z.id) && !ctx.eltern.has(z.id)) {
    out = Object.fromEntries(NUR_NAME.map((k) => [k, z[k]]));
    if (["leitung", "lehrkraft"].includes(z.typ)) { out.mobil = z.mobil; out.email = z.email; } // Ansprechpartner (SOS)
  }
  if (tab === "zugaenge") out = { ...out, code: null, code_hash: undefined };
  if (tab === "versand" && out.quittung_hash !== undefined) { out = { ...out }; delete out.quittung_hash; } // Einmal-Token der Push-Quittung
  const geschuetzt = (TABELLEN[tab]?.felder || []).filter((f) => f.geschuetzt).map((f) => f.k);
  if (geschuetzt.length && !hatRolle(ctx, GESCHUETZT_ROLLEN) && !(tab === "personen" && ctx.meine.has(z.id))) {
    out = { ...out }; for (const k of geschuetzt) delete out[k];
  }
  if (out.code_hash !== undefined) { out = { ...out }; delete out.code_hash; }
  return out;
}

// Liefert die für ctx sichtbaren, gekürzten Zeilen einer Tabelle (inkl. Lösch-Markierungen für den Abgleich).
export function filtern(tab, zeilen, ctx) {
  const alle = darfAlleLesen(tab, ctx);
  return zeilen.filter((z) => alle || zeileSichtbar(tab, z, ctx)).map((z) => kuerzen(tab, z, ctx, alle));
}

// ---------- Schreiben ----------
// Rückgabe: { ok:true, zeile } (bereinigte, zu speichernde Zeile) oder { ok:false, grund }.
// alt = bestehende Zeile in der DB (oder null), neu = vom Gerät gesendete Zeile.
const nur = (obj, felder) => Object.fromEntries(felder.filter((k) => k in obj).map((k) => [k, obj[k]]));
export function schreibPruefung(tab, neu, alt, ctx, jetzt = new Date().toISOString()) {
  if (!TABELLEN[tab]) return { ok: false, grund: "UNBEKANNTE_TABELLE" };
  if (SERVER_ONLY.has(tab)) return { ok: false, grund: "NUR_SERVER" };
  if (alt?.geloescht_am && !neu.geloescht_am) return { ok: false, grund: "GELOESCHT" };
  if (darfAlleSchreiben(tab, ctx)) {
    // Geschützte Felder nur mit passender Rolle ändern (sonst alten Wert behalten)
    const z = { ...(alt || {}), ...neu };
    for (const f of TABELLEN[tab].felder.filter((f) => f.geschuetzt)) if (!hatRolle(ctx, GESCHUETZT_ROLLEN)) z[f.k] = alt ? alt[f.k] : null;
    return { ok: true, zeile: z };
  }
  // Selbstbedienung für Schüler/Eltern (und Verwalter in Tabellen ohne Schreibrecht)
  const neuOderEigen = (feld) => (!alt || alt[feld] === ctx.ich) && neu[feld] === ctx.ich;
  switch (tab) {
    case "antworten":
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (!ctx.termine.has(neu.termin_id)) return { ok: false, grund: "TERMIN_NICHT_SICHTBAR" };
      if (!["ja", "vielleicht", "nein"].includes(neu.antwort)) return { ok: false, grund: "ANTWORT_UNGUELTIG" };
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "termin_id", "person_id", "antwort", "notiz", "register_id"]), von_person_id: ctx.ich } };
    case "nachrichten": {
      if (!ctx.unterhaltungen.has(neu.unterhaltung_id)) return { ok: false, grund: "UNTERHALTUNG_NICHT_SICHTBAR" };
      if (!alt) {
        if (neu.von !== ctx.ich) return { ok: false, grund: "ABSENDER_FALSCH" };
        return { ok: true, zeile: { ...nur(neu, ["id", "unterhaltung_id", "text"]), von: ctx.ich, zeit: jetzt, gelesen_von: [ctx.ich], rueckmeldung: false } };
      }
      // fremde Nachricht: nur eigenes „gelesen“ und eigene Rückmeldung setzen
      const gelesen = new Set(alt.gelesen_von || []); if ((neu.gelesen_von || []).includes(ctx.ich)) gelesen.add(ctx.ich);
      const rm = { ...(alt.rueckmeldungen || {}) }; const meine = neu.rueckmeldungen?.[ctx.ich];
      if (alt.rueckmeldung && ["ja", "nein", "gelesen"].includes(meine)) rm[ctx.ich] = meine;
      return { ok: true, zeile: { ...alt, gelesen_von: [...gelesen], rueckmeldungen: rm }, zusammenfuehren: true };
    }
    case "genehmigungen":
      if (!alt || !ctx.kinder.has(alt.kind_id)) return { ok: false, grund: "NICHT_MEIN_KIND" };
      if (!["erteilt", "abgelehnt", "widerrufen"].includes(neu.status)) return { ok: false, grund: "STATUS_UNGUELTIG" };
      if (neu.status === "widerrufen" && alt.status !== "erteilt") return { ok: false, grund: "NUR_ERTEILTE_WIDERRUFBAR" };
      return { ok: true, zeile: { ...alt, status: neu.status, beantwortet_von: ctx.ich, beantwortet_am: jetzt, vorlage_version: neu.vorlage_version ?? alt.vorlage_version } };
    case "aufgaben":
      if (alt) return { ok: false, grund: "NUR_NEU" };
      if (!["aenderung", "wechselwunsch"].includes(neu.art) || neu.von_id !== ctx.ich) return { ok: false, grund: "ART_ODER_ABSENDER" };
      return { ok: true, zeile: { ...nur(neu, ["id", "titel", "art", "text", "frist", "ziel_gruppe", "zustaendig_id"]), von_id: ctx.ich, status: "offen" } };
    case "reparaturen":
      if (alt) return { ok: false, grund: "NUR_NEU" };
      if (!neu.inventar_id || !(ctx.inventar.has(neu.inventar_id) || ctx.istVerwalter)) return { ok: false, grund: "INSTRUMENT_NICHT_MEINS" };
      return { ok: true, zeile: { ...nur(neu, ["id", "inventar_id", "meldung"]), status: "gemeldet", gemeldet_von: ctx.ich, gemeldet_am: jetzt.slice(0, 10) } };
    case "pinnwand":
      if (!neuOderEigen("von")) return { ok: false, grund: "NUR_EIGENE_ZETTEL" };
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "text", "wichtig", "erledigt", "geloescht_am"]), von: ctx.ich, zeit: alt?.zeit || jetzt } };
    case "personen":
      if (!alt || alt.id !== ctx.ich) return { ok: false, grund: "NUR_EIGENE_EINSTELLUNGEN" };
      return { ok: true, zeile: { ...alt, benachrichtigung: neu.benachrichtigung ?? alt.benachrichtigung } };
    default:
      return { ok: false, grund: "KEIN_SCHREIBRECHT" };
  }
}
