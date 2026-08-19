"""API tests — auth, rule upload, analysis lifecycle, exports.

Environment is pointed at a temporary SQLite DB BEFORE importing the app.
"""

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

init_db()  # TestClient without context manager does not run startup events

client = TestClient(app)

SAMPLE_YML = REPO_ROOT / "test-samples" / "sigma_rules_sample.yml"
SAMPLE_NAV = REPO_ROOT / "test-samples" / "navigator_layer_sample.json"

AUTH = {"Authorization": "Bearer test-token"}


def test_health_public():
    assert client.get("/health").json()["status"] == "ok"


def test_auth_required():
    assert client.get("/api/rules").status_code == 401
    assert client.get("/api/rules", headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.get("/api/rules", headers=AUTH).status_code == 200


def test_reference_endpoints():
    r = client.get("/api/mitigations", headers=AUTH).json()
    assert len(r) > 10
    r = client.get("/api/techniques", headers=AUTH).json()
    assert len(r["techniques"]) > 100 and len(r["tactics"]) == 12
    assert len(client.get("/api/actors", headers=AUTH).json()) >= 8


def test_upload_sigma_sample():
    with open(SAMPLE_YML, "rb") as f:
        r = client.post("/api/rules/upload", files={"file": ("rules.yml", f, "application/yaml")}, headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["message"] == "10 règle(s) importée(s)"
    assert len(body["rules"]) == 10


def test_upload_navigator_layer():
    with open(SAMPLE_NAV, "rb") as f:
        r = client.post("/api/rules/upload", files={"file": ("layer.json", f, "application/json")}, headers=AUTH)
    assert r.status_code == 200
    rules = r.json()["rules"]
    assert len(rules) == 20
    assert all(rule["source"] == "navigator" for rule in rules)


def test_upload_invalid_extension():
    r = client.post("/api/rules/upload", files={"file": ("evil.exe", b"data", "application/octet-stream")}, headers=AUTH)
    assert r.status_code == 415


def test_upload_garbage_yaml():
    r = client.post("/api/rules/upload", files={"file": ("bad.yml", b"not-a-rule: [", "application/yaml")}, headers=AUTH)
    assert r.status_code == 422


def test_manual_rule_and_delete():
    r = client.post("/api/rules/manual", json={"title": "Test XSS", "level": "high", "techniques": ["T1059.003"]}, headers=AUTH)
    assert r.status_code == 200
    rid = r.json()["rule"]["id"]
    assert client.delete(f"/api/rules/{rid}", headers=AUTH).status_code == 200
    assert client.delete(f"/api/rules/{rid}", headers=AUTH).status_code == 404


def test_full_analysis_lifecycle():
    controls = ["edr", "siem", "mfa"]
    maturity = {"edr": "advanced", "siem": "intermediate", "mfa": "basic"}
    r = client.post(
        "/api/analyses",
        json={"name": "Scan SOC 1", "controls": controls, "maturity": maturity, "actorIds": ["apt28", "lockbit"]},
        headers=AUTH,
    )
    assert r.status_code == 200
    body = r.json()
    aid = body["analysis"]["id"]
    result = body["result"]
    assert body["analysis"]["posture_score"] == result["postureScore"]
    assert len(result["techniqueScores"]) > 100
    assert "apt28" in [a["actor"]["id"] for a in result["actorAnalysis"]]
    expected_rules = client.get("/api/rules", headers=AUTH).json()["total"]
    assert result["inputAnalysis"]["totalRules"] == expected_rules

    got = client.get(f"/api/analyses/{aid}", headers=AUTH).json()
    assert got["analysis"]["id"] == aid
    assert got["inputs"]["controls"] == controls

    listing = client.get("/api/analyses", headers=AUTH).json()
    assert listing["total"] >= 1


def test_compare_analyses():
    base = client.post(
        "/api/analyses",
        json={"name": "Base", "solutions": [], "actorIds": []},
        headers=AUTH,
    ).json()
    better = client.post(
        "/api/analyses",
        json={
            "name": "Avec EDR",
            "solutions": [
                {"id": "sol-edr", "name": "CrowdStrike EDR", "category": "Endpoint & EDR", "status": "enforcing", "enabled": True},
                {"id": "sol-ngfw", "name": "Palo Alto NGFW", "category": "Network & Firewall", "status": "enforcing", "enabled": True},
            ],
            "detectionMethods": [
                {"id": "dm-sysmon", "name": "Sysmon Telemetry", "type": "Log Correlation", "confidence": "High", "tactics": ["execution", "persistence"], "enabled": True},
            ],
            "actorIds": [],
        },
        headers=AUTH,
    ).json()
    comp = client.get(f"/api/analyses/{better['analysis']['id']}/compare?base={base['analysis']['id']}", headers=AUTH).json()
    assert comp["base_id"] == base["analysis"]["id"]
    assert comp["posture_delta"] > 0
    assert comp["critical_gaps_delta"] < 0


def test_exports():
    analysis = client.post(
        "/api/analyses",
        json={"name": "Export", "controls": ["siem"], "maturity": {"siem": "basic"}, "actorIds": []},
        headers=AUTH,
    ).json()
    aid = analysis["analysis"]["id"]

    nav = client.get(f"/api/analyses/{aid}/export/navigator", headers=AUTH)
    assert nav.status_code == 200
    assert nav.json()["versions"]["attack"] == "15"
    assert len(nav.json()["techniques"]) > 100

    csv = client.get(f"/api/analyses/{aid}/export/csv", headers=AUTH)
    assert csv.status_code == 200
    assert "Technique ID" in csv.text
    assert "csv" in csv.headers["content-type"]


def test_analysis_404():
    assert client.get("/api/analyses/99999", headers=AUTH).status_code == 404