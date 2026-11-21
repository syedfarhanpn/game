'use strict';
// ---------------------------------------------------------------------------
// Law & order modelled on Kerala Police procedure:
//  * Emergency number 112 (ERSS). Witnesses call it; patrols respond.
//  * Traffic: AI enforcement cameras and patrols; e-challans under the Motor
//    Vehicles Act (2019 amendment). City limit 50 km/h, coastal road 70 km/h.
//    Pulled over -> stop, the officer issues the challan, you pay and go.
//  * Crimes under the Bharatiya Nyaya Sanhita (BNS). Simple hurt is
//    non-cognizable (police register a Non-Cognizable Report, no arrest);
//    cognizable offences lead to arrest under the BNSS: grounds of arrest,
//    arrest memo, relative informed, medical examination at a Govt hospital,
//    FIR, then station bail (bailable) or production before the Judicial
//    First Class Magistrate within 24 hours (non-bailable).
//  * Kerala Police do not open fire on suspects here — officers chase on foot
//    and arrest; force (lathi) is used only if you resist.
// Fine amounts follow the MV Act 2019 schedule; confirm current Kerala
// compounding amounts on the Kerala Police / MVD e-challan portals.
// ---------------------------------------------------------------------------
const OFFENCES = {
  overspeed:       { t: 'Over-speeding', law: 'MV Act Sec. 183(1)', fine: 1500, traffic: true },
  dangerous:       { t: 'Dangerous driving', law: 'MV Act Sec. 184', fine: 5000, traffic: true, level: 1 },
  footpath:        { t: 'Driving on footpath', law: 'MV Act Sec. 184', fine: 2000, traffic: true, level: 1 },
  evading:         { t: 'Disobeying direction to stop', law: 'MV Act Sec. 179 · BNS Sec. 221', fine: 2000, level: 2, cog: true, bail: true },
  hit_ped:         { t: 'Rash driving causing hurt', law: 'BNS Sec. 125(a) & 281', level: 2, cog: true, bail: true },
  hit_ped_grievous:{ t: 'Rash driving causing grievous hurt', law: 'BNS Sec. 125(b) & 281', level: 2, cog: true, bail: true },
  hurt:            { t: 'Voluntarily causing hurt', law: 'BNS Sec. 115(2)', level: 1, cog: false, bail: true },
  grievous_hurt:   { t: 'Voluntarily causing grievous hurt', law: 'BNS Sec. 117(2)', level: 2, cog: true, bail: true },
  theft:           { t: 'Theft of motor vehicle', law: 'BNS Sec. 303(2)', level: 2, cog: true, bail: false },
  robbery:         { t: 'Robbery — vehicle taken by force', law: 'BNS Sec. 309(4)', level: 3, cog: true, bail: false },
  police_vehicle:  { t: 'Theft of a police vehicle', law: 'BNS Sec. 303(2) · PDPP Act Sec. 3', level: 3, cog: true, bail: false },
  damage_police:   { t: 'Mischief — damaging police vehicle', law: 'BNS Sec. 324(4) · PDPP Act Sec. 3', level: 2, cog: true, bail: true },
  assault_police:  { t: 'Assaulting a public servant on duty', law: 'BNS Sec. 121(1) & 132', level: 3, cog: true, bail: false },
  dacoity:         { t: 'Dacoity (armed robbery by a gang)', law: 'BNS Sec. 310(2)', level: 4, cog: true, bail: false },
};

class Law {
  constructor(g) {
    this.g = g; this.pending = []; this.fir = 1180 + randi(0, 300); this.challanNo = 0; this.stopT = 0; this.callQ = [];
    // AI enforcement cameras (pole + camera box) on the main roads of Fort Kochi & Mattancherry
    const W = g.world, main = W.carEdges.filter(E => E.w >= 8 && E.len > 60).sort((a, b) => b.len - a.len);
    this.cams = [];
    for (const E of main) {
      if (this.cams.length >= 8) break;
      const q = W.edgePoint(E, E.len / 2);
      if (this.cams.some(c => dist2(c.pos, q) < 250)) continue;
      this.cams.push({ pos: V3(q.x, 0, q.z), cd: 0, px: q.x + q.tz * (E.w / 2 + .8), pz: q.z - q.tx * (E.w / 2 + .8) });
    }
    const poleG = new THREE.CylinderGeometry(.08, .1, 6, 6); poleG.translate(0, 3, 0);
    for (const c of this.cams) {
      const pole = new THREE.Mesh(poleG, stdMat('#555b60', { metalness: .5 })); pole.position.set(c.px, 0, c.pz);
      const box = new THREE.Mesh(boxGeo(.4, .3, .6), stdMat('#e8e8e8')); box.position.y = 6; pole.add(box);
      const led = new THREE.Mesh(boxGeo(.08, .08, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0, 0), toneMapped: false })); led.position.set(0, 6, .31); pole.add(led);
      g.scene.add(pole);
    }
  }
  // posted limits by road class (Kochi city): main roads 60, secondary/tertiary 50, lanes 30
  limitAt(pos) {
    const r = this.g.world.nearestRoad(pos.x, pos.z, true, 15); if (!r) return 30;
    const t = r.E.type; return /^(trunk|primary)/.test(t) ? 60 : /^(secondary|tertiary)/.test(t) ? 50 : 30;
  }

  // record an offence and decide whether police find out
  report(key, pos, extra = {}) {
    const g = this.g, O = OFFENCES[key]; if (!O) return;
    if (!this.pending.some(o => o.key === key)) this.pending.push({ key, time: g.world.time, extra });   // one charge per offence type
    const copNear = g.police.cops.some(c => !c.dead && dist2(c.pos, pos) < 80);
    const witnesses = g.peds.list.filter(p => p.mode !== 'down' && dist2(p.pos, pos) < 30).length;
    if (copNear) this.alert(O.level || 1, key);
    else if (witnesses && !O.traffic && !this.callQ.some(c => c.key === key)) this.callQ.push({ key, t: rand(2, 6), level: O.level || 1 });   // a witness dials 112 (once)
  }
  alert(level, key) {
    const P = this.g.police;
    if (level > P.wanted) P.setWanted(level);
    if (key === 'hurt' && !this._ncNote) { this._ncNote = true; this.g.hud.notify('Simple hurt is <b>non-cognizable</b> (BNS 115): police will warn you and register an NCR — no arrest unless it becomes grievous.', 6); }
  }

  update(dt) {
    const g = this.g, pl = g.player;
    for (const c of this.callQ) { c.t -= dt; if (c.t <= 0) { c.done = true; g.hud.notify('A witness called <b>112</b>. Kerala Police control room has dispatched a patrol.', 4); this.alert(c.level, c.key); } }
    this.callQ = this.callQ.filter(c => !c.done);
    for (const c of this.cams) c.cd -= dt;
    if (!pl.car || g.state !== 'play') return;
    const car = pl.car, kmh = car.speed * 3.6, lim = this.limitAt(car.pos);
    // AI camera e-challan
    for (const c of this.cams) {
      if (c.cd > 0 || dist2(c.pos, car.pos) > 12) continue;
      c.cd = 20;
      if (kmh > lim + 5) {
        const no = 'KL' + (2600000 + (++this.challanNo) * 37 % 99999), fine = OFFENCES.overspeed.fine;
        g.addMoney(-fine); AUDIO.blip(1400);
        g.hud.notify(`<b>e-Challan ${no}</b> — AI traffic camera<br>Over-speeding: ${kmh.toFixed(0)} km/h in a ${lim} km/h zone<br>${OFFENCES.overspeed.law} · <b>₹${fine.toLocaleString()}</b> (auto-paid via e-challan)`, 6);
      }
    }
    // driving on the footpath
    if (kmh > 15 && g.world.blockAt(car.pos.x, car.pos.z) && Math.random() < dt * .5) this.report('footpath', car.pos);
    // pulled over: stop near a patrol car to settle a traffic case
    const P = g.police;
    if (P.wanted === 1 && this.pending.length && this.pending.every(o => OFFENCES[o.key].traffic || o.key === 'hurt')) {
      const near = P.cops.some(c => !c.dead && dist2(c.pos, car.pos) < 30);
      if (near && car.speed < 1.5) { this.stopT += dt; if (this.stopT > 2.5) { this.stopT = 0; this.settleStop(); } }
      else this.stopT = 0;
      if (near && !this._pullNote) { this._pullNote = true; g.hud.notify('<b>Kerala Police</b> patrol behind you — <b>pull over and stop</b> to receive your challan. Driving off is an offence.', 5); }
    } else this._pullNote = false;
  }

  // traffic stop / NCR resolved on the spot
  settleStop() {
    const g = this.g, rows = [];
    VOICE.shout('License-um RC-yum kaanikku.', g.player.focusPos);
    let total = 0;
    for (const o of this.pending) {
      const O = OFFENCES[o.key];
      if (O.traffic) { rows.push(['e-Challan', `${O.t} — ${O.law} — ₹${O.fine.toLocaleString()}`]); total += O.fine; }
      else if (o.key === 'hurt') rows.push(['NCR', `${O.t} (${O.law}) is non-cognizable. Non-Cognizable Report registered; complainant advised to approach the Magistrate. You were warned.`]);
    }
    rows.unshift(['Stopped by', 'Grade SI, Traffic Enforcement Unit, Kerala Police']);
    rows.push(['Documents', 'Driving licence, RC and insurance checked on mParivahan / DigiLocker.']);
    rows.push(['Payment', total ? `Paid ₹${total.toLocaleString()} via the e-challan portal (UPI).` : 'Nothing to pay.']);
    g.addMoney(-total); this.pending = []; g.police.setWanted(0, true);
    g.hud.document({ title: 'KERALA POLICE', sub: 'Traffic stop', rows, footer: total ? `Total fines: ₹${total.toLocaleString()}` : 'Warning issued' });
  }

  // arrest procedure (BNSS 2023)
  arrest() {
    VOICE.shout('Kai pokku!', this.g.player.focusPos);
    const g = this.g, list = this.pending.filter(o => !OFFENCES[o.key].traffic || OFFENCES[o.key].cog);
    const offs = [...new Map(list.map(o => [o.key, OFFENCES[o.key]])).values()];
    if (!offs.length) offs.push(OFFENCES.evading);
    const bail = offs.every(o => o.bail !== false), fir = ++this.fir, yr = new Date().getFullYear();
    const rows = [
      ['Arrest', 'Arrested by Sub-Inspector of Police, Fort Kochi Police Station. Grounds of arrest and right to bail explained (BNSS Sec. 47).'],
      ['Arrest memo', 'Arrest memo prepared, attested by a witness; your family informed (BNSS Sec. 36 & 48).'],
      ['Medical exam', 'Examined by a medical officer at the Govt. hospital before custody (BNSS Sec. 53).'],
      ['FIR', `FIR No. ${fir}/${yr} registered under: ${offs.map(o => o.law).join('; ')}`],
      ...offs.map(o => ['Offence', o.t]),
    ];
    let hours, cost;
    if (bail) { rows.push(['Bail', 'All offences bailable — released on station bail on executing a bond of ₹10,000 with one surety (BNSS Sec. 478).']); hours = 6; cost = 3000; }
    else { rows.push(['Court', 'Non-bailable offence — produced before the Judicial First Class Magistrate within 24 hours (BNSS Sec. 58).'], ['Bail', 'Bail granted by the Magistrate on conditions: appear before the investigating officer every Saturday; do not leave the district.']); hours = 30; cost = 15000; }
    rows.push(['Property', 'Seized vehicle recorded in a mahazar and released to its registered owner.']);
    g.addMoney(-cost); this.pending = [];
    g.world.time = (g.world.time + hours) % 24;
    g.hud.document({ title: 'KERALA POLICE — PORT SOLARA POLICE STATION', sub: 'Arrest & First Information Report', rows, footer: `Time in custody: ${hours} h · Lawyer & bail costs: ₹${cost.toLocaleString()}` });
  }
}
