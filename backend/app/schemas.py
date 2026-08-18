"""Pydantic request/response schemas."""

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    name: str = Field(default="Analyse", max_length=300)
    actorIds: list[str] = Field(default_factory=list)
    ruleIds: list[int] | None = None  # None → use ALL imported rules


class RuleOut(BaseModel):
    id: int
    title: str
    level: str
    status: str
    source: str
    techniques: list[str]
    tactics: list[str]
    description: str = ""
    comment: str = ""
    created_at: str

    model_config = {"from_attributes": True}


class AnalysisSummary(BaseModel):
    id: int
    name: str
    created_at: str
    posture_score: int
    total_techniques: int
    critical_gaps: int
    weak_gaps: int
    partial_gaps: int
    covered_count: int
    well_covered_count: int


class ComparisonOut(BaseModel):
    base_id: int | None
    compare_id: int
    posture_delta: int
    critical_gaps_delta: int
    new_critical_gaps: list[str]
    resolved_gaps: list[str]
    base_posture: int | None
    compare_posture: int


class SimulationRequest(BaseModel):
    actor_ids: list[str] = Field(default_factory=list)
    runs: int = Field(default=200, ge=1, le=5000)
    seed: int | None = None


class SimulationStepOut(BaseModel):
    technique_id: str
    technique_name: str
    tactic: str = ""
    score: int
    coverage_level: str
    detection_probability: float
    expected_status: str
    has_rule: bool = False
    covering_controls: list[str] = []
    rule_hint: str = ""


class SimulationMetricsOut(BaseModel):
    success_rate: float
    mean_reach: float
    reach_histogram: list[int]
    chokepoint: dict | None
    weak_link: dict | None


class SimulationOut(SimulationMetricsOut):
    actor_id: str
    actor_name: str
    runs: int
    steps: list[SimulationStepOut]