'use strict';
// ---------------------------------------------------------------------------
// KOCHI: CITY OF SHADOWS — story, cinematics and the mission engine.
//
// Characters (v0.1 uses Arjun, Nikhil and the customer):
//   Arjun Varma (27)  — exotic-car mechanic from Fort Kochi; inherited his late
//                       father's workshop and turned it into Varma Performance Works.
//   Nikhil Menon      — best friend and garage partner; loud, loyal, always hungry.
//   Alex Mathew       — wealthy "businessman" with a Porsche and something in the boot.
//   (coming later: Sameer Rahman, Meera Varma, Victor D'Souza, ACP Dev Menon)
//
// Dialogue lines carry Malayalam (Manglish) + English; the pause menu chooses
// which to show (both / Malayalam / English).
// ---------------------------------------------------------------------------
const LOOK = {
  arjun:    { kind: 'male', hair: '#16110d', skin: '#9c6b4e', shirt: '#1f3a5f', pants: '#2b2b33', height: 1.78 },
  nikhil:   { kind: 'male', hair: '#1c1510', shirt: '#c0392b', pants: '#3e5c76', height: 1.74 },
  customer: { kind: 'male', hair: '#2a2622', jacket: '#1b1b1b', pants: '#111111', height: 1.8 },
};
LOOK.kai = LOOK.arjun;    // the player model uses Arjun's look

// language-aware line
function L(ml, en, id) {
  const lang = (window.GAME && GAME.lang) || 'both';
  const out = lang === 'ml' ? ml : lang === 'en' ? en : `${ml}  —  <i>${en}</i>`;
  LINE_KEYS[out] = id || ml;   // lets the voice system find the spoken clip for this subtitle
  return out;
}

// ======================= CINEMATICS =======================
function introScript(g) {
  const gx = LOC.garage.x, gz = LOC.garage.z, C = LOC.coast, N = LOC.nets, S = LOC.street;
  const sm = [lerp(S.ax, S.bx, .45), lerp(S.az, S.bz, .45)];
  return {
    music: 'theme',
    enter: c => { g.world.time = 6.4; g.world.timeScale = .25; g.player.setVisible(false); },
    shots: [
      // over the Arabian Sea, looking at the real Fort Kochi shoreline
      { dur: 4, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: [C.x - 260, 26, C.z + 40], look: [C.x + 500, 4, C.z - 60] }, title: [.6, 'FORT KOCHI, KERALA', 'ഫോർട്ട് കൊച്ചി', 'small', 3] },
      // in from the harbour mouth to the Chinese fishing nets on the north shore
      { dur: 8.5, fadeIn: 2, whoosh: true, cam: { from: [N.x - 30, 15, N.z - 150], to: [N.x - 8, 6.5, N.z - 42], look: [N.x, 4, N.z], lookTo: [N.x + 6, 4, N.z + 12], fov: 46, fovTo: 52, ease: 'sine' },
        title: [2.5, 'FORT KOCHI', 'where the spice route meets the Arabian Sea', '', 5] },
      // down a real heritage street
      { dur: 7, cam: { from: [S.ax, 1.8, S.az], to: [sm[0], 2.2, sm[1]], look: [S.bx, 4, S.bz], lookTo: [S.bx, 5, S.bz], fov: 55, ease: 'linear' },
        title: [1, 'BEACH ROAD', '6:40 AM', 'left', 4] },
      {
        dur: 10.9, fadeIn: .8,
        enter: c => {
          c.arjun = c.actor(LOOK.arjun, [gx - 6, .25, gz + 8.5], Math.PI / 2, 'idle'); c.arjun.walkSpeed = 1.4;
          c.bike = c.car('royal_enfield_classic_350', [gx - 40, 0, gz + 2.5], Math.PI / 2, '#8a0f18');
          c.bike.vel.set(9, 0, 0);
          c.nikhil = c.actor(LOOK.nikhil, [0, 0, 0], 0, 'ride');
          c.bike.bodyMesh.add(c.nikhil.root); c.nikhil.root.position.set(c.bike.seat.x, c.bike.seat.y - c.nikhil.seatOffset, c.bike.seat.z);
        },
        tick: (c, t, dt) => {
          const a = c.arjun, k = clamp(t / 2.5, 0, 1);
          a.root.position.x = lerp(gx - 6, gx - .5, k); a.walkSpeed = k < 1 ? 1.4 : 0; if (k >= 1) a.root.rotation.y = damp(a.root.rotation.y, Math.PI * .75, 4, dt);
          const b = c.bike; b.input.steer = 0;
          if (b.pos.x < gx - 8) { b.input.throttle = b.speed < 9 ? .4 : 0; b.input.brake = 0; } else { b.input.throttle = 0; b.input.brake = b.vF > .5 ? 1 : 0; b.input.handbrake = b.vF < .5; }
        },
        cam: { from: [gx + 10, 2.4, gz - 6], to: [gx + 7, 2, gz - 4], look: [gx - 5, 1.3, gz + 5], fov: 48 },
        lines: [[1.9, 'NIKHIL', L('Eda Arjun! Innu nammude first big customer varunnundu!', 'Arjun! Our first big customer is coming today!'), 4.4],
                [6.6, 'ARJUN', L('Achante workshop... innu muthal Varma Performance Works.', "Dad's old workshop... from today, Varma Performance Works."), 4.1]],
      },
      {
        dur: 5.5,
        enter: c => { const b = c.bike, n = c.nikhil; b.vel.set(0, 0, 0); b.input.throttle = 0; b.input.handbrake = true; g.scene.add(n.root); n.root.position.set(b.pos.x - .3, .05, b.pos.z + 1.2); n.root.rotation.y = 0; n.setMode('talk'); },
        cam: { from: [gx - 4.5, 1.7, gz + 6.5], to: [gx - 4.7, 1.7, gz + 6.2], look: [gx - 8.6, 1.6, gz + 3.7], fov: 36 },
        lines: [[.3, 'NIKHIL', L('Porsche aanu bro, Porsche! Shutter thurakku, vegam!', "It's a Porsche, bro! Open the shutter, quick!"), 4.5]],
      },
      {
        dur: 8, fadeOut: 1.2,
        cam: { from: [gx - 2, 3, gz - 8], to: [gx - 30, 60, gz - 60], look: [gx, 4, gz + 9], lookTo: [0, 10, 0], fov: 50, fovTo: 58 },
        tick: (c, t) => { if (t > 3 && !c.boomed) { c.boomed = true; AUDIO.boom(); } },
        title: [3, 'KOCHI', 'CITY OF SHADOWS · നിഴലുകളുടെ നഗരം', 'kochi', 4.6],
      },
    ],
    exit: c => {
      g.world.time = Math.max(g.world.time, 6.9); g.world.timeScale = .5;
      g.player.teleport(V3(gx - 2, 0, gz + 5.5), Math.PI); g.player.setVisible(true); g.camRig.snapBehind();
    },
  };
}

function customerArrivesScript(g, m) {
  const gx = LOC.garage.x, gz = LOC.garage.z;
  return {
    enter: c => { g.player.setVisible(false); m.hideActors(true); },
    shots: [{
      dur: 9, fadeIn: .5,
      enter: c => {
        const car = c.car('porsche_911_carrera_4s', [gx - 55, 0, gz + 2.5], Math.PI / 2, '#0d0d0d', true);
        car.vel.set(12, 0, 0); m.vars.job = car; c.jobCar = car;
        car.faults = { coil: true, pads: true }; car.upg = newUpgrades(); applyUpgrades(car); car.health = 720;   // the faults are real: less power, weak brakes
        c.arjun = c.actor(LOOK.arjun, [gx + 2, .05, gz + 6], -Math.PI / 2, 'idle');
      },
      tick: (c, t) => {
        const car = c.jobCar; car.input.steer = 0;
        if (car.pos.x < gx - 14) { car.input.throttle = car.speed < 11 ? .35 : 0; car.input.brake = 0; }
        else { car.input.throttle = 0; car.input.brake = car.vF > .5 ? 1 : 0; car.input.handbrake = car.vF < .5; }
      },
      cam: { from: [gx + 9, 1.6, gz - 5], to: [gx + 6, 1.8, gz - 4], look: [gx - 18, 1, gz + 2.5], lookTo: [gx - 4, 1, gz + 2.5], fov: 44 },
      lines: [[5.5, 'ARJUN', L('Ithaanu... nammude customer.', "That's... our customer."), 2.5]],
    }],
    exit: c => {
      const car = m.vars.job; car.driver = null; car.vel.set(0, 0, 0);
      car.upg = newUpgrades(); applyUpgrades(car); car.health = 720;   // it really is unwell
      m.hideActors(false);
      m.spawnActor('customer', LOOK.customer, V3(car.pos.x + .5, .05, car.pos.z - 1.9), Math.PI, 'idle');
      g.player.setVisible(true); g.camRig.snapBehind();
    },
  };
}

function endingScript(g, m, pay) {
  const gx = LOC.garage.x, gz = LOC.garage.z, car = m.vars.job;
  return {
    enter: c => {
      if (g.player.car) g.player.exitCar(true);
      g.player.setVisible(false); g.police.clear();
      car.driver = 'cine'; car.pos.set(gx, 0, gz + 2.5); car.heading = Math.PI / 2; car.vel.set(0, 0, 0); car.sync(0);
      m.hideActors(true);
      c.arjun = c.actor(LOOK.arjun, [gx + 1, .05, gz + 5.5], -Math.PI * .8, 'talk');
      c.cust = c.actor(LOOK.customer, [gx + 3, .05, gz + 4], Math.PI * .7, 'idle');
      c.nik = c.actor(LOOK.nikhil, [gx - 3, .25, gz + 8], Math.PI * .2, 'idle');
    },
    shots: [
      { dur: 6.5, fadeIn: .8, enter: c => c.cust.setMode('talk'), cam: { from: [gx + 9, 1.8, gz - 2], to: [gx + 8, 1.8, gz - 1], look: [gx + 2, 1.5, gz + 4.5], fov: 42 },
        lines: [[.4, 'ALEX MATHEW', L(`Nannayi, Arjun. Ithaa — ${pay.toLocaleString('en-IN')} roopa.`, `Good work, Arjun. Here — ₹${pay.toLocaleString('en-IN')}.`, 'pay'), 3.8]] },
      { dur: 7, cam: { from: [gx + 1.6, 1.85, gz + 4.6], to: [gx + 1.7, 1.85, gz + 4.5], look: [gx + 3, 1.8, gz + 4], fov: 32 },
        lines: [[.3, 'ALEX MATHEW', L('Pinne... nee boot-il onnum kandilla. Alle?', "And... you didn't see anything in the boot. Right?"), 3.7], [4.3, 'ARJUN', L('Onnum kandilla, sir.', 'I saw nothing, sir.'), 2.2]] },
      {
        dur: 9.8, fadeOut: 1.4,
        enter: c => { c.cust.root.visible = false; c.arjun.setMode('idle'); c.nik.setMode('talk'); },
        tick: (c, t) => { car.input.steer = 0; car.input.throttle = t > .5 ? .5 : 0; car.input.brake = 0; car.input.handbrake = false; },
        cam: { from: [gx - 6, 1.7, gz + 9], to: [gx - 5, 1.9, gz + 8], look: [gx + 10, 1.2, gz + 3], fov: 48 },
        lines: [[1, 'NIKHIL', L("Eda... aa kaakka symbol... athu Victor D'Souza-yude aalukalude alle?", "Hey... that crow symbol... isn't that Victor D'Souza's people?"), 4.2],
                [5.5, 'ARJUN', L('Achante pazhaya file-ilum athe symbol undayirunnu...', "That same symbol was in Dad's old files..."), 3.9]],
        title: [6.8, 'CHAPTER 1 — THE MECHANIC', 'to be continued', 'small', 3],
      },
    ],
    exit: c => {
      car.remove(); m.vars.job = null; m.hideActors(false);
      g.player.teleport(V3(gx - 2, 0, gz + 5.5), Math.PI); g.player.setVisible(true); g.camRig.snapBehind();
    },
  };
}

// ======================= MISSIONS =======================
const snapRoad = (x, z) => { const r = GAME.world.nearestRoad(x, z, true, 220); return r ? V3(r.px, 0, r.pz) : V3(x, 0, z); };
const GX = () => LOC.garage.x, GZ = () => LOC.garage.z;
const MISSIONS = [
  {
    title: 'THE NEW CUSTOMER', sub: 'Chapter 1 — The Mechanic', start: null, reward: 45000, rep: 10,
    steps: [
      { do: (m, g) => { m.shutterOpened = false; m.spawnActor('nikhil', LOOK.nikhil, V3(GX() - 8.5, .05, GZ() + 5), Math.PI * .3, 'idle'); } },
      { interact: () => V3(GX(), 0, GZ() + 7.6), r: 2.8, prompt: 'Open the shutter', text: 'Open the shutter of <b>Varma Performance Works</b>.' },
      { do: (m, g) => { m.shutterOpened = true; AUDIO.burst(400, 1.2, .5); } },
      { talk: [['NIKHIL', 'Adipoli! Ippo nammude garage pole thonnunnu.', 'Awesome! Now it actually looks like our garage.']] },
      { cine: customerArrivesScript },
      { interact: m => m.actorPos('customer'), r: 2.8, prompt: 'Talk to the customer', text: 'Talk to the <b>customer</b>.' },
      { talk: [['ALEX MATHEW', 'Varma Performance Works? Njan Alex Mathew.', "Varma Performance Works? I'm Alex Mathew."],
               ['ALEX MATHEW', 'Engine missing aanu, brake-um sheriyalla. Vaikunneram vare time undu.', "The engine misfires and the brakes aren't right. You have until evening."],
               ['ALEX MATHEW', 'Pinne... boot thurakkanda. Personal items aanu.', "And... don't open the boot. Personal items."],
               ['ARJUN', 'Sheri sir. Njan onnu nokkatte.', 'Sure, sir. Let me take a look.']] },
      { interact: m => m.vars.job.pos, r: 3.6, prompt: 'Inspect the Porsche', text: 'Inspect the <b>Porsche 911</b>.' },
      { inspect: true },
      { interact: m => m.vars.job.pos, r: 3.6, prompt: 'Open the service bay', text: 'Repair the car — open the <b>service bay</b>.' },
      { service: [{ label: 'Replace ignition coil — cylinder 3', note: 'OEM coil pack · clears misfire P0303 (restores full power)', time: 2600, fix: 'coil' },
                  { label: 'Replace front brake pads', note: 'Pads at 2 mm · restores full braking', time: 2600, fix: 'pads' },
                  { label: 'ECU fault scan & reset', note: 'Live data check', time: 1800 }] },
      { talk: [['ALEX MATHEW', 'Kollaam. Oru test drive cheythu nokku — neighbourhood-il oru round.', 'Nice. Take it for a test drive — one round of the neighbourhood.']] },
      { enter: 'job', text: 'Get in the Porsche for a <b>test drive</b>.' },
      // a round of the neighbourhood on real roads: north, west to the beach road, south, back to the garage
      { get route() { return this._r || (this._r = [snapRoad(-700, 450), snapRoad(-1250, 380), snapRoad(-1150, 760)]); }, car: 'job', r: 13, text: 'Test drive — drive through the <b>checkpoints</b>.',
        onCheckpoint: (m, g, i) => { if (i === 1) m.say([['NIKHIL (phone)', 'Eda, aa car-nte boot-il entha? Customer valare tension-il aanu.', "Hey, what's in that car's boot? The customer looks really tense."], ['ARJUN', 'Ariyilla. Ariyaanum thalparyamilla.', "Don't know. Don't want to know."]]); } },
      { goto: () => V3(GX(), 0, GZ() + 7), r: 6, car: 'job', text: 'Bring it back to <b>Varma Performance Works</b>.' },
      { cine: (g, m) => { const dmg = Math.max(0, 1000 - m.vars.job.health); m.payout = Math.max(15000, MISSIONS[0].reward - Math.round(dmg * 30)); return endingScript(g, m, m.payout); } },
    ],
  },
];

class Missions {
  constructor(game) {
    this.g = game; this.index = 0; this.active = null; this.stepI = -1; this.vars = {}; this.timer = null; this.actors = {};
    this.shutterOpened = true;
    const tex = canvasTex(4, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, true, false);
    this.beamMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2, 1.6, .2), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 40, 32, 1, true), this.beamMat); this.beam.geometry.translate(0, 20, 0);
    const ringG = new THREE.RingGeometry(2.1, 2.6, 40); ringG.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringG, this.beamMat); this.beam.add(this.ring); this.ring.position.y = .1;
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2, .3), toneMapped: false }));
    this.arrow.rotation.x = Math.PI;
    game.scene.add(this.beam, this.arrow); this.beam.visible = this.arrow.visible = false;
    this.markerPos = null; this.talkQ = []; this.talkT = 0;
  }
  load(i) { this.index = clamp(i, 0, MISSIONS.length); }
  get step() { return this.active ? this.active.steps[this.stepI] : null; }
  // ---- persistent story actors (stand in the world during a mission)
  spawnActor(name, look, pos, rotY, mode) {
    this.removeActor(name);
    const h = makeHuman(look); h.root.position.copy(pos); h.root.rotation.y = rotY; h.setMode(mode || 'idle');
    this.g.scene.add(h.root); this.actors[name] = h; return h;
  }
  removeActor(name) { const a = this.actors[name]; if (a) { this.g.scene.remove(a.root); delete this.actors[name]; } }
  actorPos(name) { const a = this.actors[name]; return a ? a.root.position : null; }
  hideActors(hide) { for (const k in this.actors) this.actors[k].root.visible = !hide; }
  // ---- dialogue: lines shown one after another (E skips)
  say(lines, done) {
    for (const [who, ml, en, dur] of lines) {
      const vo = GAME.lang === 'en' ? 0 : VOICE.duration(ml);           // wait for the spoken line to finish
      this.talkQ.push({ who, text: L(ml, en), dur: dur || Math.max(clamp(3 + en.length / 26, 3, 6), vo + .5) });
    }
    this.talkDone = done || null; this.talkT = 0;
  }
  startMission(i) {
    const g = this.g;
    this.active = MISSIONS[i]; this.index = i; this.stepI = -1; this.vars = {}; this.timer = null; g.hud.setTimer(null);
    g.hud.banner(this.active.title, this.active.sub || ('JOB ' + (i + 1)), 'info', 3.2);
    AUDIO.blip(660);
    this.nextStep();
  }
  nextStep() {
    const g = this.g;
    this.stepI++;
    const s = this.step;
    if (!s) return this.complete();
    this.setMarker(null); this.cp = 0;
    if (s.do) { s.do(this, g); return this.nextStep(); }
    if (s.cine) { g.hud.objective(''); g.hud.prompt(''); g.playCinematic(s.cine(g, this), () => this.nextStep()); return; }
    if (s.talk) { g.hud.objective(''); g.hud.prompt(''); this.say(s.talk, () => this.nextStep()); return; }
    if (s.inspect) { g.hud.prompt(''); this.inspectReport(); return; }
    if (s.service) { g.hud.prompt(''); g.hud.objective('Repair the car at the service bay.'); g.garage.show(this.vars.job, { items: s.service.map(o => Object.assign({}, o)), onDone: () => { g.hud.notify('Service complete. <b>Engine runs smooth</b>, brakes like new.', 4); this.nextStep(); } }); return; }
    g.hud.objective(s.text || '');
  }
  inspectReport() {
    const g = this.g, car = this.vars.job;
    g.hud.document({
      title: 'VARMA PERFORMANCE WORKS', sub: 'Job card #VPW-0001 · Vehicle inspection',
      rows: [['Vehicle', `${car.t.name} · Reg. KL-07-CV-7777 · Owner: Alex Mathew`], ['Engine', 'Misfire on cylinder 3 — ignition coil failed (OBD code P0303)'],
        ['Brakes', 'Front pads worn to 2 mm — replace immediately'], ['Tyres', 'Michelin Pilot Sport — 70% tread, OK'], ['Condition', `${Math.round(car.health / 10)}% · minor scuffs`],
        ['Boot', '⚠ The latch is broken — the boot springs open: a black case stamped with a CROW emblem, and bundles of cash. You shut it quickly.']],
      footer: 'Estimated work: ignition coil, brake pads, ECU reset',
    }, () => this.nextStep());
  }
  // E pressed by the player: returns true if the mission used it
  interact() {
    const g = this.g;
    if (this.talkQ.length && !g.cine.active) { this.talkT = 99; return true; }   // E skips a dialogue line
    const s = this.step; if (!s || !s.interact || g.cine.active) return false;
    const p = s.interact(this); if (!p) return false;
    if (dist2(g.player.focusPos, p) < s.r) { this.nextStep(); return true; }
    return false;
  }
  setMarker(pos, color = '#ffd23f', arrowOnly = false) {
    this.markerPos = pos; this.beam.visible = !!pos && !arrowOnly; this.arrow.visible = !!pos && arrowOnly;
    if (pos) { this.beam.position.copy(pos); const c = new THREE.Color(color); this.beamMat.color.setRGB(c.r * 2, c.g * 2, c.b * 2); }
  }
  update(dt) {
    const g = this.g, pl = g.player, markers = [];
    for (const k in this.actors) { const a = this.actors[k]; a.update(dt, 0); a.root.rotation.y = dampAngle(a.root.rotation.y, Math.atan2(pl.pos.x - a.root.position.x, pl.pos.z - a.root.position.z), 2, dt); }
    // dialogue queue
    if (this.talkQ.length && !g.cine.active && g.state === 'play') {
      const cur = this.talkQ[0];
      if (!cur.shown) { cur.shown = true; g.hud.subtitle(cur.who, cur.text, cur.dur + 1); this.talkT = 0; const sp = this.actors[cur.who.toLowerCase().split(' ')[0]]; if (sp) sp.setMode('talk'); }
      this.talkT += dt;
      if (this.talkT > cur.dur) { this.talkQ.shift(); for (const k in this.actors) this.actors[k].setMode('idle'); if (!this.talkQ.length) { g.hud.clearSubtitle(); const d = this.talkDone; this.talkDone = null; if (d) d(); } }
    }
    if (!this.active) { this.setMarker(null); g.hud.markers = markers; this.animMarker(); return; }
    const s = this.step;
    if (this.vars.job && this.vars.job.dead) { this.fail('The customer\'s car was destroyed.'); return; }
    if (!s || g.cine.active || s.talk || s.inspect || s.service) { g.hud.markers = markers; this.animMarker(); return; }
    if (s.interact) {
      const p = s.interact(this);
      if (p) { this.setMarker(p.clone().setY(p.y + 2.3), '#ffd23f', true); markers.push({ pos: p, color: '#ffd23f' }); }
      const near = !!p && dist2(pl.focusPos, p) < s.r;
      if (near !== this._near) { this._near = near; g.hud.prompt(near ? `<kbd>E</kbd> ${s.prompt}` : ''); }
    } else if (this._near) { this._near = false; g.hud.prompt(''); }
    if (s.enter) {
      const v = this.vars[s.enter];
      if (v && !v.removed) { this.setMarker(v.pos.clone().setY(v.t.H + 2), '#ffd23f', true); markers.push({ pos: v.pos, color: '#ffd23f' }); }
      if (pl.car === v) this.nextStep();
    } else if (s.route || s.goto) {
      const needCar = s.car ? this.vars[s.car] : null;
      const target = s.route ? s.route[this.cp] : s.goto();
      if (needCar && pl.car !== needCar) {
        g.hud.objective('Get back in the <b>' + needCar.t.name + '</b>.');
        this.setMarker(needCar.pos.clone().setY(needCar.t.H + 2), '#ffd23f', true); markers.push({ pos: needCar.pos, color: '#ffd23f' });
      } else {
        g.hud.objective(s.text + (s.route ? ` (${this.cp + 1}/${s.route.length})` : ''));
        this.setMarker(target); markers.push({ pos: target, color: '#ffd23f' });
        if (dist2(pl.focusPos, target) < s.r && (!s.goto || !pl.car || pl.car.speed < 4)) {
          AUDIO.blip(1100);
          if (s.route) { if (s.onCheckpoint) s.onCheckpoint(this, g, this.cp); this.cp++; if (this.cp >= s.route.length) this.nextStep(); }
          else this.nextStep();
        }
      }
    }
    g.hud.markers = markers;
    this.animMarker();
  }
  animMarker() {
    const t = this.g.time;
    if (this.beam.visible) { this.ring.scale.setScalar(1 + Math.sin(t * 3) * .08); this.beam.position.y = this.g.world.groundHeight(this.beam.position.x, this.beam.position.z); }
    if (this.arrow.visible && this.markerPos) { this.arrow.position.copy(this.markerPos); this.arrow.position.y += Math.sin(t * 3) * .25; this.arrow.rotation.y = t * 2; }
  }
  complete() {
    const g = this.g, M = this.active, pay = this.payout || M.reward;
    this.active = null; this.index++; this.timer = null; g.hud.setTimer(null); g.hud.objective(''); g.hud.prompt('');
    for (const k in this.actors) this.removeActor(k);
    g.addMoney(pay); g.addRep(M.rep || 0);
    g.hud.banner('JOB COMPLETE', `${M.title}   +₹${pay.toLocaleString('en-IN')} · +${M.rep} reputation`, '', 4.5);
    AUDIO.complete();
    setTimeout(() => g.hud.notify('<b>Free roam.</b> Upgrade your vehicles at Varma Performance Works (<kbd>E</kbd> at the shutter).<br>More Chapter 1 missions arrive in the next build.', 8), 4500);
    g.save();
  }
  fail(reason) {
    const g = this.g, M = this.active; if (!M) return;
    this.active = null; this.timer = null; g.hud.setTimer(null); g.hud.objective(''); g.hud.prompt(''); this.talkQ = [];
    g.hud.banner('JOB FAILED', reason, 'fail', 4); AUDIO.fail();
    if (this.vars.job && !this.vars.job.removed && this.vars.job !== g.player.car) this.vars.job.remove();
    for (const k in this.actors) this.removeActor(k);
    this.vars = {}; this.setMarker(null); this.shutterOpened = true;
    setTimeout(() => { if (!this.active && this.index < MISSIONS.length) this.startMission(this.index); }, 4500);
  }
  restart() { if (this.active) this.fail('Restarting job…'); }
}
