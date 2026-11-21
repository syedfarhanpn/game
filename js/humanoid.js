'use strict';
// ---------------------------------------------------------------------------
// Low-poly articulated humanoid used for the player, pedestrians and actors.
// ---------------------------------------------------------------------------
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0673c', '#5c3a1e'];
const SHIRTS = ['#ff5fa2', '#2fc6c6', '#ffffff', '#ffd23f', '#3a7bd5', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#ff8a65', '#222222'];
const PANTS = ['#2c3e50', '#1f2a44', '#5d4037', '#7f8c8d', '#c8b88a', '#222222', '#3e5c76', '#ecf0f1'];
const HAIRS = ['#1b1b1b', '#3b2416', '#7a4a21', '#c9a35b', '#e0d0b0', '#5a1f1f', '#111111'];

class Humanoid {
  constructor(o = {}) {
    this.c = {
      skin: o.skin || pick(SKINS), shirt: o.shirt || pick(SHIRTS), pants: o.pants || pick(PANTS),
      hair: o.hair || pick(HAIRS), shoes: o.shoes || '#1a1a1a', jacket: o.jacket || null,
    };
    const c = this.c;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);
    const box = (w, h, d, hex, x = 0, y = 0, z = 0, parent) => {
      const m = new THREE.Mesh(boxGeo(w, h, d), stdMat(hex)); m.position.set(x, y, z); m.castShadow = true; (parent || this.body).add(m); return m;
    };
    this.hips = new THREE.Group(); this.hips.position.y = .95; this.body.add(this.hips);
    this.chest = new THREE.Group(); this.hips.add(this.chest);
    box(.42, .2, .24, c.pants, 0, .02, 0, this.hips);
    box(.46, .58, .26, c.jacket || c.shirt, 0, .37, 0, this.chest);
    if (c.jacket) box(.2, .5, .02, c.shirt, 0, .38, .135, this.chest);
    box(.12, .08, .12, c.skin, 0, .7, 0, this.chest);
    this.head = new THREE.Group(); this.head.position.y = .86; this.chest.add(this.head);
    box(.24, .27, .25, c.skin, 0, 0, 0, this.head);
    box(.26, .08, .27, c.hair, 0, .15, -.005, this.head);
    box(.26, .16, .06, c.hair, 0, .05, -.11, this.head);
    if (o.shades) box(.22, .05, .02, '#050505', 0, .03, .13, this.head);
    else { box(.04, .03, .02, '#1a1a1a', -.06, .03, .126, this.head); box(.04, .03, .02, '#1a1a1a', .06, .03, .126, this.head); }
    if (o.cap) { box(.27, .07, .28, o.cap, 0, .16, 0, this.head); box(.24, .02, .12, o.cap, 0, .13, .18, this.head); }
    const arm = (s) => {
      const g = new THREE.Group(); g.position.set(s * .3, .6, 0); this.chest.add(g);
      box(.13, .32, .14, c.jacket || c.shirt, 0, -.13, 0, g);
      const fore = new THREE.Group(); fore.position.y = -.3; g.add(fore);
      box(.11, .3, .12, o.longSleeves || c.jacket ? (c.jacket || c.shirt) : c.skin, 0, -.14, 0, fore);
      box(.1, .11, .11, c.skin, 0, -.33, 0, fore);
      g.fore = fore; return g;
    };
    this.armL = arm(1); this.armR = arm(-1);
    const leg = (s) => {
      const g = new THREE.Group(); g.position.set(s * .12, 0, 0); this.hips.add(g);
      box(.17, .46, .2, c.pants, 0, -.22, 0, g);
      const shin = new THREE.Group(); shin.position.y = -.44; g.add(shin);
      box(.15, .44, .18, c.pants, 0, -.22, 0, shin);
      box(.17, .09, .28, c.shoes, 0, -.46, .04, shin);
      g.shin = shin; return g;
    };
    this.legL = leg(1); this.legR = leg(-1);
    this.phase = Math.random() * 10; this.t = 0; this.mode = 'idle'; this.punchT = 0; this.downT = 0; this.seatOffset = .55;
  }
  setMode(m) { if (this.mode !== m) { this.mode = m; if (m === 'down') this.downT = 0; } }
  punch() { this.punchT = .35; }
  kick() { this.punchT = .35; }
  flinch() { }

  update(dt, speed = 0) {
    this.t += dt;
    const m = this.mode;
    // reset pose
    this.body.rotation.set(0, 0, 0); this.body.position.set(0, 0, 0);
    this.chest.rotation.set(0, 0, 0); this.head.rotation.set(0, 0, 0);
    for (const a of [this.armL, this.armR]) { a.rotation.set(0, 0, 0); a.fore.rotation.set(0, 0, 0); }
    for (const l of [this.legL, this.legR]) { l.rotation.set(0, 0, 0); l.shin.rotation.set(0, 0, 0); }
    this.hips.position.y = .95;
    if (m === 'down') {
      this.downT += dt;
      const k = Math.min(this.downT * 4, 1);
      this.body.rotation.x = -Math.PI / 2 * k; this.body.position.y = .15 * k; this.body.position.z = -.9 * k;
      this.armL.rotation.z = 1.2 * k; this.armR.rotation.z = -1.4 * k; this.legL.rotation.z = .2; this.legR.rotation.z = -.3;
      return;
    }
    if (m === 'sit') {
      this.hips.position.y = .55; this.legL.rotation.x = this.legR.rotation.x = -1.5; this.legL.shin.rotation.x = this.legR.shin.rotation.x = 1.5;
      this.armL.rotation.x = this.armR.rotation.x = -.9; this.armL.fore.rotation.x = this.armR.fore.rotation.x = -.4;
      return;
    }
    if (speed > .15) {
      const run = clamp(speed / 7, 0, 1);
      this.phase += dt * (3.2 + speed * 1.15);
      const sw = Math.sin(this.phase), amp = .5 + run * .5;
      this.legL.rotation.x = sw * amp; this.legR.rotation.x = -sw * amp;
      this.legL.shin.rotation.x = Math.max(0, -Math.cos(this.phase)) * (.4 + run * .9);
      this.legR.shin.rotation.x = Math.max(0, Math.cos(this.phase)) * (.4 + run * .9);
      this.armL.rotation.x = -sw * amp * .8; this.armR.rotation.x = sw * amp * .8;
      this.armL.fore.rotation.x = this.armR.fore.rotation.x = -.3 - run * .9;
      this.hips.position.y = .95 + Math.abs(Math.cos(this.phase)) * (.03 + run * .05);
      this.chest.rotation.x = run * .22; this.chest.rotation.y = sw * .12;
    } else {
      const b = Math.sin(this.t * 1.8 + this.phase) * .012;
      this.chest.rotation.x = b; this.armL.rotation.z = .06; this.armR.rotation.z = -.06;
      this.armL.fore.rotation.x = this.armR.fore.rotation.x = -.12;
      if (m === 'talk') {
        const g = Math.sin(this.t * 3.1 + this.phase), h = Math.sin(this.t * 2.3);
        this.armR.rotation.x = -.5 - Math.max(0, g) * .5; this.armR.fore.rotation.x = -.9; this.armR.rotation.z = -.2 - h * .1;
        this.armL.rotation.x = -.2 - Math.max(0, -g) * .4; this.armL.fore.rotation.x = -.6;
        this.head.rotation.y = Math.sin(this.t * .9) * .2; this.head.rotation.x = Math.sin(this.t * 4) * .05;
      } else if (m === 'phone') {
        this.armR.rotation.x = -.4; this.armR.rotation.z = -.9; this.armR.fore.rotation.x = -2.3; this.armR.fore.rotation.z = .2;
        this.head.rotation.z = .12; this.head.rotation.y = Math.sin(this.t * .7) * .15;
      } else if (m === 'lean') {
        this.body.rotation.x = -.12; this.armL.rotation.x = -.5; this.armR.rotation.x = -.5;
        this.armL.rotation.z = .9; this.armR.rotation.z = -.9; this.armL.fore.rotation.x = -1.6; this.armR.fore.rotation.x = -1.6;
        this.legL.rotation.x = .25; this.legR.rotation.x = -.15;
      } else if (m === 'cower') {
        this.chest.rotation.x = .5; this.armL.rotation.x = this.armR.rotation.x = -2.4; this.armL.fore.rotation.x = this.armR.fore.rotation.x = -1.2;
        this.hips.position.y = .75; this.legL.rotation.x = this.legR.rotation.x = -.6; this.legL.shin.rotation.x = this.legR.shin.rotation.x = 1;
      } else if (m === 'hands') {
        this.armL.rotation.z = 2.8; this.armR.rotation.z = -2.8; this.armL.fore.rotation.z = .3; this.armR.fore.rotation.z = -.3;
      }
    }
    if (this.punchT > 0) {
      this.punchT -= dt; const k = Math.sin((1 - this.punchT / .35) * Math.PI);
      this.armR.rotation.x = -1.5 * k; this.armR.fore.rotation.x = -.2; this.chest.rotation.y = -.4 * k;
    }
  }
  dispose(scene) { scene.remove(this.root); }
}
