// 🚪 Mitgliedschaft & Kündigung (0.66.0, Konzept mit Beispielbild abgestimmt – Wunsch Hansi): vier Varianten
//   🚪 alles kündigen · 🎓 als Ehemalige/r bleiben · 🧩 nur einen Teil (Gruppe, Förderverein, Mitteilungen, Fotos) · 💤 pausieren
// Ablauf in drei Schritten: was/für wen/zum → „Das passiert“ (Daten, offene Rückgaben) → mit dem Finger unterschreiben.
// Kinder unter 18 kündigen über die Eltern. Bis zum Datum jederzeit zurücknehmen. Die Leitung (📮 Kündigungen) bestätigt –
// das Bestätigungsschreiben im Bachkreis-Kopfbogen geht als PDF in den 📥 Eingangskorb und als E-Mail. Wirksam macht es der Server
// am Datum (Wartung) oder die Leitung mit „Jetzt wirksam machen“. 🗄️ Archiv: Ausgetretene mit Löschdatum.
import { S, VIEWS, db, zeichne, kopf, name, hatRolle, istEltern } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, frage } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele, konfig, neueId, istEchtbetrieb, serverAktion } from "../kern/daten.js";
import { KUENDIGUNG_ARTEN, KUENDIGUNG_BEREICHE, KUENDIGUNG_STATUS, KUENDIGUNG_WEGE, KUENDIGUNG_VERWALTER, KUENDIGUNG_NACHWEIS_JAHRE, erwachsen, kuendigungOffen } from "../kern/schema.js";
import { kinderVon, elternVon, kuendigungFolgen, kuendigungVorschau, kuendigungOffenePunkte } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

export const kuChef = () => hatRolle(...KUENDIGUNG_VERWALTER);
const tagIso = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const dat = (iso) => (iso ? new Date(iso + (String(iso).length === 10 ? "T12:00" : "")).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–");
const plusMonate = (iso, m) => { const d = new Date(iso + "T12:00"); d.setMonth(d.getMonth() + m); return tagIso(d); };
const loeschMonate = () => Number(konfig().loeschfrist_monate) || 24;
const monatsende = () => { const d = new Date(); return tagIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const schuljahresende = () => { const d = new Date(); return `${d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear()}-07-31`; };
// für wen darf ich kündigen? ich selbst (volljährig/erwachsen) und meine Kinder
const fuerWen = () => [...(erwachsen(S.ich) ? [S.ich.id] : []), ...kinderVon(db, S.ich?.id)].filter((id) => hole("personen", id));
const meine = () => new Set([S.ich?.id, ...kinderVon(db, S.ich?.id)]);
const badge = (k) => `<span class="badge ${k.status === "bestaetigt" ? "b-gruen" : k.status === "eingegangen" ? "b-gelb" : k.status === "vollzogen" ? "b-blau" : "b-grau"}">${esc(KUENDIGUNG_STATUS[k.status] || k.status)}</span>`;
const kurz = (k) => `${KUENDIGUNG_ARTEN[k.art] || k.art}${k.art === "teil" ? ": " + (k.bereiche || []).map((b) => KUENDIGUNG_BEREICHE[b]?.replace(/^\S+\s/, "") || b).join(", ") : ""}${k.art === "alles" && (k.bereiche || []).includes("foerderverein") ? " + Förderverein" : ""}`;
const wann = (k) => (k.art === "pause" ? `${dat(k.zum)} – ${dat(k.bis)}` : `zum ${dat(k.zum)}`);

// ---------- 👤 Meine Mitgliedschaft (alle) ----------
const K = { schritt: 0 };
function neu(art = "alles", pid = null) {
  const f = fuerWen();
  Object.assign(K, { schritt: 1, art, pid: pid || (f.length === 1 ? f[0] : f.find((x) => x !== S.ich?.id) || f[0]), zumWahl: art === "pause" ? "datum" : "schuljahr", zum: tagIso(), bis: plusMonate(tagIso(), 3), bereiche: new Set(), gruppen: new Set(), fv: false, grund: "" });
}
VIEWS.kuendigung = {
  render() {
    if (K.schritt) return kopf("🚪 " + ["", "Was möchten Sie kündigen?", "Das passiert", "Verbindlich kündigen"][K.schritt].replace("Sie", istEltern() || erwachsen(S.ich) ? "Sie" : "du")) + assistent();
    const m = meine(), l = liste("kuendigungen", (k) => !k.geloescht_am && (m.has(k.person_id) || k.eingereicht_von === S.ich?.id)).sort((a, b) => String(b.eingereicht_am || "").localeCompare(String(a.eingereicht_am || "")));
    const f = fuerWen(), pauseBald = l.filter((k) => k.art === "pause" && k.status === "vollzogen" && k.bis && k.bis >= tagIso() && k.bis <= plusMonate(tagIso(), 1));
    return kopf("🚪 Mitgliedschaft & Kündigung") + `
      ${pauseBald.map((k) => `<div class="karte ku-hinweis"><p>💤 Die Pause von <b>${esc(name(k.person_id))}</b> endet am <b>${dat(k.bis)}</b> – danach ist ${esc(name(k.person_id).split(" ")[0])} automatisch wieder dabei.</p>
        <button type="button" class="knopf" data-a="kuVerlaengern" data-x="${esc(k.id)}">💤 Pause verlängern</button></div>`).join("")}
      ${l.length ? `<div class="karte"><h3>📮 Eingereicht</h3><ul class="liste">${l.map((k) => `<li><div class="fl"><div class="zeile-titel">${esc(name(k.person_id))} · ${esc(kurz(k))}</div>
        <div class="zeile-unter">${wann(k)} · ${esc(k.az || "")}${k.status === "bestaetigt" ? " · Bestätigung im 📥 Eingangskorb" : ""}</div></div>${badge(k)}
        ${kuendigungOffen(k) ? `<button type="button" class="knopf klein" data-a="kuZurueck" data-x="${esc(k.id)}">↩️ Zurücknehmen</button>` : ""}</li>`).join("")}</ul></div>` : ""}
      ${f.length ? `<div class="karte"><h3>Was möchten ${istEltern() || erwachsen(S.ich) ? "Sie" : "du"} tun?</h3><div class="ku-arten">${Object.entries(KUENDIGUNG_ARTEN).reverse().map(([a, t]) => `<button type="button" class="ku-art ku-${a}" data-a="kuNeu" data-x="${a}"><b>${esc(t)}</b><small>${esc(ART_TEXT[a])}</small></button>`).join("")}</div></div>`
        : `<div class="karte"><p>👪 <b>Kündigen geht über deine Eltern.</b> Sie können es in ihrer App unter 👤 Meins → 🚪 Mitgliedschaft &amp; Kündigung erledigen – auch eine Pause.</p></div>`}
      <div class="karte"><h3>🔒 Was mit den Daten passiert</h3><ul class="ku-daten">
        <li>🩺 Gesundheitsangaben und 🎙️ Übe-Aufnahmen: <b>gelöscht</b>, sobald die Kündigung wirksam ist</li>
        <li>📇 Kontakt- und Adressdaten: gelöscht nach <b>${loeschMonate()} Monaten</b>; Anwesenheit und Ausleih-Verlauf werden dann anonymisiert</li>
        <li>💶 Beitrags-Buchungen des Fördervereins: 10 Jahre (Steuerrecht) · 📮 der Kündigungs-Nachweis: ${KUENDIGUNG_NACHWEIS_JAHRE} Jahre</li>
        <li>Auskunft oder frühere Löschung: formlos an die Leitung (⚖️ Datenschutz)</li></ul></div>`;
  },
};
const ART_TEXT = { pause: "bis zu einem Datum – alles bleibt", teil: "Gruppe, Förderverein, Mitteilungen, Fotos", ehemalig: "Orchester verlassen, Kontakt halten", alles: "Bachkreis und App" };
AKTIONEN.kuNeu = (art) => { neu(art); zeichne(); };
AKTIONEN.kuAbbrechen = () => { K.schritt = 0; zeichne(); };
AKTIONEN.kuVerlaengern = (id) => { const k = hole("kuendigungen", id); neu("pause", k.person_id); Object.assign(K, { zum: k.bis, bis: plusMonate(k.bis, 3) }); zeichne(); };
AKTIONEN.kuZurueck = async (id) => {
  const k = hole("kuendigungen", id); if (!k || !(await frage(`Kündigung ${k.az || ""} für ${name(k.person_id)} zurücknehmen? Dann bleibt alles, wie es ist.`))) return;
  try { await speichere("kuendigungen", { ...k, status: "zurueckgenommen" }); toast("↩️ Zurückgenommen – schön, dass es weitergeht!"); bescheidLeitung(k, "↩️ zurückgenommen"); zeichne(); } catch (e) { toast("⚠️ " + (e.message || "ging nicht")); }
};

function assistent() {
  const f = fuerWen(), p = hole("personen", K.pid), punkte = `<div class="ku-schritte" aria-label="Schritt ${K.schritt} von 3">${[1, 2, 3].map((i) => `<i class="${i <= K.schritt ? "an" : ""}"></i>`).join("")}</div>`;
  if (K.schritt === 1) {
    const gruppen = liste("gruppe_zuordnung", (g) => g.person_id === K.pid && !g.geloescht_am && (!g.bis || g.bis >= tagIso())).map((g) => hole("gruppen", g.gruppe_id)).filter(Boolean);
    const fv = liste("fv_mitglieder", (x) => x.person_id === K.pid && !x.austritt).length > 0;
    const arten = Object.entries(KUENDIGUNG_ARTEN).reverse().filter(([a]) => a !== "ehemalig" || p?.typ === "schueler");
    return punkte + `<div class="karte"><div class="ku-arten">${arten.map(([a, t]) => `<button type="button" class="ku-art ku-${a}${K.art === a ? " an" : ""}" data-a="kuArt" data-x="${a}" aria-pressed="${K.art === a}"><b>${esc(t)}</b><small>${esc(ART_TEXT[a])}</small></button>`).join("")}</div></div>
      <div class="karte"><h3>Für wen?</h3><div class="wahlen">${f.map((id) => `<button type="button" class="chip-wahl${K.pid === id ? " an" : ""}" data-a="kuFuer" data-x="${esc(id)}" aria-pressed="${K.pid === id}">${esc(id === S.ich.id ? `ich (${name(id)})` : name(id))}</button>`).join("")}</div></div>
      <div class="karte">${K.art === "pause" ? `<div class="feld"><label for="kuVon">Pause ab</label><input type="date" id="kuVon" value="${esc(K.zum)}" min="${tagIso()}" data-c="kuFeld" data-x="zum"></div>
          <div class="feld"><label for="kuBis">Pause bis</label><input type="date" id="kuBis" value="${esc(K.bis)}" min="${esc(K.zum)}" data-c="kuFeld" data-x="bis"></div><p class="hinweis">Danach automatisch wieder dabei – mit kurzer Nachricht vorher.</p>`
        : `<div class="feld"><label for="kuZum">Wirksam zum</label><select id="kuZum" data-c="kuZumWahl">${[["sofort", `sofort (${dat(tagIso())})`], ["monat", `Monatsende (${dat(monatsende())})`], ["schuljahr", `Schuljahresende (${dat(schuljahresende())})`], ["datum", "eigenes Datum"]].map(([w, t]) => `<option value="${w}"${K.zumWahl === w ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
          ${K.zumWahl === "datum" ? `<div class="feld"><label for="kuDatum">Datum</label><input type="date" id="kuDatum" value="${esc(K.zum)}" min="${tagIso()}" data-c="kuFeld" data-x="zum"></div>` : ""}`}
        ${K.art === "teil" ? `<h3>Was genau?</h3>${Object.entries(KUENDIGUNG_BEREICHE).filter(([b]) => (b !== "gruppe" || gruppen.length) && (b !== "foerderverein" || fv)).map(([b, t]) => `<label class="pf-wunsch"><input type="checkbox" data-c="kuBereich" data-x="${b}"${K.bereiche.has(b) ? " checked" : ""}> ${esc(t)}</label>`).join("")}
          ${K.bereiche.has("gruppe") ? `<div class="ku-gruppen">${gruppen.map((g) => `<label class="pf-wunsch"><input type="checkbox" data-c="kuGruppe" data-x="${esc(g.id)}"${K.gruppen.has(g.id) ? " checked" : ""}> ${esc(g.name)}</label>`).join("")}</div>` : ""}` : ""}
        ${K.art === "alles" && fv ? `<label class="pf-wunsch"><input type="checkbox" data-c="kuFv"${K.fv ? " checked" : ""}> 💛 auch aus dem Förderverein austreten</label>` : ""}</div>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="kuAbbrechen">Abbrechen</button><button type="button" class="knopf haupt" data-a="kuWeiter">Weiter ›</button></div>`;
  }
  const k = entwurf();
  if (K.schritt === 2) {
    const v = kuendigungVorschau(db, k, { monate: loeschMonate() }), offen = kuendigungOffenePunkte(db, K.pid);
    return punkte + `<div class="karte"><p><b>${esc(name(p))}</b> · ${esc(kurz(k))} · ${wann(k)}</p><ul class="liste ku-folgen">${v.zeilen.map(([s, was, w]) => `<li><span aria-hidden="true">${s}</span><div class="fl">${esc(was)}</div><small>${esc(w)}</small></li>`).join("")}</ul></div>
      ${offen.length && k.art !== "pause" ? `<div class="karte ku-offen"><h3>⚠️ Noch zurückzugeben</h3><ul>${offen.map((o) => `<li>${esc(o)}</li>`).join("")}</ul><p class="hinweis">Bitte bis zum ${dat(k.zum)} in der Probe abgeben.</p></div>` : ""}
      <div class="karte"><div class="feld"><label for="kuGrund">Grund (freiwillig)</label><input id="kuGrund" maxlength="300" value="${esc(K.grund)}" data-c="kuFeld" data-x="grund" placeholder="z. B. Umzug, keine Zeit, Schulwechsel"></div></div>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="kuSchritt" data-x="1">‹ Zurück</button><button type="button" class="knopf haupt" data-a="kuSchritt" data-x="3">Weiter ›</button></div>`;
  }
  const satz = k.art === "pause" ? `Ich pausiere die Mitgliedschaft von <b>${esc(name(p))}</b> vom <b>${dat(k.zum)}</b> bis <b>${dat(k.bis)}</b>.`
    : k.art === "ehemalig" ? `<b>${esc(name(p))}</b> verlässt das Orchester zum <b>${dat(k.zum)}</b> und bleibt als Ehemalige/r im Bachkreis.`
    : k.art === "teil" ? `Ich kündige für <b>${esc(name(p))}</b> zum <b>${dat(k.zum)}</b>: ${esc(kurz(k).replace(/^.*?: /, ""))}.`
    : `Ich kündige die Mitgliedschaft von <b>${esc(name(p))}</b> im Bachkreis zum <b>${dat(k.zum)}</b>${K.fv ? " – auch im Förderverein" : ""}.`;
  return punkte + `<div class="karte"><p>${satz}</p>
      <div class="feld"><label for="kuName">Ihr Name</label><input id="kuName" maxlength="80" autocomplete="name" value="${esc(name(S.ich))}"></div>
      <p class="hinweis">Mit dem Finger oder der Maus im Feld unterschreiben:</p><canvas id="kuPad" class="lv-pad" width="600" height="220" role="img" aria-label="Unterschriftenfeld"></canvas>
      <div class="knopfreihe"><button type="button" class="knopf" data-a="kuPadNeu">↺ Nochmal</button></div>
      <button type="button" class="knopf breit ${k.art === "alles" ? "ku-rot" : "haupt"}" data-a="kuAbsenden">${k.art === "pause" ? "💤 Pause beantragen" : "🚪 Kündigung absenden"}</button>
      <p class="hinweis">Danach: Eingangsbestätigung sofort · die Leitung prüft und schickt die schriftliche Bestätigung · bis zum ${dat(k.zum)} jederzeit zurücknehmen.</p></div>
    <div class="knopfreihe"><button type="button" class="knopf" data-a="kuSchritt" data-x="2">‹ Zurück</button></div>`;
}
function entwurf() {
  const zum = K.art === "pause" || K.zumWahl === "datum" ? K.zum : { sofort: tagIso(), monat: monatsende(), schuljahr: schuljahresende() }[K.zumWahl];
  const bereiche = K.art === "teil" ? [...K.bereiche] : K.art === "alles" && K.fv ? ["foerderverein"] : [];
  return { person_id: K.pid, art: K.art, zum, bis: K.art === "pause" ? K.bis : null, bereiche, gruppe_ids: K.art === "teil" && K.bereiche.has("gruppe") ? [...K.gruppen] : [], grund: K.grund.trim() || null };
}
AKTIONEN.kuArt = (a) => { K.art = a; K.zumWahl = a === "pause" ? "datum" : K.zumWahl === "datum" && a !== "pause" ? "schuljahr" : K.zumWahl; zeichne(); };
AKTIONEN.kuFuer = (id) => { K.pid = id; K.gruppen.clear(); if (K.art === "ehemalig" && hole("personen", id)?.typ !== "schueler") K.art = "alles"; zeichne(); };
AKTIONEN.kuZumWahl = (w) => { K.zumWahl = w; if (w === "datum") K.zum = K.zum || tagIso(); zeichne(); };
AKTIONEN.kuFeld = (_, el) => { const x = el.dataset.x; K[x] = el.value; if (x === "zum" && K.art === "pause" && K.bis <= K.zum) K.bis = plusMonate(K.zum, 3); if (x !== "grund") zeichne(); };
AKTIONEN.kuBereich = (_, el) => { const b = el.dataset.x; if (el.checked) K.bereiche.add(b); else K.bereiche.delete(b); zeichne(); };
AKTIONEN.kuGruppe = (_, el) => { const g = el.dataset.x; if (el.checked) K.gruppen.add(g); else K.gruppen.delete(g); };
AKTIONEN.kuFv = (_, el) => { K.fv = el.checked; };
AKTIONEN.kuWeiter = () => {
  const k = entwurf();
  if (!k.person_id) return toast("Bitte wählen, für wen");
  if (!k.zum || k.zum < tagIso()) return toast("Bitte ein Datum ab heute wählen");
  if (k.art === "pause" && (!k.bis || k.bis <= k.zum)) return toast("Das Ende der Pause muss nach dem Beginn liegen");
  if (k.art === "teil" && !k.bereiche.length) return toast("Bitte mindestens einen Bereich ankreuzen");
  if (k.art === "teil" && k.bereiche.includes("gruppe") && !k.gruppe_ids.length) return toast("Bitte die Gruppe ankreuzen");
  K.schritt = 2; zeichne();
};
AKTIONEN.kuSchritt = (n) => { K.grund = document.getElementById("kuGrund")?.value ?? K.grund; K.schritt = Number(n); zeichne(); };

// ✍️ Unterschriftenfeld (wie beim Leihvertrag)
const PAD = { zeichnet: false, striche: 0 };
function padEinrichten() {
  const c = document.getElementById("kuPad"); if (!c || c.dataset.bereit) return; c.dataset.bereit = "1";
  const g = c.getContext("2d"); g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0d2a6b"; PAD.striche = 0;
  const pkt = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]; };
  c.addEventListener("pointerdown", (e) => { e.preventDefault(); c.setPointerCapture?.(e.pointerId); PAD.zeichnet = true; PAD.striche++; const [x, y] = pkt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); });
  c.addEventListener("pointermove", (e) => { if (!PAD.zeichnet) return; e.preventDefault(); const [x, y] = pkt(e); g.lineTo(x, y); g.stroke(); });
  const ende = () => { PAD.zeichnet = false; };
  c.addEventListener("pointerup", ende); c.addEventListener("pointercancel", ende); c.addEventListener("pointerleave", ende);
}
VIEWS.kuendigung.nach = () => { if (K.schritt === 3) padEinrichten(); };
AKTIONEN.kuPadNeu = () => { const c = document.getElementById("kuPad"); c?.getContext("2d").clearRect(0, 0, c.width, c.height); PAD.striche = 0; };
AKTIONEN.kuAbsenden = async () => {
  const c = document.getElementById("kuPad"), nameU = document.getElementById("kuName")?.value.trim();
  if (!nameU) return toast("Bitte den Namen eintragen");
  if (PAD.striche < 1) return toast("Bitte im Feld unterschreiben");
  const k = { id: neueId(), ...entwurf(), weg: "app", status: "eingegangen", unterschrift: { name: nameU, bild: c.toDataURL("image/png"), zeit: new Date().toISOString(), von: S.ich.id }, eingereicht_von: S.ich.id, eingereicht_am: new Date().toISOString() };
  if (!istEchtbetrieb()) k.az = `K-${new Date().getFullYear()}-${k.id.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase()}`; // wie der Server
  try {
    const z = await speichere("kuendigungen", k);
    const art = KUENDIGUNG_ARTEN[k.art];
    senden({ an: [...new Set([S.ich.id, k.person_id])], ereignis: "genehmigung", betreff: `📮 Eingang bestätigt: ${art} (${z.az || ""})`, text: `Ihre Nachricht ist angekommen: ${art} für ${name(k.person_id)} ${wann(k)}. Die Leitung prüft sie und schickt Ihnen die schriftliche Bestätigung. Bis dahin können Sie unter 👤 Meins → 🚪 Mitgliedschaft & Kündigung zurücknehmen.` }).catch(() => {});
    bescheidLeitung(z, "📮 neu eingegangen");
    K.schritt = 0; toast("📮 Eingegangen – Bestätigung folgt"); zeichne();
  } catch (e) { toast("⚠️ " + (e.message || "Absenden ging nicht")); }
};
function bescheidLeitung(k, was) {
  const an = liste("personen", (p) => p.status !== "ausgetreten" && (p.rollen || []).some((r) => ["leitung", "admin"].includes(r)) && p.id !== S.ich?.id).map((p) => p.id);
  if (an.length) senden({ an, betreff: `📮 Kündigung ${was}: ${name(k.person_id)}`, text: `${kurz(k)} ${wann(k)} (${k.az || ""}). Bearbeiten: Leitung → 👥 Mitglieder → 📮 Kündigungen.` }).catch(() => {});
}

// ---------- 📮 Kündigungen (Leitung/Vorstand) ----------
const L = { filter: "offen" };
VIEWS.kuendigungen = {
  render() {
    if (!kuChef()) return kopf("📮 Kündigungen") + '<p class="hinweis">Nur für Leitung und Vorstand.</p>';
    const alle = liste("kuendigungen", (k) => !k.geloescht_am).sort((a, b) => String(a.zum).localeCompare(String(b.zum)));
    const zahl = { offen: alle.filter((k) => k.status === "eingegangen").length, bestaetigt: alle.filter((k) => k.status === "bestaetigt").length };
    const chip = (k, t) => `<button type="button" class="chip-wahl${L.filter === k ? " an" : ""}" data-a="kuFilter" data-x="${k}" aria-pressed="${L.filter === k}">${t}</button>`;
    const kopfz = kopf("📮 Kündigungen", '<button type="button" class="knopf haupt klein" data-a="kuErfassen">＋ Papier/Mail</button>')
      + `<div class="wahlen">${chip("offen", `📮 Eingang ${zahl.offen}`)}${chip("bestaetigt", `✅ Bestätigt ${zahl.bestaetigt}`)}${chip("alle", "Alle")}${chip("archiv", "🗄️ Archiv")}</div>`;
    if (L.filter === "archiv") return kopfz + archivHtml();
    const l = alle.filter((k) => (L.filter === "alle" ? true : k.status === (L.filter === "offen" ? "eingegangen" : "bestaetigt")));
    return kopfz + `<div class="karte"><ul class="liste ku-liste">${l.map((k) => `<li><div class="fl"><div class="zeile-titel">${esc(name(k.person_id))} · ${esc(kurz(k))}</div>
      <div class="zeile-unter">${wann(k)} · ${esc(k.az || "")} · ${esc(KUENDIGUNG_WEGE[k.weg] || "")}${k.grund ? ` · „${esc(k.grund)}“` : ""}</div>
      ${k.offen ? `<div class="zeile-unter">⚠️ ${esc(k.offen)}</div>` : ""}</div>${badge(k)}
      <span class="ku-knoepfe">${k.status === "eingegangen" ? `<button type="button" class="knopf klein haupt" data-a="kuBestaetigen" data-x="${esc(k.id)}">✅ Bestätigen</button>` : ""}
        ${["bestaetigt", "vollzogen"].includes(k.status) ? `<button type="button" class="knopf klein" data-a="kuSchreiben" data-x="${esc(k.id)}">📄 Schreiben</button>` : ""}
        ${k.status === "bestaetigt" ? `<button type="button" class="knopf klein" data-a="kuVollziehen" data-x="${esc(k.id)}">🏁 Jetzt wirksam</button>` : ""}
        ${kuendigungOffen(k) ? `<button type="button" class="knopf klein" data-a="kuZurueck" data-x="${esc(k.id)}">↩️</button>` : ""}</span></li>`).join("") || '<li class="hinweis">Nichts in dieser Auswahl.</li>'}</ul>
      <p class="hinweis">Bestätigte Kündigungen werden am Datum automatisch wirksam (Zugang gesperrt bzw. Pause/Ehemalige/Teil umgesetzt). Pausen enden von selbst.</p></div>`;
  },
};
function archivHtml() {
  const m = loeschMonate(), l = liste("personen", (p) => p.status === "ausgetreten" && !p.anonymisiert).sort((a, b) => String(b.ausgetreten_am || "").localeCompare(String(a.ausgetreten_am || "")));
  return `<div class="karte"><h3>🗄️ Ausgetreten (${l.length})</h3><p class="hinweis">Zugang gesperrt, nur Leitung/Vorstand sieht sie. Nach ${m} Monaten werden Kontaktdaten gelöscht und der Rest anonymisiert (PC-Verwaltung → Datenschutz & Löschfristen).</p>
    <ul class="liste">${l.map((p) => { const bis = p.ausgetreten_am ? plusMonate(p.ausgetreten_am, m) : null; return `<li><div class="fl"><div class="zeile-titel">${esc(name(p))}</div><div class="zeile-unter">ausgetreten ${dat(p.ausgetreten_am)} · Löschung ${bis ? (bis <= tagIso() ? "<b>fällig</b>" : "ab " + dat(bis)) : "–"}</div></div></li>`; }).join("") || '<li class="hinweis">Niemand im Archiv.</li>'}</ul></div>`;
}
AKTIONEN.kuFilter = (f) => { L.filter = f; zeichne(); };
AKTIONEN.kuBestaetigen = (id) => {
  const k = hole("kuendigungen", id); if (!k) return;
  const offen = k.offen ?? kuendigungOffenePunkte(db, k.person_id).join(", ");
  blatt(`✅ Bestätigen: ${name(k.person_id)}`, `<p>${esc(kurz(k))} · ${wann(k)}</p>
    <div class="feld"><label for="kuOffen">Noch zurückzugeben / offen (steht im Schreiben)</label><textarea id="kuOffen" rows="3" maxlength="2000">${esc(offen)}</textarea></div>
    <p class="hinweis">Danach entsteht das Bestätigungsschreiben im Bachkreis-Kopfbogen: als PDF in den 📥 Eingangskorb (bei Kindern sehen es die Eltern) und als E-Mail.</p>
    <button type="button" class="knopf haupt breit" data-a="kuBestaetigenLos" data-x="${esc(id)}">✅ Bestätigen und Schreiben senden</button>`);
};
AKTIONEN.kuBestaetigenLos = async (id) => {
  const k = hole("kuendigungen", id), offen = document.getElementById("kuOffen")?.value.trim() || "";
  try {
    const z = await speichere("kuendigungen", { ...k, offen, status: "bestaetigt", ...(istEchtbetrieb() ? {} : { bestaetigt_von: S.ich.id, bestaetigt_am: new Date().toISOString() }) });
    blattZu();
    const an = empfaenger(z);
    senden({ an, ereignis: "genehmigung", betreff: `✅ Bestätigung: ${KUENDIGUNG_ARTEN[z.art]} (${z.az || ""})`, text: briefText(z) }).catch(() => {});
    await schreiben(z, { zustellen: an });
    zeichne();
  } catch (e) { toast("⚠️ " + (e.message || "Bestätigen ging nicht")); }
};
// Empfänger der Bestätigung: die Person (wenn erwachsen) und die Eltern (bei Kindern), dazu wer eingereicht hat
const empfaenger = (k) => { const p = hole("personen", k.person_id); return [...new Set([...(erwachsen(p) ? [k.person_id] : []), ...elternVon(db, k.person_id), k.eingereicht_von].filter((id) => id && hole("personen", id)))]; };
AKTIONEN.kuSchreiben = (id) => schreiben(hole("kuendigungen", id));
AKTIONEN.kuVollziehen = async (id) => {
  const k = hole("kuendigungen", id); if (!k || !(await frage(`${kurz(k)} für ${name(k.person_id)} jetzt sofort wirksam machen?${k.art === "alles" ? " Der Zugang wird gesperrt." : ""}`))) return;
  try {
    if (istEchtbetrieb()) { const r = await serverAktion("kuendigung_vollziehen", { id }); if (!r?.ok) throw new Error(r?.fehler || "ging nicht"); }
    else { const folgen = kuendigungFolgen(db, k, new Date()); const je = {}; for (const f of folgen) (je[f.tab] = je[f.tab] || []).push(f.zeile); for (const [t, z] of Object.entries(je)) await speichereViele(t, z); }
    toast("🏁 Wirksam"); zeichne();
  } catch (e) { toast("⚠️ " + (e.message || "ging nicht")); }
};

// ---------- 📄 Bestätigungsschreiben im Bachkreis-Kopfbogen (Druckvorschau: Drucken, PDF, Eingangskorb) ----------
function briefZeilen(k) {
  const v = kuendigungVorschau(db, k, { monate: loeschMonate() });
  return [...(k.offen ? [["Noch zurückzugeben", `${k.offen} – bis ${dat(k.zum)}`]] : []), ...v.zeilen.map(([s, was, w]) => [`${s} ${was}`, w]),
    ["Ihre Rechte", "Auskunft, Berichtigung und frühere Löschung (soweit keine Pflicht entgegensteht) – formlos an die Leitung"]];
}
function briefText(k) {
  const p = hole("personen", k.person_id);
  return `Wir bestätigen den Eingang Ihrer Nachricht vom ${dat(String(k.eingereicht_am || "").slice(0, 10) || tagIso())}: ${KUENDIGUNG_ARTEN[k.art]} für ${name(p)} ${wann(k)} (Az. ${k.az || ""}).\n\n`
    + briefZeilen(k).map(([a, b]) => `• ${a}: ${b}`).join("\n") + "\n\nDas Schreiben liegt als PDF in Ihrem 📥 Eingangskorb in der App.";
}
export function briefHtml(k) {
  const kf = konfig(), p = hole("personen", k.person_id);
  const an = erwachsen(p) ? p : hole("personen", elternVon(db, k.person_id).includes(k.eingereicht_von) ? k.eingereicht_von : elternVon(db, k.person_id)[0]) || p; // bei Kindern an die Eltern
  const absender = [kf.impressum_name || kf.name || "Bachkreis Bergkamen", kf.impressum_anschrift || ""].filter(Boolean).join(" · ").replace(/\n/g, ", ");
  const anschrift = an ? [name(an), an.strasse, [an.plz, an.ort].filter(Boolean).join(" ")].filter(Boolean).join("<br>") : "";
  const kind = !erwachsen(p);
  const anrede = an ? `Guten Tag ${esc(name(an))}` : "Guten Tag";
  const abschluss = { alles: kind ? `Schade, dass ${esc(p?.vorname || "")} geht – bei unseren Konzerten ist ${esc(p?.vorname || "")} jederzeit herzlich willkommen.` : "Schade, dass Sie gehen – bei unseren Konzerten sind Sie jederzeit herzlich willkommen.", ehemalig: "Schön, dass der Kontakt bleibt – willkommen im Kreis der Ehemaligen!",
    teil: "Alles andere bleibt, wie es ist.", pause: "Wir freuen uns auf die Rückkehr!" }[k.art] || "";
  return `<div class="dv-brief ku-brief"><div class="dv-abs">${esc(absender)}</div><div class="ku-an">${anschrift}</div><div class="dv-datum">${dat(tagIso())}</div>
    <h1>${k.art === "pause" ? "Bestätigung Ihrer Pause" : "Bestätigung Ihrer Kündigung"} <small>· Az. ${esc(k.az || "")}</small></h1>
    <p>${anrede},</p>
    <p>wir bestätigen den Eingang Ihrer ${esc(KUENDIGUNG_WEGE[k.weg]?.replace(/^\S+\s/, "") || "")} eingereichten Nachricht vom ${dat(String(k.eingereicht_am || "").slice(0, 10))}: <b>${esc(kurz(k).replace(/^\S+\s/, ""))}</b> für <b>${esc(name(p))}</b>, ${k.art === "pause" ? `vom <b>${dat(k.zum)}</b> bis <b>${dat(k.bis)}</b>` : `wirksam zum <b>${dat(k.zum)}</b>`}.</p>
    <table class="ku-tabelle">${briefZeilen(k).map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</table>
    <p>${abschluss}</p><p>Mit freundlichen Grüßen</p><p class="ku-gez"><i>i. A. ${esc(name(k.bestaetigt_von || S.ich?.id))}</i>${k.bestaetigt_am ? `, ${dat(String(k.bestaetigt_am).slice(0, 10))}` : ""}</p></div>`;
}
async function schreiben(k, { zustellen = null } = {}) {
  if (!k) return;
  const m = await import("./druckvorschau.js"), titel = `${k.art === "pause" ? "Bestätigung Pause" : "Bestätigung Kündigung"} ${k.az || ""}`.trim();
  m.druckVorschau({ titel, html: briefHtml(k) });
  if (!zustellen?.length) return;
  try { const pdf = await m.pdfBauen(); await m.inKorb(pdf, { titel, fuer: zustellen, quelle: "leitung", text: `${KUENDIGUNG_ARTEN[k.art]} für ${name(k.person_id)} – ${wann(k)}` }); toast(`📥 Bestätigung in ${zustellen.length} Eingangskorb${zustellen.length > 1 ? "körbe" : ""} gelegt`); }
  catch (e) { toast("⚠️ PDF nicht zugestellt: " + (e.message || "")); }
}

// ---------- ＋ Papier / Mail / mündlich erfassen (Leitung) ----------
AKTIONEN.kuErfassen = () => {
  const p = liste("personen", (x) => x.status !== "ausgetreten" && ["schueler", "eltern", "lehrkraft", "foerderverein", "ehemalig", "leitung"].includes(x.typ)).sort((a, b) => name(a).localeCompare(name(b)));
  blatt("＋ Kündigung erfassen", `<div class="feld"><label for="kuP">Wer</label><select id="kuP">${p.map((x) => `<option value="${esc(x.id)}">${esc(name(x))}</option>`).join("")}</select></div>
    <div class="feld"><label for="kuA">Was</label><select id="kuA">${Object.entries(KUENDIGUNG_ARTEN).map(([a, t]) => `<option value="${a}">${esc(t)}</option>`).join("")}</select></div>
    <div class="feld"><label for="kuB">Teilbereiche (nur bei „Nur einen Teil“)</label><select id="kuB" multiple size="4">${Object.entries(KUENDIGUNG_BEREICHE).filter(([b]) => b !== "gruppe").map(([b, t]) => `<option value="${b}">${esc(t)}</option>`).join("")}</select></div>
    <div class="feld"><label for="kuZ">wirksam zum / Pause ab</label><input type="date" id="kuZ" value="${schuljahresende()}"></div>
    <div class="feld"><label for="kuE">Pause bis</label><input type="date" id="kuE"></div>
    <div class="feld"><label for="kuW">Eingegangen</label><select id="kuW">${Object.entries(KUENDIGUNG_WEGE).filter(([w]) => w !== "app").map(([w, t]) => `<option value="${w}">${esc(t)}</option>`).join("")}</select></div>
    <div class="feld"><label for="kuG">Grund (freiwillig)</label><input id="kuG" maxlength="300"></div>
    <button type="button" class="knopf haupt breit" data-a="kuErfassenLos">📮 Erfassen</button>`);
};
AKTIONEN.kuErfassenLos = async () => {
  const v = (id) => document.getElementById(id)?.value || "", art = v("kuA");
  const k = { id: neueId(), person_id: v("kuP"), art, zum: v("kuZ"), bis: art === "pause" ? v("kuE") : null, bereiche: art === "teil" ? [...document.getElementById("kuB").selectedOptions].map((o) => o.value) : [], gruppe_ids: [],
    weg: v("kuW"), grund: v("kuG").trim() || null, status: "eingegangen", eingereicht_von: S.ich.id, eingereicht_am: new Date().toISOString() };
  if (!k.zum) return toast("Bitte ein Datum wählen");
  if (art === "pause" && (!k.bis || k.bis <= k.zum)) return toast("Pause bis: nach dem Beginn");
  if (art === "teil" && !k.bereiche.length) return toast("Bitte einen Teilbereich wählen");
  if (art === "ehemalig" && hole("personen", k.person_id)?.typ !== "schueler") return toast("„Als Ehemalige/r bleiben“ gibt es nur für Schülerinnen und Schüler");
  if (!istEchtbetrieb()) k.az = `K-${new Date().getFullYear()}-${k.id.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase()}`;
  try { await speichere("kuendigungen", k); blattZu(); L.filter = "offen"; toast("📮 Erfasst – jetzt bestätigen"); zeichne(); } catch (e) { toast("⚠️ " + (e.message || "ging nicht")); }
};
