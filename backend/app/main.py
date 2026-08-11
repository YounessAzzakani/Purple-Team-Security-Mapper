"""Purple Team Mapper API — FastAPI application entry point.

Run:  uvicorn app.main:app --reload --port 8000   (from backend/)
Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import analyses, reference, rules

app = FastAPI(
    title="Purple Team Mapper API",
    version="2.0.0",
    description="Analyse de couverture MITRE ATT&CK — inputs contrôles + règles SOC → gaps exploitables.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reference.router)
app.include_router(rules.router)
app.include_router(analyses.router)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "app": "purple-team-mapper"}