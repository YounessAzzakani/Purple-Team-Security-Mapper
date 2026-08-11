import { useState } from 'react';
import { THREAT_ACTORS } from '../data/threatActors';

export default function ThreatActorSelector({ selectedActors, onToggle }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Sélectionnez les groupes d'attaquants les plus susceptibles de vous cibler.
          L'analyse mesurera votre posture défensive contre leurs TTPs connus.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {THREAT_ACTORS.map((actor, i) => {
          const isSelected = selectedActors.includes(actor.id);
          return (
            <div
              key={actor.id}
              className={`animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              style={{
                background: isSelected
                  ? 'linear-gradient(145deg, rgba(139,92,246,0.12), rgba(109,40,217,0.06))'
                  : 'var(--gradient-card)',
                border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
              }}
              onClick={() => onToggle(actor.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: isSelected ? 'var(--purple-300)' : 'var(--text-primary)' }}>
                      {actor.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="badge" style={{
                      background: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)',
                      fontSize: 10, padding: '2px 8px',
                    }}>
                      {actor.origin}
                    </span>
                    {actor.aliases.slice(0, 1).map(a => (
                      <span key={a} className="badge badge-purple" style={{ fontSize: 10 }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginLeft: 'var(--space-3)',
                  border: `2px solid ${isSelected ? 'var(--purple-500)' : 'var(--border-default)'}`,
                  background: isSelected ? 'var(--gradient-purple)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: 'white',
                  transition: 'all var(--transition-fast)',
                }}>
                  {isSelected ? '✓' : ''}
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                {actor.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                  {actor.sector.slice(0, 2).map(s => (
                    <span key={s} style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(96,165,250,0.1)', color: 'var(--color-info)', fontWeight: 600,
                    }}>
                      {s}
                    </span>
                  ))}
                  {actor.sector.length > 2 && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{actor.sector.length - 2}</span>
                  )}
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {actor.techniques.length} TTPs
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
