// Server-Regeln der Bachkreis-App: WER darf WELCHE Zeile sehen und ändern. Läuft in der Edge Function bk-api (Deno)
// und in den Node-Tests – reines JavaScript ohne Abhängigkeiten. Die Oberfläche blendet nur aus; erzwungen wird HIER.
//
// Grundsatz:
//  - Verwalter-Rollen (Leitung, Lehrkraft, Vorstand …) sehen eine Tabelle ganz, wenn ihre Rolle in `lesen` steht.
//  - Alle anderen (Schüler, Eltern) sehen nur „ihre“ Zeilen: Eltern die ihrer Kinder, Schüler die eigenen,
//    dazu allgemeine Stammdaten (Gruppen, Register, Termine ihrer Gruppen, Pinnwand …).
//  - Fremde Personen sehen Schüler/Eltern nur mit Namen (keine Adresse, kein Telefon, keine Gesundheitsangaben).
//  - Geschützte Felder (Notfall-/Gesundheitsinfo) nur Leitung/Admin/Lehrkraft.
import { UEBE_MODI, UEBE_AUFNAHME_TAGE, PERSONEN_VOLL, PERSONEN_SICHT, TABELLEN, PINNWAND, pwSichtbar, pwEmpfaenger, pwGelesenId, pwAppPerson, CHAT, DATEI, nsId, nachrichtFrei, chatPartnerErlaubt, chatMitgliederMitKopie, istMinderjaehrig, elternZugriff, KIND_KONTAKT } from "./schema.js";

export const SERVER_ONLY = new Set(["aenderungen", "versand", "kom_zustand", "kom_ereignisse"]); // schreibt nur der Server
const GESCHUETZT_ROLLEN = ["admin", "leitung", "lehrkraft"];
const ALLGEMEIN = new Set(["gruppen", "register", "instrument_typen", "terminarten", "projekte", "genehmigung_vorlagen", "werke", "programm", "raeume"]);
// Private Tabellen: Zeilen-Regel gilt für ALLE Rollen (auch die Leitung sieht fremde private Pinnwand-Zettel nicht – wie KC)
const PRIVAT = new Set(["pinnwand", "pinnwand_gelesen", "nachricht_status", "uebungen", "eigene_termine", "klopfen"]);
export const UEBE_INHALT = ["tonleitern", "etueden", "stueck", "vomblatt", "rhythmus", "gehoer", "technik"];
// Eigene Unterhaltungen (Einzelchat, Runde) sind privat – auch die Leitung liest sie nur, wenn sie dabei ist (wie KC)
const PRIVAT_CHAT = new Set(["einzel", "runde"]);
const WIEDERHOLUNG = ["einmal", "taeglich", "werktags", "woechentlich", "monatlich"];
const MODERATION = ["admin", "leitung"]; // dürfen sichtbare fremde Zettel abnehmen und sehen, wer gelesen hat

export function kontext(person, alle) {
  const rollen = person?.rollen || [];
  const ich = person?.id;
  // 👪 Elternrechte nur für minderjährige Kinder – bei Volljährigen nur, wenn das Kind es erlaubt (elternZugriff)
  const pMap = new Map((alle.personen || []).map((p) => [p.id, p]));
  const ek = (alle.eltern_kind || []).filter((e) => !e.geloescht_am && elternZugriff(e, pMap.get(e.kind_id)));
  const kinder = ek.filter((e) => e.eltern_id === ich).map((e) => e.kind_id);
  const meine = new Set([ich, ...kinder]);
  const eltern = new Set(ek.filter((e) => meine.has(e.kind_id)).map((e) => e.eltern_id));
  const gruppen = new Set((alle.gruppe_zuordnung || []).filter((z) => meine.has(z.person_id) && !z.geloescht_am).map((z) => z.gruppe_id));
  const register = new Set((alle.person_instrument || []).filter((x) => meine.has(x.person_id) && !x.geloescht_am).map((x) => x.register_id).filter(Boolean));
  const inventar = new Set((alle.ausleihen || []).filter((a) => meine.has(a.person_id) && !a.geloescht_am).map((a) => a.inventar_id));
  const istVerwalter = rollen.some((r) => ["admin", "leitung", "lehrkraft", "vorstand", "instrumentenwart", "notenwart"].includes(r));
  // 🎼 Registerführer: sieht die Zu-/Absagen der Mitglieder seines Registers (nicht die Gründe anderer Register)
  const eigeneRegister = new Set((alle.person_instrument || []).filter((x) => x.person_id === ich && !x.geloescht_am).map((x) => x.register_id).filter(Boolean));
  const registerLeute = rollen.includes("registerfuehrer") ? new Set((alle.person_instrument || []).filter((x) => !x.geloescht_am && eigeneRegister.has(x.register_id)).map((x) => x.person_id)) : new Set();
  // 🌍 Termine „für alle“ sieht jeder, der (bzw. dessen Kind) in einem Orchester ist – und wer Termine plant
  const termine = new Set((alle.termine || []).filter((t) => (t.gruppen || []).some((g) => gruppen.has(g)) || (t.fuer_alle && (gruppen.size > 0 || istVerwalter || rollen.includes("terminplaner")))).map((t) => t.id));
  const ctx = { person, ich, rollen, kinder: new Set(kinder), meine, eltern, gruppen, register, inventar, termine, istVerwalter, registerLeute, tMap: new Map((alle.termine || []).map((t) => [t.id, t])), terminarten: alle.terminarten || [] };
  const unterhaltungen = new Set((alle.unterhaltungen || []).filter((u) => unterhaltungSichtbar(u, ctx, alle)).map((u) => u.id));
  ctx.unterhaltungen = unterhaltungen;
  ctx.uMap = new Map((alle.unterhaltungen || []).map((u) => [u.id, u]));
  // Pinnwand: alle Zettel (auch abgenommene – für den Abgleich) und die Personen, die man als Empfänger wählen darf
  ctx.pw = new Map((alle.pinnwand || []).map((z) => [z.id, z]));
  ctx.personen = alle.personen || [];
  ctx.elternKind = ek;
  ctx.gvMap = new Map((alle.genehmigung_vorlagen || []).map((v) => [v.id, v]));
  // 🎙️ Übe-Aufnahmen: für welche (eigenen) Kinder haben die Eltern zuletzt „erteilt“ (Zweck uebeaufnahmen)?
  const uaV = new Set((alle.genehmigung_vorlagen || []).filter((v) => v.zweck === "uebeaufnahmen" && !v.geloescht_am).map((v) => v.id)), uaLetzte = new Map();
  for (const g of alle.genehmigungen || []) if (!g.geloescht_am && uaV.has(g.vorlage_id) && meine.has(g.kind_id) && g.status !== "ausstehend" && String(g.beantwortet_am || "") >= String(uaLetzte.get(g.kind_id)?.beantwortet_am || "")) uaLetzte.set(g.kind_id, g);
  ctx.uebeAufnahmeOk = new Set([...uaLetzte].filter(([, g]) => g.status === "erteilt").map(([k]) => k));
  ctx.uaMap = new Map((alle.uebeaufgaben || []).map((u) => [u.id, u]));
  ctx.prMap = new Map((alle.projekte || []).map((p) => [p.id, p]));
  ctx.reiseBelegt = new Map();
  for (const a of alle.reise_anmeldungen || []) if (!a.geloescht_am && a.status === "angemeldet") ctx.reiseBelegt.set(a.projekt_id, (ctx.reiseBelegt.get(a.projekt_id) || 0) + 1);
  // 🩺 Begleitpersonen sehen Gesundheitsangaben der Kinder eines Projekts nur rund um die Fahrt (3 Tage vorher bis 2 Tage danach)
  const heute = new Date(), tag = 86400000;
  const aktiv = (alle.projekte || []).filter((pr) => !pr.geloescht_am && (pr.begleiter || []).includes(ich) && pr.von && heute >= new Date(new Date(pr.von).getTime() - 3 * tag) && heute <= new Date(new Date(pr.bis || pr.von).getTime() + 3 * tag));
  const prGruppen = new Set(aktiv.flatMap((pr) => (alle.termine || []).filter((t) => t.projekt_id === pr.id && !t.geloescht_am).flatMap((t) => t.gruppen || [])));
  ctx.begleitKinder = new Set((alle.gruppe_zuordnung || []).filter((z) => !z.geloescht_am && prGruppen.has(z.gruppe_id)).map((z) => z.person_id));
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
    case "eigene_termine": return ctx.meine.has(z.person_id);
    case "reise_anmeldungen": return ctx.meine.has(z.person_id);
    case "notenexemplare": return ctx.meine.has(z.person_id); // 📄 eigene ausgeliehene Papier-Exemplare
    case "mitfahrten": return ctx.termine.has(z.termin_id); // 🚗 wer zum Termin eingeladen ist
    case "uebeaufgaben": return z.person_id ? ctx.meine.has(z.person_id) : (!z.register_id || ctx.register.has(z.register_id)) && (!z.gruppe_id || ctx.gruppen.has(z.gruppe_id)) && !!(z.register_id || z.gruppe_id);
    case "uebe_ergebnisse": return ctx.meine.has(z.person_id); // ⭐ eigene bzw. die der Kinder
    case "gesundheit": return ctx.meine.has(z.person_id) || (ctx.begleitKinder?.has(z.person_id) && !(z.loeschen_am && z.loeschen_am < new Date().toISOString().slice(0, 10)));
    case "klopfen": return z.von === ctx.ich || z.an === ctx.ich;
    case "uebungen": return ctx.meine.has(z.person_id) || (z.geteilt === true && hatRolle(ctx, ["admin", "leitung", "lehrkraft"]));
    case "ausleihen": return ctx.meine.has(z.person_id);
    case "reparaturen": return z.gemeldet_von === ctx.ich || ctx.inventar.has(z.inventar_id);
    case "termine": return ctx.termine.has(z.id);
    case "antworten": return ctx.meine.has(z.person_id) || (ctx.registerLeute.has(z.person_id) && ctx.termine.has(z.termin_id));
    case "unterhaltungen": return ctx.unterhaltungen.has(z.id);
    case "nachrichten": return ctx.unterhaltungen.has(z.unterhaltung_id) && (z.von === ctx.ich || nachrichtFrei(z));
    case "nachricht_status": return z.person_id === ctx.ich || z.autor_id === ctx.ich;
    case "genehmigungen": return ctx.meine.has(z.kind_id);
    case "stimmen": return ctx.meine.has(z.person_id) || (!z.person_id && (!z.register_id || ctx.register.has(z.register_id)) && (!z.gruppe_id || ctx.gruppen.has(z.gruppe_id))); // „nur Gruppe“ nur für diese Gruppe
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
const NUR_NAME = ["id", "vorname", "nachname", "typ", "status", "jahrgang", "rollen", "avatar", "version", "geaendert_am", "geloescht_am"];
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
  // Need-to-know: Vorstand, Instrumentenwart, Notenwart sehen fremde Personen nur mit den Feldern ihrer Rolle
  if (tab === "personen" && alleLesen && !hatRolle(ctx, PERSONEN_VOLL) && !ctx.meine.has(z.id) && !ctx.eltern.has(z.id)) {
    const art = z.typ === "schueler" || z.typ === "ehemalig" ? "schueler" : z.typ === "eltern" ? "eltern" : "sonst";
    const felder = new Set([...NUR_NAME, ...ctx.rollen.flatMap((r) => PERSONEN_SICHT[r]?.[art] || [])]);
    out = Object.fromEntries(Object.entries(z).filter(([k]) => felder.has(k)));
    const fg = z.freigaben || {};
    if (fg.mobil) out.mobil = z.mobil;
    if (fg.email) out.email = z.email;
  }
  if (tab === "antworten" && !alleLesen && !ctx.meine.has(z.person_id)) { out = { ...out }; delete out.notiz; } // Registerführer: Antwort ja, Grund nein
  if (tab === "zugaenge") out = { ...out, code: null, code_hash: undefined };
  if (tab === "versand" && out.quittung_hash !== undefined) { out = { ...out }; delete out.quittung_hash; } // Einmal-Token der Push-Quittung
  if (!alleLesen) { const vermerke = (TABELLEN[tab]?.felder || []).filter((f) => f.vermerk).map((f) => f.k); if (vermerke.length) { out = { ...out }; for (const k of vermerke) delete out[k]; } }
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
// 📎 Anhänge: nur Dateien, die man selbst hochgeladen hat oder als Noten sehen darf; Noten auch als Verweis ohne Datei
function anlagenPruefen(roh, ctx) {
  if (roh == null) return { liste: [] };
  if (!Array.isArray(roh) || roh.length > CHAT.anlagenMax) return { grund: "ANLAGEN_UNGUELTIG" };
  const liste = [];
  for (const a of roh) {
    if (!a || typeof a !== "object" || !DATEI.arten.includes(a.art)) return { grund: "ANLAGEN_UNGUELTIG" };
    const x = { art: a.art, name: String(a.name || "Datei").slice(0, 120) };
    if (a.id) {
      const d = ctx.dateien?.get(String(a.id));
      if (!d || (d.von !== ctx.ich && !ctx.notenDateien?.has(d.id))) return { grund: "ANLAGE_NICHT_ERLAUBT" };
      Object.assign(x, { id: d.id, mime: d.mime, groesse: d.groesse });
    } else if (a.art !== "noten" || !a.stimme_id) return { grund: "ANLAGEN_UNGUELTIG" };
    if (a.stimme_id) x.stimme_id = String(a.stimme_id).slice(0, 80);
    if (a.werk_id) x.werk_id = String(a.werk_id).slice(0, 80);
    if (Number.isFinite(Number(a.dauer)) && a.dauer > 0) x.dauer = Math.min(3600, Math.round(Number(a.dauer)));
    liste.push(x);
  }
  return { liste };
}
function umfragePruefen(u) {
  if (u == null) return null;
  const frage = String(u.frage || "").trim().slice(0, 200), optionen = (Array.isArray(u.optionen) ? u.optionen : []).map((o) => String(o || "").trim().slice(0, 80)).filter(Boolean);
  if (!frage || optionen.length < 2 || optionen.length > 10) return { grund: "UMFRAGE_UNGUELTIG" };
  return { frage, optionen, mehrfach: !!u.mehrfach };
}
// Darf ctx.ich mit Person id eine eigene Unterhaltung anfangen? (Kinderschutz-Regel in schema.js)
export function chatPartnerOk(ctx, id) {
  const p = (ctx.personen || []).find((x) => x.id === id);
  return chatPartnerErlaubt(ctx.person, p, { verwandt: ctx.kinder.has(id) || ctx.eltern.has(id), schuelerUntereinander: ctx.konfig?.chat_schueler_untereinander !== false });
}

// Eigene Unterhaltung anfangen (Einzelchat oder Runde) – nur mit erlaubten Partnern (Kinderschutz-Regel). Schreibt ein
// Erwachsener einem minderjährigen fremden Kind, kommen dessen Eltern automatisch dazu (aus dem Einzelchat wird eine Runde).
function privatChatPruefen(neu, ctx) {
  const andere = [...new Set((Array.isArray(neu.mitglieder) ? neu.mitglieder : []).map(String))].filter((x) => x !== ctx.ich);
  if (!andere.length) return { ok: false, grund: "MITGLIEDER_FEHLEN" };
  if (andere.length > 60) return { ok: false, grund: "ZU_VIELE" };
  if (!andere.every((id) => chatPartnerOk(ctx, id))) return { ok: false, grund: "PARTNER_NICHT_ERLAUBT" };
  const person = (id) => ctx.personen.find((p) => p.id === id);
  const { mitglieder, kopie } = chatMitgliederMitKopie(ctx.person, andere, { person, elternVon: (id) => ctx.elternKind.filter((e) => e.kind_id === id).map((e) => e.eltern_id),
    verwandt: (id) => ctx.kinder.has(id) || ctx.eltern.has(id), kopie: ctx.konfig?.chat_eltern_kopie });
  if (neu.art === "einzel" && andere.length !== 1) return { ok: false, grund: "EINZEL_NUR_ZWEI" };
  const art = kopie.length || neu.art === "runde" || mitglieder.length > 2 ? "runde" : "einzel";
  const kind = andere.map(person).find((p) => p?.typ === "schueler");
  const titel = art === "einzel" ? "Einzelgespräch" : String(neu.titel || "").trim().slice(0, 80) || (kind ? `${kind.vorname} · mit Eltern` : "Runde");
  return { ok: true, zeile: { ...nur(neu, ["id"]), titel, art, verteiler: null, mitglieder: [...new Set(mitglieder)] } };
}

// ---------- Schreiben ----------
// Rückgabe: { ok:true, zeile } (bereinigte, zu speichernde Zeile) oder { ok:false, grund }.
// alt = bestehende Zeile in der DB (oder null), neu = vom Gerät gesendete Zeile.
const nur = (obj, felder) => Object.fromEntries(felder.filter((k) => k in obj).map((k) => [k, obj[k]]));
export function schreibPruefung(tab, neu, alt, ctx, jetzt = new Date().toISOString()) {
  if (!TABELLEN[tab]) return { ok: false, grund: "UNBEKANNTE_TABELLE" };
  if (SERVER_ONLY.has(tab)) return { ok: false, grund: "NUR_SERVER" };
  if (alt?.geloescht_am && !neu.geloescht_am) return { ok: false, grund: "GELOESCHT" };
  if (tab === "unterhaltungen" && !alt && PRIVAT_CHAT.has(neu.art)) return privatChatPruefen(neu, ctx); // gilt auch für Verwalter (Kinderschutz)
  if (darfAlleSchreiben(tab, ctx)) {
    // 💶 Freigaben (Reparatur, Einkauf): Förderverein-Vorstand immer, Leitung bis zur Freigabegrenze – sonst nicht (auch nicht Instrumentenwart)
    if ((tab === "reparaturen" || tab === "einkaeufe") && neu.status === "freigegeben" && alt?.status !== "freigegeben") {
      const betrag = Number((tab === "reparaturen" ? neu.kosten ?? alt?.kosten : neu.betrag ?? alt?.betrag) || 0), grenze = Number(ctx.konfig?.freigabe_grenze_eur || 0);
      if (!hatRolle(ctx, ["vorstand"]) && !(hatRolle(ctx, ["admin", "leitung"]) && betrag <= grenze)) return { ok: false, grund: "FREIGABE_UEBER_GRENZE" };
      if (tab === "reparaturen") neu = { ...neu, freigegeben_von: ctx.ich };
    }
    // Geschützte Felder nur mit passender Rolle ändern (sonst alten Wert behalten)
    const z = { ...(alt || {}), ...neu };
    for (const f of TABELLEN[tab].felder.filter((f) => f.geschuetzt)) if (!hatRolle(ctx, GESCHUETZT_ROLLEN)) z[f.k] = alt ? alt[f.k] : null;
    return { ok: true, zeile: z };
  }
  // Selbstbedienung für Schüler/Eltern (und Verwalter in Tabellen ohne Schreibrecht)
  switch (tab) {
    case "antworten":
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (!ctx.termine.has(neu.termin_id)) return { ok: false, grund: "TERMIN_NICHT_SICHTBAR" };
      if (!["ja", "vielleicht", "nein"].includes(neu.antwort)) return { ok: false, grund: "ANTWORT_UNGUELTIG" };
      { // ℹ️ Info-Termine brauchen keine Antwort; ❗ bei erforderlicher Teilnahme braucht eine Absage einen Grund
        const t = ctx.tMap?.get(neu.termin_id), art = (ctx.terminarten || []).find((a) => a.id === t?.art_id);
        const teilnahme = t?.teilnahme || (art?.pflicht ? "pflicht" : "erwuenscht");
        if (teilnahme === "info") return { ok: false, grund: "NUR_INFO" };
        if (teilnahme === "pflicht" && neu.antwort === "nein" && !String(neu.notiz || "").trim()) return { ok: false, grund: "GRUND_FEHLT" };
      }
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "termin_id", "person_id", "antwort", "notiz", "register_id", "nachfragen_am"]), von_person_id: ctx.ich } };
    case "eigene_termine": {
      // 🙋 eigene Termine: für sich selbst oder die eigenen Kinder; nur einfache Felder
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (!neu.geloescht_am) {
        if (!String(neu.titel || "").trim() || Number.isNaN(new Date(neu.beginn).getTime())) return { ok: false, grund: "TITEL_ODER_ZEIT_FEHLT" };
        if (neu.ende && new Date(neu.ende) < new Date(neu.beginn)) return { ok: false, grund: "ENDE_VOR_BEGINN" };
      }
      const art = ["ueben", "unterricht", "vorspiel", "sonstiges"].includes(neu.art) ? neu.art : "sonstiges";
      const bis = /^\d{4}-\d{2}-\d{2}$/.test(String(neu.woechentlich_bis || "")) ? neu.woechentlich_bis : null;
      const er = [0, 5, 10, 15, 30, 60, 120].includes(Number(neu.erinnerung)) ? Number(neu.erinnerung) : 0;
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "person_id", "beginn", "ende", "geloescht_am"]), art, titel: String(neu.titel || "").slice(0, 80), ort: String(neu.ort || "").slice(0, 80), notiz: String(neu.notiz || "").slice(0, 300), woechentlich_bis: bis, erinnerung: er } };
    }
    case "klopfen":
      // 👋 angelegt wird nur über die Server-Aktion „anklopfen“; der Empfänger beantwortet
      if (!alt) return { ok: false, grund: "NUR_UEBER_ANKLOPFEN" };
      if (alt.an !== ctx.ich) return { ok: false, grund: "NICHT_AN_MICH" };
      if (!["ja", "spaeter", "nein"].includes(neu.antwort)) return { ok: false, grund: "ANTWORT_UNGUELTIG" };
      return { ok: true, zeile: { ...alt, antwort: neu.antwort, antwort_am: new Date().toISOString() } };
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
        const an = anlagenPruefen(neu.anlagen, ctx); if (an.grund) return { ok: false, grund: an.grund };
        const um = umfragePruefen(neu.umfrage); if (um?.grund) return { ok: false, grund: um.grund };
        const f = textPruefen(neu.text); if (f && !(f === "TEXT_FEHLT" && (an.liste.length || um))) return { ok: false, grund: f };
        let loescht = null;
        if (neu.loescht_am) { const t = Date.parse(neu.loescht_am); if (!(t > Date.now() + 50 * 60000 && t < Date.now() + 8 * 86400000)) return { ok: false, grund: "SELBSTLOESCHEN_UNGUELTIG" }; loescht = new Date(t).toISOString(); }
        const express = !!neu.express, geplant = neu.geplant_um ? planZeit(neu.geplant_um) : null;
        if (neu.geplant_um && !geplant) return { ok: false, grund: "ZEIT_UNGUELTIG" };
        if (express && geplant) return { ok: false, grund: "EXPRESS_NICHT_GEPLANT" };
        if (express && !hatRolle(ctx, CHAT.expressUnbegrenzt) && (ctx.expressHeute ?? 0) >= (ctx.expressMax ?? CHAT.expressMax)) return { ok: false, grund: "EXPRESS_GRENZE" };
        if (express) ctx.expressHeute = (ctx.expressHeute ?? 0) + 1;
        return { ok: true, zeile: { ...nur(neu, ["id", "unterhaltung_id"]), text: String(neu.text ?? "").trim(), von: ctx.ich, zeit: geplant || jetzt, gelesen_von: [ctx.ich],
          anlagen: an.liste, umfrage: um, umfrage_stimmen: {}, loescht_am: geplant ? null : loescht,
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
        return { ok: true, zeile: { ...alt, text: "", zurueckgezogen_am: jetzt, reaktionen: {}, rueckmeldungen: {}, anlagen: [], umfrage: null, umfrage_stimmen: {} }, zusammenfuehren: true };
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
      // 📊 Umfrage: nur die eigene Stimme (Liste der Antwort-Nummern; ohne Mehrfachauswahl höchstens eine)
      const us = { ...(alt.umfrage_stimmen || {}) };
      if (alt.umfrage && neu.umfrage_stimmen && Object.prototype.hasOwnProperty.call(neu.umfrage_stimmen, ctx.ich) && !alt.zurueckgezogen_am) {
        const w = [...new Set((Array.isArray(neu.umfrage_stimmen[ctx.ich]) ? neu.umfrage_stimmen[ctx.ich] : []).map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < alt.umfrage.optionen.length);
        if (!w.length) delete us[ctx.ich]; else us[ctx.ich] = alt.umfrage.mehrfach ? w : [w[0]];
      }
      return { ok: true, zeile: { ...z, gelesen_von: [...gelesen], rueckmeldungen: rm, reaktionen: re, umfrage_stimmen: us }, zusammenfuehren: true };
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
    case "unterhaltungen":
      if (alt) return { ok: false, grund: "NUR_NEU" };
      return { ok: false, grund: "ART_UNGUELTIG" };
    case "genehmigungen":
      if (!alt || !ctx.kinder.has(alt.kind_id)) return { ok: false, grund: "NICHT_MEIN_KIND" };
      if (!["erteilt", "abgelehnt", "widerrufen"].includes(neu.status)) return { ok: false, grund: "STATUS_UNGUELTIG" };
      if (neu.status === "widerrufen" && alt.status !== "erteilt") return { ok: false, grund: "NUR_ERTEILTE_WIDERRUFBAR" };
      // Textfassung kommt vom Server (welche Fassung die Eltern bestätigt haben), nicht vom Gerät
      return { ok: true, zeile: { ...alt, status: neu.status, beantwortet_von: ctx.ich, beantwortet_am: jetzt, vorlage_version: ctx.gvMap?.get(alt.vorlage_id)?.fassung ?? alt.vorlage_version ?? 1 } };
    case "uebeaufgaben": {
      // 📝 Schüler/Eltern haken nur sich bzw. die eigenen Kinder als erledigt ab – sonst bleibt die Aufgabe unverändert
      if (!alt || !zeileSichtbar("uebeaufgaben", alt, ctx)) return { ok: false, grund: "NICHT_SICHTBAR" };
      const vorher = new Set(alt.erledigt || []), nachher = new Set(Array.isArray(neu.erledigt) ? neu.erledigt : []);
      const erledigt = [...vorher].filter((id) => !ctx.meine.has(id) || nachher.has(id)).concat([...nachher].filter((id) => ctx.meine.has(id) && !vorher.has(id)));
      return { ok: true, zeile: { ...alt, erledigt } };
    }
    case "uebe_ergebnisse": {
      // ⭐ Übe-Bühne: nur Zahlen für sich bzw. die eigenen Kinder; Rückmeldung schreibt nur die Lehrkraft;
      // eine Aufnahme nur mit Einwilligung der Eltern (bei Minderjährigen) – sie wird nach UEBE_AUFNAHME_TAGE gelöscht
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(neu.datum || ""))) return { ok: false, grund: "DATUM_UNGUELTIG" };
      const zahl = (v, lo, hi) => (v == null || v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : NaN);
      const min = zahl(neu.minuten, 0, 240), st = zahl(neu.sterne, 0, 3), tp = zahl(neu.tempo, 20, 300);
      if ([min, st, tp].some(Number.isNaN)) return { ok: false, grund: "WERT_UNGUELTIG" };
      if (neu.aufgabe_id && !(ctx.uaMap.get(neu.aufgabe_id) && zeileSichtbar("uebeaufgaben", ctx.uaMap.get(neu.aufgabe_id), ctx))) return { ok: false, grund: "AUFGABE_NICHT_SICHTBAR" };
      let aufnahme = alt?.aufnahme || null, loeschen = alt?.loeschen_am || null;
      if (neu.aufnahme !== aufnahme) {
        if (neu.aufnahme == null) { aufnahme = null; loeschen = null; }
        else {
          if (!/^datei:[\w-]{6,64}$/.test(String(neu.aufnahme))) return { ok: false, grund: "AUFNAHME_UNGUELTIG" };
          const p = ctx.personen.find((x) => x.id === neu.person_id);
          if (istMinderjaehrig(p) && !ctx.uebeAufnahmeOk.has(neu.person_id)) return { ok: false, grund: "KEINE_EINWILLIGUNG_AUFNAHME" };
          aufnahme = neu.aufnahme; loeschen = new Date(Date.now() + UEBE_AUFNAHME_TAGE * 86400000).toISOString().slice(0, 10);
        }
      }
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "person_id", "datum", "geloescht_am"]), aufgabe_id: neu.aufgabe_id || null, modus: UEBE_MODI[neu.modus] ? neu.modus : null,
        stueck: neu.stueck == null ? null : String(neu.stueck).slice(0, 40), minuten: min, sterne: st, tempo: tp, aufnahme, loeschen_am: loeschen,
        rueckmeldung: alt?.rueckmeldung || null, rueckmeldung_von: alt?.rueckmeldung_von || null } };
    }
    case "mitfahrten": {
      // 🚗 Mitfahrbörse: Eltern bieten an oder suchen (immer im eigenen Namen); buchen nur für die eigenen Kinder; ein fremdes Gesuch
      // kann man nur mit „Ich nehme mit“ annehmen (zusage_von = ich) bzw. die eigene Zusage zurücknehmen
      const t = ctx.tMap.get(neu.termin_id);
      if (!t || !ctx.termine.has(t.id) || (alt && alt.termin_id !== neu.termin_id)) return { ok: false, grund: "TERMIN_NICHT_SICHTBAR" };
      if (ctx.person?.typ === "schueler") return { ok: false, grund: "NUR_ERWACHSENE" };
      const art = (alt?.art || neu.art) === "gesuch" ? "gesuch" : "angebot";
      const eigene = !alt ? neu.fahrer_id === ctx.ich : alt.fahrer_id === ctx.ich;
      if (art === "gesuch") {
        if (!eigene) {
          if (!alt) return { ok: false, grund: "NUR_EIGENES_GESUCH" };
          const zusage = neu.zusage_von === ctx.ich ? ctx.ich : alt.zusage_von === ctx.ich && !neu.zusage_von ? null : alt.zusage_von;
          if (alt.zusage_von && alt.zusage_von !== ctx.ich && zusage !== alt.zusage_von) return { ok: false, grund: "SCHON_ZUGESAGT" };
          return { ok: true, zeile: { ...alt, zusage_von: zusage } };
        }
        const kinder = [...new Set((Array.isArray(neu.mitfahrer) ? neu.mitfahrer : alt?.mitfahrer || []).filter((id) => ctx.kinder.has(id)))];
        if (!kinder.length && !neu.geloescht_am) return { ok: false, grund: "KIND_FEHLT" };
        return { ok: true, zeile: { ...(alt || {}), id: alt?.id || neu.id, termin_id: t.id, art, fahrer_id: ctx.ich, richtung: ["hin", "zurueck", "beides"].includes(neu.richtung) ? neu.richtung : "hin",
          plaetze: kinder.length, abfahrt: String(neu.abfahrt || "").slice(0, 120), notiz: String(neu.notiz || "").slice(0, 200), mitfahrer: kinder, zusage_von: alt?.zusage_von ?? null, geloescht_am: neu.geloescht_am ?? null } };
      }
      const plaetze = Math.max(0, Math.min(8, Number(eigene ? neu.plaetze : alt.plaetze) || 0));
      const vorher = alt?.mitfahrer || [], wunsch = Array.isArray(neu.mitfahrer) ? neu.mitfahrer : [];
      const mitfahrer = [...vorher.filter((id) => !ctx.meine.has(id) || wunsch.includes(id)), ...wunsch.filter((id) => ctx.meine.has(id) && id !== ctx.ich && !vorher.includes(id))];
      if (mitfahrer.length > plaetze) return { ok: false, grund: "VOLL" };
      if (!eigene) { if (!alt) return { ok: false, grund: "NUR_EIGENES_ANGEBOT" }; return { ok: true, zeile: { ...alt, mitfahrer } }; }
      return { ok: true, zeile: { ...(alt || {}), id: alt?.id || neu.id, termin_id: t.id, art, fahrer_id: ctx.ich, richtung: ["hin", "zurueck", "beides"].includes(neu.richtung) ? neu.richtung : "hin", plaetze,
        abfahrt: String(neu.abfahrt || "").slice(0, 120), notiz: String(neu.notiz || "").slice(0, 200), mitfahrer, geloescht_am: neu.geloescht_am ?? null } };
    }
    case "reise_anmeldungen": {
      // 🧳 Eltern melden ihr Kind an bzw. ab (Schüler/Ehemalige sich selbst): bis zum Anmeldeschluss, Warteliste wenn voll; Betrag/bezahlt/Zimmer setzt die Kasse
      const pr = ctx.prMap?.get(neu.projekt_id);
      if (!ctx.meine.has(neu.person_id) || (alt && (alt.person_id !== neu.person_id || alt.projekt_id !== neu.projekt_id))) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (!pr?.anmeldung) return { ok: false, grund: "KEINE_ANMELDUNG" };
      const heute = jetzt.slice(0, 10);
      if (neu.status !== "abgemeldet" && pr.anmeldeschluss && heute > pr.anmeldeschluss) return { ok: false, grund: "ANMELDESCHLUSS" };
      const status = neu.status === "abgemeldet" ? "abgemeldet" : alt?.status === "angemeldet" ? "angemeldet" : (pr.plaetze && (ctx.reiseBelegt.get(pr.id) || 0) >= pr.plaetze ? "warteliste" : "angemeldet");
      return { ok: true, zeile: { ...(alt || {}), id: alt?.id || neu.id, projekt_id: pr.id, person_id: neu.person_id, status, notiz: String(neu.notiz || "").slice(0, 300),
        angemeldet_von: alt?.angemeldet_von || ctx.ich, angemeldet_am: alt?.angemeldet_am || jetzt, betrag: alt?.betrag ?? pr.kosten ?? null, bezahlt: alt?.bezahlt === true } };
    }
    case "gesundheit": {
      // 🩺 Eltern pflegen die Angaben ihrer Kinder; volljährige Schüler ihre eigenen. Jede Bestätigung hält 13 Monate.
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      if (neu.person_id === ctx.ich && istMinderjaehrig(ctx.person)) return { ok: false, grund: "NUR_ELTERN" };
      const felder = TABELLEN.gesundheit.felder.map((f) => f.k).filter((k) => !["geprueft_am", "geprueft_von", "loeschen_am"].includes(k));
      const z = Object.fromEntries(felder.map((k) => [k, typeof neu[k] === "string" ? neu[k].slice(0, 1000) : neu[k] ?? null]));
      const bis = new Date(jetzt); bis.setDate(bis.getDate() + 395);
      return { ok: true, zeile: { ...(alt || {}), ...z, id: alt?.id || neu.id, geprueft_am: jetzt.slice(0, 10), geprueft_von: ctx.ich, loeschen_am: bis.toISOString().slice(0, 10) } };
    }
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
    case "uebungen": {
      // 🎻 Übe-Tagebuch: eigene Einträge bzw. die der Kinder; nur Zahlen, Datum, Stück, feste Inhalte, kurze Notiz
      if (!ctx.meine.has(neu.person_id) || (alt && alt.person_id !== neu.person_id)) return { ok: false, grund: "NICHT_MEINE_PERSON" };
      const min = Number(neu.minuten), tag = String(neu.datum || "");
      if (!neu.geloescht_am) {
        if (!Number.isInteger(min) || min < 1 || min > 600) return { ok: false, grund: "MINUTEN_UNGUELTIG" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || new Date(tag) > new Date(Date.now() + 2 * 86400000)) return { ok: false, grund: "DATUM_UNGUELTIG" };
      }
      const g = neu.gefuehl == null ? null : Number(neu.gefuehl);
      if (g !== null && !(Number.isInteger(g) && g >= 1 && g <= 5)) return { ok: false, grund: "GEFUEHL_UNGUELTIG" };
      const inhalt = Array.isArray(neu.inhalt) ? [...new Set(neu.inhalt.filter((x) => UEBE_INHALT.includes(x)))] : [];
      return { ok: true, zeile: { ...(alt || {}), ...nur(neu, ["id", "person_id", "datum", "minuten", "werk_id", "geloescht_am"]), inhalt, gefuehl: g, notiz: String(neu.notiz || "").slice(0, 500), geteilt: neu.geteilt === true } };
    }
    case "personen":
      // 👪 Eltern ändern Kontaktdaten ihrer (minderjährigen) Kinder direkt – nur diese Felder
      if (alt && ctx.kinder.has(alt.id)) return { ok: true, zeile: { ...alt, ...Object.fromEntries(KIND_KONTAKT.filter((k) => k in neu).map((k) => [k, neu[k] == null ? null : String(neu[k]).slice(0, 200)])) } };
      if (!alt || alt.id !== ctx.ich) return { ok: false, grund: "NUR_EIGENE_EINSTELLUNGEN" };
      { const fg = neu.freigaben && typeof neu.freigaben === "object" ? Object.fromEntries(["geburtstag", "mobil", "email", "adresse"].map((k) => [k, neu.freigaben[k] === true])) : alt.freigaben;
        // 🙂 eigenes Gesicht: nur kleine Zahlen je Merkmal (Haut, Frisur, Haarfarbe, Augen, Mund, Brille, Hintergrund) – nie Bilder oder Text
        const av = neu.avatar === null ? null : neu.avatar && typeof neu.avatar === "object" ? Object.fromEntries(["haut", "frisur", "haar", "augen", "mund", "brille", "farbe"].filter((k) => Number.isInteger(neu.avatar[k]) && neu.avatar[k] >= 0 && neu.avatar[k] < 20).map((k) => [k, neu.avatar[k]])) : alt.avatar;
        const plan = "uebe_plan" in neu ? uebePlanPruefen(neu.uebe_plan) : alt.uebe_plan;
        const alarm = "kalender_alarm" in neu ? ([0, 15, 30, 60, 120, 1440].includes(Number(neu.kalender_alarm)) ? Number(neu.kalender_alarm) : null) : alt.kalender_alarm;
        return { ok: true, zeile: { ...alt, benachrichtigung: neu.benachrichtigung ?? alt.benachrichtigung, freigaben: fg, avatar: av ?? null, uebe_plan: plan ?? null, kalender_alarm: alarm ?? null } }; }
    default:
      return { ok: false, grund: "KEIN_SCHREIBRECHT" };
  }
}

// 🎻 Übezeiten: Wochentage 1–7 (Mo–So), Uhrzeit HH:MM, Dauer und Wochenziel in Minuten, Erinnerung vorher (Minuten)
export function uebePlanPruefen(p) {
  if (!p || typeof p !== "object") return null;
  const tage = Array.isArray(p.tage) ? [...new Set(p.tage.map(Number).filter((t) => Number.isInteger(t) && t >= 1 && t <= 7))].sort() : [];
  const zeit = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.zeit || "")) ? p.zeit : "17:00";
  const zahl = (v, min, max, std) => (Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max ? Number(v) : std);
  return { an: p.an === true, tage, zeit, dauer: zahl(p.dauer, 5, 240, 30), ziel: zahl(p.ziel, 0, 3000, 120), alarm: zahl(p.alarm, 0, 120, 10) };
}
