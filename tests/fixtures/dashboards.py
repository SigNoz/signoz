from http import HTTPStatus
from typing import Dict, List, Optional

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def create_dashboard(
    signoz: types.SigNoz,
    token: str,
    payload: Dict,
    *,
    timeout: int = 5,
) -> str:
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
    assert response.status_code == HTTPStatus.CREATED, (
        f"create_dashboard failed: {response.status_code} {response.text}"
    )
    return response.json()["data"]["id"]


def list_dashboards(
    signoz: types.SigNoz,
    token: str,
    *,
    timeout: int = 5,
) -> List[Dict]:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
    assert response.status_code == HTTPStatus.OK, (
        f"list_dashboards failed: {response.status_code} {response.text}"
    )
    return response.json().get("data", []) or []


def find_dashboard_by_title(
    signoz: types.SigNoz,
    token: str,
    title: str,
) -> Optional[Dict]:
    for dashboard in list_dashboards(signoz, token):
        data = dashboard.get("data") or dashboard
        if data.get("title") == title:
            return dashboard
    return None


def upsert_dashboard(
    signoz: types.SigNoz,
    token: str,
    payload: Dict,
) -> str:
    """
    Idempotent create. Looks up by title; if present, returns the existing
    dashboard id. Intended for warm-backend seed loops under `--reuse`.
    """
    title = payload.get("title")
    if title:
        existing = find_dashboard_by_title(signoz, token, title)
        if existing is not None:
            dashboard_id = existing.get("id") or (existing.get("data") or {}).get("id")
            logger.info(
                "dashboard already present, skipping: %s",
                {"title": title, "id": dashboard_id},
            )
            return dashboard_id
    return create_dashboard(signoz, token, payload)
