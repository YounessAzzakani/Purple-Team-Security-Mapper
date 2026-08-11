import { useApp } from '../context/AppContext';

const STEPS = [
  {
    icon: '🛡️',
    title: '1. Vos contrôles de sécurité',
    desc: 'Déclarez ce qui est déjà déployé dans votre infrastructure : EDR, SIEM, MFA, WAF… avec leur niveau de maturité.',
  },
  {
    icon: '🔍',
    title: '2. Vos règles de détection',
    desc: 'Importez le fichier de règles implémentées par votre SOC (Sigma YAML ou ATT&CK Navigator JSON) — le cœur de l\'analyse.',
  },
  {
    icon: '🎯',
    title: '3. Les gaps exploitables',
    desc: 'La plateforme identifie les techniques ATT&CK que vos règles ne couvrent pas et qu\'un attaquant pourrait exploiter.',
  },
];

export default function Landing() {
  const { setStep, state } = useApp();
  const hasSession = state.enabledControls.length > 0 || state.detectionRules.length > 0;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-12) var(--space-6)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
        <div className="logo-icon" style={{ width: 88, height: 88, fontSize: '2.5rem', margin: '0 auto var(--space-6)' }}>🟣</div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 'var(--space-4)' }}>
          Purple Team <span style={{ background: 'linear-gradient(90deg, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mapper</span>
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto var(--space-8)', lineHeight: 1.7 }}>
          Cartographiez la couverture de votre SOC contre le framework MITRE ATT&CK Enterprise v15.
          À partir de vos contrôles déployés et du fichier de règles implémentées, identifiez les
          techniques d'attaque que personne ne surveille — avant que les attaquants ne le fassent.
        </p>
        <button className="btn btn-primary btn-lg" style={{ fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-8)' }} onClick={() => setStep(0)}>
          {hasSession ? '▶️ Reprendre le diagnostic' : '🚀 Lancer le diagnostic'}
        </button>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-12)' }}>
        {STEPS.map((step, i) => (
          <div key={i} className="card animate-slide-up" style={{ padding: 'var(--space-6)', textAlign: 'left' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>{step.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{step.title}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{step.desc}</div>
          </div>
        ))}
      </div>

      {/* Value props */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 'var(--space-12)' }}>
        {[
          { icon: '🗺️', label: 'Heatmap de couverture ATT&CK complète' },
          { icon: '🚨', label: 'Gaps de détection prioritaires par exploitabilité' },
          { icon: '🎯', label: 'Couverture mesurée contre 8 groupes d\'attaquants' },
          { icon: '🕘', label: 'Historique des analyses et évolution de la posture' },
        ].map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '1.3rem' }}>{v.icon}</span>
            {v.label}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Basé sur <a href="https://attack.mitre.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-400)' }}>MITRE ATT&CK Enterprise v15</a> · Standard SIGMA · 33 contrôles · 8 profils APT
      </div>
    </div>
  );
}