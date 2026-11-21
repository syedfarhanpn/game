'use strict';
// ---------------------------------------------------------------------------
// Vehicles: procedural car models + arcade drift physics.
// Heading convention: forward = (sin h, 0, cos h). right = (-cos h, 0, sin h)
// ---------------------------------------------------------------------------
const PROFILES = {
  sport: { body: [[-.5, .22], [.5, .22], [.5, .4], [.14, .52], [-.5, .56]], cabin: [[-.36, .5], [.16, .5], [-.04, .97], [-.27, .97]] },
  sedan: { body: [[-.5, .25], [.5, .25], [.5, .5], [.26, .56], [-.5, .58]], cabin: [[-.33, .55], [.24, .55], [.09, 1], [-.22, 1]] },
  suv: { body: [[-.5, .27], [.5, .27], [.5, .52], [.32, .58], [-.5, .6]], cabin: [[-.48, .57], [.3, .57], [.18, 1], [-.47, 1]] },
  muscle: { body: [[-.5, .24], [.5, .24], [.5, .47], [.12, .55], [-.5, .58]], cabin: [[-.32, .54], [.1, .54], [-.04, .96], [-.25, .96]] },
  van: { body: [[-.5, .22], [.5, .22], [.5, .5], [.4, .56], [-.5, .56]], cabin: [[-.5, .54], [.4, .54], [.3, 1], [-.5, 1]] },
  hatch: { body: [[-.5, .25], [.5, .25], [.5, .5], [.3, .56], [-.5, .6]], cabin: [[-.47, .57], [.27, .55], [.1, 1], [-.42, 1]] },
  wagon: { body: [[-.5, .25], [.5, .25], [.5, .5], [.26, .56], [-.5, .59]], cabin: [[-.48, .56], [.24, .55], [.09, 1], [-.46, 1]] },
  pickup: { body: [[-.5, .3], [.5, .3], [.5, .55], [.3, .6], [-.5, .62]], cabin: [[-.12, .58], [.28, .58], [.16, 1], [-.1, 1]] },
};
const CAR_TYPES = buildCarTypes();   // 200+ real cars, see cardb.js
const CAR_COLORS = ['#e9e9e9', '#c0c3c7', '#1b1c1e', '#55585d', '#1f2f4f', '#8a0f18', '#2b5a8a', '#f2f2f0', '#8b8f94', '#3a4a3a', '#b8a27a', '#0f3d3e', '#c9302c', '#e6b422', '#2e86c1', '#ff5a1f'];

const _carGeoCache = {};
let GLASS_MAT, HEAD_MAT, TAIL_MAT, TIRE_MAT, RIM_MAT, DARK_MAT;
function carMaterials() {
  if (GLASS_MAT) return;
  GLASS_MAT = new THREE.MeshPhysicalMaterial({ color: col('#3a4856'), roughness: .05, metalness: .1, clearcoat: 1, transparent: true, opacity: .55, depthWrite: false, envMap: carEnv(), envMapIntensity: .8 });
  HEAD_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, .95), toneMapped: false });
  TAIL_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(.8, .02, .02), toneMapped: false });
  TIRE_MAT = new THREE.MeshStandardMaterial({ color: col('#151515'), roughness: .9 });
  RIM_MAT = new THREE.MeshStandardMaterial({ color: col('#9aa0a6'), roughness: .25, metalness: .9, envMap: carEnv() });
  DARK_MAT = new THREE.MeshStandardMaterial({ color: col('#111'), roughness: .6 });
}

// ---------------------------------------------------------------------------
// Real car model (models/ferrari.glb - Ferrari 458 Italia by vicent091036,
// CC-BY 4.0, via the three.js examples). Used for nearby cars; distant cars
// fall back to the light procedural mesh above (the model is ~359k triangles).
// ---------------------------------------------------------------------------
let CAR_ENV = null, CAR_ENV_FACES = null;
function hexOf(c) { return '#' + c.clone().convertLinearToSRGB().getHexString(); }
function carEnv() {
  if (CAR_ENV) return CAR_ENV;
  CAR_ENV_FACES = [];
  for (let i = 0; i < 6; i++) { const c = document.createElement('canvas'); c.width = c.height = 128; CAR_ENV_FACES.push(c); }
  CAR_ENV = new THREE.CubeTexture(CAR_ENV_FACES); CAR_ENV.encoding = THREE.sRGBEncoding;
  updateCarEnv(col('#2a78d6'), col('#c4e3ff'), 0);
  return CAR_ENV;
}
// redraw the reflection cube so paint reflects the current sky + a skyline
function updateCarEnv(top, hor, night) {
  if (!CAR_ENV_FACES) return;
  const T = hexOf(top), Hh = hexOf(hor), G = hexOf(hor.clone().multiplyScalar(.12)), G2 = '#0b0c0f';
  CAR_ENV_FACES.forEach((c, i) => {
    const g = c.getContext('2d'), S = 128, R = mulberry32(77 + i);
    if (i === 2) { g.fillStyle = T; g.fillRect(0, 0, S, S); const rg = g.createRadialGradient(64, 64, 4, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,' + (.35 * (1 - night)) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, S, S); return; }
    if (i === 3) { g.fillStyle = G2; g.fillRect(0, 0, S, S); return; }
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, T); gr.addColorStop(.48, Hh); gr.addColorStop(.52, G); gr.addColorStop(1, G2);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // soft studio-like highlight band (gives paint a crisp reflection line)
    g.fillStyle = 'rgba(255,255,255,' + (.22 * (1 - night) + .05) + ')'; g.fillRect(0, 30, S, 5);
    // skyline silhouette with lit windows at night
    for (let x = 0; x < S;) {
      const w = 6 + R() * 14, h = 6 + R() * 22; g.fillStyle = 'rgba(20,22,28,' + (.75 + .2 * night) + ')'; g.fillRect(x, 64 - h, w, h);
      if (night > .2) { g.fillStyle = 'rgba(255,210,140,' + (night * .9) + ')'; for (let k = 0; k < 6; k++) g.fillRect(x + R() * (w - 2), 64 - R() * h, 1.5, 1.5); }
      x += w + R() * 3;
    }
  });
  CAR_ENV.needsUpdate = true;
}


function extrudeProfile(pts, L, H, depth) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => i ? s.lineTo(p[0] * L, p[1] * H) : s.moveTo(p[0] * L, p[1] * H));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 2, curveSegments: 1 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  return g;
}
function buildCarMesh(type, colorHex) {
  carMaterials();
  const t = CAR_TYPES[type], P = PROFILES[t.profile];
  if (!_carGeoCache[type]) _carGeoCache[type] = { body: extrudeProfile(P.body, t.L, t.H, t.W - .14), cabin: extrudeProfile(P.cabin, t.L, t.H, t.W - .4) };
  const G = _carGeoCache[type];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: col(colorHex), metalness: .3, roughness: .34, clearcoat: 1, clearcoatRoughness: .07, envMap: carEnv(), envMapIntensity: .75 });
  const low = [];
  const bm = new THREE.Mesh(G.body, paint); bm.castShadow = true; body.add(bm); low.push(bm);
  const cm = new THREE.Mesh(G.cabin, t.profile === 'van' ? paint : GLASS_MAT); cm.castShadow = true; body.add(cm); low.push(cm);
  // body-coloured roof panel over the glasshouse
  if (t.profile !== 'van') {
    const rf = P.cabin[3][0], rb = P.cabin[2][0];
    const roof = new THREE.Mesh(boxGeo(t.W - .5, .07, Math.abs(rb - rf) * t.L + .12), paint);
    roof.position.set(0, t.H + .04, (rf + rb) / 2 * t.L); roof.castShadow = true; body.add(roof); low.push(roof);
  }
  if (t.profile === 'van') { const ws = new THREE.Mesh(boxGeo(t.W - .3, t.H * .3, .1), GLASS_MAT); ws.position.set(0, t.H * .78, t.L * .38); ws.rotation.x = -.35; body.add(ws); }
  // lights
  const hy = t.H * (t.profile === 'sport' ? .36 : .44), fz = t.L / 2 + .02;
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(boxGeo(.42, .12, .06), HEAD_MAT); h.position.set(s * t.W * .33, hy, fz); body.add(h); low.push(h);
    const tl = new THREE.Mesh(boxGeo(.46, .12, .06), TAIL_MAT); tl.position.set(s * t.W * .33, t.H * .48, -fz); body.add(tl); low.push(tl);
  }
  const grille = new THREE.Mesh(boxGeo(t.W * .4, .14, .05), DARK_MAT); grille.position.set(0, hy - .05, fz); body.add(grille); low.push(grille);
  let lightbar = null;
  if (type === 'police' || type === 'ambulance') {
    const stripe = new THREE.Mesh(boxGeo(t.W + .02, .22, t.L * .7), stdMat(type === 'ambulance' ? '#d61f26' : '#1b3f8f')); stripe.position.set(0, t.H * .42, 0); body.add(stripe); low.push(stripe);
    const base = new THREE.Mesh(boxGeo(1.2, .1, .3), DARK_MAT); base.position.set(0, t.H + .05, -.1); body.add(base);
    const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0, 0), toneMapped: false });
    const blue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, .2, 3), toneMapped: false });
    const r = new THREE.Mesh(boxGeo(.5, .14, .25), red); r.position.set(-.3, t.H + .15, -.1); body.add(r);
    const b = new THREE.Mesh(boxGeo(.5, .14, .25), blue); b.position.set(.3, t.H + .15, -.1); body.add(b);
    lightbar = { red, blue };
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(boxGeo(.8, .25, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, .6), toneMapped: false })); sign.position.set(0, t.H + .15, -.2); body.add(sign);
  }
  if (t.profile === 'sport') { const sp = new THREE.Mesh(boxGeo(t.W * .9, .06, .35), DARK_MAT); sp.position.set(0, t.H * .66, -t.L * .46); body.add(sp); low.push(sp); }
  // wheels
  const wg = new THREE.CylinderGeometry(t.r, t.r, .26, 18); wg.rotateZ(Math.PI / 2);
  const rg = new THREE.CylinderGeometry(t.r * .64, t.r * .64, .275, 14); rg.rotateZ(Math.PI / 2);   // alloy rim, slightly proud of the tyre
  const wheels = [], pivots = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const piv = new THREE.Group(); piv.position.set(sx * (t.W / 2 - .12), t.r, sz * t.L * .32); g.add(piv);
    const w = new THREE.Mesh(wg, TIRE_MAT); w.castShadow = true; piv.add(w);
    w.add(new THREE.Mesh(rg, RIM_MAT));
    wheels.push(w); pivots.push(piv); low.push(piv);
  }
  return { group: g, body, wheels, pivots, paint, lightbar, low };
}

// A genuine car: the lightweight copy of the real model (full detail swaps in up close)
function buildRealCarMesh(type, colorHex) {
  carMaterials();
  const t = CAR_TYPES[type];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: col(colorHex), metalness: .3, roughness: .34, clearcoat: 1, clearcoatRoughness: .07, envMap: carEnv(), envMapIntensity: .75 });
  const lowCar = makeHiCar(paint, t, true); body.add(lowCar.group);
  let lightbar = null;
  if (type === 'police') {
    const base = new THREE.Mesh(boxGeo(1.1, .08, .28), DARK_MAT); base.position.set(0, t.H + .02, -.25); body.add(base);
    const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0, 0), toneMapped: false });
    const blue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, .2, 3), toneMapped: false });
    const r = new THREE.Mesh(boxGeo(.48, .12, .24), red); r.position.set(-.28, t.H + .1, -.25); body.add(r);
    const b = new THREE.Mesh(boxGeo(.48, .12, .24), blue); b.position.set(.28, t.H + .1, -.25); body.add(b);
    lightbar = { red, blue };
  }
  return { group: g, body, wheels: [], pivots: [], paint, lightbar, low: [lowCar.group], lowCar };
}

class Vehicle {
  constructor(game, type, pos, heading, color) {
    this.game = game; this.type = type; this.t = CAR_TYPES[type];
    this.color = color || (type === 'police' ? '#f2f4f8' : type === 'ambulance' ? '#f4f4f4' : type === 'taxi' ? '#f7c600' : pick(CAR_COLORS));
    const real = this.t.model && CAR_MODELS[this.t.model];
    const m = real ? buildRealCarMesh(type, this.color) : buildCarMesh(type, this.color);
    this.lowCar = m.lowCar || null;
    Object.assign(this, { mesh: m.group, bodyMesh: m.body, wheels: m.wheels, pivots: m.pivots, paint: m.paint, lightbar: m.lightbar, lowParts: m.low });
    this.hi = null; this.detailed = false;
    this.ph = carPhysics(this.t); this.yawRate = 0; this.accLong = 0; this.accLat = 0;
    const sd = real && real.def.seat, sf = real && real.def.seatFrac;
    this.seat = sf ? V3(0, this.t.H * sf[0], this.t.L * sf[1]) : sd ? V3(this.t.W * sd[0], sd[1] * this.t.H / real.size.y, sd[2] * this.t.L / real.size.z) : V3(this.t.W * .2, this.t.H * .4, -this.t.L * .06);   // driver seat (left-hand drive)
    this.pos = pos.clone(); this.heading = heading; this.vel = V3();
    this.lastValid = pos.clone();
    this.steerAngle = 0; this.wheelRot = 0; this.roll = 0; this.pitch = 0; this.y = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.health = 1000; this.dead = false; this.driver = null; this.ai = null; this.stun = 0;
    this.slip = 0; this.speed = 0; this.vF = 0; this.skidAcc = 0; this.sirenOn = false; this.lastImpact = 0;
    game.scene.add(this.mesh);
    this.sync(0);
  }
  get fwd() { return { x: Math.sin(this.heading), z: Math.cos(this.heading) }; }
  remove() { this.game.scene.remove(this.mesh); this.removed = true; }
  // swap between the real model (near) and the low-poly mesh (far)
  setDetail(on) {
    const M = this.t.model && CAR_MODELS[this.t.model];
    if (!M || on === this.detailed) return;
    this.detailed = on;
    if (on && !this.hi) { this.hi = makeHiCar(this.paint, this.t); this.bodyMesh.add(this.hi.group); }
    if (this.hi) this.hi.group.visible = on;
    for (const o of this.lowParts) o.visible = !on;
  }

  update(dt) {
    const t = this.t, n = dt > 1 / 70 ? 3 : 2;
    for (let i = 0; i < n; i++) this.step(dt / n);
    // safety net: if the simulation ever produces invalid numbers, reset this car instead of corrupting the game
    if (!isFinite(this.heading + this.yawRate + this.vel.x + this.vel.z + this.pos.x + this.pos.z)) {
      this.pos.copy(this.lastValid); this.vel.set(0, 0, 0); this.yawRate = 0; this.accLong = this.accLat = 0; this.heading = isFinite(this.heading) ? wrapAngle(this.heading) : 0;
    }
    if (Math.abs(this.heading) > 1000) this.heading = wrapAngle(this.heading);
    this.vF = this.vel.x * Math.sin(this.heading) + this.vel.z * Math.cos(this.heading);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    // body roll / pitch from real accelerations (weight transfer look)
    if (t.body === 'bike') {   // motorbikes lean INTO the turn (tan(lean) = v*yawRate/g); parked on the side-stand
      const lean = !this.driver && this.speed < .5 ? .14 : clamp(-Math.atan2(this.vF * this.yawRate, 9.81), -.75, .75);
      this.roll = damp(this.roll, lean, 6, dt);
    } else this.roll = damp(this.roll, clamp(this.accLat * .011, -.085, .085), 7, dt);
    this.pitch = damp(this.pitch, clamp(-this.accLong * .006, -.06, .06), 7, dt);
    this.wheelRot += this.vF * dt / t.r;
    // collisions with world
    this.collideWorld();
    if (!this.game.world.inBounds(this.pos.x, this.pos.z)) { this.pos.copy(this.lastValid); this.vel.multiplyScalar(-.3); }
    else this.lastValid.copy(this.pos);
    if (this.stun > 0) this.stun -= dt;
    if (this.lightbar) {
      const on = this.sirenOn, ph = (this.game.time * 6) % 2;
      this.lightbar.red.color.setRGB(on && ph < 1 ? 4 : .3, 0, 0); this.lightbar.blue.color.setRGB(0, .2 * (on && ph >= 1 ? 1 : .1), on && ph >= 1 ? 4 : .3);
    }
    this.sync(dt);
  }

  // One physics sub-step: dynamic bicycle model with slip-angle tyres,
  // friction circle, load transfer, aero drag/downforce, power-limited drive.
  step(dt) {
    const ph = this.ph, g = 9.81, m = ph.m;
    const parked = this.dead || !this.driver;
    const inp = parked ? { throttle: 0, brake: 0, steer: 0, handbrake: true } : this.input;
    const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
    const fx = sh, fz = ch, lx = ch, lz = -sh;                       // forward / left unit vectors
    const vF = this.vel.x * fx + this.vel.z * fz, vL = this.vel.x * lx + this.vel.z * lz, av = Math.abs(vF);
    // speed-sensitive steering
    const lock = Math.min(ph.lock / (1 + av / 8), Math.atan(ph.wb * ph.mu * g / Math.max(av * av, 1)) + .07);   // no more lock than the tyres can use
    this.steerAngle = damp(this.steerAngle, inp.steer * lock, 8, dt);
    const st = this.steerAngle;
    // axle loads with longitudinal weight transfer + downforce
    const down = ph.down * vF * vF;
    const Nf = Math.max(m * g * ph.b / ph.wb - ph.xfer * this.accLong + down * .45, m * g * .12);
    const Nr = Math.max(m * g * ph.a / ph.wb + ph.xfer * this.accLong + down * .55, m * g * .12);
    const Nd = ph.drive === 'AWD' ? Nf + Nr : ph.drive === 'RWD' ? Nr : Nf;
    // longitudinal forces
    let Fx = 0, drive = 0, rearBrake = 0;
    const tractive = Math.min(ph.P / Math.max(av, 1), ph.muL * Nd);  // power- or traction-limited
    if (inp.throttle > 0) {
      if (vF < -.8) Fx += ph.mu * (Nf + Nr) * .85 * inp.throttle;  // brake out of reverse
      else if (vF < ph.vmax) { drive = tractive * inp.throttle; Fx += drive; }
    }
    if (inp.brake > 0) {
      if (vF > .8) { const Fb = ph.mu * (Nf + Nr) * .95 * inp.brake * (ph.brake || 1); Fx -= Fb; rearBrake += Fb * .35; }
      else if (vF > -ph.vrev) { drive = -tractive * .4 * inp.brake; Fx += drive; }   // reverse gear
    }
    if (inp.handbrake && av > .3) { const Fh = ph.mu * Nr * .9; Fx -= Math.sign(vF) * Fh; rearBrake += Fh; }
    if (parked && av > .05) Fx -= Math.sign(vF) * Math.min(ph.mu * Nf * .9, m * av / dt);   // parked in gear: front wheels held too
    Fx -= .5 * 1.225 * ph.CdA * vF * Math.abs(vF);                   // aero drag
    if (av > .3) Fx -= Math.sign(vF) * (ph.Crr * m * g + (inp.throttle || inp.brake ? 0 : m * .3));  // rolling + engine braking
    // lateral tyre forces from slip angles
    const vFa = Math.max(av, 1.5), sg = vF >= 0 ? 1 : -1;
    const aF = Math.atan2(vL + this.yawRate * ph.a, vFa) - st * sg;
    const aR = Math.atan2(vL - this.yawRate * ph.b, vFa);
    const capF = ph.mu * .95 * Nf;                                   // fronts saturate first = safe limit understeer
    const Ff = clamp(-ph.Cf * aF, -capF, capF);
    const rearDrive = ph.drive === 'RWD' ? Math.abs(drive) : ph.drive === 'AWD' ? Math.abs(drive) * .55 : 0;
    const capR0 = ph.mu * 1.12 * Nr * (inp.handbrake ? .45 : 1), use = rearDrive + rearBrake;   // wider rear tyres
    const capR = Math.sqrt(Math.max(capR0 * capR0 * .08, capR0 * capR0 - use * use));   // friction circle
    const Fr = clamp(-ph.Cr * aR, -capR, capR);
    // integrate (forces in car frame -> world)
    const ax = (Fx - Ff * Math.sin(st)) / m, ay = (Fr + Ff * Math.cos(st)) / m;
    this.vel.x += (fx * ax + lx * ay) * dt; this.vel.z += (fz * ax + lz * ay) * dt;
    this.yawRate += (ph.a * Ff * Math.cos(st) - ph.b * Fr) / ph.Iz * dt;
    // low speed: blend to kinematic steering (tyre model is singular near 0)
    const k = smooth(1.5, 6, av), kin = vF * Math.tan(st) / ph.wb;
    this.yawRate = lerp(kin, this.yawRate, k);
    if (k < 1) { const v2 = this.vel.x * lx + this.vel.z * lz, d = v2 * (1 - k) * Math.min(1, 10 * dt); this.vel.x -= lx * d; this.vel.z -= lz * d; }
    // stability control: strong for AI drivers, light for the player (off with handbrake).
    // Target = the turn the wheels ask for, capped by what tyre grip can sustain (a = mu*g = v*r)
    const rMax = ph.mu * g / Math.max(av, 3), rT = clamp(kin, -rMax, rMax);
    if (this.driver !== 'player') this.yawRate = lerp(this.yawRate, rT, Math.min(1, 5 * dt));
    else if (!inp.handbrake) {   // ESC-style assist: trims yaw beyond what the tyres can sustain
      const lim = rMax * 1.15;
      if (Math.abs(this.yawRate) > lim) this.yawRate = lerp(this.yawRate, Math.sign(this.yawRate) * lim, Math.min(1, 6 * dt));
      this.yawRate = lerp(this.yawRate, rT, Math.min(1, 1.5 * dt));
    }
    if (av < .25 && !inp.throttle && !(inp.brake > 0)) { this.vel.multiplyScalar(Math.max(0, 1 - 10 * dt)); this.yawRate *= .8; }
    this.heading += this.yawRate * dt;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.accLong = damp(this.accLong, ax, 8, dt); this.accLat = damp(this.accLat, ay, 8, dt);
    this.slip = Math.abs(vL) + (Math.abs(aR) > .18 && av > 5 ? 4 : 0);
  }
  collideWorld() {
    const t = this.t, fx = Math.sin(this.heading), fz = Math.cos(this.heading), r = t.W * .52;
    for (const off of [t.L * .3, -t.L * .3]) {
      const p = V3(this.pos.x + fx * off, 0, this.pos.z + fz * off);
      const hit = this.game.world.resolveCircle(p, r);
      if (hit) {
        this.pos.x += hit.nx * hit.depth; this.pos.z += hit.nz * hit.depth;
        const vn = this.vel.x * hit.nx + this.vel.z * hit.nz;
        if (vn < 0) {
          this.vel.x -= hit.nx * vn * 1.4; this.vel.z -= hit.nz * vn * 1.4;
          this.vel.multiplyScalar(.85); this.yawRate *= .5;
          this.onImpact(-vn);
        }
      }
    }
  }
  onImpact(i) {
    if (i < 3) return;
    const now = this.game.time;
    if (now - this.lastImpact < .15) return;
    this.lastImpact = now;
    this.damage(i * (i > 12 ? 9 : 5));
    if (this.driver === 'player') { AUDIO.crash(i); this.game.camRig.shake = Math.min(1, i / 20); if (i > 14) { this.game.player.mlcCause = 'road traffic accident — driver'; injurePlayerByVehicle(this.game, i, false); } }
    else if (dist2(this.pos, this.game.camera.position) < 40) AUDIO.crash(i * .6);
  }
  damage(n) {
    if (this.dead) return;
    this.health -= n;
    if (this.health <= 0) this.explode();
    else if (this.health < 350) this.paint.color.lerp(new THREE.Color(.05, .05, .05), .1);
  }
  explode() {
    this.dead = true; this.health = 0;
    this.paint.color.setRGB(.03, .03, .03); this.paint.roughness = 1; this.paint.metalness = 0; this.paint.clearcoat = 0;
    this.game.effects.explosion(this.pos.clone().setY(1));
    if (this.driver === 'player') this.game.player.hurt(60, 'explosion');
  }
  sync(dt) {
    const gh = this.game.world.groundHeight(this.pos.x, this.pos.z);
    this.y = dt ? damp(this.y, gh, 9, dt) : gh;
    this.mesh.position.set(this.pos.x, this.y, this.pos.z);
    this.mesh.rotation.set(0, this.heading, 0);
    this.bodyMesh.rotation.set(this.pitch, 0, this.roll);
    this.bodyMesh.position.y = 0;
    if (this.pivots.length) this.pivots[0].rotation.y = this.pivots[1].rotation.y = this.steerAngle;
    for (const w of this.wheels) w.rotation.x = this.wheelRot;
    if (this.lowCar && !this.detailed) { for (const s of this.lowCar.steer) s.rotation.y = this.steerAngle; for (const s of this.lowCar.spins) s.rotation.x = this.wheelRot; }
    if (this.hi && this.detailed) { for (const s of this.hi.steer) s.rotation.y = this.steerAngle; for (const s of this.hi.spins) s.rotation.x = this.wheelRot; }
  }
}

// car <-> car collisions (2 circles each)
function collideVehicles(list) {
  for (let a = 0; a < list.length; a++) {
    const A = list[a];
    for (let b = a + 1; b < list.length; b++) {
      const B = list[b];
      const dx0 = B.pos.x - A.pos.x, dz0 = B.pos.z - A.pos.z;
      if (dx0 * dx0 + dz0 * dz0 > 64) continue;
      const fa = A.fwd, fb = B.fwd, ra = A.t.W * .55, rb = B.t.W * .55;
      for (const oa of [A.t.L * .28, -A.t.L * .28]) for (const ob of [B.t.L * .28, -B.t.L * .28]) {
        const ax = A.pos.x + fa.x * oa, az = A.pos.z + fa.z * oa, bx = B.pos.x + fb.x * ob, bz = B.pos.z + fb.z * ob;
        const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), min = ra + rb;
        if (d >= min || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d, mA = A.ph.m, mB = B.ph.m, pa = (min - d) * mB / (mA + mB), pb = (min - d) * mA / (mA + mB);
        A.pos.x -= nx * pa; A.pos.z -= nz * pa; B.pos.x += nx * pb; B.pos.z += nz * pb;
        const rv = (B.vel.x - A.vel.x) * nx + (B.vel.z - A.vel.z) * nz;
        if (rv < 0) {
          const j = -1.3 * rv / (1 / mA + 1 / mB);
          A.vel.x -= nx * j / mA; A.vel.z -= nz * j / mA; B.vel.x += nx * j / mB; B.vel.z += nz * j / mB;
          A.yawRate += (Math.random() - .5) * j / mA * .3; B.yawRate += (Math.random() - .5) * j / mB * .3;
          A.onImpact(-rv); B.onImpact(-rv);
          if (-rv > 4) { if (A.ai) A.stun = 2; if (B.ai) B.stun = 2; A.game.onCarHit && A.game.onCarHit(A, B, -rv); }
        }
      }
    }
  }
}
