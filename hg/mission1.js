'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 1: "Delphine" (playable prologue, five years ago).
// Red Hook Houses, Building 7, the night of the surge.
// ---------------------------------------------------------------------------
const WHO = { ELI: 'ELI', RAFAEL: 'RAFAEL', RAFAEL_RADIO: 'RAFAEL · RADIO', NIA: 'NIA', NIA_FAR: 'A CHILD\'S VOICE', CAPTAIN: 'CAPT. REYES', CAPTAIN_RADIO: 'CAPT. REYES · RADIO', DISPATCH: 'DISPATCH' };

// ---------------- FDNY rescue boat ----------------
class RescueBoat {
  constructor(g) {
    this.g = g; this.pos = V3(); this.heading = 0; this.target = null; this.speed = 3.2;
    const grp = this.group = new THREE.Group(), tube = stdMat('#2b2e32', { roughness: .6 }), orange = stdMat('#d9561e', { roughness: .6 }), deck = stdMat('#5c6066', { roughness: .8 });
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; grp.add(o); return o; };
    for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(.38, .38, 6.0, 14), tube, s * 1.05, .38, -.2, Math.PI / 2); add(new THREE.SphereGeometry(.38, 12, 8), tube, s * 1.05, .38, 2.8); add(new THREE.BoxGeometry(.06, .16, 5.2), orange, s * 1.44, .5, -.3); }
    add(new THREE.ConeGeometry(.78, 1.4, 16), tube, 0, .4, 3.4, Math.PI / 2);
    add(new THREE.BoxGeometry(2.0, .18, 6.2), deck, 0, .22, -.1);
    add(new THREE.BoxGeometry(.85, 1.05, .8), deck, 0, .8, .4);
    add(new THREE.BoxGeometry(.9, .5, .05), new THREE.MeshStandardMaterial({ color: col('#9ab'), roughness: .05, metalness: .5, transparent: true, opacity: .5 }), 0, 1.5, .85, -.4);
    add(new THREE.BoxGeometry(.5, 1.1, .55), stdMat('#121212'), 0, .7, -3.4);
    add(new THREE.CylinderGeometry(.16, .2, .3, 10), stdMat('#888', { metalness: .7 }), 0, 1.45, .3, Math.PI / 2);
    const label = canvasTex(256, 48, (c, w, h) => { c.fillStyle = '#d9561e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 30px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('FDNY  MARINE 6', w / 2, 34); }, true, false);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .45), new THREE.MeshStandardMaterial({ map: label, roughness: .6 })); l.position.set(s * 1.45, .45, .6); l.rotation.y = s * Math.PI / 2; grp.add(l); }
    this.spot = new THREE.SpotLight(0xf2f6ff, 4.5, 150, .17, .45, 1.1); this.spot.position.set(0, 1.5, .5); this.spotT = new THREE.Object3D(); this.spot.target = this.spotT; grp.add(this.spot); g.scene.add(this.spotT);
    this.beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, .38, .45), transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const bg = new THREE.ConeGeometry(2.6, 34, 16, 1, true); bg.translate(0, -20, 0); bg.rotateX(-Math.PI / 2);
    this.beam = new THREE.Mesh(bg, this.beamMat); this.beam.position.copy(this.spot.position); grp.add(this.beam);
    this.cabin = new THREE.PointLight(0xffd9a8, .9, 7, 1.6); this.cabin.position.set(0, 1.9, -.6); grp.add(this.cabin);
    this.captain = makeHuman(HG_LOOK.captain); dressDiver(this.captain, '#111111', '#c8a23a'); grp.add(this.captain.root); this.captain.root.position.set(0, .3, -.4);
    g.scene.add(grp);
    this.aim = V3();
  }
  place(p, heading) { this.pos.copy(p); this.heading = heading; this.target = null; }
  moveTo(p) { this.target = p.clone(); }
  update(dt, t) {
    const L = this.g.world.water;
    if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > .6) { this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 1.5, dt); const s = Math.min(this.speed, d * .8); this.pos.x += Math.sin(this.heading) * s * dt; this.pos.z += Math.cos(this.heading) * s * dt; } else this.target = null;
    }
    this.group.position.set(this.pos.x, L - .12 + Math.sin(t * 1.4) * .07, this.pos.z);
    this.group.rotation.set(Math.sin(t * 1.1) * .03, this.heading, Math.sin(t * .9) * .04);
    this.spotT.position.lerp(this.aim, 1 - Math.exp(-3 * dt));
    const wp = this.group.localToWorld(this.spot.position.clone()), dir = this.spotT.position.clone().sub(wp).normalize();
    this.beam.quaternion.copy(this.group.quaternion).invert().multiply(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, -1), dir));
    this.captain.update(dt, 0);
    this.beam.visible = this.g.camera.position.distanceTo(this.group.position) > 10;
    HGA.motor(clamp(1 - Math.hypot(this.pos.x - this.g.camera.position.x, this.pos.z - this.g.camera.position.z) / 70, 0, 1) * (this.target ? 1 : .55));
  }
}

// ---------------- Lt. Rafael Duarte (partner AI) ----------------
class Partner {
  constructor(g) {
    this.g = g; const h = this.h = makeHuman(HG_LOOK.rafael); dressDiver(h, '#e9e9e6'); g.scene.add(h.root);
    this.pos = V3(); this.path = []; this.i = 0; this.mode = 'swim'; this.yaw = 0; this.visible = true; this.callT = 12;
    this.lamp = new THREE.SpotLight(0xfff1dc, 2.2, 26, .45, .55, 1.4); this.lampT = new THREE.Object3D(); this.lamp.target = this.lampT; g.scene.add(this.lamp, this.lampT);
  }
  show(on) { this.visible = on; this.h.root.visible = on; this.lamp.visible = on; }
  go(pts, opts = {}) { this.path = pts; this.i = 0; this.wait = opts.wait !== false; this.onDone = opts.onDone || null; }
  get done() { return this.i >= this.path.length; }
  wpWorld(w) { const b7 = this.g.world.b7, L = this.g.world.water; const p = b7.toWorld(V3(w[0], typeof w[1] === 'number' ? w[1] : 0, w[2])); if (w[1] === 'S') p.y = L - 1.42; return p; }
  update(dt, t) {
    if (!this.visible) return;
    const g = this.g, L = g.world.water, pl = g.player; let moving = false;
    if (!this.done) {
      const w = this.path[this.i], tgt = this.wpWorld(w), d = tgt.distanceTo(this.pos), far = this.pos.distanceTo(pl.pos);
      this.mode = w[3] || 'swim';
      const end = this.wpWorld(this.path[this.path.length - 1]), behind = pl.pos.distanceTo(end) > this.pos.distanceTo(end) + 2;   // Eli has made less progress along the route
      if (this.wait && far > 11 && behind) { this.callT -= dt; if (this.callT <= 0 && g.mission && !g.mission.talking) { this.callT = 28; g.mission.sayAsync("Navarro, on me."); } }
      else {
        const catchUp = !behind && far > 9 ? 1.8 : 1, sp = (this.mode === 'walk' ? 1.7 : this.mode === 'dive' ? 1.7 : 1.5) * catchUp, step = Math.min(d, sp * dt);
        if (d > .3) { const dir = tgt.clone().sub(this.pos).normalize(); this.pos.addScaledVector(dir, step); this.yaw = dampAngle(this.yaw, Math.atan2(dir.x, dir.z), 5, dt); moving = true; }
        else { this.i++; if (this.done && this.onDone) { const f = this.onDone; this.onDone = null; f(); } }
      }
    }
    if (this.mode === 'swim') this.pos.y = damp(this.pos.y, L - 1.42, 4, dt);
    const H = this.h;
    if (this.mode === 'walk') { H.setMode('idle'); H.root.position.copy(this.pos); H.update(dt, moving ? 1.4 : 0); }
    else if (this.mode === 'swim') { if (moving) { H.setMode('swim'); H.swimPitch = .1; H.armsForward = false; H.root.position.set(this.pos.x, L - .2, this.pos.z); } else { H.setMode('tread'); H.root.position.copy(this.pos); } H.update(dt, 0); }
    else { H.setMode('swim'); H.armsForward = true; H.swimPitch = 0; H.root.position.set(this.pos.x, this.pos.y + .45, this.pos.z); H.update(dt, 0); }
    H.root.rotation.set(0, this.yaw, 0);
    const head = V3(this.pos.x, this.mode === 'dive' ? this.pos.y + .8 : this.mode === 'swim' ? L + .15 : this.pos.y + 1.6, this.pos.z);
    this.lamp.position.copy(head); this.lampT.position.set(head.x + Math.sin(this.yaw) * 8, head.y - 1.2, head.z + Math.cos(this.yaw) * 8);
  }
}

// ---------------- the mission ----------------
class Mission1 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world, b7 = W.b7; this.b7 = b7; this.P = b7.P;
    this.boat = g.boat = new RescueBoat(g);
    this.rafael = new Partner(g);
    this.nia = makeHuman(HG_LOOK.nia); g.scene.add(this.nia.root);
    this.rafLight = new THREE.PointLight(0xfff0d0, 0, 7, 1.6); g.scene.add(this.rafLight);
    this.startTime = 0;
  }
  L(x, y, z) { return this.b7.toWorld(V3(x, y, z)); }
  surf(x, z) { const p = this.L(x, 0, z); p.y = this.g.world.water - 1.42; return p; }
  local() { return this.b7.toLocal(this.g.player.pos).clone(); }
  // ---- state for each checkpoint
  restore(cp) {
    const g = this.g, W = g.world, b7 = this.b7, pl = g.player, F2 = B7.F2, rot = b7.group.rotation.y;
    if (pl.tow) pl.drop(g.scene, V3(0, -50, 0));
    this.nia.root.parent && this.nia.root.parent.remove(this.nia.root); g.scene.add(this.nia.root);
    const np = this.L(this.P.nia.x, this.P.nia.y, this.P.nia.z); this.nia.root.position.copy(np); this.nia.root.rotation.set(0, rot, 0); this.nia.setMode('sit');
    b7.setNiaDoor(cp >= 4);
    this.rafael.show(cp <= 2); this.rafLight.intensity = 0; this.boat.target = null; pl.locked = false; pl.breath = 1; pl.niaBreath = 1; pl.drownT = 0;
    const lvl = [4.15, 4.15, 4.15, 4.45, 4.7, 4.85][cp]; W.water = W.waterTarget = lvl;
    this.boat.place(this.L(-8, 0, 34), rot + Math.PI); this.boat.aim.copy(this.L(0, 3, 7));
    if (cp <= 1) { pl.teleport(this.surf(-3.5, 27), rot + Math.PI, 'swim'); this.rafael.pos.copy(this.surf(-6.5, 27)); this.rafael.go([]); }
    if (cp === 2) { pl.teleport(this.L(-19.6, F2, 1.6), rot + Math.PI / 2, 'walk'); this.rafael.pos.copy(this.L(-19, F2, 3)); this.rafael.mode = 'walk'; this.rafael.go([]); }
    if (cp === 3) { pl.teleport(this.L(-8.6, F2, 3.2), rot + Math.PI / 2, 'walk'); }
    if (cp === 4) { pl.teleport(this.L(14.6, F2, -3.6), rot, 'walk'); pl.carry(this.nia); }
    if (cp === 5) { pl.teleport(this.surf(1, 13), rot + Math.PI, 'swim'); this.boat.place(this.L(7, 0, 17), rot + Math.PI); this.nia.root.position.copy(this.L(7, 0, 17)); this.nia.root.position.y = W.water + .1; if (!b7._gc) { b7.collapseGround(); b7._gc = true; } this.rafLight.position.copy(this.L(this.P.rafaelTrap.x, 1.3, this.P.rafaelTrap.z)); }
    g.rig.yaw = pl.yaw; g.rig.pitch = .18; g.rig.snap();
    g.hud.nia(cp === 4);
  }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    if (cp <= 2) yield* this.s2();
    if (cp <= 3) yield* this.s3();
    if (cp <= 4) yield* this.s4();
    yield* this.s5();
  }
  // ---------- 0: the boat (cutscene)
  *s0() {
    yield* this.cine(introCine(this.g, this));
    this.restore(1); this.checkpoint(1);
  }
  // ---------- 1: into Building 7
  *s1() {
    const P = this.P, b7 = this.b7, pl = this.g.player, F2 = B7.F2;
    this.objective('Follow Rafael to Building 7.', this.L(0, 2, 9));
    this.g.hud.hint('<kbd>W A S D</kbd> swim &nbsp; <kbd>Mouse</kbd> look &nbsp; <kbd>Shift</kbd> swim harder &nbsp; <kbd>C</kbd> dive &nbsp; <kbd>Space</kbd> surface &nbsp; <kbd>F</kbd> flashlight', 10);
    this.rafael.go([[-3, 'S', 12], [0, 'S', 10.5], [0, 1.5, 8.5, 'dive'], [0, 1.6, 3.5, 'dive'], [0, 1.6, 0, 'dive'], [-12, 1.6, 0, 'dive'], [-17.5, 1.6, 0, 'dive'], [-18.8, 1.6, -3.6, 'dive'], [-18.8, 'S', -3.6], [-19.6, F2, -.6, 'walk'], [-19.2, F2, 2.6, 'walk']]);
    yield* this.until(() => this.rafael.i >= 2 || this.g.player.pos.distanceTo(this.L(0, 3, 10)) < 7);
    yield* this.say("Lobby door's under. We go down and through. Stay on my light.");
    this.objective('Dive under and swim through the lobby door. (C to dive)', this.L(0, 1.6, 4));
    yield* this.until(() => b7.inside(pl.pos));
    this.objective('Follow Rafael to the west stairwell, then surface.', this.L(-18.8, 3, -3.6));
    yield* this.until(() => { const l = this.local(); return l.x < -17 && (pl.mode !== 'dive' || l.y > F2 - .4); });
    this.objective('Climb out onto the second-floor landing.', this.L(-19.4, F2 + .5, 1));
    yield* this.until(() => { const l = this.local(); return l.y > F2 - .25 && pl.mode === 'walk'; });
    yield* this.until(() => this.rafael.done || this.rafael.pos.distanceTo(pl.pos) < 4);
    yield* this.say("Clear. Up to two. I'll take the east side, you take west. Call it out.");
    this.checkpoint(2);
  }
  // ---------- 2: the west side, the order, the voice
  *s2() {
    const P = this.P, pl = this.g.player, F2 = B7.F2, W = this.g.world;
    this.rafael.show(true);
    this.rafael.go([[-15, F2, 0, 'walk'], [-4, F2, 0, 'walk'], [1.2, F2, 0, 'walk']], { wait: false });
    const seen = new Set(), rooms = P.roomsW;
    const upd = () => { rooms.forEach((r, i) => { const l = this.local(); if (Math.hypot(l.x - r.x, l.z - r.z) < 2.3 && Math.abs(l.y - F2) < 1) seen.add(i); }); const n = rooms.findIndex((r, i) => !seen.has(i)); this.objective(`Search the west apartments for survivors (${seen.size}/3).`, n >= 0 ? this.L(rooms[n].x, F2 + 1, rooms[n].z) : null); return seen.size >= 3; };
    yield* this.until(upd);
    yield* this.say("West side's empty. Nobody home.");
    yield* this.say("East is cut off. The ceiling came down in the hall.");
    HGA.groan(1); this.g.shake(.5, 1.4); W.setWater(4.45, .025);
    yield* this.say("Duarte! Navarro! The building's shifting and the water's still coming. Get out, now!");
    this.rafael.go([[-4, F2, 0, 'walk'], [-15, F2, 0, 'walk'], [-18.6, F2, .4, 'walk']], { wait: false });
    this.objective('Get back to the west stairwell.', this.L(-18.6, F2 + 1, .4));
    yield* this.until(() => this.rafael.done || this.t > 0 && pl.pos.distanceTo(this.rafael.pos) < 3 && this.rafael.i > 1);
    yield* this.say("You heard him. We're done. Back to the boat.");
    HGA.knock(); yield* this.sleep(.4);
    yield* this.say("Help! Somebody, please! I'm in here!");
    yield* this.say("Rafa. There's a kid. East end, past the collapse.");
    yield* this.say("Eli, the captain called it. We go. That's an order.");
    yield* this.say("Then write me up.");
    this.rafael.go([[-19.6, F2, -.6, 'walk'], [-18.8, 'S', -3.6], [-18.8, 1.6, -3.6, 'dive'], [-17.5, 1.6, 0, 'dive'], [0, 1.6, 0, 'dive'], [0, 1.6, 4, 'dive'], [0, 1.6, 9, 'dive'], [0, 'S', 13]], { wait: false, onDone: () => this.rafael.show(false) });
    this.sayAsync("Eli! Dammit, Eli!");
    this.checkpoint(3);
  }
  // ---------- 3: find another way east, the door, Nia
  *s3() {
    const P = this.P, pl = this.g.player, F2 = B7.F2, b7 = this.b7, I = this.g.input;
    this.objective('Find the girl. The hall is blocked — find another way east.', this.L(P.hole.x, F2 + .4, P.hole.z));
    const t0 = this.t; let hinted = false;
    yield* this.until(() => { if (!hinted && this.t - t0 > 22) { hinted = true; this.g.hud.hint('The front apartment has a hole in its floor. Drop through and swim east under the collapse.', 8); } const l = this.local(); return l.y < B7.C1 - .4 && b7.inside(pl.pos) && l.x > -11; });
    this.objective('Swim east along the flooded ground floor to the east stairwell.', this.L(18.8, 2.5, -3.6));
    yield* this.until(() => { const l = this.local(); if (l.x > 16.5) this.target = this.L(19.6, F2 + .6, -.6); return l.x > 5 && l.y > F2 - .45; });
    this.objective('Get to the end of the hall.', this.L(P.niaDoor.x, F2 + 1.2, P.niaDoor.z + .4));
    yield* this.until(() => { const l = this.local(); return Math.hypot(l.x - P.niaDoor.x, l.z - P.niaDoor.z) < 3.2 && l.y > F2 - .5; });
    HGA.knock();
    yield* this.say("Is somebody there?");
    yield* this.say("I'm here. Stand back from the door.");
    this.objective('Force the door open.', this.L(P.niaDoor.x, F2 + 1.2, P.niaDoor.z));
    let hold = 0;
    yield* this.until(() => {
      const l = this.local(), near = Math.hypot(l.x - P.niaDoor.x, l.z - P.niaDoor.z) < 2.2;
      this.g.hud.prompt(near ? `<kbd>E</kbd> hold — force the door ${hold > 0 ? '<i class="pg" style="--p:' + Math.round(hold / 1.6 * 100) + '%"></i>' : ''}` : '');
      if (near && I.key('KeyE')) { hold += 1 / 60; if (Math.random() < .08) { HGA.thud(); this.g.shake(.15, .2); } } else hold = Math.max(0, hold - 1 / 60);
      return hold >= 1.6;
    });
    this.g.hud.prompt(''); b7.openNiaDoor(); HGA.doorBreak(); this.g.shake(.35, .5); this.b7.niaDoorBroken = true;
    this.objective('Get to her.', this.L(P.nia.x, P.nia.y + .8, P.nia.z));
    yield* this.until(() => { const l = this.local(), near = Math.hypot(l.x - P.nia.x, l.z - P.nia.z) < 2.4; this.g.hud.prompt(near ? '<kbd>E</kbd> Talk to her' : ''); return near && I.pressed('KeyE'); });
    this.g.hud.prompt(''); pl.locked = true;
    yield* this.say("Hey. Hey, look at me. What's your name?");
    yield* this.say("Nia.");
    yield* this.say("Nia, I'm Eli. I swim for a living. You ever hold your breath in a pool?");
    yield* this.say("Yeah. At camp.");
    yield* this.say("Good. That's all we're gonna do. Hold on to me, and don't let go.");
    pl.carry(this.nia); pl.locked = false; this.g.world.setWater(4.7, .02); this.g.hud.nia(true);
    this.checkpoint(4);
  }
  // ---------- 4: get her out
  *s4() {
    const pl = this.g.player, b7 = this.b7, F2 = B7.F2;
    this.g.hud.nia(true);
    this.objective('Get Nia out: down the east stairs, through the ground floor and out of the lobby. Watch her breath.', this.L(18.8, 3, -3.6));
    let warned = false, told = false;
    yield* this.until(() => {
      const l = this.local();
      if (!told && l.x > 17 && l.y < F2 + .2) { told = true; this.sayAsync("Big breath, Nia. Now."); }
      if (!warned && pl.niaBreath < .42) { warned = true; this.sayAsync("Almost there. Stay with me."); }
      if (l.y < B7.C1 && b7.inside(pl.pos)) this.target = l.z > 1.2 ? this.L(0, 1.6, 9) : this.L(0, 1.6, 2.5);
      return !b7.inside(pl.pos) && l.z > 7.3 && pl.mode === 'swim';
    });
    this.sayAsync("I've got Navarro! He's got a kid! Bring her in, bring her in!");
    this.boat.moveTo(this.L(2, 0, 16)); this.boat.aim.copy(pl.pos);
    this.objective('Get Nia to the boat.', null);
    yield* this.until(() => {
      this.target = this.boat.pos.clone().setY(this.g.world.water + 1.5); this.boat.aim.copy(pl.pos);
      const d = pl.pos.distanceTo(this.boat.pos.clone().setY(pl.pos.y));
      if (d > 4.2) { const dir = this.boat.pos.clone().sub(pl.pos).setY(0).normalize(); this.boat.moveTo(pl.pos.clone().addScaledVector(dir, 3.4)); }   // the boat comes to Eli
      return d < 4.6;
    });
    yield* this.until(() => !this.talking && !this.queue.length);
    yield* this.cine(handoffCine(this.g, this));
    this.g.hud.nia(false); this.g.world.setWater(4.85, .02);
    if (!b7._gc) { b7.collapseGround(); b7._gc = true; }
    this.rafLight.position.copy(this.L(this.P.rafaelTrap.x, 1.3, this.P.rafaelTrap.z));
    this.checkpoint(5);
  }
  // ---------- 5: Rafael
  *s5() {
    const pl = this.g.player, I = this.g.input, P = this.P, b7 = this.b7;
    this.objective('Find Rafael.', this.L(0, 1.6, 4));
    const t0 = this.t; let tried = 0, warned = false, hold = 0;
    yield* this.until(() => {
      const el = this.t - t0, l = this.local();
      this.rafLight.intensity = 1.6 * (Math.sin(this.t * 17) > -.2 ? 1 : .1) * (Math.random() < .97 ? 1 : 0);
      if (b7.inside(pl.pos)) this.target = this.L(P.gDebris.x - 1.4, 1.5, 0);
      const near = Math.hypot(l.x - (P.gDebris.x - 1.6), l.z) < 2.3 && l.y < B7.C1;
      this.g.hud.prompt(near ? '<kbd>E</kbd> hold — pull the debris' : '');
      if (near && I.key('KeyE')) { hold += 1 / 60; tried += 1 / 60; if (Math.random() < .1) { HGA.thud(); this.g.shake(.12, .2); } if (hold > 2.4) { hold = 0; this.g.hud.hint('It won\'t move. His light is right there, behind the concrete.', 4); HGA.groan(.7); } }
      if (!warned && (el > 20 || tried > 3)) { warned = true; this.sayAsync("Navarro! It's all coming down! Get out of the water!"); HGA.groan(1); this.g.shake(.6, 2); }
      return el > 38 || (warned && el > 26 && (!b7.inside(pl.pos) || tried > 5)) || (warned && pl.breath < .12);
    });
    this.g.hud.prompt('');
    yield* this.until(() => !this.talking && !this.queue.length);
    yield* this.cine(endingCine(this.g, this));
    this.finish();
  }
  tick(dt) {
    const pl = this.g.player;
    this.boat.update(dt, this.t); this.rafael.update(dt, this.t);
    if (!pl.tow) this.nia.update(dt, 0);
  }
  failChecks() { const pl = this.g.player; if (pl.tow && pl.niaBreath <= 0) this.fail('Nia drowned. She could not hold her breath any longer.'); }
  endStat() { return `Nia Brooks, 9 — rescued  ·  Lt. Rafael Duarte — lost  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const c = this.b7.group.position, a = t * .04; cam.position.set(c.x + Math.sin(a) * 70, 26 + Math.sin(t * .1) * 4, c.z + Math.cos(a) * 70); cam.lookAt(c.x, 8, c.z); cam.fov = 52; }
}

// ---------------- cutscenes ----------------
function introCine(g, m) {
  const b7 = g.world.b7, L = () => g.world.water, boat = m.boat, pl = g.player, rf = m.rafael, rot = b7.group.rotation.y;
  const BW = (x, y, z) => boat.group.localToWorld(V3(x, y, z));
  const manhattan = V3(0, 160, -3400);
  return {
    enter: c => {
      g.hud.show(false); pl.lightOn = true;
      boat.place(m.L(-34, 0, 70), rot + Math.PI * .92); boat.moveTo(m.L(-8, 0, 34)); boat.speed = 3.4; boat.aim.copy(m.L(0, 4, 7));
      boat.group.add(pl.h.root); pl.h.setMode('sit'); pl.h.root.position.set(.55, .35, -1.8); pl.h.root.rotation.set(0, 0, 0);
      boat.group.add(rf.h.root); rf.h.setMode('sit'); rf.h.root.position.set(-.55, .35, -1.4); rf.h.root.rotation.set(0, 0, 0); rf.visible = false;
      boat.update(0, 0);
    },
    update: (c, dt) => { pl.h.update(dt, 0); rf.h.update(dt, 0); },
    shots: [
      { dur: 6, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: m.L(70, 3, 120), look: m.L(0, 12, 0) }, title: [.6, 'STORM DELPHINE', 'RED HOOK, BROOKLYN  ·  FIVE YEARS AGO', 'hg', 4.8] },
      { dur: 9, fadeIn: 1.6, cam: () => ({ from: m.L(40, 30, 95), to: m.L(18, 20, 70), look: manhattan, lookTo: m.L(0, 6, 0), fov: 42, fovTo: 50, ease: 'sine' }),
        lines: [[1.0, 'DISPATCH', "All units, Red Hook. Surge is still rising. Red Hook Houses, building seven. Callers trapped on the second floor.", 7.8]] },
      { dur: 6.2, cam: () => ({ from: BW(3.4, .9, 3.5), to: BW(3.0, 1.1, 2.6), look: BW(0, 1.7, -.2), fov: 40 }), lines: [[.4, 'CAPT. REYES', "You get two minutes in there, then I'm pulling you out. This whole block is going under.", 5]] },
      { dur: 10.4, cam: () => ({ from: BW(1.75, 1.55, .3), to: BW(1.6, 1.5, .1), look: BW(-.1, 1.15, -1.6), fov: 44 }),
        lines: [[.3, 'RAFAEL', "Stay on my line, Navarro. In and out. Nobody's a hero tonight.", 4.8], [5.3, 'ELI', "In and out.", 1], [6.5, 'RAFAEL', "Masks on. Let's go.", 3.4]] },
      { dur: 4.6, fadeOut: .7, cam: () => ({ from: BW(-4.5, .8, -2), to: BW(-4.2, .7, -3), look: BW(0, .6, -1.6), fov: 50 }),
        tick: (c, t) => { const k = clamp((t - .6) / .7, 0, 1), k2 = clamp((t - 1.1) / .7, 0, 1); pl.h.root.position.set(.55 + k * 1.6, .35 + Math.sin(k * Math.PI) * .4 - k * 1.1, -1.8); pl.h.root.rotation.x = -k * 1.4; rf.h.root.position.set(-.55 - k2 * 1.6, .35 + Math.sin(k2 * Math.PI) * .4 - k2 * 1.1, -1.4); rf.h.root.rotation.x = -k2 * 1.4; if (t > 1.2 && !c.s1) { c.s1 = 1; HGA.splash(1.2); } if (t > 1.7 && !c.s2) { c.s2 = 1; HGA.splash(1.2); } } },
    ],
    exit: c => {
      boat.group.remove(pl.h.root); g.scene.add(pl.h.root); pl.h.root.rotation.set(0, 0, 0);
      boat.group.remove(rf.h.root); g.scene.add(rf.h.root); rf.h.root.rotation.set(0, 0, 0); rf.visible = true;
      g.hud.show(true);
    },
  };
}
function handoffCine(g, m) {
  const boat = m.boat, pl = g.player, BW = (x, y, z) => boat.group.localToWorld(V3(x, y, z));
  return {
    enter: c => { g.hud.show(false); const n = pl.drop(g.scene, BW(0, .35, -2.2), boat.heading); if (n) { boat.group.add(n.root); n.root.position.set(0, .35, -2.2); n.root.rotation.set(0, Math.PI, 0); n.setMode('sit'); } },
    update: (c, dt) => { m.nia.update(dt, 0); },
    shots: [
      { dur: 5.6, cam: () => ({ from: BW(3.2, 1.6, -5), to: BW(2.8, 1.5, -4.4), look: BW(0, .9, -2), fov: 44 }), lines: [[.3, 'CAPT. REYES', "We got her. We got her. Where's Duarte? Navarro, where's your partner?", 5.3]] },
      { dur: 6.6, cam: () => { const L = g.world.water, p = pl.pos; return { from: V3(p.x + 2.2, L + 1.3, p.z + 2.6), to: V3(p.x + 1.7, L + 1.2, p.z + 2.1), look: g.world.b7.toWorld(V3(0, L + 2.4, 6)), fov: 46 }; },
        lines: [[.4, 'RAFAEL · RADIO', "Eli... I came in after you. The hallway came down. I'm pinned, I can't...", 4.4], [5.0, 'ELI', "Rafa! Hold on, I'm coming!", 1.9]], enter: c => HGA.squelch() },
    ],
    exit: c => g.hud.show(true),
  };
}
function endingCine(g, m) {
  const b7 = g.world.b7, boat = m.boat, pl = g.player;
  return {
    enter: c => {
      g.hud.show(false); pl.drop && pl.tow && pl.drop(g.scene, V3(0, -50, 0));
      pl.teleport(m.surf(.5, 11.5), b7.group.rotation.y + Math.PI, 'swim'); boat.place(m.L(5, 0, 18), b7.group.rotation.y + Math.PI); boat.aim.copy(m.L(0, 3, 7));
    },
    shots: [
      { dur: 5.2, cam: () => ({ from: m.L(-3, g.world.water + .45, 18), to: m.L(-2.4, g.world.water + .5, 16.5), look: m.L(0, 4, 6), fov: 48 }),
        lines: [[1.0, 'ELI', "Rafa!", 1.6]], tick: (c, t) => { pl.update(1 / 60); if (t > 1.6 && !c.g1) { c.g1 = 1; HGA.groan(1.2); g.shake(.8, 2.2); } } },
      { dur: 6.4, fadeOut: 1.8, cam: () => ({ from: boat.group.localToWorld(V3(2.6, 1.9, 4.5)), to: boat.group.localToWorld(V3(2.2, 1.8, 3.6)), look: boat.group.localToWorld(V3(0, 1, -1)), fov: 42 }),
        enter: c => { boat.group.add(pl.h.root); pl.h.setMode('sit'); pl.h.root.position.set(.4, .35, -1); pl.h.root.rotation.set(0, Math.PI * .9, 0); },
        lines: [[.6, 'CAPT. REYES', "I got you. I got you. He's gone, son. He's gone.", 4.6]], tick: (c, t, dt) => pl.h.update(dt, 0) },
      { dur: 8.5, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: m.L(0, 30, 60), look: m.L(0, 10, 0) }, title: [.5, 'LIEUTENANT RAFAEL DUARTE', 'FDNY Marine Rescue. One of the 212 people who died the night Storm Delphine hit New York.', 'card', 7.4] },
      { dur: 4.2, keepFade: true, cam: { from: m.L(0, 30, 60), look: m.L(0, 10, 0) }, title: [.4, 'FIVE YEARS LATER', '', 'card', 3.4] },
      { dur: 6.5, keepFade: true, cam: { from: m.L(0, 30, 60), look: m.L(0, 10, 0) }, title: [.5, 'HELL GATE', 'a New York story', 'logo', 5.6], enter: c => HGA.thunder(1.1) },
    ],
    exit: c => { boat.group.remove(pl.h.root); g.scene.add(pl.h.root); },
  };
}

HG_MISSIONS[1] = {
  n: 1, title: 'DELPHINE', place: 'Red Hook, Brooklyn · five years ago', area: 'redhook', cls: Mission1, look: HG_LOOK.eli, gear: 'diver',
  world: { area: 'redhook', weather: 'storm', flood: true, b7: true, liberty: true, water: 4.15 },
  loading: 'Loading Red Hook, the Manhattan skyline and the cast...',
  blurb: 'Eli got the girl out. Rafael went in after him and never came up. The department blames Eli.<br>Five years later, he gets people out of places for money.',
};
