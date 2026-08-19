"""Analysis endpoints — run (compute+store), history, detail, compare, exports."""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_token
from ..database import get_db
from ..models import Analysis, Rule
from ..schemas import AnalysisRequest, SimulationRequest
from ..services.attack_simulator import csv_lines, simulate_actors
from ..services.coverage_engine import run_gap_analysis
from ..services.data_loader import TACTIC_MAP, ACTOR_MAP
from ..services.sigma_parser import export_as_csv, generate_navigator_layer

router = APIRouter(prefix="/api/analyses", tags=["analyses"], dependencies=[Depends(require_token)])


def _load_rules(db: Session, rule_ids: list[int] | None) -> list[dict]:
    if rule_ids is None:
        rules = db.execute(select(Rule).order_by(Rule.id)).scalars().all()
    else:
        rules = [r for r in (db.get(Rule, rid) for rid in rule_ids) if r is not None]
    return [
        {
            "id": r.id,
            "title": r.title,
            "level": r.level,
            "status": r.status,
            "source": r.source,
            "techniques": r.techniques or [],
            "tactics": r.tactics or [],
            "description": r.description or "",
            "comment": r.comment or "",
        }
        for r in rules
    ]


def _summary(a: Analysis) -> dict:
    result = a.result or {}
    gaps = result.get("gaps", [])
    return {
        "id": a.id,
        "name": a.name,
        "created_at": a.created_at.isoformat(),
        "posture_score": result.get("postureScore", 0),
        "total_techniques": result.get("totalTechniques", 0),
        "critical_gaps": len(result.get("criticalGaps", [])),
        "weak_gaps": len(result.get("weakGaps", [])),
        "partial_gaps": len(result.get("partialGaps", [])),
        "covered_count": result.get("coveredCount", 0),
        "well_covered_count": result.get("wellCoveredCount", 0),
    }


@router.post("")
def create_analysis(payload: AnalysisRequest, db: Session = Depends(get_db)):
    rules = _load_rules(db, payload.ruleIds)
    solutions = payload.solutions or payload.securitySolutions
    detection_methods = payload.detection_methods or payload.detectionMethods

    result = run_gap_analysis(
        detection_rules=rules,
        selected_actors=payload.actorIds,
        security_solutions=solutions,
        detection_methods=detection_methods,
    )

    snapshot = {
        "actorIds": payload.actorIds,
        "ruleIds": payload.ruleIds if payload.ruleIds is not None else "all",
        "rules": rules,
        "securitySolutions": solutions,
        "detectionMethods": detection_methods,
        "controls": payload.controls,
        "maturity": payload.maturity,
    }

    analysis = Analysis(name=payload.name, inputs_snapshot=snapshot, result=result)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {"analysis": _summary(analysis), "result": result}


@router.get("")
def list_analyses(db: Session = Depends(get_db)):
    rows = db.execute(select(Analysis).order_by(Analysis.created_at.desc(), Analysis.id.desc())).scalars().all()
    return {"total": len(rows), "analyses": [_summary(a) for a in rows]}


@router.get("/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    return {
        "analysis": _summary(analysis),
        "inputs": analysis.inputs_snapshot,
        "result": analysis.result,
    }


@router.delete("/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    db.delete(analysis)
    db.commit()
    return {"message": "Analyse supprimée", "id": analysis_id}


@router.get("/{analysis_id}/compare")
def compare_analyses(
    analysis_id: int,
    base: int | None = Query(default=None, description="ID de l'analyse de référence (défaut: précédente)"),
    db: Session = Depends(get_db),
):
    current = db.get(Analysis, analysis_id)
    if current is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")

    rows = list(db.execute(select(Analysis).order_by(Analysis.created_at, Analysis.id)).scalars())
    if base is None:
        prior = [a for a in rows if a.id < analysis_id]
        base = prior[-1].id if prior else None

    base_analysis = db.get(Analysis, base) if base else None
    base_result = (base_analysis.result or {}) if base_analysis else {}
    curr_result = current.result or {}

    base_crits = {g["id"] for g in base_result.get("criticalGaps", [])}
    curr_crits = {g["id"] for g in curr_result.get("criticalGaps", [])}

    return {
        "base_id": base,
        "compare_id": analysis_id,
        "base_posture": base_result.get("postureScore"),
        "compare_posture": curr_result.get("postureScore"),
        "posture_delta": (curr_result.get("postureScore") or 0) - (base_result.get("postureScore") or 0) if base_analysis else None,
        "critical_gaps_delta": len(curr_crits) - len(base_crits),
        "new_critical_gaps": sorted(curr_crits - base_crits),
        "resolved_gaps": sorted(base_crits - curr_crits),
    }


@router.get("/{analysis_id}/export/navigator")
def export_navigator(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    layer = generate_navigator_layer((analysis.result or {}).get("techniqueScores", {}))
    return JSONResponse(content=layer)


@router.get("/{analysis_id}/export/csv")
def export_csv(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    csv_text = export_as_csv((analysis.result or {}).get("techniqueScores", {}), TACTIC_MAP)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ptm-analysis-{analysis_id}.csv"'},
    )


@router.post("/{analysis_id}/simulate")
def simulate_attack(analysis_id: int, payload: SimulationRequest, db: Session = Depends(get_db)):
    """Simulation Monte-Carlo de campagnes APT sur les résultats stockés."""
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")

    if not payload.actor_ids:
        raise HTTPException(status_code=400, detail="Aucun acteur sélectionné")

    known = {a["id"] for a in ACTOR_MAP.values()}
    unknown = [a for a in payload.actor_ids if a not in known]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Acteurs inconnus: {', '.join(unknown)}")

    simulations = simulate_actors(
        analysis.result or {}, payload.actor_ids, runs=payload.runs, seed=payload.seed
    )
    return {
        "analysis_id": analysis_id,
        "parameters": {"runs": payload.runs, "seed": payload.seed},
        "simulations": simulations,
    }


@router.get("/{analysis_id}/simulation.csv")
def export_simulation_csv(
    analysis_id: int,
    actors: str = Query(description="IDs d'acteurs séparés par des virgules (apt28,lockbit)"),
    runs: int = Query(default=200, ge=1, le=5000),
    seed: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable")

    actor_ids = [a.strip() for a in actors.split(",") if a.strip()]
    if not actor_ids:
        raise HTTPException(status_code=400, detail="Aucun acteur sélectionné")

    simulations = simulate_actors(analysis.result or {}, actor_ids, runs=runs, seed=seed)
    return Response(
        content=csv_lines(simulations),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ptm-simulation-{analysis_id}.csv"'},
    )