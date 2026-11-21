'use strict';
// ---------------------------------------------------------------------------
// Vitals, injuries and hand-to-hand fighting. Everybody — the player, every
// pedestrian, police officers — has the same 100 health and can punch / kick.
// Injuries are specific (which body part, what damage) and each one is
// treated by the matching hospital department (see medical.js).
// ---------------------------------------------------------------------------
const INJURY = {
  bruise:            { label: 'Contusion (bruising)', dept: 'Casualty', sev: 1, tests: [], treat: ['Cold compress', 'Tab. Paracetamol 650 mg'], stay: 0, priv: 800 },
  fracture_leg:      { label: 'Fracture — shaft of right tibia', dept: 'Orthopaedics', sev: 3, effect: 'limp', tests: ['X-ray right leg (AP & lateral views)'], treat: ['Closed reduction under sedation', 'Above-knee POP cast', 'Crutches, non-weight-bearing 6 weeks'], stay: 1, priv: 22000 },
  fracture_arm:      { label: 'Fracture — distal radius (Colles\')', dept: 'Orthopaedics', sev: 2, effect: 'weakArm', tests: ['X-ray wrist (AP & lateral)'], treat: ['Closed reduction', 'Below-elbow POP slab', 'Arm sling'], stay: 0, priv: 12000 },
  eye_injury:        { label: 'Blunt eye trauma — traumatic hyphema', dept: 'Ophthalmology', sev: 2, effect: 'blur', tests: ['Visual acuity (Snellen chart)', 'Slit-lamp examination', 'Intra-ocular pressure (tonometry)'], treat: ['Steroid + cycloplegic eye drops', 'Protective eye shield', 'Head-end elevation, review in 3 days'], stay: 0, priv: 6500 },
  head_injury:       { label: 'Head injury — concussion (GCS 14/15)', dept: 'Neurosurgery', sev: 3, effect: 'dizzy', tests: ['GCS & pupil assessment', 'CT scan brain (plain)'], treat: ['Observation in neurosurgery ward (24 h)', 'Analgesics & anti-emetics', 'Head-injury advice card'], stay: 1, priv: 28000 },
  laceration:        { label: 'Lacerated wound 4 cm (scalp)', dept: 'General Surgery', sev: 2, effect: 'bleed', tests: ['Wound inspection'], treat: ['Wound wash & debridement', 'Suturing — 6 sutures', 'Inj. Tetanus Toxoid (TT) 0.5 ml IM'], stay: 0, priv: 4500 },
  nose_fracture:     { label: 'Fracture — nasal bones', dept: 'ENT', sev: 2, tests: ['X-ray nasal bones (lateral)', 'Anterior rhinoscopy'], treat: ['Anterior nasal packing', 'Closed reduction after swelling settles'], stay: 0, priv: 9000 },
  rib_fracture:      { label: 'Fracture — left 5th & 6th ribs', dept: 'General Surgery', sev: 2, effect: 'breath', tests: ['Chest X-ray (PA view)', 'Pulse oximetry'], treat: ['Analgesics', 'Incentive spirometry'], stay: 1, priv: 15000 },
  internal_bleeding: { label: 'Blunt abdominal trauma — splenic laceration', dept: 'General Surgery', sev: 4, effect: 'critical', tests: ['eFAST ultrasound', 'Blood grouping & cross-match', 'CECT abdomen'], treat: ['IV fluids & 2 units blood transfusion', 'Emergency laparotomy — splenorrhaphy', 'Post-operative ICU care'], stay: 5, priv: 190000 },
  burns:             { label: 'Burns — 12% TBSA, partial thickness', dept: 'Plastic Surgery (Burns Unit)', sev: 3, effect: 'bleed', tests: ['Burn assessment (Rule of Nines)'], treat: ['IV fluids (Parkland formula)', 'Silver sulfadiazine dressings', 'Inj. Tetanus Toxoid (TT)'], stay: 4, priv: 95000 },
  dental:            { label: 'Avulsed upper incisor tooth', dept: 'Dentistry', sev: 1, tests: ['IOPA X-ray'], treat: ['Re-implantation & splinting'], stay: 0, priv: 5500 },
};
const GRIEVOUS = new Set(['fracture_leg', 'fracture_arm', 'eye_injury', 'head_injury', 'nose_fracture', 'rib_fracture', 'internal_bleeding', 'burns', 'dental']);

function newVitals() { return { hp: 100, injuries: [], conscious: true, bleedT: 0 }; }
function hasEffect(v, e) { return v.injuries.some(i => INJURY[i].effect === e); }
function addInjury(v, key) { if (INJURY[key] && !v.injuries.includes(key)) { v.injuries.push(key); return true; } return false; }
function rollInjury(table) {   // table: [[key, probability], ...]
  const got = [];
  for (const [k, p] of table) if (Math.random() < p) got.push(k);
  return got;
}

// injuries from a melee blow
function meleeInjuries(kind) {
  return kind === 'kick'
    ? rollInjury([['bruise', .7], ['fracture_leg', .07], ['rib_fracture', .07], ['fracture_arm', .04]])
    : rollInjury([['bruise', .7], ['eye_injury', .09], ['nose_fracture', .07], ['laceration', .06], ['dental', .04], ['head_injury', .03]]);
}
// injuries from a vehicle (speed in m/s) — pedestrian struck, or occupant in a crash
function vehicleInjuries(speed, pedestrian) {
  if (pedestrian) {
    if (speed > 20) return rollInjury([['fracture_leg', .9], ['head_injury', .8], ['internal_bleeding', .6], ['laceration', .7], ['rib_fracture', .5]]);
    if (speed > 10) return rollInjury([['fracture_leg', .65], ['head_injury', .35], ['laceration', .6], ['fracture_arm', .3], ['bruise', 1]]);
    return rollInjury([['bruise', 1], ['laceration', .3], ['fracture_leg', .15]]);
  }
  if (speed > 25) return rollInjury([['head_injury', .5], ['rib_fracture', .6], ['laceration', .6], ['internal_bleeding', .25], ['fracture_arm', .3]]);
  if (speed > 15) return rollInjury([['bruise', 1], ['laceration', .4], ['rib_fracture', .25], ['head_injury', .15]]);
  return rollInjury([['bruise', .8]]);
}

// ---- agents: the player, or a pedestrian object from npc.js
function agentFacing(a) { return a.isPlayer ? a.facing : a.heading; }

// A melee attack. Returns true if it connected.
function meleeAttack(g, att, kind) {
  const f = agentFacing(att), reach = kind === 'kick' ? 1.55 : 1.35;
  let best = null, bd = reach;
  const cand = g.peds.list.filter(p => p !== att && p.mode !== 'down' && !p.removed);
  if (!att.isPlayer && !g.player.car && !g.player.dead) cand.push(g.player);
  for (const t of cand) {
    const dx = t.pos.x - att.pos.x, dz = t.pos.z - att.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || d < .05) continue;
    if ((dx * Math.sin(f) + dz * Math.cos(f)) / d < .45) continue;
    best = t; bd = d;
  }
  if (att.h) kind === 'kick' ? att.h.kick() : att.h.punch();
  if (!best) { AUDIO.burst(1200, .05, .12); return false; }
  applyHit(g, att, best, kind);
  return true;
}

function applyHit(g, att, tgt, kind) {
  const weak = att.vitals && hasEffect(att.vitals, 'weakArm') && kind === 'punch';
  let dmg = (kind === 'kick' ? 14 : 8) * (weak ? .4 : 1) * rand(.8, 1.2);
  const v = tgt.vitals;
  v.hp -= dmg;
  const inj = meleeInjuries(kind);
  inj.forEach(k => addInjury(v, k));
  if (tgt.h) tgt.h.flinch();
  const dx = tgt.pos.x - att.pos.x, dz = tgt.pos.z - att.pos.z, d = Math.hypot(dx, dz) || 1;
  if (tgt.isPlayer) { tgt.vel.x += dx / d * 2.5; tgt.vel.z += dz / d * 2.5; g.hud.flashDamage(); }
  else { tgt.pos.x += dx / d * .35; tgt.pos.z += dz / d * .35; }
  kind === 'kick' ? AUDIO.thud() : AUDIO.punch();
  if (att.isPlayer) {
    const grievous = inj.some(k => GRIEVOUS.has(k));
    g.law.report(grievous ? 'grievous_hurt' : 'hurt', tgt.pos, { victim: tgt, injuries: inj });
  }
  if (tgt.isPlayer) { tgt.mlcCause = 'assault'; if (inj.length && inj[0] !== 'bruise') g.hud.notify('Injured: <b>' + INJURY[inj[0]].label + '</b>', 3); if (v.hp <= 0) g.onKnockout('assault'); }
  else g.peds.onHit(tgt, att, v.hp <= 0);
}

// player hurt by a crash / being run over
function injurePlayerByVehicle(g, speed, pedestrian) {
  const pl = g.player, inj = vehicleInjuries(speed, pedestrian);
  let added = []; inj.forEach(k => { if (addInjury(pl.vitals, k)) added.push(k); });
  pl.vitals.hp -= pedestrian ? speed * 3.5 : Math.max(0, speed - 12) * 2.5;
  g.hud.flashDamage();
  if (added.length) g.hud.notify('Injured: <b>' + added.map(k => INJURY[k].label).join(', ') + '</b>', 4);
  if (pl.vitals.hp <= 0) g.onKnockout(pedestrian ? 'hit by a vehicle' : 'road accident');
}

// ongoing effects of untreated injuries
function tickInjuries(g, v, dt, isPlayer) {
  if (hasEffect(v, 'bleed') && v.hp > 35) v.hp -= dt * .25;
  if (hasEffect(v, 'critical')) { v.hp -= dt * .6; }
  if (isPlayer && v.hp <= 0 && !g.player.dead) g.onKnockout('injuries');
}
