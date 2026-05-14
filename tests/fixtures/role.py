"""Fixtures and helpers for role tests."""

from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

ROLES_BASE = "/api/v1/roles"


def find_role_by_name(signoz: types.SigNoz, token: str, name: str) -> str:
    """Find a role by name from the roles endpoint and return its UUID."""
    resp = requests.get(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    roles = resp.json()["data"]
    role = next(r for r in roles if r["name"] == name)
    return role["id"]


def create_custom_role(signoz: types.SigNoz, token: str, name: str) -> str:
    """Create a custom role and return its ID."""
    resp = requests.post(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    return resp.json()["data"]["id"]


def delete_custom_role(signoz: types.SigNoz, token: str, role_id: str) -> None:
    """Delete a custom role."""
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def patch_role_objects(
    signoz: types.SigNoz,
    token: str,
    role_id: str,
    relation: str,
    additions=None,
    deletions=None,
) -> None:
    """PATCH /api/v1/roles/{id}/relations/{relation}/objects."""
    body = {}
    if additions is not None:
        body["additions"] = additions
    if deletions is not None:
        body["deletions"] = deletions

    resp = requests.patch(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{role_id}/relations/{relation}/objects"),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"PatchObjects {relation} failed: {resp.text}"


def object_group(type_name: str, kind_name: str, selectors: list[str]) -> dict:
    """Build an ObjectGroup dict for PatchObjects."""
    return {"resource": {"type": type_name, "kind": kind_name}, "selectors": selectors}
