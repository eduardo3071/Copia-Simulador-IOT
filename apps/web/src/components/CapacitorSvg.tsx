/** Ceramic disc capacitor, legs 0.1 in apart (matches the catalog pins at x = 10.2 / 19.8). */
export function CapacitorSvg({ label }: { label: string }) {
  return (
    <svg width={30} height={40} viewBox="0 0 30 40">
      <line x1={10.2} y1={18} x2={10.2} y2={38} stroke="#9a9a9a" strokeWidth={1.4} />
      <line x1={19.8} y1={18} x2={19.8} y2={38} stroke="#9a9a9a" strokeWidth={1.4} />
      <ellipse cx={15} cy={12} rx={11} ry={10} fill="#d9a441" stroke="#a87a25" />
      <text x={15} y={14.5} textAnchor="middle" fontSize={6.5} fontFamily="monospace" fill="#5a3d0c">
        {label}
      </text>
    </svg>
  );
}