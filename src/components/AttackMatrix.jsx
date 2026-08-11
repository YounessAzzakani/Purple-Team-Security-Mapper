import { useState, useMemo } from 'react';
import { TACTICS, TECHNIQUES_BY_TACTIC, SUBTECHNIQUES_BY_PARENT } from '../data/attackData';
import { getCoverageLevel, getCoverageLevelColor } from '../services/coverageEngine';

const TACTIC_ABBREV = {
  'TA0001': 'Init\nAccess',
  'TA0002': 'Exec',
  'TA0003': 'Persist',
  'TA0004': 'Priv\nEscal',
  'TA0005': 'Def\nEvasion',
  'TA0006': 'Cred\nAccess',
  'TA0007': 'Discovery',
  'TA0008': 'Lateral\nMove',
  'TA0009': 'Collect',
  'TA0010': 'Exfil',
  'TA0011': 'C2',
  'TA0040': 'Impact',
};

export default function AttackMatrix({ techniqueScores, onTechniqueClick }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const filterColors = {
    all: null,
    none: 'coverage-none',
    low: 'coverage-low',
    medium: 'coverage-medium',
    high: 'coverage-high',
  };

  function getCellClass(score) {
    const level = getCoverageLevel(score);
    const base = `matrix-cell coverage-${level}`;
    if (filter !== 'all' && filter !== level) return base + ' opacity-50';
    return base;
  }

  // Count per level for legend
  const counts = useMemo(() => {
    const c = { none: 0, low: 0, medium: 0, high: 0 };
    if (!techniqueScores) return c;
    Object.values(techniqueScores).forEach(ts => {
      if (!ts.parent) c[getCoverageLevel(ts.score)]++;
    });
    return c;
  }, [techniqueScores]);

  const searchLower = search.trim().toLowerCase();
  function matchesSearch(technique) {
    if (!searchLower) return true;
    return technique.id.toLowerCase().includes(searchLower) || technique.name.toLowerCase().includes(searchLower);
  }

  // Max column height
  const maxRows = Math.max(...TACTICS.map(t => (TECHNIQUES_BY_TACTIC[t.id] || []).length));

  return (
    <div>
      {/* Legend + Filters */}
      <div className="filter-bar" style={{ marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginRight: 'var(--space-2)' }}>
          Filtrer:
        </span>
        <div className="filter-group">
          {[
            { key: 'all', label: 'Tout', count: null },
            { key: 'none', label: '🔴 Gaps', count: counts.none },
            { key: 'low', label: '🟠 Faible', count: counts.low },
            { key: 'medium', label: '🟡 Moyen', count: counts.medium },
            { key: 'high', label: '🟢 Couvert', count: counts.high },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}{f.count !== null ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            className="form-input"
            placeholder="🔎 Rechercher un ID ou un nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, padding: '6px 10px', fontSize: 'var(--text-xs)', background: 'var(--bg-input)' }}
          />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Cliquez sur une technique pour voir les détails</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="matrix-container" style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${TACTICS.length}, 1fr)`,
          gap: 4,
          minWidth: 900,
        }}>
          {/* Tactic headers */}
          {TACTICS.map(tactic => (
            <div key={tactic.id} className="matrix-tactic-header" style={{ whiteSpace: 'pre-line', lineHeight: 1.2, padding: 'var(--space-2)' }}>
              <div style={{ fontSize: 9, color: 'var(--purple-400)', fontWeight: 700, marginBottom: 2 }}>
                {tactic.id}
              </div>
              <div style={{ fontSize: 10 }}>
                {TACTIC_ABBREV[tactic.id] || tactic.name}
              </div>
            </div>
          ))}

          {/* Technique cells — row by row */}
          {Array.from({ length: maxRows }, (_, rowIdx) =>
            TACTICS.map(tactic => {
              const techniques = TECHNIQUES_BY_TACTIC[tactic.id] || [];
              const technique = techniques[rowIdx];
              if (!technique) {
                return <div key={`${tactic.id}-empty-${rowIdx}`} style={{ minHeight: 28 }} />;
              }
              const ts = techniqueScores?.[technique.id];
              const score = ts?.score ?? 0;
              const level = getCoverageLevel(score);
              const shouldDim = (filter !== 'all' && filter !== level) || !matchesSearch(technique);
              const subTechs = SUBTECHNIQUES_BY_PARENT[technique.id] || [];

              return (
                <div
                  key={technique.id}
                  className={`matrix-cell coverage-${level}`}
                  style={{
                    opacity: shouldDim ? 0.25 : 1,
                    position: 'relative',
                    transition: 'all 0.15s',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '4px 5px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onTechniqueClick?.(technique, ts)}
                  onMouseEnter={(e) => {
                    setHoveredId(technique.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ technique, ts, score, x: rect.left, y: rect.bottom + 8 });
                  }}
                  onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                >
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'inherit', opacity: 0.7, lineHeight: 1 }}>
                    {technique.id}
                  </div>
                  <div style={{ fontSize: 9, lineHeight: 1.2, marginTop: 2 }}>
                    {technique.name.length > 22 ? technique.name.slice(0, 22) + '…' : technique.name}
                  </div>
                  {subTechs.length > 0 && (
                    <div style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>
                      +{subTechs.length} sub
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <MatrixTooltip tooltip={tooltip} />
      )}
    </div>
  );
}

function MatrixTooltip({ tooltip }) {
  const { technique, ts, score, x, y } = tooltip;
  const level = getCoverageLevel(score);
  const levelLabels = { none: 'Aucune couverture', low: 'Faible', medium: 'Moyen', high: 'Bon' };
  const levelColors = { none: 'var(--color-danger)', low: 'var(--color-orange)', medium: 'var(--color-warning)', high: 'var(--color-success)' };

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(x, window.innerWidth - 280),
      top: Math.min(y, window.innerHeight - 160),
      zIndex: 'var(--z-toast)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-lg)',
      pointerEvents: 'none',
      maxWidth: 280,
      animation: 'tooltipFadeIn 0.15s forwards',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--purple-400)', marginBottom: 4 }}>
        {technique.id}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {technique.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, color: levelColors[level],
          background: `${levelColors[level]}20`, padding: '2px 8px', borderRadius: 'var(--radius-full)',
        }}>
          {levelLabels[level]}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: levelColors[level] }}>
          {score}/100
        </div>
      </div>
      {ts && (
        <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          {ts.coveringControls?.length > 0 && (
            <div>🛡️ {ts.coveringControls.length} contrôle{ts.coveringControls.length > 1 ? 's' : ''}</div>
          )}
          {ts.coveringRules?.length > 0 && (
            <div>🔍 {ts.coveringRules.length} règle{ts.coveringRules.length > 1 ? 's' : ''}</div>
          )}
          {ts.coveringControls?.length === 0 && ts.coveringRules?.length === 0 && (
            <div style={{ color: 'var(--color-danger)' }}>⚠️ Aucune couverture — GAP critique</div>
          )}
        </div>
      )}
    </div>
  );
}
