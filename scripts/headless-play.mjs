/** Headless campaign play — same actions a manager uses (place, hire, repair, research, test). */
import { DEF_MAP, defById } from "../src/game/catalog.ts";
import { addPiece, isClosed, seedTrack, wouldCrash } from "../src/game/coaster.ts";
import { footprintFree, hireStaff, placeBuilding, placePath } from "../src/game/park.ts";
import { createPark } from "../src/game/park.ts";
import { runAds } from "../src/game/rct.ts";
import { startResearch, tick } from "../src/game/sim.ts";

function findSpot(park, defId, cx, cy) {
  const def = defById(defId);
  let best = null;
  let bestD = 1e9;
  for (let y = 1; y < park.h - def.h; y++) {
    for (let x = 1; x < park.w - def.w; x++) {
      if (!footprintFree(park, def, x, y)) continue;
      let pathAdj = false;
      for (let i = 0; i < def.w; i++) {
        if (park.tiles[y + def.h]?.[x + i]?.kind === "path") pathAdj = true;
        if (park.tiles[y - 1]?.[x + i]?.kind === "path") pathAdj = true;
      }
      for (let j = 0; j < def.h; j++) {
        if (park.tiles[y + j]?.[x - 1]?.kind === "path") pathAdj = true;
        if (park.tiles[y + j]?.[x + def.w]?.kind === "path") pathAdj = true;
      }
      const d = Math.abs(x - cx) + Math.abs(y - cy) - (pathAdj ? 10 : 0);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

function linePath(park, x0, y0, x1, y1) {
  let x = x0;
  let y = y0;
  placePath(park, x, y);
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 90) {
    if (x !== x1) x += Math.sign(x1 - x);
    else y += Math.sign(y1 - y);
    placePath(park, x, y);
  }
}

function connect(park, b) {
  const def = DEF_MAP[b.defId];
  if (!def || def.category === "staff") return;
  const sx = b.x + Math.floor(def.w / 2);
  const sy = Math.min(park.h - 2, b.y + def.h);
  linePath(park, sx, sy, park.entranceX, park.entranceY - 4);
}

function repair(park, b) {
  const d = DEF_MAP[b.defId];
  if (!d || d.category !== "ride") return;
  if (b.broken) {
    const cost = Math.max(40, Math.floor((d.cost ?? 800) * 0.12));
    if (park.cash < cost) return;
    park.cash -= cost;
    b.broken = false;
    b.reliability = Math.max(0.72, b.reliability);
  }
  if (d.kind !== "coaster") b.open = true;
}

function place(park, defId, cx, cy) {
  const spot = findSpot(park, defId, cx, cy);
  if (!spot) return null;
  const b = placeBuilding(park, defId, spot.x, spot.y);
  if (b) connect(park, b);
  return b;
}

function hireOnPath(park, job) {
  for (let y = park.entranceY; y >= 8; y--) {
    const x = park.entranceX;
    if (park.tiles[y]?.[x]?.kind === "path") {
      if (hireStaff(park, job, x, y)) return true;
    }
  }
  return hireStaff(park, job, park.entranceX, park.entranceY);
}

function loopCoaster(b) {
  b.track = seedTrack(b.x, b.y);
  const seq = [
    "str",
    "str",
    "str",
    "str",
    "str",
    "right",
    "str",
    "str",
    "str",
    "str",
    "right",
    "str",
    "str",
    "str",
    "str",
    "str",
    "right",
    "str",
    "str",
    "str",
    "str",
    "right",
  ];
  for (const p of seq) {
    const next = addPiece(b.track, p);
    if (next) b.track = next;
  }
  b.tested = isClosed(b) && !wouldCrash(b);
  b.crashed = !b.tested && isClosed(b);
  b.open = !!b.tested;
}

function outfit(park) {
  const cx = park.entranceX;
  const cy = Math.max(8, park.entranceY - 8);
  for (const b of park.buildings) repair(park, b);
  place(park, "restroom", cx - 2, cy);
  place(park, "dog-cart", cx + 2, cy);
  place(park, "soda-fizz", cx + 3, cy + 1);
  place(park, "candy-floss", cx - 3, cy + 1);
  place(park, "balloon-box", cx, cy + 2);
  place(park, "park-map", cx + 1, cy + 2);
  place(park, "brolly-cart", cx - 1, cy + 2);
  place(park, "bin", cx, cy);
  place(park, "bench", cx + 2, cy - 1);
  place(park, "flower", cx - 2, cy - 1);
  place(park, "lamp", cx + 4, cy);
  place(park, "bandstand", cx - 5, cy - 2);
  if (park.unlocked.includes("teacup-tilt")) place(park, "teacup-tilt", cx + 5, cy - 6);
  if (park.scenarioId === "fernwood") {
    if (park.unlocked.includes("wonder-round")) place(park, "wonder-round", cx - 6, cy - 6);
    if (park.unlocked.includes("bumper-bugs")) place(park, "bumper-bugs", cx + 8, cy - 4);
  }
  hireOnPath(park, "janitor");
  hireOnPath(park, "janitor");
  hireOnPath(park, "mechanic");
  hireOnPath(park, "gardener");
  hireOnPath(park, "entertainer");
  hireOnPath(park, "security");
  runAds(park, 350);
  if (park.scenarioId === "fernwood") startResearch(park, "custom-coaster");
}

function maybeCoaster(park) {
  if (park.scenarioId !== "fernwood") return;
  if (!park.unlocked.includes("custom-coaster")) return;
  if (park.buildings.some((b) => b.defId === "custom-coaster")) return;
  const b = place(park, "custom-coaster", park.entranceX, park.entranceY - 14);
  if (b) loopCoaster(b);
}

function play(id) {
  const t0 = Date.now();
  const park = createPark(id);
  outfit(park);
  const dt = 1 / 30;
  const maxTicks = 24000;
  let i = 0;
  for (; i < maxTicks; i++) {
    maybeCoaster(park);
    tick(park, dt);
    if (park.won || park.lost) break;
  }
  return {
    id,
    ms: Date.now() - t0,
    ticks: i,
    simSec: Math.round(i * dt),
    won: park.won,
    lost: park.lost,
    guests: park.guests.length,
    rating: Math.round(park.rating),
    cash: Math.round(park.cash),
    day: park.day,
    month: park.month,
    research: park.research,
    unlocked: park.unlocked.filter((x) =>
      ["custom-coaster", "sky-ring", "teacup-tilt"].includes(x),
    ),
    objectives: park.objectives.map((o) => `${o.done ? "x" : " "} ${o.id}: ${o.text}`),
    rides: park.buildings
      .filter((b) => DEF_MAP[b.defId]?.category === "ride")
      .map((b) => `${b.name} open=${b.open} broken=${b.broken} tested=${b.tested} track=${b.track?.length ?? 0}`),
  };
}

const hollow = play("hollow");
const fern = play("fernwood");
console.log(JSON.stringify({ hollow, fern }, null, 2));
if (!hollow.won || !fern.won) process.exit(1);
