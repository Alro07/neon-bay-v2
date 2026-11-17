// util.js — small shared helpers for Neon Bay: a deterministic RNG, angle
// math, clamping and distance helpers used by every system. Nothing here
// touches the scene; it is pure arithmetic so the other modules stay thin.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Shortest signed turn from angle `from` toward angle `to` (-PI..PI).
export function angleDiff(to, from) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Turn `heading` toward `target` by at most `rate * dt` radians.
export function turnToward(heading, target, rate, dt) {
  const d = angleDiff(target, heading);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  return heading + step;
}

export function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

// Pick one entry of `list` with the seeded rng.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Format cash like $1,250.
export function money(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

// Minutes since midnight -> "18:24".
export function clockText(minutes) {
  const total = Math.floor(minutes) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return hh + ':' + mm;
}
