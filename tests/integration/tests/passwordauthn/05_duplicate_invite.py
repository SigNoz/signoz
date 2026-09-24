from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.role import find_role_by_name
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

    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Invite a new user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json={
            "email": DUPLICATE_USER_EMAIL,
            "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-editor")}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    # Invite the same email again while still pending — should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json={"email": DUPLICATE_USER_EMAIL, "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CONFLICT

    # activate the user
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$", "token": response.json()["data"]["token"]},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try to invite the same email again once active — should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json={"email": DUPLICATE_USER_EMAIL, "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CONFLICT
