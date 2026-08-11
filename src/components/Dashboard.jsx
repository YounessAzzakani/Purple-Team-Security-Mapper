import { useState, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { TACTICS, TACTIC_MAP } from '../data/attackData';
import AttackMatrix from './AttackMatrix';
import TechniqueDetail from './TechniqueDetail';
import AttacksTab from './AttacksTab';
import { compareAnalyses, downloadAnalysisExport } from '../services/api';

const COVERAGE_COLORS = { none: '#ef4444', low: '#f97316', medium: '#eab308', high: '#22c55e' };

export default function Dashboard() {
  const { state, setStep, runAnalysis, loadAnalysis, refreshHistory } = useApp();
  const { analysisResult, analysisMeta, analysesHistory, loading, apiError } = state;
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportError, setExportError] = useState(null);

  if (loading && !analysisResult) {
    return <LoadingSkeleton />;
  }

  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-5)' }}>🔍</div>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Aucune analyse disponible</h3>
        <p style={{ maxWidth: 400, marginBottom: 'var(--space-6)' }}>
          Configurez vos contrôles de sécurité et vos règles de détection pour lancer l'analyse.
          Les règles implémentées par votre SOC sont la matière première du diagnostic.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => setStep(0)}>
          🛡️ Démarrer la configuration
        </button>
      </div>
    );
  }

  const {
    techniqueScores, tacticSummary, gaps, criticalGaps, weakGaps, partialGaps,
    postureScore, totalTechniques, coveredCount, wellCoveredCount, actorAnalysis,
    inputAnalysis,
  } = analysisResult;

  const postureColor = postureScore >= 61 ? '#22c55e' : postureScore >= 31 ? '#eab308' : postureScore > 0 ? '#f97316' : '#ef4444';

  // Radar data
  const radarData = TACTICS.map(t => ({
    tactic: t.name.split(' ').slice(0, 2).join(' '),
    fullName: t.name,
    score: tacticSummary[t.id]?.averageScore || 0,
  }));

  // Pie/bar data
  const distributionData = [
    { name: 'Aucune', value: criticalGaps.length, color: '#ef4444' },
    { name: 'Faible', value: weakGaps.length, color: '#f97316' },
    { name: 'Partielle', value: partialGaps.length, color: '#eab308' },
    { name: 'Bonne', value: wellCoveredCount, color: '#22c55e' },
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

  const tabs = [
    { key: 'overview', label: '📊 Vue d\'ensemble' },
    { key: 'matrix',   label: '🗺️ Matrice ATT&CK' },
    { key: 'gaps',     label: `⚠️ Gaps (${gaps.length})` },
    ...(actorAnalysis?.length > 0 ? [
      { key: 'actors', label: `🎯 Menaces (${actorAnalysis.length})` },
      { key: 'attacks', label: '💣 Attaques' },
    ] : []),
    ...(analysesHistory.length > 1 ? [{ key: 'history', label: `🕘 Historique (${analysesHistory.length})` }] : []),
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-3">
          <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>🟣</div>
          <div>
            <h1>{analysisMeta?.name || 'Résultats de l\'Analyse'}</h1>
            <p style={{ marginTop: 4 }}>
              ATT&CK Enterprise v15 · {totalTechniques} techniques ·{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {analysisMeta?.created_at ? new Date(analysisMeta.created_at).toLocaleString('fr-FR') : '—'}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => runAnalysis()} disabled={loading} title="Relancer l'analyse">
              {loading ? '⏳ …' : '🔄 Re-analyser'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!analysisMeta?.id}>📊 CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('navigator')} disabled={!analysisMeta?.id}>🗺️ Navigator JSON</button>
          </div>
          {exportError && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>⚠️ {exportError}</span>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Posture score */}
        <div className="stat-card animate-slide-up stagger-1" style={{ '--stat-accent': `linear-gradient(90deg, ${postureColor}, ${postureColor}55)` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="stat-icon" style={{ background: `${postureColor}20`, marginBottom: 0 }}>🎯</div>
            <PostureRing score={postureScore} color={postureColor} />
          </div>
          <div className="stat-value" style={{ color: postureColor }}>{postureScore}<span style={{ fontSize: 'var(--text-sm)', fontWeight: 400 }}>/100</span></div>
          <div className="stat-label">Score de Posture Global</div>
          <div className={`stat-change ${postureScore >= 50 ? 'positive' : 'negative'}`} style={{ marginTop: 'var(--space-2)' }}>
            {postureScore >= 67 ? '✅ Niveau satisfaisant' : postureScore >= 34 ? '⚠️ À améliorer' : '🚨 Risque critique'}
          </div>
        </div>

        {/* Critical gaps */}
        <div className="stat-card animate-slide-up stagger-2" style={{ '--stat-accent': 'linear-gradient(90deg, #ef4444, #ef444455)' }}>
          <div className="stat-icon" style={{ background: 'var(--color-danger-dim)', marginBottom: 'var(--space-3)' }}>🚨</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{criticalGaps.length}</div>
          <div className="stat-label">Gaps Critiques (score = 0)</div>
          <div className="stat-change negative" style={{ marginTop: 'var(--space-2)' }}>
            {Math.round((criticalGaps.length / totalTechniques) * 100)}% des techniques non couvertes
          </div>
        </div>

        {/* Well covered */}
        <div className="stat-card animate-slide-up stagger-3" style={{ '--stat-accent': 'linear-gradient(90deg, #22c55e, #22c55e55)' }}>
          <div className="stat-icon" style={{ background: 'var(--color-success-dim)', marginBottom: 'var(--space-3)' }}>✅</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{wellCoveredCount}</div>
          <div className="stat-label">Techniques Bien Couvertes</div>
          <div className="stat-change positive" style={{ marginTop: 'var(--space-2)' }}>
            {Math.round((wellCoveredCount / totalTechniques) * 100)}% du framework couverts
          </div>
        </div>

        {/* Input quality */}
        <div className="stat-card animate-slide-up stagger-4" style={{ '--stat-accent': 'linear-gradient(90deg, #a855f7, #a855f755)' }}>
          <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', marginBottom: 'var(--space-3)' }}>📥</div>
          <div className="stat-value" style={{ color: '#a855f7' }}>{inputAnalysis?.totalRules ?? 0}</div>
          <div className="stat-label">Règles Sigma importées</div>
          <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              🔍 {inputAnalysis?.uniqueTechniquesFromRules ?? 0} techniques couvertes par règles
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              🛡️ {state.enabledControls.length} contrôles · 🎯 {state.selectedActors.length} acteurs
            </div>
            {(inputAnalysis?.dynamicTechniquesAdded ?? 0) > 0 && (
              <div style={{ fontSize: 10, color: '#fb923c' }}>
                ⚡ {inputAnalysis.dynamicTechniquesAdded} nouvelles techniques depuis Sigma
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-6)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`filter-btn ${activeTab === tab.key ? 'active' : ''}`}
            style={{ padding: 'var(--space-2) var(--space-5)', fontSize: 'var(--text-sm)' }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            {/* Radar */}
            <div className="card animate-scale-in">
              <div className="card-header">
                <div>
                  <div className="card-title">🕸️ Couverture par Tactique</div>
                  <div className="card-subtitle">Score moyen des techniques par tactique ATT&CK</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(148,163,184,0.08)" />
                  <PolarAngleAxis dataKey="tactic" tick={{ fill: 'var(--text-tertiary)', fontSize: 9, fontFamily: 'Inter' }} tickLine={false} />
                  <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} dot={{ fill: '#8b5cf6', r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie */}
            <div className="card animate-scale-in stagger-1">
              <div className="card-header">
                <div>
                  <div className="card-title">📊 Distribution de Couverture</div>
                  <div className="card-subtitle">Répartition des {totalTechniques} techniques par niveau</div>
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
                    label={({ name, value, percent }) => value > 0 ? `${name}: ${value}` : null}
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

          {/* Tactic table */}
          <div className="card animate-slide-up">
            <div className="card-header">
              <div className="card-title">📋 Résumé par Tactique ATT&CK</div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tactique</th>
                    <th style={{ textAlign: 'center' }}>Techniques</th>
                    <th style={{ textAlign: 'center' }}>Couvertes</th>
                    <th>Couverture</th>
                    <th style={{ textAlign: 'center' }}>Score moy.</th>
                    <th style={{ textAlign: 'center' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {TACTICS.map(tactic => {
                    const s = tacticSummary[tactic.id];
                    if (!s) return null;
                    const color = s.coveragePercent >= 67 ? '#22c55e' : s.coveragePercent >= 34 ? '#eab308' : s.coveragePercent > 0 ? '#f97316' : '#ef4444';
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
                            {s.coveragePercent >= 67 ? '✅ Bon' : s.coveragePercent >= 34 ? '⚠️ Partiel' : '🚨 Gap'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MATRIX TAB ── */}
      {activeTab === 'matrix' && (
        <div className="animate-fade-in">
          <AttackMatrix
            techniqueScores={techniqueScores}
            onTechniqueClick={(technique, ts) => { setSelectedTechnique(technique); setSelectedScore(ts); }}
          />
        </div>
      )}

      {/* ── GAPS TAB ── */}
      {activeTab === 'gaps' && (
        <div className="animate-fade-in">
          {criticalGaps.length > 0 && (
            <GapSection title="🚨 Gaps Critiques — Score 0/100" count={criticalGaps.length} color="#ef4444" badgeClass="badge-danger">
              {criticalGaps.slice(0, 20).map((gap, i) => (
                <GapItem key={gap.id} gap={gap} rank={i + 1} color="#ef4444"
                  onSelect={() => { setSelectedTechnique(gap); setSelectedScore(techniqueScores[gap.id]); }} />
              ))}
            </GapSection>
          )}
          {weakGaps.length > 0 && (
            <GapSection title="🟠 Couverture Faible — Score 1–30" count={weakGaps.length} color="#f97316" badgeClass="badge-orange">
              {weakGaps.slice(0, 15).map((gap, i) => (
                <GapItem key={gap.id} gap={gap} rank={i + 1} color="#f97316"
                  onSelect={() => { setSelectedTechnique(gap); setSelectedScore(techniqueScores[gap.id]); }} />
              ))}
            </GapSection>
          )}
          {partialGaps.length > 0 && (
            <GapSection title="🟡 Couverture Partielle — Score 31–60" count={partialGaps.length} color="#eab308" badgeClass="badge-warning">
              {partialGaps.slice(0, 10).map((gap, i) => (
                <GapItem key={gap.id} gap={gap} rank={i + 1} color="#eab308"
                  onSelect={() => { setSelectedTechnique(gap); setSelectedScore(techniqueScores[gap.id]); }} />
              ))}
            </GapSection>
          )}
        </div>
      )}

      {/* ── ACTORS TAB ── */}
      {activeTab === 'actors' && actorAnalysis && (
        <div className="animate-fade-in">
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 'var(--radius-lg)' }}>
            <strong style={{ color: 'var(--color-orange)', fontSize: 'var(--text-sm)' }}>🎯 Analyse par groupe de menaces</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
              Cette vue montre votre couverture spécifique contre chaque groupe d'attaquants sélectionné, basée sur leurs TTPs connus dans MITRE ATT&CK.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 'var(--space-5)' }}>
            {actorAnalysis.map((analysis, i) => (
              <ActorCard key={analysis.actor.id} analysis={analysis} delay={i}
                onSelectGap={(gap) => { setSelectedTechnique(gap); setSelectedScore(techniqueScores[gap.id]); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── ATTACKS TAB ── */}
      {activeTab === 'attacks' && actorAnalysis && (
        <div className="animate-fade-in">
          <AttacksTab analysisResult={analysisResult} analysisId={analysisMeta?.id} />
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && analysesHistory.length > 0 && (
        <div className="animate-fade-in">
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-lg)' }}>
            <strong style={{ color: 'var(--purple-300)', fontSize: 'var(--text-sm)' }}>🕘 Historique des analyses</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
              Chaque lancement est stocké côté serveur. Rechargez une analyse passée ou comparez deux runs
              pour mesurer l'évolution de la posture après un déploiement de règles ou de contrôles.
            </p>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Runs enregistrés</div>
            </div>
            <HistoryList
              analyses={analysesHistory}
              currentId={analysisMeta?.id}
              onOpen={(id) => { loadAnalysis(id).catch(() => {}); }}
              onRefresh={() => refreshHistory().catch(() => {})}
            />
          </div>
        </div>
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
        ⏳ Analyse en cours — le moteur tourne sur le serveur…
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
              <th>Nom</th>
              <th>Date</th>
              <th style={{ textAlign: 'center' }}>Posture</th>
              <th style={{ textAlign: 'center' }}>Gaps crit.</th>
              <th style={{ textAlign: 'center' }}>Faibles</th>
              <th style={{ textAlign: 'center' }}>Bien couverts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => {
              const isCurrent = a.id === currentId;
              const color = a.posture_score >= 61 ? '#22c55e' : a.posture_score >= 31 ? '#eab308' : a.posture_score > 0 ? '#f97316' : '#ef4444';
              return (
                <tr key={a.id} style={{ opacity: isCurrent ? 1 : 0.8 }}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-400)' }}>{a.id}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}{isCurrent && <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 9 }}>actuelle</span>}</td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{new Date(a.created_at).toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color }}>{a.posture_score}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>{a.critical_gaps}</td>
                  <td style={{ textAlign: 'center', color: '#f97316' }}>{a.weak_gaps}</td>
                  <td style={{ textAlign: 'center', color: '#22c55e' }}>{a.well_covered_count}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onOpen(a.id)}>Ouvrir</button>
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
          <strong style={{ fontSize: 'var(--text-sm)' }}>🔀 Comparer avec :</strong>
          <select
            className="form-input"
            style={{ width: 260, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }}
            value={selectedBase ?? ''}
            onChange={(e) => { setSelectedBase(Number(e.target.value) || null); setComparison(null); }}
          >
            <option value="">— choisir un run de référence —</option>
            {rows.filter(a => a.id !== currentId).map(a => (
              <option key={a.id} value={a.id}>#{a.id} · {a.name} ({new Date(a.created_at).toLocaleDateString('fr-FR')})</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={runCompare} disabled={!selectedBase || comparing}>
            {comparing ? '⏳ …' : 'Comparer'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>🔄 Rafraîchir</button>
        </div>

        {compareErr && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>⚠️ {compareErr}</div>}

        {comparison && (
          <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <ComparisonCard
              label="Score de posture"
              delta={comparison.posture_delta}
              base={comparison.base_posture}
              now={comparison.compare_posture}
              suffix=" pts"
            />
            <ComparisonCard
              label="Gaps critiques"
              raw={`Δ ${comparison.critical_gaps_delta > 0 ? '+' : ''}${comparison.critical_gaps_delta}`}
            />
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 6 }}>📋 Gaps résolus</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#22c55e', lineHeight: 1.7 }}>
                {comparison.resolved_gaps.length > 0 ? comparison.resolved_gaps.join(', ') : '—'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 6 }}>🚨 Nouveaux gaps</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#ef4444', lineHeight: 1.7 }}>
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
  const color = delta == null ? 'var(--text-tertiary)' : delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : 'var(--text-tertiary)';
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

function PostureRing({ score, color }) {
  const r = 28; const circ = 2 * Math.PI * r;
  return (
    <svg width={68} height={68}>
      <circle cx={34} cy={34} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={6} />
      <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '34px 34px', transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x={34} y={38} textAnchor="middle" fill={color} fontSize={13} fontWeight={800}>{score}%</text>
    </svg>
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

function GapItem({ gap, rank, color, onSelect }) {
  const tactic = TACTIC_MAP[gap.tactic];
  return (
    <div className="gap-item" onClick={onSelect} style={{ borderLeft: `3px solid ${color}40`, cursor: 'pointer' }}>
      <div className="gap-rank" style={{ background: `${color}15`, color }}>#{rank}</div>
      <div className="gap-content" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--purple-400)', fontWeight: 700 }}>{gap.id}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>· {tactic?.name || gap.tactic}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 6 }}>{gap.name}</div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Prévalence: <strong style={{ color: 'var(--text-secondary)' }}>{gap.prevalence || '?'}%</strong></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Score: <strong style={{ color }}>{gap.score}/100</strong></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Priorité: <strong style={{ color }}>{gap.priority}</strong></span>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: 'var(--text-xs)' }}>Détails →</button>
    </div>
  );
}

function ActorCard({ analysis, delay, onSelectGap }) {
  const { actor, totalTechniques, coveredTechniques, coveragePercent, averageScore, gaps } = analysis;
  const color = coveragePercent >= 67 ? '#22c55e' : coveragePercent >= 34 ? '#eab308' : coveragePercent > 0 ? '#f97316' : '#ef4444';

  return (
    <div className={`card animate-slide-up stagger-${Math.min(delay + 1, 8)}`} style={{ borderLeft: '3px solid var(--color-orange)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 4 }}>
            {actor.name}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' }}>
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
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 4 }}>couverture</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'TTPs connus', value: totalTechniques, color: 'var(--text-primary)' },
          { label: 'Couverts', value: coveredTechniques, color: '#22c55e' },
          { label: 'Gaps', value: gaps.length, color: '#ef4444' },
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
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Couverture contre {actor.name.split(' ')[0]}</span>
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
            Gaps non couverts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {gaps.slice(0, 4).map(gap => (
              <div key={gap.id} onClick={() => onSelectGap(gap)} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-danger)', fontWeight: 700, minWidth: 60 }}>{gap.id}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1 }}>{gap.name}</span>
              </div>
            ))}
            {gaps.length > 4 && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-2)' }}>
                +{gaps.length - 4} autres gaps — voir l'onglet ⚠️ Gaps
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
