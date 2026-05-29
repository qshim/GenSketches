// 18-column grid of cards (each 2/3/4 columns wide). Press SPACE (or any
// key) and they flow into a uniform-width ring, slowly rotate, then
// settle back into a fresh random grid.

const COLS = 18;
const ROWS = 12;
const BG = 245;
const PALETTE = [
  '#1697ff', // samsung blue
  '#ff8a3d', // warm orange
  '#2a2a3d', // dark navy
  '#ffffff', // white
  '#6a4cf0', // purple
  '#3dd68c', // mint green
  '#ff5468', // coral
  '#f4eddb', // cream
  '#0072f5', // deep blue
  '#cbe1ff'  // pale blue
];

const N = 14;
const TRANSITION_MS = 900;
const CIRCLE_HOLD_MS = 5000;
const RING_RADIUS_FRAC = 0.30;
const RING_CARD_W_FRAC = 0.085;     // uniform width as fraction of min(w,h)

let cards = [];
let mode = 'grid';                  // 'grid' | 'toCircle' | 'circle' | 'toGrid'
let modeStartMs = 0;
let rotation = 0;

let hintEl;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  rectMode(CORNER);
  buildCards();
  layoutGrid();
  layoutCircle();
  createHint();
}

function draw() {
  background(BG);

  const t = millis();
  const elapsed = t - modeStartMs;

  if (mode === 'grid') {
    drawCards((c) => ({
      x: c.gridX, y: c.gridY, w: c.gridW, h: c.gridH, angle: c.gridAngle
    }));
  }
  else if (mode === 'toCircle') {
    const p = constrain(elapsed / TRANSITION_MS, 0, 1);
    const e = easeInOut(p);
    drawCards((c) => ({
      x: lerp(c.gridX, c.circleX, e),
      y: lerp(c.gridY, c.circleY, e),
      w: lerp(c.gridW, c.circleW, e),
      h: lerp(c.gridH, c.circleH, e),
      angle: lerp(c.gridAngle, 0, e)
    }));
    if (p >= 1) { mode = 'circle'; modeStartMs = t; rotation = 0; }
  }
  else if (mode === 'circle') {
    rotation += 0.006; // gentle drift
    const cx = width / 2;
    const cy = height / 2;
    drawCards((c) => {
      const a = c.circleAngle + rotation;
      return {
        x: cx + cos(a) * c.circleRadius - c.circleW / 2,
        y: cy + sin(a) * c.circleRadius - c.circleH / 2,
        w: c.circleW,
        h: c.circleH,
        angle: 0
      };
    });
    if (elapsed > CIRCLE_HOLD_MS) {
      // Capture current ring positions as starting transform
      for (const c of cards) {
        const a = c.circleAngle + rotation;
        c.fromX = width / 2 + cos(a) * c.circleRadius - c.circleW / 2;
        c.fromY = height / 2 + sin(a) * c.circleRadius - c.circleH / 2;
        c.fromW = c.circleW;
        c.fromH = c.circleH;
      }
      // Re-shuffle into a fresh random grid
      layoutGrid();
      mode = 'toGrid';
      modeStartMs = t;
    }
  }
  else if (mode === 'toGrid') {
    const p = constrain(elapsed / TRANSITION_MS, 0, 1);
    const e = easeInOut(p);
    drawCards((c) => ({
      x: lerp(c.fromX, c.gridX, e),
      y: lerp(c.fromY, c.gridY, e),
      w: lerp(c.fromW, c.gridW, e),
      h: lerp(c.fromH, c.gridH, e),
      angle: lerp(0, c.gridAngle, e)
    }));
    if (p >= 1) { mode = 'grid'; modeStartMs = t; }
  }
}

// ----- Card creation & layout -----

function buildCards() {
  cards = [];
  const spans = [2, 2, 3, 3, 3, 4];
  for (let i = 0; i < N; i++) {
    cards.push({
      colSpan: random(spans),
      rowSpan: random(spans),
      color: PALETTE[i % PALETTE.length],
      gridAngleSeed: random(-0.06, 0.06)
    });
  }
}

function layoutGrid() {
  const cellW = width / COLS;
  const cellH = height / ROWS;
  for (const c of cards) {
    const maxCol = COLS - c.colSpan;
    const maxRow = ROWS - c.rowSpan;
    c.gridCol = floor(random(0, maxCol + 1));
    c.gridRow = floor(random(0, maxRow + 1));
    c.gridX = c.gridCol * cellW;
    c.gridY = c.gridRow * cellH;
    c.gridW = c.colSpan * cellW;
    c.gridH = c.rowSpan * cellH;
    c.gridAngle = c.gridAngleSeed;
  }
}

function layoutCircle() {
  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) * RING_RADIUS_FRAC;
  const cardSize = min(width, height) * RING_CARD_W_FRAC;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const a = (i / cards.length) * TWO_PI - HALF_PI;
    c.circleAngle = a;
    c.circleRadius = r;
    c.circleW = cardSize;
    c.circleH = cardSize;
    c.circleX = cx + cos(a) * r - cardSize / 2;
    c.circleY = cy + sin(a) * r - cardSize / 2;
  }
}

// ----- Drawing -----

function drawCards(transformFn) {
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const t = transformFn(c, i);
    push();
    translate(t.x + t.w / 2, t.y + t.h / 2);
    if (t.angle) rotate(t.angle);
    translate(-t.w / 2, -t.h / 2);
    drawShadow(t.w, t.h);
    fill(c.color);
    rect(0, 0, t.w, t.h, min(t.w, t.h) * 0.10);
    pop();
  }
}

function drawShadow(w, h) {
  noStroke();
  fill(0, 0, 0, 22);
  rect(2, 4, w, h, min(w, h) * 0.10);
}

// ----- Mode trigger -----

function keyPressed() {
  if (mode !== 'grid') return;
  layoutCircle();
  modeStartMs = millis();
  mode = 'toCircle';
  hideHint();
}

function mousePressed() {
  if (mode !== 'grid') return;
  if (hintEl) {
    const r = hintEl.elt.getBoundingClientRect();
    if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) return;
  }
  layoutCircle();
  modeStartMs = millis();
  mode = 'toCircle';
  hideHint();
}

function createHint() {
  hintEl = createDiv('press any key — grid → ring → grid');
  hintEl.style('position', 'fixed');
  hintEl.style('left', '50%');
  hintEl.style('bottom', '32px');
  hintEl.style('transform', 'translateX(-50%)');
  hintEl.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  hintEl.style('font-size', '12px');
  hintEl.style('font-weight', '500');
  hintEl.style('letter-spacing', '.08em');
  hintEl.style('color', '#666');
  hintEl.style('background', 'rgba(255,255,255,0.85)');
  hintEl.style('padding', '8px 14px');
  hintEl.style('border-radius', '999px');
  hintEl.style('pointer-events', 'none');
}

function hideHint() {
  if (hintEl) hintEl.style('display', 'none');
}

// ----- Easing -----

function easeInOut(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutGrid();
  layoutCircle();
}
