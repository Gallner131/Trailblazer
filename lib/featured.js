/**
 * Featured Segment Selection (§7)
 * Deterministic daily pick: hash(date + cell_id) mod quality_ranked segments
 * Same cell, same day → same segment for all nearby runners
 */

window.AppFeatured = {
  /**
   * Pick today's featured segment for a cell
   * @param {string} cellId - lat/lng to 2dp, ~1.1 km cell
   * @param {Array} candidates - segments with hidden=false, approved=true, quality in top half
   * @returns {Object|null} - featured segment or null if none
   */
  pickForCell(cellId, candidates) {
    if (!candidates || candidates.length === 0) return null;

    const today = new Date().toISOString().slice(0, 10);
    const hash = this.simpleHash(today + cellId);
    const idx = hash % candidates.length;
    return candidates[idx];
  },

  /**
   * Simple deterministic hash (djb2)
   */
  simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    return Math.abs(hash);
  },

  /**
   * Format segment for card display
   */
  cardHTML(seg, userLevel, userBest, runnersToday) {
    const levelPaces = { 0: '6:30', 1: '5:15', 2: '4:15', 3: '3:25' };
    const pace = levelPaces[userLevel] || '5:15';

    let climb = '';
    if (seg.climb_m) {
      climb = `<div style="font-size:12px;color:#6E7681;">↑ ${seg.climb_m}m</div>`;
    }

    let userBestHTML = '';
    if (userBest) {
      const min = Math.floor(userBest / 60);
      const sec = userBest % 60;
      userBestHTML = `<div style="font-size:11px;color:#6E7681;margin-top:4px;">Best: ${min}:${String(sec).padStart(2, '0')}</div>`;
    }

    let runnersHTML = '';
    if (runnersToday && runnersToday > 0) {
      runnersHTML = `<div style="font-size:11px;color:#6E7681;margin-top:4px;">${runnersToday} runner${runnersToday === 1 ? '' : 's'}</div>`;
    }

    const distance = (seg.length_m / 1000).toFixed(2);
    const surface = seg.surface ? `<div style="font-size:11px;color:#9AA1AC;">${seg.surface}</div>` : '';

    return `
      <div style="position:relative;margin:16px;padding:16px;background:#fff;border-radius:12px;border:1px solid #E7E9ED;">
        <div style="font-size:11px;font-family:'Inter Tight';font-weight:700;color:#6E7681;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">TODAY</div>
        <h3 style="margin:0 0 8px 0;font-family:'Inter Tight';font-weight:700;font-size:16px;">${seg.name}</h3>
        <div style="font-size:12px;color:#6E7681;margin-bottom:8px;">${seg.highway === 'footway' ? 'Path' : seg.highway === 'path' ? 'Trail' : 'Road'}</div>
        <div style="display:flex;gap:16px;font-size:12px;color:#6E7681;margin-bottom:12px;">
          <div>${distance} km</div>
          ${climb}
          ${surface}
        </div>
        <div style="background:#F3F4F6;padding:12px;border-radius:8px;margin-bottom:12px;">
          <div style="font-size:11px;color:#6E7681;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your target</div>
          <div style="font-size:24px;font-family:'Inter Tight';font-weight:700;">${pace}/km</div>
        </div>
        ${runnersHTML}
        ${userBestHTML}
        <button id="runBtn" style="width:100%;margin-top:12px;padding:12px;background:#FF4B12;color:#fff;border:0;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;min-height:44px;">Run this</button>
      </div>
    `;
  }
};
