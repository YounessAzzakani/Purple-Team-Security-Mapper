import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import HomePage from './components/pages/HomePage';
import SocPage from './components/pages/SocPage';
import AttackPage from './components/pages/AttackPage';
import AnalysisPage from './components/pages/AnalysisPage';
import './index.css';

function AppShell() {
  const { state, setPage } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const navigate = (page) => {
    setPage(page);
    setSidebarOpen(false);
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
          {state.activePage === 'home' && <HomePage onNavigate={navigate} />}
          {state.activePage === 'soc' && <SocPage onNavigate={navigate} />}
          {state.activePage === 'attack' && <AttackPage />}
          {state.activePage === 'analysis' && <AnalysisPage onNavigate={navigate} />}
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