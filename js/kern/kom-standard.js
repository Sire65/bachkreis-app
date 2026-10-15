// Standard-Konfiguration des BK Communicators – EINE Quelle für die Demodaten und die Supabase-Startwerte
// (tools/schema-sql.mjs erzeugt daraus supabase/migrations/…_bk_kom_standard.sql). Alles danach pflegt die Leitung
// in der PC-Verwaltung (Gruppe „Communicator“) – nichts davon ist im Code fest verdrahtet.
// Anbieter-Schlüssel stehen NIE hier, nur der NAME des Server-Secrets (Supabase › Edge Functions › Secrets).

const R = (ereignis, programm_id, kanaele, modus, vorlage_id, mehr = {}) => ({
  id: "kr-" + ereignis, ereignis, programm_id, kanaele, modus, vorlage_id,
  prioritaet: "normal", ruhezeit: "verschieben", quittung: false, eltern: "auch", dedupe_sekunden: 0, aktiv: true, ...mehr,
});

export const KOM_STANDARD = {
  kom_einstellungen: [{
    id: "global", versand_aktiv: true, nur_kostenlos: true, max_pro_minute: 120, ruhe_von: "21:30", ruhe_bis: "07:00",
    max_versuche: 5, basis_sekunden: 30, max_sekunden: 3600, absender_name: "Bachkreis Bergkamen", absender_email: "", antwort_an: "", app_url: "",
  }],
  kom_programme: [
    { id: "kp-app", schluessel: "app", name: "App & Chat", aktiv: true, beschreibung: "Nachrichten aus Unterhaltungen" },
    { id: "kp-termine", schluessel: "termine", name: "Termine", aktiv: true, beschreibung: "Neue/geänderte Termine, Erinnerungen, Nachfassen" },
    { id: "kp-leitung", schluessel: "leitung", name: "Rundschreiben & Leitung", aktiv: true, beschreibung: "Rundschreiben an Gruppen, Eltern, Förderer" },
    { id: "kp-verwaltung", schluessel: "verwaltung", name: "Verwaltung", aktiv: true, beschreibung: "Genehmigungen, Leihinstrumente" },
    { id: "kp-sos", schluessel: "sos", name: "SOS / Notfall", aktiv: true, beschreibung: "Notfall-Meldungen – kritisch, mit Eskalation" },
    { id: "kp-system", schluessel: "system", name: "System", aktiv: true, beschreibung: "Test, Eskalation, alles andere" },
  ],
  kom_vorlagen: [
    { id: "kv-standard", schluessel: "standard", name: "Standard", betreff: "{{betreff}}", text: "{{text}}",
      varianten: { mail: { text: "Hallo {{vorname}},\n\n{{text}}\n\nViele Grüße\n{{absender}}\n\n{{app_url}}" } } },
    { id: "kv-termin", schluessel: "termin", name: "Termin", betreff: "📅 {{betreff}}", text: "{{text}}",
      varianten: { mail: { text: "Hallo {{vorname}},\n\n{{text}}\n\nBitte in der App zu- oder absagen: {{app_url}}\n\nViele Grüße\n{{absender}}" } } },
    { id: "kv-sos", schluessel: "sos", name: "SOS", betreff: "🆘 {{betreff}}", text: "{{text}}",
      varianten: { mail: { betreff: "🆘 NOTFALL: {{betreff}}", text: "{{text}}\n\nGemeldet über die Bachkreis-App. Bitte sofort reagieren.\n{{app_url}}" } } },
    { id: "kv-genehmigung", schluessel: "genehmigung", name: "Genehmigung", betreff: "✍️ {{betreff}}", text: "{{text}}",
      varianten: { mail: { text: "Hallo {{vorname}},\n\n{{text}}\n\nDie Genehmigung können Sie in der App erteilen: {{app_url}}\n\nViele Grüße\n{{absender}}" } } },
    { id: "kv-test", schluessel: "test", name: "Test", betreff: "🧪 {{betreff}}", text: "{{text}}", varianten: {} },
  ],
  kom_regeln: [
    R("nachricht", "kp-app", ["push", "app"], "rueckfall", "kv-standard", { eltern: "nein" }),
    R("rundschreiben", "kp-leitung", ["push", "mail", "app"], "alle", "kv-standard"),
    R("termin_neu", "kp-termine", ["push", "mail", "app"], "rueckfall", "kv-termin"),
    R("termin_geaendert", "kp-termine", ["push", "mail", "app"], "rueckfall", "kv-termin", { prioritaet: "hoch" }),
    R("erinnerung", "kp-termine", ["push", "app"], "rueckfall", "kv-termin", { dedupe_sekunden: 3600 }),
    R("nachfassen", "kp-termine", ["push", "mail", "app"], "rueckfall", "kv-termin", { dedupe_sekunden: 3600 }),
    R("genehmigung", "kp-verwaltung", ["push", "mail", "app"], "alle", "kv-genehmigung", { eltern: "statt" }),
    R("instrument", "kp-verwaltung", ["push", "mail", "app"], "rueckfall", "kv-standard"),
    R("sos", "kp-sos", ["push", "mail", "app"], "alle", "kv-sos", { prioritaet: "kritisch", ruhezeit: "ignorieren", quittung: true, eltern: "nein" }),
    R("test", "kp-system", ["push", "mail"], "alle", "kv-test", { ruhezeit: "ignorieren", eltern: "nein" }),
    R("standard", "kp-system", ["push", "app"], "rueckfall", "kv-standard"),
  ],
  kom_anbieter: [
    { id: "ka-webpush", name: "Web-Push (VAPID)", kanal: "push", art: "webpush", kostenlos: true, aktiv: true, bremse_minute: 600, bremse_stunde: 10000, tageslimit: null, geheimnis: "BK_VAPID_PRIVATE", notiz: "Kostenlos über die Push-Dienste der Browser. Schlüssel erzeugt die CI-Einrichtung." },
    { id: "ka-brevo", name: "Brevo (E-Mail)", kanal: "mail", art: "brevo", kostenlos: true, aktiv: true, bremse_minute: 30, bremse_stunde: 250, tageslimit: 290, geheimnis: "BK_BREVO_API_KEY", notiz: "Gratis-Kontingent 300 Mails/Tag. Absender-Adresse bei Brevo bestätigen." },
    { id: "ka-smtp", name: "SMTP-Postfach (Ersatz)", kanal: "mail", art: "smtp", kostenlos: true, aktiv: true, bremse_minute: 10, bremse_stunde: 100, tageslimit: 400, geheimnis: "BK_SMTP_URL", notiz: "z. B. smtps://name%40web.de:passwort@smtp.web.de:465 (als Secret, nie hier)" },
    { id: "ka-protokoll", name: "Protokoll (Test)", kanal: "alle", art: "protokoll", kostenlos: true, aktiv: false, bremse_minute: null, bremse_stunde: null, tageslimit: null, geheimnis: "", notiz: "Sendet nichts, vermerkt nur – für Tests." },
  ],
  kom_routen: [
    { id: "kro-push-1", kanal: "push", anbieter_id: "ka-webpush", rang: 1, auto_wechsel: true, aktiv: true },
    { id: "kro-mail-1", kanal: "mail", anbieter_id: "ka-brevo", rang: 1, auto_wechsel: true, aktiv: true },
    { id: "kro-mail-2", kanal: "mail", anbieter_id: "ka-smtp", rang: 2, auto_wechsel: true, aktiv: true },
  ],
  kom_eskalationen: [
    { id: "ke-sos-mail", name: "SOS nicht bestätigt → E-Mail", ereignis: "sos", ausloeser: "nicht_quittiert", warte_sekunden: 300, kanaele: ["mail"], an: "empfaenger", aktiv: true },
    { id: "ke-sos-leitung", name: "SOS nach 15 Min. unbestätigt → Leitung", ereignis: "sos", ausloeser: "nicht_quittiert", warte_sekunden: 900, kanaele: ["push", "mail"], an: "leitung", aktiv: true },
    { id: "ke-genehmigung", name: "Genehmigung nicht zustellbar → Leitung", ereignis: "genehmigung", ausloeser: "fehlgeschlagen", warte_sekunden: 0, kanaele: ["app"], an: "leitung", aktiv: true },
  ],
  kom_zustand: [
    { id: "kz-webpush", anbieter_id: "ka-webpush", status: "unbekannt", fehler_folge: 0, gesendet_24h: 0 },
    { id: "kz-brevo", anbieter_id: "ka-brevo", status: "unbekannt", fehler_folge: 0, gesendet_24h: 0 },
    { id: "kz-smtp", anbieter_id: "ka-smtp", status: "unbekannt", fehler_folge: 0, gesendet_24h: 0 },
    { id: "kz-protokoll", anbieter_id: "ka-protokoll", status: "unbekannt", fehler_folge: 0, gesendet_24h: 0 },
  ],
};
