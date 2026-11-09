// 💬 Chat-Extras (0.51.0, Paket A wie die KC Club App):
//  👤 Kontakt teilen (KC-CLUB-KONTAKT) – Karte mit „Schreiben“ und „Anrufen“; nur Erwachsene (Kontakte von Kindern werden nie weitergegeben)
//  👥 Konferenz (KC-CLUB-KONFERENZ) – aus einem Gruppen-Chat unter Erwachsenen: nur Ton, bis 4 Personen, über den Runden Tisch
//  🔒 Geheim schreiben (KC-CLUB-VERSCHLUESSELT) – Einzelchat unter Erwachsenen, Ende-zu-Ende verschlüsselt; 🔑 Schlüsselbund fürs zweite Gerät
import { S, VIEWS, db, zeige, zeichne, kopf, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, neueId, istEchtbetrieb, konfig } from "../kern/daten.js";
import { erwachsen, pwAppPerson } from "../kern/schema.js";
import { empfaengerVon } from "../kern/logik.js";
import { gesicht } from "./gesichter.js";
import { anrufKnoepfe } from "./anruf.js";
import { tischDa } from "./tisch.js";
import { geheimTechnik, eigenesPaar, paarErzeugen, verschluesseln, entschluesseln, schluesselbundPacken, schluesselbundAuspacken } from "../kern/geheim.js";

export const GEHEIM_TEXT = "🔒 Geheime Nachricht";
export const KONFERENZ_MAX = 4;
const ich = () => S.ich?.id;
const TYP = { schueler: "Schüler/in", eltern: "Eltern", lehrkraft: "Lehrkraft", leitung: "Leitung", ehemalig: "Ehemalige/r" };

// ---------- 👤 Kontakt teilen ----------
const kontaktKandidaten = () => liste("personen", (p) => p.id !== ich() && p.status === "aktiv" && pwAppPerson(p) && erwachsen(p)).sort((a, b) => name(a).localeCompare(name(b)));
AKTIONEN.kontaktWahl = (uid) => {
  const l = kontaktKandidaten();
  const b = blatt("👤 Kontakt teilen", `<div class="feld"><label for="ktSuche">Wen möchtest du teilen?</label><input id="ktSuche" type="search" placeholder="Name eingeben …" autocomplete="off"></div>
    <ul class="liste kt-liste">${l.map((p) => `<li data-n="${esc(name(p).toLowerCase())}"><span class="kt-bild" aria-hidden="true">${gesicht(p.id, "")}</span><div class="fl"><b>${esc(name(p))}</b><div class="zeile-unter">${esc(TYP[p.typ] || "Bachkreis")}</div></div>
      <button type="button" class="knopf klein haupt" data-a="kontaktSenden" data-x="${esc(uid)}|${esc(p.id)}" aria-label="${esc(name(p))} teilen">Teilen</button></li>`).join("") || "<li>Niemand zum Teilen.</li>"}</ul>
    <p class="hinweis">🔒 Kontakte von Kindern werden nie geteilt.</p>`);
  const s = b?.querySelector?.("#ktSuche") || document.getElementById("ktSuche");
  s?.addEventListener("input", () => { const q = s.value.trim().toLowerCase(); document.querySelectorAll(".kt-liste li[data-n]").forEach((li) => { li.hidden = q && !li.dataset.n.includes(q); }); });
};
AKTIONEN.kontaktSenden = async (x) => {
  const [uid, pid] = String(x).split("|"); blattZu();
  try { const n = await import("./nachrichten.js"); await n.nachrichtDirekt(uid, "", { kontakt: pid }); zeichne(); toast(`👤 ${name(pid)} geteilt`); }
  catch (e) { toast("⚠️ " + (e.message || "Teilen ging nicht")); }
};
export function kontaktHtml(n) {
  if (!n.kontakt) return "";
  const p = hole("personen", n.kontakt);
  if (!p) return '<div class="kontakt-karte"><span>👤</span><b>Kontakt nicht mehr sichtbar</b></div>';
  const selbst = p.id === ich();
  return `<div class="kontakt-karte"><span class="kt-bild" aria-hidden="true">${gesicht(p.id, "")}</span><div class="fl"><b>${esc(name(p))}</b><small>${esc(TYP[p.typ] || "Bachkreis")}${p.mobil && !selbst ? ` · ${esc(p.mobil)}` : ""}</small></div>
    ${selbst ? "" : `<div class="kt-knoepfe"><button type="button" class="knopf klein" data-a="anklopfenSchreiben" data-x="${esc(p.id)}" aria-label="${esc(name(p))} schreiben">💬</button>${anrufKnoepfe(p.id).replace(/chat-kopf-knopf/g, "knopf klein")}</div>`}</div>`;
}

// ---------- 👥 Konferenz ----------
export function konferenzKnopf(u) {
  if (!u || u.art === "einzel" || !tischDa()) return "";
  const l = empfaengerVon(db, u).map((id) => hole("personen", id));
  if (l.length < 2 || !l.every((p) => p && erwachsen(p))) return ""; // 🔒 nur, wenn alle im Chat erwachsen sind
  return `<button type="button" class="chat-kopf-knopf" data-a="konferenzStarten" data-x="${esc(u.id)}" aria-label="Konferenz starten (nur Ton, bis ${KONFERENZ_MAX} Personen)">👥</button>`;
}
AKTIONEN.konferenzStarten = async (uid) => {
  const raum = "k-" + neueId().replace(/[^\w]/g, "").slice(0, 16);
  try { const n = await import("./nachrichten.js"); await n.nachrichtDirekt(uid, "👥 Ich habe eine Konferenz gestartet – komm dazu!", { konferenz: raum }); }
  catch (e) { return toast("⚠️ " + (e.message || "Konferenz ging nicht")); }
  const t = await import("./tisch.js"); zeige("tisch", { raum }); t.beitreten(raum, { nurTon: true });
};
export function konferenzHtml(n) {
  if (!n.konferenz) return "";
  const frisch = Date.now() - new Date(n.zeit).getTime() < 3 * 3600000;
  return `<div class="konf-karte"><span aria-hidden="true">👥</span><div class="fl"><b>Konferenz</b><small>nur Ton · bis ${KONFERENZ_MAX} Personen</small></div>
    ${frisch && tischDa() ? `<button type="button" class="knopf klein haupt" data-a="konferenzBeitreten" data-x="${esc(n.konferenz)}">📞 Dazukommen</button>` : `<small>${frisch ? "nur für Erwachsene" : "vorbei"}</small>`}</div>`;
}
AKTIONEN.konferenzBeitreten = async (raum) => { const t = await import("./tisch.js"); zeige("tisch", { raum }); t.beitreten(raum, { nurTon: true }); };

// ---------- 🔒 Geheim schreiben ----------
const GH = { an: new Set(), klar: new Map(), laeuft: false };
const partnerVon = (u) => (u?.art === "einzel" ? (u.mitglieder || []).find((m) => m !== ich()) : null);
const pubVon = (pid) => liste("geheimschluessel", (k) => k.person_id === pid)[0]?.pub || null;
export const geheimAus = () => (konfig().module_aus || []).includes("geheim");
export function geheimMoeglich(u) {
  const p = hole("personen", partnerVon(u));
  return !!p && geheimTechnik() && !geheimAus() && erwachsen(S.ich) && erwachsen(p); // 🔒 Kinderschutz: bei Kindern bleibt alles für die Eltern lesbar
}
export const geheimAn = (uid) => GH.an.has(uid);
export const geheimKnopf = (u) => (geheimMoeglich(u) ? `<button type="button" class="rund geheim${GH.an.has(u.id) ? " an" : ""}" data-a="geheimUm" data-x="${esc(u.id)}" title="Geheim schreiben – nur ihr zwei könnt es lesen" aria-label="Geheim schreiben" aria-pressed="${GH.an.has(u.id)}">🔒</button>` : "");
export const geheimHinweis = (uid) => (GH.an.has(uid) ? "🔒 Geheim: nur ihr zwei könnt das lesen – nicht einmal der Server. Nur Text, keine Anhänge." : "");

// eigenen Schlüssel sicherstellen: fragt nach, wenn auf einem anderen Gerät schon einer gilt
async function meinPaar({ fragen = true } = {}) {
  const pid = ich(); let paar = await eigenesPaar(pid);
  const server = liste("geheimschluessel", (k) => k.person_id === pid)[0];
  if (paar && server?.pub?.x === paar.pub.x) return paar;
  if (!paar && server?.pub?.x && fragen) { schluesselFrage(); return null; }
  if (!paar) paar = await paarErzeugen(pid);
  await speichere("geheimschluessel", { ...(server || {}), id: pid, person_id: pid, pub: paar.pub, fingerabdruck: paar.fp }, { still: true });
  return paar;
}
function schluesselFrage() {
  blatt("🔑 Schlüssel auf anderem Gerät", `<p>Auf einem anderen Gerät hast du schon einen Schlüssel für geheime Nachrichten.</p>
    <div class="knopfspalte"><button type="button" class="knopf haupt" data-a="kachel" data-x="schluesselbund">📥 Mit dem Schlüsselbund hierher holen</button>
    <button type="button" class="knopf" data-a="geheimNeu">♻️ Hier einen neuen Schlüssel erzeugen</button></div>
    <p class="hinweis">Mit einem neuen Schlüssel kannst du ältere geheime Nachrichten hier nicht lesen – und auf dem anderen Gerät keine neuen.</p>`);
}
AKTIONEN.geheimNeu = async () => { blattZu(); const p = await paarErzeugen(ich()); await speichere("geheimschluessel", { id: ich(), person_id: ich(), pub: p.pub, fingerabdruck: p.fp }, { still: true }); toast("🔑 Neuer Schlüssel gilt ab jetzt"); zeichne(); };
// Partner-Schlüssel: in der Vorführung legt das Gerät ihn bei Bedarf selbst an (die andere Person „ist“ dann dieses Gerät)
async function partnerPub(pid) {
  let pub = pubVon(pid);
  if (pub?.x && pub.x.length > 30 && (await gueltig(pub))) return pub;
  if (istEchtbetrieb()) return null;
  const p = (await eigenesPaar(pid)) || (await paarErzeugen(pid));
  await speichere("geheimschluessel", { id: pid, person_id: pid, pub: p.pub, fingerabdruck: p.fp }, { still: true });
  return p.pub;
}
async function gueltig(pub) { try { await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: pub.x, y: pub.y }, { name: "ECDH", namedCurve: "P-256" }, false, []); return true; } catch { return false; } }
AKTIONEN.geheimUm = async (uid) => {
  if (GH.an.has(uid)) { GH.an.delete(uid); toast("🔓 Wieder normal"); return zeichne(); }
  const u = hole("unterhaltungen", uid); if (!geheimMoeglich(u)) return toast("🔒 Geheim schreiben geht nur im Einzelchat unter Erwachsenen.");
  const paar = await meinPaar(); if (!paar) return;
  if (!(await partnerPub(partnerVon(u)))) return toast(`🔑 ${name(partnerVon(u)).split(" ")[0]} hat Geheim schreiben noch nie benutzt – sobald es einmal eingeschaltet wurde, geht es.`, 5000);
  GH.an.add(uid); toast("🔒 Geheim: nur ihr zwei könnt es lesen"); zeichne();
};
// beim Senden: Text verschlüsseln (liefert die Felder für die Nachricht)
export async function geheimVerpacken(uid, klartext) {
  const u = hole("unterhaltungen", uid), paar = await meinPaar({ fragen: false }), pub = await partnerPub(partnerVon(u));
  if (!paar || !pub) throw new Error("Schlüssel fehlt");
  const g = await verschluesseln(paar, pub, klartext);
  return { text: GEHEIM_TEXT, geheim: g, klar: klartext };
}
export const geheimMerken = (id, klartext) => GH.klar.set(id, klartext);
// Anzeige in der Blase: sofort, wenn schon entschlüsselt – sonst Platzhalter, den geheimFuellen() ersetzt
export function geheimHtml(n, format) {
  const k = GH.klar.get(n.id);
  return `<div class="txt geheim-txt" ${k == null ? `data-geheim="${esc(n.id)}"` : ""}><span class="geheim-marke" title="Ende-zu-Ende verschlüsselt">🔒</span> ${k == null ? "<i>wird entschlüsselt …</i>" : format(k)}</div>`;
}
export async function geheimFuellen(format) {
  if (GH.laeuft || typeof document === "undefined") return;
  const els = [...document.querySelectorAll("[data-geheim]")]; if (!els.length) return;
  GH.laeuft = true;
  try {
    const paar = await eigenesPaar(ich());
    for (const el of els) {
      const n = hole("nachrichten", el.dataset.geheim), u = n && hole("unterhaltungen", n.unterhaltung_id);
      let t = null;
      try { const pub = paar && pubVon(partnerVon(u)); if (paar && pub && n?.geheim) t = await entschluesseln(paar, pub, n.geheim); } catch {}
      el.removeAttribute("data-geheim");
      if (t == null) { el.innerHTML = '<span class="geheim-marke">🔒</span> <i>Auf diesem Gerät nicht lesbar – <button type="button" class="link" data-a="kachel" data-x="schluesselbund">🔑 Schlüsselbund</button></i>'; continue; }
      GH.klar.set(n.id, t); el.innerHTML = `<span class="geheim-marke" title="Ende-zu-Ende verschlüsselt">🔒</span> ${format(t)}`;
    }
  } finally { GH.laeuft = false; }
}

// ---------- 🔑 Schlüsselbund (Ansicht) ----------
const SB = { paar: undefined, paket: null };
VIEWS.schluesselbund = {
  render() {
    const p = SB.paar;
    return kopf("🔑 Schlüsselbund") + `<p class="hinweis">Für 🔒 geheime Nachrichten hat jedes Gerät einen Schlüssel. Nur damit lassen sie sich lesen – der Bachkreis-Server sieht nur Zeichensalat.</p>
      <div class="karte"><h3>Dein Schlüssel auf diesem Gerät</h3>${p === undefined ? "<p>wird geladen …</p>" : p ? `<p>Fingerabdruck: <code>${esc(p.fp)}</code><br><small>seit ${esc(new Date(p.seit).toLocaleDateString("de-DE"))}</small></p>` : "<p>Noch keiner – er entsteht, sobald du zum ersten Mal 🔒 einschaltest.</p>"}</div>
      <div class="karte"><h3>📤 Auf ein anderes Gerät mitnehmen</h3>${p ? `<div class="feld"><label for="sbPw1">Passwort (mind. 8 Zeichen, merken!)</label><input id="sbPw1" type="password" autocomplete="new-password" minlength="8"></div>
        <button type="button" class="knopf haupt" data-a="sbPacken">🔐 Schlüsselbund erzeugen</button>${SB.paket ? `<div class="feld"><label for="sbText">Diesen Text auf dem anderen Gerät einfügen:</label><textarea id="sbText" rows="4" readonly>${esc(SB.paket)}</textarea></div><button type="button" class="knopf" data-a="sbKopieren">📋 Kopieren</button>` : ""}` : "<p class=\"hinweis\">Erst ab dem ersten Schlüssel.</p>"}</div>
      <div class="karte"><h3>📥 Von einem anderen Gerät holen</h3><div class="feld"><label for="sbEin">Schlüsselbund-Text</label><textarea id="sbEin" rows="3" placeholder="BKSB1.…"></textarea></div>
        <div class="feld"><label for="sbPw2">Passwort</label><input id="sbPw2" type="password" autocomplete="current-password"></div><button type="button" class="knopf haupt" data-a="sbHolen">📥 Übernehmen</button></div>`;
  },
  nach() { if (SB.paar === undefined && S.ich) eigenesPaar(ich()).then((p) => { SB.paar = p || null; zeichne(); }).catch(() => { SB.paar = null; zeichne(); }); },
};
AKTIONEN.sbPacken = async () => { const pw = document.getElementById("sbPw1")?.value || ""; if (pw.length < 8) return toast("Bitte mindestens 8 Zeichen."); SB.paket = await schluesselbundPacken(SB.paar, pw); zeichne(); };
AKTIONEN.sbKopieren = async () => { try { await navigator.clipboard.writeText(SB.paket); toast("📋 Kopiert"); } catch { document.getElementById("sbText")?.select(); toast("Bitte markieren und kopieren"); } };
AKTIONEN.sbHolen = async () => {
  try {
    const p = await schluesselbundAuspacken(ich(), document.getElementById("sbEin")?.value, document.getElementById("sbPw2")?.value || "");
    await speichere("geheimschluessel", { ...(liste("geheimschluessel", (k) => k.person_id === ich())[0] || {}), id: ich(), person_id: ich(), pub: p.pub, fingerabdruck: p.fp }, { still: true });
    SB.paar = p; GH.klar.clear(); toast("🔑 Schlüssel übernommen – geheime Nachrichten sind hier jetzt lesbar"); zeichne();
  } catch (e) { toast("⚠️ " + e.message, 5000); }
};
