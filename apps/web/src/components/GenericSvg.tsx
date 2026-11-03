import type { ComponentDefinition } from "@simiot/component-catalog";

type Shape = Extract<ComponentDefinition["visual"], { kind: "generic" }>["shape"];

interface Props {
  shape: Shape;
  /** Label printed on the part (voltage of a source). */
  label?: string;
  /** Rocker switch: closed = on. */
  closed?: boolean;
  onToggle?: () => void;
}

const LEG = { stroke: "#9a9a9a", strokeWidth: 1.6 } as const;

/** Parts drawn by this project, with their leads ending exactly on the catalog pins. */
export function GenericSvg({ shape, label, closed, onToggle }: Props) {
  switch (shape) {
    case "battery":
      return (
        <svg width={70} height={130} viewBox="0 0 70 130">
          <line x1={20} y1={84} x2={20} y2={124} stroke="#d33" strokeWidth={2} />
          <line x1={48.8} y1={84} x2={48.8} y2={124} stroke="#222" strokeWidth={2} />
          <circle cx={20} cy={124} r={3} fill="#d33" />
          <circle cx={48.8} cy={124} r={3} fill="#222" />
          <rect x={10} y={6} width={50} height={78} rx={4} fill="#2c3a4f" stroke="#10141b" />
          <rect x={10} y={6} width={50} height={22} rx={4} fill="#c8a24a" />
          <text x={35} y={22} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill="#3a2a05">{label ?? "9 V"}</text>
          <text x={35} y={55} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#c8d2e0">6F22</text>
          <text x={20} y={78} textAnchor="middle" fontSize={10} fill="#ff8a8a">+</text>
          <text x={48.8} y={78} textAnchor="middle" fontSize={10} fill="#c8d2e0">−</text>
        </svg>
      );
    case "supply":
      return (
        <svg width={80} height={100} viewBox="0 0 80 100">
          <line x1={28} y1={50} x2={28} y2={94} stroke="#d33" strokeWidth={2} />
          <line x1={52} y1={50} x2={52} y2={94} stroke="#222" strokeWidth={2} />
          <circle cx={28} cy={94} r={3} fill="#d33" />
          <circle cx={52} cy={94} r={3} fill="#222" />
          <rect x={6} y={6} width={68} height={44} rx={6} fill="#2a2f38" stroke="#10141b" />
          <text x={40} y={26} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="monospace" fill="#e6e8ee">{label ?? "12 V"}</text>
          <text x={40} y={40} textAnchor="middle" fontSize={7} fontFamily="monospace" fill="#8b93a5">500 mA · P4</text>
          <text x={28} y={62} textAnchor="middle" fontSize={9} fill="#ff8a8a">+</text>
          <text x={52} y={62} textAnchor="middle" fontSize={9} fill="#c8d2e0">−</text>
        </svg>
      );
    case "switch":
      return (
        <svg width={60} height={74} viewBox="0 0 60 74">
          <line x1={18} y1={44} x2={18} y2={68} {...LEG} />
          <line x1={42} y1={44} x2={42} y2={68} {...LEG} />
          <rect x={8} y={4} width={44} height={42} rx={4} fill="#1d2027" stroke="#05070a" />
          <g
            style={{ cursor: "pointer" }}
            role="switch"
            aria-checked={!!closed}
            aria-label={closed ? "Interruptor ligado: clique para desligar" : "Interruptor desligado: clique para ligar"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggle}
          >
            <rect x={13} y={closed ? 8 : 22} width={34} height={18} rx={3} fill={closed ? "#d9362b" : "#4a4f5a"} stroke="#000" />
            <text x={30} y={closed ? 21 : 35} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily="monospace" fill="#fff">{closed ? "I" : "O"}</text>
          </g>
        </svg>
      );
    case "regulator":
      return (
        <svg width={50} height={74} viewBox="0 0 50 74">
          <line x1={15.4} y1={42} x2={15.4} y2={70} {...LEG} />
          <line x1={25} y1={42} x2={25} y2={70} {...LEG} />
          <line x1={34.6} y1={42} x2={34.6} y2={70} {...LEG} />
          <rect x={8} y={2} width={34} height={12} fill="#bfc4cc" stroke="#7b818b" />
          <circle cx={25} cy={8} r={3} fill="#2a2f38" />
          <rect x={8} y={14} width={34} height={28} fill="#1c1f24" stroke="#05070a" />
          <text x={25} y={27} textAnchor="middle" fontSize={7.5} fontFamily="monospace" fill="#e6e8ee">LM317</text>
          <text x={15.4} y={38} textAnchor="middle" fontSize={4.5} fontFamily="monospace" fill="#9aa3b5">ADJ</text>
          <text x={25} y={38} textAnchor="middle" fontSize={4.5} fontFamily="monospace" fill="#9aa3b5">OUT</text>
          <text x={34.6} y={38} textAnchor="middle" fontSize={4.5} fontFamily="monospace" fill="#9aa3b5">IN</text>
        </svg>
      );
  }
}
