// 🔽 0.44.0 Klappbereiche wie KC: gleiche Kopfzeile überall (Pfeil, Schloss, Zuklappen, Alle auf/zu)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { klappe, klappenAlleKnopf } from "../js/kern/klappen.js";

test("klappe(): details mit data-klappe, Zahl, offen/zu und Schalter für Zuklappen/Schloss", () => {
  const h = klappe("pr_jahr_2026", "📅 2026", "<p>x</p>", { offen: true, zahl: 3, ohneUnten: true });
  assert.match(h, /<details class="kl " data-klappe="pr_jahr_2026" data-ohne-unten open>/);
  assert.match(h, /<span class="kl-zahl">3<\/span>/);
  assert.ok(!klappe("a", "A", "").includes(" open"));
  assert.match(klappe("a", "A", "", { ohneSchloss: true }), /data-ohne-schloss/);
  assert.match(klappenAlleKnopf("inhalt"), /class="knopf klein klappen-alle" data-wurzel="inhalt"/);
});

test("Listen und Chat nutzen die Klappbereiche; Seiten richten sie beim Zeichnen ein", () => {
  const lies = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  for (const [f, k] of [["js/app/protokolle.js", "pr_jahr_"], ["js/app/vorschlaege.js", "vs_g_"], ["js/app/termine.js", "tm_"], ["js/app/rueckmeldung.js", "rm_meine"], ["js/app/erstattung.js", "er_"], ["js/app/instrumente.js", "ig_k_"], ["js/app/notenarchiv.js", "na_"]]) assert.ok(lies(f).includes(k), f);
  assert.ok(lies("js/app/zustand.js").includes("klappenEinrichten(ziel)"));
  assert.ok(lies("js/kern/ui.js").includes("klappenEinrichten(hg)"));
  const n = lies("js/app/nachrichten.js");
  for (const k of ["schreibenKlappe", "chatKopfKlappe", 'class="kl-pfeil zu"']) assert.ok(n.includes(k), k);
  assert.ok(lies("sw.js").includes('"js/kern/klappen.js"'));
  const e = lies("js/app/einstellungen.js");
  for (const k of ['unter("farbe"', 'unter("themen"', 'unter("modus"', 'unter("schrift"', 'unter("jahreszeit"', 'unter("uhr"', 'unter("anordnen"']) assert.ok(e.includes(k), k);
});
