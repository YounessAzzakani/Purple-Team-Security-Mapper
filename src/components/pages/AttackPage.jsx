import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import ThreatActorSelector from '../ThreatActorSelector';
import ActorGraph from '../attack/ActorGraph';
import AttackScenarioFlow from '../attack/AttackScenarioFlow';
import AttackMatrix from '../AttackMatrix';
import TechniqueDetail from '../TechniqueDetail';
import { runGapAnalysis } from '../../services/coverageEngine';
import { ATTACK_SCENARIOS } from '../../data/attackScenarios';
import { THREAT_ACTORS } from '../../data/threatActors';

/* ============================================================
 * ATTACK PAGE — one scrollable view:
 *   1. Adversary Groups (select APT profiles for the analysis)
 *   2. Attack Scenarios (pre-built kill-chain flows)
 *   3. TTP Graph        (interactive force-directed graph)
 *   4. Coverage Matrix  (full technique heatmap)
 * Coverage is shown LIVE from the current SOC configuration.
 * ============================================================ */

export default function AttackPage() {
  const { state, toggleActor } = useApp();
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [matrixOpen, setMatrixOpen] = useState(true);

  // Live coverage preview from the current configuration (pure client-side engine)
  const preview = useMemo(
    () => runGapAnalysis(state.enabledControls, state.controlMaturity, state.detectionRules, state.selectedActors),
    [state.enabledControls, state.controlMaturity, state.detectionRules, state.selectedActors],
  );

  const techniqueScores = preview.techniqueScores;

  // Live coverage % for EVERY actor (not only the selected ones)
  const actorCoverage = useMemo(
    () => THREAT_ACTORS.map(actor => {
      const techs = actor.techniques.map(tid => techniqueScores[tid]).filter(Boolean);
      const covered = techs.filter(ts => ts.score > 30).length;
      return {
        actorId: actor.id,
        total: techs.length,
        covered,
        percent: techs.length ? Math.round((covered / techs.length) * 100) : 0,
      };
    }),
    [techniqueScores],
  );

  const openTechnique = (technique, ts) => {
    setSelectedTechnique(technique);
    setSelectedScore(ts);
  };

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumps = [
    { id: 'adversary-groups', icon: '🎯', label: 'Adversary Groups' },
    { id: 'attack-scenarios', icon: '🧩', label: 'Attack Scenarios' },
    { id: 'ttp-graph', icon: '🕸️', label: 'TTP Graph' },
    { id: 'coverage-matrix', icon: '🗺️', label: 'Coverage Matrix' },
  ];

  const scenarios = state.selectedActors.length > 0
    ? ATTACK_SCENARIOS.filter(s => state.selectedActors.includes(s.actorId))
    : ATTACK_SCENARIOS;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>⚔️</div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>Attack</h1>
          <p style={{ marginTop: 4 }}>
            Threat actor groups and the techniques (TTPs) they use, mapped against your live coverage
          </p>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          ⚡ Launch the analysis from the sidebar
        </div>
      </div>

      {/* Jump to section */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {jumps.map(j => (
          <button key={j.id} className="filter-btn" style={{ cursor: 'pointer' }} onClick={() => jumpTo(j.id)}>
            {j.icon} {j.label}
          </button>
        ))}
      </div>

      {/* ── ADVERSARY GROUPS ── */}
      <section id="adversary-groups" style={{ marginBottom: 'var(--space-10)', scrollMarginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>🎯 Adversary Groups</h2>
          {state.selectedActors.length > 0 && <span className="badge badge-orange">{state.selectedActors.length} selected</span>}
        </div>
        <ThreatActorSelector
          selectedActors={state.selectedActors}
          onToggle={toggleActor}
          actorCoverage={actorCoverage}
        />
      </section>

      {/* ── ATTACK SCENARIOS ── */}
      <section id="attack-scenarios" style={{ marginBottom: 'var(--space-10)', scrollMarginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>🧩 Attack Scenarios</h2>
          <span className="badge badge-purple">{scenarios.length}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {state.selectedActors.length > 0
              ? 'Kill chains for your selected groups — color = your live coverage'
              : 'Select groups above to focus their kill chains'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))', gap: 'var(--space-5)' }}>
          {scenarios.map(s => (
            <AttackScenarioFlow
              key={s.id}
              scenario={s}
              techniqueScores={techniqueScores}
              onTechniqueClick={openTechnique}
            />
          ))}
        </div>
      </section>

      {/* ── TTP GRAPH ── */}
      <section id="ttp-graph" style={{ marginBottom: 'var(--space-10)', scrollMarginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>🕸️ TTP Graph</h2>
        </div>
        <ActorGraph
          techniqueScores={techniqueScores}
          selectedActors={state.selectedActors}
          onSelectTechnique={openTechnique}
          onToggleActor={toggleActor}
          theme={state.theme}
        />
        <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          Live coverage from your current SOC configuration · Click a technique for details · Click a group to select/deselect it
        </div>
      </section>

      {/* ── COVERAGE MATRIX ── */}
      <section id="coverage-matrix" style={{ marginBottom: 'var(--space-10)', scrollMarginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>🗺️ Coverage Matrix</h2>
          <span className="badge badge-purple">{preview.totalTechniques} techniques</span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMatrixOpen(o => !o)}
            title={matrixOpen ? 'Collapse the matrix' : 'Expand the matrix'}
          >
            {matrixOpen ? '▾ Collapse' : '▸ Expand'}
          </button>
        </div>
        {matrixOpen && <AttackMatrix techniqueScores={techniqueScores} onTechniqueClick={openTechnique} />}
        {!matrixOpen && (
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Matrix collapsed — click « ▸ Expand » above to show it again
          </div>
        )}
      </section>

      {/* Technique detail panel */}
      {selectedTechnique && (
        <TechniqueDetail
          technique={selectedTechnique}
          techniqueScore={selectedScore}
          onClose={() => { setSelectedTechnique(null); setSelectedScore(null); }}
        />
      )}
    </div>
  );
}