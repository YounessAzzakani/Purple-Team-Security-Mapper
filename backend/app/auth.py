"""API-token authentication dependency (Authorization: Bearer <token>)."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import API_TOKEN

_bearer = HTTPBearer(auto_error=False)


def require_token(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if not API_TOKEN:
        return  # auth disabled
    if credentials is None or credentials.credentials != API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton API invalide ou manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )