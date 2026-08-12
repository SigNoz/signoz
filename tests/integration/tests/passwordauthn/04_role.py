from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_PASSWORD,
    change_user_role,
    create_active_user,
)
from fixtures.role import find_role_by_name

ROLECHANGE_USER_EMAIL = "admin+rolechange@integration.test"
ROLECHANGE_USER_PASSWORD = "password123Z$"


def test_change_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(
        signoz,
        admin_token,
        email=ROLECHANGE_USER_EMAIL,
        role="signoz-viewer",
        password=ROLECHANGE_USER_PASSWORD,
    )

    # Make some API calls as new user
    new_user_token = get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {new_user_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    new_user_data = response.json()["data"]
    new_user_id = new_user_data["id"]

    # Make some API call which is protected
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/org/preferences"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.FORBIDDEN

    # Change the new user's role via v2 - move VIEWER to ADMIN
    change_user_role(signoz, admin_token, new_user_id, "signoz-viewer", "signoz-admin")

    # Update display name via v2
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{new_user_id}"),
        json={"displayName": "role change user"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify user can now access admin endpoints
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {new_user_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me_data = response.json()["data"]
    assert me_data is not None

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/org/preferences"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK


def test_get_user_roles(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify GET /api/v2/users/{id}/roles returns correct roles."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # admin+rolechange user was promoted to ADMIN in test_change_role
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{me['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]

    assert len(roles) >= 1
    assert "signoz-admin" in {r["name"] for r in roles}
    # verify role object shape
    for role in roles:
        assert "id" in role
        assert "name" in role
        assert "type" in role


def test_assign_role_is_additive(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify POST /api/v2/user_roles ADDS a role alongside existing ones and is idempotent."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]
    user_id = me["id"]

    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")

    # User currently has signoz-admin from test_change_role.
    # Assign signoz-editor — should be additive, admin stays.
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": user_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    names = {r["name"] for r in roles}
    assert len(names) == 2
    assert "signoz-editor" in names
    assert "signoz-admin" in names

    # Idempotency: assigning the same role again succeeds without duplicates
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": user_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    editor_count = sum(1 for r in roles if r["name"] == "signoz-editor")
    assert editor_count == 1
    assert len(roles) == 2


def test_get_users_by_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify GET /api/v2/roles/{role_id}/users returns users with that role."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{me['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    editor_role_id = next((r for r in roles if r["name"] == "signoz-editor"), None)["id"]
    assert editor_role_id is not None

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/roles/{editor_role_id}/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    user_emails = {u["email"] for u in response.json()["data"]}
    assert ROLECHANGE_USER_EMAIL in user_emails


def test_remove_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify DELETE /api/v2/user_roles/{id} removes only the specified role."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]
    user_id = me["id"]

    editor_entry_id = next((ur["id"] for ur in me["userRoles"] if ur["role"]["name"] == "signoz-editor"), None)
    assert editor_entry_id is not None

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{editor_entry_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles_after = response.json()["data"]
    names_after = {r["name"] for r in roles_after}
    assert len(roles_after) == 1
    assert "signoz-editor" not in names_after
    assert "signoz-admin" in names_after


def test_user_with_roles_reflects_change(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify GET /api/v2/users/{id} userRoles reflects role removal."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{me['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    role_names = {ur["role"]["name"] for ur in data["userRoles"]}
    assert len(role_names) == 1
    assert "signoz-admin" in role_names


def test_admin_cannot_assign_role_to_self(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify POST /api/v2/user_roles for the caller's own user is rejected (self-mutation guard)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_data = response.json()["data"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": admin_data["id"], "roleId": find_role_by_name(signoz, admin_token, "signoz-editor")},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_admin_cannot_remove_own_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify DELETE /api/v2/user_roles/{id} for the caller's own assignment is rejected (self-mutation guard)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_data = response.json()["data"]

    admin_entry_id = next((ur["id"] for ur in admin_data["userRoles"] if ur["role"]["name"] == "signoz-admin"), None)
    assert admin_entry_id is not None

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{admin_entry_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_editor_cannot_manage_roles(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify non-admin cannot call role management endpoints."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # create a viewer user to be the target
    viewer_id = create_active_user(
        signoz,
        admin_token,
        email="viewer+roleauth@integration.test",
        role="signoz-viewer",
        password=ROLECHANGE_USER_PASSWORD,
        name="viewer roleauth",
    )

    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)

    # GET roles — forbidden
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{viewer_id}/roles"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN

    # POST assign role — forbidden
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": viewer_id, "roleId": find_role_by_name(signoz, admin_token, "signoz-editor")},
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN

    # DELETE remove role — forbidden
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{viewer_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    viewer_entry_id = next(ur["id"] for ur in response.json()["data"]["userRoles"] if ur["role"]["name"] == "signoz-viewer")

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{viewer_entry_id}"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN
