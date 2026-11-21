'use strict';
// ---------------------------------------------------------------------------
// Healthcare modelled on how it works in Kerala:
//  * Kanivu 108 ambulance (dial 108 / 112) picks up the injured and takes them
//    to the nearest hospital that can treat them.
//  * Casualty (emergency): triage RED / YELLOW / GREEN by the Casualty Medical
//    Officer, OP ticket, Medico-Legal Case (MLC) + police intimation for
//    accidents and assaults, first aid (IV line, analgesics, Inj. TT).
//  * Investigations (X-ray, CT, slit-lamp, eFAST...) then referral to the right
//    department, treatment, admission if needed, free medicines from the
//    Government pharmacy, discharge summary with review date.
//  * Hospital tiers: Primary Health Centre (first aid + referral), District
//    Hospital, Government Medical College Hospital (all specialities, incl.
//    Neurosurgery and Burns), and a private multispeciality hospital (fast,
//    expensive).
// ---------------------------------------------------------------------------
const DOCTORS = {
  Casualty: 'Dr. Rahul Krishnan (Casualty Medical Officer)', Orthopaedics: 'Dr. Anil Kumar K. (Orthopaedics)',
  Ophthalmology: 'Dr. Lakshmi Menon (Ophthalmology)', Neurosurgery: 'Dr. Sreejith Nair (Neurosurgery)',
  'General Surgery': 'Dr. Fathima Beevi (General Surgery)', ENT: 'Dr. Thomas Kurian (ENT)',
  'Plastic Surgery (Burns Unit)': 'Dr. Divya R. (Plastic Surgery)', Dentistry: 'Dr. Ajay Varghese (Dental Surgery)',
};
const ALL_DEPTS = Object.keys(DOCTORS);

class Medical {
  constructor(g) {
    this.g = g; this.ambulances = []; this.caseNo = 41000 + randi(0, 900);
    // real hospitals of Fort Kochi & Mattancherry (from OpenStreetMap); the department lists are a game simplification
    const W = g.world, spec = [
      { id: 'thq', re: /Taluk Head Quarters Hospital/i, name: 'Taluk Head Quarters Hospital, Fort Kochi', short: 'Taluk HQ Hospital', type: 'govt', depts: ALL_DEPTS, queue: 2.5 },
      { id: 'mgh', re: /Mattancherry Government Hospital/i, name: 'Government Hospital, Mattancherry', short: 'Govt. Hospital Mattancherry', type: 'govt', depts: ['Casualty', 'Orthopaedics', 'Ophthalmology', 'General Surgery', 'ENT', 'Dentistry'], queue: 1.5 },
      { id: 'phc', re: /Urban Primary Health Cent/i, name: 'Urban Primary Health Centre', short: 'UPHC', type: 'govt', depts: ['Casualty'], queue: .5 },
      { id: 'pvt', re: /Sangeetha Nursing Home/i, name: 'Sangeetha Nursing Home', short: 'Sangeetha (Private)', type: 'private', depts: ALL_DEPTS, queue: .3 },
    ];
    this.hospitals = [];
    for (const h of spec) {
      const p = W.findPOI(h.re); if (!p) continue;
      const px = p.x / 10, pz = p.z / 10, s = W.siteFor(px, pz, 1.6);
      h.pos = V3(s.ex, 0, s.ez); this.hospitals.push(h);
      const f = W.facadeFor(px, pz) || { x: s.ex + s.nx * 2.5, z: s.ez + s.nz * 2.5, rot: s.rot, y: 3 }, rx = Math.cos(f.rot), rz = -Math.sin(f.rot), y = Math.max(2.7, f.y);
      W.addSign(h.name.toUpperCase(), h.type === 'private' ? '#39e6ff' : '#ffffff', f.x + rx * 1.5, y, f.z + rz * 1.5, f.rot, Math.min(12, h.name.length * .42), 1.1);
      W.addSign('+', '#ff3344', f.x - rx * (Math.min(12, h.name.length * .42) / 2 + .2), y, f.z - rz * (Math.min(12, h.name.length * .42) / 2 + .2), f.rot, 1.6, 1.6);
      W.addSign('CASUALTY', '#ff3344', s.ex + s.nx * 1.2, 2.3, s.ez + s.nz * 1.2, s.rot, 3.6, .8);
    }
    // entrance markers
    const ring = new THREE.RingGeometry(1.1, 1.4, 32); ring.rotateX(-Math.PI / 2);
    this.markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .3, .3), transparent: true, opacity: .8, toneMapped: false, depthWrite: false });
    for (const h of this.hospitals) { const m = new THREE.Mesh(ring, this.markMat); m.position.set(h.pos.x, .3, h.pos.z); g.scene.add(m); }
    // tall red light beam over every entrance, visible from far away
    const tex = canvasTex(4, 128, (c, w, hh) => { const gr = c.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); }, true, false);
    this.beamMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.4, .25, .3), transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const bg = new THREE.CylinderGeometry(1.3, 1.3, 70, 20, 1, true); bg.translate(0, 35, 0);
    for (const h of this.hospitals) { const b = new THREE.Mesh(bg, this.beamMat); b.position.set(h.pos.x, .25, h.pos.z); g.scene.add(b); }
    this.gps = null; this.lastInj = 0;
    const crossTex = canvasTex(128, 128, (c, w, hh) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill(); c.lineWidth = 6; c.strokeStyle = '#e8202f'; c.stroke(); c.fillStyle = '#e8202f'; c.fillRect(52, 22, 24, 84); c.fillRect(22, 52, 84, 24); }, true, false);
    this.sprites = this.hospitals.map(h => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: crossTex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); s.renderOrder = 999; s.position.set(h.pos.x, 26, h.pos.z); g.scene.add(s); return s; });
  }
  nearest(pos, needDepts) {
    let best = null, bd = Infinity;
    for (const h of this.hospitals) {
      if (needDepts && !needDepts.every(d => h.depts.includes(d))) continue;
      if (h.type === 'private') continue;                   // 108 takes patients to Government hospitals
      const d = dist2(h.pos, pos); if (d < bd) { bd = d; best = h; }
    }
    return best || this.hospitals[0];
  }

  // the closest hospital whose departments can treat all of this person's injuries
  bestFor(person) {
    const need = [...new Set(person.vitals.injuries.map(k => INJURY[k].dept))];
    const pos = person.car ? person.car.pos : person.pos;
    let best = null, bd = Infinity;
    for (const h of this.hospitals) { if (!need.every(d => h.depts.includes(d))) continue; const d = dist2(h.pos, pos); if (d < bd) { bd = d; best = h; } }
    return best || this.hospitals[0];
  }
  // dial 108 yourself: the ambulance comes to you
  call108() {
    const g = this.g, pl = g.player;
    if (pl.car) { g.hud.notify('Get out of the vehicle and wait — the 108 ambulance will come to you.', 3); return; }
    if (pl.ambulance) { g.hud.notify('A 108 ambulance is already on its way to you.', 3); return; }
    this.requestAmbulance(pl);
    if (pl.ambulance) { AUDIO.blip(700); setTimeout(() => AUDIO.blip(700), 180); g.hud.notify('<b>You dialled 108.</b> Kanivu 108 control room: "Ambulance dispatched — stay where you are." Wait on the roadside.', 6); }
    else g.hud.notify('All 108 ambulances are busy — try again in a moment, or press <kbd>G</kbd> for GPS.', 4);
  }
  toggleGPS() {
    const g = this.g;
    if (this.gps) { this.gps = null; g.hud.notify('GPS cleared.', 1.5); return; }
    this.gps = this.bestFor(g.player);
    g.hud.notify(`GPS set: <b>${this.gps.name}</b>${g.player.vitals.injuries.length ? '' : ' (nearest hospital)'}. Follow the flashing red cross on the minimap.`, 4);
    AUDIO.blip(1000);
  }
  // -------- Kanivu 108 ambulance --------
  requestAmbulance(patient) {
    if (patient.ambulance || this.ambulances.length >= 3) return;
    const g = this.g, p = g.world.randomRoadPoint(patient.pos, 90, 180); if (!p) return;
    const a = g.addVehicle('ambulance', p.pos, p.heading, 'ambulance'); a.driver = 'ai';
    a.ai = Object.assign({ stuckT: 0, revT: 0 }, p.ai);
    a.ai.nd = aiChoose(a.ai, preferToward(patient.pos)); a.sirenOn = true;
    a.job = { patient, phase: 'toPatient', t: 0, hospital: null };
    patient.ambulance = a; this.ambulances.push(a);
  }
  update(dt) {
    const g = this.g;
    this.markMat.opacity = .5 + Math.sin(g.time * 3) * .3;
    const hurt = g.player.vitals.injuries.filter(k => k !== 'bruise').length;
    this.beamMat.opacity = (hurt ? .6 : .3) + Math.sin(g.time * 2.5) * .1;
    if (hurt > this.lastInj && g.state === 'play') {
      const h = this.bestFor(g.player);
      g.hud.notify(`You need treatment. Nearest hospital that can treat you: <b>${h.name}</b> (${Math.round(dist2(h.pos, g.player.focusPos))} m).<br>Press <kbd>G</kbd> for GPS — follow the red cross and red light beam.`, 7);
    }
    this.lastInj = hurt;
    if (this.gps && dist2(this.gps.pos, g.player.focusPos) < 6) { this.gps = null; }
    // keep the floating crosses a readable size at any distance
    const cam = g.camera.position;
    this.sprites.forEach((s, i) => { s.visible = !this.g.cine.active; const d = s.position.distanceTo(cam), tgt = this.gps === this.hospitals[i]; s.scale.setScalar(Math.max(3, d * (tgt ? .07 : .045))); s.material.opacity = tgt ? 1 : .85; });
    for (const a of this.ambulances) {
      if (a.removed || a.dead) { if (a.job.patient) a.job.patient.ambulance = null; a.gone = true; continue; }
      const J = a.job; J.t += dt;
      if (J.phase === 'toPatient') {
        const pt = J.patient;
        if (pt.isPlayer && (pt.car || g.state !== 'play')) { J.phase = 'return'; J.hospital = this.nearest(a.pos); pt.ambulance = null; continue; }
        if (pt.removed) { J.phase = 'return'; J.hospital = this.nearest(a.pos); continue; }
        const d = dist2(a.pos, pt.pos);
        if (d > 35) aiDrive(a, dt, g, 20, preferToward(pt.pos));
        else driveTo(a, pt.pos, dt, 6, g);
        a.stuckT = a.speed < 1 ? (a.stuckT || 0) + dt : 0;
        if ((d < 13 && a.speed < 1.5) || (d < 30 && a.stuckT > 5)) { J.phase = 'loading'; J.t = 0; }   // paramedics walk over with a stretcher
        if (J.t > 90) { J.phase = 'return'; J.hospital = this.nearest(a.pos); }
      } else if (J.phase === 'loading') {
        a.input.throttle = 0; a.input.brake = 0; a.input.handbrake = true;
        if (J.t > 3.5) {
          const pt = J.patient, need = [...new Set(pt.vitals.injuries.map(k => INJURY[k].dept))];
          J.hospital = this.nearest(a.pos, need);
          if (pt.isPlayer) { pt.ambulance = null; J.patient = null; J.phase = 'toHospital'; J.t = 0; a.remove(); if (!pt.vitals.injuries.length) addInjury(pt.vitals, 'bruise'); this.admitPlayer(J.hospital, 'ambulance'); continue; }
          if (dist2(pt.pos, g.camera.position) < 60) g.hud.notify(`<b>Kanivu 108</b> paramedics stabilised the injured person and are taking them to <b>${J.hospital.short}</b>.`, 5);
          g.peds.remove(pt); J.patient = null; J.phase = 'toHospital'; J.t = 0;
        }
      } else {
        const h = J.hospital;
        const d = dist2(a.pos, h.pos);
        if (d > 35) aiDrive(a, dt, g, 22, preferToward(h.pos)); else driveTo(a, h.pos, dt, 8, g);
        if (d < 14 || J.t > 120 || dist2(a.pos, g.focus) > 380) a.remove();
      }
    }
    this.ambulances = this.ambulances.filter(a => !a.gone && !a.removed);
    // walk-in: player at a hospital entrance
    const pl = g.player;
    if (g.state === 'play' && !pl.car && !pl.dead) {
      const h = this.hospitals.find(h => dist2(h.pos, pl.pos) < 3.5);
      if (h && h !== this._prompt) { this._prompt = h; g.hud.notify(`<b>${h.name}</b><br><kbd>F</kbd> go to Casualty${pl.vitals.injuries.length ? '' : ' (no injuries)'}`, 4); }
      if (!h) this._prompt = null;
      this.atEntrance = h || null;
    } else this.atEntrance = null;
  }

  // -------- player treatment: builds a real-style case sheet --------
  admitPlayer(h, how) {
    const g = this.g, pl = g.player, v = pl.vitals;
    const inj = v.injuries.slice();
    const sev = Math.max(0, ...inj.map(k => INJURY[k].sev));
    const triage = v.hp < 25 || sev >= 4 ? 'RED (immediate)' : sev >= 2 || v.hp < 60 ? 'YELLOW (urgent)' : 'GREEN (minor)';
    const govt = h.type === 'govt', mlc = pl.mlcCause;
    const no = ++this.caseNo, rows = [];
    let hours = h.queue * (triage.startsWith('RED') ? .2 : triage.startsWith('YELLOW') ? .6 : 1), cost = govt ? 10 : 500, stay = 0;
    rows.push(['Arrival', how === 'ambulance' ? 'Brought by Kanivu 108 ambulance (EMT + pilot). Oxygen & first aid en route.' : 'Walked in to Casualty.']);
    rows.push(['Registration', `Casualty OP ticket — CAS/${new Date().getFullYear()}/${no}` + (govt ? ' (₹10)' : ' (registration ₹500)')]);
    rows.push(['Triage', `${triage} — assessed by ${DOCTORS.Casualty}`]);
    if (mlc) rows.push(['Medico-Legal Case', `MLC No. ${no % 1000}/MLC registered (${mlc}). Accident Register-cum-Wound Certificate prepared; police aid post informed and statement recorded.`]);
    rows.push(['First aid', 'Vitals recorded, IV line secured, Inj. analgesic' + (inj.some(k => k === 'laceration' || k === 'burns') ? ', Inj. Tetanus Toxoid' : '') + '.']);
    if (!inj.length) rows.push(['Assessment', 'No significant injury found. Advised rest; discharged.']);
    const untreated = [];
    for (const k of inj) {
      const I = INJURY[k];
      if (!h.depts.includes(I.dept)) {
        rows.push(['Referral', `${I.label}: ${I.dept} not available here — referred to Govt. Medical College Hospital (108 transfer advised).`]);
        untreated.push(k); continue;
      }
      if (I.tests.length) rows.push(['Investigations', I.tests.join(' · ')]);
      if (I.dept !== 'Casualty') rows.push(['Referral', `Referred to Dept. of ${I.dept} — seen by ${DOCTORS[I.dept]}`]);
      rows.push(['Diagnosis', I.label]);
      rows.push(['Treatment', I.treat.join(' · ')]);
      stay = Math.max(stay, I.stay); hours += I.sev * .8;
      cost += govt ? (I.tests.length * 60 + (I.stay ? 0 : 0)) : I.priv;
    }
    if (stay) rows.push(['Admission', `Admitted to ${INJURY[inj.find(k => INJURY[k].stay === stay)].dept} ward for ${stay} day${stay > 1 ? 's' : ''}.` + (govt ? ' Treatment covered under KASP (Karunya Arogya Suraksha Padhathi).' : '')]);
    rows.push(['Pharmacy', govt ? 'Medicines issued free from the hospital pharmacy (Govt. free drug distribution).' : `Medicines from in-house pharmacy (₹${(400 + inj.length * 350).toLocaleString()}).`]);
    if (!govt) cost += 400 + inj.length * 350;
    const review = inj.includes('fracture_leg') || inj.includes('fracture_arm') ? 'Review in Ortho OP after 6 weeks with X-ray.' : inj.includes('eye_injury') ? 'Review in Eye OP after 3 days.' : inj.includes('head_injury') ? 'Review in Neurosurgery OP after 1 week. Return immediately if vomiting/drowsiness.' : 'Review if symptoms persist.';
    rows.push(['Discharge', `Discharge summary issued. ${review}`]);
    // apply
    v.injuries = untreated; v.hp = untreated.length ? 70 : 100; pl.mlcCause = null;
    hours += stay * 24;
    g.world.time = (g.world.time + hours) % 24;
    g.addMoney(-cost);
    g.player.teleport(h.pos.clone().add(V3(0, 0, -2.5)), Math.PI);
    g.hud.document({
      title: h.name.toUpperCase(), sub: govt ? 'Department of Health & Family Welfare — Casualty Case Sheet' : 'Private Multispeciality Hospital — Emergency Case Record',
      rows, footer: `Time in hospital: ${hours < 24 ? hours.toFixed(1) + ' hours' : Math.round(hours / 24) + (Math.round(hours / 24) === 1 ? ' day' : ' days')} · Bill: ₹${cost.toLocaleString()}${govt ? ' (Government rates)' : ''}`,
    });
  }
}

// direct low-speed driving to a point (used near the destination)
function driveTo(car, target, dt, stopDist, g) {
  const dx = target.x - car.pos.x, dz = target.z - car.pos.z, d = Math.hypot(dx, dz);
  const diff = wrapAngle(Math.atan2(dx, dz) - car.heading);
  car.input.steer = clamp(diff * 2.2, -1, 1);
  const want = d < stopDist ? 0 : Math.min(10, (d - stopDist) * .8);
  car.input.throttle = car.vF < want ? .5 : 0; car.input.brake = car.vF > want + 1 ? 1 : 0;
  car.input.handbrake = d < stopDist && car.vF < 2;       // hold position with the handbrake (brake at standstill = reverse)
}
