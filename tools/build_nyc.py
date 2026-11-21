# HELL GATE: convert OpenStreetMap extracts (Overpass JSON) into game data.
#   models/map/nyc/redhook.json        Red Hook roads, buildings (real heights), landmarks  (local metres, decimetre ints)
#   models/map/nyc/redhook_ground.png  ground classes, 3 m/px: 0 water, 1 land, 2 sand, 3 grass, 4 paved (stored x60)
#   models/map/nyc/skyline.json        Lower Manhattan buildings (real heights) for the skyline across the harbour
#   models/map/nyc/farland.png         land / water around New York Harbor, 25 m/px (for distant shores)
#   models/map/nyc/nyc_map.png         the five boroughs (pre-drawn map image) + nyc_map.json (projection)
# Data (c) OpenStreetMap contributors, ODbL.   Run:  python build_nyc.py "<game folder>"   (needs numpy)
import json, math, os, sys, zlib, struct, random, collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm_nyc')
OUT = os.path.join(sys.argv[1], 'models', 'map', 'nyc'); os.makedirs(OUT, exist_ok=True)
S, W_, N_, E_ = 40.6690, -74.0190, 40.6855, -73.9960          # Red Hook playable extract
LAT0, LON0 = (S + N_) / 2, (W_ + E_) / 2
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 111050
def proj(lat, lon): return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
MINX, MAXX = proj(LAT0, W_)[0], proj(LAT0, E_)[0]
MINZ, MAXZ = proj(N_, LON0)[1], proj(S, LON0)[1]
q = lambda v: int(round(v * 10))
print('red hook world', round(MINX), round(MAXX), round(MINZ), round(MAXZ))

def ring_area(pts):
    a = 0
    for i in range(len(pts)):
        x0, z0 = pts[i]; x1, z1 = pts[(i + 1) % len(pts)]; a += x0 * z1 - x1 * z0
    return a / 2
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); ab = b - a; L = np.hypot(*ab)
    D = np.array(pts[1:-1]) - a
    d = np.abs(ab[0] * D[:, 1] - ab[1] * D[:, 0]) / L if L > 1e-9 else np.hypot(D[:, 0], D[:, 1])
    i = int(np.argmax(d))
    if d[i] > eps: return dp(pts[:i + 2], eps)[:-1] + dp(pts[i + 1:], eps)
    return [pts[0], pts[-1]]
def simplify_ring(pts, eps):
    if len(pts) < 5: return pts
    i = max(range(len(pts)), key=lambda k: (pts[k][0] - pts[0][0]) ** 2 + (pts[k][1] - pts[0][1]) ** 2)
    r = dp(pts[:i + 1], eps)[:-1] + dp(pts[i:] + [pts[0]], eps)[:-1]
    return r if len(r) >= 3 else pts
def assemble(ways_pts):
    rings, open_ = [], [list(w) for w in ways_pts if len(w) > 1]
    while open_:
        cur = open_.pop(0); changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(open_):
                if w[0] == cur[-1]: cur += w[1:]
                elif w[-1] == cur[-1]: cur += w[::-1][1:]
                elif w[-1] == cur[0]: cur = w + cur[1:]
                elif w[0] == cur[0]: cur = w[::-1] + cur[1:]
                else: continue
                open_.pop(i); changed = True; break
        rings.append(cur)
    return rings
def write_png(path, arr):
    h, w = arr.shape[:2]; ch = 1 if arr.ndim == 2 else arr.shape[2]
    raw = b''.join(b'\x00' + arr[j].tobytes() for j in range(h))
    def chunk(tag, data): return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    ct = {1: 0, 3: 2, 4: 6}[ch]
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

# coastline sign raster: land is on the left of a coastline way
def coast_sea(segs, X, Z, tile=20):
    """True where a pixel is sea. segs: list of ways, each a list of points (land on the left).
    Nearest segment decides; when the nearest point is a segment end, the corner's averaged normal
    is used (avoids streaks from sharp pier corners). Tiled for speed."""
    A, B, N, PN, NN = [], [], [], [], []
    starts = {}
    for wi, w in enumerate(segs):
        if len(w) > 1: starts.setdefault((round(w[0][0], 2), round(w[0][1], 2)), wi)
    norm = lambda a, b: (lambda dx, dz, L: (-dz / L, dx / L))(b[0] - a[0], b[1] - a[1], math.hypot(b[0] - a[0], b[1] - a[1]) or 1e-9)
    wayn = []
    for w in segs: wayn.append([norm(w[i], w[i + 1]) for i in range(len(w) - 1)])
    ends = {(round(w[-1][0], 2), round(w[-1][1], 2)): wi for wi, w in enumerate(segs) if len(w) > 1}
    for wi, w in enumerate(segs):
        ns = wayn[wi]
        for i in range(len(w) - 1):
            A.append(w[i]); B.append(w[i + 1]); N.append(ns[i])
            if i > 0: PN.append(ns[i - 1])
            else:
                j = ends.get((round(w[0][0], 2), round(w[0][1], 2))); PN.append(wayn[j][-1] if j is not None and wayn[j] else ns[i])
            if i < len(w) - 2: NN.append(ns[i + 1])
            else:
                j = starts.get((round(w[-1][0], 2), round(w[-1][1], 2))); NN.append(wayn[j][0] if j is not None and wayn[j] else ns[i])
    A = np.array(A, float); B = np.array(B, float); N = np.array(N); PN = np.array(PN); NN = np.array(NN)
    sx0 = np.minimum(A[:, 0], B[:, 0]); sx1 = np.maximum(A[:, 0], B[:, 0]); sz0 = np.minimum(A[:, 1], B[:, 1]); sz1 = np.maximum(A[:, 1], B[:, 1])
    H, W = X.shape; out = np.zeros(X.shape, bool)
    for j0 in range(0, H, tile):
        for i0 in range(0, W, tile):
            tx = X[j0:j0 + tile, i0:i0 + tile]; tz = Z[j0:j0 + tile, i0:i0 + tile]
            x0, x1, z0, z1 = tx.min(), tx.max(), tz.min(), tz.max()
            R = max(x1 - x0, z1 - z0) * 1.0 + 120
            while True:
                m = (sx1 > x0 - R) & (sx0 < x1 + R) & (sz1 > z0 - R) & (sz0 < z1 + R)
                if m.sum() >= 1 or R > 1e6: break
                R *= 2
            idx = np.nonzero(m)[0]; a = A[idx]; b = B[idx]
            px = tx.reshape(-1, 1); pz = tz.reshape(-1, 1)
            dx = (b[:, 0] - a[:, 0])[None, :]; dz = (b[:, 1] - a[:, 1])[None, :]; L2 = dx * dx + dz * dz + 1e-9
            t = np.clip(((px - a[:, 0]) * dx + (pz - a[:, 1]) * dz) / L2, 0, 1)
            qx = a[:, 0] + t * dx; qz = a[:, 1] + t * dz; d2 = (px - qx) ** 2 + (pz - qz) ** 2
            k = np.argmin(d2, axis=1); tk = t[np.arange(len(k)), k]; gk = idx[k]
            n = N[gk].copy()
            at0 = tk <= 1e-6; at1 = tk >= 1 - 1e-6
            n[at0] = N[gk[at0]] + PN[gk[at0]]; n[at1] = N[gk[at1]] + NN[gk[at1]]
            vx = np.where(at1, B[gk, 0], A[gk, 0]); vz = np.where(at1, B[gk, 1], A[gk, 1])
            sgn = (px[:, 0] - vx) * n[:, 0] + (pz[:, 0] - vz) * n[:, 1]
            out[j0:j0 + tile, i0:i0 + tile] = (sgn > 0).reshape(tx.shape)
    return out
def fill_rings(rings, X0, Z0, RES, GW, GH):
    cov = np.zeros((GH, GW), bool); cz = Z0 + (np.arange(GH) + .5) * RES
    for ring in rings:
        P = np.array(ring)
        if len(P) < 3: continue
        x0, z0 = P[:, 0], P[:, 1]; x1, z1 = np.roll(x0, -1), np.roll(z0, -1)
        jmin = max(0, int((P[:, 1].min() - Z0) / RES) - 1); jmax = min(GH - 1, int((P[:, 1].max() - Z0) / RES) + 1)
        for j in range(jmin, jmax + 1):
            zc = cz[j]; m = (z0 <= zc) != (z1 <= zc)
            if not m.any(): continue
            xs = np.sort(x0[m] + (zc - z0[m]) * (x1[m] - x0[m]) / (z1[m] - z0[m]))
            for k in range(0, len(xs) - 1, 2):
                i0 = max(0, int(math.ceil((xs[k] - X0) / RES - .5))); i1 = min(GW - 1, int(math.floor((xs[k + 1] - X0) / RES - .5)))
                if i1 >= i0: cov[j, i0:i1 + 1] ^= True
    return cov

# ======================= Red Hook =======================
els = json.load(open(os.path.join(SRC, 'redhook.json'), encoding='utf-8'))['elements']
inb = lambda x, z, m=30: MINX - m < x < MAXX + m and MINZ - m < z < MAXZ + m
WIDTH = {'primary': 12, 'secondary': 11, 'tertiary': 10, 'unclassified': 8, 'residential': 9, 'living_street': 6, 'service': 5, 'secondary_link': 7,
         'pedestrian': 5, 'footway': 2.2, 'path': 2, 'steps': 2, 'cycleway': 2.5}
CAR = {'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'secondary_link'}
roads, names, name_i = [], [], {}
def nm(s):
    if not s: return -1
    if s not in name_i: name_i[s] = len(names); names.append(s)
    return name_i[s]
for e in els:
    t = e.get('tags', {}); hw = t.get('highway')
    if e['type'] != 'way' or hw not in WIDTH or t.get('bridge') == 'yes' or t.get('tunnel') == 'yes' or t.get('area') == 'yes': continue
    if hw == 'footway' and t.get('footway') == 'sidewalk': continue      # NYC maps sidewalks separately; the kerb strip is drawn by the game
    P = [proj(g['lat'], g['lon']) for g in e['geometry']]
    if not any(inb(x, z) for x, z in P): continue
    P = dp(P, .4)
    roads.append({'w': WIDTH[hw], 'c': 1 if hw in CAR else 0, 'n': nm(t.get('name')), 'p': [v for x, z in P for v in (q(x), q(z))]})
print('roads', len(roads))
# street-grid angle (for orienting the playable building)
hist = collections.Counter()
for r in roads:
    if not r['c']: continue
    P = r['p']
    for i in range(0, len(P) - 2, 2):
        dx, dz = P[i + 2] - P[i], P[i + 3] - P[i + 1]; L = math.hypot(dx, dz)
        if L > 200: hist[round(math.degrees(math.atan2(dz, dx)) % 90)] += L
grid_angle = hist.most_common(1)[0][0] if hist else 0
print('street grid angle', grid_angle)

bld = []
for e in els:
    t = e.get('tags', {})
    if 'building' not in t or e['type'] == 'node': continue
    rings = [[proj(g['lat'], g['lon']) for g in e['geometry']]] if e['type'] == 'way' else [[proj(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m['role'] == 'outer' and m.get('geometry')]
    for r in rings:
        if len(r) < 4: continue
        r = r[:-1] if r[0] == r[-1] else r
        if not any(inb(x, z, 0) for x, z in r): continue
        r = simplify_ring(r, .3)
        A = ring_area(r)
        if abs(A) < 10: continue
        if A < 0: r = r[::-1]; A = -A
        rnd = random.Random(e['id'])
        h = None
        try: h = float(str(t.get('height', '')).replace('m', '').strip())
        except: pass
        if not h:
            lv = t.get('building:levels')
            h = float(lv) * 3.2 if lv and lv.replace('.', '').isdigit() else (rnd.choice([7, 9.5, 10.5, 12]) if A < 400 else rnd.choice([6, 8, 10]))
        bt = t.get('building')
        cx = sum(p[0] for p in r) / len(r); cz = sum(p[1] for p in r) / len(r)
        K = {'apartments': 1, 'residential': 1, 'house': 1, 'industrial': 2, 'warehouse': 2, 'church': 3, 'school': 4, 'retail': 5, 'commercial': 5, 'roof': 6}.get(bt, 0)
        if K == 0: K = 2 if A > 1500 and h < 14 else 1 if h > 8 else 0
        # the Red Hook Houses (NYCHA): 6-storey brick blocks between Columbia St and Clinton St
        lat = LAT0 - cz / KZ; lon = LON0 + cx / KX
        if 15.5 < h < 23 and 40.6728 < lat < 40.6800 and -74.0085 < lon < -73.9975 and A > 500: K = 7
        bld.append({'p': [v for x, z in r for v in (q(x), q(z))], 'h': round(h, 1), 'k': K})
print('red hook buildings', len(bld), 'NYCHA', sum(1 for b in bld if b['k'] == 7))

RES = 3.0
GW, GH = int(math.ceil((MAXX - MINX) / RES)), int(math.ceil((MAXZ - MINZ) / RES))
cx_ = MINX + (np.arange(GW) + .5) * RES; cz_ = MINZ + (np.arange(GH) + .5) * RES
X, Z = np.meshgrid(cx_, cz_)
grid = np.ones((GH, GW), np.uint8)
segs = []
for src in ['redhook.json', 'manhattan.json']:
    for e in json.load(open(os.path.join(SRC, src), encoding='utf-8'))['elements']:
        if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline':
            segs.append([proj(g['lat'], g['lon']) for g in e['geometry']])
grid[coast_sea(segs, X, Z)] = 0
def polys(pred):
    out = []
    for e in els:
        t = e.get('tags', {})
        if not pred(t): continue
        if e['type'] == 'way' and e['geometry'][0] == e['geometry'][-1]: out.append([[proj(g['lat'], g['lon']) for g in e['geometry']]])
        elif e['type'] == 'relation':
            ws = [[(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m.get('geometry')]
            out.append([[proj(a, b) for a, b in r] for r in assemble(ws) if r[0] == r[-1]])
    return out
for feat in polys(lambda t: t.get('leisure') in ('park', 'garden', 'pitch', 'playground', 'recreation_ground') or t.get('landuse') in ('grass', 'recreation_ground') or t.get('natural') in ('wood', 'scrub')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH)] = 3
for feat in polys(lambda t: t.get('amenity') == 'parking' or t.get('landuse') in ('industrial', 'railway', 'port')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH) & (grid == 1)] = 4
for feat in polys(lambda t: t.get('natural') in ('beach', 'sand')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH)] = 2
for feat in polys(lambda t: t.get('natural') == 'water' or t.get('waterway') in ('canal', 'dock')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH)] = 0
print('ground', GW, GH, {k: int((grid == k).sum()) for k in range(5)})
write_png(os.path.join(OUT, 'redhook_ground.png'), (grid * 60).astype(np.uint8))

poi = []
for e in els:
    t = e.get('tags', {}); k = t.get('amenity') or ('shop' if 'shop' in t else None)
    if not k or not t.get('name'): continue
    if e['type'] == 'node': c = proj(e['lat'], e['lon'])
    else:
        g = e.get('geometry') or []
        if not g: continue
        c = proj(sum(p['lat'] for p in g) / len(g), sum(p['lon'] for p in g) / len(g))
    if inb(*c, 0): poi.append({'k': k, 'n': t['name'], 'x': q(c[0]), 'z': q(c[1])})
meta = {'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'kz': KZ, 'minX': MINX, 'maxX': MAXX, 'minZ': MINZ, 'maxZ': MAXZ, 'res': RES, 'gw': GW, 'gh': GH, 'grid': grid_angle,
        'source': 'OpenStreetMap contributors (ODbL), Red Hook extract %s,%s,%s,%s' % (S, W_, N_, E_)}
json.dump({'meta': meta, 'names': names, 'roads': roads, 'bld': bld, 'poi': poi}, open(os.path.join(OUT, 'redhook.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# ======================= Lower Manhattan skyline =======================
sky = []
for e in json.load(open(os.path.join(SRC, 'manhattan.json'), encoding='utf-8'))['elements']:
    t = e.get('tags', {})
    if 'building' not in t: continue
    try: h = float(str(t.get('height', '')).replace('m', '').strip())
    except: h = 0
    if h < 14: continue
    rings = [[proj(g['lat'], g['lon']) for g in e['geometry']]] if e['type'] == 'way' else [[proj(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m['role'] == 'outer' and m.get('geometry')]
    for r in rings:
        if len(r) < 4: continue
        r = r[:-1] if r[0] == r[-1] else r
        r = simplify_ring(r, 1.2)
        A = ring_area(r)
        if abs(A) < 40: continue
        if A < 0: r = r[::-1]
        sky.append({'p': [v for x, z in r for v in (round(x), round(z))], 'h': round(h)})
print('skyline buildings', len(sky), 'tallest', max(b['h'] for b in sky))
json.dump({'bld': sky}, open(os.path.join(OUT, 'skyline.json'), 'w'), separators=(',', ':'))

# ======================= distant shores (25 m/px) =======================
nyc = json.load(open(os.path.join(SRC, 'nyc.json'), encoding='utf-8'))['elements']
csegs = []
for e in nyc:
    if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline':
        csegs.append([proj(g['lat'], g['lon']) for g in e['geometry']])
FR = 25.0; FX0, FX1, FZ0, FZ1 = -6000, 6000, -7000, 5000
FW, FH = int((FX1 - FX0) / FR), int((FZ1 - FZ0) / FR)
fx = FX0 + (np.arange(FW) + .5) * FR; fz = FZ0 + (np.arange(FH) + .5) * FR
FXg, FZg = np.meshgrid(fx, fz)
near = [w for w in csegs if any(FX0 - 3000 < x < FX1 + 3000 and FZ0 - 3000 < z < FZ1 + 3000 for x, z in w)]
far = (~coast_sea(near, FXg, FZg)).astype(np.uint8) * 255
write_png(os.path.join(OUT, 'farland.png'), far)
print('farland', FW, FH, 'land px', int((far > 0).sum()))

# ======================= NYC map image (five boroughs) =======================
MS0, MW0, MN0, ME0 = 40.477, -74.270, 40.925, -73.690
MRES = 70.0
mx0, mz0 = proj(MN0, MW0); mx1, mz1 = proj(MS0, ME0)
MWd, MHd = int((mx1 - mx0) / MRES), int((mz1 - mz0) / MRES)
mxs = mx0 + (np.arange(MWd) + .5) * MRES; mzs = mz0 + (np.arange(MHd) + .5) * MRES
MX, MZ = np.meshgrid(mxs, mzs)
land = ~coast_sea(csegs, MX, MZ)
img = np.zeros((MHd, MWd, 4), np.uint8); img[..., :] = (16, 34, 52, 255)
img[land] = (58, 62, 70, 255)
BC = {'Manhattan': (120, 96, 60), 'Brooklyn': (78, 92, 118), 'Queens': (70, 104, 92), 'The Bronx': (104, 80, 104), 'Staten Island': (96, 104, 70)}
centroids = {}
for e in nyc:
    if e['type'] != 'relation' or e['tags'].get('admin_level') != '7': continue
    name = e['tags']['name']; ws = [[(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m.get('type') == 'way' and m.get('geometry') and m.get('role') in ('outer', '')]
    rings = [[proj(a, b) for a, b in r] for r in assemble(ws) if r[0] == r[-1]]
    cov = fill_rings(rings, mx0, mz0, MRES, MWd, MHd) & land
    img[cov] = BC.get(name, (90, 90, 90)) + (255,)
    jj, ii = np.nonzero(cov)
    if len(ii): centroids[name] = [float(mx0 + (ii.mean() + .5) * MRES), float(mz0 + (jj.mean() + .5) * MRES)]
# coast highlight
edge = land & ~(np.roll(land, 1, 0) & np.roll(land, -1, 0) & np.roll(land, 1, 1) & np.roll(land, -1, 1))
img[edge] = (190, 196, 205, 255)
write_png(os.path.join(OUT, 'nyc_map.png'), img)
json.dump({'x0': mx0, 'z0': mz0, 'res': MRES, 'w': MWd, 'h': MHd, 'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'kz': KZ, 'boroughs': centroids,
           'source': 'OpenStreetMap contributors (ODbL)'}, open(os.path.join(OUT, 'nyc_map.json'), 'w'), separators=(',', ':'))
print('nyc map', MWd, MHd, list(centroids))
for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(os.path.join(OUT, f)))
