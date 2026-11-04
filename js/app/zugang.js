// 🔑 Zugang & Organisation (0.31.0, wie KC 2.859): freundliche Link-Hilfe (KC-CLUB-LINK-HILFE), 📲 Einladung zum Installieren
// (KC-CLUB-INSTALL-EINLADUNG), 🛡️ Zugang im Blick – Anmeldeversuche/Sperre und „Installiert?“ (KC-CLUB-INSTALL-STAND), 📊 Bachkreis in Zahlen.
// Gerätedaten: nur die Art (installiert/Browser/PC) – kein Gerätename, keine Kennung.
import { S, VIEWS, zeige, zeichne, kopf, name, istLeitung, istVerwalter, einst } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, datumKurz, vorZeit } from "../kern/ui.js";
import { liste, istEchtbetrieb, serverAktion, konfig } from "../kern/daten.js";

// ---------- 📲 Wie läuft die App auf diesem Gerät? ----------
const standalone = () => matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
const mobil = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
export const installModus = () => (standalone() ? "installiert" : mobil() ? "browser" : "pc");
const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
let installEreignis = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEreignis = e; });
addEventListener("appinstalled", () => { installEreignis = null; toast("📲 Installiert – ab jetzt startet die Bachkreis-App vom Startbildschirm"); });
export const installMoeglich = () => !!installEreignis;
export async function installieren() {
  if (installEreignis) { installEreignis.prompt(); const r = await installEreignis.userChoice.catch(() => null); if (r?.outcome === "accepted") toast("📲 Installiert"); installEreignis = null; return; }
  installAnleitung();
}
export function installAnleitung() {
  blatt("📲 App installieren – so geht's", ios()
    ? `<ol class="install-schritte"><li>Den Link in <b>Safari</b> öffnen</li><li>Unten das <b>Teilen-Symbol</b> (Quadrat mit Pfeil ↑) antippen</li><li><b>„Zum Home-Bildschirm“</b> wählen</li><li>Oben rechts <b>„Hinzufügen“</b> – fertig: das Bachkreis-Symbol liegt auf dem Startbildschirm</li></ol>`
    : `<ol class="install-schritte"><li>Den Link in <b>Chrome</b> öffnen</li><li>Oben rechts <b>⋮</b> antippen</li><li><b>„App installieren“</b> bzw. „Zum Startbildschirm hinzufügen“</li><li><b>„Installieren“</b> bestätigen – fertig</li></ol>`);
  document.querySelector("#blattHg .blatt")?.setAttribute("data-leise", "1");
}
AKTIONEN.installieren = () => installieren();
AKTIONEN.installAnleitung = () => installAnleitung();
// Einladung: auf Handy/Tablet im Browser ab dem 3. Öffnen, höchstens alle 3 Tage – „leise“ (Express/Startnachricht gehen vor)
export function installEinladungPruefen() {
  if (installModus() !== "browser" || einst().installEinladung === false) return false;
  let n = 0, zuletzt = 0; try { n = Number(localStorage.getItem("bk_browser_starts") || 0) + 1; localStorage.setItem("bk_browser_starts", String(n)); zuletzt = Number(localStorage.getItem("bk_install_einladung") || 0); } catch { return false; }
  if (n < 3 || Date.now() - zuletzt < 3 * 86400000) return false;
  try { localStorage.setItem("bk_install_einladung", String(Date.now())); } catch {}
  setTimeout(() => {
    if (document.querySelector(".blatt-hg")) return;
    const b = blatt("📲 Mach die Bachkreis-App zu einer echten App", `<ul class="install-vorteile"><li>🚀 startet schneller – direkt vom Startbildschirm</li><li>🔐 du bleibst angemeldet</li><li>🔔 Benachrichtigungen kommen zuverlässig${ios() ? " (auf dem iPhone nur so)" : ""}</li><li>⏱️ dauert keine Minute</li></ul>
      <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="installieren">📲 Jetzt installieren</button><button type="button" class="knopf" data-a="installAnleitung">🖼️ Zeig mir wie</button></div>
      <button type="button" class="knopf klein" data-a="installNie">Nicht mehr fragen</button>`);
    b.dataset.leise = "1";
  }, 2500);
  return true;
}
AKTIONEN.installNie = async () => { const { einstSetzen } = await import("./zustand.js"); einstSetzen("installEinladung", false); document.getElementById("blattHg")?.remove(); toast("Alles klar – unter ⚙️ › 📲 App-Installation geht es jederzeit"); };

// ---------- 🔗 Freundliche Link-Hilfe (Anmeldeseite) ----------
const GRUENDE = {
  CODE_UNGUELTIG: ["🔗", "Dieser Link bzw. Code passt nicht (mehr)", ["Ist der Link vollständig? Manche Programme schneiden das Ende ab – am besten direkt aus der Nachricht antippen.", "Der Code hat 8 Zeichen (Buchstaben und Ziffern) – 0 und O, 1 und I werden nicht verwechselt.", "Hat die Leitung dir einen neuen Link geschickt? Dann gilt nur noch der neue."]],
  ZU_VIELE_VERSUCHE: ["⏳", "Kurze Pause – zu viele Versuche", ["Zum Schutz vor Fremden ist die Anmeldung von diesem Anschluss für 15 Minuten gesperrt.", "Danach einfach den Link noch einmal antippen."]],
  OFFLINE: ["📡", "Keine Verbindung", ["Bitte WLAN oder mobile Daten prüfen und es noch einmal versuchen."]],
};
export function linkHilfeHtml(grund) {
  const [sym, titel, punkte] = GRUENDE[grund] || GRUENDE.OFFLINE, k = konfig();
  const kontakt = String(k.impressum_kontakt || k.schule_telefon || "").trim();
  return `<div class="link-hilfe" role="alert"><b>${sym} ${esc(titel)}</b><ul>${punkte.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    <p class="hinweis">Klappt es nicht? Die Leitung schickt dir gern einen neuen persönlichen Link${kontakt ? ` (${esc(kontakt)})` : ""}. Bitte den Link nicht weitergeben – er ist wie ein Schlüssel.</p></div>`;
}

// ---------- 🛡️ Zugang im Blick (Leitung) ----------
const MODUS = { installiert: ["✅", "installiert"], browser: ["🌐", "im Browser"], pc: ["💻", "am PC"] };
const ZG = { daten: null, fehler: null, laedt: false, filter: "alle" };
async function zgLaden() {
  if (ZG.laedt) return; ZG.laedt = true;
  try { const r = await serverAktion("zugang_lage", {}); if (r?.ok) { ZG.daten = r; ZG.fehler = null; } else ZG.fehler = r?.fehler || "nicht möglich"; } catch (e) { ZG.fehler = e.message; }
  ZG.laedt = false; if (S.view === "zugang") zeichne();
}
VIEWS.zugang = {
  render() {
    if (!istLeitung()) return kopf("🛡️ Zugang im Blick") + '<p class="hinweis">Nur für die Leitung.</p>';
    const ich = `<p class="hinweis">Dieses Gerät: ${MODUS[installModus()].join(" ")}</p>`;
    if (!istEchtbetrieb()) return kopf("🛡️ Zugang im Blick") + `<div class="karte"><p>Anmeldeversuche, Sperren und „📲 Installiert?“ zeigt der Server – in der <b>Vorführversion</b> gibt es keinen.</p>${ich}
      <p class="hinweis">Im Echtbetrieb: Anmeldeversuche der letzten 14 Tage (gelungen/fehlgeschlagen), wie viele Anschlüsse gerade gesperrt sind (nach ${20} Fehlversuchen in 15 Minuten) und je Mitglied, ob die App installiert ist.</p></div>`;
    if (!ZG.daten && !ZG.fehler) { zgLaden(); return kopf("🛡️ Zugang im Blick") + '<p class="hinweis">Wird geladen …</p>'; }
    if (ZG.fehler) return kopf("🛡️ Zugang im Blick") + `<div class="karte"><p class="badge b-grau">❔ Unbekannt – ${esc(ZG.fehler)}</p><button class="knopf" data-a="zgNeu">↻ Nochmal</button></div>`;
    const d = ZG.daten, fehl14 = d.tage.reduce((s, t) => s + t.fehl, 0), ok14 = d.tage.reduce((s, t) => s + t.ok, 0), max = Math.max(1, ...d.tage.map((t) => t.ok + t.fehl));
    const ampel = d.gesperrt ? ["b-rot", `🔴 ${d.gesperrt} Anschluss${d.gesperrt > 1 ? "e" : ""} gerade gesperrt`] : d.fehl24 > 10 ? ["b-gelb", `🟡 ${d.fehl24} Fehlversuche in 24 Std.`] : ["b-gruen", "🟢 Ruhig"];
    const g = d.geraete.map((x) => ({ ...x, m: x.modus || null })), zahl = (m) => g.filter((x) => (m ? x.m === m : !x.m)).length;
    const gl = g.filter((x) => ZG.filter === "alle" || (ZG.filter === "nie" ? !x.m : x.m === ZG.filter));
    const chip = (k, t) => `<button type="button" class="chip-wahl${ZG.filter === k ? " an" : ""}" data-a="zgFilter" data-x="${k}" aria-pressed="${ZG.filter === k}">${t}</button>`;
    return kopf("🛡️ Zugang im Blick", '<button class="knopf klein" data-a="zgNeu">↻</button>') + `<div class="karte"><h3>🔑 Anmeldeversuche (14 Tage)</h3><p><span class="badge ${ampel[0]}">${ampel[1]}</span></p>
      <p>${ok14} gelungen · ${fehl14} fehlgeschlagen · 24 Std.: ${d.fehl24} Fehlversuche</p>
      <div class="zg-balken">${d.tage.map((t) => `<div title="${esc(t.tag)}: ${t.ok} gelungen, ${t.fehl} fehlgeschlagen"><i class="ok" style="height:${(t.ok / max) * 60}px"></i><i class="fehl" style="height:${(t.fehl / max) * 60}px"></i><small>${esc(t.tag.slice(8))}.</small></div>`).join("") || '<p class="hinweis">Keine Anmeldungen.</p>'}</div>
      <p class="hinweis">Gesperrt wird ein Anschluss nach ${d.max} Fehlversuchen in 15 Minuten. Gespeichert ist nur eine Prüfsumme der Adresse – niemand kann daraus ablesen, wer es war.</p></div>
      <div class="karte"><h3>📲 Installiert?</h3>${ich}<div class="wahlen">${chip("alle", `Alle ${g.length}`)}${chip("installiert", `✅ ${zahl("installiert")}`)}${chip("browser", `🌐 ${zahl("browser")}`)}${chip("pc", `💻 ${zahl("pc")}`)}${chip("nie", `❔ ${zahl(null)}`)}</div>
      <ul class="liste">${gl.map((x) => `<li><div class="fl"><div class="zeile-titel">${esc(name(x.person_id))}</div><div class="zeile-unter">${x.m ? MODUS[x.m].join(" ") : "❔ noch nicht gesehen"}${x.zuletzt ? ` · zuletzt ${esc(vorZeit(x.zuletzt))}` : ""}</div></div></li>`).join("") || '<li class="hinweis">Niemand in dieser Auswahl.</li>'}</ul>
      <p class="hinweis">🌐 = öffnet die App im Browser – am besten einmal installieren lassen (Benachrichtigungen kommen dann zuverlässig).</p></div>`;
  },
};
AKTIONEN.zgNeu = () => { ZG.daten = null; ZG.fehler = null; zeichne(); };
AKTIONEN.zgFilter = (x) => { ZG.filter = x; zeichne(); };

// ---------- 📊 Bachkreis in Zahlen (Leitung, Lehrkräfte, Vorstand) – nur aus den Daten, die man ohnehin sieht ----------
export function bachkreisZahlen(heute = new Date()) {
  const p = liste("personen", (x) => x.status === "aktiv"), jahr = heute.getFullYear(), schuljahrAb = new Date(heute.getMonth() >= 7 ? jahr : jahr - 1, 7, 1).toISOString();
  const termine = liste("termine", (t) => t.status !== "abgesagt" && t.beginn >= schuljahrAb && t.beginn <= heute.toISOString());
  const antw = liste("antworten", (a) => termine.some((t) => t.id === a.termin_id));
  const ja = antw.filter((a) => a.antwort === "ja").length;
  const ueb = liste("uebungen", (u) => u.datum >= schuljahrAb.slice(0, 10));
  return {
    schueler: p.filter((x) => x.typ === "schueler").length, eltern: p.filter((x) => x.typ === "eltern").length, lehrkraefte: p.filter((x) => ["leitung", "lehrkraft"].includes(x.typ)).length,
    ehemalige: liste("personen", (x) => x.typ === "ehemalig").length, orchester: liste("gruppen").length,
    termine: termine.length, zusagequote: antw.length ? Math.round((ja / antw.length) * 100) : null,
    instrumente: liste("inventar").length, verliehen: liste("ausleihen", (a) => a.status === "aktiv").length,
    uebeMinuten: ueb.reduce((s, u) => s + (Number(u.minuten) || 0), 0), werke: liste("werke").length, chronik: liste("chronik").length,
    seit: Math.min(...liste("chronik").map((c) => Number(c.jahr) || 9999), 9999),
  };
}
VIEWS.zahlen = {
  render() {
    if (!istVerwalter()) return kopf("📊 Bachkreis in Zahlen") + '<p class="hinweis">Für Leitung, Lehrkräfte und Vorstand.</p>';
    const z = bachkreisZahlen(), k = (sym, zahl, t) => `<div class="zahl-karte"><span aria-hidden="true">${sym}</span><b>${zahl ?? "–"}</b><small>${esc(t)}</small></div>`;
    return kopf("📊 Bachkreis in Zahlen") + `<div class="zahlen-raster">
      ${z.seit < 9999 ? k("🎂", new Date().getFullYear() - z.seit, `Jahre Bachkreis (seit ${z.seit})`) : ""}${k("🎻", z.schueler, "Schülerinnen & Schüler")}${k("👪", z.eltern, "Eltern")}${k("👩‍🏫", z.lehrkraefte, "Leitung & Lehrkräfte")}
      ${k("🎼", z.orchester, "Orchester & Gruppen")}${k("📅", z.termine, "Termine bisher (dieses Schuljahr)")}${k("✅", z.zusagequote == null ? "–" : z.zusagequote + " %", "Zusagen (von allen Antworten)")}
      ${k("🎺", z.instrumente, "Instrumente im Bestand")}${k("🤝", z.verliehen, "gerade verliehen")}${k("⏱️", Math.round(z.uebeMinuten / 60), "Stunden geübt (eingetragen)")}
      ${k("📚", z.werke, "Stücke im Notenarchiv")}${k("🎓", z.ehemalige, "Ehemalige")}</div>
      <p class="hinweis">Gezählt wird nur, was du in der App sehen darfst. Übezeiten nur, soweit sie geteilt wurden. Stand: ${esc(datumKurz(new Date().toISOString()))}.</p>`;
  },
};
