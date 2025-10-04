// Entity.js

/**
 * Base class for all game objects (player, crops, obstacles).
 */
export class Entity {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - width
     * @param {number} h - height
     */
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.dead = false; // marked for removal when true
    }
  
    /**
     * Update game logic for this entity.
     * Default = no-op, subclasses override.
     * @param {number} dt - delta time (seconds)
     * @param {object} [game] - optional reference to game
     */
    update(dt, game) {}
  
    /**
     * Draw entity on canvas.
     * Default = no-op, subclasses override.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {}
  }
  