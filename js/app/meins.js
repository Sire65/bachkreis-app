// Meins (Daten, Änderung melden, Einstellungen, Test an mich), Technik (Sicherheits-Check, Hilfe, Über, Update, Demo)
// und Admin-Blätter (Leitstand). Vorbild: KC Club „Meins“/„Technik“/„Admin“.
import { S, VIEWS, db, zeige, zurueck, kopf, name, einst, einstSetzen, istLeitung, istEltern, istVerwalter, fehlerListe } from "./zustand.js";
import { KACHELN, kachelnFuer, REGISTER_ALLE, adminZustaende } from "./start.js";
import { esc, AKTIONEN, datumKurz, uhr, vorZeit, toast, blatt, formWerte, herunterladen, frage } from "../kern/ui.js";
import { liste, hole, speichere, datenInfo, zuruecksetzen, ADAPTER } from "../kern/daten.js";
import { TABELLEN, TABELLEN_NAMEN } from "../kern/schema.js";
import { kinderVon, elternVon, wirksameGruppen, instrumenteVon, tagIso } from "../kern/logik.js";
import { EREIGNISSE, KANAELE, wahlVon, senden, versandStatistik, adapterInfo } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";

// ---------- Meine Daten (Auskunft) ----------
VIEWS.meinedaten = {
  render() {
    const p = S.ich;
    const felder = TABELLEN.personen.felder.filter((f) => p[f.k] != null && p[f.k] !== "" && !(Array.isArray(p[f.k]) && !p[f.k].length));
    return kopf("🔐 Meine Daten") + `<div class="karte"><h3>${esc(name(p))}</h3><ul class="liste">${felder.map((f) => `<li><div class="fl"><div class="zeile-unter">${esc(f.t)}</div><div>${esc(Array.isArray(p[f.k]) ? p[f.k].join(", ") : typeof p[f.k] === "boolean" ? (p[f.k] ? "ja" : "nein") : p[f.k])}</div></div></li>`).join("")}</ul></div>
      ${istEltern() ? `<div class="karte"><h3>Meine Kinder</h3>${kinderVon(db, p.id).map((k) => esc(name(k))).join(", ")}</div>` : `<div class="karte"><h3>Gruppe & Instrumente</h3>${wirksameGruppen(db, p.id).map((g) => esc(hole("gruppen", g)?.name)).join(", ") || "–"}<br>${instrumenteVon(db, p.id).map((i) => esc(hole("instrument_typen", i.typ_id)?.name)).join(", ")}</div>`}
      <div class="knopfreihe"><button class="knopf" data-a="meineDatenExport">💾 Als Datei sichern</button><button class="knopf" data-a="drucken">🖨️ Drucken</button><button class="knopf" data-a="kachel" data-x="aenderung">✏️ Änderung melden</button></div>
      <p class="hinweis">Auskunft nach DSGVO Art. 15. Änderungen übernimmt die Leitung nach Prüfung.</p>`;
  },
};
AKTIONEN.meineDatenExport = () => {
  const id = S.ich.id;
  const daten = { person: S.ich, antworten: liste("antworten", (a) => a.person_id === id), gruppen: liste("gruppe_zuordnung", (z) => z.person_id === id), instrumente: liste("person_instrument", (x) => x.person_id === id), ausleihen: liste("ausleihen", (a) => a.person_id === id), genehmigungen: liste("genehmigungen", (g) => g.kind_id === id || g.beantwortet_von === id) };
  herunterladen(`meine-daten-${tagIso(new Date())}.json`, JSON.stringify(daten, null, 2), "application/json");
};

VIEWS.aenderung = {
  render() {
    return kopf("✏️ Änderung melden") + `<div class="karte" id="aeForm"><div class="feld"><label>Was hat sich geändert?</label><select name="art"><option>Anschrift</option><option>Telefon / Handy</option><option>E-Mail</option><option>Instrument</option><option>Gesundheit / Notfall</option><option>Sonstiges</option></select></div>
      <div class="feld"><label>Neue Angaben</label><textarea name="text"></textarea></div><button class="knopf haupt breit" data-a="aeSenden">📨 An die Leitung senden</button><p class="hinweis">Die Leitung prüft und trägt die Änderung in der PC-Verwaltung ein.</p></div>`;
  },
};
AKTIONEN.aeSenden = async () => {
  const f = formWerte(document.getElementById("aeForm"));
  if (!f.text.trim()) return;
  await speichere("aufgaben", { titel: `Änderung ${f.art}: ${name(S.ich)}`, art: "aenderung", status: "offen", von_id: S.ich.id, zustaendig_id: db.konfig().leitung_id, text: f.text, frist: tagIso(new Date(Date.now() + 7 * 86400000)) });
  toast("✏️ Änderung gemeldet"); zurueck();
};

// ---------- Einstellungen ----------
VIEWS.einstellungen = {
  render() {
    const e = einst();
    const sch = (k, t, x = "") => `<label class="schalter"><span><b>${t}</b>${x ? `<div class="hinweis">${x}</div>` : ""}</span><input type="checkbox" data-c="einstSchalter" data-x="${k}" ${e[k] ? "checked" : ""}></label>`;
    const wahl = (k, t, opts) => `<div class="feld"><label>${t}</label><div class="umschalter">${opts.map(([v, n]) => `<button class="${e[k] === v ? "an" : ""}" data-a="einstWahl" data-x="${k}|${v}">${n}</button>`).join("")}</div></div>`;
    const ereignisse = Object.entries(EREIGNISSE);
    const kanaele = ["push", "mail", "app"];
    return kopf("⚙️ Meine Einstellungen") + `<div class="karte"><h3>Darstellung <span class="hinweis">(dieses Gerät)</span></h3>
      ${wahl("thema", "Design", [["auto", "Automatisch"], ["hell", "☀️ Tag"], ["dunkel", "🌙 Nacht"]])}
      ${wahl("schrift", "Schriftgröße", [["normal", "Normal"], ["gross", "Groß"], ["riesig", "Sehr groß"]])}
      ${sch("einfach", "Einfache Ansicht", "Große Kacheln, nur das Wichtigste – ohne Register")}
      ${sch("effekte", "Kachel-Effekte", "Kacheln erscheinen mit kleiner Animation")}
      <div class="feld"><label>Start-Register</label><select data-c="einstStartReg">${REGISTER_ALLE.map(([r, n]) => `<option value="${r}" ${e.startRegister === r ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <div class="karte"><h3>Benachrichtigungen</h3><p class="hinweis">Wähle für jedes Ereignis, wie du benachrichtigt wirst.</p>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><tr><th></th>${kanaele.map((k) => `<th style="font-size:.8rem">${KANAELE[k]}</th>`).join("")}</tr>${ereignisse.map(([k, t]) => `<tr><td style="padding:6px 0;font-weight:700;font-size:.9rem">${t}</td>${kanaele.map((c) => `<td style="text-align:center"><input type="checkbox" data-c="benachWahl" data-x="${k}|${c}" ${wahlVon(S.ich, k).includes(c) ? "checked" : ""} ${k === "sos" && c === "push" ? "disabled" : ""}></td>`).join("")}</tr>`).join("")}</table></div>
      ${sch("ruhe", "Nicht stören", `Keine Push-Töne von ${e.ruheVon} bis ${e.ruheBis} Uhr (SOS kommt immer durch)`)}
      <div class="knopfreihe"><button class="knopf" data-a="pushErlauben">🔔 Push auf diesem Gerät erlauben</button></div></div>
      <div class="karte"><h3>Kacheln</h3><p class="hinweis">Ausgeblendete Kacheln bleiben hier erreichbar.</p>${["bachkreis", "meins", "technik"].map((r) => `<h4>${REGISTER_ALLE.find(([x]) => x === r)[1]}</h4>${KACHELN[r].filter((k) => !k.nur || k.nur()).map((k) => `<label class="schalter"><span>${k.sym} ${esc(typeof k.t === "function" ? k.t() : k.t)}</span><span><button class="knopf klein" data-a="kachelSchieben" data-x="${r}|${k.id}|-1">▲</button> <input type="checkbox" data-c="kachelSichtbar" data-x="${k.id}" ${e.kachelnAus.includes(k.id) ? "" : "checked"}></span></label>`).join("")}`).join("")}
      <button class="knopf" data-a="kachelnStandard">↺ Standard</button></div>`;
  },
};
AKTIONEN.einstSchalter = (_, el) => { einstSetzen(el.dataset.x, el.checked); zeige("einstellungen", {}, { ersetzen: true }); };
AKTIONEN.einstWahl = (x) => { const [k, v] = x.split("|"); einstSetzen(k, v); zeige("einstellungen", {}, { ersetzen: true }); };
AKTIONEN.einstStartReg = (v) => einstSetzen("startRegister", v);
AKTIONEN.benachWahl = async (_, el) => {
  const [ereignis, kanal] = el.dataset.x.split("|");
  const b = { ...(S.ich.benachrichtigung || {}) };
  const w = new Set(wahlVon(S.ich, ereignis));
  if (el.checked) w.add(kanal); else w.delete(kanal);
  b[ereignis] = [...w];
  S.ich = await speichere("personen", { ...S.ich, benachrichtigung: b });
  toast("Gespeichert");
};
AKTIONEN.kachelSichtbar = (_, el) => { const aus = new Set(einst().kachelnAus); if (el.checked) aus.delete(el.dataset.x); else aus.add(el.dataset.x); einstSetzen("kachelnAus", [...aus]); };
AKTIONEN.kachelSchieben = (x) => {
  const [r, id] = x.split("|");
  const reihe = kachelnFuer(r).map((k) => k.id);
  const i = reihe.indexOf(id); if (i <= 0) return;
  [reihe[i - 1], reihe[i]] = [reihe[i], reihe[i - 1]];
  einstSetzen("reihenfolge", { ...einst().reihenfolge, [r]: reihe });
  zeige("einstellungen", {}, { ersetzen: true });
};
AKTIONEN.kachelnStandard = () => { einstSetzen("kachelnAus", []); einstSetzen("reihenfolge", {}); zeige("einstellungen", {}, { ersetzen: true }); };
AKTIONEN.pushErlauben = async () => {
  if (!("Notification" in globalThis)) { toast("Dieses Gerät unterstützt keine Benachrichtigungen"); return; }
  const r = await Notification.requestPermission();
  toast(r === "granted" ? "🔔 Erlaubt – teste mit „Test an mich“" : "Nicht erlaubt (in den Browser-Einstellungen änderbar)");
};

// ---------- Test an mich ----------
VIEWS.test = {
  render() {
    return kopf("🧪 Test an mich") + `<div class="karte"><p>Schickt eine Test-Benachrichtigung an dich. Auf diesem Gerät erscheint eine echte Benachrichtigung, wenn du Push erlaubt hast; E-Mail wird in der Vorführversion nur simuliert.</p>
      <div class="knopfreihe"><button class="knopf haupt" data-a="testSenden">🔔 Test senden</button><button class="knopf" data-a="pushErlauben">Push erlauben</button></div></div>`;
  },
};
AKTIONEN.testSenden = async () => {
  const s = await senden({ an: [S.ich.id], betreff: "Test vom Bachkreis", text: "Wenn du das liest, funktionieren Benachrichtigungen. 🎻", ereignis: "nachricht", kanaele: ["push", "mail"] });
  toast(`🧪 Test: ${s.push} Push, ${s.mail} Mail (simuliert)${globalThis.Notification?.permission === "granted" ? " + Benachrichtigung auf diesem Gerät" : ""}`);
};

// ---------- Technik ----------
VIEWS.sicherheit = {
  render() {
    const p = [];
    const ok = (b, t, x) => p.push(`<li><i class="led ${b === null ? "grau" : b ? "gruen" : "rot"}"></i><div class="fl"><b>${t}</b><div class="zeile-unter">${esc(x)}</div></div></li>`);
    ok(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1", "Sichere Verbindung (HTTPS)", location.protocol);
    ok("serviceWorker" in navigator ? !!navigator.serviceWorker.controller : null, "Offline-Speicher (Service Worker)", navigator.serviceWorker?.controller ? "aktiv – App startet auch ohne Netz" : "noch nicht aktiv (nach erstem Neuladen)");
    ok("indexedDB" in globalThis, "Lokale Datenbank", datenInfo().speicher || "–");
    ok(datenInfo().server ? true : null, "Server-Verbindung", datenInfo().server ? "verbunden" : "Vorführversion – kein Server (grau = unbekannt)");
    ok(!/[?&]k=/.test(location.search), "Zugangslink nicht in der Adresszeile", /[?&]k=/.test(location.search) ? "Bitte Lesezeichen ohne ?k= setzen" : "ok");
    ok("Notification" in globalThis ? Notification.permission !== "denied" : null, "Benachrichtigungen", "Notification" in globalThis ? Notification.permission : "nicht unterstützt");
    return kopf("🛡️ Sicherheits-Check") + `<div class="karte"><ul class="liste">${p.join("")}</ul></div><p class="hinweis">Grün = geprüft und ok · Rot = Problem · Grau = unbekannt (nie „ok“).</p>`;
  },
};
VIEWS.hilfe = {
  render() {
    const t = [
      ["📅 Zu- oder absagen", "Termine › bei jedem Termin ✅ Zusage, 🤔 Vielleicht oder ❌ Absage antippen. Eltern sagen für ihre Kinder zu."],
      ["🏖️ Längere Abwesenheit", "Meins › Abwesenheit: Zeitraum wählen – alle Termine darin werden auf einmal abgesagt."],
      ["🎼 Meine Noten", "Meins › Meine Noten zeigt automatisch die Stimmen für dein Instrument und deine Gruppe."],
      ["🔀 Gruppen A–D", "Stammgruppe gilt dauerhaft, temporäre Zuordnungen (z. B. Aushilfe) laufen automatisch aus."],
      ["🧭 Cockpit (Leitung)", "Zeigt sortiert nach Dringlichkeit, was heute ansteht und wo Antworten, Genehmigungen oder Freigaben fehlen."],
      ["💻 PC-Verwaltung", "Adressen, Instrumente, Gruppen, Zugänge und Import/Export werden bequem am PC oder Notebook gepflegt (Technik › PC-Verwaltung)."],
      ["🟢 WhatsApp", "Die App öffnet WhatsApp mit fertigem Text – du wählst Kontakt oder Gruppe und drückst selbst auf Senden."],
      ["🧪 Vorführversion", "Alle Personen sind erfunden. Daten liegen nur in diesem Browser. Oben „Ansicht als“ wechselt die Rolle."],
    ];
    return kopf("❓ Hilfe & Tipps") + t.map(([a, b]) => `<details class="karte"><summary><b>${a}</b></summary><p>${b}</p></details>`).join("");
  },
};
VIEWS.ueber = {
  render() {
    const i = datenInfo();
    return kopf("ℹ️ Über die App") + `<div class="karte"><h3>Bachkreis-App</h3><p>Version <b>${APP_VERSION} ${APP_STUFE}</b></p><p>Datenquelle: <b>${esc(ADAPTER[i.art]?.name || i.art)}</b><br><span class="hinweis">${esc(i.hinweis || "")} · Speicher: ${esc(i.speicher || "")}</span></p>
      <p>Versand-Adapter: ${adapterInfo().map((a) => esc(a.name)).join(" · ")} · WhatsApp-Übergabe (wa.me)</p>
      <p class="hinweis">Abgeleitet aus der KC Club App (Muster für Termine, Zusagen, Nachrichten, SOS, Register & Kacheln). Kostenfrei: keine kostenpflichtigen Dienste oder APIs.</p>
      <p class="hinweis">Mitgelieferte Bibliothek: qrcode-generator (Kazuhiko Arase, MIT-Lizenz).</p></div>`;
  },
};
AKTIONEN.updatePruefen = async () => {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) { toast(`Installiert: v${APP_VERSION} – kein Offline-Speicher aktiv`); return; }
  await reg.update();
  if (reg.waiting) document.dispatchEvent(new CustomEvent("bk-update", { detail: reg.waiting }));
  else toast(`✅ Aktuell: v${APP_VERSION} ${APP_STUFE}`);
};
AKTIONEN.verwaltungOeffnen = () => { window.open("verwaltung.html", "_blank"); };
AKTIONEN.demoReset = async () => {
  if (!(await frage("Alle Demodaten neu erzeugen? Deine Änderungen in der Vorführversion gehen verloren."))) return;
  await zuruecksetzen();
  location.reload();
};

// ---------- Admin-Blätter ----------
VIEWS.admin = {
  render({ blatt: b }) {
    const z = adminZustaende()[b] || ["grau", ""];
    let inhalt = "";
    if (b === "versand") {
      const v = liste("versand").slice(-60).reverse();
      const st = versandStatistik();
      inhalt = `<p>${st.gesamt} Einträge · heute ${st.heute} · Fehler ${st.fehler}</p><ul class="liste">${v.map((x) => `<li><div class="fl"><div class="zeile-titel">${esc(KANAELE[x.kanal] || x.kanal)} → ${esc(name(x.an_id))}</div><div class="zeile-unter">${esc(x.betreff || "")} · ${vorZeit(x.zeit)}</div></div><span class="badge ${x.status === "fehler" ? "b-rot" : x.status === "simuliert" ? "b-grau" : "b-gruen"}">${esc(x.status)}</span></li>`).join("") || "<li>noch nichts versendet</li>"}</ul>`;
    } else if (b === "abgleich") {
      const a = liste("aenderungen").slice(-80).reverse();
      inhalt = `<p class="hinweis">Jede Änderung (App, PC-Verwaltung, Import) wird mit Version, Zeit und Person protokolliert. Im Echtbetrieb gleicht Supabase damit alle Geräte ab und spiegelt nach Neon.</p><ul class="liste">${a.map((x) => `<li><div class="fl"><div class="zeile-titel">${esc(TABELLEN[x.tabelle]?.titel || x.tabelle)} · ${esc(x.aktion)}</div><div class="zeile-unter">${esc(x.wer)} · ${esc(x.quelle)} · ${vorZeit(x.zeit)}</div></div></li>`).join("") || "<li>noch keine Änderungen</li>"}</ul>`;
    } else if (b === "zugaenge") {
      const zs = liste("zugaenge");
      inhalt = `<p>${zs.filter((x) => x.aktiv).length} aktive Zugänge · ${zs.filter((x) => x.aktiv && !x.zuletzt).length} nie angemeldet</p><p class="hinweis">Zugänge (Codes, QR-Karten, Sperren, Verwaltungsrecht) werden außerhalb der App in der PC-Verwaltung gepflegt.</p><button class="knopf haupt" data-a="verwaltungOeffnen">💻 PC-Verwaltung öffnen</button>`;
    } else if (b === "fehler") {
      const f = fehlerListe().reverse();
      inhalt = `<ul class="liste">${f.map((x) => `<li><div class="fl"><div class="zeile-titel">${esc(x.text)}</div><div class="zeile-unter">${esc(x.view)} · ${vorZeit(x.zeit)}</div></div></li>`).join("") || "<li>Keine Fehler protokolliert.</li>"}</ul>`;
    } else if (b === "speicher") {
      inhalt = `<p id="speicherWert">wird gemessen …</p>`;
    } else if (b === "backup") {
      inhalt = `<p>Kompletter Export aller Tabellen als Datei (Vorführversion). Im Echtbetrieb: tägliche Sicherung nach Backblaze B2 und Spiegel nach Neon.</p><button class="knopf haupt" data-a="exportAlles">💾 Alles exportieren</button>`;
    } else if (b === "daten") {
      const i = datenInfo();
      inhalt = `<p>Adapter: <b>${esc(i.art)}</b> · Speicher: ${esc(i.speicher || "")}</p><ul class="liste">${TABELLEN_NAMEN.map((t) => `<li><div class="fl">${TABELLEN[t].sym} ${esc(TABELLEN[t].titel)}</div><b>${liste(t).length}</b></li>`).join("")}</ul>`;
    } else inhalt = `<p>${esc(z[1])}</p>`;
    return kopf(`<span class="punkt ${z[0]}"></span> ${esc(b)}`) + `<div class="karte">${inhalt}</div>`;
  },
  async nach(_, { blatt: b }) {
    if (b === "speicher" && navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      const el = document.getElementById("speicherWert");
      if (el) el.textContent = `${(e.usage / 1048576).toFixed(1)} MB von ${(e.quota / 1048576).toFixed(0)} MB belegt`;
    }
  },
};
AKTIONEN.exportAlles = () => {
  const d = Object.fromEntries(TABELLEN_NAMEN.map((t) => [t, liste(t)]));
  herunterladen(`bachkreis-export-${tagIso(new Date())}.json`, JSON.stringify(d, null, 1), "application/json");
};
