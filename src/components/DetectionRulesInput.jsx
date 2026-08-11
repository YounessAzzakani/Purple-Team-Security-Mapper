import { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TECHNIQUES, TECHNIQUE_MAP } from '../data/attackData';
import ThreatActorSelector from './ThreatActorSelector';

const TABS = [
  { key: 'import', label: '📂 Import Fichiers', desc: 'Sigma YAML / Navigator JSON' },
  { key: 'manual', label: '✏️ Ajout Manuel', desc: 'Technique par technique' },
  { key: 'actors', label: '🎯 Groupes Menaces', desc: 'Profils d\'attaquants APT' },
];

const SOURCE_LABELS = { sigma: 'Sigma', navigator: 'Navigator', manual: 'Manuel' };

export default function DetectionRulesInput() {
  const { state, uploadRuleFile, addManualRule, removeRule, runAnalysis, setStep, toggleActor } = useApp();
  const [activeTab, setActiveTab] = useState('import');
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [manualTechId, setManualTechId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    setParseError(null); setParseSuccess(null);
    setUploading(true);
    try {
      const results = [];
      for (const file of files) {
        const body = await uploadRuleFile(file);   // parsing happens server-side (PyYAML)
        results.push(body);
      }
      const total = results.reduce((n, r) => n + r.rules.length, 0);
      if (total > 0) {
        setParseSuccess(`✅ ${total} règle${total > 1 ? 's' : ''} importée${total > 1 ? 's' : ''} sur le serveur`);
      } else {
        setParseError('Aucune règle avec des tags ATT&CK trouvée. Vérifiez que vos règles ont des tags attack.tXXXX.');
      }
    } catch (err) {
      setParseError(`⚠️ ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [uploadRuleFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragActive(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleManualSearch = (val) => {
    setSearch(val);
    if (val.length < 2) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    setSuggestions(
      TECHNIQUES.filter(t => t.id.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower)).slice(0, 8)
    );
  };

  const handleSelectTechnique = (technique) => {
    setManualTechId(technique.id);
    setSearch(`${technique.id} — ${technique.name}`);
    setSuggestions([]);
    setManualTitle(prev => prev || `Détection: ${technique.name}`);
  };

  const handleAddManual = async () => {
    if (!manualTechId || !manualTitle) return;
    setParseError(null); setParseSuccess(null);
    try {
      await addManualRule({
        title: manualTitle,
        level: 'medium',
        techniques: [manualTechId],
      });
      setParseSuccess('✅ Règle manuelle ajoutée au catalogue SOC');
      setManualTechId(''); setManualTitle(''); setSearch(''); setSuggestions([]);
    } catch (err) {
      setParseError(`⚠️ ${err.message}`);
    }
  };

  const handleRemoveRule = async (ruleId) => {
    try {
      await removeRule(ruleId);
    } catch (err) {
      setParseError(`⚠️ ${err.message}`);
    }
  };

  const handleNext = async () => {
    setParseError(null);
    try {
      await runAnalysis();
      setStep(2);
    } catch (err) {
      setParseError(`⚠️ ${err.message}`);
    }
  };
  const handleBack = () => setStep(0);

  const levelColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa' };
  const sourceColors = {
    sigma: { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc' },
    navigator: { bg: 'rgba(14,165,233,0.12)', color: '#7dd3fc' },
    manual: { bg: 'rgba(168,85,247,0.12)', color: '#d8b4fe' },
  };

  const ownRules = state.detectionRules;
  const actorTechCount = state.selectedActors.length;
  const busy = state.loading || uploading;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>🔍</div>
          <div>
            <h1>Règles de Détection</h1>
            <p style={{ marginTop: 4 }}>
              Importez le fichier de règles implémentées par votre SOC, ajoutez des techniques manuellement, ou ciblez des groupes d'attaquants
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)',
          padding: 'var(--space-4)', background: 'var(--gradient-card)',
          border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
        }}>
          {[
            { value: ownRules.length, label: 'Règles de détection', color: '#60a5fa', icon: '📋' },
            { value: actorTechCount, label: 'Groupes ATT menaces', color: '#fb923c', icon: '🎯' },
            { value: state.enabledControls.length, label: 'Contrôles de sécurité', color: '#a855f7', icon: '🛡️' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: 'var(--space-3) var(--space-4)',
              background: activeTab === tab.key ? 'var(--gradient-purple-subtle)' : 'var(--gradient-card)',
              border: `1px solid ${activeTab === tab.key ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              textAlign: 'left', transition: 'all var(--transition-fast)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-glow)' : 'none',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: activeTab === tab.key ? 'var(--purple-300)' : 'var(--text-primary)', marginBottom: 2 }}>
              {tab.label}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        {/* ── IMPORT TAB ── */}
        {activeTab === 'import' && (
          <div className="animate-fade-in">
            <div
              className={`dropzone ${dragActive || uploading ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <div className="dropzone-icon">{uploading ? '⏳' : dragActive ? '📥' : '📄'}</div>
              <div className="dropzone-text">
                {uploading
                  ? <span className="dropzone-highlight">Upload et analyse du fichier…</span>
                  : <>
                    <span className="dropzone-highlight">Glissez-déposez</span> le fichier de règles de votre SOC ici<br />
                    ou <span className="dropzone-highlight">cliquez pour parcourir</span>
                  </>}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
                .yml / .yaml (Sigma rules) · .json (ATT&CK Navigator Layer) — fichier unique ou multiple
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".yml,.yaml,.json" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(Array.from(e.target.files))} />
            {parseError && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                ⚠️ {parseError}
              </div>
            )}
            {parseSuccess && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-dim)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
                {parseSuccess}
              </div>
            )}

            {/* Sigma example */}
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Exemple de règle Sigma valide
              </div>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6, overflow: 'auto' }}>{`title: Detect PowerShell Execution
id: abc12345-...
status: stable
tags:
    - attack.execution
    - attack.t1059.001
detection:
    selection:
        Image|endswith: '\\\\powershell.exe'
    condition: selection
level: high`}</pre>
            </div>
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {activeTab === 'manual' && (
          <div className="animate-fade-in">
            <div className="card">
              <div className="form-group" style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Rechercher une technique ATT&CK</label>
                <input
                  className="form-input"
                  placeholder="Ex: T1059 ou PowerShell..."
                  value={search}
                  onChange={(e) => handleManualSearch(e.target.value)}
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 'var(--z-dropdown)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', marginTop: 4,
                  }}>
                    {suggestions.map(t => (
                      <div key={t.id} style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => handleSelectTechnique(t)}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--purple-400)', fontWeight: 700, minWidth: 70 }}>{t.id}</span>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Nom de la règle / description</label>
                <input className="form-input" placeholder="Ex: Sigma — Détection PowerShell Obfuscation" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddManual} disabled={!manualTechId || !manualTitle || busy}>
                {busy ? '⏳ Envoi…' : '+ Ajouter cette règle'}
              </button>
            </div>
          </div>
        )}

        {/* ── THREAT ACTORS TAB ── */}
        {activeTab === 'actors' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-orange)', marginBottom: 4, fontSize: 'var(--text-sm)' }}>
                🎯 Mode Threat Intelligence
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Sélectionnez les groupes d'attaquants qui vous ciblent. Leurs TTPs seront utilisés pour mesurer
                votre couverture spécifique contre ces adversaires. Les techniques non couvertes deviendront
                des gaps prioritaires dans votre analyse.
              </p>
            </div>
            <ThreatActorSelector
              selectedActors={state.selectedActors}
              onToggle={toggleActor}
            />
          </div>
        )}
      </div>

      {/* Rules list */}
      {ownRules.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-16)' }}>
          <div className="card-header">
            <div className="card-title">
              Catalogue des règles SOC (serveur)
              <span className="badge badge-purple" style={{ marginLeft: 'var(--space-3)' }}>{ownRules.length}</span>
            </div>
          </div>
          <div className="rules-list">
            {ownRules.map(rule => (
              <div key={rule.id} className="rule-item">
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: levelColors[rule.level] || 'var(--text-tertiary)' }} />
                <div className="rule-name">{rule.title}</div>
                <div className="rule-tags">
                  {rule.techniques.slice(0, 3).map(tid => (
                    <span key={tid} className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{tid}</span>
                  ))}
                  {rule.techniques.length > 3 && <span className="badge badge-purple">+{rule.techniques.length - 3}</span>}
                </div>
                <span className="badge" style={{ background: (sourceColors[rule.source] || sourceColors.manual).bg, color: (sourceColors[rule.source] || sourceColors.manual).color }}>
                  {SOURCE_LABELS[rule.source] || rule.source}
                </span>
                <button className="rule-remove" onClick={() => handleRemoveRule(rule.id)} title="Supprimer">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0,
        padding: 'var(--space-4) var(--space-8)',
        background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 'var(--z-sticky)',
      }}>
        <button className="btn btn-secondary" onClick={handleBack} disabled={busy}>← Retour</button>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          {ownRules.length} règle{ownRules.length !== 1 ? 's' : ''} · {actorTechCount} groupe{actorTechCount !== 1 ? 's' : ''} menaces · {state.enabledControls.length} contrôles
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={busy}>
          {busy ? '⏳ Analyse en cours…' : "🔍 Lancer l'analyse →"}
        </button>
      </div>
    </div>
  );
}