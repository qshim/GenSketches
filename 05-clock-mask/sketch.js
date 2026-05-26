const fg = '#1697ff';
const bg = '#000';

let panel;

let sizeSlider;
let densitySlider;
let speedSlider;

let sizeLabel;
let densityLabel;
let speedLabel;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  pixelDensity(1);
  noStroke();

  createControls();
}

function draw() {
  background(bg);
  updateLabels();

  const t = millis() / 1000 * speedSlider.value();

  const dotDensity = densitySlider.value();
  const dotScale = sizeSlider.value();

  const step = min(width, height) / dotDensity;
  const dotSize = step * dotScale;

  // Only render the front (top) half of the canvas.
  const yLimit = height / 2;
  for (let y = step / 2; y < yLimit; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const tone = getGenerativeTone(x, y, t);
      const filled = orderedDither(x, y, tone, step);
      drawDot(x, y, dotSize, filled);
    }
  }
}

function getGenerativeTone(x, y, t) {
  const n1 = noise(
    x * 0.0045 + t * 0.72,
    y * 0.0045 + t * 0.48,
    t * 0.38
  );

  const n2 = noise(
    x * 0.011 - t * 0.42,
    y * 0.011 + t * 0.55,
    t * 0.72
  );

  const n3 = noise(
    x * 0.023 + sin(t * 0.7) * 2.0,
    y * 0.023 + cos(t * 0.6) * 2.0,
    t * 0.45
  );

  const wave1 = sin(x * 0.012 + y * 0.007 + t * 2.8);
  const wave2 = sin(x * -0.009 + y * 0.018 + t * 2.1);
  const waveMix = (wave1 + wave2) * 0.5;

  let tone =
    n1 * 0.44 +
    n2 * 0.28 +
    n3 * 0.16 +
    ((waveMix + 1.0) * 0.5) * 0.12;

  tone = smoothstep(0.18, 0.82, tone);

  return constrain(tone, 0, 1);
}

function orderedDither(x, y, tone, step) {
  const bayer = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

  const gx = floor(x / step) % 8;
  const gy = floor(y / step) % 8;

  const threshold = (bayer[gy][gx] + 0.5) / 64.0;

  return tone > threshold;
}

function drawDot(x, y, d, filled) {
  noStroke();
  fill(filled ? fg : bg);
  ellipse(x, y, d, d);
}

function createControls() {
  panel = createDiv();
  panel.position(20, 16);
  panel.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  panel.style('font-size', '11px');
  panel.style('font-weight', '700');
  panel.style('line-height', '1.2');
  panel.style('color', fg);
  panel.style('background', 'rgba(242, 241, 237, 0.72)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');

  sizeLabel = createDiv();
  sizeLabel.parent(panel);

  sizeSlider = createSlider(0.2, 1.0, 0.8, 0.01);
  sizeSlider.parent(panel);
  sizeSlider.size(150);

  densityLabel = createDiv();
  densityLabel.parent(panel);

  densitySlider = createSlider(30, 220, 140, 1);
  densitySlider.parent(panel);
  densitySlider.size(150);

  speedLabel = createDiv();
  speedLabel.parent(panel);

  speedSlider = createSlider(0.1, 3.0, 1.0, 0.01);
  speedSlider.parent(panel);
  speedSlider.size(150);
}

function updateLabels() {
  sizeLabel.html('Ellipse Size: ' + nf(sizeSlider.value(), 1, 2));
  densityLabel.html('Dot Density: ' + densitySlider.value());
  speedLabel.html('Speed: ' + nf(speedSlider.value(), 1, 2));
}

function smoothstep(edge0, edge1, x) {
  x = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('dither_field', 'png');
  }
}
