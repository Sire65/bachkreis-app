// 🧊 Hänger-Messung mit Ursache und 📖 Fehlerkatalog (0.75.0, wie KC-CLUB-HAENGER-URSACHE / KC-CLUB-FEHLERKATALOG 2.966.0 – Wunsch Hansi
// „Hänger-Messung … für Admin“): ein Takt von 1 s; reagiert die sichtbare App länger als 5 s nicht, wird gemessen, woran es lag, und als
// Fehlerbericht mit Fehler-ID gemeldet (Admin: Fehlerprotokoll + Katalog). Das erklärende Fenster sieht nur der Admin.
// Ursache: lange Aufgaben der App selbst meldet der Browser (PerformanceObserver „longtask“, Chrome/Edge). Rechnete die App in der Lücke
// selbst → BK-F-101 (Fehler der App); rechnete sie nicht → das Gerät gab ihr keine Zeit (BK-F-102); Speicher fast voll → BK-F-103; Fenster im
// Hintergrund → BK-F-104 (kein Fehler, keine Meldung); ohne Messmöglichkeit (Firefox/Safari) → BK-F-100. Lücken über 60 s = Pause (iPad friert
// Home-Bildschirm-Apps ein), kein Hänger. Reines JavaScript (Ursache und Katalog laufen auch in Tests).
export const FEHLER_KATALOG = {
  haenger: { id: "BK-F-100", sym: "🧊", name: "App hat gehangen (Ursache nicht messbar)", ursache: "Dieser Browser kann nicht messen, ob die App oder das Gerät schuld war.", loesung: "Läuft wieder. Kommt es öfter vor: App einmal schließen und neu öffnen; am besten Chrome oder Edge benutzen." },
  haenger_app: { id: "BK-F-101", sym: "🧊", name: "App hat selbst zu lange gerechnet", ursache: "Die App war mit einer großen Aufgabe beschäftigt (z. B. viele Daten, PDF, Bilder) und konnte so lange nicht reagieren.", loesung: "Ein Fehler der App – ist gemeldet und wird verbessert. Bis dahin: kurz warten, nicht mehrfach tippen." },
  haenger_geraet: { id: "BK-F-102", sym: "🖥️", name: "Gerät war ausgelastet", ursache: "Das Gerät hat der App einige Sekunden keine Rechenzeit gegeben – meist andere Programme, Updates oder der Virenscanner.", loesung: "Andere Programme und Browser-Tabs schließen und das Gerät ab und zu neu starten." },
  haenger_speicher: { id: "BK-F-103", sym: "🧠", name: "Arbeitsspeicher fast voll", ursache: "Der Browser hatte kaum noch freien Speicher und musste aufräumen.", loesung: "Andere Browser-Tabs und Apps schließen; die App einmal neu öffnen." },
  haenger_hintergrund: { id: "BK-F-104", sym: "🪟", name: "Fenster war im Hintergrund", ursache: "Ein anderes Fenster war vorne – der Browser bremst Seiten im Hintergrund absichtlich.", loesung: null },
};
export const katalogEintrag = (schluessel) => FEHLER_KATALOG[schluessel] || { id: "", sym: "•", name: schluessel, ursache: "", loesung: null };
export const katalogVonId = (id) => Object.entries(FEHLER_KATALOG).find(([, k]) => k.id === id)?.[0] || null;

// Ursache aus den Messwerten: lang = [{von, ms}] lange Aufgaben (Zeit in ms seit 1970), Lücke von–bis
export function haengerUrsache({ lang = [], von, bis, luecke, fokus = true, speicherAnteil = 0, messbar = false }) {
  const appMs = lang.reduce((s, x) => s + Math.max(0, Math.min(bis, x.von + x.ms) - Math.max(von, x.von)), 0);
  const ursache = messbar && appMs >= luecke * 0.5 ? "haenger_app" : speicherAnteil > 0.85 ? "haenger_speicher" : !fokus ? "haenger_hintergrund" : messbar ? "haenger_geraet" : "haenger";
  return { ursache, appMs: Math.round(appMs) };
}
// Ist eine Lücke ein Hänger? (> 5 s, sichtbar, schon länger sichtbar; über 60 s = eingefroren/Pause)
export const istHaenger = ({ luecke, sichtbar, sichtbarSeitMs }) => luecke > 5000 && luecke <= 60000 && sichtbar && sichtbarSeitMs > luecke + 1500;

// Zählung für den Katalog: je Fehler-ID wie oft (Summe „anzahl“) und bei wie vielen Personen – im Zeitraum, die häufigsten oben
export function katalogZaehlen(berichte, { seit = null } = {}) {
  const m = new Map();
  for (const b of berichte) {
    if (!b.fehler_id || b.geloescht_am || (seit && String(b.zuletzt || "") < seit)) continue;
    const z = m.get(b.fehler_id) || { id: b.fehler_id, mal: 0, personen: new Set() };
    z.mal += Number(b.anzahl) || 1; if (b.person_id) z.personen.add(b.person_id); m.set(b.fehler_id, z);
  }
  return [...m.values()].map((z) => ({ id: z.id, mal: z.mal, personen: z.personen.size })).sort((a, b) => b.mal - a.mal);
}

// Wächter im Browser: meldet({ schluessel, eintrag, sekunden, messung }) bei jedem Hänger (außer Hintergrund)
export function haengerWaechter(melden) {
  if (typeof window === "undefined" || window.__bkHaenger) return; window.__bkHaenger = true;
  let letzt = Date.now(), sichtbarSeit = Date.now(), fokusVorher = true;
  const wiederDa = () => { sichtbarSeit = Date.now(); letzt = Date.now(); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wiederDa(); });
  window.addEventListener("pageshow", wiederDa); window.addEventListener("focus", wiederDa); document.addEventListener("resume", wiederDa);
  const lang = [], messbar = (() => { try { return !!PerformanceObserver.supportedEntryTypes?.includes("longtask"); } catch { return false; } })();
  if (messbar) try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lang.push({ von: performance.timeOrigin + e.startTime, ms: e.duration }); if (lang.length > 30) lang.splice(0, lang.length - 30); }).observe({ type: "longtask" }); } catch {}
  setInterval(() => {
    const jetzt = Date.now(), luecke = jetzt - letzt - 1000, von = letzt, fokus = fokusVorher; letzt = jetzt;
    try { fokusVorher = document.hasFocus(); } catch {}
    if (luecke > 60000) { sichtbarSeit = jetzt; return; } // eingefroren (Pause), kein Hänger
    if (!istHaenger({ luecke, sichtbar: !document.hidden, sichtbarSeitMs: jetzt - sichtbarSeit })) return;
    setTimeout(() => { // die Meldung über lange Aufgaben kommt erst kurz nach deren Ende
      const m = performance.memory, anteil = m?.jsHeapSizeLimit ? m.usedJSHeapSize / m.jsHeapSizeLimit : 0;
      const u = haengerUrsache({ lang, von, bis: jetzt, luecke, fokus, speicherAnteil: anteil, messbar });
      if (u.ursache === "haenger_hintergrund") return; // kein Fehler, keine Meldung
      melden({ schluessel: u.ursache, eintrag: katalogEintrag(u.ursache), sekunden: Math.round(luecke / 1000),
        messung: { ms: Math.round(luecke), app_ms: u.appMs, speicher_pct: anteil ? Math.round(anteil * 100) : null, geraet_gb: navigator.deviceMemory || null, kerne: navigator.hardwareConcurrency || null, messbar } });
    }, 400);
  }, 1000);
}
