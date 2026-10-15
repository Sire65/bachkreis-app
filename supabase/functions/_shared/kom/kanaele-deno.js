// Echte Kanal-Adapter des BK Communicators (nur Deno / Supabase Edge Functions). Schlüssel kommen ausschließlich aus
// den Function-Secrets (Deno.env) – in der Datenbank steht nur der NAME des Secrets (kom_anbieter.geheimnis).
// Alle Anbieter sind kostenlos nutzbar: Web-Push (Browser-Push-Dienste), Brevo (Gratis-Kontingent), eigenes SMTP-Postfach.
import webpush from "npm:web-push@3.6.7";
import nodemailer from "npm:nodemailer@6.9.16";
import { PROTOKOLL_ADAPTER } from "./kern.js";

const env = (k) => (k ? Deno.env.get(k) ?? "" : "");
const absender = (einst) => einst.absender_email || env("BK_MAIL_ABSENDER");
const kurz = (x) => String(x ?? "").slice(0, 300);
let vapid = "";

export function umgebung() {
  const basis = env("SUPABASE_URL").replace(/\/$/, "");
  return {
    appUrl: env("BK_APP_URL"),
    quittungUrl: env("BK_KOM_URL") || (basis ? `${basis}/functions/v1/bk-kom` : ""),
    vapidPublic: env("BK_VAPID_PUBLIC"),
  };
}

export const KANAELE = {
  webpush: {
    bereit: () => !!(env("BK_VAPID_PUBLIC") && env("BK_VAPID_PRIVATE")),
    async senden({ abos, nachricht, auftrag, umg }) {
      const schluessel = env("BK_VAPID_PUBLIC");
      if (vapid !== schluessel) { webpush.setVapidDetails(env("BK_VAPID_SUBJECT") || umg.appUrl || "https://github.com", schluessel, env("BK_VAPID_PRIVATE")); vapid = schluessel; }
      const nutzlast = JSON.stringify(nachricht.push);
      const ok = [], weg = []; let letzter = null;
      for (const a of abos) {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: a.schluessel }, nutzlast, { TTL: 21600, urgency: auftrag.prioritaet === "kritisch" ? "high" : "normal" });
          ok.push(a.endpoint);
        } catch (e) {
          const s = e?.statusCode;
          if (s === 404 || s === 410) weg.push(a.endpoint);
          else letzter = { code: "PUSH_" + (s || "NETZ"), text: kurz(e?.body || e?.message || e) };
        }
      }
      if (ok.length) return { ok: true, abos_ok: ok, abos_weg: weg };
      if (weg.length && !letzter) return { ok: false, empfaenger: true, code: "PUSH_ABO_WEG", text: "alle Geräte-Abos abgelaufen", abos_weg: weg };
      return { ok: false, code: letzter?.code || "PUSH_FEHLER", text: letzter?.text || "", abos_weg: weg };
    },
  },
  brevo: {
    bereit: (_umg, an, einst) => !!env(an?.geheimnis || "BK_BREVO_API_KEY") && !!absender(einst),
    async senden({ person, nachricht, einst, anbieter }) {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env(anbieter.geheimnis || "BK_BREVO_API_KEY"), "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: einst.absender_name || "Bachkreis", email: absender(einst) },
          to: [{ email: person.email, name: `${person.vorname || ""} ${person.nachname || ""}`.trim() || person.email }],
          subject: nachricht.betreff, textContent: nachricht.text, htmlContent: nachricht.html,
          ...(einst.antwort_an ? { replyTo: { email: einst.antwort_an } } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const t = await r.text();
      if (r.ok) { let id = null; try { id = JSON.parse(t).messageId; } catch { /* egal */ } return { ok: true, id }; }
      if (r.status === 400 && /email/i.test(t) && /(to|recipient)/i.test(t)) return { ok: false, empfaenger: true, code: "MAIL_ADRESSE_UNGUELTIG", text: kurz(t) };
      return { ok: false, code: "BREVO_" + r.status, text: kurz(t) };
    },
  },
  smtp: {
    bereit: (_umg, an, einst) => !!env(an?.geheimnis || "BK_SMTP_URL") && !!absender(einst),
    async senden({ person, nachricht, einst, anbieter }) {
      const t = nodemailer.createTransport(env(anbieter.geheimnis || "BK_SMTP_URL"));
      try {
        const info = await t.sendMail({
          from: { name: einst.absender_name || "Bachkreis", address: absender(einst) },
          to: { name: `${person.vorname || ""} ${person.nachname || ""}`.trim(), address: person.email },
          subject: nachricht.betreff, text: nachricht.text, html: nachricht.html, ...(einst.antwort_an ? { replyTo: einst.antwort_an } : {}),
        });
        return { ok: true, id: info.messageId };
      } catch (e) {
        const c = e?.responseCode;
        if (c >= 550 && c < 560 && /(recipient|mailbox|user|address)/i.test(e?.response || "")) return { ok: false, empfaenger: true, code: "MAIL_ADRESSE_UNGUELTIG", text: kurz(e.response) };
        return { ok: false, code: "SMTP_" + (c || e?.code || "FEHLER"), text: kurz(e?.response || e?.message) };
      } finally { t.close?.(); }
    },
  },
  protokoll: PROTOKOLL_ADAPTER,
};
