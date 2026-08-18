import { useMemo } from 'react';
import { TACTICS, TECHNIQUES } from '../../data/attackData';
import { getCoverageLevel } from '../../services/coverageEngine';

/* ============================================================
 * MiniHeatmap — compact read-only ATT&CK tactic heatmap
 * one column per tactic, cells colored by coverage level
 * ============================================================ */

const CELL_COLORS = {
  none: 'var(--cell-none-bg)',
  low: 'var(--cell-low-bg)',
  medium: 'var(--cell-medium-bg)',
  high: 'var(--cell-high-bg)',
};

export default function MiniHeatmap({ techniqueScores, onTechniqueClick }) {
  const { byTactic, covered, total } = useMemo(() => {
    const seen = new Set();
    const byTactic = TACTICS.map(tactic => {
      const cells = TECHNIQUES
        .filter(t => t.tactic === tactic.id && !t.parent)
        .filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        })
        .map(t => ({ ...t, score: techniqueScores?.[t.id]?.score ?? null }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return { tactic, cells };
    });
    const all = byTactic.flatMap(b => b.cells);
    return { byTactic, covered: all.filter(c => c.score != null && c.score > 30).length, total: all.length };
  }, [techniqueScores]);

  return (
    <div>
      {/* Legend */}
      <div className="mini-heat-legend" style={{ marginBottom: 'var(--space-3)' }}>
        <span><i style={{ background: 'var(--cell-none-bg)', borderColor: 'var(--coverage-none)' }} /> No coverage</span>
        <span><i style={{ background: 'var(--cell-low-bg)', borderColor: 'var(--coverage-low)' }} /> Low</span>
        <span><i style={{ background: 'var(--cell-medium-bg)', borderColor: 'var(--coverage-medium)' }} /> Partial</span>
        <span><i style={{ background: 'var(--cell-high-bg)', borderColor: 'var(--coverage-high)' }} /> Good</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{covered}</strong>/{total} covered
        </span>
      </div>

      {/* Grid */}
      <div className="mini-heatmap">
        <div className="mini-heatmap-grid">
          {byTactic.map(({ tactic, cells }) => (
            <div key={tactic.id} className="mini-heat-tactic">
              <div className="mini-heat-tactic-title" title={tactic.name}>
                {tactic.shortName.split('-')[0]}
              </div>
              <div className="mini-heat-cells">
                {cells.map(cell => {
                  const level = cell.score == null ? null : getCoverageLevel(cell.score);
                  const background = level ? CELL_COLORS[level] : 'var(--bg-tertiary)';
                  const clickable = typeof onTechniqueClick === 'function';
                  return (
                    <div
                      key={cell.id}
                      className="mini-heat-cell"
                      style={{ background }}
                      title={`${cell.id} — ${cell.name}${cell.score != null ? ` (${cell.score}/100)` : ' — not scored'}`}
                      onClick={clickable ? () => onTechniqueClick(cell, techniqueScores?.[cell.id]) : undefined}
                      role={clickable ? 'button' : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
