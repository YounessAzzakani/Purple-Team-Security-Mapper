"""Reference-data endpoints — ATT&CK, controls, mitigations, threat actors."""

from fastapi import APIRouter, Depends

from ..auth import require_token
from ..services import data_loader

router = APIRouter(prefix="/api", tags=["reference"], dependencies=[Depends(require_token)])


@router.get("/controls")
def get_controls():
    return {"categories": data_loader.CONTROL_CATEGORIES, "controls": data_loader.ALL_CONTROLS}


@router.get("/techniques")
def get_techniques():
    return {
        "tactics": data_loader.TACTICS,
        "techniques": data_loader.TECHNIQUES,
    }


@router.get("/mitigations")
def get_mitigations():
    return data_loader.MITIGATIONS


@router.get("/actors")
def get_actors():
    return data_loader.THREAT_ACTORS