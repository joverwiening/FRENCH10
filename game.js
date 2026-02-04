const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const toggleAudioBtn = document.getElementById("toggle-audio");
const toggleFogBtn = document.getElementById("toggle-fog");
const resetBtn = document.getElementById("reset");
const startOverlay = document.getElementById("start-overlay");
const startGameBtn = document.getElementById("start-game");

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
    audio: "assets/audio/je-mappelle.mp3",
  },
  {
    id: "locranon",
    text: "Locranon",
    xPct: 150 / 1555,
    yPct: 743 / 2200,
    audio: "assets/audio/je-viens.mp3",
  },
  {
    id: "dominique",
    text: "dominique",
    xPct: 1300 / 1555,
    yPct: 689 / 2200,
    audio: "assets/audio/jaime-musique.mp3",
  },
  {
    id: "gif",
    text: "gif",
    xPct: 840 / 1555,
    yPct: 732 / 2200,
    audio: "assets/audio/jaime-sport.mp3",
  },
  {
    id: "belcaire",
    text: "belcaire",
    xPct: 768 / 1555,
    yPct: 1691 / 2200,
    audio: "assets/audio/jaime-sport.mp3",
  },
  {
    id: "laroche",
    text: "laroche",
    xPct: 406 / 1555,
    yPct: 1056 / 2200,
    audio: "assets/audio/jaime-sport.mp3",
  },
  {
    id: "schweinebucht",
    text: "schweinebucht",
    xPct: 1294 / 1555,
    yPct: 1636 / 2200,
    audio: "assets/audio/jaime-sport.mp3",
  },
  {
    id: "stmalo",
    text: "J'aime le sport.",
    xPct: 400 / 1555,
    yPct: 686 / 2200,
    audio: "assets/audio/jaime-sport.mp3",
  },
];

const collected = new Set();

let audioEnabled = false;
let fogEnabled = true;
let lastTime = 0;
let gameStarted = false;

let fogCanvas = document.createElement("canvas");
let fogCtx = fogCanvas.getContext("2d");
const fogRadius = 140;

function setStatus(message) {
  statusEl.textContent = message;
}

function updateScore() {
  scoreEl.textContent = `Mots: ${collected.size}`;
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  toggleAudioBtn.textContent = audioEnabled ? "Audio activé" : "Activer l'audio";
  toggleAudioBtn.classList.toggle("secondary", !audioEnabled);
  setStatus(audioEnabled ? "Audio prêt." : "Audio coupé.");
}

toggleAudioBtn.addEventListener("click", toggleAudio);
toggleFogBtn.addEventListener("click", () => {
  fogEnabled = !fogEnabled;
  toggleFogBtn.textContent = fogEnabled ? "Brouillard: ON" : "Brouillard: OFF";
  toggleFogBtn.classList.toggle("secondary", !fogEnabled);
});
startGameBtn.addEventListener("click", () => {
  gameStarted = true;
  startOverlay.style.display = "none";
  setStatus("Traverse la Manche et trouve des mots.");
});
resetBtn.addEventListener("click", () => {
  collected.clear();
  player.x = 400;
  player.y = 400;
  initFog();
  updateScore();
  setStatus("Recommencé. Attrape un mot !");
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function playAudio(src) {
  if (!audioEnabled) return;
  const audio = new Audio(src);
  audio.volume = 0.9;
  audio.play().catch(() => {
    setStatus("Clique sur le bouton audio pour autoriser la lecture.");
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
    ctx.fillStyle = "#ffcc4d";
    ctx.beginPath();
    ctx.arc(x, y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMot(mot, camera) {
  const pos = motPosition(mot);
  const x = pos.x - camera.x;
  const y = pos.y - camera.y;
  if (x < -100 || y < -100 || x > canvas.width + 100 || y > canvas.height + 100) return;

  ctx.fillStyle = collected.has(mot.id)
    ? "rgba(246, 236, 214, 0.95)"
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
