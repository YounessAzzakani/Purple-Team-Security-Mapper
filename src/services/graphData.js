// ============================================================
// Graph data builder — Threat Actors → TTPs (→ coverage)
// ============================================================
// Produces the node/link dataset for the interactive force graph:
//   - actor nodes     (type: 'actor')
//   - technique nodes (type: 'technique'), colored by coverage
// Modes:
//   'all'  → every actor + all of their techniques
//   'gaps' → only the selected actors + their UNCOVERED techniques
// ============================================================

import { THREAT_ACTORS } from '../data/threatActors';

export function buildActorGraphData({
  techniqueScores = {},
  actors = THREAT_ACTORS,
  mode = 'all',
  selectedActorIds = [],
}) {
  const nodes = [];
  const links = [];
  const techNodes = new Map();

  const actorList = mode === 'gaps'
    ? actors.filter(a => selectedActorIds.includes(a.id))
    : actors;

  actorList.forEach(actor => {
    nodes.push({
      id: `actor:${actor.id}`,
      type: 'actor',
      actor,
      selected: selectedActorIds.includes(actor.id),
    });

    actor.techniques.forEach(tid => {
      const ts = techniqueScores[tid];
      const score = ts?.score ?? null;
      // Gaps mode: keep only uncovered techniques of selected actors
      if (mode === 'gaps' && (score == null || score >= 61)) return;

      let techNode = techNodes.get(tid);
      if (!techNode) {
        techNode = {
          id: `tech:${tid}`,
          type: 'technique',
          techniqueId: tid,
          name: ts?.name || tid,
          tactic: ts?.tactic,
          score,
        };
        nodes.push(techNode);
        techNodes.set(tid, techNode);
      }
      links.push({ source: `actor:${actor.id}`, target: `tech:${tid}`, kind: 'uses' });
    });
  });

  // Initial positions so the first paint has valid coordinates — d3-force will
  // re-layout from here (actors on a rim, techniques clustered in the middle).
  const actorNodes = nodes.filter(n => n.type === 'actor');
  const techniqueNodes = nodes.filter(n => n.type === 'technique');
  actorNodes.forEach((n, i) => {
    const a = (i / Math.max(actorNodes.length, 1)) * Math.PI * 2;
    n.x = 300 + Math.cos(a) * 170;
    n.y = 280 + Math.sin(a) * 170;
  });
  techniqueNodes.forEach((n, i) => {
    const a = (i / Math.max(techniqueNodes.length, 1)) * Math.PI * 2;
    n.x = 300 + Math.cos(a) * 60;
    n.y = 280 + Math.sin(a) * 60;
  });

  return { nodes, links };
}

export function computeGraphStats(nodes, links) {
  const actors = nodes.filter(n => n.type === 'actor').length;
  const techniques = nodes.filter(n => n.type === 'technique').length;
  return { actors, techniques, links: links.length };
}
