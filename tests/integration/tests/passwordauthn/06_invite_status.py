from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, create_active_user
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
    reinvite_user_name = "reinvite user"
    reinvite_user_role = "EDITOR"
    reinvite_user_password = "password123Z$"

    # invite the user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={
            "email": reinvite_user_email,
            "role": reinvite_user_role,
            "name": reinvite_user_name,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    invited_user = response.json()["data"]
    reset_token = invited_user["token"]

    # reset the password to make it active
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": reinvite_user_password, "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # call the delete api which now soft deletes the user
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{invited_user['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Re-invite the same email — should succeed
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={
            "email": reinvite_user_email,
            "role": "VIEWER",
            "name": "reinvite user v2",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    reinvited_user = response.json()["data"]
    assert reinvited_user["role"] == "VIEWER"
    assert reinvited_user["id"] != invited_user["id"]  # confirms a new user was created

    reinvited_user_reset_password_token = reinvited_user["token"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={
            "password": "newPassword123Z$",
            "token": reinvited_user_reset_password_token,
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify user can log in with new password
    user_token = get_token("reinvite@integration.test", "newPassword123Z$")
    assert user_token is not None


def test_bulk_invite(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify the bulk invite endpoint creates multiple pending_invite users.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/bulk"),
        json={
            "invites": [
                {
                    "email": "bulk1@integration.test",
                    "role": "EDITOR",
                    "name": "bulk user 1",
                },
                {
                    "email": "bulk2@integration.test",
                    "role": "VIEWER",
                    "name": "bulk user 2",
                },
            ]
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text


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
        role="EDITOR",
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
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{user_id}"),
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
