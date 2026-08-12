// lib/tap.js — MUST load before every other script on every page.
// Mapbox GL swallows touch sequences for pan and pinch, so a tap that moves a
// few pixels never resolves to a click. A mouse fires click cleanly, which is
// why the app works on a laptop and not on a phone.
(function () {
  const MOVE_LIMIT = 10;   // px — more than this is a pan, not a tap
  const TIME_LIMIT = 700;  // ms — longer than this is a press, not a tap

  const native = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, handler, opts) {
    if (type !== 'click' || typeof handler !== 'function') {
      return native.call(this, type, handler, opts);
    }

    native.call(this, type, handler, opts);

    let sx = 0, sy = 0, st = 0, active = false;

    native.call(this, 'pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;   // mouse already gets click
      sx = e.clientX; sy = e.clientY; st = Date.now(); active = true;
    }, { passive: true });

    native.call(this, 'pointerup', (e) => {
      if (e.pointerType === 'mouse' || !active) return;
      active = false;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE_LIMIT) return;
      if (Date.now() - st > TIME_LIMIT) return;
      e.preventDefault();
      handler.call(this, e);
    }, { passive: false });

    native.call(this, 'pointercancel', () => { active = false; }, { passive: true });
  };
})();
