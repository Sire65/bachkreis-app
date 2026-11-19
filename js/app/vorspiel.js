// 🎙️ Vorspiel (0.79.0, Wunsch Hansi 18.11.: „zuhause ein Stück spielen und aufnehmen und die Aufnahme z. B. zu Frau Jacka schicken …
// Das Probestück muss sich wieder nur an eine Gruppe, Auswahl senden lassen. Aber einfache Bedienung.“ – Team: Kinder dürfen auch an
// Register und Orchester senden, 30 Tage aufbewahren (einstellbar), alle Freigegebenen hören zu, Live-Vorspiel einplanen).
// Ablauf: ① ein großer Knopf zum Aufnehmen (Musik-Modus: Mikrofon ohne Sprachfilter) ② anhören → „An wen?“ → senden
// ③ Empfänger hören (auch „auf der Bühne“), antworten mit einem Tipp, Text oder einer Sprachantwort; das Kind sieht „✔ gehört“.
// Wer was sehen darf, erzwingt der Server (regeln.js: vorspiele, vorspiel_antworten). Kinder nur mit Einwilligung „Übe-Aufnahmen“.
import { S, VIEWS, db, kopf, name, vorname, hatRolle, istEltern, zeichne, einst, einstSetzen } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage, vorZeit, datumKurz } from "../kern/ui.js";
import { liste, hole, speichere, loesche, konfig, konfigSetzen, istEchtbetrieb } from "../kern/daten.js";
import { kinderVon, registerVon, einwilligung, tagIso } from "../kern/logik.js";
import { istMinderjaehrig, vorspielTage, VORSPIEL_TIPPS, VORSPIEL_MAX_SEK, VORSPIEL_TAGE_MIN, VORSPIEL_TAGE_MAX } from "../kern/schema.js";
import { hochladen, dateiUrl, groesseText } from "../kern/dateien.js";
import { aufnahme, aufnahmeMoeglich, dauerText } from "./sprache.js";
import { anrufen, anrufAn } from "./anruf.js";
import { musikAdresse } from "../kern/musikort.js";

const V = { schritt: "start", fuer: null, rec: null, blob: null, url: null, dauer: 0, uhr: 0, pegel: 0, ctx: null, an_art: "lehrkraft", auswahl: new Set(), stueck: "", notiz: "", antwortRec: null, offen: null };
const heute = () => tagIso(new Date());
const LEHR_ROLLEN = ["leitung", "lehrkraft"];
const istLehrkraftP = (p) => !!p && !p.geloescht_am && p.status !== "ausgetreten" && ((p.rollen || []).some((r) => LEHR_ROLLEN.includes(r)) || LEHR_ROLLEN.includes(p.typ));

// ---------- Wer spielt, wer hört ----------
const fuerWen = () => { const k = istEltern() ? kinderVon(db, S.ich.id) : []; return k.length ? k : [S.ich.id]; };
export const darfAufnehmen = (pid) => { const p = hole("personen", pid); return !!p && (!istMinderjaehrig(p) || einwilligung(db, pid, "uebeaufnahmen") === "ja"); };
const lehrkraefte = () => liste("personen", istLehrkraftP).sort((a, b) => name(a.id).localeCompare(name(b.id)));
// vorgeschlagene Lehrkraft: zuletzt gewählt → wer dem Kind zuletzt eine Übe-Aufgabe gegeben hat → Leitung
function meineLehrkraft(pid) {
  const gemerkt = (einst().vorspielLehrkraft || {})[pid]; if (gemerkt && istLehrkraftP(hole("personen", gemerkt))) return gemerkt;
  const a = liste("uebeaufgaben", (x) => !x.geloescht_am && x.von_id && (x.person_id === pid || !x.person_id)).sort((x, y) => String(y.erstellt_am || "").localeCompare(String(x.erstellt_am || "")))[0];
  if (a && istLehrkraftP(hole("personen", a.von_id))) return a.von_id;
  return lehrkraefte().find((p) => (p.rollen || []).includes("leitung"))?.id || lehrkraefte()[0]?.id || null;
}
const registerLeute = (pid) => { const r = registerVon(db, pid); return r ? [...new Set(liste("person_instrument", (x) => !x.geloescht_am && x.register_id === r).map((x) => x.person_id))].filter((x) => x !== pid && hole("personen", x)?.status !== "ausgetreten") : []; };
const meineGruppen = (pid) => liste("gruppe_zuordnung", (z) => z.person_id === pid && !z.geloescht_am && (!z.bis || String(z.bis).slice(0, 10) >= heute()) && !hole("gruppen", z.gruppe_id)?.ehemalige).map((z) => z.gruppe_id);
const orchesterLeute = (pid) => { const g = new Set(meineGruppen(pid)); return [...new Set(liste("gruppe_zuordnung", (z) => !z.geloescht_am && g.has(z.gruppe_id) && (!z.bis || String(z.bis).slice(0, 10) >= heute())).map((z) => z.person_id))].filter((x) => x !== pid); };
export function empfaengerFuer(pid, art, { lehrkraft = meineLehrkraft(pid), auswahl = [] } = {}) {
  const mit = (l) => [...new Set([...(lehrkraft ? [lehrkraft] : []), ...l])].filter((x) => x !== pid);
  if (art === "register") return mit(registerLeute(pid));
  if (art === "orchester") return mit(orchesterLeute(pid));
  if (art === "auswahl") return [...new Set(auswahl)].filter((x) => x !== pid);
  return lehrkraft ? [lehrkraft] : [];
}
const registerName = (pid) => hole("register", registerVon(db, pid))?.name || "Register";
const orchesterName = (pid) => meineGruppen(pid).map((g) => hole("gruppen", g)?.name).filter(Boolean).join(" · ") || "Orchester";

// ---------- Listen ----------
const aktiv = (v) => !v.geloescht_am && (!v.loeschen_am || v.loeschen_am >= heute());
const antworten = (vid) => liste("vorspiel_antworten", (a) => a.vorspiel_id === vid && !a.geloescht_am).sort((a, b) => String(a.erstellt_am || "").localeCompare(String(b.erstellt_am || "")));
const gehoertVonMir = (v) => antworten(v.id).some((a) => a.von === S.ich.id);
export const fuerMich = () => liste("vorspiele", (v) => aktiv(v) && (v.an || []).includes(S.ich?.id)).sort((a, b) => String(b.erstellt_am || "").localeCompare(String(a.erstellt_am || "")));
const gesendet = () => { const m = new Set(fuerWen()); return liste("vorspiele", (v) => aktiv(v) && m.has(v.von)).sort((a, b) => String(b.erstellt_am || "").localeCompare(String(a.erstellt_am || ""))); };
const restTage = (v) => (v.loeschen_am ? Math.max(0, Math.round((new Date(v.loeschen_am + "T12:00") - new Date()) / 86400000)) : null);
const instSym = (pid) => ({ "r-v1": "🎻", "r-v2": "🎻", "r-va": "🎻", "r-vc": "🎻", "r-kb": "🎻", "r-fl": "🪈", "r-ob": "🎷", "r-kl": "🎷", "r-fg": "🎷", "r-hr": "📯", "r-tr": "🎺", "r-pos": "🎺", "r-pk": "🥁" })[registerVon(db, pid)] || "🎵";
const ANART = { lehrkraft: "👩‍🏫", register: "🎻", orchester: "🎼", auswahl: "☑️" };

function zeileFuerMich(v) {
  const neu = !gehoertVonMir(v);
  return `<li><button type="button" class="vs-zeile" data-a="vsOeffnen" data-x="${esc(v.id)}"><span class="vs-sym">${instSym(v.von)}</span><span class="fl"><b>${esc(vorname(v.von))} · ${esc(v.stueck || "Vorspiel")}</b>
    <small>${vorZeit(v.erstellt_am)}${v.dauer_sek ? ` · ${dauerText(v.dauer_sek)}` : ""}${v.notiz ? ` · „${esc(v.notiz.slice(0, 40))}${v.notiz.length > 40 ? "…" : ""}“` : ""}</small></span>${neu ? '<span class="vs-neu">neu</span>' : '<span class="vs-ok">✔</span>'}</button></li>`;
}
function zeileGesendet(v) {
  const a = antworten(v.id), gehoert = [...new Set(a.map((x) => x.von))], n = a.filter((x) => x.art !== "gehoert").length;
  const stand = gehoert.length ? `✔ gehört von ${gehoert.slice(0, 2).map((x) => esc(name(x))).join(", ")}${gehoert.length > 2 ? ` +${gehoert.length - 2}` : ""}${n ? ` · 💬 ${n}` : ""}` : "⏳ noch nicht gehört";
  return `<li><button type="button" class="vs-zeile" data-a="vsOeffnen" data-x="${esc(v.id)}"><span class="vs-sym">${ANART[v.an_art] || "📨"}</span><span class="fl"><b>${fuerWen().length > 1 ? esc(vorname(v.von)) + " · " : ""}${esc(v.stueck || "Vorspiel")}</b>
    <small>${vorZeit(v.erstellt_am)} · an ${(v.an || []).length === 1 ? esc(name(v.an[0])) : `${(v.an || []).length} Personen`}</small><small class="${gehoert.length ? "vs-gruen" : ""}">${stand}</small></span>${n ? '<span class="vs-neu">💬</span>' : ""}</button></li>`;
}

// ---------- Ansicht ----------
VIEWS.vorspiel = {
  render() {
    if (!fuerWen().includes(V.fuer)) V.fuer = fuerWen()[0];
    const fm = fuerMich(), gs = gesendet(), lehrt = istLehrkraftP(S.ich);
    // Lehrkräfte/Leitung: zuerst „Für mich“ (zum Anhören), Kinder: zuerst Aufnehmen
    return kopf("🎙️ Vorspiel") + `<div class="vs">
      ${lehrt ? "" : aufnahmeKarte()}
      ${lehrt && !fm.length ? '<div class="karte"><h3>🎧 Für mich</h3><p class="hinweis">Noch keine Vorspiele – Kinder schicken sie hier hin.</p></div>' : ""}
      ${fm.length ? `<div class="karte"><h3>🎧 Für mich <span class="hinweis">${fm.filter((v) => !gehoertVonMir(v)).length} neu</span></h3><ul class="vs-liste">${fm.map(zeileFuerMich).join("")}</ul></div>` : ""}
      ${gs.length ? `<div class="karte"><h3>📤 Gesendet</h3><ul class="vs-liste">${gs.map(zeileGesendet).join("")}</ul><p class="hinweis">Vorspiele werden nach ${vorspielTage(konfig())} Tagen automatisch gelöscht.</p></div>` : ""}
      ${lehrt ? aufnahmeKarte() : ""}
      ${liveKarte()}
      ${hatRolle("leitung", "admin") ? `<div class="karte"><h3>⚙️ Aufbewahrung</h3><div class="vs-tage"><label for="vsTage">Vorspiele löschen nach</label><input id="vsTage" type="number" min="${VORSPIEL_TAGE_MIN}" max="${VORSPIEL_TAGE_MAX}" value="${vorspielTage(konfig())}" inputmode="numeric"><span>Tagen</span><button type="button" class="knopf" data-a="vsTage">💾</button></div><p class="hinweis">Gilt für neue Vorspiele (Standard 30 Tage). Auch unter ⚙️ Einstellungen › Admin.</p></div>` : ""}
    </div>`;
  },
  nach() { if (V.schritt === "aufnahme") pegelZeigen(); },
};

function aufnahmeKarte() {
  const pid = V.fuer, wer = fuerWen();
  const werWahl = wer.length > 1 ? `<div class="vs-wer">${wer.map((k) => `<button type="button" class="chip-wahl${k === pid ? " an" : ""}" data-a="vsFuer" data-x="${esc(k)}">${esc(vorname(k))}</button>`).join("")}</div>` : "";
  if (!aufnahmeMoeglich()) return `<div class="karte"><h3>🎙️ Vorspiel aufnehmen</h3><p>Dieses Gerät kann leider nicht aufnehmen – bitte am Handy oder Tablet versuchen.</p></div>`;
  if (!darfAufnehmen(pid)) return `<div class="karte"><h3>🎙️ Vorspiel aufnehmen</h3>${werWahl}<p>Für ${esc(vorname(pid))} fehlt noch die Einwilligung der Eltern <b>„🎙️ Übe-Aufnahmen“</b>.</p>
    <button type="button" class="knopf" data-a="kachel" data-x="${istEltern() ? "meinegenehmigungen" : "kinderschutz"}">${istEltern() ? "✍️ Jetzt einwilligen" : "🛡️ Mehr dazu"}</button></div>`;
  if (V.schritt === "aufnahme") return `<div class="karte vs-rec"><h3>🎙️ Aufnahme läuft</h3>
    <button type="button" class="vs-knopf an" data-a="vsStopp" aria-label="Aufnahme beenden"><span>⏹</span></button>
    <div class="vs-zeit" id="vsZeit">0:00</div><div class="vs-pegel" id="vsPegel" aria-hidden="true">${"<i></i>".repeat(14)}</div>
    <p class="hinweis">🎵 Musik-Modus: das Mikrofon läuft ohne Sprachfilter · höchstens ${VORSPIEL_MAX_SEK / 60} Minuten</p></div>`;
  if (V.schritt === "pruefen") {
    const lk = meineLehrkraft(pid), opt = [
      ["lehrkraft", "👩‍🏫", lk ? esc(name(lk)) : "Lehrkraft", "meine Lehrkraft"],
      ["register", "🎻", `Mein Register`, `${esc(registerName(pid))} · ${registerLeute(pid).length} Personen${lk ? " + Lehrkraft" : ""}`],
      ["orchester", "🎼", "Mein Orchester", `${esc(orchesterName(pid))} · ${orchesterLeute(pid).length} Personen`],
      ["auswahl", "☑️", "Auswahl …", V.auswahl.size ? `${V.auswahl.size} ausgewählt` : "einzelne Personen ankreuzen"],
    ];
    return `<div class="karte vs-pruefen"><h3>📨 Vorspiel senden</h3>
      <audio controls src="${V.url}" class="vs-audio"></audio><p class="hinweis">${dauerText(V.dauer)} · ${groesseText(V.blob.size)} – erst anhören, dann senden</p>
      <div class="feld"><label for="vsStueck">Stück (freiwillig)</label><input id="vsStueck" maxlength="80" value="${esc(V.stueck)}" placeholder="z. B. Menuett G-Dur, Takt 1–16" data-c="vsFeld" data-x="stueck"></div>
      <p class="vs-frage">An wen?</p>
      <div class="vs-wahl">${opt.map(([k, s, t, u]) => `<button type="button" class="vs-option${V.an_art === k ? " an" : ""}" data-a="vsAn" data-x="${k}" aria-pressed="${V.an_art === k}"><span>${s}</span><span><b>${t}</b><small>${u}</small></span></button>`).join("")}</div>
      ${V.an_art === "lehrkraft" && lehrkraefte().length > 1 ? `<div class="feld"><label for="vsLk">Lehrkraft</label><select id="vsLk" data-c="vsLehrkraft">${lehrkraefte().map((p) => `<option value="${esc(p.id)}" ${p.id === lk ? "selected" : ""}>${esc(name(p.id))}</option>`).join("")}</select></div>` : ""}
      ${V.an_art === "auswahl" ? auswahlHtml(pid) : ""}
      <div class="feld"><label for="vsNotiz">Notiz (freiwillig)</label><input id="vsNotiz" maxlength="300" value="${esc(V.notiz)}" placeholder="z. B. Takt 9 klappt noch nicht" data-c="vsFeld" data-x="notiz"></div>
      <button type="button" class="knopf haupt breit vs-senden" data-a="vsSenden">📨 Senden</button>
      <button type="button" class="knopf breit" data-a="vsNochmal">🔁 Nochmal aufnehmen</button></div>`;
  }
  return `<div class="karte vs-start"><h3>🎙️ Vorspiel aufnehmen</h3>${werWahl}
    <p>Spiel ${wer.length > 1 ? `als <b>${esc(vorname(pid))}</b> ` : ""}dein Stück, hör es dir an und schick es an deine Lehrkraft, dein Register, dein Orchester oder an ausgewählte Personen.</p>
    <button type="button" class="vs-knopf" data-a="vsStart" aria-label="Aufnahme starten"><span>⏺</span></button>
    <label class="vs-vorzaehler"><input type="checkbox" data-c="vsVorzaehler" ${einst().vsVorzaehler ? "checked" : ""}> ⏱ Vorzähler (4 Schläge)</label></div>`;
}
function auswahlHtml(pid) {
  const lk = lehrkraefte().map((p) => p.id), reg = registerLeute(pid), orch = orchesterLeute(pid).filter((x) => !reg.includes(x) && !lk.includes(x));
  const box = (x) => `<label class="vs-person"><input type="checkbox" data-c="vsAuswahl" data-x="${esc(x)}" ${V.auswahl.has(x) ? "checked" : ""}> ${esc(name(x))}</label>`;
  const teil = (t, l) => (l.length ? `<details ${t.startsWith("👩") ? "open" : ""}><summary>${t} (${l.length})</summary><div class="vs-personen">${l.sort((a, b) => name(a).localeCompare(name(b))).map(box).join("")}</div></details>` : "");
  return `<div class="vs-auswahl">${teil("👩‍🏫 Lehrkräfte & Leitung", lk.filter((x) => x !== pid))}${teil(`🎻 ${esc(registerName(pid))}`, reg.filter((x) => !lk.includes(x)))}${teil(`🎼 ${esc(orchesterName(pid))}`, orch)}</div>`;
}
function liveKarte() {
  const lk = meineLehrkraft(V.fuer);
  if (!lk || lk === S.ich?.id) return "";
  return `<div class="karte vs-live"><h3>🔴 Live vorspielen</h3><p>Mit ${esc(name(lk))} verabredet? Dann direkt live vorspielen – ${esc(name(lk))} hört sofort zu und kann gleich etwas sagen. Ton im Musik-Modus, kein Speichern.</p>
    ${anrufAn() ? `<button type="button" class="knopf" data-a="vsLive" data-x="${esc(lk)}">🔴 Jetzt live vorspielen</button>` : '<p class="hinweis">🎯 Kommt nach dem Pilot: dafür schaltet die Leitung „📞 Anrufe & Video“ frei (Admin › 🧩 Module).</p>'}</div>`;
}

// ---------- Aufnehmen ----------
AKTIONEN.vsFuer = (pid) => { V.fuer = pid; V.schritt = "start"; zeichne(); };
AKTIONEN.vsVorzaehler = (_, el) => einstSetzen("vsVorzaehler", el.checked);
const klick = (ctx, t, hoch) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hoch ? 1568 : 1046; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.1); };
AKTIONEN.vsStart = async () => {
  if (V.rec) return;
  try {
    if (einst().vsVorzaehler) { // ⏱ 4 Schläge bei ♩ = 80, dann geht es los
      const ctx = (V.ctx ||= new (window.AudioContext || window.webkitAudioContext)()); await ctx.resume?.(); const t0 = ctx.currentTime + 0.1;
      for (let i = 0; i < 4; i++) klick(ctx, t0 + i * 0.75, i === 0);
      toast("⏱ 1 – 2 – 3 – 4 …", 2800); await new Promise((ok) => setTimeout(ok, 3000));
    }
    V.rec = await aufnahme({ maxSek: VORSPIEL_MAX_SEK, musik: true, beiEnde: () => AKTIONEN.vsStopp() });
    V.schritt = "aufnahme"; zeichne();
  } catch { V.rec = null; toast("🎙️ Kein Zugriff aufs Mikrofon – bitte in den Einstellungen des Browsers erlauben."); }
};
function pegelZeigen() {
  const r = V.rec; if (!r) return;
  let an = null;
  try { const ctx = (V.ctx ||= new (window.AudioContext || window.webkitAudioContext)()); an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(r.strom).connect(an); } catch { an = null; }
  const d = an ? new Uint8Array(an.fftSize) : null;
  const schritt = () => {
    if (V.rec !== r) return;
    const z = document.getElementById("vsZeit"); if (z) z.textContent = dauerText(r.sekunden());
    const p = document.getElementById("vsPegel");
    if (p && an) { an.getByteTimeDomainData(d); let m = 0; for (const x of d) m = Math.max(m, Math.abs(x - 128)); const n = Math.round(Math.min(1, m / 90) * 14); [...p.children].forEach((i, k) => i.classList.toggle("an", k < n)); }
    V.uhr = requestAnimationFrame(schritt);
  };
  cancelAnimationFrame(V.uhr); schritt();
}
AKTIONEN.vsStopp = async () => {
  const r = V.rec; if (!r) return; V.rec = null; cancelAnimationFrame(V.uhr);
  const e = await r.stopp(); if (!e?.blob?.size) { V.schritt = "start"; zeichne(); return toast("Die Aufnahme ist leer – bitte noch einmal."); }
  if (V.url) URL.revokeObjectURL(V.url);
  Object.assign(V, { blob: e.blob, url: URL.createObjectURL(e.blob), dauer: e.dauer || r.sekunden(), schritt: "pruefen" });
  if (!V.auswahl.size) { const lk = meineLehrkraft(V.fuer); if (lk) V.auswahl.add(lk); }
  zeichne();
};
AKTIONEN.vsNochmal = () => { V.schritt = "start"; zeichne(); AKTIONEN.vsStart(); };
AKTIONEN.vsFeld = (w, el) => { V[el.dataset.x] = w; };
AKTIONEN.vsAn = (art) => { V.an_art = art; zeichne(); };
AKTIONEN.vsLehrkraft = (pid) => { einstSetzen("vorspielLehrkraft", { ...(einst().vorspielLehrkraft || {}), [V.fuer]: pid }); zeichne(); };
AKTIONEN.vsAuswahl = (_, el) => { if (el.checked) V.auswahl.add(el.dataset.x); else V.auswahl.delete(el.dataset.x); };
AKTIONEN.vsSenden = async (_, el) => {
  const pid = V.fuer, an = empfaengerFuer(pid, V.an_art, { auswahl: [...V.auswahl] });
  if (!an.length) return toast(V.an_art === "auswahl" ? "Bitte mindestens eine Person ankreuzen." : "Niemand gefunden – bitte „Auswahl“ nehmen.");
  if (an.length > 8 && !(await frage(`Das Vorspiel geht an ${an.length} Personen. Senden?`, { ja: "📨 Senden" }))) return;
  el.disabled = true; el.textContent = "⏳ Wird gesendet …";
  try {
    const d = await hochladen(new File([V.blob], `Vorspiel ${vorname(pid)}.${V.blob.type.includes("mp4") ? "m4a" : "webm"}`, { type: V.blob.type }), { art: "sprache" });
    await speichere("vorspiele", { von: pid, stueck: V.stueck.trim() || null, notiz: V.notiz.trim() || null, aufnahme: "datei:" + d.id, dauer_sek: V.dauer, an_art: V.an_art, an,
      loeschen_am: tagIso(new Date(Date.now() + vorspielTage(konfig()) * 86400000)) });
    if (V.an_art === "lehrkraft" && an[0]) einstSetzen("vorspielLehrkraft", { ...(einst().vorspielLehrkraft || {}), [pid]: an[0] });
    Object.assign(V, { schritt: "start", blob: null, stueck: "", notiz: "" }); V.auswahl.clear();
    toast(an.length === 1 ? `📨 Gesendet – ${vorname(an[0])} hört rein!` : `📨 Gesendet an ${an.length} Personen`); zeichne();
  } catch (e) { el.disabled = false; el.textContent = "📨 Senden"; toast("⚠️ " + (e.message || "Hat nicht geklappt")); }
};
AKTIONEN.vsLive = (pid) => anrufen(pid, "audio", { musik: true });
AKTIONEN.vsTage = async () => {
  const n = Math.round(Number(document.getElementById("vsTage")?.value));
  if (!(n >= VORSPIEL_TAGE_MIN && n <= VORSPIEL_TAGE_MAX)) return toast(`Bitte ${VORSPIEL_TAGE_MIN} bis ${VORSPIEL_TAGE_MAX} Tage.`);
  try { await konfigSetzen("vorspiel_tage", n); toast(`💾 Neue Vorspiele werden nach ${n} Tagen gelöscht`); } catch (e) { toast("⚠️ " + e.message); }
};

// ---------- Anhören & antworten ----------
async function adresse(datei) {
  const id = String(datei || "").replace(/^datei:/, "");
  try { return await dateiUrl(id); } catch (e) {
    if (!istEchtbetrieb() && id.startsWith("demo-")) { toast("🧪 Vorführversion: Beispielklang (Bach) statt echter Aufnahme"); return musikAdresse(["air.mp3", "jesus.mp3", "badinerie.mp3"][Number(id.slice(-1)) % 3 || 0], konfig().musik_basis); }
    throw e;
  }
}
AKTIONEN.vsOeffnen = async (vid) => {
  const v = hole("vorspiele", vid); if (!v) return;
  V.offen = vid;
  const meins = fuerWen().includes(v.von), empf = (v.an || []).includes(S.ich.id), a = antworten(vid).filter((x) => meins || x.von === S.ich.id);
  const antwortHtml = (x) => x.art === "gehoert" ? "" : `<li><b>${esc(vorname(x.von))}</b> ${x.art === "sprache" ? `<button type="button" class="knopf klein" data-a="vsSpiele" data-x="${esc(x.aufnahme)}">▶ Sprachantwort</button>` : esc(x.text || "")} <small class="hinweis">${vorZeit(x.erstellt_am)}</small></li>`;
  const gehoert = [...new Set(antworten(vid).filter((x) => meins || x.von === S.ich.id).map((x) => x.von))];
  blatt(`🎙️ ${esc(v.stueck || "Vorspiel")}`, `<p><b>${esc(name(v.von))}</b> · ${datumKurz(v.erstellt_am)}${v.dauer_sek ? ` · ${dauerText(v.dauer_sek)}` : ""}</p>
    ${v.notiz ? `<p class="vs-notiz">„${esc(v.notiz)}“</p>` : ""}
    <audio controls class="vs-audio" id="vsAudio" preload="none"></audio>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="vsBuehne" data-x="${esc(vid)}">🎭 Auf der Bühne anhören</button></div>
    ${meins ? `<p class="hinweis">An: ${(v.an || []).map((x) => esc(name(x))).join(", ")}</p><p class="${gehoert.length ? "vs-gruen" : "hinweis"}">${gehoert.length ? `✔ gehört von ${gehoert.map((x) => esc(name(x))).join(", ")}` : "⏳ noch nicht gehört"}</p>` : ""}
    ${a.some((x) => x.art !== "gehoert") ? `<h4>💬 Antworten</h4><ul class="vs-antworten">${a.map(antwortHtml).join("")}</ul>` : ""}
    ${empf ? `<h4>Deine Antwort</h4><div class="vs-tipps">${VORSPIEL_TIPPS.map((t) => `<button type="button" class="chip-wahl" data-a="vsTipp" data-x="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <div class="feld"><label for="vsText">Eigene Worte</label><textarea id="vsText" rows="2" maxlength="500" placeholder="z. B. Schon viel besser – Takt 9 langsam mit Metronom üben"></textarea></div>
      <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="vsText">💬 Senden</button><button type="button" class="knopf" data-a="vsSprache" id="vsSpracheK">🎙️ Sprachantwort</button></div>` : ""}
    ${restTage(v) != null ? `<p class="hinweis">🗑️ Wird in ${restTage(v)} ${restTage(v) === 1 ? "Tag" : "Tagen"} automatisch gelöscht.</p>` : ""}
    ${meins ? `<button type="button" class="knopf rot breit" data-a="vsLoeschen" data-x="${esc(vid)}">🗑️ Zurückziehen</button>` : ""}
    <button type="button" class="knopf breit" data-a="blattZu">Schließen</button>`);
  try {
    const au = document.getElementById("vsAudio"); if (!au) return;
    au.src = await adresse(v.aufnahme);
    au.addEventListener("play", () => { if (empf && !gehoertVonMir(v)) speichere("vorspiel_antworten", { vorspiel_id: vid, von: S.ich.id, art: "gehoert" }).then(() => zeichne()).catch(() => {}); }, { once: true });
  } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.vsSpiele = async (datei) => { try { const a = new Audio(await adresse(datei)); a.play(); } catch (e) { toast("⚠️ " + e.message); } };
AKTIONEN.vsBuehne = async (vid) => {
  const v = hole("vorspiele", vid); if (!v) return;
  try { const url = await adresse(v.aufnahme); blattZu(); const { aufnahmeAufBuehne } = await import("./buehne.js"); aufnahmeAufBuehne(url, `${vorname(v.von)}: ${v.stueck || "Vorspiel"}`, v.von); } catch (e) { toast("⚠️ " + e.message); }
};
async function antwort(art, felder) {
  const vid = V.offen; if (!vid) return;
  try { await speichere("vorspiel_antworten", { vorspiel_id: vid, von: S.ich.id, art, ...felder }); toast(`💬 An ${vorname(hole("vorspiele", vid)?.von)} geschickt`); zeichne(); AKTIONEN.vsOeffnen(vid); } catch (e) { toast("⚠️ " + e.message); }
}
AKTIONEN.vsTipp = (t) => antwort("tipp", { text: t });
AKTIONEN.vsText = () => { const t = String(document.getElementById("vsText")?.value || "").trim(); if (!t) return toast("Bitte etwas schreiben."); antwort("text", { text: t }); };
AKTIONEN.vsSprache = async () => {
  const k = document.getElementById("vsSpracheK");
  if (V.antwortRec) {
    const r = V.antwortRec; V.antwortRec = null; const e = await r.stopp(); if (!e?.blob?.size) return;
    try { const d = await hochladen(new File([e.blob], "Sprachantwort.webm", { type: e.blob.type }), { art: "sprache" }); antwort("sprache", { aufnahme: "datei:" + d.id }); } catch (x) { toast("⚠️ " + x.message); }
    return;
  }
  try { V.antwortRec = await aufnahme({ maxSek: 120, beiEnde: () => AKTIONEN.vsSprache() }); if (k) { k.textContent = "⏹ Fertig – senden"; k.classList.add("rot"); } } catch { toast("🎙️ Kein Zugriff aufs Mikrofon"); }
};
AKTIONEN.vsLoeschen = async (vid) => {
  const v = hole("vorspiele", vid); if (!v || !(await frage("Vorspiel zurückziehen? Niemand kann es dann mehr hören.", { ja: "🗑️ Zurückziehen", gefahr: true }))) return;
  try { await loesche("vorspiele", vid); blattZu(); toast("🗑️ Zurückgezogen"); zeichne(); } catch (e) { toast("⚠️ " + e.message); }
};
