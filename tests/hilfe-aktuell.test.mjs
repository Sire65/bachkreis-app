// 📚 0.76.0 Hilfe ist aktuell: jede Hilfe führt („👉 Zeig mir wo“) zu einer Ansicht/Aktion, die es gibt; jede Rollen-Angabe ist bekannt;
// die großen Neuerungen seit 0.43 haben eine Hilfe (Bewertung 17.11.: „Hilfe ist bei 0.42 stehen geblieben“)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { HILFE, HILFE_THEMEN } from "../js/kern/hilfe.js";
import { TEILE_KARTE } from "../js/app/teile-karte.js";

const code = readdirSync(new URL("../js/app/", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => readFileSync(new URL("../js/app/" + f, import.meta.url), "utf8")).join("\n");
const views = new Set([...code.matchAll(/VIEWS\.(\w+)\s*=/g)].map((m) => m[1])), aktionen = new Set([...code.matchAll(/AKTIONEN\.(\w+)\s*=/g)].map((m) => m[1]));

test("📚 jede Hilfe: eindeutige ID, bekanntes Thema, „Zeig mir wo“ führt ins Ziel, Rolle bekannt", () => {
  const ids = HILFE.map((e) => e.id); assert.equal(new Set(ids).size, ids.length, "doppelte Hilfe-ID");
  const themen = new Set(HILFE_THEMEN.map((t) => t.id));
  const hz = readFileSync(new URL("../js/app/hilfezentrum.js", import.meta.url), "utf8"), rollen = new Set([...hz.slice(hz.indexOf("const darf")).split("\n")[0].matchAll(/(\w+): /g)].map((m) => m[1]));
  for (const e of HILFE) {
    assert.ok(themen.has(e.thema), `${e.id}: Thema ${e.thema}`);
    if (e.ziel?.v) assert.ok(views.has(e.ziel.v) || TEILE_KARTE.views[e.ziel.v], `${e.id}: Ansicht ${e.ziel.v} gibt es nicht`);
    if (e.ziel?.a) assert.ok(aktionen.has(e.ziel.a), `${e.id}: Aktion ${e.ziel.a} gibt es nicht`);
    if (e.fuer) assert.ok(rollen.has(e.fuer), `${e.id}: Rolle „${e.fuer}“ kennt die Hilfe nicht`);
    assert.ok(e.text.length > 40, `${e.id}: Text zu kurz`);
  }
});
test("📚 die großen Neuerungen 0.43–0.75 haben eine Hilfe", () => {
  const ids = new Set(HILFE.map((e) => e.id));
  for (const id of ["schutz-eltern", "kuendigung", "leihvertrag", "status", "echo-lesen", "echo-mitmachen", "echo-redaktion", "inventur", "jahrbuch", "konzertkarten", "sitzungen", "eingangskorb", "lupe-finger", "bach", "genesungskarte", "whatsapp-lieber", "runde-vorhanden", "gegenvorschlag", "admin-messung", "einfuehrung"])
    assert.ok(ids.has(id), `Hilfe fehlt: ${id}`);
});
