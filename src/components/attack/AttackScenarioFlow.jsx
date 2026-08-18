import { TACTIC_MAP, TECHNIQUE_MAP } from '../../data/attackData';
import { getCoverageLevel, getCoverageLevelLabel } from '../../services/coverageEngine';

/* ============================================================
 * AttackScenarioFlow — horizontal kill-chain visualization
 * tactic box → technique node, color-coded by live coverage
 * ============================================================ */

const LEVEL_COLORS = {
  none: 'var(--color-danger)',
  low: 'var(--color-orange)',
  medium: 'var(--color-warning)',
  high: 'var(--color-success)',
};

function scoreFor(techniqueScores, techniqueId) {
  return techniqueScores?.[techniqueId] ?? null;
}

export default function AttackScenarioFlow({ scenario, techniqueScores, onTechniqueClick }) {
  const tacticName = (tacticId) => TACTIC_MAP[tacticId]?.shortName || tacticId;

  return (
    <div className="card scenario-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{scenario.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
            {scenario.description}
          </div>
        </div>
      </div>

      {/* Kill-chain flow */}
      <div className="scenario-steps">
        {scenario.steps.map((step, i) => {
          const ts = scoreFor(techniqueScores, step.techniqueId);
          const level = ts ? getCoverageLevel(ts.score) : null;
          const color = level ? LEVEL_COLORS[level] : 'var(--text-muted)';
          const tech = TECHNIQUE_MAP[step.techniqueId] || { id: step.techniqueId, name: step.label };
          const clickable = typeof onTechniqueClick === 'function';

          return (
            <div key={`${step.techniqueId}-${i}`} className="scenario-step">
              <div
                className="scenario-node"
                style={{ borderColor: `${color}55` }}
                title={level ? `${tech.id} — ${getCoverageLevelLabel(ts.score)} (${ts.score}/100)` : `${tech.id} — not in dataset`}
                onClick={clickable ? () => onTechniqueClick(tech, ts) : undefined}
                role={clickable ? 'button' : undefined}
              >
                <div className="scenario-tactic-label">{tacticName(step.tactic)}</div>
                <div className="scenario-node-title">
                  <span className="scenario-node-dot" style={{ background: color }} />
                  <span className="scenario-node-id">{tech.id}</span>
                </div>
                <div className="scenario-node-name">{step.label}</div>
                {level && (
                  <span className="scenario-coverage-pill" style={{ color }}>
                    {level === 'none' ? 'Gap' : getCoverageLevelLabel(ts.score)}
                  </span>
                )}
              </div>
              {i < scenario.steps.length - 1 && <div className="scenario-arrow">→</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
