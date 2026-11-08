// 🗒️ Protokolle für Mitglieder (0.41.0, wie KC Kachel „Protokolle“ mit Ungelesen-Zahl und „meine Aufgaben“, KC-CLUB-PROTOKOLL-INFO):
// Protokolle entstehen im 🏢 Büro (Ordner „Protokolle“). Die Leitung gibt eins frei („📣 Für Mitglieder freigeben“: alle, nur Eltern, nur Team) –
// dann steht es hier, mit Benachrichtigung. Neue sind markiert (gelesen merkt sich das Gerät). „📌 Meine Aufgaben“ sammelt die Zeilen unter
// „Aufgaben“, in denen der eigene Name steht. Wer was sieht, entscheidet der Server (Sichtbarkeit des Dokuments).
import { S, VIEWS, zeige, zeichne, kopf, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage } from "../kern/ui.js";
import { liste, hole, speichere } from "../kern/daten.js";
import { DOKUMENT_SICHT, rollenMit } from "../kern/schema.js";
import { senden } from "../kern/versand.js";
import { startseiteVerbinden } from "./startseite.js";

const GELESEN = "bk_prot_gelesen";
const gelesen = () => { try { return new Set(JSON.parse(localStorage.getItem(GELESEN) || "[]")); } catch { return new Set(); } };
const merken = (id) => { const g = gelesen(); g.add(id); try { localStorage.setItem(GELESEN, JSON.stringify([...g].slice(-500))); } catch {} };
const freigegeben = (d) => !["leitung", "vorstand"].includes(d.sichtbar);
export const protokolleFuerMich = () => liste("dokumente", (d) => d.art === "protokoll" && freigegeben(d)).sort((a, b) => String(b.geaendert_am || b.erstellt_am || b.jahr || "").localeCompare(String(a.geaendert_am || a.erstellt_am || a.jahr || "")));
export const neueProtokolle = () => { const g = gelesen(); return protokolleFuerMich().filter((d) => !g.has(d.id)).length; };
// „Aufgaben (wer · was · bis wann):“ – Zeilen mit meinem Namen
export function aufgabenAus(inhalt, person) {
  if (!person) return [];
  const zeilen = String(inhalt || "").split("\n"), i = zeilen.findIndex((z) => /^\s*aufgaben\b/i.test(z)); if (i < 0) return [];
  const namen = [`${person.vorname} ${person.nachname}`.trim(), person.vorname].filter(Boolean).map((n) => n.toLowerCase());
  const out = [];
  for (const z of zeilen.slice(i + 1)) { if (!z.trim()) { if (out.length || zeilen.indexOf(z) > i + 1) break; continue; } if (!/^\s*[-•☐]/.test(z)) break;
    if (namen.some((n) => z.toLowerCase().includes(n))) out.push(z.replace(/^\s*[-•☐]\s*/, "").trim()); }
  return out;
}
VIEWS.protokolle = {
  render() {
    const l = protokolleFuerMich(), g = gelesen(), ich = S.ich ? hole("personen", S.ich.id) || S.ich : null;
    const aufgaben = l.flatMap((d) => aufgabenAus(d.inhalt, ich).map((t) => ({ d, t })));
    const jahre = [...new Set(l.map((d) => d.jahr || "ohne Jahr"))];
    return kopf("🗒️ Protokolle") + `<p class="hinweis">Protokolle von Elternabenden, Besprechungen und Versammlungen – freigegeben von der Leitung.</p>`
      + (aufgaben.length ? `<div class="karte prot-aufgaben"><h3>📌 Meine Aufgaben</h3><ul class="liste">${aufgaben.map(({ d, t }) => `<li class="klick" data-a="protokollAuf" data-x="${esc(d.id)}"><div class="fl"><b>${esc(t)}</b><div class="zeile-unter">aus „${esc(d.titel)}“</div></div><span aria-hidden="true">›</span></li>`).join("")}</ul></div>` : "")
      + (l.length ? jahre.map((j) => `<div class="karte"><h3>${esc(String(j))}</h3><ul class="liste">${l.filter((d) => (d.jahr || "ohne Jahr") === j).map((d) => `<li class="klick${g.has(d.id) ? "" : " hat-neu"}" data-a="protokollAuf" data-x="${esc(d.id)}"><span aria-hidden="true">🗒️</span>
          <div class="fl"><div class="zeile-titel">${esc(d.titel)}${g.has(d.id) ? "" : ' <span class="badge b-gelb">neu</span>'}</div><div class="zeile-unter">${esc([d.beschreibung, d.sichtbar && d.sichtbar !== "alle" ? DOKUMENT_SICHT[d.sichtbar] : ""].filter(Boolean).join(" · "))}</div></div><span aria-hidden="true">›</span></li>`).join("")}</ul></div>`).join("")
        : '<div class="leer">Noch keine Protokolle freigegeben.</div>');
  },
};
AKTIONEN.protokollAuf = (id) => zeige("protokoll", { id });
VIEWS.protokoll = {
  render({ id }) {
    const d = hole("dokumente", id); if (!d) return kopf("🗒️ Protokoll") + '<div class="leer">Nicht gefunden.</div>';
    merken(id);
    const ich = S.ich ? hole("personen", S.ich.id) || S.ich : null, meine = new Set(aufgabenAus(d.inhalt, ich));
    const text = String(d.inhalt || "").split("\n").map((z) => { const t = z.replace(/^\s*[-•☐]\s*/, "").trim(); return meine.has(t) ? `<mark class="prot-ich">📌 ${esc(z)}</mark>` : esc(z); }).join("<br>");
    return kopf(`🗒️ ${esc(d.titel)}`) + `<div class="karte"><p class="hinweis">${esc([d.jahr, d.beschreibung].filter(Boolean).join(" · "))}</p><div class="bu-text">${text || "–"}</div>
      <div class="knopfreihe">${d.inhalt ? `<button type="button" class="knopf" data-a="buDrucken" data-x="${esc(d.id)}">🖨️ Drucken</button>` : ""}${d.datei ? `<button type="button" class="knopf" data-a="dokOeffnen" data-x="${esc(d.id)}">📎 Datei öffnen</button>` : ""}</div></div>`;
  },
};
// 📣 aus dem Büro: Protokoll für Mitglieder freigeben (setzt die Sichtbarkeit, schickt eine Nachricht)
AKTIONEN.protokollFreigeben = (id) => {
  const d = hole("dokumente", id); if (!d) return;
  blatt("📣 Protokoll für Mitglieder freigeben", `<p>„${esc(d.titel)}“ steht danach unter 🗒️ Protokolle – mit Benachrichtigung.</p>
    <div class="knopfspalte">${[["alle", "👥 Alle im Bachkreis"], ["eltern", "👪 Nur Eltern"], ["verwaltung", "🧑‍🏫 Nur Leitung & Verwaltung"]].map(([k, t]) => `<button type="button" class="knopf" data-a="protokollFreiJetzt" data-x="${esc(id)}|${k}">${t}</button>`).join("")}
    ${freigegeben(d) ? `<button type="button" class="knopf rot" data-a="protokollFreiJetzt" data-x="${esc(id)}|leitung">🔒 Freigabe zurücknehmen (nur Büro)</button>` : ""}</div>`);
};
AKTIONEN.protokollFreiJetzt = async (x) => {
  const [id, sicht] = String(x).split("|"), d = hole("dokumente", id); if (!d) return;
  if (sicht === "alle" && !(await frage("Wirklich für alle im Bachkreis freigeben – auch für Kinder?"))) return;
  await speichere("dokumente", { ...d, sichtbar: sicht }); blattZu();
  if (sicht !== "leitung") {
    const an = liste("personen", (p) => p.status === "aktiv" && p.id !== S.ich?.id && (sicht === "alle" || (sicht === "eltern" && p.typ === "eltern") || (sicht === "verwaltung" && rollenMit(p.rollen).some((r) => ["admin", "leitung", "lehrkraft", "vorstand"].includes(r))))).map((p) => p.id);
    senden({ an, betreff: `🗒️ Neues Protokoll: ${d.titel}`, text: `Das Protokoll „${d.titel}“ steht in der Bachkreis-App unter 🗒️ Protokolle.`, ereignis: "rundschreiben" }).catch(() => {});
    toast(`📣 Freigegeben – ${an.length} bekommen Bescheid`);
  } else toast("🔒 Nur noch im Büro");
  zeichne();
};
export const darfFreigeben = () => hatRolle("admin", "leitung", "lehrkraft", "vorstand");
startseiteVerbinden({ protNeu: neueProtokolle });

