// Server-Regeln der Bachkreis-App: WER darf WELCHE Zeile sehen und ändern. Läuft in der Edge Function bk-api (Deno)
// und in den Node-Tests – reines JavaScript ohne Abhängigkeiten. Die Oberfläche blendet nur aus; erzwungen wird HIER.
//
// Grundsatz:
//  - Verwalter-Rollen (Leitung, Lehrkraft, Vorstand …) sehen eine Tabelle ganz, wenn ihre Rolle in `lesen` steht.
//  - Alle anderen (Schüler, Eltern) sehen nur „ihre“ Zeilen: Eltern die ihrer Kinder, Schüler die eigenen,
//    dazu allgemeine Stammdaten (Gruppen, Register, Termine ihrer Gruppen, Pinnwand …).
//  - Fremde Personen sehen Schüler/Eltern nur mit Namen (keine Adresse, kein Telefon, keine Gesundheitsangaben).
//  - Geschützte Felder (Notfall-/Gesundheitsinfo) nur Leitung/Admin/Lehrkraft.
import { TABELLEN, PINNWAND, pwSichtbar, pwEmpfaenger, pwGelesenId, pwAppPerson, CHAT, nsId, nachrichtFrei, chatPartnerErlaubt } from "./schema.js";

export const SERVER_ONLY = new Set(["aenderungen", "versand", "kom_zustand", "kom_ereignisse"]); // schreibt nur der Server
const GESCHUETZT_ROLLEN = ["admin", "leitung", "lehrkraft"];
const ALLGEMEIN = new Set(["gruppen", "register", "instrument_typen", "terminarten", "projekte", "genehmigung_vorlagen", "werke"]);
// Private Tabellen: Zeilen-Regel gilt für ALLE Rollen (auch die Leitung sieht fremde private Pinnwand-Zettel nicht – wie KC)
const PRIVAT = new Set(["pinnwand", "pinnwand_gelesen", "nachricht_status"]);
// Eigene Unterhaltungen (Einzelchat, Runde) sind privat – auch die Leitung liest sie nur, wenn sie dabei ist (wie KC)
const PRIVAT_CHAT = new Set(["einzel", "runde"]);
const WIEDERHOLUNG = ["einmal", "taeglich", "werktags", "woechentlich", "monatlich"];
const MODERATION = ["admin", "leitung"]; // dürfen sichtbare fremde Zettel abnehmen und sehen, wer gelesen hat

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
  ctx.uMap = new Map((alle.unterhaltungen || []).map((u) => [u.id, u]));
  // Pinnwand: alle Zettel (auch abgenommene – für den Abgleich) und die Personen, die man als Empfänger wählen darf
  ctx.pw = new Map((alle.pinnwand || []).map((z) => [z.id, z]));
  ctx.personen = alle.personen || [];
  const alleP = hatRolle(ctx, TABELLEN.personen.lesen);
  ctx.personenIds = new Set(ctx.personen.filter((p) => pwAppPerson(p) && (alleP || zeileSichtbar("personen", p, ctx))).map((p) => p.id));
  return ctx;
}

const hatRolle = (ctx, liste) => (liste || []).some((r) => ctx.rollen.includes(r));
export const darfAlleLesen = (tab, ctx) => hatRolle(ctx, TABELLEN[tab]?.lesen);
export const darfAlleSchreiben = (tab, ctx) => !SERVER_ONLY.has(tab) && !TABELLEN[tab]?.nurLesen && hatRolle(ctx, TABELLEN[tab]?.schreiben);

function unterhaltungSichtbar(u, ctx, alle) {
  if (PRIVAT_CHAT.has(u.art)) return (u.mitglieder || []).includes(ctx.ich); // Einzelchat/Runde: nur wer dabei ist
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
    case "nachrichten": return ctx.unterhaltungen.has(z.unterhaltung_id) && (z.von === ctx.ich || nachrichtFrei(z));
    case "nachricht_status": return z.person_id === ctx.ich || z.autor_id === ctx.ich;
    case "genehmigungen": return ctx.meine.has(z.kind_id);
    case "stimmen": return ctx.meine.has(z.person_id) || (!z.person_id && (!z.register_id || ctx.register.has(z.register_id)));
    case "aufnahmen": return z.freigabe === "mitglieder" || z.freigabe === "oeffentlich";
    case "aufgaben": return ctx.meine.has(z.von_id);
    case "pinnwand": return pwSichtbar(z, ctx.ich);
    case "pinnwand_gelesen": {
      if (z.person_id === ctx.ich) return true;
      const zettel = ctx.pw?.get(z.zettel_id);
      return !!zettel && (zettel.von === ctx.ich || (hatRolle(ctx, MODERATION) && pwSichtbar(zettel, ctx.ich)));
    }
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
    // Privatsphäre: was die Person selbst freigegeben hat (⚙️ Mehr › Privatsphäre)
    const fg = z.freigaben || {};
    if (fg.mobil) out.mobil = z.mobil;
    if (fg.email) out.email = z.email;
    if (fg.adresse) { out.strasse = z.strasse; out.plz = z.plz; out.ort = z.ort; }
    if (fg.geburtstag && z.geburtsdatum) out.gb_md = String(z.geburtsdatum).slice(5, 10); // nur Tag und Monat, kein Jahr
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
  const alle = darfAlleLesen(tab, ctx) && !PRIVAT.has(tab);
  return zeilen.filter((z) => (alle && !privatZeile(tab, z, ctx)) || zeileSichtbar(tab, z, ctx)).map((z) => kuerzen(tab, z, ctx, alle));
}
// Auch für Rollen, die eine Tabelle ganz lesen dürfen: private Chats und noch nicht gesendete (⏰) Nachrichten anderer bleiben verborgen
function privatZeile(tab, z, ctx) {
  if (tab === "unterhaltungen") return PRIVAT_CHAT.has(z.art);
  if (tab === "nachrichten") return PRIVAT_CHAT.has(ctx.uMap?.get(z.unterhaltung_id)?.art) || (z.von !== ctx.ich && !nachrichtFrei(z));
  return false;
}
// Darf ctx.ich mit Person id eine eigene Unterhaltung anfangen? (Kinderschutz-Regel in schema.js)
export function chatPartnerOk(ctx, id) {
  const p = (ctx.personen || []).find((x) => x.id === id);
  return chatPartnerErlaubt(ctx.person, p, { verwandt: ctx.kinder.has(id) || ctx.eltern.has(id), schuelerUntereinander: ctx.konfig?.chat_schueler_untereinander !== false });
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
      // BK-NACHRICHTEN (wie KC nachricht_senden / _bearbeiten / _loeschen / reagieren / geplant_speichern)
      const u = ctx.uMap.get(alt ? alt.unterhaltung_id : neu.unterhaltung_id);
      if (!u || !ctx.unterhaltungen.has(u.id)) return { ok: false, grund: "UNTERHALTUNG_NICHT_SICHTBAR" };
      if (alt && neu.unterhaltung_id && neu.unterhaltung_id !== alt.unterhaltung_id) return { ok: false, grund: "UNTERHALTUNG_FALSCH" };
      const textPruefen = (t) => { const x = String(t ?? "").trim(); return !x ? "TEXT_FEHLT" : [...x].length > CHAT.zeichen ? "TEXT_ZU_LANG" : null; };
      const kanaele = (k) => (Array.isArray(k) ? [...new Set(k.filter((x) => ["push", "mail", "app"].includes(x)))] : []);
      const planZeit = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) || d.getTime() < Date.now() - 60000 || d.getTime() > Date.now() + 400 * 86400000 ? null : d.toISOString(); };
      if (!alt) {
        if (neu.von !== ctx.ich) return { ok: false, grund: "ABSENDER_FALSCH" };
        if (u.art === "verteiler" && !ctx.istVerwalter) return { ok: false, grund: "NUR_LEITUNG" };
        const f = textPruefen(neu.text); if (f) return { ok: false, grund: f };
        const express = !!neu.express, geplant = neu.geplant_um ? planZeit(neu.geplant_um) : null;
        if (neu.geplant_um && !geplant) return { ok: false, grund: "ZEIT_UNGUELTIG" };
        if (express && geplant) return { ok: false, grund: "EXPRESS_NICHT_GEPLANT" };
        if (express && !hatRolle(ctx, CHAT.expressUnbegrenzt) && (ctx.expressHeute ?? 0) >= (ctx.expressMax ?? CHAT.expressMax)) return { ok: false, grund: "EXPRESS_GRENZE" };
        if (express) ctx.expressHeute = (ctx.expressHeute ?? 0) + 1;
        return { ok: true, zeile: { ...nur(neu, ["id", "unterhaltung_id"]), text: String(neu.text).trim(), von: ctx.ich, zeit: geplant || jetzt, gelesen_von: [ctx.ich],
          rueckmeldung: ctx.istVerwalter && !!neu.rueckmeldung, rueckmeldungen: {}, reaktionen: {}, wichtig: !!neu.wichtig, express,
          antwort_auf: neu.antwort_auf ? String(neu.antwort_auf).slice(0, 80) : null, kanaele: kanaele(neu.kanaele),
          geplant_um: geplant, wiederholung: geplant ? (WIEDERHOLUNG.includes(neu.wiederholung) ? neu.wiederholung : "einmal") : null,
          anzahl: Math.max(0, Math.min(5000, Math.round(Number(neu.anzahl) || 0))) } };
      }
      const eigen = alt.von === ctx.ich, geplantOffen = !nachrichtFrei(alt);
      if (!eigen && geplantOffen) return { ok: false, grund: "NICHT_SICHTBAR" };
      // Geplante (noch nicht gesendete) Nachricht: der Absender darf sie ändern oder löschen
      if (eigen && geplantOffen) {
        if (neu.geloescht_am) return { ok: true, zeile: { ...alt, geloescht_am: jetzt } };
        const f = textPruefen(neu.text); if (f) return { ok: false, grund: f };
        const g = planZeit(neu.geplant_um); if (!g) return { ok: false, grund: "ZEIT_UNGUELTIG" };
        return { ok: true, zeile: { ...alt, text: String(neu.text).trim(), geplant_um: g, zeit: g, wiederholung: WIEDERHOLUNG.includes(neu.wiederholung) ? neu.wiederholung : "einmal", wichtig: !!neu.wichtig, kanaele: kanaele(neu.kanaele) } };
      }
      if (neu.geloescht_am && !alt.geloescht_am) return { ok: false, grund: "NUR_ZURUECKZIEHEN" };
      // Zurückziehen („Diese Nachricht wurde gelöscht“): Absender – oder die Leitung als Moderation
      if (neu.zurueckgezogen_am && !alt.zurueckgezogen_am) {
        if (!eigen && !hatRolle(ctx, MODERATION)) return { ok: false, grund: "NUR_EIGENE" };
        return { ok: true, zeile: { ...alt, text: "", zurueckgezogen_am: jetzt, reaktionen: {}, rueckmeldungen: {} }, zusammenfuehren: true };
      }
      let z = { ...alt };
      // Bearbeiten: nur der Absender, nur innerhalb der Frist
      if (eigen && neu.text !== undefined && String(neu.text).trim() !== alt.text) {
        if (alt.zurueckgezogen_am) return { ok: false, grund: "ZURUECKGEZOGEN" };
        if (Date.now() - Date.parse(alt.zeit) > (ctx.bearbeitenMin ?? CHAT.bearbeitenMin) * 60000) return { ok: false, grund: "BEARBEITEN_ZU_SPAET" };
        const f = textPruefen(neu.text); if (f) return { ok: false, grund: f };
        z = { ...z, text: String(neu.text).trim(), bearbeitet_am: jetzt };
      }
      // Mitlesende (und Absender): nur eigene Einträge – gelesen, Rückmeldung, Reaktion
      const gelesen = new Set(alt.gelesen_von || []); if ((neu.gelesen_von || []).includes(ctx.ich)) gelesen.add(ctx.ich);
      const rm = { ...(alt.rueckmeldungen || {}) }, meine = neu.rueckmeldungen?.[ctx.ich];
      if (alt.rueckmeldung && ["ja", "nein", "gelesen"].includes(meine)) rm[ctx.ich] = meine;
      const re = { ...(alt.reaktionen || {}) };
      if (neu.reaktionen && Object.prototype.hasOwnProperty.call(neu.reaktionen, ctx.ich) && !alt.zurueckgezogen_am) {
        const e = neu.reaktionen[ctx.ich];
        if (typeof e === "string" && e && [...e].length <= 4) re[ctx.ich] = e; else delete re[ctx.ich];
      }
      return { ok: true, zeile: { ...z, gelesen_von: [...gelesen], rueckmeldungen: rm, reaktionen: re }, zusammenfuehren: true };
    }
    case "nachricht_status": {
      // ✓✓ angekommen / blaue ✓✓ gelesen / 🏎️ Express-Antwort: jede Person nur für sich, Zeiten setzt der Server
      const n = ctx.nMap?.get(neu.nachricht_id);
      if (!n || n.geloescht_am || !ctx.unterhaltungen.has(n.unterhaltung_id) || !nachrichtFrei(n) || n.von === ctx.ich) return { ok: false, grund: "NACHRICHT_NICHT_SICHTBAR" };
      if (neu.person_id !== ctx.ich || (alt && alt.person_id !== ctx.ich)) return { ok: false, grund: "NUR_EIGENE" };
      const id = nsId(n.id, ctx.ich);
      if (neu.id !== id) return { ok: false, grund: "ID_UNGUELTIG" };
      const zeit = (k) => alt?.[k] || (neu[k] ? jetzt : null);
      const gel = zeit("gelesen_am");
      return { ok: true, zusammenfuehren: true, zeile: { ...(alt || {}), id, nachricht_id: n.id, person_id: ctx.ich, autor_id: n.von,
        zugestellt_am: alt?.zugestellt_am || (neu.zugestellt_am || gel ? jetzt : null), gelesen_am: gel,
        express_antwort: n.express && ["geoeffnet", "spaeter", "nein"].includes(neu.express_antwort) ? neu.express_antwort : alt?.express_antwort ?? null,
        express_bestaetigt_am: n.express ? zeit("express_bestaetigt_am") : null } };
    }
    case "unterhaltungen": {
      // Eigene Unterhaltung anfangen (Einzelchat oder Runde) – nur mit erlaubten Partnern (Kinderschutz-Regel)
      if (alt) return { ok: false, grund: "NUR_NEU" };
      if (!PRIVAT_CHAT.has(neu.art)) return { ok: false, grund: "ART_UNGUELTIG" };
      const andere = [...new Set((Array.isArray(neu.mitglieder) ? neu.mitglieder : []).map(String))].filter((x) => x !== ctx.ich);
      if (!andere.length) return { ok: false, grund: "MITGLIEDER_FEHLEN" };
      if (neu.art === "einzel" && andere.length !== 1) return { ok: false, grund: "EINZEL_NUR_ZWEI" };
      if (andere.length > 60) return { ok: false, grund: "ZU_VIELE" };
      if (!andere.every((id) => chatPartnerOk(ctx, id))) return { ok: false, grund: "PARTNER_NICHT_ERLAUBT" };
      const titel = neu.art === "einzel" ? "Einzelgespräch" : String(neu.titel || "").trim().slice(0, 80) || "Runde";
      return { ok: true, zeile: { ...nur(neu, ["id"]), titel, art: neu.art, verteiler: null, mitglieder: [ctx.ich, ...andere] } };
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
    case "pinnwand": {
      // BK-PINNWAND (wie KC pinnwand_anheften / _wichtig / _abnehmen): Farbe, Zeit und Empfängerzahl setzt der Server
      if (!alt) {
        if (neu.von !== ctx.ich) return { ok: false, grund: "NUR_EIGENE_ZETTEL" };
        const text = String(neu.text ?? "").trim();
        if (!text) return { ok: false, grund: "TEXT_FEHLT" };
        if ([...text].length > PINNWAND.zeichen) return { ok: false, grund: "TEXT_ZU_LANG" };
        const fuer = ["ich", "alle", "personen"].includes(neu.fuer) ? neu.fuer : null;
        if (!fuer) return { ok: false, grund: "FUER_FEHLT" };
        const personen = fuer === "personen" ? [...new Set((Array.isArray(neu.personen) ? neu.personen : []).map(String))].filter((id) => id !== ctx.ich && ctx.personenIds.has(id)).slice(0, 60) : [];
        if (fuer === "personen" && !personen.length) return { ok: false, grund: "EMPFAENGER_FEHLT" };
        const meine = [...ctx.pw.values()].filter((z) => z.von === ctx.ich && !z.geloescht_am);
        if (meine.length >= PINNWAND.max) return { ok: false, grund: "PINNWAND_VOLL" };
        const belegt = new Set(meine.map((z) => Number(z.farbe)));
        const z = { ...nur(neu, ["id"]), text, von: ctx.ich, wichtig: !!neu.wichtig, fuer, personen, farbe: [1, 2, 3, 4].find((n) => !belegt.has(n)) ?? 1, antworten: neu.antworten !== false, zeit: jetzt };
        z.anzahl = pwEmpfaenger(z, ctx.personen).length;
        return { ok: true, zeile: z };
      }
      if (!pwSichtbar(alt, ctx.ich)) return { ok: false, grund: "NICHT_SICHTBAR" };
      if (neu.geloescht_am && !alt.geloescht_am) {
        if (alt.von !== ctx.ich && !hatRolle(ctx, MODERATION)) return { ok: false, grund: "NUR_EIGENE_ZETTEL" };
        return { ok: true, zeile: { ...alt, geloescht_am: jetzt }, zusammenfuehren: true };
      }
      if (alt.von !== ctx.ich) return { ok: false, grund: "NUR_EIGENE_ZETTEL" };
      return { ok: true, zeile: { ...alt, wichtig: !!neu.wichtig } }; // nachträglich ❗ wichtig (Text bleibt wie angeheftet)
    }
    case "pinnwand_gelesen": {
      const z = ctx.pw.get(neu.zettel_id);
      if (!z || z.geloescht_am || !pwSichtbar(z, ctx.ich) || z.von === ctx.ich) return { ok: false, grund: "ZETTEL_NICHT_SICHTBAR" };
      if (neu.person_id !== ctx.ich || (alt && alt.person_id !== ctx.ich)) return { ok: false, grund: "NUR_EIGENE" };
      const id = pwGelesenId(z.id, ctx.ich);
      if (neu.id !== id) return { ok: false, grund: "ID_UNGUELTIG" };
      const erledigt = z.fuer !== "ich" && neu.erledigt_am ? alt?.erledigt_am || jetzt : null;
      return { ok: true, zeile: { ...(alt || {}), id, zettel_id: z.id, person_id: ctx.ich, gesehen_am: alt?.gesehen_am || jetzt, erledigt_am: erledigt }, zusammenfuehren: true };
    }
    case "personen":
      if (!alt || alt.id !== ctx.ich) return { ok: false, grund: "NUR_EIGENE_EINSTELLUNGEN" };
      { const fg = neu.freigaben && typeof neu.freigaben === "object" ? Object.fromEntries(["geburtstag", "mobil", "email", "adresse"].map((k) => [k, neu.freigaben[k] === true])) : alt.freigaben;
        return { ok: true, zeile: { ...alt, benachrichtigung: neu.benachrichtigung ?? alt.benachrichtigung, freigaben: fg } }; }
    default:
      return { ok: false, grund: "KEIN_SCHREIBRECHT" };
  }
}
