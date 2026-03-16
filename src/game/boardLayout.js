/**
 * boardLayout.js
 * Octagonal 8-player Ludo board layout.
 * SVG viewBox: 0 0 560 560, centre (280,280)
 *
 * Relative position system (per player):
 *   0        = base (not on board)
 *   1        = own start tile (coloured start square)
 *   2-48     = rest of main path (clockwise, 48 tiles total, 6 per side × 8 sides)
 *   49-54    = home column (6 tiles leading toward centre)
 *   55       = home centre (WIN)
 */

export const SVG_SIZE = 560;
export const CENTER = { x: 280, y: 280 };
export const APOTHEM = 217;          // distance from centre to flat-side midpoint
export const TILES_PER_SIDE = 6;
export const SIDE_LENGTH = TILES_PER_SIDE * 30; // 180 px
export const TILE_SIZE = 28;          // visual size of each path tile
export const TILE_STEP = 30;          // centre-to-centre spacing along a side
export const HOME_COL_LENGTH = 6;
export const MAX_RELATIVE = 55;       // win position

// ─── Player colours ───────────────────────────────────────────────────────────
export const PLAYER_COLORS = [
  '#E53935', // 0 Red
  '#1E88E5', // 1 Blue
  '#43A047', // 2 Green
  '#FDD835', // 3 Yellow
  '#FB8C00', // 4 Orange
  '#8E24AA', // 5 Purple
  '#E91E63', // 6 Pink
  '#00ACC1', // 7 Cyan
];

export const PLAYER_NAMES = [
  'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Cyan',
];

// ─── Octagon vertices (clockwise from top-left) ───────────────────────────────
//  Each adjacent pair of vertices defines one side (= one player's path section).
function buildVertices() {
  const { x: cx, y: cy } = CENTER;
  const s = SIDE_LENGTH;
  const a = APOTHEM;
  return [
    { x: cx - s / 2, y: cy - a }, // V0 top-left  → S0 goes V0→V1 (Player 0, top)
    { x: cx + s / 2, y: cy - a }, // V1 top-right → S1 goes V1→V2 (Player 1, top-right diag)
    { x: cx + a, y: cy - s / 2 }, // V2 right-top → S2 goes V2→V3 (Player 2, right)
    { x: cx + a, y: cy + s / 2 }, // V3 right-bot → S3 goes V3→V4 (Player 3, bot-right diag)
    { x: cx + s / 2, y: cy + a }, // V4 bot-right → S4 goes V4→V5 (Player 4, bottom)
    { x: cx - s / 2, y: cy + a }, // V5 bot-left  → S5 goes V5→V6 (Player 5, bot-left diag)
    { x: cx - a, y: cy + s / 2 }, // V6 left-bot  → S6 goes V6→V7 (Player 6, left)
    { x: cx - a, y: cy - s / 2 }, // V7 left-top  → S7 goes V7→V0 (Player 7, top-left diag)
  ];
}

export const VERTICES = buildVertices();

// ─── Main path tiles (absolute indices 0-47) ─────────────────────────────────
function buildPathTiles() {
  const tiles = [];
  const SAFE_INDICES = buildSafeSet();
  for (let side = 0; side < 8; side++) {
    const start = VERTICES[side];
    const end = VERTICES[(side + 1) % 8];
    for (let t = 0; t < TILES_PER_SIDE; t++) {
      const frac = (t + 0.5) / TILES_PER_SIDE;
      const absIdx = side * TILES_PER_SIDE + t;
      tiles.push({
        x: start.x + (end.x - start.x) * frac,
        y: start.y + (end.y - start.y) * frac,
        absIdx,
        isStart: t === 0,   // first tile of each side = player's start tile
        isStar: SAFE_INDICES.star.has(absIdx),
        isSafe: SAFE_INDICES.all.has(absIdx),
      });
    }
  }
  return tiles;
}

function buildSafeSet() {
  // Start tiles (t=0 of every side): 0, 6, 12, 18, 24, 30, 36, 42
  // Star tiles (middle of each side, t=3): 3, 9, 15, 21, 27, 33, 39, 45
  const start = new Set();
  const star = new Set();
  for (let i = 0; i < 8; i++) {
    start.add(i * TILES_PER_SIDE);
    star.add(i * TILES_PER_SIDE + 3);
  }
  return { start, star, all: new Set([...start, ...star]) };
}

export const SAFE_ABSOLUTE_INDICES = buildSafeSet().all;
export const PATH_TILES = buildPathTiles();

// ─── Home columns (6 tiles per player) ───────────────────────────────────────
function buildHomeColumns() {
  const cols = [];
  for (let p = 0; p < 8; p++) {
    const start = VERTICES[p];
    const end = VERTICES[(p + 1) % 8];
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = CENTER.x - mid.x;
    const dy = CENTER.y - mid.y;
    const dist = Math.hypot(dx, dy);
    const dir = { x: dx / dist, y: dy / dist };
    const tiles = [];
    for (let t = 1; t <= HOME_COL_LENGTH; t++) {
      tiles.push({
        x: mid.x + dir.x * t * TILE_STEP,
        y: mid.y + dir.y * t * TILE_STEP,
        relPos: 48 + t, // 49-54
      });
    }
    cols.push(tiles);
  }
  return cols;
}

export const HOME_COL_TILES = buildHomeColumns();

// ─── Home bases (where tokens wait) ──────────────────────────────────────────
function buildHomeBases() {
  const bases = [];
  for (let p = 0; p < 8; p++) {
    const start = VERTICES[p];
    const end = VERTICES[(p + 1) % 8];
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = CENTER.x - mid.x;
    const dy = CENTER.y - mid.y;
    const dist = Math.hypot(dx, dy);
    const dir = { x: dx / dist, y: dy / dist };
    const perp = { x: -dir.y, y: dir.x };
    // Centre of home base is 32px outside the path midpoint
    const cx = mid.x - dir.x * 32;
    const cy = mid.y - dir.y * 32;
    // 4 token slots in 2×2 arrangement (±12 along dir and perp axes)
    const slots = [
      { x: cx + perp.x * (-12) + dir.x * (-12), y: cy + perp.y * (-12) + dir.y * (-12) },
      { x: cx + perp.x * 12   + dir.x * (-12), y: cy + perp.y * 12   + dir.y * (-12) },
      { x: cx + perp.x * (-12) + dir.x * 12,   y: cy + perp.y * (-12) + dir.y * 12   },
      { x: cx + perp.x * 12   + dir.x * 12,    y: cy + perp.y * 12   + dir.y * 12    },
    ];
    bases.push({ cx, cy, slots, dir, perp, radius: 26 });
  }
  return bases;
}

export const HOME_BASES = buildHomeBases();

// ─── Coordinate lookup helpers ────────────────────────────────────────────────

/** Absolute path index for a player at relativePos (1-48) */
export function getAbsIndex(playerIndex, relPos) {
  return (playerIndex * TILES_PER_SIDE + relPos - 1) % 48;
}

/** Pixel coordinates for a token at a given relative position */
export function getTileCoords(playerIndex, relPos) {
  if (relPos === 0) {
    // Still in base – caller should use HOME_BASES slot positions
    return null;
  }
  if (relPos >= 1 && relPos <= 48) {
    const absIdx = getAbsIndex(playerIndex, relPos);
    return PATH_TILES[absIdx];
  }
  if (relPos >= 49 && relPos <= 54) {
    return HOME_COL_TILES[playerIndex][relPos - 49];
  }
  if (relPos === MAX_RELATIVE) {
    return CENTER; // home centre
  }
  return null;
}

/** Is a tile at the given relative position a safe zone? */
export function isSafeZone(playerIndex, relPos) {
  if (relPos <= 0 || relPos >= 49) return true; // base / home column / centre are all safe
  const absIdx = getAbsIndex(playerIndex, relPos);
  return SAFE_ABSOLUTE_INDICES.has(absIdx);
}
