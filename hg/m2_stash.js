'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 2: "Stash House" (extraction). Hunts Point, the Bronx,
// at night in the rain. Briefing with Deacon at the Low Note, a swim up the
// East River to a drainage outflow, a warehouse full of armed men, Lucía Ortega,
// and Sof — who arrives by driving a van through the gate.
// ---------------------------------------------------------------------------

// ---------------- the Low Note: Deacon's jazz bar in Harlem (briefing room, built under the map) ----------------
function buildLowNote(world, x, z, y = -60) {
  const S = new GameSet(world, { x, z, rot: 0 }, { x0: -8, x1: 8, y0: y - 1, y1: y + 5, z0: -6, z1: 6 }, { name: 'lownote', ownFloor: true });
  S.room(-7, -5, 7, 5, y, 3.6, { wall: 'plaster', floorMat: 'plank', floorColor: '#6a4a32', ceilMat: 'wood', ceilColor: '#3a2a1e' });
  S.bar(-6, -3.4, 1.5, -2.8, y);                                       // the bar along the back wall
  for (let k = 0; k < 6; k++) S.V(-6 + k * 1.2, y + 1.5 + (k % 2) * .02, -4.95, -5.2 + k * 1.2, y + 2.4, -4.75, 'glass', '#d9a860');      // bottle shelves
  for (let k = 0; k < 22; k++) { const bx = -6 + Math.random() * 7.2, by = y + 1.55 + (k % 2) * .5; S.V(bx, by, -4.9, bx + .08, by + .32, -4.82, 'glass', pick(['#2a5a2a', '#6a3a1a', '#c9a24a', '#8a1c1c', '#ddd'])); }
  for (const sx of [-5.4, -4.2, -1, .2]) { S.V(sx - .12, y, -2.32, sx + .12, y + .75, -2.08, 'metal', '#2a2a2a'); S.V(sx - .25, y + .75, -2.45, sx + .25, y + .82, -1.95, 'cloth', '#6a1a1a'); }   // stools
  S.V(3, y, 1.5, 7, y + .3, 5, 'plank', '#4a3020');                    // the little stage
  S.V(4.2, y + .3, 3.6, 5.8, y + 1.6, 4.4, 'wood', '#1a1410'); S.V(4.3, y + 1, 3.3, 5.7, y + 1.08, 3.6, 'cloth', '#eee');  // upright piano
  S.V(6.2, y + .3, 2, 6.3, y + 1.8, 2.1, 'metal', '#888');            // mic stand
  for (const [bx, bz] of [[-5, 2.5], [-2.5, 2.5], [0, 2.5]]) { S.table(bx, y, bz, .45, .74, '#2a1a12', false); S.V(bx - .8, y, bz + .9, bx + .8, y + 1.1, bz + 1.2, 'cloth', '#5a1420'); }
  S.sign('THE LOW NOTE', 0, y + 2.9, -4.85, 0, 3.2, .6, '#000', '#ff6a9a', true);
  S.light(-2.5, y + 3.3, -3, 0xffb070, 1.6, 9); S.light(5, y + 3.3, 3, 0xff8a50, 1.4, 7); S.light(-3, y + 3.3, 2.5, 0xffc080, .8, 7, 0, false);
  S.finish(); world.addSet(S); return S;
}

// ---------------- the warehouse on the water ----------------
function buildStash(world, site) {
  const S = new GameSet(world, site, { x0: -27, x1: 27, y0: -4, y1: 12, z0: -23, z1: 30 }, { name: 'stash', roofed: true });
  const F = .05, H = 8;
  S.ownFloor = [[-15, 5, -9, 11, .5], [-13.4, 10, -10.6, 34, .5]];          // the sump and the drainage pipe are below the street
  // shore line at the pipe (the real coastline from the map)
  let shoreZ = 24; for (let z = 14; z < 36; z += .5) { const [wx, wz] = site.world(-12, z); if (world.classAt(wx, wz) === 0) { shoreZ = z; break; } }
  S.shoreZ = shoreZ;
  // floor with the sump hole
  S.floor(-20, -13, 20, 5, F, 'slab'); S.floor(-20, 5, -15, 13, F, 'slab'); S.floor(-9, 5, 20, 13, F, 'slab'); S.floor(-15, 11, -9, 13, F, 'slab');
  // sump: a concrete pit full of black water
  S.S(-15.3, -3.2, 5, -15, F, 11, 'conc', 'wall'); S.S(-9, -3.2, 5, -8.7, F, 11, 'conc', 'wall'); S.S(-15, -3.2, 4.7, -9, F, 5, 'conc', 'wall');
  S.S(-15, -3.2, 11, -12.8, F, 11.3, 'conc', 'wall'); S.S(-11.2, -3.2, 11, -9, F, 11.3, 'conc', 'wall'); S.S(-12.8, -1.5, 11, -11.2, F, 11.3, 'conc', 'wall');
  S.S(-15, -3.5, 5, -9, -3.2, 11, 'conc', 'floor');
  for (let k = 0; k < 5; k++) S.V(-9.05, -2.6 + k * .55, 7.6, -8.95, -2.55 + k * .55, 8.4, 'metal', '#8a8a80');   // ladder rungs
  S.addWater(-15, 5, -9, 11, -.6);
  // drainage pipe out to the river, with a rusted grate halfway
  const pz1 = shoreZ + 1.2;
  S.S(-13.1, -3.2, 11, -11, -2.9, pz1, 'conc', 'floor', '#6a6a60'); S.S(-13.1, -1.5, 11.3, -10.9, -1.2, pz1, 'conc', 'ceil', '#6a6a60');
  S.S(-13.1, -2.9, 11.3, -12.8, -1.5, pz1, 'conc', 'wall', '#6a6a60'); S.S(-11.2, -2.9, 11.3, -10.9, -1.5, pz1, 'conc', 'wall', '#6a6a60');
  S.addWater(-13.2, 11, -10.8, pz1 + .5, -.6, false);
  // headwall around the outflow in the bulkhead
  S.V(-17, -8, shoreZ - .1, -12.8, .06, shoreZ + .3, 'conc', '#8a867c'); S.V(-11.2, -8, shoreZ - .1, -7, .06, shoreZ + .3, 'conc', '#8a867c');
  S.V(-12.8, -8, shoreZ - .1, -11.2, -2.9, shoreZ + .3, 'conc', '#8a867c'); S.V(-12.8, -1.5, shoreZ - .1, -11.2, .06, shoreZ + .3, 'conc', '#8a867c');
  for (let k = 0; k < 6; k++) S.V(-17, -.6 - k * .4 - Math.random() * .1, shoreZ + .3, -7, -.55 - k * .4, shoreZ + .32, 'rust', '#3a4a2a');   // slime lines
  const grate = new THREE.Group(), gm = stdMat('#5a3a26', { metalness: .6, roughness: .8 });
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.4, .06), gm); b.position.set(-12.65 + k * .26, -2.2, 18.5); grate.add(b); }
  for (const yy of [-2.7, -1.75]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, .06, .06), gm); b.position.set(-12, yy, 18.5); grate.add(b); }
  S.group.add(grate); S.grate = grate; S.grateSolid = S.S(-12.8, -2.9, 18.4, -11.2, -1.5, 18.6, null, 'grate');
  // walls: corrugated steel, a personnel door at the front and a big roller door (shut)
  const wc = '#7a8088';
  S.wallX(-13, -20, 20, F, H, [[-4.5, 4.5, 4.6], [-15.4, -14.2, 2.2]], 'metal', .25, wc);
  S.wallX(13, -20, 20, F, H, [[12, 13.2, 2.2]], 'metal', .25, wc);
  S.wallZ(-20, -13, 13, F, H, [], 'metal', .25, wc); S.wallZ(20, -13, 13, F, H, [], 'metal', .25, wc);
  S.S(-4.5, F, -13.15, 4.5, 4.6, -12.85, 'rust', 'door', '#5a6470');                  // roller door, down
  for (let k = 0; k < 14; k++) S.V(-4.5, F + .3 + k * .32, -13.2, 4.5, F + .34 + k * .32, -13.16, 'metal', '#3a4048');
  S.S(-20.2, H, -13.2, 20.2, H + .3, 13.2, 'metal', 'roof', '#4a4e54');
  for (let x = -16; x <= 16; x += 8) S.V(x - .15, H - .6, -13, x + .15, H, 13, 'metal', '#2a2e33');   // roof trusses
  // office in the north-east corner (where they keep her) with a mezzanine on top
  S.wallZ(12, -13, -5, F, 3.2, [[-9.2, -7.9, 2.2]], 'block', .2, '#b8b0a0'); S.wallX(-5, 12, 20, F, 3.2, [], 'block', .2, '#b8b0a0');
  S.S(12, 3.2, -13, 20, 3.45, -5, 'conc', 'floor', '#7a7670');
  S.V(12, 3.45, -5.1, 20, 4.45, -5, 'metal', '#c9a020'); S.V(11.9, 3.45, -13, 12, 4.45, -7.2, 'metal', '#c9a020');
  S.solids.push({ x0: 12, x1: 20, y0: 3.45, y1: 4.45, z0: -5.15, z1: -4.95, tag: 'rail', on: true }, { x0: 11.85, x1: 12.05, y0: 3.45, y1: 4.45, z0: -13, z1: -7.2, tag: 'rail', on: true });
  S.stairs(10.6, 11.9, 1.2, -7.2, F, 3.45, 14, 'metal');
  S.desk(17.5, F, -11.5, 1.8, .8, '#5a4a3a'); S.V(16, F, -12.9, 17, F + 2, -12.4, 'metal', '#6a6a6a');     // desk, filing cabinet
  S.officeDoor = S.S(12.0, F, -9.2, 12.2, 2.2, -7.9, null, 'door');
  { const dm = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.12, 1.26), stdMat('#6a4a30', { roughness: .7 })), pv = new THREE.Group(); pv.position.set(12.1, F, -9.18); dm.position.set(0, 1.06, .63); dm.castShadow = true; pv.add(dm); S.group.add(pv); S.officeDoorPivot = pv; }
  S.V(16.3, F + .42, -8.8, 16.7, F + .47, -8.4, 'wood', '#3a3a3a'); S.V(16.68, F + .47, -8.8, 16.74, F + 1.05, -8.4, 'wood', '#3a3a3a');   // her chair
  for (const [cx, cz] of [[16.32, -8.78], [16.68, -8.78], [16.32, -8.42], [16.68, -8.42]]) S.V(cx - .02, F, cz - .02, cx + .02, F + .42, cz + .02, 'metal', '#222');
  S.chairPos = V3(16.5, F, -8.6);
  S.sign('NO ENTRY', 11.85, 2.5, -8.5, -Math.PI / 2, 1, .3, '#c9a020', '#111');
  // stock: shelving rows, pallets, crates, a box truck, a forklift, the card table
  S.shelf(-4, F, -2, 14, false); S.shelf(1.5, F, -2, 14, false);
  for (const [px, pz, n] of [[-17, -10, 2], [-17, -7.5, 1], [-14.5, -10, 2], [7, 9, 2], [9.5, 9, 1], [16, 9, 2], [16, 6.5, 1], [-8, -10.5, 1], [5, -10.5, 2]]) S.pallet(px, F, pz, n);
  for (const [cx, cz, w, h] of [[-17.5, 2, 1.4, 1.4], [-17.5, 3.6, 1.2, 1.2], [-6.5, 9.5, 1.4, 1.8], [12.5, 2.5, 1.2, 1.2], [18, 1, 1.4, 1.4], [-11, -2, 1.2, 1.6]]) S.crate(cx, F, cz, w, h, w);
  const truck = makeVehicle('van', '#d8d8d0'); truck.scale.set(1.15, 1.25, 1.2); S.add(truck, 2, F, 8.6, Math.PI / 2); S.S(-1.6, F, 7.3, 5.6, 2.9, 9.9, null, 'truck');
  S.V(-15, F, -4, -13.4, F + 1.2, -1, 'metal', '#d8a020'); S.V(-14.9, F + 1.2, -3.9, -13.5, F + 3, -3.7, 'metal', '#333'); S.solids.push({ x0: -15, x1: -13.4, y0: F, y1: F + 2, z0: -4, z1: -1, tag: 'forklift', on: true });
  S.table(8, F, -1.5, .7, .76, '#2b5a32'); S.chair(7, F, -1.5, Math.PI / 2, '#555'); S.chair(9, F, -1.5, -Math.PI / 2, '#555');
  for (let k = 0; k < 9; k++) S.V(7.6 + Math.random() * .8, F + .77, -1.9 + Math.random() * .8, 7.7 + Math.random() * .8, F + .775, -1.8 + Math.random() * .8, 'cloth', '#f4f4f4');
  // lights: a few hanging sodium lamps (pools of light; the rest is dark)
  S.lamps = [[-10, 7.2, -7], [2, 7.2, -8], [8, 7.2, -1.5], [8, 7.2, 8], [16, 2.9, -9]];
  S.lamps.forEach(([lx, ly, lz], k) => S.light(lx, ly, lz, k === 4 ? 0xfff0d0 : 0xffc070, k === 4 ? 1.1 : 1.6, k === 4 ? 7 : 15, k === 0 ? 3 : 0));
  // yard: chain-link fence and the front gate on the street
  const fence = (x0, z0, x1, z1) => { S.V(x0, 0, z0, x1 + (x0 === x1 ? .05 : 0), 2.4, z1 + (z0 === z1 ? .05 : 0), 'glass', '#9aa'); S.solids.push({ x0: Math.min(x0, x1) - .05, x1: Math.max(x0, x1) + .05, y0: 0, y1: 2.6, z0: Math.min(z0, z1) - .05, z1: Math.max(z0, z1) + .05, tag: 'fence', on: true }); for (let t = 0; t <= 1.001; t += 1 / Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3))) S.V(lerp(x0, x1, t) - .04, 0, lerp(z0, z1, t) - .04, lerp(x0, x1, t) + .04, 2.5, lerp(z0, z1, t) + .04, 'metal', '#777'); };
  fence(-26, -22, -6, -22); fence(6, -22, 26, -22); fence(-26, -22, -26, shoreZ - 1); fence(26, -22, 26, shoreZ - 1);
  const gateM = stdMat('#8a9096', { metalness: .6, roughness: .5 }); S.gates = [];
  for (const sx of [-1, 1]) { const gg = new THREE.Group(); for (let k = 0; k <= 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, 2.4, .05), gateM); b.position.set(sx * -k, 1.2, 0); gg.add(b); } const top = new THREE.Mesh(new THREE.BoxGeometry(6, .07, .07), gateM); top.position.set(sx * -3, 2.4, 0); gg.add(top); const mid = top.clone(); mid.position.y = 1.2; gg.add(mid); gg.position.set(sx * 6, 0, -22); S.group.add(gg); S.gates.push(gg); }
  S.gateSolid = S.S(-6, 0, -22.1, 6, 2.6, -21.9, null, 'gate');
  S.sign('B&R COLD STORAGE', 0, 6.2, -13.25, Math.PI, 5, .9, '#1d2a3a', '#d8d2c0');
  S.light(-9, 6, -14.5, 0xffd8a0, 1.2, 16, 0, true);        // floodlight over the yard
  S.finish(); world.addSet(S); return S;
}

class Mission2 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world;
    this.set = buildStash(W, W.site.stash);
    this.bar = buildLowNote(W, W.site.stash.x + 400, W.site.stash.z - 400);
    const S = this.set, L = (x, y, z) => S.L(x, y, z);
    this.L = L;
    // the cast
    this.deacon = new Extra(g, 'deacon'); this.deacon.place(this.bar.L(-2.6, -60, -4.1), 0); this.deacon.mode = 'idle';
    this.lucia = new Follower(g, 'lucia', { label: 'LUCÍA', breathMax: 30 });
    this.sof = makeHuman(castLook('sof'));
    this.van = makeVehicle('van', '#4a5562', { clear: true }); this.van.visible = false; g.scene.add(this.van); vehicleLights(this.van, false);
    seatHuman(this.sof, this.van, .5, .95, 1.4);
    // the men holding her
    const bark = { hear: "You hear that?", alert: "Hey! Right there!", body: "Yo! Manny's down!", calm: "Rats. Gotta be rats." };
    const ga = (x, z, y = .05) => L(x, y, z), rot = S.group.rotation.y;
    this.addGuard('thug', ga(-6, -11.8), rot, { bark, route: [{ p: ga(-6, -11.8), wait: 2 }, { p: ga(-6, 3.6), wait: 1.5 }, { p: ga(-16, 3.4), wait: 2.5, look: rot - Math.PI / 2 }, { p: ga(-16, -6), wait: 1 }, { p: ga(-11, -12), wait: 1.5 }] });
    this.addGuard('thug', ga(4, 5.5), rot, { bark, route: [{ p: ga(4, 5.5), wait: 1 }, { p: ga(14, 5), wait: 2.5 }, { p: ga(14, -3.5), wait: 1 }, { p: ga(9, -3.6), wait: .5 }, { p: ga(4, -6), wait: .5 }, { p: ga(4, -10.6), wait: 2 }] });
    this.addGuard('thug', ga(7.1, -1.5), rot + Math.PI / 2 + .6, { bark, gun: 'pistol', range: 12 }).sitting = true;
    this.addGuard('thug', ga(8.9, -1.5), rot - Math.PI / 2, { bark, gun: 'pistol', range: 12 }).sitting = true;
    this.addGuard('thug', ga(16, -7, 3.45), rot - Math.PI / 2, { bark, range: 18 });
    this.addGuard('thug', ga(0, -19, 0), rot + Math.PI, { bark, range: 18 });
    for (const gd of this.guards) { gd.walkSpeed = 1.25; gd.home = { p: gd.pos.clone(), yaw: gd.yaw }; }
    this.hitScale = .55; this.alertMemory = 12;
  }
  // how lit a spot is (guards see you from further in the light)
  lightAt(p) {
    const S = this.set; if (!S.inside(p)) return .85;
    let best = .45; for (const [x, y, z] of S.lamps) { const w = S.L(x, p.y, z), d = Math.hypot(w.x - p.x, w.z - p.z); best = Math.max(best, 1 - d / 13); }
    return best;
  }
  restore(cp) {
    const g = this.g, S = this.set, L = this.L, pl = g.player, rot = S.group.rotation.y;
    HGA.alarmOn = false; HGA.crowdV = 0; HGA.humV = .02; this.alarmed = false;
    this.resetGuards(); for (const gd of this.guards) gd.passive = false;
    this.lucia.stop(); this.lucia.show(true); this.lucia.mode = 'sitbound'; this.lucia.seatH = .46; this.lucia.place(S.L(16.45, .05, -8.6), rot - Math.PI / 2); g.hud.follower(null);
    S.officeDoor.on = true; S.officeDoorPivot.rotation.y = 0; this.vanState = null; this.van.visible = false;
    for (const gg of S.gates) { gg.rotation.set(0, 0, 0); gg.visible = true; } S.gateSolid.on = true;
    const grateOpen = cp >= 2; S.grate.visible = !grateOpen; S.grateSolid.on = !grateOpen;
    if (cp <= 1) pl.teleport(L(-84, -2.02, 32), rot + Math.PI * .5, 'swim');
    if (cp === 2) pl.teleport(L(-12, .05, 3.6), rot + Math.PI, 'walk');
    if (cp >= 3) { S.officeDoor.on = false; S.officeDoorPivot.rotation.y = -1.7; pl.teleport(L(14.5, .05, -8.5), rot - Math.PI / 2, 'walk'); this.lucia.place(L(16, .05, -8.5), rot - Math.PI / 2); this.lucia.mode = 'idle'; this.lucia.start(); g.hud.follower(this.lucia); }
    g.rig.yaw = pl.yaw; g.rig.pitch = .15; g.rig.snap();
  }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    if (cp <= 2) yield* this.s2();
    yield* this.s3();
  }
  // ---------- 0: the Low Note (briefing)
  *s0() { yield* this.cine(lowNoteCine(this.g, this)); this.restore(1); this.checkpoint(1); }
  // ---------- 1: the river and the pipe
  *s1() {
    const S = this.set, pl = this.pl, L = this.L;
    this.g.hud.show(true);
    const mouth = L(-12, -2.2, S.shoreZ + 1.6);
    this.objective('Swim up the East River to the warehouse drainage outflow.', mouth.clone().setY(-.2));
    this.g.hud.hint('<kbd>W A S D</kbd> swim &nbsp; <kbd>Shift</kbd> faster &nbsp; <kbd>C</kbd> dive &nbsp; <kbd>Space</kbd> surface &nbsp; <kbd>F</kbd> flashlight', 9);
    yield* this.sleep(1.5);
    yield* this.say('ELI', "Nobody watches the river. Nobody ever does.");
    yield* this.until(() => pl.pos.distanceTo(mouth) < 9);
    this.objective('Dive into the outflow pipe. (C to dive)', mouth);
    yield* this.until(() => { const l = S.toLocal(pl.pos); return l.z < S.shoreZ && l.y < -1 && Math.abs(l.x + 12) < 1.2; });
    this.objective('Follow the pipe. Pry the grate loose.', L(-12, -2.2, 18.9));
    pl.lightOn = true;
    yield* this.holdE(L(-12, -2.2, 18.9), 1.7, 'pry the grate loose', 1.8, () => { HGA.metal(); this.g.shake(.1, .2); });
    S.grate.visible = false; S.grateSolid.on = false; HGA.metal(); HGA.bubbles();
    this.objective('Surface in the sump.', L(-12, -.6, 8));
    yield* this.until(() => { const l = S.toLocal(pl.pos); return l.z < 11 && pl.mode !== 'dive'; });
    yield* this.until(() => pl.mode === 'walk' && S.toLocal(pl.pos).y > -.2);
    pl.lightOn = false;
    this.checkpoint(2);
  }
  // ---------- 2: the warehouse
  *s2() {
    const S = this.set, pl = this.pl, L = this.L, g = this.g;
    this.objective('Find Lucía. Stay in the dark and out of sight.', L(12.4, 1.2, -8.5));
    g.hud.hint('<kbd>C</kbd> crouch — slower, quieter, harder to see &nbsp;·&nbsp; walk up behind a guard and press <kbd>E</kbd> to take him down &nbsp;·&nbsp; the ring shows who is getting suspicious', 10);
    yield* this.sleep(1);
    yield* this.say('ELI', "Six of them. Card game by the office. That's where she'll be.");
    yield* this.until(() => pl.pos.distanceTo(L(12, .05, -8.5)) < 2.6);
    yield* this.holdE(L(12, .05, -8.5), 2.2, 'pick the lock', 2.4, () => HGA.click());
    S.officeDoor.on = false; S.officeDoorPivot.rotation.y = -1.7; HGA.door();
    this.objective('Get to Lucía.', L(16.5, 1, -8.6));
    yield* this.pressE(L(16.5, .05, -8.6), 1.8, 'Cut her loose');
    pl.locked = true; pl.vel.set(0, 0, 0); this.lucia.mode = 'idle'; this.lucia.place(this.lucia.pos.clone(), this.lucia.yaw);
    yield* this.say('LUCIA', "Please, I don't know anything, I swear—");
    yield* this.say('ELI', "Lucía. Your father sent me. I'm getting you out of here.");
    yield* this.say('LUCIA', "There's so many of them. How?");
    yield* this.say('ELI', "Can you swim?");
    yield* this.say('LUCIA', "Not... not like that. Not in the dark.");
    yield* this.say('ELI', "Then we go out the front. Stay close. When I stop, you stop.");
    pl.locked = false; this.lucia.start(); g.hud.follower(this.lucia);
    this.checkpoint(3);
  }
  // ---------- 3: the alarm, the gate, Sof
  *s3() {
    const S = this.set, pl = this.pl, L = this.L, g = this.g;
    g.hud.follower(this.lucia);
    yield* this.say('ELI', "Deacon. Plan B. I need that ride at the front gate.");
    yield* this.say('DEACON', "Already rolling. Ninety seconds. Don't be standing in the gate.");
    this.objective('Get Lucía to the front gate. Your ride is coming.', L(0, 1.2, -20));
    // somebody walks in on them
    const t0 = this.t;
    yield* this.until(() => this.t - t0 > 6 || pl.pos.distanceTo(L(12, .05, -8.5)) > 7);
    if (!this.anyAlert()) { const gd = this.guards.find(x => !x.down && x !== this.guards[5]) || this.guards[5]; if (gd) { gd.alarm(pl.pos, 'scripted'); } this.bark(null, "The girl's loose! Get up, get up!"); }
    for (const gd of this.guards) if (!gd.down) { gd.alarm(pl.pos, 'scripted'); gd.sitting = false; }
    this.sayAsync('LUCIA', "They're shooting! Oh God, they're shooting!");
    const tA = this.t;
    yield* this.until(() => { const l = S.toLocal(pl.pos); return (l.z < -14 && Math.abs(l.x) < 22) || this.t - tA > 75; });
    yield* this.until(() => !this.talking);
    yield* this.cine(vanCine(g, this));
    this.finish();
  }
  onGuardDown() { }
  tick(dt) {
    for (const gd of this.guards) gd.update(dt);
    this.lucia.update(dt); this.deacon.update(dt);
  }
  failChecks() { if (this.lucia.on && this.lucia.breath <= 0) this.fail('Lucía drowned.'); }
  endStat() { return `Lucía Ortega, 19 — out  ·  ${this.takedowns || 0} men taken down quietly  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const S = this.set, a = .6 + Math.sin(t * .05) * .5, c = S.L(0, 0, 0); cam.position.set(c.x + Math.sin(a) * 60, 14 + Math.sin(t * .1) * 3, c.z + Math.cos(a) * 60); cam.lookAt(c.x, 4, c.z); cam.fov = 50; }
}

// ---------------- cutscenes ----------------
function lowNoteCine(g, m) {
  const B = m.bar, pl = g.player, d = m.deacon, Y = -60;
  return {
    enter: c => { g.hud.show(false); pl.h.root.visible = true; pl.h.setMode('idle'); pl.h.root.position.copy(B.L(-2.6, Y, -2.2)); pl.h.root.rotation.set(0, Math.PI, 0); d.place(B.L(-2.6, Y, -4.1), 0); d.mode = 'idle'; },
    update: (c, dt) => { pl.h.update(dt, 0); d.update(dt); },
    shots: [
      { dur: 4.5, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: B.L(4, Y + 2.2, 4), look: B.L(-2, Y + 1.4, -3) }, title: [.5, 'THE LOW NOTE', 'HARLEM  ·  TONIGHT', 'hg', 3.6] },
      { dur: 9.5, fadeIn: 1.2, cam: () => ({ from: B.L(3.5, Y + 2.1, 3), to: B.L(1.2, Y + 1.8, 0), look: B.L(-2.6, Y + 1.5, -3.2), fov: 44 }),
        enter: c => { d.mode = 'talk'; }, lines: [ln(.8, 'DEACON', "Restaurant on Arthur Avenue. The owner's daughter. Lucía Ortega, nineteen."), ln(5.2, 'DEACON', "Her father owes the wrong people. They took her Tuesday, to make a point.")] },
      { dur: 8.6, cam: () => ({ from: B.L(-1.2, Y + 1.6, -3.4), to: B.L(-1.4, Y + 1.6, -3.2), look: B.L(-2.6, Y + 1.45, -2.3), fov: 40 }),
        lines: [ln(.3, 'ELI', "Cops?"), ln(1.6, 'DEACON', "Cops took his statement and lost it. The people holding her pay better than he does.")] },
      { dur: 9.5, cam: () => ({ from: B.L(-4.4, Y + 1.7, -2.6), to: B.L(-4, Y + 1.7, -2.2), look: B.L(-2.6, Y + 1.5, -3.6), fov: 42 }),
        lines: [ln(.3, 'DEACON', "Warehouse in Hunts Point, on the water. Six men, maybe more. They'll have the gate covered."), ln(6.2, 'ELI', "Nobody covers the river.")] },
      { dur: 9.4, fadeOut: 1, cam: () => ({ from: B.L(.5, Y + 1.9, -1), to: B.L(.2, Y + 1.8, -1.4), look: B.L(-2.6, Y + 1.5, -3), fov: 46 }),
        lines: [ln(.3, 'DEACON', "That's why I called you. Get her out quiet. I'll have a ride waiting."), ln(4.6, 'ELI', "What kind of ride?"), ln(6.2, 'DEACON', "The kind that doesn't stop.")] },
      { dur: 5, keepFade: true, enter: c => { g.hud.fade(1, 0); m.restore(1); }, cam: () => ({ from: m.L(-110, 6, 70), to: m.L(-95, 4, 52), look: m.L(-10, 4, 0), fov: 48 }), fadeIn: 1.4, title: [.6, 'HUNTS POINT', 'THE BRONX  ·  1:40 AM', 'hg', 3.8] },
    ],
    exit: c => { d.mode = 'idle'; },
  };
}
function vanCine(g, m) {
  const S = m.set, L = m.L, van = m.van, pl = g.player, lu = m.lucia;
  const P = a => a.map(([x, z]) => S.L(x, 0, z));
  const pathIn = P([[75, -41], [30, -40], [8, -37], [2, -27], [-1, -16]]), pathOut = P([[-1, -16], [-1, -31], [-18, -40], [-60, -38], [-92, -32], [-114, -46], [-124, -72]]);
  const along = (pts, k) => { const n = pts.length - 1, f = clamp(k, 0, .9999) * n, i = Math.floor(f), t = f - i; return pts[i].clone().lerp(pts[i + 1], t); };
  const head = (pts, k) => { const a = along(pts, k), b = along(pts, Math.min(.9999, k + .01)); return Math.atan2(b.x - a.x, b.z - a.z); };
  const gun = () => { const live = m.guards.filter(x => !x.down && x.vis); const gd = live[(Math.random() * live.length) | 0]; if (gd) FX.shot(gd.muzzle(), van.position.clone().add(V3((Math.random() - .5) * 3, 1 + Math.random(), (Math.random() - .5) * 3))); };
  return {
    enter: c => { g.hud.show(false); van.visible = true; vehicleLights(van, true); van.position.copy(pathIn[0]); van.rotation.set(0, head(pathIn, 0), 0); for (const gd of m.guards) gd.passive = true; HGA.engineRev(); },
    update: (c, dt) => { m.sof.update(dt, 0); for (const gd of m.guards) gd.update(dt); lu.update(dt); },
    shots: [
      { dur: 3.6, cam: () => ({ from: L(-9, 2.2, -15.5), to: L(-8, 2.4, -16.5), look: L(3, 1.2, -28), fov: 54 }),
        tick: (c, t) => {
          const k = clamp(t / 2.5, 0, 1); van.position.copy(along(pathIn, k));
          van.rotation.y = head(pathIn, Math.min(k, .98)) - smooth(.62, 1, k) * 1.75;          // throws it sideways into the yard
          if (t > 1.2 && !c.sc) { c.sc = 1; HGA.screech(); }
          if (k > .78 && !c.cr) { c.cr = 1; c.crT = t; HGA.crash(); g.shake(.4, .6); m.set.gateSolid.on = false; const gd = m.guards[5]; if (gd && !gd.down) gd.takedown(); }
          if (c.cr) { const q = clamp((t - c.crT) / .5, 0, 1); S.gates[0].rotation.set(0, -q * 1.4, q * .5); S.gates[0].position.y = q * .3; S.gates[1].rotation.set(0, q * 1.6, -q * .4); }
          if (Math.random() < .08) gun();
        } },
      { dur: 3.2, path: followCam(van, [-3.4, 1.6, 3.6], [-3, 1.6, 3], [.4, 1.35, 1.3], 44),
        lines: [ln(.3, 'SOF', "You Eli? Get in the van!")], tick: () => { if (Math.random() < .06) gun(); } },
      { dur: 3.8, fadeOut: .6, path: watchCam(L(-14, 3.4, -16), L(-16, 3.8, -20), () => van.position, 50, 1),
        enter: c => { pl.h.root.visible = false; lu.show(false); },
        tick: (c, t) => { const k = clamp((t - .7) / 3, 0, 1) * .3; van.position.copy(along(pathOut, k)); van.rotation.y = dampAngle(van.rotation.y, head(pathOut, k), 4, 1 / 30); if (t > .6 && !c.r) { c.r = 1; HGA.engineRev(); HGA.screech(); } if (Math.random() < .1) gun(); } },
      { dur: 13, fadeIn: .8, path: watchCam(S.L(-40, 4, -52), S.L(-96, 5, -54), () => van.position, 46, 1),
        enter: c => { seatHuman(lu.h, van, -.45, .95, .2, 0); seatHuman(pl.h, van, -.45, .95, 1.4, 0); lu.h.root.visible = true; pl.h.root.visible = true; },
        tick: (c, t) => { const k = clamp(.3 + t / 13 * .69, 0, .99); van.position.copy(along(pathOut, k)); van.rotation.y = dampAngle(van.rotation.y, head(pathOut, k), 4, 1 / 30); HGA.motor(.7, 1.6); pl.h.update(1 / 60, 0); lu.h.update(1 / 60, 0); },
        lines: [ln(.5, 'SOF', "Deacon said you'd be quiet. That was not quiet."), ln(4.2, 'ELI', "They had a man on the gate. You hit him with a van."), ln(8.4, 'SOF', "He'll live. Probably. I'm Sof.")] },
      { dur: 11, fadeOut: 1.4, cam: () => ({ from: van.localToWorld(V3(-1.5, 1.65, 6)), to: van.localToWorld(V3(-1.3, 1.6, 5.3)), look: van.localToWorld(V3(-.1, 1.25, .8)), fov: 42 }),
        tick: (c, t) => { HGA.motor(.6, 1.5); pl.h.update(1 / 60, 0); lu.h.update(1 / 60, 0); },
        lines: [ln(.4, 'LUCIA', "Thank you. Both of you. Thank you."), ln(3.4, 'SOF', "Thank Deacon. He's the one paying me."), ln(6.2, 'ELI', "Arthur Avenue. Her father's waiting."), ln(8.4, 'SOF', "Buckle up, princess. I always drive like this.")] },
    ],
    exit: c => { HGA.motor(0); pl.h.root.visible = true; },
  };
}

HG_MISSIONS[2] = {
  n: 2, title: 'STASH HOUSE', place: 'Hunts Point, the Bronx', area: 'huntspoint', cls: Mission2, look: CAST.eli, gear: 'street',
  world: { area: 'huntspoint', weather: 'rain', flood: false, b7: false, liberty: false, litP: .2, lamps: true, water: -.6, center: [-688, 262], view: 1100, propR: 520, carR: 300,
    sites: [{ name: 'stash', label: 'STASH HOUSE', x: -688, z: 262, rot: .07, clear: [-28, -24, 28, 24], holes: [[-16.9, 3.1, -7.1, 12.9]], shoreCut: [-14, 10, -10, 40] }] },
  leash: { x: -688, z: 262, r: 230, msg: 'Stay on the job. The warehouse is right here on the water.' },
  insetTitle: 'HUNTS POINT, THE BRONX — TONIGHT',
  loading: 'Loading Hunts Point, the warehouse and the crew...',
  blurb: 'Lucía Ortega went home to Arthur Avenue before sunrise. Deacon got paid. And Eli met the getaway driver who will not stop talking — or stop for anything.',
};
