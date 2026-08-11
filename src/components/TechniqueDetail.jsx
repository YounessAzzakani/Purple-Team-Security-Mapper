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
    none: '#ef4444', low: '#f97316', medium: '#eab308', high: '#22c55e',
  };
  const levelBg = {
    none: 'rgba(239,68,68,0.1)', low: 'rgba(249,115,22,0.1)',
    medium: 'rgba(234,179,8,0.1)', high: 'rgba(34,197,94,0.1)',
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
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa',
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
              padding: '3px 10px', background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-full)',
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
                padding: '3px 8px', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)',
                borderRadius: 'var(--radius-full)', fontSize: 10, color: '#fb923c', fontWeight: 600,
              }}>
                ⚡ Via import Sigma
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
                  { label: 'Règles Sigma', value: rulesScore, max: 40, color: '#60a5fa', icon: '🔍' },
                  { label: 'Contrôles préventifs', value: preventiveScore, max: 30, color: '#22c55e', icon: '🛡️' },
                  { label: 'Contrôles détectifs', value: detectiveScore, max: 20, color: '#a855f7', icon: '👁️' },
                  { label: 'Correctif/Réponse', value: correctiveBonus, max: 10, color: '#eab308', icon: '🔄' },
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
                background: score === 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5,
              }}>
                {score === 0 && '⚠️ Aucun contrôle ni règle ne couvre cette technique.'}
                {score > 0 && rulesScore === 0 && '💡 Couverte uniquement par des contrôles — aucune règle de détection Sigma.'}
                {score > 0 && rulesScore > 0 && preventiveScore === 0 && detectiveScore === 0 && '💡 Couverte uniquement par des règles Sigma — aucun contrôle actif.'}
                {score > 0 && rulesScore > 0 && (preventiveScore > 0 || detectiveScore > 0) && '✅ Couverture combinée : règles + contrôles.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 0 var(--space-5)' }} />

        {/* ── Platforms + Prevalence ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {technique.platforms && (
            <div>
              <div className="detail-section-label">Plateformes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {technique.platforms.map(p => (
                  <span key={p} className="badge badge-info" style={{ fontSize: 10 }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="detail-section-label">Prévalence observée</div>
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
            <div className="detail-section-label">📡 Sources de données recommandées</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {intel.dataSources.map((ds, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', background: 'rgba(96,165,250,0.08)',
                  border: '1px solid rgba(96,165,250,0.15)', borderRadius: 'var(--radius-sm)',
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
            <div className="detail-section-label">🛡️ Contrôles actifs ({techniqueScore.coveringControls.length})</div>
            {techniqueScore.coveringControls.map(ctrl => (
              <div key={ctrl.id} style={{
                padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ fontWeight: 600, color: '#22c55e', fontSize: 'var(--text-sm)' }}>✓ {ctrl.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Type: <strong>{ctrl.type}</strong> · Catégorie: {ctrl.categoryName}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              ✗ Aucun contrôle de sécurité actif pour cette technique
            </div>
          </div>
        )}

        {/* ── Covering Rules ── */}
        {techniqueScore?.coveringRules?.length > 0 ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">🔍 Règles de détection ({techniqueScore.coveringRules.length})</div>
            {techniqueScore.coveringRules.map(rule => {
              const isExact = rule.techniques?.includes(technique.id);
              return (
                <div key={rule.id} style={{
                  padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)',
                  background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: 'var(--text-sm)' }}>
                      🔍 {rule.title}
                    </span>
                    {!isExact && (
                      <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(234,179,8,0.15)', color: '#eab308', borderRadius: 'var(--radius-full)' }}>
                        hérité
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Source: <strong>{rule.source}</strong> · Niveau: <strong style={{ color: rule.level === 'critical' ? '#ef4444' : rule.level === 'high' ? '#f97316' : '#eab308' }}>{rule.level}</strong>
                    {!isExact && ' · ⚠️ Couverture partielle (technique parente/enfant)'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              ✗ Aucune règle Sigma importée pour cette technique
            </div>
          </div>
        )}

        {/* ── Sigma Guidance (from mitigationsData) ── */}
        {!intel._fallback && intel.sigmaGuidance && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">✏️ Guidance Sigma / Détection</div>
            <div style={{
              padding: 'var(--space-3)', background: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              {intel.sigmaGuidance}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {recs.length > 0 && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="detail-section-label">💡 Recommandations ({recs.length})</div>
            {recs.map((rec, i) => (
              <div key={i} style={{
                padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)',
                background: 'rgba(139,92,246,0.07)', borderRadius: 'var(--radius-md)',
                borderLeft: `3px solid ${recPriorityColors[rec.priority] || '#8b5cf6'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {recTypeIcon[rec.type] || '💡'} {rec.title}
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 9, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: `${recPriorityColors[rec.priority]}22`,
                    color: recPriorityColors[rec.priority], fontWeight: 700, textTransform: 'uppercase',
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
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Effort: {rec.effort}</span>
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
          🔗 Voir sur MITRE ATT&CK →
        </a>
      </div>
    </>
  );
}
