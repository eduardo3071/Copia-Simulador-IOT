/**
 * DC nodal analysis of a linear resistor network with fixed-voltage nodes.
 * Nodes with no resistive path to a fixed node are left undefined (floating).
 */
export interface Resistance {
  a: string;
  b: string;
  ohms: number;
}

export interface SolveResult {
  voltage: Map<string, number>;
  /** Current through each resistance (index-aligned), from a to b. */
  currents: number[];
}

export function solveDc(fixed: ReadonlyMap<string, number>, resistances: readonly Resistance[]): SolveResult {
  const voltage = new Map(fixed);
  const adjacency = new Map<string, number[]>();
  resistances.forEach((r, i) => {
    for (const node of [r.a, r.b]) {
      const list = adjacency.get(node) ?? [];
      list.push(i);
      adjacency.set(node, list);
    }
  });

  // Unknown nodes reachable from a fixed node, grouped by connected component.
  const visited = new Set<string>();
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const node = stack.pop()!;
      component.push(node);
      for (const i of adjacency.get(node) ?? []) {
        const r = resistances[i]!;
        const other = r.a === node ? r.b : r.a;
        if (!visited.has(other)) {
          visited.add(other);
          stack.push(other);
        }
      }
    }
    const unknown = component.filter((n) => !fixed.has(n));
    if (unknown.length === 0 || unknown.length === component.length) continue;
    const index = new Map(unknown.map((n, i) => [n, i]));
    const size = unknown.length;
    const g = Array.from({ length: size }, () => new Float64Array(size + 1));
    for (const node of unknown) {
      const row = g[index.get(node)!]!;
      for (const i of adjacency.get(node) ?? []) {
        const r = resistances[i]!;
        const other = r.a === node ? r.b : r.a;
        if (other === node) continue;
        const conductance = 1 / Math.max(r.ohms, 1e-6);
        row[index.get(node)!]! += conductance;
        const j = index.get(other);
        if (j === undefined) row[size]! += conductance * fixed.get(other)!;
        else row[j]! -= conductance;
      }
    }
    const solution = gaussian(g, size);
    unknown.forEach((n, i) => voltage.set(n, solution[i]!));
  }

  const currents = resistances.map((r) => {
    const va = voltage.get(r.a);
    const vb = voltage.get(r.b);
    return va === undefined || vb === undefined ? 0 : (va - vb) / Math.max(r.ohms, 1e-6);
  });
  return { voltage, currents };
}

function gaussian(m: Float64Array[], n: number): Float64Array {
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const p = m[col]![col]!;
    if (Math.abs(p) < 1e-15) continue;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row]![col]! / p;
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) m[row]![k]! -= factor * m[col]![k]!;
    }
  }
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = m[i]![i]! === 0 ? 0 : m[i]![n]! / m[i]![i]!;
  return x;
}