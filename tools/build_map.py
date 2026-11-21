# Convert OpenStreetMap extracts (Overpass JSON) into compact game data for Kochi: City of Shadows.
#   models/map/kochi.json        roads graph, buildings, landmarks (local metres, decimetre ints)
#   models/map/kochi_ground.png  ground classes, 4 m per pixel: 0 water, 1 ground, 2 sand, 3 grass, 4 paved
#   models/map/kerala.json       simplified Kerala state + district outlines and towns
# Data (c) OpenStreetMap contributors, ODbL.
import json, math, os, sys, zlib, struct, random, collections
import numpy as np

SCR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(sys.argv[1], 'models', 'map'); os.makedirs(OUT, exist_ok=True)
S, W_, N_, E_ = 9.948, 76.236, 9.970, 76.264
LAT0, LON0 = (S + N_) / 2, (W_ + E_) / 2
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110600
def proj(lat, lon): return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
MINX, MAXX = proj(LAT0, W_)[0], proj(LAT0, E_)[0]
MINZ, MAXZ = proj(N_, LON0)[1], proj(S, LON0)[1]
print('world', round(MINX), round(MAXX), round(MINZ), round(MAXZ))
els = json.load(open(os.path.join(SCR, 'osm', 'kochi.json'), encoding='utf-8'))['elements']

def ring_area(pts):
    a = 0
    for i in range(len(pts)):
        x0, z0 = pts[i]; x1, z1 = pts[(i + 1) % len(pts)]; a += x0 * z1 - x1 * z0
    return a / 2
def dp(pts, eps):  # Douglas-Peucker on an open polyline
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); ab = b - a; L = np.hypot(*ab)
    P = np.array(pts[1:-1])
    D = P - a
    d = np.abs(ab[0] * D[:, 1] - ab[1] * D[:, 0]) / L if L > 1e-9 else np.hypot(D[:, 0], D[:, 1])
    i = int(np.argmax(d))
    if d[i] > eps: return dp(pts[:i + 2], eps)[:-1] + dp(pts[i + 1:], eps)
    return [pts[0], pts[-1]]
def simplify_ring(pts, eps):
    if len(pts) < 5: return pts
    i = max(range(len(pts)), key=lambda k: (pts[k][0] - pts[0][0]) ** 2 + (pts[k][1] - pts[0][1]) ** 2)
    r = dp(pts[:i + 1], eps)[:-1] + dp(pts[i:] + [pts[0]], eps)[:-1]
    return r if len(r) >= 3 else pts
q = lambda v: int(round(v * 10))   # decimetres

# ---------------- roads ----------------
WIDTH = {'trunk': 12, 'trunk_link': 8, 'primary': 11, 'primary_link': 7, 'secondary': 9, 'secondary_link': 7, 'tertiary': 8, 'tertiary_link': 6,
         'unclassified': 6.5, 'residential': 6, 'living_street': 5, 'service': 4.5, 'road': 6,
         'pedestrian': 5, 'footway': 2.5, 'path': 2, 'steps': 2.5, 'cycleway': 2.5, 'track': 3}
CAR = {'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service', 'road'}
TYPES = list(WIDTH.keys())
ways = []
use = collections.Counter()
for e in els:
    t = e.get('tags', {})
    if e['type'] != 'way' or t.get('highway') not in WIDTH or t.get('area') == 'yes': continue
    if t.get('highway') == 'service' and t.get('service') in ('driveway', 'parking_aisle', 'drive-through'): continue
    ways.append(e)
    for n in e['nodes']: use[n] += 1
for e in ways: use[e['nodes'][0]] += 1; use[e['nodes'][-1]] += 1
names, name_i = [], {}
def nm(s):
    if not s: return -1
    if s not in name_i: name_i[s] = len(names); names.append(s)
    return name_i[s]
nodes, node_i, edges = [], {}, []
def nid(osmid, x, z):
    if osmid not in node_i: node_i[osmid] = len(nodes); nodes.append([q(x), q(z)])
    return node_i[osmid]
inb = lambda x, z, m=40: MINX - m < x < MAXX + m and MINZ - m < z < MAXZ + m
for e in ways:
    t = e['tags']; hw = t['highway']
    w = WIDTH[hw]
    if t.get('lanes', '').isdigit() and hw in CAR: w = max(w, int(t['lanes']) * 3.3 + 1)
    if t.get('width'):
        try: w = max(2, min(16, float(t['width'].split()[0])))
        except: pass
    ow = 1 if t.get('oneway') in ('yes', 'true', '1') else -1 if t.get('oneway') == '-1' else 0
    pts = [proj(g['lat'], g['lon']) for g in e['geometry']]
    seg = [0]
    for i in range(1, len(pts) - 1):
        if use[e['nodes'][i]] > 1: seg.append(i)
    seg.append(len(pts) - 1)
    for a, b in zip(seg, seg[1:]):
        P = pts[a:b + 1]
        if not any(inb(x, z) for x, z in P): continue
        P2 = dp(P, .35)
        edges.append({'a': nid(e['nodes'][a], *P[0]), 'b': nid(e['nodes'][b], *P[-1]), 't': TYPES.index(hw), 'w': round(w, 1), 'n': nm(t.get('name')),
                      'o': ow, 'c': 1 if hw in CAR else 0, 'p': [v for x, z in P2 for v in (q(x), q(z))]})
print('roads: nodes', len(nodes), 'edges', len(edges))

# ---------------- buildings ----------------
def closed_rings_of(e):
    if e['type'] == 'node': return []
    if e['type'] == 'way': return [[proj(g['lat'], g['lon']) for g in e['geometry']]]
    return [[proj(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m['role'] == 'outer' and m.get('geometry')]
bld = []
for e in els:
    t = e.get('tags', {})
    if 'building' not in t or t.get('building') in ('no',): continue
    for r in closed_rings_of(e):
        if len(r) < 4: continue
        r = r[:-1] if r[0] == r[-1] else r
        if not any(inb(x, z, 0) for x, z in r): continue
        r = simplify_ring(r, .25)
        if len(r) < 3: continue
        A = ring_area(r)
        if abs(A) < 12: continue
        if A < 0: r = r[::-1]; A = -A
        rnd = random.Random(e['id'])
        kind = t.get('building'); lv = None
        if t.get('building:levels', '').replace('.', '').isdigit(): lv = max(1, float(t['building:levels']))
        h = None
        if t.get('height'):
            try: h = float(t['height'].replace('m', '').strip())
            except: pass
        if kind == 'roof': h = h or 3.2
        if h is None:
            if lv is None:
                lv = 1 if A < 60 else rnd.choice([1, 2, 2]) if A < 160 else rnd.choice([2, 2, 3]) if A < 500 else rnd.choice([2, 3, 3, 4]) if A < 2500 else 2
            h = lv * 3.3 + .4
        if kind in ('church', 'cathedral', 'chapel'): h = max(h, 11)
        if kind == 'mosque': h = max(h, 8)
        roof = 1 if (A < 230 and h < 8 and rnd.random() < .62 and kind not in ('roof', 'school', 'industrial')) else 0
        if kind in ('church', 'cathedral', 'chapel', 'temple'): roof = 1
        K = {'school': 1, 'hospital': 2, 'church': 3, 'cathedral': 3, 'chapel': 3, 'temple': 4, 'mosque': 5, 'hotel': 6, 'roof': 7, 'industrial': 8, 'warehouse': 8}.get(kind, 0)
        bld.append({'p': [v for x, z in r for v in (q(x), q(z))], 'h': round(h, 1), 'r': roof, 'k': K})
print('buildings', len(bld))

# ---------------- ground classes (raster) ----------------
RES = 4.0
GW, GH = int(math.ceil((MAXX - MINX) / RES)), int(math.ceil((MAXZ - MINZ) / RES))
cx = MINX + (np.arange(GW) + .5) * RES; cz = MINZ + (np.arange(GH) + .5) * RES
X, Z = np.meshgrid(cx, cz)
grid = np.ones((GH, GW), np.uint8)
# coastline: land is on the left of the way direction -> sign of cross product with the nearest segment
segs = []
for e in els:
    if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline':
        P = [proj(g['lat'], g['lon']) for g in e['geometry']]
        segs += [(P[i], P[i + 1]) for i in range(len(P) - 1)]
A = np.array([s[0] for s in segs]); B = np.array([s[1] for s in segs])
best = np.full(X.shape, 1e18); side = np.zeros(X.shape)
for (ax, az), (bx, bz) in zip(A, B):
    dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1e-9
    t = np.clip(((X - ax) * dx + (Z - az) * dz) / L2, 0, 1)
    px, pz = ax + t * dx, az + t * dz; d2 = (X - px) ** 2 + (Z - pz) ** 2
    m = d2 < best; best[m] = d2[m]
    cr = dx * (Z - az) - dz * (X - ax)        # >0: point is on the right in (x right, z down) screen coords
    side[m] = cr[m]
# in x-east / z-south coordinates "left of travel" (land) has cross < 0
sea = side > 0
grid[sea] = 0
def assemble(ways_pts):
    rings, open_ = [], [list(w) for w in ways_pts if len(w) > 1]
    while open_:
        cur = open_.pop(0)
        changed = True
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
def fill_rings(rings_xy, val, mask_only=False):
    cov = np.zeros((GH, GW), bool)
    for ring in rings_xy:
        P = np.array(ring)
        if len(P) < 3: continue
        x0, z0 = P[:, 0], P[:, 1]; x1, z1 = np.roll(x0, -1), np.roll(z0, -1)
        jmin = max(0, int((P[:, 1].min() - MINZ) / RES) - 1); jmax = min(GH - 1, int((P[:, 1].max() - MINZ) / RES) + 1)
        for j in range(jmin, jmax + 1):
            zc = cz[j]
            m = (z0 <= zc) != (z1 <= zc)
            if not m.any(): continue
            xs = np.sort(x0[m] + (zc - z0[m]) * (x1[m] - x0[m]) / (z1[m] - z0[m]))
            for k in range(0, len(xs) - 1, 2):
                i0 = max(0, int(math.ceil((xs[k] - MINX) / RES - .5))); i1 = min(GW - 1, int(math.floor((xs[k + 1] - MINX) / RES - .5)))
                if i1 >= i0: cov[j, i0:i1 + 1] ^= True
    if not mask_only: grid[cov] = val
    return cov
def polys(pred):
    out = []
    for e in els:
        t = e.get('tags', {})
        if not pred(t): continue
        if e['type'] == 'way' and e['geometry'][0] == e['geometry'][-1]: out.append([[proj(g['lat'], g['lon']) for g in e['geometry']]])
        elif e['type'] == 'relation':
            ws = [[(g['lat'], g['lon']) for g in m['geometry']] for m in e['members'] if m.get('geometry')]
            out.append([[proj(a, b) for a, b in r] for r in assemble(ws) if r[0] == r[-1]])
    return out   # list of features; each feature = list of rings (even-odd inside a feature)
def fill_features(feats, val):
    for f in feats: fill_rings(f, val)
fill_features(polys(lambda t: t.get('leisure') in ('park', 'garden', 'pitch', 'playground', 'recreation_ground') or t.get('landuse') in ('grass', 'recreation_ground', 'village_green', 'meadow', 'forest', 'cemetery') or t.get('natural') in ('wood', 'scrub', 'grassland')), 3)
fill_features(polys(lambda t: t.get('amenity') == 'parking' or t.get('landuse') in ('railway',)), 4)
fill_features(polys(lambda t: t.get('natural') in ('beach', 'sand')), 2)
fill_features(polys(lambda t: t.get('natural') == 'water' or t.get('water') in ('pond', 'lake', 'lagoon', 'reservoir', 'canal')), 0)
# a strip of sand on the sea side of the land where the beach polygons stop short
landm = grid > 0
near_sea = np.zeros_like(landm)
for dj in range(-3, 4):
    for di in range(-3, 4):
        if dj * dj + di * di <= 9: near_sea |= np.roll(np.roll(sea, dj, 0), di, 1)
grid[landm & near_sea & (grid == 1)] = 2
print('ground', GW, GH, {k: int((grid == k).sum()) for k in range(5)})
def write_png(path, arr):
    h, w = arr.shape
    raw = b''.join(b'\x00' + arr[j].tobytes() for j in range(h))
    def chunk(tag, data): return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
write_png(os.path.join(OUT, 'kochi_ground.png'), (grid * 60).astype(np.uint8))   # classes stored as 0,60,120,180,240

# ---------------- landmarks ----------------
poi = []
def centroid(e):
    if e['type'] == 'node': return proj(e['lat'], e['lon'])
    g = e.get('geometry') or [p for m in e.get('members', []) for p in m.get('geometry', [])]
    if not g: return None
    return proj(sum(p['lat'] for p in g) / len(g), sum(p['lon'] for p in g) / len(g))
KEEP_AM = {'hospital', 'clinic', 'police', 'fire_station', 'fuel', 'place_of_worship', 'bus_station', 'ferry_terminal', 'school', 'bank', 'restaurant', 'cafe', 'pharmacy', 'post_office', 'atm', 'marketplace', 'fast_food'}
for e in els:
    t = e.get('tags', {}); k = None
    if t.get('amenity') in KEEP_AM: k = t['amenity']
    elif t.get('tourism') in ('hotel', 'guest_house', 'hostel', 'museum', 'attraction', 'viewpoint', 'artwork'): k = t['tourism']
    elif t.get('historic'): k = 'historic'
    elif 'shop' in e.get('tags', {}): k = 'shop'
    if not k or not t.get('name'): continue
    c = centroid(e)
    if not c or not inb(*c, 0): continue
    poi.append({'k': k, 'n': t['name'], 'ml': t.get('name:ml', ''), 'r': t.get('religion', ''), 'x': q(c[0]), 'z': q(c[1])})
print('poi', len(poi))
meta = {'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'kz': KZ, 'minX': MINX, 'maxX': MAXX, 'minZ': MINZ, 'maxZ': MAXZ, 'res': RES, 'gw': GW, 'gh': GH,
        'types': TYPES, 'source': 'OpenStreetMap contributors (ODbL), extract ' + str(S) + ',' + str(W_) + ',' + str(N_) + ',' + str(E_)}
json.dump({'meta': meta, 'names': names, 'nodes': nodes, 'edges': edges, 'bld': bld, 'poi': poi}, open(os.path.join(OUT, 'kochi.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# ---------------- Kerala ----------------
K = json.load(open(os.path.join(SCR, 'osm', 'kerala.json'), encoding='utf-8'))['elements']
def rel_rings(e):
    ws = [[(round(g['lon'], 5), round(g['lat'], 5)) for g in m['geometry']] for m in e['members'] if m.get('type') == 'way' and m.get('role') in ('outer', '') and m.get('geometry')]
    out = []
    for r in assemble(ws):
        if len(r) < 4: continue
        s = simplify_ring(r[:-1] if r[0] == r[-1] else r, .004)
        if len(s) >= 4: out.append([v for p in s for v in (round(p[0], 4), round(p[1], 4))])
    return out
state, dist = None, []
for e in K:
    if e['type'] != 'relation': continue
    t = e['tags']
    if t.get('admin_level') == '4': state = rel_rings(e)
    else: dist.append({'n': t.get('name'), 'ml': t.get('name:ml', ''), 'rings': rel_rings(e)})
towns = [{'n': e['tags'].get('name'), 'ml': e['tags'].get('name:ml', ''), 'p': e['tags'].get('place'), 'lon': round(e['lon'], 4), 'lat': round(e['lat'], 4)} for e in K if e['type'] == 'node' and e['tags'].get('name')]
json.dump({'state': state, 'districts': dist, 'towns': towns, 'here': {'lon': LON0, 'lat': LAT0, 'n': 'Fort Kochi'}, 'source': 'OpenStreetMap contributors (ODbL)'},
          open(os.path.join(OUT, 'kerala.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('kerala: state rings', len(state or []), 'districts', len(dist), 'towns', len(towns))

# ---------------- preview image (for checking) ----------------
pal = np.array([[30, 80, 120], [120, 110, 95], [225, 205, 150], [70, 130, 60], [150, 150, 150]], np.uint8)
img = pal[grid].copy()
def px(x, z): return int((x - MINX) / RES), int((z - MINZ) / RES)
for b in bld:
    P = b['p']
    for i in range(0, len(P), 2):
        x, z = px(P[i] / 10, P[i + 1] / 10)
        if 0 <= x < GW and 0 <= z < GH: img[z, x] = [60, 50, 50]
for ed in edges:
    P = ed['p']
    for i in range(0, len(P) - 2, 2):
        x0, z0, x1, z1 = P[i] / 10, P[i + 1] / 10, P[i + 2] / 10, P[i + 3] / 10
        n = int(max(abs(x1 - x0), abs(z1 - z0)) / 2) + 1
        for k in range(n + 1):
            x, z = px(lerp := x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n)
            if 0 <= x < GW and 0 <= z < GH: img[z, x] = [255, 255, 255] if ed['c'] else [255, 120, 120]
h, w, _ = img.shape
raw = b''.join(b'\x00' + img[j].tobytes() for j in range(h))
def chunk(tag, data): return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
open(os.path.join(SCR, 'map_preview.png'), 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
for f in os.listdir(OUT): print(f, os.path.getsize(os.path.join(OUT, f)))
