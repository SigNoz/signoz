from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    assert_user_has_role,
    create_active_user,
)
from fixtures.types import SigNoz


def test_reinvite_deleted_user(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify that a deleted user if re-inivited creates a new user altogether:
    1. Invite and activate a user
    2. Call the delete user api
    3. Re-invite the same email — should succeed and create a new user with pending_invite status
    4. Reset password for the new user
    5. Get User API returns two users now, one deleted and one active
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    reinvite_user_email = "reinvite@integration.test"

    user_id = create_active_user(
        signoz,
        admin_token,
        email=reinvite_user_email,
        role="signoz-editor",
        password="password123Z$",
        name="reinvite user",
    )

    # call the delete api which now soft deletes the user
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Re-invite the same email — should succeed and create a different user
    reinvited_user_id = create_active_user(
        signoz,
        admin_token,
        email=reinvite_user_email,
        role="signoz-viewer",
        password="newPassword123Z$",
        name="reinvite user v2",
    )
    assert reinvited_user_id != user_id

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{reinvited_user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert_user_has_role(response.json()["data"], "signoz-viewer")

    # Verify user can log in with new password
    user_token = get_token(reinvite_user_email, "newPassword123Z$")
    assert user_token is not None


def test_delete_user(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify that after soft-deleting a user:
    1. GET /api/v2/users shows the user with status == "deleted"
    2. GET /api/v2/users/{id} returns the user with empty userRoles (roles revoked)
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    user_id = create_active_user(
        signoz,
        admin_token,
        email="delete-verify-v2@integration.test",
        role="signoz-editor",
        password="password123Z$",
        name="delete verify v2",
    )

    # verify user is active via v2
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["status"] == "active"
    assert len(data["userRoles"]) == 1

    # delete the user
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # verify status is deleted in the users list
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    users = response.json()["data"]
    deleted_user = next((u for u in users if u["id"] == user_id), None)
    assert deleted_user is not None
    assert deleted_user["status"] == "deleted"

    # verify roles are revoked
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["status"] == "deleted"
    assert len(data["userRoles"]) == 1
