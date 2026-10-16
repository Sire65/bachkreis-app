// 🟢 Wer ist gerade online · 👋 Anklopfen (0.16.0, wie in der KC Club App).
// Jedes Gerät meldet sich alle 45 s; in 💬 Nachrichten steht oben „Gerade online“ mit Knöpfen zum Anklopfen.
// Anklopfen = „Hast du gerade kurz Zeit?“ – der andere antwortet ✅ Ja, jetzt (Chat geht auf) · ⏰ Später · ✋ Gerade nicht.
// Wer die Funktion bekommt, stellt die Leitung im Zahnrad ein (Leitung & Lehrkräfte · Schüler · Eltern); jeder kann sich unsichtbar
// schalten. Man sieht nur Personen, denen man auch privat schreiben darf (Kinderschutz, wie im Chat). Erzwungen wird es auf dem Server.
import { S, db, einst, istLeitung, vorname, name } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste, hole, speichere, konfig, abonnieren, istEchtbetrieb, serverAktionStill, neueId } from "../kern/daten.js";
import { onlineErlaubt, chatPartnerErlaubt, ONLINE_KREISE, onlineFuer } from "../kern/schema.js";
import { kinderVon, elternVon } from "../kern/logik.js";
import { gesicht } from "./gesichter.js";

const ONL = { liste: [], erlaubt: false, stand: 0, timer: null, warte: null, gesehen: new Set() };
const TAKT_MS = 45000, KLOPF_SEK = 60;
export const onlineAn = () => !!S.ich && onlineErlaubt(S.ich, konfig());

// Vorführversion: ein paar Personen „sind online“ (feste Auswahl je 5 Minuten), nach denselben Regeln wie der Server
function demoListe() {
  const k = konfig(), ich = S.ich, verw = new Set([...kinderVon(db, ich.id), ...elternVon(db, ich.id)]);
  const kandidaten = liste("personen", (p) => p.id !== ich.id && onlineErlaubt(p, k) && chatPartnerErlaubt(ich, p, { verwandt: verw.has(p.id), schuelerUntereinander: k.chat_schueler_untereinander !== false }));
  const fenster = Math.floor(Date.now() / 300000), wahl = kandidaten.filter((p, i) => (i * 7 + fenster) % 9 < 2 || p.id === "p-leitung").slice(0, 6);
  return wahl.map((p) => ({ id: p.id, vorname: p.vorname, name: name(p.id), typ: p.typ }));
}
async function melden() {
  if (!S.ich || document.hidden) return;
  if (!istEchtbetrieb()) { ONL.erlaubt = onlineAn(); ONL.liste = ONL.erlaubt ? demoListe() : []; ONL.stand = Date.now(); return aktualisieren(); }
  try {
    const r = await serverAktionStill("online", { sichtbar: einst().onlineZeigen !== false });
    if (r?.ok) { ONL.erlaubt = !!r.erlaubt; ONL.liste = r.liste || []; ONL.stand = Date.now(); }
  } catch { /* offline: Stand veraltet → Anzeige verschwindet nach 3 Minuten (nie „online“ aus altem Stand) */ }
  aktualisieren();
}
const frisch = () => Date.now() - ONL.stand < 3 * 60000;
// Für Startseite (Kachel), Fußzeile (Zahl) und Orchester (grüner Punkt): nur ein frischer Stand zählt – nie „online“ aus altem Stand
export const onlineIds = () => new Set(ONL.erlaubt && frisch() ? ONL.liste.map((p) => p.id) : []);
export const onlineZahl = () => onlineIds().size;
export const onlineSichtbar = () => ONL.erlaubt && frisch();
let letzteIds = "";
function geaendert() { const k = [...onlineIds()].sort().join(","); if (k !== letzteIds) { letzteIds = k; document.dispatchEvent(new CustomEvent("bk-online")); } }
// 🟢 Liste „Gerade online“ als Fenster (Startseite, Fußzeile): Anklopfen oder gleich schreiben
AKTIONEN.onlineListe = () => {
  if (!onlineSichtbar()) return toast("🟢 „Wer ist online“ ist für dich nicht freigeschaltet (Zahnrad › Wer ist online).", 4000);
  blatt(`🟢 Gerade online (${ONL.liste.length})`, ONL.liste.length ? `<ul class="liste on-liste">${ONL.liste.map((p) => `<li><span class="on-bild">${gesicht(p.id)}<i></i></span><div class="fl"><b>${esc(p.name || p.vorname)}</b><div class="hinweis">gerade online</div></div>
      <button class="knopf haupt klein" data-a="anklopfenFrage" data-x="${esc(p.id)}">👋 Anklopfen</button><button class="knopf klein" data-a="anklopfenSchreiben" data-x="${esc(p.id)}" aria-label="Nachricht schreiben">💬</button></li>`).join("")}</ul>`
    : '<p class="hinweis">Gerade ist sonst niemand online. Sobald jemand die App öffnet, erscheint hier ein 🟢.</p>');
};
export function onlineLeisteHtml() {
  if (!ONL.erlaubt || !frisch()) return "";
  const l = ONL.liste;
  return `<div class="on-leiste" id="onLeiste"><div class="on-kopf"><span class="on-punkt"></span><b>Gerade online</b>${l.length ? " – antippen zum Anklopfen" : ""}</div>
    ${l.length ? `<div class="on-knoepfe">${l.map((p) => `<button type="button" data-a="anklopfenFrage" data-x="${esc(p.id)}"><span class="on-bild">${gesicht(p.id)}<i></i></span>${esc(p.vorname || p.name)}</button>`).join("")}</div>` : '<div class="hinweis">Gerade ist sonst niemand online.</div>'}</div>`;
}
function aktualisieren() {
  geaendert();
  const e = document.getElementById("onLeiste"), neu = onlineLeisteHtml();
  if (e) { if (!neu) e.remove(); else e.outerHTML = neu; }
  else if (neu && S.view === "nachrichten") document.querySelector("#inhalt .chat-suche")?.insertAdjacentHTML("beforebegin", neu);
  klopfenPruefen();
}

// ---------- 👋 Anklopfen (Absender) ----------
AKTIONEN.anklopfenFrage = (pid) => {
  const p = ONL.liste.find((x) => x.id === pid) || { id: pid, vorname: vorname(pid) };
  blatt(`👋 Bei ${p.vorname} anklopfen?`, `<div class="on-gross">${gesicht(pid)}</div><p>${esc(p.vorname)} bekommt sofort die Frage, ob ihr jetzt schreiben wollt.</p>
    <div class="knopfreihe"><button class="knopf haupt" data-a="anklopfen" data-x="${esc(pid)}">👋 Anklopfen</button><button class="knopf" data-a="anklopfenSchreiben" data-x="${esc(pid)}">💬 Lieber gleich schreiben</button></div>`);
};
AKTIONEN.anklopfenSchreiben = async (pid) => { blattZu(); (await import("./nachrichten.js")).chatMitText(pid, ""); };
AKTIONEN.anklopfen = async (pid) => {
  let id;
  if (istEchtbetrieb()) {
    const r = await serverAktionStill("anklopfen", { an: pid }).catch(() => null);
    if (!r?.ok) return toast(r?.fehler === "NICHT_ONLINE" ? "Gerade nicht mehr online – schreib lieber eine Nachricht." : r?.fehler === "GERADE_ANGEKLOPFT" ? "Du hast gerade schon angeklopft – kurz warten." : "Anklopfen ging gerade nicht.", 4000);
    id = r.id;
  } else {
    id = neueId("kl"); await speichere("klopfen", { id, von: S.ich.id, an: pid, zeit: new Date().toISOString(), antwort: null }, { still: true });
    // Vorführung: der andere antwortet nach ein paar Sekunden
    setTimeout(async () => { const k = hole("klopfen", id); if (k && !k.antwort) await speichere("klopfen", { ...k, antwort: Math.random() < 0.7 ? "ja" : "spaeter", antwort_am: new Date().toISOString() }, { still: true }); }, 4000 + Math.random() * 3000);
  }
  warten(id, pid);
};
function warten(id, pid) {
  ONL.warte = { id, pid, bis: Date.now() + KLOPF_SEK * 1000 };
  const b = blatt(`👋 Klopfe an bei ${vorname(pid)} …`, `<div id="onWarte"></div>`); b.closest(".blatt-hg")?.addEventListener("click", (e) => e.stopPropagation(), true);
  const takt = () => {
    const w = ONL.warte, e = document.getElementById("onWarte"); if (!w || !e) return clearInterval(ONL.wTimer);
    const k = hole("klopfen", w.id);
    if (k?.antwort) { clearInterval(ONL.wTimer); return antwortGekommen(k); }
    const sek = Math.max(0, Math.ceil((w.bis - Date.now()) / 1000));
    e.innerHTML = sek > 0 ? `<div class="on-gross klopft">${gesicht(pid)}</div><div class="on-uhr">${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, "0")}</div>
      <p class="hinweis" style="text-align:center">Warte auf Antwort – sobald ${esc(vorname(pid))} „Ja“ sagt, geht der Chat auf.</p><button class="knopf breit" data-a="anklopfenAuflegen">📵 Auflegen</button>`
      : `<p><b>${esc(vorname(pid))}</b> hat noch nicht reagiert.</p><div class="knopfreihe"><button class="knopf haupt" data-a="anklopfen" data-x="${esc(pid)}">👋 Nochmal</button><button class="knopf" data-a="anklopfenSchreiben" data-x="${esc(pid)}">💬 Nachricht schreiben</button><button class="knopf" data-a="anklopfenAuflegen">📵 Auflegen</button></div>`;
    if (sek <= 0) clearInterval(ONL.wTimer);
  };
  clearInterval(ONL.wTimer); takt(); ONL.wTimer = setInterval(takt, 1000);
}
async function antwortGekommen(k) {
  const w = vorname(k.an); ONL.warte = null; blattZu();
  if (k.antwort === "ja") { toast(`✅ ${w} hat Zeit – der Chat geht auf`); (await import("./nachrichten.js")).chatMitText(k.an, ""); }
  else toast(k.antwort === "spaeter" ? `⏰ ${w} meldet sich später` : `✋ ${w} hat gerade keine Zeit`, 4000);
}
AKTIONEN.anklopfenAuflegen = () => { ONL.warte = null; clearInterval(ONL.wTimer); blattZu(); };

// ---------- 👋 Anklopfen (Empfänger): neue Anfrage → Fenster mit drei Knöpfen ----------
function klopfenPruefen() {
  if (!S.ich) return;
  const w = ONL.warte; if (w) { const k = hole("klopfen", w.id); if (k?.antwort && document.getElementById("onWarte")) antwortGekommen(k); }
  const neu = liste("klopfen", (k) => k.an === S.ich.id && !k.antwort && Date.now() - new Date(k.zeit) < 2 * 60000 && !ONL.gesehen.has(k.id))[0];
  if (!neu || document.getElementById("onKlopf")) return;
  ONL.gesehen.add(neu.id);
  blatt(`👋 ${vorname(neu.von)} klopft an`, `<div id="onKlopf"><div class="on-gross klopft">${gesicht(neu.von)}</div><p style="text-align:center"><b>${esc(name(neu.von))}</b> fragt: Hast du gerade kurz Zeit?</p>
    <div class="t-gruende"><button type="button" data-a="klopfAntwort" data-x="${esc(neu.id)}|ja">✅ Ja, jetzt</button><button type="button" data-a="klopfAntwort" data-x="${esc(neu.id)}|spaeter">⏰ Später</button><button type="button" data-a="klopfAntwort" data-x="${esc(neu.id)}|nein">✋ Gerade nicht</button></div></div>`);
  try { navigator.vibrate?.([120, 80, 120]); } catch {}
}
AKTIONEN.klopfAntwort = async (x) => {
  const [id, a] = x.split("|"), k = hole("klopfen", id); if (!k) return blattZu();
  await speichere("klopfen", { ...k, antwort: a, antwort_am: new Date().toISOString() }, { still: true }); blattZu();
  if (a === "ja") (await import("./nachrichten.js")).chatMitText(k.von, "");
  else toast(a === "spaeter" ? `⏰ ${vorname(k.von)} weiß Bescheid: später` : `✋ ${vorname(k.von)} weiß Bescheid`);
};

// ---------- ⚙️ Einstellungen ----------
export function onlineEinstellungenHtml() {
  const an = onlineFuer(konfig()), ich = onlineAn();
  return `${ich ? `<label class="schalter"><span><b>🟢 Mich als online zeigen</b><div class="hinweis">Aus: niemand sieht, dass du gerade da bist – und niemand kann bei dir anklopfen.</div></span><input type="checkbox" data-c="einstSchalter2" data-x="onlineZeigen" ${einst().onlineZeigen !== false ? "checked" : ""}></label>`
    : `<p class="hinweis">„Wer ist online“ und Anklopfen sind für dich gerade nicht freigeschaltet.</p>`}
    ${istLeitung() ? `<div class="feld"><label>Wer bekommt die Funktion? (gilt für alle)</label><div class="t-wahl">${Object.entries(ONLINE_KREISE).map(([k, n]) => `<label class="t-chip"><input type="checkbox" data-c="onlineKreis" data-x="${k}" ${an.includes(k) ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div>
      <p class="hinweis">🔒 Kinderschutz bleibt: Man sieht und erreicht nur, wem man auch privat schreiben darf (Schüler untereinander nur, wenn das in der PC-Verwaltung erlaubt ist).</p></div>` : ""}`;
}
AKTIONEN.onlineKreis = async (_, el) => {
  const k = el.dataset.x, an = new Set(onlineFuer(konfig()));
  el.checked ? an.add(k) : an.delete(k);
  try { await (await import("../kern/daten.js")).konfigSetzen("online_fuer", [...an]); toast("🟢 Gespeichert"); melden(); } catch (e) { toast("⚠️ " + e.message); }
};

export function onlineStart() {
  clearInterval(ONL.timer); melden(); ONL.timer = setInterval(melden, TAKT_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) melden(); });
  abonnieren((tabs) => { if (!tabs || tabs.includes?.("klopfen") || tabs.includes?.("konfig")) klopfenPruefen(); });
  document.addEventListener("bk-ansicht", () => setTimeout(aktualisieren, 0));
}
