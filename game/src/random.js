// Ember Veil — deterministic random numbers.
// One job: a tiny seeded generator so every run of a level plays the same.
// mulberry32: small, fast, and stable across browsers.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a generator.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one item from a list with a generator.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
