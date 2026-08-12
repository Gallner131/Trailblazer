// lib/errors.js — no silent failures. A caught-and-discarded Postgres error is
// why the home screen rendered nothing while 626 lines of card code existed.
window.AppErrors = (function () {
  function show(message, onRetry) {
    hide();
    const bar = document.createElement('div');
    bar.className = 'error-bar';
    bar.id = 'appErrorBar';

    const text = document.createElement('span');
    text.textContent = message;
    bar.appendChild(text);

    if (onRetry) {
      const btn = document.createElement('button');
      btn.textContent = 'Retry';
      btn.addEventListener('click', () => { hide(); onRetry(); });
      bar.appendChild(btn);
    }
    document.body.appendChild(bar);
  }

  function hide() {
    const existing = document.getElementById('appErrorBar');
    if (existing) existing.remove();
  }

  // Wrap any Supabase call: const rows = await AppErrors.guard(
  //   () => supabaseClient.from('segments').select('*'), 'Loading segments');
  async function guard(fn, label, onRetry) {
    try {
      const res = await fn();
      if (res && res.error) {
        show(label + ' failed: ' + res.error.message, onRetry);
        return null;
      }
      hide();
      return res ? res.data : null;
    } catch (e) {
      show(label + ' failed: ' + (e && e.message ? e.message : String(e)), onRetry);
      return null;
    }
  }

  return { show, hide, guard };
})();
