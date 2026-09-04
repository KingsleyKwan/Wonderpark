import type { Building, TrackNode } from "./types";

export function nextCell(n: TrackNode): { x: number; y: number; dir: number } {
  const dir = n.dir & 3;
  const dx = [0, 1, 0, -1][dir]!;
  const dy = [-1, 0, 1, 0][dir]!;
  return { x: n.x + dx, y: n.y + dy, dir };
}

export function addPiece(track: TrackNode[], piece: TrackNode["piece"]): TrackNode[] | null {
  if (!track.length) return null;
  const last = track[track.length - 1]!;
  let dir = last.dir;
  let z = last.z;
  if (piece === "left") dir = (dir + 3) & 3;
  if (piece === "right") dir = (dir + 1) & 3;
  if (piece === "up") z = Math.min(8, z + 1);
  if (piece === "down") z = Math.max(0, z - 1);
  if (piece === "loop") z = Math.min(8, z + 1);
  const n = nextCell({ ...last, dir });
  const node: TrackNode = { x: n.x, y: n.y, z: piece === "loop" ? z : z, dir, piece };
  if (track.some((t) => t.x === node.x && t.y === node.y && Math.abs(t.z - node.z) < 0.2 && piece !== "loop")) {
    if (piece !== "loop") return null;
  }
  return [...track, node];
}

export function seedTrack(stationX: number, stationY: number): TrackNode[] {
  return [{ x: stationX + 2, y: stationY, z: 1, dir: 1, piece: "str" }];
}

export function coasterStats(b: Building) {
  const track = b.track ?? [];
  const len = track.length;
  let drops = 0;
  let maxZ = 0;
  let inversions = 0;
  let air = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]!;
    const c = track[i]!;
    maxZ = Math.max(maxZ, c.z);
    if (c.z < a.z) {
      drops += a.z - c.z;
      air += a.z - c.z;
    }
    if (c.piece === "loop") inversions += 1;
    if (c.piece === "left" || c.piece === "right") air += 0.15;
  }
  const closed = isClosed(b);
  const speed = b.speed;
  const excitement = Math.min(
    9.6,
    (len * 0.12 + drops * 0.85 + inversions * 1.6 + maxZ * 0.35 + (closed ? 1.2 : 0)) * (0.7 + speed * 0.28),
  );
  const intensity = Math.min(10, (drops * 0.7 + inversions * 1.8 + speed * 2.2 + maxZ * 0.4) * 0.55);
  const nausea = Math.min(10, inversions * 1.4 + speed * 1.1 + drops * 0.25);
  return { len, drops, maxZ, inversions, closed, excitement, intensity, nausea, air };
}

export function isClosed(b: Building) {
  const track = b.track ?? [];
  if (track.length < 8) return false;
  const last = track[track.length - 1]!;
  return Math.abs(last.x - (b.x + 0)) + Math.abs(last.y - b.y) <= 2 && last.z <= 2;
}

export function followTrack(track: TrackNode[], t: number): { x: number; y: number; z: number; yaw: number } {
  if (!track.length) return { x: 0, y: 0, z: 0, yaw: 0 };
  const u = ((t % track.length) + track.length) % track.length;
  const i = Math.floor(u);
  const f = u - i;
  const a = track[i]!;
  const c = track[(i + 1) % track.length] ?? a;
  return {
    x: a.x + (c.x - a.x) * f + 0.5,
    y: a.y + (c.y - a.y) * f + 0.5,
    z: a.z + (c.z - a.z) * f,
    yaw: a.dir * (Math.PI / 2),
  };
}

export function wouldCrash(b: Building) {
  const s = coasterStats(b);
  return !s.closed || s.intensity * b.speed > 11.5;
}
