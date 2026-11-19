// 🎵 Speicherort der Musik (0.78.0, Wunsch Hansi „MP3 auslagern wie Bilder und Noten“): die Bach-Aufnahmen liegen vorerst bei der
// App-Seite (audio/bach/, 16 MB, GitHub Pages – nicht in der Datenbank, nicht auf den Geräten gespeichert). Zieht die Musik später an
// den Ort, den das Team für Noten und Fotos wählt (Cloudflare, Schulserver, IT der Stadt), stellt der Admin nur die Adresse um
// (Eine https-Adresse braucht zusätzlich einen Eintrag in media-src der Content-Security-Policy in index.html.)
// (⚙️ Admin → 💾 Speicher → „Speicherort der Musik“). Erlaubt: eigener Ordner (relativ) oder eine https-Adresse – nie etwas anderes.
export const MUSIK_STANDARD = "audio/bach/";
export function musikBasisPruefen(wert) {
  const s = String(wert ?? "").trim();
  if (!s) return { ok: true, wert: null }; // leer = Standard
  if (s.length > 200 || /\s/.test(s)) return { ok: false, grund: "Bitte eine Adresse ohne Leerzeichen (höchstens 200 Zeichen)." };
  const basis = s.endsWith("/") ? s : s + "/";
  if (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[\w.~%-]*)*\/$/i.test(basis)) return { ok: true, wert: basis };
  if (/^[\w-]+(\/[\w.-]+)*\/$/.test(basis) && !basis.includes("..")) return { ok: true, wert: basis };
  return { ok: false, grund: "Erlaubt ist ein Ordner der App (z. B. audio/bach/) oder eine sichere Adresse, die mit https:// beginnt." };
}
export const musikAdresse = (datei, basis) => (musikBasisPruefen(basis).wert || MUSIK_STANDARD) + datei;
