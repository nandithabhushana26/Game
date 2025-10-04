// Farmer.js — 4x4 sprite: rows = [down, right, left, up], cols = 4
import { Entity } from "./Entity.js";

const SPRITE_ROWS = 4;
const SPRITE_COLS = 4;

export class Farmer extends Entity {
  constructor(x, y) {
    super(x, y, 50, 50);
    this.speed = 260;
    this.baseSpeed = this.speed;
    this.vx = 0; this.vy = 0;

    this.sprite = new Image();
    this.sprite.src = "sprites/Farmer.png";
    this.spriteLoaded = false;
    this.frameW = 32; this.frameH = 32;
    this.sprite.addEventListener("load", () => {
      this.frameW = Math.floor(this.sprite.naturalWidth  / SPRITE_COLS);
      this.frameH = Math.floor(this.sprite.naturalHeight / SPRITE_ROWS);
      this.spriteLoaded = true;
    });

    // 0=down,1=right,2=left,3=up
    this.dirRow = 0;
    this.frame = 0;
    this.animTimer = 0;
  }

  handleInput(input) {
    const L = input.keys.has("ArrowLeft")  || input.keys.has("a");
    const R = input.keys.has("ArrowRight") || input.keys.has("d");
    const U = input.keys.has("ArrowUp")    || input.keys.has("w");
    const D = input.keys.has("ArrowDown")  || input.keys.has("s");

    const hx = (R ? 1 : 0) - (L ? 1 : 0);
    const hy = (D ? 1 : 0) - (U ? 1 : 0);

    if (hx !== 0 && hy !== 0) {
      const inv = 1 / Math.sqrt(2);
      this.vx = hx * this.speed * inv;
      this.vy = hy * this.speed * inv;
    } else {
      this.vx = hx * this.speed;
      this.vy = hy * this.speed;
    }

    if (Math.abs(this.vx) >= Math.abs(this.vy) && this.vx !== 0) {
      this.dirRow = this.vx > 0 ? 1 : 2;
    } else if (this.vy !== 0) {
      this.dirRow = this.vy < 0 ? 3 : 0;
    }
  }

  update(dt, game) {
    const ox = this.x, oy = this.y;

    this.x = Math.max(0, Math.min(game.canvas.width  - this.w, this.x + this.vx * dt));
    this.y = Math.max(0, Math.min(game.canvas.height - this.h, this.y + this.vy * dt));

    if (game.obstacles.some(o => game.aabb(this, o))) {
      this.x = ox; this.y = oy;
    }

    if (this.vx !== 0 || this.vy !== 0) {
      this.animTimer += dt;
      if (this.animTimer > 0.12) {
        this.frame = (this.frame + 1) % SPRITE_COLS;
        this.animTimer = 0;
      }
    } else {
      this.frame = 0;
      this.animTimer = 0;
    }
  }

  draw(ctx) {
    const dx = Math.round(this.x);
    const dy = Math.round(this.y);

    if (!this.spriteLoaded) {
      ctx.fillStyle = "#7a5230";
      ctx.fillRect(dx, dy, this.w, this.h);
      return;
    }

    const sx = this.frame * this.frameW;
    const sy = this.dirRow * this.frameH;

    ctx.drawImage(this.sprite, sx, sy, this.frameW, this.frameH, dx, dy, this.w, this.h);
  }
}
