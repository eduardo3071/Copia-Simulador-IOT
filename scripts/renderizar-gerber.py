"""Draws the Gerber files of a board to a PNG with gerbonara and Pillow (not tscircuit): outline, copper, silkscreen and drills.

Usage: python scripts/renderizar-gerber.py <gerber-dir> <out.png> [side]   (side: top or bottom, default top)

Used by the manual to show the real board and to look at traces, pads and the orientation mark.
"""
import math
import sys
from pathlib import Path

from gerbonara import LayerStack
from gerbonara.utils import MM
from PIL import Image, ImageDraw, ImageFont

SCALE = 24  # pixels per millimetre
MARGIN = 28


def primitives(layer):
    for obj in layer.objects:
        yield from obj.to_primitives(unit=MM)


def main(directory, out, side="top"):
    stack = LayerStack.open(Path(directory))
    xs, ys = [], []
    for p in primitives(stack.outline):
        xs += [p.x1, p.x2]
        ys += [p.y1, p.y2]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0, y1 - y0
    flip = side == "bottom"

    def px(x, y):
        u = (x - x0) * SCALE + MARGIN
        if flip:
            u = (w - (x - x0)) * SCALE + MARGIN
        return u, (h - (y - y0)) * SCALE + MARGIN

    img = Image.new("RGB", (int(w * SCALE + 2 * MARGIN), int(h * SCALE + 2 * MARGIN + 34)), "#f4f6f9")
    d = ImageDraw.Draw(img)
    # board body
    d.rectangle([px(x0, y1)[0] if not flip else px(x1, y1)[0], px(x0, y1)[1], px(x1, y0)[0] if not flip else px(x0, y0)[0], px(x1, y0)[1]], fill="#1f7a4f")

    def draw(layer_key, color, width_floor=0):
        layer = stack.graphic_layers.get(layer_key)
        if not layer:
            return
        for p in primitives(layer):
            kind = type(p).__name__
            if kind == "Circle":
                cx, cy = px(p.x, p.y)
                r = p.r * SCALE
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
            elif kind == "Rectangle":
                cx, cy = px(p.x, p.y)
                hw, hh = p.w * SCALE / 2, p.h * SCALE / 2
                d.rectangle([cx - hw, cy - hh, cx + hw, cy + hh], fill=color)
            elif kind == "Line":
                a, b = px(p.x1, p.y1), px(p.x2, p.y2)
                wd = max(int(p.width * SCALE), width_floor, 1)
                d.line([a, b], fill=color, width=wd)
                r = wd / 2
                for q in (a, b):
                    d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=color)

    other = "bottom" if side == "top" else "top"
    draw((other, "copper"), "#2c6e96")
    draw((side, "copper"), "#c98a2b")
    draw((side, "silk"), "#f7f7f7")
    for p in primitives(stack.outline):
        d.line([px(p.x1, p.y1), px(p.x2, p.y2)], fill="#101010", width=2)
    for layer in stack.drill_layers:
        for obj in layer.objects:
            cx, cy = px(obj.x, obj.y)
            r = (getattr(obj.aperture, "diameter", 0.8) or 0.8) * SCALE / 2
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#0c0f14")
    d.text((MARGIN, img.size[1] - 26), f"{Path(directory).parent.name}  lado {side}  {w:.1f} x {h:.1f} mm  (x para a direita, y para cima{', espelhado' if flip else ''})", fill="#222")
    img.save(out)
    print(out, img.size)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "top")
