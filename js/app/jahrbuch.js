// 📖 Bachkreis-Jahrbuch (0.47.0, wie KC „Unser Clubjahr“ zum Blättern + „Mein Clubmoment“): je Schuljahr ein Buch aus dem, was ohnehin
// in der App steht – Zahlen, Konzerte & Auftritte, Fahrten, Fotos – dazu 💛 „Mein schönster Moment“ von Kindern, Eltern und Lehrkräften.
// Ins Buch kommen Momente erst nach Freigabe durch die Leitung (Kinderschutz). Fotos nur aus dem Fotoalbum (dort gilt die Foto-Einwilligung).
import { S, VIEWS, zeige, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, datumKurz } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { schuljahrVon } from "../kern/schema.js";
import { dateiUrl } from "../kern/dateien.js";

const moderation = () => hatRolle("admin", "leitung");
const J = { seite: 0 };
const grenzen = (sj) => { const j = Number(sj.slice(0, 4)); return [`${j}-08-01`, `${j + 1}-07-31`]; };
const imJahr = (iso, sj) => { if (!iso) return false; const [a, b] = grenzen(sj), d = String(iso).slice(0, 10); return d >= a && d <= b; };
export const jahrgaenge = () => [...new Set([schuljahrVon(), ...liste("jahrbuch_momente").map((m) => m.schuljahr), ...liste("projekte").filter((p) => p.von).map((p) => schuljahrVon(new Date(p.von + "T12:00")))])].filter(Boolean).sort().reverse();
export const momenteOffen = () => (moderation() ? liste("jahrbuch_momente", (m) => !m.freigegeben).length : 0);
const URLS = new Map();
function bilderLaden(w = document) {
  for (const img of w.querySelectorAll("img[data-jb-foto]")) {
    const f = img.dataset.jbFoto;
    if (f.startsWith("bild:")) { img.src = f.slice(5); continue; }
    if (!URLS.has(f)) URLS.set(f, dateiUrl(f.replace(/^datei:/, "")).catch(() => ""));
    URLS.get(f).then((u) => { if (u) img.src = u; });
  }
}
function seiten(sj) {
  const proj = liste("projekte", (p) => imJahr(p.von, sj)).sort((a, b) => String(a.von).localeCompare(String(b.von)));
  const konzerte = proj.filter((p) => p.art === "konzert"), fahrten = proj.filter((p) => ["reise", "freizeit"].includes(p.art));
  const termine = liste("termine", (t) => imJahr(t.beginn, sj) && t.status !== "abgesagt");
  const proben = termine.filter((t) => /probe/i.test(t.titel || "")).length;
  const alben = liste("fotoalben", (a) => !a.geloescht_am).map((a) => ({ a, f: liste("fotos", (f) => f.album_id === a.id && !f.papierkorb_am && imJahr(f.aufgenommen_am || f.erstellt_am, sj)) })).filter((x) => x.f.length);
  const momente = liste("jahrbuch_momente", (m) => m.schuljahr === sj && m.freigegeben);
  const kinder = liste("personen", (p) => p.typ === "schueler" && p.status === "aktiv").length;
  const zahl = (n, t) => `<div class="jb-zahl"><b>${n}</b><small>${t}</small></div>`;
  return [
    ["📖 Titel", `<div class="jb-titel"><img src="icons/logo.png" alt="" width="96" height="96"><h2>Unser Bachkreis-Jahr</h2><div class="jb-sj">${esc(sj)}</div>
      <div class="jb-zahlen">${zahl(konzerte.length, "Konzerte")}${zahl(proben, "Proben")}${zahl(fahrten.length, "Fahrten")}${zahl(kinder, "Kinder & Jugendliche")}</div></div>`],
    ["🎭 Konzerte", konzerte.length ? konzerte.map((p) => `<div class="jb-eintrag"><b>${esc(p.titel)}</b><small>${esc(datumKurz(p.bis || p.von))}${p.ort ? ` · ${esc(p.ort)}` : ""}</small></div>`).join("") : '<p class="hinweis">In diesem Schuljahr noch kein Konzert eingetragen.</p>'],
    ["🧳 Fahrten", fahrten.length ? fahrten.map((p) => `<div class="jb-eintrag"><b>${esc(p.titel)}</b><small>${esc(datumKurz(p.von))}${p.bis ? `–${esc(datumKurz(p.bis))}` : ""}${p.ort ? ` · ${esc(p.ort)}` : ""}</small></div>`).join("") : '<p class="hinweis">Noch keine Fahrt in diesem Schuljahr.</p>'],
    ["📷 Fotos", alben.length ? `<div class="jb-fotos">${alben.slice(0, 8).map(({ a, f }) => `<button type="button" class="jb-foto" data-a="oeffne" data-x="fotoalbumAlbum|${esc(a.id)}"><img data-jb-foto="${esc(f[0].datei)}" alt="${esc(a.titel || "Album")}"><span>${esc(a.titel || "Album")} · ${f.length}</span></button>`).join("")}</div>` : '<p class="hinweis">Noch keine Fotos aus diesem Schuljahr im Fotoalbum.</p>'],
    ["💛 Momente", `${momente.map((m) => `<blockquote class="jb-moment">„${esc(m.text)}“<cite>– ${esc(hole("personen", m.von)?.vorname || "jemand")}</cite></blockquote>`).join("") || '<p class="hinweis">Noch keine Momente – schreib den ersten!</p>'}
      <button type="button" class="knopf haupt breit" data-a="jbMomentNeu" data-x="${esc(sj)}">✍️ Mein schönster Moment</button>`],
  ];
}
VIEWS.jahrbuch = {
  render(p = {}) {
    const jg = jahrgaenge(), sj = jg.includes(p.sj) ? p.sj : jg[0], s = seiten(sj); J.seite = Math.max(0, Math.min(s.length - 1, J.seite));
    const offen = moderation() ? liste("jahrbuch_momente", (m) => !m.freigegeben) : [], meine = liste("jahrbuch_momente", (m) => m.von === S.ich?.id && !m.freigegeben);
    return kopf("📖 Jahrbuch") + (jg.length > 1 ? `<div class="wahlen" role="group" aria-label="Schuljahr">${jg.map((j) => `<button type="button" class="chip-wahl${j === sj ? " an" : ""}" aria-pressed="${j === sj}" data-a="jbJahr" data-x="${esc(j)}">${esc(j)}</button>`).join("")}</div>` : "")
      + `<div class="jb-buch" id="jbBuch"><div class="jb-reiter" role="tablist" aria-label="Seiten">${s.map(([t], i) => `<button type="button" role="tab" aria-selected="${i === J.seite}" class="${i === J.seite ? "an" : ""}" data-a="jbSeite" data-x="${i}">${t}</button>`).join("")}</div>
        <section class="jb-seite" role="tabpanel" aria-label="${esc(s[J.seite][0])}">${s[J.seite][1]}</section>
        <div class="jb-blaettern"><button type="button" class="knopf klein" data-a="jbSeite" data-x="${J.seite - 1}" ${J.seite ? "" : "disabled"} aria-label="Vorige Seite">‹ zurück</button><span>Seite ${J.seite + 1} / ${s.length}</span><button type="button" class="knopf klein" data-a="jbSeite" data-x="${J.seite + 1}" ${J.seite < s.length - 1 ? "" : "disabled"} aria-label="Nächste Seite">weiter ›</button></div></div>`
      + (meine.length ? `<div class="karte"><h3>⏳ Deine Momente warten auf Freigabe</h3>${meine.map((m) => `<p>„${esc(m.text)}“</p>`).join("")}</div>` : "")
      + (offen.length ? `<div class="karte"><h3>🧑‍💼 Momente freigeben (${offen.length})</h3><ul class="liste">${offen.map((m) => `<li><div class="fl"><b>„${esc(m.text)}“</b><div class="zeile-unter">${esc(name(m.von))} · ${esc(m.schuljahr)}</div></div><button type="button" class="knopf klein haupt" data-a="jbFrei" data-x="${esc(m.id)}">✅ Ins Buch</button><button type="button" class="knopf klein" data-a="jbWeg" data-x="${esc(m.id)}" aria-label="Moment löschen">🗑️</button></li>`).join("")}</ul></div>` : "");
  },
  nach(w) {
    bilderLaden(w);
    const b = w.querySelector(".jb-seite"); if (!b) return; let x0 = null;
    b.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    b.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 70) AKTIONEN.jbSeite(String(J.seite + (dx < 0 ? 1 : -1))); });
  },
};
AKTIONEN.jbSeite = (i) => { J.seite = Number(i); zeichne(); document.getElementById("jbBuch")?.scrollIntoView({ block: "nearest" }); };
AKTIONEN.jbJahr = (sj) => { J.seite = 0; zeige("jahrbuch", { sj }, { ersetzen: true }); };
AKTIONEN.jbMomentNeu = (sj) => blatt("✍️ Mein schönster Moment", `<p>Was war dein schönster Bachkreis-Moment ${esc(sj)}? Ein, zwei Sätze reichen. Die Leitung schaut kurz drüber, dann steht er im Jahrbuch – mit deinem Vornamen.</p>
  <div class="feld"><label for="jbText">Mein Moment</label><textarea id="jbText" rows="4" maxlength="500" placeholder="z. B. Als wir beim Konzert …"></textarea></div>
  <button type="button" class="knopf haupt breit" data-a="jbMomentSpeichern" data-x="${esc(sj)}">💛 Abschicken</button>`);
AKTIONEN.jbMomentSpeichern = async (sj) => {
  const text = String(document.getElementById("jbText")?.value || "").trim(); if (!text) return toast("Bitte kurz schreiben, was du erlebt hast");
  await speichere("jahrbuch_momente", { id: neueId(), schuljahr: sj, text, von: S.ich.id, freigegeben: moderation() });
  blattZu(); toast(moderation() ? "💛 Steht im Jahrbuch" : "💛 Danke! Die Leitung gibt ihn bald frei."); zeichne();
};
AKTIONEN.jbFrei = async (id) => { const m = hole("jahrbuch_momente", id); if (!m) return; await speichere("jahrbuch_momente", { ...m, freigegeben: true, freigegeben_von: S.ich.id }); toast("✅ Im Jahrbuch"); zeichne(); };
AKTIONEN.jbWeg = async (id) => { if (!confirm("Diesen Moment löschen?")) return; const m = hole("jahrbuch_momente", id); if (m) await speichere("jahrbuch_momente", { ...m, geloescht_am: new Date().toISOString() }); zeichne(); };
