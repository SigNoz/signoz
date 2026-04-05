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
    change_user_role,
    create_active_user,
)

ROLECHANGE_USER_EMAIL = "admin+rolechange@integration.test"
ROLECHANGE_USER_PASSWORD = "password123Z$"


def test_change_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a new user as VIEWER
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": ROLECHANGE_USER_EMAIL, "role": "VIEWER"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text

    invited_user = response.json()["data"]
    reset_token = invited_user["token"]

    # Activate user via reset password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": ROLECHANGE_USER_PASSWORD, "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

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
        headers={
            "Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"
        },
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


def test_assign_role_replaces_previous(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify POST /api/v2/users/{id}/roles replaces existing role."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={
            "Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]
    user_id = me["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        json={"name": "signoz-editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    names = {r["name"] for r in roles}
    assert "signoz-editor" in names
    assert "signoz-admin" not in names


def test_get_users_by_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify GET /api/v2/roles/{role_id}/users returns users with that role."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={
            "Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"
        },
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
    editor_role_id = next((r for r in roles if r["name"] == "signoz-editor"), None)[
        "id"
    ]
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
    """Verify DELETE /api/v2/users/{id}/roles/{roleId} removes the role."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={
            "Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    me = response.json()["data"]
    user_id = me["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    editor_role_id = next((r for r in roles if r["name"] == "signoz-editor"), None)[
        "id"
    ]
    assert editor_role_id is not None

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/users/{user_id}/roles/{editor_role_id}"
        ),
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
    assert len(roles_after) == 0


def test_user_with_roles_reflects_change(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify GET /api/v2/users/{id} userRoles reflects role removal."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={
            "Authorization": f"Bearer {get_token(ROLECHANGE_USER_EMAIL, ROLECHANGE_USER_PASSWORD)}"
        },
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
    assert len(role_names) == 0


def test_admin_cannot_assign_role_to_self(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify POST /api/v2/users/{own_id}/roles is rejected (self-mutation guard)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_data = response.json()["data"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_data['id']}/roles"),
        json={"name": "signoz-editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_admin_cannot_remove_own_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    """Verify DELETE /api/v2/users/{own_id}/roles/{roleId} is rejected (self-mutation guard)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    admin_data = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_data['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    roles = response.json()["data"]
    admin_role_id = next((r for r in roles if r["name"] == "signoz-admin"), None)["id"]
    assert admin_role_id is not None

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/users/{admin_data['id']}/roles/{admin_role_id}"
        ),
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
        role="VIEWER",
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
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{viewer_id}/roles"),
        json={"name": "signoz-editor"},
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN

    # DELETE remove role — forbidden
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{viewer_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    viewer_roles = response.json()["data"]
    viewer_role_id = next(
        (r for r in viewer_roles if r["name"] == "signoz-viewer"), None
    )["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/users/{viewer_id}/roles/{viewer_role_id}"
        ),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN
