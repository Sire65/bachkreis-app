// Orchester: Gruppen A–D (Registry), Mitglieder je Register, Personen-Detail, Gruppenwechsel generell (mit Historie)
// und temporär (Zeitraum/Projekt), Wechselwunsch der Schüler, Konzerte & Projekte mit Checkliste.
import { S, VIEWS, db, zeige, zurueck, kopf, name, istLehrkraft, istLeitung, istEltern } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere } from "../kern/daten.js";
import { gruppenMitglieder, stammgruppe, wirksameGruppen, temporaereZuordnungen, generellerWechselPlan, instrumenteVon, registerVon, elternVon, kinderVon, tagIso, ausleihenVon } from "../kern/logik.js";
import { terminKarte } from "./termine.js";
import { senden } from "../kern/versand.js";

VIEWS.orchester = {
  render(p) {
    const gruppen = liste("gruppen", (g) => g.aktiv !== false).sort((a, b) => a.sort - b.sort);
    const gid = p.gruppe || gruppen[0]?.id;
    const g = hole("gruppen", gid);
    const mitglieder = gruppenMitglieder(db, gid);
    const regs = liste("register").sort((a, b) => a.sort - b.sort);
    const jeReg = regs.map((r) => ({ r, ps: mitglieder.filter((m) => registerVon(db, m) === r.id).sort((a, b) => name(a).localeCompare(name(b))) })).filter((x) => x.ps.length);
    const ohne = mitglieder.filter((m) => !registerVon(db, m));
    const tab = `<div class="umschalter">${gruppen.map((x) => `<button class="${x.id === gid ? "an" : ""}" data-a="orchGruppe" data-x="${x.id}" style="${x.id === gid ? `color:${esc(x.farbe)}` : ""}">${esc(x.kuerzel)}<span class="anz"> ${gruppenMitglieder(db, x.id).length}</span></button>`).join("")}</div>`;
    return kopf("🎼 Orchester") + tab + `<div class="karte"><h3 style="color:${esc(g?.farbe)}">${esc(g?.name)}</h3><div class="hinweis">${esc(g?.beschreibung || "")} · ${mitglieder.length} Mitglieder</div></div>` +
      jeReg.map(({ r, ps }) => `<div class="karte"><h3>${esc(r.name)} <span class="hinweis">(${ps.length})</span></h3><ul class="liste">${ps.map((m) => {
        const temp = !liste("gruppe_zuordnung", (z) => z.person_id === m && z.gruppe_id === gid && z.art === "stamm").length;
        const pers = hole("personen", m);
        return `<li class="klick" data-a="oeffne" data-x="person|${m}"><div class="fl"><div class="zeile-titel">${esc(name(m))}${(pers.rollen || []).includes("registerfuehrer") ? " ⭐" : ""}</div><div class="zeile-unter">${pers.jahrgang ? "Jg. " + pers.jahrgang : esc(pers.typ === "ehemalig" ? "Ehemalige/r" : "")}${instrumenteVon(db, m).length > 1 ? " · spielt auch " + esc(instrumenteVon(db, m).slice(1).map((i) => hole("instrument_typen", i.typ_id)?.name).join(", ")) : ""}</div></div>${temp ? '<span class="badge b-lila">temporär</span>' : ""}</li>`;
      }).join("")}</ul></div>`).join("") + (ohne.length ? `<div class="karte"><h3>ohne Instrument</h3>${ohne.map((m) => esc(name(m))).join(", ")}</div>` : "");
  },
};
AKTIONEN.orchGruppe = (g) => zeige("orchester", { gruppe: g }, { ersetzen: true });

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
    html += `<div class="karte"><div class="zeile-titel">${esc(name(p))}</div><div class="hinweis">${p.jahrgang ? "Jahrgangsstufe " + p.jahrgang + " · " : ""}${esc(p.schule || "")}</div>
      <div>${wirk.map((g) => hole("gruppen", g)).map((g) => `<span class="badge" style="background:${esc(g.farbe)}22;color:${esc(g.farbe)}">${esc(g.kuerzel)} – ${esc(g.name)}${g.id !== stamm ? " (temporär)" : ""}</span>`).join("")}</div>
      <h4>Instrumente</h4><ul class="liste">${inst.map((i) => `<li><div class="fl">${i.haupt ? "⭐ " : ""}${esc(hole("instrument_typen", i.typ_id)?.name)} <span class="hinweis">→ ${esc(hole("register", i.register_id)?.name || "")}${i.eigenes ? " · eigenes" : " · Leihinstrument nötig"}</span></div></li>`).join("") || "<li>–</li>"}</ul></div>`;
    if (darfDetails) {
      const eltern = elternVon(db, id).map((e) => hole("personen", e)).filter(Boolean);
      html += `<div class="karte"><h3>Kontakt</h3><div>${esc(p.strasse || "")} ${esc(p.plz || "")} ${esc(p.ort || "")}</div>${p.mobil ? `<div>📱 <a href="tel:${esc(p.mobil.replace(/\s/g, ""))}">${esc(p.mobil)}</a></div>` : ""}${p.email ? `<div>✉️ ${esc(p.email)}</div>` : ""}
        ${eltern.length ? `<h4>Eltern</h4><ul class="liste">${eltern.map((e) => `<li><div class="fl">${esc(name(e))}</div><a class="knopf klein" href="tel:${esc((e.mobil || "").replace(/\s/g, ""))}">📞</a></li>`).join("")}</ul>` : ""}
        ${p.notfall_info ? `<div class="badge b-rot">⚕️ ${esc(p.notfall_info)}</div>` : ""}${p.foto_ok === false ? '<div class="badge b-gelb">📷 keine Foto-Erlaubnis</div>' : ""}</div>`;
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
    if (werke.length) html += `<div class="karte"><h3>🎼 Programm</h3><ol>${werke.map((w) => `<li><b>${esc(w.komponist)}</b>: ${esc(w.titel)} <span class="hinweis">${esc(w.werkverzeichnis || "")}</span></li>`).join("")}</ol></div>`;
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
        <div class="hinweis">${instrumenteVon(db, k).map((i) => esc(hole("instrument_typen", i.typ_id)?.name)).join(", ")}</div></div>`;
    }).join("");
  },
};
