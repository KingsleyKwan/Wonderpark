import type { Park } from "./types";
import { rebuildWalk } from "./park";
import { EMPTY_BOOKS, ensureRct } from "./rct";

const KEY = "wonderpark-save-v1";
const VERSION = 1;

type Saved = {
  version: number;
  park: Omit<Park, "walk" | "particles" | "helicopter"> & { walk?: never };
};

export function serializePark(park: Park): string {
  const { walk: _w, particles: _p, helicopter: _h, ...rest } = park;
  return JSON.stringify({ version: VERSION, park: rest } satisfies Saved);
}

export function savePark(park: Park) {
  try {
    const blob = serializePark(park);
    localStorage.setItem(KEY + ":bak", localStorage.getItem(KEY) ?? "");
    localStorage.setItem(KEY, blob);
    return true;
  } catch {
    return false;
  }
}

export function loadPark(): Park | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Saved;
    if (!data?.park || typeof data.park.w !== "number") return null;
    const park = data.park as unknown as Park;
    park.particles = [];
    park.helicopter = null;
    park.walk = new Float32Array(park.w * park.h);
    park.trauma = 0;
    for (const row of park.tiles) {
      for (const t of row) {
        t.litter = t.litter ?? 0;
        t.growth = t.growth ?? 0;
      }
    }
    for (const b of park.buildings) {
      b.queue = b.queue ?? [];
      b.riders = b.riders ?? [];
      b.cycleT = b.cycleT ?? 0;
      b.cycleMax = b.cycleMax ?? 0;
      b.animT = b.animT ?? 0;
      b.loadT = b.loadT ?? 0;
      b.moisture = b.moisture ?? 0.6;
      b.smashed = b.smashed ?? false;
    }
    for (const g of park.guests) {
      g.path = g.path ?? [];
      g.pathI = g.pathI ?? 0;
      g.pathGen = g.pathGen ?? park.pathGen;
      g.ridesDone = g.ridesDone ?? [];
      g.speedPref = g.speedPref ?? Math.min(2.1, 0.5 + (g.intensityPref ?? 4) * 0.14);
      g.intensityPref = g.intensityPref ?? 4;
      g.hasMap = g.hasMap ?? false;
      g.vandal = g.vandal ?? false;
      g.umbrella = g.umbrella ?? false;
    }
    park.awards = park.awards ?? [];
    park.loan = park.loan ?? 0;
    park.books = park.books ?? { ...EMPTY_BOOKS };
    park.lastBooks = park.lastBooks ?? null;
    ensureRct(park);
    rebuildWalk(park);
    return park;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
