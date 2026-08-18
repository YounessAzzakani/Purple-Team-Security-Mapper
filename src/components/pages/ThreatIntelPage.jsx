import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { THREAT_ACTORS, ACTOR_MAP } from '../../data/threatActors';
import { TACTICS, TACTIC_MAP, TECHNIQUE_MAP } from '../../data/attackData';
import { runGapAnalysis, getCoverageLevel, getCoverageLevelLabel } from '../../services/coverageEngine';
import ActorGraph from '../attack/ActorGraph';
import AttackMatrix from '../AttackMatrix';
import TechniqueDetail from '../TechniqueDetail';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';

/* ── Inline SVG Icons ── */
function Icon({ name, size = 16, style = {} }) {
  const icons = {
    target: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    crosshair: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    radar: (
      <>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6a6 6 0 1 0 6 6" />
        <path d="M12 10a2 2 0 1 0 2 2" />
        <line x1="12" y1="12" x2="19.07" y2="4.93" />
      </>
    ),
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    alert: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    externalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true"
    >
      {icons[name] || icons.target}
    </svg>
  );
}

// Kill-chain tactical sequence
const KILL_CHAIN_TACTICS = [
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

export default function ThreatIntelPage() {
  const { state, toggleActor } = useApp();
  const [activeActorId, setActiveActorId] = useState(THREAT_ACTORS[0].id); // Active group being inspected
  const [originFilter, setOriginFilter] = useState('all'); // 'all' | 'russia' | 'china' | 'korea' | 'crime'
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [viewMode, setViewMode] = useState('killchain'); // 'killchain' | 'radar' | 'graph' | 'matrix'

  // Live gap analysis
  const preview = useMemo(
    () => runGapAnalysis(state.detectionRules, state.selectedActors),
    [state.detectionRules, state.selectedActors],
  );

  const techniqueScores = preview.techniqueScores;

  // Live coverage calculation per actor
  const actorStats = useMemo(() => {
    return THREAT_ACTORS.map(actor => {
      const techs = actor.techniques.map(tid => ({
        id: tid,
        scoreObj: techniqueScores[tid] || { score: 0, level: 'none' },
      }));
      const covered = techs.filter(t => t.scoreObj.score > 30).length;
      const total = techs.length;
      const percent = total ? Math.round((covered / total) * 100) : 0;
      return {
        actorId: actor.id,
        total,
        covered,
        uncovered: total - covered,
        percent,
      };
    });
  }, [techniqueScores]);

  // Active inspected actor object
  const activeActor = useMemo(() => {
    return ACTOR_MAP[activeActorId] || THREAT_ACTORS[0];
  }, [activeActorId]);

  const activeActorStat = useMemo(() => {
    return actorStats.find(s => s.actorId === activeActor.id) || { total: 0, covered: 0, percent: 0 };
  }, [actorStats, activeActor.id]);

  // Filtered actors list
  const filteredActors = useMemo(() => {
    if (originFilter === 'russia') return THREAT_ACTORS.filter(a => a.origin.includes('Russia'));
    if (originFilter === 'china') return THREAT_ACTORS.filter(a => a.origin.includes('China'));
    if (originFilter === 'korea') return THREAT_ACTORS.filter(a => a.origin.includes('Korea'));
    if (originFilter === 'crime') return THREAT_ACTORS.filter(a => a.origin.includes('Criminal'));
    return THREAT_ACTORS;
  }, [originFilter]);

  // Group techniques by Kill-Chain Tactic for the active APT
  const actorTtpByTactic = useMemo(() => {
    const map = {};
    KILL_CHAIN_TACTICS.forEach(tId => {
      map[tId] = [];
    });

    activeActor.techniques.forEach(tid => {
      // Find which tactic this technique belongs to
      let foundTactic = null;
      for (const tac of TACTICS) {
        if (tac.techniques?.some(t => t.id === tid || t.id.startsWith(tid) || tid.startsWith(t.id))) {
          foundTactic = tac.id;
          break;
        }
      }
      const finalTactic = foundTactic || 'execution';
      if (!map[finalTactic]) map[finalTactic] = [];

      const techObj = TECHNIQUE_MAP[tid] || { id: tid, name: tid, tactic: finalTactic };
      const scoreObj = techniqueScores[tid] || { score: 0, level: 'none' };
      map[finalTactic].push({
        ...techObj,
        score: scoreObj.score,
        scoreObj,
      });
    });

    return map;
  }, [activeActor, techniqueScores]);

  // Radar data for the active APT group
  const actorRadarData = useMemo(() => {
    return KILL_CHAIN_TACTICS.map(tId => {
      const tacName = TACTIC_MAP[tId]?.name.split(' ')[0] || tId;
      const groupTtpCount = actorTtpByTactic[tId]?.length || 0;
      const groupCoverageAvg = groupTtpCount > 0
        ? Math.round(actorTtpByTactic[tId].reduce((sum, t) => sum + t.score, 0) / groupTtpCount)
        : 0;

      return {
        tactic: tacName,
        ttpCount: groupTtpCount * 25, // Scaled for radar
        defenseScore: groupCoverageAvg,
      };
    });
  }, [actorTtpByTactic]);

  const openTechnique = (tech, ts) => {
    setSelectedTechnique(tech);
    setSelectedScore(ts);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ════════════════════════════════════════════════════════════
       * HEADER & TELEMETRY STRIP
       * ════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(13, 18, 31, 0.65)',
        border: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #fb923c 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 0 16px rgba(251, 146, 60, 0.35)',
          }}>
            <Icon name="crosshair" size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Threat Intelligence & Adversary TTPs
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Inspect nation-state APT groups, analyze attack flows, and measure defensive posture per TTP
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div className="telemetry-pill">
            <span className="pulse-dot online" />
            <span>APT PROFILES: <strong style={{ color: '#f8fafc' }}>{THREAT_ACTORS.length}</strong></span>
          </div>
          <div className="telemetry-pill">
            <Icon name="target" size={13} style={{ color: '#fb923c' }} />
            <span>SELECTED FOR SCAN: <strong style={{ color: '#fb923c' }}>{state.selectedActors.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TOP SECTION: APT GROUP DIRECTORY & FILTER STRIP
       * ════════════════════════════════════════════════════════════ */}
      <div className="glass-panel" style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
              🎯 Adversary Group Profiles
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Click any threat actor to inspect their kill chain and live defense coverage
            </p>
          </div>

          {/* Origin filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Groups' },
              { id: 'russia', label: '🇷🇺 Russia (GRU/SVR)' },
              { id: 'china', label: '🇨🇳 China (MSS)' },
              { id: 'korea', label: '🇰🇵 North Korea' },
              { id: 'crime', label: '💰 Cybercrime' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setOriginFilter(f.id)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  background: originFilter === f.id ? 'linear-gradient(135deg, #7c3aed, #fb923c)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${originFilter === f.id ? '#fb923c' : 'var(--border-subtle)'}`,
                  color: originFilter === f.id ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: originFilter === f.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Card Grid of APTs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
          {filteredActors.map(actor => {
            const isInspected = activeActorId === actor.id;
            const isSelectedForScan = state.selectedActors.includes(actor.id);
            const stat = actorStats.find(s => s.actorId === actor.id) || { percent: 0, covered: 0, total: 0 };
            const barColor = stat.percent >= 60 ? '#10b981' : stat.percent >= 30 ? '#f59e0b' : '#f43f5e';

            return (
              <div
                key={actor.id}
                onClick={() => setActiveActorId(actor.id)}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: isInspected
                    ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(124, 58, 237, 0.15))'
                    : 'rgba(255, 255, 255, 0.025)',
                  border: `1px solid ${isInspected ? '#fb923c' : 'var(--border-subtle)'}`,
                  boxShadow: isInspected ? '0 0 16px rgba(251, 146, 60, 0.25)' : 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isInspected ? '#fb923c' : '#f8fafc' }}>
                        {actor.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {actor.origin} · {actor.aliases[0] || 'APT'}
                    </div>
                  </div>

                  {/* Toggle include in analysis */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActor(actor.id); }}
                    style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      background: isSelectedForScan ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isSelectedForScan ? '#10b981' : 'var(--border-subtle)'}`,
                      color: isSelectedForScan ? '#10b981' : 'var(--text-tertiary)',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                    title={isSelectedForScan ? 'Selected in global scan' : 'Click to include in global scan'}
                  >
                    {isSelectedForScan ? '✓ Included' : '+ Select'}
                  </button>
                </div>

                {/* Coverage bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{stat.covered}/{stat.total} TTPs Defended</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: barColor }}>{stat.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${stat.percent}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * MAIN WORKSPACE: ACTIVE APT GROUP TTP INTELLIGENCE
       * ════════════════════════════════════════════════════════════ */}
      <div className="command-hero" style={{ padding: 'var(--space-6) var(--space-8)' }}>

        {/* Active Group Header Banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="telemetry-pill" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                {activeActor.origin}
              </span>
              {activeActor.aliases.map(a => (
                <span key={a} style={{
                  fontFamily: 'JetBrains Mono', fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.05)', color: '#c084fc', border: '1px solid var(--border-subtle)',
                }}>
                  {a}
                </span>
              ))}
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {activeActor.name}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
              {activeActor.description}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700 }}>TARGET SECTORS:</span>
              {activeActor.sector.map(sec => (
                <span key={sec} style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', fontWeight: 600,
                }}>
                  {sec}
                </span>
              ))}
            </div>
          </div>

          {/* Defense Posture Against this Group */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            background: 'rgba(13, 18, 31, 0.75)', padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Defense Readiness
            </span>
            <div style={{
              fontSize: '2rem', fontWeight: 900, fontFamily: 'JetBrains Mono',
              color: activeActorStat.percent >= 60 ? '#10b981' : activeActorStat.percent >= 30 ? '#f59e0b' : '#f43f5e',
            }}>
              {activeActorStat.percent}%
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {activeActorStat.covered} Defended / {activeActorStat.uncovered} Gaps
            </span>
          </div>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'killchain', label: '⚔️ Horizontal Kill-Chain Flow' },
              { id: 'radar', label: '🕸️ Attack Vector Radar' },
              { id: 'graph', label: '🌐 Interactive Force Graph' },
              { id: 'matrix', label: '🗺️ Full Matrix Heatmap' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                style={{
                  fontSize: 11, padding: '4px 12px', borderRadius: 'var(--radius-md)',
                  background: viewMode === v.id ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${viewMode === v.id ? '#06b6d4' : 'var(--border-subtle)'}`,
                  color: viewMode === v.id ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: viewMode === v.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Defended
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Partial
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} /> Exposed Gap
            </span>
          </div>
        </div>

        {/* ── VIEW 1: HORIZONTAL TTP KILL-CHAIN FLOW ── */}
        {viewMode === 'killchain' && (
          <div style={{ overflowX: 'auto', paddingBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', minWidth: 'max-content' }}>
              {KILL_CHAIN_TACTICS.map((tacticId, idx) => {
                const tacticObj = TACTIC_MAP[tacticId] || { name: tacticId };
                const ttpList = actorTtpByTactic[tacticId] || [];
                const hasTtps = ttpList.length > 0;

                return (
                  <div
                    key={tacticId}
                    style={{
                      width: 175,
                      display: 'flex', flexDirection: 'column', gap: 6,
                      background: hasTtps ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.005)',
                      border: `1px solid ${hasTtps ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      opacity: hasTtps ? 1 : 0.45,
                    }}
                  >
                    {/* Tactic Column Title */}
                    <div style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: hasTtps ? '#22d3ee' : 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span className="truncate">{idx + 1}. {tacticObj.name.split(' ')[0]}</span>
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}>{ttpList.length}</span>
                    </div>

                    {/* TTPs Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 120 }}>
                      {hasTtps ? (
                        ttpList.map(ttp => {
                          const level = getCoverageLevel(ttp.score);
                          const color = level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : level === 'low' ? '#fb923c' : '#f43f5e';

                          return (
                            <div
                              key={ttp.id}
                              onClick={() => openTechnique(ttp, ttp.scoreObj)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: 'rgba(13, 18, 31, 0.9)',
                                border: `1px solid ${color}55`,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                                display: 'flex', flexDirection: 'column', gap: 2,
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = color;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 0 10px ${color}33`;
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = `${color}55`;
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700, color: '#c084fc' }}>
                                  {ttp.id}
                                </span>
                                <span style={{
                                  fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
                                  background: `${color}20`, color,
                                }}>
                                  {level === 'none' ? 'GAP' : `${ttp.score}%`}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }} className="truncate">
                                {ttp.name}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 30 }}>
                          —
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 2: TTP RADAR ATTACK VECTOR INTENSITY ── */}
        {viewMode === 'radar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={actorRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                  <PolarAngleAxis dataKey="tactic" tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Radar name="Adversary TTP Intensity" dataKey="ttpCount" stroke="#fb923c" fill="#fb923c" fillOpacity={0.25} />
                  <Radar name="SOC Defense Score" dataKey="defenseScore" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(13, 18, 31, 0.95)', border: '1px solid rgba(251, 146, 60, 0.3)', borderRadius: 8, color: '#f8fafc' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                Tactical Overlap & Threat Intensity
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                The amber perimeter represents <strong>{activeActor.name}</strong>'s preferred offensive attack vectors. The green zone represents your SOC's detection capability.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {activeActor.techniques.map(tid => {
                  const tech = TECHNIQUE_MAP[tid] || { id: tid, name: tid };
                  const score = techniqueScores[tid]?.score ?? 0;
                  const isCovered = score > 30;
                  return (
                    <div key={tid} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 8px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)',
                      fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono', color: '#c084fc', fontWeight: 700 }}>{tid}</span>
                        <span style={{ color: 'var(--text-secondary)' }} className="truncate">{tech.name}</span>
                      </div>
                      <span style={{ color: isCovered ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                        {isCovered ? `Covered (${score}%)` : 'Unmitigated'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 3: INTERACTIVE FORCE GRAPH ── */}
        {viewMode === 'graph' && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <ActorGraph
              techniqueScores={techniqueScores}
              selectedActors={[activeActor.id]}
              onSelectTechnique={openTechnique}
              onToggleActor={toggleActor}
              theme={state.theme}
            />
          </div>
        )}

        {/* ── VIEW 4: ATT&CK MATRIX ── */}
        {viewMode === 'matrix' && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <AttackMatrix techniqueScores={techniqueScores} onTechniqueClick={openTechnique} />
          </div>
        )}

      </div>

      {/* Technique detail panel overlay */}
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