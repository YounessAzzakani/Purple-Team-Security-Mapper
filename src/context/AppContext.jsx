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

const VALID_PAGES = ['home', 'soc', 'attack', 'analysis'];

const initialState = {
  activePage: 'home',       // 'home' | 'soc' | 'attack' | 'analysis'
  theme: 'dark',
  enabledControls: [],
  controlMaturity: {},
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
  if (!stored) return { ...initialState, theme: loadTheme() };
  return {
    ...initialState,
    theme: loadTheme(),
    activePage: 'home', // always start on the overview, never restore the last page
    enabledControls: stored.enabledControls || [],
    controlMaturity: stored.controlMaturity || {},
    selectedActors: stored.selectedActors || [],
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, activePage: VALID_PAGES.includes(action.page) ? action.page : 'home' };
    case 'TOGGLE_CONTROL': {
      const { controlId } = action;
      const isEnabled = state.enabledControls.includes(controlId);
      const enabledControls = isEnabled
        ? state.enabledControls.filter(id => id !== controlId)
        : [...state.enabledControls, controlId];
      return { ...state, enabledControls };
    }
    case 'TOGGLE_CATEGORY_CONTROLS': {
      const { controlIds, enable } = action;
      let enabledControls = [...state.enabledControls];
      if (enable) {
        controlIds.forEach(id => { if (!enabledControls.includes(id)) enabledControls.push(id); });
      } else {
        enabledControls = enabledControls.filter(id => !controlIds.includes(id));
      }
      return { ...state, enabledControls };
    }
    case 'SET_MATURITY': {
      const { controlId, level } = action;
      return { ...state, controlMaturity: { ...state.controlMaturity, [controlId]: level } };
    }
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
        activePage: 'home',
        detectionRules: state.detectionRules,
        analysesHistory: state.analysesHistory,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Persist session inputs (the active page is intentionally NOT persisted)
  useEffect(() => {
    const toSave = {
      enabledControls: state.enabledControls,
      controlMaturity: state.controlMaturity,
      selectedActors: state.selectedActors,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.enabledControls, state.controlMaturity, state.selectedActors]);

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

  const runAnalysis = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const body = await api.runAnalysis({
        name: `Analysis ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        controls: state.enabledControls,
        maturity: state.controlMaturity,
        actorIds: state.selectedActors,
      });
      dispatch({ type: 'SET_ANALYSIS', result: body.result, meta: body.analysis });
      refreshHistory().catch(() => {});
      return body;
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', error: err.message });
      throw err;
    }
  }, [state.enabledControls, state.controlMaturity, state.selectedActors, refreshHistory]);

  const setPage = useCallback((page) => dispatch({ type: 'SET_PAGE', page }), []);
  const toggleControl = useCallback((controlId) => dispatch({ type: 'TOGGLE_CONTROL', controlId }), []);
  const toggleCategoryControls = useCallback((controlIds, enable) => dispatch({ type: 'TOGGLE_CATEGORY_CONTROLS', controlIds, enable }), []);
  const setMaturity = useCallback((controlId, level) => dispatch({ type: 'SET_MATURITY', controlId, level }), []);
  const toggleActor = useCallback((actorId) => dispatch({ type: 'TOGGLE_ACTOR', actorId }), []);
  const toggleTheme = useCallback(() => dispatch({ type: 'SET_THEME', theme: state.theme === 'dark' ? 'light' : 'dark' }), [state.theme]);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <AppContext.Provider value={{
      state,
      setPage,
      toggleTheme,
      toggleControl,
      toggleCategoryControls,
      setMaturity,
      toggleActor,
      uploadRuleFile,
      addManualRule,
      removeRule,
      runAnalysis,
      loadAnalysis,
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