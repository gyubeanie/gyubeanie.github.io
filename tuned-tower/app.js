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

const BASE_OMEGA = 5.4;
const BUILDING_DAMPING = 0.018;
const MAX_LEVELS = 7;
const FIXED_DT = 1 / 120;
const HISTORY_SECONDS = 7;
const HISTORY_SIZE = Math.round(HISTORY_SECONDS / FIXED_DT);

const game = {
  level: 1,
  score: 0,
  testsLeft: 6,
  target: createTarget(1),
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

function createTarget(level) {
  const seed = Math.sin(level * 81.91) * 10000;
  const random = seed - Math.floor(seed);
  const random2 = Math.sin(level * 43.17 + 4.2) * 10000 % 1;
  const random3 = Math.sin(level * 19.71 + 8.9) * 10000 % 1;
  const r1 = Math.abs(random);
  const r2 = Math.abs(random2);
  const r3 = Math.abs(random3);
  const spread = Math.min(1, 0.52 + level * 0.08);

  return {
    massRatio: roundTo(0.035 + spread * (0.095 - 0.035) * r1, 0.001),
    tuningRatio: roundTo(0.82 + spread * (1.18 - 0.82) * r2, 0.01),
    dampingRatio: roundTo(0.05 + spread * (0.28 - 0.05) * r3, 0.01),
  };
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

function runTest(type) {
  if (game.testsLeft <= 0 || game.isResolved) return;
  game.testsLeft -= 1;
  resetMotion();

  if (type === "gust") {
    sim.v = 1.05 + game.level * 0.06;
    sim.x = 0.02;
    game.activeTest = "Wind gust";
    els.clue.textContent = "Watch how quickly sway fades";
  } else if (type === "quake") {
    sim.v = -0.45;
    sim.x = -0.08;
    sim.y = 0.04;
    game.activeTest = "Quake pulse";
    els.clue.textContent = "Compare tower and ball phase";
  } else {
    sim.forcing = 1;
    game.activeTest = "Steady vibration";
    els.clue.textContent = "A tuned ball cancels repeated sway";
  }

  updateHud();
}

function stepSimulation(dt) {
  const p = game.target;
  const mu = p.massRatio;
  const omega = BASE_OMEGA;
  const wd = BASE_OMEGA * p.tuningRatio;
  const zetaB = BUILDING_DAMPING;
  const zetaD = p.dampingRatio;
  const rel = sim.x - sim.y;
  const relVel = sim.v - sim.u;
  const wind = gustForce(sim.t) + vibrationForce(sim.t) * sim.forcing;

  const springBuilding = -(omega * omega) * sim.x;
  const dampBuilding = -2 * zetaB * omega * sim.v;
  const damperSpring = -mu * (wd * wd) * rel;
  const damperDamping = -mu * 2 * zetaD * wd * relVel;
  const ax = springBuilding + dampBuilding + damperSpring + damperDamping + wind;
  const ay = (wd * wd) * rel + 2 * zetaD * wd * relVel;

  sim.v += ax * dt;
  sim.x += sim.v * dt;
  sim.u += ay * dt;
  sim.y += sim.u * dt;
  sim.t += dt;

  sim.x = clamp(sim.x, -1.4, 1.4);
  sim.y = clamp(sim.y, -1.7, 1.7);
  sim.v = clamp(sim.v, -8, 8);
  sim.u = clamp(sim.u, -9, 9);
  sim.peak = Math.max(sim.peak, Math.abs(sim.x));
  sim.history.push(sim.x);
  if (sim.history.length > HISTORY_SIZE) sim.history.shift();
}

function gustForce(t) {
  if (game.activeTest !== "Wind gust") return 0;
  return Math.exp(-t * 1.6) * Math.sin(t * 7.5) * 0.32;
}

function vibrationForce(t) {
  if (game.activeTest !== "Steady vibration") return 0;
  return Math.sin(t * BASE_OMEGA * 1.03) * 0.24;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getGuess() {
  return {
    massRatio: Number(els.massSlider.value) / 100,
    tuningRatio: Number(els.tuningSlider.value),
    dampingRatio: Number(els.dampingSlider.value) / 100,
  };
}

function scoreGuess(guess, target) {
  const massError = Math.abs(guess.massRatio - target.massRatio) / 0.1;
  const tuningError = Math.abs(guess.tuningRatio - target.tuningRatio) / 0.5;
  const dampingError = Math.abs(guess.dampingRatio - target.dampingRatio) / 0.33;
  const weighted = massError * 0.34 + tuningError * 0.42 + dampingError * 0.24;
  const accuracy = clamp(1 - weighted, 0, 1);

  return {
    points: Math.round(accuracy * 1000 + game.testsLeft * 35),
    accuracy,
    massError,
    tuningError,
    dampingError,
  };
}

function submitGuess(event) {
  event.preventDefault();
  if (game.isResolved) {
    nextLevel();
    return;
  }

  const guess = getGuess();
  const result = scoreGuess(guess, game.target);
  game.score += result.points;
  game.lastResult = result;
  game.isResolved = true;
  els.form.querySelector(".primary-button").textContent = game.level >= MAX_LEVELS ? "Restart game" : "Next level";
  els.feedback.className = `feedback ${result.accuracy > 0.78 ? "good" : result.accuracy > 0.5 ? "warn" : "bad"}`;
  els.feedback.textContent = buildResultText(guess, game.target, result);
  updateHud();
}

function buildResultText(guess, target, result) {
  const lead = result.accuracy > 0.78 ? "Strong match." : result.accuracy > 0.5 ? "Close read." : "Rough estimate.";
  return `${lead} Actual ball: ${(target.massRatio * 100).toFixed(1)}% mass, ${target.tuningRatio.toFixed(2)}x tuning, ${(target.dampingRatio * 100).toFixed(0)}% damping. +${result.points} points.`;
}

function nextLevel() {
  if (game.level >= MAX_LEVELS) {
    game.level = 1;
    game.score = 0;
  } else {
    game.level += 1;
  }

  game.testsLeft = Math.max(3, 7 - Math.floor(game.level / 2));
  game.target = createTarget(game.level);
  game.lastResult = null;
  game.isResolved = false;
  els.form.querySelector(".primary-button").textContent = "Submit guess";
  els.feedback.className = "feedback";
  els.feedback.textContent = "New hidden steel ball installed. Run tests, then submit your estimate.";
  els.objective.textContent = `Level ${game.level}: identify mass, tuning, and damping`;
  els.clue.textContent = "Run a test and watch the response";
  resetMotion();
  updateSliders();
}

function updateSliders() {
  els.massOutput.textContent = `${Number(els.massSlider.value).toFixed(1)}%`;
  els.tuningOutput.textContent = `${Number(els.tuningSlider.value).toFixed(2)}x`;
  els.dampingOutput.textContent = `${Number(els.dampingSlider.value).toFixed(0)}%`;
}

function updateHud() {
  els.level.textContent = String(game.level);
  els.score.textContent = String(game.score);
  els.tests.textContent = String(game.testsLeft);
  els.test.textContent = game.activeTest;
  els.peak.textContent = `Peak sway ${sim.peak.toFixed(2)} m`;
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
  const baseY = height - 28;
  const towerHeight = Math.min(height * 0.78, width < 520 ? height * 0.74 : height * 0.82);
  const floors = 16;
  const towerWidth = clamp(width * 0.2, 72, 138);
  const centerX = width * (width > 760 ? 0.48 : 0.5);
  const swayScale = clamp(width * 0.115, 38, 108);
  const topSway = sim.x * swayScale;
  const ballSway = sim.y * swayScale;
  const topY = baseY - towerHeight;
  const floorH = towerHeight / floors;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  const leftBase = centerX - towerWidth / 2;
  const rightBase = centerX + towerWidth / 2;
  const leftTop = centerX - towerWidth * 0.38 + topSway;
  const rightTop = centerX + towerWidth * 0.38 + topSway;

  const towerGradient = ctx.createLinearGradient(0, topY, 0, baseY);
  towerGradient.addColorStop(0, "#d5ddd5");
  towerGradient.addColorStop(0.48, "#9cad9f");
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
  for (let floor = 1; floor < floors; floor += 1) {
    const ratio = floor / floors;
    const y = baseY - floorH * floor;
    const sway = topSway * ratio * ratio;
    const w = towerWidth * (1 - ratio * 0.2);
    ctx.beginPath();
    ctx.moveTo(centerX - w / 2 + sway, y);
    ctx.lineTo(centerX + w / 2 + sway, y);
    ctx.stroke();
  }

  drawWindows(centerX, topY, baseY, towerWidth, topSway, floors);
  drawDamper(centerX, topY, towerWidth, topSway, ballSway);
  ctx.restore();
}

function drawWindows(centerX, topY, baseY, towerWidth, topSway, floors) {
  const floorH = (baseY - topY) / floors;
  const lit = Math.floor((performance.now() * 0.002) % floors);

  for (let floor = 3; floor < floors - 2; floor += 1) {
    const ratio = floor / floors;
    const y = baseY - floorH * floor + floorH * 0.28;
    const sway = topSway * ratio * ratio;
    const rowWidth = towerWidth * (0.72 - ratio * 0.08);
    const cols = 4;
    const gap = rowWidth / cols;
    for (let col = 0; col < cols; col += 1) {
      const x = centerX - rowWidth / 2 + col * gap + gap * 0.25 + sway;
      ctx.fillStyle = floor === lit || (floor + col) % 5 === 0 ? "rgba(240, 185, 90, 0.74)" : "rgba(27, 54, 61, 0.62)";
      ctx.fillRect(x, y, gap * 0.5, Math.max(3, floorH * 0.22));
    }
  }
}

function drawDamper(centerX, topY, towerWidth, topSway, ballSway) {
  const chamberY = topY + 32;
  const chamberH = 72;
  const chamberW = towerWidth * 0.72;
  const anchorX = centerX + topSway;
  const ballX = centerX + ballSway;
  const ballY = chamberY + chamberH * 0.66;
  const radius = clamp(towerWidth * (0.085 + game.target.massRatio * 0.55), 9, 18);

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
updateSliders();
updateHud();
requestAnimationFrame(frame);
