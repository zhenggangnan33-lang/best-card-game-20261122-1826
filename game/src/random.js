// Ember Tide — a small seeded random source (sfc32) so a staged game, a
// screenshot and a replay all agree. Every shuffle and every AI coin-flip
// draws from here, never from Math.random.
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  let b = (a ^ 0x85ebca6b) >>> 0;
  let c = (b ^ 0xc2b2ae35) >>> 0;
  let d = (c ^ 0x27d4eb2f) >>> 0;
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle of `array` in place, using the seeded source. */
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/** An integer in [0, n) from the seeded source. */
export function pickInt(rng, n) {
  return Math.floor(rng() * n);
}
