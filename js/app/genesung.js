// 💐 Gute-Besserung-Karte (0.75.0, wie KC-CLUB-GENESUNGSKARTE/-KARTEN 2.965/2.967 – angepasst an den Bachkreis): eine gemalte Karte mit
// Motiv (Blumenstrauß, Geige mit Herz, Teddy mit Noten, Sonne mit Regenbogen), Überschrift, kurzem Text (Vorschlag oder eigener, bis 120
// Zeichen) und Absender – als Bild in den Chat mit der Person. Bei Kindern lesen die Eltern mit (wie jeder Chat mit Kindern im Bachkreis);
// wer der Person nicht schreiben darf (Kinderschutz), bekommt den Knopf nicht. Auf der Karte steht nie ein Grund – keine Gesundheitsdaten.
import { S, zeige } from "./zustand.js";
import { esc, AKTIONEN, toast, blatt, blattZu } from "../kern/ui.js";
import { hole, konfig } from "../kern/daten.js";
import { hochladen } from "../kern/dateien.js";
import { darfChatten, einzelchatMit, nachrichtDirekt } from "./nachrichten.js";

export const GK_MOTIVE = {
  strauss: ["💐", "Blumenstrauß", "#fff4f7"],
  geige: ["🎻", "Geige mit Herz", "#fff8ec"],
  teddy: ["🧸", "Teddy mit Noten", "#f3f7ff"],
  sonne: ["☀️", "Sonne & Regenbogen", "#f2fbff"],
};
export const GK_KOEPFE = ["Gute Besserung, {v}!", "Werde schnell gesund, {v}!", "Wir denken an dich, {v}!"];
export const GK_TEXTE = ["Das Orchester vermisst dich – komm bald wieder!", "Ruh dich gut aus – deine Noten warten auf dich.", "Ohne dich fehlt ein Ton – werde schnell wieder gesund!", "Ganz viel Kraft und bald wieder viel Spaß beim Musizieren!"];
const G = { pid: "", motiv: "strauss", kopf: 0, text: 0, eigen: "", absender: "bachkreis", absenderEigen: "" };

// Motive als SVG (viewBox 0 0 200 200) – in der App gezeichnet, kein fremder Server
const blume = (x, y, f, r = 13) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((w) => `<ellipse rx="${r * 0.55}" ry="${r}" transform="rotate(${w}) translate(0 ${-r * 0.8})" fill="${f}"/>`).join("")}<circle r="${r * 0.55}" fill="#ffd54f"/></g>`;
const NOTE = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#5c6bc0"><ellipse cx="0" cy="0" rx="6" ry="4.5" transform="rotate(-20)"/><rect x="4.5" y="-26" width="2.2" height="26"/><path d="M6.7 -26 q10 4 8 14 q-2 -7 -8 -8z"/></g>`;
export function gkMotivSvg(m) {
  if (m === "geige") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 18 c-9 -10 -26 -6 -26 8 c0 16 26 26 26 34 c0 -8 26 -18 26 -34 c0 -14 -17 -18 -26 -8z" fill="#e53950"/>
    <g transform="rotate(-28 100 125)"><rect x="96" y="40" width="8" height="56" rx="2" fill="#3e2723"/><circle cx="100" cy="38" r="7" fill="#5d4037"/>
    <path d="M100 92 c-26 0 -30 14 -24 26 c4 8 -6 10 -6 22 c0 20 14 30 30 30 c16 0 30 -10 30 -30 c0 -12 -10 -14 -6 -22 c6 -12 2 -26 -24 -26z" fill="#c0703a" stroke="#7a3f12" stroke-width="2"/>
    <path d="M88 128 q-4 8 0 16 M112 128 q4 8 0 16" stroke="#3e2723" stroke-width="2.4" fill="none"/><rect x="92" y="150" width="16" height="4" fill="#3e2723"/><line x1="97" y1="96" x2="97" y2="152" stroke="#eee" stroke-width=".8"/><line x1="103" y1="96" x2="103" y2="152" stroke="#eee" stroke-width=".8"/></g>
    <line x1="40" y1="170" x2="150" y2="92" stroke="#8d6e63" stroke-width="2.4" stroke-linecap="round"/>${NOTE(160, 70, 0.9)}${NOTE(40, 80, 0.7)}</svg>`;
  if (m === "teddy") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="#a1887f"><circle cx="70" cy="62" r="15"/><circle cx="130" cy="62" r="15"/><circle cx="100" cy="88" r="36"/><ellipse cx="100" cy="150" rx="40" ry="38"/>
    <circle cx="62" cy="182" r="14"/><circle cx="138" cy="182" r="14"/></g><g fill="#d7ccc8"><circle cx="70" cy="62" r="7"/><circle cx="130" cy="62" r="7"/><ellipse cx="100" cy="100" rx="15" ry="11"/><ellipse cx="100" cy="155" rx="22" ry="24"/></g>
    <circle cx="87" cy="83" r="3.6" fill="#3e2723"/><circle cx="113" cy="83" r="3.6" fill="#3e2723"/><ellipse cx="100" cy="95" rx="6" ry="4.4" fill="#3e2723"/><path d="M93 104 q7 6 14 0" stroke="#3e2723" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M100 140 c-6 -7 -18 -4 -18 5 c0 10 18 18 18 22 c0 -4 18 -12 18 -22 c0 -9 -12 -12 -18 -5z" fill="#e53950"/><ellipse cx="66" cy="140" rx="11" ry="16" fill="#a1887f" transform="rotate(30 66 140)"/><ellipse cx="134" cy="140" rx="11" ry="16" fill="#a1887f" transform="rotate(-30 134 140)"/>
    ${NOTE(160, 50)}${NOTE(36, 44, 0.8)}${NOTE(172, 112, 0.7)}</svg>`;
  if (m === "sonne") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"].map((f, i) => `<path d="M${20 + i * 7} 170 a${80 - i * 7} ${80 - i * 7} 0 0 1 ${160 - i * 14} 0" fill="none" stroke="${f}" stroke-width="7"/>`).join("")}
    <g transform="translate(100 88)">${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-52" width="6" height="16" rx="3" fill="#ffb300" transform="rotate(${i * 30})"/>`).join("")}<circle r="32" fill="#ffd54f"/>
    <circle cx="-11" cy="-6" r="3.6" fill="#5d4037"/><circle cx="11" cy="-6" r="3.6" fill="#5d4037"/><path d="M-13 8 q13 12 26 0" stroke="#5d4037" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-20" cy="5" r="5" fill="#ff8a80" opacity=".6"/><circle cx="20" cy="5" r="5" fill="#ff8a80" opacity=".6"/></g>
    <ellipse cx="40" cy="176" rx="26" ry="12" fill="#fff"/><ellipse cx="160" cy="176" rx="26" ry="12" fill="#fff"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g stroke="#558b2f" stroke-width="4" stroke-linecap="round"><path d="M100 178 L70 92"/><path d="M100 178 L100 80"/><path d="M100 178 L130 92"/><path d="M100 178 L52 116"/><path d="M100 178 L148 116"/></g>
    <ellipse cx="78" cy="132" rx="9" ry="18" fill="#7cb342" transform="rotate(-40 78 132)"/><ellipse cx="122" cy="132" rx="9" ry="18" fill="#7cb342" transform="rotate(40 122 132)"/>
    ${blume(70, 82, "#ec407a")}${blume(100, 66, "#ab47bc", 15)}${blume(130, 82, "#ff7043")}${blume(50, 110, "#42a5f5", 11)}${blume(150, 110, "#ffca28", 11)}
    <path d="M100 160 l-22 -10 l4 18z M100 160 l22 -10 l-4 18z" fill="#e53950"/><circle cx="100" cy="160" r="6" fill="#c62828"/></svg>`;
}
const vornameVon = (pid) => hole("personen", pid)?.vorname || "";
const kopfText = () => GK_KOEPFE[G.kopf].replace("{v}", vornameVon(G.pid));
const innenText = () => (G.text === -1 ? G.eigen.trim() : GK_TEXTE[G.text]) || GK_TEXTE[0];
const absenderText = () => ({ bachkreis: `Dein ${konfig().name || "Bachkreis Bergkamen"}`, ich: `Von ${S.ich?.vorname || ""}`, eigen: G.absenderEigen.trim() || "Dein Bachkreis" })[G.absender];

// Karte als Bild (1080 × 1350, JPEG): Motiv, Überschrift, Text (Zeilen und Größe passt die App an), goldenes Band mit Logo
export async function gkBild() {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const [, , grund] = GK_MOTIVE[G.motiv];
  g.fillStyle = grund; g.fillRect(0, 0, W, H); g.strokeStyle = "#f2b705"; g.lineWidth = 14; g.strokeRect(36, 36, W - 72, H - 72);
  const bild = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const motiv = await bild("data:image/svg+xml;charset=utf-8," + encodeURIComponent(gkMotivSvg(G.motiv)));
  if (motiv) g.drawImage(motiv, 240, 90, 600, 600);
  const umbruch = (text, max, groesse) => { g.font = `700 ${groesse}px system-ui, sans-serif`; const w = String(text).split(/\s+/), z = []; let l = ""; for (const x of w) { const t = l ? l + " " + x : x; if (g.measureText(t).width > max && l) { z.push(l); l = x; } else l = t; } if (l) z.push(l); return z; };
  g.textAlign = "center"; g.fillStyle = "#1a1500";
  let gr = 78, kz = umbruch(kopfText(), W - 180, gr); while (kz.length > 2 && gr > 54) { gr -= 4; kz = umbruch(kopfText(), W - 180, gr); }
  g.font = `800 ${gr}px system-ui, sans-serif`; kz.forEach((z, i) => g.fillText(z, W / 2, 790 + i * gr * 1.15));
  let tg = 50, tz = umbruch(innenText(), W - 220, tg); while (tz.length > 4 && tg > 34) { tg -= 3; tz = umbruch(innenText(), W - 220, tg); }
  g.font = `500 ${tg}px Georgia, serif`; g.fillStyle = "#3a3a3a"; const y0 = 800 + kz.length * gr * 1.15 + 30; tz.forEach((z, i) => g.fillText(z, W / 2, y0 + i * tg * 1.3));
  g.fillStyle = "#1a1500"; g.fillRect(36, H - 200, W - 72, 164); g.fillStyle = "#f2b705"; g.fillRect(36, H - 204, W - 72, 8);
  const logo = await bild("icons/logo.png"); if (logo) g.drawImage(logo, 76, H - 182, 128, 128);
  g.textAlign = "left"; g.fillStyle = "#f2b705"; g.font = "700 46px system-ui, sans-serif"; g.fillText(absenderText(), 232, H - 106);
  g.fillStyle = "#ffffffcc"; g.font = "500 30px system-ui, sans-serif"; g.fillText("💐 Gute Besserung", 232, H - 62);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.88));
}
function fensterHtml() {
  const v = esc(vornameVon(G.pid));
  return `<div class="gk-vorschau" style="background:${GK_MOTIVE[G.motiv][2]}"><div class="gk-motiv">${gkMotivSvg(G.motiv)}</div><b>${esc(kopfText())}</b><p>${esc(innenText())}</p><small>${esc(absenderText())}</small></div>
    <div class="wahlen" role="group" aria-label="Motiv">${Object.entries(GK_MOTIVE).map(([k, [s, t]]) => `<button type="button" class="chip-wahl${G.motiv === k ? " an" : ""}" aria-pressed="${G.motiv === k}" data-a="gkWahl" data-x="motiv:${k}">${s} ${esc(t)}</button>`).join("")}</div>
    <div class="feld"><label for="gkKopf">Überschrift</label><select id="gkKopf" data-c="gkFeld" data-x="kopf">${GK_KOEPFE.map((k, i) => `<option value="${i}"${G.kopf === i ? " selected" : ""}>${esc(k.replace("{v}", vornameVon(G.pid)))}</option>`).join("")}</select></div>
    <div class="feld"><label for="gkText">Text</label><select id="gkText" data-c="gkFeld" data-x="text">${GK_TEXTE.map((t, i) => `<option value="${i}"${G.text === i ? " selected" : ""}>${esc(t)}</option>`).join("")}<option value="-1"${G.text === -1 ? " selected" : ""}>✏️ eigener Text …</option></select>
      ${G.text === -1 ? `<input id="gkEigen" maxlength="120" value="${esc(G.eigen)}" placeholder="Dein Text (bis 120 Zeichen)" data-c="gkFeld" data-x="eigen">` : ""}</div>
    <div class="feld"><label for="gkAbs">Von</label><select id="gkAbs" data-c="gkFeld" data-x="absender"><option value="bachkreis"${G.absender === "bachkreis" ? " selected" : ""}>Dein Bachkreis</option><option value="ich"${G.absender === "ich" ? " selected" : ""}>Von ${esc(S.ich?.vorname || "mir")}</option><option value="eigen"${G.absender === "eigen" ? " selected" : ""}>eigener Absender …</option></select>
      ${G.absender === "eigen" ? `<input id="gkAbsEigen" maxlength="40" value="${esc(G.absenderEigen)}" placeholder="z. B. Deine Celli" data-c="gkFeld" data-x="absenderEigen">` : ""}</div>
    <button type="button" class="knopf haupt breit" data-a="gkSenden">💬 In ${v}s Chat senden</button>
    <p class="hinweis">Auf der Karte steht kein Grund – nur gute Wünsche.${hole("personen", G.pid)?.typ === "schueler" ? " Bei Kindern lesen die Eltern mit." : ""}</p>`;
}
const neuZeichnen = () => { const b = document.querySelector("#blattHg .gk-vorschau")?.parentElement; if (b) b.innerHTML = fensterHtml(); };
AKTIONEN.gkOeffnen = (pid) => {
  if (!darfChatten(pid)) return toast("🔒 Dieser Person kannst du im Bachkreis nicht privat schreiben (Kinderschutz).", 4000);
  Object.assign(G, { pid, motiv: "strauss", kopf: 0, text: 0, eigen: "", absender: "bachkreis", absenderEigen: "" });
  blatt("💐 Gute-Besserung-Karte", `<div>${fensterHtml()}</div>`);
};
AKTIONEN.gkWahl = (x) => { const [k, v] = String(x).split(":"); G[k] = v; neuZeichnen(); };
AKTIONEN.gkFeld = (v, el) => {
  const k = el.dataset.x;
  if (k === "kopf" || k === "text") { G[k] = Number(v); neuZeichnen(); return; }
  G[k] = String(v); if (k === "absender") return neuZeichnen();
  const vs = document.querySelector("#blattHg .gk-vorschau"); if (vs) { vs.querySelector("p").textContent = innenText(); vs.querySelector("small").textContent = absenderText(); }
};
AKTIONEN.gkSenden = async () => {
  if (G.text === -1 && !G.eigen.trim()) return toast("Bitte einen eigenen Text schreiben oder einen Vorschlag wählen");
  const knopf = document.querySelector('#blattHg [data-a="gkSenden"]'); if (knopf) { knopf.disabled = true; knopf.textContent = "⏳ Karte wird gemalt …"; }
  try {
    const blob = await gkBild(), datei = new File([blob], "Gute-Besserung.jpg", { type: "image/jpeg" });
    const a = await hochladen(datei, { name: datei.name, art: "bild" }), u = await einzelchatMit(G.pid);
    await nachrichtDirekt(u.id, `💐 ${kopfText()}`, { anlagen: [{ id: a.id, name: a.name, mime: a.mime, groesse: a.groesse, art: "bild" }] });
    blattZu(); toast("💐 Karte ist im Chat"); zeige("unterhaltung", { id: u.id });
  } catch (e) { toast("⚠️ " + (e.message || "Senden ging nicht"), 4000); if (knopf) { knopf.disabled = false; knopf.textContent = "💬 Nochmal versuchen"; } }
};
