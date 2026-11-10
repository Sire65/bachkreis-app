// Service Worker der Bachkreis-App – atomares Update (AGENTS.md Regel 16):
// Eine Version = ein Cache mit ALLEN Dateien. Die neue Version wird erst aktiv, wenn die App „jetzt-aktivieren“ sendet
// (Knopf „Jetzt aktualisieren“). Bis dahin liefert der alte Worker ausschließlich Dateien der alten Version – kein Mischstand.
const VERSION = "0.60.0";
const CACHE = "bk-" + VERSION;
const DATEIEN = [
  "./", "index.html", "verwaltung.html", "manifest.webmanifest",
  "css/app.css", "css/verwaltung.css", "css/buehne.css", "css/kopf.css", "css/einstellungen.css", "css/pinnwand.css", "css/nachrichten.css", "css/instrumente.css", "css/orchester.css", "css/noten.css", "css/ueben.css", "css/uebebuehne.css", "css/vereinsleben.css", "css/startseite.css", "css/bedienung.css", "ton/kuckuck-ruf.mp3",
  "icons/logo.png", "icons/favicon.png", "icons/icon-192.png", "icons/icon-512.png",
  "lib/qrcode/qrcode.js",
  "js/kern/version.js", "js/kern/umgebung.js", "js/kern/speicher-idb.js", "js/kern/schema.js", "js/kern/daten.js", "js/kern/adapter-lokal.js", "js/kern/adapter-supabase.js",
  "js/kern/demodaten.js", "js/kern/kom-standard.js", "js/kern/logik.js", "js/kern/klappen.js", "js/kern/ui.js", "js/kern/versand.js", "js/kern/musik.js", "js/kern/warten.js", "js/kern/dateien.js", "js/kern/rhythmus.js", "js/kern/griffe.js", "js/kern/stimmton.js", "js/kern/uebematerial.js", "js/kern/chattext.js", "js/kern/quiz.js", "js/kern/klangproben.js", "js/kern/orte.js", "js/kern/buerotisch.js", "js/kern/suche.js", "js/kern/hilfe.js", "js/kern/advent.js", "js/kern/glueck.js",
  "js/app/main.js", "js/app/zustand.js", "js/app/start.js", "js/app/termine.js", "js/app/terminumfrage.js", "js/app/kommunikation.js",
  "js/app/orchester.js", "js/app/instrumente.js", "js/app/leitung.js", "js/app/meins.js", "js/app/buehne.js", "js/app/uebebuehne.js", "js/app/vereinsleben.js", "js/app/startseite.js", "js/app/bedienung.js", "js/app/stundenuhren.js", "js/app/startnachricht.js", "js/app/zugang.js", "js/app/quiz.js", "js/app/kinderstart.js", "js/app/buero.js", "js/app/bueroraum.js", "js/app/elternstart.js", "js/app/kopf.js", "js/app/wetter.js", "js/app/jahreszeiten.js", "js/app/fuss.js", "js/app/darstellung.js", "js/app/effekte.js", "js/app/einstellungen.js", "js/app/pinnwand.js", "js/app/nachrichten.js", "js/app/chatplus.js", "js/app/hilfezentrum.js", "js/app/pdfansicht.js", "js/app/fotoalbum.js", "js/app/vorschlaege.js", "js/app/protokolle.js", "js/app/advent.js", "js/app/rueckmeldung.js", "js/app/erstattung.js", "js/app/glueck.js", "js/app/adminbereich.js", "js/app/ueberblick.js", "js/app/notfallpass.js", "js/app/standorte.js", "js/app/bildschirmfoto.js", "js/app/boerse.js", "js/app/jahrbuch.js", "js/app/spiele.js", "js/kern/stimme.js", "js/app/sitzung.js", "js/app/unterlagen.js", "js/app/schilder.js", "js/app/nutzung.js", "js/app/pruefung.js", "js/kern/rtc.js", "js/app/anruf.js", "js/app/tisch.js", "js/app/fernhilfe.js", "js/kern/geheim.js", "js/kern/tischnetz.js", "js/kern/englisch.js", "js/app/chatextra.js", "js/app/leihvertrag.js", "js/kern/pdf.js", "js/app/druckvorschau.js", "js/app/eingangskorb.js", "js/app/teile.js", "js/app/teile-karte.js", "js/app/datenschutz.js", "js/app/jahresbericht.js", "js/app/konzertkarten.js", "js/app/passkey.js", "js/app/meinstatus.js", "js/gast.js", "gast.html", "js/karten.js", "karten.html", "js/app/sprache.js", "js/app/sprachsteuerung.js", "js/app/gesichter.js", "js/app/netzsymbol.js", "js/app/notenarchiv.js", "js/app/notenblatt.js", "js/app/schutz.js", "js/app/konzert.js", "js/app/extras.js", "js/kern/notensatz.js", "js/app/ueben.js", "js/app/kalender.js", "js/app/online.js", "js/kern/netz.js", "js/app/instrumentenkunde.js",
  "schriften/bangers.woff2", "schriften/creepster.woff2", "schriften/dancing-script.woff2", "schriften/lobster.woff2", "schriften/mountains-of-christmas.woff2", "schriften/pacifico.woff2", "schriften/rye.woff2", "schriften/unifrakturmaguntia.woff2",
  "js/verwaltung/main.js", "js/verwaltung/werkzeuge.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN.map((d) => new Request(d, { cache: "reload" })))).then(async () => {
    // Allererste Installation (noch keine Version aktiv): sofort aktivieren – es gibt nichts zu mischen.
    if (!self.registration.active) await self.skipWaiting();
  }));
});
self.addEventListener("message", (e) => { if (e.data === "jetzt-aktivieren") self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("bk-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// 📲 0.53.0 Teilen-Ziel („Teilen → Bachkreis“): das Geteilte kurz beiseitelegen und die App mit ?teilen=1 öffnen (eingangskorb.js nimmt es an)
async function teilenAnnehmen(req) {
  try {
    const f = await req.formData(), c = await caches.open("bk-teilen"), dateien = f.getAll("dateien").filter((x) => x && typeof x === "object" && x.size).slice(0, 10);
    await Promise.all((await c.keys()).map((k) => c.delete(k)));
    for (const [i, d] of dateien.entries()) await c.put(`teilen-datei-${i}`, new Response(d, { headers: { "Content-Type": d.type || "application/octet-stream" } }));
    await c.put("teilen-daten", new Response(JSON.stringify({ titel: String(f.get("titel") || "").slice(0, 200), text: String(f.get("text") || "").slice(0, 4000), url: String(f.get("url") || "").slice(0, 1000),
      dateien: dateien.map((d) => ({ name: d.name, type: d.type })), zeit: Date.now() }), { headers: { "Content-Type": "application/json" } }));
  } catch { /* App meldet „nichts angekommen“ */ }
  return Response.redirect(new URL("./?teilen=1", self.registration.scope).href, 303);
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method === "POST" && new URL(req.url).origin === location.origin && new URL(req.url).pathname.endsWith("/teilen")) return e.respondWith(teilenAnnehmen(req));
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const treffer = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match(new URL(req.url).pathname.endsWith("verwaltung.html") ? "verwaltung.html" : "index.html") : null);
    if (treffer) return treffer;
    try { return await fetch(req); } catch { return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
  })());
});
// ---------- Web-Push vom BK Communicator (VAPID) mit Quittungen: angezeigt → geöffnet → bestätigt ----------
// Die Push-Nachricht trägt Auftrags-ID + Einmal-Token; die Quittung geht ohne Anmeldung an bk-kom (Token prüft der Server).
function quittung(d, art) {
  if (!d || !d.q || !d.id || !d.t) return Promise.resolve();
  return fetch(d.q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aufgabe: "quittung", id: d.id, t: d.t, art }), keepalive: true }).catch(() => {});
}
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data?.json() || {}; } catch { d = { titel: "Bachkreis", text: e.data?.text() || "" }; }
  const opt = {
    body: d.text || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || undefined, data: d,
    requireInteraction: !!d.kritisch, renotify: !!d.kritisch, vibrate: d.kritisch ? [300, 100, 300, 100, 300] : undefined,
    actions: d.kritisch ? [{ action: "ok", title: "✅ Verstanden" }] : [],
  };
  e.waitUntil(Promise.all([self.registration.showNotification(d.titel || "Bachkreis", opt), quittung(d, "angezeigt")]));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  // Notfall: Antippen oder „Verstanden“ = bestätigt (stoppt die Eskalation); sonst „geöffnet“
  const art = d.kritisch ? "quittiert" : "geoeffnet";
  const ziel = d.url || "./";
  e.waitUntil(Promise.all([quittung(d, art), self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => (l[0] ? l[0].focus() : self.clients.openWindow(ziel)))]));
});
