/**
 * Featured Segment Selection (§7, §9)
 * Deterministic daily pick: hash(date + cell_id) mod quality_ranked segments
 * Same cell, same day → same segment for all nearby runners
 */

window.AppFeatured = {
  /**
   * Target times by user level (minutes for a 1km reference)
   * Used to interpolate for each segment distance
   */
  targetPacesPerKm: {
    0: 6.5,   // ~6:30
    1: 5.25,  // ~5:15
    2: 4.25,  // ~4:15
    3: 3.42   // ~3:25
  },

  /**
   * Pick today's featured segment for a cell
   * @param {string} cellId - lat/lng to 2dp, ~1.1 km cell
   * @param {Array} candidates - segments sorted by quality (runners descending)
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
   * Calculate target time (minutes) for a segment by user level
   */
  targetTime(distanceM, userLevel) {
    const distanceKm = distanceM / 1000;
    const pacePerKm = this.targetPacesPerKm[userLevel] || this.targetPacesPerKm[1];
    return distanceKm * pacePerKm;
  },

  /**
   * Format seconds as M:SS
   */
  formatTime(seconds) {
    if (!seconds) return '—';
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }
};
