"""SOC detection-rules endpoints — file upload (Sigma/Navigator), list, delete."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import require_token
from ..config import MAX_UPLOAD_BYTES, UPLOAD_ALLOWED_EXTENSIONS
from ..database import get_db
from ..models import Rule
from ..services.sigma_parser import parse_multiple_sigma_rules, parse_navigator_layer
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/rules", tags=["rules"], dependencies=[Depends(require_token)])


def _rule_to_dict(rule: Rule) -> dict:
    return {
        "id": rule.id,
        "title": rule.title,
        "level": rule.level,
        "status": rule.status,
        "source": rule.source,
        "techniques": rule.techniques or [],
        "tactics": rule.tactics or [],
        "description": rule.description or "",
        "comment": rule.comment or "",
        "created_at": rule.created_at.isoformat(),
    }


@router.post("/upload")
async def upload_rules(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in UPLOAD_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Extension non supportée: {ext or '(aucune)'}. Attendu: .yml/.yaml/.json")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 2 Mo)")
    content = raw.decode("utf-8", errors="replace")

    parsed: list[dict] = []
    layer_name = None
    try:
        if ext == ".json":
            res = parse_navigator_layer(content)
            if not res.get("success"):
                raise ValueError(res.get("error", "JSON invalide"))
            parsed = res["rules"]
            layer_name = res.get("layerName")
        else:
            parsed = parse_multiple_sigma_rules(content)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))

    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="Aucune règle détectée (fichier sans balises attack.tXXXX trouvées)",
        )

    created = []
    for rule in parsed:
        db_rule = Rule(
            title=rule["title"],
            level=rule.get("level", "medium"),
            status=rule.get("status", "experimental"),
            source=rule.get("source", "sigma"),
            techniques=rule.get("techniques", []),
            tactics=rule.get("tactics", []),
            description=rule.get("description", ""),
            comment=rule.get("comment", ""),
            raw_content=content,
        )
        db.add(db_rule)
        created.append(db_rule)
    db.commit()
    for r in created:
        db.refresh(r)

    return {
        "message": f"{len(created)} règle(s) importée(s)",
        "layerName": layer_name,
        "rules": [_rule_to_dict(r) for r in created],
    }


@router.post("/manual")
def create_manual_rule(payload: dict, db: Session = Depends(get_db)):
    techniques = [str(t).upper() for t in payload.get("techniques", [])]
    if not techniques:
        raise HTTPException(status_code=422, detail="Au moins une technique ATT&CK est requise")
    rule = Rule(
        title=payload.get("title") or "Règle manuelle",
        level=payload.get("level") or "medium",
        status="manual",
        source="manual",
        techniques=techniques,
        tactics=payload.get("tactics", []),
        description=payload.get("description", ""),
        comment="",
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"message": "Règle manuelle créée", "rule": _rule_to_dict(rule)}


@router.get("")
def list_rules(db: Session = Depends(get_db)):
    rules = db.execute(select(Rule).order_by(Rule.created_at.desc(), Rule.id.desc())).scalars().all()
    return {"total": len(rules), "rules": [_rule_to_dict(r) for r in rules]}


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(Rule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    db.delete(rule)
    db.commit()
    return {"message": "Règle supprimée", "id": rule_id}