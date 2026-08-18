"""Data loader — loads the JSON exported from the frontend src/data/*.js modules.

Single source of truth remains the frontend JS modules; regenerate with:
    node scripts/export_js_data.mjs
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "json"


def _load(name: str) -> list | dict:
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


TACTICS: list[dict] = _load("tactics")
TECHNIQUES: list[dict] = _load("techniques")
MITIGATIONS: dict[str, dict] = _load("mitigations")
TECHNIQUE_INTEL: dict[str, dict] = _load("technique_intel")
THREAT_ACTORS: list[dict] = _load("threat_actors")

TECHNIQUE_MAP: dict[str, dict] = {t["id"]: t for t in TECHNIQUES}
TACTIC_MAP: dict[str, dict] = {t["id"]: t for t in TACTICS}
ACTOR_MAP: dict[str, dict] = {a["id"]: a for a in THREAT_ACTORS}


def get_technique_intel(technique_id: str) -> dict:
    """Mirror of the JS getTechniqueIntel() — fallback chain identical."""
    if technique_id in TECHNIQUE_INTEL:
        return TECHNIQUE_INTEL[technique_id]
    parent = technique_id.split(".")[0]
    if parent in TECHNIQUE_INTEL:
        return {**TECHNIQUE_INTEL[parent], "_fromParent": True}
    return {
        "mitigations": [],
        "dataSources": ["Logs système", "Trafic réseau"],
        "sigmaGuidance": (
            f"Aucune guidance Sigma spécifique pour {technique_id}. "
            f"Consultez https://attack.mitre.org/techniques/{technique_id.replace('.', '/')}/"
        ),
        "detectionPriority": "medium",
        "_fallback": True,
    }