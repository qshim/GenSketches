const fg = '#1697ff';
const bg = '#000';
const offDot = '#242424';

const fgRgb = [22, 151, 255];
const offRgb = [36, 36, 36];

const MASK_SCALE = 12;
const FONT_FAMILY = "'Inter', Arial, Helvetica, sans-serif";

const TRANSITION_DURATION = 700;
const TRANSITION_SPREAD = 0.42;
const PUSH_DISTANCE_RATIO = 0.9;

let panel;

let colSlider;
let rowSlider;
let sizeSlider;
let lineRowsSlider;
let thresholdSlider;
let lineGapSlider;

let colLabel;
let rowLabel;
let sizeLabel;
let lineRowsLabel;
let thresholdLabel;
let lineGapLabel;
let timeLabelDiv;

let maskPg;

let interReady = false;
let interLoadStarted = false;

let prevTextGrid = null;
let targetTextGrid = null;
let transitionOrder = [];
let transitionStart = 0;
let lastStateKey = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();

  createControls();
  loadInterFontCss();
}

function draw() {
  background(bg);
  updateLabels();

  if (!interReady || !maskPg) {
    drawLoadingState();
    return;
  }

  const cols = colSlider.value();
  const rows = rowSlider.value();
  const dotScale = sizeSlider.value();
  const lineRows = lineRowsSlider.value();
  const threshold = thresholdSlider.value();
  const lineGap = lineGapSlider.value();

  ensureMaskGraphics(cols, rows);

  const line1 = getCurrentTimeLabel();
  const line2 = getCurrentWeekdayLabel();

  const stateKey = [
    'font-ready',
    cols,
    rows,
    lineRows,
    lineGap,
    threshold,
    line1,
    line2
  ].join('|');

  if (stateKey !== lastStateKey) {
    const newGrid = rasterizeTextToGrid(
      cols,
      rows,
      [line1, line2],
      lineRows,
      lineGap,
      threshold
    );

    updateTransitionTarget(newGrid, cols, rows);
    lastStateKey = stateKey;
  }

  drawGridAnimated(cols, rows, dotScale);
  drawMaskDebugPreview();
}

function loadInterFontCss() {
  if (interLoadStarted) {
    return;
  }

  interLoadStarted = true;

  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400&display=swap';
  document.head.appendChild(link);

  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('100 32px Inter'),
      document.fonts.load('200 32px Inter'),
      document.fonts.load('300 32px Inter'),
      document.fonts.load('400 32px Inter'),
      document.fonts.ready
    ]).then(function () {
      initializeAfterFontReady();
    }).catch(function () {
      initializeAfterFontReady();
    });
  } else {
    setTimeout(function () {
      initializeAfterFontReady();
    }, 1200);
  }
}

function initializeAfterFontReady() {
  interReady = true;

  const cols = colSlider ? colSlider.value() : 59;
  const rows = rowSlider ? rowSlider.value() : 63;

  createMaskGraphics(cols, rows);
  resetTextTransition();
}

function resetTextTransition() {
  prevTextGrid = null;
  targetTextGrid = null;
  transitionOrder = [];
  lastStateKey = '';
  transitionStart = millis() - TRANSITION_DURATION;
}

function drawLoadingState() {
  const cols = colSlider ? colSlider.value() : 59;
  const rows = rowSlider ? rowSlider.value() : 63;
  const dotScale = sizeSlider ? sizeSlider.value() : 0.52;

  const tileW = width / cols;
  const tileH = height / rows;
  const d = min(tileW, tileH) * dotScale;

  fill(offRgb[0], offRgb[1], offRgb[2]);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * tileW + tileW * 0.5;
      const cy = y * tileH + tileH * 0.5;
      ellipse(cx, cy, d, d);
    }
  }

  push();
  fill(fg);
  noStroke();
  textFont('Arial, Helvetica, sans-serif');
  textStyle(NORMAL);
  textSize(14);
  textAlign(CENTER, CENTER);
  text('Loading Inter...', width * 0.5, height * 0.5);
  pop();
}

function getCurrentTimeLabel() {
  return nf(hour(), 2) + ':' + nf(minute(), 2);
}

function getCurrentWeekdayLabel() {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const weekdayIndex = new Date().getDay();

  return days[weekdayIndex];
}

function createMaskGraphics(cols, rows) {
  maskPg = createGraphics(cols * MASK_SCALE, rows * MASK_SCALE);
  maskPg.pixelDensity(1);
  maskPg.noSmooth();
}

function ensureMaskGraphics(cols, rows) {
  const targetW = cols * MASK_SCALE;
  const targetH = rows * MASK_SCALE;

  if (!maskPg || maskPg.width !== targetW || maskPg.height !== targetH) {
    createMaskGraphics(cols, rows);
    resetTextTransition();
  }
}

function rasterizeTextToGrid(cols, rows, lines, lineRows, lineGap, threshold) {
  const state = makeEmptyGrid(cols, rows);

  const activeLines = [];

  if (Array.isArray(lines)) {
    for (let i = 0; i < lines.length; i++) {
      const line = String(lines[i] ?? '').trim();

      if (line.length > 0) {
        activeLines.push(line);
      }
    }
  }

  drawTextIntoMask(cols, rows, activeLines, lineRows, lineGap);

  if (activeLines.length === 0) {
    return state;
  }

  maskPg.loadPixels();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const brightness = sampleCellBrightness(x, y);

      if (brightness > threshold) {
        state[y][x] = true;
      }
    }
  }

  return state;
}

function makeEmptyGrid(cols, rows) {
  const grid = [];

  for (let y = 0; y < rows; y++) {
    grid[y] = [];

    for (let x = 0; x < cols; x++) {
      grid[y][x] = false;
    }
  }

  return grid;
}

function cloneGrid(grid) {
  const cloned = [];

  for (let y = 0; y < grid.length; y++) {
    cloned[y] = grid[y].slice();
  }

  return cloned;
}

function updateTransitionTarget(newGrid, cols, rows) {
  if (!targetTextGrid) {
    prevTextGrid = cloneGrid(newGrid);
    targetTextGrid = cloneGrid(newGrid);
    transitionOrder = makeTransitionOrder(cols, rows);
    transitionStart = millis() - TRANSITION_DURATION;
    return;
  }

  prevTextGrid = cloneGrid(targetTextGrid);
  targetTextGrid = cloneGrid(newGrid);
  transitionOrder = makeTransitionOrder(cols, rows);
  transitionStart = millis();
}

function makeTransitionOrder(cols, rows) {
  const order = [];

  for (let y = 0; y < rows; y++) {
    order[y] = [];

    for (let x = 0; x < cols; x++) {
      const pushBase = cols > 1 ? x / (cols - 1) : 0;
      const randomJitter = random(0, 0.28);
      const verticalDrift = rows > 1 ? (y / (rows - 1)) * 0.08 : 0;

      order[y][x] = constrain(
        pushBase * 0.72 + randomJitter + verticalDrift,
        0,
        1
      );
    }
  }

  return order;
}

function drawTextIntoMask(cols, rows, activeLines, lineRows, lineGap) {
  const maskW = cols * MASK_SCALE;
  const maskH = rows * MASK_SCALE;

  maskPg.push();
  maskPg.background(0);
  maskPg.noStroke();
  maskPg.fill(255);

  maskPg.textFont(FONT_FAMILY);
  maskPg.textStyle(NORMAL);
  maskPg.textAlign(CENTER, CENTER);

  if (!Array.isArray(activeLines) || activeLines.length === 0) {
    maskPg.pop();
    return;
  }

  const lineRowsPx = lineRows * MASK_SCALE;
  const lineGapPx = lineGap * MASK_SCALE;

  const totalTextHeight =
    activeLines.length * lineRowsPx +
    max(0, activeLines.length - 1) * lineGapPx;

  const firstCenterY =
    maskH * 0.5 -
    totalTextHeight * 0.5 +
    lineRowsPx * 0.5;

  for (let i = 0; i < activeLines.length; i++) {
    const label = String(activeLines[i] ?? '');

    const fontSize = getFittedFontSize(
      label,
      maskW,
      lineRowsPx
    );

    const y =
      firstCenterY +
      i * (lineRowsPx + lineGapPx);

    setMaskFont(fontSize);
    maskPg.text(label, maskW * 0.5, y);
  }

  maskPg.pop();
}

function setMaskFont(fontSize) {
  const weight = 100;

  maskPg.textFont(FONT_FAMILY);
  maskPg.textStyle(NORMAL);
  maskPg.textSize(fontSize);
  maskPg.drawingContext.font =
    weight + ' ' + fontSize + 'px Inter, Arial, Helvetica, sans-serif';
}

function getFittedFontSize(label, maskW, targetLineH) {
  let fontSize = targetLineH * 0.72;

  setMaskFont(fontSize);

  const maxTextW = maskW * 0.88;
  const textW = maskPg.textWidth(label);

  if (textW > maxTextW && textW > 0) {
    fontSize *= maxTextW / textW;
  }

  return fontSize;
}

function sampleCellBrightness(cellX, cellY) {
  const sx0 = cellX * MASK_SCALE;
  const sy0 = cellY * MASK_SCALE;

  let sum = 0;
  let count = 0;

  for (let yy = 0; yy < MASK_SCALE; yy++) {
    for (let xx = 0; xx < MASK_SCALE; xx++) {
      const px = sx0 + xx;
      const py = sy0 + yy;

      const idx = 4 * (py * maskPg.width + px);

      const r = maskPg.pixels[idx];
      const g = maskPg.pixels[idx + 1];
      const b = maskPg.pixels[idx + 2];

      const brightness = (r + g + b) / 3;

      sum += brightness;
      count++;
    }
  }

  return sum / count;
}

function drawGridAnimated(cols, rows, dotScale) {
  const tileW = width / cols;
  const tileH = height / rows;
  const d = min(tileW, tileH) * dotScale;

  const progress = constrain(
    (millis() - transitionStart) / TRANSITION_DURATION,
    0,
    1
  );

  drawBaseDots(cols, rows, tileW, tileH, d);

  if (!prevTextGrid || !targetTextGrid) {
    return;
  }

  drawChangingDots(cols, rows, tileW, tileH, d, progress);
}

function drawBaseDots(cols, rows, tileW, tileH, d) {
  fill(offRgb[0], offRgb[1], offRgb[2]);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * tileW + tileW * 0.5;
      const cy = y * tileH + tileH * 0.5;

      ellipse(cx, cy, d, d);
    }
  }
}

function drawChangingDots(cols, rows, tileW, tileH, d, progress) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * tileW + tileW * 0.5;
      const cy = y * tileH + tileH * 0.5;

      const prevOn =
        prevTextGrid[y] && prevTextGrid[y][x] ? 1 : 0;

      const nextOn =
        targetTextGrid[y] && targetTextGrid[y][x] ? 1 : 0;

      if (prevOn === 0 && nextOn === 0) {
        continue;
      }

      const order =
        transitionOrder[y] && transitionOrder[y][x] !== undefined
          ? transitionOrder[y][x]
          : 0;

      const local = getLocalTransition(progress, order);

      let alpha = 1;
      let offsetX = 0;

      if (prevOn === 1 && nextOn === 1) {
        alpha = 1;
        offsetX = 0;
      } else if (prevOn === 0 && nextOn === 1) {
        alpha = local;
        offsetX = (1 - local) * tileW * PUSH_DISTANCE_RATIO;
      } else if (prevOn === 1 && nextOn === 0) {
        alpha = 1 - local;
        offsetX = -local * tileW * PUSH_DISTANCE_RATIO;
      }

      if (alpha <= 0.001) {
        continue;
      }

      fill(fgRgb[0], fgRgb[1], fgRgb[2], 255 * alpha);
      ellipse(cx + offsetX, cy, d, d);
    }
  }
}

function getLocalTransition(globalProgress, order) {
  const start = order * TRANSITION_SPREAD;
  const t = constrain(
    (globalProgress - start) / (1 - TRANSITION_SPREAD),
    0,
    1
  );

  return easeInOutCubic(t);
}

function easeInOutCubic(x) {
  if (x < 0.5) {
    return 4 * x * x * x;
  } else {
    return 1 - pow(-2 * x + 2, 3) / 2;
  }
}

function drawMaskDebugPreview() {
  if (!maskPg || !interReady) {
    return;
  }

  const previewW = 130;
  const previewH = previewW * (maskPg.height / maskPg.width);

  const x = 16;
  const y = height - previewH - 16;

  push();

  noStroke();
  fill(0, 210);
  rect(x - 8, y - 24, previewW + 16, previewH + 32, 8);

  fill(fgRgb[0], fgRgb[1], fgRgb[2]);
  textFont(FONT_FAMILY);
  textStyle(NORMAL);
  textSize(11);
  textAlign(LEFT, TOP);
  text('maskPg preview', x, y - 18);

  image(maskPg, x, y, previewW, previewH);

  noFill();
  stroke(fgRgb[0], fgRgb[1], fgRgb[2]);
  strokeWeight(1);
  rect(x, y, previewW, previewH);

  pop();
}

function createControls() {
  panel = createDiv();
  panel.position(20, 16);
  panel.style('font-family', FONT_FAMILY);
  panel.style('font-size', '11px');
  panel.style('font-weight', '300');
  panel.style('line-height', '1.2');
  panel.style('color', fg);
  panel.style('background', 'rgba(0, 0, 0, 0.56)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');

  colLabel = createDiv();
  colLabel.parent(panel);

  colSlider = createSlider(40, 260, 60, 1);
  colSlider.parent(panel);
  colSlider.size(150);

  rowLabel = createDiv();
  rowLabel.parent(panel);

  rowSlider = createSlider(20, 160, 60, 1);
  rowSlider.parent(panel);
  rowSlider.size(150);

  sizeLabel = createDiv();
  sizeLabel.parent(panel);

  sizeSlider = createSlider(0.1, 1.0, 0.50, 0.01);
  sizeSlider.parent(panel);
  sizeSlider.size(150);

  lineRowsLabel = createDiv();
  lineRowsLabel.parent(panel);

  lineRowsSlider = createSlider(4, 80, 30, 1);
  lineRowsSlider.parent(panel);
  lineRowsSlider.size(150);

  lineGapLabel = createDiv();
  lineGapLabel.parent(panel);

  lineGapSlider = createSlider(0, 16, 0, 1);
  lineGapSlider.parent(panel);
  lineGapSlider.size(150);

  thresholdLabel = createDiv();
  thresholdLabel.parent(panel);

  thresholdSlider = createSlider(1, 254, 65, 1);
  thresholdSlider.parent(panel);
  thresholdSlider.size(150);

  timeLabelDiv = createDiv();
  timeLabelDiv.parent(panel);
}

function updateLabels() {
  if (!colLabel || !rowLabel || !sizeLabel || !lineRowsLabel || !lineGapLabel || !thresholdLabel || !timeLabelDiv) {
    return;
  }

  colLabel.html('Columns: ' + colSlider.value());
  rowLabel.html('Rows: ' + rowSlider.value());
  sizeLabel.html('Ellipse Size: ' + nf(sizeSlider.value(), 1, 2));
  lineRowsLabel.html('Line Rows: ' + lineRowsSlider.value());
  lineGapLabel.html('Line Gap: ' + lineGapSlider.value());
  thresholdLabel.html('Threshold: ' + thresholdSlider.value());

  if (interReady) {
    timeLabelDiv.html('Time: ' + getCurrentTimeLabel());
  } else {
    timeLabelDiv.html('Loading Inter...');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (!interReady || !maskPg) {
    return;
  }

  const cols = colSlider ? colSlider.value() : 59;
  const rows = rowSlider ? rowSlider.value() : 63;

  createMaskGraphics(cols, rows);
  resetTextTransition();
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('dot_clock_wait_for_inter_font', 'png');
  }
}