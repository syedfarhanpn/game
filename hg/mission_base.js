'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — what every mission shares: scripted steps (generators that yield
// conditions), voiced dialogue with a queue for background lines, checkpoints,
// objectives with a marker, failing, stealth takedowns, Static's camera ping.
// ---------------------------------------------------------------------------
const WHO_ALL = {
  ELI: 'ELI', RAFAEL: 'RAFAEL', RAFAEL_RADIO: 'RAFAEL · RADIO', NIA: 'NIA', NIA_FAR: "A CHILD'S VOICE", CAPTAIN: 'CAPT. REYES', CAPTAIN_RADIO: 'CAPT. REYES · RADIO', DISPATCH: 'DISPATCH',
  DEACON: 'DEACON', SOF: 'SOF', SOF_RADIO: 'SOF · RADIO', STATIC: 'STATIC · EARPIECE', GALINA: 'GALINA', GALINA_PHONE: 'GALINA · PHONE', IRIS: 'IRIS', LUCIA: 'LUCÍA',
  HAROLD: 'HAROLD', VIKTOR: 'VIKTOR', CRANE: 'JULIAN CRANE', KESSLER_RADIO: 'KESSLER · RADIO', THUG: 'THUG', THUG2: 'THUG', CO: 'GUARD', CO2: 'GUARD', BRATVA: 'GUARD', BRATVA2: 'GUARD',
  HALCYON: 'HALCYON', HALCYON2: 'HALCYON', HALCYON_RADIO: 'HALCYON · RADIO', DRIVER: 'DRIVER', GUEST: 'GUEST', MC: 'MASTER OF CEREMONIES', ALL: 'GUESTS', WAITER: 'HEAD WAITER', KATYA: 'KATYA',
};
const isRadio = who => /RADIO|DISPATCH|EARPIECE|PHONE/.test(who);
const HG_MISSIONS = {};       // filled by each mission file: { n, title, area, world: {...}, cls, ... }

class MissionBase {
  constructor(g) {
    this.g = g; this.t = 0; this.cp = 0; this.gen = null; this.wait = null; this.talking = false; this.queue = []; this.startTime = 0;
    this.guards = []; this.marks = []; this.pingCD = 0; this.lastBark = -9; this.hidden = false; this.target = null;
  }
  get W() { return this.g.world; }
  get pl() { return this.g.player; }
  // ---- dialogue
  lineInfo(text, key) {
    const v = VO_DATA.lines[text], k = key || (v ? v.who : 'ELI'), who = WHO_ALL[k] || (typeof WHO !== 'undefined' && WHO[k]) || k;
    return { who, d: v ? v.d : Math.max(1.6, text.length * .065), radio: isRadio(who) || /RADIO|DISPATCH/.test(k) };
  }
  *say(a, b, pad = .3) {
    const text = b === undefined ? a : b, key = b === undefined ? null : a;
    while (this.talking) yield null;
    const i = this.lineInfo(text, key); this.talking = true;
    if (i.radio) HGA.squelch();
    this.g.hud.subtitle(i.who, text, i.d + .8);
    const end = this.t + i.d + pad + (i.radio ? .15 : 0);
    yield () => this.t >= end;
    this.talking = false;
  }
  sayAsync(a, b) { this.queue.push(b === undefined ? [a] : [a, b]); }
  bark(actor, text, key) {
    if (this.talking || this.t - this.lastBark < 2.2 || this.g.cine.active) return;
    if (actor && actor.pos.distanceTo(this.pl.pos) > 32) return;
    this.lastBark = this.t; const i = this.lineInfo(text, key || (actor && actor.barkKey)); this.g.hud.subtitle(i.who, text, i.d + .6);
  }
  *sleep(s) { const end = this.t + s; yield () => this.t >= end; }
  *until(fn) { while (!fn()) yield null; }
  *cine(script) { let done = false; this.g.playCinematic(script, () => { done = true; }); while (!done) yield null; }
  checkpoint(n) { this.cp = n; this.g.saveCP(n); if (n > 1) this.g.hud.checkpoint(); }
  objective(text, at) { this.g.hud.objective(text); this.target = at || null; }
  // ---- flow
  restore(cp) { }
  start(cp = 0) {
    this.cp = cp; this.failed = false; this.done = false; this.wait = null; this.talking = false; this.queue = []; this.bg = null; this.bgWait = null;
    const pl = this.pl; pl.hp = 1; pl.breath = 1; pl.drownT = 0; pl.locked = false; pl.hurtT = 99;
    this.restore(cp); this.gen = this.run(cp); if (!cp) this.startTime = this.t;
  }
  *run(cp) { }
  fail(reason) { if (this.failed || this.done) return; this.failed = true; this.g.failMission(reason); }
  finish() { this.done = true; this.g.complete(); }
  tick(dt) { }
  failChecks() { }
  update(dt) {
    this.t += dt;
    const g = this.g, pl = g.player;
    this.tick(dt);
    // background lines (radio calls, shouts) between the scripted ones
    if (!this.bg && !this.talking && this.queue.length && !g.cine.active) { const q = this.queue.shift(); this.bg = this.say(q[0], q[1]); this.bgWait = null; }
    if (this.bg && (!this.bgWait || this.bgWait())) { const r = this.bg.next(); if (r.done) { this.bg = null; this.bgWait = null; } else this.bgWait = typeof r.value === 'function' ? r.value : null; }
    if (this.gen && !this.failed) {
      for (let k = 0; k < 4; k++) {
        if (this.wait) { if (!this.wait()) break; this.wait = null; }
        const r = this.gen.next(); if (r.done) { this.gen = null; break; }
        if (typeof r.value === 'function') this.wait = r.value; else break;
      }
    }
    if (g.state === 'play' && !g.cine.active) {
      if (pl.drownT > 3.2) this.fail('Eli drowned.');
      if (pl.hp <= 0) this.fail(this.deathText || 'Eli was shot.');
      this.failChecks();
    }
    if (this.guards.length && g.state === 'play' && !g.cine.active) this.stealthTick(dt);
    else if (this.guards.length) g.hud.prompt('');
    if (this.staticPing) this.pingTick(dt);
    FX.update(dt);
    g.hud.marker(g.cine.active ? null : this.target);
  }
  // ---- stealth: take a guard down from behind (E), unseen
  stealthTick(dt) {
    const g = this.g, pl = g.player, I = g.input;
    if (this.takeT > 0) { this.takeT -= dt; if (this.takeT <= 0) pl.locked = false; return; }
    if (this.noTakedown || pl.mode !== 'walk' || this.promptBusy) return;
    let best = null, bd = 1.7;
    for (const gd of this.guards) {
      if (gd.down || !gd.vis || gd.state === 'alert' || gd.passive) continue;
      const d = gd.pos.distanceTo(pl.pos); if (d > bd || Math.abs(gd.pos.y - pl.pos.y) > .8) continue;
      const to = pl.pos.clone().sub(gd.pos).setY(0).normalize(), behind = to.dot(gd.fwd) < .25;
      if (behind || gd.sus < .25) { best = gd; bd = d; }
    }
    g.hud.prompt(best ? '<kbd>E</kbd> Take him down' : '');
    if (best && I.pressed('KeyE')) {
      g.hud.prompt(''); pl.locked = true; this.takeT = .8; pl.vel.set(0, 0, 0);
      pl.yaw = Math.atan2(best.pos.x - pl.pos.x, best.pos.z - pl.pos.z); pl.h.punch && pl.h.punch();
      HGA.choke(); setTimeout(() => HGA.thud(), 420); best.takedown();
      this.takedowns = (this.takedowns || 0) + 1;
    }
  }
  // ---- Static sees every camera: Q marks the guards nearby for a few seconds
  pingTick(dt) {
    const g = this.g; this.pingCD -= dt;
    if (g.state === 'play' && g.input.pressed('KeyQ') && !g.cine.active) {
      if (this.pingCD > 0) g.hud.hint('Static is still rerouting the cameras… ' + Math.ceil(this.pingCD) + ' s', 1.5);
      else { this.pingCD = 12; HGA.ping(); for (const gd of this.guards) if (!gd.down && gd.vis && gd.pos.distanceTo(this.pl.pos) < 110) g.hud.mark(gd, 8); }
    }
  }
  // a guard spotted Eli: by default everyone close by joins in
  onAlarm(src) { for (const gd of this.guards) if (gd !== src && !gd.down && gd.pos.distanceTo(src.pos) < 30) gd.alarm(src.lastSeen, 'radio'); }
  addGuard(look, p, yaw, o = {}) { const gd = new Guard(this.g, look, o); gd.place(p, yaw); this.guards.push(gd); return gd; }
  resetGuards() { for (const gd of this.guards) { gd.down = false; gd.found = false; gd.state = 'patrol'; gd.sus = 0; gd.ri = 0; gd.waitT = 0; gd.mode = 'rifle'; gd.lastSeen = null; gd.show(true); if (gd.gun) gd.gun.visible = true; if (gd.home) gd.place(gd.home.p, gd.home.yaw); } }
  aliveGuards() { return this.guards.filter(g => !g.down && g.vis); }
  anyAlert() { return this.guards.some(g => !g.down && g.vis && g.state === 'alert'); }
  // hold E near a point: returns a step that completes after `secs`
  *holdE(at, r, label, secs = 1.6, sound) {
    let hold = 0; const I = this.g.input;
    this.promptBusy = true;
    yield* this.until(() => {
      const near = this.pl.pos.distanceTo(at) < r && this.g.state === 'play';
      this.g.hud.prompt(near ? `<kbd>E</kbd> hold — ${label} ${hold > 0 ? '<i class="pg" style="--p:' + Math.round(hold / secs * 100) + '%"></i>' : ''}` : '');
      if (near && I.key('KeyE')) { hold += 1 / 60; if (sound && Math.random() < .07) sound(); } else hold = Math.max(0, hold - 1 / 60);
      return hold >= secs;
    });
    this.g.hud.prompt(''); this.promptBusy = false;
  }
  // press E near a point
  *pressE(at, r, label) {
    const I = this.g.input; this.promptBusy = true;
    yield* this.until(() => { const near = this.pl.pos.distanceTo(at) < r && this.g.state === 'play'; this.g.hud.prompt(near ? `<kbd>E</kbd> ${label}` : ''); return near && I.pressed('KeyE'); });
    this.g.hud.prompt(''); this.promptBusy = false;
  }
}
// a cutscene line with a speaker key: [time, display name, text, duration]
function ln(t, key, text, d) { const v = VO_DATA.lines[text]; return [t, WHO_ALL[key] || key, text, d || (v ? v.d + .5 : 3.4)]; }
