"""Checks that the copper of the Gerber files connects exactly the pads that the circuit says it must.

Usage: python scripts/verificar-rede-gerber.py <board-dir>      (a folder with gerber/, circuit.json and netlist-esperada.json)

Independent of tscircuit: it reads the Gerbers with gerbonara, joins every copper shape that touches another one on the same layer
and every pair of top and bottom shapes that share a plated hole, and then compares the groups with the expected nets.
It reports an open (pads of one net in different groups) or a short (pads of different nets in one group).
"""
import json
import math
import os
import sys
from pathlib import Path

from gerbonara import LayerStack
from gerbonara.utils import MM


def prims(layer):
    for obj in layer.objects:
        yield from obj.to_primitives(unit=MM)


def seg_dist(ax, ay, bx, by, px, py):
    dx, dy = bx - ax, by - ay
    n = dx * dx + dy * dy
    t = 0 if n == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / n))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def seg_seg(a, b):
    ends = [(a[0], a[1], b), (a[2], a[3], b), (b[0], b[1], a), (b[2], b[3], a)]
    return min(seg_dist(o[0], o[1], o[2], o[3], x, y) for x, y, o in ends)


class Shape:
    def __init__(self, kind, layer, data, width=0.0):
        self.kind, self.layer, self.data, self.width = kind, layer, data, width

    def reach(self, other):
        """True when the two copper shapes touch."""
        if self.kind == "line" and other.kind == "line":
            return seg_seg(self.data, other.data) <= (self.width + other.width) / 2 + 1e-6
        if self.kind == "line":
            return other.reach(self)
        x, y, r = self.data
        if other.kind == "line":
            return seg_dist(*other.data, x, y) <= r + other.width / 2 + 1e-6
        ox, oy, orad = other.data
        return math.hypot(x - ox, y - oy) <= r + orad + 1e-6

    def covers(self, x, y, slack=0.0):
        if self.kind == "line":
            return seg_dist(*self.data, x, y) <= self.width / 2 + slack
        cx, cy, r = self.data
        return math.hypot(x - cx, y - cy) <= r + slack


def main(directory):
    sys.stdout.reconfigure(encoding="utf-8")
    base = Path(directory)
    stack = LayerStack.open(base / "gerber")
    outline = [p for p in prims(stack.outline)]
    cx = (min(min(p.x1, p.x2) for p in outline) + max(max(p.x1, p.x2) for p in outline)) / 2
    cy = (min(min(p.y1, p.y2) for p in outline) + max(max(p.y1, p.y2) for p in outline)) / 2

    shapes = []
    for side in ("top", "bottom"):
        layer = stack.graphic_layers.get((side, "copper"))
        if not layer:
            continue
        for p in prims(layer):
            kind = type(p).__name__
            if kind == "Circle":
                shapes.append(Shape("pad", side, (p.x - cx, p.y - cy, p.r)))
            elif kind == "Rectangle":
                shapes.append(Shape("pad", side, (p.x - cx, p.y - cy, max(p.w, p.h) / 2)))
            elif kind == "Line":
                shapes.append(Shape("line", side, (p.x1 - cx, p.y1 - cy, p.x2 - cx, p.y2 - cy), p.width))

    if os.environ.get("MUTAR"):  # self-test: take one trace away and the check must report an open
        shapes.remove(next(s for s in shapes if s.kind == "line"))

    holes = []
    for layer in stack.drill_layers:
        for obj in layer.objects:
            for p in obj.to_primitives(unit=MM):
                holes.append((p.x - cx, p.y - cy, p.r))

    parent = list(range(len(shapes)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        parent[find(i)] = find(j)

    for i, a in enumerate(shapes):
        for j in range(i + 1, len(shapes)):
            if a.layer == shapes[j].layer and a.reach(shapes[j]):
                union(i, j)
    for hx, hy, hr in holes:
        inside = [i for i, s in enumerate(shapes) if s.covers(hx, hy, hr)]
        for i in inside[1:]:
            union(inside[0], i)

    circuit = json.loads((base / "circuit.json").read_text(encoding="utf-8"))
    comp = {e["source_component_id"]: e["name"] for e in circuit if e["type"] == "source_component"}
    port = {e["source_port_id"]: f'{comp[e["source_component_id"]]}.{e["name"]}' for e in circuit if e["type"] == "source_port"}
    pcb_port = {e["pcb_port_id"]: e["source_port_id"] for e in circuit if e["type"] == "pcb_port"}
    pads = {}
    for e in circuit:
        if e["type"] == "pcb_plated_hole":
            pads[port[pcb_port[e["pcb_port_id"]]]] = (e["x"], e["y"])
    expected = json.loads((base / "netlist-esperada.json").read_text(encoding="utf-8"))["pads"]

    group_of = {}
    for name, (x, y) in pads.items():
        hit = [i for i, s in enumerate(shapes) if s.covers(x, y, 0.05)]
        if not hit:
            print(f"ERRO: nenhum cobre sob o pad {name} em ({x:.2f}, {y:.2f})")
            return 1
        group_of[name] = find(hit[0])

    errors = []
    by_net, by_group = {}, {}
    for name, net in expected.items():
        if name not in group_of:
            errors.append(f"pad {name} não está no circuit.json")
            continue
        by_net.setdefault(net, set()).add(group_of[name])
        by_group.setdefault(group_of[name], set()).add(net)
    for net, groups in by_net.items():
        if len(groups) > 1:
            members = [n for n, v in expected.items() if v == net]
            errors.append(f"ABERTO: a rede {net} ({', '.join(members)}) está em {len(groups)} pedaços de cobre")
    for group, nets in by_group.items():
        if len(nets) > 1:
            members = [n for n, g in group_of.items() if g == group]
            errors.append(f"CURTO: redes {sorted(nets)} ligadas pelo cobre ({', '.join(members)})")
    print(f"{base.name}: {len(pads)} pads, {len(by_net)} redes esperadas, {len(set(group_of.values()))} grupos de cobre")
    for e in errors:
        print("  ", e)
    print("RESULTADO:", "OK" if not errors else "FALHOU")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
