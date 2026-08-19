import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './components/pages/DashboardPage';
import SocCenterPage from './components/pages/SocCenterPage';
import ThreatIntelPage from './components/pages/ThreatIntelPage';
import RunScanPage from './components/pages/RunScanPage';
import HistoryPage from './components/pages/HistoryPage';
import './index.css';

function AppShell() {
  const { state, setPage } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const navigate = (page) => {
    setPage(page);
    setSidebarOpen(false);
    window.scrollTo(0, 0); // reset scroll on every page change
  };

  // Track scroll to reveal the back-to-top button on long pages
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="app-layout">
      {/* Mobile backdrop when the drawer is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar activePage={state.activePage} onNavigate={navigate} open={sidebarOpen} />

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

        {/* Back to top */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Back to top"
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 'var(--z-dropdown)',
              width: 44, height: 44, borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-purple)', border: 'none', color: 'white',
              fontSize: '1.1rem', cursor: 'pointer',
              boxShadow: 'var(--shadow-glow-strong)',
              transition: 'all var(--transition-fast)',
            }}
          >
            ↑
          </button>
        )}

        {/* Page content */}
        <div key={state.activePage} className="animate-fade-in" style={{ paddingBottom: 'var(--space-16)' }}>
          {state.activePage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {state.activePage === 'soc' && <SocCenterPage onNavigate={navigate} />}
          {state.activePage === 'threat' && <ThreatIntelPage />}
          {state.activePage === 'scan' && <RunScanPage onNavigate={navigate} />}
          {state.activePage === 'history' && <HistoryPage onNavigate={navigate} />}
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