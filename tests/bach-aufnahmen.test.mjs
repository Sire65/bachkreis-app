// 🎻 0.71.0 Bach zum Anhören auf der Bühne: jede Aufnahme liegt als MP3 im Repo (eigene Seite, kein fremder Server),
// ist gemeinfrei oder CC0 und steht mit Quelle in audio/bach/QUELLEN.md
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const src = lies("js/app/buehne.js"), quellen = lies("audio/bach/QUELLEN.md");
const ids = [...src.slice(src.indexOf("export const BACH_AUFNAHMEN")).matchAll(/\{ id: "(\w+)", titel: "[^"]+", werk: "[^"]+", wer: "[^"]+", lizenz: "(gemeinfrei|CC0)"(?:, takt: \d)? \}/g)].map((m) => m[1]);

test("🎻 Bach-Aufnahmen, alle gemeinfrei/CC0, als MP3 vorhanden und nicht zu groß", () => {
  assert.ok(ids.length >= 1);
  for (const id of ids) {
    const st = statSync(new URL(`../audio/bach/${id}.mp3`, import.meta.url));
    assert.ok(st.size > 200_000 && st.size < 8_000_000, `${id}.mp3: ${st.size} Byte`);
    const kopf = readFileSync(new URL(`../audio/bach/${id}.mp3`, import.meta.url)).subarray(0, 3).toString("latin1");
    assert.ok(kopf === "ID3" || kopf.charCodeAt(0) === 0xff, `${id}.mp3 ist ein MP3`);
    assert.match(quellen, new RegExp(`${id}\\.mp3[^\\n]*commons\\.wikimedia\\.org/wiki/File:`), `Quelle für ${id}`);
  }
  assert.doesNotMatch(quellen, /CC BY-SA|CC BY \d/, "nur gemeinfrei/CC0 – keine Namensnennungs-Pflicht");
});

test("🎭 Bühne hat den Reiter 🎻 Bach; Musik wird von der eigenen Seite geladen (CSP media-src 'self')", () => {
  assert.match(src, /\["bach", "🎻 Bach"\]/); assert.match(src, /audio\/bach\/\$\{x\.id\}\.mp3/);
  assert.match(lies("index.html"), /media-src 'self'/);
  assert.doesNotMatch(lies("sw.js"), /audio\/bach/, "MP3s nicht vorab laden (Datenvolumen)");
  assert.match(lies("js/app/echo.js"), /data-a="echoBach"/, "Echo: Komponist Bach → Bühne");
});

test("🚚 0.71.1 Alles, was die App lädt, wird auch veröffentlicht (Pages-Liste) – sonst 404 wie bei der Badinerie in 0.71.0", () => {
  const web = (lies(".github/workflows/pages.yml").match(/WEB="([^"]+)"/) || [])[1]?.split(/\s+/) || [];
  for (const d of ["audio", "css", "js", "lib", "icons"]) assert.ok(web.includes(d), `${d} fehlt in der Pages-Liste`);
  // jeder Ordner, auf den der Code mit festem Pfad zeigt, steht in der Liste
  const quellen = ["js/app/buehne.js", "js/app/echo.js", "index.html", "sw.js"].map(lies).join("\n");
  for (const m of quellen.matchAll(/["`(]((?:audio|ton|bilder|schriften|icons|lib)\/)[\w$./{}-]+/g)) assert.ok(web.includes(m[1].slice(0, -1)), `${m[1]} wird nicht veröffentlicht`);
  assert.match(lies("sw.js"), /\\\/audio\\\//, "Audio läuft am Service Worker vorbei");
});
