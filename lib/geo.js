(function () {
  const R = 6371000;
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;

  function bearing(a, b) {
    const dLng = rad(b[1] - a[1]);
    const y = Math.sin(dLng) * Math.cos(rad(b[0]));
    const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
              Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(dLng);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }

  function destination(p, brgDeg, dist) {
    const br = rad(brgDeg), d = dist / R, la = rad(p[0]), lo = rad(p[1]);
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) +
                          Math.cos(la) * Math.sin(d) * Math.cos(br));
    const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la),
                                Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return [deg(la2), deg(lo2)];
  }

  function gateAt(point, brgDeg, halfWidth = 30) {
    return [destination(point, brgDeg + 90, halfWidth),
            destination(point, brgDeg - 90, halfWidth)];
  }

  function intersect(p1, p2, q1, q2) {
    const x1 = p1[1], y1 = p1[0], x2 = p2[1], y2 = p2[0];
    const x3 = q1[1], y3 = q1[0], x4 = q2[1], y4 = q2[0];
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-14) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { lat: y1 + t * (y2 - y1), lng: x1 + t * (x2 - x1), t };
  }

  function crossingTime(fixA, fixB, t) {
    return fixA.t + (fixB.t - fixA.t) * t;
  }

  window.AppGeo = { bearing, destination, gateAt, intersect, crossingTime };
})();
