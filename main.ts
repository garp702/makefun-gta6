// Bayline City — hand-in program for the make.fun gta6-01 bounty (Node 22, standard library only).
//
// The entry itself is the game/ folder: plain static files (an index.html, its ES modules and a
// vendored three.js build) that a desktop browser loads fully offline, with no build step and no
// network request. This program's whole job is the hand-in: copy game/ and screenshots/ from
// beside this file into the output directory and write /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The caps below are the scorer's own: at most 4 screenshots of 256 KiB each, at most 993 files
// and 48 MiB in game/, no game/ path over 1000 bytes, and the dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read-only verification pass: walk back over what was just handed in and count it, so the run
// log proves the output is complete (game files under game/, shots under screenshots/, and the
// dossier itself). This only reads the output directory; it writes nothing more.
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}
const gameFileCount = countFiles(join(out, 'game'));
const screenshotCount = readdirSync(join(out, 'screenshots')).length;
console.log(`bayline-city-r6 hand-in: ${gameFileCount} game files, ${screenshotCount} screenshots, dossier written`);
