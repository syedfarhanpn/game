'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — interior sets: a general builder for playable spaces (warehouses,
// tunnels, banquet halls, the tower top, subway tunnels) with box collision in a
// local frame (y is absolute), shared materials, props and detailed vehicles.
// Same query API as Building7, so the diver controller works in all of them.
// ---------------------------------------------------------------------------
let _SETMAT = null;
function setMats(world) {
  if (_SETMAT) return _SETMAT;
  const R = world.rng, T = (w, h, f, srgb = true) => canvasTex(w, h, f, srgb, true);
  const noise = (c, w, h, n, a, base) => { for (let i = 0; i < n; i++) { const v = base + R() * 60 | 0; c.fillStyle = `rgba(${v},${v},${v},${a})`; c.fillRect(R() * w, R() * h, 2, 2); } };
  const m = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .85 }, o));
  _SETMAT = {
    conc: m({ map: T(128, 128, (c, w, h) => { c.fillStyle = '#8a877f'; c.fillRect(0, 0, w, h); noise(c, w, h, 2500, .5, 100); }) }),
    slab: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#6f6c66'; c.fillRect(0, 0, w, h); noise(c, w, h, 4000, .4, 80); c.strokeStyle = 'rgba(30,30,30,.4)'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } c.fillStyle = 'rgba(230,190,40,.6)'; c.fillRect(0, 120, w, 8); }), roughness: .9 }),
    block: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#9b978d'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(40,40,40,.35)'; c.lineWidth = 3; for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); const o = (y / 32) % 2 ? 32 : 0; for (let x = o; x < w; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } } noise(c, w, h, 2000, .3, 90); }) }),
    tile: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#d8d6cc'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(80,80,70,.45)'; c.lineWidth = 2; for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 16); c.lineTo(w, i * 16); c.stroke(); } c.fillStyle = '#7a8c96'; c.fillRect(0, h * .6, w, 10); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(60,50,30,${R() * .1})`; c.fillRect(R() * w, R() * h, 3, 3); } }), roughness: .35 }),
    metal: m({ map: T(128, 128, (c, w, h) => { c.fillStyle = '#6d7277'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { c.fillStyle = x % 16 ? '#5d6267' : '#7a7f84'; c.fillRect(x, 0, 4, h); } }), roughness: .55, metalness: .5 }),
    rust: m({ map: T(128, 128, (c, w, h) => { c.fillStyle = '#6b4a36'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${120 + R() * 60 | 0},${60 + R() * 30 | 0},${30},${R() * .4})`; c.fillRect(R() * w, R() * h, 3, 3); } }), roughness: .9, metalness: .3 }),
    wood: m({ map: T(128, 128, (c, w, h) => { for (let y = 0; y < h; y += 8) { const v = 90 + R() * 40 | 0; c.fillStyle = `rgb(${v + 30},${v + 5},${v - 25})`; c.fillRect(0, y, w, 7); } }), roughness: .8 }),
    plank: m({ map: T(128, 128, (c, w, h) => { for (let x = 0; x < w; x += 16) { const v = 70 + R() * 40 | 0; c.fillStyle = `rgb(${v + 25},${v + 8},${v - 15})`; c.fillRect(x, 0, 15, h); } }), roughness: .9 }),
    carpet: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#5a1420'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(214,170,80,.55)'; c.lineWidth = 3; for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x + 32, y + 6); c.lineTo(x + 58, y + 32); c.lineTo(x + 32, y + 58); c.lineTo(x + 6, y + 32); c.closePath(); c.stroke(); } }), roughness: 1 }),
    marble: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#e8e4dc'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,110,100,.25)'; c.lineWidth = 1.5; for (let i = 0; i < 26; i++) { c.beginPath(); let x = R() * w, y = R() * h; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - .5) * 60; y += R() * 40; c.lineTo(x, y); } c.stroke(); } c.strokeStyle = 'rgba(80,70,60,.3)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); }), roughness: .18 }),
    paint: m({ map: T(128, 128, (c, w, h) => { c.fillStyle = '#c8c3b4'; c.fillRect(0, 0, w, h); noise(c, w, h, 600, .08, 120); }) }),
    plaster: m({ map: T(256, 256, (c, w, h) => { c.fillStyle = '#d9cbb0'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a1e24'; c.fillRect(0, h * .62, w, h * .38); c.fillStyle = '#c9a24a'; c.fillRect(0, h * .62 - 4, w, 6); for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(201,162,74,.5)'; c.fillRect(x + 30, 0, 4, h * .62); } }), roughness: .7 }),
    glass: new THREE.MeshStandardMaterial({ color: col('#6f8fa6'), roughness: .05, metalness: .6, transparent: true, opacity: .32 }),
    cloth: m({ roughness: 1 }),
    plain: m({ roughness: .8 }),
    gold: m({ roughness: .3, metalness: .8 }),
    rubber: m({ roughness: .9 }),
    dark: m({ roughness: .6 }),
  };
  return _SETMAT;
}

class GameSet {
  // site: {x, z, rot} (y of everything is absolute); bounds in local space {x0,x1,y0,y1,z0,z1}
  constructor(world, site, bounds, opts = {}) {
    this.w = world; this.solids = []; this.geo = {}; this.anims = []; this.lights = [];
    this.bounds = bounds; this.waters = []; this.dark = opts.dark || false; this.name = opts.name || 'set';
    this.roofed = opts.roofed !== false; this.ownFloor = opts.ownFloor === undefined ? true : opts.ownFloor; this.underground = !!opts.underground; this.tight = !!opts.tight;
    const g = this.group = new THREE.Group(); g.position.set(site.x, 0, site.z); g.rotation.y = site.rot || 0; world.scene.add(g); g.updateMatrixWorld(true);
    this.inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); this._v = V3();
    this.M = Object.assign({}, setMats(world)); this.castShadow = opts.castShadow !== false;
  }
  G(k) { return this.geo[k] || (this.geo[k] = new GeoBuilder()); }
  S(x0, y0, z0, x1, y1, z1, mat = 'conc', tag = '', color, o = {}) {
    const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag, on: true };
    this.solids.push(s);
    if (mat) this.G(mat).box(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, color ? (color.isColor ? color : col(color)) : new THREE.Color(1, 1, 1), Object.assign({ sx: 3, sy: 3, bottom: true }, o));
    return s;
  }
  V(x0, y0, z0, x1, y1, z1, mat = 'conc', color, o = {}) { this.G(mat).box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), color ? (color.isColor ? color : col(color)) : new THREE.Color(1, 1, 1), Object.assign({ sx: 3, sy: 3, bottom: true }, o)); }
  floor(x0, z0, x1, z1, y, mat = 'slab', th = .3, color) { return this.S(x0, y - th, z0, x1, y, z1, mat, 'floor', color, { sx: 4, sy: 4 }); }
  // wall along x at constant z (or along z at constant x), with gaps [[a,b,top]] (top = lintel height, default full gap)
  wallX(z, x0, x1, y0, y1, gaps = [], mat = 'block', th = .25, color, o = {}) {
    let x = x0; for (const [a, b, top] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > x) this.S(x, y0, z - th / 2, a, y1, z + th / 2, mat, 'wall', color, o); if (top !== undefined && top < y1) this.S(a, top, z - th / 2, b, y1, z + th / 2, mat, 'wall', color, o); x = b; }
    if (x < x1) this.S(x, y0, z - th / 2, x1, y1, z + th / 2, mat, 'wall', color, o);
  }
  wallZ(x, z0, z1, y0, y1, gaps = [], mat = 'block', th = .25, color, o = {}) {
    let z = z0; for (const [a, b, top] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > z) this.S(x - th / 2, y0, z, x + th / 2, y1, a, mat, 'wall', color, o); if (top !== undefined && top < y1) this.S(x - th / 2, top, a, x + th / 2, y1, b, mat, 'wall', color, o); z = b; }
    if (z < z1) this.S(x - th / 2, y0, z, x + th / 2, y1, z1, mat, 'wall', color, o);
  }
  // a closed room: floor, ceiling and four walls; doors: {n:[[a,b,top]], s:..., e:..., w:...} (n = -z side)
  room(x0, z0, x1, z1, y, h, o = {}) {
    const m = o.wall || 'block', th = o.th || .25;
    if (o.floor !== false) this.floor(x0, z0, x1, z1, y, o.floorMat || 'slab', .3, o.floorColor);
    if (o.ceil !== false) this.S(x0, y + h, z0, x1, y + h + .3, z1, o.ceilMat || 'conc', 'ceil', o.ceilColor || '#8a8780');
    const d = o.doors || {};
    this.wallX(z0, x0, x1, y, y + h, d.n || [], m, th, o.wallColor); this.wallX(z1, x0, x1, y, y + h, d.s || [], m, th, o.wallColor);
    this.wallZ(x0, z0, z1, y, y + h, d.w || [], m, th, o.wallColor); this.wallZ(x1, z0, z1, y, y + h, d.e || [], m, th, o.wallColor);
  }
  stairs(xa, xb, zBottom, zTop, yBottom, yTop, steps, mat = 'conc') {
    const dz = (zTop - zBottom) / steps, dy = (yTop - yBottom) / steps;
    for (let k = 0; k < steps; k++) { const za = zBottom + dz * k; this.S(xa, yBottom - .01, Math.min(za, za + dz), xb, yBottom + dy * (k + 1), Math.max(za, za + dz), mat, 'stair'); }
  }
  stairsX(zA, zB, xBottom, xTop, yBottom, yTop, steps, mat = 'conc') {
    const dx = (xTop - xBottom) / steps, dy = (yTop - yBottom) / steps;
    for (let k = 0; k < steps; k++) { const xa = xBottom + dx * k; this.S(Math.min(xa, xa + dx), yBottom - .01, zA, Math.max(xa, xa + dx), yBottom + dy * (k + 1), zB, mat, 'stair'); }
  }
  // a sloped driveway / tunnel ramp along x: smooth surface to look at, small invisible steps to walk on
  ramp(x0, x1, z0, z1, y0, y1, mat = 'slab', color, steps) {
    const n = steps || Math.max(4, Math.ceil(Math.abs(y1 - y0) / .2)), G = this.G(mat), C = color ? col(color) : new THREE.Color(1, 1, 1);
    const len = Math.hypot(x1 - x0, y1 - y0), ny = (x1 - x0) / len, nx = -(y1 - y0) / len * Math.sign(x1 - x0 || 1);
    G.quad([x0, y0, z1], [x1, y1, z1], [x1, y1, z0], [x0, y0, z0], [nx, Math.abs(ny), 0], [0, z1 / 4], [len / 4, z1 / 4], [len / 4, z0 / 4], [0, z0 / 4], C);
    const d = .95; G.quad([x0, y0 - d, z1], [x1, y1 - d, z1], [x1, y1, z1], [x0, y0, z1], [0, 0, 1], [0, 0], [len / 4, 0], [len / 4, .25], [0, .25], C); G.quad([x1, y1 - d, z0], [x0, y0 - d, z0], [x0, y0, z0], [x1, y1, z0], [0, 0, -1], [0, 0], [len / 4, 0], [len / 4, .25], [0, .25], C);   // curb faces
    for (let k = 0; k < n; k++) { const xa = lerp(x0, x1, k / n), xb = lerp(x0, x1, (k + 1) / n), yt = lerp(y0, y1, (k + 1) / n) - .02; this.solids.push({ x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: Math.min(y0, y1) - .6, y1: yt, z0, z1, tag: 'ramp', on: true }); }
  }
  // ---- props
  crate(x, y, z, w = 1.2, h = 1.2, d = 1.2, color = '#8a6a44', solid = true) { return solid ? this.S(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 'plank', 'crate', color) : this.V(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 'plank', color); }
  pallet(x, y, z, stack = 1) { this.V(x - .6, y, z - .5, x + .6, y + .14, z + .5, 'plank', '#7d6040'); if (stack) this.S(x - .55, y + .14, z - .45, x + .55, y + .14 + stack * .55, z + .45, 'cloth', 'load', pick(['#c9c1ad', '#9aa9b8', '#b8a07a', '#d7d2c4'])); }
  shelf(x, y, z, len, alongX = true, h = 4.5, d = 1.1) {
    const [lx, lz] = alongX ? [len / 2, d / 2] : [d / 2, len / 2];
    for (let k = 0; k < 4; k++) this.V(x - lx, y + k * 1.4 + .1, z - lz, x + lx, y + k * 1.4 + .2, z + lz, 'metal', '#2f5a8a');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.V(x + sx * lx - .05, y, z + sz * lz - .05, x + sx * lx + .05, y + h, z + sz * lz + .05, 'metal', '#e0a020');
    for (let k = 0; k < 3; k++) for (let t = -lx + .7; t < lx - .5; t += 1.3) if (Math.random() < .75) { const px = alongX ? x + t : x, pz = alongX ? z : z + t; this.V(px - .5, y + k * 1.4 + .2, pz - .4, px + .5, y + k * 1.4 + 1.2, pz + .4, 'cloth', pick(['#c9c1ad', '#9a7a52', '#b8a07a', '#6e7f8f'])); }
    this.solids.push({ x0: x - lx, x1: x + lx, y0: y, y1: y + h, z0: z - lz, z1: z + lz, tag: 'shelf', on: true });
  }
  container(x, y, z, alongX = true, color = '#a33b2b') {
    const [lx, lz] = alongX ? [6.1, 1.22] : [1.22, 6.1];
    const s = this.S(x - lx, y, z - lz, x + lx, y + 2.6, z + lz, 'rust', 'container', color, { sx: 2.6, sy: 2.6 });
    for (let t = -5.6; t <= 5.6; t += .7) this.V(alongX ? x + t - .04 : x - lx - .03, y + .1, alongX ? z - lz - .03 : z + t - .04, alongX ? x + t + .04 : x + lx + .03, y + 2.5, alongX ? z + lz + .03 : z + t + .04, 'rust', color);
    return s;
  }
  table(x, y, z, r = .9, h = .76, cloth = '#f4f1ea', solid = true) {
    this.V(x - r, y + h - .04, z - r, x + r, y + h, z + r, 'cloth', cloth); this.V(x - r - .02, y + .3, z - r - .02, x + r + .02, y + h - .04, z + r + .02, 'cloth', cloth);
    if (solid) this.solids.push({ x0: x - r, x1: x + r, y0: y, y1: y + h, z0: z - r, z1: z + r, tag: 'table', on: true });
  }
  chair(x, y, z, rot = 0, color = '#c9a24a') { const c = Math.cos(rot), s = Math.sin(rot); this.V(x - .22, y + .42, z - .22, x + .22, y + .48, z + .22, 'wood', color); this.V(x - .22 * c - .2 * s - .03, y + .48, z + .22 * s - .2 * c - .03, x - .22 * c - .2 * s + .03 + .4 * Math.abs(s), y + 1.0, z + .22 * s - .2 * c + .03 + .4 * Math.abs(c), 'wood', color); }
  desk(x, y, z, w = 1.6, d = .8, color = '#4a3b2c') { this.S(x - w / 2, y, z - d / 2, x + w / 2, y + .76, z + d / 2, 'wood', 'desk', color); }
  bar(x0, z0, x1, z1, y, h = 1.1) { this.S(x0, y, z0, x1, y + h, z1, 'wood', 'bar', '#3a2418'); this.V(x0 - .05, y + h, z0 - .05, x1 + .05, y + h + .06, z1 + .05, 'marble', '#2b2b2b'); }
  pillar(x, z, y0, y1, r = .35, mat = 'conc', color) { return this.S(x - r, y0, z - r, x + r, y1, z + r, mat, 'pillar', color); }
  // ---- lights (keep it to a handful per set)
  light(x, y, z, color = 0xffe2b0, i = 1.2, range = 14, flicker = 0, visible = true) {
    const l = new THREE.PointLight(color, i, range, 1.7); l.position.set(x, y, z); this.group.add(l); this.lights.push({ l, base: i, flicker });
    if (visible) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false })); b.position.set(x, y + .2, z); this.group.add(b); }
    return l;
  }
  strip(x0, y, z0, x1, z1, color = 0xfff1d0) { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.1, Math.abs(x1 - x0)), .06, Math.max(.1, Math.abs(z1 - z0))), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), toneMapped: false })); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); this.group.add(m); return m; }
  sign(text, x, y, z, ry, w = 2, h = .5, bg = '#111', fg = '#e8b04a', glow = false) {
    const t = canvasTex(512, Math.max(64, Math.round(512 * h / w)), (c, cw, ch) => { c.fillStyle = bg; c.fillRect(0, 0, cw, ch); let fs = ch * .62; c.font = `800 ${fs}px Inter, sans-serif`; while (c.measureText(text).width > cw * .9 && fs > 10) { fs -= 3; c.font = `800 ${fs}px Inter, sans-serif`; } c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch / 2 + 2); }, true, false);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: .7 }));
    m.position.set(x, y, z); m.rotation.y = ry; this.group.add(m); return m;
  }
  // a body of water inside the set (a sump, a flooded tunnel): rectangle in local x/z at height y
  addWater(x0, z0, x1, z1, y, mesh = true) {
    this.waters.push([x0, z0, x1, z1, y]);
    if (!mesh) return null;
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), this.w.waterMatFree); wm.rotation.x = -Math.PI / 2; wm.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); wm.receiveShadow = true; this.group.add(wm);
    return wm;
  }
  add(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; this.group.add(obj); return obj; }
  finish() {
    for (const [k, G] of Object.entries(this.geo)) { if (!G.p.length) continue; const mesh = new THREE.Mesh(G.geometry(), this.M[k] || this.M.plain); mesh.castShadow = this.castShadow; mesh.receiveShadow = true; this.group.add(mesh); }
    return this;
  }
  // ---- queries (local space; y absolute)
  toLocal(v) { return this._v.copy(v).applyMatrix4(this.inv); }
  toWorld(v) { return v.clone().applyMatrix4(this.group.matrixWorld); }
  L(x, y, z) { return this.toWorld(V3(x, y, z)); }
  near(vw, m = 3) { const l = this.toLocal(vw), b = this.bounds; return l.x > b.x0 - m && l.x < b.x1 + m && l.z > b.z0 - m && l.z < b.z1 + m && l.y > b.y0 - m && l.y < b.y1 + m; }
  inside(vw) { const l = this.toLocal(vw), b = this.bounds; return l.x > b.x0 && l.x < b.x1 && l.z > b.z0 && l.z < b.z1 && l.y > b.y0 && l.y < b.y1; }
  resolve(pl, r, h, canStep) {
    let grounded = false, ceil = false;
    for (let it = 0; it < 2; it++) for (const s of this.solids) {
      if (!s.on) continue;
      if (pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1 || pl.y + h <= s.y0 || pl.y >= s.y1) continue;
      const up = s.y1 - pl.y, down = pl.y + h - s.y0, px0 = pl.x + r - s.x0, px1 = s.x1 - (pl.x - r), pz0 = pl.z + r - s.z0, pz1 = s.z1 - (pl.z - r);
      const mx = Math.min(px0, px1), mz = Math.min(pz0, pz1);
      if (canStep && up <= .48 && pl.y + .05 >= s.y0) { pl.y = s.y1; grounded = true; continue; }
      const m = Math.min(up, down, mx, mz);
      if (m === up) { pl.y += up; grounded = true; } else if (m === down) { pl.y -= down; ceil = true; } else if (m === mx) pl.x += px0 < px1 ? -px0 : px1; else pl.z += pz0 < pz1 ? -pz0 : pz1;
    }
    return { grounded, ceil };
  }
  floorBelow(pl, r = .2) { let best = -Infinity; for (const s of this.solids) { if (!s.on || pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1) continue; if (s.y1 <= pl.y + .05 && s.y1 > best) best = s.y1; } return best === -Infinity ? null : best; }
  ceilingAbove(pl, y, r = .2) { let best = Infinity; for (const s of this.solids) { if (!s.on || pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1) continue; if (s.y0 >= y - .01 && s.y0 < best) best = s.y0; } return best; }
  pointSolid(pl) { for (const s of this.solids) if (s.on && pl.x > s.x0 && pl.x < s.x1 && pl.y > s.y0 && pl.y < s.y1 && pl.z > s.z0 && pl.z < s.z1) return true; return false; }
  // segment visibility test in world space (for guard sight lines)
  blocked(a, b) { const la = this.toLocal(a).clone(), lb = this.toLocal(b).clone(), n = Math.ceil(la.distanceTo(lb) / .35); for (let i = 1; i < n; i++) { const p = la.clone().lerp(lb, i / n); if (this.pointSolid(p)) return true; } return false; }
  update(dt, t) { for (const L of this.lights) if (L.flicker) L.l.intensity = L.base * (Math.sin(t * 17 + L.flicker * 9) > -.75 ? 1 : .15); for (const a of this.anims) a(dt, t); }
}

// ---------------- detailed vehicles (props and cutscene cars) ----------------
function makeVehicle(kind = 'sedan', color = '#2b2f36', o = {}) {
  const g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: col(color), roughness: .32, metalness: .55 }), glass = new THREE.MeshStandardMaterial({ color: col('#0d1218'), roughness: .05, metalness: .8, transparent: !!o.clear, opacity: o.clear ? .28 : 1, depthWrite: !o.clear }), tyre = stdMat('#111', { roughness: .9 }), chrome = stdMat('#9aa0a6', { metalness: .9, roughness: .25 });
  const head = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.8), toneMapped: false }), tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, .1, .1), toneMapped: false });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const D = { sedan: [1.85, .7, 4.7, 1.6, .55, 2.5, -.2], taxi: [1.85, .7, 4.9, 1.6, .58, 2.6, -.2], suv: [2.0, .95, 4.9, 1.85, .75, 3.0, -.3], van: [2.05, 1.9, 5.6, 1.95, .1, 2.0, 2.0], bus: [2.6, 2.6, 12.0, 2.5, .2, 0, 0] }[kind] || [1.85, .7, 4.7, 1.6, .55, 2.5, -.2];
  const [W, H, L, cw, ch, cl, cz] = D, ground = .32;
  if (kind === 'van' && o.clear) {        // a cab you can see into (for the cutscenes)
    add(new THREE.BoxGeometry(W, H, L - 1.75), paint, 0, ground + H / 2, -.875);
    add(new THREE.BoxGeometry(W, .95, 1.75), paint, 0, ground + .475, L / 2 - .875);
    add(new THREE.BoxGeometry(W, .12, 1.45), paint, 0, ground + H - .06, L / 2 - 1.0);
    for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(.08, H - .95, .1), paint, sx * (W / 2 - .04), ground + .95 + (H - .95) / 2, L / 2 - .3); add(new THREE.BoxGeometry(.03, H - 1.08, 1.3), glass, sx * (W / 2 - .02), ground + .95 + (H - 1.08) / 2, L / 2 - 1.05); }
    const ws = add(new THREE.BoxGeometry(W - .14, H - 1.02, .03), glass, 0, ground + .95 + (H - 1.02) / 2, L / 2 - .34); ws.rotation.x = -.22;
    const seat = stdMat('#1a1a1a', { roughness: .9 }); for (const sx of [-.48, .48]) { add(new THREE.BoxGeometry(.55, .5, .55), seat, sx, ground + .55, L / 2 - 1.3); add(new THREE.BoxGeometry(.55, .7, .12), seat, sx, ground + 1.1, L / 2 - 1.6); }
    add(new THREE.BoxGeometry(W - .1, .3, .4), stdMat('#202020'), 0, ground + 1.0, L / 2 - .5);
    const stripe = add(new THREE.BoxGeometry(W + .01, .14, L - 2), new THREE.MeshStandardMaterial({ color: col('#c98a2a'), roughness: .5 }), 0, ground + .75, -.9);
  } else add(new THREE.BoxGeometry(W, H, L), paint, 0, ground + H / 2, 0);
  if (kind === 'van' && !o.clear) { add(new THREE.BoxGeometry(W - .02, .7, 1.2), glass, 0, ground + H - .55, L / 2 - .9); add(new THREE.BoxGeometry(W + .02, .55, .9), glass, 0, ground + H - .6, L / 2 - 1.9); }
  else if (kind === 'bus') { for (let z = -L / 2 + 1.2; z < L / 2 - 1; z += 1.25) for (const s of [-1, 1]) { add(new THREE.BoxGeometry(.04, .8, 1.0), glass, s * (W / 2 + .01), ground + H - .9, z); for (let b = -.4; b <= .41; b += .2) add(new THREE.BoxGeometry(.06, .82, .04), chrome, s * (W / 2 + .03), ground + H - .9, z + b); } add(new THREE.BoxGeometry(W - .3, 1.0, .04), glass, 0, ground + H - .9, L / 2 + .01); }
  else { add(new THREE.BoxGeometry(cw, ch, cl), glass, 0, ground + H + ch / 2, cz); add(new THREE.BoxGeometry(cw - .05, .05, cl - .3), paint, 0, ground + H + ch + .02, cz); }
  if (kind === 'taxi') { const s = add(new THREE.BoxGeometry(.7, .2, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.6, 1.2), toneMapped: false }), 0, ground + H + ch + .14, cz); }
  for (const [x, z] of [[-W / 2 + .05, L / 2 - .9], [W / 2 - .05, L / 2 - .9], [-W / 2 + .05, -L / 2 + 1.0], [W / 2 - .05, -L / 2 + 1.0]]) { const w = add(new THREE.CylinderGeometry(.34, .34, .26, 14), tyre, x, .34, z); w.rotation.z = Math.PI / 2; }
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(.32, .14, .04), head, s * (W / 2 - .3), ground + H * .55, L / 2 + .01); add(new THREE.BoxGeometry(.3, .14, .04), tail, s * (W / 2 - .3), ground + H * .6, -L / 2 - .01); }
  add(new THREE.BoxGeometry(W + .04, .14, .12), chrome, 0, ground + .12, L / 2); add(new THREE.BoxGeometry(W + .04, .14, .12), chrome, 0, ground + .12, -L / 2);
  g.userData = { W, L, H: ground + H + ch, kind };
  return g;
}

// Building 7 (Mission 1) predates GameSet: give it the sight-line test too
if (typeof Building7 !== 'undefined') Building7.prototype.blocked = GameSet.prototype.blocked;

// a cutscene camera riding along with a moving object (offsets in the object's own frame)
function followCam(obj, from, to, look, fov = 42) {
  return (c, k, t, cam) => { const e = EASES.inout(k); obj.updateMatrixWorld(true); cam.position.copy(obj.localToWorld(V3().lerpVectors(V3(...from), V3(...to), e))); cam.lookAt(obj.localToWorld(V3(...look))); cam.fov = fov; };
}
// a fixed camera that keeps looking at something that moves
function watchCam(from, to, target, fov = 44, lift = 0) {
  return (c, k, t, cam) => { const e = EASES.inout(k); cam.position.lerpVectors(from, to, e); const p = (typeof target === 'function' ? target() : target).clone(); p.y += lift; cam.lookAt(p); cam.fov = fov; };
}
// headlights and a dome light for vehicles in cutscenes
function vehicleLights(v, on) {
  if (!v.userData.lights) {
    const d = v.userData, hl = new THREE.SpotLight(0xfff2d8, 0, 45, .5, .5, 1.2), ht = new THREE.Object3D(); hl.position.set(0, .9, d.L / 2 + .2); ht.position.set(0, -.6, d.L / 2 + 14); hl.target = ht; v.add(hl, ht);
    const dome = new THREE.PointLight(0xffd8a8, 0, 4.5, 1.5); dome.position.set(0, (d.H || 2) - .25, .6); v.add(dome); d.lights = [hl, dome];
  }
  v.userData.lights[0].intensity = on ? 3.2 : 0; v.userData.lights[1].intensity = on ? .9 : 0;
}
// sit a person on a seat at height y (the seated pose keeps the hips at standing height above the root)
function seatHuman(h, parent, x, y, z, yaw = 0) { if (h.root.parent !== parent) { if (h.root.parent) h.root.parent.remove(h.root); parent.add(h.root); } h.setMode('sit'); h.root.position.set(x, y - (h.seatOffset || .9) + .08, z); h.root.rotation.set(0, yaw, 0); }
