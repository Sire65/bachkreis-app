// 🔍 0.72.0 Lupe mit zwei Fingern für feste Seitenbilder (Echo, PDF/Noten im Pult) – der Schrift-Zoom lässt diese Stellen in Ruhe
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("🔍 Lupe: Zwei-Finger-Zoom, Verschieben, Doppeltipp, Strg+Mausrad, Zurücksetzen; Wischen blättert nur unvergrößert", () => {
  const l = lies("js/kern/lupe.js");
  assert.match(l, /export function lupeAnbinden/);
  assert.match(l, /touches\.length === 2/); assert.match(l, /e\.ctrlKey/); assert.match(l, /jetzt - tipp < 300/);
  assert.match(l, /rahmen\.dataset\.pinch = "lupe"/, "Schrift-Zoom (darstellung.js) überspringt die Lupe");
  assert.match(lies("js/app/darstellung.js"), /\[data-pinch\]/);
  assert.match(l, /Z\.f === 1 && !gezoomtImZug && wisch/, "vergrößert wird nicht geblättert");
  assert.match(l, /passive: false/, "Geste darf die Seite nicht mitscrollen");
});
test("🔍 Eingebaut im Echo (Blätterheft, Knöpfe 🔍−/🔍+) und im PDF-Pult; Datei im Offline-Speicher", () => {
  const e = lies("js/app/echo.js"), p = lies("js/app/pdfansicht.js");
  assert.match(e, /lupeAnbinden\(w\.querySelector\("\.echo-buehne"\)/); assert.match(e, /data-a="echoLupe"/);
  assert.match(p, /lupeAnbinden\(o, o\.querySelector\("#pdfPultBilder"\)/); assert.match(p, /P\.lupe\?\.zuruecksetzen\(\)/, "neue Seite = wieder 100 %");
  assert.match(lies("sw.js"), /"js\/kern\/lupe\.js"/);
  assert.doesNotMatch(lies("css/echo.css"), /\.lupe-ziel \{[^}]*will-change/, "sonst wird vergrößerter Text unscharf");
});
