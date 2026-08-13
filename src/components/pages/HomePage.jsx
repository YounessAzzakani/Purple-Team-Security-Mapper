import { useApp } from '../../context/AppContext';
import { TACTICS } from '../../data/attackData';
import PostureRing from '../common/PostureRing';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';

function postureColorOf(score) {
  if (score == null) return 'var(--text-tertiary)';
  if (score >= 61) return 'var(--color-success)';
  if (score >= 31) return 'var(--color-warning)';
  if (score > 0) return 'var(--color-orange)';
  return 'var(--color-danger)';
}

export default function HomePage({ onNavigate }) {
  const { state } = useApp();
  const { analysisResult, enabledControls, detectionRules, selectedActors } = state;

  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const postureScore = analysisResult?.postureScore ?? null;
  const postureColor = postureColorOf(postureScore);

  const radarData = TACTICS.map(t => ({
    tactic: t.name.split(' ').slice(0, 2).join(' '),
    score: analysisResult?.tacticSummary?.[t.id]?.averageScore || 0,
  }));

  const distributionData = analysisResult ? [
    { name: 'No coverage', value: analysisResult.criticalGaps.length, color: 'var(--color-danger)' },
    { name: 'Weak', value: analysisResult.weakGaps.length, color: 'var(--color-orange)' },
    { name: 'Partial', value: analysisResult.partialGaps.length, color: 'var(--color-warning)' },
    { name: 'Good', value: analysisResult.wellCoveredCount, color: 'var(--color-success)' },
  ] : [];

  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <div className="card" style={{
        padding: 'var(--space-8)',
        background: 'linear-gradient(135deg, var(--gradient-purple-subtle), var(--bg-card) 60%)',
        border: '1px solid var(--violet-border)',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
          <div className="logo-icon" style={{ width: 64, height: 64, fontSize: '2rem' }}>🟣</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ marginBottom: 6 }}>Purple Team Mapper</h1>
            <p style={{ maxWidth: 640, lineHeight: 1.6 }}>
              Map your SOC defense against the MITRE ATT&CK framework and the adversaries that target you.
              Declare your security solutions, import your detection rules, and visualize every coverage gap.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-6)' }}>
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('soc')}>
            🛡️ Configure your defenses
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('attack')}>⚔️ Explore adversaries</button>
          {analysisResult && (
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('analysis')}>📊 View results</button>
          )}
        </div>
      </div>

      {/* ── KPIs (if an analysis exists) ── */}
      {analysisResult ? (
        <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card animate-slide-up stagger-1" style={{ '--stat-accent': `linear-gradient(90deg, ${postureColor}, transparent)` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div className="stat-icon" style={{ background: `${postureColor}20`, marginBottom: 0 }}>🎯</div>
              <PostureRing score={postureScore} color={postureColor} />
            </div>
            <div className="stat-value" style={{ color: postureColor }}>{postureScore}<span style={{ fontSize: 'var(--text-sm)', fontWeight: 400 }}>/100</span></div>
            <div className="stat-label">Global Posture Score</div>
          </div>
          <div className="stat-card animate-slide-up stagger-2" style={{ '--stat-accent': 'linear-gradient(90deg, var(--color-danger), transparent)' }}>
            <div className="stat-icon" style={{ background: 'var(--color-danger-dim)', marginBottom: 'var(--space-3)' }}>🚨</div>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{analysisResult.criticalGaps.length}</div>
            <div className="stat-label">Critical Gaps (score = 0)</div>
          </div>
          <div className="stat-card animate-slide-up stagger-3" style={{ '--stat-accent': 'linear-gradient(90deg, var(--color-success), transparent)' }}>
            <div className="stat-icon" style={{ background: 'var(--color-success-dim)', marginBottom: 'var(--space-3)' }}>✅</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{analysisResult.wellCoveredCount}</div>
            <div className="stat-label">Well Covered Techniques</div>
          </div>
          <div className="stat-card animate-slide-up stagger-4" style={{ '--stat-accent': 'linear-gradient(90deg, var(--purple-500), transparent)' }}>
            <div className="stat-icon" style={{ background: 'var(--violet-soft)', marginBottom: 'var(--space-3)' }}>📜</div>
            <div className="stat-value" style={{ color: 'var(--purple-500)' }}>{ownRules.length}</div>
            <div className="stat-label">Detection Rules</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>📊</div>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No analysis yet</h3>
          <p style={{ maxWidth: 460, margin: '0 auto', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
            Declare your security solutions and import your detection rules, then run your first analysis to see your posture mapped against MITRE ATT&CK.
          </p>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-5)' }} onClick={() => onNavigate('soc')}>
            🛡️ Get started with your defenses
          </button>
        </div>
      )}

      {/* ── The two worlds ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="card animate-slide-up stagger-1" style={{ borderTop: '3px solid var(--color-success)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">🛡️ Your SOC — Defense</div>
              <div className="card-subtitle">Security solutions deployed and detection rules implemented in your organization</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Solutions enabled', value: enabledControls.length, icon: '🛡️' },
              { label: 'Detection rules', value: ownRules.length, icon: '📜' },
              { label: 'Controls available', value: 33, icon: '🗃️' },
              { label: 'Control categories', value: 8, icon: '🏷️' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>{s.icon} {s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('soc')}>
            Manage your defenses →
          </button>
        </div>

        <div className="card animate-slide-up stagger-2" style={{ borderTop: '3px solid var(--color-danger)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">⚔️ MITRE ATT&CK — Adversaries</div>
              <div className="card-subtitle">Threat actor groups and the TTPs they use, mapped against your coverage</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Threat groups', value: 8, icon: '🎯' },
              { label: 'Selected for analysis', value: selectedActors.length, icon: '✅' },
              { label: 'ATT&CK techniques', value: analysisResult?.totalTechniques ?? '150+', icon: '🧩' },
              { label: 'Tactics covered', value: TACTICS.length, icon: '🗺️' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>{s.icon} {s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('attack')}>
            Explore adversary groups →
          </button>
        </div>
      </div>

      {/* ── Preview charts (if analysis) ── */}
      {analysisResult && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div className="card animate-scale-in">
            <div className="card-header">
              <div>
                <div className="card-title">🕸️ Coverage by Tactic</div>
                <div className="card-subtitle">Average score per ATT&CK tactic</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="var(--border-default)" />
                <PolarAngleAxis dataKey="tactic" tick={{ fill: 'var(--text-tertiary)', fontSize: 9, fontFamily: 'Inter' }} tickLine={false} />
                <Radar dataKey="score" stroke="var(--purple-500)" fill="var(--purple-500)" fillOpacity={0.2} dot={{ fill: 'var(--purple-500)', r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="card animate-scale-in stagger-1">
            <div className="card-header">
              <div>
                <div className="card-title">📊 Coverage Distribution</div>
                <div className="card-subtitle">All techniques by coverage level</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distributionData} cx="45%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : null} labelLine={false}>
                  {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                  formatter={(value, name) => [`${value} techniques`, name]}
                />
                <Legend iconType="circle" formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
        {[
          { icon: '🛡️', title: '1 · Declare your SOC', desc: 'Enable the security solutions deployed in your organization (SIEM, SOAR, EDR, firewall…) with their maturity level.' },
          { icon: '📜', title: '2 · Import your rules', desc: 'Upload your Sigma detection rules or add techniques manually. The engine maps them to ATT&CK automatically.' },
          { icon: '🎯', title: '3 · Measure the gaps', desc: 'Run the analysis to see your posture per tactic, per threat group, and every prioritized gap to fix.' },
        ].map((s, i) => (
          <div key={s.title} className={`card animate-slide-up stagger-${i + 1}`}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>{s.title}</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
