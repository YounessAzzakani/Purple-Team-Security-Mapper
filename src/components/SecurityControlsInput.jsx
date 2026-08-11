import { useState } from 'react';
import { CONTROL_CATEGORIES } from '../data/controlMappings';
import { useApp } from '../context/AppContext';

export default function SecurityControlsInput() {
  const { state, toggleControl, toggleCategoryControls, setMaturity, setStep } = useApp();

  const handleNext = () => setStep(1);

  const enabledCount = state.enabledControls.length;
  const totalControls = CONTROL_CATEGORIES.flatMap(c => c.controls).length;
  const coveragePercent = Math.round((enabledCount / totalControls) * 100);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="logo-icon" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>🛡️</div>
          <div>
            <h1>Contrôles de Sécurité</h1>
            <p style={{ marginTop: 4, fontSize: 'var(--text-base)' }}>
              Déclarez les contrôles de sécurité déployés dans votre infrastructure SOC
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          padding: 'var(--space-4) var(--space-6)',
          background: 'var(--gradient-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--purple-300)', lineHeight: 1 }}>
              {enabledCount}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>
              activés
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
                {coveragePercent}% des contrôles configurés
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {totalControls} contrôles disponibles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { color: '#22c55e', label: 'Préventif', desc: 'Bloque l\'attaque' },
          { color: '#60a5fa', label: 'Détectif', desc: 'Détecte l\'attaque' },
          { color: '#a855f7', label: 'Correctif', desc: 'Récupération' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>— {item.desc}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
            Maturité: <strong style={{ color: 'var(--text-secondary)' }}>B</strong>asique · <strong style={{ color: 'var(--text-secondary)' }}>I</strong>ntermédiaire · <strong style={{ color: 'var(--text-secondary)' }}>A</strong>vancé
          </span>
        </div>
      </div>

      {/* Control categories */}
      <div className="controls-grid" style={{ marginBottom: 'var(--space-16)' }}>
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

      {/* Sticky navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0,
        padding: 'var(--space-4) var(--space-8)',
        background: 'rgba(7,7,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 'var(--z-sticky)',
      }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          {enabledCount === 0
            ? '⚠️ Aucun contrôle — l\'analyse affichera 100% de gaps'
            : `✅ ${enabledCount} contrôle${enabledCount > 1 ? 's' : ''} configuré${enabledCount > 1 ? 's' : ''} · ${totalControls - enabledCount} restants`}
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleNext}>
          Suivant : Règles de détection →
        </button>
      </div>
    </div>
  );
}

function CategoryCard({ category, enabledControls, controlMaturity, onToggle, onCategoryToggle, onMaturity, delay }) {
  const [expanded, setExpanded] = useState(true);
  const categoryControlIds = category.controls.map(c => c.id);
  const enabledInCat = category.controls.filter(c => enabledControls.includes(c.id)).length;
  const allEnabled = enabledInCat === category.controls.length;

  const typeColors = { preventive: '#22c55e', detective: '#60a5fa', corrective: '#a855f7' };
  const typeLabels = { preventive: 'Préventif', detective: 'Détectif', corrective: 'Correctif' };
  const maturityLabels = { basic: 'Basique', intermediate: 'Intermédiaire', advanced: 'Avancé' };

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
          {/* Select All toggle */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 10, padding: '3px 8px', color: allEnabled ? 'var(--color-danger)' : 'var(--purple-400)' }}
            onClick={(e) => { e.stopPropagation(); onCategoryToggle(categoryControlIds, !allEnabled); }}
            title={allEnabled ? 'Désactiver tous' : 'Activer tous'}
          >
            {allEnabled ? '✗ Tout' : '✓ Tout'}
          </button>
          <span
            style={{
              color: 'var(--text-tertiary)', fontSize: '0.7rem', cursor: 'pointer',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              display: 'inline-block', padding: 4,
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
                    <div className="maturity-select" title="Niveau de maturité du contrôle">
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
                  <label className="toggle" onClick={(e) => e.stopPropagation()} title={isEnabled ? 'Désactiver' : 'Activer ce contrôle'}>
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
