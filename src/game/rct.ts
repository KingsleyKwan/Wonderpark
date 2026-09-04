import { DEF_MAP } from "./catalog";
import { sceneryScore, uid } from "./park";
import type { Building, Guest, Park, Staff, Weather } from "./types";

export const EMPTY_BOOKS = {
  admissions: 0,
  shops: 0,
  rides: 0,
  wages: 0,
  running: 0,
  photos: 0,
};

export function ensureRct(park: Park) {
  if (!park.weather) park.weather = "sun";
  if (park.weatherT == null) park.weatherT = 8;
  park.awards = park.awards ?? [];
  park.loan = park.loan ?? 0;
  park.books = park.books ?? { ...EMPTY_BOOKS };
  for (const g of park.guests) {
    g.hasMap = g.hasMap ?? false;
    g.vandal = g.vandal ?? false;
    g.umbrella = g.umbrella ?? false;
    g.hasBalloon = g.hasBalloon ?? false;
  }
  park.grassGen = park.grassGen ?? 0;
  park.advertising = park.advertising ?? 1;
  park.adT = park.adT ?? 0;
  for (const row of park.tiles) {
    for (const t of row) t.growth = t.growth ?? 0;
  }
}

export function tickWeather(park: Park, dt: number) {
  park.weatherT -= dt;
  if (park.weatherT <= 0) {
    const roll = Math.random();
    const next: Weather = roll < 0.55 ? "sun" : roll < 0.82 ? "overcast" : "rain";
    park.weather = next;
    park.weatherT = next === "rain" ? 14 + Math.random() * 10 : 22 + Math.random() * 28;
  }
  if (park.weather === "rain" && Math.random() < dt * 18) {
    park.particles.push({
      x: Math.random() * park.w,
      y: Math.random() * park.h,
      z: 16 + Math.random() * 10,
      vx: -1.2,
      vy: 0.4,
      vz: -14,
      life: 0.7,
      max: 0.7,
      color: "#9ec4d4",
      size: 1.6,
      kind: "water",
    });
  }
}

export function growGrass(park: Park, days: number) {
  const rain = park.weather === "rain" ? 1.6 : 1;
  for (let y = 0; y < park.h; y++) {
    for (let x = 0; x < park.w; x++) {
      const t = park.tiles[y]![x]!;
      if (t.kind === "grass") t.growth = Math.min(1, (t.growth ?? 0) + 0.07 * days * rain);
    }
  }
  for (const b of park.buildings) {
    if (DEF_MAP[b.defId]?.kind === "flower" && !b.smashed) {
      if (park.weather === "rain") b.moisture = Math.min(1, (b.moisture ?? 0.6) + 0.18 * days);
      else b.moisture = Math.max(0, (b.moisture ?? 0.6) - 0.12 * days);
    }
  }
}

export function mowAt(park: Park, x: number, y: number, r = 1.6) {
  let cut = 0;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) {
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (yy < 0 || xx < 0 || yy >= park.h || xx >= park.w) continue;
      const t = park.tiles[yy]![xx]!;
      if (t.kind === "grass" && (t.growth ?? 0) > 0.05) {
        t.growth = Math.max(0, (t.growth ?? 0) - 0.55);
        cut++;
      }
    }
  }
  if (cut) {
    park.grassGen = (park.grassGen ?? 0) + 1;
    park.particles.push({
      x,
      y,
      z: 6,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: 4,
      life: 0.7,
      max: 0.7,
      color: "#5c7f62",
      size: 3,
      kind: "leaf",
    });
  }
}

export function longGrassScore(park: Park) {
  let n = 0;
  let g = 0;
  for (let y = 0; y < park.h; y++) {
    for (let x = 0; x < park.w; x++) {
      const t = park.tiles[y]![x]!;
      if (t.kind !== "grass") continue;
      n++;
      if ((t.growth ?? 0) > 0.55) g++;
    }
  }
  return n ? g / n : 0;
}

export function wiltedFlowers(park: Park) {
  return park.buildings.filter((b) => DEF_MAP[b.defId]?.kind === "flower" && !b.smashed && (b.moisture ?? 0) < 0.28)
    .length;
}

export function crowdingAt(park: Park, g: Guest) {
  let n = 0;
  for (const o of park.guests) {
    if (o.id === g.id) continue;
    if (Math.hypot(o.x - g.x, o.y - g.y) < 0.85) n++;
  }
  return n;
}

export function securityNear(park: Park, x: number, y: number, r = 6) {
  return park.staff.some((s) => s.job === "security" && Math.hypot(s.x - x, s.y - y) < r);
}

export function smashNearby(park: Park, g: Guest): Building | null {
  let best: Building | null = null;
  let bestD = 2.2;
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (!d || b.smashed) continue;
    if (d.kind !== "bin" && d.kind !== "bench" && d.kind !== "flower") continue;
    const dist = Math.hypot(g.x - (b.x + 0.5), g.y - (b.y + 0.5));
    if (dist < bestD) {
      bestD = dist;
      best = b;
    }
  }
  return best;
}

export function photoShop(park: Park) {
  return park.buildings.find((b) => DEF_MAP[b.defId]?.product === "photo" && b.open);
}

export function mapShop(park: Park) {
  return park.buildings.find((b) => DEF_MAP[b.defId]?.product === "info" && b.open);
}

export function takeLoan(park: Park, amount = 2000) {
  if (park.loan >= 8000) return false;
  const add = Math.min(amount, 8000 - park.loan);
  park.loan += add;
  park.cash += add;
  park.memos.push({
    id: uid(park),
    from: "Finance",
    title: "A friendly advance",
    body: `The Board has wired $${add}. Interest is 4% a month and they will remember. Do not make them remember twice.`,
    tone: "warn",
  });
  return true;
}

export function runAds(park: Park, spend = 350) {
  if (park.cash < spend) return false;
  park.cash -= spend;
  park.advertising = Math.min(2.2, Math.max(1, park.advertising) + 0.5);
  park.adT = 32;
  park.memos.push({
    id: uid(park),
    from: "Marketing",
    title: "Handbills, everywhere",
    body: `$${spend} of paper has left the building. The gate should thicken until the glue dries. After that, guests remember they have a choice.`,
    tone: "info",
  });
  return true;
}

export function monthlyAwards(park: Park) {
  const names: string[] = [];
  const wilt = wiltedFlowers(park);
  const grass = longGrassScore(park);
  const toilets = park.buildings.filter((b) => DEF_MAP[b.defId]?.product === "toilet").length;
  const sc = sceneryScore(park);
  if (park.rating >= 720 && sc >= 10 && grass < 0.25 && wilt === 0) names.push("Most Beautiful Park");
  if (toilets >= 2 && park.guests.filter((g) => g.bathroom < 0.5).length) names.push("Best Toilets");
  if (park.deaths === 0 && park.injuries < 3) names.push("Safest Park");
  if (park.buildings.some((b) => (DEF_MAP[b.defId]?.intensity ?? 0) * b.speed > 8 && b.customers > 8))
    names.push("Thrill Capital");
  if (park.books.photos >= 6) names.push("Most Photographed");
  const fresh = names.filter((n) => !park.awards.includes(n));
  for (const n of fresh) {
    park.awards.push(n);
    park.cash += 450;
    park.memos.push({
      id: uid(park),
      from: "Awards Desk",
      title: n,
      body: `Wonderpark Worldwide has mailed a plaque and $450. Try not to pawn the plaque.`,
      tone: "good",
    });
  }
}

export function findLongGrass(park: Park): { x: number; y: number; v: number } | null {
  let best = 0.45;
  let spot: { x: number; y: number; v: number } | null = null;
  for (let y = 0; y < park.h; y++) {
    for (let x = 0; x < park.w; x++) {
      const t = park.tiles[y]![x]!;
      if (t.kind !== "grass") continue;
      const v = t.growth ?? 0;
      if (v > best) {
        best = v;
        spot = { x, y, v };
      }
    }
  }
  return spot;
}

export function findThirstyFlower(park: Park): Building | null {
  let best: Building | null = null;
  let bestM = 1;
  for (const b of park.buildings) {
    if (DEF_MAP[b.defId]?.kind !== "flower" || b.smashed) continue;
    const m = b.moisture ?? 0;
    if (m < bestM) {
      bestM = m;
      best = b;
    }
  }
  return bestM < 0.7 ? best : null;
}

export function musicNear(park: Park, x: number, y: number, r = 5) {
  return park.buildings.some((b) => {
    if (b.smashed || DEF_MAP[b.defId]?.kind !== "bandstand") return false;
    return Math.hypot(b.x + 1 - x, b.y + 1 - y) < r;
  });
}

export function staffSeek(s: Staff, park: Park, tx: number, ty: number, arrived: boolean, astarFn: typeof import("./pathfind").astar) {
  if (arrived || !s.path.length) {
    s.path = astarFn(park.walk, park.w, park.h, s.x, s.y, tx, ty) ?? [];
    s.pathI = 0;
  }
}
