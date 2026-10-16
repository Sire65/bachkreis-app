// Wetter im Infofeld – nach der KC Club App (KC-CLUB-WETTER, -WETTER-TAGE): jetzt + 7 Tage, Tag antippen = anzeigen,
// lange drücken = Details, Wetter beim nächsten Termin, bewegte Szene (Sonne, Wolken, Regen, Schnee, Gewitter, Nebel, Sturm).
// Quelle: Open-Meteo (kostenlos, ohne Anmeldung und ohne Schlüssel, Daten u. a. vom DWD). Abgefragt werden nur die Koordinaten
// des Orts (Bergkamen) – keine personenbezogenen Daten. Zwischenspeicher 30 Min. auf dem Gerät.
import { esc, blatt } from "../kern/ui.js";
import { konfig } from "../kern/daten.js";

export const WETTER_NEU_MIN = 30, WETTER_VERALTET_MIN = 180, STURM_KMH = 62, WIND_HINWEIS_KMH = 40;
const WETTER_STUNDEN = [6, 9, 12, 15, 18, 21], WETTER_STUNDEN_TAGE = 7, WETTER_TAGE_LEISTE = 7;
export const WETTER_ORT_STANDARD = { name: "Bergkamen", lat: 51.6158, lon: 7.6440 };
const CACHE = "bk_wetter";
export const WET = { r: null, geholt: 0, laedt: false, tag: 0 };

// WMO-Wettercodes → [von, bis, Symbol Tag, Symbol Nacht, Text, Animation] (aus der KC Club App)
const WETTER_CODES = [
  [0, 0, "☀️", "🌙", "Klar", "sonne"], [1, 1, "🌤️", "🌙", "Überwiegend klar", "sonne"], [2, 2, "⛅", "☁️", "Teils bewölkt", "wolkig"], [3, 3, "☁️", "☁️", "Bedeckt", "bedeckt"],
  [45, 48, "🌫️", "🌫️", "Nebel", "nebel"], [51, 55, "🌦️", "🌧️", "Nieselregen", "niesel"], [56, 57, "🌧️", "🌧️", "Gefrierender Niesel", "niesel"],
  [61, 61, "🌦️", "🌧️", "Leichter Regen", "niesel"], [63, 65, "🌧️", "🌧️", "Regen", "regen"], [66, 67, "🌧️", "🌧️", "Gefrierender Regen", "regen"],
  [71, 73, "🌨️", "🌨️", "Schneefall", "schnee"], [75, 75, "❄️", "❄️", "Starker Schneefall", "schnee"], [77, 77, "🌨️", "🌨️", "Schneegriesel", "schnee"],
  [80, 81, "🌦️", "🌧️", "Regenschauer", "regen"], [82, 82, "🌧️", "🌧️", "Starke Regenschauer", "regen"], [85, 86, "🌨️", "🌨️", "Schneeschauer", "schnee"],
  [95, 95, "⛈️", "⛈️", "Gewitter", "gewitter"], [96, 99, "⛈️", "⛈️", "Gewitter mit Hagel", "gewitter"],
];
export const wetterArt = (code, tag = true) => { const x = WETTER_CODES.find(([a, b]) => code >= a && code <= b); return x ? { sym: tag ? x[2] : x[3], text: x[4], szene: x[5] } : { sym: "❔", text: "Wetter unbekannt", szene: "" }; };
const grad = (n) => (Number.isFinite(n) ? `${Math.round(n)}°` : "–");
const isoBerlin = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(d);
const fWtag = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });
const fDatumLang = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const zeitKurz = (iso) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const wetterTagKurz = (i, datum) => (i === 0 ? "Heute" : i === 1 ? "Morgen" : fWtag.format(new Date(datum + "T12:00:00Z")));
const wetterTagName = (i, datum) => (i === 0 ? "Heute" : i === 1 ? "Morgen" : fDatumLang.format(new Date(datum + "T12:00:00Z")));
const slug = (n) => n.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const wetterOrt = () => { const o = konfig()?.wetter_ort; return o && Number.isFinite(+o.lat) && Number.isFinite(+o.lon) ? { name: String(o.name || "Ort"), lat: +o.lat, lon: +o.lon } : WETTER_ORT_STANDARD; };

// Open-Meteo abfragen und in das Format der KC Club App bringen (jetzt + Tage mit Stunden)
export async function wetterHolen(o = wetterOrt()) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${o.lat}&longitude=${o.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,is_day`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunshine_duration`
    + `&hourly=temperature_2m,weather_code,precipitation_probability,is_day&timezone=Europe%2FBerlin&forecast_days=16`;
  const r = await fetch(u, { signal: AbortSignal.timeout?.(8000) });
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  const d = await r.json(), c = d.current ?? {}, t = d.daily ?? {}, h = d.hourly ?? {};
  const zahlOd = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
  const stunden = (datum) => (h.time ?? []).map((zeit, i) => ({ zeit, i })).filter((x) => x.zeit.startsWith(datum) && WETTER_STUNDEN.includes(Number(x.zeit.slice(11, 13))))
    .map(({ zeit, i }) => ({ zeit: zeit.slice(11, 16), code: Number(h.weather_code[i]), temp: Number(h.temperature_2m[i]), regenWkt: zahlOd(h.precipitation_probability?.[i]), tag: h.is_day?.[i] === 1 }));
  return {
    ort: o, stand: new Date().toISOString(), quelle: { name: "Open-Meteo" },
    app: { name: "WetterOnline", url: `https://www.wetteronline.de/wetter/${slug(o.name)}` },
    daten: {
      jetzt: { temp: Number(c.temperature_2m), gefuehlt: Number(c.apparent_temperature), code: Number(c.weather_code), wind: Number(c.wind_speed_10m), boeen: Number(c.wind_gusts_10m), regen: Number(c.precipitation ?? 0), tag: c.is_day === 1 },
      tage: (t.time ?? []).map((datum, i) => ({
        datum, code: Number(t.weather_code[i]), max: Number(t.temperature_2m_max[i]), min: Number(t.temperature_2m_min[i]),
        regenWkt: t.precipitation_probability_max?.[i] ?? null, sonnenauf: String(t.sunrise?.[i] ?? "").slice(11, 16), sonnenunter: String(t.sunset?.[i] ?? "").slice(11, 16),
        regenMm: zahlOd(t.precipitation_sum?.[i]), windMax: zahlOd(t.wind_speed_10m_max?.[i]), boeenMax: zahlOd(t.wind_gusts_10m_max?.[i]), uv: zahlOd(t.uv_index_max?.[i]),
        sonneStd: zahlOd(t.sunshine_duration?.[i]) === null ? null : Math.round(Number(t.sunshine_duration[i]) / 360) / 10,
        ...(i < WETTER_STUNDEN_TAGE ? { stunden: stunden(datum) } : {}),
      })),
    },
  };
}

// Laden mit Zwischenspeicher (30 Min.); bei Fehler bleibt der alte Stand (als „veraltet“ markiert) stehen
export async function wetterLaden(neuZeichnen) {
  if (WET.laedt) return;
  if (!WET.r) { try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); if (c?.daten && c.ort?.name === wetterOrt().name) { WET.r = c; WET.geholt = new Date(c.stand).getTime(); } } catch {} }
  if (WET.r?.daten && Date.now() - WET.geholt < WETTER_NEU_MIN * 60000) { neuZeichnen?.(); return; }
  WET.laedt = true;
  try { WET.r = await wetterHolen(); WET.geholt = Date.now(); try { localStorage.setItem(CACHE, JSON.stringify(WET.r)); } catch {} }
  catch (e) { if (!WET.r?.daten) WET.r = { daten: null, fehler: e.message }; WET.geholt = Date.now() - (WETTER_NEU_MIN - 2) * 60000; } // in 2 Minuten neu versuchen
  WET.laedt = false;
  neuZeichnen?.();
}

// Infofeld „Wetter“ (wie KC: Szene, Kopf, Tage-Leiste, Wetter beim nächsten Termin, Fuß mit Stand und Quelle)
export function infoWetter(naechsterTermin) {
  const r = WET.r;
  if (!r) return `<h2>🌦️ Wetter</h2><div class="unter">Wird geladen …</div>`;
  if (!r.daten) return `<h2>❔ Wetter gerade nicht verfügbar</h2><div class="unter">${esc(r.fehler || "Keine Wetterdaten")} – wir versuchen es gleich noch einmal.</div>`;
  const d = r.daten, j = d.jetzt, alt = Date.now() - new Date(r.stand) > WETTER_VERALTET_MIN * 60000;
  if (WET.tag >= d.tage.length) WET.tag = 0;
  const tr = naechsterTermin, terminTag = tr ? isoBerlin(new Date(tr.beginn)) : null;
  const tage = d.tage.slice(0, WETTER_TAGE_LEISTE).map((t, i) => `<button class="wtag${i === WET.tag ? " an" : ""}" data-wtag="${i}" aria-label="${esc(wetterTagName(i, t.datum))}: ${esc(wetterArt(t.code).text)}">
      <span>${esc(wetterTagKurz(i, t.datum))}${t.datum === terminTag ? " 📅" : ""}</span><b>${wetterArt(t.code).sym}</b><span>${grad(t.max)} / ${grad(t.min)}</span>${t.regenWkt != null ? `<small>☔ ${t.regenWkt} %</small>` : ""}</button>`).join("");
  let kopf, zeile2, szene;
  if (WET.tag === 0) {
    const a = wetterArt(j.code, j.tag);
    kopf = `<span class="wsym">${a.sym}</span><div><div class="wtemp">${grad(j.temp)}</div><div class="unter">${esc(a.text)}${j.boeen >= STURM_KMH ? " · 💨 Sturm" : ""}</div></div>`;
    zeile2 = `📍 ${esc(r.ort.name)} · gefühlt ${grad(j.gefuehlt)} · 💨 ${Math.round(j.wind)} km/h${j.boeen >= WIND_HINWEIS_KMH ? ` (Böen ${Math.round(j.boeen)})` : ""}`;
    szene = `szene-${a.szene}${j.boeen >= STURM_KMH ? " sturm" : ""}${j.tag ? "" : " nacht"}`;
  } else {
    const t = d.tage[WET.tag], a = wetterArt(t.code, true);
    kopf = `<span class="wsym">${a.sym}</span><div><div class="wtemp">${grad(t.max)}<small class="wmin"> / ${grad(t.min)}</small></div><div class="unter">${esc(wetterTagName(WET.tag, t.datum))}: ${esc(a.text)}${(t.boeenMax ?? 0) >= STURM_KMH ? " · 💨 Sturm" : ""}</div></div>`;
    zeile2 = `📍 ${esc(r.ort.name)}${t.regenWkt != null ? ` · ☔ ${t.regenWkt} %` : ""}${t.regenMm ? ` (${String(t.regenMm).replace(".", ",")} mm)` : ""}${t.windMax != null ? ` · 💨 bis ${Math.round(t.windMax)} km/h` : ""} <button class="wlink wzurueck" data-wtag="0">↩ jetzt</button>`;
    szene = `szene-${a.szene}${(t.boeenMax ?? 0) >= STURM_KMH ? " sturm" : ""}`;
  }
  let termin = "";
  if (tr) {
    const w = d.tage.find((x) => x.datum === terminTag);
    termin = w ? `<button class="wtreffen" data-a="oeffne" data-x="termin|${esc(tr.id)}">📅 Beim Termin „${esc(tr.titel)}“ (${esc(fWtag.format(new Date(terminTag + "T12:00:00Z")))} ${terminTag.slice(8, 10)}.${terminTag.slice(5, 7)}.): <b>${wetterArt(w.code).sym} ${grad(w.max)} / ${grad(w.min)}</b>${w.regenWkt != null ? ` · ☔ ${w.regenWkt} %` : ""} ›</button>`
      : `<div class="unter" style="font-size:.85rem">📅 Wetter zum nächsten Termin gibt es etwa 2 Wochen vorher.</div>`;
  }
  return `<div class="wszene ${szene}" aria-hidden="true"></div>
    <div class="winhalt">
      <div class="wkopf">${kopf}</div>
      <div class="unter">${zeile2}</div>
      <div class="wtage">${tage}</div><div class="wtipp">Tag antippen = anzeigen · lange drücken = Details</div>${termin}
      <div class="wfuss"><span class="${alt ? "wveraltet" : ""}">${alt ? "⚠️ veraltet · " : ""}Stand ${esc(zeitKurz(r.stand))} Uhr · ${esc(r.quelle.name)}</span>
        <a class="wlink" href="${esc(r.app.url)}" target="_blank" rel="noopener">${esc(r.app.name)} ›</a></div>
    </div>`;
}

// Tagesdetails (lange drücken) – Blatt wie in der KC Club App
export function wetterTagDetails(i, naechsterTermin) {
  const r = WET.r, t = r?.daten?.tage?.[i]; if (!t) return;
  const a = wetterArt(t.code, true), z = (v, einheit = "") => (v == null ? "–" : `${String(Math.round(v * 10) / 10).replace(".", ",")}${einheit}`);
  const uvText = (u) => (u == null ? "" : u < 3 ? " (niedrig)" : u < 6 ? " (mittel)" : u < 8 ? " (hoch)" : " (sehr hoch)");
  const tr = naechsterTermin, istTermin = tr && isoBerlin(new Date(tr.beginn)) === t.datum;
  const zeile = (sym, titel, wert) => `<div class="wdz"><span>${sym}</span><small>${titel}</small><b>${wert}</b></div>`;
  blatt(`${a.sym} ${wetterTagName(i, t.datum)}`, `<p class="hinweis" style="margin:0">${esc(a.text)} · 📍 ${esc(r.ort.name)}${i < 2 ? " · " + esc(fDatumLang.format(new Date(t.datum + "T12:00:00Z"))) : ""}</p>
    ${istTermin ? `<div class="hinweis" style="margin:8px 0 0;padding:8px 12px;border-radius:12px;background:var(--gelbbg);color:var(--text)">📅 An diesem Tag: <b>${esc(tr.titel)}</b> um ${esc(new Date(tr.beginn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }))} Uhr</div>` : ""}
    <div class="wdetails" style="margin-top:10px">
      ${zeile("🌡️", "Höchst / Tiefst", `${grad(t.max)} / ${grad(t.min)}`)}
      ${zeile("☔", "Regen", `${t.regenWkt == null ? "–" : t.regenWkt + " %"}${t.regenMm != null ? ` · ${z(t.regenMm, " mm")}` : ""}`)}
      ${zeile("💨", "Wind / Böen", `bis ${z(t.windMax)} / ${z(t.boeenMax, " km/h")}`)}
      ${zeile("☀️", "Sonnenschein", z(t.sonneStd, " Std."))}
      ${zeile("🌅", "Sonne auf / unter", `${t.sonnenauf || "–"} / ${t.sonnenunter || "–"}`)}
      ${zeile("🔆", "UV-Index", t.uv == null ? "–" : z(t.uv) + uvText(t.uv))}
    </div>
    ${t.stunden?.length ? `<h4>Im Tagesverlauf</h4><div class="wstunden">${t.stunden.map((h) => `<div><small>${esc(h.zeit)}</small><b>${wetterArt(h.code, h.tag).sym}</b><span>${grad(h.temp)}</span>${h.regenWkt != null ? `<small>☔ ${h.regenWkt} %</small>` : ""}</div>`).join("")}</div>`
      : `<p class="hinweis">Den Verlauf über den Tag gibt es für die nächsten ${WETTER_TAGE_LEISTE} Tage.</p>`}
    <p class="hinweis" style="font-size:.8rem">Stand ${esc(zeitKurz(r.stand))} Uhr · ${esc(r.quelle.name)}</p>
    <a class="knopf breit" href="${esc(r.app.url)}" target="_blank" rel="noopener">🌐 Mehr bei ${esc(r.app.name)}</a>`);
}

// Animation: Elemente zufällig verteilt; bei „weniger Bewegung“ (Systemeinstellung) steht alles still (aus der KC Club App)
export function wetterSzene() {
  const el = document.querySelector("#infoFeld .wszene"); if (!el || el.childElementCount) return;
  const zufall = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
  const viele = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
  const wolken = (n, dunkel) => viele(n, () => `<i class="wwolke${dunkel ? " dunkel" : ""}" style="top:${zufall(-6, 38)}%;animation-duration:${zufall(38, 70)}s;animation-delay:-${zufall(0, 60)}s;transform:scale(${zufall(.7, 1.3)})"></i>`);
  const tropfen = (n, fein) => viele(n, () => `<i class="wtropfen${fein ? " fein" : ""}" style="left:${zufall(-5, 105)}%;animation-duration:${zufall(fein ? .9 : .55, fein ? 1.4 : .85)}s;animation-delay:-${zufall(0, 2)}s"></i>`);
  const art = [...el.classList].find((k) => k.startsWith("szene-"))?.slice(6), nacht = el.classList.contains("nacht");
  const himmel = nacht ? `<i class="wmond"></i>${viele(10, () => `<i class="wstern" style="left:${zufall(2, 96)}%;top:${zufall(4, 60)}%;animation-delay:-${zufall(0, 4)}s"></i>`)}` : `<i class="wsonne"></i>`;
  let h = "";
  if (art === "sonne") h = himmel;
  else if (art === "wolkig") h = himmel + wolken(2);
  else if (art === "bedeckt") h = wolken(4);
  else if (art === "nebel") h = viele(4, (i) => `<i class="wnebel" style="top:${18 + i * 20}%;animation-duration:${zufall(10, 18)}s;animation-delay:-${zufall(0, 10)}s"></i>`);
  else if (art === "niesel") h = wolken(3) + tropfen(16, true);
  else if (art === "regen") h = wolken(3, true) + tropfen(34);
  else if (art === "schnee") h = wolken(2) + viele(28, () => `<i class="wflocke" style="left:${zufall(-5, 100)}%;width:${zufall(3, 7)}px;height:auto;aspect-ratio:1;animation-duration:${zufall(5, 10)}s;animation-delay:-${zufall(0, 10)}s"></i>`);
  else if (art === "gewitter") h = wolken(4, true) + tropfen(34) + `<i class="wblitz"></i>`;
  if (el.classList.contains("sturm")) h += viele(9, () => `<i class="wwind" style="top:${zufall(5, 90)}%;animation-duration:${zufall(1.1, 2)}s;animation-delay:-${zufall(0, 2)}s"></i>`);
  el.innerHTML = h;
}
