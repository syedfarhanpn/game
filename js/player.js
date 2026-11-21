'use strict';
// ---------------------------------------------------------------------------
// Player: on-foot controller, vehicle entry/exit, health. CameraRig: third
// person orbit / chase camera with collision, speed FOV and shake.
// ---------------------------------------------------------------------------
class Player {
  constructor(game) {
    this.game = game;
    this.h = makeHuman(LOOK.kai);
    game.scene.add(this.h.root);
    this.pos = LOC.start.clone(); this.vel = V3(); this.vy = 0; this.y = 0; this.facing = 0;
    this.lastValid = this.pos.clone();
    this.car = null; this.vitals = newVitals(); this.isPlayer = true; this.dead = false; this.onGround = true; this.hurtT = 0; this.punchCD = 0;
  }
  get focusPos() { return this.car ? this.car.pos : this.pos; }
  get health() { return Math.max(0, this.vitals.hp); }
  hurt(n, why) {
    if (this.dead || this.game.state !== 'play') return;
    this.vitals.hp -= n; this.hurtT = .4;
    if (why === 'explosion') addInjury(this.vitals, 'burns');
    this.game.hud.flashDamage();
    if (this.vitals.hp <= 0) this.game.onKnockout(why);
  }
  heal() { this.vitals = newVitals(); this.dead = false; }
  setVisible(v) { this.h.root.visible = v; }
  teleport(p, facing = 0) {
    if (this.car) this.exitCar(true);
    this.pos.copy(p); this.lastValid.copy(p); this.vel.set(0, 0, 0); this.facing = facing; this.h.root.rotation.y = facing;
    this.y = this.game.world.groundHeight(p.x, p.z); this.pos.y = this.y;
  }

  update(dt, input) {
    const g = this.game, W = g.world;
    this.punchCD -= dt; this.hurtT -= dt;
    if (this.car) {
      const c = this.car;
      if (!this.dead && g.state === 'play') {
        c.input.throttle = input.key('KeyW') || input.key('ArrowUp') ? 1 : 0;
        c.input.brake = input.key('KeyS') || input.key('ArrowDown') ? 1 : 0;
        c.input.steer = (input.key('KeyA') || input.key('ArrowLeft') ? 1 : 0) - (input.key('KeyD') || input.key('ArrowRight') ? 1 : 0);
        c.input.handbrake = input.key('Space');
      } else { c.input.throttle = 0; c.input.brake = .3; c.input.steer = 0; }
      this.pos.copy(c.pos);
      this.h.update(dt, 0);
      AUDIO.engine(!c.dead, c.vF / c.t.maxSpeed, c.input.throttle);
      const skid = (c.slip > 4.5 || (c.input.handbrake && c.speed > 8)) && c.y < .3;
      AUDIO.screech(skid ? clamp((c.slip - 3) / 8, .3, 1) : 0);
      if (skid) {
        c.skidAcc += c.speed * dt;
        if (c.skidAcc > .9) {
          c.skidAcc = 0; const f = c.fwd, rx = -f.z, rz = f.x, b = -c.t.L * .32;
          for (const s of [-1, 1]) g.effects.skid(c.pos.x + f.x * b + rx * s * (c.t.W / 2 - .15), c.y, c.pos.z + f.z * b + rz * s * (c.t.W / 2 - .15), c.heading);
        }
      }
      return;
    }
    AUDIO.engine(false, 0, 0); AUDIO.screech(0);
    if (this.dead) { this.h.setMode('down'); this.h.update(dt, 0); return; }
    // ---- on foot
    const cam = g.camRig, fwd = { x: Math.sin(cam.yaw), z: Math.cos(cam.yaw) }, right = { x: -fwd.z, z: fwd.x };
    let mx = 0, mz = 0;
    if (g.state === 'play') {
      const f = (input.key('KeyW') || input.key('ArrowUp') ? 1 : 0) - (input.key('KeyS') || input.key('ArrowDown') ? 1 : 0);
      const r = (input.key('KeyD') || input.key('ArrowRight') ? 1 : 0) - (input.key('KeyA') || input.key('ArrowLeft') ? 1 : 0);
      mx = fwd.x * f + right.x * r; mz = fwd.z * f + right.z * r;
    }
    const ml = Math.hypot(mx, mz);
    const sprint = input.key('ShiftLeft') || input.key('ShiftRight');
    const limp = hasEffect(this.vitals, 'limp'), canSprint = !limp && !hasEffect(this.vitals, 'breath') && !hasEffect(this.vitals, 'critical');
    const spd = ml > 0 ? (limp ? 1.4 : this.crouch ? 1.6 : sprint && canSprint ? 7.5 : 3.6) : 0;
    if (sprint && this.crouch && ml > 0) this.crouch = false;
    if (ml > 0) { mx /= ml; mz /= ml; this.facing = Math.atan2(mx, mz); }
    this.vel.x = damp(this.vel.x, mx * spd, 10, dt); this.vel.z = damp(this.vel.z, mz * spd, 10, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // jump & gravity
    const gh = W.groundHeight(this.pos.x, this.pos.z);
    if (g.state === 'play' && input.pressed('Space') && this.onGround) { this.vy = 6.2; this.onGround = false; }
    this.vy -= 20 * dt; this.y += this.vy * dt;
    if (this.y <= gh) { this.y = gh; this.vy = 0; this.onGround = true; }
    else if (this.onGround && this.y - gh < .35) this.y = gh;
    this.pos.y = this.y;
    // collisions
    W.resolveCircle(this.pos, .4);
    for (const v of g.vehicles) {
      const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; if (dx * dx + dz * dz > 16) continue;
      const f = v.fwd, lon = dx * f.x + dz * f.z, lat = dx * f.z - dz * f.x, hl = v.t.L / 2 + .4, hw = v.t.W / 2 + .4;
      if (Math.abs(lon) < hl && Math.abs(lat) < hw) {
        if (v.speed > 6 && v.driver !== 'player' && (this.hitCD || 0) <= 0) { this.hitCD = 1.5; this.pos.x += v.vel.x * .05; this.pos.z += v.vel.z * .05; this.vel.set(v.vel.x * .6, 0, v.vel.z * .6); this.vy = 4; this.onGround = false; AUDIO.thud(); this.mlcCause = 'road traffic accident — pedestrian'; injurePlayerByVehicle(g, v.speed, true); }
        const pl = hl - Math.abs(lon), pw = hw - Math.abs(lat);
        if (pl < pw) { const s = Math.sign(lon); this.pos.x += f.x * s * pl; this.pos.z += f.z * s * pl; }
        else { const s = Math.sign(lat); this.pos.x += f.z * s * pw; this.pos.z += -f.x * s * pw; }
      }
    }
    if (!W.inBounds(this.pos.x, this.pos.z)) this.pos.copy(this.lastValid); else this.lastValid.copy(this.pos);
    // fight: punch (E / left click) and kick (R / right click)
    this.hitCD = (this.hitCD || 0) - dt;
    if (g.state === 'play' && this.punchCD <= 0) {
      if (input.mousePressed()) { this.punchCD = .45; meleeAttack(g, this, 'punch'); }
      else if (input.pressed('KeyR') || input.rightPressed()) { this.punchCD = .8; meleeAttack(g, this, 'kick'); }
    }
    this.h.root.position.set(this.pos.x, this.y, this.pos.z);
    this.h.root.rotation.y = dampAngle(this.h.root.rotation.y, this.facing, 12, dt);
    this.h.setMode(this.crouch ? 'crouch' : limp ? 'limp' : 'idle');
    this.h.update(dt, Math.hypot(this.vel.x, this.vel.z));
  }

  // sit in the driver's seat (visible through the glass / open roof)
  seatIn(v) {
    v.bodyMesh.add(this.h.root);
    this.h.root.position.set(v.seat.x, v.seat.y - (this.h.seatOffset || .55), v.seat.z);
    this.h.root.rotation.set(0, 0, 0);
    this.h.setMode(v.t.body === 'bike' ? 'ride' : 'sit'); this.h.update(0, 0); this.setVisible(true);
  }
  nearestCar() {
    let best = null, bd = 4.2;
    for (const v of this.game.vehicles) {
      if (v.dead || v.removed) continue;
      const d = dist2(v.pos, this.pos) - v.t.L * .25;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  enterCar(v) {
    const g = this.game;
    if (v.driver === 'ai') {
      // carjack: eject the driver
      // pull the driver out: a full pedestrian (health, injuries, AI) who stumbles away and runs
      const f = v.fwd, out = V3(v.pos.x + f.z * 2.2, .25, v.pos.z - f.x * 2.2);
      const ped = g.peds.makePed(g.peds.nearestBlock(out));
      ped.pos.copy(out); ped.vitals.hp -= 6; ped.h.flinch();
      g.peds.flee(ped, v.pos);
      AUDIO.punch();
      if (v.role === 'police') g.crime('copcar', v.pos); else g.crime('carjack', v.pos);
    }
    if (v.role === 'traffic' || v.role === 'parked' || v.role === 'police') v.role = 'abandoned';
    if (v.role === 'parked' && !v.driver) g.crime('theft', v.pos);   // someone else's parked car
    if (v.driverHuman) g.releaseDriver(v);
    v.ai = null; v.driver = 'player'; v.stun = 0; this.car = v;
    this.seatIn(v);
    AUDIO.door();
    g.hud.setCar(v.t.name);
    g.hud.notify(`<b>${v.t.name}</b><br>${v.t.hp} hp &middot; 0-100 km/h ${v.t.t100}s &middot; ${v.t.top} km/h &middot; ${v.t.drive}`, 4);
    g.attachHeadlights(v);
  }
  exitCar(silent) {
    const v = this.car; if (!v) return;
    const f = v.fwd, lx = f.z, lz = -f.x;   // left side
    let p = V3(v.pos.x + lx * (v.t.W / 2 + .9), 0, v.pos.z + lz * (v.t.W / 2 + .9));
    if (this.game.world.pointInBuilding(p.x, 1, p.z)) p = V3(v.pos.x - lx * (v.t.W / 2 + .9), 0, v.pos.z - lz * (v.t.W / 2 + .9));
    this.pos.copy(p); this.lastValid.copy(p); this.y = this.game.world.groundHeight(p.x, p.z);
    this.facing = v.heading; this.h.root.rotation.y = v.heading;
    v.driver = null; v.input.throttle = 0; v.input.brake = 0; v.input.handbrake = true; v.input.steer = 0;
    this.car = null; this.game.scene.add(this.h.root); this.h.setMode('idle'); this.setVisible(true); this.vel.set(0, 0, 0);
    this.h.root.position.set(this.pos.x, this.y, this.pos.z);
    if (!silent) AUDIO.door();
    AUDIO.stopMusic(.6);
    this.game.hud.setCar(null);
    this.game.attachHeadlights(null);
  }
}

class CameraRig {
  constructor(game, camera) {
    this.g = game; this.cam = camera;
    this.yaw = 0; this.pitch = .22; this.idle = 0; this.shake = 0; this.dist = 5.5;
    this.pos = V3(); this.look = V3(); this.fov = 62; this.cinematic = false;
  }
  mouse(dx, dy) {
    this.yaw -= dx * .0025; this.pitch = clamp(this.pitch + dy * .002, -.35, 1.2); this.idle = 0;
  }
  update(dt) {
    const g = this.g, pl = g.player, W = g.world;
    this.idle += dt;
    let target, dist, height, fov;
    if (pl.car) {
      const c = pl.car, sp = c.speed / c.t.maxSpeed;
      if (this.idle > 1.2 && (c.speed > 3 || this.idle > 4)) {
        const want = c.vF < -2 ? c.heading : Math.atan2(c.vel.x, c.vel.z) * (c.speed > 4 ? .5 : 0) + c.heading * (c.speed > 4 ? .5 : 1);
        this.yaw = dampAngle(this.yaw, c.speed > 4 ? lerpAngle(c.heading, Math.atan2(c.vel.x, c.vel.z), .5) : want, 3.2, dt);
        this.pitch = damp(this.pitch, .17, 2, dt);
      }
      target = V3(c.pos.x, c.y + 1.3 + c.t.H * .3, c.pos.z);
      dist = 7.5 + c.t.L * .3 + sp * 3; fov = 64 + sp * 18;
    } else {
      target = V3(pl.pos.x, pl.y + 1.55, pl.pos.z);
      dist = 4.6; fov = 62;
      if (this.idle > 3 && Math.hypot(pl.vel.x, pl.vel.z) > 1) this.yaw = dampAngle(this.yaw, pl.facing, 1.2, dt);
    }
    if (this.cinematic && pl.car) { // low drama cam
      const c = pl.car; this.yaw = dampAngle(this.yaw, c.heading + Math.sin(g.time * .15) * 1.2, 1, dt); this.pitch = damp(this.pitch, .05, 1, dt); dist *= .85;
    }
    this.fov = damp(this.fov, fov, 3, dt);
    const cp = Math.cos(this.pitch), dir = V3(Math.sin(this.yaw) * cp, -Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    // shoulder offset on foot
    const side = pl.car ? 0 : .45, rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
    const tgt = target.clone().add(V3(rx * side, 0, rz * side));
    // collision: shorten when blocked
    let d = dist;
    for (let k = 1; k <= 12; k++) {
      const t = dist * k / 12, x = tgt.x - dir.x * t, y = tgt.y - dir.y * t, z = tgt.z - dir.z * t;
      if (W.pointInBuilding(x, y, z)) { d = Math.max(1.2, t - .6); break; }
    }
    this.dist = d < this.dist ? d : damp(this.dist, d, 4, dt);
    const pos = tgt.clone().addScaledVector(dir, -this.dist);
    const gmin = W.groundHeight(pos.x, pos.z) + .4; if (pos.y < gmin) pos.y = gmin;
    if (this.shake > 0) { const s = this.shake * .35; pos.x += rand(-s, s); pos.y += rand(-s, s); pos.z += rand(-s, s); this.shake = Math.max(0, this.shake - dt * 2); }
    this.cam.position.copy(pos); this.cam.lookAt(tgt);
    this.cam.fov = this.fov; this.cam.updateProjectionMatrix();
  }
  snapBehind() { const pl = this.g.player; this.yaw = pl.car ? pl.car.heading : pl.facing; this.pitch = .2; this.idle = 0; }
}
function lerpAngle(a, b, t) { return a + wrapAngle(b - a) * t; }
