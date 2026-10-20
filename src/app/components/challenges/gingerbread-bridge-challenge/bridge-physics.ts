export interface Joint {
  x: number;
  y: number;
  fixed: boolean;
}
export type Beam = [number, number];
export const BRIDGE_JOINTS: Joint[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 70 + i * 100, y: 300, fixed: i === 0 || i === 5 })),
  ...Array.from({ length: 4 }, (_, i) => ({ x: 170 + i * 100, y: 190, fixed: false })),
];
export const BRIDGE_ROAD: Beam[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
];
export const BRIDGE_BLUEPRINT: Beam[] = [
  ...BRIDGE_ROAD,
  [6, 7],
  [7, 8],
  [8, 9],
  [1, 6],
  [2, 7],
  [3, 8],
  [4, 9],
  [0, 6],
  [6, 2],
  [7, 3],
  [8, 4],
  [9, 5],
];
export interface BridgeAnalysis {
  stable: boolean;
  positions: Joint[];
  deflection: number;
  strain: number;
}

/** Linear elastic, pin-jointed 2D truss analysis. No hard-coded winning bridge. */
export function analyzeBridge(beams: Beam[], loadX: number): BridgeAnalysis {
  const positions = BRIDGE_JOINTS.map((p) => ({ ...p }));
  const used = new Set(beams.flat());
  const free = [...used].filter((i) => !BRIDGE_JOINTS[i].fixed).sort((a, b) => a - b);
  const dof = new Map(free.map((id, i) => [id, i * 2]));
  const n = free.length * 2;
  const matrix = Array.from({ length: n }, () => Array(n + 1).fill(0) as number[]);
  const fail = (): BridgeAnalysis => ({
    stable: false,
    positions,
    deflection: Infinity,
    strain: Infinity,
  });
  if (
    !n ||
    !BRIDGE_ROAD.every(([a, b]) =>
      beams.some(([c, d]) => (a === c && b === d) || (a === d && b === c))
    )
  )
    return fail();
  for (const [a, b] of beams) {
    const pa = positions[a],
      pb = positions[b],
      dx = pb.x - pa.x,
      dy = pb.y - pa.y,
      length = Math.hypot(dx, dy);
    if (!length) return fail();
    const c = dx / length,
      s = dy / length,
      k = 60000 / length;
    const terms = [c, s, -c, -s];
    const ids = [
      dof.get(a),
      dof.get(a) === undefined ? undefined : dof.get(a)! + 1,
      dof.get(b),
      dof.get(b) === undefined ? undefined : dof.get(b)! + 1,
    ];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        if (ids[i] !== undefined && ids[j] !== undefined)
          matrix[ids[i]!][ids[j]!] += k * terms[i] * terms[j];
  }
  for (const id of free) matrix[dof.get(id)! + 1][n] = 12;
  const span = Math.max(0, Math.min(4, Math.floor((loadX - 70) / 100))),
    fraction = Math.max(0, Math.min(1, (loadX - (70 + span * 100)) / 100));
  for (const [id, weight] of [
    [span, 1 - fraction],
    [span + 1, fraction],
  ]) {
    const index = dof.get(id);
    if (index !== undefined) matrix[index + 1][n] += 600 * weight;
  }
  // Gaussian elimination with partial pivoting detects mechanisms (unbraced spans).
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    if (Math.abs(matrix[pivot][col]) < 1e-7) return fail();
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const scale = matrix[col][col];
    for (let j = col; j <= n; j++) matrix[col][j] /= scale;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let j = col; j <= n; j++) matrix[row][j] -= factor * matrix[col][j];
    }
  }
  for (const id of free) {
    positions[id].x += matrix[dof.get(id)!][n];
    positions[id].y += matrix[dof.get(id)! + 1][n];
  }
  const deflection = Math.max(...free.map((id) => Math.abs(positions[id].y - BRIDGE_JOINTS[id].y)));
  const strain = Math.max(
    ...beams.map(([a, b]) => {
      const before = Math.hypot(
        BRIDGE_JOINTS[a].x - BRIDGE_JOINTS[b].x,
        BRIDGE_JOINTS[a].y - BRIDGE_JOINTS[b].y
      );
      return (
        Math.abs(
          Math.hypot(positions[a].x - positions[b].x, positions[a].y - positions[b].y) - before
        ) / before
      );
    })
  );
  return { stable: Number.isFinite(deflection), positions, deflection, strain };
}
