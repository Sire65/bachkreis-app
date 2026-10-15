// Leitungs-Cockpit, Vorgänge/Aufgaben, Genehmigungen (Leitung & Eltern), Notenarchiv & „Meine Noten“.
import { S, VIEWS, db, zeige, zurueck, kopf, name, vorname, istLehrkraft, istLeitung, istVorstand, istEltern, istSchueler } from "./zustand.js";
import { esc, AKTIONEN, datumKurz, uhr, toast, blatt, blattZu, formWerte, frage } from "../kern/ui.js";
import { liste, hole, speichere, speichereViele } from "../kern/daten.js";
import { cockpit, genehmigungsUebersicht, genehmigungStatus, kinderVon, elternVon, wirksameGruppen, instrumenteVon, termineFuer, antwortZaehler, tagIso, gruppenMitglieder, verteilerAufloesen, verteilerListe, generellerWechselPlan } from "../kern/logik.js";
import { senden } from "../kern/versand.js";

// ---------- Cockpit ----------
const BEREICHE = [["heute", "📅 Heute & diese Woche"], ["ich", "🙋 Wartet auf mich"], ["andere", "⏳ Wartet auf andere"], ["bald", "🔜 Fällig bald"]];
VIEWS.cockpit = {
  render() {
    const c = cockpit(db, S.ich.id);
    const vorstandSicht = istVorstand() && !istLehrkraft();
    const sicht = vorstandSicht ? c.filter((x) => ["reparatur", "einkauf"].includes(x.ziel.view) || x.sym === "💛") : c;
    const stand = new Date();
    const schueler = liste("personen", (p) => p.typ === "schueler" && p.status !== "ausgetreten").length;
    const vergangen = liste("termine", (t) => new Date(t.beginn) < stand && new Date(t.beginn) > new Date(stand - 60 * 86400000));
    let anw = 0, erf = 0;
    for (const t of vergangen) for (const a of liste("antworten", (a) => a.termin_id === t.id && a.anwesend)) { erf++; if (a.anwesend === "ja") anw++; }
    const kz = [
      [schueler, "aktive Schüler"],
      [liste("ausleihen", (a) => a.status === "aktiv").length, "Instrumente verliehen"],
      [erf ? Math.round((anw / erf) * 100) + " %" : "UNBEKANNT", "Anwesenheit (60 Tage)"],
      [liste("genehmigungen", (g) => g.status === "ausstehend").length, "Genehmigungen offen"],
    ];
    return kopf(vorstandSicht ? "🧭 Cockpit Förderverein" : "🧭 Cockpit") + BEREICHE.map(([b, t]) => {
      const e = sicht.filter((x) => x.bereich === b);
      return `<div class="karte ck-bereich"><h3>${t} <span class="badge">${e.length}</span></h3>${e.map((x) => `<div class="ck-eintrag ck-dring${x.dring}" data-a="ckOeffnen" data-x="${esc(JSON.stringify(x.ziel))}"><span class="sym">${x.sym}</span><div class="fl">${x.ampel ? `<span class="punkt ${x.ampel}"></span>` : ""}${esc(x.text)}</div><span>›</span></div>`).join("") || '<p class="hinweis">Nichts offen. ✨</p>'}</div>`;
    }).join("") + `<div class="karte"><h3>📊 Kennzahlen</h3><div class="kennzahlen">${kz.map(([w, t]) => `<div class="kennzahl"><b>${esc(w)}</b><small>${esc(t)}</small></div>`).join("")}</div><div class="stand">Stand: ${datumKurz(stand)} ${uhr(stand)} · Quelle: Demodaten</div></div>`;
  },
};
AKTIONEN.ckOeffnen = (x) => { const z = JSON.parse(x); zeige(z.view, z); };

// ---------- Vorgänge ----------
VIEWS.aufgabe = {
  render({ id }) {
    const a = hole("aufgaben", id);
    if (!a) return kopf("Vorgang") + '<div class="leer">Nicht gefunden.</div>';
    const ST = { offen: "offen", in_arbeit: "in Arbeit", erledigt: "erledigt" };
    return kopf("🗂️ Vorgang") + `<div class="karte"><div class="zeile-titel">${esc(a.titel)}</div><div class="hinweis">von ${esc(name(a.von_id))} · zuständig ${esc(name(a.zustaendig_id))}${a.frist ? " · Frist " + datumKurz(a.frist) : ""}</div><p>${esc(a.text || "")}</p>
      <div class="umschalter">${Object.entries(ST).map(([k, t]) => `<button class="${a.status === k ? "an" : ""}" data-a="aufgabeStatus" data-x="${id}|${k}">${t}</button>`).join("")}</div>
      ${a.art === "wechselwunsch" && a.status !== "erledigt" ? `<button class="knopf haupt" data-a="wunschUmsetzen" data-x="${id}">🔀 Wechsel jetzt umsetzen</button>` : ""}
      ${a.art === "aenderung" ? '<p class="hinweis">Änderung bitte in der PC-Verwaltung bei der Person eintragen und dann hier erledigen.</p>' : ""}</div>`;
  },
};
AKTIONEN.aufgabeStatus = async (x) => { const [id, st] = x.split("|"); await speichere("aufgaben", { ...hole("aufgaben", id), status: st }); zeige("aufgabe", { id }, { ersetzen: true }); };
AKTIONEN.wunschUmsetzen = async (id) => {
  const a = hole("aufgaben", id);
  if (!a.ziel_gruppe) { toast("Zielgruppe fehlt"); return; }
  const plan = generellerWechselPlan(db, a.von_id, a.ziel_gruppe, new Date());
  for (const z of plan.beenden) await speichere("gruppe_zuordnung", z, { still: true });
  await speichere("gruppe_zuordnung", { ...plan.neu, grund: "Wechselwunsch" });
  await speichere("aufgaben", { ...a, status: "erledigt" });
  await senden({ an: [a.von_id, ...elternVon(db, a.von_id)], betreff: "Gruppenwechsel umgesetzt", text: `Du bist jetzt in ${hole("gruppen", a.ziel_gruppe)?.name}.`, ereignis: "termin_geaendert" });
  toast("🔀 Wechsel umgesetzt"); zeige("aufgabe", { id }, { ersetzen: true });
};

// ---------- Genehmigungen (Leitung) ----------
const GST = { erteilt: ["b-gruen", "erteilt"], ausstehend: ["b-gelb", "ausstehend"], ueberfaellig: ["b-rot", "Frist abgelaufen"], abgelehnt: ["b-rot", "abgelehnt"], widerrufen: ["b-grau", "widerrufen"] };
VIEWS.genehmigungen = {
  render(p) {
    const ue = genehmigungsUebersicht(db);
    if (p.key) {
      const u = ue.find((x) => `${x.vorlage?.id}|${x.projekt?.id || ""}` === p.key);
      if (!u) return kopf("Genehmigungen") + '<div class="leer">–</div>';
      const reihen = u.eintraege.map((g) => ({ g, st: genehmigungStatus(g) })).sort((a, b) => ["ueberfaellig", "ausstehend", "abgelehnt", "widerrufen", "erteilt"].indexOf(a.st) - ["ueberfaellig", "ausstehend", "abgelehnt", "widerrufen", "erteilt"].indexOf(b.st));
      return kopf("✍️ " + esc(u.vorlage?.titel)) + `<div class="karte"><div class="hinweis">${u.projekt ? esc(u.projekt.titel) + " · " : ""}Frist ${datumKurz(u.frist)}</div>
        <div class="zaehler"><span class="badge b-gruen">✔ ${u.erteilt}</span><span class="badge b-gelb">⏳ ${u.ausstehend}</span><span class="badge b-rot">⚠ ${u.ueberfaellig + u.abgelehnt}</span></div>
        <div class="knopfreihe"><button class="knopf" data-a="genErinnern" data-x="${esc(p.key)}">⏰ Offene Eltern erinnern</button><button class="knopf" data-a="drucken">🖨️ Papier-Formular drucken</button></div></div>
        <div class="karte"><ul class="liste">${reihen.map(({ g, st }) => `<li><div class="fl"><div class="zeile-titel">${esc(name(g.kind_id))}</div><div class="zeile-unter">${g.beantwortet_am ? `${datumKurz(g.beantwortet_am)} von ${esc(name(g.beantwortet_von))}` : ""}${g.papier ? " · Papier" : ""}</div></div><span class="badge ${GST[st][0]}">${GST[st][1]}</span>${st === "ausstehend" || st === "ueberfaellig" ? `<button class="knopf klein" data-a="genPapier" data-x="${g.id}">📄 Papier da</button>` : ""}</li>`).join("")}</ul></div>`;
    }
    return kopf("✍️ Genehmigungen", istLeitung() ? `<button class="knopf haupt klein" data-a="genNeu">＋ Anfordern</button>` : "") + ue.map((u) => {
      const offen = u.ausstehend + u.ueberfaellig;
      return `<div class="karte klick" data-a="genOeffnen" data-x="${esc(`${u.vorlage?.id}|${u.projekt?.id || ""}`)}"><div class="zeile-titel">${esc(u.vorlage?.titel)}${u.projekt ? " · " + esc(u.projekt.titel) : ""}</div>
        <div class="balken" style="margin:6px 0"><i class="ja" style="width:${(u.erteilt / u.gesamt) * 100}%"></i><i class="vielleicht" style="width:${(offen / u.gesamt) * 100}%"></i></div>
        <div class="hinweis">${u.erteilt} von ${u.gesamt} erteilt · ${offen} offen${u.ueberfaellig ? ` · <b style="color:var(--rot)">${u.ueberfaellig} Frist abgelaufen</b>` : ""} · Frist ${datumKurz(u.frist)}</div></div>`;
    }).join("") + `<p class="hinweis">„Ausstehend“ zählt nie als erteilt. Fehlt eine Reisegenehmigung, ist das Kind in Cockpit und Teilnehmerliste markiert.</p>`;
  },
};
AKTIONEN.genOeffnen = (k) => zeige("genehmigungen", { key: k });
AKTIONEN.genPapier = async (id) => {
  await speichere("genehmigungen", { ...hole("genehmigungen", id), status: "erteilt", papier: true, beantwortet_am: new Date().toISOString(), beantwortet_von: S.ich.id });
  toast("📄 Papier-Eingang vermerkt"); zeige(S.view, S.params, { ersetzen: true });
};
AKTIONEN.genErinnern = async (key) => {
  const u = genehmigungsUebersicht(db).find((x) => `${x.vorlage?.id}|${x.projekt?.id || ""}` === key);
  const kids = u.eintraege.filter((g) => g.status === "ausstehend").map((g) => g.kind_id);
  const an = [...new Set(kids.flatMap((k) => elternVon(db, k)))];
  const s = await senden({ an, betreff: `Bitte bestätigen: ${u.vorlage.titel}`, text: `Für ${u.projekt?.titel || "den Bachkreis"} fehlt noch Ihre Zustimmung „${u.vorlage.titel}“. Bitte in der App unter Meins › Genehmigungen.`, ereignis: "genehmigung" });
  toast(`⏰ ${an.length} Eltern erinnert (${s.push} Push, ${s.mail} Mail – simuliert)`);
};
AKTIONEN.genNeu = () => {
  blatt("Genehmigung anfordern", `<div id="genForm"><div class="feld"><label>Vorlage</label><select name="vorlage">${liste("genehmigung_vorlagen").map((v) => `<option value="${v.id}">${esc(v.titel)}</option>`).join("")}</select></div>
    <div class="feld"><label>Für (Kinder)</label><select name="verteiler">${verteilerListe(db).filter((v) => /^(alle|gruppe|projekt):?/.test(v.key) && !v.key.startsWith("projekteltern")).map((v) => `<option value="${v.key}">${esc(v.name)}</option>`).join("")}</select></div>
    <div class="feld"><label>Projekt (optional)</label><select name="projekt"><option value="">–</option>${liste("projekte").map((p) => `<option value="${p.id}">${esc(p.titel)}</option>`).join("")}</select></div>
    <div class="feld"><label>Frist</label><input type="date" name="frist" value="${tagIso(new Date(Date.now() + 14 * 86400000))}"></div>
    <button class="knopf haupt breit" data-a="genAnfordern">📨 An Eltern senden</button></div>`);
};
AKTIONEN.genAnfordern = async () => {
  const f = formWerte(document.getElementById("genForm"));
  const kids = verteilerAufloesen(db, f.verteiler).filter((k) => hole("personen", k)?.typ === "schueler");
  await speichereViele("genehmigungen", kids.map((k) => ({ vorlage_id: f.vorlage, kind_id: k, projekt_id: f.projekt || null, frist: f.frist, status: "ausstehend" })));
  const an = [...new Set(kids.flatMap((k) => elternVon(db, k)))];
  await senden({ an, betreff: `Bitte bestätigen: ${hole("genehmigung_vorlagen", f.vorlage)?.titel}`, text: "Bitte in der Bachkreis-App unter Meins › Genehmigungen zustimmen oder ablehnen.", ereignis: "genehmigung" });
  blattZu(); toast(`📨 ${kids.length} Genehmigungen angefordert, ${an.length} Eltern benachrichtigt`);
  zeige("genehmigungen", {}, { ersetzen: true });
};

// ---------- Genehmigungen (Eltern) ----------
VIEWS.meinegenehmigungen = {
  render() {
    const kids = kinderVon(db, S.ich.id);
    const gs = liste("genehmigungen", (g) => kids.includes(g.kind_id)).sort((a, b) => (a.status === "ausstehend" ? -1 : 1) - (b.status === "ausstehend" ? -1 : 1));
    return kopf("✍️ Genehmigungen") + (gs.map((g) => {
      const v = hole("genehmigung_vorlagen", g.vorlage_id);
      const st = genehmigungStatus(g);
      return `<div class="karte"><div class="zeile-titel">${esc(v?.titel)} – ${esc(vorname(g.kind_id))}</div>${g.projekt_id ? `<div class="hinweis">${esc(hole("projekte", g.projekt_id)?.titel)}</div>` : ""}
        <p>${esc(v?.text)}</p><div class="hinweis">Fassung ${v?.fassung || 1}${g.frist ? " · Frist " + datumKurz(g.frist) : ""}</div><span class="badge ${GST[st][0]}">${GST[st][1]}</span>
        <div class="knopfreihe">${g.status === "ausstehend" ? `<button class="knopf gruen" data-a="genAntwort" data-x="${g.id}|erteilt">✔️ Ich stimme zu</button><button class="knopf rot" data-a="genAntwort" data-x="${g.id}|abgelehnt">Ablehnen</button>` : g.status === "erteilt" ? `<button class="knopf klein" data-a="genAntwort" data-x="${g.id}|widerrufen">Widerrufen</button>` : ""}</div></div>`;
    }).join("") || '<div class="leer">Keine Genehmigungen.</div>');
  },
};
AKTIONEN.genAntwort = async (x) => {
  const [id, st] = x.split("|");
  if (st !== "erteilt" && !(await frage(st === "widerrufen" ? "Zustimmung wirklich widerrufen?" : "Wirklich ablehnen?"))) return;
  const g = hole("genehmigungen", id);
  await speichere("genehmigungen", { ...g, status: st, beantwortet_von: S.ich.id, beantwortet_am: new Date().toISOString(), vorlage_version: hole("genehmigung_vorlagen", g.vorlage_id)?.fassung || 1 });
  toast(st === "erteilt" ? "✔️ Zustimmung gespeichert (mit Zeitpunkt und Textfassung)" : "Gespeichert");
  zeige(S.view, S.params, { ersetzen: true });
};

// ---------- Notenarchiv ----------
const RECHTE = { gemeinfrei: "b-gruen", lizenziert: "b-gelb", intern: "b-blau" };
VIEWS.noten = {
  render(p) {
    if (p.werk) {
      const w = hole("werke", p.werk);
      const st = liste("stimmen", (s) => s.werk_id === w.id);
      return kopf("📚 " + esc(w.titel)) + `<div class="karte"><b>${esc(w.komponist)}</b> · ${esc(w.werkverzeichnis || "")}<div class="hinweis">${esc(w.ausgabe || "")}</div><span class="badge ${RECHTE[w.rechte] || ""}">${esc(w.rechte || "")}</span>
        <div>${(w.projekte || []).map((x) => `<span class="badge">🎭 ${esc(hole("projekte", x)?.titel)}</span>`).join("")}</div></div>
        <div class="karte"><h3>Stimmen (${st.length})</h3><ul class="liste">${st.map((s) => `<li><div class="fl"><b>${esc(s.bezeichnung)}</b> <span class="hinweis">${s.register_id ? "→ " + esc(hole("register", s.register_id)?.name) : s.person_id ? "→ nur " + esc(name(s.person_id)) : "Partitur / alle"}${s.gruppe_id ? " · nur " + esc(hole("gruppen", s.gruppe_id)?.kuerzel) : ""}</span></div><button class="knopf klein" data-a="notenDatei" data-x="${s.id}">📄</button></li>`).join("")}</ul></div>`;
    }
    const ws = liste("werke").sort((a, b) => a.komponist.localeCompare(b.komponist));
    return kopf("📚 Notenarchiv") + `<div class="karte"><ul class="liste">${ws.map((w) => `<li class="klick" data-a="notenWerk" data-x="${w.id}"><div class="fl"><div class="zeile-titel">${esc(w.titel)}</div><div class="zeile-unter">${esc(w.komponist)} ${esc(w.werkverzeichnis || "")} · ${liste("stimmen", (s) => s.werk_id === w.id).length} Stimmen</div></div><span class="badge ${RECHTE[w.rechte] || ""}">${esc(w.rechte || "")}</span></li>`).join("")}</ul></div>
      <p class="hinweis">Werke und Stimmen werden in der PC-Verwaltung angelegt. Die PDF-Dateien kommen im Echtbetrieb in einen geschützten Speicher (z. B. Cloudflare R2) – in der Vorführversion sind keine Dateien hinterlegt.</p>`;
  },
};
AKTIONEN.notenWerk = (id) => zeige("noten", { werk: id });
AKTIONEN.notenDatei = () => toast("📄 Vorführversion: Hier öffnet sich später das PDF der Stimme.");

VIEWS.meinenoten = {
  render() {
    const ids = istEltern() ? kinderVon(db, S.ich.id) : [S.ich.id];
    let html = kopf("🎼 Meine Noten");
    for (const pid of ids) {
      const regs = instrumenteVon(db, pid).map((i) => i.register_id).filter(Boolean);
      const gr = wirksameGruppen(db, pid);
      const projekte = new Set(termineFuer(db, pid).map((t) => t.projekt_id).filter(Boolean));
      const werke = liste("werke", (w) => (w.projekte || []).some((p) => projekte.has(p)));
      const passend = werke.map((w) => ({ w, st: liste("stimmen", (s) => s.werk_id === w.id && (s.person_id === pid || (!s.person_id && s.register_id && regs.includes(s.register_id) && (!s.gruppe_id || gr.includes(s.gruppe_id))))) })).filter((x) => x.st.length);
      html += `${istEltern() ? `<h3>${esc(vorname(pid))}</h3>` : ""}` + (passend.map(({ w, st }) => `<div class="karte"><div class="zeile-titel">${esc(w.titel)}</div><div class="hinweis">${esc(w.komponist)} · ${(w.projekte || []).filter((p) => projekte.has(p)).map((p) => esc(hole("projekte", p)?.titel)).join(", ")}</div>
        <div class="knopfreihe">${st.map((s) => `<button class="knopf klein" data-a="notenDatei" data-x="${s.id}">📄 ${esc(s.bezeichnung)}</button>`).join("")}</div></div>`).join("") || '<div class="leer">Für deine Projekte sind noch keine Stimmen hinterlegt.</div>');
    }
    return html + '<p class="hinweis">Du siehst automatisch die Stimmen für deine Instrumente, deine Gruppe und deine Projekte – auch bei einem temporären Gruppenwechsel.</p>';
  },
};
