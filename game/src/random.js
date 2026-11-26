// Sky Courier — Valley Run: deterministic randomness.
// One job: a tiny seeded generator so every run of a mission builds the
// same valley, the same rings and the same clouds.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise from a seeded table, for terrain and gusts.
export function makeNoise1D(seed, size) {
  const rand = mulberry32(seed);
  const table = new Float32Array(size);
  for (let i = 0; i < size; i += 1) table[i] = rand() * 2 - 1;
  function at(x) {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[((i % size) + size) % size];
    const b = table[(((i + 1) % size) + size) % size];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  }
  return at;
}
