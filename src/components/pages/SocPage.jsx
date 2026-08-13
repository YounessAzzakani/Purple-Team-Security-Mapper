import { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { CONTROL_CATEGORIES } from '../../data/controlMappings';
import { TECHNIQUES } from '../../data/attackData';

/* ============================================================
 * DEFENSES PAGE — one scrollable view:
 *   1. Security Solutions (controls inventory with maturity)
 *   2. Detection Rules     (Sigma import + manual add + catalog)
 * The single "Run analysis" action lives in the page header.
 * ============================================================ */

const SOURCE_LABELS = { sigma: 'Sigma', navigator: 'Navigator', manual: 'Manual' };

export default function SocPage({ onNavigate }) {
  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>🛡️</div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>Defenses</h1>
          <p style={{ marginTop: 4 }}>
            Your security solutions, implemented rules and detections
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Run the analysis from the ⚡ button in the sidebar
          </span>
        </div>
      </div>

      <SolutionsSection />
      <RulesSection onNavigate={onNavigate} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * SECTION 1 — SECURITY SOLUTIONS
 * ════════════════════════════════════════════════════════════ */

function SolutionsSection() {
  const { state, toggleControl, toggleCategoryControls, setMaturity } = useApp();

  const enabledCount = state.enabledControls.length;
  const totalControls = CONTROL_CATEGORIES.flatMap(c => c.controls).length;
  const coveragePercent = Math.round((enabledCount / totalControls) * 100);

  return (
    <section style={{ marginBottom: 'var(--space-10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>🛡️ Security Solutions</h2>
        <span className="badge badge-purple">{enabledCount}/{totalControls} enabled</span>
      </div>

      {/* Progress bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--gradient-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-5)',
      }}>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--purple-300)', lineHeight: 1 }}>
            {enabledCount}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>
            enabled
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${coveragePercent}%`,
              background: 'var(--gradient-purple)', borderRadius: 'var(--radius-full)',
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {coveragePercent}% of controls configured
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {totalControls} controls available
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--color-success)', label: 'Preventive', desc: 'Blocks the attack' },
          { color: 'var(--color-info)', label: 'Detective', desc: 'Detects the attack' },
          { color: 'var(--purple-500)', label: 'Corrective', desc: 'Recovery' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>— {item.desc}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
            Maturity: <strong style={{ color: 'var(--text-secondary)' }}>B</strong>asic · <strong style={{ color: 'var(--text-secondary)' }}>I</strong>ntermediate · <strong style={{ color: 'var(--text-secondary)' }}>A</strong>dvanced
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="controls-grid">
        {CONTROL_CATEGORIES.map((category, i) => (
          <CategoryCard
            key={category.id}
            category={category}
            enabledControls={state.enabledControls}
            controlMaturity={state.controlMaturity}
            onToggle={toggleControl}
            onCategoryToggle={toggleCategoryControls}
            onMaturity={setMaturity}
            delay={i}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category, enabledControls, controlMaturity, onToggle, onCategoryToggle, onMaturity, delay }) {
  const [expanded, setExpanded] = useState(true);
  const categoryControlIds = category.controls.map(c => c.id);
  const enabledInCat = category.controls.filter(c => enabledControls.includes(c.id)).length;
  const allEnabled = enabledInCat === category.controls.length;

  const typeColors = { preventive: 'var(--color-success)', detective: 'var(--color-info)', corrective: 'var(--purple-500)' };
  const typeLabels = { preventive: 'Preventive', detective: 'Detective', corrective: 'Corrective' };
  const maturityLabels = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' };

  return (
    <div
      className={`control-card animate-slide-up stagger-${Math.min(delay + 1, 8)}`}
      style={{ borderLeft: `3px solid ${category.color}` }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: expanded ? 'var(--space-4)' : 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, cursor: 'pointer' }}
          onClick={() => setExpanded(e => !e)}
        >
          <div className="control-card-icon" style={{ background: `${category.color}20` }}>
            {category.icon}
          </div>
          <div>
            <div className="control-card-title" style={{ fontSize: 'var(--text-sm)' }}>{category.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {category.description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0, marginLeft: 'var(--space-3)' }}>
          {enabledInCat > 0 && (
            <span className="badge badge-purple">{enabledInCat}/{category.controls.length}</span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 10, padding: '3px 8px', color: allEnabled ? 'var(--color-danger)' : 'var(--purple-400)' }}
            onClick={(e) => { e.stopPropagation(); onCategoryToggle(categoryControlIds, !allEnabled); }}
            title={allEnabled ? 'Disable all' : 'Enable all'}
          >
            {allEnabled ? '✗ All' : '✓ All'}
          </button>
          <span
            style={{
              color: 'var(--text-tertiary)', fontSize: '0.7rem', cursor: 'pointer',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s', display: 'inline-block', padding: 4,
            }}
            onClick={() => setExpanded(e => !e)}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Control items */}
      {expanded && (
        <div className="control-items">
          {category.controls.map(control => {
            const isEnabled = enabledControls.includes(control.id);
            const maturity = controlMaturity[control.id] || 'basic';
            return (
              <div
                key={control.id}
                className="control-item"
                style={{ borderColor: isEnabled ? `${category.color}40` : undefined, background: isEnabled ? `${category.color}06` : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    background: typeColors[control.type] || 'var(--text-tertiary)',
                  }} title={typeLabels[control.type]} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="control-item-label" style={{ fontWeight: isEnabled ? 600 : 500 }}>{control.name}</div>
                    {isEnabled && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {typeLabels[control.type]} · {control.coveredTechniques.length} techniques · {maturityLabels[maturity]}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  {isEnabled && (
                    <div className="maturity-select" title="Control maturity level">
                      {[['basic', 'B'], ['intermediate', 'I'], ['advanced', 'A']].map(([level, lbl]) => (
                        <button
                          key={level}
                          className={`maturity-option ${maturity === level ? 'active' : ''}`}
                          title={maturityLabels[level]}
                          onClick={(e) => { e.stopPropagation(); onMaturity(control.id, level); }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="toggle" onClick={(e) => e.stopPropagation()} title={isEnabled ? 'Disable' : 'Enable this control'}>
                    <input type="checkbox" checked={isEnabled} onChange={() => onToggle(control.id)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * SECTION 2 — DETECTION RULES
 * ════════════════════════════════════════════════════════════ */

function RulesSection({ onNavigate }) {
  const { state, uploadRuleFile, addManualRule, removeRule } = useApp();
  const [showManual, setShowManual] = useState(false);
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
        setParseSuccess(`✅ ${total} rule${total > 1 ? 's' : ''} imported to the server`);
      } else {
        setParseError('No rule with ATT&CK tags found. Check that your rules contain attack.tXXXX tags.');
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
    // Dedupe by id — MITRE lists some techniques under several tactics (e.g. T1078).
    const seen = new Set();
    setSuggestions(
      TECHNIQUES
        .filter(t => {
          if (seen.has(t.id)) return false;
          const hit = t.id.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower);
          if (hit) seen.add(t.id);
          return hit;
        })
        .slice(0, 8)
    );
  };

  const handleSelectTechnique = (technique) => {
    setManualTechId(technique.id);
    setSearch(`${technique.id} — ${technique.name}`);
    setSuggestions([]);
    setManualTitle(prev => prev || `Detection: ${technique.name}`);
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
      setParseSuccess('✅ Manual rule added to the SOC catalog');
      setManualTechId(''); setManualTitle(''); setSearch(''); setSuggestions([]);
      setShowManual(false);
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

  const levelColors = { critical: 'var(--color-danger)', high: 'var(--color-orange)', medium: 'var(--color-warning)', low: 'var(--color-info)' };
  const sourceColors = {
    sigma: { bg: 'var(--violet-soft)', color: 'var(--purple-300)' },
    navigator: { bg: 'var(--color-info-dim)', color: 'var(--color-info)' },
    manual: { bg: 'var(--violet-soft)', color: 'var(--purple-300)' },
  };

  const ownRules = state.detectionRules;
  const busy = state.loading || uploading;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>📜 Detection Rules</h2>
        {ownRules.length > 0 && <span className="badge badge-purple">{ownRules.length}</span>}
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)',
        padding: 'var(--space-4)', background: 'var(--gradient-card)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-5)',
      }}>
        {[
          { value: ownRules.length, label: 'Detection rules', color: 'var(--color-info)', icon: '📋' },
          { value: state.selectedActors.length, label: 'Threat groups selected', color: 'var(--color-orange)', icon: '🎯' },
          { value: state.enabledControls.length, label: 'Security controls', color: 'var(--purple-500)', icon: '🛡️' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-xl)', marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Import zone */}
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
            ? <span className="dropzone-highlight">Uploading and parsing file…</span>
            : <>
              <span className="dropzone-highlight">Drag & drop</span> your SOC's rule file here<br />
              or <span className="dropzone-highlight">click to browse</span>
            </>}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
          .yml / .yaml (Sigma rules) · .json (ATT&CK Navigator Layer) — single or multiple files
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".yml,.yaml,.json" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(Array.from(e.target.files))} />
      {parseError && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>
          ⚠️ {parseError}
        </div>
      )}
      {parseSuccess && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-dim)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
          {parseSuccess}
        </div>
      )}

      {/* Manual add toggle */}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 'var(--space-4)' }}
        onClick={() => setShowManual(s => !s)}
      >
        {showManual ? '✕ Hide manual entry' : '✏️ Add a rule manually'}
      </button>

      {showManual && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="form-group" style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Search an ATT&CK technique</label>
            <input
              className="form-input"
              placeholder="e.g. T1059 or PowerShell..."
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
            <label className="form-label">Rule name / description</label>
            <input className="form-input" placeholder="e.g. Sigma — PowerShell Obfuscation Detection" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddManual} disabled={!manualTechId || !manualTitle || busy}>
            {busy ? '⏳ Sending…' : '+ Add this rule'}
          </button>
        </div>
      )}

      {/* Sigma example */}
      <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Example of a valid Sigma rule
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

      {/* Catalog */}
      {ownRules.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <div className="card-title">
              SOC rules catalog (server)
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
                <button className="rule-remove" onClick={() => handleRemoveRule(rule.id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)',
        background: 'var(--gradient-purple-subtle)', border: '1px solid var(--violet-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {ownRules.length} rule{ownRules.length !== 1 ? 's' : ''} · {state.selectedActors.length} threat group{state.selectedActors.length !== 1 ? 's' : ''} · {state.enabledControls.length} controls
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Choose your adversaries on the{' '}
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }} onClick={() => onNavigate('attack')}>⚔️ Attack</button>{' '}
          page, then run the analysis from the ⚡ button in the sidebar.
        </div>
      </div>
    </section>
  );
}