// Umgebung der Installation. Im Repository steht die Vorführversion; der Veröffentlichungs-Workflow überschreibt diese
// Datei mit den Werten aus den GitHub-Repository-Variablen BK_DATENQUELLE / BK_API_URL (öffentliche Adressen, keine Geheimnisse).
export const UMGEBUNG = {
  datenquelle: "lokal-demo", // "lokal-demo" | "supabase"
  apiUrl: "", // z. B. https://<projekt>.supabase.co/functions/v1/bk-api
};
