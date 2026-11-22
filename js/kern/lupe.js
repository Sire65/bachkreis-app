// 🔍 Lupe mit zwei Fingern (0.72.0, Wunsch Hansi „an bestimmten Stellen Textzoom mit 2 Fingern, z. B. Bachkreis-Echo“): für Inhalte mit
// festem Seitenbild (Echo-Seiten, PDF/Noten im Pult), bei denen der Schrift-Zoom (darstellung.js) nicht greift.
// Zwei Finger auseinander/zusammen = vergrößern (bis 400 %) · vergrößert mit einem Finger verschieben · doppelt tippen = 220 % ↔ 100 %
// · am PC Strg + Mausrad (auch Trackpad-Zusammenziehen) · „🔍 … % ✕“ setzt zurück. Nicht vergrößert: Wischen blättert (wisch-Rückruf).
const klemm = (v, a, b) => Math.min(b, Math.max(a, v));
const abstand = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

export function lupeAnbinden(rahmen, ziel, { max = 4, wisch = null } = {}) {
  const Z = { f: 1, x: 0, y: 0 };
  let pinch = null, zug = null, wx = null, tipp = 0, gezoomtImZug = false;
  rahmen.dataset.pinch = "lupe"; rahmen.classList.add("lupe"); ziel.classList.add("lupe-ziel");
  const marke = document.createElement("button"); marke.type = "button"; marke.className = "lupe-stufe"; marke.hidden = true;
  marke.setAttribute("aria-label", "Vergrößerung zurücksetzen"); rahmen.appendChild(marke);
  marke.addEventListener("click", (e) => { e.stopPropagation(); setzen(1, 0, 0); });
  const pos = (x, y) => { const r = rahmen.getBoundingClientRect(); return [x - r.left, y - r.top]; };
  function setzen(f, x, y) {
    const W = rahmen.clientWidth, H = rahmen.clientHeight;
    Z.f = klemm(f, 1, max);
    if (Z.f < 1.02) Object.assign(Z, { f: 1, x: 0, y: 0 });
    else { Z.x = klemm(x, W - W * Z.f, 0); Z.y = klemm(y, H - H * Z.f, 0); }
    ziel.style.transform = Z.f === 1 ? "" : `translate(${Z.x.toFixed(1)}px, ${Z.y.toFixed(1)}px) scale(${Z.f.toFixed(3)})`;
    rahmen.classList.toggle("lupe-an", Z.f > 1);
    marke.hidden = Z.f === 1; marke.textContent = `🔍 ${Math.round(Z.f * 100)} % ✕`;
  }
  const um = (f, mx, my) => { const n = klemm(f, 1, max); setzen(n, mx - ((mx - Z.x) * n) / Z.f, my - ((my - Z.y) * n) / Z.f); };
  rahmen.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const [mx, my] = pos((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
      pinch = { d: abstand(e.touches), f: Z.f, mx, my, x: Z.x, y: Z.y }; zug = null; wx = null; gezoomtImZug = true; return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0], jetzt = Date.now();
    if (jetzt - tipp < 300) { const [mx, my] = pos(t.clientX, t.clientY); um(Z.f > 1 ? 1 : 2.2, mx, my); tipp = 0; wx = null; gezoomtImZug = true; return; }
    tipp = jetzt; gezoomtImZug = false;
    if (Z.f > 1) zug = { px: t.clientX, py: t.clientY, x: Z.x, y: Z.y }; else wx = t.clientX;
  }, { passive: true });
  rahmen.addEventListener("touchmove", (e) => {
    if (pinch && e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const f = klemm((pinch.f * abstand(e.touches)) / pinch.d, 1, max);
      const [mx, my] = pos((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
      setzen(f, mx - ((pinch.mx - pinch.x) * f) / pinch.f, my - ((pinch.my - pinch.y) * f) / pinch.f);
    } else if (zug && e.touches.length === 1 && Z.f > 1) {
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0]; if (Math.hypot(t.clientX - zug.px, t.clientY - zug.py) > 8) tipp = 0;
      setzen(Z.f, zug.x + t.clientX - zug.px, zug.y + t.clientY - zug.py);
    }
  }, { passive: false });
  rahmen.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) pinch = null;
    if (e.touches.length) return;
    if (wx != null && Z.f === 1 && !gezoomtImZug && wisch) { const dx = e.changedTouches[0].clientX - wx; if (Math.abs(dx) > 60) { tipp = 0; wisch(dx < 0 ? 1 : -1); } }
    zug = null; wx = null;
  }, { passive: true });
  rahmen.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return; // Strg + Mausrad bzw. Trackpad-Geste
    e.preventDefault(); const [mx, my] = pos(e.clientX, e.clientY); um(Z.f * Math.exp(-e.deltaY / 200), mx, my);
  }, { passive: false });
  // Klick nach einer Zoom-Geste nicht als Knopfdruck/Blättern werten
  rahmen.addEventListener("click", (e) => { if (gezoomtImZug && e.target !== marke) { e.stopPropagation(); e.preventDefault(); gezoomtImZug = false; } }, true);
  return {
    get faktor() { return Z.f; },
    zuruecksetzen: () => setzen(1, 0, 0),
    plus: () => um(Z.f * 1.4, rahmen.clientWidth / 2, rahmen.clientHeight / 2),
    minus: () => um(Z.f / 1.4, rahmen.clientWidth / 2, rahmen.clientHeight / 2),
  };
}
