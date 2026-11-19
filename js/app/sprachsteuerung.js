// 🎤 Sprachsteuerung (wie KC-CLUB-SPRACHSTEUERUNG, für den Bachkreis zugeschnitten): Mikrofon antippen und sagen, was passieren soll.
// Gesendet wird nie ungefragt – Nachrichten und Zettel stehen danach im Schreibfeld, abgeschickt wird mit ➤.
//   „Öffne Termine / Nachrichten / Pinnwand / Noten / Einstellungen“ · „Nachricht an Bettina: Ich komme später“
//   „Express an Judith: Saal ist belegt“ · „Wichtig an …“ · „Neuer Zettel: Notenständer wegräumen“ · „Lies meine Nachrichten“ · „Hilfe“
import { S, zeige, name, istVerwalter, einst } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { zuhoeren, spracheMoeglich, SPRACHE_FEHLER } from "./sprache.js";
import { chatPartner, chatMitText, ungeleseneVorlesen } from "./nachrichten.js";

const ZIELE = [
  [/nachricht|chat/, "nachrichten"], [/termin|kalender|probe/, "termine"], [/pinnwand|zettel/, "pinnwand"], [/noten|stimme/, () => (istVerwalter() ? "noten" : "meinenoten")],
  [/einstellung|zahnrad|mehr/, "einstellungen"], [/start|anfang|home/, "start"], [/sos|notfall|notruf/, "sos"], [/orchester|mitglied/, "orchester"], [/instrument/, "instrumente"], [/üben|ueben|übe/, "ueben"], [/kalender|abo/, "kalender"],
  [/genehmigung/, () => (S.ich?.typ === "eltern" ? "meinegenehmigungen" : "genehmigungen")], [/bühne|buehne/, "buehne"], [/hilfe|tipp/, "hilfe"],
];
export const BEISPIELE = ["Öffne Termine", "Nachricht an Bettina: Ich komme 10 Minuten später", "Express an Judith: Saal 2 ist belegt", "Wichtig an Martin: Bitte Noten mitbringen", "Neuer Zettel: Notenständer wegräumen", "Lies meine Nachrichten", "Hilfe"];
const klein = (t) => String(t || "").toLowerCase().replace(/[.!?]+$/, "").trim();
function personFinden(wort) {
  const w = klein(wort); if (!w) return [];
  const l = chatPartner();
  const genau = l.filter((p) => klein(p.vorname) === w || klein(name(p)) === w);
  return genau.length ? genau : l.filter((p) => klein(p.vorname).startsWith(w) || klein(p.nachname) === w);
}

export async function befehl(roh) {
  const t = klein(roh);
  if (!t) return toast("🎤 Ich habe nichts verstanden.");
  if (/^(hilfe|was kann ich sagen|befehle)/.test(t)) return hilfe();
  if (/(lies|vorlesen|vorlese)/.test(t) && /nachricht/.test(t)) { const n = ungeleseneVorlesen(); return toast(n ? `🔊 Ich lese ${n} ${n === 1 ? "Nachricht" : "Nachrichten"} vor` : "🔊 Keine neuen Nachrichten"); }
  // „Nachricht an <Name>: <Text>“, „Express an …“, „Wichtig an …“, „Schreib <Name> …“
  const m = /^(?:(express|eilig|wichtig)\s+(?:an|für)\s+|(?:nachricht|schreibe?|sende?)\s+(?:an\s+)?)([a-zäöüß-]+)(?:\s+[a-zäöüß-]+)?[\s,:]*(.*)$/i.exec(roh.trim());
  if (m && !/^(öffne|zeig)/.test(t)) {
    const art = klein(m[1]), l = personFinden(m[2]);
    if (!l.length) return toast(`🎤 „${m[2]}“ habe ich nicht gefunden – oder du darfst dieser Person nicht privat schreiben.`, 5000);
    if (l.length > 1) return blatt("🎤 Wen meinst du?", `<div class="na-knoepfe">${l.slice(0, 8).map((p) => `<button class="knopf" data-a="spracheAn" data-x="${esc(p.id)}|${esc(art)}|${esc(m[3])}">${esc(name(p))}</button>`).join("")}</div>`);
    await chatMitText(l[0].id, m[3], { express: /express|eilig/.test(art), wichtig: art === "wichtig" });
    return toast("🎤 Text steht im Schreibfeld – zum Senden ➤ tippen", 4000);
  }
  const z = /(?:neuer?|neuen)\s+zettel[\s,:]*(.*)$/.exec(t);
  if (z) {
    zeige("pinnwand"); AKTIONEN.pwNeu?.();
    setTimeout(() => { const f = document.getElementById("pwText"); if (f && z[1]) { f.value = roh.trim().replace(/^.*?zettel[\s,:]*/i, ""); f.dispatchEvent(new Event("input", { bubbles: true })); } }, 50);
    return toast("🎤 Zettel vorbereitet – wählen, für wen, dann 📌 Anheften", 4000);
  }
  for (const [re, ziel] of ZIELE) if (re.test(t)) { zeige(typeof ziel === "function" ? ziel() : ziel); return toast("🎤 " + roh.trim()); }
  toast(`🎤 Das habe ich nicht verstanden: „${roh.trim()}“ – sag „Hilfe“.`, 5000);
}
AKTIONEN.spracheAn = (x) => { const [pid, art, text] = String(x).split("|"); blattZu(); chatMitText(pid, text, { express: /express|eilig/.test(art), wichtig: art === "wichtig" }); };
function hilfe() {
  blatt("🎤 Das kannst du sagen", `<ul class="liste">${BEISPIELE.map((b) => `<li>„${esc(b)}“</li>`).join("")}</ul><p class="hinweis">Nachrichten und Zettel werden nur vorbereitet – gesendet wird erst, wenn du ➤ bzw. 📌 tippst.</p>`);
}

let stop = null;
AKTIONEN.sprachsteuerung = () => {
  if (!spracheMoeglich()) return toast("🎤 " + SPRACHE_FEHLER.NICHT_MOEGLICH, 5000);
  if (stop) { stop(); return; }
  const b = blatt("🎤 Ich höre zu …", `<div class="sprach-ohr"><span class="sprach-welle"></span><div id="sprachText" class="sprach-text">Sag zum Beispiel: „${esc(BEISPIELE[Math.floor(Math.random() * 3)])}“</div></div>
    <button class="knopf breit" data-a="sprachHilfe">❓ Was kann ich sagen?</button>`);
  b.classList.add("sprach-blatt");
  stop = zuhoeren({
    zwischen: (x) => { const e = document.getElementById("sprachText"); if (e) e.textContent = x; },
    fertig: (x) => { stop = null; blattZu(); if (x) befehl(x); },
    fehler: (f) => { stop = null; blattZu(); toast("🎤 " + (SPRACHE_FEHLER[f] || SPRACHE_FEHLER.FEHLER), 4500); },
  });
  b.closest(".blatt-hg")?.addEventListener("click", (e) => { if (e.target === e.currentTarget && stop) { stop(); stop = null; } });
};
AKTIONEN.sprachHilfe = () => { stop?.(); stop = null; hilfe(); };
export const sprachsteuerungAn = () => spracheMoeglich() && einst().sprachsteuerung !== false;
