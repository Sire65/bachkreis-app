// Darstellung wie in der KC Club App (KC-CLUB-DESIGN, -MODUS-REIHUM, -THEMEN, -THEMEN-SCHRIFT, -SCHRIFT-ZOOM, -SPARMODUS, -CHAT-FARBEN):
// fertige Farbdesigns mit Tag- und Nacht-Variante, Tag/Nacht automatisch nach dem Sonnenstand in Bergkamen (oder immer Tag/Nacht),
// Themen (Paket aus Farbe + Jahreszeit + Sende-Effekt + Schrift, auf Wunsch nach Kalender), Schrift-Zoom für Lesetexte (70–200 %,
// auch mit zwei Fingern), Sparmodus und Chat-Farben. Alles gilt nur für dieses Gerät. Status- und Warnfarben bleiben in jedem Design gleich.
import { einst } from "./zustand.js";
import { toast } from "../kern/ui.js";

const LS = (k, std) => { try { const v = localStorage.getItem(k); return v === null ? std : v; } catch { return std; } };
const LSsetzen = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
const melde = (t) => toast(t, 3000);

// ---------- Farbdesigns (Registry: neues Design = neuer Eintrag) ----------
// Bachkreis = Schwarz/Gold aus dem Logo (Standard) und Blau/Gold. Die übrigen stammen aus der KC Club App.
export const DESIGNS = [
  { id: "bachkreis", name: "Bachkreis Schwarz-Gold", deko: ["#f2b705", "#1f4f8f"], htext: { tag: "#ffd23f", nacht: "#1a1500" }, kopfMarke: "#ffd23f",
    tag: { rot: "#1a1500", rot2: "#3b3110", rot3: "#8a6400", gold: "#f2b705", hero1: "#0d0c08", hero4: "#8a6400", bg: "#f6f3ea", karte: "#ffffff", karte2: "#efe9da", linie: "#e3dccb", text: "#1d1a14", grau: "#6b6455" },
    nacht: { rot: "#f2b705", rot2: "#3b3110", rot3: "#8a6400", gold: "#f2b705", hero1: "#0d0c08", hero4: "#8a6400", bg: "#15140f", karte: "#23211a", karte2: "#2d2a21", linie: "#3d392d", text: "#f3efe3", grau: "#b8b09a" } },
  { id: "bachkreis-blau", name: "Bachkreis Blau-Gold", deko: ["#f2b705", "#2c6cbf"], kopfMarke: "#ffd23f",
    tag: { rot: "#1f4f8f", rot2: "#2c6cbf", rot3: "#5b8fd6", gold: "#f2b705", hero1: "#0b1f3d", hero4: "#c99a12", bg: "#f1f4f9", karte: "#ffffff", karte2: "#e3eaf4", linie: "#d2dceb", text: "#141c28", grau: "#4f5b6b" },
    nacht: { rot: "#2c6cbf", rot2: "#2c6cbf", rot3: "#6fa3e8", gold: "#f2b705", hero1: "#071427", hero4: "#8a6a0c", bg: "#0e131b", karte: "#182231", karte2: "#202d40", linie: "#2f3f57", text: "#e7eef8", grau: "#a5b3c6" } },
  { id: "klassik", name: "Weinrot (KC Klassik)",
    tag: { rot: "#741521", rot2: "#9b2536", rot3: "#c0485a", gold: "#c9a46a", hero1: "#4d0c16", hero4: "#b5705a", bg: "#f5eee3", karte: "#ffffff", karte2: "#efe5d6", linie: "#e4d7c4", text: "#2b1a1c", grau: "#6b5c57" },
    nacht: { rot: "#741521", rot2: "#9b2536", rot3: "#c0485a", gold: "#c9a46a", hero1: "#4d0c16", hero4: "#b5705a", bg: "#1b1415", karte: "#2a2021", karte2: "#33282a", linie: "#45393a", text: "#f4e9e4", grau: "#b9a8a3" } },
  { id: "kuechengruen", name: "Waldgrün",
    tag: { rot: "#2f5d3a", rot2: "#3f7a4c", rot3: "#5c9a68", gold: "#c9a46a", hero1: "#1b3522", hero4: "#8a9a5b", bg: "#eef2ea", karte: "#ffffff", karte2: "#e2eadb", linie: "#d3dfcb", text: "#1d2a1f", grau: "#4c594c" },
    nacht: { rot: "#2f6b40", rot2: "#3f7a4c", rot3: "#5c9a68", gold: "#c9a46a", hero1: "#12261a", hero4: "#6f7f45", bg: "#121a14", karte: "#1d2820", karte2: "#25322a", linie: "#34443a", text: "#e8f0e8", grau: "#a9b8aa" } },
  { id: "nordsee", name: "Nordsee",
    tag: { rot: "#1d4e7a", rot2: "#2a6a9e", rot3: "#4f8fc0", gold: "#e0b85c", hero1: "#0f2c47", hero4: "#5a9bb8", bg: "#edf2f7", karte: "#ffffff", karte2: "#dfe8f1", linie: "#cfdbe7", text: "#16222e", grau: "#4b5a68" },
    nacht: { rot: "#245d91", rot2: "#2a6a9e", rot3: "#4f8fc0", gold: "#e0b85c", hero1: "#0b2238", hero4: "#3f7f9c", bg: "#0f161d", karte: "#1a242e", karte2: "#223040", linie: "#2f3f50", text: "#e6eef6", grau: "#a3b3c3" } },
  { id: "schiefer", name: "Schiefer",
    tag: { rot: "#37424d", rot2: "#4b5866", rot3: "#6d7b89", gold: "#c9a46a", hero1: "#1f262d", hero4: "#7d8a96", bg: "#f0f1f2", karte: "#ffffff", karte2: "#e3e6e9", linie: "#d4d8dc", text: "#1c2126", grau: "#4f575f" },
    nacht: { rot: "#56626f", rot2: "#4b5866", rot3: "#6d7b89", gold: "#c9a46a", hero1: "#1a2026", hero4: "#5e6a75", bg: "#141719", karte: "#1f2327", karte2: "#292e33", linie: "#3a4046", text: "#eceff1", grau: "#a8b0b7" } },
  // Farben aus dem Reiseassistenten (V11.4.0): Navy #082F49, Türkis #0E7490, Aqua #14B8A6, Gold #F4B860, Kopf-Verlauf #07415E → #0B7F93 → #22B8A6
  { id: "lagune", name: "Lagune", deko: ["#14B8A6", "#F4B860"], // Kachel-Ecke oben rechts: Aqua → Gold wie im Reiseassistenten
    tag: { rot: "#0E7490", rot2: "#0B7F93", rot3: "#14B8A6", gold: "#F4B860", hero1: "#07415E", hero4: "#22B8A6", bg: "#EEF7FB", karte: "#ffffff", karte2: "#e1eff6", linie: "#cfe3ec", text: "#102330", grau: "#4e606c" },
    nacht: { rot: "#0E7490", rot2: "#0B7F93", rot3: "#2dd4bf", gold: "#F4B860", hero1: "#082F49", hero4: "#14B8A6", bg: "#06141c", karte: "#0f2430", karte2: "#16303d", linie: "#23414f", text: "#e6f3f8", grau: "#9fb6c2" } },
  // KC-CLUB-DESIGN-DISKO/REGENBOGEN (0.75.0, Wunsch Hansi): optionales „verlauf“ je Tag/Nacht ersetzt den Kopf-Verlauf,
  // „heroSchrift“ gibt der weißen Schrift oben einen Schatten (lesbar auf hellen Verlaufsstellen)
  { id: "disko", name: "Disko", deko: ["#00e5ff", "#ff2bd6"], schwarzlicht: true,
    verlauf: { tag: "linear-gradient(135deg, #1a0033 0%, #5b1a9e 35%, #b0127d 70%, #00a8c6 100%)", nacht: "linear-gradient(135deg, #0a0014 0%, #3d0f73 35%, #a0106f 70%, #0090aa 100%)" },
    tag: { rot: "#b0127d", rot2: "#7b1fa2", rot3: "#d6249f", gold: "#00bcd4", hero1: "#1a0033", hero4: "#00a8c6", bg: "#f6f0fb", karte: "#ffffff", karte2: "#ece1f6", linie: "#dccbee", text: "#1f1030", grau: "#6c5b7b" },
    nacht: { rot: "#c2168a", rot2: "#8e24aa", rot3: "#ff2bd6", gold: "#00e5ff", hero1: "#0a0014", hero4: "#0090aa", bg: "#0c0714", karte: "#1a1026", karte2: "#241634", linie: "#3a2552", text: "#f3e9ff", grau: "#b8a6cc" } },
  { id: "regenbogen", name: "Regenbogen", deko: ["#f9a825", "#1e88e5"], heroSchrift: true,
    verlauf: { tag: "linear-gradient(120deg, #c62828 0%, #ef6c00 18%, #f9a825 34%, #2e7d32 52%, #1565c0 72%, #6a1b9a 100%)", nacht: "linear-gradient(120deg, #8e1c1c 0%, #b45309 18%, #a16207 34%, #1f5f28 52%, #0f4c8a 72%, #4a126b 100%)" },
    tag: { rot: "#6a1b9a", rot2: "#1565c0", rot3: "#2e7d32", gold: "#f9a825", hero1: "#c62828", hero4: "#6a1b9a", bg: "#fbf8ff", karte: "#ffffff", karte2: "#efe9f7", linie: "#e0d6ee", text: "#1d1626", grau: "#6b6178" },
    nacht: { rot: "#7b2cbf", rot2: "#1565c0", rot3: "#43a047", gold: "#fbc02d", hero1: "#8e1c1c", hero4: "#4a126b", bg: "#12101a", karte: "#1d1a27", karte2: "#272335", linie: "#3a3450", text: "#f1ecf8", grau: "#b3aac4" } },
  { id: "kontrast", name: "Großer Kontrast",
    tag: { rot: "#000000", rot2: "#1a1a1a", rot3: "#333333", gold: "#ffd400", hero1: "#000000", hero4: "#2a2a2a", bg: "#ffffff", karte: "#ffffff", karte2: "#eeeeee", linie: "#555555", text: "#000000", grau: "#333333" },
    nacht: { rot: "#0044aa", rot2: "#0055cc", rot3: "#3377dd", gold: "#ffd400", hero1: "#000000", hero4: "#003380", bg: "#000000", karte: "#111111", karte2: "#1e1e1e", linie: "#888888", text: "#ffffff", grau: "#e0e0e0" } },
  // KC-CLUB-DESIGN-MEHR (1.76.0, Wunsch Hansi): weitere Farbschemen – stehen in einer eigenen Klappzone, damit es übersichtlich bleibt
  { id: "toskana", name: "Toskana", mehr: true,
    tag: { rot: "#a4532f", rot2: "#bf6a40", rot3: "#d98a5f", gold: "#d8b26e", hero1: "#5a2614", hero4: "#c98a55", bg: "#f8f1ea", karte: "#ffffff", karte2: "#f0e2d4", linie: "#e6d3c0", text: "#2c1a12", grau: "#6e5a4e" },
    nacht: { rot: "#a4532f", rot2: "#bf6a40", rot3: "#e09a6f", gold: "#d8b26e", hero1: "#3a180c", hero4: "#9c6a42", bg: "#1a1310", karte: "#271d18", karte2: "#312520", linie: "#47372f", text: "#f5ebe4", grau: "#bba79b" } },
  { id: "weinberg", name: "Weinberg", mehr: true,
    tag: { rot: "#5e1f3d", rot2: "#7a2c52", rot3: "#9e4a74", gold: "#c9a46a", hero1: "#350f22", hero4: "#8f5a78", bg: "#f6f0f3", karte: "#ffffff", karte2: "#ece0e6", linie: "#e0cfd8", text: "#25131c", grau: "#6a5761" },
    nacht: { rot: "#7a2c52", rot2: "#8e3862", rot3: "#c06a95", gold: "#d4b07a", hero1: "#22091a", hero4: "#6e3f58", bg: "#170f13", karte: "#241820", karte2: "#2e2029", linie: "#45323d", text: "#f4e8ee", grau: "#bba6b1" } },
  { id: "salbei", name: "Salbei", mehr: true,
    tag: { rot: "#4f6b55", rot2: "#62826a", rot3: "#86a38d", gold: "#c9a46a", hero1: "#2b3d2f", hero4: "#9bb08f", bg: "#f2f4ef", karte: "#ffffff", karte2: "#e4e9e0", linie: "#d5ddd0", text: "#1e2620", grau: "#56605a" },
    nacht: { rot: "#4f6b55", rot2: "#62826a", rot3: "#8fb096", gold: "#c9a46a", hero1: "#1a251c", hero4: "#5f7556", bg: "#121613", karte: "#1c221d", karte2: "#252d26", linie: "#364036", text: "#e9efe9", grau: "#a9b5ab" } },
  { id: "lavendel", name: "Lavendel", mehr: true,
    tag: { rot: "#5d4e8c", rot2: "#7262a6", rot3: "#9686c4", gold: "#d9b46a", hero1: "#2f2650", hero4: "#9a8cc0", bg: "#f4f2f9", karte: "#ffffff", karte2: "#e7e3f2", linie: "#d9d3ea", text: "#1f1a2e", grau: "#5f5874" },
    nacht: { rot: "#5d4e8c", rot2: "#7262a6", rot3: "#a596d4", gold: "#d9b46a", hero1: "#1c1633", hero4: "#5d5088", bg: "#13111a", karte: "#1e1b28", karte2: "#282433", linie: "#3b354b", text: "#eeeaf7", grau: "#b0a9c4" } },
  { id: "ocker", name: "Ocker", mehr: true,
    tag: { rot: "#7f5300", rot2: "#a56d0a", rot3: "#c8902e", gold: "#e2b84f", hero1: "#4a3000", hero4: "#c9a25a", bg: "#fbf6ea", karte: "#ffffff", karte2: "#f2e8d0", linie: "#e8dcbc", text: "#2a1f0a", grau: "#6b5e45" },
    nacht: { rot: "#7f5300", rot2: "#a56d0a", rot3: "#d9a040", gold: "#e2b84f", hero1: "#2e1e00", hero4: "#8a6a2c", bg: "#18140b", karte: "#241e12", karte2: "#2e2718", linie: "#463b25", text: "#f6efde", grau: "#bfb296" } },
  { id: "schokolade", name: "Schokolade", mehr: true,
    tag: { rot: "#5b3a29", rot2: "#74503b", rot3: "#957059", gold: "#d1a970", hero1: "#2e1c12", hero4: "#9c7a5e", bg: "#f6f1ec", karte: "#ffffff", karte2: "#ebe1d8", linie: "#ddcfc3", text: "#24170f", grau: "#66574d" },
    nacht: { rot: "#6e4935", rot2: "#74503b", rot3: "#a8826a", gold: "#d1a970", hero1: "#1c110b", hero4: "#6b5040", bg: "#15100d", karte: "#211915", karte2: "#2b211c", linie: "#40332b", text: "#f3eae4", grau: "#b8a99f" } },
  { id: "petrol", name: "Petrol", mehr: true,
    tag: { rot: "#0f5c5c", rot2: "#167373", rot3: "#3a9696", gold: "#e0b85c", hero1: "#073333", hero4: "#4fa3a0", bg: "#eef5f5", karte: "#ffffff", karte2: "#dfeced", linie: "#cfe0e0", text: "#122424", grau: "#4c5f5f" },
    nacht: { rot: "#0f5c5c", rot2: "#167373", rot3: "#46aaaa", gold: "#e0b85c", hero1: "#042222", hero4: "#2f7a78", bg: "#0d1515", karte: "#162222", karte2: "#1e2c2c", linie: "#2e4242", text: "#e5f1f1", grau: "#a0b5b5" } },
  { id: "rose", name: "Rosé", mehr: true,
    tag: { rot: "#a3435f", rot2: "#b85a76", rot3: "#d08098", gold: "#d9b06e", hero1: "#5c1f33", hero4: "#d79aa9", bg: "#fbf3f5", karte: "#ffffff", karte2: "#f3e3e8", linie: "#ead3da", text: "#2b161d", grau: "#6d5860" },
    nacht: { rot: "#a3435f", rot2: "#b85a76", rot3: "#e08ca4", gold: "#d9b06e", hero1: "#3a1220", hero4: "#8a4d5f", bg: "#1a1114", karte: "#271a1f", karte2: "#312228", linie: "#4a343c", text: "#f7eaee", grau: "#c2a9b1" } },
  // KC-CLUB-DESIGN-BUNT (1.78.0, Wunsch Hansi „etwas ausgefallenere“): mit Farbverlauf oben wie Disko/Regenbogen – eigene Klappzone
  { id: "sonnenuntergang", name: "Sonnenuntergang", mehr: true, bunt: true, deko: ["#e0533d", "#f6a33b"], heroSchrift: true,
    verlauf: { tag: "linear-gradient(135deg, #3b0a45 0%, #8e1e5c 35%, #e0533d 70%, #f6a33b 100%)", nacht: "linear-gradient(135deg, #1e0526 0%, #5e1240 35%, #a83a2a 70%, #b8721f 100%)" },
    tag: { rot: "#a8324a", rot2: "#c2463a", rot3: "#e0703d", gold: "#f6a33b", hero1: "#3b0a45", hero4: "#f6a33b", bg: "#fdf4ee", karte: "#ffffff", karte2: "#f7e4d9", linie: "#efd2c2", text: "#2a1218", grau: "#6e5157" },
    nacht: { rot: "#a8324a", rot2: "#c2463a", rot3: "#f08a55", gold: "#f6a33b", hero1: "#1e0526", hero4: "#b8641f", bg: "#170c10", karte: "#24141a", karte2: "#2e1b22", linie: "#47303a", text: "#f8ebe6", grau: "#c0a6ad" } },
  { id: "polarlicht", name: "Polarlicht", mehr: true, bunt: true, deko: ["#7be0a6", "#5b8def"],
    verlauf: { tag: "linear-gradient(135deg, #0b1d3a 0%, #134e5e 35%, #1fa37a 65%, #7be0a6 100%)", nacht: "linear-gradient(135deg, #050f20 0%, #0c3440 35%, #147a5c 65%, #3fae78 100%)" },
    tag: { rot: "#13715c", rot2: "#1a8a6f", rot3: "#2fb38c", gold: "#e6c35c", hero1: "#0b1d3a", hero4: "#1fa37a", bg: "#eef7f4", karte: "#ffffff", karte2: "#dcefe8", linie: "#c9e3da", text: "#0f2420", grau: "#4a605a" },
    nacht: { rot: "#13715c", rot2: "#1a8a6f", rot3: "#3fd0a0", gold: "#e6c35c", hero1: "#050f20", hero4: "#147a5c", bg: "#0a1416", karte: "#122224", karte2: "#1a2e30", linie: "#2a4446", text: "#e4f5ef", grau: "#9db9b1" } },
  { id: "kirschbluete", name: "Kirschblüte", mehr: true, bunt: true, deko: ["#f2a7c3", "#d9a86c"], heroSchrift: true,
    verlauf: { tag: "linear-gradient(135deg, #7a2848 0%, #c45a86 45%, #f2a7c3 100%)", nacht: "linear-gradient(135deg, #3d1024 0%, #7e2f55 45%, #b8648a 100%)" },
    tag: { rot: "#a8436e", rot2: "#c2588a", rot3: "#e08aae", gold: "#d9a86c", hero1: "#7a2848", hero4: "#f2a7c3", bg: "#fdf5f8", karte: "#ffffff", karte2: "#f7e3ec", linie: "#efd0de", text: "#2b1420", grau: "#6d5360" },
    nacht: { rot: "#a8436e", rot2: "#c2588a", rot3: "#f0a0c0", gold: "#d9a86c", hero1: "#3d1024", hero4: "#9c4a70", bg: "#190f14", karte: "#26161e", karte2: "#301d27", linie: "#4a3140", text: "#f9eaf1", grau: "#c4a8b6" } },
  { id: "tiefsee", name: "Tiefsee", mehr: true, bunt: true, deko: ["#22a6c9", "#4fd1e0"],
    verlauf: { tag: "linear-gradient(135deg, #020b1f 0%, #0a2a5c 40%, #0d5c8c 75%, #22a6c9 100%)", nacht: "linear-gradient(135deg, #010612 0%, #071c40 40%, #0a4466 75%, #127a96 100%)" },
    tag: { rot: "#0d4f8c", rot2: "#1565a6", rot3: "#2b8fd0", gold: "#4fd1e0", hero1: "#020b1f", hero4: "#22a6c9", bg: "#eef4fa", karte: "#ffffff", karte2: "#dde8f4", linie: "#cbdbec", text: "#0d1b2a", grau: "#4a5a6c" },
    nacht: { rot: "#1360a8", rot2: "#1565a6", rot3: "#3aa5e0", gold: "#4fd1e0", hero1: "#010612", hero4: "#0f6e8f", bg: "#070d18", karte: "#0f1a2a", karte2: "#162436", linie: "#253a52", text: "#e4eef8", grau: "#9fb2c6" } },
  { id: "glut", name: "Glut", mehr: true, bunt: true, deko: ["#f28c28", "#f2b632"],
    verlauf: { tag: "linear-gradient(135deg, #1a0a05 0%, #6b1508 35%, #c8361a 70%, #f28c28 100%)", nacht: "linear-gradient(135deg, #0d0503 0%, #4a0e05 35%, #8f2612 70%, #b0601c 100%)" },
    tag: { rot: "#b8321a", rot2: "#d0461f", rot3: "#e9762f", gold: "#f2b632", hero1: "#1a0a05", hero4: "#f28c28", bg: "#fbf3ee", karte: "#ffffff", karte2: "#f5e1d6", linie: "#eccebe", text: "#2a120a", grau: "#6e5248" },
    nacht: { rot: "#b8321a", rot2: "#d0461f", rot3: "#ff8a3d", gold: "#f2b632", hero1: "#0d0503", hero4: "#a8401a", bg: "#140b08", karte: "#21130e", karte2: "#2b1a13", linie: "#45291f", text: "#f9ece5", grau: "#c1a79c" } },
  { id: "retro", name: "Retro 70er", mehr: true, bunt: true, deko: ["#d98a2b", "#6b8e23"], heroSchrift: true,
    verlauf: { tag: "linear-gradient(120deg, #5a3a1a 0%, #a0522d 30%, #d98a2b 55%, #c8a838 75%, #6b8e23 100%)", nacht: "linear-gradient(120deg, #2e1d0c 0%, #6b3720 30%, #9a6020 55%, #8a7426 75%, #4f6a19 100%)" },
    tag: { rot: "#8a4b1f", rot2: "#a0522d", rot3: "#c47a2c", gold: "#d9a92b", hero1: "#5a3a1a", hero4: "#6b8e23", bg: "#fbf5e8", karte: "#fffdf7", karte2: "#f2e6cc", linie: "#e6d6b2", text: "#2a1d0e", grau: "#6b5a40" },
    nacht: { rot: "#9a5524", rot2: "#a0522d", rot3: "#d98a2b", gold: "#d9a92b", hero1: "#2e1d0c", hero4: "#4f6a19", bg: "#16110a", karte: "#231b11", karte2: "#2d2417", linie: "#463924", text: "#f6eedc", grau: "#bdb095" } },
];
const MODI = { auto: ["A", "Automatik"], tag: ["T", "Immer Tag"], nacht: ["N", "Immer Nacht"] };
const altModus = () => { const t = einst().thema; return t === "hell" ? "tag" : t === "dunkel" ? "nacht" : "auto"; };
export let DS = (() => { try { const x = JSON.parse(localStorage.getItem("bk_design") || "null"); if (x) return { design: x.design || "bachkreis", modus: x.modus || "auto" }; } catch {} return { design: "bachkreis", modus: altModus() }; })();

// Sonnenauf- und -untergang für Bergkamen (51,62° N · 7,64° O), NOAA-Näherung (aus der KC Club App)
export function sonne(d = new Date()) {
  const rad = Math.PI / 180, lat = 51.62 * rad, lon = 7.64;
  const n = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (n - 1);
  const zgl = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dekl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat) * Math.cos(dekl)) - Math.tan(lat) * Math.tan(dekl)) / rad;
  const mitte = 720 - 4 * lon - zgl, t0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { auf: new Date(t0 + (mitte - 4 * ha) * 6e4), unter: new Date(t0 + (mitte + 4 * ha) * 6e4) };
}
let LICHT_NACHT = null, lichtSensor = null;
export function istNacht() {
  if (DS.modus === "nacht") return true;
  if (DS.modus === "tag") return false;
  if (LICHT_NACHT !== null) return LICHT_NACHT;
  const j = new Date(), s = sonne(j); return j < s.auf || j > s.unter;
}
// Lichtsensor: nur wenn der Browser ihn anbietet – mit Abstand zwischen Ein/Aus, damit nichts flackert
function lichtSensorStarten() {
  if (lichtSensor || DS.modus !== "auto" || !("AmbientLightSensor" in window)) return;
  try {
    lichtSensor = new window.AmbientLightSensor({ frequency: 0.2 });
    lichtSensor.addEventListener("reading", () => { const lx = lichtSensor.illuminance, v = LICHT_NACHT; LICHT_NACHT = v === null ? lx < 15 : v ? !(lx > 50) : lx < 10; if (v !== LICHT_NACHT) anwendenDesign(); });
    lichtSensor.addEventListener("error", () => { LICHT_NACHT = null; lichtSensor = null; });
    lichtSensor.start();
  } catch { lichtSensor = null; }
}

// ---------- Themen (Paket aus Farbdesign + Jahreszeit + Sende-Effekt + Schrift) – aus der KC Club App ----------
export const THEMEN = [
  { id: "bachkreis", sym: "🎻", name: "Bachkreis klassisch", design: "bachkreis", jz: "auto", effekt: "wechsel" },
  { id: "karneval", sym: "🎭", name: "Karneval", design: "retro", jz: "karneval", effekt: "flieger", schrift: "comic" },
  { id: "fruehling", sym: "🌱", name: "Frühling", design: "kirschbluete", jz: "fruehling", effekt: "taube", schrift: "zart" },
  { id: "ostern", sym: "🐣", name: "Ostern", design: "salbei", jz: "fruehling", effekt: "taube", schrift: "zart", extra: "ostern" },
  { id: "sommer", sym: "🌻", name: "Sommer", design: "toskana", jz: "sommer", effekt: "flieger", schrift: "schwung" },
  { id: "karibik", sym: "🌴", name: "Karibik", design: "lagune", jz: "karibik", effekt: "taube", schrift: "strand" },
  { id: "oktoberfest", sym: "🥨", name: "Oktoberfest", design: "nordsee", jz: "wiesn", effekt: "postauto", schrift: "fraktur" },
  { id: "herbst", sym: "🍂", name: "Herbst", design: "ocker", jz: "herbst", effekt: "flieger" },
  { id: "indian", sym: "🍁", name: "Indian Summer", design: "glut", jz: "herbst", effekt: "taube", laub: ["#d7261e", "#ff6a13", "#ffb300", "#b5121b", "#ff8f1f", "#e8c21a", "#8e1b10", "#f04e23"] },
  { id: "halloween", sym: "🎃", name: "Halloween", design: "sonnenuntergang", jz: "halloween", effekt: "taube", schrift: "grusel" },
  { id: "kirmes", sym: "🎡", name: "Kirmes", design: "regenbogen", jz: "kirmes", effekt: "flieger", schrift: "kirmes" },
  { id: "winter", sym: "⛄", name: "Winter", design: "nordsee", jz: "winter", effekt: "postauto" },
  { id: "weihnachten", sym: "🎄", name: "Weihnachten", design: "weinberg", jz: "advent", effekt: "taube", schrift: "weihnacht" },
  { id: "silvester", sym: "🎆", name: "Silvester", design: "disko", jz: "silvester", effekt: "flieger", schrift: "schwung" },
];
// Freie Schriften im Ordner schriften/ (Lizenzen dort) – nur für die Begrüßung im Kopf, geladen erst bei Bedarf
export const THEMA_SCHRIFTEN = {
  weihnacht: { familie: "BK Weihnacht", datei: "mountains-of-christmas.woff2", gewicht: 700, gr: 1.15 },
  grusel: { familie: "BK Grusel", datei: "creepster.woff2", gewicht: 400, gr: 1.1 },
  comic: { familie: "BK Comic", datei: "bangers.woff2", gewicht: 400, gr: 1.12 },
  kirmes: { familie: "BK Kirmes", datei: "rye.woff2", gewicht: 400, gr: 0.95 },
  fraktur: { familie: "BK Fraktur", datei: "unifrakturmaguntia.woff2", gewicht: 400, gr: 1.18 },
  strand: { familie: "BK Strand", datei: "pacifico.woff2", gewicht: 400, gr: 1 },
  schwung: { familie: "BK Schwung", datei: "lobster.woff2", gewicht: 400, gr: 1.08 },
  zart: { familie: "BK Zart", datei: "dancing-script.woff2", gewicht: 700, gr: 1.2 },
};
function osterSonntag(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jahr, monat - 1, tag);
}
// Feste nach Kalender (aus der KC Club App): Oktoberfest, Halloween, Ostern (Palmsonntag–Ostermontag), Karneval (Weiberfastnacht–Veilchendienstag, 11.11.)
export function themaFestZeit(d = new Date()) {
  const y = d.getFullYear(), tag = new Date(y, d.getMonth(), d.getDate());
  const ws = new Date(y, 8, 16); ws.setDate(16 + (6 - ws.getDay() + 7) % 7);
  const we = new Date(y, 9, 1); we.setDate(1 + (7 - we.getDay()) % 7); if (we.getDate() < 3) we.setDate(3);
  if (tag >= ws && tag <= we) return "oktoberfest";
  if (d.getMonth() === 9 && d.getDate() === 31) return "halloween";
  const bis = Math.round((tag - osterSonntag(y)) / 86400000);
  if (bis >= -7 && bis <= 1) return "ostern";
  if ((bis >= -52 && bis <= -47) || (d.getMonth() === 10 && d.getDate() === 11)) return "karneval";
  return null;
}
let jahreszeitArt = () => "herbst"; // setzt jahreszeiten.js (vermeidet einen Kreis-Import)
export const jahreszeitArtSetzen = (f) => { jahreszeitArt = f; };
export const themaKalender = (d = new Date()) => { const f = themaFestZeit(d); if (f) return f; const a = jahreszeitArt(d); return a === "advent" ? "weihnachten" : a === "herbst" && d.getMonth() === 9 ? "indian" : a; };
export const themaWahl = () => { const w = LS("bk_thema", "aus"); return w === "auto" || THEMEN.some((t) => t.id === w) ? w : "aus"; };
export function aktivesThema() {
  const w = themaWahl(); if (w === "aus") return null;
  const t = THEMEN.find((x) => x.id === (w === "auto" ? themaKalender() : w)); return t ? { ...t, quelle: w === "auto" ? "kalender" : "fest" } : null;
}
const themaEigen = () => { try { return JSON.parse(LS("bk_thema_eigen", "{}")) || {}; } catch { return {}; } };
// Wert des laufenden Themas (eine eigene Änderung während des Themas geht vor)
export function themaWert(k) { const t = aktivesThema(); if (!t) return undefined; const e = themaEigen(); return e.id === t.id && e[k] !== undefined ? e[k] : t[k]; }
export function themaEigenSetzen(k, v) { const t = aktivesThema(); if (!t) return false; const e = themaEigen(); LSsetzen("bk_thema_eigen", JSON.stringify({ ...(e.id === t.id ? e : {}), id: t.id, [k]: v })); return true; }
const NACH_THEMA = [];
export const beiThemaWechsel = (f) => NACH_THEMA.push(f);
export function themaSetzen(w) {
  LSsetzen("bk_thema", w); LSsetzen("bk_thema_eigen", null);
  anwendenDesign(); NACH_THEMA.forEach((f) => { try { f(); } catch {} });
  const t = THEMEN.find((x) => x.id === w);
  melde(w === "aus" ? "🎨 Kein Thema – deine eigenen Einstellungen gelten" : w === "auto" ? `🔄 Themen nach Kalender – gerade: ${THEMEN.find((x) => x.id === themaKalender())?.name || ""}` : `${t?.sym || ""} Thema „${t?.name || w}“`);
}
export const themaSchriftAn = () => LS("bk_thema_schrift", "1") !== "0";
export function themaSchriftLaden(id) {
  const s = THEMA_SCHRIFTEN[id]; if (!s || s.laden || typeof FontFace === "undefined" || !document.fonts) return;
  try { const f = new FontFace(s.familie, `url(schriften/${s.datei})`, { weight: String(s.gewicht), display: "swap" }); s.laden = f.load().then(() => document.fonts.add(f)).catch(() => { s.laden = null; }); } catch { s.laden = null; }
}
function themaSchriftAnwenden() {
  const id = themaSchriftAn() ? themaWert("schrift") : null, s = id && THEMA_SCHRIFTEN[id], r = document.documentElement;
  if (!s) { delete r.dataset.themaSchrift; return; }
  themaSchriftLaden(id); r.dataset.themaSchrift = id;
  r.style.setProperty("--thema-schrift", `"${s.familie}"`); r.style.setProperty("--thema-schrift-gewicht", s.gewicht); r.style.setProperty("--thema-schrift-gr", s.gr);
}
export function themaSchriftSetzen(an) { LSsetzen("bk_thema_schrift", an ? "1" : "0"); themaSchriftAnwenden(); melde(an ? "✍️ Begrüßung in der Schrift des Themas" : "✍️ Begrüßung wieder in der normalen Schrift"); }

// ---------- Design anwenden ----------
export const dsEff = () => themaWert("design") ?? DS.design;
export const designAktuell = () => DESIGNS.find((d) => d.id === dsEff()) || DESIGNS[0];
const FARBE_VAR = { rot: "haupt", rot2: "haupt2", rot3: "haupt3", gold: "gold", hero1: "hero1", hero4: "hero4", bg: "bg", karte: "karte", karte2: "karte2", linie: "linie", text: "text", grau: "grau" };
export function anwendenDesign() {
  const nacht = istNacht(), d = designAktuell(), f = d[nacht ? "nacht" : "tag"], w = document.documentElement;
  w.classList.toggle("dunkel", nacht);
  if (d.verlauf) w.style.setProperty("--heroverlauf", d.verlauf[nacht ? "nacht" : "tag"]); else w.style.removeProperty("--heroverlauf");
  w.classList.toggle("heroschrift", !!d.heroSchrift); w.classList.toggle("schwarzlicht", !!d.schwarzlicht);
  for (const [k, v] of Object.entries(f)) w.style.setProperty("--" + FARBE_VAR[k], v);
  w.style.setProperty("--haupt-text", d.htext ? d.htext[nacht ? "nacht" : "tag"] : "#ffffff");
  w.style.setProperty("--kopf-marke", d.kopfMarke || "#ffffff");
  w.style.setProperty("--heroschatten", f.rot + "59");
  w.style.setProperty("--deko1", d.deko?.[0] || f.gold); w.style.setProperty("--deko2", d.deko?.[1] || f.rot);
  w.style.setProperty("--marke", f.gold);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nacht ? f.bg : f.hero1);
  const mk = document.getElementById("modusKnopf"), mz = MODI[DS.modus] || MODI.auto;
  if (mk) { mk.innerHTML = `${nacht ? "☀️" : "🌙"}<span class="modusbuchstabe" aria-hidden="true">${mz[0]}</span>`; mk.title = `Tag/Nacht umschalten – eingestellt: ${mz[1]}`; mk.setAttribute("aria-label", mk.title); }
  themaSchriftAnwenden(); cfAnwenden();
}
function designSpeichern() { LSsetzen("bk_design", JSON.stringify(DS)); anwendenDesign(); lichtSensorStarten(); }
export function designWaehlen(id) { if (themaEigenSetzen("design", id)) return anwendenDesign(); DS = { ...DS, design: id }; designSpeichern(); }
export function modusWaehlen(m) { DS = { ...DS, modus: m }; designSpeichern(); }
export function designStandard() { DS = { design: "bachkreis", modus: "auto" }; designSpeichern(); melde("↺ Standard: Bachkreis Schwarz-Gold, Tag/Nacht automatisch"); }
// Mond/Sonne in der Kopfzeile: jeder Tipp schaltet reihum A (Automatik) → T (immer Tag) → N (immer Nacht)
const MODUS_REIHE = ["auto", "tag", "nacht"];
export function dunkelUmschalten() {
  const i = MODUS_REIHE.indexOf(DS.modus), neu = MODUS_REIHE[(i < 0 ? 0 : i + 1) % MODUS_REIHE.length];
  DS = { ...DS, modus: neu }; designSpeichern();
  melde(neu === "auto" ? `🔄 A · Automatik – jetzt ${istNacht() ? "Nacht" : "Tag"}, wechselt von selbst` : neu === "tag" ? "☀️ T · Immer Tag" : "🌙 N · Immer Nacht");
}
export const modusInfo = () => {
  const s = sonne(), z = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return DS.modus !== "auto" ? "" : `Gerade: ${istNacht() ? "🌙 Nacht" : "☀️ Tag"} – ` + (LICHT_NACHT !== null ? "nach dem Lichtsensor des Handys." : `nach Sonnenstand in Bergkamen (heute hell von ${z(s.auf)} bis ${z(s.unter)} Uhr).`);
};
setInterval(() => { if (DS.modus === "auto") anwendenDesign(); }, 60000);
document.addEventListener("bk-einst", () => anwendenDesign());
document.addEventListener("visibilitychange", () => { if (!document.hidden && DS.modus === "auto") anwendenDesign(); });

// ---------- Schrift-Zoom für Lesetexte (KC-CLUB-SCHRIFT-ZOOM): 70–200 %, zwei Finger auseinander/zusammen, Doppeltipp mit zwei Fingern = 100 % ----------
export const SZ = { min: 0.7, max: 2, wert: 1, start: null, basis: 1, raf: 0, anzeige: null, letzterTipp: 0 };
{ const w = parseFloat(LS("bk_schrift_zoom", "1")); if (w >= SZ.min && w <= SZ.max) SZ.wert = w; }
export function szSetzen(w, merken) {
  SZ.wert = Math.round(Math.min(SZ.max, Math.max(SZ.min, w)) * 100) / 100;
  document.documentElement.style.setProperty("--zoom", String(SZ.wert));
  if (merken) { LSsetzen("bk_schrift_zoom", String(SZ.wert)); document.querySelectorAll(".sz-wert").forEach((el) => { el.textContent = `${Math.round(SZ.wert * 100)} %`; }); }
}
szSetzen(SZ.wert, false);
export function szHinweis(text) {
  let h = SZ.anzeige; if (!h) { h = SZ.anzeige = document.createElement("div"); h.className = "sz-hinweis"; h.setAttribute("aria-live", "polite"); document.body.appendChild(h); }
  h.textContent = text; h.classList.add("an"); clearTimeout(h._uhr); h._uhr = setTimeout(() => h.classList.remove("an"), 1200);
}
export function szAendern(d) { szSetzen(d === 0 ? 1 : SZ.wert + d, true); szHinweis(`🔍 Schrift ${Math.round(SZ.wert * 100)} %`); }
const szAbstand = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const szEigeneGeste = (el) => !!el?.closest?.("img, video, canvas, iframe, [data-pinch]");
document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 2 || szEigeneGeste(e.target)) { SZ.start = null; return; }
  const jetzt = Date.now();
  if (jetzt - SZ.letzterTipp < 350) { szSetzen(1, true); szHinweis("🔍 Schrift 100 %"); SZ.start = null; SZ.letzterTipp = 0; return; }
  SZ.letzterTipp = jetzt; SZ.start = szAbstand(e.touches); SZ.basis = SZ.wert;
}, { passive: true, capture: true });
document.addEventListener("touchmove", (e) => {
  if (!SZ.start || e.touches.length !== 2) return;
  if (e.cancelable) e.preventDefault();
  const f = szAbstand(e.touches) / SZ.start; if (Math.abs(f - 1) > 0.04) SZ.letzterTipp = 0;
  const w = SZ.basis * f; cancelAnimationFrame(SZ.raf);
  SZ.raf = requestAnimationFrame(() => { szSetzen(w, false); szHinweis(`🔍 Schrift ${Math.round(SZ.wert * 100)} %`); });
}, { passive: false, capture: true });
document.addEventListener("touchend", (e) => { if (SZ.start && e.touches.length < 2) { SZ.start = null; szSetzen(SZ.wert, true); } }, { passive: true, capture: true });

// ---------- Sparmodus (KC-CLUB-SPARMODUS): automatisch bei langsamem Netz, Datensparen oder wenig Speicher; immer an; aus ----------
export const sparWahl = () => { const w = LS("bk_sparmodus", "auto"); return w === "an" || w === "aus" ? w : "auto"; };
export function sparGrund() {
  const w = sparWahl(); if (w === "an") return "von dir eingeschaltet"; if (w === "aus") return "";
  const c = navigator.connection;
  if (c?.saveData) return "Datensparen ist am Gerät eingeschaltet";
  if (["slow-2g", "2g", "3g"].includes(c?.effectiveType)) return "das Netz ist gerade langsam";
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return "das Gerät hat wenig Arbeitsspeicher";
  return "";
}
export const SPAR = { grund: sparGrund() }; SPAR.an = !!SPAR.grund;
document.documentElement.classList.toggle("spar", SPAR.an);
export function sparSetzen(w) {
  LSsetzen("bk_sparmodus", w === "auto" ? null : w);
  SPAR.grund = sparGrund(); SPAR.an = !!SPAR.grund; document.documentElement.classList.toggle("spar", SPAR.an);
  melde(SPAR.an ? `🐢 Sparmodus ist an (${SPAR.grund})` : w === "aus" ? "Sparmodus ist aus" : "Sparmodus ist gerade aus – schaltet sich bei Bedarf selbst ein");
}

// ---------- Chat-Farben & Hintergrund (KC-CLUB-CHAT-FARBEN): selbst gezeichnete Hintergründe (SVG, keine Fremd-Bilder) ----------
export const CF_EIGEN = [
  { id: "standard", t: "Standard" }, { id: "gold", c: "#d4a017" }, { id: "weinrot", c: "#741521" }, { id: "rot", c: "#b3261e" }, { id: "orange", c: "#c0662b" }, { id: "ocker", c: "#b8892f" },
  { id: "gruen", c: "#2e7d4f" }, { id: "petrol", c: "#1f6f78" }, { id: "blau", c: "#2d5f8a" }, { id: "lila", c: "#6b4c8a" }, { id: "rosa", c: "#b04a6f" }, { id: "grau", c: "#55595e" }, { id: "hellgruen", c: "#cfe8cf" }, { id: "hellblau", c: "#cfe2f3" },
];
export const CF_ANDERE = [ // c = Tag, cd = Nacht
  { id: "standard", t: "Standard" }, { id: "weiss", c: "#ffffff", cd: "#2a2021" }, { id: "creme", c: "#f6efe2", cd: "#352c22" }, { id: "hellblau", c: "#e3eefa", cd: "#1f2c3a" },
  { id: "hellgruen", c: "#e4f3e6", cd: "#1f3326" }, { id: "gelb", c: "#fdf3cf", cd: "#3a3218" }, { id: "rosa", c: "#fbe6ee", cd: "#3a2230" }, { id: "lila", c: "#efe7f7", cd: "#2e2538" }, { id: "grau", c: "#eceeef", cd: "#2c2f33" },
];
const cfSvg = (s) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 700' preserveAspectRatio='xMidYMax slice'>${s}</svg>`)}")`;
export const CF_HG = [
  { id: "standard", t: "Ohne", sym: "⬜", css: "" },
  { id: "wolken", t: "Wolken", sym: "☁️", css: `${cfSvg("<g fill='#fff' opacity='.9'><ellipse cx='90' cy='120' rx='70' ry='24'/><ellipse cx='130' cy='105' rx='45' ry='26'/><ellipse cx='300' cy='260' rx='80' ry='26'/><ellipse cx='340' cy='245' rx='46' ry='26'/><ellipse cx='120' cy='430' rx='75' ry='24'/><ellipse cx='160' cy='415' rx='42' ry='24'/><ellipse cx='310' cy='580' rx='70' ry='22'/></g>")}, linear-gradient(#cfe4f6, #eef5fb)` },
  { id: "sonnenuntergang", t: "Sonnenuntergang", sym: "🌅", css: `${cfSvg("<circle cx='200' cy='520' r='70' fill='#ffd27a' opacity='.85'/><rect y='560' width='400' height='140' fill='#c8796b' opacity='.35'/><g stroke='#fff' stroke-opacity='.5' stroke-width='3'><line x1='140' y1='600' x2='260' y2='600'/><line x1='160' y1='625' x2='240' y2='625'/></g>")}, linear-gradient(#f7d9c4, #f6b9a3 55%, #e9c4d6)` },
  { id: "schneeberge", t: "Schneeberge", sym: "🏔️", css: `${cfSvg("<path d='M0 560 L90 420 L150 500 L230 360 L320 490 L400 410 L400 700 L0 700Z' fill='#9fb4c8' opacity='.7'/><path d='M230 360 L262 405 L245 400 L230 418 L214 402 L200 408Z M90 420 L112 455 L98 450 L88 462 L76 452Z M400 410 L370 452 L386 446 L400 458Z' fill='#fff'/><path d='M0 620 L120 540 L210 600 L300 530 L400 590 L400 700 L0 700Z' fill='#c9d7e3' opacity='.8'/>")}, linear-gradient(#e6eff7, #f7fafc)` },
  { id: "meer", t: "Meer", sym: "🌊", css: `${cfSvg("<g fill='none' stroke='#7fb2cf' stroke-opacity='.55' stroke-width='4'><path d='M0 520 q50 -18 100 0 t100 0 t100 0 t100 0'/><path d='M0 570 q50 -18 100 0 t100 0 t100 0 t100 0'/><path d='M0 620 q50 -18 100 0 t100 0 t100 0 t100 0'/></g><rect y='600' width='400' height='100' fill='#a9d0e4' opacity='.35'/>")}, linear-gradient(#e7f3f9, #d3e8f2)` },
  { id: "wald", t: "Wald", sym: "🌲", css: `${cfSvg("<g fill='#6f9a74' opacity='.55'><path d='M40 640 L70 560 L100 640Z M80 650 L120 540 L160 650Z M150 640 L180 570 L210 640Z M230 650 L270 530 L310 650Z M300 640 L330 565 L360 640Z M350 650 L385 560 L400 600 L400 650Z'/></g><rect y='640' width='400' height='60' fill='#9cbf98' opacity='.45'/>")}, linear-gradient(#eef5ea, #dfeedb)` },
  { id: "huegel", t: "Hügel", sym: "🌄", css: `${cfSvg("<path d='M0 560 Q100 500 200 560 T400 540 L400 700 L0 700Z' fill='#bcd8a8' opacity='.7'/><path d='M0 610 Q120 560 240 610 T400 600 L400 700 L0 700Z' fill='#9cc28a' opacity='.6'/><circle cx='320' cy='150' r='36' fill='#ffe39a' opacity='.7'/>")}, linear-gradient(#eaf4fb, #f6faef)` },
  { id: "blumen", t: "Blumenwiese", sym: "🌼", css: `${cfSvg("<rect y='600' width='400' height='100' fill='#bfdca9' opacity='.6'/><g opacity='.75'><circle cx='50' cy='620' r='7' fill='#ffd54f'/><circle cx='120' cy='640' r='6' fill='#f48fb1'/><circle cx='190' cy='615' r='7' fill='#fff'/><circle cx='260' cy='645' r='6' fill='#ce93d8'/><circle cx='330' cy='625' r='7' fill='#ffd54f'/><circle cx='380' cy='650' r='5' fill='#f48fb1'/></g>")}, linear-gradient(#f3f8ee, #e8f3df)` },
  { id: "sterne", t: "Sternennacht", sym: "✨", css: `${cfSvg("<g fill='#fff'><circle cx='40' cy='60' r='1.6'/><circle cx='120' cy='140' r='1.2'/><circle cx='210' cy='70' r='1.8'/><circle cx='300' cy='120' r='1.3'/><circle cx='360' cy='40' r='1.5'/><circle cx='80' cy='260' r='1.3'/><circle cx='250' cy='230' r='1.6'/><circle cx='350' cy='300' r='1.2'/><circle cx='150' cy='380' r='1.5'/><circle cx='60' cy='480' r='1.2'/><circle cx='320' cy='470' r='1.6'/></g><path d='M330 110 a26 26 0 1 0 22 40 a20 20 0 1 1 -22 -40Z' fill='#fff3c4' opacity='.85'/>")}, linear-gradient(#26314f, #3c4a6e)`, dunkel: true },
  { id: "noten", t: "Noten", sym: "🎼", css: `${cfSvg("<g fill='#1a1500' opacity='.09' font-size='46' font-family='serif'>" + [[60, 90, "♪"], [240, 60, "♫"], [150, 250, "♩"], [330, 230, "♬"], [60, 420, "♫"], [250, 430, "♪"], [150, 600, "♬"], [340, 600, "♩"]].map(([x, y, z]) => `<text x='${x}' y='${y}'>${z}</text>`).join("") + "</g>")}, linear-gradient(#faf6ea, #f3ecd6)` },
];
let CF = (() => { try { return JSON.parse(LS("bk_chat_farben", "null")) || {}; } catch { return {}; } })();
export const chatFarben = () => CF;
export const cfLesbar = (hex) => { const n = parseInt(String(hex).slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#1f1416" : "#ffffff"; };
export function cfAnwenden() {
  const root = document.documentElement, e = CF_EIGEN.find((x) => x.id === CF.eigen && x.c), a = CF_ANDERE.find((x) => x.id === CF.andere && x.c), h = CF_HG.find((x) => x.id === CF.hintergrund && x.css);
  root.classList.toggle("cf-eigen", !!e); root.classList.toggle("cf-andere", !!a); root.classList.toggle("cf-hg", !!h);
  if (e) { root.style.setProperty("--cfEigen", e.c); root.style.setProperty("--cfEigenText", cfLesbar(e.c)); }
  if (a) { root.style.setProperty("--cfAndere", a.c); root.style.setProperty("--cfAndereD", a.cd); }
  const hg = document.getElementById("chatHg");
  if (hg) { hg.style.background = h ? h.css : ""; if (h) { hg.style.backgroundSize = "cover"; hg.style.backgroundPosition = "center bottom"; } }
}
export function cfSetzen(feld, id) { CF = { ...CF, [feld]: id }; LSsetzen("bk_chat_farben", JSON.stringify(CF)); cfAnwenden(); }
export function cfStandard() { CF = { eigen: "standard", andere: "standard", hintergrund: "standard" }; LSsetzen("bk_chat_farben", JSON.stringify(CF)); cfAnwenden(); }
