import { useState, useMemo } from 'react';
import { TACTICS } from '../../data/attackData';

export default function SocTopologyGraph({ securitySolutions = [], detectionMethods = [], detectionRules = [] }) {
  const [selectedNode, setSelectedNode] = useState(null); // { type: 'solution' | 'method' | 'rule' | 'tactic', id: string }
  const [hoveredNode, setHoveredNode] = useState(null);

  const activeFocus = hoveredNode || selectedNode;

  // Active items
  const activeSolutions = useMemo(() => securitySolutions.filter(s => s.enabled !== false), [securitySolutions]);
  const activeMethods = useMemo(() => detectionMethods.filter(m => m.enabled !== false), [detectionMethods]);
  const activeRules = useMemo(() => detectionRules.slice(0, 8), [detectionRules]); // Show top 8 rules in graph for neatness

  // Calculate active highlighted links
  const highlighted = useMemo(() => {
    if (!activeFocus) return { solutions: new Set(), methods: new Set(), rules: new Set(), tactics: new Set() };

    const solSet = new Set();
    const methSet = new Set();
    const ruleSet = new Set();
    const tacSet = new Set();

    if (activeFocus.type === 'solution') {
      solSet.add(activeFocus.id);
      activeMethods.forEach(m => {
        if (m.solutionId === activeFocus.id) {
          methSet.add(m.id);
          m.tactics?.forEach(t => tacSet.add(t));
        }
      });
      activeRules.forEach(r => {
        ruleSet.add(r.id);
      });
    } else if (activeFocus.type === 'method') {
      methSet.add(activeFocus.id);
      const m = activeMethods.find(item => item.id === activeFocus.id);
      if (m) {
        if (m.solutionId) solSet.add(m.solutionId);
        m.tactics?.forEach(t => tacSet.add(t));
      }
    } else if (activeFocus.type === 'rule') {
      ruleSet.add(activeFocus.id);
      const r = activeRules.find(item => item.id === activeFocus.id);
      if (r) {
        // Match techniques to tactics
        r.techniques?.forEach(tid => {
          TACTICS.forEach(tac => {
            if (tac.techniques?.some(t => t.id === tid || t.id.startsWith(tid) || tid.startsWith(t.id))) {
              tacSet.add(tac.id);
            }
          });
        });
      }
    } else if (activeFocus.type === 'tactic') {
      tacSet.add(activeFocus.id);
      activeMethods.forEach(m => {
        if (m.tactics?.includes(activeFocus.id)) {
          methSet.add(m.id);
          if (m.solutionId) solSet.add(m.solutionId);
        }
      });
      activeRules.forEach(r => {
        ruleSet.add(r.id);
      });
    }

    return { solutions: solSet, methods: methSet, rules: ruleSet, tactics: tacSet };
  }, [activeFocus, activeMethods, activeRules]);

  return (
    <div style={{
      background: 'rgba(13, 18, 31, 0.75)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-6)',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(16px)',
    }}>
      {/* Topology Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', background: '#22d3ee',
              boxShadow: '0 0 10px #22d3ee', display: 'inline-block',
            }} />
            <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
              SOC Defense Architecture & Detection Flow
            </h3>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Interactive topology: Security Solutions ➔ Detection Methods ➔ Detection Rules ➔ ATT&CK Tactics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeFocus && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSelectedNode(null); setHoveredNode(null); }}
              style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
            >
              Reset Focus ✕
            </button>
          )}
          <span className="telemetry-pill" style={{ fontSize: 10 }}>
            Hover / Click any node to isolate flow
          </span>
        </div>
      </div>

      {/* 4-Column Interactive Flow Diagram */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-5)',
        position: 'relative',
        minWidth: 860,
      }}>

        {/* ── COLUMN 1: SECURITY SOLUTIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#c084fc', textTransform: 'uppercase',
            letterSpacing: '0.08em', paddingBottom: 6, borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>1. Security Solutions</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{activeSolutions.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {activeSolutions.map(sol => {
              const isHigh = highlighted.solutions.has(sol.id);
              const isDim = activeFocus && !isHigh;
              return (
                <div
                  key={sol.id}
                  onMouseEnter={() => setHoveredNode({ type: 'solution', id: sol.id })}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(selectedNode?.id === sol.id ? null : { type: 'solution', id: sol.id })}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: isHigh
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.15))'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isHigh ? '#a78bfa' : 'var(--border-subtle)'}`,
                    boxShadow: isHigh ? '0 0 16px rgba(139, 92, 246, 0.3)' : 'none',
                    opacity: isDim ? 0.35 : 1,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    transform: isHigh ? 'scale(1.02)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }} className="truncate">
                      {sol.name}
                    </span>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: sol.status === 'enforcing' ? '#10b981' : '#f59e0b',
                      boxShadow: sol.status === 'enforcing' ? '0 0 6px #10b981' : 'none',
                    }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    <span>{sol.category}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', color: '#a78bfa' }}>{sol.vendor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 2: DETECTION METHODS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#22d3ee', textTransform: 'uppercase',
            letterSpacing: '0.08em', paddingBottom: 6, borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>2. Detection Methods</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{activeMethods.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {activeMethods.map(method => {
              const isHigh = highlighted.methods.has(method.id);
              const isDim = activeFocus && !isHigh;
              return (
                <div
                  key={method.id}
                  onMouseEnter={() => setHoveredNode({ type: 'method', id: method.id })}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(selectedNode?.id === method.id ? null : { type: 'method', id: method.id })}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: isHigh
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.15))'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isHigh ? '#22d3ee' : 'var(--border-subtle)'}`,
                    boxShadow: isHigh ? '0 0 16px rgba(6, 182, 212, 0.3)' : 'none',
                    opacity: isDim ? 0.35 : 1,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    transform: isHigh ? 'scale(1.02)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }} className="truncate">
                    {method.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', fontWeight: 600,
                    }}>
                      {method.type}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                      Conf: <strong style={{ color: '#10b981' }}>{method.confidence}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 3: INGESTED DETECTION RULES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase',
            letterSpacing: '0.08em', paddingBottom: 6, borderBottom: '1px solid rgba(251, 146, 60, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>3. Detection Rules</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{detectionRules.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {activeRules.length > 0 ? (
              activeRules.map(rule => {
                const isHigh = highlighted.rules.has(rule.id);
                const isDim = activeFocus && !isHigh;
                return (
                  <div
                    key={rule.id}
                    onMouseEnter={() => setHoveredNode({ type: 'rule', id: rule.id })}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(selectedNode?.id === rule.id ? null : { type: 'rule', id: rule.id })}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: isHigh
                        ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.25), rgba(245, 158, 11, 0.15))'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isHigh ? '#fb923c' : 'var(--border-subtle)'}`,
                      boxShadow: isHigh ? '0 0 16px rgba(251, 146, 60, 0.3)' : 'none',
                      opacity: isDim ? 0.35 : 1,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      transform: isHigh ? 'scale(1.02)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }} className="truncate">
                      {rule.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {rule.techniques?.slice(0, 2).map(tid => (
                        <span key={tid} style={{
                          fontFamily: 'JetBrains Mono', fontSize: 9, padding: '1px 5px',
                          borderRadius: 3, background: 'rgba(255, 255, 255, 0.06)', color: '#fb923c',
                        }}>
                          {tid}
                        </span>
                      ))}
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {rule.level}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-subtle)',
                textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11,
              }}>
                No Sigma rules uploaded yet.
              </div>
            )}
          </div>
        </div>

        {/* ── COLUMN 4: MITRE ATT&CK TACTICS COVERED ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase',
            letterSpacing: '0.08em', paddingBottom: 6, borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>4. ATT&CK Tactics</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>14 Matrix</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {TACTICS.slice(0, 8).map(tac => {
              const isHigh = highlighted.tactics.has(tac.id);
              const isDim = activeFocus && !isHigh;
              return (
                <div
                  key={tac.id}
                  onMouseEnter={() => setHoveredNode({ type: 'tactic', id: tac.id })}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(selectedNode?.id === tac.id ? null : { type: 'tactic', id: tac.id })}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: isHigh
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.15))'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isHigh ? '#10b981' : 'var(--border-subtle)'}`,
                    boxShadow: isHigh ? '0 0 16px rgba(16, 185, 129, 0.3)' : 'none',
                    opacity: isDim ? 0.35 : 1,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    transform: isHigh ? 'scale(1.02)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }} className="truncate">
                      {tac.name}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#10b981' }}>
                      {tac.techniques?.length || 0} TTPs
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    ID: {tac.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Legend strip */}
      <div style={{
        marginTop: 'var(--space-6)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        fontSize: 11,
        color: 'var(--text-tertiary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Solutions
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Detection Methods
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c' }} /> Detection Rules
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> ATT&CK Tactics
          </span>
        </div>

        <div>
          {activeFocus ? (
            <span style={{ color: '#22d3ee', fontWeight: 600 }}>
              Active Filter: {activeFocus.type.toUpperCase()} ({activeFocus.id})
            </span>
          ) : (
            <span>All defense pathways connected</span>
          )}
        </div>
      </div>
    </div>
  );
}
