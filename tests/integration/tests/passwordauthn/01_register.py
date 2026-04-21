from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_NAME,
    USER_EDITOR_PASSWORD,
    USER_VIEWER_EMAIL,
)
from fixtures.authutils import (
    assert_user_has_role,
    find_user_with_roles_by_email,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_register_with_invalid_input(signoz: types.SigNoz) -> None:
    """
    Test the register endpoint with invalid input.
    1. Invalid Password
    2. Invalid Email
    """
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": "admin@integration.test",
            "password": "password",  # invalid password
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": "admin",  # invalid email
            "password": "password123Z$",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_register(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is False

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": USER_ADMIN_EMAIL,
            "password": USER_ADMIN_PASSWORD,
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Verify admin user exists via v2
    found_user = find_user_with_roles_by_email(signoz, admin_token, USER_ADMIN_EMAIL)
    assert_user_has_role(found_user, "signoz-admin")


def test_invite(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # Generate an invite token for the editor user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": USER_EDITOR_EMAIL, "role": "EDITOR", "name": USER_EDITOR_NAME},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text

    invited_user = response.json()["data"]
    assert invited_user["email"] == USER_EDITOR_EMAIL
    assert invited_user["role"] == "EDITOR"

    # Verify the user appears in the users list but as pending_invite status
    found_user = find_user_with_roles_by_email(signoz, admin_token, USER_EDITOR_EMAIL)
    assert found_user["status"] == "pending_invite"
    assert_user_has_role(found_user, "signoz-editor")

    reset_token = invited_user["token"]

    # Reset the password to complete the invite flow (activates the user and also grants authz)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": USER_EDITOR_PASSWORD, "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify the user can now log in
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)
    assert editor_token is not None

    # Verify that the editor user status has been updated to ACTIVE
    admin_token_fresh = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = find_user_with_roles_by_email(
        signoz, admin_token_fresh, USER_EDITOR_EMAIL
    )

    assert_user_has_role(found_user, "signoz-editor")
    assert found_user["displayName"] == USER_EDITOR_NAME
    assert found_user["email"] == USER_EDITOR_EMAIL
    assert found_user["status"] == "active"


def test_revoke_invite(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Invite the viewer user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": USER_VIEWER_EMAIL, "role": "VIEWER"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    invited_user = response.json()["data"]
    reset_token = invited_user["token"]

    # Delete the pending invite user (revoke the invite)
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{invited_user['id']}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try to use the reset token — should fail (user deleted)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=2,
    )
    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_provision_user(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """
    Simulates the upstream zeus provisioning flow:
    1. Invite a user as ADMIN (register already happened via test_register)
    2. List users to find the invited user's ID
    3. Get reset password token for that user
    4. Use the token to set the password and activate the user
    5. Verify the user can log in
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    provisioned_email = "zeus-provisioned@integration.test"
    provisioned_name = "zeus provisioned user"
    provisioned_password = "password123Z$"

    # Step 1: Invite user as ADMIN (mirrors zeus inviteUserOnSigNoz)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={
            "email": provisioned_email,
            "name": provisioned_name,
            "role": "ADMIN",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    # Step 2: List users to find the invited user's ID (mirrors zeus GET /api/v1/user)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    users = response.json()["data"]
    found_user = next((u for u in users if u["email"] == provisioned_email), None)
    assert found_user is not None
    user_id = found_user["id"]

    # Step 3: Get reset password token (mirrors zeus GET /api/v1/getResetPasswordToken/{id})
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{user_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    reset_token = response.json()["data"]["token"]
    assert reset_token is not None
    assert reset_token != ""

    # Step 4: Use the token to set password and activate user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": provisioned_password, "token": reset_token},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Step 5: Verify the provisioned user can log in and is active with admin role
    user_token = get_token(provisioned_email, provisioned_password)
    assert user_token is not None

    provisioned_user = find_user_with_roles_by_email(
        signoz, admin_token, provisioned_email
    )
    assert provisioned_user["status"] == "active"
    assert provisioned_user["displayName"] == provisioned_name
    assert_user_has_role(provisioned_user, "signoz-admin")
