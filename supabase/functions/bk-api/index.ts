// Edge Function bk-api – einziger Zugang der Bachkreis-App zur Datenbank (Service-Rolle bleibt auf dem Server).
// Die Logik steckt in ../_shared/api.js (auch in den Node-Tests gegen PGlite geprüft).
import postgres from "npm:postgres@3.4.4";
import { verarbeiten } from "../_shared/api.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL") ?? "", { max: 3, prepare: false, idle_timeout: 20 });
const db = { q: (text: string, params: unknown[] = []) => sql.unsafe(text, params as never[]) };
const ERLAUBT = (Deno.env.get("BK_ERLAUBTE_URSPRUENGE") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null) {
  const o = origin && (ERLAUBT.length === 0 || ERLAUBT.includes(origin)) ? origin : (ERLAUBT[0] ?? "*");
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "content-type, x-bk-token", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, fehler: "NUR_POST" }), { status: 405, headers: { ...h, "Content-Type": "application/json" } });
  let body: unknown = {};
  try { body = await req.json(); } catch { body = {}; }
  const meta = {
    token: req.headers.get("x-bk-token") ?? "",
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim(),
    geraet: req.headers.get("user-agent") ?? "",
  };
  const r = await verarbeiten(db, body as Record<string, unknown>, meta);
  return new Response(JSON.stringify(r.json), { status: r.status, headers: { ...h, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
