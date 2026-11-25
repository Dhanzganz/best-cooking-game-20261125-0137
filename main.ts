// main.ts — hands the Sizzle & Serve entry in: copies game/ and
// screenshots/ into the output directory and writes dossier.json
// with buildDossier from the kit's vendor library.
// Node 22, standard library only. No network.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory beside this file.
const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// buildDossier(root, caps) returns the dossier as bytes (a Uint8Array).
const dossier = buildDossier(root, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(out, 'dossier.json'), dossier);
