// Lokaler „Echtbetrieb“ ohne Supabase-Konto: statische App + /api (dieselbe Logik wie die Edge Function bk-api)
// auf PostgreSQL im Arbeitsspeicher (PGlite) mit allen Migrationen und den Demodaten.
// Start: node tests/e2e/server-lokal.mjs [port]  → druckt die Zugangscodes der Demo-Rollen.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { verarbeiten } from "../../supabase/functions/_shared/api.js";
import { PROTOKOLL_ADAPTER as P } from "../../supabase/functions/_shared/kom/kern.js";
import { demoDatenbank } from "../demo-db.mjs";

const W = path.resolve(import.meta.dirname, "../..");
const PORT = Number(process.argv[2] || 8790);
const { db, d, codes } = await demoDatenbank();
// BK Communicator mit Protokoll-Anbietern (nichts verlässt den Rechner); ohne VAPID-Schlüssel → kein Web-Push
const dienste = { adapter: { webpush: P, brevo: P, smtp: P, protokoll: P }, umgebung: { appUrl: `http://localhost:${PORT}/` } };

const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api" && req.method === "POST") {
    let roh = ""; for await (const c of req) roh += c;
    const r = await verarbeiten(db, JSON.parse(roh || "{}"), { token: req.headers["x-bk-token"], ip: req.socket.remoteAddress, geraet: req.headers["user-agent"] }, dienste);
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
