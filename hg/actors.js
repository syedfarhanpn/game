'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — people for Missions 2-6: the cast's outfits, guards with sight,
// hearing, suspicion, search and gunfire, takedowns from behind, followers who
// keep to Eli's own path (through pipes, stairs and flooded tunnels), extras.
// ---------------------------------------------------------------------------
const P_SKIN = ['#8a5a3c', '#a87554', '#c29a7c', '#d6b39c', '#6b4530', '#b48262', '#e0c0a8'];
const P_HAIR = ['#17120e', '#2a2018', '#3d2c1e', '#0f0c0a', '#6a6560', '#4a3a2a'];
const CAST = {
  eli: { kind: 'male', hair: '#17120e', skin: '#b98a68', shirt: '#22262b', pants: '#1c1f24', height: 1.8 },
  eliWaiter: { kind: 'male', hair: '#17120e', skin: '#b98a68', shirt: '#f2efe8', pants: '#121212', height: 1.8 },
  eliTac: { kind: 'male', hair: '#17120e', skin: '#b98a68', shirt: '#1b1e22', pants: '#24282c', height: 1.8 },
  deacon: { kind: 'male', hair: '#d8d4cc', skin: '#5a3a28', shirt: '#5a3a2a', pants: '#211c18', height: 1.85 },
  sof: { kind: 'female', shirt: '#8a2f28', pants: '#1b1d22', height: 1.66 },
  galina: { kind: 'female', shirt: '#24242c', pants: '#24242c', height: 1.6 },
  iris: { kind: 'female', shirt: '#d8b24c', pants: '#d8b24c', height: 1.72 },
  irisStreet: { kind: 'female', shirt: '#3a4a5c', pants: '#1d2026', height: 1.72 },
  lucia: { kind: 'female', shirt: '#e6dccb', pants: '#3c4a63', height: 1.6 },
  harold: { kind: 'male', hair: '#9a948c', skin: '#d8b8a2', shirt: '#e5822a', pants: '#e5822a', height: 1.7 },
  viktor: { kind: 'male', hair: '#7a746c', skin: '#dcbca4', shirt: '#151515', pants: '#151515', height: 1.88 },
  crane: { kind: 'male', hair: '#bdb8b0', skin: '#e0c4ae', shirt: '#2a2e36', pants: '#2a2e36', height: 1.83 },
  bride: { kind: 'female', shirt: '#ffffff', pants: '#ffffff', height: 1.66 },
  thug: () => ({ kind: 'male', hair: pick(P_HAIR), skin: pick(P_SKIN), shirt: pick(['#2b2b2b', '#3a3226', '#1f2a36', '#4a1e1e', '#2e3a2a', '#555']), pants: pick(['#1c1c1c', '#2a3140', '#3a3a3a']), height: 1.74 + Math.random() * .12 }),
  bratva: () => ({ kind: 'male', hair: pick(['#17120e', '#3d2c1e', '#6a6560']), skin: pick(['#d6b39c', '#e0c0a8', '#c29a7c']), shirt: '#141414', pants: '#141414', height: 1.8 + Math.random() * .1 }),
  waiter: () => ({ kind: 'male', hair: pick(P_HAIR), skin: pick(P_SKIN), shirt: '#f2efe8', pants: '#121212', height: 1.72 + Math.random() * .1 }),
  guestM: () => ({ kind: 'male', hair: pick(P_HAIR), skin: pick(['#d6b39c', '#e0c0a8', '#c29a7c', '#b48262']), shirt: pick(['#1a1a1a', '#22283a', '#3a2a2a', '#2a2a2a', '#4a4a50']), pants: pick(['#1a1a1a', '#22283a']), height: 1.72 + Math.random() * .14 }),
  guestF: () => ({ kind: 'female', shirt: pick(['#8a1c2c', '#1c3a6a', '#c9a24a', '#2a6a4a', '#6a2a6a', '#111', '#d8c8b0']), pants: '#222', height: 1.6 + Math.random() * .1 }),
  co: () => ({ kind: 'police', tint: '#5a6a7e' }),           // corrections officers: blue-grey uniforms
  halcyon: () => ({ kind: 'police', tint: '#2b2f33', visor: true }),   // Halcyon private military: black kit
  driverM: () => ({ kind: 'male', hair: pick(P_HAIR), skin: pick(P_SKIN), shirt: pick(['#6a7a8a', '#8a6a4a', '#3a4a3a', '#7a2a2a']), pants: '#2a2a2a' }),
};
// a few extra clothes on a stock model (a coat, a headscarf, a hat)
function dressUp(h, o = {}) {
  if (!h.bones || !h.bones.Spine1) return;
  const add = (bone, geo, mat, x, y, z) => { const b = h.bones[bone]; if (!b) return null; h.root.updateMatrixWorld(true); const s = b.getWorldScale(V3()).x || 1, m = new THREE.Mesh(geo, mat); m.scale.setScalar(1 / s); m.position.set(x / s, y / s, z / s); m.castShadow = true; b.add(m); return m; };
  if (o.coat) { const m = stdMat(o.coat, { roughness: .9, side: THREE.DoubleSide }); add('Spine', new THREE.CylinderGeometry(.2, .29, .95, 14, 1, true), m, 0, -.32, 0); add('Spine1', new THREE.CylinderGeometry(.19, .2, .38, 14, 1, true), m, 0, .02, 0); }
  if (o.scarf) add('Head', new THREE.SphereGeometry(.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * .62), stdMat(o.scarf, { roughness: .9 }), 0, .06, -.02);
  if (o.cap) add('Head', new THREE.CylinderGeometry(.11, .115, .07, 14), stdMat(o.cap, { roughness: .8 }), 0, .15, 0);
}
const castLook = k => { const v = CAST[k]; return typeof v === 'function' ? v() : Object.assign({}, v); };

// ---------------- guns and gunfire ----------------
function makeGun(kind = 'rifle') {
  const g = new THREE.Group(), m = stdMat('#1a1c1e', { metalness: .6, roughness: .45 }), add = (geo, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  if (kind === 'pistol') { add(new THREE.BoxGeometry(.035, .1, .19), 0, 0, .05); add(new THREE.BoxGeometry(.03, .1, .04), 0, -.07, -.02); g.userData.muzzle = V3(0, .02, .16); }
  else { add(new THREE.BoxGeometry(.055, .08, .46), 0, 0, .1); const b = add(new THREE.CylinderGeometry(.014, .014, .3, 6), 0, .015, .48); b.rotation.x = Math.PI / 2; add(new THREE.BoxGeometry(.035, .14, .06), 0, -.09, .14); add(new THREE.BoxGeometry(.045, .1, .2), 0, -.02, -.2); add(new THREE.BoxGeometry(.03, .04, .12), 0, .07, .12); g.userData.muzzle = V3(0, .015, .64); }
  return g;
}
const FX = {
  init(g) {
    this.g = g; this.flashes = []; this.tracers = [];
    for (let k = 0; k < 3; k++) { const l = new THREE.PointLight(0xffc070, 0, 14, 2); g.scene.add(l); this.flashes.push({ l, t: 0 }); }
    const tm = new THREE.LineBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4), transparent: true, opacity: 0, toneMapped: false });
    for (let k = 0; k < 8; k++) { const geo = new THREE.BufferGeometry().setFromPoints([V3(), V3(0, 0, 1)]), line = new THREE.Line(geo, tm.clone()); line.frustumCulled = false; g.scene.add(line); this.tracers.push({ line, t: 0 }); }
    this.fi = 0; this.ti = 0;
  },
  shot(from, to, loud = 1) {
    if (!this.g) return;
    const f = this.flashes[this.fi++ % this.flashes.length]; f.l.position.copy(from); f.t = .06;
    const tr = this.tracers[this.ti++ % this.tracers.length], pos = tr.line.geometry.attributes.position;
    const a = from.clone().lerp(to, .15); pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, to.x, to.y, to.z); pos.needsUpdate = true; tr.t = .07;
    HGA.gunshot(clamp(1 - from.distanceTo(this.g.camera.position) / 90, .08, 1) * loud);
  },
  update(dt) {
    if (!this.g) return;
    for (const f of this.flashes) { f.t -= dt; f.l.intensity = f.t > 0 ? 7 : 0; }
    for (const t of this.tracers) { t.t -= dt; t.line.material.opacity = t.t > 0 ? .9 : 0; }
  },
};

// ---------------- a person in the world ----------------
class Actor {
  constructor(g, look, o = {}) {
    this.g = g; this.look = typeof look === 'string' ? castLook(look) : look; this.h = makeHuman(this.look); g.scene.add(this.h.root);
    this.pos = V3(); this.yaw = 0; this.spd = 0; this.mode = o.mode || 'idle'; this.vis = true; this.name = o.name || '';
    this.target = null; this.walkSpeed = o.speed || 1.35; this.moveSpeed = 0; this.r = .3; this.fixedY = !!o.fixedY;
    if (o.gun) { this.gun = makeGun(o.gun); this.h.root.add(this.gun); }
  }
  place(p, yaw = this.yaw) { this.pos.copy(p); this.yaw = yaw; this.target = null; this.spd = 0; this.sync(0); return this; }
  show(on) { this.vis = on; this.h.root.visible = on; }
  goTo(p, speed) { this.target = p ? p.clone() : null; this.moveSpeed = speed || this.walkSpeed; }
  faceTo(p, dt, k = 6) { this.yaw = dampAngle(this.yaw, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), k, dt); }
  get fwd() { return V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  step(dt) {
    if (!this.target) { this.spd = damp(this.spd, 0, 8, dt); return true; }
    const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < .3) { this.spd = damp(this.spd, 0, 8, dt); this.target = null; return true; }
    const sp = Math.min(this.moveSpeed || this.walkSpeed, d * 3); this.spd = sp;
    this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 8, dt);
    this.pos.x += dx / d * sp * dt; this.pos.z += dz / d * sp * dt;
    this.collide(); return false;
  }
  collide() {
    const W = this.g.world;
    for (const s of W.setsNear(this.pos, 2)) { const lp = s.toLocal(this.pos).clone(); s.resolve(lp, this.r, 1.7, true); this.pos.copy(s.toWorld(lp)); }
    if (this.pos.y > -1.2) W.resolveCircle(this.pos, .35, this.pos.y);
    if (!this.fixedY) this.pos.y = W.groundAt(V3(this.pos.x, this.pos.y + .55, this.pos.z), .15);
  }
  gunPose() {
    if (!this.gun) return; const hy = this.h.seatOffset || .95, m = this.h.mode;
    if (m === 'aim') { this.gun.position.set(-.04, hy + .48, .3); this.gun.rotation.set(0, 0, 0); }
    else if (m === 'rifle') { this.gun.position.set(-.03, hy + .24, .28); this.gun.rotation.set(.55, .25, 0); }
    else if (m === 'down') { this.gun.visible = false; }
    else { this.gun.position.set(-.18, hy + .05, .05); this.gun.rotation.set(1.2, 0, 0); }
  }
  muzzle() { if (!this.gun) return V3(this.pos.x, this.pos.y + 1.4, this.pos.z); this.h.root.updateMatrixWorld(true); return this.gun.localToWorld(this.gun.userData.muzzle.clone()); }
  sync(dt) { const H = this.h; H.setMode(this.mode); H.root.position.copy(this.pos); if ((this.mode === 'sit' || this.mode === 'sitbound') && this.seatH !== undefined) H.root.position.y = this.pos.y + this.seatH - (H.seatOffset || .9) + .08; H.root.rotation.set(0, this.yaw, 0); H.update(dt, this.spd); this.gunPose(); }
  update(dt) { if (!this.vis) return; this.step(dt); this.sync(dt); }
  remove() { this.g.scene.remove(this.h.root); }
}

// ---------------- guards ----------------
class Guard extends Actor {
  constructor(g, look, o = {}) {
    super(g, look, Object.assign({ gun: 'rifle', mode: 'rifle' }, o));
    this.route = (o.route || []).map(p => p.isVector3 ? { p } : p); this.ri = 0; this.waitT = o.wait || 0;
    this.state = 'patrol'; this.sus = 0; this.fireT = 1 + Math.random(); this.lastSeen = null; this.lostT = 0; this.searchT = 0;
    this.range = o.range || 16; this.fov = Math.cos((o.fov || 55) * Math.PI / 180); this.acc = o.acc || .5; this.dmg = o.dmg || .15;
    this.down = false; this.found = false; this.bark = o.bark || null; this.idleYaw = null; this.lookT = Math.random() * 5; this.seeT = 0; this.seen = 0;
    this.home = null; this.passive = !!o.passive; this.torch = null; this.vy = o.vy || 9;
    if (o.torch) { this.torch = new THREE.SpotLight(0xfff0d8, 2.4, 22, .38, .5, 1.4); this.torchT = new THREE.Object3D(); this.torch.target = this.torchT; g.scene.add(this.torch, this.torchT); }
  }
  place(p, yaw) { super.place(p, yaw); if (!this.home) this.home = { p: p.clone(), yaw: this.yaw }; return this; }
  eye() { return V3(this.pos.x, this.pos.y + 1.62, this.pos.z); }
  // how well this guard sees a point right now (0 = not at all)
  sees(p, crouch = false, inWater = false) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    let rng = this.range * (crouch ? .55 : 1) * (inWater ? .45 : 1) * (this.g.mission.lightAt ? this.g.mission.lightAt(p) : 1) * (this.state === 'alert' ? 1.6 : this.state === 'search' ? 1.25 : 1);
    if (d > rng || Math.abs(p.y - this.pos.y) > this.vy) return 0;
    const f = this.fwd, dot = d > .01 ? (dx * f.x + dz * f.z) / d : 1;
    if (d > 1.5 && dot < (this.state === 'alert' ? -.2 : this.fov)) return 0;
    if (!this.g.world.lineClear(this.eye(), p)) return 0;
    return 1 - d / rng;
  }
  takedown() { this.down = true; this.state = 'down'; this.mode = 'down'; this.sus = 0; this.target = null; if (this.torch) this.torch.intensity = 0; this.g.mission.onGuardDown && this.g.mission.onGuardDown(this); }
  alarm(p, reason) {
    if (this.down) return; const was = this.state; this.state = 'alert'; this.sus = 1; this.lastSeen = p ? p.clone() : this.g.player.pos.clone(); this.lostT = 0;
    if (was !== 'alert') { this.fireT = .9 + Math.random() * .6; this.say('alert'); this.g.mission.onAlarm && this.g.mission.onAlarm(this, reason); }
  }
  say(kind) { if (this.bark && this.bark[kind] && this.g.mission.bark) this.g.mission.bark(this, this.bark[kind]); }
  get barkKey() { const t = this.look && this.look.tint; return this._bk || (this.look.kind === 'police' ? (t === '#2b2f33' ? 'HALCYON' : 'CO') : this.look.shirt === '#141414' ? 'BRATVA' : 'THUG'); }
  set barkKey(v) { this._bk = v; }
  update(dt) {
    if (!this.vis) return;
    const g = this.g, pl = g.player, M = g.mission;
    if (this.down) { this.mode = 'down'; this.spd = 0; this.sync(dt); return; }
    const active = g.state === 'play' && !g.cine.active && !this.passive;
    // ---- perception (a few times a second)
    this.seeT -= dt;
    if (active && this.seeT <= 0) {
      this.seeT = .12;
      const pp = pl.pos.clone(); pp.y += pl.crouch ? .9 : pl.mode === 'walk' ? 1.3 : .2;
      this.seen = M.hidden ? 0 : this.sees(pp, pl.crouch, pl.mode !== 'walk');
      // a downed partner in plain sight
      if (!this.found && M.guards) for (const o of M.guards) if (o !== this && o.down && !o.found && this.sees(o.pos.clone().setY(o.pos.y + .3)) > 0) { o.found = true; this.found = true; this.say('body'); this.state = 'search'; this.sus = Math.max(this.sus, .8); this.lastSeen = o.pos.clone(); this.searchT = 14; }
      // hearing: running, splashing, a fight
      const hd = pl.pos.distanceTo(this.pos), heard = !M.hidden && pl.noise * 13 > hd && Math.abs(pl.pos.y - this.pos.y) < 6;
      if (heard && this.state === 'patrol') { this.sus = Math.max(this.sus, .45); this.lastSeen = pl.pos.clone(); this.state = 'search'; this.searchT = 7; this.say('hear'); }
    }
    if (!active) this.seen = 0;
    // ---- suspicion
    if (this.state !== 'alert') {
      if (this.seen > 0) { this.sus += dt * (.42 + this.seen * 2.6); this.lastSeen = pl.pos.clone(); if (this.sus > .35 && this.state === 'patrol') { this.state = 'search'; this.searchT = 8; this.say('hear'); } }
      else this.sus = Math.max(0, this.sus - dt * (this.state === 'search' ? .05 : .14));
      if (this.sus >= 1) this.alarm(pl.pos, 'seen');
    }
    // ---- behaviour
    if (this.state === 'patrol') {
      this.mode = this.sitting ? 'sit' : 'rifle'; if (this.sitting) this.seatH = .46;
      if (this.route.length > 1) {
        if (this.waitT > 0) { this.waitT -= dt; this.spd = damp(this.spd, 0, 8, dt); const r = this.route[this.ri]; if (r.look !== undefined) this.yaw = dampAngle(this.yaw, r.look, 3, dt); }
        else { const r = this.route[this.ri]; this.goTo(r.p, this.walkSpeed); if (this.step(dt)) { this.waitT = r.wait || 0; this.ri = (this.ri + 1) % this.route.length; } }
      } else {
        if (this.home && this.pos.distanceTo(this.home.p) > .6) { this.goTo(this.home.p, this.walkSpeed); this.step(dt); }
        else { this.spd = damp(this.spd, 0, 8, dt); this.lookT -= dt; if (this.lookT <= 0) { this.lookT = 3 + Math.random() * 4; this.idleYaw = (this.home ? this.home.yaw : this.yaw) + (Math.random() - .5) * 1.6; } if (this.idleYaw !== null) this.yaw = dampAngle(this.yaw, this.idleYaw, 1.5, dt); }
      }
    } else if (this.state === 'search') {
      this.mode = 'rifle'; this.searchT -= dt;
      if (this.lastSeen && this.pos.distanceTo(this.lastSeen) > 1.5 && this.sus > .4) { this.goTo(this.lastSeen, 1.6); this.step(dt); }
      else { this.spd = damp(this.spd, 0, 8, dt); this.yaw += Math.sin(g.time * .9 + this.pos.x) * dt * 1.1; }
      if (this.seen > 0 && this.lastSeen) this.faceTo(this.lastSeen, dt, 4);
      if (this.searchT <= 0 && this.sus < .3) { this.state = 'patrol'; this.say('calm'); this.found = this.found; }
    } else if (this.state === 'alert') {
      if (this.seen > 0) {
        this.lastSeen = pl.pos.clone(); this.lostT = 0; this.mode = 'aim'; this.spd = damp(this.spd, 0, 8, dt); this.faceTo(pl.pos, dt, 10);
        this.fireT -= dt;
        if (this.fireT <= 0 && active) {
          this.fireT = .5 + Math.random() * .55;
          const d = this.pos.distanceTo(pl.pos), mv = Math.hypot(pl.vel.x, pl.vel.z);
          const pHit = clamp(this.acc * (1.25 - d / 34) - mv * .045 - (pl.crouch ? .12 : 0), .05, .8) * (M.hitScale || 1);
          const hit = Math.random() < pHit, chest = pl.pos.clone(); chest.y += pl.crouch ? .8 : 1.25;
          const miss = chest.clone().add(V3((Math.random() - .5) * 2.4, (Math.random() - .3) * 1.4, (Math.random() - .5) * 2.4));
          FX.shot(this.muzzle(), hit ? chest : miss);
          if (hit) pl.damage(this.dmg * (d < 6 ? 1.3 : 1), this.pos);
        }
      } else {
        this.lostT += dt; this.mode = 'rifle';
        if (this.lastSeen && this.pos.distanceTo(this.lastSeen) > 1.2 && this.lostT < 9) { this.goTo(this.lastSeen, 3.1); this.step(dt); } else this.spd = damp(this.spd, 0, 8, dt);
        if (this.lostT > (M.alertMemory || 11)) { this.state = 'search'; this.sus = .7; this.searchT = 10; }
      }
    }
    if (this.torch) {
      const e = this.eye(); this.torch.position.copy(e).addScaledVector(this.fwd, .3);
      this.torchT.position.copy(e).addScaledVector(this.fwd, 8); this.torchT.position.y -= 1.6; this.torch.intensity = 2.4;
    }
    this.sync(dt);
  }
}

// ---------------- someone Eli is getting out: keeps to his own path ----------------
class Follower extends Actor {
  constructor(g, look, o = {}) {
    super(g, look, o);
    this.trail = []; this.gap = o.gap || 1.9; this.on = false; this.breath = 1; this.breathMax = o.breathMax || 45; this.label = o.label || 'HER';
    this.swimMode = 'walk'; this.pose = o.pose || 'idle'; this.runMul = o.runMul || 1;
  }
  start() { this.on = true; this.trail = [{ p: this.pos.clone(), m: 'walk' }]; this.breath = 1; }
  stop() { this.on = false; this.trail = []; }
  snapBehind() {
    const pl = this.g.player, b = pl.pos.clone().addScaledVector(V3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)), -this.gap);
    b.y = this.g.world.groundAt(V3(b.x, pl.pos.y + .6, b.z)); this.pos.copy(pl.pos.distanceTo(b) < 3 && Math.abs(b.y - pl.pos.y) < .6 ? b : pl.pos.clone());
    this.trail = [{ p: this.pos.clone(), m: pl.mode }];
  }
  update(dt) {
    if (!this.vis) return;
    const g = this.g, W = g.world, pl = g.player;
    if (!this.on) { this.step(dt); this.sync(dt); return; }
    const last = this.trail[this.trail.length - 1];
    if (!last || pl.pos.distanceTo(last.p) > .3) { this.trail.push({ p: pl.pos.clone(), m: pl.mode }); if (this.trail.length > 600) this.trail.shift(); }
    // distance left along the trail
    let rem = 0; for (let i = 0; i < this.trail.length - 1; i++) rem += this.trail[i].p.distanceTo(this.trail[i + 1].p);
    rem += this.pos.distanceTo(this.trail[0].p);
    let moving = false, m = this.trail[0].m;
    const Lh = W.waterAt(this.pos), under = this.pos.y + (m === 'dive' ? .75 : 1.5) < Lh - .04, gap = under && pl.head >= W.waterAt(pl.pos) ? .35 : this.gap;   // come up for air where Eli is breathing
    if (rem > gap && this.trail.length) {
      const sp = (rem > gap + 5 ? 4.4 : rem > gap + 1.5 ? 3 : 1.8) * this.runMul * (m === 'walk' ? 1 : .75);
      let budget = sp * dt;
      while (budget > 0 && this.trail.length > 1) {
        const t = this.trail[0].p, d = this.pos.distanceTo(t);
        if (d <= budget) { this.pos.copy(t); budget -= d; this.trail.shift(); }
        else { const dir = t.clone().sub(this.pos).normalize(); if (Math.hypot(dir.x, dir.z) > .2) this.yaw = dampAngle(this.yaw, Math.atan2(dir.x, dir.z), 9, dt); this.pos.addScaledVector(dir, budget); budget = 0; }
        moving = true;
      }
      this.spd = sp; m = this.trail[0].m;
    } else this.spd = damp(this.spd, 0, 8, dt);
    if (this.pos.distanceTo(pl.pos) > 32) this.snapBehind();
    this.swimMode = m;
    // breath
    const L = W.waterAt(this.pos), head = this.pos.y + (m === 'dive' ? .75 : m === 'swim' ? 1.5 : 1.55);
    if (head < L - .04) this.breath -= dt / this.breathMax; else this.breath = Math.min(1, this.breath + dt * .35);
    // pose
    const H = this.h;
    if (m === 'walk') { this.mode = this.pose; this.sync(dt); return; }
    if (m === 'swim') { if (moving) { H.setMode('swim'); H.swimPitch = .1; H.armsForward = false; H.root.position.set(this.pos.x, L - .2, this.pos.z); } else { H.setMode('tread'); H.root.position.copy(this.pos); } }
    else { H.setMode('swim'); H.armsForward = true; H.swimPitch = 0; H.root.position.set(this.pos.x, this.pos.y + .45, this.pos.z); }
    H.root.rotation.set(0, this.yaw, 0); H.update(dt, 0);
  }
}

// ---------------- extras (wedding guests, gala crowd, drivers stuck in traffic) ----------------
class Extra extends Actor {
  constructor(g, look, o = {}) { super(g, look, o); this.baseYaw = 0; this.ph = Math.random() * 9; this.react = 0; }
  place(p, yaw) { super.place(p, yaw); this.baseYaw = this.yaw; return this; }
  update(dt) {
    if (!this.vis) return;
    if (this.mode === 'idle' || this.mode === 'talk' || this.mode === 'drink') this.yaw = this.baseYaw + Math.sin(this.g.time * .3 + this.ph) * .25;
    const far = this.pos.distanceTo(this.g.camera.position) > 16 && !this.target, still = (this.mode === 'sit' || this.mode === 'sitbound') && !this.target;
    this.acc = (this.acc || 0) + dt; this.fr = ((this.fr || 0) + 1) % 20;
    if (still && this.posed && this.fr !== (this.ph * 10 | 0) % 20) return;      // seated people hardly move: re-pose them now and then
    if (far && this.fr % 4 !== (this.ph * 10 | 0) % 4) return;
    if (still) this.posed = true;
    const d = this.acc; this.acc = 0;
    this.step(d); this.sync(d);
  }
}
