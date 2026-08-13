// ============================================================
// ActorGraph — interactive force-directed graph (pure SVG + d3-force)
// Threat actors (violet) → techniques (colored by coverage)
// ============================================================

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { THREAT_ACTORS } from '../../data/threatActors';
import { buildActorGraphData, computeGraphStats } from '../../services/graphData';

const NODE_R = { actor: 13, technique: 6 };

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function buildPalette() {
  return {
    actor:      cssVar('--purple-500', '#8b5cf6'),
    actorRing:  cssVar('--violet-border', '#6f63b9'),
    text:       cssVar('--text-primary', '#e5e7eb'),
    muted:      cssVar('--text-tertiary', '#94a3b8'),
    link:       cssVar('--border-subtle', 'rgba(148,163,184,0.25)'),
    unknown:    cssVar('--text-tertiary', '#94a3b8'),
    none:       cssVar('--color-danger', '#f87171'),
    low:        cssVar('--color-orange', '#fb923c'),
    medium:     cssVar('--color-warning', '#facc15'),
    high:       cssVar('--color-success', '#4ade80'),
    tooltipBg:  cssVar('--bg-secondary', '#1b1b32'),
    tooltipBr:  cssVar('--border-hover', '#3a3a66'),
  };
}

function nodeFill(node, palette) {
  if (node.type === 'actor') return palette.actor;
  if (node.score == null) return palette.unknown;
  if (node.score === 0) return palette.none;
  if (node.score <= 30) return palette.low;
  if (node.score <= 60) return palette.medium;
  return palette.high;
}

export default function ActorGraph({ techniqueScores, selectedActors, onSelectTechnique, onToggleActor, theme }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState('all');
  const [, setTick] = useState(0); // re-render signal while the simulation runs
  const [hovered, setHovered] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const simRef = useRef(null);
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  const HEIGHT = 560;

  // ── Container size ──
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ width: el.clientWidth, height: HEIGHT });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const palette = useMemo(() => buildPalette(), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dataset ──
  const { nodes, links } = useMemo(
    () => buildActorGraphData({ techniqueScores, actors: THREAT_ACTORS, mode, selectedActorIds: selectedActors }),
    [techniqueScores, mode, selectedActors],
  );

  const stats = useMemo(() => computeGraphStats(nodes, links), [nodes, links]);

  // ── Simulation ──
  const runSimulation = useCallback(() => {
    if (size.width === 0) return;
    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id).distance(42).strength(0.35))
      .force('charge', forceManyBody().strength(-140))
      .force('center', forceCenter(size.width / 2, HEIGHT / 2))
      .force('collide', forceCollide().radius(d => (d.type === 'actor' ? 24 : 12)))
      .alpha(1)
      .alphaDecay(0.035)
      .on('tick', () => setTick(t => t + 1))
      .on('end', () => fitView());
    simRef.current = sim;
    return sim;
  }, [nodes, links, size.width]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sim = runSimulation();
    return () => { sim?.stop(); simRef.current = null; };
  }, [runSimulation]);

  // Fit the graph into the viewport once the layout settles
  const fitView = useCallback(() => {
    const s = simRef.current;
    if (!s) return;
    const pts = nodes;
    if (pts.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(n => {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    const pad = 40;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    if (w === 0 || h === 0) return;
    const k = Math.min(size.width / w, HEIGHT / h, 1.4);
    setTransform({
      k,
      x: size.width / 2 - ((minX + maxX) / 2) * k,
      y: HEIGHT / 2 - ((minY + maxY) / 2) * k,
    });
  }, [nodes, size.width]);

  // ── Zoom & pan ──
  // Wheel listener is attached natively (non-passive) so preventDefault works
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setTransform(prev => {
        const k = Math.min(4, Math.max(0.2, prev.k * Math.exp(-e.deltaY * 0.0012)));
        const ratio = k / prev.k;
        return { k, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.fg-node')) return; // node interactions handled on the node
    dragRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [transform]);

  const onPointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    setTransform(prev => ({ ...prev, x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) }));
  }, []);

  const onPointerUp = useCallback((e) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  }, []);

  // ── Interactions ──
  const handleNodeClick = useCallback((e, node) => {
    e.stopPropagation();
    if (node.type === 'actor') {
      onToggleActor?.(node.actor.id);
      return;
    }
    const ts = techniqueScores?.[node.techniqueId];
    const technique = ts || { id: node.techniqueId, name: node.name, tactic: node.tactic, platforms: [] };
    onSelectTechnique?.(technique, ts || null);
  }, [techniqueScores, onToggleActor, onSelectTechnique]);

  const handleHover = useCallback((e, node) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setHovered(node);
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  }, []);

  const reheat = useCallback(() => {
    const sim = simRef.current;
    if (sim) {
      sim.alpha(1).restart();
    } else {
      runSimulation();
    }
  }, [runSimulation]);

  // Hover tooltip content
  const tip = hovered && (
    <div style={{
      position: 'absolute', top: cursor.y + 14, left: cursor.x + 14, zIndex: 'var(--z-toast)',
      pointerEvents: 'none', maxWidth: 280,
      background: palette.tooltipBg, border: `1px solid ${palette.tooltipBr}`,
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-lg)', fontSize: 'var(--text-xs)',
    }}>
      {hovered.type === 'actor' ? (
        <>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{hovered.actor.name}</div>
          <div style={{ color: palette.muted, marginBottom: 4 }}>
            {hovered.actor.origin} · {hovered.actor.techniques.length} TTPs
          </div>
          <div style={{ lineHeight: 1.5 }}>Click to {hovered.selected ? 'remove' : 'select'} this group for the analysis</div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', marginRight: 6 }}>{hovered.techniqueId}</span>
            {hovered.name}
          </div>
          <div style={{ lineHeight: 1.5 }}>
            Coverage: <strong>{hovered.score == null ? 'not evaluated' : `${hovered.score}/100`}</strong>
            {hovered.tactic && <span style={{ color: palette.muted }}> · {hovered.tactic}</span>}
          </div>
          <div style={{ color: palette.muted, marginTop: 4 }}>Click for details</div>
        </>
      )}
    </div>
  );

  return (
    <div className="card animate-scale-in" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)', flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="filter-group">
          {[
            { key: 'all', label: '🌐 All groups → TTPs' },
            { key: 'gaps', label: '🚨 Gaps only (selected)' },
          ].map(f => (
            <button key={f.key} className={`filter-btn ${mode === f.key ? 'active' : ''}`} onClick={() => setMode(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: palette.muted }}>
            {stats.actors} groups · {stats.techniques} techniques · {stats.links} links
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: palette.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: palette.actor, display: 'inline-block' }} /> Actor
            </span>
            {[['none', 'Gap'], ['low', 'Weak'], ['medium', 'Partial'], ['high', 'Covered']].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: palette[key], display: 'inline-block' }} /> {label}
              </span>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={reheat} title="Re-run the layout">
            ↻ Re-layout
          </button>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} style={{ height: HEIGHT, position: 'relative', background: 'var(--gradient-card)' }}>
        {size.width > 0 && nodes.length > 0 && (
          <svg
            ref={svgRef}
            width="100%"
            height={HEIGHT}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ display: 'block', cursor: 'grab', touchAction: 'none' }}
          >
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {/* Links */}
              {links.map((l, i) => (
                <line
                  key={i}
                  x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                  stroke={palette.link} strokeWidth={0.6 / transform.k}
                />
              ))}
              {/* Nodes */}
              {nodes.map(n => {
                const r = NODE_R[n.type] || 6;
                return (
                  <g
                    key={n.id}
                    className="fg-node"
                    transform={`translate(${n.x},${n.y})`}
                    onClick={(e) => handleNodeClick(e, n)}
                    onMouseEnter={(e) => handleHover(e, n)}
                    onMouseLeave={() => setCursor(c => ({ ...c, visible: false }))}
                    style={{ cursor: 'pointer' }}
                  >
                    {n.type === 'actor' && n.selected && (
                      <circle r={r + 3} fill="none" stroke={palette.actorRing} strokeWidth={1.5 / transform.k} />
                    )}
                    <circle
                      r={r}
                      fill={nodeFill(n, palette)}
                      stroke={n.type === 'technique' ? palette.link : 'none'}
                      strokeWidth={n.type === 'technique' ? 1 / transform.k : 0}
                    />
                    {n.type === 'actor' && (
                      <text
                        y={r + 12 / transform.k}
                        textAnchor="middle"
                        fill={palette.text}
                        fontSize={10.5 / transform.k}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {n.actor.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        {nodes.length > 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 12,
            fontSize: 10, color: palette.muted,
            pointerEvents: 'none',
          }}>
            Scroll to zoom · drag to pan
          </div>
        )}
        {nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.muted, fontSize: 'var(--text-sm)' }}>
            {mode === 'gaps' ? 'No uncovered gaps for the selected groups 🎉' : 'Nothing to display'}
          </div>
        )}
        {cursor.visible && hovered && tip}
      </div>
    </div>
  );
}