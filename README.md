# 🎲 Ludo King 8P — Serverless WebRTC Multiplayer

A complete, **mobile-first 8-player Ludo** game that replicates the **Ludo King** UI and rules.  
No backend required — real-time multiplayer runs entirely in the browser via **WebRTC (PeerJS)**.

---

## 📁 Project Folder Structure

```
Ludo-/
├── index.html                  # App shell – single <div id="root">, Vite entry point
├── vite.config.js              # Vite config (base: './' for GitHub Pages)
├── eslint.config.js            # ESLint 9 flat-config for React + hooks
├── package.json                # Dependencies: react, react-dom, peerjs
├── .gitignore                  # Ignores node_modules/, dist/, *.local
│
├── public/
│   ├── favicon.svg             # Browser tab icon
│   └── icons.svg               # SVG sprite (social / doc icons)
│
└── src/
    ├── main.jsx                # React DOM root – mounts <App /> in StrictMode
    ├── App.jsx                 # Root component: Lobby → GameScreen routing
    ├── App.css                 # (empty – all styles live in index.css)
    ├── index.css               # Global mobile-first dark-theme styles + animations
    │
    ├── assets/
    │   ├── hero.png            # Static asset (Vite template remnant)
    │   ├── react.svg           # React logo SVG
    │   └── vite.svg            # Vite logo SVG
    │
    ├── game/                   # Pure game logic (no React, no network)
    │   ├── boardLayout.js      # Octagonal board geometry, tile coordinates,
    │   │                       #   home bases, home columns, safe-zone sets
    │   ├── GameState.js        # createInitialState() factory – 8 players × 4 tokens,
    │   │                       #   serialisable JSON for PeerJS broadcast
    │   ├── cryptoDice.js       # rollDice() via window.crypto.getRandomValues
    │   │                       #   (rejection-sampling, zero Math.random)
    │   ├── rulesEngine.js      # applyRoll() / applyMove() / computeMovableTokens()
    │   │                       #   – roll-6 unlock, bonus turns, three-6 penalty,
    │   │                       #     safe zones, kill detection, win detection
    │   └── GameContext.jsx     # React context + useReducer; exposes rollDice,
    │                           #   moveToken, isMyTurn, state, dispatch
    │
    ├── network/
    │   └── PeerManager.js      # PeerJS wrapper:
    │                           #   Host  – createRoom() generates crypto room ID,
    │                           #           receives actions, broadcasts state JSON
    │                           #   Client – joinRoom(id) connects to host,
    │                           #            sends actions, receives state syncs
    │
    └── components/
        ├── Board.jsx           # Responsive SVG board – path tiles, home bases,
        │                       #   home columns, star safe-zone icons, 8-colour
        │                       #   home centre, all tokens rendered here
        ├── Token.jsx           # SVG token with metallic highlight; overlap
        │                       #   fan-out when ≥ 2 tokens share a tile
        ├── Dice.jsx            # 3-D CSS tumble animation on roll, tap-squish
        │                       #   feedback, pulsing glow ring on active player
        ├── Lobby.jsx           # Create Room (host) / Join Room (client) screens,
        │                       #   live waiting-room with 8 player slots
        └── PlayerPanel.jsx     # Horizontal-scroll strip – avatars, token-progress
                                #   dots, current-turn arrow
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Multiplayer | [PeerJS](https://peerjs.com/) (WebRTC, no server) |
| Dice fairness | `window.crypto.getRandomValues` (rejection-sampling) |
| Styling | Plain CSS (mobile-first, dark theme, CSS keyframe animations) |
| Hosting | GitHub Pages (`base: './'` in Vite config) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install dependencies
```bash
npm install
```

### Development server (hot-reload)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Production build
```bash
npm run build        # outputs to dist/
npm run preview      # serve dist/ locally
```

### Lint
```bash
npm run lint
```

---

## 🌐 Deploy to GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```
2. Push the `dist/` folder to the `gh-pages` branch (e.g. via [gh-pages](https://www.npmjs.com/package/gh-pages)):
   ```bash
   npx gh-pages -d dist
   ```
   Or configure a GitHub Actions workflow that runs `npm run build` and deploys `dist/`.

> `vite.config.js` already sets `base: './'` so all asset URLs are relative — no extra routing config needed.

---

## 🎮 Game Rules

| Rule | Detail |
|---|---|
| **Unlock** | A token can only leave its home base on a roll of **6** |
| **Bonus turn** | Rolling 6, killing an opponent's token, or moving a token into the home centre grants an **extra roll** |
| **Three-6 penalty** | Three consecutive 6s → turn is **skipped**, no tokens move |
| **Safe zones** | Tokens on a player's own **start tile** or any **★ star tile** cannot be killed |
| **Winning** | First player to move all 4 tokens to the home centre wins; game continues until all players finish |

---

## 🔌 Multiplayer Flow

```
Player 1 (Host)               Players 2-8 (Clients)
──────────────────            ─────────────────────
Click "Create Room"           Click "Join Room"
  │                             │
  ▼                             ▼
PeerManager.createRoom()      PeerManager.joinRoom(roomId)
  │  ← generates roomId         │  ← enter 6-char code
  │                             │
  └──── WebRTC connection ──────┘
              │
   Host = authoritative state validator
   Any roll/move → sent to Host → Host applies rules
            → Host broadcasts new state JSON to all peers
```

---

## 📐 Board Coordinate System

Tokens are tracked with a **relative position integer** per player:

| Value | Meaning |
|---|---|
| `0` | Base (off-board) |
| `1` | Own start tile |
| `2 – 48` | Main path (clockwise, 6 tiles × 8 sides) |
| `49 – 54` | Home column (6 tiles toward centre) |
| `55` | Home / Win |

`boardLayout.js → getTileCoords(playerIndex, relPos)` maps any relative position to absolute SVG pixel coordinates.

