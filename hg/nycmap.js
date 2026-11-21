'use strict';
// ---------------------------------------------------------------------------
// HELL GATE — the New York map (M): the five boroughs (OpenStreetMap), every
// place from the story bible with its mission, and a live Red Hook inset.
// ---------------------------------------------------------------------------
const STORY_PLACES = [
  { n: 'Red Hook Houses', m: 1, t: 'Delphine', lat: 40.6765, lon: -74.0040, note: 'Storm Delphine, five years ago' },
  { n: 'Gowanus Canal', m: null, t: "Eli's tugboat", lat: 40.6765, lon: -73.9893 },
  { n: 'Hunts Point', m: 2, t: 'Stash House', lat: 40.8090, lon: -73.8800 },
  { n: 'Lincoln Tunnel', m: 3, t: 'Bridge Traffic', lat: 40.7590, lon: -73.9985 },
  { n: 'Brighton Beach', m: 4, t: 'The Watchmaker', lat: 40.5776, lon: -73.9610 },
  { n: 'Crane Meridian Tower', m: 5, t: 'Glass House', lat: 40.7545, lon: -74.0044 },
  { n: 'Gowanus rooftops', m: 6, t: 'Burn Notice', lat: 40.6800, lon: -73.9880 },
  { n: 'Green-Wood Cemetery', m: 7, t: 'Low Tide', lat: 40.6525, lon: -73.9900 },
  { n: 'Meatpacking District', m: 8, t: 'Prodigal Son', lat: 40.7410, lon: -74.0075 },
  { n: 'Chelsea', m: 9, t: 'Still Life', lat: 40.7470, lon: -74.0035 },
  { n: 'FDR Drive', m: 10, t: 'Whiteout', lat: 40.7330, lon: -73.9730 },
  { n: 'East River barge', m: 11, t: 'The Barge', lat: 40.7230, lon: -73.9660 },
  { n: 'Grand Central', m: 12, t: 'Grand Central', lat: 40.7527, lon: -73.9772 },
  { n: "Billionaires' Row", m: 13, t: 'Penthouse', lat: 40.7655, lon: -73.9790 },
  { n: 'Midtown bank', m: 14, t: 'Ninth Circle', lat: 40.7570, lon: -73.9840 },
  { n: 'The Low Note, Harlem', m: 15, t: 'Last Set', lat: 40.8110, lon: -73.9470, note: "Deacon's bar" },
  { n: 'Columbia University', m: 16, t: 'Leverage', lat: 40.8075, lon: -73.9626 },
  { n: 'Staten Island Ferry', m: 17, t: 'Sister', lat: 40.6680, lon: -74.0480 },
  { n: 'Long Island City', m: 18, t: 'Daylight', lat: 40.7450, lon: -73.9480 },
  { n: 'Brooklyn Bridge', m: 19, t: 'Hunted', lat: 40.7061, lon: -73.9969 },
  { n: 'Brooklyn Navy Yard', m: 20, t: "Brother's Keeper", lat: 40.7010, lon: -73.9700 },
  { n: 'Hell Gate Barrier', m: 22, t: 'Hell Gate', lat: 40.7790, lon: -73.9250, note: 'The finale' },
  { n: 'Astoria', m: null, t: 'Sof', lat: 40.7700, lon: -73.9250 },
  { n: 'The Bronx', m: null, t: 'Static', lat: 40.8400, lon: -73.8850 },
];

class NYCMapView {
  constructor(g) {
    this.g = g; this.open = false; this.el = document.getElementById('mapview'); this.cv = document.getElementById('map-canvas'); this.ctx = this.cv.getContext('2d');
    this.inset = this.buildInset();
  }
  toggle(force) {
    this.open = force === undefined ? !this.open : force; this.el.classList.toggle('hidden', !this.open);
    if (this.open) { document.exitPointerLock && (this.g.ignoreUnlock = true, document.exitPointerLock(), setTimeout(() => this.g.ignoreUnlock = false, 200)); this.draw(); }
    else if (this.g.state === 'play') this.g.lock();
  }
  px(lat, lon) { const M = NYC.map, x = (lon - M.lon0) * M.kx, z = -(lat - M.lat0) * M.kz; return this.pxXZ(x, z); }
  pxXZ(x, z) { const M = NYC.map, k = this.k; return [this.ox + (x - M.x0) / M.res * k, this.oy + (z - M.z0) / M.res * k]; }
  buildInset() {
    const S = 420, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), W = this.g.world, b7 = W.b7, cen = b7 ? b7.group.position : W.center, R = b7 ? 380 : 420;
    const X = x => (x - cen.x + R) / (2 * R) * S, Z = z => (z - cen.z + R) / (2 * R) * S;
    g.fillStyle = '#0e1a26'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#25282d';
    const m = W.meta; for (let j = 0; j < NYC.gh; j += 2) for (let i = 0; i < NYC.gw; i += 2) if (NYC.grid[j * NYC.gw + i]) { const x = m.minX + i * m.res, z = m.minZ + j * m.res; if (Math.abs(x - cen.x) < R && Math.abs(z - cen.z) < R) g.fillRect(X(x), Z(z), 2 * m.res / (2 * R) * S + .6, 2 * m.res / (2 * R) * S + .6); }
    g.strokeStyle = '#4a5260'; g.lineWidth = 2; g.lineCap = 'round';
    for (const r of NYC.rh.roads) { if (!r.c) continue; g.beginPath(); for (let k = 0; k < r.p.length; k += 2) { const x = X(r.p[k] / 10), z = Z(r.p[k + 1] / 10); if (k) g.lineTo(x, z); else g.moveTo(x, z); } g.stroke(); }
    g.fillStyle = '#5c4038';
    for (const b of W.bldInfo) { g.beginPath(); for (let k = 0; k < b.P.length; k += 2) { const x = X(b.P[k]), z = Z(b.P[k + 1]); if (k) g.lineTo(x, z); else g.moveTo(x, z); } g.closePath(); g.fill(); }
    if (b7) {
      const corners = [[-24, -7], [24, -7], [24, 7], [-24, 7]].map(([lx, lz]) => W.b7world(lx, lz));
      g.fillStyle = '#e8b04a'; g.beginPath(); corners.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = '700 13px Inter'; g.fillText('BUILDING 7', X(corners[2][0]) + 8, Z(corners[2][1]));
    }
    for (const k in W.site) {      // the mission's own places
      const st = W.site[k], cl = st.clear; if (!cl || !st.label) continue;
      const corners = [[cl[0], cl[1]], [cl[2], cl[1]], [cl[2], cl[3]], [cl[0], cl[3]]].map(([lx, lz]) => st.world(lx, lz));
      g.fillStyle = '#e8b04a'; g.beginPath(); corners.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = '700 12px Inter'; g.fillText(st.label, X(corners[2][0]) + 6, Z(corners[2][1]) + 4);
    }
    this.insetMap = { X, Z };
    return c;
  }
  draw() {
    const c = this.ctx, S = 1000, img = NYC.mapImg, g = this.g;
    c.fillStyle = '#0a1520'; c.fillRect(0, 0, S, S);
    this.k = Math.min(S / img.width, S / img.height); this.ox = (S - img.width * this.k) / 2; this.oy = (S - img.height * this.k) / 2;
    c.imageSmoothingEnabled = true; c.drawImage(img, this.ox, this.oy, img.width * this.k, img.height * this.k);
    c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 26px "Bebas Neue"';
    const off = { Manhattan: [-40, 40], Brooklyn: [0, 0], Queens: [0, 0], 'The Bronx': [0, -20], 'Staten Island': [0, 0] };
    for (const [n, [x, z]] of Object.entries(NYC.map.boroughs)) { const [px, pz] = this.pxXZ(x, z), o = off[n] || [0, 0]; c.fillText(n.toUpperCase(), px + o[0], pz + o[1]); }
    c.font = '600 12px Inter'; c.fillStyle = 'rgba(160,190,215,.55)'; c.fillText('UPPER NEW YORK BAY', ...this.px(40.665, -74.055)); c.fillText('EAST RIVER', ...this.px(40.735, -73.962)); c.fillText('HUDSON RIVER', ...this.px(40.77, -74.012)); c.fillText('NEW JERSEY', ...this.px(40.73, -74.12));
    const t = performance.now() / 1000;
    for (const p of STORY_PLACES) {
      const [x, y] = this.px(p.lat, p.lon), active = p.m === g.M, playable = p.m && HG_MISSIONS[p.m];
      if (active) { c.strokeStyle = 'rgba(232,176,74,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10 + (t * 16) % 20, 0, 7); c.stroke(); }
      c.fillStyle = active ? '#e8b04a' : playable ? '#fff' : p.m ? 'rgba(160,160,160,.6)' : 'rgba(120,200,255,.7)'; c.strokeStyle = '#000'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, active ? 8 : playable ? 6 : 5, 0, 7); c.fill(); c.stroke();
      c.textAlign = 'left'; c.font = active ? '700 15px Inter' : playable ? '700 12px Inter' : '700 10px Inter'; c.fillStyle = active || playable ? '#fff' : 'rgba(255,255,255,.6)';
      const LO = { 3: [0, -8], 5: [0, 11], 6: [4, -12], 1: [0, 6] }[p.m] || [0, 0];
      c.fillText(active ? p.m + '  ' + HG_MISSIONS[p.m].title + ' — ' + p.n : playable ? p.m + ' ' + p.t : p.m ? String(p.m) : p.t, x + (active ? 12 : 8) + LO[0], y + 4 + LO[1]);
    }
    // mission list (story bible)
    c.fillStyle = 'rgba(4,8,12,.78)'; c.fillRect(18, 18, 236, 470); c.textAlign = 'left';
    c.fillStyle = '#e8b04a'; c.font = '400 22px "Bebas Neue"'; c.fillText('HELL GATE — MISSIONS', 30, 44);
    STORY_PLACES.filter(p => p.m).forEach((p, i) => { const pl = HG_MISSIONS[p.m]; c.font = p.m === g.M ? '700 12px Inter' : pl ? '600 11.5px Inter' : '500 11.5px Inter'; c.fillStyle = p.m === g.M ? '#e8b04a' : pl ? '#fff' : 'rgba(205,215,225,.5)'; c.fillText(String(p.m).padStart(2, ' ') + '  ' + p.t + (p.m === g.M ? '  ◂ now' : pl ? '  ▸ playable' : ''), 30, 68 + i * 19); });
    c.fillStyle = 'rgba(160,175,190,.6)'; c.font = '500 10.5px Inter'; c.fillText('Mission 21 (Long Island) is off this map.', 30, 474);
    // Red Hook inset with the player
    const I = 300, ix = S - I - 24, iy = S - I - 24;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(ix - 6, iy - 30, I + 12, I + 36);
    c.drawImage(this.inset, ix, iy, I, I);
    c.fillStyle = '#e8b04a'; c.font = '700 18px "Bebas Neue"'; c.textAlign = 'left'; c.fillText(g.cfg.insetTitle || 'RED HOOK, BROOKLYN — TONIGHT', ix, iy - 10);
    const pl = g.player.pos, sc = I / this.inset.width, px = ix + this.insetMap.X(pl.x) * sc, py = iy + this.insetMap.Z(pl.z) * sc, f = g.player.yaw;
    c.save(); c.translate(px, py); c.rotate(Math.PI - f); c.fillStyle = '#7cf'; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 7); c.lineTo(0, 3); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
    if (g.boat) { const bp = g.boat.pos; c.fillStyle = '#ff7a3a'; c.fillRect(ix + this.insetMap.X(bp.x) * sc - 4, iy + this.insetMap.Z(bp.z) * sc - 4, 8, 8); }
  }
}
