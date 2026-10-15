// Edge Function bk-kom – BK Communicator: Wartung (jede Minute über pg_cron), Einrichtung und Push-Quittungen.
//   POST {aufgabe:"wartung"}                 Kopf x-bk-planer = BK_KOM_TOKEN   (pg_cron / CI)
//   POST {aufgabe:"einrichten"}              Kopf x-bk-planer = BK_KOM_TOKEN   (CI: trägt Adresse + Schlüssel in den Vault ein)
//   POST {aufgabe:"quittung", id, t, art}    vom Service Worker (Einmal-Token aus der Push-Nachricht, keine Anmeldung)
// Die Logik steckt in ../_shared/kom/kern.js (in den Node-Tests gegen PGlite geprüft).
import postgres from "npm:postgres@3.4.4";
import { wartung, quittung } from "../_shared/kom/kern.js";
import { KANAELE, umgebung } from "../_shared/kom/kanaele-deno.js";
import { gleich } from "../_shared/krypto.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL") ?? "", { max: 2, prepare: false, idle_timeout: 20 });
const db = { q: (text: string, params: unknown[] = []) => sql.unsafe(text, params as never[]) };
const ERLAUBT = (Deno.env.get("BK_ERLAUBTE_URSPRUENGE") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const TOKEN = Deno.env.get("BK_KOM_TOKEN") ?? "";

function cors(origin: string | null) {
  const o = origin && (ERLAUBT.length === 0 || ERLAUBT.includes(origin)) ? origin : (ERLAUBT[0] ?? "*");
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const antwort = (status: number, json: unknown, h: Record<string, string>) =>
  new Response(JSON.stringify(json), { status, headers: { ...h, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function vaultSetzen(name: string, wert: string) {
  const r = await db.q(`select id from vault.secrets where name = $1`, [name]);
  if (r.length) await db.q(`select vault.update_secret($1::uuid, $2)`, [r[0].id, wert]);
  else await db.q(`select vault.create_secret($1, $2)`, [wert, name]);
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return antwort(405, { ok: false, fehler: "NUR_POST" }, h);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  try {
    if (body.aufgabe === "quittung") {
      const r = await quittung(db, { id: String(body.id ?? ""), t: String(body.t ?? ""), art: String(body.art ?? "") });
      return antwort(r.status, r.json, h);
    }
    if (!TOKEN || !gleich(req.headers.get("x-bk-planer") ?? "", TOKEN)) return antwort(401, { ok: false, fehler: "PLANER_TOKEN" }, h);
    if (body.aufgabe === "wartung") return antwort(200, { ok: true, bericht: await wartung(db, KANAELE, umgebung()) }, h);
    if (body.aufgabe === "einrichten") {
      const url = umgebung().quittungUrl;
      await vaultSetzen("bk_kom_url", url);
      await vaultSetzen("bk_kom_token", TOKEN);
      const job = await db.q(`select count(*)::int as n from cron.job where jobname = 'bk-kom-wartung'`).catch(() => [{ n: 0 }]);
      return antwort(200, { ok: true, url, planer: job[0].n > 0 }, h);
    }
    return antwort(400, { ok: false, fehler: "UNBEKANNTE_AUFGABE" }, h);
  } catch (e) {
    console.error("bk-kom", e);
    return antwort(500, { ok: false, fehler: "SERVERFEHLER" }, h);
  }
});
