/**
 * cryptoDice.js
 * Fair dice roll using Web Crypto API (window.crypto.getRandomValues).
 * Returns an integer in [1, 6] with 100% uniform distribution.
 * Uses rejection sampling to eliminate modulo bias.
 */
export function rollDice() {
  const MAX_ACCEPTABLE = 252; // floor(256 / 6) * 6  → no modulo bias
  const buf = new Uint8Array(1);
  let val;
  do {
    window.crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= MAX_ACCEPTABLE);
  return (val % 6) + 1;
}

export default rollDice;
