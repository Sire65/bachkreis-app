// 📁 Meine Unterlagen (0.48.0, wie KC „Kennst du schon deinen eigenen Archiv-Ordner?“): je Person ein Ordner – für Eltern ihr eigener und der ihrer
// Kinder. Darin: was die Leitung ablegt (Bescheinigungen, unterschriebene Verträge, Urkunden) und was Eltern selbst hochladen (Attest, Quittung …),
// dazu Abkürzungen zu dem, was die App ohnehin führt (Genehmigungen, Leihinstrument, Einwilligungen). Sichtbar nur für die Familie und die Leitung.
import { S, VIEWS, db, zeichne, kopf, name, hatRolle, istEltern } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu, formWerte } from "../kern/ui.js";
import { liste, hole, speichere, neueId } from "../kern/daten.js";
import { UNTERLAGEN_ARTEN, istMinderjaehrig } from "../kern/schema.js";
import { kinderVon } from "../kern/logik.js";
import { klappe } from "../kern/klappen.js";
import { hochladen, bildVerkleinern, dateiOeffnen } from "../kern/dateien.js";

const chef = () => hatRolle("admin", "leitung");
const U = { person: null, q: "", datei: null };
export const meineOrdner = () => (S.ich ? [S.ich.id, ...(istEltern() ? kinderVon(db, S.ich.id) : [])] : []);
const darfSelbst = () => !(S.ich?.typ === "schueler" && istMinderjaehrig(S.ich));
function ordnerHtml(pid, offen) {
  const p = hole("personen", pid), l = liste("unterlagen", (u) => u.person_id === pid).sort((a, b) => (b.jahr || 0) - (a.jahr || 0) || String(b.erstellt_am || "").localeCompare(String(a.erstellt_am || "")));
  const abk = pid === S.ich?.id && !istEltern() ? "" : `<div class="knopfreihe ul-abk"><button type="button" class="knopf klein" data-a="kachel" data-x="meinegenehmigungen">✍️ Genehmigungen</button><button type="button" class="knopf klein" data-a="kachel" data-x="meininstrument">🎻 Leihinstrument</button><button type="button" class="knopf klein" data-a="kachel" data-x="meinedaten">🔐 Einwilligungen & Daten</button></div>`;
  const inhalt = `${l.length ? `<ul class="liste">${l.map((u) => `<li><span aria-hidden="true">${(UNTERLAGEN_ARTEN[u.art] || "📄").split(" ")[0]}</span><div class="fl"><b>${esc(u.titel)}</b><div class="zeile-unter">${esc(UNTERLAGEN_ARTEN[u.art] || "")} · ${esc(u.jahr || "")} · abgelegt von ${esc(u.von === S.ich?.id ? "dir" : name(u.von))}</div></div>
      <button type="button" class="knopf klein" data-a="ulAuf" data-x="${esc(u.id)}">📂 Öffnen</button>${u.von === S.ich?.id || chef() ? `<button type="button" class="knopf klein" data-a="ulWeg" data-x="${esc(u.id)}" aria-label="${esc(u.titel)} löschen">🗑️</button>` : ""}</li>`).join("")}</ul>` : '<p class="hinweis">Noch nichts abgelegt.</p>'}
    ${chef() || darfSelbst() ? `<button type="button" class="knopf klein haupt" data-a="ulNeu" data-x="${esc(pid)}">＋ Unterlage ablegen</button>` : ""}${abk}`;
  return klappe(`ul_${pid}`, `📁 ${esc(p ? name(p) : "–")}`, inhalt, { offen, zahl: l.length, klasse: "ul-ordner" });
}
VIEWS.unterlagen = {
  render() {
    const eigene = meineOrdner();
    let chefTeil = "";
    if (chef()) {
      const q = U.q.trim().toLowerCase(), treffer = q.length >= 2 ? liste("personen", (p) => p.status === "aktiv" && `${p.vorname} ${p.nachname}`.toLowerCase().includes(q)).slice(0, 8) : [];
      chefTeil = `<div class="karte"><h3>🧑‍💼 Ordner einer Person (Leitung)</h3><div class="feld"><input id="ulSuche" type="search" placeholder="Name …" value="${esc(U.q)}" aria-label="Person suchen"></div>
        ${treffer.length ? `<div class="knopfreihe">${treffer.map((p) => `<button type="button" class="knopf klein${U.person === p.id ? " haupt" : ""}" data-a="ulPerson" data-x="${esc(p.id)}">${esc(name(p))}</button>`).join("")}</div>` : ""}
        ${U.person && !eigene.includes(U.person) ? ordnerHtml(U.person, true) : ""}</div>`;
    }
    return kopf("📁 Meine Unterlagen") + `<p class="hinweis">Bescheinigungen, unterschriebene Verträge, Atteste – sicher an einem Ort. Sehen können das nur ${istEltern() ? "Sie und die Leitung" : "du und die Leitung"}.</p>`
      + eigene.map((pid, i) => ordnerHtml(pid, i === 0 || eigene.length <= 2)).join("") + chefTeil;
  },
  nach(w) { w.querySelector("#ulSuche")?.addEventListener("input", (e) => { U.q = e.target.value; const pos = e.target.selectionStart; zeichne(); const f = document.getElementById("ulSuche"); f?.focus(); try { f?.setSelectionRange(pos, pos); } catch {} }); },
};
AKTIONEN.ulPerson = (id) => { U.person = id; zeichne(); };
AKTIONEN.ulNeu = (pid) => {
  U.datei = null;
  blatt(`＋ Unterlage für ${name(pid)}`, `<form id="ulForm"><input type="hidden" name="person_id" value="${esc(pid)}">
    <div class="feld"><label for="ulTitel">Titel</label><input id="ulTitel" name="titel" maxlength="120" required placeholder="z. B. Teilnahmebescheinigung 2026"></div>
    <div class="feld"><label for="ulArt">Art</label><select id="ulArt" name="art">${Object.entries(UNTERLAGEN_ARTEN).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>
    <div class="feld"><label for="ulDatei">Datei (Foto oder PDF)</label><input id="ulDatei" type="file" accept="image/*,application/pdf" data-c="ulDateiWahl"><small id="ulDateiOk" class="hinweis"></small></div></form>
    <button type="button" class="knopf haupt breit" data-a="ulSpeichern">💾 Ablegen</button>`);
};
AKTIONEN.ulDateiWahl = async (_, el) => {
  const f = el.files?.[0]; if (!f) return; const ok = document.getElementById("ulDateiOk"); if (ok) ok.textContent = "⏳ wird hochgeladen …";
  try { const klein = /^image\//.test(f.type) ? await bildVerkleinern(f, 1800) : f; const r = await hochladen(klein, { name: f.name }); U.datei = "datei:" + r.id; if (ok) ok.textContent = `✅ ${f.name}`;
    const t = document.getElementById("ulTitel"); if (t && !t.value) t.value = f.name.replace(/\.[a-z0-9]+$/i, ""); }
  catch (e) { U.datei = null; if (ok) ok.textContent = "⚠️ " + e.message; }
};
AKTIONEN.ulSpeichern = async () => {
  const f = formWerte(document.getElementById("ulForm")); if (!U.datei) return toast("Bitte erst eine Datei wählen"); if (!String(f.titel || "").trim()) return toast("Bitte einen Titel eingeben");
  try { await speichere("unterlagen", { id: neueId(), person_id: f.person_id, titel: f.titel.trim(), art: f.art, datei: U.datei, von: S.ich.id, jahr: new Date().getFullYear() }); blattZu(); toast("📁 Abgelegt"); zeichne(); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.ulAuf = async (id) => {
  const u = hole("unterlagen", id); if (!u) return;
  if (u.datei.startsWith("bild:")) return window.open(u.datei.slice(5), "_blank", "noopener");
  try { await dateiOeffnen(u.datei.replace(/^datei:/, ""), u.titel, ""); } catch (e) { toast("⚠️ " + e.message); }
};
AKTIONEN.ulWeg = async (id) => { if (!confirm("Diese Unterlage löschen?")) return; const u = hole("unterlagen", id); if (u) await speichere("unterlagen", { ...u, geloescht_am: new Date().toISOString() }); zeichne(); };
