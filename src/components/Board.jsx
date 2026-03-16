/**
 * Board.jsx
 * Renders the complete octagonal 8-player Ludo board as a responsive SVG.
 *
 * Layout origin: SVG viewBox "0 0 560 560", centre (280,280).
 */
import React, { useMemo } from 'react';
import {
  SVG_SIZE, CENTER, TILE_SIZE,
  PATH_TILES, HOME_COL_TILES, HOME_BASES,
  PLAYER_COLORS, PLAYER_NAMES,
  getTileCoords, MAX_RELATIVE,
  VERTICES,
} from '../game/boardLayout.js';
import Token from './Token.jsx';

/**
 * Props:
 *  players        – state.players
 *  movableTokens  – state.movableTokens
 *  currentPlayer  – state.currentPlayerIndex
 *  diceRolled     – state.diceRolled
 *  myPlayerIndex  – state.myPlayerIndex
 *  onTokenClick   – (tokenId) => void
 */
export default function Board({
  players,
  movableTokens,
  currentPlayer,
  diceRolled,
  myPlayerIndex,
  onTokenClick,
}) {
  // ── Build token position map ───────────────────────────────────────────────
  // Map from stringified {x,y} → list of {playerIndex, tokenId, isMovable}
  const tokenGroups = useMemo(() => {
    const groups = {};
    players.forEach((player, pi) => {
      if (!player.isActive) return;
      player.tokens.forEach(token => {
        if (token.relPos === 0) {
          // In base – use home base slot position
          const slot = HOME_BASES[pi]?.slots[token.id];
          if (!slot) return;
          const key = `base-${pi}-${token.id}`;
          groups[key] = [{
            x: slot.x, y: slot.y,
            playerIndex: pi, tokenId: token.id,
            isMovable: pi === currentPlayer && diceRolled && movableTokens.includes(token.id),
          }];
          return;
        }
        const coords = getTileCoords(pi, token.relPos);
        if (!coords) return;
        const tileKey = `${Math.round(coords.x)}-${Math.round(coords.y)}`;
        if (!groups[tileKey]) groups[tileKey] = [];
        groups[tileKey].push({
          x: coords.x, y: coords.y,
          playerIndex: pi, tokenId: token.id,
          isMovable: pi === currentPlayer && diceRolled && movableTokens.includes(token.id),
        });
      });
    });
    return groups;
  }, [players, movableTokens, currentPlayer, diceRolled]);

  return (
    <div className="board-wrapper">
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="board-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width={SVG_SIZE} height={SVG_SIZE} fill="#1a2332" rx={16} />

        {/* ── Octagon background area ────────────────────────────────────────── */}
        <polygon
          points={VERTICES.map(v => `${v.x},${v.y}`).join(' ')}
          fill="#243447"
          stroke="#2d4a6b"
          strokeWidth={2}
        />

        {/* ── Home base areas ────────────────────────────────────────────────── */}
        {HOME_BASES.map((base, pi) => {
          const color = PLAYER_COLORS[pi];
          return (
            <g key={`hb-${pi}`}>
              {/* Outer glow */}
              <circle cx={base.cx} cy={base.cy} r={base.radius + 4}
                fill={color} opacity={0.2} />
              {/* Home base background */}
              <circle cx={base.cx} cy={base.cy} r={base.radius}
                fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
              {/* Player initial */}
              <text
                x={base.cx} y={base.cy}
                textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize={11} fontWeight="bold" opacity={0.7}
              >
                {PLAYER_NAMES[pi][0]}
              </text>
            </g>
          );
        })}

        {/* ── Main path tiles ────────────────────────────────────────────────── */}
        {PATH_TILES.map((tile, idx) => {
          const playerSide = Math.floor(idx / 6);
          const tileInSide = idx % 6;
          const isStartTile = tileInSide === 0;
          const isStarTile = tile.isStar;
          const bgColor = isStartTile
            ? PLAYER_COLORS[playerSide]
            : isStarTile
              ? '#fffde7'
              : '#ffffff';
          const half = TILE_SIZE / 2;

          return (
            <g key={`path-${idx}`}>
              <rect
                x={tile.x - half} y={tile.y - half}
                width={TILE_SIZE} height={TILE_SIZE}
                rx={3} ry={3}
                fill={bgColor}
                stroke={isStartTile ? 'rgba(0,0,0,0.25)' : '#b0bec5'}
                strokeWidth={1}
              />
              {isStarTile && <StarIcon cx={tile.x} cy={tile.y} size={10} />}
            </g>
          );
        })}

        {/* ── Home column tiles ──────────────────────────────────────────────── */}
        {HOME_COL_TILES.map((colTiles, pi) => {
          const color = PLAYER_COLORS[pi];
          return colTiles.map((tile, t) => {
            const half = TILE_SIZE / 2;
            const opacity = 0.35 + t * 0.1; // progressively brighter toward centre
            return (
              <rect
                key={`hc-${pi}-${t}`}
                x={tile.x - half} y={tile.y - half}
                width={TILE_SIZE} height={TILE_SIZE}
                rx={3} ry={3}
                fill={color}
                opacity={opacity}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={0.8}
              />
            );
          });
        })}

        {/* ── Home centre star ───────────────────────────────────────────────── */}
        <HomeCentre cx={CENTER.x} cy={CENTER.y} />

        {/* ── Tokens ─────────────────────────────────────────────────────────── */}
        {Object.values(tokenGroups).map(group =>
          group.map((tok, stackIndex) => (
            <Token
              key={`token-${tok.playerIndex}-${tok.tokenId}`}
              x={tok.x} y={tok.y}
              color={PLAYER_COLORS[tok.playerIndex]}
              playerIndex={tok.playerIndex}
              tokenId={tok.tokenId}
              isMovable={tok.isMovable}
              stackIndex={stackIndex}
              stackCount={group.length}
              onClick={() => onTokenClick(tok.tokenId)}
            />
          ))
        )}
      </svg>
    </div>
  );
}

// ── Small helper SVG sub-components ──────────────────────────────────────────

function StarIcon({ cx, cy, size }) {
  const pts = buildStarPoints(cx, cy, size, size * 0.45, 5);
  return <polygon points={pts} fill="#f9a825" />;
}

function HomeCentre({ cx, cy }) {
  const r = 34;
  const pts8 = buildStarPoints(cx, cy, r, r * 0.45, 8);
  return (
    <g>
      {/* Multi-colour segments */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <path
          key={i}
          d={homeSegmentPath(cx, cy, r * 1.15, i)}
          fill={PLAYER_COLORS[i]}
          opacity={0.85}
        />
      ))}
      {/* Centre star */}
      <polygon points={pts8} fill="#fff" opacity={0.9} />
    </g>
  );
}

/** Build an octant path for the home centre */
function homeSegmentPath(cx, cy, r, index) {
  const startAngle = (index * Math.PI * 2) / 8 - Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2) / 8;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
}

/** Build SVG polygon points string for a regular star */
function buildStarPoints(cx, cy, outerR, innerR, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}
