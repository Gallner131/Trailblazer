// Search module: segment name search and Mapbox place search
window.AppSearch = {
  /**
   * Search segments by name (local, instant)
   * @param {Array} segments - All segments to search
   * @param {string} query - Search query
   * @returns {Array} Filtered segments
   */
  searchSegmentsByName(segments, query) {
    if (!query || query.length < 1) return segments;

    const lowerQuery = query.toLowerCase();
    return segments.filter(seg =>
      seg.name.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
      // Prioritize exact name matches or starts-with matches
      const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return 0;
    });
  },

  /**
   * Search places using Mapbox Geocoding API
   * @param {string} query - Place name or address
   * @param {Object} options - { proximity: [lng, lat], limit: 5 }
   * @returns {Promise<Array>} Array of place results
   */
  async searchPlaces(query, options = {}) {
    if (!query || query.length < 2) return [];

    const {
      proximity = null,
      limit = 5,
      timeout = 5000
    } = options;

    const mapboxToken = window.AppConstants.MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return [];
    }

    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      url += `?access_token=${mapboxToken}`;
      url += `&limit=${limit}`;
      url += `&types=place,address`;

      if (proximity) {
        url += `&proximity=${proximity[0]},${proximity[1]}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Transform Mapbox response to standard format
      return (data.features || []).map(feature => ({
        id: feature.id,
        name: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
        type: feature.place_type?.[0] || 'place'
      }));
    } catch (error) {
      console.error('Mapbox place search failed:', error);
      return [];
    }
  },

  /**
   * Combined search: segments first, then places if needed
   * Searches segment names first, then falls back to place search
   * @param {Array} segments - All segments
   * @param {string} query - Search query
   * @param {Object} options - { proximity: [lng, lat], limit: 10 }
   * @returns {Promise<Object>} { segments: [], places: [] }
   */
  async combinedSearch(segments, query, options = {}) {
    const results = {
      segments: [],
      places: []
    };

    if (!query || query.length < 1) return results;

    // Search segments first (instant, local)
    results.segments = this.searchSegmentsByName(segments, query);

    // If query is 2+ chars and we have fewer than 3 segment matches, also search places
    if (query.length >= 2 && results.segments.length < 3) {
      results.places = await this.searchPlaces(query, options);
    }

    return results;
  },

  /**
   * Debounced search function
   * Useful for real-time search as user types
   */
  createDebouncedSearch(searchFn, delayMs = 300) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      return new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          resolve(searchFn.apply(this, args));
        }, delayMs);
      });
    };
  }
};
