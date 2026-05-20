// Eight circles that drift like an agent listening — continuous sine + noise
// motion modulated by live microphone *amplitude* AND *tone*.
//   Amplitude (loudness) → vertical drift range and per-voice swell
//   Tone (spectral centroid / FFT bands) → wave velocity + per-voice weighting
//     (bass voices on the left, treble on the right)
// No discrete attacks, no resets: endless musical continuity.

const fg = '#1697ff';
const bg = '#000';
const N = 5;

// Rounded-square container around the chord — FIXED size in pixels.
const CONTAINER_SIZE = 180;       // outer width/height (px)
const CONTAINER_PAD = 18;         // inner padding (px)
const CONTAINER_RADIUS = 28;      // corner radius (px)
const CONTAINER_STROKE = 1.5;     // stroke width (px)

let voices = [];

// Audio
let mic;
let fft;
let micReady = false;
let micRequested = false;
let smoothedLevel = 0;
let peakLevel = 0.02;
let smoothedCentroid = 0;
let smoothedBass = 0;
let smoothedTreble = 0;

// Our own accumulated "music time" — we advance it ourselves so that
// tone can speed it up or slow it down without ever causing a jump.
let musicTime = 0;
let prevMs = 0;

let hintEl;

let panel;
let tempoSlider, tempoLabel;
let ampSlider, ampLabel;
let blendSlider, blendLabel;
let sizeSlider, sizeLabel;
let micSlider, micLabel;
let toneSlider, toneLabel;
let breathSlider, breathLabel;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();

  const FREQS = [0.10, 0.13, 0.17, 0.21, 0.27, 0.33, 0.41, 0.49];
  const RAD_FREQS = [0.07, 0.09, 0.11, 0.13, 0.17, 0.19, 0.23, 0.29];

  // One shared traveling wave runs through all 8 circles. Each circle
  // samples the same wave at a different offset — speak louder and the
  // wave moves faster, so you can *see* sound propagating through them.
  for (let i = 0; i < N; i++) {
    voices.push({
      noiseSeed: random(0, 1000),
    });
  }

  createControls();
  createMicHint();

  if (typeof p5 !== 'undefined' && p5.AudioIn) {
    mic = new p5.AudioIn();
    if (p5.FFT) fft = new p5.FFT(0.85, 256);
  }

  prevMs = millis();
}

function draw() {
  background(bg);
  updateLabels();

  const tempo = tempoSlider.value();
  const ampFactor = ampSlider.value();
  const blend = blendSlider.value();
  let baseSize; // computed below from container size
  const micGain = micSlider.value();
  const toneGain = toneSlider.value();
  const breathAmt = breathSlider.value();

  // ---------- Audio analysis ------------------------------------------
  let rawLevel = 0;
  let centroidNorm = 0;
  let bassEnergy = 0;
  let trebleEnergy = 0;

  if (micReady && mic) {
    rawLevel = mic.getLevel();
    peakLevel = max(peakLevel * 0.995, rawLevel);
    if (peakLevel < 0.02) peakLevel = 0.02;

    if (fft) {
      fft.analyze();
      const centroidHz = fft.getCentroid();
      const logHz = Math.log(Math.max(centroidHz, 20));
      centroidNorm = constrain(
        (logHz - Math.log(80)) / (Math.log(4000) - Math.log(80)),
        0, 1
      );
      bassEnergy = fft.getEnergy('bass') / 255;
      trebleEnergy = fft.getEnergy('treble') / 255;
    }
  }

  // Smooth — fast attack, slow release feels like listening
  const normalized = constrain(rawLevel / peakLevel, 0, 1);
  const a = normalized > smoothedLevel ? 0.30 : 0.07;
  smoothedLevel += (normalized - smoothedLevel) * a;
  smoothedCentroid += (centroidNorm - smoothedCentroid) * 0.08;
  smoothedBass += (bassEnergy - smoothedBass) * 0.18;
  smoothedTreble += (trebleEnergy - smoothedTreble) * 0.18;

  const listen = smoothedLevel * micGain; // 0..~2

  // ---------- Sound is the vehicle ----------------------------------
  // Loudness and tone push the wave forward. Silence → it idles slowly.
  // Speak → the wave races through the eight circles.
  const velocity =
      0.6
    + listen * 2.4              // loudness drives the wave's speed
    + (smoothedCentroid - 0.4) * 1.4 * toneGain; // bright tone pushes harder
  const safeVelocity = max(0.05, velocity);

  const nowMs = millis();
  const deltaMs = min(80, nowMs - prevMs);
  prevMs = nowMs;
  musicTime += (deltaMs / 1000) * tempo * safeVelocity;
  const t = musicTime;

  // ---------- Layout (chord constrained inside the fixed container) --
  const cy = height * 0.5;
  const cx = width * 0.5;
  // sizeSlider is a fraction of the container's inner area so the chord
  // scales with the frame rather than the screen.
  const innerSize = CONTAINER_SIZE - CONTAINER_PAD * 2;
  baseSize = innerSize * sizeSlider.value() * 0.9;
  const maxCircleR = baseSize * 1.3;
  const totalW = max(0, innerSize - maxCircleR * 2);
  const spacing = N > 1 ? totalW / (N - 1) : 0;
  const startX = cx - totalW / 2;

  // Drift amplitude capped so circles never overflow the frame, even
  // when the voice is loud.
  const maxAmp = innerSize / 2 - maxCircleR;
  const ampPx = min(maxAmp, maxAmp * ampFactor * (1 + listen * 1.0));

  // ---------- Rounded-square container (STATIC) -----------------------
  push();
  rectMode(CENTER);
  noFill();
  stroke(fg);
  strokeWeight(CONTAINER_STROKE);
  rect(cx, cy, CONTAINER_SIZE, CONTAINER_SIZE, CONTAINER_RADIUS);
  pop();
  noStroke();

  // Soft global lift on bright tones (subtle, never literal).
  const globalLift = (smoothedCentroid - 0.5) * baseSize * 1.5 * toneGain;

  const breath = 0.5 + 0.5 * Math.sin(t * 0.6) * (1 + listen * 0.5);

  // ---- Traveling wave through the eight circles --------------------
  // Each circle samples ONE shared wave at its own offset, so motion
  // appears to move left → right as t advances. Sound makes t advance
  // faster ⇒ the wave races; silence ⇒ it strolls.
  // Two layered waves at different frequencies give a richer feel.
  const phaseStep = (Math.PI * 2) / N;   // a full wavelength spans 8 circles
  const phaseStep2 = phaseStep * 0.45;   // a slower secondary wave

  for (let i = 0; i < N; i++) {
    const v = voices[i];
    const x = startX + i * spacing;

    // Position-dependent offset — this is what creates the visible
    // progression across the line of circles.
    const off  = i * phaseStep;
    const off2 = i * phaseStep2;

    // Sine traveling wave (regular musical motion)
    const sin1 = Math.sin(t * 1.6 - off);
    const sin2 = Math.sin(t * 0.7 - off2);
    const sinY = (sin1 * 0.65 + sin2 * 0.45);

    // Noise traveling wave (organic wander) — sample the same noise
    // field, offset per circle, so the wander also has progression.
    const noise1 = (noise(v.noiseSeed + t * 0.9 - i * 0.55) - 0.5) * 2.0;
    const noise2 = (noise(v.noiseSeed + 50 + t * 0.45 - i * 0.30) - 0.5) * 2.0;
    const noiseY = (noise1 * 0.65 + noise2 * 0.45);

    const yMix = lerp(sinY, noiseY, blend);
    const y = cy + ampPx * yMix - globalLift;

    // Radius: a slowly traveling swell — same offset principle so the
    // "pulse" appears to roll through the chord.
    const rWave = 0.5 + 0.5 * Math.sin(t * 0.9 - off * 0.6);
    const rNoise = noise(v.noiseSeed + 200 + t * 0.5 - i * 0.4);
    const rMix = lerp(rWave, rNoise, blend);
    const energy = constrain(rMix + listen * 0.30, 0, 1.4);

    const radius =
      baseSize *
      (0.55 + 0.18 * breath * breathAmt + 0.55 * energy);

    fill(fg);
    ellipse(x, y, radius, radius);
  }
}

// ----- Microphone -----

function tryStartMic() {
  if (micRequested || !mic) return;
  micRequested = true;
  try {
    if (typeof userStartAudio === 'function') userStartAudio();
    mic.start(
      () => {
        micReady = true;
        if (fft) fft.setInput(mic);
        hideMicHint();
      },
      (err) => { console.warn('[mic] start failed', err); micRequested = false; }
    );
  } catch (e) {
    console.warn('[mic]', e);
    micRequested = false;
  }
}

function mousePressed() {
  if (panel) {
    const r = panel.elt.getBoundingClientRect();
    if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) return;
  }
  tryStartMic();
}

function touchStarted() { tryStartMic(); }
function keyPressed() { tryStartMic(); }

function createMicHint() {
  hintEl = createDiv('🎙 click anywhere to let the agent listen');
  hintEl.style('position', 'fixed');
  hintEl.style('left', '50%');
  hintEl.style('bottom', '32px');
  hintEl.style('transform', 'translateX(-50%)');
  hintEl.style('font-family', "'Inter', Arial, Helvetica, sans-serif");
  hintEl.style('font-size', '12px');
  hintEl.style('font-weight', '600');
  hintEl.style('letter-spacing', '.08em');
  hintEl.style('color', fg);
  hintEl.style('background', 'rgba(0,0,0,0.6)');
  hintEl.style('padding', '8px 14px');
  hintEl.style('border', '1px solid ' + fg);
  hintEl.style('border-radius', '999px');
  hintEl.style('pointer-events', 'none');
  hintEl.style('z-index', '9');
}

function hideMicHint() {
  if (hintEl) hintEl.style('display', 'none');
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

  tempoLabel = createDiv(); tempoLabel.parent(panel);
  tempoSlider = createSlider(0.1, 2.4, 2.40, 0.01);
  tempoSlider.parent(panel); tempoSlider.size(150);

  ampLabel = createDiv(); ampLabel.parent(panel);
  ampSlider = createSlider(0.0, 1.0, 0.96, 0.01);
  ampSlider.parent(panel); ampSlider.size(150);

  blendLabel = createDiv(); blendLabel.parent(panel);
  blendSlider = createSlider(0.0, 1.0, 0.08, 0.01);
  blendSlider.parent(panel); blendSlider.size(150);

  sizeLabel = createDiv(); sizeLabel.parent(panel);
  sizeSlider = createSlider(0.02, 0.18, 0.035, 0.005);
  sizeSlider.parent(panel); sizeSlider.size(150);

  micLabel = createDiv(); micLabel.parent(panel);
  micSlider = createSlider(0.0, 2.0, 2.00, 0.01);
  micSlider.parent(panel); micSlider.size(150);

  toneLabel = createDiv(); toneLabel.parent(panel);
  toneSlider = createSlider(0.0, 2.0, 2.00, 0.01);
  toneSlider.parent(panel); toneSlider.size(150);

  breathLabel = createDiv(); breathLabel.parent(panel);
  breathSlider = createSlider(0.0, 1.5, 0.0, 0.01);
  breathSlider.parent(panel); breathSlider.size(150);
}

function updateLabels() {
  if (!tempoLabel) return;
  tempoLabel.html('Tempo: ' + nf(tempoSlider.value(), 1, 2));
  ampLabel.html('Vertical Drift: ' + nf(ampSlider.value(), 1, 2));
  blendLabel.html('Sine ↔ Noise: ' + nf(blendSlider.value(), 1, 2));
  sizeLabel.html('Circle Size: ' + nf(sizeSlider.value(), 1, 3));
  micLabel.html('Mic Sensitivity: ' + nf(micSlider.value(), 1, 2) + (micReady ? ' · live' : ' · off'));
  toneLabel.html('Tone → Speed: ' + nf(toneSlider.value(), 1, 2));
  breathLabel.html('Breath: ' + nf(breathSlider.value(), 1, 2));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
