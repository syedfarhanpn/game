'use strict';
// ---------------------------------------------------------------------------
// HUD: minimap, wanted stars, money, health, objectives, banners, subtitles,
// letterbox / fade control for cinematics, full-screen map.
// ---------------------------------------------------------------------------
class HUD {
  constructor(game) {
    this.g = game;
    const $ = id => document.getElementById(id);
    this.el = { hud: $('hud'), clock: $('clock'), money: $('money'), stars: $('stars'), health: $('healthbar').firstElementChild, objective: $('objective'), notify: $('notify'), station: $('station'), timer: $('timer'), speedo: $('speedo'), speed: $('speed'), carname: $('carname'), dmg: $('damage-flash'), banner: $('banner'), fade: $('fade'), title: $('title-card'), sub: $('subtitle'), bigmap: $('bigmap') };
    this.mm = $('minimap').getContext('2d'); this.bm = $('bigmap-canvas').getContext('2d');
    this.money = 0; this.shownMoney = 0; this.timers = {};
    this.el.stars.innerHTML = '<span>★</span>'.repeat(5);
    this.starEls = [...this.el.stars.children];
    this.markers = [];
    this.el.injuries = document.getElementById('injuries'); this._injKey = '';
    document.getElementById('doc-ok').onclick = () => this.closeDocument();
  }
  // official document overlay (hospital case sheet, FIR, challan) — rows appear one by one
  document(d, onClose) {
    this._docClose = onClose || null;
    const P = document.getElementById('docpanel');
    P.querySelector('.doc-title').textContent = d.title; P.querySelector('.doc-sub').textContent = d.sub || '';
    const R = P.querySelector('.doc-rows'); R.innerHTML = '';
    d.rows.forEach(([k, v], i) => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<b>${k}</b><span>${v}</span>`; R.appendChild(r); setTimeout(() => r.classList.add('on'), 250 + i * 260); });
    P.querySelector('.doc-foot').textContent = d.footer || '';
    P.classList.remove('hidden');
    this.g.state = 'doc'; if (document.exitPointerLock) document.exitPointerLock();
  }
  closeDocument() {
    document.getElementById('docpanel').classList.add('hidden');
    this.g.state = 'play'; this.g.camRig.snapBehind(); this.g.clock.getDelta(); this.g.lock();
    const cb = this._docClose; this._docClose = null; if (cb) cb();
  }
  show(v) { this.el.hud.classList.toggle('hidden', !v); }
  setMoney(m) { this.money = m; }
  setWanted(n, flashing) {
    this.starEls.forEach((s, i) => s.classList.toggle('on', i < n));
    this.el.stars.classList.toggle('flash', !!flashing && n > 0);
  }
  objective(html) { this.el.objective.innerHTML = html || ''; }
  notify(html, dur = 4) {
    const n = this.el.notify; n.innerHTML = html; n.classList.add('show');
    clearTimeout(this.timers.n); this.timers.n = setTimeout(() => n.classList.remove('show'), dur * 1000);
  }
  showStation(name) { const s = this.el.station; s.textContent = name; s.classList.add('show'); clearTimeout(this.timers.s); this.timers.s = setTimeout(() => s.classList.remove('show'), 2500); }
  setCar(name) { this.el.speedo.classList.toggle('show', !!name); this.el.carname.textContent = name || ''; }
  setTimer(sec) { this.el.timer.textContent = sec == null ? '' : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`; this.el.timer.style.color = sec != null && sec < 10 ? '#ff4d5e' : '#ffd23f'; }
  flashDamage() { this.el.dmg.style.opacity = 1; clearTimeout(this.timers.d); this.timers.d = setTimeout(() => this.el.dmg.style.opacity = 0, 150); }
  banner(title, sub, kind = '', dur = 4) {
    const b = this.el.banner; b.className = kind; b.querySelector('.b-title').textContent = title; b.querySelector('.b-sub').textContent = sub || '';
    void b.offsetWidth; b.classList.add('show');
    clearTimeout(this.timers.b); this.timers.b = setTimeout(() => b.classList.remove('show'), dur * 1000);
  }
  // ---- cinematic controls
  letterbox(on) { document.body.classList.toggle('cine', on); }
  fade(to, sec = .8) { const f = this.el.fade; f.style.transition = `opacity ${sec}s ease`; f.style.opacity = to; }
  title(main, sub, style = '', dur = 4) {
    const t = this.el.title; t.className = style; t.querySelector('.tc-main').textContent = main; t.querySelector('.tc-sub').textContent = sub || '';
    void t.offsetWidth; t.classList.add('show');
    clearTimeout(this.timers.t); this.timers.t = setTimeout(() => t.classList.remove('show'), dur * 1000);
  }
  clearTitle() { this.el.title.classList.remove('show'); }
  subtitle(who, line, dur = 3.5) {
    const s = this.el.sub; s.querySelector('.who').textContent = who ? who + ':' : ''; VOICE.line(who, line);   // speak it
    s.querySelector('.line').innerHTML = String(line).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;(\/?)i&gt;/g, '<$1i>');
    s.classList.add('show'); clearTimeout(this.timers.sub); this.timers.sub = setTimeout(() => s.classList.remove('show'), dur * 1000);
  }
  clearSubtitle() { this.el.sub.classList.remove('show'); }

  update(dt) {
    const g = this.g, pl = g.player;
    this.shownMoney = Math.abs(this.money - this.shownMoney) < 2 ? this.money : lerp(this.shownMoney, this.money, 1 - Math.exp(-6 * dt));
    this.el.money.textContent = '₹' + Math.round(this.shownMoney).toLocaleString('en-IN');
    const rp = document.getElementById('rep'); if (rp) rp.textContent = 'REPUTATION ' + this.g.rep;
    const t = g.world.time, hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    this.el.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    this.el.health.style.width = pl.health + '%';
    const key = pl.vitals.injuries.join(',');
    if (key !== this._injKey) { this._injKey = key; this.el.injuries.innerHTML = pl.vitals.injuries.filter(k => k !== 'bruise').map(k => `<div><b>${INJURY[k].label}</b> — see ${INJURY[k].dept}</div>`).join(''); }
    this.el.health.style.background = pl.health < 30 ? 'linear-gradient(90deg,#d43f3f,#ff8080)' : '';
    if (pl.car) {
      const c = pl.car; this.el.speed.textContent = Math.round(c.speed * 3.6);
      // gear + rpm (same 6-speed model the engine sound uses) and damage
      const r = Math.min(Math.abs(c.vF) / c.t.maxSpeed * 5, 4.999), gi = Math.floor(r), rf = .25 + (r - gi) * .75 * (gi === 0 ? 1 : .8) + (gi ? .15 : 0);
      const gear = c.vF < -.5 ? 'R' : c.speed < .4 && !c.input.throttle ? 'N' : String(gi + 1), rpm = c.speed < .4 && !c.input.throttle ? 850 : Math.round(800 + rf * 6700);
      const ge = document.getElementById('gear'), rb = document.getElementById('rpmbar'), db = document.getElementById('dmgbar');
      if (ge) ge.textContent = gear; if (rb) { rb.style.width = (rpm / 7500 * 100) + '%'; rb.style.background = rpm > 6800 ? '#ff4d5e' : ''; }
      if (db) { const h = Math.max(0, c.health / 10); db.style.width = h + '%'; db.style.background = h < 35 ? '#ff4d5e' : h < 65 ? '#ffb347' : ''; }
    }
    this.updateBarks(dt);
    // hospital compass (always on): nearest / GPS target, distance and direction
    const hc = document.getElementById('hospcomp');
    if (hc && g.medical) {
      const tgt = g.medical.gps || g.medical.bestFor(pl), fp = pl.focusPos, dx = tgt.pos.x - fp.x, dz = tgt.pos.z - fp.z;
      const rel = Math.atan2(dx, dz) - g.camRig.yaw;
      hc.querySelector('.arrow').style.transform = `rotate(${-rel}rad)`;
      hc.querySelector('.txt').innerHTML = `<b>${tgt.short}</b> ${Math.round(Math.hypot(dx, dz))} m`;
      hc.classList.toggle('urgent', pl.vitals.injuries.some(k => k !== 'bruise'));
    }
    const gp = g.medical && g.medical.gps, gel = document.getElementById('gps');
    if (gel) { if (gp) { gel.style.display = 'block'; gel.innerHTML = `<span class="x">+</span> <b>${gp.name}</b> · ${Math.round(dist2(gp.pos, pl.focusPos))} m <small>(G to cancel)</small>`; } else gel.style.display = 'none'; }
    this.mmFrame = (this.mmFrame || 0) + 1; if (this.mmFrame % 2 === 0) this.drawMinimap();
    if (!this.el.bigmap.classList.contains('hidden')) this.drawBigmap();
  }
  drawMinimap() {
    const g = this.g, ctx = this.mm, W = g.world, M = W.map, S = 220, pl = g.player;
    const p = pl.focusPos, speed = pl.car ? pl.car.speed : 0;
    const zoom = clamp(1.7 - speed / 60, 0.9, 1.7);
    const scale = zoom * 0.95 / M.s; // px per map px
    ctx.save();
    ctx.fillStyle = '#1d4e73'; ctx.fillRect(0, 0, S, S);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(S / 2, S / 2);
    const rot = g.camRig.yaw + Math.PI;  // map rotates with camera; forward = up
    ctx.rotate(rot);
    const k = M.s * scale; // world m -> px
    ctx.drawImage(W.mapCanvas, -(p.x - M.x0) * k, -(p.z - M.z0) * k, W.mapCanvas.width * scale, W.mapCanvas.height * scale);
    // blips
    const blip = (x, z, color, r = 4, shape = 'dot', clampEdge = true) => {
      let bx = (x - p.x) * k, bz = (z - p.z) * k;
      const d = Math.hypot(bx, bz), max = S / 2 - 8;
      if (d > max) { if (!clampEdge) return; bx *= max / d; bz *= max / d; }
      ctx.save(); ctx.translate(bx, bz); ctx.rotate(-rot);
      ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (shape === 'cross') {   // hospital: white tile with a red cross
        ctx.fillStyle = '#fff'; ctx.rect(-r, -r, r * 2, r * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8202f'; const a = r * .32, l = r * .78; ctx.fillRect(-a, -l, a * 2, l * 2); ctx.fillRect(-l, -a, l * 2, a * 2);
        ctx.restore(); return;
      }
      if (shape === 'square') ctx.rect(-r, -r, r * 2, r * 2); else ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke(); ctx.restore();
    };
    const flash = Math.sin(g.time * 10) > 0;
    for (const c of g.vehicles) if (c.role === 'police' && !c.dead && g.police.wanted > 0) blip(c.pos.x, c.pos.z, flash ? '#ff3344' : '#3d7dff', 3.5);
    if (g.police.heli) blip(g.police.heli.pos.x, g.police.heli.pos.z, flash ? '#ff3344' : '#3d7dff', 5, 'square');
    if (g.medical) for (const h of g.medical.hospitals) { const tgt = g.medical.gps === h; blip(h.pos.x, h.pos.z, '#fff', tgt ? 7 + Math.sin(g.time * 6) : 5.5, 'cross', tgt); }
    for (const m of this.markers) blip(m.pos.x, m.pos.z, m.color, m.r || 5.5, m.shape);
    ctx.restore();
    // player arrow (always pointing up = camera forward; rotate by facing relative to camera)
    ctx.save(); ctx.translate(S / 2, S / 2);
    const face = pl.car ? pl.car.heading : pl.facing;
    ctx.rotate(-(face - g.camRig.yaw));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // north marker
    const na = rot; ctx.save(); ctx.translate(S / 2 + Math.sin(-na) * 0, S / 2);
    const nx = S / 2 + Math.cos(-Math.PI / 2 + rot) * (S / 2 - 12), ny = S / 2 + Math.sin(-Math.PI / 2 + rot) * (S / 2 - 12);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', nx, ny);
  }
  // interaction prompt (bottom centre)
  prompt(html) { const p = document.getElementById('prompt'); if (!p) return; p.innerHTML = html || ''; p.style.opacity = html ? 1 : 0; }
  // character & inventory (Tab)
  toggleCharPanel() {
    const P = document.getElementById('charpanel'), g = this.g, pl = g.player; if (!P) return;
    if (!P.classList.contains('hidden')) { P.classList.add('hidden'); return; }
    const inj = pl.vitals.injuries.filter(k => k !== 'bruise').map(k => INJURY[k].label).join(', ') || 'None';
    const owned = g.garage.owned.map(o => `${CAR_TYPES[o.type].name}${o.stored ? ' (stored)' : ''} — ${Object.values(o.upg || {}).reduce((a, b) => a + b, 0)} upgrades`).join('<br>') || 'None';
    P.innerHTML = `<div class="cp"><div class="cp-name">ARJUN VARMA</div><div class="cp-sub">27 · Fort Kochi · Exotic-car mechanic &amp; tuner · Owner, Varma Performance Works</div>
      <div class="cp-grid"><div><b>Money</b>₹${g.money.toLocaleString('en-IN')}</div><div><b>Reputation</b>${g.rep}</div><div><b>Health</b>${Math.round(pl.health)}%</div><div><b>Wanted</b>${'★'.repeat(g.police.wanted) || '—'}</div></div>
      <div class="cp-sec"><b>Injuries</b>${inj}</div><div class="cp-sec"><b>Vehicles</b>${owned}</div>
      <div class="cp-sec"><b>Current job</b>${g.missions.active ? g.missions.active.title : 'Free roam'}</div><div class="cp-foot">Tab to close · clothing &amp; appearance customisation arrives in a later build</div></div>`;
    P.classList.remove('hidden');
  }
  // NPC speech bubbles that follow the speaker
  bark(text, who) {
    if (!this.barks) this.barks = [];
    if (this.barks.length > 3) return;
    const el = document.createElement('div'); el.className = 'bark'; el.textContent = text; document.getElementById('barks').appendChild(el);
    VOICE.bark(text, who);
    this.barks.push({ el, who, t: 2.8 });
  }
  updateBarks(dt) {
    if (!this.barks) return;
    const cam = this.g.camera, v = this._bv || (this._bv = V3());
    for (const b of this.barks) {
      b.t -= dt; v.copy(b.who.pos); v.y += 2.15; v.project(cam);
      const vis = v.z < 1 && b.t > 0; b.el.style.opacity = vis ? Math.min(1, b.t * 2) : 0;
      b.el.style.left = ((v.x * .5 + .5) * innerWidth) + 'px'; b.el.style.top = ((-v.y * .5 + .5) * innerHeight) + 'px';
      if (b.t <= 0) b.el.remove();
    }
    this.barks = this.barks.filter(b => b.t > 0);
  }
  // M: Fort Kochi city map -> Kerala state map -> closed
  toggleBigmap() {
    const el = this.el.bigmap;
    if (el.classList.contains('hidden')) { el.classList.remove('hidden'); this.mapMode = 'city'; }
    else if (this.mapMode === 'city') this.mapMode = 'kerala';
    else el.classList.add('hidden');
    const lg = el.querySelector('.bm-legend'); if (lg && !this._lgCity) this._lgCity = lg.innerHTML;
    if (lg) lg.innerHTML = this.mapMode === 'kerala' ? 'KERALA · കേരളം — 14 districts &nbsp;·&nbsp; <span style="color:#ffd23f">●</span> you are here (Fort Kochi, Ernakulam) &nbsp;·&nbsp; M to close &nbsp;·&nbsp; map data © OpenStreetMap contributors' : this._lgCity + ' &nbsp;·&nbsp; M again: Kerala map';
  }
  // the real Kerala state map (OpenStreetMap boundaries, simplified)
  keralaCanvas() {
    if (this._kc) return this._kc;
    const K = KOCHI_MAP.kerala, S = 900, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const r of K.state) for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
    const cl = Math.cos((y0 + y1) / 2 * Math.PI / 180), k = Math.min(S * .9 / ((x1 - x0) * cl), S * .9 / (y1 - y0));
    const ox = S / 2 - (x0 + x1) / 2 * cl * k, oy = S / 2 + (y0 + y1) / 2 * k;
    const P = (lon, lat) => [ox + lon * cl * k, oy - lat * k]; this._kp = P;
    const grd = g.createLinearGradient(0, 0, S, S); grd.addColorStop(0, '#123a57'); grd.addColorStop(1, '#0d2c44'); g.fillStyle = grd; g.fillRect(0, 0, S, S);
    const poly = r => { g.beginPath(); for (let i = 0; i < r.length; i += 2) { const [x, y] = P(r[i], r[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
    const greens = ['#2f6b3f', '#3a7a46', '#35723f', '#417f4a', '#2c6339', '#3d7444', '#477f4c'];
    K.districts.forEach((d, i) => { g.fillStyle = greens[i % greens.length]; for (const r of d.rings) { poly(r); g.fill(); } });
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; for (const d of K.districts) for (const r of d.rings) { poly(r); g.stroke(); }
    g.strokeStyle = '#e8b04a'; g.lineWidth = 2.2; for (const r of K.state) { poly(r); g.stroke(); }
    g.textAlign = 'center';
    for (const d of K.districts) {
      let ax = 0, ay = 0, n = 0; const r = d.rings.reduce((a, b) => b.length > a.length ? b : a, []);
      for (let i = 0; i < r.length; i += 2) { ax += r[i]; ay += r[i + 1]; n++; }
      const [x, y] = P(ax / n, ay / n);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 13px Inter'; g.fillText((d.n || '').toUpperCase(), x, y);
      if (d.ml) { g.font = '12px "Noto Sans Malayalam"'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(d.ml, x, y + 15); }
    }
    for (const t of K.towns) {
      if (t.p !== 'city' && !/Kochi|Kozhikode|Thiruvananthapuram|Kollam|Thrissur|Kannur|Alappuzha|Kottayam|Palakkad|Malappuram|Munnar|Kasaragod|Pathanamthitta|Kalpetta|Thodupuzha|Guruvayur|Varkala/.test(t.n)) continue;
      const [x, y] = P(t.lon, t.lat); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, t.p === 'city' ? 3.5 : 2.4, 0, 7); g.fill();
      g.font = '600 11px Inter'; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(t.n, x + 6, y + 4); g.textAlign = 'center';
    }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 22px "Bebas Neue"'; g.fillText('ARABIAN SEA', S * .2, S * .55);
    g.font = '700 30px "Bebas Neue"'; g.fillStyle = '#e8b04a'; g.fillText('KERALA', S * .82, 60); g.font = '18px "Noto Sans Malayalam"'; g.fillText('കേരളം', S * .82, 84);
    this._kc = c; return c;
  }
  drawKerala() {
    const ctx = this.bm, S = 900, K = KOCHI_MAP.kerala; ctx.drawImage(this.keralaCanvas(), 0, 0);
    const [x, y] = this._kp(K.here.lon, K.here.lat), t = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8 + (t * 14) % 18, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'left'; ctx.fillText('YOU ARE HERE — Fort Kochi', x + 12, y - 8);
  }
  drawBigmap() {
    if (this.mapMode === 'kerala') { this.drawKerala(); return; }
    const g = this.g, ctx = this.bm, W = g.world, M = W.map, S = 900;
    ctx.drawImage(W.mapCanvas, 0, 0, S, S);
    const k = M.s * S / W.mapCanvas.width, X = x => (x - M.x0) * k, Z = z => (z - M.z0) * k;
    for (const m of this.markers) { ctx.fillStyle = m.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(m.pos.x), Z(m.pos.z), 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (m.label) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'left'; ctx.fillText(m.label, X(m.pos.x) + 14, Z(m.pos.z) + 5); } }
    const pl = g.player, p = pl.focusPos, f = pl.car ? pl.car.heading : pl.facing;
    ctx.save(); ctx.translate(X(p.x), Z(p.z)); ctx.rotate(Math.PI - f);
    ctx.fillStyle = '#7cf'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 9); ctx.lineTo(0, 4); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '600 13px Inter'; ctx.textAlign = 'center';
    if (g.medical) {
      const gp = g.medical.gps;
      if (gp) { ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(X(p.x), Z(p.z)); ctx.lineTo(X(gp.pos.x), Z(gp.pos.z)); ctx.stroke(); ctx.setLineDash([]); }
      for (const h of g.medical.hospitals) {
        const x = X(h.pos.x), z = Z(h.pos.z), r = 11; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.fillRect(x - r, z - r, r * 2, r * 2); ctx.strokeRect(x - r, z - r, r * 2, r * 2);
        ctx.fillStyle = '#e8202f'; ctx.fillRect(x - 3, z - 8, 6, 16); ctx.fillRect(x - 8, z - 3, 16, 6);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Inter'; ctx.textAlign = 'left'; ctx.fillText(h.short + (h.type === 'private' ? '  (₹₹₹)' : '  (Govt)'), x + 15, z + 5);
      }
    }
    const lbl = [['FORT KOCHI', -800, -350], ['MATTANCHERRY', 650, 150], ['WILLINGDON ISLAND', 1250, -1120], ['ARABIAN SEA', -1480, 200], ['KOCHI HARBOUR', -150, -1180], ['BACKWATERS', 1420, 600], ['FORT KOCHI BEACH', LOC.coast.x + 60, LOC.coast.z], ['VELI', -900, 900], ['VARMA PERFORMANCE WORKS', LOC.garage.x, LOC.garage.z - 18]];
    for (const [t, x, z] of lbl) ctx.fillText(t, X(x), Z(z));
  }
}
