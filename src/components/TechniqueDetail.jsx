import { getCoverageLevel, getCoverageLevelLabel, getRecommendations } from '../services/coverageEngine';
import { TACTIC_MAP } from '../data/attackData';
import { getTechniqueIntel } from '../data/mitigationsData';

export default function TechniqueDetail({ technique, techniqueScore, onClose }) {
  if (!technique) return null;

  const score = techniqueScore?.score ?? 0;
  const level = getCoverageLevel(score);
  const tactic = TACTIC_MAP[technique.tactic];
  const recs = techniqueScore ? getRecommendations(technique, techniqueScore) : [];
  const intel = getTechniqueIntel(technique.id);

  const levelColors = {
    none: 'var(--color-danger)', low: 'var(--color-orange)', medium: 'var(--color-warning)', high: 'var(--color-success)',
  };
  const levelBg = {
    none: 'var(--color-danger-dim)', low: 'var(--color-orange-dim)',
    medium: 'var(--color-warning-dim)', high: 'var(--color-success-dim)',
  };
  const levelEmoji = { none: '🔴', low: '🟠', medium: '🟡', high: '🟢' };

  const strokeColor = levelColors[level];
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;

  // Score breakdown for "why" section
  const rulesScore = techniqueScore?.rulesScore ?? 0;
  const preventiveScore = techniqueScore?.preventiveScore ?? 0;
  const detectiveScore = techniqueScore?.detectiveScore ?? 0;
  const correctiveBonus = techniqueScore?.correctiveBonus ?? 0;

  const recPriorityColors = {
    critical: 'var(--color-danger)', high: 'var(--color-orange)', medium: 'var(--color-warning)', low: 'var(--color-info)',
  };
  const recPriorityBg = {
    critical: 'var(--color-danger-dim)', high: 'var(--color-orange-dim)', medium: 'var(--color-warning-dim)', low: 'var(--color-info-dim)',
  };
  const recTypeIcon = {
    detection: '🔍', control: '🛡️', improvement: '💡',
  };

  return (
    <>
      <div className="detail-overlay open" onClick={onClose} />
      <div className="detail-panel open">
        <button className="detail-close" onClick={onClose}>✕</button>

        {/* ── Header ── */}
        <div style={{ marginBottom: 'var(--space-5)', paddingTop: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', background: 'var(--violet-soft)',
              border: '1px solid var(--violet-border)', borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--purple-300)', fontWeight: 700,
            }}>
              {technique.id}
            </span>
            <span style={{
              padding: '3px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
            }}>
              {tactic?.name || technique.tactic}
            </span>
            {technique._dynamic && (
              <span style={{
                padding: '3px 8px', background: 'var(--color-orange-dim)', border: '1px solid var(--color-orange)',
                borderRadius: 'var(--radius-full)', fontSize: 10, color: 'var(--color-orange)', fontWeight: 600,
              }}>
                ⚡ Via Sigma import (dynamic)
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', lineHeight: 1.3 }}>
            {technique.name}
          </h3>

          {/* Score gauge + breakdown */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-5)' }}>
            <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={8} />
                <circle
                  cx="50" cy="50" r={r} fill="none" stroke={strokeColor} strokeWidth={8}
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: strokeColor, lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>/100</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              {/* Coverage badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 'var(--radius-full)',
                background: levelBg[level], color: strokeColor, fontWeight: 700,
                fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)',
              }}>
                {levelEmoji[level]} {getCoverageLevelLabel(score)}
              </div>

              {/* Score breakdown bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Sigma rules', value: rulesScore, max: 40, color: 'var(--color-info)', icon: '🔍' },
                  { label: 'Preventive controls', value: preventiveScore, max: 30, color: 'var(--color-success)', icon: '🛡️' },
                  { label: 'Detective controls', value: detectiveScore, max: 20, color: 'var(--purple-500)', icon: '👁️' },
                  { label: 'Corrective/Response', value: correctiveBonus, max: 10, color: 'var(--color-warning)', icon: '🔄' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, minWidth: 16 }}>{item.icon}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(item.value / item.max) * 100}%`,
                        background: item.color, borderRadius: 'var(--radius-full)',
                        transition: 'width 0.8s ease',
                        minWidth: item.value > 0 ? 4 : 0,
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: item.value > 0 ? item.color : 'var(--text-muted)', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                      {item.value}/{item.max}
                    </span>
                  </div>
                ))}
              </div>

              {/* "Why" diagnosis */}
              <div style={{
                marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
                background: score === 0 ? 'var(--color-danger-dim)' : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5,
              }}>
                {score === 0 && '⚠️ No control or rule covers this technique.'}
                {score > 0 && rulesScore === 0 && '💡 Covered only by controls — no Sigma detection rule.'}
                {score > 0 && rulesScore > 0 && preventiveScore === 0 && detectiveScore === 0 && '💡 Covered only by Sigma rules — no active control.'}
                {score > 0 && rulesScore > 0 && (preventiveScore > 0 || detectiveScore > 0) && '✅ Combined coverage: rules + controls.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 0 var(--space-5)' }} />

        {/* ── Platforms + Prevalence ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {technique.platforms && (
            <div>
              <div className="detail-section-label">Platforms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {technique.platforms.map(p => (
                  <span key={p} className="badge badge-info" style={{ fontSize: 10 }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="detail-section-label">Observed prevalence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${technique.prevalence || 50}%`,
                  background: 'var(--gradient-purple)', borderRadius: 'var(--radius-full)',
                }} />
              </div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {technique.prevalence || 50}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Data Sources (from mitigationsData) ── */}
        {intel.dataSources?.length > 0 && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">📡 Recommended data sources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {intel.dataSources.map((ds, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', background: 'var(--color-info-dim)',
                  border: '1px solid var(--color-info)', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)', color: 'var(--color-info)',
                }}>
                  <span style={{ opacity: 0.6 }}>📄</span> {ds}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Covering Controls ── */}
        {techniqueScore?.coveringControls?.length > 0 ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">🛡️ Active controls ({techniqueScore.coveringControls.length})</div>
            {techniqueScore.coveringControls.map(ctrl => (
              <div key={ctrl.id} style={{
                padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)',
                background: 'var(--color-success-dim)', border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>✓ {ctrl.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Type: <strong>{ctrl.type}</strong> · Category: {ctrl.categoryName}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              ✗ No active security control for this technique
            </div>
          </div>
        )}

        {/* ── Covering Rules ── */}
        {techniqueScore?.coveringRules?.length > 0 ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">🔍 Detection rules ({techniqueScore.coveringRules.length})</div>
            {techniqueScore.coveringRules.map(rule => {
              const isExact = rule.techniques?.includes(technique.id);
              return (
                <div key={rule.id} style={{
                  padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)',
                  background: 'var(--color-info-dim)', border: '1px solid var(--color-info)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-info)', fontSize: 'var(--text-sm)' }}>
                      🔍 {rule.title}
                    </span>
                    {!isExact && (
                      <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--color-warning-dim)', color: 'var(--color-warning)', borderRadius: 'var(--radius-full)' }}>
                        inherited
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Source: <strong>{rule.source}</strong> · Level: <strong style={{ color: rule.level === 'critical' ? 'var(--color-danger)' : rule.level === 'high' ? 'var(--color-orange)' : 'var(--color-warning)' }}>{rule.level}</strong>
                    {!isExact && ' · ⚠️ Partial coverage (parent/child technique)'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              ✗ No Sigma rule imported for this technique
            </div>
          </div>
        )}

        {/* ── Sigma Guidance (from mitigationsData) ── */}
        {!intel._fallback && intel.sigmaGuidance && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">✏️ Sigma / Detection guidance</div>
            <div style={{
              padding: 'var(--space-3)', background: 'var(--violet-soft-weak)',
              border: '1px solid var(--violet-border)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              {intel.sigmaGuidance}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {recs.length > 0 && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">💡 Recommendations ({recs.length})</div>
            {recs.map((rec, i) => (
              <div key={i} style={{
                padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)',
                background: 'var(--violet-soft-weak)', borderRadius: 'var(--radius-md)',
                borderLeft: `3px solid ${recPriorityColors[rec.priority] || 'var(--purple-500)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {recTypeIcon[rec.type] || '💡'} {rec.title}
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 9, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: recPriorityBg[rec.priority] || 'var(--violet-soft)',
                    color: recPriorityColors[rec.priority] || 'var(--purple-300)', fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {rec.priority}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {rec.description}
                </div>
                {rec.dataSources?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    📡 Sources: {rec.dataSources.join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Estimated effort: {rec.effort}</span>
                  {rec.mitigations?.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      MITRE: {rec.mitigations.map(m => m.id).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ATT&CK Link ── */}
        <a
          href={`https://attack.mitre.org/techniques/${technique.id.replace('.', '/')}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}
        >
          🔗 View on MITRE ATT&CK →
        </a>
      </div>
    </>
  );
}
