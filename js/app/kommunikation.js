// Kommunikation: Rundschreiben mit Rückmeldung an automatische Zielgruppen und SOS. Vorbild: KC Club Communicator, SOS-Kachel.
// Nachrichten/Chats stehen in nachrichten.js, die Pinnwand in pinnwand.js.
import { gesundheitKurz } from "./schutz.js";
import { S, VIEWS, db, zeige, kopf, name, istLehrkraft, istEltern } from "./zustand.js";
import { esc, AKTIONEN, toast, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { verteilerListe, verteilerAufloesen, elternVon } from "../kern/logik.js";
import { senden, whatsapp, KANAELE } from "../kern/versand.js";
import { papierflieger } from "./effekte.js";

// Chatliste, Unterhaltungen, Haken, Express usw.: eigenes Modul nachrichten.js (wie KC Club App)

// ---------- Rundschreiben ----------
VIEWS.rundschreiben = {
  render(p) {
    const v = verteilerListe(db);
    const vorlagen = [
      ["", "– Vorlage wählen –"], ["konzert", "Einladung Konzert"], ["helfer", "Helfer gesucht"], ["ausfall", "Probe fällt aus"], ["dank", "Dank an Spender"],
    ];
    return kopf("📣 Rundschreiben") + `<div class="karte" id="rsForm">
      <div class="feld"><label>An (automatische Zielgruppe)</label><select name="verteiler" data-c="rsVorschau">${v.map((x) => `<option value="${x.key}" ${x.key === p.verteiler ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select><div class="hinweis" id="rsAnzahl"></div></div>
      <div class="feld"><label>Vorlage</label><select data-c="rsVorlage">${vorlagen.map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>
      <div class="feld"><label>Betreff</label><input name="betreff" id="rsBetreff"></div>
      <div class="feld"><label>Text</label><textarea name="text" id="rsText" rows="6"></textarea><div class="hinweis">Platzhalter: {vorname}</div></div>
      <div class="feld"><label>Kanäle</label><div class="wahlen">${Object.entries(KANAELE).filter(([k]) => k !== "whatsapp").map(([k, t]) => `<label><input type="checkbox" name="kanaele" data-mehr="1" value="${k}" checked> ${t}</label>`).join("")}</div></div>
      <label class="schalter"><span>Rückmeldung erbitten (Ja / Nein / Gelesen)</span><input type="checkbox" name="rueckmeldung"></label>
      <div class="knopfreihe"><button class="knopf haupt" data-a="rsSenden">📨 Senden</button><button class="knopf" data-a="rsWhatsapp">🟢 Als WhatsApp-Text</button></div>
      <p class="hinweis">Vorführversion: Push und E-Mail werden nur simuliert und im Versandprotokoll vermerkt. Die WhatsApp-Übergabe öffnet WhatsApp wirklich – du wählst dort die Gruppe und drückst selbst auf Senden.</p></div>`;
  },
  nach() { AKTIONEN.rsVorschau(); },
};
const VORLAGEN = {
  konzert: ["Einladung zum Konzert", "Liebe {vorname},\n\nwir laden herzlich zu unserem nächsten Konzert ein. Alle Infos findest du in der Bachkreis-App unter Termine.\n\nMusikalische Grüße\nBachkreis"],
  helfer: ["Helfer gesucht", "Liebe {vorname},\n\nfür unser Konzert suchen wir Unterstützung beim Aufbau, Kuchenverkauf und Transport der Instrumente. Bitte kurz zurückmelden!"],
  ausfall: ["Probe fällt aus", "Liebe {vorname},\n\ndie nächste Probe fällt leider aus. Wir sehen uns beim folgenden Termin."],
  dank: ["Herzlichen Dank!", "Liebe/r {vorname},\n\nvielen Dank für Ihre Unterstützung des Bachkreises! Dank Ihnen können wir …"],
};
AKTIONEN.rsVorlage = (k) => { if (!VORLAGEN[k]) return; document.getElementById("rsBetreff").value = VORLAGEN[k][0]; document.getElementById("rsText").value = VORLAGEN[k][1]; };
AKTIONEN.rsVorschau = () => {
  const f = formWerte(document.getElementById("rsForm"));
  const ids = verteilerAufloesen(db, f.verteiler);
  const ohneMail = ids.filter((i) => !hole("personen", i)?.email).length;
  document.getElementById("rsAnzahl").textContent = `${ids.length} Empfänger${ohneMail ? ` · ${ohneMail} ohne E-Mail-Adresse` : ""}`;
};
AKTIONEN.rsSenden = async () => {
  const f = formWerte(document.getElementById("rsForm"));
  if (!f.text.trim()) { toast("Bitte Text eingeben"); return; }
  papierflieger(document.querySelector('[data-a="rsSenden"]'), false); // Sende-Effekt
  const ids = verteilerAufloesen(db, f.verteiler);
  const vname = verteilerListe(db).find((x) => x.key === f.verteiler)?.name || f.verteiler;
  // Unterhaltung für den Verteiler suchen/anlegen, damit Rückmeldungen in der App sichtbar sind
  let u = liste("unterhaltungen", (x) => x.verteiler === f.verteiler)[0];
  if (!u) u = await speichere("unterhaltungen", { titel: vname, art: "verteiler", verteiler: f.verteiler });
  await speichere("nachrichten", { unterhaltung_id: u.id, von: S.ich.id, text: (f.betreff ? f.betreff + "\n\n" : "") + f.text.replace(/\{vorname\}/g, "…"), zeit: new Date().toISOString(), gelesen_von: [S.ich.id], rueckmeldung: !!f.rueckmeldung });
  const s = await senden({ an: ids, betreff: f.betreff || vname, text: f.text, ereignis: "rundschreiben", kanaele: f.kanaele });
  toast(`📨 An ${ids.length}: ${s.push} Push, ${s.mail} Mail${s.fehler ? `, ${s.fehler} ohne Adresse` : ""} (simuliert)`, 4000);
  zeige("unterhaltung", { id: u.id }, { ersetzen: true });
};
AKTIONEN.rsWhatsapp = () => {
  const f = formWerte(document.getElementById("rsForm"));
  whatsapp(`${f.betreff ? "*" + f.betreff + "*\n\n" : ""}${f.text.replace(/\{vorname\}/g, "zusammen")}`, { betreff: f.betreff || "Rundschreiben" });
};

// Pinnwand: eigenes Modul pinnwand.js (wie KC Club App)

// ---------- SOS ----------
VIEWS.sos = {
  render(p) {
    const k = konfig();
    const leitung = hole("personen", k.leitung_id);
    const tel = (n) => `tel:${String(n).replace(/[^\d+]/g, "")}`;
    let html = kopf("🆘 SOS – Notfall") + (k.notrufe || []).map(([s, t, n]) => `<a class="sos-gross" href="${tel(n)}">${s} ${esc(t)}<small>${esc(n)} – antippen zum Anrufen</small></a>`).join("");
    html += `<div class="karte"><h3>Bachkreis-Kontakte</h3><ul class="liste">${leitung ? `<li><div class="fl"><b>${esc(name(leitung))}</b><div class="zeile-unter">Leitung</div></div><a class="knopf klein" href="${tel(leitung.mobil)}">📞</a><button class="knopf klein" data-a="waAn" data-x="${leitung.id}">🟢</button></li>` : ""}
      <li><div class="fl"><b>Schule (Sekretariat)</b></div><a class="knopf klein" href="${tel(k.schule_telefon || "")}">📞</a></li>
      ${istEltern() ? "" : elternKontakteFuerMich()}</ul></div>`;
    html += `<div class="karte"><h3>📍 Standort senden</h3><p class="hinweis">Schickt deinen aktuellen Standort per WhatsApp – z. B. an die Leitung oder deine Eltern.</p><button class="knopf haupt breit" data-a="sosStandort">📍 Standort per WhatsApp</button></div>`;
    if (istLehrkraft() || liste("projekte", (pr) => (pr.begleiter || []).includes(S.ich.id)).length) { // 🩺 Leitung, Lehrkräfte, Begleitpersonen
      const q = (p.q || "").toLowerCase();
      const treffer = q.length >= 2 ? liste("personen", (x) => x.typ === "schueler" && `${x.vorname} ${x.nachname}`.toLowerCase().includes(q)).slice(0, 8) : [];
      html += `<div class="karte"><h3>🧾 Notfallkontakte eines Kindes</h3><p class="hinweis">Nur für Leitung und Begleitpersonen. Gesundheitsangaben sind besonders geschützt.</p>
        <div class="feld"><input id="sosSuche" placeholder="Name des Kindes …" value="${esc(p.q || "")}" data-c="sosSuche"></div>
        ${treffer.map((kid) => `<div class="karte"><b>${esc(name(kid))}</b>${kid.notfall_info ? `<div class="badge b-rot">⚕️ ${esc(kid.notfall_info)}</div>` : ""}${gesundheitKurz(kid.id)}<ul class="liste">${elternVon(db, kid.id).map((e) => hole("personen", e)).map((e) => `<li><div class="fl">${esc(name(e))}</div><a class="knopf klein" href="${tel(e.mobil)}">📞 ${esc(e.mobil)}</a></li>`).join("") || "<li>keine Elternkontakte hinterlegt</li>"}</ul></div>`).join("")}</div>`;
    }
    return html;
  },
};
function elternKontakteFuerMich() {
  return elternVon(db, S.ich.id).map((e) => hole("personen", e)).filter(Boolean).map((e) => `<li><div class="fl"><b>${esc(name(e))}</b><div class="zeile-unter">Eltern</div></div><a class="knopf klein" href="tel:${esc(String(e.mobil).replace(/[^\d+]/g, ""))}">📞</a><button class="knopf klein" data-a="waAn" data-x="${e.id}">🟢</button></li>`).join("");
}
AKTIONEN.sosSuche = (q) => zeige("sos", { q }, { ersetzen: true });
AKTIONEN.waAn = (id) => { const p = hole("personen", id); whatsapp("", { nummer: p.mobil, anId: id, betreff: "Kontakt" }); };
AKTIONEN.sosStandort = () => {
  if (!navigator.geolocation) { toast("Standort wird auf diesem Gerät nicht unterstützt"); return; }
  toast("📍 Standort wird ermittelt …");
  navigator.geolocation.getCurrentPosition(
    (pos) => whatsapp(`🆘 Ich brauche Hilfe. Mein Standort: https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`, { betreff: "SOS-Standort" }),
    () => toast("Standort nicht verfügbar – bitte Freigabe prüfen"), { enableHighAccuracy: true, timeout: 10000 });
};
