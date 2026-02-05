const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const toggleAudioBtn = document.getElementById("toggle-audio");
const toggleMusicBtn = document.getElementById("toggle-music");
const toggleFogBtn = document.getElementById("toggle-fog");
const resetBtn = document.getElementById("reset");
const startOverlay = document.getElementById("start-overlay");
const startGameBtn = document.getElementById("start-game");
const floatingHint = document.getElementById("floating-hint");
const finishOverlay = document.getElementById("finish-overlay");
const finishRestartBtn = document.getElementById("finish-restart");

const WORLD = {
  width: 2400,
  height: 1600,
};

const player = {
  x: 650,
  y: 250,
  radius: 20,
  speed: 220,
};

const keys = new Set();

const mapImage = new Image();
mapImage.src = "france_physical_map.gif";
let mapLoaded = false;
mapImage.onload = () => {
  mapLoaded = true;
  WORLD.width = mapImage.naturalWidth || WORLD.width;
  WORLD.height = mapImage.naturalHeight || WORLD.height;
  initFog();
};

const playerImage = new Image();
playerImage.src = "assets/player-placeholder.png";
let playerLoaded = false;
playerImage.onload = () => (playerLoaded = true);

const mots = [
  {
    id: "reken",
    text: "Reken",
    xPct: 1474 / 1555,
    yPct: 154 / 2200,
    audio: "audio/jesuis.m4a",
  },
  // {
  //   id: "brighton",
  //   text: "Brighton",
  //   xPct: 620 / 1555,
  //   yPct: 320 / 2200,
  //   audio: "audio/jmappelle.m4a",
  // },
  {
    id: "locranon",
    text: "Locranon",
    xPct: 150 / 1555,
    yPct: 743 / 2200,
    audio: "audio/jaime1.m4a",
  },
  {
    id: "dominique",
    text: "Vouge",
    xPct: 1300 / 1555,
    yPct: 689 / 2200,
    audio: "audio/films.m4a",
  },
  {
    id: "gif",
    text: "Gif",
    xPct: 840 / 1555,
    yPct: 732 / 2200,
    audio: "audio/jmappelle.m4a",
  },
  {
    id: "belcaire",
    text: "Belcaire",
    xPct: 768 / 1555,
    yPct: 1691 / 2200,
    audio: "audio/boston.m4a",
  },
  {
    id: "laroche",
    text: "La Roche",
    xPct: 406 / 1555,
    yPct: 1056 / 2200,
    audio: "audio/jeparle.m4a",
  },
  {
    id: "schweinebucht",
    text: "Schweinebucht",
    xPct: 1294 / 1555,
    yPct: 1636 / 2200,
    audio: "audio/doctorat.m4a",
  },
  {
    id: "stmalo",
    text: "St Malo",
    xPct: 400 / 1555,
    yPct: 686 / 2200,
    audio: "audio/calme.m4a",
  },
];

const collected = new Set();

let audioEnabled = true;
let musicEnabled = true;
let fogEnabled = true;
let lastTime = 0;
let gameStarted = false;

let fogCanvas = document.createElement("canvas");
let fogCtx = fogCanvas.getContext("2d");
const fogRadius = 140;

const bgAudio = new Audio("audio/Elves.mp3");
const bgVolume = 0.16;
bgAudio.loop = true;
bgAudio.volume = bgVolume;
let activeMotAudio = 0;
let fadeRaf = null;
let chimeCtx = null;
let finishShown = false;
let finishTimer = null;
let hintMessage = "";
let hintUntil = 0;
let musicStarted = false;

function setStatus(message) {
  statusEl.textContent = message;
}

function showFloatingHint(message, duration = 4500) {
  hintMessage = message;
  hintUntil = performance.now() + duration;
  if (floatingHint) {
    floatingHint.classList.remove("show");
  }
}

function updateScore() {
  scoreEl.textContent = `Mots: ${collected.size}/${mots.length}`;
}

function scheduleFinishOverlay() {
  if (finishShown) return;
  if (!gameStarted) return;
  if (collected.size !== mots.length) return;
  if (activeMotAudio > 0) return;
  if (finishTimer) return;
  finishTimer = window.setTimeout(() => {
    finishTimer = null;
    if (finishShown) return;
    if (collected.size === mots.length && activeMotAudio === 0) {
      finishShown = true;
      finishOverlay.classList.remove("hidden");
      finishOverlay.style.display = "grid";
    }
  }, 1400);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  toggleAudioBtn.textContent = audioEnabled ? "Audio activé" : "Activer l'audio";
  toggleAudioBtn.classList.toggle("secondary", !audioEnabled);
  setStatus(audioEnabled ? "Audio prêt." : "Audio coupé.");
}

function fadeBackground(targetVolume, duration = 350) {
  if (!musicEnabled) return;
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  const startVolume = bgAudio.volume;
  const start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    bgAudio.volume = startVolume + (targetVolume - startVolume) * t;
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    }
  };

  fadeRaf = requestAnimationFrame(step);
}

function ensureMusicStart() {
  if (!musicEnabled || musicStarted) return;
  musicStarted = true;
  bgAudio.volume = 0;
  bgAudio.play().then(() => {
    fadeBackground(bgVolume, 1200);
  }).catch(() => {
    musicStarted = false;
    setStatus("Clique pour autoriser la musique.");
  });
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  toggleMusicBtn.textContent = musicEnabled ? "Musique: ON" : "Musique: OFF";
  toggleMusicBtn.classList.toggle("secondary", !musicEnabled);

  if (musicEnabled) {
    bgAudio.volume = bgVolume;
    bgAudio.play().catch(() => {
      setStatus("Clique pour autoriser la musique.");
    });
  } else {
    bgAudio.pause();
  }
}

function playActivationChime() {
  return new Promise((resolve) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      resolve();
      return;
    }
    try {
      if (!chimeCtx) chimeCtx = new AudioCtx();
      const now = chimeCtx.currentTime;
      const osc = chimeCtx.createOscillator();
      const gain = chimeCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(chimeCtx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
      osc.onended = () => resolve();
    } catch (error) {
      resolve();
    }
  });
}

toggleAudioBtn.addEventListener("click", toggleAudio);
toggleMusicBtn.addEventListener("click", toggleMusic);
toggleMusicBtn.classList.toggle("secondary", !musicEnabled);
if (finishOverlay) {
  finishOverlay.classList.add("hidden");
  finishOverlay.style.display = "none";
}
toggleFogBtn.addEventListener("click", () => {
  fogEnabled = !fogEnabled;
  toggleFogBtn.textContent = fogEnabled ? "Brouillard: ON" : "Brouillard: OFF";
  toggleFogBtn.classList.toggle("secondary", !fogEnabled);
});
startGameBtn.addEventListener("click", () => {
  gameStarted = true;
  startOverlay.style.display = "none";
  setStatus("Traverse la Manche et trouve des mots.");
  showFloatingHint("Va d'abord à Paris.");
  ensureMusicStart();
});
finishRestartBtn.addEventListener("click", () => {
  window.location.reload();
});
resetBtn.addEventListener("click", () => {
  collected.clear();
  player.x = 650;
  player.y = 250;
  initFog();
  updateScore();
  finishShown = false;
  if (finishTimer) {
    window.clearTimeout(finishTimer);
    finishTimer = null;
  }
  finishOverlay.classList.add("hidden");
  finishOverlay.style.display = "none";
  setStatus("Recommencé. Attrape un mot !");
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  ensureMusicStart();
});

window.addEventListener("pointerdown", () => {
  ensureMusicStart();
}, { once: true });

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function playAudio(src) {
  if (!audioEnabled) return;
  if (musicEnabled && !bgAudio.paused) {
    fadeBackground(0.08, 200);
  }
  playActivationChime().then(() => {
    const audio = new Audio(src);
    audio.volume = 1.0;
    activeMotAudio += 1;
    audio.addEventListener("ended", () => {
      activeMotAudio = Math.max(0, activeMotAudio - 1);
      if (activeMotAudio === 0 && musicEnabled && !bgAudio.paused) {
        fadeBackground(bgVolume, 500);
      }
      scheduleFinishOverlay();
    });
    audio.play().catch(() => {
      setStatus("Clique sur le bouton audio pour autoriser la lecture.");
    });
  });
}

function initFog() {
  fogCanvas.width = WORLD.width;
  fogCanvas.height = WORLD.height;
  fogCtx = fogCanvas.getContext("2d");
  fogCtx.fillStyle = "rgba(20, 18, 14, 0.92)";
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
}

function revealFog() {
  if (!fogEnabled) return;
  fogCtx.save();
  fogCtx.globalCompositeOperation = "destination-out";
  fogCtx.beginPath();
  fogCtx.arc(player.x, player.y, fogRadius, 0, Math.PI * 2);
  fogCtx.fill();
  fogCtx.restore();
}

function motPosition(mot) {
  return {
    x: mot.xPct * WORLD.width,
    y: mot.yPct * WORLD.height,
  };
}

function intersects(playerPos, motPos) {
  const dx = playerPos.x - motPos.x;
  const dy = playerPos.y - motPos.y;
  return Math.hypot(dx, dy) < player.radius + 26;
}

function update(delta) {
  if (!gameStarted) return;
  const speed = player.speed * delta;
  let dx = 0;
  let dy = 0;

  if (keys.has("arrowup") || keys.has("z") || keys.has("w")) dy -= speed;
  if (keys.has("arrowdown") || keys.has("s")) dy += speed;
  if (keys.has("arrowleft") || keys.has("q") || keys.has("a")) dx -= speed;
  if (keys.has("arrowright") || keys.has("d")) dx += speed;

  player.x = Math.max(player.radius, Math.min(WORLD.width - player.radius, player.x + dx));
  player.y = Math.max(player.radius, Math.min(WORLD.height - player.radius, player.y + dy));

  revealFog();

  for (const mot of mots) {
    const pos = motPosition(mot);
    if (!collected.has(mot.id) && intersects(player, pos)) {
      collected.add(mot.id);
      updateScore();
      playAudio(mot.audio);
      setStatus(mot.text);
      scheduleFinishOverlay();
    }
  }
}

function drawBackground(camera) {
  if (mapLoaded) {
    ctx.drawImage(mapImage, -camera.x, -camera.y, WORLD.width, WORLD.height);
  } else {
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "#11204a");
    grd.addColorStop(1, "#0b1020");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1d2a52";
    ctx.lineWidth = 2;
    for (let x = 0; x < WORLD.width; x += 200) {
      ctx.beginPath();
      ctx.moveTo(x - camera.x, -camera.y);
      ctx.lineTo(x - camera.x, WORLD.height - camera.y);
      ctx.stroke();
    }
    for (let y = 0; y < WORLD.height; y += 200) {
      ctx.beginPath();
      ctx.moveTo(-camera.x, y - camera.y);
      ctx.lineTo(WORLD.width - camera.x, y - camera.y);
      ctx.stroke();
    }
  }
}

function drawPlayer(camera) {
  const x = player.x - camera.x;
  const y = player.y - camera.y;

  if (playerLoaded) {
    ctx.drawImage(playerImage, x - 24, y - 24, 48, 48);
  } else {
    // ctx.fillStyle = "rgba(246, 236, 214, 0.95)";
    ctx.fillStyle = "#ffcc4d";
    ctx.beginPath();
    ctx.arc(x, y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#2b2418";
  ctx.font = "16px 'Georgia', 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Toi", x, y - 0);

  if (hintMessage && performance.now() < hintUntil) {
    ctx.font = "14px 'Georgia', 'Times New Roman', serif";
    const paddingX = 10;
    const paddingY = 6;
    const textWidth = ctx.measureText(hintMessage).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 22 + paddingY;
    const boxX = x - boxWidth / 2;
    const boxY = y - 62;
    ctx.fillStyle = "rgba(246, 236, 214, 0.95)";
    ctx.strokeStyle = "#c9b89a";
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.fillStyle = "#2b2418";
    ctx.textBaseline = "middle";
    ctx.fillText(hintMessage, x, boxY + boxHeight / 2);
  }
}

function drawMot(mot, camera) {
  const pos = motPosition(mot);
  const x = pos.x - camera.x;
  const y = pos.y - camera.y;
  if (x < -100 || y < -100 || x > canvas.width + 100 || y > canvas.height + 100) return;

  ctx.fillStyle = collected.has(mot.id)
    ? "rgba(218, 206, 182, 0.95)"
    : "rgba(246, 236, 214, 0.95)";
  ctx.beginPath();
  ctx.ellipse(x, y, 70, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#b89f7c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#2b2418";
  ctx.font = "16px 'Georgia', 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mot.text, x, y);

  if (collected.has(mot.id)) {
    ctx.strokeStyle = "#2f8a3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 46, y - 6);
    ctx.lineTo(x + 54, y + 4);
    ctx.lineTo(x + 70, y - 12);
    ctx.stroke();
  }
}

function draw(camera) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(camera);

  for (const mot of mots) {
    drawMot(mot, camera);
  }

  drawPlayer(camera);

  if (fogEnabled) {
    ctx.drawImage(
      fogCanvas,
      camera.x,
      camera.y,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }
}

function loop(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(delta);

  const camera = {
    x: Math.max(0, Math.min(WORLD.width - canvas.width, player.x - canvas.width / 2)),
    y: Math.max(0, Math.min(WORLD.height - canvas.height, player.y - canvas.height / 2)),
  };

  draw(camera);
  requestAnimationFrame(loop);
}

updateScore();
setStatus("Clique sur Commencer.");
initFog();
requestAnimationFrame(loop);
