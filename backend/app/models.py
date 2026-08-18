"""SQLAlchemy models — Rule (SOC detection rules) and Analysis (scan runs)."""

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    level: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(50), default="experimental")
    source: Mapped[str] = mapped_column(String(20), default="sigma")  # sigma | navigator | manual
    techniques: Mapped[list] = mapped_column(JSON, default=list)
    tactics: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(Text, default="")
    raw_content: Mapped[str] = mapped_column(Text, default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(300), default="Analyse")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # Full input snapshot (rule ids, rule copies, actors) — the run
    # is always reproducible verbatim from this.
    inputs_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    # Complete run_gap_analysis() result.
    result: Mapped[dict] = mapped_column(JSON, default=dict)