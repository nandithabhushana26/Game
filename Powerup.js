// PowerUp.js
import { Entity } from "./Entity.js";

/**
 * Speed Booster power-up collectible.
 * When collected, temporarily increases farmer's speed.
 */
export class SpeedBoost extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y, 26, 26);
    this.duration = 5; // seconds of speed boost
    this.speedMultiplier = 1.8; // 80% speed increase
    this.dead = false;
    this.pulse = 0; // animation timer
  }

  /**
   * Update animation state.
   * @param {number} dt seconds
   */
  update(dt) {
    this.pulse += dt * 4; // animate pulsing effect
  }

  /**
   * Draw the speed boost power-up (lightning bolt icon).
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { x, y, w, h } = this;
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    
    // Pulsing glow effect
    const glowSize = 4 + Math.sin(this.pulse) * 2;
    ctx.shadowBlur = glowSize;
    ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
    
    // Yellow circle background
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(centerX, centerY, w / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Lightning bolt shape
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(centerX + 2, centerY - 10);
    ctx.lineTo(centerX - 2, centerY - 2);
    ctx.lineTo(centerX + 4, centerY - 2);
    ctx.lineTo(centerX - 2, centerY + 10);
    ctx.lineTo(centerX + 2, centerY + 2);
    ctx.lineTo(centerX - 4, centerY + 2);
    ctx.closePath();
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Label
    ctx.fillStyle = "#0b3d2e";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("⚡", centerX - 6, y + h + 16);
  }
}