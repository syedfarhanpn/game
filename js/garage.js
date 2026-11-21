'use strict';
// ---------------------------------------------------------------------------
// VARMA PERFORMANCE WORKS — the player's garage.
// Every upgrade changes the vehicle's real physics values (power, top speed,
// launch traction, tyre grip, brakes, downforce). Stats shown in the UI are
// computed from those same values, so what you see is what you drive.
// ---------------------------------------------------------------------------
const UPGRADES = {
  engine:       { name: 'Engine tune / ECU remap', mult: [1, 1.08, 1.16, 1.25], cost: [0, 45000, 95000, 180000], what: 'Power' },
  turbo:        { name: 'Turbocharger',            mult: [1, 1.1, 1.2, 1.32],   cost: [0, 70000, 150000, 280000], what: 'Power' },
  exhaust:      { name: 'Performance exhaust',     mult: [1, 1.03, 1.05, 1.07], cost: [0, 15000, 30000, 55000], what: 'Power' },
  transmission: { name: 'Transmission',            mult: [1, 1.05, 1.1, 1.15],  cost: [0, 35000, 80000, 140000], what: 'Launch traction' },
  suspension:   { name: 'Suspension',              mult: [1, 1.04, 1.08, 1.12], cost: [0, 25000, 55000, 100000], what: 'Cornering grip' },
  brakes:       { name: 'Brakes',                  mult: [1, 1.1, 1.2, 1.3],    cost: [0, 20000, 45000, 85000], what: 'Braking force' },
  tyres:        { name: 'Tyres',                   mult: [1, 1.03, 1.06, 1.1],  cost: [0, 18000, 40000, 75000], what: 'Grip' },
  aero:         { name: 'Aero body kit',           mult: [0, .25, .5, .8],      cost: [0, 40000, 90000, 160000], what: 'Downforce' },
};
const PAINTS = ['#0d0d0d', '#f2f2f0', '#c0c3c7', '#8a0f18', '#d81b1b', '#0f3d8a', '#0f6e7a', '#1e7a46', '#e6b422', '#ff5a1f', '#5b2c83', '#3a3a3a'];
const newUpgrades = () => ({ engine: 0, turbo: 0, exhaust: 0, transmission: 0, suspension: 0, brakes: 0, tyres: 0, aero: 0 });

// rebuild a vehicle's physics from its base spec + upgrades
function applyUpgrades(v) {
  const base = carPhysics(v.t), u = v.upg || (v.upg = newUpgrades()), M = k => UPGRADES[k].mult[u[k]];
  const ph = Object.assign({}, base);
  ph.P = base.P * M('engine') * M('turbo') * M('exhaust');
  ph.vmax = base.vmax * Math.cbrt(ph.P / base.P);
  ph.muL = base.muL * M('transmission') * M('tyres');
  ph.mu = base.mu * M('tyres') * M('suspension');
  ph.Cf = base.Cf * M('suspension'); ph.Cr = base.Cr * M('suspension');
  ph.brake = M('brakes');
  ph.down = base.down + UPGRADES.aero.mult[u.aero];
  ph.CdA = base.CdA * (1 + .02 * u.aero);
  // real faults (customer cars): a dead ignition coil costs ~28% power, worn pads ~38% braking
  if (v.faults && v.faults.coil) { ph.P *= .72; ph.vmax = base.vmax * Math.cbrt(ph.P / base.P); }
  if (v.faults && v.faults.pads) ph.brake *= .62;
  v.ph = ph;
}
// stats computed from the physics (quick longitudinal simulation)
function vehicleStats(v) {
  const ph = v.ph, g = 9.81, rho = 1.225, frac = ph.drive === 'AWD' ? 1 : ph.drive === 'RWD' ? ph.a / ph.wb + .08 : ph.b / ph.wb - .06;
  let s = 0, t = 0, t100 = null; const dt = .02;
  while (t < 60) {
    const F = Math.min(ph.P / Math.max(s, 1), ph.muL * ph.m * g * frac) - .5 * rho * ph.CdA * s * s - ph.Crr * ph.m * g;
    if (s >= ph.vmax || F <= ph.m * .02) break;
    s += F / ph.m * dt; t += dt; if (t100 === null && s >= 27.78) t100 = t;
  }
  const decel = ph.mu * g * .95 * (ph.brake || 1);
  return { top: Math.round(Math.min(s, ph.vmax) * 3.6), t100: t100 ? t100.toFixed(1) : '—', grip: (ph.mu).toFixed(2), brake: (27.78 * 27.78 / (2 * decel)).toFixed(1), dur: Math.max(0, Math.round(v.health / 10)) };
}

class Garage {
  constructor(g) {
    this.g = g;
    this.bay = V3(LOC.garage.x, 0, LOC.garage.z + 7);          // service bay on the forecourt in front of the shutter
    this.owned = [];                                          // [{type, color, upg, stored}]
    this.el = document.getElementById('garage');
    this.el.addEventListener('click', e => this.onClick(e));
    this.open = false; this.job = null;
  }
  // ---------- world ----------
  near() { return dist2(this.g.player.focusPos, this.bay) < 9; }
  update(dt) {
    const g = this.g, pl = g.player, d = dist2(pl.focusPos, this.bay), door = g.world.garageDoor;
    const want = (d < 18 || g.missions.garageOpen) && g.missions.shutterOpened !== false ? 8.5 : 3.25;
    door.position.y = damp(door.position.y, want, 3, dt);
    if (g.state === 'play' && this.near() && !this.open && !g.missions.blockGaragePrompt && !g.missions._near) {
      const txt = pl.car ? '<kbd>E</kbd> Varma Performance Works — service &amp; upgrades' : '<kbd>E</kbd> Varma Performance Works — your vehicles';
      if (this._p !== 1 || this._pt !== txt) { this._p = 1; this._pt = txt; g.hud.prompt(txt); }
    } else if (this._p === 1) { this._p = 0; if (!g.missions._near) g.hud.prompt(''); }
  }
  spawnOwned(o, idx) {
    const g = this.g, Z = LOC.garage.z + g.world.garageRoadW / 2 + 3, spots = [V3(LOC.garage.x + 15.5, 0, Z), V3(LOC.garage.x + 18.5, 0, Z), V3(LOC.garage.x + 21.5, 0, Z), V3(LOC.garage.x + 24.5, 0, Z)];
    const p = spots[idx % spots.length], v = g.addVehicle(o.type, p, Math.PI, 'owned', o.color);
    v.driver = null; v.owned = true; v.upg = Object.assign(newUpgrades(), o.upg || {}); applyUpgrades(v); v.ownRec = o;
    return v;
  }
  addOwned(type, color, upg) { const o = { type, color, upg: Object.assign(newUpgrades(), upg || {}), stored: false }; this.owned.push(o); return o; }
  spawnAllOwned() { this.owned.filter(o => !o.stored).forEach((o, i) => { if (!this.g.vehicles.some(v => v.ownRec === o)) this.spawnOwned(o, i); }); }

  // ---------- UI ----------
  show(v, job) {
    const g = this.g;
    this.v = v; this.job = job || null; this.open = true; this.tab = job ? 'service' : (v ? 'upgrades' : 'storage');
    if (v) { if (!v.upg) { v.upg = newUpgrades(); } applyUpgrades(v); v.vel.set(0, 0, 0); }
    this.render(); this.el.classList.remove('hidden');
    g.state = 'doc'; if (document.exitPointerLock) document.exitPointerLock();
  }
  close() {
    const g = this.g; this.el.classList.add('hidden'); this.open = false;
    g.state = 'play'; g.clock.getDelta(); g.lock(); g.save();
    if (this.job && this.job.done && this.job.onDone) { const cb = this.job.onDone; this.job = null; cb(); }
  }
  bar(label, val, max, txt) { return `<div class="stat"><span>${label}</span><i><b style="width:${clamp(val / max * 100, 3, 100)}%"></b></i><em>${txt}</em></div>`; }
  render() {
    const v = this.v, g = this.g, tabs = this.job ? ['service'] : v ? ['upgrades', 'paint', 'repair', 'storage'] : ['storage'];
    let h = `<div class="g-head"><div class="g-title">VARMA PERFORMANCE WORKS</div><div class="g-sub">വർമ്മ പെർഫോമൻസ് വർക്ക്സ് · Fort Kochi</div><button data-a="close" class="g-x">✕</button></div>`;
    if (v) {
      const s = vehicleStats(v);
      h += `<div class="g-car"><div class="g-name">${v.t.name}${v.owned ? '' : ' <small>(customer / not yours)</small>'}</div>
        ${this.bar('Top speed', s.top, 420, s.top + ' km/h')}${this.bar('Acceleration', 10 / parseFloat(s.t100 || 30), 5, '0–100 in ' + s.t100 + ' s')}
        ${this.bar('Handling', s.grip, 1.6, s.grip + ' g grip')}${this.bar('Braking', 60 / parseFloat(s.brake), 2.2, '100–0 in ' + s.brake + ' m')}${this.bar('Durability', s.dur, 100, s.dur + '%')}</div>`;
    }
    h += `<div class="g-tabs">${tabs.map(t => `<button data-tab="${t}" class="${t === this.tab ? 'on' : ''}">${t.toUpperCase()}</button>`).join('')}</div><div class="g-body">`;
    if (this.tab === 'service' && this.job) {
      for (const [i, j] of this.job.items.entries()) h += `<div class="g-row"><span>${j.label}<small>${j.note || ''}</small></span>${j.done ? '<em class="ok">DONE</em>' : j.prog != null ? `<i class="prog"><b style="width:${j.prog * 100}%"></b></i>` : `<button data-a="job" data-i="${i}">START</button>`}</div>`;
      const all = this.job.items.every(j => j.done);
      h += all ? `<button data-a="finishjob" class="g-big">COMPLETE SERVICE</button>` : `<div class="g-note">Customer's job card — parts billed to the customer.</div>`;
    } else if (this.tab === 'upgrades') {
      if (!v.owned) h += `<div class="g-note">This vehicle isn't yours — you can only service it. Upgrades are for vehicles you own.</div>`;
      for (const k in UPGRADES) {
        const U = UPGRADES[k], lv = v.upg[k], max = U.cost.length - 1, next = U.cost[lv + 1];
        h += `<div class="g-row"><span>${U.name}<small>${U.what}</small></span><span class="pips">${[1, 2, 3].map(n => `<b class="${n <= lv ? 'on' : ''}"></b>`).join('')}</span>${lv >= max ? '<em class="ok">MAX</em>' : `<button data-a="up" data-k="${k}" ${!v.owned || g.money < next ? 'disabled' : ''}>₹${next.toLocaleString('en-IN')}</button>`}</div>`;
      }
    } else if (this.tab === 'paint') {
      h += `<div class="g-note">Respray — ₹5,000</div><div class="swatches">${PAINTS.map(c => `<button data-a="paint" data-c="${c}" style="background:${c}" ${!v.owned || g.money < 5000 ? 'disabled' : ''}></button>`).join('')}</div>`;
    } else if (this.tab === 'repair') {
      const cost = Math.round((1000 - v.health) * 15);
      h += cost <= 0 ? `<div class="g-note">No damage — the car is in perfect condition.</div>` : `<div class="g-row"><span>Body &amp; mechanical repair<small>${Math.round(v.health / 10)}% condition</small></span><button data-a="repair" ${g.money < cost ? 'disabled' : ''}>₹${cost.toLocaleString('en-IN')}</button></div>`;
    } else if (this.tab === 'storage') {
      if (v && v.owned) h += `<div class="g-row"><span>Store this ${v.t.name}<small>Keeps upgrades &amp; paint</small></span><button data-a="store">STORE</button></div>`;
      const st = this.owned.filter(o => o.stored);
      h += st.length ? st.map((o, i) => `<div class="g-row"><span>${CAR_TYPES[o.type].name}<small>stored</small></span><button data-a="takeout" data-i="${this.owned.indexOf(o)}">TAKE OUT</button></div>`).join('') : `<div class="g-note">No vehicles in storage.</div>`;
      h += `<div class="g-note">Owned: ${this.owned.map(o => CAR_TYPES[o.type].name + (o.stored ? ' (stored)' : '')).join(', ') || 'none'}</div>`;
    }
    h += `</div><div class="g-foot">Balance: <b>₹${g.money.toLocaleString('en-IN')}</b> · Esc / ✕ to close</div>`;
    this.el.querySelector('.g-panel').innerHTML = h;
  }
  onClick(e) {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const g = this.g, v = this.v, a = b.dataset.a;
    if (b.dataset.tab) { this.tab = b.dataset.tab; return this.render(); }
    if (a === 'close') return this.close();
    if (a === 'up') { const k = b.dataset.k, c = UPGRADES[k].cost[v.upg[k] + 1]; if (g.money < c) return; g.addMoney(-c); v.upg[k]++; applyUpgrades(v); if (v.ownRec) v.ownRec.upg = Object.assign({}, v.upg); AUDIO.blip(1200); g.save(); }
    if (a === 'paint') { g.addMoney(-5000); v.color = b.dataset.c; v.paint.color.copy(col(v.color)); if (v.ownRec) v.ownRec.color = v.color; AUDIO.blip(900); g.save(); }
    if (a === 'repair') { const c = Math.round((1000 - v.health) * 15); g.addMoney(-c); v.health = 1000; v.paint.color.copy(col(v.color)); AUDIO.blip(900); }
    if (a === 'store') { const o = v.ownRec; if (o) { o.stored = true; o.upg = Object.assign({}, v.upg); o.color = v.color; } if (g.player.car === v) g.player.exitCar(true); g.player.teleport(this.bay.clone().add(V3(-3, 0, -2)), Math.PI); v.remove(); this.v = null; this.tab = 'storage'; g.save(); }
    if (a === 'takeout') { const o = this.owned[+b.dataset.i]; o.stored = false; const nv = this.spawnOwned(o, 0); nv.pos.copy(this.bay); nv.heading = Math.PI; nv.lastValid.copy(this.bay); nv.sync(0); g.save(); return this.close(); }
    if (a === 'job') {
      const j = this.job.items[+b.dataset.i]; j.prog = 0; AUDIO.blip(600);
      const t0 = performance.now(), tick = () => { j.prog = Math.min(1, (performance.now() - t0) / (j.time || 2500)); if (j.prog >= 1) { j.done = true; j.prog = null; AUDIO.blip(1200); if (j.fix && v.faults) { delete v.faults[j.fix]; applyUpgrades(v); } } this.render(); if (!j.done) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); return;
    }
    if (a === 'finishjob') { this.job.done = true; v.health = 1000; return this.close(); }
    this.render();
  }
}
