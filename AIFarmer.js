// AIFarmer.js — A* pathfinding with obstacle CLEARANCE (no clipping / no jitter)
import { Farmer } from "./Farmer.js";
import { WIDTH, HEIGHT, TILE } from "./constants.js";

export class AIFarmer extends Farmer {
  constructor(x, y) {
    super(x, y);

    this.name = "AI";
    this.baseSpeed = (this.baseSpeed || this.speed) * 0.55; // tune difficulty
    this.speed = this.baseSpeed;

    // Grid dims
    this._gridW = Math.floor(WIDTH / TILE);
    this._gridH = Math.floor(HEIGHT / TILE);

    // Path state
    this._path = [];      // [{gx,gy}, ...]
    this._wp = 0;
    this._replanTimer = 0;
    this._replanPeriod = 0.45;
    this._target = null;

    // Small sprite-facing smoothing
    this._lastHDir = 1;
    this._faceCooldown = 0.12;
    this._faceTimer = 0;
    this._rowCooldown = 0.08;
    this._rowTimer = 0;

    // IMPORTANT: clearance around obstacles in tiles (prevents body from touching)
    // With a ~50px body and ~48px tiles, 1 tile of clearance is safe.
    this._clearanceTiles = 1;
  }

  // ---------- Helpers ----------
  _toGridFromCenter(px, py) {
    const cx = px + this.w / 2;
    const cy = py + this.h / 2;
    return {
      gx: Math.max(0, Math.min(this._gridW - 1, Math.floor(cx / TILE))),
      gy: Math.max(0, Math.min(this._gridH - 1, Math.floor(cy / TILE)))
    };
  }

  _toWorldFromCell(gx, gy) {
    const cx = gx * TILE + TILE / 2;
    const cy = gy * TILE + TILE / 2;
    return { x: cx - this.w / 2, y: cy - this.h / 2 };
  }

  _pickClosestCrop(game) {
    let best = null, bestD = Infinity;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    for (const c of game.crops) {
      if (c.dead || c.collected) continue;
      const dx = (c.x + c.w / 2) - cx;
      const dy = (c.y + c.h / 2) - cy;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  _buildBlockedGrid(game) {
    const blocked = Array.from({ length: this._gridH }, () =>
      new Array(this._gridW).fill(false)
    );

    // mark obstacle cells
    for (const o of game.obstacles) {
      const l = Math.max(0, Math.floor(o.x / TILE));
      const r = Math.min(this._gridW - 1, Math.floor((o.x + o.w - 1) / TILE));
      const t = Math.max(0, Math.floor(o.y / TILE));
      const b = Math.min(this._gridH - 1, Math.floor((o.y + o.h - 1) / TILE));
      for (let gy = t; gy <= b; gy++) {
        for (let gx = l; gx <= r; gx++) blocked[gy][gx] = true;
      }
    }

    // DILATE by clearance tiles to respect AI body size
    const c = this._clearanceTiles;
    if (c > 0) {
      const dilated = Array.from({ length: this._gridH }, () =>
        new Array(this._gridW).fill(false)
      );
      for (let gy = 0; gy < this._gridH; gy++) {
        for (let gx = 0; gx < this._gridW; gx++) {
          if (!blocked[gy][gx]) continue;
          for (let yy = gy - c; yy <= gy + c; yy++) {
            for (let xx = gx - c; xx <= gx + c; xx++) {
              if (xx >= 0 && xx < this._gridW && yy >= 0 && yy < this._gridH) {
                dilated[yy][xx] = true;
              }
            }
          }
        }
      }
      return dilated;
    }
    return blocked;
  }

  _nearestFree(blocked, cell) {
    // BFS rings up to a small radius to find nearest unblocked cell
    if (!blocked[cell.gy]?.[cell.gx]) return cell;
    const maxR = Math.max(this._gridW, this._gridH);
    for (let r = 1; r <= Math.min(6, maxR); r++) {
      for (let dy = -r; dy <= r; dy++) {
        const yy = cell.gy + dy;
        if (yy < 0 || yy >= this._gridH) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = cell.gx + dx;
          if (xx < 0 || xx >= this._gridW) continue;
          if (!blocked[yy][xx]) return { gx: xx, gy: yy };
        }
      }
    }
    // fallback: clamp inside grid
    return { gx: Math.min(Math.max(cell.gx, 0), this._gridW - 1),
             gy: Math.min(Math.max(cell.gy, 0), this._gridH - 1) };
  }

  _astar(blocked, start, goal) {
    const key = (gx, gy) => `${gx},${gy}`;
    const inFree = (gx, gy) => gx >= 0 && gx < this._gridW && gy >= 0 && gy < this._gridH && !blocked[gy][gx];

    const open = [];
    const came = new Map();
    const g = new Map();
    const f = new Map();
    const h = (gx, gy) => Math.abs(gx - goal.gx) + Math.abs(gy - goal.gy);

    const sKey = key(start.gx, start.gy);
    g.set(sKey, 0); f.set(sKey, h(start.gx, start.gy));
    open.push({ gx: start.gx, gy: start.gy, k: sKey, f: f.get(sKey) });

    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.gx === goal.gx && cur.gy === goal.gy) {
        const path = [];
        let ck = cur.k;
        while (ck !== sKey) {
          const [cx, cy] = ck.split(",").map(n => parseInt(n, 10));
          path.push({ gx: cx, gy: cy });
          ck = came.get(ck);
        }
        path.push({ gx: start.gx, gy: start.gy });
        path.reverse();
        return path;
      }

      const nbrs = [
        { gx: cur.gx + 1, gy: cur.gy },
        { gx: cur.gx - 1, gy: cur.gy },
        { gx: cur.gx,     gy: cur.gy + 1 },
        { gx: cur.gx,     gy: cur.gy - 1 }
      ];
      for (const n of nbrs) {
        if (!inFree(n.gx, n.gy)) continue;
        const nk = key(n.gx, n.gy);
        const tent = (g.get(cur.k) ?? Infinity) + 1;
        if (tent < (g.get(nk) ?? Infinity)) {
          came.set(nk, cur.k);
          g.set(nk, tent);
          f.set(nk, tent + h(n.gx, n.gy));
          if (!open.find(e => e.k === nk)) open.push({ gx: n.gx, gy: n.gy, k: nk, f: f.get(nk) });
        }
      }
    }
    return null;
  }

  _planPath(game) {
    this._target = this._pickClosestCrop(game);
    this._path = []; this._wp = 0;
    if (!this._target) return;

    const blocked = this._buildBlockedGrid(game);

    let start = this._toGridFromCenter(this.x, this.y);
    let goal  = this._toGridFromCenter(this._target.x, this._target.y);

    // Snap start/goal to nearest free cells (important with clearance)
    start = this._nearestFree(blocked, start);
    goal  = this._nearestFree(blocked, goal);

    const path = this._astar(blocked, start, goal);
    if (path && path.length) {
      this._path = path;
      this._wp = Math.min(1, this._path.length - 1);
    }
  }

  // ---------- Update ----------
  update(dt, game) {
    // periodic replanning
    this._replanTimer -= dt;
    if (this._replanTimer <= 0 || !this._target || !this._path.length || this._target.dead) {
      this._planPath(game);
      this._replanTimer = this._replanPeriod;
    }

    let vx = 0, vy = 0;
    if (this._path.length) {
      const cell = this._path[this._wp] || this._path[this._path.length - 1];
      const wp = this._toWorldFromCell(cell.gx, cell.gy);

      const dx = wp.x - this.x;
      const dy = wp.y - this.y;
      const ax = Math.abs(dx), ay = Math.abs(dy);

      const S = this.speed, maxStep = S * dt;
      if (ax >= ay) {
        const step = Math.sign(dx) * Math.min(ax, maxStep);
        vx = (dt > 0) ? step / dt : 0; vy = 0;
      } else {
        const step = Math.sign(dy) * Math.min(ay, maxStep);
        vy = (dt > 0) ? step / dt : 0; vx = 0;
      }

      if (ax < 1 && ay < 1 && this._wp < this._path.length - 1) this._wp++;
    }

    this.vx = vx; this.vy = vy;

    // sprite facing (4 rows: down=0, right=1, left=2, up=3)
    if (this._faceTimer > 0) this._faceTimer -= dt;
    if (this._rowTimer > 0)  this._rowTimer  -= dt;

    const absVX = Math.abs(this.vx), absVY = Math.abs(this.vy);
    if (absVX >= absVY && absVX > 0.5) {
      if (this.vx > 0 && this._lastHDir < 0 && this._faceTimer <= 0) {
        this._lastHDir = 1; this._faceTimer = this._faceCooldown;
      } else if (this.vx < 0 && this._lastHDir > 0 && this._faceTimer <= 0) {
        this._lastHDir = -1; this._faceTimer = this._faceCooldown;
      }
      const want = (this._lastHDir > 0) ? 1 : 2;
      if (this._rowTimer <= 0 && this.dirRow !== want) { this.dirRow = want; this._rowTimer = this._rowCooldown; }
    } else if (absVY > 0.5) {
      const want = (this.vy < 0) ? 3 : 0;
      if (this._rowTimer <= 0 && this.dirRow !== want) { this.dirRow = want; this._rowTimer = this._rowCooldown; }
    }

    // Farmer handles bounds + animation (no obstacle revert now — path avoids them)
    super.update(dt, game);
  }

  draw(ctx) {
    ctx.save();
    ctx.filter = "hue-rotate(140deg) saturate(1.2)";
    super.draw(ctx);
    ctx.filter = "none";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,.75)";
    ctx.fillText("AI", Math.round(this.x + this.w / 2), Math.round(this.y) - 6);
    ctx.restore();
  }
}
