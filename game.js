const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const waveEl = document.getElementById('wave');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const difficultySelect = document.getElementById('difficulty');

const difficulties = {
  beginner: {
    health: 5,
    meteorSpeed: 0.78,
    meteorRate: 1.35,
    enemySpeed: 0.78,
    enemyRate: 1.3,
    enemyFireRate: 1.35,
    maxEnemies: 2,
    scoreMultiplier: 0.8,
  },
  intermediate: {
    health: 3,
    meteorSpeed: 1,
    meteorRate: 1,
    enemySpeed: 1,
    enemyRate: 1,
    enemyFireRate: 1,
    maxEnemies: 5,
    scoreMultiplier: 1,
  },
  legendary: {
    health: 2,
    meteorSpeed: 1.3,
    meteorRate: 0.72,
    enemySpeed: 1.25,
    enemyRate: 0.75,
    enemyFireRate: 0.72,
    maxEnemies: 7,
    scoreMultiplier: 1.5,
  },
};

const keys = new Set();
const stars = [];
const meteors = [];
const crystals = [];
const playerShots = [];
const enemyShots = [];
const enemies = [];
const particles = [];

const state = {
  phase: 'menu',
  score: 0,
  health: 3,
  best: loadBest(),
  lastTime: 0,
  meteorTimer: 0,
  crystalTimer: 0,
  enemyTimer: 2,
  shotTimer: 0,
  elapsed: 0,
  flashTimer: 0,
  wave: 1,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 70,
  size: 22,
  speed: 300,
  invulnerable: 0,
};

function loadBest() {
  try {
    return Number(localStorage.getItem('nova-drift-best')) || 0;
  } catch (error) {
    console.warn('Could not read the saved high score.', error);
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem('nova-drift-best', String(state.best));
  } catch (error) {
    console.warn('Could not save the high score.', error);
  }
}

function initStars() {
  stars.length = 0;
  for (let i = 0; i < 140; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 55 + 20,
      alpha: Math.random() * 0.6 + 0.25,
    });
  }
}

function resetGame() {
  state.phase = 'playing';
  state.score = 0;
  state.health = currentDifficulty().health;
  state.meteorTimer = 0.5;
  state.crystalTimer = 3;
  state.enemyTimer = 2.5;
  state.shotTimer = 0;
  state.elapsed = 0;
  state.flashTimer = 0;
  state.wave = 1;
  player.x = canvas.width / 2;
  player.y = canvas.height - 70;
  player.invulnerable = 0;
  meteors.length = 0;
  crystals.length = 0;
  playerShots.length = 0;
  enemyShots.length = 0;
  enemies.length = 0;
  particles.length = 0;
  keys.clear();
  overlay.classList.remove('visible');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(state.score));
  healthEl.textContent = String(state.health);
  waveEl.textContent = String(state.wave);
  bestEl.textContent = String(state.best);
}

function showOverlay(title, message, buttonText) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  startButton.textContent = buttonText;
  overlay.classList.add('visible');
}

function currentDifficulty() {
  return difficulties[difficultySelect.value] || difficulties.beginner;
}

function spawnMeteor() {
  const size = Math.random() * 17 + 17;
  const speedScale = 1 + (state.wave - 1) * 0.08;
  meteors.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size,
    size,
    health: size > 27 ? 2 : 1,
    speed: (Math.random() * 100 + 155) * speedScale * currentDifficulty().meteorSpeed,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 3,
  });
}

function spawnCrystal() {
  const size = 11;
  crystals.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size,
    size,
    speed: Math.random() * 60 + 105,
    pulse: Math.random() * Math.PI * 2,
  });
}

function spawnEnemy() {
  const size = 22;
  enemies.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size * 2,
    size,
    health: 2 + Math.floor((state.wave - 1) / 3),
    speed: (Math.random() * 35 + 65 + state.wave * 3) * currentDifficulty().enemySpeed,
    drift: Math.random() * 2 + 1,
    phase: Math.random() * Math.PI * 2,
    fireTimer: (1.2 + Math.random()) * currentDifficulty().enemyFireRate,
  });
}

function shoot() {
  playerShots.push({ x: player.x, y: player.y - player.size, radius: 4, speed: 520 });
  playerShots.push({ x: player.x - 9, y: player.y - player.size + 10, radius: 3, speed: 485 });
  playerShots.push({ x: player.x + 9, y: player.y - player.size + 10, radius: 3, speed: 485 });
  state.shotTimer = 0.2;
}

function fireEnemyShot(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = (190 + state.wave * 7) * currentDifficulty().enemySpeed;
  enemyShots.push({
    x: enemy.x,
    y: enemy.y + enemy.size,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    radius: 5,
  });
}

function handleInput(dt) {
  if (state.phase !== 'playing') return;

  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) dy += 1;

  const magnitude = Math.hypot(dx, dy) || 1;
  player.x += (dx / magnitude) * player.speed * dt;
  player.y += (dy / magnitude) * player.speed * dt;
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size + 20, Math.min(canvas.height - player.size, player.y));

  state.shotTimer -= dt;
  if ((keys.has(' ') || keys.has('Space')) && state.shotTimer <= 0) shoot();
}

function updateGame(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > canvas.height) {
      star.y = -4;
      star.x = Math.random() * canvas.width;
    }
  }

  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  state.score += dt * 5 * currentDifficulty().scoreMultiplier;
  state.wave = Math.floor(state.elapsed / 22) + 1;
  state.meteorTimer -= dt;
  state.crystalTimer -= dt;
  state.enemyTimer -= dt;
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (state.meteorTimer <= 0) {
    spawnMeteor();
    state.meteorTimer = Math.max(0.3, 0.95 - state.wave * 0.045) * currentDifficulty().meteorRate;
  }
  if (state.crystalTimer <= 0) {
    spawnCrystal();
    state.crystalTimer = 5;
  }
  if (state.enemyTimer <= 0 && enemies.length < Math.min(currentDifficulty().maxEnemies, 1 + state.wave)) {
    spawnEnemy();
    state.enemyTimer = Math.max(1.5, 4.5 - state.wave * 0.25) * currentDifficulty().enemyRate;
  }

  updateMeteors(dt);
  if (state.phase !== 'playing') return;
  updateEnemies(dt);
  if (state.phase !== 'playing') return;
  updateShots(dt);
  updateCrystals(dt);
  updateParticles(dt);
  updateHud();
}

function updateMeteors(dt) {
  for (const meteor of meteors) {
    meteor.y += meteor.speed * dt;
    meteor.rotation += meteor.spin * dt;
    if (meteor.y - meteor.size > canvas.height) meteor.remove = true;

    if (player.invulnerable <= 0 && collides(player, meteor)) {
      meteor.remove = true;
      damagePlayer();
    }
  }
  removeMarked(meteors);
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    enemy.y += enemy.speed * dt;
    enemy.phase += enemy.drift * dt;
    enemy.x += Math.sin(enemy.phase) * 65 * dt;
    enemy.x = Math.max(enemy.size, Math.min(canvas.width - enemy.size, enemy.x));
    enemy.fireTimer -= dt;

    if (enemy.fireTimer <= 0 && enemy.y > 0) {
      fireEnemyShot(enemy);
      enemy.fireTimer = Math.max(0.55, 1.8 - state.wave * 0.08) * currentDifficulty().enemyFireRate;
    }
    if (enemy.y - enemy.size > canvas.height) enemy.remove = true;
    if (player.invulnerable <= 0 && collides(player, enemy)) {
      enemy.remove = true;
      damagePlayer();
    }
  }
  removeMarked(enemies);

  for (const shot of enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.y > canvas.height + shot.radius || shot.x < -shot.radius || shot.x > canvas.width + shot.radius) {
      shot.remove = true;
    }
    if (player.invulnerable <= 0 && collides(player, shot)) {
      shot.remove = true;
      damagePlayer();
    }
  }
  removeMarked(enemyShots);
}

function updateShots(dt) {
  for (const shot of playerShots) {
    shot.y -= shot.speed * dt;
    if (shot.y < -shot.radius) shot.remove = true;
  }

  for (const shot of playerShots) {
    if (shot.remove) continue;

    for (const meteor of meteors) {
      if (meteor.remove || !collides(shot, meteor)) continue;
      shot.remove = true;
      meteor.health -= 1;
      if (meteor.health <= 0) {
        meteor.remove = true;
        state.score += 18 * currentDifficulty().scoreMultiplier;
        burst(meteor.x, meteor.y, '#e58a5b', 8);
      }
      break;
    }

    if (shot.remove) continue;
    for (const enemy of enemies) {
      if (enemy.remove || !collides(shot, enemy)) continue;
      shot.remove = true;
      enemy.health -= 1;
      if (enemy.health <= 0) {
        enemy.remove = true;
        state.score += 60 * currentDifficulty().scoreMultiplier;
        burst(enemy.x, enemy.y, '#ff6f91', 14);
      }
      break;
    }
  }
  removeMarked(playerShots);
  removeMarked(meteors);
  removeMarked(enemies);
}

function updateCrystals(dt) {
  for (const crystal of crystals) {
    crystal.y += crystal.speed * dt;
    crystal.pulse += dt * 7;
    if (crystal.y - crystal.size > canvas.height) crystal.remove = true;
    if (collides(player, crystal)) {
      crystal.remove = true;
      state.score += 50 * currentDifficulty().scoreMultiplier;
      burst(crystal.x, crystal.y, '#ffd166', 10);
    }
  }
  removeMarked(crystals);
}

function updateParticles(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    if (particle.life <= 0) particle.remove = true;
  }
  removeMarked(particles);
}

function damagePlayer() {
  state.health -= 1;
  state.flashTimer = 0.35;
  player.invulnerable = 1.15;
  burst(player.x, player.y, '#7be0ff', 12);
  if (state.health <= 0) endGame();
  updateHud();
}

function collides(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const ar = a.radius || a.size * 0.65;
  const br = b.radius || b.size * 0.75;
  return Math.hypot(dx, dy) < ar + br;
}

function removeMarked(items) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].remove) items.splice(i, 1);
  }
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 150 + 35;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 1,
      life: Math.random() * 0.4 + 0.25,
      maxLife: 0.65,
      color,
    });
  }
}

function endGame() {
  state.phase = 'over';
  const score = Math.floor(state.score);
  if (score > state.best) {
    state.best = score;
    saveBest();
  }
  updateHud();
  difficultySelect.disabled = false;
  showOverlay('Run complete', `Score: ${score} · Wave: ${state.wave} · Best: ${state.best}`, 'Play Again');
}

function togglePause() {
  if (state.phase === 'playing') {
    state.phase = 'paused';
    difficultySelect.disabled = true;
    showOverlay('Paused', 'Take a breather. Your run is waiting.', 'Resume');
  } else if (state.phase === 'paused') {
    state.phase = 'playing';
    difficultySelect.disabled = false;
    overlay.classList.remove('visible');
    state.lastTime = performance.now();
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.35, 20, canvas.width / 2, canvas.height * 0.35, canvas.height);
  glow.addColorStop(0, '#142449');
  glow.addColorStop(1, '#080d1b');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = '#d9efff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 110, 125, ${state.flashTimer * 0.65})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = '#5ddcff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#7be0ff';
  ctx.beginPath();
  ctx.moveTo(0, -player.size);
  ctx.lineTo(player.size * 0.82, player.size * 0.72);
  ctx.lineTo(0, player.size * 0.42);
  ctx.lineTo(-player.size * 0.82, player.size * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f4fcff';
  ctx.beginPath();
  ctx.ellipse(0, -3, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffae62';
  ctx.beginPath();
  ctx.moveTo(-5, player.size * 0.6);
  ctx.lineTo(0, player.size * 0.6 + Math.random() * 12);
  ctx.lineTo(5, player.size * 0.6);
  ctx.fill();
  ctx.restore();
}

function drawMeteors() {
  for (const meteor of meteors) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.rotation);
    ctx.fillStyle = '#bb6549';
    ctx.strokeStyle = '#f09a6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const angle = (Math.PI * 2 / 9) * i;
      const radius = meteor.size * (0.72 + (i % 2) * 0.28);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = '#ff5b83';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fa6582';
    ctx.beginPath();
    ctx.moveTo(0, enemy.size);
    ctx.lineTo(enemy.size * 0.9, -enemy.size * 0.45);
    ctx.lineTo(enemy.size * 0.35, -enemy.size * 0.2);
    ctx.lineTo(0, -enemy.size * 0.85);
    ctx.lineTo(-enemy.size * 0.35, -enemy.size * 0.2);
    ctx.lineTo(-enemy.size * 0.9, -enemy.size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff2f5';
    ctx.fillRect(-enemy.size * 0.45, -enemy.size * 0.15, enemy.size * 0.3, 4);
    ctx.fillRect(enemy.size * 0.15, -enemy.size * 0.15, enemy.size * 0.3, 4);
    ctx.restore();
  }
}

function drawCrystals() {
  for (const crystal of crystals) {
    const pulse = 1 + Math.sin(crystal.pulse) * 0.18;
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -crystal.size);
    ctx.lineTo(crystal.size * 0.7, 0);
    ctx.lineTo(0, crystal.size);
    ctx.lineTo(-crystal.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShots() {
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#7be0ff';
  ctx.fillStyle = '#d8f8ff';
  for (const shot of playerShots) {
    ctx.beginPath();
    ctx.ellipse(shot.x, shot.y, shot.radius, shot.radius * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = '#ff6685';
  ctx.fillStyle = '#ff9bac';
  for (const shot of enemyShots) {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();
  drawCrystals();
  drawMeteors();
  drawEnemies();
  drawShots();
  drawParticles();
  drawPlayer();
}

function tick(timestamp) {
  const dt = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.033);
  state.lastTime = timestamp;
  handleInput(dt);
  updateGame(dt);
  draw();
  requestAnimationFrame(tick);
}

startButton.addEventListener('click', () => {
  if (state.phase === 'paused') {
    togglePause();
    return;
  }
  difficultySelect.disabled = false;
  resetGame();
  state.lastTime = performance.now();
});

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === ' ' || key.startsWith('Arrow')) event.preventDefault();
  keys.add(key);

  if (key === 'p' && (state.phase === 'playing' || state.phase === 'paused')) togglePause();
  if (key === ' ' && state.phase === 'menu') {
    resetGame();
    state.lastTime = performance.now();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

window.addEventListener('blur', () => keys.clear());

document.querySelectorAll('[data-game-key]').forEach((button) => {
  const key = button.dataset.gameKey;

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (key === 'p') {
      if (state.phase === 'playing' || state.phase === 'paused') togglePause();
      return;
    }
    keys.add(key);
  });

  const release = (event) => {
    event.preventDefault();
    keys.delete(key);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

document.addEventListener('visibilitychange', () => {
  keys.clear();
  if (document.hidden && state.phase === 'playing') togglePause();
});

initStars();
updateHud();
requestAnimationFrame(tick);
