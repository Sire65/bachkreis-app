// 🛡️ Admin-Bereich (0.43.0, wie KC-Admin: Leitstand · Wächter-Lämpchen · Verlauf · Datenbank-Belegung/Last · Communicator · Versionen · Fehler ·
// Nutzung · Wartungsmodus · Freigaben/Module · Dienste). Sichtbar nur für 🛠️ Admin und 🧑‍💻 Entwickler.
// Rollen: Der Entwickler (technische Verantwortung) bleibt immer und hat alle Admin-Rechte. Ein eigener Admin der Bachkreis-App kann später
// ernannt werden – das darf nur der Entwickler (Server prüft: NUR_ENTWICKLER). Den Entwickler kann niemand löschen oder austragen.
// Grau heißt immer „unbekannt / nicht gemessen“ – nie „in Ordnung“. Es werden nur Zahlen und Namen gezeigt, keine Inhalte (keine Nachrichten).
import { S, VIEWS, zeichne, kopf, name, hatRolle, istEntwickler, fehlerListe } from "./zustand.js";
import { esc, AKTIONEN, toast, vorZeit } from "../kern/ui.js";
import { liste, hole, speichere, konfig, konfigSetzen, istEchtbetrieb, serverAktion, serverAktionStill, datenInfo } from "../kern/daten.js";
import { MODULE, ROLLEN, TABELLEN, TABELLEN_NAMEN } from "../kern/schema.js";
import { APP_VERSION } from "../kern/version.js";
import { adminLedsVerbinden } from "./start.js";

export const istAdmin = () => hatRolle("admin");
const AL = { lage: null, laedt: false, fehler: null, am: 0 };
const mb = (b) => (b == null ? "–" : b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`);
const zahl = (n) => (n == null ? "–" : Number(n).toLocaleString("de-DE"));

// ---------- Messen ----------
// Echtbetrieb: Server-Aktion admin_lage. Vorführversion: nur was auf dem Gerät messbar ist – alles andere bleibt null (grau).
function demoLage() {
  const tag = Date.now() - 86400000, v24 = liste("versand").filter((x) => new Date(x.zeit).getTime() > tag);
  const fb = liste("fehlerberichte"), k = konfig();
  return { demo: true, gemessen: new Date().toISOString(), entwickler: istEntwickler(), datenbank: null, cron: null, netz: null, abfragen: null, pruefung: null, versionen: null, anmeldung: null, verlauf: [],
    tabellen: TABELLEN_NAMEN.map((t) => ({ t: "bk_" + t, b: null, z: liste(t).length, tot: null })).sort((a, b) => b.z - a.z).slice(0, 12),
    versand: v24.reduce((o, x) => ((o[x.status] = (o[x.status] || 0) + 1), o), {}),
    fehler: { offen: fb.filter((f) => !f.erledigt).length, tag: fb.filter((f) => new Date(f.zuletzt).getTime() > tag).length },
    nutzung: { heute: null, woche: null, monat: null, personen: liste("personen", (p) => p.status === "aktiv").length },
    wartung: { an: k.wartung === true, text: k.wartung_text || null }, module_aus: k.module_aus || [] };
}
export async function adminLageLaden(still = false) {
  if (!istAdmin() || AL.laedt) return AL.lage;
  AL.laedt = true;
  try {
    if (!istEchtbetrieb()) { AL.lage = demoLage(); AL.fehler = null; }
    else { const r = await (still ? serverAktionStill : serverAktion)("admin_lage", {}); if (r?.ok) { AL.lage = r; AL.fehler = null; } else AL.fehler = r?.fehler || "nicht möglich"; }
  } catch (e) { AL.fehler = e.message; }
  AL.laedt = false; AL.am = Date.now();
  return AL.lage;
}

// ---------- Wächter-Lämpchen (gruen · gelb · rot · grau) ----------
export function waechter(l = AL.lage) {
  if (!l) return [];
  const g = l.speicher?.grenzen || { db_mb: Number(konfig().grenze_db_mb) || 500, volumen_gb: 5 };
  const anteil = (b, gr) => (b == null ? null : b / (gr * 1048576));
  const stufe = (a) => (a == null ? "grau" : a < 0.7 ? "gruen" : a < 0.9 ? "gelb" : "rot");
  const fehlVersand = (l.versand?.fehler || 0) + (l.versand?.tot || 0);
  const W = [];
  const w = (id, t, f, x) => W.push({ id, t, f, x });
  const db = l.datenbank;
  w("db", "🗄️ Datenbank-Größe", stufe(anteil(db?.bytes, g.db_mb)), db ? `${mb(db.bytes)} von ${g.db_mb} MB (${Math.round(anteil(db.bytes, g.db_mb) * 100)} %)` : "nicht gemessen");
  w("verb", "🔌 Verbindungen", db ? (db.lange > 0 ? "gelb" : "gruen") : "grau", db ? `${db.verbindungen} offen · ${db.lange} Abfragen länger als 1 Min.` : "nicht gemessen");
  w("cache", "⚡ Cache-Treffer", db?.cache == null ? "grau" : db.cache >= 95 ? "gruen" : db.cache >= 85 ? "gelb" : "rot", db?.cache == null ? "nicht gemessen" : `${db.cache} % aus dem Speicher`);
  w("cron", "⏰ Zeitpläne (Wartung, Erinnerungen)", !l.cron ? "grau" : l.cron.fehler24 ? "rot" : "gruen", !l.cron ? "nicht messbar (kein pg_cron)" : `${l.cron.jobs.length} Zeitpläne · ${l.cron.fehler24} Fehler in 24 Std.`);
  w("netz", "🌐 Aufrufe nach außen (pg_net)", !l.netz ? "grau" : l.netz.fehler ? "gelb" : "gruen", !l.netz ? "nicht messbar" : `${l.netz.alle} in 24 Std. · ${l.netz.fehler} mit Fehler`);
  w("pruefung", "🩻 Datenbank-Prüfung", !l.pruefung ? "grau" : l.pruefung.kritisch ? "rot" : l.pruefung.warnungen ? "gelb" : "gruen", !l.pruefung ? "nicht eingerichtet (db_monitor)" : `${l.pruefung.kritisch} kritisch · ${l.pruefung.warnungen} Warnungen`);
  w("versand", "📡 Communicator (Push/Mail)", !l.versand ? "grau" : fehlVersand ? "rot" : (l.versand.wartend || 0) + (l.versand.erneut || 0) > 20 ? "gelb" : l.demo ? "grau" : "gruen", !l.versand ? "nicht gemessen" : `24 Std.: ${Object.entries(l.versand).map(([k, n]) => `${k} ${n}`).join(" · ") || "nichts versendet"}`);
  w("fehler", "🩺 Fehlerberichte der Geräte", !l.fehler ? "grau" : l.fehler.tag > 3 ? "rot" : l.fehler.offen ? "gelb" : "gruen", !l.fehler ? "nicht gemessen" : `${l.fehler.offen} offen · ${l.fehler.tag} in 24 Std.`);
  w("anmeldung", "🔑 Anmeldungen", !l.anmeldung ? "grau" : l.anmeldung.fehl > 20 ? "rot" : l.anmeldung.fehl > 5 ? "gelb" : "gruen", !l.anmeldung ? "nicht gemessen" : `24 Std.: ${l.anmeldung.ok} erfolgreich · ${l.anmeldung.fehl} fehlgeschlagen`);
  const vol = l.speicher?.volumen;
  w("volumen", "📏 Datenvolumen (hochgerechnet 30 Tage)", !vol?.seit ? "grau" : stufe(((vol.bytes / Math.max(1, (Date.now() - new Date(vol.seit).getTime()) / 86400000)) * 30) / (g.volumen_gb * 1073741824)), !vol?.seit ? "noch keine Messung" : `${mb(vol.bytes)} seit ${vorZeit(vol.seit)}`);
  w("spiegel", "🪞 Spiegel & Sicherung", "grau", "noch nicht eingerichtet");
  w("wartung", "🚧 Wartungsmodus", l.wartung?.an ? "gelb" : "gruen", l.wartung?.an ? "AN – nur Admin kann speichern" : "aus");
  return W;
}
const SCHLECHT = { rot: 3, gelb: 2, grau: 1, gruen: 0 };
const schlechteste = (l) => l.reduce((a, b) => (SCHLECHT[b.f] > SCHLECHT[a.f] ? b : a), { f: "gruen" }).f;
// Lämpchen der Admin-Kacheln (start.js) aus der letzten Messung
adminLedsVerbinden(() => {
  const W = waechter(), f = (ids) => schlechteste(W.filter((x) => ids.includes(x.id))), l = AL.lage;
  if (!l) return {};
  const aus = (konfig().module_aus || []).length, rl = adminRollen();
  return {
    lage: [schlechteste(W.filter((x) => x.id !== "spiegel")), `${W.filter((x) => x.f === "rot").length} rot · ${W.filter((x) => x.f === "gelb").length} gelb · ${W.filter((x) => x.f === "grau").length} grau`],
    datenbank: [f(["db", "verb", "cache", "pruefung"]), l.datenbank ? mb(l.datenbank.bytes) : "nicht gemessen"],
    nutzung: [l.nutzung?.heute == null ? "grau" : "gruen", l.nutzung?.heute == null ? "nicht gemessen" : `${l.nutzung.heute} heute · ${l.nutzung.woche} diese Woche`],
    wartung: [l.wartung?.an ? "gelb" : "gruen", l.wartung?.an ? "AN" : "aus"],
    module: [aus ? "gelb" : "gruen", aus ? `${aus} abgeschaltet` : "alle an"],
    rollen: ["gruen", `${rl.entwickler.length} Entwickler · ${rl.admin.length} Admin`],
    spiegel: ["grau", "noch nicht eingerichtet"],
    dienste: ["grau", "Links"],
  };
});
export const adminRollen = () => {
  const p = liste("personen", (x) => x.status !== "ausgetreten");
  return { entwickler: p.filter((x) => (x.rollen || []).includes("entwickler")), admin: p.filter((x) => (x.rollen || []).includes("admin") && !(x.rollen || []).includes("entwickler")) };
};

// ---------- Ansicht ----------
const TEILE = { lage: "🛡️ Leitstand", datenbank: "🗄️ Datenbank", nutzung: "📈 Nutzung & Versionen", wartung: "🚧 Wartungsmodus", module: "🧩 Module freigeben", rollen: "👑 Rollen: Entwickler & Admin", spiegel: "🪞 Spiegel & Sicherung", dienste: "🔗 Dienste & Links" };
const led = (f) => `<i class="led ${f}" aria-hidden="true"></i>`;
const fText = { gruen: "in Ordnung", gelb: "aufpassen", rot: "Problem", grau: "unbekannt" };
const leer = (t) => `<div class="leer">${t}</div>`;
const zeileLed = (x) => `<li><span class="ad-led" role="img" aria-label="${fText[x.f]}">${led(x.f)}</span><div class="fl"><b>${x.t}</b><div class="zeile-unter">${esc(x.x)}</div></div></li>`;
function kopfInfo(l) {
  if (AL.fehler) return `<p class="badge b-rot">⚠️ Messung nicht möglich: ${esc(AL.fehler)}</p>`;
  if (!l) return `<p class="hinweis">wird gemessen …</p>`;
  return `<p class="hinweis">${l.demo ? "🧪 Vorführversion: kein Server – Server-Werte bleiben <b>grau</b> (unbekannt). " : ""}Gemessen ${vorZeit(l.gemessen)} · <button type="button" class="knopf klein" data-a="adMessen">🔄 neu messen</button></p>`;
}
function verlaufSvg(v) {
  const p = (v || []).filter((x) => x.db != null);
  if (p.length < 2) return leer("Noch kein Verlauf – der Server misst einmal pro Stunde (Wartung).");
  const max = Math.max(...p.map((x) => x.db)), min = Math.min(...p.map((x) => x.db)), sp = Math.max(1, max - min), W = 300, H = 60;
  const pts = p.map((x, i) => `${((i / (p.length - 1)) * W).toFixed(1)},${(H - ((x.db - min) / sp) * (H - 6) - 3).toFixed(1)}`).join(" ");
  return `<svg class="ad-verlauf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Datenbank-Größe der letzten 30 Tage: von ${mb(min)} bis ${mb(max)}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg><p class="hinweis">${mb(p[0].db)} → ${mb(p.at(-1).db)} · ${p.length} Messungen · Aufträge offen zuletzt ${zahl(p.at(-1).offen)} · aktiv (1 Std.) ${zahl(p.at(-1).aktiv)}</p>`;
}
const R = {
  lage(l) {
    const W = waechter(l);
    return `<div class="karte"><h3>🚦 Wächter-Lämpchen</h3>${kopfInfo(l)}<ul class="liste ad-waechter">${W.map(zeileLed).join("")}</ul>
      <p class="hinweis">Grün = gemessen und in Ordnung · Gelb = aufpassen · Rot = Problem · <b>Grau = unbekannt</b> (nie „in Ordnung“).</p></div>
      <div class="karte"><h3>📈 Verlauf (30 Tage)</h3>${verlaufSvg(l?.verlauf)}</div>
      <div class="karte"><h3>🧭 Schnell</h3><div class="knopfreihe">${Object.entries(TEILE).filter(([k]) => k !== "lage" && (k !== "dienste" || istEntwickler())).map(([k, t]) => `<button type="button" class="knopf" data-a="adTeil" data-x="${k}">${t}</button>`).join("")}</div></div>`;
  },
  datenbank(l) {
    const db = l?.datenbank, t = l?.tabellen || [];
    return `<div class="karte"><h3>🗄️ Belegung</h3>${kopfInfo(l)}${db ? `<p><b>${mb(db.bytes)}</b> · ${db.verbindungen} Verbindungen · ${db.lange} lange Abfragen · Cache ${db.cache ?? "–"} %</p>` : '<p class="hinweis">⚪ Datenbank nicht gemessen (Vorführversion oder kein Zugriff).</p>'}
      <table class="ad-tab" tabindex="0"><thead><tr><th>Tabelle</th><th>Zeilen</th><th>Größe</th><th>Tote Zeilen</th></tr></thead><tbody>${t.map((x) => `<tr><td>${esc(TABELLEN[x.t.replace(/^bk_/, "")]?.sym || "")} ${esc(x.t)}</td><td>${zahl(x.z)}</td><td>${mb(x.b)}</td><td>${zahl(x.tot)}</td></tr>`).join("")}</tbody></table>
      <p class="hinweis">Nur Tabellennamen und Zahlen – keine Inhalte.</p></div>
      <div class="karte"><h3>🐢 Last: teuerste Abfragen</h3>${!l?.abfragen ? '<p class="hinweis">⚪ nicht messbar (pg_stat_statements fehlt oder Vorführversion)</p>' : `<table class="ad-tab" tabindex="0"><thead><tr><th>Aufrufe</th><th>Ø ms</th><th>gesamt ms</th>${l.entwickler ? "<th>Abfrage</th>" : ""}</tr></thead><tbody>${l.abfragen.map((a) => `<tr><td>${zahl(a.n)}</td><td>${a.ms}</td><td>${zahl(a.gesamt)}</td>${l.entwickler ? `<td><code>${esc(a.q || "")}</code></td>` : ""}</tr>`).join("")}</tbody></table>${l.entwickler ? "" : '<p class="hinweis">Abfragetexte sieht nur der Entwickler.</p>'}`}</div>
      <div class="karte"><h3>⏰ Zeitpläne</h3>${!l?.cron ? '<p class="hinweis">⚪ nicht messbar</p>' : `<ul class="liste">${l.cron.jobs.map((j) => `<li>${led(j.status === "failed" ? "rot" : j.status === "succeeded" ? "gruen" : "grau")}<div class="fl"><b>${esc(j.jobname || "")}</b><div class="zeile-unter">${esc(j.schedule || "")} · ${j.start_time ? vorZeit(j.start_time) : "noch nie gelaufen"}${j.meldung ? " · " + esc(j.meldung) : ""}</div></div></li>`).join("") || "<li>keine Zeitpläne</li>"}</ul>`}</div>
      <div class="karte"><h3>🩻 Prüfung</h3>${!l?.pruefung ? '<p class="hinweis">⚪ db_monitor nicht eingerichtet</p>' : `<p>${led(l.pruefung.kritisch ? "rot" : l.pruefung.warnungen ? "gelb" : "gruen")} Status ${esc(l.pruefung.status || "")} · ${l.pruefung.kritisch} kritisch · ${l.pruefung.warnungen} Warnungen</p>${l.pruefung.liste ? `<ul class="liste">${l.pruefung.liste.map((x) => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>` : ""}`}</div>`;
  },
  nutzung(l) {
    const n = l?.nutzung, fb = liste("fehlerberichte").sort((a, b) => String(b.zuletzt).localeCompare(String(a.zuletzt)));
    return `<div class="karte"><h3>📈 Wer nutzt die App?</h3>${kopfInfo(l)}${n ? `<div class="ad-zahlen"><div><b>${zahl(n.heute)}</b><small>heute</small></div><div><b>${zahl(n.woche)}</b><small>7 Tage</small></div><div><b>${zahl(n.monat)}</b><small>30 Tage</small></div><div><b>${zahl(n.personen)}</b><small>aktive Personen</small></div></div>` : leer("nicht gemessen")}
      <p class="hinweis">Gezählt wird nur „zuletzt gesehen“ je Person – keine Wege, keine Inhalte.</p></div>
      <div class="karte"><h3>📱 Versionen auf den Geräten (30 Tage)</h3>${l?.versionen ? `<ul class="liste">${l.versionen.map((v) => `<li>${led(v.v === APP_VERSION ? "gruen" : v.v === "?" ? "grau" : "gelb")}<div class="fl">v${esc(v.v)}${v.v === APP_VERSION ? " (aktuell)" : ""}</div><b>${v.n}</b></li>`).join("")}</ul>` : '<p class="hinweis">⚪ nicht gemessen</p>'}<p class="hinweis">Diese App: v${APP_VERSION}</p></div>
      <div class="karte"><h3>🩺 Fehlerberichte der Geräte</h3><ul class="liste">${fb.map((f) => `<li>${led(f.erledigt ? "gruen" : "gelb")}<div class="fl"><b>${esc(f.text)}</b><div class="zeile-unter">${esc(f.ansicht || "")} · v${esc(f.app_version || "?")} · ${esc(f.geraet || "")} · ${f.anzahl || 1}× · ${vorZeit(f.zuletzt)}${f.person_id ? " · " + esc(name(f.person_id)) : ""}</div></div>${f.erledigt ? "" : `<button type="button" class="knopf klein" data-a="adFehlerErledigt" data-x="${esc(f.id)}">✅ erledigt</button>`}</li>`).join("") || "<li>Keine Fehler gemeldet.</li>"}</ul>
      <p class="hinweis">Die App meldet Fehler automatisch (nur Fehlertext, Ansicht, Version, Gerät-Art). Dieses Gerät: ${fehlerListe().length} gemerkt.</p></div>`;
  },
  wartung() {
    const k = konfig();
    return `<div class="karte"><h3>🚧 Wartungsmodus</h3><p>Ist er an, sehen alle oben einen Hinweis und <b>nur Admin und Entwickler können speichern</b> (der Server lehnt alles andere ab). Lesen geht weiter.</p>
      <label class="schalter"><span><b>Wartungsmodus</b><div class="hinweis">${k.wartung === true ? "🟡 gerade AN" : "aus"}</div></span><input type="checkbox" data-c="adWartung" ${k.wartung === true ? "checked" : ""}></label>
      <div class="feld"><label for="adWartungText">Hinweis für alle</label><input id="adWartungText" maxlength="160" value="${esc(k.wartung_text || "")}" placeholder="z. B. Heute 18–19 Uhr Umbau – bitte nichts eintragen"></div>
      <button type="button" class="knopf haupt" data-a="adWartungText">💾 Hinweis speichern</button></div>`;
  },
  module() {
    const aus = new Set(konfig().module_aus || []);
    return `<div class="karte"><h3>🧩 Module freigeben</h3><p class="hinweis">Abgeschaltete Module verschwinden für alle von der Startseite. Admin und Entwickler sehen sie weiter (mit 🚫), um sie zu prüfen.</p>
      ${Object.entries(MODULE).map(([k, t]) => `<label class="schalter"><span><b>${esc(t)}</b><div class="hinweis">${aus.has(k) ? "🚫 abgeschaltet" : "✅ an"}</div></span><input type="checkbox" data-c="adModul" data-x="${k}" ${aus.has(k) ? "" : "checked"}></label>`).join("")}</div>`;
  },
  rollen() {
    const rl = adminRollen(), entw = istEntwickler();
    const p = (x, rolle) => `<li><div class="fl"><b>${esc(name(x))}</b><div class="zeile-unter">${esc((x.rollen || []).map((r) => ROLLEN[r] || r).join(" · "))}</div></div>${rolle === "admin" && entw ? `<button type="button" class="knopf klein" data-a="adAdminWeg" data-x="${esc(x.id)}">✕ Admin entziehen</button>` : ""}</li>`;
    return `<div class="karte"><h3>🧑‍💻 Entwickler</h3><p class="hinweis">Technische Verantwortung – bleibt immer und hat alle Admin-Rechte. Niemand kann den Entwickler löschen, austragen oder ihm Rechte nehmen.</p><ul class="liste">${rl.entwickler.map((x) => p(x, "entwickler")).join("") || "<li>⚠️ noch kein Entwickler eingetragen</li>"}</ul></div>
      <div class="karte"><h3>🛠️ Admin der Bachkreis-App</h3><p class="hinweis">Betreut die App im Alltag: Wartungsmodus, Module, App-Einstellungen, Leitstand. Wer das wird, ist noch offen – ernennen kann nur der Entwickler.</p>
      <ul class="liste">${rl.admin.map((x) => p(x, "admin")).join("") || "<li>Noch kein eigener Admin ernannt.</li>"}</ul>
      ${entw ? `<div class="feld"><label for="adNeuAdmin">Admin ernennen</label><select id="adNeuAdmin"><option value="">– Person wählen –</option>${liste("personen", (x) => x.status === "aktiv" && ["leitung", "lehrkraft", "foerderverein", "eltern", "unterstuetzer"].includes(x.typ) && !(x.rollen || []).some((r) => r === "admin" || r === "entwickler")).sort((a, b) => name(a).localeCompare(name(b))).map((x) => `<option value="${esc(x.id)}">${esc(name(x))}</option>`).join("")}</select></div><button type="button" class="knopf haupt" data-a="adAdminNeu">👑 Zum Admin machen</button>` : '<p class="hinweis">🔒 Nur der Entwickler kann Admins ernennen oder entziehen.</p>'}</div>
      <div class="karte"><h3>Wer sieht was im ⚙️ Zahnrad?</h3><ul class="liste"><li>🧒 <b>Kinder</b>: einfache Einstellungen für sich</li><li>👪 <b>Eltern</b>: dazu 👪 Familie</li><li>🎼 <b>Leitungen</b> (Leitung, Lehrkräfte, Vorstand …): dazu 🎼 Leitung</li><li>🛠️ <b>Admin</b>: dazu 🛠️ App-Einstellungen für alle</li><li>🧑‍💻 <b>Entwickler</b>: dazu 🧑‍💻 Technik</li></ul></div>`;
  },
  spiegel() {
    return `<div class="karte"><h3>🪞 Spiegel & Sicherung</h3><ul class="liste">${zeileLed({ f: "grau", t: "🪞 Spiegel nach Neon", x: "noch nicht eingerichtet" })}${zeileLed({ f: "grau", t: "🛟 Nachtsicherung", x: "noch nicht eingerichtet" })}${zeileLed({ f: "grau", t: "📦 Notbetrieb-Paket", x: "noch nicht eingerichtet" })}</ul>
      <p class="hinweis">Vorgesehen wie in der KC Club App: Spiegel der Datenbank zu festen Zeiten, nächtliche Sicherung, Notbetrieb. Bis das eingerichtet ist, bleiben die Lämpchen <b>grau</b>. Bis dahin: Export unter 🛟 Backup / Export.</p>
      <button type="button" class="knopf" data-a="kachel" data-x="ad-backup">🛟 Backup / Export</button></div>`;
  },
  dienste() {
    if (!istEntwickler()) return leer("🔒 Nur für den Entwickler.");
    const L = [["🐙 GitHub (Quelltext, Aktionen)", "https://github.com/Sire65/bachkreis-app"], ["🟢 Supabase (Datenbank, Edge Functions)", "https://supabase.com/dashboard"], ["📄 GitHub Pages (App)", "https://github.com/Sire65/bachkreis-app/settings/pages"]];
    return `<div class="karte"><h3>🔗 Dienste</h3><ul class="liste">${L.map(([t, u]) => `<li><div class="fl"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></div></li>`).join("")}</ul>
      <p class="hinweis">Datenquelle: ${esc(datenInfo().art)} · ${esc(datenInfo().hinweis || "")}</p><p class="hinweis">🔒 Chats sind privat: Auch der Entwickler liest keine Nachrichten – der Leitstand zeigt nur Zahlen.</p></div>`;
  },
};
VIEWS.adminbereich = {
  render({ teil = "lage" } = {}) {
    if (!istAdmin()) return kopf("🛡️ Admin") + leer("🔒 Nur für Admin und Entwickler.");
    const t = TEILE[teil] ? teil : "lage";
    return kopf(TEILE[t], `<span class="badge">${istEntwickler() ? "🧑‍💻 Entwickler" : "🛠️ Admin"}</span>`) + R[t](AL.lage);
  },
  nach(_, { teil = "lage" } = {}) {
    if (istAdmin() && ["lage", "datenbank", "nutzung"].includes(teil) && (!AL.lage || Date.now() - AL.am > 60000) && !AL.laedt) adminLageLaden().then(() => S.view === "adminbereich" && zeichne());
  },
};
AKTIONEN.adTeil = (k) => { S.params = { teil: k }; zeichne(); scrollTo(0, 0); };
AKTIONEN.adMessen = async () => { AL.am = 0; await adminLageLaden(); zeichne(); };
const nurAdmin = () => { if (!istAdmin()) { toast("🔒 Nur für Admin und Entwickler"); return false; } return true; };
async function setzen(k, v, ok = "💾 Gespeichert") {
  if (!nurAdmin()) return;
  try { await konfigSetzen(k, v); toast(ok); } catch (e) { toast("⚠️ " + e.message); }
  if (AL.lage) { AL.lage.wartung = { an: konfig().wartung === true, text: konfig().wartung_text || null }; AL.lage.module_aus = konfig().module_aus || []; }
  wartungsHinweis(); zeichne();
}
AKTIONEN.adWartung = (_, el) => setzen("wartung", !!el.checked, el.checked ? "🚧 Wartungsmodus AN" : "✅ Wartungsmodus aus");
AKTIONEN.adWartungText = () => setzen("wartung_text", String(document.getElementById("adWartungText")?.value || "").trim().slice(0, 160) || null);
AKTIONEN.adModul = (_, el) => { const s = new Set(konfig().module_aus || []); if (el.checked) s.delete(el.dataset.x); else s.add(el.dataset.x); setzen("module_aus", [...s]); };
AKTIONEN.adFehlerErledigt = async (id) => { const f = hole("fehlerberichte", id); if (!f || !nurAdmin()) return; await speichere("fehlerberichte", { ...f, erledigt: true }); toast("✅ erledigt"); zeichne(); };
// 👑 Rollen: nur der Entwickler ernennt/entzieht Admins (Server: NUR_ENTWICKLER); den Entwickler selbst ändert hier niemand
AKTIONEN.adAdminNeu = async () => {
  if (!istEntwickler()) return toast("🔒 Nur der Entwickler");
  const p = hole("personen", document.getElementById("adNeuAdmin")?.value); if (!p) return toast("Bitte eine Person wählen");
  if (!confirm(`${name(p)} zum Admin der Bachkreis-App machen?`)) return;
  try { await speichere("personen", { ...p, rollen: [...new Set([...(p.rollen || []), "admin"])] }); toast(`👑 ${name(p)} ist jetzt Admin`); } catch (e) { toast("⚠️ " + e.message); }
  zeichne();
};
AKTIONEN.adAdminWeg = async (id) => {
  if (!istEntwickler()) return toast("🔒 Nur der Entwickler");
  const p = hole("personen", id); if (!p || (p.rollen || []).includes("entwickler")) return;
  if (!confirm(`${name(p)} die Admin-Rolle entziehen?`)) return;
  try { await speichere("personen", { ...p, rollen: (p.rollen || []).filter((r) => r !== "admin") }); toast("Admin-Rolle entzogen"); } catch (e) { toast("⚠️ " + e.message); }
  zeichne();
};

// ---------- 🚧 Hinweis oben, wenn der Wartungsmodus an ist ----------
export function wartungsHinweis() {
  const k = konfig(), an = k.wartung === true;
  let el = document.getElementById("wartungHinweis");
  if (!an) { el?.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "wartungHinweis"; el.className = "wartung-hinweis"; el.setAttribute("role", "status"); document.body.prepend(el); }
  el.textContent = `🚧 Wartung: ${k.wartung_text || "Gerade wird an der App gearbeitet – bitte vorerst nichts eintragen."}${istAdmin() ? " (Du kannst als Admin weiter speichern.)" : ""}`;
}
document.addEventListener("bk-ansicht", wartungsHinweis);

// ---------- 🩺 Fehler automatisch melden (gleicher Text → Anzahl hoch; höchstens 5 je Sitzung, je Text einmal) ----------
const gemeldet = new Set();
export function fehlerMelden(e) {
  try {
    const text = String(e?.message || e || "").slice(0, 300);
    if (!text || !S.ich || gemeldet.has(text) || gemeldet.size >= 5) return;
    gemeldet.add(text);
    const ua = navigator.userAgent, geraet = `${/iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "anderes"} · ${/Edg\//.test(ua) ? "Edge" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Browser"}`;
    const alt = liste("fehlerberichte", (f) => f.text === text && f.person_id === S.ich.id)[0];
    speichere("fehlerberichte", { ...(alt || {}), text, ansicht: S.view, app_version: APP_VERSION, geraet, anzahl: (alt?.anzahl || 0) + 1, zuletzt: new Date().toISOString(), person_id: S.ich.id, erledigt: false }, { still: true }).catch(() => {});
  } catch {}
}

