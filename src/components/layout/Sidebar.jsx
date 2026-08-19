import { useState } from 'react';
import { useApp } from '../../context/AppContext';

/* ── Inline SVG icons (stroke style, inherits currentColor) ── */
function Icon({ children, size = 18 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  soc: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  attack: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  analysis: (
    <>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </>
  ),
  zap: (
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  ),
  reset: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M12 10a2 2 0 1 0 2 2" />
      <line x1="12" y1="12" x2="19.07" y2="4.93" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      <path d="M3.05 11a9 9 0 0 1 .5-2m1.8-3.4A9 9 0 0 1 12 3" />
    </>
  ),
  chevronLeft: (
    <polyline points="15 18 9 12 15 6" />
  ),
  chevronRight: (
    <polyline points="9 18 15 12 9 6" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>
  ),
  moon: (
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  ),
};

const PAGES = [
  { id: 'dashboard', label: 'Dashboard',        icon: 'home',    page: 'dashboard' },
  { id: 'soc',       label: 'SOC Center',       icon: 'soc',     page: 'soc' },
  { id: 'threat',    label: 'Threat Intel',     icon: 'attack',  page: 'threat' },
  { id: 'scan',      label: 'Scan Engine',      icon: 'radar',   page: 'scan', highlight: true },
  { id: 'history',   label: 'Reports & History',icon: 'history', page: 'history' },
];

export default function Sidebar({ activePage, onNavigate, open }) {
  const { state, toggleTheme, runAnalysis, reset } = useApp();
  const { theme, detectionRules, selectedActors, analysisResult, analysesHistory, loading } = state;
  const [collapsed, setCollapsed] = useState(false);

  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const postureScore = analysisResult?.postureScore ?? null;
  const postureColor = postureScore === null ? 'var(--text-tertiary)'
    : postureScore >= 61 ? 'var(--color-success)'
    : postureScore >= 31 ? 'var(--color-warning)'
    : postureScore > 0 ? 'var(--color-orange)'
    : 'var(--color-danger)';

  const badgeFor = (id) => {
    if (id === 'soc') {
      const n = ownRules.length;
      return n > 0 ? n : null;
    }
    if (id === 'threat') return selectedActors.length > 0 ? selectedActors.length : null;
    if (id === 'history') return (analysesHistory || []).length > 0 ? analysesHistory.length : null;
    return null;
  };

  async function handleAnalyze() {
    onNavigate('scan');
  }

  const sidebarClasses = [
    'app-sidebar',
    open ? 'open' : '',
    collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      {/* Logo Header with Collapse Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-3)', marginBottom: 'var(--space-2)',
        borderBottom: '1px solid var(--border-subtle)', width: '100%',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          {!collapsed && (
            <div className="sidebar-label" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="brand-title">
                ATTACK<span style={{ color: 'var(--purple-400)' }}>PRISM</span>
              </div>
              <div className="sidebar-subtitle" style={{
                fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em',
                marginTop: 2, whiteSpace: 'nowrap',
              }}>
                ADVERSARY DEFENSE ENGINE
              </div>
            </div>
          )}
        </div>

        {/* Shrink / Expand Toggle Button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent', border: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)', borderRadius: 'var(--radius-sm)',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--purple-400)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <Icon size={14}>{collapsed ? ICONS.chevronRight : ICONS.chevronLeft}</Icon>
        </button>
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
              className={isActive ? 'nav-item-active' : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 'var(--space-3)',
                padding: collapsed ? '10px 0' : 'var(--space-3) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                position: 'relative',
                background: isActive ? 'var(--violet-soft)' : 'transparent',
                borderLeft: !collapsed && isActive ? '3px solid var(--purple-400)' : '3px solid transparent',
                color: isActive ? 'var(--purple-300)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon>{ICONS[item.icon]}</Icon>
              {!collapsed && (
                <>
                  <span className="sidebar-label" style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>
                  {badge !== null && badge > 0 && (
                    <span className="nav-badge" style={{ marginLeft: 'auto', flexShrink: 0 }}>{badge}</span>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />

        {/* Analyze button */}
        <div
          title="Launch scan engine"
          onClick={handleAnalyze}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 'var(--space-3)',
            padding: collapsed ? '10px 0' : 'var(--space-3) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--gradient-purple)',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity var(--transition-fast)',
            flexShrink: 0,
          }}
        >
          <Icon size={17}>{ICONS.zap}</Icon>
          {!collapsed && (
            <span className="sidebar-label" style={{
              fontSize: 'var(--text-sm)', fontWeight: 700, color: 'white',
              animation: loading ? 'pulse 1.2s infinite' : 'none',
            }}>
              {loading ? 'Analyzing…' : 'Run analysis'}
            </span>
          )}
        </div>
      </div>

      {/* Score ring (if analysis exists) */}
      {postureScore !== null && (
        <div title={`Posture: ${postureScore}/100`} style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 'var(--space-3)',
          padding: collapsed ? 'var(--space-2) 0' : 'var(--space-3) var(--space-3)',
          flexShrink: 0,
        }}>
          <MiniRing score={postureScore} color={postureColor} />
          {!collapsed && (
            <div className="sidebar-label">
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Posture score</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: postureColor }}>{postureScore}/100</div>
            </div>
          )}
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
          >
            <Icon size={14}>{ICONS.moon}</Icon>
          </button>
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => theme !== 'light' && toggleTheme()}
            title="Light mode"
          >
            <Icon size={14}>{ICONS.sun}</Icon>
          </button>
        </div>
        {ownRules.length > 0 && (
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
            <Icon size={15}>{ICONS.reset}</Icon>
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