// Lokaler „Echtbetrieb“ ohne Supabase-Konto: statische App + /api (dieselbe Logik wie die Edge Function bk-api)
// auf PostgreSQL im Arbeitsspeicher (PGlite) mit allen Migrationen und den Demodaten.
// Start: node tests/e2e/server-lokal.mjs [port]  → druckt die Zugangscodes der Demo-Rollen.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { erzeugeDemodaten } from "../../js/kern/demodaten.js";
import { TABELLEN, TABELLEN_NAMEN } from "../../js/kern/schema.js";
import { verarbeiten, sha256 } from "../../supabase/functions/_shared/api.js";

const W = path.resolve(import.meta.dirname, "../..");
const PORT = Number(process.argv[2] || 8790);
const pg = new PGlite();
const db = { q: async (t, p = []) => (await pg.query(t, p)).rows };
for (const f of fs.readdirSync(path.join(W, "supabase/migrations")).sort()) await pg.exec(fs.readFileSync(path.join(W, "supabase/migrations", f), "utf8"));
const d = erzeugeDemodaten();
const codes = {};
await pg.exec("set session_replication_role = replica");
for (const t of TABELLEN_NAMEN) {
  const felder = [...TABELLEN[t].felder, ...(TABELLEN[t].intern || [])];
  for (const z0 of d[t] || []) {
    const z = { ...z0 };
    if (t === "zugaenge") { codes[z.person_id] = z.code; z.code_hash = await sha256(z.code); z.code = null; }
    const daten = Object.fromEntries(["id", ...felder.map((f) => f.k), ...(t === "zugaenge" ? ["code_hash"] : [])].map((k) => [k, z[k] === "" && ["datum", "zeit", "zahl", "geld"].includes(felder.find((f) => f.k === k)?.typ) ? null : z[k] ?? null]));
    await pg.query(`insert into bk_${t} select * from jsonb_populate_record(null::bk_${t}, $1::jsonb)`, [JSON.stringify({ ...daten, version: 1, erstellt_am: new Date().toISOString(), geaendert_am: new Date().toISOString() })]);
  }
}
await pg.exec("set session_replication_role = origin");

const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api" && req.method === "POST") {
    let roh = ""; for await (const c of req) roh += c;
    const r = await verarbeiten(db, JSON.parse(roh || "{}"), { token: req.headers["x-bk-token"], ip: req.socket.remoteAddress, geraet: req.headers["user-agent"] });
    res.writeHead(r.status, { "Content-Type": "application/json" }); return res.end(JSON.stringify(r.json));
  }
  if (u.pathname === "/js/kern/umgebung.js") { // Echtbetrieb gegen diesen lokalen Server
    res.writeHead(200, { "Content-Type": TYPEN[".js"] });
    return res.end(`export const UMGEBUNG = { datenquelle: "supabase", apiUrl: "/api" };\n`);
  }
  const datei = path.join(W, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
  if (!datei.startsWith(W) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); return res.end("nicht gefunden"); }
  res.writeHead(200, { "Content-Type": TYPEN[path.extname(datei)] || "application/octet-stream" });
  fs.createReadStream(datei).pipe(res);
});
server.listen(PORT, () => {
  const dp = d.__konfig.demo_personen;
  console.log(JSON.stringify({ port: PORT, codes: Object.fromEntries(Object.entries(dp).map(([r, id]) => [r, { id, code: codes[id] }])) }));
});
