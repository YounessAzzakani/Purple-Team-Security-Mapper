"""Application configuration — env-driven with safe local defaults."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"

# Simple API token (header: Authorization: Bearer <token>).
# Set PTM_API_TOKEN to a real secret for deployment; empty disables auth.
API_TOKEN: str = os.environ.get("PTM_API_TOKEN", "dev-token")

DATABASE_URL: str = os.environ.get(
    "PTM_DATABASE_URL", f"sqlite:///{DATA_DIR / 'ptm.db'}"
)

MAX_UPLOAD_BYTES: int = 2 * 1024 * 1024  # 2 MB

UPLOAD_ALLOWED_EXTENSIONS = {".yml", ".yaml", ".json"}