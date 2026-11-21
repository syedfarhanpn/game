'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — world: Red Hook, Brooklyn on the night of Storm Delphine.
// Real streets, buildings and heights (OpenStreetMap), flooded by the surge;
// the real Lower Manhattan skyline across the harbour, the Statue of Liberty,
// storm sky, rain, lightning, floodwater, submerged cars and floating debris.
// Map data © OpenStreetMap contributors, ODbL.
// ---------------------------------------------------------------------------
class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  quad(a, b, c, d, n, ua, ub, uc, ud, color) {
    const V = [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]];
    for (const [v, uv] of V) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); this.c.push(color.r, color.g, color.b); }
  }
  tri(a, b, c, n, color, ua = [0, 0], ub = [0, 0], uc = [0, 0]) {
    for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); this.c.push(color.r, color.g, color.b); }
  }
  // axis-aligned box; o: {sx, sy (metres per texture repeat), top, bottom, sides}
  box(x0, y0, z0, x1, y1, z1, color, o = {}) {
    const sx = o.sx || 4, sy = o.sy || 4, dx = x1 - x0, dz = z1 - z0, v0 = y0 / sy, v1 = y1 / sy;
    if (o.sides !== false) {
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [z1 / sx, v0], [z0 / sx, v0], [z0 / sx, v1], [z1 / sx, v1], color);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [z0 / sx, v0], [z1 / sx, v0], [z1 / sx, v1], [z0 / sx, v1], color);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [x0 / sx, v0], [x1 / sx, v0], [x1 / sx, v1], [x0 / sx, v1], color);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [x1 / sx, v0], [x0 / sx, v0], [x0 / sx, v1], [x1 / sx, v1], color);
    }
    if (o.top !== false) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / sx, z1 / sx], [x1 / sx, z1 / sx], [x1 / sx, z0 / sx], [x0 / sx, z0 / sx], color);
    if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [x0 / sx, z0 / sx], [x1 / sx, z0 / sx], [x1 / sx, z1 / sx], [x0 / sx, z1 / sx], color);
  }
  face(pts, color, wantUp) {
    const [a, b, c] = pts, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    if (wantUp && ny < 0) { pts = pts.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; }
    for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], [nx, ny, nz], color);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); return g;
  }
}
function canvasTex(w, h, draw, srgb = true, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function mergeGeo(list) {
  const pos = [], nor = [];
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return m;
}
const polyArea2 = P => { let a = 0; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) a += P[j] * P[i + 1] - P[i] * P[j + 1]; return Math.abs(a / 2); };

// ---------------- data ----------------
let NYC = null;
async function loadNYC(cfg = {}) {
  const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing ' + src)); i.src = src; });
  const J = u => fetch(u).then(r => { if (!r.ok) throw new Error('missing ' + u); return r.json(); });
  const A = cfg.area || 'redhook', B = 'models/map/nyc/', RH = A === 'redhook', skyF = RH ? 'skyline.json' : cfg.skyline ? A + '_sky.json' : null;
  const [rh, sky, g, far, mapImg, map] = await Promise.all([J(B + A + '.json'), skyF ? J(B + skyF) : { bld: [] }, img(B + A + '_ground.png'), img(B + (RH ? 'farland.png' : A + '_far.png')), img(B + 'nyc_map.png'), J(B + 'nyc_map.json')]);
  const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const gd = px(g), grid = new Uint8Array(g.width * g.height); for (let i = 0; i < grid.length; i++) grid[i] = Math.min(4, Math.round(gd[i * 4] / 60));
  const fd = px(far), fgrid = new Uint8Array(far.width * far.height); for (let i = 0; i < fgrid.length; i++) fgrid[i] = fd[i * 4] > 127 ? 1 : 0;
  const F = rh.meta.far || { x0: -6000, z0: -7000, r: 25 };
  NYC = { rh, area: A, sky, grid, gw: g.width, gh: g.height, far: fgrid, fw: far.width, fh: far.height, FX0: F.x0, FZ0: F.z0, FR: F.r, mapImg, map };
}
const NYC_LL = (lat, lon) => { const m = NYC.rh.meta; return V3((lon - m.lon0) * m.kx, 0, -(lat - m.lat0) * m.kz); };

// weather / time of day for each mission
const HG_WEATHER = {
  storm: { zen: [.022, .026, .034], cloud: [.07, .075, .085], glow: [.12, .07, .04], cover: 1, stars: 0, hemi: [0x7d8ba6, 0x16130f, .36], moon: .12, fog: [0x0b0e12, .0032], rain: 1, wind: [5, 2], strike: [5, 14], exposure: 1.15 },
  rain: { zen: [.02, .024, .03], cloud: [.075, .07, .072], glow: [.26, .15, .07], cover: 1, stars: 0, hemi: [0x8090a8, 0x1a1712, .42], moon: .1, fog: [0x101214, .0026], rain: .7, wind: [2, 1], strike: [28, 60], exposure: 1.2 },
  night: { zen: [.008, .012, .028], cloud: [.04, .045, .06], glow: [.2, .12, .07], cover: .35, stars: 1, hemi: [0x7a88b0, 0x15120e, .4], moon: .32, fog: [0x0c1018, .0017], rain: 0, wind: [1, .5], strike: null, exposure: 1.2 },
  high: { zen: [.006, .01, .026], cloud: [.035, .04, .055], glow: [.22, .13, .07], cover: .2, stars: 1, hemi: [0x7a88b0, 0x15120e, .42], moon: .35, fog: [0x0c1018, .00075], rain: 0, wind: [6, 2], strike: null, exposure: 1.2 },
  dawn: { zen: [.11, .14, .2], cloud: [.32, .27, .26], glow: [.55, .3, .16], cover: .7, stars: 0, sun: [.8, .16, -.58], hemi: [0xa8b4c8, 0x2a2018, .75], moon: 0, fog: [0x6a6264, .0022], rain: 0, wind: [1, .4], strike: null, exposure: 1.05 },
};
class NYCWorld {
  constructor(scene, cfg = {}) {
    this.cfg = cfg = Object.assign({ weather: 'storm', flood: true, b7: true, liberty: true, litP: .035, lamps: false, sites: [], view: 950, water: 4.15 }, cfg);
    this.W = HG_WEATHER[cfg.weather] || HG_WEATHER.storm;
    this.scene = scene; this.rng = mulberry32(2026);
    this.colliders = []; this.cells = new Map(); this.cellSize = 16; this.stamp = 0; this.sets = []; this.site = {};
    this.elapsed = 0; this.water = cfg.water; this.waterTarget = cfg.water; this.waterRate = .05; this.flash = 0; this.underwater = false;
    this.meta = NYC.rh.meta; this.anim = [];
    this.buildTextures();
    this.buildSky(); this.buildLights();
    if (cfg.b7) this.placeBuilding7(); else { this.clearB7 = () => false; }
    this.placeSites();
    this.center = cfg.b7 ? V3(this.b7site.x, 0, this.b7site.z) : V3(cfg.center ? cfg.center[0] : 0, 0, cfg.center ? cfg.center[1] : 0);
    this.buildGround(); this.buildRoads(); this.buildBuildings();
    if (cfg.b7) { this.b7 = new Building7(this, this.b7site); this.b7.ownFloor = false; this.sets.push(this.b7); }
    if (NYC.sky.bld.length) this.buildSkyline(); else { this.skyMat = []; this.avMat = new THREE.MeshBasicMaterial(); }
    this.buildFarLand(); if (cfg.liberty) this.buildLiberty();
    this.buildProps(); this.buildCars(); if (cfg.flood) this.buildDebris(); else this.debris = [];
    this.buildWater(); this.buildRain(); if (!cfg.flood) this.buildShore(); this.nextStrike = 4;
  }
  // mission sites: {name, x, z, rot ('grid' or radians), clear: [x0, z0, x1, z1] in the site's frame} — real buildings there are removed
  placeSites() {
    const ga = this.meta.grid * Math.PI / 180;
    for (const s0 of this.cfg.sites) {
      const rot = s0.rot === 'grid' ? -ga : s0.rot === 'grid90' ? -ga + Math.PI / 2 : (s0.rot || 0), c = Math.cos(rot), s = Math.sin(rot);
      const S = { name: s0.name, x: s0.x, z: s0.z, rot, clear: s0.clear, label: s0.label,
        local: (x, z) => { const dx = x - s0.x, dz = z - s0.z; return [dx * c - dz * s, dx * s + dz * c]; },
        world: (lx, lz) => [s0.x + lx * c + lz * s, s0.z - lx * s + lz * c] };
      this.site[s0.name] = S;
    }
  }
  clearAt(x, z) {
    if (this.clearB7(x, z)) return true;
    for (const k in this.site) { const S = this.site[k]; if (!S.clear) continue; const [lx, lz] = S.local(x, z); for (const c of (Array.isArray(S.clear[0]) ? S.clear : [S.clear])) if (lx > c[0] && lx < c[2] && lz > c[1] && lz < c[3]) return true; }
    return false;
  }
  addSet(set) { this.sets.push(set); return set; }
  setsNear(p, m = 2.5) { const out = []; for (const s of this.sets) if (s.near(p, m)) out.push(s); return out; }
  // water level here (a set can hold its own water, e.g. a flooded tunnel or a sump)
  waterAt(p) {
    for (const s of this.sets) if (s.waters && s.waters.length && s.near(p, .01)) { const l = s.toLocal(p); for (const w of s.waters) if (l.x > w[0] && l.x < w[2] && l.z > w[1] && l.z < w[3] && l.y < w[4] + 4) return w[4]; }
    if (this.cfg.flood) return this.water;
    return this.classAt(p.x, p.z) === 0 ? this.water : -100;
  }
  ownedFloor(p) {
    for (const s of this.sets) {
      if (s.ownFloor === true && s.inside(p)) return true;
      if (Array.isArray(s.ownFloor) && s.near(p, .01)) { const l = s.toLocal(p); for (const r of s.ownFloor) if (l.x > r[0] && l.x < r[2] && l.z > r[1] && l.z < r[3] && l.y < (r[4] === undefined ? .5 : r[4])) return true; }
    }
    return false;
  }
  // highest walkable surface below p (sets + streets / river bed)
  groundAt(p, r = .2) {
    let f = this.ownedFloor(p) ? -80 : this.floorAt(p.x, p.z);
    for (const s of this.sets) { if (!s.near(p, 1)) continue; const fb = s.floorBelow(s.toLocal(p).clone(), r); if (fb !== null && fb > f) f = fb; }
    return f;
  }
  lineClear(a, b) {
    for (const s of this.sets) if ((s.near(a, 4) || s.near(b, 4)) && s.blocked(a, b)) return false;
    const n = Math.ceil(a.distanceTo(b) / 1.5); for (let i = 1; i < n; i++) { const t = i / n, x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t), z = lerp(a.z, b.z, t); if (y > -.5 && this.pointInBuilding(x, y, z)) return false; }
    return true;
  }

  // ======================= textures =======================
  buildTextures() {
    const R = this.rng;
    // NYC brick facade: 4 window bays x 4 floors per tile (14.4 m x 12.8 m); tinted per building
    const brick = (lit, opts) => (g, w, h) => {
      const bays = opts.bays, floors = 4, bw = w / bays, fh = h / floors;
      if (!lit) {
        g.fillStyle = opts.base; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 6) { const off = (y / 6) % 2 ? 7 : 0; for (let x = -off; x < w; x += 14) { const v = R(); g.fillStyle = `rgba(${v < .5 ? '0,0,0' : '255,240,220'},${.05 + R() * .08})`; g.fillRect(x + 1, y + 1, 12, 4); } }
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
      } else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
      for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
        const ww = bw * opts.ww, wh = fh * opts.wh, x = b * bw + (bw - ww) / 2, y = f * fh + fh * .22;
        if (lit) { if (R() < opts.litP) { const gr = g.createRadialGradient(x + ww / 2, y + wh * .7, 1, x + ww / 2, y + wh * .7, ww * .7); gr.addColorStop(0, 'rgba(255,190,110,.95)'); gr.addColorStop(1, 'rgba(120,60,20,.15)'); g.fillStyle = gr; g.fillRect(x + 3, y + 3, ww - 6, wh - 6); } continue; }
        g.fillStyle = opts.trim; g.fillRect(x - 3, y - 5, ww + 6, 5); g.fillRect(x - 2, y + wh, ww + 4, 4);          // lintel + sill
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); gr.addColorStop(0, '#1a2129'); gr.addColorStop(.6, '#0b0f14'); gr.addColorStop(1, '#232b33');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        g.fillStyle = 'rgba(200,210,220,.10)'; g.fillRect(x + 2, y + 2, ww / 2 - 3, wh - 4);
        g.fillStyle = opts.frame; g.fillRect(x + ww / 2 - 1.5, y, 3, wh); g.fillRect(x, y + wh / 2 - 1.5, ww, 3);
        if (opts.ac && R() < .25) { g.fillStyle = '#b7b9b4'; g.fillRect(x + ww * .2, y + wh * .55, ww * .6, wh * .32); g.fillStyle = '#6f716d'; g.fillRect(x + ww * .2, y + wh * .55, ww * .6, 3); }
      }
    };
    const T = (o) => [canvasTex(512, 512, brick(false, o)), canvasTex(512, 512, brick(true, o))];
    const mk = ([map, em], rough) => new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: new THREE.Color(1, .72, .42), emissiveIntensity: .32, vertexColors: true, roughness: rough, metalness: 0 });   // blackout: a few candle-lit windows
    const LP = this.cfg.litP;
    this.matBrick = mk(T({ bays: 4, ww: .46, wh: .55, base: '#b9b2a8', trim: '#d8d2c6', frame: '#2a2a2a', litP: LP, ac: true }), .92);
    this.matNycha = mk(T({ bays: 6, ww: .42, wh: .5, base: '#a99d92', trim: '#a99d92', frame: '#444', litP: LP * .85, ac: true }), .95);
    this.matIndustrial = mk(T({ bays: 3, ww: .62, wh: .28, base: '#c2bdb2', trim: '#9a968e', frame: '#555', litP: LP * .2 }), .9);
    if (LP > .1) for (const m of [this.matBrick, this.matNycha, this.matIndustrial]) m.emissiveIntensity = .55;
    // glass / stone towers (Midtown): curtain wall with office lights
    const tower = (lit) => (g, w, h) => {
      g.fillStyle = lit ? '#000' : '#4a5560'; g.fillRect(0, 0, w, h);
      const cols = 16, rows = 16, cw = w / cols, rh = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        if (lit) { if (R() < LP * .85) { g.fillStyle = pick(['#fff1d6', '#ffe0a8', '#dfefff', '#fff']); g.globalAlpha = .55 + R() * .45; g.fillRect(i * cw + 1, j * rh + 2, cw - 2, rh - 5); g.globalAlpha = 1; } continue; }
        const v = 40 + R() * 25 | 0; g.fillStyle = `rgb(${v},${v + 10},${v + 18})`; g.fillRect(i * cw + 1, j * rh + 2, cw - 2, rh - 5);
      }
      if (!lit) { g.fillStyle = 'rgba(200,210,220,.25)'; for (let j = 0; j < rows; j++) g.fillRect(0, j * rh, w, 2); }
    };
    this.matTower = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, tower(false)), emissiveMap: canvasTex(256, 256, tower(true)), emissive: new THREE.Color(1, .92, .8), emissiveIntensity: .8, vertexColors: true, roughness: .25, metalness: .55 });
    this.matRoof = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
    this.texAsphalt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a4744'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 50 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1.5, 1.5); } });
    this.texConcrete = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9d9a94'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 130 + R() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(R() * w, R() * h, 2, 2); } g.strokeStyle = 'rgba(40,40,40,.4)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); } });
    // fire escape (alpha)
    this.texFireEscape = canvasTex(256, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = '#141414'; g.fillStyle = '#141414';
      const fl = 4, fh = h / fl;
      for (let f = 0; f < fl; f++) {
        const y = f * fh + fh * .78; g.fillRect(0, y, w, 6);                        // platform
        g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= w; x += 9) { g.moveTo(x, y); g.lineTo(x, y - fh * .3); } g.stroke(); g.fillRect(0, y - fh * .3, w, 3);   // railing
        g.lineWidth = 4; g.beginPath(); const l = f % 2 ? w * .2 : w * .8, r = f % 2 ? w * .8 : w * .2; g.moveTo(l, y); g.lineTo(r, y + fh); g.stroke();                 // stair
        g.lineWidth = 1.5; for (let k = 0; k < 9; k++) { const t = k / 9, sx = lerp(l, r, t), sy = lerp(y, y + fh, t); g.beginPath(); g.moveTo(sx - 9, sy); g.lineTo(sx + 9, sy); g.stroke(); }
      }
    }, true, false);
  }

  // ======================= colliders (exterior walls, cars, props) =======================
  addCollider(x0, z0, x1, z1, h, tag, pts, circle) {
    const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h, tag, pts: pts || null, circle: circle || null, _s: 0 };
    const idx = this.colliders.push(c) - 1, cs = this.cellSize;
    for (let cx = Math.floor(c.x0 / cs); cx <= Math.floor(c.x1 / cs); cx++) for (let cz = Math.floor(c.z0 / cs); cz <= Math.floor(c.z1 / cs); cz++) { const k = cx + ',' + cz; let a = this.cells.get(k); if (!a) this.cells.set(k, a = []); a.push(idx); }
    return c;
  }
  query(x, z, r, fn) {
    const cs = this.cellSize; this.stamp++;
    for (let cx = Math.floor((x - r) / cs); cx <= Math.floor((x + r) / cs); cx++) for (let cz = Math.floor((z - r) / cs); cz <= Math.floor((z + r) / cs); cz++) {
      const a = this.cells.get(cx + ',' + cz); if (!a) continue;
      for (const i of a) { const c = this.colliders[i]; if (c._s === this.stamp) continue; c._s = this.stamp; fn(c); }
    }
  }
  // pushes p (x/z) out of building footprints and props whose top is above y
  resolveCircle(p, r, y = 0) {
    let hit = null;
    this.query(p.x, p.z, r, c => {
      if (c.h < y || p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r) return;
      let nx, nz, push;
      if (c.circle) { const dx = p.x - c.circle[0], dz = p.z - c.circle[1], d = Math.hypot(dx, dz), rr = c.circle[2] + r; if (d >= rr || d < 1e-6) return; nx = dx / d; nz = dz / d; push = rr - d; }
      else if (c.pts) {
        const P = c.pts, n = P.length; let inside = false, bd = Infinity, bx = 0, bz = 0;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
          const xi = P[i], zi = P[i + 1], xj = P[j], zj = P[j + 1];
          if ((zi > p.z) !== (zj > p.z) && p.x < (xj - xi) * (p.z - zi) / (zj - zi) + xi) inside = !inside;
          const dx = xi - xj, dz = zi - zj, L2 = dx * dx + dz * dz || 1e-9; let t = ((p.x - xj) * dx + (p.z - zj) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = xj + dx * t, qz = zj + dz * t, d2 = (p.x - qx) ** 2 + (p.z - qz) ** 2; if (d2 < bd) { bd = d2; bx = qx; bz = qz; }
        }
        const d = Math.sqrt(bd); if ((!inside && d >= r) || d < 1e-7) return;
        if (inside) { nx = (bx - p.x) / d; nz = (bz - p.z) / d; push = d + r; } else { nx = (p.x - bx) / d; nz = (p.z - bz) / d; push = r - d; }
      } else return;
      p.x += nx * push; p.z += nz * push; hit = { nx, nz };
    });
    return hit;
  }
  pointInBuilding(x, y, z) {
    let ins = false;
    this.query(x, z, 0, c => {
      if (ins || !c.pts || y > c.h || x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) return;
      const P = c.pts; let a = false;
      for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const zi = P[i + 1], zj = P[j + 1]; if ((zi > z) !== (zj > z) && x < (P[j] - P[i]) * (z - zi) / (zj - zi) + P[i]) a = !a; }
      if (a) ins = true;
    });
    return ins;
  }
  classAt(x, z) { const m = this.meta, i = clamp(Math.floor((x - m.minX) / m.res), 0, NYC.gw - 1), j = clamp(Math.floor((z - m.minZ) / m.res), 0, NYC.gh - 1); return NYC.grid[j * NYC.gw + i]; }
  floorAt(x, z) { return this.classAt(x, z) ? 0 : -11; }        // flooded street level, or the harbour bed

  // ======================= Building 7 site (a real Red Hook Houses block) =======================
  placeBuilding7() {
    const B = NYC.rh.bld.filter(b => b.k === 7);
    const cen = b => { let x = 0, z = 0, n = b.p.length / 2; for (let i = 0; i < b.p.length; i += 2) { x += b.p[i]; z += b.p[i + 1]; } return [x / n / 10, z / n / 10]; };
    let mx = 0, mz = 0; for (const b of B) { const [x, z] = cen(b); mx += x; mz += z; } mx /= Math.max(1, B.length); mz /= Math.max(1, B.length);
    let best = null, bd = Infinity; for (const b of B) { const [x, z] = cen(b); const d = Math.hypot(x - mx, z - mz); if (d < bd) { bd = d; best = [x, z]; } }
    const a = this.meta.grid * Math.PI / 180;
    this.b7site = { x: best ? best[0] : 0, z: best ? best[1] : 0, rot: -a };
    // keep-clear rectangle in Building 7's local frame (the block itself, its front court and the boat's water)
    const c = Math.cos(this.b7site.rot), s = Math.sin(this.b7site.rot);
    this.b7local = (x, z) => { const dx = x - this.b7site.x, dz = z - this.b7site.z; return [dx * c - dz * s, dx * s + dz * c]; };
    this.b7world = (lx, lz) => [this.b7site.x + lx * c + lz * s, this.b7site.z - lx * s + lz * c];
    this.clearB7 = (x, z) => { const [lx, lz] = this.b7local(x, z); return lx > -32 && lx < 32 && lz > -14 && lz < 40; };
  }

  // ======================= ground (under the flood) =======================
  buildGround() {
    const m = this.meta, R = this.rng, gw = NYC.gw, gh = NYC.gh;
    const c = document.createElement('canvas'); c.width = gw; c.height = gh; const g = c.getContext('2d'), id = g.createImageData(gw, gh);
    const COL = [[60, 58, 52], [96, 92, 86], [150, 138, 110], [66, 84, 52], [84, 84, 82]];
    const holes = []; for (const k in this.site) for (const h of (this.cfg.sites.find(s0 => s0.name === k).holes || [])) holes.push([this.site[k], h]);
    const inHole = (i) => { if (!holes.length) return false; const x = m.minX + (i % gw + .5) * m.res, z = m.minZ + (Math.floor(i / gw) + .5) * m.res; for (const [S, h] of holes) { const [lx, lz] = S.local(x, z); if (lx > h[0] && lx < h[2] && lz > h[1] && lz < h[3]) return true; } return false; };
    for (let i = 0; i < gw * gh; i++) { const k = COL[NYC.grid[i]], v = .9 + R() * .2, o = i * 4; id.data[o] = k[0] * v; id.data[o + 1] = k[1] * v; id.data[o + 2] = k[2] * v; id.data[o + 3] = NYC.grid[i] && !inHole(i) ? 255 : 0; }
    g.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const W = m.maxX - m.minX, H = m.maxZ - m.minZ, geo = new THREE.PlaneGeometry(W + 1600, H + 1600, 4, 4); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), z = pos.getZ(k); uv.setXY(k, (x - m.minX) / W, 1 - (z - m.minZ) / H); }
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, roughness: 1 })); mesh.receiveShadow = true; this.scene.add(mesh);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshStandardMaterial({ color: col('#1b1d18'), roughness: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.y = -11; this.scene.add(bed);
  }
  buildRoads() {
    const car = new GeoBuilder(), walk = new GeoBuilder(), up = [0, 1, 0], C = new THREE.Color(1, 1, 1), UV = v => [v[0] / 6, v[2] / 6];
    const strip = (G, P, hw, y) => {
      const n = P.length / 2, L = [], Rr = [];
      for (let i = 0; i < n; i++) {
        let nx = 0, nz = 0, px = 0, pz = 0;
        if (i > 0) { const dx = P[2 * i] - P[2 * i - 2], dz = P[2 * i + 1] - P[2 * i - 1], l = Math.hypot(dx, dz) || 1; nx += dz / l; nz -= dx / l; px = dx / l; pz = dz / l; }
        if (i < n - 1) { const dx = P[2 * i + 2] - P[2 * i], dz = P[2 * i + 3] - P[2 * i + 1], l = Math.hypot(dx, dz) || 1; nx += dz / l; nz -= dx / l; if (!i) { px = dx / l; pz = dz / l; } }
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; const sc = 1 / Math.max(.45, nx * pz - nz * px);
        L.push([P[2 * i] + nx * hw * sc, y, P[2 * i + 1] + nz * hw * sc]); Rr.push([P[2 * i] - nx * hw * sc, y, P[2 * i + 1] - nz * hw * sc]);
      }
      for (let i = 0; i < n - 1; i++) { const a = Rr[i], b = Rr[i + 1], c = L[i + 1], d = L[i]; G.quad(a, b, c, d, up, UV(a), UV(b), UV(c), UV(d), C); }
    };
    const plank = new GeoBuilder();
    for (const r of NYC.rh.roads) {
      const P = r.p.map(v => v / 10), nm = NYC.rh.names[r.n] || '';
      if (/Boardwalk/.test(nm)) { strip(plank, P, 8, .04); continue; }
      if (r.c) { strip(walk, P, r.w / 2 + 2.6, .015); strip(car, P, r.w / 2, .03); } else strip(walk, P, r.w / 2, .02);
    }
    if (plank.p.length) {
      const pt = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { const v = 96 + Math.random() * 30 | 0; g.fillStyle = `rgb(${v + 30},${v + 14},${v - 10})`; g.fillRect(0, y, w, 15); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 15, w, 1); for (let k = 0; k < 3; k++) g.fillRect(Math.random() * w, y, 1, 15); } });
      const pm = new THREE.MeshStandardMaterial({ map: pt, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -3 });
      const mesh = new THREE.Mesh(plank.geometry(), pm); mesh.receiveShadow = true; this.scene.add(mesh);
    }
    this.texAsphalt.repeat.set(1, 1);
    const m1 = new THREE.MeshStandardMaterial({ map: this.texAsphalt, roughness: .9, color: new THREE.Color(1.3, 1.3, 1.3), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const m2 = new THREE.MeshStandardMaterial({ map: this.texConcrete, roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    for (const [G, mat] of [[car, m1], [walk, m2]]) { const mesh = new THREE.Mesh(G.geometry(), mat); mesh.receiveShadow = true; this.scene.add(mesh); }
  }

  // ======================= Red Hook buildings (real footprints and heights) =======================
  buildBuildings() {
    const R = this.rng, chunks = new Map(), S = 300;
    const geo = (x, z, key) => { const k = Math.floor(x / S) + ',' + Math.floor(z / S); let c = chunks.get(k); if (!c) chunks.set(k, c = {}); return c[key] || (c[key] = new GeoBuilder()); };
    const BRICK = ['#9a4a38', '#8a3f30', '#7d4636', '#a0603f', '#6e3b30', '#9b7a5c', '#b08a66', '#8f5a44', '#7a5446', '#a8a29a'];
    const NYCHA = ['#8a4636', '#7f4233', '#93503c'];
    const IND = ['#a49c8c', '#8e8a80', '#b3a68e', '#7d7a74', '#9a8f7a'];
    this.waterTowers = []; this.fireEscapes = []; this.bldInfo = [];
    for (const b of NYC.rh.bld) {
      const n = b.p.length / 2, P = new Float32Array(b.p.length); let cx = 0, cz = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let k = 0; k < b.p.length; k += 2) { const x = P[k] = b.p[k] / 10, z = P[k + 1] = b.p[k + 1] / 10; cx += x; cz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      cx /= n; cz /= n;
      let skip = this.clearAt(cx, cz); for (let k = 0; k < P.length && !skip; k += 2) if (this.clearAt(P[k], P[k + 1])) skip = true;
      if (skip) continue;
      const h = Math.max(3.5, b.h), kind = b.k;
      const mat = kind === 7 ? 'nycha' : kind === 2 ? 'ind' : kind === 8 ? 'tower' : 'brick', color = col(pick(kind === 7 ? NYCHA : kind === 2 ? IND : kind === 8 ? ['#c8d2dc', '#aab6c2', '#d8d4cc', '#9aa6b0', '#b8b0a4'] : kind === 3 ? ['#8e8a82', '#9a9387'] : BRICK));
      const G = geo(cx, cz, mat), top = h, uw = kind === 7 ? 21.6 : kind === 8 ? 48 : 14.4;
      let per = R() * 14;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, xi = P[2 * i], zi = P[2 * i + 1], xj = P[2 * j], zj = P[2 * j + 1], dx = xj - xi, dz = zj - zi, L = Math.hypot(dx, dz); if (L < .05) continue;
        const nx = dz / L, nz = -dx / L, ua = per / uw, ub = (per + L) / uw, vt = top / (kind === 8 ? 52 : 12.8);
        G.quad([xj, 0, zj], [xi, 0, zi], [xi, top, zi], [xj, top, zj], [nx, 0, nz], [ub, 0], [ua, 0], [ua, vt], [ub, vt], color);
        per += L;
        // fire escape on a long facade of brick walk-ups
        if (kind <= 1 && h > 9 && h < 26 && L > 8 && !b._fe && R() < .5) { b._fe = 1; this.fireEscapes.push([xi + dx * .5 + nx * .55, zi + dz * .5 + nz * .55, Math.atan2(nx, nz), Math.min(L * .55, 7), h]); }
      }
      // flat roof inside a parapet
      const rf = geo(cx, cz, 'roof'), contour = []; for (let k = 0; k < P.length; k += 2) contour.push(new THREE.Vector2(P[k], P[k + 1]));
      let faces = []; try { faces = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { }
      const rc = col(pick(['#2b2a28', '#33312d', '#3a3833', '#262624'])), ry = top - .7;
      for (const [a, bb, c] of faces) { const A = [P[2 * a], ry, P[2 * a + 1]], B = [P[2 * bb], ry, P[2 * bb + 1]], Cc = [P[2 * c], ry, P[2 * c + 1]]; const cr = (B[0] - A[0]) * (Cc[2] - A[2]) - (B[2] - A[2]) * (Cc[0] - A[0]); if (cr > 0) rf.tri(A, Cc, B, [0, 1, 0], rc); else rf.tri(A, B, Cc, [0, 1, 0], rc); }
      const area = polyArea2(P);
      if (area > 120 && R() < .5) { const w = 2.5 + R() * 2, d = 2.5 + R() * 2; rf.box(cx - w / 2, ry, cz - d / 2, cx + w / 2, ry + 2.6, cz + d / 2, col('#5a5650')); }   // stair bulkhead
      if (kind !== 7 && kind !== 3 && h >= 14 && h < 60 && area > 220 && R() < .42) this.waterTowers.push([cx + (R() - .5) * 4, ry, cz + (R() - .5) * 4, .8 + R() * .5]);
      this.addCollider(x0, z0, x1, z1, top, 'bld', P);
      this.bldInfo.push({ P, h: top, k: kind });
    }
    const mats = { brick: this.matBrick, nycha: this.matNycha, ind: this.matIndustrial, roof: this.matRoof, tower: this.matTower };
    this.cityChunks = [];
    for (const [k, c] of chunks) {
      const grp = new THREE.Group(); const [i, j] = k.split(',').map(Number); grp.userData.c = V3((i + .5) * S, 0, (j + .5) * S);
      for (const [key, G] of Object.entries(c)) { const mesh = new THREE.Mesh(G.geometry(), mats[key]); mesh.castShadow = false; mesh.receiveShadow = true; grp.add(mesh); }   // city blocks don't cast (two shadow maps would redraw the whole city)
      this.scene.add(grp); this.cityChunks.push(grp);
    }
    // water towers (wooden tanks on steel legs) — the New York roofline
    if (this.waterTowers.length) {
      const tank = new THREE.CylinderGeometry(1.9, 1.9, 3.6, 14, 1, true); tank.translate(0, 3.8 + 1.8, 0);
      const roof = new THREE.ConeGeometry(2.05, 1.3, 14); roof.translate(0, 5.6 + .65, 0);
      const bottom = new THREE.CylinderGeometry(1.95, 1.95, .25, 14); bottom.translate(0, 3.8, 0);
      const legs = []; for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { const l = new THREE.BoxGeometry(.18, 3.8, .18); l.translate(lx, 1.9, lz); legs.push(l); }
      const ringG = []; for (const y of [4.6, 5.4]) { const r = new THREE.TorusGeometry(1.92, .05, 4, 16); r.rotateX(Math.PI / 2); r.translate(0, y, 0); ringG.push(r); }
      const woodM = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (g, w, h) => { for (let x = 0; x < w; x += 4) { const v = 70 + Math.random() * 30 | 0; g.fillStyle = `rgb(${v + 20},${v},${v - 25})`; g.fillRect(x, 0, 4, h); } }), roughness: 1, side: THREE.DoubleSide });
      const steel = stdMat('#2b2d2f', { metalness: .6, roughness: .6 });
      const parts = [[tank, woodM], [mergeGeo([roof]), stdMat('#3d3a35', { roughness: .9 })], [mergeGeo([bottom, ...legs, ...ringG]), steel]];
      const M4 = new THREE.Matrix4();
      for (const [g, m] of parts) { const im = new THREE.InstancedMesh(g, m, this.waterTowers.length); this.waterTowers.forEach(([x, y, z, s], k) => { M4.makeScale(s, s, s).setPosition(x, y, z); im.setMatrixAt(k, M4); }); this.scene.add(im); }
    }
    if (this.fireEscapes.length) {
      const fm = new THREE.MeshStandardMaterial({ map: this.texFireEscape, alphaTest: .4, side: THREE.DoubleSide, metalness: .5, roughness: .6, color: col('#3a3a3a') });
      const FG = new GeoBuilder(), wc = new THREE.Color(1, 1, 1);      // all fire escapes in one mesh
      for (const [x, z, r, w, h] of this.fireEscapes) {
        const cx = Math.cos(r), sx = Math.sin(r), hw = w / 2, y0 = 3.5, y1 = h, ax = x - cx * hw, az = z + sx * hw, bx = x + cx * hw, bz = z - sx * hw, n = [sx, 0, cx];
        FG.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], n, [0, 0], [1, 0], [1, 1], [0, 1], wc);
      }
      this.scene.add(new THREE.Mesh(FG.geometry(), fm));
    }
  }

  // ======================= Lower Manhattan skyline (real heights) =======================
  buildSkyline() {
    const R = this.rng, G = [new GeoBuilder(), new GeoBuilder()], tops = [];
    this.skyMat = [];
    const tex = (dark) => canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (R() < (dark ? .045 : .2)) { g.fillStyle = pick(['#ffd9a0', '#fff1d6', '#cfe4ff', '#ffc070']); g.globalAlpha = .4 + R() * .6; g.fillRect(x + 1, y + 2, 6, 4); g.globalAlpha = 1; }
    }, true, true);
    for (const b of NYC.sky.bld) {
      const P = b.p, n = P.length / 2, h = b.h, dark = R() < .8, Gx = G[dark ? 0 : 1], c = col(pick(['#20252c', '#272d35', '#1b1f25', '#2b2f33', '#30343a']));
      let per = 0; let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, xi = P[2 * i], zi = P[2 * i + 1], xj = P[2 * j], zj = P[2 * j + 1], dx = xj - xi, dz = zj - zi, L = Math.hypot(dx, dz); if (L < .5) continue;
        const nx = dz / L, nz = -dx / L; cx += xi; cz += zi;
        Gx.quad([xj, 0, zj], [xi, 0, zi], [xi, h, zi], [xj, h, zj], [nx, 0, nz], [(per + L) / 64, 0], [per / 64, 0], [per / 64, h / 128], [(per + L) / 64, h / 128], c); per += L;
      }
      const contour = []; for (let k = 0; k < P.length; k += 2) contour.push(new THREE.Vector2(P[k], P[k + 1]));
      try { for (const [a, bb, cc] of THREE.ShapeUtils.triangulateShape(contour, [])) Gx.face([[P[2 * a], h, P[2 * a + 1]], [P[2 * bb], h, P[2 * bb + 1]], [P[2 * cc], h, P[2 * cc + 1]]], c, true); } catch (e) { }
      if (h > 140) tops.push([cx / n, h + (h > 400 ? 115 : 4), cz / n]);
    }
    [true, false].forEach((dark, i) => {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3, emissiveMap: tex(dark), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: dark ? .6 : .9, fog: false });
      this.skyMat.push(m); const mesh = new THREE.Mesh(G[i].geometry(), m); this.scene.add(mesh);
    });
    // One World Trade's spire + red aviation lights
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.8, 120, 6), new THREE.MeshStandardMaterial({ color: col('#3a3e44'), fog: false }));
    const wtc = NYC.sky.bld.reduce((a, b) => b.h > a.h ? b : a, { h: 0, p: [0, 0] }); let wx = 0, wz = 0; for (let k = 0; k < wtc.p.length; k += 2) { wx += wtc.p[k]; wz += wtc.p[k + 1]; } wx /= wtc.p.length / 2; wz /= wtc.p.length / 2;
    sp.position.set(wx, wtc.h + 60, wz); this.scene.add(sp);
    this.avMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .2, .15), fog: false, toneMapped: false });
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1.6, 6, 5), this.avMat, Math.max(1, tops.length)), M4 = new THREE.Matrix4();
    tops.forEach(([x, y, z], k) => { M4.makeTranslation(x, y, z); im.setMatrixAt(k, M4); }); this.scene.add(im);
  }
  // shores of the harbour (Governors Island, Brooklyn Heights, Jersey City) with low dark blocks
  buildFarLand() {
    const fw = NYC.fw, fh = NYC.fh, m = this.meta, R = this.rng, c = document.createElement('canvas'); c.width = fw; c.height = fh;
    const g = c.getContext('2d'), id = g.createImageData(fw, fh);
    const inRH = (x, z) => x > m.minX && x < m.maxX && z > m.minZ && z < m.maxZ;
    const spots = [];
    for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
      const o = (j * fw + i) * 4, x = NYC.FX0 + (i + .5) * NYC.FR, z = NYC.FZ0 + (j + .5) * NYC.FR, land = NYC.far[j * fw + i] && !inRH(x, z);
      id.data[o] = 28; id.data[o + 1] = 30; id.data[o + 2] = 30; id.data[o + 3] = land ? 255 : 0;
      if (land && R() < .045 && Math.hypot(x, z) > 900 && !(z < -2600 && z > -4800 && x > -1300 && x < 900)) spots.push([x, z]);
    }
    g.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(c); const W = fw * NYC.FR, H = fh * NYC.FR;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, alphaTest: .5, color: col('#202224'), fog: false }));
    pl.rotation.x = -Math.PI / 2; pl.position.set(NYC.FX0 + W / 2, .4, NYC.FZ0 + H / 2); this.scene.add(pl);
    const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, .5, 0);
    const winTex = canvasTex(64, 64, (g2, w, h) => { g2.fillStyle = '#000'; g2.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 8) for (let x = 2; x < w; x += 8) if (Math.random() < .06) { g2.fillStyle = '#ffcf8a'; g2.fillRect(x, y, 4, 4); } });
    const bm = new THREE.MeshStandardMaterial({ color: col('#24272b'), emissiveMap: winTex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: .5, fog: false, roughness: .9 });
    const im = new THREE.InstancedMesh(boxG, bm, spots.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
    spots.forEach(([x, z], k) => { const h = 8 + R() * R() * 45, w = 10 + R() * 22; E.set(0, R() * .4, 0); Q.setFromEuler(E); M4.compose(V3(x, 0, z), Q, V3(w, h, w * (.6 + R()))); im.setMatrixAt(k, M4); });
    this.scene.add(im); this.farMat = bm;
  }
  // the Statue of Liberty on Liberty Island (simplified silhouette at its real position)
  buildLiberty() {
    const p = NYC_LL(40.68925, -74.0445), g = new THREE.Group(), cu = new THREE.MeshStandardMaterial({ color: col('#4f7d6e'), roughness: .7, fog: false }), st = new THREE.MeshStandardMaterial({ color: col('#7d776c'), roughness: .9, fog: false });
    const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; };
    add(new THREE.CylinderGeometry(70, 76, 9, 11), st, 0, 4.5, 0);                // star fort
    add(new THREE.CylinderGeometry(13, 17, 27, 4), st, 0, 9 + 13.5, 0).rotation.y = Math.PI / 4;   // pedestal
    add(new THREE.CylinderGeometry(4.2, 7.5, 30, 10), cu, 0, 36 + 15, 0);         // robe
    add(new THREE.SphereGeometry(3.1, 10, 8), cu, 0, 36 + 32.5, 0);               // head
    add(new THREE.CylinderGeometry(1.1, 1.4, 13, 6), cu, 2.8, 36 + 34, 0, 0, -.25); // raised arm
    for (let k = 0; k < 7; k++) add(new THREE.ConeGeometry(.35, 3, 4), cu, Math.cos(k / 7 * Math.PI - Math.PI / 2) * 3.4, 36 + 35, Math.sin(k / 7 * Math.PI - Math.PI / 2) * 3.4, Math.sin(k / 7 * Math.PI - Math.PI / 2) * .9, -Math.cos(k / 7 * Math.PI - Math.PI / 2) * .9);
    this.torchMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.2), toneMapped: false, fog: false });
    add(new THREE.SphereGeometry(1.6, 8, 6), this.torchMat, 4.5, 36 + 41.5, 0);
    g.position.copy(p); g.rotation.y = .6; this.scene.add(g);
  }

  // ======================= street furniture sticking out of the flood =======================
  buildProps() {
    const R = this.rng, c7 = this.center, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = V3(), Sv = V3(), RAD = this.cfg.propR || 520;
    const lamps = [], trees = [];
    for (const r of NYC.rh.roads) {
      if (!r.c) continue;
      const pts = r.p.map(v => v / 10);
      for (let i = 0; i < pts.length - 2; i += 2) {
        const ax = pts[i], az = pts[i + 1], dx = pts[i + 2] - ax, dz = pts[i + 3] - az, L = Math.hypot(dx, dz); if (L < 1) continue;
        for (let s = 10; s < L; s += 32) {
          const t = s / L, x = ax + dx * t, z = az + dz * t; if (Math.hypot(x - c7.x, z - c7.z) > RAD) continue;
          const sd = (lamps.length % 2) ? 1 : -1, nx = dz / L * sd, nz = -dx / L * sd, off = r.w / 2 + 1.2, lx = x + nx * off, lz = z + nz * off;
          if (this.pointInBuilding(lx, 1, lz) || this.clearAt(lx, lz) || this.classAt(lx, lz) === 0) continue;
          lamps.push([lx, lz, Math.atan2(-nx, -nz)]);
          if (R() < .55) { const tx = x + nx * (r.w / 2 + 1.8) + dx / L * 12, tz = z + nz * (r.w / 2 + 1.8) + dz / L * 12; if (!this.pointInBuilding(tx, 1, tz) && !this.clearAt(tx, tz) && this.classAt(tx, tz)) trees.push([tx, tz]); }
        }
      }
    }
    for (let k = 0; k < 1500 && trees.length < 700; k++) { const x = c7.x + (R() - .5) * 900, z = c7.z + (R() - .5) * 900; if (this.classAt(x, z) === 3 && !this.pointInBuilding(x, 1, z) && !this.clearAt(x, z)) trees.push([x, z]); }
    // NYC street light: tall pole with a curved "cobra head" arm — dark (blackout)
    const pole = new THREE.CylinderGeometry(.11, .17, 9.5, 6); pole.translate(0, 4.75, 0);
    const arm = new THREE.BoxGeometry(.1, .1, 2.6); arm.translate(0, 9.3, 1.2);
    const head = new THREE.BoxGeometry(.45, .2, .9); head.translate(0, 9.25, 2.6);
    const lampG = mergeGeo([pole, arm, head]);
    const lm = new THREE.InstancedMesh(lampG, stdMat('#2f3a34', { metalness: .5, roughness: .55 }), lamps.length);
    lamps.forEach(([x, z, r], k) => { E.set(0, r, 0); Q.setFromEuler(E); M4.compose(P.set(x, 0, z), Q, Sv.set(1, 1, 1)); lm.setMatrixAt(k, M4); this.addCollider(x - .25, z - .25, x + .25, z + .25, 9.5, 'pole', null, [x, z, .25]); });
    this.scene.add(lm); this.lamps = lamps;
    if (this.cfg.lamps && lamps.length) {     // working street lights: glowing heads + a few real lights that follow the camera
      const hg = new THREE.BoxGeometry(.42, .06, .8); hg.translate(0, 9.13, 2.6);
      const hm = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, .9), toneMapped: false }), lamps.length);
      lamps.forEach(([x, z, r], k) => { E.set(0, r, 0); Q.setFromEuler(E); M4.compose(P.set(x, 0, z), Q, Sv.set(1, 1, 1)); hm.setMatrixAt(k, M4); });
      this.scene.add(hm);
      this.lampPool = []; for (let k = 0; k < 4; k++) { const l = new THREE.PointLight(0xffb870, 0, 26, 1.6); this.scene.add(l); this.lampPool.push(l); }
      this.lampT = 0;
    }
    // London plane trees (crowns above the water)
    const trunk = new THREE.CylinderGeometry(.25, .4, 6, 6); trunk.translate(0, 3, 0);
    const crown = new THREE.IcosahedronGeometry(3.2, 1); crown.translate(0, 7.2, 0);
    const tt = new THREE.InstancedMesh(trunk, stdMat('#3d342a'), trees.length), tc = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ roughness: .95, flatShading: true }), trees.length), cl = new THREE.Color();
    trees.forEach(([x, z], k) => { const s = .75 + R() * .5; E.set(0, R() * 6, 0); Q.setFromEuler(E); M4.compose(P.set(x, 0, z), Q, Sv.set(s, s, s)); tt.setMatrixAt(k, M4); tc.setMatrixAt(k, M4); tc.setColorAt(k, cl.copy(col(pick(['#2b3b25', '#34472b', '#26331f', '#3b4a2c'])))); this.addCollider(x - .4, z - .4, x + .4, z + .4, 6, 'tree', null, [x, z, .45]); });
    this.scene.add(tt, tc);
    this.treeCrowns = tc;
  }
  // cars drowned at the kerb (yellow cabs, sedans, vans, an NYPD car with its lights still flashing)
  buildCars() {
    const R = this.rng, c7 = this.center, cars = [], CR = this.cfg.carR || 320;
    for (const r of NYC.rh.roads) {
      if (!r.c || r.w < 8) continue;
      const pts = r.p.map(v => v / 10);
      for (let i = 0; i < pts.length - 2; i += 2) {
        const ax = pts[i], az = pts[i + 1], dx = pts[i + 2] - ax, dz = pts[i + 3] - az, L = Math.hypot(dx, dz);
        for (let s = 6; s < L - 4; s += 7 + R() * 9) {
          const x = ax + dx * s / L, z = az + dz * s / L; if (Math.hypot(x - c7.x, z - c7.z) > CR || R() < .35) continue;
          const sd = R() < .5 ? 1 : -1, off = r.w / 2 - 1.2, nx = dz / L * sd, nz = -dx / L * sd, px = x + nx * off, pz = z + nz * off;
          if ((this.cfg.b7 && this.clearB7(px, pz) && Math.hypot(...this.b7local(px, pz)) < 30) || (!this.cfg.b7 && this.clearAt(px, pz)) || this.classAt(px, pz) === 0) continue;
          cars.push([px, pz, Math.atan2(dx, dz) + (R() - .5) * .5 + (sd > 0 ? 0 : Math.PI)]);
        }
      }
    }
    const body = new THREE.BoxGeometry(1.8, .75, 4.5); body.translate(0, .55, 0);
    const cabin = new THREE.BoxGeometry(1.6, .6, 2.3); cabin.translate(0, 1.2, -.2);
    const wheels = []; for (const [wx, wz] of [[-.85, 1.4], [.85, 1.4], [-.85, -1.4], [.85, -1.4]]) { const w = new THREE.CylinderGeometry(.33, .33, .25, 10); w.rotateZ(Math.PI / 2); w.translate(wx, .33, wz); wheels.push(w); }
    const carG = mergeGeo([body, cabin]), wheelG = mergeGeo(wheels);
    const im = new THREE.InstancedMesh(carG, new THREE.MeshStandardMaterial({ roughness: .4, metalness: .4 }), cars.length), iw = new THREE.InstancedMesh(wheelG, stdMat('#111'), cars.length);
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), cl = new THREE.Color();
    cars.forEach(([x, z, h], k) => {
      E.set((R() - .5) * .06, h, (R() - .5) * .08); Q.setFromEuler(E); M4.compose(V3(x, 0, z), Q, V3(1, 1, 1)); im.setMatrixAt(k, M4); iw.setMatrixAt(k, M4);
      im.setColorAt(k, cl.copy(col(k % 6 === 0 ? '#e8b81c' : pick(['#1a1a1a', '#d9d9d9', '#7a1c1c', '#1f3550', '#5b5f63', '#2e3b2a', '#a9a9a9']))));
      this.addCollider(x - 2.4, z - 2.4, x + 2.4, z + 2.4, 1.6, 'car', null, [x, z, 1.4]);
    });
    this.scene.add(im, iw);
    // NYPD car with its light bar still flashing under the water
    const nearCar = this.cfg.flood && cars.filter(c => Math.hypot(c[0] - c7.x, c[1] - c7.z) < 110).sort((a, b) => Math.hypot(a[0] - c7.x, a[1] - c7.z) - Math.hypot(b[0] - c7.x, b[1] - c7.z))[3];
    if (nearCar) {
      this.copLights = [new THREE.PointLight(0xff2a2a, 0, 16, 1.6), new THREE.PointLight(0x2a5aff, 0, 16, 1.6)];
      this.copLights.forEach((l, i) => { l.position.set(nearCar[0] + (i ? .5 : -.5), 1.6, nearCar[1]); this.scene.add(l); });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .14, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, .3, .3), toneMapped: false })); bar.position.set(nearCar[0], 1.58, nearCar[1]); bar.rotation.y = nearCar[2]; this.scene.add(bar); this.copBar = bar;
    }
    this.cars = cars;
  }
  // floating debris drifting on the surge
  buildDebris() {
    const R = this.rng, c7 = V3(this.b7site.x, 0, this.b7site.z), items = [];
    const kinds = [
      [new THREE.BoxGeometry(1.2, .15, 1.0), stdMat('#8a6a46', { roughness: 1 })],          // pallet
      [new THREE.CylinderGeometry(.3, .3, .9, 10), stdMat('#2a5aa8', { roughness: .5 })],   // plastic drum
      [new THREE.SphereGeometry(.45, 7, 5), stdMat('#121212', { roughness: .35 })],         // trash bag
      [new THREE.BoxGeometry(3.2, .1, .25), stdMat('#7a6040', { roughness: 1 })],            // plank
      [new THREE.BoxGeometry(.9, .5, .6), stdMat('#c8c2b0', { roughness: .8 })],             // cooler / box
    ];
    this.debris = kinds.map(([g, m]) => { const im = new THREE.InstancedMesh(g, m, 60); im.castShadow = false; this.scene.add(im); return { im, list: [] }; });
    for (let k = 0; k < 260; k++) {
      const x = c7.x + (R() - .5) * 360, z = c7.z + (R() - .5) * 360; if (this.pointInBuilding(x, 1, z)) continue;
      const d = this.debris[k % kinds.length]; if (d.list.length >= 60) continue;
      d.list.push({ x, z, ry: R() * 6, ph: R() * 6, sp: .1 + R() * .25, rx: (R() - .5) * .4 });
    }
    for (const d of this.debris) d.im.count = d.list.length;
  }

  // ======================= sky, water, rain, lightning =======================
  buildSky() {
    const Wt = this.W, v3 = a => new THREE.Vector3(...a);
    this.skyU = { flash: { value: 0 }, time: { value: 0 }, flashDir: { value: V3(0, .4, -1).normalize() }, under: { value: 0 }, zen: { value: v3(Wt.zen) }, cloudC: { value: v3(Wt.cloud) }, glowC: { value: v3(Wt.glow) }, cover: { value: Wt.cover }, stars: { value: Wt.stars }, sunDir: { value: v3(Wt.sun || [0, -1, 0]).normalize() }, sunOn: { value: Wt.sun ? 1 : 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform float flash, time, under, cover, stars, sunOn; uniform vec3 flashDir, zen, cloudC, glowC, sunDir; varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.07; a*=.5; } return v; }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec2 uv = d.xz / (max(h, 0.0) + .18) * 1.6;
          float cl = fbm(uv + vec2(time * .035, time * .012)); float cl2 = fbm(uv * 2.3 - vec2(time * .05, 0.0));
          vec3 c = mix(zen, cloudC, smoothstep(.3, .85, cl) * cover + (1.0 - cover) * smoothstep(.55, .95, cl) * .5);
          c += glowC * smoothstep(.2, 0.0, h) * .6;                                // city glow on the low sky
          if (stars > 0.0) { vec2 sp = floor(d.xz / (h + .3) * 260.0); float st = step(.9975, hash(sp)) * smoothstep(.05, .4, h) * (1.0 - smoothstep(.4, .8, cl) * cover); c += vec3(.8, .85, 1.0) * st * stars * (.6 + .4 * sin(time * 3.0 + hash(sp + 1.0) * 40.0)); }
          if (sunOn > 0.0) { float sd = max(dot(d, sunDir), 0.0); c += vec3(1.0, .55, .25) * pow(sd, 8.0) * .55 + vec3(1.0, .8, .55) * pow(sd, 400.0) * 3.0; c = mix(c, c * vec3(1.15, .95, .85), smoothstep(.3, 0.0, h)); }
          float f = flash * (.55 + .45 * pow(max(dot(d, flashDir), 0.0), 3.0)) * (.4 + cl2);
          c += vec3(.75, .8, 1.0) * f * 1.6;
          c = mix(c, vec3(.01, .015, .02), smoothstep(0.0, -.15, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), mat); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
  }
  buildLights() {
    const Wt = this.W;
    this.hemi = new THREE.HemisphereLight(Wt.hemi[0], Wt.hemi[1], Wt.hemi[2]); this.scene.add(this.hemi); this.hemiBase = Wt.hemi[2];
    this.moon = new THREE.DirectionalLight(Wt.sun ? 0xffc89a : 0x8090b0, Wt.sun ? 1.1 : Wt.moon); this.moon.position.set(-300, 400, -200); this.scene.add(this.moon);
    if (Wt.sun) this.moon.position.set(Wt.sun[0] * 500, Math.max(.12, Wt.sun[1]) * 500, Wt.sun[2] * 500);
    this.bolt = new THREE.DirectionalLight(0xdfe8ff, 0); this.bolt.castShadow = true;
    const s = this.bolt.shadow; s.mapSize.set(2048, 2048); s.camera.left = s.camera.bottom = -70; s.camera.right = s.camera.top = 70; s.camera.near = 10; s.camera.far = 900; s.bias = -.0005; s.normalBias = this.cfg.flood ? .05 : .45;
    this.scene.add(this.bolt, this.bolt.target);
    this.scene.fog = new THREE.FogExp2(Wt.fog[0], Wt.fog[1]);
    this.fogAir = { c: new THREE.Color(Wt.fog[0]), d: Wt.fog[1] }; this.fogWater = { c: new THREE.Color(this.cfg.flood ? 0x061210 : 0x07120f), d: .13 };
    // a fire burning across Gowanus (seen as an orange glow) and a transformer that keeps arcing — the storm only
    this.fire = new THREE.PointLight(0xff7a2a, this.cfg.flood ? 3 : 0, 260, 1.4); this.fire.position.set(1400, 30, -900); if (this.cfg.flood) this.scene.add(this.fire);
    this.arc = new THREE.PointLight(0x9fd0ff, 0, 90, 1.5); if (this.cfg.flood) this.scene.add(this.arc); this.arcT = this.cfg.flood ? 9 : Infinity;
  }
  buildWater() {
    const R = this.rng, N = 256;
    const hgt = new Float32Array(N * N);
    for (let o = 0; o < 6; o++) { const f = 2 ** o * 2, a = 1 / (o + 1.4); const ph = R() * 9, ph2 = R() * 9; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) hgt[j * N + i] += a * (Math.sin((i / N) * Math.PI * 2 * f + ph) * Math.cos((j / N) * Math.PI * 2 * f * .7 + ph2) + Math.sin(((i + j) / N) * Math.PI * 2 * f * .5 + ph2)); }
    const nm = canvasTex(N, N, (g) => { const id = g.createImageData(N, N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const dx = hgt[j * N + (i + 1) % N] - hgt[j * N + (i + N - 1) % N], dz = hgt[((j + 1) % N) * N + i] - hgt[((j + N - 1) % N) * N + i]; const o = (j * N + i) * 4; id.data[o] = 128 + dx * 60; id.data[o + 1] = 128 + dz * 60; id.data[o + 2] = 255; id.data[o + 3] = 255; } g.putImageData(id, 0, 0); }, false, true);
    nm.repeat.set(220, 220); this.waterNormal = nm;
    // storm-sky reflection so the flood reads as water: dark clouds, sodium glow of the city at the horizon
    const face = (top) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'); const gr = g2.createLinearGradient(0, 0, 0, 64); if (top === 1) { gr.addColorStop(0, '#20262e'); gr.addColorStop(1, '#20262e'); } else if (top === -1) { gr.addColorStop(0, '#030405'); gr.addColorStop(1, '#030405'); } else { gr.addColorStop(0, '#1d232b'); gr.addColorStop(.46, '#3b3a3b'); gr.addColorStop(.5, '#5a4836'); gr.addColorStop(.56, '#121314'); gr.addColorStop(1, '#030405'); } g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64); return c; };
    this.waterEnv = new THREE.CubeTexture([face(0), face(0), face(1), face(-1), face(0), face(0)]); this.waterEnv.encoding = THREE.sRGBEncoding; this.waterEnv.needsUpdate = true;
    this.waterMat = new THREE.MeshStandardMaterial({ color: col('#16201f'), roughness: .16, metalness: .25, envMap: this.waterEnv, envMapIntensity: 1.6, normalMap: nm, normalScale: new THREE.Vector2(.8, .8), side: THREE.DoubleSide, transparent: true, opacity: .97 });
    this.waterMatFree = this.waterMat.clone();      // for water inside sets (sumps, flooded tunnels): no land mask
    if (!this.cfg.flood) {   // the river surface stops at the shore: mask it with the ground classes
      const m = this.meta, gw = NYC.gw, gh = NYC.gh, data = new Uint8Array(gw * gh);
      for (let i = 0; i < gw * gh; i++) data[i] = NYC.grid[i] ? 0 : 255;
      const mt = new THREE.DataTexture(data, gw, gh, THREE.LuminanceFormat); mt.magFilter = THREE.LinearFilter; mt.minFilter = THREE.LinearFilter; mt.flipY = false; mt.needsUpdate = true;
      const U = { wMask: { value: mt }, wBox: { value: new THREE.Vector4(m.minX, m.minZ, m.maxX - m.minX, m.maxZ - m.minZ) } };
      this.waterMat.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D wMask; uniform vec4 wBox; varying vec3 vWPos;').replace('void main() {', 'void main() {\n vec2 wuv = (vWPos.xz - wBox.xy) / wBox.zw; if (wuv.x > 0.0 && wuv.x < 1.0 && wuv.y > 0.0 && wuv.y < 1.0 && texture2D(wMask, wuv).r < .5) discard;');
      };
    }
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), this.waterMat); this.waterMesh.rotation.x = -Math.PI / 2; this.waterMesh.position.y = this.water; this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);
  }
  // GPU rain: streaks in a box that follows the camera
  buildRain() {
    const N = Math.max(1, Math.round(9000 * this.W.rain)), pos = new Float32Array(N * 6), seg = new Float32Array(N * 2), R = this.rng;
    for (let i = 0; i < N; i++) { const x = (R() - .5) * 70, y = R() * 45, z = (R() - .5) * 70; pos.set([x, y, z, x, y, z], i * 6); seg[i * 2] = 0; seg[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seg', new THREE.BufferAttribute(seg, 1));
    this.rainU = { time: { value: 0 }, cam: { value: V3() }, wind: { value: new THREE.Vector2(...this.W.wind) }, flash: { value: 0 }, water: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.rainU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute float seg; uniform float time, water; uniform vec3 cam; uniform vec2 wind; varying float vA;
        void main(){ vec3 p = position; float sp = 24.0; float y = mod(p.y - time * sp, 45.0);
          vec3 w = vec3(cam.x + mod(p.x - cam.x + 35.0 + time * wind.x, 70.0) - 35.0, cam.y - 14.0 + y, cam.z + mod(p.z - cam.z + 35.0 + time * wind.y, 70.0) - 35.0);
          w += vec3(wind.x, -sp, wind.y) * .045 * seg;
          vA = (1.0 - seg * .6) * step(water, w.y);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: 'uniform float flash; varying float vA; void main(){ gl_FragColor = vec4(vec3(.62,.68,.78) + flash, (.22 + flash * .5) * vA); }',
    });
    this.rain = new THREE.LineSegments(g, m); this.rain.frustumCulled = false; this.scene.add(this.rain);
    // lightning bolt mesh
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 8), toneMapped: false, fog: false, transparent: true, opacity: 0 });
    this.boltMesh = new THREE.Group(); this.scene.add(this.boltMesh);
  }
  strike(camPos) {
    const R = this.rng, ang = R() * Math.PI * 2, d = 600 + R() * 2400;
    const p = V3(camPos.x + Math.cos(ang) * d, 0, camPos.z + Math.sin(ang) * d);
    this.flashSeq = [[.07, 1], [.06, .15], [.12, .9], [.08, .3], [.22, .6], [.5, 0]]; this.flashI = 0; this.flashT = 0;
    this.skyU.flashDir.value.set(p.x - camPos.x, 500, p.z - camPos.z).normalize();
    this.bolt.position.set(camPos.x + (p.x - camPos.x) * .1, 400, camPos.z + (p.z - camPos.z) * .1);
    // jagged bolt
    while (this.boltMesh.children.length) { const c = this.boltMesh.children.pop(); c.geometry.dispose(); }
    if (R() < .6) {
      let x = p.x, z = p.z, y = 700; const pts = [];
      while (y > 0) { pts.push(V3(x, y, z)); y -= 25 + R() * 50; x += (R() - .5) * 60; z += (R() - .5) * 60; }
      pts.push(V3(x, 0, z));
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, L, 4), this.boltMat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); this.boltMesh.add(m); }
    }
    const delay = Math.min(4.5, d / 600) + R() * .4;
    setTimeout(() => HGA.thunder(clamp(1.4 - d / 3000, .35, 1.1)), delay * 1000);
  }
  setWater(level, rate = .05) { this.waterTarget = level; this.waterRate = rate; }
  // concrete bulkheads along the rivers, canals and the sea (not in the flood)
  buildShore() {
    const G = new GeoBuilder(), C = new THREE.Color(1, 1, 1), cuts = [];
    for (const s0 of this.cfg.sites) if (s0.shoreCut) cuts.push([this.site[s0.name], s0.shoreCut]);
    const cut = (x, z) => { for (const [S, c] of cuts) { const [lx, lz] = S.local(x, z); if (lx > c[0] && lx < c[2] && lz > c[1] && lz < c[3]) return true; } return false; };
    for (const r of NYC.rh.shore || []) {
      for (let i = 0; i < r.length - 2; i += 2) {
        const ax = r[i] / 10, az = r[i + 1] / 10, bx = r[i + 2] / 10, bz = r[i + 3] / 10, L = Math.hypot(bx - ax, bz - az); if (L < .1) continue;
        const nx = (bz - az) / L, nz = -(bx - ax) / L, n = Math.ceil(L / 2);
        for (let k = 0; k < n; k++) {     // in 2 m pieces so a mission site can open a culvert in the wall
          const t0 = k / n, t1 = (k + 1) / n, x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
          const mx = .5 * (x0 + x1), mz = .5 * (z0 + z1);
          if (cut(mx, mz) || this.classAt(mx + nx * 4, mz + nz * 4) === 2 || this.classAt(mx - nx * 4, mz - nz * 4) === 2) continue;
          G.quad([x0, -12, z0], [x1, -12, z1], [x1, .06, z1], [x0, .06, z0], [nx, 0, nz], [L * t0 / 3, -3], [L * t1 / 3, -3], [L * t1 / 3, 0], [L * t0 / 3, 0], C);
        }
      }
    }
    const m = new THREE.MeshStandardMaterial({ map: this.texConcrete, vertexColors: true, roughness: .95, side: THREE.DoubleSide, color: new THREE.Color(.62, .6, .56) });
    const mesh = new THREE.Mesh(G.geometry(), m); mesh.receiveShadow = true; this.scene.add(mesh);
  }

  update(dt, camPos) {
    this.elapsed += dt; const t = this.elapsed;
    // flood level
    const dw = this.waterTarget - this.water; this.water += clamp(dw, -this.waterRate * dt, this.waterRate * dt);
    this.waterMesh.position.y = this.water + Math.sin(t * .7) * .02;
    this.waterNormal.offset.set(t * .012, t * .02); this.waterMat.envMapIntensity = 1.6 + this.flash * 6;
    // lightning
    this.nextStrike -= dt; const SK = this.W.strike;
    if (SK && this.nextStrike <= 0) { this.nextStrike = SK[0] + this.rng() * SK[1]; this.strike(camPos); }
    let f = 0;
    if (this.flashSeq) { this.flashT += dt; while (this.flashSeq && this.flashT > this.flashSeq[this.flashI][0]) { this.flashT -= this.flashSeq[this.flashI][0]; this.flashI++; if (this.flashI >= this.flashSeq.length) this.flashSeq = null; } if (this.flashSeq) f = this.flashSeq[this.flashI][1]; }
    this.flash = f;
    this.boltMat.opacity = f > .5 ? 1 : 0;
    this.bolt.intensity = f * 5.5; this.bolt.target.position.copy(camPos); this.bolt.position.y = 400;
    const fx = this.bolt.position.x - camPos.x, fz = this.bolt.position.z - camPos.z, fl = Math.hypot(fx, fz) || 1;
    this.bolt.position.set(camPos.x + fx / fl * 150, 400, camPos.z + fz / fl * 150);
    this.skyU.flash.value = f; this.skyU.time.value = t; this.rainU.flash.value = f * .4;
    this.hemi.intensity = this.deep ? .02 : (this.indoor ? (this.cfg.flood ? .06 : this.hemiBase * .35) : (this.cfg.flood ? .3 : this.hemiBase)) + f * (this.indoor ? .25 : 1.6);
    if (this.moonBase === undefined) this.moonBase = this.moon.intensity;
    this.moon.intensity = this.deep ? 0 : this.moonBase;
    for (const m of this.skyMat) m.color.setScalar(.6 + f * 2.5);
    this.waterMesh.position.x = camPos.x; this.waterMesh.position.z = camPos.z; this.waterNormal.offset.set(t * .012 + camPos.x / 9000 * 220 % 1, t * .02 - camPos.z / 9000 * 220 % 1);
    // underwater switch
    const LW = this.waterAt(camPos), uw = camPos.y < LW - .02; this.underwater = uw;
    if (!this.fogDeep) this.fogDeep = { c: new THREE.Color(0x020304), d: .045 };
    const F = uw ? this.fogWater : this.deep ? this.fogDeep : this.fogAir; this.scene.fog.color.copy(F.c); this.scene.fog.density = F.d * (uw && f > 0 ? .8 : 1);
    this.rain.visible = !uw && this.W.rain > 0 && !this.roofed; this.rainU.time.value = t; this.rainU.cam.value.copy(camPos); this.rainU.water.value = this.water;
    this.sky.position.copy(camPos);
    // fire flicker, transformer arcs, cop lights, aviation lights
    if (this.cfg.flood) this.fire.intensity = 2.6 + Math.sin(t * 9) * .5 + Math.sin(t * 23) * .3;
    if (this.lampPool && (this.lampT -= dt) <= 0) {      // the nearest street lights cast real light
      this.lampT = .4; const near = this.lamps.map(L => [Math.hypot(L[0] - camPos.x, L[1] - camPos.z), L]).sort((a, b) => a[0] - b[0]);
      this.lampPool.forEach((l, k) => { const n = near[k]; if (n && n[0] < 120) { const [x, z, r] = n[1]; l.position.set(x + Math.sin(r) * 2.6, 8.6, z + Math.cos(r) * 2.6); l.intensity = 1.5; } else l.intensity = 0; });
    }
    this.arcT -= dt;
    if (this.arcT <= 0) { this.arcT = 14 + this.rng() * 20; const L = this.lamps[(this.rng() * this.lamps.length) | 0]; if (L && Math.hypot(L[0] - camPos.x, L[1] - camPos.z) < 220) { this.arc.position.set(L[0], 9, L[1]); this.arcFlash = .5; HGA.arc(clamp(1 - Math.hypot(L[0] - camPos.x, L[1] - camPos.z) / 220, .1, 1)); } }
    if (this.arcFlash > 0) { this.arcFlash -= dt; this.arc.intensity = this.arcFlash > 0 ? (Math.random() * 8) : 0; }
    if (this.copLights) { const ph = (t * 2.2) % 1; this.copLights[0].intensity = ph < .5 ? 3.2 : 0; this.copLights[1].intensity = ph >= .5 ? 3.2 : 0; this.copBar.material.color.setRGB(ph < .5 ? 3 : .2, .2, ph < .5 ? .2 : 3); }
    this.avMat.color.setRGB(Math.sin(t * 2.4) > .2 ? 4 : .25, .15, .1);
    // debris bobbing on the surface
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = V3(), S = V3(1, 1, 1);
    for (const d of this.debris) {
      d.list.forEach((o, k) => { o.x += o.sp * dt * .8; o.z += o.sp * dt * .3; E.set(o.rx + Math.sin(t * 1.3 + o.ph) * .15, o.ry + t * .02, Math.sin(t * 1.1 + o.ph) * .15); Q.setFromEuler(E); M4.compose(P.set(o.x, this.water + .05 + Math.sin(t * 1.7 + o.ph) * .08, o.z), Q, S); d.im.setMatrixAt(k, M4); });
      d.im.instanceMatrix.needsUpdate = true;
    }
    // culling
    const VR = this.cfg.view;
    for (const g of this.cityChunks) g.visible = Math.hypot(g.userData.c.x - camPos.x, g.userData.c.z - camPos.z) < VR;
    for (const s of this.sets) s.update(dt, t);
  }
}
