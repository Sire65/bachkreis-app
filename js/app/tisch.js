// 🪑 Runder Tisch (0.50.0, wie KC-CLUB-RUNDER-TISCH): Online-Treffen mit Bild und Ton für bis zu 8 Erwachsene – z. B. zur Sitzung,
// wenn jemand nicht kommen kann. Jeder ist mit jedem direkt verbunden (Gerät zu Gerät, verschlüsselt), der Server vermittelt nur.
// Wer später kommt, ruft die schon Anwesenden an; die antworten automatisch. Knöpfe: Mikro, Kamera, Bildschirm teilen, ✋ Hand heben, Verlassen.
// 0.51.0: 👥 Konferenz aus dem Chat (Räume „k-…“, nur Ton, bis 4), 🙋 Gäste mit eigenem Link, 💼 Tasche (PDF/Foto/Musik zeigen), wer sitzt schon da.
import { S, VIEWS, zeige, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { istEchtbetrieb, liste, hole, serverAktion } from "../kern/daten.js";
import { erwachsen } from "../kern/schema.js";
import { rtcMoeglich, vermittlung, ANRUF_FEHLER, datenSenden } from "../kern/rtc.js";
import { tischNetz, lebendig, pidVon } from "../kern/tischnetz.js";
import { modulAbgeschaltet, anrufLaeuft } from "./anruf.js";

export const TISCH_MAX = 8, KONFERENZ_MAX = 4, TASCHE_MAX_MB = 8;
export const istKonferenz = (raum) => /^k-/.test(String(raum || ""));
const maxFuer = (raum) => (istKonferenz(raum) ? KONFERENZ_MAX : TISCH_MAX);
export const GAST_EINLADEN = ["leitung", "admin", "vorstand"]; // wie TISCH_GAST_EINLADEN auf dem Server
const TAKT = 5000, LEBT = 30000;
const T = { raum: null, strom: null, kamera: null, teilen: null, da: null, seit: null, peers: new Map(), namen: {}, hand: false, poll: null, puls: null, tasche: [], wer: {} };
export const tischDa = () => rtcMoeglich() && erwachsen(S.ich) && !modulAbgeschaltet("tisch");
export const amTisch = () => !!T.raum;

function raeume() {
  const r = [{ id: "bachkreis", t: "🪑 Offener Tisch", u: "für alle Erwachsenen im Bachkreis" }];
  for (const s of liste("versammlungen", (x) => x.status !== "beendet" && Math.abs(new Date(x.beginn) - Date.now()) < 7 * 86400000)) r.push({ id: s.id, t: `🎬 ${s.titel}`, u: new Date(s.beginn).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) });
  return r;
}
const raumTitel = (id) => (istKonferenz(id) ? "👥 Konferenz" : raeume().find((r) => r.id === id)?.t || "🪑 Runder Tisch");

// ---------- Verbindungen (gemeinsamer Kern mit der Gast-Seite: js/kern/tischnetz.js) ----------
const NETZ = tischNetz({
  ich: () => S.ich?.id, vermittlung, strom: () => T.strom, max: () => maxFuer(T.raum),
  beiAenderung: () => zeichneGitter(),
  beiOffen: (p) => datenSenden(p.kanal, { hand: T.hand }),
  beiNachricht: (p, m) => { if ("hand" in m) { p.hand = !!m.hand; kachelStatus(p.pid); if (p.hand) toast(`✋ ${wer(p.pid)} meldet sich`); } if (m.tasche) taschePaket(p.pid, m.tasche); },
});
T.peers = NETZ.N.peers; T.namen = NETZ.N.namen;
async function runde() { if (!T.raum) return; await NETZ.runde(); zeichneGitter(); }

// ---------- Beitreten / Verlassen ----------
export async function beitreten(raum, { nurTon = istKonferenz(raum) } = {}) {
  if (!tischDa()) return toast(ANRUF_FEHLER.NUR_ERWACHSENE);
  if (anrufLaeuft()) return toast("Erst das Telefonat beenden.");
  if (T.raum === raum) return;
  if (T.raum) verlassen();
  // 👥 Konferenz voll? (bis 4)
  if (istKonferenz(raum)) { const l = await vermittlung.tisch(raum).catch(() => null); if (l && l.zeilen.filter(lebendig).length >= KONFERENZ_MAX) return toast(`👥 Die Konferenz ist voll (höchstens ${KONFERENZ_MAX}).`); }
  try { T.strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: nurTon ? false : { facingMode: "user", width: { ideal: 480 } } }); }
  catch { try { T.strom = await navigator.mediaDevices.getUserMedia({ audio: true }); toast("📷 Ohne Kamera – nur Ton"); } catch { return toast("⚠️ Mikrofon nicht freigegeben", 4000); } }
  T.kamera = T.strom.getVideoTracks()[0] || null;
  try { const z = await vermittlung.senden({ art: "tisch_da", raum_id: raum, an: [], status: "angenommen" }); T.da = z.id; T.seit = z.beginn; }
  catch (e) { T.strom.getTracks().forEach((t) => t.stop()); T.strom = null; return toast("⚠️ " + e.message, 4000); }
  T.raum = raum; T.hand = false; NETZ.N.raum = raum; NETZ.N.seit = T.seit; NETZ.N.versucht.clear();
  zeichne(); runde();
  T.poll = setInterval(() => { if (!document.hidden || T.peers.size) runde(); }, TAKT);
  T.puls = setInterval(() => vermittlung.senden({ id: T.da, lebt: 1, ende: new Date().toISOString() }).catch(() => {}), LEBT);
}
export function verlassen() {
  if (!T.raum) return;
  NETZ.schliessen();
  if (T.da) vermittlung.senden({ id: T.da, status: "beendet" }).catch(() => {});
  clearInterval(T.poll); clearInterval(T.puls);
  [T.strom, T.teilen].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
  Object.assign(T, { raum: null, strom: null, kamera: null, teilen: null, da: null, seit: null, hand: false, poll: null, puls: null });
}

// ---------- Anzeige ----------
const wer = (pid) => (hole("personen", pid) ? name(pid) : T.namen[pid] || "🙋 Gast");
function kachelHtml(pid, ich) {
  const p = T.peers.get(pid), hand = ich ? T.hand : p?.hand, st = ich ? "" : p?.pc.connectionState === "connected" ? "" : "🔗 verbindet …";
  return `<figure class="ti-kachel${hand ? " hand" : ""}" data-pid="${esc(pid)}"><video autoplay playsinline ${ich ? "muted" : ""}></video>
    <figcaption>${hand ? '<span aria-label="meldet sich">✋</span> ' : ""}${esc(ich ? "Du" : wer(pid))}${st ? ` <small>${st}</small>` : ""}</figcaption></figure>`;
}
function zeichneGitter() {
  const g = document.getElementById("tiGitter"); if (!g || !T.raum) return;
  const ids = [S.ich.id, ...T.peers.keys()];
  // vorhandene Kacheln behalten (sonst springt das Bild), neue anhängen, alte entfernen
  for (const f of [...g.children]) if (!ids.includes(f.dataset.pid)) f.remove();
  for (const pid of ids) {
    let f = g.querySelector(`[data-pid="${CSS.escape(pid)}"]`);
    if (!f) { g.insertAdjacentHTML("beforeend", kachelHtml(pid, pid === S.ich.id)); f = g.lastElementChild; }
    kachelVideo(pid); kachelStatus(pid);
  }
  g.dataset.n = String(Math.min(ids.length, 9));
  const z = document.getElementById("tiZahl"); if (z) z.textContent = `${ids.length} am Tisch`;
}
function kachelVideo(pid) {
  const v = document.querySelector(`#tiGitter [data-pid="${CSS.escape(pid)}"] video`); if (!v) return;
  const s = pid === S.ich.id ? T.teilen || T.strom : T.peers.get(pid)?.strom;
  if (s && v.srcObject !== s) v.srcObject = s;
}
function kachelStatus(pid) {
  const f = document.querySelector(`#tiGitter [data-pid="${CSS.escape(pid)}"]`); if (!f) return;
  const ich = pid === S.ich.id, p = T.peers.get(pid), hand = ich ? T.hand : p?.hand, st = ich || p?.pc.connectionState === "connected" ? "" : "🔗 verbindet …";
  f.classList.toggle("hand", !!hand);
  f.querySelector("figcaption").innerHTML = `${hand ? '<span aria-label="meldet sich">✋</span> ' : ""}${esc(ich ? "Du" : wer(pid))}${st ? ` <small>${st}</small>` : ""}`;
}
const knopf = (a, sym, t, an) => `<button type="button" class="ti-k${an ? " aus" : ""}" data-a="${a}" aria-pressed="${!!an}" aria-label="${esc(t)}" title="${esc(t)}">${sym}</button>`;

VIEWS.tisch = {
  render({ raum } = {}) {
    if (!tischDa()) return kopf("🪑 Runder Tisch") + `<p class="hinweis">${rtcMoeglich() ? "Der Runde Tisch ist nur für Erwachsene." : "Dieses Gerät kann keine Video-Verbindungen."}</p>`;
    if (T.raum) {
      const mik = T.strom?.getAudioTracks()[0], kam = T.kamera;
      return kopf(raumTitel(T.raum), `<span id="tiZahl" class="badge"></span>`) + `<div id="tiGitter" class="ti-gitter" data-n="1"></div>
        ${!istEchtbetrieb() ? '<p class="hinweis">🧪 Vorführung: Öffne die App in einem zweiten Tab, wähle dort oben eine andere erwachsene Person und setz dich an denselben Tisch.</p>' : ""}
        ${istKonferenz(T.raum) ? `<p class="hinweis">👥 Konferenz – nur Ton, bis ${KONFERENZ_MAX} Personen.</p>` : ""}
        <div id="tiPakete" class="ti-pakete" aria-live="polite"></div>
        <div class="ti-leiste" role="toolbar" aria-label="Runder Tisch">${knopf("tiMikro", mik?.enabled === false ? "🔇" : "🎤", "Mikrofon stumm", mik?.enabled === false)}${kam ? knopf("tiKamera", "📷", "Kamera aus", kam.enabled === false) : ""}
          ${navigator.mediaDevices?.getDisplayMedia && kam ? knopf("tiTeilen", "🖥️", T.teilen ? "Teilen beenden" : "Bildschirm teilen", !!T.teilen) : ""}${knopf("tiHand", "✋", "Hand heben", T.hand)}${knopf("tiTasche", "💼", `Tasche: zeigen (${T.tasche.length})`, false)}
          <button type="button" class="ti-k rot" data-a="tiVerlassen" aria-label="Tisch verlassen" title="Tisch verlassen">🚪</button></div>`;
    }
    const r = raeume(), vor = raum && (istKonferenz(raum) ? { id: raum, t: "👥 Konferenz", u: `nur Ton · bis ${KONFERENZ_MAX} Personen` } : r.find((x) => x.id === raum));
    const gast = hatRolle(...GAST_EINLADEN), gaeste = liste("tischgaeste", (g) => new Date(g.gueltig_bis) > new Date());
    return kopf("🪑 Runder Tisch") + `<p class="hinweis">Online-Treffen mit Bild und Ton – bis zu ${TISCH_MAX} Personen. Alles geht direkt von Gerät zu Gerät, nichts wird aufgezeichnet.</p>
      <div class="karte"><ul class="liste">${(vor ? [vor] : r).map((x) => `<li><div class="fl"><b>${esc(x.t)}</b><div class="zeile-unter">${esc(x.u)}</div><div class="zeile-unter ti-wer" data-raum="${esc(x.id)}">${esc(T.wer[x.id] || "")}</div></div>
        <span class="knopfreihe">${gast && !istKonferenz(x.id) ? `<button type="button" class="knopf klein" data-a="tiGastNeu" data-x="${esc(x.id)}" aria-label="Gast an ${esc(x.t)} einladen">🙋 Gast</button>` : ""}<button type="button" class="knopf haupt" data-a="tiBeitreten" data-x="${esc(x.id)}">🪑 Platz nehmen</button></span></li>`).join("")}</ul></div>
      ${vor && r.length > 1 && !istKonferenz(raum) ? '<button type="button" class="knopf" data-a="tiAlle">Andere Tische</button>' : ""}
      <div class="karte"><h3>💼 Deine Tasche (${T.tasche.length})</h3><p class="hinweis">Vorher packen, am Tisch mit 💼 allen zeigen: PDF, Foto oder Musik (je höchstens ${TASCHE_MAX_MB} MB).</p>
        ${T.tasche.length ? `<ul class="liste">${T.tasche.map((d, i) => `<li><span aria-hidden="true">${symVon(d.mime)}</span><div class="fl">${esc(d.name)}</div><button type="button" class="knopf klein" data-a="tiTascheWeg" data-x="${i}" aria-label="${esc(d.name)} aus der Tasche nehmen">✕</button></li>`).join("")}</ul>` : ""}
        <label class="knopf">➕ Einpacken<input type="file" accept="application/pdf,image/*,audio/*" data-c="tiTaschePacken" multiple hidden></label></div>
      ${gast && gaeste.length ? `<div class="karte"><h3>🙋 Eingeladene Gäste</h3><ul class="liste">${gaeste.map((g) => `<li><div class="fl"><b>${esc(g.name)}</b><div class="zeile-unter">${esc(raumTitel(g.raum_id))} · bis ${esc(new Date(g.gueltig_bis).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}</div></div><button type="button" class="knopf klein" data-a="tiGastWeg" data-x="${esc(g.id)}" aria-label="Einladung für ${esc(g.name)} zurückziehen">🚫</button></li>`).join("")}</ul></div>` : ""}`;
  },
  nach(w, { raum } = {}) { zeichneGitter(); if (!T.raum) werSitztDa(raum); },
};
AKTIONEN.tiBeitreten = (raum) => beitreten(raum);
AKTIONEN.tiOeffnen = (raum) => zeige("tisch", { raum });
AKTIONEN.tiAlle = () => zeige("tisch", {}, { ersetzen: true });
AKTIONEN.tiVerlassen = () => { verlassen(); toast("🚪 Tisch verlassen"); zeichne(); };
AKTIONEN.tiMikro = (_, el) => { const a = T.strom?.getAudioTracks()[0]; if (!a) return; a.enabled = !a.enabled; el.textContent = a.enabled ? "🎤" : "🔇"; el.classList.toggle("aus", !a.enabled); el.setAttribute("aria-pressed", String(!a.enabled)); };
AKTIONEN.tiKamera = (_, el) => { if (!T.kamera) return; T.kamera.enabled = !T.kamera.enabled; el.classList.toggle("aus", !T.kamera.enabled); el.setAttribute("aria-pressed", String(!T.kamera.enabled)); };
AKTIONEN.tiHand = (_, el) => { T.hand = !T.hand; el.classList.toggle("aus", T.hand); el.setAttribute("aria-pressed", String(T.hand)); NETZ.alleSenden({ hand: T.hand }); kachelStatus(S.ich.id); };
const videoSetzen = (track) => NETZ.videoSetzen(track);
function teilenEnde() { T.teilen?.getTracks().forEach((t) => t.stop()); T.teilen = null; if (T.kamera) videoSetzen(T.kamera); kachelVideo(S.ich.id); if (S.view === "tisch") zeichne(); }
AKTIONEN.tiTeilen = async () => {
  if (T.teilen) return teilenEnde();
  if (!T.kamera) return toast("Bildschirm teilen geht nur, wenn die Kamera dabei ist.");
  try { T.teilen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); } catch { return; }
  const t = T.teilen.getVideoTracks()[0]; t.onended = teilenEnde; videoSetzen(t); kachelVideo(S.ich.id); zeichne();
};
// ---------- 🟢 wer sitzt schon da (KC-CLUB-GESPRAECHE: sehen, wer telefoniert – und dazukommen) ----------
async function werSitztDa(raum) {
  const ids = raum ? [raum] : raeume().map((r) => r.id);
  for (const id of ids) {
    const l = await vermittlung.tisch(id).catch(() => null); if (!l) continue;
    const n = l.zeilen.filter(lebendig).map((z) => (hole("personen", pidVon(z)) ? name(pidVon(z)) : l.namen?.[pidVon(z)] || "🙋 Gast"));
    T.wer[id] = n.length ? `🟢 ${n.join(", ")} ${n.length === 1 ? "sitzt" : "sitzen"} schon da` : "";
    const el = document.querySelector(`.ti-wer[data-raum="${CSS.escape(id)}"]`); if (el) el.textContent = T.wer[id];
  }
}
// ---------- 💼 Tasche (KC-CLUB-TISCH-TASCHE): Dateien vorher packen, am Tisch allen zeigen ----------
const symVon = (m) => (/pdf/.test(m) ? "📕" : /^image/.test(m) ? "🖼️" : /^audio/.test(m) ? "🎵" : "📄");
const lesenAlsUrl = (f) => new Promise((ok, nein) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => nein(r.error); r.readAsDataURL(f); });
AKTIONEN.tiTaschePacken = async (_, el) => {
  for (const f of [...(el.files || [])].slice(0, 5)) {
    if (f.size > TASCHE_MAX_MB * 1048576) { toast(`„${f.name}“ ist größer als ${TASCHE_MAX_MB} MB`); continue; }
    if (!/^(application\/pdf|image\/|audio\/)/.test(f.type)) { toast(`„${f.name}“: nur PDF, Foto oder Musik`); continue; }
    T.tasche.push({ name: f.name, mime: f.type, groesse: f.size, data: await lesenAlsUrl(f) });
  }
  el.value = ""; toast(`💼 ${T.tasche.length} in der Tasche`); zeichne();
};
AKTIONEN.tiTascheWeg = (i) => { T.tasche.splice(Number(i), 1); zeichne(); };
AKTIONEN.tiTasche = () => blatt("💼 Aus der Tasche zeigen", (T.tasche.length ? `<ul class="liste">${T.tasche.map((d, i) => `<li><span aria-hidden="true">${symVon(d.mime)}</span><div class="fl">${esc(d.name)}</div><button type="button" class="knopf klein haupt" data-a="tiZeigen" data-x="${i}">👀 Allen zeigen</button></li>`).join("")}</ul>`
  : '<p>Die Tasche ist leer.</p>') + `<label class="knopf">➕ Einpacken<input type="file" accept="application/pdf,image/*,audio/*" data-c="tiTaschePacken" multiple hidden></label>`);
AKTIONEN.tiZeigen = (i) => {
  const d = T.tasche[Number(i)]; if (!d) return; blattZu();
  const n = NETZ.alleSenden({ tasche: d });
  taschePaket(S.ich.id, d); toast(n ? `👀 ${n} ${n === 1 ? "Person sieht" : "sehen"} „${d.name}“` : "Noch niemand am Tisch – nur du siehst es");
};
function taschePaket(pid, d) {
  if (!d?.data || !/^data:(application\/pdf|image\/|audio\/)/.test(String(d.data))) return; // nur die drei Arten, nichts Ausführbares
  const box = document.getElementById("tiPakete"); if (!box) return;
  const mime = String(d.data).slice(5, String(d.data).indexOf(";")), titel = `${pid === S.ich.id ? "Du zeigst" : `${wer(pid)} zeigt`}: ${d.name}`;
  const inhalt = /^image\//.test(mime) ? `<img src="${esc(d.data)}" alt="${esc(d.name)}">` : /^audio\//.test(mime) ? `<audio controls src="${esc(d.data)}"></audio>` : `<a class="knopf" href="${esc(d.data)}" download="${esc(d.name)}">📕 PDF öffnen</a>`;
  box.insertAdjacentHTML("afterbegin", `<div class="ti-paket karte"><div class="ti-paket-kopf"><b>💼 ${esc(titel)}</b><button type="button" class="knopf klein" data-a="tiPaketZu" aria-label="Schließen">✕</button></div>${inhalt}</div>`);
  if (pid !== S.ich.id) toast(`💼 ${titel}`);
}
AKTIONEN.tiPaketZu = (_, el) => el.closest(".ti-paket")?.remove();
// ---------- 🙋 Gast einladen (KC-CLUB-RUNDER-TISCH-GAST) ----------
AKTIONEN.tiGastNeu = (raum) => blatt("🙋 Gast an den Tisch einladen", `<p>Der Gast braucht kein Konto: Er bekommt einen Link, der nur zu <b>diesem</b> Tisch führt.</p>
  <div class="feld"><label for="tgName">Name des Gastes</label><input id="tgName" maxlength="60" placeholder="z. B. Frau Weber (Dozentin)"></div>
  <div class="feld"><label for="tgStd">Gültig für</label><select id="tgStd"><option value="3">3 Stunden</option><option value="24" selected>1 Tag</option><option value="72">3 Tage</option></select></div>
  <button type="button" class="knopf haupt" data-a="tiGastAnlegen" data-x="${esc(raum)}">🔗 Link erzeugen</button><div id="tgLink"></div>`);
AKTIONEN.tiGastAnlegen = async (raum) => {
  const nameG = document.getElementById("tgName")?.value.trim(), std = Number(document.getElementById("tgStd")?.value || 24);
  if (!nameG) return toast("Bitte einen Namen eintragen");
  if (!istEchtbetrieb()) { document.getElementById("tgLink").innerHTML = '<p class="hinweis">🧪 In der Vorführversion gibt es keine echten Gast-Links – im Echtbetrieb steht hier der Link zum Weitergeben.</p>'; return; }
  const r = await serverAktion("tisch_gast", { raum, name: nameG, stunden: std }).catch((e) => ({ fehler: e.message }));
  if (!r?.ok) return toast("⚠️ " + (r?.fehler || "Link ging nicht"));
  const link = new URL(`gast.html#t=${encodeURIComponent(r.token)}`, location.href).href;
  document.getElementById("tgLink").innerHTML = `<div class="feld"><label for="tgUrl">Link für ${esc(nameG)} (nur einmal sichtbar!)</label><input id="tgUrl" readonly value="${esc(link)}"></div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="tiGastKopieren">📋 Kopieren</button>${navigator.share ? '<button type="button" class="knopf" data-a="tiGastTeilen">📤 Teilen</button>' : ""}</div>`;
};
AKTIONEN.tiGastKopieren = async () => { const v = document.getElementById("tgUrl")?.value; try { await navigator.clipboard.writeText(v); toast("📋 Kopiert"); } catch { document.getElementById("tgUrl")?.select(); } };
AKTIONEN.tiGastTeilen = () => { const v = document.getElementById("tgUrl")?.value; navigator.share?.({ title: "Einladung an den Runden Tisch", text: "Du bist an den Runden Tisch des Bachkreises eingeladen:", url: v }).catch(() => {}); };
AKTIONEN.tiGastWeg = async (id) => { const { speichere } = await import("../kern/daten.js"); const g = hole("tischgaeste", id); if (!g) return; await speichere("tischgaeste", { ...g, geloescht_am: new Date().toISOString() }); toast("🚫 Einladung zurückgezogen"); zeichne(); };
if (typeof window !== "undefined") window.addEventListener("pagehide", () => verlassen());
export const tischOeffnen = (raum) => zeige("tisch", { raum });
