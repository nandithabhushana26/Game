// Game.js — 3 rounds, AI can win a round, reset goes to round 1
import { Farmer } from "./Farmer.js";
import { AIFarmer } from "./AIFarmer.js";
import { Crop } from "./Crop.js";
import { Scarecrow, Crow } from "./Obstacle.js";
import { SpeedBoost } from "./Powerup.js";
import { Input } from "./Input.js";
import {
  WIDTH, HEIGHT, TILE, State, clamp, aabb,
  LEVELS as DEFAULT_LEVELS
} from "./constants.js";

export class Game {
  constructor(canvas, config = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.aabb = aabb;

    // Levels (3 rounds)
    this.levels = (config && config.levels) ? config.levels : (DEFAULT_LEVELS || [
      { goal: 25, time: 45, cropSpawnRate: 0.9, crowEvery: 8, farmerSpeedMultiplier: 1.00 },
      { goal: 45, time: 40, cropSpawnRate: 0.8, crowEvery: 7, farmerSpeedMultiplier: 1.05 },
      { goal: 60, time: 35, cropSpawnRate: 0.7, crowEvery: 6, farmerSpeedMultiplier: 1.10 }
    ]);

    this.cropsConfig = (config && config.crops) ? config.crops : [
      { name: "corn",       color: "#ffd95b", points: 2, emoji: "🌽" },
      { name: "strawberry", color: "#e63946", points: 4, emoji: "🍓" },
      { name: "blueberry",  color: "#4361ee", points: 6, emoji: "🫐" }
    ];

    // Series (3 rounds = 3 levels)
    this.maxRounds = 3;
    this.round = 1;            // 1..3
    this.level = 0;            // index = round-1
    this.youWins = 0;
    this.aiWins = 0;

    // Runtime state
    this.state = State.MENU;
    this.player = null;
    this.ai = null;
    this.crops = [];
    this.obstacles = [];
    this.crows = [];
    this.powerUps = [];
    this.score = 0;      // player
    this.aiScore = 0;    // AI
    this.timeLeft = this.levels[0].time;
    this.spawnEvery = this.levels[0].cropSpawnRate;
    this._accum = 0;
    this._crowTimer = 0;
    this._powerUpTimer = 0;
    this.speedBoostActive = false;
    this.speedBoostTimeLeft = 0;
    this.lastTime = 0;

    // Input
    this.input = new Input(this);

    // UI refs
    const g = id => document.getElementById(id);
    this.ui = {
      score: g("score"),
      time: g("time"),
      goal: g("goal"),
      level: g("level"),
      aiScore: g("ai-score"),
      status: g("status"),
      start: g("btnStart"),
      reset: g("btnReset"),
      timeBar: g("timeBar"),
      overlay: g("overlay"),
      overlayContent: g("overlayContent"),
      boost: g("boost"),
      timeSec: g("timeSec")
    };

    // RAF loop
    this.tick = (ts) => {
      const dt = Math.min((ts - this.lastTime) / 1000, 0.033);
      this.lastTime = ts;
      this.update(dt);
      this.render();
      requestAnimationFrame(this.tick);
    };

    if (this.ui.start) this.ui.start.addEventListener("click", () => this.start());
    if (this.ui.reset) this.ui.reset.addEventListener("click", () => this.fullReset());

    this.fullReset(); // boot to round 1, menu
  }

  // ---------- Series control ----------
  fullReset() {
    // Back to round 1 / level 1
    this.round = 1;
    this.level = 0;
    this.youWins = 0;
    this.aiWins = 0;
    this.hardResetForLevel();
    this.state = State.MENU;
    if (this.ui.overlay) {
      this.ui.overlay.classList.remove("hidden");
      this.ui.overlayContent.className = "overlay-card";
      this.ui.overlayContent.textContent = `Level ${this.round} · Press Start`;
    }
    this.syncUI();
  }

  hardResetForLevel() {
    // Create actors
    this.player = new Farmer(WIDTH/2 - 17, HEIGHT - 80);
    this.player.baseSpeed = this.player.speed;
    this.player.speed = this.player.baseSpeed * (this.levels[this.level].farmerSpeedMultiplier || 1.0);

    // AI starts upper-left area
    this.ai = new AIFarmer(TILE * 3, HEIGHT - 160);

    // Clear world
    this.crops.length = 0;
    this.crows.length = 0;
    this.powerUps.length = 0;
    this.obstacles = [];
    const obsCount = 3 + this.level * 2;
    for (let i = 0; i < obsCount; i++) {
      const ox = Math.floor(Math.random() * ((WIDTH - 2*TILE) / TILE)) * TILE + TILE;
      const oy = Math.floor(Math.random() * ((HEIGHT - 2*TILE) / TILE)) * TILE + TILE;
      this.obstacles.push(new Scarecrow(ox, oy));
    }

    // Round stats
    this.score = 0;
    this.aiScore = 0;
    this.timeLeft = this.levels[this.level].time;
    this.spawnEvery = this.levels[this.level].cropSpawnRate;
    this._accum = 0;
    this._crowTimer = 0;
    this._powerUpTimer = 0;
    this.speedBoostActive = false;
    this.speedBoostTimeLeft = 0;
    this.lastTime = performance.now();

    this.syncUI();
  }

  start() {
    if ([State.MENU, State.GAME_OVER, State.WIN].includes(this.state)) {
      // start (or continue to next round already prepared)
      this.state = State.PLAYING;
      if (this.ui.overlay) this.ui.overlay.classList.add("hidden");
      if (this.ui.status) this.ui.status.textContent = "Playing…";
      requestAnimationFrame(this.tick);
    } else if (this.state === State.PAUSED) {
      this.state = State.PLAYING;
      if (this.ui.status) this.ui.status.textContent = "Playing…";
    }
  }

  // Called when a round ends (winner: 'you' | 'ai' | 'time')
  endRound(winner, reason = "") {
    if (this.state !== State.PLAYING) return;
    // Assign winner if time-based
    if (winner === "time") {
      if (this.score >= this.levels[this.level].goal && this.aiScore < this.levels[this.level].goal) {
        winner = "you";
      } else if (this.aiScore >= this.levels[this.level].goal && this.score < this.levels[this.level].goal) {
        winner = "ai";
      } else if (this.score !== this.aiScore) {
        winner = (this.score > this.aiScore) ? "you" : "ai";
      } else {
        // tie → give to player (friendlier)
        winner = "you";
      }
    }

    if (winner === "you") this.youWins++;
    if (winner === "ai") this.aiWins++;

    // Prepare message
    const msg =
      winner === "you" ? "🎉 You reached the target!"
      : winner === "ai" ? "🤖 AI reached the target!"
      : "⏰ Time up!";

    // Show overlay
    this.state = State.PAUSED;
    if (this.ui.overlay) this.ui.overlay.classList.remove("hidden");
    if (this.ui.overlayContent) {
      this.ui.overlayContent.className = "overlay-card " + (winner === "you" ? "win" : "lose");
      this.ui.overlayContent.textContent = `${msg}   (Round ${this.round} of ${this.maxRounds})`;
    }

    // Next step after a short pause
    setTimeout(() => {
      if (this.round >= this.maxRounds) {
        // Final outcome
        this.state = State.WIN;
        if (this.ui.overlay) this.ui.overlay.classList.remove("hidden");
        if (this.ui.overlayContent) {
          let final =
            this.youWins > this.aiWins ? "🏆 You win the series!"
            : this.youWins < this.aiWins ? "🤖 AI wins the series!"
            : "🤝 Series tied (you win ties)!";
          this.ui.overlayContent.className = "overlay-card " + (this.youWins >= this.aiWins ? "win" : "lose");
          this.ui.overlayContent.textContent = `${final}   (You ${this.youWins}–${this.aiWins} AI)`;
        }
        return;
      }

      // Advance level/round, re-seed world, and stay paused until user hits Start
      this.round++;
      this.level = this.round - 1;
      this.hardResetForLevel();
      this.state = State.MENU;
      if (this.ui.overlay) this.ui.overlay.classList.remove("hidden");
      if (this.ui.overlayContent) {
        this.ui.overlayContent.className = "overlay-card";
        this.ui.overlayContent.textContent = `Level ${this.round} · Press Start`;
      }
      this.syncUI();
    }, 1200);
  }

  // ---------- UI ----------
  syncUI() {
    const L = this.levels[this.level];

    if (this.ui.score) this.ui.score.textContent = String(this.score);
    if (this.ui.aiScore) this.ui.aiScore.textContent = String(this.aiScore); // number only
    if (this.ui.time) this.ui.time.textContent = Math.max(0, Math.ceil(this.timeLeft));
    if (this.ui.timeSec) this.ui.timeSec.textContent = `${Math.max(0, Math.ceil(this.timeLeft))}s`;
    if (this.ui.goal) this.ui.goal.textContent = String(L.goal);
    if (this.ui.level) this.ui.level.textContent = String(this.level + 1);

    if (this.ui.boost) {
      if (this.speedBoostActive) {
        this.ui.boost.textContent = `⚡ ${Math.ceil(this.speedBoostTimeLeft)}s`;
        this.ui.boost.style.display = "inline";
      } else {
        this.ui.boost.style.display = "none";
      }
    }
  }

  // ---------- Spawns ----------
  spawnCrop() {
    const gx = Math.floor(Math.random() * ((WIDTH - 2*TILE) / TILE)) * TILE + TILE;
    const gy = Math.floor(Math.random() * ((HEIGHT - 2*TILE) / TILE)) * TILE + TILE;
    const cfg = this.cropsConfig[Math.floor(Math.random() * this.cropsConfig.length)];
    this.crops.push(new Crop(gx, gy, cfg));
  }

  spawnCrow() {
    const per = (this.levels[this.level] && this.levels[this.level].crowsPerSpawn) ? this.levels[this.level].crowsPerSpawn : 1;
    const topPad = TILE, bottomPad = TILE + 20;
    for (let i = 0; i < per; i++) {
      const y = topPad + Math.random() * (HEIGHT - topPad - bottomPad);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const offset = i * 24;
      const startX = dir === 1 ? -80 - offset : WIDTH + 80 + offset;
      const crow = new Crow(startX, y, dir);
      crow.w = crow.displayW || 56;
      crow.h = crow.displayH || 36;
      this.crows.push(crow);
    }
  }

  spawnSpeedBoost() {
    const gx = Math.floor(Math.random() * ((WIDTH - 2*TILE) / TILE)) * TILE + TILE;
    const gy = Math.floor(Math.random() * ((HEIGHT - 2*TILE) / TILE)) * TILE + TILE;
    this.powerUps.push(new SpeedBoost(gx, gy));
  }

  activateSpeedBoost(duration, multiplier) {
    this.speedBoostActive = true;
    this.speedBoostTimeLeft = duration;
    this.player.baseSpeed = this.player.baseSpeed || this.player.speed;
    this.player.speed = this.player.baseSpeed * multiplier;
  }

  // ---------- Update ----------
  update(dt) {
    if (this.state !== State.PLAYING) return;

    // countdown timer
    this.timeLeft = clamp(this.timeLeft - dt, 0, this.levels[this.level].time);
    if (this.ui.timeBar) {
      const L = this.levels[this.level];
      this.ui.timeBar.style.width = (this.timeLeft / L.time * 100) + "%";
    }
    if (this.timeLeft <= 0) {
      this.endRound("time", "timeout");
      return;
    }

    // speed boost timer
    if (this.speedBoostActive) {
      this.speedBoostTimeLeft -= dt;
      if (this.speedBoostTimeLeft <= 0) {
        this.speedBoostActive = false;
        this.player.speed = this.player.baseSpeed || 260;
      }
    }

    // actors
    this.player.handleInput(this.input);
    this.player.update(dt, this);
    this.ai.update(dt, this);

    // spawns: crops
    this._accum += dt;
    while (this._accum >= this.spawnEvery) {
      this._accum -= this.spawnEvery;
      this.spawnCrop();
    }

    // crows
    this._crowTimer += dt;
    if (this._crowTimer >= (this.levels[this.level].crowEvery || 8)) {
      this._crowTimer = 0;
      this.spawnCrow();
    }

    // powerups
    this._powerUpTimer += dt;
    if (this._powerUpTimer >= 15) {
      this._powerUpTimer = 0;
      this.spawnSpeedBoost();
    }

    // collisions: crops (player)
    for (const c of this.crops) {
      if (!c.dead && aabb(this.player, c)) {
        c.dead = true;
        this.score += c.points;
      }
    }
    // collisions: crops (AI)
    for (const c of this.crops) {
      if (!c.dead && aabb(this.ai, c)) {
        c.dead = true;
        this.aiScore += c.points;
      }
    }
    // remove collected crops
    this.crops = this.crops.filter(c => !c.dead);

    // Check immediate round end: first to reach goal wins
    const goal = this.levels[this.level].goal;
    if (this.score >= goal) {
      this.syncUI();
      this.endRound("you", "player-hit-goal");
      return;
    }
    if (this.aiScore >= goal) {
      this.syncUI();
      this.endRound("ai", "ai-hit-goal");
      return;
    }

    // powerups: player only
    for (const p of this.powerUps) {
      if (!p.dead && aabb(this.player, p)) {
        p.dead = true;
        this.activateSpeedBoost(p.duration, p.speedMultiplier);
      }
    }
    this.powerUps = this.powerUps.filter(p => !p.dead);

    // crows hit player (penalty)
    this.crows.forEach(c => c.update(dt, this));
    for (const c of this.crows) {
      if (!c.dead && aabb(this.player, c)) {
        c.dead = true;
        this.score = Math.max(0, this.score - 5);
        this.timeLeft = Math.max(0, this.timeLeft - 3);
        if (this.ui.status) this.ui.status.textContent = "Hit by Crow!";
      }
    }
    this.crows = this.crows.filter(c => !c.dead);

    // advance crop/powerup animations
    this.crops.forEach(c => c.update(dt, this));
    this.powerUps.forEach(p => p.update(dt, this));

    this.syncUI();
  }

  // ---------- Render ----------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // field
    ctx.fillStyle = "#d8f3dc";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#b7e4c7";
    ctx.lineWidth = 1;
    for (let y = TILE; y < HEIGHT; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
    for (let x = TILE; x < WIDTH; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }

    // draw order
    this.crops.forEach(c => c.draw(ctx));
    this.obstacles.forEach(o => o.draw(ctx));
    this.powerUps.forEach(p => p.draw(ctx));
    this.crows.forEach(c => c.draw(ctx));
    this.player.draw(ctx);
    this.ai.draw(ctx);

    ctx.fillStyle = "#0b3d2e";
    ctx.font = "14px system-ui, sans-serif";
    if (this.state === State.MENU)  ctx.fillText("Press Start to play", 20, 24);
    if (this.state === State.PAUSED) ctx.fillText("Paused", 20, 24);
  }

  dispose() {
    if (this.input && typeof this.input.dispose === "function") this.input.dispose();
  }
}
