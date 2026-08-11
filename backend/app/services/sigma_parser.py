"""Sigma rule + ATT&CK Navigator layer parsing (PyYAML — replaces the JS regex parser).

Upgrade vs the frontend regex parser:
- real YAML parsing (correct multi-line values, comments, quoted strings)
- multi-document files split on `---`
- handles both `attack.t1059.001` tags and `t1059.001` shorthand tags
"""

import re
import uuid

import yaml

_ATTACK_TAG_RE = re.compile(r"(?:attack\.)?(t\d{4}(?:\.\d{3})?)", re.I)
_TACTIC_TAG_RE = re.compile(r"^attack\.([a-z_]+)$", re.I)


def _generate_id() -> str:
    return f"rule-{uuid.uuid4().hex[:9]}"


def _extract_techniques(tags: list | None) -> tuple[list[str], list[str]]:
    techniques: list[str] = []
    tactics: list[str] = []
    for tag in tags or []:
        tag = str(tag).strip()
        m = _ATTACK_TAG_RE.match(tag)
        if m:
            techniques.append(m.group(1).upper())
            continue
        m = _TACTIC_TAG_RE.match(tag)
        if m and not m.group(1).lower().startswith("t"):
            tactics.append(m.group(1))
    return list(dict.fromkeys(techniques)), list(dict.fromkeys(tactics))


def parse_sigma_rule(yaml_content: str) -> dict:
    """Parse a single Sigma YAML document → user rule dict."""
    try:
        doc = yaml.safe_load(yaml_content) or {}
        if not isinstance(doc, dict):
            return {"success": False, "error": "Document YAML invalide (attendu: mapping)"}

        tags = doc.get("tags") or []
        techniques, tactics = _extract_techniques(tags if isinstance(tags, list) else [tags])

        rule = {
            "title": str(doc.get("title") or "Unknown Rule").strip(),
            "description": str(doc.get("description") or "").strip(),
            "level": str(doc.get("level") or "medium").strip(),
            "status": str(doc.get("status") or "experimental").strip(),
            "id": str(doc.get("id") or _generate_id()).strip(),
            "techniques": techniques,
            "tactics": tactics,
            "source": "sigma",
        }
        return {"success": True, "rule": rule}
    except yaml.YAMLError as err:
        return {"success": False, "error": str(err)}
    except Exception as err:  # noqa: BLE001 — parse failure must never crash the API
        return {"success": False, "error": str(err)}


def parse_multiple_sigma_rules(content: str) -> list[dict]:
    """Parse a multi-document Sigma file (split on `---`)."""
    documents = [d for d in re.split(r"^---\s*$", content, flags=re.M) if d.strip()]
    results: list[dict] = []
    for doc in documents:
        if not doc.strip():
            continue
        result = parse_sigma_rule(doc)
        if result.get("success") and result["rule"]["techniques"]:
            results.append(result["rule"])
        elif result.get("success") and not result["rule"]["techniques"]:
            # keep rules without ATT&CK tags? JS drops them — mirror behaviour
            continue

    if not results and content.strip():
        result = parse_sigma_rule(content)
        if result.get("success"):
            results.append(result["rule"])

    return results


def _parse_level(score: float | int | str | None) -> str:
    s = float(score) if score is not None else 0.0
    if s >= 80:
        return "high"
    if s >= 50:
        return "medium"
    return "low"


def parse_navigator_layer(json_content: str) -> dict:
    """Parse an ATT&CK Navigator layer JSON → {rules[], layerName}."""
    import json

    try:
        layer = json.loads(json_content)
    except json.JSONDecodeError as err:
        return {"success": False, "error": str(err)}

    rules: list[dict] = []
    for t in layer.get("techniques") or []:
        if t.get("enabled") is False:
            continue
        score = t.get("score") or 0
        rules.append({
            "id": _generate_id(),
            "title": f"Navigator: {t.get('techniqueID', '')}",
            "techniques": [t.get("techniqueID", "")],
            "tactics": [],
            "level": _parse_level(score),
            "status": "imported",
            "source": "navigator",
            "comment": t.get("comment") or "",
            "navScore": score,
        })

    return {
        "success": True,
        "rules": rules,
        "layerName": layer.get("name") or "Imported Layer",
    }


_NUMERIC = re.compile(r"[-+]?\d*\.?\d+")


def _score_to_color(score: float) -> str:
    if score == 0:
        return "#ef4444"
    if score <= 33:
        return "#f97316"
    if score <= 66:
        return "#eab308"
    return "#22c55e"


def generate_navigator_layer(technique_scores: dict, layer_name: str = "Purple Team Gap Analysis") -> dict:
    techniques = [
        {
            "techniqueID": ts["id"],
            "score": ts["score"],
            "color": _score_to_color(ts["score"]),
            "comment": f"Coverage Score: {ts['score']}/100 | Level: {ts['level']}",
            "enabled": True,
            "metadata": [],
            "links": [],
        }
        for ts in technique_scores.values()
    ]
    return {
        "name": layer_name,
        "versions": {"attack": "15", "navigator": "4.9", "layer": "4.5"},
        "domain": "enterprise-attack",
        "description": f"Generated by Purple Team Mapper — {__import__('datetime').datetime.now().isoformat()}",
        "filters": {"platforms": ["Linux", "macOS", "Windows", "Azure AD", "Office 365", "SaaS", "IaaS"]},
        "sorting": 0,
        "layout": {"layout": "side", "aggregateFunction": "max", "showID": True, "showName": True, "showAggregateScores": True, "countUnscored": False, "expandedSubtechniques": "annotated"},
        "hideDisabled": False,
        "techniques": techniques,
        "gradient": {"colors": ["#ef4444", "#f97316", "#eab308", "#22c55e"], "minValue": 0, "maxValue": 100},
        "legendItems": [
            {"label": "No Coverage (0)", "color": "#ef4444"},
            {"label": "Low Coverage (1–33)", "color": "#f97316"},
            {"label": "Medium Coverage (34–66)", "color": "#eab308"},
            {"label": "High Coverage (67–100)", "color": "#22c55e"},
        ],
        "metadata": [],
        "links": [],
        "showTacticRowBackground": True,
        "tacticRowBackground": "#1e1e3a",
        "selectTechniquesAcrossTactics": True,
        "selectSubtechniquesWithParent": False,
        "selectVisibleTechniques": False,
    }


def export_as_csv(technique_scores: dict, tactic_map: dict) -> str:
    headers = ["Technique ID", "Technique Name", "Tactic", "Score", "Coverage Level", "Covering Controls", "Detection Rules"]
    rows = []
    for ts in technique_scores.values():
        tactic_name = tactic_map.get(ts["tactic"], {}).get("name") or ts["tactic"]
        rows.append(",".join([
            ts["id"],
            f'"{ts["name"]}"',
            tactic_name,
            str(ts["score"]),
            ts["level"],
            "; ".join(c["name"] for c in ts.get("coveringControls") or []) or "",
            "; ".join(r["title"] for r in ts.get("coveringRules") or []) or "",
        ]))
    return "\n".join([",".join(headers), *rows])