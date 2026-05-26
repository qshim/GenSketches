// 20 instances of a rounded-rectangle "circle" laid out left → right,
// centered on the canvas. When packed tightly with max roundness, the
// row reads as one long rectangle composed of identical circular units.

const fg = '#1697ff';
const bg = '#000';

let panel;
let countSlider, countLabel;
let sizeSlider, sizeLabel;
let spacingSlider, spacingLabel;
let roundSlider, roundLabel;
let pulseSlider, pulseLabel;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();
  rectMode(CENTER);
  createControls();
}

function draw() {
  background(bg);
  updateLabels();

  const count    = countSlider.value();
  const baseSize = sizeSlider.value();
  const spacing  = spacingSlider.value();
  const round    = roundSlider.value();
  const pulseAmt = pulseSlider.value();

  const t = millis() / 1000;
  const breath = 1 + Math.sin(t * 1.4) * 0.05 * pulseAmt;
  const cellSize = baseSize * breath;

  const step   = cellSize * spacing;
  const totalW = step * (count - 1);
  const startX = width / 2 - totalW / 2;
  const endX   = startX + totalW;

  // Lift the whole composition a touch above centre — bottom row sits below.
  const topY    = height * 0.42;
  const bottomY = height * 0.62;

  const maxCornerR = (cellSize / 2) * round;

  // ----- Top row: instances, filled, roundness morphs L → R --------
  fill(fg);
  noStroke();
  for (let i = 0; i < count; i++) {
    const x = startX + i * step;
    const tRound = count > 1 ? i / (count - 1) : 0;
    const thisCornerR = maxCornerR * (1 - tRound);
    rect(x, topY, cellSize, cellSize, thisCornerR);
  }

  // ----- Bottom: a single horizontal line spanning the row width ---
  stroke(fg);
  strokeWeight(1.5);
  line(startX, bottomY, endX, bottomY);
  noStroke();

  // ----- Moving object on the line — bounces left↔right, roundness
  //       morphs from max (left end) to 0 (right end) along its path
  const period = 4.2;
  const phase  = (Math.sin(t * (Math.PI * 2 / period)) + 1) / 2; // 0..1
  const mx = lerp(startX, endX, phase);
  const myCornerR = maxCornerR * (1 - phase);

  fill(fg);
  rect(mx, bottomY, cellSize, cellSize, myCornerR);
}

// ----- Controls -----

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

  countLabel = createDiv(); countLabel.parent(panel);
  countSlider = createSlider(1, 60, 8, 1);
  countSlider.parent(panel); countSlider.size(150);

  sizeLabel = createDiv(); sizeLabel.parent(panel);
  sizeSlider = createSlider(8, 120, 80, 1);
  sizeSlider.parent(panel); sizeSlider.size(150);

  spacingLabel = createDiv(); spacingLabel.parent(panel);
  spacingSlider = createSlider(0.5, 2.0, 1.5, 0.01);
  spacingSlider.parent(panel); spacingSlider.size(150);

  roundLabel = createDiv(); roundLabel.parent(panel);
  roundSlider = createSlider(0.0, 1.0, 1.0, 0.01);
  roundSlider.parent(panel); roundSlider.size(150);

  pulseLabel = createDiv(); pulseLabel.parent(panel);
  pulseSlider = createSlider(0.0, 1.0, 0.0, 0.01);
  pulseSlider.parent(panel); pulseSlider.size(150);
}

function updateLabels() {
  if (!countLabel) return;
  countLabel.html('Instances: ' + countSlider.value());
  sizeLabel.html('Cell Size: ' + sizeSlider.value() + 'px');
  spacingLabel.html('Spacing (×size): ' + nf(spacingSlider.value(), 1, 2));
  roundLabel.html('Roundness: ' + nf(roundSlider.value(), 1, 2));
  pulseLabel.html('Breath: ' + nf(pulseSlider.value(), 1, 2));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
