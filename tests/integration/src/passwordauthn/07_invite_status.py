from http import HTTPStatus
from typing import Callable

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import SigNoz

from sqlalchemy import sql


def test_reinvite_deleted_user(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify that a deleted user can be re-invited:
    1. Invite and activate a user
    2. Soft delete the user
    3. Re-invite the same email — should succeed and reactivate as pending_invite
    4. Reset password — user becomes active again
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create and activate a user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "reinvite@integration.test", "role": "EDITOR", "name": "reinvite user"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED
    invited_user = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{invited_user['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    reset_token = response.json()["data"]["token"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Soft delete the user (set status to deleted via DB since feature flag may not be enabled)
    with signoz.sqlstore.conn.connect() as conn:
        conn.execute(
            sql.text("UPDATE users SET status = 'deleted' WHERE id = :user_id"),
            {"user_id": invited_user["id"]},
        )
        conn.commit()

    # Re-invite the same email — should succeed
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "reinvite@integration.test", "role": "VIEWER", "name": "reinvite user v2"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED
    reinvited_user = response.json()["data"]
    assert reinvited_user["status"] == "pending_invite"
    assert reinvited_user["role"] == "VIEWER"  # role updated to new invite role

    # Activate via reset password
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{reinvited_user['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    reset_token = response.json()["data"]["token"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "newPassword123Z$", "token": reset_token},
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
                {"email": "bulk1@integration.test", "role": "EDITOR", "name": "bulk user 1"},
                {"email": "bulk2@integration.test", "role": "VIEWER", "name": "bulk user 2"},
            ]
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED
