// Two breathing-chord containers — 380×380 and 180×180 — shown side by side,
// centered on the screen. Both react to the same wave + the same microphone
// input, so they read as two scales of the same agent surface.

const fg = '#1697ff';
const bg = '#000';
const N = 5;

// Containers: each one is a rounded square frame with its own size.
// 'swap' chooses how the order of circles reshuffles every second:
//   'cycle'  → left-shift cyclic (1 2 3 4 5 → 2 3 4 5 1)
//   'random' → fresh random permutation
// Per-container roundness: 0 = square, 1 = full circle.
// `motion`: 'wave' (default — sound-reactive drift) or 'rotate' (formation
// rotates slowly around centre, no positional drift, ignores sound).
// trail: null = no echo, 'inverted' = outline rings, 'filled' = solid alpha
const CONTAINERS = [
  { size: 380, swap: 'cycle',         roundness: 0.18, motion: 'wave',   trail: 'inverted' },
  { size: 180, swap: 'random',        roundness: 1.0,  motion: 'rotate', trail: 'filled'   },
  { size: 100, swap: 'cycle-reverse', roundness: 1.0,  motion: 'wave',   trail: null       }
];
const ROTATE_RAD_PER_SEC = 0.45; // faster spin (~14s per revolution)
const SWAP_INTERVAL_MS = 1000;
const GAP = 56;                  // px between containers
const CONTAINER_PAD = 18;        // inner padding (px)
const CONTAINER_RADIUS = 28;     // corner radius (px)
const CONTAINER_STROKE = 1.5;    // stroke width (px)

let voices = [];

// Per-container shuffle state — order maps slot index → voice index.
let containerStates = [];

// Per-container smoothed pulse level (0 = silent, 1 = active sound pulse).
let pulseLevels = [];
const SOUND_PULSE_THRESHOLD = 0.18; // loudness above this triggers blue↔white
const SOUND_PULSE_PERIOD = 1.3;    // seconds per blue↔white↔blue cycle
const SOUND_PULSE_STAGGER = 0.18;  // seconds between successive circles

// Echo trail config
const TRAIL_LENGTH = 20;

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

let musicTime = 0;
let prevMs = 0;
let startMs = 0;
const INTRO_DURATION_MS = 2200; // smooth ramp-in from center → drifting

let hintEl;
let domReplica = null;       // { container, dots } — DOM mirror of the smallest canvas container
const DOM_REPLICA_GAP = 24;  // px between the DOM replica and the canvas container below it

let panel;
let tempoSlider, tempoLabel;
let ampSlider, ampLabel;
let blendSlider, blendLabel;
let sizeSlider, sizeLabel;
let micSlider, micLabel;
let toneSlider, toneLabel;
let breathSlider, breathLabel;
let roundSlider, roundLabel;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();

  // Paint a clean black canvas once. After this the loop never fully
  // clears — instead it draws fill(0, 5) over the entire canvas every
  // frame, which gives the circles a soft trailing fade.
  background(bg);

  for (let i = 0; i < N; i++) {
    voices.push({ noiseSeed: random(0, 1000) });
  }

  containerStates = CONTAINERS.map((c) => ({
    order: Array.from({ length: N }, (_, k) => k),
    lastSwap: 0,
    trails: c.trail ? Array.from({ length: N }, () => []) : null
  }));
  pulseLevels = CONTAINERS.map(() => 0);

  loadInterFont();
  createControls();
  createMicHint();
  createCanvasLabels();
  createDomReplica();

  if (typeof p5 !== 'undefined' && p5.AudioIn) {
    mic = new p5.AudioIn();
    if (p5.FFT) fft = new p5.FFT(0.85, 256);
  }

  prevMs = millis();
  startMs = prevMs;
}

function draw() {
  background(bg);
  updateLabels();

  const tempo = tempoSlider.value();
  const ampFactor = ampSlider.value();
  const blend = blendSlider.value();
  const sizeFrac = sizeSlider.value();
  const micGain = micSlider.value();
  const toneGain = toneSlider.value();
  const breathAmt = breathSlider.value();

  // ---------- Audio analysis ------------------------------------------
  let rawLevel = 0, centroidNorm = 0;

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
    }
  }

  const normalized = constrain(rawLevel / peakLevel, 0, 1);
  const a = normalized > smoothedLevel ? 0.30 : 0.07;
  smoothedLevel += (normalized - smoothedLevel) * a;
  smoothedCentroid += (centroidNorm - smoothedCentroid) * 0.08;

  const listen = smoothedLevel * micGain;

  // ---------- Sound is the vehicle ----------------------------------
  const velocity =
      1.8                            // 3× the previous idle speed
    + listen * 2.4
    + (smoothedCentroid - 0.4) * 1.4 * toneGain;
  const safeVelocity = max(0.05, velocity);

  const nowMs = millis();
  const deltaMs = min(80, nowMs - prevMs);
  prevMs = nowMs;
  musicTime += (deltaMs / 1000) * tempo * safeVelocity;
  const t = musicTime;

  // ---------- Layout the containers side by side ---------------------
  const totalW = CONTAINERS.reduce((acc, c) => acc + c.size, 0)
               + GAP * (CONTAINERS.length - 1);
  let cursorX = width / 2 - totalW / 2;
  const baseCy = height / 2;
  const lastIdx = CONTAINERS.length - 1;
  const placedContainers = CONTAINERS.map((c, i) => {
    const cx = cursorX + c.size / 2;
    cursorX += c.size + GAP;
    // The rightmost container shares its space with a DOM replica
    // stacked above it. Shift it downward so the pair's combined
    // vertical centre lands exactly on the screen's centre.
    let containerCy = baseCy;
    if (i === lastIdx) {
      containerCy = baseCy + (c.size + DOM_REPLICA_GAP) / 2;
    }
    return { size: c.size, cx, cy: containerCy };
  });

  // Default cy used by labels / other shared logic
  const cy = baseCy;
  const breath = 0.5 + 0.5 * Math.sin(t * 0.6) * (1 + listen * 0.5);
  const globalLiftBase = (smoothedCentroid - 0.5) * 1.5 * toneGain;

  // ---------- Intro ramp: circles start at the center, then drift ----
  const introRaw = constrain((millis() - startMs) / INTRO_DURATION_MS, 0, 1);
  const introT = introRaw * introRaw * (3 - 2 * introRaw);

  // ---------- Shuffle orders once a second per container -------------
  const nowMs2 = millis();
  for (let ci = 0; ci < CONTAINERS.length; ci++) {
    const st = containerStates[ci];
    if (nowMs2 - st.lastSwap >= SWAP_INTERVAL_MS) {
      st.lastSwap = nowMs2;
      const mode = CONTAINERS[ci].swap;
      if (mode === 'cycle') {
        st.order.push(st.order.shift());            // left cyclic shift
      } else if (mode === 'cycle-reverse') {
        st.order.unshift(st.order.pop());           // right cyclic shift
      } else {
        // Fisher–Yates random shuffle
        const arr = st.order;
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(random(i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      }
    }
  }

  // ---------- Sound-triggered colour pulse for the bottom-right canvas
  // (smallest canvas container). Only ci === lastIdx gets the pulse.
  const pulseRealT = millis() / 1000;
  for (let ci = 0; ci < CONTAINERS.length; ci++) {
    const isPulseTarget = (ci === lastIdx);
    const target = (isPulseTarget && listen > SOUND_PULSE_THRESHOLD) ? 1 : 0;
    const a = target > pulseLevels[ci] ? 0.30 : 0.06;
    pulseLevels[ci] += (target - pulseLevels[ci]) * a;
  }

  // ---------- Render each container -----------------------------------
  let lastResult = null;
  for (let ci = 0; ci < placedContainers.length; ci++) {
    const cont = placedContainers[ci];
    const sliderMult = roundSlider ? roundSlider.value() : 1;
    const roundness = CONTAINERS[ci].roundness * sliderMult;
    drawContainerFrame(cont.cx, cont.cy, cont.size, roundness);

    const pulseLevel = pulseLevels[ci];
    const result = renderChord({
      cx: cont.cx,
      cy: cont.cy,
      size: cont.size,
      sizeFrac,
      ampFactor,
      blend,
      listen,
      globalLiftBase,
      breath,
      breathAmt,
      t,
      introT,
      order: containerStates[ci].order,
      roundness,
      pulseLevel,
      pulseRealT,
      trails: containerStates[ci].trails,
      trailStyle: CONTAINERS[ci].trail || null,
      motion: CONTAINERS[ci].motion || 'wave'
    });
    if (ci === placedContainers.length - 1) lastResult = { cont, result, roundness };
  }

  // ---------- DOM replica of the rightmost container -----------------
  if (lastResult) {
    updateDomReplica(lastResult.cont, lastResult.result, lastResult.roundness);
  }

  positionCanvasLabels(placedContainers);
}

function drawContainerFrame(cx, cy, size, roundness) {
  const r = (size / 2) * roundness;
  push();
  rectMode(CENTER);
  noFill();
  stroke(fg);
  strokeWeight(CONTAINER_STROKE);
  rect(cx, cy, size, size, r);
  pop();
  noStroke();
}

function renderChord(opts) {
  const { cx, cy, size, sizeFrac, ampFactor, blend, listen,
          globalLiftBase, breath, breathAmt, t, introT, order, roundness,
          pulseLevel = 0, pulseRealT = 0, trails = null,
          trailStyle = 'inverted', motion = 'wave' } = opts;

  const halfSize = size / 2;
  const innerSize = size - CONTAINER_PAD * 2;

  // diameter for ellipse() / actual radius for geometry
  const diameter = innerSize * sizeFrac * 0.9;
  const actualR  = diameter / 2;

  // Horizontal layout — spacing is the gap *between centres*. Make sure
  // two neighbouring centres are always ≥ diameter apart so circles can
  // never touch sideways.
  const minCentreGap = diameter * 1.05;            // tiny breathing gap
  const spreadable   = max(0, innerSize - diameter); // usable inner width (centres)
  const naturalSpacing = N > 1 ? spreadable / (N - 1) : 0;
  const spacing  = max(minCentreGap, naturalSpacing);
  const totalW   = spacing * (N - 1);
  const startX   = cx - totalW / 2;

  // Vertical drift cap — keep circles fully inside the container.
  const maxAmp = (innerSize / 2) - actualR;
  const ampPx = min(maxAmp, maxAmp * ampFactor * (1 + listen * 1.0)) * introT;

  // No vertical DC bias — the chord's centre axis stays at cy, and only
  // the spread up/down (ampPx) grows. (Tone still drives speed.)
  const globalLift = 0;

  // Corner radius matching the container outline.
  const cornerR = halfSize * roundness;

  const phaseStep  = (Math.PI * 2) / N;
  const phaseStep2 = phaseStep * 0.45;

  // ----- 1. Compute desired positions (wave-based) -------------------
  const positions = new Array(N);
  for (let i = 0; i < N; i++) {
    const voiceIdx = order ? order[i] : i;
    const v = voices[voiceIdx];

    const targetX = startX + i * spacing;
    const x = lerp(cx, targetX, introT);

    const off  = i * phaseStep;
    const off2 = i * phaseStep2;

    const sin1 = Math.sin(t * 1.6 - off);
    const sin2 = Math.sin(t * 0.7 - off2);
    const sinY = (sin1 * 0.65 + sin2 * 0.45);

    const noise1 = (noise(v.noiseSeed + t * 0.9 - i * 0.55) - 0.5) * 2.0;
    const noise2 = (noise(v.noiseSeed + 50 + t * 0.45 - i * 0.30) - 0.5) * 2.0;
    const noiseY = (noise1 * 0.65 + noise2 * 0.45);

    const yMix = lerp(sinY, noiseY, blend);
    const y = cy + ampPx * yMix - globalLift;

    positions[i] = { x, y, r: actualR };
  }

  // ----- 1b. Rotate the whole formation if requested ------------------
  // Wave motion is preserved; the entire arrangement just spins very
  // slowly around (cx, cy).
  if (motion === 'rotate') {
    const realTSinceStart = (millis() - startMs) / 1000;
    const angle = realTSinceStart * ROTATE_RAD_PER_SEC;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (const p of positions) {
      const rx = p.x - cx;
      const ry = p.y - cy;
      p.x = cx + rx * cosA - ry * sinA;
      p.y = cy + rx * sinA + ry * cosA;
    }
  }

  // ----- 2. Relax overlaps (no two circles may touch) -----------------
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const minD = positions[i].r + positions[j].r;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD * minD) {
          const d = Math.sqrt(d2) || 0.0001;
          const overlap = (minD - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          positions[i].x -= nx * overlap;
          positions[i].y -= ny * overlap;
          positions[j].x += nx * overlap;
          positions[j].y += ny * overlap;
        }
      }
    }
  }

  // ----- 3. Clamp every circle inside the rounded-square frame -------
  for (const p of positions) {
    const c = clampToRoundedSquare(p.x - cx, p.y - cy, halfSize, cornerR, p.r);
    p.x = cx + c.x;
    p.y = cy + c.y;
  }

  // ----- 4. Update echo trails (if this container has them) ----------
  if (trails) {
    for (let i = 0; i < N; i++) {
      const p = positions[i];
      trails[i].push({ x: p.x, y: p.y });
      if (trails[i].length > TRAIL_LENGTH) trails[i].shift();
    }
  }

  // ----- 5. Draw ------------------------------------------------------
  // Per-slot whiteness: leftmost (i=0) starts the cycle first, each
  // subsequent slot lags by SOUND_PULSE_STAGGER seconds. One full cycle
  // = SOUND_PULSE_PERIOD seconds.
  function whitenessFor(i) {
    if (pulseLevel <= 0.001) return 0;
    const phase = (pulseRealT - i * SOUND_PULSE_STAGGER) / SOUND_PULSE_PERIOD;
    return pulseLevel * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
  }

  // 5a. Trails first (so the current circles sit on top).
  if (trails) {
    for (let i = 0; i < N; i++) {
      const w = whitenessFor(i);
      const cr = lerp(22, 255, w);
      const cg = lerp(151, 255, w);
      const cb = 255;
      const hist = trails[i];
      const last = hist.length - 1;
      for (let h = 0; h < last; h++) {
        const ageT = last === 0 ? 0 : h / last;
        const alpha = ageT * 200;
        if (trailStyle === 'inverted') {
          // Outline rings (inverted from solid blue fill)
          noFill();
          stroke(cr, cg, cb, alpha);
          strokeWeight(1.2);
        } else {
          // Solid filled blue with decreasing alpha (same colour as live)
          noStroke();
          fill(cr, cg, cb, alpha);
        }
        ellipse(hist[h].x, hist[h].y, actualR * 2, actualR * 2);
      }
    }
    noStroke();
  }

  // 5b. Current (live) circles at full opacity, each with its own tint.
  for (let i = 0; i < N; i++) {
    const w = whitenessFor(i);
    const cr = lerp(22, 255, w);
    const cg = lerp(151, 255, w);
    const cb = 255;
    fill(cr, cg, cb);
    const p = positions[i];
    ellipse(p.x, p.y, p.r * 2, p.r * 2);
  }

  // Return so the caller can mirror this exact state in DOM.
  return { positions, diameter };
}

// Clamp (dx, dy) into a centred rounded-square of half-size `half` and
// corner radius `cornerR`, inset by `inset` on every side. Returns the
// adjusted offset.
function clampToRoundedSquare(dx, dy, half, cornerR, inset) {
  const limit = max(0, half - inset);
  let nx = constrain(dx, -limit, limit);
  let ny = constrain(dy, -limit, limit);

  // Inside the corner zone? Pull onto the rounded arc.
  const anchor = max(0, half - cornerR);
  if (Math.abs(nx) > anchor && Math.abs(ny) > anchor) {
    const ax = Math.sign(nx) * anchor;
    const ay = Math.sign(ny) * anchor;
    const ox = nx - ax;
    const oy = ny - ay;
    const cornerLimit = max(0, cornerR - inset);
    const d = Math.sqrt(ox * ox + oy * oy);
    if (d > cornerLimit && d > 0) {
      const scale = cornerLimit / d;
      nx = ax + ox * scale;
      ny = ay + oy * scale;
    }
  }
  return { x: nx, y: ny };
}

// ----- Fonts & labels -----

function loadInterFont() {
  // Load Inter Light (300) and Regular (400) for all on-screen labels.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap';
  document.head.appendChild(link);
}

let canvasLabels = [];

function createCanvasLabels() {
  for (let i = 0; i < CONTAINERS.length; i++) {
    const el = document.createElement('div');
    el.textContent = 'p5.js';
    el.style.cssText = [
      'position:fixed',
      "font-family:'Inter',Arial,Helvetica,sans-serif",
      'font-weight:300',
      'font-size:11px',
      'letter-spacing:.04em',
      'color:' + fg,
      'pointer-events:none',
      'z-index:2',
      'left:0',
      'top:0',
      'white-space:nowrap',
      'transform:translateX(-50%)'
    ].join(';');
    document.body.appendChild(el);
    canvasLabels.push(el);
  }
}

function positionCanvasLabels(placedContainers) {
  for (let i = 0; i < placedContainers.length; i++) {
    const cont = placedContainers[i];
    const el = canvasLabels[i];
    if (!el) continue;
    el.style.left = cont.cx + 'px';
    el.style.top = (cont.cy - cont.size / 2 - 16) + 'px';
  }
}

// ----- DOM mirror of the rightmost container -----

function createDomReplica() {
  const c = document.createElement('div');
  c.id = '__dom_chord';
  c.style.cssText = [
    'position:fixed',
    'box-sizing:border-box',
    'border:1.5px solid ' + fg,
    'pointer-events:none',
    'z-index:2',
    'left:0',
    'top:0',
    'transition:none'
  ].join(';');
  const dots = [];
  for (let i = 0; i < N; i++) {
    const d = document.createElement('div');
    d.style.cssText = [
      'position:absolute',
      'background:' + fg,
      'border-radius:50%',
      'left:0',
      'top:0',
      'transform:translate(0,0)',
      'will-change:transform,width,height'
    ].join(';');
    c.appendChild(d);
    dots.push(d);
  }
  document.body.appendChild(c);

  const label = document.createElement('div');
  label.id = '__dom_chord_label';
  label.textContent = 'html, css, js only (without canvas)';
  label.style.cssText = [
    'position:fixed',
    "font-family:'Inter',Arial,Helvetica,sans-serif",
    'font-weight:300',
    'font-size:11px',
    'letter-spacing:.04em',
    'color:' + fg,
    'pointer-events:none',
    'z-index:2',
    'left:0',
    'top:0',
    'white-space:nowrap',
    'transform:translateX(-50%)'
  ].join(';');
  document.body.appendChild(label);

  domReplica = { container: c, dots, label };
}

function updateDomReplica(cont, result, roundness) {
  if (!domReplica) return;
  const size = cont.size;
  const cy = cont.cy;

  // Position the replica directly above the canvas container.
  const top = cy - size / 2 - DOM_REPLICA_GAP - size;
  const left = cont.cx - size / 2;

  const containerStyle = domReplica.container.style;
  containerStyle.width = size + 'px';
  containerStyle.height = size + 'px';
  containerStyle.left = left + 'px';
  containerStyle.top = top + 'px';
  // Match the canvas frame's corner radius
  containerStyle.borderRadius = ((size / 2) * roundness) + 'px';

  // Label sits above the replica, horizontally centred on it
  if (domReplica.label) {
    const ls = domReplica.label.style;
    ls.left = (left + size / 2) + 'px';
    ls.top  = (top - 16) + 'px';
  }

  const diameter = result.diameter;
  for (let i = 0; i < N; i++) {
    const p = result.positions[i];
    const dot = domReplica.dots[i];
    // p.x / p.y are in canvas coords. Translate them into coords
    // relative to the canvas container, then mirror inside the DOM box.
    const dx = p.x - cont.cx;
    const dy = p.y - cy;
    const domX = size / 2 + dx - diameter / 2;
    const domY = size / 2 + dy - diameter / 2;
    dot.style.width = diameter + 'px';
    dot.style.height = diameter + 'px';
    dot.style.transform = 'translate(' + domX + 'px,' + domY + 'px)';
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
  tempoSlider = createSlider(0.1, 2.4, 1.48, 0.01);
  tempoSlider.parent(panel); tempoSlider.size(150);

  ampLabel = createDiv(); ampLabel.parent(panel);
  ampSlider = createSlider(0.0, 1.0, 0.54, 0.01);
  ampSlider.parent(panel); ampSlider.size(150);

  blendLabel = createDiv(); blendLabel.parent(panel);
  blendSlider = createSlider(0.0, 1.0, 0.08, 0.01);
  blendSlider.parent(panel); blendSlider.size(150);

  sizeLabel = createDiv(); sizeLabel.parent(panel);
  sizeSlider = createSlider(0.02, 0.18, 0.110, 0.005);
  sizeSlider.parent(panel); sizeSlider.size(150);

  micLabel = createDiv(); micLabel.parent(panel);
  micSlider = createSlider(0.0, 2.0, 1.15, 0.01);
  micSlider.parent(panel); micSlider.size(150);

  toneLabel = createDiv(); toneLabel.parent(panel);
  toneSlider = createSlider(0.0, 2.0, 0.38, 0.01);
  toneSlider.parent(panel); toneSlider.size(150);

  breathLabel = createDiv(); breathLabel.parent(panel);
  breathSlider = createSlider(0.0, 1.5, 0.0, 0.01);
  breathSlider.parent(panel); breathSlider.size(150);

  roundLabel = createDiv(); roundLabel.parent(panel);
  roundSlider = createSlider(0.0, 1.0, 1.0, 0.01);
  roundSlider.parent(panel); roundSlider.size(150);
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
  roundLabel.html('Card Roundness: ' + nf(roundSlider.value(), 1, 2));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
