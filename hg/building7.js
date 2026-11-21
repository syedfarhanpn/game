'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Building 7, Red Hook Houses. The playable, flooded interior.
// Built in its own local frame (x along the block, z across, +z = front / street).
// Floors: ground (0.6 m, flooded to the ceiling), second floor (3.6 m, water rising).
// Collision is a set of axis-aligned boxes in the local frame.
// ---------------------------------------------------------------------------
const B7 = { X0: -24, X1: 24, Z0: -7, Z1: 7, T: .3, G: .6, C1: 3.3, F2: 3.6, C2: 6.3, ROOF: 19.2 };

class Building7 {
  constructor(world, site) {
    this.w = world; this.solids = []; this.floats = []; this.lightsList = [];
    const g = this.group = new THREE.Group(); g.position.set(site.x, 0, site.z); g.rotation.y = site.rot; world.scene.add(g); g.updateMatrixWorld(true);
    this.inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); this._v = V3();
    this.geo = {}; this.mats();
    this.build();
    for (const [k, G] of Object.entries(this.geo)) { if (!G.p.length) continue; const m = new THREE.Mesh(G.geometry(), this.M[k]); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  }
  mats() {
    const R = this.w.rng;
    const wallTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#c9c3a8'; c.fillRect(0, 0, w, h);                                     // painted plaster
      c.fillStyle = '#8fa58f'; c.fillRect(0, h * .55, w, h * .45);                          // glazed brick dado (NYCHA green)
      c.strokeStyle = 'rgba(40,50,40,.35)'; c.lineWidth = 1.5;
      for (let y = h * .55; y < h; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); const o = ((y / 10) | 0) % 2 ? 0 : 16; for (let x = o; x < w; x += 32) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 10); c.stroke(); } }
      c.fillStyle = '#5d6a58'; c.fillRect(0, h * .55 - 3, w, 4);
      for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(60,50,30,${R() * .08})`; c.fillRect(R() * w, R() * h, 3, 3); }   // grime
      c.fillStyle = 'rgba(40,35,25,.25)'; c.fillRect(0, h * .78, w, h * .22);
    });
    const floorTex = canvasTex(256, 256, (c, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#3d3a34' : '#6e685c'; c.fillRect(x * 32, y * 32, 32, 32); } for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(0,0,0,${R() * .12})`; c.fillRect(R() * w, R() * h, 2, 2); } });
    const concTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#7d7a72'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { const v = 90 + R() * 70 | 0; c.fillStyle = `rgba(${v},${v},${v},.5)`; c.fillRect(R() * w, R() * h, 2, 2); } });
    const doorTex = canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#7a1f1a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4a120f'; c.lineWidth = 4; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#c9c0a0'; c.fillRect(w - 26, h * .5, 12, 8); c.fillStyle = '#d8d0b0'; c.font = 'bold 22px Inter, sans-serif'; c.fillText('2F', w / 2 - 14, 50); });
    const exitTex = canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#200'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff2a1f'; c.font = 'bold 34px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('EXIT', w / 2, 36); }, true, false);
    this.M = {
      wall: new THREE.MeshStandardMaterial({ map: wallTex, vertexColors: true, roughness: .85 }),
      floor: new THREE.MeshStandardMaterial({ map: floorTex, vertexColors: true, roughness: .6 }),
      ceil: new THREE.MeshStandardMaterial({ color: col('#9a968c'), vertexColors: true, roughness: .95 }),
      conc: new THREE.MeshStandardMaterial({ map: concTex, vertexColors: true, roughness: .95 }),
      brick: this.w.matNycha,
      door: new THREE.MeshStandardMaterial({ map: doorTex, vertexColors: true, roughness: .6, metalness: .3 }),
      roof: this.w.matRoof,
      wood: new THREE.MeshStandardMaterial({ color: col('#6b5236'), vertexColors: true, roughness: .9 }),
      cloth: new THREE.MeshStandardMaterial({ color: col('#7d8fa8'), vertexColors: true, roughness: 1 }),
    };
    this.exitMat = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false });
  }
  G(k) { return this.geo[k] || (this.geo[k] = new GeoBuilder()); }
  // solid box (collision) with a visual
  S(x0, y0, z0, x1, y1, z1, mat = 'wall', tag = '', color, o = {}) {
    const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag, on: true };
    this.solids.push(s);
    if (mat) this.G(mat).box(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, color || new THREE.Color(1, 1, 1), Object.assign({ sx: 3, sy: 3, bottom: true }, o));
    return s;
  }
  V(x0, y0, z0, x1, y1, z1, mat, color, o = {}) { this.G(mat).box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), color || new THREE.Color(1, 1, 1), Object.assign({ sx: 3, sy: 3, bottom: true }, o)); }
  // a slab with rectangular holes, split into boxes
  slab(y0, y1, rect, holes, mat = 'floor') {
    const xs = new Set([rect[0], rect[2]]), zs = new Set([rect[1], rect[3]]);
    for (const h of holes) { xs.add(h[0]); xs.add(h[2]); zs.add(h[1]); zs.add(h[3]); }
    const X = [...xs].sort((a, b) => a - b), Z = [...zs].sort((a, b) => a - b);
    for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
      const cx = (X[i] + X[i + 1]) / 2, cz = (Z[j] + Z[j + 1]) / 2;
      if (cx < rect[0] || cx > rect[2] || cz < rect[1] || cz > rect[3]) continue;
      if (holes.some(h => cx > h[0] && cx < h[2] && cz > h[1] && cz < h[3])) continue;
      const s = this.S(X[i], y0, Z[j], X[i + 1], y1, Z[j + 1], null, 'slab');
      this.G(mat).quad([s.x0, y1, s.z1], [s.x1, y1, s.z1], [s.x1, y1, s.z0], [s.x0, y1, s.z0], [0, 1, 0], [s.x0 / 3, s.z1 / 3], [s.x1 / 3, s.z1 / 3], [s.x1 / 3, s.z0 / 3], [s.x0 / 3, s.z0 / 3], new THREE.Color(1, 1, 1));
      this.G('ceil').quad([s.x0, y0, s.z0], [s.x1, y0, s.z0], [s.x1, y0, s.z1], [s.x0, y0, s.z1], [0, -1, 0], [0, 0], [0, 0], [0, 0], [0, 0], new THREE.Color(1, 1, 1));
    }
  }
  // interior wall with door gaps along x (at constant z) or along z (at constant x)
  wallX(z, x0, x1, y0, y1, gaps, th = .2, doorTop) {
    let x = x0; const gs = gaps.slice().sort((a, b) => a[0] - b[0]);
    for (const [g0, g1] of gs) { if (g0 > x) this.S(x, y0, z - th / 2, g0, y1, z + th / 2); if (doorTop) this.S(g0, doorTop, z - th / 2, g1, y1, z + th / 2); x = g1; }
    if (x < x1) this.S(x, y0, z - th / 2, x1, y1, z + th / 2);
  }
  wallZ(x, z0, z1, y0, y1, gaps, th = .2, doorTop) {
    let z = z0; const gs = gaps.slice().sort((a, b) => a[0] - b[0]);
    for (const [g0, g1] of gs) { if (g0 > z) this.S(x - th / 2, y0, z, x + th / 2, y1, g0); if (doorTop) this.S(x - th / 2, doorTop, g0, x + th / 2, y1, g1); z = g1; }
    if (z < z1) this.S(x - th / 2, y0, z, x + th / 2, y1, z1);
  }
  stairs(xa, xb, zBottom, zTop, yBottom, yTop, steps) {
    const dz = (zTop - zBottom) / steps, dy = (yTop - yBottom) / steps;
    for (let k = 0; k < steps; k++) { const za = zBottom + dz * k, zb = za + dz; this.S(xa, yBottom - .01, za, xb, yBottom + dy * (k + 1), zb, 'conc', 'stair'); }
  }
  build() {
    const { X0, X1, Z0, Z1, T, G, C1, F2, C2, ROOF } = B7, nycha = col('#8a4636'), W = 'wall';
    // ---- shell: brick outside, painted inside
    this.S(X0, 0, Z0, X1, G, Z1, 'conc', 'plinth');                                   // ground slab
    for (const [a, b] of [[0, .3], [.3, .6]]) this.S(-2.4, a, Z1, 2.4, b, Z1 + 1.6 - a * 2.6, 'conc', 'stoop');
    const outer = (x0, y0, z0, x1, y1, z1) => { this.S(x0, y0, z0, x1, y1, z1, null, 'shell'); this.V(x0, y0, z0, x1, y1, z1, 'brick', nycha, { sx: 21.6, sy: 12.8 }); };
    outer(X0, 0, Z1 - T, -1.2, ROOF, Z1); outer(1.2, 0, Z1 - T, X1, ROOF, Z1); outer(-1.2, 2.8, Z1 - T, 1.2, ROOF, Z1);  // front with the lobby door
    outer(X0, 0, Z0, X1, ROOF, Z0 + T); outer(X0, 0, Z0, X0 + T, ROOF, Z1); outer(X1 - T, 0, Z0, X1, ROOF, Z1);
    // inner faces of the shell (paint) for the two interior floors
    for (const [y0, y1] of [[G, C1], [F2, C2]]) {
      this.V(X0 + T, y0, Z0 + T, X1 - T, y1, Z0 + T + .02, W); this.V(X0 + T, y0, Z0 + T, X0 + T + .02, y1, Z1 - T, W); this.V(X1 - T - .02, y0, Z0 + T, X1 - T, y1, Z1 - T, W);
      this.V(X0 + T, y0, Z1 - T - .02, -1.2, y1, Z1 - T, W); this.V(1.2, y0, Z1 - T - .02, X1 - T, y1, Z1 - T, W);
    }
    this.S(X0, ROOF - .01, Z0, X1, ROOF + .02, Z1, 'roof', 'roof', col('#2b2a28'));
    this.S(X0, C2, Z0, X1, ROOF, Z1, null, 'upper');                                  // floors 3-6 (not playable)
    this.G('ceil').quad([X0, C2, Z0], [X1, C2, Z0], [X1, C2, Z1], [X0, C2, Z1], [0, -1, 0], [0, 0], [0, 0], [0, 0], [0, 0], new THREE.Color(1, 1, 1));
    this.V(X0 + 3, ROOF, -2, X0 + 7, ROOF + 2.8, 2, 'conc'); this.V(X1 - 7, ROOF, -2, X1 - 3, ROOF + 2.8, 2, 'conc');   // stair bulkheads
    // canopy over the entrance (under water tonight)
    this.V(-2.6, 3.0, Z1, 2.6, 3.2, Z1 + 2.2, 'conc');
    // ---- second-floor slab with stair shafts and the hole into the ground floor
    const shaftW = [X0 + T, Z0 + T, -17, -1.2], shaftE = [17, Z0 + T, X1 - T, -1.2], hole = [-7.6, 3, -5.6, 5];
    this.slab(C1, F2, [X0 + T, Z0 + T, X1 - T, Z1 - T], [shaftW, shaftE, hole]);
    // the ground-floor floor surface
    this.G('floor').quad([X0 + T, G + .005, Z1 - T], [X1 - T, G + .005, Z1 - T], [X1 - T, G + .005, Z0 + T], [X0 + T, G + .005, Z0 + T], [0, 1, 0], [X0 / 3, Z1 / 3], [X1 / 3, Z1 / 3], [X1 / 3, Z0 / 3], [X0 / 3, Z0 / 3], new THREE.Color(.75, .75, .72));
    // ---- corridors and apartments on both floors
    const doors = [-13.6, -6.8, 0, 6.8, 13.6], gap = c => [c - .5, c + .5];
    for (const [y0, y1, fl] of [[G, C1, 0], [F2, C2, 1]]) {
      const front = doors.map(c => (fl === 0 && c === 0) ? [-2, 2] : gap(c));
      this.wallX(1.1, -17, 17, y0, y1, front, .2, y0 + 2.2);
      const back = doors.map(gap);
      this.wallX(-1.1, -17, 17, y0, y1, back, .2, y0 + 2.2);
      for (const x of [-10.2, -3.4, 3.4, 10.2]) { this.wallZ(x, 1.2, Z1 - T, y0, y1, []); this.wallZ(x, Z0 + T, -1.2, y0, y1, []); }
      for (const x of [-17, 17]) { this.wallZ(x, 1.2, Z1 - T, y0, y1, []); this.wallZ(x, Z0 + T, -1.2, y0, y1, []); }
    }
    // ---- stairwells: one flight each, ground floor up to the second floor
    this.stairs(-23.4, -20.6, -6.2, -1.2, G, F2, 10);
    this.stairs(20.6, 23.4, -6.2, -1.2, G, F2, 10);
    for (const x of [-20.6, 20.6]) this.S(x - .05, F2, -6.4, x + .05, F2 + 1.0, -1.2, 'conc', 'rail', col('#5a5a55'));
    // debris capping the stairs up to the third floor
    for (let k = 0; k < 6; k++) { this.V(-23 + k * .5, C2 - .4 - k * .1, -6 + k * .6, -21.5 + k * .4, C2, -5 + k * .5, 'conc', col('#6d675d')); this.V(21.5 - k * .4, C2 - .4 - k * .1, -6 + k * .6, 23 - k * .5, C2, -5 + k * .5, 'conc', col('#6d675d')); }
    // ---- the collapse in the second-floor hall (east is cut off)
    const deb = col('#6e665a');
    this.S(2.2, F2, -1.0, 6.0, C2, 1.0, 'conc', 'collapse', deb);
    for (let k = 0; k < 9; k++) { const x = 1.6 + this.w.rng() * 5, z = (this.w.rng() - .5) * 1.8; this.V(x - .5, F2, z - .4, x + .5, F2 + .3 + this.w.rng() * 1.2, z + .4, 'conc', col(pick(['#6e665a', '#7d7466', '#5b554b']))); }
    this.V(1.8, C2 - .25, -1, 6.4, C2, 1, 'ceil');     // sagging ceiling board
    // ---- the hole: broken boards round the edge, the room below
    for (const [x0, z0, x1, z1] of [[-8.1, 2.6, -7.5, 5.4], [-5.7, 2.6, -5.1, 5.4], [-7.6, 2.5, -5.6, 3.0], [-7.6, 5.0, -5.6, 5.5]]) this.V(x0, F2, z0, x1, F2 + .12, z1, 'wood', col('#4a3a28'));
    // ---- Nia's flat (2F, back east): jammed door, bunk bed
    this.niaDoor = this.S(13.1, F2, -1.2, 14.1, F2 + 2.2, -1.0, null, 'niaDoor');
    const dm = this.niaDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, .1), new THREE.MeshStandardMaterial({ map: this.M.door.map, roughness: .6, metalness: .3 })); dm.geometry.translate(.5, 0, 0); dm.position.set(13.1, F2 + 1.1, -1.1); dm.castShadow = true; this.group.add(dm);
    this.S(14.4, F2, -6.6, 16.8, F2 + .55, -5.3, 'wood', 'bunk', col('#5a4430'));                 // lower bunk
    this.S(14.4, F2 + 1.5, -6.6, 16.8, F2 + 1.62, -5.3, 'wood', 'bunk2', col('#5a4430'));         // upper bunk
    this.V(14.45, F2 + 1.62, -6.55, 16.75, F2 + 1.8, -5.35, 'cloth', col('#d48fb3'));             // her blanket
    for (const [x, z] of [[14.45, -6.55], [16.7, -6.55], [14.45, -5.35], [16.7, -5.35]]) this.V(x - .05, F2, z - .05, x + .05, F2 + 2.1, z + .05, 'wood', col('#4a3726'));
    // ---- other doors hanging open, furniture
    const R = this.w.rng;
    for (const c of doors) for (const [fl, z] of [[0, 1.1], [0, -1.1], [1, 1.1], [1, -1.1]]) {
      if (fl === 0 && c === 0 && z > 0) continue; if (fl === 1 && c === 13.6 && z < 0) continue;
      const y0 = fl ? F2 : G, sgn = z > 0 ? 1 : -1; this.V(c + .45, y0, z + sgn * .1, c + .5, y0 + 2.15, z + sgn * 1.0, 'door');
    }
    const units = [];
    for (const x of [-13.6, -6.8, 0, 6.8, 13.6]) for (const z of [4, -4]) for (const fl of [0, 1]) units.push([x, z, fl]);
    for (const [x, z, fl] of units) {
      const y0 = fl ? F2 : G;
      if (fl === 1 && x === 13.6 && z < 0) continue;
      this.V(x - 2.6, y0, z + (z > 0 ? 1.6 : -2.6), x - .6, y0 + .55, z + (z > 0 ? 2.6 : -1.6), 'cloth', col(pick(['#6d4a3a', '#3f4f63', '#5a5a4a'])));   // sofa / bed
      this.V(x + .8, y0, z - .6, x + 2.0, y0 + .75, z + .6, 'wood');                                                                                     // table
      if (R() < .7) this.floats.push({ x: x + (R() - .5) * 3, z: z + (R() - .5) * 2, ceil: fl ? C2 : C1, w: .9 + R(), d: .6 + R() * .6, h: .25 + R() * .3, ph: R() * 6, mesh: null });
    }
    // lobby: mailboxes, a lost bicycle, elevator doors
    this.V(-3.2, G + .9, 5.4, -3.0, G + 2.2, 6.5, 'conc', col('#8c8f88'));
    this.V(2.9, G, 1.3, 3.25, G + 2.3, 2.6, 'conc', col('#6d7076'));
    // exit signs and emergency lights
    const sign = (x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.7, .26), this.exitMat); m.position.set(x, y, z); m.rotation.y = ry; this.group.add(m); };
    sign(-16.85, F2 + 2.35, 0, Math.PI / 2); sign(16.85, F2 + 2.35, 0, -Math.PI / 2); sign(-16.85, G + 2.35, 0, Math.PI / 2); sign(16.85, G + 2.35, 0, -Math.PI / 2); sign(0, G + 2.4, 1.0, Math.PI);
    this.emerg = [];
    for (const [x, y, z, c, i] of [[-19, F2 + 2.4, 2, 0xff3020, 1.4], [19, F2 + 2.4, 2, 0xff3020, 1.4], [0, G + 2.6, 4, 0xffd8a0, 1.2], [15.4, F2 + 1.9, -5.4, 0xfff2d0, 1.0]]) {
      const l = new THREE.PointLight(c, i, 9, 1.8); l.position.set(x, y, z); this.group.add(l); this.emerg.push(l);
    }
    // floating junk (pinned under the ceiling below the waterline, bobbing on the surface above it)
    const fm = new THREE.MeshStandardMaterial({ color: col('#6b5a44'), roughness: .9 });
    for (const f of this.floats) { f.mesh = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), fm); f.mesh.rotation.y = f.ph; this.group.add(f.mesh); }
    // named places (local)
    this.P = {
      boatStart: V3(-6, 0, 30), lobbyOut: V3(0, 0, 9.5), lobbyIn: V3(0, 1.4, 4), shaftW: V3(-18.8, 0, -4), landW: V3(-20, F2, 2.5), corrW: V3(-12, F2, 0),
      roomsW: [V3(-13.6, F2, 4.2), V3(-13.6, F2, -4.2), V3(-6.8, F2, -4.2)], collapseW: V3(1.2, F2, 0), hole: V3(-6.6, F2, 4), holeBelow: V3(-6.6, 1.6, 4),
      gCorrE: V3(14, 1.6, 0), shaftE: V3(18.8, 0, -4), landE: V3(20, F2, 2.5), corrE: V3(11, F2, 0), niaDoor: V3(13.6, F2, -.3), nia: V3(15.6, F2 + 1.62, -5.95), niaFloor: V3(15, F2, -4),
      rafaelTrap: V3(9, 1.4, 0), gDebris: V3(5, 1.4, 0),
    };
  }
  // ----- coordinate helpers
  toLocal(v) { return this._v.copy(v).applyMatrix4(this.inv); }
  toWorld(v) { return v.clone().applyMatrix4(this.group.matrixWorld); }
  near(vw, m = 3) { const l = this.toLocal(vw); return l.x > B7.X0 - m && l.x < B7.X1 + m && l.z > B7.Z0 - m && l.z < B7.Z1 + 3.5 + m; }
  inside(vw) { const l = this.toLocal(vw); return l.x > B7.X0 + B7.T && l.x < B7.X1 - B7.T && l.z > B7.Z0 + B7.T && l.z < B7.Z1 - B7.T && l.y < B7.C2; }
  // resolve a player box (half width r, height h, feet at p.y) against the solids, in local space
  resolve(pl, r, h, canStep) {
    let grounded = false, ceil = false;
    for (let it = 0; it < 2; it++) for (const s of this.solids) {
      if (!s.on) continue;
      if (pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1 || pl.y + h <= s.y0 || pl.y >= s.y1) continue;
      const up = s.y1 - pl.y, down = pl.y + h - s.y0, px0 = pl.x + r - s.x0, px1 = s.x1 - (pl.x - r), pz0 = pl.z + r - s.z0, pz1 = s.z1 - (pl.z - r);
      const mx = Math.min(px0, px1), mz = Math.min(pz0, pz1);
      if (canStep && up <= .48 && up < mx + .3 && up < mz + .3) { pl.y = s.y1; grounded = true; continue; }
      const m = Math.min(up, down, mx, mz);
      if (m === up) { pl.y += up; grounded = true; }
      else if (m === down) { pl.y -= down; ceil = true; }
      else if (m === mx) pl.x += px0 < px1 ? -px0 : px1;
      else pl.z += pz0 < pz1 ? -pz0 : pz1;
    }
    return { grounded, ceil };
  }
  // highest floor surface under a local point (or null outside the footprint)
  floorBelow(pl, r = .2) {
    let best = -Infinity;
    for (const s of this.solids) { if (!s.on || pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1) continue; if (s.y1 <= pl.y + .05 && s.y1 > best) best = s.y1; }
    return best === -Infinity ? null : best;
  }
  ceilingAbove(pl, y, r = .2) {
    let best = Infinity;
    for (const s of this.solids) { if (!s.on || pl.x + r <= s.x0 || pl.x - r >= s.x1 || pl.z + r <= s.z0 || pl.z - r >= s.z1) continue; if (s.y0 >= y - .01 && s.y0 < best) best = s.y0; }
    return best;
  }
  pointSolid(pl) { for (const s of this.solids) if (s.on && pl.x > s.x0 && pl.x < s.x1 && pl.y > s.y0 && pl.y < s.y1 && pl.z > s.z0 && pl.z < s.z1) return true; return false; }
  // the hallway coming down on the ground floor (end of the mission)
  collapseGround() {
    const deb = col('#5b554b');
    const add = (x0, y0, z0, x1, y1, z1) => { const s = { x0, x1, y0, y1, z0, z1, tag: 'gcollapse', on: true }; this.solids.push(s); const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), this.M.conc); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.set(this.w.rng() * .3, this.w.rng() * .5, this.w.rng() * .3); m.castShadow = true; this.group.add(m); };
    add(3.6, B7.G, -1.0, 7.6, B7.C1, 1.0); add(4.2, B7.G, -1.0, 5.8, 2.2, 1.0);
    for (let k = 0; k < 6; k++) { const x = 3.2 + this.w.rng() * 4.5; add(x - .5, B7.G, -.9, x + .5, B7.G + .4 + this.w.rng(), .9); }
  }
  openNiaDoor() { this.setNiaDoor(true); }
  setNiaDoor(open) { this.niaDoor.on = !open; this.niaDoorMesh.rotation.y = open ? 1.75 : 0; }
  update(dt, t) {
    const L = this.w.water;
    for (const f of this.floats) { const y = Math.min(L - f.h * .3, f.ceil - f.h / 2 - .02) + Math.sin(t * 1.4 + f.ph) * .03; f.mesh.position.set(f.x + Math.sin(t * .3 + f.ph) * .2, y, f.z); f.mesh.rotation.z = Math.sin(t + f.ph) * .05; }
    this.emerg[2].intensity = 1.2 * (Math.sin(t * 13) > -.6 ? 1 : .15);       // lobby light shorting out under water
    this.emerg[3].intensity = 1.0 * (.7 + .3 * Math.sin(t * 7.3));            // Nia's little flashlight
  }
}
