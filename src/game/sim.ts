import { DAYS_PER_MONTH, DAY_SECONDS, DEF_MAP, defById, isStarterBlueprint } from "./catalog";
import { guestName, MEMOS, pickThought } from "./names";
import { queueSlot, sceneryScore, uid, rebuildWalk } from "./park";
import { astar, nearestWalkable } from "./pathfind";
import {
  crowdingAt,
  EMPTY_BOOKS,
  ensureRct,
  findLongGrass,
  findThirstyFlower,
  growGrass,
  longGrassScore,
  mapShop,
  monthlyAwards,
  mowAt,
  musicNear,
  photoShop,
  securityNear,
  smashNearby,
  tickWeather,
  wiltedFlowers,
} from "./rct";
import type { Building, Guest, Memo, Park, Particle, Staff } from "./types";
import { coasterStats, wouldCrash } from "./coaster";

const SHIRTS = ["#c24a3a", "#3d8b6e", "#2a3342", "#c9923a", "#5c7f62", "#6b4a32", "#e8dcc4", "#3d6b8b"];
const GENTLE_SHIRTS = ["#e8dcc4", "#8a9a8a", "#5c7f62", "#3d6b8b", "#c4b49a"];
const THRILL_SHIRTS = ["#c24a3a", "#c9923a", "#d45a2a", "#e8c84a", "#8b2a2a"];

function rand(_park: Park) {
  return Math.random();
}

export function pushMemo(park: Park, key: keyof typeof MEMOS) {
  if (park.seenMemos.includes(key)) return;
  park.seenMemos.push(key);
  const m = MEMOS[key];
  const memo: Memo = { id: uid(park), from: m.from, title: m.title, body: m.body, tone: m.tone };
  park.memos.push(memo);
}

export function spawnParticle(park: Park, p: Omit<Particle, "max"> & { max?: number }) {
  if (park.particles.length > 220) park.particles.shift();
  park.particles.push({ ...p, max: p.max ?? p.life });
}

function think(g: Guest, kind: Parameters<typeof pickThought>[0], park: Park) {
  if (g.thoughtT > 0.6) return;
  g.thought = pickThought(kind, (g.x * 13 + g.y * 7 + park.day) | 0);
  g.thoughtT = 3.2 + rand(park) * 1.4;
}

function spawnGuest(park: Park) {
  if (park.guests.length >= 140) return;
  const id = uid(park);
  const seed = park.nextId * 97;
  const roll = rand(park);
  let intensityPref: number;
  let speedPref: number;
  let shirt: string;
  let hat: number;
  if (roll < 0.34) {
    intensityPref = 1.5 + rand(park) * 2.4;
    speedPref = 0.52 + rand(park) * 0.48;
    shirt = GENTLE_SHIRTS[seed % GENTLE_SHIRTS.length]!;
    hat = seed % 2;
  } else if (roll < 0.72) {
    intensityPref = 3.8 + rand(park) * 2.8;
    speedPref = 0.88 + rand(park) * 0.52;
    shirt = SHIRTS[seed % SHIRTS.length]!;
    hat = 1 + (seed % 2);
  } else {
    intensityPref = 6.2 + rand(park) * 3.2;
    speedPref = 1.35 + rand(park) * 0.8;
    shirt = THRILL_SHIRTS[seed % THRILL_SHIRTS.length]!;
    hat = 3 + (seed % 2);
  }
  const g: Guest = {
    id,
    name: guestName(seed),
    x: park.entranceX + 0.5,
    y: park.entranceY + 0.5,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rot: 0,
    path: [],
    pathI: 0,
    happiness: 0.62 + rand(park) * 0.2,
    energy: 0.85,
    hunger: rand(park) * 0.25,
    thirst: rand(park) * 0.2,
    bathroom: rand(park) * 0.15,
    nausea: 0,
    cash: 18 + rand(park) * 28,
    intensityPref,
    speedPref,
    patience: 0.7 + rand(park) * 0.3,
    thought: "The gate looks promising.",
    thoughtT: 0,
    state: "enter",
    shirt,
    hat,
    ridesDone: [],
    eaten: false,
    pathGen: 0,
    hasMap: rand(park) < 0.22,
    vandal: rand(park) < 0.07,
    umbrella: false,
    hasBalloon: false,
  };
  think(g, guestTaste(g), park);
  park.guests.push(g);
  park.admissions += 1;
  park.cash += 4;
  park.books.admissions += 4;
  spawnParticle(park, {
    x: g.x,
    y: g.y,
    z: 18,
    vx: 0,
    vy: 0,
    vz: 8,
    life: 0.8,
    color: "#3d8b6e",
    size: 10,
    kind: "text",
    text: "+$4",
  });
  if (park.admissions === 1) pushMemo(park, "first_guest");
}

function setPath(park: Park, g: Guest, tx: number, ty: number) {
  const start = nearestWalkable(park.walk, park.w, park.h, g.x, g.y);
  const goal = nearestWalkable(park.walk, park.w, park.h, tx, ty);
  if (!start || !goal) {
    g.path = [];
    return;
  }
  const path = astar(park.walk, park.w, park.h, start.x, start.y, goal.x, goal.y);
  g.path = path ?? [];
  g.pathI = 0;
  g.pathGen = park.pathGen;
}

function followPath(g: Guest, dt: number, speed: number): boolean {
  if (!g.path.length || g.pathI >= g.path.length) return true;
  const node = g.path[g.pathI]!;
  const tx = node.x + 0.5;
  const ty = node.y + 0.5;
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.08) {
    g.pathI += 1;
    return g.pathI >= g.path.length;
  }
  const sp = speed * dt;
  g.x += (dx / d) * Math.min(sp, d);
  g.y += (dy / d) * Math.min(sp, d);
  g.rot = Math.atan2(dy, dx);
  return false;
}

function tileKind(park: Park, x: number, y: number) {
  const tx = Math.max(0, Math.min(park.w - 1, x | 0));
  const ty = Math.max(0, Math.min(park.h - 1, y | 0));
  return park.tiles[ty]![tx]!.kind;
}

function walkSpeed(park: Park, g: Guest) {
  const k = tileKind(park, g.x, g.y);
  let base = k === "path" ? 1.85 : k === "sand" ? 0.62 : 0.48;
  const t = park.tiles[Math.max(0, Math.min(park.h - 1, g.y | 0))]![Math.max(0, Math.min(park.w - 1, g.x | 0))]!;
  if (k === "grass" && (t.growth ?? 0) > 0.55) base *= 0.72;
  if (park.weather === "rain" && !g.umbrella) base *= 0.68;
  if (crowdingAt(park, g) >= 3) base *= 0.82;
  return base * (0.75 + g.energy * 0.4);
}

function shopsOf(park: Park, product: string) {
  return park.buildings.filter((b) => {
    const d = DEF_MAP[b.defId];
    return d?.category === "shop" && d.product === product && b.open && !b.broken;
  });
}

function openRides(park: Park) {
  return park.buildings.filter((b) => {
    const d = DEF_MAP[b.defId];
    return d?.category === "ride" && b.open && !b.broken && b.tested;
  });
}

function pickRide(park: Park, g: Guest): Building | null {
  let best: Building | null = null;
  let bestS = -1e9;
  const rides = openRides(park);
  for (const b of rides) {
    const d = DEF_MAP[b.defId]!;
    const intensity = rideIntensity(b, d);
    const typeGap = intensity - g.intensityPref;
    const speedGap = b.speed - g.speedPref;
    if (typeGap > 2.6 || speedGap > 0.72) continue;
    if (g.cash < b.price) continue;
    const times = g.ridesDone.filter((id) => id === b.id).length;
    if (times >= 4) continue;
    if (typeGap < -4.6 && rides.length > 1) continue;
    const dist = Math.hypot(b.serviceX - g.x, b.serviceY - g.y) * (g.hasMap ? 0.45 : 1.15);
    const wait = b.queue.length;
    const valueGap = b.price - (d.excitement ?? 3) * 1.4;
    let score =
      (d.excitement ?? 3) * 10 -
      dist * 0.65 -
      wait * 2.1 -
      times * 7 -
      Math.abs(typeGap) * 3.4 -
      Math.abs(speedGap) * 16 -
      Math.max(0, valueGap) * 4 +
      rand(park) * 2.5;
    if (park.weather === "rain" && !g.umbrella) {
      if (d.kind === "haunt") score += 14;
      if (d.kind === "flume" || d.kind === "drop" || d.kind === "ship") score -= 7;
    }
    if (score > bestS) {
      bestS = score;
      best = b;
    }
  }
  return best;
}

export type TasteKind = "gentle" | "steady" | "thrill";

export function guestTaste(g: { intensityPref: number }): TasteKind {
  if (g.intensityPref < 4) return "gentle";
  if (g.intensityPref < 6.8) return "steady";
  return "thrill";
}

export function tasteLabel(g: Guest): string {
  const t = guestTaste(g);
  const nerve = t === "gentle" ? "Gentle" : t === "steady" ? "Steady" : "Thrill";
  const spd =
    g.speedPref < 0.95 ? "likes it slow" : g.speedPref < 1.4 ? "likes a moderate clip" : "wants it loud";
  return `${nerve} · ${spd}`;
}

export type RideFit = "want" | "fast" | "slow";

export function rideFit(g: Guest, b: Building, d: { intensity?: number }): RideFit {
  const intensity = rideIntensity(b, d);
  const typeGap = intensity - g.intensityPref;
  const speedGap = b.speed - (g.speedPref ?? 1);
  if (typeGap > 2.5 || speedGap > 0.7) return "fast";
  if (typeGap < -3.8 || speedGap < -0.55) return "slow";
  return "want";
}

export function rideAudience(park: Park, b: Building) {
  const d = DEF_MAP[b.defId];
  let want = 0;
  let tooFast = 0;
  let tooSlow = 0;
  if (!d) return { want, tooFast, tooSlow };
  for (const g of park.guests) {
    if (g.state === "flying" || g.state === "injured" || g.state === "leave") continue;
    if (g.cash < b.price) continue;
    const f = rideFit(g, b, d);
    if (f === "want") want += 1;
    else if (f === "fast") tooFast += 1;
    else tooSlow += 1;
  }
  return { want, tooFast, tooSlow };
}

export function rideIntensity(b: Building, d: { intensity?: number }) {
  return (d.intensity ?? 3) * (0.55 + b.speed * 0.7);
}

export function rideExcitement(b: Building, d: { excitement?: number; kind?: string }) {
  let e = (d.excitement ?? 3) * (0.7 + b.speed * 0.25);
  if (d.kind === "coaster" && b.track) {
    const s = coasterStats(b);
    e = s.excitement;
  }
  return e;
}

function launchGuest(park: Park, g: Guest, power: number) {
  g.state = "flying";
  g.z = 4;
  g.vz = 9 + power * 4;
  g.vx = (rand(park) - 0.5) * 6;
  g.vy = (rand(park) - 0.5) * 6;
  g.targetId = undefined;
  g.path = [];
  g.happiness = Math.max(0, g.happiness - 0.35);
  think(g, "fly", park);
  park.trauma = Math.min(1, park.trauma + 0.55);
  park.injuries += 1;
  for (let i = 0; i < 10; i++) {
    spawnParticle(park, {
      x: g.x,
      y: g.y,
      z: 8,
      vx: (rand(park) - 0.5) * 8,
      vy: (rand(park) - 0.5) * 8,
      vz: 6 + rand(park) * 8,
      life: 0.7 + rand(park) * 0.4,
      color: i % 2 ? "#c24a3a" : "#f3ead7",
      size: 3 + rand(park) * 3,
      kind: "spark",
    });
  }
  if (!park.helicopter) {
    park.helicopter = { x: g.x - 18, y: g.y - 18, z: 80, t: 0, phase: "in", targetId: g.id };
  }
  pushMemo(park, "airborne");
}

function updateFlying(park: Park, g: Guest, dt: number) {
  g.vz -= 18 * dt;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  g.z += g.vz * dt;
  g.rot += dt * 6;
  if (g.z <= 0) {
    g.z = 0;
    g.vx = 0;
    g.vy = 0;
    g.vz = 0;
    const water = tileKind(park, g.x, g.y) === "water";
    if (water || rand(park) < 0.12) {
      killGuest(park, g, water ? "The creek collects another story." : "The landing was not in the manual.");
      return;
    }
    g.state = "injured";
    g.happiness = Math.min(g.happiness, 0.2);
    g.thought = "I would like a medic. Or a lawyer.";
    g.thoughtT = 4;
  }
}

function killGuest(park: Park, g: Guest, note: string) {
  park.guests = park.guests.filter((x) => x.id !== g.id);
  park.deaths += 1;
  park.cash -= 400;
  park.rating = Math.max(80, park.rating - 70);
  g.thought = note;
  spawnParticle(park, {
    x: g.x,
    y: g.y,
    z: 14,
    vx: 0,
    vy: 0,
    vz: 6,
    life: 1.4,
    color: "#c24a3a",
    size: 11,
    kind: "text",
    text: "-$400",
  });
  pushMemo(park, "death");
  if (park.deaths >= 5) losePark(park);
}

function losePark(park: Park) {
  if (park.lost || park.won) return;
  park.lost = true;
  pushMemo(park, "seized");
}

function rideReady(b: Building, d: { capacity?: number }) {
  if (b.riders.length > 0 || b.cycleT > 0) return false;
  if (b.queue.length === 0) return false;
  const cap = d.capacity ?? 6;
  const minLoad = Math.min(3, cap);
  if (b.queue.length >= minLoad) return true;
  return b.loadT > 3.8;
}

function boardRide(park: Park, b: Building) {
  const d = DEF_MAP[b.defId]!;
  const cap = d.capacity ?? 6;
  while (b.riders.length < cap && b.queue.length) {
    const id = b.queue.shift()!;
    const g = park.guests.find((x) => x.id === id);
    if (!g || g.state === "flying") continue;
    if (g.cash < b.price) {
      g.state = "wander";
      g.targetId = undefined;
      continue;
    }
    g.cash -= b.price;
    park.cash += b.price;
    park.books.rides += b.price;
    b.profit += b.price;
    b.customers += 1;
    g.state = "ride";
    g.targetId = b.id;
    g.path = [];
    g.x = b.x + d.w * 0.5;
    g.y = b.y + d.h * 0.5;
    b.riders.push(g.id);
    spawnParticle(park, {
      x: b.x + 0.5,
      y: b.y + 0.5,
      z: 20,
      vx: 0,
      vy: 0,
      vz: 10,
      life: 0.7,
      color: "#3d8b6e",
      size: 10,
      kind: "text",
      text: `+$${b.price.toFixed(0)}`,
    });
  }
  if (b.riders.length) {
    b.cycleMax = b.duration / Math.max(0.45, b.speed);
    b.cycleT = b.cycleMax;
    if (d.kind === "coaster") b.trainT = 0;
  }
}

function finishRide(park: Park, b: Building) {
  const d = DEF_MAP[b.defId]!;
  const intensity = rideIntensity(b, d);
  const nauseaAdd = ((d.nausea ?? 1) * b.speed) / 12;
  const excite = rideExcitement(b, d);
  for (const id of b.riders) {
    const g = park.guests.find((x) => x.id === id);
    if (!g) continue;
    g.nausea = Math.min(1, g.nausea + nauseaAdd);
    g.energy -= 0.08;
    const typeGap = intensity - g.intensityPref;
    const speedGap = b.speed - g.speedPref;
    const match = Math.abs(speedGap) < 0.42 && Math.abs(typeGap) < 2.4;
    g.happiness = Math.min(
      1,
      g.happiness +
        excite * 0.03 +
        (match ? 0.14 : 0) -
        Math.max(0, typeGap) * 0.05 -
        Math.max(0, speedGap) * 0.1 -
        Math.max(0, -speedGap) * 0.045,
    );
    g.ridesDone.push(b.id);
    g.x = b.serviceX + 0.5;
    g.y = b.serviceY + 0.5;
    const snap = photoShop(park);
    if (snap && match && g.cash >= snap.price) {
      g.targetId = snap.id;
      g.state = "wander";
      setPath(park, g, snap.serviceX, snap.serviceY);
    } else {
      g.state = "wander";
      g.targetId = undefined;
    }
    if (typeGap > 3.2 && b.speed > 1.35 && speedGap > 0.45 && rand(park) < 0.26 + (b.speed - 1) * 0.22) {
      launchGuest(park, g, b.speed);
    } else if (g.nausea > 0.75 || typeGap > 2.8) {
      think(g, "sick", park);
      g.happiness -= 0.06;
    } else if (speedGap > 0.55) {
      think(g, "tooFast", park);
    } else if (speedGap < -0.5 || typeGap < -3.2) {
      think(g, "tooSlow", park);
    } else {
      think(g, "match", park);
    }
  }
  b.riders = [];
  b.cycleT = 0.55;
  b.cycleMax = 0;
  b.loadT = 0;
  b.reliability -= 0.012 * b.speed;
  if (b.reliability < 0.18 && rand(park) < 0.35) {
    b.broken = true;
    b.open = false;
    pushMemo(park, "first_break");
    park.trauma = Math.min(1, park.trauma + 0.2);
    spawnParticle(park, {
      x: b.x + 0.5,
      y: b.y + 0.5,
      z: 24,
      vx: 0,
      vy: 0,
      vz: 4,
      life: 1.2,
      color: "#c9923a",
      size: 12,
      kind: "text",
      text: "BROKEN",
    });
  }
}

function updateRide(park: Park, b: Building, dt: number) {
  const d = DEF_MAP[b.defId];
  if (!d || d.category !== "ride") return;
  if (b.broken || !b.open) {
    b.loadT = 0;
    return;
  }
  if (b.cycleT > 0 && b.riders.length) {
    b.cycleT -= dt;
    b.animT += dt * b.speed;
    if (d.kind === "coaster") {
      b.trainT = (b.trainT ?? 0) + dt * b.speed * 0.22;
      if (wouldCrash(b) && (b.trainT ?? 0) > 0.25) b.crashed = true;
      if (b.crashed) {
        for (const id of [...b.riders]) {
          const g = park.guests.find((x) => x.id === id);
          if (g) launchGuest(park, g, 1.6);
        }
        b.riders = [];
        b.broken = true;
        b.open = false;
        b.crashed = false;
        return;
      }
    }
    if (b.cycleT <= 0) finishRide(park, b);
    return;
  }
  b.cycleT = Math.max(0, b.cycleT - dt);
  if (b.queue.length) b.loadT += dt;
  else b.loadT = 0;
  if (rideReady(b, d)) {
    boardRide(park, b);
    b.loadT = 0;
  }
}

function serveShop(park: Park, b: Building, g: Guest) {
  const d = DEF_MAP[b.defId]!;
  const price = b.price;
  if (d.product !== "toilet" && d.product !== "aid" && g.cash < price) {
    g.state = "wander";
    g.targetId = undefined;
    g.thought = "I cannot afford this park.";
    g.thoughtT = 2.5;
    return;
  }
  if (d.product !== "toilet" && d.product !== "aid") {
    g.cash -= price;
    park.cash += price;
    b.profit += price;
    park.books.shops += price;
    spawnParticle(park, {
      x: g.x,
      y: g.y,
      z: 16,
      vx: 0,
      vy: 0,
      vz: 8,
      life: 0.7,
      color: "#3d8b6e",
      size: 10,
      kind: "text",
      text: `+$${price.toFixed(0)}`,
    });
  }
  b.customers += 1;
  if (d.product === "food" || d.product === "sugar") {
    g.hunger = Math.max(0, g.hunger - 0.7);
    g.happiness += 0.08;
    g.eaten = true;
    g.bathroom += 0.12;
    const lx = Math.max(0, Math.min(park.w - 1, g.x | 0));
    const ly = Math.max(0, Math.min(park.h - 1, g.y | 0));
    park.tiles[ly]![lx]!.litter += 0.35;
  } else if (d.product === "drink") {
    g.thirst = Math.max(0, g.thirst - 0.8);
    g.happiness += 0.06;
    g.bathroom += 0.18;
  } else if (d.product === "toilet") {
    g.bathroom = 0;
    g.happiness += 0.12;
  } else if (d.product === "aid") {
    g.nausea = Math.max(0, g.nausea - 0.6);
    if (g.state === "injured") g.state = "wander";
    g.happiness += 0.1;
  } else if (d.product === "balloon" || d.product === "souvenir") {
    g.happiness += 0.14;
    if (d.product === "balloon") g.hasBalloon = true;
  } else if (d.product === "info") {
    g.hasMap = true;
    g.happiness += 0.1;
    think(g, "map", park);
  } else if (d.product === "photo") {
    g.happiness += 0.16;
    park.books.photos += 1;
    think(g, "photo", park);
  } else if (d.product === "umbrella") {
    g.umbrella = true;
    g.happiness += 0.08;
    think(g, "rain", park);
  }
  g.state = "wander";
  g.targetId = undefined;
}

function pickPathTile(park: Park, g: Guest): { x: number; y: number } | null {
  const paths: { x: number; y: number }[] = [];
  for (let y = 1; y < park.h - 1; y++) {
    for (let x = 1; x < park.w - 1; x++) {
      if (park.tiles[y]![x]!.kind === "path") paths.push({ x, y });
    }
  }
  if (!paths.length) return null;
  const i = (Math.abs((g.name.length * 17 + park.ticks + (g.x | 0) * 3) | 0) % paths.length);
  return paths[i]!;
}

function chooseGoal(park: Park, g: Guest) {
  if (g.bathroom > 0.78) {
    const t = shopsOf(park, "toilet");
    if (!t.length) {
      think(g, "toilet", park);
      g.happiness -= 0.04;
      if (g.bathroom > 0.95) {
        g.state = "leave";
        setPath(park, g, park.entranceX, park.entranceY);
        return;
      }
    } else {
      const s = t[0]!;
      g.targetId = s.id;
      g.state = "wander";
      setPath(park, g, s.serviceX, s.serviceY);
      return;
    }
  }
  if (g.hunger > 0.72) {
    const t = [...shopsOf(park, "food"), ...shopsOf(park, "sugar")];
    if (!t.length) think(g, "hungry", park);
    else {
      const s = t[(g.name.length + park.day) % t.length]!;
      g.targetId = s.id;
      setPath(park, g, s.serviceX, s.serviceY);
      return;
    }
  }
  if (g.thirst > 0.72) {
    const t = shopsOf(park, "drink");
    if (t.length) {
      const s = t[0]!;
      g.targetId = s.id;
      setPath(park, g, s.serviceX, s.serviceY);
      return;
    }
    think(g, "thirsty", park);
  }
  if (park.weather === "rain" && !g.umbrella) {
    const t = shopsOf(park, "umbrella").filter((s) => g.cash >= s.price);
    if (t.length) {
      const s = t[0]!;
      g.targetId = s.id;
      g.state = "wander";
      setPath(park, g, s.serviceX, s.serviceY);
      think(g, "rain", park);
      return;
    }
    think(g, "rain", park);
    g.happiness -= 0.02;
    const cover = park.buildings.filter((b) => {
      const d = DEF_MAP[b.defId];
      return d && b.open && !b.broken && (d.category === "shop" || d.kind === "haunt" || d.product === "toilet" || d.product === "aid");
    });
    if (cover.length) {
      const s = cover.reduce((a, b) =>
        Math.hypot(a.serviceX - g.x, a.serviceY - g.y) < Math.hypot(b.serviceX - g.x, b.serviceY - g.y) ? a : b,
      );
      g.targetId = s.id;
      g.state = "wander";
      setPath(park, g, s.serviceX, s.serviceY);
      return;
    }
  }
  if (!g.hasMap) {
    const kiosk = mapShop(park);
    if (kiosk && g.cash >= kiosk.price && rand(park) < 0.42) {
      g.targetId = kiosk.id;
      g.state = "wander";
      setPath(park, g, kiosk.serviceX, kiosk.serviceY);
      return;
    }
  }
  if (g.happiness < 0.22 || g.energy < 0.12 || g.cash < 2) {
    g.state = "leave";
    think(g, "angry", park);
    setPath(park, g, park.entranceX, park.entranceY);
    return;
  }
  const ride = pickRide(park, g);
  if (ride) {
    g.targetId = ride.id;
    if (g.state === "enter") g.state = "wander";
    setPath(park, g, ride.serviceX, ride.serviceY);
    return;
  }
  if (openRides(park).length) think(g, "refuse", park);
  const pathTile = pickPathTile(park, g);
  if (pathTile) {
    g.targetId = undefined;
    setPath(park, g, pathTile.x, pathTile.y);
    if (tileKind(park, g.x, g.y) !== "path") think(g, "lost", park);
    return;
  }
  const wanderX = 2 + rand(park) * (park.w - 4);
  const wanderY = 2 + rand(park) * (park.h - 4);
  setPath(park, g, wanderX, wanderY);
  if (tileKind(park, g.x, g.y) !== "path") think(g, "lost", park);
}

function updateGuest(park: Park, g: Guest, dt: number) {
  g.thoughtT = Math.max(0, g.thoughtT - dt);
  g.hunger = Math.min(1, g.hunger + dt * 0.016);
  g.thirst = Math.min(1, g.thirst + dt * 0.014);
  g.bathroom = Math.min(1, g.bathroom + dt * 0.01);
  g.energy = Math.max(0, g.energy - dt * 0.008);
  g.nausea = Math.max(0, g.nausea - dt * 0.02);
  if (tileKind(park, g.x, g.y) !== "path") g.happiness -= dt * 0.01;
  const tile = park.tiles[Math.max(0, Math.min(park.h - 1, g.y | 0))]![Math.max(0, Math.min(park.w - 1, g.x | 0))]!;
  const litter = tile.litter;
  if (litter > 0.6) {
    g.happiness -= dt * 0.02;
    if (g.thoughtT <= 0) think(g, "litter", park);
  }
  if ((tile.growth ?? 0) > 0.6 && tile.kind === "grass") {
    g.happiness -= dt * 0.016;
    if (g.thoughtT <= 0) think(g, "grass", park);
  }
  const crowd = crowdingAt(park, g);
  if (crowd >= 2) {
    g.happiness -= dt * 0.018 * crowd;
    if (g.thoughtT <= 0) think(g, "crowd", park);
  }
  if (park.weather === "rain") {
    g.happiness -= g.umbrella ? dt * 0.004 : dt * 0.022;
    if (!g.umbrella && g.thoughtT <= 0) think(g, "rain", park);
  }
  if (musicNear(park, g.x, g.y)) {
    g.happiness = Math.min(1, g.happiness + dt * 0.035);
    if (g.thoughtT <= 0) think(g, "music", park);
  }
  if (g.vandal && g.happiness < 0.48 && rand(park) < dt * 0.12) {
    if (securityNear(park, g.x, g.y, 5.5)) {
      g.vandal = false;
      g.thought = "The uniform has opinions.";
      g.thoughtT = 2.8;
    } else {
      const mark = smashNearby(park, g);
      if (mark) {
        mark.smashed = true;
        g.happiness += 0.04;
        think(g, "vandal", park);
        spawnParticle(park, {
          x: mark.x + 0.5,
          y: mark.y + 0.5,
          z: 10,
          vx: 0,
          vy: 0,
          vz: 5,
          life: 1,
          color: "#c24a3a",
          size: 10,
          kind: "text",
          text: "SMASH",
        });
        pushMemo(park, "vandal");
      }
    }
  }

  if (g.state === "flying") {
    updateFlying(park, g, dt);
    return;
  }
  if (g.state === "injured") {
    g.happiness = Math.max(0.05, g.happiness - dt * 0.02);
    return;
  }
  if (g.state === "ride") return;

  if ((g.state === "wander" || g.state === "enter" || g.state === "leave") && g.pathGen !== park.pathGen && g.path.length) {
    if (g.state === "leave") setPath(park, g, park.entranceX, park.entranceY);
    else if (g.targetId) {
      const b = park.buildings.find((x) => x.id === g.targetId);
      if (b) setPath(park, g, b.serviceX, b.serviceY);
    }
  }

  if (g.state === "queue") {
    const b = park.buildings.find((x) => x.id === g.targetId);
    if (!b || b.broken || !b.open) {
      g.state = "wander";
      g.targetId = undefined;
      return;
    }
    const idx = b.queue.indexOf(g.id);
    g.happiness -= dt * 0.012 * (1.2 - g.patience);
    if (idx < 0) {
      g.state = "wander";
      g.targetId = undefined;
      return;
    }
    const d = DEF_MAP[b.defId];
    const slot = queueSlot(park, b, Math.max(0, idx));
    const dist = Math.hypot(g.x - slot.x, g.y - slot.y);
    if (dist > 0.9) {
      const tx = Math.floor(slot.x);
      const ty = Math.floor(slot.y);
      const last = g.path[g.path.length - 1];
      if (!last || last.x !== tx || last.y !== ty) setPath(park, g, tx, ty);
      followPath(g, dt, walkSpeed(park, g));
    } else {
      g.path = [];
      g.x += (slot.x - g.x) * Math.min(1, dt * 5);
      g.y += (slot.y - g.y) * Math.min(1, dt * 5);
    }
    const ix = Math.floor(g.x);
    const iy = Math.floor(g.y);
    const onRide =
      d &&
      ix >= b.x &&
      iy >= b.y &&
      ix < b.x + d.w &&
      iy < b.y + d.h;
    const onPath = park.tiles[iy]?.[ix]?.kind === "path";
    if (onRide || !onPath) {
      g.x = slot.x;
      g.y = slot.y;
    }
    g.rot = Math.atan2(b.y + (d?.h ?? 2) / 2 - g.y, b.x + (d?.w ?? 2) / 2 - g.x);
    if (d && rideFit(g, b, d) === "fast") {
      b.queue = b.queue.filter((id) => id !== g.id);
      g.state = "wander";
      g.targetId = undefined;
      think(g, "tooFast", park);
      g.happiness -= 0.04;
      return;
    }
    if (g.thoughtT <= 0) think(g, "happy", park);
    if (g.happiness < 0.18) {
      b.queue = b.queue.filter((id) => id !== g.id);
      g.state = "leave";
      setPath(park, g, park.entranceX, park.entranceY);
    }
    return;
  }

  const arrived = followPath(g, dt, walkSpeed(park, g));
  if (!arrived && g.path.length) return;

  if (g.state === "leave") {
    if (Math.hypot(g.x - park.entranceX, g.y - park.entranceY) < 1.4) {
      park.guests = park.guests.filter((x) => x.id !== g.id);
    } else setPath(park, g, park.entranceX, park.entranceY);
    return;
  }

  if (g.targetId) {
    const b = park.buildings.find((x) => x.id === g.targetId);
    if (!b) {
      g.targetId = undefined;
      return;
    }
    const d = DEF_MAP[b.defId]!;
    const slot0 = queueSlot(park, b, 0);
    if (Math.hypot(g.x - slot0.x, g.y - slot0.y) < 1.45) {
      if (d.category === "ride") {
        if (!b.open || b.broken || !b.tested) {
          g.targetId = undefined;
          chooseGoal(park, g);
          return;
        }
        const fit = rideFit(g, b, d);
        if (fit === "fast") {
          g.targetId = undefined;
          think(g, "tooFast", park);
          chooseGoal(park, g);
          return;
        }
        if (!b.queue.includes(g.id)) b.queue.push(g.id);
        g.state = "queue";
        think(g, fit === "slow" ? "tooSlow" : "happy", park);
        return;
      }
      if (d.category === "shop") {
        serveShop(park, b, g);
        return;
      }
    }
  }
  chooseGoal(park, g);
}

function staffSpeed(s: Staff) {
  return s.job === "mascot" || s.job === "entertainer" ? 1.12 : 1.55;
}

function updateStaff(park: Park, s: Staff, dt: number) {
  s.busy = Math.max(0, s.busy - dt);
  if (s.busy <= 0) s.mowing = false;
  if (s.job === "mascot" || s.job === "entertainer") {
    const performing = s.job === "entertainer" && s.busy > 0;
    const r = performing ? 4.2 : 2.4;
    const rate = performing ? 0.09 : 0.05;
    for (const g of park.guests) {
      if (Math.hypot(g.x - s.x, g.y - s.y) < r) g.happiness = Math.min(1, g.happiness + dt * rate);
    }
    if (performing && Math.random() < dt * 6) {
      spawnParticle(park, {
        x: s.x,
        y: s.y,
        z: 10,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        vz: 6,
        life: 0.6,
        color: Math.random() > 0.5 ? "#e8c84a" : "#c24a3a",
        size: 3,
        kind: "spark",
      });
    }
  }
  if (s.busy > 0) return;

  const arrived = s.path.length ? followStaff(s, dt, staffSpeed(s)) : true;

  if (s.job === "janitor") {
    let best = -1;
    let bx = s.x | 0;
    let by = s.y | 0;
    for (let y = 0; y < park.h; y++) {
      for (let x = 0; x < park.w; x++) {
        const lit = park.tiles[y]![x]!.litter;
        if (lit > best) {
          best = lit;
          bx = x;
          by = y;
        }
      }
    }
    if (best > 0.08) {
      if (arrived && Math.hypot(s.x - bx - 0.5, s.y - by - 0.5) < 0.7) {
        park.tiles[by]![bx]!.litter = Math.max(0, park.tiles[by]![bx]!.litter - 0.6);
        s.busy = 0.4;
      } else if (!s.path.length || arrived) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, bx, by);
        s.path = path ?? [];
        s.pathI = 0;
      }
    } else {
      const grass = findLongGrass(park);
      if (grass) {
        if (Math.hypot(s.x - grass.x - 0.5, s.y - grass.y - 0.5) < 1.3) {
          mowAt(park, s.x, s.y, 1.8);
          s.mowing = true;
          s.busy = 0.3;
        } else if (!s.path.length || arrived) {
          const path = astar(park.walk, park.w, park.h, s.x, s.y, grass.x, grass.y);
          s.path = path ?? [];
          s.pathI = 0;
        }
      }
    }
  } else if (s.job === "mechanic") {
    const broken = park.buildings.find((b) => b.broken);
    const weary =
      !broken &&
      park.buildings
        .filter((b) => DEF_MAP[b.defId]?.category === "ride" && !b.broken && b.reliability < 0.62)
        .sort((a, b) => a.reliability - b.reliability)[0];
    const target = broken ?? weary;
    if (target) {
      const d = DEF_MAP[target.defId]!;
      const tx = target.x + d.w / 2;
      const ty = target.y + d.h / 2;
      if (Math.hypot(s.x - tx, s.y - ty) < 1.4) {
        target.reliability = Math.min(1, target.reliability + dt * (broken ? 0.25 : 0.14));
        if (broken && target.reliability > 0.72) {
          target.broken = false;
          target.open = true;
          s.busy = 0.6;
        } else if (!broken) s.busy = 0.45;
      } else if (arrived || !s.path.length) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, target.serviceX, target.serviceY);
        s.path = path ?? [];
        s.pathI = 0;
      }
    }
  } else if (s.job === "mascot") {
    if (arrived || !s.path.length) {
      const path = astar(
        park.walk,
        park.w,
        park.h,
        s.x,
        s.y,
        4 + Math.random() * (park.w - 8),
        4 + Math.random() * (park.h - 8),
      );
      s.path = path ?? [];
      s.pathI = 0;
    }
  } else if (s.job === "entertainer") {
    let cluster: { x: number; y: number } | null = null;
    let bestN = 1;
    for (const g of park.guests) {
      if (g.state === "flying" || g.state === "leave") continue;
      let n = 0;
      for (const o of park.guests) {
        if (Math.hypot(o.x - g.x, o.y - g.y) < 3.2) n++;
      }
      if (n > bestN) {
        bestN = n;
        cluster = g;
      }
    }
    if (cluster) {
      if (Math.hypot(s.x - cluster.x, s.y - cluster.y) < 1.7) {
        s.busy = 3.4;
      } else if (arrived || !s.path.length) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, cluster.x, cluster.y);
        s.path = path ?? [];
        s.pathI = 0;
      }
    } else if (arrived || !s.path.length) {
      const path = astar(
        park.walk,
        park.w,
        park.h,
        s.x,
        s.y,
        4 + Math.random() * (park.w - 8),
        4 + Math.random() * (park.h - 8),
      );
      s.path = path ?? [];
      s.pathI = 0;
    }
  } else if (s.job === "medic") {
    const hurt = park.guests.find((g) => g.state === "injured");
    if (hurt) {
      if (Math.hypot(s.x - hurt.x, s.y - hurt.y) < 0.9) {
        hurt.state = "wander";
        hurt.nausea = 0.1;
        hurt.happiness = Math.min(1, hurt.happiness + 0.2);
        hurt.thought = "I have been professionally reassembled.";
        hurt.thoughtT = 3;
        s.busy = 1.2;
      } else if (arrived || !s.path.length) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, hurt.x, hurt.y);
        s.path = path ?? [];
        s.pathI = 0;
      }
    }
  } else if (s.job === "gardener") {
    const flower = findThirstyFlower(park);
    if (flower) {
      const tx = flower.x + 0.5;
      const ty = flower.y + 0.5;
      if (Math.hypot(s.x - tx, s.y - ty) < 1.15) {
        flower.moisture = Math.min(1, (flower.moisture ?? 0) + 0.55);
        s.busy = 0.45;
      } else if (arrived || !s.path.length) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, flower.x, flower.y);
        s.path = path ?? [];
        s.pathI = 0;
      }
    } else {
      const grass = findLongGrass(park);
      if (grass) {
        if (Math.hypot(s.x - grass.x - 0.5, s.y - grass.y - 0.5) < 1.2) {
          mowAt(park, s.x, s.y);
          s.mowing = true;
          s.busy = 0.32;
        } else if (arrived || !s.path.length) {
          const path = astar(park.walk, park.w, park.h, s.x, s.y, grass.x, grass.y);
          s.path = path ?? [];
          s.pathI = 0;
        }
      }
    }
  } else if (s.job === "security") {
    const vandal = park.guests.find((g) => g.vandal && Math.hypot(g.x - s.x, g.y - s.y) < 16);
    if (vandal) {
      if (Math.hypot(s.x - vandal.x, s.y - vandal.y) < 1.15) {
        vandal.vandal = false;
        vandal.thought = "The uniform has opinions.";
        vandal.thoughtT = 3;
        vandal.happiness = Math.max(0.12, vandal.happiness - 0.08);
        s.busy = 1.3;
      } else if (arrived || !s.path.length) {
        const path = astar(park.walk, park.w, park.h, s.x, s.y, vandal.x, vandal.y);
        s.path = path ?? [];
        s.pathI = 0;
      }
    } else if (arrived || !s.path.length) {
      const path = astar(
        park.walk,
        park.w,
        park.h,
        s.x,
        s.y,
        3 + Math.random() * (park.w - 6),
        3 + Math.random() * (park.h - 6),
      );
      s.path = path ?? [];
      s.pathI = 0;
    }
  }
}

function followStaff(s: Staff, dt: number, speed: number) {
  if (!s.path.length || s.pathI >= s.path.length) return true;
  const node = s.path[s.pathI]!;
  const tx = node.x + 0.5;
  const ty = node.y + 0.5;
  const dx = tx - s.x;
  const dy = ty - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.1) {
    s.pathI += 1;
    return s.pathI >= s.path.length;
  }
  const sp = speed * dt;
  s.x += (dx / d) * Math.min(sp, d);
  s.y += (dy / d) * Math.min(sp, d);
  return false;
}

function updateHelicopter(park: Park, dt: number) {
  const h = park.helicopter;
  if (!h) return;
  h.t += dt;
  const g = park.guests.find((x) => x.id === h.targetId);
  const tx = g ? g.x : h.x + 4;
  const ty = g ? g.y : h.y + 4;
  if (h.phase === "in") {
    h.x += (tx - h.x) * Math.min(1, dt * 1.4);
    h.y += (ty - h.y) * Math.min(1, dt * 1.4);
    h.z += (28 - h.z) * Math.min(1, dt * 1.2);
    if (Math.hypot(h.x - tx, h.y - ty) < 0.8) h.phase = "hover";
  } else if (h.phase === "hover") {
    h.z += (10 - h.z) * Math.min(1, dt * 2);
    if (g && (g.state === "flying" || g.state === "injured") && h.z < 14) {
      park.guests = park.guests.filter((x) => x.id !== g.id);
      park.cash -= 180;
      spawnParticle(park, {
        x: h.x,
        y: h.y,
        z: 20,
        vx: 0,
        vy: 0,
        vz: 6,
        life: 1,
        color: "#c9923a",
        size: 11,
        kind: "text",
        text: "AIRLIFT -$180",
      });
      h.phase = "out";
    } else if (h.t > 6) h.phase = "out";
  } else {
    h.z += dt * 22;
    h.x -= dt * 6;
    h.y -= dt * 4;
    if (h.z > 90) park.helicopter = null;
  }
}

function updateParticles(park: Park, dt: number) {
  for (const p of park.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= 12 * dt;
  }
  park.particles = park.particles.filter((p) => p.life > 0);
}

function recomputeRating(park: Park) {
  const guests = park.guests;
  const hap = guests.length ? guests.reduce((a, g) => a + g.happiness, 0) / guests.length : 0.4;
  let rideScore = 0;
  let toilets = 0;
  let food = 0;
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (!d) continue;
    if (d.category === "ride" && b.open && !b.broken) rideScore += rideExcitement(b, d) * 8 + b.customers * 0.15;
    if (d.product === "toilet") toilets += 1;
    if (d.product === "food" || d.product === "sugar") food += 1;
  }
  let litter = 0;
  for (let y = 0; y < park.h; y++) for (let x = 0; x < park.w; x++) litter += park.tiles[y]![x]!.litter;
  const sc = sceneryScore(park);
  const grass = longGrassScore(park);
  const wilt = wiltedFlowers(park);
  const smashed = park.buildings.filter((b) => b.smashed).length;
  const target =
    220 +
    hap * 280 +
    Math.min(220, rideScore) +
    Math.min(80, sc * 3) +
    Math.min(60, toilets * 28) +
    Math.min(40, food * 14) +
    Math.min(50, park.guests.length * 0.7) -
    Math.min(70, litter * 5) -
    park.deaths * 55 -
    park.injuries * 8 -
    Math.min(55, grass * 90) -
    wilt * 14 -
    smashed * 18 +
    Math.min(40, park.awards.length * 8);
  park.rating += (target - park.rating) * 0.08;
  park.rating = Math.max(40, Math.min(999, park.rating));
}

function checkObjectives(park: Park) {
  const hasPath = park.tiles[park.entranceY - 3]?.[park.entranceX]?.kind === "path";
  let toilets = 0;
  let food = 0;
  let openRide = false;
  let coasterOk = false;
  let trees = 0;
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (!d) continue;
    if (d.product === "toilet") toilets++;
    if (d.product === "food" || d.product === "sugar") food++;
    if (d.category === "ride" && b.open && !b.broken) openRide = true;
    if (d.kind === "coaster" && b.tested && (b.track?.length ?? 0) > 6) coasterOk = true;
    if (d.kind === "tree" || d.kind === "pine") trees++;
  }
  park.peakGuests = Math.max(park.peakGuests ?? 0, park.guests.length);
  const guestNeed = park.scenarioId === "fernwood" ? 55 : 40;
  const ratingNeed = park.scenarioId === "fernwood" ? 700 : 600;
  for (const o of park.objectives) {
    if (o.done) continue;
    if (o.id === "path" && hasPath) o.done = true;
    if (o.id === "toilet" && toilets > 0) o.done = true;
    if (o.id === "food" && food > 0) o.done = true;
    if (o.id === "ride" && openRide) o.done = true;
    if (o.id === "guests" && park.peakGuests >= guestNeed) o.done = true;
    if (o.id === "rating" && park.rating >= ratingNeed) o.done = true;
    if (o.id === "trees" && trees >= 12) o.done = true;
    if (o.id === "coaster" && coasterOk) o.done = true;
    if (o.id === "profit" && park.cash >= 8000) o.done = true;
  }
  if (!park.won && park.objectives.every((o) => o.done)) {
    park.won = true;
    pushMemo(park, "win");
  }
}

function monthTick(park: Park) {
  let wages = 0;
  for (const s of park.staff) {
    const d = DEF_MAP[s.job];
    wages += d?.wage ?? 50;
  }
  let running = 0;
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (d?.runningCost && b.open) running += d.runningCost;
  }
  park.cash -= wages + running;
  park.books.wages += wages;
  park.books.running += running;
  if (park.loan > 0) {
    const interest = Math.ceil(park.loan * 0.04);
    park.cash -= interest;
    const pay = Math.min(park.loan, park.cash > 400 ? 250 : 0);
    park.cash -= pay;
    park.loan = Math.max(0, park.loan - pay);
  }
  park.lastBooks = { ...park.books };
  park.books = { ...EMPTY_BOOKS };
  monthlyAwards(park);
  spawnParticle(park, {
    x: park.entranceX,
    y: park.entranceY,
    z: 30,
    vx: 0,
    vy: 0,
    vz: 4,
    life: 1.4,
    color: "#c24a3a",
    size: 12,
    kind: "text",
    text: `WAGES -$${wages + running}`,
  });
  if (park.cash < -500) losePark(park);
  if (park.rating < 160 && park.guests.length === 0 && park.day > 12) losePark(park);
}

function dayTick(park: Park) {
  growGrass(park, 1);
  rebuildWalk(park);
  if (park.research) {
    park.research.left -= 1;
    if (park.research.left <= 0) {
      const id = park.research.defId;
      if (!park.unlocked.includes(id) && !isStarterBlueprint(id)) {
        park.unlocked.push(id);
      }
      const name = defById(id).name;
      park.research = null;
      park.memos.push({
        id: uid(park),
        from: "Research",
        title: "Blueprint released",
        body: `${name} is cleared for construction. Try not to over-tune it on day one.`,
        tone: "good",
      });
    }
  }
}

export function ridePhase(b: Building): "broken" | "closed" | "running" | "loading" | "unloading" | "idle" {
  if (b.broken) return "broken";
  if (!b.open) return "closed";
  if (b.riders.length > 0 && b.cycleT > 0) return "running";
  if (b.cycleT > 0) return "unloading";
  if (b.queue.length > 0) return "loading";
  return "idle";
}

export function startResearch(park: Park, defId: string): boolean {
  if (park.research) return false;
  const d = DEF_MAP[defId];
  if (!d || isStarterBlueprint(defId) || park.unlocked.includes(defId)) return false;
  const cost = d.researchCost ?? 0;
  if (cost <= 0 || park.cash < cost) return false;
  park.cash -= cost;
  park.research = { defId, left: d.researchDays ?? 3 };
  return true;
}

export function tick(park: Park, dt: number) {
  ensureRct(park);
  park.ticks += 1;
  park.dayT += dt;
  tickWeather(park, dt);
  if (park.dayT >= DAY_SECONDS) {
    park.dayT = 0;
    park.day += 1;
    dayTick(park);
    if (park.day > DAYS_PER_MONTH) {
      park.day = 1;
      park.month += 1;
      if (park.month > 12) {
        park.month = 1;
        park.year += 1;
      }
      monthTick(park);
    }
  }

  const weatherMul = park.weather === "rain" ? 0.55 : park.weather === "overcast" ? 0.82 : 1;
  if (park.adT > 0) {
    park.adT -= dt;
    if (park.adT <= 0) {
      park.adT = 0;
      park.advertising = 1;
    }
  }
  const spawnRate =
    (0.32 + (park.rating / 1000) * 0.7) * park.advertising * (park.lost ? 0 : 1) * weatherMul +
    (openRides(park).length > 0 ? 0.18 : 0);
  park.spawnAcc += dt * spawnRate;
  while (park.spawnAcc >= 1) {
    park.spawnAcc -= 1;
    spawnGuest(park);
  }

  for (const g of [...park.guests]) updateGuest(park, g, dt);
  for (const b of park.buildings) updateRide(park, b, dt);
  for (const s of park.staff) updateStaff(park, s, dt);
  updateHelicopter(park, dt);
  updateParticles(park, dt);
  park.trauma = Math.max(0, park.trauma - dt * 1.4);
  if (park.ticks % 40 === 0) {
    let fade = false;
    for (let y = 0; y < park.h; y++) {
      for (let x = 0; x < park.w; x++) {
        const t = park.tiles[y]![x]!;
        if ((t.fresh ?? 0) > 0) {
          t.fresh = Math.max(0, (t.fresh ?? 0) - 0.28);
          fade = true;
        }
      }
    }
    if (fade) park.grassGen = (park.grassGen ?? 0) + 1;
  }
  if (park.ticks % 8 === 0) {
    recomputeRating(park);
    checkObjectives(park);
  }

  if (park.biome === "forest" && Math.random() < dt * 0.8) {
    spawnParticle(park, {
      x: Math.random() * park.w,
      y: Math.random() * park.h,
      z: 20 + Math.random() * 20,
      vx: -0.4,
      vy: 0.2,
      vz: -2,
      life: 2.5,
      color: "#5c7f62",
      size: 2,
      kind: "leaf",
    });
  }
}
