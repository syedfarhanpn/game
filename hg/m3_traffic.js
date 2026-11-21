'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 3: "Bridge Traffic" (breakout). The Lincoln Tunnel
// approach under Midtown, in the rain. A prison transport is stuck in a jam
// that Static made. Static cuts the lights; Eli takes a mob accountant out of
// the bus and up an emergency stair to a waiting van.
// ---------------------------------------------------------------------------
const M3 = { ROAD: -7.5, WALK: -6.6, CEIL: -2.6, ZR: -5.5, ZL: 3.8, BUS_X: -95 };

function buildTunnel(world, site) {
  const R = M3.ROAD, W = M3.WALK, C = M3.CEIL, ZR = M3.ZR, ZL = M3.ZL;
  // the bored tunnel (underground, roofed)
  const T = new GameSet(world, site, { x0: -206, x1: .1, y0: -9, y1: -1.6, z0: -6.2, z1: 4.6 }, { name: 'tunnel', underground: true, ownFloor: [[-206, -6.2, .1, 4.6, -1.6]] });
  T.floor(-206, ZR + 1.7, 0, ZL, R, 'slab', .3, '#5a5853');
  for (let x = -204; x < 0; x += 6) T.V(x, R + .005, -.08, x + 3, R + .012, .08, 'plain', '#d8c860');      // lane dashes
  T.S(-206, R - .3, ZR, 0, W, ZR + 1.7, 'conc', 'walk', '#8a8780');                                         // the catwalk (right side)
  T.S(-206, R - .3, ZL, 0, C, ZL + .4, 'tile', 'wall');
  T.S(-206, C, ZR - .4, 0, C + .4, ZL + .4, 'conc', 'ceil', '#6a6862');
  T.S(-206.4, R - .3, ZR - .4, -206, C, ZL + .4, 'conc', 'wall', '#2a2a2a');                                  // where the tunnel goes on (dark)
  for (let x = -200; x < 0; x += 50) { const f = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 3, 12).rotateZ(Math.PI / 2), stdMat('#7a7e82', { metalness: .5 })); f.position.set(x, C - .7, -.2); T.group.add(f); }   // jet fans
  // lights: a strip down the middle (goes dark when Static cuts the power), red emergency lamps on the walls
  const sg = new GeoBuilder(); for (let x = -204; x < 0; x += 6) sg.box(x, C - .08, -.25, x + 3.6, C - .02, .25, new THREE.Color(1, 1, 1));
  T.stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.9), toneMapped: false }); T.group.add(new THREE.Mesh(sg.geometry(), T.stripMat));
  const eg = new GeoBuilder(); T.emerg = []; for (let x = -200; x < 0; x += 25) { eg.box(x, C - 1.2, ZL - .12, x + .5, C - .9, ZL, new THREE.Color(1, 1, 1)); T.emerg.push(x); }
  T.emergMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.4, .05, .04), toneMapped: false }); T.group.add(new THREE.Mesh(eg.geometry(), T.emergMat));
  T.pool = []; for (let k = 0; k < 4; k++) { const l = new THREE.PointLight(0xfff4e0, 0, 22, 1.6); T.group.add(l); T.pool.push(l); }
  T.power = true;
  // the cross-passage door on the right (to the emergency stair)
  T.doorSolid = T.S(-61.2, W, ZR - .42, -58.8, W + 2.2, ZR - .38, null, 'door');
  { const dm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, .08), stdMat('#3a6a3a', { metalness: .4, roughness: .6 })), pv = new THREE.Group(); pv.position.set(-61.2, W, ZR - .4); dm.position.set(1.2, 1.1, 0); pv.add(dm); T.group.add(pv); T.doorPivot = pv; }
  T.sign('EMERGENCY EXIT', -60, W + 2.6, ZR - .3, 0, 2, .32, '#0a5a2a', '#ffffff', true);
  // the right-hand wall, with the opening for the door
  T.S(-206, R - .3, ZR - .4, -61.2, C, ZR, 'tile', 'wall'); T.S(-58.8, R - .3, ZR - .4, 0, C, ZR, 'tile', 'wall'); T.S(-61.2, W + 2.2, ZR - .4, -58.8, C, ZR, 'tile', 'wall');
  T.finish(); world.addSet(T);

  // the open-air ramp down from the street (rain falls here)
  const P = new GameSet(world, site, { x0: 0, x1: 47, y0: -9, y1: 2, z0: -9.5, z1: 7.5 }, { name: 'ramp', roofed: false, ownFloor: [[0, ZR - .4, 47, ZL + .4, .5]] });
  P.ramp(0, 46, ZR, ZL, R, -.02, 'slab', '#5a5853');
  P.ramp(0, 46, ZR, ZR + 1.7, W, .3, 'conc', '#8a8780');
  P.S(0, R - .4, ZR - .4, 46, 1, ZR, 'conc', 'wall', '#8a867e'); P.S(0, R - .4, ZL, 46, 1, ZL + .4, 'conc', 'wall', '#8a867e');
  P.V(0, -.3, -9.5, 46, .04, ZR - .4, 'slab', '#7a7872'); P.V(0, -.3, ZL + .4, 46, .04, 7.5, 'slab', '#7a7872');     // pavement over the cut edges
  P.S(-.3, C, ZR - .4, .3, 2.2, ZL + .4, 'conc', 'headwall', '#8a867e');                                              // portal headwall
  P.sign('LINCOLN TUNNEL', .35, -.8, -.85, Math.PI / 2, 6, .9, '#13406a', '#ffffff');
  for (const z of [-1.9, 1.9]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.1, .5, .5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .2, .1), toneMapped: false })); s.position.set(.4, C - .4, z); P.group.add(s); }
  P.light(10, -2, -4.8, 0xffd8a0, 1.2, 18, 0, false); P.light(36, 2.5, -7, 0xffc080, 1.4, 22, 0, false);
  P.finish(); world.addSet(P);

  // the emergency stair up to the street (Dyer Avenue)
  const E = new GameSet(world, site, { x0: -64.5, x1: -55.5, y0: -7.2, y1: 3.2, z0: -33, z1: -5.9 }, { name: 'exit', tight: true,
    ownFloor: [[-61.6, -25.6, -58.4, -5.9, -.8], [-61.6, -31.6, -58.4, -25.6, .6], [-64.5, -33, -55.5, -31.6, .6]] });
  E.floor(-61.2, -17.6, -58.8, -5.9, W, 'conc', .3, '#7a7870');
  E.S(-61.6, W, -17.6, -61.2, -3.9, -5.9, 'block', 'wall', '#9a968c'); E.S(-58.8, W, -17.6, -58.4, -3.9, -5.9, 'block', 'wall', '#9a968c'); E.S(-61.6, -3.9, -17.6, -58.4, -3.5, -5.9, 'conc', 'ceil');
  E.stairs(-61.2, -58.8, -17.6, -30.2, W, -.02, 30, 'conc');
  E.S(-61.6, W, -31.4, -61.2, .2, -17.6, 'block', 'wall', '#9a968c'); E.S(-58.8, W, -31.4, -58.4, .2, -17.6, 'block', 'wall', '#9a968c');
  E.S(-61.6, -.4, -31.6, -58.4, .03, -30.2, 'conc', 'floor');
  E.S(-61.6, -.3, -25.6, -58.4, .2, -17.6, 'conc', 'roof', '#6a6862');
  E.S(-61.6, .2, -31.6, -61.2, 2.6, -25.6, 'metal', 'kiosk', '#3a4a3a'); E.S(-58.8, .2, -31.6, -58.4, 2.6, -25.6, 'metal', 'kiosk', '#3a4a3a');
  E.S(-61.6, .2, -26, -58.4, 2.6, -25.6, 'metal', 'kiosk', '#3a4a3a'); E.S(-61.6, 2.6, -31.8, -58.4, 2.9, -25.6, 'metal', 'kiosk', '#2a3a2a');   // little exit kiosk on the sidewalk
  E.S(-64.5, -.3, -33, -55.5, .035, -31.6, 'slab', 'pave', '#7a7872'); E.S(-64.5, -.3, -31.6, -61.6, .035, -25, 'slab', 'pave', '#7a7872'); E.S(-58.4, -.3, -31.6, -55.5, .035, -25, 'slab', 'pave', '#7a7872');
  E.light(-60, -4.4, -12, 0xfff0d0, .9, 9, 4); E.light(-60, 1.9, -28.5, 0xffe0b0, .8, 7, 0);
  E.sign('EXIT', -60, 2.3, -31.85, Math.PI, .9, .3, '#0a5a2a', '#fff', true);
  E.finish(); world.addSet(E);
  return { T, P, E };
}

// stuck traffic: instanced bodies with glowing tail lights, plus the prison bus
function buildJam(world, set, ramp) {
  const cars = [], R = world.rng;
  for (const z of [-1.9, 1.9]) for (let x = 40; x > -200;) {
    const len = 4.6 + R() * .6; if (!(z > 0 && x < M3.BUS_X + 8 && x > M3.BUS_X - 8)) cars.push({ x: x - len / 2, z: z + (R() - .5) * .3, len, kind: R() < .12 ? 'van' : R() < .25 ? 'suv' : R() < .4 ? 'taxi' : 'sedan' });
    x -= len + 1.6 + R() * 2.2; if (z > 0 && x < M3.BUS_X + 8 && x > M3.BUS_X - 8) x = M3.BUS_X - 8;
  }
  const yAt = x => x > 0 ? lerp(M3.ROAD, 0, x / 46) : M3.ROAD;
  const body = new THREE.BoxGeometry(1.85, .72, 1); body.translate(0, .68, 0); const cab = new THREE.BoxGeometry(1.62, .58, .5); cab.translate(0, 1.33, -.04);
  const ibody = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: .35, metalness: .5 }), cars.length), icab = new THREE.InstancedMesh(cab, new THREE.MeshStandardMaterial({ color: col('#0b0f14'), roughness: .1, metalness: .8 }), cars.length);
  const tl = new THREE.BoxGeometry(1.5, .12, .04); tl.translate(0, .82, -.5); const itl = new THREE.InstancedMesh(tl, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, .12, .08), toneMapped: false }), cars.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), cl = new THREE.Color();
  cars.forEach((c, k) => {
    const y = yAt(c.x), pitch = c.x > 0 ? Math.atan2(7.5, 46) : 0, sy = c.kind === 'van' ? 1.6 : c.kind === 'suv' ? 1.18 : 1;
    Q.setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), pitch));
    M4.compose(V3(c.x, y, c.z), Q, V3(1, sy, c.len)); ibody.setMatrixAt(k, M4); itl.setMatrixAt(k, M4);
    if (c.kind === 'van') M4.compose(V3(c.x, y + .55, c.z), Q, V3(1, 1, c.len)); icab.setMatrixAt(k, M4);
    ibody.setColorAt(k, cl.copy(col(c.kind === 'taxi' ? '#e8b81c' : pick(['#1a1a1a', '#d9d9d9', '#7a1c1c', '#1f3550', '#5b5f63', '#2e3b2a', '#a9a9a9', '#3a2a1a']))));
    const tgt = c.x > 0 ? ramp : set, h = c.kind === 'van' ? 2.3 : c.kind === 'suv' ? 1.9 : 1.6;
    tgt.solids.push({ x0: c.x - c.len / 2, x1: c.x + c.len / 2, y0: y - .5, y1: y + h, z0: c.z - .95, z1: c.z + .95, tag: 'car', on: true });
  });
  set.group.add(ibody, icab, itl); ibody.castShadow = true;
  // the prison transport
  const bus = makeVehicle('bus', '#d8d4c8'); bus.position.set(M3.BUS_X, M3.ROAD, 1.9); bus.rotation.y = -Math.PI / 2; set.group.add(bus);
  const stripe = canvasTex(1024, 96, (c, w, h) => { c.fillStyle = '#d8d4c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d3a6a'; c.fillRect(0, 0, w, 26); c.fillRect(0, h - 18, w, 18); c.fillStyle = '#1d3a6a'; c.font = '800 44px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('DEPARTMENT OF CORRECTION', w / 2, 66); }, true, false);
  for (const sd of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(10, .95), new THREE.MeshStandardMaterial({ map: stripe, roughness: .6 })); pl.position.set(sd * 1.32, 1.35, 0); pl.rotation.y = sd * Math.PI / 2; bus.add(pl); }
  for (const z of [-5, 5]) for (const sd of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(.02, .7, 8), stdMat('#222', { metalness: .6 })); g.position.set(sd * 1.33, 2.1, 0); bus.add(g); }    // window grilles
  set.solids.push({ x0: M3.BUS_X - 6, x1: M3.BUS_X + 6, y0: M3.ROAD, y1: M3.ROAD + 3, z0: .6, z1: 3.2, tag: 'bus', on: true });
  const door = new THREE.Mesh(new THREE.BoxGeometry(.06, 2, 1.1), stdMat('#9a968c', { metalness: .5 })); door.position.set(0, 1.35, -6.02); door.rotation.y = Math.PI / 2; bus.add(door); set.busDoor = door;
  set.cars = cars; set.bus = bus;
  return cars;
}

class Mission3 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world, st = W.site.tunnel;
    const { T, P, E } = buildTunnel(W, st); this.T = T; this.P = P; this.E = E;
    buildJam(W, T, P);
    const L = (x, y, z) => T.L(x, y, z); this.L = L;
    this.harold = new Follower(g, 'harold', { label: 'HAROLD', breathMax: 40, pose: 'cuffed' });
    this.sof = makeHuman(castLook('sof'));
    this.van = makeVehicle('van', '#4a5562', { clear: true }); this.van.visible = false; g.scene.add(this.van); vehicleLights(this.van, false); seatHuman(this.sof, this.van, .5, .95, 1.4);
    const bark = { hear: "Who's there? Show yourself!", alert: "Hands where I can see them!", body: "Officer down! Officer down!", calm: "Nothing. Damn rats down here." };
    const R = M3.ROAD, Wk = M3.WALK, X = M3.BUS_X, rot = T.group.rotation.y, yawX = rot + Math.PI / 2;   // facing +x (back toward the portal)
    this.addGuard('co', L(X - 7.5, R, -1.2), yawX, { bark, gun: 'pistol', torch: true, range: 15 });
    this.addGuard('co', L(X + 6, R, -.1), yawX, { bark, gun: 'rifle', torch: true, route: [{ p: L(X - 4, R, -.05), wait: 2 }, { p: L(X + 14, R, -.05), wait: 2.5, look: yawX }] });
    this.addGuard('co', L(X + 4, Wk, -4.6), yawX, { bark, gun: 'rifle', torch: true, route: [{ p: L(X - 20, Wk, -4.6), wait: 1.5 }, { p: L(X + 26, Wk, -4.6), wait: 2, look: yawX }] });
    this.addGuard('co', L(X + 8, R, 3.2), yawX, { bark, gun: 'pistol', torch: true, route: [{ p: L(X + 7.5, R, 3.3), wait: 3, look: yawX }, { p: L(X + 9, R, -.05), wait: 2 }, { p: L(X + 7.5, R, 3.3), wait: 2, look: rot - Math.PI / 2 }] });
    for (const gd of this.guards) gd.home = { p: gd.pos.clone(), yaw: gd.yaw };
    this.staticPing = false; this.hitScale = .5; this.alertMemory = 10; this.hornT = 3;
  }
  lightAt(p) { return this.T.power ? 1 : .5; }
  setPower(on) {
    const T = this.T; T.power = on;
    T.stripMat.color.setRGB(on ? 2.2 : .03, on ? 2.1 : .03, on ? 1.9 : .03); T.emergMat.color.setRGB(on ? .4 : 3, on ? .05 : .25, on ? .04 : .12);
    for (const gd of this.guards) gd.torchOn = !on;
  }
  restore(cp) {
    const g = this.g, T = this.T, L = this.L, pl = g.player, rot = T.group.rotation.y, R = M3.ROAD;
    HGA.alarmOn = false; HGA.humV = .05; this.resetGuards(); for (const gd of this.guards) gd.passive = false;
    this.setPower(cp < 2); this.van.visible = false; this.harold.stop(); this.harold.show(false); this.harold.mode = 'cuffed'; g.hud.follower(null);
    T.doorSolid.on = true; T.doorPivot.rotation.y = 0; T.busDoor.position.z = -6.02; this.staticPing = cp >= 2;
    if (cp <= 1) pl.teleport(this.P.L(43, -.3, 0), rot - Math.PI / 2, 'walk');
    if (cp === 2) pl.teleport(L(-22, R, 0), rot - Math.PI / 2, 'walk');
    if (cp >= 3) { T.busDoor.position.z = -7.1; pl.teleport(L(M3.BUS_X + 7.2, R, .2), rot + Math.PI / 2, 'walk'); this.harold.show(true); this.harold.place(L(M3.BUS_X + 6.6, R, 1.6), rot + Math.PI / 2); this.harold.start(); g.hud.follower(this.harold); }
    g.rig.yaw = pl.yaw; g.rig.pitch = .12; g.rig.snap();
  }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    if (cp <= 2) yield* this.s2();
    yield* this.s3();
  }
  *s0() { yield* this.cine(trafficIntroCine(this.g, this)); this.restore(1); this.checkpoint(1); }
  // ---------- 1: down the ramp; Static says hello; lights out
  *s1() {
    const pl = this.pl, L = this.L, g = this.g;
    g.hud.show(true);
    this.objective('Walk down into the tunnel. The prison bus is stuck in the left lane.', L(M3.BUS_X + 8, M3.ROAD + 2, 1.9));
    g.hud.hint('<kbd>W A S D</kbd> walk &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>C</kbd> crouch &nbsp; <kbd>Space</kbd> jump', 6);
    yield* this.sleep(1.2);
    yield* this.say('STATIC', "Testing. Eli Navarro, can you hear me? Blink twice. Kidding. I can't see your eyes. Yet.");
    yield* this.say('ELI', "Who is this?");
    yield* this.say('STATIC', "Static. Deacon's friend. I'm in your ear, and in every camera in this tunnel. Forty-one of them.");
    yield* this.say('STATIC', "The bus is a hundred yards in, left lane. Four corrections officers. Traffic hasn't moved in twenty minutes. That's me, by the way.");
    yield* this.until(() => this.T.toLocal(pl.pos).x < -6);
    yield* this.say('ELI', "Can you give me dark?");
    yield* this.say('STATIC', "Can I give you dark. Lights in three, two...");
    this.setPower(false); HGA.boom(); g.shake(.2, .6); HGA.humV = .015;
    yield* this.say('STATIC', "One. Emergency lighting only. They'll reach for flashlights. Press Q and I'll tell you where every one of them is standing.");
    this.staticPing = true; g.hud.hint('<kbd>Q</kbd> Static pings the cameras — guards show through walls for a few seconds', 7);
    this.sayAsync('CO2', "Lights are out! Central, we lost the lights in tube two!");
    this.checkpoint(2);
  }
  // ---------- 2: the bus
  *s2() {
    const pl = this.pl, L = this.L, g = this.g, T = this.T, X = M3.BUS_X;
    this.staticPing = true;
    const rear = L(X + 6.6, M3.ROAD, 1.9);
    this.objective('Get to the rear door of the prison bus without being seen.', rear.clone().setY(M3.ROAD + 1.2));
    yield* this.until(() => pl.pos.distanceTo(rear) < 9);
    yield* this.say('STATIC', "Rear door runs on the same network as the vending machines. Unlocking it... now.");
    HGA.click();
    yield* this.pressE(rear, 1.9, 'Open the rear door');
    T.busDoor.position.z = -7.1; HGA.door(); pl.locked = true; pl.vel.set(0, 0, 0);
    this.harold.show(true); this.harold.place(L(X + 6.2, M3.ROAD, 1.9), T.group.rotation.y + Math.PI / 2); this.harold.mode = 'cuffed';
    yield* this.say('HAROLD', "Who the hell are you?");
    yield* this.say('ELI', "Your ride. Somebody paid for the express.");
    yield* this.say('HAROLD', "Somebody. Right. If it's who I think it is, I'm safer in here.");
    yield* this.say('ELI', "Then stay. The door's open either way.");
    yield* this.say('HAROLD', "...Go. Go, go, go.");
    pl.locked = false; this.harold.place(L(X + 7.4, M3.ROAD, 1.2), this.harold.yaw); this.harold.start(); g.hud.follower(this.harold);
    this.checkpoint(3);
  }
  // ---------- 3: alarm, the cross-passage, up to the street
  *s3() {
    const pl = this.pl, L = this.L, g = this.g, T = this.T;
    g.hud.follower(this.harold); this.staticPing = true;
    yield* this.sleep(1.5);
    const gd0 = this.guards.find(x => !x.down); if (gd0) { this.bark(gd0, "The bus! The prisoner's out!"); for (const gd of this.guards) if (!gd.down) gd.alarm(pl.pos, 'scripted'); }
    yield* this.say('STATIC', "Emergency cross-passage, back toward the portal, on your right. I've unlocked it. Move.");
    const door = L(-60, M3.WALK, -5.3);
    this.objective('Get Harold to the emergency exit on the right-hand wall.', door.clone().setY(M3.WALK + 1.2));
    yield* this.pressE(door, 2.2, 'Open the emergency door');
    T.doorSolid.on = false; T.doorPivot.rotation.y = 1.6; HGA.door();
    yield* this.say('STATIC', "Stairs come up on Dyer Avenue. Sof's waiting at the curb. Try not to get shot in the last thirty feet.");
    this.objective('Up the emergency stairs to the street.', this.E.L(-60, 1.2, -29));
    yield* this.until(() => { const l = this.E.toLocal(pl.pos); return l.z < -27.5 && l.y > -.6 && Math.abs(l.x + 60) < 3; });
    yield* this.until(() => !this.talking);
    yield* this.cine(trafficOutroCine(g, this));
    this.finish();
  }
  tick(dt) {
    const g = this.g, T = this.T, cam = g.camera;
    for (const gd of this.guards) { gd.update(dt); if (gd.torch) gd.torch.intensity = gd.torchOn && !gd.down ? 2.6 : 0; }
    this.harold.update(dt);
    // real lights follow the camera along the tunnel: ceiling lights, or the red emergency lamps after the cut
    const lc = T.toLocal(cam.position);
    T.pool.forEach((l, k) => {
      if (T.power) { const x = Math.round((lc.x - 1.8) / 6) * 6 + 1.8 + (k - 1.5) * 6; l.position.set(x, M3.CEIL - .4, 0); l.color.setHex(0xfff4e0); l.intensity = x < 0 && x > -205 ? 1.3 : 0; l.distance = 20; }
      else { const ex = T.emerg.slice().sort((a, b) => Math.abs(a - lc.x) - Math.abs(b - lc.x))[k] || 0; l.position.set(ex + .25, M3.CEIL - 1.3, M3.ZL - .5); l.color.setHex(0xff3018); l.intensity = k < 3 ? 1.2 : 0; l.distance = 16; }
    });
    // the jam honks (until the lights go)
    if (T.power && g.state === 'play') { this.hornT -= dt; if (this.hornT <= 0) { this.hornT = 2 + Math.random() * 5; AUDIO.horn(); } }
  }
  failChecks() { }
  endStat() { return `Harold Pell, accountant — out  ·  ${this.takedowns || 0} officers taken down quietly  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const P = this.P, a = Math.sin(t * .05) * .5; const c = P.L(30, 0, 0); cam.position.set(c.x + Math.sin(a + 1) * 45, 22, c.z + Math.cos(a + 1) * 45); cam.lookAt(c.x, -2, c.z); cam.fov = 52; }
}
Guard.prototype.torchOn = true;

// ---------------- cutscenes ----------------
function trafficIntroCine(g, m) {
  const P = m.P, T = m.T, pl = g.player;
  return {
    enter: c => { g.hud.show(false); m.restore(1); pl.h.root.visible = true; pl.h.setMode('idle'); },
    update: (c, dt) => { pl.h.update(dt, c.walk || 0); },
    shots: [
      { dur: 6, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: P.L(160, 90, 120), look: P.L(0, 10, 0) }, title: [.5, 'BRIDGE TRAFFIC', 'THE LINCOLN TUNNEL, MIDTOWN  ·  11:20 PM', 'hg', 5] },
      { dur: 7, fadeIn: 1.5, cam: () => ({ from: P.L(140, 70, 90), to: P.L(80, 30, 40), look: P.L(10, -2, 0), lookTo: P.L(20, -4, 0), fov: 48, ease: 'sine' }), enter: c => AUDIO.horn() },
      { dur: 6.5, fadeOut: .6, cam: () => ({ from: P.L(55, 1.8, 2.4), to: P.L(50, 1.4, 1.6), look: P.L(30, -2, 0), fov: 46 }),
        enter: c => { pl.h.root.position.copy(P.L(48, 0, 0)); pl.h.root.rotation.set(0, T.group.rotation.y - Math.PI / 2, 0); c.walk = 1.4; },
        tick: (c, t, dt) => { const p = P.L(48 - t * 1.25, 0, 0); p.y = lerp(M3.ROAD, 0, clamp((48 - t * 1.25) / 46, 0, 1)) + .1; pl.h.root.position.copy(p); if (t > 2 && !c.h) { c.h = 1; AUDIO.horn(); } } },
    ],
    exit: c => { c.walk = 0; },
  };
}
function trafficOutroCine(g, m) {
  const E = m.E, van = m.van, pl = g.player, ha = m.harold, rot = E.group.rotation.y;
  const vp = E.L(-66, 0, -35);
  return {
    enter: c => { g.hud.show(false); van.visible = true; vehicleLights(van, true); van.position.copy(vp); van.rotation.set(0, rot + Math.PI, 0); for (const gd of m.guards) gd.passive = true; },
    update: (c, dt) => { m.sof.update(dt, 0); ha.h.update(dt, 0); pl.h.update(dt, 0); },
    shots: [
      { dur: 4.4, cam: () => ({ from: E.L(-54, 1.7, -37), to: E.L(-55, 1.8, -36.5), look: E.L(-62, 1.2, -31), fov: 48 }),
        enter: c => { pl.h.root.visible = true; pl.h.setMode('idle'); pl.h.root.position.copy(E.L(-60, .05, -32.4)); pl.h.root.rotation.set(0, rot + Math.PI, 0); ha.show(true); ha.h.root.position.copy(E.L(-59.4, .05, -31.6)); ha.h.root.rotation.set(0, rot + Math.PI, 0); ha.h.setMode('cuffed'); },
        lines: [ln(.5, 'SOF', "Get in. I'm double-parked.")] },
      { dur: 12, fadeOut: 1, path: followCam(van, [-1.4, 1.65, 6], [-1.2, 1.6, 5.4], [-.1, 1.25, .8], 42),
        enter: c => { seatHuman(pl.h, van, -.45, .95, 1.4, 0); seatHuman(ha.h, van, -.45, .95, .2, 0); },
        tick: (c, t) => { const d = van.position.clone(); van.position.copy(vp).addScaledVector(V3(Math.sin(rot + Math.PI), 0, Math.cos(rot + Math.PI)), t * t * .4); HGA.motor(.5, 1.4); },
        lines: [ln(.4, 'HAROLD', "Could somebody do something about these cuffs?"), ln(3.4, 'SOF', "Could somebody do something about the smell?"), ln(6.4, 'ELI', "Who is he, Static?"), ln(8.2, 'STATIC', "He counts money for people who don't like counting. That's all I know. That's all I want to know.")] },
      { dur: 6.5, fadeIn: .8, fadeOut: 1.6, cam: () => ({ from: E.L(-40, 30, -70), to: E.L(-60, 45, -110), look: E.L(-70, 0, -80), fov: 50 }),
        tick: (c, t) => { van.position.addScaledVector(V3(Math.sin(rot + Math.PI), 0, Math.cos(rot + Math.PI)), 12 / 60); HGA.motor(.4, 1.3); },
        lines: [ln(.6, 'STATIC', "Nice work. I took you off every camera from here to the Bronx. Deacon says come by the bar.")] },
    ],
    exit: c => { HGA.motor(0); },
  };
}

HG_MISSIONS[3] = {
  n: 3, title: 'BRIDGE TRAFFIC', place: 'Lincoln Tunnel, Midtown', area: 'midtown', cls: Mission3, look: CAST.eli, gear: 'street',
  world: { area: 'midtown', weather: 'rain', flood: false, b7: false, liberty: false, skyline: true, litP: .25, lamps: true, water: -.6, center: [-360, 20], view: 1300, propR: 420, carR: 260,
    sites: [{ name: 'tunnel', label: 'TUNNEL', x: -360, z: 20, rot: 'grid', clear: [[-1, -10, 48, 8], [-65, -34, -55, -16]], holes: [[.5, -5.8, 46.5, 4.1], [-61.4, -31.2, -58.6, -26.2]] }] },
  leash: { x: -380, z: -10, r: 160, msg: 'Stay with the job. The bus is in the tunnel.' },
  insetTitle: 'LINCOLN TUNNEL APPROACH — TONIGHT',
  loading: 'Loading Midtown, the tunnel and the jam...',
  blurb: 'Harold Pell walked out of a prison bus that will be found empty in a tunnel nobody can explain. Static says the cameras saw nothing. Static would know.',
};
