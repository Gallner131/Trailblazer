/**
 * Trailblazer: API module
 * Supabase CRUD, Mapbox geocoding, Overpass queries
 */

const API = {};

// Timeout wrapper for any promise
API.withTimeout = async (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`API call timed out after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

// Get profile for current user
API.getProfile = async (userId) => {
  const promise = window.supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Update profile fields
API.updateProfile = async (userId, updates) => {
  const promise = window.supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  return { data, error };
};

// Get segments in viewport bounds
// bounds = { minLat, minLng, maxLat, maxLng }
API.getSegmentsInBounds = async (bounds, limit = 200) => {
  const promise = window.supabaseClient
    .from('segments')
    .select('*')
    .gte('centre_lat', bounds.minLat)
    .lte('centre_lat', bounds.maxLat)
    .gte('centre_lng', bounds.minLng)
    .lte('centre_lng', bounds.maxLng)
    .limit(limit);

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Get runs for a segment today (for badge count)
API.getRunsForSegmentToday = async (segmentId) => {
  const today = new Date().toISOString().split('T')[0];
  const promise = window.supabaseClient
    .from('runs')
    .select('id, user_id, seconds, level, created_at')
    .eq('segment_id', segmentId)
    .eq('run_date', today);

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Get board for a segment today, filtered by level
API.getSegmentBoardToday = async (segmentId, level = null) => {
  const today = new Date().toISOString().split('T')[0];
  let query = window.supabaseClient
    .from('runs')
    .select(`
      id, seconds, level, user_id,
      profiles(id, display_name)
    `)
    .eq('segment_id', segmentId)
    .eq('run_date', today)
    .order('seconds', { ascending: true });

  if (level !== null) {
    query = query.eq('level', level);
  }

  const { data, error } = await API.withTimeout(query, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Insert a new run
API.postRun = async (segmentId, userId, seconds, level) => {
  const today = new Date().toISOString().split('T')[0];
  const promise = window.supabaseClient
    .from('runs')
    .insert({
      segment_id: segmentId,
      user_id: userId,
      seconds: seconds,
      level: level,
      run_date: today,
      ranked: true
    });

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Insert segments (from Overpass harvest)
API.insertSegments = async (segments) => {
  const promise = window.supabaseClient
    .from('segments')
    .insert(segments);

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Mapbox Geocoding: forward search
API.geocodePlace = async (query) => {
  const url = new URL(window.AppConstants.MAPBOX_GEOCODING_API + '/' + encodeURIComponent(query) + '.json');
  url.searchParams.set('access_token', window.AppConstants.MAPBOX_TOKEN);
  url.searchParams.set('limit', '5');

  const promise = fetch(url.toString())
    .then(r => {
      if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
      return r.json();
    })
    .then(body => {
      if (!body.features) throw new Error('Invalid geocoding response');
      return body.features;
    });

  try {
    const data = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.geocode);
    return { data };
  } catch (error) {
    return { error };
  }
};

// Mapbox Geocoding: reverse (coords to place name)
API.reverseGeocode = async (lat, lng) => {
  const url = new URL(window.AppConstants.MAPBOX_GEOCODING_API + '/' + lng + ',' + lat + '.json');
  url.searchParams.set('access_token', window.AppConstants.MAPBOX_TOKEN);
  url.searchParams.set('limit', '1');

  const promise = fetch(url.toString())
    .then(r => {
      if (!r.ok) throw new Error(`Reverse geocoding failed: ${r.status}`);
      return r.json();
    })
    .then(body => {
      if (!body.features || body.features.length === 0) {
        throw new Error('No place name found');
      }
      return body.features[0];
    });

  try {
    const data = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.geocode);
    return { data };
  } catch (error) {
    return { error };
  }
};

// Get a single segment by ID
API.getSegment = async (segmentId) => {
  const promise = window.supabaseClient
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .single();

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Submit a report for a segment
API.submitSegmentReport = async (segmentId, userId, reason, detail = '') => {
  const promise = window.supabaseClient
    .from('segment_reports')
    .insert({
      segment_id: segmentId,
      user_id: userId,
      reason: reason,
      detail: detail || null
    });

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Get user's reports for segments (to know which to hide for them)
API.getUserSegmentReports = async (userId) => {
  const promise = window.supabaseClient
    .from('segment_reports')
    .select('segment_id, reason')
    .eq('user_id', userId);

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  if (error) return { error };
  return { data };
};

// Check if current user has reported a segment
API.hasUserReportedSegment = async (segmentId, userId) => {
  const promise = window.supabaseClient
    .from('segment_reports')
    .select('id')
    .eq('segment_id', segmentId)
    .eq('user_id', userId)
    .single();

  const { data, error } = await API.withTimeout(promise, window.AppConstants.TIMEOUTS.api);
  // No error means a report exists
  return !error;
};

// Export to window
window.AppAPI = API;
