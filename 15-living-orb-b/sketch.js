// Streamlined (squircle) field of dots illuminated by a light that orbits
// around the perimeter. Dot size + colour come purely from distance to
// the moving light — no built-in 3D shading. Inspired by Galaxy-style
// copper highlight on a dot grid.

const fg = '#1697ff';
const bg = '#000';

let controls = {
  dotGap: 8,
  dotSize: 2.4,
  fieldScale: 0.23,
  fieldExp: 8,
  fieldAspectW: 2.04,
  fieldAspectH: 1.12,
  orbitSpeed: 1.6,
  orbitOutset: 1.14,
  reach: 1.6,
  softness: 1.25,
};

let time = 0;

function loadInterFont() {
  let link = createElement('link');
  link.attribute('rel', 'stylesheet');
  link.attribute('href', 'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap');
  link.parent(document.head);
}

function setup() {
  loadInterFont();
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  noStroke();
  createUI();
}

function draw() {
  background(bg);
  time += 0.018;

  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) * controls.fieldScale;

  drawField(cx, cy, r, time);
}

function drawField(cx, cy, r, t) {
  const halfW = r * controls.fieldAspectW;
  const halfH = r * controls.fieldAspectH;
  const exp = controls.fieldExp;
  const invExp = 2 / exp;

  // Squircle parametric position for a given angle.
  function squirclePoint(a, w, h) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return {
      x: cx + w * Math.sign(ca) * Math.pow(Math.abs(ca), invExp),
      y: cy + h * Math.sign(sa) * Math.pow(Math.abs(sa), invExp)
    };
  }

  // ----- Orbiting light walks the squircle perimeter at CONSTANT linear
  // speed (not constant angular speed). Without this the light shoots
  // across edges and creeps through corners, which feels uneven.
  const orbitHW = halfW * controls.orbitOutset;
  const orbitHH = halfH * controls.orbitOutset;
  const N = 240;
  let totalLen = 0;
  const pts = new Array(N + 1);
  const cum = new Array(N + 1);
  cum[0] = 0;
  for (let s = 0; s <= N; s++) {
    pts[s] = squirclePoint((s / N) * Math.PI * 2, orbitHW, orbitHH);
    if (s > 0) {
      totalLen += Math.hypot(pts[s].x - pts[s - 1].x, pts[s].y - pts[s - 1].y);
      cum[s] = totalLen;
    }
  }
  // Sample the perimeter at a normalised progress 0..1
  function samplePerimeter(progress) {
    const target = (((progress % 1) + 1) % 1) * totalLen;
    let lo = 0, hi = N;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid; else hi = mid;
    }
    const seg = cum[hi] - cum[lo] || 1;
    const tt = (target - cum[lo]) / seg;
    return {
      x: lerp(pts[lo].x, pts[hi].x, tt),
      y: lerp(pts[lo].y, pts[hi].y, tt)
    };
  }

  // Two lights, 180° apart along the perimeter — symmetric, facing each
  // other as they orbit together.
  const progress = ((t * controls.orbitSpeed) / (Math.PI * 2)) % 1;
  const lightA = samplePerimeter(progress);
  const lightB = samplePerimeter(progress + 0.5);
  const lightX = lightA.x;
  const lightY = lightA.y;
  const lightX2 = lightB.x;
  const lightY2 = lightB.y;

  const maxDist = min(halfW, halfH) * controls.reach;
  const gap = controls.dotGap;

  // Angle of the orbiting light measured from the centre — used to make
  // the highlight feel like it emanates inward from the outline edge.
  const lightAngleFromCenter = Math.atan2(lightY - cy, lightX - cx);
  const WEDGE_HALF = Math.PI * 0.55;

  // ----- Dot grid inside the squircle silhouette
  for (let y = -halfH; y <= halfH; y += gap) {
    for (let x = -halfW; x <= halfW; x += gap) {
      // Inside squircle? |x/halfW|^exp + |y/halfH|^exp <= 1
      const nx = x / halfW;
      const ny = y / halfH;
      const inside =
        Math.pow(Math.abs(nx), exp) + Math.pow(Math.abs(ny), exp);
      if (inside > 1.0) continue;

      const px = cx + x;
      const py = cy + y;

      // -- Illumination model (smooth, no per-quadrant artifact) --
      // Use the squircle implicit "radius" t = (|nx|^p + |ny|^p)^(1/p),
      // which is 0 at the centre and 1 exactly on the silhouette — a
      // continuous gradient with no atan2 / sign discontinuity. The light
      // is just a point on the edge; brightness = (proximity to that
      // point) × (proximity to the edge).
      const tSq = Math.pow(
        Math.pow(Math.abs(nx), exp) + Math.pow(Math.abs(ny), exp),
        1 / exp
      ); // 0 centre, 1 edge

      const edgeFactor = Math.pow(tSq, 1.6); // sharper near the rim

      // Two symmetric lights — take the brighter contribution at this dot
      const dEucA = dist(px, py, lightX, lightY);
      const dEucB = dist(px, py, lightX2, lightY2);
      const lightProx = Math.max(
        Math.max(0, 1 - dEucA / maxDist),
        Math.max(0, 1 - dEucB / maxDist)
      );

      const raw = lightProx * edgeFactor;
      const intensity = constrain(Math.pow(raw, controls.softness), 0, 1);

      // Samsung-blue palette (matches the original 15/06 colour scheme)
      const c = orbColor(intensity);

      // Minimum dot size kept visible even outside the light's reach
      const size = map(intensity, 0, 1, controls.dotSize, controls.dotSize * 3.5);
      fill(red(c), green(c), blue(c));
      ellipse(px, py, size, size);
    }
  }
}

// Samsung-blue palette: deep navy at idle → bright blue → hot white at peak.
function orbColor(v) {
  const deep   = color(18, 24, 45);
  const mid    = color(40, 95, 150);
  const bright = color(128, 205, 255);
  const hot    = color(218, 242, 255);
  let c;
  if (v < 0.45) {
    c = lerpColor(deep, mid, map(v, 0, 0.45, 0, 1));
  } else {
    c = lerpColor(mid, bright, map(v, 0.45, 0.88, 0, 1));
  }
  if (v > 0.82) {
    c = lerpColor(c, hot, map(v, 0.82, 1, 0, 0.72));
  }
  return c;
}

// ----- Sliders -----

function createUI() {
  let panel = createDiv();
  panel.position(24, 24);
  panel.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  panel.style('font-size', '11px');
  panel.style('font-weight', '700');
  panel.style('line-height', '1.2');
  panel.style('color', fg);
  panel.style('background', 'rgba(242, 241, 237, 0.72)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');

  addSlider(panel, "dotGap", 6, 22, controls.dotGap, 1);
  addSlider(panel, "dotSize", 1, 6, controls.dotSize, 0.1);
  addSlider(panel, "fieldScale", 0.18, 0.50, controls.fieldScale, 0.01);
  addSlider(panel, "fieldExp", 2.0, 8.0, controls.fieldExp, 0.1);
  addSlider(panel, "fieldAspectW", 0.6, 2.2, controls.fieldAspectW, 0.01);
  addSlider(panel, "fieldAspectH", 0.4, 1.6, controls.fieldAspectH, 0.01);
  addSlider(panel, "orbitSpeed", 0.2, 3.0, controls.orbitSpeed, 0.05);
  addSlider(panel, "orbitOutset", 0.9, 1.4, controls.orbitOutset, 0.01);
  addSlider(panel, "reach", 0.3, 1.8, controls.reach, 0.01);
  addSlider(panel, "softness", 0.2, 2.0, controls.softness, 0.05);
}

function addSlider(parent, key, minVal, maxVal, defaultVal, stepVal) {
  let wrapper = createDiv();
  wrapper.parent(parent);
  wrapper.style("margin-bottom", "8px");
  let label = createDiv(key + ": " + defaultVal);
  label.parent(wrapper);
  label.style("margin-bottom", "2px");
  let slider = createSlider(minVal, maxVal, defaultVal, stepVal);
  slider.parent(wrapper);
  slider.style("width", "150px");
  slider.input(() => {
    controls[key] = slider.value();
    label.html(key + ": " + slider.value());
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
