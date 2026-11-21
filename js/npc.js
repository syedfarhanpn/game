'use strict';
// ---------------------------------------------------------------------------
// NPC systems: traffic AI on the real road network (left-hand traffic), pedestrians, police, helicopter,
// and visual effects (explosions, skid marks, muzzle flashes).
// ---------------------------------------------------------------------------
// ---------------- road-following driver on the real Fort Kochi road graph ----------------
// car.ai = { e: edge index, dir: +1 (a->b) or -1, s: metres along the edge in travel direction,
//            nd: the planned next {e, dir}, stuckT, revT, cruise }
function aiNextOptions(W, E, dir) {
  const node = dir > 0 ? E.b : E.a, N = W.rnodes[node], opts = [];
  for (const o of N.edges) {
    if (o === E || !o.car || o.w < 3.5) continue;
    const odir = o.a === node ? 1 : -1;
    if (o.oneway && o.oneway !== odir) continue;      // respect one-way streets
    opts.push({ e: o.i, dir: odir });
  }
  return opts;
}
function aiChoose(ai, prefer) {
  const W = GAME.world, E = W.redges[ai.e], opts = aiNextOptions(W, E, ai.dir);
  if (!opts.length) return { e: ai.e, dir: -ai.dir, uturn: true };   // dead end: turn around
  if (prefer) return prefer(opts, ai);
  const end = W.edgePoint(E, ai.dir > 0 ? E.len : 0), tx = end.tx * ai.dir, tz = end.tz * ai.dir;
  let best = opts[0], bs = -Infinity;
  for (const o of opts) {       // mostly carry on straight / along the bigger road
    const O = W.redges[o.e], st = W.edgePoint(O, o.dir > 0 ? Math.min(6, O.len) : Math.max(0, O.len - 6));
    const sc = (st.tx * o.dir * tx + st.tz * o.dir * tz) * 1.2 + O.w * .08 + Math.random() * 1.4;
    if (sc > bs) { bs = sc; best = o; }
  }
  return best;
}
function relocalize(car, prefer) {
  const W = GAME.world, r = W.nearestRoad(car.pos.x, car.pos.z, true, 60), old = car.ai || {};
  if (!r || r.E.w < 3.5) { car.ai = Object.assign(old, { e: null }); return; }
  const E = r.E, f = car.fwd;
  let dir = (f.x * r.tx + f.z * r.tz) >= 0 ? 1 : -1;
  if (E.oneway) dir = E.oneway;
  car.ai = Object.assign(old, { e: E.i, dir, s: dir > 0 ? r.s : E.len - r.s, stuckT: 0, revT: old.revT || 0 });
  car.ai.nd = aiChoose(car.ai, prefer);
}
function preferToward(target) {
  return opts => {
    const W = GAME.world; let best = opts[0], bd = Infinity;
    for (const o of opts) { const O = W.redges[o.e], n = W.rnodes[o.dir > 0 ? O.b : O.a], d = Math.hypot(n.x - target.x, n.z - target.z) + Math.random() * 6; if (d < bd) { bd = d; best = o; } }
    return best;
  };
}
// the point d metres ahead on the planned path, in the car's lane (keep LEFT, India)
function aiAhead(W, ai, d) {
  let E = W.redges[ai.e], dir = ai.dir;
  if (d > E.len && ai.nd && !ai.nd.uturn) { d -= E.len; E = W.redges[ai.nd.e]; dir = ai.nd.dir; }
  d = Math.min(d, E.len);
  const q = W.edgePoint(E, dir > 0 ? d : E.len - d), tx = q.tx * dir, tz = q.tz * dir, off = E.laneOff + (ai.swerveT > 0 ? ai.swerve : 0);
  return { x: q.x + tz * off, z: q.z - tx * off, tx, tz, E };
}
// shared road-following driver
function aiDrive(car, dt, game, cruise, prefer) {
  const W = game.world;
  let ai = car.ai;
  if (!ai || ai.e == null || !W.redges[ai.e]) { relocalize(car, prefer); ai = car.ai; if (!ai || ai.e == null) { car.input.throttle = 0; car.input.brake = 1; car.input.steer = 0; return; } }
  let E = W.redges[ai.e];
  let pr = W.projectOnEdge(E, car.pos.x, car.pos.z);
  if (pr.d > 22) { relocalize(car, prefer); return; }
  let s = ai.dir > 0 ? pr.s : E.len - pr.s;
  if (s > E.len - 1.2) {           // at the junction: take the planned road
    const nd = ai.nd || aiChoose(ai, prefer);
    ai.e = nd.e; ai.dir = nd.dir; E = W.redges[ai.e];
    ai.nd = aiChoose(ai, prefer);
    pr = W.projectOnEdge(E, car.pos.x, car.pos.z); s = ai.dir > 0 ? pr.s : E.len - pr.s;
  }
  ai.s = s;
  const f = car.fwd, v = Math.max(car.vF, 0), look = clamp(4.5 + v * .55, 5, 17);
  const tgt = aiAhead(W, ai, s + look), dx = tgt.x - car.pos.x, dz = tgt.z - car.pos.z;
  const diff = wrapAngle(Math.atan2(dx, dz) - car.heading);
  const steer = clamp(diff * 2.2, -1, 1);
  // speed for this road class, the bend ahead and how hard we are steering
  const cur = aiAhead(W, ai, s + 1), far = aiAhead(W, ai, s + look + 14);
  const bend = Math.acos(clamp(cur.tx * far.tx + cur.tz * far.tz, -1, 1));
  let target = Math.min(cruise, E.speed * (car.role === 'police' || car.role === 'ambulance' ? 1.9 : 1.15));
  target *= 1 - Math.min(bend, 1.4) * .45;
  target *= 1 - Math.min(Math.abs(diff), 1.2) * .5;
  if (ai.nd && ai.nd.uturn && E.len - s < 14) target = Math.min(target, 3);
  // obstacles
  let block = Infinity, byPlayer = false, parkedAhead = null;
  if (ai.swerveT > 0) ai.swerveT -= dt;
  for (const o of game.vehicles) {
    if (o === car) continue;
    const ox = o.pos.x - car.pos.x, oz = o.pos.z - car.pos.z;
    if (Math.abs(ox) > 20 || Math.abs(oz) > 20) continue;
    const fd = ox * f.x + oz * f.z; if (fd <= 0 || fd > 18) continue;
    const latS = ox * f.z - oz * f.x, lat = Math.abs(latS);          // latS > 0: on our left
    const still = o.speed < .5 && (o.role === 'parked' || o.role === 'abandoned' || o.role === 'owned' || o.dead || !o.driver);
    if (lat > (still ? 1.95 : 2.2)) continue;
    const of = o.fwd; if (of.x * f.x + of.z * f.z < .3 && o.speed > 2) continue;
    if (fd < block) { block = fd; byPlayer = o.driver === 'player'; parkedAhead = still ? latS : null; }
  }
  // pull out around a parked car, then come back into the lane
  if (parkedAhead !== null && E.w >= 5.5) { ai.swerve = clamp(parkedAhead - 2.2 * Math.sign(parkedAhead || 1), -2.6, 2.6); ai.swerveT = 2.4; block = Math.max(block, 11); }
  const pl = game.player;
  if (!pl.car && !pl.dead) {
    const ox = pl.pos.x - car.pos.x, oz = pl.pos.z - car.pos.z, fd = ox * f.x + oz * f.z;
    if (fd > 0 && fd < 14 && Math.abs(ox * f.z - oz * f.x) < 1.8) { if (fd < block) { block = fd; byPlayer = true; } }
  }
  for (const p of game.peds.list) {      // people in front
    if (p.mode === 'down') continue;
    const ox = p.pos.x - car.pos.x, oz = p.pos.z - car.pos.z; if (Math.abs(ox) > 14 || Math.abs(oz) > 14) continue;
    const fd = ox * f.x + oz * f.z; if (fd > 0 && fd < 12 && Math.abs(ox * f.z - oz * f.x) < 1.5 && fd < block) block = fd;
  }
  if (block < Infinity) target = Math.min(target, Math.max(0, (block - 6.5) * 1.3));
  // stuck recovery
  if (ai.revT > 0) { ai.revT -= dt; car.input.throttle = 0; car.input.brake = 1; car.input.steer = -steer; car.input.handbrake = false; return; }
  if (car.vF < .6 && target > 3 && block === Infinity) { ai.stuckT += dt; if (ai.stuckT > 2.5) { ai.revT = 1.3; ai.stuckT = 0; } } else ai.stuckT = 0;
  let th = 0, br = 0;
  if (car.vF < target - .5) th = clamp((target - car.vF) * .35, .25, 1);
  else if (car.vF > target + 1) br = clamp((car.vF - target) * .15, .1, 1);
  if (block < 6) { th = 0; br = 1; }
  if (byPlayer && block < 10 && car.vF < 1) { ai.honkT = (ai.honkT || 0) + dt; if (ai.honkT > 2.5) { ai.honkT = -3; if (dist2(car.pos, game.camera.position) < 40) AUDIO.horn(); } }
  car.input.throttle = th; car.input.brake = br; car.input.steer = steer; car.input.handbrake = false;
}

// ============================ Traffic ============================
class Traffic {
  constructor(game) { this.game = game; this.max = 30; this.parkedMax = 14; this.t = 0; }
  spawnPoint(minD, maxD) {
    const g = this.game, cam = g.camera, dir = V3(); cam.getWorldDirection(dir);
    for (let k = 0; k < 10; k++) {
      const p = g.world.randomRoadPoint(g.focus, minD, maxD); if (!p) continue;
      const tx = p.pos.x - cam.position.x, tz = p.pos.z - cam.position.z, dd = Math.hypot(tx, tz);
      if (!this.prefilling && g.state === 'play' && (tx * dir.x + tz * dir.z) / dd > .3 && dd < 210) continue; // avoid popping in view
      if (g.vehicles.some(v => dist2(v.pos, p.pos) < 9)) continue;
      return p;
    }
    return null;
  }
  // fill the streets at once when play starts (e.g. at the garage on the city edge, where almost every spawn point is in view)
  prefill() { this.prefilling = true; for (let n = 0; n < 60; n++) { this.t = 0; this.update(0); } this.prefilling = false; }
  update(dt) {
    const g = this.game;
    this.t -= dt;
    for (const v of g.vehicles) {
      if ((v.role === 'traffic' || v.role === 'parked' || v.role === 'abandoned') && v !== g.player.car && dist2(v.pos, g.focus) > 330) v.remove();
    }
    if (this.t <= 0) {
      this.t = .15;
      const traffic = g.vehicles.filter(v => v.role === 'traffic' && !v.removed).length;
      const parked = g.vehicles.filter(v => v.role === 'parked' && !v.removed).length;
      if (traffic < this.max) {
        const p = this.spawnPoint(70, 260);
        if (p) {
          const c = g.addVehicle(pickTrafficType(), p.pos, p.heading, 'traffic');
          c.driver = 'ai'; c.ai = Object.assign({ stuckT: 0, revT: 0, cruise: rand(9, 15) }, p.ai);
          c.ai.nd = aiChoose(c.ai); c.vel.set(Math.sin(p.heading) * 6, 0, Math.cos(p.heading) * 6);
        }
      } else if (parked < this.parkedMax) {
        const p = this.spawnPoint(50, 220);
        if (p && p.E.w >= 6) {
          const off = p.E.w / 2 - 1.15 - p.E.laneOff, fx = Math.sin(p.heading), fz = Math.cos(p.heading);
          const pos = p.pos.clone(); pos.x += fz * off; pos.z += -fx * off;   // pulled over on the left kerb
          if (!g.world.resolveCircle(pos.clone(), 1.2)) { const c = g.addVehicle(pickTrafficType(), pos, p.heading, 'parked'); c.driver = null; }
        }
      }
    }
    for (const v of g.vehicles) {
      if (v.role !== 'traffic' || !v.ai || v.dead) continue;
      if (v.stun > 0) { v.input.throttle = 0; v.input.brake = .5; v.input.steer = 0; continue; }
      const panic = g.police.wanted >= 3 && dist2(v.pos, g.player.pos) < 40;
      aiDrive(v, dt, g, panic ? v.ai.cruise * 1.6 : v.ai.cruise);
    }
  }
}

// ============================ Pedestrians ============================
class Peds {
  constructor(game) { this.game = game; this.list = []; this.max = 28; this.t = 0; this.brawlT = 20; }
  prefill() { for (let i = 0; i < 40 && this.list.filter(p => !p.cop).length < this.max; i++) this.spawn(); }
  // walking path = one side of a real street or a footpath: b = { e: edge index, side: +1 left of a->b, -1 right }
  pathOff(E, side) { return E.car ? side * (E.w / 2 + .75) : side * .45; }
  ringPos(b, s) {
    const W = this.game.world, E = W.redges[b.e], q = W.edgePoint(E, s), off = this.pathOff(E, b.side);
    let x = q.x + q.tz * off, z = q.z - q.tx * off;
    if (E.car && W.pointInBuilding(x, 1, z)) { const o2 = b.side * (E.w / 2 - .45); x = q.x + q.tz * o2; z = q.z - q.tx * o2; }   // no pavement: walk at the road edge
    return [x, z, q.tx, q.tz];
  }
  ringProject(b, x, z) { const W = this.game.world; return W.projectOnEdge(W.redges[b.e], x, z).s; }
  makePed(b, opts = {}) {
    const g = this.game, h = makeHuman(opts.look || {});
    g.scene.add(h.root);
    const p = { h, b, s: rand(0, g.world.redges[b.e].len), dirS: Math.random() < .5 ? 1 : -1, speed: rand(1.1, 1.7), mode: 'walk', t: rand(4, 14), pos: V3(), vel: V3(), vy: 0, heading: 0,
      alive: true, downT: 0, vitals: newVitals(), aggression: Math.random(), atkCD: 0, target: null, cop: !!opts.cop };
    this.list.push(p); return p;
  }
  nearestBlock(pos) {
    const W = this.game.world, r = W.nearestRoad(pos.x, pos.z, false, 60);
    if (r) return { e: r.E.i, side: r.lat >= 0 ? 1 : -1 };
    return { e: pick(W.redges).i, side: 1 };
  }
  spawn() {
    const g = this.game, q = g.world.randomWalkEdge(g.focus, 35, 150); if (!q) return;
    const p = this.makePed({ e: q.E.i, side: Math.random() < .5 ? 1 : -1 }); p.s = q.s; this.place(p);
  }
  // a police officer on foot (khaki uniform), coming to arrest the player
  spawnOfficer(pos) {
    const g = this.game, b = this.nearestBlock(pos);
    const p = this.makePed(b, { look: { kind: 'police' }, cop: true });
    p.pos.copy(pos); p.mode = 'arrest'; p.speed = 4.2; p.aggression = 1; p.target = g.player;
    return p;
  }
  // walk along the path; at a junction carry on into another street, staying on the same side of travel
  place(p) {
    const W = this.game.world; let E = W.redges[p.b.e];
    if (p.s < 0 || p.s > E.len) {
      const node = p.s > E.len ? E.b : E.a, N = W.rnodes[node], opts = N.edges.filter(o => o !== E && o.len > 2), side = p.b.side * p.dirS;
      if (opts.length) { const o = pick(opts), od = o.a === node ? 1 : -1; p.b = { e: o.i, side: side * od }; p.dirS = od; p.s = od > 0 ? .01 : o.len - .01; }
      else { p.dirS = -p.dirS; p.s = clamp(p.s, 0, E.len); }   // dead end: turn back
    }
    const [x, z, tx, tz] = this.ringPos(p.b, p.s);
    p.pos.set(x, 0, z); p.heading = Math.atan2(tx * p.dirS, tz * p.dirS);
  }
  remove(p) { this.game.scene.remove(p.h.root); p.removed = true; }
  scare(pos, r) {
    for (const p of this.list) {
      if (p.mode === 'down' || p.cop || p.mode === 'fight' || dist2(p.pos, pos) > r) continue;
      this.flee(p, pos);
    }
  }
  flee(p, from) {
    p.mode = 'flee'; p.t = rand(6, 10); p.speed = rand(4, 5.5); p.target = null;
    p.b = this.nearestBlock(p.pos); p.s = this.ringProject(p.b, p.pos.x, p.pos.z);
    const [, , tx, tz] = this.ringPos(p.b, p.s);
    p.dirS = ((p.pos.x - from.x) * tx + (p.pos.z - from.z) * tz) >= 0 ? 1 : -1;
    p.h.setMode('idle');
  }
  knockDown(p) {
    p.mode = 'down'; p.downT = 0; p.h.setMode('down'); p.vitals.conscious = false;
    if (dist2(p.pos, this.game.focus) < 160) this.game.medical.requestAmbulance(p);
  }
  // struck by a vehicle
  knock(p, vx, vz, byPlayer) {
    if (p.mode === 'down') return;
    const sp = Math.hypot(vx, vz) / 1.1, inj = vehicleInjuries(sp, true);
    inj.forEach(k => addInjury(p.vitals, k)); p.vitals.hp -= sp * 3.5;
    p.vel.set(vx, 0, vz); p.vy = Math.min(9, Math.hypot(vx, vz) * .35 + 2);
    AUDIO.thud(); this.knockDown(p);
    this.scare(p.pos, 25);
    if (byPlayer) {
      this.game.law.report(inj.some(k => GRIEVOUS.has(k)) ? 'hit_ped_grievous' : 'hit_ped', p.pos);
      if (p.vitals.hp > 0) this.game.hud.notify('You hit a pedestrian. A <b>108 ambulance</b> has been called. Leaving the scene is an offence (MV Act Sec. 134).', 4);
    }
  }
  // hit in a fight
  onHit(p, att, ko) {
    if (ko) { this.knockDown(p); return; }
    if (p.cop) { if (att.isPlayer) { this.game.law.report('assault_police', p.pos); p.lathi = true; } p.target = att; p.mode = 'arrest'; return; }
    if (p.mode === 'fight' && p.target === att) return;
    if (p.aggression > .5 && p.vitals.hp > 35) { p.mode = 'fight'; p.target = att; p.t = 25; p.h.setMode('guard'); }
    else this.flee(p, att.pos);
  }
  // free movement toward a target (fighting / arresting)
  chaseStep(p, tgt, dt, speed) {
    const dx = tgt.pos.x - p.pos.x, dz = tgt.pos.z - p.pos.z, d = Math.hypot(dx, dz);
    p.heading = Math.atan2(dx, dz);
    if (d > 1.1) { const s = Math.min(speed, (d - 1) * 4); p.pos.x += dx / d * s * dt; p.pos.z += dz / d * s * dt; p.curSpeed = s; } else p.curSpeed = 0;
    this.game.world.resolveCircle(p.pos, .4);
    p.pos.y = this.game.world.groundHeight(p.pos.x, p.pos.z);
    return d;
  }
  update(dt) {
    const g = this.game, pl = g.player;
    this.t -= dt;
    if (this.t <= 0) { this.t = .3; if (this.list.filter(p => !p.cop).length < this.max) this.spawn(); }
    // occasional street fight between two pedestrians
    this.brawlT -= dt;
    if (this.brawlT <= 0) {
      this.brawlT = rand(35, 70);
      const c = this.list.filter(p => !p.cop && (p.mode === 'walk' || p.mode === 'idle') && dist2(p.pos, g.focus) < 70);
      for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if (dist2(c[i].pos, c[j].pos) < 12) {
        const a = c[i], b = c[j]; a.mode = b.mode = 'fight'; a.target = b; b.target = a; a.t = b.t = 25; a.h.setMode('guard'); b.h.setMode('guard');
        if (Math.random() < .5) g.hud.notify('A street fight has broken out nearby.', 3);
        i = c.length; break;
      }
    }
    for (const p of this.list) {
      if (p.removed) continue;
      if (!p.vitals) p.vitals = newVitals();          // never let one malformed person crash the game loop
      const far = dist2(p.pos, g.focus);
      if (far > 190 || (p.mode === 'down' && !p.ambulance && p.downT > 90)) { this.remove(p); continue; }
      tickInjuries(g, p.vitals, dt, false);
      p.atkCD -= dt; p.curSpeed = 0;
      if (p.mode === 'down') {
        p.downT += dt;
        if (!p.ambulance && p.vitals.hp <= 40 && far < 160 && (p.recallT = (p.recallT || 0) - dt) <= 0) { p.recallT = 10; g.medical.requestAmbulance(p); }
        p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt; p.vel.multiplyScalar(Math.exp(-2 * dt));
        p.vy -= 22 * dt; p.pos.y += p.vy * dt;
        const gh = g.world.groundHeight(p.pos.x, p.pos.z); if (p.pos.y < gh) { p.pos.y = gh; p.vy = 0; p.vel.multiplyScalar(.7); }
        g.world.resolveCircle(p.pos, .4);
      } else if (p.mode === 'fight' || p.mode === 'arrest') {
        const tgt = p.target, tgtGone = !tgt || tgt.removed || (tgt.vitals && tgt.vitals.hp <= 0) || (tgt.isPlayer && (pl.car || pl.dead)) || tgt.mode === 'down';
        p.t -= dt;
        if (tgtGone || p.t <= 0 || (p.mode === 'fight' && p.vitals.hp < 25)) {
          if (p.cop) { this.remove(p); continue; }
          if (p.vitals.hp < 25 && tgt && !tgtGone) this.flee(p, tgt.pos);
          else { p.mode = 'walk'; p.target = null; p.h.setMode('idle'); p.b = this.nearestBlock(p.pos); p.s = this.ringProject(p.b, p.pos.x, p.pos.z); }
        } else {
          const d = this.chaseStep(p, tgt, dt, p.mode === 'arrest' ? 4.6 : 3.2);
          if (p.mode === 'arrest' && tgt.isPlayer) {
            if (d < 1.4) { p.cuffT = (p.cuffT || 0) + dt; if (p.cuffT > 1.6) { p.cuffT = 0; g.onBusted(); } } else p.cuffT = 0;
            if (p.lathi && d < 1.5 && p.atkCD <= 0) { p.atkCD = 1.1; meleeAttack(g, p, 'kick'); }
          } else if (d < 1.45 && p.atkCD <= 0) { p.atkCD = rand(.7, 1.3); meleeAttack(g, p, Math.random() < .3 ? 'kick' : 'punch'); }
        }
      } else {
        p.t -= dt;
        if (p.mode === 'walk' || p.mode === 'flee') {
          p.s += p.dirS * p.speed * dt; this.place(p); p.curSpeed = p.speed;
          if (p.t <= 0) {
            if (p.mode === 'flee') { p.mode = 'walk'; p.speed = rand(1.1, 1.7); p.t = rand(5, 12); }
            else if (Math.random() < .35) { p.mode = 'idle'; p.t = rand(2, 6); p.h.setMode('idle'); }
            else { p.t = rand(4, 12); if (Math.random() < .3) p.dirS *= -1; }
          }
        } else if (p.mode === 'idle' && p.t <= 0) { p.mode = 'walk'; p.t = rand(5, 12); }
        if (hasEffect(p.vitals, 'limp')) p.speed = Math.min(p.speed, .8);
        if (g.police.wanted >= 2 && p.mode !== 'flee' && dist2(p.pos, pl.pos) < 18) this.scare(pl.pos, 18);
      }
      // cars hitting people
      if (p.mode !== 'down') for (const v of g.vehicles) {
        if (v.speed < 3.5) continue;
        const dx = p.pos.x - v.pos.x, dz = p.pos.z - v.pos.z; if (dx * dx + dz * dz > 16) continue;
        const f = v.fwd, lon = dx * f.x + dz * f.z, lat = Math.abs(dx * f.z - dz * f.x);
        if (Math.abs(lon) < v.t.L / 2 + .3 && lat < v.t.W / 2 + .3) { this.knock(p, v.vel.x * 1.1, v.vel.z * 1.1, v.driver === 'player'); v.vel.multiplyScalar(1 - 80 / v.ph.m); break; }
        if (v.speed > 8 && Math.abs(lon) < 9 && lon > 0 && lat < 3 && p.mode === 'walk') this.scare(p.pos, 4);
      }
      // people don't walk through the player
      if (!pl.car && p.mode !== 'down') {
        const dx = p.pos.x - pl.pos.x, dz = p.pos.z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d < .7 && d > 1e-3) { p.pos.x += dx / d * (.7 - d); p.pos.z += dz / d * (.7 - d); }
      }
      // speech: people react in Malayalam / English
      p.barkT = (p.barkT || rand(2, 12)) - dt;
      if (p.barkT <= 0 && far < 7 && p.mode !== 'down' && g.state === 'play') {
        p.barkT = rand(14, 30);
        const lines = p.mode === 'flee' ? (g.police.wanted ? ['Police varunnundu!', 'Odikko!', "Let's get out of here!"] : ['Ayyo!', 'Odikko!', "Let's get out of here!"])
          : p.mode === 'fight' ? ['Nee aara?!', 'Vaa, kaanikkam!', 'Back off!'] : pl.car ? ['Chetta, car onnu side-il idamo?', 'Bro, nice car!', 'Adipoli vandi!', 'Pathukke po, chetta!']
          : ['Eda, evideya pokunne?', 'Chetta, entha vishesham?', 'Namaskaram!', 'Hello bro!', 'Chaaya kudicho?'];
        if (Math.random() < .7) g.hud.bark(pick(lines), p);
      }
      p.h.root.position.copy(p.pos);
      if (p.mode !== 'down') p.h.root.rotation.y = dampAngle(p.h.root.rotation.y, p.heading, 10, dt);
      p.h.root.visible = far < 110;
      const sh = far < 28; if (p.sh !== sh) { p.sh = sh; p.h.root.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }   // only nearby people cast shadows
      p.animAcc = (p.animAcc || 0) + dt;
      const every = far < 45 ? 0 : far < 90 ? 1 / 20 : 1 / 8;          // animation rate drops with distance
      if (far < 140 && p.animAcc >= every) { p.h.update(p.animAcc, p.mode === 'idle' ? 0 : (p.mode === 'fight' || p.mode === 'arrest') ? p.curSpeed : p.speed); p.animAcc = 0; }
    }
    this.list = this.list.filter(p => !p.removed);
  }
}

// ============================ Police ============================
class Police {
  constructor(game) { this.game = game; this.wanted = 0; this.unseen = 0; this.spawnT = 0; this.bustT = 0; this.heli = null; this.searching = false; }
  get cops() { return this.game.vehicles.filter(v => v.role === 'police' && !v.removed); }
  setWanted(n, quiet) {
    n = clamp(n, 0, 5);
    if (n > this.wanted && !quiet) AUDIO.star();
    if (n === 0 && this.wanted > 0 && !quiet) { this.game.hud.notify('You lost the cops.'); }
    this.wanted = n; this.unseen = 0;
    this.game.hud.setWanted(n, false);
  }
  update(dt) {
    const g = this.game, pl = g.player, target = pl.car ? pl.car.pos : pl.pos, tvel = pl.car ? pl.car.vel : pl.vel;
    const cops = this.cops, W = this.wanted;
    const want = [0, 1, 2, 3, 5, 7][W];
    this.spawnT -= dt;
    if (cops.filter(c => !c.dead).length < want && this.spawnT <= 0) {
      this.spawnT = 2.2;
      const p = g.world.randomRoadPoint(target, 100, 180);
      if (p) {
        const c = g.addVehicle('police', p.pos, p.heading, 'police'); c.driver = 'ai';
        c.ai = Object.assign({ stuckT: 0, revT: 0 }, p.ai); c.ai.nd = aiChoose(c.ai, preferToward(target));
        c.vel.set(Math.sin(p.heading) * 15, 0, Math.cos(p.heading) * 15);
      }
    }
    let seen = false, nearest = Infinity, bustNear = 0;
    for (const c of cops) {
      if (c.dead) { if (dist2(c.pos, g.focus) > 200) c.remove(); continue; }
      const d = dist2(c.pos, target);
      nearest = Math.min(nearest, d);
      if (W === 0) {
        c.sirenOn = false;
        if (!c.ai || c.mode === 'direct') { relocalize(c); c.mode = 'road'; }
        aiDrive(c, dt, g, 13);
        if (d > 160) c.remove();
        continue;
      }
      c.sirenOn = true;
      if (d < 90) seen = true;
      if (c.stun > 0) { c.input.throttle = 0; c.input.brake = 0; continue; }
      if (d > 50) {
        if (c.mode === 'direct') { relocalize(c, preferToward(target)); c.mode = 'road'; }
        aiDrive(c, dt, g, 34, preferToward(target));
      } else { c.mode = 'direct'; this.chase(c, dt, target, tvel, d); }
      // loudspeaker: "Vandi side-aakku!" (pull over)
      if (pl.car && d < 45 && (c.shoutT = (c.shoutT || 2) - dt) <= 0) { c.shoutT = rand(6, 9); VOICE.shout('Vandi side-aakku!', c.pos); }
      // Kerala Police: officers get out and arrest on foot (no shooting)
      if (!pl.car && W >= 1 && d < 22 && c.speed < 2 && !c.officers) {
        c.officers = 1 + (W >= 3 ? 1 : 0); VOICE.shout('Nilkku! Police!', c.pos);
        const f = c.fwd;
        for (let k = 0; k < c.officers; k++) g.peds.spawnOfficer(V3(c.pos.x + f.z * (1.6 + k), .25, c.pos.z - f.x * (1.6 + k)));
        if (!this._footNote) { this._footNote = true; g.hud.notify('Police officers are coming to arrest you. Resisting or hitting them is a serious offence (BNS 121).', 5); }
      }
      if (d < (pl.car ? 9 : 6) && c.speed < 3) bustNear++;
    }
    // busted logic
    const pSpeed = pl.car ? pl.car.speed : Math.hypot(pl.vel.x, pl.vel.z);
    if (W > 0 && bustNear >= (pl.car ? 2 : 1) && pSpeed < (pl.car ? 1.2 : 1.8)) { this.bustT += dt; if (this.bustT > (pl.car ? 3 : 2)) { this.bustT = 0; g.onBusted(); } }
    else this.bustT = Math.max(0, this.bustT - dt);
    // heli
    // (Kerala Police do not use pursuit helicopters)
    if (this.heli) { this.heli.update(dt, target, W >= 4); if (this.heli.gone) this.heli = null; else if (W >= 4 && dist2(this.heli.pos, target) < 150) seen = true; }
    // evasion
    if (W > 0) {
      if (seen) this.unseen = 0; else this.unseen += dt;
      const need = 8 + W * 2.5;
      this.searching = this.unseen > .7;
      g.hud.setWanted(W, this.searching);
      if (this.unseen > need) this.setWanted(0);
    }
    AUDIO.siren(W > 0 && nearest < 150 ? 1 - nearest / 150 : 0);
    AUDIO.rotor(this.heli ? clamp(1 - dist2(this.heli.pos, g.camera.position) / 200, 0, 1) : 0);
  }
  chase(c, dt, target, tvel, d) {
    const g = this.game, lead = clamp(d / 25, 0, 1);
    const tx = target.x + tvel.x * .6 * lead, tz = target.z + tvel.z * .6 * lead;
    const dx = tx - c.pos.x, dz = tz - c.pos.z, f = c.fwd;
    let diff = wrapAngle(Math.atan2(dx, dz) - c.heading);
    // feelers
    const probe = (ang, len) => { const a = c.heading + ang; return g.world.pointInBuilding(c.pos.x + Math.sin(a) * len, 1, c.pos.z + Math.cos(a) * len); };
    if (c.speed > 4 && probe(0, 8)) { const l = probe(.6, 7), r = probe(-.6, 7); diff += (!l && r) ? 1.2 : (l && !r) ? -1.2 : 1.5; }
    if (c.ai.revT > 0) { c.ai.revT -= dt; c.input.throttle = 0; c.input.brake = 1; c.input.steer = -Math.sign(diff); return; }
    const steer = clamp(diff * 2.6, -1, 1);
    let th = d > 14 ? 1 : d > 8 ? .45 : 0, br = d < 7 && c.vF > 3 ? 1 : 0;
    if (Math.abs(diff) > 1.9 && d < 25) { th = 0; br = 1; c.input.steer = -steer; }
    else c.input.steer = steer;
    c.input.throttle = th; c.input.brake = br; c.input.handbrake = Math.abs(diff) > 1.1 && c.speed > 14;
    if (c.speed < .8 && th > 0) { c.ai.stuckT += dt; if (c.ai.stuckT > 1.4) { c.ai.revT = 1.1; c.ai.stuckT = 0; } } else c.ai.stuckT = 0;
  }
  clear() {
    for (const c of this.cops) c.remove();
    if (this.heli) { this.heli.remove(); this.heli = null; }
    this.wanted = 0; this.unseen = 0; this.game.hud.setWanted(0, false);
  }
}

class Heli {
  constructor(g) {
    this.g = g; this.gone = false;
    const m = this.mesh = new THREE.Group();
    const bodyM = stdMat('#1d2a5c', { metalness: .4, roughness: .4 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), bodyM); body.scale.set(1, .9, 1.7); m.add(body);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), GLASS_MAT || stdMat('#111')); glass.position.set(0, .3, 1.4); glass.scale.set(1, .8, .9); m.add(glass);
    const tail = new THREE.Mesh(boxGeo(.35, .35, 5.5), bodyM); tail.position.set(0, .3, -4); m.add(tail);
    const fin = new THREE.Mesh(boxGeo(.1, 1.4, .8), bodyM); fin.position.set(0, .9, -6.6); m.add(fin);
    this.rotor = new THREE.Mesh(boxGeo(11, .06, .35), stdMat('#111')); this.rotor.position.y = 1.7; m.add(this.rotor);
    this.rotor2 = new THREE.Mesh(boxGeo(.35, .06, 11), stdMat('#111')); this.rotor.add(this.rotor2);
    this.trot = new THREE.Mesh(boxGeo(.06, 1.8, .2), stdMat('#111')); this.trot.position.set(.25, .9, -6.6); m.add(this.trot);
    for (const s of [-1, 1]) { const sk = new THREE.Mesh(boxGeo(.1, .1, 3.4), stdMat('#222')); sk.position.set(s * 1.1, -1.5, 0); m.add(sk); }
    this.blink = new THREE.Mesh(new THREE.SphereGeometry(.15, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0, 0), toneMapped: false })); this.blink.position.set(0, -1, -2); m.add(this.blink);
    m.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.spot = g.heliSpot; this.spotTarget = g.heliTarget;
    const t = g.focus; this.pos = V3(t.x + 200, 60, t.z + 120); this.vel = V3(); this.ang = 0;
    g.scene.add(m);
  }
  update(dt, target, active) {
    this.ang += dt * .25;
    const goal = active ? V3(target.x + Math.cos(this.ang) * 30, 42, target.z + Math.sin(this.ang) * 30) : V3(this.pos.x + 300, 160, this.pos.z + 300);
    const d = goal.clone().sub(this.pos), want = d.clone().clampLength(0, 36);
    this.vel.lerp(want, 1 - Math.exp(-1.2 * dt));
    this.pos.addScaledVector(this.vel, dt);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    this.mesh.rotation.x = clamp(this.vel.length() * .01, 0, .25);
    this.rotor.rotation.y += dt * 40; this.trot.rotation.x += dt * 50;
    this.blink.visible = Math.sin(this.g.time * 8) > .5;
    this.spot.intensity = active ? 2 + this.g.world.night * 10 : 0;
    this.spot.position.copy(this.pos).add(V3(0, -1.6, 0));
    this.spotTarget.position.copy(target);
    if (!active && this.pos.y > 150) { this.remove(); }
  }
  remove() { this.g.scene.remove(this.mesh); this.spot.intensity = 0; this.gone = true; }
}

// ============================ Effects ============================
class Effects {
  constructor(game) {
    this.g = game; this.items = [];
    const sg = new THREE.PlaneGeometry(.35, 1.1); sg.rotateX(-Math.PI / 2);
    this.skidMax = 700; this.skidIdx = 0;
    this.skids = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), this.skidMax);
    const M = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.skidMax; i++) this.skids.setMatrixAt(i, M);
    this.skids.frustumCulled = false; game.scene.add(this.skids);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = V3(1, 1, 1);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 25, 2); game.scene.add(this.flashLight);
    this.boomLight = new THREE.PointLight(0xff8a30, 0, 70, 2); game.scene.add(this.boomLight);
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: .6, depthWrite: false });
  }
  skid(x, y, z, h) {
    this._e.set(0, h, 0); this._q.setFromEuler(this._e);
    this._m.compose(V3(x, y + .04, z), this._q, this._s);
    this.skids.setMatrixAt(this.skidIdx, this._m); this.skidIdx = (this.skidIdx + 1) % this.skidMax;
    this.skids.instanceMatrix.needsUpdate = true;
  }
  flash(pos) { this.flashLight.position.copy(pos); this.flashLight.intensity = 6; }
  explosion(pos) {
    AUDIO.explosion();
    const g = this.g;
    const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, .3), toneMapped: false, transparent: true }));
    fire.position.copy(pos); g.scene.add(fire);
    const light = this.boomLight; light.position.copy(pos);
    this.items.push({ t: 0, life: 1.2, upd: (it, k) => { fire.scale.setScalar(1 + k * 7); fire.material.opacity = 1 - k; light.intensity = 30 * (1 - k); }, done: () => { g.scene.remove(fire); light.intensity = 0; } });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), this.smokeMat.clone());
      s.position.copy(pos).add(V3(rand(-2, 2), rand(0, 2), rand(-2, 2))); g.scene.add(s);
      const v = V3(rand(-2, 2), rand(3, 7), rand(-2, 2));
      this.items.push({ t: 0, life: rand(3, 5), upd: (it, k, dt) => { s.position.addScaledVector(v, dt); s.scale.setScalar(1 + k * 5); s.material.opacity = .6 * (1 - k); }, done: () => g.scene.remove(s) });
    }
    if (dist2(pos, g.camera.position) < 60) g.camRig.shake = 1;
    g.peds.scare(pos, 50);
    for (const v of g.vehicles) { const d = dist2(v.pos, pos); if (d < 10 && d > .1) { v.vel.x += (v.pos.x - pos.x) / d * 12; v.vel.z += (v.pos.z - pos.z) / d * 12; v.damage(200 / (d + 1)); } }
    if (!g.player.car && dist2(g.player.pos, pos) < 8) g.player.hurt(50, 'explosion');
  }
  update(dt) {
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 60);
    for (const it of this.items) { it.t += dt; const k = Math.min(it.t / it.life, 1); it.upd(it, k, dt); if (k >= 1) { it.done(); it.dead = true; } }
    this.items = this.items.filter(i => !i.dead);
  }
}
