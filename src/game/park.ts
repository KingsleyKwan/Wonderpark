import { DEF_MAP, DEFS, MAP, PATH_COST, SCENARIOS, defById, startingUnlocked } from "./catalog";
import type { Building, Def, Park, StaffJob, Tile, TileKind } from "./types";

const INF = 1e8;

function hash(x: number, y: number, s = 1) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 19.19) * 43758.5453;
  return n - Math.floor(n);
}

export function uid(park: Park): string {
  park.nextId += 1;
  return `id-${park.nextId}`;
}

export function inBounds(park: Park, x: number, y: number) {
  return x >= 0 && y >= 0 && x < park.w && y < park.h;
}

export function tileAt(park: Park, x: number, y: number): Tile | null {
  if (!inBounds(park, x, y)) return null;
  return park.tiles[y]![x]!;
}

export function occupiedSet(park: Park): Set<number> {
  const set = new Set<number>();
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (!d || d.category === "staff") continue;
    for (let j = 0; j < d.h; j++) {
      for (let i = 0; i < d.w; i++) {
        set.add((b.y + j) * park.w + (b.x + i));
      }
    }
  }
  return set;
}

export function rebuildWalk(park: Park) {
  const { w, h } = park;
  const occ = occupiedSet(park);
  const walk = park.walk;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = park.tiles[y]![x]!;
      if (t.kind === "water") {
        walk[i] = INF;
        continue;
      }
      if (occ.has(i)) {
        walk[i] = INF;
        continue;
      }
      walk[i] = t.kind === "path" ? 1 : t.kind === "sand" ? 7 : t.kind === "dirt" ? 9 : (t.growth ?? 0) > 0.55 ? 18 : 12;
    }
  }
  park.pathGen += 1;
}

export function footprintFree(park: Park, def: Def, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + def.w > park.w || y + def.h > park.h) return false;
  const occ = occupiedSet(park);
  for (let j = 0; j < def.h; j++) {
    for (let i = 0; i < def.w; i++) {
      const tx = x + i;
      const ty = y + j;
      const t = park.tiles[ty]![tx]!;
      if (t.kind === "water") return false;
      if (occ.has(ty * park.w + tx)) return false;
    }
  }
  return true;
}

export function serviceTile(park: Park, x: number, y: number, def: Def): { x: number; y: number } {
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < def.w; i++) {
    spots.push({ x: x + i, y: y + def.h }, { x: x + i, y: y - 1 });
  }
  for (let j = 0; j < def.h; j++) {
    spots.push({ x: x - 1, y: y + j }, { x: x + def.w, y: y + j });
  }
  const walkable = (c: { x: number; y: number }) =>
    inBounds(park, c.x, c.y) && park.walk[c.y * park.w + c.x]! < INF;
  const isPath = (c: { x: number; y: number }) =>
    walkable(c) && park.tiles[c.y]![c.x]!.kind === "path";
  for (const c of spots) {
    if (isPath(c)) return c;
  }
  for (let r = 2; r <= 6; r++) {
    for (let dy = -r; dy <= def.h + r - 1; dy++) {
      for (let dx = -r; dx <= def.w + r - 1; dx++) {
        if (dx > -r && dx < def.w + r - 1 && dy > -r && dy < def.h + r - 1) continue;
        const c = { x: x + dx, y: y + dy };
        if (isPath(c)) return c;
      }
    }
  }
  const n = nearestPathFrom(park, x + Math.floor(def.w / 2), y + def.h);
  if (n) return n;
  for (const c of spots) {
    if (walkable(c)) return c;
  }
  return { x: x + Math.floor(def.w / 2), y: y + def.h };
}

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function nearestPathFrom(park: Park, x: number, y: number): { x: number; y: number } | null {
  const occ = occupiedSet(park);
  let best: { x: number; y: number } | null = null;
  let bestD = 99;
  for (let r = 0; r <= 7; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(park, nx, ny)) continue;
        if (occ.has(ny * park.w + nx)) continue;
        if (park.tiles[ny]![nx]!.kind !== "path") continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < bestD) {
          bestD = d;
          best = { x: nx, y: ny };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function queueLine(park: Park, b: Building, need: number): { x: number; y: number }[] {
  const occ = occupiedSet(park);
  const def = DEF_MAP[b.defId];
  const cx = b.x + (def?.w ?? 2) / 2;
  const cy = b.y + (def?.h ?? 2) / 2;
  const isRoad = (tx: number, ty: number) => {
    if (!inBounds(park, tx, ty)) return false;
    if (occ.has(ty * park.w + tx)) return false;
    return park.tiles[ty]![tx]!.kind === "path";
  };
  let sx = b.serviceX;
  let sy = b.serviceY;
  if (!isRoad(sx, sy)) {
    const n = nearestPathFrom(park, sx, sy);
    if (n) {
      sx = n.x;
      sy = n.y;
    }
  }
  const line: { x: number; y: number }[] = [{ x: sx, y: sy }];
  const used = new Set([sy * park.w + sx]);
  while (line.length < need) {
    const cur = line[line.length - 1]!;
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    for (const [dx, dy] of DIRS4) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!isRoad(nx, ny) || used.has(ny * park.w + nx)) continue;
      const score = Math.hypot(nx + 0.5 - cx, ny + 0.5 - cy);
      if (score > bestScore) {
        bestScore = score;
        best = { x: nx, y: ny };
      }
    }
    if (!best) break;
    used.add(best.y * park.w + best.x);
    line.push(best);
  }
  return line;
}

/** World position for a queued guest — always on path, never on the ride. */
export function queueSlot(park: Park, b: Building, index: number): { x: number; y: number } {
  const tiles = queueLine(park, b, Math.floor(index / 2) + 3);
  const ti = Math.min(Math.max(0, Math.floor(index / 2)), tiles.length - 1);
  const t = tiles[ti] ?? { x: b.serviceX, y: b.serviceY };
  const nxt = tiles[Math.min(ti + 1, tiles.length - 1)] ?? t;
  const prev = tiles[Math.max(ti - 1, 0)] ?? t;
  let dx = nxt.x - prev.x;
  let dy = nxt.y - prev.y;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L;
  dy /= L;
  const along = index % 2 === 0 ? -0.2 : 0.2;
  return { x: t.x + 0.5 + dx * along, y: t.y + 0.5 + dy * along };
}

export function refreshServices(park: Park) {
  for (const b of park.buildings) {
    const def = DEF_MAP[b.defId];
    if (!def || def.category === "staff") continue;
    const s = serviceTile(park, b.x, b.y, def);
    b.serviceX = s.x;
    b.serviceY = s.y;
  }
}

export function placeBuilding(park: Park, defId: string, x: number, y: number): Building | null {
  const def = defById(defId);
  if (def.category === "staff") return null;
  if (!footprintFree(park, def, x, y)) return null;
  if (park.cash < def.cost) return null;
  park.cash -= def.cost;
  const svc = serviceTile(park, x, y, def);
  const b: Building = {
    id: uid(park),
    defId,
    x,
    y,
    name: def.name,
    open: def.category === "scenery" ? true : def.kind !== "coaster",
    tested: def.kind !== "coaster",
    broken: false,
    reliability: def.reliability ?? 1,
    price: def.priceDefault ?? (def.category === "ride" ? Math.max(2, Math.round(def.excitement ?? 2)) : 0),
    speed: 1,
    duration: def.duration ?? 8,
    queue: [],
    riders: [],
    cycleT: 0,
    cycleMax: 0,
    animT: 0,
    loadT: 0,
    customers: 0,
    profit: 0,
    serviceX: svc.x,
    serviceY: svc.y,
    moisture: def.kind === "flower" ? 1 : undefined,
    smashed: false,
  };
  if (def.kind === "coaster") {
    b.open = false;
    b.tested = false;
    b.track = [];
  }
  park.buildings.push(b);
  rebuildWalk(park);
  b.serviceX = serviceTile(park, x, y, def).x;
  b.serviceY = serviceTile(park, x, y, def).y;
  return b;
}

export function placePath(park: Park, x: number, y: number): boolean {
  const t = tileAt(park, x, y);
  if (!t || t.kind === "water" || t.kind === "path") return false;
  const occ = occupiedSet(park);
  if (occ.has(y * park.w + x)) return false;
  if (park.cash < PATH_COST) return false;
  park.cash -= PATH_COST;
  t.kind = "path";
  rebuildWalk(park);
  refreshServices(park);
  return true;
}

export function demolishAt(park: Park, x: number, y: number): boolean {
  const t = tileAt(park, x, y);
  if (!t) return false;
  const b = park.buildings.find((bb) => {
    const d = DEF_MAP[bb.defId];
    if (!d || d.category === "staff") return false;
    return x >= bb.x && y >= bb.y && x < bb.x + d.w && y < bb.y + d.h;
  });
  if (b) {
    const def = defById(b.defId);
    park.buildings = park.buildings.filter((x) => x.id !== b.id);
    park.cash += Math.floor(def.cost * 0.45);
    rebuildWalk(park);
    refreshServices(park);
    return true;
  }
  if (t.kind === "path") {
    t.kind = park.biome === "forest" ? "grass" : "dirt";
    park.cash += Math.floor(PATH_COST * 0.4);
    rebuildWalk(park);
    refreshServices(park);
    return true;
  }
  return false;
}

export function hireStaff(park: Park, defId: string, x: number, y: number): boolean {
  const def = defById(defId);
  if (def.category !== "staff") return false;
  if (!inBounds(park, x, y)) return false;
  if (park.walk[y * park.w + x]! >= INF) return false;
  if (park.cash < def.cost) return false;
  park.cash -= def.cost;
  park.staff.push({
    id: uid(park),
    job: defId as StaffJob,
    x: x + 0.5,
    y: y + 0.5,
    path: [],
    pathI: 0,
    busy: 0,
  });
  return true;
}

function paintRoad(park: Park, x0: number, y0: number, x1: number, y1: number) {
  let x = x0;
  let y = y0;
  const occ = occupiedSet(park);
  const stamp = (tx: number, ty: number) => {
    if (!inBounds(park, tx, ty)) return;
    if (occ.has(ty * park.w + tx)) return;
    const t = park.tiles[ty]![tx]!;
    if (t.kind === "water") return;
    t.kind = "path";
  };
  stamp(x, y);
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 80) {
    if (x !== x1) x += Math.sign(x1 - x);
    else y += Math.sign(y1 - y);
    stamp(x, y);
  }
}

function paintBlob(tiles: Tile[][], w: number, h: number, cx: number, cy: number, r: number, kind: TileKind) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r + hash(x, y, 3) * 1.6) tiles[y]![x]!.kind = kind;
    }
  }
}

function creek(tiles: Tile[][], w: number, h: number) {
  let x = 4;
  for (let y = 0; y < h; y++) {
    x += (hash(y, 2, 9) - 0.5) * 1.4;
    x = Math.max(2, Math.min(w - 8, x));
    const width = 1.4 + hash(y, 4, 2);
    for (let i = -2; i <= 3; i++) {
      const tx = Math.round(x + i);
      if (tx >= 0 && tx < w && Math.abs(i) <= width + 0.4) {
        tiles[y]![tx]!.kind = "water";
      }
    }
    if (txShore(tiles, w, Math.round(x) + 3, y)) {
      /* keep dirt banks */
    }
  }
}

function txShore(tiles: Tile[][], w: number, x: number, y: number) {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= tiles.length) continue;
    const t = tiles[ny]![nx]!;
    if (t.kind === "grass") t.kind = "sand";
  }
  return true;
}

function scatterTrees(park: Park, count: number, pineRatio: number) {
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < 800) {
    const x = 2 + Math.floor(hash(n, guard, 1) * (park.w - 4));
    const y = 2 + Math.floor(hash(n, guard, 2) * (park.h - 4));
    const t = park.tiles[y]![x]!;
    if (t.kind === "water" || t.kind === "path") continue;
    const defId = hash(x, y, 7) < pineRatio ? "pine" : "oak";
    const def = defById(defId);
    if (!footprintFree(park, def, x, y)) continue;
    const b = placeBuilding(park, defId, x, y);
    if (b) {
      park.cash += def.cost;
      n++;
    }
  }
}

export function createPark(scenarioId: string): Park {
  const sc = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
  const w = MAP;
  const h = MAP;
  const tiles: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      const n = hash(x, y, 1);
      let kind: TileKind = sc.biome === "forest" ? "grass" : n > 0.72 ? "dirt" : "grass";
      row.push({ kind, litter: 0, growth: hash(x, y, 4) * 0.2 });
    }
    tiles.push(row);
  }

  if (sc.biome === "creek") {
    creek(tiles, w, h);
    paintBlob(tiles, w, h, 22, 10, 3.2, "dirt");
    paintBlob(tiles, w, h, 28, 24, 2.4, "dirt");
  } else {
    paintBlob(tiles, w, h, 8, 8, 4.5, "water");
    paintBlob(tiles, w, h, 7, 9, 2.2, "sand");
    paintBlob(tiles, w, h, 26, 28, 2.8, "dirt");
  }

  const entranceX = Math.floor(w / 2);
  const entranceY = h - 2;
  for (let y = entranceY; y >= entranceY - 10; y--) {
    if (y < 0) break;
    for (let i = y >= entranceY - 3 ? -1 : 0; i <= (y >= entranceY - 3 ? 1 : 0); i++) {
      const t = tiles[y]![entranceX + i];
      if (t && t.kind !== "water") t.kind = "path";
    }
  }

  const park: Park = {
    scenarioId: sc.id,
    biome: sc.biome,
    w,
    h,
    tiles,
    cash: sc.cash,
    day: 1,
    dayT: 0,
    month: 3,
    year: 1999,
    rating: 380,
    admissions: 0,
    guests: [],
    buildings: [],
    staff: [],
    particles: [],
    memos: [],
    seenMemos: [],
    objectives: sc.objectives.map((o) => ({ ...o, done: false })),
    unlocked: startingUnlocked(),
    research: null,
    advertising: 1,
    adT: 0,
    spawnAcc: 0,
    deaths: 0,
    injuries: 0,
    pathGen: 0,
    trauma: 0,
    entranceX,
    entranceY,
    walk: new Float32Array(w * h),
    helicopter: null,
    won: false,
    lost: false,
    ticks: 0,
    nextId: 1,
    weather: "sun",
    weatherT: 12,
    awards: [],
    loan: 0,
    books: { admissions: 0, shops: 0, rides: 0, wages: 0, running: 0, photos: 0 },
    lastBooks: null,
  };

  rebuildWalk(park);

  if (sc.biome === "creek") {
    const bx = 16;
    const by = 18;
    if (footprintFree(park, defById("wonder-round"), bx, by)) {
      const b = placeBuilding(park, "wonder-round", bx, by);
      if (b) {
        park.cash += defById("wonder-round").cost;
        b.open = false;
        b.broken = true;
        b.reliability = 0.18;
        b.name = "Heritage Round";
      }
    }
    if (footprintFree(park, defById("bumper-bugs"), 21, 15)) {
      const bumper = placeBuilding(park, "bumper-bugs", 21, 15);
      if (bumper) {
        park.cash += defById("bumper-bugs").cost;
        bumper.open = false;
        bumper.broken = true;
        bumper.reliability = 0.22;
        bumper.name = "Idle Bugs";
      }
    }
    if (footprintFree(park, defById("lamp"), 18, 32)) {
      const lamp = placeBuilding(park, "lamp", 18, 32);
      if (lamp) park.cash += defById("lamp").cost;
    }
    paintRoad(park, entranceX, entranceY - 10, 17, 22);
    paintRoad(park, 17, 22, 20, 18);
  }

  scatterTrees(park, sc.biome === "forest" ? 28 : 16, sc.biome === "forest" ? 0.65 : 0.25);

  rebuildWalk(park);
  for (const b of park.buildings) {
    const def = DEF_MAP[b.defId];
    if (!def || def.category === "staff") continue;
    const s = serviceTile(park, b.x, b.y, def);
    b.serviceX = s.x;
    b.serviceY = s.y;
  }
  return park;
}

export function sceneryScore(park: Park): number {
  let n = 0;
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (d?.category === "scenery" && !b.smashed) n++;
  }
  return n;
}

export function pathCoverage(park: Park): number {
  let p = 0;
  for (let y = 0; y < park.h; y++) {
    for (let x = 0; x < park.w; x++) {
      if (park.tiles[y]![x]!.kind === "path") p++;
    }
  }
  return p / (park.w * park.h);
}

export function researchable(park: Park): Def[] {
  return DEFS.filter(
    (d) => !park.unlocked.includes(d.id) && (d.researchCost ?? 0) > 0,
  );
}
