// PC-Verwaltung für Leitung, Vorstand/Förderverein und Lehrkräfte: Stammdaten (Adressen, Instrumente, Gruppen …)
// bequem am PC/Notebook pflegen. Formulare, Listen, CSV-Import/-Export entstehen aus der Tabellen-Registry (schema.js).
// Zugänge (Codes/QR-Karten, Sperren, Verwaltungsrecht) werden HIER – außerhalb der App – gepflegt.
import { datenStarten, liste, listeMitGeloeschten, hole, speichere, speichereViele, loesche, konfig, konfigSetzen, abonnieren, setzeWer, datenInfo, neueId } from "../kern/daten.js";
import { TABELLEN, TABELLEN_NAMEN, ROLLEN, anzeigeName } from "../kern/schema.js";
import { esc, $, $$, AKTIONEN, aktionenStarten, toast, formWerte, herunterladen, frage, datumKurz, vorZeit, zuLokal, vonLokal, BACHKREIS_LOGO } from "../kern/ui.js";
import { csvAus, csvEin, stammgruppe, generellerWechselPlan, tagIso, instrumenteVon, elternVon, kinderVon } from "../kern/logik.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";

const db = { liste, hole, konfig };
const V = { ich: null, ansicht: "uebersicht", tab: null, auswahl: null, suche: "", filter: "", sort: null };

const darf = (tab, art) => { const r = V.ich?.rollen || []; return (TABELLEN[tab]?.[art] || []).some((x) => r.includes(x)); };
const darfGeschuetzt = () => (V.ich?.rollen || []).some((r) => ["leitung", "admin", "lehrkraft"].includes(r));
const name = (p) => (p ? `${p.vorname} ${p.nachname}` : "–");

// ---------- Anmeldung ----------
function anmeldung() {
  const verwalter = liste("zugaenge", (z) => z.aktiv && z.verwaltung).map((z) => hole("personen", z.person_id)).filter(Boolean);
  $("#vw").innerHTML = `<div class="vw-anmeldung karte"><div style="display:flex;gap:12px;align-items:center"><div style="width:60px">${BACHKREIS_LOGO}</div><div><h2 style="margin:0">PC-Verwaltung</h2><div class="hinweis">${esc(konfig().name || "Bachkreis")}</div></div></div>
    <div class="feld"><label>Zugangscode</label><input id="vwCode" placeholder="z. B. AB12CD34" autocomplete="off"></div><button class="knopf haupt breit" data-a="vwCode">Anmelden</button>
    <h4>Vorführversion – direkt anmelden als:</h4><ul class="liste">${verwalter.map((p) => `<li class="klick" data-a="vwAls" data-x="${p.id}"><div class="fl"><b>${esc(name(p))}</b><div class="zeile-unter">${esc((p.rollen || []).map((r) => ROLLEN[r] || r).join(", "))}</div></div>›</li>`).join("")}</ul>
    <p class="hinweis">Zugang zur Verwaltung haben nur Personen mit dem Recht „darf PC-Verwaltung nutzen“ (Leitung, Lehrkräfte, Vorstand Förderverein).</p></div>`;
}
AKTIONEN.vwCode = () => {
  const c = $("#vwCode").value.trim().toUpperCase();
  const z = liste("zugaenge", (x) => x.code === c && x.aktiv && x.verwaltung)[0];
  if (!z) { toast("Code ungültig oder ohne Verwaltungsrecht"); return; }
  anmelden(z.person_id);
};
AKTIONEN.vwAls = (id) => anmelden(id);
function anmelden(id) {
  V.ich = hole("personen", id);
  setzeWer(name(V.ich));
  try { sessionStorage.setItem("bk_vw_ich", id); } catch {}
  demoLeiste();
  zeichne();
}
AKTIONEN.vwAbmelden = () => { V.ich = null; try { sessionStorage.removeItem("bk_vw_ich"); } catch {} demoLeiste(); anmeldung(); };
function demoLeiste() {
  $("#demoleiste").innerHTML = `🧪 VORFÜHRVERSION · PC-Verwaltung · Daten nur in diesem Browser – Änderungen erscheinen sofort in der App (gleicher Browser)${V.ich ? ` · angemeldet: ${esc(name(V.ich))}` : ""}`;
}

// ---------- Rahmen ----------
const SONDER = [["uebersicht", "🏠", "Übersicht"], ["gruppenboard", "🧩", "Gruppen-Board"], ["schuljahr", "🎓", "Schuljahreswechsel"], ["zugaenge", "🔑", "Zugänge & QR-Karten"], ["import", "📥", "Import / Export"], ["abgleich", "🔁", "Abgleich & Protokoll"], ["konfig", "⚙️", "Einstellungen"]];
function seitenleiste() {
  const gruppen = {};
  for (const t of TABELLEN_NAMEN) if (darf(t, "lesen")) (gruppen[TABELLEN[t].gruppe] ||= []).push(t);
  const btn = (an, a, x, sym, t, anz = "") => `<button class="${an ? "an" : ""}" data-a="${a}" data-x="${x}">${sym} ${esc(t)}<span class="anz">${anz}</span></button>`;
  return `<div class="marke">${BACHKREIS_LOGO}<div><b>Verwaltung</b><div style="font-size:.75rem;opacity:.7">v${APP_VERSION} ${APP_STUFE}</div></div></div>
    ${SONDER.filter(([k]) => k !== "zugaenge" || darf("zugaenge", "lesen")).filter(([k]) => k !== "schuljahr" && k !== "gruppenboard" || darf("gruppe_zuordnung", "schreiben")).map(([k, s, t]) => btn(V.ansicht === k, "vwAnsicht", k, s, t)).join("")}
    ${Object.entries(gruppen).map(([g, ts]) => `<h4>${esc(g)}</h4>${ts.map((t) => btn(V.ansicht === "tabelle" && V.tab === t, "vwTabelle", t, TABELLEN[t].sym, TABELLEN[t].titel, liste(t).length)).join("")}`).join("")}
    <h4>Sitzung</h4><button data-a="vwApp">📱 App öffnen</button><button data-a="vwAbmelden">🚪 Abmelden</button>`;
}
function zeichne() {
  if (!V.ich) return anmeldung();
  let haupt = "";
  try { haupt = ANSICHTEN[V.ansicht === "tabelle" ? "tabelle" : V.ansicht](); }
  catch (e) { console.error(e); haupt = `<div class="karte">⚠️ ${esc(e.message)}</div>`; }
  $("#vw").innerHTML = `<div class="vw-rahmen"><nav class="vw-seite">${seitenleiste()}</nav><section class="vw-haupt">${haupt}</section></div>`;
  NACH[V.ansicht]?.();
}
AKTIONEN.vwAnsicht = (k) => { V.ansicht = k; V.auswahl = null; zeichne(); };
AKTIONEN.vwTabelle = (t) => { V.ansicht = "tabelle"; V.tab = t; V.auswahl = null; V.suche = ""; V.filter = ""; V.sort = null; zeichne(); };
AKTIONEN.vwApp = () => window.open("index.html", "_blank");

// ---------- Feld-Darstellung ----------
function zellWert(f, v) {
  if (v == null || v === "") return "";
  switch (f.typ) {
    case "ref": return anzeigeName(f.ref, hole(f.ref, v));
    case "refs": return (v || []).map((x) => anzeigeName(f.ref, hole(f.ref, x))).join(", ");
    case "wahl": return f.werte?.[v] ?? v;
    case "liste": return (v || []).map((x) => f.werte?.[x] || x).join(", ");
    case "ja": return v ? "✔" : "";
    case "datum": return datumKurz(v);
    case "zeit": return `${datumKurz(v)} ${new Date(v).toTimeString().slice(0, 5)}`;
    case "geld": return Number(v).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
    case "farbe": return `<span class="punkt" style="background:${esc(v)}"></span>${esc(v)}`;
    default: return String(v);
  }
}
function feldEingabe(f, z, nurLesen) {
  const v = z[f.k];
  const dis = nurLesen ? "disabled" : "";
  const n = `name="${f.k}" ${dis}`;
  const optRef = (sel) => liste(f.ref).filter((x) => !f.filter || f.filter(x)).sort((a, b) => anzeigeName(f.ref, a).localeCompare(anzeigeName(f.ref, b))).map((x) => `<option value="${x.id}" ${sel(x.id) ? "selected" : ""}>${esc(anzeigeName(f.ref, x))}</option>`).join("");
  let e;
  switch (f.typ) {
    case "lang": e = `<textarea ${n}>${esc(v || "")}</textarea>`; break;
    case "email": e = `<input type="email" ${n} value="${esc(v || "")}">`; break;
    case "tel": e = `<input type="tel" ${n} value="${esc(v || "")}">`; break;
    case "datum": e = `<input type="date" ${n} value="${esc(v || "")}">`; break;
    case "zeit": e = `<input type="datetime-local" ${n} value="${zuLokal(v)}" data-zeit="1">`; break;
    case "zahl": case "geld": e = `<input type="number" step="${f.typ === "geld" ? "0.01" : "1"}" ${n} value="${esc(v ?? "")}" data-zahl="1">`; break;
    case "farbe": e = `<input type="color" ${n} value="${esc(v || "#1f4f8f")}">`; break;
    case "ja": e = `<label class="schalter" style="border:none;padding:4px 0"><span>${esc(f.t)}</span><input type="checkbox" ${n} ${v ? "checked" : ""}></label>`; return `<div class="feld">${e}</div>`;
    case "wahl": e = `<select ${n}><option value="">–</option>${Object.entries(f.werte).map(([k, t]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`; break;
    case "liste": e = `<div class="wahlen">${Object.entries(f.werte).map(([k, t]) => `<label><input type="checkbox" name="${f.k}" data-mehr="1" value="${k}" ${(v || []).includes(k) ? "checked" : ""} ${dis}> ${esc(t)}</label>`).join("")}</div>`; break;
    case "ref": e = `<select ${n}><option value="">–</option>${optRef((id) => id === v)}</select>`; break;
    case "refs": e = `<select multiple ${n}>${optRef((id) => (v || []).includes(id))}</select>`; break;
    default: e = `<input ${n} value="${esc(v ?? "")}">`;
  }
  return `<div class="feld ${f.geschuetzt ? "geschuetzt" : ""}"><label>${esc(f.t)}${f.pflicht ? " *" : ""}${f.geschuetzt ? " 🔒" : ""}</label>${e}</div>`;
}
function formLesen(tab, wurzel) {
  const roh = formWerte(wurzel);
  const o = {};
  for (const f of TABELLEN[tab].felder) {
    if (!(f.k in roh) && f.typ !== "liste" && f.typ !== "refs") continue;
    let v = roh[f.k];
    if (f.typ === "zahl" || f.typ === "geld") v = v === "" || v == null ? null : Number(v);
    else if (f.typ === "zeit") v = vonLokal(v);
    else if (f.typ === "ref" || f.typ === "wahl" || f.typ === "datum") v = v || null;
    else if (f.typ === "liste" || f.typ === "refs") v = v || [];
    o[f.k] = v;
  }
  return o;
}

// ---------- Generische Tabelle ----------
const ANSICHTEN = {};
const NACH = {};
ANSICHTEN.tabelle = () => {
  const def = TABELLEN[V.tab];
  const schreiben = darf(V.tab, "schreiben") && !def.nurLesen;
  let zeilen = liste(V.tab);
  const typFeld = def.felder.find((f) => f.k === "typ" || (V.tab !== "personen" && f.k === "status"));
  if (V.filter && typFeld) zeilen = zeilen.filter((z) => z[typFeld.k] === V.filter);
  if (V.suche) {
    const q = V.suche.toLowerCase();
    zeilen = zeilen.filter((z) => def.liste.some((k) => { const f = def.felder.find((x) => x.k === k); return String(f ? zellWert(f, z[k]) : z[k] ?? "").toLowerCase().includes(q); }));
  }
  const sortK = V.sort || def.liste[0];
  const sf = def.felder.find((x) => x.k === sortK);
  zeilen.sort((a, b) => String(sf ? zellWert(sf, a[sortK]) : a[sortK] ?? "").localeCompare(String(sf ? zellWert(sf, b[sortK]) : b[sortK] ?? ""), "de", { numeric: true }));
  const kopf = `<div class="vw-kopf"><h2>${def.sym} ${esc(def.titel)} <span class="hinweis">(${zeilen.length})</span></h2>
    <input type="search" placeholder="Suchen …" value="${esc(V.suche)}" data-c="vwSuche">
    ${typFeld ? `<select data-c="vwFilter"><option value="">alle ${esc(typFeld.t)}</option>${Object.entries(typFeld.werte).map(([k, t]) => `<option value="${k}" ${V.filter === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
    ${schreiben ? `<button class="knopf haupt" data-a="vwNeu">＋ Neu</button>` : ""}<button class="knopf" data-a="vwCsv">📤 CSV</button></div>`;
  const tabelle = `<div class="vw-tabelle-wrap"><table class="vw-tabelle"><thead><tr>${def.liste.map((k) => `<th data-a="vwSort" data-x="${k}">${esc(def.felder.find((f) => f.k === k)?.t || k)}${sortK === k ? " ▾" : ""}</th>`).join("")}</tr></thead>
    <tbody>${zeilen.slice(0, 1000).map((z) => `<tr class="${V.auswahl === z.id ? "gewaehlt" : ""}" data-a="vwWahl" data-x="${z.id}">${def.liste.map((k) => { const f = def.felder.find((x) => x.k === k); return `<td title="${esc(f ? String(zellWert(f, z[k])).replace(/<[^>]+>/g, "") : "")}">${f?.typ === "farbe" ? zellWert(f, z[k]) : esc(f ? zellWert(f, z[k]) : z[k] ?? "")}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
  const form = V.auswahl !== null ? formular(V.tab, V.auswahl === "neu" ? {} : hole(V.tab, V.auswahl), schreiben) : "";
  return kopf + (form ? `<div class="vw-geteilt">${tabelle}${form}</div>` : tabelle);
};
function formular(tab, z, schreiben) {
  if (!z) return "";
  const def = TABELLEN[tab];
  const felder = def.felder.filter((f) => (!f.nur || f.nur({ ...z, typ: z.typ || V.neuTyp })) && (!f.geschuetzt || darfGeschuetzt()));
  return `<div class="vw-form" id="vwForm"><h3>${z.id ? esc(anzeigeName(tab, z)) : "Neu: " + esc(def.titel)}</h3>
    ${felder.map((f) => feldEingabe(f, z, !schreiben)).join("")}
    ${z.id ? beziehungen(tab, z) : ""}
    ${z.id ? `<div class="hinweis">Version ${z.version || 1} · geändert ${vorZeit(z.geaendert_am)} von ${esc(z.geaendert_von || "–")}</div>` : ""}
    <div class="knopfreihe">${schreiben ? `<button class="knopf haupt" data-a="vwSpeichern">💾 Speichern</button>${z.id ? `<button class="knopf rot" data-a="vwLoeschen">🗑️ Löschen</button>` : ""}` : '<span class="hinweis">Nur Lesen – keine Schreibrechte.</span>'}<button class="knopf" data-a="vwSchliessen">Schließen</button></div></div>`;
}
function beziehungen(tab, z) {
  if (tab !== "personen") return "";
  const teile = [];
  if (z.typ === "schueler") {
    const g = stammgruppe(db, z.id);
    teile.push(`<div><b>Stammgruppe:</b> ${esc(hole("gruppen", g)?.name || "–")}</div>`);
    teile.push(`<div><b>Instrumente:</b> ${instrumenteVon(db, z.id).map((i) => esc(hole("instrument_typen", i.typ_id)?.name) + (i.haupt ? " ⭐" : "")).join(", ") || "–"}</div>`);
    teile.push(`<div><b>Eltern:</b> ${elternVon(db, z.id).map((e) => esc(name(hole("personen", e)))).join(", ") || "–"}</div>`);
  }
  if (z.typ === "eltern") teile.push(`<div><b>Kinder:</b> ${kinderVon(db, z.id).map((k) => esc(name(hole("personen", k)))).join(", ") || "–"}</div>`);
  const zug = liste("zugaenge", (x) => x.person_id === z.id)[0];
  teile.push(`<div><b>Zugang:</b> ${zug ? (zug.aktiv ? "aktiv" : "gesperrt") + (zug.verwaltung ? " · Verwaltung" : "") : "keiner"}</div>`);
  return `<div class="karte" style="background:var(--karte2);box-shadow:none">${teile.join("")}<div class="hinweis">Verknüpfungen bearbeiten: Eltern ↔ Kind, Instrumente je Person, Gruppen-Zuordnung, Zugänge.</div></div>`;
}
AKTIONEN.vwSuche = (v) => { V.suche = v; zeichne(); };
AKTIONEN.vwFilter = (v) => { V.filter = v; zeichne(); };
AKTIONEN.vwSort = (k) => { V.sort = k; zeichne(); };
AKTIONEN.vwWahl = (id) => { V.auswahl = id; zeichne(); };
AKTIONEN.vwNeu = () => { V.auswahl = "neu"; V.neuTyp = V.filter || ""; zeichne(); };
AKTIONEN.vwSchliessen = () => { V.auswahl = null; zeichne(); };
AKTIONEN.vwSpeichern = async () => {
  const def = TABELLEN[V.tab];
  const o = formLesen(V.tab, $("#vwForm"));
  const fehlt = def.felder.filter((f) => f.pflicht && (o[f.k] == null || o[f.k] === "" || (Array.isArray(o[f.k]) && !o[f.k].length)));
  if (fehlt.length) { toast("Pflichtfelder fehlen: " + fehlt.map((f) => f.t).join(", ")); return; }
  const alt = V.auswahl !== "neu" ? hole(V.tab, V.auswahl) : {};
  const z = await speichere(V.tab, { ...alt, ...o });
  if (V.tab === "personen" && !liste("zugaenge", (x) => x.person_id === z.id).length && ["schueler", "eltern", "lehrkraft", "leitung", "foerderverein"].includes(z.typ))
    await speichere("zugaenge", { person_id: z.id, code: neuerCode(), art: "link", aktiv: true, verwaltung: ["leitung", "lehrkraft", "foerderverein"].includes(z.typ) });
  V.auswahl = z.id; toast("💾 Gespeichert – in der App sofort sichtbar"); zeichne();
};
AKTIONEN.vwLoeschen = async () => {
  if (!(await frage("Datensatz löschen? (wird als gelöscht markiert und an alle Geräte weitergegeben)"))) return;
  await loesche(V.tab, V.auswahl); V.auswahl = null; toast("🗑️ Gelöscht"); zeichne();
};
AKTIONEN.vwCsv = () => {
  const def = TABELLEN[V.tab];
  const spalten = ["id", ...def.felder.filter((f) => !f.geschuetzt || darfGeschuetzt()).map((f) => f.k)];
  herunterladen(`${V.tab}-${tagIso(new Date())}.csv`, "﻿" + csvAus(liste(V.tab), spalten), "text/csv");
};

// ---------- Übersicht ----------
ANSICHTEN.uebersicht = () => {
  const k = (t, f) => liste(t, f).length;
  const kz = [["👥", "Schüler", k("personen", (p) => p.typ === "schueler")], ["👪", "Eltern", k("personen", (p) => p.typ === "eltern")], ["🎻", "Inventar", k("inventar")], ["🤝", "verliehen", k("ausleihen", (a) => a.status === "aktiv")], ["📅", "Termine", k("termine")], ["✍️", "Genehmigungen offen", k("genehmigungen", (g) => g.status === "ausstehend")], ["🔑", "aktive Zugänge", k("zugaenge", (z) => z.aktiv)], ["🗂️", "offene Vorgänge", k("aufgaben", (a) => a.status !== "erledigt")]];
  const letzte = liste("aenderungen").slice(-8).reverse();
  return `<div class="vw-kopf"><h2>🏠 Übersicht</h2></div><div class="kennzahlen">${kz.map(([s, t, n]) => `<div class="kennzahl"><b>${s} ${n}</b><small>${t}</small></div>`).join("")}</div>
    <div class="karte"><h3>Schnellzugriff</h3><div class="knopfreihe">${["personen", "eltern_kind", "person_instrument", "inventar", "ausleihen", "termine", "werke", "genehmigung_vorlagen"].filter((t) => darf(t, "lesen")).map((t) => `<button class="knopf" data-a="vwTabelle" data-x="${t}">${TABELLEN[t].sym} ${esc(TABELLEN[t].titel)}</button>`).join("")}</div></div>
    <div class="karte"><h3>Letzte Änderungen</h3><ul class="liste">${letzte.map((a) => `<li><div class="fl">${esc(TABELLEN[a.tabelle]?.titel || a.tabelle)} · ${esc(a.aktion)} <span class="hinweis">${esc(a.wer)} · ${esc(a.quelle)} · ${vorZeit(a.zeit)}</span></div></li>`).join("") || "<li class='hinweis'>noch keine</li>"}</ul></div>
    <div class="karte"><h3>So arbeiten App und Verwaltung zusammen</h3><p>Die Verwaltung ist für Arbeit am <b>PC/Notebook</b>: Adressen, Eltern-Kind-Verknüpfungen, Instrumente, Inventar, Gruppen, Noten, Zugänge, Import/Export. Die <b>App</b> ist fürs Handy: Termine, Zusagen, Nachrichten, SOS, Cockpit. Beide arbeiten auf denselben Tabellen – im Echtbetrieb über Supabase abgeglichen, in der Vorführversion über den Browser.</p></div>`;
};

// ---------- Gruppen-Board (Drag & Drop = genereller Wechsel) ----------
ANSICHTEN.gruppenboard = () => {
  const gruppen = liste("gruppen").sort((a, b) => a.sort - b.sort);
  const schueler = liste("personen", (p) => ["schueler", "ehemalig"].includes(p.typ) && p.status !== "ausgetreten");
  const ohne = schueler.filter((p) => !stammgruppe(db, p.id));
  const karte = (p) => `<div class="vw-karte" draggable="true" data-person="${p.id}"><span>${esc(name(p))}</span><small>${p.jahrgang ? "Jg " + p.jahrgang : ""} ${esc(hole("instrument_typen", instrumenteVon(db, p.id)[0]?.typ_id)?.name || "")}</small></div>`;
  return `<div class="vw-kopf"><h2>🧩 Gruppen-Board</h2><span class="hinweis">Karte in eine andere Spalte ziehen = genereller Wechsel ab heute (Verlauf bleibt erhalten). Temporäre Zuordnungen: Tabelle „Gruppen-Zuordnung“.</span></div>
    <div class="vw-board">${gruppen.map((g) => { const m = schueler.filter((p) => stammgruppe(db, p.id) === g.id).sort((a, b) => name(a).localeCompare(name(b))); return `<div class="vw-spalte" data-gruppe="${g.id}"><h3 style="color:${esc(g.farbe)}">${esc(g.kuerzel)} – ${esc(g.name)} <span class="hinweis">(${m.length})</span></h3>${m.map(karte).join("")}</div>`; }).join("")}
    ${ohne.length ? `<div class="vw-spalte" data-gruppe=""><h3>ohne Gruppe (${ohne.length})</h3>${ohne.map(karte).join("")}</div>` : ""}</div>`;
};
NACH.gruppenboard = () => {
  for (const k of $$(".vw-karte")) k.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", k.dataset.person));
  for (const s of $$(".vw-spalte")) {
    s.addEventListener("dragover", (e) => { e.preventDefault(); s.classList.add("ueber"); });
    s.addEventListener("dragleave", () => s.classList.remove("ueber"));
    s.addEventListener("drop", async (e) => {
      e.preventDefault(); s.classList.remove("ueber");
      const pid = e.dataTransfer.getData("text/plain"), gid = s.dataset.gruppe;
      if (!gid || stammgruppe(db, pid) === gid) return;
      const plan = generellerWechselPlan(db, pid, gid, new Date());
      for (const z of plan.beenden) await speichere("gruppe_zuordnung", z, { still: true });
      await speichere("gruppe_zuordnung", { ...plan.neu, grund: "Gruppen-Board" });
      toast(`🔀 ${name(hole("personen", pid))} → ${hole("gruppen", gid)?.kuerzel}`); zeichne();
    });
  }
};

// ---------- Schuljahreswechsel-Assistent ----------
ANSICHTEN.schuljahr = () => {
  const gruppen = liste("gruppen").sort((a, b) => a.sort - b.sort);
  const gA = gruppen.find((g) => g.kuerzel === "A"), gB = gruppen.find((g) => g.kuerzel === "B"), gD = gruppen.find((g) => g.kuerzel === "D");
  const schueler = liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten");
  const vorschlaege = schueler.map((p) => {
    const jg = Number(p.jahrgang || 0) + 1, g = stammgruppe(db, p.id);
    let ziel = null, grund = "";
    if (jg > 12 && gD) { ziel = gD.id; grund = "Abschluss → Ehemalige"; }
    else if (g === gB?.id && jg >= 9 && gA) { ziel = gA.id; grund = `Jg ${jg} → A-Orchester`; }
    return { p, jg, g, ziel, grund };
  });
  const wechsel = vorschlaege.filter((v) => v.ziel && v.ziel !== v.g);
  return `<div class="vw-kopf"><h2>🎓 Schuljahreswechsel</h2></div><div class="karte"><p>Erhöht die Jahrgangsstufe aller Schüler um 1 und schlägt Gruppenwechsel vor (B → A ab Jahrgang 9, nach Jahrgang 12 → Ehemalige). Die Leitung bestätigt jeden Wechsel – nichts passiert automatisch.</p>
    <div class="feld"><label>Stichtag</label><input type="date" id="sjStichtag" value="${new Date().getFullYear()}-08-01"></div>
    <table class="vw-tabelle"><tr><th>übernehmen</th><th>Name</th><th>Jg neu</th><th>bisher</th><th>Vorschlag</th></tr>${wechsel.map((v) => `<tr><td><input type="checkbox" class="sjWahl" value="${v.p.id}|${v.ziel}" checked></td><td>${esc(name(v.p))}</td><td>${v.jg}</td><td>${esc(hole("gruppen", v.g)?.kuerzel || "–")}</td><td>${esc(v.grund)}</td></tr>`).join("") || "<tr><td colspan=5>Keine Wechsel vorgeschlagen.</td></tr>"}</table>
    <div class="knopfreihe"><button class="knopf haupt" data-a="sjAusfuehren">✔️ Jahrgänge +1 und ausgewählte Wechsel übernehmen</button></div>
    <p class="hinweis">Kritische Aktion: Vor dem Ausführen wird automatisch ein Export als Sicherung angeboten (Recovery-Punkt).</p></div>`;
};
AKTIONEN.sjAusfuehren = async () => {
  if (!(await frage("Schuljahreswechsel ausführen? Vorher wird eine Sicherung heruntergeladen."))) return;
  sicherung();
  const stichtag = $("#sjStichtag").value || tagIso(new Date());
  const schueler = liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten");
  await speichereViele("personen", schueler.map((p) => ({ ...p, jahrgang: Number(p.jahrgang || 0) + 1 })));
  let n = 0;
  for (const c of $$(".sjWahl:checked")) {
    const [pid, gid] = c.value.split("|");
    const plan = generellerWechselPlan(db, pid, gid, stichtag);
    for (const z of plan.beenden) await speichere("gruppe_zuordnung", z, { still: true });
    await speichere("gruppe_zuordnung", { ...plan.neu, grund: "Schuljahreswechsel" }, { still: true });
    if (hole("gruppen", gid)?.kuerzel === "D") await speichere("personen", { ...hole("personen", pid), typ: "ehemalig", rollen: [] }, { still: true });
    n++;
  }
  toast(`🎓 Jahrgänge erhöht, ${n} Wechsel übernommen`); zeichne();
};

// ---------- Zugänge & QR-Karten ----------
const ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function neuerCode() { const a = new Uint32Array(8); crypto.getRandomValues(a); return [...a].map((x) => ZEICHEN[x % ZEICHEN.length]).join(""); }
const appLink = (code) => new URL(`index.html?k=${code}`, location.href).href;
ANSICHTEN.zugaenge = () => {
  const typ = V.filter || "schueler";
  const personen = liste("personen", (p) => p.typ === typ).sort((a, b) => name(a).localeCompare(name(b)));
  const schreiben = darf("zugaenge", "schreiben");
  return `<div class="vw-kopf"><h2>🔑 Zugänge & QR-Karten</h2><select data-c="vwZugTyp">${["schueler", "eltern", "lehrkraft", "foerderverein", "leitung", "ehemalig"].map((t) => `<option value="${t}" ${t === typ ? "selected" : ""}>${esc(TABELLEN.personen.felder.find((f) => f.k === "typ").werte[t])}</option>`).join("")}</select>
    ${schreiben ? `<button class="knopf" data-a="zugAlleAnlegen">＋ fehlende Zugänge anlegen</button>` : ""}<button class="knopf haupt" data-a="zugKarten">🖨️ QR-Karten drucken</button></div>
    <div class="karte"><p class="hinweis">Anmeldung ohne Passwort über einen persönlichen Link/QR-Code (wie in der Club-App). Codes werden nur hier gepflegt – sperren, neu erzeugen, Verwaltungsrecht vergeben. Im Echtbetrieb liegt nur ein Hash des Codes auf dem Server.</p></div>
    <div class="vw-tabelle-wrap"><table class="vw-tabelle"><thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Verwaltung</th><th>zuletzt</th><th></th></tr></thead><tbody>${personen.map((p) => {
      const z = liste("zugaenge", (x) => x.person_id === p.id)[0];
      return `<tr><td>${esc(name(p))}</td><td><code>${esc(z?.code || "–")}</code></td><td>${z ? (z.aktiv ? "✅ aktiv" : "⛔ gesperrt") : "–"}</td><td>${z?.verwaltung ? "💻" : ""}</td><td>${z?.zuletzt ? vorZeit(z.zuletzt) : "nie"}</td>
        <td style="white-space:nowrap">${schreiben ? (z ? `<button class="knopf klein" data-a="zugNeu" data-x="${z.id}">🔄 neuer Code</button> <button class="knopf klein" data-a="zugAktiv" data-x="${z.id}">${z.aktiv ? "sperren" : "freigeben"}</button> <button class="knopf klein" data-a="zugVw" data-x="${z.id}">💻</button>` : `<button class="knopf klein" data-a="zugAnlegen" data-x="${p.id}">anlegen</button>`) : ""} ${z ? `<button class="knopf klein" data-a="zugLink" data-x="${z.code}">🔗</button>` : ""}</td></tr>`;
    }).join("")}</tbody></table></div><div id="qrBereich"></div>`;
};
AKTIONEN.vwZugTyp = (v) => { V.filter = v; zeichne(); };
AKTIONEN.zugNeu = async (id) => { if (!(await frage("Neuen Code erzeugen? Der alte Link funktioniert dann nicht mehr."))) return; await speichere("zugaenge", { ...hole("zugaenge", id), code: neuerCode() }); zeichne(); };
AKTIONEN.zugAktiv = async (id) => { const z = hole("zugaenge", id); await speichere("zugaenge", { ...z, aktiv: !z.aktiv }); zeichne(); };
AKTIONEN.zugVw = async (id) => { const z = hole("zugaenge", id); await speichere("zugaenge", { ...z, verwaltung: !z.verwaltung }); toast(z.verwaltung ? "Verwaltungsrecht entzogen" : "💻 darf jetzt die PC-Verwaltung nutzen"); zeichne(); };
AKTIONEN.zugAnlegen = async (pid) => { await speichere("zugaenge", { person_id: pid, code: neuerCode(), art: "link", aktiv: true, verwaltung: false }); zeichne(); };
AKTIONEN.zugAlleAnlegen = async () => {
  const typ = V.filter || "schueler";
  const ohne = liste("personen", (p) => p.typ === typ && !liste("zugaenge", (z) => z.person_id === p.id).length);
  await speichereViele("zugaenge", ohne.map((p) => ({ person_id: p.id, code: neuerCode(), art: "link", aktiv: true, verwaltung: false })));
  toast(`${ohne.length} Zugänge angelegt`); zeichne();
};
AKTIONEN.zugLink = async (code) => { try { await navigator.clipboard.writeText(appLink(code)); toast("🔗 Link kopiert"); } catch { prompt("Link:", appLink(code)); } };
function qrBild(text) {
  if (typeof globalThis.qrcode !== "function") return "";
  const q = globalThis.qrcode(0, "M"); q.addData(text); q.make();
  return q.createDataURL(4, 2);
}
AKTIONEN.zugKarten = () => {
  const typ = V.filter || "schueler";
  const k = konfig();
  const karten = liste("personen", (p) => p.typ === typ).sort((a, b) => name(a).localeCompare(name(b))).map((p) => ({ p, z: liste("zugaenge", (x) => x.person_id === p.id && x.aktiv)[0] })).filter((x) => x.z);
  $("#qrBereich").innerHTML = `<h3 class="vw-noprint">Druckvorschau (${karten.length} Karten) <button class="knopf" data-a="vwDrucken">🖨️ Drucken</button></h3><div class="qr-karten">${karten.map(({ p, z }) => `<div class="qr-karte"><b>${esc(k.name || "Bachkreis")}-App</b><div>${esc(name(p))}</div><img alt="QR-Code" src="${qrBild(appLink(z.code))}"><div>Code: <code>${esc(z.code)}</code></div><div class="hinweis">QR-Code mit dem Handy scannen – fertig. Karte nicht weitergeben.</div></div>`).join("")}</div>`;
  $("#qrBereich").scrollIntoView({ behavior: "smooth" });
};
AKTIONEN.vwDrucken = () => window.print();

// ---------- Import / Export ----------
ANSICHTEN.import = () => {
  const schreibbar = TABELLEN_NAMEN.filter((t) => darf(t, "schreiben") && !TABELLEN[t].nurLesen);
  return `<div class="vw-kopf"><h2>📥 Import / Export</h2></div>
    <div class="karte"><h3>Export</h3><div class="knopfreihe"><button class="knopf haupt" data-a="exportJson">💾 Gesamtsicherung (JSON)</button></div><p class="hinweis">Einzelne Tabellen als CSV (Excel): in der jeweiligen Tabelle „📤 CSV“.</p></div>
    <div class="karte"><h3>Import aus CSV (z. B. Schülerliste aus Excel)</h3>
      <div class="feld"><label>Ziel-Tabelle</label><select id="impTab">${schreibbar.map((t) => `<option value="${t}">${TABELLEN[t].sym} ${esc(TABELLEN[t].titel)}</option>`).join("")}</select></div>
      <div class="feld"><label>Datei (.csv, Trenner ; oder ,)</label><input type="file" id="impDatei" accept=".csv,text/csv"></div>
      <button class="knopf" data-a="impVorschau">🔍 Vorschau</button><div id="impErgebnis"></div>
      <p class="hinweis">Spaltenüberschriften dürfen Feldnamen (z. B. <code>vorname</code>) oder Bezeichnungen (z. B. „Vorname“) sein. Mit Spalte <code>id</code> werden vorhandene Datensätze aktualisiert, sonst neu angelegt. Verweise (z. B. Instrumententyp) können per Name angegeben werden.</p></div>`;
};
let IMPORT = null;
AKTIONEN.impVorschau = async () => {
  const tab = $("#impTab").value, datei = $("#impDatei").files[0];
  if (!datei) { toast("Bitte Datei wählen"); return; }
  const roh = csvEin(await datei.text());
  const def = TABELLEN[tab];
  const zuord = (kopf) => { const k = kopf.trim().toLowerCase(); return k === "id" ? { k: "id" } : def.felder.find((f) => f.k.toLowerCase() === k || f.t.toLowerCase() === k); };
  const fehler = [];
  const zeilen = roh.map((r, i) => {
    const o = {};
    for (const [kopf, wert] of Object.entries(r)) {
      const f = zuord(kopf); if (!f) continue;
      let v = wert.trim();
      if (f.k === "id") { if (v) o.id = v; continue; }
      if (f.typ === "ja") v = /^(1|ja|x|true|wahr)$/i.test(v);
      else if (f.typ === "zahl" || f.typ === "geld") v = v === "" ? null : Number(v.replace(",", "."));
      else if (f.typ === "liste" || f.typ === "refs") v = v ? v.split("|").map((x) => x.trim()) : [];
      else if (f.typ === "ref" && v && !hole(f.ref, v)) { const t = liste(f.ref).find((x) => anzeigeName(f.ref, x).toLowerCase() === v.toLowerCase()); if (t) v = t.id; else fehler.push(`Zeile ${i + 2}: „${v}“ nicht in ${TABELLEN[f.ref].titel} gefunden`); }
      else if (f.typ === "wahl" && v && !f.werte[v]) { const k = Object.entries(f.werte).find(([, t]) => t.toLowerCase() === v.toLowerCase())?.[0]; if (k) v = k; else fehler.push(`Zeile ${i + 2}: „${v}“ ist kein gültiger Wert für ${f.t}`); }
      else if (f.typ === "datum" && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)) { const [d, m, y] = v.split("."); v = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
      o[f.k] = v;
    }
    for (const f of def.felder) if (f.pflicht && (o[f.k] == null || o[f.k] === "") && !o.id) fehler.push(`Zeile ${i + 2}: Pflichtfeld „${f.t}“ fehlt`);
    return o;
  });
  IMPORT = { tab, zeilen };
  $("#impErgebnis").innerHTML = `<p><b>${zeilen.length}</b> Zeilen erkannt · ${zeilen.filter((z) => z.id && hole(tab, z.id)).length} Aktualisierungen · ${zeilen.filter((z) => !z.id || !hole(tab, z.id)).length} neu</p>${fehler.length ? `<div class="badge b-rot">${fehler.length} Hinweise</div><ul>${fehler.slice(0, 20).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : '<div class="badge b-gruen">keine Fehler</div>'}<button class="knopf haupt" data-a="impAusfuehren" ${fehler.length ? "" : ""}>📥 Importieren</button>`;
};
AKTIONEN.impAusfuehren = async () => {
  if (!IMPORT) return;
  sicherung();
  const { tab, zeilen } = IMPORT;
  await speichereViele(tab, zeilen.map((z) => (z.id && hole(tab, z.id) ? { ...hole(tab, z.id), ...z } : z)));
  toast(`📥 ${zeilen.length} Datensätze importiert (Sicherung wurde vorher heruntergeladen)`); IMPORT = null; zeichne();
};
function sicherung() {
  const d = Object.fromEntries(TABELLEN_NAMEN.map((t) => [t, liste(t)]));
  herunterladen(`bachkreis-sicherung-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify({ version: APP_VERSION, zeit: new Date().toISOString(), konfig: konfig(), daten: d }), "application/json");
}
AKTIONEN.exportJson = () => sicherung();

// ---------- Abgleich & Protokoll ----------
ANSICHTEN.abgleich = () => {
  const info = datenInfo();
  const prot = liste("aenderungen").slice(-200).reverse();
  return `<div class="vw-kopf"><h2>🔁 Abgleich & Protokoll</h2></div>
    <div class="karte"><p>Datenquelle: <b>${esc(info.art)}</b> · ${esc(info.hinweis || "")}</p><p class="hinweis">Jede Tabelle hat die Abgleich-Spalten <code>version</code>, <code>geaendert_am</code>, <code>geaendert_von</code> und <code>geloescht_am</code> (weiches Löschen). Im Echtbetrieb übernimmt Supabase den Abgleich zwischen App und Verwaltung; ein Spiegel-Job kopiert nach Neon, Backups gehen nach B2.</p></div>
    <div class="vw-geteilt"><div class="vw-tabelle-wrap"><table class="vw-tabelle"><thead><tr><th>Tabelle</th><th>Datensätze</th><th>gelöscht</th><th>letzte Änderung</th></tr></thead><tbody>${TABELLEN_NAMEN.map((t) => { const alle = liste(t); const letzte = alle.reduce((m, z) => (z.geaendert_am > m ? z.geaendert_am : m), ""); return `<tr><td>${TABELLEN[t].sym} bk_${t}</td><td>${alle.length}</td><td>${listeMitGeloeschten(t).length - alle.length}</td><td>${letzte ? vorZeit(letzte) : "–"}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="vw-form"><h3>Änderungsprotokoll</h3><ul class="liste">${prot.map((a) => `<li><div class="fl"><b>${esc(TABELLEN[a.tabelle]?.titel || a.tabelle)}</b> · ${esc(a.aktion)}<div class="zeile-unter">${esc(a.wer)} · ${esc(a.quelle)} · ${vorZeit(a.zeit)}</div></div></li>`).join("") || "<li>leer</li>"}</ul></div></div>`;
};

// ---------- Einstellungen (Konfiguration) ----------
ANSICHTEN.konfig = () => {
  const k = konfig();
  const darfK = (V.ich?.rollen || []).some((r) => ["leitung", "admin"].includes(r));
  const f = (key, t, typ = "text") => `<div class="feld"><label>${t}</label><input type="${typ}" data-konfig="${key}" value="${esc(k[key] ?? "")}" ${darfK ? "" : "disabled"}></div>`;
  return `<div class="vw-kopf"><h2>⚙️ Einstellungen</h2></div><div class="karte" id="konfForm">
    ${f("name", "Name")}${f("untertitel", "Untertitel")}${f("schule_telefon", "Telefon Schule (SOS)")}${f("freigabe_grenze_eur", "Freigabegrenze Leitung (€) – darüber entscheidet der Förderverein", "number")}${f("nachfass_tage", "Nachfassen … Tage vor Antwortfrist", "number")}
    <div class="feld"><label>Notrufnummern (eine je Zeile: Symbol;Bezeichnung;Nummer)</label><textarea data-konfig="notrufe" ${darfK ? "" : "disabled"}>${esc((k.notrufe || []).map((x) => x.join(";")).join("\n"))}</textarea></div>
    ${darfK ? `<button class="knopf haupt" data-a="konfSpeichern">💾 Speichern</button>` : '<p class="hinweis">Nur die Leitung kann die Einstellungen ändern.</p>'}
    <p class="hinweis">Register, Terminarten, Gruppen und Genehmigungsvorlagen sind eigene Tabellen (links in der Seitenleiste) – nichts ist fest eingebaut.</p></div>`;
};
AKTIONEN.konfSpeichern = async () => {
  for (const el of $$("[data-konfig]")) {
    let v = el.value;
    if (el.dataset.konfig === "notrufe") v = v.split("\n").map((z) => z.split(";").map((x) => x.trim())).filter((z) => z.length === 3);
    else if (el.type === "number") v = Number(v);
    await konfigSetzen(el.dataset.konfig, v);
  }
  toast("💾 Einstellungen gespeichert");
};

// ---------- Start ----------
async function starten() {
  const e = (() => { try { return JSON.parse(localStorage.getItem("bk_einstellungen") || "{}"); } catch { return {}; } })();
  const dunkel = e.thema === "dunkel" || ((!e.thema || e.thema === "auto") && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dunkel", dunkel);
  aktionenStarten();
  await datenStarten({ quelle: "verwaltung" });
  let id = null; try { id = sessionStorage.getItem("bk_vw_ich"); } catch {}
  demoLeiste();
  if (id && hole("personen", id)) anmelden(id); else anmeldung();
  abonnieren(() => {
    const f = document.activeElement;
    if (f && /INPUT|TEXTAREA|SELECT/.test(f.tagName) && $("#vw").contains(f)) return;
    if (V.ich) zeichne();
  });
}
starten().catch((e) => { console.error(e); $("#vw").innerHTML = `<div class="karte">⚠️ Start fehlgeschlagen: ${esc(e.message)}</div>`; });
