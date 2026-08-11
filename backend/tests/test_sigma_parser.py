"""Sigma parser tests — real sample file + edge cases."""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.sigma_parser import (  # noqa: E402
    export_as_csv,
    generate_navigator_layer,
    parse_multiple_sigma_rules,
    parse_navigator_layer,
    parse_sigma_rule,
)

SAMPLE_YML = REPO_ROOT / "test-samples" / "sigma_rules_sample.yml"
SAMPLE_NAV = REPO_ROOT / "test-samples" / "navigator_layer_sample.json"


def test_parses_real_sample_all_rules():
    rules = parse_multiple_sigma_rules(SAMPLE_YML.read_text(encoding="utf-8"))
    assert len(rules) == 10
    assert all(r["source"] == "sigma" for r in rules)
    ids = {r["title"] for r in rules}
    assert "PowerShell Encoded Command" in str(ids) or len(ids) == 10


def test_extracts_attack_tags_with_prefix_and_without():
    rule = parse_sigma_rule("title: T\nid: 1\ntags:\n  - attack.t1059.001\n  - attack.execution\n")["rule"]
    assert rule["techniques"] == ["T1059.001"]
    assert "execution" in rule["tactics"]

    rule2 = parse_sigma_rule("title: T\ntags:\n  - t1059.005\n")["rule"]
    assert rule2["techniques"] == ["T1059.005"]


def test_invalid_yaml_returns_error_not_crash():
    res = parse_sigma_rule("title: [unclosed")
    assert res["success"] is False


def test_multi_document_split_on_separator():
    content = "---\ntitle: A\ntags:\n  - attack.t1059\n---\ntitle: B\ntags:\n  - attack.t1003\n"
    rules = parse_multiple_sigma_rules(content)
    assert len(rules) == 2


def test_navigator_layer_parse():
    data = json.loads(SAMPLE_NAV.read_text(encoding="utf-8"))
    res = parse_navigator_layer(json.dumps(data))
    assert res["success"] is True
    nav_rules = [r for r in res["rules"] if r["source"] == "navigator"]
    assert len(nav_rules) == len([t for t in data["techniques"] if t.get("enabled") is not False])


def test_generate_navigator_layer_shape():
    scores = {"T1059": {"id": "T1059", "score": 75, "level": "high"}}
    layer = generate_navigator_layer(scores)
    assert layer["techniques"][0]["techniqueID"] == "T1059"
    assert layer["techniques"][0]["color"] == "#22c55e"


def test_csv_export_headers():
    scores = {"T1059": {"id": "T1059", "name": "X", "tactic": "TA0002", "score": 10, "level": "low", "coveringControls": [], "coveringRules": []}}
    csv = export_as_csv(scores, {"TA0002": {"name": "Execution"}})
    assert csv.splitlines()[0] == "Technique ID,Technique Name,Tactic,Score,Coverage Level,Covering Controls,Detection Rules"
    assert "Execution" in csv