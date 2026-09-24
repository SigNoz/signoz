"""Fixtures and helpers for saved view tests."""

from http import HTTPStatus

import requests

from fixtures import types

SAVED_VIEW_BASE = "/api/v2/saved_views"


def _body(name: str, source: str = "logs") -> dict:
    return {
        "name": name,
        "source": source,
        "schemaVersion": "v2",
        "spec": {
            "displayName": name,
            "panelType": "table",
            "requestType": "scalar",
            "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
            "selectedFields": [],
            "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
        },
    }


def create_saved_view(signoz: types.SigNoz, token: str, name: str, source: str = "logs") -> str:
    """Create a saved view and return its ID."""
    resp = requests.post(
        signoz.self.host_configs["8080"].get(SAVED_VIEW_BASE),
        json=_body(name, source),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    return resp.json()["data"]["id"]


def find_saved_view_by_name(signoz: types.SigNoz, token: str, name: str) -> dict:
    """Find a saved view by name from the list endpoint."""
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SAVED_VIEW_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    return next(view for view in resp.json()["data"] if view["name"] == name)
