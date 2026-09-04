# Wonderpark

An RCT / Wonderworks-style isometric park tycoon. Guests queue on the path,
rides run in rounds, and the Board sends memos.

Built with TanStack Start, React 19, and three.js. Saves live in the browser.

## Play

Open a Hollow Creek or Fernwood assignment. Paint a path from the gate, open a
toilet and a food stall, repair the mothballed roundabout, and watch guests
split into gentle / steady / thrill tastes.

Rain soaks anyone without a brolly. Flower Hands water beds. Park Watch
discourages guests who treat benches as sport. Pause to borrow $2,000 from the
Board — they charge 4% a month and they will remember.

## Version

See `src/game/version.ts`. Current: **0.4.0**.

## Develop

This repo is the shared source for every Grok Build chat under the Wonderpark
project. After a ship:

1. Bump `GAME_VERSION`
2. Append a line to `artifacts/GAME.md`
3. Commit and push `main`

Auth and database stay off. The game is a client sim with `localStorage`.
