# Bayline City

[![Make GTA 6 bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Bayline City rank](https://make.fun/badge/gta6-01/garp702/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![Bayline City reward](https://make.fun/badge/gta6-01/garp702/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

**Bayline City** is an original open-world crime game that runs entirely in a desktop
browser — no build step, no network requests, just static files and a vendored three.js
build. You are Kai Mercer, a fixer working the sun-soaked streets of Serena Bay for
contact Marisol Vega, running ten story jobs across three days while the Bayline City
Police Department tries to shut you down.

## What is in the game

- **A living coastal city** — Palm Boulevard with its beach, ocean and lighthouse, the
  Canal District, the Marina, Old Town and Hillcrest, with traffic, pedestrians,
  stealable cars and named streets.
- **BCPD dispatch** — dispatcher Sgt. Elena Brooks runs a named roster (Units 7, 12, 3,
  21 and Block A) from a live dispatch panel with statuses, distances and radio chatter.
- **Roadblocks** — from three wanted stars, dispatch throws cruiser roadblocks across
  the road ahead of you; at five stars a second block joins the hunt.
- **Air One** — the BCPD helicopter (Pilot Rosa Quintana) tracks you with a spotlight
  from four stars.
- **Five-star wanted system** — heat for carjackings, gunfire and police collisions,
  decaying only while no unit has eyes on you.
- **Respect ranks** — Nobody, Runner, Hustler, Operator, Shot Caller, Kingpin of
  Serena Bay. Respect from jobs, jackings and escapes unlocks weapons and safehouses.
- **Weapon wheel** — Fists, Pelican 9 pistol, Breaker Scattergun, Marlin-9 SMG and the
  Longshot Rifle, with ammo pools, reloads and hitscan combat.
- **Ten story jobs over three days** — pickups, deliveries, a roadblock escape and a
  three-phase finale, paying $6,480 in cash plus respect.
- **Garage and gun shop** — Engine, Armor and Nitro upgrades in three tiers each, ammo
  and body armor.
- **Three safehouses** — rest to heal, clear your wanted level and save the game.
- **Car radio and saves** — four original WebAudio stations, and a full localStorage
  save with Continue on the title screen.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move / drive |
| Shift | Sprint / boost |
| E | Enter or exit a car, use a safehouse |
| Mouse + click | Aim and shoot |
| 1–5 | Select weapon |
| Q (hold) | Weapon wheel |
| R | Cycle radio station (in a car) |
| Esc | Pause |

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. To produce the hand-in output
(the game, the screenshots and `dossier.json`) instead:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — the hand-in program (copies `game/` and `screenshots/` to the output and
  writes the dossier with the vendored make.fun library).
- `game/` — the game itself: `index.html` plus one ES module per system in `game/src/`
  (city, vehicles, traffic, pedestrians, player, police, dispatch, roadblocks,
  helicopter, wanted, respect, weapons, combat, missions, shop, safehouses, radio,
  audio, save, hud, camera, input, shots) and three.js vendored under `game/vendor/`.
- `screenshots/` — four captures of the game running: cover chase, five-star roadblock
  chase, a Marina mission on foot, and the garage.
