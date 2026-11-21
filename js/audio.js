'use strict';
// ---------------------------------------------------------------------------
// Audio: synthesized sound effects (engine, sirens, impacts, city/sea ambience)
// and spoken dialogue (pre-generated voice files + speech synthesis). No music.
// ---------------------------------------------------------------------------
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// No music in this game (by request): sound effects and spoken dialogue only.
const STATIONS = [{ name: 'OFF' }];
const THEME = null;

class AudioSys {
  constructor() { this.ready = false; this.station = 0; this.radioOn = false; this.track = null; }

  init() {
    if (this.ready) return;
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = 0.85;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(C.destination);
    this.sfx = C.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.voice = C.createGain(); this.voice.gain.value = 1.15; this.voice.connect(this.master);   // dialogue bus
    // reverb
    this.reverb = C.createConvolver(); this.reverb.buffer = this.impulse(2.6);
    this.revSend = C.createGain(); this.revSend.gain.value = 0.35; this.revSend.connect(this.reverb); this.reverb.connect(this.master);
    this.noise = this.makeNoise();
    this.ready = true;
    this.initEngine(); this.initSiren(); this.initAmbience(); this.initRotor();
  }

  impulse(sec) {
    const C = this.ctx, len = C.sampleRate * sec, b = C.createBuffer(2, len, C.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  makeNoise() {
    const C = this.ctx, b = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }

  // ---------------- music: removed (kept as no-ops so old calls are harmless) ----------------
  playTrack() { } stopMusic() { } radioMuffle() { } radioPlay() { } radioNext() { return null; }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }

  // ---------------- spoken dialogue ----------------
  // duck the effects while someone is talking so the line is clear
  duck(on) { if (this.ready) this.sfx.gain.setTargetAtTime(on ? .45 : .9, this.ctx.currentTime, on ? .08 : .4); }
  // play a decoded voice clip; pan/volume give a rough sense of where the speaker is
  playVoice(buf, { vol = 1, pan = 0, rate = 1, onend } = {}) {
    if (!this.ready || !buf) { if (onend) onend(); return null; }
    const C = this.ctx, src = C.createBufferSource(), g = C.createGain();
    src.buffer = buf; src.playbackRate.value = rate; g.gain.value = vol;
    let node = g; if (C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    src.connect(g); node.connect(this.voice); src.onended = () => { if (onend) onend(); };
    src.start(); return src;
  }

  // ---------------- continuous sounds ----------------
  initEngine() {
    const C = this.ctx;
    this.engO1 = C.createOscillator(); this.engO1.type = 'sawtooth';
    this.engO2 = C.createOscillator(); this.engO2.type = 'square';
    this.engF = C.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 600;
    this.engG = C.createGain(); this.engG.gain.value = 0;
    const g2 = C.createGain(); g2.gain.value = .5;
    this.engO1.connect(this.engF); this.engO2.connect(g2); g2.connect(this.engF); this.engF.connect(this.engG); this.engG.connect(this.sfx);
    this.engO1.start(); this.engO2.start();
    // tyre screech
    this.scr = this.noiseSrc(); this.scrF = C.createBiquadFilter(); this.scrF.type = 'bandpass'; this.scrF.frequency.value = 2400; this.scrF.Q.value = 6;
    this.scrG = C.createGain(); this.scrG.gain.value = 0; this.scr.connect(this.scrF); this.scrF.connect(this.scrG); this.scrG.connect(this.sfx); this.scr.start();
  }
  engine(on, speedRatio, throttle) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const g = Math.min(Math.abs(speedRatio) * 5, 4.999), gear = Math.floor(g), rpm = .25 + (g - gear) * .75 * (gear === 0 ? 1 : .8) + (gear ? .15 : 0);
    const f = 38 + rpm * 120 + gear * 6;
    this.engO1.frequency.setTargetAtTime(f, t, .05); this.engO2.frequency.setTargetAtTime(f * .5, t, .05);
    this.engF.frequency.setTargetAtTime(300 + throttle * 900 + rpm * 600, t, .08);
    this.engG.gain.setTargetAtTime(on ? .05 + throttle * .07 : 0, t, .1);
  }
  screech(v) { if (this.ready) this.scrG.gain.setTargetAtTime(clamp(v, 0, 1) * .12, this.ctx.currentTime, .05); }

  initSiren() {
    const C = this.ctx;
    this.sirO = C.createOscillator(); this.sirO.type = 'triangle'; this.sirO.frequency.value = 900;
    this.sirL = C.createOscillator(); this.sirL.frequency.value = .35; this.sirLG = C.createGain(); this.sirLG.gain.value = 380;
    this.sirL.connect(this.sirLG); this.sirLG.connect(this.sirO.frequency);
    this.sirG = C.createGain(); this.sirG.gain.value = 0; this.sirO.connect(this.sirG); this.sirG.connect(this.sfx); this.sirG.connect(this.revSend);
    this.sirO.start(); this.sirL.start();
  }
  siren(v) { if (this.ready) this.sirG.gain.setTargetAtTime(clamp(v, 0, 1) * .07, this.ctx.currentTime, .2); }

  initAmbience() {
    const C = this.ctx, n = this.noiseSrc(), f = C.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 400;
    this.ambG = C.createGain(); this.ambG.gain.value = 0;
    n.connect(f); f.connect(this.ambG); this.ambG.connect(this.sfx); n.start();
    // ocean waves
    const n2 = this.noiseSrc(), f2 = C.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 700;
    this.waveG = C.createGain(); this.waveG.gain.value = 0;
    n2.connect(f2); f2.connect(this.waveG); this.waveG.connect(this.sfx); n2.start();
  }
  ambience(city, ocean, time) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.ambG.gain.setTargetAtTime(city * .05, t, .5);
    this.waveG.gain.setTargetAtTime(ocean * (.05 + .04 * Math.sin(time * .7)), t, .3);
  }
  initRotor() {
    const C = this.ctx, n = this.noiseSrc(), f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 250;
    this.rotG = C.createGain(); this.rotG.gain.value = 0;
    const am = C.createGain(); am.gain.value = 0;
    const lfo = C.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 13; const lg = C.createGain(); lg.gain.value = .5;
    lfo.connect(lg); lg.connect(am.gain);
    n.connect(f); f.connect(am); am.connect(this.rotG); this.rotG.connect(this.sfx); n.start(); lfo.start();
  }
  rotor(v) { if (this.ready) this.rotG.gain.setTargetAtTime(clamp(v, 0, 1) * .5, this.ctx.currentTime, .3); }

  // ---------------- one-shots ----------------
  burst(freq, dur, v, type = 'lowpass', q = 1) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime, n = this.noiseSrc(), f = C.createBiquadFilter(), g = C.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.env(g, t, .003, v, dur); n.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.revSend); n.start(t); n.stop(t + dur + .1);
  }
  tone(freq, dur, v, type = 'sine', slideTo) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime, o = C.createOscillator(), g = C.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    this.env(g, t, .005, v, dur); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + .05);
  }
  crash(i) { this.burst(500 + i * 40, .35 + i * .02, clamp(i / 15, .2, 1)); this.tone(80, .3, clamp(i / 25, .1, .6), 'square', 40); }
  punch() { this.burst(900, .08, .7); this.tone(120, .1, .5, 'sine', 60); }
  thud() { this.burst(300, .2, .8); this.tone(90, .2, .6, 'sine', 40); }
  gunshot(v = 1) { this.burst(1500, .25, .9 * v, 'lowpass'); this.tone(160, .12, .5 * v, 'square', 50); }
  door() { this.burst(700, .1, .5); this.tone(200, .08, .3, 'square', 120); }
  horn() { this.tone(392, .35, .18, 'square'); this.tone(494, .35, .14, 'square'); }
  blip(f = 880) { this.tone(f, .08, .12, 'square'); }
  explosion() { this.burst(200, 1.6, 1); this.tone(60, 1.2, .9, 'sawtooth', 25); }
  star() { this.tone(1200, .12, .15, 'square'); setTimeout(() => this.tone(800, .15, .15, 'square'), 120); }
  whoosh() { if (!this.ready) return; const C = this.ctx, t = C.currentTime, n = this.noiseSrc(), f = C.createBiquadFilter(), g = C.createGain(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + .8); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 1); n.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.revSend); n.start(t); n.stop(t + 1.1); }
  boom() { this.tone(55, 2.5, .9, 'sine', 30); this.burst(120, 2, .5); }
  complete() { this.tone(1320, .5, .12, 'sine'); this.tone(1980, .35, .05, 'sine'); }      // a single bell-like ding
  fail() { this.tone(180, .45, .2, 'sine', 120); }                                          // a low thud
}
const AUDIO = new AudioSys();
