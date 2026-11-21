'use strict';
// ---------------------------------------------------------------------------
// Spoken dialogue.
//  - Malayalam (and Malayalam + English) mode: pre-generated Malayalam voice clips
//    (js/voicelines.js -> audio/vo/*.mp3, made offline with Piper TTS).
//  - English mode: the English line is spoken by the browser's speech synthesis,
//    preferring an Indian-English voice.
//  - Street talk (barks) and police shouts play from the speaker's position:
//    louder when close, panned left/right.
// ---------------------------------------------------------------------------
const LINE_KEYS = {};   // text shown on screen -> voice key (filled in by L() in missions.js)

const SPEAKER = {       // English speech-synthesis colour per character
  'ARJUN': { pitch: 1, rate: 1 }, 'NIKHIL': { pitch: 1.18, rate: 1.06 }, 'NIKHIL (phone)': { pitch: 1.18, rate: 1.06 },
  'ALEX MATHEW': { pitch: .78, rate: .94 }, 'POLICE': { pitch: .88, rate: 1 },
};

class VoiceSys {
  constructor() { this.ab = {}; this.dec = {}; this.buf = {}; this.cur = null; this.token = 0; this.lastBark = 0; this._v = V3(); this._r = V3(); }
  files() {
    const fs = new Set();
    for (const k in VO_DATA.lines) fs.add(VO_DATA.lines[k].f);
    for (const k in VO_DATA.barks) { const b = VO_DATA.barks[k]; b.m.concat(b.f).forEach(f => fs.add(f)); }
    return [...fs];
  }
  // download everything at boot (about 1.5 MB); decoding waits for the audio context
  preload() { for (const f of this.files()) if (!this.ab[f]) this.ab[f] = fetch(f).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.arrayBuffer(); }).catch(e => { console.warn('voice file missing', e.message); return null; }); }
  warm() { if (AUDIO.ready) for (const f of this.files()) this.get(f); }   // decode once audio is unlocked
  get(f) {
    if (this.buf[f]) return Promise.resolve(this.buf[f]);
    if (!this.ab[f]) this.ab[f] = fetch(f).then(r => r.arrayBuffer()).catch(() => null);
    if (!AUDIO.ready) return Promise.resolve(null);
    return this.dec[f] || (this.dec[f] = this.ab[f].then(ab => ab ? AUDIO.ctx.decodeAudioData(ab) : null).then(b => (this.buf[f] = b)).catch(() => null));
  }
  duration(key) { const v = VO_DATA.lines[key]; return v ? v.d : 0; }

  stop() {
    this.token++;
    if (this.cur) { try { this.cur.stop(); } catch (e) { } this.cur = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    AUDIO.duck(false);
  }
  // a story line (cutscene or mission talk)
  line(who, text) {
    this.stop();
    const tok = this.token, lang = (window.GAME && GAME.lang) || 'both';
    if (lang === 'en') { this.tts(who, text); return; }
    const key = LINE_KEYS[text], vo = key && VO_DATA.lines[key]; if (!vo) return;
    AUDIO.duck(true);
    this.get(vo.f).then(b => {
      if (tok !== this.token || !b) { if (tok === this.token) AUDIO.duck(false); return; }
      const src = AUDIO.playVoice(b, { vol: 1, onend: () => { if (this.cur === src) { this.cur = null; AUDIO.duck(false); } } });
      this.cur = src;
    });
  }
  // English mode: browser speech synthesis
  pickVoice() {
    if (this._voice !== undefined && this._voiceN === speechSynthesis.getVoices().length) return this._voice;
    const vs = speechSynthesis.getVoices(); this._voiceN = vs.length;
    const score = v => (/en[-_]IN/i.test(v.lang) ? 10 : /^en/i.test(v.lang) ? 3 : 0) + (/ravi|prabhat|male|madhur/i.test(v.name) ? 2 : 0) + (/natural|online/i.test(v.name) ? 3 : 0);
    this._voice = vs.filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0] || null;
    return this._voice;
  }
  tts(who, text) {
    if (!window.speechSynthesis) return;
    const clean = String(text).replace(/<[^>]+>/g, '').replace(/₹\s?([\d,]+)/g, '$1 rupees');
    const u = new SpeechSynthesisUtterance(clean), s = SPEAKER[who] || { pitch: 1, rate: 1 }, v = this.pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } u.pitch = s.pitch; u.rate = s.rate; u.volume = 1;
    AUDIO.duck(true); u.onend = () => AUDIO.duck(false);
    speechSynthesis.speak(u);
  }
  // positional clip: street talk and police shouts
  spatial(f, pos, gain = 1) {
    if (!AUDIO.ready || !window.GAME) return;
    const cam = GAME.camera, d = pos.distanceTo(cam.position), vol = clamp(1.35 - d / 24, 0, 1) * gain; if (vol < .04) return;
    const right = this._v.setFromMatrixColumn(cam.matrixWorld, 0), dir = this._r.copy(pos).sub(cam.position).normalize();
    const pan = clamp(dir.dot(right), -1, 1) * .8;
    this.get(f).then(b => { if (b) AUDIO.playVoice(b, { vol, pan }); });
  }
  bark(text, who) {
    const b = VO_DATA.barks[text]; if (!b || !who) return false;
    const now = performance.now(); if (now - this.lastBark < 700) return false; this.lastBark = now;
    const list = who.h && who.h.female ? b.f : b.m;
    if (who.vid == null) who.vid = Math.floor(Math.random() * 6);
    this.spatial(list[who.vid % list.length], who.pos, .9);
    return true;
  }
  shout(key, pos) { const v = VO_DATA.lines[key]; if (v) this.spatial(v.f, pos, 1.1); }
}
const VOICE = new VoiceSys();
