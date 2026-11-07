"""Aufruf: python3 tools/weltkarte.py ne_50m_land.geojson bilder/weltkarte.json
Weltkarte (Land-Umrisse) aus Natural Earth 1:50m (gemeinfrei) als ein SVG-Pfad in Plattkarten-Projektion.
x = (Länge + 180) * K, y = (85 - Breite) * K  (Breite 85 … -60). Ausgabe: bilder/weltkarte.json {w, h, k, nord, pfad}."""
import json, sys
quelle, ziel = sys.argv[1], sys.argv[2]
K, NORD, SUED = 4, 85, -60
g = json.load(open(quelle))
def ring(r):
    pts = []
    for lon, lat in r:
        if lat < SUED - 2: continue
        x, y = round((lon + 180) * K, 1), round((NORD - lat) * K, 1)
        if not pts or abs(pts[-1][0] - x) + abs(pts[-1][1] - y) >= 0.8: pts.append((x, y))
    if len(pts) < 4: return ""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 6: return ""  # Kleinstinseln weglassen
    return "M" + "L".join(f"{x:g} {y:g}" for x, y in pts) + "Z"
teile = []
for f in g["features"]:
    geo = f["geometry"]
    polys = [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]
    for poly in polys:
        teile.append(ring(poly[0]))
pfad = "".join(t for t in teile if t)
json.dump({"w": 360 * K, "h": (NORD - SUED) * K, "k": K, "nord": NORD, "pfad": pfad, "quelle": "Natural Earth 1:50m Land (gemeinfrei, naturalearthdata.com)"}, open(ziel, "w"), separators=(",", ":"))
print(len(pfad), "Zeichen")
