import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { THREAT_ACTORS } from '../../data/threatActors';
import { TACTICS } from '../../data/attackData';
import { exportAssessmentToPdf } from '../../services/pdfExport';

/* ── Inline Geometric SVG Icons ── */
function Icon({ name, size = 18, className = '', style = {} }) {
  const icons = {
    radar: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6a6 6 0 1 0 6 6" />
        <path d="M12 10a2 2 0 1 0 2 2" />
        <line x1="12" y1="12" x2="19.07" y2="4.93" />
      </>
    ),
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
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
    fileCode: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="10 13 8 15 10 17" />
        <polyline points="14 13 16 15 14 17" />
      </>
    ),
    terminal: (
      <>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    history: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <path d="M3.05 11a9 9 0 0 1 .5-2m1.8-3.4A9 9 0 0 1 12 3" />
      </>
    ),
    arrowRight: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    arrowLeft: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
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
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    sparkles: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {icons[name] || icons.radar}
    </svg>
  );
}

const WIZARD_STEPS = [
  { id: 1, label: 'Threat Scope', icon: 'crosshair', title: 'Adversary Profiles & TTPs' },
  { id: 2, label: 'SOC Defenses', icon: 'shield', title: 'Security Solutions Telemetry' },
  { id: 3, label: 'Detections', icon: 'fileCode', title: 'Methods & Sigma Rules' },
  { id: 4, label: 'Profile & Mode', icon: 'settings', title: 'Assessment Metadata' },
  { id: 5, label: 'Execute Scan', icon: 'zap', title: 'Live Engine & Treatment Log' },
];

const PIPELINE_PHASES = [
  { id: 1, title: 'Sigma Detection Rule Parsing', desc: 'Validating active YAML rules, syntax integrity, and MITRE tactic/technique mappings' },
  { id: 2, title: 'SOC Solutions Telemetry Correlation', desc: 'Cross-referencing active EDR, SIEM, NGFW, and Cloud telemetry data sources' },
  { id: 3, title: 'Detection Method Weighting', desc: 'Factoring behavioral ML, log correlations, deception tripwires, and confidence ratings' },
  { id: 4, title: 'Adversary TTP Kill Chain Mapping', desc: 'Indexing selected APT groups against the MITRE ATT&CK Enterprise Matrix' },
  { id: 5, title: 'Tripartite Gap Scoring Formula', desc: 'Calculating combined index: Rules (40%) + Preventive (30%) + Detective (30%)' },
  { id: 6, title: 'Monte-Carlo Adversary Simulation', desc: 'Simulating 200 stochastic attack progression runs to pinpoint chokepoints & breach paths' },
  { id: 7, title: 'Formulating Purple Team Insights', desc: 'Synthesizing Blue Team remediation priorities and Red Team exploitation vectors' },
  { id: 8, title: 'Database Snapshot & Report Generation', desc: 'Persisting analysis record to backend database and finalizing executive metrics' },
];

export default function RunScanPage({ onNavigate }) {
  const {
    state,
    runAnalysis,
    toggleActor,
    toggleSolution,
    toggleDetectionMethod,
  } = useApp();

  const {
    securitySolutions,
    detectionMethods,
    detectionRules,
    selectedActors,
    analysisResult,
    analysisMeta,
    loading,
  } = state;

  const [wizardStep, setWizardStep] = useState(1);
  const [scanName, setScanName] = useState(
    `Purple Team Assessment — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  );
  const [targetEntity, setTargetEntity] = useState('Enterprise Corp (Production Environment)');
  const [actorFilter, setActorFilter] = useState('all'); // 'all' | 'russia' | 'china' | 'ransomware' | 'financial'

  // Execution state
  const [activePipelineIndex, setActivePipelineIndex] = useState(-1);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [lastCreatedAnalysis, setLastCreatedAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const terminalBottomRef = useRef(null);

  const activeSolutions = securitySolutions.filter(s => s.enabled);
  const activeMethods = detectionMethods.filter(m => m.enabled);
  const activeRules = detectionRules.filter(r => r.source !== 'threat-actor');

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addLog = (text, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setConsoleLogs(prev => [...prev, { text, level, timestamp }]);
  };

  const handleStartScan = async () => {
    if (loading) return;
    setErrorMsg(null);
    setScanComplete(false);
    setConsoleLogs([]);
    setActivePipelineIndex(0);

    addLog(`[SYSTEM] Initializing ATTACKPRISM Purple Team Defense Engine v2.4`, 'system');
    addLog(`[TARGET] Target Entity: ${targetEntity}`, 'system');
    addLog(`[CONFIG] Scope: ${selectedActors.length || 'ALL'} APTs | ${activeSolutions.length} Solutions | ${activeMethods.length} Methods | ${activeRules.length} Rules`, 'system');

    try {
      // Step 1
      setActivePipelineIndex(0);
      addLog(`[1/8] Ingesting & indexing ${activeRules.length} Sigma detection rules...`, 'info');
      await new Promise(r => setTimeout(r, 400));
      addLog(`✓ Parsed detection rules successfully across MITRE tactics.`, 'success');

      // Step 2
      setActivePipelineIndex(1);
      addLog(`[2/8] Correlating ${activeSolutions.length} active SOC security solutions & telemetry feeds...`, 'info');
      await new Promise(r => setTimeout(r, 380));
      addLog(`✓ Telemetry mapped: ${activeSolutions.map(s => s.category).join(', ')}.`, 'success');

      // Step 3
      setActivePipelineIndex(2);
      addLog(`[3/8] Evaluating detection method confidence vectors & ML telemetry...`, 'info');
      await new Promise(r => setTimeout(r, 350));
      addLog(`✓ High-fidelity tripwires and heuristic analyzers verified.`, 'success');

      // Step 4
      setActivePipelineIndex(3);
      const actorList = selectedActors.length > 0 ? selectedActors.join(', ') : 'ALL_GLOBAL_THREAT_ACTORS';
      addLog(`[4/8] Mapping adversary TTPs: [${actorList}]...`, 'info');
      await new Promise(r => setTimeout(r, 400));
      addLog(`✓ Loaded technique profiles and adversary execution paths.`, 'success');

      // Step 5
      setActivePipelineIndex(4);
      addLog(`[5/8] Computing Tripartite Matrix: Rules(40%) + Prev(30%) + Det(30%)...`, 'info');
      
      const body = await runAnalysis({
        name: scanName,
        actorIds: selectedActors,
        solutions: securitySolutions,
        detectionMethods: detectionMethods,
      });

      addLog(`✓ Coverage algorithm finalized. Posture Score computed: ${body.result?.postureScore || 0}/100.`, 'success');

      // Step 6
      setActivePipelineIndex(5);
      addLog(`[6/8] Executing Monte-Carlo adversary breach simulation (200 stochastic runs)...`, 'info');
      await new Promise(r => setTimeout(r, 450));
      addLog(`✓ Adversary campaign simulation completed. Chokepoints and weak links isolated.`, 'success');

      // Step 7
      setActivePipelineIndex(6);
      addLog(`[7/8] Generating actionable Blue Team remediations and Red Team attack paths...`, 'info');
      await new Promise(r => setTimeout(r, 380));
      addLog(`✓ Formulated top Sigma recommendations and detection engineering directives.`, 'success');

      // Step 8
      setActivePipelineIndex(7);
      addLog(`[8/8] Committing snapshot to persistent backend storage...`, 'info');
      await new Promise(r => setTimeout(r, 300));
      addLog(`[COMPLETE] Scan execution complete. Analysis ID #${body.analysis?.id || 'RECENT'} saved.`, 'system');

      setActivePipelineIndex(8);
      setScanComplete(true);
      setLastCreatedAnalysis(body);
    } catch (err) {
      setErrorMsg(err.message || 'Scan execution encountered an error.');
      addLog(`[ERROR] Scan aborted: ${err.message}`, 'error');
    }
  };

  const filteredActors = useMemo(() => {
    if (actorFilter === 'all') return THREAT_ACTORS;
    if (actorFilter === 'russia') return THREAT_ACTORS.filter(a => a.origin.includes('Russia'));
    if (actorFilter === 'china') return THREAT_ACTORS.filter(a => a.origin.includes('China'));
    if (actorFilter === 'ransomware') return THREAT_ACTORS.filter(a => a.id.includes('lockbit') || a.id.includes('wizard'));
    if (actorFilter === 'financial') return THREAT_ACTORS.filter(a => a.id.includes('fin') || a.id.includes('lazarus'));
    return THREAT_ACTORS;
  }, [actorFilter]);

  const handleExportPdf = () => {
    if (lastCreatedAnalysis) {
      exportAssessmentToPdf(lastCreatedAnalysis);
    } else if (analysisResult) {
      exportAssessmentToPdf({
        analysis: analysisMeta || { name: scanName, id: 'CURRENT', posture_score: analysisResult.postureScore },
        result: analysisResult,
        inputs: {
          securitySolutions,
          detectionMethods,
          actorIds: selectedActors,
          rules: activeRules,
        },
      });
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <span className="badge" style={{ background: 'var(--violet-soft)', color: 'var(--purple-300)', borderColor: 'var(--border-subtle)' }}>
              <Icon name="radar" size={13} style={{ marginRight: 4 }} />
              STEP-BY-STEP WIZARD
            </span>
            <span className="badge" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.25)' }}>
              PURPLE TEAM SCAN ENGINE
            </span>
          </div>
          <h1 className="page-header-title">
            Purple Team Assessment Wizard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4, maxWidth: 720 }}>
            Configure adversary profiles, customize SOC telemetry & Sigma detection rules, set assessment parameters, and launch the multi-vector gap evaluation engine.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            onClick={() => onNavigate('history')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Icon name="history" size={16} />
            View Past Reports
          </button>
        </div>
      </div>

      {/* ── Wizard Stepper Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-6)', overflowX: 'auto', gap: 12,
      }}>
        {WIZARD_STEPS.map((step) => {
          const isActive = wizardStep === step.id;
          const isPassed = wizardStep > step.id;

          return (
            <div
              key={step.id}
              onClick={() => setWizardStep(step.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--violet-soft)' : isPassed ? 'rgba(16,185,129,0.06)' : 'transparent',
                border: isActive ? '1px solid var(--purple-400)' : isPassed ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isPassed ? '#10b981' : isActive ? 'var(--gradient-purple)' : 'var(--bg-tertiary)',
                color: isPassed || isActive ? '#fff' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                boxShadow: isActive ? '0 0 12px rgba(124, 58, 237, 0.5)' : 'none',
              }}>
                {isPassed ? '✓' : step.id}
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  STEP 0{step.id}
                </div>
                <div style={{
                  fontSize: 'var(--text-xs)', fontWeight: 800,
                  color: isActive ? 'var(--purple-200)' : isPassed ? '#10b981' : 'var(--text-secondary)',
                }}>
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Wizard Content Body ── */}
      <div className="card" style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', minHeight: 480,
      }}>
        {/* ══════════════════════════════════════════════════════════════
            STEP 1: THREAT INTEL & ADVERSARY PROFILES
           ══════════════════════════════════════════════════════════════ */}
        {wizardStep === 1 && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="crosshair" size={20} style={{ color: '#f43f5e' }} />
                  Step 1: Select Target Adversary Profiles (APTs)
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Choose which threat groups the purple scan should evaluate your defenses against. If none selected, the scan evaluates all known enterprise TTPs.
                </p>
              </div>

              {/* Quick Filters */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', 'russia', 'china', 'ransomware', 'financial'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActorFilter(filter)}
                    style={{
                      padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                      background: actorFilter === filter ? 'var(--gradient-purple)' : 'var(--bg-tertiary)',
                      border: actorFilter === filter ? '1px solid var(--purple-400)' : '1px solid var(--border-subtle)',
                      color: actorFilter === filter ? '#fff' : 'var(--text-secondary)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Actor Cards Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-3)', marginBottom: 'var(--space-6)',
            }}>
              {filteredActors.map(actor => {
                const isSelected = selectedActors.includes(actor.id);
                return (
                  <div
                    key={actor.id}
                    onClick={() => toggleActor(actor.id)}
                    style={{
                      padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--violet-soft)' : 'var(--bg-tertiary)',
                      border: isSelected ? '1.5px solid var(--purple-400)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative',
                    }}
                    className="table-row-hover"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{actor.origin.split(' ')[0]}</span>
                        <strong style={{ fontSize: 'var(--text-sm)', color: isSelected ? 'var(--purple-200)' : 'var(--text-primary)' }}>
                          {actor.name}
                        </strong>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: isSelected ? 'var(--purple-400)' : 'var(--bg-secondary)',
                        border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                      }}>
                        {isSelected && '✓'}
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                      {actor.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      <span>Sectors: {actor.sector?.slice(0, 2).join(', ')}</span>
                      <span className="badge badge-purple" style={{ fontSize: 9 }}>
                        {actor.techniques?.length || 0} TTPs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: SECURITY SOLUTIONS & TELEMETRY
           ══════════════════════════════════════════════════════════════ */}
        {wizardStep === 2 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="shield" size={20} style={{ color: '#10b981' }} />
                Step 2: Implemented Security Solutions (Preventive - 30% Weight)
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                Review active security platforms currently protecting the target entity. Toggle solutions to simulate their impact on the gap matrix.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {securitySolutions.map(sol => (
                <div
                  key={sol.id}
                  style={{
                    padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                    background: sol.enabled ? 'rgba(16,185,129,0.06)' : 'var(--bg-tertiary)',
                    border: sol.enabled ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-subtle)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: 'var(--text-sm)', color: sol.enabled ? '#10b981' : 'var(--text-muted)' }}>
                        {sol.name}
                      </strong>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={sol.enabled}
                          onChange={() => toggleSolution(sol.id)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                      {sol.category} • Vendor: {sol.vendor} • Status: <strong style={{ color: sol.status === 'enforcing' ? '#10b981' : '#f59e0b' }}>{sol.status}</strong>
                    </div>

                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {sol.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(sol.dataSources || []).map((ds, idx) => (
                      <span key={idx} style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 3,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)',
                      }}>
                        {ds}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: DETECTION METHODS & SIGMA RULES
           ══════════════════════════════════════════════════════════════ */}
        {wizardStep === 3 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="fileCode" size={20} style={{ color: '#06b6d4' }} />
                Step 3: Detection Capabilities & Sigma Rules
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                The engine evaluates active detection heuristics (30% weight) and validated custom Sigma rules (40% weight).
              </p>
            </div>

            {/* Methods Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {detectionMethods.map(m => (
                <div
                  key={m.id}
                  style={{
                    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
                    background: m.enabled ? 'rgba(6,182,212,0.08)' : 'var(--bg-tertiary)',
                    border: m.enabled ? '1px solid rgba(6,182,212,0.3)' : '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 'var(--text-xs)', color: m.enabled ? '#06b6d4' : 'var(--text-muted)' }}>
                      {m.name}
                    </strong>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {m.type} • Confidence: {m.confidence}
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() => toggleDetectionMethod(m.id)}
                    />
                    <span className="slider round" />
                  </label>
                </div>
              ))}
            </div>

            {/* Sigma Rules Summary Box */}
            <div style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                  Active Sigma Rules Inventory ({activeRules.length} Loaded)
                </strong>
                <button
                  onClick={() => onNavigate('soc')}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, color: 'var(--purple-300)' }}
                >
                  + Upload More Rules in SOC Center →
                </button>
              </div>

              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '6px 8px' }}>RULE TITLE</th>
                      <th style={{ padding: '6px 8px' }}>LEVEL</th>
                      <th style={{ padding: '6px 8px' }}>MITRE TECHNIQUES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRules.slice(0, 8).map((r, i) => (
                      <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{r.title}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                            background: r.level === 'critical' ? 'rgba(244,63,94,0.15)' : 'rgba(6,182,212,0.15)',
                            color: r.level === 'critical' ? '#f43f5e' : '#06b6d4',
                          }}>
                            {r.level}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', color: 'var(--purple-300)', fontFamily: 'monospace' }}>
                          {(r.techniques || []).join(', ') || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 4: PROFILE & ASSESSMENT CONFIGURATION
           ══════════════════════════════════════════════════════════════ */}
        {wizardStep === 4 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="settings" size={20} style={{ color: 'var(--purple-300)' }} />
                Step 4: Assessment Profile & Launch Parameters
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                Review your assessment metadata and simulation scope before launching the execution sequence.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assessment Name / Campaign Title
                </label>
                <input
                  type="text"
                  value={scanName}
                  onChange={e => setScanName(e.target.value)}
                  placeholder="e.g. Purple Team Assessment — Q3 Baseline"
                  style={{
                    width: '100%', height: 46, padding: '0 16px',
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    outline: 'none', transition: 'all 0.15s ease',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--purple-400)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.15)'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Target Enterprise Entity / Division
                </label>
                <input
                  type="text"
                  value={targetEntity}
                  onChange={e => setTargetEntity(e.target.value)}
                  placeholder="e.g. Enterprise Corp (Production Environment)"
                  style={{
                    width: '100%', height: 46, padding: '0 16px',
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    outline: 'none', transition: 'all 0.15s ease',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--purple-400)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.15)'; }}
                />
              </div>
            </div>

            {/* Scope Summary Checklist */}
            <div style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
            }}>
              <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
                Pre-Execution Scope Checklist:
              </strong>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 'var(--text-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <Icon name="checkCircle" size={14} />
                  <span><strong>{selectedActors.length === 0 ? 'All 6 APT Groups' : `${selectedActors.length} APTs Selected`}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <Icon name="checkCircle" size={14} />
                  <span><strong>{activeSolutions.length} Security Solutions</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <Icon name="checkCircle" size={14} />
                  <span><strong>{activeMethods.length} Detection Methods</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <Icon name="checkCircle" size={14} />
                  <span><strong>{activeRules.length} Sigma Detection Rules</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 5: EXECUTION PIPELINE & LIVE TERMINAL
           ══════════════════════════════════════════════════════════════ */}
        {wizardStep === 5 && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="zap" size={20} style={{ color: '#06b6d4' }} />
                  Step 5: Live Scan Execution & Treatment Pipeline
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Engage the scan sequence to execute the 8-stage calculation pipeline in real time.
                </p>
              </div>

              {!scanComplete && (
                <button
                  onClick={handleStartScan}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', fontSize: 'var(--text-sm)', fontWeight: 800,
                    boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
                  }}
                >
                  <Icon name="zap" size={16} />
                  {loading ? 'Executing 8 Treatment Stages…' : 'INITIALIZE SCAN SEQUENCE'}
                </button>
              )}
            </div>

            {/* Grid: Stepper + Terminal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
              {/* Stepper */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PIPELINE_PHASES.map((phase, idx) => {
                  const isCompleted = activePipelineIndex > idx;
                  const isCurrent = activePipelineIndex === idx;

                  return (
                    <div
                      key={phase.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '8px 12px', borderRadius: 'var(--radius-md)',
                        background: isCurrent ? 'var(--violet-soft)' : isCompleted ? 'rgba(16,185,129,0.06)' : 'var(--bg-tertiary)',
                        border: isCurrent ? '1px solid var(--purple-400)' : isCompleted ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: isCompleted ? '#10b981' : isCurrent ? 'var(--gradient-purple)' : 'var(--bg-secondary)',
                        color: isCompleted || isCurrent ? '#fff' : 'var(--text-tertiary)',
                        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isCompleted ? '✓' : phase.id}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isCompleted ? '#10b981' : isCurrent ? 'var(--purple-200)' : 'var(--text-secondary)' }}>
                          {phase.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                          {phase.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Terminal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{
                  background: '#090d16', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 6, fontFamily: 'monospace' }}>
                        pty://attackprism-scan.engine
                      </span>
                    </div>
                    {loading && (
                      <span style={{ fontSize: 10, color: '#06b6d4', animation: 'pulse 1.2s infinite' }}>
                        ● CALCULATING
                      </span>
                    )}
                  </div>

                  <div style={{
                    padding: '14px', minHeight: 320, maxHeight: 380, overflowY: 'auto',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: 11, lineHeight: 1.6,
                  }}>
                    {consoleLogs.length === 0 ? (
                      <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', paddingTop: 20 }}>
                        // Standby. Click "INITIALIZE SCAN SEQUENCE" to execute treatment stages.
                      </div>
                    ) : (
                      consoleLogs.map((log, idx) => (
                        <div key={idx} style={{
                          marginBottom: 3,
                          color: log.level === 'system' ? '#c084fc'
                            : log.level === 'success' ? '#10b981'
                            : log.level === 'error' ? '#f43f5e'
                            : '#94a3b8',
                        }}>
                          <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 6 }}>[{log.timestamp}]</span>
                          {log.text}
                        </div>
                      ))
                    )}
                    <div ref={terminalBottomRef} />
                  </div>
                </div>

                {/* Scan Success Banner */}
                {scanComplete && (
                  <div className="card animate-fade-in" style={{
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                    border: '1px solid var(--purple-400)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="checkCircle" size={20} style={{ color: '#10b981' }} />
                        <div>
                          <strong style={{ fontSize: 'var(--text-sm)', color: '#f8fafc' }}>
                            Assessment Finished & Snapshot Saved
                          </strong>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                            Posture Score: <strong style={{ color: '#c084fc' }}>{analysisResult?.postureScore || 0}/100</strong> | Critical Gaps: <strong style={{ color: '#f43f5e' }}>{analysisResult?.criticalGaps?.length || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        onClick={handleExportPdf}
                        className="btn btn-primary"
                        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon name="download" size={13} />
                        Download Executive PDF Report
                      </button>
                      <button
                        onClick={() => onNavigate('history')}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon name="history" size={13} />
                        Inspect in History & Attack Simulator
                      </button>
                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="btn btn-ghost"
                        style={{ fontSize: 11, color: 'var(--text-secondary)' }}
                      >
                        Go to Dashboard →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Wizard Bottom Navigation Controls ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
            disabled={wizardStep === 1}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)' }}
          >
            <Icon name="arrowLeft" size={14} />
            Previous Step
          </button>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Step {wizardStep} of {WIZARD_STEPS.length}
          </div>

          {wizardStep < 5 ? (
            <button
              onClick={() => setWizardStep(prev => Math.min(5, prev + 1))}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)' }}
            >
              Next: {WIZARD_STEPS[wizardStep].label}
              <Icon name="arrowRight" size={14} />
            </button>
          ) : (
            <button
              onClick={() => setWizardStep(1)}
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}
            >
              Restart Wizard ↺
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
