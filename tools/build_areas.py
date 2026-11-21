# HELL GATE: Missions 2-6 neighbourhoods from OpenStreetMap extracts (Overpass JSON in tools/osm_nyc/).
# For each area (own origin, local metres x east / z south, decimetre ints):
#   models/map/nyc/<area>.json         roads, buildings with real heights, POIs, meta (+ far-shore raster params)
#   models/map/nyc/<area>_ground.png   ground classes at 3 m/px (0 water, 1 land, 2 sand, 3 grass, 4 paved; stored x60)
#   models/map/nyc/<area>_far.png      land / water around the area, 25 m/px (distant shores)
#   models/map/nyc/<area>_sky.json     (gowanus, midtown) Lower Manhattan skyline re-projected to this origin
# Data (c) OpenStreetMap contributors, ODbL.   Run:  python build_areas.py "<game folder>"   (needs numpy)
import json, math, os, sys, random, collections
import numpy as np
from nyc_osm import ring_area, dp, simplify_ring, assemble, write_png, coast_sea, fill_rings

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm_nyc')
OUT = os.path.join(sys.argv[1], 'models', 'map', 'nyc'); os.makedirs(OUT, exist_ok=True)
AREAS = {
    'huntspoint': (40.8000, -73.8960, 40.8170, -73.8700, False),
    'brighton':   (40.5730, -73.9720, 40.5830, -73.9480, False),
    'gowanus':    (40.6680, -73.9970, 40.6860, -73.9800, True),
    'midtown':    (40.7450, -74.0100, 40.7700, -73.9750, True),
}
only = sys.argv[2:] or list(AREAS)
NYC_ELS = json.load(open(os.path.join(SRC, 'nyc.json'), encoding='utf-8'))['elements']
MAN_ELS = json.load(open(os.path.join(SRC, 'manhattan.json'), encoding='utf-8'))['elements']
WIDTH = {'motorway': 16, 'trunk': 14, 'primary': 13, 'secondary': 11, 'tertiary': 10, 'unclassified': 8, 'residential': 9, 'living_street': 6, 'service': 5,
         'secondary_link': 7, 'primary_link': 8, 'trunk_link': 8, 'motorway_link': 8, 'pedestrian': 6, 'footway': 2.2, 'path': 2, 'steps': 2, 'cycleway': 2.5}
CAR = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'secondary_link', 'primary_link', 'trunk_link', 'motorway_link'}
q = lambda v: int(round(v * 10))

def height_of(t, A, rnd):
    h = None
    try: h = float(str(t.get('height', '')).replace('m', '').split(';')[0].strip())
    except: pass
    if not h:
        lv = t.get('building:levels')
        try: h = float(lv) * 3.3 if lv else None
        except: h = None
    if not h: h = rnd.choice([7, 9.5, 10.5, 12]) if A < 400 else rnd.choice([6, 8, 10])
    return h

for name in only:
    S, W_, N_, E_, has_sky = AREAS[name]
    LAT0, LON0 = (S + N_) / 2, (W_ + E_) / 2
    KX = 111320 * math.cos(math.radians(LAT0)); KZ = 111050
    proj = lambda lat, lon: ((lon - LON0) * KX, -(lat - LAT0) * KZ)
    MINX, MAXX = proj(LAT0, W_)[0], proj(LAT0, E_)[0]
    MINZ, MAXZ = proj(N_, LON0)[1], proj(S, LON0)[1]
    inb = lambda x, z, m=30: MINX - m < x < MAXX + m and MINZ - m < z < MAXZ + m
    els = json.load(open(os.path.join(SRC, name + '.json'), encoding='utf-8'))['elements']
    print('==', name, 'world', round(MINX), round(MAXX), round(MINZ), round(MAXZ), 'elements', len(els))
    # ---- roads
    roads, names, name_i = [], [], {}
    def nm(s):
        if not s: return -1
        if s not in name_i: name_i[s] = len(names); names.append(s)
        return name_i[s]
    for e in els:
        t = e.get('tags', {}); hw = t.get('highway')
        if e['type'] != 'way' or hw not in WIDTH or t.get('bridge') == 'yes' or t.get('tunnel') in ('yes', 'building_passage') or t.get('area') == 'yes' or t.get('layer', '0').startswith('-'): continue
        if hw == 'footway' and t.get('footway') in ('sidewalk', 'crossing'): continue
        P = [proj(g['lat'], g['lon']) for g in e['geometry']]
        if not any(inb(x, z) for x, z in P): continue
        P = dp(P, .4)
        roads.append({'w': WIDTH[hw], 'c': 1 if hw in CAR else 0, 'n': nm(t.get('name')), 'p': [v for x, z in P for v in (q(x), q(z))]})
    hist = collections.Counter()
    for r in roads:
        if not r['c']: continue
        P = r['p']
        for i in range(0, len(P) - 2, 2):
            dx, dz = P[i + 2] - P[i], P[i + 3] - P[i + 1]; L = math.hypot(dx, dz)
            if L > 200: hist[round(math.degrees(math.atan2(dz, dx)) % 90)] += L
    grid_angle = hist.most_common(1)[0][0] if hist else 0
    print('roads', len(roads), 'grid angle', grid_angle)
    # ---- buildings
    bld = []
    for e in els:
        t = e.get('tags', {})
        if 'building' not in t or e['type'] == 'node' or t.get('building') in ('roof', 'construction') and not t.get('height'): continue
        rings = [[proj(g['lat'], g['lon']) for g in e['geometry']]] if e['type'] == 'way' else [[proj(g['lat'], g['lon']) for g in m['geometry']] for m in e.get('members', []) if m['role'] == 'outer' and m.get('geometry')]
        for r in rings:
            if len(r) < 4: continue
            r = r[:-1] if r[0] == r[-1] else r
            if not any(inb(x, z, 0) for x, z in r): continue
            r = simplify_ring(r, .3)
            A = ring_area(r)
            if abs(A) < 10: continue
            if A < 0: r = r[::-1]; A = -A
            h = height_of(t, A, random.Random(e['id']))
            bt = t.get('building')
            K = {'apartments': 1, 'residential': 1, 'house': 1, 'detached': 1, 'semidetached_house': 1, 'terrace': 1, 'industrial': 2, 'warehouse': 2, 'church': 3, 'school': 4,
                 'retail': 5, 'commercial': 5, 'office': 8, 'hotel': 8}.get(bt, 0)
            if K == 0: K = 2 if A > 1500 and h < 14 else 1 if h > 8 else 0
            if h > 60: K = 8                                   # glass / stone towers
            bld.append({'p': [v for x, z in r for v in (q(x), q(z))], 'h': round(h, 1), 'k': K})
    print('buildings', len(bld), 'towers', sum(1 for b in bld if b['k'] == 8), 'tallest', max((b['h'] for b in bld), default=0))
    # ---- ground classes
    RES = 3.0
    GW, GH = int(math.ceil((MAXX - MINX) / RES)), int(math.ceil((MAXZ - MINZ) / RES))
    X, Z = np.meshgrid(MINX + (np.arange(GW) + .5) * RES, MINZ + (np.arange(GH) + .5) * RES)
    grid = np.ones((GH, GW), np.uint8)
    segs = []
    for src in (els, NYC_ELS):
        for e in src:
            if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline':
                w = [proj(g['lat'], g['lon']) for g in e['geometry']]
                if any(MINX - 4000 < x < MAXX + 4000 and MINZ - 4000 < z < MAXZ + 4000 for x, z in w): segs.append(w)
    if segs: grid[coast_sea(segs, X, Z)] = 0
    def polys(pred):
        out = []
        for e in els:
            t = e.get('tags', {})
            if not pred(t) or not e.get('geometry') and e['type'] == 'way': continue
            if e['type'] == 'way' and e['geometry'][0] == e['geometry'][-1]: out.append([[proj(g['lat'], g['lon']) for g in e['geometry']]])
            elif e['type'] == 'relation':
                ws = [[(g['lat'], g['lon']) for g in m['geometry']] for m in e.get('members', []) if m.get('geometry')]
                out.append([[proj(a, b) for a, b in r] for r in assemble(ws) if r[0] == r[-1]])
        return out
    for feat in polys(lambda t: t.get('leisure') in ('park', 'garden', 'pitch', 'playground', 'recreation_ground') or t.get('landuse') in ('grass', 'recreation_ground', 'cemetery') or t.get('natural') in ('wood', 'scrub', 'grassland')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH) & (grid > 0)] = 3
    for feat in polys(lambda t: t.get('amenity') == 'parking' or t.get('landuse') in ('industrial', 'railway', 'port', 'commercial')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH) & (grid == 1)] = 4
    for feat in polys(lambda t: t.get('natural') in ('beach', 'sand')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH)] = 2
    for feat in polys(lambda t: t.get('natural') == 'water' and t.get('water') not in ('pond', 'reservoir', 'fountain') or t.get('waterway') in ('canal', 'dock', 'riverbank')): grid[fill_rings(feat, MINX, MINZ, RES, GW, GH)] = 0
    print('ground', GW, GH, {k: int((grid == k).sum()) for k in range(5)})
    write_png(os.path.join(OUT, name + '_ground.png'), (grid * 60).astype(np.uint8))
    # ---- POIs
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
    # ---- distant shores (25 m/px, +-6 km)
    FR = 25.0; FX0, FX1, FZ0, FZ1 = -6000, 6000, -6000, 6000
    FW, FH = int((FX1 - FX0) / FR), int((FZ1 - FZ0) / FR)
    FXg, FZg = np.meshgrid(FX0 + (np.arange(FW) + .5) * FR, FZ0 + (np.arange(FH) + .5) * FR)
    near = []
    for e in NYC_ELS:
        if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline':
            w = [proj(g['lat'], g['lon']) for g in e['geometry']]
            if any(FX0 - 3000 < x < FX1 + 3000 and FZ0 - 3000 < z < FZ1 + 3000 for x, z in w): near.append(w)
    far = (~coast_sea(near, FXg, FZg)).astype(np.uint8) * 255
    write_png(os.path.join(OUT, name + '_far.png'), far)
    # ---- shore lines (coastline + river / canal banks) for the seawalls
    shore = []
    def clip_keep(w):
        return [pt for pt in w if inb(pt[0], pt[1], 60)]
    for w in segs:
        run = []
        for pt in w:
            if inb(pt[0], pt[1], 60): run.append(pt)
            elif run:
                if len(run) > 1: shore.append(run)
                run = []
        if len(run) > 1: shore.append(run)
    for feat in polys(lambda t: t.get('natural') == 'water' and t.get('water') not in ('pond', 'reservoir', 'fountain') or t.get('waterway') in ('canal', 'dock', 'riverbank')):
        for r in feat:
            if any(inb(x, z, 0) for x, z in r): shore.append(r)
    shore = [[v for x, z in dp(r, 1.0) for v in (q(x), q(z))] for r in shore]
    print('shore lines', len(shore))
    meta = {'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'kz': KZ, 'minX': MINX, 'maxX': MAXX, 'minZ': MINZ, 'maxZ': MAXZ, 'res': RES, 'gw': GW, 'gh': GH, 'grid': grid_angle,
            'far': {'x0': FX0, 'z0': FZ0, 'r': FR, 'w': FW, 'h': FH},
            'source': 'OpenStreetMap contributors (ODbL), extract %s,%s,%s,%s' % (S, W_, N_, E_)}
    json.dump({'meta': meta, 'names': names, 'roads': roads, 'bld': bld, 'poi': poi, 'shore': shore}, open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    # ---- Lower Manhattan skyline from this origin
    if has_sky:
        sky = []
        for e in MAN_ELS:
            t = e.get('tags', {})
            if 'building' not in t: continue
            try: h = float(str(t.get('height', '')).replace('m', '').strip())
            except: h = 0
            if h < 30: continue
            rings = [[proj(g['lat'], g['lon']) for g in e['geometry']]] if e['type'] == 'way' else [[proj(g['lat'], g['lon']) for g in m['geometry']] for m in e.get('members', []) if m['role'] == 'outer' and m.get('geometry')]
            for r in rings:
                if len(r) < 4: continue
                r = r[:-1] if r[0] == r[-1] else r
                if any(inb(x, z, 200) for x, z in r): continue
                r = simplify_ring(r, 1.5); A = ring_area(r)
                if abs(A) < 60: continue
                if A < 0: r = r[::-1]
                sky.append({'p': [v for x, z in r for v in (round(x), round(z))], 'h': round(h)})
        json.dump({'bld': sky}, open(os.path.join(OUT, name + '_sky.json'), 'w'), separators=(',', ':'))
        print('skyline', len(sky))
for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(os.path.join(OUT, f)))
