/**
 * rulesEngine.js
 * Pure functions – no side effects, no React imports.
 * Receives the current GameState and an action, returns the next GameState.
 *
 * Relative position system (per player):
 *   0        = base
 *   1-48     = main path  (6 tiles per side × 8 sides)
 *   49-54    = home column (6 tiles)
 *   55       = home / win
 */
import { getAbsIndex, isSafeZone, MAX_RELATIVE, TILES_PER_SIDE } from './boardLayout.js';
import { PHASES } from './GameState.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Deep-clone via JSON (state is always serialisable) */
function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

/** All tokens of a player that are currently in base */
function tokensInBase(player) {
  return player.tokens.filter(t => t.relPos === 0);
}

/** All tokens on the board (not base, not home) */
function tokensOnBoard(player) {
  return player.tokens.filter(t => t.relPos > 0 && t.relPos < MAX_RELATIVE);
}

/** Has the player finished? (all 4 tokens home) */
function playerFinished(player) {
  return player.tokens.every(t => t.isHome);
}

/**
 * Which tokens CAN the current player legally move given diceValue?
 * Returns array of token ids.
 */
export function computeMovableTokens(state) {
  const player = state.players[state.currentPlayerIndex];
  const die = state.diceValue;
  const movable = [];

  player.tokens.forEach(token => {
    if (token.isHome) return;

    // Token in base: can only leave on a 6
    if (token.relPos === 0) {
      if (die === 6) movable.push(token.id);
      return;
    }

    // Token on board / home column: check if move is valid (don't overshoot centre)
    const newPos = token.relPos + die;
    if (newPos <= MAX_RELATIVE) {
      movable.push(token.id);
    }
  });

  return movable;
}

/**
 * Apply ROLL_DICE action.
 * Handles three-sixes penalty.
 */
export function applyRoll(state, diceValue) {
  const next = clone(state);
  next.diceValue = diceValue;
  next.diceRolled = true;
  next.mustRoll = false;

  if (diceValue === 6) {
    next.consecutiveSixes += 1;
  } else {
    next.consecutiveSixes = 0;
  }

  // Three-sixes penalty: pass turn immediately
  if (next.consecutiveSixes >= 3) {
    next.consecutiveSixes = 0;
    next.diceValue = null;
    next.diceRolled = false;
    next.mustRoll = true;
    next.movableTokens = [];
    return advanceTurn(next);
  }

  next.movableTokens = computeMovableTokens(next);

  // No movable tokens → auto-pass
  if (next.movableTokens.length === 0) {
    if (diceValue === 6) {
      // Rolled 6 but all tokens either in base with nowhere to go or at risk of overshoot
      // Normally dice=6 always unlocks from base, so this only happens if ALL 4 are already home
      return advanceTurn(next);
    }
    return advanceTurn(next);
  }

  return next;
}

/**
 * Apply MOVE_TOKEN action.
 * tokenId: 0-3 within the current player.
 */
export function applyMove(state, tokenId) {
  const next = clone(state);
  const pidx = next.currentPlayerIndex;
  const player = next.players[pidx];
  const token = player.tokens[tokenId];
  const die = next.diceValue;

  let bonus = false;

  // ── Token leaves base ──────────────────────────────────────────────────────
  if (token.relPos === 0 && die === 6) {
    token.relPos = 1;
    bonus = true; // rolled a 6 → bonus turn
  } else {
    // ── Token moves forward ──────────────────────────────────────────────────
    const newPos = token.relPos + die;
    token.relPos = newPos;

    if (newPos === MAX_RELATIVE) {
      // Token reaches home!
      token.isHome = true;
      bonus = true; // entering home → bonus turn

      // Record rank if player finished
      if (playerFinished(player)) {
        if (!next.winnersOrder.includes(pidx)) {
          next.winnersOrder.push(pidx);
          player.rank = next.winnersOrder.length;
        }
      }
    } else if (newPos <= 48) {
      // On the main path – check for kills
      const absIdx = getAbsIndex(pidx, newPos);
      const killed = checkKills(next, pidx, absIdx);
      if (killed) bonus = true;
    }

    // Rolled a 6 on an existing token → bonus turn
    if (die === 6) bonus = true;
  }

  // ── Reset dice state ───────────────────────────────────────────────────────
  next.diceRolled = false;
  next.movableTokens = [];

  // ── Check win condition ────────────────────────────────────────────────────
  const activePlayers = next.players.filter(p => p.isActive);
  const allDone = activePlayers.every(p => playerFinished(p));
  if (allDone) {
    next.phase = PHASES.FINISHED;
    return next;
  }

  if (bonus && next.consecutiveSixes < 3) {
    // Same player rolls again
    next.mustRoll = true;
    return next;
  }

  return advanceTurn(next);
}

/**
 * Check whether the moving player's token kills any opponent token on absIdx.
 * Mutates `next` in place (tokens sent back to base).
 * Returns true if at least one kill occurred.
 */
function checkKills(next, movingPlayerIdx, absIdx) {
  // Safe zone check for the MOVING token itself
  if (isSafeZone(movingPlayerIdx, getRelPosFromAbs(movingPlayerIdx, absIdx))) return false;

  let killed = false;
  next.players.forEach((opponent, opIdx) => {
    if (opIdx === movingPlayerIdx) return;
    opponent.tokens.forEach(tok => {
      if (tok.relPos < 1 || tok.relPos > 48) return; // not on main path
      const opAbsIdx = getAbsIndex(opIdx, tok.relPos);
      if (opAbsIdx !== absIdx) return;
      // Check if opponent's tile is safe
      if (isSafeZone(opIdx, tok.relPos)) return;
      // Kill!
      tok.relPos = 0;
      killed = true;
    });
  });
  return killed;
}

/** Reverse mapping: absolute index → relative position for player */
function getRelPosFromAbs(playerIndex, absIdx) {
  const startAbs = playerIndex * TILES_PER_SIDE;
  const diff = (absIdx - startAbs + 48) % 48;
  return diff + 1;
}

/**
 * Advance turn to the next active, non-finished player.
 */
function advanceTurn(state) {
  const next = clone(state);
  const numPlayers = next.players.length;
  let idx = (next.currentPlayerIndex + 1) % numPlayers;
  let loops = 0;
  while (loops < numPlayers) {
    const p = next.players[idx];
    if (p.isActive && !playerFinished(p)) break;
    idx = (idx + 1) % numPlayers;
    loops++;
  }
  next.currentPlayerIndex = idx;
  next.diceValue = null;
  next.diceRolled = false;
  next.mustRoll = true;
  next.bonusTurn = false;
  return next;
}
