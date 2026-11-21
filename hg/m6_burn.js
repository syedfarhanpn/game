'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 6: "Burn Notice" (story escape). Gowanus, Brooklyn, at
// dawn. Halcyon raids the crew's loft. Eli and Iris run the rooftops, watch his
// tugboat burn on the canal, and get away through a subway station that has
// been flooded since Delphine — swimming blind from air pocket to air pocket.
// ---------------------------------------------------------------------------
const M6 = { LOFT: 7.3, R1: 10.9, R2: 10.1, R3: 12.6, R4: 11.8, WL: -4.5 };

function buildRow(world, site) {
  const S = new GameSet(world, site, { x0: -16, x1: 66, y0: -1, y1: 16, z0: -12, z1: 26 }, { name: 'row', roofed: false, ownFloor: [[-13, -10, 63, 10, 16]] });
  S.M.facade = world.matBrick; S.M.facade2 = world.matIndustrial;
  const FO = { sx: 14.4, sy: 12.8 };
  const L1 = M6.LOFT, R1 = M6.R1, R2 = M6.R2, R3 = M6.R3, R4 = M6.R4;
  // ---- B1: the safehouse (loft on the top floor)
  S.S(-12, 0, -9, 10, L1, 9, 'facade', 'bld', '#8a4636', FO);
  S.floor(-12, -9, 10, 9, L1 + .05, 'plank', .3, '#7a5a3a');
  S.wallX(-9, -12, 10, L1, R1, [[1, 5, L1 + 2.9]], 'facade', .3, '#8a4636', FO);                  // big loading window (canal side light)
  S.wallX(9, -12, 10, L1, R1, [], 'facade', .3, '#8a4636', FO);
  S.wallZ(-12, -9, 9, L1, R1, [[-1, 1.2, L1 + 2.3]], 'facade', .3, '#8a4636', FO);                // the stairwell door (where Halcyon comes in)
  S.wallZ(10, -9, 9, L1, R1, [], 'facade', .3, '#8a4636', FO);
  S.V(1, L1 + .05, -9.2, 5, L1 + .95, -8.8, 'facade', '#8a4636', FO); S.solids.push({ x0: 1, x1: 5, y0: L1, y1: L1 + 1, z0: -9.2, z1: -8.8, tag: 'sill', on: true });
  // roof with a hatch over the steel stair
  S.S(-12, R1 - .3, -9, 2.4, R1, 9, 'conc', 'roof', '#3a3833'); S.S(2.4, R1 - .3, -9, 10, R1, 4, 'conc', 'roof', '#3a3833'); S.S(2.4, R1 - .3, 7, 10, R1, 9, 'conc', 'roof', '#3a3833'); S.S(8.2, R1 - .3, 4, 10, R1, 7, 'conc', 'roof', '#3a3833');
  S.stairsX(4, 7, -1.2, 8.2, L1 + .05, R1, 13, 'metal');
  S.V(2.3, R1, 3.9, 8.2, R1 + .9, 4, 'metal', '#333'); S.V(2.3, R1, 7, 8.2, R1 + .9, 7.1, 'metal', '#333'); S.V(2.3, R1, 4, 2.4, R1 + .9, 7, 'metal', '#333');
  // loft furniture: the crew's board, couch, kitchen, mattress
  S.V(-11.8, L1 + 1, -6, -11.7, L1 + 2.6, 4, 'cloth', '#c8b88a'); S.sign('CRANE MERIDIAN · HALCYON · THE BARRIER', -11.65, L1 + 2.75, -1, Math.PI / 2, 5, .3, '#c8b88a', '#3a2010');
  for (let k = 0; k < 9; k++) S.V(-11.66, L1 + 1.2 + (k % 3) * .45, -5.5 + Math.floor(k / 3) * 3 + (k % 2) * .4, -11.64, L1 + 1.5 + (k % 3) * .45, -5.1 + Math.floor(k / 3) * 3 + (k % 2) * .4, 'cloth', pick(['#eee', '#ddd', '#c9a24a', '#8a1c1c']));
  S.S(-6, L1 + .05, 5.8, -2, L1 + .5, 7.2, 'cloth', 'couch', '#5a3a2a'); S.V(-6, L1 + .5, 6.9, -2, L1 + 1.0, 7.2, 'cloth', '#5a3a2a');
  S.S(-11.6, L1 + .05, 6.6, -8, L1 + .95, 8.6, 'wood', 'kitchen', '#6a5a4a'); S.desk(-3.5, L1 + .05, -5, 1.8, .9, '#4a3a2a');
  S.V(6.5, L1 + .05, 5.5, 9.5, L1 + .3, 8.5, 'cloth', '#d8d0c0');
  S.light(-3, R1 - .6, 0, 0xffd8a8, .9, 12, 0, true);
  // ---- B2, B3, B4: the rest of the block, roofs at different heights
  const par = (x0, z0, x1, z1, h, mat, color) => { S.V(x0, h, z0, x1, h + .8, z1, mat, color, FO); S.solids.push({ x0, x1, y0: h, y1: h + .8, z0, z1, tag: 'parapet', on: true }); };
  const bld = (x0, x1, h, mat, color) => S.S(x0, 0, -9, x1, h, 9, mat, 'bld', color, FO);
  bld(12, 28, R2, 'facade', '#7d4636'); bld(30, 44, R3, 'facade2', '#9a8f7a'); bld(46, 62, R4, 'facade', '#6e3b30');
  // parapets, open where the plank, the crates and the jump are
  par(-12, -9, 10, -8.75, R1, 'facade', '#8a4636'); par(-12, 8.75, 10, 9, R1, 'facade', '#8a4636'); par(-12, -8.75, -11.75, 8.75, R1, 'facade', '#8a4636'); par(9.75, -8.75, 10, -.6, R1, 'facade', '#8a4636'); par(9.75, .6, 10, 8.75, R1, 'facade', '#8a4636');
  par(12, -9, 28, -8.75, R2, 'facade', '#7d4636'); par(12, 8.75, 28, 9, R2, 'facade', '#7d4636'); par(12, -8.75, 12.25, -.6, R2, 'facade', '#7d4636'); par(12, .6, 12.25, 8.75, R2, 'facade', '#7d4636'); par(27.75, -8.75, 28, -6.4, R2, 'facade', '#7d4636'); par(27.75, -4.6, 28, 8.75, R2, 'facade', '#7d4636');
  par(30, -9, 44, -8.75, R3, 'facade2', '#9a8f7a'); par(30, 8.75, 44, 9, R3, 'facade2', '#9a8f7a'); par(30, -8.75, 30.25, -6.4, R3, 'facade2', '#9a8f7a'); par(30, -4.6, 30.25, 8.75, R3, 'facade2', '#9a8f7a'); par(43.75, -8.75, 44, -4, R3, 'facade2', '#9a8f7a'); par(43.75, 4, 44, 8.75, R3, 'facade2', '#9a8f7a');
  par(46, -9, 62, -8.75, R4, 'facade', '#6e3b30'); par(46, 8.75, 56, 9, R4, 'facade', '#6e3b30'); par(46, -8.75, 46.25, -4, R4, 'facade', '#6e3b30'); par(46, 4, 46.25, 8.75, R4, 'facade', '#6e3b30'); par(61.75, -8.75, 62, 8.75, R4, 'facade', '#6e3b30');
  // plank B1 -> B2, crates up to B3, plank B2 -> B3, the gap B3 -> B4 (jump)
  S.S(9.8, R1 - .08, -.4, 12.4, R1, .4, 'plank', 'plank', '#8a6a44');
  for (let k = 0; k < 9; k++) S.crate(22.6 + k * .6, R2, -5.5, .6, (k + 1) * .28, 2, '#7a5a3a');
  S.S(27.6, R3 - .08, -6.2, 30.3, R3, -4.8, 'plank', 'plank', '#8a6a44');
  // rooftop stuff: water tower on B2, vents, bulkheads
  { const wt = new THREE.Group(); const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3.6, 14), stdMat('#6a4a32', { roughness: 1 })); tank.position.y = 5.6; wt.add(tank); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.3, 14), stdMat('#3d3a35')); roof.position.y = 8.05; wt.add(roof); for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.18, 3.8, .18), stdMat('#2b2d2f')); l.position.set(lx, 1.9, lz); wt.add(l); } S.add(wt, 17, R2, 3); S.solids.push({ x0: 15.5, x1: 18.5, y0: R2, y1: R2 + 8, z0: 1.5, z1: 4.5, tag: 'tower', on: true }); }
  for (const [x, z, y] of [[20, -3, R2], [36, 4, R3], [40, -4, R3], [52, 3, R4], [57, -5, R4]]) S.S(x - .8, y, z - .8, x + .8, y + 1.1, z + .8, 'metal', 'vent', '#7a7e82');
  S.S(33, R3, -1, 36, R3 + 2.6, 2, 'block', 'bulkhead', '#5a5650');
  // fire escape down B4's street side
  const FE = 9.4;
  S.S(56, R4 - .1, 9, 62, R4, 10.6, 'metal', 'fe', '#202020'); S.V(56, R4, 10.55, 62, R4 + 1, 10.6, 'metal', '#202020');
  S.stairsX(9.2, 10.6, 47, 56, R4 - 5.4, R4, 20, 'metal');
  S.S(46, R4 - 5.5, 9, 48, R4 - 5.4, 12, 'metal', 'fe', '#202020');
  S.stairsX(10.6, 12, 56, 47, .05, R4 - 5.4, 24, 'metal');
  S.V(46, 0, 10.55, 62, 12.6, 10.62, 'metal', '#151515'); S.solids.push({ x0: 46, x1: 62, y0: 2.5, y1: 13, z0: 12, z1: 12.15, tag: 'ferail', on: true });
  S.solids.push({ x0: 62, x1: 62.2, y0: R4 - 5.5, y1: R4 + 1, z0: 9, z1: 12.2, tag: 'ferail', on: true });
  // the street out front
  S.V(-16, .02, 12.5, 66, .045, 13.5, 'conc', '#8a8780'); S.V(-16, .02, 13.5, 66, .04, 21, 'plain', '#3a3a3a'); S.V(-16, .02, 21, 66, .045, 26, 'conc', '#8a8780');
  for (let x = -14; x < 66; x += 6) S.V(x, .045, 17.1, x + 3, .05, 17.4, 'plain', '#d8d0a0');
  S.finish(); world.addSet(S); return S;
}

function buildSubway(world, site) {
  const WL = M6.WL;
  const U = new GameSet(world, site, { x0: -62, x1: 56, y0: -9.5, y1: 3, z0: 13, z1: 31 }, { name: 'subway', underground: true, tight: true,
    ownFloor: [[38, 19.8, 54.5, 23.2, .6], [-62, 13, 56, 31, -1]] });
  // entrance kiosk (boarded up) and stairs down to the mezzanine
  U.S(46.4, .05, 19.5, 54.6, 2.8, 19.8, 'metal', 'kiosk', '#2a4a2a'); U.S(46.4, .05, 23.2, 54.6, 2.8, 23.5, 'metal', 'kiosk', '#2a4a2a'); U.S(46.4, .05, 19.5, 46.7, 2.8, 23.5, 'metal', 'kiosk', '#2a4a2a'); U.S(46.3, 2.8, 19.4, 54.7, 3, 23.6, 'metal', 'kiosk', '#1a3a1a');
  U.boards = U.S(54.5, .05, 19.8, 54.7, 2.6, 23.2, null, 'boards');
  U.boardMesh = new THREE.Group(); for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, 3.6), stdMat('#7a5a3a')); b.position.set(54.62, .4 + k * .4, 21.5); b.rotation.x = (Math.random() - .5) * .2; U.boardMesh.add(b); } U.group.add(U.boardMesh);
  U.sign('CLOSED', 54.72, 2.3, 21.5, Math.PI / 2, 1.6, .4, '#c9a020', '#111');
  U.stairsX(19.8, 23.2, 40, 54.4, -4.2, .05, 24, 'conc');
  U.S(37.6, -5.4, 19.4, 54.6, -5, 19.8, 'tile', 'wall'); U.S(37.6, -5.4, 23.2, 54.6, -5, 23.6, 'tile', 'wall');
  U.S(37.6, -5, 19.4, 54.6, .05, 19.8, 'tile', 'wall'); U.S(37.6, -5, 23.2, 54.6, .05, 23.6, 'tile', 'wall');
  U.S(38, -.4, 19.4, 46.4, .03, 23.6, 'conc', 'ceil');
  // mezzanine (dry), old turnstiles, then the stair down into the water
  U.floor(28, 17, 40, 26, -4.2, 'tile', .3, '#b8b4a8');
  U.S(28, -5, 16.6, 38, -2, 17, 'tile', 'wall'); U.S(28, -5, 26, 38, -2, 26.4, 'tile', 'wall'); U.S(40, -5, 16.6, 40.4, -2, 19.4, 'tile', 'wall'); U.S(40, -5, 23.6, 40.4, -2, 26.4, 'tile', 'wall'); U.S(28, -2, 16.6, 40.4, -1.6, 26.4, 'conc', 'ceil'); U.S(38, -5, 16.6, 40, -2, 17, 'tile', 'wall'); U.S(38, -5, 26, 40, -2, 26.4, 'tile', 'wall');
  for (let z = 18; z < 25.5; z += 1.5) U.S(33, -4.2, z - .1, 34, -3.2, z + .1, 'metal', 'turnstile', '#6a6a6a');
  U.sign('BERGEN ST  ·  IND', 31, -2.6, 25.9, Math.PI, 3, .5, '#1a1a1a', '#e8e4dc'); U.sign('NO SERVICE SINCE DELPHINE', 31, -3.2, 25.9, Math.PI, 3.4, .35, '#c9a020', '#111');
  U.stairsX(19.5, 23.5, 22, 28, -7, -4.2, 12, 'conc');
  U.S(22, -2.2, 16.6, 28, -1.8, 29.4, 'conc', 'ceil'); U.S(22, -7.5, 19.1, 28, -1.8, 19.5, 'tile', 'wall'); U.S(22, -7.5, 23.5, 28, -1.8, 23.9, 'tile', 'wall');
  U.light(33, -2.4, 21.5, 0xb8c8d8, .6, 12, 9);
  // the flooded station: platform, track bed, ceiling just above the water
  U.floor(-4, 17, 22, 23.5, -7, 'tile', .3, '#9a968c'); U.floor(-60, 23.5, 22, 29, -8.5, 'conc', .3, '#3a3a36');
  U.S(-4, -8.5, 23.4, 22, -7, 23.6, 'conc', 'edge', '#c9a020');
  U.S(-4, -8.6, 16.6, 22, -3.4, 17, 'tile', 'wall'); U.S(-60, -8.6, 29, 22, -3.4, 29.4, 'tile', 'wall'); U.S(22, -8.6, 16.6, 22.4, -3.4, 19.5, 'tile', 'wall'); U.S(22, -8.6, 23.5, 22.4, -3.4, 29.4, 'tile', 'wall');
  U.S(-4, -3.5, 16.6, 22.4, -1.0, 29.4, 'conc', 'ceil', '#4a4a46');
  for (let x = 0; x < 22; x += 5) U.pillar(x, 23.4, -7, -3.5, .25, 'metal', '#2a3a4a');
  U.S(-4.4, -8.6, 16.6, -4, -3.4, 23.5, 'tile', 'wall');
  // the tunnel: the ceiling dips under the water, except two air pockets under old vent shafts
  U.S(-60, -8.6, 23.1, -4, -4.3, 23.5, 'conc', 'wall', '#3a3a36');
  const pockets = [[-21, -17.5], [-43, -39.5]]; let x = -4;
  for (const [a, b] of pockets.slice().reverse().map(p => p).sort((p, q) => q[0] - p[0])) { U.S(b, -4.4, 23.1, x, -1.0, 29.4, 'conc', 'ceil', '#2e2e2a'); U.S(a, -3.65, 23.1, b, -1.0, 29.4, 'conc', 'ceil', '#2e2e2a'); x = a; }
  U.S(-46, -4.4, 23.1, x, -1.0, 29.4, 'conc', 'ceil', '#2e2e2a'); U.S(-51, -.3, 23.1, -46, .03, 29.4, 'conc', 'ceil', '#2e2e2a');
  U.S(-62, -8.6, 23.1, -46, -4.4, 23.5, 'conc', 'wall', '#3a3a36'); U.S(-60, -4.4, 23.1, -51, .03, 23.6, 'block', 'wall', '#5a5650'); U.S(-60, -4.4, 27.2, -51, .03, 29.4, 'block', 'wall', '#5a5650');
  U.pocketLights = pockets.map(([a, b]) => { const l = U.light((a + b) / 2, -3.9, 26, 0x9fb8d0, .9, 9, 0, false); const shaft = new THREE.Mesh(new THREE.BoxGeometry(b - a - .6, .04, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(.22, .28, .36), toneMapped: false })); shaft.position.set((a + b) / 2, -3.68, 26); U.group.add(shaft); return l; });
  U.pockets = pockets;
  // emergency exit shaft at the far end: stairs up to the street
  U.S(-62, -8.6, 23.1, -60, 2.6, 29.4, 'block', 'wall', '#6a6a60');
  U.stairsX(24, 25.6, -59.8, -50, -8.5, -4.3, 16, 'conc');
  U.S(-50, -4.6, 24, -46, -4.3, 27.2, 'conc', 'landing');
  U.stairsX(25.6, 27.2, -46, -56, -4.3, .05, 16, 'conc');
  U.S(-60, -8.6, 25.5, -50, -4.4, 25.7, 'block', 'wall', '#6a6a60');
  U.addWater(-60, 16.6, 28, 29.4, WL);
  U.S(-59.9, -.4, 24, -56, .05, 27.2, 'conc', 'top'); U.S(-60, .05, 23.6, -51, 2.6, 23.9, 'block', 'hut', '#5a5650'); U.S(-55.5, .05, 27.3, -51, 2.6, 27.6, 'block', 'hut', '#5a5650'); U.S(-60.2, .05, 23.6, -59.9, 2.6, 27.6, 'block', 'hut', '#5a5650'); U.S(-51.2, .05, 23.6, -50.9, 2.6, 27.6, 'block', 'hut', '#5a5650'); U.S(-60.2, 2.6, 23.5, -50.8, 2.85, 27.7, 'metal', 'hut', '#3a3a3a');
  U.sign('EMERGENCY EXIT', -57.8, 2.2, 27.62, 0, 1.8, .3, '#0a5a2a', '#fff', true);
  U.exitAt = V3(-58, .05, 28.4);
  U.finish(); world.addSet(U); return U;
}

// Eli's tugboat, moored on the canal
function makeTug() {
  const g = new THREE.Group(), red = stdMat('#7a1e18', { roughness: .7 }), black = stdMat('#1a1a1a', { roughness: .8 }), white = stdMat('#d8d4c8', { roughness: .6 }), add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(5, 1.8, 13), black, 0, .3, 0); const bow = add(new THREE.CylinderGeometry(2.5, 2.5, 1.8, 16, 1, false, 0, Math.PI), black, 0, .3, 6.5); bow.rotation.y = -Math.PI / 2;
  add(new THREE.BoxGeometry(5.1, .25, 13.1), red, 0, 1.2, 0); add(new THREE.BoxGeometry(3.4, 2.2, 5), white, 0, 2.4, -.5); add(new THREE.BoxGeometry(2.6, 1.4, 2.6), white, 0, 4.2, -.8);
  add(new THREE.BoxGeometry(2.7, .4, 2.7), red, 0, 5.1, -.8); add(new THREE.CylinderGeometry(.45, .5, 2.4, 10), red, 0, 4.4, -3.4);
  for (let k = 0; k < 8; k++) { const t = add(new THREE.TorusGeometry(.35, .14, 6, 10), black, 2.55, .9, -4.5 + k * 1.3); t.rotation.y = Math.PI / 2; }
  return g;
}
// smoke from the fire: soft sprites rising
function makeSmoke(n = 26) {
  const tex = canvasTex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(60,56,52,.9)'); gr.addColorStop(1, 'rgba(60,56,52,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, true, false);
  const grp = new THREE.Group(); grp.parts = [];
  for (let k = 0; k < n; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .7 })); s.userData = { t: k / n * 9, sp: .7 + Math.random() * .5, dx: (Math.random() - .5) * 2 }; grp.add(s); grp.parts.push(s); }
  grp.tick = dt => { for (const s of grp.parts) { const u = s.userData; u.t = (u.t + dt * u.sp) % 9; const k = u.t / 9; s.position.set(u.dx + k * 7, k * 26, k * 3); const sc = 2 + k * 9; s.scale.set(sc, sc, 1); s.material.opacity = (1 - k) * .75; } };
  return grp;
}
function makeFire() {
  const grp = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.4, .3), toneMapped: false, transparent: true, opacity: .85, depthWrite: false });
  grp.flames = []; for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.5 + Math.random() * .4, 1.6 + Math.random() * 1.6, 7), m); f.position.set((Math.random() - .5) * 3, 1.5 + Math.random() * 1.5, (Math.random() - .5) * 6); grp.add(f); grp.flames.push(f); }
  grp.light = new THREE.PointLight(0xff7a2a, 0, 70, 1.4); grp.light.position.set(0, 4, 0); grp.add(grp.light);
  grp.tick = (dt, t) => { grp.flames.forEach((f, k) => { f.scale.y = .7 + Math.abs(Math.sin(t * 7 + k * 1.7)) * .7; f.rotation.y = t * 2 + k; }); grp.light.intensity = grp.on ? 5 + Math.sin(t * 13) * 1.2 + Math.sin(t * 31) * .6 : 0; };
  return grp;
}

class Mission6 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world, st = W.site.block;
    this.row = buildRow(W, st); this.sub = buildSubway(W, st);
    const R = this.row, L = (x, y, z) => R.L(x, y, z); this.L = L;
    const rot = R.group.rotation.y;
    this.iris = new Follower(g, 'irisStreet', { label: 'IRIS', breathMax: 34 });
    // the tugboat on the canal (find open water near the loft)
    let best = null; for (let r = 0; r < 120 && !best; r += 3) for (let a = 0; a < 6.28 && !best; a += .3) { const x = st.x - 40 + Math.cos(a) * r, z = st.z - 30 + Math.sin(a) * r; let ok = true; for (const [dx, dz] of [[0, 0], [5, 0], [-5, 0], [0, 7], [0, -7], [4, 5], [-4, -5]]) if (W.classAt(x + dx, z + dz) !== 0) ok = false; if (ok) best = [x, z]; }
    this.tug = makeTug(); const tp = best || [st.x - 40, st.z - 30]; this.tug.position.set(tp[0], -.6, tp[1]); this.tug.rotation.y = Math.atan2(-.47, .88); g.scene.add(this.tug);
    this.fire = makeFire(); this.tug.add(this.fire); this.fire.position.set(0, 1.4, -.5); this.smoke = makeSmoke(); this.smoke.position.copy(this.tug.position).add(V3(0, 4, 0)); this.smoke.visible = false; g.scene.add(this.smoke);
    // Halcyon's SUVs out front
    this.suvs = [[-6, 16.5], [3, 18.5], [14, 16.5]].map(([x, z], k) => { const v = makeVehicle('suv', '#141618'); R.add(v, x, .02, z, rot * 0 + (k === 1 ? -Math.PI / 2 : Math.PI / 2)); R.solids.push({ x0: x - 2.6, x1: x + 2.6, y0: 0, y1: 2, z0: z - 1.1, z1: z + 1.1, tag: 'suv', on: true }); return v; });
    // Halcyon: breach team (inside the loft), street team, roof chasers
    const bark = { hear: "Movement upstairs!", alert: "Contact! Two targets, the woman is with him!", body: "Man down! Man down!", calm: "Lost them. Keep looking." };
    this.breach = [[-11, -.2], [-11.4, 1.6]].map(([x, z]) => { const gd = this.addGuard('halcyon', L(x, L1(), z), rot + Math.PI / 2, { bark, range: 22, acc: .35, dmg: .1 }); gd.show(false); return gd; });
    this.street = [[8, 15.5], [28, 19], [44, 15]].map(([x, z]) => { const gd = this.addGuard('halcyon', L(x, .05, z), rot + Math.PI, { bark, range: 40, acc: .32, dmg: .09, fov: 80, vy: 20 }); gd.show(false); return gd; });
    this.chasers = [[0, -2], [-4, 3]].map(([x, z]) => { const gd = this.addGuard('halcyon', L(x, M6.R1, z), rot + Math.PI / 2, { bark, range: 35, acc: .3, dmg: .09, fov: 70 }); gd.show(false); return gd; });
    for (const gd of this.guards) { gd.home = { p: gd.pos.clone(), yaw: gd.yaw }; gd.fixedY = true; }
    this.hitScale = .7; this.alertMemory = 30; this.noTakedown = true;
    function L1() { return M6.LOFT + .05; }
  }
  lightAt(p) { return this.sub.inside(p) ? .3 : 1; }
  restore(cp) {
    const g = this.g, R = this.row, U = this.sub, L = this.L, pl = g.player, rot = R.group.rotation.y;
    HGA.alarmOn = false; HGA.fireV = 0; this.resetGuards(); for (const gd of this.guards) { gd.show(false); gd.passive = false; }
    this.iris.stop(); this.iris.show(true); this.iris.mode = 'idle'; g.hud.follower(null); pl.lampFlicker = undefined; pl.lightOn = false; this.onRoofs = false;
    U.boards.on = true; U.boardMesh.visible = true; this.fire.on = cp >= 3; this.smoke.visible = cp >= 3; HGA.fireV = cp >= 3 ? .05 : 0;
    const start = (p, y) => { pl.teleport(p, y, 'walk'); this.iris.place(p.clone().add(V3(Math.sin(y) * -1.6, 0, Math.cos(y) * -1.6)), y); this.iris.start(); g.hud.follower(this.iris); };
    if (cp <= 1) { this.iris.place(L(-4, M6.LOFT + .05, 6.2), rot); this.iris.mode = 'idle'; pl.teleport(L(3, M6.LOFT + .05, -7.4), rot + Math.PI, 'walk'); if (cp === 1) { start(L(2, M6.LOFT + .05, 2), rot + Math.PI / 2); } }
    if (cp === 2) { start(L(8, M6.R1, 5.5), rot + Math.PI / 2); this.onRoofs = true; }
    if (cp === 3) { start(L(32, M6.R3, -5.5), rot + Math.PI / 2); this.onRoofs = true; }
    if (cp >= 4) { U.boards.on = false; U.boardMesh.visible = false; start(L(33, -4.2, 21.5), rot - Math.PI / 2); pl.lightOn = true; }
    g.rig.yaw = pl.yaw; g.rig.pitch = .12; g.rig.snap();
  }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    if (cp <= 2) yield* this.s2();
    if (cp <= 3) yield* this.s3();
    yield* this.s4();
  }
  *s0() { yield* this.cine(breachCine(this.g, this)); this.restore(1); this.checkpoint(1); }
  // ---------- 1: the breach — up to the roof
  *s1() {
    const g = this.g, R = this.row, L = this.L, pl = this.pl;
    g.hud.show(true); g.hud.follower(this.iris);
    for (const gd of this.breach) { gd.show(true); gd.alarm(pl.pos, 'scripted'); }
    this.objective('Get Iris up the steel stair to the roof!', L(7, M6.R1 + 1, 5.5));
    g.hud.hint('<kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump — Halcyon is coming through the door', 6);
    this.sayAsync('HALCYON', "Go, go, go! Find the woman!");
    yield* this.until(() => R.toLocal(pl.pos).y > M6.R1 - .2);
    this.checkpoint(2);
  }
  // ---------- 2: the rooftops — plank, crates
  *s2() {
    const g = this.g, R = this.row, L = this.L, pl = this.pl;
    this.onRoofs = true; g.hud.follower(this.iris);
    for (const gd of this.street) { gd.show(true); gd.alarm(pl.pos, 'scripted'); }
    yield* this.say('STATIC', "The roofs run east to the end of the block. Go east. Don't stop.");
    this.objective('Run east across the roofs. Plank to the next building.', L(12, M6.R2 + 1, 0));
    yield* this.until(() => R.toLocal(pl.pos).x > 12.5);
    this.sayAsync('ELI', "Plank. Don't look down.");
    this.sayAsync('IRIS', "I wasn't planning to.");
    for (const gd of this.chasers) { gd.show(true); gd.alarm(pl.pos, 'scripted'); }
    this.objective('Climb the crates to the higher roof.', L(29, M6.R3 + 1, -5.5));
    yield* this.until(() => { const l = R.toLocal(pl.pos); return l.x > 30.4 && l.y > M6.R3 - .3; });
    yield* this.until(() => !this.talking);
    yield* this.cine(tugCine(g, this));
    this.checkpoint(3);
  }
  // ---------- 3: the jump, the fire escape, the boarded-up station
  *s3() {
    const g = this.g, R = this.row, U = this.sub, L = this.L, pl = this.pl;
    this.onRoofs = true; g.hud.follower(this.iris); this.fire.on = true; this.smoke.visible = true; HGA.fireV = .05;
    for (const gd of this.street.concat(this.chasers)) { gd.show(true); gd.alarm(pl.pos, 'scripted'); }
    this.objective('Jump the gap to the last roof. (Run with Shift, jump with Space)', L(47, M6.R4 + 1, 0));
    yield* this.until(() => { const l = R.toLocal(pl.pos); return l.x > 46.3 && l.y > M6.R4 - .5; });
    this.objective('Down the fire escape to the street.', L(58, M6.R4 + 1, 9.8));
    yield* this.until(() => { const l = R.toLocal(pl.pos); return l.z > 9.1 && l.x > 44; });
    this.onRoofs = false;
    yield* this.until(() => R.toLocal(pl.pos).y < .6);
    yield* this.say('STATIC', "Station entrance across the street. The boarded-up one. Kick it in.");
    this.objective('Kick in the boarded-up subway entrance across the street.', U.L(54.8, 1.2, 21.5));
    yield* this.holdE(U.L(55.3, .05, 21.5), 1.8, 'kick the boards in', 1.4, () => { HGA.thud(); g.shake(.12, .2); });
    U.boards.on = false; U.boardMesh.visible = false; HGA.doorBreak();
    this.objective('Down into the station.', U.L(33, -4, 21.5));
    yield* this.until(() => U.toLocal(pl.pos).x < 39.5 && U.toLocal(pl.pos).y < -3.9);
    for (const gd of this.guards) gd.show(false);
    this.checkpoint(4);
  }
  // ---------- 4: the flooded tunnel
  *s4() {
    const g = this.g, U = this.sub, pl = this.pl;
    g.hud.follower(this.iris); pl.lightOn = true;
    yield* this.say('ELI', "Iris. Can you hold your breath?");
    yield* this.say('IRIS', "I grew up in Lagos. I can swim.");
    yield* this.say('ELI', "Stay on my light. When the ceiling comes down, we go under. Breathe in the air pockets.");
    this.objective('Swim the flooded tunnel west. Surface in the air pockets.', U.L(-19, -4.2, 26));
    g.hud.hint('Dive with <kbd>C</kbd> · surface with <kbd>Space</kbd> where there is air · watch both breath bars', 7);
    yield* this.until(() => U.toLocal(pl.pos).x < -5);
    // the flashlight drowns
    for (let k = 0; k < 24; k++) { pl.lampFlicker = Math.random() < .5 ? 0 : .4 + Math.random() * .6; yield* this.sleep(.05 + Math.random() * .08); }
    pl.lampFlicker = 0; HGA.click();
    this.sayAsync('ELI', "Light's gone. Stay on me. Swim for the glow.");
    const [p1, p2] = U.pockets;
    yield* this.until(() => U.toLocal(pl.pos).x < p1[1] + .4);
    this.objective('Next pocket — keep going west.', U.L((p2[0] + p2[1]) / 2, -4.2, 26));
    yield* this.until(() => U.toLocal(pl.pos).x < p2[1] + .4);
    this.objective('The emergency stairs — west end, on the right.', U.L(-56, -4, 25.6));
    yield* this.until(() => { const l = U.toLocal(pl.pos); return l.x > -59 && l.x < -49 && l.y > -4.6 && pl.mode === 'walk'; });
    pl.lampFlicker = undefined;
    this.objective('Up to the street.', U.exitAt.clone().applyMatrix4(U.group.matrixWorld).setY(1.2));
    yield* this.until(() => { const l = U.toLocal(pl.pos); return l.y > -.4 && l.z > 27.7 && l.x < -54; });
    yield* this.until(() => !this.talking);
    yield* this.cine(dawnCine(g, this));
    this.finish();
  }
  tick(dt) {
    for (const gd of this.guards) gd.update(dt);
    this.iris.update(dt);
    this.fire.tick(dt, this.t); this.smoke.tick(dt);
  }
  failChecks() {
    const pl = this.pl, l = this.row.toLocal(pl.pos);
    if (this.iris.on && this.iris.breath <= 0) this.fail('Iris drowned in the dark.');
    if (this.onRoofs && l.y < 6 && !(l.z > 9 && l.x > 44)) this.fail('Eli fell from the roof.');
  }
  endStat() { return `Iris Achebe — alive  ·  the Delphine Rose (tug) — lost  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const R = this.row, a = .4 + Math.sin(t * .04) * .5, c = R.L(20, 8, 0); cam.position.set(c.x + Math.sin(a) * 70, 30, c.z + Math.cos(a) * 70); cam.lookAt(c.x, 6, c.z); cam.fov = 50; }
}

// ---------------- cutscenes ----------------
function breachCine(g, m) {
  const R = m.row, L = m.L, pl = g.player, ir = m.iris, rot = R.group.rotation.y, Y = M6.LOFT + .05;
  return {
    enter: c => { g.hud.show(false); ir.show(true); ir.mode = 'sit'; ir.seatH = .5; ir.place(L(-4, Y, 6.4), rot + Math.PI); pl.h.root.visible = true; pl.h.setMode('drink'); pl.h.root.position.copy(L(3, Y, -7.6)); pl.h.root.rotation.set(0, rot + Math.PI, 0); },
    update: (c, dt) => { pl.h.update(dt, 0); ir.update(dt); },
    shots: [
      { dur: 6, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: L(-60, 40, -70), look: L(10, 8, 0) }, title: [.5, 'BURN NOTICE', 'GOWANUS, BROOKLYN  ·  5:52 AM', 'hg', 5] },
      { dur: 7, fadeIn: 1.5, cam: () => ({ from: L(-50, 25, -60), to: L(-20, 14, -30), look: L(3, 9, -9), fov: 46, ease: 'sine' }) },
      { dur: 10, cam: () => ({ from: L(-2, Y + 1.8, -3), to: L(-1.4, Y + 1.7, -3.6), look: L(3, Y + 1.5, -8.4), fov: 44 }),
        lines: [ln(.5, 'STATIC', "Eli. Wake up. Three black SUVs on Bond Street, no plates."), ln(4.6, 'ELI', "Halcyon?"), ln(5.8, 'STATIC', "They're not delivering bagels. Sixty seconds. Go.")] },
      { dur: 4, cam: () => ({ from: L(4, Y + 1.7, -5), to: L(3.6, Y + 1.6, -4.4), look: L(-4, Y + .8, 6.4), fov: 44 }), lines: [ln(.3, 'ELI', "Iris! Up. Now.")], enter: c => { pl.h.setMode('idle'); } },
      { dur: 2.2, cam: () => ({ from: L(-6, Y + 2.2, -4), look: L(-11.5, Y + 1.2, 0), fov: 52 }),
        tick: (c, t) => { if (t > .6 && !c.fb) { c.fb = 1; HGA.flashbang(); g.hud.flashbang = .9; g.shake(.6, .8); } } },
    ],
    exit: c => { ir.mode = 'idle'; ir.seatH = undefined; },
  };
}
function tugCine(g, m) {
  const R = m.row, L = m.L, pl = g.player, ir = m.iris, tug = m.tug, rot = R.group.rotation.y;
  return {
    enter: c => { g.hud.show(false); for (const gd of m.guards) gd.passive = true; pl.h.root.position.copy(L(33, M6.R3, -7.4)); pl.h.root.rotation.set(0, rot - Math.PI * .8, 0); pl.h.setMode('idle'); ir.h.root.position.copy(L(31.6, M6.R3, -7.2)); ir.h.root.rotation.set(0, rot - Math.PI * .8, 0); ir.h.setMode('idle'); },
    update: (c, dt) => { pl.h.update(dt, 0); ir.h.update(dt, 0); m.fire.tick(dt, m.t + c.t); m.smoke.tick(dt); },
    shots: [
      { dur: 4.5, path: watchCam(L(24, M6.R3 + 11, -18), L(22, M6.R3 + 12, -19), () => tug.position, 40, 2),
        tick: (c, t) => { if (t > 1.6 && !c.b) { c.b = 1; HGA.boom(); m.fire.on = true; m.smoke.visible = true; HGA.fireV = .08; g.shake(.3, 1); } } },
      { dur: 9, cam: () => ({ from: L(34.6, M6.R3 + 1.7, -5.6), to: L(34.4, M6.R3 + 1.7, -5.9), look: L(32.3, M6.R3 + 1.5, -7.6), fov: 40 }),
        lines: [ln(.4, 'IRIS', "Is that...?"), ln(2.2, 'ELI', "My boat. Everything I own was on that boat."), ln(6, 'IRIS', "Halcyon doesn't leave things behind. It leaves ashes.")] },
      { dur: 10.5, path: watchCam(tug.position.clone().add(V3(20, 8, 16)), tug.position.clone().add(V3(15, 6, 13)), () => tug.position, 46, 3),
        lines: [ln(.3, 'STATIC', "Eli, they're boxing you in. There's a dead subway stop across the street. Old IND platform, flooded since Delphine. Nobody follows you in there."), ln(8, 'ELI', "How flooded?"), ln(9.2, 'STATIC', "All the way.")] },
    ],
    exit: c => { for (const gd of m.guards) gd.passive = false; },
  };
}
function dawnCine(g, m) {
  const U = m.sub, pl = g.player, ir = m.iris, rot = U.group.rotation.y;
  const P = (x, y, z) => U.L(x, y, z);
  return {
    enter: c => { g.hud.show(false); pl.h.root.position.copy(P(-57, .05, 29.4)); pl.h.root.rotation.set(0, rot + .3, 0); pl.h.setMode('idle'); ir.h.root.position.copy(P(-58.6, .05, 28.8)); ir.h.root.rotation.set(0, rot + .5, 0); ir.h.setMode('idle'); },
    update: (c, dt) => { pl.h.update(dt, 0); ir.h.update(dt, 0); m.fire.tick(dt, m.t + c.t); m.smoke.tick(dt); },
    shots: [
      { dur: 8, fadeIn: 1, cam: () => ({ from: P(-52, 1.7, 35), to: P(-52.6, 1.7, 34.4), look: P(-57.8, 1.4, 29), fov: 42 }),
        lines: [ln(.6, 'STATIC', "Eli? Eli, talk to me. I lost you under the street."), ln(4.4, 'ELI', "We're out."), ln(5.8, 'IRIS', "Where do we go?")] },
      { dur: 7, fadeOut: 1.8, cam: () => ({ from: P(-46, 5, 40), to: P(-36, 18, 52), look: P(-57, 1.5, 29), fov: 48, ease: 'sine' }),
        lines: [ln(.6, 'ELI', "Somewhere Crane doesn't own. If there's anywhere left.")] },
      { dur: 6, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: P(-40, 20, 50), look: P(-57, 1, 29) }, title: [.4, 'TO BE CONTINUED', 'Mission 7 — LOW TIDE', 'card', 5.2] },
    ],
  };
}

HG_MISSIONS[6] = {
  n: 6, title: 'BURN NOTICE', place: 'Gowanus, Brooklyn · dawn', area: 'gowanus', cls: Mission6, look: CAST.eli, gear: 'street',
  world: { area: 'gowanus', weather: 'dawn', flood: false, b7: false, liberty: true, skyline: true, litP: .08, lamps: false, water: -.6, center: [45, -200], view: 1000, propR: 420, carR: 280,
    sites: [{ name: 'block', label: 'SAFEHOUSE', x: 45, z: -200, rot: 'grid', clear: [[-16, -12, 66, 26], [-63, 13, -48, 32]], holes: [[46.8, 19.7, 54.4, 23.3], [-59.8, 23.8, -51.2, 27.4]] }] },
  insetTitle: 'GOWANUS, BROOKLYN — DAWN',
  loading: 'Loading Gowanus, the canal, the rooftops and the flooded station...',
  nextText: 'TO BE CONTINUED — MISSION 7: LOW TIDE (not in this prototype)',
  blurb: 'The loft is gone, the tugboat is gone, and Halcyon knows Eli\'s face. What he has left is a crew, a client who hired him to kidnap her, and a story about the Hell Gate Barrier that nobody in New York is supposed to hear.',
};
