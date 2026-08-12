/**
 * Streak Logic (§21)
 * Current and longest streaks, featured segment runs only
 * Local midnight. 2 automatic freezes. Client-side calculation.
 */

window.AppStreaks = {
  /**
   * Calculate streaks from user's run history
   * @param {Array} runs - user's runs with { segment_id, run_date, segment: {...} }
   * @param {Array} segments - all segments (for featured lookup)
   * @param {string} homeLat - user's home latitude (as 2dp cell)
   * @param {string} homeLng - user's home longitude (as 2dp cell)
   * @returns {Object} - { current, longest, frozenDays }
   */
  calculate(runs, segments, homeLat, homeLng) {
    if (!runs || runs.length === 0) {
      return { current: 0, longest: 0, frozenDays: 0, dates: [] };
    }

    // Build segment lookup
    const segmentMap = {};
    if (segments) {
      segments.forEach(s => {
        segmentMap[s.id] = s;
      });
    }

    // Determine user's cell (rounded to 2dp)
    const userCell = this.getCell(homeLat, homeLng);

    // Get featured run dates only
    const featuredDates = this.getFeaturedRunDates(runs, segmentMap, userCell);

    if (featuredDates.length === 0) {
      return { current: 0, longest: 0, frozenDays: 0, dates: [] };
    }

    // Sort dates ascending
    featuredDates.sort();

    // Calculate streaks with freeze logic
    const { current, longest, frozenDays } = this.calculateStreaksWithFreezes(
      featuredDates
    );

    return { current, longest, frozenDays, dates: featuredDates };
  },

  /**
   * Get cell (2dp rounding) for a coordinate
   * Cell format: "51.50,-0.13" (rounded to 2 decimal places)
   */
  getCell(lat, lng) {
    if (!lat || !lng) return null;
    const cellLat = (Math.round(lat * 100) / 100).toFixed(2);
    const cellLng = (Math.round(lng * 100) / 100).toFixed(2);
    return `${cellLat},${cellLng}`;
  },

  /**
   * Extract dates where user ran the featured segment
   * Featured is determined per cell per day using the same hash as featured.js
   */
  getFeaturedRunDates(runs, segmentMap, userCell) {
    if (!userCell) return [];

    const featuredDates = [];

    runs.forEach(run => {
      const segment = segmentMap ? segmentMap[run.segment_id] : run.segment;
      if (!segment) return;

      // Get the cell for this segment (or use stored cell if available)
      const segmentCell = segment.cell || this.getCell(segment.centre_lat, segment.centre_lng);

      // Only consider runs in the same cell as the user's home
      if (segmentCell !== userCell) return;

      // Determine what was featured on that date in that cell
      // We need other segments in the cell to pick from
      // For now, we'll use a simplified approach: fetch candidates from stored segments
      const candidates = this.getCandidatesForCell(segmentMap, segmentCell);
      const featured = window.AppFeatured.pickForCell(segmentCell, candidates);

      if (featured && featured.id === run.segment_id) {
        featuredDates.push(run.run_date);
      }
    });

    // Remove duplicates (in case user ran same segment twice same day)
    return [...new Set(featuredDates)];
  },

  /**
   * Get candidate segments for a cell (sorted by runner count)
   */
  getCandidatesForCell(segmentMap, cell) {
    if (!segmentMap || !cell) return [];

    const candidates = Object.values(segmentMap).filter(s => s.cell === cell);

    // Sort by runner count descending (quality ranking)
    // For now, just return in order; actual count would come from real data
    return candidates;
  },

  /**
   * Calculate current and longest streaks with 2 automatic freezes
   * Freeze logic: can skip up to 2 consecutive days without breaking streak
   * @param {Array} sortedDates - ascending array of YYYY-MM-DD dates with runs
   * @returns {Object} - { current, longest, frozenDays }
   */
  calculateStreaksWithFreezes(sortedDates) {
    if (sortedDates.length === 0) {
      return { current: 0, longest: 0, frozenDays: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.dateToString(today);

    let current = 0;
    let longest = 0;
    let currentFrozen = 0;
    let longestFrozen = 0;
    let inCurrentStreak = false;

    let lastDate = new Date(sortedDates[0]);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      currentDate.setHours(0, 0, 0, 0);

      if (i === 0) {
        current = 1;
        inCurrentStreak = true;
      } else {
        const dayDiff = this.daysBetween(lastDate, currentDate);

        if (dayDiff === 1) {
          // Consecutive day
          current += 1;
          currentFrozen = 0;
          inCurrentStreak = true;
        } else if (dayDiff <= 3) {
          // Gap of 2 or 3 days (use 1 or 2 freezes)
          const freezesUsed = dayDiff - 1;
          if (currentFrozen + freezesUsed <= 2) {
            // Still within freeze budget
            current += 1;
            currentFrozen += freezesUsed;
            inCurrentStreak = true;
          } else {
            // Exceeded freeze budget, streak breaks
            if (current > longest) {
              longest = current;
              longestFrozen = currentFrozen;
            }
            current = 1;
            currentFrozen = 0;
            inCurrentStreak = true;
          }
        } else {
          // Gap > 3 days, streak definitely breaks
          if (current > longest) {
            longest = current;
            longestFrozen = currentFrozen;
          }
          current = 1;
          currentFrozen = 0;
          inCurrentStreak = true;
        }
      }

      lastDate = currentDate;
    }

    // Check if current streak is still active (last run was today or recent enough)
    const lastRunDate = new Date(sortedDates[sortedDates.length - 1]);
    lastRunDate.setHours(0, 0, 0, 0);
    const daysSinceLastRun = this.daysBetween(lastRunDate, today);

    // Streak is active if last run was today or yesterday (can use freeze for today)
    if (daysSinceLastRun > 2 + currentFrozen) {
      // Streak is broken, move current to longest
      if (current > longest) {
        longest = current;
        longestFrozen = currentFrozen;
      }
      current = 0;
      currentFrozen = 0;
    }

    return {
      current,
      longest,
      frozenDays: currentFrozen
    };
  },

  /**
   * Days between two dates (inclusive start, exclusive end)
   * @param {Date} dateA
   * @param {Date} dateB
   * @returns {number} - number of days (positive if dateB > dateA)
   */
  daysBetween(dateA, dateB) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((dateB - dateA) / msPerDay);
  },

  /**
   * Convert Date to YYYY-MM-DD string
   */
  dateToString(date) {
    return date.toISOString().split('T')[0];
  },

  /**
   * Format streak for display
   * @param {number} days
   * @returns {string} - e.g., "12 days"
   */
  formatStreak(days) {
    if (days === 0) return '0 days';
    if (days === 1) return '1 day';
    return `${days} days`;
  },

  /**
   * Get current streak status for display
   * @param {Object} streakData - from calculate()
   * @returns {Object} - { active, display, daysRemaining }
   */
  getStatus(streakData) {
    const { current, frozenDays } = streakData;

    return {
      active: current > 0,
      display: this.formatStreak(current),
      daysRemaining: Math.max(0, 2 - frozenDays),
      frozenDaysUsed: frozenDays
    };
  }
};
