// 💬 Nachrichtentext (0.29.0, aus der KC Club App 2.686–2.726): *fett*, _kursiv_, ~durchgestrichen~, [rot]Farbe[/rot], Link-Prüfer (⚠️),
// Erkennung „📅 Termin in der Nachricht“ und „✖ Absage / ✅ Zusage“. Reines JavaScript, läuft im Browser und in den Tests – nichts geht an fremde Dienste.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// ---------- Formatierung wie WhatsApp: nur am Wortanfang/-ende (Links mit _ bleiben heil) ----------
const FORMAT = [["*", "b"], ["_", "i"], ["~", "s"]];
export function naFormat(h) { // h ist schon sicher (esc) – es kommen nur <b>/<i>/<s> dazu
  for (const [z, tag] of FORMAT) { const e = z.replace(/[*~]/, "\\$&");
    h = h.replace(new RegExp(`(^|[\\s(„"'>;])${e}([^\\s${e}](?:[^${e}\\n]*?[^\\s${e}])?)${e}(?=$|[\\s.,!?;:)“"'<&])`, "g"), `$1<${tag}>$2</${tag}>`); }
  return h;
}
// ---------- Farbe: [rot]Wort[/rot] – Gelb ist ein Textmarker (gelbe Schrift auf Weiß wäre nicht lesbar) ----------
export const NA_FARBEN = { rot: "Rot", blau: "Blau", grün: "Grün", gelb: "Gelb" };
const FARB_RE = /\[(rot|blau|grün|gelb)\]([\s\S]+?)\[\/\1\]/g;
export const ohneFarbe = (t) => String(t ?? "").replace(FARB_RE, "$2");
export const naFarbe = (h) => h.replace(FARB_RE, (x, f, w) => `<span class="nf nf-${f === "grün" ? "gruen" : f}">${w}</span>`);
// Für Vorschau, Push und E-Mail: ohne Zeichen
export const klartext = (t) => ohneFarbe(t).replace(/(^|\s)([*_~])(\S(?:.*?\S)?)\2(?=\s|$|[.,!?;:])/g, "$1$3");

// ---------- 🛡️ Link-Prüfer (KC-CLUB-LINK-PRUEFER): verdächtige Links bekommen ein ⚠️ – nur Regeln, kein fremder Dienst ----------
const KURZ = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|buff\.ly|cutt\.ly|rebrand\.ly|shorturl\.at|tiny\.cc|rb\.gy|s\.id|v\.gd)$/i;
const MARKEN = ["bachkreis", "gymnasium", "sire65", "supabase", "github", "paypal", "google", "microsoft", "amazon", "whatsapp", "iserv"];
const ECHTE_DOMAINS = ["sire65.github.io", "github.com", "githubusercontent.com", "supabase.co", "supabase.com", "gymnasium-bergkamen.de", "portal-gymnasium-bergkamen.de",
  "musikschule-bergkamen.de", "bergkamen.de", "imslp.org", "paypal.com", "paypal.de", "google.com", "google.de", "youtube.com", "youtu.be", "microsoft.com", "office.com",
  "apple.com", "icloud.com", "amazon.de", "amazon.com", "whatsapp.com", "wa.me", "wikipedia.org", "open-meteo.com"];
const echteDomain = (host) => ECHTE_DOMAINS.some((d) => host === d || host.endsWith("." + d));
function abstand(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 3) return 9; let v = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const w = [i]; for (let j = 1; j <= n; j++) w[j] = Math.min(v[j] + 1, w[j - 1] + 1, v[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); v = w; } return v[n]; }
export function linkGruende(url) {
  let u; try { u = new URL(String(url)); } catch { return []; }
  const g = [], host = u.hostname.toLowerCase();
  if (u.protocol === "http:") g.push("ohne Verschlüsselung (http)");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) g.push("Zahlen-Adresse statt Name");
  if (host.split(".").some((t) => t.startsWith("xn--"))) g.push("versteckte Sonderzeichen im Namen");
  if (KURZ.test(host)) g.push("Kurz-Link – Ziel unsichtbar");
  if (u.username || u.password) g.push("Adresse mit @ – führt woanders hin");
  const teile = host.replace(/^www\./, "").split("."), name = teile.length > 1 ? teile[teile.length - 2] : teile[0], norm = name.replace(/0/g, "o").replace(/1/g, "l");
  if (!echteDomain(host)) for (const e of MARKEN) if (norm.includes(e) || (norm.length >= 5 && abstand(norm, e) === 1)) { g.push(`sieht aus wie „${e}“, ist es aber nicht`); break; }
  if (/(passwort|password|login|anmelden|konto-?bestaetig|verify|bestaetigen|pin|tan)\b/i.test(u.pathname + u.search) && !echteDomain(host)) g.push("fragt vermutlich nach Passwort/Daten");
  const rang = (x) => ["sieht aus", "Adresse mit @", "Passwort", "Zahlen", "Sonderzeichen", "Kurz-Link", "ohne Verschl"].findIndex((w) => x.includes(w));
  return g.sort((a, b) => rang(a) - rang(b));
}
// Link mit 🔗-Karte (nur Adresse – es wird nichts aus dem Netz geladen) und ggf. ⚠️
function linkHtml(url) {
  const sauber = url.replace(/[.,;:!?)]+$/, ""), rest = url.slice(sauber.length), roh = sauber.replace(/&amp;/g, "&"), g = linkGruende(roh);
  let host = ""; try { host = new URL(roh).hostname.replace(/^www\./, ""); } catch {}
  return `<a href="${sauber}" target="_blank" rel="noopener noreferrer">${sauber}</a>${g.length ? `<span class="link-warn" role="note" title="${esc(g.join(" · "))}">⚠️ Vorsicht: ${esc(g[0])}</span>` : host ? `<span class="link-karte" aria-hidden="true">🔗 ${esc(host)}</span>` : ""}${rest}`;
}
// Ganze Nachricht sicher ausgeben: Farbe → Formatierung → Links (+ Prüfer) → @Namen → Zeilen
export function textHtml(t) {
  return naFormat(naFarbe(esc(t))).replace(/https?:\/\/[^\s<>"'„“]+/gi, (url) => linkHtml(url))
    .replace(/(^|\s)@([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*)/g, (x, v, n) => `${v}<span class="erw">@${n}</span>`).replace(/\n/g, "<br>");
}

// ---------- 💡 Erkennung Zu-/Absage (KC-CLUB-ERKENNUNG-NACHRICHT) ----------
const ERK = {
  krank: /\b(krank\w*|erk[aä]ltet|erk[aä]ltung|grippe|fieber|corona|covid|magen-?darm|migr[aä]ne|liegt? flach|im bett|beim arzt|zum arzt|krankenhaus|nicht fit|unwohl)\b/i,
  absage: /\b(sage?n?\s+(?:\S+\s+){0,3}?ab\b(?!\s*(?:\d|morgen|heute|sofort|jetzt|wann))|absagen|absage|kann .{0,25}nicht (?:kommen|dabei sein|teilnehmen|zur probe)|kommt? .{0,15}nicht\b|komme .{0,15}nicht\b|bin .{0,15}nicht dabei|ist .{0,15}nicht dabei|schaff(?:e|t) .{0,20}nicht\b|klappt .{0,15}nicht\b|fehlt? (?:morgen|heute|am|bei))/i,
  zusage: /\b(ich komme|wir kommen|kommt gern\w*|komme gern\w*|bin (?:gerne? |auch )?dabei|ist (?:gerne? |auch )?dabei|sind (?:gerne? |auch )?dabei|sage?\s+(?:\S+\s+){0,2}?zu\b|zusage|klar komm\w*)\b/i,
};
export function erkennen(text) { // → Teilmenge von ["krank", "absage", "zusage"]; Absage schließt Zusage aus („ich komme nicht“), krank zählt als Absage
  const t = String(text || "").replace(/\s+/g, " ");
  if (t.length < 4 || t.length > 1500) return [];
  let a = Object.keys(ERK).filter((k) => ERK[k].test(t));
  if (a.includes("krank") && !a.includes("absage")) a.push("absage");
  if (a.includes("absage")) a = a.filter((x) => x !== "zusage");
  return a;
}

// ---------- 📅 Termin in der Nachricht (KC-CLUB-NACHRICHT-TERMIN, vereinfacht) ----------
const MONATE = { januar: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mär: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };
const WTAGE = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sonnabend: 6 };
const plus = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoAus = (j, m, t) => { const d = new Date(Date.UTC(j, m - 1, t)); return d.getUTCMonth() === m - 1 && d.getUTCDate() === t ? d.toISOString().slice(0, 10) : null; };
// → { datum: "YYYY-MM-DD", zeit: "HH:MM" | null, unklar: bool } oder null. bezug = Tag, an dem die Nachricht geschrieben wurde.
export function terminErkennen(text, bezug) {
  const s = String(text || "").toLowerCase();
  if (!s.trim() || s.length > 2000) return null;
  bezug = /^\d{4}-\d\d-\d\d$/.test(bezug || "") ? bezug : new Date().toISOString().slice(0, 10);
  const ohneJahr = (m, t) => { const j = Number(bezug.slice(0, 4)); let d = isoAus(j, m, t); if (d && d < plus(bezug, -60)) d = isoAus(j + 1, m, t); return d; };
  let datum = null, m;
  if ((m = /(\d{4})-(\d\d)-(\d\d)/.exec(s))) datum = isoAus(+m[1], +m[2], +m[3]);
  if (!datum && (m = /(?:^|[^\d.:])(\d{1,2})\.\s?(\d{1,2})\.(\d{4}|\d\d)?(?![\d:])/.exec(s))) datum = m[3] ? isoAus(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) : ohneJahr(+m[2], +m[1]);
  if (!datum && (m = new RegExp(`(?:^|\\D)(\\d{1,2})\\.?\\s*(${Object.keys(MONATE).sort((a, b) => b.length - a.length).join("|")})\\b\\.?(?:\\s+(\\d{4}))?`).exec(s))) datum = m[3] ? isoAus(+m[3], MONATE[m[2]], +m[1]) : ohneJahr(MONATE[m[2]], +m[1]);
  if (!datum && (m = /(?:^|[^a-zäöüß])(übermorgen|uebermorgen|heute|morgen)(?![a-zäöüß])/.exec(s)) && !/guten morgen/.test(s.slice(Math.max(0, m.index - 6), m.index + m[0].length))) datum = plus(bezug, m[1] === "heute" ? 0 : m[1] === "morgen" ? 1 : 2);
  if (!datum && (m = /in\s+(\d{1,2})\s+(tag|tagen|woche|wochen)\b/.exec(s))) datum = plus(bezug, (/^woche/.test(m[2]) ? 7 : 1) * +m[1]);
  if (!datum && (m = /(?:^|[^a-zäöüß])(nächsten|naechsten|kommenden)?\s*(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend)\b/.exec(s))) {
    const heuteW = new Date(bezug + "T12:00:00Z").getUTCDay(); let d = (WTAGE[m[2]] - heuteW + 7) % 7; if (d === 0 && m[1]) d = 7; datum = plus(bezug, d);
  }
  if (!datum) return null;
  // Uhrzeit: 17 Uhr · 17:30 · 17.30 Uhr · um 5 · halb 6
  let zeit = null, unklar = false, h = null, min = 0;
  const z = s.replace(/\d{4}-\d\d-\d\d/g, " ").replace(/\d{1,2}\.\s?\d{1,2}\.(?:\d{4}|\d\d)?/g, " "); // Daten raus, sonst wäre „14.11.“ eine Uhrzeit
  if ((m = /(\d{1,2})[:.](\d{2})\s*(?:uhr|h)?/.exec(z)) && +m[1] < 24 && +m[2] < 60) { h = +m[1]; min = +m[2]; }
  else if ((m = /(\d{1,2})\s*(?:uhr|h\b)/.exec(z))) h = +m[1];
  else if ((m = /halb\s+(\d{1,2})\b/.exec(z))) { h = +m[1] - 1; min = 30; }
  else if ((m = /\b(?:um|ab|gegen)\s+(\d{1,2})\b(?![.:]\d)/.exec(z))) h = +m[1];
  if (h != null && h <= 24) {
    if (h >= 1 && h <= 11) { if (/abends?|nachmittags?|mittags/.test(s)) h += 12; else if (!/morgens|früh|frueh|vormittags?/.test(s) && h <= 7) { h += 12; unklar = true; } }
    zeit = `${String(h % 24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return { datum, zeit, unklar };
}
