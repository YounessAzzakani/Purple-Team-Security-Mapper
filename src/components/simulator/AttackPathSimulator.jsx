import { useState, useEffect, useMemo } from 'react';
import { THREAT_ACTORS } from '../../data/threatActors';
import { TECHNIQUE_INTEL, MITIGATIONS } from '../../data/mitigationsData';
import * as api from '../../services/api';

/* ── Inline SVG Icons ── */
function Icon({ name, size = 18, className = '', style = {} }) {
  const icons = {
    crosshair: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    arrowRight: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
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
    target: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    refresh: (
      <>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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
      {icons[name] || icons.crosshair}
    </svg>
  );
}

export default function AttackPathSimulator({
  analysisId,
  techniqueScores = {},
  selectedActorIds = [],
}) {
  const [activeActorId, setActiveActorId] = useState(selectedActorIds[0] || 'apt29');
  const [runs, setRuns] = useState(200);
  const [simulations, setSimulations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  const activeActor = useMemo(() => {
    return THREAT_ACTORS.find(a => a.id === activeActorId) || THREAT_ACTORS[0];
  }, [activeActorId]);

  // Client-side fallback / direct simulation calculation if API is unavailable or fast compute
  const runSimulationAction = async () => {
    setLoading(true);
    try {
      if (analysisId) {
        const resp = await api.runSimulation(analysisId, [activeActorId], { runs });
        setSimulations(resp.simulations);
      } else {
        // Fallback local simulation calculation
        const steps = (activeActor.techniques || []).map(tid => {
          const ts = techniqueScores[tid] || {};
          const score = ts.score || 0;
          const prob = score >= 100 ? 0.95 : score >= 75 ? 0.82 : score >= 50 ? 0.60 : score >= 25 ? 0.30 : 0.05;
          return {
            technique_id: tid,
            technique_name: ts.name || tid,
            tactic: ts.tactic || 'General',
            score: score,
            coverage_level: ts.level || (score <= 0 ? 'none' : 'low'),
            detection_probability: prob,
            expected_status: prob >= 0.5 ? 'detected' : 'missed',
            has_rule: Boolean(ts.coveringRules?.length),
            covering_controls: (ts.coveringControls || []).map(c => c.name).slice(0, 3),
            rule_hint: TECHNIQUE_INTEL[tid]?.sigmaGuidance || '',
          };
        });

        // Run Monte-Carlo
        let success = 0;
        const n = steps.length;
        const detectedCounts = new Array(n).fill(0);

        for (let r = 0; r < runs; r++) {
          let halted = false;
          for (let i = 0; i < n; i++) {
            if (Math.random() < steps[i].detection_probability) {
              detectedCounts[i]++;
              halted = true;
              break;
            }
          }
          if (!halted) success++;
        }

        const bestIdx = detectedCounts.indexOf(Math.max(...detectedCounts));
        const chokepoint = detectedCounts[bestIdx] > 0 ? {
          technique_id: steps[bestIdx].technique_id,
          technique_name: steps[bestIdx].technique_name,
          probability: detectedCounts[bestIdx] / runs,
        } : null;

        setSimulations({
          [activeActorId]: {
            actor_id: activeActorId,
            total_steps: n,
            runs,
            success_rate: success / runs,
            mean_reach: 0.5,
            chokepoint,
            steps,
          },
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulationAction();
  }, [activeActorId, analysisId]);

  const activeSimulation = simulations ? simulations[activeActorId] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* ── Actor Selection Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', marginRight: 4 }}>
            SELECT ADVERSARY CAMPAIGN:
          </span>
          {THREAT_ACTORS.map(actor => {
            const isSelected = activeActorId === actor.id;
            return (
              <button
                key={actor.id}
                onClick={() => { setActiveActorId(actor.id); setSelectedStep(null); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--gradient-purple)' : 'var(--bg-secondary)',
                  border: isSelected ? '1px solid var(--purple-400)' : '1px solid var(--border-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)', fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 12px rgba(124, 58, 237, 0.4)' : 'none',
                }}
              >
                <span>{actor.origin.split(' ')[0]}</span>
                <span>{actor.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={runSimulationAction}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="refresh" size={12} />
            {loading ? 'Simulating…' : 'Re-Run (200 Runs)'}
          </button>
        </div>
      </div>

      {/* ── Simulation Metrics Bar ── */}
      {activeSimulation && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-3)',
        }}>
          {/* Breach Success Rate */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Adversary Breach Probability
            </div>
            <div style={{
              fontSize: 'var(--text-xl)', fontWeight: 900, marginTop: 2,
              color: activeSimulation.success_rate >= 0.5 ? '#f43f5e' : '#10b981',
            }}>
              {Math.round(activeSimulation.success_rate * 100)}% Success
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {activeSimulation.success_rate >= 0.5 ? 'High risk: Attacker likely overcomes defenses' : 'Defenses likely intercept the campaign'}
            </div>
          </div>

          {/* Kill Chain Length */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Kill Chain Complexity
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: '#06b6d4', marginTop: 2 }}>
              {activeSimulation.steps?.length || 0} Attack Stages
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              From Initial Access to Impact / Exfiltration
            </div>
          </div>

          {/* Prime SOC Intercept Chokepoint */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--purple-300)', textTransform: 'uppercase', fontWeight: 700 }}>
              🎯 Optimal SOC Chokepoint
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
              {activeSimulation.chokepoint ? `${activeSimulation.chokepoint.technique_id} - ${activeSimulation.chokepoint.technique_name}` : 'No single chokepoint'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Deploying Sigma detection here stops the entire kill chain
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Kill Chain Step Progression ── */}
      {activeSimulation && activeSimulation.steps && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--space-2)',
          }}>
            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>
              Sequential Adversary Attack Progression Path
            </h4>
            <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> SOC Intercept
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Partial Monitoring
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f43f5e' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} /> Undefended Gap (Passes)
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
            maxHeight: 440, overflowY: 'auto', paddingRight: 4,
          }}>
            {activeSimulation.steps.map((step, idx) => {
              const isDetected = step.expected_status === 'detected';
              const prob = Math.round(step.detection_probability * 100);
              const isSelected = selectedStep?.technique_id === step.technique_id;
              const statusColor = prob >= 75 ? '#10b981' : prob >= 30 ? '#f59e0b' : '#f43f5e';

              return (
                <div
                  key={step.technique_id || idx}
                  onClick={() => setSelectedStep(step)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--violet-soft)' : 'var(--bg-secondary)',
                    border: isSelected ? '1px solid var(--purple-400)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  className="table-row-hover"
                >
                  {/* Left: Step number & Technique Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: `${statusColor}20`, border: `1px solid ${statusColor}50`,
                      color: statusColor, fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {idx + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 800, color: 'var(--purple-300)',
                          fontSize: 'var(--text-xs)',
                        }}>
                          {step.technique_id}
                        </span>
                        <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                          {step.technique_name}
                        </strong>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Tactic: {step.tactic} • Coverage: {step.score}% ({step.coverage_level})
                      </div>
                    </div>
                  </div>

                  {/* Right: Probability Gauge & Outcome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>P(Detection)</div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: statusColor }}>
                        {prob}%
                      </div>
                    </div>

                    <span style={{
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                      background: `${statusColor}18`, border: `1px solid ${statusColor}40`,
                      color: statusColor, fontSize: 10, fontWeight: 800, minWidth: 100, textAlign: 'center',
                    }}>
                      {isDetected ? 'BLOCKED / ALARM' : 'EXPLOITED / PASS'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selected Technique Remediation Drawer ── */}
      {selectedStep && (
        <div className="card animate-fade-in" style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--purple-400)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-purple">{selectedStep.technique_id}</span>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {selectedStep.technique_name}
              </strong>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {selectedStep.rule_hint ? (
              <div>
                <strong style={{ color: 'var(--purple-300)' }}>Blue Team Sigma Directive:</strong> {selectedStep.rule_hint}
              </div>
            ) : (
              <div>No specific custom Sigma directive registered. Ingest standard detection rules for {selectedStep.technique_id}.</div>
            )}
          </div>

          {selectedStep.covering_controls && selectedStep.covering_controls.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-2)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Active Controls:</span>
              {selectedStep.covering_controls.map((c, i) => (
                <span key={i} className="badge badge-info" style={{ fontSize: 10 }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
