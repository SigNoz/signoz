from http import HTTPStatus
from typing import Callable

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import SigNoz

DUPLICATE_USER_EMAIL = "duplicate@integration.test"


def test_duplicate_user_invite_rejected(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify that the unique index on (email, org_id) in the users table prevents
    creating duplicate users. This invites a new user, accepts the invite, then
    tries to invite and accept the same email again expecting a failure.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Invite a new user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "EDITOR"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED
    invited_user = response.json()["data"]
    reset_token = invited_user["token"]

    # Invite the same email again — should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "VIEWER"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CONFLICT

    # activate the user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try to invite the same email again — should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "VIEWER"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CONFLICT
