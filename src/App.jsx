import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import SecurityControlsInput from './components/SecurityControlsInput';
import DetectionRulesInput from './components/DetectionRulesInput';
import Dashboard from './components/Dashboard';
import Landing from './components/Landing';
import './index.css';

const STEPS = [
  { label: 'Contrôles de sécurité', icon: '🛡️', desc: 'EDR, SIEM, MFA, WAF…' },
  { label: 'Règles de détection', icon: '🔍', desc: 'Sigma, Navigator, Menaces' },
  { label: 'Résultats & Gaps', icon: '📊', desc: 'Heatmap ATT&CK + Rapport' },
];

function AppShell() {
  const { state, setStep, reset } = useApp();
  const { currentStep, enabledControls, detectionRules, selectedActors, analysisResult } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ownRules = detectionRules.filter(r => r.source !== 'threat-actor');
  const postureScore = analysisResult?.postureScore ?? null;
  const postureColor = postureScore === null ? 'var(--text-tertiary)' :
    postureScore >= 67 ? '#22c55e' : postureScore >= 34 ? '#eab308' : postureScore > 0 ? '#f97316' : '#ef4444';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">🟣</div>
          <div>
            <div className="logo-text">Purple Team</div>
            <div className="logo-badge">ATT&CK Gap Mapper</div>
          </div>
        </div>

        {/* Workflow nav */}
        <div className="nav-section">
          <div className="nav-section-title">Workflow</div>
          {STEPS.map((step, i) => {
            const isClickable = i <= currentStep || !!analysisResult;
            return (
              <div
                key={i}
                className={`nav-item ${currentStep === i ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                onClick={() => { if (isClickable) setStep(i); setSidebarOpen(false); }}
                style={{ cursor: isClickable ? 'pointer' : 'default', opacity: (!isClickable) ? 0.45 : 1 }}
              >
                <span className="nav-icon">
                  {i < currentStep ? '✅' : step.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'inherit' }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{step.desc}</div>
                </div>
                {i === 0 && enabledControls.length > 0 && (
                  <span className="nav-badge">{enabledControls.length}</span>
                )}
                {i === 1 && (ownRules.length > 0 || selectedActors.length > 0) && (
                  <span className="nav-badge">{ownRules.length + selectedActors.length}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Analysis summary */}
        {analysisResult && (
          <div className="nav-section">
            <div className="nav-section-title">Dernière Analyse</div>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--gradient-purple-subtle)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-lg)',
            }}>
              {/* Posture score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: `3px solid ${postureColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: postureColor }}>{postureScore}</span>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Score de posture</div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: postureColor, marginTop: 2 }}>
                    {postureScore >= 67 ? '✅ Satisfaisant' : postureScore >= 34 ? '⚠️ Partiel' : '🚨 Critique'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '🚨 Gaps critiques', value: analysisResult.criticalGaps.length, color: '#ef4444' },
                  { label: '🟠 Faible couverture', value: analysisResult.weakGaps.length, color: '#f97316' },
                  { label: '✅ Bien couverts', value: analysisResult.wellCoveredCount, color: '#22c55e' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.label}</span>
                    <strong style={{ fontSize: 'var(--text-sm)', color: s.color }}>{s.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 'var(--space-3)' }}>
            📚 <a href="https://attack.mitre.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-400)' }}>MITRE ATT&CK Enterprise v15</a>
            <br />
            {analysisResult ? `${analysisResult.totalTechniques} techniques analysées` : '150+ techniques'}
            {selectedActors.length > 0 && <><br />{selectedActors.length} groupe{selectedActors.length > 1 ? 's' : ''} de menaces</>}
          </div>
          {(enabledControls.length > 0 || ownRules.length > 0) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}
              onClick={reset}
            >
              🔄 Réinitialiser la session
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="app-main">
        {/* Mobile menu */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 'var(--z-modal)',
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-purple)', border: 'none', color: 'white',
            fontSize: '1.2rem', cursor: 'pointer',
          }}
          className="mobile-menu-btn"
        >
          ☰
        </button>

        {/* Wizard progress bar */}
        <div className="wizard-steps">
          {STEPS.map((step, i) => {
            const isClickable = i <= currentStep || !!analysisResult;
            return (
              <div key={i} style={{ display: 'contents' }}>
                <div
                  className={`wizard-step ${currentStep === i ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                  onClick={() => { if (isClickable) setStep(i); }}
                  style={{ cursor: isClickable ? 'pointer' : 'default', opacity: (!isClickable) ? 0.45 : 1 }}
                >
                  <div className="wizard-step-number">
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="wizard-step-label">{step.label}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`wizard-connector ${i < currentStep ? 'completed' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div key={currentStep} style={{ paddingBottom: 'var(--space-16)' }}>
          {currentStep === -1 && <Landing />}
          {currentStep === 0 && <SecurityControlsInput />}
          {currentStep === 1 && <DetectionRulesInput />}
          {currentStep === 2 && <Dashboard />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
