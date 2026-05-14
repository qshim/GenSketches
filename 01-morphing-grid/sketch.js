const fg = '#1697ff';
const bg = '#000';

let currentGrid;
let targetGrid;

let nextChangeTime = 0;

let smoothing = 0.018;

let colSlider, rowSlider, speedSlider, freqSlider, angleSlider;
let colLabel, rowLabel, speedLabel, freqLabel, angleLabel;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();

  currentGrid = makeRandomGrid();
  targetGrid = makeRandomGrid();

  createControls();
  scheduleNextChange();
}

function draw() {
  background(bg);

  if (millis() > nextChangeTime) {
    targetGrid = makeRandomGrid();
    scheduleNextChange();
  }

  softenGridValues();

  let controlledGrid = {
    cols: colSlider.value(),
    rows: rowSlider.value(),
    circleScale: currentGrid.circleScale,
    speed: speedSlider.value(),
    waveAmpX: currentGrid.waveAmpX,
    waveAmpY: currentGrid.waveAmpY,
    waveFreqX: freqSlider.value(),
    waveFreqY: freqSlider.value(),
    driftAmount: currentGrid.driftAmount,
    flowScale: currentGrid.flowScale,
    phase: currentGrid.phase,
    angle: angleSlider.value()
  };

  drawFloatingCircleGrid(controlledGrid);

  updateLabels(
    controlledGrid.cols,
    controlledGrid.rows,
    controlledGrid.speed,
    controlledGrid.waveFreqX,
    controlledGrid.angle
  );
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  currentGrid = makeRandomGrid();
  targetGrid = makeRandomGrid();

  scheduleNextChange();
}

function makeRandomGrid() {
  return {
    cols: 8,
    rows: 8,

    circleScale: random(0.36, 0.72),

    speed: random(0.004, 0.012),

    waveAmpX: random(10, 26),
    waveAmpY: random(8, 22),

    waveFreqX: random(0.28, 0.52),
    waveFreqY: random(0.22, 0.46),

    driftAmount: random(6, 18),
    flowScale: random(0.0018, 0.0045),

    phase: random(TWO_PI),
    angle: random(360)
  };
}

function scheduleNextChange() {
  nextChangeTime = millis() + random(4000, 6500);
}

function softenGridValues() {
  currentGrid.circleScale += smoothing * (targetGrid.circleScale - currentGrid.circleScale);

  currentGrid.speed += smoothing * (targetGrid.speed - currentGrid.speed);

  currentGrid.waveAmpX += smoothing * (targetGrid.waveAmpX - currentGrid.waveAmpX);
  currentGrid.waveAmpY += smoothing * (targetGrid.waveAmpY - currentGrid.waveAmpY);

  currentGrid.waveFreqX += smoothing * (targetGrid.waveFreqX - currentGrid.waveFreqX);
  currentGrid.waveFreqY += smoothing * (targetGrid.waveFreqY - currentGrid.waveFreqY);

  currentGrid.driftAmount += smoothing * (targetGrid.driftAmount - currentGrid.driftAmount);
  currentGrid.flowScale += smoothing * (targetGrid.flowScale - currentGrid.flowScale);

  currentGrid.phase += smoothing * angleDifference(currentGrid.phase, targetGrid.phase);

  currentGrid.angle += smoothing * angleDifference(currentGrid.angle, targetGrid.angle);
}

function angleDifference(a, b) {
  let diff = b - a;

  while (diff > 180) {
    diff -= 360;
  }

  while (diff < -180) {
    diff += 360;
  }

  return diff;
}

function drawFloatingCircleGrid(grid) {
  let cols = max(1, round(grid.cols));
  let rows = max(1, round(grid.rows));

  let tileW = width / cols;
  let tileH = height / rows;

  let d = min(tileW, tileH) * grid.circleScale;

  let time = frameCount * grid.speed + grid.phase;
  let noiseTime = frameCount * grid.speed * 0.18;

  let angleRad = radians(grid.angle);
  let dirX = cos(angleRad);
  let dirY = sin(angleRad);

  fill(fg);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let baseX = x * tileW + tileW * 0.5;
      let baseY = y * tileH + tileH * 0.5;

      let directionalPosition = x * dirX + y * dirY;

      let sharedWave = sin(
        time + directionalPosition * grid.waveFreqX
      );

      let perpendicularWave = cos(
        time * 0.82 + directionalPosition * grid.waveFreqY
      );

      let waveX = sharedWave * grid.waveAmpX * dirX;
      let waveY = sharedWave * grid.waveAmpY * dirY;

      let perpX = perpendicularWave * grid.waveAmpX * 0.28 * -dirY;
      let perpY = perpendicularWave * grid.waveAmpY * 0.28 * dirX;

      let localPhase = x * 0.37 + y * 0.41;

      let floatX = sin(time * 0.72 + localPhase) * grid.waveAmpX * 0.18;
      let floatY = cos(time * 0.66 + localPhase) * grid.waveAmpY * 0.18;

      let nx = noise(
        baseX * grid.flowScale,
        baseY * grid.flowScale,
        noiseTime
      );

      let ny = noise(
        baseX * grid.flowScale + 200,
        baseY * grid.flowScale + 200,
        noiseTime + 100
      );

      let driftX = map(nx, 0, 1, -grid.driftAmount, grid.driftAmount);
      let driftY = map(ny, 0, 1, -grid.driftAmount, grid.driftAmount);

      let cx = baseX + waveX + perpX + floatX + driftX;
      let cy = baseY + waveY + perpY + floatY + driftY;

      circle(cx, cy, d);
    }
  }
}

function createControls() {
  const panel = createDiv();
  panel.position(20, 16);
  panel.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  panel.style('font-size', '11px');
  panel.style('font-weight', '700');
  panel.style('line-height', '1.2');
  panel.style('color', '#1697ff');
  panel.style('background', 'rgba(242, 241, 237, 0.72)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');

  colLabel = createDiv();
  colLabel.parent(panel);
  colSlider = createSlider(4, 120, 120, 1);
  colSlider.parent(panel);
  colSlider.size(150);

  rowLabel = createDiv();
  rowLabel.parent(panel);
  rowSlider = createSlider(4, 120, 20, 1);
  rowSlider.parent(panel);
  rowSlider.size(150);

  speedLabel = createDiv();
  speedLabel.parent(panel);
  speedSlider = createSlider(0.001, 0.08, 0.08, 0.001);
  speedSlider.parent(panel);
  speedSlider.size(150);

  freqLabel = createDiv();
  freqLabel.parent(panel);
  freqSlider = createSlider(0.05, 1.2, 1.2, 0.01);
  freqSlider.parent(panel);
  freqSlider.size(150);

  angleLabel = createDiv();
  angleLabel.parent(panel);
  angleSlider = createSlider(0, 360, 50, 1);
  angleSlider.parent(panel);
  angleSlider.size(150);
}

function updateLabels(cols, rows, speed, freq, angle) {
  colLabel.html('Columns: ' + cols);
  rowLabel.html('Rows: ' + rows);
  speedLabel.html('Wave Speed: ' + nf(speed, 1, 3));
  freqLabel.html('Wave Frequency: ' + nf(freq, 1, 2));
  angleLabel.html('Wave Angle: ' + angle + '°');
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('floating_circle_grid', 'png');
  }

  if (key === 'r' || key === 'R') {
    targetGrid = makeRandomGrid();
  }
}