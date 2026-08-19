"""Coverage Engine v2 — 1:1 port of src/services/coverageEngine.js (Python backend).

Parity contract: for identical inputs, run_gap_analysis() must produce the same
outputs as the JS runGapAnalysis() (see tests/test_golden_parity.py).

Key fidelity notes:
- JS Math.round() rounds half up; Python round() uses banker's rounding, so all
  rounding goes through _jround() (floor(x + 0.5)).
- The JS engine reads rule.level with an else-default of 0.7 and never validates
  the level value; mirrored as-is.
"""

import math

from .data_loader import (
    ACTOR_MAP,
    MITIGATIONS,
    TACTIC_MAP,
    TACTICS,
    TECHNIQUE_MAP,
    TECHNIQUES,
    get_technique_intel,
)

SOLUTION_MITIGATION_MAP = {
    "Endpoint & EDR": ["M1049", "M1040", "M1038", "M1050", "M1028", "M1022", "M1024", "M1034"],
    "Network & Firewall": ["M1037", "M1031", "M1030", "M1020", "M1035"],
    "Application Security": ["M1056", "M1021", "M1048", "M1054"],
    "Identity & Access": ["M1032", "M1026", "M1027", "M1036", "M1018", "M1015"],
    "Cloud Security": ["M1032", "M1026", "M1047", "M1056", "M1018"],
    "Email Security": ["M1021", "M1049", "M1017"],
    "Data Security": ["M1057", "M1053"],
    "SIEM & Analytics": ["M1047", "M1019"],
}

SOLUTION_TACTIC_MAP = {
    "Endpoint & EDR": ["TA0002", "TA0003", "TA0004", "TA0005", "TA0006", "TA0007", "TA0008", "TA0040", "execution", "persistence", "privilege-escalation", "defense-evasion", "credential-access", "discovery", "lateral-movement", "impact"],
    "Network & Firewall": ["TA0001", "TA0008", "TA0010", "TA0011", "initial-access", "lateral-movement", "exfiltration", "command-and-control"],
    "SIEM & Analytics": ["TA0001", "TA0002", "TA0003", "TA0004", "TA0005", "TA0006", "TA0007", "TA0008", "TA0009", "TA0010", "TA0011", "TA0040"],
    "Cloud Security": ["TA0001", "TA0003", "TA0004", "TA0006", "TA0007", "TA0008", "TA0010", "initial-access", "persistence", "privilege-escalation", "credential-access", "discovery", "lateral-movement", "exfiltration"],
    "Application Security": ["TA0001", "TA0002", "TA0005", "initial-access", "execution", "defense-evasion"],
    "Identity & Access": ["TA0001", "TA0003", "TA0004", "TA0006", "TA0008", "initial-access", "persistence", "privilege-escalation", "credential-access", "lateral-movement"],
    "Email Security": ["TA0001", "initial-access"],
    "Data Security": ["TA0009", "TA0010", "TA0040", "collection", "exfiltration", "impact"],
}


def _jround(x: float) -> int:
    """JS Math.round() equivalent (round-half-up, positive values)."""
    return int(math.floor(x + 0.5))


def _rule_covers(rule: dict, technique_id: str) -> bool:
    for tid in rule.get("techniques", []):
        if tid == technique_id:
            return True
        if technique_id == tid.split(".")[0] and "." in tid:
            return True
        if tid == technique_id.split(".")[0] and "." in technique_id:
            return True
    return False


def compute_score(
    technique_or_id: dict | str,
    detection_rules: list = None,
    security_solutions: list = None,
    detection_methods: list = None,
) -> dict:
    """Computes a technique score (0-100) combining rules, solutions, and detection methods."""
    if detection_rules is None:
        detection_rules = []
    if security_solutions is None:
        security_solutions = []
    if detection_methods is None:
        detection_methods = []

    if isinstance(technique_or_id, str):
        technique_id = technique_or_id
        technique_obj = TECHNIQUE_MAP.get(technique_id, {"id": technique_id, "tactic": "TA0002"})
    else:
        technique_id = technique_or_id["id"]
        technique_obj = technique_or_id

    tactic_id = technique_obj.get("tactic", "TA0002")
    intel = get_technique_intel(technique_id) or {"mitigations": [], "dataSources": []}

    # 1. ── Detection Rules Score ──
    covering_rules = [
        rule
        for rule in detection_rules
        if rule.get("source") != "threat-actor" and _rule_covers(rule, technique_id)
    ]

    rules_raw = 0
    for rule in covering_rules:
        is_exact_match = technique_id in rule.get("techniques", [])
        level_mult = {"critical": 1.0, "high": 0.85, "medium": 0.7, "low": 0.5}.get(rule.get("level"), 0.7)
        match_mult = 1.0 if is_exact_match else 0.6
        rules_raw += 100 * level_mult * match_mult

    rules_score = min(100, _jround(rules_raw))

    # 2. ── Security Solutions (Preventive Controls) ──
    covering_controls = []
    preventive_raw = 0

    active_solutions = [s for s in security_solutions if s and s.get("enabled") is not False]
    for sol in active_solutions:
        cat = sol.get("category", "Endpoint & EDR")
        is_enforcing = not sol.get("status") or sol.get("status") == "enforcing"
        if not is_enforcing:
            continue

        supp_mits = SOLUTION_MITIGATION_MAP.get(cat, [])
        overlap_mits = [m for m in supp_mits if m in intel.get("mitigations", [])]
        supp_tactics = SOLUTION_TACTIC_MAP.get(cat, [])
        tactic_match = tactic_id in supp_tactics

        if overlap_mits:
            preventive_raw += 50 * min(2, len(overlap_mits))
            covering_controls.append({
                "id": sol.get("id"),
                "name": sol.get("name"),
                "type": "Preventive Solution",
                "categoryName": cat,
                "details": f"Mitigates via {', '.join(overlap_mits)}",
            })
        elif tactic_match:
            preventive_raw += 35
            covering_controls.append({
                "id": sol.get("id"),
                "name": sol.get("name"),
                "type": "Preventive Solution",
                "categoryName": cat,
                "details": "Covers tactic domain",
            })

    preventive_score = min(100, _jround(preventive_raw))

    # 3. ── Detection Methods (Detective Telemetry) ──
    methods_raw = 0
    active_methods = [m for m in detection_methods if m and m.get("enabled") is not False]
    for method in active_methods:
        method_tactics = [str(t).lower() for t in method.get("tactics", [])]
        tac_obj = TACTIC_MAP.get(tactic_id)
        tac_short = tac_obj["shortName"].lower() if tac_obj else ""
        tac_name = tac_obj["name"].lower() if tac_obj else ""

        tactic_matches = (
            tactic_id.lower() in method_tactics
            or (tac_short and tac_short in method_tactics)
            or (tac_name and tac_name in method_tactics)
        )

        if tactic_matches:
            conf_mult = {"High": 1.0, "Medium": 0.75, "Low": 0.5}.get(method.get("confidence"), 0.75)
            intel_ds = [ds.lower() for ds in intel.get("dataSources", [])]
            method_ds = [ds.lower() for ds in method.get("dataSources", [])]
            ds_overlap = any(
                any(ids in mds or mds in ids for ids in intel_ds)
                for mds in method_ds
            )
            fid_mult = 1.25 if ds_overlap else 1.0
            methods_raw += 40 * conf_mult * fid_mult

            covering_controls.append({
                "id": method.get("id"),
                "name": method.get("name"),
                "type": "Detection Method",
                "categoryName": method.get("type", "Detection Telemetry"),
                "details": f"Confidence: {method.get('confidence', 'Medium')}{' · Matched Data Source' if ds_overlap else ''}",
            })

    methods_score = min(100, _jround(methods_raw))

    # 4. ── Combined Detective & Overall Posture Score ──
    if rules_score > 0 and methods_score > 0:
        detective_score = min(100, _jround(rules_score * 0.6 + methods_score * 0.4))
    elif rules_score > 0:
        detective_score = rules_score
    else:
        detective_score = methods_score

    if rules_score > 0 and (preventive_score > 0 or methods_score > 0):
        total = min(100, _jround(rules_score * 0.40 + preventive_score * 0.30 + methods_score * 0.30))
    elif rules_score > 0:
        total = min(100, _jround(rules_score * 0.75))
    elif preventive_score > 0 or methods_score > 0:
        total = min(100, _jround(preventive_score * 0.50 + methods_score * 0.50))
    else:
        total = 0

    return {
        "total": total,
        "rulesScore": rules_score,
        "preventiveScore": preventive_score,
        "detectiveScore": detective_score,
        "methodsScore": methods_score,
        "correctiveBonus": 0,
        "coveringControls": covering_controls,
        "coveringRules": covering_rules,
    }


def get_coverage_level(score: int) -> str:
    if score == 0:
        return "none"
    if score <= 30:
        return "low"
    if score <= 60:
        return "medium"
    return "high"


def get_coverage_level_label(score: int) -> str:
    if score == 0:
        return "Aucune couverture"
    if score <= 30:
        return "Faible couverture"
    if score <= 60:
        return "Couverture partielle"
    return "Bonne couverture"


def get_coverage_level_color(score: int) -> str:
    if score == 0:
        return "var(--coverage-none)"
    if score <= 30:
        return "var(--coverage-low)"
    if score <= 60:
        return "var(--coverage-medium)"
    return "var(--coverage-high)"


def register_dynamic_techniques(detection_rules: list) -> list:
    """Mirror of JS registerDynamicTechniques()."""
    dynamic = []
    all_known_ids = {t["id"] for t in TECHNIQUES}

    for rule in detection_rules or []:
        if rule.get("source") == "threat-actor":
            continue
        for tid in rule.get("techniques", []):
            if tid not in all_known_ids:
                parent_id = tid.split(".")[0]
                parent = TECHNIQUE_MAP.get(parent_id)
                dynamic.append({
                    "id": tid,
                    "name": f"{parent['name'] if parent else 'Unknown'} ({tid})",
                    "tactic": parent["tactic"] if parent else "TA0002",
                    "platforms": parent["platforms"] if parent else ["Windows"],
                    "prevalence": parent["prevalence"] if parent else 50,
                    "parent": parent_id if "." in tid else None,
                    "_dynamic": True,
                })
                all_known_ids.add(tid)

    return dynamic


def run_gap_analysis(
    arg1=None,
    arg2=None,
    arg3=None,
    arg4=None,
    *,
    detection_rules=None,
    selected_actors=None,
    security_solutions=None,
    detection_methods=None,
) -> dict:
    """Run gap analysis on detection rules, security solutions, and detection methods."""
    # Handle keyword arguments
    if detection_rules is not None:
        rules = detection_rules
        actors = selected_actors or []
        solutions = security_solutions or []
        methods = detection_methods or []
    # Legacy positional signature: (enabled_controls, control_maturity, detection_rules, selected_actors)
    elif isinstance(arg1, list) and isinstance(arg2, dict) and isinstance(arg3, list):
        rules = arg3
        actors = arg4 or []
        solutions = []
        methods = []
    # New positional signature: (detection_rules, selected_actors, security_solutions, detection_methods)
    elif isinstance(arg1, list):
        rules = arg1
        actors = arg2 or []
        solutions = arg3 or []
        methods = arg4 or []
    else:
        rules = []
        actors = []
        solutions = []
        methods = []

    dynamic_techniques = register_dynamic_techniques(rules)
    all_techniques = [*TECHNIQUES, *dynamic_techniques]

    technique_scores = {}
    for technique in all_techniques:
        r = compute_score(technique, rules, solutions, methods)
        technique_scores[technique["id"]] = {
            **technique,
            "score": r["total"],
            "level": get_coverage_level(r["total"]),
            "rulesScore": r["rulesScore"],
            "preventiveScore": r["preventiveScore"],
            "detectiveScore": r["detectiveScore"],
            "methodsScore": r.get("methodsScore", 0),
            "correctiveBonus": r["correctiveBonus"],
            "coveringControls": r["coveringControls"],
            "coveringRules": r["coveringRules"],
        }

    tactic_summary = {}
    for tactic in TACTICS:
        roots = [t for t in all_techniques if t["tactic"] == tactic["id"] and not t.get("parent")]
        scores = [technique_scores[t["id"]]["score"] for t in roots]
        avg = _jround(sum(scores) / len(scores)) if scores else 0
        covered = len([s for s in scores if s > 30])
        tactic_summary[tactic["id"]] = {
            **tactic,
            "averageScore": avg,
            "totalTechniques": len(roots),
            "coveredTechniques": covered,
            "coveragePercent": _jround((covered / len(roots)) * 100) if roots else 0,
        }

    # Dedupe root techniques by id
    seen_root_ids = set()
    root_techniques = []
    for t in all_techniques:
        if not t.get("parent") and t["id"] not in seen_root_ids:
            seen_root_ids.add(t["id"])
            root_techniques.append(t)

    gaps = []
    for t in root_techniques:
        ts = technique_scores[t["id"]]
        priority = _jround((t.get("prevalence") or 50) * (1 - (ts["score"] or 0) / 100))
        gaps.append({**ts, "priority": priority})
    gaps = [g for g in gaps if g["score"] < 61]
    gaps.sort(key=lambda g: g["priority"], reverse=True)

    critical_gaps = [g for g in gaps if g["score"] == 0]
    weak_gaps = [g for g in gaps if 0 < g["score"] <= 30]
    partial_gaps = [g for g in gaps if 30 < g["score"] < 61]

    total_weight = sum((t.get("prevalence") or 50) for t in root_techniques)
    weighted_sum = sum(
        (technique_scores[t["id"]]["score"] or 0) * (t.get("prevalence") or 50)
        for t in root_techniques
    )
    posture_score = _jround(weighted_sum / total_weight) if total_weight else 0

    own_rules = [r for r in rules if r.get("source") != "threat-actor"]
    unique_techs_from_rules = set()
    for r in own_rules:
        for t in r.get("techniques", []):
            unique_techs_from_rules.add(t)

    active_solutions_count = len([s for s in solutions if s and s.get("enabled") is not False])
    active_methods_count = len([m for m in methods if m and m.get("enabled") is not False])

    input_analysis = {
        "totalRules": len(own_rules),
        "uniqueTechniquesFromRules": len(unique_techs_from_rules),
        "totalControlsEnabled": active_solutions_count + active_methods_count,
        "totalSolutions": active_solutions_count,
        "totalMethods": active_methods_count,
        "dynamicTechniquesAdded": len(dynamic_techniques),
        "ruleOnlyCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] > 0 and ts["preventiveScore"] == 0 and ts.get("methodsScore", 0) == 0
        ]),
        "controlOnlyCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] == 0 and (ts["preventiveScore"] > 0 or ts.get("methodsScore", 0) > 0)
        ]),
        "fullCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] > 0 and (ts["preventiveScore"] > 0 or ts.get("methodsScore", 0) > 0)
        ]),
    }

    actor_analysis = []
    for actor_id in actors:
        actor = ACTOR_MAP.get(actor_id)
        if not actor:
            continue
        actor_techs = [technique_scores[tid] for tid in actor.get("techniques", []) if tid in technique_scores]
        covered = len([ts for ts in actor_techs if ts["score"] > 30])
        avg_score = _jround(sum(ts["score"] for ts in actor_techs) / len(actor_techs)) if actor_techs else 0
        actor_gaps = [
            {**ts, "priority": ts.get("prevalence") or 50}
            for ts in actor_techs if ts["score"] == 0
        ]
        actor_analysis.append({
            "actor": actor,
            "totalTechniques": len(actor_techs),
            "coveredTechniques": covered,
            "coveragePercent": _jround((covered / len(actor_techs)) * 100) if actor_techs else 0,
            "averageScore": avg_score,
            "gaps": actor_gaps,
        })

    return {
        "techniqueScores": technique_scores,
        "tacticSummary": tactic_summary,
        "gaps": gaps,
        "criticalGaps": critical_gaps,
        "weakGaps": weak_gaps,
        "partialGaps": partial_gaps,
        "postureScore": posture_score,
        "totalTechniques": len(root_techniques),
        "coveredCount": len([t for t in root_techniques if (technique_scores[t["id"]]["score"] or 0) > 30]),
        "wellCoveredCount": len([t for t in root_techniques if (technique_scores[t["id"]]["score"] or 0) > 60]),
        "actorAnalysis": actor_analysis,
        "selectedActors": actors,
        "inputAnalysis": input_analysis,
    }


def get_recommendations(technique: dict, technique_score: dict) -> list:
    """Mirror of JS getRecommendations()."""
    intel = get_technique_intel(technique["id"]) or {"mitigations": [], "dataSources": []}
    recs = []

    if technique_score.get("rulesScore", 0) == 0:
        recs.append({
            "type": "detection",
            "priority": "critical",
            "title": f"Créer une règle de détection pour {technique['id']} — {technique['name']}",
            "description": intel.get("sigmaGuidance", ""),
            "effort": "Priorité haute" if intel.get("detectionPriority") == "critical" else "Priorité moyenne",
            "dataSources": intel.get("dataSources", []),
        })

    if technique_score.get("preventiveScore", 0) == 0:
        relevant = [
            MITIGATIONS[mid]
            for mid in intel.get("mitigations", [])
            if mid in MITIGATIONS
            and mid in {"M1049", "M1038", "M1032", "M1030", "M1050", "M1051", "M1049", "M1021", "M1022", "M1026", "M1027", "M1028", "M1034", "M1035", "M1037", "M1057"}
        ]
        if relevant:
            recs.append({
                "type": "control",
                "priority": "high",
                "title": f"Implémenter un contrôle préventif pour {technique['name']}",
                "description": "\n".join(f"• {m['name']} — {m['desc']}" for m in relevant),
                "effort": "Élevé" if len(relevant) > 2 else "Moyen",
                "mitigations": relevant,
            })

    if technique_score.get("rulesScore", 0) == 0 and (technique_score.get("preventiveScore", 0) > 0 or technique_score.get("methodsScore", 0) > 0):
        recs.append({
            "type": "detection",
            "priority": "medium",
            "title": f"Ajouter une détection spécifique pour {technique['name']}",
            "description": (
                "Des contrôles sont en place mais aucune règle de détection ne cible cette technique. "
                f"En cas de contournement du contrôle, il n'y a aucune alerte. Sources recommandées : {', '.join(intel.get('dataSources', []))}."
            ),
            "effort": "Moyen",
            "dataSources": intel.get("dataSources", []),
        })

    if technique_score.get("rulesScore", 0) > 0 and technique_score.get("preventiveScore", 0) == 0:
        preventive_mits = [
            MITIGATIONS[mid]
            for mid in intel.get("mitigations", [])
            if mid in MITIGATIONS
        ][:2]
        if preventive_mits:
            recs.append({
                "type": "control",
                "priority": "medium",
                "title": f"Compléter avec un contrôle préventif pour {technique['name']}",
                "description": (
                    "La détection est en place, mais aucun contrôle ne bloque proactivement cette technique. "
                    f"Considérer : {', '.join(m['name'] for m in preventive_mits)}."
                ),
                "effort": "Moyen",
                "mitigations": preventive_mits,
            })

    if intel.get("mitigations") and not recs and technique_score.get("score", 0) < 80:
        all_mits = [MITIGATIONS[mid] for mid in intel["mitigations"] if mid in MITIGATIONS]
        recs.append({
            "type": "improvement",
            "priority": "low",
            "title": f"Renforcer la couverture de {technique['name']}",
            "description": f"Mitigations MITRE applicables : {', '.join(m['name'] for m in all_mits)}.",
            "effort": "Variable",
            "mitigations": all_mits,
        })

    return recs