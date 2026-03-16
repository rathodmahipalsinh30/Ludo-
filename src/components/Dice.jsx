/**
 * Dice.jsx
 * Animated dice with:
 *  - 3-D tumble CSS keyframe animation during rolling.
 *  - Tap "squish" feedback.
 *  - Pulsing glow ring when it's this player's turn.
 *
 * Props:
 *  value        – 1-6 | null (current face)
 *  isRolling    – bool (show animation)
 *  canRoll      – bool (this client can roll right now)
 *  isMyTurn     – bool
 *  onRoll       – () => void
 *  playerColor  – hex string
 */
import React, { useState, useEffect } from 'react';

const DOTS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

export default function Dice({ value, isRolling, canRoll, isMyTurn, onRoll, playerColor = '#fff' }) {
  const [squish, setSquish] = useState(false);

  function handleClick() {
    if (!canRoll) return;
    setSquish(true);
    setTimeout(() => setSquish(false), 150);
    onRoll();
  }

  const displayValue = isRolling ? Math.floor(Math.random() * 6) + 1 : (value || 6);
  const dots = DOTS[displayValue] || DOTS[6];

  return (
    <div
      className={[
        'dice-wrapper',
        isMyTurn ? 'dice-active' : '',
        canRoll ? 'dice-can-roll' : '',
      ].join(' ')}
      style={{ '--player-color': playerColor }}
      onClick={handleClick}
      role="button"
      aria-label={`Dice showing ${displayValue}. ${canRoll ? 'Tap to roll.' : ''}`}
    >
      <div className={['dice', isRolling ? 'dice-rolling' : '', squish ? 'dice-squish' : ''].join(' ')}>
        {/* Dice face */}
        <svg viewBox="0 0 100 100" className="dice-face">
          {/* Face background */}
          <rect x={2} y={2} width={96} height={96} rx={14} ry={14}
            fill="white" stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
          {/* Dots */}
          {dots.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="#222" />
          ))}
        </svg>
      </div>
      {isMyTurn && canRoll && (
        <div className="dice-roll-hint">TAP TO ROLL</div>
      )}
    </div>
  );
}
