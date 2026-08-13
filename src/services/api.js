// ============================================================
// API client — talks to the FastAPI backend (backend/app/main.py)
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN = import.meta.env.VITE_API_TOKEN || 'dev-token';

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${TOKEN}`, ...extra };
}

async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_URL}${path}`, { ...options, headers: authHeaders(options.headers) });
  if (!resp.ok) {
    let detail = `Server error (${resp.status})`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  const contentType = resp.headers.get('content-type') || '';
  return contentType.includes('application/json') ? resp.json() : resp;
}

// ── SOC Rules ──
export const getRules = () => apiFetch('/api/rules');
export const uploadRuleFile = (file) => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch('/api/rules/upload', { method: 'POST', body: form, headers: {} }); // no manual auth header — FormData sets its own
};
export const createManualRule = (payload) => apiFetch('/api/rules/manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const deleteRule = (id) => apiFetch(`/api/rules/${id}`, { method: 'DELETE' });

// ── Analysis API ──
export const runAnalysis = (payload) => apiFetch('/api/analyses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const listAnalyses = () => apiFetch('/api/analyses');
export const getAnalysis = (id) => apiFetch(`/api/analyses/${id}`);
export const compareAnalyses = (id, baseId) => apiFetch(`/api/analyses/${id}/compare?base=${baseId}`);
export const runSimulation = (analysisId, actorIds, opts = {}) => apiFetch(`/api/analyses/${analysisId}/simulate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ actor_ids: actorIds, runs: opts.runs ?? 200, seed: opts.seed ?? null }),
});

// ── Exports (blob download) ──
export async function downloadBlob(urlPath, filename) {
  const resp = await fetch(`${API_URL}${urlPath}`, { headers: authHeaders() });
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadAnalysisExport(analysisId, format) {
  await downloadBlob(
    `/api/analyses/${analysisId}/export/${format}`,
    `purple-team-analysis-${analysisId}.${format === 'csv' ? 'csv' : 'json'}`,
  );
}

export async function downloadSimulationCsv(analysisId, actorIds, opts = {}) {
  const params = new URLSearchParams({
    actors: actorIds.join(','),
    runs: String(opts.runs ?? 200),
  });
  if (opts.seed != null) params.set('seed', String(opts.seed));
  await downloadBlob(`/api/analyses/${analysisId}/simulation.csv?${params}`, `ptm-simulation-${analysisId}.csv`);
}