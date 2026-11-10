// ❓ Hilfe-Zentrum + 🔍 Lupe (0.39.0, wie KC-CLUB-HILFEZENTRUM, KC-CLUB-LUPE, KC-CLUB-SUCHE-UNSCHARF):
// Hilfe nach Themen (Kapitel 1, 2 … · Einträge 1.1 …) mit Suche, „neu“ seit dem letzten Besuch und „👉 Zeig mir wo“ (+ Leiste „↩️ Zurück zur Hilfe“).
// Unten rechts in allen Ansichten zwei runde Knöpfe: 🔍 Lupe (sucht Funktionen, Hilfen, Personen, Termine, Chats, Noten, Dokumente) und ? (Hilfe).
// Ausblenden: in der Hilfe ganz unten. Im Chat stehen die Knöpfe nicht (dort ist die Eingabe).
import { S, VIEWS, zeige, zeichne, kopf, name, einst, einstSetzen, istEltern, istSchueler, istVerwalter, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { liste } from "../kern/daten.js";
import { HILFE_THEMEN, hilfeFuer, hilfeGliederung, hilfeNeu } from "../kern/hilfe.js";
import { suchen } from "../kern/suche.js";
import { TU_PLANER } from "../kern/schema.js";
import { adventSichtbar } from "../kern/advent.js";
import { APP_VERSION } from "../kern/version.js";
import { KACHELN } from "./start.js";
import { meineUnterhaltungen } from "./start.js";
import { chatTitel } from "./nachrichten.js";

const GESEHEN = "bk_hz_gesehen";
const LS = (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const darf = (fuer) => ({ eltern: istEltern(), kinder: istSchueler(), verwalter: istVerwalter(), leitung: hatRolle("admin", "leitung"), buero: hatRolle("admin", "leitung", "lehrkraft", "vorstand"), planer: hatRolle(...TU_PLANER), advent: adventSichtbar(new Date(), hatRolle("admin", "leitung")), erwachsen: !istSchueler() })[fuer] ?? true;
const HZ = { thema: null, q: "", vorher: null, unterwegs: null, behalten: false };
const eintraege = () => hilfeFuer(darf);

VIEWS.hilfe = {
  render(p = {}) {
    if (p.thema !== undefined) { HZ.thema = p.thema || null; delete p.thema; }
    if (HZ.vorher === null) { HZ.vorher = LS(GESEHEN, "0.38.0"); try { localStorage.setItem(GESEHEN, APP_VERSION); } catch {} }
    const alle = eintraege(), { themen, nr } = hilfeGliederung(alle), neu = alle.filter((e) => hilfeNeu(e, HZ.vorher));
    const karte = (e, wo) => { const th = HILFE_THEMEN.find((t) => t.id === e.thema);
      return `<div class="karte hz-eintrag" data-hz="${esc(e.id)}">${wo && th ? `<div class="hz-wo">Kapitel ${esc(nr[e.id].split(".")[0])} · ${th.sym} ${esc(th.t)}</div>` : ""}<h3><span class="hz-nr">${esc(nr[e.id])}</span> ${e.sym} ${esc(e.t)}${hilfeNeu(e, HZ.vorher) ? ' <span class="badge b-gelb">neu</span>' : ""}</h3>
        <p>${esc(e.text)}</p>${e.ziel ? `<button type="button" class="knopf klein haupt" data-a="hzLos" data-x="${esc(e.id)}">👉 Zeig mir wo</button>` : ""}</div>`; };
    const suche = `<div class="karte hz-suche"><label for="hzSuche"><b>🔍 Wonach suchst du?</b></label><input id="hzSuche" type="search" value="${esc(HZ.q)}" placeholder="z. B. absagen, Noten, stumm …" autocomplete="off"></div>`;
    let inhalt;
    if (HZ.q.trim().length >= 2) { const t = suchen(HZ.q, alle.map((e) => ({ ...e, u: e.text })), 30); inhalt = t.length ? t.map((e) => karte(e, true)).join("") : `<div class="leer">Nichts gefunden – versuch ein anderes Wort oder frag die Leitung.</div>`; }
    else if (HZ.thema) { const th = themen.find((t) => t.id === HZ.thema); inhalt = th ? `<h2 class="hz-kapitel">${th.nr}. ${th.sym} ${esc(th.t)}</h2>${th.es.map((e) => karte(e, false)).join("")}<button type="button" class="knopf" data-a="hzThema" data-x="">‹ Alle Themen</button>` : ""; }
    else inhalt = (neu.length ? `<div class="karte hz-neu"><h3>✨ Neu seit deinem letzten Besuch (${neu.length})</h3><ul class="liste">${neu.map((e) => `<li class="klick" data-a="hzZu" data-x="${esc(e.id)}"><span aria-hidden="true">${e.sym}</span><div class="fl">${esc(e.t)}</div><span aria-hidden="true">›</span></li>`).join("")}</ul></div>` : "")
      + `<div class="hz-themen">${themen.map((t) => { const n = t.es.filter((e) => hilfeNeu(e, HZ.vorher)).length; return `<button type="button" class="hz-thema" data-a="hzThema" data-x="${esc(t.id)}"><span class="hz-tsym" aria-hidden="true">${t.sym}</span><b>${t.nr}. ${esc(t.t)}</b><small>${t.es.length} Hilfen${n ? ` · ${n} neu` : ""}</small></button>`; }).join("")}</div>
      <div class="karte"><h3>Noch Fragen?</h3><p>Frag die Leitung über 💬 Nachrichten – oder schau in die 💡 Tipps.</p><div class="knopfreihe"><button type="button" class="knopf klein haupt" data-a="rmNeu" data-x="problem">🆘 Klappt etwas nicht?</button><button type="button" class="knopf klein" data-a="rmNeu" data-x="lob">⭐ Rückmeldung zur App</button><button type="button" class="knopf klein" data-a="kachel" data-x="nachrichten">💬 Nachricht schreiben</button><button type="button" class="knopf klein" data-a="lupe">🔍 Ganze App durchsuchen</button></div>
        <label class="hz-schalter"><input type="checkbox" class="schalter-cb" data-c="hzKnoepfe" ${einst().hilfeKnoepfe !== false ? "checked" : ""}> Runde Knöpfe 🔍 und ? unten rechts zeigen</label></div>`;
    return kopf("❓ Hilfe & Tipps") + suche + inhalt;
  },
  nach(w) { const f = w.querySelector("#hzSuche"); f?.addEventListener("input", () => { HZ.q = f.value; const pos = f.selectionStart; zeichne(); const g = document.getElementById("hzSuche"); g?.focus(); try { g?.setSelectionRange(pos, pos); } catch {} }); },
};
AKTIONEN.hzThema = (t) => { HZ.thema = t || null; HZ.q = ""; zeichne(); window.scrollTo(0, 0); };
AKTIONEN.hzZu = (id) => { const e = eintraege().find((x) => x.id === id); if (!e) return; HZ.thema = e.thema; HZ.q = ""; zeichne(); setTimeout(() => { const k = document.querySelector(`[data-hz="${CSS.escape(id)}"]`); k?.scrollIntoView({ block: "center" }); k?.classList.add("hervor"); setTimeout(() => k?.classList.remove("hervor"), 2200); }, 50); };
AKTIONEN.hzKnoepfe = (_, el) => { einstSetzen("hilfeKnoepfe", !!el.checked); knoepfeSetzen(); toast(el.checked ? "🔍 ? Knöpfe an" : "Knöpfe aus – wieder einschalten: Mehr › Hilfe"); };
// 👉 Zeig mir wo
AKTIONEN.hzLos = (id) => {
  const e = eintraege().find((x) => x.id === id); if (!e?.ziel) return;
  HZ.unterwegs = { id, thema: HZ.thema, q: HZ.q, y: scrollY };
  blattZu();
  if (e.ziel.v) zeige(e.ziel.v); else if (e.ziel.a) AKTIONEN[e.ziel.a]?.();
  document.getElementById("hzLeiste")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="hz-leiste" id="hzLeiste" role="toolbar" aria-label="Hilfe"><button type="button" data-a="hzZurueck">↩️ Zurück zur Hilfe</button><button type="button" data-a="hzLeisteZu">✕</button></div>`);
};
AKTIONEN.hzLeisteZu = () => { document.getElementById("hzLeiste")?.remove(); HZ.unterwegs = null; };
AKTIONEN.hzZurueck = () => { const u = HZ.unterwegs; AKTIONEN.hzLeisteZu(); blattZu(); if (u) { HZ.thema = u.thema; HZ.q = u.q; HZ.behalten = true; } zeige("hilfe"); if (u) setTimeout(() => AKTIONEN.hzZu(u.id), 30); };

// ---------- 🔍 Lupe: die ganze App durchsuchen ----------
function quellen() {
  const k = Object.values(KACHELN).flat().filter((x) => !x.nur || x.nur()), ids = new Set();
  const funktionen = k.filter((x) => !ids.has(x.id) && ids.add(x.id)).map((x) => ({ t: x.t, u: x.u, sym: x.sym, a: "kachel", x: x.id }));
  const hilfen = eintraege().map((e) => ({ t: e.t, u: e.text, sym: e.sym, a: "hzZuAusLupe", x: e.id }));
  const personen = liste("personen", (p) => p.status !== "ausgetreten" && p.vorname).map((p) => ({ t: name(p), u: p.typ === "schueler" ? "Schüler/in" : p.typ === "eltern" ? "Eltern" : "Bachkreis", sym: "👤", a: "oeffne", x: `person|${p.id}` }));
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const termine = liste("termine", (t) => new Date(t.ende || t.beginn) >= heute && t.status !== "abgesagt").map((t) => ({ t: t.titel, u: new Date(t.beginn).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" }) + (t.ort ? ` · ${t.ort}` : ""), sym: "📅", a: "oeffne", x: `termin|${t.id}` }));
  const chats = meineUnterhaltungen().map((u) => ({ t: chatTitel(u), u: "Chat", sym: "💬", a: "oeffne", x: `unterhaltung|${u.id}` }));
  const noten = liste("werke").map((w) => ({ t: w.titel, u: [w.komponist, w.bearbeitung].filter(Boolean).join(" · "), extra: w.komponist, sym: "🎼", a: "kachel", x: "noten" }));
  const dok = liste("dokumente").map((d) => ({ t: d.titel, u: d.beschreibung || "Dokument", sym: "📂", a: d.ordner ? "buDok" : "kachel", x: d.ordner ? d.id : "dokumente" }));
  return [["🧭 Funktionen", funktionen], ["❓ Hilfe", hilfen], ["💬 Chats", chats], ["📅 Termine", termine], ["👤 Personen", personen], ["🎼 Noten", noten], ["📂 Dokumente", dok]];
}
const LU = { q: "" };
function lupeErgebnis() {
  const q = LU.q.trim(); if (q.length < 2) return '<p class="hinweis">Mindestens 2 Buchstaben – Tippfehler sind nicht schlimm.</p>';
  const gruppen = quellen().map(([t, l]) => [t, suchen(q, l, 6)]).filter(([, l]) => l.length);
  return gruppen.map(([t, l]) => `<h4 class="lupe-gruppe">${t}</h4><div class="lupe-liste">${l.map((e) => `<button type="button" class="lupe-zeile" data-a="lupeWahl" data-x="${esc(e.a)}~${esc(e.x)}"><span aria-hidden="true">${e.sym}</span><span class="fl"><b>${esc(e.t)}</b>${e.u ? `<small>${esc(String(e.u).slice(0, 90))}</small>` : ""}</span></button>`).join("")}</div>`).join("") || '<p class="hinweis">Nichts gefunden.</p>';
}
AKTIONEN.lupe = () => {
  blatt("🔍 Suchen in der ganzen App", `<input type="search" id="lupeFeld" class="einst-suche" placeholder="Was suchst du? z. B. Mozart, Probe, Schmidt, stumm …" value="${esc(LU.q)}" autocomplete="off" aria-label="Suchbegriff"><div id="lupeErgebnis" aria-live="polite">${lupeErgebnis()}</div>`);
  const f = document.getElementById("lupeFeld"); if (!f) return;
  f.focus(); f.addEventListener("input", () => { LU.q = f.value; const e = document.getElementById("lupeErgebnis"); if (e) e.innerHTML = lupeErgebnis(); });
};
AKTIONEN.lupeWahl = (x) => { const [a, w] = String(x).split("~"); blattZu(); AKTIONEN[a]?.(w); };
AKTIONEN.hzZuAusLupe = (id) => { HZ.behalten = true; zeige("hilfe"); setTimeout(() => AKTIONEN.hzZu(id), 30); };

// ---------- runde Knöpfe unten rechts ----------
function knoepfeSetzen() {
  let k = document.getElementById("hilfeKnoepfe");
  if (!k) { k = document.createElement("div"); k.id = "hilfeKnoepfe"; k.className = "hilfe-knoepfe";
    k.innerHTML = '<button type="button" data-a="lupe" aria-label="Ganze App durchsuchen" title="Suchen">🔍</button><button type="button" data-a="kachel" data-x="hilfe" aria-label="Hilfe" title="Hilfe">?</button>';
    document.body.appendChild(k); }
  k.hidden = !S.ich || einst().hilfeKnoepfe === false || ["unterhaltung", "hilfe", "buehne", "notenblatt"].includes(S.view);
}
let letzteSicht = null;
document.addEventListener("bk-ansicht", () => {
  // neu in die Hilfe (nicht „zurück zur Hilfe“): mit der Themen-Übersicht anfangen, wie KC hzStart
  if (S.view === "hilfe" && letzteSicht !== "hilfe" && !HZ.behalten) { HZ.thema = null; HZ.q = ""; }
  HZ.behalten = false; letzteSicht = S.view; setTimeout(knoepfeSetzen, 0);
});
