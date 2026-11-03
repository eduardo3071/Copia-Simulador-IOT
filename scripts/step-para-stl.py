"""Converts the faceted solids of "Pregoscopio V1.step" into binary STLs for the Suporte page.

The STEP comes from a viewer export (FACETED_BREP, one polygon per face), so no CAD kernel is needed.
Axes are remapped to the holder's frame (z up along the tube, x along the clamp bar, origin at the
underside of the head plate): (x, y, z)_step -> (z, x, y).  A cyclic permutation keeps the winding.

The STEP carries one knob only; the photo of the printed part shows two. Solid 9 is the mirror of
solid 6 across x = 0, so the model matches the photo (it is derived, not part of the STEP).

Usage: python scripts/step-para-stl.py "<path>/Pregoscopio V1.step" apps/web/public/suporte/pregoscopio
"""
import json
import math
import re
import struct
import sys
from pathlib import Path

NAMES = {
    1: ("cabeca", "Cabeça: placa e haste roscada", False),
    2: ("tubo-externo", "Tubo externo", False),
    3: ("tubo-interno", "Tubo interno (telescópico)", True),
    4: ("garra-esquerda", "Garra esquerda", False),
    5: ("garra-direita", "Garra direita", False),
    6: ("manopla-direita", "Manopla direita", False),
    7: ("anel-objetiva", "Anel da objetiva", True),
    8: ("luva-inferior", "Luva inferior", True),
    9: ("manopla-esquerda", "Manopla esquerda (espelho da P6)", False),
}


def ids(text):
    return [int(x) for x in re.findall(r"#(\d+)", text)]


def triangles(polygons):
    """Fan-triangulates faces that are quads or larger polygons."""
    return [[poly[0], poly[i], poly[i + 1]] for poly in polygons for i in range(1, len(poly) - 1)]


def write_stl(path, key, tris):
    with open(path, "wb") as f:
        f.write(b"Pregoscopio V1.step " + key.encode().ljust(60))
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            n = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
            ln = math.sqrt(sum(q * q for q in n)) or 1.0
            f.write(struct.pack("<3f", *(q / ln for q in n)))
            for p in (a, b, c):
                f.write(struct.pack("<3f", *p))
            f.write(b"\0\0")


def main(step_path, out_dir):
    text = Path(step_path).read_text(encoding="latin1")
    ent = {int(m.group(1)): m.group(2) for m in re.finditer(r"#(\d+)=(.*?);\n", text, re.S)}
    points = {}
    for k, v in ent.items():
        if v.startswith("CARTESIAN_POINT"):
            m = re.search(r"\(([-\d.E+]+),\s*([-\d.E+]+),\s*([-\d.E+]+)\)\)$", v.strip())
            if m:
                points[k] = tuple(map(float, m.groups()))
    shells = {k: v for k, v in ent.items() if v.startswith("CLOSED_SHELL")}
    faces = {k: v for k, v in ent.items() if v.startswith("FACE_SURFACE")}
    bounds = {k: v for k, v in ent.items() if v.startswith("FACE_OUTER_BOUND")}
    loops = {k: v for k, v in ent.items() if v.startswith("POLY_LOOP")}
    breps = sorted(k for k, v in ent.items() if v.startswith("FACETED_BREP("))

    solids = []
    for brep in breps:
        polygons = []
        for face in ids(shells[ids(ent[brep])[0]]):
            bound = next(x for x in ids(faces[face]) if x in bounds)
            polygons.append([points[p] for p in ids(loops[ids(bounds[bound])[0]])])
        # remap to the holder frame, then triangulate
        solids.append(triangles([[(z, x, y) for (x, y, z) in poly] for poly in polygons]))
    # the mirrored knob: reflect x and reverse each triangle so the normals still point outward
    solids.append([[(-x, y, z) for (x, y, z) in tri[::-1]] for tri in solids[5]])

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, tris in enumerate(solids, start=1):
        lo = [min(p[i] for t in tris for p in t) for i in range(3)]
        hi = [max(p[i] for t in tris for p in t) for i in range(3)]
        key, label, moving = NAMES[index]
        name = f"pregoscopio-{index}.stl"
        write_stl(out / name, key, tris)
        manifest.append({"index": index, "key": key, "name": label, "file": name, "moving": moving, "triangles": len(tris), "min": [round(v, 2) for v in lo], "max": [round(v, 2) for v in hi]})
    (out / "pregoscopio.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    for m in manifest:
        print(m["index"], m["key"], m["triangles"], m["min"], m["max"])


if __name__ == "__main__":
    main(*sys.argv[1:3])
