// 🏢 Büro-Raum (0.37.0, Wunsch Hansi „Büro komplett nachbauen wie in der Club App – mit Ordnern, Ordnerschrank mit Jalousie und Bachkreis-Logo, Schreibtisch usw.“)
// Vorbild: KC Club App teile/buero.js (KC-CLUB-BUERO-RAUM, -AKTENSCHRANK-JALOUSIE, -AKTENSCHRANK-SCHLOSS, -SCHRANK-SCHRIFT, -BUERO-SCHREIBTISCH,
// -BUERO-NAMENSSCHILD, -BUERO-PAUSE, -BUERO-EINRICHTEN, -BUERO-FEIN). Für den Bachkreis angepasst:
// 🗄️ Aktenschrank: Zeile „Aktenschrank · n Ordner“, 🔓/🔒 Schloss, Jalousie mit 28 Lamellen „Bachkreis Bergkamen“, Logo + „seit 1969“, runder Pfeilschalter.
// 🪑 Schreibtisch: Pinnwand mit 2 Zetteln, Lampe (T/N/A), Bildschirm mit Uhr + Namensschild, Kalender, Eingangskorb, Drucker, Handy, Kaffee/Glückwunsch,
// Füller, Telefon, Tastatur, Rechner – alles selbst gezeichnet (SVG), jedes Ding ist ein echter Knopf mit Namen.
// ✏️ Einrichten: ziehen/tauschen, fein verschieben, 🛒 Katalog (Tischuhr, Metronom, Stimmgabel, Notenständer, Kopierer, Pflanze, Bild, Locher). Gilt für dieses Gerät.
// Strom: nichts bewegt sich dauerhaft – nur die Uhr im Bildschirm springt jede Minute, solange das Büro offen ist.
import { S, zeige, zeichne, name, rollen, db, einst, einstSetzen } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";
import { BUERO_ORDNER, ROLLEN, bueroDarf } from "../kern/schema.js";
import { cockpit, termineFuer } from "../kern/logik.js";
import { DS, istNacht, modusWaehlen } from "./darstellung.js";
import { geburtstageHeute } from "./kopf.js";
import { rechne, lamellenBuchstaben, plaetzeRechnen, einrichtungPruefen, fein, EXTRA, MAX, PLAETZE, FEIN_SCHRITT } from "../kern/buerotisch.js";

const LS = (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const LSsetzen = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const ruhig = () => einst().effekte === false || document.documentElement.classList.contains("ohne-effekt");

// ---------- Ansicht: 🏠 Raum oder ☰ Liste (je Gerät) ----------
const BU_ANSICHT = "bk_bu_ansicht";
export const raumAn = () => LS(BU_ANSICHT) !== "liste";
AKTIONEN.buAnsicht = () => { LSsetzen(BU_ANSICHT, raumAn() ? "liste" : "raum"); BUE.an = false; zeichne(); };

// ---------- 🗄️ Regal: Büro-Ordner (Registry BUERO_ORDNER) + Wege zu den Bereichen der App ----------
export const REGAL_WEGE = [
  { id: "chronik", sym: "📖", t: "Chronik & Orte", farbe: "#8a6d4e", view: "chronik" },
  { id: "anfragen", sym: "📨", t: "Auftrittsanfragen", farbe: "#6b6f86", view: "anfragen", rollen: ["admin", "leitung", "lehrkraft", "vorstand"] },
  { id: "projekte", sym: "🎭", t: "Projekte & Reisen", farbe: "#7a5c3e", view: "projekte" },
  { id: "partner", sym: "🤝", t: "Partner", farbe: "#5d6b5a", view: "partner" },
  { id: "dokumente", sym: "📂", t: "Dokumente für alle", farbe: "#4f6d7a", view: "dokumente" },
];
export function regalOrdner(r = rollen(), dokZahl = () => 0) {
  const o = Object.entries(BUERO_ORDNER).filter(([k, x]) => bueroDarf(x.sicht, r) || dokZahl(k) > 0).map(([k, x]) => ({ id: k, sym: x.sym, t: x.t, farbe: x.farbe, ordner: k, zahl: dokZahl(k) }));
  return o.concat(REGAL_WEGE.filter((w) => !w.rollen || w.rollen.some((x) => r.includes(x))).map((w) => ({ ...w, zahl: 0 })));
}

// ---------- Aktenschrank mit Jalousie (KC-CLUB-AKTENSCHRANK-JALOUSIE) ----------
const SCHRANK = "bk_bu_schrank", SCHRANK_FEST = "bk_bu_schrank_fest", KLAPP_MS = 320, FAHRT_MS = 1100, TUER_MS = 500;
const schrankOffen = () => LS(SCHRANK) !== "zu";
const schrankFest = () => LS(SCHRANK_FEST) === "1";
const schlossHtml = (fest, auf) => `<button type="button" class="bu-schrank-schloss${fest ? " zu" : ""}" data-a="buSchloss" aria-pressed="${fest}" aria-label="${fest ? "Festgestellt – antippen zum Lösen" : `Aktenschrank ${auf ? "offen" : "zu"} feststellen`}">${fest ? "🔒" : "🔓"}</button>`;
function schrankHtml(regal, anzahl) {
  const auf = schrankOffen();
  return `<div class="bu-schrank${auf ? " auf" : ""}" id="buSchrank">
      <button type="button" class="bu-schrank-zeile" data-a="buSchrank" aria-expanded="${auf}" aria-controls="buSchrankKoerper"><span class="bu-schrank-sym" aria-hidden="true">🗄️</span><b>Aktenschrank</b><small>${anzahl} Ordner</small><span class="bu-schrank-pfeil" aria-hidden="true">${auf ? "⌃" : "⌄"}</span></button>${schlossHtml(schrankFest(), auf)}
      <div class="bu-schrank-koerper" id="buSchrankKoerper"${auf ? "" : " hidden"}>${regal}
        <div class="bu-jalousie" aria-hidden="true"><div class="bu-jal-lamellen">${lamellenBuchstaben().map((z) => `<i class="bu-jal-lamelle">${z ? `<b>${esc(z)}</b>` : ""}</i>`).join("")}</div>
          <div class="bu-jal-marke"><img src="icons/logo.png" alt="" width="72" height="72"><small>seit 1969</small></div></div>
        <button type="button" class="bu-jal-griff" data-a="buSchrank" aria-label="${auf ? "Aktenschrank schließen" : "Aktenschrank öffnen"}">${auf ? "▶" : "◀"}</button>
      </div></div>`;
}
AKTIONEN.buSchloss = () => {
  const s = document.getElementById("buSchrank"); if (!s) return;
  const fest = !schrankFest(), auf = s.classList.contains("auf"); LSsetzen(SCHRANK_FEST, fest ? "1" : "0");
  const alt = s.querySelector(".bu-schrank-schloss"), t = document.createElement("template"); t.innerHTML = schlossHtml(fest, auf); alt?.replaceWith(t.content.firstChild);
  toast(fest ? `🔒 Festgestellt – der Aktenschrank bleibt ${auf ? "offen" : "zu"}` : "🔓 Gelöst – wieder auf- und zuklappbar");
};
let LAEUFT = false;
AKTIONEN.buSchrank = async () => {
  const s = document.getElementById("buSchrank"); if (!s || LAEUFT) return;
  if (schrankFest()) return toast("🔒 Der Aktenschrank ist festgestellt – zum Lösen das Schloss antippen.");
  const auf = !s.classList.contains("auf"), k = document.getElementById("buSchrankKoerper"), j = s.querySelector(".bu-jalousie"), g = s.querySelector(".bu-jal-griff");
  LSsetzen(SCHRANK, auf ? "auf" : "zu");
  const fertig = () => { s.classList.toggle("auf", auf); k.hidden = !auf; j.style.width = ""; s.querySelectorAll(".bu-jal-lamelle").forEach((l) => (l.style.transform = ""));
    s.querySelector(".bu-schrank-zeile").setAttribute("aria-expanded", String(auf)); s.querySelector(".bu-schrank-pfeil").textContent = auf ? "⌃" : "⌄";
    g.textContent = auf ? "▶" : "◀"; g.setAttribute("aria-label", auf ? "Aktenschrank schließen" : "Aktenschrank öffnen"); LAEUFT = false; };
  LAEUFT = true;
  if (ruhig() || !j.animate) return fertig();
  const lam = [...s.querySelectorAll(".bu-jal-lamelle")], warte = (a) => a.finished.catch(() => {});
  const fahrt = { duration: FAHRT_MS, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" }, rechts = () => Math.max(6, k.clientWidth - 52) + "px";
  try {
    if (auf) { // Bereich aufklappen → kurz die geschlossene Tür (Logo) → Lamellen klappen auf → Jalousie fährt nach links zusammen
      s.classList.remove("auf"); j.style.width = "100%"; k.hidden = false; g.textContent = "◀";
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      j.style.setProperty("--sb", k.clientWidth + "px"); g.style.right = "auto"; g.style.left = rechts();
      await new Promise((r) => setTimeout(r, TUER_MS));
      await Promise.all(lam.map((l, i) => warte(l.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(68deg)" }], { duration: KLAPP_MS, delay: (lam.length - 1 - i) * 12, fill: "forwards" }))));
      await Promise.all([warte(j.animate([{ width: "100%" }, { width: "0%" }], fahrt)), warte(g.animate([{ left: rechts() }, { left: "6px" }], fahrt))]);
    } else { // Jalousie fährt von links zu → Lamellen klappen zu → Bereich klappt zur Zeile ein
      j.style.setProperty("--sb", k.clientWidth + "px"); g.style.right = "auto"; g.style.left = "6px";
      s.classList.remove("auf"); j.style.width = "0%"; lam.forEach((l) => (l.style.transform = "rotateY(68deg)"));
      await Promise.all([warte(j.animate([{ width: "0%" }, { width: "100%" }], fahrt)), warte(g.animate([{ left: "6px" }, { left: rechts() }], fahrt))]);
      g.textContent = "◀";
      await Promise.all(lam.map((l, i) => warte(l.animate([{ transform: "rotateY(68deg)" }, { transform: "rotateY(0deg)" }], { duration: KLAPP_MS, delay: i * 12, fill: "forwards" }))));
      await new Promise((r) => setTimeout(r, TUER_MS));
    }
  } catch {}
  [j, g, ...lam].forEach((x) => x.getAnimations?.().forEach((a) => a.cancel())); g.style.left = g.style.right = "";
  fertig();
};
AKTIONEN.buGehe = (v) => zeige(v);

// ---------- 🪑 Schreibtisch ----------
const SVG = {
  lampe: (an) => `<svg viewBox="0 0 70 90" aria-hidden="true">${an ? '<path d="M14 34 L56 34 L70 90 L0 90 Z" fill="rgba(255,231,150,.45)"/>' : ""}<path d="M10 8 L40 4 L50 30 L20 34 Z" fill="${an ? "#f2c14e" : "#1a1500"}"/><circle cx="35" cy="34" r="${an ? 4 : 0}" fill="#fff6c8"/>
    <path d="M38 8 L54 46 L36 80" fill="none" stroke="#3a3f45" stroke-width="4" stroke-linecap="round"/><ellipse cx="36" cy="84" rx="18" ry="5" fill="#3a3f45"/></svg>`,
  korb: '<svg viewBox="0 0 100 70" aria-hidden="true"><rect x="10" y="18" width="80" height="10" fill="#fff" transform="rotate(-3 50 23)"/><rect x="12" y="12" width="76" height="10" fill="#f4f4f4" transform="rotate(2 50 17)"/><path d="M4 26 H96 L88 62 H12 Z" fill="#5b6770"/><path d="M4 26 H96" stroke="#3c454c" stroke-width="4"/><rect x="38" y="40" width="24" height="6" rx="3" fill="#3c454c"/></svg>',
  handy: '<svg viewBox="0 0 50 90" aria-hidden="true"><rect x="5" y="3" width="40" height="84" rx="8" fill="#1d1f22"/><rect x="9" y="11" width="32" height="64" rx="3" fill="#2e7d4f"/><rect x="13" y="18" width="20" height="9" rx="4" fill="#e7f5ec"/><rect x="17" y="32" width="20" height="9" rx="4" fill="#fff"/><rect x="13" y="46" width="16" height="9" rx="4" fill="#e7f5ec"/><circle cx="25" cy="81" r="3" fill="#3a3d42"/></svg>',
  kaffee: '<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="22" cy="44" rx="20" ry="5" fill="#e6ddd3"/><path d="M8 18 H36 V34 A10 10 0 0 1 26 44 H18 A10 10 0 0 1 8 34 Z" fill="#fff"/><path d="M36 22 A6 6 0 0 1 36 34" fill="none" stroke="#fff" stroke-width="4"/><ellipse cx="22" cy="18" rx="14" ry="3" fill="#6b4226"/></svg>',
  karte: '<svg viewBox="0 0 60 50" aria-hidden="true"><path d="M6 46 L30 40 L54 46 L54 10 L30 4 L6 10 Z" fill="#fff6e8" stroke="#e3c9a3"/><path d="M30 4 V40" stroke="#e3c9a3"/><text x="18" y="30" font-size="16" text-anchor="middle">🎂</text><text x="42" y="22" font-size="6" fill="#8a6400" text-anchor="middle">Alles</text><text x="42" y="30" font-size="6" fill="#8a6400" text-anchor="middle">Gute!</text></svg>',
  fueller: '<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M14 44 H46 L50 66 H10 Z" fill="#23304a"/><rect x="18" y="38" width="24" height="8" rx="2" fill="#3a4a6a"/><ellipse cx="30" cy="40" rx="10" ry="2.5" fill="#0b1630"/><path d="M33 40 L48 4 L53 6 L38 42 Z" fill="#1a1500"/><path d="M33 40 L36 42 L34 46 Z" fill="#d4af37"/><rect x="44" y="6" width="7" height="3" fill="#d4af37" transform="rotate(22 47 7)"/></svg>',
  telefon: '<svg viewBox="0 0 110 80" aria-hidden="true"><path d="M10 70 L22 34 H88 L100 70 Z" fill="#2b2f34"/><rect x="34" y="40" width="42" height="24" rx="3" fill="#3d434a"/><g fill="#cfd6dc"><rect x="38" y="44" width="9" height="5" rx="1"/><rect x="51" y="44" width="9" height="5" rx="1"/><rect x="64" y="44" width="9" height="5" rx="1"/><rect x="38" y="52" width="9" height="5" rx="1"/><rect x="51" y="52" width="9" height="5" rx="1"/><rect x="64" y="52" width="9" height="5" rx="1"/></g><path d="M8 30 Q55 8 102 30 L96 40 Q55 22 14 40 Z" fill="#f2b705"/><rect x="82" y="44" width="12" height="16" rx="2" fill="#9fd8b3"/></svg>',
  drucker: '<svg viewBox="0 0 110 56" aria-hidden="true"><rect x="6" y="0" width="98" height="40" rx="6" fill="#e9ecef"/><rect x="22" y="22" width="66" height="8" rx="2" fill="#9aa4ad"/><rect x="28" y="28" width="54" height="26" fill="#fff" stroke="#d8dde1"/><circle cx="92" cy="12" r="3" fill="#2e7d4f"/></svg>',
  rechner: '<svg viewBox="0 0 80 100" aria-hidden="true"><rect x="6" y="4" width="68" height="92" rx="8" fill="#3a3f45"/><rect x="14" y="12" width="52" height="18" rx="3" fill="#b9d3a8"/><text x="62" y="26" font-size="12" text-anchor="end" fill="#22301a" font-family="monospace">1969</text><g fill="#e8ebee"><rect x="14" y="38" width="10" height="9" rx="2"/><rect x="28" y="38" width="10" height="9" rx="2"/><rect x="42" y="38" width="10" height="9" rx="2"/><rect x="56" y="38" width="10" height="9" rx="2" fill="#f2b705"/><rect x="14" y="52" width="10" height="9" rx="2"/><rect x="28" y="52" width="10" height="9" rx="2"/><rect x="42" y="52" width="10" height="9" rx="2"/><rect x="56" y="52" width="10" height="9" rx="2" fill="#f2b705"/><rect x="14" y="66" width="10" height="9" rx="2"/><rect x="28" y="66" width="10" height="9" rx="2"/><rect x="42" y="66" width="10" height="9" rx="2"/><rect x="56" y="66" width="10" height="23" rx="2" fill="#f2b705"/><rect x="14" y="80" width="24" height="9" rx="2"/><rect x="42" y="80" width="10" height="9" rx="2"/></g></svg>',
  tastatur: '<svg viewBox="0 0 220 70" aria-hidden="true"><rect x="4" y="6" width="212" height="58" rx="8" fill="#f2f2f2" stroke="#c9c9c9"/><g fill="#fff" stroke="#d2d2d2">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${12 + i * 19}" y="14" width="16" height="12" rx="2"/>`).join("") + '<rect x="183" y="14" width="25" height="12" rx="2"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${12 + i * 19}" y="30" width="16" height="12" rx="2"/>`).join("") + '<rect x="164" y="30" width="44" height="12" rx="2"/><rect x="12" y="46" width="30" height="12" rx="2"/><rect x="45" y="46" width="118" height="12" rx="2"/><rect x="166" y="46" width="42" height="12" rx="2"/></g></svg>',
};
const uhrzeit = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const LAMPE_MODUS = { tag: ["T", "Tag"], nacht: ["N", "Nacht"], auto: ["A", "Automatik"] };
export const eingang = () => (S.ich ? cockpit(db, S.ich.id).filter((x) => x.dring >= 2) : []);
const kommend = (t) => t.status !== "abgesagt" && new Date(t.ende || t.beginn) >= new Date();
const frueh = (l) => l.filter(kommend).sort((a, b) => String(a.beginn).localeCompare(String(b.beginn)))[0] || null;
// eigener nächster Termin – sonst (Leitung ist nicht überall eingeladen) der nächste Termin des Bachkreises
const naechsterTermin = () => (S.ich ? frueh(termineFuer(db, S.ich.id)) || frueh(liste("termine")) : null);
const tageBis = (iso) => Math.round((new Date(String(iso).slice(0, 10) + "T12:00:00") - new Date(new Date().toISOString().slice(0, 10) + "T12:00:00")) / 86400000);
export function amtVon(r = []) { const a = r.filter((x) => x !== "admin" && x !== "eltern" && x !== "schueler"); return ROLLEN[a[0] || r[0]]?.split(" (")[0] || ""; }
function namensschild() {
  if (!S.ich) return ""; const n = name(S.ich), a = amtVon(rollen());
  return `<span class="bu-namensschild"><b>${esc(n)}</b>${a ? `<small>${esc(a)}</small>` : ""}</span>`;
}
function monitorZeilen(t, e, gb) {
  const z = [];
  if (t) { const d = tageBis(t.beginn); z.push(`📅 ${esc(t.titel || "Termin")} ${d <= 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`}`); }
  if (e.length) z.push(`📥 ${e.length} ${e.length === 1 ? "Sache wartet" : "Sachen warten"}`);
  if (gb.length) z.push(`🎂 ${gb.length === 1 ? `${esc(gb[0].vorname)} hat Geburtstag` : `${gb.length} Geburtstage`}`);
  return z;
}
function tischDinge() {
  const t = naechsterTermin(), e = eingang(), gb = geburtstageHeute().filter((p) => p.id !== S.ich?.id), nacht = istNacht(), zeilen = monitorZeilen(t, e, gb), kal = t ? new Date(t.beginn) : null;
  const ding = (id, inhalt, label, aktion, extra = "", kat = "") => `<button type="button" class="bu-obj bu-o-${id}${kat ? " bu-o-kat" : ""}" style="grid-area:${id}" data-a="${aktion}" title="${esc(label.replace(/&amp;/g, "&").replace(/&shy;/g, ""))}"><span class="bu-ozeichnung" aria-hidden="true">${inhalt}</span><span class="bu-olabel">${label}</span>${extra}</button>`;
  const monitor = `<button type="button" class="bu-obj bu-o-monitor" style="grid-area:monitor" data-a="buAnsicht" title="Bildschirm – Büro als Liste öffnen">
      <span class="bu-mon" aria-hidden="true"><span class="bu-mon-schirm"><span class="bu-mon-uhr">${uhrzeit()}</span>${zeilen.length ? zeilen.map((x) => `<span class="bu-mon-zeile">${x}</span>`).join("") : '<span class="bu-mon-logo"><img src="icons/logo.png" alt="" width="40" height="40"><small>Bachkreis Bergkamen</small></span>'}</span></span><span class="bu-mon-fuss" aria-hidden="true"></span><span class="bu-olabel">Bildschirm</span>${namensschild()}</button>`;
  const kalender = ding("kalender", kal ? `<span class="bu-kal"><span class="bu-kmon">${esc(kal.toLocaleDateString("de-DE", { month: "short" }))}</span><span class="bu-ktag">${kal.getDate()}</span><span class="bu-kwt">${esc(kal.toLocaleDateString("de-DE", { weekday: "short" }))}</span></span>` : '<span class="bu-kal"><span class="bu-kmon">–</span><span class="bu-ktag">?</span></span>', kal ? esc(t.titel || "Nächster Termin") : "Termine", "buKalender");
  const lm = LAMPE_MODUS[DS.modus] || LAMPE_MODUS.auto;
  const lampe = `<span class="bu-o-lampe-platz" style="grid-area:lampe"><button type="button" class="bu-obj bu-o-lampe" data-a="buLampe" aria-label="Lampe – gerade ${lm[1]}, ${nacht ? "ausschalten: Tagmodus" : "einschalten: Nachtmodus"}">${SVG.lampe(nacht)}<span class="bu-olabel">Lampe</span></button>
    <span class="bu-lampe-modi" role="group" aria-label="Licht: Tag, Nacht oder Automatik">${Object.entries(LAMPE_MODUS).map(([k, [b, tt]]) => `<button type="button" class="${(DS.modus || "auto") === k ? "an" : ""}" aria-pressed="${(DS.modus || "auto") === k}" aria-label="${tt}" data-a="buLampeModus" data-x="${k}">${b}</button>`).join("")}</span></span>`;
  const teile = [lampe, monitor, kalender,
    ding("korb", SVG.korb, "Eingang", "buEingang", e.length ? `<span class="bu-dzahl">${e.length}</span>` : ""),
    ding("drucker", SVG.drucker, "Drucken", "buDrucker"),
    ding("handy", SVG.handy, "Handy", "buHandy"),
    gb.length ? ding("kaffee", SVG.karte, "Glück&shy;wunsch", "buGlueckwunsch", `<span class="bu-dzahl">${gb.length}</span>`) : ding("kaffee", SVG.kaffee, "Pause", "buPause"),
    ding("fueller", SVG.fueller, "Füller", "buFueller"),
    ding("telefon", SVG.telefon, "Telefon", "buTelefon"),
    ding("tastatur", SVG.tastatur, "Nachricht &amp; Rundschreiben", "buTastatur"),
    ding("rechner", SVG.rechner, "Rechner", "buRechner"),
    ...KATALOG.filter((k) => BUE.dinge.includes(k.id)).map((k) => ding(k.id, k.svg(), k.t, k.aktion, "", "kat"))];
  return verteilen(teile);
}
export function raumHtml({ docZahl = () => 0 } = {}) {
  const e = eingang(), t = naechsterTermin(), ordner = regalOrdner(rollen(), docZahl), gb = geburtstageHeute().filter((p) => p.id !== S.ich?.id);
  const ruecken = (o) => `<button type="button" class="bu-ordner" style="--of:${o.farbe}" data-a="${o.ordner ? "buOrdner" : "buGehe"}" data-x="${esc(o.ordner || o.view)}" title="${esc(o.t)}${o.zahl ? ` – ${o.zahl} Dokumente` : ""}"><span class="bu-osym" aria-hidden="true">${o.sym}</span><span class="bu-otext">${esc(o.t)}</span>${o.zahl ? `<span class="bu-ozahl">${o.zahl}<span class="nur-vorlesen"> Dokumente</span></span>` : ""}<span class="bu-oloch" aria-hidden="true"></span></button>`;
  setTimeout(raumNach, 0);
  return `${gb.length ? `<div class="karte bu-tipp">🎉 Heute: ${gb.map((p) => `${esc(p.vorname)} hat Geburtstag`).join(" · ")}</div>` : ""}
    <div class="bu-raum">
      ${schrankHtml(`<div class="bu-wand"><div class="bu-regal">${ordner.map(ruecken).join("")}</div></div>`, ordner.length)}
      <div class="bu-tisch">
        <div class="bu-pinnwand" aria-label="Pinnwand im Büro"><div class="bu-zettelreihe">
          <button type="button" class="bu-zettel" data-a="buKalender"><b>Nächster Termin</b>${t ? `${esc(t.titel || "Termin")} · ${esc(new Date(t.beginn).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" }))}` : "Keiner geplant"}</button>
          <button type="button" class="bu-zettel blau" data-a="buEingang"><b>Eingang</b>${e.length ? `${e.length} ${e.length === 1 ? "Sache wartet" : "Sachen warten"} auf dich` : "Alles erledigt 👍"}</button>
        </div></div>
        ${BUE.an ? leisteHtml() : ""}<div class="bu-platte bu-dinge${BUE.extra || BUE.an ? " bu-extra" : ""}${BUE.an ? " bu-einrichten" : ""}" id="buPlatte">${tischDinge()}</div>
      </div>
    </div>`;
}
let UHR = 0;
function raumNach() {
  if (BUE.an) ziehenAn();
  if (UHR) return;
  UHR = setInterval(() => { const u = document.querySelector(".bu-mon-uhr"); if (!u) { clearInterval(UHR); UHR = 0; return; } if (document.hidden) return; u.textContent = uhrzeit(); const sv = document.querySelector(".bu-o-uhr svg"); if (sv) { const t = document.createElement("div"); t.innerHTML = KATALOG[0].svg(); sv.replaceWith(t.firstChild); } }, 60000);
}

// ---------- Was die Dinge tun ----------
AKTIONEN.buLampe = () => { const n = !istNacht(); modusWaehlen(n ? "nacht" : "tag"); toast(n ? "💡 Licht an – Nachtmodus (Automatik: „A“ an der Lampe)" : "☀️ Licht aus – Tagmodus (Automatik: „A“ an der Lampe)"); zeichne(); };
AKTIONEN.buLampeModus = (k) => { modusWaehlen(LAMPE_MODUS[k] ? k : "auto"); toast(k === "auto" ? "🌗 Automatik – hell am Tag, dunkel am Abend" : k === "nacht" ? "🌙 Nachtmodus" : "☀️ Tagmodus"); zeichne(); };
AKTIONEN.buKalender = () => { const t = naechsterTermin(); zeige(t ? "termin" : "termine", t ? { id: t.id } : {}); };
AKTIONEN.buEingang = () => {
  const e = eingang();
  blatt("📥 Eingang", e.length ? `<p class="hinweis">Was gerade auf dich wartet – antippen öffnet es.</p><div class="bu-eingangsliste">${e.map((x) => `<button type="button" class="bu-ein-zeile" data-a="oeffne" data-x="${esc(x.ziel.view)}|${esc(x.ziel.id || "")}"><span class="sym" aria-hidden="true">${x.sym}</span><span class="txt"><b>${esc(x.text)}</b></span><span class="pfeil" aria-hidden="true">›</span></button>`).join("")}</div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="buGehe" data-x="cockpit">🧭 Alles im Cockpit</button></div>` : '<p>👍 Gerade liegt nichts an.</p><div class="knopfreihe"><button type="button" class="knopf" data-a="buGehe" data-x="cockpit">🧭 Zum Cockpit</button></div>');
};
const wahlBlatt = (titel, sym, w) => blatt(titel, `<div class="bu-wahl">${w.filter((x) => x.ok !== false).map((x) => `<button type="button" class="mini-kachel bu-wahl-k" data-a="buWahl" data-x="${esc(x.a)}"><span class="mk-sym" aria-hidden="true">${x.sym}</span><span class="mk-titel">${esc(x.t)}</span><span class="mk-unter">${esc(x.u)}</span></button>`).join("")}</div>`);
// buWahl: „aktion:wert“ oder „view:name“ – Blatt schließen, dann ausführen
AKTIONEN.buWahl = (x) => { blattZu(); const [art, w] = String(x).split(":"); setTimeout(() => (art === "view" ? zeige(w) : AKTIONEN[art]?.(w || undefined)), 0); };
const leitet = () => rollen().some((r) => ["admin", "leitung", "lehrkraft"].includes(r));
AKTIONEN.buFueller = () => wahlBlatt("✒️ Mit dem Füller schreiben", "✒️", [
  { sym: "✉️", t: "Brief / Elternbrief", u: "aus Vorlage, mit Briefkopf", a: "buBriefNeu" },
  { sym: "🗒️", t: "Protokoll", u: "mit fester Gliederung", a: "buProtokollNeu" },
  { sym: "📌", t: "Zettel an die Pinnwand", u: "für alle oder einzelne", a: "view:pinnwand" },
  { sym: "📜", t: "Chronik-Eintrag", u: "Konzert, Reise, Auftrittsort", a: "buChronikNeu" },
  { sym: "🎂", t: "Glückwunsch", u: "an ein Geburtstagskind", a: "buGlueckwunsch", ok: geburtstageHeute().some((p) => p.id !== S.ich?.id) },
]);
AKTIONEN.buChronikNeu = () => { zeige("chronik", { tab: "chronik" }); setTimeout(() => AKTIONEN.chNeu?.(), 50); };
AKTIONEN.buDrucker = () => wahlBlatt("🖨️ Was möchtest du drucken?", "🖨️", [
  { sym: "✉️", t: "Briefbogen", u: "Brief mit Bachkreis-Logo", a: "buBriefNeu" },
  { sym: "🗒️", t: "Protokoll-Vorlage", u: "leer, zum Mitschreiben", a: "buProtokollDruck" },
  { sym: "📄", t: "Aus den Vorlagen", u: "Urkunde, Einladung …", a: "buOrdner:vorlagen" },
  { sym: "📅", t: "Termine", u: "Liste zum Aufhängen", a: "view:termine" },
  { sym: "🎼", t: "Noten", u: "aus dem Notenarchiv", a: "view:noten" },
]);
AKTIONEN.buTastatur = () => wahlBlatt("⌨️ Nachricht schreiben", "⌨️", [
  { sym: "💬", t: "An eine Person", u: "Chat in der App", a: "buNachrichtPerson" },
  { sym: "📣", t: "Rundschreiben", u: "an Gruppen, Eltern, alle", a: "view:rundschreiben", ok: leitet() || rollen().includes("vorstand") },
  { sym: "🪧", t: "Startnachricht", u: "erscheint beim Öffnen der App", a: "view:startnachricht", ok: leitet() },
  { sym: "💬", t: "Alle Unterhaltungen", u: "Nachrichten öffnen", a: "view:nachrichten" },
]);
// 📱 / ☎️ Person wählen – Kinder nicht direkt (Kinderschutz: über die Eltern)
const PW = { q: "", weiter: null, titel: "", sym: "" };
const personenWahl = () => liste("personen", (p) => p.status === "aktiv" && p.id !== S.ich?.id && p.typ !== "schueler").sort((a, b) => name(a).localeCompare(name(b), "de"));
const personZeilen = () => { const q = PW.q.trim().toLowerCase(), l = personenWahl().filter((p) => !q || name(p).toLowerCase().includes(q)).slice(0, 60);
  return l.map((p) => `<button type="button" class="bu-telzeile" data-a="buPersonGewaehlt" data-x="${esc(p.id)}"><b>${esc(name(p))}</b><small>${esc(amtVon(p.rollen || []) || (p.typ === "eltern" ? "Eltern" : ""))}</small><span aria-hidden="true">${PW.sym}</span></button>`).join("") || '<p class="hinweis">Niemand gefunden.</p>'; };
function personBlatt() {
  blatt(PW.titel, `<input type="search" class="einst-suche" placeholder="🔍 Name suchen …" value="" data-c="buPersonSuche" aria-label="Name suchen" id="buPersonSuche">
    <div class="bu-telliste" id="buTelListe">${personZeilen()}</div><p class="hinweis">Kinder erreichst du über ihre Eltern (Kinderschutz).</p>`);
  const i = document.getElementById("buPersonSuche"); if (i) i.oninput = () => AKTIONEN.buPersonSuche(i.value);
}
const personWaehlen = (titel, sym, weiter) => { Object.assign(PW, { q: "", titel, sym, weiter }); personBlatt(); };
AKTIONEN.buPersonSuche = (v) => { PW.q = String(v || ""); const l = document.getElementById("buTelListe"); if (l) l.innerHTML = personZeilen(); };
AKTIONEN.buPersonGewaehlt = (id) => PW.weiter?.(id);
const nummer = (p) => String(p?.mobil || p?.telefon || "").replace(/[^\d+]/g, "");
const telLink = (n) => `tel:${n}`, waLink = (n) => `https://wa.me/${n.replace(/^\+/, "").replace(/^0/, "49")}`;
AKTIONEN.buHandy = () => personWaehlen("📱 Wen möchtest du erreichen?", "📱", (id) => {
  const p = hole("personen", id), n = nummer(p);
  blatt(`📱 ${esc(name(p))}`, `<div class="knopfspalte"><button type="button" class="knopf haupt" data-a="chatMit" data-x="${esc(id)}">💬 Nachricht in der App</button>
    ${n ? `<a class="knopf" href="${esc(telLink(n))}">📞 Anrufen</a><a class="knopf" href="${esc(waLink(n))}" target="_blank" rel="noopener noreferrer">🟢 WhatsApp ↗</a>` : ""}</div>
    ${n ? "" : `<p class="hinweis">${esc(p?.vorname || "")} hat keine Nummer freigegeben – Anrufen und WhatsApp gehen deshalb nicht.</p>`}
    <div class="knopfreihe"><button type="button" class="knopf" data-a="buHandy">‹ Andere Person</button></div>`);
});
AKTIONEN.buTelefon = () => personWaehlen("☎️ Wen möchtest du anrufen?", "📞", (id) => {
  const p = hole("personen", id), n = nummer(p);
  if (!n) return blatt(`☎️ ${esc(name(p))}`, `<p>Keine Telefonnummer freigegeben.</p><div class="knopfreihe"><button type="button" class="knopf haupt" data-a="chatMit" data-x="${esc(id)}">💬 Stattdessen Nachricht</button><button type="button" class="knopf" data-a="buTelefon">‹ Andere Person</button></div>`);
  blatt(`☎️ ${esc(name(p))}`, `<p class="bu-nummer">${esc(p.mobil || p.telefon)}</p><div class="knopfreihe"><a class="knopf haupt" href="${esc(telLink(n))}">📞 Jetzt anrufen</a><button type="button" class="knopf" data-a="buTelefon">‹ Andere Person</button></div>`);
});
AKTIONEN.buNachrichtPerson = () => personWaehlen("💬 Nachricht an wen?", "💬", (id) => { blattZu(); AKTIONEN.chatMit?.(id); });
AKTIONEN.buGlueckwunsch = () => {
  const gb = geburtstageHeute().filter((p) => p.id !== S.ich?.id);
  blatt("🎂 Glückwunsch", gb.length ? `<p>Heute haben Geburtstag:</p><div class="bu-telliste">${gb.map((p) => `<button type="button" class="bu-telzeile" data-a="chatMit" data-x="${esc(p.id)}"><b>🎉 ${esc(name(p))}</b><span>💬 gratulieren</span></button>`).join("")}</div>` : "<p>Heute hat niemand Geburtstag.</p>");
};
// ☕ Pause: Bildschirmschoner mit Logo (KC-CLUB-BUERO-PAUSE)
AKTIONEN.buPause = () => {
  if (document.getElementById("buSchoner")) return;
  const s = document.createElement("div"); s.id = "buSchoner"; s.className = "bu-schoner"; s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true"); s.setAttribute("aria-label", "Pause – Bildschirmschoner");
  s.innerHTML = `<div class="bu-schoner-feld"><div class="bu-schoner-logo"><span class="bu-schoner-marke"><img src="icons/logo.png" alt="" width="120" height="120"></span><b>Bachkreis Bergkamen</b>
      <span>${S.ich ? `<strong>${esc(name(S.ich))}</strong> ist im Büro in der Pause` : "Das Büro ist in der Pause"}</span><small>☕ Pause seit ${uhrzeit()} Uhr</small></div></div>
    <button type="button" class="bu-schoner-weiter">Antippen zum Weiterarbeiten</button>`;
  const zu = () => { s.remove(); document.removeEventListener("keydown", taste); toast("☕ Pause beendet – weiter geht's"); };
  const taste = (e) => { if (e.key !== "Tab") zu(); };
  s.addEventListener("click", (e) => { e.stopPropagation(); zu(); }); document.addEventListener("keydown", taste);
  document.body.appendChild(s); s.querySelector(".bu-schoner-weiter").focus();
};
AKTIONEN.buProtokollDruck = () => {
  const zeilen = (n) => Array.from({ length: n }, () => "_______________________________________________________________").join("\n");
  AKTIONEN.buDruckText?.("Protokoll", `Besprechung am: ____________   Ort: ____________________\nAnwesend: ${zeilen(1)}\nProtokoll: ____________________\n\nTOP 1 – ${zeilen(3)}\n\nTOP 2 – ${zeilen(3)}\n\nBeschlüsse:\n${zeilen(3)}\n\nAufgaben (wer · was · bis wann):\n${zeilen(4)}\n\nNächste Besprechung: ____________`);
};

const RE = { a: "" };
const rechnerHtml = () => `<div class="bu-rechner"><output class="bu-r-anzeige" id="buRAnzeige" aria-live="polite">${esc(RE.a || "0")}</output>
  <div class="bu-r-tasten">${["C", "⌫", "÷", "×", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "0", ","].map((k) => `<button type="button" class="bu-r-t${/[÷×−+=]/.test(k) ? " op" : ""}${k === "=" ? " gleich" : ""}${k === "0" ? " null" : ""}" data-a="buRTaste" data-x="${k}" aria-label="${{ "÷": "geteilt", "×": "mal", "−": "minus", "+": "plus", "=": "gleich", "⌫": "löschen", C: "alles löschen", ",": "Komma" }[k] || k}">${k}</button>`).join("")}</div></div>`;
AKTIONEN.buRechner = () => { RE.a = ""; blatt("🧮 Rechner", rechnerHtml()); };
AKTIONEN.buRTaste = (k) => {
  if (k === "C") RE.a = ""; else if (k === "⌫") RE.a = RE.a.slice(0, -1);
  else if (k === "=") { const r = rechne(RE.a); RE.a = r === null ? "" : String(r).replace(".", ","); if (r === null) toast("Das kann ich nicht rechnen"); }
  else if (RE.a.length < 30) RE.a += k;
  const a = document.getElementById("buRAnzeige"); if (a) a.textContent = RE.a || "0";
};

// ---------- ✏️ Einrichten (KC-CLUB-BUERO-EINRICHTEN / -FEIN) – gespeichert auf diesem Gerät ----------
const holz = (f) => `<path d="M14 58 H46 L40 6 H20 Z" fill="${f}"/>`;
export const KATALOG = [ // Registry: neue Teile nur hier
  { id: "uhr", t: "Tischuhr", x: "Zeigt die Uhrzeit · antippen öffnet die Termine", aktion: "buKalender", svg: () => { const d = new Date(), h = ((d.getHours() % 12) + d.getMinutes() / 60) * 30, m = d.getMinutes() * 6;
    return `<svg viewBox="0 0 60 64" aria-hidden="true"><rect x="22" y="54" width="16" height="8" rx="2" fill="#8a6d4e"/><circle cx="30" cy="30" r="26" fill="#c9a24a"/><circle cx="30" cy="30" r="21" fill="#fffaf0"/>${[...Array(12).keys()].map((i) => `<rect x="29.2" y="10.5" width="1.6" height="${i % 3 ? 2.5 : 4}" fill="#3a3f45" transform="rotate(${i * 30} 30 30)"/>`).join("")}<path d="M30 30 V18" stroke="#3a3f45" stroke-width="3" stroke-linecap="round" transform="rotate(${h} 30 30)"/><path d="M30 30 V13" stroke="#8a6400" stroke-width="2" stroke-linecap="round" transform="rotate(${m} 30 30)"/><circle cx="30" cy="30" r="2" fill="#3a3f45"/></svg>`; } },
  { id: "metronom", t: "Metronom", x: "Öffnet das Metronom (Uhr & Takt)", aktion: "buMetronom", svg: () => `<svg viewBox="0 0 60 64" aria-hidden="true">${holz("#7a4a26")}<path d="M20 6 H40 L42 14 H18 Z" fill="#5b3519"/><rect x="22" y="22" width="16" height="30" fill="#f3e6c8"/><path d="M30 50 L38 14" stroke="#1a1500" stroke-width="2.5" stroke-linecap="round"/><rect x="33" y="24" width="6" height="5" fill="#d4af37" transform="rotate(15 36 26)"/><rect x="10" y="56" width="40" height="6" rx="2" fill="#5b3519"/></svg>` },
  { id: "stimmgabel", t: "Stimmgabel", x: "Spielt den Kammerton a′ (440 Hz)", aktion: "buStimmgabel", svg: () => '<svg viewBox="0 0 40 70" aria-hidden="true"><path d="M12 4 V34 Q12 44 20 44 Q28 44 28 34 V4" fill="none" stroke="#b9c2ca" stroke-width="5" stroke-linecap="round"/><rect x="18" y="43" width="4" height="20" rx="2" fill="#8d979f"/><circle cx="20" cy="64" r="4" fill="#6d777f"/></svg>' },
  { id: "notenpult", t: "Notenpult", x: "Öffnet das Notenarchiv", aktion: "buNotenarchiv", svg: () => '<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M8 8 H52 L48 34 H12 Z" fill="#2b2f34"/><rect x="14" y="10" width="32" height="20" fill="#fffdf6"/><g stroke="#3a3f45" stroke-width=".8">' + [13, 16, 19, 22, 25].map((y) => `<path d="M16 ${y} H44"/>`).join("") + '</g><circle cx="24" cy="19" r="1.6" fill="#1a1500"/><circle cx="32" cy="17.5" r="1.6" fill="#1a1500"/><path d="M30 34 V62 M20 66 L30 62 L40 66" stroke="#2b2f34" stroke-width="3" fill="none" stroke-linecap="round"/></svg>' },
  { id: "kopierer", t: "Kopierer", x: "Datei einlesen und im Büro ablegen", aktion: "buDateiNeu", svg: () => '<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="6" y="20" width="78" height="46" rx="5" fill="#dfe3e7"/><rect x="10" y="8" width="70" height="14" rx="3" fill="#c3cad1"/><rect x="14" y="12" width="40" height="3" fill="#8a949c"/><rect x="62" y="11" width="14" height="7" rx="2" fill="#2e7d4f"/><rect x="16" y="34" width="58" height="6" rx="2" fill="#9aa4ad"/><rect x="20" y="44" width="50" height="16" fill="#fff" stroke="#d8dde1"/></svg>' },
  { id: "pflanze", t: "Pflanze", x: "Nur Deko · antippen gießt sie", aktion: "buDeko", svg: () => '<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M30 40 C14 34 8 18 12 8 C24 14 30 26 30 40 Z" fill="#4f8a4b"/><path d="M30 40 C46 34 52 20 48 10 C36 16 30 28 30 40 Z" fill="#3f7a3c"/><path d="M30 42 C26 26 30 14 34 6 C38 18 36 30 30 42 Z" fill="#5c9a57"/><path d="M16 40 H44 L40 66 H20 Z" fill="#b5603a"/><rect x="14" y="38" width="32" height="6" rx="2" fill="#9c4f2e"/></svg>' },
  { id: "bild", t: "Bild", x: "Bilderrahmen mit dem Bachkreis-Logo · Deko", aktion: "buDeko", svg: () => '<svg viewBox="0 0 60 64" aria-hidden="true"><rect x="6" y="4" width="48" height="56" rx="3" fill="#1a1500"/><rect x="11" y="9" width="38" height="46" fill="#f3ebdd"/><image href="icons/logo.png" x="14" y="12" width="32" height="32"/><text x="30" y="52" font-size="5" text-anchor="middle" fill="#8a6400">seit 1969</text></svg>' },
  { id: "locher", t: "Locher", x: "Nur Deko · antippen macht „klack“", aktion: "buDeko", svg: () => '<svg viewBox="0 0 70 50" aria-hidden="true"><rect x="6" y="36" width="58" height="10" rx="3" fill="#3a3f45"/><path d="M12 36 L16 16 H54 L58 36 Z" fill="#f2b705"/><rect x="18" y="12" width="34" height="6" rx="3" fill="#8a6400"/><circle cx="24" cy="42" r="2" fill="#cfd6dc"/><circle cx="46" cy="42" r="2" fill="#cfd6dc"/></svg>' },
];
AKTIONEN.buMetronom = () => AKTIONEN.uhrWerkzeug?.("metronom");
AKTIONEN.buNotenarchiv = () => zeige("noten");
AKTIONEN.buDeko = (_, el) => { const id = el?.closest("[data-ding]")?.dataset.ding; toast(id === "pflanze" ? "💧 Gegossen – danke!" : id === "locher" ? "📎 Klack!" : "🖼️ Bachkreis Bergkamen – seit 1969"); };
AKTIONEN.buStimmgabel = () => {
  try { const C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 440; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.3, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 3); o.start(); o.stop(c.currentTime + 3.1); toast("🎵 a′ = 440 Hz"); } catch { toast("Ton geht hier nicht"); }
};
const BUE = { an: false, wahl: null, vorher: null, extra: false, aktuell: {}, ...einrichtungPruefen(einst().bueroEinrichtung, KATALOG.map((k) => k.id)) };
function verteilen(teile) {
  const frei = [...PLAETZE, ...EXTRA], ids = teile.map((h) => (h.match(/style="grid-area:([a-z0-9]+)"/) || [])[1]).filter(Boolean);
  const platz = plaetzeRechnen(ids, frei, BUE.plaetze); BUE.aktuell = platz; BUE.extra = Object.values(platz).some((a) => EXTRA.includes(a));
  const stil = (id) => { const p = BUE.versatz[id]; return p ? `;translate:${p[0]}% ${p[1]}%` : ""; };
  return teile.map((h) => h.replace(/style="grid-area:([a-z0-9]+)"/, (m, id) => (platz[id] ? `data-ding="${id}" style="grid-area:${platz[id]}${stil(id)}"` : 'hidden style=""'))).join("")
    + (BUE.an ? frei.filter((a) => !Object.values(platz).includes(a)).map((a) => `<button type="button" class="bu-leer" data-slot="${a}" style="grid-area:${a}" aria-label="Freier Platz"></button>`).join("") : "");
}
const leisteHtml = () => `<div class="bu-einr-leiste" role="group" aria-label="Schreibtisch einrichten"><p class="hinweis">✋ <b>Ziehe ein Teil</b> auf einen anderen Platz – oder <b>tippe zwei Teile nacheinander</b> an: sie tauschen die Plätze. 🎯 <b>Feiner:</b> ein Teil antippen und mit den Pfeilen schieben.</p>
  <div class="knopfreihe"><span class="bue-fein" role="group" aria-label="Angetipptes Teil fein verschieben">${[["◀", "-1,0", "nach links"], ["▲", "0,-1", "nach oben"], ["▼", "0,1", "nach unten"], ["▶", "1,0", "nach rechts"], ["⊙", "mitte", "wieder genau auf den Platz"]].map(([s, x, l]) => `<button type="button" class="knopf klein" data-a="bueFein" data-x="${x}" aria-label="${l}">${s}</button>`).join("")}</span>
  <button type="button" class="knopf klein" data-a="bueKatalog">🛒 Katalog</button><button type="button" class="knopf klein" data-a="bueZurueck">↩️ Wie vorher</button><button type="button" class="knopf klein" data-a="bueGrund">🏠 Grundaufstellung</button><button type="button" class="knopf klein haupt" data-a="bueFertig">✔ Fertig</button></div></div>`;
const bueSpeichern = () => einstSetzen("bueroEinrichtung", { plaetze: BUE.plaetze, dinge: BUE.dinge, versatz: BUE.versatz });
AKTIONEN.bueStart = () => {
  if (BUE.an) return AKTIONEN.bueFertig();
  LSsetzen(BU_ANSICHT, "raum"); BUE.an = true; BUE.wahl = null; BUE.vorher = { plaetze: { ...BUE.plaetze }, dinge: [...BUE.dinge], versatz: { ...BUE.versatz } }; zeichne();
  setTimeout(() => document.getElementById("buPlatte")?.scrollIntoView({ block: "center", behavior: ruhig() ? "auto" : "smooth" }), 50);
};
AKTIONEN.bueZurueck = () => { if (BUE.vorher) Object.assign(BUE, { plaetze: { ...BUE.vorher.plaetze }, dinge: [...BUE.vorher.dinge], versatz: { ...BUE.vorher.versatz } }); BUE.wahl = null; zeichne(); };
AKTIONEN.bueGrund = async () => { if (!(await frage("🏠 Alles wieder an den Grundplatz stellen und die Katalog-Teile wegräumen?"))) return; Object.assign(BUE, { plaetze: {}, dinge: [], versatz: {}, wahl: null }); zeichne(); };
AKTIONEN.bueFertig = () => { BUE.an = false; BUE.wahl = null; BUE.plaetze = { ...BUE.aktuell }; bueSpeichern(); toast("✔ Dein Schreibtisch ist eingerichtet (auf diesem Gerät)"); zeichne(); };
AKTIONEN.bueFein = (x) => {
  const id = BUE.wahl; if (!id) return toast("Erst das Teil antippen, das du verschieben möchtest – dann die Pfeile.");
  const alt = BUE.versatz[id] || [0, 0], [dx, dy] = x === "mitte" ? [0, 0] : x.split(",").map(Number), neu = x === "mitte" ? [0, 0] : [fein(alt[0] + dx * FEIN_SCHRITT), fein(alt[1] + dy * FEIN_SCHRITT)];
  const v = { ...BUE.versatz }; if (neu[0] || neu[1]) v[id] = neu; else delete v[id]; BUE.versatz = v;
  const d = document.querySelector(`#buPlatte [data-ding="${id}"]`); if (d) d.style.translate = neu[0] || neu[1] ? `${neu[0]}% ${neu[1]}%` : "";
};
function tauschen(a, b, slot) {
  const p = { ...BUE.aktuell };
  if (b && p[b]) [p[a], p[b]] = [p[b], p[a]]; else if (slot) p[a] = slot; else return;
  BUE.plaetze = p; BUE.wahl = null; zeichne();
}
function ziehenAn() {
  const pl = document.getElementById("buPlatte"); if (!pl || pl.dataset.einr) return; pl.dataset.einr = "1";
  let z = null;
  const zurueck = () => { if (!z) return; z.d.style.transform = ""; z.d.classList.remove("bu-zieht"); z = null; };
  pl.addEventListener("click", (e) => { if (!BUE.an) return; e.preventDefault(); e.stopPropagation(); const leer = e.target.closest("[data-slot]"); if (leer && BUE.wahl) tauschen(BUE.wahl, null, leer.dataset.slot); }, true);
  pl.addEventListener("pointerdown", (e) => { const d = e.target.closest("[data-ding]"); if (!BUE.an || !d) return; z = { d, x: e.clientX, y: e.clientY, weg: false, id: e.pointerId }; try { d.setPointerCapture(e.pointerId); } catch {} });
  pl.addEventListener("pointermove", (e) => { if (!z || e.pointerId !== z.id) return; const dx = e.clientX - z.x, dy = e.clientY - z.y; if (!z.weg && Math.hypot(dx, dy) > 8) { z.weg = true; z.d.classList.add("bu-zieht"); } if (z.weg) { e.preventDefault(); z.d.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`; } });
  pl.addEventListener("pointerup", (e) => {
    if (!z || e.pointerId !== z.id) return; const { d, weg, x: x0, y: y0 } = z; zurueck();
    if (!weg) { const id = d.dataset.ding; if (!BUE.wahl) { BUE.wahl = id; pl.querySelectorAll(".bu-gewaehlt").forEach((x) => x.classList.remove("bu-gewaehlt")); d.classList.add("bu-gewaehlt"); } else if (BUE.wahl === id) { BUE.wahl = null; d.classList.remove("bu-gewaehlt"); } else tauschen(BUE.wahl, id); return; }
    d.style.visibility = "hidden"; const ziel = document.elementFromPoint(e.clientX, e.clientY)?.closest("#buPlatte [data-ding], #buPlatte [data-slot]"); d.style.visibility = "";
    if (ziel && ziel !== d) tauschen(d.dataset.ding, ziel.dataset.ding || null, ziel.dataset.slot || null);
    else { const r = d.getBoundingClientRect(), id = d.dataset.ding, alt = BUE.versatz[id] || [0, 0]; if (r.width && r.height) { BUE.versatz = { ...BUE.versatz, [id]: [fein(alt[0] + ((e.clientX - x0) / r.width) * 100), fein(alt[1] + ((e.clientY - y0) / r.height) * 100)] }; d.style.translate = `${BUE.versatz[id][0]}% ${BUE.versatz[id][1]}%`; } }
  });
  pl.addEventListener("pointercancel", zurueck);
}
AKTIONEN.bueKatalog = () => {
  const voll = BUE.dinge.length >= MAX;
  blatt("🛒 Katalog für deinen Schreibtisch", `<p class="hinweis">Bis zu ${MAX} Teile dazustellen – sie kommen in die untere Reihe und lassen sich dann wie alles andere verschieben.</p>
    <div class="bue-katalog">${KATALOG.map((k) => { const da = BUE.dinge.includes(k.id); return `<div class="bue-kat-teil${da ? " da" : ""}"><span class="bue-kat-bild">${k.svg()}</span><span class="bue-kat-text"><b>${esc(k.t)}</b><small>${esc(k.x)}</small></span>
      <button type="button" class="knopf klein${da ? "" : " haupt"}" data-a="bueKatalogWahl" data-x="${k.id}" ${!da && voll ? "disabled" : ""}>${da ? "➖ Weg" : "➕ Dazu"}</button></div>`; }).join("")}</div>
    ${voll ? `<p class="hinweis">Der Tisch ist voll (${MAX} Teile) – erst etwas wegräumen.</p>` : ""}`);
};
AKTIONEN.bueKatalogWahl = (id) => {
  if (BUE.dinge.includes(id)) { BUE.dinge = BUE.dinge.filter((x) => x !== id); const p = { ...BUE.plaetze }; delete p[id]; BUE.plaetze = p; }
  else if (BUE.dinge.length < MAX) BUE.dinge = [...BUE.dinge, id];
  if (!BUE.an) bueSpeichern();
  zeichne(); AKTIONEN.bueKatalog();
};
export const einrichtenAn = () => BUE.an;
