// Input.js
export class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();

    const blockKeys = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "]);

    this._onDown = (e) => {
      const k = e.key;
      if (blockKeys.has(k)) e.preventDefault();      // stop page scrolling
      if (k === "p" || k === "P") {                  // pause/resume
        e.preventDefault();
        game.togglePause();
        return;
      }
      this.keys.add(k);
    };

    this._onUp = (e) => {
      const k = e.key;
      if (blockKeys.has(k)) e.preventDefault();
      this.keys.delete(k);
    };

    // passive:false is required for preventDefault to work on key events in some browsers
    window.addEventListener("keydown", this._onDown, { passive: false });
    window.addEventListener("keyup",   this._onUp,   { passive: false });
  }

  dispose() {
    window.removeEventListener("keydown", this._onDown);
    window.removeEventListener("keyup",   this._onUp);
  }
}
