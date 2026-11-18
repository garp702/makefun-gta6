// Bayline City — make.fun entrypoint, written for this entry.
// The game itself is the static folder beside this file (game/index.html plus
// its ES modules and the vendored three.js build). This program's only job is
// plumbing: copy game/ and screenshots/ into the output directory and write
// dossier.json there with the vendored make.fun library, using exactly the
// scorer caps for this bounty. Everything below runs synchronously, top to
// bottom, with no network, no child processes and no randomness.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

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

// Read-only verification pass, after the dossier is on disk: walk the two
// copied trees and report a single summary line so a human running this by
// hand can see at a glance what was handed in. Nothing here writes anywhere.
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}

const gameFiles = countFiles(join(out, 'game'));
const shotFiles = countFiles(join(out, 'screenshots'));
console.log(`Bayline City: handed in ${gameFiles} game files and ${shotFiles} screenshots.`);
