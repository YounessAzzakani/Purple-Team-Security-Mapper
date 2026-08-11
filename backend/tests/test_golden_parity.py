"""Golden parity test — JS coverageEngine.js vs Python coverage_engine.py.

Runs the REAL frontend engine in Node with a fixed input fixture, runs the
Python port with the same fixture, and asserts byte-identical normalized
output. This is the acceptance criterion for the Phase 1 port.
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.coverage_engine import run_gap_analysis  # noqa: E402

FIXTURE = REPO_ROOT / "backend" / "tests" / "fixtures" / "parity_input.json"
RUNNER = REPO_ROOT / "scripts" / "run_engine.mjs"


def _normalize(result: dict) -> dict:
    """Must match the JS normalize() in scripts/run_engine.mjs."""
    technique_scores = sorted(
        (
            {
                "id": ts["id"],
                "score": ts["score"],
                "level": ts["level"],
                "rulesScore": ts["rulesScore"],
                "preventiveScore": ts["preventiveScore"],
                "detectiveScore": ts["detectiveScore"],
                "correctiveBonus": ts["correctiveBonus"],
                "dynamic": bool(ts.get("_dynamic")),
            }
            for ts in result["techniqueScores"].values()
        ),
        key=lambda t: t["id"],
    )

    tactic_summary = sorted(
        (
            {
                "id": t["id"],
                "averageScore": t["averageScore"],
                "totalTechniques": t["totalTechniques"],
                "coveredTechniques": t["coveredTechniques"],
                "coveragePercent": t["coveragePercent"],
            }
            for t in result["tacticSummary"].values()
        ),
        key=lambda t: t["id"],
    )

    gaps = [{"id": g["id"], "score": g["score"], "priority": g["priority"]} for g in result["gaps"]]

    actor_analysis = [
        {
            "actorId": a["actor"]["id"],
            "totalTechniques": a["totalTechniques"],
            "coveredTechniques": a["coveredTechniques"],
            "coveragePercent": a["coveragePercent"],
            "averageScore": a["averageScore"],
            "gaps": [g["id"] for g in a["gaps"]],
        }
        for a in result["actorAnalysis"]
    ]

    return {
        "techniqueScores": technique_scores,
        "tacticSummary": tactic_summary,
        "gaps": gaps,
        "criticalGapIds": [g["id"] for g in result["criticalGaps"]],
        "weakGapIds": [g["id"] for g in result["weakGaps"]],
        "partialGapIds": [g["id"] for g in result["partialGaps"]],
        "postureScore": result["postureScore"],
        "totalTechniques": result["totalTechniques"],
        "coveredCount": result["coveredCount"],
        "wellCoveredCount": result["wellCoveredCount"],
        "inputAnalysis": result["inputAnalysis"],
        "actorAnalysis": actor_analysis,
    }


def _run_js() -> dict:
    proc = subprocess.run(
        ["node", str(RUNNER), str(FIXTURE)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


def test_js_runner_executes():
    out = _run_js()
    assert out["postureScore"] >= 0
    assert len(out["techniqueScores"]) > 100


def test_golden_parity_full_analysis():
    js = _run_js()
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    py = run_gap_analysis(
        fixture["enabledControls"],
        fixture["controlMaturity"],
        fixture["detectionRules"],
        fixture["selectedActors"],
    )
    py_norm = _normalize(py)
    assert json.dumps(py_norm, sort_keys=True) == json.dumps(js, sort_keys=True)


def test_golden_parity_no_controls_no_rules():
    py = run_gap_analysis([], {}, [], [])
    assert py["postureScore"] == 0
    assert py["criticalGaps"] and len(py["criticalGaps"]) == py["totalTechniques"]
    assert py["inputAnalysis"]["totalRules"] == 0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))