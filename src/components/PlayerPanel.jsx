/**
 * PlayerPanel.jsx
 * Bottom strip showing all active players, current turn indicator,
 * and the current player's dice.
 */
import React from 'react';
import { PLAYER_COLORS, PLAYER_NAMES } from '../game/boardLayout.js';

/**
 * Props:
 *  players          – state.players array
 *  currentPlayerIdx – state.currentPlayerIndex
 *  myPlayerIndex    – state.myPlayerIndex
 *  winnersOrder     – state.winnersOrder
 */
export default function PlayerPanel({ players, currentPlayerIdx, myPlayerIndex, winnersOrder }) {
  const active = players.filter(p => p.isActive);

  return (
    <div className="player-panel">
      {active.map(player => {
        const i = player.id;
        const isCurrent = i === currentPlayerIdx;
        const isMe = i === myPlayerIndex;
        const tokensHome = player.tokens.filter(t => t.isHome).length;
        const rank = winnersOrder.indexOf(i) >= 0 ? winnersOrder.indexOf(i) + 1 : null;

        return (
          <div
            key={i}
            className={`pp-player ${isCurrent ? 'pp-current' : ''} ${isMe ? 'pp-me' : ''}`}
            style={{ '--c': PLAYER_COLORS[i] }}
          >
            <div className="pp-avatar" style={{ background: PLAYER_COLORS[i] }}>
              {rank ? `#${rank}` : PLAYER_NAMES[i][0]}
            </div>
            <div className="pp-info">
              <div className="pp-name">
                {PLAYER_NAMES[i]}{isMe ? ' (You)' : ''}
              </div>
              <div className="pp-tokens">
                {Array.from({ length: 4 }, (_, t) => (
                  <span
                    key={t}
                    className={`pp-token-dot ${player.tokens[t]?.isHome ? 'home' : ''}`}
                    style={{ background: player.tokens[t]?.isHome ? PLAYER_COLORS[i] : '#444' }}
                  />
                ))}
              </div>
            </div>
            {isCurrent && <div className="pp-turn-arrow">▶</div>}
          </div>
        );
      })}
    </div>
  );
}
