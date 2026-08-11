/**
 * Trailblazer: Constants
 * Supabase, Mapbox, and API configuration
 */

const SUPABASE_URL = 'https://ttrhmwjnegnbnovnwlzo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wJyTy7emvg4M4EKIkd320Q_uwZFZ6xM';
const MAPBOX_TOKEN = 'pk.stub_for_testing'; // REPLACE with real token from https://account.mapbox.com/tokens/

const TIMEOUTS = {
  api: 5000,        // 5s for Supabase CRUD
  geocode: 5000,    // 5s for Mapbox geocoding
  overpass: 30000,  // 30s for Overpass (can be slow)
  location: 10000   // 10s for geolocation
};

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const MAPBOX_GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Export for use in modules
window.AppConstants = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MAPBOX_TOKEN,
  TIMEOUTS,
  OVERPASS_API,
  MAPBOX_GEOCODING_API
};
