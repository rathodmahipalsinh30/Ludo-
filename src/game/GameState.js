/**
 * GameState.js
 * Pure constants and the canonical initial state factory.
 * All state is serialisable JSON so it can be broadcast over PeerJS.
 */
import { PLAYER_COLORS, PLAYER_NAMES } from './boardLayout.js';

export const NUM_PLAYERS = 8;
export const TOKENS_PER_PLAYER = 4;
export const TOTAL_TOKENS = NUM_PLAYERS * TOKENS_PER_PLAYER; // 32

export const PHASES = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

/** Build a single token */
function makeToken(playerId, tokenId) {
  return {
    id: tokenId,         // 0-3 within the player
    playerId,            // 0-7
    relPos: 0,           // 0 = base, 1-48 = main path, 49-54 = home col, 55 = home/win
    isHome: false,
  };
}

/** Build a single player record */
function makePlayer(index) {
  return {
    id: index,
    color: PLAYER_COLORS[index],
    name: PLAYER_NAMES[index],
    peerId: null,         // filled in when peer connects
    isConnected: false,
    isActive: false,      // true = currently in the room
    rank: null,           // finishing position (1st, 2nd, …)
    tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, t) => makeToken(index, t)),
  };
}

/**
 * Create the canonical empty initial game state.
 * myPlayerIndex: which player this local client controls (default 0 = host).
 */
export function createInitialState(myPlayerIndex = 0) {
  return {
    phase: PHASES.LOBBY,
    players: Array.from({ length: NUM_PLAYERS }, (_, i) => makePlayer(i)),
    activePlayerCount: 0,    // how many players have joined
    currentPlayerIndex: 0,   // whose turn it is
    diceValue: null,          // last rolled value (1-6)
    diceRolled: false,        // true after rolling, false after moving
    consecutiveSixes: 0,      // for the three-6-penalty rule
    bonusTurn: false,         // player earns an extra roll
    mustRoll: true,           // waiting for roll vs. waiting for move
    movableTokens: [],        // ids of tokens that CAN legally move
    roomId: null,
    myPlayerIndex,
    winnersOrder: [],         // player indices in finish order
    chatMessages: [],         // optional future feature stub
  };
}

export default createInitialState;
