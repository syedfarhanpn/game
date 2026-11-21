'use strict';
// ---------------------------------------------------------------------------
// Realistic people (all from the three.js examples):
//   models/civilian_male.glb — Ready Player Me avatar (casual clothes)  -> men
//   models/Michelle.glb      — Mixamo character                         -> women
//   models/Soldier.glb       — Mixamo character, tinted khaki           -> police officers
// The Soldier's Idle / Walk / Run clips are *retargeted* onto the other two
// skeletons (world-space bone matching), so nobody walks upside-down.
// RealHuman has the same interface as the low-poly Humanoid.
// ---------------------------------------------------------------------------
const HUMAN = { ready: false, kinds: {} };

function loadHumans() {
  return new Promise(resolve => {
    if (!THREE.GLTFLoader || !THREE.SkeletonUtils) { console.warn('Human models unavailable — using low-poly people'); return resolve(false); }
    const loader = new THREE.GLTFLoader();
    const get = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
    const timer = setTimeout(() => { console.warn('Human models timed out'); resolve(false); }, 30000);
    Promise.all([get('models/Soldier.glb'), get('models/Michelle.glb'), get('models/civilian_male.glb')]).then(([sol, mic, civ]) => {
      clearTimeout(timer);
      try {
        const src = {};
        for (const a of sol.animations) if (['Idle', 'Walk', 'Run'].includes(a.name)) src[a.name.toLowerCase()] = a;
        // police: the soldier with his own clips (positions stripped -> in place)
        const pol = prepHuman(sol, null);
        pol.clips = {}; for (const k in src) { const c = src[k].clone(); c.tracks = c.tracks.filter(t => !t.name.endsWith('.position')); pol.clips[k] = c; }
        HUMAN.kinds.police = pol;
        for (const [kind, g, prefix] of [['female', mic, 'mixamorig'], ['male', civ, '']]) {
          const T = prepHuman(g, prefix);
          const map = n => prefix === '' ? 'mixamorig' + n : n;
          T.clips = {};
          for (const k in src) T.clips[k] = retargetDelta(sol.scene, src[k], g.scene, map, pol.yaw, T.yaw);
          HUMAN.kinds[kind] = T;
        }
        HUMAN.ready = true;
      } catch (e) { console.error('Human prep failed', e); }
      resolve(HUMAN.ready);
    }).catch(e => { clearTimeout(timer); console.warn('Human models failed', e); resolve(false); });
  });
}
// World-space delta retargeting: for every frame, each source bone's rotation
// away from its rest pose (expressed in the character's own facing frame) is
// applied to the matching target bone's rest pose. Robust to different armature
// orientations, scales and bone axis conventions.
function retargetDelta(srcScene, clip, tgtScene, mapName, ys, yt) {
  const Q = () => new THREE.Quaternion(), up = V3(0, 1, 0);
  const sb = {}; srcScene.traverse(o => { if (o.isBone) sb[o.name] = o; });
  const tb = []; tgtScene.traverse(o => { if (o.isBone) tb.push(o); });
  const saved = new Map(); for (const n in sb) saved.set(sb[n], sb[n].quaternion.clone());
  srcScene.updateMatrixWorld(true); tgtScene.updateMatrixWorld(true);
  const Ws0 = {}; for (const n in sb) Ws0[n] = sb[n].getWorldQuaternion(Q());
  const Wt0 = new Map(), Lt0 = new Map();
  for (const b of tb) { Wt0.set(b, b.getWorldQuaternion(Q())); Lt0.set(b, b.quaternion.clone()); }
  // limbs are matched by DIRECTION (bone -> child), so a T-pose source drives an
  // A-pose target correctly (raw rotation deltas would over-rotate the arms)
  const CHILD = { Shoulder: 'Arm', Arm: 'ForeArm', ForeArm: 'Hand', UpLeg: 'Leg', Leg: 'Foot' };
  const tByName = {}; for (const b of tb) tByName[b.name] = b;
  const limb = new Map(), pa = V3(), pc = V3();
  for (const b of tb) {
    const m = b.name.replace(/^mixamorig/, '').match(/^(Left|Right)(Shoulder|Arm|ForeArm|UpLeg|Leg)$/); if (!m) continue;
    const prefix = b.name.startsWith('mixamorig') ? 'mixamorig' : '';
    const tc = tByName[prefix + m[1] + CHILD[m[2]]], s = sb[mapName(b.name)], sc = tc && sb[mapName(tc.name)];
    if (!tc || !s || !sc) continue;
    b.getWorldPosition(pa); tc.getWorldPosition(pc);
    limb.set(b, { rest: pc.clone().sub(pa).normalize(), s, sc });
  }
  const qYs = Q().setFromAxisAngle(up, ys), qYsI = qYs.clone().invert(), qYt = Q().setFromAxisAngle(up, yt), qYtI = qYt.clone().invert();
  const mixer = new THREE.AnimationMixer(srcScene); mixer.clipAction(clip).play();
  const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times = new Float32Array(n), data = new Map(tb.map(b => [b, new Float32Array(n * 4)]));
  const Wt = new Map(), cur = Q(), d = Q(), inv = Q();
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / fps, clip.duration); times[i] = t;
    mixer.setTime(t); srcScene.updateMatrixWorld(true);
    for (const b of tb) {
      const sn = mapName(b.name), s = sb[sn];
      const pw = b.parent && b.parent.isBone ? Wt.get(b.parent) : (b.parent ? b.parent.getWorldQuaternion(Q()) : Q());
      let w;
      const L = limb.get(b);
      if (L) {
        L.s.getWorldPosition(pa); L.sc.getWorldPosition(pc);
        const dS = pc.sub(pa).normalize().applyQuaternion(qYsI).applyQuaternion(qYt);   // source limb direction, in target facing
        w = Q().setFromUnitVectors(L.rest, dS).multiply(Wt0.get(b));
      } else if (s) {
        s.getWorldQuaternion(cur);
        d.copy(cur).multiply(inv.copy(Ws0[sn]).invert());          // world delta from rest
        d.premultiply(qYsI).multiply(qYs);                          // into source facing frame
        d.premultiply(qYt).multiply(qYtI);                          // out to target facing frame
        w = d.clone().multiply(Wt0.get(b));
      } else w = pw.clone().multiply(Lt0.get(b));
      Wt.set(b, w);
      pw.clone().invert().multiply(w).toArray(data.get(b), i * 4);
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(srcScene);
  for (const [b, q] of saved) b.quaternion.copy(q);
  return new THREE.AnimationClip(clip.name, clip.duration, tb.map(b => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, data.get(b))));
}
function findSkin(root) { let s = null; root.traverse(o => { if (!s && o.isSkinnedMesh) s = o; }); return s; }
function prepHuman(gltf, prefix) {
  const scene = gltf.scene;
  scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
  scene.updateMatrixWorld(true);
  let minY = Infinity, hips = null; const p = V3();
  scene.traverse(o => { if (!o.isBone) return; o.getWorldPosition(p); minY = Math.min(minY, p.y); if (/Hips$/.test(o.name)) hips = o; });
  const hp = V3(); if (hips) hips.getWorldPosition(hp);
  // facing: which way do the toes point relative to the heels?
  let toe = null; scene.traverse(o => { if (o.isBone && /LeftToeBase$|LeftToe_End$/.test(o.name) && !toe) toe = o; });
  let foot = null; scene.traverse(o => { if (o.isBone && /LeftFoot$/.test(o.name) && !foot) foot = o; });
  let yaw = 0;
  if (toe && foot) { const a = V3(), b = V3(); toe.getWorldPosition(a); foot.getWorldPosition(b); yaw = -Math.atan2(a.x - b.x, a.z - b.z); }
  minY -= .03;
  const hipsY = hp.y - minY;
  return { scene, minY, hipsY, height: hipsY / .53, yaw, prefix };
}

class RealHuman {
  constructor(o = {}) {
    const kind = o.kind || (o.female === true ? 'female' : o.female === false ? 'male' : (Math.random() < .5 ? 'female' : 'male'));
    const T = HUMAN.kinds[kind];
    this.kind = kind; this.female = kind === 'female';
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.model = THREE.SkeletonUtils.clone(T.scene);
    const s = (o.height || (this.female ? 1.65 : 1.76) * rand(.96, 1.05)) / T.height;
    this.model.scale.multiplyScalar(s); this.model.position.y = -T.minY * s;
    this.model.rotation.y = T.yaw;
    this.body.add(this.model);
    this.seatOffset = T.hipsY * s;
    // clothing colours
    const top = new THREE.Color(o.jacket || o.shirt || pick(SHIRTS)), bottom = new THREE.Color(o.pants || pick(PANTS));
    const skin = o.skin || pick(['#9c6b4e', '#8a5a3c', '#a87554', '#7a4e33', '#b48262']);
    this.model.traverse(m => {
      if (!m.isMesh) return;
      const n = m.material.name;
      if (kind === 'police') { m.material = m.material.clone(); m.material.color.copy(col(o.tint || '#c9a96e')); if (n === 'Vanguard_VisorMat') m.visible = !!o.visor; }
      else if (kind === 'male') {
        if (n === 'Wolf3D_Outfit_Top') { m.material = m.material.clone(); m.material.color.copy(top).lerp(new THREE.Color(1, 1, 1), .25); }
        else if (n === 'Wolf3D_Outfit_Bottom') { m.material = m.material.clone(); m.material.color.copy(bottom).lerp(new THREE.Color(1, 1, 1), .2); }
        else if (o.hair && n === 'Wolf3D_Headwear') m.visible = false;
        else if (n === 'Wolf3D_Skin' || n === 'Wolf3D_Body') { m.material = m.material.clone(); m.material.color.set(skin); }   // Kerala skin tones
        else if (o.hair && n === 'Wolf3D_Beard') { m.material = m.material.clone(); m.material.color.set(o.hair); }
      } else { m.material = m.material.clone(); m.material.color.copy(new THREE.Color(1, 1, 1).lerp(top, .3)); }
    });
    this.bones = {};
    this.model.traverse(b => { if (b.isBone) this.bones[b.name.replace(/^mixamorig:?/, '')] = b; });
    if (o.hair && kind === 'male' && this.bones.Head) {   // story characters: short dark hair instead of the stock hat
      this.root.updateMatrixWorld(true); const head = this.bones.Head, ws = head.getWorldScale(V3()).x || 1;
      // an ellipsoid sunk into the skull: only the hair-shaped part shows (fitted on screen, front / 3-4 / side / back)
      const hair = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 16), new THREE.MeshStandardMaterial({ color: col(o.hair), roughness: .85 }));
      hair.scale.set(.9 / ws, .88 / ws, 1 / ws); hair.position.set(0, .112 / ws, -.012 / ws); hair.castShadow = true; head.add(hair); this.hairMesh = hair;
    }
    this.mixer = new THREE.AnimationMixer(this.model);
    this.act = {};
    for (const k of ['idle', 'walk', 'run']) { const a = this.mixer.clipAction(T.clips[k]); a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); a.time = Math.random() * a.getClip().duration; this.act[k] = a; }
    this.mode = 'idle'; this.t = Math.random() * 10; this.punchT = 0; this.kickT = 0; this.downT = 0; this.hitT = 0;
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._q2 = new THREE.Quaternion(); this._q3 = new THREE.Quaternion(); this._q4 = new THREE.Quaternion();
    this._v1 = V3(); this._v2 = V3(); this._v3 = V3(); this._v4 = V3(); this._v5 = V3();
  }
  setMode(m) { if (this.mode !== m) { this.mode = m; if (m === 'down') this.downT = 0; this.setHelmet(m === 'ride'); } }
  setHelmet(on) {
    const head = this.bones.Head; if (!head) return;
    if (!this.helmet) {
      const ws = head.getWorldScale(V3()).x || 1;
      this.helmet = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * .62), stdMat(pick(['#111111', '#c0392b', '#f2f2f2', '#1f3a93', '#f1c40f']), { roughness: .25, metalness: .2 }));
      const visor = new THREE.Mesh(new THREE.SphereGeometry(.158, 16, 8, -1.0, 2.0, Math.PI * .3, Math.PI * .22), new THREE.MeshStandardMaterial({ color: col('#0b0f14'), roughness: .05, metalness: .6 }));
      shell.castShadow = true; this.helmet.add(shell, visor);
      this.helmet.scale.setScalar(1 / ws); this.helmet.position.set(0, .1 / ws, .01 / ws);
      head.add(this.helmet);
    }
    this.helmet.visible = on;
  }
  // ---- seated posture by aiming limbs at real targets (simple IK; rig-independent)
  aim(bone, child, target) {
    if (!bone || !child || !bone.parent) return;
    bone.parent.updateWorldMatrix(true, false); bone.updateMatrixWorld(true);
    const P = bone.getWorldPosition(this._v1), cur = child.getWorldPosition(this._v2).sub(P).normalize();
    const des = this._v3.copy(target).sub(P).normalize();
    const q = this._q2.setFromUnitVectors(cur, des).multiply(bone.getWorldQuaternion(this._q3));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(this._q4).invert().multiply(q));
    bone.updateMatrixWorld(true);
  }
  poseSeated(m) {
    const B = this.bones, hy = this.seatOffset, R = this.root, w = (x, y, z) => R.localToWorld(this._v4.set(x, y, z)).clone();
    R.updateWorldMatrix(true, true);
    const bike = m === 'ride';
    // target points in the rider's frame: x = left, y = up, z = forward (hips at y = hy)
    const k = Math.min(1, hy / .95);                        // children: scale the pose to their size
    const T = bike
      ? { spine: [0, hy + .62, .24], knee: [.19, hy + .02, .42], foot: [.21, hy - .44, .3], grip: [.27, hy + .26, .56] }
      : this.piggy ? { spine: [0, hy + .5 * k, .1 * k], knee: [.24 * k, hy + .06 * k, .3 * k], foot: [.2 * k, hy - .3 * k, .04], grip: [.1 * k, hy + .44 * k, .32 * k] }   // piggyback: arms round the neck
      : { spine: [0, hy + .66 * k, .06 * k], knee: [.16 * k, hy + .1 * k, .46 * k], foot: [.17 * k, hy - .28 * k, .86 * k], grip: [.2 * k, hy + .36 * k, .5 * k] };
    this.aim(B.Spine, B.Neck, w(...T.spine));
    for (const s of [1, -1]) {
      const side = s > 0 ? 'Left' : 'Right';
      this.aim(B[side + 'UpLeg'], B[side + 'Leg'], w(T.knee[0] * s, T.knee[1], T.knee[2]));
      this.aim(B[side + 'Leg'], B[side + 'Foot'], w(T.foot[0] * s, T.foot[1], T.foot[2]));
      const grip = w(T.grip[0] * s, T.grip[1], T.grip[2]);
      const sh = B[side + 'Arm'].getWorldPosition(this._v5);
      const elbow = sh.clone().lerp(grip, .5).add(w(.05 * s, -.1, 0).sub(w(0, 0, 0)));   // elbows slightly out and down
      this.aim(B[side + 'Arm'], B[side + 'ForeArm'], elbow);
      this.aim(B[side + 'ForeArm'], B[side + 'Hand'], grip);
    }
  }
  // arms aimed at points in the body's own frame (x = left, y = up, z = forward)
  poseArms(L, R) {
    const B = this.bones, hy = this.seatOffset, Rt = this.root, w = (x, y, z) => Rt.localToWorld(this._v4.set(x, y, z)).clone();
    Rt.updateWorldMatrix(true, true);
    for (const [side, t, s] of [['Left', L, 1], ['Right', R, -1]]) {
      if (!t || !B[side + 'Arm']) continue;
      const grip = w(t[0], hy + t[1], t[2]), sh = B[side + 'Arm'].getWorldPosition(this._v5);
      const elbow = sh.clone().lerp(grip, .5).add(w(.07 * s, -.12, -.04).sub(w(0, 0, 0)));
      this.aim(B[side + 'Arm'], B[side + 'ForeArm'], elbow);
      this.aim(B[side + 'ForeArm'], B[side + 'Hand'], grip);
    }
  }
  punch() { this.punchT = .35; }
  kick() { this.kickT = .5; }
  flinch() { this.hitT = .3; }
  rot(name, x, y, z) { const b = this.bones[name]; if (!b) return; this._e.set(x, y, z); this._q.setFromEuler(this._e); b.quaternion.multiply(this._q); }
  update(dt, speed = 0) {
    this.t += dt;
    const m = this.mode, still = m === 'sit' || m === 'ride' || m === 'down' || m === 'hands' || m === 'cower' || m === 'limp-stand' || m === 'swim' || m === 'tread' || m === 'dance' || m === 'hostage' || m === 'sitbound';
    const sp = still ? 0 : speed;
    const wWalk = smooth(.15, 1.2, sp) * (1 - smooth(3.2, 5, sp)), wRun = smooth(3.2, 5, sp), wIdle = 1 - wWalk - wRun;
    this.act.idle.setEffectiveWeight(wIdle); this.act.walk.setEffectiveWeight(wWalk); this.act.run.setEffectiveWeight(wRun);
    this.act.walk.setEffectiveTimeScale(clamp(sp / 1.5, .5, 1.8)); this.act.run.setEffectiveTimeScale(clamp(sp / 5.5, .7, 1.5));
    this.mixer.update(dt);
    this.body.rotation.set(0, 0, 0); this.body.position.set(0, 0, 0);
    if (m === 'down') {
      this.downT += dt; const k = Math.min(this.downT * 4, 1);
      this.body.rotation.x = -Math.PI / 2 * k; this.body.position.set(0, .12 * k, -.9 * k);
      return;
    }
    // joint directions measured on these rigs: thigh forward = +x, knee bend = -x,
    // spine forward = +x, arm forward = left +z / right -z (the soldier rig's legs are mirrored)
    const L = this.kind === 'police' ? -1 : 1;
    // swimming (HELL GATE): prone stroke with flutter kick, or treading water upright
    if (m === 'swim' || m === 'tread') {
      const t = this.t * (this.swimRate || 1);
      if (m === 'swim') {
        this.body.rotation.x = Math.PI / 2 - (this.swimPitch || 0); this.body.position.set(0, 0, -.88);
        const k = (1 - Math.cos(t * 3.2)) / 2, a = this.armsForward ? -2.6 + k * .5 : -2.7 + k * 2.1;   // reach forward, sweep to the sides
        this.rot('LeftArm', 0, 0, a); this.rot('RightArm', 0, 0, -a);
        const f = Math.sin(t * 6.5) * .26;
        this.rot('LeftUpLeg', f * L, 0, 0); this.rot('RightUpLeg', -f * L, 0, 0);
        this.rot('LeftLeg', -(.06 + Math.max(0, f) * .35) * L, 0, 0); this.rot('RightLeg', -(.06 + Math.max(0, -f) * .35) * L, 0, 0);
        this.rot('Head', -.55, 0, 0);
      } else {
        const sn = Math.sin(t * 2.4);
        this.rot('LeftArm', 0, 0, -1.2 + sn * .35); this.rot('RightArm', 0, 0, 1.2 - sn * .35);
        this.rot('LeftUpLeg', sn * .32 * L, 0, 0); this.rot('RightUpLeg', -sn * .32 * L, 0, 0);
        this.rot('LeftLeg', -.4 * L, 0, 0); this.rot('RightLeg', -.4 * L, 0, 0);
      }
      return;
    }
    if (m === 'ride' || m === 'sit' || m === 'sitbound') { this.poseSeated(m === 'sitbound' ? 'sit' : m); if (m === 'sitbound') { this.poseArms([.08, .05, -.22], [-.08, .05, -.22]); this.rot('Head', .3, 0, 0); } return; }
    if (m === 'crouch') {   // lower the body and keep the feet planted
      const B = this.bones, hy = this.seatOffset, R = this.root, w = (x, y, z) => R.localToWorld(this._v4.set(x, y, z)).clone();
      this.body.position.y = -hy * .38; this.body.updateMatrixWorld(true);
      this.aim(B.Spine, B.Neck, w(0, hy * .62 + .62, .32));
      const gait = Math.min(sp / 1.6, 1);
      for (const s of [1, -1]) { const side = s > 0 ? 'Left' : 'Right', ph = Math.sin(this.t * 7) * s * gait; this.aim(B[side + 'UpLeg'], B[side + 'Leg'], w(.14 * s, hy * .55, .34 + ph * .12)); this.aim(B[side + 'Leg'], B[side + 'Foot'], w(.15 * s, .1 + Math.max(0, ph) * .08, .06 + ph * .22)); }
      return;
    }
    if (m === 'limp') { this.rot('RightUpLeg', -.15 * L, 0, 0); this.body.rotation.z = Math.sin(this.t * 6) * .06; }
    if (m === 'rifle') this.poseArms([.06, .3, .5], [-.1, .2, .26]);
    else if (m === 'aim') this.poseArms([.03, .5, .58], [-.08, .46, .3]);
    else if (m === 'tray') this.poseArms(null, [-.24, .62, .3]);
    else if (m === 'cuffed') this.poseArms([.05, .08, .28], [-.05, .08, .28]);
    else if (m === 'phone') this.poseArms(null, [-.1, .7, .06]);
    else if (m === 'drink') this.poseArms(null, [-.12, .5 + Math.max(0, Math.sin(this.t * .7)) * .18, .3]);
    else if (m === 'clap') { const k = Math.abs(Math.sin(this.t * 9)) * .07; this.poseArms([.05 + k, .45, .34], [-.05 - k, .45, .34]); }
    else if (m === 'dance') { const a = this.t * (this.danceRate || 4.2); this.body.rotation.z = Math.sin(a) * .07; this.body.position.y = -Math.abs(Math.sin(a)) * .05; this.poseArms([.3, .5 + Math.sin(a) * .15, .25], [-.3, .5 - Math.sin(a) * .15, .25]); }
    else if (m === 'talk') { const a = this.t * 2.1; this.poseArms([.2, .25 + Math.max(0, Math.sin(a)) * .15, .35], Math.sin(a * .7) > .3 ? [-.2, .3 + Math.sin(a * 1.3) * .08, .38] : null); }
    else if (m === 'hostage') { this.poseArms([.06, .02, -.2], [-.06, .02, -.2]); this.rot('Head', .35, 0, 0); }
    if (m === 'guard') { this.rot('LeftArm', 0, 0, 1.1); this.rot('RightArm', 0, 0, -1.1); }
    if (m === 'hands') { this.rot('LeftArm', 0, 0, -2.4); this.rot('RightArm', 0, 0, 2.4); }
    if (m === 'cower') { this.rot('Spine', .6, 0, 0); }
    if (this.punchT > 0) { this.punchT -= dt; const k = Math.sin((1 - this.punchT / .35) * Math.PI); this.rot('RightArm', 0, 0, -1.4 * k); this.rot('Spine', 0, -.45 * k, 0); }
    if (this.kickT > 0) { this.kickT -= dt; const k = Math.sin((1 - this.kickT / .5) * Math.PI); this.rot('RightUpLeg', 1.5 * k * L, 0, 0); this.rot('RightLeg', -.3 * k * L, 0, 0); this.rot('Spine', -.2 * k, 0, 0); }
    if (this.hitT > 0) { this.hitT -= dt; const k = Math.sin((1 - this.hitT / .3) * Math.PI); this.rot('Spine', -.35 * k, 0, 0); this.rot('Head', -.3 * k, 0, 0); }
  }
  dispose(scene) { scene.remove(this.root); }
}

function makeHuman(o = {}) { return HUMAN.ready ? new RealHuman(o) : new Humanoid(o); }
