"""Fixtures and helpers for service account tests."""

from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

SERVICE_ACCOUNT_BASE = "/api/v1/service_accounts"
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


def create_service_account(
    signoz: types.SigNoz, token: str, name: str, role: str = "signoz-viewer"
) -> str:
    """Create a service account, assign a role, and return its ID."""
    resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    service_account_id = resp.json()["data"]["id"]

    role_id = find_role_by_name(signoz, token, role)
    role_resp = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"
        ),
        json={"id": role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert role_resp.status_code == HTTPStatus.NO_CONTENT, role_resp.text

    return service_account_id


def create_service_account_with_key(
    signoz: types.SigNoz, token: str, name: str, role: str = "signoz-admin"
) -> tuple:
    """Create a service account with an API key and return (service_account_id, api_key)."""
    service_account_id = create_service_account(signoz, token, name, role)

    key_resp = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "auth-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert key_resp.status_code == HTTPStatus.CREATED, key_resp.text
    api_key = key_resp.json()["data"]["key"]

    return service_account_id, api_key


def delete_service_account(
    signoz: types.SigNoz, token: str, service_account_id: str
) -> None:
    """Soft-delete a service account."""
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def find_service_account_by_name(signoz: types.SigNoz, token: str, name: str) -> dict:
    """Find a service account by name from the list endpoint."""
    list_resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert list_resp.status_code == HTTPStatus.OK, list_resp.text
    return next(
        service_account
        for service_account in list_resp.json()["data"]
        if service_account["name"] == name
    )
