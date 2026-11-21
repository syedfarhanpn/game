'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 5: "Glass House" (kidnapping for hire). The roof of the
// Crane Meridian tower at Hudson Yards, 300 m over Manhattan, during Julian
// Crane's gala. Up by window-washer gondola, past Halcyon, take Iris Achebe —
// who comes far too easily — and down again. In the van she says who hired them.
// ---------------------------------------------------------------------------
const M5 = { RY: 300 };

function buildTower(world, site) {
  const RY = M5.RY;
  const S = new GameSet(world, site, { x0: -26, x1: 28, y0: RY - 8, y1: RY + 12, z0: -22, z1: 22 }, { name: 'tower', roofed: false, ownFloor: true });
  // the tower itself: a glass shaft from the street to the sky (looks only)
  { const G = new GeoBuilder(); G.box(-22, 0, -18, 22, RY - .3, 18, new THREE.Color(.9, .95, 1), { sx: 48, sy: 52, top: false });
    const m = new THREE.Mesh(G.geometry(), world.matTower); S.group.add(m); }
  S.S(-22.2, RY - .6, -18.2, 22.2, RY, 18.2, 'marble', 'deck', '#8e8c88', { sx: 6, sy: 6 });
  S.V(-14, RY, -9, 6, RY + .02, 9, 'marble', '#e8e4dc');                     // pavilion floor
  // glass balustrade round the edge (with a gap where the gondola docks)
  const rail = (x0, z0, x1, z1) => { S.V(x0, RY, z0, x1, RY + 1.2, z1, 'glass'); S.V(x0 - .02, RY + 1.15, z0 - .02, x1 + .02, RY + 1.25, z1 + .02, 'metal', '#c8ccd0'); S.solids.push({ x0: Math.min(x0, x1) - .05, x1: Math.max(x0, x1) + .05, y0: RY, y1: RY + 1.4, z0: Math.min(z0, z1) - .05, z1: Math.max(z0, z1) + .05, tag: 'rail', on: true }); };
  rail(-22, -18, 22, -17.9); rail(-22, 17.9, 22, 18); rail(-22, -18, -21.9, 18); rail(21.9, -18, 22, -2.2); rail(21.9, 2.2, 22, 18);
  S.gapSolid = S.S(21.9, RY, -2.2, 22, RY + 1.4, 2.2, null, 'gap');
  // the gala pavilion: glass walls on a steel frame, a stage, a bar
  const gw = (x0, z0, x1, z1) => { S.V(x0, RY, z0, x1, RY + 4.4, z1, 'glass'); S.solids.push({ x0: Math.min(x0, x1) - .04, x1: Math.max(x0, x1) + .04, y0: RY, y1: RY + 4.4, z0: Math.min(z0, z1) - .04, z1: Math.max(z0, z1) + .04, tag: 'glass', on: true }); };
  gw(-14, -9, 6, -8.95); gw(-14, 8.95, -3, 9); gw(1, 8.95, 6, 9); gw(-14.05, -9, -14, 9); gw(5.95, -9, 6, -2.4); gw(5.95, 2.4, 6, 9);
  for (let x = -14; x <= 6; x += 2.5) { S.V(x - .05, RY, -9.05, x + .05, RY + 4.5, -8.9, 'metal', '#2a2d31'); S.V(x - .05, RY, 8.9, x + .05, RY + 4.5, 9.05, 'metal', '#2a2d31'); }
  for (let z = -9; z <= 9; z += 2.25) { S.V(-14.08, RY, z - .05, -13.95, RY + 4.5, z + .05, 'metal', '#2a2d31'); S.V(5.92, RY, z - .05, 6.05, RY + 4.5, z + .05, 'metal', '#2a2d31'); }
  S.S(-14.1, RY + 4.4, -9.1, 6.1, RY + 4.7, 9.1, 'metal', 'roof', '#2a2d31');
  S.S(-10, RY, -8.8, 2, RY + .45, -6.2, 'carpet', 'stage', '#1a1a20'); S.S(-4.5, RY + .45, -7.6, -3.7, RY + 1.6, -7, 'wood', 'podium', '#2a2018');
  S.sign('CRANE MERIDIAN', -4, RY + 3.4, -8.9, 0, 6, .9, '#0a0e14', '#e8eef6', true);
  S.sign('THE HELL GATE BARRIER · PROTECTING NEW YORK', -4, RY + 2.5, -8.88, 0, 6.5, .45, '#0a0e14', '#8ab8e0', true);
  S.bar(-13.6, -2, -12.6, 4, RY, 1.1);
  for (const [x, z] of [[-9, 2], [-5, 5], [-1, 1], [2.5, 5.5], [-8, -3.5]]) { S.V(x - .3, RY, z - .3, x + .3, RY + 1.1, z + .3, 'metal', '#2a2a2a'); S.V(x - .4, RY + 1.08, z - .4, x + .4, RY + 1.12, z + .4, 'cloth', '#f4f4f0'); }
  S.light(-6, RY + 4, 0, 0xffe0b0, 1.6, 16); S.light(-4, RY + 3.4, -6, 0xfff0e0, 1.2, 9);
  // string lights over the terrace
  { const bg = new GeoBuilder(); for (let x = -20; x <= 20; x += 1.4) for (const z of [-13.5, 13.5]) bg.box(x - .07, RY + 3 + Math.sin(x * .4) * .3, z - .07, x + .07, RY + 3.14 + Math.sin(x * .4) * .3, z + .07, new THREE.Color(1, 1, 1));
    S.group.add(new THREE.Mesh(bg.geometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2, 1.2), toneMapped: false }))); }
  S.light(-12, RY + 3, 13.5, 0xffd8a0, 1.0, 14, 0, false); S.light(4, RY + 3, -13.5, 0xffd8a0, .9, 14, 0, false);
  // planters and lounge furniture on the terrace
  for (const [x, z, w, d] of [[-19, -13, 2.5, 1.2], [-19, 13, 2.5, 1.2], [-2, 14.5, 4, 1.2], [-2, -14.5, 4, 1.2], [8.5, 14, 1.5, 1.5]]) { S.S(x - w / 2, RY, z - d / 2, x + w / 2, RY + .7, z + d / 2, 'conc', 'planter', '#3a3a38'); S.V(x - w / 2 + .1, RY + .7, z - d / 2 + .1, x + w / 2 - .1, RY + 1.2, z + d / 2 - .1, 'cloth', '#2a4a2a'); }
  // the service side: rooftop plant, cooling towers, the gondola rig
  for (const [x, z, w, d, h] of [[13, -12, 5, 6, 3.2], [13, 11, 5, 7, 3.6], [17.5, -4.5, 3, 3, 2.4], [17.5, 6.5, 3, 3, 2.4], [10, 0, 2, 5, 1.8]]) { S.S(x - w / 2, RY, z - d / 2, x + w / 2, RY + h, z + d / 2, 'metal', 'plant', '#6a7076'); for (let k = 0; k < 4; k++) S.V(x - w / 2 - .02, RY + .4 + k * h / 4.5, z - d / 2 - .02, x + w / 2 + .02, RY + .45 + k * h / 4.5, z + d / 2 + .02, 'metal', '#3a3e44'); }
  S.V(20.5, RY, -16, 21.2, RY + .3, 16, 'metal', '#c9a020');                                  // gondola rail
  S.V(19.6, RY + .3, -1.6, 21.6, RY + 1.6, 1.6, 'metal', '#c9a020'); S.V(21.6, RY + 1.2, -.3, 24.2, RY + 1.6, .3, 'metal', '#c9a020');   // the trolley and its jib
  S.light(17, RY + 4, 0, 0xcfe0ff, .7, 14, 0, false);
  S.finish(); world.addSet(S);
  // the gondola (its own object: it moves up and down the face)
  const gon = new THREE.Group(), ym = stdMat('#c9a020', { metalness: .4, roughness: .5 }), dm = stdMat('#555a60', { metalness: .6 });
  const ga = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; gon.add(o); return o; };
  ga(new THREE.BoxGeometry(1.2, .1, 4), dm, 0, 0, 0); ga(new THREE.BoxGeometry(1.2, .06, .06), ym, 0, 1.05, -2); ga(new THREE.BoxGeometry(1.2, .06, .06), ym, 0, 1.05, 2);
  ga(new THREE.BoxGeometry(.06, .06, 4), ym, .6, 1.05, 0); ga(new THREE.BoxGeometry(.06, .06, 4), ym, -.6, 1.05, 0); for (const z of [-2, 2]) for (const x of [-.6, .6]) ga(new THREE.BoxGeometry(.06, 1.05, .06), ym, x, .52, z);
  for (const z of [-1.8, 1.8]) ga(new THREE.CylinderGeometry(.015, .015, 60, 4), dm, 0, 31, z);
  S.group.add(gon); S.gondola = gon; gon.position.set(23, RY, 0);
  return S;
}

class Mission5 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world, S = this.set = buildTower(W, W.site.tower), RY = M5.RY, L = (x, y, z) => S.L(x, y, z); this.L = L;
    const rot = S.group.rotation.y;
    this.iris = new Follower(g, 'iris', { label: 'IRIS', breathMax: 40, pose: 'idle', runMul: 1.05 });
    this.crane = new Extra(g, 'crane'); this.crane.barkKey = 'CRANE';
    this.extras = [];
    for (const [x, z, m] of [[-9.4, 2.6, 'talk'], [-8.6, 1.4, 'drink'], [-5.5, 5.6, 'drink'], [-4.4, 4.6, 'talk'], [-1.6, 1.6, 'idle'], [-.6, .6, 'talk'], [2, 6, 'drink'], [3, 5, 'idle'], [-8.4, -3, 'talk'], [-7.4, -4, 'drink'], [-11, -6, 'idle'], [-2, -4.5, 'drink'], [0, -4, 'talk'], [-12.4, 1, 'drink']]) {
      const e = new Extra(g, Math.random() < .5 ? 'guestM' : 'guestF'); e.mode = m; e.place(L(x, RY, z), rot + Math.random() * 6); this.extras.push(e);
    }
    const bt = new Extra(g, 'waiter'); bt.mode = 'idle'; bt.place(L(-13.1, RY, 1), rot + Math.PI / 2); this.extras.push(bt);
    // Halcyon
    const bark = { hear: "Movement on the east side. Checking.", alert: "Contact! Intruder on the roof!", body: "Man down on the roof! Lock it down!", calm: "Clear. Just the wind up here." };
    const yE = rot + Math.PI / 2, yW = rot - Math.PI / 2, yN = rot + Math.PI, yS = rot;
    this.addGuard('halcyon', L(15.5, RY, 2), yW, { bark, range: 16, route: [{ p: L(15.5, RY, -8), wait: 3, look: yE }, { p: L(15.5, RY, 15), wait: 3, look: yE }] });
    this.addGuard('halcyon', L(7, RY, -3.2), yE, { bark, range: 15 });
    this.addGuard('halcyon', L(7, RY, 3.2), yE, { bark, range: 15 });
    this.addGuard('halcyon', L(-18, RY, 16), yE, { bark, range: 17, route: [{ p: L(-18, RY, 16), wait: 2.5, look: yS }, { p: L(6, RY, 16), wait: 2.5, look: yS }, { p: L(8, RY, -16), wait: 2.5, look: yN }, { p: L(-18, RY, -16), wait: 2.5, look: yN }] });
    this.addGuard('halcyon', L(1.5, RY + .45, -7.2), yS, { bark, range: 13, gun: 'pistol' });
    for (const gd of this.guards) { gd.home = { p: gd.pos.clone(), yaw: gd.yaw }; gd.walkSpeed = 1.2; }
    this.hitScale = .55; this.alertMemory = 12;
    this.van = makeVehicle('van', '#4a5562', { clear: true }); this.van.visible = false; g.scene.add(this.van); vehicleLights(this.van, false);
    this.sof = makeHuman(castLook('sof')); seatHuman(this.sof, this.van, .5, .95, 1.4);
  }
  lightAt(p) { const l = this.set.toLocal(p); return l.x > -15 && l.x < 7 && l.z > -10 && l.z < 10 ? 1 : l.x > 8 ? .5 : .75; }
  restore(cp) {
    const g = this.g, S = this.set, L = this.L, pl = g.player, rot = S.group.rotation.y, RY = M5.RY;
    HGA.crowdV = .07; this.resetGuards(); for (const gd of this.guards) gd.passive = false;
    this.iris.stop(); this.iris.show(true); this.iris.mode = 'drink'; this.iris.place(L(-19.5, RY, 15.6), rot); g.hud.follower(null);
    this.crane.place(L(-4.1, RY + .45, -7.9), rot); this.crane.mode = 'idle'; this.speech = false;
    S.gondola.position.set(23, RY, 0); S.gapSolid.on = true;
    if (cp <= 1) pl.teleport(L(18.8, RY, 2.6), rot - Math.PI / 2, 'walk');
    if (cp >= 2) { pl.teleport(L(-18.6, RY, 15), rot + Math.PI / 2, 'walk'); this.iris.place(L(-19.6, RY, 14.6), rot + Math.PI / 2); this.iris.mode = 'idle'; this.iris.start(); g.hud.follower(this.iris); this.speech = true; }
    g.rig.yaw = pl.yaw; g.rig.pitch = .1; g.rig.snap();
  }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    yield* this.s2();
  }
  *s0() { yield* this.cine(gondolaUpCine(this.g, this)); this.restore(1); this.checkpoint(1); }
  // ---------- 1: the roof, the speech, Iris
  *s1() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl, RY = M5.RY;
    g.hud.show(true); this.staticPing = true;
    this.objective('Find Iris Achebe. Stay out of Halcyon\'s sight.', null);
    g.hud.hint('<kbd>C</kbd> crouch behind the rooftop plant · <kbd>Q</kbd> Static marks Halcyon through walls · <kbd>E</kbd> behind a guard takes him down', 8);
    yield* this.sleep(1);
    yield* this.say('KESSLER_RADIO', "All Halcyon units, the principal is on stage in five. Keep the perimeter tight.");
    yield* this.say('STATIC', "I patched you into their radio. You're welcome. Achebe's not in the pavilion. Try the terrace.");
    const t0 = this.t;
    yield* this.until(() => { const l = S.toLocal(pl.pos); return l.x < 10 || this.t - t0 > 50; });
    // Crane's speech: every eye turns to the stage
    this.speech = true; this.crane.mode = 'talk'; HGA.crowdV = .03;
    for (const e of this.extras) e.baseYaw = Math.atan2(this.crane.pos.x - e.pos.x, this.crane.pos.z - e.pos.z);
    this.sayAsync('CRANE', "Five years ago this city drowned. Two hundred and twelve people. I remember every name.");
    this.sayAsync('CRANE', "The Hell Gate Barrier will make sure that never happens again. Not to this city. Not while I'm standing.");
    this.sayAsync('CRANE', "So drink. Dance. And when the water comes, and it will, you'll be standing on the highest ground in New York.");
    this.objective('Iris Achebe — south-west corner of the terrace, by the glass.', L(-19.5, RY + 1.6, 15.6));
    yield* this.pressE(this.iris.pos, 2, 'Take Iris Achebe');
    HGA.clap(60); HGA.crowdV = .1;
    pl.locked = true; pl.vel.set(0, 0, 0); this.iris.mode = 'idle'; this.iris.faceTo(pl.pos, 1, 99);
    while (this.queue.length || this.talking) yield null;
    yield* this.say('ELI', "Ms. Achebe. Don't scream. Walk with me.");
    yield* this.say('IRIS', "Took you long enough.");
    yield* this.say('ELI', "You were expecting me?");
    yield* this.say('IRIS', "I was expecting someone. Your hands shake less than I thought they would. Shall we?");
    pl.locked = false; this.iris.start(); g.hud.follower(this.iris);
    this.checkpoint(2);
  }
  // ---------- 2: back to the gondola
  *s2() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl, RY = M5.RY;
    g.hud.follower(this.iris); this.staticPing = true;
    yield* this.sleep(2);
    this.sayAsync('KESSLER_RADIO', "Where is Ms. Achebe? Somebody put eyes on Achebe. Now.");
    for (const gd of this.guards) if (!gd.down && gd.state === 'patrol') { gd.state = 'search'; gd.sus = .55; gd.searchT = 25; gd.lastSeen = gd.pos.clone(); }
    this.objective('Get Iris back to the gondola on the east side.', L(21, RY + 1.2, 0));
    yield* this.until(() => { const l = S.toLocal(pl.pos); return l.x > 19.6 && Math.abs(l.z) < 2 && this.iris.pos.distanceTo(pl.pos) < 6; });
    yield* this.until(() => !this.talking);
    yield* this.cine(gondolaDownCine(g, this));
    yield* this.cine(clientCine(g, this));
    this.finish();
  }
  tick(dt) {
    for (const gd of this.guards) { if (this.speech && gd.state === 'patrol' && gd.route.length < 2 && gd !== this.guards[0]) gd.yaw = dampAngle(gd.yaw, Math.atan2(this.crane.pos.x - gd.pos.x, this.crane.pos.z - gd.pos.z), 1, dt); gd.update(dt); }
    for (const e of this.extras) e.update(dt);
    this.iris.update(dt); this.crane.update(dt);
  }
  endStat() { return `Iris Achebe — taken, as requested  ·  ${this.takedowns || 0} Halcyon operators down  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const S = this.set, a = t * .03, c = S.L(0, M5.RY, 0); cam.position.set(c.x + Math.sin(a) * 90, M5.RY + 30, c.z + Math.cos(a) * 90); cam.lookAt(c.x, M5.RY - 20, c.z); cam.fov = 50; }
}

// ---------------- cutscenes ----------------
function gondolaUpCine(g, m) {
  const S = m.set, pl = g.player, L = m.L, RY = M5.RY, gon = S.gondola, rot = S.group.rotation.y;
  return {
    enter: c => { g.hud.show(false); gon.position.set(23, RY - 60, 0); gon.add(pl.h.root); pl.h.root.position.set(0, .05, .3); pl.h.root.rotation.set(0, -Math.PI / 2, 0); pl.h.setMode('idle'); pl.h.root.visible = true; },
    update: (c, dt) => { pl.h.update(dt, 0); for (const e of m.extras) e.update(dt); },
    shots: [
      { dur: 6, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: L(170, 230, -190), look: L(0, 210, 0) }, title: [.5, 'GLASS HOUSE', 'CRANE MERIDIAN TOWER, HUDSON YARDS  ·  10:30 PM', 'hg', 5] },
      { dur: 10, fadeIn: 1.5, path: followCam(gon, [10, -5, -9], [7, 1, -6], [0, 1, 0], 50),
        tick: (c, t) => { gon.position.y = RY - 60 + t * 3.2; HGA.motor(.3, .6); },
        lines: [ln(1, 'STATIC', "Seventy floors. Halcyon has a dozen men on that roof, and every one of them is bored. Bored is good."), ln(5.6, 'STATIC', "Your package is Iris Achebe. Head of risk at Crane Meridian. The client wants her out tonight, unhurt, no questions.")] },
      { dur: 8.5, path: followCam(gon, [3.6, 1.5, -3.2], [3.1, 1.7, -2.6], [0, 1.45, .3], 44),
        tick: (c, t) => { gon.position.y = RY - 28 + t * 3.2; HGA.motor(.3, .6); },
        lines: [ln(.4, 'ELI', "Kidnapping a woman from a party, in front of her boss. That's not a job. That's a statement."), ln(5.2, 'STATIC', "It pays like a statement. The gondola stops at the roof line. After that, you're on your own.")] },
      { dur: 4.6, fadeOut: .7, cam: () => ({ from: L(12, RY + 6, 10), to: L(14, RY + 5, 8), look: L(22, RY + .5, 0), fov: 48 }),
        tick: (c, t) => { gon.position.y = Math.min(RY, RY - 4 + t * 2.5); HGA.motor(t < 1.6 ? .3 : 0, .6); } },
    ],
    exit: c => { gon.remove(pl.h.root); g.scene.add(pl.h.root); gon.position.set(23, RY, 0); HGA.motor(0); },
  };
}
function gondolaDownCine(g, m) {
  const S = m.set, pl = g.player, L = m.L, RY = M5.RY, gon = S.gondola, ir = m.iris;
  return {
    enter: c => { g.hud.show(false); for (const gd of m.guards) gd.passive = true; gon.position.set(23, RY, 0); gon.add(pl.h.root); pl.h.root.position.set(0, .05, .6); pl.h.root.rotation.set(0, -Math.PI / 2, 0); gon.add(ir.h.root); ir.h.root.position.set(0, .05, -.7); ir.h.root.rotation.set(0, -Math.PI / 2, 0); ir.h.setMode('idle'); },
    update: (c, dt) => { pl.h.update(dt, 0); ir.h.update(dt, 0); },
    shots: [
      { dur: 7, path: followCam(gon, [6, 2.4, -7], [6.5, 3.2, -7.5], [0, 1.2, 0], 46),
        tick: (c, t) => { gon.position.y = RY - t * 2.2; HGA.motor(.3, .6); },
        lines: [ln(.6, 'IRIS', "Halcyon will pull the gondola logs in about ten minutes."), ln(4.2, 'ELI', "We'll be gone in five.")] },
      { dur: 5, fadeOut: 1, path: watchCam(L(90, 200, -70), L(80, 170, -60), () => gon.position, 44), tick: (c, t) => { gon.position.y = RY - 15 - t * 20; } },
    ],
    exit: c => { gon.remove(pl.h.root); gon.remove(ir.h.root); g.scene.add(pl.h.root); g.scene.add(ir.h.root); HGA.motor(0); },
  };
}
function clientCine(g, m) {
  const S = m.set, pl = g.player, L = m.L, ir = m.iris, rot = S.group.rotation.y;
  const van = m.van, sof = m.sof;
  const vp = L(30, 0, 14), dir = V3(Math.sin(rot + Math.PI), 0, Math.cos(rot + Math.PI));
  return {
    enter: c => { van.visible = true; vehicleLights(van, true); van.position.copy(vp); van.rotation.set(0, rot + Math.PI, 0); seatHuman(pl.h, van, -.45, .95, 1.4, 0); seatHuman(ir.h, van, -.45, .95, .2, 0); },
    update: (c, dt) => { sof.update(dt, 0); pl.h.update(dt, 0); ir.h.update(dt, 0); van.position.addScaledVector(dir, 6 * dt); HGA.motor(.5, 1.4); },
    shots: [
      { dur: 6.5, fadeIn: 1, path: followCam(van, [-1.5, 1.65, 6], [-1.3, 1.6, 5.4], [-.1, 1.25, .8], 42),
        lines: [ln(.4, 'SOF', "That's her? She's calmer than the last one."), ln(3.6, 'ELI', "Static. Who's the client?")] },
      { dur: 6.5, path: followCam(van, [1.6, 1.6, 5], [1.3, 1.6, 4.6], [-.4, 1.2, .3], 40),
        lines: [ln(.3, 'STATIC', "That's the thing. The money came from an account I can't trace. And I can trace anything.")] },
      { dur: 9, path: followCam(van, [.15, 1.75, 1.05], [.1, 1.72, .95], [-.45, 1.35, .15], 44),
        lines: [ln(.5, 'IRIS', "I can save you the trouble."), ln(2.6, 'IRIS', "I'm the client.")] },
      { dur: 9, fadeOut: 1.4, path: followCam(van, [.2, 1.8, 1.0], [.35, 1.85, 1.3], [-.4, 1.4, .6], 48),
        lines: [ln(.4, 'IRIS', "I paid you to take me. It was the only way out of that building that Julian Crane doesn't own.")] },
    ],
    exit: c => { HGA.motor(0); },
  };
}

HG_MISSIONS[5] = {
  n: 5, title: 'GLASS HOUSE', place: 'Hudson Yards, Midtown', area: 'midtown', cls: Mission5, look: CAST.eliTac, gear: 'street',
  world: { area: 'midtown', weather: 'high', flood: false, b7: false, liberty: false, skyline: true, litP: .35, lamps: true, water: -.6, center: [-1000, 330], view: 1500, propR: 360, carR: 220,
    sites: [{ name: 'tower', label: 'CRANE MERIDIAN', x: -1000, z: 330, rot: 'grid', clear: [[-28, -24, 30, 24]] }] },
  insetTitle: 'HUDSON YARDS — THE CRANE GALA',
  loading: 'Loading Midtown, the Crane Meridian tower and the gala...',
  blurb: 'Iris Achebe ran Julian Crane\'s risk department, and she hired the crew to kidnap her from his own party. She says she knows what the Hell Gate Barrier is really for. Halcyon is already looking for her.',
};
