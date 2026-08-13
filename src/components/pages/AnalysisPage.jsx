import { useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { TACTICS, TACTIC_MAP } from '../../data/attackData';
import TechniqueDetail from '../TechniqueDetail';
import PostureRing from '../common/PostureRing';
import { compareAnalyses, downloadAnalysisExport } from '../../services/api';

/* ============================================================
 * RESULTS PAGE — one scrollable view:
 *   KPIs → Charts → Tactic summary → Gaps → Actor coverage → History
 * ============================================================ */

export default function AnalysisPage({ onNavigate }) {
  const { state, loadAnalysis, refreshHistory } = useApp();
  const { analysisResult, analysisMeta, analysesHistory, loading } = state;
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [exportError, setExportError] = useState(null);

  if (loading && !analysisResult) {
    return <LoadingSkeleton />;
  }

  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-5)' }}>🔍</div>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>No analysis available</h3>
        <p style={{ maxWidth: 440, marginBottom: 'var(--space-6)' }}>
          Configure your security solutions and import your detection rules to run the analysis.
          The rules implemented by your SOC are the raw material of the diagnostic.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('soc')}>
          🛡️ Configure your defenses
        </button>
      </div>
    );
  }

  const {
    techniqueScores, tacticSummary, gaps, criticalGaps, weakGaps, partialGaps,
    postureScore, totalTechniques, wellCoveredCount, actorAnalysis,
    inputAnalysis,
  } = analysisResult;

  const postureColor = postureScore >= 61 ? 'var(--color-success)' : postureScore >= 31 ? 'var(--color-warning)' : postureScore > 0 ? 'var(--color-orange)' : 'var(--color-danger)';

  const radarData = TACTICS.map(t => ({
    tactic: t.name.split(' ').slice(0, 2).join(' '),
    fullName: t.name,
    score: tacticSummary[t.id]?.averageScore || 0,
  }));

  const distributionData = [
    { name: 'None', value: criticalGaps.length, color: 'var(--color-danger)' },
    { name: 'Weak', value: weakGaps.length, color: 'var(--color-orange)' },
    { name: 'Partial', value: partialGaps.length, color: 'var(--color-warning)' },
    { name: 'Good', value: wellCoveredCount, color: 'var(--color-success)' },
  ];

  async function handleExport(format) {
    if (!analysisMeta?.id) return;
    setExportError(null);
    try {
      await downloadAnalysisExport(analysisMeta.id, format);
    } catch (err) {
      setExportError(err.message);
    }
  }

  const openTechnique = (technique, ts) => {
    setSelectedTechnique(technique);
    setSelectedScore(ts);
  };

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div className="flex items-center gap-3">
          <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>📊</div>
          <div>
            <h1>{analysisMeta?.name || 'Analysis Results'}</h1>
            <p style={{ marginTop: 4 }}>
              ATT&CK Enterprise v15 · {totalTechniques} techniques ·{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {analysisMeta?.created_at ? new Date(analysisMeta.created_at).toLocaleString('en-GB') : '—'}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!analysisMeta?.id}>📊 CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('navigator')} disabled={!analysisMeta?.id}>🗺️ Navigator JSON</button>
          </div>
          {exportError && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>⚠️ {exportError}</span>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card animate-slide-up stagger-1" style={{ '--stat-accent': `linear-gradient(90deg, ${postureColor}, transparent)` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="stat-icon" style={{ background: `${postureColor}20`, marginBottom: 0 }}>🎯</div>
            <PostureRing score={postureScore} color={postureColor} />
          </div>
          <div className="stat-value" style={{ color: postureColor }}>{postureScore}<span style={{ fontSize: 'var(--text-sm)', fontWeight: 400 }}>/100</span></div>
          <div className="stat-label">Global Posture Score</div>
          <div className={`stat-change ${postureScore >= 50 ? 'positive' : 'negative'}`} style={{ marginTop: 'var(--space-2)' }}>
            {postureScore >= 67 ? '✅ Satisfactory level' : postureScore >= 34 ? '⚠️ Needs improvement' : '🚨 Critical risk'}
          </div>
        </div>

        <div className="stat-card animate-slide-up stagger-2" style={{ '--stat-accent': 'linear-gradient(90deg, var(--color-danger), transparent)' }}>
          <div className="stat-icon" style={{ background: 'var(--color-danger-dim)', marginBottom: 'var(--space-3)' }}>🚨</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{criticalGaps.length}</div>
          <div className="stat-label">Critical Gaps (score = 0)</div>
          <div className="stat-change negative" style={{ marginTop: 'var(--space-2)' }}>
            {Math.round((criticalGaps.length / totalTechniques) * 100)}% of techniques uncovered
          </div>
        </div>

        <div className="stat-card animate-slide-up stagger-3" style={{ '--stat-accent': 'linear-gradient(90deg, var(--color-success), transparent)' }}>
          <div className="stat-icon" style={{ background: 'var(--color-success-dim)', marginBottom: 'var(--space-3)' }}>✅</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{wellCoveredCount}</div>
          <div className="stat-label">Well Covered Techniques</div>
          <div className="stat-change positive" style={{ marginTop: 'var(--space-2)' }}>
            {Math.round((wellCoveredCount / totalTechniques) * 100)}% of the framework covered
          </div>
        </div>

        <div className="stat-card animate-slide-up stagger-4" style={{ '--stat-accent': 'linear-gradient(90deg, var(--purple-500), transparent)' }}>
          <div className="stat-icon" style={{ background: 'var(--violet-soft)', marginBottom: 'var(--space-3)' }}>📥</div>
          <div className="stat-value" style={{ color: 'var(--purple-500)' }}>{inputAnalysis?.totalRules ?? 0}</div>
          <div className="stat-label">Detection Rules Imported</div>
          <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              🔍 {inputAnalysis?.uniqueTechniquesFromRules ?? 0} techniques covered by rules
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              🛡️ {state.enabledControls.length} controls · 🎯 {state.selectedActors.length} actors
            </div>
            {(inputAnalysis?.dynamicTechniquesAdded ?? 0) > 0 && (
              <div style={{ fontSize: 10, color: 'var(--color-orange)' }}>
                ⚡ {inputAnalysis.dynamicTechniquesAdded} new techniques from Sigma
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="card animate-scale-in">
          <div className="card-header">
            <div>
              <div className="card-title">🕸️ Coverage by Tactic</div>
              <div className="card-subtitle">Average technique score per ATT&CK tactic</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
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
              <div className="card-subtitle">Breakdown of the {totalTechniques} techniques by level</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="45%" cy="50%"
                innerRadius={70} outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : null}
                labelLine={false}
              >
                {distributionData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
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

      {/* ── TACTIC SUMMARY ── */}
      <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card-header">
          <div className="card-title">📋 ATT&CK Tactic Summary</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tactic</th>
                <th style={{ textAlign: 'center' }}>Techniques</th>
                <th style={{ textAlign: 'center' }}>Covered</th>
                <th>Coverage</th>
                <th style={{ textAlign: 'center' }}>Avg Score</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {TACTICS.map(tactic => {
                const s = tacticSummary[tactic.id];
                if (!s) return null;
                const color = s.coveragePercent >= 67 ? 'var(--color-success)' : s.coveragePercent >= 34 ? 'var(--color-warning)' : s.coveragePercent > 0 ? 'var(--color-orange)' : 'var(--color-danger)';
                return (
                  <tr key={tactic.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{tactic.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--purple-400)', marginTop: 2 }}>{tactic.id}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{s.totalTechniques}</td>
                    <td style={{ textAlign: 'center' }}>{s.coveredTechniques}</td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.coveragePercent}%`, background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontWeight: 700, color, fontSize: 'var(--text-xs)', minWidth: 36, textAlign: 'right' }}>{s.coveragePercent}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color, fontSize: 'var(--text-sm)' }}>{s.averageScore}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${s.coveragePercent >= 67 ? 'success' : s.coveragePercent >= 34 ? 'warning' : 'danger'}`}>
                        {s.coveragePercent >= 67 ? '✅ Good' : s.coveragePercent >= 34 ? '⚠️ Partial' : '🚨 Gap'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GAPS ── */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>⚠️ Coverage Gaps</h2>
          {gaps.length > 0 && <span className="badge badge-danger">{gaps.length}</span>}
        </div>
        {criticalGaps.length > 0 && (
          <GapSection title="🚨 Critical Gaps — Score 0/100" count={criticalGaps.length} color="var(--color-danger)" badgeClass="badge-danger">
            {criticalGaps.slice(0, 20).map((gap, i) => (
              <GapItem key={`${gap.id}-${i}`} gap={gap} rank={i + 1} color="var(--color-danger)" dim="var(--color-danger-dim)"
                onSelect={() => openTechnique(gap, techniqueScores[gap.id])} />
            ))}
          </GapSection>
        )}
        {weakGaps.length > 0 && (
          <GapSection title="🟠 Weak Coverage — Score 1–30" count={weakGaps.length} color="var(--color-orange)" badgeClass="badge-orange">
            {weakGaps.slice(0, 15).map((gap, i) => (
              <GapItem key={`${gap.id}-${i}`} gap={gap} rank={i + 1} color="var(--color-orange)" dim="var(--color-orange-dim)"
                onSelect={() => openTechnique(gap, techniqueScores[gap.id])} />
            ))}
          </GapSection>
        )}
        {partialGaps.length > 0 && (
          <GapSection title="🟡 Partial Coverage — Score 31–60" count={partialGaps.length} color="var(--color-warning)" badgeClass="badge-warning">
            {partialGaps.slice(0, 10).map((gap, i) => (
              <GapItem key={`${gap.id}-${i}`} gap={gap} rank={i + 1} color="var(--color-warning)" dim="var(--color-warning-dim)"
                onSelect={() => openTechnique(gap, techniqueScores[gap.id])} />
            ))}
          </GapSection>
        )}
        {gaps.length === 0 && (
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-success)' }}>
            🎉 No gaps — every technique is at least partially covered.
          </div>
        )}
      </section>

      {/* ── ACTOR COVERAGE ── */}
      {actorAnalysis && actorAnalysis.length > 0 && (
        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>🎯 Coverage per Threat Group</h2>
          </div>
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-orange-dim)', border: '1px solid var(--color-orange)', borderRadius: 'var(--radius-lg)' }}>
            <strong style={{ color: 'var(--color-orange)', fontSize: 'var(--text-sm)' }}>Your posture against each selected adversary</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
              Based on their known TTPs in MITRE ATT&CK. Click a gap to see the technique details and its recommended mitigations.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 'var(--space-5)' }}>
            {actorAnalysis.map((analysis, i) => (
              <ActorCard key={analysis.actor.id} analysis={analysis} delay={i}
                onSelectGap={(gap) => openTechnique(gap, techniqueScores[gap.id])} />
            ))}
          </div>
        </section>
      )}

      {/* ── HISTORY ── */}
      {analysesHistory.length > 0 && (
        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>🕘 Analysis History</h2>
          </div>
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', borderRadius: 'var(--radius-lg)' }}>
            <strong style={{ color: 'var(--purple-300)', fontSize: 'var(--text-sm)' }}>Every run is stored server-side</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
              Reload a past analysis or compare two runs to measure the evolution of your posture after deploying rules or controls.
            </p>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Saved runs</div>
            </div>
            <HistoryList
              analyses={analysesHistory}
              currentId={analysisMeta?.id}
              onOpen={(id) => { loadAnalysis(id).catch(() => {}); }}
              onRefresh={() => refreshHistory().catch(() => {})}
            />
          </div>
        </section>
      )}

      {/* Technique detail panel */}
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

/* ──── Sub-components ──── */

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ width: 240, height: 28, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 10, animation: 'pulse 1.4s infinite' }} />
          <div style={{ width: 180, height: 12, background: 'var(--bg-tertiary)', borderRadius: 6, animation: 'pulse 1.4s infinite 0.2s' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[96, 84, 120].map((w, i) => (
            <div key={i} style={{ width: w, height: 34, background: 'var(--bg-tertiary)', borderRadius: 8, animation: `pulse 1.4s infinite ${i * 0.15}s` }} />
          ))}
        </div>
      </div>
      <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card" style={{ minHeight: 140, animation: `pulse 1.4s infinite ${i * 0.12}s` }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-tertiary)', marginBottom: 12 }} />
            <div style={{ width: 80, height: 22, background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: 140, height: 10, background: 'var(--bg-tertiary)', borderRadius: 5 }} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
        ⏳ Analysis in progress — the engine is running on the server…
      </div>
    </div>
  );
}

function HistoryList({ analyses, currentId, onOpen, onRefresh }) {
  const [selectedBase, setSelectedBase] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [compareErr, setCompareErr] = useState(null);
  const [comparing, setComparing] = useState(false);

  const rows = [...analyses].sort((a, b) => b.id - a.id);

  async function runCompare() {
    if (!selectedBase || !currentId) return;
    setComparing(true); setCompareErr(null); setComparison(null);
    try {
      const res = await compareAnalyses(currentId, selectedBase);
      setComparison(res);
    } catch (err) { setCompareErr(err.message); }
    finally { setComparing(false); }
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Date</th>
              <th style={{ textAlign: 'center' }}>Posture</th>
              <th style={{ textAlign: 'center' }}>Crit. gaps</th>
              <th style={{ textAlign: 'center' }}>Weak</th>
              <th style={{ textAlign: 'center' }}>Well covered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => {
              const isCurrent = a.id === currentId;
              const color = a.posture_score >= 61 ? 'var(--color-success)' : a.posture_score >= 31 ? 'var(--color-warning)' : a.posture_score > 0 ? 'var(--color-orange)' : 'var(--color-danger)';
              return (
                <tr key={a.id} style={{ opacity: isCurrent ? 1 : 0.8 }}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-400)' }}>{a.id}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}{isCurrent && <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 9 }}>current</span>}</td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{new Date(a.created_at).toLocaleString('en-GB')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color }}>{a.posture_score}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{a.critical_gaps}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-orange)' }}>{a.weak_gaps}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>{a.well_covered_count}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onOpen(a.id)}>Open</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Compare panel */}
      <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 'var(--text-sm)' }}>🔀 Compare with:</strong>
          <select
            className="form-input"
            style={{ width: 280, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }}
            value={selectedBase ?? ''}
            onChange={(e) => { setSelectedBase(Number(e.target.value) || null); setComparison(null); }}
          >
            <option value="">— choose a reference run —</option>
            {rows.filter(a => a.id !== currentId).map(a => (
              <option key={a.id} value={a.id}>#{a.id} · {a.name} ({new Date(a.created_at).toLocaleDateString('en-GB')})</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={runCompare} disabled={!selectedBase || comparing}>
            {comparing ? '⏳ …' : 'Compare'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>🔄 Refresh</button>
        </div>

        {compareErr && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>⚠️ {compareErr}</div>}

        {comparison && (
          <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <ComparisonCard
              label="Posture Score"
              delta={comparison.posture_delta}
              base={comparison.base_posture}
              now={comparison.compare_posture}
              suffix=" pts"
            />
            <ComparisonCard
              label="Critical gaps"
              raw={`Δ ${comparison.critical_gaps_delta > 0 ? '+' : ''}${comparison.critical_gaps_delta}`}
            />
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 6 }}>📋 Resolved gaps</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-success)', lineHeight: 1.7 }}>
                {comparison.resolved_gaps.length > 0 ? comparison.resolved_gaps.join(', ') : '—'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 6 }}>🚨 New gaps</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', lineHeight: 1.7 }}>
                {comparison.new_critical_gaps.length > 0 ? comparison.new_critical_gaps.join(', ') : '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonCard({ label, delta, base, now, suffix = '', raw }) {
  const color = delta == null ? 'var(--text-tertiary)' : delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)';
  return (
    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color }}>
        {raw != null ? raw : `${delta > 0 ? '+' : ''}${delta}${suffix}`}
      </div>
      {base != null && now != null && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
          {base} → {now}
        </div>
      )}
    </div>
  );
}

function GapSection({ title, count, color, badgeClass, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-8)' }}>
      <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{ color }}>{title}</span>
        <span className={`badge ${badgeClass}`}>{count}</span>
      </h3>
      <div className="gap-list">{children}</div>
    </div>
  );
}

function GapItem({ gap, rank, color, dim, onSelect }) {
  const tactic = TACTIC_MAP[gap.tactic];
  return (
    <div className="gap-item" onClick={onSelect} style={{ borderLeft: `3px solid ${dim}`, cursor: 'pointer' }}>
      <div className="gap-rank" style={{ background: dim, color }}>#{rank}</div>
      <div className="gap-content" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--purple-400)', fontWeight: 700 }}>{gap.id}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>· {tactic?.name || gap.tactic}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 6 }}>{gap.name}</div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Prevalence: <strong style={{ color: 'var(--text-secondary)' }}>{gap.prevalence || '?'}%</strong></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Score: <strong style={{ color }}>{gap.score}/100</strong></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Priority: <strong style={{ color }}>{gap.priority}</strong></span>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: 'var(--text-xs)' }}>Details →</button>
    </div>
  );
}

function ActorCard({ analysis, delay, onSelectGap }) {
  const { actor, totalTechniques, coveredTechniques, coveragePercent, gaps } = analysis;
  const color = coveragePercent >= 67 ? 'var(--color-success)' : coveragePercent >= 34 ? 'var(--color-warning)' : coveragePercent > 0 ? 'var(--color-orange)' : 'var(--color-danger)';

  return (
    <div className={`card animate-slide-up stagger-${Math.min(delay + 1, 8)}`} style={{ borderLeft: '3px solid var(--color-orange)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 4 }}>
            {actor.name}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--neutral-soft)', color: 'var(--text-tertiary)' }}>
              {actor.origin}
            </span>
            {actor.aliases.slice(0, 1).map(a => (
              <span key={a} className="badge badge-orange" style={{ fontSize: 10 }}>{a}</span>
            ))}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{actor.description}</p>
        </div>
        <div style={{ textAlign: 'center', marginLeft: 'var(--space-4)', flexShrink: 0 }}>
          <PostureRing score={coveragePercent} color={color} />
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 4 }}>coverage</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Known TTPs', value: totalTechniques, color: 'var(--text-primary)' },
          { label: 'Covered', value: coveredTechniques, color: 'var(--color-success)' },
          { label: 'Gaps', value: gaps.length, color: 'var(--color-danger)' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-2)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Coverage against {actor.name.split(' ')[0]}</span>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color }}>{coveragePercent}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${coveragePercent}%`, background: color, borderRadius: 'var(--radius-full)', transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* Top gaps */}
      {gaps.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
            Uncovered gaps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {gaps.slice(0, 4).map((gap, i) => (
              <div key={`${gap.id}-${i}`} onClick={() => onSelectGap(gap)} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--violet-soft-strong)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger-dim)'}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-danger)', fontWeight: 700, minWidth: 60 }}>{gap.id}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1 }}>{gap.name}</span>
              </div>
            ))}
            {gaps.length > 4 && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-2)' }}>
                +{gaps.length - 4} more gaps — see the gaps section above
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}