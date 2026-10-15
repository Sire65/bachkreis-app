// Kommunikation: Unterhaltungen (Gruppen/Verteiler), Rundschreiben mit Rückmeldung an automatische Zielgruppen,
// Pinnwand, SOS. Vorbild: KC Club Nachrichten/Communicator, SOS-Kachel, Pinnwand.
import { S, VIEWS, db, zeige, kopf, name, istLeitung, istLehrkraft, istVerwalter, istEltern } from "./zustand.js";
import { meineUnterhaltungen } from "./start.js";
import { esc, AKTIONEN, datumKurz, uhr, vorZeit, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere, loesche, konfig } from "../kern/daten.js";
import { verteilerListe, verteilerAufloesen, kinderVon, elternVon, waLink, wirksameGruppen } from "../kern/logik.js";
import { senden, whatsapp, KANAELE } from "../kern/versand.js";

// ---------- Unterhaltungen ----------
VIEWS.nachrichten = {
  render() {
    const us = meineUnterhaltungen().map((u) => {
      const n = liste("nachrichten", (x) => x.unterhaltung_id === u.id).sort((a, b) => a.zeit.localeCompare(b.zeit));
      return { u, letzte: n[n.length - 1], neu: n.filter((x) => !(x.gelesen_von || []).includes(S.ich.id)).length };
    }).sort((a, b) => (b.letzte?.zeit || "").localeCompare(a.letzte?.zeit || ""));
    const rechts = istVerwalter() ? `<button class="knopf haupt klein" data-a="kachel" data-x="rundschreiben">📣 Rundschreiben</button>` : "";
    return kopf("💬 Nachrichten", rechts) + `<div class="karte"><ul class="liste">${us.map(({ u, letzte, neu }) => `<li class="klick" data-a="oeffne" data-x="unterhaltung|${u.id}">
      <span style="font-size:1.5rem">${u.art === "verteiler" ? "📣" : "👥"}</span><div class="fl"><div class="zeile-titel">${esc(u.titel)}</div><div class="zeile-unter">${letzte ? esc(name(letzte.von).split(" ")[0]) + ": " + esc(letzte.text.slice(0, 60)) : "noch keine Nachricht"}</div></div>
      <div style="text-align:right"><div class="hinweis">${letzte ? vorZeit(letzte.zeit) : ""}</div>${neu ? `<span class="badge b-rot">${neu}</span>` : ""}</div></li>`).join("") || '<li class="leer">Keine Unterhaltungen</li>'}</ul></div>`;
  },
};
VIEWS.unterhaltung = {
  render({ id }) {
    const u = hole("unterhaltungen", id);
    if (!u) return kopf("Nachrichten") + '<div class="leer">Nicht gefunden.</div>';
    const ns = liste("nachrichten", (x) => x.unterhaltung_id === id).sort((a, b) => a.zeit.localeCompare(b.zeit));
    const darfSchreiben = u.art !== "verteiler" || istVerwalter();
    const empf = empfaengerVon(u);
    return kopf(esc(u.titel), `<span class="hinweis">${empf.length} Pers.</span>`) + `<div class="chat">${ns.map((n) => {
      const ich = n.von === S.ich.id;
      const rueck = n.rueckmeldung ? rueckmeldungHtml(n) : "";
      return `<div class="blase ${ich ? "ich" : ""}">${ich ? "" : `<div class="von">${esc(name(n.von))}</div>`}${esc(n.text).replace(/\n/g, "<br>")}${rueck}<div class="zeit">${datumKurz(n.zeit)} ${uhr(n.zeit)}${istLeitung() && ich ? ` · gelesen ${(n.gelesen_von || []).length - 1}/${empf.length - 1}` : ""}</div></div>`;
    }).join("") || '<div class="leer">Noch keine Nachrichten.</div>'}</div>
    ${darfSchreiben ? `<div class="eingabe"><textarea id="nachrichtText" placeholder="Nachricht …" rows="1"></textarea><button class="knopf haupt" data-a="nachrichtSenden" data-x="${id}">➤</button></div>` : '<p class="hinweis">Rundschreiben – nur die Leitung kann hier schreiben.</p>'}`;
  },
  async nach(_, { id }) {
    window.scrollTo(0, document.body.scrollHeight);
    // als gelesen markieren (läuft im Hintergrund weiter, auch wenn schon eine andere Ansicht offen ist)
    const ich = S.ich.id;
    for (const n of liste("nachrichten", (x) => x.unterhaltung_id === id && !(x.gelesen_von || []).includes(ich)))
      await speichere("nachrichten", { ...n, gelesen_von: [...(n.gelesen_von || []), ich] }, { still: true });
  },
};
function empfaengerVon(u) {
  if (u.verteiler) {
    const ids = verteilerAufloesen(db, u.verteiler);
    return [...new Set([...ids, ...(u.mitglieder || []), konfig().leitung_id])];
  }
  return u.mitglieder || [];
}
function rueckmeldungHtml(n) {
  const r = n.rueckmeldungen || {};
  const meine = r[S.ich.id];
  const zahl = (w) => Object.values(r).filter((x) => x === w).length;
  return `<div class="knopfreihe">${[["ja", "👍 Ja / dabei"], ["nein", "👎 Nein"], ["gelesen", "👁️ Gelesen"]].map(([k, t]) => `<button class="knopf klein ${meine === k ? "gruen" : ""}" data-a="rueckmelden" data-x="${n.id}|${k}">${t}${istLeitung() ? " " + zahl(k) : ""}</button>`).join("")}</div>`;
}
AKTIONEN.rueckmelden = async (x) => {
  const [id, w] = x.split("|");
  const n = hole("nachrichten", id);
  await speichere("nachrichten", { ...n, rueckmeldungen: { ...(n.rueckmeldungen || {}), [S.ich.id]: w } });
  toast("Rückmeldung gespeichert");
  zeige(S.view, S.params, { ersetzen: true });
};
AKTIONEN.nachrichtSenden = async (id) => {
  const text = document.getElementById("nachrichtText").value.trim();
  if (!text) return;
  const u = hole("unterhaltungen", id);
  await speichere("nachrichten", { unterhaltung_id: id, von: S.ich.id, text, zeit: new Date().toISOString(), gelesen_von: [S.ich.id] });
  await senden({ an: empfaengerVon(u).filter((p) => p !== S.ich.id), betreff: u.titel, text, ereignis: "nachricht", kanaele: ["push"] });
  zeige(S.view, S.params, { ersetzen: true });
};

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

// ---------- Pinnwand ----------
VIEWS.pinnwand = {
  render() {
    const z = liste("pinnwand").sort((a, b) => (a.erledigt - b.erledigt) || (b.wichtig - a.wichtig) || b.zeit.localeCompare(a.zeit));
    return kopf("📌 Pinnwand", `<button class="knopf haupt klein" data-a="pwNeu">＋ Zettel</button>`) + z.map((x) => `<div class="karte" style="${x.wichtig ? "border-left:6px solid var(--rot)" : ""};${x.erledigt ? "opacity:.55" : ""}">
      <div>${x.wichtig ? "❗ " : ""}${esc(x.text)}</div><div class="hinweis">${esc(name(x.von))} · ${vorZeit(x.zeit)}</div>
      ${x.von === S.ich.id || istLehrkraft() ? `<div class="knopfreihe"><button class="knopf klein" data-a="pwErledigt" data-x="${x.id}">${x.erledigt ? "↩️ wieder offen" : "✔️ erledigt"}</button><button class="knopf klein rot" data-a="pwLoeschen" data-x="${x.id}">🗑️</button></div>` : ""}</div>`).join("") || '<div class="leer">Die Pinnwand ist leer.</div>';
  },
};
AKTIONEN.pwNeu = () => blatt("Neuer Zettel", `<div id="pwForm"><div class="feld"><textarea name="text" placeholder="Was soll an die Pinnwand?"></textarea></div><label class="schalter"><span>wichtig</span><input type="checkbox" name="wichtig"></label><button class="knopf haupt breit" data-a="pwSpeichern">📌 Anheften</button></div>`);
AKTIONEN.pwSpeichern = async () => { const f = formWerte(document.getElementById("pwForm")); if (!f.text.trim()) return; await speichere("pinnwand", { text: f.text, wichtig: f.wichtig, erledigt: false, von: S.ich.id, zeit: new Date().toISOString() }); blattZu(); zeige("pinnwand", {}, { ersetzen: true }); };
AKTIONEN.pwErledigt = async (id) => { const x = hole("pinnwand", id); await speichere("pinnwand", { ...x, erledigt: !x.erledigt }); zeige("pinnwand", {}, { ersetzen: true }); };
AKTIONEN.pwLoeschen = async (id) => { if (await frage("Zettel löschen?")) { await loesche("pinnwand", id); zeige("pinnwand", {}, { ersetzen: true }); } };

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
    if (istLehrkraft()) {
      const q = (p.q || "").toLowerCase();
      const treffer = q.length >= 2 ? liste("personen", (x) => x.typ === "schueler" && `${x.vorname} ${x.nachname}`.toLowerCase().includes(q)).slice(0, 8) : [];
      html += `<div class="karte"><h3>🧾 Notfallkontakte eines Kindes</h3><p class="hinweis">Nur für Leitung und Begleitpersonen. Gesundheitsangaben sind besonders geschützt.</p>
        <div class="feld"><input id="sosSuche" placeholder="Name des Kindes …" value="${esc(p.q || "")}" data-c="sosSuche"></div>
        ${treffer.map((kid) => `<div class="karte"><b>${esc(name(kid))}</b>${kid.notfall_info ? `<div class="badge b-rot">⚕️ ${esc(kid.notfall_info)}</div>` : ""}<ul class="liste">${elternVon(db, kid.id).map((e) => hole("personen", e)).map((e) => `<li><div class="fl">${esc(name(e))}</div><a class="knopf klein" href="${tel(e.mobil)}">📞 ${esc(e.mobil)}</a></li>`).join("") || "<li>keine Elternkontakte hinterlegt</li>"}</ul></div>`).join("")}</div>`;
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
