import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { THREAT_ACTORS } from '../../data/threatActors';
import { TECHNIQUE_INTEL } from '../../data/mitigationsData';
import * as api from '../../services/api';
import { exportAssessmentToPdf } from '../../services/pdfExport';
import AttackPathSimulator from '../simulator/AttackPathSimulator';

/* ── Inline Geometric SVG Icons ── */
function Icon({ name, size = 18, className = '', style = {} }) {
  const icons = {
    history: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <path d="M3.05 11a9 9 0 0 1 .5-2m1.8-3.4A9 9 0 0 1 12 3" />
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
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    compare: (
      <>
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    sparkles: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    chevronDown: (
      <polyline points="6 9 12 15 18 9" />
    ),
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {icons[name] || icons.history}
    </svg>
  );
}

export default function HistoryPage({ onNavigate }) {
  const { state, deleteAnalysis, refreshHistory } = useApp();
  const { analysesHistory } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('overview'); // 'overview' | 'blue' | 'red' | 'compare'
  const [compareBaselineId, setCompareBaselineId] = useState('');
  const [compareData, setCompareData] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedScanId) {
        setSelectedScanId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScanId]);

  // Load detailed analysis data when a scan is selected for modal popup
  useEffect(() => {
    if (!selectedScanId) {
      setDetailedData(null);
      setCompareData(null);
      return;
    }

    let isMounted = true;
    async function fetchDetail() {
      setLoadingDetail(true);
      try {
        const full = await api.getAnalysis(selectedScanId);
        if (isMounted) {
          setDetailedData(full);
          const otherScans = (analysesHistory || []).filter(a => a.id !== selectedScanId);
          if (otherScans.length > 0) {
            setCompareBaselineId(otherScans[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch detailed analysis:', err);
      } finally {
        if (isMounted) setLoadingDetail(false);
      }
    }
    fetchDetail();
    return () => { isMounted = false; };
  }, [selectedScanId, analysesHistory]);

  // Load comparison data when baseline changes
  useEffect(() => {
    if (!selectedScanId || !compareBaselineId || activeReportTab !== 'compare') return;
    let isMounted = true;
    async function fetchCompare() {
      try {
        const comp = await api.compareAnalyses(selectedScanId, compareBaselineId);
        if (isMounted) setCompareData(comp);
      } catch (err) {
        console.error('Failed to compare analyses:', err);
      }
    }
    fetchCompare();
    return () => { isMounted = false; };
  }, [selectedScanId, compareBaselineId, activeReportTab]);

  // Filtered scans list
  const filteredScans = useMemo(() => {
    if (!analysesHistory) return [];
    if (!searchTerm.trim()) return analysesHistory;
    const term = searchTerm.toLowerCase();
    return analysesHistory.filter(
      a => a.name?.toLowerCase().includes(term) ||
           String(a.id).includes(term) ||
           a.created_at?.toLowerCase().includes(term)
    );
  }, [analysesHistory, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    if (!analysesHistory || analysesHistory.length === 0) {
      return { total: 0, avgScore: 0, latestDate: 'None' };
    }
    const total = analysesHistory.length;
    const avgScore = Math.round(analysesHistory.reduce((acc, a) => acc + (a.posture_score || 0), 0) / total);
    const latestDate = new Date(analysesHistory[0].created_at).toLocaleDateString();
    return { total, avgScore, latestDate };
  }, [analysesHistory]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this scan record?')) {
      try {
        await deleteAnalysis(id);
        if (selectedScanId === id) setSelectedScanId(null);
      } catch (err) {
        alert('Failed to delete scan: ' + err.message);
      }
    }
  };

  const handleExport = async (e, id, format) => {
    e.stopPropagation();
    try {
      await api.downloadAnalysisExport(id, format);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handlePdfDownload = (e) => {
    e?.stopPropagation();
    if (detailedData) {
      exportAssessmentToPdf(detailedData);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#06b6d4';
    if (score >= 30) return '#f59e0b';
    return '#f43f5e';
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <span className="badge" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.25)' }}>
              <Icon name="history" size={13} style={{ marginRight: 4 }} />
              AUDIT TRAIL & REPORTS
            </span>
            <span className="badge badge-purple">
              PURPLE TEAM ASSESSMENTS
            </span>
          </div>
          <h1 className="page-header-title">
            Assessment Reports & History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4, maxWidth: 720 }}>
            Inspect past gap analyses, export formal Executive PDF reports, explore stochastic Red Team kill chain simulations, and compare defense deltas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            onClick={() => onNavigate('scan')}
            className="btn btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Icon name="radar" size={16} />
            Launch New Scan
          </button>
        </div>
      </div>

      {/* ── Summary Metrics Bar ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Assessments
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            Latest: {stats.latestDate}
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Average Posture Score
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: getScoreColor(stats.avgScore), marginTop: 4 }}>
            {stats.avgScore}/100
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            Across all recorded snapshots
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Report Export Formats
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: '#06b6d4', marginTop: 4 }}>
            PDF • CSV • JSON
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            MITRE Navigator Layer compatible
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Attack Path Simulation
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--purple-300)', marginTop: 4 }}>
            Monte-Carlo (200x)
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            Stochastic breach pathing active
          </div>
        </div>
      </div>

      {/* ── Fixed Clean Search Bar & Action Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)',
      }}>
        {/* Sleek Search Bar */}
        <div style={{ position: 'relative', width: 380, maxWidth: '100%' }}>
          <div style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
          }}>
            <Icon name="search" size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search assessments by name, date, or ID…"
            style={{
              width: '100%', height: 42, padding: '0 36px 0 40px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: 'var(--text-xs)', outline: 'none', transition: 'all 0.15s ease',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--purple-400)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title="Clear search"
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                cursor: 'pointer', fontSize: 13, padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => refreshHistory()}
          className="btn btn-ghost"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
        >
          ↻ Refresh List
        </button>
      </div>

      {/* ── Full Width Scans Table ── */}
      <div className="card" style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: 0, width: '100%',
      }}>
        <div style={{
          padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0 }}>
            Recorded Assessments ({filteredScans.length})
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Click any row to open the full Purple Team Report popup
          </span>
        </div>

        {filteredScans.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Icon name="history" size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div>No assessments recorded matching your search.</div>
            <button
              onClick={() => onNavigate('scan')}
              className="btn btn-primary"
              style={{ marginTop: 16, fontSize: 'var(--text-xs)' }}
            >
              Run First Purple Scan
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>ASSESSMENT NAME</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>DATE / TIMESTAMP</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>POSTURE SCORE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>CRITICAL GAPS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map(scan => {
                  const score = scan.posture_score ?? 0;
                  const color = getScoreColor(score);
                  const dateFormatted = new Date(scan.created_at).toLocaleString([], {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  });

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => setSelectedScanId(scan.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                          {scan.name || `Scan #${scan.id}`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          ID #{scan.id} • {scan.covered_count || 0}/{scan.total_techniques || 0} techniques covered
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {dateFormatted}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                          background: `${color}18`, border: `1px solid ${color}35`,
                          color: color, fontWeight: 800, fontSize: 12,
                        }}>
                          {score}/100
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {scan.critical_gaps > 0 ? (
                          <span style={{ color: '#f43f5e', fontWeight: 800 }}>
                            {scan.critical_gaps} Critical Gaps
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>0 None</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedScanId(scan.id); }}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Inspect full report popup"
                          >
                            <Icon name="eye" size={13} />
                            <span>View Report</span>
                          </button>
                          <button
                            onClick={(e) => handleExport(e, scan.id, 'csv')}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: 11 }}
                            title="Export CSV"
                          >
                            CSV
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, scan.id)}
                            className="btn btn-ghost"
                            style={{ padding: '5px 8px', fontSize: 11, color: 'var(--text-muted)' }}
                            title="Delete record"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PURPLE TEAM REPORT FULL POPUP MODAL DIALOG (Teleported to Body)
         ══════════════════════════════════════════════════════════════ */}
      {selectedScanId && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setSelectedScanId(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            background: 'rgba(3, 6, 14, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
          }}
          className="animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--purple-400)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 1180,
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 80px rgba(0,0,0,0.95), 0 0 45px rgba(124,58,237,0.3)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1000000,
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>PURPLE TEAM EXECUTIVE REPORT</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Assessment Snapshot #{selectedScanId}</span>
                </div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  {detailedData?.analysis?.name || 'Purple Team Assessment Report'}
                </h2>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Recorded on {detailedData?.analysis?.created_at ? new Date(detailedData.analysis.created_at).toLocaleString() : 'Recent'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {detailedData && (
                  <div style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-md)',
                    background: `${getScoreColor(detailedData.analysis?.posture_score)}18`,
                    border: `1px solid ${getScoreColor(detailedData.analysis?.posture_score)}40`,
                    textAlign: 'center', flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>POSTURE SCORE</div>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: getScoreColor(detailedData.analysis?.posture_score) }}>
                      {detailedData.analysis?.posture_score}/100
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedScanId(null)}
                  style={{
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Close report (Esc)"
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--purple-400)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body Tabs */}
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border-subtle)',
              padding: '0 var(--space-6)', background: 'rgba(255, 255, 255, 0.01)', gap: 8,
            }}>
              {[
                { id: 'overview', label: 'Purple Matrix', icon: 'radar' },
                { id: 'blue', label: 'Blue Remediations', icon: 'shield' },
                { id: 'red', label: 'Attack Simulator', icon: 'crosshair' },
                { id: 'compare', label: 'Compare Baseline', icon: 'compare' },
              ].map(tab => {
                const active = activeReportTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReportTab(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '12px 14px', background: 'transparent', border: 'none',
                      borderBottom: active ? '2px solid var(--purple-400)' : '2px solid transparent',
                      color: active ? 'var(--purple-200)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)', fontWeight: active ? 800 : 500,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon name={tab.icon} size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Scrollable Content */}
            <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxHeight: 'calc(92vh - 200px)' }}>
              {loadingDetail ? (
                <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Icon name="radar" size={36} style={{ animation: 'pulse 1.2s infinite', color: 'var(--purple-300)', marginBottom: 12 }} />
                  <div>Loading comprehensive assessment report…</div>
                </div>
              ) : detailedData ? (
                <div>
                  {/* Scope Badges */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 8, padding: 'var(--space-3)',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)',
                  }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <strong>Adversaries:</strong> {detailedData.inputs?.actorIds?.length ? detailedData.inputs.actorIds.join(', ') : 'All Threat Groups'}
                    </span>
                    <span style={{ color: 'var(--border-subtle)' }}>•</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <strong>Solutions:</strong> {detailedData.inputs?.securitySolutions?.length || 0} active
                    </span>
                    <span style={{ color: 'var(--border-subtle)' }}>•</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <strong>Rules:</strong> {detailedData.inputs?.rules?.length || 0} evaluated
                    </span>
                  </div>

                  {/* Tab 1: Purple Matrix */}
                  {activeReportTab === 'overview' && (
                    <div className="animate-fade-in">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                        <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Active Technique Coverage</div>
                          <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                            {detailedData.result?.coveredCount || 0} / {detailedData.result?.totalTechniques || 0} Techniques ({detailedData.result?.totalTechniques ? Math.round(((detailedData.result?.coveredCount || 0) / detailedData.result.totalTechniques) * 100) : 0}%)
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Coverage Gaps</div>
                          <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#f43f5e', marginTop: 2 }}>
                            {detailedData.result?.criticalGaps?.length || 0} Critical (0% score) / {detailedData.result?.weakGaps?.length || 0} Weak
                          </div>
                        </div>
                      </div>

                      <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Technique Coverage Matrix
                      </h4>

                      <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                          <thead style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>
                            <tr style={{ color: 'var(--text-tertiary)' }}>
                              <th style={{ padding: '8px 12px' }}>TECHNIQUE</th>
                              <th style={{ padding: '8px 12px' }}>TACTIC</th>
                              <th style={{ padding: '8px 12px' }}>SCORE</th>
                              <th style={{ padding: '8px 12px' }}>LEVEL</th>
                              <th style={{ padding: '8px 12px' }}>COVERING CONTROLS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(detailedData.result?.techniqueScores || {}).map(([tid, t]) => {
                              const score = t.score || 0;
                              const levelColor = getScoreColor(score);
                              return (
                                <tr key={tid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '8px 12px' }}>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--purple-300)', marginRight: 6, fontWeight: 700 }}>{tid}</span>
                                    <span>{t.name}</span>
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{t.tactic}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 800, color: levelColor }}>{score}%</td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <span style={{
                                      padding: '2px 6px', borderRadius: 4,
                                      background: `${levelColor}18`, color: levelColor, fontSize: 9, fontWeight: 800, textTransform: 'uppercase'
                                    }}>
                                      {t.level}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>
                                    {(t.coveringControls || []).map(c => c.name).slice(0, 2).join(', ') || 'None'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Blue Team Remediations */}
                  {activeReportTab === 'blue' && (
                    <div className="animate-fade-in">
                      <div style={{
                        padding: 'var(--space-3) var(--space-4)', background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
                      }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="shield" size={15} />
                          Blue Team Remediation Roadmap
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                          Prioritize deploying the specific Sigma detection rules and activating endpoint telemetry sources below to resolve critical gaps.
                        </p>
                      </div>

                      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {(detailedData.result?.criticalGaps || []).map(gap => {
                          const intel = TECHNIQUE_INTEL[gap.id] || {};
                          return (
                            <div
                              key={gap.id}
                              style={{
                                background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: 4,
                                    background: 'rgba(244,63,94,0.15)', color: '#f43f5e',
                                    fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                                  }}>
                                    {gap.id}
                                  </span>
                                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{gap.name}</strong>
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{gap.tactic}</span>
                              </div>

                              {intel.sigmaGuidance && (
                                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                  <strong style={{ color: 'var(--purple-300)' }}>Sigma Rule Directive:</strong> {intel.sigmaGuidance}
                                </div>
                              )}

                              {intel.dataSources && intel.dataSources.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginRight: 4 }}>Required Telemetry:</span>
                                  {intel.dataSources.map((ds, i) => (
                                    <span key={i} style={{
                                      fontSize: 10, padding: '2px 6px', borderRadius: 3,
                                      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: '#06b6d4',
                                    }}>
                                      {ds}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Red Team Attack Simulator */}
                  {activeReportTab === 'red' && (
                    <div className="animate-fade-in">
                      <AttackPathSimulator
                        analysisId={detailedData.analysis?.id}
                        techniqueScores={detailedData.result?.techniqueScores || {}}
                        selectedActorIds={detailedData.inputs?.actorIds || []}
                      />
                    </div>
                  )}

                  {/* Tab 4: Compare Baseline with Custom Dropdown */}
                  {activeReportTab === 'compare' && (
                    <div className="animate-fade-in">
                      {/* Fixed Custom Dropdown */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 800 }}>
                          Select Baseline Scan:
                        </label>
                        <div style={{ position: 'relative', minWidth: 360, maxWidth: '100%' }}>
                          <select
                            value={compareBaselineId}
                            onChange={e => setCompareBaselineId(e.target.value)}
                            style={{
                              width: '100%', height: 40, padding: '0 36px 0 14px',
                              background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)',
                              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                              fontSize: 'var(--text-xs)', appearance: 'none', WebkitAppearance: 'none',
                              outline: 'none', cursor: 'pointer',
                            }}
                          >
                            <option value="">Choose a historical baseline to compare…</option>
                            {(analysesHistory || [])
                              .filter(a => a.id !== selectedScanId)
                              .map(a => (
                                <option key={a.id} value={a.id}>
                                  #{a.id} — {a.name} (Posture: {a.posture_score}/100)
                                </option>
                              ))}
                          </select>
                          <div style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            pointerEvents: 'none', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                          }}>
                            <Icon name="chevronDown" size={15} />
                          </div>
                        </div>
                      </div>

                      {compareData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>BASELINE POSTURE</div>
                              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: getScoreColor(compareData.base_posture) }}>
                                {compareData.base_posture ?? 'N/A'}/100
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>CURRENT POSTURE</div>
                              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: getScoreColor(compareData.compare_posture) }}>
                                {compareData.compare_posture}/100
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>POSTURE DELTA</div>
                              <div style={{
                                fontSize: 'var(--text-xl)', fontWeight: 900,
                                color: (compareData.posture_delta ?? 0) >= 0 ? '#10b981' : '#f43f5e',
                              }}>
                                {(compareData.posture_delta ?? 0) > 0 ? `+${compareData.posture_delta}` : compareData.posture_delta ?? 0}%
                              </div>
                            </div>
                          </div>

                          {/* Resolved Gaps */}
                          <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: '#10b981', marginBottom: 6 }}>
                              ✓ Resolved Gaps Closed ({compareData.resolved_gaps?.length || 0})
                            </div>
                            {compareData.resolved_gaps && compareData.resolved_gaps.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {compareData.resolved_gaps.map(tid => (
                                  <span key={tid} style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 3,
                                    background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'monospace', fontWeight: 700,
                                  }}>
                                    {tid}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No critical gaps were closed compared to this baseline.</div>
                            )}
                          </div>

                          {/* New Gaps */}
                          <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: '#f43f5e', marginBottom: 6 }}>
                              ⚠ New Critical Gaps Introduced ({compareData.new_critical_gaps?.length || 0})
                            </div>
                            {compareData.new_critical_gaps && compareData.new_critical_gaps.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {compareData.new_critical_gaps.map(tid => (
                                  <span key={tid} style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 3,
                                    background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontFamily: 'monospace', fontWeight: 700,
                                  }}>
                                    {tid}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No new critical gaps introduced.</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                          Select a prior baseline scan above to calculate posture improvement deltas.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)', flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handlePdfDownload}
                  className="btn btn-primary"
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="download" size={13} />
                  Download Executive PDF Report
                </button>
                <button
                  onClick={(e) => handleExport(e, detailedData?.analysis?.id, 'csv')}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="fileText" size={13} />
                  Export CSV
                </button>
                <button
                  onClick={(e) => handleExport(e, detailedData?.analysis?.id, 'navigator')}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="layers" size={13} />
                  Navigator Layer (.json)
                </button>
              </div>

              <button
                onClick={() => setSelectedScanId(null)}
                className="btn btn-ghost"
                style={{ fontSize: 11 }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
