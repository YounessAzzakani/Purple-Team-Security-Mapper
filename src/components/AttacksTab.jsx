import { useState } from 'react';
import { runSimulation, downloadSimulationCsv } from '../services/api';
import { TACTIC_MAP } from '../data/attackData';

const LEVEL_COLORS = { none: '#ef4444', low: '#f97316', medium: '#eab308', high: '#22c55e' };
const LEVEL_LABELS = { none: 'Gap total', low: 'Gap critique', medium: 'Partiel', high: 'Bonne couverture' };

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)', minWidth: 0 }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StepRow({ step, index, total }) {
  const color = LEVEL_COLORS[step.coverage_level] || '#94a3b8';
  const detected = step.expected_status === 'detected';
  const tacticName = TACTIC_MAP[step.tactic]?.name || step.tactic || '—';

  return (
    <div style={{
      position: 'relative', paddingLeft: 28, paddingBottom: index === total - 1 ? 8 : 20,
    }}>
      <div style={{
        position: 'absolute', left: 6, top: 6, bottom: index === total - 1 ? 'auto' : -14,
        width: 2, background: index === total - 1 ? 'transparent' : 'var(--border-subtle)',
      }} />
      <div style={{
        position: 'absolute', left: 0, top: 4, width: 14, height: 14, borderRadius: 'var(--radius-full)',
        background: color, border: '2px solid var(--bg-primary)', boxShadow: `0 0 0 2px ${color}55`,
      }} />
      <div className="card" style={{ padding: 'var(--space-3)', background: detected ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--purple-300)' }}>
            {step.technique_id}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{step.technique_name}</span>
          <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', color: 'var(--text-tertiary)' }}>
            {tacticName}
          </span>
          {step.has_rule
            ? <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderRadius: 'var(--radius-full)' }}>🔍 règle</span>
            : <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 'var(--radius-full)' }}>sans règle</span>}
          <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700, background: `${color}22`, color }}>
            {detected ? '🛡️ Détecté' : '💥 Non détecté'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${step.detection_probability * 100}%`,
              background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease',
            }} />
          </div>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color, minWidth: 42, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
            {(step.detection_probability * 100).toFixed(0)}%
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
            Score couverture: <strong style={{ color }}>{step.score}</strong> · {LEVEL_LABELS[step.coverage_level] || step.coverage_level}
          </span>
          {step.covering_controls.length > 0 && (
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
              🛡️ {step.covering_controls.join(' · ')}
            </span>
          )}
        </div>
        {!step.has_rule && step.rule_hint && (
          <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-tertiary)', lineHeight: 1.5, fontStyle: 'italic' }}>
            💡 {step.rule_hint}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttacksTab({ analysisResult, analysisId }) {
  const actorAnalysis = analysisResult?.actorAnalysis || [];
  const availableActors = actorAnalysis.map(a => a.actor.id);
  const [selected, setSelected] = useState(availableActors);
  const [runs, setRuns] = useState(200);
  const [seed, setSeed] = useState('42');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportError, setExportError] = useState(null);

  async function launch() {
    if (selected.length === 0) return;
    setLoading(true); setError(null); setExportError(null);
    try {
      const res = await runSimulation(analysisId, selected, {
        runs,
        seed: seed.trim() !== '' ? Number(seed) : null,
      });
      setSimulation(res.simulations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    if (!simulation) return;
    try {
      await downloadSimulationCsv(analysisId, selected, { runs, seed: seed.trim() !== '' ? Number(seed) : null });
    } catch (err) {
      setExportError(err.message);
    }
  }

  function toggleActor(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>💣 Simulation de campagnes APT</h2>
          <p className="page-subtitle">
            Monte-Carlo déterministe (graine) sur la séquence de techniques de chaque acteur —
            probabilité de détection dérivée du score de couverture de chaque étape.
          </p>
        </div>
      </div>

      {availableActors.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Aucun acteur sélectionné dans l'analyse. Relancez une analyse avec des profils d'attaquants activés.
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 600 }}>
              🎭 ACTEURS À SIMULER
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-4)' }}>
              {availableActors.map(id => (
                <button
                  key={id}
                  className="btn"
                  onClick={() => toggleActor(id)}
                  style={{
                    padding: '6px 12px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-full)',
                    background: selected.includes(id) ? 'var(--gradient-purple)' : 'var(--bg-tertiary)',
                    color: selected.includes(id) ? '#fff' : 'var(--text-secondary)',
                    border: selected.includes(id) ? 'none' : '1px solid var(--border-subtle)',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {selected.includes(id) ? '✓ ' : ''}{id}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>RUNS</span>
                <input className="form-input" type="number" min={1} max={5000} value={runs} onChange={e => setRuns(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))} style={{ width: 90 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>GRAINE (déterministe)</span>
                <input className="form-input" type="text" value={seed} onChange={e => setSeed(e.target.value)} style={{ width: 90 }} />
              </label>
              <button className="btn btn-primary" onClick={launch} disabled={loading || selected.length === 0} style={{ minWidth: 190 }}>
                {loading ? 'Simulation en cours…' : '⚡ Lancer la simulation'}
              </button>
              <button className="btn btn-secondary" onClick={exportCsv} disabled={!simulation}>
                ⬇️ Export CSV des étapes
              </button>
            </div>
            {error && <div style={{ marginTop: 'var(--space-3)', color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>⚠️ {error}</div>}
            {exportError && <div style={{ marginTop: 'var(--space-3)', color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>⚠️ {exportError}</div>}
          </div>

          {simulation && simulation.map(sim => {
            const weak = sim.weak_link;
            const chokepoint = sim.chokepoint;
            return (
              <div key={sim.actor_id} className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{sim.actor_name} <span style={{ opacity: 0.6, fontSize: 'var(--text-sm)' }}>({sim.actor_id})</span></h3>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{sim.runs} runs</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <MetricCard
                    label="🎯 Campagne aboutie"
                    value={`${(sim.success_rate * 100).toFixed(0)}%`}
                    sub="aucune détection avant la fin de la séquence"
                    color={sim.success_rate > 0.5 ? '#ef4444' : '#22c55e'}
                  />
                  <MetricCard
                    label="↳ Avancement moyen"
                    value={`${(sim.mean_reach * 100).toFixed(0)}%`}
                    sub="de la séquence parcourue en moyenne"
                  />
                  <MetricCard
                    label="🛡️ Point de rupture SOC"
                    value={chokepoint ? `${(chokepoint.detection_rate * 100).toFixed(0)}%` : '—'}
                    sub={chokepoint ? `détection à ${chokepoint.technique_id} (${chokepoint.technique_name})` : 'aucune étape détectée'}
                    color="#22c55e"
                  />
                  <MetricCard
                    label="🕳️ Maillon faible"
                    value={weak ? `${(weak.detection_probability * 100).toFixed(0)}%` : '—'}
                    sub={weak ? `${weak.technique_id} — la détection la moins probable` : ''}
                    color={weak ? '#ef4444' : undefined}
                  />
                </div>

                {weak && (
                  <div style={{
                    marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6,
                  }}>
                    ⚠️ <strong>Recommandation :</strong> l'attaque s'appuiera probablement sur <strong>{weak.technique_name}</strong> ({weak.technique_id}).
                    Comblez ce gap (contrôle ou règle Sigma) pour casser la séquence avant l'impact.
                  </div>
                )}

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>
                  SÉQUENCE D'ATTAQUE ({sim.steps.length} étapes — ⛔ = détection bloquante, 💥 = étape discrète)
                </div>
                {sim.steps.map((step, i) => (
                  <StepRow key={step.technique_id} step={step} index={i} total={sim.steps.length} />
                ))}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}