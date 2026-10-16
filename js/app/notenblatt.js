// 🎼 Notenblatt (0.18.0): zeigt Demo-Probenoten einer Stimme (datei „demo:<stück>“) – selbst gesetzt aus gemeinfreien Melodien,
// je Instrument richtig notiert (Schlüssel, Lage, transponierend). ▶ Anhören mit der Klangfarbe des Instruments (mitlaufende Note),
// 🔍 Größe (Takte je Zeile, merkt sich das Gerät), 🖨️ Drucken, ⬇️ als SVG speichern. Echte PDFs öffnet weiter „notenDatei“.
import { S, VIEWS, zeige, zeichne, kopf, einst, einstSetzen } from "./zustand.js";
import { esc, AKTIONEN, toast, herunterladen } from "../kern/ui.js";
import { hole } from "../kern/daten.js";
import { stimmeErzeugen, notenSvg, tonartName, transVz } from "../kern/notensatz.js";
import { instrumentSpielen } from "../kern/musik.js";

export const istDemoNoten = (s) => !!s?.datei?.startsWith("demo:");
const NB = { audio: null, spielt: 0 }; // spielt = laufende Wiedergabe-Nummer (0 = aus)
const takte = () => einst().notenTakte || (innerWidth < 560 ? 2 : innerWidth < 900 ? 3 : 4);
const imslp = (w) => `https://imslp.org/index.php?search=${encodeURIComponent(`${w.titel.split(/[–(]/)[0]} ${w.komponist.split(" ").pop()}`)}`;

function stimmeVon(sid) {
  const s = hole("stimmen", sid);
  if (!istDemoNoten(s)) return null;
  const st = stimmeErzeugen(s.datei.slice(5), s.bezeichnung);
  return st && { s, w: hole("werke", s.werk_id) || { titel: st.stueck.titel, komponist: st.stueck.komponist }, st };
}

VIEWS.notenblatt = {
  render(p) {
    const d = stimmeVon(p.sid);
    if (!d) return kopf("🎼 Noten") + '<div class="leer">Diese Noten gibt es nicht (mehr).</div>';
    const { s, w, st } = d, vz = transVz(st.vorzeichen, st.zeilen[0].trans);
    return kopf("🎼 Noten") + `<nav class="na-pfad" aria-label="Pfad"><button type="button" data-a="notenZu" data-x="start">📚 Notenarchiv</button><span>›</span><button type="button" data-a="notenWerk" data-x="${esc(w.id || "")}">${esc(w.titel)}</button><span>›</span><b>${esc(s.bezeichnung)}</b></nav>
      <div class="karte nb-kopf"><div class="nb-titel"><b>${esc(w.titel)}</b><small>${esc(w.komponist)}${w.werkverzeichnis ? " · " + esc(w.werkverzeichnis) : ""}</small></div>
        <div class="nb-info"><span class="na-marke">🎻 ${esc(st.key === "partitur" || st.key === "hk" ? st.inst.name : s.bezeichnung)}</span>${st.inst.info ? `<span class="na-marke">ℹ️ ${esc(st.inst.info)}</span>` : ""}<span class="na-marke">♩ = ${st.tempo}</span><span class="na-marke">${st.takt}/4 · ${tonartName(vz)}</span></div>
        <div class="knopfreihe nb-knoepfe">
          <button type="button" class="knopf haupt" data-a="nbSpielen" aria-pressed="${!!NB.spielt}">${NB.spielt ? "⏹ Stopp" : "▶ Anhören"}</button>
          <span class="nb-zoom" role="group" aria-label="Größe"><button type="button" class="knopf klein" data-a="nbZoom" data-x="1" aria-label="Größer">🔍＋</button><button type="button" class="knopf klein" data-a="nbZoom" data-x="-1" aria-label="Kleiner">🔍－</button></span>
          <button type="button" class="knopf klein" data-a="nbDrucken">🖨️ Drucken</button>
          <button type="button" class="knopf klein" data-a="nbSpeichern" data-x="${esc(s.id)}">⬇️ Speichern</button></div></div>
      <div class="nb-blatt"><div class="nb-druckkopf"><b>${esc(w.titel)}</b> – ${esc(w.komponist)}<span>${esc(s.bezeichnung)}${st.inst.info ? ` (${esc(st.inst.info)})` : ""}</span></div>
        ${notenSvg(st, { takteJeZeile: takte(), titel: `${w.titel} – ${s.bezeichnung}` })}
        <p class="nb-fuss">Gemeinfrei · für den Bachkreis vereinfacht gesetzt (Demo)</p></div>
      <p class="hinweis">🎓 Demo-Probenoten: Melodie, Mittel- und Bassstimme sind aus der gemeinfreien Melodie und ihrer Harmonie abgeleitet – zum Üben und Ausprobieren, keine Originalausgabe.
        Originalnoten gemeinfreier Werke gibt es kostenlos bei <a href="${esc(imslp(w))}" target="_blank" rel="noopener">IMSLP ↗</a>. Echte Stimmen lädt die Leitung im Notenarchiv als PDF hoch (📤).</p>`;
  },
};

function stoppen() {
  NB.spielt = 0;
  try { NB.audio?.close(); } catch {}
  NB.audio = null;
  document.querySelectorAll(".nb-svg .an").forEach((e) => e.classList.remove("an"));
}
AKTIONEN.nbSpielen = () => {
  if (NB.spielt) { stoppen(); return zeichne(); }
  const d = stimmeVon(S.params.sid);
  if (!d) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return toast("Dieses Gerät kann keine Musik erzeugen");
  NB.audio = new AC(); NB.audio.resume?.();
  const nr = (NB.spielt = Date.now()), schlag = 60 / d.st.tempo;
  let dauer = 0;
  d.st.zeilen.forEach((z, zi) => {
    const idx = z.noten.map((n, i) => (n.ton == null ? -1 : i)).filter((i) => i >= 0);
    let k = 0;
    const sek = instrumentSpielen(NB.audio, z.klang, z.noten.map((n) => [n.ton, n.dauer, zi ? 0.6 : 1]), { schlag, lautstaerke: zi ? 0.6 : 0.9, onTon: () => {
      if (NB.spielt !== nr) return;
      if (S.view !== "notenblatt") return stoppen();
      if (zi) return;
      document.querySelectorAll(".nb-svg .an").forEach((e) => e.classList.remove("an"));
      const el = document.querySelector(`.nb-svg [data-k="0-${idx[k++]}"]`);
      el?.classList.add("an");
    } });
    dauer = Math.max(dauer, sek);
  });
  setTimeout(() => { if (NB.spielt === nr) { stoppen(); if (S.view === "notenblatt") zeichne(); } }, dauer * 1000 + 300);
  zeichne();
};
AKTIONEN.nbZoom = (x) => { einstSetzen("notenTakte", Math.max(1, Math.min(6, takte() - Number(x)))); zeichne(); };
AKTIONEN.nbDrucken = () => window.print();
AKTIONEN.nbSpeichern = (sid) => {
  const d = stimmeVon(sid); if (!d) return;
  const svg = notenSvg(d.st, { takteJeZeile: 4, titel: `${d.w.titel} – ${d.s.bezeichnung}` }).replace('fill="currentColor"', 'fill="#000" color="#000"').replace('stroke="currentColor"', 'stroke="#000"');
  herunterladen(`${d.w.titel} – ${d.s.bezeichnung}.svg`.replace(/[\\/:*?"<>|„“]/g, ""), `<?xml version="1.0" encoding="UTF-8"?>\n` + svg.replace('class="nb-svg"', 'class="nb-svg" style="background:#fff"'), "image/svg+xml");
};
export const notenblattZeigen = (sid) => zeige("notenblatt", { sid });
