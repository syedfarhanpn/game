'use strict';
// ---------------------------------------------------------------------------
// Cinematic engine: shot list with eased camera moves, letterbox, fades,
// title cards, subtitles, actors and per-shot scripting. Hold SPACE to skip.
// ---------------------------------------------------------------------------
const EASES = { linear: t => t, inout: ease, out: easeOut, in: t => t * t * t, sine: t => .5 - Math.cos(t * Math.PI) / 2 };
const toV = a => a instanceof THREE.Vector3 ? a.clone() : V3(a[0], a[1], a[2]);

class Cinematic {
  constructor(game) { this.g = game; this.active = false; this.actors = []; this.skipHold = 0; this.ring = document.getElementById('skip-ring'); }

  play(script, onDone) {
    const g = this.g;
    this.script = script; this.onDone = onDone; this.idx = -1; this.active = true; this.actors = []; this.cars = [];
    this.skipHold = 0;
    g.hud.letterbox(script.letterbox !== false);
    if (script.enter) script.enter(this);
    this.next();
  }
  next() {
    const g = this.g;
    this.idx++;
    const shots = this.script.shots;
    if (this.idx >= shots.length) return this.finish();
    const s = this.shot = shots[this.idx];
    this.t = 0; this.fired = new Set(); this.fadedOut = false;
    if (s.enter) s.enter(this);
    this.camDef = typeof s.cam === 'function' ? s.cam(this) : s.cam;
    if (this.camDef) {
      const c = this.camDef;
      this.cFrom = toV(c.from); this.cTo = toV(c.to || c.from);
      this.lFrom = toV(c.look); this.lTo = toV(c.lookTo || c.look);
      this.fFrom = c.fov || 50; this.fTo = c.fovTo || this.fFrom; this.easeFn = EASES[c.ease || 'inout'];
    }
    if (s.fadeIn) { g.hud.fade(1, 0); setTimeout(() => g.hud.fade(0, s.fadeIn === true ? 1 : s.fadeIn), 30); }
    else if (!s.keepFade) g.hud.fade(0, .25);
    if (s.whoosh) AUDIO.whoosh();
    if (s.boom) AUDIO.boom();
    this.applyCam(0, 0);
  }
  applyCam(k, dt) {
    const cam = this.g.camera, s = this.shot;
    if (s.path) { s.path(this, k, this.t, cam); }
    else if (this.camDef) {
      const e = this.easeFn(k);
      cam.position.lerpVectors(this.cFrom, this.cTo, e);
      const l = V3().lerpVectors(this.lFrom, this.lTo, e);
      if (this.camDef.shake) { const a = this.camDef.shake; cam.position.x += Math.sin(this.t * 1.7) * a; cam.position.y += Math.sin(this.t * 2.3) * a * .6; }
      cam.lookAt(l);
      cam.fov = lerp(this.fFrom, this.fTo, e);
    }
    cam.updateProjectionMatrix();
  }
  update(dt, input) {
    if (!this.active) return;
    const g = this.g, s = this.shot;
    this.t += dt;
    this.animateActors(dt);
    if (this.script.update) this.script.update(this, dt);
    const k = clamp(this.t / s.dur, 0, 1);
    if (s.tick) s.tick(this, this.t, dt, k);
    if (!this.active) return; // tick may finish
    this.applyCam(k, dt);
    for (const [i, L] of (s.lines || []).entries()) {
      if (this.t >= L[0] && !this.fired.has('l' + i)) { this.fired.add('l' + i); g.hud.subtitle(L[1], L[2], L[3] || 3.4); }
    }
    if (s.title && this.t >= s.title[0] && !this.fired.has('title')) { this.fired.add('title'); g.hud.title(s.title[1], s.title[2], s.title[3] || '', s.title[4] || 4); }
    if (s.fadeOut && !this.fadedOut && this.t >= s.dur - (s.fadeOut === true ? .8 : s.fadeOut)) { this.fadedOut = true; g.hud.fade(1, s.fadeOut === true ? .8 : s.fadeOut); }
    if (this.t >= s.dur) { if (s.exit) s.exit(this); this.next(); }
    // skip handling
    if (this.script.skippable !== false && input.key('Space')) {
      this.skipHold += dt; this.ring.style.display = 'block'; this.ring.style.setProperty('--p', Math.min(100, this.skipHold * 100) + '%');
      if (this.skipHold > 1) { this.ring.style.display = 'none'; this.skip(); }
    } else { this.skipHold = 0; this.ring.style.display = 'none'; }
  }
  skip() {
    if (!this.active) return;
    const shots = this.script.shots;
    for (let i = this.idx; i < shots.length; i++) { if (shots[i].onSkip) shots[i].onSkip(this); }
    if (this.script.onSkip) this.script.onSkip(this);
    this.finish();
  }
  finish() {
    if (!this.active) return;
    const g = this.g;
    VOICE.stop();
    this.active = false;
    for (const a of this.actors) g.scene.remove(a.root);
    for (const c of this.cars) if (c.role === 'cine') c.remove();
    this.actors = []; this.cars = [];
    g.hud.letterbox(false); g.hud.clearTitle(); g.hud.clearSubtitle();
    g.hud.fade(0, .6);
    this.ring.style.display = 'none';
    if (this.script.exit) this.script.exit(this);
    const cb = this.onDone; this.onDone = null;
    if (cb) cb();
  }
  // ----- helpers for scripts
  actor(opts, pos, rotY = 0, mode = 'idle') {
    const h = makeHuman(opts); h.root.position.copy(toV(pos)); h.root.rotation.y = rotY; h.setMode(mode);
    this.g.scene.add(h.root); this.actors.push(h); return h;
  }
  car(type, pos, heading, color, keep) {
    const v = this.g.addVehicle(type, toV(pos), heading, keep ? 'mission' : 'cine', color);
    v.driver = 'cine'; this.cars.push(v); return v;
  }
  animateActors(dt) { for (const a of this.actors) a.update(dt, a.walkSpeed || 0); }
}
