"""Tests du simulateur de campagnes APT (déterministe par graine) + endpoints associés."""

import os
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()

os.environ["PTM_DATABASE_URL"] = f"sqlite:///{_tmp_db.name}"
os.environ["PTM_API_TOKEN"] = "test-token"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.attack_simulator import (  # noqa: E402
    build_path,
    csv_lines,
    detection_probability,
    run_simulation,
    simulate_actors,
)
from app.services.data_loader import ACTOR_MAP, TECHNIQUE_MAP  # noqa: E402

init_db()

client = TestClient(app)
AUTH = {"Authorization": "Bearer test-token"}


def _make_analysis(actor_ids=("apt28", "lockbit")):
    r = client.post(
        "/api/analyses",
        json={"name": "Sim", "controls": ["edr", "siem", "mfa"], "maturity": {}, "actorIds": list(actor_ids)},
        headers=AUTH,
    )
    assert r.status_code == 200
    return r.json()


# ── Unités ──


def test_detection_probability_monotonic():
    assert detection_probability(0) == 0.05
    assert detection_probability(100) == 0.95
    prev = -1
    for score in range(0, 101, 5):
        p = detection_probability(score)
        assert prev <= p <= 1.0
        prev = p
    assert detection_probability(-10) == 0.05
    assert detection_probability(500) == 0.95


def test_build_path_fields():
    actor = ACTOR_MAP["apt28"]
    scores = {"T1566.001": {"score": 40, "name": "Phishing", "tactic": "TA0001", "level": "low", "coveringRules": [], "coveringControls": []}}
    steps = build_path(actor, scores)
    assert steps and steps[0]["technique_id"] == "T1566.001"
    step = steps[0]
    assert step["technique_name"] == "Phishing"
    assert step["tactic"] == "TA0001"
    assert 0 <= step["detection_probability"] <= 1
    assert step["expected_status"] in ("detected", "missed")
    assert step["has_rule"] is False
    assert isinstance(step["rule_hint"], str)
    unknown = [s for s in steps if s["technique_id"] == "T9999"]
    assert unknown == []  # aucune technique inexistante dans la liste de l'acteur


def test_run_simulation_deterministic_with_seed():
    actor = ACTOR_MAP["apt28"]
    scores = {}
    a = run_simulation(actor, scores, runs=500, seed=42)
    b = run_simulation(actor, scores, runs=500, seed=42)
    assert a == b
    assert a["runs"] == 500
    assert 0 <= a["success_rate"] <= 1
    assert len(a["steps"]) == len(actor["techniques"])
    assert sum(a["reach_histogram"]) == 500
    assert a["weak_link"] is not None
    # run sans graine ≠ run graine 42 (naïf mais utile: la graine change l'échantillonnage)
    c = run_simulation(actor, scores, runs=500, seed=7)
    assert (a["success_rate"] != c["success_rate"]) or (a["reach_histogram"] != c["reach_histogram"])


def test_run_simulation_full_coverage_blocks_everything():
    actor = ACTOR_MAP["lockbit"]
    scores = {t: {"score": 100, "name": t, "level": "high", "coveringRules": [], "coveringControls": []} for t in actor["techniques"]}
    sim = run_simulation(actor, scores, runs=1000, seed=1)
    assert sim["success_rate"] == 0.0
    assert sim["mean_reach"] < 0.1
    assert sim["chokepoint"] is not None


def test_simulate_actors_skips_unknown():
    res = _make_analysis(["apt28"])
    result = res["result"]
    sims = simulate_actors(result, ["apt28", "ghost-group"], runs=50, seed=3)
    assert [s["actor_id"] for s in sims] == ["apt28"]


def test_csv_lines():
    res = _make_analysis(["apt28"])
    sims = simulate_actors(res["result"], ["apt28"], runs=10, seed=3)
    csv = csv_lines(sims)
    lines = csv.strip().splitlines()
    assert lines[0].startswith("actor,step,technique_id")
    assert len(lines) == 1 + len(sims[0]["steps"])


# ── API ──


def test_simulate_endpoint_deterministic():
    res = _make_analysis(["apt28", "lockbit"])
    aid = res["analysis"]["id"]
    payload = {"actor_ids": ["apt28", "lockbit"], "runs": 100, "seed": 42}
    r1 = client.post(f"/api/analyses/{aid}/simulate", json=payload, headers=AUTH)
    r2 = client.post(f"/api/analyses/{aid}/simulate", json=payload, headers=AUTH)
    assert r1.status_code == 200
    assert r1.json() == r2.json()
    body = r1.json()
    assert [s["actor_id"] for s in body["simulations"]] == ["apt28", "lockbit"]
    assert body["parameters"]["seed"] == 42
    step = body["simulations"][0]["steps"][0]
    for field in ("technique_id", "technique_name", "score", "coverage_level", "detection_probability", "expected_status"):
        assert field in step
    assert 0 <= body["simulations"][0]["success_rate"] <= 1


def test_simulate_endpoint_errors():
    res = _make_analysis(["apt28"])
    aid = res["analysis"]["id"]
    assert client.post(f"/api/analyses/{aid}/simulate", json={"actor_ids": ["nobody"], "runs": 10}, headers=AUTH).status_code == 400
    assert client.post(f"/api/analyses/{aid}/simulate", json={"actor_ids": [], "runs": 10}, headers=AUTH).status_code == 400
    assert client.post("/api/analyses/99999/simulate", json={"actor_ids": ["apt28"], "runs": 10}, headers=AUTH).status_code == 404
    assert client.post(f"/api/analyses/{aid}/simulate", json={"actor_ids": ["apt28"], "runs": 99999}, headers=AUTH).status_code == 422


def test_simulation_csv_endpoint():
    res = _make_analysis(["apt28"])
    aid = res["analysis"]["id"]
    csv = client.get(f"/api/analyses/{aid}/simulation.csv?actors=apt28&runs=25&seed=1", headers=AUTH)
    assert csv.status_code == 200
    assert csv.text.startswith("actor,step,technique_id")
    assert '"apt28"' in csv.text or "apt28" in csv.text
    assert "csv" in csv.headers["content-type"]
    assert client.get(f"/api/analyses/{aid}/simulation.csv?actors=", headers=AUTH).status_code == 400