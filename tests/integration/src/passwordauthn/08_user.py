from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_PASSWORD,
)
from fixtures.authutils import (
    assert_user_has_role,
    find_user_by_email,
    find_user_with_roles_by_email,
)


def test_list_users(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """Verify GET /api/v2/users returns all users with correct fields."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    users = response.json()["data"]

    admin_user = next((u for u in users if u["email"] == USER_ADMIN_EMAIL), None)
    assert admin_user is not None
    assert admin_user["isRoot"] is True
    assert admin_user["status"] == "active"

    editor_user = next((u for u in users if u["email"] == USER_EDITOR_EMAIL), None)
    assert editor_user is not None
    assert editor_user["status"] == "active"


def test_get_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """Verify GET /api/v2/users/{id} returns user with roles."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    editor_user = find_user_by_email(signoz, admin_token, USER_EDITOR_EMAIL)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{editor_user['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["email"] == USER_EDITOR_EMAIL
    assert data["status"] == "active"
    assert len(data["userRoles"]) >= 1
    assert_user_has_role(data, "signoz-editor")


def test_get_my_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify GET /api/v2/users/me returns authenticated user with roles."""
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["email"] == USER_EDITOR_EMAIL
    assert data["status"] == "active"
    assert data["isRoot"] is False
    assert_user_has_role(data, "signoz-editor")


def test_update_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify PUT /api/v2/users/{id} updates displayName."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    editor_user = find_user_by_email(signoz, admin_token, USER_EDITOR_EMAIL)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{editor_user['id']}"),
        json={"displayName": "updated editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    updated = find_user_with_roles_by_email(signoz, admin_token, USER_EDITOR_EMAIL)
    assert updated["displayName"] == "updated editor"


def test_update_my_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify PUT /api/v2/users/me updates own displayName."""
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        json={"displayName": "self updated editor"},
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["displayName"] == "self updated editor"


def test_admin_cannot_update_self_via_id(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify PUT /api/v2/users/{own_id} is rejected (self-mutation guard)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_id}"),
        json={"displayName": "should fail"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_editor_cannot_list_users(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify non-admin cannot call GET /api/v2/users."""
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_editor_cannot_get_other_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify non-admin cannot call GET /api/v2/users/{other_id}."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_id = response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_id}"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_editor_cannot_update_other_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """Verify non-admin cannot call PUT /api/v2/users/{other_id}."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_id}"),
        json={"displayName": "hacked"},
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN
