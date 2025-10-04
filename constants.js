// constants.js
/**
 * Game-wide constants and helpers.
 * Exports a mutable LEVELS so the external config loader can replace it at runtime (G3).
 */

/** Canvas dimensions */
export const WIDTH = 900;
export const HEIGHT = 540;
export const TILE = 30;

/** Default game timing/goal (fallback if config missing) is now per-level inside LEVELS. */

/**
 * Game states enum
 * @readonly
 * @enum {string}
 */
export const State = Object.freeze({
  MENU: "MENU",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
  WIN: "WIN"
});

/**
 * Clamp value between lo..hi
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Axis-aligned bounding box collision test
 * @param {{x:number,y:number,w:number,h:number}} a
 * @param {{x:number,y:number,w:number,h:number}} b
 * @returns {boolean}
 */
export const aabb = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

/**
 * Default level table (used if external config is missing).
 * Each level: { goal, time, cropSpawnRate, crowEvery, farmerSpeedMultiplier }
 *
 * NOTE: exported as `let` so loadConfig() can replace it (live-binding).
 */
export let LEVELS = [
  // Level 1 - easy
  { goal: 30, time: 60, cropSpawnRate: 1.0, crowEvery: 8, farmerSpeedMultiplier: 1.0 },
  // Level 2 - medium
  { goal: 50, time: 50, cropSpawnRate: 0.8, crowEvery: 6, farmerSpeedMultiplier: 1.05 },
  // Level 3 - hard
  { goal: 75, time: 40, cropSpawnRate: 0.6, crowEvery: 4, farmerSpeedMultiplier: 1.12 }
];

/**
 * Load difficulty config (G3).
 * Tries to fetch JSON at the given url and validate structure. If valid, replaces exported LEVELS.
 * JSON expected: an array of level objects with keys: goal, time, cropSpawnRate, crowEvery (optional farmerSpeedMultiplier)
 *
 * Example file `config/difficulty.json`:
 * [
 *   {"goal":20,"time":50,"cropSpawnRate":1.2,"crowEvery":9},
 *   {"goal":40,"time":45,"cropSpawnRate":1.0,"crowEvery":7},
 *   {"goal":60,"time":35,"cropSpawnRate":0.7,"crowEvery":5}
 * ]
 *
 * @param {string} url - relative path to JSON file (default "config/difficulty.json")
 * @returns {Promise<array>} resolved LEVELS (either loaded or default)
 */
export async function loadConfig(url = "config/difficulty.json") {
  try {
    const res = await fetch(url, {cache: "no-store"});
    if (!res.ok) {
      console.warn(`constants.loadConfig: could not fetch ${url} — using defaults`);
      return LEVELS;
    }
    const parsed = await res.json();
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("constants.loadConfig: config not an array or empty — using defaults");
      return LEVELS;
    }
    // Basic validation for each level
    const valid = parsed.every(l =>
      l && typeof l.goal === "number" && typeof l.time === "number" && typeof l.cropSpawnRate === "number"
    );
    if (!valid) {
      console.warn("constants.loadConfig: config has invalid entries — using defaults");
      return LEVELS;
    }
    // replace exported LEVELS (live binding) so consumers see new values
    LEVELS = parsed.map(l => ({
      goal: Number(l.goal),
      time: Number(l.time),
      cropSpawnRate: Number(l.cropSpawnRate),
      crowEvery: Number(l.crowEvery ?? 8),
      farmerSpeedMultiplier: Number(l.farmerSpeedMultiplier ?? 1.0)
    }));
    console.info("constants.loadConfig: loaded LEVELS from", url, LEVELS);
    return LEVELS;
  } catch (err) {
    console.warn("constants.loadConfig: error fetching/parsing config:", err, " — using defaults");
    return LEVELS;
  }
}
