# shared OpenStreetMap helpers for build_nyc.py / build_areas.py
import math, zlib, struct
import numpy as np

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

