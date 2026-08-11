import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as api from '../services/api';

const AppContext = createContext(null);

const STORAGE_KEY = 'purple-team-mapper-state';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

const initialState = {
  currentStep: -1,          // -1 = landing page
  enabledControls: [],
  controlMaturity: {},
  detectionRules: [],       // SOC rules from the backend (int ids)
  selectedActors: [],
  analysisResult: null,     // full engine result (from the backend)
  analysisMeta: null,       // { id, name, created_at, posture_score, ... }
  analysesHistory: [],      // past analyses summaries
  lastAnalyzed: null,
  loading: false,           // an API call is in flight
  apiError: null,
};

function buildInitialState() {
  const stored = loadFromStorage();
  if (!stored) return { ...initialState, currentStep: -1 };
  return {
    ...initialState,
    currentStep: typeof stored.currentStep === 'number' ? stored.currentStep : -1,
    enabledControls: stored.enabledControls || [],
    controlMaturity: stored.controlMaturity || {},
    selectedActors: stored.selectedActors || [],
  };
}

function reducer(state, action) {
  switch (action.type) {
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
      return { ...state, detectionRules: action.rules, apiError: null };
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
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'RESET':
      localStorage.removeItem(STORAGE_KEY);
      return {
        ...initialState,
        currentStep: -1,
        detectionRules: state.detectionRules,   // SOC rules stay in the backend
        analysesHistory: state.analysesHistory,
        analysisResult: null,
        analysisMeta: null,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Persist session inputs (rules live server-side)
  useEffect(() => {
    const toSave = {
      currentStep: state.currentStep,
      enabledControls: state.enabledControls,
      controlMaturity: state.controlMaturity,
      selectedActors: state.selectedActors,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.currentStep, state.enabledControls, state.controlMaturity, state.selectedActors]);

  // Bootstrap: load SOC rules + analysis history + restore the latest analysis
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
          if (!cancelled) {
            dispatch({ type: 'SET_ANALYSIS', result: full.result, meta: full.analysis });
          }
        }
      } catch (err) {
        if (!cancelled) dispatch({ type: 'SET_API_ERROR', error: err.message });
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        name: `Analyse du ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
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

  const toggleControl = useCallback((controlId) => dispatch({ type: 'TOGGLE_CONTROL', controlId }), []);
  const toggleCategoryControls = useCallback((controlIds, enable) => dispatch({ type: 'TOGGLE_CATEGORY_CONTROLS', controlIds, enable }), []);
  const setMaturity = useCallback((controlId, level) => dispatch({ type: 'SET_MATURITY', controlId, level }), []);
  const toggleActor = useCallback((actorId) => dispatch({ type: 'TOGGLE_ACTOR', actorId }), []);
  const setStep = useCallback((step) => dispatch({ type: 'SET_STEP', step }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <AppContext.Provider value={{
      state,
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
      setStep,
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