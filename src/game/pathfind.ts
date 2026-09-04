const INF = 1e8;

class MinHeap {
  k: number[] = [];
  v: number[] = [];
  n = 0;

  push(key: number, val: number) {
    let i = this.n++;
    this.k[i] = key;
    this.v[i] = val;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p]! <= this.k[i]!) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number | undefined {
    if (this.n === 0) return undefined;
    const top = this.v[0];
    const lastK = this.k[--this.n]!;
    const lastV = this.v[this.n]!;
    if (this.n === 0) return top;
    this.k[0] = lastK;
    this.v[0] = lastV;
    let i = 0;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let s = i;
      if (l < this.n && this.k[l]! < this.k[s]!) s = l;
      if (r < this.n && this.k[r]! < this.k[s]!) s = r;
      if (s === i) break;
      this.swap(i, s);
      i = s;
    }
    return top;
  }

  swap(a: number, b: number) {
    const tk = this.k[a]!;
    const tv = this.v[a]!;
    this.k[a] = this.k[b]!;
    this.v[a] = this.v[b]!;
    this.k[b] = tk;
    this.v[b] = tv;
  }
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function astar(
  walk: Float32Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): { x: number; y: number }[] | null {
  const start = (sy | 0) * w + (sx | 0);
  const goal = (gy | 0) * w + (gx | 0);
  if (start === goal) return [{ x: gx | 0, y: gy | 0 }];
  if (walk[start]! >= INF || walk[goal]! >= INF) return null;

  const heap = new MinHeap();
  const gScore = new Float32Array(w * h);
  gScore.fill(INF);
  const came = new Int32Array(w * h);
  came.fill(-1);
  gScore[start] = 0;
  heap.push(Math.abs((sx | 0) - (gx | 0)) + Math.abs((sy | 0) - (gy | 0)), start);

  const closed = new Uint8Array(w * h);

  while (heap.n) {
    const cur = heap.pop()!;
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w;
    const cy = (cur / w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      const step = walk[ni]!;
      if (step >= INF) continue;
      const tentative = gScore[cur]! + step;
      if (tentative >= gScore[ni]!) continue;
      came[ni] = cur;
      gScore[ni] = tentative;
      const hcost = Math.abs(nx - (gx | 0)) + Math.abs(ny - (gy | 0));
      heap.push(tentative + hcost, ni);
    }
  }

  if (came[goal] < 0 && start !== goal) return null;

  const path: { x: number; y: number }[] = [];
  let c = goal;
  while (c !== start && c >= 0) {
    path.push({ x: c % w, y: (c / w) | 0 });
    c = came[c]!;
  }
  path.reverse();
  if (path.length === 0) path.push({ x: gx | 0, y: gy | 0 });
  return path;
}

export function nearestWalkable(
  walk: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const ox = Math.max(0, Math.min(w - 1, x | 0));
  const oy = Math.max(0, Math.min(h - 1, y | 0));
  if (walk[oy * w + ox]! < INF) return { x: ox, y: oy };
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = ox + dx;
        const ny = oy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (walk[ny * w + nx]! < INF) return { x: nx, y: ny };
      }
    }
  }
  return null;
}
