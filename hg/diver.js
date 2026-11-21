'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Eli as an FDNY rescue diver: walk, wade, swim, dive, hold breath,
// carry a survivor; third-person camera that never clips walls or the waterline.
// ---------------------------------------------------------------------------
const HG_LOOK = {
  eli: { kind: 'male', hair: '#17120e', skin: '#b98a68', shirt: '#15181c', pants: '#15181c', height: 1.8 },
  rafael: { kind: 'male', hair: '#0f0c0a', skin: '#a8775a', shirt: '#15181c', pants: '#15181c', height: 1.76 },
  captain: { kind: 'male', hair: '#2a2622', skin: '#c29a7c', shirt: '#6b5a3a', pants: '#2a2a2a', height: 1.82 },
  nia: { kind: 'female', shirt: '#e2a3c4', pants: '#8db0db', height: 1.32 },
};
// helmet, headlamp and rescue vest on a human model
function dressDiver(h, helmetColor = '#1b1b1b', vestColor = '#e2531c') {
  if (!h.bones) return;
  const add = (bone, geo, mat, x, y, z) => { const b = h.bones[bone]; if (!b) return null; h.root.updateMatrixWorld(true); const s = b.getWorldScale(V3()).x || 1, m = new THREE.Mesh(geo, mat); m.scale.setScalar(1 / s); m.position.set(x / s, y / s, z / s); m.castShadow = true; b.add(m); return m; };
  const helm = new THREE.SphereGeometry(.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * .6);
  add('Head', helm, stdMat(helmetColor, { roughness: .35 }), 0, .1, -.005);
  add('Head', new THREE.CylinderGeometry(.03, .035, .07, 10).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.6), toneMapped: false }), 0, .17, .12);
  add('Head', new THREE.BoxGeometry(.2, .07, .03), new THREE.MeshStandardMaterial({ color: col('#0e1a22'), roughness: .1, metalness: .6 }), 0, .2, .1);     // mask pushed up
  const vest = new THREE.BoxGeometry(.4, .42, .3);
  add('Spine1', vest, stdMat(vestColor, { roughness: .7 }), 0, .02, .02);
  add('Spine1', new THREE.BoxGeometry(.41, .05, .31), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.4), toneMapped: false }), 0, .12, .02);   // reflective band
  add('Spine1', new THREE.CylinderGeometry(.08, .08, .5, 10), stdMat('#b8bcc0', { metalness: .7, roughness: .3 }), 0, -.02, -.2);                               // air bottle
}

class Diver {
  constructor(g, look = HG_LOOK.eli, gear = 'diver') {
    this.g = g; this.gear = gear;
    const h = this.h = makeHuman(look); g.scene.add(h.root); if (gear === 'diver') dressDiver(h, '#1b1b1b');
    this.pos = V3(); this.vel = V3(); this.yaw = 0; this.mode = 'swim'; this.grounded = false;
    this.breath = 1; this.breathMax = 75; this.under = 0; this.drownT = 0;
    this.tow = null; this.niaBreath = 1; this.niaMax = 26; this.niaUnder = 0;
    this.lightOn = gear === 'diver'; this.locked = false; this.stroke = 0; this.bubbleT = 0;
    this.hp = 1; this.hurtT = 99; this.crouch = false; this.noise = 0; this.canDive = true;
    this.lamp = new THREE.SpotLight(0xe6eeff, 0, 34, .4, .5, 1.3); this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(1024, 1024); this.lamp.shadow.camera.near = .3; this.lamp.shadow.camera.far = 34; this.lamp.shadow.bias = -.0008;
    this.lampT = new THREE.Object3D(); this.lamp.target = this.lampT; g.scene.add(this.lamp, this.lampT);
  }
  teleport(p, yaw, mode) { this.pos.copy(p); this.vel.set(0, 0, 0); if (yaw !== undefined) { this.yaw = yaw; this.g.rig.yaw = yaw; } if (mode) this.mode = mode; this.crouch = false; }
  get head() { return this.mode === 'dive' ? this.pos.y + .75 : this.pos.y + (this.crouch ? 1.05 : 1.6); }
  get eye() { return V3(this.pos.x, this.head, this.pos.z); }
  damage(a, from) {
    if (this.g.state !== 'play' || this.g.cine.active || this.hp <= 0 || this.god) return;
    this.hp = Math.max(0, this.hp - a); this.hurtT = 0; if (this.h.flinch) this.h.flinch(); HGA.hurt(); this.g.hud.hurt(a, from);
  }
  env() {
    const W = this.g.world, p = this.pos, sets = W.setsNear(p, 2.5);
    const o = { floor: W.ownedFloor(p) ? -80 : W.floorAt(p.x, p.z), ceil: Infinity, sets, nearB: sets.length > 0 };
    for (const s of sets) { const lp = s.toLocal(p).clone(); const fb = s.floorBelow(lp, .22); if (fb !== null) o.floor = Math.max(fb, o.floor); o.ceil = Math.min(o.ceil, s.ceilingAbove(lp, lp.y + (this.mode === 'dive' ? .9 : 1.0), .22)); }
    return o;
  }
  // top surface at a point ahead (for climbing out of the water)
  ledgeAt(q) {
    const W = this.g.world, near = W.setsNear(q, 1); let top = W.ownedFloor(q) ? null : W.floorAt(q.x, q.z), ceil = Infinity;
    for (const s of near) { const lq = s.toLocal(q).clone(), fb = s.floorBelow(lq, .18); if (fb !== null && (top === null || fb > top)) top = fb; }
    if (top === null) return null;
    for (const s of near) {
      const lq = s.toLocal(q).clone(); lq.y = top + .05; ceil = Math.min(ceil, s.ceilingAbove(lq, top + .05, .18));
      for (const dy of [.6, 1.5]) { const lp = s.toLocal(V3(q.x, top + dy, q.z)); if (s.pointSolid(lp)) return null; }   // the space above the ledge must be free (no climbing through walls)
    }
    return { top, ceil };
  }
  update(dt) {
    const g = this.g, W = g.world, I = g.input, L = W.waterAt(this.pos), rig = g.rig;
    let mx = (I.key('KeyD') ? 1 : 0) - (I.key('KeyA') ? 1 : 0), mz = (I.key('KeyW') ? 1 : 0) - (I.key('KeyS') ? 1 : 0);
    const fast = I.key('ShiftLeft') || I.key('ShiftRight'); let up = I.key('Space'), down = I.key('KeyC') || I.key('ControlLeft');
    if (this.locked || g.state !== 'play') { mx = mz = 0; up = down = false; }
    if (I.pressed('KeyF') && g.state === 'play') { this.lightOn = !this.lightOn; HGA.click(); }
    const fx = Math.sin(rig.yaw), fz = Math.cos(rig.yaw), rx = -fz, rz = fx;      // camera forward / right on the ground
    let wx = fx * mz + rx * mx, wz = fz * mz + rz * mx; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    const E = this.env(), tow = this.tow ? .78 : 1, feetDepth = L - this.pos.y;
    // ---- crouch (C on land): quieter, smaller, slower
    if (this.mode === 'walk' && feetDepth < .5 && I.pressed('KeyC') && g.state === 'play' && !this.locked) this.crouch = !this.crouch;
    if (this.mode !== 'walk' || feetDepth > .6) this.crouch = false;
    if (this.crouch && fast && wl > 0) this.crouch = false;
    // ---- mode changes
    if (this.mode === 'walk' && feetDepth > 1.38) this.mode = 'swim';
    if (this.mode === 'swim') {
      if (L - E.floor < 1.25 && this.pos.y <= E.floor + .25) this.mode = 'walk';
      let lowAhead = false;      // swimming into a passage that is flooded to the ceiling: duck under on your own
      if (wl > .1 && E.sets.length) { const a = this.pos.clone(); a.x += wx * .7; a.z += wz * .7; for (const s of E.sets) { const la = s.toLocal(a).clone(); if (s.ceilingAbove(la, L - .5, .2) < L + .42 && !s.pointSolid(la.setY(L - .6))) lowAhead = true; } }
      if ((down && this.canDive) || E.ceil - L < .42 || lowAhead) { this.mode = 'dive'; HGA.plunge(); }
    }
    if (this.mode === 'dive') {
      if (up && this.pos.y + .9 >= L - .05 && E.ceil - L >= .42) { this.mode = 'swim'; if (this.under > 4) HGA.gasp(); this.under = 0; }
      else if (this.pos.y <= E.floor + .05 && L - E.floor < 1.2) this.mode = 'walk';
    }
    // ---- movement
    let tvx = 0, tvy = 0, tvz = 0;
    if (this.mode === 'walk') {
      const slow = clamp(1 - feetDepth / 1.7, .32, 1), sp = (this.crouch ? 1.45 : fast && feetDepth < .5 ? 4.9 : 2.5) * slow * tow * (this.speedMul || 1);
      tvx = wx * sp; tvz = wz * sp;
      this.vel.x = damp(this.vel.x, tvx, 10, dt); this.vel.z = damp(this.vel.z, tvz, 10, dt);
      this.vel.y -= 20 * dt;
      if (I.pressed('Space') && this.grounded && feetDepth < .7 && !this.tow && !this.crouch && !this.locked && g.state === 'play') { this.vel.y = 5.4; this.grounded = false; }
      if (feetDepth > .9) this.vel.y += 9 * dt * clamp(feetDepth - .9, 0, 1);      // buoyancy in deep water
    } else if (this.mode === 'swim') {
      const sp = (fast ? 2.5 : 1.55) * tow;
      tvx = wx * sp; tvz = wz * sp;
      this.vel.x = damp(this.vel.x, tvx, 3, dt); this.vel.z = damp(this.vel.z, tvz, 3, dt);
      const ty = Math.max(L - 1.42, E.floor); this.vel.y = (ty - this.pos.y) * 4;
    } else {
      const sp = (fast ? 2.6 : 1.75) * tow, cp = Math.cos(rig.pitch), sp3 = -Math.sin(rig.pitch);
      tvx = (fx * cp * mz + rx * mx) * sp; tvz = (fz * cp * mz + rz * mx) * sp; tvy = sp3 * mz * sp + ((up ? 1 : 0) - (down ? 1 : 0)) * sp * .8 + .12;
      this.vel.x = damp(this.vel.x, tvx, 2.6, dt); this.vel.y = damp(this.vel.y, tvy, 2.6, dt); this.vel.z = damp(this.vel.z, tvz, 2.6, dt);
    }
    const vyBefore = this.vel.y, wasGrounded = this.grounded;
    this.pos.addScaledVector(this.vel, dt);
    // ---- collision with every set nearby (interiors, tunnels, rooftops)
    const h = this.mode === 'dive' ? .9 : this.crouch ? 1.15 : 1.7;
    let gr = false;
    for (const s of W.setsNear(this.pos, 2.5)) {
      const lp = s.toLocal(this.pos).clone(), r = s.resolve(lp, .3, h, this.mode === 'walk' || (this.mode === 'swim' && s.waters !== undefined));
      if (r.grounded) gr = true; if (r.grounded && this.vel.y < 0) this.vel.y = 0; if (r.ceil && this.vel.y > 0) this.vel.y = 0;
      this.pos.copy(s.toWorld(lp));
    }
    this.grounded = gr;
    const fl = W.ownedFloor(this.pos) ? E.floor : Math.max(E.floor, W.floorAt(this.pos.x, this.pos.z));
    if (this.pos.y < fl) { this.pos.y = fl; if (this.vel.y < 0) this.vel.y = 0; this.grounded = true; }
    // fall damage (rooftops)
    if (this.mode === 'walk' && this.grounded && !wasGrounded && vyBefore < -11.5 && feetDepth < .3) { this.damage(clamp((-vyBefore - 11.5) * .09, 0, 1)); HGA.thud(); }
    // climb out of the water onto a ledge in front (landing, stairs, a floor edge, a seawall)
    if (this.mode === 'swim' && (mz > 0 || Math.abs(mx) > 0)) {
      const ahead = this.pos.clone(); ahead.x += wx * .55; ahead.z += wz * .55; ahead.y = L + .8;
      const lg = this.ledgeAt(ahead);
      if (lg && lg.top > this.pos.y + .35 && lg.top <= L + .75 && lg.ceil - lg.top > 1.8) {
        this.climbT = (this.climbT || 0) + dt;
        if (this.climbT > .25) { this.pos.set(ahead.x, lg.top + .02, ahead.z); this.vel.set(0, 0, 0); this.mode = 'walk'; this.climbT = 0; HGA.splash(.9); }
      } else this.climbT = 0;
    }
    if (this.pos.y > -1.2) W.resolveCircle(this.pos, .38, this.pos.y);
    if (g.boat) { const d = Math.hypot(this.pos.x - g.boat.pos.x, this.pos.z - g.boat.pos.z); if (d < 2.6 && this.pos.y > L - 2.2 && d > 1e-3) { const k = (2.6 - d) / d; this.pos.x += (this.pos.x - g.boat.pos.x) * k; this.pos.z += (this.pos.z - g.boat.pos.z) * k; } }
    const LS = g.leash || (W.b7 ? { x: W.b7.group.position.x, z: W.b7.group.position.z, r: 230, msg: 'The current is too strong out there. Stay with the boat.' } : null);
    if (LS) { const dc = Math.hypot(this.pos.x - LS.x, this.pos.z - LS.z); if (dc > LS.r) { this.pos.x = LS.x + (this.pos.x - LS.x) * LS.r / dc; this.pos.z = LS.z + (this.pos.z - LS.z) * LS.r / dc; g.hud.hint(LS.msg, 3); } }
    // ---- breath
    const headUnder = this.head < L - .04, niaUnder = this.tow && (this.head + .32) < L - .04;
    if (headUnder) { this.under += dt; this.breath -= dt / this.breathMax * (fast ? 1.35 : 1); this.bubbleT -= dt; if (this.bubbleT <= 0) { this.bubbleT = 1.6 + Math.random() * 1.6; HGA.bubbles(); } }
    else { this.breath = Math.min(1, this.breath + dt * .3); }
    if (this.tow) { if (niaUnder) { this.niaUnder += dt; this.niaBreath -= dt / this.niaMax; } else { this.niaBreath = Math.min(1, this.niaBreath + dt * .35); this.niaUnder = 0; } }
    if (this.breath <= 0) { this.breath = 0; this.drownT += dt; } else this.drownT = 0;
    // ---- health comes back once out of fire
    this.hurtT += dt; if (this.hurtT > 5 && this.hp > 0) this.hp = Math.min(1, this.hp + dt * .09);
    // ---- noise for the guards' ears
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.noise = this.mode !== 'walk' ? (hs > .5 ? .35 : .1) : this.crouch ? .12 * Math.min(1, hs) : hs > 3.5 ? 1 : hs > .4 ? .42 : .05;
    // ---- body pose
    if (hs > .25) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), this.mode === 'walk' ? 10 : 4, dt);
    else if (this.mode === 'dive') this.yaw = dampAngle(this.yaw, rig.yaw, 2, dt);
    const H = this.h;
    if (this.mode === 'walk') { H.setMode(this.crouch ? 'crouch' : this.pose || 'idle'); H.root.position.copy(this.pos); H.root.rotation.set(0, this.yaw, 0); H.update(dt, hs); }
    else if (this.mode === 'swim') {
      if (hs > .35) { H.setMode('swim'); H.swimPitch = .1; H.swimRate = .8 + hs * .25; H.armsForward = false; H.root.position.set(this.pos.x, L - .2, this.pos.z); this.stroke -= dt; if (this.stroke <= 0) { this.stroke = .95; HGA.splash(.5); } }
      else { H.setMode('tread'); H.root.position.set(this.pos.x, this.pos.y, this.pos.z); }
      H.root.rotation.set(0, this.yaw, 0); H.update(dt, 0);
    } else {
      const s3 = this.vel.length(); H.setMode('swim'); H.swimPitch = s3 > .3 ? clamp(Math.asin(clamp(this.vel.y / s3, -1, 1)), -1.1, 1.1) : 0; H.swimRate = .6 + s3 * .3; H.armsForward = true;
      H.root.position.set(this.pos.x, this.pos.y + .45, this.pos.z); H.root.rotation.set(0, this.yaw, 0); H.update(dt, 0);
    }
    if (this.tow) this.tow.update(dt, 0);
    // ---- headlamp / flashlight follows where the camera looks
    const cam = g.camera, dir = V3(); cam.getWorldDirection(dir);
    this.lamp.position.set(this.pos.x, this.head + .1, this.pos.z).addScaledVector(dir, .3);
    this.lampT.position.copy(this.lamp.position).addScaledVector(dir, 10);
    this.lamp.intensity = this.lightOn ? (W.underwater ? 3.6 : 2.6) * (this.lampFlicker === undefined ? 1 : this.lampFlicker) : 0;
  }
  // pick Nia up: piggyback on Eli's back
  carry(nia) {
    this.tow = nia; nia.root.parent && nia.root.parent.remove(nia.root);
    this.h.body.add(nia.root); nia.root.position.set(0, .82, -.26); nia.root.rotation.set(0, 0, 0); nia.setMode('sit'); nia.piggy = true; this.niaBreath = 1;
  }
  drop(scene, pos, rotY) { const n = this.tow; if (!n) return; n.piggy = false; this.h.body.remove(n.root); scene.add(n.root); n.root.position.copy(pos); n.root.rotation.set(0, rotY || 0, 0); this.tow = null; return n; }
}

// third-person camera for the diver
class DiverRig {
  constructor(g, cam) { this.g = g; this.cam = cam; this.yaw = Math.PI; this.pitch = .2; this.dist = 3.4; this.t = V3(); this.p = V3(); this.ready = false; }
  snap() { this.ready = false; }
  update(dt) {
    const g = this.g, I = g.input, pl = g.player, W = g.world, L = W.waterAt(pl.pos);
    if (g.state === 'play' && !g.camLock) { this.yaw -= I.dx * .0024; this.pitch = clamp(this.pitch + I.dy * .0022, -1.15, 1.2); }
    let indoor = false, tight = false; for (const s of W.sets) if (s.inside(pl.pos)) { if (s.roofed !== false) indoor = true; if (s.tight || s === W.b7) tight = true; }
    const want = tight ? 2.25 : indoor ? 2.9 : (pl.mode === 'dive' ? 2.9 : 3.7);
    this.dist = damp(this.dist, want, 4, dt);
    const ty = pl.mode === 'dive' ? pl.pos.y + (tight ? 1.05 : .8) : pl.mode === 'swim' ? L + .25 : pl.pos.y + (pl.crouch ? 1.15 : 1.55);
    const sh = pl.mode === 'dive' || tight ? .42 : indoor ? .3 : 0;                      // over-the-shoulder in tight spaces
    const tgt = V3(pl.pos.x - Math.cos(this.yaw) * sh, ty, pl.pos.z + Math.sin(this.yaw) * sh);
    this.t.lerp(tgt, this.ready ? 1 - Math.exp(-14 * dt) : 1);
    const cp = Math.cos(this.pitch), f = V3(Math.sin(this.yaw) * cp, -Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    // pull the camera in front of walls (interior boxes and city blocks)
    let d = this.dist; const step = .12, q = V3(), near = W.setsNear(this.t, this.dist + 1);
    for (let s = .3; s <= this.dist; s += step) {
      q.copy(this.t).addScaledVector(f, -s); q.y += s * .08;
      let hit = q.y > -1 && W.pointInBuilding(q.x, q.y, q.z);
      for (const st of near) if (!hit && st.pointSolid(st.toLocal(q))) hit = true;
      if (hit) { d = Math.max(.35, s - .25); break; }
    }
    const pos = V3().copy(this.t).addScaledVector(f, -d); pos.y += d * .08;
    pos.y = Math.max(pos.y, W.groundAt(pos) + .3);
    const LC = W.waterAt(pos);
    if (Math.abs(pos.y - LC) < .14) {      // never sit exactly on the waterline (and never inside a ceiling just above it)
      const upP = pos.clone(); upP.y = LC + .14; let blocked = false; for (const st of near) if (st.pointSolid(st.toLocal(upP))) blocked = true;
      pos.y = this.t.y < LC || blocked ? LC - .14 : LC + .14;
    }
    this.p.lerp(pos, this.ready ? 1 - Math.exp(-18 * dt) : 1); this.ready = true;
    this.cam.position.copy(this.p); this.cam.lookAt(V3().copy(this.t).addScaledVector(f, 2));
    this.cam.fov = damp(this.cam.fov, tight ? 66 : indoor ? 63 : 60, 3, dt); this.cam.updateProjectionMatrix();
  }
}
