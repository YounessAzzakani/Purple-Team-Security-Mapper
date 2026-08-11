"""Simulation de campagnes APT sur les résultats d'une analyse.

Modèle probabiliste simple, monotone et déterministe (graine):
- Chaque technique de la séquence d'un acteur (ordre MITRE ATT&CK) reçoit une
  probabilité de détection P(score), croissante avec le score de couverture.
- Un run Monte-Carlo avance étape par étape; la première technique détectée
  stoppe la campagne (le SOC intervient); aucune détection jusqu'au bout = succès.
- Les métriques agrégées (taux de succès, point de rupture, maillon faible)
  alimentent l'onglet "Attaques" du tableau de bord.
"""

import random
from typing import Optional

# Points d'ancrage de la courbe P(score) — interpolation linéaire par morceaux.
# score 0 (aucune couverture) -> bruit ambiant ~5%
# score 100 (couverture complète + règles) -> ~95%
_ANCHORS = ((0, 0.05), (25, 0.30), (50, 0.60), (75, 0.82), (100, 0.95))

# Seuil affichage du statut déterministe d'une étape
_DETECTED_THRESHOLD = 0.5

MAX_RUNS = 5000


def detection_probability(score: float) -> float:
    """Probabilité de détection d'une étape selon son score de couverture (0-100)."""
    score = max(0.0, min(100.0, float(score)))
    for i in range(len(_ANCHORS) - 1):
        x0, y0 = _ANCHORS[i]
        x1, y1 = _ANCHORS[i + 1]
        if x0 <= score <= x1:
            if score == x0:
                return y0
            return y0 + (y1 - y0) * (score - x0) / (x1 - x0)
    return _ANCHORS[-1][1]


def _intel_for(technique_id: str) -> dict:
    """Entrée technique_intel (fallback parent / générique inclus)."""
    from app.services.data_loader import get_technique_intel

    return get_technique_intel(technique_id)


def build_path(actor: dict, technique_scores: dict) -> list[dict]:
    """Séquence ordonnée des étapes d'un acteur, annotée des scores et du statut déterministe."""
    steps = []
    for tid in actor.get("techniques", []):
        ts = technique_scores.get(tid)
        score = float(ts["score"]) if ts else 0.0
        level = (ts or {}).get("level") or ("none" if score <= 0 else "low")
        prob = round(detection_probability(score), 3)
        intel = _intel_for(tid)
        steps.append(
            {
                "technique_id": tid,
                "technique_name": (ts or {}).get("name", tid),
                "tactic": (ts or {}).get("tactic", ""),
                "score": int(score),
                "coverage_level": level,
                "detection_probability": prob,
                "expected_status": "detected" if prob >= _DETECTED_THRESHOLD else "missed",
                "has_rule": bool((ts or {}).get("coveringRules")),
                "covering_controls": [c["name"] for c in (ts or {}).get("coveringControls", [])][:3],
                "rule_hint": (intel.get("sigmaGuidance") or "")[:160] if intel else "",
            }
        )
    return steps


def run_simulation(
    actor: dict,
    technique_scores: dict,
    runs: int = 200,
    seed: Optional[int] = None,
) -> dict:
    """Monte-Carlo déterministe d'une campagne.

    Retourne les étapes annotées + métriques agrégées:
    success_rate (aucune détection avant la fin), mean_reach (avancement moyen),
    chokepoint (étape la plus souvent détectée), weak_link (étape la plus sûre
    pour l'attaquant).
    """
    steps = build_path(actor, technique_scores)
    if not steps:
        raise ValueError(f"L'acteur {actor.get('id')} ne définit aucune technique")

    probabilities = [s["detection_probability"] for s in steps]
    n = len(steps)
    rng = random.Random(seed)
    clamped_runs = max(1, min(int(runs), MAX_RUNS))

    success = 0
    reach_sum = 0.0
    detected_counts = [0] * n
    reach_histogram = [0] * (n + 1)  # index = nombre d'étapes franchies

    for _ in range(clamped_runs):
        reached = 0
        halted = False
        for idx, prob in enumerate(probabilities):
            if rng.random() < prob:
                detected_counts[idx] += 1
                reached = idx + 1
                halted = True
                break
            reached = idx + 1
        if not halted:
            success += 1
        reach_sum += reached / n
        reach_histogram[reached] += 1

    detected_freq = [round(c / clamped_runs, 3) for c in detected_counts]
    chokepoint = None
    if n:
        best_idx = max(range(n), key=lambda i: detected_counts[i])
        if detected_counts[best_idx] > 0:
            chokepoint = {
                "technique_id": steps[best_idx]["technique_id"],
                "technique_name": steps[best_idx]["technique_name"],
                "detection_rate": detected_freq[best_idx],
                "score": steps[best_idx]["score"],
            }
    weak_link = None
    if n:
        worst_idx = min(range(n), key=lambda i: probabilities[i])
        weak_link = {
            "technique_id": steps[worst_idx]["technique_id"],
            "technique_name": steps[worst_idx]["technique_name"],
            "detection_probability": probabilities[worst_idx],
        }

    return {
        "actor_id": actor.get("id"),
        "actor_name": actor.get("name"),
        "runs": clamped_runs,
        "steps": steps,
        "success_rate": round(success / clamped_runs, 3),
        "mean_reach": round(reach_sum / clamped_runs, 3),
        "reach_histogram": reach_histogram,
        "chokepoint": chokepoint,
        "weak_link": weak_link,
    }


def simulate_actors(
    analysis_result: dict,
    actor_ids: list[str],
    runs: int = 200,
    seed: Optional[int] = None,
) -> list[dict]:
    """Simule une campagne par acteur demandé, dans son ordre de sélection."""
    from app.services.data_loader import ACTOR_MAP

    technique_scores = analysis_result.get("techniqueScores") or {}
    simulations = []
    for aid in actor_ids:
        actor = ACTOR_MAP.get(aid)
        if actor is None:
            continue
        simulations.append(run_simulation(actor, technique_scores, runs=runs, seed=seed))
    return simulations


def csv_lines(simulations: list[dict]) -> str:
    """Export CSV des étapes simulées (une ligne par étape)."""
    import csv
    import io

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "actor",
            "step",
            "technique_id",
            "technique_name",
            "tactic",
            "score",
            "coverage_level",
            "detection_probability",
            "expected_status",
            "has_rule",
        ]
    )
    for sim in simulations:
        for i, step in enumerate(sim["steps"], start=1):
            writer.writerow(
                [
                    sim["actor_id"],
                    i,
                    step["technique_id"],
                    step["technique_name"],
                    step["tactic"],
                    step["score"],
                    step["coverage_level"],
                    step["detection_probability"],
                    step["expected_status"],
                    step["has_rule"],
                ]
            )
    return buf.getvalue()