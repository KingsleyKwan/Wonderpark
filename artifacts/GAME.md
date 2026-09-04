# Wonderpark — shared project bible

**Version:** 0.4.2 (2026-09-04)  
**GitHub (canonical, every chat edits here):** https://github.com/KingsleyKwan/Wonderpark  
**Live source in this sandbox:** `/workspace/src/game/`  
**Stack:** TanStack Start + React 19 + three.js isometric. Auth/db OFF. Preview `:8080`.

This Grok project is **Wonderpark**, an RCT / Wonderworks-style park tycoon.
Do **not** mix 燒中翼 / BBQ mid-wing into this tree. BBQ automations in the same
account are a different product and stay paused.

---

## How every project chat shares this

1. **GitHub** `KingsleyKwan/Wonderpark` is the single source of truth. Clone or
   pull it at the start of a chat if `/workspace/src/game/version.ts` is missing
   or is a different game. Push after every shippable change.
2. **This file** (`/workspace/artifacts/GAME.md`) is mounted into every
   conversation under this Grok project. Keep the backlog and hourly log current.
3. Both this chat and other chats **edit and publish** the same app. Bump
   `GAME_VERSION` in `src/game/version.ts` on every ship.

If the sandbox looks empty:

```
gh repo clone KingsleyKwan/Wonderpark /tmp/wonderpark
cp -a /tmp/wonderpark/src /tmp/wonderpark/public /tmp/wonderpark/artifacts /workspace/
```

Then `npm install` if needed and `sh /workspace/startup.sh`.

---

## File map

| Path | Role |
|---|---|
| `src/game/sim.ts` | Tick, guests, rides, staff, rating |
| `src/game/rct.ts` | Weather, grass, mow, crowding, security, maps, photos, loan, awards |
| `src/game/park.ts` | Create park, path/queue geometry, hire/place |
| `src/game/catalog.ts` | Rides, stalls, scenery, staff defs |
| `src/game/types.ts` | Park / Guest / Staff / Tile |
| `src/game/scene3d.ts` | Isometric three.js view |
| `src/game/models3d.ts` | Building meshes |
| `src/game/save.ts` | localStorage + migrate |
| `src/game/version.ts` | `GAME_VERSION` |
| `src/components/game/*` | Title, HUD, inspector, handbook, park screen |
| `artifacts/GAME.md` | This bible |

---

## Hourly automation findings (ingested 2026-09-04)

The Grok automation **Keep improve the RCT** (`8d97a951-9185-4a06-92a4-07981e231bd5`)
shipped these in *other* sandboxes. They never landed here until 0.4.0.
Later runs died with `USAGE_POOL_EXHAUSTED`. Schedule is **paused**.

Shipped into this tree in **0.4.0–0.4.1**:

| Automation title | What it became |
|---|---|
| New RCT grass mowing | Tile `growth`. Groundskeepers + Flower Hands `mowAt`. Long grass slows guests and hurts rating. |
| RCT Crowding & Security | `crowdingAt` happiness/speed penalty. Staff job `security` (Park Watch). |
| RCT Park Maps & Guest Preferences | Map Kiosk (`product: info`) sets `guest.hasMap`. Maps shrink distance penalty on ride pick. Taste/speed prefs already in 0.3.x. |
| New weather, photos & finance | Sun / overcast / rain. Flash Hut photos after a matching ride. Monthly books. Board loan $2,000 @ 4%/month. |
| RCT Awards & Flower Watering | Monthly plaques + $450. Flower `moisture`. Flower Hand waters. Rain waters. Wilt hurts rating. |
| RCT: Vandalism & goals | ~7% of guests `vandal`. Smash benches/bins/flowers unless Park Watch is near. |
| RCT Music, Value & Scenery Boosts | Bandstand nearby happiness. Ride pick penalises bad value (price vs excitement). Smashed scenery drops score. |
| RCT queues, umbrellas & loans | Queues already snake on **path** (0.3.3). Brolly Cart in rain. Pause-menu loan. |
| RCT2: Entertainers & Rain Added | **0.4.1** Jester staff performs in crowds. Rain: guests seek indoor stalls/haunt; umbrellas are 3D cones. |
| RCT game updated with paths | Already in 0.3.x / 0.3.3 queues-on-path. |
| RollerCoaster Tycoon Features Added / RCT Features Added! | Core loop already present. **0.4.1** handbills (advertising) + Ridewright inspects before breakdown. |

Out of scope (do not ingest):

- `siu-wing-hourly-review` / `燒中翼 hourly review` / `Automate Generate BBQ Chicken Wing` — different game.
- `有冇平去日本嘅機票?` — flights, not this park.

---

## Backlog

Shipped

1. [x] 3D buildings (not flat pads)
2. [x] Version on title
3. [x] Desktop / phone layout switch
4. [x] Guests follow paths; round-based rides; taste + speed prefs
5. [x] Win overlay can close (Resume)
6. [x] Queues stand on path, never on the ride
7. [x] Ingest hourly RCT automations (0.4.0)
8. [x] Shared GitHub repo + this bible
9. [x] Visible grass stripe on mow (`grassGen` rebuilds tiles)
10. [x] 3D umbrellas in rain
11. [x] Ridewright inspects before a ride dies
12. [x] Handbills $350 from the pause menu
16. [x] Balloon held after Balloon Box
17. [x] Research is per park; new assignment does not inherit lab unlocks

Next (pick from the top)

13. [ ] Coaster builder undo + on-track camera
14. [ ] Park rating history sparkline in the pause books
15. [ ] Save slot name + two parks

---

## Hourly review log

- 2026-09-02 — automation ships in discarded sandboxes (grass, crowding, maps, weather, awards, vandalism, music, umbrellas, research, bins).
- 2026-09-03 — RCT automation quota exhausted; schedule paused.
- 2026-09-04 10:44 HKT — this chat ingested all RCT findings into live Wonderpark **0.4.0**, wrote this bible, published https://github.com/KingsleyKwan/Wonderpark so every project chat can edit and publish.
- 2026-09-04 12:00 HKT — **0.4.1** remaining RCT titles: Jester entertainers, indoor rain + 3D umbrellas, live grass mow stripe, Ridewright inspect, handbills, balloons. BBQ/flights automations still out of scope.
- 2026-09-04 12:30 HKT — **0.4.2** research leak: lab unlocks were surviving into a new assignment via the single save slot. New posting now replaces the save, starter blueprints only. Not a feature.

---

## Play loop (do not break)

Guests enter at the gate, walk **paths**, queue **on the path** at `serviceTile`,
board a **round**, unload. Each guest has `intensityPref` + `speedPref`.
Rides are not always-on. Research spends days and stays on **that** park.
A new assignment starts from starter blueprints only. Auth/db stay off.
