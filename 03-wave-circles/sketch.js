const fg = '#1697ff';
const bg = '#000';

let colSlider, rowSlider, speedSlider, freqSlider, angleSlider;
let colLabel, rowLabel, speedLabel, freqLabel, angleLabel;

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
  let speed = speedSlider.value();
  let freq = freqSlider.value();
  let angle = radians(angleSlider.value());

  updateLabels();

  let cell = min(width / (cols + 3), height / (rows + 3));

  let gridW = (cols - 1) * cell;
  let gridH = (rows - 1) * cell;

  let marginX = (width - gridW) / 2;
  let marginY = (height - gridH) / 2;

  let t = frameCount * speed;

  let dirX = cos(angle);
  let dirY = sin(angle);

  fill(fg);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let baseX = marginX + x * cell;
      let baseY = marginY + y * cell;

      let wave = sin(t + (x * dirX + y * dirY) * freq);
      let secondaryWave = sin(t * 0.75 + x * y * freq * 0.08);

      let offsetX = wave * cell * 0.42 * dirX + secondaryWave * cell * 0.12;
      let offsetY = wave * cell * 0.42 * dirY + secondaryWave * cell * 0.12;

      let stretch = map(wave, -1, 1, 0.75, 1.45);
      let squash = map(wave, -1, 1, 1.25, 0.72);

      push();
      translate(baseX + offsetX, baseY + offsetY);
      rotate(angle + secondaryWave * 0.25);
      ellipse(0, 0, cell * 0.5 * stretch, cell * 0.5 * squash);
      pop();
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
  colSlider = createSlider(4, 120, 20, 1);
  colSlider.parent(panel);
  colSlider.size(150);

  rowLabel = createDiv();
  rowLabel.parent(panel);
  rowSlider = createSlider(4, 120, 20, 1);
  rowSlider.parent(panel);
  rowSlider.size(150);

  speedLabel = createDiv();
  speedLabel.parent(panel);
  speedSlider = createSlider(0.001, 0.08, 0.05, 0.001);
  speedSlider.parent(panel);
  speedSlider.size(150);

  freqLabel = createDiv();
  freqLabel.parent(panel);
  freqSlider = createSlider(0.05, 1.2, 1.20, 0.01);
  freqSlider.parent(panel);
  freqSlider.size(150);

  angleLabel = createDiv();
  angleLabel.parent(panel);
  angleSlider = createSlider(0, 360, 110, 1);
  angleSlider.parent(panel);
  angleSlider.size(150);
}

function updateLabels() {
  colLabel.html('Columns: ' + colSlider.value());
  rowLabel.html('Rows: ' + rowSlider.value());
  speedLabel.html('Wave Speed: ' + nf(speedSlider.value(), 1, 3));
  freqLabel.html('Wave Frequency: ' + nf(freqSlider.value(), 1, 2));
  angleLabel.html('Wave Angle: ' + angleSlider.value() + '°');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('floating_grid', 'png');
  }
}