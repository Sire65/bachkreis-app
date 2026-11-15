// 🛡️ Schutz & Einwilligungen (0.69.0, Konzept mit Beispielbild abgestimmt – Wunsch Frau Jacka/Hansi „mit Abholliste“):
// Eltern legen je Kind fest, was gilt – alles steht zuerst auf AUS („Datenschutz durch Voreinstellung“). Ab 16 wählt das Kind selbst.
//   1 📷 Fotos (je Zweck = Genehmigung foto_*) und Name unter Fotos
//   2 💬 Privat mit anderen Kindern schreiben · Sichtbarkeit in Listen · Online-Status · eigener App-Zugang
//   3 🛡️ Bitte um besonderen Schutz (vertraulicher Hinweis an die Leitung, ohne Grund) · 🚗 Abholliste
// Die Nutzungsregeln (Schritt „Regeln anerkennen“) bestätigen alle schon im Zustimmungs-Fenster. Automatisch nach der Zustimmung
// (nur Echtbetrieb, nur solange noch nichts gewählt ist); jederzeit unter 👤 Meins → 🛡️ Schutz & Einwilligungen. Der Server setzt alles durch.
import { S, VIEWS, db, zeige, zeichne, kopf, name, vorname } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole, speichere, istEchtbetrieb, neueId } from "../kern/daten.js";
import { KS_CHAT, KS_SICHT, ksVon, ab16, FOTO_ZWECKE, GENEHMIGUNG_ZWECKE } from "../kern/schema.js";
import { kinderVon, elternVon, einwilligung } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

// Für wen wähle ich? Eltern: ihre Kinder · Kind ab 16: sich selbst
export const schutzFuer = () => [...(S.ich?.typ === "schueler" && ab16(S.ich) ? [S.ich.id] : []), ...kinderVon(db, S.ich?.id).filter((id) => hole("personen", id)?.typ === "schueler")];
const ks = (id) => ksVon({ [id]: hole("kinderschutz", id) }, id);
const selbst = (id) => id === S.ich?.id;
const sie = () => S.ich?.typ !== "schueler"; // Eltern siezen, Kinder duzen
// je Foto-Zweck die aktuelle Vorlage (höchste Fassung)
const fotoVorlagen = () => FOTO_ZWECKE.map((z) => liste("genehmigung_vorlagen", (v) => v.zweck === z && !v.geloescht_am).sort((a, b) => (b.fassung || 1) - (a.fassung || 1))[0]).filter(Boolean);
const zugangVorlage = () => liste("genehmigung_vorlagen", (v) => v.zweck === "eigener_zugang" && !v.geloescht_am)[0] || null;

// automatisch nach der Zustimmung: für Kinder, für die noch nichts gewählt ist
export function schutzPruefen() {
  if (!S.ich || !istEchtbetrieb() || document.getElementById("zsFenster") || document.getElementById("efFenster")) return false;
  const offen = schutzFuer().filter((id) => !hole("kinderschutz", id)?.bestaetigt_am);
  if (!offen.length) return false;
  starten(offen, true); return true;
}
const W = { kinder: [], i: 0, schritt: 1, auto: false, e: null };
function starten(ids, auto = false) { Object.assign(W, { kinder: ids, i: 0, auto }); vorbereiten(); zeige("kinderschutz"); }
function vorbereiten() {
  const id = W.kinder[W.i], k = ks(id);
  W.schritt = 1;
  W.e = { ...k, abholer: (k.abholer || []).map((a) => ({ ...a })), fotos: Object.fromEntries(fotoVorlagen().map((v) => [v.zweck, einwilligung(db, id, v.zweck) === "ja"])), zugang: einwilligung(db, id, "eigener_zugang") === "ja" };
}
AKTIONEN.ksStarten = (id) => starten(id ? [id] : schutzFuer(), false);

const schalter = (feld, t, x, an) => `<label class="schalter"><span><b>${t}</b>${x ? `<div class="hinweis">${x}</div>` : ""}</span><input type="checkbox" data-c="ksSchalter" data-x="${feld}" ${an ? "checked" : ""}></label>`;
const wahl = (feld, werte, akt) => `<div class="wahlen ks-wahl" role="radiogroup">${Object.entries(werte).map(([k, t]) => `<button type="button" role="radio" aria-checked="${akt === k}" class="chip-wahl${akt === k ? " an" : ""}" data-a="ksWahl" data-x="${feld}|${k}">${esc(t)}</button>`).join("")}</div>`;

VIEWS.kinderschutz = {
  render() {
    if (!W.kinder.length) return uebersicht();
    const id = W.kinder[W.i], p = hole("personen", id), e = W.e;
    const kopfz = kopf(`🛡️ ${selbst(id) ? "Meine Einstellungen" : `Schutz für ${vorname(id)}`}`) + `<div class="ks-schritte" aria-label="Schritt ${W.schritt} von 3">${[1, 2, 3].map((i) => `<i class="${i <= W.schritt ? "an" : ""}"></i>`).join("")}</div>
      ${W.kinder.length > 1 ? `<p class="hinweis">Kind ${W.i + 1} von ${W.kinder.length}: <b>${esc(name(p))}</b></p>` : ""}`;
    const knoepfe = `<div class="knopfreihe ks-knoepfe">${W.schritt > 1 ? '<button type="button" class="knopf" data-a="ksSchritt" data-x="-1">‹ Zurück</button>' : W.auto ? "" : '<button type="button" class="knopf" data-a="ksAbbrechen">Abbrechen</button>'}
      ${W.schritt < 3 ? '<button type="button" class="knopf haupt" data-a="ksSchritt" data-x="1">Weiter ›</button>' : '<button type="button" class="knopf haupt" data-a="ksFertig">✅ Speichern</button>'}</div>`;
    if (W.schritt === 1) {
      const fv = fotoVorlagen();
      return kopfz + `<div class="karte"><h3>📷 Fotos ${selbst(id) ? "von dir" : `von ${esc(vorname(id))}`}</h3>
        <p class="hinweis">Alles steht zuerst auf <b>aus</b>. Nur was ${sie() ? "Sie einschalten" : "du einschaltest"}, ist erlaubt – jederzeit widerrufbar.</p>
        ${fv.map((v) => schalter("foto:" + v.zweck, esc(GENEHMIGUNG_ZWECKE[v.zweck] || v.titel), v.zweck === "foto_intern" ? "nur angemeldete Mitglieder sehen sie" : "", e.fotos[v.zweck])).join("") || '<p class="hinweis">Die Leitung hat noch keine Foto-Vorlagen angelegt.</p>'}
        ${schalter("foto_name", "Name unter dem Foto", "sonst ohne Namen – auch wenn Fotos erlaubt sind", e.foto_name)}
        <p class="hinweis">Bei Konzerten: Wer „aus“ hat, wird nicht markiert und nicht veröffentlicht. Die Leitung sieht das in der 📷 Foto-Liste.</p></div>` + knoepfe;
    }
    if (W.schritt === 2) {
      const zv = zugangVorlage();
      return kopfz + `<div class="karte"><h3>💬 ${selbst(id) ? "Darfst du" : `Darf ${esc(vorname(id))}`} anderen Kindern privat schreiben?</h3>${wahl("kinder_chat", KS_CHAT, e.kinder_chat)}
        <p class="hinweis">Nur wenn <b>beide</b> Familien „Ja“ wählen, geht ein privater Chat zwischen zwei Kindern. Gruppenchats der Leitung gehen immer.</p></div>
        <div class="karte"><h3>👀 Wer sieht ${selbst(id) ? "dich" : esc(vorname(id))} in Mitglieder-Listen?</h3>${wahl("sichtbar", KS_SICHT, e.sichtbar)}
        <p class="hinweis">Gilt für andere Kinder und Eltern. Leitung und Lehrkräfte sehen immer alle.</p></div>
        <div class="karte">${schalter("online_sichtbar", "Online-Status für andere Kinder sichtbar", "„🟢 gerade da“", e.online_sichtbar)}
        ${zv && !selbst(id) ? schalter("zugang", "Eigener App-Zugang", "ab etwa Klasse 5 bzw. mit eigenem Handy – sonst sagen Sie für Ihr Kind zu", e.zugang) : ""}
        <p class="hinweis">Immer erlaubt: Chat mit Leitung, Lehrkräften und den eigenen Eltern. Anrufe nur mit den Eltern.</p></div>` + knoepfe;
    }
    const eltern = elternVon(db, id).map((x) => name(x)).join(", ");
    return kopfz + `<div class="karte ks-schutz"><h3>🛡️ ${selbst(id) ? "Brauchst du" : `Braucht ${esc(vorname(id))}`} besonderen Schutz?</h3>
      <p class="hinweis">z. B. Kontaktverbot, Sorgerechts-Regelung, eine bestimmte Person darf ${selbst(id) ? "dich" : "das Kind"} nicht abholen oder sehen.</p>
      ${wahl("schutz_wunsch", { nein: "Nein", ja: "Ja – bitte Leitung kontaktieren" }, e.schutz_wunsch ? "ja" : "nein")}
      <p class="hinweis">Bei „Ja“ bekommt die Leitung einen vertraulichen Hinweis. <b>Gründe stehen nicht in der App</b> – das klären ${sie() ? "Sie" : "deine Eltern"} persönlich. Mit Schutzsperre: keine Fotos, für andere unsichtbar, keine Kontakte zu anderen Kindern.</p>
      ${e.schutz_aktiv ? '<p class="badge b-gruen">🛡️ Schutzsperre ist aktiv</p>' : ""}</div>
      <div class="karte"><h3>🚗 Wer darf ${selbst(id) ? "dich" : esc(vorname(id))} abholen?</h3>
      <p>Immer: <b>${esc(eltern || "die Eltern")}</b></p>
      ${e.abholer.map((a, i) => `<div class="ks-abholer"><input aria-label="Name" placeholder="Name" maxlength="60" value="${esc(a.name)}" data-c="ksAbholer" data-x="${i}|name"><input aria-label="Beziehung" placeholder="z. B. Oma, Nachbarin" maxlength="40" value="${esc(a.beziehung)}" data-c="ksAbholer" data-x="${i}|beziehung"><input aria-label="Telefon" placeholder="Telefon (freiwillig)" maxlength="30" inputmode="tel" value="${esc(a.telefon)}" data-c="ksAbholer" data-x="${i}|telefon"><button type="button" class="knopf klein" data-a="ksAbholerWeg" data-x="${i}" aria-label="${esc(a.name || "Person")} entfernen">✕</button></div>`).join("")}
      ${e.abholer.length < 8 ? '<button type="button" class="knopf" data-a="ksAbholerNeu">＋ weitere Person</button>' : ""}
      <p class="hinweis">Leitung und Lehrkräfte sehen die Liste, z. B. nach einer Fahrt. Andere Eltern nicht.</p></div>` + knoepfe;
  },
};
AKTIONEN.ksSchalter = (_, el) => { const f = el.dataset.x; if (f.startsWith("foto:")) W.e.fotos[f.slice(5)] = el.checked; else W.e[f] = el.checked; };
AKTIONEN.ksWahl = (x) => { const [f, v] = String(x).split("|"); W.e[f] = f === "schutz_wunsch" ? v === "ja" : v; zeichne(); };
AKTIONEN.ksAbholer = (_, el) => { const [i, f] = el.dataset.x.split("|"); if (W.e.abholer[i]) W.e.abholer[i][f] = el.value; };
AKTIONEN.ksAbholerNeu = () => { abholerLesen(); W.e.abholer.push({ name: "", beziehung: "", telefon: "" }); zeichne(); setTimeout(() => document.querySelector(".ks-abholer:last-of-type input")?.focus(), 50); };
AKTIONEN.ksAbholerWeg = (i) => { abholerLesen(); W.e.abholer.splice(Number(i), 1); zeichne(); };
// Eingaben, die noch nicht „change“ gemeldet haben (Fokus im Feld), mitnehmen
function abholerLesen() { document.querySelectorAll(".ks-abholer input").forEach((el) => { const [i, f] = el.dataset.x.split("|"); if (W.e.abholer[i]) W.e.abholer[i][f] = el.value; }); }
AKTIONEN.ksSchritt = (d) => { if (W.schritt === 3) abholerLesen(); W.schritt = Math.min(3, Math.max(1, W.schritt + Number(d))); zeichne(); window.scrollTo(0, 0); };
AKTIONEN.ksAbbrechen = () => { W.kinder = []; zeichne(); };
AKTIONEN.ksFertig = async () => {
  abholerLesen();
  const id = W.kinder[W.i], e = W.e, alt = hole("kinderschutz", id), jetzt = new Date().toISOString();
  try {
    await speichere("kinderschutz", { ...(alt || {}), id, kind_id: id, kinder_chat: e.kinder_chat, sichtbar: e.sichtbar, online_sichtbar: !!e.online_sichtbar, foto_name: !!e.foto_name,
      schutz_wunsch: !!e.schutz_wunsch, abholer: e.abholer.filter((a) => String(a.name || "").trim()), ...(istEchtbetrieb() ? {} : { bestaetigt_am: jetzt, bestaetigt_von: S.ich.id, schutz_aktiv: !!alt?.schutz_aktiv }) });
    // 📷 Fotos und 🔑 eigener Zugang als Genehmigungen (nur wenn sich etwas ändert)
    const zwecke = [...fotoVorlagen().map((v) => [v, !!e.fotos[v.zweck]]), ...(zugangVorlage() && !selbst(id) ? [[zugangVorlage(), !!e.zugang]] : [])];
    for (const [v, ja] of zwecke) {
      if ((einwilligung(db, id, v.zweck) === "ja") === ja) continue;
      const g = liste("genehmigungen", (x) => x.kind_id === id && x.vorlage_id === v.id).sort((a, b) => String(b.beantwortet_am || "").localeCompare(String(a.beantwortet_am || "")))[0];
      const status = ja ? "erteilt" : g?.status === "erteilt" ? "widerrufen" : "abgelehnt";
      await speichere("genehmigungen", g ? { ...g, status, ...(istEchtbetrieb() ? {} : { beantwortet_am: jetzt, beantwortet_von: S.ich.id }) } : { id: neueId(), vorlage_id: v.id, kind_id: id, status, beantwortet_am: jetzt, beantwortet_von: S.ich.id, vorlage_version: v.fassung || 1 });
    }
    if (e.schutz_wunsch && !alt?.schutz_wunsch) bitteMelden(id);
    toast(`🛡️ Gespeichert${W.kinder.length > 1 ? ` – ${vorname(id)}` : ""}`);
    if (W.i + 1 < W.kinder.length) { W.i++; vorbereiten(); zeichne(); window.scrollTo(0, 0); return; }
    const auto = W.auto; W.kinder = [];
    if (auto) { zeige("start", {}, { ersetzen: true }); document.dispatchEvent(new CustomEvent("bk-schutz-fertig")); } else zeichne();
  } catch (err) { toast("⚠️ " + (err.message || "Speichern ging nicht")); }
};
// Bitte um besonderen Schutz: vertraulicher Hinweis an die Leitung – ohne Grund, ohne Details
function bitteMelden(id) {
  const an = liste("personen", (p) => p.status !== "ausgetreten" && (p.rollen || []).some((r) => ["leitung", "admin"].includes(r)) && p.id !== S.ich?.id).map((p) => p.id);
  if (an.length) senden({ an, betreff: "🛡️ Bitte um besonderen Schutz", text: `Für ${name(id)} bitten die Eltern um besonderen Schutz. Bitte persönlich Kontakt aufnehmen (Gründe stehen bewusst nicht in der App). Danach in der App: Leitung → 🛡️ Schutz & Fotos → Schutzsperre.`, ereignis: "genehmigung" }).catch(() => {});
}

function uebersicht() {
  const ids = schutzFuer();
  const fotoKurz = { foto_intern: "App", foto_website: "Website", foto_presse: "Presse", foto_social: "Social" };
  return kopf("🛡️ Schutz & Einwilligungen") + `<p class="hinweis">Was für ${sie() ? "Ihr Kind" : "dich"} gilt – Fotos, Kontakt, Sichtbarkeit und wer abholen darf. Alles ist zuerst aus; ${sie() ? "Sie entscheiden" : "du entscheidest"}.</p>
    ${ids.map((id) => { const k = ks(id), gewaehlt = !!hole("kinderschutz", id)?.bestaetigt_am;
      return `<div class="karte ks-karte"><h3>${esc(selbst(id) ? "Ich" : name(id))} ${k.schutz_aktiv ? '<span class="badge b-gruen">🛡️ Schutzsperre</span>' : k.schutz_wunsch ? '<span class="badge b-gelb">🛡️ Schutz erbeten</span>' : ""}${gewaehlt ? "" : ' <span class="badge b-grau">⏳ noch nicht gewählt – alles aus</span>'}</h3>
        <ul class="ks-liste"><li>📷 Fotos: ${fotoVorlagen().map((v) => `${einwilligung(db, id, v.zweck) === "ja" ? "✅" : "⛔"} ${fotoKurz[v.zweck]}`).join(" · ") || "–"}${k.foto_name ? " · Name darunter" : ""}</li>
        <li>💬 Privat mit anderen Kindern: ${k.kinder_chat === "ja" ? "✅ ja" : "🚫 nein"}${k.online_sichtbar ? " · 🟢 Online-Status sichtbar" : ""}</li>
        <li>👀 Für andere sichtbar: ${esc(KS_SICHT[k.sichtbar] || "")}</li>
        <li>🚗 Abholen: Eltern${(k.abholer || []).length ? " · " + k.abholer.map((a) => esc(a.name) + (a.beziehung ? ` (${esc(a.beziehung)})` : "")).join(", ") : ""}</li></ul>
        <button type="button" class="knopf${gewaehlt ? "" : " haupt"}" data-a="ksStarten" data-x="${esc(id)}">${gewaehlt ? "✏️ Ändern" : "▶ Jetzt festlegen"}</button>
        ${gewaehlt ? `<p class="hinweis">Zuletzt bestätigt ${new Date(hole("kinderschutz", id).bestaetigt_am).toLocaleDateString("de-DE")}.</p>` : ""}</div>`; }).join("") || '<div class="karte"><p>Hier legen Eltern (und Jugendliche ab 16) fest, was gilt.</p></div>'}
    <div class="karte"><p class="hinweis">⚖️ Mehr dazu unter <button type="button" class="link" data-a="kachel" data-x="datenschutz">Datenschutz</button>. Fragen oder Widerruf: bei der Leitung.</p></div>`;
}
