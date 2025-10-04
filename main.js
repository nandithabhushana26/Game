import { WIDTH, HEIGHT } from "./constants.js";

(async function boot() {
  try {
    const res = await fetch("config/difficulty.json");
    if (!res.ok) throw new Error("Failed to load difficulty.json: " + res.status);
    const cfg = await res.json();

    const { Game } = await import("./Game.js");

    const canvas = document.getElementById("game");
    if (!canvas) throw new Error("No #game canvas found in index.html");

    // lock to native pixels; prevents CSS rescale blur/bleed
    canvas.width  = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.width  = WIDTH + "px";
    canvas.style.height = HEIGHT + "px";

    const game = new Game(canvas, cfg);
    window.game = game;
  } catch (err) {
    console.error("Boot error:", err);
    alert("Failed to start game — check console.");
  }
})();
