'use strict';
// ---------------------------------------------------------------------------
// Main: renderer, post-processing, input, game state machine and loop.
// ---------------------------------------------------------------------------
class Input {
  constructor(canvas) {
    this.keys = new Set(); this.down = new Set(); this.dx = 0; this.dy = 0; this.click = false; this.drag = false;
    addEventListener('keydown', e => { if (!this.keys.has(e.code)) this.down.add(e.code); this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', e => { if (document.pointerLockElement || this.drag) { this.dx += e.movementX; this.dy += e.movementY; } });
    canvas.addEventListener('mousedown', e => { if (e.button === 2) this.rclick = true; else this.click = true; if (!document.pointerLockElement) this.drag = true; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mouseup', () => this.drag = false);
  }
  key(c) { return this.keys.has(c); }
  pressed(c) { return this.down.has(c); }
  mousePressed() { return this.click && !!document.pointerLockElement; }
  rightPressed() { return this.rclick && !!document.pointerLockElement; }
  end() { this.down.clear(); this.dx = this.dy = 0; this.click = false; this.rclick = false; }
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 1.1 }, grain: { value: .035 }, res: { value: new THREE.Vector2(1, 1) }, sat: { value: 1.12 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, grain, sat; uniform vec2 res; varying vec2 vUv;
    void main(){
      vec2 d = vUv - .5; float ca = .0022 * length(d) * 2.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca).b);
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(c, c * vec3(1.06, 1.0, .9), smoothstep(.25, 1.0, l) * .55);
      c = mix(c, c * vec3(.88, 1.0, 1.1), (1.0 - smoothstep(0.0, .3, l)) * .6);
      c = mix(vec3(l), c, sat);
      c = pow(max(c, 0.0), vec3(1.0 / 2.2));
      c = (c - .5) * 1.06 + .5;
      c *= 1.0 - dot(d, d) * vignette;
      float n = fract(sin(dot(vUv * res + fract(time) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - .5) * grain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

class Game {
  constructor() {
    const canvas = this.canvas = document.getElementById('game');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.basePR = Math.min(devicePixelRatio, 1.25); this.pr = this.basePR; this.ftAvg = 1 / 60;
    r.setPixelRatio(this.pr); r.setSize(innerWidth, innerHeight);
    r.shadowMap.autoUpdate = false; this.frameNo = 0;
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .95;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 4000);
    this.input = new Input(canvas);
    this.vehicles = []; this.time = 0; this.state = 'splash'; this.money = 0; this.rep = 0; this.heat = 0; this.useBloom = true;
    this.lang = 'both'; try { this.lang = localStorage.getItem('kochi_lang') || 'both'; } catch (e) { }
    this.world = new World(this.scene);
    this.world.setRenderer(r);
    this.hud = new HUD(this);
    this.player = new Player(this);
    this.camRig = new CameraRig(this, this.camera);
    this.effects = new Effects(this);
    this.traffic = new Traffic(this);
    this.peds = new Peds(this);
    this.police = new Police(this);
    this.law = new Law(this);
    this.medical = new Medical(this);
    this.cine = new Cinematic(this);
    this.missions = new Missions(this);
    this.garage = new Garage(this);
    // persistent lights (adding lights at runtime forces shader recompiles)
    this.headlight = new THREE.SpotLight(0xfff0d0, 0, 80, .42, .55, 1.2); this.hlTarget = new THREE.Object3D();
    this.headlight.target = this.hlTarget; this.scene.add(this.headlight, this.hlTarget);
    this.heliSpot = new THREE.SpotLight(0xdde8ff, 0, 160, .2, .5, 1.1); this.heliTarget = new THREE.Object3D();
    this.heliSpot.target = this.heliTarget; this.scene.add(this.heliSpot, this.heliTarget);
    this.setupPost();
    // pool of seated drivers for nearby AI cars
    this.drivers = [];
    for (let i = 0; i < 12; i++) { const h = makeHuman(); h.setMode('sit'); h.car = null; this.drivers.push(h); }
    this.world.update(0, this.player.pos, this.camera.position); this.world.refreshEnv();
    this.camRig.update(0);
    addEventListener('resize', () => this.resize());
    this.bindUI();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  get focus() { return this.player.focusPos; }

  setupPost() {
    if (!THREE.EffectComposer || !THREE.UnrealBloomPass) { this.composer = null; return; }
    const w = innerWidth, h = innerHeight;
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.pr);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), .75, .55, .8);
    this.composer.addPass(this.bloom);
    this.grade = new THREE.ShaderPass(GradeShader);
    this.grade.uniforms.res.value.set(w, h);
    this.composer.addPass(this.grade);
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setSize(w, h); this.grade.uniforms.res.value.set(w, h); }
  }

  // ---------------- entities ----------------
  addVehicle(type, pos, heading, role, color) {
    const v = new Vehicle(this, type, pos.clone ? pos.clone() : V3(pos[0], pos[1], pos[2]), heading, color);
    v.role = role; this.vehicles.push(v); return v;
  }
  attachHeadlights(v) { this.hlCar = v; }
  releaseDriver(v) { const h = v.driverHuman; if (!h) return; v.bodyMesh.remove(h.root); h.car = null; v.driverHuman = null; }
  manageDrivers() {
    const cp = this.camera.position;
    const want = this.vehicles.filter(v => !v.removed && !v.dead && v.driver === 'ai' && dist2(v.pos, cp) < 55)
      .sort((a, b) => dist2(a.pos, cp) - dist2(b.pos, cp)).slice(0, this.drivers.length);
    const keep = new Set(want);
    for (const h of this.drivers) if (h.car && (!keep.has(h.car) || h.car.removed || h.car.driver !== 'ai')) this.releaseDriver(h.car);
    for (const v of want) {
      if (v.driverHuman) continue;
      const h = this.drivers.find(d => !d.car); if (!h) break;
      v.bodyMesh.add(h.root); h.root.position.set(v.seat.x, v.seat.y - (h.seatOffset || .55), v.seat.z); h.root.rotation.set(0, 0, 0);
      h.car = v; v.driverHuman = h; h.setMode(v.t.body === 'bike' ? 'ride' : 'sit'); h.update(0, 0);
    }
  }
  addMoney(n) { this.money = Math.max(0, this.money + n); this.hud.setMoney(this.money); }
  addRep(n) { this.rep = Math.max(0, this.rep + n); }
  // E: interact with whatever is nearest that wants it (mission > garage)
  interact() {
    if (this.missions.interact()) return;
    if (this.garage.near()) { const pl = this.player; if (pl.car && pl.car.speed > 2) { this.hud.notify('Stop the vehicle in the bay first.', 2); return; } this.garage.show(pl.car || null); }
  }
  // legacy crime hooks -> Kerala law system
  crime(kind, pos) {
    if (kind === 'ped') this.law.report('hit_ped', pos);
    else if (kind === 'carjack') this.law.report('robbery', pos);
    else if (kind === 'copcar') this.law.report('police_vehicle', pos);
    else if (kind === 'hitcop') this.law.report('damage_police', pos);
    else if (kind === 'theft') this.law.report('theft', pos);
  }
  onCarHit(A, B, impact) {
    const pc = this.player.car; if (!pc) return;
    const other = A === pc ? B : B === pc ? A : null;
    if (other && other.role === 'police' && impact > 5) this.crime('hitcop', other.pos);
    else if (other && other.driver === 'ai' && impact > 8) this.law.report('dangerous', pc.pos);
  }
  // health reached zero: unconscious -> bystanders call 108 -> hospital
  onKnockout(cause) {
    if (this.state !== 'play') return;
    const pl = this.player;
    this.state = 'dead'; pl.dead = true;
    if (pl.car) pl.exitCar(true);
    pl.h.setMode('down');
    if (!pl.mlcCause && (cause === 'assault' || cause === 'hit by a vehicle' || cause === 'road accident')) pl.mlcCause = cause;
    this.hud.banner('UNCONSCIOUS', 'Bystanders dialled 108 — Kanivu ambulance on the way', 'fail', 3.8);
    AUDIO.fail(); this.missions.fail('You were knocked unconscious.');
    setTimeout(() => this.hud.fade(1, 1.2), 2600);
    setTimeout(() => {
      this.police.clear(); this.heat = 0;
      const need = [...new Set(pl.vitals.injuries.map(k => INJURY[k].dept))];
      if (!pl.vitals.injuries.length) addInjury(pl.vitals, 'bruise');
      const h = this.medical.nearest(pl.pos, need.length ? need : null);
      pl.dead = false; pl.h.setMode('idle');
      this.medical.admitPlayer(h, 'ambulance');
      this.hud.fade(0, 1);
    }, 4200);
  }
  onDeath(why) { this.onKnockout(why); }
  onBusted() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    if (this.player.car) this.player.exitCar(true);
    this.player.h.setMode('hands');
    this.hud.banner('ARRESTED', 'Kerala Police — Fort Kochi Police Station', 'fail', 3.5);
    AUDIO.fail(); this.missions.fail('You were arrested.');
    for (const p of this.peds.list) if (p.cop) this.peds.remove(p);
    setTimeout(() => this.hud.fade(1, 1.2), 2400);
    setTimeout(() => {
      this.police.clear(); this.heat = 0; this.player.h.setMode('idle');
      this.player.teleport(V3(LOC.police.ex, 0, LOC.police.ez), LOC.police.rot);   // outside Fort Kochi Police Station
      this.law.arrest(); this.hud.fade(0, 1);
    }, 4000);
  }
  playCinematic(script, done) {
    this.state = 'cine';
    this.cine.play(script, () => {
      this.state = 'play';
      this.camRig.snapBehind();
      if (done) done();
    });
  }
  save() { try { localStorage.setItem('kochi_save', JSON.stringify({ v: 1, mission: this.missions.index, money: this.money, rep: this.rep, owned: this.garage.owned, time: this.world.time, day: this.day || 0 })); } catch (e) { } }
  loadSave() { try { return JSON.parse(localStorage.getItem('kochi_save')); } catch (e) { return null; } }

  // ---------------- UI ----------------
  bindUI() {
    const $ = id => document.getElementById(id);
    const save = this.loadSave();
    $('loading').classList.add('hidden');
    if (save && (save.mission > 0 || (save.owned && save.owned.length))) $('btn-continue').classList.remove('hidden');
    const langName = { both: 'MALAYALAM + ENGLISH', ml: 'MALAYALAM', en: 'ENGLISH' };
    $('btn-lang').textContent = 'DIALOGUE: ' + langName[this.lang];
    $('btn-lang').onclick = e => { this.lang = { both: 'ml', ml: 'en', en: 'both' }[this.lang]; try { localStorage.setItem('kochi_lang', this.lang); } catch (er) { } e.target.textContent = 'DIALOGUE: ' + langName[this.lang]; };
    $('btn-new').onclick = () => this.newGame();
    $('btn-continue').onclick = () => this.continueGame(save);
    $('btn-resume').onclick = () => this.resume();
    $('btn-bloom').onclick = e => { this.useBloom = !this.useBloom; e.target.textContent = 'BLOOM: ' + (this.useBloom ? 'ON' : 'OFF'); };
    $('btn-shadows').onclick = e => { const on = !this.renderer.shadowMap.enabled; this.renderer.shadowMap.enabled = on; this.world.sun.castShadow = on; this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } }); e.target.textContent = 'SHADOWS: ' + (on ? 'ON' : 'OFF'); };
    $('btn-restart').onclick = () => { this.resume(); this.missions.restart(); };
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.state === 'play' && !this.ignoreUnlock) this.pause(); });
    this.canvas.addEventListener('click', () => { if (this.state === 'play' && !document.pointerLockElement) this.lock(); });
  }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  begin() {
    AUDIO.init(); VOICE.warm();
    document.getElementById('splash').classList.add('hidden');
    this.hud.show(true); this.lock();
  }
  newGame() {
    this.begin();
    this.missions.load(0); this.money = 0; this.addMoney(25000); this.rep = 0;
    this.garage.owned = []; this.garage.addOwned('royal_enfield_classic_350', '#8a0f18');   // Arjun's own bike
    this.save();
    this.playCinematic(introScript(this), () => {
      AUDIO.stopMusic(3);
      this.garage.spawnAllOwned(); this.traffic.prefill(); this.peds.prefill();
      this.missions.startMission(0);
      this.hud.notify('<kbd>WASD</kbd> move &nbsp; <kbd>E</kbd> interact &nbsp; <kbd>F</kbd> vehicles &nbsp; <kbd>Tab</kbd> character &nbsp; <kbd>M</kbd> map<br>Click the screen to control the camera.', 8);
    });
  }
  continueGame(save) {
    this.begin();
    this.missions.load(save.mission || 0); this.addMoney(save.money || 0); this.rep = save.rep || 0; this.day = save.day || 0;
    this.garage.owned = (save.owned || []).map(o => Object.assign({ stored: false }, o)); if (!this.garage.owned.length) this.garage.addOwned('royal_enfield_classic_350', '#8a0f18');
    this.world.time = typeof save.time === 'number' ? save.time : 8.5; this.state = 'play';
    this.player.teleport(V3(LOC.garage.x - 2, 0, LOC.garage.z + 5.5), Math.PI); this.camRig.snapBehind();
    this.garage.spawnAllOwned(); this.traffic.prefill(); this.peds.prefill();
    if (this.missions.index < MISSIONS.length) this.missions.startMission(this.missions.index);
    this.hud.notify('Welcome back to <b>Varma Performance Works</b>, Arjun.', 5);
  }
  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused'; document.getElementById('pause').classList.remove('hidden');
    if (AUDIO.ready) AUDIO.master.gain.setTargetAtTime(.25, AUDIO.ctx.currentTime, .1);
  }
  resume() {
    if (this.state !== 'paused') return;
    document.getElementById('pause').classList.add('hidden'); this.state = 'play'; this.clock.getDelta();
    if (AUDIO.ready) AUDIO.master.gain.setTargetAtTime(.85, AUDIO.ctx.currentTime, .1);
    this.lock();
  }

  // ---------------- per-frame ----------------
  handleKeys() {
    const I = this.input, pl = this.player;
    if (I.pressed('Escape') && !document.pointerLockElement) { this.pause(); return; }
    if (I.pressed('KeyM')) this.hud.toggleBigmap();
    // G: tap = hospital GPS, hold 1 s = dial 108 for an ambulance
    if (I.key('KeyG')) { this.gT = (this.gT || 0) + (1 / 60); if (this.gT > 1 && !this.gFired) { this.gFired = true; this.medical.call108(); } }
    else { if (this.gT > 0 && !this.gFired) this.medical.toggleGPS(); this.gT = 0; this.gFired = false; }
    if (I.pressed('KeyV')) { this.camRig.cinematic = !this.camRig.cinematic; this.hud.notify('Cinematic camera ' + (this.camRig.cinematic ? 'ON' : 'OFF'), 1.5); }
    if (I.pressed('KeyC') && !pl.car) { pl.crouch = !pl.crouch; }
    if (I.pressed('Tab')) this.hud.toggleCharPanel();
    if (I.pressed('KeyE')) this.interact();
    if (I.pressed('KeyF') && !pl.dead && !pl.car && this.medical.atEntrance) { this.medical.admitPlayer(this.medical.atEntrance, 'walk-in'); }
    else if (I.pressed('KeyF') && !pl.dead) {
      if (pl.car) { if (pl.car.speed < 9) pl.exitCar(); else this.hud.notify('Slow down to get out.', 1.5); }
      else { const v = pl.nearestCar(); if (v) pl.enterCar(v); }
    }
    if (pl.car) {
      if (I.pressed('KeyH')) { AUDIO.horn(); this.peds.scare(pl.car.pos, 12); }
    }
    if (I.dx || I.dy) this.camRig.mouse(I.dx, I.dy);
    // contextual prompt
    if (!pl.car && !pl.dead) {
      const v = pl.nearestCar();
      if (v && v !== this._promptCar) { this._promptCar = v; this.hud.notify(`<kbd>F</kbd> ${v.driver === 'ai' ? 'Carjack' : 'Enter'} <b>${v.t.name}</b>`, 2); }
      if (!v) this._promptCar = null;
    }
  }
  loop() {
    requestAnimationFrame(this.loop);
    const rawDt = this.clock.getDelta(), dt = Math.min(rawDt, .05);
    if (rawDt < .5) this.adaptQuality(rawDt);
    if (this.state === 'doc' && this.input.pressed('Escape')) { this.input.down.delete('Escape'); if (this.garage.open) this.garage.close(); else if (!document.getElementById('docpanel').classList.contains('hidden')) this.hud.closeDocument(); }
    if (this.state === 'paused' || this.state === 'splash' || this.state === 'doc') {
      if (this.state === 'splash') { this.time += dt; this.world.update(dt * .2, this.player.pos, this.camera.position); }
      this.render(); this.input.end(); return;
    }
    this.time += dt;
    if (this.state === 'play') this.handleKeys();
    const pl = this.player;
    this.world.update(dt, this.focus, this.camera.position);
    this.traffic.update(dt);
    this.police.update(dt);
    this.peds.update(dt);
    pl.update(dt, this.input);
    // parked cars that are at rest do no physics work until something moves them
    for (const v of this.vehicles) { if (v.removed) continue; if (!v.driver && !v.dead && v.speed < .03 && v.vel.lengthSq() < .001 && v.settled) continue; v.update(dt); v.settled = !v.driver && v.speed < .03; }
    const near = this.vehicles.filter(v => !v.removed && dist2(v.pos, this.focus) < 160);
    collideVehicles(near);
    this.vehicles = this.vehicles.filter(v => !v.removed);
    this.effects.update(dt);
    this.missions.update(dt);
    if (this.cine.active) this.cine.update(dt, this.input); else this.camRig.update(dt);
    this.heat = Math.max(0, this.heat - dt * .05);
    // headlights
    const hc = this.hlCar, n = this.world.night;
    if (hc && !hc.removed && pl.car === hc) {
      const f = hc.fwd; this.headlight.position.set(hc.pos.x + f.x * hc.t.L * .5, hc.y + .8, hc.pos.z + f.z * hc.t.L * .5);
      this.hlTarget.position.set(hc.pos.x + f.x * 25, 0, hc.pos.z + f.z * 25);
      this.headlight.intensity = 1 + n * 7;
    } else this.headlight.intensity = 0;
    // level of detail: real model for your car + the 8 nearest within 80 m
    this.lodT = (this.lodT || 0) - dt;
    if (this.lodT <= 0) {
      this.lodT = .25; const cp = this.camera.position; let k = 0;
      const list = this.vehicles.filter(v => !v.removed).map(v => [v, (v.pos.x - cp.x) ** 2 + (v.pos.z - cp.z) ** 2]).sort((a, b) => a[1] - b[1]);
      for (const [v, d2] of list) { const hi = v === pl.car || (k < 6 && d2 < 4900); if (hi) k++; v.setDetail(hi); v.mesh.visible = d2 < 240 * 240 || v === pl.car; }
    }
    this.drvT = (this.drvT || 0) - dt; if (this.drvT <= 0) { this.drvT = .3; this.manageDrivers(); }
    for (const h of this.drivers) if (h.car) h.update(dt, 0);
    for (const m of CAR_LIGHTS.head) m.emissiveIntensity = .2 + n * 3.5;
    for (const m of CAR_LIGHTS.tail) m.emissiveIntensity = .4 + n * 2.5;
    HEAD_MAT && HEAD_MAT.color.setScalar(.8 + n * 3); TAIL_MAT && TAIL_MAT.color.setRGB(.6 + n * 2.5, .02, .02);
    this.law.update(dt); this.medical.update(dt); this.garage.update(dt);
    // garage income: paid each in-game morning once the garage is open for business
    if (this.state === 'play' && this.missions.index > 0 && this.world.time > 9 && this.world.time < 9.5 && this.lastIncomeDay !== Math.floor(this.time / 1440 + this.world.time / 24 * 0) && !this._paidToday) {
      this._paidToday = true; const inc = 3000 + this.rep * 200; this.addMoney(inc); this.hud.notify(`<b>Varma Performance Works</b> — today's garage income: <b>₹${inc.toLocaleString('en-IN')}</b>`, 5); this.save();
    }
    if (this.world.time > 10) this._paidToday = false;
    if (this.state === 'play') tickInjuries(this, pl.vitals, dt, true);
    // untreated injuries affect you: blurred vision (eye), dizziness (head)
    const blur = hasEffect(pl.vitals, 'blur'), dizzy = hasEffect(pl.vitals, 'dizzy');
    this.canvas.style.filter = blur ? 'blur(1.6px)' : '';
    if (dizzy && !this.cine.active) { this.camera.rotation.z += Math.sin(this.time * 1.3) * .025; }
    this.hud.update(dt);
    if (AUDIO.ready) {
      // sea / backwater sound: how much water is around the camera (real coastline)
      const cp = this.camera.position; let wet = 0;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const r of [25, 60]) if (!this.world.classAt(cp.x + Math.cos(a) * r, cp.z + Math.sin(a) * r)) wet += r === 25 ? .09 : .035; }
      const ocean = clamp(wet, 0, 1);
      AUDIO.ambience(pl.car ? .35 : .9, ocean, this.time);
    }
    this.render();
    this.input.end();
  }
  // keep the frame rate up: lower/raise render resolution based on measured frame time
  adaptQuality(realDt) {
    this.ftAvg = lerp(this.ftAvg, realDt, .05);
    this.qT = (this.qT || 0) + realDt; if (this.qT < 2) return; this.qT = 0;
    let pr = this.pr;
    if (this.ftAvg > 1 / 48 && pr > .7) pr = Math.max(.7, pr - .15);
    else if (this.ftAvg < 1 / 58 && pr < this.basePR) pr = Math.min(this.basePR, pr + .1);
    if (pr !== this.pr) { this.pr = pr; this.renderer.setPixelRatio(pr); if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(innerWidth, innerHeight); } }
  }
  render() {
    this.frameNo++;
    if (this.frameNo % 2 === 0) this.renderer.shadowMap.needsUpdate = true;   // shadows refresh every other frame
    if (this.composer && this.useBloom) {
      this.bloom.strength = .55 + this.world.night * .55;
      this.renderer.toneMappingExposure = .95 + this.world.night * .45;
      this.grade.uniforms.time.value = this.time;
      this.composer.render();
    } else this.renderer.render(this.scene, this.camera);
  }
}

// ---------------- boot ----------------
(async function boot() {
  const btn = document.getElementById('btn-new'); btn.disabled = true;
  try { await Promise.race([Promise.all([document.fonts.load('64px "Bebas Neue"'), document.fonts.load('64px "Yellowtail"'), document.fonts.load('16px "Inter"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  await new Promise(r => setTimeout(r, 30));
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loading').textContent = 'Loading cars and people...';
  VOICE.preload();   // fetch the voice clips alongside the models
  document.getElementById('loading').textContent = 'Loading cars, people and the Fort Kochi map...';
  await Promise.all([loadCarModels(), loadHumans(), loadKochiMap()]);
  try {
    window.GAME = new Game();
    btn.disabled = false;
  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = 'Failed to start: ' + e.message;
  }
})();
