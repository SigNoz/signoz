"""Reusable helpers for user API tests."""

from http import HTTPStatus
from typing import Dict

import requests

from fixtures import types

USERS_BASE = "/api/v2/users"


def create_active_user(
    signoz: types.SigNoz,
    admin_token: str,
    email: str,
    role: str,
    password: str,
    name: str = "",
) -> str:
    """Invite a user and activate via resetPassword. Returns user ID."""
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": email, "role": role, "name": name},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    invited_user = response.json()["data"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": password, "token": invited_user["token"]},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    return invited_user["id"]


def find_user_by_email(signoz: types.SigNoz, token: str, email: str) -> Dict:
    """Find a user by email from the user list. Raises AssertionError if not found."""
    response = requests.get(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    user = next((u for u in response.json()["data"] if u["email"] == email), None)
    assert user is not None, f"User with email '{email}' not found"
    return user


def find_user_with_roles_by_email(signoz: types.SigNoz, token: str, email: str) -> Dict:
    """Find a user by email and return UserWithRoles (user fields + userRoles).

    Raises AssertionError if the user is not found.
    """
    user = find_user_by_email(signoz, token, email)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    return response.json()["data"]


def assert_user_has_role(data: Dict, role_name: str) -> None:
    """Assert that a UserWithRoles response contains the expected managed role."""
    role_names = {ur["role"]["name"] for ur in data.get("userRoles", [])}
    assert role_name in role_names, f"Expected role '{role_name}' in {role_names}"


def change_user_role(
    signoz: types.SigNoz,
    admin_token: str,
    user_id: str,
    old_role: str,
    new_role: str,
) -> None:
    """Change a user's role (remove old, assign new).

    Role names should be managed role names (e.g. signoz-editor).
    """
    # Get current roles to find the old role's ID
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    roles = response.json()["data"]

    old_role_entry = next((r for r in roles if r["name"] == old_role), None)
    assert old_role_entry is not None, f"User does not have role '{old_role}'"

    # Remove old role
    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"{USERS_BASE}/{user_id}/roles/{old_role_entry['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # Assign new role
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/roles"),
        json={"name": new_role},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
