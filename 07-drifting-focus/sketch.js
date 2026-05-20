// Original-color pixelate sketch with on-screen controls.
const fg = '#1697ff'; // used only for the control panel label color

let img;
let maskLayer;
let density = 20;
let detailChance = 0.04;
let zoff = 0;

let selectedTiles = new Set();

// Controls
let panel;
let densitySlider, densityLabel;
let detailSlider, detailLabel;
let speedSlider, speedLabel;
let imageSelect, imageLabel;
let fileInput, fileLabel;

const BUILTIN_IMAGES = [
  'flowers.jpg'
];

function preload() {
  img = loadImage(BUILTIN_IMAGES[0]);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  img.resize(width, height);

  maskLayer = createGraphics(width, height);
  noStroke();

  reshuffleTiles();
  createControls();
}

function draw() {
  background(0);
  updateLabels();

  density = densitySlider.value();
  detailChance = detailSlider.value();

  drawNoiseMask();

  img.loadPixels();
  maskLayer.loadPixels();

  for (let y = 0; y < img.height; y += density) {
    for (let x = 0; x < img.width; x += density) {
      let maskIndex = (x + y * maskLayer.width) * 4;
      let brightness = maskLayer.pixels[maskIndex];

      if (brightness <= 120) continue;

      let key = `${x},${y}`;

      if (selectedTiles.has(key)) {
        // Original image patch at full fidelity
        copy(img, x, y, density, density, x, y, density, density);
      } else {
        // Coarse averaged tile — original colors
        let imgIndex = (x + y * img.width) * 4;
        let r = img.pixels[imgIndex];
        let g = img.pixels[imgIndex + 1];
        let b = img.pixels[imgIndex + 2];
        fill(r, g, b);
        rect(x, y, density, density);
      }
    }
  }

  zoff += speedSlider.value();
}

function reshuffleTiles() {
  selectedTiles.clear();
  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      if (random() < detailChance) {
        selectedTiles.add(`${x},${y}`);
      }
    }
  }
}

function mousePressed() {
  // Ignore clicks inside the control panel
  if (panel) {
    const r = panel.elt.getBoundingClientRect();
    if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) return;
  }
  reshuffleTiles();
}

function drawNoiseMask() {
  maskLayer.loadPixels();
  let scale = 0.015;
  for (let y = 0; y < maskLayer.height; y++) {
    for (let x = 0; x < maskLayer.width; x++) {
      let n = noise(x * scale, y * scale, zoff);
      let bright = n * 255;
      let index = (x + y * maskLayer.width) * 4;
      maskLayer.pixels[index] = bright;
      maskLayer.pixels[index + 1] = bright;
      maskLayer.pixels[index + 2] = bright;
      maskLayer.pixels[index + 3] = 255;
    }
  }
  maskLayer.updatePixels();
}

// ----- Controls (same panel style as other sketches) -----

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

  densityLabel = createDiv();
  densityLabel.parent(panel);
  densitySlider = createSlider(4, 60, density, 1);
  densitySlider.parent(panel);
  densitySlider.size(150);
  densitySlider.input(reshuffleTiles);

  detailLabel = createDiv();
  detailLabel.parent(panel);
  detailSlider = createSlider(0, 0.25, detailChance, 0.005);
  detailSlider.parent(panel);
  detailSlider.size(150);
  detailSlider.input(reshuffleTiles);

  speedLabel = createDiv();
  speedLabel.parent(panel);
  speedSlider = createSlider(0.0, 0.06, 0.015, 0.001);
  speedSlider.parent(panel);
  speedSlider.size(150);

  imageLabel = createDiv();
  imageLabel.parent(panel);
  imageLabel.html('Built-in image');
  imageSelect = createSelect();
  imageSelect.parent(panel);
  for (const name of BUILTIN_IMAGES) imageSelect.option(name);
  imageSelect.changed(() => {
    const name = imageSelect.value();
    loadImage(name, (loaded) => {
      img = loaded;
      img.resize(width, height);
      reshuffleTiles();
    });
  });
  imageSelect.style('margin-bottom', '6px');

  fileLabel = createDiv();
  fileLabel.parent(panel);
  fileLabel.html('Upload image');
  fileInput = createFileInput((file) => {
    if (file.type !== 'image') return;
    loadImage(file.data, (loaded) => {
      img = loaded;
      img.resize(width, height);
      reshuffleTiles();
    });
  });
  fileInput.parent(panel);
}

function updateLabels() {
  if (!densityLabel) return;
  densityLabel.html('Cell Size: ' + densitySlider.value());
  detailLabel.html('Detail Tiles: ' + nf(detailSlider.value(), 1, 3));
  speedLabel.html('Drift Speed: ' + nf(speedSlider.value(), 1, 3));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  img.resize(width, height);
  maskLayer = createGraphics(width, height);
  reshuffleTiles();
}
