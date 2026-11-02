import { memo } from "react";
import { BREADBOARD_COLUMNS, breadboardHalf, PITCH } from "@simiot/component-catalog";

/** Static drawing of the half breadboard; holes come from the catalog so they match the pins. */
export const BreadboardSvg = memo(function BreadboardSvg() {
  const { width, height } = breadboardHalf.size;
  const railY = (id: string) => breadboardHalf.pins.find((p) => p.id === `${id}.1`)!.y;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="breadboard-svg">
      <rect x={0} y={0} width={width} height={height} rx={6} fill="#f4f1e8" stroke="#cfc8b6" />
      <rect x={4} y={9 * PITCH - 3} width={width - 8} height={6} fill="#e4dfd1" />
      {[
        ["tn", "#3b6fd8", -1],
        ["tp", "#d84a3b", 1],
        ["bp", "#d84a3b", -1],
        ["bn", "#3b6fd8", 1],
      ].map(([id, color, side]) => (
        <line
          key={id as string}
          x1={PITCH}
          x2={width - PITCH}
          y1={railY(id as string) + (side as number) * 5.5}
          y2={railY(id as string) + (side as number) * 5.5}
          stroke={color as string}
          strokeWidth={1}
        />
      ))}
      {breadboardHalf.pins.map((p) => (
        <rect key={p.id} x={p.x - 2} y={p.y - 2} width={4} height={4} rx={0.8} fill="#3d3a33" />
      ))}
      {Array.from({ length: BREADBOARD_COLUMNS }, (_, i) => i + 1)
        .filter((c) => c === 1 || c % 5 === 0)
        .map((c) => (
          <text key={c} x={(c + 0.5) * PITCH} y={3.2 * PITCH} className="bb-label" textAnchor="middle">
            {c}
          </text>
        ))}
      {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((row) => {
        const y = breadboardHalf.pins.find((p) => p.id === `1${row}`)!.y;
        return (
          <text key={row} x={0.55 * PITCH} y={y + 2.5} className="bb-label" textAnchor="middle">
            {row}
          </text>
        );
      })}
    </svg>
  );
});