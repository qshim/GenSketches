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

  // ----- Bottom: a single horizontal line spanning the row width ---
  stroke(fg);
  strokeWeight(1.5);
  line(startX, bottomY, endX, bottomY);
  noStroke();

  // ----- Centre-fixed morphing shape — timeline:
  //   1) EXPAND   width 1×→6×; once width is ~80% expanded, height grows 1×→3×
  //   2) HOLD     stay fully expanded for 3s
  //   3) REWIND   everything eases back to start, then loops
  const STOP_PHASE = 0.38;
  const R_AT_STOP  = 0.494;
  const EXPAND = 1.6;   // seconds to expand
  const HOLD   = 3.0;   // seconds held
  const REWIND = 0.8;   // seconds to rewind (2× faster than expand)
  const TOTAL  = EXPAND + HOLD + REWIND;
  const ease = (x) => (x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2);

  const cyc = t % TOTAL;
  let widthMult, heightMult, expandAmt;
  if (cyc < EXPAND) {
    const p = ease(cyc / EXPAND);
    widthMult = lerp(1, 6, p);
    // height kicks in only after width passes ~80%
    const hp = constrain((p - 0.8) / 0.2, 0, 1);
    heightMult = lerp(1, 3, hp);
    expandAmt = p;
  } else if (cyc < EXPAND + HOLD) {
    widthMult = 6; heightMult = 3; expandAmt = 1;
  } else {
    // Rewind in two steps: height shrinks first, then width.
    const rt = cyc - EXPAND - HOLD;
    const half = REWIND / 2;
    if (rt < half) {
      const p = ease(rt / half);
      widthMult = 6;
      heightMult = lerp(3, 1, p);
      expandAmt = 1;
    } else {
      const p = ease((rt - half) / half);
      widthMult = lerp(6, 1, p);
      heightMult = 1;
      expandAmt = 1 - p;
    }
  }

  const myWidth  = cellSize * widthMult;
  const myHeight = cellSize * heightMult;

  // Roundness: max when small, eases toward R_AT_STOP as it expands.
  const morphT = Math.min(expandAmt / STOP_PHASE, 1);
  const myCornerR = lerp(maxCornerR, maxCornerR * R_AT_STOP, morphT);

  // Colour: blue when small → white when fully expanded.
  const cr = lerp(22, 255, expandAmt);
  const cg = lerp(151, 255, expandAmt);
  const cb = 255;

  // Fixed at the horizontal centre of the canvas.
  const mx = width / 2;
  fill(cr, cg, cb);
  rect(mx, bottomY, myWidth, myHeight, myCornerR);
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
