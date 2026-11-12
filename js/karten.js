// 🎟️ Konzertkarten reservieren (0.56.0): öffentliche Seite für Besucher ohne Konto. Der Link (karten.html#k=…) gehört zu EINEM Konzert.
// Besucher sehen Titel, Zeit, Ort, Hinweis und freie Plätze, reservieren mit Name (E-Mail freiwillig) und bekommen eine Reservierungs-Nr.
// für die Abendkasse; mit der Nr. lässt sich die Reservierung auch wieder stornieren. Keine Cookies, kein Tracking.
// In der Vorführversion (ohne Server) läuft alles nur in diesem Browser-Tab.
import { UMGEBUNG } from "./kern/umgebung.js";

const SERVER_AKTION = "karten"; // Server-Aktion ohne Anmeldung (nur mit Karten-Link)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const inhalt = () => document.getElementById("inhalt");
const K = { k: (/[#&]k=([\w-]+)/.exec(location.hash) || [])[1] || "", konzert: null, demo: !UMGEBUNG.apiUrl, meine: [] };
const FEHLER = {
  LINK_UNGUELTIG: "Diesen Karten-Link gibt es nicht (mehr). Bitte den Link aus der Einladung oder vom Plakat nehmen.",
  AUSVERKAUFT: "Leider sind nicht mehr genug Plätze frei.", VORBEI: "Das Konzert hat schon begonnen – reservieren geht nicht mehr.",
  NAME_FEHLT: "Bitte deinen Namen eintragen.", EMAIL_UNGUELTIG: "Die E-Mail-Adresse sieht nicht richtig aus.", ANZAHL_UNGUELTIG: "Bitte die Anzahl der Karten prüfen.",
  ZU_VIELE: "Von diesem Anschluss kamen gerade sehr viele Reservierungen. Bitte später noch einmal versuchen.",
  CODE_UNBEKANNT: "Zu dieser Reservierungs-Nr. gibt es keine offene Reservierung.", CODE_UNGUELTIG: "Die Reservierungs-Nr. hat 6 Zeichen.",
};
try { K.meine = JSON.parse(localStorage.getItem("bk_karten_" + K.k) || "[]"); } catch { K.meine = []; }
const merken = () => { try { localStorage.setItem("bk_karten_" + K.k, JSON.stringify(K.meine.slice(-5))); } catch {} };

// ---------- Vorführversion: kleiner Ersatz-Server im Tab ----------
const DEMO = { titel: "Weihnachtskonzert des Bachkreises", ort: "Martin-Luther-Kirche Bergkamen", hinweis: "Eintritt frei – um eine Spende wird gebeten. Einlass 30 Minuten vorher.", plaetze: 180, je: 6 };
function demoServer(unter, rest) {
  const beginn = new Date(Date.now() + 20 * 86400000); beginn.setHours(17, 0, 0, 0);
  let l = []; try { l = JSON.parse(sessionStorage.getItem("bk_karten_demo") || "[]"); } catch {}
  const frei = () => DEMO.plaetze - 37 - l.filter((x) => x.status !== "storniert").reduce((s, x) => s + x.anzahl, 0);
  const konzert = () => ({ titel: DEMO.titel, beginn: beginn.toISOString(), ort: DEMO.ort, hinweis: DEMO.hinweis, je: DEMO.je, frei: frei(), vorbei: false });
  const raus = () => { try { sessionStorage.setItem("bk_karten_demo", JSON.stringify(l)); } catch {} };
  if (unter === "info") return { ok: true, konzert: konzert() };
  if (unter === "reservieren") {
    const n = Math.round(Number(rest.anzahl));
    if (String(rest.name || "").trim().length < 2) throw Object.assign(new Error(), { code: "NAME_FEHLT" });
    if (!(n >= 1 && n <= DEMO.je)) throw Object.assign(new Error(), { code: "ANZAHL_UNGUELTIG" });
    if (n > frei()) throw Object.assign(new Error(), { code: "AUSVERKAUFT" });
    const code = Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
    l.push({ code, anzahl: n, status: "reserviert" }); raus(); return { ok: true, code, anzahl: n, konzert: konzert() };
  }
  if (unter === "stornieren") { const r = l.find((x) => x.code === String(rest.code || "").toUpperCase() && x.status === "reserviert"); if (!r) throw Object.assign(new Error(), { code: "CODE_UNBEKANNT" }); r.status = "storniert"; raus(); return { ok: true, konzert: konzert() }; }
  throw new Error("unbekannt");
}

async function api(unter, rest = {}) {
  if (K.demo) return demoServer(unter, rest);
  const r = await fetch(UMGEBUNG.apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion: SERVER_AKTION, k: K.k, unter, ...rest }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw Object.assign(new Error(j.fehler || "Fehler " + r.status), { code: j.fehler, konzert: j.konzert });
  return j;
}
const wann = (iso) => new Date(iso).toLocaleString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr";
const kopf = () => `<div class="karte karten-kopf"><img src="icons/logo.png" alt="" width="64" height="64"><div><p class="karten-verein">Bachkreis Bergkamen</p><h1>🎟️ Konzertkarten</h1></div></div>`;

function zeigen(meldung = "") {
  const k = K.konzert, voll = k.frei != null && k.frei < 1, max = Math.max(1, Math.min(k.je, k.frei ?? k.je));
  inhalt().innerHTML = kopf() + (K.demo ? `<p class="karte karten-demo" role="note">🧪 Vorführversion – Reservierungen bleiben nur in diesem Browser-Tab.</p>` : "") + `
  <section class="karte karten-konzert" aria-labelledby="kTitel"><h2 id="kTitel">${esc(k.titel)}</h2>
    <p>📅 <b>${esc(wann(k.beginn))}</b></p>${k.ort ? `<p>📍 ${esc(k.ort)}</p>` : ""}${k.hinweis ? `<p class="karten-hinweis">ℹ️ ${esc(k.hinweis)}</p>` : ""}
    <p class="karten-frei ${voll ? "voll" : ""}" aria-live="polite">${k.vorbei ? "Das Konzert hat begonnen." : voll ? "😔 Ausgebucht" : k.frei == null ? "Plätze frei" : `<b>${k.frei}</b> Plätze frei`}</p></section>
  ${meldung}
  ${K.meine.length ? `<section class="karte"><h2>Deine Reservierungen</h2><ul class="karten-meine">${K.meine.map((m) => `<li><b class="karten-code">${esc(m.code)}</b> · ${m.anzahl} Karte${m.anzahl > 1 ? "n" : ""} · ${esc(m.name)}</li>`).join("")}</ul></section>` : ""}
  ${k.vorbei || voll ? "" : `<form class="karte karten-form" id="kForm" novalidate><h2>Karten reservieren</h2>
    <label>Dein Name <input name="name" autocomplete="name" required maxlength="80"></label>
    <label>E-Mail <small>(freiwillig, nur für Rückfragen)</small> <input name="email" type="email" autocomplete="email" maxlength="120"></label>
    <label>Anzahl Karten <select name="anzahl">${Array.from({ length: max }, (_, i) => `<option${i === 1 && max > 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label>
    <p class="hinweis">Deine Angaben sieht nur das Team des Bachkreises (Leitung, Vorstand). Sie werden 30 Tage nach dem Konzert gelöscht.</p>
    <button class="knopf haupt breit" type="submit">🎟️ Verbindlich reservieren</button></form>`}
  <details class="karte"><summary>Reservierung stornieren</summary><form id="kStorno" class="karten-form" novalidate>
    <label>Reservierungs-Nr. <input name="code" maxlength="6" autocomplete="off" autocapitalize="characters" pattern="[A-Za-z0-9]{6}"></label>
    <button class="knopf breit" type="submit">Stornieren</button></form></details>
  <p class="karten-fuss">Bachkreis Bergkamen · Jugendsinfonieorchester</p>`;
  document.getElementById("kForm")?.addEventListener("submit", reservieren);
  document.getElementById("kStorno")?.addEventListener("submit", stornieren);
}
const hinweis = (t, art = "fehler") => `<div class="karte karten-meldung ${art}" role="${art === "fehler" ? "alert" : "status"}">${t}</div>`;

async function reservieren(e) {
  e.preventDefault();
  const f = new FormData(e.target), knopf = e.target.querySelector("button"); knopf.disabled = true;
  try {
    const r = await api("reservieren", { name: f.get("name"), email: f.get("email"), anzahl: Number(f.get("anzahl")) });
    K.konzert = r.konzert; K.meine.push({ code: r.code, anzahl: r.anzahl, name: String(f.get("name")).trim() }); merken();
    zeigen(hinweis(`<h2>✅ Reserviert!</h2><p>Deine Reservierungs-Nr.:</p><p class="karten-code gross">${esc(r.code)}</p><p>${r.anzahl} Karte${r.anzahl > 1 ? "n" : ""} – bitte die Nr. an der Abendkasse nennen (gern als Bildschirmfoto). Wir freuen uns auf dich! 🎻</p>`, "ok"));
    document.querySelector(".karten-meldung")?.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    if (err.konzert) K.konzert = err.konzert;
    zeigen(hinweis(FEHLER[err.code] || "Das hat nicht geklappt. Bitte gleich noch einmal versuchen."));
  }
}
async function stornieren(e) {
  e.preventDefault();
  const code = String(new FormData(e.target).get("code") || "").toUpperCase().trim();
  if (!confirm(`Reservierung ${code} wirklich stornieren?`)) return;
  try { const r = await api("stornieren", { code }); K.konzert = r.konzert; K.meine = K.meine.filter((m) => m.code !== code); merken(); zeigen(hinweis(`Reservierung <b>${esc(code)}</b> ist storniert. Die Plätze sind wieder frei.`, "ok")); }
  catch (err) { zeigen(hinweis(FEHLER[err.code] || "Das hat nicht geklappt.")); }
}

(async () => {
  if (!K.k && !K.demo) { inhalt().innerHTML = kopf() + hinweis(FEHLER.LINK_UNGUELTIG); return; }
  try { K.konzert = (await api("info")).konzert; zeigen(); }
  catch (err) { inhalt().innerHTML = kopf() + hinweis(FEHLER[err.code] || "Der Server ist gerade nicht erreichbar. Bitte später noch einmal versuchen."); }
})();
