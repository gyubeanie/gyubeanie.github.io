"use strict";

const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const els = {
  level: document.getElementById("levelLabel"),
  score: document.getElementById("scoreLabel"),
  tests: document.getElementById("testsLabel"),
  test: document.getElementById("testLabel"),
  peak: document.getElementById("peakLabel"),
  objective: document.getElementById("objectiveLabel"),
  clue: document.getElementById("clueLabel"),
  massSlider: document.getElementById("massSlider"),
  tuningSlider: document.getElementById("tuningSlider"),
  dampingSlider: document.getElementById("dampingSlider"),
  massOutput: document.getElementById("massOutput"),
  tuningOutput: document.getElementById("tuningOutput"),
  dampingOutput: document.getElementById("dampingOutput"),
  feedback: document.getElementById("feedback"),
  form: document.getElementById("guessForm"),
  reset: document.getElementById("resetButton"),
  testButtons: Array.from(document.querySelectorAll("[data-test]")),
};

const LEVELS = [
  {
    name: "Riverside Office",
    heightM: 180,
    floors: 42,
    visualHeight: 0.6,
    widthRatio: 0.22,
    taper: 0.1,
    chamberPlacement: 0.72,
    modalMassT: 14000,
    naturalHz: 0.34,
    buildingDamping: 0.028,
    tests: 6,
    accuracyPoints: 900,
    noise: 0,
    gust: 0.92,
    quake: 0.82,
    massRange: [80, 520],
    target: { massT: 180, tuningRatio: 1.04, dampingRatio: 0.12 },
    tolerance: { massT: 130, tuningRatio: 0.12, dampingRatio: 0.09 },
  },
  {
    name: "Harbor Spire",
    heightM: 245,
    floors: 58,
    visualHeight: 0.66,
    widthRatio: 0.19,
    taper: 0.16,
    chamberPlacement: 0.78,
    modalMassT: 19000,
    naturalHz: 0.28,
    buildingDamping: 0.024,
    tests: 6,
    accuracyPoints: 1000,
    noise: 0.012,
    gust: 1,
    quake: 0.9,
    massRange: [120, 760],
    target: { massT: 420, tuningRatio: 0.96, dampingRatio: 0.17 },
    tolerance: { massT: 120, tuningRatio: 0.1, dampingRatio: 0.08 },
  },
  {
    name: "Tapered Crown",
    heightM: 320,
    floors: 74,
    visualHeight: 0.71,
    widthRatio: 0.17,
    taper: 0.24,
    chamberPlacement: 0.84,
    modalMassT: 25000,
    naturalHz: 0.23,
    buildingDamping: 0.021,
    tests: 5,
    accuracyPoints: 1125,
    noise: 0.018,
    gust: 1.08,
    quake: 1,
    massRange: [180, 920],
    target: { massT: 360, tuningRatio: 1.09, dampingRatio: 0.09 },
    tolerance: { massT: 105, tuningRatio: 0.085, dampingRatio: 0.07 },
  },
  {
    name: "Needle Tower",
    heightM: 410,
    floors: 92,
    visualHeight: 0.76,
    widthRatio: 0.145,
    taper: 0.12,
    chamberPlacement: 0.9,
    modalMassT: 30000,
    naturalHz: 0.18,
    buildingDamping: 0.018,
    tests: 5,
    accuracyPoints: 1250,
    noise: 0.024,
    gust: 1.18,
    quake: 1.06,
    massRange: [250, 1200],
    target: { massT: 760, tuningRatio: 1.01, dampingRatio: 0.21 },
    tolerance: { massT: 95, tuningRatio: 0.075, dampingRatio: 0.06 },
  },
  {
    name: "Sky Garden",
    heightM: 475,
    floors: 104,
    visualHeight: 0.8,
    widthRatio: 0.16,
    taper: 0.3,
    chamberPlacement: 0.68,
    modalMassT: 38000,
    naturalHz: 0.155,
    buildingDamping: 0.017,
    tests: 4,
    accuracyPoints: 1400,
    noise: 0.03,
    gust: 1.28,
    quake: 1.13,
    massRange: [280, 1400],
    target: { massT: 520, tuningRatio: 0.91, dampingRatio: 0.14 },
    tolerance: { massT: 85, tuningRatio: 0.065, dampingRatio: 0.052 },
  },
  {
    name: "Monsoon Core",
    heightM: 560,
    floors: 118,
    visualHeight: 0.83,
    widthRatio: 0.135,
    taper: 0.2,
    chamberPlacement: 0.86,
    modalMassT: 43000,
    naturalHz: 0.128,
    buildingDamping: 0.015,
    tests: 4,
    accuracyPoints: 1550,
    noise: 0.038,
    gust: 1.4,
    quake: 1.2,
    massRange: [350, 1600],
    target: { massT: 1120, tuningRatio: 1.12, dampingRatio: 0.08 },
    tolerance: { massT: 75, tuningRatio: 0.055, dampingRatio: 0.045 },
  },
  {
    name: "Supertall Crown",
    heightM: 640,
    floors: 132,
    visualHeight: 0.86,
    widthRatio: 0.125,
    taper: 0.28,
    chamberPlacement: 0.93,
    modalMassT: 48000,
    naturalHz: 0.108,
    buildingDamping: 0.014,
    tests: 3,
    accuracyPoints: 1750,
    noise: 0.046,
    gust: 1.52,
    quake: 1.32,
    massRange: [420, 1700],
    target: { massT: 930, tuningRatio: 0.97, dampingRatio: 0.24 },
    tolerance: { massT: 65, tuningRatio: 0.045, dampingRatio: 0.038 },
  },
];

const TEST_BONUS = 45;
const MAX_LEVELS = LEVELS.length;
const FIXED_DT = 1 / 120;
const HISTORY_SECONDS = 7;
const HISTORY_SIZE = Math.round(HISTORY_SECONDS / FIXED_DT);
const VISUAL_TIME_SCALE = 3.2;

const game = {
  levelIndex: 0,
  score: 0,
  testsLeft: LEVELS[0].tests,
  activeTest: "Ready",
  lastResult: null,
  isResolved: false,
};

const sim = {
  x: 0,
  v: 0,
  y: 0,
  u: 0,
  t: 0,
  forcing: 0,
  peak: 0,
  history: [],
};

let dpr = 1;
let lastFrame = performance.now();
let accumulator = 0;

function currentLevel() {
  return LEVELS[game.levelIndex];
}

function campaignMaxScore() {
  return LEVELS.reduce((total, level) => total + maxLevelScore(level), 0);
}

function maxLevelScore(level) {
  return level.accuracyPoints + level.tests * TEST_BONUS;
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function resetMotion() {
  sim.x = 0;
  sim.v = 0;
  sim.y = 0;
  sim.u = 0;
  sim.t = 0;
  sim.forcing = 0;
  sim.peak = 0;
  sim.history = [];
  game.activeTest = "Ready";
  updateHud();
}

function configureLevelControls() {
  const level = currentLevel();
  const [minMass, maxMass] = level.massRange;
  els.massSlider.min = String(minMass);
  els.massSlider.max = String(maxMass);
  els.massSlider.step = "10";
  els.massSlider.value = String(roundTo((minMass + maxMass) / 2, 10));
  els.tuningSlider.min = "0.70";
  els.tuningSlider.max = "1.30";
  els.tuningSlider.step = "0.01";
  els.tuningSlider.value = "1.00";
  els.dampingSlider.min = "3";
  els.dampingSlider.max = "30";
  els.dampingSlider.step = "1";
  els.dampingSlider.value = "15";
  updateSliders();
}

function runTest(type) {
  if (game.testsLeft <= 0 || game.isResolved) return;
  const level = currentLevel();
  game.testsLeft -= 1;
  resetMotion();

  if (type === "gust") {
    sim.v = level.gust * (0.82 + level.heightM / 850);
    sim.x = 0.018 * level.gust;
    game.activeTest = "Wind gust";
    els.clue.textContent = "Decay speed is the mass and damping clue";
  } else if (type === "quake") {
    sim.v = -0.34 * level.quake;
    sim.x = -0.075 * level.quake;
    sim.y = 0.035;
    game.activeTest = "Quake pulse";
    els.clue.textContent = "Tower-ball phase reveals tuning";
  } else {
    sim.forcing = 1;
    game.activeTest = "Steady vibration";
    els.clue.textContent = "A matched damper flattens the trace";
  }

  updateHud();
}

function stepSimulation(dt) {
  const level = currentLevel();
  const p = level.target;
  const mu = clamp(p.massT / level.modalMassT, 0.003, 0.055);
  const omega = 2 * Math.PI * level.naturalHz * VISUAL_TIME_SCALE;
  const wd = omega * p.tuningRatio;
  const zetaB = level.buildingDamping;
  const zetaD = p.dampingRatio;
  const rel = sim.x - sim.y;
  const relVel = sim.v - sim.u;
  const force = gustForce(sim.t) + vibrationForce(sim.t) * sim.forcing + noiseForce(sim.t);

  const springBuilding = -(omega * omega) * sim.x;
  const dampBuilding = -2 * zetaB * omega * sim.v;
  const damperSpring = -mu * (wd * wd) * rel;
  const damperDamping = -mu * 2 * zetaD * wd * relVel;
  const ax = springBuilding + dampBuilding + damperSpring + damperDamping + force;
  const ay = (wd * wd) * rel + 2 * zetaD * wd * relVel;

  sim.v += ax * dt;
  sim.x += sim.v * dt;
  sim.u += ay * dt;
  sim.y += sim.u * dt;
  sim.t += dt;

  sim.x = clamp(sim.x, -1.45, 1.45);
  sim.y = clamp(sim.y, -1.8, 1.8);
  sim.v = clamp(sim.v, -8, 8);
  sim.u = clamp(sim.u, -9, 9);
  sim.peak = Math.max(sim.peak, Math.abs(sim.x));
  sim.history.push(sim.x);
  if (sim.history.length > HISTORY_SIZE) sim.history.shift();
}

function gustForce(t) {
  if (game.activeTest !== "Wind gust") return 0;
  const level = currentLevel();
  return Math.exp(-t * 1.45) * Math.sin(t * 6.4) * 0.28 * level.gust;
}

function vibrationForce(t) {
  if (game.activeTest !== "Steady vibration") return 0;
  const level = currentLevel();
  const omega = 2 * Math.PI * level.naturalHz * VISUAL_TIME_SCALE;
  return Math.sin(t * omega * 1.02) * 0.21 * level.gust;
}

function noiseForce(t) {
  const level = currentLevel();
  if (!level.noise || game.activeTest === "Ready") return 0;
  return level.noise * (Math.sin(t * 9.7 + 1.1) + 0.55 * Math.sin(t * 15.1 + 2.4));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getGuess() {
  return {
    massT: Number(els.massSlider.value),
    tuningRatio: Number(els.tuningSlider.value),
    dampingRatio: Number(els.dampingSlider.value) / 100,
  };
}

function scoreGuess(guess, level) {
  const target = level.target;
  const massError = Math.abs(guess.massT - target.massT) / level.tolerance.massT;
  const tuningError = Math.abs(guess.tuningRatio - target.tuningRatio) / level.tolerance.tuningRatio;
  const dampingError = Math.abs(guess.dampingRatio - target.dampingRatio) / level.tolerance.dampingRatio;
  const weighted = massError * 0.34 + tuningError * 0.42 + dampingError * 0.24;
  const accuracy = clamp(1 - weighted, 0, 1);
  const accuracyPoints = Math.round(level.accuracyPoints * accuracy);
  const testPoints = game.testsLeft * TEST_BONUS;
  const maxPoints = maxLevelScore(level);
  const points = accuracyPoints + testPoints;
  const percent = points / maxPoints;

  return {
    points,
    maxPoints,
    percent,
    accuracy,
    accuracyPoints,
    testPoints,
    maxAccuracyPoints: level.accuracyPoints,
    maxTestPoints: level.tests * TEST_BONUS,
    stars: percent >= 0.9 ? 3 : percent >= 0.7 ? 2 : percent >= 0.5 ? 1 : 0,
    errors: { massError, tuningError, dampingError },
  };
}

function submitGuess(event) {
  event.preventDefault();
  if (game.isResolved) {
    nextLevel();
    return;
  }

  const level = currentLevel();
  const guess = getGuess();
  const result = scoreGuess(guess, level);
  game.score += result.points;
  game.lastResult = result;
  game.isResolved = true;
  els.form.querySelector(".primary-button").textContent = game.levelIndex >= MAX_LEVELS - 1 ? "Restart game" : "Next level";
  els.feedback.className = `feedback ${result.percent > 0.78 ? "good" : result.percent > 0.5 ? "warn" : "bad"}`;
  els.feedback.textContent = buildResultText(level, result);
  els.objective.textContent = `${level.name}: ${result.points}/${result.maxPoints}`;
  els.clue.textContent = buildMissText(result);
  updateHud();
}

function buildResultText(level, result) {
  const target = level.target;
  const percent = Math.round(result.percent * 100);
  const starText = result.stars === 1 ? "1 star" : `${result.stars} stars`;
  return `${starText}. Level score ${result.points}/${result.maxPoints} (${percent}%). Accuracy ${result.accuracyPoints}/${result.maxAccuracyPoints}; test bonus ${result.testPoints}/${result.maxTestPoints}. Actual ball: ${target.massT} t, ${target.tuningRatio.toFixed(2)}x tuning, ${Math.round(target.dampingRatio * 100)}% damping.`;
}

function buildMissText(result) {
  const errors = [
    ["Mass", result.errors.massError],
    ["Tuning", result.errors.tuningError],
    ["Damping", result.errors.dampingError],
  ].sort((a, b) => b[1] - a[1]);

  if (result.percent >= 0.9) return "Excellent read across all three parameters";
  if (errors[0][1] < 0.55) return "Close on all three parameters";
  return `${errors[0][0]} was the biggest miss`;
}

function nextLevel() {
  if (game.levelIndex >= MAX_LEVELS - 1) {
    game.levelIndex = 0;
    game.score = 0;
  } else {
    game.levelIndex += 1;
  }

  loadCurrentLevel();
}

function loadCurrentLevel() {
  const level = currentLevel();
  game.testsLeft = level.tests;
  game.lastResult = null;
  game.isResolved = false;
  els.form.querySelector(".primary-button").textContent = "Submit guess";
  els.feedback.className = "feedback";
  els.feedback.textContent = "Run tests, submit a final estimate, and maximize the level score.";
  els.objective.textContent = `Level ${game.levelIndex + 1}: ${level.heightM} m, ${level.floors} floors`;
  els.clue.textContent = `Damper chamber at ${Math.round(level.chamberPlacement * 100)}% height`;
  configureLevelControls();
  resetMotion();
  updateHud();
}

function updateSliders() {
  els.massOutput.textContent = `${Number(els.massSlider.value).toFixed(0)} t`;
  els.tuningOutput.textContent = `${Number(els.tuningSlider.value).toFixed(2)}x`;
  els.dampingOutput.textContent = `${Number(els.dampingSlider.value).toFixed(0)}%`;
}

function updateHud() {
  const level = currentLevel();
  const peakMeters = sim.peak * (1.2 + level.heightM / 145);
  els.level.textContent = `${game.levelIndex + 1}/${MAX_LEVELS}`;
  els.score.textContent = `${game.score}/${campaignMaxScore()}`;
  els.tests.textContent = String(game.testsLeft);
  els.test.textContent = game.activeTest;
  els.peak.textContent = `Peak sway ${peakMeters.toFixed(2)} m`;
  els.testButtons.forEach((button) => {
    button.disabled = game.testsLeft <= 0 || game.isResolved;
  });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  drawSky(width, height);
  drawGround(width, height);
  drawTower(width, height);
  drawGraph(width, height);
}

function drawSky(width, height) {
  const t = performance.now() * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 137 + t * 12) % (width + 120) - 60;
    const y = 36 + (i * 53) % Math.max(80, height * 0.45);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, 38 + (i % 4) * 16, 1.5);
  }
  ctx.restore();
}

function drawGround(width, height) {
  const groundY = height - 26;
  ctx.fillStyle = "#20261d";
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.fillStyle = "rgba(240, 185, 90, 0.22)";
  for (let x = 0; x < width; x += 34) {
    ctx.fillRect(x, groundY + 8, 18, 2);
  }
}

function drawTower(width, height) {
  const level = currentLevel();
  const baseY = height - 28;
  const fitRatio = width < 520 ? Math.min(level.visualHeight, 0.79) : level.visualHeight;
  const towerHeight = Math.min(height * fitRatio, height - 56);
  const floors = level.floors;
  const towerWidth = clamp(width * level.widthRatio, 58, 148);
  const centerX = width * (width > 760 ? 0.48 : 0.5);
  const swayScale = clamp(width * (0.08 + level.visualHeight * 0.055), 36, 122);
  const topSway = sim.x * swayScale;
  const ballSway = sim.y * swayScale;
  const topY = baseY - towerHeight;
  const floorBands = Math.min(34, Math.max(14, Math.round(floors / 3)));
  const floorH = towerHeight / floorBands;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  const leftBase = centerX - towerWidth / 2;
  const rightBase = centerX + towerWidth / 2;
  const topWidth = towerWidth * clamp(1 - level.taper, 0.55, 0.92);
  const leftTop = centerX - topWidth / 2 + topSway;
  const rightTop = centerX + topWidth / 2 + topSway;

  const towerGradient = ctx.createLinearGradient(0, topY, 0, baseY);
  towerGradient.addColorStop(0, "#d5ddd5");
  towerGradient.addColorStop(0.5, "#9cad9f");
  towerGradient.addColorStop(1, "#627267");
  ctx.fillStyle = towerGradient;
  ctx.beginPath();
  ctx.moveTo(leftBase, baseY);
  ctx.lineTo(leftTop, topY);
  ctx.lineTo(rightTop, topY);
  ctx.lineTo(rightBase, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(19, 31, 26, 0.42)";
  ctx.lineWidth = 2;
  for (let floor = 1; floor < floorBands; floor += 1) {
    const ratio = floor / floorBands;
    const y = baseY - floorH * floor;
    const sway = topSway * ratio * ratio;
    const w = towerWidth - (towerWidth - topWidth) * ratio;
    ctx.beginPath();
    ctx.moveTo(centerX - w / 2 + sway, y);
    ctx.lineTo(centerX + w / 2 + sway, y);
    ctx.stroke();
  }

  drawWindows(centerX, topY, baseY, towerWidth, topWidth, topSway, floorBands);
  drawDamper(centerX, topY, baseY, towerHeight, towerWidth, topSway, ballSway);
  ctx.restore();
}

function drawWindows(centerX, topY, baseY, towerWidth, topWidth, topSway, floorBands) {
  const floorH = (baseY - topY) / floorBands;
  const lit = Math.floor((performance.now() * 0.002) % floorBands);

  for (let floor = 3; floor < floorBands - 2; floor += 1) {
    const ratio = floor / floorBands;
    const y = baseY - floorH * floor + floorH * 0.28;
    const sway = topSway * ratio * ratio;
    const rowWidth = (towerWidth - (towerWidth - topWidth) * ratio) * 0.72;
    const cols = rowWidth > 86 ? 4 : 3;
    const gap = rowWidth / cols;
    for (let col = 0; col < cols; col += 1) {
      const x = centerX - rowWidth / 2 + col * gap + gap * 0.25 + sway;
      ctx.fillStyle = floor === lit || (floor + col) % 5 === 0 ? "rgba(240, 185, 90, 0.74)" : "rgba(27, 54, 61, 0.62)";
      ctx.fillRect(x, y, gap * 0.5, Math.max(3, floorH * 0.2));
    }
  }
}

function drawDamper(centerX, topY, baseY, towerHeight, towerWidth, topSway, ballSway) {
  const level = currentLevel();
  const chamberCenterY = baseY - towerHeight * level.chamberPlacement;
  const chamberH = clamp(towerHeight * 0.11, 52, 84);
  const chamberY = clamp(chamberCenterY - chamberH / 2, topY + 12, baseY - chamberH - 20);
  const chamberW = towerWidth * clamp(0.78 - level.taper * 0.35, 0.54, 0.76);
  const ratioFromBase = (baseY - chamberCenterY) / towerHeight;
  const chamberSway = topSway * ratioFromBase * ratioFromBase;
  const anchorX = centerX + chamberSway;
  const ballX = centerX + ballSway * ratioFromBase;
  const ballY = chamberY + chamberH * 0.66;
  const radius = clamp(towerWidth * 0.13, 8, 17);

  ctx.fillStyle = "rgba(12, 19, 17, 0.52)";
  ctx.fillRect(anchorX - chamberW / 2, chamberY, chamberW, chamberH);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(anchorX - chamberW / 2, chamberY, chamberW, chamberH);

  ctx.strokeStyle = "#d9d2bf";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anchorX, chamberY + 6);
  ctx.lineTo(ballX, ballY);
  ctx.stroke();

  const ballGradient = ctx.createRadialGradient(ballX - radius * 0.4, ballY - radius * 0.5, 2, ballX, ballY, radius);
  ballGradient.addColorStop(0, "#f9f5e8");
  ballGradient.addColorStop(0.45, "#a9b2aa");
  ballGradient.addColorStop(1, "#58625e");
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawGraph(width, height) {
  const graphW = clamp(width * 0.34, 112, 210);
  const graphH = 54;
  const x = width - graphW - 14;
  const y = height - graphH - 44;

  if (width < 390 && height < 540) return;

  ctx.save();
  ctx.fillStyle = "rgba(17, 19, 15, 0.6)";
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  roundRect(x, y, graphW, graphH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + graphH / 2);
  ctx.lineTo(x + graphW - 8, y + graphH / 2);
  ctx.stroke();

  if (sim.history.length > 1) {
    ctx.strokeStyle = "#56c1a7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    sim.history.forEach((value, index) => {
      const px = x + 8 + (index / (HISTORY_SIZE - 1)) * (graphW - 16);
      const py = y + graphH / 2 - clamp(value, -0.7, 0.7) * graphH * 0.55;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(243, 240, 231, 0.8)";
  ctx.font = "700 10px system-ui, sans-serif";
  ctx.fillText("sway trace", x + 10, y + 15);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function frame(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    stepSimulation(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  updateHud();
  draw();
  requestAnimationFrame(frame);
}

els.testButtons.forEach((button) => {
  button.addEventListener("click", () => runTest(button.dataset.test));
});

[els.massSlider, els.tuningSlider, els.dampingSlider].forEach((slider) => {
  slider.addEventListener("input", updateSliders);
});

els.form.addEventListener("submit", submitGuess);
els.reset.addEventListener("click", resetMotion);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loadCurrentLevel();
requestAnimationFrame(frame);
