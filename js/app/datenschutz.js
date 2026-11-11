// ⚖️ Datenschutz & Nutzungsregeln (0.55.0): Datenschutzerklärung (aus den Impressum-Angaben zusammengesetzt), Nutzungsregeln,
// Zustimmung beim ersten Start (und wieder, wenn sich die Fassung DS_VERSION ändert) – Eltern stimmen auch für ihre Kinder unter 16 zu.
// Nachweis-Liste für Leitung/Vorstand. Texte sind ein MUSTER – vor dem Echtbetrieb vom Vorstand prüfen lassen (docs/rechtliches/).
import { S, VIEWS, zeichne, kopf, name, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { DS_VERSION, ZUSTIMMUNG_NACHWEIS } from "../kern/schema.js";

const stand = new Date(DS_VERSION).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
const alter = (p) => { if (!p?.geburtsdatum) return null; const g = new Date(p.geburtsdatum), h = new Date(); let a = h.getFullYear() - g.getFullYear(); if (h < new Date(h.getFullYear(), g.getMonth(), g.getDate())) a--; return a; };
const unter16 = (p) => p?.typ === "schueler" && (alter(p) ?? 99) < 16;
const kinder = () => liste("eltern_kind", (e) => e.eltern_id === S.ich?.id).map((e) => hole("personen", e.kind_id)).filter((p) => p && p.status !== "ausgetreten");
const hat = (fuer, art) => liste("zustimmungen", (z) => z.fuer_id === fuer && z.art === art && z.fassung === DS_VERSION).length > 0;
const muster = () => (hatRolle(...ZUSTIMMUNG_NACHWEIS) ? '<p class="badge b-gelb">📝 Muster – bitte vor dem Echtbetrieb vom Vorstand prüfen lassen (Unterlagen: docs/rechtliches/).</p>' : "");
const feld = (k, ersatz) => esc(String(konfig()[k] || "").trim() || ersatz).replace(/\n/g, "<br>");

// ---------- Datenschutzerklärung ----------
export function datenschutzHtml() {
  const k = konfig(), verein = esc(k.impressum_name || k.name || "Bachkreis Bergkamen");
  return `<div class="ds-text">
  <h3>1. Wer ist verantwortlich?</h3><p>${verein}<br>${feld("impressum_anschrift", "[Anschrift eintragen]")}<br>Vertreten durch: ${feld("impressum_vertreten", "[Vorstand eintragen]")}<br>Kontakt: ${feld("impressum_kontakt", "[Telefon / E-Mail eintragen]")}</p>
  <p>Ansprechpartner für Datenschutz: ${feld("datenschutz_kontakt", "der Vorstand (siehe oben)")}</p>
  <h3>2. Wofür ist die App da – und welche Daten nutzt sie?</h3>
  <p>Die Bachkreis-App organisiert das Orchesterleben: Termine und Zusagen, Nachrichten, Noten, Instrumente und Leihverträge, Fahrten und Konzerte. Dafür verarbeitet sie:</p>
  <ul><li><b>Stammdaten:</b> Name, Anschrift, Geburtsdatum (bei Schülerinnen und Schülern), Telefon, E-Mail, Gruppe und Instrument, Eltern-Kind-Zuordnung.</li>
  <li><b>Orchesterbetrieb:</b> Zu- und Absagen, Anwesenheit, Übe-Einträge, Ausleihen und Leihverträge (mit Unterschrift), Reiseanmeldungen, Erstattungen.</li>
  <li><b>Nachrichten und Dateien:</b> Chats, Anhänge, Fotos, Sprachnachrichten, Eingangskorb. 🔒 Geheime Nachrichten sind Ende-zu-Ende verschlüsselt – auch der Server kann sie nicht lesen.</li>
  <li><b>Besonders geschützte Daten nur mit Einwilligung:</b> Gesundheitsangaben für Notfälle (Allergien, Medikamente) und Fotos – je Zweck einzeln, jederzeit widerrufbar.</li>
  <li><b>Technik:</b> Anmeldung (Zugangscode, nur verschlüsselt gespeichert), Geräteart, Zeitpunkt der letzten Nutzung, Fehlerberichte ohne Inhalte. Bei Anrufen und am Runden Tisch werden Ton und Bild direkt von Gerät zu Gerät übertragen und <b>nicht aufgezeichnet</b>.</li></ul>
  <h3>3. Rechtsgrundlagen</h3>
  <p>Mitgliedschaft und Orchesterbetrieb (Art. 6 Abs. 1 lit. b DSGVO), gesetzliche Pflichten etwa bei Spenden und Kasse (lit. c), Einwilligung für Fotos und Gesundheitsangaben (lit. a, Art. 9 Abs. 2 lit. a), berechtigtes Interesse an einem sicheren Betrieb, z. B. Schutz vor fremden Anmeldeversuchen (lit. f).</p>
  <h3>4. Kinder und Jugendliche</h3>
  <p>Für Mitglieder unter 16 Jahren stimmen die Eltern zu. Kinder chatten privat nur mit Leitung, Lehrkräften und den eigenen Eltern; Geheim-Chats, Runder Tisch und Fernhilfe sind nur für Erwachsene. Eltern sehen die Angaben ihrer Kinder, ab 18 nur noch mit deren Erlaubnis.</p>
  <h3>5. Wer bekommt die Daten?</h3>
  <p>Nur, wer sie für seine Aufgabe braucht (Leitung, Lehrkräfte, Registerführung, Vorstand – jeweils nur den nötigen Teil). Keine Werbung, kein Verkauf, kein Tracking. Technische Dienstleister (Auftragsverarbeiter) mit Vertrag:</p>
  <ul><li><b>Supabase</b> – Datenbank und Server (Rechenzentrum in der EU).</li><li><b>Brevo</b> – E-Mail-Versand (EU).</li><li><b>GitHub Pages</b> – stellt die App-Dateien bereit (Programm, keine Mitgliederdaten).</li>
  <li><b>Backups:</b> verschlüsselte Sicherungskopien bei Neon und Backblaze (EU).</li><li><b>Wetter:</b> Open-Meteo (nur der Ort, keine Personendaten). <b>Anrufe:</b> Ein STUN-Server hilft beim Verbindungsaufbau (sieht nur die Internet-Adresse).</li></ul>
  <h3>6. Wie lange?</h3>
  <p>Solange die Mitgliedschaft besteht. Danach werden Daten gelöscht oder auf das Nötigste reduziert (Ehemalige auf Wunsch). Feste Fristen: Anklopfen nach 7 Tagen, Anruf-Vermittlung nach 2 Tagen, Versand-Protokolle nach 30 Tagen, Gesundheitsangaben nach Ablauf, Änderungsprotokoll nach 12 Monaten, Kassen- und Spendenbelege nach den gesetzlichen Fristen.</p>
  <h3>7. Auf dem Gerät</h3>
  <p>Die App speichert eine Kopie deiner Daten und deine Einstellungen auf dem Gerät, damit sie auch ohne Netz funktioniert. Keine Werbe- oder Tracking-Cookies.</p>
  <h3>8. Deine Rechte</h3>
  <p>Auskunft (in der App unter <b>🔐 Meine Daten</b> jederzeit selbst), Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Widerruf von Einwilligungen – formlos beim Vorstand. Beschwerde bei der Aufsichtsbehörde: Landesbeauftragte für Datenschutz und Informationsfreiheit NRW, Düsseldorf.</p>
  <p class="hinweis">Stand: ${esc(stand)} (Fassung ${esc(DS_VERSION)})</p></div>`;
}
export function regelnHtml() {
  return `<div class="ds-text"><ol class="ds-regeln">
  <li><b>Freundlich bleiben.</b> Wie in der Probe: respektvoll schreiben, niemanden ausschließen oder bloßstellen.</li>
  <li><b>Fotos und Daten bleiben im Bachkreis.</b> Keine Screenshots, Fotos oder Kontaktdaten anderer weitergeben oder posten.</li>
  <li><b>Kinder schützen.</b> Keine privaten Treffen über die App ausmachen, ohne dass Eltern und Leitung Bescheid wissen. Komisches sofort melden (🆘 oder „Klappt etwas nicht?“).</li>
  <li><b>Dein Zugang gehört nur dir.</b> Code und QR-Link nicht weitergeben; verloren? → Leitung, die sperrt ihn und gibt einen neuen.</li>
  <li><b>Zusagen ernst nehmen.</b> Bitte rechtzeitig zu- oder absagen – das Orchester plant damit.</li>
  <li><b>Leihinstrumente pfleglich behandeln</b> – es gilt der Leihvertrag.</li>
  <li><b>Wer sich nicht daran hält,</b> kann von der Leitung zeitweise gesperrt werden.</li></ol></div>`;
}
VIEWS.datenschutz = { render: () => kopf("⚖️ Datenschutz") + muster() + `<div class="karte">${datenschutzHtml()}</div><div class="knopfreihe"><button type="button" class="knopf" data-a="dsDrucken">🖨️ Drucken / PDF</button><button type="button" class="knopf" data-a="kachel" data-x="nutzungsregeln">📜 Nutzungsregeln</button><button type="button" class="knopf" data-a="kachel" data-x="meinedaten">🔐 Meine Daten</button></div>` };
VIEWS.nutzungsregeln = { render: () => kopf("📜 Nutzungsregeln") + muster() + `<div class="karte">${regelnHtml()}</div><div class="knopfreihe"><button type="button" class="knopf" data-a="kachel" data-x="datenschutz">⚖️ Datenschutz</button></div>` };
AKTIONEN.dsDrucken = async () => (await import("./druckvorschau.js")).druckVorschau({ titel: "Datenschutzerklärung", html: `<h1>Datenschutzerklärung</h1>${datenschutzHtml()}<h1>Nutzungsregeln</h1>${regelnHtml()}` });

// ---------- Zustimmung beim ersten Start ----------
export function zustimmungPruefen({ vorschau = false } = {}) {
  if (!S.ich || document.getElementById("zsFenster")) return;
  const ich = S.ich.id, fehltIch = ["datenschutz", "regeln"].some((a) => !hat(ich, a)), ks = kinder().filter((k) => unter16(k) && (vorschau || !hat(k.id, "datenschutz")));
  if (!vorschau && !fehltIch && !ks.length) return;
  const kind = unter16(S.ich), f = document.createElement("div");
  f.id = "zsFenster"; f.className = "zs-fenster"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-labelledby", "zsTitel");
  f.innerHTML = `<div class="zs-blatt"><h2 id="zsTitel">👋 Willkommen in der Bachkreis-App</h2>
    <p>${kind ? "Bevor es losgeht: Bitte lies dir die <b>Regeln</b> durch. Deine Eltern haben die Datenschutz-Infos bekommen." : "Bevor es losgeht, bitte kurz lesen und bestätigen:"}</p>
    <details class="zs-klappe"><summary>⚖️ Datenschutzerklärung lesen</summary>${datenschutzHtml()}</details>
    <details class="zs-klappe" ${kind ? "open" : ""}><summary>📜 Nutzungsregeln lesen</summary>${regelnHtml()}</details>
    ${kind ? "" : '<label class="zs-haken"><input type="checkbox" id="zsDs"><span>Ich habe die <b>Datenschutzerklärung</b> gelesen.</span></label>'}
    <label class="zs-haken"><input type="checkbox" id="zsRegeln"><span>Ich halte mich an die <b>Nutzungsregeln</b>.</span></label>
    ${ks.length ? `<fieldset class="zs-kinder"><legend>Auch für meine Kinder unter 16 zustimmen:</legend>${ks.map((k) => `<label class="zs-haken"><input type="checkbox" data-kind="${esc(k.id)}" checked><span>${esc(name(k))}</span></label>`).join("")}</fieldset>` : ""}
    <button type="button" class="knopf haupt breit" data-a="zsZustimmen">✅ Zustimmen und loslegen</button>${vorschau ? '<button type="button" class="knopf breit" data-a="zsVorschauZu">✕ Vorschau schließen</button>' : ""}
    <p class="hinweis">Stand ${esc(stand)}. Du kannst alles später unter ⚙️ › Datenschutz nachlesen. Widerruf und Fragen: beim Vorstand.</p></div>`;
  document.body.appendChild(f); f.querySelector("summary")?.focus();
}
AKTIONEN.zsZustimmen = async () => {
  const ds = document.getElementById("zsDs"), rg = document.getElementById("zsRegeln"), kind = !ds;
  if ((ds && !ds.checked) || !rg?.checked) return toast("Bitte beide Häkchen setzen – sonst kann es nicht losgehen.");
  const ich = S.ich.id, arten = kind ? ["regeln"] : ["datenschutz", "regeln"], zeit = () => new Date().toISOString();
  try {
    for (const a of arten) if (!hat(ich, a)) await speichere("zustimmungen", { person_id: ich, fuer_id: ich, art: a, fassung: DS_VERSION, zeit: zeit() }, { still: true });
    for (const el of document.querySelectorAll("#zsFenster [data-kind]:checked")) for (const a of ["datenschutz", "regeln"]) if (!hat(el.dataset.kind, a)) await speichere("zustimmungen", { person_id: ich, fuer_id: el.dataset.kind, art: a, fassung: DS_VERSION, zeit: zeit() }, { still: true });
    document.getElementById("zsFenster")?.remove(); toast("✅ Danke – viel Freude mit der App!"); zeichne();
    document.dispatchEvent(new CustomEvent("bk-zugestimmt")); // 🎓 0.65.0 danach die Einführung
  } catch (e) { toast("⚠️ " + (e.message || "Speichern ging nicht – bitte gleich nochmal")); }
};
AKTIONEN.zsVorschau = () => zustimmungPruefen({ vorschau: true });
AKTIONEN.zsVorschauZu = () => document.getElementById("zsFenster")?.remove();

// ---------- Nachweis für Leitung/Vorstand ----------
VIEWS.zustimmungen = {
  render() {
    if (!hatRolle(...ZUSTIMMUNG_NACHWEIS)) return kopf("⚖️ Zustimmungen") + '<p class="hinweis">Nur für Leitung und Vorstand.</p>';
    const pers = liste("personen", (p) => p.status === "aktiv" && ["schueler", "eltern", "lehrkraft", "leitung", "foerderverein", "ehemalig"].includes(p.typ)).sort((a, b) => name(a).localeCompare(name(b)));
    const z = (p, a) => liste("zustimmungen", (x) => x.fuer_id === p.id && x.art === a && x.fassung === DS_VERSION)[0];
    const fehlen = pers.filter((p) => !(unter16(p) ? z(p, "datenschutz") : z(p, "datenschutz") && z(p, "regeln")));
    const zeile = (p) => { const d = z(p, "datenschutz"), r = z(p, "regeln"); return `<tr><td>${esc(name(p))}${unter16(p) ? " <small>(u16)</small>" : ""}</td><td>${d ? `✅ ${esc(new Date(d.zeit).toLocaleDateString("de-DE"))}${d.person_id !== p.id ? ` <small>durch ${esc(name(d.person_id))}</small>` : ""}` : "❌"}</td><td>${r ? "✅" : "❌"}</td></tr>`; };
    return kopf("⚖️ Zustimmungen") + `<p class="hinweis">Fassung ${esc(DS_VERSION)} · ${pers.length - fehlen.length} von ${pers.length} haben zugestimmt.</p>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="drucken">🖨️ Nachweis drucken / PDF</button><button type="button" class="knopf" data-a="zsVorschau">👁️ So sieht die Abfrage aus</button></div>
      ${fehlen.length ? `<div class="karte"><h3>❌ Fehlt noch (${fehlen.length})</h3><p>${fehlen.map((p) => esc(name(p))).join(", ")}</p></div>` : ""}
      <div class="karte"><table class="tabelle"><thead><tr><th>Person</th><th>Datenschutz</th><th>Regeln</th></tr></thead><tbody>${pers.map(zeile).join("")}</tbody></table></div>`;
  },
};
