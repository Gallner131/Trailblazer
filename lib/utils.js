/**
 * Trailblazer: Utility functions
 * Geometry, formatting, conversions
 */

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in metres
  const φ1 = degreesToRadians(lat1);
  const φ2 = degreesToRadians(lat2);
  const Δφ = degreesToRadians(lat2 - lat1);
  const Δλ = degreesToRadians(lng2 - lng1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(metres) {
  if (metres < 1000) {
    return Math.round(metres) + ' m';
  }
  return (metres / 1000).toFixed(1) + ' km';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
  const hours = Math.floor(mins / 60);
  const minsRem = mins % 60;
  return `${hours}h ${minsRem}m`;
}

function formatPace(seconds, metres) {
  // Pace in min:sec per km
  const paceSeconds = (seconds / metres) * 1000;
  return formatTime(paceSeconds) + '/km';
}

function polylineEncode(points) {
  // Google's polyline encoding algorithm (https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
  let encoded = '';
  let prevLat = 0, prevLng = 0;

  for (const [lat, lng] of points) {
    const dlat = Math.round((lat - prevLat) * 1e5);
    const dlng = Math.round((lng - prevLng) * 1e5);

    [dlat, dlng].forEach(val => {
      let v = val << 1;
      v = v < 0 ? ~v : v;
      while (v >= 0x20) {
        encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      encoded += String.fromCharCode(v + 63);
    });

    prevLat = lat;
    prevLng = lng;
  }
  return encoded;
}

function polylineDecode(encoded) {
  // Decode Google polyline
  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let result = 0, shift = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function isPointInBounds(lat, lng, bounds) {
  // bounds = { minLat, minLng, maxLat, maxLng }
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Export to window
window.AppUtils = {
  degreesToRadians,
  haversine,
  formatDistance,
  formatTime,
  formatPace,
  polylineEncode,
  polylineDecode,
  isPointInBounds,
  getInitials
};
