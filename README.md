# Bayline City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/garp702/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/garp702/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Bounty: https://make.fun/bounty/gta6-01

**Bayline City** is an original low-poly 3D open-world crime game set in the
fictional island city of Serena Bay. You arrive with $250, a borrowed phone and
a name nobody trusts yet. Walk the palm-lined boulevards, borrow a car, run
eight story jobs across three days for fixer Marisol Vega, dodge the Serena Bay
PD — patrol cars on the ground and the Air Unit Pelican helicopter overhead —
and spend what you earn on garage upgrades, body armour and ammunition.

## How to play

- **Start screen** — click *New Game* (or *Continue* if a save exists).
- **W A S D** move / drive, **mouse** orbit camera, **Shift** sprint.
- **E** enter or leave the nearest car. Taking a car that is not yours raises
  your wanted level.
- **1 / 2** select the Pelican 9 pistol or the Marlin-9 automatic.
- **Mouse click** fire (hitscan). **R** cycle the car radio (4 stations).
- **B** open the garage / shop when parked at the marked bay. **Esc** pause.
- Follow the gold route line on the minimap to the current job objective.
- Finish all 8 jobs to complete the three-day story. Progress, cash, REP and
  upgrades are saved to `localStorage`.

## Jobs

FIRST CATCH · PAPER ROUTE · QUIET PICKUP · CANAL RUN · HOT CARGO ·
NIGHT LEDGER · DOUBLE TIDE · BAYLINE FINALE — total payout $3,780.

## Running locally

The entrypoint copies the static game and screenshots to the output folder and
writes the dossier the judges read:

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Then serve `out/game/` with any static file server and open `index.html`.
The game itself is plain ES modules plus a vendored copy of three.js (r160);
it needs no network access and no build step.

## Layout

- `main.ts` — the make.fun entrypoint (copies `game/` + `screenshots/`,
  writes `dossier.json`).
- `game/src/` — one module per system: city, vehicles, traffic, pedestrians,
  player, police, helicopter, wanted, missions, combat, weapons, radio, shop,
  hud, audio, save, camera, input, shots, and the `OpenWorldGame` orchestrator.
- `screenshots/` — four staged captures of the real game running.
