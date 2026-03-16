/**
 * App.jsx
 * Root component. Handles lobby / game screens.
 * Uses HashRouter (hash-based navigation) compatible with GitHub Pages.
 */
import React, { useState, useRef } from 'react';
import { GameProvider, useGame, ACTIONS } from './game/GameContext.jsx';
import { PHASES } from './game/GameState.js';
import Lobby from './components/Lobby.jsx';
import Board from './components/Board.jsx';
import Dice from './components/Dice.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import { PLAYER_COLORS, PLAYER_NAMES } from './game/boardLayout.js';

const COLOR_NAMES = ['Red','Blue','Green','Yellow','Orange','Purple','Pink','Cyan'];

function GameScreen() {
  const { state, rollDice, moveToken, isMyTurn } = useGame();
  const [isRolling, setIsRolling] = useState(false);

  function handleRoll() {
    if (!isMyTurn || !state.mustRoll) return;
    setIsRolling(true);
    setTimeout(() => {
      setIsRolling(false);
      rollDice();
    }, 600);
  }

  function handleTokenClick(tokenId) {
    if (!isMyTurn || state.mustRoll) return;
    moveToken(tokenId);
  }

  const currentPlayerColor = PLAYER_COLORS[state.currentPlayerIndex];

  return (
    <div className="game-screen" style={{ '--current-color': currentPlayerColor }}>
      {/* Top bar */}
      <div className="top-bar">
        <div className="turn-indicator" style={{ background: currentPlayerColor }}>
          {state.currentPlayerIndex === state.myPlayerIndex
            ? '🎲 Your Turn!'
            : `${COLOR_NAMES[state.currentPlayerIndex]}'s Turn`}
        </div>
        {state.diceValue !== null && !state.mustRoll && (
          <div className="dice-result">Rolled: {state.diceValue}</div>
        )}
      </div>

      {/* Board */}
      <Board
        players={state.players}
        movableTokens={state.movableTokens}
        currentPlayer={state.currentPlayerIndex}
        diceRolled={state.diceRolled}
        myPlayerIndex={state.myPlayerIndex}
        onTokenClick={handleTokenClick}
      />

      {/* Dice area */}
      <div className="dice-area">
        <Dice
          value={state.diceValue}
          isRolling={isRolling}
          canRoll={isMyTurn && state.mustRoll}
          isMyTurn={isMyTurn}
          onRoll={handleRoll}
          playerColor={currentPlayerColor}
        />
        {!isMyTurn && state.mustRoll && (
          <div className="waiting-label">Waiting for {COLOR_NAMES[state.currentPlayerIndex]}…</div>
        )}
      </div>

      {/* Player panel */}
      <PlayerPanel
        players={state.players}
        currentPlayerIdx={state.currentPlayerIndex}
        myPlayerIndex={state.myPlayerIndex}
        winnersOrder={state.winnersOrder}
      />

      {/* Win overlay */}
      {state.phase === PHASES.FINISHED && (
        <div className="win-overlay">
          <div className="win-card">
            <div className="win-title">🏆 Game Over!</div>
            {state.winnersOrder.map((pidx, rank) => (
              <div key={pidx} className="win-entry">
                #{rank + 1} – {COLOR_NAMES[pidx]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { state } = useGame();
  const [peerManager, setPeerManager] = useState(null);

  if (state.phase === PHASES.LOBBY) {
    return <Lobby onStart={pm => setPeerManager(pm)} />;
  }
  return <GameScreen />;
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
