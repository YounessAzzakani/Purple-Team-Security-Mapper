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
    ALL_CONTROLS,
    MITIGATIONS,
    TACTIC_MAP,
    TACTICS,
    TECHNIQUE_MAP,
    TECHNIQUES,
    get_technique_intel,
)

MATURITY_MULT = {"basic": 0.5, "intermediate": 0.75, "advanced": 1.0}


def _jround(x: float) -> int:
    """JS Math.round() equivalent (round-half-up, positive values)."""
    return int(math.floor(x + 0.5))


def _rule_covers(rule: dict, technique_id: str) -> bool:
    for tid in rule["techniques"]:
        if tid == technique_id:
            return True
        if technique_id == tid.split(".")[0] and "." in tid:
            return True
        if tid == technique_id.split(".")[0] and "." in technique_id:
            return True
    return False


def compute_score(technique_id: str, enabled_controls: list, control_maturity: dict, detection_rules: list) -> dict:
    """Mirror of JS computeScore()."""
    covering_rules = [
        rule
        for rule in detection_rules
        if rule.get("source") != "threat-actor" and _rule_covers(rule, technique_id)
    ]

    rules_score = 0
    for rule in covering_rules:
        is_exact_match = technique_id in rule["techniques"]
        level_mult = {"critical": 1.0, "high": 0.85, "medium": 0.7, "low": 0.5}.get(rule.get("level"), 0.7)
        match_mult = 1.0 if is_exact_match else 0.6
        rules_score += 18 * level_mult * match_mult
    rules_score = min(40, _jround(rules_score))

    covering_controls = [
        ctrl
        for ctrl in ALL_CONTROLS
        if ctrl["id"] in enabled_controls
        and (
            technique_id in ctrl["coveredTechniques"]
            or technique_id.split(".")[0] in ctrl["coveredTechniques"]
        )
    ]

    preventive_controls = [c for c in covering_controls if c["type"] == "preventive"]
    detective_controls = [c for c in covering_controls if c["type"] == "detective"]
    corrective_controls = [c for c in covering_controls if c["type"] == "corrective"]

    preventive_score = 0
    for ctrl in preventive_controls:
        s = 30 * MATURITY_MULT.get(control_maturity.get(ctrl["id"]), 0.5)
        if s > preventive_score:
            preventive_score = s

    detective_score = 0
    for ctrl in detective_controls:
        s = 20 * MATURITY_MULT.get(control_maturity.get(ctrl["id"]), 0.5)
        if s > detective_score:
            detective_score = s

    corrective_bonus = 0
    if corrective_controls:
        first = corrective_controls[0]
        corrective_bonus = min(10, len(corrective_controls) * 5 * MATURITY_MULT.get(control_maturity.get(first["id"]), 0.5))

    total = min(100, _jround(rules_score + preventive_score + detective_score + corrective_bonus))

    return {
        "total": total,
        "rulesScore": rules_score,
        "preventiveScore": _jround(preventive_score),
        "detectiveScore": _jround(detective_score),
        "correctiveBonus": _jround(corrective_bonus),
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

    for rule in detection_rules:
        if rule.get("source") == "threat-actor":
            continue
        for tid in rule["techniques"]:
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


def run_gap_analysis(enabled_controls: list, control_maturity: dict, detection_rules: list, selected_actors: list = None) -> dict:
    """Mirror of JS runGapAnalysis()."""
    if selected_actors is None:
        selected_actors = []

    dynamic_techniques = register_dynamic_techniques(detection_rules)
    all_techniques = [*TECHNIQUES, *dynamic_techniques]

    technique_scores = {}
    for technique in all_techniques:
        r = compute_score(technique["id"], enabled_controls, control_maturity, detection_rules)
        technique_scores[technique["id"]] = {
            **technique,
            "score": r["total"],
            "level": get_coverage_level(r["total"]),
            "rulesScore": r["rulesScore"],
            "preventiveScore": r["preventiveScore"],
            "detectiveScore": r["detectiveScore"],
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

    root_techniques = [t for t in all_techniques if not t.get("parent")]
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

    own_rules = [r for r in detection_rules if r.get("source") != "threat-actor"]
    unique_techs_from_rules = set()
    for r in own_rules:
        for t in r["techniques"]:
            unique_techs_from_rules.add(t)

    input_analysis = {
        "totalRules": len(own_rules),
        "uniqueTechniquesFromRules": len(unique_techs_from_rules),
        "totalControlsEnabled": len(enabled_controls),
        "dynamicTechniquesAdded": len(dynamic_techniques),
        "ruleOnlyCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] > 0 and ts["preventiveScore"] == 0 and ts["detectiveScore"] == 0
        ]),
        "controlOnlyCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] == 0 and (ts["preventiveScore"] > 0 or ts["detectiveScore"] > 0)
        ]),
        "fullCoverage": len([
            t for t in root_techniques
            if (ts := technique_scores[t["id"]]) and ts["rulesScore"] > 0 and (ts["preventiveScore"] > 0 or ts["detectiveScore"] > 0)
        ]),
    }

    actor_analysis = []
    for actor_id in selected_actors:
        actor = ACTOR_MAP.get(actor_id)
        if not actor:
            continue
        actor_techs = [technique_scores[tid] for tid in actor["techniques"] if tid in technique_scores]
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
        "selectedActors": selected_actors,
        "inputAnalysis": input_analysis,
    }


def get_recommendations(technique: dict, technique_score: dict) -> list:
    """Mirror of JS getRecommendations()."""
    intel = get_technique_intel(technique["id"])
    recs = []

    if technique_score["rulesScore"] == 0:
        recs.append({
            "type": "detection",
            "priority": "critical",
            "title": f"Créer une règle de détection pour {technique['id']} — {technique['name']}",
            "description": intel.get("sigmaGuidance", ""),
            "effort": "Priorité haute" if intel.get("detectionPriority") == "critical" else "Priorité moyenne",
            "dataSources": intel.get("dataSources", []),
        })

    if technique_score["preventiveScore"] == 0:
        relevant = [
            MITIGATIONS[mid]
            for mid in intel.get("mitigations", [])
            if mid in MITIGATIONS
            and mid in {"M1038", "M1032", "M1030", "M1050", "M1051", "M1049", "M1021", "M1022", "M1026", "M1027", "M1028", "M1034", "M1035", "M1037", "M1057"}
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

    if technique_score["rulesScore"] == 0 and (technique_score["preventiveScore"] > 0 or technique_score["detectiveScore"] > 0):
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

    if technique_score["rulesScore"] > 0 and technique_score["preventiveScore"] == 0:
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

    # JS quirk preserved: _maturityMap is never set, so every covering control
    # counts as "low maturity".
    if technique_score["coveringControls"] and technique_score["score"] > 0 and technique_score["score"] < 50:
        recs.append({
            "type": "improvement",
            "priority": "low",
            "title": f"Augmenter la maturité des contrôles pour {technique['name']}",
            "description": (
                f"{len(technique_score['coveringControls'])} contrôle(s) en niveau \"Basique\". "
                "Passer au niveau Intermédiaire ou Avancé augmenterait significativement le score."
            ),
            "effort": "Faible",
        })

    if intel.get("mitigations") and not recs and technique_score["score"] < 80:
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