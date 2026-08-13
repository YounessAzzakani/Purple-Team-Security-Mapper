import { useApp } from '../../context/AppContext';

const PAGES = [
  { id: 'home',     label: 'Overview',  icon: '🏠', page: 'home' },
  { id: 'soc',      label: 'Defenses',  icon: '🛡️', page: 'soc' },
  { id: 'attack',   label: 'ATT&CK',    icon: '⚔️', page: 'attack' },
  { id: 'analysis', label: 'Results',   icon: '📊', page: 'analysis' },
];

export default function Sidebar({ activePage, onNavigate, open }) {
  const { state, toggleTheme, runAnalysis, reset } = useApp();
  const { theme, enabledControls, detectionRules, selectedActors, analysisResult, loading } = state;

  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const postureScore = analysisResult?.postureScore ?? null;
  const postureColor = postureScore === null ? 'var(--text-tertiary)'
    : postureScore >= 61 ? 'var(--color-success)'
    : postureScore >= 31 ? 'var(--color-warning)'
    : postureScore > 0 ? 'var(--color-orange)'
    : 'var(--color-danger)';

  const badgeFor = (id) => {
    if (id === 'soc') {
      const n = enabledControls.length + ownRules.length;
      return n > 0 ? n : null;
    }
    if (id === 'attack') return selectedActors.length > 0 ? selectedActors.length : null;
    if (id === 'analysis') return analysisResult ? analysisResult.gaps?.length : null;
    return null;
  };

  async function handleAnalyze() {
    try { await runAnalysis(); onNavigate('analysis'); } catch { /* errors shown in UI */ }
  }

  return (
    <aside className={open ? 'app-sidebar open' : 'app-sidebar'}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)', width: '100%',
        flexShrink: 0,
      }}>
        <div className="logo-icon" style={{ width: 36, height: 36, fontSize: '1rem', flexShrink: 0 }}>🟣</div>
        <div className="logo-text sidebar-label" style={{ fontSize: 'var(--text-sm)' }}>
          Purple Team
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 var(--space-2)', flex: 1 }}>
        {PAGES.map(item => {
          const isActive = item.page === activePage;
          const badge = badgeFor(item.id);
          return (
            <div
              key={item.id}
              title={item.label}
              onClick={() => onNavigate(item.page)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                position: 'relative',
                background: isActive ? 'var(--violet-soft)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--purple-400)' : '3px solid transparent',
                color: isActive ? 'var(--purple-300)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <span className="sidebar-label" style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 700 : 500 }}>
                {item.label}
              </span>
              {badge !== null && badge > 0 && (
                <span className="nav-badge" style={{ marginLeft: 'auto', flexShrink: 0 }}>{badge}</span>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />

        {/* Analyze button */}
        <div
          title="Run analysis"
          onClick={handleAnalyze}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--gradient-purple)',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity var(--transition-fast)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, animation: loading ? 'pulse 1.2s infinite' : 'none' }}>{loading ? '⏳' : '⚡'}</span>
          <span className="sidebar-label" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'white' }}>
            {loading ? 'Analyzing…' : 'Run analysis'}
          </span>
        </div>
      </div>

      {/* Score ring (if analysis exists) */}
      {postureScore !== null && (
        <div title={`Posture: ${postureScore}/100`} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-3)',
          flexShrink: 0,
        }}>
          <MiniRing score={postureScore} color={postureColor} />
          <div className="sidebar-label">
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Posture score</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: postureColor }}>{postureScore}/100</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: 'var(--space-3) var(--space-2)',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {/* Theme switch — Dark / Light */}
        <div className="theme-switch" title="Color theme — dark or light">
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => theme !== 'dark' && toggleTheme()}
            title="Dark mode"
          >🌙</button>
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => theme !== 'light' && toggleTheme()}
            title="Light mode"
          >☀️</button>
        </div>
        {(enabledControls.length > 0 || ownRules.length > 0) && (
          <div
            title="Reset session"
            onClick={reset}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>🔄</span>
            <span className="sidebar-label" style={{ fontSize: 'var(--text-xs)' }}>
              Reset
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function MiniRing({ score, color }) {
  const r = 14; const circ = 2 * Math.PI * r;
  return (
    <svg width={36} height={36} style={{ flexShrink: 0 }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={4} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '18px 18px', transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={18} y={22} textAnchor="middle" fill={color} fontSize={8} fontWeight={800}>{score}</text>
    </svg>
  );
}