import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TACTICS } from '../../data/attackData';
import { THREAT_ACTORS } from '../../data/threatActors';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

/* ── Inline Sleek Geometric SVG Icons ── */
function Icon({ name, size = 18, className = '', style = {} }) {
  const icons = {
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    ),
    shieldCheck: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </>
    ),
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
    radar: (
      <>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6a6 6 0 1 0 6 6" />
        <path d="M12 10a2 2 0 1 0 2 2" />
        <line x1="12" y1="12" x2="19.07" y2="4.93" />
      </>
    ),
    zap: (
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    ),
    alert: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    activity: (
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    ),
    terminal: (
      <>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </>
    ),
    arrowRight: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    arrowUpRight: (
      <>
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </>
    ),
    fileCode: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="10 13 8 15 10 17" />
        <polyline points="14 13 16 15 14 17" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    trendingUp: (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    cpu: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </>
    ),
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {icons[name] || icons.shield}
    </svg>
  );
}

/* ── Glowing Radial Posture Gauge ── */
function GlowingPostureGauge({ score }) {
  const validScore = score ?? 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  const color = validScore >= 75 ? '#10b981'
    : validScore >= 50 ? '#06b6d4'
    : validScore >= 30 ? '#f59e0b'
    : '#f43f5e';

  const riskLabel = validScore >= 75 ? 'HARDENED DEFENSE'
    : validScore >= 50 ? 'ELEVATED POSTURE'
    : validScore >= 30 ? 'MODERATE RISK'
    : 'CRITICAL EXPOSURE';

  const riskBadgeClass = validScore >= 75 ? 'sev-pill good'
    : validScore >= 50 ? 'sev-pill low'
    : validScore >= 30 ? 'sev-pill medium'
    : 'sev-pill critical';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none" stroke="var(--border-default)" strokeWidth="10"
          />
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="60%" stopColor={color} />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Animated active progress */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none" stroke="url(#gaugeGradient)" strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </svg>

        {/* Center score readout */}
        <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {score !== null ? score : '--'}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>
            / 100
          </span>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <span className={riskBadgeClass} style={{ fontSize: 10, letterSpacing: '0.06em' }}>
          {riskLabel}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage({ onNavigate }) {
  const { state, runAnalysis: triggerAnalysis } = useApp();
  const { analysisResult, detectionRules, selectedActors, analysesHistory, loading } = state;

  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const postureScore = analysisResult?.postureScore ?? null;

  // Severity rule counts
  const ruleCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    ownRules.forEach(r => {
      const lvl = (r.level || 'medium').toLowerCase();
      if (counts[lvl] !== undefined) counts[lvl]++;
      else counts.medium++;
    });
    return counts;
  }, [ownRules]);

  async function handleQuickAnalyze() {
    try {
      await triggerAnalysis();
    } catch {
      /* errors handled in context */
    }
  }

  // Tactic radar data mapping
  const radarData = useMemo(() => {
    return TACTICS.map(t => ({
      tactic: t.name.split(' ')[0],
      fullName: t.name,
      score: analysisResult?.tacticSummary?.[t.id]?.averageScore || 0,
    }));
  }, [analysisResult]);

  // Technique distribution breakdown for Donut Chart
  const distributionData = useMemo(() => {
    if (!analysisResult) return [];
    return [
      { name: 'Defended (Good)', value: analysisResult.wellCoveredCount || 0, color: '#10b981' },
      { name: 'Partial Coverage', value: analysisResult.partialGaps?.length || 0, color: '#f59e0b' },
      { name: 'Weak Detection', value: analysisResult.weakGaps?.length || 0, color: '#fb923c' },
      { name: 'Unmitigated (Zero)', value: analysisResult.criticalGaps?.length || 0, color: '#f43f5e' },
    ].filter(d => d.value > 0);
  }, [analysisResult]);

  // Historical trend data
  const trendData = useMemo(() => {
    if (analysesHistory.length >= 2) {
      return [...analysesHistory].reverse().map((a, i) => ({
        index: `Run #${i + 1}`,
        date: new Date(a.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        score: a.posture_score ?? 0,
      }));
    }
    if (postureScore !== null) {
      return [
        { index: 'Initial', date: 'Base', score: Math.max(0, postureScore - 15) },
        { index: 'Current', date: 'Now', score: postureScore },
      ];
    }
    return [];
  }, [analysesHistory, postureScore]);

  // Selected Threat Actors summary
  const selectedActorObjects = useMemo(() => {
    return THREAT_ACTORS.filter(a => selectedActors.includes(a.id));
  }, [selectedActors]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ════════════════════════════════════════════════════════════
       * TIER 1: EXECUTIVE TELEMETRY & SYSTEM STATUS BAR
       * ════════════════════════════════════════════════════════════ */}
      <div className="glass-panel" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div className="telemetry-pill">
            <span className="pulse-dot online" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>ATT&CK v14.1</span>
            <span style={{ color: 'var(--text-tertiary)' }}>// READY</span>
          </div>
          <div className="telemetry-pill">
            <Icon name="cpu" size={13} style={{ color: '#a78bfa' }} />
            <span>ENGINE: <strong style={{ color: 'var(--text-primary)' }}>Level-Weighted v2.0</strong></span>
          </div>
          <div className="telemetry-pill">
            <Icon name="target" size={13} style={{ color: '#22d3ee' }} />
            <span>PROFILES: <strong style={{ color: 'var(--text-primary)' }}>{selectedActors.length} Active</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('soc')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Icon name="fileCode" size={14} />
            <span>Ingest Rules</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('threat')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Icon name="crosshair" size={14} />
            <span>Target APTs</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('history')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Icon name="history" size={14} />
            <span>Reports & History</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('scan')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.35)',
            }}
          >
            <Icon name="radar" size={14} />
            <span>Launch Scan Engine</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TIER 2: SECURITY POSTURE COMMAND HERO & 4-METRIC GRID
       * ════════════════════════════════════════════════════════════ */}
      <div className="command-hero" style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-8)', alignItems: 'center' }}>

          {/* Left: Master Posture Dial */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            paddingRight: 'var(--space-6)', borderRight: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
              Overall Defense Posture
            </div>

            <GlowingPostureGauge score={postureScore} />

            <p style={{
              fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
              marginTop: 'var(--space-4)', maxWidth: 220, lineHeight: 1.5,
            }}>
              {postureScore !== null
                ? `Derived from ${ownRules.length} detection rules weighted by precision level and parent-technique coverage.`
                : 'Upload Sigma rules or map techniques to compute your live organizational security posture.'}
            </p>
          </div>

          {/* Right: 4-Metric High-Tech Command Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>

            {/* Tile 1: Detection Rules */}
            <div className="metric-tile" style={{ borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="metric-tile-label">Detection Rules Ingested</span>
                <div className="metric-tile-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed' }}>
                  <Icon name="fileCode" size={18} />
                </div>
              </div>
              <div className="metric-tile-val">
                {ownRules.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f43f5e' }}>{ruleCounts.critical} Crit</span> ·
                <span style={{ color: '#fb923c' }}>{ruleCounts.high} High</span> ·
                <span style={{ color: '#f59e0b' }}>{ruleCounts.medium} Med</span> ·
                <span style={{ color: '#38bdf8' }}>{ruleCounts.low} Low</span>
              </div>
            </div>

            {/* Tile 2: Adversary Risk Exposure */}
            <div className="metric-tile" style={{ borderLeft: '3px solid #06b6d4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="metric-tile-label">Target Threat Groups</span>
                <div className="metric-tile-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                  <Icon name="crosshair" size={18} />
                </div>
              </div>
              <div className="metric-tile-val" style={{ color: '#22d3ee' }}>
                {selectedActors.length} <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/ {THREAT_ACTORS.length} APTs</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {selectedActors.length > 0
                  ? `${selectedActors.join(', ')} monitored`
                  : 'No adversary filter selected (All active)'}
              </div>
            </div>

            {/* Tile 3: Defended Techniques */}
            <div className="metric-tile" style={{ borderLeft: '3px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="metric-tile-label">Defended Techniques</span>
                <div className="metric-tile-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <Icon name="shieldCheck" size={18} />
                </div>
              </div>
              <div className="metric-tile-val" style={{ color: '#10b981' }}>
                {analysisResult?.wellCoveredCount ?? 0}
                <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {' '}/ {analysisResult?.totalTechniques ?? 150}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {analysisResult
                  ? `${Math.round(((analysisResult.wellCoveredCount || 0) / (analysisResult.totalTechniques || 1)) * 100)}% verified defense baseline`
                  : 'Run analysis to compute coverage'}
              </div>
            </div>

            {/* Tile 4: Critical Exposure Gaps */}
            <div className="metric-tile" style={{ borderLeft: '3px solid #f43f5e' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="metric-tile-label">Critical Exposure Gaps</span>
                <div className="metric-tile-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
                  <Icon name="alert" size={18} />
                </div>
              </div>
              <div className="metric-tile-val" style={{ color: '#f43f5e' }}>
                {analysisResult?.criticalGaps?.length ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {analysisResult?.criticalGaps?.length
                  ? 'Zero detection rules matching active TTPs'
                  : 'Zero unmitigated critical exposures'}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TIER 3: VISUAL INTELLIGENCE & ANALYTICS MATRIX
       * ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)' }}>

        {/* Tactic Radar Matrix */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="radar" size={18} style={{ color: '#c084fc' }} />
                Tactic-by-Tactic Defense Matrix
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Normalized coverage strength across 14 MITRE ATT&CK enterprise tactics
              </p>
            </div>
            <span className="telemetry-pill" style={{ fontSize: 10 }}>
              14 Tactics
            </span>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                <PolarAngleAxis
                  dataKey="tactic"
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#radarGradient)"
                  fillOpacity={0.25}
                  dot={{ fill: '#c084fc', r: 3 }}
                />
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          background: 'rgba(13, 18, 31, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: '#f8fafc',
                          boxShadow: 'var(--shadow-lg)',
                        }}>
                          <div style={{ fontWeight: 700 }}>{data.fullName}</div>
                          <div style={{ color: '#c084fc', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                            Coverage Score: {data.score} / 100
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coverage Distribution Breakdown */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="layers" size={18} style={{ color: '#22d3ee' }} />
                Technique Health Distribution
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Attack surface segmented by detection confidence
              </p>
            </div>
            <span className="telemetry-pill" style={{ fontSize: 10 }}>
              {analysisResult?.totalTechniques ?? 150} Total
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--space-4)', alignItems: 'center', height: 280 }}>
            <div style={{ width: 140, height: 140, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData.length > 0 ? distributionData : [{ name: 'Empty', value: 1, color: '#334155' }]}
                    cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value"
                  >
                    {(distributionData.length > 0 ? distributionData : [{ name: 'Empty', value: 1, color: '#334155' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="rgba(13, 18, 31, 0.8)" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Interactive Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Defended (Score > 60)', count: analysisResult?.wellCoveredCount || 0, color: '#10b981', pct: analysisResult ? Math.round(((analysisResult.wellCoveredCount || 0) / (analysisResult.totalTechniques || 1)) * 100) : 0 },
                { label: 'Partial (Score 31-60)', count: analysisResult?.partialGaps?.length || 0, color: '#f59e0b', pct: analysisResult ? Math.round(((analysisResult.partialGaps?.length || 0) / (analysisResult.totalTechniques || 1)) * 100) : 0 },
                { label: 'Weak (Score 1-30)', count: analysisResult?.weakGaps?.length || 0, color: '#fb923c', pct: analysisResult ? Math.round(((analysisResult.weakGaps?.length || 0) / (analysisResult.totalTechniques || 1)) * 100) : 0 },
                { label: 'Unmitigated (Score 0)', count: analysisResult?.criticalGaps?.length || 0, color: '#f43f5e', pct: analysisResult ? Math.round(((analysisResult.criticalGaps?.length || 0) / (analysisResult.totalTechniques || 1)) * 100) : 0 },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                      {item.count} <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>({item.pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════
       * THREAT ACTOR EXPOSURE PROFILE STRIP
       * ════════════════════════════════════════════════════════════ */}
      <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="crosshair" size={18} style={{ color: '#fb923c' }} />
              Monitored Threat Actors & Emulated TTPs
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Adversary groups targeted in current defense evaluation
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate('threat')}
            style={{ fontSize: 11, color: 'var(--purple-300)' }}
          >
            Manage Profiles →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {selectedActorObjects.length > 0 ? (
            selectedActorObjects.map(actor => (
              <div key={actor.id} className="actor-mini-card">
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>
                  {actor.name.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }} className="truncate">
                      {actor.name}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }}>
                      {actor.techniques.length} TTPs
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }} className="truncate">
                    {actor.aliases?.join(', ') || 'Nation-state APT'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              No threat actor groups pinned. Head to <strong style={{ color: 'var(--purple-300)', cursor: 'pointer' }} onClick={() => onNavigate('threat')}>Threat Intel</strong> to select adversary profiles.
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TIER 4: ACTIONABLE REMEDIATION QUEUE & POSTURE TIMELINE
       * ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: trendData.length > 0 ? '1.3fr 1fr' : '1fr', gap: 'var(--space-6)' }}>

        {/* Priority Remediation Queue */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="alert" size={18} style={{ color: '#f43f5e' }} />
                High-Priority Remediation Queue
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Top exposed ATT&CK techniques ranked by threat actor prevalence
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('soc')}
              style={{ fontSize: 11, color: 'var(--purple-300)' }}
            >
              Add Rules →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {analysisResult?.gaps?.length ? (
              analysisResult.gaps.slice(0, 5).map(gap => {
                const isCrit = gap.score === 0;
                return (
                  <div key={gap.id} className="remediation-row">
                    <span className={isCrit ? 'sev-pill critical' : 'sev-pill high'} style={{ minWidth: 70, justifyContent: 'center' }}>
                      {isCrit ? 'EXPOSED' : 'WEAK'}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#c084fc', minWidth: 75 }}>
                      {gap.id}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                        {gap.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        Tactic: {gap.tactic || 'Execution'} · Score: {gap.score}/100
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onNavigate('soc')}
                      style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0 }}
                    >
                      + Mitigate
                    </button>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
                No active gaps recorded. Run analysis to surface prioritized remediation targets.
              </div>
            )}
          </div>
        </div>

        {/* Historical Posture Trend */}
        {trendData.length > 0 && (
          <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="trendingUp" size={18} style={{ color: '#10b981' }} />
                  Defense Posture Progression
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Score velocity across historical evaluation cycles
                </p>
              </div>
              <span className="telemetry-pill" style={{ fontSize: 10 }}>
                {trendData.length} Scans
              </span>
            </div>

            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(13, 18, 31, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 11, color: '#f8fafc',
                          }}>
                            <div style={{ color: 'var(--text-tertiary)' }}>{payload[0].payload.date}</div>
                            <div style={{ fontWeight: 700, color: '#22d3ee', fontFamily: 'JetBrains Mono' }}>
                              Score: {payload[0].value} / 100
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fill="url(#trendGradient)"
                    dot={{ r: 4, fill: '#22d3ee', stroke: '#0e131f', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
