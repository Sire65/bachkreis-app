// 🛍️ Bachkreis-Börse (0.47.0, wie KC „Helfen, Leihen & Börse“): 🎁 Biete · 🔎 Suche (Instrumente, Noten, Konzertkleidung, Zubehör)
// und 🙋 Helfer gesucht (Kuchen, Auf-/Abbau, Fahrdienst) mit „Ich helfe“ und freien Plätzen. Nur für Erwachsene (Kinder sehen die Börse nicht).
// Kontakt über eine Nachricht in der App – Telefonnummern stehen nicht in der Anzeige. Der Server prüft: ändern nur eigene Anzeigen,
// als Helfer nur sich selbst ein- oder austragen; Leitung kann aufräumen.
import { S, VIEWS, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte, datumKurz } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { BOERSE_ARTEN, BOERSE_KAT, BOERSE_STATUS, boerseDarf } from "../kern/schema.js";
import { klappe } from "../kern/klappen.js";
import { hochladen, bildVerkleinern, dateiUrl } from "../kern/dateien.js";

const B = { tab: "alle", kat: "", foto: null };
export const boerseFuerMich = () => boerseDarf(S.ich);
export const helferOffen = () => (boerseFuerMich() ? liste("boerse", (b) => b.art === "helfer" && b.status === "offen" && (b.helfer || []).length < (b.helfer_anzahl || 1)).length : 0);
const URLS = new Map();
function bilderLaden(w = document) {
  for (const img of w.querySelectorAll("img[data-bo-foto]")) {
    const f = img.dataset.boFoto;
    if (f.startsWith("bild:")) { img.src = f.slice(5); continue; }
    if (!URLS.has(f)) URLS.set(f, dateiUrl(f.replace(/^datei:/, "")).catch(() => ""));
    URLS.get(f).then((u) => { if (u) img.src = u; });
  }
}
const preisText = (b) => (b.art === "helfer" ? "" : b.verschenken ? "🎁 zu verschenken" : b.preis ? `${Number(b.preis).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €` : b.art === "biete" ? "VB" : "");
function karte(b) {
  const meine = b.von === S.ich?.id, frei = (b.helfer_anzahl || 1) - (b.helfer || []).length, dabei = (b.helfer || []).includes(S.ich?.id);
  return `<div class="karte bo-karte${b.status !== "offen" ? " bo-zu" : ""}">${b.foto ? `<img class="bo-foto" data-bo-foto="${esc(b.foto)}" alt="Foto: ${esc(b.titel)}">` : ""}
    <div class="bo-kopf"><span class="badge">${esc(BOERSE_ARTEN[b.art])}</span><span class="hinweis">${esc(BOERSE_KAT[b.kategorie] || "")}</span>${b.status !== "offen" ? `<span class="badge">${esc(BOERSE_STATUS[b.status])}</span>` : ""}</div>
    <h3>${esc(b.titel)}</h3>${b.text ? `<p>${esc(b.text).replace(/\n/g, "<br>")}</p>` : ""}
    <div class="bo-fuss"><b class="bo-preis">${esc(preisText(b))}</b><span class="hinweis">von ${esc(meine ? "dir" : name(b.von))}${b.frist ? ` · bis ${esc(datumKurz(b.frist))}` : ""}</span></div>
    ${b.art === "helfer" ? `<div class="bo-helfer"><div class="bo-plaetze" role="img" aria-label="${(b.helfer || []).length} von ${b.helfer_anzahl || 1} Plätzen belegt">${Array.from({ length: b.helfer_anzahl || 1 }, (_, i) => `<i class="${i < (b.helfer || []).length ? "an" : ""}"></i>`).join("")}</div>
      <small>${(b.helfer || []).length} von ${b.helfer_anzahl || 1} · ${(b.helfer || []).map((h) => esc(h === S.ich?.id ? "du" : name(h).split(" ")[0])).join(", ") || "noch niemand"}</small></div>` : ""}
    <div class="knopfreihe">${meine ? `<button type="button" class="knopf klein" data-a="boAendern" data-x="${esc(b.id)}">✏️ Ändern</button>${b.status === "offen" && b.art !== "helfer" ? `<button type="button" class="knopf klein" data-a="boStatus" data-x="${esc(b.id)}|reserviert">🟡 Reserviert</button>` : ""}${b.status !== "erledigt" ? `<button type="button" class="knopf klein" data-a="boStatus" data-x="${esc(b.id)}|erledigt">✅ Erledigt</button>` : `<button type="button" class="knopf klein" data-a="boStatus" data-x="${esc(b.id)}|offen">↺ Wieder offen</button>`}`
      : b.art === "helfer" ? (dabei ? `<button type="button" class="knopf klein" data-a="boHelfen" data-x="${esc(b.id)}">✕ Doch nicht</button>` : frei > 0 && b.status === "offen" ? `<button type="button" class="knopf haupt klein" data-a="boHelfen" data-x="${esc(b.id)}">🙋 Ich helfe</button>` : '<span class="badge b-gruen">✅ voll – danke!</span>')
      : ""}${!meine ? `<button type="button" class="knopf klein" data-a="chatMit" data-x="${esc(b.von)}">💬 Nachricht</button>` : ""}${!meine && hatRolle("admin", "leitung") ? `<button type="button" class="knopf klein" data-a="boEntfernen" data-x="${esc(b.id)}" aria-label="Anzeige entfernen">🗑️</button>` : ""}</div></div>`;
}
VIEWS.boerse = {
  render() {
    if (!boerseFuerMich()) return kopf("🛍️ Börse") + '<div class="leer">Die Börse ist für Eltern, Lehrkräfte und alle Erwachsenen im Bachkreis.</div>';
    const alle = liste("boerse").sort((a, b) => (a.status === "offen" ? 0 : 1) - (b.status === "offen" ? 0 : 1) || String(b.erstellt_am || b.id).localeCompare(String(a.erstellt_am || a.id)));
    const l = alle.filter((b) => (B.tab === "alle" || (B.tab === "meine" ? b.von === S.ich.id : b.art === B.tab)) && (!B.kat || b.kategorie === B.kat));
    const tabs = [["alle", "Alle"], ["biete", "🎁 Biete"], ["suche", "🔎 Suche"], ["helfer", "🙋 Helfer"], ["meine", "🙋 Meine"]];
    const offen = l.filter((b) => b.status !== "erledigt"), fertig = l.filter((b) => b.status === "erledigt");
    return kopf("🛍️ Bachkreis-Börse", '<button type="button" class="knopf haupt klein" data-a="boNeu">＋ Anzeige</button>')
      + `<p class="hinweis">Gebrauchte Instrumente, Noten und Konzertkleidung weitergeben – und Hilfe für Konzerte und Fahrten finden.</p>
      <div class="wahlen" role="group" aria-label="Art">${tabs.map(([k, t]) => `<button type="button" class="chip-wahl${B.tab === k ? " an" : ""}" aria-pressed="${B.tab === k}" data-a="boTab" data-x="${k}">${t}</button>`).join("")}</div>
      <div class="feld"><select id="boKat" data-c="boKat" aria-label="Bereich"><option value="">Alle Bereiche</option>${Object.entries(BOERSE_KAT).map(([k, t]) => `<option value="${k}" ${B.kat === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="bo-raster">${offen.map(karte).join("") || '<div class="leer">Gerade nichts – oben ＋ Anzeige.</div>'}</div>
      ${fertig.length ? klappe("bo_erledigt", "✅ Erledigt", `<div class="bo-raster">${fertig.map(karte).join("")}</div>`, { zahl: fertig.length }) : ""}`;
  },
  nach(w) { bilderLaden(w); },
};
AKTIONEN.boTab = (k) => { B.tab = k; zeichne(); };
AKTIONEN.boKat = (v) => { B.kat = v; zeichne(); };
function boForm(b = null, art = "biete") {
  B.foto = b?.foto || null; const a = b?.art || art;
  blatt(b ? "✏️ Anzeige ändern" : "＋ Neue Anzeige", `<form id="boForm">
    <div class="umschalter" role="group" aria-label="Art">${Object.entries(BOERSE_ARTEN).map(([k, t]) => `<button type="button" class="${a === k ? "an" : ""}" aria-pressed="${a === k}" data-a="boArtWahl" data-x="${k}">${t}</button>`).join("")}</div><input type="hidden" name="art" value="${a}">
    <div class="feld"><label for="boKatF">Bereich</label><select id="boKatF" name="kategorie">${Object.entries(BOERSE_KAT).filter(([k]) => (a === "helfer" ? ["kuchen", "aufbau", "fahrdienst", "sonst"] : ["instrument", "noten", "kleidung", "zubehoer", "sonst"]).includes(k)).map(([k, t]) => `<option value="${k}" ${b?.kategorie === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="feld"><label for="boTitel">${a === "helfer" ? "Wobei brauchst du Hilfe?" : a === "suche" ? "Was suchst du?" : "Was bietest du an?"}</label><input id="boTitel" name="titel" maxlength="100" required value="${esc(b?.titel || "")}"></div>
    <div class="feld"><label for="boText">Beschreibung</label><textarea id="boText" name="text" rows="3" maxlength="1500">${esc(b?.text || "")}</textarea></div>
    ${a === "helfer" ? `<div class="feld"><label for="boAnz">Wie viele Helfer?</label><input id="boAnz" name="helfer_anzahl" type="number" min="1" max="50" value="${esc(b?.helfer_anzahl || 4)}"></div><div class="feld"><label for="boFrist">Bis wann eintragen?</label><input id="boFrist" name="frist" type="date" value="${esc(b?.frist || "")}"></div>`
      : `<div class="feld"><label for="boPreis">Preis (€, leer = Verhandlungssache)</label><input id="boPreis" name="preis" type="number" min="0" step="0.5" value="${esc(b?.preis ?? "")}"></div>${a === "biete" ? `<label class="schalter"><span><b>🎁 Zu verschenken</b></span><input type="checkbox" name="verschenken" ${b?.verschenken ? "checked" : ""}></label>` : ""}
        <div class="feld"><label for="boFoto">📷 Foto (freiwillig)</label><input id="boFoto" type="file" accept="image/*" data-c="boFotoWahl"><small id="boFotoOk" class="hinweis">${B.foto ? "✅ Foto angehängt" : ""}</small></div>`}
    </form><p class="hinweis">Kontakt läuft über eine Nachricht in der App – deine Telefonnummer steht nicht in der Anzeige.</p>
    <button type="button" class="knopf haupt breit" data-a="boSpeichern" data-x="${esc(b?.id || "")}">💾 ${b ? "Speichern" : "Veröffentlichen"}</button>${b ? `<button type="button" class="knopf rot breit" data-a="boLoeschen" data-x="${esc(b.id)}">🗑️ Anzeige löschen</button>` : ""}`);
}
AKTIONEN.boNeu = () => boForm(null, B.tab === "helfer" || B.tab === "suche" ? B.tab : "biete");
AKTIONEN.boAendern = (id) => boForm(hole("boerse", id));
AKTIONEN.boArtWahl = (a) => { const f = document.getElementById("boForm"); const t = f ? formWerte(f) : {}; boForm(null, a); const g = document.getElementById("boForm"); if (g) { g.titel.value = t.titel || ""; g.text.value = t.text || ""; } };
AKTIONEN.boFotoWahl = async (_, el) => {
  const f = el.files?.[0]; if (!f) return; const ok = document.getElementById("boFotoOk"); if (ok) ok.textContent = "⏳ wird hochgeladen …";
  try { const r = await hochladen(await bildVerkleinern(f, 1400), { name: f.name }); B.foto = "datei:" + r.id; if (ok) ok.textContent = "✅ Foto angehängt"; } catch (e) { B.foto = null; if (ok) ok.textContent = "⚠️ " + e.message; }
};
AKTIONEN.boSpeichern = async (id) => {
  const f = formWerte(document.getElementById("boForm")); if (!String(f.titel || "").trim()) return toast("Bitte kurz beschreiben, worum es geht");
  const alt = id ? hole("boerse", id) : null;
  await speichere("boerse", { ...(alt || { id: neueId(), von: S.ich.id, status: "offen", helfer: [] }), art: f.art, kategorie: f.kategorie, titel: f.titel.trim(), text: f.text?.trim() || null, preis: f.preis === "" || f.preis == null ? null : Number(f.preis), verschenken: !!f.verschenken, foto: B.foto, helfer_anzahl: f.helfer_anzahl ? Number(f.helfer_anzahl) : null, frist: f.frist || null });
  blattZu(); toast(alt ? "💾 Gespeichert" : "🛍️ Anzeige ist online"); zeichne();
};
AKTIONEN.boStatus = async (x) => { const [id, st] = String(x).split("|"), b = hole("boerse", id); if (!b) return; await speichere("boerse", { ...b, status: st }); toast(BOERSE_STATUS[st]); zeichne(); };
AKTIONEN.boHelfen = async (id) => {
  const b = hole("boerse", id); if (!b) return; const s = new Set(b.helfer || []), dabei = s.has(S.ich.id);
  if (dabei) s.delete(S.ich.id); else s.add(S.ich.id);
  try { await speichere("boerse", { ...b, helfer: [...s] }); toast(dabei ? "Ausgetragen" : "🙋 Danke! Du bist eingetragen."); } catch (e) { toast("⚠️ " + e.message); }
  zeichne();
};
AKTIONEN.boLoeschen = async (id) => { if (!confirm("Anzeige löschen?")) return; const b = hole("boerse", id); if (b) await speichere("boerse", { ...b, geloescht_am: new Date().toISOString() }); blattZu(); zeichne(); };
AKTIONEN.boEntfernen = async (id) => { if (!confirm("Diese Anzeige für alle entfernen?")) return; const b = hole("boerse", id); if (b) await speichere("boerse", { ...b, geloescht_am: new Date().toISOString() }); zeichne(); };
