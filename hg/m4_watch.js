'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — Mission 4: "The Watchmaker" (heist). Brighton Beach, Brooklyn.
// Galina Petrova wants her family's Fabergé pocket watch back from Viktor
// Sorokin — tonight, during his daughter's wedding at the Odessa Palace.
// Eli works the room as a waiter, lifts the safe key during the toast, cracks
// the safe with Galina on the phone and walks out through the kitchen.
// ---------------------------------------------------------------------------
const M4 = { F: .05, UP: 4.6, H: 6.6 };

function buildHall(world, site) {
  const F = M4.F, UP = M4.UP, H = M4.H;
  const S = new GameSet(world, site, { x0: -24, x1: 26, y0: -1, y1: 9, z0: -22, z1: 46 }, { name: 'hall', ownFloor: [[-21, -15, 23, 15, 8]] });
  S.restricted = [[12, 2.2, 22, 14, -1, 2.5], [12, -15, 22, 15, 2.5, 9]];      // the service corridor and the whole upper floor: guests and waiters do not go there
  // ---- floors
  S.floor(-20.5, -14.5, 12, 14.5, F, 'carpet');
  S.V(-10, F, -6, 2, F + .02, 6, 'plank', '#8a5a34');                                        // dance floor
  S.S(-12, F, -14.3, 4, .38, -10.6, 'carpet', 'dais', '#6a1828');                             // head-table dais
  S.floor(12, -14.5, 22.5, 14.5, F, 'tile');
  // ---- walls
  const wc = '#e8dcc4';
  const PO = { sx: 3, sy: 7.2 };
  S.wallX(-14.5, -20.5, 22.5, F, H + .4, [], 'plaster', .3, undefined, PO); S.wallX(14.5, -20.5, 22.5, F, H + .4, [[-6.5, -1.5, 3.4]], 'plaster', .3, undefined, PO);
  S.wallZ(-20.5, -14.5, 14.5, F, H + .4, [], 'plaster', .3, undefined, PO); S.wallZ(22.5, -14.5, 14.5, F, H + .4, [[-5, -3.8, 2.3]], 'block', .3, '#9a968c');
  S.wallZ(12, -14.5, 14.5, F, UP, [[-12.5, -9, 2.3], [-8, -6.6, 2.3], [9, 10.2, 2.3]], 'plaster', .25, undefined, { sx: 3, sy: 7.2 });             // hall / kitchen + corridor (with the pass)
  S.wallX(2.2, 12, 22.5, F, UP, [[14, 15.2, 2.3]], 'block', .2, '#c8c0b0');                          // kitchen / corridor
  S.S(-20.5, H, -14.5, 12, H + .3, 14.5, 'paint', 'ceil', '#f0e6d0');                                  // hall ceiling
  for (let x = -18; x < 12; x += 6) S.V(x, H - .25, -14.5, x + .3, H, 14.5, 'gold', '#b8923a');          // coffered beams
  S.S(12, UP, -14.5, 22.5, UP + .3, 4.6, 'conc', 'upper', '#8a8274'); S.S(12, UP, 4.6, 19.2, UP + .3, 14.5, 'conc', 'upper', '#8a8274'); S.S(21.8, UP, 4.6, 22.5, UP + .3, 14.5, 'conc', 'upper', '#8a8274');   // upper floor (open over the stair)
  S.S(12, H + .4, -14.5, 22.5, H + .7, 14.5, 'conc', 'roof', '#5a5650');
  // ---- the pass between hall and kitchen, kitchen kit
  S.bar(11.6, -12.5, 12.5, -9, F, 1.05);
  for (const [x0, z0, x1, z1] of [[18, -14.2, 22.2, -12.6], [21, -12.6, 22.2, -4], [15, -4.5, 19, -3.4], [14, 1, 21, 2]]) S.S(x0, F, z0, x1, F + .92, z1, 'metal', 'counter', '#b8bcc0');
  for (let k = 0; k < 4; k++) S.V(18.3 + k, F + .92, -13.8, 19 + k, F + 1.1, -13.1, 'metal', '#333');   // stove tops
  S.light(17, UP - .3, -8, 0xfff4e4, 1.3, 12, 0, true);
  // ---- service stair up to Viktor's floor (restricted)
  S.stairs(19.2, 21.8, 13.6, 4.6, F, UP + .3, 18, 'conc');
  S.S(19, F, 4.4, 19.2, UP + .3, 13.8, 'block', 'wall', '#c8c0b0');
  S.light(16, UP - .3, 9, 0xfff0d8, .9, 9, 0, true);
  // ---- upper floor: balcony over the hall, corridor, Viktor's office with the safe
  S.V(11.95, UP + .3, -14.5, 12.05, UP + 1.3, 14.5, 'gold', '#c9a24a'); S.solids.push({ x0: 11.85, x1: 12.15, y0: UP + .3, y1: UP + 1.3, z0: -14.5, z1: 14.5, tag: 'rail', on: true });
  S.wallZ(15, -14.5, -3, UP + .3, H + .4, [[-6, -4.8, UP + 2.5]], 'plaster', .25, undefined, { sx: 3, sy: 4 }); S.wallX(-3, 15, 22.5, UP + .3, H + .4, [], 'plaster', .25);
  S.desk(18.5, UP + .3, -9, 2, .9, '#3a2418'); S.V(17.4, UP + .3, -7.8, 18.1, UP + 1.3, -7.2, 'cloth', '#4a1a1a');
  S.S(21.2, UP + .3, -12.6, 22.3, UP + 1.5, -11.2, 'metal', 'safe', '#2a2c30'); S.V(21.16, UP + .7, -12.1, 21.2, UP + 1.0, -11.7, 'gold', '#c9a24a');
  S.safeAt = V3(20.6, UP + .3, -11.9);
  S.sign('V. S.', 22.3, UP + 1.9, -9, -Math.PI / 2, 1.2, .5, '#3a2418', '#c9a24a');
  S.light(19, H - .1, -9, 0xffd8a0, 1.1, 9, 0, true);
  // ---- the banquet: round tables, head table, chandeliers
  S.tables = [[-15, -6], [-15, 2], [-15, 9.5], [6, -6], [6, 2], [6, 9.5], [-6, 10], [-1, 10]];
  S.tables.forEach(([x, z], i) => { S.table(x, F, z, .95, .76, '#f4efe4'); S.V(x - .12, F + .76, z - .12, x + .12, F + 1.05, z + .12, 'cloth', pick(['#d8586a', '#f0d0a0', '#e8e0f0'])); S.sign(String(i + 1), x, F + 1.2, z, 0, .3, .3, '#f4efe4', '#8a1c2c'); });
  S.S(-10.5, .38, -12.4, 2.5, 1.14, -11.4, 'cloth', 'headtable', '#f4efe4');
  for (let x = -10; x < 2.5; x += 1.6) S.V(x, 1.14, -12, x + .3, 1.5, -11.7, 'cloth', pick(['#ffffff', '#f0c0d0']));
  for (const [x, z] of [[-14, 0], [-4, 0], [6, 0], [-9, -9], [1, 9]]) { const ch = new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2, 1.4), toneMapped: false })); ch.position.set(x, H - 1.1, z); S.group.add(ch); }
  S.light(-14, H - 1.4, 0, 0xffe0b0, 1.6, 16); S.light(6, H - 1.4, 0, 0xffe0b0, 1.6, 16); S.light(-4, H - 1.4, -9, 0xffd8a8, 1.4, 14);
  S.sign('KATYA & MISHA', -4, 4.6, -14.3, 0, 5, .8, '#5a1428', '#f0d8a0', true);
  S.sign('ODESSA PALACE', -4, 5.4, 14.75, 0, 7, 1.1, '#120a10', '#ff5aa0', true);
  // ---- front: canopy and doors to the boardwalk
  S.V(-8, 3.2, 14.5, 0, 3.4, 17.5, 'metal', '#3a2a1a'); S.V(-6.5, F, 14.4, -1.5, 3.3, 14.6, 'glass', '#d8b06a');
  S.light(-4, 3.0, 16.5, 0xffc890, 1.0, 10, 0, false);
  // ---- the alley behind the kitchen
  S.V(22.6, F, -5.2, 22.7, 2.4, -3.6, 'metal', '#5a6a5a'); S.alleyDoor = V3(23.4, F, -4.4);
  for (const [x, z] of [[24.5, -8], [24.5, -10]]) S.S(x - .7, 0, z - .5, x + .7, 1.3, z + .5, 'metal', 'dumpster', '#2a5a3a');
  S.light(23.5, 3.2, -4.4, 0xffe0b0, .9, 10, 0, true);
  // ---- a bench on the boardwalk (where Galina waits)
  S.V(-2, .45, 39, 2, .52, 39.6, 'wood', '#6a4a2a'); S.V(-2, .52, 38.95, 2, 1.0, 39.05, 'wood', '#6a4a2a'); S.V(-1.9, 0, 39.1, -1.8, .45, 39.5, 'metal', '#222'); S.V(1.8, 0, 39.1, 1.9, .45, 39.5, 'metal', '#222');
  S.light(3, 4, 39, 0xffe8c0, .8, 12, 0, true);
  S.finish(); world.addSet(S); return S;
}

class Mission4 extends MissionBase {
  constructor(g) {
    super(g);
    const W = g.world, S = this.set = buildHall(W, W.site.hall), L = (x, y, z) => S.L(x, y, z); this.L = L;
    const rot = S.group.rotation.y, F = M4.F;
    this.galina = new Extra(g, 'galina'); this.galina.seatH = .5; dressUp(this.galina.h, { coat: '#2a2a30', scarf: '#5a1a24' });
    this.viktor = new Extra(g, 'viktor'); this.viktor.barkKey = 'VIKTOR'; this.extras = [];
    // guests at the tables, the couple, dancers, waiters
    S.tables.forEach(([x, z], i) => { const n = i % 3 === 0 ? 3 : 2; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + i, e = new Extra(g, Math.random() < .5 ? 'guestM' : 'guestF'); e.mode = 'sit'; e.seatH = .46; e.place(L(x + Math.sin(a) * 1.35, F, z + Math.cos(a) * 1.35), rot + a + Math.PI); this.extras.push(e); } });
    const bride = new Extra(g, 'bride'); bride.mode = 'sit'; bride.seatH = .46; bride.place(L(-5, .38, -12.9), rot); this.extras.push(bride);
    const groom = new Extra(g, 'guestM'); groom.mode = 'sit'; groom.seatH = .46; groom.place(L(-3.6, .38, -12.9), rot); this.extras.push(groom);
    for (const [x, z] of [[-7, -2], [-6, 1.5], [-2, -3], [-1, 2.5]]) { const e = new Extra(g, Math.random() < .5 ? 'guestM' : 'guestF'); e.mode = 'dance'; e.place(L(x, F, z), rot + Math.random() * 6); e.h.danceRate = 3.6 + Math.random(); this.extras.push(e); }
    this.waiters = [0, 1].map(k => { const e = new Extra(g, 'waiter'); e.mode = 'tray'; e.place(L(11, F, -7.3), rot); e.walkSpeed = 1.3; e.route = [L(11, F, -7.3), L(S.tables[k * 3 + 1][0] + 1.4, F, S.tables[k * 3 + 1][1]), L(-4, F, 7), L(11, F, -7.3)]; e.ri = k; this.extras.push(e); return e; });
    this.tray = new THREE.Group(); { const t = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 18), stdMat('#c8ccd0', { metalness: .8, roughness: .3 })); this.tray.add(t); for (let k = 0; k < 5; k++) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(.03, .02, .16, 8), new THREE.MeshStandardMaterial({ color: col('#f0e0b0'), transparent: true, opacity: .7, roughness: .05 })); gl.position.set(Math.cos(k * 1.3) * .12, .09, Math.sin(k * 1.3) * .12); this.tray.add(gl); } }
    // Viktor's men
    const barkKey = 'BRATVA', bark = { hear: "Who's up there?", alert: "Stop! Thief! Stop him!", body: "Kolya's down! Somebody is upstairs!", calm: "Nobody. Too much vodka." };
    const UP = M4.UP + .3;
    this.addGuard('bratva', L(14, F, 9.6), rot + Math.PI / 2, { bark, gun: 'pistol', range: 14, route: [{ p: L(13, F, 9.6), wait: 3.5, look: rot - Math.PI / 2 }, { p: L(14.6, F, 3.2), wait: 3, look: rot + Math.PI }] });
    this.addGuard('bratva', L(13.5, UP, 12), rot, { bark, gun: 'pistol', range: 15, route: [{ p: L(13.6, UP, 12.5), wait: 3, look: rot - Math.PI / 2 }, { p: L(13.6, UP, -1.5), wait: 3, look: rot - Math.PI / 2 }] });
    this.addGuard('bratva', L(13.2, UP, -10), rot - Math.PI / 2, { bark, gun: 'pistol', range: 13 });
    this.addGuard('bratva', L(-4, F, 13.2), rot + Math.PI, { bark, gun: 'pistol', range: 16 });
    this.addGuard('bratva', L(4.2, .38, -12.6), rot, { bark, gun: 'pistol', range: 12 });
    this.armed = [L(16, F, -6), L(17.5, F, -1), L(15, F, 6)].map(p => { const gd = this.addGuard('guestM', p, rot + Math.PI / 2, { bark, gun: 'pistol', range: 18, acc: .45 }); gd.show(false); gd.reserve = true; return gd; });
    for (const gd of this.guards) gd.home = { p: gd.pos.clone(), yaw: gd.yaw };
    this.hitScale = .6; this.alertMemory = 14;
    this.buildDialUI();
  }
  inRestricted(p) { const l = this.set.toLocal(p); return this.set.restricted.some(r => l.x > r[0] && l.x < r[2] && l.z > r[1] && l.z < r[3] && l.y > r[4] && l.y < r[5]); }
  // ---- the safe dial
  buildDialUI() {
    const d = this.dialEl = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;z-index:8;pointer-events:none;background:radial-gradient(ellipse at center, rgba(0,0,0,.25), rgba(0,0,0,.75))';
    d.innerHTML = '<canvas width="360" height="360" style="width:360px;height:360px"></canvas><div class="dl" style="font:600 15px Inter;color:#eee;margin-top:14px;text-align:center;text-shadow:0 1px 3px #000"></div>';
    document.body.appendChild(d); this.dialCv = d.querySelector('canvas'); this.dialTx = d.querySelector('.dl');
  }
  drawDial() {
    const c = this.dialCv.getContext('2d'), D = this.dial, R = 150;
    c.clearRect(0, 0, 360, 360); c.save(); c.translate(180, 180);
    c.fillStyle = '#1b1d20'; c.beginPath(); c.arc(0, 0, R + 12, 0, 7); c.fill();
    c.rotate(-D.v / 100 * Math.PI * 2);
    const gr = c.createRadialGradient(-40, -40, 10, 0, 0, R); gr.addColorStop(0, '#5a5e64'); gr.addColorStop(1, '#2a2d31'); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
    c.fillStyle = '#d8d2c0'; c.font = '700 15px "IBM Plex Mono"'; c.textAlign = 'center';
    for (let k = 0; k < 100; k++) { c.save(); c.rotate(k / 100 * Math.PI * 2); c.fillRect(-1, -R + 4, 2, k % 10 ? 8 : 16); if (k % 10 === 0) c.fillText(String(k), 0, -R + 36); c.restore(); }
    c.restore();
    c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(180, 14); c.lineTo(170, -2 + 14); c.lineTo(190, -2 + 14); c.closePath(); c.fill(); c.fillRect(178, 14, 4, 16);
    c.fillStyle = '#fff'; c.font = '400 34px "Bebas Neue"'; c.textAlign = 'center'; c.fillText(D.got.map(n => String(n).padStart(2, '0')).concat(['__', '__', '__']).slice(0, 3).join('  ·  '), 180, 192);
  }
  *crackSafe() {
    const g = this.g, I = g.input, pl = this.pl;
    const combo = [18, 96, 7 + Math.floor(Math.random() * 80)];
    this.dial = { v: 0, got: [], last: 0 }; this.dialEl.style.display = 'flex'; pl.locked = true; g.camLock = true;
    this.dialTx.innerHTML = '<kbd>Mouse</kbd> or <kbd>A</kbd> <kbd>D</kbd> turn the dial &nbsp; <kbd>E</kbd> stop on a number — listen for the heavy click';
    yield* this.say('GALINA_PHONE', "Eighteen. Ninety-six. The year my grandfather finished it. Viktor is sentimental about other people's things.");
    let warned = false;
    while (this.dial.got.length < 3) {
      const D = this.dial, before = Math.round(D.v);
      D.v = (D.v + I.dx * .04 + ((I.key('KeyD') ? 1 : 0) - (I.key('KeyA') ? 1 : 0)) * 12 / 60 + 100) % 100;
      const now = Math.round(D.v) % 100;
      if (now !== before % 100) { const want = combo[D.got.length], hit = now === want; HGA.dial(hit); if (hit) g.shake(.04, .1); }
      if (I.pressed('KeyE')) {
        if (now === combo[D.got.length]) { D.got.push(now); HGA.click(); if (D.got.length === 2 && !warned) { warned = true; this.sayAsync('GALINA_PHONE', "The last one I never knew. Listen. The click is heavier when the wheel falls into place."); } }
        else { HGA.dial(false); g.hud.hint('Not that one. Listen for the heavy click.', 2); }
      }
      this.drawDial(); yield null;
    }
    yield* this.sleep(.4); HGA.metal(); this.dialEl.style.display = 'none'; pl.locked = false; g.camLock = false;
  }
  restore(cp) {
    const g = this.g, S = this.set, L = this.L, pl = g.player, rot = S.group.rotation.y, F = M4.F;
    HGA.alarmOn = false; HGA.crowdV = .12; this.resetGuards(); for (const gd of this.guards) { gd.passive = false; if (gd.reserve) gd.show(false); }
    this.dialEl && (this.dialEl.style.display = 'none'); g.camLock = false; this.setTray(false); this.served = 0; this.cheer = 0; this.toast = false;
    this.viktor.place(L(-4.2, .38, -13.4), rot); this.viktor.mode = 'idle';
    this.galina.show(false);
    if (cp <= 1) pl.teleport(L(24.4, 0, -2.2), rot - Math.PI / 2, 'walk');
    if (cp === 2) pl.teleport(L(10.6, F, -7.3), rot - Math.PI / 2, 'walk');
    if (cp === 3) pl.teleport(L(-4.4, .38, -14), rot + Math.PI / 2, 'walk');
    if (cp >= 4) { pl.teleport(S.safeAt.clone().applyMatrix4(S.group.matrixWorld), rot + Math.PI / 2, 'walk'); }
    g.rig.yaw = pl.yaw; g.rig.pitch = .12; g.rig.snap();
  }
  setTray(on) { const pl = this.pl; if (on) { pl.h.root.add(this.tray); const hy = pl.h.seatOffset || .95; this.tray.position.set(-.26, hy + .68, .3); pl.pose = 'tray'; } else { if (this.tray.parent) this.tray.parent.remove(this.tray); pl.pose = null; } }
  *run(cp) {
    if (cp <= 0) yield* this.s0();
    if (cp <= 1) yield* this.s1();
    if (cp <= 2) yield* this.s2();
    if (cp <= 3) yield* this.s3();
    yield* this.s4();
  }
  *s0() { yield* this.cine(boardwalkCine(this.g, this)); this.restore(1); this.checkpoint(1); }
  // ---------- 1: work the room
  *s1() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl, F = M4.F;
    g.hud.show(true);
    this.objective('Go in through the kitchen. You are a waiter tonight.', L(22.6, 1.2, -4.4));
    yield* this.until(() => S.toLocal(pl.pos).x < 22);
    yield* this.say('WAITER', "You! New guy! You're late. Champagne for table four. Move!");
    const order = [3, 1, 6];
    for (let i = 0; i < 3; i++) {
      const tk = order[i], [tx, tz] = S.tables[tk];
      this.objective(`Pick up a tray at the pass. (${i}/3 tables served)`, L(12.8, 1.4, -10.7));
      g.hud.hint('Waiters can go anywhere guests can. Upstairs and the service stair are off limits — up there, you are a trespasser.', 7);
      yield* this.pressE(L(12.4, F, -10.7), 1.9, 'Pick up the tray');
      this.setTray(true); HGA.glass();
      this.objective(`Serve table ${tk + 1}. (${i}/3)`, L(tx, 1.4, tz));
      yield* this.pressE(L(tx, F, tz), 2.1, `Serve table ${tk + 1}`);
      this.setTray(false); HGA.glass(); setTimeout(() => HGA.glass(), 180); this.served = i + 1;
      if (i === 0) this.sayAsync('ELI', "Viktor's at the head table. Key's on a chain around his neck. Two of his men up on the balcony.");
    }
    this.checkpoint(2);
  }
  // ---------- 2: the toast; lift the key
  *s2() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl, I = g.input;
    this.objective('Viktor is about to make a toast. Get behind him.', L(-4.3, 1.4, -14));
    HGA.crowdV = .16;
    yield* this.until(() => !this.talking);
    this.viktor.mode = 'talk'; this.toast = true;
    yield* this.say('VIKTOR', "Friends! Family! Quiet, quiet. Tonight my Katya makes her father an old man.");
    HGA.clap(14);
    yield* this.say('VIKTOR', "Misha. You take care of her, or you answer to me. To Katya and Misha!");
    yield* this.say('ALL', "Gorko! Gorko! Gorko!");
    this.objective('Lift the key from his chain — only while the room is shouting.', L(-4.2, 1.6, -13.4));
    g.hud.hint('Hold <kbd>E</kbd> behind Viktor while the guests shout "Gorko!". Stop when they stop.', 8);
    let hold = 0, strikes = 0, cycleT = 0;
    this.promptBusy = true;
    yield* this.until(() => {
      cycleT += 1 / 60; const loud = (cycleT % 6.5) < 3; this.cheer = loud ? 1 : 0;
      if (loud && (cycleT % 6.5) < 1 / 60 * 1.5) { HGA.clap(40); this.bark(null, "Gorko! Gorko!", 'ALL'); }
      HGA.crowdV = loud ? .32 : .14;
      const near = pl.pos.distanceTo(L(-4.2, .38, -14)) < 1.25;
      g.hud.prompt(near ? (loud ? `<kbd>E</kbd> hold — lift the key ${hold > 0 ? '<i class="pg" style="--p:' + Math.round(hold / 2 * 100) + '%"></i>' : ''}` : 'Wait for the cheer…') : '');
      if (near && I.key('KeyE')) {
        if (loud) hold += 1 / 60;
        else { strikes++; hold = 0; this.viktor.yaw += .8; g.hud.hint(strikes < 3 ? 'He felt that. Wait for the noise.' : '', 2); if (strikes >= 3) { this.fail('Viktor caught your hand on his chain.'); return true; } I.keys.delete('KeyE'); }
      }
      return hold >= 2;
    });
    this.promptBusy = false; g.hud.prompt(''); if (this.failed) return;
    HGA.click(); HGA.crowdV = .2; this.cheer = 0; this.viktor.mode = 'drink';
    yield* this.say('ELI', "Got the key. Going upstairs.");
    this.checkpoint(3);
  }
  // ---------- 3: upstairs, the safe
  *s3() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl;
    this.viktor.mode = 'drink'; HGA.crowdV = .2;
    this.objective("Get upstairs to Viktor's office. Don't be seen up there.", L(15.2, M4.UP + 1.5, -5.4));
    g.hud.hint('<kbd>C</kbd> crouch · take a guard down from behind with <kbd>E</kbd> — upstairs nobody below can see it.', 6);
    yield* this.until(() => { const l = S.toLocal(pl.pos); return l.x > 15.3 && l.z < -3.2 && l.y > M4.UP; });
    this.objective('Open the safe.', L(21, M4.UP + 1, -11.9));
    yield* this.pressE(S.safeAt.clone().applyMatrix4(S.group.matrixWorld), 1.6, 'Use the key, then work the dial');
    HGA.click();
    yield* this.say('ELI', "Key's in. There's a dial.");
    yield* this.crackSafe();
    yield* this.say('GALINA_PHONE', "Is it there? The watch, gold, a swan on the lid?");
    yield* this.say('ELI', "There's a swan.");
    yield* this.say('GALINA_PHONE', "Then now you run, swimmer.");
    this.checkpoint(4);
  }
  // ---------- 4: the party turns
  *s4() {
    const g = this.g, S = this.set, L = this.L, pl = this.pl;
    yield* this.sleep(.8);
    this.bark(null, "My key! Where is my key? Find the waiter!", 'VIKTOR');
    for (const gd of this.armed) { gd.show(true); gd.reserve = false; }
    for (const gd of this.guards) if (!gd.down && gd.vis) gd.alarm(pl.pos, 'scripted');
    this.hidden = false; HGA.crowdV = .34;
    for (const e of this.extras) if (e.mode === 'dance' || e.mode === 'tray') e.mode = 'cower';
    this.objective('Get out through the kitchen to the alley.', S.alleyDoor.clone().applyMatrix4(S.group.matrixWorld).setY(1.2));
    yield* this.until(() => S.toLocal(pl.pos).x > 23);
    yield* this.until(() => !this.talking);
    yield* this.cine(watchOutroCine(g, this));
    this.finish();
  }
  tick(dt) {
    const g = this.g, pl = this.pl;
    if (this.cp >= 1 && this.cp < 4 && !this.anyAlert()) this.hidden = !this.inRestricted(pl.pos) && !this.inRestricted(pl.pos.clone().setY(pl.pos.y + 1));
    else this.hidden = false;
    for (const gd of this.guards) gd.update(dt);
    for (const e of this.extras) {
      if (e.route && !e.target && g.state === 'play' && this.cp < 4) { e.ri = (e.ri + 1) % e.route.length; e.goTo(e.route[e.ri], 1.25); }
      if (this.toast && e.mode === 'sit') e.yaw = dampAngle(e.yaw, Math.atan2(this.viktor.pos.x - e.pos.x, this.viktor.pos.z - e.pos.z), 1, dt);
      e.update(dt);
    }
    this.viktor.update(dt); this.galina.update(dt);
    if (this.cheer && Math.random() < .03) HGA.glass();
  }
  endStat() { return `The Sorokin watch, 1896 — recovered  ·  ${this.takedowns || 0} of Viktor's men put to sleep  ·  ${Math.max(1, Math.round((this.t - this.startTime) / 60))} min`; }
  titleCam(t, cam) { const S = this.set, a = Math.sin(t * .05) * .6; const c = S.L(-2, 0, 20); cam.position.set(c.x + Math.sin(a) * 40, 9, c.z + 30 + Math.cos(a) * 8); cam.lookAt(c.x, 4, c.z - 10); cam.fov = 52; }
}

// ---------------- cutscenes ----------------
function boardwalkCine(g, m) {
  const S = m.set, pl = g.player, ga = m.galina, L = m.L, rot = S.group.rotation.y;
  return {
    enter: c => { g.hud.show(false); ga.show(true); ga.mode = 'sit'; ga.place(L(-.6, 0, 39.3), rot); pl.h.root.visible = true; pl.h.setMode('idle'); pl.h.root.position.copy(L(1.5, 0, 40)); pl.h.root.rotation.set(0, rot - Math.PI / 2 + .35, 0); HGA.crowdV = .04; },
    update: (c, dt) => { pl.h.update(dt, 0); ga.update(dt); },
    shots: [
      { dur: 5.5, keepFade: true, enter: c => g.hud.fade(1, 0), cam: { from: L(-30, 6, 70), look: L(0, 3, 30) }, title: [.5, 'THE WATCHMAKER', 'BRIGHTON BEACH, BROOKLYN  ·  9:50 PM', 'hg', 4.6] },
      { dur: 8.5, fadeIn: 1.4, cam: () => ({ from: L(-14, 3, 52), to: L(-6, 2.2, 45), look: L(0, 1, 39), fov: 44, ease: 'sine' }),
        lines: [ln(1.2, 'GALINA', "You are the swimmer. Deacon says you get into places."), ln(5, 'ELI', "And you get things open.")] },
      { dur: 12, cam: () => ({ from: L(2.6, 1.6, 41.2), to: L(2.4, 1.6, 40.9), look: L(-.6, 1.1, 39.4), fov: 40 }),
        lines: [ln(.4, 'GALINA', "I used to. Now I teach. Viktor Sorokin has something of mine. A pocket watch. Fabergé, eighteen ninety-six."), ln(7, 'ELI', "He stole it?"), ln(8.4, 'GALINA', "He won it. From my husband. At cards, with a gun on the table.")] },
      { dur: 11, cam: () => ({ from: L(-2.4, 1.4, 41.4), to: L(-2.2, 1.4, 41), look: L(1.5, 1.55, 40), fov: 42 }),
        lines: [ln(.3, 'GALINA', "Tonight his daughter gets married at the Odessa Palace. Four hundred guests. Every one of them is family, or armed. Usually both."), ln(7.4, 'ELI', "And the watch?")] },
      { dur: 12.5, fadeOut: 1, cam: () => ({ from: L(.4, 2.2, 44), to: L(.2, 2.1, 43), look: L(0, 1.2, 38.8), fov: 46 }),
        lines: [ln(.3, 'GALINA', "In his safe, upstairs. He wears the key on a chain. The rest I give you when you are standing in front of it."), ln(6.6, 'ELI', "You don't trust me."), ln(7.8, 'GALINA', "I don't know you. Bring me the watch, and I join your little crew. That is the deal Deacon wanted.")] },
      { dur: 4.5, keepFade: true, enter: c => { g.hud.fade(1, 0); ga.show(false); m.restore(1); }, fadeIn: 1, cam: () => ({ from: L(30, 3, 2), to: L(27, 2.6, -1), look: L(22, 1.4, -4.4), fov: 50 }), title: [.4, 'THE ODESSA PALACE', 'THE SOROKIN WEDDING', 'hg', 3.4] },
    ],
    exit: c => { },
  };
}
function watchOutroCine(g, m) {
  const S = m.set, pl = g.player, ga = m.galina, L = m.L, rot = S.group.rotation.y;
  const watch = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .015, 20), stdMat('#d8b04a', { metalness: .9, roughness: .2 })); watch.rotation.x = Math.PI / 2;
  return {
    enter: c => { g.hud.show(false); HGA.crowdV = .03; for (const gd of m.guards) gd.passive = true; ga.show(true); ga.mode = 'idle'; ga.place(L(-.6, 0, 40.6), rot + Math.PI / 2); pl.h.root.position.copy(L(.8, 0, 40.6)); pl.h.root.rotation.set(0, rot - Math.PI / 2, 0); pl.h.setMode('idle'); },
    update: (c, dt) => { pl.h.update(dt, 0); ga.update(dt); },
    shots: [
      { dur: 4, fadeIn: .8, cam: () => ({ from: L(-6, 2.4, 34), to: L(-5, 2.2, 35), look: L(0, 1.2, 40.5), fov: 46 }) },
      { dur: 10, cam: () => ({ from: L(1.7, 1.6, 41.8), to: L(1.5, 1.6, 41.5), look: L(-.6, 1.45, 40.6), fov: 38 }),
        enter: c => { ga.h.root.add(watch); watch.position.set(0, (ga.h.seatOffset || .9) + .12, .32); ga.mode = 'cuffed'; },
        lines: [ln(.6, 'GALINA', "Eighteen ninety-six. It still keeps time. Better than anybody I know."), ln(5.6, 'ELI', "So. Do we have a deal?")] },
      { dur: 7, fadeOut: 1.6, cam: () => ({ from: L(-10, 4, 48), to: L(-14, 6, 54), look: L(0, 1.5, 40.6), fov: 46 }),
        lines: [ln(.4, 'GALINA', "We have a beginning. Tell Deacon I want the good chair.")] },
    ],
    exit: c => { if (watch.parent) watch.parent.remove(watch); },
  };
}

HG_MISSIONS[4] = {
  n: 4, title: 'THE WATCHMAKER', place: 'Brighton Beach, Brooklyn', area: 'brighton', cls: Mission4, look: CAST.eliWaiter, gear: 'street',
  world: { area: 'brighton', weather: 'night', flood: false, b7: false, liberty: false, litP: .3, lamps: true, water: -.6, center: [-178, 286], view: 900, propR: 400, carR: 260,
    sites: [{ name: 'hall', label: 'ODESSA PALACE', x: -178, z: 286, rot: 0, clear: [[-24, -20, 26, 22]] }] },
  leash: { x: -178, z: 300, r: 170, msg: 'Stay on the job. The Odessa Palace is right here.' },
  insetTitle: 'BRIGHTON BEACH — THE SOROKIN WEDDING',
  loading: 'Loading Brighton Beach, the Odessa Palace and four hundred guests...',
  blurb: 'Galina Petrova has her grandfather\'s watch back, and the crew has a safecracker. Viktor Sorokin has a son-in-law, a hangover, and an empty safe.',
};
