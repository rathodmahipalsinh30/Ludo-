/**
 * GameContext.jsx
 * React context + useReducer for the entire game state.
 * Exposes: state, dispatch, rollDice, moveToken, isMyTurn.
 */
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { createInitialState, PHASES } from './GameState.js';
import { applyRoll, applyMove, computeMovableTokens } from './rulesEngine.js';
import rollDiceCrypto from './cryptoDice.js';

// ─── Actions ──────────────────────────────────────────────────────────────────
export const ACTIONS = {
  ROLL_DICE: 'ROLL_DICE',
  MOVE_TOKEN: 'MOVE_TOKEN',
  JOIN_PLAYER: 'JOIN_PLAYER',
  SET_ROOM: 'SET_ROOM',
  SET_MY_INDEX: 'SET_MY_INDEX',
  SYNC_STATE: 'SYNC_STATE',
  SET_PHASE: 'SET_PHASE',
  START_GAME: 'START_GAME',
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SYNC_STATE:
      // Full state replace from host broadcast (preserve myPlayerIndex)
      return { ...action.payload, myPlayerIndex: state.myPlayerIndex };

    case ACTIONS.SET_MY_INDEX:
      return { ...state, myPlayerIndex: action.payload };

    case ACTIONS.SET_ROOM:
      return { ...state, roomId: action.payload };

    case ACTIONS.JOIN_PLAYER: {
      const { playerIndex, peerId, name } = action.payload;
      const players = state.players.map((p, i) => {
        if (i !== playerIndex) return p;
        return { ...p, peerId, isConnected: true, isActive: true, name: name || p.name };
      });
      return {
        ...state,
        players,
        activePlayerCount: players.filter(p => p.isActive).length,
      };
    }

    case ACTIONS.SET_PHASE:
      return { ...state, phase: action.payload };

    case ACTIONS.START_GAME: {
      const players = state.players.map((p, i) => ({
        ...p,
        isActive: i < state.activePlayerCount,
      }));
      return {
        ...state,
        phase: PHASES.PLAYING,
        players,
        currentPlayerIndex: 0,
        mustRoll: true,
        diceValue: null,
      };
    }

    case ACTIONS.ROLL_DICE:
      return applyRoll(state, action.payload);

    case ACTIONS.MOVE_TOKEN:
      return applyMove(state, action.payload);

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, createInitialState(0));

  /** Roll dice (only valid on your turn and mustRoll===true) */
  const rollDice = useCallback(() => {
    if (!state.mustRoll) return;
    if (state.phase !== PHASES.PLAYING) return;
    const val = rollDiceCrypto();
    dispatch({ type: ACTIONS.ROLL_DICE, payload: val });
  }, [state.mustRoll, state.phase]);

  /** Move a token by its id within the current player's tokens array */
  const moveToken = useCallback(
    tokenId => {
      if (state.mustRoll) return;
      if (!state.movableTokens.includes(tokenId)) return;
      dispatch({ type: ACTIONS.MOVE_TOKEN, payload: tokenId });
    },
    [state.mustRoll, state.movableTokens]
  );

  const isMyTurn = state.currentPlayerIndex === state.myPlayerIndex && state.phase === PHASES.PLAYING;

  return (
    <GameContext.Provider value={{ state, dispatch, rollDice, moveToken, isMyTurn }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

export default GameContext;
