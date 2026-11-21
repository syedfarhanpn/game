'use strict';
// ---------------------------------------------------------------------------
// Global configuration + small math helpers shared by every module
// ---------------------------------------------------------------------------
const CFG = {
  BLOCK: 64,        // distance between road centre lines (m)
  ROAD: 16,         // road width
  N: 12,            // blocks per side
  SIDEWALK: 3.5,
  LANES: [2.2, 5.6],// lane offsets from road centre line
  BEACH_W: 70,
};
CFG.HALF = CFG.BLOCK * CFG.N / 2;
CFG.road = i => -CFG.HALF + i * CFG.BLOCK;
CFG.LAND = { minX: -CFG.HALF - 22, maxX: CFG.HALF + CFG.BEACH_W, minZ: -CFG.HALF - 22, maxZ: CFG.HALF + 22 };
CFG.PIER = { z: CFG.road(8), w: 14, x0: CFG.HALF + 40, x1: CFG.HALF + 210, y: 1.1 };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = (a = 0, b = 1) => a + (b - a) * Math.random();
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
// constant-time and safe for huge / non-finite input (a loop here could hang the page)
const wrapAngle = a => { if (!isFinite(a)) return 0; const T = 2 * Math.PI; a = ((a + Math.PI) % T + T) % T - Math.PI; return a; };
const dampAngle = (a, b, l, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-l * dt));
const col = h => new THREE.Color(h).convertSRGBToLinear();
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const _matCache = {};
function stdMat(hex, opts = {}) {
  const key = hex + '|' + Object.entries(opts).join(',');
  if (!_matCache[key]) {
    const o = Object.assign({ color: col(hex), roughness: .75, metalness: 0 }, opts);
    if (typeof o.emissive === 'string') o.emissive = col(o.emissive);
    _matCache[key] = new THREE.MeshStandardMaterial(o);
  }
  return _matCache[key];
}
const _boxCache = {};
function boxGeo(w, h, d) {
  const k = w + ',' + h + ',' + d;
  return _boxCache[k] || (_boxCache[k] = new THREE.BoxGeometry(w, h, d));
}

// Named story locations (filled in properly once the world is built)
const LOC = {
  start: V3(CFG.HALF + 40, 0, CFG.road(8) - 20),
  hospital: V3(CFG.road(3) + 20, 0, CFG.road(9) + 9),
  garage: V3(CFG.road(9) + 30, 0, CFG.HALF + 3),
  club: V3(CFG.road(4) + 30, 0, CFG.road(1) + 3),
  bank: V3(CFG.road(6) + 2, 0, CFG.road(5) + 30),
  overlook: V3(CFG.HALF + 30, 0, CFG.road(2)),
  vortex: V3(CFG.road(5) + 6.2, 0, CFG.road(6) + 30),
  boat: V3(CFG.PIER.x1 - 15, CFG.PIER.y, CFG.PIER.z),
};
