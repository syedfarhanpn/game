'use strict';
// ---------------------------------------------------------------------------
// Real car 3D models. Each entry is adapted automatically: junk removed,
// oriented so its front faces +z, centred, wheels re-pivoted so they spin
// (and steer when wheels are separate parts), paint made per-car.
//
//  - models/ferrari.glb  "Ferrari 458 Italia" by vicent091036 (CC BY 4.0), via three.js examples
//  - models/porsche_911.glb  "(FREE) Porsche 911 Carrera 4S" by Karol Miklas (CC BY-SA 4.0)
//
// Add your own: put a .glb in models/cars/ and list it in models/cars/manifest.json, e.g.
//   [{ "id": "camry", "file": "camry.glb", "cars": ["Toyota Camry"], "paint": ["Paint"],
//      "glass": ["Glass"], "front": "Headlight_L", "spin": ["Wheel_FL","Wheel_FR","Wheel_RL","Wheel_RR"],
//      "steer": ["Wheel_FL","Wheel_FR"], "remove": [] }]
// "cars" matches car names (substring) from cardb.js.
// ---------------------------------------------------------------------------
const CAR_MODELS = {};
const CAR_LIGHTS = { head: [], tail: [] };
const CAR_MODEL_DEFS = [
  { id: 'ferrari', file: 'models/ferrari.glb', lod: 'models/lod/ferrari_lod.glb', match: /^Ferrari 458 Italia/, seat: [.2, .42, -.28], paint: ['Body_Color'], glass: ['Glass_Gray'], head: ['Projector_Glass'], tail: ['Taillight_Glass'],
    front: 'lights', spin: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], steer: ['wheel_fl', 'wheel_fr'], remove: [], ao: true },
  // motorbikes (CC BY 4.0, from Sketchfab via GitHub); yawFix turns the model so its front faces +z
  { id: 're350', kind: 'bike', file: 'models/bikes/lod/royal_enfield_classic_350_hi.glb', lod: 'models/bikes/lod/royal_enfield_classic_350_lo.glb', match: /^Royal Enfield Classic 350/, seatFrac: [.7, -.1], yawFix: Math.PI, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'h2', kind: 'bike', file: 'models/bikes/lod/h2r_hi.glb', lod: 'models/bikes/lod/h2r_lo.glb', match: /^Kawasaki Ninja H2/, seatFrac: [.72, -.12], yawFix: Math.PI, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'r1', kind: 'bike', file: 'models/bikes/lod/yamaha_r1_hi.glb', lod: 'models/bikes/lod/yamaha_r1_lo.glb', match: /^Yamaha YZF-R1/, seatFrac: [.72, -.12], yawFix: Math.PI, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'v4r', kind: 'bike', file: 'models/bikes/lod/ducati_v4r_hi.glb', lod: 'models/bikes/lod/ducati_v4r_lo.glb', match: /^Ducati Panigale V4 R/, seatFrac: [.72, -.12], yawFix: Math.PI, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'busa', kind: 'bike', file: 'models/bikes/lod/hayabusa_hi.glb', lod: 'models/bikes/lod/hayabusa_lo.glb', match: /^Suzuki Hayabusa/, seatFrac: [.7, -.12], yawFix: 0, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'z1000', kind: 'bike', file: 'models/bikes/lod/z1000_2014_hi.glb', lod: 'models/bikes/lod/z1000_2014_lo.glb', match: /^Kawasaki Z1000/, seatFrac: [.72, -.12], yawFix: 0, paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true },
  { id: 'porsche', file: 'models/porsche_911.glb', lod: 'models/lod/porsche_911_lod.glb', match: /^Porsche 911 Carrera 4S/, seat: [.2, .36, -.12], paint: ['paint'], glass: ['window'], head: ['lights'], tail: [],
    front: 'bumper_front.001', spin: ['Cylinder.001', 'Cylinder.000'], steer: [], remove: ['Plane.002', 'Plane.003', 'Cube.001', 'Cube.002', 'Plane', 'Hemi', 'Hemi.001'], ao: true },
];

function loadCarModels() {
  if (!THREE.GLTFLoader) return Promise.resolve(false);
  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) { const d = new THREE.DRACOLoader(); d.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/'); loader.setDRACOLoader(d); }
  const loadOne = def => new Promise(res => {
    const timer = setTimeout(() => { console.warn('car model timeout', def.file); res(false); }, 30000);
    loader.load(def.file, g => {
      clearTimeout(timer);
      try { g.scene.traverse(o => { if (o.isMesh && !o.geometry.attributes.normal) o.geometry.computeVertexNormals(); }); CAR_MODELS[def.id] = prepareCarModel(g, def); } catch (e) { console.error('car model prep', def.id, e); return res(false); }
      if (!def.lod) return res(true);
      loader.load(def.lod, gl => { try { gl.scene.traverse(o => { if (o.isMesh && !o.geometry.attributes.normal) o.geometry.computeVertexNormals(); }); const L = prepareCarModel(gl, def); mergeForLOD(L.template); CAR_MODELS[def.id].lod = L; } catch (e) { console.warn('lod prep', e); } res(true); }, undefined, () => res(true));
    }, undefined, e => { clearTimeout(timer); console.warn('car model failed', def.file, e); res(false); });
  });
  const extra = fetch('models/cars/manifest.json').then(r => r.ok ? r.json() : []).catch(() => [])
    .then(list => Promise.all((list || []).map(d => { d.file = 'models/cars/' + d.file; d.custom = true; return loadOne(Object.assign({ paint: [], glass: [], head: [], tail: [], spin: [], steer: [], remove: [], ao: true }, d)).then(ok => { if (ok) CAR_MODEL_DEFS.push(d); }); })));
  return Promise.all([...CAR_MODEL_DEFS.map(loadOne), extra]).then(() => { assignCarModels(); return true; });
}

function prepareCarModel(gltf, def) {
  const env = carEnv(), inner = gltf.scene, wrap = new THREE.Group();
  for (const n of def.remove) { let o; while ((o = inner.getObjectByName(n))) o.parent.remove(o); }
  inner.traverse(o => { if (o.isLight) o.visible = false; });
  wrap.add(inner);
  // orient: front part -> +z
  wrap.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(inner), c0 = box0.getCenter(V3());
  const fNode = def.front && inner.getObjectByName(def.front);
  let dir;
  if (fNode) { const fb = new THREE.Box3().setFromObject(fNode).getCenter(V3()); dir = fb.sub(c0); }
  else { const s = box0.getSize(V3()); dir = s.x > s.z ? V3(1, 0, 0) : V3(0, 0, 1); }
  inner.rotation.y = -Math.atan2(dir.x, dir.z) + (def.yawFix || 0);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner), size = box.getSize(V3()), c = box.getCenter(V3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  wrap.updateMatrixWorld(true);
  // wheels: pivot at each wheel's centre (steer group > spin group > wheel)
  const steerSet = new Set(def.steer); let wi = 0;
  for (const name of def.spin) {
    const w = inner.getObjectByName(name); if (!w) { console.warn('wheel not found', def.id, name); continue; }
    const wc = new THREE.Box3().setFromObject(w).getCenter(V3());
    const piv = new THREE.Group(), spin = new THREE.Group();
    piv.name = (steerSet.has(name) ? 'steer_' : 'piv_') + wi; spin.name = 'spin_' + wi; wi++;
    piv.position.copy(wc); wrap.add(piv); piv.add(spin); piv.updateMatrixWorld(true);
    spin.attach(w);
  }
  // materials
  const seen = new Set();
  wrap.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material; o.castShadow = def.paint.includes(m.name); o.receiveShadow = false;
    if (seen.has(m)) return; seen.add(m);
    m.envMap = env; m.envMapIntensity = 1; m.needsUpdate = true;
    if (def.glass.includes(m.name)) { m.transparent = true; m.opacity = .45; m.color = col('#20262e'); m.roughness = 0; m.metalness = 0; m.depthWrite = false; }
    if (def.head.includes(m.name)) { m.emissive = new THREE.Color(1, .97, .9); m.emissiveIntensity = .2; CAR_LIGHTS.head.push(m); }
    if (def.tail.includes(m.name)) { m.emissive = new THREE.Color(1, .05, .03); m.emissiveIntensity = .4; CAR_LIGHTS.tail.push(m); }
    if (/chrome|silver|metal/i.test(m.name)) { m.metalness = 1; m.roughness = Math.min(m.roughness, .25); }
  });
  if (def.ao && THREE.TextureLoader) {
    const ao = new THREE.TextureLoader().load('models/ferrari_ao.png');
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.15, size.z * 1.15).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ao, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, depthWrite: false }));
    sh.position.y = .015; sh.renderOrder = 1; wrap.add(sh);
  }
  return { id: def.id, template: wrap, size, paint: def.paint, ready: true, def };
}

// Light copy: merge body parts by material (≈50 draw calls -> ≈15) and each wheel
// into one mesh (it still spins). No real-time shadow — the AO decal does that.
function mergeForLOD(wrap) {
  wrap.updateMatrixWorld(true);
  const inv = new THREE.Matrix4(), byMat = new Map(), wheels = [], drop = [];
  wrap.traverse(o => { if (/^spin_/.test(o.name)) wheels.push(o); });
  const inWheel = o => { for (let p = o.parent; p; p = p.parent) if (/^spin_/.test(p.name)) return true; return false; };
  // gltf-transform writes interleaved vertex buffers; unpack them before merging (toNonIndexed ignores stride)
  const plain = a => {
    if (!a.isInterleavedBufferAttribute) return a;
    const n = a.count, s = a.itemSize, arr = new Float32Array(n * s), get = ['getX', 'getY', 'getZ', 'getW'];
    for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) arr[i * s + k] = a[get[k]](i);
    return new THREE.BufferAttribute(arr, s, a.normalized);
  };
  const bake = (mesh, rel) => {
    const src = mesh.geometry, gm = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) if (src.attributes[name]) gm.setAttribute(name, plain(src.attributes[name]));
    if (src.index) gm.setIndex(src.index.clone());
    gm.applyMatrix4(rel); if (!gm.attributes.normal) gm.computeVertexNormals();
    return gm;
  };
  wrap.traverse(o => {
    if (!o.isMesh || o.renderOrder === 1 || inWheel(o)) return;     // keep the AO shadow decal
    const m = o.material; if (!byMat.has(m)) byMat.set(m, []);
    byMat.get(m).push(bake(o, o.matrixWorld)); drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  for (const [mat, list] of byMat) { const mesh = new THREE.Mesh(mergeGeometries(list), mat); mesh.castShadow = false; wrap.add(mesh); }
  for (const w of wheels) {
    inv.copy(w.matrixWorld).invert();
    const parts = []; let big = null, bigN = -1;
    w.traverse(o => { if (!o.isMesh) return; parts.push(o); const n = o.geometry.attributes.position.count; if (n > bigN) { bigN = n; big = o.material; } });
    if (!parts.length) continue;
    const geos = parts.map(o => bake(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
    for (const c of [...w.children]) w.remove(c);
    const mesh = new THREE.Mesh(mergeGeometries(geos), big); mesh.castShadow = false; w.add(mesh);
  }
}

// which real model represents each catalogue car
function assignCarModels() {
  const custom = CAR_MODEL_DEFS.filter(d => d.custom && CAR_MODELS[d.id]);
  for (const k in CAR_TYPES) {
    const t = CAR_TYPES[k]; t.model = null;
    const hit = custom.find(d => (d.cars || []).some(n => t.name.toLowerCase().includes(n.toLowerCase())));
    if (hit) { t.model = hit.id; continue; }
    // genuine models only: a car gets a 3D model only if it IS that car
    const d = CAR_MODEL_DEFS.find(d => !d.custom && d.match && CAR_MODELS[d.id] && d.match.test(t.name));
    if (d) t.model = d.id;
  }
}

function makeHiCar(paint, t, low) {
  const M0 = CAR_MODELS[t.model], M = low && M0.lod ? M0.lod : M0, g = M.template.clone(true), S = M.size;
  g.scale.set(t.W / (S.x * .95), t.H / S.y, t.L / S.z);    // fit each real car's dimensions
  g.traverse(o => { if (o.isMesh && o.material && M.paint.includes(o.material.name)) o.material = paint; });
  const steer = [], spins = [];
  g.traverse(o => { if (/^steer_/.test(o.name)) steer.push(o); if (/^spin_/.test(o.name)) spins.push(o); });
  return { group: g, steer, spins };
}
