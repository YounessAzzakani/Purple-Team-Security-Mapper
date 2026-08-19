// ============================================================
// Coverage Engine v2 — Dynamic Gap Analysis & Posture Scoring
// ============================================================
// Features:
// 1. Detection rules weighted with Sigma/manual rule matches
// 2. Security Solutions mapped to MITRE Mitigations & Tactic domains (Preventive)
// 3. Detection Methods mapped to Tactic categories & Data Sources (Detective)
// 4. Sub-technique → parent score propagation
// 5. Dynamic technique registration (unknown IDs from Sigma get added)
// 6. Per-technique recommendations from mitigationsData.js

import { TECHNIQUES, TACTICS, TECHNIQUE_MAP } from '../data/attackData';
import { ACTOR_MAP } from '../data/threatActors';
import { getTechniqueIntel, MITIGATIONS } from '../data/mitigationsData';

// ── Category Mappings for Security Solutions & Detection Methods ──
export const SOLUTION_MITIGATION_MAP = {
  'Endpoint & EDR': ['M1049', 'M1040', 'M1038', 'M1050', 'M1028', 'M1022', 'M1024', 'M1034'],
  'Network & Firewall': ['M1037', 'M1031', 'M1030', 'M1020', 'M1035'],
  'Application Security': ['M1056', 'M1021', 'M1048', 'M1054'],
  'Identity & Access': ['M1032', 'M1026', 'M1027', 'M1036', 'M1018', 'M1015'],
  'Cloud Security': ['M1032', 'M1026', 'M1047', 'M1056', 'M1018'],
  'Email Security': ['M1021', 'M1049', 'M1017'],
  'Data Security': ['M1057', 'M1053'],
  'SIEM & Analytics': ['M1047', 'M1019'],
};

export const SOLUTION_TACTIC_MAP = {
  'Endpoint & EDR': ['TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007', 'TA0008', 'TA0040', 'execution', 'persistence', 'privilege-escalation', 'defense-evasion', 'credential-access', 'discovery', 'lateral-movement', 'impact'],
  'Network & Firewall': ['TA0001', 'TA0008', 'TA0010', 'TA0011', 'initial-access', 'lateral-movement', 'exfiltration', 'command-and-control'],
  'SIEM & Analytics': ['TA0001', 'TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007', 'TA0008', 'TA0009', 'TA0010', 'TA0011', 'TA0040'],
  'Cloud Security': ['TA0001', 'TA0003', 'TA0004', 'TA0006', 'TA0007', 'TA0008', 'TA0010', 'initial-access', 'persistence', 'privilege-escalation', 'credential-access', 'discovery', 'lateral-movement', 'exfiltration'],
  'Application Security': ['TA0001', 'TA0002', 'TA0005', 'initial-access', 'execution', 'defense-evasion'],
  'Identity & Access': ['TA0001', 'TA0003', 'TA0004', 'TA0006', 'TA0008', 'initial-access', 'persistence', 'privilege-escalation', 'credential-access', 'lateral-movement'],
  'Email Security': ['TA0001', 'initial-access'],
  'Data Security': ['TA0009', 'TA0010', 'TA0040', 'collection', 'exfiltration', 'impact'],
};

// ============================================================
// SCORING
// ============================================================
export function computeScore(techniqueOrId, detectionRules = [], securitySolutions = [], detectionMethods = []) {
  const techniqueId = typeof techniqueOrId === 'string' ? techniqueOrId : techniqueOrId.id;
  const techniqueObj = typeof techniqueOrId === 'object' ? techniqueOrId : (TECHNIQUE_MAP[techniqueId] || { id: techniqueId, tactic: 'TA0002' });
  const tacticId = techniqueObj.tactic || 'TA0002';
  const intel = getTechniqueIntel(techniqueId) || { mitigations: [], dataSources: [] };

  // 1. ── Detection Rules Score ──
  const coveringRules = (detectionRules || []).filter(rule =>
    rule.source !== 'threat-actor' &&
    (rule.techniques || []).some(tid => {
      if (tid === techniqueId) return true;
      if (techniqueId === tid.split('.')[0] && tid.includes('.')) return true;
      if (tid === techniqueId.split('.')[0] && techniqueId.includes('.')) return true;
      return false;
    })
  );

  let rulesRaw = 0;
  coveringRules.forEach(rule => {
    const isExactMatch = (rule.techniques || []).includes(techniqueId);
    const levelMult = { critical: 1.0, high: 0.85, medium: 0.7, low: 0.5 }[rule.level] || 0.7;
    const matchMult = isExactMatch ? 1.0 : 0.6;
    rulesRaw += 100 * levelMult * matchMult;
  });
  const rulesScore = Math.min(100, Math.round(rulesRaw));

  // 2. ── Security Solutions (Preventive Controls) ──
  const coveringControls = [];
  let preventiveRaw = 0;

  const activeSolutions = (securitySolutions || []).filter(s => s && s.enabled !== false);
  activeSolutions.forEach(sol => {
    const cat = sol.category || 'Endpoint & EDR';
    const isEnforcing = !sol.status || sol.status === 'enforcing';
    if (!isEnforcing) return;

    const suppMits = SOLUTION_MITIGATION_MAP[cat] || [];
    const overlapMits = suppMits.filter(m => (intel.mitigations || []).includes(m));
    const suppTactics = SOLUTION_TACTIC_MAP[cat] || [];
    const tacticMatch = suppTactics.includes(tacticId);

    if (overlapMits.length > 0) {
      preventiveRaw += 50 * Math.min(2, overlapMits.length);
      coveringControls.push({
        id: sol.id,
        name: sol.name,
        type: 'Preventive Solution',
        categoryName: cat,
        details: `Mitigates via ${overlapMits.join(', ')}`,
      });
    } else if (tacticMatch) {
      preventiveRaw += 35;
      coveringControls.push({
        id: sol.id,
        name: sol.name,
        type: 'Preventive Solution',
        categoryName: cat,
        details: `Covers tactic domain`,
      });
    }
  });
  const preventiveScore = Math.min(100, Math.round(preventiveRaw));

  // 3. ── Detection Methods (Detective Telemetry) ──
  let methodsRaw = 0;
  const activeMethods = (detectionMethods || []).filter(m => m && m.enabled !== false);
  activeMethods.forEach(method => {
    const methodTactics = (method.tactics || []).map(t => String(t).toLowerCase());
    const tacticMatches = methodTactics.includes(tacticId.toLowerCase()) ||
      methodTactics.some(mt => {
        const tacObj = TACTICS.find(t => t.id === tacticId);
        return tacObj && (tacObj.shortName.toLowerCase() === mt || tacObj.name.toLowerCase() === mt);
      });

    if (tacticMatches) {
      const confMult = { High: 1.0, Medium: 0.75, Low: 0.5 }[method.confidence] || 0.75;
      const dsOverlap = (method.dataSources || []).some(ds =>
        (intel.dataSources || []).some(ids =>
          ids.toLowerCase().includes(ds.toLowerCase()) || ds.toLowerCase().includes(ids.toLowerCase())
        )
      );
      const fidMult = dsOverlap ? 1.25 : 1.0;
      methodsRaw += 40 * confMult * fidMult;

      coveringControls.push({
        id: method.id,
        name: method.name,
        type: 'Detection Method',
        categoryName: method.type || 'Detection Telemetry',
        details: `Confidence: ${method.confidence || 'Medium'}${dsOverlap ? ' · Matched Data Source' : ''}`,
      });
    }
  });
  const methodsScore = Math.min(100, Math.round(methodsRaw));

  // 4. ── Combined Detective & Overall Posture Score ──
  let detectiveScore = 0;
  if (rulesScore > 0 && methodsScore > 0) {
    detectiveScore = Math.min(100, Math.round(rulesScore * 0.6 + methodsScore * 0.4));
  } else if (rulesScore > 0) {
    detectiveScore = rulesScore;
  } else {
    detectiveScore = methodsScore;
  }

  let total = 0;
  if (rulesScore > 0 && (preventiveScore > 0 || methodsScore > 0)) {
    total = Math.min(100, Math.round(rulesScore * 0.40 + preventiveScore * 0.30 + methodsScore * 0.30));
  } else if (rulesScore > 0) {
    total = Math.min(100, Math.round(rulesScore * 0.75));
  } else if (preventiveScore > 0 || methodsScore > 0) {
    total = Math.min(100, Math.round(preventiveScore * 0.50 + methodsScore * 0.50));
  }

  return {
    total,
    rulesScore,
    preventiveScore,
    detectiveScore,
    methodsScore,
    correctiveBonus: 0,
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
function registerDynamicTechniques(detectionRules) {
  const dynamicTechniques = [];
  const allKnownIds = new Set(TECHNIQUES.map(t => t.id));

  (detectionRules || []).forEach(rule => {
    if (rule.source === 'threat-actor') return;
    (rule.techniques || []).forEach(tid => {
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
export function runGapAnalysis(arg1 = [], arg2 = [], arg3 = [], arg4 = []) {
  let detectionRules = [];
  let selectedActors = [];
  let securitySolutions = [];
  let detectionMethods = [];

  // Legacy signature: (enabledControls, controlMaturity, detectionRules, selectedActors)
  if (Array.isArray(arg1) && typeof arg2 === 'object' && !Array.isArray(arg2) && Array.isArray(arg3)) {
    detectionRules = arg3;
    selectedActors = arg4 || [];
  } else if (Array.isArray(arg1)) {
    detectionRules = arg1;
    selectedActors = arg2 || [];
    securitySolutions = arg3 || [];
    detectionMethods = arg4 || [];
  }

  // Register any techniques from rules that aren't in our static dataset
  const dynamicTechniques = registerDynamicTechniques(detectionRules);
  const allTechniques = [...TECHNIQUES, ...dynamicTechniques];

  const techniqueScores = {};

  // Score every technique
  allTechniques.forEach(technique => {
    const r = computeScore(technique, detectionRules, securitySolutions, detectionMethods);
    techniqueScores[technique.id] = {
      ...technique,
      score: r.total,
      level: getCoverageLevel(r.total),
      rulesScore:       r.rulesScore,
      preventiveScore:  r.preventiveScore,
      detectiveScore:   r.detectiveScore,
      methodsScore:     r.methodsScore,
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

  // Root techniques — dedupe by id
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
  const ownRules = (detectionRules || []).filter(r => r.source !== 'threat-actor');
  const uniqueTechsFromRules = new Set();
  ownRules.forEach(r => (r.techniques || []).forEach(t => uniqueTechsFromRules.add(t)));

  const activeSolutionsCount = (securitySolutions || []).filter(s => s && s.enabled !== false).length;
  const activeMethodsCount = (detectionMethods || []).filter(m => m && m.enabled !== false).length;

  const inputAnalysis = {
    totalRules: ownRules.length,
    uniqueTechniquesFromRules: uniqueTechsFromRules.size,
    totalControlsEnabled: activeSolutionsCount + activeMethodsCount,
    totalSolutions: activeSolutionsCount,
    totalMethods: activeMethodsCount,
    dynamicTechniquesAdded: dynamicTechniques.length,
    ruleOnlyCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore > 0 && ts.preventiveScore === 0 && (ts.methodsScore || 0) === 0;
    }).length,
    controlOnlyCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore === 0 && (ts.preventiveScore > 0 || (ts.methodsScore || 0) > 0);
    }).length,
    fullCoverage: rootTechniques.filter(t => {
      const ts = techniqueScores[t.id];
      return ts && ts.rulesScore > 0 && (ts.preventiveScore > 0 || (ts.methodsScore || 0) > 0);
    }).length,
  };

  // Threat actor analysis
  const actorAnalysis = (selectedActors || []).map(actorId => {
    const actor = ACTOR_MAP[actorId];
    if (!actor) return null;
    const actorTechs = (actor.techniques || []).map(tid => techniqueScores[tid]).filter(Boolean);
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
  const intel = getTechniqueIntel(technique.id) || { mitigations: [], dataSources: [] };
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
    const relevantMitigations = (intel.mitigations || [])
      .map(mid => MITIGATIONS[mid])
      .filter(Boolean)
      .filter(m => ['M1049', 'M1038', 'M1032', 'M1030', 'M1050', 'M1051', 'M1049', 'M1021', 'M1022', 'M1026', 'M1027', 'M1028', 'M1034', 'M1035', 'M1037', 'M1057'].includes(m.id));

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

  // ── Has prevention/method but no detection rule ──
  if (techniqueScore.rulesScore === 0 && (techniqueScore.preventiveScore > 0 || (techniqueScore.methodsScore || 0) > 0)) {
    recs.push({
      type: 'detection',
      priority: 'medium',
      title: `Add specific alert rule for ${technique.name}`,
      description: `Security controls or telemetry are in place, but no dedicated Sigma alert targets this technique. Recommended data sources: ${(intel.dataSources || []).join(', ')}.`,
      effort: 'Medium',
      dataSources: intel.dataSources,
    });
  }

  // ── Has detection rule but no preventive control ──
  if (techniqueScore.rulesScore > 0 && techniqueScore.preventiveScore === 0) {
    const preventiveMitigations = (intel.mitigations || [])
      .map(mid => MITIGATIONS[mid])
      .filter(Boolean)
      .slice(0, 2);

    if (preventiveMitigations.length > 0) {
      recs.push({
        type: 'control',
        priority: 'medium',
        title: `Complete with a preventive control for ${technique.name}`,
        description: `Detection is in place, but no active control proactively blocks this technique. Consider: ${preventiveMitigations.map(m => m.name).join(', ')}.`,
        effort: 'Medium',
        mitigations: preventiveMitigations,
      });
    }
  }

  // ── General mitigations info ──
  if ((intel.mitigations || []).length > 0 && recs.length === 0 && techniqueScore.score < 80) {
    const allMits = (intel.mitigations || []).map(mid => MITIGATIONS[mid]).filter(Boolean);
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
