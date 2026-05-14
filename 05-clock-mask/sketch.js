const fg = '#1697ff';
const numberFg = '#000';
const bg = '#000';

const CLOCK_DOT_BOOST = 1.65;

let panel;

let sizeSlider;
let densitySlider;
let textSizeSlider;

let sizeLabel;
let densityLabel;
let textSizeLabel;

let textMask;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  pixelDensity(1);
  noStroke();

  textMask = createGraphics(width, height);
  textMask.pixelDensity(1);

  createControls();
}

function draw() {
  background(bg);
  updateLabels();

  const t = millis() / 1000;

  const dotDensity = densitySlider.value();
  const dotScale = sizeSlider.value();
  const textScale = textSizeSlider.value();

  const step = min(width, height) / dotDensity;
  const dotSize = step * dotScale;

  const timeLabel = getTimeLabel();
  makeTextMask(timeLabel, textScale);

  textMask.loadPixels();

  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const baseTone = getGenerativeTone(x, y, t);
      const maskContext = getMaskContextFromRenderedText(x, y, step);

      let tone = baseTone;
      tone = stabilizeToneNearText(tone, maskContext);

      const bgFilled = orderedDither(x, y, tone, step);

      const localDotSize =
        dotSize * lerp(1.0, CLOCK_DOT_BOOST, maskContext.proximity);

      let numberFilled = false;

      if (maskContext.glyphStrength > 0.12) {
        const numberTone = constrain(
          0.78 + maskContext.glyphStrength * 0.28 - baseTone * 0.08,
          0,
          1
        );

        numberFilled = orderedDither(
          x + step * 0.5,
          y + step * 0.5,
          numberTone,
          step
        );
      }

      drawDot(
        x,
        y,
        localDotSize,
        bgFilled,
        numberFilled,
        maskContext.glyphStrength
      );
    }
  }
}

function getTimeLabel() {
  const h = nf(hour(), 2);
  const m = nf(minute(), 2);
  const s = nf(second(), 2);

  return h + ':' + m + ':' + s;
}

function makeTextMask(label, textScale) {
  textMask.clear();
  textMask.background(0, 0);

  textMask.noStroke();
  textMask.fill(255);
  textMask.textFont('Inter, Arial, Helvetica, sans-serif');
  textMask.textStyle(BOLD);
  textMask.textAlign(CENTER, CENTER);

  const baseFontSize = min(width * 0.175, height * 0.37);
  const fontSize = baseFontSize * textScale;

  textMask.textSize(fontSize);

  textMask.text(
    label,
    width * 0.5,
    height * 0.52
  );
}

function getMaskContextFromRenderedText(x, y, step) {
  const glyph = sampleTextMask(x, y);

  const near1 =
    sampleTextMask(x - step * 1.5, y) +
    sampleTextMask(x + step * 1.5, y) +
    sampleTextMask(x, y - step * 1.5) +
    sampleTextMask(x, y + step * 1.5);

  const near2 =
    sampleTextMask(x - step * 3.0, y) +
    sampleTextMask(x + step * 3.0, y) +
    sampleTextMask(x, y - step * 3.0) +
    sampleTextMask(x, y + step * 3.0);

  const proximity = constrain(
    glyph + near1 * 0.45 + near2 * 0.18,
    0,
    1
  );

  return {
    glyphStrength: glyph,
    proximity: proximity
  };
}

function sampleTextMask(x, y) {
  const ix = floor(constrain(x, 0, width - 1));
  const iy = floor(constrain(y, 0, height - 1));

  const idx = 4 * (iy * width + ix);
  return textMask.pixels[idx + 3] / 255;
}

function stabilizeToneNearText(tone, maskContext) {
  const glyph = maskContext.glyphStrength;
  const proximity = maskContext.proximity;

  const halo = max(proximity - glyph * 0.65, 0);

  tone = lerp(tone, 0.98, glyph * 0.88);
  tone = lerp(tone, 0.02, halo * 0.48);

  return constrain(tone, 0, 1);
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

function drawDot(x, y, d, bgFilled, numberFilled, glyphStrength) {
  noStroke();

  if (glyphStrength > 0.12) {
    if (numberFilled) {
      fill(numberFg);
    } else {
      fill(fg);
    }
  } else if (bgFilled) {
    fill(fg);
  } else {
    fill(bg);
  }

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

  densitySlider = createSlider(30, 180, 138, 1);
  densitySlider.parent(panel);
  densitySlider.size(150);

  textSizeLabel = createDiv();
  textSizeLabel.parent(panel);

  textSizeSlider = createSlider(0.6, 1.8, 1.5, 0.01);
  textSizeSlider.parent(panel);
  textSizeSlider.size(150);
}

function updateLabels() {
  sizeLabel.html('Ellipse Size: ' + nf(sizeSlider.value(), 1, 2));
  densityLabel.html('Dot Density: ' + densitySlider.value());
  textSizeLabel.html('Text Size: ' + nf(textSizeSlider.value(), 1, 2));
}

function smoothstep(edge0, edge1, x) {
  x = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  textMask = createGraphics(width, height);
  textMask.pixelDensity(1);
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('time_dot_field_dithered_number_layer', 'png');
  }
}