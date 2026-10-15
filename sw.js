// Service Worker der Bachkreis-App – atomares Update (AGENTS.md Regel 16):
// Eine Version = ein Cache mit ALLEN Dateien. Die neue Version wird erst aktiv, wenn die App „jetzt-aktivieren“ sendet
// (Knopf „Jetzt aktualisieren“). Bis dahin liefert der alte Worker ausschließlich Dateien der alten Version – kein Mischstand.
const VERSION = "0.1.0";
const CACHE = "bk-" + VERSION;
const DATEIEN = [
  "./", "index.html", "verwaltung.html", "manifest.webmanifest",
  "css/app.css", "css/verwaltung.css",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "lib/qrcode/qrcode.js",
  "js/kern/version.js", "js/kern/schema.js", "js/kern/daten.js", "js/kern/adapter-lokal.js", "js/kern/adapter-supabase.js",
  "js/kern/demodaten.js", "js/kern/logik.js", "js/kern/ui.js", "js/kern/versand.js",
  "js/app/main.js", "js/app/zustand.js", "js/app/start.js", "js/app/termine.js", "js/app/kommunikation.js",
  "js/app/orchester.js", "js/app/instrumente.js", "js/app/leitung.js", "js/app/meins.js",
  "js/verwaltung/main.js",
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
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const treffer = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match(new URL(req.url).pathname.endsWith("verwaltung.html") ? "verwaltung.html" : "index.html") : null);
    if (treffer) return treffer;
    try { return await fetch(req); } catch { return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((l) => (l[0] ? l[0].focus() : self.clients.openWindow("./"))));
});
self.addEventListener("push", (e) => {
  // Vorbereitet für echten Web-Push (VAPID) im Echtbetrieb
  let d = {}; try { d = e.data?.json() || {}; } catch { d = { titel: "Bachkreis", text: e.data?.text() || "" }; }
  e.waitUntil(self.registration.showNotification(d.titel || "Bachkreis", { body: d.text || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png" }));
});
