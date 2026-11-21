'use strict';
// ---------------------------------------------------------------------------
// World: Fort Kochi & Mattancherry, Kerala — built from real OpenStreetMap data
// (road network, building footprints, coastline, beaches, parks, landmarks and
// shop names), plus sky, sea, day/night cycle and collision.
// Map data © OpenStreetMap contributors, ODbL (see models/map/).
// ---------------------------------------------------------------------------
class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  quad(a, b, c, d, n, ua, ub, uc, ud, color) {
    const V = [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]];
    for (const [v, uv] of V) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); this.c.push(color.r, color.g, color.b); }
  }
  // o: {sx, sy, u0, top, topWorld, sides, bottom}
  box(x0, y0, z0, x1, y1, z1, color, o = {}) {
    const sx = o.sx || 32, sy = o.sy || 28.8, u0 = o.u0 || 0, dx = x1 - x0, dz = z1 - z0;
    const v0 = y0 / sy, v1 = y1 / sy;
    if (o.sides !== false) {
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [u0, v0], [u0 + dz / sx, v0], [u0 + dz / sx, v1], [u0, v1], color);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [u0, v0], [u0 + dz / sx, v0], [u0 + dz / sx, v1], [u0, v1], color);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [u0, v0], [u0 + dx / sx, v0], [u0 + dx / sx, v1], [u0, v1], color);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [u0, v0], [u0 + dx / sx, v0], [u0 + dx / sx, v1], [u0, v1], color);
    }
    if (o.top !== false) {
      if (o.topWorld) { const s = o.topWorld; this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / s, z1 / s], [x1 / s, z1 / s], [x1 / s, z0 / s], [x0 / s, z0 / s], color); }
      else { const t = o.topUV || [0.01, 0.01]; this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], t, t, t, t, color); }
    }
  }
  // sloping (gable) roof with an overhang; ridge along the longer side; end triangles in wall colour
  gable(x0, z0, x1, z1, y, rh, color, endColor) {
    const ov = .45; x0 -= ov; z0 -= ov; x1 += ov; z1 += ov; const t = [0, 0], top = y + rh, ec = endColor || color;
    const N = (a, b, c) => { const l = Math.hypot(a, b, c); return [a / l, b / l, c / l]; };
    if (x1 - x0 >= z1 - z0) {
      const zm = (z0 + z1) / 2;
      this.quad([x1, y, z0], [x0, y, z0], [x0, top, zm], [x1, top, zm], N(0, zm - z0, -rh), t, t, t, t, color);
      this.quad([x0, y, z1], [x1, y, z1], [x1, top, zm], [x0, top, zm], N(0, z1 - zm, rh), t, t, t, t, color);
      this.quad([x0 + ov, y, z0 + ov], [x0 + ov, y, z1 - ov], [x0 + ov, top, zm], [x0 + ov, top, zm], [-1, 0, 0], t, t, t, t, ec);
      this.quad([x1 - ov, y, z1 - ov], [x1 - ov, y, z0 + ov], [x1 - ov, top, zm], [x1 - ov, top, zm], [1, 0, 0], t, t, t, t, ec);
    } else {
      const xm = (x0 + x1) / 2;
      this.quad([x0, y, z0], [x0, y, z1], [xm, top, z1], [xm, top, z0], N(-rh, xm - x0, 0), t, t, t, t, color);
      this.quad([x1, y, z1], [x1, y, z0], [xm, top, z0], [xm, top, z1], N(rh, x1 - xm, 0), t, t, t, t, color);
      this.quad([x1 - ov, y, z0 + ov], [x0 + ov, y, z0 + ov], [xm, top, z0 + ov], [xm, top, z0 + ov], [0, 0, -1], t, t, t, t, ec);
      this.quad([x0 + ov, y, z1 - ov], [x1 - ov, y, z1 - ov], [xm, top, z1 - ov], [xm, top, z1 - ov], [0, 0, 1], t, t, t, t, ec);
    }
  }
  flat(x0, z0, x1, z1, y, color) { const t = [0, 0]; this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], t, t, t, t, color); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
}
GeoBuilder.prototype.tri = function (a, b, c, n, color, ua = [0, 0], ub = [0, 0], uc = [0, 0]) {
  for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); this.c.push(color.r, color.g, color.b); }
};
// convex face from a list of points (fan); normal from the first corner, turned to face up when asked
GeoBuilder.prototype.face = function (pts, color, wantUp) {
  const [a, b, c] = pts, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
  if (wantUp && ny < 0) { pts = pts.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; }
  for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], [nx, ny, nz], color);
};
function mergeGeometries(list) {
  const pos = [], nor = [], uv = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0);
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return m;
}

function canvasTex(w, h, draw, srgb = true, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const NEON_COLORS = ['#ff3d9a', '#39e6ff', '#ff8c2b', '#4dff88', '#b26bff', '#ffe14d', '#ff3344'];
const NEON_WORDS = ['ചായക്കട', 'TEA STALL', 'BAKERY', 'ബേക്കറി', 'MEDICALS', 'TEXTILES', 'MOBILE SHOP', 'HOTEL', 'ഹോട്ടൽ', 'SPICES', 'STORES', 'FANCY STORE', 'JEWELLERY', 'TAILORS', 'JUICE CORNER', 'BOOK STALL', 'PHARMACY', 'HARDWARES', 'FISH STALL', 'COOL BAR'];
const HOTEL_NAMES = ['HERITAGE HOMESTAY', 'SEA BREEZE RESIDENCY', 'SPICE COAST INN', 'KAYAL RESORT', 'BASTION HOMESTAY', 'TOURIST HOME', 'FORT VIEW LODGE', 'COCHIN HERITAGE', 'MALABAR INN', 'BEACH HOMESTAY', 'PEPPER HOUSE INN', 'VASCO RESIDENCY'];
const PASTELS = ['#f4efe4', '#f2d16b', '#e8b04a', '#9fd0e8', '#b8dcb0', '#f0c9a0', '#ffffff', '#d9e8c4', '#e7a17a', '#cfe3f5'];   // whitewash, ochre, Kerala blue, mint, terracotta
const ROOF_TILES = ['#9a3f24', '#a8482a', '#8c3a22', '#b0532e', '#7f3420'];
const BOARD_STYLES = [['#c0392b', '#ffffff'], ['#f1c40f', '#1a1a1a'], ['#1f4e8c', '#ffffff'], ['#1e7a46', '#ffffff'], ['#ffffff', '#b0201a'], ['#5b2c83', '#ffe066']];
const WALLS = ['#f4efe4', '#f6f1e6', '#ffffff', '#f2d16b', '#e8c46a', '#9fd0e8', '#b8dcb0', '#f0c9a0', '#e7a17a', '#cfe3f5', '#d9e8c4', '#e9dfcf', '#d8d4cc', '#c9c3b5', '#f4efe4', '#ffffff'];
const FLAT_ROOFS = ['#b9b2a6', '#a8a196', '#cbc4b7', '#8f8a80', '#d6d0c4'];
const ROAD_SPEED = { trunk: 16, trunk_link: 11, primary: 15, primary_link: 11, secondary: 13.5, secondary_link: 10, tertiary: 12, tertiary_link: 9, unclassified: 9.5, residential: 8.5, living_street: 5.5, service: 6, road: 8 };
const polyArea = P => { let a = 0; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) a += P[j] * P[i + 1] - P[i] * P[j + 1]; return Math.abs(a / 2); };

// ---------------- map data (loaded once at boot) ----------------
let KOCHI_MAP = null;
async function loadKochiMap() {
  const img = new Image(); img.src = 'models/map/kochi_ground.png';
  const [data, kerala] = await Promise.all([fetch('models/map/kochi.json').then(r => r.json()), fetch('models/map/kerala.json').then(r => r.json()), img.decode()]);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data, grid = new Uint8Array(c.width * c.height);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.min(4, Math.round(px[i * 4] / 60));   // 0 water, 1 ground, 2 sand, 3 grass, 4 paved
  KOCHI_MAP = { data, kerala, grid, gw: c.width, gh: c.height };
}

class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(1337);
    this.colliders = []; this.cells = new Map(); this.cellSize = 16; this.stamp = 0;
    this.time = 8.0; this.timeScale = .5;   // game hours per real minute
    this.night = 0; this.elapsed = 0;
    this.neon = []; this.blocks = []; this.boards = []; this.chunks = new Map(); this.chunkT = 0;
    this.sunDir = V3(1, .3, .3).normalize();
    const M = this.M = KOCHI_MAP, m = this.meta = M.data.meta;
    this.bounds = { minX: m.minX + 3, maxX: m.maxX - 3, minZ: m.minZ + 3, maxZ: m.maxZ - 3 };
    this.buildTextures();
    this.buildRoadGraph();
    this.placeStoryLocations();
    this.buildGround();
    this.buildRoads();
    this.buildBuildings();
    this.buildWalls();
    this.buildGarage();
    this.buildFishingNets();
    this.buildTeaStalls();
    this.buildSignboards();
    this.buildProps();
    this.buildSky();
    this.buildWater();
    this.buildLights();
    this.buildMapCanvas();
  }

  // ======================= textures =======================
  buildTextures() {
    const R = this.rng;
    // concrete facade with windows: 8x8 cells
    const winDraw = (lit) => (g, w, h) => {
      const cs = w / 8;
      g.fillStyle = lit ? '#000' : '#ffffff'; g.fillRect(0, 0, w, h);
      if (!lit) { for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${R() * .05})`; g.fillRect(R() * w, R() * h, 2, 2); } }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const X = x * cs, Y = y * cs;
        if (lit) {
          if (R() < .42) { const c = pick(['#ffd28a', '#ffe9b8', '#fff4dc', '#cfe6ff', '#ffc070']); g.fillStyle = c; g.globalAlpha = .5 + R() * .5; g.fillRect(X + 12, Y + 14, cs - 24, cs - 28); g.globalAlpha = 1; }
        } else {
          const gr = g.createLinearGradient(X, Y + 14, X + cs, Y + cs - 14); gr.addColorStop(0, '#5a6d82'); gr.addColorStop(.5, '#2b3644'); gr.addColorStop(1, '#46566a');
          g.fillStyle = '#8c8c8c'; g.fillRect(X + 10, Y + 12, cs - 20, cs - 24);
          g.fillStyle = gr; g.fillRect(X + 12, Y + 14, cs - 24, cs - 28);
          g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(X + 12, Y + 14, (cs - 24) / 2, 3);
          g.fillStyle = '#9a9a9a'; g.fillRect(X + cs / 2 - 1, Y + 14, 2, cs - 28);
        }
      }
    };
    this.texWin = canvasTex(512, 512, winDraw(false));
    this.texWinE = canvasTex(512, 512, winDraw(true));
    // glass curtain wall
    const glassDraw = (lit) => (g, w, h) => {
      const cs = w / 8;
      if (!lit) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#9ec3dc'); gr.addColorStop(.5, '#4e7391'); gr.addColorStop(1, '#86aac4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const X = x * cs, Y = y * cs;
        if (lit) { if (R() < .3) { g.fillStyle = pick(['#d9ecff', '#fff6e0', '#bfe0ff']); g.globalAlpha = .35 + R() * .5; g.fillRect(X + 3, Y + 6, cs - 6, cs - 12); g.globalAlpha = 1; } }
        else { g.fillStyle = `rgba(255,255,255,${R() * .12})`; g.fillRect(X + 3, Y + 6, cs - 6, cs - 12); }
      }
      if (!lit) { g.fillStyle = '#c9d3dc'; for (let i = 0; i <= 8; i++) { g.fillRect(i * cs - 2, 0, 4, h); g.fillRect(0, i * cs - 3, w, 6); } g.fillStyle = '#d0d6dc'; g.fillRect(0, 0, 8, 8); }
    };
    this.texGlass = canvasTex(512, 512, glassDraw(false));
    this.texGlassE = canvasTex(512, 512, glassDraw(true));
    this.texAsphalt = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5b5852'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 62 + R() * 46 | 0; g.fillStyle = `rgb(${v + 3},${v + 1},${v - 2})`; g.fillRect(R() * w, R() * h, 1.5, 1.5); }
      for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(20,20,20,.35)'; g.lineWidth = 1; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - .5) * 50; y += (R() - .5) * 50; g.lineTo(x, y); } g.stroke(); }
    });
    this.texAsphalt.repeat.set(160, 160);
    this.texWalk = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#b9b4aa'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { const v = 150 + R() * 60 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 10},.5)`; g.fillRect(R() * w, R() * h, 2, 2); }
      g.strokeStyle = 'rgba(80,75,70,.55)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    });
    this.texSand = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#e6d3a3'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12000; i++) { const v = R(); g.fillStyle = v < .5 ? 'rgba(190,160,110,.35)' : 'rgba(255,245,220,.4)'; g.fillRect(R() * w, R() * h, 1.5, 1.5); }
    });
    this.texGrass = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = R() < .5 ? 'rgba(40,90,30,.5)' : 'rgba(120,170,70,.4)'; g.fillRect(R() * w, R() * h, 1.5, 3); }
    });
    this.texPlank = canvasTex(256, 256, (g, w, h) => {
      for (let i = 0; i < 8; i++) { const v = 110 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v * .72 | 0},${v * .5 | 0})`; g.fillRect(0, i * 32, w, 30); g.fillStyle = '#3a2a1c'; g.fillRect(0, i * 32 + 30, w, 2); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = 'rgba(40,25,10,.15)'; g.fillRect(R() * w, R() * h, 6, 1); }
    });
    const mk = (map, emap, rough, metal) => new THREE.MeshStandardMaterial({ map, emissiveMap: emap, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, roughness: rough, metalness: metal });
    this.matConcrete = mk(this.texWin, this.texWinE, .85, 0);
    this.matGlass = mk(this.texGlass, this.texGlassE, .3, .15);
    this.matPlain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
    this.matWalk = new THREE.MeshStandardMaterial({ map: this.texWalk, vertexColors: true, roughness: .95, color: col('#a8a6a2') });
    this.matGrass = new THREE.MeshStandardMaterial({ map: this.texGrass, roughness: 1 });
  }

  // ======================= chunks (distance culling) =======================
  chunk(x, z) {
    const S = 250, cx = Math.floor(x / S), cz = Math.floor(z / S), k = cx + ',' + cz;
    let c = this.chunks.get(k);
    if (!c) { c = { x: (cx + .5) * S, z: (cz + .5) * S, near: new THREE.Group(), far: new THREE.Group(), geo: {} }; this.scene.add(c.near, c.far); this.chunks.set(k, c); }
    return c;
  }
  chunkGeo(x, z, key) { const c = this.chunk(x, z); return c.geo[key] || (c.geo[key] = new GeoBuilder()); }
  flushChunks() {
    const mats = { wall: this.matConcrete, roof: this.matPlain, tile: this.matTile };
    for (const c of this.chunks.values()) {
      for (const [k, b] of Object.entries(c.geo)) {
        if (!b.p.length) continue;
        const mesh = new THREE.Mesh(b.geometry(), mats[k] || this.matPlain); mesh.castShadow = true; mesh.receiveShadow = true;
        c.far.add(mesh);
      }
      c.geo = {};
    }
  }

  // ======================= road network =======================
  buildRoadGraph() {
    const D = this.M.data, T = D.meta.types;
    this.rnodes = D.nodes.map(([x, z]) => ({ x: x / 10, z: z / 10, edges: [] }));
    this.redges = D.edges.map((e, i) => {
      const p = new Float64Array(e.p.length); for (let k = 0; k < p.length; k++) p[k] = e.p[k] / 10;
      const cum = new Float64Array(p.length / 2);
      for (let k = 1; k < cum.length; k++) cum[k] = cum[k - 1] + Math.hypot(p[2 * k] - p[2 * k - 2], p[2 * k + 1] - p[2 * k - 1]);
      const type = T[e.t], E = { i, a: e.a, b: e.b, p, cum, len: cum[cum.length - 1], w: e.w, type, name: e.n >= 0 ? D.names[e.n] : '', oneway: e.o, car: !!e.c };
      E.laneOff = E.car && !E.oneway && E.w >= 5.5 ? E.w / 4 : 0;   // keep LEFT (India) on two-way roads
      E.speed = ROAD_SPEED[type] || 8;
      return E;
    });
    for (const E of this.redges) { if (E.len < .5) continue; this.rnodes[E.a].edges.push(E); if (E.b !== E.a) this.rnodes[E.b].edges.push(E); }
    this.rcs = 24; this.rgrid = new Map();
    for (const E of this.redges) {
      const hw = E.w / 2 + 1;
      for (let k = 0; k < E.p.length - 2; k += 2) {
        const x0 = Math.min(E.p[k], E.p[k + 2]) - hw, x1 = Math.max(E.p[k], E.p[k + 2]) + hw, z0 = Math.min(E.p[k + 1], E.p[k + 3]) - hw, z1 = Math.max(E.p[k + 1], E.p[k + 3]) + hw;
        for (let cx = Math.floor(x0 / this.rcs); cx <= Math.floor(x1 / this.rcs); cx++) for (let cz = Math.floor(z0 / this.rcs); cz <= Math.floor(z1 / this.rcs); cz++) {
          const key = cx + ',' + cz; let a = this.rgrid.get(key); if (!a) this.rgrid.set(key, a = []); a.push(E.i, k >> 1);
        }
      }
    }
    this.carEdges = this.redges.filter(E => E.car && E.len > 6);
  }
  // nearest road centre line: { E, seg, s (arc length from a), d, px, pz, tx, tz (unit a->b), lat (+ = left of a->b) }
  nearestRoad(x, z, carOnly = false, maxR = 24) {
    let best = null, bd = maxR * maxR;
    const cs = this.rcs, r = Math.ceil(maxR / cs), cx0 = Math.floor(x / cs), cz0 = Math.floor(z / cs);
    for (let cx = cx0 - r; cx <= cx0 + r; cx++) for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
      const a = this.rgrid.get(cx + ',' + cz); if (!a) continue;
      for (let i = 0; i < a.length; i += 2) {
        const E = this.redges[a[i]]; if (carOnly && !E.car) continue;
        const k = a[i + 1] * 2, ax = E.p[k], az = E.p[k + 1], dx = E.p[k + 2] - ax, dz = E.p[k + 3] - az, L2 = dx * dx + dz * dz || 1e-9;
        let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + dx * t, pz = az + dz * t, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (d2 < bd) { bd = d2; const L = Math.sqrt(L2); best = { E, seg: k >> 1, t, px, pz, tx: dx / L, tz: dz / L, d2 }; }
      }
    }
    if (best) {
      const E = best.E, k = best.seg; best.d = Math.sqrt(best.d2); best.s = E.cum[k] + best.t * (E.cum[k + 1] - E.cum[k]);
      best.lat = (x - best.px) * best.tz - (z - best.pz) * best.tx;
    }
    return best;
  }
  // point on an edge at arc length s (from node a) with the unit tangent a->b
  edgePoint(E, s) {
    const c = E.cum; s = s < 0 ? 0 : s > E.len ? E.len : s;
    let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const k = lo * 2, L = c[hi] - c[lo] || 1e-9, t = (s - c[lo]) / L, dx = E.p[k + 2] - E.p[k], dz = E.p[k + 3] - E.p[k + 1], l = Math.hypot(dx, dz) || 1e-9;
    return { x: E.p[k] + dx * t, z: E.p[k + 1] + dz * t, tx: dx / l, tz: dz / l };
  }
  projectOnEdge(E, x, z) {
    let bd = Infinity, bs = 0, blat = 0;
    for (let k = 0; k < E.p.length - 2; k += 2) {
      const ax = E.p[k], az = E.p[k + 1], dx = E.p[k + 2] - ax, dz = E.p[k + 3] - az, L2 = dx * dx + dz * dz || 1e-9;
      let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t, pz = az + dz * t, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < bd) { bd = d2; const L = Math.sqrt(L2); bs = E.cum[k >> 1] + t * L; blat = ((x - px) * dz - (z - pz) * dx) / L; }
    }
    return { s: bs, d: Math.sqrt(bd), lat: blat };
  }
  onRoad(x, z, margin = 0) { const r = this.nearestRoad(x, z, false, 10); return !!r && r.d < r.E.w / 2 + margin; }
  classAt(x, z) {
    const m = this.meta, M = this.M, i = clamp(Math.floor((x - m.minX) / m.res), 0, M.gw - 1), j = clamp(Math.floor((z - m.minZ) / m.res), 0, M.gh - 1);
    return M.grid[j * M.gw + i];
  }
  isLand(x, z) { return this.classAt(x, z) > 0 || this.onRoad(x, z, .6); }   // roads count as land (bridges over canals)
  edgesNear(x, z, R, carOnly) {
    const out = new Set(), cs = this.rcs, r = Math.ceil(R / cs), cx0 = Math.floor(x / cs), cz0 = Math.floor(z / cs);
    for (let cx = cx0 - r; cx <= cx0 + r; cx++) for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
      const a = this.rgrid.get(cx + ',' + cz); if (!a) continue;
      for (let i = 0; i < a.length; i += 2) { const E = this.redges[a[i]]; if ((!carOnly || E.car) && E.len > 6) out.add(E); }
    }
    return [...out];
  }
  // random lane position on a real road, minD..maxD from center (left-hand traffic)
  randomRoadPoint(center, minD, maxD) {
    const list = this.edgesNear(center.x, center.z, maxD, true).filter(E => E.w >= 4.5 && E.type !== 'service');
    for (let tries = 0; tries < 30 && list.length; tries++) {
      const E = pick(list), s = rand(Math.min(4, E.len / 3), Math.max(E.len - 4, E.len * 2 / 3));
      const dir = E.oneway ? E.oneway : (Math.random() < .5 ? 1 : -1);
      const q = this.edgePoint(E, s), tx = q.tx * dir, tz = q.tz * dir;
      const x = q.x + tz * E.laneOff, z = q.z - tx * E.laneOff;
      if (!this.inBounds(x, z)) continue;
      const d = Math.hypot(x - center.x, z - center.z); if (d < minD || d > maxD) continue;
      const st = dir > 0 ? s : E.len - s;
      return { pos: V3(x, 0, z), heading: Math.atan2(tx, tz), E, dir, s: st, ai: { e: E.i, dir, s: st } };
    }
    return null;
  }
  randomWalkEdge(center, minD, maxD) {
    const list = this.edgesNear(center.x, center.z, maxD, false);
    for (let tries = 0; tries < 20 && list.length; tries++) {
      const E = pick(list), s = rand(0, E.len), q = this.edgePoint(E, s), d = Math.hypot(q.x - center.x, q.z - center.z);
      if (d >= minD && d <= maxD && this.inBounds(q.x, q.z)) return { E, s };
    }
    return null;
  }

  // ======================= colliders =======================
  addCollider(x0, z0, x1, z1, h, tag, pts) {
    const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h, tag, pts: pts || null, _s: 0 };
    const idx = this.colliders.push(c) - 1, cs = this.cellSize;
    for (let cx = Math.floor(c.x0 / cs); cx <= Math.floor(c.x1 / cs); cx++)
      for (let cz = Math.floor(c.z0 / cs); cz <= Math.floor(c.z1 / cs); cz++) {
        const k = cx + ',' + cz; let a = this.cells.get(k); if (!a) this.cells.set(k, a = []); a.push(idx);
      }
    return c;
  }
  query(x, z, r, fn) {
    const cs = this.cellSize; this.stamp++;
    for (let cx = Math.floor((x - r) / cs); cx <= Math.floor((x + r) / cs); cx++)
      for (let cz = Math.floor((z - r) / cs); cz <= Math.floor((z + r) / cs); cz++) {
        const a = this.cells.get(cx + ',' + cz); if (!a) continue;
        for (const i of a) { const c = this.colliders[i]; if (c._s === this.stamp) continue; c._s = this.stamp; fn(c); }
      }
  }
  // pushes p (Vector3, uses x/z) out of buildings (real footprints) and props; returns last hit normal or null
  resolveCircle(p, r) {
    let hit = null;
    this.query(p.x, p.z, r, c => {
      if (p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r) return;
      let nx, nz, push;
      if (c.pts) {
        const P = c.pts, n = P.length; let inside = false, bd = Infinity, bx = 0, bz = 0;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
          const xi = P[i], zi = P[i + 1], xj = P[j], zj = P[j + 1];
          if ((zi > p.z) !== (zj > p.z) && p.x < (xj - xi) * (p.z - zi) / (zj - zi) + xi) inside = !inside;
          const dx = xi - xj, dz = zi - zj, L2 = dx * dx + dz * dz || 1e-9; let t = ((p.x - xj) * dx + (p.z - zj) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = xj + dx * t, qz = zj + dz * t, d2 = (p.x - qx) * (p.x - qx) + (p.z - qz) * (p.z - qz);
          if (d2 < bd) { bd = d2; bx = qx; bz = qz; }
        }
        const d = Math.sqrt(bd);
        if ((!inside && d >= r) || d < 1e-7) return;
        if (inside) { nx = (bx - p.x) / d; nz = (bz - p.z) / d; push = d + r; } else { nx = (p.x - bx) / d; nz = (p.z - bz) / d; push = r - d; }
      } else {
        const qx = clamp(p.x, c.x0, c.x1), qz = clamp(p.z, c.z0, c.z1);
        const dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) return;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; push = r - d; }
        else {
          const l = p.x - c.x0, rr = c.x1 - p.x, b = p.z - c.z0, t = c.z1 - p.z, m = Math.min(l, rr, b, t);
          if (m === l) { nx = -1; nz = 0; } else if (m === rr) { nx = 1; nz = 0; } else if (m === b) { nx = 0; nz = -1; } else { nx = 0; nz = 1; }
          push = m + r;
        }
      }
      p.x += nx * push; p.z += nz * push;
      hit = { nx, nz, depth: push };
    });
    return hit;
  }
  pointInBuilding(x, y, z) {
    let inside = false;
    this.query(x, z, 0, c => {
      if (inside || y >= c.h || x <= c.x0 || x >= c.x1 || z <= c.z0 || z >= c.z1) return;
      if (!c.pts) { inside = true; return; }
      const P = c.pts; let ins = false;
      for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const zi = P[i + 1], zj = P[j + 1]; if ((zi > z) !== (zj > z) && x < (P[j] - P[i]) * (z - zi) / (zj - zi) + P[i]) ins = !ins; }
      if (ins) inside = true;
    });
    return inside;
  }
  // off the carriageway (footpath, yard, beach) -> truthy; on a road -> null
  blockAt(x, z) {
    if (!this.classAt(x, z)) return null;
    const r = this.nearestRoad(x, z, false, 12);
    if (r && r.d < r.E.w / 2 + 1.5) return null;
    return { offroad: true };
  }
  inBounds(x, z) {
    const B = this.bounds; if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) return false;
    return this.isLand(x, z);
  }
  groundHeight() { return 0; }
  zoneHit(x, z) { return this.clearZones.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1); }

  // ======================= story locations on the real map =======================
  findPOI(re, kinds) { return this.M.data.poi.find(p => re.test(p.n) && (!kinds || kinds.includes(p.k))); }
  // landmark site beside a road: entrance on the roadside, facing the road
  siteFor(px, pz, back = 1.8) {
    const r = this.nearestRoad(px, pz, true, 90) || this.nearestRoad(px, pz, false, 150);
    if (!r) return { x: px, z: pz, ex: px, ez: pz, nx: 0, nz: 1, rot: 0 };
    let sx = px - r.px, sz = pz - r.pz; const L = Math.hypot(sx, sz);
    if (L < .5) { sx = r.tz; sz = -r.tx; } else { sx /= L; sz /= L; }
    const off = r.E.w / 2 + back;
    return { x: px, z: pz, ex: r.px + sx * off, ez: r.pz + sz * off, nx: sx, nz: sz, rot: Math.atan2(-sx, -sz), E: r.E };
  }
  placeStoryLocations() {
    // Varma Performance Works: the south side of Veli Road, south Fort Kochi
    const r = this.nearestRoad(-710, 815, true, 80), gz = r ? r.pz : 815, w = r ? r.E.w : 9;
    LOC.garage = V3(-710, 0, gz); this.garageRoadW = w;
    this.clearZones = [[-710 - 17, gz + w / 2 + .2, -710 + 31, gz + 26]];
    LOC.start = V3(-712, 0, gz + 5.5);
    // Chinese fishing nets along the north shore near Vasco da Gama Square
    this.netSpots = [];
    for (let x = -935; x <= -735; x += 33) {
      for (let z = this.meta.minZ + 2; z < this.meta.minZ + 600; z += 2) if (this.classAt(x, z) > 0) { this.netSpots.push({ x, z: z - 1.5, ang: Math.PI / 2 }); break; }
    }
    const mid = this.netSpots[this.netSpots.length >> 1];
    LOC.nets = mid ? V3(mid.x, 0, mid.z) : V3(-830, 0, -1000);
    // Fort Kochi Beach on the west coast
    const coastX = z => { for (let x = this.meta.minX; x < 0; x += 2) if (this.classAt(x, z) > 0) return x; return this.meta.minX + 100; };
    LOC.coast = V3(coastX(-450), 0, -450);
    // a heritage street for the intro
    let best = null;
    for (const E of this.redges) if (E.car && /Princess Street|KB Jacob Road|Bastian Street|Burgher Street|Rose Street/.test(E.name) && (!best || E.len > best.len)) best = E;
    if (best) { const a = this.edgePoint(best, best.len * .15), b = this.edgePoint(best, best.len * .85); LOC.street = { ax: a.x, az: a.z, bx: b.x, bz: b.z, name: best.name }; }
    else LOC.street = { ax: -900, az: -500, bx: -820, bz: -500, name: '' };
    const ps = this.findPOI(/Fort Kochi Police Station/i);
    LOC.police = ps ? this.siteFor(ps.x / 10, ps.z / 10) : this.siteFor(-1000, -700);
  }

  // ======================= ground =======================
  buildGround() {
    const M = this.M, m = this.meta, gw = M.gw, gh = M.gh, R = this.rng;
    const small = document.createElement('canvas'); small.width = gw; small.height = gh;
    const sg = small.getContext('2d'), id = sg.createImageData(gw, gh), d = id.data;
    const COLS = [[226, 208, 160], [139, 118, 92], [226, 208, 160], [92, 134, 64], [146, 143, 136]];   // water(edge colour), laterite soil, sand, grass, paved
    // open ground in Kerala towns is a patchwork of grass and red-brown soil: smooth value noise mixes the two
    const NW = Math.ceil(gw / 10) + 2, NH = Math.ceil(gh / 10) + 2, nz = new Float32Array(NW * NH); for (let i = 0; i < nz.length; i++) nz[i] = R();
    const noise = (i, j) => { const x = i / 10, y = j / 10, x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, a = nz[y0 * NW + x0], b = nz[y0 * NW + x0 + 1], c = nz[(y0 + 1) * NW + x0], e = nz[(y0 + 1) * NW + x0 + 1]; return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy; };
    const SOIL = [146, 112, 84], GRASS = [98, 128, 66];
    for (let i = 0; i < gw * gh; i++) {
      const c = M.grid[i], o = i * 4, v = .92 + R() * .16;
      let k = COLS[c];
      if (c === 1) { const t = smooth(.32, .68, noise(i % gw, (i / gw) | 0)); k = [lerp(SOIL[0], GRASS[0], t), lerp(SOIL[1], GRASS[1], t), lerp(SOIL[2], GRASS[2], t)]; }
      d[o] = k[0] * v; d[o + 1] = k[1] * v; d[o + 2] = k[2] * v; d[o + 3] = c ? 255 : 0;
    }
    sg.putImageData(id, 0, 0);
    const UP = 3, big = document.createElement('canvas'); big.width = gw * UP; big.height = gh * UP;
    const bg = big.getContext('2d'); bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high'; bg.drawImage(small, 0, 0, big.width, big.height);
    const tex = new THREE.CanvasTexture(big); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const detail = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16000; i++) { const v = 140 + R() * 100 | 0; g.fillStyle = `rgba(${v},${v},${v},.45)`; g.fillRect(R() * w, R() * h, 1 + R() * 2.5, 1 + R() * 2.5); } }, false, true);
    const ext = 1400, Wd = m.maxX - m.minX + ext * 2, Ht = m.maxZ - m.minZ + ext * 2;
    const geo = new THREE.PlaneGeometry(Wd, Ht, 8, 8); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv, uvd = new Float32Array(pos.count * 2);
    const cx = (m.minX + m.maxX) / 2, cz = (m.minZ + m.maxZ) / 2;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k) + cx, z = pos.getZ(k) + cz;
      uv.setXY(k, (x - m.minX) / (m.maxX - m.minX), 1 - (z - m.minZ) / (m.maxZ - m.minZ));
      uvd[k * 2] = x / 7; uvd[k * 2 + 1] = z / 7;
    }
    geo.setAttribute('uvd', new THREE.BufferAttribute(uvd, 2));
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, roughness: 1 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.detailMap = { value: detail };
      sh.vertexShader = 'attribute vec2 uvd;\nvarying vec2 vUvd;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vUvd = uvd;');
      sh.fragmentShader = 'uniform sampler2D detailMap;\nvarying vec2 vUvd;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= texture2D(detailMap, vUvd).rgb * 1.32;');
    };
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(cx, 0, cz); mesh.receiveShadow = true;
    this.scene.add(mesh); this.ground = mesh;
  }

  // ======================= roads =======================
  buildRoads() {
    const car = new GeoBuilder(), walk = new GeoBuilder(), mk = new GeoBuilder(), white = col('#e9e9e6'), C = new THREE.Color(1, 1, 1), up = [0, 1, 0], UVS = 6;
    const uvOf = v => [v[0] / UVS, v[2] / UVS];
    const strip = (G, P, hw, y) => {   // mitred ribbon along a polyline, world-space UVs so overlaps match
      const n = P.length / 2, L = [], Rr = [];
      for (let i = 0; i < n; i++) {
        let nx = 0, nz = 0, pdx = 0, pdz = 0;
        if (i > 0) { const dx = P[2 * i] - P[2 * i - 2], dz = P[2 * i + 1] - P[2 * i - 1], l = Math.hypot(dx, dz) || 1; nx += dz / l; nz += -dx / l; pdx = dx / l; pdz = dz / l; }
        if (i < n - 1) { const dx = P[2 * i + 2] - P[2 * i], dz = P[2 * i + 3] - P[2 * i + 1], l = Math.hypot(dx, dz) || 1; nx += dz / l; nz += -dx / l; if (!i) { pdx = dx / l; pdz = dz / l; } }
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
        const sc = 1 / Math.max(.45, nx * pdz - nz * pdx);
        L.push([P[2 * i] + nx * hw * sc, y, P[2 * i + 1] + nz * hw * sc]); Rr.push([P[2 * i] - nx * hw * sc, y, P[2 * i + 1] - nz * hw * sc]);
      }
      for (let i = 0; i < n - 1; i++) { const a = Rr[i], b = Rr[i + 1], c = L[i + 1], d = L[i]; G.quad(a, b, c, d, up, uvOf(a), uvOf(b), uvOf(c), uvOf(d), C); }   // counter-clockwise from above
    };
    const disc = (G, x, z, r, y) => {
      const N = 14;
      for (let k = 0; k < N; k++) { const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, p0 = [x, y, z], p1 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], p2 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r]; G.tri(p0, p2, p1, up, C, uvOf(p0), uvOf(p2), uvOf(p1)); }
    };
    for (const E of this.redges) {
      if (E.len < .3) continue;
      strip(E.car ? car : walk, E.p, E.w / 2, E.car ? .03 : .02);
      // broken white centre line on two-way roads 7 m and wider (India)
      if (E.car && !E.oneway && E.w >= 7 && E.len > 16) for (let s = 6; s < E.len - 7; s += 6) {
        const a = this.edgePoint(E, s), b = this.edgePoint(E, s + 3), nx = a.tz * .07, nz = -a.tx * .07, t = [0, 0];
        mk.quad([a.x - nx, .045, a.z - nz], [b.x - nx, .045, b.z - nz], [b.x + nx, .045, b.z + nz], [a.x + nx, .045, a.z + nz], up, t, t, t, t, white);
      }
    }
    for (const N of this.rnodes) {
      if (!N.edges.length) continue;
      const cars = N.edges.filter(E => E.car);
      if (cars.length) disc(car, N.x, N.z, Math.max(...cars.map(E => E.w)) / 2, .03);
      else disc(walk, N.x, N.z, Math.max(...N.edges.map(E => E.w)) / 2, .02);
    }
    this.texAsphalt.repeat.set(1, 1);
    this.matRoad = new THREE.MeshStandardMaterial({ map: this.texAsphalt, roughness: .92, color: new THREE.Color(1.55, 1.5, 1.42), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const mw = new THREE.MeshStandardMaterial({ map: this.texWalk, roughness: .95, color: col('#b4b0a8'), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.markMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, emissive: new THREE.Color(.9, .85, .7), emissiveIntensity: 0 });
    for (const [G, mat] of [[car, this.matRoad], [walk, mw], [mk, this.markMat]]) { const mesh = new THREE.Mesh(G.geometry(), mat); mesh.receiveShadow = true; this.scene.add(mesh); }
  }

  // ======================= buildings (real footprints) =======================
  buildBuildings() {
    const D = this.M.data, R = this.rng;
    const KIND_WALL = { 1: ['#f2d16b', '#e8c46a', '#f4efe4'], 2: ['#ffffff', '#e9f0f2'], 3: ['#ffffff', '#f6f3ea'], 4: ['#f3e3c0', '#f1d9a6'], 5: ['#e9f1e4', '#ffffff', '#d7eadb'] };
    this.matTile = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 });
    this.bldInfo = [];
    for (const b of D.bld) {
      const n = b.p.length / 2, P = new Float32Array(b.p.length); let cx = 0, cz = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let k = 0; k < b.p.length; k += 2) { const x = P[k] = b.p[k] / 10, z = P[k + 1] = b.p[k + 1] / 10; cx += x; cz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      cx /= n; cz /= n;
      let skip = this.zoneHit(cx, cz); for (let k = 0; k < P.length && !skip; k += 2) if (this.zoneHit(P[k], P[k + 1])) skip = true;
      if (skip) continue;
      const h = b.h, wc = col(pick(KIND_WALL[b.k] || WALLS)), u0 = (R() * 8 | 0) / 8, W = this.chunkGeo(cx, cz, 'wall');
      let per = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, xi = P[2 * i], zi = P[2 * i + 1], xj = P[2 * j], zj = P[2 * j + 1], dx = xj - xi, dz = zj - zi, L = Math.hypot(dx, dz);
        if (L < .05) continue;
        const nx = dz / L, nz = -dx / L, ua = u0 + per / 24, ub = u0 + (per + L) / 24, vt = h / 26.4;
        W.quad([xj, 0, zj], [xi, 0, zi], [xi, h, zi], [xj, h, zj], [nx, 0, nz], [ub, 0], [ua, 0], [ua, vt], [ub, vt], wc);
        per += L;
      }
      if (!(b.r && this.hipRoof(cx, cz, P, h, col(pick(ROOF_TILES))))) this.flatRoof(cx, cz, P, h, col(pick(FLAT_ROOFS)));
      this.addCollider(x0, z0, x1, z1, h, 'bld', P);
      this.bldInfo.push({ P, h, cx, cz });
    }
    this.flushChunks();
  }
  flatRoof(cx, cz, P, h, color) {
    const G = this.chunkGeo(cx, cz, 'roof'), contour = [];
    for (let k = 0; k < P.length; k += 2) contour.push(new THREE.Vector2(P[k], P[k + 1]));
    let faces; try { faces = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { return; }
    for (const [a, b, c] of faces) {
      const A = [P[2 * a], h, P[2 * a + 1]], B = [P[2 * b], h, P[2 * b + 1]], Cc = [P[2 * c], h, P[2 * c + 1]];
      const cr = (B[0] - A[0]) * (Cc[2] - A[2]) - (B[2] - A[2]) * (Cc[0] - A[0]);
      if (cr > 0) G.tri(A, Cc, B, [0, 1, 0], color); else G.tri(A, B, Cc, [0, 1, 0], color);
    }
  }
  // Kerala hip roof of clay tiles over the footprint's oriented rectangle (only for near-rectangular houses)
  hipRoof(cx, cz, P, h, color) {
    const n = P.length / 2; let bl = 0, ux = 1, uz = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = P[2 * j] - P[2 * i], dz = P[2 * j + 1] - P[2 * i + 1], L = Math.hypot(dx, dz); if (L > bl) { bl = L; ux = dx / L; uz = dz / L; } }
    const vx = -uz, vz = ux; let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (let k = 0; k < P.length; k += 2) { const u = P[k] * ux + P[k + 1] * uz, v = P[k] * vx + P[k + 1] * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    if (polyArea(P) / ((u1 - u0) * (v1 - v0)) < .72 || u1 - u0 > 40 || v1 - v0 > 40) return false;
    const ov = .45; u0 -= ov; u1 += ov; v0 -= ov; v1 += ov;
    const lu = u1 - u0, lv = v1 - v0, rh = Math.min(3, Math.min(lu, lv) * .42), top = h + rh, G = this.chunkGeo(cx, cz, 'tile');
    const Wp = (u, v, y) => [u * ux + v * vx, y, u * uz + v * vz];
    if (lu >= lv) {
      const vm = (v0 + v1) / 2, r0 = u0 + lv / 2, r1 = u1 - lv / 2;
      G.face([Wp(u0, v0, h), Wp(u1, v0, h), Wp(r1, vm, top), Wp(r0, vm, top)], color, true);
      G.face([Wp(u1, v1, h), Wp(u0, v1, h), Wp(r0, vm, top), Wp(r1, vm, top)], color, true);
      G.face([Wp(u0, v1, h), Wp(u0, v0, h), Wp(r0, vm, top)], color, true);
      G.face([Wp(u1, v0, h), Wp(u1, v1, h), Wp(r1, vm, top)], color, true);
    } else {
      const um = (u0 + u1) / 2, r0 = v0 + lu / 2, r1 = v1 - lu / 2;
      G.face([Wp(u0, v1, h), Wp(u0, v0, h), Wp(um, r0, top), Wp(um, r1, top)], color, true);
      G.face([Wp(u1, v0, h), Wp(u1, v1, h), Wp(um, r1, top), Wp(um, r0, top)], color, true);
      G.face([Wp(u0, v0, h), Wp(u1, v0, h), Wp(um, r0, top)], color, true);
      G.face([Wp(u1, v1, h), Wp(u0, v1, h), Wp(um, r1, top)], color, true);
    }
    return true;
  }

  // ======================= compound walls along local streets (typical Kerala lanes) =======================
  nearBuilding(x, z, r) { let f = false; this.query(x, z, r, c => { if (!f && c.tag === 'bld' && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) f = true; }); return f; }
  buildWalls() {
    const R = this.rng, cols = [col('#ece7db'), col('#ddd6c6'), col('#cfc6b3'), col('#f2ede2'), col('#e3d9c0')], H = 1.55, T = .22;
    const cap = col('#b8b0a0');
    const okPt = (x, z) => this.classAt(x, z) > 0 && !this.pointInBuilding(x, 1, z) && !this.zoneHit(x, z) && !this.onRoad(x, z, .4);
    for (const E of this.redges) {
      if (!E.car || E.w > 9.5 || E.len < 12 || E.type === 'service') continue;
      for (const sd of [1, -1]) {
        if (R() < .12) continue;
        const off = E.w / 2 + 1.05, c = pick(cols);
        for (let k = 0; k < E.p.length - 2; k += 2) {
          const s0 = E.cum[k >> 1], s1 = E.cum[(k >> 1) + 1], L = s1 - s0; if (L < 3) continue;
          const t0 = Math.max(0, (5 - s0) / L), t1 = Math.min(1, (E.len - 5 - s0) / L); if (t1 - t0 < .15) continue;   // openings at junctions
          const ax = E.p[k], az = E.p[k + 1], dx = (E.p[k + 2] - ax) / L, dz = (E.p[k + 3] - az) / L, nx = dz * sd, nz = -dx * sd;
          // a gate now and then
          const segs = R() < .35 && (t1 - t0) * L > 10 ? [[t0, (t0 + t1) / 2 - 1.6 / L], [(t0 + t1) / 2 + 1.6 / L, t1]] : [[t0, t1]];
          for (const [u0, u1] of segs) {
            const x0 = ax + dx * L * u0 + nx * off, z0 = az + dz * L * u0 + nz * off, x1 = ax + dx * L * u1 + nx * off, z1 = az + dz * L * u1 + nz * off;
            const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
            if (!okPt(x0, z0) || !okPt(x1, z1) || !okPt(mx, mz) || !this.nearBuilding(mx + nx * 6, mz + nz * 6, 14)) continue;
            const ix = nx * T / 2, iz = nz * T / 2, A = [x0 - ix, 0, z0 - iz], B = [x1 - ix, 0, z1 - iz], Cq = [x1 + ix, 0, z1 + iz], D = [x0 + ix, 0, z0 + iz];
            const up = v => [v[0], H, v[2]], G = this.chunkGeo(mx, mz, 'roof');
            G.face([A, B, up(B), up(A)], c); G.face([Cq, D, up(D), up(Cq)], c); G.face([up(A), up(B), up(Cq), up(D)], cap, true);
            G.face([D, A, up(A), up(D)], c); G.face([B, Cq, up(Cq), up(B)], c);
            const P = new Float32Array([A[0], A[2], B[0], B[2], Cq[0], Cq[2], D[0], D[2]]);
            if (polyArea(P) > 1e-3) { let a = 0; for (let i = 0, j = 6; i < 8; j = i, i += 2) a += P[j] * P[i + 1] - P[i] * P[j + 1]; const Q = a < 0 ? new Float32Array([D[0], D[2], Cq[0], Cq[2], B[0], B[2], A[0], A[2]]) : P;
              this.addCollider(Math.min(x0, x1) - T, Math.min(z0, z1) - T, Math.max(x0, x1) + T, Math.max(z0, z1) + T, H, 'wall', Q); }
          }
        }
      }
    }
    this.flushChunks();
  }

  // ======================= Varma Performance Works =======================
  buildGarage() {
    const g = LOC.garage, w2 = this.garageRoadW / 2, gx0 = g.x - 11, gx1 = g.x + 11, gz0 = g.z + 10.5, gz1 = g.z + 22.5;
    const cg = new GeoBuilder();
    cg.box(gx0, 0, gz0, gx1, 9, gz1, col('#7a8088'), { sx: 4, sy: 3 });
    cg.box(gx0 - .2, 9, gz0 - .2, gx1 + .2, 9.6, gz1 + .2, col('#3a3e44'));
    const cm = new THREE.Mesh(cg.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .2 }));
    cm.castShadow = cm.receiveShadow = true; this.scene.add(cm);
    // office with a Kerala tile roof beside the workshop
    const of = new GeoBuilder();
    of.box(gx1, 0, gz0 + 2, gx1 + 7, 4.2, gz1, col('#f4efe4'), { sx: 24, sy: 26.4 });
    const om = new THREE.Mesh(of.geometry(), this.matConcrete); om.castShadow = om.receiveShadow = true; this.scene.add(om);
    const orf = new GeoBuilder(); orf.gable(gx1, gz0 + 2, gx1 + 7, gz1, 4.2, 2, col('#9a3f24'), col('#f4efe4'));
    const orm = new THREE.Mesh(orf.geometry(), this.matPlain); orm.castShadow = true; this.scene.add(orm);
    this.addCollider(gx0, gz0, gx1 + 7, gz1, 9, 'garage');
    // concrete forecourt from the road to the shutter, and parking bays
    const ap = new GeoBuilder(); ap.flat(g.x - 16, g.z + w2 - .3, g.x + 30, gz0 + .1, .04, new THREE.Color(1, 1, 1));
    const apm = new THREE.Mesh(ap.geometry(), new THREE.MeshStandardMaterial({ map: this.texWalk, color: col('#c9c5bc'), roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
    apm.receiveShadow = true; this.scene.add(apm);
    const pk = new GeoBuilder(), wc = col('#f2f2f2'), px0 = g.x + 14, pz0 = g.z + w2 + .4;
    for (let k = 0; k <= 4; k++) pk.flat(px0 + k * 3, pz0, px0 + k * 3 + .12, pz0 + 5.2, .06, wc);
    pk.flat(px0, pz0 + 5.1, px0 + 12.12, pz0 + 5.22, .06, wc);
    this.scene.add(new THREE.Mesh(pk.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 })));
    // shutter + signs
    const doorTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#9aa3ad'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { c.fillStyle = '#6b737c'; c.fillRect(0, y, w, 3); } }, true, false);
    this.garageDoor = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .5, metalness: .4 }));
    this.garageDoor.position.set(g.x, 3.25, gz0 - .05); this.garageDoor.rotation.y = Math.PI; this.scene.add(this.garageDoor);
    this.addBoard('VARMA PERFORMANCE WORKS', '#111111', '#e8b04a', g.x, 7.6, gz0 - .1, Math.PI, 14, 1.6);
    this.addBoard('വർമ്മ പെർഫോമൻസ് വർക്ക്സ്', '#b0201a', '#ffffff', g.x, 6.5, gz0 - .1, Math.PI, 9, .8);
    this.addBoard('OFFICE', '#1f4e8c', '#ffffff', gx1 + 3.5, 3.2, gz0 + 1.95, Math.PI, 2.6, .55, 256);
  }

  // Chinese fishing nets (cheena vala) on the real north shore of Fort Kochi
  buildFishingNets() {
    const netTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(40,30,20,.85)'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, true, true);
    const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: 1 });
    const wood = stdMat('#5a4128', { roughness: 1 }), stone = stdMat('#7d7d72');
    for (const s of this.netSpots) {
      const grp = new THREE.Group(); grp.position.set(s.x, 0, s.z); grp.rotation.y = s.ang;
      const pole = (x0, y0, z0, x1, y1, z1, r) => {
        const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz);
        const geo = new THREE.BoxGeometry(r, L, r); geo.translate(0, L / 2, 0);
        const m = new THREE.Mesh(geo, wood); m.position.set(x0, y0, z0); m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(dx / L, dy / L, dz / L)); m.castShadow = true; grp.add(m);
      };
      const gy = -.3, piv = [0, gy + 2.6, 0], tip = [13, gy + 7.5, 0];
      for (const [ox, oz] of [[-1, -1.2], [-1, 1.2], [1, -1.2], [1, 1.2]]) pole(ox, gy - 1, oz, piv[0], piv[1], piv[2], .22);
      pole(piv[0] - 6, piv[1] - 1.8, 0, tip[0], tip[1], tip[2], .3);
      for (const sd of [-1, 1]) { pole(tip[0], tip[1], tip[2], tip[0] + 2.5, tip[1] - 6.5, sd * 4.5, .08); pole(tip[0], tip[1], tip[2], tip[0] - 2.5, tip[1] - 6.5, sd * 4.5, .08); }
      for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.SphereGeometry(.35, 6, 5), stone); st.position.set(piv[0] - 6.3, piv[1] - 2.6 - k * .5, (k - 1.5) * .3); grp.add(st); }
      const net = new THREE.Mesh(new THREE.PlaneGeometry(9, 9, 6, 6), netMat);
      const pa = net.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const u = pa.getX(i), v = pa.getY(i); pa.setZ(i, -(1 - (u * u + v * v) / 41) * 1.6); }
      net.geometry.computeVertexNormals(); net.rotation.x = -Math.PI / 2; net.position.set(tip[0], tip[1] - 6.5, 0); grp.add(net);
      this.scene.add(grp);
      this.addCollider(s.x - 1.6, s.z - 1.6, s.x + 1.6, s.z + 1.6, 4, 'net');
    }
  }
  // tea stalls (chaya kada) at the garage, the beach, the bus stand and Jew Town
  buildTeaStalls() {
    const g = LOC.garage, w2 = this.garageRoadW / 2, spots = [[g.x - 26, g.z + w2 + 3, 0], [g.x + 33, g.z + w2 + 3, 0]];
    for (const re of [/Fort Kochi Bus Stand/i, /Jew Town|Paradesi Synagogue/i, /St Francis Church/i, /Santa Cruz/i, /Mattancherry Water Metro/i]) {
      const p = this.findPOI(re); if (!p) continue;
      const s = this.siteFor(p.x / 10, p.z / 10, 2.2); spots.push([s.ex, s.ez, Math.atan2(s.nx, s.nz)]);
    }
    { const r = this.nearestRoad(LOC.coast.x + 40, LOC.coast.z, true, 120); if (r) { const sx = -r.tz, sz = r.tx; spots.push([r.px + sx * (r.E.w / 2 + 2.2), r.pz + sz * (r.E.w / 2 + 2.2), Math.atan2(sx, sz)]); } }
    for (const [x, z, r] of spots) {
      if (this.pointInBuilding(x, 1, z)) continue;
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = r;
      const add = (w, h, d, hex, px, py, pz, ry = 0) => { const m = new THREE.Mesh(boxGeo(w, h, d), stdMat(hex, { roughness: .9 })); m.position.set(px, py, pz); m.rotation.y = ry; m.castShadow = true; grp.add(m); return m; };
      add(3.2, 1.1, 1.4, '#6b4a2b', 0, .55, 0); add(3.3, .06, 1.5, '#d8d4c8', 0, 1.13, 0);
      for (const sx of [-1.5, 1.5]) for (const sz of [-.65, .65]) add(.08, 2.5, .08, '#4a3a2a', sx, 1.25, sz);
      const roof = add(3.9, .05, 2.4, '#8f9aa3', 0, 2.55, .2); roof.rotation.x = -.12;
      for (let k = 0; k < 4; k++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .3, 8), new THREE.MeshStandardMaterial({ color: col('#cfe9f2'), transparent: true, opacity: .6, roughness: .1 })); j.position.set(-1.1 + k * .5, 1.31, -.3); grp.add(j); }
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .6, 12), stdMat('#c9c9c9', { metalness: .8, roughness: .3 })); urn.position.set(1.05, 1.46, -.2); grp.add(urn);
      add(2.4, .1, .45, '#6b4a2b', 0, .5, 1.6); for (const bx of [-1, 1]) add(.1, .5, .4, '#4a3a2a', bx, .25, 1.6);
      this.scene.add(grp);
      const board = this.addBoard('ചായ · TEA', '#c0392b', '#ffffff', 0, 0, 0, 0, 2, .5, 256); grp.add(board); board.position.set(0, 2.3, -.75); board.rotation.y = Math.PI;
      const c = Math.cos(r), s = Math.sin(r), hw = 1.9, hd = 1.2;
      this.addCollider(x - Math.abs(c * hw) - Math.abs(s * hd), z - Math.abs(s * hw) - Math.abs(c * hd), x + Math.abs(c * hw) + Math.abs(s * hd), z + Math.abs(s * hw) + Math.abs(c * hd), 2.6, 'stall');
    }
  }
  // the facade of the building nearest a point that faces a road -> signboard placement
  facadeFor(x, z) {
    let best = null, bd = 30;
    this.query(x, z, 22, c => { if (!c.pts || c.tag !== 'bld') return; const d = Math.hypot((c.x0 + c.x1) / 2 - x, (c.z0 + c.z1) / 2 - z); if (d < bd) { bd = d; best = c; } });
    if (!best) return null;
    const P = best.pts, n = P.length / 2; let out = null, pd = Infinity;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = P[2 * i], az = P[2 * i + 1], bx = P[2 * j], bz = P[2 * j + 1], L = Math.hypot(bx - ax, bz - az); if (L < 3) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, nx = (bz - az) / L, nz = -(bx - ax) / L;
      const r = this.nearestRoad(mx + nx * 2, mz + nz * 2, false, 14); if (!r) continue;
      if ((r.px - mx) * nx + (r.pz - mz) * nz <= 0) continue;
      if (r.d < pd) { pd = r.d; out = { x: mx + nx * .14, z: mz + nz * .14, rot: Math.atan2(nx, nz), w: Math.min(L * .8, 5.5), y: Math.min(3.3, best.h - .7) }; }
    }
    return out;
  }
  // real shop, restaurant and homestay names from OpenStreetMap on painted boards
  buildSignboards() {
    const D = this.M.data, R = this.rng;
    const KINDS = { shop: 1, restaurant: 1, cafe: 1, hotel: 1, guest_house: 1, hostel: 1, bank: 1, pharmacy: 1, fast_food: 1, museum: 1, marketplace: 1, bus_station: 1 };
    const pois = D.poi.filter(p => KINDS[p.k]);
    for (let i = pois.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [pois[i], pois[j]] = [pois[j], pois[i]]; }
    let n = 0;
    for (const p of pois) {
      if (n >= 170) break;
      const s = this.facadeFor(p.x / 10, p.z / 10); if (!s || s.y < 2) continue;
      const st = BOARD_STYLES[R() * BOARD_STYLES.length | 0], text = (p.ml && R() < .45 ? p.ml : p.n).slice(0, 34);
      const m = this.addBoard(text, st[0], st[1], s.x, s.y, s.z, s.rot, s.w, Math.min(1.05, s.w * .24), 256);
      this.chunk(s.x, s.z).near.add(m); n++;
    }
    // generic Malayalam / English shop boards along the busier roads
    for (let k = 0, made = 0; k < 2000 && made < 90; k++) {
      const E = pick(this.carEdges); if (E.w < 6) continue;
      const q = this.edgePoint(E, rand(0, E.len)), sd = Math.random() < .5 ? 1 : -1;
      const s = this.facadeFor(q.x + q.tz * sd * (E.w / 2 + 4), q.z - q.tx * sd * (E.w / 2 + 4)); if (!s || s.y < 2) continue;
      const st = pick(BOARD_STYLES), m = this.addBoard(pick(NEON_WORDS), st[0], st[1], s.x, s.y, s.z, s.rot, Math.min(s.w, 4.5), 1, 256);
      this.chunk(s.x, s.z).near.add(m); made++;
    }
    // landmarks
    { const r = this.nearestRoad(LOC.coast.x + 30, LOC.coast.z, true, 150); if (r) { const sx = -r.tz, sz = r.tx, x = r.px + sx * (r.E.w / 2 + 1.2), z = r.pz + sz * (r.E.w / 2 + 1.2);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 4.6, 6), stdMat('#9aa0a6', { metalness: .6 })); pole.position.set(x, 2.3, z); this.scene.add(pole);
      this.addBoard('FORT KOCHI BEACH · ഫോർട്ട് കൊച്ചി ബീച്ച്', '#1f4e8c', '#ffffff', x, 4.4, z, Math.atan2(-sx, -sz), 6, 1); } }
    const P = LOC.police; if (P) this.addBoard('FORT KOCHI POLICE STATION · ഫോർട്ട് കൊച്ചി പോലീസ് സ്റ്റേഷൻ', '#1f3f6b', '#ffffff', P.ex + P.nx * 1.2, 3.6, P.ez + P.nz * 1.2, P.rot, 7, .8);
  }

  // ======================= props: coconut palms, trees, street lights =======================
  buildProps() {
    const R = this.rng, m = this.meta, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = V3(), Pv = V3(), E = new THREE.Euler();
    const free = (x, z, rr) => { const c = this.classAt(x, z); if (!c || c === 4) return false; const r = this.nearestRoad(x, z, false, 12); if (r && r.d < r.E.w / 2 + rr) return false; return !this.pointInBuilding(x, 1, z) && !this.zoneHit(x, z); };
    const palms = [], trees = [];
    for (let k = 0; k < 60000 && palms.length < 8500; k++) {
      const x = lerp(m.minX + 15, m.maxX - 15, R()), z = lerp(m.minZ + 15, m.maxZ - 15, R()), c = this.classAt(x, z);
      let p = c === 2 ? .9 : c === 3 ? .6 : c === 1 ? .35 : 0; if (c === 1 && this.nearBuilding(x, z, 9)) p = .85;   // coconut palms in house compounds
      if (R() > p) continue;
      if (!free(x, z, 1.6)) continue;
      if (c === 3 && R() < .4) trees.push([x, z]); else palms.push([x, z]);
    }
    const byChunk = list => { const o = new Map(); for (const it of list) { const c = this.chunk(it[0], it[1]); if (!o.has(c)) o.set(c, []); o.get(c).push(it); } return o; };
    const trunkG = new THREE.CylinderGeometry(.2, .36, 1, 6, 4); trunkG.translate(0, .5, 0);
    { const p = trunkG.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + y * y * .9); p.setX(k, p.getX(k) * (1 + Math.sin(y * 60) * .025)); } trunkG.computeVertexNormals(); }
    const frondG = this.makeFrondGeo(), trunkM = stdMat('#8a6e4b', { roughness: 1 }), frondM = new THREE.MeshStandardMaterial({ color: col('#3f8f3a'), roughness: .8, side: THREE.DoubleSide });
    for (const [c, list] of byChunk(palms)) {
      const tr = new THREE.InstancedMesh(trunkG, trunkM, list.length), fr = new THREE.InstancedMesh(frondG, frondM, list.length);
      list.forEach(([x, z], k) => {
        const h = 8 + R() * 7, ry = R() * Math.PI * 2;
        E.set(0, ry, 0); Q.setFromEuler(E); S.set(1, h, 1); Pv.set(x, 0, z); M4.compose(Pv, Q, S); tr.setMatrixAt(k, M4);
        const top = V3(.9, h, 0).applyQuaternion(Q).add(Pv);
        E.set(0, R() * 6.28, 0); Q.setFromEuler(E); const s = .9 + R() * .35; S.set(s, s, s); M4.compose(top, Q, S); fr.setMatrixAt(k, M4);
        this.addCollider(x - .35, z - .35, x + .35, z + .35, h, 'palm');
      });
      tr.castShadow = fr.castShadow = true; c.near.add(tr, fr);
    }
    const tG = new THREE.CylinderGeometry(.3, .45, 3.2, 6); tG.translate(0, 1.6, 0);
    const cG = new THREE.IcosahedronGeometry(3.4, 1); cG.translate(0, 5.2, 0);
    const cl = new THREE.Color();
    for (const [c, list] of byChunk(trees)) {
      const tt = new THREE.InstancedMesh(tG, stdMat('#6b4f35'), list.length), tc = new THREE.InstancedMesh(cG, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), list.length);
      list.forEach(([x, z], k) => { const s = .8 + R() * .6; M4.makeScale(s, s, s).setPosition(x, 0, z); tt.setMatrixAt(k, M4); tc.setMatrixAt(k, M4); tc.setColorAt(k, cl.copy(col(pick(['#3d7a35', '#4c8f3a', '#2f6b3a', '#5a9a42'])))); this.addCollider(x - .45, z - .45, x + .45, z + .45, 7, 'tree'); });
      tt.castShadow = tc.castShadow = true; c.near.add(tt, tc);
    }
    // street lights along the real roads (alternating sides)
    const lamps = []; this.lampHeads = [];
    for (const Ed of this.carEdges) {
      if (Ed.w < 6) continue;
      for (let s = 12, k = 0; s < Ed.len - 6; s += 46, k++) {
        const q = this.edgePoint(Ed, s), sd = k % 2 ? 1 : -1, off = Ed.w / 2 + .7, lx = q.tz * sd, lz = -q.tx * sd;
        const x = q.x + lx * off, z = q.z + lz * off;
        if (!this.classAt(x, z) || this.pointInBuilding(x, 1, z) || this.zoneHit(x, z)) continue;
        lamps.push([x, z, Math.atan2(-lx, -lz)]);
      }
    }
    const poleG = mergeGeometries([(() => { const g = new THREE.CylinderGeometry(.1, .15, 8, 6); g.translate(0, 4, 0); return g; })(), (() => { const g = new THREE.BoxGeometry(.12, .12, 2.2); g.translate(0, 7.9, 1.05); return g; })()]);
    const headG = new THREE.BoxGeometry(.5, .18, .9); headG.translate(0, 7.78, 2.0);
    this.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .85, .6), toneMapped: false });
    const poolTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,210,150,1)'); gr.addColorStop(.5, 'rgba(255,180,110,.35)'); gr.addColorStop(1, 'rgba(255,160,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true, false);
    this.poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    const poolG = new THREE.PlaneGeometry(16, 16); poolG.rotateX(-Math.PI / 2);
    const poleM = stdMat('#3d4248', { metalness: .5, roughness: .5 });
    for (const [c, list] of byChunk(lamps)) {
      const poles = new THREE.InstancedMesh(poleG, poleM, list.length), heads = new THREE.InstancedMesh(headG, this.lampMat, list.length), pools = new THREE.InstancedMesh(poolG, this.poolMat, list.length);
      list.forEach(([x, z, r], k) => {
        E.set(0, r, 0); Q.setFromEuler(E); Pv.set(x, 0, z); S.set(1, 1, 1); M4.compose(Pv, Q, S); poles.setMatrixAt(k, M4); heads.setMatrixAt(k, M4);
        const off = V3(0, 0, 2.0).applyQuaternion(Q); M4.makeTranslation(x + off.x, .07, z + off.z); pools.setMatrixAt(k, M4);
        this.lampHeads.push(V3(x + off.x, 7.4, z + off.z));
        this.addCollider(x - .2, z - .2, x + .2, z + .2, 8, 'lamp');
      });
      poles.castShadow = true; pools.renderOrder = 1; c.near.add(poles, heads, pools);
    }
    this.lampPositions = lamps;
  }
  makeFrondGeo() {
    const pos = [], idx = [], leaves = 8;
    for (let k = 0; k < leaves; k++) {
      const a = k / leaves * Math.PI * 2 + Math.random() * .3, up = .4 + Math.random() * .5, len = 4.2 + Math.random() * 1.2, base = pos.length / 3, segs = 4;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs, r = t * len, y = Math.sin(t * Math.PI * .55) * up * 1.6 - t * t * 2.4, w = Math.sin(Math.min(t * 1.2, 1) * Math.PI) * .9 + .05;
        const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a), pz = Math.cos(a);
        pos.push(cx + px * w / 2, y - w * .15, cz + pz * w / 2, cx, y + .05, cz, cx - px * w / 2, y - w * .15, cz - pz * w / 2);
      }
      for (let s = 0; s < segs; s++) { const r0 = base + s * 3, r1 = r0 + 3; idx.push(r0, r1, r0 + 1, r0 + 1, r1, r1 + 1, r0 + 1, r1 + 1, r0 + 2, r0 + 2, r1 + 1, r1 + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  neonTexture(text, color, w = 512, h = 128, font = 'Bebas Neue') {
    return canvasTex(w, h, (g) => {
      g.clearRect(0, 0, w, h);
      let fs = h * .72; g.font = `${fs}px "${font}", Impact, sans-serif`;
      while (g.measureText(text).width > w * .9 && fs > 10) { fs -= 4; g.font = `${fs}px "${font}", Impact, sans-serif`; }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = color;
      g.fillText(text, w / 2, h / 2 + 4); g.fillText(text, w / 2, h / 2 + 4);
      g.shadowBlur = 4; g.fillStyle = '#ffffff'; g.globalAlpha = .85; g.fillText(text, w / 2, h / 2 + 4);
    }, true, false);
  }
  addSign(text, color, x, y, z, rotY, w, h, font) {
    const tex = this.neonTexture(text, color, 512, Math.round(512 * h / w), font);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = rotY; m.renderOrder = 2;
    this.scene.add(m);
    this.neon.push({ mat, phase: Math.random() * 100, flicker: Math.random() < .15 });
    return m;
  }
  // painted shop signboard (lit softly at night)
  addBoard(text, bg, fg, x, y, z, rotY, w, h, texW = 512) {
    const tex = canvasTex(texW, Math.max(32, Math.round(texW * h / w)), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 8; g.strokeRect(4, 4, cw - 8, ch - 8);
      let fs = ch * .62; const fam = '"Noto Sans Malayalam", "Bebas Neue", sans-serif';
      g.font = `bold ${fs}px ${fam}`; while (g.measureText(text).width > cw * .9 && fs > 10) { fs -= 3; g.font = `bold ${fs}px ${fam}`; }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 2);
    }, true, false);
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(1, 1, 1), emissiveMap: tex, emissiveIntensity: 0, roughness: .8, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY;
    this.scene.add(m); (this.boards = this.boards || []).push(mat);
    return m;
  }

  buildSky() {
    this.skyU = {
      top: { value: col('#2f7fd8') }, horizon: { value: col('#bfe1ff') }, ground: { value: col('#20242c') },
      sunDir: { value: this.sunDir }, sunColor: { value: new THREE.Color(1, .9, .7) }, night: { value: 0 }, time: { value: 0 }, cloud: { value: new THREE.Color(1, 1, 1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform vec3 top, horizon, ground, sunDir, sunColor, cloud; uniform float night, time; varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 c = mix(horizon, top, pow(clamp(h,0.0,1.0), .5));
          c = mix(c, ground, smoothstep(0.0, -0.12, h));
          float s = max(dot(d, sunDir), 0.0);
          float sunUp = smoothstep(-0.25, 0.05, sunDir.y);
          c += sunColor * (pow(s, 6.0) * .35 + pow(s, 48.0) * .6) * sunUp;
          c += sunColor * smoothstep(.99955, .9998, s) * 14.0 * sunUp;
          // moon
          float m = max(dot(d, -sunDir), 0.0);
          c += vec3(.8,.85,1.0) * (smoothstep(.99975, .99985, m) * 2.0 + pow(m, 400.0) * .2) * night;
          // stars
          if (h > 0.0) { vec2 sp = floor(d.xz / (d.y + .3) * 180.0); float st = hash(sp); c += vec3(step(.997, st) * night * (.5 + .5 * sin(time * 2.0 + st * 80.0))); }
          // clouds
          if (h > 0.0) {
            vec2 uv = d.xz / (h + .12) * 1.4 + vec2(time * .004, time * .002);
            float cl = smoothstep(.5, .8, fbm(uv));
            vec3 cc = mix(cloud, sunColor * 1.2 + cloud * .4, pow(s, 3.0) * .7);
            c = mix(c, cc, cl * smoothstep(0.0, .25, h) * .85);
          }
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), mat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    // separate scene for environment maps
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(this.sky.geometry, mat); this.envScene.add(this.envSky);
  }
  buildWater() {
    this.waterU = {
      time: { value: 0 }, deep: { value: col('#0b4a6b') }, sky: { value: col('#9fd0ff') }, sunDir: { value: this.sunDir }, sunColor: { value: new THREE.Color(1, 1, 1) },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: .002 }, camPos: { value: V3() }, night: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.waterU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec3 deep, sky, sunDir, sunColor, fogColor, camPos; uniform float time, fogDensity, night; varying vec3 vW;
        vec2 wv(vec2 p, vec2 d, float f, float s, float a){ float ph = dot(p,d)*f + time*s; return d * cos(ph) * a * f; }
        void main(){
          vec2 p = vW.xz, g = vec2(0.0);
          g += wv(p, normalize(vec2(1.0,.3)), .06, 1.1, .7);
          g += wv(p, normalize(vec2(-.4,1.0)), .13, 1.6, .35);
          g += wv(p, normalize(vec2(.7,-.7)), .45, 2.4, .07);
          g += wv(p, normalize(vec2(-.9,-.2)), 1.2, 3.4, .025);
          g += wv(p, normalize(vec2(.2,.9)), 2.7, 4.1, .01);
          vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 v = normalize(camPos - vW);
          float fr = .02 + .98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
          vec3 r = reflect(-v, n);
          vec3 refl = sky * (.75 + .25 * clamp(r.y, 0.0, 1.0));
          vec3 c = mix(deep, refl, fr);
          float sp = pow(max(dot(r, sunDir), 0.0), 180.0);
          c += sunColor * sp * 4.0 * smoothstep(-0.1, 0.05, sunDir.y);
          c += vec3(.8,.85,1.0) * pow(max(dot(r, -sunDir), 0.0), 300.0) * night * 1.5;
          float dist = length(camPos - vW);
          float f = 1.0 - exp(-fogDensity * fogDensity * dist * dist);
          gl_FragColor = vec4(mix(c, fogColor, f), 1.0);
        }`,
    });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat);
    w.rotation.x = -Math.PI / 2; w.position.y = -.35; this.water = w;
    this.scene.add(w);
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfdfff, 0x40342a, .6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -110; s.camera.right = 110; s.camera.top = 110; s.camera.bottom = -110; s.camera.near = 10; s.camera.far = 700; s.bias = -.0004; s.normalBias = .04;
    this.scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.FogExp2(0xbfe1ff, .0018);
    this.streetLights = [];
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffc887, 0, 30, 1.6); this.scene.add(l); this.streetLights.push(l); }
    this.slTimer = 0;
    this.P = {
      dayTop: col('#2a78d6'), dayHor: col('#c4e3ff'), setTop: col('#3c3f8c'), setHor: col('#ff8148'),
      nightTop: col('#03061a'), nightHor: col('#141c3d'), sunDay: new THREE.Color(1, .95, .86), sunSet: new THREE.Color(1, .48, .22), moon: new THREE.Color(.45, .55, .95),
    };
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color(); this._c3 = new THREE.Color();
  }
  setRenderer(r) { this.renderer = r; this.pmrem = new THREE.PMREMGenerator(r); this.envTime = -99; }
  refreshEnv() {
    // Sky-generated PMREM env maps came out corrupt (NaN) on r128 and turned every lit surface black.
    // Lighting now relies on sun + hemisphere only.
    this.scene.environment = null; this.envTime = this.time; return;
    if (!this.pmrem) return;
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0, .1, 5000);
    this.scene.environment = this.envRT.texture;
    this.envTime = this.time;
  }

  // ======================= city map canvas (minimap / M map) =======================
  buildMapCanvas() {
    const S = 2048, ext = 1600; this.map = { x0: -ext, z0: -ext, s: S / (ext * 2) };
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const mm = this.map, X = x => (x - mm.x0) * mm.s, Z = z => (z - mm.z0) * mm.s, m = this.meta, M = this.M;
    g.fillStyle = '#1d4e73'; g.fillRect(0, 0, S, S);
    const small = document.createElement('canvas'); small.width = M.gw; small.height = M.gh;
    const sg = small.getContext('2d'), id = sg.createImageData(M.gw, M.gh), MC = [null, [54, 58, 66], [196, 178, 128], [58, 106, 60], [78, 80, 86]];
    for (let i = 0; i < M.gw * M.gh; i++) { const k = MC[M.grid[i]]; if (!k) continue; id.data[i * 4] = k[0]; id.data[i * 4 + 1] = k[1]; id.data[i * 4 + 2] = k[2]; id.data[i * 4 + 3] = 255; }
    sg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true;
    g.drawImage(small, X(m.minX), Z(m.minZ), (m.maxX - m.minX) * mm.s, (m.maxZ - m.minZ) * mm.s);
    g.save(); g.beginPath(); g.rect(X(m.minX), Z(m.minZ), (m.maxX - m.minX) * mm.s, (m.maxZ - m.minZ) * mm.s); g.clip();   // roads beyond the map edge are not shown
    g.fillStyle = 'rgba(22,24,29,.8)';
    for (const b of this.bldInfo) { g.beginPath(); for (let k = 0; k < b.P.length; k += 2) { const px = X(b.P[k]), pz = Z(b.P[k + 1]); if (k) g.lineTo(px, pz); else g.moveTo(px, pz); } g.closePath(); g.fill(); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const draw = (filter, color, wm) => { g.strokeStyle = color; for (const E of this.redges) { if (!filter(E)) continue; g.lineWidth = Math.max(1.2, E.w * mm.s * wm); g.beginPath(); for (let k = 0; k < E.p.length; k += 2) { const px = X(E.p[k]), pz = Z(E.p[k + 1]); if (k) g.lineTo(px, pz); else g.moveTo(px, pz); } g.stroke(); } };
    draw(E => !E.car, '#6b6f78', 1); draw(E => E.car && E.w < 7, '#a3a8b2', 1.3); draw(E => E.car && E.w >= 7, '#e0c77c', 1.45);
    g.restore();
    const G = LOC.garage; g.fillStyle = '#e8b04a'; g.fillRect(X(G.x - 11), Z(G.z + 10.5), 22 * mm.s + 7 * mm.s, 12 * mm.s);
    this.mapCanvas = c;
  }

  update(dt, focus, camPos) {
    this.elapsed += dt;
    // distance culling: buildings to 800 m, palms / lamps / boards to 380 m
    this.chunkT -= dt;
    if (this.chunkT <= 0) { this.chunkT = .3; for (const c of this.chunks.values()) { const d = Math.hypot(c.x - camPos.x, c.z - camPos.z); c.far.visible = d < 800; c.near.visible = d < 380; } }
    this.time = (this.time + dt * this.timeScale / 60 + 24) % 24;
    const ang = (this.time - 6) / 12 * Math.PI, elev = Math.sin(ang);
    this.sunDir.set(Math.cos(ang), elev, .35).normalize();
    const day = smooth(-.02, .3, elev), night = 1 - smooth(-.2, .03, elev), set = smooth(-.22, .02, elev) * (1 - smooth(.05, .4, elev));
    this.night = night;
    const P = this.P;
    const top = this._c1.copy(P.nightTop).lerp(P.dayTop, day).lerp(P.setTop, set * .7);
    const hor = this._c2.copy(P.nightHor).lerp(P.dayHor, day).lerp(P.setHor, set * .9);
    const sunCol = this._c3.copy(P.sunDay).lerp(P.sunSet, clamp(set * 1.3, 0, 1));
    this.skyU.top.value.copy(top); this.skyU.horizon.value.copy(hor);
    this.skyU.ground.value.copy(hor).multiplyScalar(.35);
    this.skyU.sunColor.value.copy(sunCol); this.skyU.night.value = night; this.skyU.time.value = this.elapsed;
    this.skyU.cloud.value.copy(hor).lerp(new THREE.Color(1, 1, 1), day * .7).multiplyScalar(.6 + day * .5);
    const sunI = 2.1 * smooth(-.06, .3, elev), moonI = .6 * night;
    const moonDir = V3().copy(this.sunDir).negate();
    const ldir = sunI >= moonI ? this.sunDir : moonDir;
    this.sun.intensity = Math.max(sunI, moonI);
    this.sun.color.copy(sunI >= moonI ? sunCol : P.moon);
    this.hemi.color.copy(top).lerp(new THREE.Color(1, 1, 1), .3 * day).lerp(new THREE.Color(.32, .4, .62), night * .9);
    this.hemi.groundColor.copy(hor).multiplyScalar(.4).lerp(new THREE.Color(.1, .09, .12), night * .8);
    this.hemi.intensity = .5 + .4 * day + .85 * night + set * .45;
    this.scene.fog.color.copy(hor);
    this.scene.fog.density = .0013 + night * .0005 + set * .00015;
    // emissives
    const nI = smooth(.15, .8, night);
    this.matConcrete.emissiveIntensity = .05 + nI * 1.4;
    this.matGlass.emissiveIntensity = .04 + nI * 1.1;
    this.lampMat.color.setRGB(1, .85, .6).multiplyScalar(.3 + nI * 3);
    this.poolMat.opacity = nI * .75;
    this.markMat.emissiveIntensity = nI * .22;
    // move the real lights onto the lamps nearest the player
    this.slTimer -= dt;
    if (this.slTimer <= 0 && this.lampHeads) {
      this.slTimer = .4;
      const near = this.lampHeads.map(p => [p, (p.x - focus.x) ** 2 + (p.z - focus.z) ** 2]).sort((a, b) => a[1] - b[1]);
      this.streetLights.forEach((l, i) => near[i] && l.position.copy(near[i][0]));
    }
    for (const l of this.streetLights) l.intensity = nI * 2.6;
    for (const n of this.neon) {
      let v = .45 + nI * 1.9;
      if (n.flicker) { const f = Math.sin(this.elapsed * 23 + n.phase) * Math.sin(this.elapsed * 3.1 + n.phase); if (f > .85) v *= .3; }
      n.mat.color.setScalar(v);
    }
    if (this.boards) for (const m of this.boards) m.emissiveIntensity = nI * .35;
    if (this.boat) { this.boat.position.y = -.1 + Math.sin(this.elapsed * 1.3) * .12; this.boat.rotation.z = Math.sin(this.elapsed * .9) * .04; }
    // water
    const W = this.waterU; W.time.value = this.elapsed; W.sky.value.copy(hor).lerp(top, .3); W.sunColor.value.copy(sunCol);
    W.fogColor.value.copy(hor); W.fogDensity.value = this.scene.fog.density; W.camPos.value.copy(camPos); W.night.value = night;
    W.deep.value.copy(col('#0a3f5c')).multiplyScalar(.25 + .75 * day).lerp(hor, .15);
    // sun shadow follows focus
    this.sun.position.copy(focus).addScaledVector(ldir, 300);
    this.sun.target.position.copy(focus);
    this.sky.position.copy(camPos);
    if (Math.abs(this.time - this.envTime) > .2) this.refreshEnv();
    if (Math.abs(this.time - (this.carEnvTime === undefined ? -99 : this.carEnvTime)) > .2) { updateCarEnv(top, hor, night); this.carEnvTime = this.time; }
  }
}
