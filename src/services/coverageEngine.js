// ============================================================
// Coverage Engine v2 — Dynamic Gap Analysis
// ============================================================
// Key changes from v1:
// 1. Detection rules weighted 40/100 (was 25) — user rules are PRIMARY input
// 2. Sub-technique → parent score propagation
// 3. Dynamic technique registration (unknown IDs from Sigma get added)
// 4. Per-technique recommendations from mitigationsData.js (not generic per-tactic)
// 5. Specific data sources and Sigma guidance per technique

import { TECHNIQUES, TACTICS, TECHNIQUE_MAP } from '../data/attackData';
import { ALL_CONTROLS } from '../data/controlMappings';
import { ACTOR_MAP } from '../data/threatActors';
import { getTechniqueIntel, MITIGATIONS } from '../data/mitigationsData';

const MATURITY_MULT = { basic: 0.5, intermediate: 0.75, advanced: 1.0 };

// ============================================================
// SCORING
// ============================================================
// New weight distribution:
//   Detection rules (Sigma/manual): up to 40 pts  (was 25)
//   Preventive controls:            up to 30 pts  (was 40)
//   Detective controls:             up to 20 pts  (was 35)
//   Corrective bonus:               up to 10 pts  (was 5)
// ============================================================

function computeScore(techniqueId, enabledControls, controlMaturity, detectionRules) {
  // ── Detection rules (PRIMARY signal) ──
  const coveringRules = detectionRules.filter(rule =>
    rule.source !== 'threat-actor' &&
    rule.techniques.some(tid => {
      // Exact match
      if (tid === techniqueId) return true;
      // Sub-technique matches parent (T1059.001 → T1059)
      if (techniqueId === tid.split('.')[0] && tid.includes('.')) return true;
      // Parent matches sub-technique (T1059 → T1059.001)
      if (tid === techniqueId.split('.')[0] && techniqueId.includes('.')) return true;
      return false;
    })
  );

  // Score rules with quality weighting
  let rulesScore = 0;
  coveringRules.forEach(rule => {
    const isExactMatch = rule.techniques.includes(techniqueId);
    const levelMult = { critical: 1.0, high: 0.85, medium: 0.7, low: 0.5 }[rule.level] || 0.7;
    const matchMult = isExactMatch ? 1.0 : 0.6;
    rulesScore += 18 * levelMult * matchMult; // Each rule contributes up to 18 pts
  });
  rulesScore = Math.min(40, Math.round(rulesScore));

  // ── Controls ──
  const coveringControls = ALL_CONTROLS.filter(ctrl =>
    enabledControls.includes(ctrl.id) && (
      ctrl.coveredTechniques.includes(techniqueId) ||
      // Also match if control covers parent technique
      ctrl.coveredTechniques.includes(techniqueId.split('.')[0])
    )
  );

  const preventiveControls = coveringControls.filter(c => c.type === 'preventive');
  const detectiveControls  = coveringControls.filter(c => c.type === 'detective');
  const correctiveControls = coveringControls.filter(c => c.type === 'corrective');

  // Best preventive score (take the highest-maturity one)
  const preventiveScore = preventiveControls.reduce((best, ctrl) => {
    const s = 30 * (MATURITY_MULT[controlMaturity[ctrl.id]] || 0.5);
    return s > best ? s : best;
  }, 0);

  // Best detective score
  const detectiveScore = detectiveControls.reduce((best, ctrl) => {
    const s = 20 * (MATURITY_MULT[controlMaturity[ctrl.id]] || 0.5);
    return s > best ? s : best;
  }, 0);

  const correctiveBonus = correctiveControls.length > 0
    ? Math.min(10, correctiveControls.length * 5 * (MATURITY_MULT[controlMaturity[correctiveControls[0]?.id]] || 0.5))
    : 0;

  const total = Math.min(100, Math.round(rulesScore + preventiveScore + detectiveScore + correctiveBonus));

  return {
    total,
    rulesScore,
    preventiveScore: Math.round(preventiveScore),
    detectiveScore: Math.round(detectiveScore),
    correctiveBonus: Math.round(correctiveBonus),
    coveringControls,
    coveringRules,
  };
}

// ============================================================
// Coverage level helpers
// ============================================================

export function getCoverageLevel(score) {
  if (score === 0)  return 'none';
  if (score <= 30)  return 'low';
  if (score <= 60)  return 'medium';
  return 'high';
}

export function getCoverageLevelLabel(score) {
  if (score === 0)  return 'No coverage';
  if (score <= 30)  return 'Low coverage';
  if (score <= 60)  return 'Partial coverage';
  return 'Good coverage';
}

export function getCoverageLevelColor(score) {
  if (score === 0)  return 'var(--coverage-none)';
  if (score <= 30)  return 'var(--coverage-low)';
  if (score <= 60)  return 'var(--coverage-medium)';
  return 'var(--coverage-high)';
}

// ============================================================
// Dynamic technique registration
// ============================================================
// If a Sigma rule references a technique not in our dataset,
// create a stub entry so it still appears in the analysis.
function registerDynamicTechniques(detectionRules) {
  const dynamicTechniques = [];
  const allKnownIds = new Set(TECHNIQUES.map(t => t.id));

  detectionRules.forEach(rule => {
    if (rule.source === 'threat-actor') return;
    rule.techniques.forEach(tid => {
      if (!allKnownIds.has(tid)) {
        const parentId = tid.split('.')[0];
        const parentTechnique = TECHNIQUE_MAP[parentId];
        dynamicTechniques.push({
          id: tid,
          name: `${parentTechnique?.name || 'Unknown'} (${tid})`,
          tactic: parentTechnique?.tactic || 'TA0002',
          platforms: parentTechnique?.platforms || ['Windows'],
          prevalence: parentTechnique?.prevalence || 50,
          parent: tid.includes('.') ? parentId : undefined,
          _dynamic: true,
        });
        allKnownIds.add(tid);
      }
    });
  });

  return dynamicTechniques;
}

// ============================================================
// Full gap analysis
// ============================================================

export function runGapAnalysis(enabledControls, controlMaturity, detectionRules, selectedActors = []) {
  // Register any techniques from rules that aren't in our static dataset
  const dynamicTechniques = registerDynamicTechniques(detectionRules);
  const allTechniques = [...TECHNIQUES, ...dynamicTechniques];

  const techniqueScores = {};

  // Score every technique
  allTechniques.forEach(technique => {
    const r = computeScore(technique.id, enabledControls, controlMaturity, detectionRules);
    techniqueScores[technique.id] = {
      ...technique,
      score: r.total,
      level: getCoverageLevel(r.total),
      rulesScore:       r.rulesScore,
      preventiveScore:  r.preventiveScore,
      detectiveScore:   r.detectiveScore,
      correctiveBonus:  r.correctiveBonus,
      coveringControls: r.coveringControls,
      coveringRules:    r.coveringRules,
    };
  });

  // Per-tactic summary (root techniques only)
  const tacticSummary = {};
  TACTICS.forEach(tactic => {
    const roots = allTechniques.filter(t => t.tactic === tactic.id && !t.parent);
    const scores = roots.map(t => techniqueScores[t.id]?.score || 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const covered = scores.filter(s => s > 30).length;
    tacticSummary[tactic.id] = {
      ...tactic,
      averageScore: avg,
      totalTechniques: roots.length,
      coveredTechniques: covered,
      coveragePercent: roots.length ? Math.round((covered / roots.length) * 100) : 0,
    };
  });

  // Root techniques — dedupe by id: MITRE maps some techniques to several
  // tactics (e.g. T1078 in Initial Access AND Privilege Escalation), so the
  // same id would otherwise be counted and rendered twice.
  const seenRootIds = new Set();
  const rootTechniques = allTechniques.filter(t => {
    if (t.parent) return false;
    if (seenRootIds.has(t.id)) return false;
    seenRootIds.add(t.id);
    return true;
  });
  const gaps = rootTechniques
    .map(t => {
      const ts = techniqueScores[t.id];
      const priority = Math.round((t.prevalence || 50) * (1 - (ts?.score || 0) / 100));
      return { ...ts, priority };
    })
    .filter(t => t.score < 61)
    .sort((a, b) => b.priority - a.priority);

  const criticalGaps = gaps.filter(t => t.score === 0);
  const weakGaps     = gaps.filter(t => t.score > 0 && t.score <= 30);
  const partialGaps  = gaps.filter(t => t.score > 30 && t.score < 61);

  // Weighted posture score
  const totalWeight = rootTechniques.reduce((s, t) => s + (t.prevalence || 50), 0);
  const weightedSum = rootTechniques.reduce((s, t) =>
    s + (techniqueScores[t.id]?.score || 0) * (t.prevalence || 50), 0
  );
  const postureScore = totalWeight ? Math.round(weightedSum / totalWeight) : 0;

  // ── Input quality analysis ──
  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const uniqueTechsFromRules = new Set();
  ownRules.forEach(r => r.techniques.forEach(t => uniqueTechsFromRules.add(t)));

  const inputAnalysis = {
    totalRules: ownRules.length,
    uniqueTechniquesFromRules: uniqueTechsFromRules.size,
    totalControlsEnabled: enabledControls.length,
    dynamicTechniquesAdded: dynamicTechniques.length,
    // Techniques only covered by rules (no control)
    ruleOnlyCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore > 0 && ts.preventiveScore === 0 && ts.detectiveScore === 0;
    }).length,
    // Techniques only covered by controls (no rules)
    controlOnlyCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore === 0 && (ts.preventiveScore > 0 || ts.detectiveScore > 0);
    }).length,
    // Techniques with BOTH rules and controls
    fullCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore > 0 && (ts.preventiveScore > 0 || ts.detectiveScore > 0);
    }).length,
  };

  // Threat actor analysis
  const actorAnalysis = selectedActors.map(actorId => {
    const actor = ACTOR_MAP[actorId];
    if (!actor) return null;
    const actorTechs = actor.techniques.map(tid => techniqueScores[tid]).filter(Boolean);
    const covered = actorTechs.filter(ts => ts.score > 30).length;
    const avgScore = actorTechs.length
      ? Math.round(actorTechs.reduce((s, ts) => s + ts.score, 0) / actorTechs.length)
      : 0;
    const actorGaps = actorTechs
      .filter(ts => ts.score === 0)
      .map(ts => ({ ...ts, priority: ts.prevalence || 50 }));
    return {
      actor,
      totalTechniques: actorTechs.length,
      coveredTechniques: covered,
      coveragePercent: actorTechs.length ? Math.round((covered / actorTechs.length) * 100) : 0,
      averageScore: avgScore,
      gaps: actorGaps,
    };
  }).filter(Boolean);

  return {
    techniqueScores,
    tacticSummary,
    gaps,
    criticalGaps,
    weakGaps,
    partialGaps,
    postureScore,
    totalTechniques: rootTechniques.length,
    coveredCount:     rootTechniques.filter(t => (techniqueScores[t.id]?.score || 0) > 30).length,
    wellCoveredCount: rootTechniques.filter(t => (techniqueScores[t.id]?.score || 0) > 60).length,
    actorAnalysis,
    selectedActors,
    inputAnalysis,
  };
}

// ============================================================
// Per-technique recommendations (DYNAMIC, from mitigationsData)
// ============================================================

export function getRecommendations(technique, techniqueScore) {
  const intel = getTechniqueIntel(technique.id);
  const recs = [];

  // ── Missing detection rules ──
  if (techniqueScore.rulesScore === 0) {
    recs.push({
      type: 'detection',
      priority: 'critical',
      title: `Create a detection rule for ${technique.id} — ${technique.name}`,
      description: intel.sigmaGuidance,
      effort: intel.detectionPriority === 'critical' ? 'High priority' : 'Medium priority',
      dataSources: intel.dataSources,
    });
  }

  // ── Missing preventive controls ──
  if (techniqueScore.preventiveScore === 0) {
    const relevantMitigations = intel.mitigations
      .map(mid => MITIGATIONS[mid])
      .filter(Boolean)
      .filter(m => ['M1038', 'M1032', 'M1030', 'M1050', 'M1051', 'M1049', 'M1021', 'M1022', 'M1026', 'M1027', 'M1028', 'M1034', 'M1035', 'M1037', 'M1057'].includes(m.id));

    if (relevantMitigations.length > 0) {
      recs.push({
        type: 'control',
        priority: 'high',
        title: `Implement a preventive control for ${technique.name}`,
        description: relevantMitigations.map(m => `• ${m.name} — ${m.desc}`).join('\n'),
        effort: relevantMitigations.length > 2 ? 'High' : 'Medium',
        mitigations: relevantMitigations,
      });
    }
  }

  // ── Has prevention but no detection ──
  if (techniqueScore.rulesScore === 0 && (techniqueScore.preventiveScore > 0 || techniqueScore.detectiveScore > 0)) {
    recs.push({
      type: 'detection',
      priority: 'medium',
      title: `Add specific detection for ${technique.name}`,
      description: `Controls are in place but no detection rule targets this technique. If the control is bypassed, there is no alert. Recommended sources: ${intel.dataSources.join(', ')}.`,
      effort: 'Medium',
      dataSources: intel.dataSources,
    });
  }

  // ── Has detection but no prevention ──
  if (techniqueScore.rulesScore > 0 && techniqueScore.preventiveScore === 0) {
    const preventiveMitigations = intel.mitigations
      .map(mid => MITIGATIONS[mid])
      .filter(Boolean)
      .slice(0, 2);

    if (preventiveMitigations.length > 0) {
      recs.push({
        type: 'control',
        priority: 'medium',
        title: `Complete with a preventive control for ${technique.name}`,
        description: `Detection is in place, but no control proactively blocks this technique. Consider: ${preventiveMitigations.map(m => m.name).join(', ')}.`,
        effort: 'Medium',
        mitigations: preventiveMitigations,
      });
    }
  }

  // ── Low maturity ──
  const lowMaturityControls = techniqueScore.coveringControls.filter(c =>
    !['intermediate', 'advanced'].includes(techniqueScore._maturityMap?.[c.id])
  );
  if (lowMaturityControls.length > 0 && techniqueScore.score > 0 && techniqueScore.score < 50) {
    recs.push({
      type: 'improvement',
      priority: 'low',
      title: `Increase control maturity for ${technique.name}`,
      description: `${lowMaturityControls.length} control(s) at "Basic" level. Moving to Intermediate or Advanced would significantly increase the score.`,
      effort: 'Low',
    });
  }

  // ── General mitigations info ──
  if (intel.mitigations.length > 0 && recs.length === 0 && techniqueScore.score < 80) {
    const allMits = intel.mitigations.map(mid => MITIGATIONS[mid]).filter(Boolean);
    recs.push({
      type: 'improvement',
      priority: 'low',
      title: `Strengthen the coverage of ${technique.name}`,
      description: `Applicable MITRE mitigations: ${allMits.map(m => m.name).join(', ')}.`,
      effort: 'Variable',
      mitigations: allMits,
    });
  }

  return recs;
}
