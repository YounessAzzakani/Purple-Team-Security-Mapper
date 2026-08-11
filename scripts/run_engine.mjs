// ============================================================
// Golden-parity runner: executes the REAL frontend coverageEngine.js
// with a JSON input file and prints a normalized JSON output.
// Used by backend/tests/test_golden_parity.py.
//
// The src files use extensionless relative imports (Vite-style);
// Node ESM requires explicit extensions, so we rewrite the 4 known
// imports to absolute file URLs before importing.
//
// Usage: node scripts/run_engine.mjs <input.json>
// ============================================================

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/run_engine.mjs <input.json>');
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, 'utf8'));

// ── Load the real engine with fixed imports ──
const engineSrc = readFileSync(resolve(here, '..', 'src', 'services', 'coverageEngine.js'), 'utf8');
const dataDir = resolve(here, '..', 'src', 'data');

const imports = [
  ['attackData', 'attackData.js'],
  ['controlMappings', 'controlMappings.js'],
  ['threatActors', 'threatActors.js'],
  ['mitigationsData', 'mitigationsData.js'],
];
let fixedSrc = engineSrc;
for (const [mod, file] of imports) {
  const url = pathToFileURL(join(dataDir, file)).href;
  fixedSrc = fixedSrc.replace(
    new RegExp(`from '${"../data/"}${mod}'`),
    `from '${url}'`
  );
}

const tmpDir = mkdtempSync(join(tmpdir(), 'ptm-parity-'));
const enginePath = join(tmpDir, 'coverageEngine.mjs');
writeFileSync(enginePath, fixedSrc, 'utf8');

const { runGapAnalysis } = await import(pathToFileURL(enginePath).href);

const result = runGapAnalysis(
  input.enabledControls,
  input.controlMaturity,
  input.detectionRules,
  input.selectedActors
);

// ── Normalization (must match the Python side exactly) ──
function normalize(res) {
  const techniqueScores = Object.values(res.techniqueScores)
    .map(ts => ({
      id: ts.id,
      score: ts.score,
      level: ts.level,
      rulesScore: ts.rulesScore,
      preventiveScore: ts.preventiveScore,
      detectiveScore: ts.detectiveScore,
      correctiveBonus: ts.correctiveBonus,
      dynamic: !!ts._dynamic,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const tacticSummary = Object.values(res.tacticSummary)
    .map(t => ({
      id: t.id,
      averageScore: t.averageScore,
      totalTechniques: t.totalTechniques,
      coveredTechniques: t.coveredTechniques,
      coveragePercent: t.coveragePercent,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const gaps = res.gaps.map(g => ({ id: g.id, score: g.score, priority: g.priority }));

  const actorAnalysis = res.actorAnalysis.map(a => ({
    actorId: a.actor.id,
    totalTechniques: a.totalTechniques,
    coveredTechniques: a.coveredTechniques,
    coveragePercent: a.coveragePercent,
    averageScore: a.averageScore,
    gaps: a.gaps.map(g => g.id),
  }));

  return {
    techniqueScores,
    tacticSummary,
    gaps,
    criticalGapIds: res.criticalGaps.map(g => g.id),
    weakGapIds: res.weakGaps.map(g => g.id),
    partialGapIds: res.partialGaps.map(g => g.id),
    postureScore: res.postureScore,
    totalTechniques: res.totalTechniques,
    coveredCount: res.coveredCount,
    wellCoveredCount: res.wellCoveredCount,
    inputAnalysis: res.inputAnalysis,
    actorAnalysis,
  };
}

process.stdout.write(JSON.stringify(normalize(result), null, 2));