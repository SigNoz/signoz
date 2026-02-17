from http import HTTPStatus
from typing import Callable

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

DUPLICATE_USER_EMAIL = "duplicate@integration.test"


def test_duplicate_user_invite_rejected(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """
    Verify that the unique index on (email, org_id) in the users table prevents
    creating duplicate users. This invites a new user, accepts the invite, then
    tries to invite and accept the same email again expecting a failure.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Step 1: Invite a new user.
    invite_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "EDITOR"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert invite_response.status_code == HTTPStatus.CREATED
    first_invite_token = invite_response.json()["data"]["token"]

    # Step 2: Accept the invite to create the user.
    accept_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={"token": first_invite_token, "password": "password123Z$"},
        timeout=2,
    )
    assert accept_response.status_code == HTTPStatus.CREATED

    # Step 3: Invite the same email again.
    second_invite_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": DUPLICATE_USER_EMAIL, "role": "VIEWER"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    # The invite creation itself may be rejected if the app checks for existing users.
    if second_invite_response.status_code != HTTPStatus.CREATED:
        assert second_invite_response.status_code == HTTPStatus.CONFLICT
        return

    second_invite_token = second_invite_response.json()["data"]["token"]

    # Step 4: Accept the second invite — should fail due to unique constraint.
    second_accept_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={"token": second_invite_token, "password": "password123Z$"},
        timeout=2,
    )
    assert second_accept_response.status_code == HTTPStatus.CONFLICT
