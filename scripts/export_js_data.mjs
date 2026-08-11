// ============================================================
// Export JS data modules → JSON files for the Python backend
// Single source of truth: the frontend src/data/*.js modules.
// Run: node scripts/export_js_data.mjs
// ============================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TACTICS, TECHNIQUES } from '../src/data/attackData.js';
import { CONTROL_CATEGORIES, ALL_CONTROLS } from '../src/data/controlMappings.js';
import { MITIGATIONS, TECHNIQUE_INTEL } from '../src/data/mitigationsData.js';
import { THREAT_ACTORS } from '../src/data/threatActors.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'backend', 'data', 'json');
mkdirSync(outDir, { recursive: true });

const exports = {
  tactics: TACTICS,
  techniques: TECHNIQUES,
  control_categories: CONTROL_CATEGORIES,
  all_controls: ALL_CONTROLS,
  mitigations: MITIGATIONS,
  technique_intel: TECHNIQUE_INTEL,
  threat_actors: THREAT_ACTORS,
};

for (const [name, value] of Object.entries(exports)) {
  const path = join(outDir, `${name}.json`);
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf8');
  console.log(`✔ ${name}.json (${JSON.stringify(value).length} bytes)`);
}

console.log(`\nDone. ${Object.keys(exports).length} files written to ${outDir}`);