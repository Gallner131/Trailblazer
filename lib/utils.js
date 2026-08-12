(function () {
  const R = 6371000;
  const rad = d => d * Math.PI / 180;

  function haversine(a, b) {
    const dLat = rad(b[0] - a[0]);
    const dLng = rad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function pathLength(coords) {
    let d = 0;
    for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]);
    return d;
  }

  function mmss(sec) {
    sec = Math.max(0, sec);
    let m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    if (s === 60) { m++; s = 0; }
    return m + ':' + String(s).padStart(2, '0');
  }

  const cellOf = (lat, lng) => lat.toFixed(2) + ',' + lng.toFixed(2);

  window.AppUtils = { haversine, pathLength, mmss, cellOf };
})();
