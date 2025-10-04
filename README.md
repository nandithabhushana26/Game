# 🌾 **Harvest Rush**

A lightweight JS canvas game where you (the farmer) race an **AI farmer** to collect crops before the timer runs out. Dodge **scarecrows** and **crows**, grab **speed boosts**, and win a **3‑round series** across increasing difficulty levels.

---

## 🚀 **How to Run**

Because the game loads ES modules and `config/difficulty.json`, you **must run a local server**.

- **VS Code**: install *Live Server*, right‑click `index.html` → **Open with Live Server**  
- **Node** (any folder):
  ```bash
  npx http-server -c-1 .
  # or
  python3 -m http.server
  ```
- Open the served URL .  

---

## 🎮 **Controls & Scoring**

- **Move**: `W A S D` or arrow keys **⬆️⬇️⬅️➡️**
- **Pause / Resume**: `P`
- **Goal**: reach the **Target** score before time ends.

**Crop points**
- 🌽 **Corn** = **+2**
- 🍓 **Strawberry** = **+4**
- 🫐 **Blueberry** = **+6**

**Hazards & Powerups**
- 👻 **Scarecrows**: static obstacles (block movement).
- 🐦 **Crows**: moving hazard; on hit you lose **5 points** and **3 seconds**.
- ⚡ **Speed Boost**: temporary faster movement (timer shown near buttons).

---

## 🧠 **AI Farmer**

- Competes for the same crops.
- Uses grid **A\*** pathfinding with obstacle **clearance** → **no jitter** on scarecrows.
- Slightly **slower than the player** by default so humans can win.

### 🔧 **Tune AI Difficulty**
Open `AIFarmer.js` and edit:
```js
// 90% of player speed (easier). Lower = easier, higher = harder
this.baseSpeed = (this.baseSpeed || this.speed) * 0.90;
this.speed = this.baseSpeed;

// How often A* replans (seconds). Lower = more reactive.
this._replanPeriod = 0.45;

// Keep this many tiles away from obstacles. 2 = extra safe, 0 = risky.
this._clearanceTiles = 1;
```

---

## 🧱 **Levels, Rounds, Reset**

- The game runs **3 levels** (higher goals, more pressure, faster spawns).
- Each level is **one round** of the series. Final banner shows the series winner.
- **Reset** button restarts from **Level 1** with fresh state and scores.

---

## 🧩 **Project Structure**

```
.
├─ index.html            # UI layout and HUD
├─ style.css             # Modern, clean UI styling
├─ main.js               # Boot: loads difficulty.json and starts Game
├─ Game.js               # Game loop, levels/rounds, spawns, collisions, UI sync
├─ constants.js          # Tile sizes, enums, helpers
├─ Input.js              # Keyboard handling (WASD/Arrows + Pause)
├─ Entity.js             # Base class
├─ Farmer.js             # Player farmer (4x4 sprite; crisp animation)
├─ AIFarmer.js           # AI with A* + clearance (no obstacle jitter)
├─ Crop.js               # Crops (corn/strawberry/blueberry)
├─ Powerup.js            # Speed boost
├─ Obstacle.js           # Scarecrow + crow (moving hazard)
├─ /sprites
│  ├─ Farmer.png         # 4x4 (rows: down, right, left, up)
│  └─ Crow.png           # Crow animation strip
└─ /config
   └─ difficulty.json    # Per-level goals, timers, spawn rates
```

---

## ⚙️ **Configuration** (`config/difficulty.json`)

Adjust level goals, timers, crop spawn cadence, and crow frequency without touching code.

```json
{
  "levels": [
    { "goal": 25, "time": 45, "cropSpawnRate": 1.0, "crowEvery": 8, "farmerSpeedMultiplier": 1.0 },
    { "goal": 45, "time": 40, "cropSpawnRate": 0.8, "crowEvery": 6, "farmerSpeedMultiplier": 1.05 },
    { "goal": 60, "time": 35, "cropSpawnRate": 0.7, "crowEvery": 5, "farmerSpeedMultiplier": 1.10 }
  ],
  "crops": [
    { "name": "corn", "color": "#ffd95b", "points": 2, "emoji": "🌽" },
    { "name": "strawberry", "color": "#e63946", "points": 4, "emoji": "🍓" },
    { "name": "blueberry", "color": "#4361ee", "points": 6, "emoji": "🫐" }
  ]
}
```
> `farmerSpeedMultiplier` affects the **player** only; the AI’s relative speed is in `AIFarmer.js`.

---

## ✅ **Features Implemented**

- Player farmer with smooth, crisp 4×4 sprite animation (no mirror seams)
- AI farmer competitor with **A\*** + clearance (doesn’t collide with obstacles)
- **3‑round series**, top **time track**, and polished **HUD chips**: **My Score / Time / Level / Target / AI**
- **Start / Reset** buttons (Reset returns to **Level 1**)
- Powerups, hazards, crop values, and clear level progression
- Responsive layout + “Controls & Scoring” reference section

---

## 🧪 **Troubleshooting**

- **Blank page / nothing loads** → Use a local server (Live Server / `http-server` / Python).  
- **Sprites look blurry / seams** → The code disables smoothing and snaps to integers. If you replace sprites, use crisp sheets.  
- **AI too strong** → Lower the multiplier in `AIFarmer.js` (e.g., `0.80`).  
- **AI path too cautious** → Reduce `this._clearanceTiles` from `1` → `0`.

---
