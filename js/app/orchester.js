// Orchester: Gruppen A–D (Registry), Mitglieder je Register, Personen-Detail, Gruppenwechsel generell (mit Historie)
// und temporär (Zeitraum/Projekt), Wechselwunsch der Schüler, Konzerte & Projekte mit Checkliste.
import { programmHtml, programmVon, infoHtml, anmeldungHtml } from "./konzert.js";
import { KIND_KONTAKT, TABELLEN } from "../kern/schema.js";
import { gesundheitKurz } from "./schutz.js";
import { S, VIEWS, db, zeige, zeichne, zurueck, kopf, name, istLehrkraft, istLeitung, istEltern, istVerwalter, hatRolle } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere, konfig } from "../kern/daten.js";
import { gruppenMitglieder, stammgruppe, wirksameGruppen, temporaereZuordnungen, generellerWechselPlan, instrumenteVon, registerVon, elternVon, kinderVon, tagIso, ausleihenVon, antwortVon, fotoErlaubnis } from "../kern/logik.js";
import { gesicht, gesichtSvg, merkmale, HAUT, HAARFARBE, FRISUREN, AUGEN, MUND, FARBEN } from "./gesichter.js";
import { onlineIds, onlineSichtbar } from "./online.js";
import { lehreZu } from "./instrumentenkunde.js";
import { terminKarte } from "./termine.js";
import { senden } from "../kern/versand.js";

// ---------- 🎼 Orchester mit Gesichtern: Sitzplan · Register · Besetzung & Instrumente ----------
// Sitzplan wie auf der Bühne (hinten Schlagwerk, dann Blech, Holz, vorne Streicher, unten die Leitung); je Register Ist/Soll.
// „📅 Nächste Probe“ zeigt an den Gesichtern, wer zugesagt (✓), abgesagt (✗) oder noch nicht geantwortet hat (?).
// Besetzung: Soll (Gruppe in der PC-Verwaltung oder nächste Probe) gegen Ist, wer ein Leihinstrument braucht und was frei ist.
const OR = { ansicht: "sitzplan", probe: false, nurOnline: false };
const REIHEN = [["schlag", "tasten"], ["blech"], ["holz"], ["streicher"]];
const famVon = (r) => r?.familie || "sonstige";
function naechsteProbe(gid) {
  const jetzt = new Date().toISOString();
  return liste("termine", (t) => (t.gruppen || []).includes(gid) && t.beginn >= jetzt && t.status !== "abgesagt").sort((a, b) => a.beginn.localeCompare(b.beginn))[0] || null;
}
function leihbedarf(pid) {
  const inst = instrumenteVon(db, pid).find((i) => !i.eigenes);
  if (!inst || ausleihenVon(db, pid).length) return null;
  return inst;
}
function orchesterDaten(gid) {
  const g = hole("gruppen", gid), mitglieder = gruppenMitglieder(db, gid), probe = naechsteProbe(gid);
  const soll = g?.soll && Object.keys(g.soll).length ? g.soll : probe?.soll || {};
  const regs = liste("register").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
  const jeReg = regs.map((r) => ({ r, ps: mitglieder.filter((m) => registerVon(db, m) === r.id).sort((a, b) => name(a).localeCompare(name(b), "de")), soll: Number(soll[r.id] || 0) })).filter((x) => x.ps.length || x.soll);
  return { g, mitglieder, probe, soll, jeReg, ohne: mitglieder.filter((m) => !registerVon(db, m)) };
}
function antwortZeichen(probe, pid) {
  if (!OR.probe || !probe) return "";
  const a = antwortVon(db, probe.id, pid)?.antwort;
  return a === "ja" ? '<i class="az ja" title="zugesagt">✓</i>' : a === "nein" ? '<i class="az nein" title="abgesagt">✗</i>' : a === "vielleicht" ? '<i class="az vl" title="vielleicht">~</i>' : '<i class="az offen" title="noch keine Antwort">?</i>';
}
const kopfBild = (pid, probe, klein = false) => {
  const p = hole("personen", pid), rf = (p?.rollen || []).includes("registerfuehrer"), lb = leihbedarf(pid);
  const on = onlineIds().has(pid); // 🟢 gerade online
  return `<button type="button" class="og${klein ? " klein" : ""}${on ? " ist-on" : ""}" data-a="oeffne" data-x="person|${esc(pid)}" title="${esc(name(pid))}${on ? " · 🟢 gerade online" : ""}${rf ? " · Registerführung" : ""}${lb ? " · braucht ein Leihinstrument" : ""}">${gesicht(pid, name(pid))}${on ? '<i class="on"></i>' : ""}${rf ? '<i class="rf">⭐</i>' : ""}${lb && istLehrkraft() ? '<i class="lb">🏷️</i>' : ""}${antwortZeichen(probe, pid)}</button>`;
};
const istSoll = (x) => `<span class="ist-soll ${x.soll ? (x.ps.length >= x.soll ? "ok" : "fehlt") : ""}">${x.ps.length}${x.soll ? `/${x.soll}` : ""}</span>`;
VIEWS.orchester = {
  render(p) {
    const gruppen = liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => a.sort - b.sort);
    const gid = p.gruppe || gruppen[0]?.id, d = orchesterDaten(gid), { g, probe } = d;
    const ans = OR.ansicht;
    const kopfzeile = `<div class="orch-gruppen">${gruppen.map((x) => `<button type="button" class="${x.id === gid ? "an" : ""}" data-a="orchGruppe" data-x="${x.id}" style="--gf:${esc(x.farbe || "#888")}"><b>${esc(x.kuerzel)}</b><small>${gruppenMitglieder(db, x.id).length}</small></button>`).join("")}</div>
      <div class="orch-leiste"><div class="umschalter orch-tabs">${[["sitzplan", "🎼 Sitzplan"], ["register", "👥 Register"], ["besetzung", "📊 Besetzung"]].map(([k, t]) => `<button class="${ans === k ? "an" : ""}" data-a="orchAnsicht" data-x="${k}">${t}</button>`).join("")}</div>
      ${probe ? `<label class="orch-probe"><input type="checkbox" data-c="orchProbe" ${OR.probe ? "checked" : ""}> 📅 Zusagen ${esc(datumKurz(probe.beginn))}</label>` : ""}
      ${onlineSichtbar() ? `<button type="button" class="orch-online${OR.nurOnline ? " an" : ""}" data-a="orchNurOnline" title="Wer ist gerade online? Antippen: nur diese hervorheben"><span class="on-punkt"></span>${[...onlineIds()].filter((x) => d.mitglieder.includes(x)).length} online</button>` : ""}</div>`;
    let inhalt = "";
    if (ans === "sitzplan") {
      const reihen = REIHEN.map((fams) => d.jeReg.filter((x) => fams.includes(famVon(x.r)))).filter((r) => r.length);
      const leitung = konfigLeitung();
      inhalt = `<div class="sitzplan" style="--gf:${esc(g?.farbe || "#888")}">${reihen.map((r, i) => `<div class="sp-reihe" style="--breite:${62 + (i / Math.max(1, reihen.length - 1)) * 38}%">${r.map((x) => `<div class="sp-register fam-${esc(famVon(x.r))}" style="flex-grow:${Math.max(1, x.ps.length)}">
          <div class="sp-kopf"><button type="button" class="sp-name" data-a="lehreZu" data-x="${esc(x.r.name)}" title="Instrumentenkunde">${esc(x.r.kurz || x.r.name)}</button>${istSoll(x)}</div>
          <div class="sp-gesichter">${x.ps.map((pid) => kopfBild(pid, probe, true)).join("") || '<span class="hinweis">–</span>'}</div></div>`).join("")}</div>`).join("")}
        <div class="sp-dirigent">${leitung ? `<button type="button" class="og" data-a="oeffne" data-x="person|${esc(leitung)}" title="${esc(name(leitung))}">${gesicht(leitung, name(leitung))}</button>` : ""}<small>🎩 ${esc(leitung ? name(leitung) : "Leitung")}</small></div></div>
        <p class="hinweis">Gesicht antippen = Person · Registername antippen = 🎻 Instrumentenkunde${OR.probe ? " · ✓ zugesagt ✗ abgesagt ~ vielleicht ? offen" : ""}${istLehrkraft() ? " · 🏷️ braucht ein Leihinstrument" : ""}</p>`;
    } else if (ans === "register") {
      inhalt = d.jeReg.map((x) => `<div class="karte orch-reg"><div class="or-kopf"><b>${esc(x.r.name)}</b>${istSoll(x)}<button type="button" class="knopf klein" data-a="lehreZu" data-x="${esc(x.r.name)}">🎻 Instrumentenkunde</button></div>
        <div class="or-gitter">${x.ps.map((pid) => { const pe = hole("personen", pid), temp = !liste("gruppe_zuordnung", (z) => z.person_id === pid && z.gruppe_id === gid && z.art === "stamm").length;
          return `<div class="or-person">${kopfBild(pid, probe)}<small>${esc(pe?.vorname || "")}</small><small class="hinweis">${pe?.jahrgang ? "Jg. " + pe.jahrgang : ""}${temp ? " · temp." : ""}</small></div>`; }).join("") || '<span class="hinweis">noch niemand</span>'}</div></div>`).join("")
        + (d.ohne.length ? `<div class="karte"><h3>ohne Instrument</h3><div class="or-gitter">${d.ohne.map((pid) => `<div class="or-person">${kopfBild(pid, probe)}<small>${esc(hole("personen", pid)?.vorname || "")}</small></div>`).join("")}</div></div>` : "");
    } else {
      const fehlt = d.jeReg.reduce((s, x) => s + Math.max(0, x.soll - x.ps.length), 0);
      const bedarf = d.mitglieder.map((pid) => ({ pid, inst: leihbedarf(pid) })).filter((x) => x.inst);
      const freiVon = (typ) => liste("inventar", (i) => i.typ_id === typ && i.status === "verfuegbar");
      inhalt = `<div class="kennzahlen orch-zahlen"><div class="kennzahl"><b>${d.mitglieder.length}</b><small>Mitglieder</small></div><div class="kennzahl"><b class="${fehlt ? "rot" : ""}">${fehlt}</b><small>fehlen zum Soll</small></div>
        ${istLehrkraft() ? `<div class="kennzahl"><b class="${bedarf.length ? "rot" : ""}">${bedarf.length}</b><small>brauchen Leihinstrument</small></div>` : ""}</div>
        <div class="karte"><h3>Soll / Ist je Register</h3><p class="hinweis">Soll ${g?.soll && Object.keys(g.soll).length ? "aus der Gruppe (PC-Verwaltung)" : probe ? `aus der nächsten Probe (${esc(datumKurz(probe.beginn))})` : "nicht hinterlegt"}</p>
          ${d.jeReg.map((x) => { const pz = x.soll ? Math.min(100, Math.round((x.ps.length / x.soll) * 100)) : 100, diff = x.ps.length - x.soll;
            return `<div class="bes-zeile"><span class="bes-name">${esc(x.r.kurz || x.r.name)}</span><span class="bes-balken"><i style="width:${pz}%" class="${x.soll && diff < 0 ? "fehlt" : "ok"}"></i></span><span class="bes-zahl">${x.ps.length}${x.soll ? "/" + x.soll : ""}</span><span class="bes-diff ${diff < 0 ? "fehlt" : diff > 0 ? "mehr" : ""}">${x.soll ? (diff < 0 ? `fehlt ${-diff}` : diff > 0 ? `+${diff}` : "✓") : ""}</span></div>`; }).join("")}</div>
        ${istLehrkraft() ? `<div class="karte"><h3>🏷️ Leihinstrumente koordinieren</h3>${bedarf.length ? `<ul class="liste">${bedarf.map(({ pid, inst }) => { const frei = freiVon(inst.typ_id);
            return `<li><span class="og-klein">${gesicht(pid, name(pid))}</span><div class="fl"><div class="zeile-titel">${esc(name(pid))}</div><div class="zeile-unter">braucht ${esc(hole("instrument_typen", inst.typ_id)?.name || "Instrument")} · ${frei.length ? `<b class="gruen">${frei.length} frei</b>` : '<b class="rot">keins frei</b>'}</div></div>${frei.length && istVerwalter() ? `<button class="knopf klein" data-a="oeffne" data-x="instrument|${esc(frei[0].id)}">🤝 ${esc(frei[0].inventar_nr)}</button>` : ""}</li>`; }).join("")}</ul>` : '<p class="hinweis">✓ Alle, die ein Leihinstrument brauchen, haben eins.</p>'}</div>` : ""}`;
    }
    return kopf("🎼 Orchester") + kopfzeile + `<div class="orch-titel" style="--gf:${esc(g?.farbe || "#888")}"><b>${esc(g?.name || "")}</b> <span class="hinweis">${esc(g?.beschreibung || "")} · ${d.mitglieder.length} Mitglieder</span></div>` + `<div class="orch-inhalt${OR.nurOnline && onlineSichtbar() ? " nur-online" : ""}">${inhalt}</div>`;
  },
};
const konfigLeitung = () => konfig().leitung_id;
AKTIONEN.orchGruppe = (g) => zeige("orchester", { gruppe: g }, { ersetzen: true });
AKTIONEN.orchAnsicht = (a) => { OR.ansicht = a; zeichne(); };
AKTIONEN.orchNurOnline = () => { OR.nurOnline = !OR.nurOnline; zeichne(); };
AKTIONEN.orchProbe = (_, el) => { OR.probe = el.checked; zeichne(); };
AKTIONEN.lehreZu = (text) => { const id = lehreZu(text); zeige("instrumentenkunde", id ? { id } : {}); };

// ---------- 🙂 Mein Gesicht gestalten ----------
VIEWS.meingesicht = {
  render() {
    const m = { ...merkmale(S.ich), ...(GZ.m || {}) }; GZ.m = m;
    const reihe = (k, t, werte, darst) => `<h4>${t}</h4><div class="gz-wahl">${werte.map((w, i) => `<button type="button" class="${m[k] === i ? "an" : ""}" data-a="gzSetzen" data-x="${k}|${i}" aria-label="${esc(t)} ${esc(String(w))}">${darst(i, w)}</button>`).join("")}</div>`;
    const mini = (aend) => gesichtSvg({ ...m, ...aend }, { titel: "" });
    return kopf("🙂 Mein Gesicht") + `<div class="gz-vorschau">${gesichtSvg(m, { titel: "Mein Gesicht" })}</div>
      <div class="knopfreihe" style="justify-content:center"><button class="knopf" data-a="gzZufall">🎲 Zufall</button><button class="knopf haupt" data-a="gzSpeichern">💾 Speichern</button></div>
      ${reihe("haut", "Hautfarbe", HAUT, (i, w) => `<span class="gz-farbe" style="background:${w}"></span>`)}
      ${reihe("frisur", "Frisur", FRISUREN, (i) => mini({ frisur: i }))}
      ${reihe("haar", "Haarfarbe", HAARFARBE, (i, w) => `<span class="gz-farbe" style="background:${w}"></span>`)}
      ${reihe("augen", "Augen", AUGEN, (i) => mini({ augen: i }))}
      ${reihe("mund", "Mund", MUND, (i) => mini({ mund: i }))}
      ${reihe("brille", "Brille", ["ohne", "mit"], (i, w) => `${mini({ brille: i })}`)}
      ${reihe("farbe", "Hintergrund", FARBEN, (i, w) => `<span class="gz-farbe" style="background:${w}"></span>`)}
      <p class="hinweis">Dein Gesicht sehen andere im Orchester und in der Instrumentenkunde – es ist gezeichnet, kein Foto.</p>`;
  },
};
const GZ = { m: null };
AKTIONEN.meinGesicht = () => { GZ.m = null; zeige("meingesicht"); };
AKTIONEN.gzSetzen = (x) => { const [k, i] = String(x).split("|"); GZ.m = { ...GZ.m, [k]: Number(i) }; zeichne(); };
AKTIONEN.gzZufall = () => { const r = (n) => Math.floor(Math.random() * n); GZ.m = { haut: r(HAUT.length), frisur: r(FRISUREN.length), haar: r(HAARFARBE.length), augen: r(AUGEN.length), mund: r(MUND.length), brille: r(5) === 0 ? 1 : 0, farbe: r(FARBEN.length) }; zeichne(); };
AKTIONEN.gzSpeichern = async () => { await speichere("personen", { ...hole("personen", S.ich.id), avatar: GZ.m }); toast("🙂 Gesicht gespeichert"); zurueck(); };

VIEWS.person = {
  render({ id }) {
    const p = hole("personen", id);
    if (!p) return kopf("Person") + '<div class="leer">Nicht gefunden.</div>';
    const darfDetails = istLehrkraft();
    const stamm = stammgruppe(db, id);
    const wirk = wirksameGruppen(db, id);
    const hist = liste("gruppe_zuordnung", (z) => z.person_id === id).sort((a, b) => (b.von || "").localeCompare(a.von || ""));
    const inst = instrumenteVon(db, id);
    let html = kopf(esc(name(p)));
    html += `<div class="karte person-kopf"><span class="pk-gesicht">${gesicht(p, name(p))}</span>${p.id === S.ich.id ? '<button class="knopf klein" data-a="meinGesicht">🙂 Gesicht gestalten</button>' : ""}<div class="zeile-titel">${esc(name(p))}</div><div class="hinweis">${p.jahrgang ? "Jahrgangsstufe " + p.jahrgang + " · " : ""}${esc(p.schule || "")}</div>
      <div>${wirk.map((g) => hole("gruppen", g)).map((g) => `<span class="badge" style="background:${esc(g.farbe)}22;color:${esc(g.farbe)}">${esc(g.kuerzel)} – ${esc(g.name)}${g.id !== stamm ? " (temporär)" : ""}</span>`).join("")}</div>
      <h4>Instrumente</h4><ul class="liste">${inst.map((i) => `<li><div class="fl">${i.haupt ? "⭐ " : ""}${esc(hole("instrument_typen", i.typ_id)?.name)} <span class="hinweis">→ ${esc(hole("register", i.register_id)?.name || "")}${i.eigenes ? " · eigenes" : " · Leihinstrument nötig"}</span></div></li>`).join("") || "<li>–</li>"}</ul></div>`;
    if (darfDetails) {
      const eltern = elternVon(db, id).map((e) => hole("personen", e)).filter(Boolean);
      html += `<div class="karte"><h3>Kontakt</h3><div>${esc(p.strasse || "")} ${esc(p.plz || "")} ${esc(p.ort || "")}</div>${p.mobil ? `<div>📱 <a href="tel:${esc(p.mobil.replace(/\s/g, ""))}">${esc(p.mobil)}</a></div>` : ""}${p.email ? `<div>✉️ ${esc(p.email)}</div>` : ""}
        ${eltern.length ? `<h4>Eltern</h4><ul class="liste">${eltern.map((e) => `<li><div class="fl">${esc(name(e))}</div><a class="knopf klein" href="tel:${esc((e.mobil || "").replace(/\s/g, ""))}">📞</a></li>`).join("")}</ul>` : ""}
        ${p.notfall_info ? `<div class="badge b-rot">⚕️ ${esc(p.notfall_info)}</div>` : ""}
        ${p.typ === "schueler" ? `<div class="foto-zeile">📷 ${Object.entries(fotoErlaubnis(db, id)).map(([z, st]) => `<span class="badge ${st === "ja" ? "b-gruen" : st === "nein" ? "b-rot" : "b-grau"}">${{ foto_intern: "App", foto_website: "Website", foto_presse: "Presse", foto_social: "Social" }[z]} ${st === "ja" ? "✅" : st === "nein" ? "⛔" : "❔"}</span>`).join("")}</div>` : ""}
        ${p.typ === "schueler" && liste("gesundheit", (g) => g.person_id === id).length ? `<details class="gs-details"><summary>🩺 Gesundheit & Notfall</summary>${gesundheitKurz(id)}</details>` : ""}</div>`;
      html += `<div class="karte"><h3>Gruppen-Verlauf</h3><ul class="liste">${hist.map((z) => `<li><div class="fl"><b>${esc(hole("gruppen", z.gruppe_id)?.kuerzel)}</b> ${z.art === "temporaer" ? '<span class="badge b-lila">temporär</span>' : '<span class="badge">Stamm</span>'} <span class="hinweis">${datumKurz(z.von)} – ${z.bis ? datumKurz(z.bis) : "offen"}${z.grund ? " · " + esc(z.grund) : ""}</span></div></li>`).join("")}</ul>
        <div class="knopfreihe"><button class="knopf klein" data-a="wechselForm" data-x="${id}|stamm">🔀 Gruppe generell wechseln</button><button class="knopf klein" data-a="wechselForm" data-x="${id}|temporaer">⏳ Temporär zuordnen</button></div></div>`;
      const ausl = ausleihenVon(db, id);
      if (ausl.length) html += `<div class="karte"><h3>Leihinstrumente</h3><ul class="liste">${ausl.map((a) => `<li class="klick" data-a="oeffne" data-x="instrument|${a.inventar_id}"><div class="fl">${esc(hole("inventar", a.inventar_id)?.bezeichnung)} <span class="hinweis">bis ${datumKurz(a.bis)}</span></div></li>`).join("")}</ul></div>`;
    }
    return html;
  },
};
AKTIONEN.wechselForm = (x) => {
  const [id, art] = x.split("|");
  const gruppen = liste("gruppen").sort((a, b) => a.sort - b.sort);
  blatt(art === "stamm" ? "Gruppe generell wechseln" : "Temporär zuordnen", `<div id="wechselForm"><p class="hinweis">${art === "stamm" ? "Die bisherige Stammgruppe endet am Vortag. Der Verlauf bleibt erhalten – Auswertungen der Vergangenheit stimmen weiter." : "Zusätzliche Gruppe für einen Zeitraum oder ein Projekt (z. B. Aushilfe). Danach gilt automatisch wieder nur die Stammgruppe."}</p>
    <div class="feld"><label>${art === "stamm" ? "Neue Stammgruppe" : "Zusätzliche Gruppe"}</label><select name="gruppe">${gruppen.map((g) => `<option value="${g.id}">${esc(g.kuerzel)} – ${esc(g.name)}</option>`).join("")}</select></div>
    <div class="feld"><label>ab</label><input type="date" name="von" value="${tagIso(new Date())}"></div>
    ${art === "temporaer" ? `<div class="feld"><label>bis</label><input type="date" name="bis"></div><div class="feld"><label>nur für Projekt</label><select name="projekt"><option value="">– alle Termine im Zeitraum –</option>${liste("projekte").map((p) => `<option value="${p.id}">${esc(p.titel)}</option>`).join("")}</select></div>` : ""}
    <div class="feld"><label>Grund</label><input name="grund" placeholder="${art === "stamm" ? "z. B. Wechsel ins A-Orchester" : "z. B. Aushilfe 2. Violine"}"></div>
    <button class="knopf haupt breit" data-a="wechselSpeichern" data-x="${id}|${art}">Speichern</button></div>`);
};
AKTIONEN.wechselSpeichern = async (x) => {
  const [id, art] = x.split("|");
  const f = formWerte(document.getElementById("wechselForm"));
  if (art === "stamm") {
    const plan = generellerWechselPlan(db, id, f.gruppe, f.von);
    for (const z of plan.beenden) await speichere("gruppe_zuordnung", z, { still: true });
    await speichere("gruppe_zuordnung", { ...plan.neu, grund: f.grund });
  } else {
    if (!f.bis) { toast("Bitte Enddatum angeben"); return; }
    await speichere("gruppe_zuordnung", { person_id: id, gruppe_id: f.gruppe, art: "temporaer", von: f.von, bis: f.bis, projekt_id: f.projekt || null, grund: f.grund });
  }
  const an = [id, ...elternVon(db, id)];
  await senden({ an, betreff: "Gruppenzuordnung geändert", text: `Neue Zuordnung: ${hole("gruppen", f.gruppe)?.name} ab ${datumKurz(f.von)}`, ereignis: "termin_geaendert" });
  blattZu(); toast("🔀 Zuordnung gespeichert – Einladungen passen sich automatisch an");
  zeige("person", { id }, { ersetzen: true });
};

// Wechselwunsch des Schülers → Vorgang für die Leitung
VIEWS.wechselwunsch = {
  render() {
    return kopf("🔀 Gruppenwechsel") + `<div class="karte" id="wwForm"><p class="hinweis">Dein Wunsch geht an die Leitung. Sie entscheidet und setzt den Wechsel um.</p>
      <div class="feld"><label>Gewünschte Gruppe</label><select name="gruppe">${liste("gruppen").sort((a, b) => a.sort - b.sort).map((g) => `<option value="${g.id}">${esc(g.kuerzel)} – ${esc(g.name)}</option>`).join("")}</select></div>
      <div class="feld"><label>Art</label><select name="art"><option value="generell">dauerhaft</option><option value="temporaer">vorübergehend</option></select></div>
      <div class="feld"><label>Begründung</label><textarea name="text"></textarea></div><button class="knopf haupt breit" data-a="wwSenden">Wunsch senden</button></div>`;
  },
};
AKTIONEN.wwSenden = async () => {
  const f = formWerte(document.getElementById("wwForm"));
  await speichere("aufgaben", { titel: `Wechselwunsch: ${name(S.ich)} → ${hole("gruppen", f.gruppe)?.kuerzel} (${f.art})`, art: "wechselwunsch", status: "offen", von_id: S.ich.id, zustaendig_id: db.konfig().leitung_id, text: f.text, frist: null, ziel_gruppe: f.gruppe });
  toast("🔀 Wunsch an die Leitung gesendet"); zurueck();
};

// ---------- Konzerte & Projekte ----------
VIEWS.projekte = {
  render() {
    const ps = liste("projekte").sort((a, b) => (a.von || "").localeCompare(b.von || ""));
    const ART = { konzert: "🎭", reise: "🚌", freizeit: "🏕️", sonstiges: "📌" };
    return kopf("🎭 Konzerte & Projekte") + ps.map((p) => {
      const cl = (p.checkliste || "").split("\n").filter((l) => l.trim());
      const ok = cl.filter((l) => l.trim().startsWith("[x]")).length;
      return `<div class="karte klick" data-a="oeffne" data-x="projekt|${p.id}"><div class="zeile-titel">${ART[p.art] || "📌"} ${esc(p.titel)}</div><div class="hinweis">${datumKurz(p.von)} – ${datumKurz(p.bis)} · ${esc(p.ort || "")}</div>${istLehrkraft() && cl.length ? `<div class="balken" style="margin-top:6px"><i class="ja" style="width:${(ok / cl.length) * 100}%"></i></div><div class="hinweis">Checkliste ${ok}/${cl.length}</div>` : ""}</div>`;
    }).join("");
  },
};
VIEWS.projekt = {
  render({ id }) {
    const p = hole("projekte", id);
    if (!p) return kopf("Projekt") + '<div class="leer">Nicht gefunden.</div>';
    const ts = liste("termine", (t) => t.projekt_id === id).sort((a, b) => a.beginn.localeCompare(b.beginn));
    const werke = liste("werke", (w) => (w.projekte || []).includes(id));
    const cl = (p.checkliste || "").split("\n").filter((l) => l.trim());
    let html = kopf(esc(p.titel)) + `<div class="karte"><div class="hinweis">${datumKurz(p.von)} – ${datumKurz(p.bis)} · ${esc(p.ort || "")}</div><p>${esc(p.beschreibung || "")}</p></div>`;
    html += infoHtml(p) + anmeldungHtml(p);
    if (werke.length || programmVon(id).length || hatRolle("admin", "leitung", "lehrkraft", "notenwart")) html += programmHtml(p);
    if (istLehrkraft() && cl.length) html += `<div class="karte"><h3>✅ Checkliste</h3><ul class="liste">${cl.map((l, i) => { const ok = l.trim().startsWith("[x]"); return `<li><label style="display:flex;gap:10px;align-items:center;flex:1"><input type="checkbox" ${ok ? "checked" : ""} data-c="clHaken" data-x="${id}|${i}"> <span style="${ok ? "text-decoration:line-through;color:var(--grau)" : ""}">${esc(l.replace(/^\s*\[[x ]\]\s*/, ""))}</span></label></li>`; }).join("")}</ul></div>`;
    html += `<h3>Termine</h3>` + ts.map((t) => terminKarte(t, { mitAntwort: false })).join("");
    return html;
  },
};
AKTIONEN.clHaken = async (_, el) => {
  const [id, i] = el.dataset.x.split("|");
  const p = hole("projekte", id);
  const zeilen = (p.checkliste || "").split("\n").filter((l) => l.trim());
  zeilen[i] = (el.checked ? "[x] " : "[ ] ") + zeilen[i].replace(/^\s*\[[x ]\]\s*/, "");
  await speichere("projekte", { ...p, checkliste: zeilen.join("\n") });
  zeige("projekt", { id }, { ersetzen: true });
};

// Eltern: Übersicht der Kinder
VIEWS.kinder = {
  render() {
    return kopf("👪 Meine Kinder") + kinderVon(db, S.ich.id).map((k) => {
      const p = hole("personen", k);
      const g = wirksameGruppen(db, k).map((x) => hole("gruppen", x));
      return `<div class="karte"><div class="zeile-titel">${esc(name(p))}</div><div>${g.map((x) => `<span class="badge" style="color:${esc(x.farbe)}">${esc(x.kuerzel)} – ${esc(x.name)}</span>`).join("")}</div>
        <div class="hinweis">${instrumenteVon(db, k).map((i) => esc(hole("instrument_typen", i.typ_id)?.name)).join(", ")}</div>
        <details class="kind-kontakt"><summary>✏️ Kontaktdaten von ${esc(p.vorname)} ändern</summary><div id="kk-${k}">${KIND_KONTAKT.map((f) => `<div class="feld"><label>${esc(TABELLEN.personen.felder.find((x) => x.k === f)?.t || f)}</label><input name="${f}" value="${esc(p[f] || "")}"></div>`).join("")}
          <button class="knopf haupt" data-a="kindKontakt" data-x="${k}">💾 Speichern</button></div></details></div>`;
    }).join("") + '<p class="hinweis">Mit 18 Jahren entscheiden die Kinder selbst, ob die Eltern weiter Zugriff haben (die Leitung trägt das ein).</p>';
  },
};
AKTIONEN.kindKontakt = async (k) => {
  const f = formWerte(document.getElementById("kk-" + k));
  await speichere("personen", { ...hole("personen", k), ...Object.fromEntries(KIND_KONTAKT.map((x) => [x, f[x] ?? ""])) });
  toast("💾 Gespeichert"); zeichne();
};

// 🟢 Online-Stand geändert → Orchester-Ansichten neu zeichnen (grüne Punkte an den Gesichtern)
document.addEventListener("bk-online", () => { if (["orchester", "person"].includes(S.view) && !document.querySelector(".blatt-hg")) zeichne(); });
