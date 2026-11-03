"""Converts the faceted solids of "Pregoscopio V1.step" into binary STLs for the Suporte page.

The STEP comes from a viewer export (FACETED_BREP, one triangle per face), so no CAD kernel is needed.
Axes are remapped to the holder's frame (z up along the tube, x along the clamp bar, origin at the
underside of the head plate): (x, y, z)_step -> (z, x, y).  A cyclic permutation keeps the winding.

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
    6: ("manopla", "Manopla", False),
    7: ("anel-objetiva", "Anel da objetiva", True),
    8: ("luva-inferior", "Luva inferior", True),
}


def ids(text):
    return [int(x) for x in re.findall(r"#(\d+)", text)]


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

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, brep in enumerate(breps, start=1):
        tris = []
        for face in ids(shells[ids(ent[brep])[0]]):
            bound = next(x for x in ids(faces[face]) if x in bounds)
            tris.append([points[p] for p in ids(loops[ids(bounds[bound])[0]])])
        # remap to the holder frame
        tris = [[(z, x, y) for (x, y, z) in poly] for poly in tris]
        # some faces are quads or larger polygons: fan-triangulate them
        tris = [[poly[0], poly[i], poly[i + 1]] for poly in tris for i in range(1, len(poly) - 1)]
        lo = [min(p[i] for t in tris for p in t) for i in range(3)]
        hi = [max(p[i] for t in tris for p in t) for i in range(3)]
        key, label, moving = NAMES[index]
        name = f"pregoscopio-{index}.stl"
        with open(out / name, "wb") as f:
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
        manifest.append({"index": index, "key": key, "name": label, "file": name, "moving": moving, "triangles": len(tris), "min": [round(v, 2) for v in lo], "max": [round(v, 2) for v in hi]})
    (out / "pregoscopio.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    for m in manifest:
        print(m["index"], m["key"], m["triangles"], m["min"], m["max"])


if __name__ == "__main__":
    main(*sys.argv[1:3])
