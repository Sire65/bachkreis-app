// ⚙️ Mehr – Einstellungen aufgebaut wie in der KC Club App (Klappbereiche): Das Wichtigste · Benachrichtigungen · Ansagen, Töne & Tipps ·
// Privatsphäre · Termine im Handy-Kalender · Darstellung (Farbdesign, Themen, Tag/Nacht, Schrift, Chat-Farben, Sparmodus) · Effekte ·
// Startseite & Ansicht · App-Installation · App-Info. Fast alles gilt nur für dieses Gerät; die Privatsphäre wird beim Server gemerkt.
import { S, VIEWS, kopf, einst, einstSetzen, zeige, istEltern } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt } from "../kern/ui.js";
import { speichere, datenInfo, serverAktion, konfig } from "../kern/daten.js";
import { EREIGNISSE, KANAELE, wahlVon } from "../kern/versand.js";
import { APP_VERSION, APP_STUFE } from "../kern/version.js";
import { KACHELN, REGISTER_ALLE } from "./start.js";
import { REG_EFFEKTE, regEffektWahl, infoKarten } from "./kopf.js";
import { JZ_WAHL, jzWahl, JZ_DEKO_WAHL, jzDekoWahl } from "./jahreszeiten.js";
import * as D from "./darstellung.js";
import { SENDE_EFFEKTE, sendeEffektWahl, sendeEffektSetzen, sendeEffektVorschau, blaulichtVorschau, feeKommt, reisswolf } from "./effekte.js";

const JZ_VORSCHAUEN = [["herbst", "🍂 Herbst"], ["advent", "🕯️ Advent"], ["winter", "⛄ Winter"], ["fruehling", "🌱 Frühling"], ["sommer", "🌻 Sommer"],
  ["kirmes", "🎡 Kirmes"], ["wiesn", "🥨 Oktoberfest"], ["karibik", "🌴 Karibik"], ["karneval", "🎭 Karneval"], ["halloween", "🎃 Halloween"],
  ["advent:nikolaus", "🥾 Nikolaus"], [":regen", "☔ Regen"], [":topf", "🎼 Probentag"], ["fruehling:ostern", "🥚 Ostern"], ["herbst:igel", "🦔 Igel"], ["herbst:twinkey", "🧹 Orchesterwart"], ["heute", "📅 Heute (beenden)"]];
const offen = new Set(["wichtig"]); // geöffnete Klappbereiche (bleiben beim Neuzeichnen offen)
let installEreignis = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEreignis = e; });

const schalter = (k, t, x = "", an = einst()[k] !== false, c = "einstSchalter2") => `<label class="schalter"><span><b>${t}</b>${x ? `<div class="hinweis">${x}</div>` : ""}</span><input type="checkbox" data-c="${c}" data-x="${k}" ${an ? "checked" : ""}></label>`;
const chips = (liste, aktiv, a) => `<div class="wahlen">${liste.map(([k, t]) => `<button type="button" class="chip-wahl ${aktiv === k ? "an" : ""}" data-a="${a}" data-x="${esc(k)}" aria-pressed="${aktiv === k}">${t}</button>`).join("")}</div>`;
const bereich = (id, titel, inhalt) => `<details class="einst" data-klappe="${id}" ${offen.has(id) ? "open" : ""}><summary>${titel}</summary>${inhalt}</details>`;

function designKnopf(d) {
  const nacht = D.istNacht(), f = d[nacht ? "nacht" : "tag"], kopfF = d.verlauf ? d.verlauf[nacht ? "nacht" : "tag"] : `linear-gradient(135deg,${f.hero1},${f.rot},${f.hero4})`;
  return `<button class="${d.id === D.dsEff() ? "an" : ""}" data-a="designWahl" data-x="${d.id}"><span class="vorschau" style="background:${f.bg}">`
    + `<i style="left:0;right:0;top:0;height:24px;border-radius:0;background:${kopfF}"></i>`
    + `<i style="left:8px;top:30px;width:44px;height:22px;background:${f.karte};border:1px solid ${f.linie}"></i><i style="left:58px;top:30px;width:44px;height:22px;background:${f.rot}"></i><i style="right:8px;top:34px;width:14px;height:14px;border-radius:50%;background:${f.gold}"></i>`
    + `</span>${d.id === D.dsEff() ? "✓ " : ""}${esc(d.name)}</button>`;
}
function designWahlHtml(nurOben = false) {
  const grund = D.DESIGNS.filter((d) => !d.mehr), mehr = D.DESIGNS.filter((d) => d.mehr && !d.bunt), bunt = D.DESIGNS.filter((d) => d.bunt);
  const zone = (l, t) => `<details class="ds-mehr" ${l.some((d) => d.id === D.dsEff()) ? "open" : ""}><summary>${t} (${l.length})</summary><div class="designwahl">${l.map(designKnopf).join("")}</div></details>`;
  return `<div class="designwahl">${grund.map(designKnopf).join("")}</div>${zone(mehr, "🎨 Weitere Farbschemen")}${zone(bunt, "✨ Ausgefallene Farbschemen")}${nurOben ? "" : ""}`;
}
function themaWahlHtml() {
  const w = D.themaWahl(), akt = D.aktivesThema(), nacht = D.istNacht();
  const farbe = (t) => { const d = D.DESIGNS.find((x) => x.id === t.design) || D.DESIGNS[0], f = d[nacht ? "nacht" : "tag"]; return d.verlauf ? d.verlauf[nacht ? "nacht" : "tag"] : `linear-gradient(135deg,${f.hero1},${f.rot},${f.hero4})`; };
  const sf = (t) => { const s = t.schrift && D.THEMA_SCHRIFTEN[t.schrift]; if (!s) return ""; D.themaSchriftLaden(t.schrift); return ` style="font-family:'${s.familie}',sans-serif;font-weight:${s.gewicht};font-size:${(0.85 * s.gr).toFixed(2)}rem"`; };
  const k = (id, sym, name, bg, t = {}) => `<button type="button" class="thema-k${w === id ? " an" : ""}" data-a="themaWahl" data-x="${id}"><span class="thema-f" style="background:${bg}">${sym}</span><span${sf(t)}>${esc(name)}${w === id ? " ✓" : ""}</span></button>`;
  return `<div class="themawahl">${k("aus", "🚫", "Kein Thema", "var(--karte2)")}${k("auto", "🔄", "Nach Kalender", "linear-gradient(90deg,#f2a7c3,#e8b23a,#e0802a,#9fd3f0)")}${D.THEMEN.map((t) => k(t.id, t.sym, t.name, farbe(t), t)).join("")}</div>
    <p class="hinweis">${akt ? `Gerade: <b>${akt.sym} ${esc(akt.name)}</b>${akt.quelle === "kalender" ? " – nach Kalender" : ""}. Farbe, Jahreszeit und Sende-Effekt kannst du trotzdem einzeln ändern.` : "Kein Thema – es gelten deine eigenen Einstellungen."}</p>
    ${schalter("themaSchrift", "✍️ Schrift des Themas", "Begrüßung im Kopf in der passenden Schrift (z. B. Weihnachten, Halloween)", D.themaSchriftAn(), "themaSchrift")}`;
}

// 💬 Nachrichten wie KC: Lesebestätigung (blaue Haken), Wichtigkeit fragen, Enter sendet, Entwürfe, Ton, Vorlesen, Standard-Zustellung
function nachrichtenEinst(e) {
  const zs = e.zustellStandard || "regel";
  return `${schalter("lesebestaetigung", "✓✓ Lesebestätigungen (blaue Haken)", "Andere sehen, wann du ihre Nachricht gelesen hast. Aus: du siehst auch bei anderen keine blauen Haken – wie bei WhatsApp", e.lesebestaetigung !== false)}
    ${schalter("wichtigFragen", "❗ Vor dem Senden nach der Wichtigkeit fragen", "📝 Normal oder ❗ Hoch – höchstens alle 30 Min. je Chat", e.wichtigFragen ?? (S.ich?.rollen || []).some((r) => ["leitung", "admin"].includes(r)))}
    ${schalter("chatTon", "🔔 Ton bei neuer Nachricht im offenen Chat", "Kurzer Ton und Vibrieren", e.chatTon !== false)}
    ${schalter("vorlesen", "🔊 Neue Nachrichten vorlesen", "Im geöffneten Chat liest das Handy neue Nachrichten vor", e.vorlesen === true)}
    ${schalter("entwuerfe", "✏️ Entwürfe merken", "Angefangene Nachrichten bleiben je Chat stehen – auch nach dem Schließen", e.entwuerfe !== false)}
    ${schalter("chatEinklappen", "📂 Vergangene Tage einklappen", "Im Chat nur heute und Ungelesenes offen – frühere Tage als Zeile mit Datum rechts (z. B. „Mo, 11.11.26“), antippen zum Aufklappen", e.chatEinklappen !== false)}
    ${schalter("chatKW", "🗓️ Ältere Wochen als Kalenderwoche", "Alles, was älter als eine Woche ist, als „KW 45/26“ zusammenfassen", e.chatKW !== false)}
    ${schalter("fotosLaden", "📷 Fotos automatisch laden", "Aus: Fotos erst beim Antippen laden – spart Datenvolumen", e.fotosLaden !== false)}
    ${schalter("sprachsteuerung", "🎤 Sprachsteuerung", "Mikrofon oben im Kopf und in den Nachrichten: „Öffne Termine“, „Nachricht an Bettina: …“, „Lies meine Nachrichten“", e.sprachsteuerung !== false)}
    ${schalter("enterSendet", "⏎ Enter-Taste sendet", "Für PC und Tablet mit Tastatur – Umschalt+Enter = neue Zeile", e.enterSendet === true)}
    <h4>🔔 Benachrichtigen beim Senden (vorausgewählt)</h4>${chips([["regel", "Wie eingestellt"], ["push", "🔔 Push"], ["pushmail", "🔔 + ✉️ E-Mail"]], zs, "zustellStandardWahl")}
    <p class="hinweis">„Wie eingestellt“ = so, wie jede Person es unter 🔔 Benachrichtigungen gewählt hat. Im Chat lässt es sich mit 🔔 je Nachricht ändern.</p>
    <h4>🏎️ Express & ❗ Wichtig</h4><p class="hinweis">❗ Wichtig: bei allen orange umrandet, geht per Push <b>und</b> E-Mail raus. 🏎️ Express: kommt sofort an – auch nachts –, beim Empfänger geht ein Fenster auf (Öffnen · Später · Nein, Empfang bestätigen). Höchstens ${Number(konfig().express_max_tag) > 0 ? Number(konfig().express_max_tag) : 5} Express am Tag (Leitung unbegrenzt).</p>
    <div class="schalter"><span><b>💬 Chat-Farben & Hintergrund</b><div class="hinweis">Farbe deiner und der fremden Sprechblasen, Hintergrund mit Motiv</div></span><button class="knopf klein" data-a="cfOeffnen">🎨 Wählen</button></div>`;
}
AKTIONEN.zustellStandardWahl = (w) => { einstSetzen("zustellStandard", w === "regel" ? null : w); neu(); };

VIEWS.einstellungen = {
  render() {
    const e = einst(), ich = S.ich, fg = ich?.freigaben || {};
    const kanaele = ["push", "mail", "app"];
    const matrix = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><tr><th></th>${kanaele.map((k) => `<th style="font-size:.8rem">${KANAELE[k]}</th>`).join("")}</tr>${Object.entries(EREIGNISSE).map(([k, t]) => `<tr><td style="padding:6px 0;font-weight:700;font-size:.9rem">${t}</td>${kanaele.map((c) => `<td style="text-align:center"><input type="checkbox" data-c="benachWahl" data-x="${k}|${c}" ${wahlVon(ich, k).includes(c) ? "checked" : ""} ${k === "sos" && c === "push" ? "disabled" : ""}></td>`).join("")}</tr>`).join("")}</table></div>`;
    const sz = `<div class="einst-zeile"><b>🔍 Schriftgröße der Texte</b><span style="flex:1"></span><button class="knopf klein" data-a="szAendern" data-x="-0.1" aria-label="kleiner">A−</button><span class="sz-wert">${Math.round(D.SZ.wert * 100)} %</span><button class="knopf klein" data-a="szAendern" data-x="0.1" aria-label="größer">A+</button><button class="knopf klein" data-a="szAendern" data-x="0">100 %</button></div><p class="hinweis">Nachrichten und Zettel werden größer, Knöpfe bleiben gleich. Auch mit zwei Fingern auseinanderziehen.</p>`;
    const gross = `<div class="feld"><label>🔠 Große Schrift (ganze App)</label><div class="umschalter">${[["normal", "Normal"], ["gross", "Groß"], ["riesig", "Sehr groß"]].map(([v, n]) => `<button class="${e.schrift === v ? "an" : ""}" data-a="schriftWahl" data-x="${v}">${n}</button>`).join("")}</div></div>`;
    const modus = `<div class="feld"><label>🌗 Tag- und Nachtmodus</label><div class="umschalter modus3">${[["auto", "🔄 Automatisch"], ["tag", "☀️ Immer Tag"], ["nacht", "🌙 Immer Nacht"]].map(([m, t]) => `<button class="${D.DS.modus === m ? "an" : ""}" data-a="modusWahl" data-x="${m}">${t}</button>`).join("")}</div><p class="hinweis">${esc(D.modusInfo())} Der Mond/Sonne-Knopf oben schaltet reihum A → T → N.</p></div>`;
    const tipps = `${schalter("tippDesTages", "💡 Tipp des Tages", "Beim ersten Öffnen am Tag ein kurzer Tipp", e.tippDesTages !== false)}
      ${schalter("wasNeu", "👋 Beim Öffnen zeigen, was neu ist", "Nach einem Update die Neuerungen anzeigen", e.wasNeu !== false)}
      ${schalter("vorlesen", "🔊 Neue Nachrichten vorlesen", "Im geöffneten Chat liest das Handy neue Nachrichten vor", e.vorlesen === true)}
      ${schalter("tippfehler", "🖍️ Tippfehler rot unterstreichen", "Rechtschreibprüfung beim Schreiben", e.tippfehler !== false)}
      ${schalter("ton", "🔔 Töne", "Kuckuck und Klänge der App", e.ton !== false)}
      <button class="knopf" data-a="tippZeigen">💡 Tipp jetzt zeigen</button> <button class="knopf" data-a="wasNeuZeigen">👋 Was ist neu?</button> <button class="knopf" data-a="kachel" data-x="hilfe">❓ Alle Tipps</button>`;
    const privat = `${schalter("geburtstag", "🎂 Meinen Geburtstag anzeigen (ohne Jahr)", "Andere sehen im Kopf „hat heute Geburtstag“", !!fg.geburtstag, "freigabe")}
      <h4>Für andere im Bachkreis sichtbar</h4>
      ${schalter("mobil", "📱 Meine Handynummer", "", !!fg.mobil, "freigabe")}${schalter("email", "✉️ Meine E-Mail-Adresse", "", !!fg.email, "freigabe")}${schalter("adresse", "🏠 Meine Adresse", "", !!fg.adresse, "freigabe")}
      <p class="hinweis">Leitung und Lehrkräfte sehen Kontaktdaten immer (für Notfälle). ${istEltern() ? "Die Daten Ihrer Kinder verwaltet die Leitung." : ""}</p>
      <div class="knopfreihe"><button class="knopf" data-a="kachel" data-x="meinedaten">🔐 Was ist über mich gespeichert?</button>${datenInfo().server ? `<button class="knopf" data-a="abmeldenApp">🚪 Von diesem Gerät abmelden</button><button class="knopf rot" data-a="alleGeraeteAb">🔒 Alle anderen Geräte abmelden</button>` : ""}</div>`;
    const darstellung = `<h4>🐢 Sparmodus</h4>${chips([["auto", "Automatisch"], ["an", "Immer an"], ["aus", "Aus"]], D.sparWahl(), "sparWahl")}<p class="hinweis">${D.SPAR.an ? `Gerade an: ${esc(D.SPAR.grund)}.` : "Gerade aus."} Im Sparmodus ruhen alle Bewegungen – gut bei schwachem Netz oder älteren Handys.</p>
      ${gross}${sz}${modus}
      <div class="schalter"><span><b>💬 Chat-Farben & Hintergrund</b><div class="hinweis">Farbe deiner und der fremden Sprechblasen, Hintergrund mit Motiv – gilt für alle Chats</div></span><button class="knopf klein" data-a="cfOeffnen">🎨 Wählen</button></div>
      <h4>🎭 Themen</h4>${themaWahlHtml()}
      <h4>🎨 Farbdesign</h4>${designWahlHtml()}<button class="knopf" data-a="designStandard">↺ Standard wiederherstellen</button>`;
    const effekte = `${schalter("effekte", "✨ Animierte Knöpfe", "Bewegungen und Effekte in der ganzen App", e.effekte !== false)}
      <div class="schalter"><span><b>🐦 Kuckucksuhr zur vollen Stunde</b><div class="hinweis">Nur wenn die App offen ist; nachts ohne Ton</div></span><span><button type="button" class="knopf klein" data-a="kuckuckProbe">🔊 Probe</button> <input type="checkbox" data-c="einstSchalter2" data-x="kuckuck" ${e.kuckuck !== false ? "checked" : ""}></span></div>
      <div class="schalter"><span><b>🧚 Die kleine Fee</b><div class="hinweis">Ab und zu schwebt eine Fee durchs Startbild – antippen = ein schöner Spruch</div></span><span><button type="button" class="knopf klein" data-a="feeAnsehen">🧚 Ansehen</button> <input type="checkbox" data-c="einstSchalter2" data-x="fee" ${e.fee !== false ? "checked" : ""}></span></div>
      ${schalter("jahreszeit", "🍂 Jahreszeiten im Kopf", "Laub, Schnee, Blumen, Schneemann mit Zylinder – wie in der KC Club App", e.jahreszeit !== false, "jzSchalter")}
      <h4>📅 Welche Jahreszeit?</h4>${chips(JZ_WAHL, jzWahl(), "jzWahlKnopf")}
      <h4>🎏 Deko an der Leiste</h4>${chips(JZ_DEKO_WAHL, jzDekoWahl(), "jzDekoKnopf")}
      <h4>👁 Vorschau im Kopf der Startseite</h4><div class="wahlen">${JZ_VORSCHAUEN.map(([x, t]) => `<button type="button" class="chip-wahl" data-a="jzVorschauKnopf" data-x="${x}">${t}</button>`).join("")}</div>
      <h4>🎬 Effekt beim Register-Wechsel</h4>${chips(REG_EFFEKTE, regEffektWahl(), "regEffektKnopf")}
      <h4>✉️ Effekt beim Senden</h4>${chips(SENDE_EFFEKTE, sendeEffektWahl(), "sendeEffektWahl")}
      <div class="knopfreihe"><button class="knopf" data-a="sendeVorschau">▶ Vorschau</button><button class="knopf" data-a="blaulichtVorschauK">🚨 Wichtig (Blaulicht)</button></div>
      <div class="schalter"><span><b>🗑️ Reißwolf beim Löschen</b><div class="hinweis">Gelöschtes läuft sichtbar durch einen Aktenvernichter</div></span><span><button type="button" class="knopf klein" data-a="reisswolfProbe" id="rwProbe">▶ Probe</button> <input type="checkbox" data-c="einstSchalter2" data-x="reisswolf" ${e.reisswolf !== false ? "checked" : ""}></span></div>`;
    const startseite = `${schalter("eselsohr", "📄 Eselsohr am Kopf", "Doppelt tippen dreht den Kopf um – dahinter die Bühne mit dem Orchester", e.eselsohr !== false)}
      ${schalter("einfach", "🟢 Einfache Ansicht", "Große Kacheln, nur das Wichtigste – ohne Register", !!e.einfach)}
      ${schalter("feiertage", "🇩🇪 Feiertage NRW im Kalender", "", e.feiertage !== false)}
      <div class="feld"><label>🪧 Info-Feld oben beim Start</label><select data-c="infoStart"><option value="">Die zuletzt gezeigte Karte</option>${infoKarten().map(([id, t], i) => `<option value="${id}" ${e.infoStart === id ? "selected" : ""}>${i + 1}. ${esc(t)}</option>`).join("")}</select></div>
      <div class="feld"><label>Start-Register</label><select data-c="einstStartReg">${REGISTER_ALLE.map(([r, n]) => `<option value="${r}" ${e.startRegister === r ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <h4>🔲 Kacheln auf der Startseite</h4><p class="hinweis">Ausgeblendete Kacheln bleiben hier erreichbar. ▲ schiebt eine Kachel nach vorn.</p>
      ${["bachkreis", "meins", "technik"].map((r) => `<h4>${REGISTER_ALLE.find(([x]) => x === r)[1]}</h4>${KACHELN[r].filter((k) => !k.nur || k.nur()).map((k) => `<label class="schalter"><span>${k.sym} ${esc(typeof k.t === "function" ? k.t() : k.t)}</span><span><button class="knopf klein" data-a="kachelSchieben" data-x="${r}|${k.id}|-1">▲</button> <input type="checkbox" data-c="kachelSichtbar" data-x="${k.id}" ${e.kachelnAus.includes(k.id) ? "" : "checked"}></span></label>`).join("")}`).join("")}
      <button class="knopf" data-a="kachelnStandard">↺ Standard</button>`;
    const install = `<p>Die Bachkreis-App läuft im Browser und lässt sich wie eine App auf den Startbildschirm legen – kostenlos, ohne App-Store.</p>
      ${installEreignis ? `<button class="knopf haupt breit" data-a="appInstallieren">📲 Jetzt als App installieren</button>` : ""}
      <h4>Android (Chrome)</h4><ol class="install-schritte"><li>Den persönlichen Link in <b>Chrome</b> öffnen</li><li>Oben rechts <b>⋮</b> antippen</li><li><b>„App installieren“</b> bzw. „Zum Startbildschirm hinzufügen“</li><li><b>„Installieren“</b> bestätigen – die App liegt jetzt in der App-Liste</li></ol>
      <h4>iPhone / iPad (Safari)</h4><ol class="install-schritte"><li>Den Link in <b>Safari</b> öffnen</li><li>Unten das <b>Teilen-Symbol</b> (Quadrat mit Pfeil) antippen</li><li><b>„Zum Home-Bildschirm“</b> wählen und „Hinzufügen“</li><li>Erst danach funktionieren Push-Benachrichtigungen auf dem iPhone</li></ol>
      <h4>💻 Am PC oder Tablet</h4><p class="hinweis">Einfach den Link im Browser öffnen. Für Leitung und Lehrkräfte gibt es zusätzlich die PC-Verwaltung (Technik › PC-Verwaltung).</p>
      <p class="hinweis">Den persönlichen Link bitte <b>nicht weitergeben</b> – er ist wie ein Schlüssel.</p>`;
    const info = `<p>Bachkreis-App <b>v${APP_VERSION} ${APP_STUFE}</b> · ${esc(datenInfo().hinweis || "")}</p>
      <div class="knopfreihe"><button class="knopf" data-a="updatePruefen">🔄 Update prüfen</button><button class="knopf" data-a="kachel" data-x="ueber">ℹ️ Über die App</button><button class="knopf" data-a="kachel" data-x="hilfe">❓ Hilfe & Tipps</button><button class="knopf" data-a="kachel" data-x="sicherheit">🛡️ Sicherheits-Check</button></div>`;
    return kopf("⚙️ Mehr – Einstellungen") + `<input class="einst-suche" type="search" placeholder="🔍 Einstellung suchen …" data-c="einstSuche" aria-label="Einstellung suchen">`
      + bereich("wichtig", "⚙️ Das Wichtigste", `<h4>📬 Wie möchtest du Neuigkeiten bekommen?</h4><div class="knopfreihe"><button class="knopf haupt" data-a="pushErlauben">🔔 Push auf diesem Gerät erlauben</button><button class="knopf" data-a="kachel" data-x="test">🧪 Test an mich</button></div>
        ${schalter("ruhe", "🌙 Nicht stören", `Keine Push-Töne von ${e.ruheVon} bis ${e.ruheBis} Uhr (SOS kommt immer durch)`, !!e.ruhe)}
        <div class="schalter"><span><b>🙂 Mein Gesicht</b><div class="hinweis">Gezeichnetes Gesicht fürs Orchester und die Instrumentenkunde</div></span><button class="knopf klein" data-a="meinGesicht">✏️ Gestalten</button></div>
        <h4>🎨 Lieblingsfarbe</h4><div class="designwahl">${D.DESIGNS.filter((d) => !d.mehr).slice(0, 4).map(designKnopf).join("")}</div><p class="hinweis">Alle Farben unter 🎨 Darstellung.</p>
        ${gross}${sz}${schalter("einfach", "🟢 Einfache Ansicht", "Große Kacheln, nur das Wichtigste", !!e.einfach)}`)
      + bereich("benachrichtigung", "🔔 Benachrichtigungen", `<div class="knopfreihe"><button class="knopf" data-a="pushErlauben">📲 Push auf diesem Handy</button><button class="knopf" data-a="kachel" data-x="test">🧪 Test an mich</button></div>
        ${schalter("ruhe", "🌙 Nicht stören", "", !!e.ruhe)}<div class="einst-zeile"><label>von <input type="time" data-c="ruheZeit" data-x="ruheVon" value="${esc(e.ruheVon)}"></label><label>bis <input type="time" data-c="ruheZeit" data-x="ruheBis" value="${esc(e.ruheBis)}"></label></div>
        <h4>Was willst du wie bekommen?</h4>${matrix}`)
      + bereich("nachrichten", "💬 Nachrichten", nachrichtenEinst(e))
      + bereich("ansagen", "🗣️ Ansagen, Töne & Tipps", tipps)
      + bereich("privat", "🔒 Privatsphäre", privat)
      + bereich("kalender", "📆 Termine im Handy-Kalender", `<p>Alle deine Termine als Kalender-Datei fürs Handy (Google, Apple, Outlook).</p><button class="knopf" data-a="kachel" data-x="kalender">📆 Zum Kalender-Export</button>`)
      + bereich("darstellung", "🎨 Darstellung", darstellung)
      + bereich("effekte", "✨ Effekte", effekte)
      + bereich("startseite", "🧩 Startseite & Ansicht", startseite)
      + bereich("install", "📲 App-Installation", install)
      + bereich("info", "ℹ️ App-Info", info);
  },
  nach(wurzel) {
    wurzel.querySelector(".einst-suche")?.addEventListener("input", (e) => AKTIONEN.einstSuche(e.target.value));
    for (const d of wurzel.querySelectorAll("details.einst")) d.addEventListener("toggle", () => { if (d.open) offen.add(d.dataset.klappe); else offen.delete(d.dataset.klappe); });
  },
};
const neu = () => { const y = scrollY; zeige("einstellungen", {}, { ersetzen: true }); scrollTo(0, y); };

// ---------- Aktionen ----------
AKTIONEN.schriftWahl = (v) => { einstSetzen("schrift", v); neu(); };
AKTIONEN.einstSchalter2 = (_, el) => { einstSetzen(el.dataset.x, el.checked); neu(); };
AKTIONEN.designWahl = (id) => { D.designWaehlen(id); neu(); };
AKTIONEN.designStandard = () => { D.designStandard(); neu(); };
AKTIONEN.modusWahl = (m) => { D.modusWaehlen(m); neu(); };
AKTIONEN.themaWahl = (w) => { D.themaSetzen(w); neu(); };
AKTIONEN.themaSchrift = (_, el) => D.themaSchriftSetzen(el.checked);
AKTIONEN.sparWahl = (w) => { D.sparSetzen(w); neu(); };
AKTIONEN.szAendern = (d) => { D.szAendern(+d); };
AKTIONEN.ruheZeit = (v, el) => einstSetzen(el.dataset.x, v);
AKTIONEN.infoStart = (v) => einstSetzen("infoStart", v || null);
AKTIONEN.sendeEffektWahl = (w) => { sendeEffektSetzen(w); neu(); };
AKTIONEN.sendeVorschau = (_, el) => sendeEffektVorschau(el);
AKTIONEN.blaulichtVorschauK = (_, el) => blaulichtVorschau(el);
AKTIONEN.feeAnsehen = () => { zeige("start"); setTimeout(() => feeKommt(true), 400); };
AKTIONEN.reisswolfProbe = (_, el) => { const k = el.closest(".schalter"); reisswolf(k).then(() => { if (k) k.style.visibility = ""; }); };
AKTIONEN.freigabe = async (_, el) => {
  const fg = { ...(S.ich.freigaben || {}), [el.dataset.x]: el.checked };
  S.ich = await speichere("personen", { ...S.ich, freigaben: fg });
  toast(el.checked ? "✅ Freigegeben" : "🔒 Nicht mehr sichtbar");
};
AKTIONEN.alleGeraeteAb = async () => {
  if (!confirm("Alle anderen Geräte abmelden? Dort braucht es danach wieder den persönlichen Link.")) return;
  const r = await serverAktion("abmelden_andere", {}).catch(() => null);
  toast(r?.ok ? `🔒 ${r.anzahl} andere Geräte abgemeldet` : "Gerade nicht möglich – bitte Internet prüfen");
};
AKTIONEN.appInstallieren = async () => { if (!installEreignis) return; installEreignis.prompt(); const r = await installEreignis.userChoice.catch(() => null); if (r?.outcome === "accepted") toast("📲 Installiert"); installEreignis = null; };
AKTIONEN.einstSuche = (q) => {
  const t = String(q || "").trim().toLowerCase();
  for (const d of document.querySelectorAll("details.einst")) {
    const treffer = !t || d.textContent.toLowerCase().includes(t);
    d.style.display = treffer ? "" : "none"; if (t && treffer) d.open = true;
  }
};

// ---------- Chat-Farben (Blatt wie KC-CLUB-CHAT-FARBEN) ----------
function cfBlattZeichnen() {
  const CF = D.chatFarben(), e = D.CF_EIGEN.find((x) => x.id === CF.eigen && x.c), a = D.CF_ANDERE.find((x) => x.id === CF.andere && x.c), h = D.CF_HG.find((x) => x.id === CF.hintergrund && x.css);
  const dunkel = document.documentElement.classList.contains("dunkel");
  const farbe = (liste, feld) => `<div class="cf-farben">${liste.map((x) => `<button type="button" class="cf-farbe${(CF[feld] || "standard") === x.id ? " an" : ""}" aria-label="${esc(x.t || x.id)}" title="${esc(x.t || x.id)}" data-a="cfSetzen" data-x="${feld}:${x.id}" style="${x.c ? `background:${dunkel && x.cd ? x.cd : x.c}` : ""}">${x.c ? "" : "↺"}</button>`).join("")}</div>`;
  return `<div class="cf-vorschau" style="${h ? esc(`background:${h.css};background-size:cover;background-position:center bottom`) : ""}">
      <div class="blase cf-v" style="${a ? `background:${dunkel ? a.cd : a.c}` : ""}"><div class="von">Lena</div>Bringt jemand ein Ersatz-Kolophonium mit? 🎻</div>
      <div class="blase ich cf-v" style="${e ? `background:${e.c};color:${D.cfLesbar(e.c)}` : ""}">Mache ich, bis zur Probe! 👍</div></div>
    <h4 class="cf-h">💬 Meine Sprechblasen</h4>${farbe(D.CF_EIGEN, "eigen")}
    <h4 class="cf-h">👥 Sprechblasen der anderen</h4>${farbe(D.CF_ANDERE, "andere")}
    <h4 class="cf-h">🖼️ Hintergrund</h4><div class="cf-hgs">${D.CF_HG.map((x) => `<button type="button" class="cf-hgw${(CF.hintergrund || "standard") === x.id ? " an" : ""}" data-a="cfSetzen" data-x="hintergrund:${x.id}"><span class="cf-hgbild" style="${x.css ? esc(`background:${x.css};background-size:cover;background-position:center bottom`) : ""}">${x.css ? "" : x.sym}</span><span class="cf-hgt">${esc(x.t)}</span></button>`).join("")}</div>
    <p class="hinweis">Gilt für alle deine Chats – nur bei dir.</p><button type="button" class="knopf" data-a="cfStandard">↺ Wie vorher</button>`;
}
AKTIONEN.cfOeffnen = () => { const b = blatt("🎨 Chat-Farben", `<div id="cfInhalt">${cfBlattZeichnen()}</div>`); b.classList.add("cf-blatt"); };
AKTIONEN.cfSetzen = (x) => { const [feld, id] = String(x).split(":"); D.cfSetzen(feld, id); const z = document.getElementById("cfInhalt"); if (z) z.innerHTML = cfBlattZeichnen(); };
AKTIONEN.cfStandard = () => { D.cfStandard(); const z = document.getElementById("cfInhalt"); if (z) z.innerHTML = cfBlattZeichnen(); };

// ---------- Tipp des Tages & Was ist neu ----------
export const TIPPS = [
  "📅 Zu- oder absagen geht direkt oben im Kopf – auf der Karte „Nächster Termin“.",
  "‹ › Im farbigen Feld oben blätterst du mit den Pfeilen oder durch Wischen: Wetter, Für dich, Demnächst …",
  "⌃ Der linke Pfeil ganz oben rollt das Infofeld ein, ⌃⌃ rechts den ganzen Kopf – wie eine Jalousie.",
  "🌙 Der Mond-Knopf schaltet reihum: A = automatisch nach Sonnenstand, T = immer Tag, N = immer Nacht.",
  "🏖️ Längere Abwesenheit? Unter Meins › Abwesenheit sagst du alle Termine im Zeitraum auf einmal ab.",
  "🎼 Unter Meins › Meine Noten findest du automatisch die Stimmen für dein Instrument.",
  "🔍 Mit zwei Fingern auseinanderziehen macht die Nachrichten größer – Doppeltipp mit zwei Fingern = 100 %.",
  "🎨 Unter ⚙️ Mehr › Darstellung gibt es viele Farbdesigns und Themen – z. B. Weihnachten oder Karibik.",
  "📄 Doppelt aufs Eselsohr unten rechts am Kopf: dahinter spielt das Orchester.",
  "🆘 Im Notfall: Kachel SOS – Notruf, Leitung und Eltern mit einem Tipp erreichen.",
  "📲 Lege die App auf den Startbildschirm – dann kommen auch Push-Benachrichtigungen.",
  "🧚 Ab und zu schwebt eine Fee durchs Startbild. Antippen!",
];
export function tippZeigen() { const i = Math.floor(Date.now() / 86400000) % TIPPS.length; blatt("💡 Tipp des Tages", `<p style="font-size:1.1rem">${TIPPS[i]}</p><button class="knopf" data-a="tippWeiter" data-x="${i}">Noch ein Tipp ›</button>`); }
AKTIONEN.tippZeigen = tippZeigen;
AKTIONEN.tippWeiter = (i) => { const n = (+i + 1) % TIPPS.length; blatt("💡 Tipp", `<p style="font-size:1.1rem">${TIPPS[n]}</p><button class="knopf" data-a="tippWeiter" data-x="${n}">Noch ein Tipp ›</button>`); };
export async function wasNeuZeigen() {
  try { const v = await (await fetch("version.json", { cache: "no-store" })).json(); blatt(`👋 Neu in v${v.version}`, `<ul class="liste">${(v.neu || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`); } catch { toast("Gerade nicht verfügbar"); }
}
AKTIONEN.wasNeuZeigen = wasNeuZeigen;
// Beim Start: einmal am Tag ein Tipp, nach einem Update „Was ist neu“, jede 20. Öffnung die Fee
export function beimStart(ohneAnsagen = false) {
  if (ohneAnsagen) return; // die Pinnwand hat gerade etwas gezeigt – Tipp/„Was ist neu“ kommen beim nächsten Öffnen
  const e = einst(), heute = new Date().toISOString().slice(0, 10);
  let zuletzt = null; try { zuletzt = localStorage.getItem("bk_version_gesehen"); localStorage.setItem("bk_version_gesehen", APP_VERSION); } catch {}
  if (zuletzt && zuletzt !== APP_VERSION && e.wasNeu !== false) setTimeout(wasNeuZeigen, 1500);
  else if (e.tippDesTages !== false) { let t = null; try { t = localStorage.getItem("bk_tipp_tag"); localStorage.setItem("bk_tipp_tag", heute); } catch {} if (t && t !== heute) setTimeout(tippZeigen, 2500); }
  let n = 0; try { n = +(localStorage.getItem("bk_starts") || 0) + 1; localStorage.setItem("bk_starts", String(n)); } catch {}
  if (n % 20 === 0 && e.fee !== false) setTimeout(() => feeKommt(), 4000);
}
// Rechtschreibprüfung in Eingabefeldern nach Wunsch
document.addEventListener("bk-ansicht", () => setTimeout(() => { const an = einst().tippfehler !== false; document.querySelectorAll("textarea, input[type=text], input:not([type])").forEach((x) => { x.spellcheck = an; }); }, 0));
