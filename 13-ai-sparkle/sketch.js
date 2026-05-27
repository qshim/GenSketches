// 오리지널 갤럭시 AI 로고의 고유 위치(Home) 변수
let bl_home, tr_home, tl_home, br_home;
let tr_temp_offset;

// 반응형 작은 별들의 상태를 관리하는 전역 배열
let reactiveStars = [];

// 레이어별 테마 컬러 변수
let color_biggest_home, color_biggest_target;
let color_size32, color_size22, color_size18;

function setup() {
  createCanvas(600, 600);
  angleMode(DEGREES);
  noStroke();

  // 오리지널 고유 위치 관계 설정
  bl_home = createVector(-5, 5);     // 중앙 메인 큰 별
  tr_home = createVector(65, -55);   // 우상단 별
  tl_home = createVector(-55, -45);  // 좌상단 별
  br_home = createVector(60, 40);    // 우하단 별

  // TR이 큰 별의 바디를 관통해 완벽한 대칭 거리만큼 좌측 하단으로 이동할 오프셋
  tr_temp_offset = p5.Vector.sub(bl_home, tr_home);

  // 크기 순서에 따른 세련된 블루 스펙트럼 컬러 정의
  color_biggest_home = color(255, 255, 255);
  color_biggest_target = color(0, 114, 245);
  color_size32 = color(100, 190, 255);
  color_size22 = color(165, 222, 255);
  color_size18 = color(225, 243, 255);

  // 작은 별들의 개별 속성 정의 (레이어 순서대로 TL -> BR 배치)
  reactiveStars = [
    { id: 'TL', home: tl_home, size: 18, pulsePhase: 45,  pulseSpeed: 4.5, currentBlast: 0, col: color_size18 },
    { id: 'BR', home: br_home, size: 22, pulsePhase: 90,  pulseSpeed: 3.5, currentBlast: 0, col: color_size22 }
  ];
}

function draw() {
  background(12, 12, 20);
  translate(width / 2, height / 2);

  rotate(sin(frameCount * 0.5) * 1.5);

  // -------------------------------------------------------------
  // 1. 통합 루프 타임라인 제어 시스템 (총 420프레임 주기)
  // -------------------------------------------------------------
  let totalFrames = 420;
  let frameInLoop = frameCount % totalFrames;

  let bigPos = bl_home.copy();
  let bigAngle = 0;
  let followOffset = createVector(0, 0);
  let tlRhythmScale = 1.0;
  let colorMorphAmt = 0;

  let tlPos = tl_home.copy();
  let brPos = br_home.copy();
  let trPos = tr_home.copy();

  let trActiveScale = 1.0;

  let morphTL = 0; let morphBR = 0; let morphTR = 0; let morphBL = 0;
  let mergeScaleTL = 1.0; let mergeScaleBR = 1.0; let mergeScaleTR = 1.0;

  // =============================================================
  // [구간 A: 0 ~ 240 프레임] 기존의 대이동 및 왕복 페이즈
  // =============================================================
  if (frameInLoop < 240) {
    let progress = frameInLoop / 240;

    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      let eased = easeInOutQuint(t);
      bigPos = p5.Vector.lerp(bl_home, tr_home, eased);
      bigAngle = eased * 180;
      followOffset = p5.Vector.sub(bigPos, bl_home);
      let trTarget = p5.Vector.add(tr_home, tr_temp_offset);
      trPos = p5.Vector.lerp(tr_home, trTarget, eased);
      trActiveScale = map(cos(eased * 360), -1, 1, 0, 1);
      colorMorphAmt = eased;
    }
    else if (progress < 0.50) {
      let t = map(progress, 0.25, 0.50, 0, 1);
      bigPos = tr_home.copy(); bigAngle = 180;
      followOffset = p5.Vector.sub(tr_home, bl_home);
      trPos = p5.Vector.add(tr_home, tr_temp_offset);
      trActiveScale = 1.0;
      if (t < 0.5) tlRhythmScale = map(easeInOutCubic(t * 2), 0, 1, 1.0, 0.25);
      else tlRhythmScale = map(easeInOutCubic((t - 0.5) * 2), 0, 1, 0.25, 1.0);
      colorMorphAmt = 1.0;
    }
    else if (progress < 0.75) {
      let t = map(progress, 0.50, 0.75, 0, 1);
      let eased = easeInOutCubic(t);
      bigPos = p5.Vector.lerp(tr_home, bl_home, eased);
      bigAngle = 180 + (eased * 180);
      followOffset = p5.Vector.sub(bigPos, bl_home);
      let trStart = p5.Vector.add(tr_home, tr_temp_offset);
      trPos = p5.Vector.lerp(trStart, tr_home, eased);
      trActiveScale = map(cos(eased * 360), -1, 1, 0, 1);
      colorMorphAmt = map(eased, 0, 1, 1.0, 0.0);
    }
    tlPos = p5.Vector.add(tl_home, followOffset);
    brPos = p5.Vector.add(br_home, followOffset);
  }
  // =============================================================
  // [구간 B: 240 ~ 420 프레임] 초고속 모핑 및 점진적 가속 흡입 병합 페이즈
  // =============================================================
  else {
    // 1단계: 15프레임 압축 초고속 릴레이 원형 변형 (240 ~ 279프레임)
    let tTL = constrain(map(frameInLoop, 240, 255, 0, 1), 0, 1); morphTL = easeInOutQuint(tTL);
    let tBR = constrain(map(frameInLoop, 248, 263, 0, 1), 0, 1); morphBR = easeInOutQuint(tBR);
    let tTR = constrain(map(frameInLoop, 256, 271, 0, 1), 0, 1); morphTR = easeInOutQuint(tTR);
    let tBL = constrain(map(frameInLoop, 264, 279, 0, 1), 0, 1); morphBL = easeInOutQuint(tBL);

    if (frameInLoop >= 279) { morphTL = 1; morphBR = 1; morphTR = 1; morphBL = 1; }

    // 2단계: 시간차가 0.3초 -> 0.2초 -> 0.1초로 점진적으로 줄어드는 흡입 타임라인
    let tlStart = 285;
    let brStart = tlStart + 18;   // +0.3초
    let trStart = brStart + 12;   // +0.2초

    let tlDur = 18;  // 0.3초
    let brDur = 12;  // 0.2초
    let trDur = 6;   // 0.1초 (초고속 스냅)

    tlPos = tl_home.copy(); brPos = br_home.copy(); trPos = tr_home.copy();

    // TL (크기 18)
    if (frameInLoop >= tlStart) {
      let tMove = constrain(map(frameInLoop, tlStart, tlStart + tlDur, 0, 1), 0, 1);
      tlPos = p5.Vector.lerp(tl_home, bl_home, easeInOutQuint(tMove));

      let tScale = constrain(map(frameInLoop, tlStart + tlDur, tlStart + tlDur + tlDur, 0, 1), 0, 1);
      mergeScaleTL = lerp(1.0, 75 / 18, easeInOutQuint(tScale));
    }

    // BR (크기 22)
    if (frameInLoop >= brStart) {
      let tMove = constrain(map(frameInLoop, brStart, brStart + brDur, 0, 1), 0, 1);
      brPos = p5.Vector.lerp(br_home, bl_home, easeInOutQuint(tMove));

      let tScale = constrain(map(frameInLoop, brStart + brDur, brStart + brDur + brDur, 0, 1), 0, 1);
      mergeScaleBR = lerp(1.0, 75 / 22, easeInOutQuint(tScale));
    }

    // TR (크기 32)
    if (frameInLoop >= trStart) {
      let tMove = constrain(map(frameInLoop, trStart, trStart + trDur, 0, 1), 0, 1);
      trPos = p5.Vector.lerp(tr_home, bl_home, easeInOutQuint(tMove));

      let tScale = constrain(map(frameInLoop, trStart + trDur, trStart + trDur + trDur, 0, 1), 0, 1);
      mergeScaleTR = lerp(1.0, 75 / 32, easeInOutQuint(tScale));
    }
  }

  let pulseBig = 1 + sin(frameCount * 4.0) * 0.12;
  let pulseTR = 1 + sin(frameCount * 5.0 + 135) * 0.15;

  // =============================================================
  // 레이어 렌더링 순서 (하위 레이어부터 드로우)
  // =============================================================

  // LAYER 1: 큰 원 (BL - 크기 75)
  push();
  translate(bigPos.x, bigPos.y);
  rotate(bigAngle);
  scale(pulseBig);
  let currentBigColor = lerpColor(color_biggest_home, color_biggest_target, color_colorMorphAmtFactor(colorMorphAmt));
  fill(currentBigColor);
  drawDenseMorphSparkle(75, morphBL);
  pop();

  // LAYER 2 & 3: 작은 원들 (TL, BR)
  for (let s of reactiveStars) {
    push();
    let finalPos = s.home.copy();
    let dynamicScale = 1.0;

    if (frameInLoop < 240) {
      let toSmall = p5.Vector.sub(tlPos, bigPos);
      if (s.id === 'BR') toSmall = p5.Vector.sub(brPos, bigPos);
      let angleToSmall = atan2(toSmall.y, toSmall.x); if (angleToSmall < 0) angleToSmall += 360;
      let currentBigAngleNormalized = (bigAngle % 360 + 360) % 360;
      let angleDiff = abs((angleToSmall - currentBigAngleNormalized) % 90); if (angleDiff > 45) angleDiff = 90 - angleDiff;
      let targetBlast = map(angleDiff, 0, 32, 1, 0, true);
      s.currentBlast = lerp(s.currentBlast, targetBlast, 0.08);
      dynamicScale = map(s.currentBlast, 0, 1, 1.0, 0.3);
      let pushAmount = s.currentBlast * 28;
      let basePos = (s.id === 'TL') ? tlPos : brPos;
      finalPos = p5.Vector.add(basePos, p5.Vector.mult(toSmall.copy().normalize(), pushAmount));
    } else {
      finalPos = (s.id === 'TL') ? tlPos : brPos;
    }

    translate(finalPos.x, finalPos.y);
    let smallPulse = 1 + sin(frameCount * s.pulseSpeed + s.pulsePhase) * 0.14;

    if (s.id === 'TL') {
      scale(smallPulse * dynamicScale * tlRhythmScale * mergeScaleTL);
      fill(s.col); drawDenseMorphSparkle(s.size, morphTL);
    } else {
      scale(smallPulse * dynamicScale * mergeScaleBR);
      fill(s.col); drawDenseMorphSparkle(s.size, morphBR);
    }
    pop();
  }

  // LAYER 4: TR (크기 32)
  push();
  fill(color_size32);
  translate(trPos.x, trPos.y);
  let finalTRScale = (frameInLoop < 240) ? (pulseTR * trActiveScale) : (pulseTR * mergeScaleTR);
  scale(finalTRScale);
  drawDenseMorphSparkle(32, morphTR);
  pop();
}

// 80개의 고밀도 정점 정원 보간 함수
function drawDenseMorphSparkle(size, morph) {
  beginShape(); let steps = 20;
  for (let i = 0; i <= steps; i++) {
    let t = i / steps; let starX = size * (t * t); let starY = -size * ((1 - t) * (1 - t));
    let angle = t * 90; let circX = size * sin(angle); let circY = -size * cos(angle);
    vertex(lerp(starX, circX, morph), lerp(starY, circY, morph));
  }
  for (let i = 0; i <= steps; i++) {
    let t = i / steps; let starX = size * ((1 - t) * (1 - t)); let starY = size * (t * t);
    let angle = 90 + t * 90; let circX = size * sin(angle); let circY = -size * cos(angle);
    vertex(lerp(starX, circX, morph), lerp(starY, circY, morph));
  }
  for (let i = 0; i <= steps; i++) {
    let t = i / steps; let starX = -size * (t * t); let starY = size * ((1 - t) * (1 - t));
    let angle = 180 + t * 90; let circX = size * sin(angle); let circY = -size * cos(angle);
    vertex(lerp(starX, circX, morph), lerp(starY, circY, morph));
  }
  for (let i = 0; i <= steps; i++) {
    let t = i / steps; let starX = -size * ((1 - t) * (1 - t)); let starY = -size * (t * t);
    let angle = 270 + t * 90; let circX = size * sin(angle); let circY = -size * cos(angle);
    vertex(lerp(starX, circX, morph), lerp(starY, circY, morph));
  }
  endShape(CLOSE);
}

// 이징 보조 함수들
function color_colorMorphAmtFactor(x) { return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2; }
function easeInOutQuint(x) { return x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2; }
function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2; }
