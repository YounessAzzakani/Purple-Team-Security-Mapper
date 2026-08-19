import { useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TECHNIQUES, TACTICS } from '../../data/attackData';
import { runGapAnalysis, getRecommendations } from '../../services/coverageEngine';
import MiniHeatmap from '../common/MiniHeatmap';
import SocTopologyGraph from '../soc/SocTopologyGraph';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

/* ── Inline SVG Icons ── */
function Icon({ name, size = 16, style = {} }) {
  const icons = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
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
    network: (
      <>
        <rect x="2" y="2" width="6" height="6" rx="1" />
        <rect x="16" y="2" width="6" height="6" rx="1" />
        <rect x="9" y="16" width="6" height="6" rx="1" />
        <path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <path d="M12 12v4" />
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
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    crosshair: <><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></>,
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true"
    >
      {icons[name] || icons.shield}
    </svg>
  );
}

const SOLUTION_CATEGORIES = [
  'Endpoint & EDR',
  'SIEM & Analytics',
  'Network & Firewall',
  'Cloud Security',
  'Identity & Access',
  'Application Security',
];

const METHOD_PARADIGMS = [
  'Behavioral / ML',
  'Log Correlation',
  'Network Inspection',
  'Signature',
  'Cloud Audit',
  'Deception',
];

const TEMPLATE_SOLUTIONS = [
  { name: 'SentinelOne Singularity EDR', category: 'Endpoint & EDR', vendor: 'SentinelOne', status: 'enforcing', dataSources: ['Process Activity', 'Memory Behavior'] },
  { name: 'Elastic Security (SIEM)', category: 'SIEM & Analytics', vendor: 'Elastic', status: 'enforcing', dataSources: ['Auditd', 'Winlogbeat', 'Packetbeat'] },
  { name: 'Fortinet FortiGate NGFW', category: 'Network & Firewall', vendor: 'Fortinet', status: 'enforcing', dataSources: ['IPS Signatures', 'Web Filter'] },
  { name: 'Microsoft Defender for Identity', category: 'Identity & Access', vendor: 'Microsoft', status: 'enforcing', dataSources: ['Kerberos Tickets', 'LDAP Queries'] },
  { name: 'Suricata Network IDS/IPS', category: 'Network & Firewall', vendor: 'OISF', status: 'monitoring', dataSources: ['Packet Capture', 'TLS Metadata'] },
];

export default function SocCenterPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('topology'); // 'topology' | 'solutions' | 'methods' | 'rules' | 'coverage'
  const { state } = useApp();

  const { securitySolutions = [], detectionMethods = [], detectionRules = [] } = state;
  const activeSolutions = securitySolutions.filter(s => s.enabled !== false);
  const activeMethods = detectionMethods.filter(m => m.enabled !== false);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ════════════════════════════════════════════════════════════
       * HEADER & TELEMETRY STRIP
       * ════════════════════════════════════════════════════════════ */}
      <div className="glass-panel" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
          }}>
            <Icon name="shield" size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              SOC Defenses & Detection Architecture
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Manage entity security solutions, detection capabilities, and Sigma rule datasets
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div className="telemetry-pill">
            <span className="pulse-dot online" />
            <span>SOLUTIONS: <strong>{activeSolutions.length}</strong></span>
          </div>
          <div className="telemetry-pill">
            <Icon name="crosshair" size={13} style={{ color: '#0891b2' }} />
            <span>METHODS: <strong style={{ color: '#0891b2' }}>{activeMethods.length}</strong></span>
          </div>
          <div className="telemetry-pill">
            <Icon name="fileCode" size={13} style={{ color: '#ea580c' }} />
            <span>RULES: <strong style={{ color: '#ea580c' }}>{detectionRules.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TAB NAVIGATION BAR
       * ════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--space-2)', flexWrap: 'wrap',
      }}>
        {[
          { id: 'topology', label: '🌐 Defense Topology Graph', count: null },
          { id: 'solutions', label: '🛡️ Security Solutions', count: securitySolutions.length },
          { id: 'methods', label: '🛰️ Detection Methods', count: detectionMethods.length },
          { id: 'rules', label: '📜 Detection Rules & Ingest', count: detectionRules.length },
          { id: 'coverage', label: '🗺️ Live ATT&CK Matrix & Gaps', count: null },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.1))' : 'transparent',
                border: `1px solid ${isActive ? 'var(--purple-400)' : 'transparent'}`,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 500,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 0 12px rgba(139, 92, 246, 0.15)' : 'none',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-full)',
                  background: isActive ? '#7c3aed' : 'var(--bg-tertiary)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono', fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════
       * TAB 1: DEFENSE TOPOLOGY GRAPH
       * ════════════════════════════════════════════════════════════ */}
      {activeTab === 'topology' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <SocTopologyGraph
            securitySolutions={securitySolutions}
            detectionMethods={detectionMethods}
            detectionRules={detectionRules}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
       * TAB 2: SECURITY SOLUTIONS MANAGEMENT
       * ════════════════════════════════════════════════════════════ */}
      {activeTab === 'solutions' && (
        <SolutionsManager
          solutions={securitySolutions}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
       * TAB 3: DETECTION METHODS & CAPABILITIES
       * ════════════════════════════════════════════════════════════ */}
      {activeTab === 'methods' && (
        <MethodsManager
          methods={detectionMethods}
          solutions={securitySolutions}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
       * TAB 4: DETECTION RULES & INGESTION
       * ════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <RulesManager
          rules={detectionRules}
          onNavigate={onNavigate}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
       * TAB 5: LIVE ATT&CK MATRIX & GAPS
       * ════════════════════════════════════════════════════════════ */}
      {activeTab === 'coverage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <LiveCoverageSection />
          <CoverageGapsSection onNavigate={onNavigate} />
        </div>
      )}

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * SOLUTIONS MANAGER SUB-COMPONENT
 * ════════════════════════════════════════════════════════════ */
function SolutionsManager({ solutions = [] }) {
  const { addSolution, removeSolution, toggleSolution } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState(SOLUTION_CATEGORIES[0]);
  const [status, setStatus] = useState('enforcing');
  const [dataSources, setDataSources] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSolution({
      name: name.trim(),
      vendor: vendor.trim() || 'Custom / Internal',
      category,
      status,
      dataSources: dataSources.split(',').map(s => s.trim()).filter(Boolean),
      description: `Security tool configured for ${category} domain.`,
    });
    setName(''); setVendor(''); setDataSources(''); setShowAddForm(false);
  };

  const handleTemplateAdd = (tmpl) => {
    addSolution({
      ...tmpl,
      id: `sol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: `Pre-configured ${tmpl.name} deployment.`,
      enabled: true,
    });
  };

  // Category distribution for pie chart
  const categoryStats = useMemo(() => {
    const map = {};
    solutions.forEach(s => {
      map[s.category] = (map[s.category] || 0) + 1;
    });
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#fb923c', '#f43f5e', '#a855f7'];
    return Object.entries(map).map(([cat, count], i) => ({
      name: cat,
      value: count,
      color: colors[i % colors.length],
    }));
  }, [solutions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Top Banner with Quick Actions & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-6)' }}>

        {/* Quick Add Templates */}
        <div className="glass-panel" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
                Enterprise Security Solutions
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Deploy, configure, or import security products protecting your environment
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddForm(f => !f)}
              style={{ fontSize: 12 }}
            >
              <Icon name="plus" size={14} />
              <span>{showAddForm ? 'Cancel' : 'Add Custom Solution'}</span>
            </button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
            ⚡ Quick-Add Common Tools:
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {TEMPLATE_SOLUTIONS.map(tmpl => (
              <button
                key={tmpl.name}
                className="btn btn-secondary btn-sm"
                onClick={() => handleTemplateAdd(tmpl)}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                + {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: 110, height: 110, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                  {categoryStats.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Defense Domain Coverage
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 90, overflowY: 'auto' }}>
              {categoryStats.map(stat => (
                <div key={stat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: stat.color }} />
                    <span style={{ color: 'var(--text-secondary)' }} className="truncate">{stat.name}</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#f8fafc', fontWeight: 700 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Add Custom Solution Modal Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="glass-panel" style={{
          padding: 'var(--space-6)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          background: 'linear-gradient(135deg, rgba(20, 30, 55, 0.9), rgba(13, 18, 31, 0.95))',
        }}>
          <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', marginBottom: 'var(--space-4)' }}>
            🛡️ Add Implemented Security Solution
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Solution Name *
              </label>
              <input
                className="form-input"
                placeholder="e.g. Microsoft Defender for Endpoint"
                value={name} onChange={e => setName(e.target.value)} required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Vendor / Publisher
              </label>
              <input
                className="form-input"
                placeholder="e.g. Microsoft, CrowdStrike, Splunk"
                value={vendor} onChange={e => setVendor(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Solution Category
              </label>
              <select
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}
              >
                {SOLUTION_CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Deployment Status
              </label>
              <select
                className="form-input"
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}
              >
                <option value="enforcing" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>Enforcing (Active Blocking & Quarantine)</option>
                <option value="monitoring" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>Monitoring (Detection & Alerting Only)</option>
                <option value="standby" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>Standby / Passive Log Collection</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Telemetry & Data Sources (comma separated)
            </label>
            <input
              className="form-input"
              placeholder="e.g. Process Execution, DNS Queries, Sysmon Event ID 1, API Audit Logs"
              value={dataSources} onChange={e => setDataSources(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Security Solution
            </button>
          </div>
        </form>
      )}

      {/* Solutions Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {solutions.map(sol => {
          const isEnabled = sol.enabled !== false;
          return (
            <div key={sol.id} className="glass-panel" style={{
              padding: 'var(--space-5)',
              borderLeft: `4px solid ${isEnabled ? '#8b5cf6' : '#64748b'}`,
              opacity: isEnabled ? 1 : 0.6,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#a78bfa' }}>
                      {sol.category}
                    </span>
                    <h4 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800, marginTop: 2 }}>
                      {sol.name}
                    </h4>
                  </div>
                  <label className="toggle" title="Enable or disable solution" style={{ marginTop: 2 }}>
                    <input type="checkbox" checked={isEnabled} onChange={() => toggleSolution(sol.id)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Vendor: <strong style={{ color: 'var(--text-secondary)' }}>{sol.vendor}</strong> · Status:{' '}
                  <span className={`sev-pill ${sol.status === 'enforcing' ? 'good' : 'high'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                    {sol.status}
                  </span>
                </div>

                {sol.dataSources?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                    {sol.dataSources.map(ds => (
                      <span key={ds} style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {ds}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeSolution(sol.id)}
                  style={{ color: 'var(--color-danger)', fontSize: 11, padding: '2px 8px' }}
                  title="Remove solution"
                >
                  <Icon name="trash" size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * DETECTION METHODS MANAGER SUB-COMPONENT
 * ════════════════════════════════════════════════════════════ */
function MethodsManager({ methods = [], solutions = [] }) {
  const { addDetectionMethod, removeDetectionMethod, toggleDetectionMethod } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(METHOD_PARADIGMS[0]);
  const [confidence, setConfidence] = useState('High');
  const [solutionId, setSolutionId] = useState(solutions[0]?.id || '');
  const [tactics, setTactics] = useState('execution, persistence');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addDetectionMethod({
      name: name.trim(),
      type,
      confidence,
      solutionId,
      tactics: tactics.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      description: `Detection logic using ${type} capabilities.`,
    });
    setName(''); setShowAddForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
            Detection Methods & Telemetry Capabilities
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Specify analytics, anomaly detectors, signature feeds, and telemetry pipelines deployed
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddForm(f => !f)}
          style={{ fontSize: 12 }}
        >
          <Icon name="plus" size={14} />
          <span>{showAddForm ? 'Cancel' : 'Add Detection Method'}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="glass-panel" style={{
          padding: 'var(--space-6)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          background: 'linear-gradient(135deg, rgba(15, 30, 48, 0.9), rgba(13, 18, 31, 0.95))',
        }}>
          <h3 style={{ fontSize: 'var(--text-base)', color: '#22d3ee', marginBottom: 'var(--space-4)' }}>
            🛰️ Add Detection Method / Capability
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Method Title *
              </label>
              <input
                className="form-input"
                placeholder="e.g. PowerShell ScriptBlock De-obfuscation Engine"
                value={name} onChange={e => setName(e.target.value)} required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Detection Paradigm
              </label>
              <select
                className="form-input"
                value={type}
                onChange={e => setType(e.target.value)}
                style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}
              >
                {METHOD_PARADIGMS.map(p => (
                  <option key={p} value={p} style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Confidence / Precision
              </label>
              <select
                className="form-input"
                value={confidence}
                onChange={e => setConfidence(e.target.value)}
                style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}
              >
                <option value="High" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>High (Low False Positive Rate)</option>
                <option value="Medium" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>Medium (Moderate Heuristic)</option>
                <option value="Experimental" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>Experimental / Research</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Linked Security Solution
              </label>
              <select
                className="form-input"
                value={solutionId}
                onChange={e => setSolutionId(e.target.value)}
                style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}
              >
                <option value="" style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>-- Standalone / Custom --</option>
                {solutions.map(s => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: '#0e1424', color: '#f8fafc' }}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Targeted MITRE Tactics (comma separated IDs)
            </label>
            <input
              className="form-input"
              placeholder="e.g. execution, persistence, credential-access"
              value={tactics} onChange={e => setTactics(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Detection Method
            </button>
          </div>
        </form>
      )}

      {/* Methods Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {methods.map(meth => {
          const isEnabled = meth.enabled !== false;
          const linkedSol = solutions.find(s => s.id === meth.solutionId);
          return (
            <div key={meth.id} className="glass-panel" style={{
              padding: 'var(--space-5)',
              borderLeft: `4px solid ${isEnabled ? '#06b6d4' : '#64748b'}`,
              opacity: isEnabled ? 1 : 0.6,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', fontWeight: 700 }}>
                      {meth.type}
                    </span>
                    <h4 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800, marginTop: 4 }}>
                      {meth.name}
                    </h4>
                  </div>
                  <label className="toggle" title="Enable or disable method">
                    <input type="checkbox" checked={isEnabled} onChange={() => toggleDetectionMethod(meth.id)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Confidence: <strong style={{ color: '#10b981' }}>{meth.confidence}</strong> · Source:{' '}
                  <span style={{ color: '#c084fc' }}>{linkedSol ? linkedSol.name : 'Standalone Engine'}</span>
                </div>

                {meth.tactics?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                    {meth.tactics.map(t => (
                      <span key={t} style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeDetectionMethod(meth.id)}
                  style={{ color: 'var(--color-danger)', fontSize: 11, padding: '2px 8px' }}
                >
                  <Icon name="trash" size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * RULES MANAGER SUB-COMPONENT (Sigma + Navigator + Manual)
 * ════════════════════════════════════════════════════════════ */
function RulesManager({ rules = [], onNavigate }) {
  const { uploadRuleFile, addManualRule, removeRule } = useApp();
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
    setParseError(null); setParseSuccess(null); setUploading(true);
    try {
      const results = [];
      for (const file of files) {
        const body = await uploadRuleFile(file);
        results.push(body);
      }
      const total = results.reduce((n, r) => n + r.rules.length, 0);
      if (total > 0) {
        setParseSuccess(`✅ Ingested ${total} detection rule${total > 1 ? 's' : ''} to the engine.`);
      } else {
        setParseError('No valid Sigma or ATT&CK rules detected. Ensure files contain attack.tXXXX tags.');
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
        level: 'high',
        techniques: [manualTechId],
      });
      setParseSuccess('✅ Manual detection rule added to catalog.');
      setManualTechId(''); setManualTitle(''); setSearch(''); setShowManual(false);
    } catch (err) {
      setParseError(`⚠️ ${err.message}`);
    }
  };

  const levelColors = {
    critical: '#f43f5e',
    high: '#fb923c',
    medium: '#f59e0b',
    low: '#38bdf8',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Drag and Drop Zone */}
      <div
        className={`dropzone ${dragActive || uploading ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          background: 'rgba(13, 18, 31, 0.7)',
          border: `2px dashed ${dragActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.15)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>
          {uploading ? '⏳' : '📥'}
        </div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#f8fafc' }}>
          {uploading ? 'Processing & Mapping Rules...' : 'Drag & drop Sigma rules (.yml) or ATT&CK Navigator Layer (.json)'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Automatic extraction of MITRE ATT&CK tags, technique IDs, and severity weighting
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".yml,.yaml,.json" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(Array.from(e.target.files))} />

      {parseError && (
        <div style={{ padding: 'var(--space-3)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: 12 }}>
          {parseError}
        </div>
      )}
      {parseSuccess && (
        <div style={{ padding: 'var(--space-3)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', color: '#10b981', fontSize: 12 }}>
          {parseSuccess}
        </div>
      )}

      {/* Manual Entry Drawer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowManual(s => !s)}
          style={{ fontSize: 12 }}
        >
          <Icon name="plus" size={14} />
          <span>{showManual ? 'Cancel' : 'Add Rule Manually'}</span>
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          Total Catalog Rules: <strong style={{ color: '#f8fafc' }}>{rules.length}</strong>
        </span>
      </div>

      {showManual && (
        <div className="glass-panel" style={{ padding: 'var(--space-5)' }}>
          <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Search MITRE Technique *
            </label>
            <input
              className="form-input"
              placeholder="e.g. T1059.001 or PowerShell Scripting..."
              value={search} onChange={e => handleManualSearch(e.target.value)}
            />
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'rgba(13, 18, 31, 0.98)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)',
              }}>
                {suggestions.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTechnique(t)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#c084fc', fontWeight: 700 }}>{t.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Rule Title / Identifier
            </label>
            <input
              className="form-input"
              placeholder="e.g. Detect Suspicious Encoded PowerShell Execution"
              value={manualTitle} onChange={e => setManualTitle(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAddManual} disabled={!manualTechId || !manualTitle}>
            Save Rule to Catalog
          </button>
        </div>
      )}

      {/* Rules Catalog Table/Grid */}
      <div className="glass-panel" style={{ padding: 'var(--space-5)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', marginBottom: 'var(--space-4)' }}>
          Ingested Rule Repository
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
          {rules.length > 0 ? (
            rules.map(rule => (
              <div key={rule.id} className="remediation-row" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: levelColors[rule.level?.toLowerCase()] || '#f59e0b',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }} className="truncate">
                      {rule.title}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                      {rule.techniques?.map(tid => (
                        <span key={tid} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                          {tid}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {rule.source || 'Sigma'}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeRule(rule.id)}
                    style={{ color: 'var(--color-danger)', padding: 4 }}
                    title="Delete rule"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              No rules imported yet. Upload Sigma rules above or add manual detections.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * LIVE COVERAGE & HEATMAP SECTION
 * ════════════════════════════════════════════════════════════ */
function LiveCoverageSection() {
  const { state } = useApp();
  const preview = useMemo(
    () => runGapAnalysis(state.detectionRules, state.selectedActors, state.securitySolutions, state.detectionMethods),
    [state.detectionRules, state.selectedActors, state.securitySolutions, state.detectionMethods],
  );

  const coveredPct = preview.totalTechniques ? Math.round((preview.coveredCount / preview.totalTechniques) * 100) : 0;
  const barColor = coveredPct >= 61 ? '#10b981' : coveredPct >= 31 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
            🗺️ Live ATT&CK Matrix Coverage Preview
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Real-time technique coverage computed dynamically from solutions, methods, and rules
          </p>
        </div>
        <span className="telemetry-pill">
          {preview.coveredCount} / {preview.totalTechniques} Techniques Covered
        </span>
      </div>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Overall Matrix Defense Baseline</span>
          <span style={{ fontWeight: 700, color: barColor, fontFamily: 'JetBrains Mono' }}>{coveredPct}%</span>
        </div>
        <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${coveredPct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
        </div>
      </div>

      <MiniHeatmap techniqueScores={preview.techniqueScores} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * COVERAGE GAPS & MITIGATIONS
 * ════════════════════════════════════════════════════════════ */
function CoverageGapsSection({ onNavigate }) {
  const { state } = useApp();
  const preview = useMemo(
    () => runGapAnalysis(state.detectionRules, state.selectedActors, state.securitySolutions, state.detectionMethods),
    [state.detectionRules, state.selectedActors, state.securitySolutions, state.detectionMethods],
  );

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', color: '#f8fafc', fontWeight: 800 }}>
            ⚠️ Prioritized Detection Gaps & Mitigation Advice
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Unmitigated techniques ranked by adversary threat relevance
          </p>
        </div>
        <span className="sev-pill critical">
          {preview.criticalGaps.length} Critical Exposures
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {preview.gaps.slice(0, 8).map(gap => (
          <div key={gap.id} className="remediation-row">
            <span className={gap.score === 0 ? 'sev-pill critical' : 'sev-pill high'} style={{ minWidth: 70, justifyContent: 'center' }}>
              {gap.score === 0 ? 'NO RULE' : 'WEAK'}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#c084fc', minWidth: 70 }}>
              {gap.id}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }} className="truncate">
                {gap.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Tactic: {gap.tactic || 'Execution'} · Priority Weight: {gap.priority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}