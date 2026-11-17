// 📰 Bachkreis-Echo (0.70.0, Konzept mit Beispielbild abgestimmt – Wunsch Hansi): das Heft des Bachkreises. 4 Hefte im Jahr (oder öfter
// nach Abstimmung), Schülerinnen und Schüler schreiben mit. In der App zum Blättern, dazu als PDF: A5-Einzelseiten und „Heftdruck“
// (A4 quer, beidseitig drucken, in der Mitte falzen und heften – die Seiten sind dafür schon richtig angeordnet).
// Ablauf: jede/r reicht ein → Redaktion sortiert und ordnet zu → Leitung gibt frei (Vier-Augen) → das Heft erscheint (Push an alle).
// Datenschutz: echoPruefung (logik.js) – Schutzsperre/verborgene Kinder nie, Fotos und Porträts nur mit Einwilligung. Nur für Mitglieder.
// Inhalt, der jedes Mal mitkommt: Termine (aus der App), Instrument des Monats (Instrumentenkunde), Komponist, Wörterbuch, Rätsel, Spiel, Witz.
import { S, VIEWS, db, zeige, zeichne, kopf, name, hatRolle, einst, einstSetzen } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage } from "../kern/ui.js";
import { liste, hole, speichere, konfig, neueId } from "../kern/daten.js";
import { ECHO_RUBRIKEN, ECHO_HEFT_STATUS, ECHO_BEITRAG_STATUS, ECHO_AUSGABEN, ECHO_REDAKTION, ECHO_FREIGABE, ECHO_TEXT_MAX, INSTRUMENT_GRUPPEN } from "../kern/schema.js";
import { echoPruefung, heftAusschiessen, heftSeitenZahl } from "../kern/logik.js";
import { hochladen, dateiUrl, bildVerkleinern } from "../kern/dateien.js";
import { pdfAusJpegs } from "../kern/pdf.js";
import { LEHRE, lehreKlang } from "./instrumentenkunde.js";
import { lupeAnbinden } from "../kern/lupe.js";
import { laden as html2canvasLaden, farbenGlaetten } from "./bildschirmfoto.js";

export const echoRedaktion = () => hatRolle(...ECHO_REDAKTION);
export const echoChef = () => hatRolle(...ECHO_FREIGABE);
export const echoHefte = () => liste("echo_hefte", (h) => !h.geloescht_am).sort((a, b) => (b.jahr || 0) - (a.jahr || 0) || (b.nr || 0) - (a.nr || 0));
const erschienene = () => echoHefte().filter((h) => h.status === "erschienen");
const beitraegeIm = (heftId, alle = false) => liste("echo_beitraege", (b) => !b.geloescht_am && b.heft_id === heftId && (alle || b.status === "angenommen"))
  .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999) || String(a.erstellt_am || "").localeCompare(String(b.erstellt_am || "")));
const ausgabe = (h) => `${ECHO_AUSGABEN[h.ausgabe] || ""} ${h.jahr || ""}`.trim();
const marke = () => { const k = konfig(); return { name: k.name || "Bachkreis Bergkamen", unter: k.untertitel || "Jugendsinfonieorchester" }; };
const absaetze = (t) => String(t || "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
// lange Absätze an Satzgrenzen teilen, damit der Seitenumbruch nie mitten in einem Riesenblock hängt
const stuecke = (t, max = 650) => absaetze(t).flatMap((a) => { if (a.length <= max) return [a]; const s = a.match(/[^.!?]+[.!?]+["“”»]?\s*|[^.!?]+$/g) || [a], aus = []; let z = ""; for (const x of s) { if ((z + x).length > max && z) { aus.push(z.trim()); z = ""; } z += x; } if (z.trim()) aus.push(z.trim()); return aus; });

// ---------- Bausteine, die jedes Heft mitbringt ----------
export const KOMPONISTEN = [
  { id: "bach", name: "Johann Sebastian Bach", jahre: "1685–1750", ort: "Eisenach · Leipzig", text: "Unser Namensgeber! Bach war Organist und ab 1723 Thomaskantor in Leipzig. Er schrieb über 1000 Werke – Kantaten, Orgelmusik, die Brandenburgischen Konzerte und die Matthäus-Passion. Er hatte 20 Kinder, mehrere wurden selbst berühmte Musiker.", hoeren: "Brandenburgisches Konzert Nr. 3 · Air aus der Orchestersuite Nr. 3" },
  { id: "mozart", name: "Wolfgang Amadeus Mozart", jahre: "1756–1791", ort: "Salzburg · Wien", text: "Ein Wunderkind: Mit fünf Jahren komponierte er die ersten Stücke, als Kind reiste er mit seinem Vater und seiner Schwester Nannerl durch Europa. Er schrieb Opern wie die „Zauberflöte“, über 40 Sinfonien und viele Konzerte.", hoeren: "Eine kleine Nachtmusik · Ouvertüre zur „Zauberflöte“" },
  { id: "beethoven", name: "Ludwig van Beethoven", jahre: "1770–1827", ort: "Bonn · Wien", text: "Beethoven schrieb neun Sinfonien. Schon als junger Mann wurde er schwerhörig und später fast taub – und komponierte trotzdem weiter. Die Melodie „Freude, schöner Götterfunken“ aus der 9. Sinfonie ist heute die Europahymne.", hoeren: "5. Sinfonie (Anfang: ta-ta-ta-taaa) · Für Elise" },
  { id: "vivaldi", name: "Antonio Vivaldi", jahre: "1678–1741", ort: "Venedig", text: "Wegen seiner roten Haare nannte man ihn „den roten Priester“. Er unterrichtete Musik an einem Waisenhaus für Mädchen in Venedig, dessen Orchester berühmt war. Er schrieb Hunderte Konzerte – vor allem für Violine.", hoeren: "Die vier Jahreszeiten (Frühling, Sommer, Herbst, Winter)" },
  { id: "haendel", name: "Georg Friedrich Händel", jahre: "1685–1759", ort: "Halle · London", text: "Im selben Jahr geboren wie Bach – getroffen haben sich die beiden nie. Händel zog nach London und wurde dort mit Opern und Oratorien berühmt. Seine Wassermusik wurde für eine Bootsfahrt des Königs auf der Themse gespielt.", hoeren: "Wassermusik · „Halleluja“ aus dem Messias" },
  { id: "haydn", name: "Joseph Haydn", jahre: "1732–1809", ort: "Rohrau · Eisenstadt · Wien", text: "Man nennt ihn den „Vater der Sinfonie“ – er schrieb 104 davon. Fast 30 Jahre leitete er das Orchester des Fürsten Esterházy. In der „Sinfonie mit dem Paukenschlag“ weckt ein plötzlicher lauter Schlag alle Zuhörer auf.", hoeren: "Sinfonie Nr. 94 „mit dem Paukenschlag“ (2. Satz)" },
  { id: "clara", name: "Clara Schumann", jahre: "1819–1896", ort: "Leipzig · Düsseldorf · Frankfurt", text: "Eine der berühmtesten Pianistinnen ihrer Zeit – schon als Kind gab sie Konzerte in ganz Europa. Sie komponierte, unterrichtete und hatte acht Kinder. Ihr Bild war auf dem letzten 100-DM-Schein.", hoeren: "Klavierkonzert a-Moll · Romanzen für Violine und Klavier" },
  { id: "tschaikowsky", name: "Peter Tschaikowsky", jahre: "1840–1893", ort: "Russland", text: "Er schrieb die Musik zu drei berühmten Balletten: Schwanensee, Dornröschen und Der Nussknacker. Im Nussknacker spielt eine Celesta – ein Instrument, das wie kleine Glöckchen klingt – den „Tanz der Zuckerfee“.", hoeren: "Der Nussknacker: Blumenwalzer · Tanz der Zuckerfee" },
  { id: "smetana", name: "Bedřich Smetana", jahre: "1824–1884", ort: "Böhmen (heute Tschechien)", text: "In „Die Moldau“ erzählt das Orchester von einem Fluss: zwei kleine Quellen (zwei Flöten) werden zu einem großen Strom, der an Wäldern, einer Bauernhochzeit und einer Burg vorbei bis nach Prag fließt.", hoeren: "Die Moldau aus „Mein Vaterland“" },
  { id: "hensel", name: "Fanny Hensel (Mendelssohn)", jahre: "1805–1847", ort: "Hamburg · Berlin", text: "Die ältere Schwester von Felix Mendelssohn Bartholdy und genauso begabt. Sie schrieb über 400 Werke, durfte aber lange nicht öffentlich auftreten – damals war das für Frauen nicht üblich. In Berlin veranstaltete sie berühmte Sonntagskonzerte.", hoeren: "Das Jahr (12 Klavierstücke) · Ouvertüre C-Dur" },
];
export const WOERTER = [
  ["Allegro", "fröhlich, schnell"], ["Adagio", "langsam, ruhig"], ["Andante", "gehend – in ruhigem Schritttempo"], ["forte (f)", "laut"], ["piano (p)", "leise"],
  ["Crescendo", "lauter werdend (<)"], ["Decrescendo", "leiser werdend (>)"], ["Fermate", "Ton oder Pause länger aushalten – der Dirigent zeigt, wie lange"],
  ["pizzicato", "die Saiten zupfen statt streichen"], ["arco", "wieder mit dem Bogen streichen"], ["Tutti", "alle spielen zusammen"], ["Solo", "eine/r spielt allein"],
  ["Da capo", "noch einmal von vorn"], ["Partitur", "die Noten mit allen Stimmen untereinander – das liest der Dirigent"], ["Staccato", "kurz und abgesetzt (Punkt über der Note)"],
  ["Legato", "gebunden, ohne Lücke zwischen den Tönen"], ["Ritardando", "langsamer werdend"], ["Accelerando", "schneller werdend"], ["Dur und Moll", "Dur klingt oft hell und fröhlich, Moll eher dunkel oder traurig"],
  ["Kanon", "alle spielen dieselbe Melodie, setzen aber nacheinander ein"], ["Ouvertüre", "das Eröffnungsstück einer Oper oder eines Konzerts"], ["Sinfonie", "großes Werk für Orchester, meist in vier Sätzen"],
  ["Takt", "teilt die Musik in gleich lange Abschnitte – z. B. 3/4 beim Walzer"], ["Tempo", "wie schnell die Musik geht"],
];
export const WITZE = [
  "Warum nimmt der Geiger eine Leiter mit ins Konzert? – Weil er die hohen Töne treffen will.",
  "Der Dirigent ruft: „Wer hat da eben falsch gespielt?“ – Ruft die Pauke: „Ich war's nicht, ich hatte 48 Takte Pause!“",
  "Was sagt die Trompete zur Tuba? – „Du bist mir eine Nummer zu groß!“",
  "Was ist ein Kanon? – Wenn alle dasselbe spielen, aber niemand gleichzeitig fertig wird.",
  "Warum hat das Klavier so schlechte Laune? – Weil ständig alle auf ihm herumdrücken.",
  "„Mama, darf ich Schlagzeug spielen?“ – „Ja, aber nur, wenn ich nicht zu Hause bin.“ – „Super, dann übe ich ab jetzt immer, wenn du einkaufen bist!“",
  "Lehrerin: „Was ist eine Fermate?“ – Schüler: „Die Stelle, an der der Dirigent auch mal Luft holen darf.“",
  "Wie heißt der Lieblingsdino der Musiker? – Der Tyranno-Saxo-Rex.",
  "Warum geht der Notenschlüssel nie verloren? – Weil er immer ganz vorne hängt.",
  "Wie stimmt man ein Cello? – Ganz einfach: Man fragt es freundlich.",
];
export const SPIELE = [
  ["👏 Rhythmus-Echo", "Eine/r klatscht einen kurzen Rhythmus vor, alle klatschen ihn nach. Wer es geschafft hat, denkt sich den nächsten aus. Schwieriger: mit Stampfen und Schnipsen."],
  ["🙈 Instrumente raten", "Augen zu! Jemand spielt ein paar Töne – oder spielt in der App unter Instrumentenkunde einen Klang ab. Welches Instrument war das?"],
  ["🔗 Melodie-Kette", "Die erste Person spielt oder singt einen Ton, die nächste wiederholt ihn und hängt einen an – wie lang wird eure Melodie?"],
  ["🕵️ Wer ist der Dirigent?", "Eine Person geht kurz raus. Die anderen bestimmen heimlich eine/n Dirigent/in, die/der Bewegungen vormacht – alle machen sofort mit. Wer findet den Dirigenten?"],
  ["🎶 Summ-Raten", "Eine/r summt ein bekanntes Lied oder ein Stück aus dem Orchester – wer errät den Titel zuerst?"],
  ["⏸️ Stopp-Musik", "Alle tanzen oder laufen, solange Musik läuft. Bei Stille: einfrieren wie eine Statue! Wer wackelt, setzt eine Runde aus."],
];
const ROLLE = {
  violine: "Spielt meist die Melodie. Die 1. Violinen sitzen vorne links neben dem Dirigenten, die 2. Violinen spielen eine zweite Stimme oder begleiten.",
  viola: "Füllt die Mitte zwischen Violinen und Celli – ohne Bratschen klänge das Orchester hohl.",
  cello: "Spielt Bassläufe zusammen mit dem Kontrabass, aber auch große, singende Melodien.",
  kontrabass: "Das Fundament: die tiefsten Töne – er hält das Orchester im Rhythmus zusammen.",
  floete: "Hohe Melodien, Verzierungen und Vogelstimmen – sie klingt über dem ganzen Orchester.",
  oboe: "Gibt vor der Probe das A zum Stimmen und spielt oft ausdrucksvolle Solo-Melodien.",
  klarinette: "Sehr wandelbar: weich und tief oder hell und lustig – Melodie und Begleitung.",
  fagott: "Der Bass der Holzbläser – mal ernst, mal ziemlich komisch.",
  horn: "Verbindet Holz- und Blechbläser: warme lange Töne, Jagdsignale und große Melodien.",
  trompete: "Glanz und Fanfaren – bei festlichen Stellen strahlt sie über das ganze Orchester.",
  posaune: "Kräftig und feierlich; mit dem Zug kann sie sogar von Ton zu Ton gleiten.",
  tuba: "Das tiefste Blechblasinstrument – das Fundament der Blechbläser.",
  pauke: "Rhythmus und Spannung – Pauken sind auf bestimmte Töne gestimmt.",
  schlagwerk: "Becken, Trommeln, Triangel & Co. sorgen für Rhythmus, Effekte und Höhepunkte.",
  harfe: "Zauberhafte Glissandi und gezupfte Akkorde – sie färbt den Orchesterklang.",
  klavier: "Im Sinfonieorchester selten dabei – im Klavierkonzert aber der Star.",
};
export const echoInstrument = (h) => LEHRE.find((l) => l.id === h.instrument) || LEHRE[((h.nr || 1) - 1) % LEHRE.length];
export const echoKomponist = (h) => KOMPONISTEN.find((k) => k.id === h.komponist) || KOMPONISTEN[((h.nr || 1) - 1) % KOMPONISTEN.length];
const wahl = (l, nr, n) => Array.from({ length: Math.min(n, l.length) }, (_, i) => l[((nr - 1) * n + i) % l.length]);

// 🧩 Buchstabensalat: aus der Heft-Nummer immer gleich gebaut – die Auflösung steht im nächsten Heft
const SALAT_WOERTER = ["GEIGE", "CELLO", "HARFE", "FLOETE", "PAUKE", "OBOE", "HORN", "TUBA", "BRATSCHE", "FAGOTT", "TROMPETE", "POSAUNE", "BASS", "KLAVIER", "TAKT", "NOTE", "BOGEN", "SAITE"];
const zufall = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function buchstabensalat(nr, groesse = 11) {
  const r = zufall(nr * 7919 + 13), g = Array.from({ length: groesse }, () => Array(groesse).fill("")), woerter = [];
  const pool = [...SALAT_WOERTER].sort(() => r() - 0.5);
  for (const w of pool) {
    if (woerter.length >= 8) break;
    for (let v = 0; v < 200; v++) {
      const quer = r() < 0.55, zl = Math.floor(r() * (quer ? groesse : groesse - w.length + 1)), sp = Math.floor(r() * (quer ? groesse - w.length + 1 : groesse));
      const pos = [...w].map((_, i) => [zl + (quer ? 0 : i), sp + (quer ? i : 0)]);
      if (pos.every(([a, b], i) => !g[a][b] || g[a][b] === w[i])) { pos.forEach(([a, b], i) => { g[a][b] = w[i]; }); woerter.push({ w, pos }); break; }
    }
  }
  const abc = "ABCDEFGHIKLMNOPRSTUWZ";
  for (const z of g) for (let i = 0; i < z.length; i++) if (!z[i]) z[i] = abc[Math.floor(r() * abc.length)];
  return { gitter: g, woerter };
}
const salatHtml = (s, loesung = false) => {
  const an = new Set(loesung ? s.woerter.flatMap((w) => w.pos.map(([a, b]) => `${a}-${b}`)) : []);
  return `<table class="echo-salat${loesung ? " klein" : ""}" aria-label="Buchstabensalat">${s.gitter.map((z, a) => `<tr>${z.map((c, b) => `<td${an.has(`${a}-${b}`) ? ' class="an"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table>`;
};

// ---------- Heft zusammenstellen: Blöcke → Seiten (A5) ----------
const bildHtml = (b) => (b.bild ? `<figure class="echo-bild"><img data-echo-bild="${esc(b.bild)}" alt="${esc(b.bild_text || b.titel || "Foto")}">${b.bild_text ? `<figcaption>${esc(b.bild_text)}</figcaption>` : ""}</figure>` : "");
function beitragBloecke(b) {
  const t = stuecke(b.text), aus = [{ html: `<h3>${esc(b.titel)}</h3>${bildHtml(b)}${t[0] ? `<p>${esc(t[0])}</p>` : ""}` }];
  for (const x of t.slice(1)) aus.push({ html: `<p>${esc(x)}</p>` });
  if (b.autor_zeile) aus.push({ html: `<p class="echo-autor">${esc(b.autor_zeile)}</p>` });
  return aus;
}
const rubrikKopf = (sym, t, unter = "") => `<h2 class="echo-rubrik"><span aria-hidden="true">${sym}</span> ${esc(t)}</h2>${unter ? `<p class="echo-unter">${esc(unter)}</p>` : ""}`;
// Termine fürs Heft: regelmäßige Proben (gleicher Titel, Wochentag, Uhrzeit, mind. 2×) als eine Zeile „jeden Di 18:00“, alles andere einzeln
export function echoTermine(l) {
  const uhr = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), wt = (d) => d.toLocaleDateString("de-DE", { weekday: "short" });
  const probe = (t) => /probe/i.test(t.titel || "") && !/general|haupt|register|frei/i.test(t.titel || ""), gruppen = new Map();
  for (const t of l.filter(probe)) { const d = new Date(t.beginn), k = `${t.titel}|${d.getDay()}|${uhr(d)}`; if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(t); }
  const regel = [...gruppen.values()].filter((g) => g.length >= 2), inRegel = new Set(regel.flat().map((t) => t.id));
  return { regel: regel.map((g) => { const d = new Date(g[0].beginn); return { wann: `jeden ${wt(d)}`, uhr: uhr(d), titel: g[0].titel, ort: g[0].ort, art_id: g[0].art_id, n: g.length }; }),
    einzeln: l.filter((t) => !inRegel.has(t.id)).map((t) => { const d = new Date(t.beginn); return { wann: d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }), uhr: uhr(d), titel: t.titel, ort: t.ort, art_id: t.art_id }; }) };
}
function terminZeilen(h) {
  const von = h.termine_von || new Date().toISOString().slice(0, 10), bis = h.termine_bis || new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
  const l = liste("termine", (t) => !t.geloescht_am && t.status !== "abgesagt" && String(t.beginn).slice(0, 10) >= von && String(t.beginn).slice(0, 10) <= bis).sort((a, b) => String(a.beginn).localeCompare(String(b.beginn)));
  const { regel, einzeln } = echoTermine(l), zeile = (t) => { const art = hole("terminarten", t.art_id); return `<tr><td>${esc(t.wann)}</td><td>${esc(t.uhr)}</td><td>${art?.sym ? esc(art.sym) + " " : ""}<b>${esc(t.titel)}</b>${t.ort ? `<br><small>${esc(t.ort)}</small>` : ""}</td></tr>`; };
  return { regel: regel.map(zeile), einzeln: einzeln.slice(0, 30).map(zeile) };
}
export function echoBloecke(h) {
  const bs = beitraegeIm(h.id), rub = (r) => bs.filter((b) => b.rubrik === r), l = [], m = marke();
  const abschnitt = (toc, kopfHtml, inhalt, neu = true) => { if (!inhalt.length && !kopfHtml) return; const [erster, ...rest] = inhalt; l.push({ toc, neu, html: kopfHtml + (erster?.html || "") }); l.push(...rest); };
  const inst = echoInstrument(h), komp = echoKomponist(h), fam = INSTRUMENT_GRUPPEN[inst.familie] || ["🎵", "Orchester"];
  const titelZeilen = [ ...rub("orchesterleben").slice(0, 2).map((b) => b.titel), `Instrument: ${inst.name}`, `Komponist: ${komp.name}` ].slice(0, 4);
  // 1 Titelseite
  l.push({ seite: "titel", html: `<div class="echo-masthead"><img src="icons/logo.png" alt="" width="52" height="52"><div><div class="echo-name">Bachkreis-Echo</div><div class="echo-zeile">${esc(m.name)} · ${esc(m.unter)}</div></div></div>
    <div class="echo-ausgabe">Heft ${esc(h.nr)} · ${esc(ausgabe(h))}</div>
    ${h.titelbild ? `<figure class="echo-titelbild"><img data-echo-bild="${esc(h.titelbild)}" alt="Titelbild"></figure>` : `<div class="echo-titelbild leer" aria-hidden="true">🎻🎺🥁🎶</div>`}
    <div class="echo-titelthema">${esc(h.titel || "Neues aus dem Bachkreis")}</div>
    <ul class="echo-aus-inhalt">${titelZeilen.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <div class="echo-nurmitglieder">Nur für Mitglieder · bitte nicht öffentlich teilen</div>` });
  // 2 Inhalt + Vorwort
  l.push({ seite: "neu", toc: null, html: `<h2 class="echo-rubrik">📖 Inhalt</h2><div class="echo-inhalt" data-echo-inhalt></div>` });
  if (h.vorwort) abschnitt("Vorwort", rubrikKopf("✍️", "Vorwort"), [...stuecke(h.vorwort).map((x) => ({ html: `<p>${esc(x)}</p>` })), ...(h.vorwort_von ? [{ html: `<p class="echo-autor">${esc(h.vorwort_von)}</p>` }] : [])], false);
  // Termine
  const tz = terminZeilen(h), tabelle = (z) => Array.from({ length: Math.ceil(z.length / 6) }, (_, i) => ({ html: `<table class="echo-termine">${z.slice(i * 6, i * 6 + 6).join("")}</table>` }));
  abschnitt("Termine", rubrikKopf("📅", "Termine", "Immer aktuell in der App unter 📅 Termine – dort auch Zu- und Absagen"), [
    ...(tz.einzeln.length ? [{ html: "<h4>Konzerte, Auftritte &amp; Besonderes</h4>" + (tabelle(tz.einzeln)[0]?.html || "") }, ...tabelle(tz.einzeln).slice(1)] : []),
    ...(tz.regel.length ? [{ html: "<h4>Regelmäßige Proben</h4>" + (tabelle(tz.regel)[0]?.html || "") }, ...tabelle(tz.regel).slice(1)] : []),
    ...(!tz.einzeln.length && !tz.regel.length ? [{ html: "<p>Die nächsten Termine stehen in der App unter 📅 Termine.</p>" }] : []),
    { html: '<p class="echo-klein">Änderungen und Ausfälle stehen immer zuerst in der App.</p>' }]);
  // Instrument des Monats
  abschnitt(`Instrument: ${inst.name}`, rubrikKopf(inst.sym, "Instrument des Monats") + `<div class="echo-inst-kopf"><span class="echo-inst-sym" aria-hidden="true">${inst.sym}</span><div><b>${esc(inst.name)}</b><br><small>${esc(fam[0])} ${esc(fam[1])}</small></div></div>`, [
    { html: `<h4>Was ist das?</h4><p>${esc(inst.kurz)}</p>` },
    { html: `<h4>So ist es gebaut</h4><p>${esc(inst.steckbrief)}. Stimmung: ${esc(inst.stimmung)}. Notenschlüssel: ${esc(inst.schluessel)}.</p>` },
    { html: `<h4>Welche Gruppe?</h4><p>Es gehört zu den <b>${esc(fam[1])}</b> – genau wie ${esc(LEHRE.filter((x) => x.familie === inst.familie && x.id !== inst.id).map((x) => x.name.replace(/ \(.*\)/, "")).join(", ") || "einige andere")}.</p>` },
    { html: `<h4>Seine Rolle im Orchester</h4><p>${esc(ROLLE[inst.id] || inst.kurz)}</p>` },
    { html: `<h4>So wird es gepflegt</h4><ul>${(inst.pflege || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` },
    { html: `<div class="echo-kasten">💡 <b>Wusstest du?</b> ${esc(inst.wussten || "")}<br><span class="nur-app"><button type="button" class="knopf klein" data-a="echoKlang" data-x="${esc(inst.id)}">🔊 Jetzt anhören</button></span><span class="nur-druck">🔊 Zum Anhören: App → Entdecken → Instrumentenkunde</span></div>` },
  ]);
  // Beiträge der Rubriken
  for (const [r, sym, t, unter] of [["orchesterleben", "🎻", "Aus dem Orchesterleben", "Proben, Konzerte, Ausflüge"], ["vorstellen", "👋", "Wir stellen vor", ""], ["schueler", "✏️", "Schüler schreiben", ""]])
    if (rub(r).length) abschnitt(t, rubrikKopf(sym, t, unter), rub(r).flatMap(beitragBloecke));
  // Komponist, Wörterbuch, Wissen
  abschnitt(`Komponist: ${komp.name}`, rubrikKopf("🎼", "Komponist des Monats"), [{ html: `<h3>${esc(komp.name)}</h3><p class="echo-unter">${esc(komp.jahre)} · ${esc(komp.ort)}</p><p>${esc(komp.text)}</p>` }, { html: `<div class="echo-kasten">🎧 <b>Hörtipp:</b> ${esc(komp.hoeren)}${komp.id === "bach" ? `<br><span class="nur-app"><button type="button" class="knopf klein" data-a="echoBach">🎻 Bach auf der Bühne anhören</button></span><span class="nur-druck">🎻 Zum Anhören: App → Entdecken → Bühne → 🎻 Bach</span>` : ""}</div>` }]);
  abschnitt("Musik-Wörterbuch", rubrikKopf("📚", "Musik-Wörterbuch"), [{ html: `<dl class="echo-woerter">${wahl(WOERTER, h.nr || 1, 5).map(([w, e]) => `<dt>${esc(w)}</dt><dd>${esc(e)}</dd>`).join("")}</dl>` }], false);
  if (rub("wissen").length) abschnitt("Wusstest du schon?", rubrikKopf("💡", "Wusstest du schon?"), rub("wissen").flatMap(beitragBloecke), false);
  // Rätsel & Spiele
  const salat = buchstabensalat(h.nr || 1), vorher = (h.nr || 1) > 1 ? buchstabensalat((h.nr || 1) - 1) : null;
  abschnitt("Rätselecke", rubrikKopf("🧩", "Rätselecke"), [
    { html: `<h4>Buchstabensalat</h4><p>Finde ${salat.woerter.length} Wörter aus dem Orchester – waagerecht und senkrecht:</p>${salatHtml(salat)}<p class="echo-klein">Gesucht: ${salat.woerter.map((w) => w.w.replace("OE", "Ö")).sort().join(" · ")}<br>Die Auflösung steht im nächsten Heft.</p>` },
    ...rub("raetsel").flatMap(beitragBloecke),
    ...(vorher ? [{ html: `<div class="echo-loesung"><h4>Auflösung aus Heft ${(h.nr || 1) - 1}</h4>${salatHtml(vorher, true)}</div>` }] : []),
  ]);
  const spiel = SPIELE[((h.nr || 1) - 1) % SPIELE.length];
  abschnitt("Spieleecke", rubrikKopf("🎲", "Spieleecke"), [{ html: `<h4>${esc(spiel[0])}</h4><p>${esc(spiel[1])}</p>` }, ...rub("spiel").flatMap(beitragBloecke)], false);
  abschnitt("Musikerwitz", rubrikKopf("😄", "Musikerwitz"), [...wahl(WITZE, h.nr || 1, 2).map((w) => ({ html: `<p class="echo-witz">${esc(w)}</p>` })), ...rub("witz").flatMap(beitragBloecke)], false);
  // Förderverein & Sonstiges
  abschnitt("Förderverein-Ecke", rubrikKopf("💛", "Förderverein-Ecke"), rub("foerderverein").length ? rub("foerderverein").flatMap(beitragBloecke)
    : [{ html: "<p>Der Förderverein unterstützt den Bachkreis bei Fahrten, Leihinstrumenten, Noten und Konzerten. Mitglied werden? Einfach die Leitung oder den Vorstand ansprechen – jede Hilfe zählt!</p>" }], false);
  if (rub("sonstiges").length) abschnitt("Und außerdem …", rubrikKopf("📌", "Und außerdem …"), rub("sonstiges").flatMap(beitragBloecke), false);
  // Rückseite: Redaktion & Impressum
  const red = liste("personen", (p) => (p.rollen || []).includes("redaktion") && p.status !== "ausgetreten").map((p) => `${p.vorname} ${p.nachname || ""}`.trim());
  l.push({ seite: "rueck", toc: "Redaktion & Impressum", html: `${rubrikKopf("🗞️", "Redaktion & Impressum")}
    <p><b>Bachkreis-Echo</b> · Heft ${esc(h.nr)} · ${esc(ausgabe(h))}<br>Herausgeber: ${esc(m.name)} (${esc(m.unter)})</p>
    ${red.length ? `<p><b>Redaktion:</b> ${esc(red.join(", "))}</p>` : ""}${h.freigegeben_von ? `<p><b>Freigabe:</b> ${esc(hole("personen", h.freigegeben_von) ? name(h.freigegeben_von) : h.freigegeben_von)}</p>` : ""}
    <div class="echo-kasten">✍️ <b>Mach mit!</b> Bericht, Foto, Rätsel oder Witz: in der App unter <b>Bachkreis → Bachkreis-Echo → Beitrag einreichen</b>. Die Redaktion meldet sich.</div>
    <p class="echo-klein">🔒 Nur für Mitglieder des Bachkreises und ihre Familien. Fotos und Namen von Kindern nur mit Einwilligung der Eltern. Bitte nicht in sozialen Netzwerken teilen.</p>
    <div class="echo-rueck-logo"><img src="icons/logo.png" alt="" width="64" height="64"><div>Erscheint 4× im Jahr · nächstes Heft: ${esc(ECHO_AUSGABEN[{ fruehling: "sommer", sommer: "herbst", herbst: "winter", winter: "fruehling" }[h.ausgabe]] || "bald")}</div></div>` });
  return l;
}

// Satz: misst jeden Block in einer echten A5-Seite (559 × 794 px) und bricht nur zwischen Blöcken um. Zum Schluss auf ein Vielfaches
// von 4 auffüllen (Notizseiten vor der Rückseite) – so ergibt der Heftdruck ein richtiges Heft.
export const SEITE = { b: 559, h: 794 };
// Füllseiten bis zum Vielfachen von 4: Notenlinien zum Komponieren, Autogramme, Notizen (Linien als Rahmen – das kann auch das PDF)
const FUELL = [
  `<h2 class="echo-rubrik">🎼 Komponier selbst!</h2><p class="echo-unter">Notenlinien für deine eigene Melodie – vielleicht spielt das Orchester sie ja mal?</p>${Array.from({ length: 9 }, () => `<div class="echo-system">${"<i></i>".repeat(5)}</div>`).join("")}`,
  `<h2 class="echo-rubrik">✍️ Autogramme</h2><p class="echo-unter">Nach dem Konzert: Unterschriften von Dirigent/in, Solist/innen und Pultnachbarn sammeln!</p><div class="echo-autogramme">${"<div></div>".repeat(8)}</div>`,
  `<h2 class="echo-rubrik">📝 Notizen</h2>${'<div class="echo-zeile"></div>'.repeat(22)}`,
];
function fussHtml(h, nr) { return `<div class="echo-fuss ${nr % 2 ? "rechts" : "links"}"><span>Bachkreis-Echo · Heft ${esc(h.nr)} · ${esc(ausgabe(h))}</span><b>${nr}</b></div>`; }
export function echoSetzen(h, bloecke = echoBloecke(h)) {
  const box = document.createElement("div"); box.className = "echo-mess";
  box.innerHTML = `<div class="echo-seite"><div class="echo-satz"></div></div>`; document.body.appendChild(box);
  const satz = box.querySelector(".echo-satz"), seiten = [], toc = [];
  let jetzt = [];
  const passt = () => satz.scrollHeight <= satz.clientHeight + 1;
  const neueSeite = () => { if (jetzt.length) seiten.push({ art: "", html: jetzt.join("") }); jetzt = []; satz.innerHTML = ""; };
  try {
    for (const b of bloecke) {
      if (b.seite === "titel" || b.seite === "rueck") { neueSeite(); if (b.seite === "rueck") { seiten.push({ art: "rueck", html: b.html, toc: b.toc }); continue; } seiten.push({ art: "titel", html: b.html }); continue; }
      if ((b.neu || b.seite === "neu") && jetzt.length) neueSeite();
      const el = document.createElement("div"); el.className = "echo-block"; el.innerHTML = b.html; satz.appendChild(el);
      if (!passt() && jetzt.length) { satz.removeChild(el); neueSeite(); satz.appendChild(el); }
      if (b.toc) toc.push({ t: b.toc, seite: seiten.length + 1 });
      jetzt.push(el.outerHTML);
    }
    neueSeite();
  } finally { box.remove(); }
  const rueck = seiten.pop(), ziel = heftSeitenZahl(seiten.length + 1);
  for (let i = 0; seiten.length + 1 < ziel; i++) seiten.push({ art: "notiz", html: FUELL[i % FUELL.length] });
  seiten.push(rueck); toc.push({ t: rueck.toc || "Impressum", seite: seiten.length });
  const inhalt = `<ol class="echo-toc">${toc.map((x) => `<li><span>${esc(x.t)}</span><i></i><b>${x.seite}</b></li>`).join("")}</ol>`;
  return seiten.map((s, i) => `<div class="echo-seite echo-${s.art || "normal"}" data-nr="${i + 1}"><div class="echo-satz">${s.html.replace(/<div class="echo-inhalt" data-echo-inhalt(="")?><\/div>/, `<div class="echo-inhalt">${inhalt}</div>`)}</div>${i ? fussHtml(h, i + 1) : ""}</div>`);
}

// ---------- Bilder (nur aus Dateien, die man sehen darf – prüft der Server) ----------
const URLS = new Map();
function bilderLaden(w = document) {
  const wartet = [];
  for (const img of w.querySelectorAll("img[data-echo-bild]")) {
    const f = img.dataset.echoBild; if (!URLS.has(f)) URLS.set(f, dateiUrl(f.replace(/^datei:/, "")).catch(() => ""));
    wartet.push(URLS.get(f).then((u) => { if (u) { img.src = u; return img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; }); } img.closest("figure")?.classList.add("fehlt"); }));
  }
  return Promise.all(wartet);
}

// ---------- 📰 Startseite des Echos (Archiv, einreichen, meine Beiträge) ----------
const E = { seite: 0, cache: new Map() };
function seitenVon(h) {
  const bs = beitraegeIm(h.id), key = [h.id, h.version, h.geaendert_am, bs.map((b) => `${b.id}:${b.version}`).join(","), liste("termine").length].join("|");
  if (E.cache.get(h.id)?.key !== key) E.cache.set(h.id, { key, seiten: echoSetzen(h) });
  return E.cache.get(h.id).seiten;
}
const titelKarte = (h) => `<button type="button" class="echo-cover" data-a="echoLesen" data-x="${esc(h.id)}" aria-label="Heft ${esc(h.nr)} lesen">
  <span class="echo-cover-name">Bachkreis-Echo</span><span class="echo-cover-nr">Heft ${esc(h.nr)} · ${esc(ausgabe(h))}</span><span class="echo-cover-titel">${esc(h.titel || "Neues aus dem Bachkreis")}</span></button>`;
VIEWS.echo = {
  render() {
    const l = erschienene(), neu = l[0], alt = l.slice(1), meine = liste("echo_beitraege", (b) => !b.geloescht_am && b.von === S.ich?.id).sort((a, b) => String(b.erstellt_am || "").localeCompare(String(a.erstellt_am || "")));
    const offen = echoRedaktion() ? liste("echo_beitraege", (b) => !b.geloescht_am && b.status === "eingereicht").length : 0;
    return kopf("📰 Bachkreis-Echo") + `
      ${neu ? `<div class="karte echo-neu"><h3>📰 Das neue Heft</h3><div class="echo-neu-reihe">${titelKarte(neu)}<div class="echo-neu-knopf">
        <button type="button" class="knopf haupt breit" data-a="echoLesen" data-x="${esc(neu.id)}">📖 Lesen &amp; blättern</button>
        <button type="button" class="knopf breit" data-a="echoPdf" data-x="${esc(neu.id)}|a5">📄 PDF (A5-Seiten)</button>
        <button type="button" class="knopf breit" data-a="echoPdf" data-x="${esc(neu.id)}|heft">🖨️ Heftdruck (A4 quer, zum Falzen)</button></div></div></div>`
        : `<div class="karte"><p>🗞️ <b>Das erste Bachkreis-Echo ist in Arbeit.</b> Hast du etwas erlebt, ein Rätsel oder einen Witz? Schick es der Redaktion!</p></div>`}
      <div class="karte"><h3>✍️ Mitmachen</h3><p>Jede/r kann etwas fürs Heft einreichen – Berichte von Proben, Konzerten und Ausflügen, Fotos, Rätsel, Witze, Interviews. Die Redaktion sucht aus, die Leitung gibt das Heft frei.</p>
        <button type="button" class="knopf haupt breit" data-a="echoEinreichen">✍️ Beitrag einreichen</button>
        ${meine.length ? `<h4>Meine Beiträge</h4><ul class="liste">${meine.map((b) => `<li><div class="fl"><div class="zeile-titel">${esc(b.titel)}</div><div class="zeile-unter">${esc(ECHO_RUBRIKEN[b.rubrik] || "")}${b.heft_id ? ` · Heft ${esc(hole("echo_hefte", b.heft_id)?.nr ?? "")}` : ""}${b.redaktion_notiz ? ` · 💬 ${esc(b.redaktion_notiz)}` : ""}</div></div>
          <span class="badge ${b.status === "angenommen" ? "b-gruen" : b.status === "zurueck" ? "b-gelb" : b.status === "abgelehnt" ? "b-grau" : "b-blau"}">${esc(ECHO_BEITRAG_STATUS[b.status] || b.status)}</span>
          ${["eingereicht", "zurueck"].includes(b.status) ? `<button type="button" class="knopf klein" data-a="echoEinreichen" data-x="${esc(b.id)}" aria-label="Bearbeiten: ${esc(b.titel)}">✏️</button>` : ""}</li>`).join("")}</ul>` : ""}</div>
      ${echoRedaktion() ? `<div class="karte"><h3>🗂️ Redaktion</h3><p>${offen ? `<b>${offen}</b> ${offen > 1 ? "neue Beiträge" : "neuer Beitrag"} im Eingang.` : "Kein neuer Beitrag im Eingang."}</p><button type="button" class="knopf breit" data-a="oeffne" data-x="echoRedaktion">🗂️ Zur Redaktion</button></div>` : ""}
      ${alt.length ? `<div class="karte"><h3>🗄️ Ältere Hefte</h3><div class="echo-archiv">${alt.map(titelKarte).join("")}</div></div>` : ""}
      <p class="hinweis">🔒 Das Echo ist nur für Mitglieder. Fotos und Namen von Kindern erscheinen nur mit Einwilligung der Eltern; Kinder mit besonderem Schutz kommen nie vor.</p>`;
  },
  nach() { const neu = erschienene()[0]; if (neu && (Number(einst().echoGelesen) || 0) < (Number(neu.nr) || 0)) einstSetzen("echoGelesen", Number(neu.nr) || 0); },
};

// ---------- 📖 Blätterversion ----------
const breit = () => (document.getElementById("echoBuch")?.clientWidth || 0) >= 900; // Doppelseite nur, wenn zwei Seiten gut lesbar nebeneinander passen
function buchZeichnen(h) {
  const w = document.getElementById("echoBuch"); if (!w) return;
  const s = seitenVon(h), doppel = breit(), n = s.length;
  E.seite = Math.max(0, Math.min(n - 1, E.seite));
  // Doppelseite wie im gedruckten Heft: 1 allein (Titel), dann 2|3, 4|5 … , die Rückseite allein
  const paar = !doppel || E.seite === 0 || E.seite === n - 1 ? [E.seite] : E.seite % 2 ? [E.seite, E.seite + 1].filter((i) => i < n - 1) : [E.seite - 1, E.seite];
  const breite = paar.length * SEITE.b + (paar.length - 1) * 8, platz = w.clientWidth || 360, skala = Math.min(1.2, platz / breite), links = Math.max(0, Math.round((platz - breite * skala) / 2));
  w.innerHTML = `<div class="echo-buehne" style="height:${Math.round(SEITE.h * skala) + 4}px"><div class="echo-lupe"><div class="echo-doppel" style="transform:scale(${skala.toFixed(4)});width:${breite}px;left:${links}px">${paar.map((i) => s[i]).join("")}</div></div></div>`;
  // 🔍 0.72.0 Lupe: zwei Finger vergrößern, ein Finger verschiebt, doppelt tippen; nicht vergrößert blättert Wischen
  E.lupe = lupeAnbinden(w.querySelector(".echo-buehne"), w.querySelector(".echo-lupe"), { wisch: (r) => AKTIONEN.echoBlaettern(String(r)) });
  w.dataset.seite = String(E.seite);
  const zeig = document.getElementById("echoZaehler"); if (zeig) zeig.textContent = `Seite ${paar.map((i) => i + 1).join("–")} von ${n}`;
  const z = document.getElementById("echoZurueck"), v = document.getElementById("echoWeiter");
  if (z) z.disabled = Math.min(...paar) === 0; if (v) v.disabled = Math.max(...paar) >= n - 1;
  bilderLaden(w);
}
VIEWS.echoHeft = {
  render(p = {}) {
    const h = hole("echo_hefte", p.id); if (!h || (h.status !== "erschienen" && !echoRedaktion())) return kopf("📰 Bachkreis-Echo") + `<div class="karte"><p>Dieses Heft gibt es nicht (mehr).</p></div>`;
    const probleme = h.status === "erschienen" ? [] : echoPruefung(db, h.id);
    return kopf(`📰 Heft ${esc(h.nr)} · ${esc(ausgabe(h))}`) + `
      ${h.status !== "erschienen" ? `<div class="karte echo-vorschau"><b>👀 Vorschau – ${esc(ECHO_HEFT_STATUS[h.status] || "")}</b>${probleme.length ? `<ul>${probleme.map((x) => `<li>${esc(x.text)}</li>`).join("")}</ul>` : "<p>✅ Datenschutz-Prüfung: alles in Ordnung.</p>"}</div>` : ""}
      <div class="echo-leiste" role="toolbar" aria-label="Blättern">
        <button type="button" class="knopf klein" id="echoZurueck" data-a="echoBlaettern" data-x="-1" aria-label="Vorige Seite">‹ zurück</button>
        <span id="echoZaehler" aria-live="polite"></span>
        <span class="echo-lupe-knopf"><button type="button" class="knopf klein" data-a="echoLupe" data-x="-1" aria-label="Verkleinern">🔍−</button><button type="button" class="knopf klein" data-a="echoLupe" data-x="1" aria-label="Vergrößern">🔍+</button></span>
        <button type="button" class="knopf klein" id="echoWeiter" data-a="echoBlaettern" data-x="1" aria-label="Nächste Seite">weiter ›</button></div>
      <div id="echoBuch" class="echo-buch" data-heft="${esc(h.id)}"><p class="hinweis">⏳ Das Heft wird gesetzt …</p></div>
      <div class="echo-leiste unten"><button type="button" class="knopf" data-a="echoInhalt" data-x="${esc(h.id)}">📖 Inhalt</button>
        <button type="button" class="knopf" data-a="echoPdf" data-x="${esc(h.id)}|a5">📄 PDF (A5)</button>
        <button type="button" class="knopf" data-a="echoPdf" data-x="${esc(h.id)}|heft">🖨️ Heftdruck</button></div>
      <p class="hinweis">Tipp: wischen oder ‹ › zum Blättern · 🔍 mit zwei Fingern vergrößern, mit einem Finger verschieben, doppelt tippen (am PC: Strg + Mausrad). 🖨️ Heftdruck: A4 quer, beidseitig über die kurze Kante drucken, in der Mitte falzen, heften – fertig ist das A5-Heft.</p>`;
  },
  nach(w) {
    const b = w.querySelector("#echoBuch"); if (!b) return;
    const h = hole("echo_hefte", b.dataset.heft); if (!h) return;
    if (S.params?.seite != null) E.seite = Number(S.params.seite) || 0;
    requestAnimationFrame(() => buchZeichnen(h));
  },
};
AKTIONEN.echoLesen = (id) => { E.seite = 0; zeige("echoHeft", { id }); };
AKTIONEN.echoBlaettern = (d) => {
  const b = document.getElementById("echoBuch"), h = hole("echo_hefte", b?.dataset.heft); if (!h) return;
  const schritt = breit() ? (E.seite === 0 && Number(d) > 0 ? 1 : 2) : 1, n = seitenVon(h).length;
  E.seite = Math.max(0, Math.min(n - 1, E.seite + Number(d) * schritt));
  if (breit() && E.seite > 0 && E.seite < n - 1 && E.seite % 2 === 0) E.seite -= 1; // links steht immer die gerade Seite (2|3, 4|5 …)
  buchZeichnen(h);
  b.querySelector(".echo-doppel")?.classList.add(Number(d) > 0 ? "blatt-vor" : "blatt-zurueck");
};
AKTIONEN.echoInhalt = (id) => {
  const h = hole("echo_hefte", id); if (!h) return;
  const toc = [...new DOMParser().parseFromString(seitenVon(h)[1] || "", "text/html").querySelectorAll(".echo-toc li")].map((li) => [li.querySelector("span")?.textContent, Number(li.querySelector("b")?.textContent)]);
  blatt("📖 Inhalt", `<ul class="liste">${[["Titelseite", 1], ...toc].map(([t, n]) => `<li><button type="button" class="knopf breit links" data-a="echoSprung" data-x="${n}">${esc(t)} <span class="echo-seitenzahl">S. ${n}</span></button></li>`).join("")}</ul>`);
};
AKTIONEN.echoLupe = (d) => (Number(d) > 0 ? E.lupe?.plus() : E.lupe?.minus());
AKTIONEN.echoSprung = (n) => { blattZu(); E.seite = Number(n) - 1; const h = hole("echo_hefte", document.getElementById("echoBuch")?.dataset.heft); if (h) buchZeichnen(h); };
AKTIONEN.echoKlang = (id) => lehreKlang(id);
AKTIONEN.echoBach = () => zeige("buehne", { modus: "bach" });

// ---------- 📄 PDF: A5-Seiten oder Heftdruck (A4 quer, schon ausgeschossen) ----------
const SKALA = 2.6;
export async function echoPdf(h, art = "a5") {
  await html2canvasLaden();
  const s = seitenVon(h), box = document.createElement("div"); box.className = "echo-mess echo-druck";
  box.innerHTML = s.join(""); document.body.appendChild(box);
  try {
    await bilderLaden(box);
    const bilder = [];
    for (const el of box.querySelectorAll(".echo-seite")) bilder.push(await globalThis.html2canvas(el, { scale: SKALA, width: SEITE.b, height: SEITE.h, backgroundColor: "#ffffff", logging: false, useCORS: true, onclone: farbenGlaetten }));
    const jpeg = async (c) => ({ daten: new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86))).arrayBuffer()), w: c.width, h: c.height });
    const seiten = [];
    if (art === "heft") {
      const W = Math.round(SEITE.b * SKALA), H = Math.round(SEITE.h * SKALA);
      for (const [li, re] of heftAusschiessen(bilder.length)) {
        const c = document.createElement("canvas"); c.width = 2 * W; c.height = H; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        if (li) g.drawImage(bilder[li - 1], 0, 0, W, H); if (re) g.drawImage(bilder[re - 1], W, 0, W, H);
        g.fillStyle = "#cccccc"; g.fillRect(W - 0.5, 0, 1, 18); g.fillRect(W - 0.5, H - 18, 1, 18); // Falzmarken oben und unten
        seiten.push(await jpeg(c));
      }
    } else for (const c of bilder) seiten.push(await jpeg(c));
    const datei = `Bachkreis-Echo-Heft-${h.nr}${art === "heft" ? "-Heftdruck" : ""}.pdf`;
    return new File([pdfAusJpegs(seiten, { format: art === "heft" ? "quer" : "a5", titel: `Bachkreis-Echo Heft ${h.nr}` })], datei, { type: "application/pdf" });
  } finally { box.remove(); }
}
AKTIONEN.echoPdf = async (x) => {
  const [id, art] = String(x).split("|"), h = hole("echo_hefte", id); if (!h) return;
  toast(art === "heft" ? "🖨️ Heftdruck wird gebaut …" : "📄 PDF wird gebaut …", 2500);
  try {
    const datei = await echoPdf(h, art);
    if (navigator.canShare?.({ files: [datei] })) { try { await navigator.share({ files: [datei], title: datei.name }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(datei); a.download = datei.name; a.hidden = true; a.textContent = datei.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast(art === "heft" ? "💾 Heftdruck gespeichert – beidseitig (kurze Kante) drucken, falzen, heften" : "💾 PDF gespeichert");
  } catch (e) { toast("⚠️ " + (e.message || "PDF ging nicht"), 4000); }
};

// ---------- ✍️ Beitrag einreichen (alle) ----------
const F = { bild: null, personen: new Set() };
const kinderWahl = () => liste("personen", (p) => p.typ === "schueler" && p.status === "aktiv").sort((a, b) => String(a.vorname).localeCompare(String(b.vorname)));
AKTIONEN.echoEinreichen = (id = "") => {
  const b = id ? hole("echo_beitraege", id) : null;
  Object.assign(F, { id: b?.id || "", bild: b?.bild || null, personen: new Set(b?.personen || []) });
  const ich = S.ich, autor = b?.autor_zeile ?? (ich ? ich.vorname : "");
  const rubriken = Object.entries(ECHO_RUBRIKEN).filter(([k]) => echoRedaktion() || k !== "foerderverein" || hatRolle("vorstand"));
  blatt(b ? "✏️ Beitrag bearbeiten" : "✍️ Beitrag fürs Bachkreis-Echo", `
    <div class="feld"><label for="ecRubrik">Wofür?</label><select id="ecRubrik">${rubriken.map(([k, t]) => `<option value="${k}"${(b?.rubrik || "orchesterleben") === k ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
    <div class="feld"><label for="ecTitel">Überschrift</label><input id="ecTitel" maxlength="120" value="${esc(b?.titel || "")}" placeholder="z. B. Unser Probenwochenende in Haltern"></div>
    <div class="feld"><label for="ecText">Text</label><textarea id="ecText" rows="8" maxlength="${ECHO_TEXT_MAX}" placeholder="Was ist passiert? Was war lustig, spannend, schön?">${esc(b?.text || "")}</textarea></div>
    <div class="feld"><label for="ecBild">📷 Foto (freiwillig)</label><input id="ecBild" type="file" accept="image/*" data-c="echoBild"><div id="ecBildStand" class="hinweis">${F.bild ? "✅ Foto ist dabei" : ""}</div></div>
    <div class="feld"><label for="ecBildText">Bildunterschrift</label><input id="ecBildText" maxlength="160" value="${esc(b?.bild_text || "")}" placeholder="ohne Kindernamen – z. B. „Die Celli beim Einspielen“"></div>
    <details class="feld"><summary>👧 Wer ist auf dem Foto oder wird im Text genannt?</summary><p class="hinweis">Damit die Redaktion die Einwilligungen prüfen kann. Kinder mit besonderem Schutz kommen nie ins Heft.</p>
      <input type="search" id="ecSuche" placeholder="Name suchen …" aria-label="Kinder suchen" data-c="echoSuche">
      <div class="echo-kinder" id="ecKinder">${kinderWahl().map((p) => `<label data-n="${esc((p.vorname + " " + (p.nachname || "")).toLowerCase())}"><input type="checkbox" value="${esc(p.id)}"${F.personen.has(p.id) ? " checked" : ""}> ${esc(p.vorname)} ${esc((p.nachname || "").slice(0, 1))}.</label>`).join("") || '<p class="hinweis">–</p>'}</div></details>
    <div class="feld"><label for="ecAutor">Name unter dem Beitrag</label><input id="ecAutor" maxlength="60" value="${esc(autor)}" placeholder="z. B. Lena (2. Violine)"></div>
    <p class="hinweis">📸 Fotos von Kindern nur, wenn die Eltern eingewilligt haben – die Redaktion prüft das. Die Redaktion darf kürzen und korrigieren.</p>
    <button type="button" class="knopf haupt breit" data-a="echoSenden">📮 Abschicken</button>`);
};
AKTIONEN.echoSuche = (v) => { const q = String(v || "").toLowerCase(); for (const l of document.querySelectorAll("#ecKinder label")) l.hidden = !!q && !l.dataset.n.includes(q); };
AKTIONEN.echoBild = async (_v, el) => {
  const f = el?.files?.[0]; if (!f) return; const st = document.getElementById("ecBildStand"); if (st) st.textContent = "⏳ Foto wird hochgeladen …";
  try { const a = await hochladen(await bildVerkleinern(f, 1600), { art: "bild" }); F.bild = "datei:" + a.id; if (st) st.textContent = "✅ Foto ist dabei"; }
  catch (e) { F.bild = null; if (st) st.textContent = "⚠️ " + (e.message || "Hochladen ging nicht"); }
};
AKTIONEN.echoSenden = async () => {
  const v = (id) => String(document.getElementById(id)?.value || "").trim();
  const titel = v("ecTitel"), text = v("ecText"); if (!titel || !text) return toast("Bitte Überschrift und Text ausfüllen");
  const personen = [...document.querySelectorAll("#ecKinder input:checked")].map((x) => x.value), alt = F.id ? hole("echo_beitraege", F.id) : null;
  await speichere("echo_beitraege", { ...(alt || { id: neueId(), von: S.ich.id }), rubrik: v("ecRubrik"), titel, text, bild: F.bild, bild_text: v("ecBildText") || null, personen, autor_zeile: v("ecAutor") || null, status: alt && echoRedaktion() ? alt.status : "eingereicht" });
  blattZu(); toast("📮 Danke! Die Redaktion schaut es sich an."); zeichne();
};

// ---------- 🗂️ Redaktion ----------
const statusBadge = (h) => `<span class="badge ${h.status === "erschienen" ? "b-gruen" : h.status === "freigabe" ? "b-gelb" : "b-blau"}">${esc(ECHO_HEFT_STATUS[h.status] || h.status)}</span>`;
function heftKarte(h) {
  const bs = beitraegeIm(h.id, true), an = bs.filter((b) => b.status === "angenommen"), probleme = echoPruefung(db, h.id), ich = S.ich?.id;
  const vierAugen = h.freigabe_von && h.freigabe_von === ich;
  return `<div class="karte echo-heftkarte"><h3>📰 Heft ${esc(h.nr)} · ${esc(ausgabe(h))} ${statusBadge(h)}</h3>
    <p>${esc(h.titel || "ohne Titel-Thema")}${h.erscheint_am ? ` · geplant ${esc(h.erscheint_am.split("-").reverse().join("."))}` : ""} · ${an.length} Beitr${an.length === 1 ? "ag" : "äge"} im Heft</p>
    ${an.length ? `<ol class="echo-reihe">${an.map((b, i) => `<li><span>${esc(ECHO_RUBRIKEN[b.rubrik]?.split(" ")[0] || "")} ${esc(b.titel)} <small>· ${esc(name(b.von))}</small></span>
      <span class="echo-reihe-knopf">${h.status !== "erschienen" ? `<button type="button" class="knopf klein" data-a="echoSchieben" data-x="${esc(b.id)}|-1" aria-label="Nach oben" ${i ? "" : "disabled"}>⬆️</button><button type="button" class="knopf klein" data-a="echoSchieben" data-x="${esc(b.id)}|1" aria-label="Nach unten" ${i < an.length - 1 ? "" : "disabled"}>⬇️</button>
      <button type="button" class="knopf klein" data-a="echoPruefen" data-x="${esc(b.id)}" aria-label="Bearbeiten: ${esc(b.titel)}">✏️</button>` : ""}</span></li>`).join("")}</ol>` : ""}
    ${h.status !== "erschienen" ? (probleme.length ? `<div class="echo-probleme"><b>🔒 Datenschutz – vor dem Erscheinen klären:</b><ul>${probleme.map((x) => `<li>${esc(x.text)}</li>`).join("")}</ul></div>` : `<p class="echo-ok">🔒 Datenschutz-Prüfung: ✅ in Ordnung</p>`) : ""}
    <div class="knopfreihe">
      <button type="button" class="knopf" data-a="echoLesen" data-x="${esc(h.id)}">👀 ${h.status === "erschienen" ? "Lesen" : "Vorschau"}</button>
      ${h.status !== "erschienen" || echoChef() ? `<button type="button" class="knopf" data-a="echoHeftForm" data-x="${esc(h.id)}">✏️ Bearbeiten</button>` : ""}
      ${h.status === "entwurf" ? `<button type="button" class="knopf haupt" data-a="echoStatus" data-x="${esc(h.id)}|freigabe">📮 Zur Freigabe</button>` : ""}
      ${h.status === "freigabe" && echoChef() && !vierAugen && !probleme.length ? `<button type="button" class="knopf haupt" data-a="echoStatus" data-x="${esc(h.id)}|erschienen">✅ Freigeben &amp; erscheinen lassen</button>` : ""}
      ${h.status === "freigabe" ? `<button type="button" class="knopf" data-a="echoStatus" data-x="${esc(h.id)}|entwurf">↩️ Zurück in Arbeit</button>` : ""}
      ${h.status === "erschienen" && echoChef() ? `<button type="button" class="knopf" data-a="echoStatus" data-x="${esc(h.id)}|entwurf">↩️ Zurückziehen</button>` : ""}</div>
    ${h.status === "freigabe" ? `<p class="hinweis">${vierAugen ? "👀 Vier-Augen-Prinzip: Freigeben muss jemand anderes aus der Leitung – du hast das Heft zur Freigabe geschickt." : echoChef() ? (probleme.length ? "Erst die Datenschutz-Punkte klären, dann freigeben." : "Bitte einmal ganz durchblättern, dann freigeben. Alle bekommen dann eine Nachricht.") : "Wartet auf die Freigabe durch die Leitung."}</p>` : ""}
  </div>`;
}
VIEWS.echoRedaktion = {
  render() {
    if (!echoRedaktion()) return kopf("🗂️ Redaktion") + `<div class="karte"><p>Nur für die Redaktion.</p></div>`;
    const offen = echoHefte().filter((h) => h.status !== "erschienen"), fertig = erschienene().slice(0, 4);
    const eingang = liste("echo_beitraege", (b) => !b.geloescht_am && (b.status === "eingereicht" || (!b.heft_id && b.status === "angenommen"))).sort((a, b) => String(a.erstellt_am || "").localeCompare(String(b.erstellt_am || "")));
    return kopf("🗂️ Echo-Redaktion") + `
      <div class="karte"><h3>📥 Eingang (${eingang.length})</h3>${eingang.length ? `<ul class="liste">${eingang.map((b) => `<li><div class="fl"><div class="zeile-titel">${esc(b.titel)}</div>
        <div class="zeile-unter">${esc(ECHO_RUBRIKEN[b.rubrik] || "")} · ${esc(name(b.von))}${b.bild ? " · 📷" : ""}${(b.personen || []).length ? ` · 👧 ${b.personen.length}` : ""}</div></div>
        <button type="button" class="knopf klein haupt" data-a="echoPruefen" data-x="${esc(b.id)}">Ansehen</button></li>`).join("")}</ul>` : '<p class="hinweis">Gerade nichts Neues.</p>'}</div>
      ${offen.map(heftKarte).join("")}
      <button type="button" class="knopf breit" data-a="echoHeftForm">➕ Neues Heft anlegen</button>
      ${fertig.length ? `<h3 class="abschnitt">📰 Erschienen</h3>${fertig.map(heftKarte).join("")}` : ""}
      <div class="karte"><h3>So läuft es</h3><ol><li>✍️ Alle reichen Beiträge ein – auch Schülerinnen und Schüler.</li><li>🗂️ Die Redaktion sortiert, kürzt, ordnet einem Heft zu und nimmt an.</li>
        <li>📮 „Zur Freigabe“ – 👀 jemand anderes aus der Leitung blättert durch und gibt frei (Vier-Augen).</li><li>📰 Das Heft erscheint: alle bekommen eine Nachricht, PDF und Heftdruck sind fertig.</li></ol>
        <p class="hinweis">4 Hefte im Jahr (Frühling, Sommer, Herbst, Winter) – öfter, wenn das Team es so abstimmt. Die Rolle „Redaktion“ vergibt die Leitung in der Personenliste.</p></div>`;
  },
};
AKTIONEN.echoPruefen = (id) => {
  const b = hole("echo_beitraege", id); if (!b) return;
  const hefte = echoHefte().filter((h) => h.status !== "erschienen"), probleme = b.heft_id ? echoPruefung(db, b.heft_id).filter((x) => x.beitrag === b.id) : [];
  blatt("🗂️ Beitrag prüfen", `<p class="hinweis">${esc(ECHO_RUBRIKEN[b.rubrik] || "")} · von ${esc(name(b.von))} · ${esc(ECHO_BEITRAG_STATUS[b.status] || "")}</p>
    <div class="feld"><label for="erTitel">Überschrift</label><input id="erTitel" maxlength="120" value="${esc(b.titel)}"></div>
    <div class="feld"><label for="erText">Text (kürzen und korrigieren erlaubt)</label><textarea id="erText" rows="9" maxlength="${ECHO_TEXT_MAX}">${esc(b.text)}</textarea></div>
    ${b.bild ? `<figure class="echo-bild klein"><img data-echo-bild="${esc(b.bild)}" alt="Foto zum Beitrag"></figure><label class="zeile"><input type="checkbox" id="erOhneBild"> Foto weglassen</label>` : ""}
    <div class="feld"><label for="erBildText">Bildunterschrift</label><input id="erBildText" maxlength="160" value="${esc(b.bild_text || "")}"></div>
    <div class="feld"><label for="erAutor">Name unter dem Beitrag</label><input id="erAutor" maxlength="60" value="${esc(b.autor_zeile || "")}"></div>
    <p>👧 Kommt vor: ${(b.personen || []).map((p) => esc(name(p))).join(", ") || "niemand angegeben"}</p>
    ${probleme.length ? `<div class="echo-probleme"><ul>${probleme.map((x) => `<li>${esc(x.text)}</li>`).join("")}</ul></div>` : ""}
    <div class="feld"><label for="erHeft">In welches Heft?</label><select id="erHeft"><option value="">– noch keins –</option>${hefte.map((h) => `<option value="${esc(h.id)}"${b.heft_id === h.id ? " selected" : ""}>Heft ${esc(h.nr)} · ${esc(ausgabe(h))}</option>`).join("")}</select></div>
    <div class="feld"><label for="erNotiz">Hinweis an die Autorin / den Autor</label><input id="erNotiz" maxlength="500" value="${esc(b.redaktion_notiz || "")}" placeholder="z. B. Super! Kannst du noch schreiben, wo es war?"></div>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="echoEntscheiden" data-x="${esc(b.id)}|angenommen">✅ Ins Heft</button>
      <button type="button" class="knopf" data-a="echoEntscheiden" data-x="${esc(b.id)}|zurueck">↩️ Zum Überarbeiten zurück</button>
      <button type="button" class="knopf" data-a="echoEntscheiden" data-x="${esc(b.id)}|abgelehnt">❌ Diesmal nicht</button></div>`);
  bilderLaden(document.getElementById("blattHg") || document);
};
AKTIONEN.echoEntscheiden = async (x) => {
  const [id, status] = String(x).split("|"), b = hole("echo_beitraege", id); if (!b) return;
  const v = (k) => String(document.getElementById(k)?.value || "").trim(), heft = v("erHeft") || null;
  if (status === "angenommen" && !heft) return toast("Bitte erst ein Heft wählen (oder ➕ Neues Heft anlegen)");
  const an = beitraegeIm(heft || "").length;
  await speichere("echo_beitraege", { ...b, titel: v("erTitel") || b.titel, text: v("erText") || b.text, bild: document.getElementById("erOhneBild")?.checked ? null : b.bild, bild_text: v("erBildText") || null,
    autor_zeile: v("erAutor") || null, heft_id: heft, redaktion_notiz: v("erNotiz") || null, status, reihenfolge: status === "angenommen" && b.status !== "angenommen" ? an + 1 : b.reihenfolge });
  blattZu(); toast({ angenommen: "✅ Kommt ins Heft", zurueck: "↩️ Zurück an die Autorin / den Autor", abgelehnt: "Gespeichert" }[status]); zeichne();
};
AKTIONEN.echoSchieben = async (x) => {
  const [id, d] = String(x).split("|"), b = hole("echo_beitraege", id); if (!b) return;
  const l = beitraegeIm(b.heft_id), i = l.findIndex((y) => y.id === id), j = i + Number(d); if (i < 0 || j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  for (const [k, y] of l.entries()) if (y.reihenfolge !== k + 1) await speichere("echo_beitraege", { ...y, reihenfolge: k + 1 });
  zeichne();
};
AKTIONEN.echoHeftForm = (id = "") => {
  const h = id ? hole("echo_hefte", id) : null, letzte = echoHefte()[0], jahr = new Date().getFullYear();
  const naechste = { fruehling: "sommer", sommer: "herbst", herbst: "winter", winter: "fruehling" }[letzte?.ausgabe] || ["winter", "winter", "fruehling", "fruehling", "fruehling", "sommer", "sommer", "sommer", "herbst", "herbst", "herbst", "winter"][new Date().getMonth()];
  const d = h || { nr: (Number(letzte?.nr) || 0) + 1, ausgabe: naechste, jahr: naechste === "fruehling" && new Date().getMonth() >= 9 ? jahr + 1 : jahr };
  F.titelbild = h?.titelbild || null;
  blatt(h ? `✏️ Heft ${esc(h.nr)}` : "➕ Neues Heft", `
    <div class="feld-reihe"><div class="feld"><label for="ehNr">Heft-Nr.</label><input id="ehNr" type="number" min="1" value="${esc(d.nr)}"></div>
      <div class="feld"><label for="ehAusgabe">Ausgabe</label><select id="ehAusgabe">${Object.entries(ECHO_AUSGABEN).map(([k, t]) => `<option value="${k}"${d.ausgabe === k ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      <div class="feld"><label for="ehJahr">Jahr</label><input id="ehJahr" type="number" value="${esc(d.jahr)}"></div></div>
    <div class="feld"><label for="ehTitel">Titel-Thema</label><input id="ehTitel" maxlength="120" value="${esc(d.titel || "")}" placeholder="z. B. Unser Sommerkonzert"></div>
    <div class="feld"><label for="ehBild">🖼️ Titelbild (freiwillig, ohne erkennbare Kinder ohne Einwilligung)</label><input id="ehBild" type="file" accept="image/*" data-c="echoTitelbild"><div id="ehBildStand" class="hinweis">${F.titelbild ? "✅ Titelbild ist dabei" : ""}</div></div>
    <div class="feld"><label for="ehVorwort">Vorwort</label><textarea id="ehVorwort" rows="6" maxlength="${ECHO_TEXT_MAX}" placeholder="Liebe Bachkreislerinnen und Bachkreisler, …">${esc(d.vorwort || "")}</textarea></div>
    <div class="feld"><label for="ehVorwortVon">Vorwort von</label><input id="ehVorwortVon" maxlength="60" value="${esc(d.vorwort_von || "")}" placeholder="z. B. Ihre Leitung des Bachkreises"></div>
    <div class="feld-reihe"><div class="feld"><label for="ehInst">🎻 Instrument des Monats</label><select id="ehInst"><option value="">automatisch</option>${LEHRE.map((l) => `<option value="${l.id}"${d.instrument === l.id ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
      <div class="feld"><label for="ehKomp">🎼 Komponist/in</label><select id="ehKomp"><option value="">automatisch</option>${KOMPONISTEN.map((k) => `<option value="${k.id}"${d.komponist === k.id ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select></div></div>
    <div class="feld-reihe"><div class="feld"><label for="ehVon">📅 Termine ab</label><input id="ehVon" type="date" value="${esc(d.termine_von || "")}"></div><div class="feld"><label for="ehBis">bis</label><input id="ehBis" type="date" value="${esc(d.termine_bis || "")}"></div>
      <div class="feld"><label for="ehErscheint">soll erscheinen am</label><input id="ehErscheint" type="date" value="${esc(d.erscheint_am || "")}"></div></div>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="echoHeftSpeichern" data-x="${esc(h?.id || "")}">💾 Speichern</button>
      ${h && h.status !== "erschienen" ? `<button type="button" class="knopf" data-a="echoHeftLoeschen" data-x="${esc(h.id)}">🗑️ Löschen</button>` : ""}</div>`);
};
AKTIONEN.echoTitelbild = async (_v, el) => {
  const f = el?.files?.[0]; if (!f) return; const st = document.getElementById("ehBildStand"); if (st) st.textContent = "⏳ wird hochgeladen …";
  try { const a = await hochladen(await bildVerkleinern(f, 1800), { art: "bild" }); F.titelbild = "datei:" + a.id; if (st) st.textContent = "✅ Titelbild ist dabei"; }
  catch (e) { if (st) st.textContent = "⚠️ " + (e.message || "Hochladen ging nicht"); }
};
AKTIONEN.echoHeftSpeichern = async (id) => {
  const v = (k) => String(document.getElementById(k)?.value || "").trim(), alt = id ? hole("echo_hefte", id) : null;
  await speichere("echo_hefte", { ...(alt || { id: neueId(), status: "entwurf" }), nr: Number(v("ehNr")) || 1, ausgabe: v("ehAusgabe"), jahr: Number(v("ehJahr")) || new Date().getFullYear(), titel: v("ehTitel") || null,
    titelbild: F.titelbild, vorwort: v("ehVorwort") || null, vorwort_von: v("ehVorwortVon") || null, instrument: v("ehInst") || null, komponist: v("ehKomp") || null,
    termine_von: v("ehVon") || null, termine_bis: v("ehBis") || null, erscheint_am: v("ehErscheint") || null });
  blattZu(); toast("💾 Gespeichert"); zeichne();
};
AKTIONEN.echoHeftLoeschen = async (id) => { const h = hole("echo_hefte", id); if (!h || !(await frage(`Heft ${h.nr} löschen? Die Beiträge bleiben im Eingang.`))) return; await speichere("echo_hefte", { ...h, geloescht_am: new Date().toISOString() }); blattZu(); zeichne(); };
AKTIONEN.echoStatus = async (x) => {
  const [id, status] = String(x).split("|"), h = hole("echo_hefte", id); if (!h) return;
  if (status === "erschienen") {
    if (h.freigabe_von === S.ich?.id) return toast("👀 Vier-Augen-Prinzip: Freigeben muss jemand anderes aus der Leitung.", 4000);
    const p = echoPruefung(db, id); if (p.length) return toast("🔒 Erst die Datenschutz-Punkte klären.", 4000);
    if (!(await frage(`Heft ${h.nr} jetzt erscheinen lassen? Alle Mitglieder bekommen eine Nachricht.`))) return;
  }
  if (status === "entwurf" && h.status === "erschienen" && !(await frage(`Heft ${h.nr} zurückziehen? Dann ist es für die Mitglieder nicht mehr zu sehen.`))) return;
  const jetzt = new Date().toISOString(); // im Echtbetrieb setzt der Server Person und Zeit; in der Vorführversion hier
  await speichere("echo_hefte", { ...h, status, ...(status === "freigabe" ? { freigabe_von: S.ich.id, freigabe_am: jetzt } : {}), ...(status === "erschienen" ? { freigegeben_von: S.ich.id, erschienen_am: jetzt } : {}), ...(status === "entwurf" ? { freigabe_von: null, freigabe_am: null } : {}) });
  toast({ freigabe: "📮 Zur Freigabe geschickt", erschienen: "📰 Das Heft ist erschienen!", entwurf: "↩️ Zurück in Arbeit" }[status]); zeichne();
};
