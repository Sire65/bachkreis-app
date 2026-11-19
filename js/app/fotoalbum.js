// 📷 Fotoalbum (0.40.0, wie KC-CLUB-FOTOALBUM, -FOTO-ALBEN, -FOTO-PLATZ, Diashow, Papierkorb, -FOTO-ENDGUELTIG):
// Alben für alle im Bachkreis oder nur für das Team, Fotos von Konzerten, Fahrten und Proben. Hochladen dürfen Erwachsene (Team und Eltern),
// Kinder schauen an. Fotos werden vor dem Hochladen verkleinert (spart Speicher im kostenlosen Tarif).
// 🔐 Wer auf einem Foto markiert ist, braucht die Foto-Einwilligung „intern (App)“ – der Server lehnt sonst ab. Vor dem Hochladen zeigt die App,
// welche Kinder des Orchesters NICHT gezeigt werden dürfen. Papierkorb: 30 Tage, endgültig löschen jederzeit.
import { S, VIEWS, db, zeige, zeichne, kopf, name, hatRolle, istVerwalter } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { FOTO_SICHT, FOTO_HOCHLADEN, FOTO_PAPIERKORB_TAGE } from "../kern/schema.js";
import { einwilligung } from "../kern/logik.js";
import { hochladen, bildVerkleinern, dateiUrl } from "../kern/dateien.js";

const ich = () => S.ich?.id;
const moderiert = () => hatRolle("admin", "leitung");
export const darfHochladen = () => hatRolle(...FOTO_HOCHLADEN);
const meinFoto = (f) => f.von === ich() || moderiert();
const sichtbar = (a) => a.sichtbar !== "verwaltung" || istVerwalter() || a.von === ich();
const alben = () => liste("fotoalben", sichtbar).sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
const fotosVon = (aid) => liste("fotos", (f) => f.album_id === aid && !f.papierkorb_am).sort((a, b) => String(a.aufgenommen_am || "").localeCompare(String(b.aufgenommen_am || "")));
const papierkorb = () => liste("fotos", (f) => f.papierkorb_am && meinFoto(f) && Date.parse(f.papierkorb_am) > Date.now() - FOTO_PAPIERKORB_TAGE * 86400000);
// Bild-Adresse: Beispielbilder liegen als Datei bei (bild:…), echte Fotos im geschützten Speicher (datei:…)
const URLS = new Map();
async function bildUrl(f) {
  if (!f?.datei) return "";
  if (f.datei.startsWith("bild:")) return f.datei.slice(5);
  if (!URLS.has(f.datei)) URLS.set(f.datei, dateiUrl(f.datei.replace(/^datei:/, "")).catch(() => ""));
  return URLS.get(f.datei);
}
function bilderLaden(w = document) {
  w.querySelectorAll("img[data-foto]:not([src])").forEach(async (img) => { const u = await bildUrl(hole("fotos", img.dataset.foto)); if (u) img.src = u; else img.alt = "Foto nicht ladbar"; });
}

VIEWS.fotoalbum = {
  render() {
    const l = alben(), pk = papierkorb().length;
    return kopf("📷 Fotoalbum", `${pk ? `<button class="knopf klein" data-a="fotoPapierkorb" aria-label="Papierkorb">🗑️ ${pk}</button>` : ""}${istVerwalter() ? '<button class="knopf haupt klein" data-a="albumNeu">＋ Album</button>' : ""}`)
      + `<p class="hinweis">Fotos von Konzerten, Fahrten und Proben. 🔐 Gezeigt werden nur Kinder mit Foto-Einwilligung.</p>`
      + (l.length ? `<div class="alben">${l.map((a) => { const fs = fotosVon(a.id), titel = hole("fotos", a.titelbild) || fs[0];
        return `<button type="button" class="album-kachel" data-a="albumAuf" data-x="${esc(a.id)}"><span class="album-bild">${titel ? `<img data-foto="${esc(titel.id)}" alt="">` : '<span aria-hidden="true">📷</span>'}</span>
          <b>${esc(a.titel)}</b><small>${fs.length} ${fs.length === 1 ? "Foto" : "Fotos"}${a.datum ? ` · ${esc(new Date(a.datum + "T12:00").toLocaleDateString("de-DE", { month: "short", year: "numeric" }))}` : ""}${a.sichtbar === "verwaltung" ? " · 🔒 Team" : ""}</small></button>`; }).join("")}</div>`
        : `<div class="leer">Noch keine Alben.${istVerwalter() ? '<br><button class="knopf haupt" data-a="albumNeu">＋ Erstes Album anlegen</button>' : ""}</div>`);
  },
  nach(w) { bilderLaden(w); },
};
AKTIONEN.albumAuf = (id) => zeige("fotoalbumAlbum", { id });
VIEWS.fotoalbumAlbum = {
  render({ id }) {
    const a = hole("fotoalben", id); if (!a || !sichtbar(a)) return kopf("📷 Fotoalbum") + '<div class="leer">Album nicht gefunden.</div>';
    const fs = fotosVon(id), darf = darfHochladen(), eigen = a.von === ich() || moderiert();
    return kopf(`📷 ${esc(a.titel)}`, `${fs.length ? '<button class="knopf klein" data-a="diashow" aria-label="Diashow abspielen">▶️ Diashow</button>' : ""}${eigen ? `<button class="knopf klein" data-a="albumBearbeiten" data-x="${esc(id)}" aria-label="Album bearbeiten">✏️</button>` : ""}`)
      + `${a.beschreibung ? `<p>${esc(a.beschreibung)}</p>` : ""}<p class="hinweis">${fs.length} ${fs.length === 1 ? "Foto" : "Fotos"} · ${esc(FOTO_SICHT[a.sichtbar] || FOTO_SICHT.alle)}</p>`
      + (darf ? `<label class="knopf haupt foto-hoch">＋ Fotos hinzufügen<input type="file" accept="image/*" multiple data-c="fotoWahl" data-x="${esc(id)}" class="nur-sr"></label>` : "")
      + (fs.length ? `<div class="foto-raster">${fs.map((f, i) => `<button type="button" class="foto-kachel" data-a="fotoGross" data-x="${i}" aria-label="${esc(f.titel || `Foto ${i + 1}`)} groß ansehen"><img data-foto="${esc(f.id)}" alt="" loading="lazy"></button>`).join("")}</div>` : '<div class="leer">Noch keine Fotos in diesem Album.</div>');
  },
  nach(w) { bilderLaden(w); },
};

// ---------- Album anlegen / bearbeiten ----------
function albumForm(a = {}) {
  blatt(a.id ? "✏️ Album bearbeiten" : "＋ Neues Album", `<div id="albumForm" class="vl-form">
    <div class="feld"><label for="alTitel">Name *</label><input id="alTitel" name="titel" maxlength="100" value="${esc(a.titel || "")}" placeholder="z. B. Herbstkonzert 2026"></div>
    <div class="feld"><label for="alDatum">Datum</label><input id="alDatum" name="datum" type="date" value="${esc(a.datum || new Date().toISOString().slice(0, 10))}"></div>
    <div class="feld"><label for="alSicht">Wer sieht es?</label><select id="alSicht" name="sichtbar">${Object.entries(FOTO_SICHT).map(([k, t]) => `<option value="${k}" ${k === (a.sichtbar || "alle") ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
    <div class="feld"><label for="alBesch">Beschreibung</label><textarea id="alBesch" name="beschreibung" rows="2" maxlength="500">${esc(a.beschreibung || "")}</textarea></div>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="albumSpeichern" data-x="${esc(a.id || "")}">💾 Speichern</button>${a.id ? `<button type="button" class="knopf rot" data-a="albumWeg" data-x="${esc(a.id)}">🗑️ Album löschen</button>` : ""}</div></div>`);
}
AKTIONEN.albumNeu = () => albumForm();
AKTIONEN.albumBearbeiten = (id) => albumForm(hole("fotoalben", id));
AKTIONEN.albumSpeichern = async (id) => {
  const f = formWerte(document.getElementById("albumForm")); if (!String(f.titel || "").trim()) return toast("Bitte einen Namen eingeben.");
  const z = await speichere("fotoalben", { ...(id ? hole("fotoalben", id) : { id: neueId(), von: ich() }), titel: f.titel.trim(), datum: f.datum || null, sichtbar: f.sichtbar, beschreibung: f.beschreibung || null });
  blattZu(); toast("📷 Album gespeichert"); zeige("fotoalbumAlbum", { id: z?.id || id }, { ersetzen: !!id });
};
AKTIONEN.albumWeg = async (id) => {
  const n = fotosVon(id).length; if (!(await frage(`Album löschen?${n ? `\n\nDie ${n} Fotos darin kommen in den Papierkorb (${FOTO_PAPIERKORB_TAGE} Tage).` : ""}`))) return;
  for (const f of fotosVon(id)) await speichere("fotos", { ...f, papierkorb_am: new Date().toISOString() });
  await speichere("fotoalben", { ...hole("fotoalben", id), geloescht_am: new Date().toISOString() }); blattZu(); zeige("fotoalbum");
};

// ---------- Hochladen: erst „Wer ist zu sehen?“ (nur Kinder mit Einwilligung), dann verkleinern und hochladen ----------
const HL = { album: null, dateien: [], personen: new Set() };
const kinderMitStatus = () => liste("personen", (p) => p.typ === "schueler" && p.status === "aktiv").map((p) => ({ p, ok: einwilligung(db, p.id, "foto_intern") })).sort((a, b) => name(a.p).localeCompare(name(b.p), "de"));
AKTIONEN.fotoWahl = (_, el) => {
  const dateien = [...(el.files || [])].filter((f) => /^image\//.test(f.type)).slice(0, 30); el.value = "";
  if (!dateien.length) return;
  Object.assign(HL, { album: el.dataset.x, dateien, personen: new Set() }); hochladenBlatt();
};
function hochladenBlatt() {
  const k = kinderMitStatus(), nein = k.filter((x) => x.ok !== "ja");
  blatt(`📷 ${HL.dateien.length} ${HL.dateien.length === 1 ? "Foto" : "Fotos"} hochladen`, `<div class="karte foto-warnung"><b>🔐 Bitte vorher prüfen</b><p>Diese Kinder dürfen <b>nicht</b> in der App gezeigt werden (keine oder keine gültige Foto-Einwilligung): ${nein.length ? esc(nein.slice(0, 40).map((x) => name(x.p)).join(", ")) + (nein.length > 40 ? ` … (+${nein.length - 40})` : "") : "– alle haben eingewilligt –"}</p></div>
    <fieldset class="feld"><legend>Wer ist zu sehen? (freiwillig – nur Kinder mit Einwilligung wählbar)</legend><div class="foto-personen">${k.filter((x) => x.ok === "ja").map(({ p }) => `<label><input type="checkbox" data-c="fotoPerson" value="${esc(p.id)}" ${HL.personen.has(p.id) ? "checked" : ""}> ${esc(name(p))}</label>`).join("") || '<p class="hinweis">Niemand mit Einwilligung.</p>'}</div></fieldset>
    <p class="hinweis">💾 Die Fotos werden vor dem Hochladen verkleinert (ca. 1600 Pixel) – das spart Speicher.</p>
    <button type="button" class="knopf haupt breit" data-a="fotoHochladen">⬆️ Jetzt hochladen</button><div id="fotoFortschritt" class="hinweis" aria-live="polite"></div>`);
}
AKTIONEN.fotoPerson = (v, el) => { if (el.checked) HL.personen.add(v); else HL.personen.delete(v); };
AKTIONEN.fotoHochladen = async () => {
  const st = document.getElementById("fotoFortschritt"); let ok = 0;
  for (const [i, d] of HL.dateien.entries()) {
    if (st) st.textContent = `⬆️ ${i + 1} von ${HL.dateien.length} …`;
    try {
      const klein = await bildVerkleinern(d, 1600), r = await hochladen(klein, { name: d.name, art: "bild" });
      await speichere("fotos", { id: neueId(), album_id: HL.album, datei: "datei:" + r.id, titel: null, von: ich(), personen: [...HL.personen], aufgenommen_am: new Date(d.lastModified || Date.now()).toISOString(), papierkorb_am: null });
      ok++;
    } catch (e) { toast(/EINWILLIGUNG/.test(e.message) ? "⚠️ Ein markiertes Kind hat keine Foto-Einwilligung – nicht hochgeladen." : "⚠️ " + e.message); }
  }
  blattZu(); toast(`📷 ${ok} ${ok === 1 ? "Foto" : "Fotos"} hochgeladen`); zeichne();
};

// ---------- Großansicht, Diashow ----------
const G = { i: 0, takt: 0 };
const aktuelleFotos = () => fotosVon(S.params?.id);
AKTIONEN.fotoGross = (i) => { G.i = Number(i) || 0; grossZeigen(); };
async function grossZeigen(dia = false) {
  const fs = aktuelleFotos(), f = fs[G.i]; if (!f) return;
  let o = document.getElementById("fotoGross");
  if (!o) {
    o = document.createElement("div"); o.id = "fotoGross"; o.className = "foto-gross"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    document.body.appendChild(o); document.addEventListener("keydown", grossTaste);
    let x0 = null; o.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    o.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) AKTIONEN.fotoWeiter(dx < 0 ? 1 : -1); });
  }
  o.setAttribute("aria-label", f.titel || `Foto ${G.i + 1} von ${fs.length}`);
  o.innerHTML = `<img alt="${esc(f.titel || `Foto ${G.i + 1}`)}" id="fotoGrossBild"><div class="foto-gross-text"><b>${esc(f.titel || "")}</b><small>${G.i + 1} / ${fs.length} · ${esc(new Date(f.aufgenommen_am || Date.now()).toLocaleDateString("de-DE"))}${f.von ? ` · von ${esc(name(f.von))}` : ""}${(f.personen || []).length ? ` · 👥 ${esc(f.personen.map((p) => hole("personen", p)?.vorname || "").filter(Boolean).join(", "))}` : ""}</small></div>
    <div class="foto-gross-leiste"><button type="button" data-a="fotoZu" aria-label="Schließen">✕</button><button type="button" data-a="fotoWeiter" data-x="-1" aria-label="Voriges Foto">‹</button>
      ${dia || G.takt ? `<button type="button" data-a="diaPause" aria-label="${G.takt ? "Diashow anhalten" : "Diashow weiter"}">${G.takt ? "⏸" : "▶️"}</button>` : ""}<button type="button" data-a="fotoWeiter" data-x="1" aria-label="Nächstes Foto">›</button>
      <button type="button" data-a="fotoTeilen" aria-label="Speichern oder teilen">⬇️</button>${meinFoto(f) ? `<button type="button" data-a="fotoBearbeiten" aria-label="Bildunterschrift und Personen">✏️</button><button type="button" data-a="fotoPapierkorbRein" aria-label="In den Papierkorb">🗑️</button>` : ""}</div>`;
  const u = await bildUrl(f); const img = document.getElementById("fotoGrossBild"); if (img && u) img.src = u;
}
function grossTaste(e) { if (!document.getElementById("fotoGross")) return; if (e.key === "ArrowRight") AKTIONEN.fotoWeiter(1); else if (e.key === "ArrowLeft") AKTIONEN.fotoWeiter(-1); else if (e.key === "Escape") AKTIONEN.fotoZu(); }
AKTIONEN.fotoWeiter = (r) => { const n = aktuelleFotos().length; if (!n) return; G.i = (G.i + Number(r) + n) % n; grossZeigen(); };
AKTIONEN.fotoZu = () => { clearInterval(G.takt); G.takt = 0; document.getElementById("fotoGross")?.remove(); document.removeEventListener("keydown", grossTaste); };
AKTIONEN.diashow = () => { G.i = 0; clearInterval(G.takt); G.takt = setInterval(() => AKTIONEN.fotoWeiter(1), 4000); grossZeigen(true); try { document.getElementById("fotoGross")?.requestFullscreen?.(); } catch {} };
AKTIONEN.diaPause = () => { if (G.takt) { clearInterval(G.takt); G.takt = 0; } else G.takt = setInterval(() => AKTIONEN.fotoWeiter(1), 4000); grossZeigen(true); };
AKTIONEN.fotoTeilen = async () => {
  const f = aktuelleFotos()[G.i]; if (!f) return;
  try { const u = await bildUrl(f), b = await (await fetch(u)).blob(), datei = new File([b], `${(f.titel || "Bachkreis-Foto").replace(/[^\p{L}\p{N} _-]/gu, "")}.${b.type.includes("svg") ? "svg" : "jpg"}`, { type: b.type });
    if (navigator.canShare?.({ files: [datei] })) { await navigator.share({ files: [datei] }); return; }
    const a = document.createElement("a"); a.href = u; a.download = datei.name; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { if (e?.name !== "AbortError") toast("⚠️ Speichern ging nicht"); }
};
AKTIONEN.fotoBearbeiten = () => {
  const f = aktuelleFotos()[G.i]; if (!f) return; HL.personen = new Set(f.personen || []); HL.bearb = f.id;
  const k = kinderMitStatus().filter((x) => x.ok === "ja" || HL.personen.has(x.p.id));
  blatt("✏️ Foto", `<div class="feld"><label for="fotoTitel">Bildunterschrift</label><input id="fotoTitel" maxlength="200" value="${esc(f.titel || "")}"></div>
    <fieldset class="feld"><legend>Wer ist zu sehen? (nur mit Foto-Einwilligung)</legend><div class="foto-personen">${k.map(({ p, ok }) => `<label><input type="checkbox" data-c="fotoPerson" value="${esc(p.id)}" ${HL.personen.has(p.id) ? "checked" : ""}> ${esc(name(p))}${ok !== "ja" ? " ⚠️ keine Einwilligung mehr" : ""}</label>`).join("") || '<p class="hinweis">Niemand mit Einwilligung.</p>'}</div></fieldset>
    <button type="button" class="knopf haupt breit" data-a="fotoSpeichern">💾 Speichern</button>`);
};
AKTIONEN.fotoSpeichern = async () => {
  const f = hole("fotos", HL.bearb); if (!f) return;
  try { await speichere("fotos", { ...f, titel: document.getElementById("fotoTitel")?.value || null, personen: [...HL.personen] }); blattZu(); grossZeigen(); toast("💾 Gespeichert"); }
  catch (e) { toast(/EINWILLIGUNG/.test(e.message) ? "⚠️ Ein markiertes Kind hat keine Foto-Einwilligung." : "⚠️ " + e.message); }
};
AKTIONEN.fotoPapierkorbRein = async () => {
  const f = aktuelleFotos()[G.i]; if (!f || !(await frage(`Foto in den Papierkorb legen?\n\nDort bleibt es ${FOTO_PAPIERKORB_TAGE} Tage und lässt sich zurückholen.`))) return;
  await speichere("fotos", { ...f, papierkorb_am: new Date().toISOString() }); AKTIONEN.fotoZu(); toast("🗑️ Im Papierkorb"); zeichne();
};
AKTIONEN.fotoPapierkorb = () => zeige("fotoPapierkorb");
VIEWS.fotoPapierkorb = {
  render() {
    const l = papierkorb();
    return kopf("🗑️ Papierkorb · Fotos") + `<p class="hinweis">Fotos bleiben ${FOTO_PAPIERKORB_TAGE} Tage hier, dann sind sie endgültig weg.</p>`
      + (l.length ? `<div class="karte"><ul class="liste">${l.map((f) => { const rest = Math.max(0, FOTO_PAPIERKORB_TAGE - Math.floor((Date.now() - Date.parse(f.papierkorb_am)) / 86400000));
        return `<li><img class="foto-mini" data-foto="${esc(f.id)}" alt=""><div class="fl"><b>${esc(f.titel || "Foto")}</b><div class="zeile-unter">${esc(hole("fotoalben", f.album_id)?.titel || "")} · noch ${rest} Tage</div></div>
          <button type="button" class="knopf klein" data-a="fotoZurueck" data-x="${esc(f.id)}">↩️</button><button type="button" class="knopf klein rot" data-a="fotoEndgueltig" data-x="${esc(f.id)}" aria-label="Endgültig löschen">🗑️</button></li>`; }).join("")}</ul></div>` : '<div class="leer">Der Papierkorb ist leer.</div>');
  },
  nach(w) { bilderLaden(w); },
};
AKTIONEN.fotoZurueck = async (id) => { const f = hole("fotos", id); if (f) { await speichere("fotos", { ...f, papierkorb_am: null }); toast("↩️ Wieder im Album"); zeichne(); } };
AKTIONEN.fotoEndgueltig = async (id) => { const f = hole("fotos", id); if (f && (await frage("Foto endgültig löschen? Das lässt sich nicht rückgängig machen."))) { await speichere("fotos", { ...f, geloescht_am: new Date().toISOString() }); toast("🗑️ Endgültig gelöscht"); zeichne(); } };
document.addEventListener("bk-ansicht", () => { if (S.view !== "fotoalbumAlbum") AKTIONEN.fotoZu(); });
