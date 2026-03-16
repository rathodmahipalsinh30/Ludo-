/**
 * Token.jsx
 * A single Ludo token rendered as an SVG circle.
 * Handles:
 *  - overlap fan-out when multiple tokens share the same tile.
 *  - tap/click to move.
 *  - highlight when movable.
 */
import React from 'react';
import { PLAYER_COLORS } from '../game/boardLayout.js';

/**
 * Props:
 *  x, y          – base SVG coordinates of the tile centre
 *  color         – hex string
 *  playerIndex   – 0-7
 *  tokenId       – 0-3
 *  isMovable     – bool
 *  isHome        – bool (in base or home centre)
 *  stackIndex    – 0-based index within tokens on same tile (for fan-out)
 *  stackCount    – total tokens sharing this tile
 *  onClick       – () => void
 */
export default function Token({
  x, y,
  color,
  playerIndex,
  tokenId,
  isMovable = false,
  isHome = false,
  stackIndex = 0,
  stackCount = 1,
  onClick,
}) {
  // Fan-out offsets for stacked tokens
  const fanOffsets = getFanOffsets(stackCount, stackIndex);
  const cx = x + fanOffsets.dx;
  const cy = y + fanOffsets.dy;

  // Scale down when stacked
  const scale = stackCount > 1 ? Math.max(0.55, 1 - stackCount * 0.1) : 1;
  const r = 11 * scale;

  const baseColor = color || PLAYER_COLORS[playerIndex];
  const strokeColor = isMovable ? '#fff' : 'rgba(0,0,0,0.4)';
  const strokeWidth = isMovable ? 2.5 : 1.5;

  return (
    <g
      className={`token ${isMovable ? 'token-movable' : ''}`}
      onClick={isMovable ? onClick : undefined}
      style={{ cursor: isMovable ? 'pointer' : 'default' }}
    >
      {/* Glow / pulse ring for movable token */}
      {isMovable && (
        <circle
          cx={cx} cy={cy} r={r + 5}
          fill="none"
          stroke={baseColor}
          strokeWidth={2}
          opacity={0.6}
          className="token-pulse"
        />
      )}

      {/* Shadow */}
      <circle cx={cx + 1} cy={cy + 2} r={r} fill="rgba(0,0,0,0.3)" />

      {/* Main body */}
      <circle cx={cx} cy={cy} r={r} fill={baseColor} stroke={strokeColor} strokeWidth={strokeWidth} />

      {/* Inner highlight (metallic look) */}
      <ellipse
        cx={cx - r * 0.25} cy={cy - r * 0.3}
        rx={r * 0.4} ry={r * 0.25}
        fill="rgba(255,255,255,0.45)"
      />

      {/* Token ID dot */}
      <circle cx={cx} cy={cy} r={r * 0.28} fill="rgba(0,0,0,0.3)" />
    </g>
  );
}

/** Calculate fan-out dx/dy offsets given stack size and index */
function getFanOffsets(count, index) {
  if (count <= 1) return { dx: 0, dy: 0 };
  const spread = Math.min(8, count * 2.5);
  if (count === 2) {
    const positions = [[-spread / 2, 0], [spread / 2, 0]];
    return { dx: positions[index][0], dy: positions[index][1] };
  }
  if (count === 3) {
    const angle = (index * (2 * Math.PI)) / 3 - Math.PI / 2;
    return { dx: spread * Math.cos(angle), dy: spread * Math.sin(angle) };
  }
  // 4+: evenly spaced around a circle
  const angle = (index * (2 * Math.PI)) / count - Math.PI / 4;
  return { dx: spread * Math.cos(angle), dy: spread * Math.sin(angle) };
}
