// 📍 Standorte (0.46.0, wie KC „Standorte“ / „Standort mit Entfernung“ / „Wo bin ich“): Probenorte, Auftrittsorte, Treffpunkte mit Adresse,
// 🧭 Anfahrt (Karten-App), 🗺️ Karte (OpenStreetMap) und 📏 Entfernung von hier. Die Liste pflegt die Leitung (konfig standorte, kein neues Schema).
// Die eigene Position bleibt auf dem Gerät – sie wird nur für die Entfernung benutzt und nie gespeichert oder verschickt.
import { VIEWS, zeige, zeichne, kopf, istLeitung } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte } from "../kern/ui.js";
import { konfig, konfigSetzen } from "../kern/daten.js";

export const STANDORT_ARTEN = { probe: "🎻 Probenort", auftritt: "🎭 Auftrittsort", treffpunkt: "🚌 Treffpunkt", unterkunft: "🛏️ Unterkunft", sonst: "📍 Sonstiges" };
export const standorte = () => (Array.isArray(konfig().standorte) ? konfig().standorte : []);
const P = { pos: null, fehler: null, laedt: false };
// Entfernung (Luftlinie) nach Haversine – in km
export function entfernungKm(a, b) {
  if (![a?.lat, a?.lon, b?.lat, b?.lon].every((x) => Number.isFinite(Number(x)))) return null;
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
export const kmText = (km) => (km == null ? "" : km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`);
const ziel = (s) => (Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon)) ? `${s.lat},${s.lon}` : s.adresse || s.name);
export const routeLink = (s) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ziel(s))}`;
export const karteLink = (s) => (Number.isFinite(Number(s.lat)) ? `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(s.adresse || s.name)}`);
// Termin-Ort → passender Standort (gleicher Name am Anfang, z. B. „PZ / Musiksaal“)
export const standortZuOrt = (ort) => { const o = String(ort || "").toLowerCase().trim(); return o ? standorte().find((s) => o.startsWith(String(s.name).toLowerCase()) || String(s.name).toLowerCase().startsWith(o)) || null : null; };

function positionHolen() {
  if (!navigator.geolocation) { P.fehler = "Standort wird auf diesem Gerät nicht unterstützt"; return zeichne(); }
  P.laedt = true; zeichne();
  navigator.geolocation.getCurrentPosition((pos) => { P.pos = { lat: pos.coords.latitude, lon: pos.coords.longitude, genau: Math.round(pos.coords.accuracy) }; P.fehler = null; P.laedt = false; zeichne(); },
    () => { P.fehler = "Standort nicht verfügbar – bitte die Freigabe im Browser prüfen"; P.laedt = false; zeichne(); }, { enableHighAccuracy: true, timeout: 10000 });
}
VIEWS.standorte = {
  render() {
    const l = standorte().map((s, i) => ({ s, i, km: P.pos ? entfernungKm(P.pos, s) : null })).sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    const naechster = l.find((x) => x.km != null);
    return kopf("📍 Standorte", istLeitung() ? '<button type="button" class="knopf haupt klein" data-a="soNeu">＋ Ort</button>' : "")
      + `<div class="karte so-wo"><h3>🧭 Wo bin ich?</h3>${P.pos ? `<p>Du bist hier: <a href="https://www.openstreetmap.org/?mlat=${P.pos.lat}&mlon=${P.pos.lon}#map=17/${P.pos.lat}/${P.pos.lon}" target="_blank" rel="noopener">🗺️ auf der Karte zeigen</a> <small class="hinweis">(± ${P.pos.genau} m)</small></p>${naechster ? `<p>Am nächsten: <b>${esc(naechster.s.name)}</b> – ${kmText(naechster.km)} Luftlinie</p>` : ""}`
        : `<p class="hinweis">${P.fehler ? "⚠️ " + esc(P.fehler) : "Zeigt die Entfernung zu jedem Ort. Deine Position bleibt auf dem Gerät und wird nicht gespeichert."}</p>`}
        <button type="button" class="knopf${P.pos ? "" : " haupt"}" data-a="soPosition">${P.laedt ? "⏳ wird ermittelt …" : P.pos ? "🔄 Neu bestimmen" : "📍 Meine Position bestimmen"}</button></div>`
      + (l.length ? Object.entries(STANDORT_ARTEN).map(([art, titel]) => { const g = l.filter((x) => (x.s.art || "sonst") === art); return g.length ? `<h3 class="so-art">${titel}</h3>${g.map(({ s, i, km }) => `<div class="karte so-ort">
          <div class="so-kopf"><b>${esc(s.name)}</b>${km != null ? `<span class="badge">${kmText(km)}</span>` : ""}</div>${s.adresse ? `<div class="hinweis">${esc(s.adresse)}</div>` : ""}${s.hinweis ? `<p>${esc(s.hinweis)}</p>` : ""}
          <div class="knopfreihe"><a class="knopf klein haupt" href="${esc(routeLink(s))}" target="_blank" rel="noopener">🧭 Anfahrt</a><a class="knopf klein" href="${esc(karteLink(s))}" target="_blank" rel="noopener">🗺️ Karte</a>${istLeitung() ? `<button type="button" class="knopf klein" data-a="soAendern" data-x="${i}">✏️</button>` : ""}</div></div>`).join("")}` : ""; }).join("")
        : `<div class="leer">Noch keine Orte eingetragen.${istLeitung() ? " Oben ＋ Ort." : ""}</div>`);
  },
};
AKTIONEN.soPosition = () => positionHolen();
function soForm(i = null) {
  const s = i != null ? standorte()[i] || {} : {};
  blatt(i != null ? "✏️ Ort ändern" : "＋ Neuer Ort", `<form id="soForm"><div class="feld"><label for="soName">Name</label><input id="soName" name="name" required maxlength="80" value="${esc(s.name || "")}" placeholder="z. B. PZ / Musiksaal"></div>
    <div class="feld"><label for="soArt">Art</label><select id="soArt" name="art">${Object.entries(STANDORT_ARTEN).map(([k, t]) => `<option value="${k}" ${(s.art || "probe") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="feld"><label for="soAdr">Adresse</label><input id="soAdr" name="adresse" maxlength="160" value="${esc(s.adresse || "")}" placeholder="Straße Nr., PLZ Ort"></div>
    <div class="feld"><label for="soHinweis">Hinweis (Eingang, Parken …)</label><input id="soHinweis" name="hinweis" maxlength="200" value="${esc(s.hinweis || "")}"></div>
    <div class="feld"><label>Genaue Position (für die Entfernung)</label><div class="knopfreihe"><input name="lat" inputmode="decimal" aria-label="Breitengrad" placeholder="Breite, z. B. 51.62" value="${esc(s.lat ?? "")}"><input name="lon" inputmode="decimal" aria-label="Längengrad" placeholder="Länge, z. B. 7.64" value="${esc(s.lon ?? "")}"></div>
      <button type="button" class="knopf klein" data-a="soHier">📍 Ich stehe gerade dort – übernehmen</button></div></form>
    <div class="knopfreihe"><button type="button" class="knopf haupt" data-a="soSpeichern" data-x="${i ?? ""}">💾 Speichern</button>${i != null ? `<button type="button" class="knopf rot" data-a="soLoeschen" data-x="${i}">🗑️ Löschen</button>` : ""}</div>`);
}
AKTIONEN.soNeu = () => soForm();
AKTIONEN.soAendern = (i) => soForm(Number(i));
AKTIONEN.soHier = () => navigator.geolocation?.getCurrentPosition((pos) => { const f = document.getElementById("soForm"); if (!f) return; f.lat.value = pos.coords.latitude.toFixed(5); f.lon.value = pos.coords.longitude.toFixed(5); toast("📍 Position übernommen"); }, () => toast("Standort nicht verfügbar"), { enableHighAccuracy: true, timeout: 10000 });
AKTIONEN.soSpeichern = async (i) => {
  if (!istLeitung()) return toast("🔒 Nur für die Leitung");
  const f = formWerte(document.getElementById("soForm")), name = String(f.name || "").trim(); if (!name) return toast("Bitte einen Namen eingeben");
  const zahl = (v) => { const n = Number(String(v || "").replace(",", ".")); return String(v || "").trim() && Number.isFinite(n) ? n : null; };
  const neu = { name, art: f.art || "sonst", adresse: String(f.adresse || "").trim() || null, hinweis: String(f.hinweis || "").trim() || null, lat: zahl(f.lat), lon: zahl(f.lon) };
  const l = [...standorte()]; if (i !== "" && i != null) l[Number(i)] = neu; else l.push(neu);
  try { await konfigSetzen("standorte", l); toast("💾 Gespeichert"); blattZu(); zeichne(); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.soLoeschen = async (i) => {
  if (!confirm("Diesen Ort löschen?")) return;
  try { await konfigSetzen("standorte", standorte().filter((_, k) => k !== Number(i))); blattZu(); zeichne(); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.soAnfahrt = (ort) => { const s = standortZuOrt(ort); if (s) window.open(routeLink(s), "_blank", "noopener"); else zeige("standorte"); };
