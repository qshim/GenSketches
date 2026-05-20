const fg = '#1697ff';
const bg = '#000';

let orbRadius;
let dotGap = 7;
let dotSize = 4.4;

let time = 0;

let controls = {
  lightMode: "diagonal",
  dotGap: 12,
  dotSize: 3,
  orbScale: 0.25,
  highlightStrength: 1.5,
  shadowStrength: 0.56,
  waveFrequency: 2,
  waveAmplitude: 0.6,
  noiseScale: 0.2,
  noiseStrength: 0.12,
  processingSpeed: 0.018,
  glowStrength: 0,
  showPalette: false
};

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

  time += controls.processingSpeed;

  orbRadius = min(width, height) * controls.orbScale;
  dotGap = controls.dotGap;
  dotSize = controls.dotSize;

  let cx = width * 0.5;
  let cy = height * 0.5;

  if (controls.showPalette) {
    drawProcessPalette(cx, cy);
  } else {
    drawOrb(cx, cy, orbRadius, time, controls.lightMode);
  }
}

function drawOrb(cx, cy, r, t, lightMode) {
  drawOuterGlow(cx, cy, r, t);

  let light = getLightDirection(t, lightMode);

  for (let y = -r; y <= r; y += dotGap) {
    for (let x = -r; x <= r; x += dotGap) {
      let nx = x / r;
      let ny = y / r;
      let d2 = nx * nx + ny * ny;

      if (d2 > 1.0) continue;

      let z = sqrt(1.0 - d2);

      let normal = createVector(nx, ny, z);
      normal.normalize();

      let diffuse = max(0, normal.dot(light));

      let rim = pow(1.0 - z, 2.2);
      let coreDepth = pow(z, 0.8);

      let wave = sin(
        nx * controls.waveFrequency +
        ny * controls.waveFrequency * 0.65 +
        t * 7.0
      );

      let radialWave = sin(
        sqrt(d2) * controls.waveFrequency * 3.2 -
        t * 9.0
      );

      let n = noise(
        nx * controls.noiseScale + 50,
        ny * controls.noiseScale + 80,
        t * 0.7
      );

      let processing =
        0.5 +
        wave * controls.waveAmplitude +
        radialWave * controls.waveAmplitude * 0.45 +
        (n - 0.5) * controls.noiseStrength;

      let lightValue =
        diffuse * controls.highlightStrength +
        coreDepth * 0.34 -
        rim * controls.shadowStrength +
        processing * 0.38;

      lightValue = constrain(lightValue, 0, 1);

      let alphaMask = smoothEdge(d2);
      let px = cx + x;
      let py = cy + y;

      let sizePulse = map(processing, 0, 1, 0.72, 1.35);
      let finalSize = dotSize * sizePulse * alphaMask;

      let c = orbColor(lightValue, diffuse, rim, n);

      fill(red(c), green(c), blue(c), 230 * alphaMask);
      circle(px, py, finalSize);
    }
  }
}

function getLightDirection(t, lightMode) {
  let lx, ly, lz;

  if (lightMode === "diagonal") {
    let s = sin(t * 1.4);
    lx = map(s, -1, 1, -0.75, 0.75);
    ly = map(s, -1, 1, -0.75, 0.75);
    lz = 0.82;
  } else {
    let a = t * 1.2;
    lx = cos(a) * 0.85;
    ly = sin(a * 0.85) * 0.55;
    lz = 0.45 + sin(a) * 0.42;
  }

  let light = createVector(lx, ly, lz);
  light.normalize();

  return light;
}

function orbColor(v, diffuse, rim, n) {
  let deep = color(18, 24, 45);
  let mid = color(40, 95, 150);
  let bright = color(128, 205, 255);
  let hot = color(218, 242, 255);

  let c;

  if (v < 0.45) {
    c = lerpColor(deep, mid, map(v, 0, 0.45, 0, 1));
  } else {
    c = lerpColor(mid, bright, map(v, 0.45, 0.88, 0, 1));
  }

  if (diffuse > 0.82 && n > 0.42) {
    c = lerpColor(c, hot, map(diffuse, 0.82, 1, 0, 0.72));
  }

  if (rim > 0.55) {
    c = lerpColor(c, color(8, 11, 22), map(rim, 0.55, 1, 0.0, 0.42));
  }

  return c;
}

function smoothEdge(d2) {
  let d = sqrt(d2);
  return 1.0 - smoothstep(0.86, 1.0, d);
}

function smoothstep(edge0, edge1, x) {
  let t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3.0 - 2.0 * t);
}

function drawOuterGlow(cx, cy, r, t) {
  push();
  blendMode(ADD);

  for (let i = 0; i < 7; i++) {
    let a = map(i, 0, 6, 38, 0) * controls.glowStrength;
    let rr = r * map(i, 0, 6, 1.02, 1.42);

    fill(40, 130, 255, a);
    circle(cx, cy, rr * 2);
  }

  pop();
}

function drawProcessPalette(cx, cy) {
  let count = 5;
  let margin = min(width, height) * 0.09;
  let availableW = width - margin * 2;
  let smallR = min(availableW / count * 0.32, height * 0.18);

  let startX = width * 0.5 - (count - 1) * smallR * 1.55;
  let y = height * 0.5;

  for (let i = 0; i < count; i++) {
    let phase = i / (count - 1);
    let localT = phase * TWO_PI * 0.85;
    let x = startX + i * smallR * 3.1;

    drawOrb(x, y, smallR, localT, controls.lightMode);

    push();
    fill(230, 236, 255, 130);
    textAlign(CENTER, CENTER);
    textSize(11);
    text("phase " + nf(i + 1, 2), x, y + smallR + 34);
    pop();
  }
}

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

  addSlider(panel, "dotGap", 4, 14, controls.dotGap, 1);
  addSlider(panel, "dotSize", 1, 8, controls.dotSize, 0.1);
  addSlider(panel, "orbScale", 0.18, 0.48, controls.orbScale, 0.01);
  addSlider(panel, "highlightStrength", 0.6, 2.5, controls.highlightStrength, 0.01);
  addSlider(panel, "shadowStrength", 0.0, 1.4, controls.shadowStrength, 0.01);
  addSlider(panel, "waveFrequency", 1, 18, controls.waveFrequency, 0.1);
  addSlider(panel, "waveAmplitude", 0, 0.8, controls.waveAmplitude, 0.01);
  addSlider(panel, "noiseScale", 0.2, 5.0, controls.noiseScale, 0.1);
  addSlider(panel, "noiseStrength", 0, 1, controls.noiseStrength, 0.01);
  addSlider(panel, "processingSpeed", 0.002, 0.06, controls.processingSpeed, 0.001);
  addSlider(panel, "glowStrength", 0, 1.5, controls.glowStrength, 0.01);
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

function keyPressed() {
  if (key === "1") {
    controls.lightMode = "diagonal";
  }

  if (key === "2") {
    controls.lightMode = "orbit";
  }

  if (key === "p" || key === "P") {
    controls.showPalette = !controls.showPalette;
  }

  if (key === "s" || key === "S") {
    saveCanvas("ai-processing-orb", "png");
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}