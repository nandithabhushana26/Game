// Obstacle.js
import { Entity } from "./Entity.js";
import { WIDTH } from "./constants.js";

const DEBUG = false; // set true to draw red debug boxes around crows

/**
 * Static scarecrow obstacle.
 */
export class Scarecrow extends Entity {
  constructor(x, y) {
    super(x, y, 18, 32);
  }

  draw(ctx) {
    // simple wooden post + hat (cartoony)
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(this.x + 6, this.y + 10, 6, 20); // post
    // head
    ctx.fillStyle = "#d9885a";
    ctx.beginPath();
    ctx.ellipse(this.x + 9, this.y + 6, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // hat
    ctx.fillStyle = "#c1703a";
    ctx.fillRect(this.x + 1, this.y - 2, 16, 4);
    ctx.fillRect(this.x + 3, this.y - 8, 10, 6);
  }
}

/**
 * Crow - sprite-based animated crow.
 * Handles arbitrary source sprite sizes by scaling frames to a target display size.
 */
export class Crow extends Entity {
  /**
   * @param {number} x starting x (offscreen left or right)
   * @param {number} y vertical position
   * @param {number} dir direction: 1 -> left-to-right, -1 -> right-to-left
   */
  constructor(x, y, dir = 1) {
    // set temporary width/height; final displayed width/height is displayW/displayH
    super(x, y, 40, 24);

    this.dir = dir;
    this.speed = 120 + Math.random() * 80;
    this.dead = false;

    // desired display size on canvas (keeps crows a consistent, visible size)
    this.displayW = 56; // pixels on canvas
    this.displayH = 36;

    // sprite config (frames horizontally)
    this.frames = 4;
    this.frameIndex = 0;
    this.animTimer = 0;

    // source frame sizes (filled on load)
    this.frameW = 0;
    this.frameH = 0;

    // sprite image
    this.sprite = new Image();
    // IMPORTANT: file must be reachable at this path (case-sensitive)
    this.sprite.src = "sprites/Crow.png";

    this.spriteLoaded = false;
    this.sprite.addEventListener("load", () => {
      // compute frame size from natural image
      // if the sprite image is tall (one row) or contains margins, we still compute per-frame width.
      this.frameW = Math.floor(this.sprite.naturalWidth / this.frames);
      this.frameH = Math.floor(this.sprite.naturalHeight);
      // set collision box to the display size so aabb works predictably
      this.w = this.displayW;
      this.h = this.displayH;
      this.spriteLoaded = true;
    });

    this.sprite.addEventListener("error", () => {
      // if sprite fails to load, we'll still draw fallback shape
      this.spriteLoaded = false;
      // keep display sizes as set above
      this.w = this.displayW;
      this.h = this.displayH;
    });
  }

  update(dt) {
    // move horizontally according to dir
    this.x += this.speed * this.dir * dt;

    // animate frames
    this.animTimer += dt;
    if (this.animTimer > 0.12) {
      this.frameIndex = (this.frameIndex + 1) % this.frames;
      this.animTimer = 0;
    }

    // if crow fully offscreen, mark dead
    if (this.dir === 1 && this.x > WIDTH + 80) this.dead = true;
    if (this.dir === -1 && this.x + this.w < -80) this.dead = true;
  }

  draw(ctx) {
    // debug box (useful to see crow hitboxes)
    if (DEBUG) {
      ctx.save();
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 1, this.y - 1, this.w + 2, this.h + 2);
      ctx.restore();
    }

    if (this.spriteLoaded && this.frameW > 0 && this.frameH > 0) {
      const sx = this.frameIndex * this.frameW;
      const sy = 0;
      // scale the source frame to the display width/height
      if (this.dir === -1) {
        // flip for left-facing
        ctx.save();
        ctx.translate(this.x + this.displayW, this.y);
        ctx.scale(-1, 1);
        ctx.drawImage(this.sprite, sx, sy, this.frameW, this.frameH, 0, 0, this.displayW, this.displayH);
        ctx.restore();
      } else {
        ctx.drawImage(this.sprite, sx, sy, this.frameW, this.frameH, this.x, this.y, this.displayW, this.displayH);
      }
    } else {
      // fallback visible shape so user always sees the crow
      ctx.save();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2, Math.max(6, this.w * 0.4), Math.max(4, this.h * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
      // small beak/wing marker
      ctx.fillStyle = "#efb94d";
      if (this.dir === 1) {
        ctx.fillRect(this.x + this.w - 6, this.y + (this.h / 2) - 3, 8, 4);
      } else {
        ctx.fillRect(this.x - 2, this.y + (this.h / 2) - 3, 8, 4);
      }
      ctx.restore();
    }
  }
}
