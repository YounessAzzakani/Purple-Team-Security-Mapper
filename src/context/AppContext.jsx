import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as api from '../services/api';

const AppContext = createContext(null);

const STORAGE_KEY = 'purple-team-mapper-state';
const THEME_KEY = 'ptm-theme';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Dark is the app's default theme — we never follow the OS color-scheme preference.
function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'dark';
}

const VALID_PAGES = ['dashboard', 'soc', 'threat', 'scan', 'history'];

function getPageFromHash() {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
    if (VALID_PAGES.includes(raw)) return raw;
  } catch { /* ignore */ }
  return 'dashboard';
}

export const DEFAULT_SECURITY_SOLUTIONS = [
  {
    id: 'sol-edr',
    name: 'CrowdStrike Falcon Insight',
    category: 'Endpoint & EDR',
    vendor: 'CrowdStrike',
    status: 'enforcing',
    dataSources: ['Process Creation', 'File Activity', 'Memory Scans', 'Network Sockets'],
    description: 'Next-Gen EDR agent with behavioral telemetry & automated quarantine.',
    enabled: true,
  },
  {
    id: 'sol-siem',
    name: 'Splunk Enterprise Security',
    category: 'SIEM & Analytics',
    vendor: 'Splunk',
    status: 'enforcing',
    dataSources: ['Windows Event Logs', 'Sysmon', 'Firewall Logs', 'Active Directory'],
    description: 'Centralized security information and real-time event correlation engine.',
    enabled: true,
  },
  {
    id: 'sol-ngfw',
    name: 'Palo Alto PA-5200 NGFW',
    category: 'Network & Firewall',
    vendor: 'Palo Alto Networks',
    status: 'enforcing',
    dataSources: ['DNS Queries', 'TLS Inspection', 'Flow Records', 'Threat Prevention'],
    description: 'Deep packet inspection next-gen perimeter firewall with threat prevention.',
    enabled: true,
  },
  {
    id: 'sol-cloud',
    name: 'AWS GuardDuty & CloudTrail',
    category: 'Cloud Security',
    vendor: 'Amazon Web Services',
    status: 'monitoring',
    dataSources: ['VPC Flow Logs', 'CloudTrail Management Events', 'S3 Access Logs'],
    description: 'Intelligent threat detection for cloud workloads and AWS IAM anomalies.',
    enabled: true,
  },
  {
    id: 'sol-waf',
    name: 'Cloudflare Enterprise WAF',
    category: 'Application Security',
    vendor: 'Cloudflare',
    status: 'enforcing',
    dataSources: ['HTTP/S Payload', 'Bot Management', 'DDoS Analytics'],
    description: 'Edge layer 7 web application firewall and API protection gateway.',
    enabled: true,
  },
];

export const DEFAULT_DETECTION_METHODS = [
  {
    id: 'dm-sysmon',
    name: 'Sysmon Process & Command Auditing',
    type: 'Log Correlation',
    confidence: 'High',
    solutionId: 'sol-siem',
    tactics: ['execution', 'persistence', 'defense-evasion'],
    dataSources: ['Sysmon Event ID 1', 'Sysmon Event ID 7', 'PowerShell 4104'],
    description: 'Real-time telemetry tracking parent-child process relationships and script blocks.',
    enabled: true,
  },
  {
    id: 'dm-behavioral',
    name: 'Behavioral Anomaly & Process Injection Monitor',
    type: 'Behavioral / ML',
    confidence: 'High',
    solutionId: 'sol-edr',
    tactics: ['defense-evasion', 'privilege-escalation', 'credential-access'],
    dataSources: ['Memory Injection Calls', 'API Hooking', 'LSASS Handle Requests'],
    description: 'Machine learning heuristic detection of process hollowing and memory injection.',
    enabled: true,
  },
  {
    id: 'dm-netflow',
    name: 'Encrypted Traffic Analysis & C2 Beaconing',
    type: 'Network Inspection',
    confidence: 'Medium',
    solutionId: 'sol-ngfw',
    tactics: ['command-and-control', 'exfiltration'],
    dataSources: ['NetFlow / IPFIX', 'TLS JA3 Fingerprinting', 'DNS Tunneling'],
    description: 'Algorithmic periodic jitter and beaconing pattern detection over TLS/DNS streams.',
    enabled: true,
  },
  {
    id: 'dm-cloud-iam',
    name: 'Cloud Privilege Escalation & API Auditing',
    type: 'Cloud Audit',
    confidence: 'High',
    solutionId: 'sol-cloud',
    tactics: ['initial-access', 'persistence', 'privilege-escalation'],
    dataSources: ['AssumeRole Events', 'AccessKey Manipulation', 'ConsoleLogin Anomaly'],
    description: 'Continuous monitoring of IAM policy updates and anomalous root console logins.',
    enabled: true,
  },
  {
    id: 'dm-deception',
    name: 'Honeytokens & Canary Credentials',
    type: 'Deception',
    confidence: 'High',
    solutionId: 'sol-siem',
    tactics: ['credential-access', 'lateral-movement'],
    dataSources: ['Kerberoasting Canaries', 'Fake SMB Share Access', 'LSA Secrets Decoy'],
    description: 'High-fidelity tripwire alarms triggered upon decoy credential interaction.',
    enabled: true,
  },
];

const initialState = {
  activePage: 'dashboard',       // 'dashboard' | 'soc' | 'threat'
  theme: 'dark',
  securitySolutions: DEFAULT_SECURITY_SOLUTIONS,
  detectionMethods: DEFAULT_DETECTION_METHODS,
  detectionRules: [],
  selectedActors: [],
  analysisResult: null,
  analysisMeta: null,
  analysesHistory: [],
  lastAnalyzed: null,
  loading: false,
  apiError: null,
};

function buildInitialState() {
  const stored = loadFromStorage();
  const initialPage = getPageFromHash();
  if (!stored) return { ...initialState, theme: loadTheme(), activePage: initialPage };
  return {
    ...initialState,
    theme: loadTheme(),
    activePage: initialPage,
    securitySolutions: stored.securitySolutions?.length ? stored.securitySolutions : DEFAULT_SECURITY_SOLUTIONS,
    detectionMethods: stored.detectionMethods?.length ? stored.detectionMethods : DEFAULT_DETECTION_METHODS,
    selectedActors: stored.selectedActors || [],
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, activePage: action.page };

    /* ── Security Solutions ── */
    case 'ADD_SOLUTION':
      return { ...state, securitySolutions: [action.solution, ...state.securitySolutions] };
    case 'UPDATE_SOLUTION':
      return {
        ...state,
        securitySolutions: state.securitySolutions.map(s => s.id === action.id ? { ...s, ...action.payload } : s),
      };
    case 'REMOVE_SOLUTION':
      return {
        ...state,
        securitySolutions: state.securitySolutions.filter(s => s.id !== action.id),
      };
    case 'TOGGLE_SOLUTION':
      return {
        ...state,
        securitySolutions: state.securitySolutions.map(s => s.id === action.id ? { ...s, enabled: !s.enabled } : s),
      };

    /* ── Detection Methods ── */
    case 'ADD_DETECTION_METHOD':
      return { ...state, detectionMethods: [action.method, ...state.detectionMethods] };
    case 'UPDATE_DETECTION_METHOD':
      return {
        ...state,
        detectionMethods: state.detectionMethods.map(m => m.id === action.id ? { ...m, ...action.payload } : m),
      };
    case 'REMOVE_DETECTION_METHOD':
      return {
        ...state,
        detectionMethods: state.detectionMethods.filter(m => m.id !== action.id),
      };
    case 'TOGGLE_DETECTION_METHOD':
      return {
        ...state,
        detectionMethods: state.detectionMethods.map(m => m.id === action.id ? { ...m, enabled: !m.enabled } : m),
      };

    case 'SET_RULES':
      return { ...state, detectionRules: action.rules, apiError: null, loading: false };
    case 'REMOVE_RULE':
      return { ...state, detectionRules: state.detectionRules.filter(r => r.id !== action.ruleId) };
    case 'TOGGLE_ACTOR': {
      const { actorId } = action;
      const isSelected = state.selectedActors.includes(actorId);
      const selectedActors = isSelected
        ? state.selectedActors.filter(id => id !== actorId)
        : [...state.selectedActors, actorId];
      return { ...state, selectedActors };
    }
    case 'SET_HISTORY':
      return { ...state, analysesHistory: action.analyses };
    case 'DELETE_ANALYSIS':
      return {
        ...state,
        analysesHistory: state.analysesHistory.filter(a => a.id !== action.id),
        analysisResult: state.analysisMeta?.id === action.id ? null : state.analysisResult,
        analysisMeta: state.analysisMeta?.id === action.id ? null : state.analysisMeta,
      };
    case 'SET_ANALYSIS':
      return {
        ...state,
        analysisResult: action.result,
        analysisMeta: action.meta,
        lastAnalyzed: action.meta?.created_at || new Date().toISOString(),
        loading: false,
        apiError: null,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading, apiError: action.loading ? null : state.apiError };
    case 'SET_API_ERROR':
      return { ...state, loading: false, apiError: action.error };
    case 'SET_THEME':
      return { ...state, theme: action.theme === 'light' ? 'light' : 'dark' };
    case 'RESET':
      localStorage.removeItem(STORAGE_KEY);
      return {
        ...initialState,
        theme: state.theme,
        activePage: 'dashboard',
        detectionRules: state.detectionRules,
        analysesHistory: state.analysesHistory,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Sync URL hash with activePage
  useEffect(() => {
    const currentHash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
    if (currentHash !== state.activePage) {
      window.location.hash = `#/${state.activePage}`;
    }
  }, [state.activePage]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      if (page !== state.activePage) {
        dispatch({ type: 'SET_PAGE', page });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [state.activePage]);

  // Persist session inputs
  useEffect(() => {
    const toSave = {
      selectedActors: state.selectedActors,
      securitySolutions: state.securitySolutions,
      detectionMethods: state.detectionMethods,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.selectedActors, state.securitySolutions, state.detectionMethods]);

  // Apply + persist theme
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    try { localStorage.setItem(THEME_KEY, state.theme); } catch { /* ignore */ }
  }, [state.theme]);

  // Bootstrap: load rules + history + latest analysis
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const { rules } = await api.getRules();
        if (!cancelled) dispatch({ type: 'SET_RULES', rules });
      } catch (err) {
        if (!cancelled) dispatch({ type: 'SET_API_ERROR', error: err.message });
      }
      try {
        const { analyses } = await api.listAnalyses();
        if (cancelled) return;
        dispatch({ type: 'SET_HISTORY', analyses });
        const latest = analyses[0];
        if (latest) {
          const full = await api.getAnalysis(latest.id);
          if (!cancelled) dispatch({ type: 'SET_ANALYSIS', result: full.result, meta: full.analysis });
        }
      } catch (err) {
        if (!cancelled) dispatch({ type: 'SET_API_ERROR', error: err.message });
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const refreshRules = useCallback(async () => {
    try {
      const { rules } = await api.getRules();
      dispatch({ type: 'SET_RULES', rules });
      return rules;
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const { analyses } = await api.listAnalyses();
      dispatch({ type: 'SET_HISTORY', analyses });
      return analyses;
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, []);

  const loadAnalysis = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const full = await api.getAnalysis(id);
      dispatch({ type: 'SET_ANALYSIS', result: full.result, meta: full.analysis });
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, []);

  const uploadRuleFile = useCallback(async (file) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const body = await api.uploadRuleFile(file);
      await refreshRules();
      return body;
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, [refreshRules]);

  const addManualRule = useCallback(async (payload) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await api.createManualRule(payload);
      await refreshRules();
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, [refreshRules]);

  const removeRule = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await api.deleteRule(id);
      dispatch({ type: 'REMOVE_RULE', ruleId: id });
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, []);

  /* ── Security Solutions Callbacks ── */
  const addSolution = useCallback((solution) => {
    const id = solution.id || `sol-${Date.now()}`;
    dispatch({ type: 'ADD_SOLUTION', solution: { ...solution, id, enabled: true } });
  }, []);

  const updateSolution = useCallback((id, payload) => {
    dispatch({ type: 'UPDATE_SOLUTION', id, payload });
  }, []);

  const removeSolution = useCallback((id) => {
    dispatch({ type: 'REMOVE_SOLUTION', id });
  }, []);

  const toggleSolution = useCallback((id) => {
    dispatch({ type: 'TOGGLE_SOLUTION', id });
  }, []);

  /* ── Detection Methods Callbacks ── */
  const addDetectionMethod = useCallback((method) => {
    const id = method.id || `dm-${Date.now()}`;
    dispatch({ type: 'ADD_DETECTION_METHOD', method: { ...method, id, enabled: true } });
  }, []);

  const updateDetectionMethod = useCallback((id, payload) => {
    dispatch({ type: 'UPDATE_DETECTION_METHOD', id, payload });
  }, []);

  const removeDetectionMethod = useCallback((id) => {
    dispatch({ type: 'REMOVE_DETECTION_METHOD', id });
  }, []);

  const toggleDetectionMethod = useCallback((id) => {
    dispatch({ type: 'TOGGLE_DETECTION_METHOD', id });
  }, []);

  const deleteAnalysis = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await api.deleteAnalysis(id);
      dispatch({ type: 'DELETE_ANALYSIS', id });
      await refreshHistory();
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [refreshHistory]);

  const runAnalysis = useCallback(async (options = {}) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const scanName = options.name || `Purple Team Scan — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const actorIds = options.actorIds ?? state.selectedActors;
      const solutions = options.solutions ?? state.securitySolutions;
      const detectionMethods = options.detectionMethods ?? state.detectionMethods;

      const body = await api.runAnalysis({
        name: scanName,
        actorIds: actorIds,
        solutions: solutions,
        detectionMethods: detectionMethods,
      });
      dispatch({ type: 'SET_ANALYSIS', result: body.result, meta: body.analysis });
      refreshHistory().catch(() => {});
      return body;
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, [state.selectedActors, state.securitySolutions, state.detectionMethods, refreshHistory]);

  const setPage = useCallback((page) => dispatch({ type: 'SET_PAGE', page }), []);
  const toggleActor = useCallback((actorId) => dispatch({ type: 'TOGGLE_ACTOR', actorId }), []);
  const toggleTheme = useCallback(() => dispatch({ type: 'SET_THEME', theme: state.theme === 'dark' ? 'light' : 'dark' }), [state.theme]);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <AppContext.Provider value={{
      state,
      setPage,
      toggleTheme,
      toggleActor,
      uploadRuleFile,
      addManualRule,
      removeRule,
      addSolution,
      updateSolution,
      removeSolution,
      toggleSolution,
      addDetectionMethod,
      updateDetectionMethod,
      removeDetectionMethod,
      toggleDetectionMethod,
      runAnalysis,
      loadAnalysis,
      deleteAnalysis,
      refreshHistory,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}