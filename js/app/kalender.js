// 📆 Kalender übertragen (0.14.0): Termine (und 🎻 Übezeiten) in den Apple-, Google- oder Outlook-Kalender.
//  - 🔄 Abo (Echtbetrieb, empfohlen): ein persönlicher Link – der Kalender holt Änderungen selbst (alle paar Stunden),
//    mit Erinnerung vor jedem Termin. Apple: webcal-Link öffnet „Abonnieren“; Google: „Per URL hinzufügen“ mit dem Link.
//  - 📥 Einmal übertragen: Kalenderdatei (.ics) – Stand von jetzt, danach keine Änderungen.
// Der Link zeigt nur die eigenen Termine (Eltern: die ihrer Kinder). „Neuer Link“ macht den alten sofort ungültig.
import { S, VIEWS, db, zeichne, kopf, istEltern, vorname } from "./zustand.js";
import { esc, AKTIONEN, toast, herunterladen, frage } from "../kern/ui.js";
import { hole, speichere, istEchtbetrieb, serverAktion } from "../kern/daten.js";
import { termineFuer, kinderVon, ics, eigeneVorkommen } from "../kern/logik.js";
import { liste } from "../kern/daten.js";

const ALARME = [[0, "keine"], [15, "15 Min. vorher"], [30, "30 Min. vorher"], [60, "1 Std. vorher"], [120, "2 Std. vorher"], [1440, "1 Tag vorher"]];
const KAL = { link: null, laeuft: false, fehler: "" };
const wer = () => (istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id]);
const ich = () => hole("personen", S.ich.id) || {};

async function linkHolen(neu = false) {
  if (!istEchtbetrieb()) return null;
  KAL.laeuft = true; KAL.fehler = "";
  try {
    const r = await serverAktion("kalender_link", { neu });
    if (r?.ok) KAL.link = r; else KAL.fehler = r?.fehler === "KALENDER_NICHT_EINGERICHTET" ? "Das Kalender-Abo ist auf dem Server noch nicht eingerichtet." : "Der Link konnte nicht geholt werden.";
  } catch { KAL.fehler = "Keine Verbindung zum Server – bitte später nochmal."; }
  KAL.laeuft = false; return KAL.link;
}

VIEWS.kalender = {
  render() {
    const termine = [...new Map(wer().flatMap((p) => termineFuer(db, p)).map((t) => [t.id, t])).values()];
    const p = ich(), alarm = Number(p.kalender_alarm) || 0, plan = p.uebe_plan;
    const echt = istEchtbetrieb(), l = KAL.link;
    if (echt && !l && !KAL.laeuft && !KAL.fehler) linkHolen().then(zeichne);
    const abo = !echt ? `<p class="hinweis">In der Vorführversion gibt es kein Abo – im Echtbetrieb steht hier dein persönlicher Link. Zum Ausprobieren unten die Kalenderdatei nehmen.</p>`
      : KAL.fehler ? `<p class="hinweis">⚠️ ${esc(KAL.fehler)}</p><button class="knopf klein" data-a="kalLinkNochmal">↻ Nochmal versuchen</button>`
      : !l ? '<p class="hinweis">⏳ Dein Link wird geholt …</p>'
      : `<div class="kal-knoepfe"><a class="knopf haupt" href="${esc(l.webcal)}">🍎 Apple Kalender abonnieren</a>
          <a class="knopf haupt kal-google" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(l.webcal)}" target="_blank" rel="noopener">🟢 Google Kalender abonnieren</a>
          <button class="knopf" data-a="kalKopieren">📋 Link kopieren (Outlook, andere)</button></div>
        <details class="kal-hilfe"><summary>So geht's</summary><ul>
          <li><b>iPhone/iPad/Mac:</b> „Apple Kalender abonnieren“ tippen → „Abonnieren“ → „Hinzufügen“. Die Termine erscheinen als eigener Kalender „Bachkreis“.</li>
          <li><b>Google:</b> „Google Kalender abonnieren“ öffnet Google (am besten am PC, angemeldet) → „Hinzufügen“. Auf dem Android-Handy erscheint der Kalender danach von selbst (ggf. in der Kalender-App unter „Bachkreis“ das Synchronisieren einschalten). Google aktualisiert Abos nur alle paar Stunden.</li>
          <li><b>Outlook:</b> Link kopieren → „Kalender hinzufügen“ → „Aus dem Internet abonnieren“.</li></ul></details>
        <p class="hinweis">🔒 Der Link zeigt nur ${istEltern() ? "die Termine deiner Kinder" : "deine Termine"}${plan?.an ? " und deine Übezeiten" : ""}. Wer ihn hat, kann sie lesen – nicht weitergeben. <button class="link" data-a="kalNeu">♻️ Neuen Link erzeugen</button> (der alte gilt dann nicht mehr).</p>`;
    return kopf("📆 Kalender") + `<div class="karte"><h3>🔄 Automatisch – Kalender-Abo <span class="badge b-gruen">empfohlen</span></h3>
        <p>Deine Bachkreis-Termine erscheinen im Kalender deines Handys und bleiben aktuell: neue Proben, Änderungen und Absagen kommen von selbst.</p>${abo}</div>
      <div class="karte"><h3>⏰ Erinnerung im Kalender</h3>
        <label class="kal-feld">Vor jedem Termin<select data-c="kalAlarm">${ALARME.map(([m, t]) => `<option value="${m}" ${alarm === m ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <p class="hinweis">Gilt für das Abo und die Kalenderdatei. 🎻 Übezeiten haben eine eigene Erinnerung (unter „Üben“).</p>
        <p>🎻 Übezeiten: ${plan?.an && plan.tage?.length ? `<b>an</b> – kommen mit in den Kalender.` : `<b>aus</b>`} <button class="link" data-a="kachel" data-x="ueben">einstellen ›</button></p></div>
      <div class="karte"><h3>📥 Einmal übertragen – Kalenderdatei</h3>
        <p>${termine.length} kommende Termine${plan?.an && plan.tage?.length ? " und die Übezeiten" : ""} als Datei (.ics). Auf dem iPhone öffnen → „Alle hinzufügen“; bei Google am PC unter Einstellungen › „Importieren“. Spätere Änderungen kommen so <b>nicht</b> mit.</p>
        <button class="knopf breit" data-a="alleIcs">📥 Kalenderdatei herunterladen</button></div>`;
  },
};
AKTIONEN.kalLinkNochmal = () => { KAL.fehler = ""; KAL.link = null; zeichne(); };
AKTIONEN.kalNeu = async () => {
  if (!(await frage("Neuen Link erzeugen? Kalender, die den alten Link abonniert haben, bekommen dann keine Termine mehr – dort neu abonnieren."))) return;
  await linkHolen(true); toast(KAL.link ? "♻️ Neuer Link – bitte im Kalender neu abonnieren" : "⚠️ " + KAL.fehler, 4000); zeichne();
};
AKTIONEN.kalKopieren = async () => {
  try { await navigator.clipboard.writeText(KAL.link.url); toast("📋 Link kopiert"); } catch { prompt("Link zum Kopieren:", KAL.link.url); }
};
AKTIONEN.kalAlarm = async (v) => { await speichere("personen", { ...ich(), kalender_alarm: Number(v) }); toast("⏰ Gespeichert – das Abo übernimmt es beim nächsten Abruf"); zeichne(); };
AKTIONEN.alleIcs = () => {
  const p = ich(), termine = [...new Map(wer().flatMap((x) => termineFuer(db, x).map((t) => [t.id, { t, x }]))).values()];
  const titelVor = istEltern() ? (t) => vorname(termine.find((e) => e.t.id === t.id)?.x) : null;
  const von = new Date(), bis = new Date(Date.now() + 400 * 86400000); // 🙋 eigene Termine mit in die Datei
  const eigen = liste("eigene_termine", (e) => wer().includes(e.person_id)).flatMap((e) => eigeneVorkommen(e, von, bis).map((v) => ({ t: { ...v, titel: "🙋 " + v.titel }, x: e.person_id })));
  termine.push(...eigen);
  herunterladen("bachkreis-termine.ics", ics(termine.map((e) => e.t), "Bachkreis", { alarm: Number(p.kalender_alarm) || 0, uebe: p.uebe_plan ? { ...p.uebe_plan, id: S.ich.id } : null, titelVor }), "text/calendar");
};
