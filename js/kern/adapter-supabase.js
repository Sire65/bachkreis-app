// Adapter „supabase“ – vorbereitet, noch NICHT aktiv.
// Wird eingeschaltet, sobald der Bachkreis sein eigenes Supabase-Projekt hat (siehe docs/KONTEN.md).
// Zugriff läuft ausschließlich über die Edge Function „bk-api“ (Token im Header), nie mit Service-Role im Browser
// (AGENTS.md Regel 15). Die öffentliche Projekt-URL kommt aus der Konfiguration, nicht aus dem Code.
export function erzeugeSupabaseAdapter(einstellungen = {}) {
  const url = einstellungen.url || "";
  return {
    art: "supabase",
    beschreibung: "Bachkreis-Supabase-Projekt (noch nicht eingerichtet)",
    async starten() {
      if (!url) throw new Error("Supabase ist noch nicht eingerichtet – bitte Vorführversion nutzen.");
      throw new Error("Supabase-Adapter folgt, sobald das Bachkreis-Projekt angelegt ist.");
    },
    info() { return { art: "supabase", speicher: "server", server: true, hinweis: url ? "eingerichtet" : "nicht eingerichtet" }; },
    alle() { return []; },
    async schreiben() { throw new Error("nicht verbunden"); },
    async konfigSetzen() { throw new Error("nicht verbunden"); },
    konfig() { return {}; },
    geaendert() {},
    abonnieren() { return () => {}; },
    async zuruecksetzen() { throw new Error("Im Echtbetrieb nicht erlaubt"); },
  };
}
