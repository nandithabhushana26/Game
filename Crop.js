// Crop.js
import { Entity } from "./Entity.js";

/**
 * Collectible crop with configurable type and point value.
 * constructor(x, y, cfg) where cfg is a crop config object (name, color, points, emoji)
 */
export class Crop extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {Object} [cfg] optional crop configuration
   */
  constructor(x, y, cfg = null) {
    super(x, y, 22, 28);

    // default types if cfg is not provided
    const defaults = [
      { name: "corn", color: "#ffd95b", points: 2, emoji: "🌽" },
      { name: "strawberry", color: "#e63946", points: 4, emoji: "🍓" },
      { name: "blueberry", color: "#4361ee", points: 6, emoji: "🫐" }
    ];

    if (cfg) {
      // if cfg is an array, pick random; if single object, use directly
      if (Array.isArray(cfg)) {
        const chosen = cfg[Math.floor(Math.random() * cfg.length)];
        this.type = chosen.name; this.color = chosen.color; this.points = chosen.points; this.emoji = chosen.emoji || "";
      } else {
        this.type = cfg.name; this.color = cfg.color; this.points = cfg.points; this.emoji = cfg.emoji || "";
      }
    } else {
      const t = defaults[Math.floor(Math.random() * defaults.length)];
      this.type = t.name; this.color = t.color; this.points = t.points; this.emoji = t.emoji;
    }

    this.sway = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  /**
   * Update animation state.
   * @param {number} dt seconds
   */
  update(dt) {
    this.sway += dt * 2;
  }

  /**
   * Draw the crop and a small points hint under it.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { x, y, w, h } = this;
    // stem
    ctx.strokeStyle = "#2f7d32"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h);
    ctx.quadraticCurveTo(x + w / 2 + Math.sin(this.sway) * 3, y + h / 2, x + w / 2, y);
    ctx.stroke();

    // shape by type
    if (this.type === "corn") {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === "strawberry") {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a9d8f";
      ctx.beginPath(); ctx.moveTo(x + w / 2, y - 10);
      ctx.lineTo(x + w / 2 - 6, y - 4); ctx.lineTo(x + w / 2 + 6, y - 4); ctx.closePath(); ctx.fill();
    } else {
      // blueberry cluster
      ctx.fillStyle = this.color;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 6 + i * 5, y, 5, 0, Math.PI * 2); ctx.fill(); }
    }

    // points label below
    ctx.fillStyle = "#0b3d2e";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("+" + this.points, x + w / 2 - 8, y + h + 14);
  }
}
