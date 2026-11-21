'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — game shell: renderer + noir grade, input, HUD, storm audio,
// title screen, pause, checkpoints, fail / complete screens.
// ---------------------------------------------------------------------------
class HGInput {
  constructor(canvas) {
    this.keys = new Set(); this.down = new Set(); this.dx = 0; this.dy = 0; this.drag = false;
    addEventListener('keydown', e => { if (!this.keys.has(e.code)) this.down.add(e.code); this.keys.add(e.code); if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', e => { if (document.pointerLockElement || this.drag) { this.dx += e.movementX; this.dy += e.movementY; } });
    canvas.addEventListener('mousedown', () => { if (!document.pointerLockElement) this.drag = true; });
    addEventListener('mouseup', () => this.drag = false);
  }
  key(c) { return this.keys.has(c); }
  pressed(c) { return this.down.has(c); }
  end() { this.down.clear(); this.dx = this.dy = 0; }
}

const HGGrade = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, uw: { value: 0 }, flash: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, uw, flash; uniform vec2 res; varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      uv += vec2(sin(uv.y * 38.0 + time * 2.1), cos(uv.x * 33.0 + time * 1.6)) * .0018 * uw;
      vec2 d = uv - .5; float ca = .0024 * length(d) * 2.0;
      vec3 c = vec3(texture2D(tDiffuse, uv + d * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d * ca).b);
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(vec3(l), c, .8);                                                       // a little desaturated
      c = mix(c, c * vec3(.84, .97, 1.14), 1.0 - smoothstep(0.0, .35, l));          // cold shadows
      c = mix(c, c * vec3(1.1, 1.0, .88), smoothstep(.45, 1.0, l) * .45);            // warm practicals
      c = mix(c, c * vec3(.5, .92, .8) + vec3(0.0, .018, .015), uw);                // murky flood water
      c = pow(max(c, 0.0), vec3(1.0 / 2.2));
      c = (c - .5) * 1.1 + .5;
      c *= 1.0 - dot(d, d) * (1.25 + uw * 1.1);
      float n = fract(sin(dot(vUv * res + fract(time) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - .5) * .045;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// ---------------- storm / water sound design (on top of the shared AUDIO effects bus) ----------------
const HGA = {
  ready: false, hbT: 0,
  init() {
    if (this.ready || !AUDIO.ready) return; const C = AUDIO.ctx;
    AUDIO.sfx.disconnect(); this.lp = C.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; AUDIO.sfx.connect(this.lp); this.lp.connect(AUDIO.master);
    const loop = (filterType, f, dest, q = 1) => { const n = AUDIO.noiseSrc(), fl = C.createBiquadFilter(), g = C.createGain(); fl.type = filterType; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; n.connect(fl); fl.connect(g); g.connect(dest); n.start(); return [g, fl]; };
    [this.rainG] = loop('highpass', 1300, AUDIO.sfx);
    [this.windG, this.windF] = loop('lowpass', 450, AUDIO.sfx);
    [this.uwG] = loop('lowpass', 170, AUDIO.master);
    [this.crowdG, this.crowdF] = loop('bandpass', 520, AUDIO.sfx, 1.4);       // a room full of people talking
    [this.fireG] = loop('lowpass', 900, AUDIO.sfx);                            // fire roar
    [this.humG] = loop('lowpass', 120, AUDIO.sfx);                             // tunnel fans, the city's hum
    this.motG = C.createGain(); this.motG.gain.value = 0;
    const o1 = C.createOscillator(), o2 = C.createOscillator(), mf = C.createBiquadFilter(); o1.type = 'sawtooth'; o1.frequency.value = 44; o2.type = 'square'; o2.frequency.value = 89; mf.type = 'lowpass'; mf.frequency.value = 380;
    o1.connect(mf); o2.connect(mf); mf.connect(this.motG); this.motG.connect(AUDIO.sfx); o1.start(); o2.start(); this.motO = [o1, o2];
    this.alG = C.createGain(); this.alG.gain.value = 0; const ao = C.createOscillator(); ao.type = 'square'; ao.frequency.value = 880; const af = C.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 1100; ao.connect(af); af.connect(this.alG); this.alG.connect(AUDIO.sfx); ao.start(); this.alO = ao;
    this.ready = true;
  },
  update(dt, s) {
    if (!this.ready) return; const t = AUDIO.ctx.currentTime, W = s.weather || HG_WEATHER.storm;
    this.lp.frequency.setTargetAtTime(s.under ? 520 : 20000, t, .08);
    this.rainG.gain.setTargetAtTime(s.under || s.deep ? 0 : (s.indoor ? .035 : .13) * W.rain, t, .3);
    const wind = s.high ? .2 : (W.rain > 0 ? .11 : .05);
    this.windG.gain.setTargetAtTime(s.under || s.deep ? 0 : (s.indoor ? .04 : wind) * (.75 + .25 * Math.sin(t * .37) + .15 * Math.sin(t * 1.3)), t, .5);
    this.windF.frequency.setTargetAtTime(380 + 160 * Math.sin(t * .23), t, .5);
    this.uwG.gain.setTargetAtTime(s.under ? .26 : 0, t, .15);
    this.crowdG.gain.setTargetAtTime(s.under ? 0 : (this.crowdV || 0) * (.85 + .15 * Math.sin(t * 1.7) * Math.sin(t * .6)), t, .4);
    this.crowdF.frequency.setTargetAtTime(480 + 120 * Math.sin(t * 2.3) * Math.sin(t * .9), t, .1);
    this.fireG.gain.setTargetAtTime((this.fireV || 0) * (.8 + Math.random() * .4), t, .08);
    this.humG.gain.setTargetAtTime(s.under ? 0 : (this.humV || 0), t, .5);
    if (this.alarmOn) { this.alO.frequency.setTargetAtTime((t * 1.4) % 1 < .5 ? 760 : 1040, t, .02); this.alG.gain.setTargetAtTime(.05, t, .05); } else this.alG.gain.setTargetAtTime(0, t, .2);
    if (s.breath < .32 && s.playing) { this.hbT -= dt; if (this.hbT <= 0) { this.hbT = lerp(.42, .95, s.breath / .32); this.heart(); } }
  },
  motor(v, pitch = 1) { if (this.ready) { this.motG.gain.setTargetAtTime(v * .06, AUDIO.ctx.currentTime, .3); this.motO[0].frequency.setTargetAtTime(44 * pitch, AUDIO.ctx.currentTime, .2); this.motO[1].frequency.setTargetAtTime(89 * pitch, AUDIO.ctx.currentTime, .2); } },
  burst(f, d, v, type = 'lowpass', q = 1, dest) {
    if (!AUDIO.ready) return; const C = AUDIO.ctx, t = C.currentTime, n = AUDIO.noiseSrc(), fl = C.createBiquadFilter(), g = C.createGain();
    fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    n.connect(fl); fl.connect(g); g.connect(dest || AUDIO.sfx); n.start(t); n.stop(t + d + .1);
  },
  thunder(s = 1) { if (!AUDIO.ready) return; this.burst(2600, .25, .35 * s, 'highpass'); this.burst(160, 3.8, .9 * s); setTimeout(() => this.burst(90, 2.6, .55 * s), 350); AUDIO.tone(38, 2.8, .4 * s, 'sine', 26); },
  arc(s) { for (let k = 0; k < 5; k++) setTimeout(() => this.burst(3200, .07, .3 * s, 'bandpass', 3), k * 60 + Math.random() * 40); setTimeout(() => this.burst(120, 1, .5 * s), 120); },
  bubbles() { if (!AUDIO.ready) return; for (let k = 0; k < 5; k++) setTimeout(() => AUDIO.tone(300 + Math.random() * 500, .08, .05, 'sine', 900 + Math.random() * 600), k * 70 + Math.random() * 50); },
  gasp() { this.burst(1500, .45, .32, 'bandpass', 1.2); },
  plunge() { this.burst(700, .45, .3); this.bubbles(); },
  splash(v = 1) { this.burst(1800, .3, .18 * v, 'bandpass', .8); },
  squelch() { this.burst(2600, .12, .18, 'bandpass', 2); AUDIO.tone(1250, .06, .05, 'square'); },
  groan(v = 1) { AUDIO.tone(42, 2.6, .45 * v, 'sawtooth', 26); this.burst(110, 2.4, .5 * v); },
  knock() { for (let k = 0; k < 3; k++) setTimeout(() => AUDIO.thud(), k * 260); },
  thud() { AUDIO.thud(); },
  doorBreak() { AUDIO.crash(12); this.burst(900, .5, .5); },
  click() { AUDIO.blip(1500); },
  heart() { AUDIO.tone(55, .12, .3, 'sine', 40); setTimeout(() => AUDIO.tone(50, .14, .22, 'sine', 36), 170); },
  gunshot(v = 1) { if (!AUDIO.ready) return; this.burst(2600, .07, .55 * v, 'highpass'); this.burst(420, .45, .8 * v); AUDIO.tone(95, .16, .45 * v, 'square', 40); },
  hurt() { AUDIO.tone(70, .16, .4, 'sine', 40); this.burst(500, .12, .3); },
  choke() { this.burst(260, .5, .35, 'lowpass'); setTimeout(() => this.burst(700, .15, .2, 'bandpass'), 200); },
  ping() { AUDIO.tone(1760, .09, .1, 'sine'); setTimeout(() => AUDIO.tone(2350, .14, .08, 'sine'), 110); },
  clap(n = 30) { for (let k = 0; k < n; k++) setTimeout(() => this.burst(1500 + Math.random() * 900, .05, .06 + Math.random() * .05, 'bandpass', 1.5), Math.random() * 2400); },
  glass() { AUDIO.tone(2600 + Math.random() * 500, .5, .05, 'sine', 2550); },
  screech() { if (!AUDIO.ready) return; AUDIO.tone(1400, 1.2, .12, 'sawtooth', 900); this.burst(3000, 1.1, .25, 'bandpass', 4); },
  engineRev() { AUDIO.tone(70, 1.1, .3, 'sawtooth', 150); this.burst(200, 1, .3); },
  crash() { AUDIO.crash(18); this.burst(300, 1.2, .8); },
  flashbang() { this.burst(300, 1.6, 1); this.burst(3000, .4, .6, 'highpass'); AUDIO.tone(3600, 3.2, .06, 'sine', 3500); },
  dial(hit) { AUDIO.tone(hit ? 900 : 2200, hit ? .05 : .025, hit ? .16 : .05, 'square'); if (hit) this.burst(400, .1, .2); },
  door() { AUDIO.door(); },
  metal() { this.burst(1200, .4, .3, 'bandpass', 3); AUDIO.tone(340, .5, .1, 'triangle', 300); },
  boom() { this.burst(160, 2.4, 1); AUDIO.tone(48, 2, .8, 'sine', 26); },
};

// ---------------- HUD ----------------
class HGHud {
  constructor(g) {
    const $ = id => document.getElementById(id); this.g = g; this.$ = $;
    this.el = { hud: $('hud'), obj: $('objective'), prompt: $('prompt'), hint: $('hint'), sub: $('subtitle'), fade: $('fade'), lb: $('letterbox'), title: $('title-card'), marker: $('marker'), eli: $('breath-eli'), nia: $('breath-nia'), cp: $('checkpoint'), uw: $('underwater'), flash: $('flash'), hurt: $('hurt'), det: $('detect') };
    this.timers = {}; this.markerPos = null; this.marks = []; this.hurtF = 0; this.followerOf = null;
    this.dctx = this.el.det.getContext('2d');
  }
  show(on) { this.el.hud.classList.toggle('hidden', !on); }
  fade(v, dur = .5) { const f = this.el.fade; f.style.transition = `opacity ${dur}s ease`; f.style.opacity = v; }
  letterbox(on) { this.el.lb.classList.toggle('on', on); }
  title(main, sub, style, dur = 4) {
    const t = this.el.title; t.className = 'show ' + (style || ''); t.querySelector('.tc-main').textContent = main; t.querySelector('.tc-sub').textContent = sub || '';
    clearTimeout(this.timers.t); this.timers.t = setTimeout(() => t.className = style || '', dur * 1000);
  }
  clearTitle() { this.el.title.className = ''; }
  subtitle(who, line, dur = 3.5) {
    VOICE.line(who, line);
    if (/EARPIECE|PHONE|SOF · RADIO|HALCYON · RADIO|KESSLER/.test(who)) HGA.squelch();
    const s = this.el.sub; s.querySelector('.who').textContent = who; s.querySelector('.line').textContent = line; s.classList.add('show'); s.classList.toggle('radio', isRadio(who));
    clearTimeout(this.timers.s); this.timers.s = setTimeout(() => s.classList.remove('show'), dur * 1000);
  }
  clearSubtitle() { this.el.sub.classList.remove('show'); }
  objective(t) { this.el.obj.innerHTML = t ? '<b>' + t + '</b>' : ''; this.el.obj.classList.remove('pop'); void this.el.obj.offsetWidth; if (t) this.el.obj.classList.add('pop'); }
  prompt(h) { if (this._p === h) return; this._p = h; this.el.prompt.innerHTML = h || ''; this.el.prompt.style.opacity = h ? 1 : 0; }
  hint(h, dur = 5) { const e = this.el.hint; e.innerHTML = h; e.style.opacity = 1; clearTimeout(this.timers.h); this.timers.h = setTimeout(() => e.style.opacity = 0, dur * 1000); }
  checkpoint() { const c = this.el.cp; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show'); }
  nia(on, label) { this.el.nia.classList.toggle('hidden', !on); if (label) this.el.nia.querySelector('label').textContent = label; }
  follower(f) { this.followerOf = f; this.nia(!!f, f ? f.label : 'NIA'); }
  marker(p) { this.markerPos = p; }
  hurt(a) { this.hurtF = Math.min(1, this.hurtF + .5 + a); }
  mark(actor, secs) { this.marks = this.marks.filter(m => m.a !== actor); this.marks.push({ a: actor, until: this.g.time + secs }); }
  drawDetect() {
    const c = this.el.det, x = this.dctx, g = this.g, M = g.mission, W = innerWidth, H = innerHeight;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    x.clearRect(0, 0, W, H);
    if (g.state !== 'play' || g.cine.active) return;
    const cam = g.camera, cx = W / 2, cy = H / 2, v = V3();
    for (const gd of (M.guards || [])) {
      if (gd.down || !gd.vis || gd.sus < .03) continue;
      v.copy(gd.pos); v.y += 2.15; v.project(cam);
      const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, alert = gd.state === 'alert';
      const colr = alert ? '#ff3a2a' : gd.sus > .6 ? '#ff9a2a' : '#f2e6c8';
      if (on) {   // ? / ! over the guard
        const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
        x.font = '800 22px Inter'; x.textAlign = 'center'; x.fillStyle = colr; x.globalAlpha = Math.min(1, .3 + gd.sus);
        x.fillText(alert ? '!' : '?', sx, sy); x.globalAlpha = 1;
        x.strokeStyle = colr; x.lineWidth = 3; x.beginPath(); x.arc(sx, sy - 7, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, gd.sus)); x.stroke();
      } else {    // an arc at the edge of a ring pointing at him
        const rel = gd.pos.clone().sub(cam.position), f = V3(); cam.getWorldDirection(f);
        const right = V3().crossVectors(f, V3(0, 1, 0)).normalize(), a = Math.atan2(rel.dot(right), rel.x * f.x + rel.z * f.z);
        const R = Math.min(W, H) * .2; x.strokeStyle = colr; x.lineWidth = 6; x.globalAlpha = Math.min(1, .35 + gd.sus);
        x.beginPath(); x.arc(cx, cy, R, a - Math.PI / 2 - .22, a - Math.PI / 2 + .22); x.stroke(); x.globalAlpha = 1;
      }
    }
    // Static's marks (seen through walls)
    this.marks = this.marks.filter(m => m.until > g.time && !m.a.down);
    for (const m of this.marks) {
      v.copy(m.a.pos); v.y += 1.0; v.project(cam); if (v.z > 1) continue;
      const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H, k = Math.min(1, (m.until - g.time) / 1.5);
      x.globalAlpha = k * .9; x.strokeStyle = '#6fe0ff'; x.lineWidth = 2; x.beginPath(); x.moveTo(sx, sy - 34); x.lineTo(sx + 14, sy); x.lineTo(sx, sy + 34); x.lineTo(sx - 14, sy); x.closePath(); x.stroke();
      x.fillStyle = '#6fe0ff'; x.font = '600 11px "IBM Plex Mono"'; x.textAlign = 'center'; x.fillText(Math.round(m.a.pos.distanceTo(g.player.pos)) + ' m', sx, sy + 50); x.globalAlpha = 1;
    }
  }
  update(dt) {
    const g = this.g, pl = g.player, W = g.world, f = this.followerOf;
    const showB = pl.breath < .995 || W.underwater || pl.tow || (f && f.breath < .995);
    this.el.eli.closest('.b').classList.toggle('vis', !!showB);
    this.el.eli.style.width = (pl.breath * 100) + '%'; this.el.eli.classList.toggle('low', pl.breath < .3);
    const fb = f ? f.breath : pl.niaBreath;
    this.el.nia.querySelector('b').style.width = (fb * 100) + '%'; this.el.nia.classList.toggle('low', fb < .35);
    this.el.uw.style.opacity = W.underwater ? 1 : 0;
    this.el.flash.style.opacity = W.underwater ? 0 : W.flash * .18 + (this.flashbang || 0);
    if (this.flashbang) this.flashbang = Math.max(0, this.flashbang - dt * .45);
    this.hurtF = Math.max(0, this.hurtF - dt * 1.6);
    this.el.hurt.style.opacity = Math.min(1, (1 - pl.hp) * .85 + this.hurtF * .5);
    this.drawDetect();
    const m = this.el.marker;
    if (this.markerPos && g.state === 'play') {
      const v = this.markerPos.clone().project(g.camera), behind = v.z > 1;
      let x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
      if (behind) { x = innerWidth - x; y = innerHeight - 40; }
      x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60);
      m.style.transform = `translate(${x}px, ${y}px)`; m.style.opacity = 1;
      m.querySelector('.d').textContent = Math.round(this.markerPos.distanceTo(pl.pos)) + ' m';
    } else m.style.opacity = 0;
  }
}

// ---------------- the game ----------------
class HGGame {
  constructor(M) {
    const cfg = this.cfg = HG_MISSIONS[M]; this.M = M;
    const canvas = this.canvas = document.getElementById('game');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.basePR = Math.min(devicePixelRatio, 1.25); this.pr = this.basePR; this.ftAvg = 1 / 60;
    r.setPixelRatio(this.pr); r.setSize(innerWidth, innerHeight);
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = (HG_WEATHER[cfg.world.weather] || HG_WEATHER.storm).exposure;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false; this.frameNo = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 9000);
    this.input = new HGInput(canvas);
    this.lang = 'vo'; this.state = 'title'; this.time = 0; this.shakeA = 0; this.shakeT = 0;
    this.world = new NYCWorld(this.scene, cfg.world);
    this.hud = new HGHud(this);
    this.rig = new DiverRig(this, this.camera);
    this.player = new Diver(this, cfg.look, cfg.gear);
    this.cine = new Cinematic(this);
    FX.init(this);
    this.leash = cfg.leash || null;
    this.mission = new cfg.cls(this);
    this.map = new NYCMapView(this);
    this.setupPost();
    this.mission.restore(0); this.player.h.root.visible = false; if (this.mission.rafael) this.mission.rafael.show(false);
    addEventListener('resize', () => this.resize());
    this.bindUI();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  setupPost() {
    if (!THREE.EffectComposer) { this.composer = null; return; }
    this.composer = new THREE.EffectComposer(this.renderer); this.composer.setPixelRatio(this.pr);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .95, .6, .74); this.composer.addPass(this.bloom);
    this.grade = new THREE.ShaderPass(HGGrade); this.grade.uniforms.res.value.set(innerWidth, innerHeight); this.composer.addPass(this.grade);
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.composer) { this.composer.setSize(w, h); this.grade.uniforms.res.value.set(w, h); } }
  lock() { if (this.state === 'play') { const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } }
  // ---- saves: { cur: {m, cp}, done: {1: true, ...} }
  loadSave() {
    let s = null; try { s = JSON.parse(localStorage.getItem('hellgate_save2')); } catch (e) { }
    if (!s) { s = { cur: null, done: {} }; try { const o = JSON.parse(localStorage.getItem('hellgate_save')); if (o) { if (o.done) s.done[1] = true; else if (o.cp > 1) s.cur = { m: 1, cp: o.cp }; } } catch (e) { } }
    return s;
  }
  writeSave(s) { try { localStorage.setItem('hellgate_save2', JSON.stringify(s)); } catch (e) { } }
  saveCP(n) { const s = this.loadSave(); s.cur = { m: this.M, cp: n }; this.writeSave(s); }
  bindUI() {
    const $ = id => document.getElementById(id), cfg = this.cfg, save = this.loadSave();
    $('splash-mission').innerHTML = `<span>MISSION ${this.M}</span> ${cfg.title} — ${cfg.place}`;
    $('btn-play').textContent = 'PLAY MISSION ' + this.M;
    const list = $('missions'); list.innerHTML = '';
    for (const k of Object.keys(HG_MISSIONS).map(Number).sort((a, b) => a - b)) {
      const m = HG_MISSIONS[k], b = document.createElement('button');
      b.className = 'ms' + (k === this.M ? ' on' : '') + (save.done[k] ? ' done' : '');
      b.innerHTML = `<i>${k}</i><b>${m.title}</b><em>${m.place}</em>${save.done[k] ? '<s>✓</s>' : ''}`;
      b.onclick = () => { if (k !== this.M) location.search = '?m=' + k; };
      list.appendChild(b);
    }
    if (save.cur && save.cur.m === this.M && save.cur.cp > 1) { $('btn-continue').classList.remove('hidden'); $('btn-continue').textContent = 'CONTINUE — CHECKPOINT ' + save.cur.cp; }
    $('btn-play').onclick = () => this.begin(0);
    $('btn-continue').onclick = () => { const s = this.loadSave(); this.begin(s.cur && s.cur.m === this.M ? s.cur.cp : 0); };
    $('btn-map').onclick = () => this.map.toggle(true);
    $('btn-resume').onclick = () => this.resume();
    $('btn-restart').onclick = () => { this.resume(); this.mission.start(Math.max(1, this.mission.cp)); };
    $('btn-pmap').onclick = () => this.map.toggle(true);
    $('btn-quit').onclick = () => location.reload();
    $('btn-retry').onclick = () => { $('fail').classList.add('hidden'); this.state = 'play'; this.mission.start(Math.max(1, this.mission.cp)); this.lock(); };
    $('btn-again').onclick = () => location.reload();
    $('btn-endmap').onclick = () => this.map.toggle(true);
    this.canvas.addEventListener('click', () => this.lock());
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.state === 'play' && !this.ignoreUnlock) this.pause(); });
  }
  begin(cp) {
    AUDIO.init(); VOICE.warm(); HGA.init();
    document.getElementById('splash').classList.add('hidden');
    this.player.h.root.visible = true; this.state = 'play';
    this.mission.start(cp); this.hud.show(cp > 0); this.lock();
  }
  playCinematic(script, cb) { this.state = 'cine'; this.cine.play(script, () => { this.state = 'play'; this.rig.snap(); this.lock(); if (cb) cb(); }); }
  pause() { if (this.state !== 'play') return; this.state = 'paused'; document.getElementById('pause').classList.remove('hidden'); }
  resume() { document.getElementById('pause').classList.add('hidden'); if (this.state === 'paused') { this.state = 'play'; this.clock.getDelta(); this.lock(); } }
  failMission(reason) {
    this.state = 'fail'; this.ignoreUnlock = true; document.exitPointerLock && document.exitPointerLock(); setTimeout(() => this.ignoreUnlock = false, 300);
    VOICE.stop(); HGA.alarmOn = false; this.hud.fade(1, 1.6);
    setTimeout(() => { const f = document.getElementById('fail'); f.querySelector('.why').textContent = reason; f.classList.remove('hidden'); this.hud.fade(0, .4); }, 1700);
  }
  complete() {
    this.state = 'end'; this.ignoreUnlock = true; document.exitPointerLock && document.exitPointerLock(); HGA.alarmOn = false; HGA.crowdV = 0; HGA.fireV = 0;
    const s = this.loadSave(); s.done[this.M] = true; s.cur = null; this.writeSave(s);
    const e = document.getElementById('end'), cfg = this.cfg, nx = HG_MISSIONS[this.M + 1];
    e.querySelector('.kicker').textContent = `MISSION ${this.M} COMPLETE`; e.querySelector('.big').textContent = cfg.title;
    e.querySelector('.stat').textContent = this.mission.endStat ? this.mission.endStat() : '';
    e.querySelector('p').innerHTML = cfg.blurb || '';
    const nb = document.getElementById('btn-next');
    if (nx) { e.querySelector('.next').textContent = `NEXT — MISSION ${nx.n}: ${nx.title} · ${nx.place}`; nb.classList.remove('hidden'); nb.textContent = 'PLAY MISSION ' + nx.n; nb.onclick = () => location.search = '?m=' + nx.n; }
    else { e.querySelector('.next').textContent = cfg.nextText || 'TO BE CONTINUED'; nb.classList.add('hidden'); }
    e.classList.remove('hidden'); this.hud.show(false); this.hud.fade(0, 1);
  }
  shake(a, dur) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = Math.max(this.shakeT, dur); }
  // attract-mode camera on the title screen
  titleCam(t) {
    const cam = this.camera;
    if (this.mission.titleCam) this.mission.titleCam(t, cam);
    else { const c = this.world.center, a = t * .04; cam.position.set(c.x + Math.sin(a) * 90, 40, c.z + Math.cos(a) * 90); cam.lookAt(c.x, 8, c.z); cam.fov = 52; }
    cam.updateProjectionMatrix();
  }
  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), .05); this.time += dt;
    this.ftAvg = lerp(this.ftAvg, dt, .05);
    if (this.ftAvg > 1 / 38 && this.pr > .7) { this.pr = Math.max(.7, this.pr - .05); this.renderer.setPixelRatio(this.pr); if (this.composer) this.composer.setPixelRatio(this.pr); this.resize(); }
    const I = this.input;
    if (I.pressed('KeyM') && (this.state === 'play' || this.state === 'paused' || this.map.open)) this.map.toggle();
    if (I.pressed('Escape') && this.map.open) this.map.toggle(false);
    const playing = this.state === 'play' || this.state === 'cine';
    if (playing) {
      if (this.state === 'play' && !this.map.open) { this.player.update(dt); this.rig.update(dt); }
      if (this.state === 'cine') this.cine.update(dt, I);
      this.mission.update(dt);
    } else if (this.state === 'title') this.titleCam(this.time);
    if (this.state !== 'paused') {
      const W = this.world, cp = this.camera.position;
      let indoor = false, deep = false; for (const s of W.sets) if (s.inside(cp)) { if (s.roofed !== false) indoor = true; if (s.underground) deep = true; }
      W.indoor = indoor; W.roofed = indoor; W.deep = deep;
      W.update(dt, cp);
      if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeA * Math.min(1, this.shakeT); cp.x += (Math.random() - .5) * a * .25; cp.y += (Math.random() - .5) * a * .2; this.camera.rotation.z += (Math.random() - .5) * a * .02; } else this.shakeA = 0;
      HGA.update(dt, { under: W.underwater, indoor, deep, high: cp.y > 120, weather: W.W, breath: this.player.breath, playing: this.state === 'play' });
      this.hud.update(dt);
      if (this.map.open) this.map.draw();
    }
    this.frameNo++; this.renderer.shadowMap.needsUpdate = (this.frameNo & 1) === 0 || this.world.flash > 0;   // shadows every other frame (always during lightning)
    if (this.composer) { this.grade.uniforms.time.value = this.time; this.grade.uniforms.uw.value = damp(this.grade.uniforms.uw.value, this.world.underwater ? 1 : 0, 10, dt); this.composer.render(); }
    else this.renderer.render(this.scene, this.camera);
    I.end();
  }
}

// ---------------- boot ----------------
(async function boot() {
  const btn = document.getElementById('btn-play'), msg = document.getElementById('loading'); btn.disabled = true;
  const q = new URLSearchParams(location.search), M = HG_MISSIONS[+q.get('m')] ? +q.get('m') : 1, cfg = HG_MISSIONS[M];
  document.title = 'HELL GATE — ' + M + ' ' + cfg.title;
  try { await Promise.race([Promise.all([document.fonts.load('64px "Bebas Neue"'), document.fonts.load('16px "Inter"'), document.fonts.load('16px "IBM Plex Mono"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  msg.textContent = cfg.loading || 'Loading New York...';
  // only this mission's voice clips
  for (const k in VO_DATA.lines) { const v = VO_DATA.lines[k]; if ((v.m || 1) !== M && !v.shared) delete VO_DATA.lines[k]; else LINE_KEYS[k] = k; }
  VOICE.preload();
  try {
    await Promise.all([loadHumans(), loadNYC(cfg.world)]);
    window.GAME = new HGGame(M);
    btn.disabled = false; msg.textContent = '';
  } catch (e) { console.error(e); msg.textContent = 'Failed to start: ' + e.message; }
})();
