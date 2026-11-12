// 🛟 Fernhilfe (0.50.0, wie KC-CLUB-FERNHILFE): Ein Mitglied bittet Leitung/Admin um Hilfe. Der Helfer sieht den Bildschirm des Mitglieds
// (alle 1,5 s ein Bild, direkt von Gerät zu Gerät) und kann mit dem Finger zeigen (roter Kreis). Nur wenn das Mitglied „🖱️ Bedienen erlauben“
// einschaltet, darf der Helfer auch tippen. Chat-Verläufe werden nie mitgeschickt. Jeder kann jederzeit beenden. Nur Erwachsene.
import { S, VIEWS, zeige, zeichne, kopf, name } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole, istEchtbetrieb } from "../kern/daten.js";
import { anrufErlaubt, erwachsen, rollenMit, FERNHILFE_HELFER } from "../kern/schema.js";
import { senden } from "../kern/versand.js";
import { rtcMoeglich, neueVerbindung, angebotMachen, antwortMachen, antwortSetzen, vermittlung, ANRUF_FEHLER, datenSenden, datenEmpfang } from "../kern/rtc.js";
import { modulAbgeschaltet, anrufLaeuft } from "./anruf.js";
import { laden as fotoLaden, unsichtbar } from "./bildschirmfoto.js";
import { onlineIds } from "./online.js";

const F = { pc: null, kanal: null, id: null, rolle: null, mit: null, ton: null, bedienen: false, darf: false, modus: "zeigen", bild: null, takt: null, poll: null, verbunden: false, beschaeftigt: false };
export const istHelfer = (p = S.ich) => rollenMit(p?.rollen).some((r) => FERNHILFE_HELFER.includes(r));
export const fernhilfeKachelDa = () => rtcMoeglich() && erwachsen(S.ich) && !modulAbgeschaltet("fernhilfe");
export const fernhilfeLaeuft = () => !!F.pc;
const helfer = () => { const on = onlineIds(); return liste("personen", (p) => p.status === "aktiv" && p.id !== S.ich?.id && anrufErlaubt(S.ich, p, { art: "fernhilfe" }) && istHelfer(p))
  .sort((a, b) => Number(on.has(b.id)) - Number(on.has(a.id)) || name(a).localeCompare(name(b))).map((p) => ({ p, on: on.has(p.id) })); };

async function tonHolen() { try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return null; } }
function pcEinrichten(pc) {
  pc.ontrack = (e) => { let a = document.getElementById("fhTon"); if (!a) { a = document.createElement("audio"); a.id = "fhTon"; a.autoplay = true; document.body.appendChild(a); } a.srcObject = e.streams[0]; };
  pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") { toast("📵 Keine Verbindung möglich", 4000); ende(false); } };
  pc.ondatachannel = (e) => kanalDran(e.channel);
}
function kanalDran(k) {
  F.kanal = k;
  k.onopen = () => { F.verbunden = true; clearInterval(F.poll); F.poll = null; if (F.rolle === "mitglied") { leiste(); bilderStarten(); } else toast("🛟 Verbunden"); if (S.view === "fernhilfe") zeichne(); };
  k.onclose = () => { if (F.pc) { toast("🛟 Fernhilfe beendet"); ende(false); } };
  k.onmessage = datenEmpfang(empfangen);
}
function empfangen(m) {
  if (m.ende) { toast("🛟 Fernhilfe beendet"); return ende(false); }
  if (F.rolle === "helfer") {
    if (m.bild) { F.bild = m.bild; const i = document.getElementById("fhBild"); if (i) { i.src = m.bild; i.closest(".fh-schirm")?.classList.remove("leer"); } }
    if ("darf" in m) { F.darf = !!m.darf; if (!F.darf) F.modus = "zeigen"; toast(F.darf ? "🖱️ Du darfst jetzt mit bedienen" : "👆 Nur noch zeigen"); if (S.view === "fernhilfe") zeichne(); }
    return;
  }
  // Mitglied: Helfer zeigt oder tippt
  const p = m.zeig || m.klick; if (!p) return;
  const x = Math.max(0, Math.min(1, Number(p.x))) * innerWidth, y = Math.max(0, Math.min(1, Number(p.y))) * innerHeight;
  zeiger(x, y);
  if (m.klick && F.bedienen) {
    const el = document.elementFromPoint(x, y); if (!el || el.closest("#fhLeiste")) return; // die eigene Leiste bedient nur das Mitglied
    el.focus?.(); el.click?.();
  }
}
function zeiger(x, y) {
  let z = document.getElementById("fhZeiger");
  if (!z) { z = document.createElement("div"); z.id = "fhZeiger"; z.className = "fh-zeiger"; z.setAttribute("aria-hidden", "true"); document.body.appendChild(z); }
  z.style.left = `${x}px`; z.style.top = `${y}px`; z.classList.remove("an"); void z.offsetWidth; z.classList.add("an");
}
// ---------- Mitglied: Leiste + Bilder ----------
function leiste() {
  let l = document.getElementById("fhLeiste");
  if (!l) { l = document.createElement("div"); l.id = "fhLeiste"; l.className = "fh-leiste"; l.setAttribute("role", "region"); l.setAttribute("aria-label", "Fernhilfe läuft"); document.body.appendChild(l); }
  l.innerHTML = `<span>🛟 <b>${esc(name(F.mit))}</b> sieht deinen Bildschirm</span>
    <button type="button" class="fh-k${F.bedienen ? " an" : ""}" data-a="fhBedienen" aria-pressed="${F.bedienen}">🖱️ ${F.bedienen ? "Bedienen erlaubt" : "Bedienen erlauben"}</button>
    <button type="button" class="fh-k rot" data-a="fhEnde">⏹️ Beenden</button>`;
}
const privat = (el) => unsichtbar(el) || el.id === "chatVerlauf" || el.id === "anrufFenster" || el.classList?.contains("fh-privat") || el.tagName === "VIDEO";
function bilderStarten() {
  clearInterval(F.takt);
  F.takt = setInterval(async () => {
    if (!F.kanal || F.kanal.readyState !== "open" || F.beschaeftigt || F.kanal.bufferedAmount > 1e6 || document.hidden) return;
    F.beschaeftigt = true;
    try {
      await fotoLaden();
      const c = await globalThis.html2canvas(document.body, { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, windowWidth: innerWidth, windowHeight: innerHeight, scale: Math.min(0.6, 540 / innerWidth), logging: false, useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor, ignoreElements: privat });
      datenSenden(F.kanal, { bild: c.toDataURL("image/jpeg", 0.55) });
    } catch {} finally { F.beschaeftigt = false; }
  }, 1500);
}
export async function hilfeBitten(pid) {
  if (F.pc) return toast("Die Fernhilfe läuft schon.");
  if (anrufLaeuft()) return toast("Erst das Telefonat beenden.");
  const p = hole("personen", pid); if (!fernhilfeKachelDa() || !anrufErlaubt(S.ich, p, { art: "fernhilfe" })) return toast(ANRUF_FEHLER.ANRUF_NICHT_ERLAUBT);
  Object.assign(F, { rolle: "mitglied", mit: pid, bedienen: false, verbunden: false });
  try {
    const pc = (F.pc = neueVerbindung()); pcEinrichten(pc); F.ton = await tonHolen(); F.ton?.getTracks().forEach((t) => pc.addTrack(t, F.ton));
    kanalDran(pc.createDataChannel("fh"));
    const angebot = await angebotMachen(pc), z = await vermittlung.senden({ art: "fernhilfe", an: [pid], angebot, status: "klingelt" }); F.id = z.id;
    if (istEchtbetrieb()) senden({ an: [pid], betreff: `🛟 ${name(S.ich)} bittet um Fernhilfe`, text: "Jetzt in der Bachkreis-App annehmen.", ereignis: "nachricht" }).catch(() => {});
    zeichne(); const t0 = Date.now();
    F.poll = setInterval(async () => {
      const r = await vermittlung.holen(F.id).catch(() => null);
      if (r?.antwort && F.pc && !F.pc.remoteDescription) { await antwortSetzen(F.pc, r.antwort).catch(() => {}); }
      else if (r?.status === "abgelehnt") { toast(`✖ ${name(pid)} kann gerade nicht`); ende(false); }
      else if (Date.now() - t0 > 90000 && !F.verbunden) { toast("📵 Niemand hat angenommen – versuch es später oder schreib eine Nachricht."); vermittlung.senden({ id: F.id, status: "verpasst" }).catch(() => {}); ende(false); }
    }, 2000);
  } catch (e) { toast("⚠️ " + e.message, 4000); ende(false); }
}
// ---------- Helfer ----------
export async function fernhilfeAnnehmen(id) {
  if (F.pc) return toast("Du hilfst schon jemandem.");
  try {
    const z = await vermittlung.holen(id); if (!z?.angebot) throw new Error("Die Bitte ist schon vorbei");
    Object.assign(F, { rolle: "helfer", mit: z.von, id, darf: false, modus: "zeigen", bild: null, verbunden: false });
    const pc = (F.pc = neueVerbindung()); pcEinrichten(pc); F.ton = await tonHolen(); F.ton?.getTracks().forEach((t) => pc.addTrack(t, F.ton));
    const antwort = await antwortMachen(pc, z.angebot); await vermittlung.senden({ id, status: "angenommen", antwort });
    zeige("fernhilfe");
  } catch (e) { toast("⚠️ " + e.message, 4000); ende(false); }
}
export function ende(selbst) {
  if (selbst) { datenSenden(F.kanal, { ende: 1 }); if (F.id) vermittlung.senden({ id: F.id, status: F.verbunden ? "beendet" : F.rolle === "mitglied" ? "verpasst" : "beendet" }).catch(() => {}); }
  clearInterval(F.takt); clearInterval(F.poll);
  try { F.pc?.close(); } catch {}
  F.ton?.getTracks().forEach((t) => t.stop());
  Object.assign(F, { pc: null, kanal: null, id: null, rolle: null, mit: null, ton: null, bedienen: false, darf: false, bild: null, takt: null, poll: null, verbunden: false });
  ["fhLeiste", "fhZeiger", "fhTon"].forEach((i) => document.getElementById(i)?.remove());
  if (S.view === "fernhilfe") zeichne();
}

VIEWS.fernhilfe = {
  render() {
    if (!fernhilfeKachelDa()) return kopf("🛟 Fernhilfe") + `<p class="hinweis">${rtcMoeglich() ? "Fernhilfe gibt es nur für Erwachsene." : "Dieses Gerät kann keine direkten Verbindungen."}</p>`;
    if (F.rolle === "helfer") return kopf(`🛟 Hilfe für ${esc(name(F.mit))}`) + `<div class="umschalter" role="group" aria-label="Was passiert beim Tippen?">
        <button type="button" class="${F.modus === "zeigen" ? "an" : ""}" aria-pressed="${F.modus === "zeigen"}" data-a="fhModus" data-x="zeigen">👆 Zeigen</button>
        <button type="button" class="${F.modus === "klick" ? "an" : ""}" aria-pressed="${F.modus === "klick"}" data-a="fhModus" data-x="klick" ${F.darf ? "" : 'disabled title="Erst wenn das Mitglied es erlaubt"'}>🖱️ Bedienen</button></div>
      <div class="fh-schirm${F.bild ? "" : " leer"}"><img id="fhBild" alt="Bildschirm von ${esc(name(F.mit))}" ${F.bild ? `src="${F.bild}"` : ""} data-a="fhTippen"><p class="hinweis">${F.verbunden ? "Warte auf das erste Bild …" : "🔗 verbindet …"}</p></div>
      <p class="hinweis">Tippe ins Bild: ${F.modus === "klick" ? "das tippt beim Mitglied." : "beim Mitglied erscheint ein roter Kreis."} Chats werden nie mitgeschickt.</p>
      <button type="button" class="knopf rot" data-a="fhEnde">⏹️ Fernhilfe beenden</button>`;
    if (F.rolle === "mitglied") return kopf("🛟 Fernhilfe") + `<div class="karte"><p>${F.verbunden ? `🟢 <b>${esc(name(F.mit))}</b> sieht jetzt deinen Bildschirm. Geh ruhig dorthin, wo es hakt – die Leiste unten bleibt.` : `📳 Warte auf <b>${esc(name(F.mit))}</b> …`}</p>
      <button type="button" class="knopf rot" data-a="fhEnde">⏹️ ${F.verbunden ? "Beenden" : "Abbrechen"}</button></div>`;
    const l = helfer();
    return kopf("🛟 Fernhilfe") + `<p class="hinweis">Kommst du nicht weiter? Jemand aus der Leitung schaut mit auf deinen Bildschirm und zeigt dir den Weg. Bedienen darf er nur, wenn du es erlaubst. Chats sieht er nie.</p>
      ${istHelfer() ? '<p class="badge b-gruen">🛟 Du bist Helfer – wenn jemand um Hilfe bittet, klingelt es bei dir.</p>' : ""}
      <div class="karte"><h3>Wen möchtest du fragen?</h3><ul class="liste">${l.map(({ p, on }) => `<li><span aria-hidden="true">${on ? "🟢" : "⚪"}</span><div class="fl"><b>${esc(name(p))}</b><div class="zeile-unter">${on ? "gerade online" : "vielleicht nicht in der App"}</div></div>
        <button type="button" class="knopf haupt klein" data-a="fhBitten" data-x="${esc(p.id)}">🛟 Bitten</button></li>`).join("") || "<li>Niemand da, der helfen kann.</li>"}</ul></div>`;
  },
};
AKTIONEN.fhBitten = (pid) => hilfeBitten(pid);
AKTIONEN.fhEnde = () => ende(true);
AKTIONEN.fhModus = (m) => { F.modus = m === "klick" && F.darf ? "klick" : "zeigen"; zeichne(); };
AKTIONEN.fhBedienen = () => { F.bedienen = !F.bedienen; datenSenden(F.kanal, { darf: F.bedienen }); leiste(); toast(F.bedienen ? "🖱️ Der Helfer darf jetzt mit tippen" : "👆 Der Helfer zeigt nur noch"); };
AKTIONEN.fhTippen = (_, el, e) => {
  if (!F.bild || !e) return; const r = el.getBoundingClientRect(), p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  datenSenden(F.kanal, F.modus === "klick" && F.darf ? { klick: p } : { zeig: p });
  const k = document.createElement("span"); k.className = "fh-tipp"; k.style.left = `${p.x * 100}%`; k.style.top = `${p.y * 100}%`; el.parentElement.appendChild(k); setTimeout(() => k.remove(), 900);
};
if (typeof window !== "undefined") window.addEventListener("pagehide", () => { if (F.pc) ende(true); });
