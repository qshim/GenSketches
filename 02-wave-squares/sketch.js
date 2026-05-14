const fg = '#1697ff';
const bg = '#000';

let colSlider, rowSlider, speedSlider, freqSlider, angleSlider;
let colLabel, rowLabel, speedLabel, freqLabel, angleLabel;
let t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  noStroke();

  loadInterFont();
  createControls();
}

function draw() {
  background(bg);

  let cols = colSlider.value();
  let rows = rowSlider.value();
  let waveSpeed = speedSlider.value();
  let waveFreq = freqSlider.value();
  let waveAngle = angleSlider.value();

  updateLabels(cols, rows, waveSpeed, waveFreq, waveAngle);

  t += waveSpeed;

  let cell = min(width / (cols + 3), height / (rows + 3));

  let gridW = (cols - 1) * cell;
  let gridH = (rows - 1) * cell;

  let marginX = (width - gridW) / 2;
  let marginY = (height - gridH) / 2;

  let dirX = cos(radians(waveAngle));
  let dirY = sin(radians(waveAngle));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let px = marginX + x * cell;
      let py = marginY + y * cell;

      let n = noise(x * 0.12, y * 0.12, t);
      let directionalWave = x * dirX + y * dirY;
      let wave = sin(t * 3 + directionalWave * waveFreq);

      let depth = map(n + wave * 0.2, 0, 1.2, 0, 1);
      depth = constrain(depth, 0, 1);

      let size = map(depth, 0, 1, cell * 0.3, cell * 0.8);

      fill(fg);
      ellipse(px, py, size, size);
    }
  }
}

function loadInterFont() {
  let link = createElement('link');
  link.attribute('rel', 'stylesheet');
  link.attribute('href', 'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap');
  link.parent(document.head);
}

function createControls() {
  const panel = createDiv();
  panel.position(20, 16);
  panel.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  panel.style('font-size', '11px');
  panel.style('font-weight', '700');
  panel.style('line-height', '1.2');
  panel.style('color', fg);
  panel.style('background', 'rgba(242, 241, 237, 0.72)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');

  colLabel = createDiv();
  colLabel.parent(panel);
  colSlider = createSlider(4, 120, 40, 1);
  colSlider.parent(panel);
  colSlider.size(150);

  rowLabel = createDiv();
  rowLabel.parent(panel);
  rowSlider = createSlider(4, 120, 20, 1);
  rowSlider.parent(panel);
  rowSlider.size(150);

  speedLabel = createDiv();
  speedLabel.parent(panel);
  speedSlider = createSlider(0.001, 0.1, 0.03, 0.001);
  speedSlider.parent(panel);
  speedSlider.size(150);

  freqLabel = createDiv();
  freqLabel.parent(panel);
  freqSlider = createSlider(0.05, 2, 0.3, 0.01);
  freqSlider.parent(panel);
  freqSlider.size(150);

  angleLabel = createDiv();
  angleLabel.parent(panel);
  angleSlider = createSlider(0, 360, 45, 1);
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === 's') {
    saveCanvas('block_grid', 'png');
  }
}