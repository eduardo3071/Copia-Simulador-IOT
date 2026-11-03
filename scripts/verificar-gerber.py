"""Independent check of the Gerbers written by build-eletronica.ts, with gerbonara (not tscircuit).

Usage: python scripts/verificar-gerber.py <gerber-dir> <expected-width-mm> <expected-height-mm> [out.svg]

Checks: outline size, every drill and copper feature inside the outline, minimum copper-to-edge
distance, drill list, and the number of copper features per layer. Writes an SVG of the board.
"""
import math
import sys
from pathlib import Path

from gerbonara import LayerStack


def main(directory, width, height, svg=None):
    sys.stdout.reconfigure(encoding="utf-8")
    stack = LayerStack.open(Path(directory))
    outline = stack.outline
    print("camadas:", [f"{side}-{use}" for (side, use) in stack.graphic_layers.keys()])
    (x0, y0), (x1, y1) = outline.bounding_box(unit="mm")
    w, h = x1 - x0, y1 - y0
    print(f"contorno: {w:.2f} x {h:.2f} mm (esperado {width} x {height})")
    errors = []
    if abs(w - float(width)) > 0.1 or abs(h - float(height)) > 0.1:  # the outline stroke adds 0.05 mm
        errors.append("o contorno não tem o tamanho esperado")

    holes = []
    for layer in stack.drill_layers:
        for obj in layer.objects:
            holes.append((obj.x, obj.y, round(getattr(obj.aperture, "diameter", 0) or 0, 2)))
    print(f"furos: {len(holes)}")
    for hx, hy, d in sorted(holes):
        cx, cy = hx - (x0 + x1) / 2, hy - (y0 + y1) / 2
        inside = x0 <= hx <= x1 and y0 <= hy <= y1
        edge = min(hx - x0, x1 - hx, hy - y0, y1 - hy)
        print(f"  ({cx:+.2f}, {cy:+.2f}) mm do centro, diâmetro {d} mm, folga até a borda {edge:.2f} mm")
        if not inside:
            errors.append(f"furo fora do contorno em ({hx:.2f}, {hy:.2f})")

    for side in ("top", "bottom"):
        layer = stack.graphic_layers.get((side, "copper"))
        if layer is None:
            continue
        (cx0, cy0), (cx1, cy1) = layer.bounding_box(unit="mm")
        margin = min(cx0 - x0, x1 - cx1, cy0 - y0, y1 - cy1)
        print(f"cobre {side}: {len(layer.objects)} objetos, margem mínima até a borda {margin:.2f} mm")
        if margin < 0:
            errors.append(f"cobre {side} fora do contorno")
        elif margin < 0.25:
            errors.append(f"cobre {side} a menos de 0,25 mm da borda ({margin:.2f} mm)")

    if svg:
        Path(svg).write_text(str(stack.to_pretty_svg()), encoding="utf8")
        print("svg:", svg)
    print("RESULTADO:", "OK" if not errors else "; ".join(errors))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:5]))
