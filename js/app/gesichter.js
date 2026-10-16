// 🙂 Gesichter für alle im Bachkreis – gezeichnet (SVG), keine Fotos: datensparsam und ohne Foto-Erlaubnis nutzbar.
// Ohne eigene Wahl entsteht das Gesicht immer gleich aus der Personen-ID; unter „🙂 Mein Gesicht“ gestaltet man es selbst
// (personen.avatar – nur Zahlen je Merkmal). Dieselben Gesichter tragen auch die Figuren in der Instrumentenkunde.
import { hole } from "../kern/daten.js";

export const HAUT = ["#f9dcc4", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a1e"];
export const HAARFARBE = ["#2b1b0e", "#4a2c17", "#7a4a24", "#b5651d", "#d9a441", "#f0d58c", "#9a9a9a", "#c0392b", "#6c3483"];
export const FRISUREN = ["Kurz", "Lang", "Zopf", "Locken", "Bob", "Dutt", "Igel", "Sehr kurz", "Zöpfe"];
export const AUGEN = ["Punkte", "Fröhlich", "Groß"];
export const MUND = ["Lächeln", "Lachen", "Freundlich"];
export const FARBEN = ["#f6d365", "#a1c4fd", "#c2e9fb", "#fbc2eb", "#d4fc79", "#fcb69f", "#e0c3fc", "#ffd1a9"];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// Merkmale: eigene Wahl (avatar) oder aus der ID abgeleitet
export function merkmale(pOderId) {
  const p = typeof pOderId === "object" && pOderId ? pOderId : hole("personen", pOderId);
  const h = hash(p?.id || pOderId || "?"), w = (n, s) => (Math.floor(h / s) % n);
  const auto = { haut: w(HAUT.length, 1), frisur: w(FRISUREN.length, 7), haar: w(6, 61), augen: w(AUGEN.length, 401), mund: w(MUND.length, 2003), brille: w(7, 9001) === 0 ? 1 : 0, farbe: w(FARBEN.length, 30011) };
  return { ...auto, ...(p?.avatar || {}) };
}

// Kopf (viewBox 0 0 64 64); rund = Kreis-Hintergrund und Schultern (für Listen und Sitzplan)
export function gesichtSvg(m, { rund = true, titel = "" } = {}) {
  const haut = HAUT[m.haut % HAUT.length], haar = HAARFARBE[m.haar % HAARFARBE.length], f = m.frisur % FRISUREN.length;
  const hinten = f === 1 ? `<path d="M13 30 Q12 54 18 60 L46 60 Q52 54 51 30 Z" fill="${haar}"/>` : f === 4 ? `<path d="M13 30 Q13 47 18 48 L46 48 Q51 47 51 30 Z" fill="${haar}"/>`
    : f === 8 ? `<circle cx="11" cy="42" r="6" fill="${haar}"/><circle cx="53" cy="42" r="6" fill="${haar}"/>` : "";
  const vorn = [
    `<path d="M14 31 Q13 13 32 12 Q51 13 50 31 Q46 21 32 20 Q19 21 14 31 Z" fill="${haar}"/>`,
    `<path d="M13 32 Q12 11 32 11 Q52 11 51 32 Q47 19 33 19 Q24 22 13 32 Z" fill="${haar}"/>`,
    `<path d="M14 31 Q13 13 32 12 Q51 13 50 31 Q46 21 32 20 Q19 21 14 31 Z" fill="${haar}"/><path d="M50 22 Q60 26 57 40 Q55 30 49 28 Z" fill="${haar}"/>`,
    `${[[16, 22], [22, 15], [30, 12], [38, 13], [45, 17], [49, 24], [14, 29], [50, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.2" fill="${haar}"/>`).join("")}`,
    `<path d="M13 34 Q12 11 32 11 Q52 11 51 34 L49 34 Q48 24 46 24 L18 24 Q16 24 15 34 Z" fill="${haar}"/>`,
    `<circle cx="32" cy="9" r="6.5" fill="${haar}"/><path d="M14 31 Q13 13 32 13 Q51 13 50 31 Q46 22 32 21 Q19 22 14 31 Z" fill="${haar}"/>`,
    `<path d="M15 28 L18 17 L22 22 L26 12 L30 19 L34 11 L38 19 L42 13 L45 21 L49 18 L50 29 Q44 22 32 21 Q20 22 15 28 Z" fill="${haar}"/>`,
    `<path d="M16 26 Q18 15 32 15 Q46 15 48 26 Q42 20 32 20 Q22 20 16 26 Z" fill="${haar}" opacity=".85"/>`,
    `<path d="M14 31 Q13 13 32 12 Q51 13 50 31 Q46 21 32 20 Q19 21 14 31 Z" fill="${haar}"/><path d="M32 12 L32 21" stroke="${haar}" stroke-width="1.5"/>`,
  ][f];
  const a = m.augen % AUGEN.length;
  const augen = a === 1 ? `<path d="M22 36 Q25 32.5 28 36 M36 36 Q39 32.5 42 36" stroke="#2b1b0e" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : a === 2 ? `<circle cx="25" cy="35" r="3.6" fill="#fff"/><circle cx="39" cy="35" r="3.6" fill="#fff"/><circle cx="25.6" cy="35.4" r="2.1" fill="#2b1b0e"/><circle cx="39.6" cy="35.4" r="2.1" fill="#2b1b0e"/><circle cx="26.3" cy="34.6" r=".7" fill="#fff"/><circle cx="40.3" cy="34.6" r=".7" fill="#fff"/>`
    : `<circle cx="25" cy="35" r="2.2" fill="#2b1b0e"/><circle cx="39" cy="35" r="2.2" fill="#2b1b0e"/>`;
  const brauen = `<path d="M21.5 30.5 Q25 29 28.5 30.5 M35.5 30.5 Q39 29 42.5 30.5" stroke="${haar}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>`;
  const mu = m.mund % MUND.length;
  const mund = mu === 1 ? `<path d="M25 43 Q32 51 39 43 Z" fill="#7a2e2e"/><path d="M27 46 Q32 49 37 46" fill="#e67e7e"/>` : mu === 2 ? `<path d="M27 44.5 Q32 47 37 44.5" stroke="#7a2e2e" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<path d="M25 43 Q32 49 39 43" stroke="#7a2e2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const brille = m.brille ? `<g stroke="#333" stroke-width="1.4" fill="rgba(255,255,255,.25)"><circle cx="25" cy="35" r="5.4"/><circle cx="39" cy="35" r="5.4"/><path d="M30.4 35 L33.6 35" fill="none"/></g>` : "";
  const kopf = `${hinten}<circle cx="13.5" cy="36" r="3.2" fill="${haut}"/><circle cx="50.5" cy="36" r="3.2" fill="${haut}"/><ellipse cx="32" cy="35" rx="18" ry="19" fill="${haut}"/>
    <circle cx="21" cy="41" r="3" fill="#ff7b7b" opacity=".28"/><circle cx="43" cy="41" r="3" fill="#ff7b7b" opacity=".28"/>${vorn}${brauen}${augen}<path d="M31 39 Q32 40.5 33 39" stroke="rgba(0,0,0,.25)" stroke-width="1.2" fill="none"/>${mund}${brille}`;
  if (!rund) return kopf;
  return `<svg viewBox="0 0 64 64" class="gesicht" ${titel ? `role="img" aria-label="${String(titel).replace(/"/g, "&quot;")}"` : 'aria-hidden="true"'}><defs><clipPath id="gk"><circle cx="32" cy="32" r="32"/></clipPath></defs>
    <g clip-path="url(#gk)"><rect width="64" height="64" fill="${FARBEN[m.farbe % FARBEN.length]}"/><path d="M8 66 Q10 52 32 51 Q54 52 56 66 Z" fill="rgba(0,0,0,.18)"/><g transform="translate(0 2)">${kopf}</g></g></svg>`;
}
export const gesicht = (pOderId, titel = "") => gesichtSvg(merkmale(pOderId), { titel });
