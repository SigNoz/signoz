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

    # Step 1: Invite a new user.
    initial_invite_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "EDITOR"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert initial_invite_response.status_code == HTTPStatus.CREATED
    initial_invite_token = initial_invite_response.json()["data"]["token"]

    # Step 2: Accept the invite to create the user.
    initial_accept_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={"token": initial_invite_token, "password": "password123Z$"},
        timeout=2,
    )
    assert initial_accept_response.status_code == HTTPStatus.CREATED

    # Step 3: Invite the same email again.
    duplicate_invite_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "VIEWER"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    # The invite creation itself may be rejected if the app checks for existing users.
    if duplicate_invite_response.status_code != HTTPStatus.CREATED:
        assert duplicate_invite_response.status_code == HTTPStatus.CONFLICT
        return

    duplicate_invite_token = duplicate_invite_response.json()["data"]["token"]

    # Step 4: Accept the duplicate invite — should fail due to unique constraint.
    duplicate_accept_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={"token": duplicate_invite_token, "password": "password123Z$"},
        timeout=2,
    )
    assert duplicate_accept_response.status_code == HTTPStatus.CONFLICT
