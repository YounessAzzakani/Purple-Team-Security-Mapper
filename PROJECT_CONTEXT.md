# Purple Team Mapper — Project Context

> **Purpose of this file:** Complete context snapshot to resume work in a new chat session.

---

## 1. Project Overview

**Purple Team Mapper** is a web-based cybersecurity tool for SOC/Purple Team analysts.

### Core Concept
The user provides two types of inputs:
1. **Security controls** deployed in their infrastructure (EDR, SIEM, MFA, WAF, etc.)
2. **Detection rules** already written (Sigma YAML files or ATT&CK Navigator JSON layers)

The platform analyses these inputs against the **MITRE ATT&CK Enterprise v15** framework and outputs:
- A coverage heatmap (which techniques are covered vs. exposed)
- A prioritised gap list (what the SOC is missing)
- Per-technique recommendations (what Sigma rules to write, what controls to add)
- Threat-actor-aware analysis (e.g. "how covered are you vs. APT28?")
- Export to ATT&CK Navigator JSON and CSV

### Workflow (3 steps)
```
Step 1: Security Controls Input
  → User toggles which controls are deployed (EDR, SIEM, MFA, etc.)
  → Sets maturity level per control: Basic / Intermediate / Advanced

Step 2: Detection Rules Input
  → Import Sigma YAML files (single or multi-document)
  → Import ATT&CK Navigator JSON layers
  → Add manual rules
  → Select threat actor profiles (APT28, LockBit, etc.)

Step 3: Dashboard (Results)
  → 4-tab layout: Overview | ATT&CK Matrix | Gaps | Threat Actors
  → Score breakdown per technique
  → Export buttons
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Charts | Recharts 3 |
| Styling | Vanilla CSS (custom design system in `index.css`) |
| YAML parsing | js-yaml (for Sigma files) |
| State | React Context + useReducer + localStorage persistence |
| Dev server | `npm run dev` → http://localhost:5173 |

**Run command:**
```bash
cd "c:\Users\youne\Documents\PFE 2026\Purple Team Mapper"
npm run dev -- --port 5173
```

---

## 3. File Structure

```
Purple Team Mapper/
├── src/
│   ├── main.jsx                        # Entry point
│   ├── App.jsx                         # Shell + AppProvider + wizard nav
│   ├── index.css                       # Full design system (~1480 lines)
│   ├── App.css                         # Legacy boilerplate (unused)
│   │
│   ├── context/
│   │   └── AppContext.jsx              # Global state (useReducer)
│   │
│   ├── data/
│   │   ├── attackData.js               # MITRE ATT&CK v15 (~150 techniques, 12 tactics)
│   │   ├── controlMappings.js          # 33 security controls → technique mappings (v2)
│   │   ├── mitigationsData.js          # Per-technique mitigations, data sources, Sigma guidance (70+ entries)
│   │   └── threatActors.js             # 8 APT profiles + ACTOR_MAP
│   │
│   ├── services/
│   │   ├── coverageEngine.js           # Core analysis engine (v2 — dynamic)
│   │   └── sigmaParser.js              # Sigma YAML + Navigator JSON parsers + export functions
│   │
│   └── components/
│       ├── SecurityControlsInput.jsx   # Step 1: control toggles + maturity selectors
│       ├── DetectionRulesInput.jsx     # Step 2: file import + manual rules + actor selection
│       ├── Dashboard.jsx               # Step 3: 4-tab results dashboard
│       ├── AttackMatrix.jsx            # ATT&CK heatmap matrix
│       ├── TechniqueDetail.jsx         # Slide-in panel: score breakdown + recommendations
│       └── ThreatActorSelector.jsx     # APT group selection grid
│
├── test-samples/
│   ├── sigma_rules_sample.yml          # 10 realistic Sigma rules for testing
│   ├── navigator_layer_sample.json     # ATT&CK Navigator layer (20 techniques)
│   └── README.md                       # How to test the platform
│
└── package.json
```

---

## 4. State Model (`AppContext.jsx`)

```js
state = {
  currentStep: 0,           // 0=Controls, 1=Rules, 2=Dashboard
  enabledControls: [],      // Array of control IDs (e.g. ['edr', 'siem', 'mfa'])
  controlMaturity: {},      // { controlId: 'basic'|'intermediate'|'advanced' }
  detectionRules: [],       // Parsed Sigma/Navigator rules + manual entries
  selectedActors: [],       // Array of actor IDs (e.g. ['apt28', 'lockbit'])
  analysisResult: null,     // Output from runGapAnalysis()
  lastAnalyzed: null,       // ISO timestamp
}
```

**Actions:** `TOGGLE_CONTROL`, `TOGGLE_CATEGORY_CONTROLS`, `SET_MATURITY`, `ADD_RULES`, `REMOVE_RULE`, `ADD_MANUAL_RULE`, `TOGGLE_ACTOR`, `RUN_ANALYSIS`, `SET_STEP`, `RESET`

**Persistence:** `enabledControls`, `controlMaturity`, `detectionRules`, `selectedActors` are saved to `localStorage` under key `purple-team-mapper-state`.

---

## 5. Coverage Engine v2 (`coverageEngine.js`)

### Scoring Formula (per technique, max 100 pts)

| Component | Max Points | Source |
|---|---|---|
| Detection rules (Sigma/Navigator) | **40 pts** | User's imported rules |
| Preventive controls | **30 pts** | Control toggles × maturity |
| Detective controls | **20 pts** | Control toggles × maturity |
| Corrective/Response | **10 pts** | Backup, SOAR controls |

### Key behaviours
- **Rules are the PRIMARY signal** — importing a Sigma rule for T1059.001 raises that technique's score from 0 to up to 40
- **Sub-technique ↔ parent propagation** — a rule for T1059.001 also partially covers T1059, and vice versa (at 0.6× weight)
- **Dynamic technique registration** — if a Sigma rule references a technique not in the static dataset (e.g. T1574.002), it is automatically added to the analysis as a stub
- **Maturity multipliers:** Basic=0.5, Intermediate=0.75, Advanced=1.0

### Coverage levels (new thresholds)
```
0      → "Aucune couverture"   🔴
1–30   → "Faible couverture"   🟠
31–60  → "Couverture partielle" 🟡
61–100 → "Bonne couverture"    🟢
```

### `runGapAnalysis()` output
```js
{
  techniqueScores,      // { [techniqueId]: { score, level, rulesScore, preventiveScore, detectiveScore, correctiveBonus, coveringControls, coveringRules } }
  tacticSummary,        // Per-tactic aggregated stats
  gaps,                 // All techniques with score < 61, sorted by priority
  criticalGaps,         // score === 0
  weakGaps,             // score 1–30
  partialGaps,          // score 31–60
  postureScore,         // Weighted average across all techniques (by prevalence)
  totalTechniques,
  coveredCount,         // score > 30
  wellCoveredCount,     // score > 60
  actorAnalysis,        // Per-actor coverage breakdown
  selectedActors,
  inputAnalysis: {
    totalRules,
    uniqueTechniquesFromRules,
    totalControlsEnabled,
    dynamicTechniquesAdded,
    ruleOnlyCoverage,
    controlOnlyCoverage,
    fullCoverage,
  }
}
```

---

## 6. Data Files

### `controlMappings.js` — 8 categories, 33 controls
Each control has: `id`, `name`, `type` (preventive/detective/corrective), `coveredTechniques[]`

| Category | Controls |
|---|---|
| Email Security | SEG, Anti-Phishing, Sandboxing |
| Endpoint Security | **EDR** (50+ techniques), AV, App Whitelisting, Patch Mgmt, Host FW |
| Network Security | NGFW, IDS/IPS, Segmentation, DNS Filter, NDR, VPN/ZTNA |
| Identity & Access | MFA, PAM, SSO/IdP, Conditional Access |
| SIEM & Monitoring | SIEM, UEBA, Log Mgmt, SOAR |
| Cloud Security | CASB, CSPM, CWPP, WAF |
| Data Security | DLP, Encryption at Rest, Encryption in Transit, Backup |
| Vuln Management | Vuln Scanner, Pentest, Honeypots |

### `mitigationsData.js` — 70+ technique entries
Each entry has:
- `mitigations[]` — MITRE mitigation IDs (M1049, M1032, etc.) + names + descriptions
- `dataSources[]` — Specific event sources (e.g. "Sysmon EID 10", "Security Event 4698")
- `sigmaGuidance` — Specific Sigma rule writing guidance in French
- `detectionPriority` — critical/high/medium/low

### `attackData.js` — ATT&CK Enterprise v15
~150 techniques across 12 tactics. Each has: `id`, `name`, `tactic` (TA000X), `platforms[]`, `prevalence` (0-100), optional `parent`.

Exports: `TECHNIQUES`, `TACTICS`, `TECHNIQUE_MAP`, `TACTIC_MAP`, `TECHNIQUES_BY_TACTIC`, `SUBTECHNIQUES_BY_PARENT`

### `threatActors.js` — 8 APT profiles
APT28, APT29, APT41, Lazarus Group, LockBit, Scattered Spider, Volt Typhoon, FIN7

Each actor has: `id`, `name`, `aliases[]`, `origin`, `sector[]`, `description`, `techniques[]` (list of ATT&CK IDs)

Exports: `THREAT_ACTORS`, `ACTOR_MAP`

---

## 7. Sigma Parser (`sigmaParser.js`)

### `parseMultipleSigmaRules(content)` → `rules[]`
- Splits on `---` separators for multi-document YAML
- Extracts: `title`, `id`, `description`, `level`, `status`
- Extracts ATT&CK tags: `attack.tXXXX` or `attack.tXXXX.YYY` → stored in `techniques[]`

### `parseNavigatorLayer(jsonContent)` → `{ rules[], layerName }`
- Reads `layer.techniques[]` array
- Each entry with `enabled !== false` becomes a rule
- Maps `techniqueID` and `comment` to rule fields

### `generateNavigatorLayer(techniqueScores)` → JSON
- Produces an ATT&CK Navigator-compatible JSON layer from analysis results
- Techniques colored by coverage score

### `exportAsCSV(techniqueScores, tacticMap)` → CSV string

---

## 8. TechniqueDetail Panel

When the user clicks any cell in the ATT&CK matrix, a slide-in panel shows:

1. **Score gauge** (SVG ring)
2. **4-bar score breakdown:**
   - 🔍 Règles Sigma (0–40)
   - 🛡️ Contrôles préventifs (0–30)
   - 👁️ Contrôles détectifs (0–20)
   - 🔄 Correctif/Réponse (0–10)
3. **Diagnosis text** ("Why is this score X?")
4. **Platforms** + **Prevalence bar**
5. **📡 Data sources** from `mitigationsData.js`
6. **Active controls list** (with type + category)
7. **Covering rules list** (with "hérité" badge if inherited from parent/child)
8. **✏️ Sigma guidance** — specific rule writing instructions
9. **💡 Recommendations** — dynamic, priority-sorted, with MITRE mitigation IDs

---

## 9. Dashboard Tabs

| Tab | Content |
|---|---|
| 📊 Vue d'ensemble | Radar chart (by tactic) + Pie chart (distribution) + tactic table |
| 🗺️ Matrice ATT&CK | Full ATT&CK heatmap, clickable cells |
| ⚠️ Gaps | Critical (🔴) / Weak (🟠) / Partial (🟡) gap lists, sorted by priority |
| 🎯 Menaces | Per-actor coverage cards (only shown if actors selected) |

### KPI Cards
1. **Score de Posture Global** (weighted, 0–100)
2. **Gaps Critiques** (score = 0)
3. **Techniques Bien Couvertes** (score > 60)
4. **Règles Sigma importées** (with unique techniques covered, dynamic additions)

### Export buttons
- 📊 CSV → `exportAsCSV()`
- 🗺️ Navigator JSON → `generateNavigatorLayer()`

---

## 10. Test Files

Located in `test-samples/`:

**`sigma_rules_sample.yml`** — 10 rules covering:
- PowerShell encoded commands (T1059.001)
- Mimikatz/LSASS dump (T1003.001)
- Scheduled task persistence (T1053.005)
- Ransomware + VSS deletion (T1486, T1490)
- Brute force RDP (T1110.003)
- Data exfiltration cloud (T1567.002)
- Lateral movement SMB (T1021.002)
- Registry persistence (T1547.001)
- C2 via suspicious TLDs (T1071.001)
- PsExec/PTH (T1550.002)

**`navigator_layer_sample.json`** — 20 techniques with scores 25–80

---

## 11. Known Issues & Limitations

1. **ATT&CK dataset is curated (~150 techniques)** — full v15 has 200+ parents + 400+ sub-techniques. Unknown IDs from Sigma are dynamically added as stubs but won't have full metadata.

2. **Sigma parser is regex-based** — does not use a real YAML parser for tag extraction (works for standard Sigma format but may miss edge cases).

3. **No backend** — everything runs client-side. No authentication, no database. State is in localStorage only.

4. **French language** — all UI text, recommendations, and guidance are in French.

5. **No PDF export** — was planned but not yet implemented (originally in Phase 6 backlog).

6. **No landing/welcome page** — was planned but not yet implemented.

---

## 12. Pending Features (backlog)

- [ ] **PDF export** of the full gap analysis report
- [ ] **Landing/welcome page** before Step 1
- [ ] **Matrix search/filter** (filter cells by technique name or ID)
- [ ] **Expand sub-technique rows** in the matrix view
- [ ] **More Sigma rule templates** — button to auto-generate a starter Sigma rule for a gap

---

## 13. Design System Summary

- **Theme:** Dark purple (`#07070f` background, `#8b5cf6` purple accent)
- **Fonts:** Inter (UI) + JetBrains Mono (code/IDs)
- **Coverage colors:** 🔴 `#ef4444` / 🟠 `#f97316` / 🟡 `#eab308` / 🟢 `#22c55e`
- **Key CSS classes:** `.card`, `.stat-card`, `.badge-*`, `.btn-*`, `.detail-panel`, `.matrix-cell.coverage-*`, `.wizard-step`, `.detail-section-label`

---

## 14. How to Resume

```bash
# Start the dev server
cd "c:\Users\youne\Documents\PFE 2026\Purple Team Mapper"
npm run dev -- --port 5173
# Open http://localhost:5173
```

To test with real data:
1. Step 1 → Enable some controls (EDR + SIEM + MFA)
2. Step 2 → Import `test-samples/sigma_rules_sample.yml`
3. Click **"Lancer l'analyse →"**
4. Step 3 → Check that the KPI 4th card shows "X Règles Sigma importées"
5. Click any red matrix cell → verify 4-bar score breakdown appears
