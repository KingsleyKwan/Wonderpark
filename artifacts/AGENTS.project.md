This conversation belongs to a Grok project. Project files persist at
`/workspace/artifacts` — read `/workspace/artifacts/GAME.md` before you
conclude the workspace has no project files.

# Wonderpark

This project is **Wonderpark**, an RCT / Wonderworks-style isometric park
tycoon (TanStack Start + three.js). Canonical git remote:

**https://github.com/KingsleyKwan/Wonderpark**

Every chat under this project edits and publishes that repository.

- Live source: `/workspace/src/game/` (version in `src/game/version.ts`).
- Durable bible: `/workspace/artifacts/GAME.md` (backlog, hourly log, file map).
- Auth/db stay OFF. Preview on `0.0.0.0:8080` via `startup.sh` / `npm run dev`.
- Do **not** mix 燒中翼 / BBQ mid-wing into this tree.

If `src/game/version.ts` is missing or the tree is a different game, clone
`KingsleyKwan/Wonderpark` and copy `src/`, `public/art`, and `artifacts/GAME.md`
into `/workspace`, then install and start the preview.

Bump `GAME_VERSION` on every shippable change. Push to GitHub after the ship
so the next chat is not working from a discarded sandbox.
